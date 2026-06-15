import { test as setup } from '@playwright/test';
import { existsSync } from 'node:fs';
import { loginAndSaveSession } from './auth-login';

const SESSION_PATH = 'e2e/.auth/legacy.json';

// Saves a session for the legacy admin. Skips when one already exists, so you
// log in only once. Delete e2e/.auth/legacy.json to force a fresh login.
setup('authenticate (legacy)', async () => {
  setup.skip(existsSync(SESSION_PATH), `reusing saved session at ${SESSION_PATH}`);
  await loginAndSaveSession('https://rtls.tago.run/auth/login', SESSION_PATH);
});
