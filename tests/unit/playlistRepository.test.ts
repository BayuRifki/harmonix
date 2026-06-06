import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import type { DbInstance } from '../../electron/main/db/database';

let db: Database.Database | null = null;
let runMigrationsFn: ((d: DbInstance) => void) | null = null;
let repo: typeof import('../../electron/main/db/playlistRepository') | null = null;

let setDbForTestFn: ((d: DbInstance | null) => void) | null = null;

beforeEach(async () => {
  db = new Database(':memory:');
  runMigrationsFn = (await import('../../electron/main/db/migrations')).runMigrations;
  runMigrationsFn(db);
  if (!setDbForTestFn) {
    const dbMod = await import('../../electron/main/db/database');
    setDbForTestFn = dbMod.__setDbForTest;
  }
  setDbForTestFn(db);
  repo = await import('../../electron/main/db/playlistRepository');
});

afterEach(() => {
  if (db) {
    db.close();
    db = null;
  }
  setDbForTestFn?.(null);
});

describe('playlistRepository', () => {
  it('creates and lists a playlist', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('My Mix', 'Favorites');
    const lists = repo.listPlaylists();
    expect(lists).toHaveLength(1);
    expect(lists[0]?.id).toBe(id);
    expect(lists[0]?.name).toBe('My Mix');
    expect(lists[0]?.description).toBe('Favorites');
  });

  it('renames a playlist', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Old Name');
    repo.renamePlaylist(id, 'New Name', 'Updated');
    const pl = repo.getPlaylist(id);
    expect(pl?.name).toBe('New Name');
    expect(pl?.description).toBe('Updated');
  });

  it('deletes a playlist', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Trash');
    repo.deletePlaylist(id);
    expect(repo.listPlaylists()).toHaveLength(0);
  });

  it('adds tracks and assigns incrementing positions', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    const p1 = repo.addTrackToPlaylist(id, 'local', '1');
    const p2 = repo.addTrackToPlaylist(id, 'local', '2');
    const p3 = repo.addTrackToPlaylist(id, 'spotify', 'abc');
    expect(p1).toBe(0);
    expect(p2).toBe(1);
    expect(p3).toBe(2);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks).toHaveLength(3);
    expect(tracks[0]).toEqual({ position: 0, source: 'local', source_id: '1' });
    expect(tracks[2]?.source).toBe('spotify');
  });

  it('removes a track and shifts positions', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    repo.addTrackToPlaylist(id, 'local', 'a');
    repo.addTrackToPlaylist(id, 'local', 'b');
    repo.addTrackToPlaylist(id, 'local', 'c');
    repo.removeTrackFromPlaylist(id, 1);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.source_id).toBe('a');
    expect(tracks[1]?.source_id).toBe('c');
    expect(tracks[0]?.position).toBe(0);
    expect(tracks[1]?.position).toBe(1);
  });

  it('reorders tracks by moving an item forward', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    repo.addTrackToPlaylist(id, 'local', 'a');
    repo.addTrackToPlaylist(id, 'local', 'b');
    repo.addTrackToPlaylist(id, 'local', 'c');
    repo.reorderPlaylistTracks(id, 0, 2);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks.map((t) => t.source_id)).toEqual(['b', 'c', 'a']);
  });

  it('reorders tracks by moving an item backward', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    repo.addTrackToPlaylist(id, 'local', 'a');
    repo.addTrackToPlaylist(id, 'local', 'b');
    repo.addTrackToPlaylist(id, 'local', 'c');
    repo.reorderPlaylistTracks(id, 2, 0);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks.map((t) => t.source_id)).toEqual(['c', 'a', 'b']);
  });

  it('reorder with same index is a no-op', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    repo.addTrackToPlaylist(id, 'local', 'a');
    repo.addTrackToPlaylist(id, 'local', 'b');
    repo.reorderPlaylistTracks(id, 1, 1);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks.map((t) => t.source_id)).toEqual(['a', 'b']);
  });

  it('setPlaylistTracks replaces all tracks', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    repo.addTrackToPlaylist(id, 'local', 'a');
    repo.setPlaylistTracks(id, [
      { source: 'spotify', sourceId: 'x' },
      { source: 'ytmusic', sourceId: 'y' },
    ]);
    const tracks = repo.getPlaylistTracks(id);
    expect(tracks).toHaveLength(2);
    expect(tracks[0]?.source).toBe('spotify');
    expect(tracks[1]?.source).toBe('ytmusic');
  });

  it('countPlaylistTracks returns correct count', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Mix');
    expect(repo.countPlaylistTracks(id)).toBe(0);
    repo.addTrackToPlaylist(id, 'local', '1');
    repo.addTrackToPlaylist(id, 'local', '2');
    expect(repo.countPlaylistTracks(id)).toBe(2);
  });

  it('persists across read operations', () => {
    if (!repo) throw new Error('not initialized');
    const id = repo.createPlaylist('Persistent');
    repo.addTrackToPlaylist(id, 'spotify', 'track-1');
    const pl = repo.getPlaylist(id);
    expect(pl?.tracks).toHaveLength(1);
    expect(pl?.tracks[0]?.source).toBe('spotify');
  });
});
