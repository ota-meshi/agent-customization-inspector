// Package entry-point verifier (CI/release gate, `verify:package`).
// dist/ is produced solely by the pipeline (clean → nuxt build → tsdown), so
// its contents are owned by those tools. This gate checks only the two entry
// points the package contract depends on: the SPA shell served by the
// devframe host (dist/public/index.html) and the Node server bundle
// (dist/cli.mjs, the package.json.bin target). Anything further would
// re-verify sibling build output the same pipeline just produced.
import { stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_PACKAGE_ENTRIES = Object.freeze([
  'public/index.html',
  'cli.mjs',
]);

/**
 * @param {{ distDir: string }} options
 * @returns {Promise<{ verifiedEntries: string[] }>}
 */
export async function verifyPackageFiles({ distDir }) {
  const dist = resolve(distDir);
  for (const entry of REQUIRED_PACKAGE_ENTRIES) {
    const target = join(dist, ...entry.split('/'));
    let stats;
    try {
      stats = await stat(target);
    } catch {
      throw new Error(`dist/ is missing the required entry ${entry}`);
    }
    if (!stats.isFile()) {
      throw new Error(`dist/ required entry is not a regular file: ${entry}`);
    }
  }
  return { verifiedEntries: [...REQUIRED_PACKAGE_ENTRIES] };
}

if (import.meta.main) {
  const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  await verifyPackageFiles({ distDir: join(rootDir, 'dist') });
}
