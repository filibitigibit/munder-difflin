/**
 * The canonical Run primitive and the append-only Event Store (Mission Control
 * Phase 1A).
 *
 * WHY THIS EXISTS. Munder already records a great deal — hive/log.jsonl,
 * cost-ledger.jsonl, registry.json, tasks.json, memory.md — but every one of
 * those lives under HIVE_ROOT, which is handed to each agent in its environment.
 * The record of what happened is therefore writable by the thing that did it,
 * and `commit()` sweeps agent edits into the hive repo with `git add -A`. That
 * is fine for coordination state and useless as evidence. So the canonical
 * telemetry lives HERE: in the main-process-owned SQLite DB under userData,
 * outside HIVE_ROOT, appended by main and nobody else.
 *
 * THE SECOND THING THIS FIXES is the execution boundary. An agent id survives a
 * restart (`jim-mtn68dqy` is minted once and persisted), a Claude session id is
 * a single slot that gets overwritten, and a PTY id is deliberately reused on
 * restore. None of them can answer "which attempt was this". A Run can: every
 * attempt gets an id that is never reused, and resuming a paused run mints a NEW
 * run linked back by `continuation_of_run_id`. A laptop closed at the office and
 * reopened at home is then two runs with a visible seam, not one run with an
 * unexplained gap.
 *
 * SCOPE DISCIPLINE. This module observes; it never acts. It has no filesystem,
 * git, PTY or Electron surface — a pause writes rows, and CANNOT remove a
 * worktree, discard an untracked file, force a commit or archive an agent, no
 * matter what a caller asks for. That is enforced structurally (nothing to
 * import) and guarded by a test.
 *
 * WHAT IS NOT KNOWN STAYS NULL. Every git/session field is nullable and is
 * written as NULL when the caller has nothing real to give. There is no
 * "unknown" sentinel and no inferred value: a missing SHA must read as missing,
 * because a telemetry store that guesses is worse than one that admits a gap.
 */
import type BetterSqlite3 from 'better-sqlite3';
import { createHash, randomBytes } from 'node:crypto';

/** The canonical run lifecycle. Nothing outside this set is ever stored. */
export const RUN_STATUSES = [
  'queued', 'running', 'paused', 'resuming',
  'completed', 'failed', 'cancelled', 'interrupted'
] as const;

export type RunStatus = (typeof RUN_STATUSES)[number];

/** Runs that are finished for good. A terminal run is immutable: it is the
 *  historical fact that an attempt ended, and re-opening one would make the log
 *  a mutable narrative rather than a record. A restart makes a NEW run. */
export const TERMINAL_STATUSES: readonly RunStatus[] = ['completed', 'failed', 'cancelled', 'interrupted'];

/**
 * The legal state machine, as one table so it can be read and tested rather than
 * inferred from scattered `if`s.
 *
 * `paused → resuming` is legal, but the resume PATH does not use it: resuming a
 * paused run mints a new run that STARTS in `resuming`, and the paused run is
 * never touched again (see {@link RunStore.resume}). `paused → running` is
 * deliberately absent — that is the transition that would erase the boundary.
 */
export const TRANSITIONS: Readonly<Record<RunStatus, readonly RunStatus[]>> = Object.freeze({
  queued: ['running', 'cancelled', 'failed'],
  running: ['paused', 'completed', 'failed', 'cancelled', 'interrupted'],
  paused: ['resuming', 'cancelled', 'failed'],
  resuming: ['running', 'completed', 'failed', 'cancelled', 'interrupted'],
  completed: [],
  failed: [],
  cancelled: [],
  interrupted: []
});

/** Statuses a run may be CREATED in. `resuming` is here because a continuation
 *  run is born mid-lifecycle; the rest of the machine is entered by transition. */
const CREATABLE: readonly RunStatus[] = ['queued', 'running', 'resuming'];

export function isRunStatus(v: unknown): v is RunStatus {
  return typeof v === 'string' && (RUN_STATUSES as readonly string[]).includes(v);
}

/** Fail-closed: anything not explicitly allowed is refused. */
export function isValidTransition(from: unknown, to: unknown): boolean {
  if (!isRunStatus(from) || !isRunStatus(to)) return false;
  return TRANSITIONS[from].includes(to);
}

/** The chain's anchor. A first event whose prev_hash is anything else is a
 *  truncated log — i.e. someone removed the beginning. */
export const GENESIS_HASH = '0'.repeat(64);

