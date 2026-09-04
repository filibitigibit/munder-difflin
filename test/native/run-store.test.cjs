'use strict';

/**
 * Mission Control Phase 1A — canonical Run primitive + append-only Event Store.
 *
 * WHY THIS EXISTS. Munder's existing telemetry lives in files the AGENTS can
 * write (hive/log.jsonl, cost-ledger.jsonl, registry.json, tasks.json), so the
 * record of what happened is editable by the thing that did it. The canonical
 * run/event store therefore lives in the main-process-owned SQLite DB
 * (userData/harness.db), outside HIVE_ROOT, with an append-only event log and a
 * hash chain so tampering is DETECTABLE even by someone with raw file access.
 *
 * The second thing under test is the execution BOUNDARY. An agent id survives a
 * restart, a Claude session id is a single overwritten slot, and a PTY id is
 * reused — none of them can answer "which attempt was this". A Run can: every
 * execution attempt gets a fresh run_id that is never reused, and a resume makes
 * a NEW run linked back to the paused one, so a laptop closed at the office and
 * reopened at home shows up as two runs joined by continuation_of_run_id rather
 * than one run with a suspicious gap.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const loadTs = require('../load-ts.cjs');

const {
  RunStore,
  applyRunSchema,
  isValidTransition,
  RUN_STATUSES,
  canonicalJson,
  GENESIS_HASH
} = loadTs('src/main/runs.ts');

/** A store on a throwaway on-disk DB (on-disk, not :memory:, because reopen is
 *  half of what durability means here).
 *
 *  Every handle opened during a test is closed before the directory is removed:
 *  Windows refuses to unlink a file that is still open, so a leaked handle turns
 *  cleanup into an EBUSY that masks the real assertion. */
const openHandles = [];

function track(db) {
  openHandles.push(db);
  return db;
}

function closeAll() {
  while (openHandles.length) {
    const db = openHandles.pop();
    try { db.close(); } catch { /* already closed by the test */ }
  }
}

function store(t, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-runs-'));
  t.after(() => { closeAll(); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'harness.db');
  const db = track(new Database(file));
  db.pragma('journal_mode = WAL');
  applyRunSchema(db);
  const s = new RunStore(db, opts);
  return { s, db, file, dir };
}

function reopen(file, opts = {}) {
  const db = track(new Database(file));
  applyRunSchema(db);
  return { s: new RunStore(db, opts), db };
}

// ─── 1. Run id uniqueness ────────────────────────────────────────────────────

test('every created run gets a distinct id', (t) => {
  const { s } = store(t);
  const ids = new Set();
  for (let i = 0; i < 500; i++) ids.add(s.createRun({ agentId: 'jim' }).run_id);
  assert.equal(ids.size, 500);
});

test('a run id is never reused, even when explicitly re-supplied', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', runId: 'run-fixed' });
  assert.equal(first.run_id, 'run-fixed');
  assert.throws(() => s.createRun({ agentId: 'pam', runId: 'run-fixed' }), /exists|unique/i);
});

test('run id stays unique across a DB reopen', (t) => {
  const { s, file } = store(t);
  s.createRun({ agentId: 'jim', runId: 'run-a' });
  const { s: s2 } = reopen(file);
  assert.throws(() => s2.createRun({ agentId: 'jim', runId: 'run-a' }), /exists|unique/i);
});

// ─── 2. State transition matrix ──────────────────────────────────────────────

test('the canonical status set is exactly the eight agreed states', () => {
  assert.deepEqual(
    [...RUN_STATUSES].sort(),
    ['cancelled', 'completed', 'failed', 'interrupted', 'paused', 'queued', 'resuming', 'running'].sort()
  );
});

test('the documented legal transitions are allowed', () => {
  assert.equal(isValidTransition('running', 'paused'), true);
  assert.equal(isValidTransition('paused', 'resuming'), true);
  assert.equal(isValidTransition('resuming', 'completed'), true);
  assert.equal(isValidTransition('queued', 'running'), true);
  assert.equal(isValidTransition('running', 'completed'), true);
  assert.equal(isValidTransition('running', 'failed'), true);
  assert.equal(isValidTransition('running', 'interrupted'), true);
});

test('terminal states are terminal — nothing leaves them', () => {
  for (const terminal of ['completed', 'failed', 'cancelled', 'interrupted']) {
    for (const to of RUN_STATUSES) {
      assert.equal(
        isValidTransition(terminal, to), false,
        `${terminal} → ${to} must be rejected`
      );
    }
  }
});

