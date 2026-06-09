import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Circle,
  Eye,
  Wind,
  Activity,
  Shuffle,
} from 'lucide-react';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useUiStore } from '@/stores/uiStore';
import { AudioReactiveBackground } from '@/components/layout/AudioReactiveBackground';
import { CrossfadeIndicator } from '@/components/player/CrossfadeIndicator';
import {
  FrequencyBars,
  WaveformRing,
  ParticleField,
  StereoOscilloscope,
} from '@/components/visualizers/AudioVisualizer';
import { Button } from '@/components/ui/Button';
import { LyricsPanel } from '@/features/lyrics/LyricsPanel';
import { useGestures } from '@/hooks/useGestures';
import type { Track } from '@/types/global';

const VISUALIZER_STORAGE_KEY = 'harmonix.np.visualizer';
type VisualizerMode = 'none' | 'bars' | 'ring' | 'particles' | 'scope';

const VALID_MODES: VisualizerMode[] = ['none', 'bars', 'ring', 'particles', 'scope'];

function loadVisualizerMode(): VisualizerMode {
  if (typeof localStorage === 'undefined') return 'none';
  const v = localStorage.getItem(VISUALIZER_STORAGE_KEY);
  if (VALID_MODES.includes(v as VisualizerMode)) return v as VisualizerMode;
  return 'none';
}

const THEME_STORAGE_KEY = 'harmonix.np.theme';
type ThemeMode = 'match-artwork' | 'brand-pink';

function loadThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'match-artwork';
  const v = localStorage.getItem(THEME_STORAGE_KEY);
  if (v === 'match-artwork' || v === 'brand-pink') return v;
  return 'match-artwork';
}

const SOURCE_BADGE_COLORS: Record<string, string> = {
  local: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  demo: 'bg-zinc-700/40 text-zinc-300 border-zinc-600/50',
  spotify: 'bg-green-500/20 text-green-300 border-green-500/40',
  ytmusic: 'bg-red-500/20 text-red-300 border-red-500/40',
  deezer: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  jamendo: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  audius: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  soundcloud: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
};

