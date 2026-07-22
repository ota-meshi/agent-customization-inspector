// Public entity vocabulary shared by the host, CLI, and client: file
// encodings, the non-authorizing SourceBoundary presentation, root label
// encoding, evidence-assessment vocabulary, and opaque ID generation.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.

/**
 * The closed set of supported AI agents (spec.md FR-004,
 * contracts/official-sources.md): 'copilot' is GitHub Copilot, 'claude' is
 * Claude Code, 'codex' is OpenAI Codex. The same identifiers attribute
 * repository files at recognition time and own the per-tool Global
 * Sources — only the Global side is per-tool at the Source level, because
 * each tool has its own Global root while one Repository root holds every
 * tool's files.
 */
export type SupportedTool = 'copilot' | 'claude' | 'codex';

/**
 * Decode classification per spec.md § Byte Decode Outcomes. Orthogonal to
 * BOM presence, which `hadLeadingBom` records separately:
 *  - 'utf-8'          the bytes decoded without replacement
 *  - 'utf-8-replaced' invalid sequences decoded once with replacement
 *                     semantics; the text keeps every U+FFFD and stays
 *                     readable and comparable (FR-025)
 *  - 'binary'         at least one NUL byte; diagnostic-only, no source text
 *  - 'unknown'        no decode happened — the read failed before the bytes
 *                     could be classified
 */
export type FileEncoding = 'utf-8' | 'utf-8-replaced' | 'binary' | 'unknown';

/**
 * Result of the single decode pass (spec.md § Byte Decode Outcomes),
 * discriminated by `encoding` so the impossible combinations are
 * unrepresentable: binary input carries no text and no BOM record — the NUL
 * check precedes BOM handling, so a BOM concept does not exist for binary
 * bytes — while readable input always carries complete text.
 */
export type DecodedSourceBytes =
  | {
      /** Readable decode classification; see {@link FileEncoding}. */
      readonly encoding: 'utf-8' | 'utf-8-replaced';
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text; never null for readable input. */
      readonly sourceText: string;
    }
  | {
      /** At least one NUL byte: diagnostic-only, no text, no BOM concept. */
      readonly encoding: 'binary';
    };

const UTF8_BOM = [0xef, 0xbb, 0xbf];

/**
 * Decodes verified source bytes exactly once. Any NUL byte is binary and
 * diagnostic-only. Otherwise the bytes decode with UTF-8 replacement
 * semantics: one leading BOM is recorded and removed, any inserted U+FFFD
 * yields `utf-8-replaced`, and the complete (possibly garbled) text stays
 * readable. Literal authored U+FFFD characters do not reclassify the file.
 */
export function decodeSourceBytes(bytes: Uint8Array): DecodedSourceBytes {
  // The NUL check runs first (data-model.md § CustomizationFile): any NUL
  // byte makes the file binary and diagnostic-only, so no decoding, BOM
  // handling, or replacement is attempted on binary input.
  if (bytes.includes(0x00)) {
    return { encoding: 'binary' };
  }
  const hadLeadingBom =
    bytes.length >= 3 &&
    bytes[0] === UTF8_BOM[0] &&
    bytes[1] === UTF8_BOM[1] &&
    bytes[2] === UTF8_BOM[2];
  const body = hadLeadingBom ? bytes.subarray(3) : bytes;
  // ignoreBOM keeps any further U+FEFF in the text: exactly one leading BOM
  // is removed, by this function, before decoding.
  // The fatal call is only a validity probe: the replacement decode below
  // is the one semantic decode pass the spec fixes — no charset guessing,
  // alternate encoding, sampling, or truncation. Detecting replacement
  // without the probe would mean hand-rolling a UTF-8 validator
  // (Buffer.isUtf8 is Node-only and this module is platform-neutral).
  let replaced = false;
  let sourceText: string;
  try {
    sourceText = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(body);
  } catch {
    replaced = true;
    sourceText = new TextDecoder('utf-8', { fatal: false, ignoreBOM: true }).decode(body);
  }
  // The encoding is orthogonal to BOM presence, which `hadLeadingBom`
  // records on its own. Replacement-decoded text stays readable — charset
  // guessing, alternate decoding, and truncation are deliberately
  // unrepresentable here.
  const encoding = replaced ? 'utf-8-replaced' : 'utf-8';
  return { encoding, hadLeadingBom, sourceText };
}

/**
 * How a Source root was selected (FR-001, FR-013):
 *  - 'process-cwd'  the one captured invocation cwd (no --cwd given)
 *  - 'cwd-option'   the validated --cwd value
 *  - 'default-home' a Global root derived from homedir + the tool's fixed
 *                   suffix because its environment setting was absent
 *  - 'environment'  a Global root taken from the captured tool-home
 *                   environment variable
 */
export type SourceBoundaryOrigin = 'process-cwd' | 'cwd-option' | 'default-home' | 'environment';

/** The non-authorizing public presentation of a Source root (FR-002). */
export interface SourceBoundaryDto {
  /** Injective display-only escaping of the root; never decoded for I/O. */
  readonly displayRoot: string;
  /** How the root was selected; see {@link SourceBoundaryOrigin}. */
  readonly origin: SourceBoundaryOrigin;
}

/**
 * Builds the exact non-authorizing public boundary: the one-way escaped
 * presentation of the selected root plus the closed origin discriminator.
 * It is not a SourceRelativePath, grants no read authority, and never
 * carries the canonical root or internal context.
 */
export function createSourceBoundaryDto(
  lexicalRoot: string,
  origin: SourceBoundaryOrigin,
): SourceBoundaryDto {
  return { displayRoot: encodeRootPresentation(lexicalRoot), origin };
}

