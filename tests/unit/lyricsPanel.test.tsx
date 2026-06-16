import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, fireEvent, screen, act } from '@testing-library/react';
import { LyricsPanel } from '@/features/lyrics/LyricsPanel';

vi.mock('@/lib/lyrics', () => ({
  fetchLyrics: () =>
    Promise.resolve({
      source: 'none',
      trackName: 'Never Gonna Give You Up',
      artistName: 'Rick Astley',
    }),
  findActiveLineIndex: () => -1,
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
});
