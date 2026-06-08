import { create } from 'zustand';

const STORAGE_KEY = 'harmonix.ui';

export type ThemeAccentMode = 'auto' | 'brand' | 'custom';
export type SidebarLayout = 'default' | 'compact' | 'sectioned';
export type VisualizerQuality = 'auto' | 'high' | 'low' | 'off';
export type AnimationIntensity = 'full' | 'reduced' | 'off';
export type GlassIntensity = 'off' | 'subtle' | 'strong';

interface PersistedUi {
  sidebarCollapsed: Record<string, boolean>;
  recents: string[];
  playerBarExpanded: boolean;
  playerBarPinned: boolean;
  reducedMotion: boolean;
  gesturesEnabled: boolean;
  navOrder: string[];
  showBreadcrumbs: boolean;
  sidebarLayout: SidebarLayout;
  visualizerQuality: VisualizerQuality;
  animationIntensity: AnimationIntensity;
  glassIntensity: GlassIntensity;
  themeAccentMode: ThemeAccentMode;
  customAccentHex: string;
  enabledVisualizers: { playerBar: boolean; nowPlaying: boolean; home: boolean };
  showExitAnimations: boolean;
  showSnapPoints: boolean;
  showScrollIndicators: boolean;
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

  setNavOrder: (order: string[]) => void;
  reorderNav: (from: string, to: string) => void;
  resetNavOrder: () => void;
  setShowBreadcrumbs: (v: boolean) => void;
  setSidebarLayout: (v: SidebarLayout) => void;

  setVisualizerQuality: (v: VisualizerQuality) => void;
  setAnimationIntensity: (v: AnimationIntensity) => void;
  setGlassIntensity: (v: GlassIntensity) => void;
  setThemeAccentMode: (v: ThemeAccentMode) => void;
  setCustomAccentHex: (v: string) => void;
  setEnabledVisualizer: (key: 'playerBar' | 'nowPlaying' | 'home', v: boolean) => void;
  setShowExitAnimations: (v: boolean) => void;
  setShowSnapPoints: (v: boolean) => void;
  setShowScrollIndicators: (v: boolean) => void;

  load: () => void;
  reset: () => void;
}

const DEFAULT_NAV_ORDER = [
  '/',
  '/explore',
  '/library',
  '/favorites',
  '/playlists',
  '/equalizer',
  '/settings',
];

const DEFAULTS: PersistedUi = {
  sidebarCollapsed: {},
  recents: [],
  playerBarExpanded: false,
  playerBarPinned: false,
  reducedMotion: false,
  gesturesEnabled: true,
  navOrder: DEFAULT_NAV_ORDER,
  showBreadcrumbs: true,
  sidebarLayout: 'default',
  visualizerQuality: 'auto',
  animationIntensity: 'full',
  glassIntensity: 'strong',
  themeAccentMode: 'auto',
  customAccentHex: '#EC4899',
  enabledVisualizers: { playerBar: true, nowPlaying: true, home: true },
  showExitAnimations: true,
  showSnapPoints: true,
  showScrollIndicators: true,
};

