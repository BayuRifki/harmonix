import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlaylistDropZone } from '@/components/dnd/PlaylistDropZone';

vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: () => undefined,
    isOver: false,
    active: null,
  }),
}));

describe('PlaylistDropZone', () => {
  it('renders children inside drop zone container', () => {
    render(
      <PlaylistDropZone playlistId={3} playlistName="Chill">
        <span data-testid="kid">x</span>
      </PlaylistDropZone>,
    );
    expect(screen.getByTestId('kid')).toBeInTheDocument();
    expect(screen.getByTestId('playlist-drop-3')).toBeInTheDocument();
    cleanup();
  });

  it('has aria-label describing the drop target', () => {
    render(
      <PlaylistDropZone playlistId={5} playlistName="Roadtrip">
        <span>x</span>
      </PlaylistDropZone>,
    );
    expect(screen.getByLabelText('Drop a track to add to Roadtrip')).toBeInTheDocument();
    cleanup();
  });
});