test('a paused run may never go straight back to running', () => {
  assert.equal(isValidTransition('paused', 'running'), false);
});

test('an invalid transition fails closed and leaves the row untouched', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'queued' });
  s.transition(r.run_id, 'running');
  s.transition(r.run_id, 'completed');
  assert.throws(() => s.transition(r.run_id, 'running'), /invalid transition/i);
  assert.equal(s.getRun(r.run_id).status, 'completed');
});

test('an unknown status is rejected rather than written', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim' });
  assert.throws(() => s.transition(r.run_id, 'sleeping'), /unknown status|invalid transition/i);
  assert.equal(s.getRun(r.run_id).status, 'queued');
});

// ─── 3. A completed run cannot restart ───────────────────────────────────────

test('a completed run cannot be restarted, paused or resumed', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.transition(r.run_id, 'completed');
  assert.throws(() => s.transition(r.run_id, 'running'), /invalid transition/i);
  assert.throws(() => s.pause(r.run_id, { reason: 'app-quit' }), /invalid transition/i);
  assert.throws(() => s.resume(r.run_id), /not paused/i);
});

// ─── 4 + 5. Resume creates a NEW run, correctly linked ───────────────────────

test('resuming a paused run creates a NEW run and leaves the old one paused', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', status: 'running', worktreePath: 'C:/wt/jim' });
  s.pause(first.run_id, { reason: 'app-quit' });

  const second = s.resume(first.run_id);

  assert.notEqual(second.run_id, first.run_id);
  assert.equal(s.getRun(first.run_id).status, 'paused', 'the old run must STAY paused');
  assert.equal(second.status, 'resuming');
});

test('the continuation linkage points back at the paused run', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(first.run_id, { reason: 'app-quit' });
  const second = s.resume(first.run_id);

  assert.equal(second.parent_run_id, first.run_id);
  assert.equal(second.continuation_of_run_id, first.run_id);
  assert.equal(second.agent_id, 'jim');
});

test('a resumed run inherits the paused run\'s worktree and task by default', (t) => {
  const { s } = store(t);
  const first = s.createRun({
    agentId: 'jim', status: 'running', worktreePath: 'C:/wt/jim', taskId: 't-1', sessionId: 'sess-1'
  });
  s.pause(first.run_id, { reason: 'app-quit' });
  const second = s.resume(first.run_id);

  assert.equal(second.worktree_path, 'C:/wt/jim');
  assert.equal(second.task_id, 't-1');
  assert.equal(second.session_id, 'sess-1');
});

test('a chain of pause/resume keeps every hop linked and distinct', (t) => {
  const { s } = store(t);
  const a = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(a.run_id, { reason: 'app-quit' });
  const b = s.resume(a.run_id);
  s.transition(b.run_id, 'running');
  s.pause(b.run_id, { reason: 'app-quit' });
  const c = s.resume(b.run_id);

  assert.equal(new Set([a.run_id, b.run_id, c.run_id]).size, 3);
  assert.equal(c.continuation_of_run_id, b.run_id);
  assert.equal(s.getRun(b.run_id).continuation_of_run_id, a.run_id);
  assert.equal(s.getRun(a.run_id).status, 'paused');
  assert.equal(s.getRun(b.run_id).status, 'paused');
});

// ─── 6 + 7. Event sequence + id ──────────────────────────────────────────────

test('event seq is monotonic across runs and reopens', (t) => {
  const { s, file } = store(t);
  const r = s.createRun({ agentId: 'jim' });
  s.transition(r.run_id, 'running');
  const before = s.listEvents().map((e) => e.seq);
  assert.deepEqual(before, [...before].sort((x, y) => x - y));

  const { s: s2 } = reopen(file);
  const r2 = s2.createRun({ agentId: 'pam' });
  const after = s2.listEvents().map((e) => e.seq);
  assert.deepEqual(after, [...after].sort((x, y) => x - y));
  assert.ok(Math.max(...after) > Math.max(...before), 'seq must keep climbing after a reopen');
  assert.ok(r2.run_id);
});

test('event ids are unique', (t) => {
  const { s } = store(t);
  for (let i = 0; i < 100; i++) {
    const r = s.createRun({ agentId: `a${i}` });
    s.transition(r.run_id, 'running');
  }
  const ids = s.listEvents().map((e) => e.event_id);
  assert.equal(new Set(ids).size, ids.length);
});

