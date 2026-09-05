// T041: runtime validation of the closed deterministic-rejection catalog
// at the untyped session RPC boundary (contracts/http-api.md § Common
// results and errors).
import { describe, expect, it } from 'vitest';

import { REJECTION_CODES, isRejectionCode } from '../../../src/shared/rejection-codes';

describe('closed rejection codes', () => {
  it('validates only members of the runtime catalog', () => {
    expect(REJECTION_CODES).toEqual([
      'stale-resource',
      'scan-in-progress',
      'global-enable-in-progress',
      'global-disable-pending',
      'consent-preview-frozen',
      'consent-preview-missing',
      'consent-required',
      'allowlist-version-mismatch',
      'consent-preview-mismatch',
      'no-retryable-global-tool',
    ]);
    for (const code of REJECTION_CODES) {
      expect(isRejectionCode(code)).toBe(true);
    }
    expect(isRejectionCode('invented-rejection')).toBe(false);
    expect(isRejectionCode(null)).toBe(false);
  });
});
