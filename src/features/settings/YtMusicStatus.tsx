import { useEffect, useState } from 'react';

interface YtStatus {
  ytdlpAvailable: boolean;
  version: string | null;
  error?: string;
}

export function YtMusicStatus(): JSX.Element {
  const [status, setStatus] = useState<YtStatus | null>(null);

  useEffect(() => {
    void window.api.ytmusic.status().then(setStatus);
  }, []);

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-white flex items-center gap-2">
          <span className="text-red-500">●</span> YouTube Music
        </h2>
        <a
          href="https://github.com/yt-dlp/yt-dlp"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          yt-dlp ↗
        </a>
      </div>
      {status === null ? (
        <p className="text-xs text-zinc-500">Checking…</p>
      ) : status.ytdlpAvailable ? (
        <p className="text-xs text-green-400">
          ✓ yt-dlp available{status.version ? ` (v${status.version})` : ''}
        </p>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-amber-400">⚠ yt-dlp not found</p>
          <p className="text-xs text-zinc-500">
            Install yt-dlp and ensure it is on PATH, or set{' '}
            <code className="bg-zinc-800 px-1 rounded">YT_DLP_PATH</code> in your environment.
          </p>
          {status.error && <p className="text-xs text-zinc-600">{status.error}</p>}
        </div>
      )}
      <p className="text-xs text-zinc-500 mt-3">
        Unofficial integration. You must accept the disclaimer before first use. See{' '}
        <a
          href="https://github.com/BayuRifki/harmonix/blob/main/docs/LEGAL.md"
          className="text-brand-400 hover:underline"
        >
          docs/LEGAL.md
        </a>
        .
      </p>
    </div>
  );
}
