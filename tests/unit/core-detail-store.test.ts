import { describe, expect, it } from 'vitest';

import { ArtifactDetailStore, DetailStoreError } from '../../src/core/detail-store.js';
import type { ArtifactDocument, SourceDescriptor, SourceLayer } from '../../src/core/model.js';
import { createVirtualPathFromSegments } from '../../src/sources/virtual-path.js';

function makeSource(layer: SourceLayer): SourceDescriptor {
  return {
    layer,
    id: `${layer}-source`,
    label: layer === 'repository' ? 'Repository' : 'Global',
    virtualBase: `${layer}://fixture`,
  };
}

function makeDocument(
  layer: SourceLayer,
  id: string,
  relativePath = 'AGENTS.md',
): ArtifactDocument {
  const source = makeSource(layer);
  return {
    schemaVersion: 1,
    source,
    id,
    path: {
      relative: relativePath,
      basename: relativePath.split('/').at(-1)!,
      virtual: `${source.virtualBase}/${relativePath}`,
    },
    format: {
      id: 'markdown',
      mediaType: 'text/markdown',
      encoding: 'utf-8',
    },
    interpretationSummaries: [
      {
        tool: { id: 'openai-codex', label: 'OpenAI Codex' },
        kinds: ['instruction'],
        support: 'supported',
      },
    ],
    diagnosticCounts: { info: 0, warning: 0, error: 0 },
    diagnosticCodes: [],
    redactionApplied: false,
    securityFlags: [],
    content: {
      displayText: '# Safe redacted text\n',
      byteLength: 21,
      newline: 'lf',
      redactions: [],
    },
    interpretations: [
      {
        adapterId: 'test-adapter',
        tool: { id: 'openai-codex', label: 'OpenAI Codex' },
        kind: 'instruction',
        facets: ['markdown'],
        variant: 'standard',
        support: 'supported',
        scope: {
          origin: layer === 'repository' ? 'repository' : 'user',
          base: relativePath.includes('/') ? relativePath.split('/').slice(0, -1).join('/') : '.',
          activation: 'startup',
          appliesTo: ['**/*'],
          precedenceHint: 'Documented load order only.',
          resolutionConfidence: 'documented',
        },
        metadata: { nested: ['value'] },
        metadataStatus: 'complete',
        documentation: {
          status: 'documented',
          reviewedAt: '2026-07-15',
          sources: ['https://example.test/specification'],
        },
        diagnostics: [],
      },
    ],
    diagnostics: [],
  };
}

function readRequest(source: SourceLayer, id: string, catalogId: string, revision: number) {
  return { source, id, catalogId, revision } as const;
}

