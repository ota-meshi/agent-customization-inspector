// Fixed clean step: removes only the root-resolved package-owned prior
// `.output/` and `dist/` trees. It never touches any other path. `fs.rm`
// follows POSIX rm semantics — a symlinked tree is removed as the link
// itself, never by descending into its target — so no extra link handling
// exists here.
import { rm } from 'node:fs/promises';
import { join, resolve } from 'node:path';

export const CLEANED_TREES = Object.freeze(['.output', 'dist']);

/**
 * @param {string} rootDir
 * @returns {Promise<void>}
 */
export async function cleanBuildOutput(rootDir) {
  for (const tree of CLEANED_TREES) {
    // force:true makes a missing tree a silent no-op.
    await rm(join(resolve(rootDir), tree), { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const rootDir = resolve(import.meta.dirname, '..');
  await cleanBuildOutput(rootDir);
}
