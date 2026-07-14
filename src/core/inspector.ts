import { randomUUID } from 'node:crypto';

import { publishCatalog, createInterpretationSummaries, type PublishedCatalog } from './catalog.js';
import { DiagnosticCollector, type Diagnostic, type DiagnosticInput } from './diagnostics.js';
import {
  DEFAULT_SCAN_LIMITS,
  resolveSourceScanLimits,
  validateScanLimits,
  type ScanLimits,
} from './limits.js';
import { normalizePublicMetadata } from './metadata.js';
import type {
  ArtifactDocument,
  ArtifactFormat,
  ArtifactInterpretation,
  InterpretationDocumentation,
  InterpretationScope,
  SourceDescriptor,
  SourceLayer,
} from './model.js';
import type {
  AdapterRegistry,
  AdapterInspection,
  AdapterMatch,
  ArtifactAdapter,
  CandidateSpec,
  DiscoveryEntry,
  RegisteredCandidate,
} from './registry.js';
import { ReadBudget, readTextFile } from '../discovery/read-text.js';
import { discoverExactFile, walkDirectory, type DiscoveredFile } from '../discovery/walk.js';
import { createRootBoundary } from '../discovery/root-boundary.js';
import type { SourceRoot } from '../sources/tool-homes.js';

const MAX_MATCHES_PER_ADAPTER_AND_FILE = 64;
const MAX_DIAGNOSTICS_PER_INTERPRETATION = 256;
const MAX_DIAGNOSTICS_PER_DOCUMENT = 256;
const MAX_OPEN_STRING_LENGTH = 256;
const OPAQUE_VARIANT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const FORMAT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const MEDIA_TYPE_PATTERN = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/u;

export interface InspectSourceOptions {
  readonly source: SourceLayer;
  readonly roots: readonly SourceRoot[];
  readonly adapters: AdapterRegistry;
  readonly revision: number;
  readonly limits?: ScanLimits;
  readonly combinedReadBudget?: ReadBudget;
  readonly signal?: AbortSignal;
}

export interface SourceInspection {
  readonly publication: PublishedCatalog;
  readonly complete: boolean;
  readonly aborted: boolean;
}

interface AdapterWork {
  readonly adapter: ArtifactAdapter;
  readonly match: AdapterMatch;
}

interface CandidateDiscoveredFile {
  readonly file: DiscoveredFile;
  readonly eligibleCandidates: ReadonlyMap<string, ReadonlySet<string>>;
}

interface MutableCandidateDiscoveredFile {
  readonly file: DiscoveredFile;
  readonly eligibleCandidates: Map<string, Set<string>>;
}

const isOpenString = (value: unknown): value is string => {
  if (typeof value !== 'string') {
    return false;
  }
  if (value.length === 0 || value.length > MAX_OPEN_STRING_LENGTH) {
    return false;
  }
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (
      codePoint === undefined ||
      codePoint <= 0x1f ||
      (codePoint >= 0x7f && codePoint <= 0x9f) ||
      (codePoint >= 0x202a && codePoint <= 0x202e) ||
      (codePoint >= 0x2066 && codePoint <= 0x2069)
    ) {
      return false;
    }
  }
  return true;
};

const isPublicVariant = (value: unknown): value is string =>
  isOpenString(value) && OPAQUE_VARIANT_PATTERN.test(value);

function createCatalogSource(source: SourceLayer, roots: readonly SourceRoot[]): SourceDescriptor {
  if (source === 'repository' && roots.length === 1) {
    return roots[0]!.descriptor;
  }
  return Object.freeze({
    layer: source,
    id: randomUUID(),
    label: source === 'repository' ? 'Repository' : 'Global',
    virtualBase: `${source}://catalog`,
  });
}

function validateRoots(source: SourceLayer, roots: readonly SourceRoot[]): void {
  const locatorIds = new Set<string>();
  for (const root of roots) {
    if (root.descriptor.layer !== source) {
      throw new TypeError('A source scan received a root from another source layer.');
    }
    if (locatorIds.has(root.locatorId)) {
      throw new TypeError('A source scan received duplicate locator ids.');
    }
    locatorIds.add(root.locatorId);
  }
  if (source === 'repository' && roots.length !== 1) {
    throw new TypeError('A Repository scan requires exactly one root.');
  }
}

