import { expect, type Page } from '@playwright/test';
import { test } from '../fixture';

// Type / Network / Site are TagoIO RUN searchable selects. GPT-5's visual
// grounding is unreliable at picking a specific option (it tends to click the
// first/highlighted one), so drive them deterministically: focus, type a
// filter, wait for the match to render, then confirm with Enter.
async function selectByFilter(page: Page, placeholder: string, filter: string) {
  const input = page.getByPlaceholder(placeholder);
  await input.click();
  await input.fill(filter);
  await page.locator('[data-testid="selector-options-item"]', { hasText: filter }).first().waitFor();
  await input.press('Enter');
}

// In the RTLS Kickstarter UI a "device" is called a "Sensor". You install one
// from an organization's dashboard: the "Sensor List" panel has a "Create New"
// button that opens the "Add Sensor" form (Name, Type, Network, EUI, Site).
// Devices live under Org -> Site, which is why the form requires a Site.
test.describe('device (sensor) installation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    // Session must be valid — we should not land on the auth page.
    await expect(page).not.toHaveURL(/\/auth\//);

    // Enter the first organization in the admin Organization List. Its "View"
    // control is a link carrying an `org_dev` query param.
    await page.locator('[data-testid="widget-card-content"] a[href*="org_dev="]').first().click();
    await page.waitForURL(/org_dev=/);
    await expect(page.getByText('Sensor List')).toBeVisible();
  });

  test('Add Sensor form exposes all required fields with a consistent layout', async ({ page, aiTap, aiAssert }) => {
    // The page has several "Create New" buttons (Site List, Sensor List,
    // Equipment list) — locate the right one semantically.
    await aiTap('the "Create New" button in the top-right header of the "Sensor List" panel');

    // The modal shell paints before its body; wait for a field to render so the
    // AI screenshot sees the populated form, not an empty modal.
    await expect(page.getByPlaceholder('enter the sensor name')).toBeVisible();

    // Validate the result of the click: the install form is shown with every
    // required field present.
    await aiAssert(
      'an "Add Sensor" modal is open showing required fields labeled "Name", "Type", "Network", "EUI", and "Site", plus a "Create" button in the bottom-right',
    );

    // Visual-consistency assertion (layout + colors). Keep it to stable,
    // unambiguous properties: GPT-5's reading of tiny details is inconsistent
    // between runs (e.g. it may call the required marker a "dot" or an
    // "asterisk"), so assert "red required indicator" rather than its shape.
    await aiAssert(
      'the Add Sensor modal uses a consistent two-column layout: the section descriptions "Sensor Info" and "Site Info" sit on the left, white input fields are aligned down the right, each required field label is marked with a small red required indicator, and a single dark "Create" button sits in the bottom-right corner',
    );
  });

  test('installs and configures a new sensor and shows it in the Sensor List', async ({ page }) => {
    const sensorName = `E2E Sensor ${Date.now()}`;
    // Synthetic 16-hex EUI. NOTE: every network option is a real LoRaWAN server,
    // so the backend may reject an unregistered EUI. If this fails at submit,
    // that is a genuine finding: installation needs a valid, unused EUI. Swap in
    // a real device EUI to exercise the happy path.
    const eui = `0000000000000000${Date.now().toString(16)}`.slice(-16).toUpperCase();

    // Open the install form from the Sensor List panel.
    await page
      .locator('[data-testid="widget-card-container"]')
      .filter({ hasText: 'Sensor List' })
      .first()
      .getByText('Create New', { exact: false })
      .first()
      .click();
    await page.getByPlaceholder('enter the sensor name').waitFor();

    // Name + EUI have stable placeholders -> deterministic Playwright fills.
    await page.getByPlaceholder('enter the sensor name').fill(sensorName);
    await page.getByPlaceholder('Type or scan your sensor code').fill(eui);

    // Type / Network: deterministic searchable-select fills (see selectByFilter).
    await selectByFilter(page, 'select the sensor type', 'SenseCAP');
    await selectByFilter(page, 'select one network', 'TTI');

    // Site names are org-specific -> pick the first available option.
    await page.getByPlaceholder("select the sensor's site").click();
    await page.locator('[data-testid="selector-options-item"]').first().click();

    // Submit — scope to the modal so we never hit a panel "Create New" button.
    await page.locator('[data-testid="modal-card"]').getByRole('button', { name: 'Create', exact: true }).click();

    // Validate the result, not just the click.
    await expect(page.getByText('Add Sensor')).not.toBeVisible({ timeout: 15_000 });

    // The Sensor List paginates, so a new sensor may not be on page 1. Use the
    // list's Name-column search (the first column) to find it — a backend search,
    // so it surfaces the sensor regardless of page or refresh lag.
    const sensorList = page.locator('[data-testid="widget-card-container"]').filter({ hasText: 'Sensor List' }).first();
    await sensorList.locator('[data-testid="widget-card-search-button"]').click();
    await sensorList.getByPlaceholder('search').first().fill(sensorName);
    await expect(page.getByText(sensorName)).toBeVisible({ timeout: 30_000 });
  });
});
