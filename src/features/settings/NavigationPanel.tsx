import { useState, useEffect } from 'react';

function Toggle({
  label,
  checked,
  onChange,
  description,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div>
        <label className="text-sm text-app font-medium">{label}</label>
        {description && <p className="text-xs text-app-muted mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-150 focus-ring ${
          checked ? 'bg-brand-500' : 'bg-zinc-700'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-150 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

export function NavigationPanel(): JSX.Element {
  const [showBreadcrumbs, setShowBreadcrumbs] = useState(true);
  const [sidebarLayout, setSidebarLayout] = useState<'default' | 'compact' | 'sectioned'>(
    'default',
  );

  useEffect(() => {
    const saved = localStorage.getItem('harmonix.nav');
    if (saved) {
      try {
        const cfg = JSON.parse(saved);
        setShowBreadcrumbs(cfg.showBreadcrumbs ?? true);
        setSidebarLayout(cfg.sidebarLayout ?? 'default');
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const cfg = { showBreadcrumbs, sidebarLayout };
    localStorage.setItem('harmonix.nav', JSON.stringify(cfg));
  }, [showBreadcrumbs, sidebarLayout]);

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3 flex items-center gap-2">
        <span className="text-accent">🧭</span> Navigation
      </h2>
      <p className="text-xs text-app-muted mb-4">Customize how you navigate through the app.</p>

      <div className="mb-4">
        <label className="text-sm text-app font-medium block mb-1.5">Sidebar Layout</label>
        <select
          value={sidebarLayout}
          onChange={(e) => setSidebarLayout(e.target.value as 'default' | 'compact' | 'sectioned')}
          className="w-full max-w-xs bg-zinc-900/60 border border-zinc-800 rounded px-3 py-1.5 text-sm text-app focus:outline-none focus:border-brand-500/50"
        >
          <option value="default">Default (standard spacing)</option>
          <option value="compact">Compact (smaller items, more visible)</option>
          <option value="sectioned">Sectioned (collapsible groups)</option>
        </select>
      </div>

      <Toggle
        label="Show Breadcrumbs"
        checked={showBreadcrumbs}
        onChange={setShowBreadcrumbs}
        description="Show path breadcrumbs in the top bar (Library › Albums › Artist)"
      />

      <div className="mt-4 p-3 bg-zinc-900/40 border border-zinc-800 rounded text-xs text-app-muted">
        <p className="font-medium text-app mb-2">Quick navigation shortcuts:</p>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded">⌘K</kbd>
            <span>Open command palette</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded">?</kbd>
            <span>Show shortcuts help</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded">G</kbd>
            <span>Jump to top of list</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="text-[10px] px-1.5 py-0.5 bg-zinc-800 rounded">Space</kbd>
            <span>Play / pause</span>
          </div>
        </div>
      </div>
    </section>
  );
}
