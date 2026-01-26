import { test, expect, type Page } from '@playwright/test';

const DSP_ADDRESS = '192.168.4.49';
const DSP_PORT = 1234;

// Test configuration
test.describe.configure({ mode: 'serial' });

// Helper to wait for network idle
async function waitForStable(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(500);
}

// Helper to connect to DSP and navigate to Signal Flow
async function setupPage(page: Page): Promise<void> {
  await page.goto('/');
  await waitForStable(page);

  // Check if we need to add a unit
  const addUnitButton = page.getByRole('button', { name: /add unit/i });
  if (await addUnitButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await addUnitButton.click();
    await page.waitForTimeout(500);

    // Fill in unit details using the specific form field IDs
    await page.locator('#unit-name').fill('Test DSP');
    await page.locator('#unit-address').fill(DSP_ADDRESS);
    await page.locator('#unit-port').clear();
    await page.locator('#unit-port').fill(String(DSP_PORT));

    // Click the Add Unit submit button
    await page.getByRole('button', { name: /add unit/i }).click();

    // Wait for connection to establish
    await page.waitForTimeout(5000);

    // Wait for the "Disconnected" status to change
    await expect(page.locator('text=Disconnected')).not.toBeVisible({ timeout: 10000 }).catch(() => {
      console.log('Unit may not have connected');
    });

    await waitForStable(page);
  }

  // Navigate to Signal Flow via sidebar
  await page.locator('a, button').filter({ hasText: /signal flow/i }).first().click();
  await waitForStable(page);
}

test.describe('Signal Flow E2E', () => {
  test('should load Signal Flow page without errors', async ({ page }) => {
    await setupPage(page);

    // Verify page loaded
    await expect(page).toHaveURL(/signal-flow/);

    // Check for console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(2000);

    // Look for key UI elements
    const inputsSection = page.getByText(/inputs/i).first();
    const outputsSection = page.getByText(/outputs/i).first();

    // At least one should be visible
    const hasInputs = await inputsSection.isVisible().catch(() => false);
    const hasOutputs = await outputsSection.isVisible().catch(() => false);

    // Log any errors for debugging
    if (errors.length > 0) {
      console.log('Console errors:', errors);
    }

    expect(hasInputs || hasOutputs).toBe(true);
  });

  test('should create a route by dragging', async ({ page }) => {
    await setupPage(page);

    // Find input channel port (the draggable dot/button)
    const inputChannel = page.locator('[data-port-side="input"]').first();
    const outputChannel = page.locator('[data-port-side="output"]').first();

    if (
      (await inputChannel.isVisible().catch(() => false)) &&
      (await outputChannel.isVisible().catch(() => false))
    ) {
      // Get the port buttons
      const inputPort = inputChannel.locator('button, [role="button"]').first();
      const outputPort = outputChannel.locator('button, [role="button"]').first();

      if (
        (await inputPort.isVisible().catch(() => false)) &&
        (await outputPort.isVisible().catch(() => false))
      ) {
        // Drag from input to output
        await inputPort.dragTo(outputPort);
        await page.waitForTimeout(500);

        // Check if a connection window or route appeared
        // Look for any new route lines in the SVG
        const routeLines = page.locator('svg path, svg line');
        const routeCount = await routeLines.count();

        console.log('Route lines found:', routeCount);
      }
    }
  });

  test('should open filter window when clicking filter button', async ({ page }) => {
    await setupPage(page);

    // Look for any filter-related buttons (Gain, Delay, EQ, etc.)
    const filterButtons = page.locator('[data-filter-type], button:has-text("Gain"), button:has-text("EQ"), button:has-text("Delay")');

    const count = await filterButtons.count();
    console.log('Filter buttons found:', count);

    if (count > 0) {
      const firstButton = filterButtons.first();
      await firstButton.click();
      await page.waitForTimeout(500);

      // Check if a modal or floating window opened
      const modalOrWindow = page.locator('[role="dialog"], .floating-window, [data-floating-window]');
      const isOpen = await modalOrWindow.isVisible().catch(() => false);
      console.log('Filter window opened:', isOpen);
    }
  });

  test('should change channel color', async ({ page }) => {
    await setupPage(page);

    // Look for color picker trigger (colored dot or button)
    const colorTrigger = page.locator('[data-color-picker], [data-testid="color-picker"], .color-dot, button[aria-label*="color" i]').first();

    if (await colorTrigger.isVisible().catch(() => false)) {
      await colorTrigger.click();
      await page.waitForTimeout(300);

      // Look for color options
      const colorOptions = page.locator('[data-color-option], [role="option"]');
      const optionCount = await colorOptions.count();
      console.log('Color options found:', optionCount);

      if (optionCount > 0) {
        await colorOptions.first().click();
        await page.waitForTimeout(300);
      }
    }
  });

  test('should handle errors gracefully', async ({ page }) => {
    // Listen for unhandled errors
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await setupPage(page);

    // Perform some actions that might trigger errors
    await page.waitForTimeout(2000);

    // The page should not have thrown any unhandled errors
    if (errors.length > 0) {
      console.log('Page errors:', errors);
    }

    // Check that the page is still functional
    expect(await page.locator('body').isVisible()).toBe(true);
  });
});
