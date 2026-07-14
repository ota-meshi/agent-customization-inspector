import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { DiagnosticCollector } from '../../src/core/diagnostics.js';
import {
  createScanLimits,
  resolveSourceScanLimits,
  type ScanLimitOverrides,
} from '../../src/core/limits.js';
import type { SourceDescriptor } from '../../src/core/model.js';
import { ReadBudget, readTextFile } from '../../src/discovery/read-text.js';
import { createRootBoundary } from '../../src/discovery/root-boundary.js';
import { discoverExactFile, walkDirectory } from '../../src/discovery/walk.js';

const SOURCE: SourceDescriptor = Object.freeze({
  layer: 'repository',
  id: 'repository',
  label: 'Repository',
  virtualBase: 'repository://workspace',
});

const temporaryDirectories: string[] = [];

const createTemporaryDirectory = async (): Promise<string> => {
  const directory = await mkdtemp(path.join(tmpdir(), 'aci-discovery-'));
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

const scan = async (
  rootPath: string,
  overrides: ScanLimitOverrides = {},
): Promise<{
  collector: DiagnosticCollector;
  limits: ReturnType<typeof createScanLimits>;
  result: Awaited<ReturnType<typeof walkDirectory>>;
}> => {
  const limits = createScanLimits(overrides);
  const sourceLimits = resolveSourceScanLimits(limits, SOURCE.layer);
  const collector = new DiagnosticCollector(SOURCE, sourceLimits.maxDetailedDiagnostics);
  const result = await walkDirectory({
    rootPath,
    source: SOURCE,
    diagnostics: collector,
    limits,
  });
  return { collector, limits, result };
};

describe('bounded filesystem discovery', () => {
  it('classifies invalid roots generically and honors pre-aborted scans', async () => {
    const parent = await createTemporaryDirectory();
    const missing = path.join(parent, 'missing-root');
    const file = path.join(parent, 'file-root');
    await writeFile(file, 'not a directory');

    const invalidRoots: Array<{ rootPath: string; code: string }> = [
      { rootPath: missing, code: 'DISCOVERY_ROOT_UNREADABLE' },
      { rootPath: file, code: 'DISCOVERY_ROOT_NOT_DIRECTORY' },
    ];
    if (process.platform !== 'win32') {
      const target = path.join(parent, 'target-root');
      const link = path.join(parent, 'linked-root');
      await mkdir(target);
      await symlink(target, link, 'dir');
      invalidRoots.push({ rootPath: link, code: 'DISCOVERY_SYMLINK_ROOT_REJECTED' });
    }

    for (const { rootPath, code } of invalidRoots) {
      const { collector, result } = await scan(rootPath);
      expect(result).toMatchObject({ complete: false, aborted: false, files: [] });
      expect(collector.toArray()).toEqual([expect.objectContaining({ code })]);
      expect(JSON.stringify(collector.toArray())).not.toContain(parent);
    }

    const controller = new AbortController();
    controller.abort();
    const limits = createScanLimits();
    const collector = new DiagnosticCollector(SOURCE, 10);
    await expect(
      walkDirectory({
        rootPath: parent,
        source: SOURCE,
        diagnostics: collector,
        limits,
        signal: controller.signal,
      }),
    ).resolves.toMatchObject({ complete: false, aborted: true, files: [] });
    expect(collector.toArray()).toEqual([]);
  });

  it('walks regular files deterministically and ignores generated directories', async () => {
    const root = await createTemporaryDirectory();
    await mkdir(path.join(root, 'nested'));
    await mkdir(path.join(root, 'node_modules'));
    await writeFile(path.join(root, 'z.md'), 'z');
    await writeFile(path.join(root, 'nested', 'a.md'), 'a');
    await writeFile(path.join(root, 'node_modules', 'ignored.md'), 'ignored');

    const { result } = await scan(root);

    expect(result.complete).toBe(true);
    expect(result.files.map(({ entry }) => entry.relativePath)).toEqual(['nested/a.md', 'z.md']);
    expect(result.files.every(({ locator }) => JSON.stringify(locator) === undefined)).toBe(true);
  });

  it('enforces entry and depth limits with explicit diagnostics', async () => {
    const root = await createTemporaryDirectory();
    await mkdir(path.join(root, 'level-one'));
    await writeFile(path.join(root, 'level-one', 'too-deep.md'), 'deep');
    await writeFile(path.join(root, 'root.md'), 'root');

    const depthScan = await scan(root, { maxDepth: 1 });
    expect(depthScan.result.files.map(({ entry }) => entry.basename)).toEqual(['root.md']);
    expect(depthScan.collector.toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_DEPTH_LIMIT_REACHED' })]),
    );

    const entryScan = await scan(root, {
      repository: { maxDirectoryEntries: 1 },
    });
    expect(entryScan.result.directoryEntriesVisited).toBe(1);
    expect(entryScan.result.complete).toBe(false);
    expect(entryScan.collector.toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_ENTRY_LIMIT_REACHED' })]),
    );
  });

  it('rejects an oversized file before creating a read locator', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'large.md'), '12345');

    const { collector, result } = await scan(root, { maxFileBytes: 4 });

    expect(result.files).toHaveLength(0);
    expect(collector.toArray()).toEqual([
      expect.objectContaining({
        code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED',
        virtualPath: 'repository://workspace/large.md',
      }),
    ]);
  });

  it('rejects reuse of a canonical boundary with a different source root', async () => {
    const firstRoot = await createTemporaryDirectory();
    const secondRoot = await createTemporaryDirectory();
    await writeFile(path.join(secondRoot, 'secret.md'), 'private sentinel');
    const boundary = await createRootBoundary(firstRoot);
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) {
      return;
    }
    const limits = createScanLimits();
    const collector = new DiagnosticCollector(SOURCE, limits.repository.maxDetailedDiagnostics);

    const result = await discoverExactFile({
      rootPath: secondRoot,
      boundary: boundary.boundary,
      relativePath: 'secret.md',
      source: SOURCE,
      diagnostics: collector,
      limits,
    });

    expect(result.file).toBeUndefined();
    expect(collector.toArray()).toEqual([
      expect.objectContaining({ code: 'DISCOVERY_ROOT_BOUNDARY_MISMATCH' }),
    ]);
    expect(JSON.stringify(collector.toArray())).not.toContain(secondRoot);
    expect(JSON.stringify(collector.toArray())).not.toContain('private sentinel');
  });

  it.runIf(process.platform !== 'win32')(
    'skips internal, external, and looping symlinks without reading targets',
    async () => {
      const parent = await createTemporaryDirectory();
      const root = path.join(parent, 'repo');
      const outside = path.join(parent, 'outside-secret.md');
      await mkdir(root);
      await writeFile(path.join(root, 'visible.md'), 'visible');
      await writeFile(outside, 'external secret sentinel');
      await symlink(path.join(root, 'visible.md'), path.join(root, 'internal.md'));
      await symlink(outside, path.join(root, 'external.md'));
      await symlink(root, path.join(root, 'loop'), 'dir');

      const { collector, result } = await scan(root);
      const serializedDiagnostics = JSON.stringify(collector.toArray());

      expect(result.files.map(({ entry }) => entry.basename)).toEqual(['visible.md']);
      expect(
        collector.toArray().filter(({ code }) => code === 'DISCOVERY_SYMLINK_SKIPPED'),
      ).toHaveLength(3);
      expect(serializedDiagnostics).not.toContain(parent);
      expect(serializedDiagnostics).not.toContain('external secret sentinel');
    },
  );

  it.runIf(process.platform !== 'win32')(
    'sanitizes control characters in public relative and virtual paths',
    async () => {
      const root = await createTemporaryDirectory();
      await writeFile(path.join(root, 'line\n\u202Ename.md'), 'safe');

      const { result } = await scan(root);

      expect(result.files[0]?.entry).toMatchObject({
        relativePath: 'line\\u{000A}\\u{202E}name.md',
        basename: 'line\\u{000A}\\u{202E}name.md',
        virtualPath: 'repository://workspace/line%0A%E2%80%AEname.md',
      });
      expect(JSON.stringify(result.files[0]?.entry)).not.toMatch(/[\n\u202e]/u);
    },
  );
});

