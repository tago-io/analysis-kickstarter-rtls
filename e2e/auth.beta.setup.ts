import { test as setup } from '@playwright/test';
import { existsSync } from 'node:fs';
import { loginAndSaveSession } from './auth-login';

const SESSION_PATH = 'e2e/.auth/beta.json';

// Saves a session for the beta admin. Skips when one already exists, so you
// log in only once. Delete e2e/.auth/beta.json to force a fresh login.
setup('authenticate (beta)', async () => {
  setup.skip(existsSync(SESSION_PATH), `reusing saved session at ${SESSION_PATH}`);
  await loginAndSaveSession('https://rtls.us-e1.beta.tago.run/auth/login', SESSION_PATH);
});
