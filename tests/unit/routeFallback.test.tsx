import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { RouteFallback } from '@/components/a11y/RouteFallback';

describe('RouteFallback', () => {
  it('renders page variant by default', () => {
    render(<RouteFallback />);
    expect(screen.getByTestId('route-fallback-page')).toBeInTheDocument();
    cleanup();
  });

  it('renders card variant', () => {
    render(<RouteFallback variant="card" />);
    expect(screen.getByTestId('route-fallback-card')).toBeInTheDocument();
    cleanup();
  });

  it('renders list variant with rows', () => {
    render(<RouteFallback variant="list" />);
    expect(screen.getByTestId('route-fallback-list')).toBeInTheDocument();
    cleanup();
  });
});
