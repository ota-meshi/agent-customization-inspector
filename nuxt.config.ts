// Nuxt client SPA configuration. The browser application is a static,
// same-origin bundle served by the local Node host: no SSR, no CDN, and
// root-absolute assets so the one shell also boots nested routes such as
// /skills/detail/<source>/<source-relative path>. Auto-imports and implicit
// components are disabled so every
// dependency of the security-reviewed client code is an explicit import.
import { defineNuxtConfig } from 'nuxt/config';
import Icons from 'unplugin-icons/vite';
import { thirdPartyNoticesPlugin } from './scripts/third-party-notices-plugin.mjs';

export default defineNuxtConfig({
  ssr: false,
  modules: ['@nuxt/eslint'],
  // All production source lives under src/: the browser SPA in src/app/ and
  // the Node-only CLI/host beside it. Nuxt only ever reads src/app/.
  srcDir: 'src/app',
  app: {
    baseURL: '/',
    buildAssetsDir: '/_nuxt/',
    cdnURL: '',
  },
  nitro: {
    preset: 'static',
    // The browser bundle is emitted straight into the published tree: the
    // build pipeline validates it in place instead of copying a staging
    // tree (Implementation simplicity policy — no copy steps). Build
    // metadata (nitro.json) stays in .output/, outside the published dist/.
    output: {
      dir: '.output',
      publicDir: 'dist/public',
    },
  },
  vite: {
    // The same substitution `tsdown.config.ts` performs for the CLI: the SPA
    // imports the shared registries (the consent preview renders excluded-rule
    // IDs), and without this define every citation URL, review date,
    // paraphrase, and policy reference would ship in the browser bundle. The
    // package suite asserts the emitted assets carry none
    // (tests/package/verify-package-files.test.ts), because the substitution
    // fails silently (src/shared/registries/maintenance-data.ts).
    define: { __ACI_SHIP_MAINTENANCE_DATA__: 'false' },
    plugins: [
      // Each `~icons/<collection>/<name>` import becomes a Vue component whose
      // template is that icon's own SVG, resolved from the installed
      // `@iconify-json/*` collection while the bundle is built. The icon data
      // is in the emitted bytes, so the page fetches nothing and no icon
      // runtime ships — the arrangement FR-022 requires, and the reason the
      // Iconify API-backed runtime is not used. Components stay explicitly
      // imported like every other dependency of this application.
      Icons({ compiler: 'vue3' }),
      // The client bundle inlines third-party code — Monaco, Vue, the Nuxt
      // runtime, the devframe client, the icon data above — so their license
      // notices have to ship with it. The plugin derives the list from the
      // finished module graph, so no hand-maintained list can fall behind a
      // dependency change (FR-043).
      thirdPartyNoticesPlugin(),
    ],
  },
  imports: {
    autoImport: false,
  },
  components: false,
  compatibilityDate: '2026-07-20',
});
