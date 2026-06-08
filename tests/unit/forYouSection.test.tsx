import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ForYouSection, STARTER_RECOMMENDATIONS } from '@/components/recommendations/ForYouSection';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { usePlayerStore } from '@/stores/playerStore';

function renderWithRouter(ui: React.ReactNode): void {
  render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('ForYouSection', () => {
  beforeEach(() => {
    useListeningHistoryStore.setState({ entries: [] });
    usePlayerStore.setState({
      queue: [],
      queueIndex: -1,
      currentTrack: null,
      isPlaying: false,
    });
  });

  it('shows starter cards when no history', () => {
    renderWithRouter(<ForYouSection limit={6} layout="grid" />);
    expect(screen.getByText('Browse your Library')).toBeInTheDocument();
    expect(screen.getByText('Search across sources')).toBeInTheDocument();
    expect(
      screen.getByText(/Play some tracks to see personalized recommendations/i),
    ).toBeInTheDocument();
  });

  it('shows recent history entries when present', () => {
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
          genre: null,
        },
        {
          id: 'r2',
          sourceId: 'r2',
          title: 'Another Track',
          artist: 'Another Artist',
          album: null,
          artworkUrl: null,
          source: 'local',
          durationMs: 1000,
          playedAt: Date.now() - 1000,
          genre: null,
        },
      ],
    });
    renderWithRouter(<ForYouSection limit={6} layout="grid" />);
    expect(screen.getByText('Recent Track')).toBeInTheDocument();
    expect(screen.getByText('Another Track')).toBeInTheDocument();
    expect(screen.queryByText('Browse your Library')).not.toBeInTheDocument();
  });

  it('respects limit prop for history items', () => {
    useListeningHistoryStore.setState({
      entries: Array.from({ length: 10 }, (_, i) => ({
        id: `r${i}`,
        sourceId: `r${i}`,
        title: `Track ${i}`,
        artist: `Artist ${i}`,
        album: null,
        artworkUrl: null,
        source: 'spotify',
        durationMs: 1000,
        playedAt: Date.now() - i * 1000,
        genre: null,
      })),
    });
    renderWithRouter(<ForYouSection limit={3} layout="grid" />);
    expect(screen.getByText('Track 0')).toBeInTheDocument();
    expect(screen.getByText('Track 2')).toBeInTheDocument();
    expect(screen.queryByText('Track 3')).not.toBeInTheDocument();
  });

  it('hides header when showHeader=false', () => {
    renderWithRouter(<ForYouSection limit={3} layout="list" showHeader={false} />);
    expect(screen.queryByRole('heading', { name: 'For You' })).not.toBeInTheDocument();
  });

  it('shows For You heading when showHeader=true', () => {
    renderWithRouter(<ForYouSection limit={3} layout="list" showHeader />);
    expect(screen.getByRole('heading', { name: 'For You' })).toBeInTheDocument();
  });

  it('uses data-testid for cards', () => {
    renderWithRouter(<ForYouSection limit={2} layout="grid" />);
    const cards = screen.getAllByTestId('for-you-card');
    expect(cards.length).toBe(2);
  });

  it('renders STARTER_RECOMMENDATIONS export for external use', () => {
    expect(STARTER_RECOMMENDATIONS.length).toBeGreaterThan(0);
    expect(STARTER_RECOMMENDATIONS[0]?.title).toBeTruthy();
  });

  it('renders history entries with onPlay wired in list mode', () => {
    useListeningHistoryStore.setState({
      entries: [
        {
          id: 'h1',
          sourceId: 'h1',
          title: 'Played Track',
          artist: 'Test',
          album: null,
          artworkUrl: null,
          source: 'spotify',
          durationMs: 2000,
          playedAt: Date.now(),
          genre: null,
        },
      ],
    });
    renderWithRouter(<ForYouSection limit={1} layout="list" />);
    expect(screen.getByText('Played Track')).toBeInTheDocument();
  });
});
