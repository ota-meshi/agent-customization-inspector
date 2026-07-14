import { describe, expect, it } from 'vitest';

import {
  DEFAULT_SCAN_LIMITS,
  ScanLimitValidationError,
  createScanLimits,
  resolveSourceScanLimits,
  validateScanLimits,
} from '../../src/core/limits.js';

const MEBIBYTE = 1024 * 1024;

describe('scan limits', () => {
  it('matches the documented Repository and Global defaults', () => {
    expect(DEFAULT_SCAN_LIMITS).toEqual({
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
    expect(Object.isFrozen(DEFAULT_SCAN_LIMITS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SCAN_LIMITS.repository)).toBe(true);
    expect(Object.isFrozen(DEFAULT_SCAN_LIMITS.global)).toBe(true);
  });

  it('merges overrides without flattening source-specific budgets', () => {
    const limits = createScanLimits({
      maxDepth: 12,
      repository: { maxArtifacts: 20 },
      global: { maxArtifacts: 3, maxTotalBytes: 512 },
    });

    expect(resolveSourceScanLimits(limits, 'repository')).toMatchObject({
      maxDepth: 12,
      maxDirectoryEntries: 50_000,
      maxArtifacts: 20,
      maxTotalBytes: 32 * MEBIBYTE,
      maxDetailedDiagnostics: 10_000,
    });
    expect(resolveSourceScanLimits(limits, 'global')).toMatchObject({
      maxDepth: 12,
      maxDirectoryEntries: 5_000,
      maxArtifacts: 3,
      maxTotalBytes: 512,
      maxDetailedDiagnostics: 10_000,
    });
  });

  it('returns defensive frozen copies from validation and resolution', () => {
    const original = {
      ...DEFAULT_SCAN_LIMITS,
      repository: { ...DEFAULT_SCAN_LIMITS.repository },
      global: { ...DEFAULT_SCAN_LIMITS.global },
    };
    const validated = validateScanLimits(original);
    const resolved = resolveSourceScanLimits(validated, 'repository');

    expect(validated).not.toBe(original);
    expect(Object.isFrozen(validated)).toBe(true);
    expect(Object.isFrozen(resolved)).toBe(true);
  });

  it('validates complete values again at the source-resolution boundary', () => {
    const invalid = {
      ...DEFAULT_SCAN_LIMITS,
      repository: { ...DEFAULT_SCAN_LIMITS.repository, maxArtifacts: 0 },
    };

    expect(() => resolveSourceScanLimits(invalid, 'repository')).toThrow(ScanLimitValidationError);
  });

  it.each([
    { maxDepth: 0 },
    { maxFileBytes: -1 },
    { readConcurrency: 1.5 },
    { maxCombinedBytes: Number.MAX_VALUE },
    { repository: { maxDirectoryEntries: 0 } },
    { global: { maxDetailedDiagnostics: Number.NaN } },
  ])('rejects an invalid limit override: %j', (override) => {
    expect(() => createScanLimits(override)).toThrow(ScanLimitValidationError);
  });
});
