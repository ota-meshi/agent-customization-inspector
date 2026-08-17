// Vendor-neutral candidate recognition (T066, generalized by T136, made
// multi-vendor by T163). A recognizer answers two questions about an
// already-admitted candidate: what is this file, as far as the shipped
// contract records, and what name does it declare for itself? The answers'
// shapes — and the one engine that assembles them — are shared by every
// vendor, so they live here; what varies per vendor is only which admissions
// it owns, selected by its tool literal. One engine rather than one copy per
// vendor, because the merge, census, ordering, and failure rules it encodes
// are contract behavior (data-model.md § ToolRecognition) that must not drift
// between products.
//
// One call recognizes one candidate for every dispatched tool at once, which
// is what keeps the census a per-candidate fact: `.agents/skills/` is both a
// Codex and a Copilot location and `.claude/skills/` both a Claude and a
// Copilot one, so one physical file routinely carries two vendors' admissions,
// and a per-vendor entry point would enumerate the same directory once per
// recognizing product.
//
// A skill's declarations are read out as the file wrote them (FR-007): every
// declared key in authored order, plus the instructions left once the block is
// removed. The declared name leads because it seeds the resolved name the
// grouped inventory row is keyed by and the heading a detail page shows —
// authored when declared, the skill directory otherwise — and the authored
// value is not recoverable from the path: a skill's `name` need not match its
// directory.
// No value is captioned, classified, or explained: what a key means is the
// vendor's documentation, not this product's.
//
// The engine opens no file. Every authored value it lifts comes out of source
// the scan already read and handed it. It does enumerate one directory — the
// census the recognized kind calls for (companion-census.ts) — because being a
// directory is part of what a skill *is*, and the recognizer is the one place
// that already holds both the recognized kind and the candidate's path. The
// census reads nothing either: it reports which files accompany the candidate
// and where they are — returned beside the recognitions for the inventory
// definition to publish once — and the scan reads them through the one read
// path every published file goes through.
//
// Recognition is deliberately not a claim about the vendor's runtime. An
// admission proves only that an authored file exists at an allowlisted
// location inside the enabled boundary
// (contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary), which is why no published field says a product would install,
// enable, trust, select, or load it.
import type { CompiledInspectionRule, SelectorOrigin } from '../rules/registry';
import { RecognitionExtraction } from '../parsers/extraction';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import { listCompanionFiles, type CompanionFile } from '../companion-census';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import type {
  FrontmatterEntryDto,
  FrontmatterKeyKind,
  FrontmatterValueDto,
  RecognitionParseStatus,
} from '../../../shared/api-types';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleDiscoveryClass } from '../../../shared/registries/rule-types';

/**
 * One rule/path admission behind a recognition
 * (data-model.md § ToolRecognition `provenances`). Admissions are retained
 * separately rather than collapsed into a recognition-level winner, because
 * two rules admitting the same physical file are two authorizations, and a
 * winner would say one of them did not happen. Internal to the committed
 * generation: no session response carries an admission, and the record exists
 * for the relationship phases that will read it.
 *
 * A class holding the compiled rule rather than a transcription of its
 * fields: which rule authorized the read is the rule's own fact, so the two
 * published identifiers are derived where they are read instead of copied
 * into a shape that could drift from it.
 */
export class CandidateProvenance {
  /** The compiled rule whose plan admitted the candidate; the source of both getters. */
  readonly #compiled: CompiledInspectionRule;

  /** The admitted Source-relative Path, spelled with the exact entry names. */
  public readonly matchedPath: string;

  /** Binds one admission to the rule that authorized it and the path it matched. */
  public constructor(compiled: CompiledInspectionRule, matchedPath: string) {
    this.#compiled = compiled;
    this.matchedPath = matchedPath;
  }

  /**
   * The inspection rule that admitted the candidate, from the closed catalog
   * rather than an arbitrary string, so the ID resolves the immutable registry
   * record that authorized the read (contracts/inspection-path-allowlist.md
   * § Read authorization).
   */
  public get ruleId(): RuleId {
    return this.#compiled.rule.ruleId;
  }

  /** How that rule creates candidates; see {@link RuleDiscoveryClass}. */
  public get discoveryClass(): RuleDiscoveryClass {
    return this.#compiled.rule.discoveryClass;
  }
}

