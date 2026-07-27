// Public entity vocabulary shared by the host, CLI, and client: file
// encodings, the non-authorizing SourceBoundary presentation, root label
// encoding, evidence-assessment vocabulary, and opaque ID generation.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.

/**
 * The closed set of supported AI agents (spec.md FR-004,
 * contracts/official-sources.md). The same identifiers attribute repository
 * files at recognition time and own the per-tool Global Sources.
 */
export type SupportedTool =
  /** GitHub Copilot. */
  | 'copilot'
  /** Claude Code. */
  | 'claude'
  /** OpenAI Codex. */
  | 'codex';

/**
 * The closed presentation order of {@link SupportedTool}
 * (contracts/http-api.md § get-session: "Recognition arrays use the shipped
 * closed tool order, then the shipped closed kind order, with no opaque ID
 * tie-break"). Opaque IDs are regenerated every generation, so they must
 * never supply a sort order.
 */
export const SUPPORTED_TOOL_ORDER: readonly SupportedTool[] = [
  /** Copilot recognitions sort first. */
  'copilot',
  /** Claude recognitions sort after Copilot. */
  'claude',
  /** Codex recognitions sort last. */
  'codex',
];

/**
 * The closed customization-kind catalog shared by every tool
 * (data-model.md § ToolRecognition). The spellings are the exact
 * `ToolRecognition.kind` wire values fixed by the vendors' Presentation
 * Allowlist tables; a kind is shared vocabulary even though each recognizer
 * owns its own path and interpretation rules.
 */
export type CustomizationKind =
  /** An agent instruction file such as `AGENTS.md`. */
  | 'instructions'
  /** One authored rule file. */
  | 'rule'
  /** A skill entry point such as `SKILL.md`. */
  | 'skill'
  /** A custom-agent definition. */
  | 'agent'
  /** A reusable prompt or slash command. */
  | 'prompt/command'
  /** A lifecycle hook declaration. */
  | 'hook'
  /** An MCP server declaration carrier. */
  | 'MCP'
  /** A settings or configuration carrier. */
  | 'settings/config'
  /** An output-style definition. */
  | 'output style'
  /** A plugin manifest. */
  | 'plugin'
  /** A plugin marketplace catalog. */
  | 'marketplace'
  /** Skill-local metadata beside a `SKILL.md`. */
  | 'skill metadata';

/**
 * The closed presentation order of {@link CustomizationKind}, exactly as the
 * kind catalog is listed in data-model.md § ToolRecognition. It is the
 * secondary recognition sort key after {@link SUPPORTED_TOOL_ORDER}.
 */
export const CUSTOMIZATION_KIND_ORDER: readonly CustomizationKind[] = [
  /** Instruction files sort first. */
  'instructions',
  /** Rule files follow instructions. */
  'rule',
  /** Skills follow rules. */
  'skill',
  /** Custom agents follow skills. */
  'agent',
  /** Prompts and commands follow agents. */
  'prompt/command',
  /** Hooks follow prompts and commands. */
  'hook',
  /** MCP carriers follow hooks. */
  'MCP',
  /** Settings and config carriers follow MCP. */
  'settings/config',
  /** Output styles follow settings and config. */
  'output style',
  /** Plugin manifests follow output styles. */
  'plugin',
  /** Marketplace catalogs follow plugin manifests. */
  'marketplace',
  /** Skill metadata sorts last. */
  'skill metadata',
];

/** The label shown for each kind; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}. */
export const CUSTOMIZATION_KIND_TEXT: Readonly<Record<CustomizationKind, string>> = {
  /** Label for an instruction file. */
  instructions: 'Instructions',
  /** Label for a rule file. */
  rule: 'Rule',
  /** Label for a skill entry point. */
  skill: 'Skill',
  /** Label for a custom-agent definition. */
  agent: 'Agent',
  /** Label for a prompt or slash command. */
  'prompt/command': 'Prompt / command',
  /** Label for a hook declaration. */
  hook: 'Hook',
  /** Label for an MCP declaration carrier. */
  MCP: 'MCP',
  /** Label for a settings or configuration carrier. */
  'settings/config': 'Settings / config',
  /** Label for an output-style definition. */
  'output style': 'Output style',
  /** Label for a plugin manifest. */
  plugin: 'Plugin',
  /** Label for a marketplace catalog. */
  marketplace: 'Marketplace',
  /** Label for skill-local metadata. */
  'skill metadata': 'Skill metadata',
};

