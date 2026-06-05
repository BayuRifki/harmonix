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
      this.gainNode.connect(this.ctx.destination);
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

  async load(url: string): Promise<void> {
    this.setState('loading');
    const ctx = this.ensureContext();
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }
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
    const audio = new Audio();
    const isLocalFile = url.startsWith('file://');
    if (isLocalFile) {
      audio.crossOrigin = 'anonymous';
    }
    audio.preload = 'auto';
    audio.src = url;
    this.currentAudio = audio;

    if (isLocalFile) {
      this.sourceNode = ctx.createMediaElementSource(audio);
      this.sourceNode.connect(this.gainNode!);
    }

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

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        resolve();
      };
      const onError = () => {
        audio.removeEventListener('canplay', onCanPlay);
        audio.removeEventListener('error', onError);
        reject(new Error('Failed to load audio'));
      };
      audio.addEventListener('canplay', onCanPlay);
      audio.addEventListener('error', onError);
      audio.load();
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
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = '';
      this.currentAudio = null;
    }
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }
    if (this.ctx) {
      void this.ctx.close();
      this.ctx = null;
      this.gainNode = null;
    }
  }
}

export const audioEngine = new AudioEngine();
