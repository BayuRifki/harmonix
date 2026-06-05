import { getDb, persist } from './database';

export interface ScanFolder {
  id: number;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
}

export function addScanFolder(path: string): number {
  const db = getDb();
  const existing = db.exec('SELECT id FROM scan_folders WHERE path = ?', [path]);
  if (existing[0]?.values[0]) {
    return existing[0].values[0][0] as number;
  }
  db.run('INSERT INTO scan_folders (path, added_at) VALUES (?, ?)', [path, Date.now()]);
  const result = db.exec('SELECT last_insert_rowid() as id');
  persist();
  return Number(result[0]?.values[0]?.[0] ?? 0);
}

export function removeScanFolder(path: string): void {
  const db = getDb();
  db.run('DELETE FROM scan_folders WHERE path = ?', [path]);
  persist();
}

export function getScanFolders(): ScanFolder[] {
  const db = getDb();
  const result = db.exec('SELECT * FROM scan_folders ORDER BY added_at');
  if (!result[0]) return [];
  return result[0].values.map((row: unknown[]) => ({
    id: Number(row[0]),
    path: String(row[1]),
    added_at: Number(row[2]),
    last_scanned_at: row[3] == null ? null : Number(row[3]),
  }));
}

export function markFolderScanned(path: string): void {
  const db = getDb();
  db.run('UPDATE scan_folders SET last_scanned_at = ? WHERE path = ?', [Date.now(), path]);
  persist();
}
