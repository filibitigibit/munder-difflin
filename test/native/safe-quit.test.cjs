'use strict';

/**
 * Mission Control Phase 1A.1 — the fail-closed Safe Pause quit gate.
 *
 * WHY THIS EXISTS. The Phase 1A runtime proof measured a real hole: the pause
 * write on the quit path was wrapped in the same swallow-everything guard as
 * every other telemetry observer, so injecting a failure into `pause()` produced
 * one console line and a perfectly normal quit. The run stayed `running`, no
 * checkpoint was written, and the app exited claiming nothing. Nobody was lied
 * to about a pause — the next boot honestly marked it `interrupted` — but the
 * QUIT ITSELF reported success, which is exactly the shape a "PAUSE ALL & SAFE
 * QUIT ✓" button would read as green.
 *
 * So the safe-quit boundary gets a different contract from ordinary telemetry:
 * observation may fail silently, a promised pause may not. Either every open run
 * is checkpointed, written, and READ BACK from the database, or the quit is
 * refused and the app stays up with its PTYs, worktrees and sessions untouched.
 *
 * The batch is one transaction on purpose. A half-paused floor — run1 parked,
 * run2 failed, run3 never reached — is the worst outcome available: it looks
 * like partial progress and is actually an inconsistent record. Rollback makes
 * "not safe" mean "nothing was claimed".
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const loadTs = require('../load-ts.cjs');

const { RunStore, applyRunSchema } = loadTs('src/main/runs.ts');

const openHandles = [];
const track = (db) => { openHandles.push(db); return db; };
function closeAll() {
  while (openHandles.length) {
    const db = openHandles.pop();
    try { db.close(); } catch { /* already closed */ }
  }
}