/**
 * The per-kind payload of a recognition: the kind itself plus whatever
 * identifies a recognition of that kind (data-model.md § ToolRecognition).
 *
 * It is one field rather than fields spread across the record because what
 * identifies a recognition differs by kind and does not fit a shared optional:
 * a skill declares a single `name`, while an MCP carrier declares one per
 * server. The kind lives here rather than beside this field so there is one
 * discriminant and no second copy that could disagree with it.
 */
export type RecognitionDetails =
  /** A skill, identified by the name authored in its own file. */
  | {
      /** The recognized customization kind. */
      readonly kind: 'skill';
      /**
       * The skill's own declared name as the parser resolved it under YAML
       * 1.2's core schema, or absent when the recognizer extracted none
       * (FR-007). Resolved, not sliced: an authored `name: 007` is the string
       * `7`, not the authored spelling (data-model.md § Field reading).
       *
       * It is the display label and the identity every inventory row's name
       * is built from (data-model.md § Inventory unit): a nested Claude Code
       * recognition's row prefixes it root-relative, and every other
       * recognition's row is named by it exactly. A file that declares none —
       * or declares it empty — is named by its skill directory instead.
       *
       * Absent, never empty: an authored empty string is a different fact from
       * no name at all, and collapsing them would report one as the other.
       */
      readonly declaredName?: string;
      /**
       * Every key the `SKILL.md` frontmatter declares, in authored order; the
       * source of the detail response's `presentation.frontmatter` (FR-007).
       * Empty when the file declares no frontmatter, and empty for a `failed`
       * extraction, which publishes nothing while the complete source stays
       * displayed (FR-028).
       */
      readonly frontmatter: readonly FrontmatterEntryDto[];
      /**
       * The `SKILL.md` with its frontmatter block removed: the source of the
       * detail response's `presentation.bodyText`. Empty for a `failed`
       * extraction: extraction is all-or-nothing (FR-028).
       */
      readonly bodyText: string;
    }
  /** Every other kind, until its recognizer phase gives it its own identity. */
  | {
      /** The recognized customization kind. */
      readonly kind: Exclude<CustomizationKind, 'skill'>;
    };

/**
 * One recognition: what one tool recognized in one file as one kind, carrying
 * the kind-discriminated {@link RecognitionDetails} that identify it. Exactly
 * one exists per `(file, tool, kind)`, and every rule admission behind it is
 * merged into `provenances` (data-model.md § ToolRecognition).
 *
 * Internal to the committed generation, never serialized to a client: the
 * inventory rows and the detail response are both projected from these — a
 * definition is one recognition's `(file, tool)` identity, and the detail's
 * `presentation` is one skill recognition's parse — so the record itself
 * carries no wire identity of its own. A class reached only through its two
 * factories, which fix how a record comes to be: {@link recognize} derives
 * the published fields from the kind's shared extraction and the admissions,
 * and {@link withDiagnostic} — the one later change a record takes, the scan
 * attaching its kind's extraction-failure reference — is a named derivation
 * rather than a spread copy.
 */
export class ToolRecognition {
  /**
   * The Source-relative Path of the file this recognition is attached to —
   * the file's identity (FR-030). Unique per Source; the shipped milestone
   * has one Source, and the Global tasks add the Source dimension when a
   * second one can hold the same path.
   */
  public readonly sourceRelativePath: string;

  /** The recognizing tool. */
  public readonly tool: SupportedTool;

  /** The kind and its per-kind identity; see {@link RecognitionDetails}. */
  public readonly details: RecognitionDetails;

  /**
   * Closed extraction state; see {@link RecognitionParseStatus}. `failed` is
   * all-or-nothing: a failed recognition publishes no declared name while its
   * file's complete source stays displayed (FR-028).
   */
  public readonly parseStatus: RecognitionParseStatus;

  /** Sorted non-empty rule/path admissions behind this recognition. */
  public readonly provenances: readonly CandidateProvenance[];

  /**
   * The extraction-failure Diagnostic of this recognition's kind (FR-028),
   * attached through {@link withDiagnostic}: one extraction per kind means
   * one record, shared by every recognition of that kind, and each inventory
   * definition republishes its own recognition's reference. Empty as
   * recognized — the recognizer never sees the ID the scan will mint.
   */
  public readonly diagnosticIds: readonly string[];