function createDocumentDiagnostic(source: SourceDescriptor, enriched: DiagnosticInput): Diagnostic {
  const documentCollector = new DiagnosticCollector(source, 1);
  documentCollector.add(enriched);
  return documentCollector.toArray()[0]!;
}

class RetainedDocumentDiagnosticBudget {
  #remaining: number;

  constructor(maximum: number) {
    this.#remaining = maximum;
  }

  tryTake(): boolean {
    if (this.#remaining <= 0) {
      return false;
    }
    this.#remaining -= 1;
    return true;
  }
}

class ArtifactDiagnosticAccumulator {
  readonly #collector: DiagnosticCollector;
  readonly #source: SourceDescriptor;
  readonly #artifactId: string;
  readonly #virtualPath: string;
  readonly #sourceBudget: RetainedDocumentDiagnosticBudget;
  #retained = 0;
  #limitReported = false;

  constructor(
    collector: DiagnosticCollector,
    source: SourceDescriptor,
    artifactId: string,
    virtualPath: string,
    sourceBudget: RetainedDocumentDiagnosticBudget,
  ) {
    this.#collector = collector;
    this.#source = source;
    this.#artifactId = artifactId;
    this.#virtualPath = virtualPath;
    this.#sourceBudget = sourceBudget;
  }

