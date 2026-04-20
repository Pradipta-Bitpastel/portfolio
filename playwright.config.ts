import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests',
  timeout: 60000,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'artifacts/e2e-1.json' }]],
  use: {
    baseURL: 'http://localhost:3010',
    viewport: { width: 1440, height: 900 },
    headless: true,
    ignoreHTTPSErrors: true,
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'desktop-chromium', use: { browserName: 'chromium' } },
    { name: 'mobile', use: { browserName: 'chromium', viewport: { width: 375, height: 812 } } },
  ],
  webServer: {
    command: 'PORT=3010 npx next start -p 3010',
    url: 'http://localhost:3010',
    reuseExistingServer: true,
    timeout: 120000,
  },
});
