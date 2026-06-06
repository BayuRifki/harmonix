import { create } from 'zustand';
import type { PlaylistSummary, PlaylistDetail } from '@/types/global';
import type { Track } from '@/types/global';
import { usePlayerStore } from '@/stores/playerStore';

interface PlaylistsState {
  playlists: PlaylistSummary[];
  current: PlaylistDetail | null;
  loading: boolean;
  error: string | null;

  refresh: () => Promise<void>;
  load: (id: number) => Promise<void>;
  clearCurrent: () => void;
  create: (name: string, description?: string) => Promise<number>;
  rename: (id: number, name: string, description?: string) => Promise<void>;
  remove: (id: number) => Promise<void>;
  addTrack: (track: Track) => Promise<void>;
  removeTrack: (position: number) => Promise<void>;
  reorder: (from: number, to: number) => Promise<void>;
  playAll: (startIndex?: number) => Promise<void>;
}

export const usePlaylistsStore = create<PlaylistsState>((set, get) => ({
  playlists: [],
  current: null,
  loading: false,
  error: null,

  refresh: async () => {
    set({ loading: true });
    try {
      const playlists = await window.api.playlists.list();
      set({ playlists, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  load: async (id) => {
    set({ loading: true });
    try {
      const detail = await window.api.playlists.get(id);
      set({ current: detail, error: null });
    } catch (err) {
      set({ error: (err as Error).message });
    } finally {
      set({ loading: false });
    }
  },

  clearCurrent: () => set({ current: null }),

  create: async (name, description) => {
    const { id } = await window.api.playlists.create({ name, description });
    await get().refresh();
    return id;
  },

  rename: async (id, name, description) => {
    await window.api.playlists.rename({ id, name, description });
    if (get().current?.id === id) {
      await get().load(id);
    }
    await get().refresh();
  },

  remove: async (id) => {
    await window.api.playlists.delete(id);
    if (get().current?.id === id) {
      set({ current: null });
    }
    await get().refresh();
  },

  addTrack: async (track) => {
    const current = get().current;
    if (!current) throw new Error('No playlist loaded');
    const refId =
      track.source === 'local' && track.sourceId.startsWith('local:')
        ? track.sourceId.slice('local:'.length)
        : track.sourceId;
    await window.api.playlists.addTrack({
      playlistId: current.id,
      source: track.source,
      sourceId: refId,
    });
    await get().load(current.id);
    await get().refresh();
  },

  removeTrack: async (position) => {
    const current = get().current;
    if (!current) return;
    await window.api.playlists.removeTrack({ playlistId: current.id, position });
    await get().load(current.id);
    await get().refresh();
  },

  reorder: async (from, to) => {
    const current = get().current;
    if (!current) return;
    await window.api.playlists.reorder({ playlistId: current.id, from, to });
    await get().load(current.id);
  },

  playAll: async (startIndex = 0) => {
    const { current } = get();
    if (!current || current.resolved.length === 0) return;
    await usePlayerStore
      .getState()
      .setQueue(current.resolved, Math.max(0, Math.min(startIndex, current.resolved.length - 1)));
  },
}));
