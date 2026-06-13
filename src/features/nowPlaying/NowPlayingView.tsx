import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Music,
  Sparkles,
  BarChart3,
  Circle,
  Eye,
  Wind,
  Activity,
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  VolumeX,
  Volume1,
  Volume2,
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

type NpTab = 'lyrics' | 'similar' | 'credits' | 'visualizer';

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
  const toggleMute = usePlayerStore((s) => s.toggleMute);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const cycleRepeat = usePlayerStore((s) => s.cycleRepeat);
  const resume = usePlayerStore((s) => s.resume);
  const pause = usePlayerStore((s) => s.pause);
  const next = usePlayerStore((s) => s.next);
  const previous = usePlayerStore((s) => s.previous);
  const seek = usePlayerStore((s) => s.seek);
  const [visualizer, setVisualizer] = useState<VisualizerMode>(() => loadVisualizerMode());
  const [theme, setTheme] = useState<ThemeMode>(() => loadThemeMode());
  const [activeTab, setActiveTab] = useState<NpTab>('lyrics');
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
            'radial-gradient(ellipse 80% 60% at 50% 30%, rgba(236, 72, 153, 0.18), transparent 60%)',
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

        <div className="flex-1 flex flex-col xl:flex-row gap-6 px-6 pb-24 overflow-y-auto min-h-0">
          <div className="flex-1 flex flex-col items-center justify-center min-w-0 text-center">
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
                  className="relative z-10 w-72 h-72 rounded-2xl object-cover shadow-glow-lg ring-1 ring-white/10"
                />
              </div>
            ) : (
              <div
                className="w-72 h-72 rounded-2xl bg-zinc-800/60 backdrop-blur-md ring-1 ring-white/10 flex items-center justify-center text-zinc-500 mb-8"
                aria-label="No artwork"
              >
                <Music size={96} />
              </div>
            )}

            <h1 className="text-4xl font-semibold text-white tracking-tight">
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
              <div className="mt-2 flex items-center justify-center gap-3 text-[10px] text-zinc-500">
                <button
                  type="button"
                  onClick={() =>
                    setTheme(theme === 'match-artwork' ? 'brand-pink' : 'match-artwork')
                  }
                  className="inline-flex items-center gap-1.5 uppercase tracking-wider hover:text-zinc-300 transition-colors"
                  title={`Theme: ${theme === 'match-artwork' ? 'Match artwork' : 'Brand pink'}`}
                  data-testid="now-playing-theme-toggle"
                  aria-label={`Theme mode: ${theme === 'match-artwork' ? 'match artwork' : 'brand pink'}. Click to switch.`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      theme === 'match-artwork'
                        ? 'bg-gradient-to-br from-pink-400 to-fuchsia-500'
                        : 'bg-brand-400'
                    }`}
                    aria-hidden
                  />
                  {theme === 'match-artwork' ? 'Match artwork' : 'Brand pink'}
                </button>
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
                <SkipBack size={20} fill="currentColor" />
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
                  <Pause size={28} fill="currentColor" />
                ) : (
                  <Play size={28} fill="currentColor" />
                )}
              </button>
              <button
                type="button"
                onClick={() => void next()}
                disabled={!hasTrack}
                className="p-3 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 disabled:opacity-40 transition-all active:scale-95"
                aria-label="Next track"
              >
                <SkipForward size={20} fill="currentColor" />
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
                <Repeat size={20} />
              </button>
            </div>

            <div className="relative flex items-center gap-3 mt-6 w-full max-w-xs">
              <button
                type="button"
                onClick={toggleMute}
                className="text-zinc-400 hover:text-zinc-100 transition-colors"
                aria-label="Toggle mute"
              >
                {volume === 0 ? (
                  <VolumeX size={18} />
                ) : volume < 0.5 ? (
                  <Volume1 size={18} />
                ) : (
                  <Volume2 size={18} />
                )}
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

          <aside className="w-full xl:w-[420px] xl:max-w-[440px] flex flex-col min-h-0">
            <div
              role="tablist"
              aria-label="Now playing tabs"
              className="flex items-center gap-1 p-1 rounded-xl bg-zinc-900/60 border border-zinc-800/60 mb-3"
            >
              {(
                [
                  { key: 'lyrics', label: 'Lyrics' },
                  { key: 'similar', label: 'Similar' },
                  { key: 'credits', label: 'Credits' },
                  { key: 'visualizer', label: 'Visualizer' },
                ] as { key: NpTab; label: string }[]
              ).map((t) => (
                <button
                  key={t.key}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t.key}
                  onClick={() => setActiveTab(t.key)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    activeTab === t.key
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto rounded-xl">
              {activeTab === 'lyrics' && <LyricsPanel />}
              {activeTab === 'similar' && similar.length > 0 && (
                <section aria-label="More by this artist" className="px-1">
                  <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                    <Sparkles size={11} aria-hidden />
                    More by {currentTrack?.artists[0]?.name ?? 'this artist'}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
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
                          className="text-left rounded-lg p-1.5 hover:bg-zinc-800/60 transition-colors"
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
              {activeTab === 'credits' && currentTrack && (
                <div className="glass rounded-lg p-3 text-left text-xs space-y-1">
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
              {activeTab === 'visualizer' && (
                <div className="space-y-3">
                  <p className="text-xs text-zinc-500">Pick a background visualizer.</p>
                  <div
                    role="radiogroup"
                    aria-label="Background visualizer"
                    className="grid grid-cols-1 gap-1.5"
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
                        aria-label={label}
                        onClick={() => setVisualizer(mode)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                          visualizer === mode
                            ? 'bg-brand-500/15 text-brand-300'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60'
                        }`}
                        title={label}
                        data-testid={`np-visualizer-${mode}`}
                      >
                        <Icon size={14} aria-hidden />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      </motion.div>
    </div>
  );
}
