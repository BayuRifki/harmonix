import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { equalizer } from '../../src/lib/audio/equalizer';
import { AudioEngine } from '../../src/lib/audio/engine';

interface MockFilter {
  type: BiquadFilterType;
  frequency: { value: number };
  Q: { value: number };
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
}

interface MockGainNode {
  gain: { value: number };
  connect: ReturnType<typeof vi.fn>;
  disconnect: ReturnType<typeof vi.fn>;
  context: MockAudioContext;
}

interface MockAudioContext {
  createGain: ReturnType<typeof vi.fn>;
  createBiquadFilter: ReturnType<typeof vi.fn>;
  createMediaElementSource: ReturnType<typeof vi.fn>;
  destination: AudioNode;
  close: ReturnType<typeof vi.fn>;
  state: AudioContextState;
  resume: ReturnType<typeof vi.fn>;
}

function makeMockAudioContext(): {
  ctx: MockAudioContext;
  gain: MockGainNode;
  destination: AudioNode;
  filters: MockFilter[];
} {
  const filters: MockFilter[] = [];
  const gain: MockGainNode = {
    gain: { value: 1 },
    connect: vi.fn(),
    disconnect: vi.fn(),
    context: null as unknown as MockAudioContext,
  };
  const destination = {
    context: null as unknown as AudioContext,
    connect: vi.fn(),
    disconnect: vi.fn(),
  } as unknown as AudioNode;
  const ctx: MockAudioContext = {
    createGain: vi.fn(() => gain),
    createBiquadFilter: vi.fn(() => {
      const f: MockFilter = {
        type: 'peaking',
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: { value: 0 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      };
      filters.push(f);
      return f as unknown as BiquadFilterNode;
    }),
    createMediaElementSource: vi.fn((el: HTMLAudioElement) => ({
      connect: vi.fn(),
      disconnect: vi.fn(),
      mediaElement: el,
    })),
    destination,
    close: vi.fn(),
    state: 'running',
    resume: vi.fn(),
  };
  gain.context = ctx;
  (destination as unknown as { context: AudioContext }).context = ctx as unknown as AudioContext;
  return { ctx, gain, destination, filters };
}

describe('Equalizer wiring into the audio engine', () => {
  let mock: ReturnType<typeof makeMockAudioContext>;
  let originalAudioContext: typeof AudioContext | undefined;
  let originalLoad: typeof HTMLMediaElement.prototype.load;
  let originalPause: typeof HTMLMediaElement.prototype.pause;

  beforeEach(() => {
    mock = makeMockAudioContext();
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext };
    originalAudioContext = g.AudioContext;
    g.AudioContext = vi.fn(() => mock.ctx) as unknown as typeof AudioContext;
    originalLoad = HTMLMediaElement.prototype.load;
    originalPause = HTMLMediaElement.prototype.pause;
    HTMLMediaElement.prototype.load = (): void => undefined;
    HTMLMediaElement.prototype.pause = (): void => undefined;
    equalizer.disconnect();
  });

  afterEach(() => {
    const g = globalThis as unknown as { AudioContext?: typeof AudioContext };
    if (originalAudioContext) {
      g.AudioContext = originalAudioContext;
    } else {
      delete g.AudioContext;
    }
    HTMLMediaElement.prototype.load = originalLoad;
    HTMLMediaElement.prototype.pause = originalPause;
  });

  it('load() ensures the context, which wires the gainNode through the equalizer', () => {
    const engine = new AudioEngine();
    void engine.load('file:///test.mp3');
    expect(equalizer.isConnected()).toBe(true);
  });

  it('does not create a Y-splitter (gainNode is not connected directly to destination)', () => {
    const engine = new AudioEngine();
    void engine.load('file:///test.mp3');
    const directCalls = mock.gain.connect.mock.calls.filter(
      ([dest]: unknown[]) => dest === mock.destination,
    );
    expect(directCalls).toHaveLength(0);
  });

  it('connects the last filter of the equalizer chain to the destination', () => {
    const engine = new AudioEngine();
    void engine.load('file:///test.mp3');
    const lastFilter = mock.filters[mock.filters.length - 1];
    const destCalls = lastFilter.connect.mock.calls.filter(
      ([dest]: unknown[]) => dest === mock.destination,
    );
    expect(destCalls).toHaveLength(1);
  });

  it('engine.destroy() disconnects the equalizer from the graph', () => {
    const engine = new AudioEngine();
    void engine.load('file:///test.mp3');
    expect(equalizer.isConnected()).toBe(true);
    engine.destroy();
    expect(equalizer.isConnected()).toBe(false);
  });

  it('createGain is called only on the first ensureContext, not on every load', () => {
    const engine = new AudioEngine();
    void engine.load('file:///a.mp3');
    void engine.load('file:///b.mp3');
    expect(mock.ctx.createGain).toHaveBeenCalledTimes(1);
  });
});
