'use strict';

/**
 * Mission Control Phase 1B — SLICE 1 (DILIM 1).
 *
 * Every test here carries the plan's case id (G-01, W-03, F-12 …) in its name so
 * a failure names the contract clause it broke, not just a symptom. The cases
 * come from docs/phase-1b/TEST-PLAN.md; the rules they enforce come from
 * docs/phase-1b/CONTRACT.md (M4 whitelist, M6 derivation, M10 migration shape,
 * M13 field family).
 *
 * Scope is deliberately DB-only. No Electron, no PTY, no git subprocess, no fake
 * executables — those belong to the FIXTURE slice and are not written here.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const Database = require('better-sqlite3');
const loadTs = require('../load-ts.cjs');

const { PersistStore } = loadTs('src/main/db.ts');
const { applyRunSchema } = loadTs('src/main/runs.ts');

/** The five provenance concepts (M13). Value column + status column each. */
const FIELDS = [
  'git_base_sha',
  'git_branch',
  'git_toplevel',
  'git_pty_cwd',
  'git_worktree_path'
];
const STATUS_COLS = FIELDS.map((f) => `${f}_status`);

/** The closed status alphabet (M4). Reason is embedded in the string — there is
 *  no separate reason column, so `IN (…)` cannot be defeated by a NULL. */
const FAILED = [
  'failed(git-missing)',
  'failed(command-nonzero)',
  'failed(timeout)',
  'failed(not-a-repo)',
  'failed(unusable-output)'
];
const NOT_APPLICABLE = [
  'not_applicable(no-isolation)',
  'not_applicable(bare-repo)',
  'not_applicable(submodule)'
];
const ALL_STATUSES = ['measured', 'measured_detached', 'never_measured', ...FAILED, ...NOT_APPLICABLE];

/** M6: which statuses leave provenance_complete intact. */
const NON_BREAKING = ['measured', 'measured_detached', 'not_applicable(no-isolation)'];

const LEGACY_COLS = ['base_sha', 'branch', 'worktree_path'];
const V2_COLS = [
  'run_id', 'parent_run_id', 'continuation_of_run_id', 'task_id', 'agent_id', 'session_id',
  'started_at', 'ended_at', 'status', 'provider', 'model', 'base_sha', 'branch', 'worktree_path',
  'pause_reason', 'paused_at', 'checkpoint_event_seq', 'checkpoint_sha', 'checkpoint_dirty_state',
  'exit_code'
];

const openHandles = [];
function track(h) { openHandles.push(h); return h; }
function closeAll() {
  while (openHandles.length) {
    const h = openHandles.pop();
    try { h.close(); } catch { /* already closed */ }
  }
}

/** Three run rows with deliberately DIFFERENT legacy profiles, so a migration
 *  that flattens or copies values cannot hide behind a uniform fixture:
 *   (a) worktree_path filled, (b) worktree_path NULL, (c) base_sha+branch filled. */
