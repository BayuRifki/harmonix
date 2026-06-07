import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

const DEBOUNCE_MS = 600;

function formatMessage(state: ReturnType<typeof usePlayerStore.getState>): string | null {
  if (!state.currentTrack) return null;
  const artist = state.currentTrack.artists
    .map((a) => a.name)
    .filter(Boolean)
    .join(', ');
  const stateText = state.isPlaying ? 'Now playing' : 'Paused';
  return `${stateText}: ${state.currentTrack.title}${artist ? ` — ${artist}` : ''}`;
}

export function PlayerAnnouncer(): JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const lastTrackId = useRef<string | null>(null);
  const lastIsPlaying = useRef<boolean | null>(null);
  const lastAnnounceAt = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const now = Date.now();
      const trackId = state.currentTrack?.id ?? null;
      const isPlaying = state.isPlaying;
      const trackChanged = trackId !== lastTrackId.current;
      const playStateChanged = isPlaying !== lastIsPlaying.current;
      if (!trackChanged && !playStateChanged) return;
      if (now - lastAnnounceAt.current < DEBOUNCE_MS) return;
      lastTrackId.current = trackId;
      lastIsPlaying.current = isPlaying;
      lastAnnounceAt.current = now;
      setMessage(formatMessage(state));
    });
    return unsubscribe;
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="player-announcer"
    >
      {message}
    </div>
  );
}
