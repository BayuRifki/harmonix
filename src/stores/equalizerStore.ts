import { create } from 'zustand';
import type { EqPreset, EqCustomPreset } from '@/types/global';
import { equalizer } from '@/lib/audio/equalizer';
import {
  BUILTIN_PRESETS,
  FLAT_GAINS,
  clampGains,
  getBuiltinPreset,
} from '@/lib/audio/presets';

interface EqualizerState {
  builtinPresets: EqPreset[];
  customPresets: EqCustomPreset[];
  activePreset: string | null;
  currentGains: number[];
  loaded: boolean;
  error: string | null;

  load: () => Promise<void>;
  applyPreset: (name: string) => Promise<void>;
  setBandGain: (index: number, gainDb: number) => Promise<void>;
  setAllGains: (gains: number[]) => Promise<void>;
  reset: () => Promise<void>;
  saveCustom: (name: string) => Promise<void>;
  deleteCustom: (name: string) => Promise<void>;
}

function applyGainsToEngine(gains: number[]): void {
  equalizer.setAllGains(clampGains(gains));
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePersist(state: { activePreset: string | null; currentGains: number[] }): void {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    void window.api.eq.saveState({
      activePreset: state.activePreset,
      currentGains: clampGains(state.currentGains),
    });
  }, 500);
}

export const useEqualizerStore = create<EqualizerState>((set, get) => ({
  builtinPresets: BUILTIN_PRESETS,
  customPresets: [],
  activePreset: null,
  currentGains: [...FLAT_GAINS],
  loaded: false,
  error: null,

  load: async () => {
    if (get().loaded) return;
    try {
      const [state, all] = await Promise.all([
        window.api.eq.getState(),
        window.api.eq.listAllPresets(),
      ]);
      const gains = clampGains(state.currentGains);
      applyGainsToEngine(gains);
      set({
        builtinPresets: all.builtin,
        customPresets: all.custom,
        activePreset: state.activePreset,
        currentGains: gains,
        loaded: true,
        error: null,
      });
    } catch (err) {
      set({ error: (err as Error).message, loaded: true });
    }
  },

  applyPreset: async (name: string) => {
    const builtin = getBuiltinPreset(name);
    const custom = get().customPresets.find((p) => p.name === name);
    const preset = builtin ?? (custom ? { name: custom.name, builtin: false, gains: custom.gains } : null);
    if (!preset) return;
    const gains = clampGains(preset.gains);
    applyGainsToEngine(gains);
    set({ activePreset: name, currentGains: gains });
    schedulePersist({ activePreset: name, currentGains: gains });
  },

  setBandGain: async (index, gainDb) => {
    const gains = [...get().currentGains];
    if (index < 0 || index >= gains.length) return;
    gains[index] = gainDb;
    const clamped = clampGains(gains);
    applyGainsToEngine(clamped);
    set({ currentGains: clamped, activePreset: null });
    schedulePersist({ activePreset: null, currentGains: clamped });
  },

  setAllGains: async (gains) => {
    const clamped = clampGains(gains);
    applyGainsToEngine(clamped);
    set({ currentGains: clamped, activePreset: null });
    schedulePersist({ activePreset: null, currentGains: clamped });
  },

  reset: async () => {
    applyGainsToEngine(FLAT_GAINS);
    set({ currentGains: [...FLAT_GAINS], activePreset: 'Flat' });
    schedulePersist({ activePreset: 'Flat', currentGains: [...FLAT_GAINS] });
  },

  saveCustom: async (name) => {
    const gains = get().currentGains;
    const saved = await window.api.eq.saveCustomPreset({ name, gains });
    set((s) => ({
      customPresets: [...s.customPresets.filter((p) => p.name !== name), saved].sort((a, b) =>
        a.name.localeCompare(b.name),
      ),
      activePreset: name,
    }));
    schedulePersist({ activePreset: name, currentGains: gains });
  },

  deleteCustom: async (name) => {
    const { ok } = await window.api.eq.deleteCustomPreset(name);
    if (!ok) return;
    set((s) => ({
      customPresets: s.customPresets.filter((p) => p.name !== name),
      activePreset: s.activePreset === name ? null : s.activePreset,
    }));
  },
}));
