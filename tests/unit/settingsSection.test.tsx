import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SettingsSection } from '@/features/settings/SettingsSection';
import { useUiStore, flushUiPersist } from '@/stores/uiStore';

function wrap(ui: React.ReactNode): JSX.Element {
  return <MemoryRouter>{ui}</MemoryRouter>;
}

describe('SettingsSection', () => {
  beforeEach(() => {
    localStorage.clear();
    flushUiPersist();
    useUiStore.setState({
      settingsCollapsedSections: {},
      settingsHintDismissed: false,
    });
  });

  it('renders the title and is collapsed by default', () => {
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section" description="Helper text">
          <div data-testid="body">Body content</div>
        </SettingsSection>,
      ),
    );
    expect(screen.getByText('My Section')).toBeInTheDocument();
    expect(screen.getByText('Helper text')).toBeInTheDocument();
    // The body is collapsed by default; the body node is not in
    // the rendered output (AnimatePresence removes it after exit).
    expect(screen.queryByTestId('body')).not.toBeInTheDocument();
    // The header button is present and reports collapsed.
    const header = screen.getByRole('button', { name: /My Section/i });
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('expands when the header is clicked', () => {
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section">
          <div data-testid="body">Body content</div>
        </SettingsSection>,
      ),
    );
    const header = screen.getByTestId('settings-section-toggle-test:section');
    fireEvent.click(header);
    expect(useUiStore.getState().isSettingsSectionCollapsed('test:section')).toBe(false);
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('collapses on the second click', () => {
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section">
          <div data-testid="body">Body content</div>
        </SettingsSection>,
      ),
    );
    const header = screen.getByTestId('settings-section-toggle-test:section');
    fireEvent.click(header); // expand
    expect(useUiStore.getState().isSettingsSectionCollapsed('test:section')).toBe(false);
    fireEvent.click(header); // collapse
    expect(useUiStore.getState().isSettingsSectionCollapsed('test:section')).toBe(true);
  });

  it('respects persisted collapsed state on mount (no flash of expanded content)', () => {
    // Pre-set: section is explicitly expanded in the store.
    useUiStore.getState().expandSettingsSection('test:section');
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section">
          <div data-testid="body">Body content</div>
        </SettingsSection>,
      ),
    );
    const header = screen.getByTestId('settings-section-toggle-test:section');
    expect(header).toHaveAttribute('aria-expanded', 'true');
  });

  it('dismisses the first-time hint when expanded for the first time', () => {
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section">
          <div>Body</div>
        </SettingsSection>,
      ),
    );
    expect(useUiStore.getState().settingsHintDismissed).toBe(false);
    const header = screen.getByTestId('settings-section-toggle-test:section');
    act(() => {
      fireEvent.click(header);
    });
    expect(useUiStore.getState().settingsHintDismissed).toBe(true);
  });

  it('is accessible: aria-expanded toggles, aria-controls references the panel', () => {
    render(
      wrap(
        <SettingsSection id="test:section" title="My Section">
          <div>Body</div>
        </SettingsSection>,
      ),
    );
    const header = screen.getByTestId('settings-section-toggle-test:section');
    const controlsId = header.getAttribute('aria-controls');
    expect(controlsId).toBe('settings-section-test:section-panel');
    expect(header).toHaveAttribute('aria-expanded', 'false');
  });

  it('badge is rendered next to the title even when collapsed', () => {
    render(
      wrap(
        <SettingsSection
          id="test:section"
          title="My Section"
          badge={<span data-testid="badge">NEW</span>}
        >
          <div>Body</div>
        </SettingsSection>,
      ),
    );
    expect(screen.getByTestId('badge')).toBeInTheDocument();
  });
});
