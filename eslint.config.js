// ESLint flat configuration. The Nuxt module (`@nuxt/eslint`) generates the
// project-aware base config into `.nuxt/eslint.config.mjs` during
// `nuxt prepare`; this file layers repository-wide ignores for generated
// output on top of it. Run `pnpm run dev:prepare` once after install so the
// generated base exists.
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt()
  .prepend({
    ignores: [
      'node_modules/**',
      '.nuxt/**',
      '.output/**',
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'test-results/**',
    ],
  })
  .append({
    // Every regular expression carries the u (or v) flag so it runs in
    // Unicode mode: proper surrogate handling and strict escape rules. The
    // lint layer owns this policy; there is no runtime re-check.
    name: 'agent-customization-inspector/require-unicode-regexp',
    files: ['**/*.{ts,mts,cts,vue,js,mjs}'],
    rules: {
      'require-unicode-regexp': 'error',
    },
  })
  .append({
    // Architectural boundary (T022, spec.md QR-003): all inspected-source
    // filesystem I/O lives in the single inspection module directory
    // src/server/inspection/, so no other production module may import a
    // Node.js filesystem API. There is no separate admission service; the
    // directory boundary itself is the rule. Tests and scripts are outside
    // the boundary.
    name: 'agent-customization-inspector/inspection-io-boundary',
    files: ['src/**/*.{ts,mts,cts,vue}'],
    ignores: ['src/server/inspection/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['fs', 'fs/*', 'node:fs', 'node:fs/*'],
              message:
                'Inspected-source filesystem I/O lives only under src/server/inspection/ (QR-003).',
            },
          ],
        },
      ],
    },
  });
