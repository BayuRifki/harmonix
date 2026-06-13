import type { Track } from '@/types/global';

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: SpotifyNs;
  }
}

interface SpotifyNs {
  Player: new (options: {
    name: string;
    getOAuthToken: (cb: (token: string) => void) => void;
    volume?: number;
  }) => SpotifyPlayerInstance;
}

interface SpotifyPlayerInstance {
  connect(): Promise<boolean>;
  disconnect(): void;
  pause(): Promise<void>;
  resume(): Promise<void>;
  setName(name: string): Promise<void>;
  setVolume(volume: number): Promise<void>;
  seek(positionMs: number): Promise<void>;
  previousTrack(): Promise<void>;
  nextTrack(): Promise<void>;
  getCurrentState(): Promise<SpotifyPlaybackState | null>;
  addListener(event: string, cb: (state: unknown) => void): void;
  removeListener(event: string): void;
}

interface SpotifyPlaybackState {
  context: { uri: string; metadata: unknown };
  track_window: { current_track: SpotifyTrack };
  paused: boolean;
  position: number;
  duration: number;
}

interface SpotifyTrack {
  uri: string;
  id: string;
  name: string;
  artists: { name: string; uri: string }[];
  album: { name: string; uri: string; images: { url: string }[] };
  duration_ms: number;
}

let sdkPromise: Promise<SpotifyNs> | null = null;

export function loadSpotifySDK(): Promise<NonNullable<typeof window.Spotify>> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise((resolve, reject) => {
    if (window.Spotify) {
      resolve(window.Spotify);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://sdk.scdn.co/spotify-player.js';
    script.async = true;
    script.onerror = (): void => {
      reject(new Error('Failed to load Spotify Web Playback SDK'));
    };
    document.head.appendChild(script);
    const prevHandler = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = (): void => {
      if (window.Spotify) resolve(window.Spotify);
      else reject(new Error('Spotify SDK did not load'));
      prevHandler?.();
    };
  });
  return sdkPromise;
}

type SpotifyErrorEventName =
  | 'initialization_error'
  | 'authentication_error'
  | 'account_error'
  | 'playback_error';

export interface WebPlaybackCallbacks {
  ready?: (deviceId: string) => void;
  notReady?: (deviceId: string) => void;
  stateChange?: (state: SpotifyPlaybackState | null) => void;
  error?: (err: { type: SpotifyErrorEventName; message: string }) => void;
}

export class WebPlaybackController {
  private player: SpotifyPlayerInstance | null = null;
  private deviceId: string | null = null;
  private callbacks: WebPlaybackCallbacks = {};