/** The label shown for each tool; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}. */
export const SUPPORTED_TOOL_TEXT: Readonly<Record<SupportedTool, string>> = {
  /** Label for GitHub Copilot. */
  copilot: 'GitHub Copilot',
  /** Label for Claude Code. */
  claude: 'Claude Code',
  /** Label for OpenAI Codex. */
  codex: 'OpenAI Codex',
};

/**
 * How a product resolves a skill name that several definitions declare
 * (contracts/runtime-composition.md). A grouped inventory row publishes this
 * instead of ordering its definitions, because the Inspector states what the
 * vendors state and no more (FR-007).
 */
export type SameNameSkillResolution =
  /**
   * Every same-name definition stays available and none is merged away; the
   * cited section documents no order among the scopes, so none is claimed.
   */
  | 'all-remain'
  /** The first definition in the product's documented source order wins. */
  | 'select-first'
  /**
   * The product's surfaces do not agree, so no single statement is true of it:
   * Copilot's CLI resolves the first in a documented order while VS Code and
   * Cloud document no duplicate precedence at all.
   */
  | 'surface-dependent';

/**
 * The sentence shown for each resolution; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}.
 * Each states what the product documents and never which definition wins here.
 */
export const SAME_NAME_SKILL_RESOLUTION_TEXT: Readonly<Record<SameNameSkillResolution, string>> = {
  /** Label for a product that keeps every same-name definition. */
  'all-remain': 'keeps all of them, in no documented order',
  /** Label for a product with a documented source order. */
  'select-first': 'uses the first in its documented source order',
  /** Label for a product whose surfaces do not agree. */
  'surface-dependent': 'depends on the surface; no single documented rule',
};

/**
 * The readable subset of the decode classification
 * (spec.md § Byte Decode Outcomes).
 */
export type ReadableFileEncoding =
  /** The bytes decoded as UTF-8 without replacement. */
  | 'utf-8'
  /** Invalid UTF-8 decoded once with replacement while remaining readable (FR-025). */
  | 'utf-8-replaced';

/**
 * Complete decode classification per spec.md § Byte Decode Outcomes,
 * orthogonal to BOM presence, which `hadLeadingBom` records separately.
 */
export type FileEncoding =
  /** Readable text, with or without replacement; see {@link ReadableFileEncoding}. */
  | ReadableFileEncoding
  /** At least one NUL byte made the file diagnostic-only with no source text. */
  | 'binary'
  /** The read failed before any bytes could be classified. */
  | 'unknown';

/** The label shown for each decode outcome; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}. */
export const FILE_ENCODING_TEXT: Readonly<Record<FileEncoding, string>> = {
  /** Decoded as UTF-8 without replacement. */
  'utf-8': 'Readable text',
  /** Decoded once with replacement; the complete text is still available. */
  'utf-8-replaced': 'Readable text (decoded with replacement characters)',
  /** A NUL byte made the file diagnostic-only. */
  binary: 'Binary — recorded without source text',
  /** The read failed before the bytes could be classified. */
  unknown: 'Could not be read',
};

/**
 * Result of the single decode pass (spec.md § Byte Decode Outcomes),
 * discriminated by `encoding` so the impossible combinations are
 * unrepresentable: binary input carries no text and no BOM record — the NUL
 * check precedes BOM handling, so a BOM concept does not exist for binary
 * bytes — while readable input always carries complete text.
 */
export type DecodedSourceBytes =
  /** A readable UTF-8 result with complete source text and its BOM record. */
  | {
      /** Readable decode classification; see {@link FileEncoding}. */
      readonly encoding: ReadableFileEncoding;
      /** Whether one leading UTF-8 BOM was recorded and removed (FR-025). */
      readonly hadLeadingBom: boolean;
      /** Complete decoded text; never null for readable input. */
      readonly sourceText: string;
    }
  /** A NUL-containing binary result with no readable text or BOM concept. */
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

