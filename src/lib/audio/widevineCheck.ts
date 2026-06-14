/**
 * Returns true if the browser exposes a usable Widevine CDM
 * (`com.widevine.alpha`) — the DRM layer that the Spotify Web
 * Playback SDK requires for premium audio decryption.
 *
 * **Why this matters:** Spotify's SDK is implemented on top of
 * EME (Encrypted Media Extensions). On call to
 * `navigator.requestMediaKeySystemAccess('com.widevine.alpha', …)`,
 * the browser must report a non-empty list of supported
 * configurations. Real Chrome / Edge / Firefox ship with
 * Widevine; **Electron's bundled Chromium does not**. The result
 * for an Electron user is the opaque
 *
 *   `Uncaught (in promise) EMEError: No supported keysystem was found.`
 *
 * that aborts SDK initialization. The user gets no audio and
 * the console shows the cryptic "Web Playback init: Failed to
 * initialize player". This helper lets us fail fast with an
 * actionable error BEFORE the SDK ever starts trying.
 */
export async function isWidevineAvailable(): Promise<boolean> {
  if (typeof navigator === 'undefined') return false;
  // Older browsers / jsdom — no EME at all.
  if (typeof navigator.requestMediaKeySystemAccess !== 'function') return false;
  try {
    const configs = await navigator.requestMediaKeySystemAccess('com.widevine.alpha', [
      { audioCapabilities: [{ contentType: 'audio/mp4;codecs="flac"' }] },
    ]);
    return Array.isArray(configs) && configs.length > 0;
  } catch {
    return false;
  }
}
