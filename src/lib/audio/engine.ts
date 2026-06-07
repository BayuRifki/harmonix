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

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.gainNode = this.ctx.createGain();
      equalizer.connect(this.gainNode, this.ctx.destination);
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
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    // Fast path: a preload of this exact URL is already warm.
    if (this.preloadedAudio && this.preloadedUrl === url) {
      const reused = this.preloadedAudio;
      this.preloadedAudio = null;
      this.preloadedUrl = null;
      this.cleanupCurrentAudio();
      this.currentAudio = reused;

      // Always route the audio element through the AudioContext graph
      // (gain + 10-band EQ). Previously this was only done for
      // file:// URLs, which silently bypassed the EQ for HTTP streams
      // like YT Music (via googlevideo.com) and Jamendo.
      this.sourceNode = ctx.createMediaElementSource(reused);
      this.sourceNode.connect(this.gainNode!);

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

    // Always route through AudioContext. See note above.
    this.sourceNode = ctx.createMediaElementSource(audio);
    this.sourceNode.connect(this.gainNode!);

    this.attachAllListeners(audio);

    return new Promise((resolve, reject) => {
      const onCanPlay = (): void => {
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
        console.error(`[audioEngine] load failed (${reason}) for ${url}${message}`);
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
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
    if (this.currentAudio) {
      this.currentAudio.volume = Math.max(0, Math.min(1, volume));
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
    equalizer.disconnect();
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.gainNode = null;
    }
  }
}

export const audioEngine = new AudioEngine();
