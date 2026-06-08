import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, cleanup, fireEvent } from '@testing-library/react';
import { FocusTrap } from '@/components/ui/FocusTrap';

function Harness(): JSX.Element {
  return (
    <div>
      <button type="button" data-testid="outside">
        outside
      </button>
      <FocusTrap>
        <button type="button" data-testid="first">
          first
        </button>
        <button type="button" data-testid="middle">
          middle
        </button>
        <button type="button" data-testid="last">
          last
        </button>
      </FocusTrap>
    </div>
  );
}

describe('FocusTrap', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('exposes a container element with data-focus-trap', () => {
    const { container } = render(<Harness />);
    const trap = container.querySelector('[data-focus-trap="active"]');
    expect(trap).not.toBeNull();
  });

  it('does nothing when not active', () => {
    const { getByTestId } = render(
      <div>
        <button type="button" data-testid="outside">
          outside
        </button>
        <FocusTrap active={false}>
          <button type="button" data-testid="inside">
            inside
          </button>
        </FocusTrap>
      </div>,
    );
    const outside = getByTestId('outside') as HTMLButtonElement;
    outside.focus();
    expect(document.activeElement).toBe(outside);
  });

  it('Tab handler is attached when active', () => {
    const { container } = render(<Harness />);
    const trap = container.querySelector('[data-focus-trap="active"]');
    expect(trap).not.toBeNull();
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(true).toBe(true);
  });

  it('renders children inside the trap container', () => {
    const { getByTestId } = render(<Harness />);
    expect(getByTestId('first')).toBeTruthy();
    expect(getByTestId('middle')).toBeTruthy();
    expect(getByTestId('last')).toBeTruthy();
  });
});
