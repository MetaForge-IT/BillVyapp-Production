import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Customer Feedback', () => {
  test('loads feedback list, stats, and request dialog', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/feedback');

    await expect(page.getByRole('heading', { name: /all customer feedbacks/i })).toBeVisible();
    await expect(page.getByText('Customer Voice')).toBeVisible();

    await expect(page.getByText('Avg Rating')).toBeVisible();
    await expect(page.getByText('Satisfaction')).toBeVisible();
    await expect(page.getByText('Need Attention')).toBeVisible();
    await expect(page.getByText('Awaiting Reply')).toBeVisible();

    await expect(page.getByPlaceholder('Search feedbacks...')).toBeVisible();

    await page.getByRole('button', { name: /request feedback/i }).click();
    await expect(page.getByText('Request Feedback').last()).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Sarah Johnson')).toBeVisible();
    await expect(page.getByPlaceholder('+91 98765 43210')).toBeVisible();
    await expect(page.getByRole('button', { name: /send request/i })).toBeVisible();
  });
});