function seedThreeProfiles(db) {
  const ins = db.prepare(`
    INSERT INTO runs (run_id, agent_id, started_at, status, base_sha, branch, worktree_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  ins.run('run-a', 'jim-1', 1700000000001, 'running', null, null, 'D:\\mc-scratch\\hive\\worktrees\\probe-iso');
  ins.run('run-b', 'jim-2', 1700000000002, 'paused', null, null, null);
  ins.run('run-c', 'pam-1', 1700000000003, 'exited', 'abc123def456', 'feature/x', null);
}

/** A DB exactly as Phase 1A left it: user_version 2, v2 tables, rows present. */
function v2Db(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mc-p1b-'));
  t.after(() => { closeAll(); fs.rmSync(dir, { recursive: true, force: true }); });
  const file = path.join(dir, 'harness.db');
  const db = track(new Database(file));
  db.exec(`
    CREATE TABLE IF NOT EXISTS kv (
      key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS command_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, agent_id TEXT NOT NULL, cwd TEXT,
      text TEXT NOT NULL, ts INTEGER NOT NULL
    );
  `);
  applyRunSchema(db);
  db.pragma('user_version = 2');
  db.prepare('INSERT INTO kv (key, value, updated_at) VALUES (?,?,?)')
    .run('windowBounds', JSON.stringify({ width: 1440, height: 900 }), 1700000000000);
  db.prepare('INSERT INTO command_history (agent_id, cwd, text, ts) VALUES (?,?,?,?)')
    .run('jim-1', 'D:/komsu-mission-control', 'ship slice 1', 1700000000000);
  seedThreeProfiles(db);
  db.close();
  return file;
}

/** Migrate the file through the SHIPPING code path, then hand back a raw handle. */
function migrated(t, file) {
  const store = track(new PersistStore(file));
  store.open();
  return { store, db: track(new Database(file)) };
}

/** A migrated DB plus one row to write provenance onto. */
function writable(t) {
  const file = v2Db(t);
  const { db } = migrated(t, file);
  return db;
}

function dumpRows(db, table, cols) {
  const list = cols.join(', ');
  return JSON.stringify(db.prepare(`SELECT ${list} FROM ${table} ORDER BY rowid`).all());
}

function schemaText(db) {
  return db.prepare("SELECT type, name, sql FROM sqlite_master ORDER BY type, name").all()
    .map((r) => `${r.type}|${r.name}|${r.sql}`).join('\n');
}

function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }

function cols(db, table) {
  return db.prepare(`SELECT name FROM pragma_table_xinfo(?)`).all(table).map((r) => r.name);
}

function throwsWrite(fn) {
  try { fn(); return null; } catch (e) { return e; }
}

// ───────────────────────────── GRUP G — göç ─────────────────────────────

test('G-10 · POZITIF KONTROL: göç öncesi fixture gerçekten göç edilmemiş', (t) => {
  const file = v2Db(t);
  const db = track(new Database(file));
  assert.equal(db.pragma('user_version', { simple: true }), 2);
  const c = cols(db, 'runs');
  for (const col of [...FIELDS, ...STATUS_COLS, 'provenance_complete', 'checkpoint_sha_source']) {
    assert.ok(!c.includes(col), `${col} göç öncesi VAR OLMAMALI`);
  }
});

test('G-20 · POZITIF KONTROL: fixture v2 ve gerçekten üç profilli', (t) => {
  const file = v2Db(t);
  const db = track(new Database(file));
  assert.equal(db.pragma('user_version', { simple: true }), 2);
  assert.ok(!cols(db, 'runs').includes('git_base_sha_status'));
  const rows = db.prepare('SELECT run_id, base_sha, branch, worktree_path FROM runs ORDER BY run_id').all();
  assert.equal(rows.length, 3);
  assert.ok(rows.some((r) => r.worktree_path !== null), 'bir satırda worktree_path DOLU olmalı');
  assert.ok(rows.some((r) => r.worktree_path === null), 'bir satırda worktree_path NULL olmalı');
  assert.ok(rows.some((r) => r.base_sha !== null && r.branch !== null), 'bir satırda base_sha+branch DOLU olmalı');
});

test('G-01 · göç uygulanır ve user_version 3 olur', (t) => {
  const file = v2Db(t);
  const { db } = migrated(t, file);
  assert.equal(db.pragma('user_version', { simple: true }), 3);
  const c = cols(db, 'runs');
  for (const col of [...FIELDS, ...STATUS_COLS, 'provenance_complete', 'checkpoint_sha_source']) {
    assert.ok(c.includes(col), `${col} göç sonrası MEVCUT olmalı`);
  }
});

test('G-02 · göç öncesi/sonrası tüm tabloların tüm satırları birebir aynı', (t) => {
  const file = v2Db(t);
  const before = {};
  {
    const db = track(new Database(file));
    before.runs = dumpRows(db, 'runs', V2_COLS);
    before.events = dumpRows(db, 'events', ['seq', 'event_id', 'run_id', 'event_type', 'ts', 'payload_json', 'prev_hash', 'event_hash']);
    before.kv = dumpRows(db, 'kv', ['key', 'value', 'updated_at']);
    before.ch = dumpRows(db, 'command_history', ['id', 'agent_id', 'cwd', 'text', 'ts']);
    db.close();
  }
  const { db } = migrated(t, file);
  assert.equal(dumpRows(db, 'runs', V2_COLS), before.runs);
  assert.equal(dumpRows(db, 'events', ['seq', 'event_id', 'run_id', 'event_type', 'ts', 'payload_json', 'prev_hash', 'event_hash']), before.events);
  assert.equal(dumpRows(db, 'kv', ['key', 'value', 'updated_at']), before.kv);
  assert.equal(dumpRows(db, 'command_history', ['id', 'agent_id', 'cwd', 'text', 'ts']), before.ch);
});

test('G-03 · events UPDATE trigger göç sonrası hâlâ reddediyor', (t) => {
  const db = writable(t);
  db.prepare(`INSERT INTO events (event_id, run_id, event_type, ts, payload_json, prev_hash, event_hash)
              VALUES (?,?,?,?,?,?,?)`).run('e1', 'run-a', 'run.created', 1, '{}', '', 'h');
  const e = throwsWrite(() => db.prepare(`UPDATE events SET ts = 2 WHERE event_id = 'e1'`).run());
  assert.ok(e, 'UPDATE reddedilmeliydi');
  assert.match(e.message, /append-only/);
});

test('G-04 · events DELETE trigger göç sonrası hâlâ reddediyor', (t) => {
  const db = writable(t);
  db.prepare(`INSERT INTO events (event_id, run_id, event_type, ts, payload_json, prev_hash, event_hash)
              VALUES (?,?,?,?,?,?,?)`).run('e1', 'run-a', 'run.created', 1, '{}', '', 'h');
  const e = throwsWrite(() => db.prepare(`DELETE FROM events WHERE event_id = 'e1'`).run());
  assert.ok(e, 'DELETE reddedilmeliydi');
  assert.match(e.message, /append-only/);
});

test('G-05 · indeksler göç sonrası mevcut', (t) => {
  const file = v2Db(t);
  let before;
  {
    const db = track(new Database(file));
    before = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name`).all().map((r) => r.name);
    db.close();
  }
  const { db } = migrated(t, file);
  const after = db.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name`).all().map((r) => r.name);
  for (const n of ['idx_runs_agent', 'idx_runs_status', 'idx_runs_parent', 'idx_events_run', 'idx_events_type']) {
    assert.ok(after.includes(n), `${n} göç sonrası mevcut olmalı`);
  }
  for (const n of before) assert.ok(after.includes(n), `${n} göç sırasında kaybolmamalı`);
});

test('G-06 · göç ikinci kez çalıştırılırsa no-op', (t) => {
  const file = v2Db(t);
  const { store, db } = migrated(t, file);
  const schemaBefore = schemaText(db);
  const dataBefore = dumpRows(db, 'runs', V2_COLS);
  const store2 = track(new PersistStore(file));
  store2.open();
  assert.equal(db.pragma('user_version', { simple: true }), 3);
  assert.equal(schemaText(db), schemaBefore);
  assert.equal(dumpRows(db, 'runs', V2_COLS), dataBefore);
  void store;
});

test('G-07 · CHECK ihlali doğrudan INSERT ile de reddedilir (API atlanır)', (t) => {
  const db = writable(t);
  const e = throwsWrite(() => db.prepare(
    `INSERT INTO runs (run_id, agent_id, started_at, status, git_base_sha_status, git_base_sha)
     VALUES (?,?,?,?,?,?)`).run('x1', 'a', 1, 'running', 'measured', null));
  assert.ok(e, 'measured + NULL doğrudan INSERT ile reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('G-08 · izinli kombinasyon INSERT geçer ve geri okunur', (t) => {
  const db = writable(t);
  db.prepare(`INSERT INTO runs (run_id, agent_id, started_at, status, git_base_sha_status, git_base_sha)
              VALUES (?,?,?,?,?,?)`).run('x2', 'a', 1, 'running', 'measured', 'abc123');
  const r = db.prepare('SELECT git_base_sha_status s, git_base_sha v FROM runs WHERE run_id=?').get('x2');
  assert.equal(r.s, 'measured');
  assert.equal(r.v, 'abc123');
});

test('G-09 · göç öncesi satırlar beyaz listeye uyan bir sınıfla doldurulur', (t) => {
  const db = writable(t);
  const rows = db.prepare(`SELECT ${STATUS_COLS.join(', ')} FROM runs`).all();
  assert.equal(rows.length, 3);
  for (const r of rows) {
    for (const c of STATUS_COLS) {
      assert.ok(ALL_STATUSES.includes(r[c]), `${c}='${r[c]}' sabit listede olmalı`);
    }
  }
});

test('G-11 · göç edilmiş legacy satırlar provenance_complete=false taşır', (t) => {
  const db = writable(t);
  for (const r of db.prepare('SELECT run_id, provenance_complete pc FROM runs').all()) {
    assert.equal(r.pc, 0, `${r.run_id} için false bekleniyordu`);
  }
});

test('G-12 · v2 satırları beş alanın hepsinde never_measured, değerler NULL', (t) => {
  const db = writable(t);
  const rows = db.prepare(`SELECT run_id, ${STATUS_COLS.join(', ')}, ${FIELDS.join(', ')} FROM runs`).all();
  assert.equal(rows.length, 3);
  for (const r of rows) {
    for (const c of STATUS_COLS) assert.equal(r[c], 'never_measured', `${r.run_id}.${c}`);
    for (const f of FIELDS) assert.equal(r[f], null, `${r.run_id}.${f} NULL olmalı`);
  }
});

test('G-13 · v2 satırları göç sonrası provenance_complete=false', (t) => {
  const db = writable(t);
  const n = db.prepare('SELECT COUNT(*) n FROM runs WHERE provenance_complete = 0').get().n;
  assert.equal(n, 3);
});

test('G-14 · SATIR KÜMESİ KORUMASI — üç satırın tüm eski sütunları birebir', (t) => {
  const file = v2Db(t);
  let before;
  { const db = track(new Database(file)); before = dumpRows(db, 'runs', V2_COLS); db.close(); }
  const { db } = migrated(t, file);
  assert.equal(dumpRows(db, 'runs', V2_COLS), before);
});

test('G-15 · SATIR SAYISI KORUMASI', (t) => {
  const file = v2Db(t);
  let before;
  { const db = track(new Database(file)); before = db.prepare('SELECT COUNT(*) n FROM runs').get().n; db.close(); }
  const { db } = migrated(t, file);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM runs').get().n, before);
});

test('G-16 · SATIR KİMLİĞİ KORUMASI', (t) => {
  const file = v2Db(t);
  let before;
  { const db = track(new Database(file)); before = db.prepare('SELECT run_id FROM runs ORDER BY run_id').all().map((r) => r.run_id); db.close(); }
  const { db } = migrated(t, file);
  const after = db.prepare('SELECT run_id FROM runs ORDER BY run_id').all().map((r) => r.run_id);
  assert.deepEqual(after, before);
});

test('G-17 · SENTINEL: dolu worktree_path aynen durur', (t) => {
  const db = writable(t);
  const r = db.prepare('SELECT worktree_path w FROM runs WHERE run_id=?').get('run-a');
  assert.equal(r.w, 'D:\\mc-scratch\\hive\\worktrees\\probe-iso');
});

test('G-18 · AYRIM: legacy değer M13 sütununa KOPYALANMAZ', (t) => {
  const db = writable(t);
  const a = db.prepare('SELECT worktree_path w, git_worktree_path g, git_worktree_path_status s FROM runs WHERE run_id=?').get('run-a');
  assert.equal(a.w, 'D:\\mc-scratch\\hive\\worktrees\\probe-iso');
  assert.equal(a.g, null);
  assert.equal(a.s, 'never_measured');
  const c = db.prepare('SELECT base_sha b, git_base_sha g, branch br, git_branch gb FROM runs WHERE run_id=?').get('run-c');
  assert.equal(c.b, 'abc123def456');
  assert.equal(c.g, null);
  assert.equal(c.br, 'feature/x');
  assert.equal(c.gb, null);
});

test('G-19 · göç M13 alanlarına measured/failed/not_applicable YAZAMAZ', (t) => {
  const db = writable(t);
  const forbidden = ['measured', 'measured_detached', ...FAILED, ...NOT_APPLICABLE];
  for (const r of db.prepare(`SELECT run_id, ${STATUS_COLS.join(', ')} FROM runs`).all()) {
    for (const c of STATUS_COLS) {
      assert.ok(!forbidden.includes(r[c]), `${r.run_id}.${c} göç tarafından '${r[c]}' yapılmamalıydı`);
    }
  }
});

test('G-21 · rowid kümesi göç öncesiyle birebir aynı (satır yeniden oluşturulmadı)', (t) => {
  const file = v2Db(t);
  let before;
  { const db = track(new Database(file)); before = db.prepare('SELECT rowid r FROM runs ORDER BY rowid').all().map((x) => x.r); db.close(); }
  const { db } = migrated(t, file);
  const after = db.prepare('SELECT rowid r FROM runs ORDER BY rowid').all().map((x) => x.r);
  assert.deepEqual(after, before);
});

// ──────────────────────── GRUP W — yazma grameri ────────────────────────

/** Insert a run carrying one field's (status, value) pair. Returns the error, or
 *  null when the write was accepted. */
function tryWrite(db, id, field, status, value) {
  return throwsWrite(() => db.prepare(
    `INSERT INTO runs (run_id, agent_id, started_at, status, ${field}_status, ${field})
     VALUES (?,?,?,?,?,?)`).run(id, 'a', 1, 'running', status, value));
}

test('W-16 · POZITIF KONTROL: W grubunun yazma yolu gerçekten satır yazabiliyor', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w16', 'git_base_sha', 'measured', 'abc123');
  assert.equal(e, null, 'izinli kombinasyon yazılabilmeliydi');
  const r = db.prepare('SELECT git_base_sha_status s, git_base_sha v FROM runs WHERE run_id=?').get('w16');
  assert.equal(r.s, 'measured');
  assert.equal(r.v, 'abc123');
});

test('W-01 · measured + dolu değer kabul edilir', (t) => {
  const db = writable(t);
  assert.equal(tryWrite(db, 'w01', 'git_base_sha', 'measured', 'abc123'), null);
  const r = db.prepare('SELECT git_base_sha_status s, git_base_sha v FROM runs WHERE run_id=?').get('w01');
  assert.equal(r.s, 'measured');
  assert.equal(r.v, 'abc123');
});

test('W-02 · measured + NULL reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w02', 'git_base_sha', 'measured', null);
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-03 · measured_detached + NULL (git_branch) kabul edilir', (t) => {
  const db = writable(t);
  assert.equal(tryWrite(db, 'w03', 'git_branch', 'measured_detached', null), null);
});

test('W-04 · measured_detached + dolu değer reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w04', 'git_branch', 'measured_detached', 'main');
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-05 · failed(sabit sebep) + NULL kabul edilir (dört sebep)', (t) => {
  const db = writable(t);
  const reasons = ['failed(git-missing)', 'failed(command-nonzero)', 'failed(timeout)', 'failed(not-a-repo)'];
  reasons.forEach((s, i) => {
    assert.equal(tryWrite(db, `w05-${i}`, 'git_base_sha', s, null), null, `${s} kabul edilmeliydi`);
  });
});

test('W-06 · failed(timeout) + dolu değer reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w06', 'git_base_sha', 'failed(timeout)', 'abc123');
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-07 · not_applicable(sabit sebep) + NULL kabul edilir (üç sebep)', (t) => {
  const db = writable(t);
  NOT_APPLICABLE.forEach((s, i) => {
    assert.equal(tryWrite(db, `w07-${i}`, 'git_worktree_path', s, null), null, `${s} kabul edilmeliydi`);
  });
});

test('W-08 · not_applicable(no-isolation) + dolu değer reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w08', 'git_worktree_path', 'not_applicable(no-isolation)', 'D:\\wt');
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-11 · beyaz listede olmayan durum string reddedilir', (t) => {
  const db = writable(t);
  ['unknown', 'pending', 'partial'].forEach((s, i) => {
    const e = tryWrite(db, `w11-${i}`, 'git_base_sha', s, null);
    assert.ok(e, `${s} reddedilmeliydi`);
    assert.match(e.message, /CHECK/i);
  });
});

test('W-12 · measured + boş string reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w12', 'git_base_sha', 'measured', '');
  assert.ok(e, 'boş string reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-13 · uydurma failed sebebi reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w13', 'git_base_sha', 'failed(uydurma-sebep)', null);
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-14 · uydurma not_applicable sebebi reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w14', 'git_base_sha', 'not_applicable(uydurma-sebep)', null);
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-17 · failed(unusable-output) + NULL kabul edilir', (t) => {
  const db = writable(t);
  assert.equal(tryWrite(db, 'w17', 'git_toplevel', 'failed(unusable-output)', null), null);
});

test('W-18 · failed(unusable-output) + dolu değer reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w18', 'git_toplevel', 'failed(unusable-output)', 'D:\\repo');
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-19 · never_measured + NULL kabul edilir', (t) => {
  const db = writable(t);
  assert.equal(tryWrite(db, 'w19', 'git_pty_cwd', 'never_measured', null), null);
});

test('W-20 · never_measured + dolu değer reddedilir', (t) => {
  const db = writable(t);
  const e = tryWrite(db, 'w20', 'git_pty_cwd', 'never_measured', 'D:\\cwd');
  assert.ok(e, 'reddedilmeliydi');
  assert.match(e.message, /CHECK/i);
});

test('W-21 · measured_detached, git_branch dışındaki dört alanda reddedilir', (t) => {
  const db = writable(t);
  ['git_base_sha', 'git_toplevel', 'git_pty_cwd', 'git_worktree_path'].forEach((f, i) => {
    const e = tryWrite(db, `w21-${i}`, f, 'measured_detached', null);
    assert.ok(e, `${f} için measured_detached reddedilmeliydi`);
    assert.match(e.message, /CHECK/i);
  });
});

test('W-15 · legacy sütunlar M4 beyaz listesinin DIŞINDA — durum sütunları YOK', (t) => {
  const db = writable(t);
  const c = cols(db, 'runs');
  for (const l of LEGACY_COLS) {
    assert.ok(!c.includes(`${l}_status`), `${l}_status sütunu VAR OLMAMALI`);
    const e = throwsWrite(() => db.prepare(`UPDATE runs SET ${l}_status = 'measured_detached' WHERE run_id='run-a'`).run());
    assert.ok(e, `${l}_status yazımı reddedilmeliydi`);
    assert.match(e.message, /no such column/i);
  }
});

// ── W-22 / W-28: CHECK var, TRIGGER YOK. Trigger'ın kanıtı W-24'tür; bu ikisi
//    CHECK'in TEK BAŞINA yetmediğini gösteren SINIR vakalarıdır. ──

/** Build a scratch table carrying the same CHECK grammar but NO coupling
 *  trigger, so the two layers can be told apart. */
function checkOnlyTable(t) {
  const db = track(new Database(':memory:'));
  t.after(() => { try { db.close(); } catch { /* closed */ } });
  const ok = ALL_STATUSES.filter((s) => s !== 'measured' && s !== 'measured_detached')
    .map((s) => `'${s}'`).join(',');
  db.exec(`
    CREATE TABLE runs (
      run_id TEXT PRIMARY KEY,
      status TEXT,
      git_base_sha TEXT,
      git_base_sha_status TEXT NOT NULL DEFAULT 'never_measured' CHECK (
        (git_base_sha_status = 'measured' AND git_base_sha IS NOT NULL AND git_base_sha <> '')
        OR (git_base_sha_status IN (${ok}) AND git_base_sha IS NULL)
      )
    );
  `);
  db.prepare(`INSERT INTO runs (run_id, status, git_base_sha_status, git_base_sha) VALUES (?,?,?,?)`)
    .run('r1', 'running', 'measured', 'abc123');
  return db;
}

test('W-22 · SINIR: geçerli son hale düşen değer-tek UPDATE CHECK tarafından YAKALANMAZ', (t) => {
  const db = checkOnlyTable(t);
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha='def456' WHERE run_id='r1'`).run());
  assert.equal(e, null, 'CHECK tek başına bunu yakalayamaz — reddedilmesi BEKLENMEZ');
  const r = db.prepare('SELECT git_base_sha_status s, git_base_sha v FROM runs WHERE run_id=?').get('r1');
  assert.equal(r.s, 'measured');
  assert.equal(r.v, 'def456');
});

