import type { IpcMainInvokeEvent } from 'electron';
import { ipcMain } from 'electron';
import { playerStateBus, type PlayerAction, type PlayerSnapshot } from '../playerState';
import { getMainWindow, getMiniPlayerWindow } from '../windowManager';

function broadcastState(): void {
  const snapshot = playerStateBus.getSnapshot();
  for (const win of [getMainWindow(), getMiniPlayerWindow()]) {
    if (win && !win.isDestroyed()) {
      win.webContents.send('player:state-changed', snapshot);
    }
  }
}

function routeToMainRenderer(action: PlayerAction): void {
  const main = getMainWindow();
  if (!main || main.isDestroyed()) return;
  main.webContents.send('player:command', action);
}

export function registerPlayerHandlers(): void {
  playerStateBus.subscribe(() => {
    broadcastState();
  });

  ipcMain.handle('player:get-state', () => playerStateBus.getSnapshot());

  ipcMain.handle(
    'player:push-state',
    (_event: IpcMainInvokeEvent, snapshot: Partial<PlayerSnapshot>) => {
      if (!snapshot || typeof snapshot !== 'object') return { ok: false };
      const current = playerStateBus.getSnapshot();
      const merged: PlayerSnapshot = { ...current, ...snapshot, updatedAt: Date.now() };
      playerStateBus.setSnapshot(merged);
      return { ok: true };
    },
  );

  ipcMain.handle('player:command', (_event: IpcMainInvokeEvent, action: PlayerAction) => {
    if (!action || typeof action !== 'object' || typeof action.type !== 'string') {
      return { ok: false, error: 'Invalid action' };
    }
    routeToMainRenderer(action);
    return { ok: true };
  });
}
