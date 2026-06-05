import { create } from 'zustand';
import type { AuthStatus, SpotifyLoginResult } from '@/types/global';

interface AuthState {
  spotify: AuthStatus | null;
  loading: boolean;
  error: string | null;

  refreshSpotify: () => Promise<void>;
  loginSpotify: () => Promise<SpotifyLoginResult>;
  logoutSpotify: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  spotify: null,
  loading: false,
  error: null,

  refreshSpotify: async () => {
    try {
      const status = await window.api.auth.spotifyStatus();
      set({ spotify: status });
    } catch (err) {
      console.error('[auth] refreshSpotify failed:', err);
    }
  },

  loginSpotify: async () => {
    set({ loading: true, error: null });
    try {
      const result = await window.api.auth.spotifyLogin();
      if (result.ok) {
        const status = await window.api.auth.spotifyStatus();
        set({ spotify: status, loading: false });
        return result;
      }
      set({ error: result.error ?? 'Login failed', loading: false });
      return result;
    } catch (err) {
      const error = (err as Error).message;
      set({ error, loading: false });
      return { ok: false, error };
    }
  },

  logoutSpotify: async () => {
    set({ loading: true });
    try {
      await window.api.auth.spotifyLogout();
      const status = await window.api.auth.spotifyStatus();
      set({ spotify: status, loading: false });
    } catch (err) {
      set({ error: (err as Error).message, loading: false });
    }
  },
}));
