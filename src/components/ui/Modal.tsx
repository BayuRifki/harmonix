import { useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { FocusTrap } from './FocusTrap';

interface ModalProps {
  title: string;
  description?: string;
  children?: ReactNode;
  open: boolean;
  onClose: () => void;
  actions?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

function Modal({
  title,
  description,
  children,
  open,
  onClose,
  actions,
  size = 'md',
}: ModalProps): ReactNode {
  const [down, setDown] = useState(false);
  if (!open) return null;

  const sizeClass = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in"
      onMouseDown={() => setDown(true)}
      onMouseUp={() => setDown(false)}
    >
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <FocusTrap active={open} initialFocus="first" restoreFocus>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
          className={`relative bg-zinc-900 border border-zinc-700 rounded-xl shadow-glow-lg p-6 w-full ${sizeClass} mx-4 animate-scale-in`}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 id="modal-title" className="text-lg font-semibold text-zinc-100">
                {title}
              </h2>
              {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
            </div>
            <Button variant="icon" size="sm" onClick={onClose} aria-label="Close dialog">
              <X size={18} />
            </Button>
          </div>

          <div className="text-zinc-300">{children}</div>

          {actions && (
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-zinc-700">
              {actions}
            </div>
          )}
        </div>
      </FocusTrap>
      {down && <div aria-hidden className="hidden" />}
    </div>
  );
}

export { Modal };
