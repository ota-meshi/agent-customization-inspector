// Public entity vocabulary shared by the host, CLI, and client: file
// encodings, the non-authorizing SourceBoundary presentation, root label
// encoding, the maintained documentation-status vocabulary, and opaque ID
// generation.
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
 * (data-model.md § ToolRecognition: recognitions are ordered by the closed
 * tool order, then the closed kind order, never by opaque ID — an opaque ID
 * carries no semantic display order).
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
  /** A skill entry point such as `SKILL.md`. */
  | 'skill'
  /** A custom-agent definition. */
  | 'agent'
  /** A lifecycle hook declaration. */
  | 'hook'
  /** An MCP server declaration carrier. */
  | 'MCP'
  /** A reusable prompt or slash command. */
  | 'prompt/command'
  /** One authored rule file: modular instructions a product loads into context. */
  | 'rule'
  /** A settings or configuration carrier. */
  | 'settings/config'
  /** A policy deciding which commands or tools a product may run. */
  | 'permissions'
  /** An output-style definition. */
  | 'output style'
  /** A plugin manifest. */
  | 'plugin'
  /** A plugin marketplace catalog. */
  | 'marketplace'
  /** Skill-local metadata beside a `SKILL.md`. */
  | 'skill metadata';

/**
 * The closed presentation order of {@link CustomizationKind}: the order the
 * kind tabs are laid out in, and the secondary recognition sort key after
 * {@link SUPPORTED_TOOL_ORDER} (data-model.md § ToolRecognition requires a
 * closed kind order and forbids sorting by opaque ID; which order it is, is
 * this constant's own decision).
 *
 * It is a reading order rather than a derived one — no rule turns a kind into
 * a rank — so it is authored here once and {@link CustomizationKind} is
 * declared in the same order, leaving no second sequence to disagree with it.
 */
export const CUSTOMIZATION_KIND_ORDER: readonly CustomizationKind[] = [
  /** Instruction files sort first. */
  'instructions',
  /** Skills follow instructions. */
  'skill',
  /** Custom agents follow skills. */
  'agent',
  /** Hooks follow custom agents. */
  'hook',
  /** MCP carriers follow hooks. */
  'MCP',
  /** Prompts and commands follow MCP carriers. */
  'prompt/command',
  /** Rule files follow prompts and commands. */
  'rule',
  /** Settings and config carriers follow rule files. */
  'settings/config',
  /** Permission policies follow the settings that can carry them. */
  'permissions',
  /** Output styles follow permission policies. */
  'output style',
  /** Plugin manifests follow output styles. */
  'plugin',
  /** Marketplace catalogs follow plugin manifests. */
  'marketplace',
  /** Skill metadata sorts last. */
  'skill metadata',
];

/**
 * Whether an untyped value is one of the closed customization kinds.
 *
 * A predicate rather than a membership test followed by an assertion: the
 * comparison is what proves the type, so nothing has to be told. The value
 * arrives from outside the closed catalog — a `?kind=` query the reader typed
 * — and anything the catalog does not name is simply not a kind.
 */
export function isCustomizationKind(value: unknown): value is CustomizationKind {
  return typeof value === 'string' && CUSTOMIZATION_KIND_ORDER.some((kind) => kind === value);
}

/**
 * Whether an untyped value is one of the supported tools.
 *
 * A predicate for the same reason as {@link isCustomizationKind}: a filter
 * control hands back the raw text of the option the reader chose, and the
 * comparison against the closed catalog is what makes it a tool.
 */
export function isSupportedTool(value: unknown): value is SupportedTool {
  return typeof value === 'string' && SUPPORTED_TOOL_ORDER.some((tool) => tool === value);
}

/**
 * What a kind's rows are, in plural, for a sentence that counts them — the
 * kind's own row unit rather than "files", because a row is one file for some
 * kinds and one declaration inside a file for others (data-model.md
 * § Inventory unit). Separate from {@link CUSTOMIZATION_KIND_TEXT}, whose
 * values name the kind for a tab or a badge and cannot be pluralized by rule:
 * `Instructions` is already plural and `MCP` is neither.
 */
