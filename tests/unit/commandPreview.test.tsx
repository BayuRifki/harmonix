import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import { CommandPreview } from '@/components/command/CommandPreview';
import { useLibraryStore } from '@/stores/libraryStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import type { CommandItem } from '@/components/command/CommandPalette';
import { Music, ArrowRight } from 'lucide-react';

function makeItem(overrides: Partial<CommandItem>): CommandItem {
  return {
    id: 'test',
    label: 'Test',
    group: 'Navigation',
    icon: ArrowRight,
    perform: () => undefined,
    ...overrides,
  };
}

describe('CommandPreview', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useLibraryStore.setState({ tracks: [], albums: [], artists: [] });
    usePlaylistsStore.setState({ playlists: [] });
  });

  it('shows empty state when no item selected', () => {
    const { getByTestId } = render(<CommandPreview item={null} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('Hover an item');
  });

  it('renders track preview with metadata when track exists in library', () => {
    useLibraryStore.setState({
      tracks: [
        {
          id: 't1',
          title: 'Yellow Submarine',
          artists: [{ id: 'a1', name: 'The Beatles' }],
          album: { id: 'al1', title: 'Revolver', artworkUrl: null },
          durationMs: 158000,
          artworkUrl: 'http://example.com/art.jpg',
          source: 'local',
        } as never,
      ],
      albums: [],
      artists: [],
    });
    const item = makeItem({
      id: 'track.t1',
      label: 'Yellow Submarine',
      hint: 'The Beatles',
      group: 'Tracks',
      icon: Music,
    });
    const { getByTestId } = render(<CommandPreview item={item} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('Yellow Submarine');
    expect(preview.textContent).toContain('The Beatles');
    expect(preview.textContent).toContain('Revolver');
  });

  it('renders album preview with track count', () => {
    useLibraryStore.setState({
      tracks: [],
      albums: [{ title: 'Revolver', artist: 'The Beatles', trackCount: 14 } as never],
      artists: [],
    });
    const item = makeItem({
      id: 'album.Revolver',
      label: 'Revolver',
      hint: 'The Beatles',
      group: 'Albums',
    });
    const { getByTestId } = render(<CommandPreview item={item} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('Revolver');
    expect(preview.textContent).toContain('14');
  });

  it('renders artist preview with track count', () => {
    useLibraryStore.setState({
      tracks: [],
      albums: [],
      artists: [{ name: 'The Beatles', trackCount: 117 } as never],
    });
    const item = makeItem({
      id: 'artist.The Beatles',
      label: 'The Beatles',
      group: 'Artists',
    });
    const { getByTestId } = render(<CommandPreview item={item} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('The Beatles');
    expect(preview.textContent).toContain('117');
  });

  it('renders playlist preview with track count', () => {
    usePlaylistsStore.setState({
      playlists: [{ id: 1, name: 'My Mix', trackCount: 25 } as never],
    });
    const item = makeItem({
      id: 'playlist.1',
      label: 'My Mix',
      group: 'Playlists',
    });
    const { getByTestId } = render(<CommandPreview item={item} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('My Mix');
    expect(preview.textContent).toContain('25');
  });

  it('falls back gracefully when track id is unknown', () => {
    const item = makeItem({
      id: 'track.unknown',
      label: 'Unknown Track',
      group: 'Tracks',
    });
    const { getByTestId } = render(<CommandPreview item={item} />);
    const preview = getByTestId('command-preview');
    expect(preview.textContent).toContain('Unknown Track');
  });

  it('renders Play action for tracks', () => {
    useLibraryStore.setState({
      tracks: [
        {
          id: 't1',
          title: 'T',
          artists: [{ id: 'a1', name: 'A' }],
          album: { id: 'al1', title: 'Al', artworkUrl: null },
          durationMs: 1000,
          artworkUrl: null,
          source: 'local',
        } as never,
      ],
      albums: [],
      artists: [],
    });
    const item = makeItem({ id: 'track.t1', label: 'T', group: 'Tracks', icon: Music });
    const { getByTestId } = render(<CommandPreview item={item} />);
    expect(getByTestId('command-preview-play')).toBeTruthy();
  });
});
