import { test, expect } from '@playwright/test';

async function waitForLoginForm(page: import('@playwright/test').Page) {
  await page.goto('/en/login', { waitUntil: 'networkidle' });
  await expect(page.locator('#username')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('#password')).toBeVisible({ timeout: 20000 });
}

test.describe('Login', () => {
  test('loads login page', async ({ page }) => {
    await waitForLoginForm(page);
  });

  test('shows error on invalid credentials', async ({ page }) => {
    await waitForLoginForm(page);
    await page.locator('#username').fill('invalid@test.com');
    await page.locator('#password').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();
    await expect(
      page.locator('.text-red-600, .text-red-400, [role="alert"]'),
    ).toBeVisible({ timeout: 15000 });
  });

  test.skip('logs in with valid credentials', async ({ page }) => {
    await waitForLoginForm(page);
    await page.locator('#username').fill(process.env.TEST_USER || '');
    await page.locator('#password').fill(process.env.TEST_PASS || '');
    await page.locator('button[type="submit"]').click();
    await expect(page).toHaveURL(/\/en\/?$/, { timeout: 15000 });
  });
});