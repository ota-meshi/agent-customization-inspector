// T024: the fixed clean step removes only the package-owned generated
// trees and never follows or touches anything else.
import { existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { CLEANED_TREES, cleanBuildOutput } from '../../scripts/clean-build-output.mjs';

function makeRoot(): string {
  return mkdtempSync(join(tmpdir(), 'clean-build-'));
}

describe('cleanBuildOutput', () => {
  it('removes exactly the two package-owned trees', async () => {
    expect([...CLEANED_TREES].sort()).toEqual(['.output', 'dist']);
    const root = makeRoot();
    for (const tree of CLEANED_TREES) {
      mkdirSync(join(root, tree, 'nested'), { recursive: true });
      writeFileSync(join(root, tree, 'nested', 'file.txt'), 'x');
    }
    mkdirSync(join(root, 'src'));
    writeFileSync(join(root, 'src', 'keep.ts'), 'keep');
    await cleanBuildOutput(root);
    for (const tree of CLEANED_TREES) {
      expect(existsSync(join(root, tree))).toBe(false);
    }
    expect(existsSync(join(root, 'src', 'keep.ts'))).toBe(true);
  });

  it('is a no-op for absent trees', async () => {
    const root = makeRoot();
    await expect(cleanBuildOutput(root)).resolves.toBeUndefined();
  });

  it('removes a symlinked tree without following it', async () => {
    const root = makeRoot();
    mkdirSync(join(root, 'precious'));
    writeFileSync(join(root, 'precious', 'data.txt'), 'keep me');
    symlinkSync(join(root, 'precious'), join(root, 'dist'));
    await cleanBuildOutput(root);
    expect(existsSync(join(root, 'dist'))).toBe(false);
    expect(existsSync(join(root, 'precious', 'data.txt'))).toBe(true);
  });
});
