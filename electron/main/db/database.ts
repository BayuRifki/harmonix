import { app } from 'electron';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import DatabaseCtor from 'better-sqlite3';
import { runMigrations } from './migrations';

export type DbInstance = ReturnType<typeof DatabaseCtor>;

let db: DbInstance | null = null;
let testMode = false;

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
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');

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

export function persist(): void {
  if (!db) return;
  if (testMode) return;
  void db.pragma('wal_checkpoint(FULL)');
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
