import { test, expect } from '@playwright/test';
import { DEMO_EMAIL, loginAsDemo } from '../helpers/auth';

test.describe('My Profile', () => {
  test('loads profile details for the authenticated user', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/profile');

    await expect(page.getByRole('heading', { name: 'My Profile' })).toBeVisible();
    await expect(page.getByText('Account', { exact: true }).first()).toBeVisible();

    // Wait for /auth/me to populate (page starts in a Loading… state)
    await expect(page.getByRole('heading', { name: /loading/i })).toBeHidden({ timeout: 15000 });
    await expect(page.getByText(DEMO_EMAIL)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Manager|Vikram|Active member/i).first()).toBeVisible();

    await expect(page.getByText('Email', { exact: true })).toBeVisible();
    await expect(page.getByText('Role', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Salon ID', { exact: true })).toBeVisible();
  });
});
