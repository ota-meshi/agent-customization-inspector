import { randomUUID } from 'node:crypto';

import type {
  ArtifactDocument,
  ArtifactInterpretation,
  ArtifactInterpretationSummary,
  ArtifactSummary,
  CatalogSnapshot,
  DiagnosticCounts,
  SourceLayer,
} from './model.js';
import type { Diagnostic } from './diagnostics.js';

export interface CatalogPublication {
  readonly source: SourceLayer;
  readonly revision: number;
  readonly documents: readonly ArtifactDocument[];
  readonly diagnostics: readonly Diagnostic[];
}

export interface PublishedCatalog {
  readonly snapshot: CatalogSnapshot;
  /** Internal detail authority. It is intentionally absent from normal JSON serialization. */
  readonly details: CatalogDetailAuthority;
}

/**
 * Iterable authority for bounded internal detail documents.
 *
 * Catalog snapshots remain summary-only. Trusted session code can move these
 * documents into the revision-checked detail store, while accidental normal
 * serialization omits the authority completely.
 */
class CatalogDetailAuthority implements Iterable<ArtifactDocument> {
  readonly #documents: readonly ArtifactDocument[];

  constructor(documents: readonly ArtifactDocument[]) {
    this.#documents = Object.freeze(documents.map((document) => freezeTree(document)));
    Object.freeze(this);
  }

  get size(): number {
    return this.#documents.length;
  }

  [Symbol.iterator](): Iterator<ArtifactDocument> {
    return this.#documents[Symbol.iterator]();
  }

  toJSON(): undefined {
    return undefined;
  }
}

const supportRank = { supported: 0, partial: 1, 'raw-only': 2 } as const;

interface MutableInterpretationSummary {
  tool: { id: string; label: string };
  kinds: string[];
  support: ArtifactInterpretationSummary['support'];
}

function freezeTree<T>(value: T): T {
  if (typeof value !== 'object' || value === null) {
    return value;
  }
  const pending: object[] = [value];
  const seen = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || seen.has(current)) {
      continue;
    }
    seen.add(current);
    for (const child of Object.values(current)) {
      if (typeof child === 'object' && child !== null) {
        pending.push(child);
      }
    }
    Object.freeze(current);
  }
  return value;
}

export function createInterpretationSummaries(
  interpretations: readonly ArtifactInterpretation[],
): ArtifactInterpretationSummary[] {
  const byTool = new Map<string, MutableInterpretationSummary>();
  for (const interpretation of interpretations) {
    const current = byTool.get(interpretation.tool.id);
    if (current === undefined) {
      byTool.set(interpretation.tool.id, {
        tool: { ...interpretation.tool },
        kinds: [interpretation.kind],
        support: interpretation.support,
      });
      continue;
    }

    if (!current.kinds.includes(interpretation.kind)) {
      current.kinds.push(interpretation.kind);
      current.kinds.sort();
    }
    if (supportRank[interpretation.support] > supportRank[current.support]) {
      current.support = interpretation.support;
    }
  }

  return freezeTree(
    [...byTool.values()].sort((left, right) =>
      left.tool.id < right.tool.id ? -1 : left.tool.id > right.tool.id ? 1 : 0,
    ),
  );
}

function countDiagnostics(diagnostics: readonly Diagnostic[]): DiagnosticCounts {
  const counts: DiagnosticCounts = { info: 0, warning: 0, error: 0 };
  for (const diagnostic of diagnostics) {
    counts[diagnostic.severity] += 1;
  }
  return counts;
}

/** Creates the summary-only representation used by catalog and search surfaces. */
export function toArtifactSummary(document: ArtifactDocument): ArtifactSummary {
  const summary: ArtifactSummary = {
    schemaVersion: document.schemaVersion,
    source: { ...document.source },
    id: document.id,
    path: { ...document.path },
    format: { ...document.format },
    interpretationSummaries: createInterpretationSummaries(document.interpretations),
    diagnosticCounts: countDiagnostics(document.diagnostics),
    diagnosticCodes: [...new Set(document.diagnostics.map(({ code }) => code))].sort(),
    redactionApplied: document.content.redactions.length > 0,
    securityFlags: [...document.securityFlags],
  };
  return freezeTree(summary);
}

export function publishCatalog(publication: CatalogPublication): PublishedCatalog {
  if (!Number.isSafeInteger(publication.revision) || publication.revision < 0) {
    throw new TypeError('A catalog revision must be a non-negative safe integer.');
  }

  const ids = new Set<string>();
  const documents = publication.documents.map((document) => {
    if (document.source.layer !== publication.source) {
      throw new TypeError('An artifact document belongs to a different source layer.');
    }
    if (ids.has(document.id)) {
      throw new TypeError('Artifact ids must be unique within a catalog.');
    }
    ids.add(document.id);
    return structuredClone(document);
  });

  const snapshot: CatalogSnapshot = {
    id: randomUUID(),
    revision: publication.revision,
    source: publication.source,
    artifacts: documents.map(toArtifactSummary),
    diagnostics: [...publication.diagnostics],
  };

  return freezeTree({ snapshot, details: new CatalogDetailAuthority(documents) });
}
