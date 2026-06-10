import { useEffect, useRef, useState } from 'react';
import { usePlayerStore } from '@/stores/playerStore';

const DEBOUNCE_MS = 600;

function formatQueueMessage(
  queue: ReturnType<typeof usePlayerStore.getState>['queue'],
  queueIndex: number,
  type: 'added' | 'cleared' | 'reordered' | 'current-changed',
): string {
  if (type === 'cleared') {
    return 'Queue cleared';
  }
  if (type === 'added') {
    return `${queue.length} tracks in queue`;
  }
  if (type === 'current-changed') {
    if (queueIndex >= 0 && queueIndex < queue.length) {
      const track = queue[queueIndex];
      const artist = track.artists
        .map((a) => a.name)
        .filter(Boolean)
        .join(', ');
      return `Now playing: ${track.title}${artist ? ` by ${artist}` : ''}, track ${queueIndex + 1} of ${queue.length}`;
    }
    return `Track ${queueIndex + 1} of ${queue.length}`;
  }
  if (type === 'reordered') {
    return 'Queue reordered';
  }
  return '';
}

export function QueueAnnouncer(): JSX.Element {
  const [message, setMessage] = useState<string | null>(null);
  const lastQueueLength = useRef<number>(0);
  const lastQueueIndex = useRef<number>(-1);
  const lastAnnounceAt = useRef<number>(0);
  const isInitialMount = useRef(true);

  useEffect(() => {
    const unsubscribe = usePlayerStore.subscribe((state) => {
      const now = Date.now();
      const queue = state.queue;
      const queueIndex = state.queueIndex;
      const queueLength = queue.length;

      if (isInitialMount.current) {
        lastQueueLength.current = queueLength;
        lastQueueIndex.current = queueIndex;
        isInitialMount.current = false;
        return;
      }

      let type: 'added' | 'cleared' | 'reordered' | 'current-changed' | null = null;

      if (queueLength === 0 && lastQueueLength.current > 0) {
        type = 'cleared';
      } else if (queueLength > lastQueueLength.current) {
        type = 'added';
      } else if (queueLength > 0 && queueIndex !== lastQueueIndex.current) {
        type = 'current-changed';
      } else if (queueLength === lastQueueLength.current && queueLength > 0) {
        const wasReordered = queue.some((t, i) => t.id !== usePlayerStore.getState().queue[i]?.id);
        if (wasReordered) {
          type = 'reordered';
        }
      }

      if (!type) return;
      if (now - lastAnnounceAt.current < DEBOUNCE_MS) return;

      lastQueueLength.current = queueLength;
      lastQueueIndex.current = queueIndex;
      lastAnnounceAt.current = now;

      setMessage(formatQueueMessage(queue, queueIndex, type));
    });
    return unsubscribe;
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      data-testid="queue-announcer"
    >
      {message}
    </div>
  );
}
