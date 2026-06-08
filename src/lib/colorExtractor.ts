export interface HslColor {
  h: number;
  s: number;
  l: number;
}

export interface AdaptivePalette {
  vibrant: HslColor;
  muted: HslColor;
  accent: HslColor;
}

export function rgbToHsl(r: number, g: number, b: number): HslColor {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

const HUE_BUCKETS = 12;
const MIN_SATURATION = 10;
const MIN_LIGHTNESS = 12;
const MAX_LIGHTNESS = 88;
const MID_LIGHTNESS = 50;
const ACCENT_SATURATION_CAP = 85;
const ACCENT_LIGHTNESS_MIN = 48;
const ACCENT_LIGHTNESS_MAX = 68;

interface Bucket {
  count: number;
  sumH: number;
  sumS: number;
  sumL: number;
  weight: number;
}

export function clusterPixels(pixels: Uint8ClampedArray): HslColor | null {
  const buckets: Bucket[] = [];
  for (let i = 0; i < HUE_BUCKETS; i++) {
    buckets.push({ count: 0, sumH: 0, sumS: 0, sumL: 0, weight: 0 });
  }

  for (let i = 0; i < pixels.length; i += 4) {
    const a = pixels[i + 3];
    if (a !== undefined && a < 128) continue;
    const r = pixels[i] ?? 0;
    const g = pixels[i + 1] ?? 0;
    const b = pixels[i + 2] ?? 0;
    const hsl = rgbToHsl(r, g, b);
    if (hsl.s < MIN_SATURATION) continue;
    if (hsl.l < MIN_LIGHTNESS || hsl.l > MAX_LIGHTNESS) continue;
    const lightnessPenalty = 1 - Math.abs(hsl.l - MID_LIGHTNESS) / MID_LIGHTNESS;
    const weight = hsl.s * Math.max(0.2, lightnessPenalty);
    const idx = Math.min(HUE_BUCKETS - 1, Math.floor((hsl.h / 360) * HUE_BUCKETS));
    const bucket = buckets[idx];
    if (!bucket) continue;
    bucket.count += 1;
    bucket.sumH += hsl.h;
    bucket.sumS += hsl.s;
    bucket.sumL += hsl.l;
    bucket.weight += weight;
  }

  let bestIdx = -1;
  let bestWeight = 0;
  for (let i = 0; i < buckets.length; i++) {
    const b = buckets[i];
    if (b && b.weight > bestWeight) {
      bestWeight = b.weight;
      bestIdx = i;
    }
  }
  if (bestIdx === -1 || bestWeight === 0) return null;

  const winner = buckets[bestIdx];
  if (!winner || winner.count === 0) return null;
  return {
    h: winner.sumH / winner.count,
    s: Math.min(ACCENT_SATURATION_CAP, winner.sumS / winner.count),
    l: Math.max(ACCENT_LIGHTNESS_MIN, Math.min(ACCENT_LIGHTNESS_MAX, winner.sumL / winner.count)),
  };
}

export function hslToString(c: HslColor): string {
  const h = ((Math.round(c.h) % 360) + 360) % 360;
  const s = Math.max(0, Math.min(100, Math.round(c.s)));
  const l = Math.max(0, Math.min(100, Math.round(c.l)));
  return `hsl(${h}, ${s}%, ${l}%)`;
}

function clampHue(h: number): number {
  return ((h % 360) + 360) % 360;
}

function clampPercent(v: number): number {
  return Math.max(0, Math.min(100, v));
}

export function buildPalette(accent: HslColor): AdaptivePalette {
  const h = clampHue(accent.h);
  const s = clampPercent(accent.s);
  const l = clampPercent(accent.l);
  return {
    vibrant: { h, s: Math.min(95, Math.max(55, s + 5)), l: Math.min(60, Math.max(48, l - 4)) },
    muted: { h, s: Math.min(45, Math.max(20, s * 0.45)), l: Math.min(28, Math.max(18, l * 0.42)) },
    accent: { h, s, l },
  };
}

export function interpolateHsl(a: HslColor, b: HslColor, t: number): HslColor {
  const clampedT = Math.max(0, Math.min(1, t));
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  else if (dh < -180) dh += 360;
  return {
    h: clampHue(a.h + dh * clampedT),
    s: a.s + (b.s - a.s) * clampedT,
    l: a.l + (b.l - a.l) * clampedT,
  };
}

export function interpolatePalette(
  from: AdaptivePalette,
  to: AdaptivePalette,
  t: number,
): AdaptivePalette {
  return {
    vibrant: interpolateHsl(from.vibrant, to.vibrant, t),
    muted: interpolateHsl(from.muted, to.muted, t),
    accent: interpolateHsl(from.accent, to.accent, t),
  };
}

export function paletteToCssVars(palette: AdaptivePalette): Record<string, string> {
  return {
    '--accent': hslToString(palette.accent),
    '--accent-hover': hslToString({ ...palette.accent, l: Math.max(35, palette.accent.l - 6) }),
    '--accent-vibrant': hslToString(palette.vibrant),
    '--accent-muted': hslToString(palette.muted),
  };
}

const DOWNSAMPLE_SIZE = 50;

type DrawContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

function getDrawContext(size: number): DrawContext {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(size, size);
    const ctx = canvas.getContext('2d');
    if (ctx) return ctx;
  }
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas 2d context unavailable');
  return ctx;
}

const _imageCache = new Map<string, { img: HTMLImageElement; promise: Promise<void> }>();

function cleanupImage(url: string): void {
  const entry = _imageCache.get(url);
  if (entry) {
    _imageCache.delete(url);
    try {
      entry.img.removeAttribute('src');
    } catch {
      // ignore
    }
  }
}

export async function extractDominantColor(url: string): Promise<HslColor | null> {
  if (typeof Image === 'undefined') return null;
  if (!url) return null;

  let img: HTMLImageElement;
  let loaded: Promise<void>;

  const cached = _imageCache.get(url);
  if (cached) {
    img = cached.img;
    loaded = cached.promise;
  } else {
    img = new Image();
    img.crossOrigin = 'anonymous';
    img.decoding = 'async';

    loaded = new Promise<void>((resolve, reject) => {
      img.onload = (): void => resolve();
      img.onerror = (): void => reject(new Error('image load failed'));
    });

    _imageCache.set(url, { img, promise: loaded });
    img.src = url;
  }

  try {
    await loaded;
  } catch {
    _imageCache.delete(url);
    return null;
  }

  if (!img.naturalWidth || !img.naturalHeight) {
    _imageCache.delete(url);
    return null;
  }

  let ctx: DrawContext;
  try {
    ctx = getDrawContext(DOWNSAMPLE_SIZE);
  } catch {
    _imageCache.delete(url);
    return null;
  }

  try {
    ctx.drawImage(img, 0, 0, DOWNSAMPLE_SIZE, DOWNSAMPLE_SIZE);
  } catch (err) {
    if (err instanceof DOMException && err.name === 'SecurityError') {
      cleanupImage(url);
      return null;
    }
    cleanupImage(url);
    return null;
  }

  let data: Uint8ClampedArray;
  try {
    const imageData = ctx.getImageData(0, 0, DOWNSAMPLE_SIZE, DOWNSAMPLE_SIZE);
    data = imageData.data;
  } catch {
    cleanupImage(url);
    return null;
  }

  setTimeout(() => cleanupImage(url), 5000);
  return clusterPixels(data);
}
