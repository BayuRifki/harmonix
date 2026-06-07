import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

function renderAt(path: string): void {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="*" element={<Breadcrumb />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Breadcrumb', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing for "/"', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/']}>
        <Breadcrumb />
      </MemoryRouter>,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders nothing for /now-playing', () => {
    const { container } = render(
      <MemoryRouter initialEntries={['/now-playing']}>
        <Breadcrumb />
      </MemoryRouter>,
    );
    expect(container.querySelector('nav')).toBeNull();
  });

  it('renders label for /library', () => {
    renderAt('/library');
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('renders label for /settings', () => {
    renderAt('/settings');
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('renders the navigation role with aria-label', () => {
    renderAt('/library');
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
  });

  it('marks the last crumb with aria-current="page"', () => {
    renderAt('/equalizer');
    const nav = screen.getByRole('navigation');
    const pageCrumb = nav.querySelector('[aria-current="page"]');
    expect(pageCrumb).not.toBeNull();
    expect(pageCrumb!.textContent).toContain('Equalizer');
  });

  it('renders multi-segment crumbs with separators', () => {
    renderAt('/source/spotify');
    const nav = screen.getByRole('navigation');
    expect(nav.textContent).toContain('Sources');
    expect(nav.textContent).toContain('Source');
  });
});
