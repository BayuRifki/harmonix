import { app } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import DatabaseCtor from 'better-sqlite3';
import { runMigrations } from './migrations';

export type DbInstance = ReturnType<typeof DatabaseCtor>;

let db: DbInstance | null = null;
let testMode = false;
// When true, `persist()` is a no-op. This is set during bulk scans
// (the local-library walk inserts hundreds/thousands of rows in
// tight loop) so we only checkpoint to disk on the final batch —
// a per-batch WAL checkpoint is a synchronous fsync and was a major
// source of stutter during scans. Set by callers via
// `__withBatchedPersist()`.
let batchedPersist = false;

export function __setDbForTest(testDb: DbInstance | null): void {
  db = testDb;
  testMode = testDb !== null;
}

export function initDatabase(): DbInstance {
  if (db) return db;

  const dbPath = getDbPath();
  if (!existsSync(dbPath)) mkdirSync(dbPath, { recursive: true });
  const dbFile = join(dbPath, 'harmonix.db');

  db = new DatabaseCtor(dbFile);
  // WAL gives us crash-safe readers + a single writer with no
  // table-level locks. The downside is the WAL file can grow
  // unbounded; we checkpoint on demand (see `persist()`) and
  // rely on `wal_autocheckpoint` for the steady-state trim.
  db.pragma('journal_mode = WAL');
  // foreign_keys is per-connection in SQLite; we want ON for the
  // app's lifetime so cascade-deletes fire.
  db.pragma('foreign_keys = ON');
  // synchronous=NORMAL pairs with WAL: writes are still durable
  // across application crashes (just not power loss), and the
  // omitted fsync on every commit is the single biggest win for
  // scan throughput.
  db.pragma('synchronous = NORMAL');
  // 64 MB page cache. SQLite's default is ~2 MB which is far too
  // small for a library scan; with the default, the prepared
  // statements for `getAllTracks`/`searchTracks` get evicted under
  // memory pressure and re-prepared on every call.
  db.pragma('cache_size = -65536');
  // Memory-map the DB file up to 256 MB. For library databases
  // that fit in this range, reads bypass the page cache entirely
  // (saves a memcpy). For larger libraries the OS still pages
  // hot regions in; we just cap the address-space reservation.
  db.pragma('mmap_size = 268435456');
  // Store temp tables/indices in memory. We don't use either, so
  // this is essentially free.
  db.pragma('temp_store = MEMORY');
  // Trim the WAL automatically once it crosses 1k pages (~4 MB).
  // The default is 1000; with NORMAL + WAL that means a checkpoint
  // roughly every 4 MB of writes — good cadence for the renderer
  // polling for scan progress.
  db.pragma('wal_autocheckpoint = 1000');

  runMigrations(db);
  persist();

  return db;
}

export function getDb(): DbInstance {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

/**
 * Force a WAL checkpoint. We do this at:
 *   - end of a bulk operation (single fsync at the end, not per-row)
 *   - on app shutdown
 *   - once per scan-batch when *not* in batched-persist mode
 *
 * The "FULL" mode writes pages from the WAL back into the main DB
 * file, then truncates the WAL. This is the only way to bound the
 * WAL's disk usage between scans.
 */
export function persist(): void {
  if (!db) return;
  if (testMode) return;
  if (batchedPersist) return;
  void db.pragma('wal_checkpoint(FULL)');
}

/**
 * Run `fn` with WAL checkpoints suppressed. Used by the library
 * scanner to fold hundreds of inserts into a single final fsync
 * instead of one per batch. The pool is `try/finally`-wrapped
 * so an exception in the bulk work still triggers one final
 * checkpoint on the way out.
 */
export function __withBatchedPersist<T>(fn: () => T): T {
  const prev = batchedPersist;
  batchedPersist = true;
  try {
    return fn();
  } finally {
    batchedPersist = prev;
    persist();
  }
}

export function getDbPath(): string {
  return join(app.getPath('userData'), 'data');
}

export function closeDatabase(): void {
  if (db) {
    persist();
    db.close();
    db = null;
  }
}