test('W-28 · POZITIF KONTROL: trigger KURULMAMIŞ tabloda aynı ayrık UPDATE geçer', (t) => {
  const db = checkOnlyTable(t);
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha='def456' WHERE run_id='r1'`).run());
  assert.equal(e, null, 'trigger yokken ayrık UPDATE geçmeli');
});

// ── W-23..W-27: CHECK + TRIGGER kurulu ÜRETİM şeması üzerinde ──

function rowWithMeasured(db, id) {
  db.prepare(`INSERT INTO runs (run_id, agent_id, started_at, status, git_base_sha_status, git_base_sha)
              VALUES (?,?,?,?,?,?)`).run(id, 'a', 1, 'running', 'measured', 'abc123');
}

test('W-23 · trigger: durum-tek UPDATE reddedilir', (t) => {
  const db = writable(t);
  rowWithMeasured(db, 'w23');
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha_status='failed(timeout)' WHERE run_id='w23'`).run());
  assert.ok(e, 'durum-tek UPDATE reddedilmeliydi');
});

test('W-24 · trigger: değer-tek UPDATE reddedilir (sonuç satırı Invaryant A\'ya GEÇERLİ)', (t) => {
  const db = writable(t);
  rowWithMeasured(db, 'w24');
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha='def456' WHERE run_id='w24'`).run());
  assert.ok(e, 'değer-tek UPDATE reddedilmeliydi — bu trigger katmanının BELİRLEYİCİ kanıtıdır');
});

test('W-25 · trigger: ikisini birlikte değiştiren meşru UPDATE geçer (iki yön)', (t) => {
  const db = writable(t);
  rowWithMeasured(db, 'w25');
  const fwd = throwsWrite(() => db.prepare(
    `UPDATE runs SET git_base_sha_status='failed(timeout)', git_base_sha=NULL WHERE run_id='w25'`).run());
  assert.equal(fwd, null, 'measured→failed birlikte geçmeliydi');
  const back = throwsWrite(() => db.prepare(
    `UPDATE runs SET git_base_sha_status='measured', git_base_sha='abc123' WHERE run_id='w25'`).run());
  assert.equal(back, null, 'failed→measured birlikte geçmeliydi');
});

test('W-26 · trigger: ilgisiz sütun güncellemesi geçer', (t) => {
  const db = writable(t);
  rowWithMeasured(db, 'w26');
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET status='paused' WHERE run_id='w26'`).run());
  assert.equal(e, null, 'provenance sütunlarına dokunmayan UPDATE geçmeliydi');
});

