// tsdown server-bundle configuration. Bundles the project-owned CLI entry
// directly into `dist/` as Node ESM with a fixed `.mjs` output name (no
// staging copy); declared npm dependencies stay external so the package
// manifest describes exactly what the CLI loads at runtime.
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/server/cli.ts',
  },
  // Registry data the product never reads — evidence citations, vendor
  // locators, and FR/QR policy references — is folded away for the packaged
  // CLI, leaving `[]` and `null` in its slots. The substitution fails silently if the flag is ever spelled as
  // a member expression, so the package suite asserts the built artifact
  // really carries none (src/shared/registries/maintenance-data.ts).
  define: { __ACI_SHIP_MAINTENANCE_DATA__: 'false' },
  format: 'esm',
  platform: 'node',
  fixedExtension: true,
  sourcemap: false,
  dts: false,
  outDir: 'dist',
  // The pipeline's own clean step owns dist/ removal; cleaning here would
  // wipe the Nuxt output already written to dist/public.
  clean: false,
  deps: {
    skipNodeModulesBundle: true,
  },
});
