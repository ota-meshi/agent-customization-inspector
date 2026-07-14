import type {
  ArtifactFormat,
  ArtifactInterpretation,
  ArtifactSupport,
  SourceDescriptor,
  SourceLayer,
  ToolDescriptor,
} from './model.js';

export interface DiscoveryEntry {
  readonly source: SourceDescriptor;
  readonly relativePath: string;
  readonly virtualPath: string;
  readonly basename: string;
  readonly byteLength: number;
}

interface CandidateBase {
  readonly id: string;
  readonly relativePath: string;
}

interface RepositoryCandidateLocation {
  readonly source: 'repository';
  readonly locatorId?: never;
}

interface GlobalCandidateLocation {
  readonly source: 'global';
  /** Built-in tool-home locator this candidate is allowed to inspect. */
  readonly locatorId: string;
}

type CandidateLocation = RepositoryCandidateLocation | GlobalCandidateLocation;

export type ExactFileCandidateSpec = CandidateBase &
  CandidateLocation & {
    readonly kind: 'exact-file';
  };

export type BoundedDirectoryCandidateSpec = CandidateBase &
  CandidateLocation & {
    readonly kind: 'bounded-directory';
    readonly maxDepth: number;
    readonly match: {
      readonly basenames?: readonly string[];
      readonly suffixes?: readonly string[];
    };
  };

export type CandidateSpec = ExactFileCandidateSpec | BoundedDirectoryCandidateSpec;

export interface AdapterMatch {
  readonly candidateId: string;
  readonly variant: string;
  readonly kind: string;
  readonly support: ArtifactSupport;
}

export interface AdapterInspection {
  readonly format: ArtifactFormat;
  readonly interpretation: ArtifactInterpretation;
}

export interface AdapterManifest {
  readonly id: string;
  readonly tool: ToolDescriptor;
  readonly supportedKinds: readonly string[];
  readonly supportedSources: readonly SourceLayer[];
  readonly specSources: readonly string[];
  readonly documentedAsOf: string;
  readonly capabilities: {
    readonly discovery: 'full' | 'partial';
    readonly metadata: 'full' | 'partial' | 'none';
    readonly rawView: true;
  };
}

export interface ArtifactAdapter {
  readonly manifest: AdapterManifest;
  readonly candidates: readonly CandidateSpec[];

  match(entry: DiscoveryEntry): readonly AdapterMatch[];

  inspect(input: {
    readonly source: { readonly layer: SourceLayer; readonly locatorId: string };
    readonly entry: DiscoveryEntry;
    readonly match: AdapterMatch;
    readonly text: string;
    readonly signal: AbortSignal;
  }): Promise<AdapterInspection>;
}

export interface RegisteredCandidate {
  readonly adapterId: string;
  readonly spec: CandidateSpec;
}

export class AdapterRegistryContractError extends TypeError {
  readonly code = 'INVALID_ADAPTER_CONTRACT' as const;

  constructor(message: string) {
    super(message);
    this.name = 'AdapterRegistryContractError';
  }
}

const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const LOCATOR_ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

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

function contractError(message: string): never {
  throw new AdapterRegistryContractError(message);
}

function assertId(value: string, name: string): void {
  if (!ID_PATTERN.test(value)) {
    contractError(`The ${name} must be a bounded opaque identifier.`);
  }
}

function assertBoundedLabel(value: string, name: string): void {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 256 ||
    containsDisplayControl(value)
  ) {
    contractError(`The ${name} must be bounded display text without control characters.`);
  }
}

function assertRelativePath(value: string, allowRoot: boolean): void {
  if (allowRoot && value === '.') {
    return;
  }

  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 4_096 ||
    value.startsWith('/') ||
    value.includes('\\') ||
    value.includes('\0') ||
    /^[A-Za-z]:/u.test(value) ||
    value.split('/').some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    contractError('Adapter candidate paths must be normalized source-relative paths.');
  }
}

function isIsoCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function assertManifest(manifest: AdapterManifest): void {
  assertId(manifest.id, 'adapter id');
  assertId(manifest.tool.id, 'tool id');
  assertBoundedLabel(manifest.tool.label, 'tool label');

  if (!Array.isArray(manifest.supportedKinds) || manifest.supportedKinds.length === 0) {
    contractError('An adapter must declare at least one supported kind.');
  }
  if (new Set(manifest.supportedKinds).size !== manifest.supportedKinds.length) {
    contractError('Supported adapter kinds must be unique.');
  }
  for (const kind of manifest.supportedKinds) {
    assertBoundedLabel(kind, 'supported kind');
  }

  if (
    !Array.isArray(manifest.supportedSources) ||
    manifest.supportedSources.length === 0 ||
    manifest.supportedSources.some((source) => source !== 'repository' && source !== 'global')
  ) {
    contractError('An adapter must declare at least one valid source layer.');
  }
  if (new Set(manifest.supportedSources).size !== manifest.supportedSources.length) {
    contractError('Supported adapter source layers must be unique.');
  }

  if (
    !Array.isArray(manifest.specSources) ||
    manifest.specSources.length === 0 ||
    manifest.specSources.some((source) => {
      try {
        return new URL(source).protocol !== 'https:';
      } catch {
        return true;
      }
    })
  ) {
    contractError('Adapter specification sources must be absolute HTTPS URLs.');
  }

  if (!isIsoCalendarDate(manifest.documentedAsOf)) {
    contractError('The adapter review date must use a valid YYYY-MM-DD value.');
  }

  if (
    typeof manifest.capabilities !== 'object' ||
    manifest.capabilities === null ||
    manifest.capabilities.rawView !== true
  ) {
    contractError('Every adapter must support the bounded raw view contract.');
  }
  if (
    (manifest.capabilities.discovery !== 'full' && manifest.capabilities.discovery !== 'partial') ||
    (manifest.capabilities.metadata !== 'full' &&
      manifest.capabilities.metadata !== 'partial' &&
      manifest.capabilities.metadata !== 'none')
  ) {
    contractError('Adapter capabilities contain an unsupported contract value.');
  }
}

function assertCandidate(candidate: CandidateSpec, manifest: AdapterManifest): void {
  assertId(candidate.id, 'candidate id');
  if (candidate.kind !== 'exact-file' && candidate.kind !== 'bounded-directory') {
    contractError('An adapter candidate has an unsupported discovery kind.');
  }
  if (!manifest.supportedSources.includes(candidate.source)) {
    contractError('An adapter candidate uses an undeclared source layer.');
  }
  if (candidate.source === 'global') {
    if (
      typeof candidate.locatorId !== 'string' ||
      candidate.locatorId.length > 128 ||
      !LOCATOR_ID_PATTERN.test(candidate.locatorId)
    ) {
      contractError('A Global candidate requires a bounded built-in locator id.');
    }
  } else if ('locatorId' in candidate) {
    contractError('A Repository candidate cannot declare a Global locator id.');
  }

  assertRelativePath(candidate.relativePath, candidate.kind === 'bounded-directory');
  if (candidate.kind === 'bounded-directory') {
    if (candidate.source === 'global' && candidate.relativePath === '.') {
      contractError('A Global bounded directory candidate cannot target the tool-home root.');
    }
    if (!Number.isSafeInteger(candidate.maxDepth) || candidate.maxDepth <= 0) {
      contractError('A bounded directory candidate requires a positive safe depth.');
    }

    if (typeof candidate.match !== 'object' || candidate.match === null) {
      contractError('A bounded directory candidate requires an explicit filename filter.');
    }
    const basenames = candidate.match.basenames ?? [];
    const suffixes = candidate.match.suffixes ?? [];
    if (!Array.isArray(basenames) || !Array.isArray(suffixes)) {
      contractError('Candidate filename filters must be arrays.');
    }
    if (basenames.length === 0 && suffixes.length === 0) {
      contractError('A bounded directory candidate requires an explicit filename filter.');
    }
    for (const basename of basenames) {
      assertBoundedLabel(basename, 'candidate basename');
      if (
        basename === '.' ||
        basename === '..' ||
        basename.includes('/') ||
        basename.includes('\\')
      ) {
        contractError('Candidate basenames cannot contain path separators.');
      }
    }
    for (const suffix of suffixes) {
      assertBoundedLabel(suffix, 'candidate suffix');
      if (suffix.includes('/') || suffix.includes('\\')) {
        contractError('Candidate suffixes cannot contain path separators.');
      }
    }
  }
}

