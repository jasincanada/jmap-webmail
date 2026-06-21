import { test, expect } from '@playwright/test';

test.describe('Dedupe smoke', () => {
  test('dedupe route requires authentication', async ({ page }) => {
    await page.goto('/en/dedupe', { waitUntil: 'networkidle' });
    await expect(page).toHaveURL(/\/(en\/)?login/, { timeout: 20000 });
  });

  test('login form reachable before dedupe QA', async ({ page }) => {
    await page.goto('/en/login', { waitUntil: 'networkidle' });
    await expect(page.locator('#username')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('#password')).toBeVisible({ timeout: 20000 });
  });
});