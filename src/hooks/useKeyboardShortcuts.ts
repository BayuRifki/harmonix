import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

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

      if (
        (e.metaKey || e.ctrlKey) &&
        e.shiftKey &&
        (e.code === 'KeyM' || e.key.toLowerCase() === 'm')
      ) {
        e.preventDefault();
        void window.api.miniPlayer.toggle();
        return;
      }

      if (e.metaKey || e.ctrlKey || e.altKey) return;

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
      };

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
