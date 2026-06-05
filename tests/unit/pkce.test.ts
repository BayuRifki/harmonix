import { describe, it, expect } from 'vitest';
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  createPkcePair,
} from '../../electron/main/auth/pkce';

describe('PKCE helpers', () => {
  it('generates verifier of correct length', () => {
    expect(generateCodeVerifier(64)).toHaveLength(64);
    expect(generateCodeVerifier(128)).toHaveLength(128);
  });

  it('verifier uses RFC 7636 character set', () => {
    const v = generateCodeVerifier(200);
    expect(v).toMatch(/^[A-Za-z0-9\-._~]+$/);
  });

  it('two verifiers are different', () => {
    const a = generateCodeVerifier(64);
    const b = generateCodeVerifier(64);
    expect(a).not.toBe(b);
  });

  it('challenge is base64url-encoded SHA-256', () => {
    const v = generateCodeVerifier(64);
    const c = generateCodeChallenge(v);
    expect(c).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(c.length).toBeGreaterThan(30);
    expect(c.length).toBeLessThan(50);
  });

  it('challenge is deterministic for same verifier', () => {
    const v = 'test-verifier-1234567890';
    expect(generateCodeChallenge(v)).toBe(generateCodeChallenge(v));
  });

  it('state is base64url', () => {
    const s = generateState(16);
    expect(s).toMatch(/^[A-Za-z0-9\-_]+$/);
  });

  it('createPkcePair returns all three fields', () => {
    const pair = createPkcePair();
    expect(pair.verifier).toHaveLength(64);
    expect(pair.challenge).toMatch(/^[A-Za-z0-9\-_]+$/);
    expect(pair.state.length).toBeGreaterThan(0);
  });

  it('createPkcePair has matching verifier and challenge', () => {
    const pair = createPkcePair();
    expect(generateCodeChallenge(pair.verifier)).toBe(pair.challenge);
  });
});
