import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { LyricsPanel } from '@/features/lyrics/LyricsPanel';

vi.mock('@/lib/lyrics', () => ({
  fetchLyrics: () =>
    Promise.resolve({
      source: 'lrclib' as const,
      trackName: 'Never Gonna Give You Up',
      artistName: 'Rick Astley',
      synced: [
        { timeMs: 1000, text: 'A' },
        { timeMs: 3000, text: 'B' },
        { timeMs: 5000, text: 'C' },
      ],
    }),
  findActiveLineIndex: (lines: { timeMs: number }[], t: number) => {
    let best = -1;
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].timeMs <= t) best = i;
    }
    return best;
  },
}));

const mockState = {
  currentTrack: null as null | {
    id: string;
    source: string;
    sourceId: string;
    title: string;
    artists: { id: string; source: string; name: string }[];
    durationMs: number;
    isPlayable: boolean;
  },
  positionMs: 0,
  seek: vi.fn(),
};

vi.mock('@/stores/playerStore', () => ({
  usePlayerStore: Object.assign(
    (selector: (s: typeof mockState) => unknown) => selector(mockState),
    {
      getState: () => mockState,
      setState: (patch: Partial<typeof mockState>) => Object.assign(mockState, patch),
    },
  ),
}));

function makeTrack(id: string) {
  return {
    id,
    source: 'local',
    sourceId: id,
    title: 'Never Gonna Give You Up',
    artists: [{ id: 'a1', source: 'local', name: 'Rick Astley' }],
    durationMs: 213_000,
    isPlayable: true,
  };
}

describe('LyricsPanel', () => {
  beforeEach(() => {
    mockState.currentTrack = null;
    mockState.positionMs = 0;
    mockState.seek.mockClear();
  });

  it('shows empty state when no current track', () => {
    render(<LyricsPanel />);
    expect(screen.getByTestId('lyrics-panel-empty')).toBeInTheDocument();
  });

  it('starts expanded by default and toggles to collapsed', async () => {
    mockState.currentTrack = makeTrack('t1');
    await act(async () => {
      render(<LyricsPanel />);
    });
    const header = screen.getByRole('button', { name: /^Lyrics$/i });
    expect(header).toBeInTheDocument();
    expect(header.getAttribute('aria-expanded')).toBe('true');
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('false');
  });

  it('starts collapsed when collapsedByDefault=true', async () => {
    mockState.currentTrack = makeTrack('t1');
    await act(async () => {
      render(<LyricsPanel collapsedByDefault />);
    });
    const header = screen.getByRole('button', { name: /^Lyrics$/i });
    expect(header.getAttribute('aria-expanded')).toBe('false');
    fireEvent.click(header);
    expect(header.getAttribute('aria-expanded')).toBe('true');
  });

  it('updates the active line as positionMs advances', async () => {
    // jsdom does not implement rAF; install a simple synchronous shim
    // so the panel's sampling loop actually runs in the test.
    const origRaf = globalThis.requestAnimationFrame;
    const origCaf = globalThis.cancelAnimationFrame;
    let queued: (() => void) | null = null;
    globalThis.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      queued = () => cb(performance.now());
      return 1 as unknown as number;
    }) as typeof globalThis.requestAnimationFrame;
    globalThis.cancelAnimationFrame = (() => undefined) as typeof globalThis.cancelAnimationFrame;

    try {
      mockState.currentTrack = makeTrack('t1');
      mockState.positionMs = 0;
      await act(async () => {
        render(<LyricsPanel />);
      });
      // Let the panel's mount effect resolve the lyrics fetch and
      // render the lines.
      await act(async () => {
        await new Promise((r) => setTimeout(r, 0));
      });
      // The first rAF tick will read positionMs from the store. Drive
      // the shim's queued callback after mutating it.
      mockState.positionMs = 2000;
      await act(async () => {
        queued?.();
        await new Promise((r) => setTimeout(r, 0));
      });
      const activeAt2s = screen.queryAllByTestId('lyrics-line-active');
      expect(activeAt2s).toHaveLength(1);
      expect(activeAt2s[0]).toHaveTextContent('A');

      mockState.positionMs = 6000;
      await act(async () => {
        queued?.();
        await new Promise((r) => setTimeout(r, 0));
      });
      const activeAt6s = screen.queryAllByTestId('lyrics-line-active');
      expect(activeAt6s).toHaveLength(1);
      expect(activeAt6s[0]).toHaveTextContent('C');
    } finally {
      globalThis.requestAnimationFrame = origRaf;
      globalThis.cancelAnimationFrame = origCaf;
    }
  });
});
