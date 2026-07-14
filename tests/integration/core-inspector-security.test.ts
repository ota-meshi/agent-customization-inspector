import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { inspectSource } from '../../src/core/inspector.js';
import { createScanLimits } from '../../src/core/limits.js';
import { ReadBudget } from '../../src/discovery/read-text.js';
import {
  AdapterRegistry,
  type AdapterInspection,
  type ArtifactAdapter,
  type CandidateSpec,
} from '../../src/core/registry.js';
import { createGlobalSourceRoot } from '../../src/sources/global-source.js';
import { createRepositorySource } from '../../src/sources/repository-source.js';

const temporaryDirectories: string[] = [];

interface TestAdapterIdentity {
  readonly adapterId: string;
  readonly tool: { readonly id: string; readonly label: string };
}

const defaultAdapterIdentity: TestAdapterIdentity = {
  adapterId: 'security-test-adapter',
  tool: { id: 'security-test-tool', label: 'Security Test Tool' },
};

async function temporaryDirectory(prefix: string): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), prefix));
  temporaryDirectories.push(directory);
  return directory;
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

function inspectionFor(
  input: Parameters<ArtifactAdapter['inspect']>[0],
  diagnostics: AdapterInspection['interpretation']['diagnostics'] = [],
  identity: TestAdapterIdentity = defaultAdapterIdentity,
): AdapterInspection {
  return {
    format: { id: 'markdown', mediaType: 'text/markdown', encoding: 'utf-8' },
    interpretation: {
      adapterId: identity.adapterId,
      tool: { ...identity.tool },
      kind: 'instruction',
      facets: [],
      variant: 'test',
      support: 'supported',
      scope: {
        origin: input.source.layer === 'repository' ? 'repository' : 'user',
        activation: 'startup',
        resolutionConfidence: 'documented',
      },
      metadata: {},
      metadataStatus: 'complete',
      documentation: {
        status: 'documented',
        reviewedAt: '2026-07-15',
        sources: ['https://example.test/security-adapter'],
      },
      diagnostics,
    },
  };
}

function createAdapter(options: {
  candidates: readonly CandidateSpec[];
  match: ArtifactAdapter['match'];
  inspect?: ArtifactAdapter['inspect'];
  identity?: TestAdapterIdentity;
}): ArtifactAdapter {
  const identity = options.identity ?? defaultAdapterIdentity;
  return {
    manifest: {
      id: identity.adapterId,
      tool: { ...identity.tool },
      supportedKinds: ['instruction'],
      supportedSources: ['repository', 'global'],
      specSources: ['https://example.test/security-adapter'],
      documentedAsOf: '2026-07-15',
      capabilities: { discovery: 'full', metadata: 'partial', rawView: true },
    },
    candidates: options.candidates,
    match: options.match,
    inspect: options.inspect ?? (async (input) => inspectionFor(input, [], identity)),
  };
}

interface InvalidInspectionCase {
  readonly name: string;
  mutate(valid: AdapterInspection, privateValue: string): AdapterInspection;
}