function formatTime(ms: number): string {
  if (!ms || ms <= 0) return '0:00';
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, '0')}`;
}

function sourceLabel(source: string): string {
  if (source.startsWith('local:')) return 'local';
  return source;
}

function useMouseParallax(strength: number = 10): {
  onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  onMouseLeave: () => void;
  style: { x: ReturnType<typeof useSpring>; y: ReturnType<typeof useSpring> };
} {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 80, damping: 18 });
  const sy = useSpring(y, { stiffness: 80, damping: 18 });
  return {
    onMouseMove: (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width - 0.5;
      const py = (e.clientY - rect.top) / rect.height - 0.5;
      x.set(px * strength);
      y.set(py * strength);
    },
    onMouseLeave: () => {
      x.set(0);
      y.set(0);
    },
    style: { x: sx, y: sy },
  };
}

function pickSimilarTracks(current: Track, history: Track[], library: Track[]): Track[] {
  if (!current.artists[0]) return [];
  const currentArtistName = current.artists[0].name.toLowerCase();
  const currentId = current.id;
  const seen = new Set<string>([currentId]);
  const out: Track[] = [];
  for (const t of [...history, ...library]) {
    if (out.length >= 5) break;
    if (seen.has(t.id)) continue;
    if (t.artists.some((a) => a.name.toLowerCase() === currentArtistName)) {
      out.push(t);
      seen.add(t.id);
    }
  }
  return out;
}

export function NowPlayingView(): JSX.Element {
  const navigate = useNavigate();
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const loading = usePlayerStore((s) => s.loading);
  const positionMs = usePlayerStore((s) => s.positionMs);
  const durationMs = usePlayerStore((s) => s.durationMs);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const repeat = usePlayerStore((s) => s.repeat);
  const volume = usePlayerStore((s) => s.volume);
  const error = usePlayerStore((s) => s.error);
  const registrations = useSourcesStore((s) => s.registrations);
  const history = useListeningHistoryStore((s) => s.entries);
  const libraryTracks = useLibraryStore((s) => s.tracks);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const resume = usePlayerStore((s) => s.resume);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);

  const parallax = useMouseParallax(12);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [visualizer, setVisualizer] = useState<VisualizerMode>(() => loadVisualizerMode());
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemeMode());
  const enabledVisualizers = useUiStore((s) => s.enabledVisualizers);
  const lastSimilarTrackId = useRef<string | null>(null);
  const [similar, setSimilar] = useState<Track[]>([]);

  useGestures({
    onSwipeLeft: () => {
      void usePlayerStore.getState().next();
    },
    onSwipeRight: () => {
      void usePlayerStore.getState().previous();
    },
    onSwipeUp: () => {
      const v = usePlayerStore.getState().volume ?? 0;
      usePlayerStore.getState().setVolume(Math.min(1, v + 0.05));
    },
    onSwipeDown: () => {
      const v = usePlayerStore.getState().volume ?? 0;
      usePlayerStore.getState().setVolume(Math.max(0, v - 0.05));
    },
    onDoubleTap: () => {
      if (usePlayerStore.getState().isPlaying) usePlayerStore.getState().pause();
      else void usePlayerStore.getState().resume();
    },
  });

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(VISUALIZER_STORAGE_KEY, visualizer);
    }
  }, [visualizer]);

  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    }
  }, [theme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (theme === 'brand-pink') {
      root.style.setProperty('--accent', 'hsl(322, 81%, 60%)');
      root.style.setProperty('--accent-hover', 'hsl(322, 81%, 52%)');
      root.style.setProperty('--accent-vibrant', 'hsl(322, 81%, 65%)');
      root.style.setProperty('--accent-muted', 'hsl(322, 40%, 30%)');
    }
    return (): void => {
      root.style.removeProperty('--accent');
      root.style.removeProperty('--accent-hover');
      root.style.removeProperty('--accent-vibrant');
      root.style.removeProperty('--accent-muted');
    };
  }, [theme]);

  const artworkUrl = currentTrack?.artworkUrl ?? currentTrack?.album?.artworkUrl ?? null;
  const progress = durationMs > 0 ? (positionMs / durationMs) * 100 : 0;
  const hasTrack = currentTrack !== null;
  const sourceName =
    currentTrack != null
      ? (registrations.find((r) => r.id === currentTrack.source)?.name ?? currentTrack.source)
      : null;

  useEffect(() => {
    if (!currentTrack) {
      if (lastSimilarTrackId.current !== null) {
        lastSimilarTrackId.current = null;
        setSimilar([]);
      }
      return;
    }
    if (currentTrack.id === lastSimilarTrackId.current) return;
    lastSimilarTrackId.current = currentTrack.id;
    const historyTracks: Track[] = history.map((h) => ({
      id: h.id,
      sourceId: h.sourceId,
      source: h.source,
      title: h.title,
      artists: [{ id: h.sourceId, source: h.source, name: h.artist }],
      album: h.album
        ? {
            id: h.album,
            source: h.source,
            title: h.album,
            artists: [{ id: h.sourceId, source: h.source, name: h.artist }],
            artworkUrl: h.artworkUrl ?? undefined,
          }
        : undefined,
      durationMs: h.durationMs,
      artworkUrl: h.artworkUrl ?? undefined,
      isPlayable: true,
    }));
    setSimilar(pickSimilarTracks(currentTrack, historyTracks, libraryTracks));
  }, [currentTrack, history, libraryTracks]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      <AudioReactiveBackground />
      <div
        aria-hidden
        className="absolute inset-0 -z-[5] pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(139, 92, 246, 0.18), transparent 60%)',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ type: 'spring', stiffness: 220, damping: 26 }}
        className="relative h-full flex flex-col"
      >
        <div className="flex justify-end p-6">
          <Button
            variant="icon"
            onClick={() => navigate(-1)}
            aria-label="Close now playing"
            title="Close"
          >
            <X size={20} />
          </Button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 pb-32 text-center">
          {artworkUrl ? (
            <div className="relative mb-8">
              <AnimatePresence>
                {visualizer !== 'none' && enabledVisualizers.nowPlaying && (
                  <motion.div
                    key="visualizer-overlay"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.6 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute inset-0 z-0 flex items-center justify-center pointer-events-none"
                    aria-hidden
                    data-testid="now-playing-visualizer-canvas"
                  >
                    {visualizer === 'bars' ? (
                      <FrequencyBars bars={24} height={260} />
                    ) : visualizer === 'ring' ? (
                      <WaveformRing size={300} />
                    ) : visualizer === 'particles' ? (
                      <ParticleField count={48} className="w-72 h-72" />
                    ) : (
                      <StereoOscilloscope height={200} className="w-72" />
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              <motion.img
                layoutId="current-artwork"
                key={artworkUrl}
                src={artworkUrl}
                alt={currentTrack?.title ?? ''}
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                style={parallax.style}
                className="relative z-10 w-72 h-72 rounded-2xl object-cover shadow-glow-lg ring-1 ring-white/10 will-change-transform"
              />
            </div>
          ) : (
            <motion.div
              style={parallax.style}
              className="w-72 h-72 rounded-2xl bg-zinc-800/60 backdrop-blur-md ring-1 ring-white/10 flex items-center justify-center text-zinc-500 mb-8 will-change-transform"
              aria-label="No artwork"
            >
              <Music size={96} />
            </motion.div>
          )}

          <div
            aria-hidden
            className="absolute inset-0 -z-[4] pointer-events-none"
            onMouseMove={parallax.onMouseMove}
            onMouseLeave={parallax.onMouseLeave}
          />

          <h1 className="text-4xl font-bold text-white tracking-tight">
            {currentTrack?.title ?? 'No track playing'}
          </h1>
          <p className="text-lg text-zinc-300 mt-2">
            {currentTrack
              ? currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown artist'
              : 'Select a track to begin'}
          </p>
          {currentTrack?.album && (
            <p className="text-sm text-zinc-400 mt-1">{currentTrack.album.title}</p>
          )}
          {currentTrack && (
            <span
              className={`text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-md border font-medium mt-3 shadow-sm ${
                SOURCE_BADGE_COLORS[sourceLabel(currentTrack.source)] ??
                'bg-zinc-700/40 text-zinc-300 border-zinc-600/50'
              }`}
              title={`Source: ${sourceName}`}
            >
              {sourceLabel(currentTrack.source)}
            </span>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded-md mt-4 animate-scale-in">
              {error}
            </p>
          )}

          {currentTrack && (
            <div className="mt-3 flex items-center justify-center gap-3 text-xs">
              <button
                type="button"
                onClick={() => setCreditsOpen((v) => !v)}
                className="inline-flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors"
                aria-expanded={creditsOpen}
                aria-controls="now-playing-credits"
              >
                <Sparkles size={11} aria-hidden />
                Credits
                {creditsOpen ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              <span className="text-zinc-700">·</span>
              <div
                role="radiogroup"
                aria-label="Background visualizer"
                className="inline-flex items-center gap-0.5 p-0.5 bg-zinc-900/60 border border-zinc-800/60 rounded-full"
                data-testid="now-playing-visualizer-toggle"
              >
                {(
                  [
                    { mode: 'none', icon: Eye, label: 'None' },
                    { mode: 'bars', icon: BarChart3, label: 'Frequency bars' },
                    { mode: 'ring', icon: Circle, label: 'Waveform ring' },
                    { mode: 'particles', icon: Wind, label: 'Particle field' },
                    { mode: 'scope', icon: Activity, label: 'Stereo oscilloscope' },
                  ] as { mode: VisualizerMode; icon: typeof Eye; label: string }[]
                ).map(({ mode, icon: Icon, label }) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={visualizer === mode}
                    onClick={() => setVisualizer(mode)}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider transition-colors ${
                      visualizer === mode
                        ? 'bg-brand-500/20 text-brand-300'
                        : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                    title={label}
                    data-testid={`np-visualizer-${mode}`}
                  >
                    <Icon size={10} aria-hidden />
                  </button>
                ))}
              </div>
              <span className="text-zinc-700">·</span>
              <button
                type="button"
                onClick={() => setTheme(theme === 'match-artwork' ? 'brand-pink' : 'match-artwork')}
                className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-zinc-500 hover:text-zinc-300 transition-colors"
                title={`Theme: ${theme === 'match-artwork' ? 'Match artwork' : 'Brand pink'}`}
                data-testid="now-playing-theme-toggle"
                aria-label={`Theme mode: ${theme === 'match-artwork' ? 'match artwork' : 'brand pink'}. Click to switch.`}
              >
                {theme === 'match-artwork' ? (
                  <span
                    className="w-2 h-2 rounded-full bg-gradient-to-br from-pink-400 to-purple-400"
                    aria-hidden
                  />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-brand-400" aria-hidden />
                )}
                {theme === 'match-artwork' ? 'Art' : 'Pink'}
              </button>
            </div>
          )}

          {creditsOpen && currentTrack && (
            <div
              id="now-playing-credits"
              className="mt-2 w-full max-w-md glass rounded-lg p-3 text-left text-xs space-y-1 animate-scale-in"
            >
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Title</span>
                <span className="text-zinc-200 truncate">{currentTrack.title}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Artist</span>
                <span className="text-zinc-200 truncate">
                  {currentTrack.artists.map((a) => a.name).join(', ') || 'Unknown'}
                </span>
              </p>
              {currentTrack.album && (
                <p className="flex items-center justify-between gap-3">
                  <span className="text-zinc-500">Album</span>
                  <span className="text-zinc-200 truncate">{currentTrack.album.title}</span>
                </p>
              )}
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Duration</span>
                <span className="text-zinc-200 tabular-nums">{formatTime(durationMs)}</span>
              </p>
              <p className="flex items-center justify-between gap-3">
                <span className="text-zinc-500">Source</span>
                <span className="text-zinc-200">{sourceName}</span>
              </p>
            </div>
          )}

          <div className="w-full max-w-2xl mt-8">
            <div className="flex items-center gap-3 text-xs text-zinc-300 tabular-nums">
              <span className="w-12 text-right">{formatTime(positionMs)}</span>
              <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden relative">
                <div
                  className="h-full bg-gradient-to-r from-brand-500 to-accent-400 rounded-full transition-[width] duration-100"
                  style={{ width: `${progress}%` }}
                />
                <CrossfadeIndicator durationMs={durationMs} />
              </div>
              <span className="w-12">{formatTime(durationMs)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={durationMs || 0}
              value={positionMs}
              onChange={(e) => void seek(Number(e.target.value))}
              disabled={!hasTrack}
              className="w-full h-2 opacity-0 cursor-pointer -mt-3.5"
              aria-label="Seek"
            />
          </div>

          <div className="flex items-center gap-4 mt-8">
            <button
              type="button"
              onClick={toggleShuffle}
              className={`p-3 rounded-lg transition-all duration-100 active:scale-95 ${
                shuffle
                  ? 'text-brand-300 bg-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              aria-label="Toggle shuffle"
              aria-pressed={shuffle}
            >
              <Shuffle size={20} className={shuffle ? 'fill-current' : ''} />
            </button>
            <button
              type="button"
              onClick={() => void previous()}
              disabled={!hasTrack}
              className="p-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all active:scale-95"
              aria-label="Previous track"
            >
              <PreviousIcon />
            </button>
            <button
              type="button"
              onClick={() => (isPlaying ? pause() : void resume())}
              disabled={!hasTrack || loading}
              className="w-16 h-16 rounded-full bg-zinc-100 text-zinc-900 flex items-center justify-center transition-all duration-150 hover:scale-105 active:scale-95 disabled:opacity-40 shadow-glow"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {loading ? (
                <span className="animate-pulse-soft">
                  <Music size={28} className="opacity-50" />
                </span>
              ) : isPlaying ? (
                <PauseIcon size={28} />
              ) : (
                <PlayIcon size={28} />
              )}
            </button>
            <button
              type="button"
              onClick={() => void next()}
              disabled={!hasTrack}
              className="p-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all active:scale-95"
              aria-label="Next track"
            >
              <NextIcon />
            </button>
            <button
              type="button"
              onClick={cycleRepeat}
              className={`p-3 rounded-lg transition-all duration-100 active:scale-95 ${
                repeat !== 'off'
                  ? 'text-brand-300 bg-brand-500/20'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-white/10'
              }`}
              aria-label={`Repeat: ${repeat}`}
            >
              <RepeatIcon active={repeat !== 'off'} />
            </button>
          </div>

          {similar.length > 0 && (
            <section className="w-full max-w-3xl mt-6 px-2" aria-label="More by this artist">
              <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5 justify-center">
                <Sparkles size={11} aria-hidden />
                More by {currentTrack?.artists[0]?.name ?? 'this artist'}
              </p>
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 scroll-shadow">
                {similar.map((t) => {
                  const tArt = t.artworkUrl ?? t.album?.artworkUrl;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        const queue = usePlayerStore.getState().queue;
                        const idx = queue.findIndex((q) => q.id === t.id);
                        if (idx >= 0) {
                          usePlayerStore
                            .getState()
                            .setQueue(queue, idx, { shuffle: false, smartShuffle: false });
                        }
                      }}
                      className="shrink-0 w-32 text-left rounded-lg p-1.5 hover:bg-zinc-800/60 transition-colors group"
                    >
                      {tArt ? (
                        <img
                          src={tArt}
                          alt=""
                          className="w-full aspect-square rounded object-cover mb-1.5"
                        />
                      ) : (
                        <div className="w-full aspect-square rounded bg-zinc-800 flex items-center justify-center mb-1.5">
                          <Music size={20} className="text-zinc-600" />
                        </div>
                      )}
                      <p className="text-xs text-zinc-200 truncate">{t.title}</p>
                      <p className="text-[10px] text-zinc-500 truncate">
                        {t.artists.map((a) => a.name).join(', ')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          <LyricsPanel className="px-2" />

          <div className="flex items-center gap-3 mt-6 w-full max-w-xs">
            <button
              type="button"
              onClick={() => setVolume(volume === 0 ? 0.5 : 0)}
              className="text-zinc-400 hover:text-zinc-100 transition-colors"
              aria-label="Toggle mute"
            >
              <VolumeIcon volume={volume} />
            </button>
            <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-zinc-300 rounded-full"
                style={{ width: `${volume * 100}%` }}
              />
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={volume * 100}
              onChange={(e) => setVolume(Number(e.target.value) / 100)}
              className="absolute opacity-0 w-48 h-6 cursor-pointer"
              aria-label="Volume"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function PreviousIcon(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 6h2v12H6zM9.5 12l8.5 6V6z" />
    </svg>
  );
}

function PlayIcon({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon({ size = 20 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}

function NextIcon(): JSX.Element {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
      <path d="M16 6h2v12h-2zM6 6v12l8.5-6z" />
    </svg>
  );
}

function RepeatIcon({ active }: { active: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m17 2 4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="m7 22-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
      {active && <circle cx="12" cy="12" r="1" fill="currentColor" />}
    </svg>
  );
}

function VolumeIcon({ volume }: { volume: number }): JSX.Element {
  if (volume === 0) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <line x1="22" y1="9" x2="16" y2="15" />
        <line x1="16" y1="9" x2="22" y2="15" />
      </svg>
    );
  }
  if (volume < 0.5) {
    return (
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    );
  }
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}
