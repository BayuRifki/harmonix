import { describe, it, expect, vi } from 'vitest';
import { Equalizer } from '../../src/lib/audio/equalizer';

function makeMockNode(ctx: AudioContext): AudioNode & {
  _connects: AudioNode[];
  _disconnects: Array<AudioNode | undefined>;
} {
  type MockNode = AudioNode & {
    _connects: AudioNode[];
    _disconnects: Array<AudioNode | undefined>;
  };
  const node: MockNode = {
    context: ctx,
    _connects: [],
    _disconnects: [],
    connect(this: MockNode, dest: AudioNode) {
      this._connects.push(dest);
      return dest;
    },
    disconnect(this: MockNode, dest?: AudioNode) {
      this._disconnects.push(dest);
    },
  } as unknown as MockNode;
  return node;
}

function makeMockContext(): AudioContext {
  return {
    createBiquadFilter: (): BiquadFilterNode =>
      ({
        type: 'peaking' as BiquadFilterType,
        frequency: { value: 0 },
        Q: { value: 0 },
        gain: { value: 0 },
        connect: () => undefined,
        disconnect: () => undefined,
      }) as unknown as BiquadFilterNode,
  } as unknown as AudioContext;
}

function makeMockEqualizer(): {
  eq: Equalizer;
  input: ReturnType<typeof makeMockNode>;
  output: ReturnType<typeof makeMockNode>;
  ctx: AudioContext;
} {
  const eq = new Equalizer();
  const ctx = makeMockContext();
  const input = makeMockNode(ctx);
  const output = makeMockNode(ctx);
  eq.connect(input, output);
  return { eq, input, output, ctx };
}

describe('Equalizer', () => {
  it('has 10 bands', () => {
    const eq = new Equalizer();
    expect(eq.bands()).toHaveLength(10);
  });

  it('is not connected before connect()', () => {
    const eq = new Equalizer();
    expect(eq.isConnected()).toBe(false);
  });

  it('is connected after connect()', () => {
    const { eq } = makeMockEqualizer();
    expect(eq.isConnected()).toBe(true);
  });

  it('initial gains are all 0 dB', () => {
    const { eq } = makeMockEqualizer();
    const gains = eq.getGains();
    expect(gains).toHaveLength(10);
    gains.forEach((g) => expect(g).toBe(0));
  });

  it('setBandGain clamps to -12..+12 dB', () => {
    const { eq } = makeMockEqualizer();
    eq.setBandGain(0, 50);
    expect(eq.getGains()[0]).toBe(12);
    eq.setBandGain(0, -50);
    expect(eq.getGains()[0]).toBe(-12);
  });

  it('setBandGain ignores out-of-range index', () => {
    const { eq } = makeMockEqualizer();
    eq.setBandGain(99, 5);
    eq.setBandGain(-1, 5);
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });

  it('setAllGains sets all bands at once', () => {
    const { eq } = makeMockEqualizer();
    eq.setAllGains([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(eq.getGains()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('setAllGains ignores wrong length', () => {
    const { eq } = makeMockEqualizer();
    eq.setAllGains([1, 2, 3]);
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });

  it('reset brings all gains to 0', () => {
    const { eq } = makeMockEqualizer();
    eq.setAllGains([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    eq.reset();
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });
});

describe('Equalizer.connect() wiring', () => {
  it('inserts 10 BiquadFilters between input and output', () => {
    const ctx = makeMockContext();
    const createSpy = vi.spyOn(ctx, 'createBiquadFilter');
    const eq = new Equalizer();
    const input = makeMockNode(ctx);
    const output = makeMockNode(ctx);
    eq.connect(input, output);
    expect(createSpy).toHaveBeenCalledTimes(10);
  });

  it('disconnects the existing direct input→output connection', () => {
    const ctx = makeMockContext();
    const input = makeMockNode(ctx);
    const output = makeMockNode(ctx);
    const eq = new Equalizer();
    eq.connect(input, output);
    expect(input._disconnects).toContainEqual(output);
  });

  it('handles disconnect() throwing when no prior direct connection', () => {
    const ctx = makeMockContext();
    const throwingInput = {
      ...makeMockNode(ctx),
      disconnect: vi.fn(() => {
        throw new Error('not connected');
      }),
    } as unknown as ReturnType<typeof makeMockNode>;
    const output = makeMockNode(ctx);
    const eq = new Equalizer();
    expect(() => eq.connect(throwingInput, output)).not.toThrow();
  });

  it('connect() called twice tears down the first chain and rebuilds', () => {
    const ctx = makeMockContext();
    const eq = new Equalizer();
    const input1 = makeMockNode(ctx);
    const output1 = makeMockNode(ctx);
    eq.connect(input1, output1);
    const input2 = makeMockNode(ctx);
    const output2 = makeMockNode(ctx);
    eq.connect(input2, output2);
    expect(eq.isConnected()).toBe(true);
    expect(input1._disconnects.length).toBeGreaterThan(0);
  });

  it('reapplies stored gains to fresh filters on reconnect', () => {
    const ctx = makeMockContext();
    const eq = new Equalizer();
    eq.setBandGain(0, 7);
    eq.setBandGain(9, -3);
    expect(eq.getGains()).toEqual([7, 0, 0, 0, 0, 0, 0, 0, 0, -3]);
    const input = makeMockNode(ctx);
    const output = makeMockNode(ctx);
    eq.connect(input, output);
    expect(eq.getGains()).toEqual([7, 0, 0, 0, 0, 0, 0, 0, 0, -3]);
  });

  it('setBandGain works before connect() (state is preserved)', () => {
    const ctx = makeMockContext();
    const eq = new Equalizer();
    eq.setBandGain(0, 5);
    eq.setBandGain(1, -4);
    expect(eq.getGains()).toEqual([5, -4, 0, 0, 0, 0, 0, 0, 0, 0]);
    const input = makeMockNode(ctx);
    const output = makeMockNode(ctx);
    eq.connect(input, output);
    expect(eq.getGains()).toEqual([5, -4, 0, 0, 0, 0, 0, 0, 0, 0]);
  });

  it('disconnect() tears down all filters and reports not connected', () => {
    const ctx = makeMockContext();
    const eq = new Equalizer();
    const input = makeMockNode(ctx);
    const output = makeMockNode(ctx);
    eq.connect(input, output);
    expect(eq.isConnected()).toBe(true);
    eq.disconnect();
    expect(eq.isConnected()).toBe(false);
  });
});
