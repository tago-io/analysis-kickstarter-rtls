import { defineConfig } from '@playwright/test';

// Two admin interfaces, each its own project: a base URL, a saved session, and
// an auth setup. Run one with `--project=legacy-admin` or `--project=beta-admin`.
const LEGACY_URL = 'https://rtls.tago.run';
const BETA_URL = 'https://rtls.us-e1.beta.tago.run';

export default defineConfig({
  testDir: './e2e',
  // Midscene drives the UI through an LLM. With a reasoning model like GPT-5,
  // each vision call takes ~15-20s and a single step issues several calls, so
  // the default 30s per-test timeout is far too short. Give each test room.
  timeout: 300_000,
  expect: { timeout: 30_000 },
  // Run serially: each interface shares one saved session and one model API key.
  // Parallel workers cause session conflicts, GPT-5 rate contention, and
  // blank-page screenshots from a live app loading under load.
  workers: 1,
  // The live app slows under sustained load ("Registering..." stalls, slow
  // widgets), so retry transient failures.
  retries: 2,
  reporter: [['list'], ['@midscene/web/playwright-reporter']],
  use: {
    trace: 'retain-on-failure',
    viewport: { width: 1280, height: 800 },
  },
  projects: [
    // Each setup logs in once and saves the session; it skips when one exists.
    { name: 'legacy-setup', testMatch: /auth\.legacy\.setup\.ts/ },
    {
      name: 'legacy-admin',
      testDir: './e2e/legacy-admin',
      use: { channel: 'chromium', baseURL: LEGACY_URL, storageState: 'e2e/.auth/legacy.json' },
      dependencies: ['legacy-setup'],
    },
    { name: 'beta-setup', testMatch: /auth\.beta\.setup\.ts/ },
    {
      name: 'beta-admin',
      testDir: './e2e/beta-admin',
      use: { channel: 'chromium', baseURL: BETA_URL, storageState: 'e2e/.auth/beta.json' },
      dependencies: ['beta-setup'],
    },
  ],
});
