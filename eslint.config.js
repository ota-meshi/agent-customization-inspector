// ESLint flat configuration. The Nuxt module (`@nuxt/eslint`) generates the
// project-aware base config into `.nuxt/eslint.config.mjs` during
// `nuxt prepare`; this file layers repository-wide ignores for generated
// output on top of it. Run `pnpm run dev:prepare` once after install so the
// generated base exists.
import withNuxt from './.nuxt/eslint.config.mjs';

export default withNuxt().prepend({
  ignores: [
    'node_modules/**',
    '.nuxt/**',
    '.output/**',
    'dist/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
  ],
});
