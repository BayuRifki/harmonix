import { create } from 'zustand';

interface AppState {
  version: string;
  platform: NodeJS.Platform | null;
  setVersion: (version: string) => void;
  setPlatform: (platform: NodeJS.Platform) => void;
}

export const useAppStore = create<AppState>((set) => ({
  version: '0.0.1',
  platform: null,
  setVersion: (version) => set({ version }),
  setPlatform: (platform) => set({ platform }),
}));