test('a duplicate event id is refused by the store', (t) => {
  const { s } = store(t);
  s.appendEvent({ eventType: 'run.created', eventId: 'ev-dup', payload: {} });
  assert.throws(
    () => s.appendEvent({ eventType: 'run.created', eventId: 'ev-dup', payload: {} }),
    /exists|unique/i
  );
});

// ─── 8. Append survives a reopen ─────────────────────────────────────────────

test('appended events survive closing and reopening the DB', (t) => {
  const { s, db, file } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  const countBefore = s.listEvents().length;
  db.close();

  const { s: s2 } = reopen(file);
  assert.equal(s2.listEvents().length, countBefore);
  assert.equal(s2.getRun(r.run_id).status, 'paused');
  assert.ok(s2.listEvents().some((e) => e.event_type === 'run.paused'));
});

// ─── 9. No mutation API ──────────────────────────────────────────────────────

test('the store exposes no way to update or delete an event', (t) => {
  const { s } = store(t);
  const surface = new Set([
    ...Object.getOwnPropertyNames(Object.getPrototypeOf(s)),
    ...Object.getOwnPropertyNames(s)
  ]);
  for (const name of surface) {
    assert.ok(
      !/^(update|delete|remove|drop|purge|clear|truncate|rewrite)Event/i.test(name),
      `RunStore must not expose ${name}`
    );
  }
});

test('the events table itself rejects UPDATE and DELETE', (t) => {
  const { s, db } = store(t);
  s.appendEvent({ eventType: 'run.created', payload: { a: 1 } });
  assert.throws(() => db.prepare("UPDATE events SET payload_json = '{}'").run(), /append-only/i);
  assert.throws(() => db.prepare('DELETE FROM events').run(), /append-only/i);
});

// ─── 10 + 11. Hash chain ─────────────────────────────────────────────────────

test('the first event chains from the genesis hash', (t) => {
  const { s } = store(t);
  s.appendEvent({ eventType: 'run.created', payload: {} });
  assert.equal(s.listEvents()[0].prev_hash, GENESIS_HASH);
});

test('each event chains to the previous one and the chain validates', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  s.resume(r.run_id);

  const events = s.listEvents();
  assert.ok(events.length >= 4);
  for (let i = 1; i < events.length; i++) {
    assert.equal(events[i].prev_hash, events[i - 1].event_hash, `link broken at seq ${events[i].seq}`);
  }
  assert.deepEqual(s.verifyChain(), { ok: true });
});

test('canonical serialization is key-order independent', () => {
  assert.equal(canonicalJson({ b: 1, a: { d: 2, c: 3 } }), canonicalJson({ a: { c: 3, d: 2 }, b: 1 }));
});

test('a tampered payload is detected by the chain verifier', (t) => {
  const { s, db, file } = store(t);
  s.appendEvent({ eventType: 'run.created', payload: { verdict: 'clean' } });
  s.appendEvent({ eventType: 'run.started', payload: {} });
  assert.deepEqual(s.verifyChain(), { ok: true });
  db.close();

  // Simulate an attacker with raw file access: drop the guards, rewrite history.
  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = ? WHERE seq = 1").run(JSON.stringify({ verdict: 'tampered' }));
  raw.close();

  const { s: s2 } = reopen(file);
  const v = s2.verifyChain();
  assert.equal(v.ok, false);
  assert.equal(v.brokenAtSeq, 1);
});

test('a tampered hash is detected even when the payload is left alone', (t) => {
  const { s, db, file } = store(t);
  s.appendEvent({ eventType: 'run.created', payload: { a: 1 } });
  s.appendEvent({ eventType: 'run.started', payload: { b: 2 } });
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare('UPDATE events SET event_hash = ? WHERE seq = 1')
    .run(crypto.createHash('sha256').update('forged').digest('hex'));
  raw.close();

  const { s: s2 } = reopen(file);
  assert.equal(s2.verifyChain().ok, false);
});

test('a spliced-out event breaks the chain', (t) => {
  const { s, db, file } = store(t);
  s.appendEvent({ eventType: 'run.created', payload: {} });
  s.appendEvent({ eventType: 'run.started', payload: {} });
  s.appendEvent({ eventType: 'run.completed', payload: {} });
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_delete');
  raw.prepare('DELETE FROM events WHERE seq = 2').run();
  raw.close();

  const { s: s2 } = reopen(file);
  assert.equal(s2.verifyChain().ok, false);
});

