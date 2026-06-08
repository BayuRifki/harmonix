import { equalizer } from './equalizer';

type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

export interface AudioEngineEvents {
  state: (state: PlaybackState) => void;
  time: (positionMs: number, durationMs: number) => void;
  ended: () => void;
  error: (message: string) => void;
}

type Listener<T extends keyof AudioEngineEvents> = AudioEngineEvents[T];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private preloadedAudio: HTMLAudioElement | null = null;
  private preloadedUrl: string | null = null;
  private listeners: { [K in keyof AudioEngineEvents]: Set<Listener<K>> } = {
    state: new Set(),
    time: new Set(),
    ended: new Set(),
    error: new Set(),
  };
  private state: PlaybackState = 'idle';

  private ensureContext(): AudioContext | null {
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext();
        this.gainNode = this.ctx.createGain();
        try {
          equalizer.connect(this.gainNode, this.ctx.destination);
        } catch (eqErr) {
          // eslint-disable-next-line no-console
          console.warn(
            '[audioEngine] equalizer.connect failed, continuing without EQ:',
            (eqErr as Error).message,
          );
        }
      } catch (ctxErr) {
        // eslint-disable-next-line no-console
        console.warn(
          '[audioEngine] AudioContext setup failed, falling back to direct playback:',
          (ctxErr as Error).message,
        );
        this.ctx = null;
        this.gainNode = null;
      }
    }
    return this.ctx;
  }

  getGainNode(): GainNode | null {
    return this.gainNode;
  }

  getState(): PlaybackState {
    return this.state;
  }

  on<K extends keyof AudioEngineEvents>(event: K, fn: Listener<K>): () => void {
    this.listeners[event].add(fn);
    return () => this.listeners[event].delete(fn);
  }

  private emit<K extends keyof AudioEngineEvents>(
    event: K,
    ...args: Parameters<Listener<K>>
  ): void {
    this.listeners[event].forEach((fn) => {
      (fn as (...a: unknown[]) => void)(...args);
    });
  }

  private setState(s: PlaybackState): void {
    this.state = s;
    this.emit('state', s);
  }

  /**
   * Pre-buffer a stream URL in a hidden <audio> element so the subsequent
   * `load(sameUrl)` can skip the `canplay` wait. The element is paused
   * (no audio output) and no MediaElementSource is created — that only
   * happens on actual playback. Best-effort: callers should not rely on
   * the preload succeeding; failure is silent and `load()` falls back to
   * the full init path.
   */
  preload(url: string): void {
    if (this.preloadedUrl === url && this.preloadedAudio) return;
    this.cancelPreload();
    const audio = new Audio();
    audio.preload = 'auto';
    if (url.startsWith('file://')) {
      audio.crossOrigin = 'anonymous';
    }
    audio.src = url;
    try {
      audio.load();
    } catch {
      // ignore — preload is best-effort
    }
    this.preloadedAudio = audio;
    this.preloadedUrl = url;
  }

  cancelPreload(): void {
    if (this.preloadedAudio) {
      try {
        this.preloadedAudio.pause();
        this.preloadedAudio.removeAttribute('src');
      } catch {
        // ignore
      }
      this.preloadedAudio = null;
    }
    this.preloadedUrl = null;
  }

  hasPreloaded(url: string): boolean {
    return this.preloadedUrl === url && this.preloadedAudio !== null;
  }

  async load(url: string): Promise<void> {
    this.setState('loading');
    const ctx = this.ensureContext();
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Helper: try to wire the audio element into the Web Audio graph
    // (gain + EQ). If anything throws (e.g. `createMediaElementSource`
    // fails because the audio is CORS-tainted in some Chromium
    // configurations), fall back to direct HTMLAudioElement playback —
    // the audio plays, just without EQ / gain processing.
    const tryWireSource = (target: HTMLAudioElement): void => {
      if (!ctx || !this.gainNode) {
        // eslint-disable-next-line no-console
        console.log(`[audioEngine] no Web Audio context/gainNode; playing ${url} directly`);
        return;
      }
      try {
        const node = ctx.createMediaElementSource(target);
        node.connect(this.gainNode);
        this.sourceNode = node;
        // eslint-disable-next-line no-console
        console.log(`[audioEngine] wired MediaElementSource for ${url} (Web Audio active)`);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn(
          `[audioEngine] createMediaElementSource failed for ${url}; falling back to direct playback:`,
          (err as Error).message,
        );
        this.sourceNode = null;
      }
    };

    // eslint-disable-next-line no-console
    console.log(
      `[audioEngine] load(${url}) src=${url.startsWith('harmonix-media://') ? 'PROXY' : 'DIRECT'}`,
    );

    // Fast path: a preload of this exact URL is already warm.
    if (this.preloadedAudio && this.preloadedUrl === url) {
      const reused = this.preloadedAudio;
      this.preloadedAudio = null;
      this.preloadedUrl = null;
      this.cleanupCurrentAudio();
      this.currentAudio = reused;

      // Route through AudioContext if available (best-effort).
      tryWireSource(reused);

      this.attachAllListeners(reused);
      this.emit('time', 0, Math.round(reused.duration * 1000));

      // readyState >= 2 (HAVE_CURRENT_DATA) means we can already play
      return new Promise<void>((resolve) => {
        if (reused.readyState >= 2) {
          resolve();
          return;
        }
        const onReady = (): void => {
          reused.removeEventListener('loadeddata', onReady);
          reused.removeEventListener('canplay', onReady);
          resolve();
        };
        reused.addEventListener('loadeddata', onReady);
        reused.addEventListener('canplay', onReady);
      });
    }

    // Slow path: full new Audio init
    this.cancelPreload();
    this.cleanupCurrentAudio();
    const audio = new Audio();
    // crossOrigin='anonymous' is required when the audio element is
    // wired into a Web Audio source node, otherwise the source is
    // CORS-tainted and the audio is silent. For local file:// URLs
    // the attribute is irrelevant.
    audio.crossOrigin = 'anonymous';
    audio.preload = 'auto';
    audio.src = url;
    this.currentAudio = audio;
    // eslint-disable-next-line no-console
    console.log(
      `[audioEngine] audio.src=${audio.src.slice(0, 80)}… crossOrigin=${audio.crossOrigin}`,
    );

    // Route through AudioContext if available (best-effort).
    tryWireSource(audio);

    this.attachAllListeners(audio);

    return new Promise((resolve, reject) => {
      const onCanPlay = (): void => {
        // eslint-disable-next-line no-console
        console.log(`[audioEngine] canplay ${url} readyState=${audio.readyState}`);
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve();
      };
      const onError = (): void => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        const err = audio.error;
        const codeMap: Record<number, string> = {
          1: 'MEDIA_ERR_ABORTED',
          2: 'MEDIA_ERR_NETWORK',
          3: 'MEDIA_ERR_DECODE',
          4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
        };
        const reason = err ? (codeMap[err.code] ?? `code ${err.code}`) : 'unknown';
        const message = err?.message ? `: ${err.message}` : '';
        // eslint-disable-next-line no-console
        console.error(
          `[audioEngine] load failed (${reason}) for ${url}${message} ` +
            `src=${audio.src.slice(0, 80)}… ` +
            `crossOrigin=${audio.crossOrigin} ` +
            `networkState=${audio.networkState} ` +
            `readyState=${audio.readyState}`,
        );
        reject(new Error(`Failed to load audio (${reason})${message}`));
      };
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.load();
    });
  }

  private cleanupCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.removeAttribute('src');
      this.currentAudio.src = '';
      if (this.sourceNode) {
        try {
          this.sourceNode.disconnect();
        } catch {
          // ignore
        }
        this.sourceNode = null;
      }
    }
  }

  /**
   * Returns true if the most recent load() successfully wired the
   * audio element into the Web Audio graph (so the gain + EQ apply).
   * When this is false, the audio is playing via the HTMLAudioElement
   * directly (volume control still works via `audio.volume`, but
   * there's no EQ / per-band gain processing).
   */
  isWebAudioActive(): boolean {
    return this.sourceNode !== null && this.gainNode !== null;
  }

  private attachAllListeners(audio: HTMLAudioElement): void {
    audio.addEventListener('loadedmetadata', () => {
      this.emit('time', 0, Math.round(audio.duration * 1000));
    });
    audio.addEventListener('timeupdate', () => {
      this.emit('time', Math.round(audio.currentTime * 1000), Math.round(audio.duration * 1000));
    });
    audio.addEventListener('play', () => this.setState('playing'));
    audio.addEventListener('pause', () => {
      if (this.state !== 'loading') this.setState('paused');
    });
    audio.addEventListener('ended', () => {
      this.setState('idle');
      this.emit('ended');
    });
    audio.addEventListener('error', () => {
      this.setState('error');
      this.emit('error', 'Audio playback error');
    });
  }

  async play(): Promise<void> {
    if (!this.currentAudio) return;
    if (this.ctx?.state === 'suspended') await this.ctx.resume();
    await this.currentAudio.play();
  }

  pause(): void {
    this.currentAudio?.pause();
  }

  async seek(positionMs: number): Promise<void> {
    if (!this.currentAudio) return;
    this.currentAudio.currentTime = positionMs / 1000;
  }

  setVolume(volume: number): void {
    const v = Math.max(0, Math.min(1, volume));
    // Always set the audio element's volume so direct playback
    // (no source node) still respects the user's volume setting.
    if (this.currentAudio) {
      this.currentAudio.volume = v;
    }
    // Set the Web Audio gain too when we have a source node.
    // When there's no source node, the gain isn't in the audio
    // path, but the value is kept in case a future load wires one.
    if (this.gainNode) {
      this.gainNode.gain.value = v;
    }
  }

  getDuration(): number {
    return this.currentAudio ? Math.round(this.currentAudio.duration * 1000) : 0;
  }

  getPosition(): number {
    return this.currentAudio ? Math.round(this.currentAudio.currentTime * 1000) : 0;
  }

  destroy(): void {
    this.cancelPreload();
    this.cleanupCurrentAudio();
    this.currentAudio = null;
    try {
      equalizer.disconnect();
    } catch {
      // ignore — equalizer may not have been connected
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.gainNode = null;
    }
  }
}

export const audioEngine = new AudioEngine();
