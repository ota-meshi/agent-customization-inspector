import type { Diagnostic } from './diagnostics.js';
import type {
  ArtifactDocument,
  ArtifactInterpretation,
  InterpretationScope,
  SourceDescriptor,
  SourceLayer,
} from './model.js';

const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;

export interface DetailStoreSourceVersion {
  readonly source: SourceLayer;
  readonly catalogId: string;
  readonly revision: number;
}

export interface DetailStorePublication extends DetailStoreSourceVersion {
  readonly documents: Iterable<ArtifactDocument>;
}

export interface DetailStoreReadRequest extends DetailStoreSourceVersion {
  readonly id: string;
  /** Global reads require an explicit true value. Repository defaults to enabled. */
  readonly sourceEnabled?: boolean;
}

export type DetailStoreErrorCode = 'ARTIFACT_UNAVAILABLE' | 'STALE_REVISION';

export class DetailStoreError extends Error {
  constructor(readonly code: DetailStoreErrorCode) {
    super(
      code === 'STALE_REVISION'
        ? 'The requested artifact revision is stale.'
        : 'The requested artifact is unavailable.',
    );
    this.name = 'DetailStoreError';
  }
}

interface SourceDetailState {
  readonly catalogId: string;
  readonly revision: number;
  readonly documents: ReadonlyMap<string, ArtifactDocument>;
}

function assertOpaqueId(value: string, description: string): void {
  if (!OPAQUE_ID_PATTERN.test(value)) {
    throw new TypeError(`The public ${description} is invalid.`);
  }
}

function assertRevision(revision: number): void {
  if (!Number.isSafeInteger(revision) || revision < 0) {
    throw new TypeError('The source revision must be a non-negative safe integer.');
  }
}

function assertRelativePath(path: string): void {
  const withoutVisibleEscapes = path.replace(/\\u\{[0-9a-f]{4,6}\}/giu, '');
  if (
    path.length === 0 ||
    path.startsWith('/') ||
    withoutVisibleEscapes.includes('\\') ||
    path.includes('\0') ||
    /^[A-Za-z]:/u.test(path) ||
    path.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    throw new TypeError('The public artifact path is invalid.');
  }
}

function containsDisplayControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)
    ) {
      return true;
    }
  }
  return false;
}

function assertVirtualPath(virtualBase: string, virtualPath: string, source: SourceLayer): void {
  const sourcePrefix = `${source}://`;
  const baseSuffix = virtualBase.slice(sourcePrefix.length).replace(/\/$/u, '');
  if (
    !virtualBase.startsWith(sourcePrefix) ||
    !/^[A-Za-z0-9._~-]+(?:\/[A-Za-z0-9._~-]+)*$/u.test(baseSuffix)
  ) {
    throw new TypeError('The public source virtual base is invalid.');
  }

  const pathPrefix = `${virtualBase.replace(/\/$/u, '')}/`;
  const pathSuffix = virtualPath.slice(pathPrefix.length);
  if (
    !virtualPath.startsWith(pathPrefix) ||
    pathSuffix.length === 0 ||
    /[\\?#]/u.test(pathSuffix) ||
    containsDisplayControl(pathSuffix) ||
    pathSuffix
      .split('/')
      .some(
        (segment) =>
          segment === '' || segment === '.' || segment === '..' || /^(?:%2e){1,2}$/iu.test(segment),
      )
  ) {
    throw new TypeError('The public artifact virtual path is invalid.');
  }
}

function assertDocumentEnvelope(document: ArtifactDocument, source: SourceLayer): void {
  if (document.schemaVersion !== 1 || document.source.layer !== source) {
    throw new TypeError('The artifact document does not belong to this source.');
  }

  assertOpaqueId(document.id, 'artifact id');
  assertOpaqueId(document.source.id, 'source id');
  assertRelativePath(document.path.relative);

  const pathParts = document.path.relative.split('/');
  if (document.path.basename !== pathParts.at(-1)) {
    throw new TypeError('The public artifact basename is invalid.');
  }

  assertVirtualPath(document.source.virtualBase, document.path.virtual, source);

  if (!Number.isSafeInteger(document.content.byteLength) || document.content.byteLength < 0) {
    throw new TypeError('The artifact byte length must be a non-negative safe integer.');
  }
}

function cloneSource(source: SourceDescriptor): SourceDescriptor {
  return {
    layer: source.layer,
    id: source.id,
    label: source.label,
    virtualBase: source.virtualBase,
  };
}

function cloneDiagnostic(diagnostic: Diagnostic): Diagnostic {
  const clone: {
    code: string;
    severity: Diagnostic['severity'];
    message: string;
    source: SourceDescriptor;
    artifactId?: string;
    virtualPath?: string;
  } = {
    code: diagnostic.code,
    severity: diagnostic.severity,
    message: diagnostic.message,
    source: cloneSource(diagnostic.source),
  };
  if (diagnostic.artifactId !== undefined) {
    clone.artifactId = diagnostic.artifactId;
  }
  if (diagnostic.virtualPath !== undefined) {
    clone.virtualPath = diagnostic.virtualPath;
  }
  return clone;
}

function cloneScope(scope: InterpretationScope): InterpretationScope {
  const clone: {
    origin: InterpretationScope['origin'];
    activation: InterpretationScope['activation'];
    resolutionConfidence: InterpretationScope['resolutionConfidence'];
    base?: string;
    appliesTo?: string[];
    precedenceHint?: string;
  } = {
    origin: scope.origin,
    activation: scope.activation,
    resolutionConfidence: scope.resolutionConfidence,
  };
  if (scope.base !== undefined) {
    clone.base = scope.base;
  }
  if (scope.appliesTo !== undefined) {
    clone.appliesTo = [...scope.appliesTo];
  }
  if (scope.precedenceHint !== undefined) {
    clone.precedenceHint = scope.precedenceHint;
  }
  return clone;
}

function cloneInterpretation(interpretation: ArtifactInterpretation): ArtifactInterpretation {
  return {
    adapterId: interpretation.adapterId,
    tool: { id: interpretation.tool.id, label: interpretation.tool.label },
    kind: interpretation.kind,
    facets: [...interpretation.facets],
    variant: interpretation.variant,
    support: interpretation.support,
    scope: cloneScope(interpretation.scope),
    metadata: structuredClone(interpretation.metadata),
    metadataStatus: interpretation.metadataStatus,
    documentation: {
      status: interpretation.documentation.status,
      reviewedAt: interpretation.documentation.reviewedAt,
      sources: [...interpretation.documentation.sources],
    },
    diagnostics: interpretation.diagnostics.map(cloneDiagnostic),
  };
}

function clonePublicDocument(document: ArtifactDocument): ArtifactDocument {
  return {
    schemaVersion: 1,
    source: cloneSource(document.source),
    id: document.id,
    path: {
      relative: document.path.relative,
      basename: document.path.basename,
      virtual: document.path.virtual,
    },
    format: {
      id: document.format.id,
      mediaType: document.format.mediaType,
      encoding: 'utf-8',
    },
    interpretationSummaries: document.interpretationSummaries.map((summary) => ({
      tool: { id: summary.tool.id, label: summary.tool.label },
      kinds: [...summary.kinds],
      support: summary.support,
    })),
    diagnosticCounts: {
      info: document.diagnosticCounts.info,
      warning: document.diagnosticCounts.warning,
      error: document.diagnosticCounts.error,
    },
    diagnosticCodes: [...document.diagnosticCodes],
    redactionApplied: document.redactionApplied,
    securityFlags: [...document.securityFlags],
    content: {
      displayText: document.content.displayText,
      byteLength: document.content.byteLength,
      newline: document.content.newline,
      redactions: document.content.redactions.map((redaction) => ({
        kind: redaction.kind,
        count: redaction.count,
      })),
    },
    interpretations: document.interpretations.map(cloneInterpretation),
    diagnostics: document.diagnostics.map(cloneDiagnostic),
  };
}

function cloneAndFreezeDocument(document: ArtifactDocument): ArtifactDocument {
  const clone = clonePublicDocument(document);
  const pending: object[] = [clone];
  const visited = new WeakSet<object>();

  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const value of Object.values(current)) {
      if (typeof value === 'object' && value !== null) {
        pending.push(value);
      }
    }
    Object.freeze(current);
  }

  return clone;
}

