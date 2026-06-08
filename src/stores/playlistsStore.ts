import { create } from 'zustand';
import type { PlaylistSummary, PlaylistDetail, PlaylistTrackRef } from '@/types/global';
import type { Track } from '@/types/global';
import { usePlayerStore } from '@/stores/playerStore';
import { useToastStore } from '@/components/ui/toastStore';

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
    const toast = useToastStore.getState();
    const optimisticId = -Date.now();
    const optimistic: PlaylistSummary = {
      id: optimisticId,
      name,
      description: description ?? null,
      created_at: Date.now(),
      updated_at: Date.now(),
      trackCount: 0,
    };
    const snapshot = [...get().playlists];
    set({ playlists: [optimistic, ...snapshot] });
    const tid = toast.syncStart(`Creating "${name}"…`);
    try {
      const { id } = await window.api.playlists.create({ name, description });
      await get().refresh();
      toast.syncEnd(tid);
      return id;
    } catch (err) {
      set({ playlists: snapshot });
      toast.error(`Failed to create playlist: ${(err as Error).message}`);
      throw err;
    }
  },

  rename: async (id, name, description) => {
    const snapshot = get().playlists.map((p) => ({ ...p }));
    const snapshotCurrent = get().current ? { ...get().current! } : null;
    set({
      playlists: get().playlists.map((p) =>
        p.id === id ? { ...p, name, description: description ?? p.description } : p,
      ),
      current:
        get().current?.id === id
          ? { ...get().current!, name, description: description ?? get().current!.description }
          : get().current,
    });
    try {
      await window.api.playlists.rename({ id, name, description });
      if (get().current?.id === id) {
        await get().load(id);
      }
      await get().refresh();
    } catch (err) {
      set({ playlists: snapshot, current: snapshotCurrent });
      useToastStore.getState().error(`Failed to rename playlist: ${(err as Error).message}`);
    }
  },

  remove: async (id) => {
    const snapshot = [...get().playlists];
    const snapshotCurrent = get().current;
    set({
      playlists: get().playlists.filter((p) => p.id !== id),
      current: get().current?.id === id ? null : get().current,
    });
    const toast = useToastStore.getState();
    try {
      await window.api.playlists.delete(id);
      await get().refresh();
    } catch (err) {
      set({ playlists: snapshot, current: snapshotCurrent });
      toast.error(`Failed to delete playlist: ${(err as Error).message}`);
    }
  },

  addTrack: async (track) => {
    const current = get().current;
    if (!current) throw new Error('No playlist loaded');
    const snapshotResolved = [...current.resolved];
    const snapshotTracks: PlaylistTrackRef[] = [...current.tracks];
    const refId =
      track.source === 'local' && track.sourceId.startsWith('local:')
        ? track.sourceId.slice('local:'.length)
        : track.sourceId;
    const optimisticDetail: PlaylistDetail = {
      ...current,
      resolved: [...current.resolved, track],
      tracks: [
        ...current.tracks,
        { source: track.source, source_id: refId, position: current.tracks.length },
      ],
    };
    set({ current: optimisticDetail });
    set({
      playlists: get().playlists.map((p) =>
        p.id === current.id ? { ...p, trackCount: p.trackCount + 1 } : p,
      ),
    });
    const toast = useToastStore.getState();
    const tid = toast.syncStart(`Adding to "${current.name}"…`);
    try {
      await window.api.playlists.addTrack({
        playlistId: current.id,
        source: track.source,
        sourceId: refId,
      });
      await get().load(current.id);
      await get().refresh();
      toast.syncEnd(tid);
    } catch (err) {
      set({
        current: { ...current, resolved: snapshotResolved, tracks: snapshotTracks },
        playlists: get().playlists.map((p) =>
          p.id === current.id ? { ...p, trackCount: p.trackCount } : p,
        ),
      });
      toast.error(`Failed to add track: ${(err as Error).message}`);
    }
  },

  removeTrack: async (position) => {
    const current = get().current;
    if (!current) return;
    const snapshotResolved = [...current.resolved];
    const snapshotTracks: PlaylistTrackRef[] = [...current.tracks];
    const optimisticDetail: PlaylistDetail = {
      ...current,
      resolved: current.resolved.filter((_, i) => i !== position),
      tracks: current.tracks.filter((_, i) => i !== position),
    };
    set({ current: optimisticDetail });
    set({
      playlists: get().playlists.map((p) =>
        p.id === current.id ? { ...p, trackCount: Math.max(0, p.trackCount - 1) } : p,
      ),
    });
    try {
      await window.api.playlists.removeTrack({ playlistId: current.id, position });
      await get().load(current.id);
      await get().refresh();
    } catch (err) {
      set({
        current: { ...current, resolved: snapshotResolved, tracks: snapshotTracks },
        playlists: get().playlists.map((p) =>
          p.id === current.id ? { ...p, trackCount: current.tracks.length } : p,
        ),
      });
      useToastStore.getState().error(`Failed to remove track: ${(err as Error).message}`);
    }
  },

  reorder: async (from, to) => {
    const current = get().current;
    if (!current) return;
    const snapshotResolved = [...current.resolved];
    const snapshotTracks: PlaylistTrackRef[] = [...current.tracks];
    const reordered = [...current.resolved];
    const [moved] = reordered.splice(from, 1);
    if (moved !== undefined) reordered.splice(to, 0, moved);
    set({ current: { ...current, resolved: reordered } });
    try {
      await window.api.playlists.reorder({ playlistId: current.id, from, to });
      await get().load(current.id);
    } catch (err) {
      set({ current: { ...current, resolved: snapshotResolved, tracks: snapshotTracks } });
      useToastStore.getState().error(`Failed to reorder: ${(err as Error).message}`);
    }
  },

  playAll: async (startIndex = 0) => {
    const { current } = get();
    if (!current || current.resolved.length === 0) return;
    await usePlayerStore
      .getState()
      .setQueue(current.resolved, Math.max(0, Math.min(startIndex, current.resolved.length - 1)), {
        shuffle: false,
        smartShuffle: false,
      });
  },
}));
