import { expect, type Page } from '@playwright/test';

export const DEMO_EMAIL = 'manager@starrkuts.com';
export const DEMO_PASSWORD = 'manager@1234';

async function readDevOtp(page: Page): Promise<string> {
  const hint = page.getByTestId('dev-otp-hint');
  await expect(hint).toBeVisible({ timeout: 10000 });
  const text = (await hint.textContent()) ?? '';
  const otp = text.match(/\d{6}/)?.[0];
  if (!otp) {
    throw new Error(
      'Login OTP not available. Set LOGIN_OTP_RETURN_IN_RESPONSE=true in backend .env (development only).',
    );
  }
  return otp;
}

async function completeOtpStep(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: /enter verification code/i })).toBeVisible({
    timeout: 20000,
  });

  const otp = await readDevOtp(page);
  const otpInput = page.locator('[data-slot="input-otp"]');
  await otpInput.click();
  await otpInput.press('Control+A');
  await otpInput.press('Backspace');
  await page.keyboard.type(otp, { delay: 30 });

  await expect(page.getByRole('button', { name: /verify & sign in/i })).toBeEnabled();
  await page.getByRole('button', { name: /verify & sign in/i }).click();

  // If another parallel test invalidated this challenge, surface as error for retry.
  const error = page.locator('p.text-red-400');
  const leftLogin = page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15000 });
  const sawError = error.waitFor({ state: 'visible', timeout: 15000 }).then(async () => {
    const message = ((await error.textContent()) ?? '').trim();
    throw new Error(`OTP verification failed: ${message || 'unknown error'}`);
  });

  void leftLogin.catch(() => undefined);
  void sawError.catch(() => undefined);

  await Promise.race([leftLogin, sawError]);
}

async function attemptLogin(page: Page): Promise<'success' | 'error'> {
  await page.goto('/login');
  await page.getByPlaceholder('you@salon.com').fill(DEMO_EMAIL);
  await page.locator('input[type="password"]').fill(DEMO_PASSWORD);
  await page.getByRole('button', { name: /^(sign in|continue)$/i }).click();

  const errorLocator = page.locator('p.text-red-400');
  const otpHeading = page.getByRole('heading', { name: /enter verification code/i });

  const outcome = await Promise.race([
    page
      .waitForURL((url) => !url.pathname.includes('/login'), { timeout: 20000 })
      .then(() => 'success' as const),
    otpHeading.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'otp' as const),
    errorLocator.waitFor({ state: 'visible', timeout: 20000 }).then(() => 'error' as const),
  ]);

  if (outcome === 'otp') {
    try {
      await completeOtpStep(page);
      return 'success';
    } catch {
      return 'error';
    }
  }

  return outcome;
}

export async function loginAsDemo(page: Page) {
  let lastError = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    const outcome = await attemptLogin(page);
    if (outcome === 'success') {
      await expect(page).not.toHaveURL(/\/login/, { timeout: 20000 });
      await expect(
        page.getByRole('heading', { name: /good (morning|afternoon|evening)/i }),
      ).toBeVisible({ timeout: 20000 });
      return;
    }
    lastError = ((await page.locator('p.text-red-400').textContent().catch(() => null)) ?? '').trim();
    await page.waitForTimeout(1500 * attempt);
  }

  throw new Error(`Demo login failed after retries${lastError ? `: ${lastError}` : ''}`);
}

/** API helper: password + OTP → access token (for request-context tests). */
export async function apiLoginWithOtp(
  request: import('@playwright/test').APIRequestContext,
  baseURL = 'http://localhost:3000',
): Promise<string> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const loginRes = await request.post(`${baseURL}/api/auth/login`, {
      data: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
    });
    if (!loginRes.ok()) {
      throw new Error(`API login failed: ${loginRes.status()} ${await loginRes.text()}`);
    }
    const loginBody = await loginRes.json();
    const challengeId = loginBody?.data?.challengeId as string | undefined;
    const otp = loginBody?.data?.otp as string | undefined;
    if (!challengeId || !otp) {
      throw new Error(
        'API login did not return challengeId/otp. Enable LOGIN_OTP_RETURN_IN_RESPONSE=true in development.',
      );
    }

    const verifyRes = await request.post(`${baseURL}/api/auth/login/verify-otp`, {
      data: { challengeId, otp },
    });
    if (verifyRes.ok()) {
      const verifyBody = await verifyRes.json();
      const accessToken = verifyBody?.data?.accessToken as string | undefined;
      if (!accessToken) {
        throw new Error('API verify-otp did not return accessToken');
      }
      return accessToken;
    }

    if (attempt === 3) {
      throw new Error(`API verify-otp failed: ${verifyRes.status()} ${await verifyRes.text()}`);
    }
  }

  throw new Error('API login with OTP failed');
}