export interface RunRow {
  run_id: string;
  parent_run_id: string | null;
  continuation_of_run_id: string | null;
  task_id: string | null;
  agent_id: string;
  session_id: string | null;
  started_at: number;
  ended_at: number | null;
  status: RunStatus;
  provider: string | null;
  model: string | null;
  base_sha: string | null;
  branch: string | null;
  worktree_path: string | null;
  pause_reason: string | null;
  paused_at: number | null;
  checkpoint_event_seq: number | null;
  checkpoint_sha: string | null;
  checkpoint_dirty_state: string | null;
  exit_code: number | null;
}

export interface EventRow {
  seq: number;
  event_id: string;
  run_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  event_type: string;
  ts: number;
  payload_json: string;
  prev_hash: string;
  event_hash: string;
}

export interface CreateRunInput {
  agentId: string;
  /** Supply only to pin an id (tests, replay). Reuse is refused by the PK. */
  runId?: string;
  status?: RunStatus;
  parentRunId?: string | null;
  continuationOfRunId?: string | null;
  taskId?: string | null;
  sessionId?: string | null;
  provider?: string | null;
  model?: string | null;
  baseSha?: string | null;
  branch?: string | null;
  worktreePath?: string | null;
}

/** What a safe pause managed to observe. Every field is optional, and an absent
 *  one is stored as NULL — a checkpoint that could not read the SHA says so. */
export interface Checkpoint {
  sha?: string | null;
  branch?: string | null;
  worktreePath?: string | null;
  dirtyState?: string | null;
  sessionId?: string | null;
}

export interface AppendEventInput {
  eventType: string;
  eventId?: string;
  runId?: string | null;
  taskId?: string | null;
  agentId?: string | null;
  payload?: unknown;
}

export interface RunStoreOptions {
  /** Timestamp source. Injected so tests are deterministic; callers never get to
   *  supply a time — a record whose clock the writer controls is not evidence. */
  now?: () => number;
  /** Id source, for deterministic tests. */
  newId?: (prefix: string) => string;
}

export type ChainVerdict = { ok: true } | { ok: false; brokenAtSeq: number; reason: string };

/**
 * Deterministic JSON: object keys sorted at every depth, `undefined` dropped, so
 * two structurally equal payloads always hash identically. Without this the hash
 * chain would depend on property insertion order and a re-serialized payload
 * would read as tampered.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== 'object') return value === undefined ? null : value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(value as Record<string, unknown>).sort()) {
    const v = (value as Record<string, unknown>)[key];
    if (v !== undefined) out[key] = canonicalize(v);
  }
  return out;
}

/** The hash an event's contents must produce. Binds identity, ownership, type,
 *  time and payload to the previous link, so neither a field nor a position can
 *  be changed without breaking the chain. */
export function hashEvent(e: {
  event_id: string;
  run_id: string | null;
  task_id: string | null;
  agent_id: string | null;
  event_type: string;
  ts: number;
  payload_json: string;
  prev_hash: string;
}): string {
  return createHash('sha256').update(canonicalJson({
    event_id: e.event_id,
    run_id: e.run_id,
    task_id: e.task_id,
    agent_id: e.agent_id,
    event_type: e.event_type,
    ts: e.ts,
    payload: e.payload_json,
    prev_hash: e.prev_hash
  })).digest('hex');
}

/**
 * Create the run + event tables. Idempotent, so it is safe both as a migration
 * step and as a bare-DB bootstrap in tests.
 *
 * The two triggers are the point of the whole file: SQLite itself refuses UPDATE
 * and DELETE on `events`, so append-only is enforced by the database rather than
 * by the discipline of every future caller. `runs` stays mutable on purpose —
 * it is the current-state projection; the events are the history.
 */
