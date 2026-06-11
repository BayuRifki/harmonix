import { SHORTCUT_DEFINITIONS, SHORTCUT_CATEGORIES } from '@/hooks/keyboardShortcuts';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { useToastStore } from '@/components/ui/toastStore';
import { useState, useRef } from 'react';
import { X, RotateCcw, Keyboard } from 'lucide-react';

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.5rem] h-5 px-1.5 text-[10px] font-mono bg-zinc-900 border border-zinc-700 rounded text-zinc-300">
      {children}
    </kbd>
  );
}

const MOD_LABEL =
  typeof navigator !== 'undefined' && /Mac/i.test(navigator.userAgent) ? '\u2318' : 'Ctrl';

function formatKey(key: string): string {
  if (key === 'Mod') return MOD_LABEL;
  if (key === 'Shift') return '\u21E7';
  if (key === 'Alt') return '\u2325';
  return key;
}

function ShortcutEditor({
  def,
  enabled,
  onToggle,
  onEdit,
  isEditing,
  onSave,
  onCancel,
}: {
  def: (typeof SHORTCUT_DEFINITIONS)[keyof typeof SHORTCUT_DEFINITIONS];
  enabled: boolean;
  onToggle: () => void;
  onEdit: () => void;
  isEditing: boolean;
  onSave: (keys: string[]) => void;
  onCancel: () => void;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState('');

  const keys = useKeyboardSettingsStore((s) => s.getKeys(def.id));
  const resetKeys = useKeyboardSettingsStore((s) => s.resetKeys);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    e.preventDefault();
    e.stopPropagation();

    if (e.key === 'Escape') {
      onCancel();
      return;
    }
    if (e.key === 'Enter') {
      const parts = inputValue
        .split('+')
        .map((p) => p.trim())
        .filter(Boolean);
      if (parts.length > 0) {
        onSave(parts);
      }
      return;
    }

    const parts: string[] = [];
    if (e.metaKey || e.ctrlKey) parts.push('Mod');
    if (e.shiftKey && e.key !== 'Shift') parts.push('Shift');
    if (e.altKey && e.key !== 'Alt') parts.push('Alt');

    if (e.key === 'Control' || e.key === 'Meta' || e.key === 'Shift' || e.key === 'Alt') {
      return;
    }

    parts.push(e.key);
    setInputValue(parts.join(' + '));
  };

  const handleFocus = (): void => {
    if (!isEditing) return;
    const current = keys.join(' + ');
    setInputValue(current);
    setTimeout(() => inputRef.current?.select(), 0);
  };

  if (!isEditing) {
    return (
      <li
        key={def.id}
        className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-zinc-800/40 group transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className={`text-xs font-medium ${enabled ? 'text-zinc-200' : 'text-zinc-500'}`}>
            {def.label}
          </p>
          <p className="text-[10px] text-zinc-500 truncate mt-0.5">{def.description}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1">
            {keys.map((k) => (
              <Kbd key={k}>{formatKey(k)}</Kbd>
            ))}
          </div>

          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              onClick={onEdit}
              className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
              aria-label={`Edit shortcut for ${def.label}`}
              title="Edit shortcut"
            >
              <Keyboard size={12} />
            </button>
            {!enabled && (
              <button
                type="button"
                onClick={() => resetKeys(def.id)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
                aria-label={`Reset ${def.label} to default`}
                title="Reset to default"
              >
                <RotateCcw size={10} />
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={onToggle}
            aria-pressed={enabled}
            aria-label={`${enabled ? 'Disable' : 'Enable'} ${def.label}`}
            className={`relative w-7 h-4 rounded-full transition-colors ${
              enabled ? 'bg-brand-500' : 'bg-zinc-700'
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-3 h-3 rounded-full bg-white shadow-sm transition-transform ${
                enabled ? 'translate-x-3' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </li>
    );
  }

  return (
    <li
      key={def.id}
      className="flex items-center gap-3 px-3 py-2 rounded-md bg-brand-500/10 ring-1 ring-brand-500/30"
    >
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-zinc-200">{def.label}</p>
        <p className="text-[10px] text-zinc-500 truncate mt-0.5">{def.description}</p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={onCancel}
          placeholder="Press keys..."
          className="w-44 bg-zinc-950 border border-brand-500/50 rounded px-2 py-1 text-[11px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500"
          aria-label="Enter shortcut keys"
        />
        <button
          type="button"
          onClick={() =>
            onSave(
              inputValue
                .split('+')
                .map((p) => p.trim())
                .filter(Boolean),
            )
          }
          className="px-2 py-1 text-[10px] font-medium text-brand-400 hover:text-brand-300 bg-brand-500/10 rounded transition-colors"
          aria-label="Save shortcut"
        >
          Save
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
          aria-label="Cancel editing"
        >
          <X size={12} />
        </button>
        <button
          type="button"
          onClick={() => {
            resetKeys(def.id);
            onCancel();
          }}
          className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-700/50 transition-colors"
          aria-label="Reset to default"
        >
          <RotateCcw size={12} />
        </button>
      </div>
    </li>
  );
}

export function KeyboardShortcutsPanel(): JSX.Element {
  const openHelp = useKeyboardSettingsStore((s) => s.openHelp);
  const enabledMap = useKeyboardSettingsStore((s) => s.enabled);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <div className="flex items-center justify-between mb-1">
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
      <p className="text-[11px] text-app-muted mb-4">
        Active everywhere except inside text inputs. Press <Kbd>?</Kbd> to open the help overlay.
      </p>
      <div className="space-y-4">
        {SHORTCUT_CATEGORIES.map((cat) => {
          const items = Object.values(SHORTCUT_DEFINITIONS).filter((d) => d.category === cat.id);
          if (items.length === 0) return null;
          return (
            <div key={cat.id}>
              <h3 className="text-[10px] uppercase tracking-wider text-zinc-500 font-semibold mb-1 px-3">
                {cat.label}
              </h3>
              <ul className="space-y-0.5">
                {items.map((def) => {
                  const enabled = enabledMap[def.id] !== false;
                  return (
                    <ShortcutEditor
                      key={def.id}
                      def={def}
                      enabled={enabled}
                      onToggle={() => useKeyboardSettingsStore.getState().toggle(def.id)}
                      onEdit={() => setEditingId(def.id)}
                      isEditing={editingId === def.id}
                      onSave={(keys) => {
                        useKeyboardSettingsStore.getState().setKeys(def.id, keys);
                        setEditingId(null);
                      }}
                      onCancel={() => setEditingId(null)}
                    />
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
      <div className="mt-4 pt-3 border-t border-zinc-800">
        <button
          type="button"
          onClick={() => {
            useKeyboardSettingsStore.getState().resetDefaults();
            useToastStore.getState().success('Keyboard shortcuts reset to defaults');
          }}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded-md transition-colors hover:bg-zinc-800/50"
        >
          <RotateCcw size={11} />
          Reset all to defaults
        </button>
      </div>
    </section>
  );
}
