import { test, expect } from '@playwright/test';

test.describe('3D Universe Engine — Production E2E Suite', () => {
  test('boots without console errors and mounts WebGL Canvas', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    page.on('pageerror', (exception) => {
      consoleErrors.push(exception.message);
    });

    await page.goto('/');

    // Wait for the WebGL Canvas to mount
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible({ timeout: 15000 });

    // Assert that the HUD tag is displayed
    await expect(page.locator('.hud-tag')).toBeVisible();

    // Verify zero console errors
    expect(consoleErrors).toEqual([]);
  });

  test('navigates through planets and updates HUD', async ({ page }) => {
    await page.goto('/');

    // Open Planets dropdown
    await page.getByRole('button', { name: 'Planets' }).click();

    // Select Jupiter
    await page.getByRole('button', { name: 'Jupiter' }).click();

    // Verify HUD reflects Jupiter
    await expect(page.getByText('JUPITER', { exact: false })).toBeVisible();
    await expect(page.getByText('Great Red Spot', { exact: false })).toBeVisible();
  });

  test('toggles modes: Galaxy, Flight, Compare, and Photo', async ({ page }) => {
    await page.goto('/');

    // 1. Switch to Galaxy Mode
    await page.getByRole('button', { name: 'Galaxy' }).click();
    await expect(page.locator('.hud-tag')).toHaveText('GALAXY');

    // 2. Switch to Free Flight
    await page.getByRole('button', { name: 'Flight' }).click();
    await expect(page.getByText('MANUAL FLIGHT ENGAGED')).toBeVisible();

    // Exit Flight via ESC
    await page.keyboard.press('Escape');

    // 3. Open Compare Mode
    await page.getByRole('button', { name: 'Compare' }).click();
    await expect(page.getByText('CELESTIAL COMPARISON ENGINE')).toBeVisible();
    // Toggle True Scale
    await page.getByRole('button', { name: 'VISUAL SCALE' }).click();
    await expect(page.getByText('TRUE SCALE: ACTIVE')).toBeVisible();

    // 4. Open Photo Mode
    await page.getByTitle('Photo Mode').click();
    await expect(page.getByText('PHOTO LAB')).toBeVisible();
    await expect(page.getByRole('button', { name: 'SAVE SNAPSHOT' })).toBeVisible();
  });

  test('opens and interacts with Command Palette', async ({ page }) => {
    await page.goto('/');

    // Open Command Palette via search button
    await page.getByTitle('Command Palette (Cmd+K)').click();
    const searchInput = page.getByPlaceholder('Search celestial bodies');
    await expect(searchInput).toBeVisible();

    // Search for Mars
    await searchInput.fill('Mars');
    await expect(page.getByRole('button', { name: 'Go to Mars' })).toBeVisible();

    // Close with Escape
    await page.keyboard.press('Escape');
    await expect(searchInput).not.toBeVisible();
  });

  test('opens and operates Scale Explorer', async ({ page }) => {
    await page.goto('/');

    // Open Scale Explorer
    await page.getByRole('button', { name: 'Scale' }).click();
    await expect(page.getByText('COSMIC SCALE EXPLORATION')).toBeVisible();

    // Expand to next scale step
    await page.getByRole('button', { name: 'Expand Scale' }).click();
    await expect(page.getByText('The Earth-Moon System')).toBeVisible();
  });

  test('opens settings modal and toggles options', async ({ page }) => {
    await page.goto('/');

    // Open Settings
    await page.getByTitle('Engine Settings').click();
    await expect(page.getByText('SYSTEM SETTINGS')).toBeVisible();

    // Select ULTRA graphics tier
    await page.getByRole('button', { name: 'ULTRA' }).click();
    await expect(page.getByText('Manual ULTRA quality override.')).toBeVisible();
  });

  test('responsive viewport on mobile layout', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();

    // Planets and Explore buttons remain accessible
    await expect(page.getByRole('button', { name: 'Planets' })).toBeVisible();
  });
});
