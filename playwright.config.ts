// Playwright certification configuration. The three projects run the complete
// primary-workflow and accessibility suite against the exact Chromium,
// Firefox, and WebKit revisions installed by the pinned Playwright 1.61.1
// release. These pinned revisions are the reproducible automated release
// baseline — a deterministic certification matrix — not an exhaustive list of
// user browsers and not an assertion that the startup helper selects one of
// them.
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
