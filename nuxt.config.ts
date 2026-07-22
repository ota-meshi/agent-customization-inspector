// Nuxt client SPA configuration. The browser application is a static,
// same-origin bundle served by the local Node host: no SSR, no CDN, and
// root-absolute assets so the one shell also boots nested routes such as
// /files/<fileId>. Auto-imports and implicit components are disabled so every
// dependency of the security-reviewed client code is an explicit import.
import { defineNuxtConfig } from 'nuxt/config';

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
  imports: {
    autoImport: false,
  },
  components: false,
  compatibilityDate: '2026-07-20',
});