  /** Reached only through the factories, which fix how a record was made. */
  private constructor(
    sourceRelativePath: string,
    tool: SupportedTool,
    details: RecognitionDetails,
    parseStatus: RecognitionParseStatus,
    provenances: readonly CandidateProvenance[],
    diagnosticIds: readonly string[],
  ) {
    this.sourceRelativePath = sourceRelativePath;
    this.tool = tool;
    this.details = details;
    this.parseStatus = parseStatus;
    this.provenances = provenances;
    this.diagnosticIds = diagnosticIds;
  }

  /**
   * Builds one recognition from what the recognizer holds: the kind's shared
   * extraction and the rule admissions behind the record. The derivations
   * live here rather than at the call site so this factory is the one place
   * that says how a recognition's data comes to be (AGENTS.md § Class and
   * interface policy): the per-kind payload from the extraction's result,
   * the parse status from its outcome, and the provenances from the
   * admissions — ordered by admitting rule so two scans of the same tree
   * publish the same record, with the selector index breaking the tie for a
   * rule with several alternatives, because the index is the admission's and
   * no published field carries it.
   */
  public static recognize(
    sourceRelativePath: string,
    tool: SupportedTool,
    kind: CustomizationKind,
    extraction: RecognitionExtraction<SkillPresentation | undefined>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return new ToolRecognition(
      sourceRelativePath,
      tool,
      buildDetails(kind, extraction.extracted),
      extraction.status,
      admissions
        .toSorted((left, right) =>
          left.compiled.rule.ruleId !== right.compiled.rule.ruleId
            ? left.compiled.rule.ruleId < right.compiled.rule.ruleId
              ? -1
              : 1
            : left.origin.selectorIndex - right.origin.selectorIndex,
        )
        .map((admission) => new CandidateProvenance(admission.compiled, sourceRelativePath)),
      [],
    );
  }

  /**
   * The same recognition with its kind's extraction-failure reference
   * attached (FR-028). A named derivation for the scan — the one caller —
   * so the record type owns how its data changes instead of a spread copy
   * at the call site.
   */
  public withDiagnostic(diagnosticId: string): ToolRecognition {
    return new ToolRecognition(
      this.sourceRelativePath,
      this.tool,
      this.details,
      this.parseStatus,
      this.provenances,
      [...this.diagnosticIds, diagnosticId],
    );
  }
}

/**
 * What recognizing one candidate produced: its recognitions, and the files its
 * census found beside it.
 *
 * The companions travel back to the scan rather than being read here, because
 * the scan owns the closed per-file publication matrix — one read, one decode,
 * one closed outcome per file — and a recognizer that read them would be a
 * second place deciding what a read failure means.
 */
export interface CandidateRecognition {
  /** The recognitions attached to the candidate; possibly empty. */
  readonly recognitions: readonly ToolRecognition[];
  /** The accompanying files the candidate's census listed, for the scan to read and publish. */
  readonly companions: readonly CompanionSourceFile[];
}

/**
 * One accompanying file, addressed the way the scan publishes it.
 *
 * Distinct from a census result rather than the same record with a rewritten
 * field: a census names a path relative to the directory it walked, and this
 * names one relative to the Source. The class holds the census entry and the
 * candidate's own directory and derives the public address from them, so where
 * each half of an address came from is readable here rather than at whatever
 * call site assembled a copy.
 */
export class CompanionSourceFile {
  /**
   * The admitted candidate's own directory within the Source, with its
   * trailing slash — the census walked it, so every census-relative path is
   * relative to it.
   */
  readonly #candidateDirectory: string;

  /** The census entry itself. */
  readonly #listed: CompanionFile;

  /** Binds one census entry to the directory its paths are relative to. */
  public constructor(candidateDirectory: string, listed: CompanionFile) {
    this.#candidateDirectory = candidateDirectory;
    this.#listed = listed;
  }

  /**
   * The Source-relative Path; the public identity. Both halves are spelled
   * with the exact raw entry names, so concatenating them yields exactly the
   * public path the traversal would have derived (FR-024).
   */
  public get sourceRelativePath(): string {
    return `${this.#candidateDirectory}${this.#listed.censusRelativePath}`;
  }

