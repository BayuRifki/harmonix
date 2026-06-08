import { describe, it, expect, beforeEach } from 'vitest';
import { useUiStore, DEFAULT_NAV_ORDER } from '@/stores/uiStore';

function reset(): void {
  useUiStore.setState({
    navOrder: DEFAULT_NAV_ORDER,
    enabledVisualizers: { playerBar: true, nowPlaying: true, home: true },
    showSnapPoints: true,
    showScrollIndicators: true,
    showExitAnimations: true,
    themeAccentMode: 'auto',
    customAccentHex: '#EC4899',
    visualizerQuality: 'auto',
    animationIntensity: 'full',
    glassIntensity: 'strong',
    sidebarLayout: 'default',
    gesturesEnabled: true,
    showBreadcrumbs: true,
  });
}

describe('uiStore extended fields', () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  it('reorderNav moves a path to a new position', () => {
    const { reorderNav, navOrder } = useUiStore.getState();
    const from = navOrder[0] ?? '/';
    const to = navOrder[2] ?? '/library';
    reorderNav(from, to);
    const next = useUiStore.getState().navOrder;
    expect(next.indexOf(from)).toBe(navOrder.indexOf(to));
  });

  it('reorderNav is a no-op when from is unknown', () => {
    const before = useUiStore.getState().navOrder;
    useUiStore.getState().reorderNav('/unknown', '/');
    expect(useUiStore.getState().navOrder).toEqual(before);
  });

  it('reorderNav is a no-op when to equals from', () => {
    const before = useUiStore.getState().navOrder;
    useUiStore.getState().reorderNav('/', '/');
    expect(useUiStore.getState().navOrder).toEqual(before);
  });

  it('setNavOrder persists custom order', () => {
    useUiStore.getState().setNavOrder(['/settings', '/', '/library']);
    expect(useUiStore.getState().navOrder).toEqual(['/settings', '/', '/library']);
  });

  it('resetNavOrder restores default order', () => {
    useUiStore.getState().setNavOrder(['/settings', '/', '/library']);
    useUiStore.getState().resetNavOrder();
    expect(useUiStore.getState().navOrder).toEqual(DEFAULT_NAV_ORDER);
  });

  it('setEnabledVisualizer toggles per-key flag', () => {
    useUiStore.getState().setEnabledVisualizer('nowPlaying', false);
    expect(useUiStore.getState().enabledVisualizers.nowPlaying).toBe(false);
    expect(useUiStore.getState().enabledVisualizers.playerBar).toBe(true);
  });

  it('setThemeAccentMode switches modes', () => {
    useUiStore.getState().setThemeAccentMode('brand');
    expect(useUiStore.getState().themeAccentMode).toBe('brand');
  });

  it('setCustomAccentHex validates hex format', () => {
    useUiStore.getState().setCustomAccentHex('not-a-color');
    expect(useUiStore.getState().customAccentHex).toBe('#EC4899');
    useUiStore.getState().setCustomAccentHex('#aabbcc');
    expect(useUiStore.getState().customAccentHex).toBe('#aabbcc');
  });

  it('setVisualizerQuality accepts valid tiers', () => {
    useUiStore.getState().setVisualizerQuality('high');
    expect(useUiStore.getState().visualizerQuality).toBe('high');
    useUiStore.getState().setVisualizerQuality('low');
    expect(useUiStore.getState().visualizerQuality).toBe('low');
  });

  it('setSidebarLayout accepts valid layouts', () => {
    useUiStore.getState().setSidebarLayout('compact');
    expect(useUiStore.getState().sidebarLayout).toBe('compact');
  });

  it('setGesturesEnabled toggles', () => {
    useUiStore.getState().setGesturesEnabled(false);
    expect(useUiStore.getState().gesturesEnabled).toBe(false);
  });

  it('persists across loads from localStorage', () => {
    useUiStore.getState().setVisualizerQuality('off');
    useUiStore.getState().setGlassIntensity('subtle');
    useUiStore.getState().load();
    expect(useUiStore.getState().visualizerQuality).toBe('off');
    expect(useUiStore.getState().glassIntensity).toBe('subtle');
  });

  it('falls back to defaults for corrupt payload', () => {
    localStorage.setItem('harmonix.ui', 'not-json');
    useUiStore.getState().load();
    expect(useUiStore.getState().navOrder).toEqual(DEFAULT_NAV_ORDER);
    expect(useUiStore.getState().visualizerQuality).toBe('auto');
  });

  it('falls back to defaults for invalid enum values', () => {
    localStorage.setItem(
      'harmonix.ui',
      JSON.stringify({
        visualizerQuality: 'nonsense',
        sidebarLayout: 'nonsense',
        themeAccentMode: 'nonsense',
      }),
    );
    useUiStore.getState().load();
    expect(useUiStore.getState().visualizerQuality).toBe('auto');
    expect(useUiStore.getState().sidebarLayout).toBe('default');
    expect(useUiStore.getState().themeAccentMode).toBe('auto');
  });
});
