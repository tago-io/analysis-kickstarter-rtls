import { expect, type Page } from '@playwright/test';
import { test } from '../fixture';

// Beta Add Site modal is a role="dialog" (no modal-card). Address is a geocoder
// (the 2nd text input): type a query and pick the first suggestion.
async function selectGeocodedAddress(page: Page, query: string) {
  const address = page.getByRole('dialog').locator('input[type="text"]').nth(1);
  await address.click();
  await address.fill(query);
  const suggestion = page.locator('[data-testid="selector-options-item"]').first();
  await suggestion.waitFor({ state: 'visible' });
  await suggestion.click();
}

test.describe('beta site creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    // Enter the first organization (its View link carries org_dev).
    await page.locator('a[href*="org_dev="]').first().click();
    await page.waitForURL(/org_dev=/);
    await expect(page.getByText('Site List')).toBeVisible();
  });

  test('creates a new site and shows it in the Site List', async ({ page }) => {
    const siteName = `BETA Site ${Date.now()}`;
    const siteWidget = page.locator('[data-testid^="grid-widget"]').filter({ hasText: 'Site List' }).first();

    // "Create New" is an icon button whose label is hidden; click it by text.
    await siteWidget.locator('button', { hasText: 'Create New' }).first().click();
    await expect(page.getByText('Add Site')).toBeVisible();

    await page.getByPlaceholder('enter the site name').fill(siteName);
    await selectGeocodedAddress(page, 'Raleigh');

    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Add Site')).not.toBeVisible({ timeout: 20_000 });

    // The Site List paginates; find the new site via the Name-column search
    // (columns View, Name, Address, Controls -> nth(1)).
    await siteWidget.getByRole('button', { name: 'Show search' }).click();
    await siteWidget.getByPlaceholder('search').nth(1).fill(siteName);
    await expect(page.getByText(siteName)).toBeVisible({ timeout: 30_000 });
  });
});
