import { useEffect, useRef, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from './Button';
import { FocusTrap } from './FocusTrap';
import { useUiStore } from '@/stores/uiStore';

export interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  width?: 'sm' | 'md' | 'lg';
  closeOnBackdrop?: boolean;
  closeOnEsc?: boolean;
  ariaLabelledBy?: string;
  children: ReactNode;
}

const WIDTHS: Record<NonNullable<SidePanelProps['width']>, string> = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
};

export function SidePanel({
  open,
  onClose,
  title,
  description,
  width = 'md',
  closeOnBackdrop = true,
  closeOnEsc = true,
  ariaLabelledBy,
  children,
}: SidePanelProps): JSX.Element {
  const reducedMotion = useUiStore((s) => s.reducedMotion);
  const headingIdRef = useRef<string>(
    ariaLabelledBy ?? `side-panel-title-${Math.random().toString(36).slice(2, 9)}`,
  );
  const previousOverflowRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    if (typeof document === 'undefined') return undefined;
    const html = document.documentElement;
    // Capture the previous value so we can restore on close. (The page
    // may already have `overflow-hidden` set by another modal — we
    // must not clobber that with the default.)
    previousOverflowRef.current = html.style.overflow;
    const previousPaddingRight = html.style.paddingRight;
    const scrollbarWidth = window.innerWidth - html.clientWidth;
    if (scrollbarWidth > 0) {
      html.style.paddingRight = `${scrollbarWidth}px`;
    }
    html.style.overflow = 'hidden';
    return (): void => {
      html.style.overflow = previousOverflowRef.current ?? '';
      html.style.paddingRight = previousPaddingRight;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!closeOnEsc) return undefined;
    if (typeof window === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return (): void => window.removeEventListener('keydown', onKey, true);
  }, [open, closeOnEsc, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="side-panel-root"
          className="fixed inset-0 z-50 flex justify-end"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.15 }}
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-hidden
            onClick={closeOnBackdrop ? onClose : undefined}
          />
          <FocusTrap active={open} initialFocus="first" restoreFocus>
            <motion.aside
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingIdRef.current}
              data-testid="side-panel"
              className={`relative h-full w-full ${WIDTHS[width]} bg-zinc-900 border-l border-zinc-800 shadow-glow-lg flex flex-col`}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={
                reducedMotion
                  ? { duration: 0 }
                  : { type: 'spring', stiffness: 380, damping: 36, mass: 0.6 }
              }
              onClick={(e) => e.stopPropagation()}
            >
              <header className="flex items-start justify-between p-5 border-b border-zinc-800">
                <div>
                  <h2 id={headingIdRef.current} className="text-lg font-semibold text-zinc-100">
                    {title}
                  </h2>
                  {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
                </div>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close panel"
                  data-testid="side-panel-close"
                >
                  <X size={18} />
                </Button>
              </header>
              <div className="flex-1 overflow-y-auto">{children}</div>
            </motion.aside>
          </FocusTrap>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
