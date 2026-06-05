import { create } from 'zustand';
import type { Track } from '@shared/index';
import type { ScanFolder, AlbumSummary, ArtistSummary, ScanProgress, LibraryStats } from '@/types/global';

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

  refresh: () => Promise<void>;
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

  refresh: async () => {
    set({ loading: true });
    try {
      const [tracks, albums, artists, folders, stats] = await Promise.all([
        window.api.library.getTracks({ limit: 1000 }),
        window.api.library.getAlbums(),
        window.api.library.getArtists(),
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
      await get().refresh();
    } catch (err) {
      console.error('[library] scan failed:', err);
    } finally {
      set({ scanning: false });
    }
  },

  removeFolder: async (folder: string) => {
    await window.api.library.removeFolder(folder);
    await get().refresh();
  },

  startScanProgressPolling: () => {
    const interval = setInterval(async () => {
      const { scanning } = get();
      if (!scanning) {
        clearInterval(interval);
        return;
      }
      try {
        const p = await window.api.library.scanProgress();
        set({ scanProgress: p });
        if (p.done) {
          clearInterval(interval);
        }
      } catch {
        // ignore
      }
    }, 500);
    return () => clearInterval(interval);
  },
}));
