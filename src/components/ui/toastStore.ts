import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'info' | 'warning';
export type ToastVariant = 'track-added' | 'playlist-created' | 'sync' | 'default';

export interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
  variant?: ToastVariant;
  artworkUrl?: string;
  actionLabel?: string;
  action?: () => void;
  progress?: number;
}

interface ToastStore {
  toasts: ToastItem[];
  add: (message: string, type: ToastType, duration?: number, extra?: Partial<ToastItem>) => void;
  remove: (id: string) => void;
  update: (id: string, patch: Partial<ToastItem>) => void;
  success: (message: string, duration?: number, extra?: Partial<ToastItem>) => void;
  error: (message: string, duration?: number, extra?: Partial<ToastItem>) => void;
  info: (message: string, duration?: number, extra?: Partial<ToastItem>) => void;
  warning: (message: string, duration?: number, extra?: Partial<ToastItem>) => void;
  trackAdded: (track: { title: string; artworkUrl?: string; action?: () => void }) => void;
  playlistCreated: (playlist: { name: string; artworkUrl?: string; action?: () => void }) => void;
  syncStart: (message: string) => string;
  syncProgress: (id: string, progress: number) => void;
  syncEnd: (id: string) => void;
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  add: (message, type, duration = 4000, extra = {}) => {
    const id = generateId();
    const toast = { id, message, type, duration, ...extra };
    set((state) => ({
      toasts: [...state.toasts, toast],
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
  update: (id, patch) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  success: (message, duration, extra) => get().add(message, 'success', duration, extra),
  error: (message, duration, extra) => get().add(message, 'error', duration, extra),
  info: (message, duration, extra) => get().add(message, 'info', duration, extra),
  warning: (message, duration, extra) => get().add(message, 'warning', duration, extra),

  trackAdded: (track) =>
    get().add(`${track.title} added to queue`, 'success', 4000, {
      variant: 'track-added',
      artworkUrl: track.artworkUrl,
      actionLabel: track.action ? 'View Queue' : undefined,
      action: track.action,
    }),

  playlistCreated: (playlist) =>
    get().add(`Playlist "${playlist.name}" created`, 'success', 6000, {
      variant: 'playlist-created',
      artworkUrl: playlist.artworkUrl,
      actionLabel: playlist.action ? 'View Playlist' : undefined,
      action: playlist.action,
    }),

  syncStart: (message) => {
    const id = generateId();
    const toast: ToastItem = {
      id,
      message,
      type: 'info',
      duration: 0,
      variant: 'sync',
      progress: 0,
    };
    set((state) => ({ toasts: [...state.toasts, toast] }));
    return id;
  },

  syncProgress: (id, progress) => {
    get().update(id, { progress: Math.min(100, Math.max(0, progress)) });
  },

  syncEnd: (id) => {
    get().update(id, { progress: 100 });
    setTimeout(() => get().remove(id), 2000);
  },
}));

export { useToastStore };
export type { ToastStore };
