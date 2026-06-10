import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { SHORTCUT_IDS, type ShortcutId, SHORTCUT_DEFINITIONS } from '@/hooks/keyboardShortcuts';

const STORAGE_KEY = 'harmonix.keyboard';

type ShortcutMap = Record<ShortcutId, boolean>;
type CustomKeysMap = Record<ShortcutId, string[]>;

const defaultEnabled: ShortcutMap = SHORTCUT_IDS.reduce((acc, id) => {
  acc[id] = true;
  return acc;
}, {} as ShortcutMap);

const defaultCustomKeys: CustomKeysMap = SHORTCUT_IDS.reduce((acc, id) => {
  acc[id] = SHORTCUT_DEFINITIONS[id].defaultKeys;
  return acc;
}, {} as CustomKeysMap);

interface KeyboardSettingsState {
  enabled: ShortcutMap;
  customKeys: CustomKeysMap;
  helpOpen: boolean;

  isEnabled: (id: ShortcutId) => boolean;
  toggle: (id: ShortcutId) => void;
  setEnabled: (id: ShortcutId, value: boolean) => void;
  getKeys: (id: ShortcutId) => string[];
  setKeys: (id: ShortcutId, keys: string[]) => void;
  resetKeys: (id: ShortcutId) => void;
  resetDefaults: () => void;
  openHelp: () => void;
  closeHelp: () => void;
  toggleHelp: () => void;
}

export const useKeyboardSettingsStore = create<KeyboardSettingsState>()(
  persist(
    (set, get) => ({
      enabled: { ...defaultEnabled },
      customKeys: { ...defaultCustomKeys },
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

      getKeys: (id) => get().customKeys[id] ?? SHORTCUT_DEFINITIONS[id].defaultKeys,

      setKeys: (id, keys) => {
        const normalized = keys.filter((k) => k.length > 0);
        if (normalized.length === 0) return;
        set((s) => ({
          customKeys: { ...s.customKeys, [id]: normalized },
        }));
      },

      resetKeys: (id) => {
        set((s) => ({
          customKeys: { ...s.customKeys, [id]: SHORTCUT_DEFINITIONS[id].defaultKeys },
        }));
      },

      resetDefaults: () => {
        set({ enabled: { ...defaultEnabled }, customKeys: { ...defaultCustomKeys } });
      },

      openHelp: () => set({ helpOpen: true }),
      closeHelp: () => set({ helpOpen: false }),
      toggleHelp: () => set((s) => ({ helpOpen: !s.helpOpen })),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ enabled: s.enabled, customKeys: s.customKeys }),
      version: 2,
    },
  ),
);

export const KEYBOARD_SHORTCUT_DEFAULTS = defaultEnabled;
export const KEYBOARD_KEY_DEFAULTS = defaultCustomKeys;
