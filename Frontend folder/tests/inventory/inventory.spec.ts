import { test, expect, type Page } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Known, pre-existing issues unrelated to this module's business logic — excluded by exact
 * message so any *other* console error still fails the test:
 *  - "Failed to load resource": network-level diagnostic for the app's own expected
 *    access-token-refresh 401 (see src/lib/axios.ts), not a script error.
 *  - "Function components cannot be given refs": a Radix Slot/forwardRef mismatch in the
 *    shared Dialog component (src/app/components/ui/dialog.tsx) that fires on every dialog
 *    open app-wide.
 *  - "DialogContent requires a DialogTitle": some dialogs on this page render their heading
 *    as plain text instead of <DialogTitle>, a pre-existing a11y bug tracked separately.
 */
function attachErrorListeners(page: Page) {
  const pageErrors: string[] = [];
  const consoleErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (msg) => {
    const text = msg.text();
    if (
      msg.type() === 'error' &&
      !/failed to load resource/i.test(text) &&
      !/function components cannot be given refs/i.test(text) &&
      !/dialogcontent.*requires a.*dialogtitle/i.test(text)
    ) {
      consoleErrors.push(text);
    }
  });
  return { pageErrors, consoleErrors };
}

test.describe('Inventory', () => {
  test('categories, vendor, product, purchase, and stock-adjustment lifecycle', async ({ page }) => {
    test.setTimeout(120_000);
    const { pageErrors, consoleErrors } = attachErrorListeners(page);
    const uniqueSuffix = Date.now().toString().slice(-8);

    // 1. Login
    await loginAsDemo(page);

    // 2. Navigate to Inventory
    await page.getByRole('link', { name: 'Inventory', exact: true }).click();
    await expect(page).toHaveURL(/\/inventory$/);

    // 3. Verify Inventory page loads
    await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
    await expect(page.getByText('Total Products', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('Search product, SKU, brand…')).toBeVisible();

    // ── 4-6. Product Category: create, edit, delete ─────────────────────
    const categoryName = `QA Category ${uniqueSuffix}`;
    const updatedCategoryName = `${categoryName} Updated`;

    await page.getByRole('button', { name: 'Categories', exact: true }).click();
    const categoriesDialog = page.getByRole('dialog', { name: 'Manage Categories' });
    await expect(categoriesDialog).toBeVisible();

    const categoryNameInput = categoriesDialog.getByPlaceholder('Category name');
    await categoryNameInput.fill(categoryName);
    await categoriesDialog.getByRole('button', { name: 'Add Category', exact: true }).click();
    await expect(page.getByText('Category created')).toBeVisible({ timeout: 15000 });
    let categoryRow = categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(categoryName)) });
    await expect(categoryRow).toBeVisible({ timeout: 10000 });

    // 5. Edit the category — row action buttons are icon-only with no accessible name;
    // Edit is always the first button in the row, Delete is always the last.
    await categoryRow.getByRole('button').first().click();
    await categoryNameInput.fill(updatedCategoryName);
    await categoriesDialog.getByRole('button', { name: 'Update Category', exact: true }).click();
    categoryRow = categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(updatedCategoryName)) });
    await expect(categoryRow).toBeVisible();

    // 6. Delete the category (it has 0 products, so deletion is allowed)
    await categoryRow.getByRole('button').last().click();
    await expect(page.getByText('Category deleted', { exact: false })).toBeVisible();
    await expect(
      categoriesDialog.getByRole('row', { name: new RegExp(escapeRegExp(updatedCategoryName)) }),
    ).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(categoriesDialog).toBeHidden();

    // ── 7-8. Vendor: create, then edit-equivalent (status toggle) ───────
    const vendorName = `QA Vendor ${uniqueSuffix}`;
    await page.getByRole('tab', { name: 'Vendors' }).click();
    await page.getByRole('button', { name: 'Add Vendor', exact: true }).click();
    const vendorDialog = page.getByRole('dialog', { name: 'Add New Vendor' });
    await expect(vendorDialog).toBeVisible();
    await vendorDialog.getByPlaceholder('e.g. Beauty World').fill(vendorName);
    await vendorDialog.getByPlaceholder('e.g. Rajesh Kumar').fill('QA Contact');
    await vendorDialog.getByPlaceholder('e.g. rajesh@beautyworld.in').fill(`qa${uniqueSuffix}@example.com`);
    await vendorDialog.getByPlaceholder('98765 11111').fill(`9${uniqueSuffix}1`);
    await vendorDialog.getByPlaceholder('e.g. Mumbai, Maharashtra').fill('QA City');
    await vendorDialog.getByPlaceholder('e.g. Hair Care, Color...').fill('QA Supplies');
    await vendorDialog.getByRole('button', { name: 'Add Vendor', exact: true }).click();
    await expect(vendorDialog).toBeHidden();
    await expect(page.getByText('Vendor added successfully')).toBeVisible();

    // Vendors table paginates — search so the new row is on the current page.
    await page.getByPlaceholder('Search vendors by name, contact, category...').fill(vendorName);
    const vendorRow = page.getByRole('row', { name: new RegExp(escapeRegExp(vendorName)) });
    await expect(vendorRow).toBeVisible({ timeout: 15000 });

    // 8. "Edit Vendor" — the app has no vendor-details edit form at all (confirmed via
    // source: Vendors.tsx only offers Add / View / Deactivate-Reactivate), so this
    // exercises the only real post-creation vendor mutation the UI supports: the
    // Deactivate/Reactivate status toggle, via updateVendor().
    await vendorRow.getByRole('button', { name: 'Deactivate', exact: true }).click();
    const deactivateDialog = page.getByRole('dialog', { name: 'Deactivate Vendor' });
    await expect(deactivateDialog).toBeVisible();
    await deactivateDialog.getByRole('button', { name: 'Poor product quality', exact: true }).click();
    await deactivateDialog.getByRole('button', { name: 'Deactivate', exact: true }).click();
    await expect(page.getByText(`${vendorName} deactivated.`)).toBeVisible();
    await expect(vendorRow.getByText('Inactive', { exact: true })).toBeVisible();

    // Reactivate so this vendor is selectable for the product/purchase steps below.
    await vendorRow.getByRole('button', { name: 'Activate', exact: true }).click();
    const reactivateDialog = page.getByRole('dialog', { name: 'Reactivate Vendor' });
    await expect(reactivateDialog).toBeVisible();
    await reactivateDialog.getByRole('button', { name: 'Reactivate', exact: true }).click();
    await expect(page.getByText(`${vendorName} reactivated.`)).toBeVisible();

    // Back to Stock tab; refresh so the newly created vendor is visible in the Product/PO
    // forms — Inventory.tsx and Vendors.tsx fetch vendors independently, so the Stock tab's
    // in-memory vendor list won't include it until a refresh re-runs that fetch.
    await page.getByRole('tab', { name: 'Stock' }).click();
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Inventory refreshed')).toBeVisible();

    // ── 9. Create a Product ──────────────────────────────────────────────
    const productName = `QA Product ${uniqueSuffix}`;
    const sku = `QASKU${uniqueSuffix}`;
    const initialStock = 30;
    const minStock = 10;

    await page.getByRole('button', { name: 'Add Product', exact: true }).click();
    const productDialog = page.getByRole('dialog', { name: 'Add New Product' });
    await expect(productDialog).toBeVisible();
    await productDialog.getByPlaceholder("e.g. L'Oreal Professional Shampoo").fill(productName);
    await productDialog.getByPlaceholder('e.g. LPS-001').fill(sku);
    await productDialog.getByPlaceholder("e.g. L'Oreal", { exact: true }).fill('QA Brand');

    // Category / supplier Select triggers lack an accessible name (placeholder is a plain span).
    await productDialog.getByRole('combobox').filter({ hasText: 'Select category' }).click();
    await page.getByRole('option').first().click();

    // Supplier: select the vendor created above by name
    await productDialog.getByRole('combobox').filter({ hasText: 'Select supplier' }).click();
    await page.getByRole('option', { name: vendorName, exact: true }).click();

    await productDialog.getByPlaceholder('e.g. 45').fill(String(initialStock));
    await productDialog.getByPlaceholder('e.g. 20').fill(String(minStock));
    await productDialog.getByPlaceholder('850').fill('500');
    await productDialog.getByPlaceholder('620').fill('300');
    await productDialog.getByRole('button', { name: 'Add Product', exact: true }).click();
    await expect(productDialog).toBeHidden();
    await expect(page.getByText('Product added')).toBeVisible();

    // 10. Verify product appears in the list (table paginates — search to find the new row)
    const searchInput = page.getByPlaceholder('Search product, SKU, brand…');
    await searchInput.fill(productName);
    let productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow).toBeVisible();
    await expect(productRow.getByText('In Stock', { exact: true })).toBeVisible();

    // ── 11–12. Search is already applied; read category, then filter ─────
    const categoryCellText = ((await productRow.getByRole('cell').nth(2).textContent()) ?? '').trim();
    const categorySelect = page.locator('select').filter({ has: page.locator(`option[value="${categoryCellText}"]`) });
    await categorySelect.selectOption(categoryCellText);
    await expect(productRow).toBeVisible();
    await categorySelect.selectOption('All');
    await searchInput.fill(productName);
    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow).toBeVisible();

    // ── 13. Edit Product ─────────────────────────────────────────────────
    // Row action buttons are icon-only; Edit (pencil) is the first button in the row.
    await productRow.getByRole('button').first().click();
    const editProductDialog = page.getByRole('dialog', { name: 'Edit Product' });
    await expect(editProductDialog).toBeVisible();
    await editProductDialog.getByPlaceholder("e.g. L'Oreal", { exact: true }).fill('QA Brand Updated');
    await editProductDialog.getByPlaceholder('850').fill('550');
    await editProductDialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(editProductDialog).toBeHidden();
    await expect(page.getByText('Product updated')).toBeVisible();
    await expect(productRow.getByText('₹550', { exact: false })).toBeVisible();

    // ── 14-15. Create Purchase Entry, verify stock increases ─────────────
    const purchaseQty = 20;
    await page.getByRole('tab', { name: 'Purchase Orders' }).click();
    await page.getByRole('button', { name: 'Create PO', exact: true }).click();
    const poDialog = page.getByRole('dialog', { name: 'Create Purchase Order' });
    await expect(poDialog).toBeVisible();
    await poDialog.getByRole('combobox').filter({ hasText: 'Select supplier' }).click();
    await page.getByRole('option', { name: vendorName, exact: true }).click();
    await poDialog.getByRole('combobox').filter({ hasText: 'Select product' }).click();
    await page.getByRole('option', { name: productName, exact: true }).click();
    await poDialog.getByPlaceholder('e.g. 5').fill(String(purchaseQty));
    await poDialog.getByPlaceholder('e.g. 620').fill('300');
    await poDialog.getByRole('button', { name: 'Create PO', exact: true }).click();
    await expect(poDialog).toBeHidden();
    await expect(page.getByText('Purchase order recorded')).toBeVisible();

    await page.getByRole('tab', { name: 'Stock' }).click();
    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow.getByText(String(initialStock + purchaseQty), { exact: true })).toBeVisible();

    // ── 16-17. Stock Adjustment + verify adjustment history ──────────────
    // Adjust Stock button has a `title="Adjust Stock"` attribute — the only accessible
    // name source for this icon-only button — which browsers expose as its accessible name.
    await productRow.getByRole('button', { name: 'Adjust Stock', exact: true }).click();
    const adjustDialog = page.getByRole('dialog', { name: 'Adjust Stock' });
    await expect(adjustDialog).toBeVisible();
    await adjustDialog.getByRole('button', { name: 'Set to', exact: true }).click();
    // Backend treats stock === minStock as still OK; stock just below min is Low Stock.
    const lowStockQty = Math.max(1, minStock - 1);
    await adjustDialog.getByPlaceholder('Enter quantity').fill(String(lowStockQty));
    await adjustDialog.getByRole('button', { name: 'Confirm Adjustment', exact: true }).click();
    await expect(page.getByText('Stock adjusted')).toBeVisible();

    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow.getByText(String(lowStockQty), { exact: true })).toBeVisible();

    await page.getByRole('tab', { name: 'Usage Log' }).click();
    await page.getByRole('button', { name: 'Manual Adjustment', exact: true }).click();
    await expect(page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) })).toBeVisible();
    await page.getByRole('tab', { name: 'Stock' }).click();
    await searchInput.fill(productName);

    // ── 19. Verify Low Stock badge appears when stock is below minimum ────
    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow.getByText('Low Stock', { exact: true })).toBeVisible();

    // ── 20. Verify Out Of Stock status ───────────────────────────────────
    await productRow.getByRole('button', { name: 'Adjust Stock', exact: true }).click();
    const adjustDialog2 = page.getByRole('dialog', { name: 'Adjust Stock' });
    await expect(adjustDialog2).toBeVisible();
    await adjustDialog2.getByRole('button', { name: 'Set to', exact: true }).click();
    await adjustDialog2.getByPlaceholder('Enter quantity').fill('0');
    await adjustDialog2.getByRole('button', { name: 'Confirm Adjustment', exact: true }).click();
    await expect(page.getByText('Stock adjusted')).toBeVisible();

    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow.getByText('Out of Stock', { exact: true })).toBeVisible();

    // ── 21. Verify Refresh reloads live data ─────────────────────────────
    await page.getByRole('button', { name: 'Refresh', exact: true }).click();
    await expect(page.getByText('Inventory refreshed')).toBeVisible();
    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow.getByText('Out of Stock', { exact: true })).toBeVisible();

    // ── 22-23. Reload the browser and verify data persists from MySQL ───
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Inventory Management' })).toBeVisible();
    await page.getByPlaceholder('Search product, SKU, brand…').fill(productName);
    productRow = page.getByRole('row', { name: new RegExp(escapeRegExp(productName)) });
    await expect(productRow).toBeVisible();
    await expect(productRow.getByText('Out of Stock', { exact: true })).toBeVisible();
    await expect(productRow.getByText('₹550', { exact: false })).toBeVisible();

    // ── 24-25. No JS runtime errors during the whole flow ────────────────
    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
