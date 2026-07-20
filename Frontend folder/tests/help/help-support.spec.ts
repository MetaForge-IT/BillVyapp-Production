import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Help & Support', () => {
  test('loads FAQs, search, and contact options', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/help');

    await expect(page.getByRole('heading', { name: /Help & Support/i })).toBeVisible();
    await expect(page.getByPlaceholder('Search help articles…')).toBeVisible();

    // Known FAQ from HelpSupport.tsx
    await expect(page.getByText(/How do I book a new appointment/i)).toBeVisible();

    await page.getByPlaceholder('Search help articles…').fill('invoice');
    await expect(page.getByText(/How do I generate an invoice/i)).toBeVisible();
    await expect(page.getByText(/How do I book a new appointment/i)).toHaveCount(0);

    await page.getByPlaceholder('Search help articles…').fill('');
    await expect(page.getByText(/How do I book a new appointment/i)).toBeVisible();

    await expect(page.getByText('Email Support')).toBeVisible();
    await expect(page.getByText('support@billvyapp.com')).toBeVisible();
  });
});
