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
// A Markdown customization's declarations — a skill's, an instruction file's,
// and a command file's — are read out as the file wrote them (FR-007): every
// declared key in authored order, plus the instructions left once the block is
// removed. The skill's declared name leads because it seeds the resolved name
// the grouped inventory row is keyed by and the heading a detail page shows —
// authored when declared, the skill directory otherwise — and the authored
// value is not recoverable from the path: a skill's `name` need not match its
// directory. An instruction file has no name to read at all — its payload is
// the presentation plus the applicability range its inventory row is grouped
// by. A command file has no name to read either, and for a sharper reason: the
// vendor ignores a `name` key in one and derives the command from the path, so
// the name its row is grouped by is the admitting rule's answer rather than
// anything the bytes hold (data-model.md § Inventory unit).
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
  CompiledStaticAgentRule,
  CompiledStaticHookRule,
  CompiledStaticMcpReadingRule,
  CompiledStaticPermissionsCarrierRule,
  CompiledStaticPluginRule,
  HookCarrierReading,
  PluginCarrierReading,
  SelectorOrigin,
} from '../rules/registry';
import { RecognitionExtraction } from '../parsers/extraction';
import { emptyHookCarrierReading } from '../rules/hooks/event-map';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import type { CompanionFile } from '../companion-census';
import type { CustomizationKind, SupportedTool } from '../../../shared/entities';
import type { VendorSurface } from '../../../shared/registries/behavior-types';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  HookEventDeclarationDto,
  McpServerDeclarationDto,
  PluginCarrierKind,
  PluginDeclarationDto,
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
  /** A skill, identified by the name its recognizing tool invokes it by. */
  | {
      /** The recognized customization kind. */
      readonly kind: 'skill';
      /**
       * The name this recognition's own tool invokes the file by — the
       * identity its inventory row is grouped under (FR-007, data-model.md
       * § Inventory unit), answered by the admitting rule from the path it
       * matched and, where the product invokes the authored identity, from
       * what that file declared.
       *
       * Held rather than the declared name it may be built from: the declared
       * name is one of the `frontmatter` entries below, so storing it too
       * would publish a fact and something derived from it, and every surface
       * wants the name the tool answers to rather than the label. Resolved,
       * not sliced: an authored `name: 007` is the string `7`, not the
       * authored spelling (data-model.md § Field reading).
       *
       * Never empty: a tool invoking a file that declares no name — or
       * declares it empty — falls back to the skill directory, and being a
       * named directory is what a skill is. That fallback is also what a
       * `failed` extraction resolves to for such a tool, which makes the row
       * provisional grouping rather than collision evidence (FR-028).
       */
      readonly invocationName: string;
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
   * A hook declaration carrier, identified by the lifecycle events it
   * declares. The kind's inventory unit is one declaration (data-model.md
   * § Inventory unit), so the carrier's one recognition holds them all and the
   * session projection splits them into rows — a synthetic per-event candidate
   * would be a file the repository does not have.
   *
   * Two variants, one per documented carrier form
   * (`api-types.ts` § HookCarrierForm), because a standalone hook file's other
   * top-level keys are this recognition's to publish while a contained
   * table's neighbours belong to the settings recognition of the same file.
   * Which form a carrier is comes from the admitting rule, so it stands even
   * for a `failed` extraction.
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'hook';
      /** Discriminant: the carrier is a file whose whole purpose is hooks. */
      readonly carrier: 'standalone';
      /**
       * Every event the carrier declares, one per declared event in the
       * parser's resolved order — the events the inventory rows are named by,
       * and the groups the detail publishes as the file wrote them (FR-007).
       * Empty when the carrier declares none, and empty for a `failed`
       * extraction, which publishes nothing while the carrier stays an
       * admitted candidate (FR-028).
       */
      readonly events: readonly HookEventDeclarationDto[];
      /**
       * What the carrier declares about itself: every top-level entry beside
       * its hook map, such as a Codex `hooks.json`'s optional `description`.
       * Empty for a `failed` extraction, and empty when it declares none.
       */
      readonly carrierFields: readonly DeclaredEntryDto[];
    }
  | {
      /** The recognized customization kind. */
      readonly kind: 'hook';
      /** Discriminant: the carrier holds the hook table among other content. */
      readonly carrier: 'contained';
      /** Every event the table declares; see the standalone variant's `events`. */
      readonly events: readonly HookEventDeclarationDto[];
    }
  /**
   * A custom-agent definition, identified by the name its admitting product
   * identifies the agent by and presented by the two halves its detail shows:
   * the declarations a product reads as configuration, and the instructions it
   * gives the agent.
   *
   * Where that split falls is the admitting rule's contract — a Codex agent's
   * `developer_instructions` key, a Markdown agent's frontmatter fence — and
   * what it produces is one shape either way, so one detail surface renders
   * both (`registry.ts` § CompiledStaticAgentRule). What a spawned session
   * would inherit, and which agent a spawn would select, are the vendor's
   * documented composition and reach no surface (FR-009). A declared
   * `mcp_servers` block is one metadata entry and joins no MCP row
   * (data-model.md § Inventory unit).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'agent';
      /**
       * The name the admitting product identifies this agent by — the identity
       * the inventory row is grouped under — or absent when that product
       * identifies agents by a declaration this file does not make
       * (`rules/registry.ts` § CompiledStaticAgentRule.agentNameOf).
       *
       * Which fact answers is the rule's, because the vendors differ: Codex
       * and Claude Code take the declared `name`, so a file declaring none,
       * declaring it as anything but a scalar, or whose extraction failed
       * publishes no name and joins the row that says so (FR-007, FR-028);
       * the Copilot surfaces take the configuration file's own name, so the
       * path answers and the row keeps its identity either way.
       *
       * Absent, never empty: an authored empty string is a different fact
       * from no name at all, and collapsing them would report one as the
       * other.
       */
      readonly agentName?: string;
      /**
       * Every declaration the file makes except the one holding the
       * instructions, in the file's own order; the source of the detail
       * response's `presentation.metadata` (FR-007). Empty when the file
       * declares nothing else, and empty for a `failed` extraction, which
       * publishes nothing while the complete source stays displayed
       * (FR-028).
       */
      readonly metadata: readonly DeclaredEntryDto[];
      /**
       * The instructions the file gives the agent; the source of the detail
       * response's `presentation.instructionsText`. Empty for a `failed`
       * extraction: extraction is all-or-nothing (FR-028).
       */
      readonly instructionsText: string;
    }
  /**
   * A command file: a prompt a reader invokes by name, identified by that name
   * and presented by what it declares.
   *
   * The name is not read out of the file, because it is not in the file:
   * Claude Code ignores a `name` key in a command file and derives the name
   * from the path instead, so the admitting rule is what answers it
   * (`registry.ts` § CompiledStaticPromptRule). The presentation comes from
   * the same one parse a skill and an instruction file use, because a command
   * file supports a skill's frontmatter keys and its detail leads with them
   * (FR-007).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'prompt/command';
      /**
       * The name a reader invokes this file by — the identity its inventory
       * row is grouped under (data-model.md § Inventory unit), answered by the
       * admitting rule from the path it matched and, for a prompt file, from
       * what that file declared.
       *
       * Empty exactly where the vendor's own derivation is: a file named `.md`
       * in a command directory has nothing before its extension
       * (api-types.ts § PromptInventoryEntryDto). Never a claim that the
       * command is reachable either: a same-name skill outranks one, which is
       * runtime this tool never observes (FR-009).
       */
      readonly invocationName: string;
      /**
       * Every key the command file's frontmatter declares, in authored order;
       * the source of the detail response's `presentation.frontmatter`. Empty
       * when the file declares no frontmatter, and empty for a `failed`
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
   * A plugin carrier, identified by the plugins it declares. The kind's
   * inventory unit is one declared plugin name (data-model.md § Inventory
   * unit), so the carrier's one recognition holds every declaration it makes
   * and the session projection splits them into rows — a manifest declares one
   * plugin, a catalog one per entry, and a name both of them resolve is one
   * row carried by both files.
   */
  | {
      /** The recognized customization kind. */
      readonly kind: 'plugin';
      /**
       * Which kind of carrier this file is for the plugins below — its own
       * manifest, or a catalog listing it. The admitting rule answers it,
       * because which format a file is read as is that vendor's contract
       * (`rules/registry.ts` § CompiledStaticPluginRule).
       */
      readonly carrier: PluginCarrierKind;
      /**
       * The catalog's own declarations — what it says about itself rather than
       * about the plugins it lists. Empty for a manifest, whose own fields are
       * its one declaration's, and empty for a `failed` extraction (FR-028).
       */
      readonly catalogFields: readonly DeclaredEntryDto[];
      /**
       * Every plugin the carrier declares, in the parser's resolved order —
       * each under the name its admitting rule resolves, which is the identity
       * the inventory row is grouped by, and with the fields the detail
       * publishes by the keys the file wrote (FR-007). How a name follows from
       * a declaration is that vendor's own contract, exactly as it is for a
       * skill or a command: Codex resolves a catalog's offering as
       * `plugin@marketplace` and a derived manifest under the offering that
       * reached it (`rules/plugins/codex.ts`). Empty when the carrier declares none,
       * and empty for a `failed` extraction, which publishes nothing while the
       * carrier stays an admitted candidate (FR-028).
       */
      readonly plugins: readonly PluginDeclarationDto[];
    }
  /** An output style, identified by the name a reader selects it by. */
  | {
      /** The recognized customization kind. */
      readonly kind: 'output style';
      /**
       * The style name this recognition's own tool selects the file by — the
       * identity its inventory row is grouped under (FR-007, data-model.md
       * § Inventory unit), answered by the admitting rule from the path it
       * matched and from what the file declared.
       *
       * Held rather than the declared name it may be built from: the declared
       * name is one of the `frontmatter` entries below, so storing it too
       * would publish a fact and something derived from it. Never empty: a
       * file declaring no usable name is selected by its own file name, which
       * is also what a `failed` extraction falls back to (FR-028).
       */
      readonly styleName: string;
      /**
       * Every key the output style's frontmatter declares, in authored order;
       * the source of the detail response's `presentation.frontmatter`
       * (FR-007). Empty when the file declares no frontmatter, and empty for a
       * `failed` extraction, which publishes nothing while the complete source
       * stays displayed (FR-028).
       */
      readonly frontmatter: readonly DeclaredEntryDto[];
      /**
       * The file with its frontmatter block removed: the instructions the
       * vendor appends to the system prompt, and the source of the detail
       * response's `presentation.bodyText`. Empty for a `failed` extraction:
       * extraction is all-or-nothing (FR-028).
       */
      readonly bodyText: string;
    }
  /**
   * Every other kind. An identity or presentation arrives with the recognizer
   * phase that needs one; until then the kind alone is the record.
   *
   * A rule file, a whole-document permission policy, and a settings or
   * configuration file are here on purpose rather than pending an identity:
   * each detail publishes the one document its author wrote rather than a
   * reading taken out of it — a Claude rule the complete Markdown,
   * frontmatter block included, and a Codex `.codex/config.toml` the complete
   * TOML, comments and section order intact (contracts/http-api.md
   * § get-file-detail) — and a Codex policy the complete Starlark
   * (§ get-permission-policy-detail).
   */
  | {
      /** The recognized customization kind. */
      readonly kind: Exclude<
        CustomizationKind,
        | 'instructions'
        | 'skill'
        | 'MCP'
        | 'agent'
        | 'prompt/command'
        | 'hook'
        | 'plugin'
        | 'output style'
      >;
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
 * {@link recognizeAgent}, {@link recognizeOther}) derives the published
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
    // Asked of the admitting rule, which is where a product's own naming
    // lives — the same question a command recognition asks
    // ({@link recognizePrompt}). Any admission answers: a recognition's
    // admissions are one product's, and that product defines the answer once,
    // so they cannot disagree. The narrowing is the compiler's own, over the
    // `kind` that discriminates `CompiledCandidateRule` — nothing here asserts
    // a capability the unit might not have.
    const [admission] = admissions;
    if (admission === undefined || admission.compiled.kind !== 'skill') {
      throw new TypeError('a skill recognition has no rule that can answer its name');
    }
    // The one parse the kind's own name may come out of: Codex and Copilot
    // invoke the `name` a skill declares, so the rule is asked with the
    // declarations beside the path.
    //
    // A failed extraction hands the rule an empty list, so those products'
    // name falls back to the skill directory — the same string their own
    // fallback produces for a file that declares none, reached for a different
    // reason. The extraction Diagnostic this recognition carries is what
    // distinguishes them, and it is why the same-name machinery treats such a
    // row as provisional grouping rather than as collision evidence (FR-028,
    // shared/skill-collision.ts). Claude Code reads no declaration at all, so
    // its command name is unaffected either way.
    const frontmatter = extraction.extracted?.frontmatterEntries ?? [];
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'skill',
        invocationName: admission.compiled.invocationNameOf(sourceRelativePath, frontmatter),
        frontmatter,
        bodyText: extraction.extracted?.body ?? '',
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
   * Builds one command recognition from the shared Markdown extraction: the
   * declarations the file wrote and the instructions left once the block is
   * removed (FR-007). Both are empty for a failed extraction, which publishes
   * nothing while the complete source stays displayed (FR-028).
   *
   * Its own factory rather than the instruction one under another kind: the
   * two kinds ask their admitting rule different questions — what a file
   * governs, and what a file is invoked by — and a row grouped by one would
   * be wrong under the other (data-model.md § Inventory unit).
   */
  public static recognizePrompt(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<ParsedMarkdownDocument | undefined>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    // Asked of the admitting rule, which is where a product's own naming
    // lives. Any admission answers: a recognition's admissions are one
    // product's, and that product defines the answer once, so they cannot
    // disagree. The narrowing is the compiler's own, over the `kind` that
    // discriminates `CompiledCandidateRule` — nothing here asserts a
    // capability the unit might not have.
    const [admission] = admissions;
    if (admission === undefined || admission.compiled.kind !== 'prompt/command') {
      throw new TypeError('a command recognition has no rule that can answer its name');
    }
    // The one parse the kind's own name may come out of: a prompt file
    // declares its `name`, so the rule is asked with the declarations beside
    // the path.
    //
    // A failed extraction hands the rule an empty list, so the name falls back
    // to the path — the same string the vendor's own fallback produces for a
    // file that declares none, reached for a different reason. That is a
    // deliberate accepted limitation rather than a claim the two states are
    // one: a row has to be listed under something, the path is the only fact a
    // failed parse cannot take away, and what distinguishes the two is the
    // extraction Diagnostic this recognition carries — which every surface
    // showing the definition shows beside it, saying the declarations are
    // unknown rather than absent (FR-028).
    const frontmatter = extraction.extracted?.frontmatterEntries ?? [];
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'prompt/command',
        // Derived from the path, so a failed extraction takes nothing away
        // from it: the row keeps its identity while the declarations it could
        // not read stay unknown (FR-028).
        invocationName: admission.compiled.invocationNameOf(sourceRelativePath, frontmatter),
        frontmatter,
        bodyText: extraction.extracted?.body ?? '',
      },
      extraction.status,
      admissions,
    );
  }

  /**
   * Builds one output-style recognition from the shared Markdown extraction:
   * the declarations the file wrote and the instructions left once the block
   * is removed (FR-007). Both are empty for a failed extraction, which
   * publishes nothing while the complete source stays displayed (FR-028).
   *
   * Its own factory rather than the command one under another kind: the two
   * kinds ask their admitting rule different questions — what a file is
   * invoked by, and what a style is selected by — and a row grouped by one
   * would be wrong under the other (data-model.md § Inventory unit).
   */
  public static recognizeOutputStyle(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<ParsedMarkdownDocument | undefined>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    // Asked of the admitting rule, which is where a product's own naming
    // lives — the same question a command and a skill recognition ask. Any
    // admission answers: a recognition's admissions are one product's, and
    // that product defines the answer once, so they cannot disagree. The
    // narrowing is the compiler's own, over the `kind` that discriminates
    // `CompiledCandidateRule`.
    const [admission] = admissions;
    if (admission === undefined || admission.compiled.kind !== 'output style') {
      throw new TypeError('an output-style recognition has no rule that can answer its name');
    }
    // The one parse the name may come out of: an output style declares its
    // own `name`, so the rule is asked with the declarations beside the path.
    // A failed extraction hands the rule an empty list, so the name falls back
    // to the file name — the same string the vendor's own fallback produces
    // for a file that declares none, reached for a different reason, which the
    // extraction Diagnostic beside the row is what distinguishes (FR-028).
    const frontmatter = extraction.extracted?.frontmatterEntries ?? [];
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'output style',
        styleName: admission.compiled.styleNameOf(sourceRelativePath, frontmatter),
        frontmatter,
        bodyText: extraction.extracted?.body ?? '',
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
   * Builds one hook carrier recognition from a reading the dispatch already
   * resolved — out of the carrier's own text, or out of an owner's frontmatter
   * where the owner's own kind has already parsed it. A failed extraction
   * publishes no event while the carrier stays an admitted candidate (FR-028);
   * which form the carrier is comes from the admitting rule, so the
   * recognition keeps its shape either way
   * ({@link emptyHookCarrierReading}).
   */
  public static recognizeHook(
    sourceRelativePath: string,
    tool: SupportedTool,
    reading: HookCarrierReading,
    status: RecognitionParseStatus,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      // Narrowed over the reading's own discriminant, so the standalone
      // variant is the only one that carries the carrier's own keys and the
      // contained one is never asked for them.
      reading.carrierForm === 'standalone'
        ? {
            kind: 'hook',
            carrier: 'standalone',
            events: reading.events,
            carrierFields: reading.carrierFields,
          }
        : { kind: 'hook', carrier: 'contained', events: reading.events },
      status,
      admissions,
    );
  }

  /**
   * Builds one plugin carrier recognition from the admitting rule's own
   * reading. `plugins` and `catalogFields` are empty for a failed extraction,
   * which publishes nothing while the carrier stays an admitted candidate
   * (FR-028); the carrier kind still stands, because which kind of file this
   * is was decided by the rule that admitted it rather than by its content.
   */
  public static recognizePlugin(
    sourceRelativePath: string,
    tool: SupportedTool,
    extraction: RecognitionExtraction<PluginCarrierReading>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    // Asked of the admitting rule, exactly as a skill's name is
    // ({@link recognizeSkill}): what this file is to the plugins it declares,
    // and what its placement establishes when the text does not parse, are the
    // vendor's own contract. Any admission answers — a recognition's
    // admissions are one product's — and the narrowing is the compiler's own
    // over the `pluginCarrier` discriminant.
    const [admission] = admissions;
    if (admission === undefined || admission.compiled.kind !== 'plugin') {
      throw new TypeError('a plugin recognition has no rule that can answer its carrier');
    }
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'plugin',
        carrier: admission.compiled.pluginCarrier,
        catalogFields: extraction.extracted?.catalogFields ?? [],
        // The reading's declarations as they are: each already carries the
        // name it resolves, the keys the file wrote, and where its plugin sits.
        //
        // A failed extraction keeps what the path establishes and nothing else.
        // For a catalog that is nothing at all: every plugin it resolves is one
        // its text declares, so the carrier's diagnostic says the names are
        // unknown rather than absent. A manifest is the other way round — the
        // folder holding it is a plugin because the file is there — so its own
        // plugin, root, and manifest path stand, with no declared fields
        // (FR-028).
        plugins:
          extraction.extracted?.plugins ??
          (admission.compiled.pluginCarrier === 'manifest'
            ? [admission.compiled.pluginEstablishedByPath(sourceRelativePath)]
            : []),
      },
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
   * Builds one custom-agent recognition from the admitting rule's own split of
   * the file and its own answer for what names the agent.
   *
   * Both questions are the rule's because both differ between the vendors:
   * where the configuration ends and the prose begins — a Codex
   * `developer_instructions` key, a Markdown frontmatter fence — and which
   * fact identifies the agent — the declared `name` for Codex and Claude Code,
   * the configuration file's own name for the Copilot surfaces
   * (`rules/registry.ts` § CompiledStaticAgentRule). The rule is asked with
   * the metadata beside the path, so each answers from the half it uses.
   *
   * A failed extraction publishes neither half, which is what leaves a
   * declared-name product's row name unknown rather than absent while the
   * complete source stays displayed (FR-028).
   */
  public static recognizeAgent(
    sourceRelativePath: string,
    tool: SupportedTool,
    rule: CompiledStaticAgentRule,
    extraction: RecognitionExtraction<AgentPresentationDto>,
    admissions: readonly RecognitionAdmission[],
  ): ToolRecognition {
    const metadata = extraction.extracted?.metadata ?? [];
    const agentName = rule.agentNameOf(sourceRelativePath, metadata);
    return ToolRecognition.#assemble(
      sourceRelativePath,
      tool,
      {
        kind: 'agent',
        // Absent rather than empty when the product's own identifying fact is
        // not there, so "no name" and "an authored empty name" stay
        // distinguishable — the same rule a skill's declared name follows.
        ...(agentName === null ? {} : { agentName }),
        metadata,
        instructionsText: extraction.extracted?.instructionsText ?? '',
      },
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
    kind: Exclude<
      CustomizationKind,
      | 'instructions'
      | 'skill'
      | 'MCP'
      | 'agent'
      | 'prompt/command'
      | 'hook'
      | 'plugin'
      | 'output style'
    >,
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
 * What recognizing one candidate produced: its recognitions, and the
 * directories its customizations occupy for the scan to enumerate and publish.
 */
export interface CandidateRecognition {
  /** The recognitions attached to the candidate; possibly empty. */
  readonly recognitions: readonly ToolRecognition[];
  /**
   * The Source-relative directories this candidate's customizations occupy,
   * each with its trailing slash — a skill's own directory, and the plugin root
   * of every plugin a catalog here declares from inside the Source. Empty for a
   * candidate that is just a file.
   *
   * Directories rather than the files in them, because enumerating one and
   * reading what is in it are the scan's: it owns the one read per published
   * file, and a recognizer that read them would be a second place deciding what
   * a read failure means (contracts/inspection-path-allowlist.md § Bounded
   * companion census).
   */
  readonly directories: readonly string[];
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
 * A compiled unit that can read a plugin carrier: either static rule, or the
 * derived manifest unit. The extraction slot is keyed by the reading rather
 * than by how the file was admitted — a manifest reads the same whether the
 * walk matched it or a catalog's local source derived it.
 */
type PluginReadingRule = CompiledStaticPluginRule;

/**
 * The per-candidate extraction cache: one typed, lazily-run slot per
 * extraction family, so what an extraction produced is the slot's own type
 * and no consumer re-derives a payload's family from its runtime shape. Each
 * slot runs at most once and is shared by every recognition that reads it —
 * `skill`, `instructions`, and `prompt/command` by the one Markdown parse,
 * every tool alike — because what a file declares does not depend on who asks
 * (same-fact-once). A kind with no extraction has no slot: its factory
 * records `not-attempted` directly.
 */
class CandidateExtractions {
  /** The file's complete decoded text every slot reads; see {@link RecognitionInput.sourceText}. */
  readonly #sourceText: string;

  /**
   * The candidate's own Source-relative Path, for the two readings that need
   * it: a plugin manifest names neither its plugin nor its root, and where it
   * sits is what answers both
   * (`rules/plugins/compiled-rule.ts` § CompiledStaticPluginManifestRule),
   * while every JSON-family reading resolves its document from the `(tool,
   * path)` it was read at (`../parsers/json.ts` § ParsedJsonDocument).
   */
  readonly #matchedPath: string;

  /** The one Markdown parse, run on first request; undefined until then. */
  #markdown: RecognitionExtraction<ParsedMarkdownDocument> | undefined;

  /** The per-tool MCP declaration readings, each run on its first request. */
  #mcp = new Map<SupportedTool, RecognitionExtraction<readonly McpServerDeclarationDto[]>>();

  /** The per-tool custom-agent presentation readings, each run on its first request. */
  #agent = new Map<SupportedTool, RecognitionExtraction<AgentPresentationDto>>();

  /** The per-tool plugin carrier readings, each run on its first request. */
  #plugin = new Map<SupportedTool, RecognitionExtraction<PluginCarrierReading>>();

  /** The per-tool hook carrier readings, each run on its first request. */
  #hook = new Map<SupportedTool, RecognitionExtraction<HookCarrierReading>>();

  /** The per-tool declared-policy readings, each run on its first request. */
  #declaredPolicy = new Map<
    SupportedTool,
    RecognitionExtraction<readonly DeclaredEntryDto[] | null>
  >();

  /** Binds the slots to the one text they extract from, and the path it was read at. */
  public constructor(sourceText: string, matchedPath: string) {
    this.#sourceText = sourceText;
    this.#matchedPath = matchedPath;
  }

  /**
   * The Markdown extraction every frontmatter-led kind reads — `skill`,
   * `instructions`, and `prompt/command` alike: the parsed document with its
   * rendered declaration entries, the parser module's own presentation
   * (`parsers/markdown.ts`). What the file declares does not depend on which
   * product or kind asks, so parsing once is the same-fact-once rule, not an
   * optimization with a semantic. A throw inside the parse or its rendering
   * is this extraction's `failed` state (FR-028).
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
      carrier.serverDeclarationsOf(text, this.#matchedPath),
    );
    this.#mcp.set(carrier.tool, extraction);
    return extraction;
  }

  /**
   * The plugin carrier extraction, read by the admitting rule's own
   * contract — a manifest's own keys or a catalog's `plugins` array — and keyed
   * by the tool for the reason the MCP slot is: one physical file can be two
   * vendors' carrier, and each publishes its own vendor's reading. Within one
   * tool the reading runs once, whichever of its admissions asks first.
   */
  public plugin(carrier: PluginReadingRule): RecognitionExtraction<PluginCarrierReading> {
    const existing = this.#plugin.get(carrier.tool);
    if (existing !== undefined) {
      return existing;
    }
    const extraction = RecognitionExtraction.run(this.#sourceText, (text) =>
      carrier.pluginCarrierReadingOf(text, this.#matchedPath),
    );
    this.#plugin.set(carrier.tool, extraction);
    return extraction;
  }

  /**
   * The hook declaration extraction, read by the admitting carrier rule's own
   * contract — which key holds the event map, and which format the carrier is
   * written in — and keyed by the tool for the reason the MCP slot is: one
   * physical file can be two vendors' carrier, and each publishes its own
   * vendor's reading. Within one tool the reading still runs once, whichever
   * of its admissions asks first.
   */
  public hook(carrier: CompiledStaticHookRule): RecognitionExtraction<HookCarrierReading> {
    const existing = this.#hook.get(carrier.tool);
    if (existing !== undefined) {
      return existing;
    }
    const extraction = RecognitionExtraction.run(this.#sourceText, (text) =>
      carrier.hookCarrierReadingOf(text, this.#matchedPath),
    );
    this.#hook.set(carrier.tool, extraction);
    return extraction;
  }

  /**
   * The custom-agent presentation extraction, read by the admitting rule's own
   * contract — where an agent file's configuration ends and its instructions
   * begin is that vendor's fact. Keyed by the tool for the reason the MCP slot
   * is: one physical file can be two vendors' agent definition —
   * `.claude/agents/` is Claude's location and a Copilot VS Code one — and
   * each publishes exactly its own vendor's reading. Within one tool the
   * reading runs once, whichever of its admissions asks first.
   */
  public agent(rule: CompiledStaticAgentRule): RecognitionExtraction<AgentPresentationDto> {
    const existing = this.#agent.get(rule.tool);
    if (existing !== undefined) {
      return existing;
    }
    const extraction = RecognitionExtraction.run(this.#sourceText, (text) =>
      rule.agentPresentationOf(text),
    );
    this.#agent.set(rule.tool, extraction);
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
      carrier.declaredPolicyOf(text, this.#matchedPath),
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
  // Which directories this candidate's customizations occupy. Answering is all
  // this module does with them: enumerating one and reading what is in it are
  // the scan's, which owns the one read per published file, so nothing here
  // touches the filesystem.
  //
  // This is the one place that decides which admissions occupy a directory and
  // where it is, so a further directory-shaped kind is added here and nowhere
  // else (contracts/inspection-path-allowlist.md § Bounded companion census).
  const directories: string[] = [];
  for (const { compiled } of input.admissions) {
    if (compiled.kind === 'skill') {
      // A skill *is* its directory, so its entry point sits at the root of it.
      directories.push(input.matchedPath.slice(0, input.matchedPath.lastIndexOf('/') + 1));
      break;
    }
  }
  const extractions = new CandidateExtractions(input.sourceText, input.matchedPath);
  // Where each plugin this candidate declares sits. The rule that admitted the
  // text answers as it reads it, because which source forms name a directory
  // here — and which directory a manifest's presence made a plugin — is that
  // vendor's contract; a declaration naming none occupies nothing.
  //
  // Every plugin admission is read rather than the first, because the vendors
  // document different source forms for one catalog: `.claude-plugin/marketplace.json`
  // is admitted by all three, and an entry writing Codex's `{ source: 'local',
  // path }` object names a directory to Codex and nothing to the other two.
  // Stopping at the first admission would leave that directory unenumerated,
  // and the plugin's own page empty for the product that does read it.
  for (const { compiled } of input.admissions) {
    if (compiled.kind !== 'plugin') {
      continue;
    }
    const reading = extractions.plugin(compiled);
    // The same fallback the recognition publishes: a manifest whose text does
    // not parse still occupies the folder holding it, so that folder is
    // enumerated and the plugin's own page has the files it ships
    // ({@link ToolRecognition.recognizePlugin}).
    const declarations =
      reading.extracted?.plugins ??
      (compiled.pluginCarrier === 'manifest'
        ? [compiled.pluginEstablishedByPath(input.matchedPath)]
        : []);
    for (const plugin of declarations) {
      if (plugin.pluginRoot !== null && !directories.includes(plugin.pluginRoot)) {
        directories.push(plugin.pluginRoot);
      }
    }
  }
  // The typed extraction slots every recognition of this candidate shares
  // ({@link CandidateExtractions}) are created above, because the directories
  // come out of the same one reading a catalog's recognition publishes.
  const recognitions = [...byTool.entries()].flatMap(([tool, byKind]) =>
    [...byKind.entries()].map(([kind, group]) => {
      if (kind === 'instructions') {
        return ToolRecognition.recognizeInstructions(
          input.matchedPath,
          tool,
          extractions.markdown(),
          group,
        );
      }
      if (kind === 'skill') {
        return ToolRecognition.recognizeSkill(
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
      if (kind === 'agent') {
        // Dispatched the way the MCP reading is, over the `kind` discriminant:
        // an agent unit owns its vendor's reading of an admitted file, and a
        // loop rather than `find` because a callback's narrowing does not
        // reach the caller without a hand-authored predicate, which would
        // assert rather than prove. Every shipped agent rule compiles into
        // such a unit, so a group without one cannot be produced by the
        // shipped catalog and fails loudly here rather than publishing a
        // recognition with no parse.
        for (const { compiled } of group) {
          if (compiled.kind === 'agent') {
            return ToolRecognition.recognizeAgent(
              input.matchedPath,
              tool,
              compiled,
              extractions.agent(compiled),
              group,
            );
          }
        }
        throw new TypeError('an agent recognition has no rule that can split its presentation');
      }
      if (kind === 'prompt/command') {
        // The same one parse the two other frontmatter-led kinds read: what a
        // file declares does not depend on which kind asks for it.
        return ToolRecognition.recognizePrompt(
          input.matchedPath,
          tool,
          extractions.markdown(),
          group,
        );
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
      if (kind === 'hook') {
        // Dispatched the way the MCP reading is, over the `kind` discriminant:
        // a hook unit owns its vendor's reading of the carrier it admits — a
        // standalone hook file's strict JSON or the inline table of a TOML
        // config layer — and a loop rather than `find` because a callback's
        // narrowing does not reach the caller without a hand-authored
        // predicate, which would assert rather than prove. Every shipped hook
        // rule compiles into such a unit, so a group without one cannot be
        // produced by the shipped catalog and fails loudly here rather than
        // publishing a recognition with no parse.
        for (const { compiled } of group) {
          if (compiled.kind !== 'hook') {
            continue;
          }
          const extraction = extractions.hook(compiled);
          return ToolRecognition.recognizeHook(
            input.matchedPath,
            tool,
            extraction.extracted ?? emptyHookCarrierReading(compiled.carrierForm),
            extraction.status,
            group,
          );
        }
        throw new TypeError('a hook recognition has no rule that can read its declarations');
      }
      if (kind === 'plugin') {
        // Dispatched the way the MCP reading is, over the `kind` discriminant:
        // a plugin unit owns its vendor's reading of the carrier it admits —
        // a manifest's own keys or a catalog's entries — and a loop rather than
        // `find` because a callback's narrowing does not reach the caller
        // without a hand-authored predicate, which would assert rather than
        // prove. Every shipped plugin rule compiles into such a unit, so a
        // group without one cannot be produced by the shipped catalog and
        // fails loudly here rather than publishing a recognition with no
        // parse.
        for (const { compiled } of group) {
          if (compiled.kind === 'plugin') {
            return ToolRecognition.recognizePlugin(
              input.matchedPath,
              tool,
              extractions.plugin(compiled),
              group,
            );
          }
        }
        throw new TypeError('a plugin recognition has no rule that can read its declarations');
      }
      if (kind === 'output style') {
        // The same one parse the other frontmatter-led kinds read: what a file
        // declares does not depend on which kind asks for it.
        return ToolRecognition.recognizeOutputStyle(
          input.matchedPath,
          tool,
          extractions.markdown(),
          group,
        );
      }
      return ToolRecognition.recognizeOther(input.matchedPath, tool, kind, group);
    }),
  );
  return { recognitions: recognitions.filter((recognition) => recognition !== null), directories };
}