/** How a Source root was selected (FR-001, FR-013). */
export type SourceBoundaryOrigin =
  /** The one invocation working directory captured when `--root` was omitted. */
  | 'process-cwd'
  /** The validated explicit `--root` selection. */
  | 'root-option'
  /** A tool's fixed Global suffix below the default home directory. */
  | 'default-home'
  /** A Global root selected from the tool's captured home environment variable. */
  | 'environment';

/**
 * The label shown for each origin. It sits beside the union so a new origin
 * cannot compile without its text, the same way {@link DIAGNOSTIC_REGISTRY}
 * fixes a diagnostic's message: the closed vocabulary and how it reads are
 * one decision, not two files (a client message catalog would split it in two).
 */
export const SOURCE_BOUNDARY_ORIGIN_TEXT: Readonly<Record<SourceBoundaryOrigin, string>> = {
  /** Label for the invocation working-directory origin. */
  'process-cwd': 'invocation working directory',
  /** Label for the explicit `--root` origin. */
  'root-option': '--root option',
  /** Label for a tool root derived below the default home. */
  'default-home': 'default home directory',
  /** Label for a tool root supplied by an environment variable. */
  environment: 'environment variable',
};

/** A Source's operational overlay status (data-model.md § Source). */
export type SourceStatus =
  /** Bootstrapped with no scan admitted yet. */
  | 'idle'
  /** An admitted scan is in flight. */
  | 'scanning'
  /** The Global disable barrier is draining this Source. */
  | 'disabling'
  /** The last committed scan completed without a file-confined diagnostic. */
  | 'ready'
  /** The last committed scan retained at least one file-confined diagnostic. */
  | 'partial'
  /** The last attempt failed while any prior committed snapshot was retained. */
  | 'failed';

/** The label shown for each status; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}. */
export const SOURCE_STATUS_TEXT: Readonly<Record<SourceStatus, string>> = {
  /** Label for a bootstrapped Source with no admitted scan. */
  idle: 'Idle',
  /** Label for a Source whose admitted scan is in flight. */
  scanning: 'Scanning',
  /** Label for a Global Source draining behind the disable barrier. */
  disabling: 'Disabling',
  /** Label for a Source whose latest commit was complete. */
  ready: 'Ready',
  /** Label for a Source whose latest commit retained file-confined diagnostics. */
  partial: 'Partial',
  /** Label for a Source whose latest attempt failed. */
  failed: 'Failed',
};

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

/** Closed evidence-completeness enum (spec.md QR-005). */
export type DocumentationStatus =
  /** The cited official sections fully establish the maintained assertion. */
  | 'documented'
  /** The cited official sections establish part but not all of the assertion. */
  | 'partially-documented'
  /** The cited official sections establish no determination for the assertion. */
  | 'unknown'
  /** Retained official assertions are incompatible. */
  | 'conflict';

/**
 * Upstream lifecycle claims for an assertion (spec.md QR-005). An empty
 * qualifier list means only that no claim is made — never 'stable'.
 */
export type LifecycleQualifier =
  /** Upstream documents the subject as preview. */
  | 'preview'
  /** Upstream documents the subject as experimental. */
  | 'experimental'
  /** Upstream documents the subject as deprecated. */
  | 'deprecated';

/**
 * Fixed presentation order for lifecycle qualifiers. The order is part of
 * the contract so two records with the same qualifiers always render and
 * serialize identically. There is deliberately no `stable` qualifier: the
 * absence of qualifiers is not evidence of stability, and fabricating
 * `stable` would turn missing documentation into a positive claim.
 */
export const LIFECYCLE_QUALIFIER_ORDER: readonly LifecycleQualifier[] = [
  /** Preview claims render first. */
  'preview',
  /** Experimental claims render after preview. */
  'experimental',
  /** Deprecation claims render last. */
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
 * What an EvidenceAssessment is about
 * (contracts/inspection-path-allowlist.md § identifier ownership).
 */
export type EvidenceSubjectKind =
  /** A documented vendor-behavior statement. */
  | 'behavior'
  /** An Inspector policy rule. */
  | 'rule'
  /** A runtime composition or projection strategy. */
  | 'strategy';

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
