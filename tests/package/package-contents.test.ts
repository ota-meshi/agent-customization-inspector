// T1043: the packed tarball's closed content set and the manifest fields a
// consumer of the published package depends on (quickstart.md § Release package
// verification; plan.md § Source Code (repository root)).
//
// What npm will actually pack is asked of npm — `npm pack --dry-run --json`
// over the built tree — rather than re-derived from `package.json.files` here.
// The `files` semantics (directory expansion, the always-included and
// never-included names, ignore-file interaction) belong to the package manager;
// a second implementation of them in this repository would be a rule that
// drifts instead of a rule that defends (AGENTS.md § Implementation simplicity
// policy).
//
// This suite needs the build, like the rest of the package project: its CI job
// runs `pnpm run build` before `pnpm run test:package`.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

/** Repository root; `npm pack` runs here and every path below is relative to it. */
const REPOSITORY_ROOT = join(__dirname, '..', '..');

/** The two entry points `verify:package` requires and the package contract depends on. */
const REQUIRED_PACKAGE_ENTRIES = ['dist/cli.mjs', 'dist/public/index.html'] as const;

/**
 * The top-level names the tarball may contain: npm's own `package.json` plus
 * the exact `package.json.files` entries. Written out rather than read from the
 * manifest the test checks, because a list taken from its own source agrees
 * with itself whatever it holds.
 */
const PACKED_TOP_LEVEL_NAMES = [
  'LICENSE',
  'README.ja.md',
  'README.md',
  'dist',
  'docs',
  'package.json',
] as const;

/** One entry of `npm pack --dry-run --json`. */
interface PackedFile {
  /** Tarball-relative path, with `/` separators. */
  readonly path: string;
}

/** The published manifest fields this suite pins. */
interface PublishedManifest {
  /** Exactly one bin name mapping to the packaged CLI. */
  readonly bin: Readonly<Record<string, string>>;
  /** The supported Node.js range; the package manager enforces it. */
  readonly engines: Readonly<Record<string, string>>;
  /** The published file list. */
  readonly files: readonly string[];
  /** Present only if a module entry were declared; this package declares none. */
  readonly main?: unknown;
  /** Present only if an ESM entry were declared; this package declares none. */
  readonly module?: unknown;
  /** Present only if conditional exports were declared; this package declares none. */
  readonly exports?: unknown;
  /** SPDX identifier the tarball's LICENSE file carries. */
  readonly license: string;
}

const manifest = JSON.parse(
  readFileSync(join(REPOSITORY_ROOT, 'package.json'), 'utf8'),
) as PublishedManifest;

let packedPaths: readonly string[] = [];

beforeAll(() => {
  // `--dry-run` writes no tarball and `--json` reports the exact entry list npm
  // would pack. It reads the built tree, so a missing build fails here with
  // npm's own message rather than with a wrong content set.
  const report = execFileSync('npm', ['pack', '--dry-run', '--json'], {
    cwd: REPOSITORY_ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
  const [packed] = JSON.parse(report) as readonly { readonly files: readonly PackedFile[] }[];
  packedPaths = packed!.files.map((file) => file.path);
}, 120_000);

describe('packed tarball contents', () => {
  it('packs only the declared top-level names', () => {
    const topLevel = [...new Set(packedPaths.map((path) => path.split('/')[0]!))].toSorted();
    expect(topLevel).toEqual([...PACKED_TOP_LEVEL_NAMES]);
    // `docs/images` is a subtree entry, so the manifest list and the packed
    // top-level names are two different statements and each is written out.
    expect(manifest.files.toSorted()).toEqual([
      'LICENSE',
      'README.ja.md',
      'README.md',
      'dist',
      'docs/images',
    ]);
  });

  it('packs both required entry points', () => {
    for (const entry of REQUIRED_PACKAGE_ENTRIES) {
      expect(packedPaths, entry).toContain(entry);
    }
  });

  it('packs no source, specification, test, or configuration payload', () => {
    // An unlisted payload reaching the tarball is what `files` exists to
    // prevent; the assertion names the trees a mistaken entry would pull in.
    for (const path of packedPaths) {
      expect(path, path).not.toMatch(/^(?:src|tests|scripts|specs|\.github|\.claude|\.agents)\//u);
      expect(path, path).not.toMatch(/^(?:vitest|playwright|nuxt|tsdown|eslint)\.config\./u);
      expect(path, path).not.toBe('pnpm-lock.yaml');
      expect(path, path).not.toBe('CHANGELOG.md');
    }
  });

  it('packs the published README pair and license', () => {
    for (const document of ['README.md', 'README.ja.md', 'LICENSE']) {
      expect(packedPaths, document).toContain(document);
    }
    expect(manifest.license).toBe('MIT');
  });
});

describe('published manifest', () => {
  it('maps exactly one bin name to the packaged CLI', () => {
    expect(manifest.bin).toEqual({ 'agent-customization-inspector': 'dist/cli.mjs' });
  });

  it('declares no library entry point', () => {
    // The package is a CLI. A `main`, `module`, or `exports` entry would make
    // the packaged internals an importable surface this repository does not
    // support.
    expect(manifest.main).toBeUndefined();
    expect(manifest.module).toBeUndefined();
    expect(manifest.exports).toBeUndefined();
  });

  it('declares the supported Node.js range once', () => {
    // Node compatibility is declared here and enforced by the package manager;
    // the CLI performs no runtime re-check (AGENTS.md § Implementation
    // simplicity policy).
    expect(manifest.engines).toEqual({ node: '^24.11.0 || ^26.0.0' });
  });

  it('declares no platform restriction', () => {
    // A published `os` or `cpu` field would reject an install on a platform the
    // product supports; nothing in the runtime leaf set is platform-specific.
    expect(Object.keys(manifest)).not.toContain('os');
    expect(Object.keys(manifest)).not.toContain('cpu');
  });
});

describe('packaged CLI entry', () => {
  const cli = readFileSync(join(REPOSITORY_ROOT, 'dist/cli.mjs'), 'utf8');

  it('preserves the shebang the bin mapping depends on', () => {
    // `npx` and a linked bin execute this file directly, so the first line has
    // to be the interpreter line; a bundler that drops it makes the published
    // package unrunnable while every in-repository test still passes.
    expect(cli.startsWith('#!/usr/bin/env node\n')).toBe(true);
  });
});

describe('package-owned verification output', () => {
  it('reports no customization validity or lint result', () => {
    // These gates answer whether the package is well formed, never whether an
    // inspected customization is valid: the product states what a file says and
    // passes no judgment on it (FR-020). A gate that printed a verdict would be
    // the first packaged surface to do so.
    const output = execFileSync('node', ['scripts/verify-package-files.mjs'], {
      cwd: REPOSITORY_ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(output.trim()).toBe('');
  });
});
