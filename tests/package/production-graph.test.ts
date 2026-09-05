// T025: production dependency graph — exactly the eleven approved direct runtime
// dependencies. Versions are not asserted here: the
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
  // The maintained editor catalog the open control's Visual Studio Code entry
  // is resolved from (T1123, research.md § 3): where an installation puts the
  // editor's launcher stays a third-party fact rather than a table this
  // repository would have to follow the editor's packaging with.
  'env-editor',
  'gunshi',
  // The host builds the H3 app devframe mounts onto, so its `/skills/**`
  // shell fallback can serve the extension-ful detail URLs devframe's own
  // SPA fallback skips. The lockfile resolves this caret range to devframe's
  // own h3, so both resolve one module instance (research.md § 3).
  'h3',
  // The product-owned startup browser helper (FR-001, research.md § 3):
  // devframe's bundled opener stays disabled, so this is the one opener.
  'open',
  'smol-toml',
  'strip-json-comments',
  // Frontmatter delimiter handling, parsed with the `yaml` engine below rather
  // than a second one: a package carrying its own `js-yaml` would give one
  // document two meanings, because js-yaml 3 is YAML 1.1 and `yaml` is 1.2.
  'vfile',
  'vfile-matter',
  // The executable lookup that decides whether the open control offers an
  // editor at all (T1123): what it finds is what the launch runs, so a reader
  // is never offered an application the host could not start.
  'which',
  'yaml',
];

describe('node-only production policy', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  it('declares exactly the eleven approved direct production dependencies', () => {
    // A drive-by dependency addition must fail here until the production-graph
    // decision (research.md § 3) is explicitly revisited.
    expect(Object.keys(manifest.dependencies ?? {}).sort()).toEqual(
      [...APPROVED_PRODUCTION_DEPENDENCIES].sort(),
    );
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
