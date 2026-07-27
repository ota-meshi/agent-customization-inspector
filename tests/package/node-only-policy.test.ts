// T025: Node.js-only production policy — the production dependency closure
// derived from pnpm-lock.yaml is exactly the seven approved roots and excludes
// `open`, and the CLI uses only gunshi's root API (research.md § 3, plan.md
// § Technical Context). Versions, registry integrity, and installed payload
// digests are not asserted here: the committed lockfile owns them, and a test
// that restates them only duplicates the lockfile. The per-payload content
// scans (native/Wasm/Rust magic, platform selectors, lifecycle hooks, shell
// helpers, non-Node shebangs) were removed 2026-07-23 for the same reason, and
// install-time enforcement belongs to the package manager.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const REPO_ROOT = join(__dirname, '..', '..');

interface LockfileShape {
  importers: Record<string, { dependencies?: Record<string, { version: string }> }>;
  snapshots?: Record<
    string,
    { dependencies?: Record<string, string>; optionalDependencies?: Record<string, string> }
  >;
}

const LOCKFILE = parse(readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')) as LockfileShape;

/**
 * Resolves the complete production closure from the lockfile snapshots:
 * every package (with its exact locked version and peer suffix) reachable
 * from the root importer's production dependencies. Both `dependencies` and
 * `optionalDependencies` edges are followed — an optional edge still installs
 * the package, so omitting it would let a disallowed package (e.g. `open`)
 * enter the production tree through an optional edge and evade this gate.
 */
function productionClosure(): string[] {
  const rootDependencies = LOCKFILE.importers['.']?.dependencies ?? {};
  const queue = Object.entries(rootDependencies).map(([name, entry]) => `${name}@${entry.version}`);
  const seen = new Set<string>();
  while (queue.length > 0) {
    const key = queue.pop()!;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const snapshot = LOCKFILE.snapshots?.[key];
    if (snapshot === undefined) {
      throw new Error(`pnpm-lock.yaml has no snapshot for production dependency ${key}`);
    }
    for (const [name, version] of [
      ...Object.entries(snapshot.dependencies ?? {}),
      ...Object.entries(snapshot.optionalDependencies ?? {}),
    ]) {
      queue.push(`${name}@${version}`);
    }
  }
  return [...seen].sort();
}

// Splits one closure key (`name@version` with an optional peer-suffix
// parenthesis) into its package name and exact version.
function splitClosureKey(closureKey: string): { name: string; version: string } {
  const parenthesis = closureKey.indexOf('(');
  const versionedName = parenthesis === -1 ? closureKey : closureKey.slice(0, parenthesis);
  const at = versionedName.lastIndexOf('@');
  return { name: versionedName.slice(0, at), version: versionedName.slice(at + 1) };
}

// Per-payload content scanning (native/toolchain/bundled-binary artifacts)
// is out of scope: the lockfile integrity hashes pin the payload bytes, so
// the closure test asserts only the approved dependency set.
describe('production closure policy', () => {
  const closure = productionClosure();

  it('resolves the closure from the seven approved roots', () => {
    const names = new Set(closure.map((key) => splitClosureKey(key).name));
    for (const root of ['devframe', 'gunshi', 'jsonc-parser', 'smol-toml', 'vfile', 'vfile-matter', 'yaml']) {
      expect(names.has(root)).toBe(true);
    }
    expect(names.has('open')).toBe(false);
  });

  it('contains nothing beyond the reviewed closure', () => {
    // Naming the roots and denying one package proves nothing about what the
    // lockfile actually pulls in: a new transitive could enter with no gate
    // objecting. The whole closure is the reviewed set, so it is pinned here
    // and a change to it is a change a reviewer has to look at.
    const reviewed = [
      '@types/unist',
      '@valibot/to-json-schema',
      'birpc',
      'crossws',
      'destr',
      'devframe',
      'gunshi',
      'h3',
      'jsonc-parser',
      'mrmime',
      'nostics',
      'pathe',
      'rou3',
      'smol-toml',
      'srvx',
      'typescript',
      'ufo',
      'unist-util-stringify-position',
      'valibot',
      'vfile',
      'vfile-matter',
      'vfile-message',
      'yaml',
    ];
    expect([...new Set(closure.map((key) => splitClosureKey(key).name))].sort()).toEqual(reviewed);
  });
});

describe('dist-root server bundle configuration', () => {
  it('bundles the CLI entry as fixed-extension Node ESM at the dist root', async () => {
    // The dist-root server bundle set is tool-owned tsdown output; this
    // closure gate pins the declared configuration that produces it: the
    // required cli entry, Node ESM, fixed .mjs extension, and direct dist/
    // output (plan.md § Technical Context).
    const { default: config } = (await import('../../tsdown.config')) as {
      default: {
        entry: Record<string, string>;
        format: string;
        platform: string;
        fixedExtension: boolean;
        outDir: string;
      };
    };
    expect(config.entry).toEqual({ cli: 'src/server/cli.ts' });
    expect(config.format).toBe('esm');
    expect(config.platform).toBe('node');
    expect(config.fixedExtension).toBe(true);
    expect(config.outDir).toBe('dist');
  });
});

describe('root-API-only gunshi imports', () => {
  it('imports only the gunshi root entry — no agent, lazy, or custom-plugin path', () => {
    const offenders: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) {
          continue;
        }
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) {
          walk(absolute);
        } else if (/\.(?:ts|mts|cts|vue)$/u.test(entry.name)) {
          const text = readFileSync(absolute, 'utf8');
          // Every spelling that reaches a subpath, not just a static `from`:
          // a side-effect import, a dynamic `import()`, and `require()` all
          // load the same module, so matching one form would pass a build that
          // used another.
          if (/['"]gunshi\/[^'"]+['"]/u.test(text)) {
            offenders.push(relative(REPO_ROOT, absolute));
          }
        }
      }
    };
    walk(join(REPO_ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});
