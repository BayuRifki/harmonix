import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PlaylistCardSidebar } from '@/components/sidebar/PlaylistCardSidebar';
import type { PlaylistSummary } from '@/types/global';

function makePlaylist(overrides: Partial<PlaylistSummary> = {}): PlaylistSummary {
  return {
    id: 1,
    name: 'Chill Vibes',
    description: null,
    created_at: 0,
    updated_at: 0,
    trackCount: 32,
    ...overrides,
  };
}

describe('PlaylistCardSidebar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders playlist name and song count', () => {
    render(<PlaylistCardSidebar playlist={makePlaylist({ name: 'My Mix', trackCount: 12 })} />);
    expect(screen.getByText('My Mix')).toBeInTheDocument();
    expect(screen.getByText('12 songs')).toBeInTheDocument();
  });

  it('uses singular "song" when count is 1', () => {
    render(<PlaylistCardSidebar playlist={makePlaylist({ trackCount: 1 })} />);
    expect(screen.getByText('1 song')).toBeInTheDocument();
  });

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    render(<PlaylistCardSidebar playlist={makePlaylist()} onClick={onClick} />);
    fireEvent.click(screen.getByText('Chill Vibes'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('invokes onPlay when play button is clicked (does not bubble to onClick)', () => {
    const onClick = vi.fn();
    const onPlay = vi.fn();
    render(<PlaylistCardSidebar playlist={makePlaylist()} onClick={onClick} onPlay={onPlay} />);
    const playButton = screen.getByLabelText('Play Chill Vibes');
    fireEvent.click(playButton);
    expect(onPlay).toHaveBeenCalledTimes(1);
    expect(onClick).not.toHaveBeenCalled();
  });
});
