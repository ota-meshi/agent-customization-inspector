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
  // One worker for the whole matrix, not just within a file. Each test
  // launches the real packaged CLI, and every host has devframe select a free
  // local port; the selection releases the port it probed before the host
  // binds it, so concurrent workers make that selection a race, which is
  // exactly the nondeterminism a certification baseline must not have.
  workers: 1,
  forbidOnly: true,
  retries: 0,
  // The default 30 s, doubled. A test's timeout bounds its fixtures too, and
  // the first test of a run is the one charged for launching the browser:
  // WebKit took 11.1 s and 13.7 s of it on the certification runners against
  // about a second for every test after it, and once the whole 30 s, which
  // failed the run in fixture setup. With `retries: 0` a cold start that runs
  // long is a certification failure rather than a slow test, so the bound is
  // set where the launch fits.
  timeout: 60_000,
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
