import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SourceView } from '@/features/source/SourceView';
import { useSourcesStore } from '@/stores/sourcesStore';
import { installMockWindowApi } from '../setup';

interface Registration {
  id: string;
  name: string;
  capabilities: {
    canSearch: boolean;
    canStream: boolean;
    canGetPlaylists: boolean;
    canGetLikedTracks: boolean;
    requiresAuth: boolean;
    supportsFileStreaming: boolean;
    supportsRemoteStreaming: boolean;
    supportsPlaylists: boolean;
  };
  enabled: boolean;
  authenticated: boolean;
}

function reg(overrides: Partial<Registration> & { id: string; name: string }): Registration {
  return {
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
    enabled: true,
    authenticated: false,
    ...overrides,
  };
}

function renderWithId(id: string): void {
  act(() => {
    render(
      <MemoryRouter initialEntries={[`/source/${id}`]}>
        <Routes>
          <Route path="/source/:id" element={<SourceView />} />
          <Route path="/" element={<div>Home</div>} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

describe('SourceView', () => {
  beforeEach(() => {
    useSourcesStore.setState({ registrations: [], loading: false });
  });

  it('shows not found for unknown source id', () => {
    installMockWindowApi();
    useSourcesStore.setState({ registrations: [reg({ id: 'spotify', name: 'Spotify' })] });
    renderWithId('nonexistent');
    expect(screen.getByText(/Source not found/i)).toBeInTheDocument();
  });

  it('renders source name and id badge', async () => {
    installMockWindowApi();
    useSourcesStore.setState({ registrations: [reg({ id: 'spotify', name: 'Spotify' })] });
    renderWithId('spotify');
    expect(screen.getByRole('heading', { name: 'Spotify' })).toBeInTheDocument();
    expect(screen.getByText('spotify')).toBeInTheDocument();
  });

  it('shows auth indicator for authenticated sources', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [reg({ id: 'spotify', name: 'Spotify', authenticated: true })],
    });
    renderWithId('spotify');
    expect(screen.getByText(/signed in/)).toBeInTheDocument();
  });

  it('shows warning when source is disabled', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [reg({ id: 'spotify', name: 'Spotify', enabled: false })],
    });
    renderWithId('spotify');
    expect(screen.getByText(/This source is disabled/)).toBeInTheDocument();
  });

  it('loads and displays user playlists when capability present', async () => {
    const playlists = [
      {
        id: 'p1',
        source: 'spotify',
        name: 'My Mix',
        trackCount: 12,
      },
    ];
    installMockWindowApi({
      sources: { userPlaylists: vi.fn().mockResolvedValue(playlists) },
    });
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'spotify',
          name: 'Spotify',
          capabilities: {
            canSearch: true,
            canStream: true,
            canGetPlaylists: true,
            canGetLikedTracks: true,
            requiresAuth: true,
            supportsFileStreaming: false,
            supportsRemoteStreaming: true,
            supportsPlaylists: true,
          },
        }),
      ],
    });
    renderWithId('spotify');
    await waitFor(() => expect(screen.getByText('Your Playlists')).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(() => expect(screen.getByText('My Mix')).toBeInTheDocument(), { timeout: 5000 });
  });

  it('loads and displays liked tracks when capability present', async () => {
    const tracks = [
      {
        id: 't1',
        source: 'spotify',
        sourceId: 't1',
        title: 'Favorite Song',
        artists: [{ id: 'a1', name: 'Artist A', source: 'spotify' }],
        durationMs: 180000,
        isPlayable: true,
      },
    ];
    installMockWindowApi({
      sources: { likedTracks: vi.fn().mockResolvedValue(tracks) },
    });
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'spotify',
          name: 'Spotify',
          capabilities: {
            canSearch: true,
            canStream: true,
            canGetPlaylists: true,
            canGetLikedTracks: true,
            requiresAuth: true,
            supportsFileStreaming: false,
            supportsRemoteStreaming: true,
            supportsPlaylists: true,
          },
        }),
      ],
    });
    renderWithId('spotify');
    await waitFor(() => expect(screen.getByText('Liked Tracks')).toBeInTheDocument(), {
      timeout: 5000,
    });
    await waitFor(() => expect(screen.getByText('Favorite Song')).toBeInTheDocument(), {
      timeout: 5000,
    });
  });

  it('shows capabilities section with all enabled flags', () => {
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [
        reg({
          id: 'audius',
          name: 'Audius',
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
        }),
      ],
    });
    renderWithId('audius');
    expect(screen.getByText('What this source supports')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Stream')).toBeInTheDocument();
  });

  it('opens external link when playback action points to a URL', async () => {
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    installMockWindowApi();
    useSourcesStore.setState({
      registrations: [reg({ id: 'deezer', name: 'Deezer' })],
    });
    await act(async () => {
      render(
        <MemoryRouter initialEntries={['/source/deezer']}>
          <Routes>
            <Route path="/source/:id" element={<SourceView />} />
          </Routes>
        </MemoryRouter>,
      );
    });
    const btn = await screen.findByRole('button', { name: /Open deezer\.com/i });
    await act(async () => {
      btn.click();
    });
    expect(openSpy).toHaveBeenCalledWith('https://www.deezer.com', '_blank', 'noopener');
    openSpy.mockRestore();
  });
});
