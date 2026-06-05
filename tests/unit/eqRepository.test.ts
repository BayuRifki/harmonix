import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import initSqlJs, { type Database, type SqlJsStatic } from 'sql.js';
import { join } from 'node:path';

let SQL: SqlJsStatic | null = null;
let db: Database | null = null;
let runMigrationsFn: ((d: Database) => void) | null = null;
let repo: typeof import('../../electron/main/db/eqRepository') | null = null;

let setDbForTestFn: ((d: Database | null) => void) | null = null;

beforeEach(async () => {
  if (!SQL) {
    const wasmPath = join(
      process.cwd(),
      'node_modules',
      'sql.js',
      'dist',
      'sql-wasm.wasm',
    );
    SQL = await initSqlJs({
      locateFile: (file: string) => (file.endsWith('.wasm') ? wasmPath : file),
    });
  }
  db = new SQL.Database();
  if (!runMigrationsFn) {
    const mod = await import('../../electron/main/db/migrations');
    runMigrationsFn = mod.runMigrations;
  }
  runMigrationsFn(db);
  if (!setDbForTestFn) {
    const dbMod = await import('../../electron/main/db/database');
    setDbForTestFn = dbMod.__setDbForTest;
  }
  setDbForTestFn(db);
  repo = await import('../../electron/main/db/eqRepository');
});

afterEach(() => {
  if (setDbForTestFn) setDbForTestFn(null);
  if (db) {
    db.close();
    db = null;
  }
});

describe('eqRepository', () => {
  it('eq_presets table is created by migration', () => {
    const result = db!.exec(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='eq_presets'",
    );
    expect(result.length).toBe(1);
  });

  it('saveCustomPreset inserts a new preset', () => {
    const gains = [1, 2, 3, 4, 5, 0, 0, -2, -3, -5];
    const saved = repo!.saveCustomPreset('Test Preset', gains);
    expect(saved.name).toBe('Test Preset');
    expect(saved.gains).toEqual(gains);
    expect(saved.id).toBeGreaterThan(0);
  });

  it('saveCustomPreset updates an existing preset with same name', () => {
    repo!.saveCustomPreset('My Preset', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const updated = repo!.saveCustomPreset('My Preset', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    expect(updated.gains).toEqual([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    const all = repo!.listCustomPresets();
    expect(all).toHaveLength(1);
  });

  it('saveCustomPreset clamps out-of-range gains', () => {
    const saved = repo!.saveCustomPreset('Extreme', [50, -50, 5, 0, 0, 0, 0, 0, 0, 0]);
    expect(saved.gains[0]).toBe(12);
    expect(saved.gains[1]).toBe(-12);
    expect(saved.gains[2]).toBe(5);
  });

  it('listCustomPresets returns sorted by name', () => {
    repo!.saveCustomPreset('Zeta', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    repo!.saveCustomPreset('Alpha', [1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    repo!.saveCustomPreset('Beta', [2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    const all = repo!.listCustomPresets();
    expect(all.map((p) => p.name)).toEqual(['Alpha', 'Beta', 'Zeta']);
  });

  it('getCustomPresetByName returns null for missing', () => {
    expect(repo!.getCustomPresetByName('Missing')).toBeNull();
  });

  it('deleteCustomPreset removes preset and returns true', () => {
    repo!.saveCustomPreset('ToDelete', [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    const ok = repo!.deleteCustomPreset('ToDelete');
    expect(ok).toBe(true);
    expect(repo!.listCustomPresets()).toHaveLength(0);
  });

  it('deleteCustomPreset returns false for missing', () => {
    expect(repo!.deleteCustomPreset('NotThere')).toBe(false);
  });

  it('getEqState returns flat defaults when nothing saved', () => {
    const state = repo!.getEqState();
    expect(state.activePreset).toBeNull();
    expect(state.currentGains).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('saveEqState persists active preset and gains', () => {
    repo!.saveEqState({
      activePreset: 'Rock',
      currentGains: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5],
    });
    const state = repo!.getEqState();
    expect(state.activePreset).toBe('Rock');
    expect(state.currentGains).toEqual([5, 4, 3, 1, -1, -1, 2, 3, 4, 5]);
  });

  it('saveEqState clamps out-of-range gains', () => {
    repo!.saveEqState({
      activePreset: null,
      currentGains: [100, -100, 5, 0, 0, 0, 0, 0, 0, 0],
    });
    const state = repo!.getEqState();
    expect(state.currentGains[0]).toBe(12);
    expect(state.currentGains[1]).toBe(-12);
  });

  it('saveEqState with null preset deletes the active preset key', () => {
    repo!.saveEqState({ activePreset: 'Vocal', currentGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] });
    repo!.saveEqState({ activePreset: null, currentGains: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1] });
    const state = repo!.getEqState();
    expect(state.activePreset).toBeNull();
  });

  it('presetToEq maps row to EqPreset', () => {
    const row = repo!.saveCustomPreset('MyEars', [1, 0, -1, 0, 1, -1, 0, 0, 0, 0]);
    const eq = repo!.presetToEq(row);
    expect(eq.name).toBe('MyEars');
    expect(eq.builtin).toBe(false);
    expect(eq.gains).toEqual([1, 0, -1, 0, 1, -1, 0, 0, 0, 0]);
  });
});
