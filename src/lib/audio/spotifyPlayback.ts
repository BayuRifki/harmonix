import type { Track } from '@shared/index';

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
    if (this.player) return this.deviceId;
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
    this.player.addListener('ready', (payload) => {
      const deviceId = (payload as { device_id: string }).device_id;
      this.deviceId = deviceId;
      this.callbacks.ready?.(deviceId);
    });
    this.player.addListener('not_ready', (payload) => {
      const deviceId = (payload as { device_id: string }).device_id;
      this.callbacks.notReady?.(deviceId);
    });

    const ok = await this.player.connect();
    if (!ok) throw new Error('Failed to connect Web Playback SDK');
    return this.deviceId;
  }

  async play(track: Track, accessToken: string): Promise<void> {
    if (!this.player || !this.deviceId) throw new Error('Web Playback SDK not connected');
    const meta = track.meta as { uri?: string } | undefined;
    const trackUri = meta?.uri?.startsWith('spotify:track:')
      ? meta.uri
      : `spotify:track:${track.sourceId}`;
    const response = await fetch(
      `https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`,
      {
        method: 'PUT',
        body: JSON.stringify({ uris: [trackUri] }),
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
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
