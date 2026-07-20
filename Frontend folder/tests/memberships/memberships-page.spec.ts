import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Memberships page', () => {
  test('loads loyalty KPIs, tiers, and member search', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/memberships');

    await expect(page.getByRole('heading', { name: /membership & loyalty/i })).toBeVisible();
    await expect(page.getByText(/manage plans, loyalty points/i)).toBeVisible();

    await expect(page.getByText('Total Members')).toBeVisible();
    await expect(page.getByText('Membership Revenue')).toBeVisible();
    await expect(page.getByText('Points Issued')).toBeVisible();
    await expect(page.getByText('Active Rate')).toBeVisible();

    // Plans tab — tier cards from seed / API
    await expect(page.getByRole('tab', { name: /^plans$/i })).toBeVisible();
    await expect(page.getByText(/Platinum|Gold|Silver|Basic/i).first()).toBeVisible();

    // Member search lives on the Members tab
    await page.getByRole('tab', { name: /^members$/i }).click();
    await expect(page.getByPlaceholder('Search members by name...')).toBeVisible();

    await page.getByRole('button', { name: /enroll member/i }).click();
    await expect(page.getByText(/use finance.*membership to enroll/i)).toBeVisible();
  });
});
