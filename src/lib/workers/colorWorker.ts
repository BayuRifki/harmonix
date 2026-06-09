/// <reference lib="webworker" />
import {
  processExtract,
  type ColorExtractRequest,
  type ColorExtractResponse,
} from './colorWorkerCore';

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.addEventListener('message', (e: MessageEvent<ColorExtractRequest>): void => {
  const response: ColorExtractResponse = processExtract(e.data);
  ctx.postMessage(response);
});
