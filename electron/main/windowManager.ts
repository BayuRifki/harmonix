import { BrowserWindow, screen, app } from 'electron';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { clampToDisplayBounds } from './windowBounds';

let mainWindow: BrowserWindow | null = null;
let miniPlayerWindow: BrowserWindow | null = null;
let isQuitting = false;

const MINI_DEFAULT_WIDTH = 360;
const MINI_DEFAULT_HEIGHT = 120;
const MINI_MIN_HEIGHT = 80;
const MINI_MAX_HEIGHT = 400;

function loadRendererInto(win: BrowserWindow, isMini: boolean): void {
  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    const url = isMini ? `${devUrl}#/mini` : devUrl;
    void win.loadURL(url);
    return;
  }
  const candidates = [
    join(__dirname, '../../dist/index.html'),
    join(__dirname, '../renderer/index.html'),
    join(process.resourcesPath ?? '', 'app', 'dist', 'index.html'),
  ];
  const target = candidates.find((p) => existsSync(p));
  if (target) {
    void win.loadFile(target, isMini ? { hash: 'mini' } : undefined);
  } else {
    win.loadURL('data:text/html,<h1>Renderer not built. Run npm run build.</h1>');
  }
}

export function createMainWindow(): BrowserWindow {
  if (mainWindow && !mainWindow.isDestroyed()) {
    return mainWindow;
  }
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  loadRendererInto(mainWindow, false);
  return mainWindow;
}

export interface MiniPlayerCreateOptions {
  x?: number;
  y?: number;
  alwaysOnTop?: boolean;
}

export function createMiniPlayerWindow(options: MiniPlayerCreateOptions = {}): BrowserWindow {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return miniPlayerWindow;
  }

  const width = MINI_DEFAULT_WIDTH;
  const height = MINI_DEFAULT_HEIGHT;
  const primary = screen.getPrimaryDisplay().workArea;
  const bounds = clampToDisplayBounds(
    options.x ?? Math.round((primary.width - width) / 2) + primary.x,
    options.y ?? primary.y + primary.height - height - 24,
    width,
    height,
    primary,
  );

  miniPlayerWindow = new BrowserWindow({
    width,
    height,
    minHeight: MINI_MIN_HEIGHT,
    maxHeight: MINI_MAX_HEIGHT,
    resizable: true,
    movable: true,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0a',
    alwaysOnTop: options.alwaysOnTop ?? false,
    show: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.mjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  miniPlayerWindow.setBounds({ x: bounds.x, y: bounds.y, width, height });
  miniPlayerWindow.setAlwaysOnTop(options.alwaysOnTop ?? false, 'floating');

  miniPlayerWindow.on('ready-to-show', () => {
    miniPlayerWindow?.show();
  });

  miniPlayerWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      miniPlayerWindow?.hide();
    }
  });

  miniPlayerWindow.on('closed', () => {
    miniPlayerWindow = null;
  });

  loadRendererInto(miniPlayerWindow, true);
  return miniPlayerWindow;
}

export function showMiniPlayer(): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    if (!miniPlayerWindow.isVisible()) miniPlayerWindow.show();
    miniPlayerWindow.focus();
  } else {
    createMiniPlayerWindow();
  }
}

export function hideMiniPlayer(): void {
  if (miniPlayerWindow && !miniPlayerWindow.isDestroyed()) {
    miniPlayerWindow.hide();
  }
}

export function toggleMiniPlayer(): boolean {
  if (miniPlayerWindow && !miniPlayerWindow.isVisible()) {
    miniPlayerWindow.show();
    miniPlayerWindow.focus();
    return true;
  }
  if (miniPlayerWindow && miniPlayerWindow.isVisible()) {
    miniPlayerWindow.hide();
    return false;
  }
  createMiniPlayerWindow();
  return true;
}

export function isMiniPlayerVisible(): boolean {
  return Boolean(
    miniPlayerWindow && !miniPlayerWindow.isDestroyed() && miniPlayerWindow.isVisible(),
  );
}

export function getMiniPlayerBounds(): {
  x: number;
  y: number;
  width: number;
  height: number;
} | null {
  if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) return null;
  const b = miniPlayerWindow.getBounds();
  return { x: b.x, y: b.y, width: b.width, height: b.height };
}

export function setMiniPlayerAlwaysOnTop(value: boolean): void {
  if (!miniPlayerWindow || miniPlayerWindow.isDestroyed()) return;
  miniPlayerWindow.setAlwaysOnTop(value, 'floating');
}

export function focusMainWindow(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();
  mainWindow.show();
  mainWindow.focus();
}

export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

export function getMiniPlayerWindow(): BrowserWindow | null {
  return miniPlayerWindow;
}

export function setQuitting(value: boolean): void {
  isQuitting = value;
}

export function closeAllWindows(): void {
  isQuitting = true;
  for (const win of [mainWindow, miniPlayerWindow]) {
    if (win && !win.isDestroyed()) {
      win.close();
    }
  }
}

export function ensureSingleInstance(): void {
  const gotLock = app.requestSingleInstanceLock();
  if (!gotLock) {
    app.quit();
  }
}