async function scanFrom(rootPath: string, startRelativePath: string) {
  const limits = createScanLimits();
  const collector = new DiagnosticCollector(
    SOURCE,
    resolveSourceScanLimits(limits, SOURCE.layer).maxDetailedDiagnostics,
  );
  const result = await walkDirectory({
    rootPath,
    startRelativePath,
    source: SOURCE,
    diagnostics: collector,
    limits,
  });
  return { collector, result };
}

describe('candidate-scoped directory discovery', () => {
  it('handles invalid, missing, and non-directory start paths safely', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'file.md'), 'file');

    const invalid = await scanFrom(root, '../outside');
    expect(invalid.result.complete).toBe(false);
    expect(invalid.collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_INVALID_RELATIVE_PATH' }),
      ]),
    );

    const missing = await scanFrom(root, 'missing');
    expect(missing.result).toMatchObject({ complete: true, files: [] });

    const notDirectory = await scanFrom(root, 'file.md');
    expect(notDirectory.result.complete).toBe(false);
    expect(notDirectory.collector.toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_EXPECTED_DIRECTORY' })]),
    );
  });

  it('rejects a reused boundary for another directory walk', async () => {
    const first = await createTemporaryDirectory();
    const second = await createTemporaryDirectory();
    const boundary = await createRootBoundary(first);
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) {
      return;
    }
    const limits = createScanLimits();
    const collector = new DiagnosticCollector(SOURCE, 10);

    const result = await walkDirectory({
      rootPath: second,
      boundary: boundary.boundary,
      source: SOURCE,
      diagnostics: collector,
      limits,
    });

    expect(result.complete).toBe(false);
    expect(collector.toArray()).toEqual([
      expect.objectContaining({ code: 'DISCOVERY_ROOT_BOUNDARY_MISMATCH' }),
    ]);
  });

  it('applies the entry budget while resolving the candidate directory', async () => {
    const root = await createTemporaryDirectory();
    await mkdir(path.join(root, 'one', 'two'), { recursive: true });
    const limits = createScanLimits({ repository: { maxDirectoryEntries: 1 } });
    const collector = new DiagnosticCollector(SOURCE, 10);

    const result = await walkDirectory({
      rootPath: root,
      startRelativePath: 'one/two',
      source: SOURCE,
      diagnostics: collector,
      limits,
    });

    expect(result).toMatchObject({ complete: false, directoryEntriesVisited: 1, files: [] });
    expect(collector.toArray()).toEqual([
      expect.objectContaining({ code: 'DISCOVERY_ENTRY_LIMIT_REACHED' }),
    ]);
  });
});