test('W-27 · YENİDEN SINIFLANDIRMA: failed(timeout) → failed(not-a-repo) reddedilir', (t) => {
  const db = writable(t);
  db.prepare(`INSERT INTO runs (run_id, agent_id, started_at, status, git_base_sha_status, git_base_sha)
              VALUES (?,?,?,?,?,?)`).run('w27', 'a', 1, 'running', 'failed(timeout)', null);
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha_status='failed(not-a-repo)' WHERE run_id='w27'`).run());
  assert.ok(e, 'yeniden sınıflandırma reddedilmeliydi');
});

test('W-09 · durumu değiştirip değeri değiştirmeyen UPDATE reddedilir', (t) => {
  const db = writable(t);
  rowWithMeasured(db, 'w09');
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha_status='failed(timeout)' WHERE run_id='w09'`).run());
  assert.ok(e, 'reddedilmeliydi');
});

test('W-10 · değeri değiştirip durumu değiştirmeyen UPDATE reddedilir', (t) => {
  const db = writable(t);
  db.prepare(`INSERT INTO runs (run_id, agent_id, started_at, status, git_base_sha_status, git_base_sha)
              VALUES (?,?,?,?,?,?)`).run('w10', 'a', 1, 'running', 'failed(timeout)', null);
  const e = throwsWrite(() => db.prepare(`UPDATE runs SET git_base_sha='abc123' WHERE run_id='w10'`).run());
  assert.ok(e, 'reddedilmeliydi');
});

