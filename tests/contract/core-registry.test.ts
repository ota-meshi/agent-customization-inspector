import { describe, expect, it } from 'vitest';

import type { ArtifactDocument, SourceDescriptor } from '../../src/core/model.js';
import {
  AdapterRegistry,
  AdapterRegistryContractError,
  type ArtifactAdapter,
} from '../../src/core/registry.js';

const source: SourceDescriptor = {
  layer: 'repository',
  id: 'repository-source',
  label: 'Repository',
  virtualBase: 'repository://workspace',
};

function makeAdapter(
  id = 'test-adapter',
  overrides: Partial<ArtifactAdapter> = {},
): ArtifactAdapter {
  const adapter: ArtifactAdapter = {
    manifest: {
      id,
      tool: { id: 'future-tool', label: 'Future Tool' },
      supportedKinds: ['instruction'],
      supportedSources: ['repository', 'global'],
      specSources: ['https://example.test/specification'],
      documentedAsOf: '2026-07-15',
      capabilities: {
        discovery: 'full',
        metadata: 'partial',
        rawView: true,
      },
    },
    candidates: [
      {
        id: 'repository-file',
        source: 'repository',
        kind: 'exact-file',
        relativePath: 'AGENTS.md',
      },
      {
        id: 'global-instructions',
        source: 'global',
        locatorId: 'future-tool',
        kind: 'bounded-directory',
        relativePath: 'instructions',
        maxDepth: 4,
        match: { suffixes: ['.instructions.md'] },
      },
    ],
    match(entry) {
      return entry.basename === 'AGENTS.md'
        ? [
            {
              candidateId: 'repository-file',
              variant: 'standard',
              kind: 'instruction',
              support: 'supported',
            },
          ]
        : [];
    },
    async inspect(): Promise<never> {
      throw new Error('The contract test does not inspect files.');
    },
  };

  return { ...adapter, ...overrides };
}

