interface Shortcut {
  keys: string[];
  label: string;
}

const SHORTCUTS: Shortcut[] = [
  { keys: ['Space'], label: 'Play / pause' },
  { keys: ['→'], label: 'Next track' },
  { keys: ['←'], label: 'Previous track (or restart current after 3s)' },
  { keys: ['↑'], label: 'Volume up' },
  { keys: ['↓'], label: 'Volume down' },
  { keys: ['M'], label: 'Mute / unmute' },
];

function Kbd({ children }: { children: string }): JSX.Element {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[1.75rem] px-1.5 py-0.5 text-[11px] font-mono bg-zinc-950 border border-zinc-800 rounded text-zinc-200">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsPanel(): JSX.Element {
  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3">Keyboard Shortcuts</h2>
      <p className="text-xs text-app-muted mb-3">Active everywhere except inside text inputs.</p>
      <ul className="space-y-1.5">
        {SHORTCUTS.map((s) => (
          <li key={s.label} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-app-muted">{s.label}</span>
            <span className="flex items-center gap-1">
              {s.keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