function store(t, opts = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-safequit-'));
  t.after(() => { closeAll(); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'harness.db');
  const db = track(new Database(file));
  db.pragma('journal_mode = WAL');
  applyRunSchema(db);
  return { s: new RunStore(db, opts), db, file };
}

/** Read a source file with CR stripped. The working tree is CRLF on Windows,
 *  and slicing a function body on an LF brace sequence finds nothing in CRLF
 *  text — which would make these order checks pass vacuously. */
const CR = String.fromCharCode(13);
function readSource(rel) {
  return fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8').split(CR).join('');
}

/** N running runs, as a floor with live agents would look at quit time. */
function floor(s, n) {
  const runs = [];
  for (let i = 1; i <= n; i++) {
    runs.push(s.createRun({ agentId: `agent${i}`, status: 'running', worktreePath: `C:/wt/agent${i}` }));
  }
  return runs;
}

// ─── 1. Happy path: everything paused and verified → quit allowed ────────────

test('with every run paused and verified, the gate allows the quit', (t) => {
  const { s } = store(t);
  const runs = floor(s, 3);

  const res = s.safePauseAll({ reason: 'app-quit' });

  assert.equal(res.ok, true, JSON.stringify(res.failures));
  assert.deepEqual(res.pausedRunIds.sort(), runs.map((r) => r.run_id).sort());
  assert.deepEqual(res.failures, []);
  assert.deepEqual(res.chain, { ok: true });
  for (const r of runs) assert.equal(s.getRun(r.run_id).status, 'paused');
});

test('an empty floor is trivially safe to quit', (t) => {
  const { s } = store(t);
  const res = s.safePauseAll({ reason: 'app-quit' });
  assert.equal(res.ok, true);
  assert.deepEqual(res.pausedRunIds, []);
});

test('already-paused runs are not re-paused and do not block the quit', (t) => {
  const { s } = store(t);
  const a = s.createRun({ agentId: 'a', status: 'running' });
  s.pause(a.run_id, { reason: 'earlier' });
  const b = s.createRun({ agentId: 'b', status: 'running' });

  const res = s.safePauseAll({ reason: 'app-quit' });

  assert.equal(res.ok, true);
  assert.deepEqual(res.pausedRunIds, [b.run_id]);
  assert.equal(s.getRun(a.run_id).pause_reason, 'earlier', 'an existing pause must not be rewritten');
});

// ─── 2 + 6. A failing pause blocks the quit, and takes the batch with it ─────

test('a pause that throws blocks the quit', (t) => {
  const { s } = store(t);
  const runs = floor(s, 1);

  const res = s.safePauseAll({
    reason: 'app-quit',
    checkpointFor: () => { throw new Error('disk on fire'); }
  });

  assert.equal(res.ok, false);
  assert.equal(res.failures.length >= 1, true);
  assert.match(JSON.stringify(res.failures), /disk on fire/);
  assert.equal(s.getRun(runs[0].run_id).status, 'running', 'the run must not be left half-paused');
});

test('multi-run partial failure rolls the WHOLE batch back', (t) => {
  const { s } = store(t);
  const [r1, r2, r3] = floor(s, 3);
  const eventsBefore = s.listEvents().length;

  const res = s.safePauseAll({
    reason: 'app-quit',
    checkpointFor: (run) => {
      if (run.run_id === r2.run_id) throw new Error('run2 checkpoint failed');
      return {};
    }
  });

  assert.equal(res.ok, false);
  // run1 succeeded on its own, run3 was never reached — neither may survive.
  assert.equal(s.getRun(r1.run_id).status, 'running', 'run1 must be rolled back');
  assert.equal(s.getRun(r2.run_id).status, 'running');
  assert.equal(s.getRun(r3.run_id).status, 'running');
  assert.deepEqual(res.pausedRunIds, [], 'nothing may be reported as paused');
  assert.equal(s.listEvents().length, eventsBefore, 'no partial events may remain');
});

test('a rolled-back batch leaves the hash chain intact', (t) => {
  const { s } = store(t);
  floor(s, 2);
  s.safePauseAll({ reason: 'app-quit', checkpointFor: () => { throw new Error('nope'); } });
  assert.deepEqual(s.verifyChain(), { ok: true });
});

// ─── 3 + 4 + 5. Verification reads the DB back, and disbelieves the writer ───

test('a missing checkpoint.created event blocks the quit', (t) => {
  const { s, db, file } = store(t);
  const [r] = floor(s, 1);
  assert.equal(s.safePauseAll({ reason: 'app-quit' }).ok, true);
  const seq = s.getRun(r.run_id).checkpoint_event_seq;
  db.close();

  // Someone with raw file access removes the checkpoint the run points at.
  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_delete');
  raw.prepare('DELETE FROM events WHERE seq = ?').run(seq);
  raw.close();

  const { s: s2 } = (() => { const d = track(new Database(file)); return { s: new RunStore(d) }; })();
  const v = s2.verifySafePause([r.run_id]);
  assert.equal(v.ok, false);
  assert.match(JSON.stringify(v.failures), /checkpoint/i);
});

test('a missing run.paused event blocks the quit', (t) => {
  const { s, db, file } = store(t);
  const [r] = floor(s, 1);
  assert.equal(s.safePauseAll({ reason: 'app-quit' }).ok, true);
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_delete');
  raw.prepare("DELETE FROM events WHERE event_type = 'run.paused' AND run_id = ?").run(r.run_id);
  raw.close();

  const d = track(new Database(file));
  const v = new RunStore(d).verifySafePause([r.run_id]);
  assert.equal(v.ok, false);
  assert.match(JSON.stringify(v.failures), /run\.paused/i);
});

test('a run left un-paused in the DB blocks the quit', (t) => {
  const { s, db, file } = store(t);
  const [r] = floor(s, 1);
  assert.equal(s.safePauseAll({ reason: 'app-quit' }).ok, true);
  db.close();

  const raw = new Database(file);
  raw.prepare("UPDATE runs SET status = 'running', checkpoint_event_seq = NULL WHERE run_id = ?").run(r.run_id);
  raw.close();

  const d = track(new Database(file));
  const v = new RunStore(d).verifySafePause([r.run_id]);
  assert.equal(v.ok, false);
  assert.match(JSON.stringify(v.failures), /status|checkpoint_event_seq/i);
});

test('a broken hash chain blocks the quit even when every row looks right', (t) => {
  const { s, db, file } = store(t);
  const [r] = floor(s, 1);
  assert.equal(s.safePauseAll({ reason: 'app-quit' }).ok, true);
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = '{\"forged\":true}' WHERE seq = 1").run();
  raw.close();

  const d = track(new Database(file));
  const v = new RunStore(d).verifySafePause([r.run_id]);
  assert.equal(v.ok, false);
  assert.match(JSON.stringify(v.failures), /chain/i);
});

test('verification is what the gate returns — not the writer\'s own opinion', (t) => {
  const { s } = store(t);
  const [r] = floor(s, 1);
  const res = s.safePauseAll({ reason: 'app-quit' });
  const v = s.verifySafePause(res.pausedRunIds);
  assert.equal(v.ok, true);
  assert.equal(res.verified, true, 'safePauseAll must report a DB-read-back verification');
  assert.ok(Number.isInteger(s.getRun(r.run_id).checkpoint_event_seq));
});

// ─── 10. Retry after a failure ───────────────────────────────────────────────

test('a retry after a transient failure is allowed to quit', (t) => {
  const { s } = store(t);
  const runs = floor(s, 2);
  let boom = true;

  const first = s.safePauseAll({
    reason: 'app-quit',
    checkpointFor: () => { if (boom) throw new Error('transient'); return {}; }
  });
  assert.equal(first.ok, false);
  for (const r of runs) assert.equal(s.getRun(r.run_id).status, 'running');

  boom = false;
  const second = s.safePauseAll({ reason: 'app-quit' });
  assert.equal(second.ok, true, JSON.stringify(second.failures));
  for (const r of runs) assert.equal(s.getRun(r.run_id).status, 'paused');
  assert.deepEqual(s.verifyChain(), { ok: true });
});

// ─── 7 + 8 + 9. A refused quit must not tear anything down ───────────────────
//
// The gate itself has no fs/git/pty/electron surface (guarded in
// run-store.test.cjs), so these assert the ORDER in the one place that does:
// the quit path must consult the gate before it touches anything destructive.

test('the quit path consults the gate before any teardown step', () => {
  const src = readSource('src/main/index.ts');
  const fn = src.slice(src.indexOf('function teardownAndQuit'));
  const body = fn.slice(0, fn.indexOf('\n}\n') + 1);

  const gate = body.indexOf('safeQuitGate');
  assert.ok(gate > -1, 'teardownAndQuit must consult the safe-quit gate');

  for (const destructive of ['allowQuit = true', 'ptyManager.killAll()', 'persist.close()', 'app.quit()']) {
    const at = body.indexOf(destructive);
    assert.ok(at > -1, `expected ${destructive} in teardownAndQuit`);
    assert.ok(gate < at, `the gate must run BEFORE ${destructive}`);
  }
});

test('a refused quit returns early — nothing after the gate runs', () => {
  const src = readSource('src/main/index.ts');
  const fn = src.slice(src.indexOf('function teardownAndQuit'));
  const body = fn.slice(0, fn.indexOf('\n}\n') + 1);
  const gate = body.indexOf('safeQuitGate');
  const guard = body.indexOf('return', gate);
  const firstDestructive = Math.min(
    ...['allowQuit = true', 'ptyManager.killAll()', 'app.quit()']
      .map((d) => body.indexOf(d)).filter((i) => i > -1)
  );
  assert.ok(guard > gate && guard < firstDestructive,
    'teardownAndQuit must return on a failed gate before doing anything destructive');
});

test('the failure is reported to the caller, not just logged', () => {
  const src = readSource('src/main/index.ts');
  const handler = src.slice(src.indexOf("ipcMain.handle('app:confirmClose'"));
  const body = handler.slice(0, handler.indexOf('\n});') + 1);
  assert.match(body, /return/, 'app:confirmClose must RETURN the outcome to the renderer');
  assert.ok(!/^\s*ipcMain\.handle\('app:confirmClose', \(\) => \{\s*closingTime\.cancel\(\);\s*teardownAndQuit\(\);\s*\}\);/.test(body),
    'the old fire-and-forget handler must be gone');
});

test('the safe-quit gate does not swallow its own failure', () => {
  const src = readSource('src/main/index.ts');
  const at = src.indexOf('function safeQuitGate');
  assert.ok(at > -1, 'safeQuitGate must exist');
  const gateFn = src.slice(at);
  const body = gateFn.slice(0, gateFn.indexOf('\n}\n') + 1);
  assert.ok(body.length > 0, 'safeQuitGate must have a body');
  assert.ok(!body.includes('mcRecord('),
    'the gate must NOT route through the swallow-everything telemetry helper');
});

// ─── failure surface ─────────────────────────────────────────────────────────

test('a blocked quit names the runs it could not pause', (t) => {
  const { s } = store(t);
  const [r1, r2] = floor(s, 2);
  const res = s.safePauseAll({
    reason: 'app-quit',
    checkpointFor: (run) => { if (run.run_id === r2.run_id) throw new Error('bad disk'); return {}; }
  });
  assert.equal(res.ok, false);
  const blob = JSON.stringify(res.failures);
  assert.match(blob, new RegExp(r2.run_id), 'the failing run id must be named');
  assert.ok(res.failures.every((f) => typeof f.reason === 'string' && f.reason.length > 0));
  assert.ok(r1.run_id);
});

test('safePauseAll never reports ok when verification fails', (t) => {
  const { s } = store(t);
  floor(s, 1);
  const res = s.safePauseAll({ reason: 'app-quit' });
  // ok is the AND of "wrote" and "read it back"
  assert.equal(res.ok, res.verified && res.failures.length === 0);
});

// ─── Phase 1A.1b: an empty floor must not bypass the chain check ─────────────
//
// The 1A.1 runtime UI proof found this the hard way. A chain-tamper failure is
// caught AFTER the batch commits, so the runs really are paused by the time the
// gate refuses. Click quit a second time and there is nothing left to pause —
// and the early return for "no open runs" reported ok:true while holding a chain
// verdict that said otherwise. First click fail-closed, second click walked
// straight through. "Nothing to pause" is not the same claim as "the record is
// intact", and only the second one licenses a quit.

test('an empty floor with a VALID chain is safe to quit', (t) => {
  const { s } = store(t);
  const r = s.createRun({ agentId: 'a', status: 'running' });
  s.pause(r.run_id, { reason: 'earlier' });      // nothing active left
  const res = s.safePauseAll({ reason: 'app-quit' });
  assert.deepEqual(res.pausedRunIds, []);
  assert.equal(res.ok, true);
  assert.deepEqual(res.chain, { ok: true });
});

test('an empty floor with a BROKEN chain is NOT safe to quit', (t) => {
  const { s, db, file } = store(t);
  const r = s.createRun({ agentId: 'a', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  assert.deepEqual(s.activeRuns(), [], 'precondition: no open runs remain');
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = '{\"forged\":true}' WHERE seq = 1").run();
  raw.close();

  const s2 = new RunStore(track(new Database(file)));
  const res = s2.safePauseAll({ reason: 'app-quit' });

  assert.equal(res.ok, false, 'a broken chain must block the quit even with nothing to pause');
  assert.equal(res.verified, false);
  assert.equal(res.chain.ok, false);
  assert.match(JSON.stringify(res.failures), /chain/i);
});

test('the empty-floor refusal names a GLOBAL failure, not a fake run id', (t) => {
  const { s, db, file } = store(t);
  const r = s.createRun({ agentId: 'a', status: 'running' });
  s.pause(r.run_id, { reason: 'app-quit' });
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = '{\"forged\":true}' WHERE seq = 1").run();
  raw.close();

  const res = new RunStore(track(new Database(file))).safePauseAll({ reason: 'app-quit' });
  assert.equal(res.failures.length, 1);
  assert.equal(res.failures[0].runId, '*', 'a chain break belongs to no single run');
  assert.match(res.failures[0].reason, /seq 1/);
});

test('the retry after a post-commit refusal is refused again while the chain is broken', (t) => {
  const { s, db, file } = store(t);
  const r = s.createRun({ agentId: 'a', status: 'running' });
  db.close();

  // Break the chain BEFORE the first attempt, exactly as the runtime proof did.
  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = '{\"forged\":true}' WHERE seq = 1").run();
  raw.close();

  const s2 = new RunStore(track(new Database(file)));
  const first = s2.safePauseAll({ reason: 'app-quit' });
  assert.equal(first.ok, false, 'first click: refused');
  // The writes committed before verification failed, so the run really is paused.
  assert.equal(s2.getRun(r.run_id).status, 'paused');
  assert.deepEqual(s2.activeRuns(), [], 'nothing left to pause on the retry');

  const second = s2.safePauseAll({ reason: 'app-quit' });
  assert.equal(second.ok, false, 'second click MUST still be refused — the chain is still broken');
  assert.equal(second.chain.ok, false);
});

test('once the chain is valid again, the empty floor quits', (t) => {
  const { s, db, file } = store(t);
  const r = s.createRun({ agentId: 'a', status: 'running' });
  const original = s.listEvents()[0].payload_json;
  s.pause(r.run_id, { reason: 'app-quit' });
  db.close();

  const raw = new Database(file);
  raw.exec('DROP TRIGGER IF EXISTS events_no_update');
  raw.prepare("UPDATE events SET payload_json = '{\"forged\":true}' WHERE seq = 1").run();
  raw.close();

  const s2 = new RunStore(track(new Database(file)));
  assert.equal(s2.safePauseAll({ reason: 'app-quit' }).ok, false);

  // Put the original payload back — the chain heals because the hash is over
  // the CONTENTS, not over a separate marker.
  const raw2 = new Database(file);
  raw2.prepare('UPDATE events SET payload_json = ? WHERE seq = 1').run(original);
  raw2.close();

  const s3 = new RunStore(track(new Database(file)));
  const res = s3.safePauseAll({ reason: 'app-quit' });
  assert.equal(res.ok, true, JSON.stringify(res.failures));
  assert.deepEqual(res.chain, { ok: true });
});

test('the empty-floor early return does not hard-code ok:true', () => {
  const src = readSource('src/main/runs.ts');
  const at = src.indexOf('targets.length === 0');
  assert.ok(at > -1, 'the empty-floor branch must exist');
  // Strip comments: prose about the old bug legitimately mentions it, and this
  // check is about what the branch DOES.
  const branch = src.slice(at, at + 900)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '');
  assert.ok(!/ok:\s*true/.test(branch),
    'the empty-floor branch must derive ok from the chain verdict, never assert it');
  assert.match(branch, /chain\.ok|verifyChain/,
    'the empty-floor branch must consult the chain');
});
