export type YtMusicErrorCode =
  | 'NETWORK_DNS'
  | 'NETWORK_TIMEOUT'
  | 'NETWORK_UNREACHABLE'
  | 'HTTP_RATE_LIMITED'
  | 'HTTP_FORBIDDEN'
  | 'VIDEO_UNAVAILABLE'
  | 'VIDEO_REGION_LOCKED'
  | 'VIDEO_AGE_RESTRICTED'
  | 'VIDEO_PRIVATE'
  | 'YTDLP_MISSING'
  | 'YTDLP_SPAWN'
  | 'YTDLP_NO_OUTPUT'
  | 'YTDLP_UNKNOWN';

export interface YtMusicErrorParts {
  code: YtMusicErrorCode;
  message: string;
  hint: string;
  retryable: boolean;
  raw: string;
}

const NO_HINT = '';

const MESSAGES: Record<YtMusicErrorCode, { message: string; hint: string; retryable: boolean }> = {
  NETWORK_DNS: {
    message: "Can't reach YouTube. DNS lookup failed.",
    hint: 'Check your internet connection. If DNS keeps failing, try a public resolver (1.1.1.1, 8.8.8.8).',
    retryable: true,
  },
  NETWORK_TIMEOUT: {
    message: 'Connection to YouTube timed out.',
    hint: 'Network is slow or blocked. Try again, or configure HTTPS_PROXY if you are behind a corporate firewall.',
    retryable: true,
  },
  NETWORK_UNREACHABLE: {
    message: 'Cannot reach YouTube from this network.',
    hint: 'YouTube may be blocked by your ISP, country, or workplace. Configure HTTPS_PROXY or use a VPN.',
    retryable: false,
  },
  HTTP_RATE_LIMITED: {
    message: 'YouTube rate-limited the request (HTTP 429).',
    hint: 'Wait a minute and try again. Avoid rapid-fire playback requests.',
    retryable: true,
  },
  HTTP_FORBIDDEN: {
    message: 'YouTube blocked the request (HTTP 403).',
    hint: 'YouTube anti-bot triggered. Update yt-dlp to the latest version.',
    retryable: true,
  },
  VIDEO_UNAVAILABLE: {
    message: 'This track is unavailable on YouTube Music.',
    hint: 'The video may have been removed or deleted by the uploader.',
    retryable: false,
  },
  VIDEO_REGION_LOCKED: {
    message: 'This track is not available in your region.',
    hint: 'Geo-restricted content. Use a VPN or pick a different track.',
    retryable: false,
  },
  VIDEO_AGE_RESTRICTED: {
    message: 'This track is age-restricted.',
    hint: 'Age-restricted content cannot be streamed through this source.',
    retryable: false,
  },
  VIDEO_PRIVATE: {
    message: 'This track is private.',
    hint: 'Private videos cannot be streamed. Ask the owner to make it public.',
    retryable: false,
  },
  YTDLP_MISSING: {
    message: 'yt-dlp is not installed.',
    hint: 'Install it from https://github.com/yt-dlp/yt-dlp and restart, or set the YT_DLP_PATH environment variable.',
    retryable: false,
  },
  YTDLP_SPAWN: {
    message: 'Failed to start yt-dlp.',
    hint: 'Check that yt-dlp is executable and not blocked by antivirus.',
    retryable: true,
  },
  YTDLP_NO_OUTPUT: {
    message: 'yt-dlp returned no playable URL.',
    hint: 'Update yt-dlp to the latest release and try again.',
    retryable: true,
  },
  YTDLP_UNKNOWN: {
    message: 'yt-dlp reported an error.',
    hint: 'Update yt-dlp and try again. If it keeps failing, open an issue with the raw error below.',
    retryable: true,
  },
};

function matchAny(stderr: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(stderr));
}

export function classifyYtDlpError(stderr: string, exitCode: number | null): YtMusicErrorParts {
  const s = stderr || '';

  if (
    matchAny(s, [
      /getaddrinfo failed/i,
      /Failed to resolve/i,
      /No such host/i,
      /Name or service not known/i,
      /11001/,
    ])
  ) {
    return build('NETWORK_DNS', s);
  }
  if (matchAny(s, [/timed out/i, /timeout/i, /ETIMEDOUT/])) {
    return build('NETWORK_TIMEOUT', s);
  }
  if (matchAny(s, [/ENETUNREACH/i, /Network is unreachable/i, /No route to host/i])) {
    return build('NETWORK_UNREACHABLE', s);
  }
  if (matchAny(s, [/HTTP Error 429/, /Too Many Requests/i])) {
    return build('HTTP_RATE_LIMITED', s);
  }
  if (matchAny(s, [/HTTP Error 403/, /Forbidden/i])) {
    return build('HTTP_FORBIDDEN', s);
  }
  if (matchAny(s, [/Sign in to confirm/i, /not a bot/i, /Sign in to confirm your age/i])) {
    return build('HTTP_FORBIDDEN', s);
  }
  if (
    matchAny(s, [/Video unavailable/i, /This video is no longer available/i, /has been removed/i])
  ) {
    return build('VIDEO_UNAVAILABLE', s);
  }
  if (matchAny(s, [/not available in your country/i, /region/i, /geo[- ]?restrict/i])) {
    return build('VIDEO_REGION_LOCKED', s);
  }
  if (matchAny(s, [/age[- ]?restrict/i])) {
    return build('VIDEO_AGE_RESTRICTED', s);
  }
  if (matchAny(s, [/Private video/i, /Video is private/i])) {
    return build('VIDEO_PRIVATE', s);
  }

  if (exitCode === null) return build('YTDLP_SPAWN', s);
  if (exitCode !== 0) return build('YTDLP_UNKNOWN', s);
  return build('YTDLP_NO_OUTPUT', s);
}

function build(code: YtMusicErrorCode, raw: string): YtMusicErrorParts {
  const tpl = MESSAGES[code];
  return { code, message: tpl.message, hint: tpl.hint, retryable: tpl.retryable, raw };
}

export class YtMusicError extends Error {
  override readonly name = 'YtMusicError';
  readonly code: YtMusicErrorCode;
  readonly hint: string;
  readonly retryable: boolean;
  readonly raw: string;

  constructor(parts: YtMusicErrorParts) {
    super(formatMessage(parts));
    this.code = parts.code;
    this.hint = parts.hint;
    this.retryable = parts.retryable;
    this.raw = parts.raw;
  }
}

export function formatMessage(parts: YtMusicErrorParts): string {
  const hint = parts.hint && parts.hint !== NO_HINT ? ` ${parts.hint}` : '';
  const raw = parts.raw ? ` (raw: ${parts.raw.slice(0, 200)})` : '';
  return `${parts.message}${hint}${raw}`;
}

export function isRetryable(code: YtMusicErrorCode): boolean {
  return MESSAGES[code].retryable;
}
