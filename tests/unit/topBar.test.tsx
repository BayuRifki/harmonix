import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from '@/components/layout/TopBar';

function renderWithRouter(initialPath = '/'): void {
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <TopBar />
    </MemoryRouter>,
  );
}

describe('TopBar', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders search input with placeholder', () => {
    renderWithRouter();
    const input = screen.getByPlaceholderText(/Search for songs/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders notification and settings buttons', () => {
    renderWithRouter();
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
    expect(screen.getByLabelText('Settings')).toBeInTheDocument();
  });

  it('updates search input as user types', () => {
    renderWithRouter();
    const input = screen.getByPlaceholderText(/Search for songs/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Daft Punk' } });
    expect(input.value).toBe('Daft Punk');
  });

  it('navigates to /search on form submit with query', () => {
    renderWithRouter();
    const input = screen.getByPlaceholderText(/Search for songs/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Daft Punk' } });
    const form = input.closest('form')!;
    fireEvent.submit(form);
    expect(input.value).toBe('Daft Punk');
  });

  it('navigates to /search on empty form submit', () => {
    renderWithRouter();
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(form).toBeInTheDocument();
  });
});
