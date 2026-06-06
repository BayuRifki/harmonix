import { ipcMain } from 'electron';
import {
  listCustomPresets,
  saveCustomPreset,
  deleteCustomPreset,
  getEqState,
  saveEqState,
  type EqState,
  type EqPresetRow,
} from '../db/eqRepository';
import type { EqPreset } from '../sources/types';

export interface EqCustomPresetView {
  id: number;
  name: string;
  gains: number[];
  createdAt: number;
  updatedAt: number;
}

function toView(row: EqPresetRow): EqCustomPresetView {
  return {
    id: row.id,
    name: row.name,
    gains: row.gains,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function registerEqualizerHandlers(): void {
  ipcMain.handle('eq:get-state', async (): Promise<EqState> => {
    return getEqState();
  });

  ipcMain.handle('eq:save-state', async (_evt, state: EqState): Promise<{ ok: true }> => {
    saveEqState(state);
    return { ok: true };
  });

  ipcMain.handle('eq:list-custom-presets', async (): Promise<EqCustomPresetView[]> => {
    return listCustomPresets().map(toView);
  });

  ipcMain.handle(
    'eq:save-custom-preset',
    async (_evt, payload: { name: string; gains: number[] }): Promise<EqCustomPresetView> => {
      const row = saveCustomPreset(payload.name, payload.gains);
      return toView(row);
    },
  );

  ipcMain.handle(
    'eq:delete-custom-preset',
    async (_evt, name: string): Promise<{ ok: boolean }> => {
      const ok = deleteCustomPreset(name);
      return { ok };
    },
  );

  ipcMain.handle(
    'eq:list-all-presets',
    async (): Promise<{ builtin: EqPreset[]; custom: EqCustomPresetView[] }> => {
      const { BUILTIN_PRESETS } = await import('../sources/presets');
      return {
        builtin: BUILTIN_PRESETS,
        custom: listCustomPresets().map(toView),
      };
    },
  );
}