const invalidInspectionCases: readonly InvalidInspectionCase[] = [
  {
    name: 'non-string format id',
    mutate: (valid) =>
      ({ ...valid, format: { ...valid.format, id: undefined } }) as unknown as AdapterInspection,
  },
  {
    name: 'path-like format id',
    mutate: (valid, privateValue) => ({
      ...valid,
      format: { ...valid.format, id: privateValue },
    }),
  },
  {
    name: 'empty format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: '' } }),
  },
  {
    name: 'overlong format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: 'x'.repeat(257) } }),
  },
  {
    name: 'C0-controlled format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: 'private\u0001value' } }),
  },
  {
    name: 'C1-controlled format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: 'private\u0080value' } }),
  },
  {
    name: 'bidirectional override format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: 'private\u202avalue' } }),
  },
  {
    name: 'bidirectional isolate format id',
    mutate: (valid) => ({ ...valid, format: { ...valid.format, id: 'private\u2066value' } }),
  },
  {
    name: 'invalid media type',
    mutate: (valid, privateValue) => ({
      ...valid,
      format: { ...valid.format, mediaType: privateValue },
    }),
  },
  {
    name: 'unsupported encoding',
    mutate: (valid) =>
      ({
        ...valid,
        format: { ...valid.format, encoding: 'utf-16' },
      }) as unknown as AdapterInspection,
  },
  {
    name: 'adapter identity mismatch',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: { ...valid.interpretation, adapterId: privateValue },
    }),
  },
  {
    name: 'tool identity mismatch',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        tool: { ...valid.interpretation.tool, id: privateValue },
      },
    }),
  },
  {
    name: 'tool label mismatch',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        tool: { ...valid.interpretation.tool, label: privateValue },
      },
    }),
  },
  {
    name: 'unsupported kind',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: { ...valid.interpretation, kind: privateValue },
    }),
  },
  {
    name: 'path-like variant',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: { ...valid.interpretation, variant: privateValue },
    }),
  },
  {
    name: 'variant mismatch',
    mutate: (valid) => ({
      ...valid,
      interpretation: { ...valid.interpretation, variant: 'other' },
    }),
  },
  {
    name: 'support mismatch',
    mutate: (valid) => ({
      ...valid,
      interpretation: { ...valid.interpretation, support: 'partial' },
    }),
  },
  {
    name: 'non-array facets',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: { ...valid.interpretation, facets: privateValue },
      }) as unknown as AdapterInspection,
  },
  {
    name: 'invalid scope origin',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          scope: { ...valid.interpretation.scope, origin: privateValue },
        },
      }) as AdapterInspection,
  },
  {
    name: 'invalid scope activation',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          scope: { ...valid.interpretation.scope, activation: privateValue },
        },
      }) as AdapterInspection,
  },
  {
    name: 'invalid scope confidence',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          scope: { ...valid.interpretation.scope, resolutionConfidence: privateValue },
        },
      }) as AdapterInspection,
  },
  {
    name: 'invalid documentation status',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          documentation: { ...valid.interpretation.documentation, status: privateValue },
        },
      }) as AdapterInspection,
  },
  {
    name: 'mismatched documentation review date',
    mutate: (valid) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        documentation: { ...valid.interpretation.documentation, reviewedAt: '2026-07-14' },
      },
    }),
  },
  {
    name: 'non-array documentation sources',
    mutate: (valid, privateValue) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          documentation: { ...valid.interpretation.documentation, sources: privateValue },
        },
      }) as unknown as AdapterInspection,
  },
  {
    name: 'empty documentation sources',
    mutate: (valid) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        documentation: { ...valid.interpretation.documentation, sources: [] },
      },
    }),
  },
  {
    name: 'excessive documentation sources',
    mutate: (valid) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        documentation: {
          ...valid.interpretation.documentation,
          sources: Array.from({ length: 33 }, (_unused, index) =>
            index === 0
              ? 'https://example.test/security-adapter'
              : `https://example.test/private-${index}`,
          ),
        },
      },
    }),
  },
  {
    name: 'non-string documentation source',
    mutate: (valid) =>
      ({
        ...valid,
        interpretation: {
          ...valid.interpretation,
          documentation: { ...valid.interpretation.documentation, sources: [42] },
        },
      }) as unknown as AdapterInspection,
  },
  {
    name: 'foreign documentation source',
    mutate: (valid, privateValue) => ({
      ...valid,
      interpretation: {
        ...valid.interpretation,
        documentation: { ...valid.interpretation.documentation, sources: [privateValue] },
      },
    }),
  },
];

