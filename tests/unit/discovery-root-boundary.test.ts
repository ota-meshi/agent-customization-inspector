import { mkdtemp, mkdir, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  createRootBoundary,
  inspectBoundaryEntry,
  isPathInsideRoot,
} from '../../src/discovery/root-boundary.js';

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'aci-boundary-'));
  temporaryDirectories.push(directory);
  return directory;
};

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('canonical root containment', () => {
  it('accepts the root and descendants but rejects prefix siblings', () => {
    expect(isPathInsideRoot('/work/repo', '/work/repo')).toBe(true);
    expect(isPathInsideRoot('/work/repo', '/work/repo/file.md')).toBe(true);
    expect(isPathInsideRoot('/work/repo', '/work/repo-other/file.md')).toBe(false);
    expect(isPathInsideRoot('/work/repo', '/work/elsewhere')).toBe(false);
    expect(isPathInsideRoot('relative', '/work/repo')).toBe(false);
  });

  it('uses Windows component and drive semantics when requested', () => {
    expect(isPathInsideRoot('C:\\work\\repo', 'c:\\work\\repo\\nested\\file.md', path.win32)).toBe(
      true,
    );
    expect(isPathInsideRoot('C:\\work\\repo', 'C:\\work\\repo-other\\file.md', path.win32)).toBe(
      false,
    );
    expect(isPathInsideRoot('C:\\work\\repo', 'D:\\work\\repo\\file.md', path.win32)).toBe(false);
  });

  it('rejects candidates outside a created boundary before inspecting them', async () => {
    const parent = await createTemporaryDirectory();
    const root = path.join(parent, 'repo');
    const sibling = path.join(parent, 'repo-other', 'secret.md');
    await mkdir(root);
    await mkdir(path.dirname(sibling));
    await writeFile(sibling, 'secret');

    const result = await createRootBoundary(root);
    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    await expect(inspectBoundaryEntry(result.boundary, sibling)).resolves.toEqual({
      ok: false,
      reason: 'outside-root',
    });
    expect(JSON.stringify({ boundary: result.boundary })).toBe('{}');
  });

  it.runIf(process.platform !== 'win32')(
    'rejects a symlink supplied as the source root',
    async () => {
      const parent = await createTemporaryDirectory();
      const target = path.join(parent, 'target');
      const link = path.join(parent, 'root-link');
      await mkdir(target);
      await symlink(target, link, 'dir');

      await expect(createRootBoundary(link)).resolves.toEqual({
        ok: false,
        reason: 'symlink-root',
      });
    },
  );

  it('classifies aborted, missing, and non-directory roots without raw errors', async () => {
    const parent = await createTemporaryDirectory();
    const file = path.join(parent, 'file-root');
    const missing = path.join(parent, 'missing-root');
    await writeFile(file, 'not a directory');
    const controller = new AbortController();
    controller.abort();

    await expect(createRootBoundary(parent, controller.signal)).resolves.toEqual({
      ok: false,
      reason: 'aborted',
    });
    await expect(createRootBoundary(file)).resolves.toEqual({
      ok: false,
      reason: 'not-directory',
    });
    await expect(createRootBoundary(missing)).resolves.toEqual({
      ok: false,
      reason: 'inaccessible',
    });
  });

  it('classifies missing entries and pre-aborted entry inspection', async () => {
    const root = await createTemporaryDirectory();
    const boundary = await createRootBoundary(root);
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) {
      return;
    }
    const controller = new AbortController();
    controller.abort();

    await expect(
      inspectBoundaryEntry(boundary.boundary, path.join(root, 'missing')),
    ).resolves.toEqual({ ok: false, reason: 'missing' });
    await expect(inspectBoundaryEntry(boundary.boundary, root, controller.signal)).resolves.toEqual(
      { ok: false, reason: 'aborted' },
    );
  });

  it.runIf(process.platform !== 'win32')(
    'rejects a symlink entry before following it',
    async () => {
      const root = await createTemporaryDirectory();
      const target = path.join(root, 'target.md');
      const link = path.join(root, 'link.md');
      await writeFile(target, 'safe');
      await symlink(target, link);
      const boundary = await createRootBoundary(root);
      expect(boundary.ok).toBe(true);
      if (!boundary.ok) {
        return;
      }

      await expect(inspectBoundaryEntry(boundary.boundary, link)).resolves.toEqual({
        ok: false,
        reason: 'symlink',
      });
    },
  );
});
