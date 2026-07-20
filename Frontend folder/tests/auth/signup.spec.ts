import { test, expect } from '@playwright/test';

test.describe('Sign Up', () => {
  test('shows validation errors for empty and mismatched passwords', async ({ page }) => {
    await page.goto('/signup');

    await expect(
      page.getByRole('heading', { name: /create your salon account/i }),
    ).toBeVisible();

    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/please fill in all fields/i)).toBeVisible();

    await page.getByPlaceholder('The Starr Kuts').fill('QA Test Salon');
    await page.getByPlaceholder('Vikram Malhotra').fill('QA Owner');
    await page.getByPlaceholder('you@salon.com').fill('qa-owner@example.com');
    await page.getByPlaceholder('+91 98765 43210').fill('+91 9876543210');

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Password1');
    await passwordInputs.nth(1).fill('Password2');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('registers a new salon with unique credentials', async ({ page }) => {
    const suffix = Date.now().toString().slice(-8);
    const email = `qa.salon.${suffix}@example.com`;

    await page.goto('/signup');
    await page.getByPlaceholder('The Starr Kuts').fill(`QA Salon ${suffix}`);
    await page.getByPlaceholder('Vikram Malhotra').fill(`QA Manager ${suffix}`);
    await page.getByPlaceholder('you@salon.com').fill(email);
    await page.getByPlaceholder('+91 98765 43210').fill(`+91 9${suffix}0`);

    const passwordInputs = page.locator('input[type="password"]');
    await passwordInputs.nth(0).fill('Demo@1234');
    await passwordInputs.nth(1).fill('Demo@1234');
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByRole('heading', { name: /verify your email/i })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByText(email)).toBeVisible();
  });
});
