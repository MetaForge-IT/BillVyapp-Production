import { test, expect } from '@playwright/test';
import { DEMO_EMAIL, DEMO_PASSWORD, loginAsDemo } from '../helpers/auth';

test.describe('Authentication', () => {
  test('shows SMS OTP step after valid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('you@salon.com').fill(DEMO_EMAIL);
    await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /^continue$/i }).click();

    await expect(page.getByRole('heading', { name: /enter verification code/i })).toBeVisible({
      timeout: 15000,
    });
    // Case-sensitive: avoids matching the helper text ("sent to your phone.") in the banner.
    await expect(page.getByText(/^Sent to/i)).toBeVisible();
    await expect(page.locator('[data-slot="input-otp"]')).toBeVisible();
    await expect(page.getByRole('button', { name: /verify & sign in/i })).toBeDisabled();
  });

  test('Successful Login with OTP', async ({ page }) => {
    await loginAsDemo(page);

    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.getByText('BillVyapp').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /good (morning|afternoon|evening)/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });
});
