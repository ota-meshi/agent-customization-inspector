import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { createGlobalSourceRoot } from '../../src/sources/global-source.js';
import {
  MAX_GLOBAL_SOURCE_ROOTS,
  SourceRoot,
  assertGlobalRoots,
} from '../../src/sources/tool-homes.js';

const absoluteRoot = path.resolve('test-tool-home');

describe('source root authorities', () => {
  it('keeps absolute roots out of normal serialization', () => {
    const root = createGlobalSourceRoot({
      locatorId: 'test-tool',
      label: 'Test Tool',
      rootPath: absoluteRoot,
    });

    expect(root.rootPath).toBe(absoluteRoot);
    expect(root.descriptor.virtualBase).toBe('global://test-tool');
    expect(JSON.stringify(root)).toBeUndefined();
    expect(JSON.stringify(root.descriptor)).not.toContain(absoluteRoot);
    expect(Object.isFrozen(root)).toBe(true);
  });

  it('rejects relative and NUL-bearing Global roots without resolving them', () => {
    expect(() =>
      createGlobalSourceRoot({
        locatorId: 'test-tool',
        label: 'Test Tool',
        rootPath: 'relative/tool-home',
      }),
    ).toThrow(/absolute/u);
    expect(() =>
      createGlobalSourceRoot({
        locatorId: 'test-tool',
        label: 'Test Tool',
        rootPath: `${absoluteRoot}\0secret`,
      }),
    ).toThrow(/NUL/u);
  });

  it('bounds public locator ids, labels, and the Global root count', () => {
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'a'.repeat(129),
          label: 'Test Tool',
          rootPath: absoluteRoot,
        }),
    ).toThrow(/locator/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'test-tool',
          label: 'x'.repeat(257),
          rootPath: absoluteRoot,
        }),
    ).toThrow(/label/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'test-tool',
          label: `Tool home: ${path.dirname(absoluteRoot)}`,
          rootPath: absoluteRoot,
        }),
    ).toThrow(/label/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'test-tool',
          label: 'Tool home: C:\\Users\\private',
          rootPath: absoluteRoot,
        }),
    ).toThrow(/label/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'test-tool',
          label: absoluteRoot,
          rootPath: absoluteRoot,
        }),
    ).toThrow(/label/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'global',
          locatorId: 'test-tool',
          label: 'unsafe\u202Elabel',
          rootPath: absoluteRoot,
        }),
    ).toThrow(/label/u);
    expect(
      () =>
        new SourceRoot({
          layer: 'unsupported' as 'global',
          locatorId: 'test-tool',
          label: 'Test Tool',
          rootPath: absoluteRoot,
        }),
    ).toThrow(/source layer/u);

    const roots = Array.from({ length: MAX_GLOBAL_SOURCE_ROOTS + 1 }, (_unused, index) =>
      createGlobalSourceRoot({
        locatorId: `test-tool-${index}`,
        label: `Test Tool ${index}`,
        rootPath: path.join(absoluteRoot, String(index)),
      }),
    );
    expect(() => assertGlobalRoots(roots)).toThrow(/too many/u);
  });

  it('rejects duplicate, non-Global, and forged resolver results', () => {
    const first = createGlobalSourceRoot({
      locatorId: 'test-tool',
      label: 'Test Tool',
      rootPath: absoluteRoot,
    });
    const duplicate = createGlobalSourceRoot({
      locatorId: 'test-tool',
      label: 'Duplicate',
      rootPath: path.join(absoluteRoot, 'duplicate'),
    });
    const repository = new SourceRoot({
      layer: 'repository',
      locatorId: 'root',
      label: 'Repository',
      rootPath: absoluteRoot,
    });

    expect(() => assertGlobalRoots([first, duplicate])).toThrow(/duplicate/u);
    expect(() => assertGlobalRoots([repository])).toThrow(/non-Global/u);
    expect(() =>
      assertGlobalRoots([
        {
          descriptor: first.descriptor,
          locatorId: first.locatorId,
          rootPath: first.rootPath,
        } as unknown as SourceRoot,
      ]),
    ).toThrow(/non-Global/u);
    expect(() => assertGlobalRoots({} as readonly SourceRoot[])).toThrow(/array/u);
  });
});
