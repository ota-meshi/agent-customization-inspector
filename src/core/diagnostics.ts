import type { DiagnosticCounts, DiagnosticSeverity, SourceDescriptor } from './model.js';

export type { DiagnosticSeverity } from './model.js';

export const DIAGNOSTIC_LIMIT_REACHED = 'DIAGNOSTIC_LIMIT_REACHED' as const;
export const MAX_DIAGNOSTIC_MESSAGE_CODE_POINTS = 512;
export const MAX_DIAGNOSTIC_VIRTUAL_PATH_CODE_UNITS = 32_768;

export interface Diagnostic {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly source: SourceDescriptor;
  readonly artifactId?: string;
  readonly virtualPath?: string;
}

export interface DiagnosticInput {
  readonly code: string;
  readonly severity: DiagnosticSeverity;
  readonly message: string;
  readonly artifactId?: string;
  readonly virtualPath?: string;
}

export interface DiagnosticCollectorSnapshot {
  readonly diagnostics: readonly Diagnostic[];
  readonly counts: DiagnosticCounts;
  readonly overflowCounts: DiagnosticCounts;
  readonly overflowed: boolean;
}

const EMPTY_COUNTS = (): DiagnosticCounts => ({ info: 0, warning: 0, error: 0 });
const OPAQUE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._~-]{0,127}$/u;
const VIRTUAL_BASE_SEGMENT_PATTERN = /^[A-Za-z0-9._~-]+$/u;

function isDisplayControl(codePoint: number): boolean {
  return (
    codePoint <= 0x1f ||
    (codePoint >= 0x7f && codePoint <= 0x9f) ||
    codePoint === 0x061c ||
    codePoint === 0x200e ||
    codePoint === 0x200f ||
    (codePoint >= 0x2028 && codePoint <= 0x202e) ||
    (codePoint >= 0x2066 && codePoint <= 0x2069) ||
    (codePoint >= 0xd800 && codePoint <= 0xdfff) ||
    codePoint === 0xfeff
  );
}

function escapeDisplayControls(value: string): string {
  let result = '';
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    result +=
      codePoint === undefined
        ? '\\u{fffd}'
        : isDisplayControl(codePoint)
          ? `\\u{${codePoint.toString(16).padStart(4, '0')}}`
          : character;
  }
  return result;
}

function redactAbsolutePathLikeText(value: string): string {
  // Diagnostics intentionally discard the rest of a line after an absolute-path
  // marker. Raw filesystem errors must not be passed through, and conservative
  // over-redaction is preferable to revealing a home path or override value.
  return value.replace(
    /(https?:\/\/[^\s\r\n]+)|(?:file:\/{1,3}|(?<![A-Za-z0-9._~-])[A-Za-z]:[\\/]|(?<![A-Za-z0-9._~\\/])[\\/]+)[^\r\n]*/giu,
    (matched, httpUrl: string | undefined) => (httpUrl === undefined ? '[absolute path]' : matched),
  );
}

function takeCodePoints(value: string, maximum: number): string {
  let result = '';
  let count = 0;

  for (const character of value) {
    if (count >= maximum) {
      break;
    }

    result += character;
    count += 1;
  }

  return result;
}

export function sanitizeDiagnosticMessage(message: string): string {
  const bounded = takeCodePoints(
    typeof message === 'string' ? message : 'A recoverable inspection issue occurred.',
    MAX_DIAGNOSTIC_MESSAGE_CODE_POINTS,
  );
  const escaped = escapeDisplayControls(redactAbsolutePathLikeText(bounded));
  const sanitized = takeCodePoints(escaped.trim(), MAX_DIAGNOSTIC_MESSAGE_CODE_POINTS);
  return sanitized || 'A recoverable inspection issue occurred.';
}

export function normalizeDiagnosticCode(code: string): string {
  const bounded = typeof code === 'string' ? code.slice(0, 64) : '';
  let normalized = bounded
    .toUpperCase()
    .replace(/[^A-Z0-9_]/gu, '_')
    .replace(/_+/gu, '_')
    .replace(/^_+|_+$/gu, '');

  if (!/^[A-Z]/u.test(normalized)) {
    normalized = normalized ? `DIAGNOSTIC_${normalized}` : 'UNKNOWN_DIAGNOSTIC';
  }

  return normalized.slice(0, 64);
}

function assertSourceDescriptor(source: SourceDescriptor): SourceDescriptor {
  if (source.layer !== 'repository' && source.layer !== 'global') {
    throw new TypeError('The public source layer is invalid.');
  }

  if (!OPAQUE_ID_PATTERN.test(source.id)) {
    throw new TypeError('The public source id is invalid.');
  }

  const expectedPrefix = `${source.layer}://`;
  if (!source.virtualBase.startsWith(expectedPrefix)) {
    throw new TypeError('The public source virtual base is invalid.');
  }

  const suffix = source.virtualBase.slice(expectedPrefix.length).replace(/\/$/u, '');
  if (
    suffix.length === 0 ||
    suffix.split('/').some((segment) => !VIRTUAL_BASE_SEGMENT_PATTERN.test(segment))
  ) {
    throw new TypeError('The public source virtual base is invalid.');
  }

  const label = sanitizeDiagnosticMessage(source.label);

  return Object.freeze({
    layer: source.layer,
    id: source.id,
    label,
    virtualBase: source.virtualBase,
  });
}

