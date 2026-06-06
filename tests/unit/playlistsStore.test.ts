import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { PlaylistSummary, PlaylistDetail, Track } from '@/types/global';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockRename = vi.fn();
const mockDelete = vi.fn();
const mockAddTrack = vi.fn();
const mockRemoveTrack = vi.fn();
const mockReorder = vi.fn();
const mockSetQueue = vi.fn();

const sampleTrack: Track = {
  id: 'local:1',
  source: 'local',
  sourceId: '1',
  title: 'Sample',
  artists: [],
  durationMs: 1000,
  isPlayable: true,
};

const sampleSummary: PlaylistSummary = {
  id: 1,
  name: 'My Mix',
  description: null,
  created_at: 0,
  updated_at: 0,
  trackCount: 0,
};

const sampleDetail: PlaylistDetail = {
  id: 1,
  name: 'My Mix',
  description: null,
  created_at: 0,
  updated_at: 0,
  tracks: [],
  resolved: [sampleTrack],
  unresolved: [],
};

let usePlaylistsStore: typeof import('@/stores/playlistsStore').usePlaylistsStore;
const mockPlayTrack = vi.fn();

beforeEach(async () => {
  mockList.mockReset();
  mockGet.mockReset();
  mockCreate.mockReset();
  mockRename.mockReset();
  mockDelete.mockReset();
  mockAddTrack.mockReset();
  mockRemoveTrack.mockReset();
  mockReorder.mockReset();
  mockSetQueue.mockReset();
  mockPlayTrack.mockReset();
  mockPlayTrack.mockResolvedValue({
    url: 'file:///tmp/audio.mp3',
    protocol: 'file',
  });

  (globalThis as { window?: unknown }).window = {
    api: {
      playlists: {
        list: mockList,
        get: mockGet,
        create: mockCreate,
        rename: mockRename,
        delete: mockDelete,
        addTrack: mockAddTrack,
        removeTrack: mockRemoveTrack,
        reorder: mockReorder,
      },
      sources: {
        playTrack: mockPlayTrack,
      },
    },
  };
  if (!usePlaylistsStore) {
    const mod = await import('@/stores/playlistsStore');
    usePlaylistsStore = mod.usePlaylistsStore;
  }
  usePlaylistsStore.setState({
    playlists: [],
    current: null,
    loading: false,
    error: null,
  });
});

describe('playlistsStore (direct)', () => {
  it('refresh fetches and stores playlists', async () => {
    mockList.mockResolvedValue([sampleSummary]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    await store.refresh();
    expect(usePlaylistsStore.getState().playlists).toEqual([sampleSummary]);
    expect(mockList).toHaveBeenCalledOnce();
  });

  it('load fetches a playlist detail', async () => {
    mockGet.mockResolvedValue(sampleDetail);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    await store.load(1);
    expect(usePlaylistsStore.getState().current).toEqual(sampleDetail);
  });

  it('create returns new id and refreshes', async () => {
    mockCreate.mockResolvedValue({ id: 42 });
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    const id = await store.create('Test');
    expect(id).toBe(42);
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Test', description: undefined });
    expect(mockList).toHaveBeenCalled();
  });

  it('create passes description when provided', async () => {
    mockCreate.mockResolvedValue({ id: 7 });
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    const id = await store.create('Favorites', 'Top tracks');
    expect(id).toBe(7);
    expect(mockCreate).toHaveBeenCalledWith({ name: 'Favorites', description: 'Top tracks' });
  });

  it('remove calls delete and refreshes', async () => {
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    await store.remove(1);
    expect(mockDelete).toHaveBeenCalledWith(1);
  });

  it('addTrack prefixes local IDs with source prefix when missing', async () => {
    mockAddTrack.mockResolvedValue({ position: 0 });
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    await store.addTrack(sampleTrack);
    expect(mockAddTrack).toHaveBeenCalledWith({
      playlistId: 1,
      source: 'local',
      sourceId: '1',
    });
  });

  it('addTrack does not re-prefix already prefixed local IDs', async () => {
    mockAddTrack.mockResolvedValue({ position: 0 });
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    const prefixed: Track = { ...sampleTrack, sourceId: 'local:1' };
    await store.addTrack(prefixed);
    expect(mockAddTrack).toHaveBeenCalledWith({
      playlistId: 1,
      source: 'local',
      sourceId: '1',
    });
  });

  it('addTrack for non-local sources uses sourceId as-is', async () => {
    mockAddTrack.mockResolvedValue({ position: 0 });
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    const spotifyTrack: Track = { ...sampleTrack, source: 'spotify', sourceId: 'abc123' };
    await store.addTrack(spotifyTrack);
    expect(mockAddTrack).toHaveBeenCalledWith({
      playlistId: 1,
      source: 'spotify',
      sourceId: 'abc123',
    });
  });

  it('playAll with empty resolved tracks is a no-op', async () => {
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: { ...sampleDetail, resolved: [] } });
    await store.playAll(0);
    expect(mockSetQueue).not.toHaveBeenCalled();
  });

  it('playAll with null current is a no-op', async () => {
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: null });
    await store.playAll(0);
    expect(mockSetQueue).not.toHaveBeenCalled();
  });

  it('clearCurrent resets current', async () => {
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    store.clearCurrent();
    expect(usePlaylistsStore.getState().current).toBeNull();
  });

  it('rename updates and reloads if current is the renamed one', async () => {
    const renamedDetail = { ...sampleDetail, name: 'Renamed' };
    mockGet.mockResolvedValue(renamedDetail);
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    await store.rename(1, 'Renamed');
    expect(mockRename).toHaveBeenCalledWith({ id: 1, name: 'Renamed', description: undefined });
    expect(mockGet).toHaveBeenCalledWith(1);
  });

  it('remove clears current if same id', async () => {
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    await store.remove(1);
    expect(usePlaylistsStore.getState().current).toBeNull();
  });

  it('removeTrack calls IPC with correct position', async () => {
    mockGet.mockResolvedValue(sampleDetail);
    mockList.mockResolvedValue([]);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    await store.removeTrack(2);
    expect(mockRemoveTrack).toHaveBeenCalledWith({ playlistId: 1, position: 2 });
  });

  it('reorder calls IPC with from/to', async () => {
    mockGet.mockResolvedValue(sampleDetail);
    const { usePlaylistsStore } = await import('@/stores/playlistsStore');
    const store = usePlaylistsStore.getState();
    usePlaylistsStore.setState({ current: sampleDetail });
    await store.reorder(0, 3);
    expect(mockReorder).toHaveBeenCalledWith({ playlistId: 1, from: 0, to: 3 });
  });
});
