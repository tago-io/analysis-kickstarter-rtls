import { expect } from '@playwright/test';
import { test } from '../fixture';

// "Creating a user" in the RTLS Kickstarter means inviting one into an
// organization. The Users section is org-scoped, so we scope it (via org_dev) to
// the first organization, the same one the device test uses, which has sites.
// The invite form needs a Site, so the chosen org must have at least one.
test.describe('user creation', () => {
  test('invites a new user and shows them in the Users list', async ({ page, aiAssert }) => {
    const stamp = Date.now();
    const userName = `E2E User ${stamp}`;
    const userEmail = `e2e-user-${stamp}@example.com`;

    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);

    // Reuse the first org's org_dev to scope the Users page to that org. Wait
    // for the Organization List to load so the link is present.
    const firstOrgLink = page.locator('[data-testid="widget-card-content"] a[href*="org_dev="]').first();
    await firstOrgLink.waitFor({ state: 'visible' });
    const href = await firstOrgLink.getAttribute('href');
    const orgDev = href?.match(/org_dev=([^&]+)/)?.[1] ?? null;
    expect(orgDev).toBeTruthy();

    await page.goto(`/_global_users_?org_dev=${orgDev}`);
    await page.waitForLoadState('load');
    await expect(page.getByRole('button', { name: 'Invite User' })).toBeVisible();

    await page.getByRole('button', { name: 'Invite User' }).click();
    await page.getByPlaceholder('john doe').waitFor();

    // Stable placeholders -> deterministic fills. "User type" defaults to
    // "End-User", so we leave it as-is.
    await page.getByPlaceholder('john doe').fill(userName);
    await page.getByPlaceholder('john@doe.com').fill(userEmail);
    await page.getByPlaceholder('+551999999999').fill('+15555550100');

    // Site is a searchable select -> pick the first available option for this org.
    await page.getByPlaceholder('select the user site').click();
    await page.locator('[data-testid="selector-options-item"]').first().click();

    // Submit — scope to the modal so we never hit the "Invite User" page button.
    await page.locator('[data-testid="modal-card"]').getByRole('button', { name: 'Create', exact: true }).click();

    // After submit the modal shows "Registering..." while the backend creates
    // the user; allow generous time for the modal to close. Then wait on the
    // unique email and let the AI confirm the row by the user's name.
    await expect(page.getByPlaceholder('john doe')).not.toBeVisible({ timeout: 60_000 });
    await expect(page.getByText(userEmail)).toBeVisible({ timeout: 60_000 });
    await aiAssert(`the Users table contains a row for a user named "${userName}"`);
  });
});
