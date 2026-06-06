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

interface PlaylistHeaderRow {
  id: number;
  name: string;
  description: string | null;
  created_at: number;
  updated_at: number;
}

const SELECT_PLAYLIST_HEADER =
  'SELECT id, name, description, created_at, updated_at FROM playlists';

function rowToHeader(row: PlaylistHeaderRow): PlaylistRow {
  return {
    id: Number(row.id),
    name: String(row.name),
    description: row.description == null ? null : String(row.description),
    created_at: Number(row.created_at),
    updated_at: Number(row.updated_at),
  };
}

export function listPlaylists(): PlaylistRow[] {
  const db = getDb();
  const rows = db
    .prepare(SELECT_PLAYLIST_HEADER + ' ORDER BY updated_at DESC')
    .all() as PlaylistHeaderRow[];
  return rows.map(rowToHeader);
}

export function getPlaylist(id: number): PlaylistWithTracks | null {
  const db = getDb();
  const row = db.prepare(SELECT_PLAYLIST_HEADER + ' WHERE id = ?').get(id) as
    | PlaylistHeaderRow
    | undefined;
  if (!row) return null;
  return { ...rowToHeader(row), tracks: getPlaylistTracks(id) };
}

export function getPlaylistTracks(playlistId: number): PlaylistTrackRef[] {
  const db = getDb();
  const rows = db
    .prepare(
      'SELECT position, source, source_id FROM playlist_tracks WHERE playlist_id = ? ORDER BY position ASC',
    )
    .all(playlistId) as Array<{
    position: number;
    source: string;
    source_id: string;
  }>;
  return rows.map((row) => ({
    position: Number(row.position),
    source: String(row.source),
    source_id: String(row.source_id),
  }));
}

export function createPlaylist(name: string, description?: string): number {
  const db = getDb();
  const t = now();
  const result = db
    .prepare(
      'INSERT INTO playlists (name, description, created_at, updated_at) VALUES (?, ?, ?, ?) RETURNING id',
    )
    .get(name, description ?? null, t, t) as { id: number | bigint } | undefined;
  persist();
  return Number(result?.id ?? 0);
}

export function renamePlaylist(id: number, name: string, description?: string): void {
  const db = getDb();
  db.prepare('UPDATE playlists SET name = ?, description = ?, updated_at = ? WHERE id = ?').run(
    name,
    description ?? null,
    now(),
    id,
  );
  persist();
}

export function deletePlaylist(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  persist();
}

export function addTrackToPlaylist(
  playlistId: number,
  source: string,
  sourceId: string,
): number {
  const db = getDb();
  const last = db
    .prepare(
      'SELECT COALESCE(MAX(position), -1) AS max_pos FROM playlist_tracks WHERE playlist_id = ?',
    )
    .get(playlistId) as { max_pos: number } | undefined;
  const nextPos = (last?.max_pos ?? -1) + 1;
  db.prepare(
    'INSERT INTO playlist_tracks (playlist_id, position, source, source_id) VALUES (?, ?, ?, ?)',
  ).run(playlistId, nextPos, source, sourceId);
  db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
  persist();
  return nextPos;
}

export function removeTrackFromPlaylist(playlistId: number, position: number): void {
  const db = getDb();
  db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND position = ?').run(
    playlistId,
    position,
  );
  db.prepare(
    'UPDATE playlist_tracks SET position = position - 1 WHERE playlist_id = ? AND position > ?',
  ).run(playlistId, position);
  db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
  persist();
}

export function reorderPlaylistTracks(
  playlistId: number,
  fromIndex: number,
  toIndex: number,
): void {
  if (fromIndex === toIndex) return;
  const db = getDb();
  const items = getPlaylistTracks(playlistId);
  if (fromIndex < 0 || fromIndex >= items.length) return;
  if (toIndex < 0 || toIndex >= items.length) return;
  const moved = items[fromIndex];
  if (!moved) return;
  items.splice(fromIndex, 1);
  items.splice(toIndex, 0, moved);

  const tx = db.transaction(() => {
    const tempOffset = 100000;
    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      if (!entry) continue;
      db.prepare(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND source = ? AND source_id = ? AND position = ?',
      ).run(i + tempOffset, playlistId, entry.source, entry.source_id, entry.position);
    }
    for (let i = 0; i < items.length; i++) {
      const entry = items[i];
      if (!entry) continue;
      db.prepare(
        'UPDATE playlist_tracks SET position = ? WHERE playlist_id = ? AND source = ? AND source_id = ? AND position = ?',
      ).run(i, playlistId, entry.source, entry.source_id, i + tempOffset);
    }
    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
  });
  tx();
  persist();
}

export function setPlaylistTracks(
  playlistId: number,
  tracks: Array<{ source: string; sourceId: string }>,
): void {
  const db = getDb();
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(playlistId);
    const stmt = db.prepare(
      'INSERT INTO playlist_tracks (playlist_id, position, source, source_id) VALUES (?, ?, ?, ?)',
    );
    tracks.forEach((t, i) => {
      stmt.run(playlistId, i, t.source, t.sourceId);
    });
    db.prepare('UPDATE playlists SET updated_at = ? WHERE id = ?').run(now(), playlistId);
  });
  tx();
  persist();
}

export function countPlaylistTracks(playlistId: number): number {
  const db = getDb();
  const row = db
    .prepare('SELECT COUNT(*) AS c FROM playlist_tracks WHERE playlist_id = ?')
    .get(playlistId) as { c: number | bigint } | undefined;
  return Number(row?.c ?? 0);
}
