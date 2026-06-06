import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { RightRail } from '@/components/layout/RightRail';
import { usePlayerStore } from '@/stores/playerStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import type { Track } from '@/types/global';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: `t${Math.random()}`,
    source: 'spotify',
    sourceId: 'x',
    title: 'Sample',
    artists: [{ id: 'a1', name: 'Artist', source: 'spotify' }],
    durationMs: 200000,
    isPlayable: true,
    ...overrides,
  };
}

function renderWithRouter(): void {
  render(
    <MemoryRouter>
      <RightRail />
    </MemoryRouter>,
  );
}

describe('RightRail', () => {
  beforeEach(() => {
    usePlayerStore.setState({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      isPlaying: false,
    });
    useListeningHistoryStore.setState({ entries: [] });
  });

  it('renders UP NEXT section', () => {
    renderWithRouter();
    expect(screen.getByText('Up Next')).toBeInTheDocument();
  });

  it('shows empty state for queue when none', () => {
    renderWithRouter();
    expect(screen.getByText(/No upcoming tracks/i)).toBeInTheDocument();
  });

  it('shows starter recommendations when no history', () => {
    renderWithRouter();
    expect(screen.getByText('Browse your Library')).toBeInTheDocument();
    expect(screen.getByText('Search across sources')).toBeInTheDocument();
  });

  it('shows recent history in FOR YOU', () => {
    useListeningHistoryStore.setState({
      entries: [
        {
          id: 'r1',
          sourceId: 'r1',
          title: 'Recent Track',
          artist: 'Recent Artist',
          album: null,
          artworkUrl: null,
          source: 'spotify',
          durationMs: 1000,
          playedAt: Date.now(),
        },
      ],
    });
    renderWithRouter();
    expect(screen.getByText('Recent Track')).toBeInTheDocument();
    expect(screen.getByText('Recent Artist')).toBeInTheDocument();
    expect(screen.queryByText('Browse your Library')).not.toBeInTheDocument();
  });

  it('renders up next tracks from queue', () => {
    const current = makeTrack({ id: 'a', title: 'Currently Playing' });
    const next1 = makeTrack({ id: 'b', title: 'First Up' });
    const next2 = makeTrack({ id: 'c', title: 'Second Up' });
    usePlayerStore.setState({
      queue: [current, next1, next2],
      queueIndex: 0,
      currentTrack: current,
      isPlaying: true,
    });
    renderWithRouter();
    expect(screen.getByText('First Up')).toBeInTheDocument();
    expect(screen.getByText('Second Up')).toBeInTheDocument();
  });

  it('renders Clear button when up next is non-empty', () => {
    const tracks = [makeTrack({ id: 'a' }), makeTrack({ id: 'b' })];
    usePlayerStore.setState({
      queue: tracks,
      queueIndex: 0,
      currentTrack: tracks[0]!,
      isPlaying: true,
    });
    renderWithRouter();
    expect(screen.getByLabelText('Clear up next')).toBeInTheDocument();
  });
});
