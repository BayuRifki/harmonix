import { getDb, persist } from './database';
import { getSetting, setSetting, deleteSetting } from './settingsRepository';
import { FLAT_GAINS, type EqPreset, clampGains } from '../sources/types';

const ACTIVE_PRESET_KEY = 'eq.activePreset';
const CURRENT_GAINS_KEY = 'eq.currentGains';

export interface EqPresetRow {
  id: number;
  name: string;
  gains: number[];
  createdAt: number;
  updatedAt: number;
}

export interface EqState {
  activePreset: string | null;
  currentGains: number[];
}

interface EqPresetDbRow {
  id: number;
  name: string;
  gains: string;
  created_at: number;
  updated_at: number;
}

function rowToPreset(row: EqPresetDbRow): EqPresetRow {
  let gains: number[];
  try {
    const parsed = JSON.parse(row.gains) as unknown;
    if (!Array.isArray(parsed)) throw new Error('not array');
    gains = parsed.map((v) => Number(v));
  } catch {
    gains = [...FLAT_GAINS];
  }
  gains = clampGains(gains);
  return {
    id: row.id,
    name: row.name,
    gains,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCustomPresets(): EqPresetRow[] {
  const db = getDb();
  const result = db.exec(
    'SELECT id, name, gains, created_at, updated_at FROM eq_presets ORDER BY name COLLATE NOCASE',
  );
  if (result.length === 0) return [];
  return result[0].values.map((v) => rowToPreset({
    id: v[0] as number,
    name: v[1] as string,
    gains: v[2] as string,
    created_at: v[3] as number,
    updated_at: v[4] as number,
  }));
}

export function getCustomPresetByName(name: string): EqPresetRow | null {
  const db = getDb();
  const result = db.exec(
    'SELECT id, name, gains, created_at, updated_at FROM eq_presets WHERE name = ?',
    [name],
  );
  if (result.length === 0 || result[0].values.length === 0) return null;
  const v = result[0].values[0];
  return rowToPreset({
    id: v[0] as number,
    name: v[1] as string,
    gains: v[2] as string,
    created_at: v[3] as number,
    updated_at: v[4] as number,
  });
}

export function saveCustomPreset(name: string, gains: number[]): EqPresetRow {
  const db = getDb();
  const now = Date.now();
  const gainsJson = JSON.stringify(clampGains(gains));
  const existing = getCustomPresetByName(name);
  if (existing) {
    db.run(
      'UPDATE eq_presets SET gains = ?, updated_at = ? WHERE id = ?',
      [gainsJson, now, existing.id],
    );
    persist();
    const updated = getCustomPresetByName(name);
    if (updated) return updated;
    return { ...existing, gains: clampGains(gains), updatedAt: now };
  }
  db.run(
    'INSERT INTO eq_presets (name, gains, created_at, updated_at) VALUES (?, ?, ?, ?)',
    [name, gainsJson, now, now],
  );
  persist();
  const created = getCustomPresetByName(name);
  if (created) return created;
  throw new Error('Failed to save custom preset');
}

export function deleteCustomPreset(name: string): boolean {
  const db = getDb();
  const existing = getCustomPresetByName(name);
  if (!existing) return false;
  db.run('DELETE FROM eq_presets WHERE id = ?', [existing.id]);
  persist();
  return true;
}

export function getEqState(): EqState {
  const activePreset = getSetting(ACTIVE_PRESET_KEY);
  const gainsJson = getSetting(CURRENT_GAINS_KEY);
  let gains: number[];
  if (gainsJson) {
    try {
      const parsed = JSON.parse(gainsJson) as unknown;
      if (Array.isArray(parsed)) {
        gains = parsed.map((v) => Number(v));
      } else {
        gains = [...FLAT_GAINS];
      }
    } catch {
      gains = [...FLAT_GAINS];
    }
  } else {
    gains = [...FLAT_GAINS];
  }
  return {
    activePreset: activePreset && activePreset !== 'null' ? activePreset : null,
    currentGains: clampGains(gains),
  };
}

export function saveEqState(state: EqState): void {
  const clamped = clampGains(state.currentGains);
  if (state.activePreset) {
    setSetting(ACTIVE_PRESET_KEY, state.activePreset);
  } else {
    deleteSetting(ACTIVE_PRESET_KEY);
  }
  setSetting(CURRENT_GAINS_KEY, JSON.stringify(clamped));
}

export function presetToEq(row: EqPresetRow): EqPreset {
  return {
    name: row.name,
    builtin: false,
    gains: row.gains,
  };
}
