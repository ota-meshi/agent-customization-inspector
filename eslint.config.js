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
      '.tmp/**',
      // Other sessions' worktree checkouts of this repository; linting
      // through them would report on files mid-edit under another session.
      '.claude/worktrees/**',
    ],
  })
  // Config entries are named for the file unit they cover, one entry per
  // unit: a rule joins the entry whose `files` it applies to.
  .append({
    name: 'agent-customization-inspector/all-sources',
    files: ['**/*.{ts,tsx,mts,cts,vue,js,jsx,mjs,cjs}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      // Every regular expression carries the u (or v) flag so it runs in
      // Unicode mode: proper surrogate handling and strict escape rules. The
      // lint layer owns this policy; there is no runtime re-check.
      'require-unicode-regexp': 'error',
      // Standard quote style: single quotes, and a no-substitution template
      // literal must be written as a plain string (`allowTemplateLiterals:
      // 'never'`). The codebase already follows this, so it is a no-op today;
      // its purpose here is that a dynamic `import(`node:fs`)` can no longer
      // pass — it is reported as a quote violation and, once rewritten as a
      // string, the fs import restriction below catches it. This replaces a
      // hand-written `no-restricted-syntax` selector with the standard rule
      // (ESLint 10 dropped the core `quotes` rule, so `@stylistic/quotes`
      // supplies it).
      '@stylistic/quotes': [
        'error',
        'single',
        { allowTemplateLiterals: 'never', avoidEscape: true },
      ],
    },
  })
  .append({
    name: 'agent-customization-inspector/vue-sources',
    files: ['**/*.vue'],
    rules: {
      // Prettier owns formatting and always writes void elements self-closed;
      // the base config's `void: 'never'` would flag every formatted
      // `<input />`. The rule stays on, in agreement with Prettier's output,
      // so element style remains linted rather than unchecked.
      'vue/html-self-closing': [
        'error',
        { html: { void: 'always', normal: 'always', component: 'always' } },
      ],
    },
  })
  .append({
    name: 'agent-customization-inspector/typescript-sources',
    files: ['**/*.{ts,tsx,mts,cts,vue}'],
    rules: {
      // Class fields are declared as fields, never as constructor parameter
      // properties (AGENTS.md Class and interface policy): a parameter
      // property hides a declaration inside a signature, so the class body no
      // longer lists what the class holds, and there is no place for the
      // field's own doc comment.
      '@typescript-eslint/parameter-properties': 'error',
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
    // `@stylistic/quotes` rule in the all-sources entry above forbids it repo-wide (forcing it to a
    // plain string this selector then matches). Tests and scripts are outside
    // the boundary.
    name: 'agent-customization-inspector/src-outside-inspection',
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
  });
