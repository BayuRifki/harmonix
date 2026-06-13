import './env';
import { app, BrowserWindow, ipcMain, safeStorage } from 'electron';
import { initDatabase, closeDatabase } from './db';
import { setElectronApp } from './auth/tokenStore';
import { migrateTokenFiles } from './auth/tokenStore';
import { setElectronAppForYtDlp } from './sources/ytmusic/ytdlp';
import { initializeAllSources, shutdownAllSources, registerSource } from './sources/registry';
import { LocalSource } from './sources/local';
import { DemoSource } from './sources/demo';
import { SpotifySource } from './sources/spotify';
import { YouTubeMusicSource } from './sources/ytmusic';
import { DeezerSource } from './sources/deezer';
import { JamendoSource } from './sources/jamendo';
import { AudiusSource } from './sources/audius';
import { SoundCloudSource } from './sources/soundcloud';
import { registerLibraryHandlers } from './ipc/library';
import { registerSourceHandlers } from './ipc/sources';
import { registerAuthHandlers } from './ipc/auth';
import { registerYtMusicHandlers } from './ipc/ytmusic';
import { registerPlaylistHandlers } from './ipc/playlists';
import { registerEqualizerHandlers } from './ipc/equalizer';
import { registerMemoryHandlers } from './ipc/memory';
import { registerPlayerHandlers } from './ipc/player';
import { registerMiniPlayerHandlers } from './ipc/miniPlayer';
import {
  createMainWindow,
  closeAllWindows,
  getMainWindow,
  isMiniPlayerVisible,
  focusMainWindow,
  setQuitting,
} from './windowManager';
import { createSplashWindow, closeSplashWindow } from './splashWindow';
import { registerAudioProxyProtocol } from './audioProxy';
import { createTray, destroyTray } from './tray';
import { getSetting, setSetting } from './db/settingsRepository';

// V8 heap caps for the main process.
//
// The previous defaults (6144 MB old-space, 256 MB new-space) were
// tuned for a server workload — a music player doesn't need 6 GB of
// addressable heap, and an over-generous cap actively hurts RAM use
// because:
//   1. V8 reserves the cap from the OS at startup, even if it
//      never uses it (so the process RSS sits at 100-300 MB just
//      from the V8 cage, not from real allocations).
//   2. A bigger heap means longer GC pauses and a much larger
//      "to-space" for copying collections.
//
// 2048 MB old / 64 MB new is enough to comfortably hold the source
// registry, all source adapters' in-memory caches, the SQLite
// prepared-statement pool, the yt-dlp child process stdin buffer,
// and the audio proxy's stream registry, with headroom. If a
// deployment ever needs more, raise HARMONIX_MAX_HEAP_MB at launch.
const MAX_HEAP_MB = process.env.HARMONIX_MAX_HEAP_MB ?? '2048';
const MAX_SEMI_MB = process.env.HARMONIX_MAX_SEMI_MB ?? '64';
app.commandLine.appendSwitch(
  'js-flags',
  `--max-old-space-size=${MAX_HEAP_MB} --max-semi-space-size=${MAX_SEMI_MB}`,
);

let mainMemLogInterval: NodeJS.Timeout | null = null;

function logMemory(tag: string): void {
  const mu = process.memoryUsage();
  const rssMb = Math.round(mu.rss / 1024 / 1024);
  const heapUsedMb = Math.round(mu.heapUsed / 1024 / 1024);
  const heapTotalMb = Math.round(mu.heapTotal / 1024 / 1024);
  console.info(`[mem] ${tag} rss=${rssMb}MB heapUsed=${heapUsedMb}MB heapTotal=${heapTotalMb}MB`);
}

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

setElectronApp(app, safeStorage);
// Migrate any legacy `.bin` token files to the new `.bin.enc` /
// `.bin.plain` naming. Safe to call on every startup — it's a
// no-op when there's nothing to migrate.
migrateTokenFiles();
setElectronAppForYtDlp(app);

function registerBaseIpc(): void {
  ipcMain.handle('app:get-version', () => {
    return process.env.npm_package_version ?? '0.0.1';
  });

  ipcMain.handle('app:get-platform', () => {
    return process.platform;
  });
}

function setupAutoUpdater(): void {
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) return;

  import('electron-updater')
    .then(({ autoUpdater }) => {
      autoUpdater.logger = console;
      autoUpdater.autoDownload = true;
      autoUpdater.autoInstallOnAppQuit = true;

      autoUpdater.on('update-available', (info) => {
        console.info('[updater] Update available:', info.version);
      });
      autoUpdater.on('update-downloaded', (info) => {
        console.info('[updater] Update downloaded:', info.version);
      });
      autoUpdater.on('error', (err) => {
        console.error('[updater] Error:', err);
      });

      void autoUpdater.checkForUpdatesAndNotify();
    })
    .catch((err) => {
      console.warn('[updater] electron-updater not available:', err);
    });
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    logMemory('startup');

    try {
      await initDatabase();
    } catch (err) {
      console.error('[main] Failed to initialize database:', err);
    }

    try {
      registerSource(new LocalSource());
      registerSource(new DemoSource());
      const spotifyConfig = {
        clientId: process.env.SPOTIFY_CLIENT_ID ?? '',
        redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? 'http://127.0.0.1:8888/callback',
      };
      registerSource(new SpotifySource(spotifyConfig));
      const ytSource = new YouTubeMusicSource();
      registerSource(ytSource);
      registerSource(new DeezerSource());
      registerSource(
        new JamendoSource({
          clientId: process.env.JAMENDO_CLIENT_ID ?? '709fa152',
        }),
      );
      registerSource(
        new AudiusSource({
          host: process.env.AUDIUS_HOST,
        }),
      );
      registerSource(
        new SoundCloudSource({
          clientId: process.env.SOUNDCLOUD_CLIENT_ID,
          clientSecret: process.env.SOUNDCLOUD_CLIENT_SECRET,
        }),
      );
      await initializeAllSources();
    } catch (err) {
      console.error('[main] Failed to initialize sources:', err);
    }

    try {
      registerBaseIpc();
      registerLibraryHandlers(getMainWindow);
      registerSourceHandlers();
      registerAuthHandlers(getMainWindow);
      registerYtMusicHandlers();
      registerPlaylistHandlers();
      registerEqualizerHandlers();
      registerMemoryHandlers();
      registerPlayerHandlers();
      registerMiniPlayerHandlers();
    } catch (err) {
      console.error('[main] Failed to register IPC handlers:', err);
    }

    createSplashWindow();
    const mainWin = createMainWindow();
    mainWin.once('ready-to-show', () => {
      closeSplashWindow();
    });
    registerAudioProxyProtocol();
    setupAutoUpdater();
    createTray();

    logMemory('after-init');

    mainMemLogInterval = setInterval(() => logMemory('tick'), 60_000);

    app.on('second-instance', () => {
      focusMainWindow();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      } else {
        focusMainWindow();
      }
    });
  });
}

app.on('before-quit', () => {
  setQuitting(true);
  setSetting('window.miniPlayer.alwaysOnTop', isMiniPlayerVisible() ? 'true' : 'false');
  if (mainMemLogInterval) {
    clearInterval(mainMemLogInterval);
    mainMemLogInterval = null;
  }
  destroyTray();
  void shutdownAllSources().finally(() => {
    closeDatabase();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin' && getSetting('window.miniPlayer.alwaysOnTop') !== 'true') {
    app.quit();
  }
});

process.on('exit', () => {
  closeAllWindows();
});

export { getMainWindow };