describe('exact candidate discovery', () => {
  const exact = async (
    rootPath: string,
    relativePath: string,
    overrides: ScanLimitOverrides = {},
  ) => {
    const limits = createScanLimits(overrides);
    const collector = new DiagnosticCollector(
      SOURCE,
      resolveSourceScanLimits(limits, SOURCE.layer).maxDetailedDiagnostics,
    );
    const result = await discoverExactFile({
      rootPath,
      relativePath,
      source: SOURCE,
      diagnostics: collector,
      limits,
    });
    return { collector, result };
  };

  it('distinguishes success, missing, non-directory, and non-file candidates', async () => {
    const root = await createTemporaryDirectory();
    await mkdir(path.join(root, 'nested'));
    await mkdir(path.join(root, 'candidate-directory'));
    await writeFile(path.join(root, 'nested', 'file.md'), 'safe');
    await writeFile(path.join(root, 'blocking'), 'not a directory');

    const success = await exact(root, 'nested/file.md');
    expect(success.result.file?.entry.relativePath).toBe('nested/file.md');
    expect(success.result.directoryEntriesVisited).toBe(2);

    const missing = await exact(root, 'nested/missing.md');
    expect(missing.result).toMatchObject({ complete: true, directoryEntriesVisited: 2 });
    expect(missing.result.file).toBeUndefined();

    const blocked = await exact(root, 'blocking/file.md');
    expect(blocked.collector.toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_EXPECTED_DIRECTORY' })]),
    );

    const directory = await exact(root, 'candidate-directory');
    expect(directory.collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_NON_REGULAR_FILE_SKIPPED' }),
      ]),
    );
  });

  it('enforces exact-path syntax, depth, entry, and file-size limits', async () => {
    const root = await createTemporaryDirectory();
    await mkdir(path.join(root, 'nested'));
    await writeFile(path.join(root, 'nested', 'large.md'), '12345');

    expect((await exact(root, '../outside.md')).collector.toArray()).toEqual([
      expect.objectContaining({ code: 'DISCOVERY_INVALID_RELATIVE_PATH' }),
    ]);
    expect((await exact(root, 'nested/large.md', { maxDepth: 1 })).collector.toArray()).toEqual([
      expect.objectContaining({ code: 'DISCOVERY_DEPTH_LIMIT_REACHED' }),
    ]);
    expect(
      (
        await exact(root, 'nested/large.md', {
          repository: { maxDirectoryEntries: 1 },
        })
      ).collector.toArray(),
    ).toEqual([expect.objectContaining({ code: 'DISCOVERY_ENTRY_LIMIT_REACHED' })]);
    expect((await exact(root, 'nested/large.md', { maxFileBytes: 4 })).collector.toArray()).toEqual(
      [expect.objectContaining({ code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED' })],
    );
  });

  it('honors a pre-aborted signal without publishing a file', async () => {
    const root = await createTemporaryDirectory();
    const controller = new AbortController();
    controller.abort();
    const limits = createScanLimits();
    const collector = new DiagnosticCollector(SOURCE, 10);

    const result = await discoverExactFile({
      rootPath: root,
      relativePath: 'file.md',
      source: SOURCE,
      diagnostics: collector,
      limits,
      signal: controller.signal,
    });

    expect(result).toMatchObject({ complete: false, aborted: true });
    expect(collector.toArray()).toEqual([]);
  });

  it('accepts a matching prevalidated boundary', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'file.md'), 'safe');
    const boundary = await createRootBoundary(root);
    expect(boundary.ok).toBe(true);
    if (!boundary.ok) {
      return;
    }
    const limits = createScanLimits();
    const collector = new DiagnosticCollector(SOURCE, 10);

    const result = await discoverExactFile({
      rootPath: root,
      boundary: boundary.boundary,
      relativePath: 'file.md',
      source: SOURCE,
      diagnostics: collector,
      limits,
    });

    expect(result.file?.entry.relativePath).toBe('file.md');
    expect(result.complete).toBe(true);
  });
});

