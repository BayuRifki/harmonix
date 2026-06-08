import { SHORTCUT_DEFINITIONS, SHORTCUT_CATEGORIES } from '@/hooks/keyboardShortcuts';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';

const MOD_LABEL =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent) ? '\u2318' : 'Ctrl';

function formatKey(key: string): string {
  if (key === 'Mod') return MOD_LABEL;
  if (key === 'Shift') return '\u21E7';
  if (key === 'Alt') return '\u2325';
  return key;
}

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded text-zinc-200">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsPanel(): JSX.Element {
  const openHelp = useKeyboardSettingsStore((s) => s.openHelp);

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-app">Keyboard Shortcuts</h2>
        <button
          type="button"
          onClick={openHelp}
          className="text-[11px] text-accent hover:underline"
          data-testid="open-help-overlay"
        >
          View all
        </button>
      </div>
      <p className="text-xs text-app-muted mb-3">
        Active everywhere except inside text inputs. Press <Kbd>?</Kbd> to open the help overlay.
      </p>
      <div className="space-y-3">
        {SHORTCUT_CATEGORIES.map((cat) => {
          const items = Object.values(SHORTCUT_DEFINITIONS).filter((d) => d.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5">
                {cat.label}
              </h3>
              <ul className="space-y-1">
                {items.map((def) => (
                  <li key={def.id} className="flex items-center justify-between gap-3 text-xs">
                    <span className="text-app-muted">{def.label}</span>
                    <span className="flex items-center gap-1 shrink-0">
                      {def.keys.map((k) => (
                        <Kbd key={k}>{formatKey(k)}</Kbd>
                      ))}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
