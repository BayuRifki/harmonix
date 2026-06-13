import { describe, it, expect } from 'vitest';
import { annotateSpotifyOAuthError } from '../../electron/main/ipc/auth';

/**
 * Regression guard: every Spotify OAuth `?error=…` code that
 * the user can hit in production gets a per-error actionable
 * hint. A bare 'server_error' or 'redirect_uri_mismatch' is
 * opaque — the user has no idea whether to wait and retry or
 * to dig into Dashboard config. The hint maps the opaque
 * string to "do X next".
 */
describe('annotateSpotifyOAuthError — per-error actionable hints', () => {
  it('annotates server_error with "wait 30-60s and retry" (not just the bare code)', () => {
    const out = annotateSpotifyOAuthError('server_error');
    expect(out).toMatch(/server_error/i);
    expect(out).toMatch(/try again|wait|retry/i);
  });

  it('annotates redirect_uri_mismatch with the Dashboard hint', () => {
    const out = annotateSpotifyOAuthError('redirect_uri_mismatch');
    expect(out).toMatch(/redirect_uri_mismatch/i);
    // Must reference the Dashboard so the user knows where to fix it.
    expect(out).toMatch(/Dashboard/i);
  });

  it('annotates access_denied with consent-screen guidance', () => {
    const out = annotateSpotifyOAuthError('access_denied');
    expect(out).toMatch(/access_denied|denied/i);
    expect(out).toMatch(/cancel|denied|retry|agree/i);
  });

  it('annotates invalid_client with the Client ID + Dashboard hint', () => {
    const out = annotateSpotifyOAuthError('invalid_client');
    expect(out).toMatch(/invalid_client/i);
    expect(out).toMatch(/SPOTIFY_CLIENT_ID|Dashboard/i);
  });

  it('passes through unknown errors with the bare prefix (not silent)', () => {
    // If Spotify adds a new error code we haven't mapped yet,
    // we still want SOME indicator (not just an empty string) so
    // the user can search the log for "Spotify OAuth error:".
    const out = annotateSpotifyOAuthError('unsupported_token_type');
    expect(out).toMatch(/Spotify OAuth error/);
    expect(out).toContain('unsupported_token_type');
  });

  it('never returns an empty string (always surfaces SOMETHING to the user)', () => {
    expect(annotateSpotifyOAuthError('any_error')).not.toBe('');
  });
});