  add(input: Omit<DiagnosticInput, 'artifactId' | 'virtualPath'>): Diagnostic | undefined {
    const enriched = {
      ...input,
      artifactId: this.#artifactId,
      virtualPath: this.#virtualPath,
    };
    this.#collector.add(enriched);

    if (this.#retained < MAX_DIAGNOSTICS_PER_DOCUMENT - 1 && this.#sourceBudget.tryTake()) {
      this.#retained += 1;
      return createDocumentDiagnostic(this.#source, enriched);
    }

    if (this.#limitReported) {
      return undefined;
    }
    this.#limitReported = true;
    const summary = {
      code: 'ARTIFACT_DIAGNOSTIC_LIMIT_REACHED',
      severity: 'warning' as const,
      message: 'Additional artifact diagnostics were omitted after a retained-detail limit.',
      artifactId: this.#artifactId,
      virtualPath: this.#virtualPath,
    };
    this.#collector.add(summary);
    if (!this.#sourceBudget.tryTake()) {
      return undefined;
    }
    this.#retained += 1;
    return createDocumentDiagnostic(this.#source, summary);
  }
}

function candidateMatchesRelativePath(
  candidate: CandidateSpec,
  source: SourceLayer,
  relativePath: string,
): boolean {
  if (candidate.source !== source) {
    return false;
  }
  if (candidate.kind === 'exact-file') {
    return candidate.relativePath === relativePath;
  }

  const relativeBelowBase =
    candidate.relativePath === '.'
      ? relativePath
      : relativePath.startsWith(`${candidate.relativePath}/`)
        ? relativePath.slice(candidate.relativePath.length + 1)
        : undefined;
  if (relativeBelowBase === undefined) {
    return false;
  }
  const segments = relativeBelowBase.split('/');
  if (
    segments.length === 0 ||
    segments.length > candidate.maxDepth ||
    segments.some((segment) => segment.length === 0)
  ) {
    return false;
  }

  const basename = segments.at(-1)!;
  const basenames = candidate.match.basenames ?? [];
  const suffixes = candidate.match.suffixes ?? [];
  return basenames.includes(basename) || suffixes.some((suffix) => basename.endsWith(suffix));
}

const candidateMatchesEntry = (candidate: CandidateSpec, entry: DiscoveryEntry): boolean =>
  candidateMatchesRelativePath(candidate, entry.source.layer, entry.relativePath);

function eligibleCandidatesForEntry(
  registry: AdapterRegistry,
  entry: DiscoveryEntry,
): ReadonlyMap<string, ReadonlySet<string>> {
  const result = new Map<string, Set<string>>();
  for (const candidate of registry.candidatesFor(entry.source.layer)) {
    if (!candidateMatchesEntry(candidate.spec, entry)) {
      continue;
    }
    const candidateIds = result.get(candidate.adapterId) ?? new Set<string>();
    candidateIds.add(candidate.spec.id);
    result.set(candidate.adapterId, candidateIds);
  }
  return result;
}

function validMatch(
  adapter: ArtifactAdapter,
  match: AdapterMatch,
  eligibleCandidateIds: ReadonlySet<string>,
): boolean {
  return (
    eligibleCandidateIds.has(match.candidateId) &&
    adapter.manifest.supportedKinds.includes(match.kind) &&
    isPublicVariant(match.variant) &&
    (match.support === 'supported' || match.support === 'partial' || match.support === 'raw-only')
  );
}

function collectAdapterWork(
  registry: AdapterRegistry,
  entry: DiscoveryEntry,
  eligibleCandidates: ReadonlyMap<string, ReadonlySet<string>>,
  collector: DiagnosticCollector,
): { work: AdapterWork[]; complete: boolean } {
  const work: AdapterWork[] = [];
  let complete = true;

  for (const adapter of registry.list()) {
    const eligibleCandidateIds = eligibleCandidates.get(adapter.manifest.id);
    if (
      eligibleCandidateIds === undefined ||
      eligibleCandidateIds.size === 0 ||
      !adapter.manifest.supportedSources.includes(entry.source.layer)
    ) {
      continue;
    }
    const initialWorkLength = work.length;
    try {
      const matches = adapter.match(entry);
      if (!Array.isArray(matches)) {
        throw new TypeError('Adapter match result was not an array.');
      }

      if (matches.length > MAX_MATCHES_PER_ADAPTER_AND_FILE) {
        complete = false;
        collector.add({
          code: 'ADAPTER_MATCH_LIMIT_REACHED',
          severity: 'warning',
          message: 'An adapter returned too many matches for one file and was bounded.',
          virtualPath: entry.virtualPath,
        });
      }

      const seen = new Set<string>();
      for (const untrustedMatch of matches.slice(0, MAX_MATCHES_PER_ADAPTER_AND_FILE)) {
        const candidateId = untrustedMatch.candidateId;
        const variant = untrustedMatch.variant;
        const kind = untrustedMatch.kind;
        const support = untrustedMatch.support;
        if (
          typeof candidateId !== 'string' ||
          typeof variant !== 'string' ||
          typeof kind !== 'string' ||
          (support !== 'supported' && support !== 'partial' && support !== 'raw-only')
        ) {
          complete = false;
          collector.add({
            code: 'ADAPTER_MATCH_INVALID',
            severity: 'warning',
            message: 'An adapter returned an invalid match and it was skipped.',
            virtualPath: entry.virtualPath,
          });
          continue;
        }

        const match: AdapterMatch = { candidateId, variant, kind, support };
        if (!validMatch(adapter, match, eligibleCandidateIds)) {
          complete = false;
          collector.add({
            code: 'ADAPTER_MATCH_INVALID',
            severity: 'warning',
            message: 'An adapter returned an invalid match and it was skipped.',
            virtualPath: entry.virtualPath,
          });
          continue;
        }

        const key = `${candidateId}\0${variant}\0${kind}`;
        if (seen.has(key)) {
          continue;
        }
        seen.add(key);
        work.push({ adapter, match });
      }
    } catch {
      work.splice(initialWorkLength);
      complete = false;
      collector.add({
        code: 'ADAPTER_MATCH_FAILED',
        severity: 'warning',
        message: 'A trusted adapter failed while matching an artifact and was skipped.',
        virtualPath: entry.virtualPath,
      });
    }
  }

  return { work, complete };
}

function assertFormat(format: ArtifactFormat): void {
  if (
    !isOpenString(format.id) ||
    !FORMAT_ID_PATTERN.test(format.id) ||
    !isOpenString(format.mediaType) ||
    !MEDIA_TYPE_PATTERN.test(format.mediaType) ||
    format.encoding !== 'utf-8'
  ) {
    throw new TypeError('An adapter returned an invalid artifact format.');
  }
}

function normalizeScope(scope: InterpretationScope): InterpretationScope {
  const origins = ['repository', 'directory', 'user', 'managed', 'unknown'] as const;
  const activations = ['startup', 'conditional', 'on-demand', 'unknown'] as const;
  const confidences = ['documented', 'partial', 'unknown'] as const;
  if (
    !origins.includes(scope.origin) ||
    !activations.includes(scope.activation) ||
    !confidences.includes(scope.resolutionConfidence)
  ) {
    throw new TypeError('An adapter returned invalid scope metadata.');
  }

  return {
    origin: scope.origin,
    activation: scope.activation,
    resolutionConfidence: scope.resolutionConfidence,
  };
}

function normalizeDocumentation(
  documentation: InterpretationDocumentation,
  adapter: ArtifactAdapter,
): InterpretationDocumentation {
  const statuses = ['documented', 'assumption', 'undocumented', 'unsupported', 'deferred'] as const;
  if (
    !statuses.includes(documentation.status) ||
    documentation.reviewedAt !== adapter.manifest.documentedAsOf ||
    !Array.isArray(documentation.sources) ||
    documentation.sources.length === 0 ||
    documentation.sources.length > 32
  ) {
    throw new TypeError('An adapter returned invalid documentation metadata.');
  }
  const sources = [...new Set(documentation.sources)];
  if (
    sources.some(
      (source) => typeof source !== 'string' || !adapter.manifest.specSources.includes(source),
    )
  ) {
    throw new TypeError('An adapter returned invalid documentation sources.');
  }
  return { status: documentation.status, reviewedAt: documentation.reviewedAt, sources };
}

function normalizeInspection(
  adapter: ArtifactAdapter,
  inspection: AdapterInspection,
  diagnosticAccumulator: ArtifactDiagnosticAccumulator,
  match: AdapterMatch,
): { format: ArtifactFormat; interpretation: ArtifactInterpretation; diagnostics: Diagnostic[] } {
  assertFormat(inspection.format);
  const value = inspection.interpretation;
  if (
    value.adapterId !== adapter.manifest.id ||
    value.tool.id !== adapter.manifest.tool.id ||
    value.tool.label !== adapter.manifest.tool.label ||
    !adapter.manifest.supportedKinds.includes(value.kind) ||
    value.kind !== match.kind ||
    !isPublicVariant(value.variant) ||
    value.variant !== match.variant ||
    value.support !== match.support ||
    !Array.isArray(value.facets)
  ) {
    throw new TypeError('An adapter returned an interpretation outside its manifest.');
  }

  const metadata = normalizePublicMetadata(value.metadata);
  const diagnostics: Diagnostic[] = [];
  for (const diagnostic of value.diagnostics.slice(0, MAX_DIAGNOSTICS_PER_INTERPRETATION)) {
    const normalized = diagnosticAccumulator.add({
      code: 'ADAPTER_REPORTED_DIAGNOSTIC',
      severity: diagnostic.severity,
      message:
        'A trusted adapter reported an artifact diagnostic; its detail is withheld pending redaction.',
    });
    if (normalized !== undefined) {
      diagnostics.push(normalized);
    }
  }
  if (value.diagnostics.length > MAX_DIAGNOSTICS_PER_INTERPRETATION) {
    const normalized = diagnosticAccumulator.add({
      code: 'ADAPTER_DIAGNOSTIC_LIMIT_REACHED',
      severity: 'warning',
      message: 'An adapter returned too many artifact diagnostics and they were bounded.',
    });
    if (normalized !== undefined) {
      diagnostics.push(normalized);
    }
  }
  if (metadata.diagnosticCode !== undefined) {
    const normalized = diagnosticAccumulator.add({
      code: metadata.diagnosticCode,
      severity: 'warning',
      message:
        metadata.status === 'partial'
          ? 'Structured metadata exceeded a public-model limit and is partial.'
          : 'Structured metadata could not be represented safely.',
    });
    if (normalized !== undefined) {
      diagnostics.push(normalized);
    }
  }

  const interpretation: ArtifactInterpretation = {
    adapterId: value.adapterId,
    tool: { ...value.tool },
    kind: value.kind,
    // Content-derived structured fields remain unavailable until M2 redaction.
    facets: [],
    variant: value.variant,
    support: value.support,
    scope: normalizeScope(value.scope),
    metadata: Object.freeze({}),
    metadataStatus: 'unavailable',
    documentation: normalizeDocumentation(value.documentation, adapter),
    diagnostics,
  };

  return { format: { ...inspection.format }, interpretation, diagnostics };
}

const classifyNewline = (text: string): ArtifactDocument['content']['newline'] => {
  const crlf = text.includes('\r\n');
  const withoutCrlf = text.replaceAll('\r\n', '');
  const lf = withoutCrlf.includes('\n');
  const cr = withoutCrlf.includes('\r');
  if (!crlf && !lf && !cr) {
    return 'none';
  }
  if (crlf && !lf && !cr) {
    return 'crlf';
  }
  if (!crlf && lf && !cr) {
    return 'lf';
  }
  return 'mixed';
};

function awaitWithAbort<T>(start: () => Promise<T>, signal: AbortSignal): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(createAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (action: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener('abort', onAbort);
      action();
    };
    const onAbort = (): void => finish(() => reject(createAbortError()));
    signal.addEventListener('abort', onAbort, { once: true });

    Promise.resolve()
      .then(start)
      .then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
  });
}

