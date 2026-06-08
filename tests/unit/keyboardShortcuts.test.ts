import { describe, it, expect } from 'vitest';
import { SHORTCUT_DEFINITIONS, SHORTCUT_IDS, SHORTCUT_CATEGORIES } from '@/hooks/keyboardShortcuts';

describe('keyboardShortcuts module', () => {
  it('defines a shortcut for every id in SHORTCUT_IDS', () => {
    for (const id of SHORTCUT_IDS) {
      expect(SHORTCUT_DEFINITIONS[id]).toBeDefined();
      expect(SHORTCUT_DEFINITIONS[id].id).toBe(id);
    }
  });

  it('every shortcut has a category, keys, label, and description', () => {
    for (const def of Object.values(SHORTCUT_DEFINITIONS)) {
      expect(def.category).toBeTruthy();
      expect(Array.isArray(def.keys)).toBe(true);
      expect(def.keys.length).toBeGreaterThan(0);
      expect(def.label).toBeTruthy();
      expect(def.description).toBeTruthy();
    }
  });

  it('categories are unique and non-empty', () => {
    const seen = new Set<string>();
    for (const c of SHORTCUT_CATEGORIES) {
      expect(seen.has(c.id)).toBe(false);
      seen.add(c.id);
    }
  });

  it('each shortcut category contains at least one shortcut', () => {
    for (const c of SHORTCUT_CATEGORIES) {
      const items = Object.values(SHORTCUT_DEFINITIONS).filter((d) => d.category === c.id);
      expect(items.length).toBeGreaterThan(0);
    }
  });

  it('exposes expected core shortcuts', () => {
    expect(SHORTCUT_DEFINITIONS.play_pause.keys).toContain('Space');
    expect(SHORTCUT_DEFINITIONS.mute_toggle.keys).toContain('M');
    expect(SHORTCUT_DEFINITIONS.command_palette.keys).toContain('Mod');
    expect(SHORTCUT_DEFINITIONS.help_overlay.keys).toContain('?');
  });
});
