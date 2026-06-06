import { ipcMain } from 'electron';
import {
  listPlaylists,
  getPlaylist,
  createPlaylist,
  renamePlaylist,
  deletePlaylist,
  addTrackToPlaylist,
  removeTrackFromPlaylist,
  reorderPlaylistTracks,
  setPlaylistTracks,
  countPlaylistTracks,
  type PlaylistRow,
  type PlaylistWithTracks,
} from '../db/playlistRepository';
import { resolvePlaylistTracks, type ResolvedPlaylistTracks } from '../sources/playlistResolver';
import type { Track } from '../sources/types';

export interface PlaylistSummary extends PlaylistRow {
  trackCount: number;
}

export interface PlaylistDetail extends PlaylistWithTracks {
  resolved: Track[];
  unresolved: ResolvedPlaylistTracks['unresolved'];
}

export function registerPlaylistHandlers(): void {
  ipcMain.handle('playlists:list', async (): Promise<PlaylistSummary[]> => {
    const lists = listPlaylists();
    return lists.map((p) => ({ ...p, trackCount: countPlaylistTracks(p.id) }));
  });

  ipcMain.handle('playlists:get', async (_evt, id: number): Promise<PlaylistDetail | null> => {
    const playlist = getPlaylist(id);
    if (!playlist) return null;
    const { tracks, unresolved } = await resolvePlaylistTracks(playlist.tracks);
    return { ...playlist, resolved: tracks, unresolved };
  });

  ipcMain.handle(
    'playlists:create',
    async (_evt, payload: { name: string; description?: string }): Promise<{ id: number }> => {
      const id = createPlaylist(payload.name, payload.description);
      return { id };
    },
  );

  ipcMain.handle(
    'playlists:rename',
    async (
      _evt,
      payload: { id: number; name: string; description?: string },
    ): Promise<{ ok: true }> => {
      renamePlaylist(payload.id, payload.name, payload.description);
      return { ok: true };
    },
  );

  ipcMain.handle('playlists:delete', async (_evt, id: number): Promise<{ ok: true }> => {
    deletePlaylist(id);
    return { ok: true };
  });

  ipcMain.handle(
    'playlists:add-track',
    async (
      _evt,
      payload: { playlistId: number; source: string; sourceId: string },
    ): Promise<{ position: number }> => {
      const position = addTrackToPlaylist(payload.playlistId, payload.source, payload.sourceId);
      return { position };
    },
  );

  ipcMain.handle(
    'playlists:remove-track',
    async (_evt, payload: { playlistId: number; position: number }): Promise<{ ok: true }> => {
      removeTrackFromPlaylist(payload.playlistId, payload.position);
      return { ok: true };
    },
  );

  ipcMain.handle(
    'playlists:reorder',
    async (
      _evt,
      payload: { playlistId: number; from: number; to: number },
    ): Promise<{ ok: true }> => {
      reorderPlaylistTracks(payload.playlistId, payload.from, payload.to);
      return { ok: true };
    },
  );

  ipcMain.handle(
    'playlists:set-tracks',
    async (
      _evt,
      payload: { playlistId: number; tracks: Array<{ source: string; sourceId: string }> },
    ): Promise<{ ok: true }> => {
      setPlaylistTracks(payload.playlistId, payload.tracks);
      return { ok: true };
    },
  );
}
