import { dialog, ipcMain, BrowserWindow } from 'electron';
import {
  getAllTracks,
  searchTracks,
  getTrackById,
  getTrackCount,
  getAlbums,
  getArtists,
  addScanFolder,
  removeScanFolder,
  getScanFolders,
} from '../db';
import { getSource } from '../sources/registry';
import type { LocalSource } from '../sources/local';
import { rowToTrack } from '../sources/rowToTrack';

function getLocalSource(): LocalSource {
  const src = getSource('local');
  if (!src) throw new Error('Local source not registered');
  return src as LocalSource;
}

export function registerLibraryHandlers(getMainWindow: () => BrowserWindow | null): void {
  ipcMain.handle('library:pick-folder', async () => {
    const win = getMainWindow();
    if (!win) return { canceled: true, folder: null };
    const result = await dialog.showOpenDialog(win, {
      title: 'Select Music Folder',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, folder: null };
    }
    const folder = result.filePaths[0];
    addScanFolder(folder);
    return { canceled: false, folder };
  });

  ipcMain.handle('library:scan', async (evt, folder: string) => {
    const local = getLocalSource();
    const sender = BrowserWindow.fromWebContents(evt.sender);
    const insertPromise = local.scanFolder(folder);
    void insertPromise.then((count) => {
      sender?.webContents.send('library:scan-complete', { folder, count });
    });
    return { folder, started: true };
  });

  ipcMain.handle('library:scan-progress', async () => {
    return getLocalSource().getLastProgress();
  });

  ipcMain.handle('library:remove-folder', async (_evt, folder: string) => {
    removeScanFolder(folder);
    return { removed: true };
  });

  ipcMain.handle('library:get-folders', async () => {
    return getScanFolders();
  });

  ipcMain.handle(
    'library:get-tracks',
    async (_evt, opts: { limit?: number; offset?: number; query?: string } = {}) => {
      const { limit = 500, offset = 0, query } = opts;
      const rows = query ? searchTracks(query, limit) : getAllTracks(limit, offset);
      return rows.map((r) => rowToTrack(r));
    },
  );

  ipcMain.handle('library:get-track', async (_evt, id: number | string) => {
    const numericId =
      typeof id === 'string' && id.startsWith('local:') ? Number(id.slice(6)) : Number(id);
    if (Number.isNaN(numericId)) return null;
    const row = getTrackById(numericId);
    return row ? rowToTrack(row) : null;
  });

  ipcMain.handle('library:get-albums', async () => {
    return getAlbums();
  });

  ipcMain.handle('library:get-artists', async () => {
    return getArtists();
  });

  ipcMain.handle('library:get-stats', async () => {
    return {
      trackCount: getTrackCount(),
      albumCount: getAlbums().length,
      artistCount: getArtists().length,
    };
  });

  ipcMain.handle('library:play-track', async (_evt, trackId: string) => {
    const track = await getLocalSource().getTrack(trackId);
    if (!track) throw new Error(`Track not found: ${trackId}`);
    return getLocalSource().getStreamUrl(track);
  });
}
