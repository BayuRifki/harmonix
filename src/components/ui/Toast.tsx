import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useToastStore, type ToastType, type ToastItem } from './toastStore';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-900/40 border-emerald-700 text-emerald-200',
  error: 'bg-red-900/40 border-red-700 text-red-200',
  info: 'bg-blue-900/40 border-blue-700 text-blue-200',
  warning: 'bg-amber-900/40 border-amber-700 text-amber-200',
};

interface RichToastItem extends ToastItem {
  variant?: 'track-added' | 'playlist-created' | 'sync' | 'default';
  artworkUrl?: string;
  actionLabel?: string;
  action?: () => void;
  progress?: number;
  maxToasts?: number;
}

function ToastContent({
  toast,
  remove,
}: {
  toast: RichToastItem;
  remove: (id: string) => void;
}): JSX.Element {
  const { artworkUrl, actionLabel, action, progress } = toast;

  return (
    <div
      className={`pointer-events-auto border rounded-lg px-4 py-3 shadow-glow-sm text-sm flex items-start gap-3 max-w-sm ${TYPE_STYLES[toast.type]}`}
      role="alert"
      data-testid="toast"
    >
      {artworkUrl && (
        <img src={artworkUrl} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
      )}

      <div className="flex-1 min-w-0 pt-0.5">
        <p className="flex-1 text-white">{toast.message}</p>

        {action && actionLabel && (
          <button
            type="button"
            onClick={() => {
              action();
              remove(toast.id);
            }}
            className="mt-2 text-xs font-medium text-brand-300 hover:text-brand-200 underline"
          >
            {actionLabel}
          </button>
        )}

        {progress !== undefined && (
          <div className="mt-2 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-white rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => remove(toast.id)}
        className="opacity-60 hover:opacity-100 text-lg leading-none shrink-0 ml-2"
        aria-label="Dismiss notification"
      >
        <X size={16} />
      </button>
    </div>
  );
}

function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <AnimatePresence mode="popLayout">
      <div
        className="fixed bottom-24 right-4 z-50 flex flex-col gap-3 pointer-events-none w-[360px]"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
            className="pointer-events-auto"
          >
            <ToastContent toast={toast as RichToastItem} remove={remove} />
          </motion.div>
        ))}
      </div>
    </AnimatePresence>
  );
}

export { ToastContainer };
export type { RichToastItem };
