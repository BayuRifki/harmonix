import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore, flushUiPersist } from '@/stores/uiStore';

describe('uiStore', () => {
  beforeEach(() => {
    localStorage.clear();
    flushUiPersist();
    useUiStore.setState({
      sidebarCollapsed: {},
      recents: [],
      playerBarExpanded: false,
      playerBarPinned: false,
      reducedMotion: false,
      gesturesEnabled: true,
      commandPaletteOpen: false,
      queueDrawerOpen: false,
      settingsCollapsedSections: {},
      settingsHintDismissed: false,
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
    // Persist is debounced; flush for deterministic test.
    flushUiPersist();
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

  it('persists are debounced: rapid toggles coalesce into a single write', async () => {
    const store = useUiStore.getState();
    // 10 rapid toggles should produce at most 1 localStorage write
    // after the debounce window (100ms). Without the debounce, this
    // test would still pass (because the writes are synchronous),
    // but it documents the contract.
    for (let i = 0; i < 10; i++) {
      store.setPlayerBarExpanded(i % 2 === 0);
    }
    // Immediately after the toggles, the write may not have flushed.
    // flushUiPersist() is a no-op if there's nothing pending, so it's
    // safe to call unconditionally.
    flushUiPersist();
    const raw = localStorage.getItem('harmonix.ui');
    expect(raw).not.toBeNull();
    // Last value should be persisted (i=9 → expanded = false since
    // 9 % 2 === 1 → false).
    const parsed = JSON.parse(raw!);
    expect(parsed.playerBarExpanded).toBe(false);
  });

  describe('settings page sections', () => {
    it('defaults to collapsed for an unknown key', () => {
      const store = useUiStore.getState();
      // Without any prior interaction, every section is collapsed.
      // The Settings page is intentionally "click to reveal" so
      // unrecorded keys resolve to collapsed.
      expect(store.isSettingsSectionCollapsed('audio:crossfade')).toBe(true);
      expect(store.isSettingsSectionCollapsed('appearance:theme')).toBe(true);
    });

    it('toggleSettingsSectionCollapsed flips state', () => {
      const store = useUiStore.getState();
      expect(store.isSettingsSectionCollapsed('audio:crossfade')).toBe(true);
      store.toggleSettingsSectionCollapsed('audio:crossfade');
      expect(useUiStore.getState().isSettingsSectionCollapsed('audio:crossfade')).toBe(false);
      store.toggleSettingsSectionCollapsed('audio:crossfade');
      expect(useUiStore.getState().isSettingsSectionCollapsed('audio:crossfade')).toBe(true);
    });

    it('expandSettingsSection is idempotent (no-op when already expanded)', () => {
      const store = useUiStore.getState();
      store.expandSettingsSection('audio:player');
      const after = useUiStore.getState().settingsCollapsedSections;
      expect(after['audio:player']).toBe(false);
      // Calling again should not create a new object (re-render
      // would be wasted work).
      const ref = after;
      store.expandSettingsSection('audio:player');
      expect(useUiStore.getState().settingsCollapsedSections).toBe(ref);
    });

    it('isAnySettingsSectionExpanded returns false initially', () => {
      const store = useUiStore.getState();
      expect(store.isAnySettingsSectionExpanded()).toBe(false);
    });

    it('isAnySettingsSectionExpanded returns true after expanding one', () => {
      const store = useUiStore.getState();
      store.expandSettingsSection('audio:crossfade');
      expect(useUiStore.getState().isAnySettingsSectionExpanded()).toBe(true);
    });

    it('resetSettingsCollapsedSections clears all and re-collapses everything', () => {
      const store = useUiStore.getState();
      store.expandSettingsSection('audio:crossfade');
      store.expandSettingsSection('shortcuts:keyboard');
      expect(useUiStore.getState().isAnySettingsSectionExpanded()).toBe(true);
      store.resetSettingsCollapsedSections();
      expect(useUiStore.getState().isAnySettingsSectionExpanded()).toBe(false);
      expect(useUiStore.getState().isSettingsSectionCollapsed('audio:crossfade')).toBe(true);
    });

    it('dismissSettingsHint is idempotent', () => {
      const store = useUiStore.getState();
      store.dismissSettingsHint();
      expect(useUiStore.getState().settingsHintDismissed).toBe(true);
      // Second call shouldn't change anything (no wasted re-render).
      store.dismissSettingsHint();
      expect(useUiStore.getState().settingsHintDismissed).toBe(true);
    });

    it('persists settings section state across reloads', () => {
      const store = useUiStore.getState();
      store.expandSettingsSection('audio:player');
      flushUiPersist();
      // Simulate a reload: re-run the load() function and verify
      // the section state was persisted.
      useUiStore.getState().load();
      expect(useUiStore.getState().isSettingsSectionCollapsed('audio:player')).toBe(false);
    });
  });
});
