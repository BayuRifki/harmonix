import { useEffect, useState } from 'react';
import { useUiStore, type ThemeAccentMode, type GlassIntensity } from '@/stores/uiStore';
import { useThemeStore, type Theme } from '@/stores/themeStore';
import { extractDominantColor, hslToString, type HslColor } from '@/lib/colorExtractor';

function hexToHsl(hex: string): HslColor | null {
  const m = hex.replace('#', '').match(/^([0-9a-fA-F]{6})$/);
  if (!m) return null;
  const num = parseInt(m[1] ?? '000000', 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === rn) h = (gn - bn) / d + (gn < bn ? 6 : 0);
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function applyHexAccent(hex: string): void {
  if (typeof document === 'undefined') return;
  const hsl = hexToHsl(hex);
  if (!hsl) return;
  const root = document.documentElement;
  root.style.setProperty('--accent', hslToString(hsl));
  root.style.setProperty('--accent-hover', hslToString({ ...hsl, l: Math.max(30, hsl.l - 6) }));
  root.style.setProperty(
    '--accent-vibrant',
    hslToString({ ...hsl, s: Math.min(95, hsl.s + 5), l: Math.min(60, hsl.l - 4) }),
  );
  root.style.setProperty(
    '--accent-muted',
    hslToString({ ...hsl, s: Math.min(40, hsl.s * 0.4), l: Math.min(28, hsl.l * 0.4) }),
  );
}

function clearAccentOverride(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  for (const k of ['--accent', '--accent-hover', '--accent-vibrant', '--accent-muted']) {
    root.style.removeProperty(k);
  }
}

function applyGlassIntensity(level: GlassIntensity): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.dataset.glass = level;
}

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

export function ThemePanel(): JSX.Element {
  const themeAccentMode = useUiStore((s) => s.themeAccentMode);
  const setThemeAccentMode = useUiStore((s) => s.setThemeAccentMode);
  const customAccentHex = useUiStore((s) => s.customAccentHex);
  const setCustomAccentHex = useUiStore((s) => s.setCustomAccentHex);
  const glassIntensity = useUiStore((s) => s.glassIntensity);
  const setGlassIntensity = useUiStore((s) => s.setGlassIntensity);
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);
  const [previewHsl, setPreviewHsl] = useState<HslColor | null>(null);

  useEffect(() => {
    if (themeAccentMode === 'custom') {
      applyHexAccent(customAccentHex);
    } else if (themeAccentMode === 'brand') {
      applyHexAccent('#EC4899');
    } else {
      clearAccentOverride();
    }
  }, [themeAccentMode, customAccentHex]);

  useEffect(() => {
    applyGlassIntensity(glassIntensity);
  }, [glassIntensity]);

  useEffect(() => {
    if (previewHsl) return;
    const url =
      typeof document !== 'undefined'
        ? document.documentElement.style.getPropertyValue('--accent')
        : '';
    if (url) {
      const m = url.match(/hsl\(\s*(\d+)\s*,\s*(\d+)%\s*,\s*(\d+)%\s*\)/);
      if (m) {
        setPreviewHsl({ h: Number(m[1]), s: Number(m[2]), l: Number(m[3]) });
      }
    }
  }, [previewHsl]);

  useEffect(() => {
    if (themeAccentMode !== 'auto') return;
    if (typeof document === 'undefined') return;
    const track = window.api?.player;
    if (!track) return;
    let mounted = true;
    const off = track.onStateChanged((s) => {
      if (!mounted) return;
      const art = (s as { artworkUrl?: string | null }).artworkUrl;
      if (art) {
        void extractDominantColor(art).then((c) => {
          if (!mounted || !c) return;
          const root = document.documentElement;
          root.style.setProperty('--accent', hslToString(c));
        });
      }
    });
    return () => {
      mounted = false;
      off?.();
    };
  }, [themeAccentMode]);

  return (
    <section className="bg-surface border border-app rounded-lg p-4">
      <h2 className="text-sm font-semibold text-app mb-3 flex items-center gap-2">
        <span className="text-accent">🎨</span> Theme
      </h2>
      <p className="text-xs text-app-muted mb-4">Customize the accent color and glass effects.</p>

      <Select<Theme>
        label="Theme"
        value={theme}
        options={[
          { value: 'dark', label: 'Dark' },
          { value: 'light', label: 'Light' },
          { value: 'system', label: 'System' },
        ]}
        onChange={setTheme}
        description="Choose dark, light, or follow system preference"
      />

      <Select<ThemeAccentMode>
        label="Accent Color"
        value={themeAccentMode}
        options={[
          { value: 'auto', label: 'Auto (from current artwork)' },
          { value: 'brand', label: 'Brand pink (#EC4899)' },
          { value: 'custom', label: 'Custom color' },
        ]}
        onChange={setThemeAccentMode}
        description="Auto extracts the dominant color from the current track artwork"
      />

      {themeAccentMode === 'custom' && (
        <div className="mb-3">
          <label
            htmlFor="custom-accent-picker"
            className="text-sm text-app font-medium block mb-1.5"
          >
            Custom accent
          </label>
          <div className="flex items-center gap-2">
            <input
              id="custom-accent-picker"
              type="color"
              value={customAccentHex}
              onChange={(e) => setCustomAccentHex(e.target.value)}
              className="w-12 h-9 rounded border border-zinc-800 bg-zinc-900/60 cursor-pointer"
              data-testid="custom-accent-picker"
            />
            <input
              id="custom-accent-input"
              type="text"
              value={customAccentHex}
              onChange={(e) => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{6}$/.test(val) || val === '') {
                  setCustomAccentHex(val);
                }
              }}
              onBlur={() => {
                if (!/^#[0-9A-Fa-f]{6}$/.test(customAccentHex)) {
                  setCustomAccentHex('#EC4899');
                }
              }}
              className="w-24 bg-zinc-900/60 border border-zinc-800 rounded px-2 py-1 text-sm text-app font-mono"
              pattern="^#[0-9A-Fa-f]{6}$"
              data-testid="custom-accent-input"
              aria-label="Custom accent color hex"
            />
            <span
              className="w-9 h-9 rounded border border-zinc-800"
              style={{ background: customAccentHex }}
              aria-label="Preview"
            />
          </div>
        </div>
      )}

      <Select<GlassIntensity>
        label="Glass Intensity"
        value={glassIntensity}
        options={[
          { value: 'off', label: 'Off (no blur)' },
          { value: 'subtle', label: 'Subtle (8px blur)' },
          { value: 'strong', label: 'Strong (16-28px blur)' },
        ]}
        onChange={setGlassIntensity}
        description="Backdrop blur applied to Sidebar, TopBar, PlayerBar"
      />

      {previewHsl && (
        <p className="text-[10px] text-zinc-600 mt-2">
          Current --accent: hsl({Math.round(previewHsl.h)}, {Math.round(previewHsl.s)}%,{' '}
          {Math.round(previewHsl.l)}%)
        </p>
      )}
    </section>
  );
}
