import { describe, it, expect, beforeEach } from 'vitest';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { SHORTCUT_IDS, type ShortcutId } from '@/hooks/keyboardShortcuts';

describe('keyboardSettingsStore', () => {
  beforeEach(() => {
    localStorage.clear();
    const allEnabled = SHORTCUT_IDS.reduce(
      (acc, id) => {
        acc[id] = true;
        return acc;
      },
      {} as Record<ShortcutId, boolean>,
    );
    useKeyboardSettingsStore.setState({
      enabled: allEnabled,
      helpOpen: false,
    });
  });

  it('enables all shortcuts by default', () => {
    const { enabled } = useKeyboardSettingsStore.getState();
    for (const id of SHORTCUT_IDS) {
      expect(enabled[id]).toBe(true);
    }
  });

  it('isEnabled returns true for enabled shortcuts', () => {
    expect(useKeyboardSettingsStore.getState().isEnabled('play_pause')).toBe(true);
  });

  it('toggle flips a shortcut enabled state', () => {
    useKeyboardSettingsStore.getState().toggle('play_pause');
    expect(useKeyboardSettingsStore.getState().enabled.play_pause).toBe(false);
    useKeyboardSettingsStore.getState().toggle('play_pause');
    expect(useKeyboardSettingsStore.getState().enabled.play_pause).toBe(true);
  });

  it('setEnabled sets a specific value', () => {
    useKeyboardSettingsStore.getState().setEnabled('mute_toggle', false);
    expect(useKeyboardSettingsStore.getState().enabled.mute_toggle).toBe(false);
    useKeyboardSettingsStore.getState().setEnabled('mute_toggle', true);
    expect(useKeyboardSettingsStore.getState().enabled.mute_toggle).toBe(true);
  });

  it('resetDefaults re-enables everything', () => {
    useKeyboardSettingsStore.getState().setEnabled('play_pause', false);
    useKeyboardSettingsStore.getState().setEnabled('mute_toggle', false);
    useKeyboardSettingsStore.getState().resetDefaults();
    for (const id of SHORTCUT_IDS) {
      expect(useKeyboardSettingsStore.getState().enabled[id]).toBe(true);
    }
  });

  it('help overlay can be opened, closed, and toggled', () => {
    useKeyboardSettingsStore.getState().openHelp();
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(true);
    useKeyboardSettingsStore.getState().closeHelp();
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(false);
    useKeyboardSettingsStore.getState().toggleHelp();
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(true);
  });
});
