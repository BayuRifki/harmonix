import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WebPlaybackController } from '../../src/lib/audio/spotifyPlayback';

type Listener = (payload: unknown) => void;
const listeners: Record<string, Listener[]> = {};

const readyListeners = (): Listener[] => {
  listeners['ready'] = listeners['ready'] ?? [];
  return listeners['ready'];
};
const initErrorListeners = (): Listener[] => {
  listeners['initialization_error'] = listeners['initialization_error'] ?? [];
  return listeners['initialization_error'];
};

function makeMockPlayer() {
  return {
    connect: vi.fn().mockResolvedValue(true),
    disconnect: vi.fn(),
    pause: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
    setName: vi.fn().mockResolvedValue(undefined),
    setVolume: vi.fn().mockResolvedValue(undefined),
    seek: vi.fn().mockResolvedValue(undefined),
    previousTrack: vi.fn().mockResolvedValue(undefined),
    nextTrack: vi.fn().mockResolvedValue(undefined),
    getCurrentState: vi.fn().mockResolvedValue(null),
    addListener: vi.fn((event: string, cb: Listener) => {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    }),
    removeListener: vi.fn((event: string, cb: Listener) => {
      const arr = listeners[event] ?? [];
      listeners[event] = arr.filter((l) => l !== cb);
    }),
  };
}

let mockPlayer: ReturnType<typeof makeMockPlayer>;
let mockSDK: { Player: ReturnType<typeof vi.fn> };

beforeEach(() => {
  for (const k of Object.keys(listeners)) delete listeners[k];
  mockPlayer = makeMockPlayer();
  mockSDK = { Player: vi.fn(() => mockPlayer) };
  (window as unknown as { Spotify?: unknown }).Spotify = mockSDK;
});

afterEach(() => {
  delete (window as unknown as { Spotify?: unknown }).Spotify;
});

const flushAsync = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

describe('WebPlaybackController.connect — ready-event handshake', () => {
  it('does NOT resolve until the SDK fires the "ready" event (current bug: resolves before deviceId is set)', async () => {
    // The SDK's `player.connect()` only confirms the initial handshake;
    // the actual device_id arrives async via the `ready` event. If
    // `connect()` returns earlier, callers race ahead and `play()`
    // throws "Web Playback SDK not connected" because `this.deviceId`
    // is still null.
    //
    // This test resolves the SDK handshake but does NOT fire `ready`
    // synchronously. The contract is that connect() must keep waiting.
    const controller = new WebPlaybackController();
    const promise = controller.connect(async () => 'mock-token');

    // Let the listener registration + initial handshake settle
    await flushAsync();

    // Sanity: deviceId is still null and the promise hasn't resolved.
    // (We can't introspect `controller.deviceId` from outside, so we
    // check that the call is still pending by racing against a tiny
    // timeout.)
    const settled = await Promise.race([
      promise.then(() => 'resolved' as const).catch(() => 'rejected' as const),
      new Promise<'pending'>((r) => setTimeout(() => r('pending'), 30)),
    ]);
    expect(settled).toBe('pending');

    // Now fire `ready` and verify connect() resolves with the device_id.
    readyListeners().forEach((l) => l({ device_id: 'mock-device-id' }));
    const deviceId = await promise;
    expect(deviceId).toBe('mock-device-id');
  });

  it('rejects with a clear error if the SDK fires initialization_error', async () => {
    const controller = new WebPlaybackController();
    const promise = controller.connect(async () => 'mock-token');
    await flushAsync();
    initErrorListeners().forEach((l) => l({ message: 'Web Playback SDK could not initialize' }));

    await expect(promise).rejects.toThrow(
      /Web Playback init: Web Playback SDK could not initialize/,
    );
  });
});
