import { describe, it, expect, beforeEach } from 'vitest';
import {
  INITIAL_PLAYER_SNAPSHOT,
  applyPlayerAction,
  PlayerStateBus,
  playerStateBus,
  type PlayerSnapshot,
  type PlayerAction,
} from '../../electron/main/playerState';

function makeSnapshot(overrides: Partial<PlayerSnapshot> = {}): PlayerSnapshot {
  return { ...INITIAL_PLAYER_SNAPSHOT, ...overrides };
}

describe('playerState', () => {
  describe('applyPlayerAction', () => {
    it('play sets isPlaying=true and loading=false', () => {
      const s = makeSnapshot({ isPlaying: false, loading: true });
      const next = applyPlayerAction(s, { type: 'play' });
      expect(next.isPlaying).toBe(true);
      expect(next.loading).toBe(false);
      expect(next.updatedAt).toBeGreaterThan(0);
    });

    it('pause sets isPlaying=false', () => {
      const s = makeSnapshot({ isPlaying: true });
      const next = applyPlayerAction(s, { type: 'pause' });
      expect(next.isPlaying).toBe(false);
    });

    it('toggle flips isPlaying', () => {
      const s1 = makeSnapshot({ isPlaying: true });
      expect(applyPlayerAction(s1, { type: 'toggle' }).isPlaying).toBe(false);
      const s2 = makeSnapshot({ isPlaying: false });
      expect(applyPlayerAction(s2, { type: 'toggle' }).isPlaying).toBe(true);
    });

    it('seek/next/prev/volume/shuffle/repeat update updatedAt but not other fields', () => {
      const s = makeSnapshot({ isPlaying: true, volume: 0.5 });
      const actions: PlayerAction[] = [
        { type: 'seek', positionMs: 5000 },
        { type: 'next' },
        { type: 'prev' },
        { type: 'volume', volume: 0.7 },
        { type: 'toggle-shuffle' },
        { type: 'cycle-repeat' },
      ];
      for (const action of actions) {
        const next = applyPlayerAction(s, action);
        expect(next.isPlaying).toBe(s.isPlaying);
        expect(next.volume).toBe(s.volume);
        expect(next.updatedAt).toBeGreaterThanOrEqual(s.updatedAt);
      }
    });
  });

  describe('PlayerStateBus', () => {
    let bus: PlayerStateBus;

    beforeEach(() => {
      bus = new PlayerStateBus();
    });

    it('starts from INITIAL_PLAYER_SNAPSHOT', () => {
      expect(bus.getSnapshot()).toEqual(INITIAL_PLAYER_SNAPSHOT);
    });

    it('setSnapshot notifies subscribers', () => {
      const calls: PlayerSnapshot[] = [];
      bus.subscribe((s) => {
        calls.push(s);
      });
      const next = makeSnapshot({ isPlaying: true });
      bus.setSnapshot(next);
      expect(calls).toHaveLength(1);
      expect(calls[0].isPlaying).toBe(true);
    });

    it('setSnapshot stamps updatedAt if missing', () => {
      const next = { ...makeSnapshot({ isPlaying: true }), updatedAt: 0 };
      bus.setSnapshot(next);
      expect(bus.getSnapshot().updatedAt).toBeGreaterThan(0);
    });

    it('subscribe returns an unsubscribe function', () => {
      const calls: number[] = [];
      const off = bus.subscribe(() => {
        calls.push(1);
      });
      bus.setSnapshot(makeSnapshot({ isPlaying: true }));
      off();
      bus.setSnapshot(makeSnapshot({ isPlaying: false }));
      expect(calls).toHaveLength(1);
    });

    it('applyLocalAction uses the reducer', () => {
      bus.setSnapshot(makeSnapshot({ isPlaying: false }));
      bus.applyLocalAction({ type: 'play' });
      expect(bus.getSnapshot().isPlaying).toBe(true);
    });

    it('listener errors do not break other listeners', () => {
      const calls: number[] = [];
      bus.subscribe(() => {
        throw new Error('boom');
      });
      bus.subscribe(() => {
        calls.push(1);
      });
      bus.setSnapshot(makeSnapshot({ isPlaying: true }));
      expect(calls).toHaveLength(1);
    });
  });

  describe('singleton', () => {
    it('exports a default bus', () => {
      expect(playerStateBus).toBeDefined();
      expect(typeof playerStateBus.subscribe).toBe('function');
      expect(typeof playerStateBus.setSnapshot).toBe('function');
    });
  });
});