const createAbortError = (): Error => {
  const error = new Error('The source inspection was aborted.');
  error.name = 'AbortError';
  return error;
};

async function inspectFile(
  file: DiscoveredFile,
  eligibleCandidates: ReadonlyMap<string, ReadonlySet<string>>,
  root: SourceRoot,
  registry: AdapterRegistry,
  collector: DiagnosticCollector,
  sourceBudget: ReadBudget,
  combinedBudget: ReadBudget,
  maxFileBytes: number,
  retainedDiagnosticBudget: RetainedDocumentDiagnosticBudget,
  signal: AbortSignal,
): Promise<{ document?: ArtifactDocument; complete: boolean; aborted: boolean }> {
  const matched = collectAdapterWork(registry, file.entry, eligibleCandidates, collector);
  if (matched.work.length === 0) {
    return { complete: matched.complete, aborted: false };
  }

  const read = await readTextFile(file, {
    diagnostics: collector,
    maxFileBytes,
    sourceBudget,
    combinedBudget,
    signal,
  });
  if (read === undefined) {
    return { complete: false, aborted: signal.aborted };
  }

  const artifactId = randomUUID();
  const interpretations: ArtifactInterpretation[] = [];
  const documentDiagnostics: Diagnostic[] = [];
  let format: ArtifactFormat | undefined;
  let complete = matched.complete;
  const diagnosticAccumulator = new ArtifactDiagnosticAccumulator(
    collector,
    file.entry.source,
    artifactId,
    file.entry.virtualPath,
    retainedDiagnosticBudget,
  );

  for (const { adapter, match } of matched.work) {
    try {
      const inspected = await awaitWithAbort(
        () =>
          adapter.inspect({
            source: { layer: file.entry.source.layer, locatorId: root.locatorId },
            entry: file.entry,
            match,
            text: read.text,
            signal,
          }),
        signal,
      );
      const normalized = normalizeInspection(adapter, inspected, diagnosticAccumulator, match);
      if (
        format !== undefined &&
        (format.id !== normalized.format.id || format.mediaType !== normalized.format.mediaType)
      ) {
        complete = false;
        const diagnostic = diagnosticAccumulator.add({
          code: 'ADAPTER_FORMAT_CONFLICT',
          severity: 'warning',
          message: 'Adapters reported conflicting formats; the first safe format was retained.',
        });
        if (diagnostic !== undefined) {
          documentDiagnostics.push(diagnostic);
        }
      } else {
        format ??= normalized.format;
      }
      interpretations.push(normalized.interpretation);
      documentDiagnostics.push(...normalized.diagnostics);
    } catch (error: unknown) {
      if (signal.aborted || (error instanceof Error && error.name === 'AbortError')) {
        return { complete: false, aborted: true };
      }
      complete = false;
      const diagnostic = diagnosticAccumulator.add({
        code: 'ADAPTER_INSPECTION_FAILED',
        severity: 'warning',
        message: 'A trusted adapter failed while inspecting an artifact and was skipped.',
      });
      if (diagnostic !== undefined) {
        documentDiagnostics.push(diagnostic);
      }
    }
  }

  if (format === undefined || interpretations.length === 0) {
    return { complete: false, aborted: false };
  }

  const document: ArtifactDocument = {
    schemaVersion: 1,
    source: file.entry.source,
    id: artifactId,
    path: {
      relative: file.entry.relativePath,
      basename: file.entry.basename,
      virtual: file.entry.virtualPath,
    },
    format,
    interpretationSummaries: createInterpretationSummaries(interpretations),
    diagnosticCounts: { info: 0, warning: 0, error: 0 },
    diagnosticCodes: [],
    redactionApplied: false,
    securityFlags: [
      'content-withheld-pending-redaction',
      'structured-detail-withheld-pending-redaction',
    ],
    content: {
      displayText: '',
      byteLength: read.byteLength,
      newline: classifyNewline(read.text),
      redactions: [],
    },
    interpretations,
    diagnostics: documentDiagnostics,
  };
  const summary = publishCatalog({
    source: document.source.layer,
    revision: 0,
    documents: [document],
    diagnostics: [],
  }).snapshot.artifacts[0]!;
  return {
    complete,
    aborted: false,
    document: {
      ...document,
      interpretationSummaries: summary.interpretationSummaries,
      diagnosticCounts: summary.diagnosticCounts,
      diagnosticCodes: summary.diagnosticCodes,
      redactionApplied: summary.redactionApplied,
    },
  };
}

