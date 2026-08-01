// Vitest configuration with distinct named projects. `tests/integration/security/`
// is owned by the integration project, like every other directory under it: the
// suites are separated by what they test, not by the word in a path.
//
// Every project here has tests. `passWithNoTests` is not set, so a suite that
// stops matching its own files fails instead of reporting a green run that
// executed nothing — and a project whose tests are not written yet is absent
// rather than present and empty: it arrives with the task that writes its first
// ones (T996 for security, T183 for performance, T1041 for the documentation
// gate).
import { defineConfig } from 'vitest/config';

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
          name: 'coverage',
          environment: 'node',
          include: [
            'tests/unit/**/*.test.ts',
            'tests/contract/**/*.test.ts',
            'tests/integration/**/*.test.ts',
          ],
        },
      },
    ],
  },
});