export function applyRunSchema(db: BetterSqlite3.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS runs (
      run_id                 TEXT PRIMARY KEY,
      parent_run_id          TEXT,
      continuation_of_run_id TEXT,
      task_id                TEXT,
      agent_id               TEXT NOT NULL,
      session_id             TEXT,
      started_at             INTEGER NOT NULL,
      ended_at               INTEGER,
      status                 TEXT NOT NULL,
      provider               TEXT,
      model                  TEXT,
      base_sha               TEXT,
      branch                 TEXT,
      worktree_path          TEXT,
      pause_reason           TEXT,
      paused_at              INTEGER,
      checkpoint_event_seq   INTEGER,
      checkpoint_sha         TEXT,
      checkpoint_dirty_state TEXT,
      exit_code              INTEGER
    );
    CREATE INDEX IF NOT EXISTS idx_runs_agent   ON runs(agent_id, started_at DESC);
    CREATE INDEX IF NOT EXISTS idx_runs_status  ON runs(status);
    CREATE INDEX IF NOT EXISTS idx_runs_parent  ON runs(parent_run_id);

    CREATE TABLE IF NOT EXISTS events (
      seq          INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id     TEXT NOT NULL UNIQUE,
      run_id       TEXT,
      task_id      TEXT,
      agent_id     TEXT,
      event_type   TEXT NOT NULL,
      ts           INTEGER NOT NULL,
      payload_json TEXT NOT NULL,
      prev_hash    TEXT NOT NULL,
      event_hash   TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_events_run  ON events(run_id, seq);
    CREATE INDEX IF NOT EXISTS idx_events_type ON events(event_type, seq);

    CREATE TRIGGER IF NOT EXISTS events_no_update BEFORE UPDATE ON events
    BEGIN SELECT RAISE(ABORT, 'events is append-only'); END;
    CREATE TRIGGER IF NOT EXISTS events_no_delete BEFORE DELETE ON events
    BEGIN SELECT RAISE(ABORT, 'events is append-only'); END;
  `);
}

/** Normalize "not supplied" and "explicitly unknown" to the same NULL. */
function orNull<T>(v: T | null | undefined): T | null {
  return v === undefined ? null : v;
}

export class RunStore {
  private readonly now: () => number;
  private readonly newId: (prefix: string) => string;

  constructor(private readonly db: BetterSqlite3.Database, opts: RunStoreOptions = {}) {
    this.now = opts.now ?? (() => Date.now());
    this.newId = opts.newId ?? ((prefix) => `${prefix}-${Date.now().toString(36)}-${randomBytes(6).toString('hex')}`);
  }

  // ─── runs ──────────────────────────────────────────────────────────────────

  /**
   * Mint a run. `run.created` is always recorded; a run born directly in
   * `running` also records `run.started`, so the event log never has a run that
   * is running without having started.
   */
  createRun(input: CreateRunInput): RunRow {
    const status = input.status ?? 'queued';
    if (!isRunStatus(status) || !CREATABLE.includes(status)) {
      throw new Error(`unknown status: a run cannot be created as "${String(status)}"`);
    }
    if (!input.agentId) throw new Error('createRun requires an agentId');

    const runId = input.runId ?? this.newId('run');
    const ts = this.now();

    const tx = this.db.transaction(() => {
      if (this.getRun(runId)) throw new Error(`run ${runId} already exists — run ids are never reused`);
      this.db.prepare(`
        INSERT INTO runs (
          run_id, parent_run_id, continuation_of_run_id, task_id, agent_id, session_id,
          started_at, ended_at, status, provider, model, base_sha, branch, worktree_path,
          pause_reason, paused_at, checkpoint_event_seq, checkpoint_sha, checkpoint_dirty_state, exit_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL)
      `).run(
        runId,
        orNull(input.parentRunId),
        orNull(input.continuationOfRunId),
        orNull(input.taskId),
        input.agentId,
        orNull(input.sessionId),
        ts,
        status,
        orNull(input.provider),
        orNull(input.model),
        orNull(input.baseSha),
        orNull(input.branch),
        orNull(input.worktreePath)
      );
      this.append({ eventType: 'run.created', runId, taskId: orNull(input.taskId), agentId: input.agentId, payload: { status } }, ts);
      if (status === 'running') {
        this.append({ eventType: 'run.started', runId, taskId: orNull(input.taskId), agentId: input.agentId, payload: {} }, ts);
      }
      return this.getRun(runId)!;
    });
    return tx();
  }

  getRun(runId: string): RunRow | null {
    return (this.db.prepare('SELECT * FROM runs WHERE run_id = ?').get(runId) as RunRow | undefined) ?? null;
  }

  /** Non-terminal runs — including PAUSED ones, which are open work, not history. */
  openRuns(): RunRow[] {
    return this.db.prepare(
      `SELECT * FROM runs WHERE status IN ('queued','running','paused','resuming') ORDER BY started_at ASC`
    ).all() as RunRow[];
  }

  /** Runs with a live terminal, i.e. the ones a safe pause has to checkpoint. */
  activeRuns(): RunRow[] {
    return this.db.prepare(
      `SELECT * FROM runs WHERE status IN ('queued','running','resuming') ORDER BY started_at ASC`
    ).all() as RunRow[];
  }

  /** The most recent paused run for an agent — what a restart continues FROM. */
  latestPausedRun(agentId: string): RunRow | null {
    return (this.db.prepare(
      `SELECT * FROM runs WHERE agent_id = ? AND status = 'paused'
       ORDER BY paused_at DESC, started_at DESC LIMIT 1`
    ).get(agentId) as RunRow | undefined) ?? null;
  }

  /**
   * Move a run to a new status, or refuse. Terminal statuses also stamp
   * `ended_at` and (when given) the exit code.
   */
  transition(runId: string, to: RunStatus, patch: { exitCode?: number | null } = {}): RunRow {
    const ts = this.now();
    const tx = this.db.transaction(() => {
      const run = this.getRun(runId);
      if (!run) throw new Error(`unknown run: ${runId}`);
      if (!isRunStatus(to)) throw new Error(`unknown status: ${String(to)}`);
      if (!isValidTransition(run.status, to)) {
        throw new Error(`invalid transition: ${run.status} → ${to} (run ${runId})`);
      }
      const terminal = TERMINAL_STATUSES.includes(to);
      this.db.prepare(
        `UPDATE runs SET status = ?, ended_at = ?, exit_code = ? WHERE run_id = ?`
      ).run(
        to,
        terminal ? ts : run.ended_at,
        patch.exitCode === undefined ? run.exit_code : orNull(patch.exitCode),
        runId
      );
      this.append({
        eventType: this.eventTypeFor(run.status, to),
        runId,
        taskId: run.task_id,
        agentId: run.agent_id,
        payload: { from: run.status, to, ...(patch.exitCode === undefined ? {} : { exitCode: patch.exitCode }) }
      }, ts);
      return this.getRun(runId)!;
    });
    return tx();
  }

  /** Entering `running` means different things depending on where you came from,
   *  and the log must say which: a fresh start or a continuation. */
  private eventTypeFor(from: RunStatus, to: RunStatus): string {
    if (to === 'running') return from === 'resuming' ? 'run.resumed' : 'run.started';
    return `run.${to}`;
  }

  /**
   * Safe pause: checkpoint what is observable and park the run.
   *
   * This writes rows and NOTHING else. It does not stop a process, remove a
   * worktree, discard untracked work, force a commit or archive an agent — the
   * module has no surface to do any of it. A paused run keeps `ended_at` NULL
   * because it has not ended.
   */
  pause(runId: string, opts: { reason?: string | null; checkpoint?: Checkpoint } = {}): RunRow {
    const ts = this.now();
    const cp = opts.checkpoint ?? {};
    const tx = this.db.transaction(() => {
      const run = this.getRun(runId);
      if (!run) throw new Error(`unknown run: ${runId}`);
      if (!isValidTransition(run.status, 'paused')) {
        throw new Error(`invalid transition: ${run.status} → paused (run ${runId})`);
      }
      // The checkpoint event is written FIRST so the run can point at its seq —
      // a checkpoint you cannot locate in the log is not a checkpoint.
      const checkpointEvent = this.append({
        eventType: 'checkpoint.created',
        runId,
        taskId: run.task_id,
        agentId: run.agent_id,
        payload: {
          sha: orNull(cp.sha),
          branch: orNull(cp.branch),
          worktreePath: orNull(cp.worktreePath ?? run.worktree_path),
          dirtyState: orNull(cp.dirtyState),
          sessionId: orNull(cp.sessionId ?? run.session_id)
        }
      }, ts);

      this.db.prepare(`
        UPDATE runs SET
          status = 'paused',
          pause_reason = ?,
          paused_at = ?,
          checkpoint_event_seq = ?,
          checkpoint_sha = ?,
          checkpoint_dirty_state = ?,
          branch = COALESCE(?, branch),
          worktree_path = COALESCE(?, worktree_path),
          session_id = COALESCE(?, session_id)
        WHERE run_id = ?
      `).run(
        orNull(opts.reason),
        ts,
        checkpointEvent.seq,
        orNull(cp.sha),
        orNull(cp.dirtyState),
        orNull(cp.branch),
        orNull(cp.worktreePath),
        orNull(cp.sessionId),
        runId
      );

      this.append({
        eventType: 'run.paused',
        runId,
        taskId: run.task_id,
        agentId: run.agent_id,
        payload: { reason: orNull(opts.reason), checkpointEventSeq: checkpointEvent.seq }
      }, ts);
      return this.getRun(runId)!;
    });
    return tx();
  }

  /**
   * Continue a paused run by minting a NEW one.
   *
   * The paused run is never modified — that is the whole point. The restart is a
   * real execution boundary, and it stays visible in the telemetry as two runs
   * joined by `continuation_of_run_id` rather than being smoothed away.
   */
  resume(pausedRunId: string, overrides: Partial<CreateRunInput> = {}): RunRow {
    const tx = this.db.transaction(() => {
      const old = this.getRun(pausedRunId);
      if (!old) throw new Error(`unknown run: ${pausedRunId}`);
      if (old.status !== 'paused') {
        throw new Error(`run ${pausedRunId} is not paused (status ${old.status}) — only a paused run can be resumed`);
      }
      this.append({
        eventType: 'run.resume_requested',
        runId: old.run_id,
        taskId: old.task_id,
        agentId: old.agent_id,
        payload: { pausedAt: old.paused_at, pauseReason: old.pause_reason }
      }, this.now());

      return this.createRun({
        agentId: overrides.agentId ?? old.agent_id,
        status: 'resuming',
        parentRunId: old.run_id,
        continuationOfRunId: old.run_id,
        taskId: overrides.taskId ?? old.task_id,
        sessionId: overrides.sessionId ?? old.session_id,
        provider: overrides.provider ?? old.provider,
        model: overrides.model ?? old.model,
        baseSha: overrides.baseSha ?? null,
        branch: overrides.branch ?? old.branch,
        worktreePath: overrides.worktreePath ?? old.worktree_path,
        runId: overrides.runId
      });
    });
    return tx();
  }

  // ─── events ────────────────────────────────────────────────────────────────

  /** Append one event. There is deliberately no update or delete counterpart. */
  appendEvent(input: AppendEventInput): EventRow {
    const ts = this.now();
    const tx = this.db.transaction(() => this.append(input, ts));
    return tx();
  }

  /** Inner append — assumes it is already inside a transaction. */
  private append(input: AppendEventInput, ts: number): EventRow {
    const eventId = input.eventId ?? this.newId('ev');
    const payload_json = canonicalJson(input.payload ?? {});
    const prev_hash = this.headHash();
    const row = {
      event_id: eventId,
      run_id: orNull(input.runId),
      task_id: orNull(input.taskId),
      agent_id: orNull(input.agentId),
      event_type: input.eventType,
      ts,
      payload_json,
      prev_hash
    };
    const event_hash = hashEvent(row);
    const res = this.db.prepare(`
      INSERT INTO events (event_id, run_id, task_id, agent_id, event_type, ts, payload_json, prev_hash, event_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      row.event_id, row.run_id, row.task_id, row.agent_id,
      row.event_type, row.ts, row.payload_json, row.prev_hash, event_hash
    );
    return { seq: Number(res.lastInsertRowid), ...row, event_hash };
  }

  /** The hash of the newest event, or the genesis anchor on an empty log. */
  headHash(): string {
    const row = this.db.prepare('SELECT event_hash FROM events ORDER BY seq DESC LIMIT 1').get() as
      { event_hash: string } | undefined;
    return row?.event_hash ?? GENESIS_HASH;
  }

  listEvents(opts: { runId?: string; eventType?: string; limit?: number } = {}): EventRow[] {
    const where: string[] = [];
    const args: unknown[] = [];
    if (opts.runId) { where.push('run_id = ?'); args.push(opts.runId); }
    if (opts.eventType) { where.push('event_type = ?'); args.push(opts.eventType); }
    const sql = `SELECT * FROM events ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY seq ASC`
      + (opts.limit ? ' LIMIT ?' : '');
    if (opts.limit) args.push(opts.limit);
    return this.db.prepare(sql).all(...args) as EventRow[];
  }

  /**
   * Walk the chain and report the first break.
   *
   * Catches all three shapes of tampering: a rewritten payload (the recomputed
   * hash stops matching), a forged hash (same check, from the other side), and a
   * spliced-out event (the next row's prev_hash no longer matches its
   * predecessor). It cannot PREVENT edits by someone holding the file — the
   * triggers do that for anything going through SQLite — but it makes them
   * impossible to hide.
   */
  verifyChain(): ChainVerdict {
    const rows = this.db.prepare('SELECT * FROM events ORDER BY seq ASC').all() as EventRow[];
    let expectedPrev = GENESIS_HASH;
    for (const row of rows) {
      if (row.prev_hash !== expectedPrev) {
        return { ok: false, brokenAtSeq: row.seq, reason: 'prev_hash does not match the preceding event' };
      }
      if (hashEvent(row) !== row.event_hash) {
        return { ok: false, brokenAtSeq: row.seq, reason: 'event_hash does not match the event contents' };
      }
      expectedPrev = row.event_hash;
    }
    return { ok: true };
  }
}
