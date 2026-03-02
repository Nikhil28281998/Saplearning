// @ts-check
const { defineConfig } = require('@playwright/test');

/**
 * Playwright Configuration for SAP Fiori Learning Management App
 * 
 * Connects to your already-running Chrome via CDP (Chrome DevTools Protocol).
 * 
 * SETUP: 
 *   1. Run: .\scripts\launch-chrome-debug.ps1
 *   2. Log in to SAP if needed
 *   3. Run tests: npx playwright test
 */
module.exports = defineConfig({
  testDir: './tests',
  fullyParallel: false,        // Sequential — we share one browser
  forbidOnly: true,
  retries: 0,
  workers: 1,                  // Single worker — one browser connection
  reporter: [
    ['html', { open: 'never' }],
    ['list']                   // Console output  
  ],
  timeout: 60000,              // 60s per test (SAP can be slow)
  expect: {
    timeout: 15000             // 15s for assertions
  },
  use: {
    ignoreHTTPSErrors: true,   // SAP internal certs
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  /* Tests connect via CDP in beforeAll — no browser launch config needed */
});
