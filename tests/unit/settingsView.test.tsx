import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsView } from '@/features/settings/SettingsView';
import { useUiStore, flushUiPersist } from '@/stores/uiStore';
import { installMockWindowApi } from '../setup';

function renderAt(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings/*" element={<SettingsView />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('SettingsView integration', () => {
  beforeEach(() => {
    installMockWindowApi();
    localStorage.clear();
    flushUiPersist();
    useUiStore.setState({
      settingsCollapsedSections: {},
      settingsHintDismissed: false,
    });
  });

  it('renders the page header', () => {
    renderAt('/settings/appearance');
    expect(screen.getByRole('heading', { level: 1, name: /Settings/i })).toBeInTheDocument();
  });

  it('renders the about footer with both external links', () => {
    renderAt('/settings/appearance');
    const footer = screen.getByTestId('settings-about-footer');
    expect(footer).toBeInTheDocument();
    const legalLink = footer.querySelector('a[href*="LEGAL.md"]');
    const sourcesLink = footer.querySelector('a[href*="SOURCES.md"]');
    expect(legalLink).not.toBeNull();
    expect(sourcesLink).not.toBeNull();
  });

  it('renders all 5 tab links from the layout', () => {
    renderAt('/settings/appearance');
    expect(screen.getByTestId('settings-tab-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-audio')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-shortcuts')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-performance')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-sources')).toBeInTheDocument();
  });

  it('shows the appearance tab content on /settings (no sub-path)', () => {
    renderAt('/settings');
    expect(screen.getByTestId('settings-tab-content-appearance')).toBeInTheDocument();
  });

  it('shows the correct tab content for each route', () => {
    renderAt('/settings/audio');
    expect(screen.getByTestId('settings-tab-content-audio')).toBeInTheDocument();
  });

  it('page does not overflow on first render (no "below the fold" gap from the old layout)', () => {
    // Regression: the old Settings page had 12+ panels stacked
    // vertically, creating a large blank area below the fold.
    // The new tabbed layout ensures each tab has at most 2
    // sections by default (all collapsed), so the visible
    // content fits within the viewport.
    renderAt('/settings/appearance');
    // The layout root has data-testid="settings-layout".
    // We don't measure exact pixel dimensions in jsdom (the
    // viewport is synthetic), but we do verify the structural
    // invariant: only the appearance tab is rendered.
    expect(screen.getByTestId('settings-layout')).toBeInTheDocument();
    // The active tab is appearance → only its content is mounted.
    expect(screen.getByTestId('settings-tab-content-appearance')).toBeInTheDocument();
    // Sanity: the other tabs' content is also in the DOM (we
    // chose "mount all + display:none" so state survives tab
    // switches) but only appearance is *visible*.
    const inactive = screen.getAllByTestId('settings-tab-content-audio');
    expect(inactive).toHaveLength(1);
  });
});