  /** The census entry's own raw absolute path the scan reads from; never published. */
  public get absolutePath(): string {
    return this.#listed.absolutePath;
  }
}

/** One admitted candidate a recognizer is asked to classify. */
export interface RecognitionInput {
  /**
   * The admitted Source-relative Path, spelled with the exact entry names —
   * the file identity the recognitions attach to (FR-030).
   */
  readonly matchedPath: string;
  /**
   * Where the candidate actually is on disk. It is the filesystem operand a
   * census enumerates from, kept separate from `matchedPath` because a
   * display path is never decoded back into a filesystem operand (FR-024).
   */
  readonly absolutePath: string;
  /**
   * The Source's own root on disk. A census is contained within it: a skill
   * directory may itself be a link out of the tree, and the Source is the
   * boundary of what was authorized for inspection
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   */
  readonly sourceRoot: string;
  /** The rules that admitted the candidate, paired with their selector origins. */
  readonly admissions: readonly RecognitionAdmission[];
  /**
   * The file's complete decoded text. Always present: only a readable candidate
   * is recognized, so a binary or unreadable file reaches no recognizer. What
   * the recognition publishes out of this text is what the frontmatter parser
   * resolved, never a substring this module cuts for itself.
   */
  readonly sourceText: string;
}

/** One rule admission of a candidate, resolved from the traversal's origins. */
export interface RecognitionAdmission {
  /** The compiled rule whose plan admitted the candidate. */
  readonly compiled: CompiledInspectionRule;
  /** Which authored selector of that rule matched. */
  readonly origin: SelectorOrigin;
}

/**
 * What a `SKILL.md` reads as: the declarations it makes and the instructions
 * that follow them.
 *
 * The two are separated because they answer different questions — which skill
 * is this and what does it do, versus what it tells the product to do — and a
 * detail surface that showed only the raw file would leave the reader to find
 * the seam themselves.
 */
class SkillPresentation {
  /** The name the file declares, or undefined when it declares none. */
  public readonly declaredName: string | undefined;

  /** Every declared key in authored order; see {@link FrontmatterEntryDto}. */
  public readonly frontmatter: readonly FrontmatterEntryDto[];

  /** The document with its frontmatter block removed. */
  public readonly bodyText: string;

  /**
   * Reads one `SKILL.md` under the product's fixed YAML semantics: quoting and
   * escapes resolved, `007` read as `7`, a key declared twice resolved to its
   * later declaration (data-model.md § Field reading). Every shipped skill
   * contract reads the same `name` and `description` scalars, so the reading
   * lives once here.
   *
   * Throws for a present-but-unparseable frontmatter block;
   * {@link RecognitionExtraction.run} turns the throw into the recognition's
   * `failed` state while the complete readable source stays displayed
   * (FR-028).
   */
  public constructor(sourceText: string) {
    const document = new ParsedMarkdownDocument(sourceText);
    this.bodyText = document.body;
    // Only a mapping declares keys, and the parser hands one back as a `Map`
    // in the order the file wrote it. A block written as a list or a bare
    // scalar is not a mapping and declares nothing — reading index positions
    // out of one would show declarations its author cannot find in the file
    // (FR-025). Such a block is an ordinary file with no declarations; its
    // decoded source stays in the source viewer.
    const declared: ReadonlyMap<unknown, unknown> =
      document.frontmatter instanceof Map ? document.frontmatter : new Map();
    this.frontmatter = [...declared].map(([key, value]) => {
      const resolved = resolveDeclaredKey(key);
      return {
        key: resolved.text,
        keyKind: resolved.kind,
        value: renderDeclaredValue(value, []),
      };
    });
    // The name is the one declaration read out on its own, because it is the
    // identity an inventory row is grouped by and the heading a detail page
    // shows. Read from the parsed mapping rather than from the rendered
    // entries above: a one-item sequence renders one value too, and taking
    // that value would name a skill after the first item of a list the file
    // did not write as a name. Every other declaration, the description
    // included, is published once in `frontmatter` and read from there.
    this.declaredName = SkillPresentation.#scalarOf(declared, 'name');
  }