/**
 * Source-owned store for already-redacted documents.
 *
 * It deliberately has no default JSON representation: only a revision-checked
 * selected document can leave the store. Callers must evict Global before
 * reporting its disabled state.
 */
export class ArtifactDetailStore {
  readonly #sources = new Map<SourceLayer, SourceDetailState>();

  replaceSource(publication: DetailStorePublication): void {
    assertOpaqueId(publication.catalogId, 'catalog id');
    assertRevision(publication.revision);

    const documents = new Map<string, ArtifactDocument>();
    for (const document of publication.documents) {
      assertDocumentEnvelope(document, publication.source);
      if (documents.has(document.id) || this.#hasIdInOtherSource(document.id, publication.source)) {
        throw new TypeError('Artifact ids must be unique across source catalogs.');
      }

      documents.set(document.id, cloneAndFreezeDocument(document));
    }

    this.#sources.set(
      publication.source,
      Object.freeze({
        catalogId: publication.catalogId,
        revision: publication.revision,
        documents,
      }),
    );
  }

  getArtifact(request: DetailStoreReadRequest): ArtifactDocument {
    assertOpaqueId(request.catalogId, 'catalog id');
    assertOpaqueId(request.id, 'artifact id');
    assertRevision(request.revision);

    if (
      request.sourceEnabled === false ||
      (request.source === 'global' && request.sourceEnabled !== true)
    ) {
      throw new DetailStoreError('ARTIFACT_UNAVAILABLE');
    }

    const state = this.#sources.get(request.source);
    if (state === undefined) {
      throw new DetailStoreError('ARTIFACT_UNAVAILABLE');
    }

    if (state.catalogId !== request.catalogId || state.revision !== request.revision) {
      throw new DetailStoreError('STALE_REVISION');
    }

    const document = state.documents.get(request.id);
    if (document === undefined || document.source.layer !== request.source) {
      throw new DetailStoreError('ARTIFACT_UNAVAILABLE');
    }

    return document;
  }

  evictSource(source: SourceLayer): void {
    this.#sources.delete(source);
  }

  clear(): void {
    this.#sources.clear();
  }

  hasSource(source: SourceLayer): boolean {
    return this.#sources.has(source);
  }

  size(source: SourceLayer): number {
    return this.#sources.get(source)?.documents.size ?? 0;
  }

  #hasIdInOtherSource(id: string, source: SourceLayer): boolean {
    const otherSource = source === 'repository' ? 'global' : 'repository';
    return this.#sources.get(otherSource)?.documents.has(id) ?? false;
  }
}
