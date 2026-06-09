// Pure logic for the color extraction Web Worker. Splitting this from
// the worker entry point lets us unit-test the math (and the message
// protocol) without needing a real Web Worker runtime (jsdom doesn't
// support workers).

import { clusterPixels, type HslColor } from '../colorExtractor';

export interface ColorExtractRequest {
  id: number;
  data: ArrayBuffer;
}

export interface ColorExtractResponse {
  id: number;
  result: HslColor | null;
  error?: string;
}

/**
 * Process a worker extract request. Pure: takes an ArrayBuffer of
 * RGBA pixels (4 bytes per pixel), returns the HSL color for the
 * dominant hue bucket. The actual `clusterPixels` call is unchanged
 * from the previous synchronous implementation.
 */
export function processExtract(req: ColorExtractRequest): ColorExtractResponse {
  const { id, data } = req;
  try {
    const pixels = new Uint8ClampedArray(data);
    const result = clusterPixels(pixels);
    return { id, result };
  } catch (err) {
    return { id, result: null, error: (err as Error).message };
  }
}
