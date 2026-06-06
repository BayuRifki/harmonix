import { useEffect, useState } from 'react';

interface YtStatus {
  ytdlpAvailable: boolean;
  version: string | null;
  error?: string;
}

interface UpdateResult {
  ok: boolean;
  updated: boolean;
  oldVersion: string | null;
  newVersion: string | null;
  message: string;
}

type UpdateState = { kind: 'idle' } | { kind: 'running' } | { kind: 'done'; result: UpdateResult };

export function YtMusicStatus(): JSX.Element {
  const [status, setStatus] = useState<YtStatus | null>(null);
  const [update, setUpdate] = useState<UpdateState>({ kind: 'idle' });

  useEffect(() => {
    void window.api.ytmusic.status().then(setStatus);
  }, []);

  const handleCheckUpdate = async (): Promise<void> => {
    setUpdate({ kind: 'running' });
    try {
      const result = await window.api.ytmusic.checkUpdate();
      setUpdate({ kind: 'done', result });
      void window.api.ytmusic.status().then(setStatus);
    } catch (err) {
      setUpdate({
        kind: 'done',
        result: {
          ok: false,
          updated: false,
          oldVersion: null,
          newVersion: null,
          message: (err as Error).message,
        },
      });
    }
  };

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
        <div className="space-y-2">
          <p className="text-xs text-green-400" data-testid="ytmusic-status-ok">
            ✓ yt-dlp available{status.version ? ` (v${status.version})` : ''}
          </p>
          <button
            type="button"
            onClick={handleCheckUpdate}
            disabled={update.kind === 'running'}
            data-testid="ytmusic-check-update"
            className="text-xs px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {update.kind === 'running' ? 'Checking…' : 'Check for update'}
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-xs text-amber-400">⚠ yt-dlp not found</p>
          <p className="text-xs text-zinc-500">
            Bundled <code className="bg-zinc-800 px-1 rounded">resources/yt-dlp.exe</code> is
            missing. Restore it from git or set{' '}
            <code className="bg-zinc-800 px-1 rounded">YT_DLP_PATH</code> in your environment.
          </p>
          {status.error && <p className="text-xs text-zinc-600">{status.error}</p>}
        </div>
      )}
      {update.kind === 'done' && (
        <div
          className={`mt-3 text-xs rounded p-2 ${
            update.result.updated
              ? 'bg-emerald-950 border border-emerald-800 text-emerald-300'
              : update.result.ok
                ? 'bg-zinc-800 text-zinc-300'
                : 'bg-rose-950 border border-rose-800 text-rose-300'
          }`}
          data-testid="ytmusic-update-result"
        >
          {update.result.message}
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
