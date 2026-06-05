import { useEffect, useRef } from 'react';
import { usePlayerStore } from '@/stores/playerStore';
import type { MiniPlayerStateSnapshot, MiniPlayerAction } from '@/types/global';

function buildSnapshot(): MiniPlayerStateSnapshot {
  const s = usePlayerStore.getState();
  const currentTrack = s.currentTrack;
  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  return {
    currentTrack,
    sourceId: currentTrack?.source ?? null,
    isPlaying: s.isPlaying,
    loading: s.loading,
    positionMs: s.positionMs,
    durationMs: s.durationMs,
    volume: s.volume,
    shuffle: s.shuffle,
    repeat: s.repeat,
    hasNext: s.queueIndex >= 0 && s.queueIndex < s.queue.length - 1,
    hasPrev: s.queueIndex > 0 || s.positionMs > 3000,
    artworkUrl,
    title: currentTrack?.title ?? null,
    artistLine: currentTrack?.artists?.map((a) => a.name).join(', ') ?? null,
    updatedAt: Date.now(),
  };
}

function handleMiniCommand(action: MiniPlayerAction): void {
  const store = usePlayerStore.getState();
  switch (action.type) {
    case 'play':
      void store.resume();
      break;
    case 'pause':
      store.pause();
      break;
    case 'toggle':
      if (store.isPlaying) store.pause();
      else void store.resume();
      break;
    case 'next':
      void store.next();
      break;
    case 'prev':
      void store.previous();
      break;
    case 'seek':
      void store.seek(action.positionMs);
      break;
    case 'volume':
      store.setVolume(action.volume);
      break;
    case 'toggle-shuffle':
      store.toggleShuffle();
      break;
    case 'cycle-repeat':
      store.cycleRepeat();
      break;
  }
}

export function usePlayerStateSync(): void {
  const pushedRef = useRef<string>('');

  useEffect(() => {
    if (typeof window === 'undefined' || !window.api?.player) return undefined;

    const push = (): void => {
      const snap = buildSnapshot();
      const key = JSON.stringify({
        t: snap.title,
        a: snap.artistLine,
        s: snap.sourceId,
        p: snap.isPlaying,
        l: snap.loading,
        pos: Math.round(snap.positionMs / 500),
        dur: Math.round(snap.durationMs / 500),
        v: Math.round(snap.volume * 100),
        sh: snap.shuffle,
        rp: snap.repeat,
        hn: snap.hasNext,
        hp: snap.hasPrev,
      });
      if (key === pushedRef.current) return;
      pushedRef.current = key;
      void window.api.player.pushState(snap).catch(() => undefined);
    };

    push();
    const unsub = usePlayerStore.subscribe(push);
    const offCmd = window.api.player.onCommand(handleMiniCommand);
    return (): void => {
      unsub();
      offCmd();
    };
  }, []);
}
