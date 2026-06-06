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
    id: Number(row.id),
    name: String(row.name),
    gains,
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
  };
}

const SELECT_PRESET =
  'SELECT id, name, gains, created_at, updated_at FROM eq_presets';
const ORDER_BY_NAME = ' ORDER BY name COLLATE NOCASE';

export function listCustomPresets(): EqPresetRow[] {
  const db = getDb();
  const rows = db.prepare(SELECT_PRESET + ORDER_BY_NAME).all() as EqPresetDbRow[];
  return rows.map(rowToPreset);
}

export function getCustomPresetByName(name: string): EqPresetRow | null {
  const db = getDb();
  const row = db.prepare(SELECT_PRESET + ' WHERE name = ?').get(name) as
    | EqPresetDbRow
    | undefined;
  return row ? rowToPreset(row) : null;
}

export function saveCustomPreset(name: string, gains: number[]): EqPresetRow {
  const db = getDb();
  const now = Date.now();
  const gainsJson = JSON.stringify(clampGains(gains));
  const existing = getCustomPresetByName(name);
  if (existing) {
    db.prepare('UPDATE eq_presets SET gains = ?, updated_at = ? WHERE id = ?').run(
      gainsJson,
      now,
      existing.id,
    );
    persist();
    const updated = getCustomPresetByName(name);
    if (updated) return updated;
    return { ...existing, gains: clampGains(gains), updatedAt: now };
  }
  db.prepare(
    'INSERT INTO eq_presets (name, gains, created_at, updated_at) VALUES (?, ?, ?, ?)',
  ).run(name, gainsJson, now, now);
  persist();
  const created = getCustomPresetByName(name);
  if (created) return created;
  throw new Error('Failed to save custom preset');
}

export function deleteCustomPreset(name: string): boolean {
  const db = getDb();
  const existing = getCustomPresetByName(name);
  if (!existing) return false;
  db.prepare('DELETE FROM eq_presets WHERE id = ?').run(existing.id);
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
