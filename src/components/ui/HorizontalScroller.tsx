import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useUiStore } from '@/stores/uiStore';

export interface HorizontalScrollerProps {
  children: ReactNode;
  className?: string;
  itemWidth?: number;
  gap?: number;
  showIndicators?: boolean;
  snapPoints?: boolean;
  ariaLabel?: string;
}

export function HorizontalScroller({
  children,
  className = '',
  itemWidth = 128,
  gap = 8,
  showIndicators,
  snapPoints,
  ariaLabel,
}: HorizontalScrollerProps): JSX.Element {
  const ref = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const canScrollLeftRef = useRef(false);
  const canScrollRightRef = useRef(false);
  const showIndicatorsStored = useUiStore((s) => s.showScrollIndicators);
  const snapPointsStored = useUiStore((s) => s.showSnapPoints);
  const indicatorsOn = showIndicators ?? showIndicatorsStored;
  const snapOn = snapPoints ?? snapPointsStored;

  function update(): void {
    const el = ref.current;
    if (!el) return;
    const left = el.scrollLeft > 4;
    const right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4;
    canScrollLeftRef.current = left;
    canScrollRightRef.current = right;
    setCanScrollLeft(left);
    setCanScrollRight(right);
  }

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    if (ro) ro.observe(el);
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowLeft' && canScrollLeftRef.current) {
        e.preventDefault();
        scrollBy(-1);
      } else if (e.key === 'ArrowRight' && canScrollRightRef.current) {
        e.preventDefault();
        scrollBy(1);
      }
    };
    if (snapOn) {
      el.addEventListener('keydown', onKey);
      el.setAttribute('tabindex', '0');
    }
    return () => {
      el.removeEventListener('scroll', update);
      if (snapOn) {
        el.removeEventListener('keydown', onKey);
        el.removeAttribute('tabindex');
      }
      ro?.disconnect();
    };
  }, [snapOn]);

  const scrollBy = (dir: 1 | -1): void => {
    const el = ref.current;
    if (!el) return;
    const step = Math.max(itemWidth, el.clientWidth * 0.6);
    el.scrollBy({ left: dir * step, behavior: 'smooth' });
  };

  const snapClass = snapOn ? 'scroll-snap-type-x-mandatory [&>*]:scroll-snap-align-start' : '';

  return (
    <div className={`relative group ${className}`} data-testid="horizontal-scroller">
      <div
        ref={ref}
        role="region"
        aria-label={ariaLabel}
        className={`flex overflow-x-auto scrollbar-none ${snapClass}`}
        style={{ gap }}
      >
        {children}
      </div>
      {indicatorsOn && canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-1)}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-8 h-12 flex items-center justify-center bg-gradient-to-r from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:opacity-100"
          data-testid="horizontal-scroller-left"
        >
          <ChevronLeft size={18} />
        </button>
      )}
      {indicatorsOn && canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(1)}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-8 h-12 flex items-center justify-center bg-gradient-to-l from-black/80 to-transparent text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200 focus:outline-none focus:opacity-100"
          data-testid="horizontal-scroller-right"
        >
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
}
