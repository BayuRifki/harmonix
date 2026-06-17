import { describe, it, expect, vi, beforeEach } from 'vitest';
import { installMockWindowApi } from '../setup';

beforeEach(() => {
  installMockWindowApi({
    library: {
      getTracks: vi.fn(async () => [{ id: '1', title: 'Track 1' }]),
      getAlbums: vi.fn(async () => []),
      getArtists: vi.fn(async () => []),
      getFolders: vi.fn(async () => []),
      getStats: vi.fn(async () => ({ trackCount: 1, albumCount: 0, artistCount: 0 })),
      scan: vi.fn(async () => ({ folder: '/music', started: true })),
    },
  });
});

describe('libraryStore', () => {
  it('refresh skips when tracks already loaded', async () => {
    const { useLibraryStore } = await import('@/stores/libraryStore');
    const store = useLibraryStore.getState();
    store.setTracks([{ id: '1', title: 'Track 1' } as never]);
    const getTracks = window.api.library.getTracks as ReturnType<typeof vi.fn>;
    await store.refresh();
    expect(getTracks).not.toHaveBeenCalled();
  });

  it('refresh({ force: true }) refetches even when tracks loaded', async () => {
    const { useLibraryStore } = await import('@/stores/libraryStore');
    const store = useLibraryStore.getState();
    store.setTracks([{ id: '1', title: 'Track 1' } as never]);
    const getTracks = window.api.library.getTracks as ReturnType<typeof vi.fn>;
    await store.refresh({ force: true });
    expect(getTracks).toHaveBeenCalled();
  });

  it('removeFolder calls refresh with force', async () => {
    const { useLibraryStore } = await import('@/stores/libraryStore');
    const store = useLibraryStore.getState();
    const refreshSpy = vi.fn(store.refresh);
    store.refresh = refreshSpy;
    vi.spyOn(window.api.library, 'removeFolder').mockResolvedValue({ removed: true });
    await store.removeFolder('/music');
    expect(refreshSpy).toHaveBeenCalledWith({ force: true });
  });
});
