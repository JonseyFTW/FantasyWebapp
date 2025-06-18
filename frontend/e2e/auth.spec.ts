import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toHaveText('Sign In');
    await expect(page.locator('button[data-testid="google-login"]')).toBeVisible();
  });

  test('should redirect to dashboard after login', async ({ page }) => {
    // Mock authentication for testing
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ user: { id: '1', email: 'test@example.com' } }),
      });
    });

    await page.goto('/login');
    await page.click('button[data-testid="google-login"]');
    
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('h1')).toHaveText('Dashboard');
  });

  test('should handle login errors gracefully', async ({ page }) => {
    await page.route('**/api/auth/**', route => {
      route.fulfill({
        status: 400,
        body: JSON.stringify({ error: 'Authentication failed' }),
      });
    });

    await page.goto('/login');
    await page.click('button[data-testid="google-login"]');
    
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-message"]')).toHaveText('Authentication failed');
  });
});