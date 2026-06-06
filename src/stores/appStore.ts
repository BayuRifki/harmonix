import { create } from 'zustand';

interface AppState {
  version: string;
  platform: NodeJS.Platform | null;
}

export const useAppStore = create<AppState>(() => ({
  version: '0.1.0',
  platform: null,
}));
