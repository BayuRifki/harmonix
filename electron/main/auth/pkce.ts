import { createHash, randomBytes } from 'node:crypto';

export function generateCodeVerifier(length = 64): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) {
    out += chars[bytes[i] % chars.length];
  }
  return out;
}

export function generateCodeChallenge(verifier: string): string {
  return createHash('sha256').update(verifier).digest('base64url');
}

export function generateState(length = 16): string {
  return randomBytes(length).toString('base64url');
}

export interface PkcePair {
  verifier: string;
  challenge: string;
  state: string;
}

export function createPkcePair(): PkcePair {
  const verifier = generateCodeVerifier(64);
  return {
    verifier,
    challenge: generateCodeChallenge(verifier),
    state: generateState(16),
  };
}
