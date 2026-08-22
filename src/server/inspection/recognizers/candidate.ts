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
// A Markdown customization's declarations — a skill's, and an instruction
// file's — are read out as the file wrote them (FR-007): every declared key in
// authored order, plus the instructions left once the block is removed. The
// skill's declared name leads because it seeds the resolved name the grouped
// inventory row is keyed by and the heading a detail page shows — authored
// when declared, the skill directory otherwise — and the authored value is not
// recoverable from the path: a skill's `name` need not match its directory. An
// instruction file has no name to read at all — its payload is the
// presentation plus the applicability range its inventory row is grouped by
// (data-model.md § Inventory unit).
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
import type {
  CompiledCandidateRule,
  CompiledStaticMcpReadingRule,
  CompiledStaticPermissionsCarrierRule,
  SelectorOrigin,
} from '../rules/registry';
import { RecognitionExtraction } from '../parsers/extraction';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import { listCompanionFiles, type CompanionFile } from '../companion-census';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import type { VendorSurface } from '../../../shared/registries/behavior-types';
import type {
  DeclaredEntryDto,
  McpServerDeclarationDto,
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
  /** The compiled rule that admitted the candidate — static or derived; the source of both getters. */
  readonly #compiled: CompiledCandidateRule;

  /** The admitted Source-relative Path, spelled with the exact entry names. */
  public readonly matchedPath: string;

  /** Binds one admission to the rule that authorized it and the path it matched. */
  public constructor(compiled: CompiledCandidateRule, matchedPath: string) {
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

  /**
   * The product surfaces the admitting rule rests on, from the rule itself
   * (`CompiledRule.recognizingSurfaces`). A recognition's surfaces are the
   * union over its admissions, which is what makes the union meaningful: one
   * physical `.github/copilot-instructions.md` at the root is admitted by the
   * root-exact rule and by the CLI-context rule, so its one recognition names
   * all three Copilot surfaces, while the same filename in a subdirectory is
   * admitted by the CLI-context rule alone and names the CLI's.
   */
  public get recognizingSurfaces(): readonly VendorSurface[] {
    return this.#compiled.recognizingSurfaces;
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
      readonly frontmatter: readonly DeclaredEntryDto[];
      /**
       * The `SKILL.md` with its frontmatter block removed: the source of the
       * detail response's `presentation.bodyText`. Empty for a `failed`
       * extraction: extraction is all-or-nothing (FR-028).
       */
      readonly bodyText: string;
    }
  /**
   * An instruction file, presented by what it declares and grouped by what it
   * governs. No declared name is read: the Source-relative Path the
   * recognition already carries is the file's whole identity. What the kind
   * carries instead is the file's own presentation — the same one parse a
   * skill uses, because the detail leads with the keys the file declares and
   * the instructions that follow them (FR-007) — and the applicability range
   * its inventory row is grouped by (data-model.md § Inventory unit).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'instructions';
      /**
       * Every key the instruction file's frontmatter declares, in authored
       * order; the source of the detail response's `presentation.frontmatter`.
       * Empty when the file declares no frontmatter, and empty for a `failed`
       * extraction, which publishes nothing while the complete source stays
       * displayed (FR-028).
       */
      readonly frontmatter: readonly DeclaredEntryDto[];
      /**
       * The file with its frontmatter block removed: the source of the detail
       * response's `presentation.bodyText`. Empty for a `failed` extraction:
       * extraction is all-or-nothing (FR-028).
       */
      readonly bodyText: string;
      /**
       * The glob this file governs relative to the Repository root — derived
       * from the path, or declared by the file itself where its product reads
       * one (Copilot's `applyTo`) — and the identity its inventory row is
       * grouped by (data-model.md § Inventory unit). Null exactly when the
       * product reads this filename's range from its declaration alone and
       * the declarations supply none: such a file lists under the row that
       * says no range is known — which covers a file whose declarations could
       * not be read at all, its parse-failure diagnostic beside it (FR-028).
       */
      readonly applicabilityRange: string | null;
    }
  /**
   * An MCP declaration carrier, identified by the servers it declares. The
   * kind's inventory unit is one declaration (data-model.md § Inventory
   * unit), so the carrier's one recognition holds them all and the session
   * projection splits them into rows — a synthetic per-server candidate would
   * be a file the repository does not have.
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'MCP';
      /**
       * Every server the carrier declares, one per named declaration in the
       * parser's resolved order — the names the inventory rows are named by,
       * and the fields the detail publishes by the keys the file wrote
       * (FR-007). Empty when the carrier declares none, and empty for a
       * `failed` extraction, which publishes nothing while the carrier stays
       * an admitted candidate (FR-028).
       */
      readonly servers: readonly McpServerDeclarationDto[];
    }
  /**
   * A permission policy a carrier declares as one block of a larger document:
   * the entries of that block, in the parser's resolved order. The kind's
   * other form — a file that is itself the whole policy — carries no
   * extraction and is the plain record below, which is why this member exists
   * rather than an optional field on it (contracts/http-api.md
   * § get-permission-policy-detail).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'permissions';
      /**
       * The declared block's own entries. Empty exactly for a failed
       * extraction, which publishes nothing while the carrier stays an
       * admitted candidate (FR-028); a document declaring no block yields no
       * recognition at all rather than an empty one.
       */
      readonly declaredPolicy: readonly DeclaredEntryDto[];
    }
  /**
   * Every other kind. An identity or presentation arrives with the recognizer
   * phase that needs one; until then the kind alone is the record.
   *
   * A rule file and a whole-document permission policy are here on purpose
   * rather than pending an identity: each detail publishes the one document
   * its author wrote rather than a reading taken out of it — a Claude rule the
   * complete Markdown, frontmatter block included (contracts/http-api.md
   * § get-file-detail), and a Codex policy the complete Starlark
   * (§ get-permission-policy-detail).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: Exclude<CustomizationKind, 'skill' | 'instructions' | 'MCP'>;
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
 * `presentation` is one Markdown recognition's parse, the skill's or the
 * instruction file's — so the record itself
 * carries no wire identity of its own. A class reached only through its
 * factories, which fix how a record comes to be: one typed factory per kind
 * ({@link recognizeSkill}, {@link recognizeInstructions}, {@link recognizeMcp},
 * {@link recognizeOther}) derives the published
 * fields from exactly the extraction its kind produces — the kind→payload
 * correlation is each signature's own fact, never a runtime shape test over a
 * kind-erased value — and {@link withDiagnostic} — the one later change a
 * record takes, the scan attaching its kind's extraction-failure reference —
 * is a named derivation rather than a spread copy.
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
   * Builds one skill recognition from the file's one Markdown extraction and
   * the rule admissions behind the record. One typed factory per kind rather
   * than one kind-erased one, so the kind→payload correlation is the
   * signature's own fact: each factory accepts exactly the extraction its
   * kind's extractor produces, and no caller — and no builder — re-derives a
   * payload's family from its runtime shape.
   */
  public static recognizeSkill(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<ParsedMarkdownDocument | undefined>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    const document = extraction.extracted;
    // The name is the one declaration read out on its own, because it is the
    // identity an inventory row is grouped by and the heading a detail page
    // shows. Read from the rendered entries by the string key and the scalar
    // kind: a one-item sequence has a rendering too, and taking its text
    // would name a skill after the first item of a list the file did not
    // write as a name. Every other declaration, the description included, is
    // published once in `frontmatter` and read from there.
    const name = document?.frontmatterEntries.find(
      (entry) => entry.keyKind === 'string' && entry.key === 'name',
    );
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'skill',
        // Absent rather than empty when nothing was authored, so "no name"
        // and "an authored empty name" stay distinguishable. A recognition
        // whose extraction failed has no document at all, which is what
        // publishes nothing rather than the part that parsed (FR-028).
        ...(name?.value.kind === 'scalar' ? { declaredName: name.value.text } : {}),
        frontmatter: document?.frontmatterEntries ?? [],
        bodyText: document?.body ?? '',
      },
      extraction.status,
      admissions,
    );
  }

  /**
   * Builds one instructions recognition from the same one Markdown extraction
   * a skill reads — the presentation a detail shows cannot differ by kind
   * (FR-007) — plus the one question only this kind answers, asked of the
   * admitting rule: what the file governs (data-model.md § Inventory unit).
   */
  public static recognizeInstructions(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<ParsedMarkdownDocument | undefined>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    // Asked of the admitting rule, which is where a product's own answer
    // lives. Any admission answers: a recognition's admissions are one
    // product's, and that product defines the answer once, so they cannot
    // disagree. The narrowing is the compiler's own, over the `kind` that
    // discriminates `CompiledCandidateRule` — nothing here asserts a
    // capability the unit might not have.
    const [admission] = admissions;
    if (admission === undefined || admission.compiled.kind !== 'instructions') {
      throw new TypeError('an instructions recognition has no rule that can answer its range');
    }
    // A failed extraction has no document at all, which is what publishes
    // nothing rather than the part that parsed (FR-028). The declarations are
    // handed to the rule all the same, and an empty set answers like a file
    // that declares nothing: a path-derived range where the product derives
    // one, and null — the no-known-range row — where the product reads this
    // filename's range from its declaration alone, so an unreadable
    // declaration block never widens into a range read off the path.
    const frontmatter = extraction.extracted?.frontmatterEntries ?? [];
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'instructions',
        frontmatter,
        bodyText: extraction.extracted?.body ?? '',
        applicabilityRange: admission.compiled.applicabilityRangeOf(
          sourceRelativePath,
          frontmatter,
        ),
      },
      extraction.status,
      admissions,
    );
  }

  /**
   * Builds one MCP carrier recognition from the carrier rule's own
   * declaration extraction. `servers` is empty for a failed extraction, which
   * publishes nothing while the carrier stays an admitted candidate (FR-028);
   * an absent or non-collection `mcp_servers`-style container already
   * extracted to the empty list.
   */
  public static recognizeMcp(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<readonly McpServerDeclarationDto[]>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      { kind: 'MCP', servers: extraction.extracted ?? [] },
      extraction.status,
      admissions,
    );
  }

  /**
   * Builds one declared-block permission-policy recognition from the carrier
   * rule's own extraction. `declaredPolicy` is empty for a failed extraction,
   * which publishes nothing while the carrier stays an admitted candidate
   * (FR-028). A document that declares no block never reaches here: its
   * caller publishes no recognition, because a policy nobody wrote is not an
   * empty policy.
   */
  public static recognizePermissionsBlock(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<readonly DeclaredEntryDto[] | null>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      { kind: 'permissions', declaredPolicy: extraction.extracted ?? [] },
      extraction.status,
      admissions,
    );
  }

  /**
   * Builds a recognition of a kind with no extraction of its own: the kind
   * alone is the record until its recognizer phase gives it an identity, and
   * `not-attempted` is the honest status — no allowlisted extractor applies,
   * which is a different claim from "parsing succeeded".
   */
  public static recognizeOther(
    sourceRelativePath: string,
    tool: SupportedTool,
    kind: Exclude<CustomizationKind, 'skill' | 'instructions' | 'MCP'>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      { kind },
      'not-attempted',
      admissions,
    );
  }

  /**
   * The shared assembly every factory ends in: the provenances from the
   * admissions — ordered by admitting rule so two scans of the same tree
   * publish the same record, with the selector index breaking the tie for a
   * rule with several alternatives, because the index is the admission's and
   * no published field carries it.
   */
  static #assemble(
    sourceRelativePath: string,
    tool: SupportedTool,
    details: RecognitionDetails,
    parseStatus: RecognitionParseStatus,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return new ToolRecognition(
      sourceRelativePath,
      tool,
      details,
      parseStatus,
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

/**
 * One rule admission of a candidate, resolved from the traversal's origins.
 * A derived candidate resolves the same way: its vendor's configuration
 * reader contributes a plan to the same walk, so the plan index the traversal
 * reports names the derived rule exactly as it names a static one.
 */
export interface RecognitionAdmission {
  /** The compiled rule that admitted the candidate, static or derived. */
  readonly compiled: CompiledCandidateRule;
  /** Which authored selector of that rule matched. */
  readonly origin: SelectorOrigin;
}

/**
 * The per-candidate extraction cache: one typed, lazily-run slot per
 * extraction family, so what an extraction produced is the slot's own type
 * and no consumer re-derives a payload's family from its runtime shape. Each
 * slot runs at most once and is shared by every recognition that reads it —
 * both Markdown kinds by the one parse, every tool alike — because what a
 * file declares does not depend on who asks (same-fact-once). A kind with no
 * extraction has no slot: its factory records `not-attempted` directly.
 */
class CandidateExtractions {
  /** The file's complete decoded text every slot reads; see {@link RecognitionInput.sourceText}. */
  readonly #sourceText: string;

  /** The one Markdown parse, run on first request; undefined until then. */
  #markdown: RecognitionExtraction<ParsedMarkdownDocument> | undefined;

  /** The per-tool MCP declaration readings, each run on its first request. */
  #mcp = new Map<SupportedTool, RecognitionExtraction<readonly McpServerDeclarationDto[]>>();

  /** The per-tool declared-policy readings, each run on its first request. */
  #declaredPolicy = new Map<
    SupportedTool,
    RecognitionExtraction<readonly DeclaredEntryDto[] | null>
  >();

  /** Binds the slots to the one text they extract from. */
  public constructor(sourceText: string) {
    this.#sourceText = sourceText;
  }

  /**
   * The Markdown extraction both frontmatter-led kinds read — the parsed
   * document with its rendered declaration entries, the parser module's own
   * presentation (`parsers/markdown.ts`): what the file declares does not
   * depend on which product or kind asks, so parsing once is the
   * same-fact-once rule, not an optimization with a semantic. A throw inside
   * the parse or its rendering is this extraction's `failed` state (FR-028).
   */
  public markdown(): RecognitionExtraction<ParsedMarkdownDocument> {
    this.#markdown ??= RecognitionExtraction.run(
      this.#sourceText,
      (text) => new ParsedMarkdownDocument(text),
    );
    return this.#markdown;
  }

  /**
   * The MCP declaration extraction, read by the admitting carrier rule's own
   * contract — which file carries declarations and what one means is that
   * vendor's fact, and the slot is keyed by the tool because two vendors'
   * contracts read one physical file differently: the shared root
   * `.mcp.json` is Claude's project carrier and a Copilot CLI workspace
   * carrier at once, and the CLI also accepts the bare top-level schema
   * Claude does not read, so each tool's recognition publishes exactly its
   * own vendor's reading (T342). Within one tool the reading still runs
   * once, whichever of its admissions asks first.
   */
  public mcp(
    carrier: CompiledStaticMcpReadingRule,
  ): RecognitionExtraction<readonly McpServerDeclarationDto[]> {
    const existing = this.#mcp.get(carrier.tool);
    if (existing !== undefined) {
      return existing;
    }
    const extraction = RecognitionExtraction.run(this.#sourceText, (text) =>
      carrier.serverDeclarationsOf(text),
    );
    this.#mcp.set(carrier.tool, extraction);
    return extraction;
  }

  /**
   * The declared permission-policy extraction, read by the admitting carrier
   * rule's own contract — which key holds the policy, and which format the
   * document is, is that vendor's fact. Keyed by the tool for the reason the
   * MCP slot is: one physical file can be two vendors' carrier, and each
   * publishes exactly its own vendor's reading. Within one tool the reading
   * runs once, whichever of its admissions asks first.
   */
  public declaredPolicy(
    carrier: CompiledStaticPermissionsCarrierRule,
  ): RecognitionExtraction<readonly DeclaredEntryDto[] | null> {
    const existing = this.#declaredPolicy.get(carrier.tool);
    if (existing !== undefined) {
      return existing;
    }
    const extraction = RecognitionExtraction.run(this.#sourceText, (text) =>
      carrier.declaredPolicyOf(text),
    );
    this.#declaredPolicy.set(carrier.tool, extraction);
    return extraction;
  }
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
  // The typed extraction slots every recognition of this candidate shares
  // ({@link CandidateExtractions}), dispatched to each kind's own factory so
  // the payload a factory receives is the one its signature declares — no
  // kind-erased value exists for a builder to re-classify.
  const extractions = new CandidateExtractions(input.sourceText);
  const recognitions = [...byTool.entries()].flatMap(([tool, byKind]) =>
    [...byKind.entries()].map(([kind, group]) => {
      if (kind === 'skill') {
        return ToolRecognition.recognizeSkill(
          input.matchedPath,
          tool,
          extractions.markdown(),
          group,
        );
      }
      if (kind === 'instructions') {
        return ToolRecognition.recognizeInstructions(
          input.matchedPath,
          tool,
          extractions.markdown(),
          group,
        );
      }
      if (kind === 'MCP') {
        // The reading is dispatched to the admission whose unit owns one,
        // narrowed by the compiler's own control flow over the `kind` and
        // `mcpReading` discriminants — a loop rather than `find`, because a
        // callback's narrowing does not reach the caller without a
        // hand-authored predicate, which would assert rather than prove. A
        // provenance-only admission (`copilot.repo.mcp.vscode-root`)
        // contributes its surfaces through the group while the declarations
        // stay the co-admitting reading rule's own extraction. Every shipped
        // provenance-only selector coincides with a reading rule's selector
        // (registry.ts § CompiledStaticMcpProvenanceRule), so a group
        // without a reading admission cannot be produced by the shipped
        // catalog and fails loudly here rather than publishing a recognition
        // with no parse.
        for (const { compiled } of group) {
          if (compiled.kind === 'MCP' && compiled.mcpReading === 'own') {
            return ToolRecognition.recognizeMcp(
              input.matchedPath,
              tool,
              extractions.mcp(compiled),
              group,
            );
          }
        }
        throw new TypeError('an MCP recognition has no rule that can read its declarations');
      }
      if (kind === 'permissions') {
        // Dispatched the way the MCP reading is, over the `kind` and
        // `permissionsReading` discriminants: a carrier unit reads a block out
        // of a larger document, while a vendor whose file is itself the policy
        // has nothing to read and falls through to the plain record below.
        for (const { compiled } of group) {
          if (compiled.kind === 'permissions' && compiled.permissionsReading === 'declared-block') {
            const extraction = extractions.declaredPolicy(compiled);
            // A document that declares no policy is no permissions row: the
            // extraction says so by resolving to null, and publishing an empty
            // recognition would put a policy on screen that nobody wrote. A
            // failed extraction is not this case — the block is unknown rather
            // than absent — so it stays a recognition whose diagnostic says
            // what happened (FR-028).
            return extraction.status === 'parsed' && extraction.extracted === null
              ? null
              : ToolRecognition.recognizePermissionsBlock(
                  input.matchedPath,
                  tool,
                  extraction,
                  group,
                );
          }
        }
      }
      return ToolRecognition.recognizeOther(input.matchedPath, tool, kind, group);
    }),
  );
  return { recognitions: recognitions.filter((recognition) => recognition !== null), companions };
}
