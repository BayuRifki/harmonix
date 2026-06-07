import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    useUiStore.setState({
      sidebarCollapsed: {},
      recents: [],
      playerBarExpanded: false,
      playerBarPinned: false,
      reducedMotion: false,
      gesturesEnabled: true,
      commandPaletteOpen: false,
    });
  });

  it('opens and closes the command palette', () => {
    const store = useUiStore.getState();
    expect(store.commandPaletteOpen).toBe(false);
    store.openCommandPalette();
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    store.closeCommandPalette();
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('toggles the command palette', () => {
    const store = useUiStore.getState();
    store.toggleCommandPalette();
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    store.toggleCommandPalette();
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('toggles a sidebar section collapsed state', () => {
    const store = useUiStore.getState();
    expect(store.isSidebarSectionCollapsed('playlists')).toBe(false);
    store.toggleSidebarSection('playlists');
    expect(useUiStore.getState().isSidebarSectionCollapsed('playlists')).toBe(true);
    store.toggleSidebarSection('playlists');
    expect(useUiStore.getState().isSidebarSectionCollapsed('playlists')).toBe(false);
  });

  it('persists sidebar section state independently', () => {
    const store = useUiStore.getState();
    store.toggleSidebarSection('a');
    store.toggleSidebarSection('b');
    expect(useUiStore.getState().isSidebarSectionCollapsed('a')).toBe(true);
    expect(useUiStore.getState().isSidebarSectionCollapsed('b')).toBe(true);
    store.toggleSidebarSection('a');
    expect(useUiStore.getState().isSidebarSectionCollapsed('a')).toBe(false);
    expect(useUiStore.getState().isSidebarSectionCollapsed('b')).toBe(true);
  });

  it('pushes recent paths and dedupes', () => {
    const store = useUiStore.getState();
    store.pushRecent('/library');
    store.pushRecent('/settings');
    store.pushRecent('/library');
    const recents = useUiStore.getState().recents;
    expect(recents[0]).toBe('/library');
    expect(recents[1]).toBe('/settings');
    expect(recents.length).toBe(2);
  });

  it('ignores "/" path', () => {
    const store = useUiStore.getState();
    store.pushRecent('/');
    expect(useUiStore.getState().recents).toEqual([]);
  });

  it('caps recents at 8', () => {
    const store = useUiStore.getState();
    for (let i = 0; i < 12; i++) {
      store.pushRecent(`/p${i}`);
    }
    expect(useUiStore.getState().recents.length).toBe(8);
    expect(useUiStore.getState().recents[0]).toBe('/p11');
  });

  it('clears recents', () => {
    const store = useUiStore.getState();
    store.pushRecent('/library');
    store.pushRecent('/settings');
    store.clearRecents();
    expect(useUiStore.getState().recents).toEqual([]);
  });

  it('sets player bar expanded/pinned', () => {
    const store = useUiStore.getState();
    store.setPlayerBarExpanded(true);
    expect(useUiStore.getState().playerBarExpanded).toBe(true);
    store.setPlayerBarPinned(true);
    expect(useUiStore.getState().playerBarPinned).toBe(true);
  });

  it('sets reduced motion preference', () => {
    const store = useUiStore.getState();
    store.setReducedMotion(true);
    expect(useUiStore.getState().reducedMotion).toBe(true);
  });

  it('sets gestures enabled preference', () => {
    const store = useUiStore.getState();
    store.setGesturesEnabled(false);
    expect(useUiStore.getState().gesturesEnabled).toBe(false);
  });

  it('persists state to localStorage', () => {
    const store = useUiStore.getState();
    store.pushRecent('/library');
    store.toggleSidebarSection('playlists');
    const raw = localStorage.getItem('harmonix.ui');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.recents).toEqual(['/library']);
    expect(parsed.sidebarCollapsed.playlists).toBe(true);
  });

  it('load() restores state from localStorage', () => {
    localStorage.setItem(
      'harmonix.ui',
      JSON.stringify({
        sidebarCollapsed: { x: true },
        recents: ['/settings'],
        playerBarExpanded: true,
        playerBarPinned: false,
        reducedMotion: true,
        gesturesEnabled: false,
      }),
    );
    useUiStore.getState().load();
    const s = useUiStore.getState();
    expect(s.recents).toEqual(['/settings']);
    expect(s.isSidebarSectionCollapsed('x')).toBe(true);
    expect(s.playerBarExpanded).toBe(true);
    expect(s.reducedMotion).toBe(true);
    expect(s.gesturesEnabled).toBe(false);
  });

  it('load() falls back to defaults for corrupted storage', () => {
    localStorage.setItem('harmonix.ui', 'not json');
    useUiStore.getState().load();
    const s = useUiStore.getState();
    expect(s.recents).toEqual([]);
    expect(s.playerBarExpanded).toBe(false);
    expect(s.gesturesEnabled).toBe(true);
  });
});
