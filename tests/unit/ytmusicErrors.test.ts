import { describe, it, expect } from 'vitest';
import {
  classifyYtDlpError,
  formatMessage,
  isRetryable,
  YtMusicError,
} from '../../electron/main/sources/ytmusic/errors';
import { preflightWith, type LookupFn } from '../../electron/main/sources/ytmusic/ytdlp';

function makeLookup(impl: LookupFn): LookupFn {
  return impl;
}

describe('classifyYtDlpError', () => {
  it('classifies getaddrinfo / DNS failure', () => {
    const stderr =
      'ERROR: [youtube] ywpJACWd0dA: Unable to download API page: ' +
      "HTTPSConnection(host='www.youtube.com', port=443): " +
      "Failed to resolve 'www.youtube.com' ([Errno 11001] getaddrinfo failed)";
    const out = classifyYtDlpError(stderr, 1);
    expect(out.code).toBe('NETWORK_DNS');
    expect(out.retryable).toBe(true);
    expect(out.message).toMatch(/reach YouTube/i);
    expect(out.hint).toMatch(/1\.1\.1\.1|8\.8\.8\.8/);
  });

  it('classifies timeout', () => {
    const out = classifyYtDlpError('The read operation timed out', 1);
    expect(out.code).toBe('NETWORK_TIMEOUT');
    expect(out.retryable).toBe(true);
  });

  it('classifies ETIMEDOUT', () => {
    const out = classifyYtDlpError('connect ETIMEDOUT 142.250.190.78:443', 1);
    expect(out.code).toBe('NETWORK_TIMEOUT');
  });

  it('classifies network unreachable', () => {
    const out = classifyYtDlpError('connect ENETUNREACH 10.0.0.1:443', 1);
    expect(out.code).toBe('NETWORK_UNREACHABLE');
    expect(out.retryable).toBe(false);
  });

  it('classifies 429 rate limit', () => {
    const out = classifyYtDlpError('HTTP Error 429: Too Many Requests', 1);
    expect(out.code).toBe('HTTP_RATE_LIMITED');
    expect(out.retryable).toBe(true);
  });

  it('classifies 403 forbidden', () => {
    const out = classifyYtDlpError('HTTP Error 403: Forbidden', 1);
    expect(out.code).toBe('HTTP_FORBIDDEN');
  });

  it('classifies bot-challenge as forbidden', () => {
    const out = classifyYtDlpError('Sign in to confirm you are not a bot', 1);
    expect(out.code).toBe('HTTP_FORBIDDEN');
  });

  it('classifies region-locked video', () => {
    const out = classifyYtDlpError('Video not available in your country', 1);
    expect(out.code).toBe('VIDEO_REGION_LOCKED');
    expect(out.retryable).toBe(false);
  });

  it('classifies age-restricted video', () => {
    const out = classifyYtDlpError(
      'Video is age-restricted and cannot be watched without logging in',
      1,
    );
    expect(out.code).toBe('VIDEO_AGE_RESTRICTED');
    expect(out.retryable).toBe(false);
  });

  it('classifies private video', () => {
    const out = classifyYtDlpError('Private video. Sign in if you have access to this video', 1);
    expect(out.code).toBe('VIDEO_PRIVATE');
  });

  it('classifies removed video', () => {
    const out = classifyYtDlpError('This video has been removed by the uploader', 1);
    expect(out.code).toBe('VIDEO_UNAVAILABLE');
  });

  it('classifies spawn failure (null exit code)', () => {
    const out = classifyYtDlpError('', null);
    expect(out.code).toBe('YTDLP_SPAWN');
  });

  it('classifies non-zero exit with no matching pattern as UNKNOWN', () => {
    const out = classifyYtDlpError('Some weird python traceback happened', 2);
    expect(out.code).toBe('YTDLP_UNKNOWN');
    expect(out.retryable).toBe(true);
  });

  it("classifies no-output (zero exit but no URL is the consumer's job)", () => {
    const out = classifyYtDlpError('', 0);
    expect(out.code).toBe('YTDLP_NO_OUTPUT');
  });
});

describe('formatMessage', () => {
  it('includes the message, hint and a short raw snippet', () => {
    const parts = classifyYtDlpError('Failed to resolve', 1);
    const msg = formatMessage(parts);
    expect(msg).toContain(parts.message);
    expect(msg).toContain(parts.hint);
    expect(msg).toContain('raw:');
  });

  it('truncates long raw snippets to 200 chars', () => {
    const parts = classifyYtDlpError('x'.repeat(1000), 1);
    const msg = formatMessage(parts);
    const rawMarker = msg.indexOf('raw:');
    expect(rawMarker).toBeGreaterThan(-1);
    const afterRaw = msg
      .slice(rawMarker + 4)
      .trim()
      .replace(/\)$/, '')
      .trim();
    expect(afterRaw.length).toBeLessThanOrEqual(200);
  });
});

describe('isRetryable', () => {
  it('returns true for DNS', () => {
    expect(isRetryable('NETWORK_DNS')).toBe(true);
  });
  it('returns false for region lock', () => {
    expect(isRetryable('VIDEO_REGION_LOCKED')).toBe(false);
  });
});

describe('YtMusicError', () => {
  it('exposes code, hint, retryable and raw as properties', () => {
    const parts = classifyYtDlpError('Failed to resolve', 1);
    const err = new YtMusicError(parts);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('NETWORK_DNS');
    expect(err.hint).toBe(parts.hint);
    expect(err.retryable).toBe(true);
    expect(err.raw).toContain('Failed to resolve');
    expect(err.name).toBe('YtMusicError');
    expect(err.message).toContain(parts.message);
  });
});

describe('preflightWith', () => {
  it('resolves when DNS lookup succeeds', async () => {
    const calls: string[] = [];
    const lookup = makeLookup(async (host) => {
      calls.push(host);
      return { address: '142.250.190.78', family: 4 };
    });
    await expect(preflightWith(lookup)).resolves.toBeUndefined();
    expect(calls).toEqual(['music.youtube.com']);
  });

  it('throws YtMusicError with NETWORK_DNS code when lookup fails with ENOTFOUND', async () => {
    const err = Object.assign(new Error('getaddrinfo ENOTFOUND music.youtube.com'), {
      code: 'ENOTFOUND',
    });
    const lookup = makeLookup(async () => {
      throw err;
    });
    await expect(preflightWith(lookup)).rejects.toMatchObject({
      name: 'YtMusicError',
      code: 'NETWORK_DNS',
      retryable: true,
    });
  });

  it('throws YtMusicError with NETWORK_DNS code when lookup fails with ETIMEDOUT', async () => {
    const err = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
    const lookup = makeLookup(async () => {
      throw err;
    });
    await expect(preflightWith(lookup)).rejects.toMatchObject({
      code: 'NETWORK_DNS',
    });
  });

  it('throws YtMusicError with NETWORK_DNS code when lookup fails with generic error', async () => {
    const lookup = makeLookup(async () => {
      throw new Error('Some weird DNS failure');
    });
    await expect(preflightWith(lookup)).rejects.toMatchObject({
      code: 'NETWORK_DNS',
    });
  });
});