// ───────────────────── GRUP F — provenance_complete ─────────────────────

test('F-12 · provenance_complete ELLE yazılamaz (üç yazma biçimi de reddedilir)', (t) => {
  const db = writable(t);
  const ins = throwsWrite(() => db.prepare(
    `INSERT INTO runs (run_id, agent_id, started_at, status, provenance_complete) VALUES (?,?,?,?,?)`)
    .run('f12a', 'a', 1, 'running', 1));
  assert.ok(ins, 'INSERT reddedilmeliydi');
  assert.match(ins.message, /cannot INSERT into generated column/i);

  const upd = throwsWrite(() => db.prepare(`UPDATE runs SET provenance_complete=1 WHERE run_id='run-a'`).run());
  assert.ok(upd, 'UPDATE reddedilmeliydi');
  assert.match(upd.message, /cannot UPDATE generated column/i);

  const rep = throwsWrite(() => db.prepare(
    `INSERT OR REPLACE INTO runs (run_id, agent_id, started_at, status, provenance_complete) VALUES (?,?,?,?,?)`)
    .run('f12b', 'a', 1, 'running', 1));
  assert.ok(rep, 'INSERT OR REPLACE reddedilmeliydi');
  assert.match(rep.message, /cannot INSERT into generated column/i);

  assert.equal(db.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('run-a').pc, 0);
});