export const CUSTOMIZATION_KIND_PLURAL_TEXT: Readonly<Record<CustomizationKind, string>> = {
  /** Instruction rows are the files themselves. */
  instructions: 'instruction files',
  /** Rule rows are the files themselves. */
  rule: 'rule files',
  /** A skill row is one name as one tool resolves it. */
  skill: 'skills',
  /** An agent row is one custom-agent definition. */
  agent: 'custom agents',
  /** A prompt or command row is one name a reader invokes. */
  'prompt/command': 'prompts and commands',
  /** A hook row is one declaration. */
  hook: 'hook declarations',
  /** An MCP row is one server declared inside a carrier. */
  MCP: 'MCP servers',
  /** A settings or configuration row is the carrier file. */
  'settings/config': 'settings and configuration files',
  /** A permissions row is the file declaring the policy. */
  permissions: 'permission policies',
  /** An output-style row is one definition. */
  'output style': 'output styles',
  /** A plugin row is one manifest. */
  plugin: 'plugin manifests',
  /** A marketplace row is one catalog. */
  marketplace: 'marketplace catalogs',
  /** A skill-metadata row is one sibling metadata file. */
  'skill metadata': 'skill metadata files',
};

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
  'prompt/command': 'Prompt / Command',
  /** Label for a hook declaration. */
  hook: 'Hook',
  /** Label for an MCP declaration carrier. */
  MCP: 'MCP',
  /** Label for a settings or configuration carrier. */
  'settings/config': 'Settings / config',
  /** Label for a policy deciding which commands or tools may run. */
  permissions: 'Permissions',
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
   * Every same-name definition stays available — a nested one under a
   * directory-qualified command — and the product picks the variant matching
   * the files it is working on. Claude Code's documented rule for a clash
   * within one root.
   */
  | 'all-remain-context-selected'
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
  /** Label for a product that keeps all and picks by working context. */
  'all-remain-context-selected':
    'keeps all of them; a nested one is invoked by a directory-qualified name, and Claude picks the variant matching the files being worked on',
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
  /** At least one NUL byte: no source text; see FR-025 for when it is also a Diagnostic. */
  | 'binary'
  /** The read failed before any bytes could be classified. */
  | 'unknown';

/**
 * Whether a file's read yielded text this product can display and compare
 * (FR-025): the {@link ReadableFileEncoding} subset, which is exactly the
 * subset whose variants carry `sourceText`. A type predicate over any
 * encoding-discriminated shape, so a file union narrows to its readable
 * variants wherever the check passes. This is the one place the readable
 * subset is spelled as a check, so no surface's gate can fall out of step
 * with the classification it reads.
 */
export function isReadableFile<File extends { readonly encoding: FileEncoding }>(
  file: File,
): file is Extract<File, { readonly encoding: ReadableFileEncoding }> {
  return file.encoding === 'utf-8' || file.encoding === 'utf-8-replaced';
}

/** The label shown for each decode outcome; see {@link SOURCE_BOUNDARY_ORIGIN_TEXT}. */
export const FILE_ENCODING_TEXT: Readonly<Record<FileEncoding, string>> = {
  /** Decoded as UTF-8 without replacement. */
  'utf-8': 'Readable text',
  /** Decoded once with replacement; the complete text is still available. */
  'utf-8-replaced': 'Readable text (decoded with replacement characters)',
  /** A NUL byte left the file with no source text. */
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
      /** At least one NUL byte: no text, no BOM concept. */
      readonly encoding: 'binary';
    };

const UTF8_BOM = [0xef, 0xbb, 0xbf];

/**
 * Decodes verified source bytes exactly once. Any NUL byte is binary — what
 * that classification means for the file is the publisher's split between an
 * admitted candidate and a census-listed companion (FR-025), not this
 * decoder's. Otherwise the bytes decode with UTF-8 replacement
 * semantics: one leading BOM is recorded and removed, any inserted U+FFFD
 * yields `utf-8-replaced`, and the complete (possibly garbled) text stays
 * readable. Literal authored U+FFFD characters do not reclassify the file.
 */
