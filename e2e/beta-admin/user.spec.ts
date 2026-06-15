import { expect } from '@playwright/test';
import { test } from '../fixture';

// "Creating a user" means inviting one into an organization. The beta Users
// page is a dashboard (its id comes from the sidebar nav), scoped to an org via
// org_dev. The chosen org needs at least one site, so we use the first org.
test.describe('beta user creation', () => {
  test('invites a new user and shows them in the Users list', async ({ page }) => {
    const stamp = Date.now();
    const userName = `BETA User ${stamp}`;
    const userEmail = `beta-user-${stamp}@example.com`;

    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);

    // First org's org_dev, and the Users dashboard id from the sidebar nav.
    const firstOrgLink = page.locator('a[href*="org_dev="]').first();
    await firstOrgLink.waitFor({ state: 'visible' });
    const orgDev = (await firstOrgLink.getAttribute('href'))?.match(/org_dev=([^&]+)/)?.[1] ?? null;
    expect(orgDev).toBeTruthy();
    const usersHref = await page.locator('a[href*="/dashboards/"]').filter({ hasText: 'Users' }).first().getAttribute('href');
    expect(usersHref).toBeTruthy();

    await page.goto(`${usersHref}?org_dev=${orgDev}`);
    await page.waitForLoadState('load');
    await expect(page.getByRole('button', { name: 'Invite User' })).toBeVisible();

    await page.getByRole('button', { name: 'Invite User' }).click();
    await page.getByPlaceholder('john doe').waitFor();

    // Stable placeholders. "User type" defaults to "End-User", so leave it.
    await page.getByPlaceholder('john doe').fill(userName);
    await page.getByPlaceholder('john@doe.com').fill(userEmail);
    await page.getByPlaceholder('+551999999999').fill('+15555550100');
    // Pick the first available site for this org.
    await page.getByPlaceholder('select the user site').click();
    await page.locator('[data-testid="selector-options-item"]').first().click();

    await page.getByRole('dialog').getByRole('button', { name: 'Create', exact: true }).click();

    // "Registering..." can take a while; wait for the modal to close, then for
    // the unique email to show up in the Users list.
    await expect(page.getByPlaceholder('john doe')).not.toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(userEmail)).toBeVisible({ timeout: 60_000 });
  });
});
