import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

type MediaSessionAction = 'play' | 'pause' | 'previoustrack' | 'nexttrack' | 'seekto' | 'stop';

function supportsMediaSession(): boolean {
  return typeof navigator !== 'undefined' && 'mediaSession' in navigator;
}

export function useMediaSession(): void {
  const lastTrackIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!supportsMediaSession()) return undefined;
    const ms = navigator.mediaSession;

    const onPlay = (): void => {
      void usePlayerStore.getState().resume();
    };
    const onPause = (): void => {
      usePlayerStore.getState().pause();
    };
    const onPrev = (): void => {
      void usePlayerStore.getState().previous();
    };
    const onNext = (): void => {
      void usePlayerStore.getState().next();
    };
    const onSeek = (e: MediaSessionActionDetails): void => {
      if (typeof e.seekTime === 'number') {
        void usePlayerStore.getState().seek(e.seekTime * 1000);
      }
    };
    const onStop = (): void => {
      usePlayerStore.getState().pause();
    };

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler]> = [
      ['play', onPlay],
      ['pause', onPause],
      ['previoustrack', onPrev],
      ['nexttrack', onNext],
      ['seekto', onSeek as MediaSessionActionHandler],
      ['stop', onStop],
    ];
    for (const [action, handler] of handlers) {
      try {
        ms.setActionHandler(action, handler);
      } catch {
        // some actions may not be supported on all platforms
      }
    }

    return (): void => {
      for (const [action] of handlers) {
        try {
          ms.setActionHandler(action, null);
        } catch {
          // ignore
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!supportsMediaSession()) return;
    const ms = navigator.mediaSession;
    const unsub = usePlayerStore.subscribe((state) => {
      const track = state.currentTrack;
      const trackId = track?.id ?? null;
      if (trackId !== lastTrackIdRef.current) {
        lastTrackIdRef.current = trackId;
        if (track) {
          const artist =
            track.artists
              .map((a) => a.name)
              .filter(Boolean)
              .join(', ') || 'Unknown';
          ms.metadata = new MediaMetadata({
            title: track.title,
            artist,
            album: track.album?.title ?? undefined,
            artwork: track.artworkUrl ? [{ src: track.artworkUrl, sizes: '512x512' }] : undefined,
          });
        } else {
          ms.metadata = null;
        }
      }
      ms.playbackState = state.isPlaying ? 'playing' : 'paused';
    });
    return unsub;
  }, []);
}
