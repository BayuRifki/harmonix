import { describe, it, expect, vi, beforeEach } from 'vitest';

interface FakeAudio {
  src: string;
  preload: string;
  crossOrigin: string;
  paused: boolean;
  readyState: number;
  duration: number;
  currentTime: number;
  load: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  removeAttribute: ReturnType<typeof vi.fn>;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
}

function makeFakeAudio(): FakeAudio {
  const audio: FakeAudio = {
    src: '',
    preload: '',
    crossOrigin: '',
    paused: true,
    readyState: 0,
    duration: 0,
    currentTime: 0,
    load: vi.fn(),
    pause: vi.fn(),
    removeAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  };
  return audio;
}

class FakeAudioContext {
  state: 'suspended' | 'running' = 'running';
  currentTime = 0;
  destination = {};
  createGain() {
    return {
      gain: {
        value: 1,
        cancelScheduledValues: vi.fn(),
        setValueAtTime: vi.fn(),
        linearRampToValueAtTime: vi.fn(),
      },
    };
  }
  createMediaElementSource(_audio: unknown) {
    return { connect: vi.fn(), disconnect: vi.fn() };
  }
  resume() {
    this.state = 'running';
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
}

class FakeBiquadFilter {
  type = 'allpass' as const;
  frequency = { value: 0 };
  gain = { value: 0 };
  connect() {}
  disconnect() {}
}

const fakeEqualizer = {
  connect: vi.fn(),
  disconnect: vi.fn(),
  setGains: vi.fn(),
  resetGains: vi.fn(),
};

const AudioMock = vi.fn();

function installMocks(): void {
  (globalThis as unknown as { Audio: unknown }).Audio = AudioMock;
  (globalThis as unknown as { AudioContext: unknown }).AudioContext = FakeAudioContext;
  (globalThis as unknown as { BiquadFilter: unknown }).BiquadFilter = FakeBiquadFilter;
}

vi.mock('../../src/lib/audio/equalizer', () => ({ equalizer: fakeEqualizer }));

const { AudioEngine } = await import('../../src/lib/audio/engine');

describe('AudioEngine.preload', () => {
  beforeEach(() => {
    AudioMock.mockReset();
    fakeEqualizer.connect.mockReset();
    installMocks();
  });

  it('preload() creates a hidden <audio> with the given src and starts loading', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/stream.mp3');

    expect(AudioMock).toHaveBeenCalledTimes(1);
    expect(audio.src).toBe('https://example.com/stream.mp3');
    expect(audio.preload).toBe('auto');
    expect(audio.load).toHaveBeenCalledTimes(1);
    expect(engine.hasPreloaded('https://example.com/stream.mp3')).toBe(true);
  });

  it('preload() with the same URL is a no-op', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/stream.mp3');
    engine.preload('https://example.com/stream.mp3');
    engine.preload('https://example.com/stream.mp3');

    expect(AudioMock).toHaveBeenCalledTimes(1);
  });

  it('preload() with a new URL cancels the previous preload', () => {
    const audios: FakeAudio[] = [];
    AudioMock.mockImplementation(() => {
      const a = makeFakeAudio();
      audios.push(a);
      return a;
    });

    const engine = new AudioEngine();
    engine.preload('https://example.com/a.mp3');
    engine.preload('https://example.com/b.mp3');

    expect(AudioMock).toHaveBeenCalledTimes(2);
    expect(audios[0]?.pause).toHaveBeenCalled();
    expect(audios[0]?.removeAttribute).toHaveBeenCalledWith('src');
    expect(audios[1]?.src).toBe('https://example.com/b.mp3');
    expect(engine.hasPreloaded('https://example.com/b.mp3')).toBe(true);
    expect(engine.hasPreloaded('https://example.com/a.mp3')).toBe(false);
  });

  it('local file:// preload does NOT set crossOrigin (would CORS-taint the audio)', () => {
    // Regression test: setting crossOrigin='anonymous' on a
    // file:// URL makes Chromium treat the load as CORS-tainted
    // and break `createMediaElementSource`. Local files are
    // intrinsically same-origin; omit the attribute.
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('file:///C:/music/track.mp3');

    expect(audio.crossOrigin).toBe('');
    expect(engine.hasPreloaded('file:///C:/music/track.mp3')).toBe(true);
  });

  it('http(s) preload sets crossOrigin=anonymous', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/stream.mp3');

    expect(audio.crossOrigin).toBe('anonymous');
  });

  it('cancelPreload() pauses the preloaded element and clears state', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/stream.mp3');
    engine.cancelPreload();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
    expect(engine.hasPreloaded('https://example.com/stream.mp3')).toBe(false);
  });

  it('cancelPreload() is a no-op when nothing is preloaded', () => {
    const engine = new AudioEngine();
    expect(() => engine.cancelPreload()).not.toThrow();
  });

  it('hasPreloaded() returns false for unrelated URLs', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/a.mp3');

    expect(engine.hasPreloaded('https://example.com/a.mp3')).toBe(true);
    expect(engine.hasPreloaded('https://example.com/b.mp3')).toBe(false);
    expect(engine.hasPreloaded('https://OTHER.com/a.mp3')).toBe(false);
  });

  it('destroy() also clears the preloaded element', () => {
    const audio = makeFakeAudio();
    AudioMock.mockImplementation(() => audio);

    const engine = new AudioEngine();
    engine.preload('https://example.com/stream.mp3');
    engine.destroy();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.removeAttribute).toHaveBeenCalledWith('src');
  });
});
