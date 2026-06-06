import { test, expect } from '@playwright/test';

test('app launches and shows the sidebar logo', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Harmonix' })).toBeVisible();
});

test('home view shows the version footer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText(/Harmonix v/)).toBeVisible();
});
