// T024/T025: dist/ package gate — the build pipeline owns dist contents, so
// the gate requires only the two entry points the package contract depends
// on: the SPA shell (public/index.html) served by the devframe host and the
// package.json.bin target cli.mjs.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  REQUIRED_PACKAGE_ENTRIES,
  verifyPackageFiles,
} from '../../scripts/verify-package-files.mjs';

function makeDist(): string {
  const root = mkdtempSync(join(tmpdir(), 'verify-package-'));
  const dist = join(root, 'dist');
  mkdirSync(join(dist, 'public'), { recursive: true });
  writeFileSync(join(dist, 'public', 'index.html'), '<!DOCTYPE html>\n');
  writeFileSync(join(dist, 'cli.mjs'), 'export {};\n');
  return dist;
}

describe('verifyPackageFiles', () => {
  it('requires exactly the two package entry points', () => {
    expect([...REQUIRED_PACKAGE_ENTRIES].sort()).toEqual([
      'cli.mjs',
      'public/index.html',
    ]);
  });

  it('accepts a built dist and ignores tool-owned siblings', async () => {
    const dist = makeDist();
    // Code-split chunks, Nuxt asset trees, and SPA fallbacks are owned by
    // tsdown/Nuxt; the gate must not re-verify them.
    writeFileSync(join(dist, 'chunk-abc.mjs'), 'export const x = 1;\n');
    mkdirSync(join(dist, 'public', '_nuxt'), { recursive: true });
    writeFileSync(join(dist, 'public', '_nuxt', 'entry.js'), 'x');
    writeFileSync(join(dist, 'public', '200.html'), '<!DOCTYPE html>\n');
    const { verifiedEntries } = await verifyPackageFiles({ distDir: dist });
    expect(verifiedEntries).toEqual([...REQUIRED_PACKAGE_ENTRIES]);
  });

  it('rejects a missing required entry', async () => {
    const dist = makeDist();
    rmSync(join(dist, 'cli.mjs'));
    await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow(/cli\.mjs/u);
  });

  it('rejects a required entry that is not a regular file', async () => {
    const dist = makeDist();
    rmSync(join(dist, 'cli.mjs'));
    mkdirSync(join(dist, 'cli.mjs'));
    await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow(/not a regular file/u);
  });

  it('rejects a missing SPA shell', async () => {
    const dist = makeDist();
    rmSync(join(dist, 'public', 'index.html'));
    await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow(/index\.html/u);
  });

  it('fails safely when the environment cannot read an artifact (T024)', async () => {
    const dist = makeDist();
    const shellDir = join(dist, 'public');
    try {
      chmodSync(shellDir, 0o000);
    } catch {
      return;
    }
    try {
      // Mode-based unreadability does not bind for an elevated user; only
      // assert the safe failure when the environment actually enforces it.
      let readable = true;
      try {
        statSync(join(shellDir, 'index.html'));
      } catch {
        readable = false;
      }
      if (readable) {
        return;
      }
      // An artifact the gate cannot completely verify fails the gate; it is
      // never skipped or reported as verified.
      await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow();
    } finally {
      chmodSync(shellDir, 0o755);
    }
  });
});
