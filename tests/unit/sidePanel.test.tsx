import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { SidePanel } from '@/components/ui/SidePanel';
import { useUiStore } from '@/stores/uiStore';

beforeEach(() => {
  useUiStore.setState({ reducedMotion: false });
});

describe('SidePanel', () => {
  it('does not render anything when closed', () => {
    render(
      <SidePanel open={false} onClose={() => undefined} title="Test">
        <p>content</p>
      </SidePanel>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders a dialog with the title and content when open', () => {
    render(
      <SidePanel open={true} onClose={() => undefined} title="My Panel">
        <p>panel body</p>
      </SidePanel>,
    );
    expect(screen.getByRole('dialog', { name: /My Panel/i })).toBeInTheDocument();
    expect(screen.getByText('panel body')).toBeInTheDocument();
  });

  it('has role=dialog and aria-modal=true', () => {
    render(
      <SidePanel open={true} onClose={() => undefined} title="A11y">
        <p>content</p>
      </SidePanel>,
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
  });

  it('exposes a close button with aria-label', () => {
    render(
      <SidePanel open={true} onClose={() => undefined} title="X">
        <p>content</p>
      </SidePanel>,
    );
    expect(screen.getByTestId('side-panel-close')).toHaveAttribute('aria-label', 'Close panel');
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} onClose={onClose} title="X">
        <p>content</p>
      </SidePanel>,
    );
    fireEvent.click(screen.getByTestId('side-panel-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the backdrop is clicked (closeOnBackdrop=true)', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SidePanel open={true} onClose={onClose} title="X">
        <p>content</p>
      </SidePanel>,
    );
    // The backdrop is the absolute-positioned div with aria-hidden
    const backdrop = container.querySelector('div.absolute.inset-0.bg-black\\/60');
    expect(backdrop).not.toBeNull();
    fireEvent.click(backdrop!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on backdrop click when closeOnBackdrop=false', () => {
    const onClose = vi.fn();
    const { container } = render(
      <SidePanel open={true} onClose={onClose} title="X" closeOnBackdrop={false}>
        <p>content</p>
      </SidePanel>,
    );
    const backdrop = container.querySelector('div.absolute.inset-0.bg-black\\/60');
    fireEvent.click(backdrop!);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose on Escape key when closeOnEsc=true', () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} onClose={onClose} title="X">
        <p>content</p>
      </SidePanel>,
    );
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does NOT close on Escape when closeOnEsc=false', () => {
    const onClose = vi.fn();
    render(
      <SidePanel open={true} onClose={onClose} title="X" closeOnEsc={false}>
        <p>content</p>
      </SidePanel>,
    );
    act(() => {
      fireEvent.keyDown(window, { key: 'Escape' });
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll when open and restores on close', () => {
    const { rerender } = render(
      <SidePanel open={true} onClose={() => undefined} title="X">
        <p>content</p>
      </SidePanel>,
    );
    expect(document.documentElement.style.overflow).toBe('hidden');
    rerender(
      <SidePanel open={false} onClose={() => undefined} title="X">
        <p>content</p>
      </SidePanel>,
    );
    expect(document.documentElement.style.overflow).toBe('');
  });
});
