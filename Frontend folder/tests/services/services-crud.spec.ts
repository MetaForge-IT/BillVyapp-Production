import { test, expect, type Page } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

test.describe('Services', () => {
  test('manage service categories and services end to end', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      const text = msg.text();
      // Known, pre-existing issues unrelated to this test's CRUD logic — excluded by exact
      // message so any *other* console error still fails the test:
      //  - "Failed to load resource": network-level diagnostic for the app's own expected
      //    access-token-refresh 401 (see src/lib/axios.ts), not a script error.
      //  - "Function components cannot be given refs": a Radix Slot/forwardRef mismatch in
      //    the shared Dialog component (src/app/components/ui/dialog.tsx) that fires on every
      //    dialog open app-wide.
      //  - "DialogContent requires a DialogTitle": the Add Service dialog
      //    (src/app/pages/Services.tsx) renders its heading as a plain <p> instead of
      //    <DialogTitle>, a real pre-existing a11y bug worth fixing separately.
      if (
        msg.type() === 'error' &&
        !/failed to load resource/i.test(text) &&
        !/function components cannot be given refs/i.test(text) &&
        !/dialogcontent.*requires a.*dialogtitle/i.test(text)
      ) {
        consoleErrors.push(text);
      }
    });

    const uniqueSuffix = Date.now().toString().slice(-8);
    const categoryName = `QA Category ${uniqueSuffix}`;
    const updatedCategoryName = `${categoryName} Updated`;
    const serviceName = `QA Service ${uniqueSuffix}`;

    await loginAsDemo(page);

    // Navigate to the Services page via the sidebar
    await page.getByRole('link', { name: 'Services', exact: true }).click();
    await expect(page).toHaveURL(/\/services$/);

    // Services page loaded
    await expect(page.getByRole('heading', { name: 'Service Management' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Services' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /All Services/ })).toBeVisible();

    // ── Service Category: create with a unique name ──
    await page.getByRole('button', { name: 'Categories', exact: true }).click();
    const categoriesDialog = page.getByRole('dialog', { name: 'Manage Categories' });
    await expect(categoriesDialog).toBeVisible();

    const categoryNameInput = categoriesDialog.getByPlaceholder('e.g. Hair');
    await categoryNameInput.fill(categoryName);
    await categoriesDialog.getByRole('button', { name: 'Add Category' }).click();
    await expect(categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(categoryName)) })).toBeVisible();
    await expect(categoryNameInput).toHaveValue('');

    // ── Service Category: edit and verify the change ──
    // Row action buttons are icon-only with no accessible name — Edit is always the first
    // button in the row, Delete is always the last.
    let categoryRow = categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(categoryName)) });
    await categoryRow.getByRole('button').first().click();
    await categoryNameInput.fill(updatedCategoryName);
    await categoriesDialog.getByRole('combobox').click();
    await page.getByRole('option', { name: 'Inactive', exact: true }).click();
    await categoriesDialog.getByRole('button', { name: 'Update Category' }).click();

    categoryRow = categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(updatedCategoryName)) });
    await expect(categoryRow).toBeVisible();
    await expect(categoryRow.getByText('inactive', { exact: true })).toBeVisible();

    // ── Service Category: delete — allowed because it has no services assigned ──
    await categoryRow.getByRole('button').last().click();
    await expect(page.getByText('Category deleted')).toBeVisible();
    await expect(categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(updatedCategoryName)) })).toHaveCount(0);

    // ── Service Category: deletion blocked when services ARE assigned ──
    const categoryTableRows = categoriesDialog.locator('table tbody tr');
    const categoryRowCount = await categoryTableRows.count();
    let categoryWithServicesName = '';
    for (let i = 0; i < categoryRowCount; i++) {
      const cells = categoryTableRows.nth(i).locator('td');
      const serviceCount = Number((await cells.nth(1).textContent())?.trim() || '0');
      if (serviceCount > 0) {
        categoryWithServicesName = (await cells.nth(0).textContent())?.trim() ?? '';
        break;
      }
    }
    expect(categoryWithServicesName, 'expected at least one existing category with services assigned').not.toBe('');

    const blockedRow = categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(categoryWithServicesName)) });
    await blockedRow.getByRole('button').last().click();
    await expect(page.getByText('Cannot delete a category that has services assigned to it')).toBeVisible();
    await expect(blockedRow).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(categoriesDialog).toBeHidden();

    // ── Service: create with unique test data ──
    await page.getByRole('button', { name: 'Add Service', exact: true }).click();
    // This dialog renders its heading as a plain <p>, not <DialogTitle> (see the console-error
    // filter above), so it has no accessible name — scope by visible text instead of role name.
    const addServiceDialog = page.getByRole('dialog').filter({ hasText: 'Add New Service' });
    await expect(addServiceDialog).toBeVisible();

    await addServiceDialog.getByPlaceholder('e.g. Hot Towel Shave').fill(serviceName);
    // The Category select's visible "Select category" placeholder isn't exposed as an
    // accessible name (no label association), so target it positionally — it's the first
    // of the two comboboxes in this dialog (Category, then Status).
    await addServiceDialog.getByRole('combobox').first().click();
    const firstCategoryOption = page.getByRole('option').first();
    await expect(firstCategoryOption).toBeVisible();
    const assignedCategoryName = (await firstCategoryOption.textContent())?.trim() ?? '';
    // Radix highlights the first option by default when the popover opens — confirm via
    // keyboard instead of a pointer click, which is flaky against floating popovers in WebKit.
    await page.keyboard.press('Enter');
    await expect(firstCategoryOption).toBeHidden();
    await addServiceDialog.getByPlaceholder('30').fill('30');
    await addServiceDialog.getByPlaceholder('499').fill('499');
    await addServiceDialog.getByRole('button', { name: 'Add Service', exact: true }).click();
    await expect(addServiceDialog).toBeHidden();
    await expect(page.getByText('Service created')).toBeVisible();

    // ── Service: verify it appears in the list, then search for it ──
    const searchInput = page.getByPlaceholder('Search services by name or category…');
    await searchInput.fill(serviceName);
    const serviceRow = page.getByRole('row', { name: new RegExp(escapeRegExp(serviceName)) });
    await expect(serviceRow).toBeVisible();
    await expect(serviceRow.getByText(assignedCategoryName, { exact: true })).toBeVisible();
    await expect(serviceRow.getByText('30 mins')).toBeVisible();
    await expect(serviceRow.getByText('₹499', { exact: true })).toBeVisible();
    await searchInput.fill('');

    // ── Service: filter by category and status ──
    const categorySelect = page.locator('select').filter({ hasText: 'All Categories' });
    await categorySelect.selectOption({ value: assignedCategoryName });
    await expect(serviceRow).toBeVisible();

    const statusSelect = page.locator('select').filter({ hasText: 'All Status' });
    await statusSelect.selectOption('active');
    await expect(serviceRow).toBeVisible();

    await statusSelect.selectOption('inactive');
    await expect(serviceRow).toHaveCount(0); // the new service is Active, so it drops out of the Inactive filter

    await statusSelect.selectOption('all');
    await categorySelect.selectOption('all');
    await expect(serviceRow).toBeVisible();

    // ── Service: edit price and duration, verify the update ──
    // Row action buttons are icon-only with no accessible name — Edit (pencil) is the first of
    // three buttons, Delete (trash) is the last.
    await serviceRow.getByRole('button').first().click();
    const editServiceDialog = page.getByRole('dialog', { name: 'Edit Service' });
    await expect(editServiceDialog).toBeVisible();

    const priceInput = editServiceDialog
      .getByText('Price', { exact: true })
      .locator('xpath=following-sibling::div[1]//input');
    const durationInput = editServiceDialog
      .getByText('Duration', { exact: true })
      .locator('xpath=following-sibling::div[1]//input');
    await durationInput.fill('45');
    await priceInput.fill('599');
    await editServiceDialog.getByRole('button', { name: 'Save Changes' }).click();
    await expect(editServiceDialog).toBeHidden();
    await expect(page.getByText('Service updated')).toBeVisible();

    await expect(serviceRow.getByText('45 mins')).toBeVisible();
    await expect(serviceRow.getByText('₹599', { exact: true })).toBeVisible();

    // ── Service: delete — the app's only supported removal workflow for services ──
    await serviceRow.getByRole('button').last().click();
    await expect(page.getByText('Service deleted')).toBeVisible();
    await expect(serviceRow).toHaveCount(0);

    await searchInput.fill(serviceName);
    await expect(page.getByText('No services found matching your search.')).toBeVisible();

    // No JS runtime errors during the whole flow (screenshot/video-on-failure are handled by playwright.config.ts)
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
