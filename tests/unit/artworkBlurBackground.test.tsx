import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { ArtworkBlurBackground } from '@/components/layout/ArtworkBlurBackground';
import { usePlayerStore } from '@/stores/playerStore';
import type { Track } from '@/types/global';

function makeTrack(artworkUrl: string): Track {
  return {
    id: '1',
    sourceId: 'local',
    source: 'local',
    title: 'Test',
    artists: [{ id: 'a1', source: 'local', name: 'Artist' }],
    album: undefined,
    durationMs: 1000,
    artworkUrl,
    isPlayable: true,
  };
}

class MockImage {
  crossOrigin = '';
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 100;
  naturalHeight = 100;
  set src(_value: string) {
    setTimeout(() => {
      if (this.onload) this.onload();
    }, 0);
  }
  removeAttribute(_name: string): void {
    // no-op for test mock
  }
}

describe('ArtworkBlurBackground', () => {
  beforeEach(() => {
    usePlayerStore.setState({ currentTrack: null });
    vi.stubGlobal('Image', MockImage);
  });

  it('renders nothing when no track is playing', () => {
    const { container } = render(<ArtworkBlurBackground />);
    expect(container.firstChild).toBeNull();
  });

  it('renders a background div when track has artwork', async () => {
    usePlayerStore.setState({ currentTrack: makeTrack('https://example.com/art.jpg') });
    render(<ArtworkBlurBackground />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    const el = screen.getByTestId('artwork-blur-background');
    expect(el).toBeInTheDocument();
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('applies the opacity prop', async () => {
    usePlayerStore.setState({ currentTrack: makeTrack('https://example.com/art.jpg') });
    render(<ArtworkBlurBackground opacity={0.5} />);
    await act(async () => {
      await new Promise((r) => setTimeout(r, 5));
    });
    const el = screen.getByTestId('artwork-blur-background');
    expect(el.style.opacity).toBe('0.5');
  });
});
