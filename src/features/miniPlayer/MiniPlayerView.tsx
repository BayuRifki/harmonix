import { useEffect, useState, useRef, useCallback } from 'react';
import type {
  MiniPlayerStateSnapshot,
  MiniPlayerAction,
  MiniPlayerConfig,
} from '../../../electron/preload';

type Snapshot = MiniPlayerStateSnapshot;
type Action = MiniPlayerAction;

const INITIAL: Snapshot = {
  currentTrack: null,
  sourceId: null,
  isPlaying: false,
  loading: false,
  positionMs: 0,
  durationMs: 0,
  volume: 0.8,
  shuffle: false,
  repeat: 'off',
  hasNext: false,
  hasPrev: false,
  artworkUrl: null,
  title: null,
  artistLine: null,
  updatedAt: 0,
};

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

const SOURCE_COLORS: Record<string, string> = {
  local: 'bg-blue-900/60 text-blue-200 border-blue-800',
  demo: 'bg-zinc-800 text-zinc-300 border-zinc-700',
  spotify: 'bg-green-900/60 text-green-200 border-green-800',
  ytmusic: 'bg-red-900/60 text-red-200 border-red-800',
  deezer: 'bg-purple-900/60 text-purple-200 border-purple-800',
  jamendo: 'bg-amber-900/60 text-amber-200 border-amber-800',
  audius: 'bg-pink-900/60 text-pink-200 border-pink-800',
  soundcloud: 'bg-orange-900/60 text-orange-200 border-orange-800',
};

function sourceColor(source: string | null): string {
  if (!source) return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  return SOURCE_COLORS[source] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700';
}

function sourceLabel(source: string | null): string {
  if (!source) return '';
  if (source.startsWith('local:')) return 'local';
  return source;
}

