import { test, expect, type Page, type Locator } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function packageCard(page: Page, name: string): Locator {
  return page
    .locator('div.group')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first();
}

function fieldInput(scope: Locator, label: RegExp | string): Locator {
  const labelLocator =
    typeof label === 'string' ? scope.getByText(label, { exact: true }) : scope.getByText(label);
  return labelLocator.locator('xpath=following-sibling::*[1]//input | following-sibling::input[1]');
}

function fieldTextarea(scope: Locator, label: RegExp | string): Locator {
  const labelLocator =
    typeof label === 'string' ? scope.getByText(label, { exact: true }) : scope.getByText(label);
  return labelLocator.locator('xpath=following-sibling::textarea[1]');
}

test.describe('Memberships & Packages', () => {
  test('create, search, view, edit, and deactivate a membership package plan', async ({ page }) => {
    test.setTimeout(90_000);
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      const text = msg.text();
      // Known, pre-existing noise — same exclusions as other BillVyapp E2E specs:
      //  - "Failed to load resource": expected auth refresh 401 diagnostics
      //  - "Function components cannot be given refs": shared Dialog/Radix Slot issue
      //  - "DialogContent requires a DialogTitle": create-plan dialog uses a plain <p> heading
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
    const planName = `QA Membership Pkg ${uniqueSuffix}`;
    const updatedDescription = `Updated QA package description ${uniqueSuffix}`;
    const initialPrice = '4500';
    const updatedPrice = '3999';
    const initialValidity = '90';
    const updatedValidity = '120';
    const walletAmount = '1000';
    const serviceLimit = '5';
    const discountPercent = '15';

    await loginAsDemo(page);

    // ── Navigate to Membership / Packages (Finance billing section) ──
    // This is the only UI that supports Type, Wallet, Service Limit, and Discount %
    // when creating a Membership / Package plan.
    await page.goto('/finance?tab=receipts&section=membership');
    await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible();
    await expect(
      page.getByRole('tab', { name: /Membership \/ Packages/i }),
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: /Create Membership \/ Package/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Assign to Customer/i }),
    ).toBeVisible();

    // Enrollment list panel loads (empty or populated — either is a successful page load)
    await expect(
      page.getByText(/Membership \/ Package enrollments|No enrollments yet|records/i).first(),
    ).toBeVisible();

    // ── Create a new Package plan with unique test data ──
    await page.getByRole('button', { name: /Create Membership \/ Package/i }).click();
    const createDialog = page.getByRole('dialog').filter({ hasText: 'Create Membership / Package' });
    await expect(createDialog).toBeVisible();

    // Plan Name preset → Custom (so we can set a unique name)
    await createDialog.locator('select').nth(0).selectOption('custom');
    await createDialog.getByPlaceholder('e.g. Bridal Bliss Bundle').fill(planName);

    // Type = Package (so the plan also appears under Services → Packages for edit/view/status)
    await createDialog.locator('select').nth(1).selectOption('package');

    await createDialog.getByPlaceholder('5000').fill(initialPrice);
    await createDialog.getByPlaceholder('Optional').first().fill(walletAmount);

    // Validity is prefilled; overwrite for deterministic assertions later
    await fieldInput(createDialog, /Validity \(days\)/).fill(initialValidity);
    await fieldInput(createDialog, /Service Limit/).fill(serviceLimit);
    await fieldInput(createDialog, /Discount \(%\)/).fill(discountPercent);

    // Status Active (default) — re-select explicitly
    await createDialog.locator('select').filter({ hasText: 'Active' }).selectOption('active');

    await createDialog
      .getByPlaceholder('Optional plan details...')
      .fill(`QA automation membership package ${uniqueSuffix}`);

    // Included Services — select the first available catalog service
    const firstServiceCheckbox = createDialog.getByRole('checkbox').first();
    await expect(firstServiceCheckbox).toBeVisible();
    await firstServiceCheckbox.check();

    await createDialog.getByRole('button', { name: /^Create Plan$/i }).click();
    await expect(createDialog).toBeHidden();
    await expect(page.getByText('Membership / Package plan created')).toBeVisible();

    // Confirm the new plan is available to assign (plan catalog list)
    await page.getByRole('button', { name: /Assign to Customer/i }).click();
    const assignDialog = page.getByRole('dialog').filter({ hasText: 'Assign to Customer' });
    await expect(assignDialog).toBeVisible();
    await expect(assignDialog.locator('select').nth(1)).toContainText(planName);
    await assignDialog.getByRole('button', { name: /^Cancel$/i }).click();
    await expect(assignDialog).toBeHidden();

    // ── Packages list / search / view / edit / status live under Services → Packages ──
    await page.getByRole('link', { name: 'Services', exact: true }).click();
    await expect(page).toHaveURL(/\/services/);
    await page.getByRole('tab', { name: 'Packages' }).click();
    await expect(page).toHaveURL(/tab=packages/);

    await expect(page.getByText('Bundles & Combos')).toBeVisible();
    await expect(page.getByRole('button', { name: /Create Package/i }).first()).toBeVisible();
    await expect(page.getByText('Total Packages')).toBeVisible();

    // Membership / package list is displayed
    const searchInput = page.getByPlaceholder('Search packages by name or service…');
    await expect(searchInput).toBeVisible();

    // Search for the newly created plan
    await searchInput.fill(planName);
    const card = packageCard(page, planName);
    await expect(card).toBeVisible();
    await expect(card.getByText(`₹${Number(initialPrice).toLocaleString()}`)).toBeVisible();
    await expect(card.getByText(`${initialValidity}d validity`)).toBeVisible();

    // Open package details (View)
    await card.getByRole('button', { name: /^View$/i }).click();
    await expect(page.getByRole('heading', { name: planName, level: 2 })).toBeVisible();
    await expect(page.getByText(`Valid ${initialValidity} days`)).toBeVisible();
    // Click the dimmed backdrop to close the preview overlay
    await page.locator('div.fixed.inset-0.z-50').click({ position: { x: 8, y: 8 } });
    await expect(page.getByRole('heading', { name: planName, level: 2 })).toHaveCount(0);

    // Edit price, validity, and description
    // Action buttons: View | Edit (icon) | Status toggle (icon) — Edit is the middle button
    await card.getByRole('button').nth(1).click();
    const editPanel = page
      .locator('div')
      .filter({ hasText: 'Edit Package' })
      .filter({ has: page.getByRole('button', { name: /Save Changes/i }) })
      .last();
    await expect(editPanel.getByText('Edit Package', { exact: true })).toBeVisible();

    await fieldInput(editPanel, /Offer Price/).fill(updatedPrice);
    await fieldInput(editPanel, /Validity \(days\)/).fill(updatedValidity);
    await fieldTextarea(editPanel, /^Description$/).fill(updatedDescription);

    // Original price higher than offer so discount % is computed and visible on the card
    await fieldInput(editPanel, /Original Price/).fill('5000');

    await editPanel.getByRole('button', { name: /Save Changes/i }).click();
    await expect(page.getByText('Package updated')).toBeVisible();
    await expect(editPanel.getByText('Edit Package', { exact: true })).toHaveCount(0);

    // Verify updated values on the card
    await expect(card.getByText(`₹${Number(updatedPrice).toLocaleString()}`)).toBeVisible();
    await expect(card.getByText(`${updatedValidity}d validity`)).toBeVisible();
    await expect(card.getByText(updatedDescription)).toBeVisible();

    // Soft-delete equivalent: deactivate (no hard-delete action exists for plans)
    await card.getByRole('button').nth(2).click();

    // Inactive packages are hidden unless "Show Inactive" is enabled
    await expect(packageCard(page, planName)).toHaveCount(0);
    await page.getByRole('button', { name: /Show Inactive/i }).click();
    const inactiveCard = packageCard(page, planName);
    await expect(inactiveCard).toBeVisible();
    await expect(inactiveCard.getByText('Inactive', { exact: true })).toBeVisible();

    // Re-activate and verify status flip
    await inactiveCard.getByRole('button').nth(2).click();
    await page.getByRole('button', { name: /Show Inactive/i }).click(); // turn filter off
    await searchInput.fill(planName);
    const activeAgain = packageCard(page, planName);
    await expect(activeAgain).toBeVisible();
    await expect(activeAgain.getByText('Inactive', { exact: true })).toHaveCount(0);

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });

  test('create an Active membership-type plan with wallet and verify it in the plan catalog', async ({ page }) => {
    test.setTimeout(60_000);
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

    const uniqueSuffix = Date.now().toString().slice(-8);
    const membershipName = `QA Membership ${uniqueSuffix}`;

    await loginAsDemo(page);
    await page.goto('/finance?tab=receipts&section=membership');

    await page.getByRole('button', { name: /Create Membership \/ Package/i }).click();
    const createDialog = page.getByRole('dialog').filter({ hasText: 'Create Membership / Package' });
    await expect(createDialog).toBeVisible();

    await createDialog.locator('select').nth(0).selectOption('custom');
    await createDialog.getByPlaceholder('e.g. Bridal Bliss Bundle').fill(membershipName);
    await createDialog.locator('select').nth(1).selectOption('membership');
    await createDialog.getByPlaceholder('5000').fill('7999');
    await createDialog.getByPlaceholder('Optional').first().fill('2500');
    await fieldInput(createDialog, /Validity \(days\)/).fill('365');
    await fieldInput(createDialog, /Discount \(%\)/).fill('20');
    await createDialog.locator('select').filter({ hasText: 'Active' }).selectOption('active');
    await createDialog
      .getByPlaceholder('Optional plan details...')
      .fill(`Membership plan created by Playwright ${uniqueSuffix}`);

    const serviceCheckbox = createDialog.getByRole('checkbox').first();
    await expect(serviceCheckbox).toBeVisible();
    await serviceCheckbox.check();

    await createDialog.getByRole('button', { name: /^Create Plan$/i }).click();
    await expect(createDialog).toBeHidden();
    await expect(page.getByText('Membership / Package plan created')).toBeVisible();

    // Membership-type plans are not listed under Services → Packages; verify via Assign catalog
    await page.getByRole('button', { name: /Assign to Customer/i }).click();
    const assignDialog = page.getByRole('dialog').filter({ hasText: 'Assign to Customer' });
    await expect(assignDialog).toBeVisible();
    const planSelect = assignDialog.locator('select').nth(1);
    await expect(planSelect).toContainText(new RegExp(escapeRegExp(membershipName)));
    await expect(planSelect).toContainText(/membership/i);
    await assignDialog.getByRole('button', { name: /^Cancel$/i }).click();

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
