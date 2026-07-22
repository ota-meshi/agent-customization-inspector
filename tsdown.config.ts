// tsdown server-bundle configuration. Bundles the project-owned CLI entry
// directly into `dist/` as Node ESM with a fixed `.mjs` output name (no
// staging copy); declared npm dependencies stay external so the package
// manifest describes exactly what the CLI loads at runtime.
import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: {
    cli: 'src/server/cli.ts',
  },
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
