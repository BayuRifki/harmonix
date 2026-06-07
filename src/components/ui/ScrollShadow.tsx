import { useEffect, useRef, useState } from 'react';

export interface ScrollShadowProps {
  children: React.ReactNode;
  className?: string;
  fadeSize?: number;
  horizontal?: boolean;
}

export function ScrollShadow({
  children,
  className = '',
  fadeSize = 24,
  horizontal = false,
}: ScrollShadowProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTop, setShowTop] = useState(false);
  const [showBottom, setShowBottom] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = (): void => {
      if (horizontal) {
        setShowTop(el.scrollLeft > 4);
        setShowBottom(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
      } else {
        setShowTop(el.scrollTop > 4);
        setShowBottom(el.scrollTop + el.clientHeight < el.scrollHeight - 4);
      }
    };

    update();
    el.addEventListener('scroll', update, { passive: true });
    return () => el.removeEventListener('scroll', update);
  }, [horizontal]);

  const fadeStyle = horizontal
    ? {
        maskImage: `linear-gradient(
          to right,
          ${showTop ? `transparent ${fadeSize}px` : 'transparent'},
          black ${fadeSize}px,
          black calc(100% - ${fadeSize}px),
          ${showBottom ? `transparent calc(100% - ${fadeSize}px)` : 'black 100%'}
        )`,
        WebkitMaskImage: `linear-gradient(
          to right,
          ${showTop ? `transparent ${fadeSize}px` : 'transparent'},
          black ${fadeSize}px,
          black calc(100% - ${fadeSize}px),
          ${showBottom ? `transparent calc(100% - ${fadeSize}px)` : 'black 100%'}
        )`,
      }
    : {
        maskImage: `linear-gradient(
        to bottom,
        ${showTop ? `transparent ${fadeSize}px` : 'transparent'},
        black ${fadeSize}px,
        black calc(100% - ${fadeSize}px),
        ${showBottom ? `transparent calc(100% - ${fadeSize}px)` : 'black 100%'}
      )`,
        WebkitMaskImage: `linear-gradient(
        to bottom,
        ${showTop ? `transparent ${fadeSize}px` : 'transparent'},
        black ${fadeSize}px,
        black calc(100% - ${fadeSize}px),
        ${showBottom ? `transparent calc(100% - ${fadeSize}px)` : 'black 100%'}
      )`,
      };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={fadeStyle}
      data-testid="scroll-shadow"
    >
      {children}
    </div>
  );
}
