import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { DbInstance } from '../../electron/main/db/database';
import { runMigrations } from '../../electron/main/db/migrations';

let db: Database.Database | null = null;
let repo: typeof import('../../electron/main/db/trackRepository') | null = null;
let setDbForTestFn: ((d: DbInstance | null) => void) | null = null;

beforeEach(async () => {
  db = new Database(':memory:');
  runMigrations(db);
  if (!setDbForTestFn) {
    const dbMod = await import('../../electron/main/db/database');
    setDbForTestFn = dbMod.__setDbForTest;
  }
  setDbForTestFn(db);
  repo = await import('../../electron/main/db/trackRepository');
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDbForTestFn?.(null);
});

function insertTrack(filePath: string, title: string): number {
  if (!db) throw new Error('db not initialized');
  const stmt = db.prepare('INSERT INTO tracks (file_path, title) VALUES (?, ?)');
  const result = stmt.run(filePath, title);
  return Number(result.lastInsertRowid);
}

function countTracks(): number {
  if (!db) throw new Error('db not initialized');
  const row = db.prepare('SELECT COUNT(*) AS c FROM tracks').get() as
    | { c: number | bigint }
    | undefined;
  return Number(row?.c ?? 0);
}

describe('trackRepository.deleteTracksNotIn', () => {
  it('refuses to delete anything when given an empty filePaths array (no wipeAll opt-in)', () => {
    if (!repo) throw new Error('not initialized');
    insertTrack('/a.mp3', 'A');
    insertTrack('/b.mp3', 'B');
    const deleted = repo.deleteTracksNotIn([]);
    expect(deleted).toBe(0);
    expect(countTracks()).toBe(2);
  });

  it('wipes the library only when wipeAll:true is explicitly passed', () => {
    if (!repo) throw new Error('not initialized');
    insertTrack('/a.mp3', 'A');
    insertTrack('/b.mp3', 'B');
    insertTrack('/c.mp3', 'C');
    const deleted = repo.deleteTracksNotIn([], { wipeAll: true });
    expect(deleted).toBe(3);
    expect(countTracks()).toBe(0);
  });

  it('keeps tracks whose file_paths are in the allow-list', () => {
    if (!repo) throw new Error('not initialized');
    insertTrack('/keep.mp3', 'Keep');
    insertTrack('/drop.mp3', 'Drop');
    repo.deleteTracksNotIn(['/keep.mp3']);
    expect(countTracks()).toBe(1);
    const remaining = db?.prepare('SELECT file_path FROM tracks').get() as
      | { file_path: string }
      | undefined;
    expect(remaining?.file_path).toBe('/keep.mp3');
  });
});
