import { useRef, useState, useEffect, type ReactNode, type MouseEvent } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';

export interface RippleItem {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
}

export interface RippleProps {
  children: ReactNode;
  className?: string;
  color?: string;
}

let nextRippleId = 1;

export function Ripple({
  children,
  className = '',
  color = 'rgba(236, 72, 153, 0.4)',
}: RippleProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ripples, setRipples] = useState<RippleItem[]>([]);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (ripples.length === 0) return undefined;
    const id = ripples[0]?.id;
    if (id === undefined) return undefined;
    const timer = window.setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, 600);
    return () => window.clearTimeout(timer);
  }, [ripples]);

  const onPointerDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (reduced) return;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const size = Math.max(rect.width, rect.height) * 0.6;
    setRipples((prev) => [...prev, { id: nextRippleId++, x, y, size, color }]);
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={onPointerDown}
      className={`relative overflow-hidden ${className}`}
    >
      {children}
      <AnimatePresence>
        {ripples.map((r) => (
          <motion.span
            key={r.id}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1.5, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: r.x - r.size / 2,
              top: r.y - r.size / 2,
              width: r.size,
              height: r.size,
              background: r.color,
            }}
            aria-hidden
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

export interface MagneticButtonProps {
  children: ReactNode;
  className?: string;
  strength?: number;
  scale?: number;
  as?: 'button' | 'div' | 'a';
}

export function MagneticButton({
  children,
  className = '',
  strength = 0.15,
  scale = 1.04,
  as = 'div',
}: MagneticButtonProps): JSX.Element {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();

  const onMouseMove = (e: MouseEvent<HTMLElement>): void => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - (rect.left + rect.width / 2)) / rect.width;
    const py = (e.clientY - (rect.top + rect.height / 2)) / rect.height;
    el.style.transform = `translate(${px * strength * 12}px, ${py * strength * 12}px) scale(${scale})`;
  };

  const onMouseLeave = (): void => {
    if (ref.current) ref.current.style.transform = '';
  };

  const Tag = as as 'div';
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      onMouseMove={onMouseMove as unknown as React.MouseEventHandler<HTMLDivElement>}
      onMouseLeave={onMouseLeave as unknown as React.MouseEventHandler<HTMLDivElement>}
      className={`transition-transform duration-150 ease-out will-change-transform ${className}`}
    >
      {children}
    </Tag>
  );
}