  on(cbs: WebPlaybackCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  getDeviceId(): string | null {
    return this.deviceId;
  }

  isConnected(): boolean {
    return this.player !== null;
  }

  async connect(tokenProvider: () => Promise<string | null>): Promise<string | null> {
    if (this.player && this.deviceId) return this.deviceId;
    const SDK = await loadSpotifySDK();
    this.player = new SDK.Player({
      name: 'Harmonix',
      getOAuthToken: (cb: (token: string) => void): void => {
        void tokenProvider().then((token) => {
          if (token) cb(token);
        });
      },
      volume: 0.8,
    });

    this.player.addListener('initialization_error', (payload) => {
      const message = (payload as { message?: string })?.message ?? 'unknown';
      this.callbacks.error?.({ type: 'initialization_error', message });
    });
    this.player.addListener('authentication_error', (payload) => {
      const message = (payload as { message?: string })?.message ?? 'unknown';
      this.callbacks.error?.({ type: 'authentication_error', message });
    });
    this.player.addListener('account_error', (payload) => {
      const message = (payload as { message?: string })?.message ?? 'unknown';
      this.callbacks.error?.({ type: 'account_error', message });
    });
    this.player.addListener('playback_error', (payload) => {
      const message = (payload as { message?: string })?.message ?? 'unknown';
      this.callbacks.error?.({ type: 'playback_error', message });
    });
    this.player.addListener('player_state_changed', (payload) => {
      this.callbacks.stateChange?.((payload as SpotifyPlaybackState | null) ?? null);
    });
    this.player.addListener('not_ready', (payload) => {
      const deviceId = (payload as { device_id: string }).device_id;
      this.deviceId = null;
      this.callbacks.notReady?.(deviceId);
    });

    // The SDK's `player.connect()` only confirms the initial
    // websocket handshake; the actual device registration (and the
    // `device_id` we need to pass as `?device_id=…` to
    // `/me/player/play`) arrives asynchronously via the `ready`
    // event. If we returned right after `player.connect()` resolved,
    // callers would race ahead and hit "Web Playback SDK not
    // connected" inside `play()` because `this.deviceId` is still
    // null. So we await the `ready` event (with a 15 s safety net
    // for slow networks / hung SDKs) and surface the SDK's own
    // error events as a rejection so the caller can show a real
    // diagnostic instead of a timeout.
    const readyPromise = new Promise<string>((resolve, reject) => {
      this.player!.addListener('ready', (payload) => {
        const deviceId = (payload as { device_id: string }).device_id;
        this.deviceId = deviceId;
        this.callbacks.ready?.(deviceId);
        resolve(deviceId);
      });
      this.player!.addListener('initialization_error', (payload) => {
        const message = (payload as { message?: string })?.message ?? 'unknown';
        reject(new Error(`Web Playback init: ${message}`));
      });
      this.player!.addListener('authentication_error', (payload) => {
        const message = (payload as { message?: string })?.message ?? 'unknown';
        reject(new Error(`Web Playback auth: ${message}`));
      });
      this.player!.addListener('account_error', (payload) => {
        const message = (payload as { message?: string })?.message ?? 'unknown';
        reject(new Error(`Web Playback account: ${message}`));
      });
    });

    const ok = await this.player.connect();
    if (!ok) throw new Error('Failed to connect Web Playback SDK');
    return Promise.race([
      readyPromise,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Web Playback SDK ready timeout (15s)')), 15000),
      ),
    ]);
  }

  async play(track: Track, accessToken: string): Promise<void> {
    if (!this.player || !this.deviceId) throw new Error('Web Playback SDK not connected');
    const meta = track.meta as { uri?: string } | undefined;
    const trackUri = meta?.uri?.startsWith('spotify:track:')
      ? meta.uri
      : `spotify:track:${track.sourceId}`;

    // The Spotify Web Playback SDK has no `player.play(trackUri)`
    // method — its job is to be a Connect device. To actually
    // start playback of a specific track, we transfer playback
    // to this device via PUT /v1/me/player/play?device_id=<id>
    // with body { uris: [...] }. This PUT can hang in production
    // (slow network, the device_id is actually offline, or the
    // SDK's iframe is stuck waiting for the WebSocket). A bare
    // `await fetch(...)` with no AbortController leaves the
    // playerStore's `loading: true` set forever and the UI
    // shows a perpetual spinner — the original "musik loading
    // terus" bug. Bound it with a 10s timeout so a real
    // diagnostic surfaces and the user can retry / see an error.
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    let response: Response;
    try {
      response = await fetch(
        `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
        {
          method: 'PUT',
          body: JSON.stringify({ uris: [trackUri] }),
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
          signal: controller.signal,
        },
      );
    } catch (err) {
      // AbortError bubbles up as "play request timed out (10s)".
      if ((err as Error).name === 'AbortError') {
        throw new Error(
          'Spotify /me/player/play timed out (10s). ' +
            'Check the Web Playback SDK device is still online ' +
            '(Spotify Connect should list "Harmonix" as an active device).',
        );
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok && response.status !== 204) {
      const text = await response.text();
      throw new Error(`Spotify play request failed: ${response.status} ${text}`);
    }
  }

  async pause(): Promise<void> {
    await this.player?.pause();
  }

  async resume(): Promise<void> {
    await this.player?.resume();
  }

  async disconnect(): Promise<void> {
    this.player?.disconnect();
    this.player = null;
    this.deviceId = null;
  }
}
