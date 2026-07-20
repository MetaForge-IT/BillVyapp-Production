import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Services — Coupons', () => {
  test('opens Coupons tab and creates a coupon', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/services');

    await page.getByRole('tab', { name: /coupons/i }).click();
    await expect(page.getByText('Promotions & Discounts')).toBeVisible();
    await expect(page.getByText('Total Coupons')).toBeVisible();
    await expect(page.getByPlaceholder('Search coupons by code or title…')).toBeVisible();

    const code = `QA${Date.now().toString().slice(-6)}`;
    const validTill = new Date();
    validTill.setMonth(validTill.getMonth() + 1);
    const validTillIso = validTill.toISOString().split('T')[0];

    await page.getByRole('button', { name: /create coupon/i }).click();
    await expect(page.getByText('Create Coupon').last()).toBeVisible();

    // Dialog pre-fills a generated code — overwrite with our unique one
    await page.getByPlaceholder('e.g. SUMMER25').fill(code);
    await page.getByPlaceholder('e.g. Summer Special').fill(`QA Promo ${code}`);
    await page.getByPlaceholder('Shown to customers when sent...').fill('Automated E2E coupon');

    // Discount value (percentage default placeholder "20")
    const dialog = page.locator('[role="dialog"]').filter({ hasText: /create coupon/i });
    await dialog.locator('input[type="number"]').first().fill('15');
    await dialog.locator('input[type="date"]').nth(1).fill(validTillIso);

    await dialog.getByRole('button', { name: /create coupon/i }).click();

    await expect(page.getByText(code, { exact: true })).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(`QA Promo ${code}`, { exact: true })).toBeVisible();
  });
});
