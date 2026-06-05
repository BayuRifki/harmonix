import { describe, it, expect } from 'vitest';
import { Equalizer } from '../../src/lib/audio/equalizer';

function makeMockEqualizer(): Equalizer {
  const eq = new Equalizer();
  const mockCtx = {
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
  const input = { context: mockCtx, connect: () => undefined } as unknown as AudioNode;
  const output = { context: mockCtx, connect: () => undefined } as unknown as AudioNode;
  eq.connect(input, output);
  return eq;
}

describe('Equalizer', () => {
  it('has 10 bands', () => {
    const eq = new Equalizer();
    expect(eq.bands()).toHaveLength(10);
  });

  it('initial gains are all 0 dB', () => {
    const eq = makeMockEqualizer();
    const gains = eq.getGains();
    expect(gains).toHaveLength(10);
    gains.forEach((g) => expect(g).toBe(0));
  });

  it('setBandGain clamps to -12..+12 dB', () => {
    const eq = makeMockEqualizer();
    eq.setBandGain(0, 50);
    expect(eq.getGains()[0]).toBe(12);
    eq.setBandGain(0, -50);
    expect(eq.getGains()[0]).toBe(-12);
  });

  it('setBandGain ignores out-of-range index', () => {
    const eq = makeMockEqualizer();
    eq.setBandGain(99, 5);
    eq.setBandGain(-1, 5);
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });

  it('setAllGains sets all bands at once', () => {
    const eq = makeMockEqualizer();
    eq.setAllGains([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(eq.getGains()).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it('setAllGains ignores wrong length', () => {
    const eq = makeMockEqualizer();
    eq.setAllGains([1, 2, 3]);
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });

  it('reset brings all gains to 0', () => {
    const eq = makeMockEqualizer();
    eq.setAllGains([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    eq.reset();
    expect(eq.getGains().every((g) => g === 0)).toBe(true);
  });
});
