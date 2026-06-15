import { expect } from '@playwright/test';
import { test } from '../fixture';

// Beta admin. Same flows as legacy on the same backend, but a redesigned UI:
// modals are role="dialog" (no modal-card), panels are grid-widget-*, and the
// search button is labeled "Show search". The org "View" links, the
// selector-options-item dropdowns, the placeholders, and the 4-column search
// all carry over from legacy.
test.describe('beta organization creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    // Wait for the Organization List to load (org rows carry an org_dev link).
    await expect(page.locator('a[href*="org_dev="]').first()).toBeVisible();
  });

  test('creates a new organization and shows it in the Organization List', async ({ page }) => {
    const orgName = `BETA Org ${Date.now()}`;
    const dialog = page.getByRole('dialog');

    await page.getByRole('button', { name: 'Create New' }).first().click();
    await expect(page.getByText('Create Organization')).toBeVisible();

    await page.getByPlaceholder('e.g. TagoIo').fill(orgName);

    // Address is a geocoder (the 2nd text input): type a query, pick the first
    // suggestion, otherwise Create will not submit.
    const address = dialog.locator('input[type="text"]').nth(1);
    await address.click();
    await address.fill('Raleigh');
    const suggestion = page.locator('[data-testid="selector-options-item"]').first();
    await suggestion.waitFor({ state: 'visible' });
    await suggestion.click();

    await dialog.getByRole('button', { name: 'Create', exact: true }).click();
    await expect(page.getByText('Create Organization')).not.toBeVisible({ timeout: 20_000 });

    // The new org paginates off page 1; find it via the Name-column search
    // (columns View, Name, Address, Controls -> nth(1)).
    const orgWidget = page.locator('[data-testid^="grid-widget"]').filter({ hasText: 'Organization List' }).first();
    await orgWidget.getByRole('button', { name: 'Show search' }).click();
    await orgWidget.getByPlaceholder('search').nth(1).fill(orgName);
    await expect(page.getByText(orgName)).toBeVisible({ timeout: 30_000 });
  });
});
