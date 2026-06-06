import { create } from 'zustand';
import type { SourceRegistration, SourceSearchResult } from '@/types/global';
import type { Track, SearchOptions, Playlist } from '@/types/global';

const VIRTUAL_IDS = new Set(['local', 'demo']);

interface SourcesState {
  registrations: SourceRegistration[];
  loading: boolean;

  refresh: () => Promise<void>;
  setEnabled: (id: string, enabled: boolean) => Promise<void>;
  saveConfig: (id: string, settings: Record<string, unknown>) => Promise<void>;
  getConfig: (id: string) => Promise<Record<string, unknown>>;
  search: (
    query: string,
    options?: SearchOptions,
    sourceIds?: string[],
  ) => Promise<SourceSearchResult[]>;
  getRegistration: (id: string) => SourceRegistration | undefined;
  getEnabled: () => SourceRegistration[];
  getBrowseable: () => SourceRegistration[];
  loadUserPlaylists: (id: string) => Promise<Playlist[]>;
  loadLikedTracks: (id: string) => Promise<Track[]>;
  loadPlaylistTracks: (id: string, playlistId: string) => Promise<Track[]>;
}

export const useSourcesStore = create<SourcesState>((set, get) => ({
  registrations: [],
  loading: false,

  refresh: async () => {
    set({ loading: true });
    try {
      const [list, configs] = await Promise.all([
        window.api.sources.list(),
        window.api.sources.loadConfigs(),
      ]);
      const merged: SourceRegistration[] = list.map((r) => {
        const cfg = configs[r.id];
        return { ...r, enabled: cfg?.enabled ?? r.enabled };
      });
      set({ registrations: merged });
    } catch (err) {
      console.error('[sources] refresh failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  setEnabled: async (id, enabled) => {
    await window.api.sources.setEnabled({ id, enabled });
    set((state) => ({
      registrations: state.registrations.map((r) => (r.id === id ? { ...r, enabled } : r)),
    }));
  },

  saveConfig: async (id, settings) => {
    await window.api.sources.saveConfig({ id, settings });
  },

  getConfig: async (id) => window.api.sources.getConfig({ id }),

  search: async (query, options, sourceIds) => {
    if (!query.trim()) return [];
    return window.api.sources.search({ query, options, sourceIds });
  },

  getRegistration: (id) => get().registrations.find((r) => r.id === id),

  getEnabled: () => get().registrations.filter((r) => r.enabled),

  getBrowseable: () =>
    get().registrations.filter(
      (r) =>
        r.enabled &&
        (r.capabilities.canGetPlaylists ||
          r.capabilities.canGetLikedTracks ||
          r.capabilities.canSearch),
    ),

  loadUserPlaylists: async (id) => {
    if (VIRTUAL_IDS.has(id)) return [];
    return window.api.sources.userPlaylists({ id });
  },

  loadLikedTracks: async (id) => {
    if (VIRTUAL_IDS.has(id)) return [];
    return window.api.sources.likedTracks({ id });
  },

  loadPlaylistTracks: async (id, playlistId) => {
    if (VIRTUAL_IDS.has(id)) return [];
    return window.api.sources.playlistTracks({ id, playlistId });
  },
}));
