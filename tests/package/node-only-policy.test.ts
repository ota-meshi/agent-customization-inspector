// T025: Node.js-only production policy — the exact production dependency
// closure derived from pnpm-lock.yaml contains no native, Rust/C/C++,
// Node-API, binary, or Wasm payload, no prebuilds or platform selectors, no
// lifecycle install hooks or package shell helpers, and no non-Node
// shebang; the CLI uses only gunshi's root API; and gunshi 0.37.0 is pinned
// by its registry integrity and full installed payload digest
// (research.md § 3, plan.md § Technical Context).
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const REPO_ROOT = join(__dirname, '..', '..');

interface LockfileShape {
  importers: Record<string, { dependencies?: Record<string, { version: string }> }>;
  snapshots?: Record<string, { dependencies?: Record<string, string> }>;
}

const LOCKFILE = parse(readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8')) as LockfileShape;

/**
 * Resolves the complete production closure from the lockfile snapshots:
 * every package (with its exact locked version and peer suffix) reachable
 * from the root importer's production dependencies.
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
    for (const [name, version] of Object.entries(snapshot.dependencies ?? {})) {
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

/** Locates one closure member's installed package directory under .pnpm. */
function packageDirFor(closureKey: string): string {
  const { name, version } = splitClosureKey(closureKey);
  const prefix = `${name.replaceAll('/', '+')}@${version}`;
  const pnpmRoot = join(REPO_ROOT, 'node_modules', '.pnpm');
  const match = readdirSync(pnpmRoot).find(
    (entry) => entry === prefix || entry.startsWith(`${prefix}_`),
  );
  if (match === undefined) {
    throw new Error(`no installed .pnpm directory for ${closureKey}`);
  }
  return join(pnpmRoot, match, 'node_modules', name);
}

// The closed payload rejection list: native/toolchain/bundled-binary
// artifacts that would break the pure-Node runtime contract.
const FORBIDDEN_PAYLOAD_PATTERN = /\.(?:node|wasm|rs|c|cc|cpp|h)$|^binding\.gyp$|^Cargo\.toml$/u;

function collectPolicyViolations(closureKey: string): string[] {
  const violations: string[] = [];
  const packageDir = packageDirFor(closureKey);
  const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
    name: string;
    os?: unknown;
    cpu?: unknown;
    libc?: unknown;
    gypfile?: unknown;
    scripts?: Record<string, string>;
    bin?: string | Record<string, string>;
  };
  // Platform selectors mean per-platform payloads; a production package
  // must run everywhere the declared Node engines run.
  for (const field of ['os', 'cpu', 'libc', 'gypfile'] as const) {
    if (manifest[field] !== undefined) {
      violations.push(`${closureKey}: declares ${field}`);
    }
  }
  // Lifecycle install hooks are the runtime-download/build vector.
  for (const hook of ['preinstall', 'install', 'postinstall'] as const) {
    if (manifest.scripts?.[hook] !== undefined) {
      violations.push(`${closureKey}: declares lifecycle ${hook}`);
    }
  }
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) {
        continue;
      }
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') {
          continue;
        }
        if (entry.name === 'prebuilds') {
          violations.push(`${closureKey}: ships a prebuilds directory`);
        }
        walk(absolute);
      } else if (FORBIDDEN_PAYLOAD_PATTERN.test(entry.name)) {
        violations.push(`${closureKey}: ships ${relative(packageDir, absolute)}`);
      }
    }
  };
  walk(packageDir);
  // A shell-helper bin (non-Node shebang) would execute outside Node.
  const bins =
    typeof manifest.bin === 'string' ? { [manifest.name]: manifest.bin } : (manifest.bin ?? {});
  for (const relativeBin of Object.values(bins)) {
    const binPath = join(packageDir, relativeBin);
    if (!existsSync(binPath)) {
      continue;
    }
    const firstLine = readFileSync(binPath, 'utf8').split('\n', 1)[0] ?? '';
    if (firstLine.startsWith('#!') && !/^#!\/usr\/bin\/env node\b/u.test(firstLine)) {
      violations.push(`${closureKey}: non-Node shebang ${firstLine}`);
    }
  }
  return violations;
}

describe('production closure policy', () => {
  const closure = productionClosure();

  it('resolves the closure from the five approved roots', () => {
    const names = new Set(closure.map((key) => splitClosureKey(key).name));
    for (const root of ['devframe', 'gunshi', 'jsonc-parser', 'smol-toml', 'yaml']) {
      expect(names.has(root)).toBe(true);
    }
    expect(names.has('open')).toBe(false);
  });

  it('contains no native, Wasm, prebuilt, platform-selected, shell-helper, or lifecycle-hook package', () => {
    const violations = closure.flatMap((key) => collectPolicyViolations(key));
    expect(violations).toEqual([]);
  });
});

describe('gunshi pinning', () => {
  it('locks the exact registry integrity for gunshi 0.37.0', () => {
    const lockText = readFileSync(join(REPO_ROOT, 'pnpm-lock.yaml'), 'utf8');
    const match = /gunshi@0\.37\.0:\n\s+resolution: \{integrity: (sha512-[^}]+)\}/u.exec(lockText);
    // The registry integrity is the digest of the published tarball; a
    // changed value means a different payload behind the same version.
    expect(match?.[1]).toBe(
      'sha512-QxS12VXGtU4jL5LGYq6xA9DbHycT8pK/Qs+p9Zg1WLaI8+cmBfh0uCc0tfmt6/QwU3PBgm+aBPMkSS9YEwTDkA==',
    );
  });

  it('matches the pinned digest of the full installed gunshi payload', () => {
    const packageDir = packageDirFor('gunshi@0.37.0');
    const files: string[] = [];
    const walk = (directory: string): void => {
      for (const entry of readdirSync(directory, { withFileTypes: true })) {
        const absolute = join(directory, entry.name);
        if (entry.isDirectory()) {
          if (entry.name !== 'node_modules') {
            walk(absolute);
          }
        } else if (entry.isFile()) {
          files.push(absolute);
        }
      }
    };
    walk(packageDir);
    files.sort();
    const hash = createHash('sha256');
    for (const file of files) {
      hash.update(relative(packageDir, file).replaceAll('\\', '/'));
      hash.update('\0');
      hash.update(readFileSync(file));
      hash.update('\0');
    }
    expect(hash.digest('hex')).toBe(
      '093a9f81732f5066f0b0c16618dd73ff1a29d457145b0284ebd01944e4f19cb5',
    );
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
          if (/from\s+['"]gunshi\/[^'"]+['"]/u.test(text)) {
            offenders.push(relative(REPO_ROOT, absolute));
          }
        }
      }
    };
    walk(join(REPO_ROOT, 'src'));
    expect(offenders).toEqual([]);
  });
});
