import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Global Search', () => {
  test('header does not show Search anything control', async ({ page }) => {
    await loginAsDemo(page);
    await page.goto('/');

    await expect(page.getByRole('button', { name: /search anything/i })).toHaveCount(0);
    await page.keyboard.press('Control+k');
    await expect(
      page.getByPlaceholder('Search customers, appointments, bills...'),
    ).toHaveCount(0);
  });
});
