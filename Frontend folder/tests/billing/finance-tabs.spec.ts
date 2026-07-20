import { test, expect, type Page } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

async function openFinanceSection(page: Page, section: string, label: RegExp) {
  await page.goto(`/finance?tab=receipts&section=${section}`);
  await expect(page.getByRole('heading', { name: /^receipts$/i })).toBeVisible();
  await page.getByRole('tab', { name: label }).click();
}

test.describe('Finance — Refunds / Pending / Advances', () => {
  test('Refunds tab shows ledger and stats', async ({ page }) => {
    await loginAsDemo(page);
    await openFinanceSection(page, 'refunds', /^refunds/i);

    await expect(page.getByText('Total Refunded')).toBeVisible();
    await expect(page.getByText('Pending Approval')).toBeVisible();
    await expect(page.getByText('Total Refunds')).toBeVisible();
    await expect(page.getByText('Refund Ledger')).toBeVisible();

    // Empty or populated — either is valid for smoke coverage
    await expect(
      page.getByText(/no refunds recorded yet|approved|pending|awaiting manager/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('Pending Payments tab loads register', async ({ page }) => {
    await loginAsDemo(page);
    await openFinanceSection(page, 'pending', /pending payments/i);

    await expect(page.getByText('Total Due')).toBeVisible();
    await expect(page.getByText('Pending Invoice Register')).toBeVisible();
    await expect(
      page.getByText(/no pending payments right now|collect|overdue|partial/i).first(),
    ).toBeVisible({ timeout: 10000 });
  });

  test('Advance Payments tab shows register and collect dialog', async ({ page }) => {
    await loginAsDemo(page);
    await openFinanceSection(page, 'advance', /advance payments/i);

    await expect(page.getByText('Advance Held')).toBeVisible();
    await expect(page.getByText('Total Collected')).toBeVisible();
    await expect(page.getByText('Utilized')).toBeVisible();
    await expect(page.getByText('Advance Payment Register')).toBeVisible();

    await page.getByRole('button', { name: /collect advance/i }).click();
    await expect(page.getByPlaceholder('e.g. Ritu Sharma')).toBeVisible();
    await expect(page.getByPlaceholder('+91 98765 43210')).toBeVisible();
    await expect(page.getByPlaceholder('e.g. Bridal Makeup Package')).toBeVisible();
  });
});
