import { expect } from '@playwright/test';
import { test } from '../fixture';

// AI-driven org creation, "auto-planning" version: one high-level aiAct() that
// the model plans and executes. This is the least code, but it stalls to the
// test timeout and never completes (same as the legacy aiAct spec). Compare with
// organization-ai-instant.spec.ts (the detailed instant-actions version).
test.describe('beta organization creation (AI-driven with aiAct)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('load');
    await expect(page).not.toHaveURL(/\/auth\//);
    // Wait for the Organization List to load before the AI acts.
    await expect(page.locator('a[href*="org_dev="]').first()).toBeVisible();
  });

  // fixme: documented to fail — aiAct cannot drive this flow (see MIDSCENE_EVALUATION.md).
  test.fixme('creates an organization using high-level AI actions', async ({ aiAct, aiAssert }) => {
    const orgName = `BETA AI Org ${Date.now()}`;

    // One instruction; Midscene plans and runs the individual sub-steps.
    await aiAct(
      `Create a new organization from the Organization List: click the "Create New" button to open the ` +
        `"Create Organization" dialog, type "${orgName}" into the Name field, type "Raleigh" into the ` +
        `Address field and select the first suggestion from the address dropdown, then click the ` +
        `"Create" button to save it.`,
    );

    // The list paginates, so filter to the new org by name, still via AI, then confirm it.
    await aiAct(
      `In the Organization List, open the column search and type "${orgName}" into the Name column's ` +
        `search box to filter the table to that organization.`,
    );
    await aiAssert(`the Organization List shows a row for an organization named "${orgName}"`);
  });
});
