import type { SourceLayer } from './model.js';

const MEBIBYTE = 1024 * 1024;

export interface SourceScanLimits {
  readonly maxDirectoryEntries: number;
  readonly maxArtifacts: number;
  readonly maxTotalBytes: number;
  readonly maxDetailedDiagnostics: number;
}

export interface ScanLimits {
  readonly maxDepth: number;
  readonly maxFileBytes: number;
  readonly maxCombinedBytes: number;
  readonly readConcurrency: number;
  readonly repository: SourceScanLimits;
  readonly global: SourceScanLimits;
}

export interface ResolvedSourceScanLimits extends SourceScanLimits {
  readonly maxDepth: number;
  readonly maxFileBytes: number;
  readonly maxCombinedBytes: number;
  readonly readConcurrency: number;
}

export interface SourceScanLimitOverrides {
  readonly maxDirectoryEntries?: number;
  readonly maxArtifacts?: number;
  readonly maxTotalBytes?: number;
  readonly maxDetailedDiagnostics?: number;
}

export interface ScanLimitOverrides {
  readonly maxDepth?: number;
  readonly maxFileBytes?: number;
  readonly maxCombinedBytes?: number;
  readonly readConcurrency?: number;
  readonly repository?: SourceScanLimitOverrides;
  readonly global?: SourceScanLimitOverrides;
}

export class ScanLimitValidationError extends TypeError {
  readonly code = 'INVALID_SCAN_LIMIT' as const;

  constructor(limitName: string) {
    super(`The ${limitName} scan limit must be a positive safe integer.`);
    this.name = 'ScanLimitValidationError';
  }
}

function freezeLimits(limits: ScanLimits): ScanLimits {
  Object.freeze(limits.repository);
  Object.freeze(limits.global);
  return Object.freeze(limits);
}

export const DEFAULT_SCAN_LIMITS: ScanLimits = freezeLimits({
  maxDepth: 64,
  maxFileBytes: MEBIBYTE,
  maxCombinedBytes: 40 * MEBIBYTE,
  readConcurrency: 8,
  repository: {
    maxDirectoryEntries: 50_000,
    maxArtifacts: 5_000,
    maxTotalBytes: 32 * MEBIBYTE,
    maxDetailedDiagnostics: 10_000,
  },
  global: {
    maxDirectoryEntries: 5_000,
    maxArtifacts: 1_000,
    maxTotalBytes: 8 * MEBIBYTE,
    maxDetailedDiagnostics: 10_000,
  },
});

function requirePositiveSafeInteger(name: string, value: number): number {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new ScanLimitValidationError(name);
  }

  return value;
}

function createSourceLimits(
  layer: SourceLayer,
  defaults: SourceScanLimits,
  overrides: SourceScanLimitOverrides | undefined,
): SourceScanLimits {
  return {
    maxDirectoryEntries: requirePositiveSafeInteger(
      `${layer}.maxDirectoryEntries`,
      overrides?.maxDirectoryEntries ?? defaults.maxDirectoryEntries,
    ),
    maxArtifacts: requirePositiveSafeInteger(
      `${layer}.maxArtifacts`,
      overrides?.maxArtifacts ?? defaults.maxArtifacts,
    ),
    maxTotalBytes: requirePositiveSafeInteger(
      `${layer}.maxTotalBytes`,
      overrides?.maxTotalBytes ?? defaults.maxTotalBytes,
    ),
    maxDetailedDiagnostics: requirePositiveSafeInteger(
      `${layer}.maxDetailedDiagnostics`,
      overrides?.maxDetailedDiagnostics ?? defaults.maxDetailedDiagnostics,
    ),
  };
}

/** Merge trusted caller overrides with the documented defaults and validate them. */
export function createScanLimits(overrides: ScanLimitOverrides = {}): ScanLimits {
  return freezeLimits({
    maxDepth: requirePositiveSafeInteger(
      'maxDepth',
      overrides.maxDepth ?? DEFAULT_SCAN_LIMITS.maxDepth,
    ),
    maxFileBytes: requirePositiveSafeInteger(
      'maxFileBytes',
      overrides.maxFileBytes ?? DEFAULT_SCAN_LIMITS.maxFileBytes,
    ),
    maxCombinedBytes: requirePositiveSafeInteger(
      'maxCombinedBytes',
      overrides.maxCombinedBytes ?? DEFAULT_SCAN_LIMITS.maxCombinedBytes,
    ),
    readConcurrency: requirePositiveSafeInteger(
      'readConcurrency',
      overrides.readConcurrency ?? DEFAULT_SCAN_LIMITS.readConcurrency,
    ),
    repository: createSourceLimits(
      'repository',
      DEFAULT_SCAN_LIMITS.repository,
      overrides.repository,
    ),
    global: createSourceLimits('global', DEFAULT_SCAN_LIMITS.global, overrides.global),
  });
}

/** Validate and defensively copy a complete limits value. */
export function validateScanLimits(limits: ScanLimits): ScanLimits {
  return createScanLimits(limits);
}

/** Resolve a single source budget without flattening Repository and Global totals. */
export function resolveSourceScanLimits(
  limits: ScanLimits,
  layer: SourceLayer,
): ResolvedSourceScanLimits {
  const validated = limits === DEFAULT_SCAN_LIMITS ? limits : validateScanLimits(limits);
  const source = validated[layer];

  return Object.freeze({
    maxDepth: validated.maxDepth,
    maxDirectoryEntries: source.maxDirectoryEntries,
    maxArtifacts: source.maxArtifacts,
    maxFileBytes: validated.maxFileBytes,
    maxTotalBytes: source.maxTotalBytes,
    maxDetailedDiagnostics: source.maxDetailedDiagnostics,
    maxCombinedBytes: validated.maxCombinedBytes,
    readConcurrency: validated.readConcurrency,
  });
}
