import { test as base } from '@playwright/test';
import { PlaywrightAiFixture } from '@midscene/web';
import type { PlayWrightAiFixtureType } from '@midscene/web';

// Midscene prints a one-time "waitForNetworkIdle is skipped for Playwright"
// warning via console.warn, and exposes no option to disable it. We rely on
// explicit Playwright waits instead, so drop just that message to keep the test
// output clean; every other warning still passes through.
const originalWarn = console.warn.bind(console);
console.warn = (...args: unknown[]) => {
  if (args.some((arg) => typeof arg === 'string' && arg.includes('waitForNetworkIdle is skipped'))) {
    return;
  }
  originalWarn(...args);
};

export const test = base.extend<PlayWrightAiFixtureType>(
  PlaywrightAiFixture({
    cache: { id: 'default-cache' },
  }),
);
