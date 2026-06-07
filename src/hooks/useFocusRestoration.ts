import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

interface FocusMemory {
  selector: string;
  scrollY: number;
  scrollX: number;
}

const FOCUS_PREFIX = 'focus-restore:';

function getMemoryKey(path: string): string {
  return `${FOCUS_PREFIX}${path}`;
}

function readMemory(path: string): FocusMemory | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(getMemoryKey(path));
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const p = parsed as Partial<FocusMemory>;
    if (typeof p.selector !== 'string') return null;
    return {
      selector: p.selector,
      scrollY: typeof p.scrollY === 'number' ? p.scrollY : 0,
      scrollX: typeof p.scrollX === 'number' ? p.scrollX : 0,
    };
  } catch {
    return null;
  }
}

function writeMemory(path: string, mem: FocusMemory): void {
  if (typeof sessionStorage === 'undefined') return;
  try {
    sessionStorage.setItem(getMemoryKey(path), JSON.stringify(mem));
  } catch {
    // ignore
  }
}

function describeElement(el: HTMLElement): string {
  if (el.id) return `#${el.id}`;
  const testId = el.getAttribute('data-testid');
  if (testId) return `[data-testid="${testId}"]`;
  if (el.getAttribute('aria-label')) {
    return `[aria-label="${el.getAttribute('aria-label')}"]`;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === 'body' || tag === 'html') return tag;
  return `${tag}:nth-of-type(${
    Array.from(el.parentElement?.children ?? [])
      .filter((s) => s.tagName === el.tagName)
      .indexOf(el) + 1
  })`;
}

export function getCurrentFocusable(): HTMLElement | null {
  const el = document.activeElement;
  if (!el) return null;
  if (el === document.body) return null;
  if (!(el instanceof HTMLElement)) return null;
  if (el.tabIndex < 0 && !el.hasAttribute('data-focusable')) return null;
  return el;
}

export function useFocusRestoration(): void {
  const location = useLocation();
  const restoredRef = useRef<string | null>(null);

  useEffect(() => {
    const path = location.pathname + location.search;
    if (restoredRef.current !== path) {
      restoredRef.current = path;
      const mem = readMemory(path);
      if (mem) {
        requestAnimationFrame(() => {
          const target = document.querySelector<HTMLElement>(mem.selector);
          if (target) {
            target.focus({ preventScroll: true });
            const main = document.querySelector<HTMLElement>('main, [role="main"]');
            if (main) {
              main.scrollTo({ top: mem.scrollY, left: mem.scrollX, behavior: 'auto' });
            } else {
              window.scrollTo(mem.scrollX, mem.scrollY);
            }
          }
        });
      }
    }

    return (): void => {
      const el = getCurrentFocusable();
      if (el) {
        const main = document.querySelector<HTMLElement>('main, [role="main"]');
        writeMemory(path, {
          selector: describeElement(el),
          scrollY: main?.scrollTop ?? window.scrollY,
          scrollX: main?.scrollLeft ?? window.scrollX,
        });
      }
    };
  }, [location.pathname, location.search]);
}