function sanitizeOptionalArtifactId(value: string | undefined): string | undefined {
  return value !== undefined && OPAQUE_ID_PATTERN.test(value) ? value : undefined;
}

function sanitizeOptionalVirtualPath(
  value: string | undefined,
  source: SourceDescriptor,
): string | undefined {
  const prefix = `${source.layer}://`;
  if (
    value === undefined ||
    value.length > MAX_DIAGNOSTIC_VIRTUAL_PATH_CODE_UNITS ||
    !value.startsWith(prefix)
  ) {
    return undefined;
  }

  const suffix = value.slice(prefix.length);
  if (
    suffix.length === 0 ||
    suffix.startsWith('/') ||
    suffix.includes('\\') ||
    /[?#]/u.test(suffix) ||
    suffix
      .split('/')
      .some(
        (segment) =>
          segment === '' || segment === '.' || segment === '..' || /^(?:%2e){1,2}$/iu.test(segment),
      )
  ) {
    return undefined;
  }

  return escapeDisplayControls(value);
}

function normalizeSeverity(severity: DiagnosticSeverity): DiagnosticSeverity {
  return severity === 'info' || severity === 'warning' || severity === 'error' ? severity : 'error';
}

function freezeCounts(counts: DiagnosticCounts): DiagnosticCounts {
  return Object.freeze({ ...counts });
}

function createStoredDiagnostic(source: SourceDescriptor, input: DiagnosticInput): Diagnostic {
  const artifactId = sanitizeOptionalArtifactId(input.artifactId);
  const virtualPath = sanitizeOptionalVirtualPath(input.virtualPath, source);
  const diagnostic: {
    code: string;
    severity: DiagnosticSeverity;
    message: string;
    source: SourceDescriptor;
    artifactId?: string;
    virtualPath?: string;
  } = {
    code: normalizeDiagnosticCode(input.code),
    severity: normalizeSeverity(input.severity),
    message: sanitizeDiagnosticMessage(input.message),
    source,
  };

  if (artifactId !== undefined) {
    diagnostic.artifactId = artifactId;
  }

  if (virtualPath !== undefined) {
    diagnostic.virtualPath = virtualPath;
  }

  return Object.freeze(diagnostic);
}

export class DiagnosticCollector {
  readonly #source: SourceDescriptor;
  readonly #limit: number;
  readonly #diagnostics: Diagnostic[] = [];
  readonly #counts: DiagnosticCounts = EMPTY_COUNTS();
  readonly #overflowCounts: DiagnosticCounts = EMPTY_COUNTS();
  #overflowed = false;

  constructor(source: SourceDescriptor, maxDetailedDiagnostics: number) {
    if (!Number.isSafeInteger(maxDetailedDiagnostics) || maxDetailedDiagnostics <= 0) {
      throw new TypeError('The diagnostic detail limit must be a positive safe integer.');
    }

    this.#source = assertSourceDescriptor(source);
    this.#limit = maxDetailedDiagnostics;
  }

  get source(): SourceDescriptor {
    return this.#source;
  }

  get size(): number {
    return this.#diagnostics.length;
  }

  get overflowed(): boolean {
    return this.#overflowed;
  }

  add(input: DiagnosticInput): void {
    const severity = normalizeSeverity(input.severity);
    this.#counts[severity] += 1;

    if (this.#overflowed) {
      this.#overflowCounts[severity] += 1;
      this.#replaceLimitSummary();
      return;
    }

    if (this.#diagnostics.length < this.#limit) {
      this.#diagnostics.push(createStoredDiagnostic(this.#source, input));
      return;
    }

    this.#overflowed = true;
    const displaced = this.#diagnostics.pop();
    if (displaced !== undefined) {
      this.#overflowCounts[displaced.severity] += 1;
    }
    this.#overflowCounts[severity] += 1;
    this.#replaceLimitSummary();
  }

  toArray(): readonly Diagnostic[] {
    return Object.freeze([...this.#diagnostics]);
  }

  getCounts(): DiagnosticCounts {
    return freezeCounts(this.#counts);
  }

  getOverflowCounts(): DiagnosticCounts {
    return freezeCounts(this.#overflowCounts);
  }

  snapshot(): DiagnosticCollectorSnapshot {
    return Object.freeze({
      diagnostics: this.toArray(),
      counts: this.getCounts(),
      overflowCounts: this.getOverflowCounts(),
      overflowed: this.#overflowed,
    });
  }

  #replaceLimitSummary(): void {
    const { info, warning, error } = this.#overflowCounts;
    const summary = Object.freeze({
      code: DIAGNOSTIC_LIMIT_REACHED,
      severity: 'warning' as const,
      message:
        'Additional diagnostics were omitted after the per-source detail limit ' +
        `was reached (info: ${info}, warning: ${warning}, error: ${error}).`,
      source: this.#source,
    });

    if (this.#diagnostics.at(-1)?.code === DIAGNOSTIC_LIMIT_REACHED) {
      this.#diagnostics[this.#diagnostics.length - 1] = summary;
    } else {
      this.#diagnostics.push(summary);
    }
  }
}