test('F-06/F-07/F-08 · beş alan da BOZMAYAN durumdayken provenance_complete=true', (t) => {
  const db = writable(t);
  const sets = FIELDS.map((f) => `${f}_status='measured', ${f}='v-${f}'`).join(', ');
  db.prepare(`UPDATE runs SET ${sets} WHERE run_id='run-b'`).run();
  assert.equal(db.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('run-b').pc, 1);
});

test('F-01..F-05/F-09/F-10 · BOZAN her durum provenance_complete=false yapar', (t) => {
  const db = writable(t);
  const breaking = ALL_STATUSES.filter((s) => !NON_BREAKING.includes(s));
  for (const s of breaking) {
    const sets = FIELDS.map((f) => `${f}_status='measured', ${f}='v-${f}'`).join(', ');
    db.prepare(`UPDATE runs SET ${sets} WHERE run_id='run-b'`).run();
    assert.equal(db.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('run-b').pc, 1, 'ön koşul');
    db.prepare(`UPDATE runs SET git_toplevel_status=?, git_toplevel=NULL WHERE run_id='run-b'`).run(s);
    assert.equal(
      db.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('run-b').pc, 0,
      `${s} tamamlığı BOZMALIYDI`
    );
  }
});

test('F-01b · not_applicable(no-isolation) tamamlığı BOZMAZ', (t) => {
  const db = writable(t);
  const sets = FIELDS.map((f) => `${f}_status='measured', ${f}='v-${f}'`).join(', ');
  db.prepare(`UPDATE runs SET ${sets} WHERE run_id='run-b'`).run();
  db.prepare(`UPDATE runs SET git_worktree_path_status='not_applicable(no-isolation)', git_worktree_path=NULL WHERE run_id='run-b'`).run();
  assert.equal(db.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('run-b').pc, 1);
});

