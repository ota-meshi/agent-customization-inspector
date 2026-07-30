// T024/T025: dist/ package gate — the build pipeline owns dist contents, so
// the gate requires only the two entry points the package contract depends
// on: the SPA shell (public/index.html) served by the devframe host and the
// package.json.bin target cli.mjs.
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
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

/** The repository root, so the built artifact can be read from disk. */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

describe('verifyPackageFiles', () => {
  it('requires exactly the two package entry points', () => {
    expect([...REQUIRED_PACKAGE_ENTRIES].sort()).toEqual(['cli.mjs', 'public/index.html']);
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

  it('rejects a symbolic link to a regular file', async () => {
    // T024 requires the packaged entry to *be* a regular file. A link that
    // resolves to one passes `stat` and would have shipped a dist/ whose entry
    // is a pointer into somewhere else on the packaging machine.
    const dist = makeDist();
    const real = join(dist, 'real-cli.mjs');
    writeFileSync(real, 'export {};\n', 'utf8');
    rmSync(join(dist, 'cli.mjs'));
    try {
      symlinkSync(real, join(dist, 'cli.mjs'));
    } catch {
      return; // The platform disallows symbolic links; nothing to prove here.
    }
    await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow(/symbolic link/u);
  });

  it('rejects a regular file whose bytes cannot be read', async () => {
    // Metadata is not verification: an entry that lstats as a regular file but
    // cannot be opened would ship and fail on the user's machine.
    const dist = makeDist();
    const target = join(dist, 'cli.mjs');
    chmodSync(target, 0o000);
    let readable = true;
    try {
      readFileSync(target);
    } catch {
      readable = false;
    }
    chmodSync(target, 0o644);
    if (readable) {
      return; // A root-owned process reads a mode-000 file; nothing to prove.
    }
    chmodSync(target, 0o000);
    try {
      await expect(verifyPackageFiles({ distDir: dist })).rejects.toThrow(/cannot be read/u);
    } finally {
      chmodSync(target, 0o644);
    }
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

describe('the packaged CLI carries no maintenance-only registry data', () => {
  // Evidence citations, vendor locators, and policy references are compiled out by the
  // `__ACI_SHIP_MAINTENANCE_DATA__` define in `tsdown.config.ts`
  // (src/shared/registries/maintenance-data.ts). That substitution fails
  // silently — spelling the flag as a member expression, or losing the define,
  // leaves every reviewed URL, heading, review date, paraphrase, and vendor
  // locator in the shipped bundle while type checking and every other suite
  // still pass. So the guarantee is asserted against the built artifact rather
  // than against the source.
  it('folds every citation away', () => {
    const bundle = readFileSync(join(REPO_ROOT, 'dist', 'cli.mjs'), 'utf8');
    expect(bundle).toContain('evidence: []');
    // The cited host can only be data: no shipped comment names it.
    expect(bundle).not.toContain('learn.chatgpt.com');
    // The field names also appear bare in shipped JSDoc — a module explaining
    // what a strategy establishes is prose, not a citation — so each assertion
    // is on the emitted property form, as the policy-reference case below is.
    for (const field of ['officialHost', 'reviewedOn', 'establishes', 'sections']) {
      expect(bundle, field).not.toMatch(new RegExp(String.raw`\b${field}\s*:`, 'u'));
    }
  });

  it('folds every policy reference away', () => {
    const bundle = readFileSync(join(REPO_ROOT, 'dist', 'cli.mjs'), 'utf8');
    // Every `policyRefs` in the bundle is the empty array, and no clause
    // identifier survives as data anywhere. Naming two literals would pass a
    // build where a third rule kept its own references — the substitution can
    // fail silently, so the assertion has to be exhaustive.
    const occurrences = [...bundle.matchAll(/policyRefs\s*:\s*(\[[^\]]*\])/gu)];
    expect(occurrences.length).toBeGreaterThan(0);
    for (const [, value] of occurrences) {
      expect(value).toBe('[]');
    }
    // The identifiers also appear bare in shipped JSDoc, which is prose rather
    // than data, so the assertion is on the emitted string form.
    expect(bundle).not.toMatch(/["'](?:FR|QR)-\d{3}["']/u);
  });

  it('folds every vendor locator away', () => {
    const bundle = readFileSync(join(REPO_ROOT, 'dist', 'cli.mjs'), 'utf8');
    expect(bundle).toContain('locator: null');
    expect(bundle).not.toContain('lookupBase');
    expect(bundle).not.toContain('relativeSelector');
    expect(bundle).not.toContain('ancestor-chain-to-repository-root');
    expect(bundle).not.toContain('standard-location-chain');
    expect(bundle).not.toContain('.agents/skills/<name>/SKILL.md');
  });
});
