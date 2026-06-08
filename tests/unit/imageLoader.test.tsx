import { describe, it, expect } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { ImageLoader } from '@/components/ui/ImageLoader';

describe('ImageLoader', () => {
  it('renders fallback when src is null', () => {
    render(<ImageLoader src={null} alt="t" data-testid="img" />);
    expect(screen.getByTestId('image-loader-fallback')).toBeInTheDocument();
  });

  it('renders fallback when src errors', () => {
    render(<ImageLoader src="data:image/png;base64,invalid" alt="t" data-testid="img" />);
    const img = screen.getByTestId('image-loader-img');
    fireEvent.error(img);
    expect(screen.getByTestId('image-loader-fallback')).toBeInTheDocument();
  });

  it('fades in image on load', () => {
    render(<ImageLoader src="data:image/png;base64,AA" alt="t" />);
    const img = screen.getByTestId('image-loader-img');
    fireEvent.load(img);
    const main = screen.getByTestId('image-loader');
    const inner = main.querySelector('img');
    expect(inner).not.toBeNull();
  });
});