function addEligibleCandidate(
  records: Map<string, MutableCandidateDiscoveredFile>,
  file: DiscoveredFile,
  candidate: RegisteredCandidate,
): void {
  if (!candidateMatchesEntry(candidate.spec, file.entry)) {
    return;
  }
  const key = `${file.entry.source.id}\0${file.entry.relativePath}`;
  const record = records.get(key) ?? {
    file,
    eligibleCandidates: new Map<string, Set<string>>(),
  };
  const candidateIds = record.eligibleCandidates.get(candidate.adapterId) ?? new Set<string>();
  candidateIds.add(candidate.spec.id);
  record.eligibleCandidates.set(candidate.adapterId, candidateIds);
  records.set(key, record);
}

interface RootDiscoveryResult {
  readonly files: readonly CandidateDiscoveredFile[];
  readonly directoryEntriesVisited: number;
  readonly complete: boolean;
  readonly aborted: boolean;
}

async function discoverGlobalRoot(
  root: SourceRoot,
  candidates: readonly RegisteredCandidate[],
  collector: DiagnosticCollector,
  limits: ScanLimits,
  maximumDirectoryEntries: number,
  signal: AbortSignal,
): Promise<RootDiscoveryResult> {
  const records = new Map<string, MutableCandidateDiscoveredFile>();
  let directoryEntriesVisited = 0;
  let complete = true;
  let aborted = false;
  const applicableCandidates = candidates.filter(
    ({ spec }) => spec.source === 'global' && spec.locatorId === root.locatorId,
  );
  if (applicableCandidates.length === 0) {
    return { files: [], directoryEntriesVisited, complete, aborted };
  }

  const boundaryResult = await createRootBoundary(root.rootPath, signal);
  if (!boundaryResult.ok) {
    if (boundaryResult.reason !== 'aborted') {
      collector.add({
        code:
          boundaryResult.reason === 'symlink-root'
            ? 'DISCOVERY_SYMLINK_ROOT_REJECTED'
            : boundaryResult.reason === 'not-directory'
              ? 'DISCOVERY_ROOT_NOT_DIRECTORY'
              : boundaryResult.reason === 'root-changed'
                ? 'DISCOVERY_ROOT_CHANGED'
                : 'DISCOVERY_ROOT_UNREADABLE',
        severity: 'error',
        message:
          boundaryResult.reason === 'symlink-root'
            ? 'A configured source root was a symbolic link and was rejected.'
            : boundaryResult.reason === 'not-directory'
              ? 'A configured source root was not a directory.'
              : boundaryResult.reason === 'root-changed'
                ? 'A configured source root changed during validation.'
                : 'A configured source root could not be read.',
      });
    }
    return {
      files: [],
      directoryEntriesVisited,
      complete: false,
      aborted: boundaryResult.reason === 'aborted',
    };
  }

  for (const candidate of applicableCandidates) {
    if (signal.aborted) {
      aborted = true;
      complete = false;
      break;
    }

    const remainingEntries = maximumDirectoryEntries - directoryEntriesVisited;
    if (remainingEntries <= 0) {
      complete = false;
      collector.add({
        code: 'DISCOVERY_ENTRY_LIMIT_REACHED',
        severity: 'warning',
        message: 'The source directory-entry limit was reached.',
      });
      break;
    }
    const sourceLimits = {
      ...limits.global,
      maxDirectoryEntries: remainingEntries,
    };

    if (candidate.spec.kind === 'exact-file') {
      const discovered = await discoverExactFile({
        rootPath: root.rootPath,
        boundary: boundaryResult.boundary,
        relativePath: candidate.spec.relativePath,
        source: root.descriptor,
        diagnostics: collector,
        limits: { ...limits, global: sourceLimits },
        signal,
      });
      directoryEntriesVisited += discovered.directoryEntriesVisited;
      complete &&= discovered.complete;
      aborted ||= discovered.aborted;
      if (discovered.file !== undefined) {
        addEligibleCandidate(records, discovered.file, candidate);
      }
      if (aborted) {
        break;
      }
      continue;
    }

    const baseDepth = candidate.spec.relativePath.split('/').length;
    const remainingDepth = limits.maxDepth - baseDepth;
    const traversalDepth = Math.min(candidate.spec.maxDepth, remainingDepth);
    if (traversalDepth <= 0) {
      complete = false;
      collector.add({
        code: 'DISCOVERY_DEPTH_LIMIT_REACHED',
        severity: 'warning',
        message: 'A configured directory exceeded the source depth limit and was skipped.',
      });
      continue;
    }
    if (candidate.spec.maxDepth > remainingDepth) {
      complete = false;
      collector.add({
        code: 'DISCOVERY_DEPTH_LIMIT_REACHED',
        severity: 'warning',
        message: 'A configured directory was truncated by the source depth limit.',
      });
    }

    const walked = await walkDirectory({
      rootPath: root.rootPath,
      boundary: boundaryResult.boundary,
      startRelativePath: candidate.spec.relativePath,
      source: root.descriptor,
      diagnostics: collector,
      limits: {
        ...limits,
        maxDepth: traversalDepth,
        global: sourceLimits,
      },
      includeFile: ({ relativePath }) =>
        candidateMatchesRelativePath(candidate.spec, 'global', relativePath),
      signal,
    });
    directoryEntriesVisited += walked.directoryEntriesVisited;
    complete &&= walked.complete;
    aborted ||= walked.aborted;
    for (const file of walked.files) {
      addEligibleCandidate(records, file, candidate);
    }
    if (aborted) {
      break;
    }
  }

  return {
    files: [...records.values()],
    directoryEntriesVisited,
    complete,
    aborted,
  };
}

