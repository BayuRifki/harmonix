import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type: ToastType, duration?: number) => void;
  remove: (id: string) => void;
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const useToastStore = create<ToastStore>((set) => ({
  toasts: [],
  add: (message, type, duration = 4000) => {
    const id = generateId();
    set((state) => ({
      toasts: [...state.toasts, { id, message, type, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({
          toasts: state.toasts.filter((t) => t.id !== id),
        }));
      }, duration);
    }
  },
  remove: (id) =>
    set((state) => ({
      toasts: state.toasts.filter((t) => t.id !== id),
    })),
  success: (message, duration) => useToastStore.getState().add(message, 'success', duration),
  error: (message, duration) => useToastStore.getState().add(message, 'error', duration),
  info: (message, duration) => useToastStore.getState().add(message, 'info', duration),
  warning: (message, duration) => useToastStore.getState().add(message, 'warning', duration),
}));

export { useToastStore };
export type { ToastItem, ToastStore };
