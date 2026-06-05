import { Tray, Menu, app, nativeImage } from 'electron';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  focusMainWindow,
  toggleMiniPlayer,
  isMiniPlayerVisible,
  closeAllWindows,
} from './windowManager';
import { playerStateBus } from './playerState';

let tray: Tray | null = null;
let unsubscribe: (() => void) | null = null;

function loadTrayIcon(): Electron.NativeImage {
  const candidates = [
    join(__dirname, '../../resources/icon.png'),
    join(process.resourcesPath ?? '', 'icon.png'),
    join(__dirname, '../../build/icon.png'),
  ];
  for (const path of candidates) {
    if (existsSync(path)) {
      const img = nativeImage.createFromPath(path);
      if (!img.isEmpty()) {
        return img.resize({ width: 16, height: 16 });
      }
    }
  }
  try {
    const png = readFileSync(join(__dirname, '../../build/icon.png'));
    if (png.length > 0) {
      const img = nativeImage.createFromBuffer(png);
      if (!img.isEmpty()) return img.resize({ width: 16, height: 16 });
    }
  } catch {
    // ignore
  }
  return nativeImage.createEmpty();
}

function buildContextMenu(): Electron.Menu {
  const miniVisible = isMiniPlayerVisible();
  return Menu.buildFromTemplate([
    {
      label: 'Show main window',
      click: () => focusMainWindow(),
    },
    {
      label: miniVisible ? 'Hide mini-player' : 'Show mini-player',
      click: () => toggleMiniPlayer(),
    },
    { type: 'separator' },
    {
      label: 'Quit Harmonix',
      click: () => {
        closeAllWindows();
        app.quit();
      },
    },
  ]);
}

export function createTray(): Tray | null {
  if (tray && !tray.isDestroyed()) return tray;
  try {
    const icon = loadTrayIcon();
    if (icon.isEmpty()) {
      console.warn('[tray] No icon found, skipping tray creation');
      return null;
    }
    tray = new Tray(icon);
    tray.setToolTip('Harmonix');
    tray.setContextMenu(buildContextMenu());
    tray.on('click', () => focusMainWindow());
    tray.on('double-click', () => focusMainWindow());
    unsubscribe = playerStateBus.subscribe(() => {
      if (tray && !tray.isDestroyed()) {
        tray.setContextMenu(buildContextMenu());
      }
    });
    return tray;
  } catch (err) {
    console.warn('[tray] Failed to create tray:', err);
    return null;
  }
}

export function refreshTrayMenu(): void {
  if (!tray || tray.isDestroyed()) return;
  tray.setContextMenu(buildContextMenu());
}

export function destroyTray(): void {
  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
  if (tray && !tray.isDestroyed()) {
    tray.destroy();
  }
  tray = null;
}
