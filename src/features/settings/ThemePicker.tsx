import { useThemeStore } from '@/stores/themeStore';

const OPTIONS: Array<{ value: 'dark' | 'light' | 'system'; label: string; icon: string }> = [
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'system', label: 'System', icon: '🖥️' },
];

export function ThemePicker(): JSX.Element {
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  return (
    <div className="flex gap-2">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => setTheme(opt.value)}
          className={`px-3 py-1.5 text-sm rounded border transition ${
            theme === opt.value
              ? 'border-accent text-accent bg-surface-hover'
              : 'border-app text-app-muted hover:border-app-strong hover:text-app'
          }`}
          style={theme === opt.value ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
          aria-pressed={theme === opt.value}
        >
          <span aria-hidden className="mr-1">
            {opt.icon}
          </span>
          {opt.label}
        </button>
      ))}
    </div>
  );
}
