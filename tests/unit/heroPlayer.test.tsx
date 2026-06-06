import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroPlayer } from '@/features/home/HeroPlayer';
import { usePlayerStore } from '@/stores/playerStore';
import { useSourcesStore } from '@/stores/sourcesStore';
import { installMockWindowApi } from '../setup';
import type { Track } from '@/types/global';

function makeTrack(overrides: Partial<Track> = {}): Track {
  return {
    id: 'hero-1',
    source: 'spotify',
    sourceId: 'x',
    title: 'Lost in the Echo',
    artists: [{ id: 'a1', name: 'Echoverse', source: 'spotify' }],
    album: { id: 'al1', title: 'Album', artists: [], source: 'spotify' },
    durationMs: 238000,
    artworkUrl: 'https://example.com/art.jpg',
    isPlayable: true,
    ...overrides,
  };
}

function renderWithRouter(): void {
  render(
    <MemoryRouter>
      <HeroPlayer playlistName="Chill Vibes" />
    </MemoryRouter>,
  );
}

describe('HeroPlayer', () => {
  beforeEach(() => {
    installMockWindowApi();
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      durationMs: 0,
      positionMs: 0,
    });
    useSourcesStore.setState({ registrations: [] });
  });

  it('renders empty state when no track is playing', () => {
    renderWithRouter();
    expect(screen.getByText('Nothing playing')).toBeInTheDocument();
  });

  it('renders track title and artist', () => {
    usePlayerStore.setState({ currentTrack: makeTrack() });
    renderWithRouter();
    expect(screen.getByText('Lost in the Echo')).toBeInTheDocument();
    expect(screen.getByText('Echoverse')).toBeInTheDocument();
  });

  it('renders Hi-Fi badge by default', () => {
    usePlayerStore.setState({ currentTrack: makeTrack() });
    renderWithRouter();
    expect(screen.getByText('Hi-Fi')).toBeInTheDocument();
  });

  it('renders "Playing from" pill with playlist name', () => {
    usePlayerStore.setState({ currentTrack: makeTrack() });
    renderWithRouter();
    expect(screen.getByText(/Playing from/i)).toBeInTheDocument();
    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
  });

  it('hides Hi-Fi badge when showHiFiBadge is false', () => {
    usePlayerStore.setState({ currentTrack: makeTrack() });
    render(
      <MemoryRouter>
        <HeroPlayer playlistName={null} showHiFiBadge={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByText('Hi-Fi')).not.toBeInTheDocument();
  });

  it('renders transport controls (play/pause, prev, next)', () => {
    usePlayerStore.setState({ currentTrack: makeTrack() });
    renderWithRouter();
    expect(screen.getByLabelText('Play')).toBeInTheDocument();
    expect(screen.getByLabelText('Next track')).toBeInTheDocument();
    expect(screen.getByLabelText('Previous track')).toBeInTheDocument();
  });

  it('renders source label when source registration matches', () => {
    useSourcesStore.setState({
      registrations: [
        {
          id: 'spotify',
          name: 'Spotify',
          enabled: true,
          authenticated: false,
          capabilities: {
            canSearch: true,
            canStream: true,
            canGetPlaylists: false,
            canGetLikedTracks: false,
            requiresAuth: false,
            supportsFileStreaming: false,
            supportsRemoteStreaming: true,
            supportsPlaylists: false,
          },
        },
      ],
    });
    usePlayerStore.setState({ currentTrack: makeTrack() });
    renderWithRouter();
    expect(screen.getByText('Spotify')).toBeInTheDocument();
  });
});
