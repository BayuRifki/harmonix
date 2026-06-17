import { create } from 'zustand';
import type { Track } from '@/types/global';
import type {
  ScanFolder,
  AlbumSummary,
  ArtistSummary,
  ScanProgress,
  LibraryStats,
} from '@/types/global';
import { useToastStore } from '@/components/ui/toastStore';

interface LibraryState {
  tracks: Track[];
  albums: AlbumSummary[];
  artists: ArtistSummary[];
  folders: ScanFolder[];
  stats: LibraryStats;
  loading: boolean;
  scanning: boolean;
  scanProgress: ScanProgress;
  searchQuery: string;
  activeTab: 'tracks' | 'albums' | 'artists';

  setTracks: (tracks: Track[]) => void;
  setAlbums: (albums: AlbumSummary[]) => void;
  setArtists: (artists: ArtistSummary[]) => void;
  setFolders: (folders: ScanFolder[]) => void;
  setStats: (stats: LibraryStats) => void;
  setLoading: (loading: boolean) => void;
  setScanning: (scanning: boolean) => void;
  setScanProgress: (p: ScanProgress) => void;
  setSearchQuery: (q: string) => void;
  setActiveTab: (tab: 'tracks' | 'albums' | 'artists') => void;

  refresh: (opts?: { force?: boolean }) => Promise<void>;
  pickAndScan: () => Promise<void>;
  scanFolder: (folder: string) => Promise<void>;
  removeFolder: (folder: string) => Promise<void>;
  startScanProgressPolling: () => () => void;
}

const emptyStats: LibraryStats = { trackCount: 0, albumCount: 0, artistCount: 0 };
const emptyProgress: ScanProgress = {
  filesFound: 0,
  currentPath: null,
  total: null,
  done: false,
};

export const useLibraryStore = create<LibraryState>((set, get) => ({
  tracks: [],
  albums: [],
  artists: [],
  folders: [],
  stats: emptyStats,
  loading: false,
  scanning: false,
  scanProgress: emptyProgress,
  searchQuery: '',
  activeTab: 'tracks',

  setTracks: (tracks) => set({ tracks }),
  setAlbums: (albums) => set({ albums }),
  setArtists: (artists) => set({ artists }),
  setFolders: (folders) => set({ folders }),
  setStats: (stats) => set({ stats }),
  setLoading: (loading) => set({ loading }),
  setScanning: (scanning) => set({ scanning }),
  setScanProgress: (scanProgress) => set({ scanProgress }),
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  setActiveTab: (activeTab) => set({ activeTab }),

  refresh: async (opts?: { force?: boolean }) => {
    // Skip when we've already populated the store. HomeView mounts
    // on every navigation back to `/` and previously re-issued the
    // full refresh (tracks/albums/artists/folders/stats = 5 IPC
    // round trips + ~5 MB of JSON to clone back into the V8 heap
    // each time). Refresh only happens on explicit user actions
    // (scan, remove, manual reload).
    if (!opts?.force && (get().tracks.length > 0 || get().loading)) return;
    set({ loading: true });
    try {
      // 500 tracks is enough to fill any reasonable LibraryView
      // viewport; the list already virtualises beyond that, and
      // pulling 1000 was just doubling the JSON.parse + structured-
      // clone cost on every refresh for no visible benefit.
      const [tracks, albums, artists, folders, stats] = await Promise.all([
        window.api.library.getTracks({ limit: 500 }),
        window.api.library.getAlbums({ limit: 500 }),
        window.api.library.getArtists({ limit: 500 }),
        window.api.library.getFolders(),
        window.api.library.getStats(),
      ]);
      set({ tracks, albums, artists, folders, stats });
    } catch (err) {
      console.error('[library] refresh failed:', err);
    } finally {
      set({ loading: false });
    }
  },

  pickAndScan: async () => {
    const { canceled, folder } = await window.api.library.pickFolder();
    if (canceled || !folder) return;
    await get().scanFolder(folder);
  },

  scanFolder: async (folder: string) => {
    set({ scanning: true, scanProgress: { ...emptyProgress, done: false } });
    try {
      await window.api.library.scan(folder);
      // scanning stays true until the main process finishes the scan
      // and emits `library:scan-complete` (or `library:scan-error`).
    } catch (err) {
      console.error('[library] scan failed:', err);
      set({ scanning: false });
    }
  },

  removeFolder: async (folder: string) => {
    await window.api.library.removeFolder(folder);
    await get().refresh({ force: true });
  },

  startScanProgressPolling: () => {
    let active = true;
    let scanToastId: string | null = null;
    const toast = useToastStore.getState();
    const interval = setInterval(async () => {
      if (!active) return;
      const { scanning } = get();
      if (!scanning) {
        if (scanToastId) {
          toast.syncEnd(scanToastId);
          scanToastId = null;
        }
        clearInterval(interval);
        return;
      }
      try {
        const p = await window.api.library.scanProgress();
        set({ scanProgress: p });
        if (!scanToastId) {
          scanToastId = toast.syncStart('Scanning library…');
        } else {
          const fileCount = p.filesFound > 0 ? ` (${p.filesFound} files)` : '';
          toast.syncProgress(scanToastId, p.done ? 100 : Math.min(95, p.filesFound));
          toast.update(scanToastId, { message: `Scanning library${fileCount}…` });
        }
        if (p.done) {
          if (scanToastId) {
            toast.syncEnd(scanToastId);
            scanToastId = null;
          }
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 500);
    return () => {
      active = false;
      clearInterval(interval);
      if (scanToastId) {
        useToastStore.getState().syncEnd(scanToastId);
        scanToastId = null;
      }
    };
  },
}));

if (typeof window !== 'undefined' && window.api?.library?.onScanComplete) {
  window.api.library.onScanComplete(() => {
    const store = useLibraryStore.getState();
    store.setScanning(false);
    void store.refresh({ force: true });
  });
}

if (typeof window !== 'undefined' && window.api?.library?.onScanError) {
  window.api.library.onScanError(({ error }) => {
    useLibraryStore.getState().setScanning(false);
    useToastStore.getState().error(`Scan failed: ${error}`);
  });
}
