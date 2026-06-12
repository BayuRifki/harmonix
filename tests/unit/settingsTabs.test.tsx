import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SettingsTabs } from '@/features/settings/SettingsTabs';
import { useUiStore, flushUiPersist } from '@/stores/uiStore';
import { installMockWindowApi } from '../setup';

function renderWithPath(initialPath: string): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/settings/*" element={<SettingsTabs />} />
      </Routes>
    </MemoryRouter>,
  );
}

function clickSectionToggle(id: string): void {
  // The data-testid is on the <button> (the clickable header),
  // not the <section> wrapper. This way the test can interact
  // with the section even when it is `hidden` because the test
  // is mounting a different active tab.
  fireEvent.click(screen.getByTestId(`settings-section-toggle-${id}`));
}

describe('SettingsTabs', () => {
  beforeEach(() => {
    // installMockWindowApi must run before any panel component
    // (MemoryPanel, SpotifyLoginButton, YtMusicStatus, etc.)
    // mounts, since they call window.api on first render. The
    // mock lives in `tests/setup.ts` and is reset per test.
    installMockWindowApi();
    localStorage.clear();
    flushUiPersist();
    useUiStore.setState({
      settingsCollapsedSections: {},
      settingsHintDismissed: false,
    });
  });

  it('renders all 5 tab links', () => {
    renderWithPath('/settings/appearance');
    expect(screen.getByTestId('settings-tab-appearance')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-audio')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-shortcuts')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-performance')).toBeInTheDocument();
    expect(screen.getByTestId('settings-tab-sources')).toBeInTheDocument();
  });

  it('marks the active tab with aria-selected=true', () => {
    renderWithPath('/settings/audio');
    expect(screen.getByTestId('settings-tab-audio')).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByTestId('settings-tab-appearance')).toHaveAttribute('aria-selected', 'false');
  });

  it('shows the appearance tab content by default for unknown paths', () => {
    renderWithPath('/settings');
    expect(screen.getByTestId('settings-tab-content-appearance')).toBeInTheDocument();
  });

  it('shows the correct tab content based on the URL', () => {
    renderWithPath('/settings/audio');
    expect(screen.getByTestId('settings-tab-content-audio')).toBeInTheDocument();
  });

  it('clicking a tab navigates to its URL', () => {
    renderWithPath('/settings/appearance');
    fireEvent.click(screen.getByTestId('settings-tab-sources'));
    expect(screen.getByTestId('settings-tab-sources')).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the first-time hint when no section has been expanded', () => {
    renderWithPath('/settings/appearance');
    expect(screen.getByTestId('settings-hint')).toBeInTheDocument();
    expect(screen.getByText(/Click a section to expand/i)).toBeInTheDocument();
  });

  it('hides the first-time hint after a section is expanded', () => {
    useUiStore.getState().expandSettingsSection('appearance:theme-picker');
    renderWithPath('/settings/appearance');
    expect(screen.queryByTestId('settings-hint')).not.toBeInTheDocument();
  });

  it('hides the first-time hint after the user dismissed it explicitly', () => {
    useUiStore.getState().dismissSettingsHint();
    renderWithPath('/settings/appearance');
    expect(screen.queryByTestId('settings-hint')).not.toBeInTheDocument();
  });

  it('all sections start collapsed on first visit', () => {
    renderWithPath('/settings/appearance');
    expect(screen.getByTestId('settings-section-appearance:theme-picker')).toHaveAttribute(
      'data-collapsed',
      'true',
    );
    expect(screen.getByTestId('settings-section-appearance:theme-panel')).toHaveAttribute(
      'data-collapsed',
      'true',
    );
  });

  it('expands a section from the Appearance tab', () => {
    renderWithPath('/settings/appearance');
    clickSectionToggle('appearance:theme-picker');
    expect(useUiStore.getState().isSettingsSectionCollapsed('appearance:theme-picker')).toBe(false);
  });

  it('expands a section from the Audio tab', () => {
    renderWithPath('/settings/audio');
    clickSectionToggle('audio:crossfade');
    expect(useUiStore.getState().isSettingsSectionCollapsed('audio:crossfade')).toBe(false);
  });

  it('expands a section from the Shortcuts tab', () => {
    renderWithPath('/settings/shortcuts');
    clickSectionToggle('shortcuts:keyboard');
    expect(useUiStore.getState().isSettingsSectionCollapsed('shortcuts:keyboard')).toBe(false);
  });

  it('expands a section from the Performance tab', () => {
    renderWithPath('/settings/performance');
    clickSectionToggle('performance:memory');
    expect(useUiStore.getState().isSettingsSectionCollapsed('performance:memory')).toBe(false);
  });

  it('expands a section from the Sources tab', () => {
    renderWithPath('/settings/sources');
    clickSectionToggle('sources:spotify');
    expect(useUiStore.getState().isSettingsSectionCollapsed('sources:spotify')).toBe(false);
  });

  it('expanding a section dismisses the first-time hint', () => {
    renderWithPath('/settings/audio');
    expect(screen.getByTestId('settings-hint')).toBeInTheDocument();
    clickSectionToggle('audio:crossfade');
    // The hint is removed from the store once a section is
    // expanded. The actual DOM removal happens through
    // AnimatePresence's exit animation, so we verify the store
    // state directly (which is what drives the visibility
    // calculation in SettingsTabs).
    expect(useUiStore.getState().settingsHintDismissed).toBe(true);
  });
});
