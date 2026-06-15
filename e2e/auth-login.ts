import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';

// Headful, one-time manual login (credentials + captcha) that saves the session
// to sessionPath. No-op if the session already exists.
export async function loginAndSaveSession(loginUrl: string, sessionPath: string): Promise<void> {
  if (existsSync(sessionPath)) {
    return;
  }
  mkdirSync('e2e/.auth', { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(loginUrl, { waitUntil: 'load' });
  // Legacy login uses a username field; the beta login uses an email field.
  await page.waitForSelector('input[autocomplete="username"], input[type="email"]');

  console.log(`\nLog in manually at ${loginUrl} (credentials + captcha).`);
  console.log(`The session is saved to ${sessionPath} once you reach the dashboard.\n`);

  await page.waitForURL((url) => !url.href.includes('/auth/'), { timeout: 120_000 });
  await page.waitForLoadState('load');
  await context.storageState({ path: sessionPath });
  console.log(`\nSession saved to ${sessionPath}`);

  await browser.close();
}
