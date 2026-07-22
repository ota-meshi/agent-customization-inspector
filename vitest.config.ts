// Vitest configuration with distinct named projects. The dedicated security
// project owns exactly `tests/security/**/*.test.ts` and every other project
// excludes that root so each root security test runs exactly once;
// `tests/integration/security/` stays owned by the integration project.
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Suites arrive family-by-family; an empty project must not fail its
    // already-configured CI job before its first test lands.
    passWithNoTests: true,
    coverage: {
      provider: 'v8',
      reportsDirectory: 'coverage',
    },
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'happy-dom',
          include: ['tests/unit/**/*.test.ts'],
          exclude: ['tests/security/**'],
        },
      },
      {
        test: {
          name: 'contract',
          environment: 'node',
          include: ['tests/contract/**/*.test.ts'],
          exclude: ['tests/security/**'],
        },
      },
      {
        test: {
          name: 'integration',
          environment: 'node',
          include: ['tests/integration/**/*.test.ts'],
          exclude: ['tests/security/**'],
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
          exclude: ['tests/security/**'],
        },
      },
      {
        test: {
          name: 'performance',
          environment: 'node',
          include: ['tests/performance/**/*.test.ts'],
          exclude: ['tests/security/**'],
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
          exclude: ['tests/security/**'],
        },
      },
    ],
  },
});
