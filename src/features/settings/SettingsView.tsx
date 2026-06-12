import { SettingsLayout } from './SettingsLayout';

/**
 * Backward-compatible entry point for the Settings page.
 *
 * The old `SettingsView` was a single flat list of 12+ panels
 * stacked vertically, which overflowed the viewport on most
 * displays and left a large blank "below the fold" area. The new
 * layout splits those panels into 5 tabs (Appearance / Audio /
 * Shortcuts / Performance / Sources) and lets the user collapse
 * each section individually.
 *
 * Routing: `/settings/*` → `SettingsView` → `SettingsLayout` →
 * `SettingsTabs`. The default tab is `appearance`; deep links to
 * `/settings/audio`, `/settings/sources`, etc. are handled by
 * `SettingsTabs`'s internal redirect-on-unknown-path logic.
 *
 * The "About" section that used to be a top-level panel is now
 * a small footer below the tabs (it was just two external links
 * and didn't deserve its own tab). See `AboutFooter` below.
 */
export function SettingsView(): JSX.Element {
  return (
    <>
      <SettingsLayout />
      <AboutFooter />
    </>
  );
}

function AboutFooter(): JSX.Element {
  return (
    <footer
      data-testid="settings-about-footer"
      className="mt-8 pt-4 border-t border-app text-[11px] text-app-muted"
    >
      <p>
        See{' '}
        <a
          href="https://github.com/BayuRifki/harmonix/blob/main/docs/LEGAL.md"
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          docs/LEGAL.md
        </a>{' '}
        for disclaimers regarding unofficial integrations.
      </p>
      <p className="mt-1">
        See{' '}
        <a
          href="https://github.com/BayuRifki/harmonix/blob/main/docs/SOURCES.md"
          className="text-accent hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          docs/SOURCES.md
        </a>{' '}
        to learn how to add a new music source.
      </p>
    </footer>
  );
}
