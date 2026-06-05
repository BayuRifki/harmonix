import { getDb, persist } from './database';

export interface PlaylistRow {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

export interface PlaylistTrackRef {
  position: number;
  source: string;
  source_id: string;
}

export interface PlaylistWithTracks extends PlaylistRow {
  tracks: PlaylistTrackRef[];
}

function now(): number {
  return Date.now();
}

export function listPlaylists(): PlaylistRow[] {
  const db = getDb();
  const result = db.exec('SELECT id, name, description, created_at, updated_at FROM playlists ORDER BY updated_at DESC');
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    id: Number(row[0]),
    name: String(row[1]),
    description: row[2] == null ? null : String(row[2]),
    created_at: Number(row[3]),
    updated_at: Number(row[4]),
  }));
}

export function getPlaylist(id: number): PlaylistWithTracks | null {
  const db = getDb();
  const header = db.exec(
    'SELECT id, name, description, created_at, updated_at FROM playlists WHERE id = ?',
    [id],
  );
  if (!header[0]?.values[0]) return null;
  const row = header[0].values[0];
  const tracks = getPlaylistTracks(id);
  return {
    id: Number(row[0]),
    name: String(row[1]),
    description: row[2] == null ? null : String(row[2]),
    created_at: Number(row[3]),
    updated_at: Number(row[4]),
    tracks,
  };
}

export function getPlaylistTracks(playlistId: number): PlaylistTrackRef[] {
  const db = getDb();
  const result = db.exec(
    'SELECT position, source, source_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    [playlistId],
  );
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    position: Number(row[0]),
    source: String(row[1]),
    source_id: String(row[2]),
  }));
}

export function createPlaylist(name: string, description?: string): number {
  const db = getDb();
  const t = now();
  db.run(
    'INSERT INTO playlists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name, description ?? null, t, t],
  );
  const result = db.exec('SELECT last_insert_rowid() as id');
  persist();
  return Number(result[0]?.values[0]?.[0] ?? 0);
}

export function renamePlaylist(id: number, name: string, description?: string): void {
  const db = getDb();
  db.run('UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?', [
    name,
    description ?? null,
    now(),
    id,
  ]);
  persist();
}

export function deletePlaylist(id: number): void {
  const db = getDb();
  db.run('DELETE FROM playlists WHERE id = ?', [id]);
  persist();
}

export function addTrackToPlaylist(
  playlistId: number,
  source: string,
  sourceId: string,
): number {
  const db = getDb();
  const last = db.exec(
    'SELECT COALESCE(MAX(position), -1) FROM playlist_tracks WHERE playlist_id = ?',
    [playlistId],
  );
  const nextPos = Number(last[0]?.values[0]?.[0] ?? -1) + 1;
  db.run(
    'INSERT INTO playlist_tracks (playlist_id, position, source, source_id) VALUES (?, ?, ?, ?)',
    [playlistId, nextPos, source, sourceId],
  );
  db.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
  persist();
  return nextPos;
}

export function removeTrackFromPlaylist(
  playlistId: number,
  position: number,
): void {
  const db = getDb();
  db.run('DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?', [
    playlistId,
    position,
  ]);
  db.run(
    'UPDATE playlist_tracks SET position = position - 1 WHERE playlist_id = ? AND position > ?',
    [playlistId, position],
  );
  db.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
  persist();
}

export function reorderPlaylistTracks(
  playlistId: number,
  fromIndex: number,
  toIndex: number,
): void {
  if (fromIndex === toIndex) return;
  const db = getDb();
  const items = db.exec(
    'SELECT position, source, source_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    [playlistId],
  );
  if (!items[0]) return;
  const list = items[0].values.map((row) => ({
    position: Number(row[0]),
    source: String(row[1]),
    source_id: String(row[2]),
  }));
  if (fromIndex < 0 || fromIndex >= list.length) return;
  if (toIndex < 0 || toIndex >= list.length) return;
  const [moved] = list.splice(fromIndex, 1);
  if (!moved) return;
  list.splice(toIndex, 0, moved);

  db.exec('BEGIN');
  try {
    const tempOffset = 100000;
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (!entry) continue;
      db.run(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND source = ? AND source_id = ? AND position = ?',
        [i + tempOffset, playlistId, entry.source, entry.source_id, entry.position],
      );
    }
    for (let i = 0; i < list.length; i++) {
      const entry = list[i];
      if (!entry) continue;
      db.run(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND source = ? AND source_id = ? AND position = ?',
        [i, playlistId, entry.source, entry.source_id, i + tempOffset],
      );
    }
    db.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  persist();
}

export function setPlaylistTracks(
  playlistId: number,
  tracks: Array<{ source: string; sourceId: string }>,
): void {
  const db = getDb();
  db.exec('BEGIN');
  try {
    db.run('DELETE FROM playlist_tracks WHERE playlist_id = ?', [playlistId]);
    const stmt = db.prepare(
      'INSERT INTO playlist_tracks (playlist_id, position, source, source_id) VALUES (?, ?, ?, ?)',
    );
    tracks.forEach((t, i) => {
      stmt.run([playlistId, i, t.source, t.sourceId]);
    });
    stmt.free?.();
    db.run('UPDATE playlists SET updated_at = ? WHERE id = ?', [now(), playlistId]);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  persist();
}

export function countPlaylistTracks(playlistId: number): number {
  const db = getDb();
  const result = db.exec('SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = ?', [
    playlistId,
  ]);
  return Number(result[0]?.values[0]?.[0] ?? 0);
}
