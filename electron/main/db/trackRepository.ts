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

type TrackSelectRow = {
  [K in keyof TrackRow]: TrackRow[K] | null;
};

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
] as const;

function rowToTrack(row: TrackSelectRow): TrackRow {
  return {
    id: Number(row.id ?? 0),
    file_path: String(row.file_path ?? ''),
    title: row.title == null ? null : String(row.title),
    artist: row.artist == null ? null : String(row.artist),
    album: row.album == null ? null : String(row.album),
    album_artist: row.album_artist == null ? null : String(row.album_artist),
    genre: row.genre == null ? null : String(row.genre),
    year: row.year == null ? null : Number(row.year),
    track_number: row.track_number == null ? null : Number(row.track_number),
    disc_number: row.disc_number == null ? null : Number(row.disc_number),
    duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
    bitrate: row.bitrate == null ? null : Number(row.bitrate),
    sample_rate: row.sample_rate == null ? null : Number(row.sample_rate),
    channels: row.channels == null ? null : Number(row.channels),
    codec: row.codec == null ? null : String(row.codec),
    container: row.container == null ? null : String(row.container),
    file_size: row.file_size == null ? null : Number(row.file_size),
    file_mtime: row.file_mtime == null ? null : Number(row.file_mtime),
    artwork_path: row.artwork_path == null ? null : String(row.artwork_path),
    isrc: row.isrc == null ? null : String(row.isrc),
    added_at: row.added_at == null ? null : Number(row.added_at),
    last_played_at: row.last_played_at == null ? null : Number(row.last_played_at),
    play_count: Number(row.play_count ?? 0),
  };
}

const TRACK_FIELDS_NO_ID = [
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
] as const;

export function upsertTrack(track: TrackInsert, skipPersist = false): number {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM tracks WHERE file_path = ?').get(track.file_path) as
    | { id: number | bigint }
    | undefined;
  const now = Date.now();

  if (existing) {
    const id = Number(existing.id);
    db.prepare(
      `UPDATE tracks SET
        title = ?, artist = ?, album = ?, album_artist = ?, genre = ?, year = ?,
        track_number = ?, disc_number = ?, duration_ms = ?, bitrate = ?, sample_rate = ?,
        channels = ?, codec = ?, container = ?, file_size = ?, file_mtime = ?,
        artwork_path = ?, isrc = ?
      WHERE id = ?`,
    ).run(
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
    );
    if (!skipPersist) persist();
    return id;
  }

  const insertValues: (string | number | null)[] = [
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
  ];
  const placeholders = TRACK_FIELDS_NO_ID.map(() => '?').join(', ');
  const result = db
    .prepare(
      `INSERT INTO tracks (${TRACK_FIELDS_NO_ID.join(', ')}) VALUES (${placeholders}) RETURNING id`,
    )
    .get(...insertValues) as { id: number | bigint } | undefined;
  const id = Number(result?.id ?? 0);
  if (!skipPersist) persist();
  return id;
}

export function getAllTracks(limit = 500, offset = 0): TrackRow[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT ${TRACK_COLUMNS.join(', ')} FROM tracks ORDER BY title COLLATE NOCASE LIMIT ? OFFSET ?`,
    )
    .all(limit, offset) as TrackSelectRow[];
  return rows.map(rowToTrack);
}

export function getTrackById(id: number): TrackRow | null {
  const db = getDb();
  const row = db.prepare(`SELECT ${TRACK_COLUMNS.join(', ')} FROM tracks WHERE id = ?`).get(id) as
    | TrackSelectRow
    | undefined;
  return row ? rowToTrack(row) : null;
}

export function getTrackByPath(filePath: string): TrackRow | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${TRACK_COLUMNS.join(', ')} FROM tracks WHERE file_path = ?`)
    .get(filePath) as TrackSelectRow | undefined;
  return row ? rowToTrack(row) : null;
}

export function searchTracks(query: string, limit = 100): TrackRow[] {
  const db = getDb();
  const like = `%${query}%`;
  const rows = db
    .prepare(
      `SELECT ${TRACK_COLUMNS.join(', ')} FROM tracks
       WHERE title LIKE ? OR artist LIKE ? OR album LIKE ? OR genre LIKE ?
       ORDER BY title COLLATE NOCASE
       LIMIT ?`,
    )
    .all(like, like, like, like, limit) as TrackSelectRow[];
  return rows.map(rowToTrack);
}

export function getAlbums(): Array<{ title: string; artist: string; trackCount: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT album, COALESCE(album_artist, artist) as artist, COUNT(*) as cnt
       FROM tracks
       WHERE album IS NOT NULL
       GROUP BY album, COALESCE(album_artist, artist)
       ORDER BY album COLLATE NOCASE`,
    )
    .all() as Array<{ album: string | null; artist: string | null; cnt: number }>;
  return rows.map((row) => ({
    title: String(row.album ?? ''),
    artist: String(row.artist ?? ''),
    trackCount: Number(row.cnt ?? 0),
  }));
}

export function getArtists(): Array<{ name: string; trackCount: number }> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT COALESCE(album_artist, artist) as name, COUNT(*) as cnt
       FROM tracks
       WHERE COALESCE(album_artist, artist) IS NOT NULL
       GROUP BY COALESCE(album_artist, artist)
       ORDER BY name COLLATE NOCASE`,
    )
    .all() as Array<{ name: string | null; cnt: number }>;
  return rows.map((row) => ({
    name: String(row.name ?? ''),
    trackCount: Number(row.cnt ?? 0),
  }));
}

export function getTrackCount(): number {
  const db = getDb();
  const row = db.prepare('SELECT COUNT(*) AS c FROM tracks').get() as
    | { c: number | bigint }
    | undefined;
  return Number(row?.c ?? 0);
}

export function deleteTrack(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM tracks WHERE id = ?').run(id);
  persist();
}

export function deleteTracksNotIn(filePaths: string[]): number {
  const db = getDb();
  if (filePaths.length === 0) {
    const row = db.prepare('SELECT COUNT(*) AS c FROM tracks').get() as
      | { c: number | bigint }
      | undefined;
    const count = Number(row?.c ?? 0);
    db.prepare('DELETE FROM tracks').run();
    persist();
    return count;
  }
  const BATCH_SIZE = 500;
  for (let i = 0; i < filePaths.length; i += BATCH_SIZE) {
    const batch = filePaths.slice(i, i + BATCH_SIZE);
    const placeholders = batch.map(() => '?').join(',');
    db.prepare(`DELETE FROM tracks WHERE file_path NOT IN (${placeholders})`).run(...batch);
  }
  persist();
  return 0;
}
export function markPlayed(id: number): void {
  const db = getDb();
  db.prepare('UPDATE tracks SET last_played_at = ?, play_count = play_count + 1 WHERE id = ?').run(
    Date.now(),
    id,
  );
  persist();
}
