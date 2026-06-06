import { describe, it, expect, beforeEach, vi } from 'vitest';

const apiMock = {
  eq: {
    getState: vi.fn(),
    saveState: vi.fn(),
    listAllPresets: vi.fn(),
    listCustomPresets: vi.fn(),
    saveCustomPreset: vi.fn(),
    deleteCustomPreset: vi.fn(),
  },
};

vi.stubGlobal('window', { api: apiMock });

let useEqualizerStore: typeof import('../../src/stores/equalizerStore').useEqualizerStore;

beforeEach(async () => {
  vi.clearAllMocks();
  apiMock.eq.getState.mockResolvedValue({
    activePreset: null,
    currentGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  });
  apiMock.eq.listAllPresets.mockResolvedValue({
    builtin: [
      { name: 'Flat', builtin: true, gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
      { name: 'Rock', builtin: true, gains: [5, 4, 3, 1, -1, -1, 2, 3, 4, 5] },
    ],
    custom: [],
  });
  apiMock.eq.saveState.mockResolvedValue({ ok: true });
  apiMock.eq.saveCustomPreset.mockImplementation(async ({ name, gains }) => ({
    id: 1,
    name,
    gains,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }));
  apiMock.eq.deleteCustomPreset.mockResolvedValue({ ok: true });

  if (!useEqualizerStore) {
    const mod = await import('../../src/stores/equalizerStore');
    useEqualizerStore = mod.useEqualizerStore;
  }
  useEqualizerStore.setState({
    builtinPresets: [],
    customPresets: [],
    activePreset: null,
    currentGains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
    loaded: false,
    error: null,
  });
});

describe('equalizerStore', () => {
  it('load() fetches state and presets, marks loaded', async () => {
    await useEqualizerStore.getState().load();
    const s = useEqualizerStore.getState();
    expect(s.loaded).toBe(true);
    expect(s.error).toBeNull();
    expect(s.builtinPresets).toHaveLength(2);
    expect(s.builtinPresets[0].name).toBe('Flat');
  });

  it('load() is idempotent (no second fetch when loaded)', async () => {
    await useEqualizerStore.getState().load();
    const callsAfterFirst = apiMock.eq.getState.mock.calls.length;
    await useEqualizerStore.getState().load();
    expect(apiMock.eq.getState.mock.calls.length).toBe(callsAfterFirst);
  });

  it('applyPreset sets gains from builtin preset and records activePreset', async () => {
    await useEqualizerStore.getState().load();
    await useEqualizerStore.getState().applyPreset('Rock');
    const s = useEqualizerStore.getState();
    expect(s.activePreset).toBe('Rock');
    expect(s.currentGains).toEqual([5, 4, 3, 1, -1, -1, 2, 3, 4, 5]);
  });

  it('applyPreset with unknown name is a no-op', async () => {
    await useEqualizerStore.getState().load();
    const before = useEqualizerStore.getState().currentGains;
    await useEqualizerStore.getState().applyPreset('Unknown');
    expect(useEqualizerStore.getState().currentGains).toBe(before);
  });

  it('setBandGain updates one band and clears activePreset', async () => {
    await useEqualizerStore.getState().load();
    useEqualizerStore.setState({ activePreset: 'Rock' });
    await useEqualizerStore.getState().setBandGain(0, 7);
    const s = useEqualizerStore.getState();
    expect(s.currentGains[0]).toBe(7);
    expect(s.activePreset).toBeNull();
  });

  it('setBandGain ignores out-of-range index', async () => {
    await useEqualizerStore.getState().load();
    const before = [...useEqualizerStore.getState().currentGains];
    await useEqualizerStore.getState().setBandGain(-1, 5);
    await useEqualizerStore.getState().setBandGain(99, 5);
    expect(useEqualizerStore.getState().currentGains).toEqual(before);
  });

  it('setAllGains replaces all gains and clears activePreset', async () => {
    await useEqualizerStore.getState().load();
    useEqualizerStore.setState({ activePreset: 'Rock' });
    await useEqualizerStore.getState().setAllGains([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const s = useEqualizerStore.getState();
    expect(s.currentGains).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(s.activePreset).toBeNull();
  });

  it('reset applies flat gains and sets activePreset to Flat', async () => {
    await useEqualizerStore.getState().load();
    await useEqualizerStore.getState().setAllGains([5, 5, 5, 5, 5, 5, 5, 5, 5, 5]);
    await useEqualizerStore.getState().reset();
    const s = useEqualizerStore.getState();
    expect(s.currentGains).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(s.activePreset).toBe('Flat');
  });

  it('saveCustom appends to customPresets and sets activePreset', async () => {
    await useEqualizerStore.getState().load();
    await useEqualizerStore.getState().setAllGains([1, 1, 1, 1, 1, 1, 1, 1, 1, 1]);
    await useEqualizerStore.getState().saveCustom('MyMix');
    const s = useEqualizerStore.getState();
    expect(s.customPresets).toHaveLength(1);
    expect(s.customPresets[0].name).toBe('MyMix');
    expect(s.activePreset).toBe('MyMix');
  });

  it('saveCustom replaces existing custom preset of same name', async () => {
    await useEqualizerStore.getState().load();
    apiMock.eq.saveCustomPreset.mockResolvedValueOnce({
      id: 1,
      name: 'MyMix',
      gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      createdAt: 1,
      updatedAt: 1,
    });
    await useEqualizerStore.getState().saveCustom('MyMix');
    apiMock.eq.saveCustomPreset.mockResolvedValueOnce({
      id: 2,
      name: 'MyMix',
      gains: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      createdAt: 2,
      updatedAt: 2,
    });
    await useEqualizerStore.getState().saveCustom('MyMix');
    const s = useEqualizerStore.getState();
    expect(s.customPresets).toHaveLength(1);
    expect(s.customPresets[0].gains[0]).toBe(5);
  });

  it('deleteCustom removes preset and clears activePreset when matching', async () => {
    useEqualizerStore.setState({
      customPresets: [
        { id: 1, name: 'Foo', gains: [1, 1, 1, 1, 1, 1, 1, 1, 1, 1], createdAt: 1, updatedAt: 1 },
        { id: 2, name: 'Bar', gains: [2, 2, 2, 2, 2, 2, 2, 2, 2, 2], createdAt: 1, updatedAt: 1 },
      ],
      activePreset: 'Foo',
    });
    await useEqualizerStore.getState().deleteCustom('Foo');
    const s = useEqualizerStore.getState();
    expect(s.customPresets).toHaveLength(1);
    expect(s.customPresets[0].name).toBe('Bar');
    expect(s.activePreset).toBeNull();
  });

  it('deleteCustom keeps activePreset when deleting a different preset', async () => {
    useEqualizerStore.setState({
      customPresets: [
        { id: 1, name: 'Foo', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], createdAt: 1, updatedAt: 1 },
        { id: 2, name: 'Bar', gains: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0], createdAt: 1, updatedAt: 1 },
      ],
      activePreset: 'Foo',
    });
    await useEqualizerStore.getState().deleteCustom('Bar');
    expect(useEqualizerStore.getState().activePreset).toBe('Foo');
  });

  it('persists state via debounced saveState after a band change', async () => {
    await useEqualizerStore.getState().load();
    apiMock.eq.saveState.mockClear();
    await useEqualizerStore.getState().setBandGain(0, 5);
    await new Promise((r) => setTimeout(r, 600));
    expect(apiMock.eq.saveState).toHaveBeenCalled();
    const lastCall = apiMock.eq.saveState.mock.calls.at(-1)![0];
    expect(lastCall.currentGains[0]).toBe(5);
    expect(lastCall.activePreset).toBeNull();
  });
});
