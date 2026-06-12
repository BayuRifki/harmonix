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
  miniPlayerEnabled: boolean;
  miniPlayerAlwaysOnTop: boolean;
  miniPlayerWidth: number;
  miniPlayerHeight: number;
  /**
   * Per-section collapsed state in the Settings page. The Settings
   * view is split into 5 tabs; each tab contains 1-3 sections.
   * Keys are namespaced: `<tabId>:<sectionId>` (e.g. `audio:crossfade`).
   * `true` = collapsed. Stored on the persisted state so user
   * choice survives reload.
   */
  settingsCollapsedSections: Record<string, boolean>;
  /**
   * First-time hint for the Settings page — shown until the user
   * expands at least one section. Persisted so it doesn't reappear
   * across reloads once dismissed.
   */
  settingsHintDismissed: boolean;
}

interface UiState extends PersistedUi {
  commandPaletteOpen: boolean;
  queueDrawerOpen: boolean;

  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  toggleCommandPalette: () => void;

  openQueueDrawer: () => void;
  closeQueueDrawer: () => void;
  toggleQueueDrawer: () => void;
  setQueueDrawerOpen: (v: boolean) => void;

  // The keyboard help overlay is owned by the keyboard settings
  // store; these no-op aliases exist so a single `useUiStore.reset()`
  // call still closes the help overlay deterministically without
  // requiring every consumer to import both stores.
  closeHelpOverlay: () => void;

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
  setMiniPlayerEnabled: (v: boolean) => void;
  setMiniPlayerAlwaysOnTop: (v: boolean) => void;
  setMiniPlayerWidth: (v: number) => void;
  setMiniPlayerHeight: (v: number) => void;

  // Settings page: per-section collapse + first-time hint.
  // The Settings view is split into 5 tabs; each tab has 1-3
  // collapsible sections. Collapse state is namespaced
  // `<tabId>:<sectionId>` so different tabs can have a section
  // with the same name without collision.
  toggleSettingsSectionCollapsed: (key: string) => void;
  expandSettingsSection: (key: string) => void;
  collapseSettingsSection: (key: string) => void;
  isSettingsSectionCollapsed: (key: string) => boolean;
  isAnySettingsSectionExpanded: () => boolean;
  resetSettingsCollapsedSections: () => void;
  dismissSettingsHint: () => void;

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
  miniPlayerEnabled: true,
  miniPlayerAlwaysOnTop: false,
  miniPlayerWidth: 360,
  miniPlayerHeight: 120,
  // Every Settings section starts collapsed; the user must click
  // to expand. This is the intended default for the tabbed
  // Settings redesign (was: every section always visible, causing
  // the page to overflow on smaller viewports with a large blank
  // "below the fold" gap). The first-time hint ("Click a section
  // to expand") guides the user until they expand one.
  settingsCollapsedSections: {},
  settingsHintDismissed: false,
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
      miniPlayerEnabled: typeof p.miniPlayerEnabled === 'boolean' ? p.miniPlayerEnabled : true,
      miniPlayerAlwaysOnTop:
        typeof p.miniPlayerAlwaysOnTop === 'boolean' ? p.miniPlayerAlwaysOnTop : false,
      miniPlayerWidth: typeof p.miniPlayerWidth === 'number' ? p.miniPlayerWidth : 360,
      miniPlayerHeight: typeof p.miniPlayerHeight === 'number' ? p.miniPlayerHeight : 120,
      settingsCollapsedSections:
        typeof p.settingsCollapsedSections === 'object' && p.settingsCollapsedSections !== null
          ? (p.settingsCollapsedSections as Record<string, boolean>)
          : {},
      settingsHintDismissed:
        typeof p.settingsHintDismissed === 'boolean' ? p.settingsHintDismissed : false,
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

/**
 * Debounced persist. Without this, every setting toggle would
 * synchronously stringify the entire persisted state (~30 keys,
 * several arrays) and write to `localStorage` immediately.
 * `localStorage.setItem` is blocking; on slow disks the user
 * perceives a frame stutter when toggling a theme switch.
 * 100ms coalesces rapid toggles (e.g. someone scrubbing a slider
 * in the Settings panel) into at most ~10 writes/sec.
 */
const PERSIST_DEBOUNCE_MS = 100;
let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistPending: PersistedUi | null = null;

function schedulePersist(snapshot: PersistedUi): void {
  persistPending = snapshot;
  if (persistTimer !== null) return;
  persistTimer = setTimeout(() => {
    if (persistPending) {
      persist(persistPending);
      persistPending = null;
    }
    persistTimer = null;
  }, PERSIST_DEBOUNCE_MS);
}

/**
 * Synchronously flush any pending debounced write. Called from
 * `beforeunload` / `pagehide` so we never lose the last toggle
 * (e.g. reduced motion flipped then window closed within 100ms).
 */
export function flushUiPersist(): void {
  if (persistTimer !== null) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (persistPending) {
    persist(persistPending);
    persistPending = null;
  }
}

if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  const flush = (): void => flushUiPersist();
  window.addEventListener('beforeunload', flush);
  window.addEventListener('pagehide', flush);
}

