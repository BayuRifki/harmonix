import { describe, it, expect, beforeEach, vi } from 'vitest';

const fakeInstance = { id: 'fake-innertube' };
const fakeCreate = vi.fn().mockResolvedValue(fakeInstance);

vi.mock('youtubei.js', () => ({
  Innertube: {
    create: fakeCreate,
  },
}));

let getInnertubeShared: typeof import('../../electron/main/sources/ytmusic/innertubeCache').getInnertubeShared;
let releaseInnertube: typeof import('../../electron/main/sources/ytmusic/innertubeCache').releaseInnertube;
let disposeInnertubeCache: typeof import('../../electron/main/sources/ytmusic/innertubeCache').disposeInnertubeCache;
let getInnertubeCacheStats: typeof import('../../electron/main/sources/ytmusic/innertubeCache').getInnertubeCacheStats;

beforeEach(async () => {
  fakeCreate.mockClear();
  fakeCreate.mockResolvedValue(fakeInstance);
  vi.resetModules();
  const mod = await import('../../electron/main/sources/ytmusic/innertubeCache');
  getInnertubeShared = mod.getInnertubeShared;
  releaseInnertube = mod.releaseInnertube;
  disposeInnertubeCache = mod.disposeInnertubeCache;
  getInnertubeCacheStats = mod.getInnertubeCacheStats;
  await disposeInnertubeCache('test-reset');
});

describe('Innertube cache', () => {
  it('first acquire creates the singleton', async () => {
    const a = await getInnertubeShared();
    expect(a).toBe(fakeInstance);
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });

  it('subsequent acquires return the same instance', async () => {
    const a = await getInnertubeShared();
    const b = await getInnertubeShared();
    expect(a).toBe(b);
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });

  it('concurrent acquires share the same in-flight creation', async () => {
    let resolveFn: (v: typeof fakeInstance) => void = () => {};
    fakeCreate.mockReturnValueOnce(
      new Promise<typeof fakeInstance>((r) => {
        resolveFn = r;
      }),
    );

    const p1 = getInnertubeShared();
    const p2 = getInnertubeShared();

    await new Promise((r) => setTimeout(r, 0));

    resolveFn(fakeInstance);

    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(b);
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });

  it('release decrements refCount and dispose clears when zero', async () => {
    await getInnertubeShared();
    await getInnertubeShared();
    expect(getInnertubeCacheStats().refCount).toBe(2);
    releaseInnertube();
    releaseInnertube();
    expect(getInnertubeCacheStats().refCount).toBe(0);
    await disposeInnertubeCache('test');
    expect(getInnertubeCacheStats().refCount).toBe(0);
    expect(fakeCreate).toHaveBeenCalledTimes(1);
  });

  it('dispose is deferred when refCount > 0', async () => {
    await getInnertubeShared();
    expect(getInnertubeCacheStats().refCount).toBe(1);
    await disposeInnertubeCache('test');
    expect(getInnertubeCacheStats().refCount).toBe(1);
  });

  it('re-acquire after dispose creates a fresh instance', async () => {
    await getInnertubeShared();
    releaseInnertube();
    await disposeInnertubeCache('test');
    const a = await getInnertubeShared();
    expect(a).toBe(fakeInstance);
    expect(fakeCreate).toHaveBeenCalledTimes(2);
  });
});
