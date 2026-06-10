import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';

export interface ShortcutContext {
  isPlaying: boolean;
  hasTrack: boolean;
  volume: number;
  pause: () => void;
  resume: () => void;
  next: () => void;
  previous: () => void;
  setVolume: (v: number) => void;
  previousVolume: number | null;
  setPreviousVolume: (v: number | null) => void;
  toggleShuffle: () => void;
  cycleRepeat: () => void;
  toggleQueue: () => void;
  toggleMiniPlayer: () => void;
  openCommandPalette: () => void;
  openHelp: () => void;
  seek: (ms: number) => void;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  durationMs: number;
  positionMs: number;
}

const VOLUME_STEP = 0.05;
const MUTE_RESTORE = 0.8;

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  if (target.getAttribute('contenteditable') === 'true') return true;
  return false;
}

function keysMatch(event: KeyboardEvent, keySequence: string[]): boolean {
  const pressed: string[] = [];
  
  if (event.metaKey || event.ctrlKey) pressed.push('Mod');
  if (event.shiftKey && event.key !== 'Shift') pressed.push('Shift');
  if (event.altKey && event.key !== 'Alt') pressed.push('Alt');
  
  // Skip modifier-only key events
  if (event.key === 'Control' || event.key === 'Meta' || event.key === 'Shift' || event.key === 'Alt') {
    return false;
  }
  
  pressed.push(event.key);
  
  return pressed.length === keySequence.length && pressed.every((k, i) => k === keySequence[i]);
}

export function handleShortcut(code: string, ctx: ShortcutContext): boolean {
  switch (code) {
    case 'Space': {
      if (!ctx.hasTrack) return false;
      if (ctx.isPlaying) ctx.pause();
      else void ctx.resume();
      return true;
    }
    case 'ArrowRight': {
      if (!ctx.hasTrack) return false;
      void ctx.next();
      return true;
    }
    case 'ArrowLeft': {
      if (!ctx.hasTrack) return false;
      void ctx.previous();
      return true;
    }
    case 'ArrowUp': {
      ctx.setVolume(Math.min(1, ctx.volume + VOLUME_STEP));
      return true;
    }
    case 'ArrowDown': {
      ctx.setVolume(Math.max(0, ctx.volume - VOLUME_STEP));
      return true;
    }
    case 'KeyM': {
      if (ctx.volume > 0) {
        ctx.setPreviousVolume(ctx.volume);
        ctx.setVolume(0);
      } else {
        ctx.setVolume(ctx.previousVolume ?? MUTE_RESTORE);
        ctx.setPreviousVolume(null);
      }
      return true;
    }
    case 'KeyS': {
      if (!ctx.hasTrack) return false;
      void ctx.toggleShuffle();
      return true;
    }
    case 'KeyR': {
      if (!ctx.hasTrack) return false;
      void ctx.cycleRepeat();
      return true;
    }
    case 'KeyQ': {
      void ctx.toggleQueue();
      return true;
    }
    default:
      return false;
  }
}

export function useKeyboardShortcuts(): void {
  const previousVolumeRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    const handler = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return;
      if (isEditableTarget(e.target)) return;

      // Check custom shortcuts first
      const customShortcuts = useKeyboardSettingsStore.getState() as { enabled: Record<string, boolean>; customKeys: Record<string, string[]> };
      
      const store = usePlayerStore.getState();
      const ctx: ShortcutContext = {
        isPlaying: store.isPlaying,
        hasTrack: store.currentTrack !== null,
        volume: store.volume,
        pause: store.pause,
        resume: store.resume,
        next: store.next,
        previous: store.previous,
        setVolume: store.setVolume,
        previousVolume: previousVolumeRef.current,
        setPreviousVolume: (v): void => {
          previousVolumeRef.current = v;
        },
        toggleShuffle: store.toggleShuffle,
        cycleRepeat: store.cycleRepeat,
        toggleQueue: () => void useKeyboardSettingsStore.getState().openHelp(),
        toggleMiniPlayer: () => void window.api?.miniPlayer?.toggle(),
        openCommandPalette: () => void useKeyboardSettingsStore.getState().openHelp(),
        openHelp: () => void useKeyboardSettingsStore.getState().openHelp(),
        seek: store.seek,
        shuffle: store.shuffle,
        repeat: store.repeat,
        durationMs: store.durationMs,
        positionMs: store.positionMs,
      };

      // Build list of enabled custom shortcuts with their actions
      const shortcutActions: Record<string, () => void> = {
        play_pause: () => { if (ctx.hasTrack) { if (ctx.isPlaying) ctx.pause(); else void ctx.resume(); } },
        next_track: () => { if (ctx.hasTrack) void ctx.next(); },
        prev_track: () => { if (ctx.hasTrack) void ctx.previous(); },
        seek_forward: () => { if (ctx.hasTrack) void ctx.seek(Math.min(ctx.durationMs || Infinity, ctx.positionMs + 5000)); },
        seek_backward: () => { if (ctx.hasTrack) void ctx.seek(Math.max(0, ctx.positionMs - 5000)); },
        volume_up: () => { ctx.setVolume(Math.min(1, ctx.volume + VOLUME_STEP)); },
        volume_down: () => { ctx.setVolume(Math.max(0, ctx.volume - VOLUME_STEP)); },
        mute_toggle: () => { if (ctx.volume > 0) { ctx.setPreviousVolume(ctx.volume); ctx.setVolume(0); } else { ctx.setVolume(ctx.previousVolume ?? MUTE_RESTORE); ctx.setPreviousVolume(null); } },
        shuffle_toggle: () => { if (ctx.hasTrack) void ctx.toggleShuffle(); },
        repeat_cycle: () => { if (ctx.hasTrack) void ctx.cycleRepeat(); },
        queue_toggle: () => { void ctx.toggleQueue(); },
        mini_player_toggle: () => { void ctx.toggleMiniPlayer(); },
        command_palette: () => { void ctx.openCommandPalette(); },
        help_overlay: () => { void ctx.openHelp(); },
        list_down: () => {},
        list_up: () => {},
        list_top: () => {},
        list_bottom: () => {},
        list_forward: () => {},
        list_back: () => {},
      };

      // Check custom key bindings
      for (const [id, keys] of Object.entries(customShortcuts.customKeys)) {
        if (!customShortcuts.enabled[id]) continue;
        const action = shortcutActions[id];
        if (action && keysMatch(e, keys)) {
          e.preventDefault();
          action();
          return;
        }
      }

      // Global combos that can't be customized
      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.code === 'KeyM' || e.key.toLowerCase() === 'm')
      ) {
        e.preventDefault();
        void window.api?.miniPlayer?.toggle();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

      // Fallback to default hardcoded shortcuts
      if (handleShortcut(e.code, ctx)) {
        e.preventDefault();
      }
    };

    window.addEventListener('keydown', handler);
    return (): void => {
      window.removeEventListener('keydown', handler);
    };
  }, []);
}