function isValidHex(v: unknown): v is string {
  return typeof v === 'string' && /^#([0-9a-fA-F]{3}){1,2}$/.test(v);
}

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
      navOrder: Array.isArray(p.navOrder)
        ? p.navOrder.filter((r): r is string => typeof r === 'string')
        : DEFAULT_NAV_ORDER,
      showBreadcrumbs: typeof p.showBreadcrumbs === 'boolean' ? p.showBreadcrumbs : true,
      sidebarLayout: (['default', 'compact', 'sectioned'] as const).includes(
        p.sidebarLayout as SidebarLayout,
      )
        ? (p.sidebarLayout as SidebarLayout)
        : 'default',
      visualizerQuality: (['auto', 'high', 'low', 'off'] as const).includes(
        p.visualizerQuality as VisualizerQuality,
      )
        ? (p.visualizerQuality as VisualizerQuality)
        : 'auto',
      animationIntensity: (['full', 'reduced', 'off'] as const).includes(
        p.animationIntensity as AnimationIntensity,
      )
        ? (p.animationIntensity as AnimationIntensity)
        : 'full',
      glassIntensity: (['off', 'subtle', 'strong'] as const).includes(
        p.glassIntensity as GlassIntensity,
      )
        ? (p.glassIntensity as GlassIntensity)
        : 'strong',
      themeAccentMode: (['auto', 'brand', 'custom'] as const).includes(
        p.themeAccentMode as ThemeAccentMode,
      )
        ? (p.themeAccentMode as ThemeAccentMode)
        : 'auto',
      customAccentHex: isValidHex(p.customAccentHex) ? p.customAccentHex : '#EC4899',
      enabledVisualizers: {
        playerBar: p.enabledVisualizers?.playerBar !== false,
        nowPlaying: p.enabledVisualizers?.nowPlaying !== false,
        home: p.enabledVisualizers?.home !== false,
      },
      showExitAnimations: typeof p.showExitAnimations === 'boolean' ? p.showExitAnimations : true,
      showSnapPoints: typeof p.showSnapPoints === 'boolean' ? p.showSnapPoints : true,
      showScrollIndicators:
        typeof p.showScrollIndicators === 'boolean' ? p.showScrollIndicators : true,
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

  setNavOrder: (order) => {
    set({ navOrder: order });
    persist({ ...get(), navOrder: order });
  },
  reorderNav: (from, to) => {
    const order = get().navOrder.slice();
    const fromIdx = order.indexOf(from);
    const toIdx = order.indexOf(to);
    if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return;
    const [moved] = order.splice(fromIdx, 1);
    if (moved !== undefined) {
      order.splice(toIdx, 0, moved);
      set({ navOrder: order });
      persist({ ...get(), navOrder: order });
    }
  },
  resetNavOrder: () => {
    set({ navOrder: DEFAULT_NAV_ORDER });
    persist({ ...get(), navOrder: DEFAULT_NAV_ORDER });
  },

  setShowBreadcrumbs: (v) => {
    set({ showBreadcrumbs: v });
    persist({ ...get(), showBreadcrumbs: v });
  },
  setSidebarLayout: (v) => {
    set({ sidebarLayout: v });
    persist({ ...get(), sidebarLayout: v });
  },

  setVisualizerQuality: (v) => {
    set({ visualizerQuality: v });
    persist({ ...get(), visualizerQuality: v });
  },
  setAnimationIntensity: (v) => {
    set({ animationIntensity: v });
    persist({ ...get(), animationIntensity: v });
  },
  setGlassIntensity: (v) => {
    set({ glassIntensity: v });
    persist({ ...get(), glassIntensity: v });
  },
  setThemeAccentMode: (v) => {
    set({ themeAccentMode: v });
    persist({ ...get(), themeAccentMode: v });
  },
  setCustomAccentHex: (v) => {
    if (!isValidHex(v)) return;
    set({ customAccentHex: v });
    persist({ ...get(), customAccentHex: v });
  },
  setEnabledVisualizer: (key, v) => {
    const next = { ...get().enabledVisualizers, [key]: v };
    set({ enabledVisualizers: next });
    persist({ ...get(), enabledVisualizers: next });
  },
  setShowExitAnimations: (v) => {
    set({ showExitAnimations: v });
    persist({ ...get(), showExitAnimations: v });
  },
  setShowSnapPoints: (v) => {
    set({ showSnapPoints: v });
    persist({ ...get(), showSnapPoints: v });
  },
  setShowScrollIndicators: (v) => {
    set({ showScrollIndicators: v });
    persist({ ...get(), showScrollIndicators: v });
  },

  load: () => {
    const data = load();
    set(data);
  },
  reset: () => {
    set({ ...DEFAULTS, commandPaletteOpen: false });
    persist(DEFAULTS);
  },
}));

export const RECENT_PATH_PREFIX = RECENTS_DEDUPE_PREFIX;
export { DEFAULT_NAV_ORDER };