test('F-14 · ÇAKMA: mekanizma kaldırılınca F-12 DÜŞER, geri yüklenince GEÇER', (t) => {
  // (1) mekanizmasız şema: aynı ad, DÜZ sütun.
  const plain = track(new Database(':memory:'));
  t.after(() => { try { plain.close(); } catch { /* closed */ } });
  plain.exec(`CREATE TABLE runs (run_id TEXT PRIMARY KEY, provenance_complete INTEGER NOT NULL DEFAULT 0)`);
  plain.prepare('INSERT INTO runs (run_id) VALUES (?)').run('r1');
  const sabotaged = throwsWrite(() => plain.prepare(`UPDATE runs SET provenance_complete=1 WHERE run_id='r1'`).run());
  assert.equal(sabotaged, null, 'mekanizma yokken yazma GEÇMELİ — F-12 burada DÜŞER');
  assert.equal(plain.prepare('SELECT provenance_complete pc FROM runs WHERE run_id=?').get('r1').pc, 1,
    'mekanizma yokken bayrak elle beyazlatılabilmeli — F-12 DÜŞTÜ');

  // (2) mekanizma BİREBİR geri: üretim şemasının kendi DDL'i, sha256 ile.
  const fileA = v2Db(t);
  const { db: dbA } = migrated(t, fileA);
  const shaBefore = sha256(schemaText(dbA));

  const fileB = v2Db(t);
  const { db: dbB } = migrated(t, fileB);
  const shaAfter = sha256(schemaText(dbB));
  assert.equal(shaAfter, shaBefore, 'geri yüklenen şema BİREBİR aynı olmalı');

  // (3) F-12 tekrar geçer.
  const again = throwsWrite(() => dbB.prepare(`UPDATE runs SET provenance_complete=1 WHERE run_id='run-a'`).run());
  assert.ok(again, 'mekanizma geri gelince F-12 tekrar GEÇMELİ');
  assert.match(again.message, /cannot UPDATE generated column/i);
});
