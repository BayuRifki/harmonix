import { app, BrowserWindow, shell, ipcMain, safeStorage } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { initDatabase, closeDatabase } from './db';
import { setElectronApp } from './auth/tokenStore';
import { setElectronAppForYtDlp } from './sources/ytmusic/ytdlp';
import {
  initializeAllSources,
  shutdownAllSources,
  registerSource,
} from './sources/registry';
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

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled promise rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

setElectronApp(app, safeStorage);
setElectronAppForYtDlp(app);

let mainWindow: BrowserWindow | null = null;

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.on('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    const candidates = [
      join(__dirname, '../../dist/index.html'),
      join(__dirname, '../renderer/index.html'),
      join(process.resourcesPath ?? '', 'app', 'dist', 'index.html'),
    ];
    const target = candidates.find((p) => existsSync(p));
    if (target) {
      mainWindow.loadFile(target);
    } else {
      console.error(
        '[main] Renderer index.html not found. Tried:',
        candidates,
        '__dirname=',
        __dirname,
        'appPath=',
        app.getAppPath(),
        'resourcesPath=',
        process.resourcesPath,
      );
      mainWindow.loadURL('data:text/html,<h1>Renderer not built. Run npm run build.</h1>');
    }
  }
}

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

app.whenReady().then(async () => {
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
    registerLibraryHandlers(() => mainWindow);
    registerSourceHandlers();
    registerAuthHandlers(() => mainWindow);
    registerYtMusicHandlers();
    registerPlaylistHandlers();
    registerEqualizerHandlers();
    registerMemoryHandlers();
  } catch (err) {
    console.error('[main] Failed to register IPC handlers:', err);
  }

  createMainWindow();
  setupAutoUpdater();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('before-quit', async () => {
  await shutdownAllSources();
  closeDatabase();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}
