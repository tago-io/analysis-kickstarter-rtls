import { expect, type Page } from '@playwright/test';
import { test } from '../fixture';

// Beta Add Sensor modal is a role="dialog". Type / Network / Site are the same
// searchable selects as legacy (selector-options-item); drive them by typing a
// filter and confirming with Enter.
async function selectByFilter(page: Page, placeholder: string, filter: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(filter);
  await page.locator('[data-testid="selector-options-item"]', { hasText: filter }).first().waitFor();
  await input.press('Enter');
}

// A "device" is a "Sensor", installed from the org dashboard's Sensor List panel.
test.describe('beta device (sensor) installation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    await page.locator('a[href*="org_dev="]').first().click();
    await page.waitForURL(/org_dev=/);
    await expect(page.getByText('Sensor List')).toBeVisible();
  });

  test('installs and configures a new sensor and shows it in the Sensor List', async ({ page }) => {
    const sensorName = `BETA Sensor ${Date.now()}`;
    // Synthetic 16-hex EUI. Networks are real LoRaWAN servers, so a real unused
    // EUI may be needed for the device to fully register.
    const eui = `0000000000000000${Date.now().toString(16)}`.slice(-16).toUpperCase();
    const sensorWidget = page.locator('[data-testid^="grid-widget"]').filter({ hasText: 'Sensor List' }).first();

    await sensorWidget.locator('button', { hasText: 'Create New' }).first().click();
    await page.getByPlaceholder('enter the sensor name').waitFor();

    await page.getByPlaceholder('enter the sensor name').fill(sensorName);
    await page.getByPlaceholder('Type or scan your sensor code').fill(eui);
    await selectByFilter(page, 'select the sensor type', 'SenseCAP');
    await selectByFilter(page, 'select one network', 'TTI');
    // Pick the first available site for this org.
    await page.getByPlaceholder("select the sensor's site").click();
    await page.locator('[data-testid="selector-options-item"]').first().click();

    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Add Sensor')).not.toBeVisible({ timeout: 15_000 });

    // The Sensor List paginates; find the new sensor via the Name-column search
    // (Name is the first column -> nth(0)).
    await sensorWidget.getByRole('button', { name: 'Show search' }).click();
    await sensorWidget.getByPlaceholder('search').first().fill(sensorName);
    await expect(page.getByText(sensorName)).toBeVisible({ timeout: 30_000 });
  });
});