describe('ArtifactDetailStore', () => {
  it('returns only a source- and revision-matched document on demand', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'repository-catalog',
      revision: 2,
      documents: [makeDocument('repository', 'repository-artifact')],
    });

    const document = store.getArtifact(
      readRequest('repository', 'repository-artifact', 'repository-catalog', 2),
    );
    expect(document.id).toBe('repository-artifact');
    expect(document.source.layer).toBe('repository');
    expect(Object.isFrozen(document)).toBe(true);
  });

  it('defensively clones documents so later caller mutation cannot alter detail', () => {
    const store = new ArtifactDetailStore();
    const original = makeDocument('repository', 'artifact');
    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [original],
    });

    (original.content as { displayText: string }).displayText = 'changed';
    expect(
      store.getArtifact(readRequest('repository', 'artifact', 'catalog', 1)).content.displayText,
    ).toBe('# Safe redacted text\n');
  });

  it('drops undeclared private envelope fields instead of serializing them', () => {
    const store = new ArtifactDetailStore();
    const original = makeDocument('repository', 'artifact');
    (original as ArtifactDocument & { absolutePath: string }).absolutePath =
      '/Users/private-user-secret/repository/AGENTS.md';
    (original.source as SourceDescriptor & { rootPath: string }).rootPath =
      '/Users/private-user-secret';

    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [original],
    });
    const stored = store.getArtifact(readRequest('repository', 'artifact', 'catalog', 1));

    expect(JSON.stringify(stored)).not.toContain('private-user-secret');
    expect(stored).not.toHaveProperty('absolutePath');
    expect(stored.source).not.toHaveProperty('rootPath');
  });

  it('returns stale without exposing former content when a version differs', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 4,
      documents: [makeDocument('repository', 'artifact')],
    });

    expect(() =>
      store.getArtifact(readRequest('repository', 'artifact', 'catalog', 3)),
    ).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }));
    expect(() =>
      store.getArtifact(readRequest('repository', 'artifact', 'old-catalog', 4)),
    ).toThrowError(expect.objectContaining({ code: 'STALE_REVISION' }));
  });

  it('makes disabled and evicted Global details fail with the same generic error', () => {
    const store = new ArtifactDetailStore();
    const request = {
      ...readRequest('global', 'global-artifact', 'global-catalog', 1),
      sourceEnabled: false,
    } as const;
    store.replaceSource({
      source: 'global',
      catalogId: 'global-catalog',
      revision: 1,
      documents: [makeDocument('global', 'global-artifact')],
    });

    let disabledError: unknown;
    try {
      store.getArtifact(request);
    } catch (error) {
      disabledError = error;
    }
    store.evictSource('global');

    let evictedError: unknown;
    try {
      store.getArtifact({ ...request, sourceEnabled: true });
    } catch (error) {
      evictedError = error;
    }

    expect(disabledError).toBeInstanceOf(DetailStoreError);
    expect(evictedError).toBeInstanceOf(DetailStoreError);
    expect((disabledError as DetailStoreError).code).toBe('ARTIFACT_UNAVAILABLE');
    expect((evictedError as DetailStoreError).code).toBe('ARTIFACT_UNAVAILABLE');
    expect((disabledError as Error).message).toBe((evictedError as Error).message);
  });

  it('keeps source replacement and eviction independent', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'repository-catalog',
      revision: 1,
      documents: [makeDocument('repository', 'repository-artifact')],
    });
    store.replaceSource({
      source: 'global',
      catalogId: 'global-catalog',
      revision: 1,
      documents: [makeDocument('global', 'global-artifact')],
    });

    store.evictSource('global');
    expect(store.hasSource('repository')).toBe(true);
    expect(store.hasSource('global')).toBe(false);
    expect(store.size('repository')).toBe(1);
    expect(
      store.getArtifact(readRequest('repository', 'repository-artifact', 'repository-catalog', 1))
        .id,
    ).toBe('repository-artifact');
  });

  it('rejects duplicate ids across sources and public absolute paths', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'repository-catalog',
      revision: 1,
      documents: [makeDocument('repository', 'same-id')],
    });

    expect(() =>
      store.replaceSource({
        source: 'global',
        catalogId: 'global-catalog',
        revision: 1,
        documents: [makeDocument('global', 'same-id')],
      }),
    ).toThrow(/unique/u);

    const unsafe = makeDocument('repository', 'unsafe');
    (unsafe.path as { relative: string }).relative = '/Users/private/AGENTS.md';
    expect(() =>
      store.replaceSource({
        source: 'repository',
        catalogId: 'next-catalog',
        revision: 2,
        documents: [unsafe],
      }),
    ).toThrow(/path/u);
  });

  it('accepts canonical virtual paths for reserved filename characters', () => {
    const store = new ArtifactDetailStore();
    const document = makeDocument('repository', 'reserved-name');
    const publicPath = createVirtualPathFromSegments(document.source.virtualBase, [
      'question?percent%.md',
    ]);
    (document.path as { relative: string; basename: string; virtual: string }).relative =
      publicPath.relativePath;
    (document.path as { relative: string; basename: string; virtual: string }).basename =
      publicPath.basename;
    (document.path as { relative: string; basename: string; virtual: string }).virtual =
      publicPath.virtualPath;

    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [document],
    });

    expect(
      store.getArtifact(readRequest('repository', 'reserved-name', 'catalog', 1)).path,
    ).toEqual({
      relative: publicPath.relativePath,
      basename: publicPath.basename,
      virtual: publicPath.virtualPath,
    });
  });

  it('accepts visibly escaped control and backslash filename characters', () => {
    const store = new ArtifactDetailStore();
    const document = makeDocument('repository', 'escaped-name');
    const publicPath = createVirtualPathFromSegments(document.source.virtualBase, [
      'control\u0000back\\slash.md',
    ]);
    Object.assign(document.path, {
      relative: publicPath.relativePath,
      basename: publicPath.basename,
      virtual: publicPath.virtualPath,
    });

    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [document],
    });

    expect(
      store.getArtifact(readRequest('repository', 'escaped-name', 'catalog', 1)).path,
    ).toMatchObject({ relative: expect.stringContaining('\\u{') });
  });

  it('requires explicit source enablement for Global reads', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'global',
      catalogId: 'global-catalog',
      revision: 1,
      documents: [makeDocument('global', 'global-artifact')],
    });

    expect(() =>
      store.getArtifact(readRequest('global', 'global-artifact', 'global-catalog', 1)),
    ).toThrowError(expect.objectContaining({ code: 'ARTIFACT_UNAVAILABLE' }));
    expect(
      store.getArtifact({
        ...readRequest('global', 'global-artifact', 'global-catalog', 1),
        sourceEnabled: true,
      }).id,
    ).toBe('global-artifact');
  });

  it('rejects malformed public document envelopes without replacing prior state', () => {
    const mutations: Array<(document: ArtifactDocument) => void> = [
      (document) => {
        (document as { schemaVersion: number }).schemaVersion = 2;
      },
      (document) => {
        (document.source as { layer: SourceLayer }).layer = 'global';
      },
      (document) => {
        (document as { id: string }).id = '/Users/private/artifact';
      },
      (document) => {
        (document.source as { id: string }).id = 'invalid source id';
      },
      (document) => {
        (document.path as { relative: string }).relative = 'nested\\AGENTS.md';
      },
      (document) => {
        (document.path as { basename: string }).basename = 'different.md';
      },
      (document) => {
        (document.source as { virtualBase: string }).virtualBase = 'repository:///Users/private';
      },
      (document) => {
        (document.path as { virtual: string }).virtual = 'repository://fixture/%2e%2e/private';
      },
      (document) => {
        (document.path as { virtual: string }).virtual =
          'repository://fixture/AGENTS.md?secret=true';
      },
      (document) => {
        (document.content as { byteLength: number }).byteLength = -1;
      },
    ];

    for (const [index, mutate] of mutations.entries()) {
      const store = new ArtifactDetailStore();
      store.replaceSource({
        source: 'repository',
        catalogId: 'current-catalog',
        revision: 1,
        documents: [makeDocument('repository', 'current-artifact')],
      });
      const malformed = makeDocument('repository', `malformed-${index}`);
      mutate(malformed);

      expect(() =>
        store.replaceSource({
          source: 'repository',
          catalogId: 'next-catalog',
          revision: 2,
          documents: [malformed],
        }),
      ).toThrow(TypeError);
      expect(
        store.getArtifact(readRequest('repository', 'current-artifact', 'current-catalog', 1)).id,
      ).toBe('current-artifact');
    }
  });

  it('validates request ids and revisions and fails missing ids generically', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [makeDocument('repository', 'artifact')],
    });

    expect(() =>
      store.getArtifact(readRequest('repository', '/Users/private/id', 'catalog', 1)),
    ).toThrow(TypeError);
    expect(() => store.getArtifact(readRequest('repository', 'artifact', 'catalog', -1))).toThrow(
      TypeError,
    );
    expect(() =>
      store.getArtifact(readRequest('repository', 'missing', 'catalog', 1)),
    ).toThrowError(expect.objectContaining({ code: 'ARTIFACT_UNAVAILABLE' }));

    store.clear();
    expect(store.hasSource('repository')).toBe(false);
    expect(store.size('repository')).toBe(0);
  });

  it('does not serialize the internal document maps by default', () => {
    const store = new ArtifactDetailStore();
    store.replaceSource({
      source: 'repository',
      catalogId: 'catalog',
      revision: 1,
      documents: [makeDocument('repository', 'artifact')],
    });

    expect(JSON.stringify(store)).toBe('{}');
  });
});