// ─── 12. Checkpoint ──────────────────────────────────────────────────────────

test('a checkpoint persists onto the run and emits checkpoint.created', (t) => {
  const { s, file, db } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, {
    reason: 'app-quit',
    checkpoint: {
      sha: 'abc123', branch: 'agent/jim', worktreePath: 'C:/wt/jim',
      dirtyState: 'dirty', sessionId: 'sess-9'
    }
  });
  db.close();

  const { s: s2 } = reopen(file);
  const row = s2.getRun(r.run_id);
  assert.equal(row.status, 'paused');
  assert.equal(row.checkpoint_sha, 'abc123');
  assert.equal(row.checkpoint_dirty_state, 'dirty');
  assert.equal(row.branch, 'agent/jim');
  assert.equal(row.session_id, 'sess-9');
  assert.ok(Number.isInteger(row.paused_at));
  assert.ok(Number.isInteger(row.checkpoint_event_seq));

  const cp = s2.listEvents().filter((e) => e.event_type === 'checkpoint.created');
  assert.equal(cp.length, 1);
  assert.equal(cp[0].run_id, r.run_id);
});

test('checkpoint_event_seq points at a real event in the log', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit', checkpoint: { sha: 'deadbee' } });
  const row = s.getRun(r.run_id);
  const seqs = new Set(s.listEvents().map((e) => e.seq));
  assert.ok(seqs.has(row.checkpoint_event_seq));
});

// ─── 13. No invented values ──────────────────────────────────────────────────

test('unknown git and session fields stay null — nothing is invented', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  const fresh = s.getRun(r.run_id);
  for (const col of ['base_sha', 'branch', 'worktree_path', 'session_id', 'task_id', 'model', 'provider']) {
    assert.equal(fresh[col], null, `${col} must be null when not supplied`);
  }

  s.pause(r.run_id, { reason: 'app-quit' });
  const paused = s.getRun(r.run_id);
  assert.equal(paused.checkpoint_sha, null);
  assert.equal(paused.checkpoint_dirty_state, null);
  assert.equal(paused.branch, null);
  assert.equal(paused.exit_code, null);
});

test('an explicitly unknown checkpoint field is stored as null, not the string "unknown"', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit', checkpoint: { sha: undefined, branch: null } });
  const row = s.getRun(r.run_id);
  assert.equal(row.checkpoint_sha, null);
  assert.equal(row.branch, null);
});

// ─── 14. Pause is not completion ─────────────────────────────────────────────

test('pause does not complete or end the run', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  const row = s.getRun(r.run_id);

  assert.equal(row.status, 'paused');
  assert.equal(row.ended_at, null, 'a paused run has NOT ended');
  assert.equal(row.exit_code, null);
  assert.ok(!s.listEvents().some((e) => e.event_type === 'run.completed'));
});

test('a paused run is still reported as an open run', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  assert.ok(s.openRuns().some((x) => x.run_id === r.run_id));
});

test('pause records its reason and touches nothing outside the DB', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running', worktreePath: 'C:/wt/jim' });
  s.pause(r.run_id, { reason: 'safe-pause' });
  assert.equal(s.getRun(r.run_id).pause_reason, 'safe-pause');
  // The worktree path is RECORDED, never acted on — the store has no fs/git surface.
  assert.equal(s.getRun(r.run_id).worktree_path, 'C:/wt/jim');
});

test('the run store module imports no filesystem, git or pty surface', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', '..', 'src', 'main', 'runs.ts'), 'utf8');
  for (const forbidden of ['node:fs', 'node:child_process', 'node-pty', './git', './pty', 'electron']) {
    assert.ok(!src.includes(`from '${forbidden}'`), `runs.ts must not import ${forbidden}`);
  }
});

// ─── 15. Resume never mutates the old run ────────────────────────────────────

test('resume leaves every column of the paused run untouched', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', status: 'running', worktreePath: 'C:/wt/jim' });
  s.pause(first.run_id, { reason: 'app-quit', checkpoint: { sha: 'abc', dirtyState: 'dirty' } });
  const before = s.getRun(first.run_id);

  s.resume(first.run_id);

  assert.deepEqual(s.getRun(first.run_id), before, 'the paused run must be immutable across a resume');
});

