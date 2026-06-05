// Will be populated in future phases.
import { create } from 'zustand';

interface SettingsState {
  theme: 'light' | 'dark' | 'system';
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
}

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: 'dark',
  setTheme: (theme) => set({ theme }),
}));