function deepFreezeClone<T>(value: T): T {
  const clone = structuredClone(value);
  const pending: object[] = [];
  if (typeof clone === 'object' && clone !== null) {
    pending.push(clone);
  }

  const visited = new WeakSet<object>();
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined || visited.has(current)) {
      continue;
    }

    visited.add(current);
    for (const nested of Object.values(current)) {
      if (typeof nested === 'object' && nested !== null) {
        pending.push(nested);
      }
    }
    Object.freeze(current);
  }

  return clone;
}

function snapshotManifest(manifest: AdapterManifest): AdapterManifest {
  return deepFreezeClone({
    id: manifest.id,
    tool: { id: manifest.tool.id, label: manifest.tool.label },
    supportedKinds: [...manifest.supportedKinds],
    supportedSources: [...manifest.supportedSources],
    specSources: [...manifest.specSources],
    documentedAsOf: manifest.documentedAsOf,
    capabilities: {
      discovery: manifest.capabilities.discovery,
      metadata: manifest.capabilities.metadata,
      rawView: true as const,
    },
  });
}

function snapshotCandidate(candidate: CandidateSpec): CandidateSpec {
  const location: CandidateLocation =
    candidate.source === 'global'
      ? { source: 'global', locatorId: candidate.locatorId }
      : { source: 'repository' };
  if (candidate.kind === 'exact-file') {
    return Object.freeze({
      id: candidate.id,
      ...location,
      kind: candidate.kind,
      relativePath: candidate.relativePath,
    });
  }

  const match: { basenames?: readonly string[]; suffixes?: readonly string[] } = {};
  if (candidate.match.basenames !== undefined) {
    match.basenames = Object.freeze([...candidate.match.basenames]);
  }
  if (candidate.match.suffixes !== undefined) {
    match.suffixes = Object.freeze([...candidate.match.suffixes]);
  }
  return Object.freeze({
    id: candidate.id,
    ...location,
    kind: candidate.kind,
    relativePath: candidate.relativePath,
    maxDepth: candidate.maxDepth,
    match: Object.freeze(match),
  });
}

function snapshotAdapter(adapter: ArtifactAdapter): ArtifactAdapter {
  if (typeof adapter.match !== 'function' || typeof adapter.inspect !== 'function') {
    contractError('An adapter must provide match and inspect functions.');
  }
  assertManifest(adapter.manifest);

  if (!Array.isArray(adapter.candidates)) {
    contractError('An adapter must declare a candidate array.');
  }

  const candidateIds = new Set<string>();
  for (const candidate of adapter.candidates) {
    assertCandidate(candidate, adapter.manifest);
    if (candidateIds.has(candidate.id)) {
      contractError('Candidate ids must be unique within an adapter.');
    }
    candidateIds.add(candidate.id);
  }

  const manifest = snapshotManifest(adapter.manifest);
  const candidates = Object.freeze(adapter.candidates.map(snapshotCandidate));
  const match = adapter.match.bind(adapter);
  const inspect = adapter.inspect.bind(adapter);

  return Object.freeze({ manifest, candidates, match, inspect });
}

/**
 * Immutable registry populated only by adapters explicitly supplied by trusted code.
 * It performs no module discovery and has no runtime registration method.
 */
export class AdapterRegistry {
  readonly #adapters: readonly ArtifactAdapter[];
  readonly #byId: ReadonlyMap<string, ArtifactAdapter>;

  constructor(trustedAdapters: readonly ArtifactAdapter[]) {
    const adapters: ArtifactAdapter[] = [];
    const byId = new Map<string, ArtifactAdapter>();

    for (const suppliedAdapter of trustedAdapters) {
      const adapter = snapshotAdapter(suppliedAdapter);
      if (byId.has(adapter.manifest.id)) {
        contractError('Adapter ids must be unique within the registry.');
      }

      adapters.push(adapter);
      byId.set(adapter.manifest.id, adapter);
    }

    this.#adapters = Object.freeze(adapters);
    this.#byId = byId;
  }

  list(): readonly ArtifactAdapter[] {
    return this.#adapters;
  }

  get(adapterId: string): ArtifactAdapter | undefined {
    return this.#byId.get(adapterId);
  }

  candidatesFor(source: SourceLayer): readonly RegisteredCandidate[] {
    const candidates: RegisteredCandidate[] = [];
    for (const adapter of this.#adapters) {
      for (const spec of adapter.candidates) {
        if (spec.source === source) {
          candidates.push(Object.freeze({ adapterId: adapter.manifest.id, spec }));
        }
      }
    }

    return Object.freeze(candidates);
  }
}
