import { getDb, persist } from './database';

export interface ScanFolder {
  id: number;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
}

export function addScanFolder(path: string): number {
  const db = getDb();
  const existing = db
    .prepare('SELECT id FROM scan_folders WHERE path = ?')
    .get(path) as { id: number } | undefined;
  if (existing) {
    return existing.id;
  }
  db.prepare('INSERT INTO scan_folders (path, added_at) VALUES (?, ?)').run(
    path,
    Date.now(),
  );
  const result = db.prepare('SELECT last_insert_rowid() as id').get() as
    | { id: number | bigint }
    | undefined;
  persist();
  return Number(result?.id ?? 0);
}

export function removeScanFolder(path: string): void {
  const db = getDb();
  db.prepare('DELETE FROM scan_folders WHERE path = ?').run(path);
  persist();
}

interface ScanFolderRow {
  id: number;
  path: string;
  added_at: number;
  last_scanned_at: number | null;
}

export function getScanFolders(): ScanFolder[] {
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM scan_folders ORDER BY added_at')
    .all() as ScanFolderRow[];
  return rows.map((row) => ({
    id: Number(row.id),
    path: String(row.path),
    added_at: Number(row.added_at),
    last_scanned_at: row.last_scanned_at == null ? null : Number(row.last_scanned_at),
  }));
}

export function markFolderScanned(path: string): void {
  const db = getDb();
  db.prepare('UPDATE scan_folders SET last_scanned_at = ? WHERE path = ?').run(
    Date.now(),
    path,
  );
  persist();
}