describe('Global candidate boundaries', () => {
  it.each([
    { rootKind: 'missing root', expectedCode: 'DISCOVERY_ROOT_UNREADABLE', createFile: false },
    { rootKind: 'file root', expectedCode: 'DISCOVERY_ROOT_NOT_DIRECTORY', createFile: true },
  ] as const)(
    'sanitizes a $rootKind failure before publishing it',
    async ({ createFile, expectedCode }) => {
      const parent = await temporaryDirectory('aci-global-invalid-root-');
      const root = path.join(parent, 'private-root-sentinel');
      if (createFile) {
        await writeFile(root, 'private-root-content');
      }
      const adapter = createAdapter({
        candidates: [
          {
            id: 'allowed-file',
            source: 'global',
            locatorId: 'root-tool',
            kind: 'exact-file',
            relativePath: 'allowed.md',
          },
        ],
        match: () => [],
      });

      const result = await inspectSource({
        source: 'global',
        roots: [
          createGlobalSourceRoot({
            locatorId: 'root-tool',
            label: 'Root Tool',
            rootPath: root,
          }),
        ],
        adapters: new AdapterRegistry([adapter]),
        revision: 1,
      });
      const serialized = JSON.stringify(result.publication);

      expect(result.complete).toBe(false);
      expect(result.publication.snapshot.diagnostics).toEqual(
        expect.arrayContaining([expect.objectContaining({ code: expectedCode })]),
      );
      expect(serialized).not.toContain('private-root-sentinel');
      expect(serialized).not.toContain('private-root-content');
      expect(serialized).not.toContain(parent);
    },
  );

  it.runIf(process.platform !== 'win32')(
    'rejects and sanitizes a symbolic-link Global root',
    async () => {
      const parent = await temporaryDirectory('aci-global-symlink-root-');
      const target = path.join(parent, 'private-target-sentinel');
      const root = path.join(parent, 'private-link-sentinel');
      await mkdir(target);
      await symlink(target, root);
      const adapter = createAdapter({
        candidates: [
          {
            id: 'allowed-file',
            source: 'global',
            locatorId: 'root-tool',
            kind: 'exact-file',
            relativePath: 'allowed.md',
          },
        ],
        match: () => [],
      });

      const result = await inspectSource({
        source: 'global',
        roots: [
          createGlobalSourceRoot({
            locatorId: 'root-tool',
            label: 'Root Tool',
            rootPath: root,
          }),
        ],
        adapters: new AdapterRegistry([adapter]),
        revision: 1,
      });
      const serialized = JSON.stringify(result.publication);

      expect(result.complete).toBe(false);
      expect(result.publication.snapshot.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ code: 'DISCOVERY_SYMLINK_ROOT_REJECTED' }),
        ]),
      );
      expect(serialized).not.toContain('private-target-sentinel');
      expect(serialized).not.toContain('private-link-sentinel');
      expect(serialized).not.toContain(parent);
    },
  );

  it('probes only the candidate locator and exact path without enumerating siblings', async () => {
    const allowedRoot = await temporaryDirectory('aci-global-allowed-');
    const unrelatedRoot = path.join(
      await temporaryDirectory('aci-global-unrelated-parent-'),
      'missing-root',
    );
    await writeFile(path.join(allowedRoot, 'agent-test.md'), '# Allowed');
    await writeFile(path.join(allowedRoot, 'unlisted-large.bin'), 'x'.repeat(128));
    let matchCalls = 0;
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-exact',
          source: 'global',
          locatorId: 'allowed-tool',
          kind: 'exact-file',
          relativePath: 'agent-test.md',
        },
      ],
      match() {
        matchCalls += 1;
        return [
          {
            candidateId: 'allowed-exact',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'allowed-tool',
          label: 'Allowed Tool',
          rootPath: allowedRoot,
        }),
        createGlobalSourceRoot({
          locatorId: 'unrelated-tool',
          label: 'Unrelated Tool',
          rootPath: unrelatedRoot,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ maxFileBytes: 16 }),
    });

    expect(result.complete).toBe(true);
    expect(result.publication.snapshot.artifacts).toHaveLength(1);
    expect(result.publication.snapshot.artifacts[0]?.path.virtual).toBe(
      'global://allowed-tool/agent-test.md',
    );
    expect(matchCalls).toBe(1);
    expect(result.publication.snapshot.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED' }),
        expect.objectContaining({ code: 'DISCOVERY_ROOT_UNREADABLE' }),
      ]),
    );
  });

  it('walks only a declared bounded directory and filters before file-size diagnostics', async () => {
    const root = await temporaryDirectory('aci-global-bounded-');
    await mkdir(path.join(root, 'instructions'));
    await mkdir(path.join(root, 'instructions', 'too-deep'));
    await writeFile(path.join(root, 'instructions', 'allowed.md'), '# Allowed');
    await writeFile(path.join(root, 'instructions', 'ignored.bin'), 'x'.repeat(128));
    await writeFile(path.join(root, 'instructions', 'too-deep', 'hidden.md'), 'x'.repeat(128));
    await writeFile(path.join(root, 'unlisted-large.md'), 'x'.repeat(128));
    const adapter = createAdapter({
      candidates: [
        {
          id: 'bounded-instructions',
          source: 'global',
          locatorId: 'bounded-tool',
          kind: 'bounded-directory',
          relativePath: 'instructions',
          maxDepth: 1,
          match: { suffixes: ['.md'] },
        },
      ],
      match() {
        return [
          {
            candidateId: 'bounded-instructions',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'bounded-tool',
          label: 'Bounded Tool',
          rootPath: root,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ maxFileBytes: 16 }),
    });

    expect(result.complete).toBe(true);
    expect(
      result.publication.snapshot.artifacts.map(({ path: artifactPath }) => artifactPath.relative),
    ).toEqual(['instructions/allowed.md']);
    expect(result.publication.snapshot.diagnostics).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_FILE_SIZE_LIMIT_REACHED' }),
      ]),
    );
  });

  it.runIf(process.platform !== 'win32')(
    'does not disclose a non-candidate sibling symlink name',
    async () => {
      const parent = await temporaryDirectory('aci-global-private-sibling-');
      const root = path.join(parent, 'root');
      const outside = path.join(parent, 'outside.md');
      await mkdir(path.join(root, 'instructions'), { recursive: true });
      await writeFile(outside, 'outside private sentinel');
      await symlink(outside, path.join(root, 'instructions', 'private-sibling.bin'));
      const adapter = createAdapter({
        candidates: [
          {
            id: 'bounded-instructions',
            source: 'global',
            locatorId: 'bounded-tool',
            kind: 'bounded-directory',
            relativePath: 'instructions',
            maxDepth: 1,
            match: { suffixes: ['.md'] },
          },
        ],
        match: () => [],
      });

      const result = await inspectSource({
        source: 'global',
        roots: [
          createGlobalSourceRoot({
            locatorId: 'bounded-tool',
            label: 'Bounded Tool',
            rootPath: root,
          }),
        ],
        adapters: new AdapterRegistry([adapter]),
        revision: 1,
      });
      const serialized = JSON.stringify(result.publication.snapshot);

      expect(result.complete).toBe(true);
      expect(serialized).not.toContain('private-sibling.bin');
      expect(serialized).not.toContain(parent);
      expect(serialized).not.toContain('outside private sentinel');
    },
  );

  it('reports truncated and skipped Global candidates at the source depth boundary', async () => {
    const root = await temporaryDirectory('aci-global-depth-');
    await mkdir(path.join(root, 'instructions', 'nested'), { recursive: true });
    await writeFile(path.join(root, 'instructions', 'allowed.md'), '# Allowed');
    await writeFile(
      path.join(root, 'instructions', 'nested', 'private.md'),
      `private-depth-sentinel:${root}`,
    );
    const adapter = createAdapter({
      candidates: [
        {
          id: 'truncated-directory',
          source: 'global',
          locatorId: 'depth-tool',
          kind: 'bounded-directory',
          relativePath: 'instructions',
          maxDepth: 3,
          match: { suffixes: ['.md'] },
        },
        {
          id: 'skipped-directory',
          source: 'global',
          locatorId: 'depth-tool',
          kind: 'bounded-directory',
          relativePath: 'instructions/nested',
          maxDepth: 1,
          match: { suffixes: ['.md'] },
        },
      ],
      match() {
        return [
          {
            candidateId: 'truncated-directory',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'depth-tool',
          label: 'Depth Tool',
          rootPath: root,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ maxDepth: 2 }),
    });
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(false);
    expect(
      result.publication.snapshot.artifacts.map(({ path: artifactPath }) => artifactPath.relative),
    ).toEqual(['instructions/allowed.md']);
    expect(
      result.publication.snapshot.diagnostics.filter(
        ({ code }) => code === 'DISCOVERY_DEPTH_LIMIT_REACHED',
      ),
    ).toHaveLength(2);
    expect(serialized).not.toContain('private.md');
    expect(serialized).not.toContain('private-depth-sentinel');
    expect(serialized).not.toContain(root);
  });

  it('bounds both later candidates and later roots with one shared Global entry budget', async () => {
    const firstRoot = await temporaryDirectory('aci-global-entry-first-');
    const secondRoot = path.join(
      await temporaryDirectory('aci-global-entry-second-parent-'),
      'private-unread-root',
    );
    await writeFile(path.join(firstRoot, 'first.md'), '# First');
    const adapter = createAdapter({
      candidates: [
        {
          id: 'first-file',
          source: 'global',
          locatorId: 'first-tool',
          kind: 'exact-file',
          relativePath: 'first.md',
        },
        {
          id: 'bounded-second-file',
          source: 'global',
          locatorId: 'first-tool',
          kind: 'exact-file',
          relativePath: 'second.md',
        },
        {
          id: 'unread-third-file',
          source: 'global',
          locatorId: 'second-tool',
          kind: 'exact-file',
          relativePath: 'third.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'first-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'first-tool',
          label: 'First Tool',
          rootPath: firstRoot,
        }),
        createGlobalSourceRoot({
          locatorId: 'second-tool',
          label: 'Second Tool',
          rootPath: secondRoot,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ global: { maxDirectoryEntries: 1 } }),
    });
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(false);
    expect(result.publication.snapshot.artifacts).toHaveLength(1);
    expect(
      result.publication.snapshot.diagnostics.filter(
        ({ code }) => code === 'DISCOVERY_ENTRY_LIMIT_REACHED',
      ),
    ).toHaveLength(2);
    expect(serialized).not.toContain('private-unread-root');
    expect(serialized).not.toContain(secondRoot);
  });

  it('sorts exact Global candidates by virtual relative path before inspection', async () => {
    const root = await temporaryDirectory('aci-global-order-');
    await Promise.all(
      ['c.md', 'a.md', 'b.md'].map((name) =>
        writeFile(path.join(root, name), `raw-order-sentinel:${name}:${root}`),
      ),
    );
    const candidates: CandidateSpec[] = ['c.md', 'a.md', 'b.md'].map((relativePath) => ({
      id: relativePath.slice(0, 1),
      source: 'global',
      locatorId: 'order-tool',
      kind: 'exact-file',
      relativePath,
    }));
    const adapter = createAdapter({
      candidates,
      match(entry) {
        return [
          {
            candidateId: entry.basename.slice(0, 1),
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'order-tool',
          label: 'Order Tool',
          rootPath: root,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });
    const serialized = JSON.stringify(result.publication);

    expect(
      result.publication.snapshot.artifacts.map(({ path: artifactPath }) => artifactPath.relative),
    ).toEqual(['a.md', 'b.md', 'c.md']);
    expect(serialized).not.toContain('raw-order-sentinel');
    expect(serialized).not.toContain(root);
  });

  it('stops every later root as soon as the artifact limit is reached', async () => {
    const firstRoot = await temporaryDirectory('aci-global-first-');
    const missingSecondRoot = path.join(
      await temporaryDirectory('aci-global-second-parent-'),
      'missing',
    );
    await writeFile(path.join(firstRoot, 'first.md'), '# First');
    const adapter = createAdapter({
      candidates: [
        {
          id: 'first-file',
          source: 'global',
          locatorId: 'first-tool',
          kind: 'exact-file',
          relativePath: 'first.md',
        },
        {
          id: 'second-file',
          source: 'global',
          locatorId: 'second-tool',
          kind: 'exact-file',
          relativePath: 'second.md',
        },
      ],
      match(entry) {
        return [
          {
            candidateId: entry.basename === 'first.md' ? 'first-file' : 'second-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'global',
      roots: [
        createGlobalSourceRoot({
          locatorId: 'first-tool',
          label: 'First Tool',
          rootPath: firstRoot,
        }),
        createGlobalSourceRoot({
          locatorId: 'second-tool',
          label: 'Second Tool',
          rootPath: missingSecondRoot,
        }),
      ],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ global: { maxArtifacts: 1 } }),
    });

    expect(result.publication.snapshot.artifacts).toHaveLength(1);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ARTIFACT_LIMIT_REACHED' })]),
    );
    expect(result.publication.snapshot.diagnostics).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'DISCOVERY_ROOT_UNREADABLE' })]),
    );
  });
});

