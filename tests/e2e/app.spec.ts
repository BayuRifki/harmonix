import { test, expect } from '@playwright/test';

test('app launches and shows home view', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /Welcome to Harmonix/i })).toBeVisible();
});
