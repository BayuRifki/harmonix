import { useEffect } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import { useUiStore } from '@/stores/uiStore';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { isEditableTarget } from '@/hooks/useKeyboardShortcuts';
import type { ShortcutId } from '@/hooks/keyboardShortcuts';

const SEEK_STEP_MS = 5000;
const VOLUME_STEP = 0.05;
const MUTE_RESTORE = 0.8;

function isMac(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /Mac|iPhone|iPad/i.test(navigator.userAgent || '');
}

export interface KeyboardNavigationOptions {
  onQueueToggle?: () => void;
  onListDown?: () => void;
  onListUp?: () => void;
  onListTop?: () => void;
  onListBottom?: () => void;
  onListForward?: () => void;
  onListBack?: () => void;
}

function comboMatches(e: KeyboardEvent, shortcutId: ShortcutId, isMacPlatform: boolean): boolean {
  switch (shortcutId) {
    case 'play_pause':
      return e.code === 'Space' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'next_track':
      return e.code === 'ArrowRight' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'prev_track':
      return e.code === 'ArrowLeft' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'seek_forward':
      return e.code === 'ArrowRight' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'seek_backward':
      return e.code === 'ArrowLeft' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'shuffle_toggle':
      return e.code === 'KeyS' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'repeat_cycle':
      return e.code === 'KeyR' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'queue_toggle':
      return e.code === 'KeyQ' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_down':
      return e.code === 'KeyJ' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_up':
      return e.code === 'KeyK' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_top':
      return e.code === 'KeyG' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_bottom':
      return e.code === 'KeyG' && e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_forward':
      return e.code === 'KeyL' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'list_back':
      return e.code === 'KeyH' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'volume_up':
      return e.code === 'ArrowUp' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'volume_down':
      return e.code === 'ArrowDown' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'mute_toggle':
      return e.code === 'KeyM' && !e.shiftKey && !e.metaKey && !e.ctrlKey && !e.altKey;
    case 'command_palette':
      return (
        e.code === 'KeyK' && (isMacPlatform ? e.metaKey : e.ctrlKey) && !e.shiftKey && !e.altKey
      );
    case 'mini_player_toggle':
      return (
        e.code === 'KeyM' && e.shiftKey && (isMacPlatform ? e.metaKey : e.ctrlKey) && !e.altKey
      );
    case 'help_overlay':
      return (e.code === 'Slash' && e.shiftKey) || e.key === '?';
    default:
      return false;
  }
}

export function useKeyboardNavigation(options: KeyboardNavigationOptions = {}): void {
  const toggleCommandPalette = useUiStore((s) => s.toggleCommandPalette);
  const isEnabled = useKeyboardSettingsStore((s) => s.isEnabled);
  const toggleHelp = useKeyboardSettingsStore((s) => s.toggleHelp);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const isMacPlatform = isMac();

    const handler = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return;
      if (isEditableTarget(e.target)) return;

      const player = usePlayerStore.getState();
      const hasTrack = player.currentTrack !== null;

      const shortcutIds: ShortcutId[] = [
        'play_pause',
        'next_track',
        'prev_track',
        'volume_up',
        'volume_down',
        'mute_toggle',
        'seek_forward',
        'seek_backward',
        'shuffle_toggle',
        'repeat_cycle',
        'queue_toggle',
        'command_palette',
        'mini_player_toggle',
        'list_down',
        'list_up',
        'list_top',
        'list_bottom',
        'list_forward',
        'list_back',
        'help_overlay',
      ];

      for (const id of shortcutIds) {
        if (!isEnabled(id)) continue;
        if (!comboMatches(e, id, isMacPlatform)) continue;

        switch (id) {
          case 'play_pause':
            if (!hasTrack) return;
            if (player.isPlaying) player.pause();
            else void player.resume();
            e.preventDefault();
            return;
          case 'next_track':
            if (!hasTrack) return;
            void player.next();
            e.preventDefault();
            return;
          case 'prev_track':
            if (!hasTrack) return;
            void player.previous();
            e.preventDefault();
            return;
          case 'seek_forward': {
            if (!hasTrack) return;
            const newPos = Math.min(player.durationMs, player.positionMs + SEEK_STEP_MS);
            void player.seek(newPos);
            e.preventDefault();
            return;
          }
          case 'seek_backward': {
            if (!hasTrack) return;
            const newPos = Math.max(0, player.positionMs - SEEK_STEP_MS);
            void player.seek(newPos);
            e.preventDefault();
            return;
          }
          case 'volume_up':
            player.setVolume(Math.min(1, player.volume + VOLUME_STEP));
            e.preventDefault();
            return;
          case 'volume_down':
            player.setVolume(Math.max(0, player.volume - VOLUME_STEP));
            e.preventDefault();
            return;
          case 'mute_toggle': {
            const prev = player.volume;
            if (prev > 0) {
              player.setVolume(0);
              window.__harmonixMuteRestore = prev;
            } else {
              const restore =
                typeof window.__harmonixMuteRestore === 'number'
                  ? window.__harmonixMuteRestore
                  : MUTE_RESTORE;
              player.setVolume(restore);
              window.__harmonixMuteRestore = undefined;
            }
            e.preventDefault();
            return;
          }
          case 'shuffle_toggle':
            player.toggleShuffle();
            e.preventDefault();
            return;
          case 'repeat_cycle':
            player.cycleRepeat();
            e.preventDefault();
            return;
          case 'queue_toggle':
            if (options.onQueueToggle) {
              options.onQueueToggle();
            } else {
              window.dispatchEvent(new CustomEvent('harmonix:toggle-queue'));
            }
            e.preventDefault();
            return;
          case 'command_palette':
            toggleCommandPalette();
            e.preventDefault();
            return;
          case 'mini_player_toggle':
            void window.api.miniPlayer.toggle();
            e.preventDefault();
            return;
          case 'list_down':
            if (options.onListDown) options.onListDown();
            e.preventDefault();
            return;
          case 'list_up':
            if (options.onListUp) options.onListUp();
            e.preventDefault();
            return;
          case 'list_top':
            if (options.onListTop) options.onListTop();
            e.preventDefault();
            return;
          case 'list_bottom':
            if (options.onListBottom) options.onListBottom();
            e.preventDefault();
            return;
          case 'list_forward':
            if (options.onListForward) {
              options.onListForward();
            } else {
              window.history.forward();
            }
            e.preventDefault();
            return;
          case 'list_back':
            if (options.onListBack) {
              options.onListBack();
            } else {
              window.history.back();
            }
            e.preventDefault();
            return;
          case 'help_overlay':
            toggleHelp();
            e.preventDefault();
            return;
          default:
            return;
        }
      }
    };

    window.addEventListener('keydown', handler);
    return (): void => {
      window.removeEventListener('keydown', handler);
    };
  }, [options, toggleCommandPalette, toggleHelp, isEnabled]);
}

declare global {
  interface Window {
    __harmonixMuteRestore?: number;
  }
}
