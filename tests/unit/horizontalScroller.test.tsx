import { describe, it, expect, vi } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { HorizontalScroller } from '@/components/ui/HorizontalScroller';

vi.mock('@/stores/uiStore', () => ({
  useUiStore: Object.assign(
    (selector: (s: { showScrollIndicators: boolean; showSnapPoints: boolean }) => unknown) =>
      selector({ showScrollIndicators: true, showSnapPoints: true }),
    { getState: () => ({ showScrollIndicators: true, showSnapPoints: true }) },
  ),
}));

describe('HorizontalScroller', () => {
  it('renders children inside scroll container', () => {
    render(
      <HorizontalScroller>
        <div data-testid="child">A</div>
        <div>B</div>
      </HorizontalScroller>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(screen.getByTestId('horizontal-scroller')).toBeInTheDocument();
    cleanup();
  });

  it('has region role with aria-label', () => {
    render(
      <HorizontalScroller ariaLabel="Test rail">
        <div>X</div>
      </HorizontalScroller>,
    );
    const region = screen.getByRole('region', { name: 'Test rail' });
    expect(region).toBeInTheDocument();
    cleanup();
  });
});