test('resume emits resume_requested against the old run and creates the new one', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(first.run_id, { reason: 'app-quit' });
  const second = s.resume(first.run_id);

  const events = s.listEvents();
  const requested = events.find((e) => e.event_type === 'run.resume_requested');
  assert.ok(requested, 'run.resume_requested must be recorded');
  assert.equal(requested.run_id, first.run_id);

  const created = events.filter((e) => e.event_type === 'run.created').map((e) => e.run_id);
  assert.ok(created.includes(second.run_id));
});

test('the new run reaches running through run.resumed, not run.started', (t) => {
  const { s } = store(t);
  const first = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(first.run_id, { reason: 'app-quit' });
  const second = s.resume(first.run_id);
  s.transition(second.run_id, 'running');

  const forSecond = s.listEvents().filter((e) => e.run_id === second.run_id).map((e) => e.event_type);
  assert.ok(forSecond.includes('run.resumed'), 'resuming → running is a RESUME, not a fresh start');
  assert.ok(!forSecond.includes('run.started'));
});

test('a run that was never paused cannot be resumed', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  assert.throws(() => s.resume(r.run_id), /not paused/i);
});

// ─── lifecycle event coverage ────────────────────────────────────────────────

test('the agreed minimum event types are all reachable', (t) => {
  const { s } = store(t);
  const seen = new Set();

  const a = s.createRun({ agentId: 'a', status: 'queued' });
  s.transition(a.run_id, 'running');
  s.transition(a.run_id, 'completed', { exitCode: 0 });

  const b = s.createRun({ agentId: 'b', status: 'running' });
  s.transition(b.run_id, 'failed', { exitCode: 1 });

  const c = s.createRun({ agentId: 'c', status: 'running' });
  s.transition(c.run_id, 'cancelled');

  const d = s.createRun({ agentId: 'd', status: 'running' });
  s.transition(d.run_id, 'interrupted');

  const e = s.createRun({ agentId: 'e', status: 'running' });
  s.pause(e.run_id, { reason: 'app-quit', checkpoint: { sha: 'x' } });
  const f = s.resume(e.run_id);
  s.transition(f.run_id, 'running');

  for (const ev of s.listEvents()) seen.add(ev.event_type);
  for (const required of [
    'run.created', 'run.started', 'run.paused', 'run.resume_requested', 'run.resumed',
    'run.completed', 'run.failed', 'run.cancelled', 'run.interrupted', 'checkpoint.created'
  ]) {
    assert.ok(seen.has(required), `missing event type ${required}`);
  }
});

test('a finished run records ended_at and its exit code', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'jim', status: 'running' });
  s.transition(r.run_id, 'failed', { exitCode: 137 });
  const row = s.getRun(r.run_id);
  assert.equal(row.exit_code, 137);
  assert.ok(Number.isInteger(row.ended_at));
});

test('latestPausedRun finds the most recent paused run for an agent only', (t) => {
  let clock = 1000;
  const { s } = store(t, { now: () => (clock += 1000) });

  const old = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(old.run_id, { reason: 'app-quit' });
  const recent = s.createRun({ agentId: 'jim', status: 'running' });
  s.pause(recent.run_id, { reason: 'app-quit' });
  const other = s.createRun({ agentId: 'pam', status: 'running' });
  s.pause(other.run_id, { reason: 'app-quit' });

  assert.equal(s.latestPausedRun('jim').run_id, recent.run_id);
  assert.equal(s.latestPausedRun('pam').run_id, other.run_id);
  assert.equal(s.latestPausedRun('nobody'), null);
});

test('openRuns lists exactly the non-terminal runs', (t) => {
  const { s } = store(t);
  const live = s.createRun({ agentId: 'a', status: 'running' });
  const queued = s.createRun({ agentId: 'b', status: 'queued' });
  const done = s.createRun({ agentId: 'c', status: 'running' });
  s.transition(done.run_id, 'completed');

  const open = s.openRuns().map((r) => r.run_id).sort();
  assert.deepEqual(open, [live.run_id, queued.run_id].sort());
});

test('timestamps come from the injected clock, never from the caller', (t) => {
  const { s } = store(t, { now: () => 424242 });
  const r = s.createRun({ agentId: 'jim', startedAt: 999, ts: 999 });
  assert.equal(s.getRun(r.run_id).started_at, 424242);
  assert.equal(s.listEvents()[0].ts, 424242);
});
