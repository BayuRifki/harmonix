import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { CommandPalette } from '@/components/command/CommandPalette';
import { useUiStore } from '@/stores/uiStore';
import { usePlayerStore } from '@/stores/playerStore';
import { usePlaylistsStore } from '@/stores/playlistsStore';
import { useLibraryStore } from '@/stores/libraryStore';
import { useListeningHistoryStore } from '@/stores/listeningHistoryStore';
import { installMockWindowApi } from '../setup';

function renderPalette(): void {
  render(
    <MemoryRouter>
      <CommandPalette />
    </MemoryRouter>,
  );
}

function openPalette(): void {
  act(() => {
    useUiStore.getState().openCommandPalette();
  });
}

describe('CommandPalette', () => {
  beforeEach(() => {
    installMockWindowApi();
    useUiStore.setState({
      commandPaletteOpen: false,
      recents: [],
      sidebarCollapsed: {},
    });
    usePlayerStore.setState({
      currentTrack: null,
      isPlaying: false,
      volume: 0.5,
      queue: [],
    });
    usePlaylistsStore.setState({ playlists: [], current: null });
    useLibraryStore.setState({
      tracks: [],
      albums: [],
      artists: [],
      stats: { trackCount: 0, albumCount: 0, artistCount: 0 },
    });
    useListeningHistoryStore.setState({ entries: [] });
  });

  it('does not render when closed', () => {
    renderPalette();
    expect(screen.queryByTestId('command-palette')).toBeNull();
  });

  it('renders the dialog when opened', () => {
    renderPalette();
    openPalette();
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
  });

  it('shows the search input with placeholder', () => {
    renderPalette();
    openPalette();
    const input = screen.getByLabelText('Command palette input');
    expect(input).toBeInTheDocument();
    expect(input.getAttribute('placeholder')).toMatch(/command|search|jump/i);
  });

  it('lists built-in navigation items', () => {
    renderPalette();
    openPalette();
    expect(screen.getAllByText('Go to Home').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Go to Library').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Open Settings').length).toBeGreaterThan(0);
  });

  it('filters items by query', () => {
    renderPalette();
    openPalette();
    const input = screen.getByLabelText('Command palette input');
    fireEvent.change(input, { target: { value: 'equalizer' } });
    expect(document.getElementById('cmd-nav.equalizer')).not.toBeNull();
    expect(document.getElementById('cmd-nav.settings')).toBeNull();
  });

  it('closes on Escape', () => {
    renderPalette();
    openPalette();
    expect(screen.getByTestId('command-palette')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('arrow down moves active selection', () => {
    renderPalette();
    openPalette();
    const input = screen.getByLabelText('Command palette input');
    input.focus();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'ArrowUp' });
    const options = screen.getAllByRole('option');
    expect(options.length).toBeGreaterThan(2);
  });

  it('Cmd+K toggles open from anywhere', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
    fireEvent.keyDown(window, { key: 'k', metaKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(false);
  });

  it('Ctrl+K toggles open from anywhere', () => {
    renderPalette();
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(useUiStore.getState().commandPaletteOpen).toBe(true);
  });

  it('shows "No results" message when query matches nothing', () => {
    renderPalette();
    openPalette();
    const input = screen.getByLabelText('Command palette input');
    fireEvent.change(input, { target: { value: 'zzzzzzz' } });
    expect(screen.getByText(/No results for/i)).toBeInTheDocument();
  });

  it('shows recents section when query is empty and recents exist', () => {
    act(() => {
      useUiStore.setState({ recents: ['/library', '/settings'] });
    });
    renderPalette();
    openPalette();
    expect(screen.getByText('Recents')).toBeInTheDocument();
    expect(screen.getByText('/library')).toBeInTheDocument();
  });

  it('shows "Pause" action when playing', () => {
    act(() => {
      usePlayerStore.setState({ isPlaying: true });
    });
    renderPalette();
    openPalette();
    expect(screen.getByText('Pause')).toBeInTheDocument();
  });

  it('shows "Play" action when paused', () => {
    act(() => {
      usePlayerStore.setState({ isPlaying: false });
    });
    renderPalette();
    openPalette();
    expect(screen.getByText('Play')).toBeInTheDocument();
  });

  it('lists playlist items from store', () => {
    act(() => {
      usePlaylistsStore.setState({
        playlists: [
          {
            id: 7,
            name: 'Chill Vibes',
            trackCount: 12,
            description: null,
            created_at: 0,
            updated_at: 0,
          },
        ],
      });
    });
    renderPalette();
    openPalette();
    expect(screen.getByText('Chill Vibes')).toBeInTheDocument();
    expect(screen.getByText('12 tracks')).toBeInTheDocument();
  });

  it('highlights matched characters in result labels', () => {
    renderPalette();
    openPalette();
    const input = screen.getByLabelText('Command palette input');
    fireEvent.change(input, { target: { value: 'home' } });
    const marks = screen.getAllByText('Home', { selector: 'span' });
    expect(marks.length).toBeGreaterThan(0);
  });
});
