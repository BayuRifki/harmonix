import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  'audio[controls]',
  'video[controls]',
  '[contenteditable]:not([contenteditable="false"])',
].join(',');

export interface FocusTrapProps {
  active?: boolean;
  initialFocus?: 'first' | 'container' | 'none';
  restoreFocus?: boolean;
  children: ReactNode;
}

function getFocusable(container: HTMLElement): HTMLElement[] {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  return nodes.filter((el) => {
    if (el.hasAttribute('disabled')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;
    const rects = el.getClientRects();
    if (rects.length === 0) return false;
    const style = typeof window !== 'undefined' ? window.getComputedStyle(el) : null;
    if (style && (style.visibility === 'hidden' || style.display === 'none')) return false;
    return true;
  });
}

export function FocusTrap({
  active = true,
  initialFocus = 'first',
  restoreFocus = true,
  children,
}: FocusTrapProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!active) return undefined;
    if (typeof window === 'undefined') return undefined;
    const container = containerRef.current;
    if (!container) return undefined;

    previousFocusRef.current = (document.activeElement as HTMLElement | null) ?? null;

    if (initialFocus === 'first') {
      const focusables = getFocusable(container);
      const first = focusables[0];
      if (first) {
        first.focus();
      } else {
        container.setAttribute('tabindex', '-1');
        container.focus();
      }
    } else if (initialFocus === 'container') {
      container.setAttribute('tabindex', '-1');
      container.focus();
    }

    const onKey = (e: KeyboardEvent): void => {
      if (e.key !== 'Tab') return;
      const focusables = getFocusable(container);
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!first || !last) return;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', onKey, true);
    return (): void => {
      window.removeEventListener('keydown', onKey, true);
      if (restoreFocus && previousFocusRef.current) {
        const prev = previousFocusRef.current;
        if (document.contains(prev)) {
          prev.focus();
        }
      }
    };
  }, [active, initialFocus, restoreFocus]);

  return (
    <div ref={containerRef} data-focus-trap={active ? 'active' : 'inactive'}>
      {children}
    </div>
  );
}
