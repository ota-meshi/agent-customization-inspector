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
      // The one project with a retry. WebKit's Linux build crashes on these
      // runners — its ThreadedCompositor and SkiaGPUWorker threads segfault a
      // handful of times per run (ci.yml § the browser suite step) — and a
      // crash that lands on a navigation surfaces as `page.goto: WebKit
      // encountered an internal error`. That is the browser process failing
      // rather than anything this product did: the same navigation succeeds
      // hundreds of times in the same run, and the commit it first failed on
      // changed one doc comment. Upstream treats it as environmental, closed
      // it without a fix, and documents no launch option or environment
      // variable that stops it
      // (https://github.com/microsoft/playwright/issues/34450).
      //
      // One retry, and not a tolerance for flakiness: a case that fails twice
      // still fails the certification, and a case that passes on the retry is
      // reported as flaky rather than as a pass, so a product flake is still
      // read off the run. Chromium and Firefox keep the `retries: 0` above,
      // neither having this failure mode here.
      retries: 1,
      use: { ...devices['Desktop Safari'] },
    },
  ],
});
