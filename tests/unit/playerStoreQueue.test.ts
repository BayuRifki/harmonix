import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('@/lib/audio/engine', () => ({
  audioEngine: {
    on: () => () => undefined,
    setVolume: () => undefined,
  },
}));

vi.mock('@/lib/audio/sourceResolver', () => ({
  playTrack: vi.fn(),
}));

import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/types/global';

function makeTrack(id: string, title: string): Track {
  return {
    id,
    source: 'local',
    sourceId: id,
    title,
    artists: [{ id: 'a', source: 'local', name: 'Artist' }],
    durationMs: 180_000,
    isPlayable: true,
  };
}

describe('playerStore queue manipulation', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [makeTrack('a', 'A'), makeTrack('b', 'B'), makeTrack('c', 'C')],
      queueIndex: 1,
    });
  });

  it('moveQueueItem reorders the queue', () => {
    usePlayerStore.getState().moveQueueItem(0, 2);
    const ids = usePlayerStore.getState().queue.map((t) => t.id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('moveQueueItem keeps current playing when not affected', () => {
    usePlayerStore.getState().moveQueueItem(2, 0);
    expect(usePlayerStore.getState().queueIndex).toBe(2);
  });

  it('moveQueueItem follows current track when moved', () => {
    usePlayerStore.setState({ queueIndex: 0 });
    usePlayerStore.getState().moveQueueItem(0, 2);
    expect(usePlayerStore.getState().queueIndex).toBe(2);
  });

  it('moveQueueItem is a no-op for invalid indices', () => {
    usePlayerStore.getState().moveQueueItem(-1, 5);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('moveQueueItem is a no-op when from === to', () => {
    usePlayerStore.getState().moveQueueItem(1, 1);
    expect(usePlayerStore.getState().queue.map((t) => t.id)).toEqual(['a', 'b', 'c']);
  });

  it('insertIntoQueue appends at the end', () => {
    usePlayerStore.getState().insertIntoQueue(makeTrack('d', 'D'), 99);
    const ids = usePlayerStore.getState().queue.map((t) => t.id);
    expect(ids).toEqual(['a', 'b', 'c', 'd']);
  });

  it('insertIntoQueue dedupes by id', () => {
    usePlayerStore.getState().insertIntoQueue(makeTrack('a', 'A Dup'), 99);
    expect(usePlayerStore.getState().queue.length).toBe(3);
  });

  it('insertIntoQueue before current shifts index', () => {
    usePlayerStore.setState({ queueIndex: 1 });
    usePlayerStore.getState().insertIntoQueue(makeTrack('x', 'X'), 0);
    expect(usePlayerStore.getState().queueIndex).toBe(2);
  });

  it('removeFromQueue drops the item', () => {
    usePlayerStore.getState().removeFromQueue(1);
    const ids = usePlayerStore.getState().queue.map((t) => t.id);
    expect(ids).toEqual(['a', 'c']);
  });

  it('removeFromQueue before current shifts index down', () => {
    usePlayerStore.setState({ queueIndex: 2 });
    usePlayerStore.getState().removeFromQueue(0);
    expect(usePlayerStore.getState().queueIndex).toBe(1);
  });

  it('removeFromQueue of current clamps index to last', () => {
    usePlayerStore.setState({ queueIndex: 2 });
    usePlayerStore.getState().removeFromQueue(2);
    expect(usePlayerStore.getState().queueIndex).toBe(1);
  });
});