export function decodeSourceBytes(bytes: Uint8Array): DecodedSourceBytes {
  // The NUL check runs first (data-model.md § CustomizationFile): any NUL
  // byte makes the file binary, so no decoding, BOM
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
  // (`isUtf8` from `node:buffer` is Node-only and this module is platform-neutral).
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

/**
 * Control-character presentation escaping for authored path text
 * (data-model.md § SourceRelativePath: "Presentation escapes control and
 * bidirectional formatting characters without changing the stored value").
 * Escaped, as uppercase `\uXXXX`:
 *
 * - Unicode `Cc` code points — C0, DEL, C1 — which have no glyph of their own.
 * - The bidirectional formatting characters U+061C, U+200E, U+200F,
 *   U+202A–U+202E, and U+2066–U+2069. These reorder the characters around
 *   them, so a path containing one renders as a *different* path: an entry
 *   named `report\u202Egnp.md` reads as `report<RLO>gnp.md` reversed into
 *   `reportdm.gnp`. A path that is the lookup and selection identity must read
 *   as what it is, and a reader comparing it against their own directory has
 *   no way to see the character that moved it.
 * - The line and paragraph separators U+2028 and U+2029, which draw nothing
 *   and split the text they sit in — U+2029 starts a new bidi paragraph, so a
 *   caller wrapping this function's output in isolates would find the pair
 *   split across two paragraphs and the second one free of the first's scope.
 * - A backslash, as `\u005C`, so the mapping is injective: without it, a name
 *   containing a real U+000A and a different name containing the six literal
 *   characters `\u000A` would render identically, and both can exist in one
 *   directory.
 * - A lone surrogate, which strict JSON's `"\uD800"` escape resolves to and a
 *   browser draws as the one replacement glyph: two names differing only in
 *   which surrogate they carry would render identically. Under the `u` flag
 *   the class matches only an unpaired surrogate — a well-formed pair is one
 *   code point outside it — so astral characters render as themselves.
 * - A default-ignorable code point — U+200B, U+00AD, U+FEFF, the variation
 *   selectors — which draws nothing at all, so a name carrying one reads as
 *   the name without it. This is the same reason the bidi and surrogate rows
 *   exist, and escaping it here is what makes every surface drawing an
 *   authored identity — a row's name, a heading, a comparison cell — keep two
 *   such names apart without a note of its own.
 *
 * Every other character, spaces included, renders as itself, because the
 * authored spelling is the path's presentation identity. Whitespace is the one
 * ambiguity left, and it is left deliberately: a space is a character a reader
 * recognizes, so the surfaces that would collapse it spell the whole value out
 * instead ({@link inlinePresentationLabel}). Distinct from
 * {@link encodeRootPresentation}, which escapes everything outside a small
 * ASCII set: a root label must be unambiguous on its own, while a path stays
 * readable and only its ambiguous characters need a visible spelling.
 */
export function escapeControlCharacters(value: string): string {
  return value.replaceAll(
    // eslint-disable-next-line no-control-regex -- matching the Cc range is this function's purpose
    /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uD800-\uDFFF\\]|\p{Default_Ignorable_Code_Point}/gu,
    (character) => `\\u${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
  );
}

/**
 * One applicability range as presentation text (data-model.md § Inventory
 * unit): the same control-character escaping every published path gets, minus
 * the backslash.
 *
 * A range is a glob, and its backslashes are the glob's own syntax — the
 * escape a derived range puts in front of a directory name's `[`, `*`, or
 * `!`. Sending it through {@link escapeControlCharacters} would rewrite each
 * of those and show a pattern nobody wrote. The characters that cannot be
 * shown as themselves are still escaped, so a range spanning lines cannot read
 * as two.
 *
 * The spelled-out fallback below is what a declared range needs and a derived
 * one never does. A derived range is built from directory names and a `*`, so
 * it always has a character that draws; a range a file declares for itself is
 * arbitrary authored text, and one written entirely from spaces or
 * default-ignorable code points would leave its row with neither visible text
 * nor an accessible name — the same failure {@link pathPresentationLabel}
 * exists to prevent, resolved the same way, because a row identified by
 * nothing identifies nothing.
 *
 * An authored backslash that spells this function's own escape introducer —
 * `\u` followed by four hex digits — is escaped first, so a range containing
 * the literal six characters `\u000A` and one containing a real U+000A render
 * differently instead of as one text. Only that shape: every other backslash
 * is glob syntax and stays exactly as written.
 */
export function applicabilityRangePresentation(value: string): string {
  const escaped = value.replaceAll(/\\(?=u[0-9A-Fa-f]{4})/gu, '\\u005C').replaceAll(
    // eslint-disable-next-line no-control-regex -- matching the Cc range is this function's purpose
    /[\u0000-\u001F\u007F-\u009F\u061C\u200E\u200F\u2028\u2029\u202A-\u202E\u2066-\u2069\uD800-\uDFFF]/gu,
    (character) => `\\u${character.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
  );
  return rendersNothingVisible(escaped) ? encodeRootPresentation(value) : escaped;
}

/**
 * Whether a label would render as nothing: it has no character that draws.
 *
 * Whitespace is the obvious case, but not the only one — U+200B, U+FEFF, and
 * U+00AD are default-ignorable rather than whitespace, so `String.trim` keeps
 * them and a name made of them is a name the reader cannot see. Raw control
 * characters (`Cc`) draw nothing either: a JSON `"\u0000"` resolves to a NUL
 * the surfaces render glyphlessly, so a declared value or key made only of
 * them needs the same spelled-out note — the path labels never see one raw,
 * because {@link escapeControlCharacters} runs before this test there.
 * Callers use
 * this as a renderability test, never to change what is stored or displayed: a
 * heading falls back to another true label, and a path label is spelled out in
 * full, but the authored value itself stays exactly as authored (FR-025).
 */
export function rendersNothingVisible(value: string): boolean {
  return value.replaceAll(/[\s\p{Cc}\p{Default_Ignorable_Code_Point}]/gu, '') === '';
}

/**
 * One authored path or entry name as the text a surface draws for it: the
 * escaped spelling ({@link escapeControlCharacters}), or the completely
 * spelled-out root presentation when that spelling would still draw nothing
 * (data-model.md § SourceRelativePath). A label that renders as nothing leaves
 * the row or link carrying it with neither visible text nor an accessible
 * name, so it is spelled out entirely, the way a root label is, because it
 * then has to be unambiguous on its own.
 *
 * Escaping alone cannot reach that: it spells out every character that draws
 * nothing, but it leaves a space a space. What reaches it is a value whose
 * every character is whitespace. For a whole Source-relative Path that means a
 * single segment — `/` draws, so every nested path keeps one visible
 * character — and a repository gets there through a Codex configured fallback
 * basename, an entry name the walk compares that no character grammar
 * constrains. A tree label is one entry name rather than a path, so any depth
 * can reach it.
 *
 * Distinct from {@link inlinePresentationLabel}, which additionally spells out
 * a value whose whitespace a surface would collapse; here the authored
 * whitespace renders as authored wherever the drawing surface preserves it.
 */
export function pathPresentationLabel(value: string): string {
  const escaped = escapeControlCharacters(value);
  return rendersNothingVisible(escaped) ? encodeRootPresentation(value) : escaped;
}

/**
 * One authored value as a single-line label for a surface that normalizes
 * whitespace — a native `<option>`'s text, an accessible name (FR-025): the
 * escaped spelling, or the completely spelled-out root presentation when
 * that spelling would render as nothing or ambiguously — through leading,
 * trailing, or consecutive whitespace — so two values differing only in the
 * whitespace this surface collapses never read as one label. Whitespace is the
 * whole of what it adds: every character that draws nothing at all is already
 * spelled out by the escaping ({@link escapeControlCharacters}). The predicate
 * is a character-class test only: an authored value that happens
 * to spell a product phrase stays as authored, because matching this
 * product's own copy against authored text would turn display wording into
 * load-bearing syntax, and the complete source beside every surface keeps
 * the exact spelling.
 */
export function inlinePresentationLabel(value: string): string {
  const escaped = escapeControlCharacters(value);
  return rendersNothingVisible(escaped) || /^\s|\s{2,}|\s$/u.test(escaped)
    ? encodeRootPresentation(value)
    : escaped;
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
