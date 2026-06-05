import { getDb, persist } from './database';

export function getSetting(key: string): string | null {
  const db = getDb();
  const result = db.exec('SELECT value FROM settings WHERE key = ?', [key]);
  const v = result[0]?.values[0]?.[0];
  return v == null ? null : String(v);
}

export function setSetting(key: string, value: string): void {
  const db = getDb();
  db.run(
    `INSERT INTO settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [key, value],
  );
  persist();
}

export function deleteSetting(key: string): void {
  const db = getDb();
  db.run('DELETE FROM settings WHERE key = ?', [key]);
  persist();
}
