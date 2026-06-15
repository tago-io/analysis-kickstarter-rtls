import { expect } from '@playwright/test';
import { test } from '../fixture';

test.describe('dashboard overview', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    // Confirm session is valid — should not be on the auth page
    await expect(page).not.toHaveURL(/\/auth\//);
    // The Organization List widget fetches its rows after page load; wait for a
    // row link so AI assertions never fire on a still-loading blank canvas.
    await expect(page.locator('[data-testid="widget-card-content"] a[href*="org_dev="]').first()).toBeVisible();
  });

  test('organization list renders with expected columns and rows', async ({ page, aiAssert, aiQuery }) => {
    // Deterministic: correct section and tab
    await expect(page).toHaveURL(/\/_global_admin_/);
    await expect(page.getByRole('button', { name: 'Overview' })).toBeVisible();

    // Semantic: heading and table structure
    await aiAssert('the heading "Organization List" is visible in the main content area above the table');
    await aiAssert('the table has column headers labeled "Name", "Address", and "Controls" in the main content area');

    // Semantic: extract rows and assert the list is populated
    const orgs = await aiQuery<{ name: string; address: string }[]>(
      'extract all organization names and addresses from the rows in the Organization List table'
    );
    expect(orgs.length).toBeGreaterThan(0);
  });

  test('sidebar shows all main navigation sections', async ({ page, aiAssert }) => {
    await aiAssert('the left sidebar contains navigation items for Admin, Organization, Site, Users, Alerts, and Report');
  });

  test('Create New button is visible in the organization list toolbar', async ({ page, aiAssert }) => {
    await aiAssert('a "Create New" button is visible in the top right area of the Organization List section');
  });

  test('account dropdown appears when avatar button is clicked', async ({ page, aiTap, aiAssert }) => {
    await page.locator('[data-testid="navbar-account-button"]').click();
    await aiAssert('a dropdown menu is visible showing "My account" and "Sign out" options near the top right corner');
  });
});
