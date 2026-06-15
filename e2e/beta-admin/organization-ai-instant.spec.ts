import { expect } from '@playwright/test';
import { test } from '../fixture';

// AI-driven org creation, "detailed" version: instant actions (aiTap/aiInput)
// with deepLocate, one intent per call, plus aiWaitFor for async steps. Per the
// Midscene docs this is the most reliable AI approach (3-10x faster than
// auto-planning, deepLocate locates twice for accuracy). It gets through the
// easy clicks and inputs but still fails on the precise interactions (selecting
// the geocoder suggestion, hitting the exact submit), so the create never
// completes. Compare with organization-ai.spec.ts (the aiAct version).
test.describe('beta organization creation (AI-driven, instant actions)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    // Wait for the Organization List to load before the AI acts.
    await expect(page.locator('a[href*="org_dev="]').first()).toBeVisible();
  });

  // fixme: documented to fail — even detailed instant actions miss the geocoder/submit (see MIDSCENE_EVALUATION.md).
  test.fixme('creates an organization with Midscene instant actions', async ({ aiTap, aiInput, aiWaitFor, aiAssert }) => {
    const orgName = `BETA AI Org ${Date.now()}`;

    await aiTap('the "Create New" button in the top-right header of the Organization List panel', { deepLocate: true });
    await aiInput('the "Name" text field in the Create Organization dialog', { value: orgName });
    await aiInput('the "Address" text field in the Create Organization dialog', { value: 'Raleigh' });
    // The geocoder suggestions load async; wait for them before tapping.
    await aiWaitFor('an address suggestion has appeared in the dropdown list below the Address field');
    await aiTap('the first address suggestion in the dropdown list that opened below the Address field', { deepLocate: true });
    await aiTap('the dark "Create" button at the bottom-right of the Create Organization dialog', { deepLocate: true });
    // Wait for the submit to complete before moving on.
    await aiWaitFor('the Create Organization dialog has closed and the Organization List is shown again');

    // Verify, still via Midscene: open the column search, filter by name, assert.
    await aiTap('the magnifying-glass search icon in the Organization List header', { deepLocate: true });
    await aiInput('the search box directly under the "Name" column header of the Organization List', { value: orgName, deepLocate: true });
    await aiAssert(`the Organization List shows a row for an organization named "${orgName}"`);
  });
});
