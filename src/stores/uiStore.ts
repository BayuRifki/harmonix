import { create } from 'zustand';

const STORAGE_KEY = 'harmonix.ui';

interface PersistedUi {
  sidebarCollapsed: Record<string, boolean>;
  recents: string[];
  playerBarExpanded: boolean;
  playerBarPinned: boolean;
  reducedMotion: boolean;
  gesturesEnabled: boolean;
}

interface UiState extends PersistedUi {
  commandPaletteOpen: boolean;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;
  toggleSidebarSection: (key: string) => void;
  isSidebarSectionCollapsed: (key: string) => boolean;
  pushRecent: (path: string) => void;
  clearRecents: () => void;
  setPlayerBarExpanded: (v: boolean) => void;
  setPlayerBarPinned: (v: boolean) => void;
  setReducedMotion: (v: boolean) => void;
  setGesturesEnabled: (v: boolean) => void;
  load: () => void;
}

const DEFAULTS: PersistedUi = {
  sidebarCollapsed: {},
  recents: [],
  playerBarExpanded: false,
  playerBarPinned: false,
  reducedMotion: false,
  gesturesEnabled: true,
};

function load(): PersistedUi {
  if (typeof localStorage === 'undefined') return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return DEFAULTS;
    const p = parsed as Partial<PersistedUi>;
    return {
      sidebarCollapsed:
        typeof p.sidebarCollapsed === 'object' && p.sidebarCollapsed !== null
          ? (p.sidebarCollapsed as Record<string, boolean>)
          : {},
      recents: Array.isArray(p.recents)
        ? p.recents.filter((r): r is string => typeof r === 'string')
        : [],
      playerBarExpanded: typeof p.playerBarExpanded === 'boolean' ? p.playerBarExpanded : false,
      playerBarPinned: typeof p.playerBarPinned === 'boolean' ? p.playerBarPinned : false,
      reducedMotion: typeof p.reducedMotion === 'boolean' ? p.reducedMotion : false,
      gesturesEnabled: typeof p.gesturesEnabled === 'boolean' ? p.gesturesEnabled : true,
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(state: PersistedUi): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

const RECENTS_LIMIT = 8;
const RECENTS_DEDUPE_PREFIX = '/';

export const useUiStore = create<UiState>((set, get) => ({
  ...DEFAULTS,
  commandPaletteOpen: false,

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  toggleSidebarSection: (key) => {
    const current = get().sidebarCollapsed[key] ?? false;
    const next = { ...get().sidebarCollapsed, [key]: !current };
    set({ sidebarCollapsed: next });
    persist({ ...get(), sidebarCollapsed: next });
  },

  isSidebarSectionCollapsed: (key) => get().sidebarCollapsed[key] ?? false,

  pushRecent: (path) => {
    if (!path || path === '/') return;
    const filtered = get().recents.filter((p) => p !== path);
    const next = [path, ...filtered].slice(0, RECENTS_LIMIT);
    set({ recents: next });
    persist({ ...get(), recents: next });
  },

  clearRecents: () => {
    set({ recents: [] });
    persist({ ...get(), recents: [] });
  },

  setPlayerBarExpanded: (v) => {
    set({ playerBarExpanded: v });
    persist({ ...get(), playerBarExpanded: v });
  },

  setPlayerBarPinned: (v) => {
    set({ playerBarPinned: v });
    persist({ ...get(), playerBarPinned: v });
  },

  setReducedMotion: (v) => {
    set({ reducedMotion: v });
    persist({ ...get(), reducedMotion: v });
  },

  setGesturesEnabled: (v) => {
    set({ gesturesEnabled: v });
    persist({ ...get(), gesturesEnabled: v });
  },

  load: () => {
    const data = load();
    set(data);
  },
}));

export const RECENT_PATH_PREFIX = RECENTS_DEDUPE_PREFIX;