/**
 * RootPresentationEncoding: deterministic, injective, display-only escaping
 * over exact UTF-16 code units. ASCII letters, digits, and `.`, `/`, `:`,
 * `_`, `-` are copied; every other code unit — including each half of a
 * surrogate pair — becomes `\uXXXX` with four uppercase hex digits. Because
 * backslash is never copied, the mapping is injective.
 */
export function encodeRootPresentation(value: string): string {
  let encoded = '';
  for (let index = 0; index < value.length; index += 1) {
    const unit = value.charCodeAt(index);
    const isAsciiLetter = (unit >= 0x41 && unit <= 0x5a) || (unit >= 0x61 && unit <= 0x7a);
    const isAsciiDigit = unit >= 0x30 && unit <= 0x39;
    const isSafePunctuation =
      unit === 0x2e || unit === 0x2f || unit === 0x3a || unit === 0x5f || unit === 0x2d;
    if (isAsciiLetter || isAsciiDigit || isSafePunctuation) {
      encoded += value[index];
    } else {
      encoded += `\\u${unit.toString(16).toUpperCase().padStart(4, '0')}`;
    }
  }
  return encoded;
}

/**
 * Closed evidence completeness enum (spec.md QR-005):
 *  - 'documented'            the cited official sections fully establish the
 *                            maintained assertion
 *  - 'partially-documented'  they establish part but not all of it
 *  - 'unknown'               they establish no determination for it
 *  - 'conflict'              retained official assertions are incompatible
 */
export type DocumentationStatus = 'documented' | 'partially-documented' | 'unknown' | 'conflict';

/**
 * Upstream lifecycle claims for an assertion (spec.md QR-005). An empty
 * qualifier list means only that no claim is made — never 'stable'.
 */
export type LifecycleQualifier = 'preview' | 'experimental' | 'deprecated';

/**
 * Fixed presentation order for lifecycle qualifiers. The order is part of
 * the contract so two records with the same qualifiers always render and
 * serialize identically. There is deliberately no `stable` qualifier: the
 * absence of qualifiers is not evidence of stability, and fabricating
 * `stable` would turn missing documentation into a positive claim.
 */
export const LIFECYCLE_QUALIFIER_ORDER: readonly LifecycleQualifier[] = [
  'preview',
  'experimental',
  'deprecated',
];

/** Rejects duplicates and re-sorts qualifiers into the fixed contract order. */
export function normalizeLifecycleQualifiers(
  qualifiers: readonly LifecycleQualifier[],
): LifecycleQualifier[] {
  const seen = new Set<LifecycleQualifier>();
  for (const qualifier of qualifiers) {
    if (seen.has(qualifier)) {
      throw new TypeError(`duplicate lifecycle qualifier: ${qualifier}`);
    }
    seen.add(qualifier);
  }
  return LIFECYCLE_QUALIFIER_ORDER.filter((qualifier) => seen.has(qualifier));
}

/**
 * What an EvidenceAssessment is about (contracts/inspection-path-allowlist.md
 * § identifier ownership): 'behavior' = a documented vendor behavior
 * statement, 'rule' = an Inspector policy rule, 'strategy' = a runtime
 * composition/projection strategy.
 */
export type EvidenceSubjectKind = 'behavior' | 'rule' | 'strategy';

/**
 * The atomic evidence state for one behavior/rule/strategy subject
 * (spec.md QR-005).
 */
export interface EvidenceAssessment {
  /** What kind of subject is assessed; see {@link EvidenceSubjectKind}. */
  readonly subjectKind: EvidenceSubjectKind;
  /** The exact assessed behavior/rule/strategy ID (QR-005). */
  readonly subjectId: string;
  /** How completely official sources establish the assertion (QR-005). */
  readonly documentationStatus: DocumentationStatus;
  /** Duplicate-free upstream lifecycle claims in the fixed order. */
  readonly lifecycleQualifiers: readonly LifecycleQualifier[];
}

/**
 * Builds the record-specific assessment list: exactly one sorted entry per
 * referenced subject with no scalar, worst-status, or qualifier-union
 * reduction — a reduction would hide which specific behavior, rule, or
 * strategy carries the weaker documentation state. The closed
 * {@link DocumentationStatus} union keeps the legacy `documentation-conflict`
 * alias of `conflict` unrepresentable.
 */
export function buildEvidenceAssessments(
  assessments: readonly EvidenceAssessment[],
): EvidenceAssessment[] {
  const seen = new Set<string>();
  const built = assessments.map((assessment) => {
    const key = `${assessment.subjectKind}\u0000${assessment.subjectId}`;
    if (seen.has(key)) {
      throw new TypeError(`duplicate evidence subject: ${assessment.subjectKind} ${assessment.subjectId}`);
    }
    seen.add(key);
    return {
      subjectKind: assessment.subjectKind,
      subjectId: assessment.subjectId,
      documentationStatus: assessment.documentationStatus,
      lifecycleQualifiers: normalizeLifecycleQualifiers(assessment.lifecycleQualifiers),
    };
  });
  built.sort((left, right) => {
    if (left.subjectKind !== right.subjectKind) {
      return left.subjectKind < right.subjectKind ? -1 : 1;
    }
    return left.subjectId < right.subjectId ? -1 : left.subjectId > right.subjectId ? 1 : 0;
  });
  return built;
}

/**
 * Server-generated opaque ID: URL-safe unpadded base64url randomness. The
 * 16-byte default yields the 22-character 128-bit IDs the DTOs document
 * (data-model.md § CustomizationFile). Uses Web Crypto, not node:crypto,
 * to keep this shared module importable by the client.
 */
export function createOpaqueId(byteLength = 16): string {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(byteLength));
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}
