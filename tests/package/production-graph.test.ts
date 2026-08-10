// T025: production dependency graph — exactly the eight approved direct runtime
// dependencies and the absence of `open`. Versions are not asserted here: the
// committed lockfile already fixes every resolved version and its integrity, so
// re-stating them in a test would duplicate the lockfile rather than protect a
// user. devframe's transitive tree is owned by devframe and the lockfile.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

/**
 * The approved direct production dependencies (research.md § 3). Membership is
 * the reviewed decision; the resolved version of each member is owned by
 * `pnpm-lock.yaml`.
 */
const APPROVED_PRODUCTION_DEPENDENCIES: readonly string[] = [
  'devframe',
  'gunshi',
  // The host builds the H3 app devframe mounts onto, so its `/skills/**`
  // shell fallback can serve the extension-ful detail URLs devframe's own
  // SPA fallback skips. The lockfile resolves this caret range to devframe's
  // own h3, so both resolve one module instance (research.md § 3).
  'h3',
  'jsonc-parser',
  'smol-toml',
  // Frontmatter delimiter handling, parsed with the `yaml` engine below rather
  // than a second one: a package carrying its own `js-yaml` would give one
  // document two meanings, because js-yaml 3 is YAML 1.1 and `yaml` is 1.2.
  'vfile',
  'vfile-matter',
  'yaml',
];

describe('node-only production policy', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  it('declares exactly the eight approved direct production dependencies', () => {
    // A drive-by dependency addition must fail here until the production-graph
    // decision (research.md § 3) is explicitly revisited.
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(
      [...APPROVED_PRODUCTION_DEPENDENCIES].sort(),
    );
  });

  it('never declares open in any dependency section', () => {
    // Manifest-level guard only. Whether `open` is reachable through the
    // production closure (including optional edges) is asserted against the
    // lockfile in node-only-policy.test.ts; a lockfile substring probe here
    // would duplicate that check and, in pnpm v9 format, never match.
    expect(manifest.dependencies?.['open']).toBeUndefined();
    expect(manifest.devDependencies?.['open']).toBeUndefined();
  });

  it('declares no lifecycle build or download hook', () => {
    const scripts = manifest.scripts ?? {};
    for (const hook of [
      'preinstall',
      'install',
      'postinstall',
      'prepare',
      'prepack',
      'postpack',
      'prepublish',
      'prepublishOnly',
    ]) {
      expect(scripts[hook]).toBeUndefined();
    }
  });
});