  /**
   * One declared key read as the text a product resolves it to, or undefined
   * when the key is absent or declares a list or mapping rather than a scalar.
   */
  static #scalarOf(declared: ReadonlyMap<unknown, unknown>, key: string): string | undefined {
    const value = declared.get(key);
    return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
      ? String(value)
      : undefined;
  }
}

/**
 * Resolves one declared key to the text a product resolves it to and the
 * parsed type that text came from (data-model.md § Field reading): a quoted
 * `"01"` stays `01`, and an unquoted `01` is the integer the core schema
 * resolves it to, exactly as the value on the other side of the colon would
 * be. The type is published with the text because the parser keeps a numeric
 * key apart from the string that spells it while both render identically,
 * and the comparison surface matches declarations by the parser's identity
 * rather than by the spelling alone (FR-011).
 *
 * A YAML key need not be a scalar — `? [a, b]` declares a list as a key — and
 * a list has no rendering as the name of a row. Such a block fails its
 * recognition all-or-nothing through {@link RecognitionExtraction.run}, the
 * same outcome as a value that contains itself, rather than being titled with
 * a spelling this product invented for it (FR-025, FR-028).
 */
function resolveDeclaredKey(key: unknown): { text: string; kind: FrontmatterKeyKind } {
  if (typeof key === 'string') {
    return { text: key, kind: 'string' };
  }
  if (typeof key === 'number') {
    return { text: String(key), kind: 'number' };
  }
  if (typeof key === 'boolean') {
    return { text: String(key), kind: 'boolean' };
  }
  if (key === null || key === undefined) {
    // `~:` and an empty key both resolve to null under the core schema;
    // `null` is that key written out, not a stand-in for a key this surface
    // could not read.
    return { text: 'null', kind: 'null' };
  }
  throw new TypeError('frontmatter declares a key that is not a scalar');
}

/**
 * Renders one declared value the way the detail surface shows it: the value
 * the parser resolved under YAML 1.2's core schema, in the shape the file
 * wrote it (data-model.md § Field reading).
 *
 * A mapping stays a mapping and a list stays a list, because a reader looking
 * at their own frontmatter is looking for what they wrote. Nothing is
 * flattened into a spelling the file does not contain, and nothing is
 * summarized away.
 *
 * `ancestors` are the container nodes on the path to this one. A YAML anchor
 * can refer to a node that contains it, which is a value with no rendering and
 * no JSON form; the throw reaches {@link RecognitionExtraction.run}, which
 * makes it this recognition's `failed` state while the complete readable
 * source stays displayed (FR-028).
 */
function renderDeclaredValue(value: unknown, ancestors: readonly object[]): FrontmatterValueDto {
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { kind: 'scalar', text: String(value) };
  }
  if (value === null || value === undefined) {
    return { kind: 'absent' };
  }
  if (typeof value !== 'object') {
    // A symbol or function cannot come out of a YAML parse; treating it as a
    // declared-nothing keeps the mapping total without inventing text.
    return { kind: 'absent' };
  }
  if (!Array.isArray(value) && !(value instanceof Map)) {
    // An explicit YAML 1.1 tag resolves to a host object the parser built:
    // `!!timestamp` to a `Date`, `!!binary` to a `Buffer`, `!!set` to a `Set`.
    // Each has a value but no spelling this surface can show — `String()`
    // would print a locale-dependent date or `[object Set]`, neither of which
    // is in the file — and reporting it as declared-nothing would hide a
    // declaration the file made. It is the same case as a value that contains
    // itself: the recognition fails all-or-nothing and the complete authored
    // source stays readable (FR-025, FR-028).
    throw new TypeError('frontmatter declares a value with no authored rendering');
  }
  if (ancestors.includes(value)) {
    throw new TypeError('frontmatter declares a value that contains itself');
  }
  const path = [...ancestors, value];
  if (Array.isArray(value)) {
    return { kind: 'sequence', items: value.map((item) => renderDeclaredValue(item, path)) };
  }
  return {
    kind: 'mapping',
    entries: [...value].map(([key, nested]) => {
      const resolved = resolveDeclaredKey(key);
      return {
        key: resolved.text,
        keyKind: resolved.kind,
        value: renderDeclaredValue(nested, path),
      };
    }),
  };
}

