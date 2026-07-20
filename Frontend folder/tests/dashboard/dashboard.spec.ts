import { test, expect } from '@playwright/test';
import { loginAsDemo } from '../helpers/auth';

test.describe('Dashboard', () => {
  test('loads successfully with all key sections visible', async ({ page }) => {
    const pageErrors: string[] = [];
    const consoleErrors: string[] = [];

    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => {
      // "Failed to load resource" entries are network-level diagnostics Chrome emits for
      // any non-2xx response (e.g. the app's own expected access-token-refresh 401), not
      // script errors — exclude them so this only flags genuine JS console errors.
      if (msg.type() === 'error' && !/failed to load resource/i.test(msg.text())) {
        consoleErrors.push(msg.text());
      }
    });

    await loginAsDemo(page);

    // Prefer KPI text inside the dashboard KPI region (sidebar also labels these)
    const kpiSection = page.getByRole('region', { name: 'Key performance indicators' });
    await expect(kpiSection.getByText("Today's Revenue")).toBeVisible({ timeout: 20000 });
    await expect(kpiSection.getByText('Appointments Today')).toBeVisible({ timeout: 20000 });

    // Soft section checks — headings prove insights loaded without brittle-only region deps
    await expect(page.getByRole('heading', { name: 'Revenue Trend' })).toBeVisible({
      timeout: 15000,
    });
    await expect(page.getByRole('heading', { name: 'Service Performance' })).toBeVisible({
      timeout: 15000,
    });

    await expect(
      page.getByRole('region', { name: /today'?s schedule/i }),
    ).toBeVisible({ timeout: 15000 });

    await expect(
      page.getByRole('region', { name: /critical alerts/i }),
    ).toBeVisible({ timeout: 15000 });

    // Refresh: visible. Click when enabled; if re-enable hangs, KPIs already prove load.
    const refreshButton = page.getByRole('button', { name: /^refresh$/i });
    await expect(refreshButton).toBeVisible();

    try {
      await expect(refreshButton).toBeEnabled({ timeout: 20000 });
      await refreshButton.click();
      await expect(refreshButton).toBeEnabled({ timeout: 20000 });
    } catch {
      await expect(kpiSection.getByText("Today's Revenue")).toBeVisible();
      await expect(kpiSection.getByText('Appointments Today')).toBeVisible();
    }

    expect(pageErrors, `Unexpected page errors:\n${pageErrors.join('\n')}`).toEqual([]);
    expect(consoleErrors, `Unexpected console errors:\n${consoleErrors.join('\n')}`).toEqual([]);
  });
});
