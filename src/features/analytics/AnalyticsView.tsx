import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { BarChart3, Clock3, Disc3, TrendingUp, Users } from 'lucide-react';

const TIME_RANGES = [
  { label: '7 days', ms: 7 * 24 * 60 * 60 * 1000 },
  { label: '30 days', ms: 30 * 24 * 60 * 60 * 1000 },
  { label: '90 days', ms: 90 * 24 * 60 * 60 * 1000 },
  { label: 'All time', ms: Infinity },
] as const;

const SOURCE_COLORS: Record<string, string> = {
  local: '#22c55e',
  spotify: '#1db954',
  ytmusic: '#ef4444',
  deezer: '#a855f7',
  jamendo: '#f59e0b',
  audius: '#06b6d4',
  soundcloud: '#f97316',
  demo: '#6b7280',
};

const COLORS = [
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#f59e0b',
  '#22c55e',
  '#ef4444',
  '#3b82f6',
  '#f97316',
];

function formatDuration(ms: number): string {
  const hours = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function SourceLabel({ source }: { source: string }): JSX.Element {
  const color = SOURCE_COLORS[source] ?? '#6b7280';
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
      {source.charAt(0).toUpperCase() + source.slice(1)}
    </span>
  );
}

function TopTracksCard({
  track,
  rank,
}: {
  track: { title: string; artist: string; artworkUrl: string | null; playCount: number };
  rank: number;
}): JSX.Element {
  return (
    <div
      className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800/50 transition"
      data-testid="analytics-top-track"
    >
      <span className="text-zinc-500 text-sm w-5 text-right font-mono">{rank}</span>
      {track.artworkUrl ? (
        <img src={track.artworkUrl} alt="" className="w-10 h-10 rounded object-cover" />
      ) : (
        <div className="w-10 h-10 rounded bg-zinc-800 flex items-center justify-center">
          <Disc3 size={16} className="text-zinc-500" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white truncate">{track.title}</p>
        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
      </div>
      <span className="text-xs text-zinc-500">{track.playCount}x</span>
    </div>
  );
}

export function AnalyticsView(): JSX.Element {
  const [rangeIdx, setRangeIdx] = useState(1);
  const range = TIME_RANGES[rangeIdx];
  const since = range.ms === Infinity ? 0 : Date.now() - range.ms;

  const topArtists = useListeningHistoryStore((s) => s.topArtists(since));
  const topTracks = useListeningHistoryStore((s) => s.topTracks(since));
  const sourceBreakdown = useListeningHistoryStore((s) => s.sourceBreakdown(since));
  const timeOfDay = useListeningHistoryStore((s) => s.timeOfDay(since));
  const listeningTime = useListeningHistoryStore((s) => s.listeningTime(since));
  const totalSince = useListeningHistoryStore((s) => s.totalSince(since));
  const entries = useListeningHistoryStore((s) => s.entries);

  const heatmapData = useMemo(
    () =>
      timeOfDay.map((h) => ({
        hour: `${h.hour.toString().padStart(2, '0')}:00`,
        plays: h.playCount,
      })),
    [timeOfDay],
  );

  const pieData = useMemo(
    () =>
      sourceBreakdown.map((s) => ({
        name: s.source,
        value: s.playCount,
        duration: s.totalDurationMs,
      })),
    [sourceBreakdown],
  );

  const barData = useMemo(
    () => listeningTime.slice(-14).map((d) => ({ date: d.date.slice(5), ms: d.durationMs })),
    [listeningTime],
  );

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-20">
        <BarChart3 size={48} className="text-zinc-600" />
        <h2 className="text-xl font-semibold text-zinc-300">No listening data yet</h2>
        <p className="text-sm text-zinc-500 max-w-md">
          Play some tracks and your listening analytics will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6" data-testid="analytics-view">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Listening Analytics</h1>
        <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
          {TIME_RANGES.map((r, i) => (
            <button
              key={r.label}
              onClick={() => setRangeIdx(i)}
              className={`px-3 py-1 text-sm rounded-md transition ${
                i === rangeIdx ? 'bg-pink-600 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-pink-600/20 rounded-lg">
            <TrendingUp size={20} className="text-pink-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{totalSince.playCount}</p>
            <p className="text-xs text-zinc-400">Total Plays</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-violet-600/20 rounded-lg">
            <Clock3 size={20} className="text-violet-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">
              {formatDuration(totalSince.totalDurationMs)}
            </p>
            <p className="text-xs text-zinc-400">Listening Time</p>
          </div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center gap-3">
          <div className="p-2 bg-cyan-600/20 rounded-lg">
            <Users size={20} className="text-cyan-400" />
          </div>
          <div>
            <p className="text-2xl font-bold text-white">{topArtists.length}</p>
            <p className="text-xs text-zinc-400">Unique Artists</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          data-testid="analytics-top-tracks"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Top Tracks</h2>
          <div className="space-y-1">
            {topTracks.slice(0, 10).map((t, i) => (
              <TopTracksCard key={t.id} track={t} rank={i + 1} />
            ))}
            {topTracks.length === 0 && (
              <p className="text-sm text-zinc-500">No data for this period.</p>
            )}
          </div>
        </div>

        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          data-testid="analytics-top-artists"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Top Artists</h2>
          <div className="space-y-2">
            {topArtists.slice(0, 10).map((a, i) => (
              <div key={a.artist} className="flex items-center gap-2">
                <span className="text-zinc-500 text-sm w-5 text-right font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{a.artist}</p>
                  <div className="flex gap-2 text-xs text-zinc-400">
                    <span>{a.playCount} plays</span>
                    <span>{formatDuration(a.totalDurationMs)}</span>
                  </div>
                </div>
              </div>
            ))}
            {topArtists.length === 0 && (
              <p className="text-sm text-zinc-500">No data for this period.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          data-testid="analytics-source-breakdown"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Source Breakdown</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name }: { name?: string }) => <SourceLabel source={name ?? ''} />}
                >
                  {pieData.map((entry, i) => (
                    <Cell
                      key={entry.name}
                      fill={SOURCE_COLORS[entry.name] ?? COLORS[i % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip formatter={((value: number) => [`${value} plays`, 'Plays']) as never} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500">No data for this period.</p>
          )}
        </div>

        <div
          className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
          data-testid="analytics-listening-time"
        >
          <h2 className="text-lg font-semibold text-white mb-3">Listening Time</h2>
          {barData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={barData}>
                <XAxis dataKey="date" tick={{ fill: '#71717a', fontSize: 11 }} />
                <YAxis
                  tick={{ fill: '#71717a', fontSize: 11 }}
                  tickFormatter={(v: number) => formatDuration(v)}
                />
                <Tooltip
                  formatter={((value: number) => [formatDuration(value), 'Time']) as never}
                />
                <Bar dataKey="ms" fill="#ec4899" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-zinc-500">No data for this period.</p>
          )}
        </div>
      </div>

      <div
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4"
        data-testid="analytics-time-of-day"
      >
        <h2 className="text-lg font-semibold text-white mb-3">Listening by Hour</h2>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={heatmapData}>
            <XAxis dataKey="hour" tick={{ fill: '#71717a', fontSize: 9 }} interval={2} />
            <YAxis tick={{ fill: '#71717a', fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="plays" fill="#8b5cf6" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
