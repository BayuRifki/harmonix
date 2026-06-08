import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { KeyboardHelpOverlay } from '@/components/keyboard/KeyboardHelpOverlay';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { SHORTCUT_DEFINITIONS, SHORTCUT_CATEGORIES } from '@/hooks/keyboardShortcuts';

describe('KeyboardHelpOverlay', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useKeyboardSettingsStore.getState().closeHelp();
    useKeyboardSettingsStore.getState().resetDefaults();
  });

  it('is not in the DOM when help is closed', () => {
    const { queryByTestId } = render(<KeyboardHelpOverlay />);
    expect(queryByTestId('keyboard-help-overlay')).toBeNull();
  });

  it('renders when help is open', () => {
    useKeyboardSettingsStore.getState().openHelp();
    const { getByTestId } = render(<KeyboardHelpOverlay />);
    expect(getByTestId('keyboard-help-overlay')).toBeTruthy();
  });

  it('shows categories and all enabled shortcuts', () => {
    useKeyboardSettingsStore.getState().openHelp();
    const { getAllByText } = render(<KeyboardHelpOverlay />);
    for (const cat of SHORTCUT_CATEGORIES) {
      const matches = getAllByText(cat.label);
      expect(matches.length).toBeGreaterThan(0);
    }
    for (const def of Object.values(SHORTCUT_DEFINITIONS)) {
      const matches = getAllByText(def.label);
      expect(matches.length).toBeGreaterThan(0);
    }
  });

  it('closes when Escape is pressed', async () => {
    useKeyboardSettingsStore.getState().openHelp();
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(true);
    const { queryByTestId } = render(<KeyboardHelpOverlay />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(false);
    await waitFor(() => {
      expect(queryByTestId('keyboard-help-overlay')).toBeNull();
    });
  });

  it('disables shortcut when toggle is clicked', () => {
    useKeyboardSettingsStore.getState().openHelp();
    useKeyboardSettingsStore.getState().setEnabled('play_pause', true);
    const { getAllByRole } = render(<KeyboardHelpOverlay />);
    const playPauseButtons = getAllByRole('button', { name: /Disable Play/ });
    fireEvent.click(playPauseButtons[0]);
    expect(useKeyboardSettingsStore.getState().enabled.play_pause).toBe(false);
  });

  it('resets defaults when Reset button clicked', () => {
    useKeyboardSettingsStore.getState().setEnabled('play_pause', false);
    useKeyboardSettingsStore.getState().setEnabled('mute_toggle', false);
    useKeyboardSettingsStore.getState().openHelp();
    const { getByRole } = render(<KeyboardHelpOverlay />);
    fireEvent.click(getByRole('button', { name: /Reset to defaults/ }));
    expect(useKeyboardSettingsStore.getState().enabled.play_pause).toBe(true);
    expect(useKeyboardSettingsStore.getState().enabled.mute_toggle).toBe(true);
  });

  it('filters shortcuts by search query', () => {
    useKeyboardSettingsStore.getState().openHelp();
    const playPauseDef = SHORTCUT_DEFINITIONS.play_pause;
    const { getByPlaceholderText, queryByText } = render(<KeyboardHelpOverlay />);
    const input = getByPlaceholderText('Search shortcuts...') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'shuffle' } });
    expect(queryByText(playPauseDef.label)).toBeNull();
  });
});
