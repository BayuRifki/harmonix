import { useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Volume2,
  Keyboard,
  Gauge,
  Radio,
  Sparkles,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { useUiStore } from '@/stores/uiStore';
import { ThemePicker } from './ThemePicker';
import { ThemePanel } from './ThemePanel';
import { CrossfadePanel } from './CrossfadePanel';
import { PlayerPanel } from './PlayerPanel';
import { KeyboardShortcutsPanel } from './KeyboardShortcutsPanel';
import { MemoryPanel } from './MemoryPanel';
import { PerformancePanel } from './PerformancePanel';
import { SpotifyLoginButton } from './SpotifyLoginButton';
import { YtMusicStatus } from './YtMusicStatus';
import { SourcePicker } from './SourcePicker';

export type SettingsTabId = 'appearance' | 'audio' | 'shortcuts' | 'performance' | 'sources';

interface TabDef {
  id: SettingsTabId;
  label: string;
  icon: LucideIcon;
  /** Path appended to `/settings/` for routing. */
  path: string;
}

const TABS: TabDef[] = [
  { id: 'appearance', label: 'Appearance', icon: Palette, path: 'appearance' },
  { id: 'audio', label: 'Audio', icon: Volume2, path: 'audio' },
  { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard, path: 'shortcuts' },
  { id: 'performance', label: 'Performance', icon: Gauge, path: 'performance' },
  { id: 'sources', label: 'Sources', icon: Radio, path: 'sources' },
];

const VALID_PATHS = new Set(TABS.map((t) => t.path));

export interface SettingsTabsProps {
  /**
   * Optional override for the active tab. When omitted, the tab is
   * derived from the current URL. Useful for non-routed test
   * harnesses.
   */
  activeTab?: SettingsTabId;
}

export function SettingsTabs({ activeTab }: SettingsTabsProps = {}): JSX.Element {
  const location = useLocation();
  const navigate = useNavigate();
  const lastSegment = location.pathname.split('/').filter(Boolean).pop() ?? '';
  const resolvedTab: SettingsTabId =
    activeTab ?? (VALID_PATHS.has(lastSegment) ? (lastSegment as SettingsTabId) : 'appearance');
  const reducedMotion = useUiStore((s) => s.reducedMotion);

  // If a deep-link hits an unknown sub-path or the bare `/settings`
  // URL, redirect to the first tab. We use a layout-effect-style
  // effect so the navigation happens after render but before paint,
  // avoiding a flash of "no tab selected".
  useEffect(() => {
    if (activeTab) return;
    if (!VALID_PATHS.has(lastSegment)) {
      navigate('/settings/appearance', { replace: true });
    }
  }, [activeTab, lastSegment, navigate]);

  const hintDismissed = useUiStore((s) => s.settingsHintDismissed);
  const anyExpanded = useUiStore((s) => s.isAnySettingsSectionExpanded());
  const showHint = !hintDismissed && !anyExpanded;

  return (
    <div className="space-y-4" data-testid="settings-tabs">
      <nav
        role="tablist"
        aria-label="Settings categories"
        className="flex items-center gap-1 border-b border-app overflow-x-auto"
      >
        {TABS.map((tab, index) => {
          const isActive = resolvedTab === tab.id;
          const Icon = tab.icon;
          const number = String(index + 1).padStart(2, '0');
          return (
            <NavLink
              key={tab.id}
              to={`/settings/${tab.path}`}
              role="tab"
              aria-selected={isActive}
              data-testid={`settings-tab-${tab.id}`}
              className={({ isActive: navActive }): string =>
                [
                  'relative flex items-center gap-2 px-3 py-2.5 text-[12px] font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 rounded-t-md',
                  navActive || isActive
                    ? 'text-app'
                    : 'text-app-muted hover:text-app hover:bg-zinc-800/30',
                ].join(' ')
              }
            >
              <span
                className={`text-[10px] font-mono tabular-nums ${
                  isActive ? 'text-brand-400' : 'text-zinc-600'
                }`}
                aria-hidden
              >
                {number}
              </span>
              <Icon size={14} aria-hidden />
              <span>{tab.label}</span>
              {(isActive || undefined) && (
                <motion.span
                  layoutId="settings-tab-underline"
                  className="absolute left-0 right-0 -bottom-px h-0.5 bg-accent"
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: 'spring', stiffness: 400, damping: 32 }
                  }
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <AnimatePresence initial={false}>
        {/*
         * The "first-time hint" is shown only above the active
         * tab. The hint dismisses itself the first time the user
         * expands any section.
         */}
        {showHint && (
          <motion.div
            key="settings-hint"
            data-testid="settings-hint"
            initial={reducedMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={reducedMotion ? { duration: 0 } : { duration: 0.15 }}
            className="flex items-center gap-2 px-3 py-2 mb-3 text-[11px] text-app-muted bg-zinc-800/30 border border-app rounded-md"
            role="note"
          >
            <Sparkles size={12} className="text-accent" aria-hidden />
            <span>Click a section to expand it.</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/*
       * All 5 tabs are mounted simultaneously so that section
       * collapse/expand state survives a tab switch. Inactive
       * tabs are kept in the DOM with `hidden` (display:none),
       * which means their React subtrees stay alive but consume
       * no paint cost. This is the strategy the design review
       * chose explicitly over "unmount inactive" so that
       * user-collapsed sections stay collapsed when the user
       * navigates away and back.
       */}
      <div
        role="tabpanel"
        aria-labelledby="settings-tab-appearance"
        hidden={resolvedTab !== 'appearance'}
      >
        <div data-testid="settings-tab-content-appearance">
          <AppearanceTab />
        </div>
      </div>
      <div role="tabpanel" aria-labelledby={`settings-tab-audio`} hidden={resolvedTab !== 'audio'}>
        <div data-testid="settings-tab-content-audio">
          <AudioTab />
        </div>
      </div>
      <div
        role="tabpanel"
        aria-labelledby={`settings-tab-shortcuts`}
        hidden={resolvedTab !== 'shortcuts'}
      >
        <div data-testid="settings-tab-content-shortcuts">
          <ShortcutsTab />
        </div>
      </div>
      <div
        role="tabpanel"
        aria-labelledby={`settings-tab-performance`}
        hidden={resolvedTab !== 'performance'}
      >
        <div data-testid="settings-tab-content-performance">
          <PerformanceTab />
        </div>
      </div>
      <div
        role="tabpanel"
        aria-labelledby={`settings-tab-sources`}
        hidden={resolvedTab !== 'sources'}
      >
        <div data-testid="settings-tab-content-sources">
          <SourcesTab />
        </div>
      </div>
    </div>
  );
}

// --- Per-tab content (one component per tab for clarity + tests) ---

function AppearanceTab(): JSX.Element {
  return (
    <>
      <SettingsSection
        id="appearance:theme-picker"
        title="Theme"
        description="Choose your accent and intensity."
        badge={
          <span className="text-[10px] uppercase tracking-wider text-app-muted px-1.5 py-0.5 bg-zinc-800/60 rounded">
            <Info size={9} className="inline mr-0.5 -mt-px" aria-hidden /> Basic
          </span>
        }
      >
        <ThemePicker />
      </SettingsSection>
      <SettingsSection
        id="appearance:theme-panel"
        title="Theme & Accent"
        description="Detailed theme controls and accent overrides."
      >
        <ThemePanel />
      </SettingsSection>
    </>
  );
}

function AudioTab(): JSX.Element {
  return (
    <>
      <SettingsSection
        id="audio:crossfade"
        title="Crossfade"
        description="Overlap between consecutive tracks."
      >
        <CrossfadePanel />
      </SettingsSection>
      <SettingsSection
        id="audio:player"
        title="Player"
        description="Mini player, visualizer, and playback-related UI."
      >
        <PlayerPanel />
      </SettingsSection>
    </>
  );
}

function ShortcutsTab(): JSX.Element {
  return (
    <SettingsSection
      id="shortcuts:keyboard"
      title="Keyboard Shortcuts"
      description="View, edit, and toggle shortcuts."
    >
      <KeyboardShortcutsPanel />
    </SettingsSection>
  );
}

function PerformanceTab(): JSX.Element {
  return (
    <>
      <SettingsSection
        id="performance:memory"
        title="Memory"
        description="Heap, RSS, and source cache statistics."
      >
        <MemoryPanel />
      </SettingsSection>
      <SettingsSection
        id="performance:performance"
        title="Performance"
        description="Visualizer quality, animations, and glass intensity."
      >
        <PerformancePanel />
      </SettingsSection>
    </>
  );
}

function SourcesTab(): JSX.Element {
  return (
    <>
      <SettingsSection
        id="sources:spotify"
        title="Spotify"
        description="Sign in to access your playlists and library."
      >
        <SpotifyLoginButton />
      </SettingsSection>
      <SettingsSection
        id="sources:ytmusic"
        title="YouTube Music"
        description="Disclaimer acknowledgement and yt-dlp status."
      >
        <YtMusicStatus />
      </SettingsSection>
      <SettingsSection
        id="sources:source-picker"
        title="Music Sources"
        description="Enable, disable, and configure enabled sources."
      >
        <SourcePicker />
      </SettingsSection>
    </>
  );
}