describe('bounded UTF-8 reads', () => {
  it('validates budgets and exits before filesystem work when pre-aborted', async () => {
    expect(() => new ReadBudget(0)).toThrow(/positive safe integer/u);
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'file.md'), 'safe');
    const { collector, result } = await scan(root);
    const controller = new AbortController();
    controller.abort();

    await expect(
      readTextFile(result.files[0]!, {
        diagnostics: collector,
        maxFileBytes: 10,
        sourceBudget: new ReadBudget(10),
        signal: controller.signal,
      }),
    ).resolves.toBeUndefined();
    expect(collector.toArray()).toEqual([]);
  });

  it('returns UTF-8 through a verified descriptor and charges both budgets', async () => {
    const root = await createTemporaryDirectory();
    const contents = 'hello 日本語';
    await writeFile(path.join(root, 'AGENTS.md'), contents);
    const { collector, limits, result } = await scan(root);
    const resolved = resolveSourceScanLimits(limits, SOURCE.layer);
    const sourceBudget = new ReadBudget(resolved.maxTotalBytes);
    const combinedBudget = new ReadBudget(resolved.maxCombinedBytes);

    const read = await readTextFile(result.files[0]!, {
      diagnostics: collector,
      maxFileBytes: resolved.maxFileBytes,
      sourceBudget,
      combinedBudget,
    });

    const byteLength = Buffer.byteLength(contents);
    expect(read).toEqual({ text: contents, byteLength });
    expect(sourceBudget.usedBytes).toBe(byteLength);
    expect(combinedBudget.usedBytes).toBe(byteLength);
  });

  it('rejects invalid UTF-8 without putting bytes or raw errors in diagnostics', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'invalid.md'), Buffer.from([0xc3, 0x28]));
    const { collector, limits, result } = await scan(root);
    const resolved = resolveSourceScanLimits(limits, SOURCE.layer);
    const sourceBudget = new ReadBudget(resolved.maxTotalBytes);

    await expect(
      readTextFile(result.files[0]!, {
        diagnostics: collector,
        maxFileBytes: resolved.maxFileBytes,
        sourceBudget,
      }),
    ).resolves.toBeUndefined();

    expect(sourceBudget.usedBytes).toBe(2);
    expect(collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DISCOVERY_INVALID_UTF8',
          virtualPath: 'repository://workspace/invalid.md',
        }),
      ]),
    );
    expect(JSON.stringify(collector.toArray())).not.toContain(root);
  });

  it('reserves whole files so concurrent-style source budgets cannot overshoot', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'a.md'), '1234');
    await writeFile(path.join(root, 'b.md'), '5678');
    const { collector, result } = await scan(root);
    const sourceBudget = new ReadBudget(5);

    await expect(
      readTextFile(result.files[0]!, {
        diagnostics: collector,
        maxFileBytes: 10,
        sourceBudget,
      }),
    ).resolves.toEqual({ text: '1234', byteLength: 4 });
    await expect(
      readTextFile(result.files[1]!, {
        diagnostics: collector,
        maxFileBytes: 10,
        sourceBudget,
      }),
    ).resolves.toBeUndefined();

    expect(sourceBudget.usedBytes).toBe(4);
    expect(sourceBudget.remainingBytes).toBe(1);
    expect(collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'DISCOVERY_TOTAL_BYTE_LIMIT_REACHED',
        }),
      ]),
    );
  });

  it('cancels a source reservation when the combined budget cannot accept it', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'file.md'), '1234');
    const { collector, result } = await scan(root);
    const sourceBudget = new ReadBudget(10);
    const combinedBudget = new ReadBudget(3);

    await expect(
      readTextFile(result.files[0]!, {
        diagnostics: collector,
        maxFileBytes: 10,
        sourceBudget,
        combinedBudget,
      }),
    ).resolves.toBeUndefined();

    expect(sourceBudget.usedBytes).toBe(0);
    expect(sourceBudget.reservedBytes).toBe(0);
    expect(combinedBudget.usedBytes).toBe(0);
    expect(collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_TOTAL_BYTE_LIMIT_REACHED' }),
      ]),
    );
  });

  it('rechecks file size and identity immediately before opening', async () => {
    const root = await createTemporaryDirectory();
    const file = path.join(root, 'file.md');
    await writeFile(file, '12345');
    const sizeScan = await scan(root);

    await expect(
      readTextFile(sizeScan.result.files[0]!, {
        diagnostics: sizeScan.collector,
        maxFileBytes: 4,
        sourceBudget: new ReadBudget(10),
      }),
    ).resolves.toBeUndefined();
    expect(sizeScan.collector.toArray()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED' }),
      ]),
    );

    const changedScan = await scan(root);
    await writeFile(file, 'changed after discovery');
    await expect(
      readTextFile(changedScan.result.files[0]!, {
        diagnostics: changedScan.collector,
        maxFileBytes: 100,
        sourceBudget: new ReadBudget(100),
      }),
    ).resolves.toBeUndefined();
    expect(changedScan.collector.toArray()).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_FILE_CHANGED' })]),
    );
  });

  it('reads an empty file when source and combined budgets are the same object', async () => {
    const root = await createTemporaryDirectory();
    await writeFile(path.join(root, 'empty.md'), '');
    const { collector, result } = await scan(root);
    const budget = new ReadBudget(10);

    await expect(
      readTextFile(result.files[0]!, {
        diagnostics: collector,
        maxFileBytes: 10,
        sourceBudget: budget,
        combinedBudget: budget,
      }),
    ).resolves.toEqual({ text: '', byteLength: 0 });
    expect(budget.usedBytes).toBe(0);
  });

  it.runIf(process.platform !== 'win32')(
    'refuses a discovered path that is replaced with a symlink before reading',
    async () => {
      const parent = await createTemporaryDirectory();
      const root = path.join(parent, 'repo');
      const filePath = path.join(root, 'replace.md');
      const outside = path.join(parent, 'outside.md');
      await mkdir(root);
      await writeFile(filePath, 'original');
      await writeFile(outside, 'outside secret sentinel');
      const { collector, result } = await scan(root);
      await rm(filePath);
      await symlink(outside, filePath);

      await expect(
        readTextFile(result.files[0]!, {
          diagnostics: collector,
          maxFileBytes: 1024,
          sourceBudget: new ReadBudget(1024),
        }),
      ).resolves.toBeUndefined();

      const diagnostics = JSON.stringify(collector.toArray());
      expect(diagnostics).toContain('DISCOVERY_SYMLINK_SKIPPED');
      expect(diagnostics).not.toContain(parent);
      expect(diagnostics).not.toContain('outside secret sentinel');
    },
  );
});
