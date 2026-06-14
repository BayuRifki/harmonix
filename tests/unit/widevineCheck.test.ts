import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isWidevineAvailable } from '../../src/lib/audio/widevineCheck';

describe('isWidevineAvailable — fail-fast check for Spotify SDK in Electron', () => {
  let originalNavigator: typeof navigator;
  let originalWindow: typeof window;

  beforeEach(() => {
    originalNavigator = globalThis.navigator;
    originalWindow = globalThis.window;
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', { value: originalNavigator, writable: true });
    Object.defineProperty(globalThis, 'window', { value: originalWindow, writable: true });
  });

  it('returns false when navigator.requestMediaKeySystemAccess is missing (older browser)', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { foo: 'bar' },
      writable: true,
    });
    return expect(isWidevineAvailable()).resolves.toBe(false);
  });

  it('returns false when requestMediaKeySystemAccess rejects with "No supported keysystem" (Electron default)', () => {
    // Reproduces the production failure: Electron's embedded
    // Chromium has no Widevine CDM. requestMediaKeySystemAccess
    // resolves to [] (empty supported configurations array) and
    // the helper short-circuits.
    const requestMediaKeySystemAccess = vi
      .fn()
      .mockRejectedValue(new Error('No supported keysystem was found.'));
    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMediaKeySystemAccess },
      writable: true,
    });
    return expect(isWidevineAvailable()).resolves.toBe(false);
  });

  it('returns true when the browser reports at least one supported configuration (real Chrome/Edge with Widevine)', () => {
    const fakeConfig = { audioCapabilities: [{ contentType: 'audio/mp4;codecs="avc1.42E01E"' }] };
    const requestMediaKeySystemAccess = vi.fn().mockResolvedValue([fakeConfig]);
    Object.defineProperty(globalThis, 'navigator', {
      value: { requestMediaKeySystemAccess },
      writable: true,
    });
    return expect(isWidevineAvailable()).resolves.toBe(true);
  });
});
