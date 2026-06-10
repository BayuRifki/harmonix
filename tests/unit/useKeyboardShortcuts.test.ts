import { describe, it, expect, vi } from 'vitest';
import {
  handleShortcut,
  isEditableTarget,
  type ShortcutContext,
} from '@/hooks/useKeyboardShortcuts';

function makeCtx(overrides: Partial<ShortcutContext> = {}): {
  ctx: ShortcutContext;
  pause: ReturnType<typeof vi.fn>;
  resume: ReturnType<typeof vi.fn>;
  next: ReturnType<typeof vi.fn>;
  previous: ReturnType<typeof vi.fn>;
  setVolume: ReturnType<typeof vi.fn>;
  setPreviousVolume: ReturnType<typeof vi.fn>;
  toggleShuffle: ReturnType<typeof vi.fn>;
  cycleRepeat: ReturnType<typeof vi.fn>;
  toggleQueue: ReturnType<typeof vi.fn>;
  toggleMiniPlayer: ReturnType<typeof vi.fn>;
  openCommandPalette: ReturnType<typeof vi.fn>;
  openHelp: ReturnType<typeof vi.fn>;
  seek: ReturnType<typeof vi.fn>;
  setShuffle: ReturnType<typeof vi.fn>;
  setRepeat: ReturnType<typeof vi.fn>;
} {
  const pause = vi.fn();
  const resume = vi.fn();
  const next = vi.fn();
  const previous = vi.fn();
  const setVolume = vi.fn();
  const setPreviousVolume = vi.fn();
  const toggleShuffle = vi.fn();
  const cycleRepeat = vi.fn();
  const toggleQueue = vi.fn();
  const toggleMiniPlayer = vi.fn();
  const openCommandPalette = vi.fn();
  const openHelp = vi.fn();
  const seek = vi.fn();
  const setShuffle = vi.fn();
  const setRepeat = vi.fn();
  const ctx: ShortcutContext = {
    isPlaying: false,
    hasTrack: true,
    volume: 0.5,
    pause,
    resume,
    next,
    previous,
    setVolume,
    previousVolume: null,
    setPreviousVolume,
    toggleShuffle,
    cycleRepeat,
    toggleQueue,
    toggleMiniPlayer,
    openCommandPalette,
    openHelp,
    seek,
    shuffle: false,
    repeat: 'off',
    durationMs: 0,
    positionMs: 0,
    ...overrides,
  };
  return { ctx, pause, resume, next, previous, setVolume, setPreviousVolume, toggleShuffle, cycleRepeat, toggleQueue, toggleMiniPlayer, openCommandPalette, openHelp, seek, setShuffle, setRepeat };
}

describe('isEditableTarget', () => {
  function el(tag: string, contentEditable = false): HTMLElement {
    const node = document.createElement(tag);
    if (contentEditable) {
      node.contentEditable = 'true';
      node.setAttribute('contenteditable', 'true');
    }
    return node;
  }

  it('returns true for INPUT, TEXTAREA, SELECT', () => {
    expect(isEditableTarget(el('input'))).toBe(true);
    expect(isEditableTarget(el('textarea'))).toBe(true);
    expect(isEditableTarget(el('select'))).toBe(true);
  });

  it('returns true for contenteditable elements', () => {
    expect(isEditableTarget(el('div', true))).toBe(true);
  });

  it('returns false for other elements and null', () => {
    expect(isEditableTarget(el('div'))).toBe(false);
    expect(isEditableTarget(el('button'))).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe('handleShortcut', () => {
  it('Space toggles play/pause', () => {
    const { ctx, pause, resume } = makeCtx({ isPlaying: true });
    expect(handleShortcut('Space', ctx)).toBe(true);
    expect(pause).toHaveBeenCalled();
    expect(resume).not.toHaveBeenCalled();

    const { ctx: ctx2, pause: pause2, resume: resume2 } = makeCtx({ isPlaying: false });
    expect(handleShortcut('Space', ctx2)).toBe(true);
    expect(pause2).not.toHaveBeenCalled();
    expect(resume2).toHaveBeenCalled();
  });

  it('Space is ignored when no track is loaded', () => {
    const { ctx, resume } = makeCtx({ hasTrack: false });
    expect(handleShortcut('Space', ctx)).toBe(false);
    expect(resume).not.toHaveBeenCalled();
  });

  it('ArrowRight calls next() only when a track is loaded', () => {
    const { ctx, next } = makeCtx();
    expect(handleShortcut('ArrowRight', ctx)).toBe(true);
    expect(next).toHaveBeenCalled();

    const { ctx: ctx2, next: next2 } = makeCtx({ hasTrack: false });
    expect(handleShortcut('ArrowRight', ctx2)).toBe(false);
    expect(next2).not.toHaveBeenCalled();
  });

  it('ArrowLeft calls previous() only when a track is loaded', () => {
    const { ctx, previous } = makeCtx();
    expect(handleShortcut('ArrowLeft', ctx)).toBe(true);
    expect(previous).toHaveBeenCalled();

    const { ctx: ctx2, previous: previous2 } = makeCtx({ hasTrack: false });
    expect(handleShortcut('ArrowLeft', ctx2)).toBe(false);
    expect(previous2).not.toHaveBeenCalled();
  });

  it('ArrowUp bumps volume by 0.05 and clamps at 1', () => {
    const { ctx, setVolume } = makeCtx({ volume: 0.97 });
    expect(handleShortcut('ArrowUp', ctx)).toBe(true);
    expect(setVolume).toHaveBeenCalledWith(1);
  });

  it('ArrowDown lowers volume by 0.05 and clamps at 0', () => {
    const { ctx, setVolume } = makeCtx({ volume: 0.02 });
    expect(handleShortcut('ArrowDown', ctx)).toBe(true);
    expect(setVolume).toHaveBeenCalledWith(0);
  });

  it('KeyM mutes and remembers the previous volume', () => {
    const { ctx, setVolume, setPreviousVolume } = makeCtx({ volume: 0.6 });
    expect(handleShortcut('KeyM', ctx)).toBe(true);
    expect(setPreviousVolume).toHaveBeenCalledWith(0.6);
    expect(setVolume).toHaveBeenCalledWith(0);
  });

  it('KeyM unmutes by restoring the remembered volume', () => {
    const { ctx, setVolume, setPreviousVolume } = makeCtx({ volume: 0, previousVolume: 0.42 });
    expect(handleShortcut('KeyM', ctx)).toBe(true);
    expect(setVolume).toHaveBeenCalledWith(0.42);
    expect(setPreviousVolume).toHaveBeenCalledWith(null);
  });

  it('KeyM unmutes to the 0.8 default when nothing was remembered', () => {
    const { ctx, setVolume } = makeCtx({ volume: 0, previousVolume: null });
    expect(handleShortcut('KeyM', ctx)).toBe(true);
    expect(setVolume).toHaveBeenCalledWith(0.8);
  });

  it('returns false for unrelated keys', () => {
    const { ctx } = makeCtx();
    expect(handleShortcut('KeyA', ctx)).toBe(false);
    expect(handleShortcut('Enter', ctx)).toBe(false);
  });
});
