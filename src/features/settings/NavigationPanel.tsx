import { useUiStore, type SidebarLayout } from '@/stores/uiStore';
import { Toggle } from '@/components/ui/Toggle';

function Select<T extends string>({
  label,
  value,
  options: optionsProp,
  onChange,
  description,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  description?: string;
}) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    onChange(e.target.value as T);
  };
  return (
    <div className="mb-3">
      <label className="text-sm text-app font-medium block mb-1.5">{label}</label>
      {description && <p className="text-xs text-app-muted mb-1.5">{description}</p>}
      <select
        value={value}
        onChange={handleChange}
        className="w-full max-w-xs bg-zinc-900/60 border border-zinc-800 rounded px-3 py-1.5 text-sm text-app focus:outline-none focus:border-brand-500/50"
      >
        {optionsProp.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NavigationPanel(): JSX.Element {
  const showBreadcrumbs = useUiStore((s) => s.showBreadcrumbs);
  const setShowBreadcrumbs = useUiStore((s) => s.setShowBreadcrumbs);
  const sidebarLayout = useUiStore((s) => s.sidebarLayout);
  const setSidebarLayout = useUiStore((s) => s.setSidebarLayout);
  const gesturesEnabled = useUiStore((s) => s.gesturesEnabled);
  const setGesturesEnabled = useUiStore((s) => s.setGesturesEnabled);
  const showSnapPoints = useUiStore((s) => s.showSnapPoints);
  const setShowSnapPoints = useUiStore((s) => s.setShowSnapPoints);
  const showScrollIndicators = useUiStore((s) => s.showScrollIndicators);
  const setShowScrollIndicators = useUiStore((s) => s.setShowScrollIndicators);
  const resetNavOrder = useUiStore((s) => s.resetNavOrder);

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3 flex items-center gap-2">
        <span className="text-accent">🧭</span> Navigation
      </h2>
      <p className="text-xs text-app-muted mb-4">Customize how you navigate through the app.</p>

      <Select<SidebarLayout>
        label="Sidebar Layout"
        value={sidebarLayout}
        options={[
          { value: 'default', label: 'Default (standard spacing)' },
          { value: 'compact', label: 'Compact (smaller items, more visible)' },
          { value: 'sectioned', label: 'Sectioned (collapsible groups)' },
        ]}
        onChange={setSidebarLayout}
      />

      <Toggle
        label="Show Breadcrumbs"
        checked={showBreadcrumbs}
        onChange={setShowBreadcrumbs}
        description="Show path breadcrumbs in the top bar (Library › Albums › Artist)"
      />

      <Toggle
        label="Trackpad / Touch Gestures"
        checked={gesturesEnabled}
        onChange={setGesturesEnabled}
        description="Swipe, pinch, double-tap to control playback"
      />

      <Toggle
        label="Snap Points in Carousels"
        checked={showSnapPoints}
        onChange={setShowSnapPoints}
        description="Snap to items when scrolling horizontally"
      />

      <Toggle
        label="Horizontal Scroll Indicators"
        checked={showScrollIndicators}
        onChange={setShowScrollIndicators}
        description="Show left/right arrow buttons in horizontal lists"
      />

      <div className="mb-3">
        <button
          type="button"
          onClick={() => resetNavOrder()}
          className="text-xs text-brand-400 hover:underline focus-ring rounded px-1"
        >
          Reset sidebar nav order
        </button>
      </div>

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