describe('source inspection option validation', () => {
  it('rejects layer mismatches, duplicate locators, and invalid Repository root counts', async () => {
    const root = await temporaryDirectory('aci-source-options-');
    const repositoryRoot = createRepositorySource(root);
    const globalRoot = createGlobalSourceRoot({
      locatorId: 'options-tool',
      label: 'Options Tool',
      rootPath: root,
    });
    const adapters = new AdapterRegistry([]);

    await expect(
      inspectSource({
        source: 'repository',
        roots: [globalRoot],
        adapters,
        revision: 0,
      }),
    ).rejects.toThrow('A source scan received a root from another source layer.');
    await expect(
      inspectSource({
        source: 'global',
        roots: [globalRoot, globalRoot],
        adapters,
        revision: 0,
      }),
    ).rejects.toThrow('A source scan received duplicate locator ids.');
    await expect(
      inspectSource({
        source: 'repository',
        roots: [],
        adapters,
        revision: 0,
      }),
    ).rejects.toThrow('A Repository scan requires exactly one root.');
    await expect(
      inspectSource({
        source: 'repository',
        roots: [repositoryRoot, repositoryRoot],
        adapters,
        revision: 0,
      }),
    ).rejects.toThrow('A source scan received duplicate locator ids.');
  });

  it.each([Number.NaN, -1])('rejects an invalid revision %s before discovery', async (revision) => {
    const root = await temporaryDirectory('aci-invalid-revision-');

    await expect(
      inspectSource({
        source: 'repository',
        roots: [createRepositorySource(root)],
        adapters: new AdapterRegistry([]),
        revision,
      }),
    ).rejects.toThrow('A source revision must be a non-negative safe integer.');
  });
});