/** Scans independently resolved source roots without executing inspected content. */
export async function inspectSource(options: InspectSourceOptions): Promise<SourceInspection> {
  validateRoots(options.source, options.roots);
  if (!Number.isSafeInteger(options.revision) || options.revision < 0) {
    throw new TypeError('A source revision must be a non-negative safe integer.');
  }
  const limits = validateScanLimits(options.limits ?? DEFAULT_SCAN_LIMITS);
  const resolved = resolveSourceScanLimits(limits, options.source);
  const sourceDescriptor = createCatalogSource(options.source, options.roots);
  const collector = new DiagnosticCollector(sourceDescriptor, resolved.maxDetailedDiagnostics);
  const sourceBudget = new ReadBudget(resolved.maxTotalBytes);
  const combinedBudget = options.combinedReadBudget ?? new ReadBudget(resolved.maxCombinedBytes);
  const signal = options.signal ?? new AbortController().signal;
  const documents: ArtifactDocument[] = [];
  const retainedDiagnosticBudget = new RetainedDocumentDiagnosticBudget(
    resolved.maxDetailedDiagnostics,
  );
  const registeredCandidates = options.adapters.candidatesFor(options.source);
  let entriesVisited = 0;
  let complete = true;
  let aborted = false;

  rootLoop: for (const root of options.roots) {
    if (signal.aborted) {
      aborted = true;
      complete = false;
      break;
    }
    const remainingEntries = resolved.maxDirectoryEntries - entriesVisited;
    if (remainingEntries <= 0) {
      complete = false;
      collector.add({
        code: 'DISCOVERY_ENTRY_LIMIT_REACHED',
        severity: 'warning',
        message: 'The source directory-entry limit was reached.',
      });
      break;
    }
    let discovered: RootDiscoveryResult;
    if (options.source === 'global') {
      discovered = await discoverGlobalRoot(
        root,
        registeredCandidates,
        collector,
        limits,
        remainingEntries,
        signal,
      );
    } else {
      const rootLimits: ScanLimits = {
        ...limits,
        repository: {
          ...limits.repository,
          maxDirectoryEntries: remainingEntries,
        },
      };
      const walked = await walkDirectory({
        rootPath: root.rootPath,
        source: root.descriptor,
        diagnostics: collector,
        limits: rootLimits,
        signal,
      });
      discovered = {
        files: walked.files
          .map((file): CandidateDiscoveredFile => ({
            file,
            eligibleCandidates: eligibleCandidatesForEntry(options.adapters, file.entry),
          }))
          .filter(({ eligibleCandidates }) => eligibleCandidates.size > 0),
        directoryEntriesVisited: walked.directoryEntriesVisited,
        complete: walked.complete,
        aborted: walked.aborted,
      };
    }
    entriesVisited += discovered.directoryEntriesVisited;
    complete &&= discovered.complete;
    aborted ||= discovered.aborted;
    if (aborted || signal.aborted) {
      aborted = true;
      complete = false;
      break;
    }

    const candidateFiles = [...discovered.files].sort((left, right) => {
      const leftPath = left.file.entry.relativePath;
      const rightPath = right.file.entry.relativePath;
      return leftPath < rightPath ? -1 : leftPath > rightPath ? 1 : 0;
    });
    for (const { file, eligibleCandidates } of candidateFiles) {
      const inspected = await inspectFile(
        file,
        eligibleCandidates,
        root,
        options.adapters,
        collector,
        sourceBudget,
        combinedBudget,
        resolved.maxFileBytes,
        retainedDiagnosticBudget,
        signal,
      );
      complete &&= inspected.complete;
      if (inspected.aborted || signal.aborted) {
        aborted = true;
        complete = false;
        break rootLoop;
      }
      if (inspected.document !== undefined) {
        documents.push(inspected.document);
        if (documents.length >= resolved.maxArtifacts) {
          complete = false;
          collector.add({
            code: 'ARTIFACT_LIMIT_REACHED',
            severity: 'warning',
            message: 'The source artifact limit was reached.',
          });
          break rootLoop;
        }
      }
    }
  }

  const publication = publishCatalog({
    source: options.source,
    revision: options.revision,
    documents,
    diagnostics: collector.toArray(),
  });
  return Object.freeze({ publication, complete, aborted });
}
