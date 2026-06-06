import { ipcMain } from 'electron';
import { getSource } from '../sources/registry';
import { YouTubeMusicSource } from '../sources/ytmusic';
import { checkAndUpdateYtDlp, findYtDlp } from '../sources/ytmusic/ytdlp';

export function registerYtMusicHandlers(): void {
  ipcMain.handle('ytmusic:disclaimer-text', async () => {
    return YouTubeMusicSource.getDisclaimerText();
  });

  ipcMain.handle('ytmusic:requires-disclaimer', async () => {
    const src = getSource('ytmusic');
    if (!(src instanceof YouTubeMusicSource)) return true;
    return src.requiresDisclaimer();
  });

  ipcMain.handle('ytmusic:acknowledge-disclaimer', async () => {
    const src = getSource('ytmusic');
    if (!(src instanceof YouTubeMusicSource)) {
      throw new Error('YouTube Music source not registered');
    }
    src.acknowledgeDisclaimer();
    return { acknowledged: true };
  });

  ipcMain.handle('ytmusic:status', async () => {
    const src = getSource('ytmusic');
    if (!(src instanceof YouTubeMusicSource)) {
      return { ytdlpAvailable: false, version: null, error: 'Source not registered' };
    }
    const info = src.getYtDlpInfo() ?? (await findYtDlp());
    return {
      ytdlpAvailable: info.available,
      version: info.version,
      error: info.error,
    };
  });

  ipcMain.handle('ytmusic:check-update', async () => {
    return checkAndUpdateYtDlp();
  });
}
