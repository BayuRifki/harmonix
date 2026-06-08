import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useKeyboardNavigation } from '@/hooks/useKeyboardNavigation';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { installMockWindowApi } from '../setup';

function dispatchKey(opts: {
  code: string;
  key?: string;
  shiftKey?: boolean;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}): void {
  const ev = new KeyboardEvent('keydown', {
    code: opts.code,
    key: opts.key ?? '',
    shiftKey: opts.shiftKey ?? false,
    ctrlKey: opts.ctrlKey ?? false,
    metaKey: opts.metaKey ?? false,
    altKey: opts.altKey ?? false,
    bubbles: true,
    cancelable: true,
  });
  window.dispatchEvent(ev);
}

function isMac(): boolean {
  return /Mac|iPhone|iPad/i.test(navigator.userAgent || '');
}

describe('useKeyboardNavigation', () => {
  let miniPlayerToggle: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorage.clear();
    miniPlayerToggle = vi.fn(async () => undefined);
    installMockWindowApi();
    (window as unknown as { api: { miniPlayer: { toggle: () => Promise<void> } } }).api = {
      miniPlayer: { toggle: miniPlayerToggle },
    };
    useKeyboardSettingsStore.getState().resetDefaults();
    useUiStore.setState({ commandPaletteOpen: false });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function setupHook() {
    renderHook(() => useKeyboardNavigation());
  }

  it('toggles play/pause on Space', () => {
    const track = {
      id: 't1',
      title: 'T',
      artists: [{ id: 'a1', name: 'A' }],
      album: { id: 'al1', title: 'Al', artworkUrl: null },
      durationMs: 1000,
      artworkUrl: null,
      source: 'local',
    };
    usePlayerStore.setState({ currentTrack: track as never, isPlaying: false });
    const resume = vi.fn(async () => undefined);
    usePlayerStore.setState({ resume: resume as never });
    setupHook();
    dispatchKey({ code: 'Space' });
    expect(resume).toHaveBeenCalled();
  });

  it('opens command palette on Ctrl/Cmd+K', () => {
    setupHook();
    dispatchKey({ code: 'KeyK', ctrlKey: !isMac(), metaKey: isMac() });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });

  it('toggles help overlay on ?', () => {
    setupHook();
    dispatchKey({ code: 'Slash', shiftKey: true });
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(true);
    dispatchKey({ code: 'Slash', shiftKey: true });
    expect(useKeyboardSettingsStore.getState().helpOpen).toBe(false);
  });

  it('toggles mini-player on Ctrl/Cmd+Shift+M', async () => {
    setupHook();
    dispatchKey({ code: 'KeyM', shiftKey: true, ctrlKey: !isMac(), metaKey: isMac() });
    await Promise.resolve();
    expect(miniPlayerToggle).toHaveBeenCalled();
  });

  it('does not trigger when shortcut is disabled', () => {
    useKeyboardSettingsStore.getState().setEnabled('command_palette', false);
    setupHook();
    dispatchKey({ code: 'KeyK', ctrlKey: !isMac(), metaKey: isMac() });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('does not trigger when target is an input', () => {
    setupHook();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const ev = new KeyboardEvent('keydown', {
      code: 'Space',
      key: ' ',
      bubbles: true,
      cancelable: true,
    });
    Object.defineProperty(ev, 'target', { value: input });
    window.dispatchEvent(ev);
    document.body.removeChild(input);
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('mutes and restores volume with M', () => {
    const setVolume = vi.fn();
    usePlayerStore.setState({ volume: 0.5, setVolume: setVolume as never });
    setupHook();
    dispatchKey({ code: 'KeyM' });
    expect(setVolume).toHaveBeenCalledWith(0);
  });

  it('cycles repeat with R', () => {
    const cycleRepeat = vi.fn();
    usePlayerStore.setState({ cycleRepeat: cycleRepeat as never });
    setupHook();
    dispatchKey({ code: 'KeyR' });
    expect(cycleRepeat).toHaveBeenCalled();
  });

  it('toggles shuffle with S', () => {
    const toggleShuffle = vi.fn();
    usePlayerStore.setState({ toggleShuffle: toggleShuffle as never });
    setupHook();
    dispatchKey({ code: 'KeyS' });
    expect(toggleShuffle).toHaveBeenCalled();
  });
});
