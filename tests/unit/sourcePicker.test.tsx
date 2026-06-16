import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { SourcePicker } from '@/features/settings/SourcePicker';
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

function setupWithRegistrations(initial: Registration[]): void {
  installMockWindowApi({
    sources: {
      list: vi.fn().mockResolvedValue(initial),
      loadConfigs: vi.fn().mockResolvedValue({}),
    },
  });
  useSourcesStore.setState({ loading: false, registrations: initial });
}

describe('SourcePicker', () => {
  beforeEach(() => {
    useSourcesStore.setState({
      registrations: [],
      loading: false,
    });
  });

  it('shows loading state when fetching', async () => {
    installMockWindowApi();
    useSourcesStore.setState({ loading: true, registrations: [], refresh: async () => {} });
    const { container } = render(<SourcePicker />);
    await act(async () => {});
    const skeletons = container.querySelectorAll('[aria-hidden="true"].animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows empty state when no sources registered', async () => {
    setupWithRegistrations([]);
    render(<SourcePicker />);
    await act(async () => {});
    expect(await screen.findByText(/no sources registered/i)).toBeInTheDocument();
  });

  it('renders a row per registered source', async () => {
    setupWithRegistrations([
      reg({ id: 'spotify', name: 'Spotify' }),
      reg({ id: 'local', name: 'Local Library' }),
    ]);
    render(<SourcePicker />);
    await act(async () => {});
    expect(await screen.findByText('Spotify')).toBeInTheDocument();
    expect(await screen.findByText('Local Library')).toBeInTheDocument();
  });

  it('shows capability pills for supported capabilities', async () => {
    setupWithRegistrations([
      reg({
        id: 'soundcloud',
        name: 'SoundCloud',
        capabilities: {
          canSearch: true,
          canStream: true,
          canGetPlaylists: true,
          canGetLikedTracks: true,
          requiresAuth: false,
          supportsFileStreaming: false,
          supportsRemoteStreaming: true,
          supportsPlaylists: true,
        },
      }),
    ]);
    await act(async () => {
      render(<SourcePicker />);
    });
    expect(await screen.findByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Stream')).toBeInTheDocument();
    expect(screen.getByText('Playlists')).toBeInTheDocument();
    expect(screen.getByText('Liked Tracks')).toBeInTheDocument();
  });

  it('shows authenticated checkmark for authed sources', async () => {
    setupWithRegistrations([reg({ id: 'spotify', name: 'Spotify', authenticated: true })]);
    await act(async () => {
      render(<SourcePicker />);
    });
    const check = await screen.findByTitle('Authenticated');
    expect(check).toBeInTheDocument();
    expect(check).toHaveTextContent('✓');
  });

  it('toggles enabled state when checkbox changes', async () => {
    const setEnabledMock = vi.fn().mockResolvedValue({ id: 'spotify', enabled: false });
    installMockWindowApi({
      sources: {
        setEnabled: setEnabledMock,
        list: vi.fn().mockResolvedValue([reg({ id: 'spotify', name: 'Spotify', enabled: true })]),
        loadConfigs: vi.fn().mockResolvedValue({}),
      },
    });
    useSourcesStore.setState({
      loading: false,
      registrations: [reg({ id: 'spotify', name: 'Spotify', enabled: true })],
    });
    await act(async () => {
      render(<SourcePicker />);
    });
    const toggle = await screen.findByLabelText('Enable Spotify');
    await act(async () => {
      fireEvent.click(toggle);
    });
    await waitFor(() => {
      expect(setEnabledMock).toHaveBeenCalledWith({ id: 'spotify', enabled: false });
    });
    expect(useSourcesStore.getState().registrations[0].enabled).toBe(false);
  });

  it('opens config dialog when gear clicked for configurable source', async () => {
    const getConfigMock = vi.fn().mockResolvedValue({ clientId: 'abc123' });
    const saveConfigMock = vi
      .fn()
      .mockResolvedValue({ id: 'soundcloud', settings: { clientId: 'new' } });
    installMockWindowApi({
      sources: {
        getConfig: getConfigMock,
        saveConfig: saveConfigMock,
        list: vi.fn().mockResolvedValue([reg({ id: 'soundcloud', name: 'SoundCloud' })]),
        loadConfigs: vi.fn().mockResolvedValue({}),
      },
    });
    useSourcesStore.setState({
      loading: false,
      registrations: [reg({ id: 'soundcloud', name: 'SoundCloud' })],
    });
    await act(async () => {
      render(<SourcePicker />);
    });
    const configBtn = await screen.findByLabelText('Configure SoundCloud');
    await act(async () => {
      fireEvent.click(configBtn);
    });
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Configure SoundCloud')).toBeInTheDocument();
  });

  it('does not show gear button for non-configurable sources', async () => {
    setupWithRegistrations([reg({ id: 'local', name: 'Local Files' })]);
    await act(async () => {
      render(<SourcePicker />);
    });
    expect(await screen.findByText('Local Files')).toBeInTheDocument();
    expect(screen.queryByLabelText('Configure Local Files')).not.toBeInTheDocument();
  });
});
