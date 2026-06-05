import type { Track } from './sources/types';

export type PlayerAction =
  | { type: 'play' }
  | { type: 'pause' }
  | { type: 'toggle' }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'seek'; positionMs: number }
  | { type: 'volume'; volume: number }
  | { type: 'toggle-shuffle' }
  | { type: 'cycle-repeat' };

export interface PlayerSnapshot {
  currentTrack: Track | null;
  sourceId: string | null;
  isPlaying: boolean;
  loading: boolean;
  positionMs: number;
  durationMs: number;
  volume: number;
  shuffle: boolean;
  repeat: 'off' | 'one' | 'all';
  hasNext: boolean;
  hasPrev: boolean;
  artworkUrl: string | null;
  title: string | null;
  artistLine: string | null;
  updatedAt: number;
}

export const INITIAL_PLAYER_SNAPSHOT: PlayerSnapshot = {
  currentTrack: null,
  sourceId: null,
  isPlaying: false,
  loading: false,
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',
  hasNext: false,
  hasPrev: false,
  artworkUrl: null,
  title: null,
  artistLine: null,
  updatedAt: 0,
};

export function applyPlayerAction(snapshot: PlayerSnapshot, action: PlayerAction): PlayerSnapshot {
  switch (action.type) {
    case 'play':
      return { ...snapshot, isPlaying: true, loading: false, updatedAt: Date.now() };
    case 'pause':
      return { ...snapshot, isPlaying: false, updatedAt: Date.now() };
    case 'toggle':
      return {
        ...snapshot,
        isPlaying: !snapshot.isPlaying,
        updatedAt: Date.now(),
      };
    case 'next':
    case 'prev':
    case 'seek':
    case 'volume':
    case 'toggle-shuffle':
    case 'cycle-repeat':
      return { ...snapshot, updatedAt: Date.now() };
    default:
      return snapshot;
  }
}

type Listener = (snapshot: PlayerSnapshot) => void;

export class PlayerStateBus {
  private snapshot: PlayerSnapshot = { ...INITIAL_PLAYER_SNAPSHOT };
  private listeners = new Set<Listener>();

  getSnapshot(): PlayerSnapshot {
    return this.snapshot;
  }

  setSnapshot(next: PlayerSnapshot): void {
    this.snapshot = { ...next, updatedAt: next.updatedAt || Date.now() };
    for (const listener of this.listeners) {
      try {
        listener(this.snapshot);
      } catch (err) {
        console.error('[playerState] Listener threw:', err);
      }
    }
  }

  applyLocalAction(action: PlayerAction): void {
    this.setSnapshot(applyPlayerAction(this.snapshot, action));
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const playerStateBus = new PlayerStateBus();
