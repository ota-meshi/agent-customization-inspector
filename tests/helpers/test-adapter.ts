import type {
  AdapterInspection,
  AdapterMatch,
  ArtifactAdapter,
  DiscoveryEntry,
} from '../../src/core/registry.js';

export interface TestAdapterOptions {
  readonly failMatch?: boolean;
  readonly failInspect?: boolean;
  readonly inspect?: (
    input: Parameters<ArtifactAdapter['inspect']>[0],
  ) => Promise<AdapterInspection>;
}

const matchFor = (entry: DiscoveryEntry): AdapterMatch[] => {
  if (entry.relativePath !== 'agent-test.md') {
    return [];
  }
  return [
    {
      candidateId:
        entry.source.layer === 'repository' ? 'repository-test-file' : 'global-test-file',
      variant: 'test-only',
      kind: 'instruction',
      support: 'supported',
    },
  ];
};

export function createTestAdapter(options: TestAdapterOptions = {}): ArtifactAdapter {
  return {
    manifest: {
      id: 'test-adapter',
      tool: { id: 'test-agent', label: 'Test Agent' },
      supportedKinds: ['instruction'],
      supportedSources: ['repository', 'global'],
      specSources: ['https://example.test/test-agent-specification'],
      documentedAsOf: '2026-07-15',
      capabilities: {
        discovery: 'full',
        metadata: 'partial',
        rawView: true,
      },
    },
    candidates: [
      {
        id: 'repository-test-file',
        source: 'repository',
        kind: 'exact-file',
        relativePath: 'agent-test.md',
      },
      {
        id: 'global-test-file',
        source: 'global',
        locatorId: 'test-tool',
        kind: 'exact-file',
        relativePath: 'agent-test.md',
      },
    ],
    match(entry) {
      if (options.failMatch === true) {
        throw new Error('test adapter match failure with a private source value');
      }
      return matchFor(entry);
    },
    async inspect(input) {
      if (options.failInspect === true) {
        throw new Error('test adapter inspection failure with source text');
      }
      if (options.inspect !== undefined) {
        return options.inspect(input);
      }
      return {
        format: { id: 'markdown', mediaType: 'text/markdown', encoding: 'utf-8' },
        interpretation: {
          adapterId: 'test-adapter',
          tool: { id: 'test-agent', label: 'Test Agent' },
          kind: 'instruction',
          facets: ['test-only'],
          variant: 'test-only',
          support: 'supported',
          scope: {
            origin: input.source.layer === 'repository' ? 'repository' : 'user',
            activation: 'startup',
            resolutionConfidence: 'documented',
          },
          metadata: {
            byteLength: Buffer.byteLength(input.text, 'utf8'),
            parser: 'test-only',
          },
          metadataStatus: 'complete',
          documentation: {
            status: 'documented',
            reviewedAt: '2026-07-15',
            sources: ['https://example.test/test-agent-specification'],
          },
          diagnostics: [],
        },
      };
    },
  };
}
