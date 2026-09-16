import { defineConfig } from '@playwright/test';
try { process.loadEnvFile('.env'); } catch { /* optional */ }

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  use: { baseURL: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev', url: 'http://localhost:3000', reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
});
