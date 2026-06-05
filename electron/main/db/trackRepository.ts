import type { QueryExecResult } from 'sql.js';
import { getDb, persist } from './database';

export interface TrackRow {
  id: number;
  file_path: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  album_artist: string | null;
  genre: string | null;
  year: number | null;
  track_number: number | null;
  disc_number: number | null;
  duration_ms: number | null;
  bitrate: number | null;
  sample_rate: number | null;
  channels: number | null;
  codec: string | null;
  container: string | null;
  file_size: number | null;
  file_mtime: number | null;
  artwork_path: string | null;
  isrc: string | null;
  added_at: number | null;
  last_played_at: number | null;
  play_count: number;
}

export interface TrackInsert {
  file_path: string;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  album_artist?: string | null;
  genre?: string | null;
  year?: number | null;
  track_number?: number | null;
  disc_number?: number | null;
  duration_ms?: number | null;
  bitrate?: number | null;
  sample_rate?: number | null;
  channels?: number | null;
  codec?: string | null;
  container?: string | null;
  file_size?: number | null;
  file_mtime?: number | null;
  artwork_path?: string | null;
  isrc?: string | null;
}

function toTrackRow(row: unknown[]): TrackRow {
  return {
    id: Number(row[0] ?? 0),
    file_path: String(row[1] ?? ''),
    title: row[2] == null ? null : String(row[2]),
    artist: row[3] == null ? null : String(row[3]),
    album: row[4] == null ? null : String(row[4]),
    album_artist: row[5] == null ? null : String(row[5]),
    genre: row[6] == null ? null : String(row[6]),
    year: row[7] == null ? null : Number(row[7]),
    track_number: row[8] == null ? null : Number(row[8]),
    disc_number: row[9] == null ? null : Number(row[9]),
    duration_ms: row[10] == null ? null : Number(row[10]),
    bitrate: row[11] == null ? null : Number(row[11]),
    sample_rate: row[12] == null ? null : Number(row[12]),
    channels: row[13] == null ? null : Number(row[13]),
    codec: row[14] == null ? null : String(row[14]),
    container: row[15] == null ? null : String(row[15]),
    file_size: row[16] == null ? null : Number(row[16]),
    file_mtime: row[17] == null ? null : Number(row[17]),
    artwork_path: row[18] == null ? null : String(row[18]),
    isrc: row[19] == null ? null : String(row[19]),
    added_at: row[20] == null ? null : Number(row[20]),
    last_played_at: row[21] == null ? null : Number(row[21]),
    play_count: Number(row[22] ?? 0),
  };
}

const TRACK_COLUMNS = [
  'id',
  'file_path',
  'title',
  'artist',
  'album',
  'album_artist',
  'genre',
  'year',
  'track_number',
  'disc_number',
  'duration_ms',
  'bitrate',
  'sample_rate',
  'channels',
  'codec',
  'container',
  'file_size',
  'file_mtime',
  'artwork_path',
  'isrc',
  'added_at',
  'last_played_at',
  'play_count',
];

