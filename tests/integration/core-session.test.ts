import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { inspectInitialSession } from '../../src/core/session.js';
import { AdapterRegistry } from '../../src/core/registry.js';
import { createGlobalSourceRoot } from '../../src/sources/global-source.js';
import { createRepositorySource } from '../../src/sources/repository-source.js';
import { createTestAdapter } from '../helpers/test-adapter.js';
import { TestToolHomeResolver } from '../helpers/test-tool-home-resolver.js';

const temporaryDirectories: string[] = [];

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

describe('initial source-separated session', () => {
  it('validates includeGlobal and reports a missing trusted resolver generically', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');

    await expect(
      inspectInitialSession({
        repositoryRoot,
        includeGlobal: 'yes' as unknown as boolean,
        adapters: new AdapterRegistry([]),
      }),
    ).rejects.toThrow(/boolean/u);

    const session = await inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([]),
    });
    const global = session.snapshot.global;
    expect(global).toMatchObject({
      enabled: true,
      status: 'error',
      diagnostics: [expect.objectContaining({ code: 'GLOBAL_RESOLVER_UNAVAILABLE' })],
    });
    if (global.status !== 'error') {
      throw new Error('Expected an error Global snapshot.');
    }
    expect(Object.isFrozen(global.diagnostics)).toBe(true);
    expect(() => (global.diagnostics as unknown[]).push({ private: 'mutable' })).toThrow();
  });

  it.each([undefined, false])(
    'does not read or invoke the Global resolver when includeGlobal is %s',
    async (includeGlobal) => {
      const repositoryRoot = await temporaryDirectory('aci-session-repository-');
      const fakeHome = await temporaryDirectory('aci-session-private-home-');
      await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');
      await writeFile(path.join(fakeHome, 'agent-test.md'), '# Global private sentinel');

      let resolverPropertyReads = 0;
      let rootMaterializations = 0;
      const resolver = new TestToolHomeResolver(() => {
        rootMaterializations += 1;
        return [
          createGlobalSourceRoot({
            locatorId: 'test-tool',
            label: 'Test Tool',
            rootPath: fakeHome,
          }),
        ];
      });
      const options = {
        repositoryRoot,
        adapters: new AdapterRegistry([createTestAdapter()]),
        ...(includeGlobal === undefined ? {} : { includeGlobal }),
        get globalResolver() {
          resolverPropertyReads += 1;
          return resolver;
        },
      };

      const session = await inspectInitialSession(options);
      const serialized = JSON.stringify(session);

      expect(session.snapshot.global).toEqual({ enabled: false, status: 'disabled' });
      expect(session.snapshot.repository.artifacts).toHaveLength(1);
      expect(resolverPropertyReads).toBe(0);
      expect(resolver.calls).toBe(0);
      expect(rootMaterializations).toBe(0);
      expect(serialized).not.toContain(fakeHome);
      expect(serialized).not.toContain('Global private sentinel');
      expect(serialized).not.toContain('displayText');
    },
  );

  it('publishes Repository and opted-in Global as independent catalogs', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const fakeHome = await temporaryDirectory('aci-session-private-home-');
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');
    await writeFile(path.join(fakeHome, 'agent-test.md'), '# Global');
    const resolver = new TestToolHomeResolver(() => [
      createGlobalSourceRoot({
        locatorId: 'test-tool',
        label: 'Test Tool',
        rootPath: fakeHome,
      }),
    ]);

    const session = await inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([createTestAdapter()]),
      globalResolver: resolver,
    });

    expect(resolver.calls).toBe(1);
    expect(session.snapshot.global.status).toBe('ready');
    if (session.snapshot.global.status !== 'ready') {
      throw new Error('Expected a ready Global snapshot.');
    }
    const repositoryCatalog = session.snapshot.repository;
    const globalCatalog = session.snapshot.global.catalog;
    expect(repositoryCatalog.id).not.toBe(globalCatalog.id);
    expect(repositoryCatalog.source).toBe('repository');
    expect(globalCatalog.source).toBe('global');
    expect(repositoryCatalog.artifacts).toHaveLength(1);
    expect(globalCatalog.artifacts).toHaveLength(1);
    expect(repositoryCatalog.artifacts[0]?.path.virtual).toBe('repository://root/agent-test.md');
    expect(globalCatalog.artifacts[0]?.path.virtual).toBe('global://test-tool/agent-test.md');

    const repositoryArtifact = repositoryCatalog.artifacts[0]!;
    const globalArtifact = globalCatalog.artifacts[0]!;
    expect(
      session.getArtifact({
        source: 'repository',
        catalogId: repositoryCatalog.id,
        revision: repositoryCatalog.revision,
        id: repositoryArtifact.id,
      }).content,
    ).toMatchObject({ displayText: '', byteLength: Buffer.byteLength('# Repository') });
    expect(
      session.getArtifact({
        source: 'global',
        catalogId: globalCatalog.id,
        revision: globalCatalog.revision,
        id: globalArtifact.id,
      }).source.layer,
    ).toBe('global');
    expect(JSON.stringify(session)).not.toContain(fakeHome);
    expect(JSON.stringify(session.snapshot)).not.toContain('displayText');
  });

  it('contains Global resolver failure without exposing its error or changing Repository', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const privatePath = path.join(
      await temporaryDirectory('aci-session-private-home-'),
      'secret-override',
    );
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');
    const resolver = new TestToolHomeResolver(() => {
      throw new Error(`Cannot access ${privatePath}: secret resolver detail`);
    });

    const session = await inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([createTestAdapter()]),
      globalResolver: resolver,
    });
    const serialized = JSON.stringify(session);

    expect(session.snapshot.repository.artifacts).toHaveLength(1);
    expect(session.snapshot.global).toMatchObject({ enabled: true, status: 'error' });
    expect(serialized).toContain('GLOBAL_RESOLUTION_FAILED');
    expect(serialized).not.toContain(privatePath);
    expect(serialized).not.toContain('secret resolver detail');
  });

  it('reports an inaccessible Global root as partial while Repository stays usable', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const missingGlobalRoot = path.join(
      await temporaryDirectory('aci-session-private-home-'),
      'missing',
    );
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');
    const resolver = new TestToolHomeResolver(() => [
      createGlobalSourceRoot({
        locatorId: 'test-tool',
        label: 'Test Tool',
        rootPath: missingGlobalRoot,
      }),
    ]);

    const session = await inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([createTestAdapter()]),
      globalResolver: resolver,
    });

    expect(session.snapshot.repository.artifacts).toHaveLength(1);
    expect(session.snapshot.global.status).toBe('partial');
    if (session.snapshot.global.status !== 'partial') {
      throw new Error('Expected a partial Global snapshot.');
    }
    expect(session.snapshot.global.catalog.artifacts).toEqual([]);
    expect(JSON.stringify(session)).not.toContain(missingGlobalRoot);
  });

  it('recovers from adapter exceptions at the artifact boundary', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');

    const session = await inspectInitialSession({
      repositoryRoot,
      adapters: new AdapterRegistry([createTestAdapter({ failInspect: true })]),
    });

    expect(session.snapshot.repository.artifacts).toEqual([]);
    expect(session.snapshot.repository.diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'ADAPTER_INSPECTION_FAILED' })]),
    );
    expect(JSON.stringify(session)).not.toContain('# Repository');
  });

  it('withholds unredacted adapter detail until the redaction milestone', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const privateValue = path.join(repositoryRoot, 'private-user-secret');
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), 'UNREDACTED_SOURCE_SNIPPET');
    const adapter = createTestAdapter({
      async inspect(input) {
        return {
          format: { id: 'markdown', mediaType: 'text/markdown', encoding: 'utf-8' },
          interpretation: {
            adapterId: 'test-adapter',
            tool: { id: 'test-agent', label: 'Test Agent' },
            kind: 'instruction',
            facets: [privateValue],
            variant: 'test-only',
            support: 'supported',
            scope: {
              origin: 'repository',
              base: privateValue,
              activation: 'startup',
              appliesTo: [privateValue],
              precedenceHint: `Loaded from ${privateValue}`,
              resolutionConfidence: 'documented',
            },
            metadata: { privateValue, sourceSnippet: input.text },
            metadataStatus: 'complete',
            documentation: {
              status: 'documented',
              reviewedAt: '2026-07-15',
              sources: ['https://example.test/test-agent-specification'],
            },
            diagnostics: [
              {
                code: 'UNREDACTED_CODE_SENTINEL',
                severity: 'warning',
                message: input.text,
                source: input.entry.source,
              },
            ],
          },
        };
      },
    });
    const session = await inspectInitialSession({
      repositoryRoot,
      adapters: new AdapterRegistry([adapter]),
    });
    const summary = session.snapshot.repository.artifacts[0]!;
    const detail = session.getArtifact({
      source: 'repository',
      catalogId: session.snapshot.repository.id,
      revision: session.snapshot.repository.revision,
      id: summary.id,
    });
    const serialized = JSON.stringify(detail);

    expect(serialized).not.toContain(privateValue);
    expect(serialized).not.toContain('UNREDACTED_SOURCE_SNIPPET');
    expect(serialized).not.toContain('UNREDACTED_CODE_SENTINEL');
    expect(serialized).toContain('ADAPTER_REPORTED_DIAGNOSTIC');
    expect(detail.content.displayText).toBe('');
    expect(detail.interpretations[0]).toMatchObject({
      facets: [],
      metadata: {},
      metadataStatus: 'unavailable',
      scope: {
        origin: 'repository',
        activation: 'startup',
        resolutionConfidence: 'documented',
      },
    });
    expect(detail.securityFlags).toContain('structured-detail-withheld-pending-redaction');
  });

  it('does not invoke a resolver when the signal is already aborted', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const controller = new AbortController();
    controller.abort();
    const resolver = new TestToolHomeResolver(() => []);

    await expect(
      inspectInitialSession({
        repositoryRoot,
        includeGlobal: true,
        adapters: new AdapterRegistry([]),
        globalResolver: resolver,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ name: 'AbortError' });
    expect(resolver.calls).toBe(0);
  });

  it('leaves a resolver wait on abort and discards its late result', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const controller = new AbortController();
    let notifyStarted: (() => void) | undefined;
    const started = new Promise<void>((resolve) => {
      notifyStarted = resolve;
    });
    let resolveLate: ((roots: readonly never[]) => void) | undefined;
    const late = new Promise<readonly never[]>((resolve) => {
      resolveLate = resolve;
    });
    const resolver = new TestToolHomeResolver(() => {
      notifyStarted?.();
      return late;
    });

    const pending = inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([]),
      globalResolver: resolver,
      signal: controller.signal,
    });
    await started;
    controller.abort();
    const session = await pending;
    resolveLate?.([]);
    await Promise.resolve();

    expect(resolver.calls).toBe(1);
    expect(session.snapshot.global).toMatchObject({
      status: 'error',
      diagnostics: [expect.objectContaining({ code: 'GLOBAL_RESOLUTION_ABORTED' })],
    });
  });

  it('discards an aborted Global inspection instead of publishing a partial catalog', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    const fakeHome = await temporaryDirectory('aci-session-private-home-');
    await writeFile(path.join(fakeHome, 'agent-test.md'), '# Global');
    const controller = new AbortController();
    let notifyInspection: (() => void) | undefined;
    const inspectionStarted = new Promise<void>((resolve) => {
      notifyInspection = resolve;
    });
    const adapter = createTestAdapter({
      inspect: async () => {
        notifyInspection?.();
        return new Promise<never>(() => undefined);
      },
    });
    const resolver = new TestToolHomeResolver(() => [
      createGlobalSourceRoot({
        locatorId: 'test-tool',
        label: 'Test Tool',
        rootPath: fakeHome,
      }),
    ]);

    const pending = inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([adapter]),
      globalResolver: resolver,
      signal: controller.signal,
    });
    await inspectionStarted;
    controller.abort();
    const session = await pending;

    expect(session.snapshot.global).toMatchObject({
      enabled: true,
      status: 'error',
      diagnostics: [expect.objectContaining({ code: 'GLOBAL_RESOLUTION_ABORTED' })],
    });
    expect(session.snapshot.global).not.toHaveProperty('catalog');
    expect(JSON.stringify(session)).not.toContain(fakeHome);
  });

  it('rejects invalid resolver authorities and stale detail requests generically', async () => {
    const repositoryRoot = await temporaryDirectory('aci-session-repository-');
    await writeFile(path.join(repositoryRoot, 'agent-test.md'), '# Repository');
    const resolver = new TestToolHomeResolver(() => [createRepositorySource(repositoryRoot)]);
    const session = await inspectInitialSession({
      repositoryRoot,
      includeGlobal: true,
      adapters: new AdapterRegistry([createTestAdapter()]),
      globalResolver: resolver,
    });
    const artifact = session.snapshot.repository.artifacts[0]!;

    expect(session.snapshot.global).toMatchObject({
      status: 'error',
      diagnostics: [expect.objectContaining({ code: 'GLOBAL_RESOLUTION_FAILED' })],
    });
    expect(() =>
      session.getArtifact({
        source: 'repository',
        catalogId: session.snapshot.repository.id,
        revision: session.snapshot.repository.revision + 1,
        id: artifact.id,
      }),
    ).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }));
    expect(() =>
      session.getArtifact({
        source: 'global',
        catalogId: 'global-catalog',
        revision: 1,
        id: 'global-artifact',
      }),
    ).toThrowError(expect.objectContaining({ code: 'ARTIFACT_UNAVAILABLE' }));
  });
});
