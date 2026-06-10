import { SourcePicker } from '@/features/settings/SourcePicker';
import { SpotifyLoginButton } from '@/features/settings/SpotifyLoginButton';
import { YtMusicStatus } from '@/features/settings/YtMusicStatus';
import { ThemePicker } from '@/features/settings/ThemePicker';
import { ThemePanel } from '@/features/settings/ThemePanel';
import { MemoryPanel } from '@/features/settings/MemoryPanel';
import { KeyboardShortcutsPanel } from '@/features/settings/KeyboardShortcutsPanel';
import { CrossfadePanel } from '@/features/settings/CrossfadePanel';
import { PerformancePanel } from '@/features/settings/PerformancePanel';
import { NavigationPanel } from '@/features/settings/NavigationPanel';
import { PlayerPanel } from '@/features/settings/PlayerPanel';

export function SettingsView(): JSX.Element {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-app mb-2">Settings</h1>
      <p className="text-app-muted mb-6">Configure Harmonix to your liking.</p>

      <div className="space-y-4 max-w-2xl">
        <section className="bg-surface border border-app rounded-lg p-4">
          <h2 className="text-sm font-semibold text-app mb-3">Appearance</h2>
          <ThemePicker />
        </section>

        <ThemePanel />
        <CrossfadePanel />
        <KeyboardShortcutsPanel />
        <MemoryPanel />
        <PerformancePanel />
        <NavigationPanel />
        <PlayerPanel />

        <SpotifyLoginButton />
        <YtMusicStatus />
        <SourcePicker />

        <section className="bg-surface border border-app rounded-lg p-4">
          <h2 className="text-sm font-semibold text-app mb-3">About</h2>
          <p className="text-sm text-app-muted">
            See{' '}
            <a
              href="https://github.com/BayuRifki/harmonix/blob/main/docs/LEGAL.md"
              className="text-accent hover:underline"
            >
              docs/LEGAL.md
            </a>{' '}
            for disclaimers regarding unofficial integrations.
          </p>
          <p className="text-sm text-app-muted mt-2">
            See{' '}
            <a
              href="https://github.com/BayuRifki/harmonix/blob/main/docs/SOURCES.md"
              className="text-accent hover:underline"
            >
              docs/SOURCES.md
            </a>{' '}
            to learn how to add a new music source.
          </p>
        </section>
      </div>
    </div>
  );
}
