import { ArtifactDetailStore, type DetailStoreReadRequest } from './detail-store.js';
import { DiagnosticCollector } from './diagnostics.js';
import { DEFAULT_SCAN_LIMITS, validateScanLimits, type ScanLimits } from './limits.js';
import { inspectSource } from './inspector.js';
import {
  ARTIFACT_SCHEMA_VERSION,
  type ArtifactDocument,
  type GlobalSnapshotState,
  type SessionSnapshot,
  type SourceDescriptor,
} from './model.js';
import type { AdapterRegistry } from './registry.js';
import { ReadBudget } from '../discovery/read-text.js';
import { createRepositorySource } from '../sources/repository-source.js';
import { assertGlobalRoots, type ToolHomeResolver } from '../sources/tool-homes.js';

const INITIAL_REVISION = 1;
const GLOBAL_SESSION_SOURCE: SourceDescriptor = Object.freeze({
  layer: 'global',
  id: 'global-session',
  label: 'Global',
  virtualBase: 'global://catalog',
});

export interface InspectInitialSessionOptions {
  readonly repositoryRoot: string;
  readonly includeGlobal?: boolean;
  readonly adapters: AdapterRegistry;
  /** Test-only in M1. Real built-in tool-home resolvers belong to M2. */
  readonly globalResolver?: ToolHomeResolver;
  readonly limits?: ScanLimits;
  readonly signal?: AbortSignal;
}

export type SessionArtifactRequest = Omit<DetailStoreReadRequest, 'sourceEnabled'>;

class SessionAbortError extends Error {
  constructor() {
    super('The inspection was aborted.');
    this.name = 'AbortError';
  }
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

/**
 * Waits for trusted resolver work without retaining or publishing a late result
 * after cancellation. The resolver promise always has rejection handlers.
 */
function abortable<T>(signal: AbortSignal, work: () => Promise<T>): Promise<T> {
  if (signal.aborted) {
    return Promise.reject(new SessionAbortError());
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) {
        return;
      }
      settled = true;
      signal.removeEventListener('abort', onAbort);
      callback();
    };
    const onAbort = (): void => finish(() => reject(new SessionAbortError()));
    signal.addEventListener('abort', onAbort, { once: true });

    Promise.resolve()
      .then(work)
      .then(
        (value) => finish(() => resolve(value)),
        (error: unknown) => finish(() => reject(error)),
      );
  });
}

function globalErrorState(limits: ScanLimits, code: string, message: string): GlobalSnapshotState {
  const diagnostics = new DiagnosticCollector(
    GLOBAL_SESSION_SOURCE,
    limits.global.maxDetailedDiagnostics,
  );
  diagnostics.add({ code, severity: 'warning', message });
  return Object.freeze({
    enabled: true,
    status: 'error',
    diagnostics: Object.freeze([...diagnostics.toArray()]),
  });
}

/**
 * Internal M1 session result. Normal serialization yields only the source-separated
 * summary snapshot; detail documents remain behind revision and source checks.
 */
export class InitialInspectionSession {
  readonly #details: ArtifactDetailStore;
  readonly snapshot: SessionSnapshot;

  constructor(snapshot: SessionSnapshot, details: ArtifactDetailStore) {
    this.snapshot = snapshot;
    this.#details = details;
    Object.freeze(this);
  }

  getArtifact(request: SessionArtifactRequest): ArtifactDocument {
    return this.#details.getArtifact({
      ...request,
      sourceEnabled: request.source === 'repository' || this.snapshot.global.enabled,
    });
  }

  toJSON(): SessionSnapshot {
    return this.snapshot;
  }
}

/**
 * Builds the initial Repository snapshot and, only after explicit opt-in, a
 * separately resolved Global snapshot. This function has no persistence.
 */
export async function inspectInitialSession(
  options: InspectInitialSessionOptions,
): Promise<InitialInspectionSession> {
  if (options.includeGlobal !== undefined && typeof options.includeGlobal !== 'boolean') {
    throw new TypeError('includeGlobal must be a boolean when provided.');
  }

  const limits = validateScanLimits(options.limits ?? DEFAULT_SCAN_LIMITS);
  const signal = options.signal ?? new AbortController().signal;
  const combinedReadBudget = new ReadBudget(limits.maxCombinedBytes);
  const details = new ArtifactDetailStore();
  const repositoryRoot = createRepositorySource(options.repositoryRoot);
  const repository = await inspectSource({
    source: 'repository',
    roots: [repositoryRoot],
    adapters: options.adapters,
    revision: INITIAL_REVISION,
    limits,
    combinedReadBudget,
    signal,
  });
  if (repository.aborted || signal.aborted) {
    throw new SessionAbortError();
  }

  details.replaceSource({
    source: 'repository',
    catalogId: repository.publication.snapshot.id,
    revision: repository.publication.snapshot.revision,
    documents: repository.publication.details,
  });

  let global: GlobalSnapshotState = Object.freeze({ enabled: false, status: 'disabled' });

  // Keep every resolver access inside this branch. With Global off, the caller's
  // resolver property is not even read and no tool-home path can become known.
  if (options.includeGlobal === true) {
    try {
      const resolver = options.globalResolver;
      if (resolver === undefined) {
        global = globalErrorState(
          limits,
          'GLOBAL_RESOLVER_UNAVAILABLE',
          'Global inspection is unavailable because no trusted resolver was configured.',
        );
      } else {
        const roots = assertGlobalRoots(await abortable(signal, () => resolver.resolve(signal)));
        const inspected = await inspectSource({
          source: 'global',
          roots,
          adapters: options.adapters,
          revision: INITIAL_REVISION,
          limits,
          combinedReadBudget,
          signal,
        });
        if (inspected.aborted || signal.aborted) {
          throw new SessionAbortError();
        }
        details.replaceSource({
          source: 'global',
          catalogId: inspected.publication.snapshot.id,
          revision: inspected.publication.snapshot.revision,
          documents: inspected.publication.details,
        });
        global = Object.freeze({
          enabled: true,
          status: inspected.complete && !inspected.aborted ? 'ready' : 'partial',
          catalog: inspected.publication.snapshot,
        });
      }
    } catch (error: unknown) {
      details.evictSource('global');
      global = globalErrorState(
        limits,
        signal.aborted || isAbortError(error)
          ? 'GLOBAL_RESOLUTION_ABORTED'
          : 'GLOBAL_RESOLUTION_FAILED',
        signal.aborted || isAbortError(error)
          ? 'Global inspection was aborted before it could publish a catalog.'
          : 'Global roots could not be resolved safely.',
      );
    }
  }

  const snapshot: SessionSnapshot = Object.freeze({
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    revision: INITIAL_REVISION,
    repository: repository.publication.snapshot,
    global,
  });
  return new InitialInspectionSession(snapshot, details);
}
