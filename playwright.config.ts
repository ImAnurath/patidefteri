import { defineConfig } from '@playwright/test';
try { process.loadEnvFile('.env'); } catch { /* optional */ }

// One source of truth: the dev server is waited on at the same origin the tests navigate to.
const baseURL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL, trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: baseURL, reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
