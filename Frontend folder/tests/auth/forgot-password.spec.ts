import { test, expect } from '@playwright/test';

test.describe('Forgot Password', () => {
  test('validates email and submits reset request', async ({ page }) => {
    await page.goto('/forgot-password');

    await expect(page.getByRole('heading', { name: /reset your password/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /forgot your password/i })).toBeVisible();

    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    await page.getByPlaceholder('admin@billvyapp.com').fill('not-an-email');
    await page.getByRole('button', { name: /send reset link/i }).click();
    await expect(page.getByText(/enter a valid email address/i)).toBeVisible();

    await page.getByPlaceholder('admin@billvyapp.com').fill('demo@starrkuts.com');
    await page.getByRole('button', { name: /send reset link/i }).click();

    await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
    await expect(page.getByText('demo@starrkuts.com')).toBeVisible();
    await expect(page.getByRole('link', { name: /back to sign in/i })).toBeVisible();
  });
});
