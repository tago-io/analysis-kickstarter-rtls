import { expect } from '@playwright/test';
import { test } from '../fixture';

// Organizations are created from the admin "Organization List" toolbar via
// "Create New", which opens the "Create Organization" modal (Name + Address).
test.describe('organization creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    // Session must be valid — we should not land on the auth page.
    await expect(page).not.toHaveURL(/\/auth\//);
    await expect(page).toHaveURL(/\/_global_admin_/);
    // Wait for the Organization List to finish loading before interacting,
    // otherwise "Create New" can be clicked before the widget is ready.
    await expect(page.locator('[data-testid="widget-card-content"] a[href*="org_dev="]').first()).toBeVisible();
  });

  test('creates a new organization and shows it in the Organization List', async ({ page, aiAssert }) => {
    const orgName = `E2E Org ${Date.now()}`;

    await page.getByRole('button', { name: 'Create New' }).click();
    await expect(page.getByText('Create Organization')).toBeVisible();

    // Name has a stable placeholder.
    await page.getByPlaceholder('e.g. TagoIo').fill(orgName);

    // Address is a geocoder (the unlabeled second text input): typing shows
    // suggestions, and Create only submits once a suggestion is picked — the raw
    // typed text has no coordinates. Type a query and select the first match.
    const address = page.locator('[data-testid="modal-card"] input[type="text"]').nth(1);
    await address.click();
    await address.fill('Raleigh');
    const suggestion = page.locator('[data-testid="selector-options-item"]').first();
    await suggestion.waitFor({ state: 'visible' });
    await suggestion.click();

    // Submit — scope to the modal so we never hit the toolbar "Create New".
    await page.locator('[data-testid="modal-card"]').getByRole('button', { name: 'Create', exact: true }).click();

    // Modal closes on success.
    await expect(page.getByText('Create Organization')).not.toBeVisible({ timeout: 20_000 });

    // The new org is appended to the end of a paginated list, so it is not on
    // page 1. Use the Organization List's per-column Name search to find it (a
    // backend search, so it surfaces the org regardless of which page it is on).
    const orgList = page.locator('[data-testid="widget-card-container"]').filter({ hasText: 'Organization List' }).first();
    await orgList.locator('[data-testid="widget-card-search-button"]').click();
    // Column order is View, Name, Address, Controls -> the Name search is nth(1).
    await orgList.getByPlaceholder('search').nth(1).fill(orgName);

    // Validate the result: the new org shows up, confirmed by the AI.
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 30_000 });
    await aiAssert(`the Organization List shows a row named "${orgName}"`);
  });
});
