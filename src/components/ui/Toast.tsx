import { useToastStore, type ToastType } from './toastStore';

const TYPE_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-900/40 border-emerald-700 text-emerald-200',
  error: 'bg-red-900/40 border-red-700 text-red-200',
  info: 'bg-blue-900/40 border-blue-700 text-blue-200',
  warning: 'bg-amber-900/40 border-amber-700 text-amber-200',
};

function ToastContainer(): JSX.Element {
  const toasts = useToastStore((s) => s.toasts);
  const remove = useToastStore((s) => s.remove);

  return (
    <div
      className="fixed bottom-24 right-4 z-50 flex flex-col gap-3 pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto border rounded-lg px-4 py-3 shadow-glow-sm text-sm flex items-center gap-3 animate-slide-in max-w-sm ${TYPE_STYLES[toast.type]}`}
          role="alert"
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => remove(toast.id)}
            className="opacity-60 hover:opacity-100 text-lg leading-none"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export { ToastContainer };
