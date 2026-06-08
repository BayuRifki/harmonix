import { useEffect, useMemo, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, X, RotateCcw } from 'lucide-react';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import {
  SHORTCUT_DEFINITIONS,
  SHORTCUT_CATEGORIES,
  type ShortcutDefinition,
} from '@/hooks/keyboardShortcuts';
import { isEditableTarget } from '@/hooks/useKeyboardShortcuts';

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
    <kbd className="inline-flex items-center justify-center min-w-[1.6rem] px-1.5 py-0.5 text-[10px] font-mono bg-zinc-950 border border-zinc-800 rounded text-zinc-200 shadow-sm">
      {children}
    </kbd>
  );
}

interface RowProps {
  def: ShortcutDefinition;
  enabled: boolean;
  onToggle: () => void;
}

function ShortcutRow({ def, enabled, onToggle }: RowProps): JSX.Element {
  return (
    <li className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-zinc-800/40 group">
      <div className="min-w-0 flex-1">
        <p className={`text-xs ${enabled ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
          {def.label}
        </p>
        <p className="text-[10px] text-zinc-500 truncate">{def.description}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {def.keys.map((k) => (
          <Kbd key={k}>{formatKey(k)}</Kbd>
        ))}
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${def.label}`}
          className={`ml-2 w-8 h-4 rounded-full relative transition-colors ${
            enabled ? 'bg-brand-500/70' : 'bg-zinc-700'
          }`}
        >
          <span
            className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${
              enabled ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>
    </li>
  );
}

export function KeyboardHelpOverlay(): JSX.Element | null {
  const open = useKeyboardSettingsStore((s) => s.helpOpen);
  const close = useKeyboardSettingsStore((s) => s.closeHelp);
  const enabled = useKeyboardSettingsStore((s) => s.enabled);
  const setEnabled = useKeyboardSettingsStore((s) => s.setEnabled);
  const reset = useKeyboardSettingsStore((s) => s.resetDefaults);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  const filteredByCategory = useMemo(() => {
    const q = query.trim().toLowerCase();
    const all = Object.values(SHORTCUT_DEFINITIONS);
    const matched = q
      ? all.filter(
          (d) =>
            d.label.toLowerCase().includes(q) ||
            d.description.toLowerCase().includes(q) ||
            d.keys.some((k) => k.toLowerCase().includes(q)),
        )
      : all;
    const groups: Record<string, ShortcutDefinition[]> = {};
    for (const def of matched) {
      if (!groups[def.category]) groups[def.category] = [];
      groups[def.category]?.push(def);
    }
    return groups;
  }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          data-testid="keyboard-help-overlay"
        >
          <motion.div
            role="dialog"
            aria-label="Keyboard shortcuts"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="w-full max-w-2xl max-h-[85vh] bg-zinc-900/95 border border-zinc-800 rounded-xl shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center justify-between p-4 border-b border-zinc-800">
              <h2 className="text-sm font-semibold text-zinc-100">Keyboard shortcuts</h2>
              <button
                type="button"
                onClick={close}
                aria-label="Close shortcuts"
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 transition-colors"
              >
                <X size={16} />
              </button>
            </header>

            <div className="p-3 border-b border-zinc-800 flex items-center gap-2">
              <div className="relative flex-1">
                <Search
                  size={13}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  aria-hidden
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (isEditableTarget(e.target)) e.stopPropagation();
                  }}
                  placeholder="Search shortcuts..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded pl-8 pr-3 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-1 px-2 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded"
                aria-label="Reset to defaults"
              >
                <RotateCcw size={10} />
                Reset
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-4">
              {SHORTCUT_CATEGORIES.map((cat) => {
                const items = filteredByCategory[cat.id] ?? [];
                if (items.length === 0) return null;
                return (
                  <section key={cat.id}>
                    <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1.5 px-2">
                      {cat.label}
                    </h3>
                    <ul className="space-y-0.5">
                      {items.map((def) => (
                        <ShortcutRow
                          key={def.id}
                          def={def}
                          enabled={enabled[def.id] !== false}
                          onToggle={() => setEnabled(def.id, enabled[def.id] === false)}
                        />
                      ))}
                    </ul>
                  </section>
                );
              })}
              {Object.keys(filteredByCategory).length === 0 && (
                <p className="text-center text-xs text-zinc-500 py-8">
                  No shortcuts match &quot;{query}&quot;
                </p>
              )}
            </div>

            <footer className="p-3 border-t border-zinc-800 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>
                Press <Kbd>?</Kbd> to open this overlay
              </span>
              <span>
                Press <Kbd>Esc</Kbd> to close
              </span>
            </footer>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
