// ESLint flat configuration. The Nuxt module (`@nuxt/eslint`) generates the
// project-aware base config into `.nuxt/eslint.config.mjs` during
// `nuxt prepare`; this file layers repository-wide ignores for generated
// output on top of it. Run `pnpm run dev:prepare` once after install so the
// generated base exists.
import stylistic from '@stylistic/eslint-plugin';
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
    files: ['**/*.{ts,tsx,mts,cts,vue,js,jsx,mjs,cjs}'],
    rules: {
      'require-unicode-regexp': 'error',
    },
  })
  .append({
    // Architectural boundary (T022, spec.md QR-003): all inspected-source
    // filesystem I/O lives in the single inspection module directory
    // src/server/inspection/, so no other production module may import a
    // Node.js filesystem API. There is no separate admission service; the
    // directory boundary itself is the rule. This lint layer catches every
    // static import and every string-literal dynamic import of the closed fs
    // specifier set; an obfuscated dynamic import string (a computed or
    // concatenated specifier) is an ordinary implementation bug owned by
    // review, not something a static linter can guarantee against. A
    // no-substitution template-literal specifier cannot slip through: the
    // `@stylistic/quotes` rule below forbids it repo-wide (forcing it to a
    // plain string this selector then matches). Tests and scripts are outside
    // the boundary.
    name: 'agent-customization-inspector/inspection-io-boundary',
    files: ['src/**/*.{ts,tsx,mts,cts,vue,js,jsx,mjs,cjs}'],
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
      // no-restricted-imports covers only static imports, so a dynamic
      // import() of the closed fs specifier set is restricted here too.
      'no-restricted-syntax': [
        'error',
        {
          selector:
            "ImportExpression > Literal[value='fs'], ImportExpression > Literal[value='node:fs'], ImportExpression > Literal[value='fs/promises'], ImportExpression > Literal[value='node:fs/promises']",
          message:
            'Inspected-source filesystem I/O lives only under src/server/inspection/ (QR-003).',
        },
      ],
    },
  })
  .append({
    // Standard quote style: single quotes, and a no-substitution template
    // literal must be written as a plain string (`allowTemplateLiterals:
    // 'never'`). The codebase already follows this, so it is a no-op today;
    // its purpose here is that a dynamic `import(`node:fs`)` can no longer
    // pass — it is reported as a quote violation and, once rewritten as a
    // string, the fs import restriction above catches it. This replaces a
    // hand-written `no-restricted-syntax` selector with the standard rule
    // (ESLint 10 dropped the core `quotes` rule, so `@stylistic/quotes`
    // supplies it).
    name: 'agent-customization-inspector/quotes',
    files: ['**/*.{ts,tsx,mts,cts,vue,js,jsx,mjs,cjs}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/quotes': ['error', 'single', { allowTemplateLiterals: 'never', avoidEscape: true }],
    },
  });
