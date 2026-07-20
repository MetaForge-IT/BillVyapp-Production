import { test, expect } from '@playwright/test';

test.describe('Landing', () => {
  test('landing page loads and routes to signup / login', async ({ page }) => {
    await page.goto('/landing');

    await expect(page.getByText(/BillVyapp|India'?s #1 Salon/i).first()).toBeVisible();
    await expect(page.getByRole('button', { name: /Start Free Trial|Get Started/i }).first()).toBeVisible();

    // Primary CTA should take a visitor into the signup funnel
    await page.getByRole('button', { name: /Start Free Trial|Get Started Free|Get Started/i }).first().click();
    await expect(page).toHaveURL(/\/(signup|login)/);

    await page.goto('/landing');
    await page.getByRole('button', { name: /^sign in$/i }).click();
    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: /sign in to billvyapp/i })).toBeVisible();
  });
});
