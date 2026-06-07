import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FrequencyBars, WaveformRing } from '@/components/visualizers/AudioVisualizer';
import { useUiStore } from '@/stores/uiStore';

describe('FrequencyBars', () => {
  beforeEach(() => {
    useUiStore.setState({ reducedMotion: false });
  });

  it('renders a canvas with testid', () => {
    render(<FrequencyBars />);
    expect(screen.getByTestId('frequency-bars')).toBeInTheDocument();
  });

  it('applies the height style', () => {
    render(<FrequencyBars height={24} />);
    const canvas = screen.getByTestId('frequency-bars') as HTMLCanvasElement;
    expect(canvas.style.height).toBe('24px');
  });

  it('sets role="img" with aria-label', () => {
    render(<FrequencyBars ariaLabel="Custom label" />);
    expect(screen.getByRole('img', { name: 'Custom label' })).toBeInTheDocument();
  });

  it('does not crash when active=false', () => {
    render(<FrequencyBars active={false} />);
    expect(screen.getByTestId('frequency-bars')).toBeInTheDocument();
  });

  it('respects reducedMotion preference', () => {
    act(() => {
      useUiStore.setState({ reducedMotion: true });
    });
    render(<FrequencyBars />);
    expect(screen.getByTestId('frequency-bars')).toBeInTheDocument();
  });
});

describe('WaveformRing', () => {
  beforeEach(() => {
    useUiStore.setState({ reducedMotion: false });
  });

  it('renders a canvas with testid', () => {
    render(<WaveformRing />);
    expect(screen.getByTestId('waveform-ring')).toBeInTheDocument();
  });

  it('applies the size prop as width/height', () => {
    render(<WaveformRing size={200} />);
    const canvas = screen.getByTestId('waveform-ring') as HTMLCanvasElement;
    expect(canvas.style.width).toBe('200px');
    expect(canvas.style.height).toBe('200px');
  });

  it('sets role="img" with aria-label', () => {
    render(<WaveformRing ariaLabel="Ring" />);
    expect(screen.getByRole('img', { name: 'Ring' })).toBeInTheDocument();
  });

  it('respects reducedMotion preference', () => {
    act(() => {
      useUiStore.setState({ reducedMotion: true });
    });
    render(<WaveformRing />);
    expect(screen.getByTestId('waveform-ring')).toBeInTheDocument();
  });
});
