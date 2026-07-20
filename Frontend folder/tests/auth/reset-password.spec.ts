import { test, expect } from '@playwright/test';

test.describe('Reset Password', () => {
  test('blocks submit when reset token is missing', async ({ page }) => {
    await page.goto('/reset-password');

    await expect(page.getByRole('heading', { name: /reset password/i })).toBeVisible();

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('NewPass@123');
    await passwordInputs.nth(1).fill('NewPass@123');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(
      page.getByText(/invalid or missing reset link|request a new password reset/i),
    ).toBeVisible();
  });

  test('shows mismatch validation before calling the API', async ({ page }) => {
    await page.goto('/reset-password?token=fake-token-for-ui-validation');

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('NewPass@123');
    await passwordInputs.nth(1).fill('Different@123');
    await page.getByRole('button', { name: /update password/i }).click();

    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});
