import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { installMockWindowApi } from '../setup';
import { useUiStore } from '@/stores/uiStore';

describe('useKeyboardShortcuts integration: Q shortcut', () => {
  beforeEach(() => {
    installMockWindowApi();
    useUiStore.setState({ queueDrawerOpen: false });
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('KeyQ toggles the queue drawer (regression: previously opened help overlay)', async () => {
    const { useKeyboardShortcuts } = await import('@/hooks/useKeyboardShortcuts');
    renderHook(() => useKeyboardShortcuts());
    expect(useUiStore.getState().queueDrawerOpen).toBe(false);
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyQ', key: 'q', bubbles: true }));
    // The default binding (queue_toggle → KeyQ) should now open
    // the queue drawer. Before the fix, it called openHelp
    // (which lived in useKeyboardSettingsStore and would not
    // flip queueDrawerOpen here).
    expect(useUiStore.getState().queueDrawerOpen).toBe(true);
  });
});
