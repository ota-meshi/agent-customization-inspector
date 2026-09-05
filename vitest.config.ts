// Vitest configuration with distinct named projects. `tests/integration/security/`
// is owned by the integration project, like every other directory under it: the
// suites are separated by what they test, not by the word in a path. The
// `security` project owns `tests/security/` alone — the Global
// zero-activation suite (T996), whose gate is the `test:security` script and
// its CI job.
//
// Every project here has tests. `passWithNoTests` is not set, so a suite that
// stops matching its own files fails instead of reporting a green run that
// executed nothing.
import { defineConfig } from 'vitest/config';

/**
 * The bound for a case that does real filesystem work: every case under
 * `tests/integration/` builds a fixture tree on disk and scans it, some of them
 * twice. Both projects that run those files carry it, so one file's bound does
 * not depend on which project ran it.
 *
 * Vitest's own default is 5 s, and the Windows runners are where it runs out.
 * `repository-scan.test.ts`'s 118 cases measure 2.2 s and 2.6 s on Ubuntu,
 * 3.9 s and 4.3 s on macOS, and 9.3 s on one Windows runner — while the other
 * Windows runner took 36.8 s over the same commit, and the one case there that
 * crossed 5 s failed. A runner four times slower than its sibling is what the
 * certification matrix has to survive, so the bound is set where that fits
 * rather than where the fast machines land.
 */
const FILESYSTEM_SUITE_TIMEOUT_MS = 20_000;

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
    projects: [
      {
        test: {
          name: 'unit',
          // Node, so a server, CLI, or shared module that reaches for `window`
          // or `document` fails here instead of passing on a DOM it will not
          // have in production. The browser tests under `tests/unit/app/`
          // each declare `@vitest-environment happy-dom` for themselves.
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'contract',
          environment: 'node',
          include: ['tests/contract/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          testTimeout: FILESYSTEM_SUITE_TIMEOUT_MS,
        },
      },
      {
        test: {
          name: 'security',
          environment: 'node',
          include: ['tests/security/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'package',
          environment: 'node',
          include: ['tests/package/**/*.test.ts'],
        },
      },
      {
        test: {
          // The bilingual cross-artifact gate. Its own directory rather than a
          // file under `tests/contract/`: every suite here is separated by
          // where its tests live, so a documentation test inside the contract
          // root would run in the contract and coverage jobs too, leaving this
          // job verifying nothing those had not already verified — unless two
          // projects carried an exclusion for one file (T1041).
          name: 'documentation',
          environment: 'node',
          include: ['tests/documentation/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'performance',
          // Node like the package project. The one smoke pass — packaged CLI
          // driven through a rendered Chromium page over the 100,000-entry
          // fixture — runs in `globalSetup`, once, and both suites read that
          // single run's record (T183, T918). No
          // Vitest timeout governs `globalSetup`, so the pass bounds itself:
          // every in-page wait, launch, and read-back inside the harness
          // carries its own deadline. The files stay serialized so no second
          // workload contends with a timed measurement or races devframe's
          // free-port selection, exactly what playwright.config.ts
          // serializes the e2e suite to avoid.
          environment: 'node',
          include: ['tests/performance/**/*.test.ts'],
          globalSetup: ['tests/performance/global-run.ts'],
          fileParallelism: false,
        },
      },
      {
        test: {
          name: 'coverage',
          environment: 'node',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/contract/**/*.test.ts',
            'tests/integration/**/*.test.ts',
          ],
          testTimeout: FILESYSTEM_SUITE_TIMEOUT_MS,
        },
      },
    ],
  },
});