/**
 * Builds a recognition's per-kind payload. Only `skill` has one so far: the
 * name it declares in its own file. The census the recognizer runs is not part
 * of it — the companion list's one publication is the inventory's
 * `SkillDefinitionDto.companionFiles`, so a second copy here would be the same
 * fact in two responses. Every other kind carries just its kind until its
 * recognizer phase gives it an identity of its own.
 */
function buildDetails(
  kind: CustomizationKind,
  presentation: SkillPresentation | undefined,
): RecognitionDetails {
  if (kind !== 'skill') {
    return { kind };
  }
  return {
    kind,
    // Absent rather than empty when nothing was authored, so "no name" and
    // "an authored empty name" stay distinguishable. A recognition whose
    // extraction failed has no presentation at all, which is what publishes
    // nothing rather than the part that parsed (FR-028).
    ...(presentation?.declaredName === undefined
      ? {}
      : { declaredName: presentation.declaredName }),
    frontmatter: presentation?.frontmatter ?? [],
    bodyText: presentation?.bodyText ?? '',
  };
}

/**
 * Produces the dispatched vendors' recognitions of one admitted candidate.
 * Exactly one record exists per `(file, tool, kind)`: admissions that agree
 * on the tool and kind merge their provenances into that single record rather
 * than splitting into competing recognitions (data-model.md
 * § ToolRecognition). Tools are processed in the order given, so a caller
 * passing the closed tool order publishes a shared candidate's recognitions
 * deterministically; an admission whose tool is not in `tools` produces
 * nothing, which is what "the rule is not dispatched here" must look like —
 * never a fabricated recognition of an unknown kind.
 *
 * Extraction is all-or-nothing per recognition. A `failed` recognition
 * publishes no declared name while the file's complete readable source stays
 * displayed and comparison-eligible, and the caller attaches its
 * `recognition-parse-failed` Diagnostic (FR-028).
 */
export async function recognizeCandidateForVendors(
  input: RecognitionInput,
  tools: readonly SupportedTool[],
): Promise<CandidateRecognition> {
  const byTool = new Map<SupportedTool, Map<CustomizationKind, RecognitionAdmission[]>>(
    tools.map((tool) => [tool, new Map()]),
  );
  for (const admission of input.admissions) {
    const byKind = byTool.get(admission.compiled.tool);
    if (byKind === undefined) {
      continue;
    }
    const key = admission.compiled.kind;
    const group = byKind.get(key);
    if (group === undefined) {
      byKind.set(key, [admission]);
    } else {
      group.push(admission);
    }
  }
  // The census belongs to the candidate's directory, not to a kind or a tool:
  // one directory has one set of accompanying files however many products
  // recognize its entry point, so it is enumerated exactly once per candidate
  // — and only when a recognized kind is directory-shaped, which today is
  // `skill` alone (contracts/inspection-path-allowlist.md § Bounded companion
  // census). The files it lists are read and published by the scan as ordinary
  // files that no rule admitted.
  const census = [...byTool.values()].some((byKind) => byKind.has('skill'))
    ? await listCompanionFiles(input.sourceRoot, input.absolutePath)
    : [];
  const candidateDirectory = input.matchedPath.slice(0, input.matchedPath.lastIndexOf('/') + 1);
  const companions = census.map((listed) => new CompanionSourceFile(candidateDirectory, listed));
  // One extraction per kind, shared by every tool recognizing it: what a
  // `SKILL.md` declares does not depend on which product reads it — every
  // shipped skill contract reads the same fixed YAML semantics — so parsing
  // once is the same-fact-once rule, not an optimization with a semantic.
  const extractions = new Map<CustomizationKind, RecognitionExtraction<SkillPresentation>>();
  const extractionFor = (kind: CustomizationKind): RecognitionExtraction<SkillPresentation> => {
    let extraction = extractions.get(kind);
    if (extraction === undefined) {
      extraction = RecognitionExtraction.run(
        input.sourceText,
        kind === 'skill' ? (text) => new SkillPresentation(text) : null,
      );
      extractions.set(kind, extraction);
    }
    return extraction;
  };
  const recognitions = [...byTool.entries()].flatMap(([tool, byKind]) =>
    [...byKind.entries()].map(([kind, group]) =>
      ToolRecognition.recognize(input.matchedPath, tool, kind, extractionFor(kind), group),
    ),
  );
  return { recognitions, companions };
}
