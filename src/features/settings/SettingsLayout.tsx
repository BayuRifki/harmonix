import { SettingsTabs } from './SettingsTabs';

/**
 * Layout route for the Settings page.
 *
 * The page-level header (title + subtitle) is rendered here so it
 * persists across tab switches. Tab navigation is handled by
 * `SettingsTabs` via the URL (`/settings/<tabId>`).
 *
 * The previous iteration of this layout used a `<Outlet />` to
 * render nested child routes, but the wildcard route in `App.tsx`
 * (`path="/settings/*"`) means there are no children to render
 * into an outlet. The `SettingsTabs` component reads the URL
 * itself to determine the active tab and renders the right content
 * in-place.
 */
export function SettingsLayout(): JSX.Element {
  return (
    <div className="h-full p-8 overflow-y-auto" data-testid="settings-layout">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-app">Settings</h1>
        <p className="text-app-muted text-sm mt-1">Configure Harmonix to your liking.</p>
      </header>
      <SettingsTabs />
    </div>
  );
}
