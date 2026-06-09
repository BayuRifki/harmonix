import { create } from 'zustand';
import type { Track } from '@/types/global';

interface InsightsState {
  track: Track | null;
  open: (track: Track) => void;
  close: () => void;
}

/**
 * Tiny store that holds the currently-displayed track in the
 * `TrackInsightsPanel`. Kept separate from `useUiStore` so the panel
 * can carry the full `Track` object without coupling `useUiStore`
 * (which is persisted) to the `Track` type.
 */
export const useInsightsStore = create<InsightsState>((set) => ({
  track: null,
  open: (track) => set({ track }),
  close: () => set({ track: null }),
}));
