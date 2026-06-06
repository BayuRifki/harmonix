import type { DbInstance } from './database';

interface Migration {
  version: number;
  name: string;
  up: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    name: 'initial_schema',
    up: `
      CREATE TABLE IF NOT EXISTS schema_version (
        version INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        applied_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS tracks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        title TEXT,
        artist TEXT,
        album TEXT,
        album_artist TEXT,
        genre TEXT,
        year INTEGER,
        track_number INTEGER,
        disc_number INTEGER,
        duration_ms INTEGER,
        bitrate INTEGER,
        sample_rate INTEGER,
        channels INTEGER,
        codec TEXT,
        container TEXT,
        file_size INTEGER,
        file_mtime INTEGER,
        artwork_path TEXT,
        isrc TEXT,
        added_at INTEGER,
        last_played_at INTEGER,
        play_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_tracks_title ON tracks(title);
      CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
      CREATE INDEX IF NOT EXISTS idx_tracks_album ON tracks(album);
      CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);

      CREATE TABLE IF NOT EXISTS albums (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        album_artist TEXT NOT NULL,
        year INTEGER,
        artwork_path TEXT,
        track_count INTEGER DEFAULT 0,
        UNIQUE(title, album_artist)
      );

      CREATE INDEX IF NOT EXISTS idx_albums_artist ON albums(album_artist);

      CREATE TABLE IF NOT EXISTS artists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        track_count INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS scan_folders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        path TEXT UNIQUE NOT NULL,
        added_at INTEGER NOT NULL,
        last_scanned_at INTEGER
      );

      CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS playlist_tracks (
        playlist_id INTEGER NOT NULL,
        position INTEGER NOT NULL,
        source TEXT NOT NULL,
        source_id TEXT NOT NULL,
        PRIMARY KEY (playlist_id, position),
        FOREIGN KEY (playlist_id) REFERENCES playlists(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `,
  },
  {
    version: 2,
    name: 'eq_presets',
    up: `
      CREATE TABLE IF NOT EXISTS eq_presets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        gains TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `,
  },
];

export function runMigrations(db: DbInstance): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at INTEGER NOT NULL
    );
  `);

  const row = db
    .prepare('SELECT MAX(version) as v FROM schema_version')
    .get() as { v: number | null } | undefined;
  const currentVersion = row?.v ?? 0;
  const startFrom = currentVersion + 1;

  const tx = db.transaction((migration: Migration) => {
    db.exec(migration.up);
    db.prepare(
      'INSERT INTO schema_version (version, name, applied_at) VALUES (?, ?, ?)',
    ).run(migration.version, migration.name, Date.now());
    console.info(`[db] Applied migration ${migration.version}: ${migration.name}`);
  });

  for (const migration of migrations) {
    if (migration.version < startFrom) continue;
    try {
      tx(migration);
    } catch (err) {
      console.error(`[db] Migration ${migration.version} failed:`, err);
      throw err;
    }
  }
}
