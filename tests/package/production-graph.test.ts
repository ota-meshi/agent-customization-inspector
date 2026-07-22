// T025: production dependency graph — exactly the five direct runtime
// dependencies at their approved locked versions with registry integrity,
// and the absence of `open`. devframe's transitive tree is owned by devframe
// and the lockfile; only the direct set is pinned here. The assertions read
// pnpm-lock.yaml directly in CI; there is no separate production-graph
// script or evidence file (checks live in tests).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');
const LOCKFILE = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');

/** The plan-approved exact direct production dependency set (research.md § 3). */
const APPROVED_PRODUCTION_DEPENDENCIES: Readonly<Record<string, string>> = {
  devframe: '0.7.5',
  gunshi: '0.37.0',
  'jsonc-parser': '3.3.1',
  'smol-toml': '1.7.0',
  yaml: '2.9.0',
};

/**
 * Extracts the registry integrity for one exact `name@version` entry from
 * pnpm-lock.yaml. The test stays dependency-free by reading the fixed,
 * indentation-anchored grammar of lockfileVersion 9 directly; the exact
 * version is part of the header lookup because the dev tree may lock other
 * versions of the same package (devframe is also a devtools transitive), and
 * a lockfile-format major bump fails loudly here rather than silently
 * matching the wrong entry.
 */
function readLockedIntegrity(
  lockfileText: string,
  packageName: string,
  version: string,
): string {
  const headerPattern = new RegExp(
    `^  ${packageName.replaceAll('/', '\\/')}@${version.replaceAll('.', '\\.')}:$`,
    'mu',
  );
  const headerMatch = headerPattern.exec(lockfileText);
  if (headerMatch === null) {
    throw new Error(`pnpm-lock.yaml has no packages entry for ${packageName}@${version}`);
  }
  const rest = lockfileText.slice(headerMatch.index + headerMatch[0].length);
  const integrityMatch = /^\s+resolution:\s+\{integrity: ([^}]+)\}/mu.exec(rest);
  if (integrityMatch?.[1] === undefined) {
    throw new Error(`pnpm-lock.yaml has no integrity for ${packageName}@${version}`);
  }
  return integrityMatch[1];
}

describe('production dependency graph', () => {
  it('locks the exact approved versions with registry integrity', () => {
    // A drive-by dependency bump must fail here until the compatibility
    // baseline decision (research.md § 3) is explicitly revisited.
    for (const [name, version] of Object.entries(APPROVED_PRODUCTION_DEPENDENCIES)) {
      expect(readLockedIntegrity(LOCKFILE, name, version)).toMatch(/^sha512-/u);
    }
  });

  it('fails for a package missing from the lockfile', () => {
    expect(() => readLockedIntegrity(LOCKFILE, 'left-pad', '1.0.0')).toThrow(
      /no packages entry/u,
    );
  });
});

describe('node-only production policy', () => {
  const manifest = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    scripts?: Record<string, string>;
  };

  it('declares exactly the five direct production dependencies at exact versions', () => {
    expect(manifest.dependencies ?? {}).toEqual(APPROVED_PRODUCTION_DEPENDENCIES);
  });

  it('never declares open in any dependency section', () => {
    expect(manifest.dependencies?.['open']).toBeUndefined();
    expect(manifest.devDependencies?.['open']).toBeUndefined();
    expect(LOCKFILE.includes('\n  open:')).toBe(false);
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
