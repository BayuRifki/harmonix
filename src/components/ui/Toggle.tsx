export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  description?: string;
}

export function Toggle({ label, checked, onChange, description }: ToggleProps): JSX.Element {
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
