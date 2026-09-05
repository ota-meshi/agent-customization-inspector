// Runtime catalog and boundary validator for deterministic session-API
// rejections (contracts/http-api.md § Common results and errors). The
// catalog is the single source for both the public union and validation of
// values crossing the untyped devframe RPC channel; a consumer never casts
// an unknown string into a declared functional outcome.

/**
 * The closed runtime catalog of deterministic rejection codes
 * (contracts/http-api.md § Common results and errors).
 */
export const REJECTION_CODES = [
  /** A referenced resource belongs to a superseded generation. */
  'stale-resource',
  /** A duplicate explicit Repository scan was requested while one is already running or queued. */
  'scan-in-progress',
  /** A Global enable commit was requested while one is already in progress. */
  'global-enable-in-progress',
  /** An operation was requested while a Global disable is still pending. */
  'global-disable-pending',
  /** A preview mutation was attempted while active consent has frozen the preview. */
  'consent-preview-frozen',
  /** An operation referenced a consent preview that does not exist. */
  'consent-preview-missing',
  /** A Global enable commit was attempted without the required consent. */
  'consent-required',
  /** The submitted `allowlistVersion` no longer matches the current allowlist. */
  'allowlist-version-mismatch',
  /** The confirmed preview does not match the frozen preview. */
  'consent-preview-mismatch',
  /** A Global retry found no retryable tool. */
  'no-retryable-global-tool',
] as const;

/**
 * One member of the closed {@link REJECTION_CODES} catalog
 * (contracts/http-api.md § Common results and errors).
 */
export type RejectionCode = (typeof REJECTION_CODES)[number];

/**
 * Validates an untyped RPC value against the closed rejection-code catalog
 * (contracts/http-api.md § Common results and errors).
 */
export function isRejectionCode(value: unknown): value is RejectionCode {
  return typeof value === 'string' && REJECTION_CODES.some((code) => code === value);
}