describe('adapter containment and cancellation', () => {
  it('bounds, deduplicates, and validates untrusted match arrays', async () => {
    const root = await temporaryDirectory('aci-match-array-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    const candidate: CandidateSpec = {
      id: 'allowed-file',
      source: 'repository',
      kind: 'exact-file',
      relativePath: 'allowed.md',
    };
    const valid = {
      candidateId: 'allowed-file',
      variant: 'test',
      kind: 'instruction',
      support: 'supported' as const,
    };
    let inspectCalls = 0;
    const adapter = createAdapter({
      candidates: [candidate],
      match() {
        return [
          valid,
          valid,
          { ...valid, candidateId: 42 as unknown as string },
          { ...valid, variant: 42 as unknown as string },
          { ...valid, kind: 42 as unknown as string },
          { ...valid, candidateId: 'not-eligible' },
          { ...valid, variant: '/private/path' },
          { ...valid, kind: 'unknown-kind' },
          { ...valid, support: 'unknown' as 'supported' },
          ...Array.from({ length: 60 }, () => valid),
        ];
      },
      async inspect(input) {
        inspectCalls += 1;
        return inspectionFor(input);
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });

    expect(inspectCalls).toBe(1);
    expect(result.complete).toBe(false);
    expect(result.publication.snapshot.artifacts).toHaveLength(1);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'ADAPTER_MATCH_LIMIT_REACHED' }),
        expect.objectContaining({ code: 'ADAPTER_MATCH_INVALID' }),
      ]),
    );
  });

  it('recovers when match returns a non-array value', async () => {
    const root = await temporaryDirectory('aci-match-non-array-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match: (() => ({ private: 'value' })) as unknown as ArtifactAdapter['match'],
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });

    expect(result.publication.snapshot.artifacts).toEqual([]);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ADAPTER_MATCH_FAILED' })]),
    );
  });

  it('matches Repository bounded candidates only within their declared bases and depths', async () => {
    const root = await temporaryDirectory('aci-repository-bounded-');
    await mkdir(path.join(root, 'configs', 'nested'), { recursive: true });
    await writeFile(path.join(root, 'allowed.md'), `raw-root-candidate:${root}`);
    await writeFile(path.join(root, 'configs', 'nested', 'deep.md'), `raw-deep-candidate:${root}`);
    await writeFile(path.join(root, 'outside.bin'), `raw-outside-candidate:${root}`);
    const adapter = createAdapter({
      candidates: [
        {
          id: 'root-file',
          source: 'repository',
          kind: 'bounded-directory',
          relativePath: '.',
          maxDepth: 1,
          match: { basenames: ['allowed.md'] },
        },
        {
          id: 'config-files',
          source: 'repository',
          kind: 'bounded-directory',
          relativePath: 'configs',
          maxDepth: 2,
          match: { suffixes: ['.md'] },
        },
      ],
      match(entry) {
        return [
          {
            candidateId: entry.relativePath === 'allowed.md' ? 'root-file' : 'config-files',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });
    const serialized = JSON.stringify(result.publication);

    expect(
      result.publication.snapshot.artifacts.map(({ path: artifactPath }) => artifactPath.relative),
    ).toEqual(['allowed.md', 'configs/nested/deep.md'].sort());
    expect(serialized).not.toContain('raw-root-candidate');
    expect(serialized).not.toContain('raw-deep-candidate');
    expect(serialized).not.toContain('raw-outside-candidate');
    expect(serialized).not.toContain(root);
  });

  it('accepts every declared support level and skips adapters without an eligible candidate', async () => {
    const root = await temporaryDirectory('aci-support-levels-');
    await writeFile(path.join(root, 'allowed.md'), `raw-support-sentinel:${root}`);
    let ineligibleMatchCalls = 0;
    const primary = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'supported-test',
            kind: 'instruction',
            support: 'supported',
          },
          {
            candidateId: 'allowed-file',
            variant: 'partial-test',
            kind: 'instruction',
            support: 'partial',
          },
          {
            candidateId: 'allowed-file',
            variant: 'raw-only-test',
            kind: 'instruction',
            support: 'raw-only',
          },
        ];
      },
      async inspect(input) {
        const valid = inspectionFor(input);
        return {
          ...valid,
          interpretation: {
            ...valid.interpretation,
            variant: input.match.variant,
            support: input.match.support,
          },
        };
      },
    });
    const ineligibleIdentity: TestAdapterIdentity = {
      adapterId: 'ineligible-security-adapter',
      tool: { id: 'ineligible-security-tool', label: 'Ineligible Security Tool' },
    };
    const ineligible = createAdapter({
      candidates: [
        {
          id: 'missing-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'missing.md',
        },
      ],
      identity: ineligibleIdentity,
      match() {
        ineligibleMatchCalls += 1;
        return [];
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([primary, ineligible]),
      revision: 1,
    });
    const [document] = [...result.publication.details];
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(true);
    expect(ineligibleMatchCalls).toBe(0);
    expect(document?.interpretations.map(({ support }) => support)).toEqual([
      'supported',
      'partial',
      'raw-only',
    ]);
    expect(document?.interpretationSummaries).toEqual([
      expect.objectContaining({ support: 'raw-only' }),
    ]);
    expect(serialized).not.toContain('raw-support-sentinel');
    expect(serialized).not.toContain(root);
  });

  it('fails closed when the combined read budget cannot reserve a candidate file', async () => {
    const root = await temporaryDirectory('aci-combined-budget-');
    await writeFile(path.join(root, 'allowed.md'), `raw-budget-sentinel:${root}`);
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      combinedReadBudget: new ReadBudget(1),
    });
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(false);
    expect(result.publication.snapshot.artifacts).toEqual([]);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'DISCOVERY_TOTAL_BYTE_LIMIT_REACHED' }),
      ]),
    );
    expect(serialized).not.toContain('raw-budget-sentinel');
    expect(serialized).not.toContain(root);
  });

  it('rejects a candidate id that is declared but is not eligible for the file', async () => {
    const root = await temporaryDirectory('aci-candidate-mismatch-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    let inspectCalls = 0;
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
        {
          id: 'other-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'other.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'other-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
      async inspect(input) {
        inspectCalls += 1;
        return inspectionFor(input);
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });

    expect(inspectCalls).toBe(0);
    expect(result.publication.snapshot.artifacts).toEqual([]);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ADAPTER_MATCH_INVALID' })]),
    );
  });

  it.each(invalidInspectionCases)(
    'rejects an invalid $name without disclosing adapter values',
    async ({ mutate }) => {
      const root = await temporaryDirectory('aci-invalid-inspection-');
      const privateValue = path.join(root, 'private-inspection-sentinel');
      await writeFile(path.join(root, 'allowed.md'), `raw-inspection-sentinel:${privateValue}`);
      const adapter = createAdapter({
        candidates: [
          {
            id: 'allowed-file',
            source: 'repository',
            kind: 'exact-file',
            relativePath: 'allowed.md',
          },
        ],
        match() {
          return [
            {
              candidateId: 'allowed-file',
              variant: 'test',
              kind: 'instruction',
              support: 'supported',
            },
          ];
        },
        async inspect(input) {
          return mutate(inspectionFor(input), privateValue);
        },
      });

      const result = await inspectSource({
        source: 'repository',
        roots: [createRepositorySource(root)],
        adapters: new AdapterRegistry([adapter]),
        revision: 1,
      });
      const serialized = JSON.stringify(result.publication);

      expect(result.complete).toBe(false);
      expect(result.publication.snapshot.artifacts).toEqual([]);
      expect(result.publication.snapshot.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: 'ADAPTER_INSPECTION_FAILED',
            message: 'A trusted adapter failed while inspecting an artifact and was skipped.',
          }),
        ]),
      );
      expect(serialized).not.toContain('raw-inspection-sentinel');
      expect(serialized).not.toContain('private-inspection-sentinel');
      expect(serialized).not.toContain(root);
    },
  );

  it.each([
    {
      name: 'partial metadata',
      diagnosticCode: 'METADATA_LIMIT_REACHED',
      metadata(privateValue: string): unknown {
        return { secret: `${privateValue}:${'x'.repeat(9_000)}` };
      },
    },
    {
      name: 'unavailable metadata',
      diagnosticCode: 'METADATA_UNAVAILABLE',
      metadata(privateValue: string): unknown {
        return new URL(`https://example.test/?private=${encodeURIComponent(privateValue)}`);
      },
    },
  ] as const)(
    'withholds $name and exposes only a fixed diagnostic',
    async ({ diagnosticCode, metadata }) => {
      const root = await temporaryDirectory('aci-metadata-boundary-');
      const privateValue = path.join(root, 'private-metadata-sentinel');
      await writeFile(path.join(root, 'allowed.md'), `raw-metadata-sentinel:${privateValue}`);
      const adapter = createAdapter({
        candidates: [
          {
            id: 'allowed-file',
            source: 'repository',
            kind: 'exact-file',
            relativePath: 'allowed.md',
          },
        ],
        match() {
          return [
            {
              candidateId: 'allowed-file',
              variant: 'test',
              kind: 'instruction',
              support: 'supported',
            },
          ];
        },
        async inspect(input) {
          const valid = inspectionFor(input);
          return {
            ...valid,
            interpretation: {
              ...valid.interpretation,
              metadata: metadata(privateValue),
              metadataStatus: 'complete',
            },
          } as AdapterInspection;
        },
      });

      const result = await inspectSource({
        source: 'repository',
        roots: [createRepositorySource(root)],
        adapters: new AdapterRegistry([adapter]),
        revision: 1,
      });
      const [document] = [...result.publication.details];
      const [interpretation] = document?.interpretations ?? [];
      const serialized = JSON.stringify(result.publication);

      expect(result.complete).toBe(true);
      expect(result.publication.snapshot.artifacts).toHaveLength(1);
      expect(interpretation?.metadata).toEqual({});
      expect(interpretation?.metadataStatus).toBe('unavailable');
      expect(document?.diagnosticCodes).toContain(diagnosticCode);
      expect(document?.diagnostics).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: diagnosticCode,
            message: expect.stringMatching(/^Structured metadata /u),
          }),
        ]),
      );
      expect(serialized).not.toContain('raw-metadata-sentinel');
      expect(serialized).not.toContain('private-metadata-sentinel');
      expect(serialized).not.toContain(root);
    },
  );

  it.each([
    { label: 'no newline', content: 'raw-newline-none', expected: 'none' },
    { label: 'LF newlines', content: 'raw-newline-lf\nsecond', expected: 'lf' },
    { label: 'CRLF newlines', content: 'raw-newline-crlf\r\nsecond', expected: 'crlf' },
    {
      label: 'mixed newlines',
      content: 'raw-newline-mixed\r\nsecond\nthird\rfourth',
      expected: 'mixed',
    },
  ] as const)('classifies $label while withholding raw text', async ({ content, expected }) => {
    const root = await temporaryDirectory('aci-newline-');
    await writeFile(path.join(root, 'allowed.md'), content);
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });
    const [document] = [...result.publication.details];
    const serialized = JSON.stringify(result.publication);

    expect(document?.content).toMatchObject({ displayText: '', newline: expected });
    expect(serialized).not.toContain(content);
    expect(serialized).not.toContain(root);
  });

  it('retains the first safe format and reports a sanitized adapter format conflict', async () => {
    const root = await temporaryDirectory('aci-format-conflict-');
    await writeFile(path.join(root, 'allowed.md'), `raw-format-conflict-sentinel:${root}`);
    const candidate: CandidateSpec = {
      id: 'allowed-file',
      source: 'repository',
      kind: 'exact-file',
      relativePath: 'allowed.md',
    };
    const match: ArtifactAdapter['match'] = () => [
      {
        candidateId: 'allowed-file',
        variant: 'test',
        kind: 'instruction',
        support: 'supported',
      },
    ];
    const secondaryIdentity: TestAdapterIdentity = {
      adapterId: 'secondary-security-adapter',
      tool: { id: 'secondary-security-tool', label: 'Secondary Security Tool' },
    };
    const first = createAdapter({ candidates: [candidate], match });
    const second = createAdapter({
      candidates: [candidate],
      match,
      identity: secondaryIdentity,
      async inspect(input) {
        const valid = inspectionFor(input, [], secondaryIdentity);
        return {
          ...valid,
          format: { id: 'plain-text', mediaType: 'text/plain', encoding: 'utf-8' },
        };
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([first, second]),
      revision: 1,
    });
    const [document] = [...result.publication.details];
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(false);
    expect(document?.format).toEqual({
      id: 'markdown',
      mediaType: 'text/markdown',
      encoding: 'utf-8',
    });
    expect(document?.interpretations.map(({ adapterId }) => adapterId)).toEqual([
      'security-test-adapter',
      'secondary-security-adapter',
    ]);
    expect(document?.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: 'ADAPTER_FORMAT_CONFLICT',
          message: 'Adapters reported conflicting formats; the first safe format was retained.',
        }),
      ]),
    );
    expect(serialized).not.toContain('raw-format-conflict-sentinel');
    expect(serialized).not.toContain(root);
  });

  it('recovers when a returned match getter throws', async () => {
    const root = await temporaryDirectory('aci-match-getter-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        const match = Object.defineProperty({}, 'candidateId', {
          get() {
            throw new Error('private getter detail');
          },
        });
        return [match as ReturnType<ArtifactAdapter['match']>[number]];
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });

    expect(result.publication.snapshot.artifacts).toEqual([]);
    expect(result.publication.snapshot.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ADAPTER_MATCH_FAILED' })]),
    );
    expect(JSON.stringify(result.publication.snapshot)).not.toContain('private getter detail');
  });

  it('leaves an adapter wait promptly when it ignores cancellation', async () => {
    const root = await temporaryDirectory('aci-adapter-abort-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    const controller = new AbortController();
    let pendingInput: Parameters<ArtifactAdapter['inspect']>[0] | undefined;
    let resolveInspection: ((inspection: AdapterInspection) => void) | undefined;
    let notifyStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
      inspect: (input) => {
        pendingInput = input;
        notifyStarted?.();
        return new Promise<AdapterInspection>((resolve) => {
          resolveInspection = resolve;
        });
      },
    });

    const inspection = inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      signal: controller.signal,
    });
    await started;
    controller.abort();

    const result = await inspection;
    expect(result.aborted).toBe(true);
    expect(result.publication.snapshot.artifacts).toEqual([]);

    resolveInspection?.(inspectionFor(pendingInput!));
    await new Promise<void>((resolve) => setImmediate(resolve));
  });

  it('treats a cooperative adapter AbortError as cancellation without exposing its message', async () => {
    const root = await temporaryDirectory('aci-adapter-abort-error-');
    await writeFile(path.join(root, 'allowed.md'), `raw-abort-error-sentinel:${root}`);
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
      async inspect() {
        const error = new Error(`private-abort-message:${root}`);
        error.name = 'AbortError';
        throw error;
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });
    const serialized = JSON.stringify(result.publication);

    expect(result.aborted).toBe(true);
    expect(result.complete).toBe(false);
    expect(result.publication.snapshot.artifacts).toEqual([]);
    expect(serialized).not.toContain('raw-abort-error-sentinel');
    expect(serialized).not.toContain('private-abort-message');
    expect(serialized).not.toContain(root);
  });

  it('bounds diagnostics retained by one document and adds a summary', async () => {
    const root = await temporaryDirectory('aci-document-diagnostics-');
    await writeFile(path.join(root, 'allowed.md'), '# Allowed');
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
      async inspect(input) {
        return inspectionFor(
          input,
          Array.from({ length: 300 }, (_unused, index) => ({
            code: `TEST_${index}`,
            severity: 'warning' as const,
            message: 'Bounded test diagnostic.',
            source: input.entry.source,
          })),
        );
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
    });
    const [document] = [...result.publication.details];

    expect(document?.diagnostics).toHaveLength(256);
    expect(document?.diagnostics.at(-1)?.code).toBe('ARTIFACT_DIAGNOSTIC_LIMIT_REACHED');
    expect(document?.interpretations[0]?.diagnostics).toHaveLength(256);
  });

  it('bounds retained detail diagnostics when the source diagnostic budget is exhausted', async () => {
    const root = await temporaryDirectory('aci-source-diagnostic-budget-');
    await writeFile(path.join(root, 'allowed.md'), `raw-diagnostic-budget-sentinel:${root}`);
    const adapter = createAdapter({
      candidates: [
        {
          id: 'allowed-file',
          source: 'repository',
          kind: 'exact-file',
          relativePath: 'allowed.md',
        },
      ],
      match() {
        return [
          {
            candidateId: 'allowed-file',
            variant: 'test',
            kind: 'instruction',
            support: 'supported',
          },
        ];
      },
      async inspect(input) {
        return inspectionFor(
          input,
          Array.from({ length: 3 }, () => ({
            code: `PRIVATE_DIAGNOSTIC_CODE_${root}`,
            severity: 'warning',
            message: `private-diagnostic-message:${root}`,
            source: input.entry.source,
          })),
        );
      },
    });

    const result = await inspectSource({
      source: 'repository',
      roots: [createRepositorySource(root)],
      adapters: new AdapterRegistry([adapter]),
      revision: 1,
      limits: createScanLimits({ repository: { maxDetailedDiagnostics: 1 } }),
    });
    const [document] = [...result.publication.details];
    const serialized = JSON.stringify(result.publication);

    expect(result.complete).toBe(true);
    expect(document?.diagnostics).toHaveLength(1);
    expect(document?.diagnostics[0]).toMatchObject({
      code: 'ADAPTER_REPORTED_DIAGNOSTIC',
      message:
        'A trusted adapter reported an artifact diagnostic; its detail is withheld pending redaction.',
    });
    expect(document?.interpretations[0]?.diagnostics).toHaveLength(1);
    expect(serialized).not.toContain('PRIVATE_DIAGNOSTIC_CODE');
    expect(serialized).not.toContain('private-diagnostic-message');
    expect(serialized).not.toContain('raw-diagnostic-budget-sentinel');
    expect(serialized).not.toContain(root);
  });
});
