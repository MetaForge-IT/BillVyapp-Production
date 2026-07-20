import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Customers', () => {
  test('create, search, edit, and deactivate a customer', async ({ page }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      const text = msg.text();
      // "Failed to load resource" entries are network-level diagnostics Chrome emits for
      // any non-2xx response (e.g. the app's own expected access-token-refresh 401), not
      // script errors. The "Function components cannot be given refs" warning is a known,
      // pre-existing React/Radix Slot ref-forwarding issue in the shared Dialog component
      // (src/app/components/ui/dialog.tsx) that fires on every dialog open app-wide — it is
      // unrelated to the Customers CRUD flow under test here and is tracked separately.
      // Everything else is treated as a genuine JS console error.
      if (
        msg.type() === 'error' &&
        !/failed to load resource/i.test(text) &&
        !/function components cannot be given refs/i.test(text)
      ) {
        consoleErrors.push(text);
      }
    });

    const uniqueSuffix = `${Date.now().toString().slice(-7)}${test.info().parallelIndex}`;
    const customerName = `QA Automation ${uniqueSuffix}`;
    // 10-digit Indian mobile (placeholder shows spaced form; digits-only is accepted)
    const initialPhoneDigits = `98${uniqueSuffix}`.slice(0, 10);
    const updatedPhoneDigits = `97${uniqueSuffix}`.slice(0, 10);

    await loginAsDemo(page);

    // Navigate to Customers via the sidebar
    await page.getByRole('link', { name: 'Customers', exact: true }).click();
    await expect(page).toHaveURL(/\/customers$/);

    // Customers page loaded
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();
    const searchInput = page.getByPlaceholder('Search by name, phone, or email…');
    await expect(searchInput).toBeVisible();

    // Create a new customer with unique test data
    await page.getByRole('button', { name: 'Add Customer', exact: true }).click();
    const addDialog = page.getByRole('dialog', { name: 'Add New Customer' });
    await expect(addDialog).toBeVisible();
    await addDialog.getByPlaceholder('e.g. Priya Sharma').fill(customerName);
    await addDialog.getByPlaceholder('98765 00000').fill(initialPhoneDigits);
    await addDialog.getByRole('button', { name: 'Add Customer', exact: true }).click();
    await expect(addDialog).toBeHidden({ timeout: 15000 });

    // App auto-opens the new customer's detail view right after creation
    await expect(page.getByRole('heading', { name: customerName, level: 2 })).toBeVisible();
    await expect(page.getByText(`+91 ${initialPhoneDigits}`)).toBeVisible();

    // Back to the list
    await page.getByRole('button', { name: 'Back to customers' }).click();
    await expect(page.getByRole('heading', { name: 'Customers', exact: true })).toBeVisible();

    // Search for the customer — this both verifies it appears in the customer list
    // and confirms the search feature filters down to it (the list can span many
    // pages, so searching is the reliable way to locate a freshly created record).
    await searchInput.fill(customerName);
    await expect(page.getByRole('heading', { name: /Customer List/i })).toBeVisible();
    const customerRow = page.getByRole('row', { name: new RegExp(customerName) });
    await expect(customerRow).toBeVisible();

    // Open the customer details
    await customerRow.click();
    await expect(page.getByRole('heading', { name: customerName, level: 2 })).toBeVisible();

    // Edit the customer's phone number
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const phoneInput = page.getByPlaceholder('98765 43210');
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill(updatedPhoneDigits);
    await page.getByRole('button', { name: 'Save Changes' }).click();

    // Verify the updated phone number is displayed
    await expect(page.getByText(`+91 ${updatedPhoneDigits}`)).toBeVisible();
    await expect(page.getByText(`+91 ${initialPhoneDigits}`)).toHaveCount(0);

    // The app has no hard-delete action in the UI — "Deactivate customer" is its soft-delete
    // equivalent (PATCH status -> inactive; the record is kept, not removed). Verify that flow.
    await page.getByRole('button', { name: 'Deactivate customer' }).click();
    await expect(page.getByRole('button', { name: 'Activate customer' })).toBeVisible();
    await expect(page.getByText('Inactive', { exact: true })).toBeVisible();

    // No JS runtime errors during the whole flow (screenshot/video-on-failure are handled by playwright.config.ts)
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
