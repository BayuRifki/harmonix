import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ParticleField, StereoOscilloscope } from '@/components/visualizers/AudioVisualizer';

vi.mock('@/hooks/useVisualizerQuality', () => ({
  useEffectiveVisualizerQuality: () => ({ quality: 'high', source: 'auto' as const }),
}));

vi.mock('@/lib/audio/engine', () => ({
  audioEngine: {
    getGainNode: () => null,
    on: () => () => undefined,
    setVolume: () => undefined,
  },
}));

describe('ParticleField', () => {
  it('renders a canvas with role=img', () => {
    render(<ParticleField count={10} />);
    const canvas = screen.getByTestId('particle-field');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('role')).toBe('img');
    cleanup();
  });

  it('uses default aria-label', () => {
    render(<ParticleField />);
    expect(screen.getByTestId('particle-field').getAttribute('aria-label')).toBe(
      'Audio particle field',
    );
    cleanup();
  });
});

describe('StereoOscilloscope', () => {
  it('renders a canvas with role=img', () => {
    render(<StereoOscilloscope height={40} />);
    const canvas = screen.getByTestId('stereo-oscilloscope');
    expect(canvas.tagName).toBe('CANVAS');
    expect(canvas.getAttribute('role')).toBe('img');
    cleanup();
  });

  it('uses default aria-label', () => {
    render(<StereoOscilloscope />);
    expect(screen.getByTestId('stereo-oscilloscope').getAttribute('aria-label')).toBe(
      'Audio oscilloscope',
    );
    cleanup();
  });
});