export function upsertTrack(track: TrackInsert): number {
  const db = getDb();
  const existing = db.exec('SELECT id FROM tracks WHERE file_path = ?', [track.file_path]);
  const now = Date.now();

  if (existing[0]?.values[0]) {
    const id = existing[0].values[0][0] as number;
    db.run(
      `UPDATE tracks SET
        title = ?, artist = ?, album = ?, album_artist = ?, genre = ?, year = ?,
        track_number = ?, disc_number = ?, duration_ms = ?, bitrate = ?, sample_rate = ?,
        channels = ?, codec = ?, container = ?, file_size = ?, file_mtime = ?,
        artwork_path = ?, isrc = ?
      WHERE id = ?`,
      [
        track.title ?? null,
        track.artist ?? null,
        track.album ?? null,
        track.album_artist ?? null,
        track.genre ?? null,
        track.year ?? null,
        track.track_number ?? null,
        track.disc_number ?? null,
        track.duration_ms ?? null,
        track.bitrate ?? null,
        track.sample_rate ?? null,
        track.channels ?? null,
        track.codec ?? null,
        track.container ?? null,
        track.file_size ?? null,
        track.file_mtime ?? null,
        track.artwork_path ?? null,
        track.isrc ?? null,
        id,
      ],
    );
    persist();
    return id;
  }

  db.run(
    `INSERT INTO tracks (
      file_path, title, artist, album, album_artist, genre, year,
      track_number, disc_number, duration_ms, bitrate, sample_rate,
      channels, codec, container, file_size, file_mtime, artwork_path, isrc, added_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      track.file_path,
      track.title ?? null,
      track.artist ?? null,
      track.album ?? null,
      track.album_artist ?? null,
      track.genre ?? null,
      track.year ?? null,
      track.track_number ?? null,
      track.disc_number ?? null,
      track.duration_ms ?? null,
      track.bitrate ?? null,
      track.sample_rate ?? null,
      track.channels ?? null,
      track.codec ?? null,
      track.container ?? null,
      track.file_size ?? null,
      track.file_mtime ?? null,
      track.artwork_path ?? null,
      track.isrc ?? null,
      now,
    ],
  );
  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0]?.values[0]?.[0] as number;
  persist();
  return id;
}

function mapRows(result: QueryExecResult[]): TrackRow[] {
  if (!result[0]) return [];
  return result[0].values.map((row) => toTrackRow(row));
}

export function getAllTracks(limit = 500, offset = 0): TrackRow[] {
  const db = getDb();
  const result = db.exec(
    'SELECT * FROM tracks ORDER BY title COLLATE NOCASE LIMIT ? OFFSET ?',
    [limit, offset],
  );
  return mapRows(result);
}

export function getTrackById(id: number): TrackRow | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM tracks WHERE id = ?', [id]);
  const rows = mapRows(result);
  return rows[0] ?? null;
}

export function getTrackByPath(filePath: string): TrackRow | null {
  const db = getDb();
  const result = db.exec('SELECT * FROM tracks WHERE file_path = ?', [filePath]);
  const rows = mapRows(result);
  return rows[0] ?? null;
}

export function searchTracks(query: string, limit = 100): TrackRow[] {
  const db = getDb();
  const like = `%${query}%`;
  const result = db.exec(
    `SELECT * FROM tracks
     WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?
     ORDER BY title COLLATE NOCASE
     LIMIT ?`,
    [like, like, like, like, limit],
  );
  return mapRows(result);
}

export function getAlbums(): Array<{ title: string; artist: string; trackCount: number }> {
  const db = getDb();
  const result = db.exec(`
    SELECT album, COALESCE(album_artist, artist) as artist, COUNT(*) as cnt
    FROM tracks
    WHERE album IS NOT NULL
    GROUP BY album, COALESCE(album_artist, artist)
    ORDER BY album COLLATE NOCASE
  `);
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    title: String(row[0] ?? ''),
    artist: String(row[1] ?? ''),
    trackCount: Number(row[2] ?? 0),
  }));
}

export function getArtists(): Array<{ name: string; trackCount: number }> {
  const db = getDb();
  const result = db.exec(`
    SELECT COALESCE(album_artist, artist) as name, COUNT(*) as cnt
    FROM tracks
    WHERE COALESCE(album_artist, artist) IS NOT NULL
    GROUP BY COALESCE(album_artist, artist)
    ORDER BY name COLLATE NOCASE
  `);
  if (!result[0]) return [];
  return result[0].values.map((row) => ({
    name: String(row[0] ?? ''),
    trackCount: Number(row[1] ?? 0),
  }));
}

export function getTrackCount(): number {
  const db = getDb();
  const result = db.exec('SELECT COUNT(*) FROM tracks');
  return Number(result[0]?.values[0]?.[0] ?? 0);
}

export function deleteTrack(id: number): void {
  const db = getDb();
  db.run('DELETE FROM tracks WHERE id = ?', [id]);
  persist();
}

export function deleteTracksNotIn(filePaths: string[]): number {
  const db = getDb();
  if (filePaths.length === 0) {
    const result = db.exec('SELECT COUNT(*) FROM tracks');
    const count = Number(result[0]?.values[0]?.[0] ?? 0);
    db.run('DELETE FROM tracks');
    persist();
    return count;
  }
  const placeholders = filePaths.map(() => '?').join(',');
  db.run(`DELETE FROM tracks WHERE file_path NOT IN (${placeholders})`, filePaths);
  persist();
  return 0;
}

export function markPlayed(id: number): void {
  const db = getDb();
  db.run(
    'UPDATE tracks SET last_played_at = ?, play_count = play_count + 1 WHERE id = ?',
    [Date.now(), id],
  );
  persist();
}

export { TRACK_COLUMNS };