describe('AdapterRegistry', () => {
  it('takes an immutable startup snapshot of explicitly trusted adapters', () => {
    const supplied = makeAdapter();
    (supplied.manifest as ArtifactAdapter['manifest'] & { absolutePath: string }).absolutePath =
      '/Users/private/manifest';
    (
      supplied.candidates[0] as ArtifactAdapter['candidates'][number] & {
        absolutePath: string;
      }
    ).absolutePath = '/Users/private/candidate';
    const registry = new AdapterRegistry([supplied]);

    (supplied.manifest.tool as { label: string }).label = 'Changed after registration';
    (supplied.candidates as unknown as ArtifactDocument[]).length = 0;

    expect(registry.list()).toHaveLength(1);
    expect(registry.get('test-adapter')?.manifest.tool.label).toBe('Future Tool');
    expect(registry.candidatesFor('repository')).toHaveLength(1);
    expect(registry.candidatesFor('global')).toHaveLength(1);
    expect(Object.isFrozen(registry.list())).toBe(true);
    expect(Object.isFrozen(registry.get('test-adapter')?.manifest)).toBe(true);
    expect(JSON.stringify(registry.list())).not.toContain('/Users/private');
    expect('register' in registry).toBe(false);
  });

  it('keeps adapter methods bound to the trusted adapter instance', () => {
    class StatefulAdapter implements ArtifactAdapter {
      readonly manifest = makeAdapter().manifest;
      readonly candidates = makeAdapter().candidates;
      readonly expectedSourceId = source.id;

      match(entry: Parameters<ArtifactAdapter['match']>[0]) {
        expect(this.expectedSourceId).toBe(entry.source.id);
        return [];
      }

      async inspect(): Promise<never> {
        throw new Error('not used');
      }
    }

    const registry = new AdapterRegistry([new StatefulAdapter()]);
    expect(
      registry.get('test-adapter')?.match({
        source,
        relativePath: 'AGENTS.md',
        virtualPath: 'repository://workspace/AGENTS.md',
        basename: 'AGENTS.md',
        byteLength: 10,
      }),
    ).toEqual([]);
  });

  it('accepts open future tool and kind identifiers without vendor allowlists', () => {
    const adapter = makeAdapter('another-adapter');
    const registry = new AdapterRegistry([adapter]);

    expect(registry.get('another-adapter')?.manifest.tool.id).toBe('future-tool');
    expect(registry.get('another-adapter')?.manifest.supportedKinds).toEqual(['instruction']);
  });

  it('rejects duplicate adapter and candidate ids', () => {
    expect(() => new AdapterRegistry([makeAdapter(), makeAdapter()])).toThrow(
      AdapterRegistryContractError,
    );

    const candidate = makeAdapter().candidates[0]!;
    expect(
      () =>
        new AdapterRegistry([makeAdapter('duplicates', { candidates: [candidate, candidate] })]),
    ).toThrow(/unique/u);
  });

  it('rejects absolute, traversing, and unbounded candidate paths', () => {
    const base = makeAdapter();
    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('absolute', {
            candidates: [
              {
                id: 'unsafe',
                source: 'repository',
                kind: 'exact-file',
                relativePath: '/Users/private/AGENTS.md',
              },
            ],
          }),
        ]),
    ).toThrow(/source-relative/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('traversal', {
            candidates: [
              {
                id: 'unsafe',
                source: 'repository',
                kind: 'exact-file',
                relativePath: '../AGENTS.md',
              },
            ],
          }),
        ]),
    ).toThrow(/source-relative/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('unbounded', {
            ...base,
            candidates: [
              {
                id: 'directory',
                source: 'repository',
                kind: 'bounded-directory',
                relativePath: '.',
                maxDepth: 4,
                match: {},
              },
            ],
          }),
        ]),
    ).toThrow(/filename filter/u);
  });

  it('requires dated HTTPS specification provenance and declared source layers', () => {
    const adapter = makeAdapter();
    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('http-spec', {
            manifest: { ...adapter.manifest, specSources: ['http://example.test/spec'] },
          }),
        ]),
    ).toThrow(/HTTPS/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('undeclared-source', {
            manifest: { ...adapter.manifest, supportedSources: ['repository'] },
          }),
        ]),
    ).toThrow(/undeclared/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('invalid-date', {
            manifest: { ...adapter.manifest, documentedAsOf: '2026-02-30' },
          }),
        ]),
    ).toThrow(/YYYY-MM-DD/u);
  });

  it('rejects malformed manifest values before they enter the registry', () => {
    const base = makeAdapter('manifest-base');
    const manifests: unknown[] = [
      { ...base.manifest, id: '/Users/private/adapter' },
      { ...base.manifest, tool: { ...base.manifest.tool, label: 'bad\u202Elabel' } },
      { ...base.manifest, supportedKinds: [] },
      { ...base.manifest, supportedKinds: ['instruction', 'instruction'] },
      { ...base.manifest, supportedSources: [] },
      { ...base.manifest, supportedSources: ['repository', 'repository'] },
      { ...base.manifest, specSources: ['not a URL'] },
      { ...base.manifest, documentedAsOf: 'not-a-date' },
      {
        ...base.manifest,
        capabilities: { ...base.manifest.capabilities, rawView: false },
      },
      {
        ...base.manifest,
        capabilities: { ...base.manifest.capabilities, metadata: 'everything' },
      },
    ];

    for (const [index, manifest] of manifests.entries()) {
      expect(
        () =>
          new AdapterRegistry([
            makeAdapter(`invalid-manifest-${index}`, {
              manifest: manifest as ArtifactAdapter['manifest'],
            }),
          ]),
      ).toThrow(AdapterRegistryContractError);
    }
  });

  it('rejects malformed bounded candidate declarations', () => {
    const candidates: unknown[] = [
      {
        id: 'bad-kind',
        source: 'repository',
        kind: 'recursive-glob',
        relativePath: '.',
      },
      {
        id: 'bad-depth',
        source: 'repository',
        kind: 'bounded-directory',
        relativePath: '.',
        maxDepth: 0,
        match: { basenames: ['AGENTS.md'] },
      },
      {
        id: 'missing-filter',
        source: 'repository',
        kind: 'bounded-directory',
        relativePath: '.',
        maxDepth: 4,
        match: null,
      },
      {
        id: 'bad-basename',
        source: 'repository',
        kind: 'bounded-directory',
        relativePath: '.',
        maxDepth: 4,
        match: { basenames: ['nested/AGENTS.md'] },
      },
      {
        id: 'bad-suffix',
        source: 'repository',
        kind: 'bounded-directory',
        relativePath: '.',
        maxDepth: 4,
        match: { suffixes: ['/instructions.md'] },
      },
    ];

    for (const [index, candidate] of candidates.entries()) {
      expect(
        () =>
          new AdapterRegistry([
            makeAdapter(`invalid-candidate-${index}`, {
              candidates: [candidate as ArtifactAdapter['candidates'][number]],
            }),
          ]),
      ).toThrow(AdapterRegistryContractError);
    }
  });

  it('binds every Global candidate to one built-in locator', () => {
    const base = makeAdapter('locator-base');
    const globalCandidate = base.candidates[1]!;

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('missing-global-locator', {
            candidates: [
              {
                ...globalCandidate,
                locatorId: undefined,
              } as unknown as ArtifactAdapter['candidates'][number],
            ],
          }),
        ]),
    ).toThrow(/locator/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('repository-locator', {
            candidates: [
              {
                ...base.candidates[0]!,
                locatorId: 'future-tool',
              } as unknown as ArtifactAdapter['candidates'][number],
            ],
          }),
        ]),
    ).toThrow(/Repository candidate/u);

    expect(
      () =>
        new AdapterRegistry([
          makeAdapter('global-root-walk', {
            candidates: [
              {
                ...globalCandidate,
                relativePath: '.',
              },
            ],
          }),
        ]),
    ).toThrow(/tool-home root/u);
  });

  it('requires callable adapter methods', () => {
    const adapter = makeAdapter('missing-method');
    expect(
      () => new AdapterRegistry([{ ...adapter, match: undefined } as unknown as ArtifactAdapter]),
    ).toThrow(/match and inspect/u);
  });
});
