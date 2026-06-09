import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import { getMiniPlayerWindow } from '../windowManager';
import {
  showMiniPlayer,
  hideMiniPlayer,
  toggleMiniPlayer,
  isMiniPlayerVisible,
  getMiniPlayerBounds,
  setMiniPlayerAlwaysOnTop,
  focusMainWindow,
} from '../windowManager';
import { getSetting, setSetting } from '../db/settingsRepository';

const ALWAYS_ON_TOP_KEY = 'window.miniPlayer.alwaysOnTop';
const X_KEY = 'window.miniPlayer.x';
const Y_KEY = 'window.miniPlayer.y';
const WIDTH_KEY = 'window.miniPlayer.width';
const HEIGHT_KEY = 'window.miniPlayer.height';

function readBool(key: string, fallback: boolean): boolean {
  const v = getSetting(key);
  if (v === null) return fallback;
  return v === 'true' || v === '1';
}

function readNumber(key: string, fallback: number): number {
  const v = getSetting(key);
  if (v === null) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export interface MiniPlayerConfig {
  visible: boolean;
  alwaysOnTop: boolean;
  x: number | null;
  y: number | null;
  width: number | null;
  height: number | null;
}

export function getMiniPlayerConfig(): MiniPlayerConfig {
  return {
    visible: isMiniPlayerVisible(),
    alwaysOnTop: readBool(ALWAYS_ON_TOP_KEY, false),
    x: readNumber(X_KEY, NaN) || null,
    y: readNumber(Y_KEY, NaN) || null,
    width: readNumber(WIDTH_KEY, NaN) || null,
    height: readNumber(HEIGHT_KEY, NaN) || null,
  };
}

export function registerMiniPlayerHandlers(): void {
  ipcMain.handle('mini-player:show', () => {
    const cfg = getMiniPlayerConfig();
    showMiniPlayer();
    if (cfg.alwaysOnTop) setMiniPlayerAlwaysOnTop(true);
    return { ok: true, visible: true };
  });

  ipcMain.handle('mini-player:hide', () => {
    hideMiniPlayer();
    return { ok: true, visible: false };
  });

  ipcMain.handle('mini-player:toggle', () => {
    const visible = toggleMiniPlayer();
    return { ok: true, visible };
  });

  ipcMain.handle('mini-player:status', () => getMiniPlayerConfig());

  ipcMain.handle('mini-player:set-always-on-top', (_event: IpcMainInvokeEvent, value: boolean) => {
    const v = Boolean(value);
    setSetting(ALWAYS_ON_TOP_KEY, v ? 'true' : 'false');
    setMiniPlayerAlwaysOnTop(v);
    return { ok: true, alwaysOnTop: v };
  });

  ipcMain.handle('mini-player:expand', () => {
    hideMiniPlayer();
    focusMainWindow();
    return { ok: true };
  });

  ipcMain.handle('mini-player:save-bounds', (_event: IpcMainInvokeEvent) => {
    const bounds = getMiniPlayerBounds();
    if (bounds) {
      setSetting(X_KEY, String(bounds.x));
      setSetting(Y_KEY, String(bounds.y));
      setSetting(WIDTH_KEY, String(bounds.width));
      setSetting(HEIGHT_KEY, String(bounds.height));
    }
    return { ok: true, bounds };
  });

  ipcMain.handle('mini-player:close-window', () => {
    hideMiniPlayer();
    return { ok: true };
  });

  ipcMain.handle('mini-player:set-bounds', (_event: IpcMainInvokeEvent, bounds: { x: number; y: number; width: number; height: number }) => {
    const win = getMiniPlayerWindow();
    if (win && !win.isDestroyed()) {
      win.setBounds(bounds);
      return { ok: true };
    }
    return { ok: false, error: 'Window not found' };
  });
}
