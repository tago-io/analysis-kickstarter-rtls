import { expect, type Page } from '@playwright/test';
import { test } from '../fixture';

// The Add Site modal's Address is a geocoder (the 2nd text input in the modal):
// Create only submits once a suggestion is selected, so type a query and pick
// the first match.
async function selectGeocodedAddress(page: Page, query: string) {
  const address = page.locator('[data-testid="modal-card"] input[type="text"]').nth(1);
  await address.click();
  await address.fill(query);
  const suggestion = page.locator('[data-testid="selector-options-item"]').first();
  await suggestion.waitFor({ state: 'visible' });
  await suggestion.click();
}

// Sites belong to an organization and are created from the org dashboard's
// "Site List" panel. We use the first organization (the same one the device
// test uses).
test.describe('site creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    // Enter the first organization from the admin Organization List.
    await page.locator('[data-testid="widget-card-content"] a[href*="org_dev="]').first().click();
    await page.waitForURL(/org_dev=/);
    await expect(page.getByText('Site List')).toBeVisible();
  });

  test('creates a new site and shows it in the Site List', async ({ page }) => {
    const siteName = `E2E Site ${Date.now()}`;

    // The Site List "Create New" is an icon button whose label is hidden, so
    // click the button element by its text content.
    const siteWidget = page.locator('[data-testid="widget-card-container"]').filter({ hasText: 'Site List' }).first();
    await siteWidget.locator('button', { hasText: 'Create New' }).first().click();
    await expect(page.getByText('Add Site')).toBeVisible();

    // Name has a stable placeholder; Address is the geocoder.
    await page.getByPlaceholder('enter the site name').fill(siteName);
    await selectGeocodedAddress(page, 'Raleigh');

    // Submit — scope to the modal so we never hit a panel "Create New" button.
    await page.locator('[data-testid="modal-card"]').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Add Site')).not.toBeVisible({ timeout: 20_000 });

    // The Site List paginates, so find the new site via its Name-column search
    // (columns are View, Name, Address, Controls -> nth(1)).
    await siteWidget.locator('[data-testid="widget-card-search-button"]').click();
    await siteWidget.getByPlaceholder('search').nth(1).fill(siteName);
    await expect(page.getByText(siteName)).toBeVisible({ timeout: 30_000 });
  });
});
