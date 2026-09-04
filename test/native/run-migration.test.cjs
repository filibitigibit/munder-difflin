'use strict';

/**
 * Mission Control Phase 1A — migration safety for the run/event tables.
 *
 * The run + event store is an ADDITIVE migration onto a DB that already ships in
 * users' hands (userData/harness.db, holding kv + command_history at
 * user_version 1). The failure this guards against is the obvious one: a schema
 * bump that quietly loses the prompt history someone has been accumulating for
 * months. So the fixture here is a REAL pre-Phase1A database — built with the
 * exact v1 DDL and populated — reopened through the shipping PersistStore.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Database = require('better-sqlite3');
const loadTs = require('../load-ts.cjs');

const { PersistStore } = loadTs('src/main/db.ts');

/** Everything holding the DB file open during a test. Windows refuses to unlink
 *  an open file, and `t.after` hooks run in REGISTRATION order — so the temp-dir
 *  hook (registered first, by the fixture) has to close the handles itself
 *  rather than trusting a later hook to have done it. */
const openHandles = [];

function track(handle) {
  openHandles.push(handle);
  return handle;
}

function closeAll() {
  while (openHandles.length) {
    const h = openHandles.pop();
    try { h.close(); } catch { /* already closed by the test */ }
  }
}

/** Build a database exactly as a pre-Phase1A install left it: user_version 1,
 *  the v1 tables, and user data in both of them. */
function legacyDb(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-migrate-'));
  t.after(() => { closeAll(); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'harness.db');
  const db = new Database(file);
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key        TEXT PRIMARY KEY,
      value      TEXT NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS command_history (
      id       INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_id TEXT NOT NULL,
      cwd      TEXT,
      text     TEXT NOT NULL,
      ts       INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ch_agent_ts ON command_history(agent_id, ts DESC);
  `);
  db.pragma('user_version = 1');
  db.prepare('INSERT INTO kv (key, value, updated_at) VALUES (?, ?, ?)')
    .run('windowBounds', JSON.stringify({ width: 1440, height: 900 }), 1700000000000);
  db.prepare('INSERT INTO command_history (agent_id, cwd, text, ts) VALUES (?, ?, ?, ?)')
    .run('jim-mtn68dqy', 'D:/komsu-mission-control', 'ship the telemetry store', 1700000000001);
  db.prepare('INSERT INTO command_history (agent_id, cwd, text, ts) VALUES (?, ?, ?, ?)')
    .run('pam-abc', null, 'review the schema', 1700000000002);
  db.close();
  return file;
}

test('migrating a pre-Phase1A DB preserves kv and command_history', (t) => {
  const file = legacyDb(t);
  const store = track(new PersistStore(file));
  store.open();

  assert.deepEqual(store.getKv('windowBounds'), { width: 1440, height: 900 });
  const history = store.listHistory();
  assert.equal(history.length, 2);
  assert.equal(history[0].text, 'review the schema');
  assert.equal(history[1].agentId, 'jim-mtn68dqy');
  assert.equal(store.searchHistory('telemetry').length, 1);
});

test('the migration adds the run and event tables and bumps user_version', (t) => {
  const file = legacyDb(t);
  const store = new PersistStore(file);
  store.open();
  store.close();

  const db = track(new Database(file));
  const tables = new Set(
    db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all().map((r) => r.name)
  );
  assert.ok(tables.has('runs'), 'runs table must exist after migration');
  assert.ok(tables.has('events'), 'events table must exist after migration');
  assert.ok(tables.has('kv'));
  assert.ok(tables.has('command_history'));
  assert.ok(db.pragma('user_version', { simple: true }) >= 2);
});

test('migration is idempotent — reopening twice changes nothing', (t) => {
  const file = legacyDb(t);
  for (let i = 0; i < 3; i++) {
    const store = new PersistStore(file);
    store.open();
    store.close();
  }
  const store = track(new PersistStore(file));
  store.open();
  assert.equal(store.listHistory().length, 2);
  assert.deepEqual(store.getKv('windowBounds'), { width: 1440, height: 900 });
});

test('a brand-new DB gets the full schema in one pass', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-fresh-'));
  t.after(() => { closeAll(); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'harness.db');

  const store = track(new PersistStore(file));
  store.open();

  assert.ok(store.runs, 'PersistStore must expose the run store');
  const run = store.runs.createRun({ agentId: 'jim' });
  assert.equal(store.runs.getRun(run.run_id).status, 'queued');
  assert.deepEqual(store.runs.verifyChain(), { ok: true });
});

test('runs written through PersistStore survive a close/reopen cycle', (t) => {
  const file = legacyDb(t);
  const first = new PersistStore(file);
  first.open();
  const run = first.runs.createRun({ agentId: 'jim', status: 'running', worktreePath: 'C:/wt/jim' });
  first.runs.pause(run.run_id, { reason: 'app-quit', checkpoint: { sha: 'abc123' } });
  first.close();

  const second = track(new PersistStore(file));
  second.open();

  const row = second.runs.getRun(run.run_id);
  assert.equal(row.status, 'paused');
  assert.equal(row.checkpoint_sha, 'abc123');
  assert.deepEqual(second.runs.verifyChain(), { ok: true });
  // …and the legacy data is still there alongside it.
  assert.equal(second.listHistory().length, 2);
});

test('the event log is append-only through the shipping store too', (t) => {
  const file = legacyDb(t);
  const store = new PersistStore(file);
  store.open();
  store.runs.appendEvent({ eventType: 'run.created', payload: {} });
  store.close();

  const db = track(new Database(file));
  assert.throws(() => db.prepare("UPDATE events SET event_type = 'x'").run(), /append-only/i);
  assert.throws(() => db.prepare('DELETE FROM events').run(), /append-only/i);
});