export function MiniPlayerView(): JSX.Element {
  const [snapshot, setSnapshot] = useState<Snapshot>(INITIAL);
  const [config, setConfig] = useState<MiniPlayerConfig | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const contextRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void window.api.player.getState().then((s) => {
      if (!cancelled && s) setSnapshot(s);
    });
    void window.api.miniPlayer.status().then((c) => {
      if (!cancelled) setConfig(c);
    });
    const off = window.api.player.onStateChanged((s) => {
      setSnapshot(s);
    });
    const tick = window.setInterval(() => {
      if (snapshot.isPlaying) {
        setSnapshot((prev) => {
          if (!prev.isPlaying) return prev;
          const next = prev.positionMs + 500;
          if (prev.durationMs > 0 && next > prev.durationMs) return prev;
          return { ...prev, positionMs: next };
        });
      }
    }, 500);
    return (): void => {
      cancelled = true;
      off();
      window.clearInterval(tick);
    };
  }, [snapshot.isPlaying]);

  useEffect(() => {
    const onClick = (e: MouseEvent): void => {
      if (contextRef.current && !contextRef.current.contains(e.target as Node)) {
        setContextOpen(false);
      }
    };
    window.addEventListener('mousedown', onClick);
    return (): void => window.removeEventListener('mousedown', onClick);
  }, []);

  const send = useCallback((action: Action): void => {
    void window.api.player.command(action);
  }, []);

  const onSeek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const targetMs = Math.round(ratio * snapshot.durationMs);
      send({ type: 'seek', positionMs: targetMs });
    },
    [snapshot.durationMs, send],
  );

  const onExpand = useCallback(() => {
    void window.api.miniPlayer.expand();
  }, []);

  const onClose = useCallback(() => {
    void window.api.miniPlayer.hide();
  }, []);

  const onToggleAlwaysOnTop = useCallback(() => {
    const next = !(config?.alwaysOnTop ?? false);
    void window.api.miniPlayer.setAlwaysOnTop(next).then(() => {
      setConfig((c) => (c ? { ...c, alwaysOnTop: next } : c));
    });
    setContextOpen(false);
  }, [config?.alwaysOnTop]);

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextOpen((v) => !v);
  }, []);

  const onSaveBounds = useCallback(() => {
    void window.api.miniPlayer.saveBounds();
  }, []);

  useEffect(() => {
    const onResize = (): void => {
      onSaveBounds();
    };
    window.addEventListener('resize', onResize);
    return (): void => window.removeEventListener('resize', onResize);
  }, [onSaveBounds]);

  const hasTrack = snapshot.currentTrack !== null;
  const progress = snapshot.durationMs > 0 ? (snapshot.positionMs / snapshot.durationMs) * 100 : 0;
  const showSource = snapshot.sourceId;

  return (
    <div
      className="h-full w-full bg-black text-zinc-100 flex flex-col select-none"
      onContextMenu={onContextMenu}
    >
      <div className="flex-1 flex items-center gap-3 px-3 py-2 min-h-0">
        <div className="w-14 h-14 bg-zinc-900 rounded shrink-0 overflow-hidden flex items-center justify-center text-zinc-700">
          {snapshot.artworkUrl ? (
            <img
              src={snapshot.artworkUrl}
              alt=""
              className="w-full h-full object-cover"
              draggable={false}
              onError={(e): void => {
                e.currentTarget.style.display = 'none';
              }}
            />
          ) : (
            <span className="text-xl" aria-hidden>
              ♪
            </span>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm text-zinc-100 truncate leading-tight" title={snapshot.title ?? ''}>
            {snapshot.title ?? 'No track playing'}
          </p>
          <p
            className="text-xs text-zinc-500 truncate leading-tight"
            title={snapshot.artistLine ?? ''}
          >
            {snapshot.artistLine ?? 'Select a track to begin'}
          </p>
          {showSource && (
            <code
              className={`inline-block text-[9px] uppercase tracking-wide px-1 py-0.5 rounded border mt-0.5 ${sourceColor(showSource)}`}
              title={`Source: ${showSource}`}
            >
              {sourceLabel(showSource)}
            </code>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0" data-testid="mini-controls">
          <button
            type="button"
            onClick={(): void => send({ type: 'prev' })}
            disabled={!hasTrack || !snapshot.hasPrev}
            className="w-7 h-7 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center text-sm"
            aria-label="Previous"
            title="Previous"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={(): void => send({ type: 'toggle' })}
            disabled={!hasTrack || snapshot.loading}
            className="w-8 h-8 rounded-full bg-white text-black flex items-center justify-center text-sm hover:scale-105 motion-reduce:hover:scale-100 active:scale-95 motion-reduce:active:scale-100 disabled:opacity-40"
            aria-label={snapshot.isPlaying ? 'Pause' : 'Play'}
            title={snapshot.isPlaying ? 'Pause' : 'Play'}
          >
            {snapshot.loading ? '…' : snapshot.isPlaying ? '⏸' : '▶'}
          </button>
          <button
            type="button"
            onClick={(): void => send({ type: 'next' })}
            disabled={!hasTrack || !snapshot.hasNext}
            className="w-7 h-7 rounded hover:bg-zinc-800 text-zinc-300 disabled:opacity-40 flex items-center justify-center text-sm"
            aria-label="Next"
            title="Next"
          >
            ⏭
          </button>
        </div>

        <div className="flex flex-col gap-1 shrink-0 ml-1">
          <button
            type="button"
            onClick={onExpand}
            className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs"
            aria-label="Expand to full player"
            title="Expand to full player"
          >
            ⤢
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-6 h-6 rounded hover:bg-zinc-800 text-zinc-400 flex items-center justify-center text-xs"
            aria-label="Hide mini-player"
            title="Hide mini-player (playback continues)"
          >
            ✕
          </button>
        </div>
      </div>

      <div
        className="h-1.5 bg-zinc-900 cursor-pointer relative group"
        onClick={onSeek}
        title={`${formatTime(snapshot.positionMs)} / ${formatTime(snapshot.durationMs)}`}
      >
        <div
          className="h-full bg-accent transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {contextOpen && (
        <div
          ref={contextRef}
          className="absolute right-2 top-2 bg-zinc-900 border border-zinc-800 rounded shadow-lg py-1 text-xs z-50 min-w-[160px]"
        >
          <button
            type="button"
            onClick={onToggleAlwaysOnTop}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800 flex items-center justify-between"
          >
            <span>Always on top</span>
            <span className="text-accent">{config?.alwaysOnTop ? '✓' : ''}</span>
          </button>
          <button
            type="button"
            onClick={onExpand}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800"
          >
            Expand to full player
          </button>
          <div className="border-t border-zinc-800 my-1" />
          <button
            type="button"
            onClick={onClose}
            className="w-full text-left px-3 py-1.5 hover:bg-zinc-800"
          >
            Hide mini-player
          </button>
        </div>
      )}
    </div>
  );
}
