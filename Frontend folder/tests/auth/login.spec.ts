import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Authentication', () => {
  test('Successful Login with OTP', async ({ page }) => {
    await loginAsDemo(page);

    await expect(page).toHaveURL(/\/(?:\?.*)?$/);
    await expect(page.getByText('BillVyapp').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /good (morning|afternoon|evening)/i }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });
});
