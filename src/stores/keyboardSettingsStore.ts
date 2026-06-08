import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SHORTCUT_IDS, type ShortcutId } from '@/hooks/keyboardShortcuts';

const STORAGE_KEY = 'harmonix.keyboard';

type ShortcutMap = Record<ShortcutId, boolean>;

const defaultEnabled: ShortcutMap = SHORTCUT_IDS.reduce((acc, id) => {
  acc[id] = true;
  return acc;
}, {} as ShortcutMap);

interface KeyboardSettingsState {
  enabled: ShortcutMap;
  helpOpen: boolean;
  isEnabled: (id: ShortcutId) => boolean;
  toggle: (id: ShortcutId) => void;
  setEnabled: (id: ShortcutId, value: boolean) => void;
  resetDefaults: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

export const useKeyboardSettingsStore = create<KeyboardSettingsState>()(
  persist(
    (set, get) => ({
      enabled: { ...defaultEnabled },
      helpOpen: false,

      isEnabled: (id) => get().enabled[id] !== false,

      toggle: (id) => {
        set((s) => ({
          enabled: { ...s.enabled, [id]: !(s.enabled[id] !== false) },
        }));
      },

      setEnabled: (id, value) => {
        set((s) => ({
          enabled: { ...s.enabled, [id]: value },
        }));
      },

      resetDefaults: () => {
        set({ enabled: { ...defaultEnabled } });
      },

      openHelp: () => set({ helpOpen: true }),
      closeHelp: () => set({ helpOpen: false }),
      toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled }),
      version: 1,
    },
  ),
);

export const KEYBOARD_SHORTCUT_DEFAULTS = defaultEnabled;
