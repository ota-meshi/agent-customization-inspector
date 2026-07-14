import { describe, expect, it } from 'vitest';

import {
  createInterpretationSummaries,
  publishCatalog,
  toArtifactSummary,
} from '../../src/core/catalog.js';
import type { ArtifactDocument, SourceDescriptor } from '../../src/core/model.js';

const SOURCE: SourceDescriptor = Object.freeze({
  layer: 'repository',
  id: 'repository-source',
  label: 'Repository',
  virtualBase: 'repository://root',
});

function makeDocument(id = 'artifact-one'): ArtifactDocument {
  return {
    schemaVersion: 1,
    source: SOURCE,
    id,
    path: {
      relative: 'agent-test.md',
      basename: 'agent-test.md',
      virtual: 'repository://root/agent-test.md',
    },
    format: { id: 'markdown', mediaType: 'text/markdown', encoding: 'utf-8' },
    interpretationSummaries: [],
    diagnosticCounts: { info: 0, warning: 0, error: 0 },
    diagnosticCodes: [],
    redactionApplied: false,
    securityFlags: ['content-withheld-pending-redaction'],
    content: {
      displayText: 'detail sentinel must not enter the catalog',
      byteLength: 42,
      newline: 'none',
      redactions: [],
    },
    interpretations: [
      {
        adapterId: 'adapter-one',
        tool: { id: 'tool-one', label: 'Tool One' },
        kind: 'instruction',
        facets: ['markdown'],
        variant: 'standard',
        support: 'supported',
        scope: {
          origin: 'repository',
          activation: 'startup',
          resolutionConfidence: 'documented',
        },
        metadata: { privateDetail: 'detail metadata sentinel' },
        metadataStatus: 'complete',
        documentation: {
          status: 'documented',
          reviewedAt: '2026-07-15',
          sources: ['https://example.test/spec'],
        },
        diagnostics: [],
      },
      {
        adapterId: 'adapter-two',
        tool: { id: 'tool-one', label: 'Tool One' },
        kind: 'rule',
        facets: [],
        variant: 'secondary',
        support: 'partial',
        scope: {
          origin: 'repository',
          activation: 'conditional',
          resolutionConfidence: 'partial',
        },
        metadata: {},
        metadataStatus: 'complete',
        documentation: {
          status: 'assumption',
          reviewedAt: '2026-07-15',
          sources: ['https://example.test/spec'],
        },
        diagnostics: [],
      },
    ],
    diagnostics: [
      {
        code: 'TEST_WARNING',
        severity: 'warning',
        message: 'A safe diagnostic.',
        source: SOURCE,
        artifactId: id,
        virtualPath: 'repository://root/agent-test.md',
      },
    ],
  };
}

describe('catalog publication', () => {
  it('publishes summary-only JSON and keeps detail behind a JSON-inert authority', () => {
    const document = makeDocument();
    const published = publishCatalog({
      source: 'repository',
      revision: 3,
      documents: [document],
      diagnostics: [],
    });
    const serialized = JSON.stringify(published);

    expect(published.snapshot).toMatchObject({
      revision: 3,
      source: 'repository',
      artifacts: [
        {
          id: 'artifact-one',
          diagnosticCounts: { info: 0, warning: 1, error: 0 },
          diagnosticCodes: ['TEST_WARNING'],
        },
      ],
    });
    expect(published.details.size).toBe(1);
    expect(serialized).not.toContain('displayText');
    expect(serialized).not.toContain('detail sentinel');
    expect(serialized).not.toContain('detail metadata sentinel');
    expect(JSON.stringify(published.details)).toBeUndefined();
    expect(Object.isFrozen(published.snapshot)).toBe(true);
  });

  it('derives deterministic per-tool summaries without exposing interpretations', () => {
    const document = makeDocument();
    const summary = toArtifactSummary(document);

    expect(summary.interpretationSummaries).toEqual([
      {
        tool: { id: 'tool-one', label: 'Tool One' },
        kinds: ['instruction', 'rule'],
        support: 'partial',
      },
    ]);
    expect(summary).not.toHaveProperty('content');
    expect(summary).not.toHaveProperty('interpretations');
    expect(Object.isFrozen(summary.interpretationSummaries)).toBe(true);
    expect(createInterpretationSummaries([])).toEqual([]);
  });

  it('deduplicates kinds, sorts tools, selects conservative support, and reports redaction', () => {
    const document = makeDocument();
    document.interpretations.push(
      {
        ...document.interpretations[0]!,
        adapterId: 'adapter-three',
        support: 'raw-only',
      },
      {
        ...document.interpretations[0]!,
        adapterId: 'adapter-zero',
        tool: { id: 'another-tool', label: 'Another Tool' },
      },
    );
    document.content.redactions.push({ kind: 'secret', count: 1 });
    document.diagnostics.push(
      { ...document.diagnostics[0]!, code: 'TEST_INFO', severity: 'info' },
      { ...document.diagnostics[0]!, code: 'TEST_ERROR', severity: 'error' },
    );

    const summary = toArtifactSummary(document);
    expect(summary.interpretationSummaries.map(({ tool }) => tool.id)).toEqual([
      'another-tool',
      'tool-one',
    ]);
    expect(summary.interpretationSummaries[1]).toMatchObject({
      kinds: ['instruction', 'rule'],
      support: 'raw-only',
    });
    expect(summary.diagnosticCounts).toEqual({ info: 1, warning: 1, error: 1 });
    expect(summary.redactionApplied).toBe(true);
  });

  it('defensively snapshots documents and rejects invalid publications', () => {
    const document = makeDocument();
    const published = publishCatalog({
      source: 'repository',
      revision: 1,
      documents: [document],
      diagnostics: [],
    });
    (document.path as { relative: string }).relative = 'changed.md';
    expect(published.snapshot.artifacts[0]?.path.relative).toBe('agent-test.md');

    expect(() =>
      publishCatalog({
        source: 'repository',
        revision: 1,
        documents: [makeDocument('duplicate'), makeDocument('duplicate')],
        diagnostics: [],
      }),
    ).toThrow(/unique/u);
    expect(() =>
      publishCatalog({
        source: 'global',
        revision: 1,
        documents: [makeDocument()],
        diagnostics: [],
      }),
    ).toThrow(/source layer/u);
    expect(() =>
      publishCatalog({
        source: 'repository',
        revision: -1,
        documents: [],
        diagnostics: [],
      }),
    ).toThrow(/revision/u);
  });
});
