import { SHORTCUT_DEFINITIONS, SHORTCUT_CATEGORIES } from '@/hooks/keyboardShortcuts';
import { useKeyboardSettingsStore } from '@/stores/keyboardSettingsStore';
import { useState, useRef } from 'react';
import { X, RotateCcw, Keyboard } from 'lucide-react';

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded text-zinc-200">
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
  def: typeof SHORTCUT_DEFINITIONS[keyof typeof SHORTCUT_DEFINITIONS];
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
      // Parse the input into keys
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

    // Don't add modifier-only keys as the main key
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
    // Select all text for easy replacement
    setTimeout(() => inputRef.current?.select(), 0);
  };

  if (!isEditing) {
    return (
      <li key={def.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded hover:bg-zinc-800/40 group">
        <div className="min-w-0 flex-1">
          <p className={`text-xs ${enabled ? 'text-zinc-200' : 'text-zinc-500 line-through'}`}>
            {def.label}
          </p>
          <p className="text-[10px] text-zinc-500 truncate">{def.description}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="flex items-center gap-1">
            {keys.map((k) => (
              <Kbd key={k}>{formatKey(k)}</Kbd>
            ))}
          </div>
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
          <button
            type="button"
            onClick={onEdit}
            className="ml-1 p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
            aria-label={`Edit shortcut for ${def.label}`}
            title="Edit shortcut"
          >
            <Keyboard size={12} />
          </button>
          {!enabled && (
            <button
              type="button"
              onClick={() => resetKeys(def.id)}
              className="ml-1 p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label={`Reset ${def.label} to default`}
              title="Reset to default"
            >
              <RotateCcw size={10} />
            </button>
          )}
        </div>
      </li>
    );
  }

  return (
    <li key={def.id} className="flex items-center justify-between gap-3 px-2 py-1.5 rounded bg-brand-500/10 ring-1 ring-brand-500/30">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-zinc-200">{def.label}</p>
        <p className="text-[10px] text-zinc-500 truncate">{def.description}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={onCancel}
          placeholder="Press keys..."
          className="w-48 max-w-[200px] bg-zinc-950 border border-brand-500/50 rounded px-2 py-1 text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-brand-500"
          aria-label="Enter shortcut keys"
        />
        <button
          type="button"
          onClick={() => onSave(inputValue.split('+').map((p) => p.trim()).filter(Boolean))}
          className="p-1 text-brand-400 hover:text-brand-300"
          aria-label="Save shortcut"
        >
          <Kbd>Save</Kbd>
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="p-1 text-zinc-500 hover:text-zinc-200"
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
          className="p-1 text-zinc-500 hover:text-zinc-200"
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
          onClick={() => useKeyboardSettingsStore.getState().resetDefaults()}
          className="inline-flex items-center gap-1.5 px-2 py-1.5 text-[11px] text-zinc-400 hover:text-zinc-200 border border-zinc-800 rounded transition-colors"
        >
          <RotateCcw size={12} />
          Reset all to defaults
        </button>
      </div>
    </section>
  );
}