const RECENTS_LIMIT = 8;
const RECENTS_DEDUPE_PREFIX = '/';

export const useUiStore = create<UiState>((set, get) => ({
  ...DEFAULTS,
  commandPaletteOpen: false,
  queueDrawerOpen: false,

  openCommandPalette: () => set({ commandPaletteOpen: true }),
  closeCommandPalette: () => set({ commandPaletteOpen: false }),
  toggleCommandPalette: () => set((s) => ({ commandPaletteOpen: !s.commandPaletteOpen })),

  openQueueDrawer: () => set({ queueDrawerOpen: true }),
  closeQueueDrawer: () => set({ queueDrawerOpen: false }),
  toggleQueueDrawer: () => set((s) => ({ queueDrawerOpen: !s.queueDrawerOpen })),
  setQueueDrawerOpen: (v) => set({ queueDrawerOpen: v }),

  // No-op: the help overlay is owned by useKeyboardSettingsStore. We
  // forward the call so a single `useUiStore.reset()` still closes it.
  closeHelpOverlay: () => {
    try {
      // Lazy-import to avoid a circular module dependency.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useKeyboardSettingsStore } = require('@/stores/keyboardSettingsStore') as {
        useKeyboardSettingsStore: { getState: () => { closeHelp: () => void } };
      };
      useKeyboardSettingsStore.getState().closeHelp();
    } catch {
      // Ignore — store may not be loaded in a test environment.
    }
  },

  toggleSidebarSection: (key) => {
    const current = get().sidebarCollapsed[key] ?? false;
    const next = { ...get().sidebarCollapsed, [key]: !current };
    set({ sidebarCollapsed: next });
    schedulePersist({ ...get(), sidebarCollapsed: next });
  },

  isSidebarSectionCollapsed: (key) => get().sidebarCollapsed[key] ?? false,

  pushRecent: (path) => {
    if (!path || path === '/') return;
    const filtered = get().recents.filter((p) => p !== path);
    const next = [path, ...filtered].slice(0, RECENTS_LIMIT);
    set({ recents: next });
    schedulePersist({ ...get(), recents: next });
  },

  clearRecents: () => {
    set({ recents: [] });
    schedulePersist({ ...get(), recents: [] });
  },

  setPlayerBarExpanded: (v) => {
    set({ playerBarExpanded: v });
    schedulePersist({ ...get(), playerBarExpanded: v });
  },

  setPlayerBarPinned: (v) => {
    set({ playerBarPinned: v });
    schedulePersist({ ...get(), playerBarPinned: v });
  },

  setReducedMotion: (v) => {
    set({ reducedMotion: v });
    schedulePersist({ ...get(), reducedMotion: v });
  },

  setGesturesEnabled: (v) => {
    set({ gesturesEnabled: v });
    schedulePersist({ ...get(), gesturesEnabled: v });
  },

  setNavOrder: (order) => {
    set({ navOrder: order });
    schedulePersist({ ...get(), navOrder: order });
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
      schedulePersist({ ...get(), navOrder: order });
    }
  },
  resetNavOrder: () => {
    set({ navOrder: DEFAULT_NAV_ORDER });
    schedulePersist({ ...get(), navOrder: DEFAULT_NAV_ORDER });
  },

  setShowBreadcrumbs: (v) => {
    set({ showBreadcrumbs: v });
    schedulePersist({ ...get(), showBreadcrumbs: v });
  },
  setSidebarLayout: (v) => {
    set({ sidebarLayout: v });
    schedulePersist({ ...get(), sidebarLayout: v });
  },

  setVisualizerQuality: (v) => {
    set({ visualizerQuality: v });
    schedulePersist({ ...get(), visualizerQuality: v });
  },
  setAnimationIntensity: (v) => {
    set({ animationIntensity: v });
    schedulePersist({ ...get(), animationIntensity: v });
  },
  setGlassIntensity: (v) => {
    set({ glassIntensity: v });
    schedulePersist({ ...get(), glassIntensity: v });
  },
  setThemeAccentMode: (v) => {
    set({ themeAccentMode: v });
    schedulePersist({ ...get(), themeAccentMode: v });
  },
  setCustomAccentHex: (v) => {
    if (!isValidHex(v)) return;
    set({ customAccentHex: v });
    schedulePersist({ ...get(), customAccentHex: v });
  },
  setEnabledVisualizer: (key, v) => {
    const next = { ...get().enabledVisualizers, [key]: v };
    set({ enabledVisualizers: next });
    schedulePersist({ ...get(), enabledVisualizers: next });
  },
  setShowExitAnimations: (v) => {
    set({ showExitAnimations: v });
    schedulePersist({ ...get(), showExitAnimations: v });
  },
  setShowSnapPoints: (v) => {
    set({ showSnapPoints: v });
    schedulePersist({ ...get(), showSnapPoints: v });
  },
  setShowScrollIndicators: (v) => {
    set({ showScrollIndicators: v });
    schedulePersist({ ...get(), showScrollIndicators: v });
  },
  setMiniPlayerEnabled: (v) => {
    set({ miniPlayerEnabled: v });
    schedulePersist({ ...get(), miniPlayerEnabled: v });
  },
  setMiniPlayerAlwaysOnTop: (v) => {
    set({ miniPlayerAlwaysOnTop: v });
    schedulePersist({ ...get(), miniPlayerAlwaysOnTop: v });
  },
  setMiniPlayerWidth: (v) => {
    set({ miniPlayerWidth: v });
    schedulePersist({ ...get(), miniPlayerWidth: v });
  },
  setMiniPlayerHeight: (v) => {
    set({ miniPlayerHeight: v });
    schedulePersist({ ...get(), miniPlayerHeight: v });
  },

  // ----- Settings page (per-section collapse + first-time hint) -----
  toggleSettingsSectionCollapsed: (key) => {
    // Read the current state to compute the new value, then
    // update atomically. Doing two `set` calls in sequence would
    // race with the debounced persist and could write a stale
    // snapshot to localStorage.
    const current = get().settingsCollapsedSections[key] !== false;
    const next = { ...get().settingsCollapsedSections, [key]: !current };
    set({ settingsCollapsedSections: next });
    schedulePersist({ ...get(), settingsCollapsedSections: next });
  },
  expandSettingsSection: (key) => {
    if (get().settingsCollapsedSections[key] === false) return;
    const next = { ...get().settingsCollapsedSections, [key]: false };
    set({ settingsCollapsedSections: next });
    schedulePersist({ ...get(), settingsCollapsedSections: next });
  },
  collapseSettingsSection: (key) => {
    if (get().settingsCollapsedSections[key] === true) return;
    const next = { ...get().settingsCollapsedSections, [key]: true };
    set({ settingsCollapsedSections: next });
    schedulePersist({ ...get(), settingsCollapsedSections: next });
  },
  isSettingsSectionCollapsed: (key) => {
    // Default: collapsed (true) when no entry exists. The Settings
    // view deliberately starts in a "click to reveal" state, so
    // any unrecorded key resolves to collapsed.
    return get().settingsCollapsedSections[key] !== false;
  },
  isAnySettingsSectionExpanded: () => {
    // True if at least one section is explicitly expanded.
    // Used to decide whether to show the first-time hint.
    return Object.values(get().settingsCollapsedSections).some((v) => v === false);
  },
  resetSettingsCollapsedSections: () => {
    set({ settingsCollapsedSections: {} });
    schedulePersist({ ...get(), settingsCollapsedSections: {} });
  },
  dismissSettingsHint: () => {
    if (get().settingsHintDismissed) return;
    set({ settingsHintDismissed: true });
    schedulePersist({ ...get(), settingsHintDismissed: true });
  },

  load: () => {
    const data = load();
    set(data);
  },
  reset: () => {
    set({ ...DEFAULTS, commandPaletteOpen: false, queueDrawerOpen: false });
    // Reset is a user-initiated explicit action; persist immediately
    // (bypass the debounce) so a hard-refresh shows the defaults.
    flushUiPersist();
    persist(DEFAULTS);
    // Also close the help overlay (owned by a different store).
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { useKeyboardSettingsStore } = require('@/stores/keyboardSettingsStore') as {
        useKeyboardSettingsStore: { getState: () => { closeHelp: () => void } };
      };
      useKeyboardSettingsStore.getState().closeHelp();
    } catch {
      // ignore in tests
    }
  },
}));

export const RECENT_PATH_PREFIX = RECENTS_DEDUPE_PREFIX;
export { DEFAULT_NAV_ORDER };
