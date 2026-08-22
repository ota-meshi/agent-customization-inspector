// Codex classification over the registry-compiled inspection rules (T065,
// extended by T213). This module owns no walker and no selector semantics of
// its own: it takes the shipped Codex matchers, hands them to the one registry
// compiler, and pairs the resulting immutable `TraversalPlan`s with each
// rule's identity. Discovery itself is executed by `traversal.ts` against
// those plans.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
//
// This module also owns Codex's configuration-read logic (T1090): plain code
// that reads `.codex/config.toml` before a scan, takes the
// `project_doc_fallback_filenames` values, and builds the traversal plan the
// walk executes for them. The scan composes each vendor's reader exactly like
// the rule catalogs, so the logic lives with the vendor it belongs to
// (contracts/vendors/openai-codex.md § Derived Repository rules). The file is
// also a candidate of its own: `codex.repo.config` admits it, its
// `[mcp_servers.*]` tables are the MCP rows its recognition publishes, and
// its detail is `get-mcp-carrier-detail`'s — the one thing it never has is a
// raw source display, on any surface (FR-007). The stage-one read is seeded
// into the walk so the one physical file is read once per attempt (T282).
import {
  CompiledDerivedRule,
  CompiledInspectionRule,
  type CompiledStaticCandidateRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
  type CompiledStaticPermissionsDocumentRule,
} from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import type { McpServerDeclarationDto } from '../../../shared/api-types';
import { join } from 'node:path';
import {
  isVcsInternalPath,
  readCandidate,
  rethrowIfResourceExhaustion,
  statThroughLink,
  type ConfigurationReadResult,
  type SeededCandidateRead,
} from '../traversal';
import { realpath } from '../fs-io';
import { RecognitionExtraction } from '../parsers/extraction';
import { ParsedTomlDocument } from '../parsers/toml';
import { CODEX_RULE_RELATIONS } from '../../../shared/registries/codex/relations';
import {
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  CODEX_INSPECTION_RULES,
} from '../../../shared/registries/codex/rules';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Codex rule compiled for execution: the shared compilation from the base,
 * plus what is Codex's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Codex's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class CodexCompiledRule extends CompiledInspectionRule {
  /** Always `codex`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'codex';

  /** The rule's edges from {@link CODEX_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Codex record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'codex') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Codex-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CODEX_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Codex relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Codex instruction rule compiled for execution: everything a Codex rule is,
 * plus the one question only an instruction rule answers.
 *
 * Codex builds its instruction chain from the project root down to the runtime
 * working directory and stops there, so a nested `AGENTS.md` belongs to a
 * context this product does not select and is never a candidate: every Codex
 * instruction this inventory holds sits at the selected root and governs the
 * repository entirely (data-model.md § Inventory unit).
 */
export class CodexCompiledInstructionRule
  extends CodexCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /** The Repository root's `**`; every Codex instruction candidate sits there. */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles one Codex instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex instruction rule`);
    }
  }
}

/**
 * The Codex MCP carrier rule compiled for execution: everything a Codex rule
 * is, plus the one question only an MCP carrier rule answers — which servers
 * an admitted carrier declares. The reading lives here, beside the rule that
 * owns it, because which file carries declarations and what a declaration
 * means is this vendor's own contract (contracts/vendors/openai-codex.md
 * § Normative initial-release presentation allowlist, the `MCP` row); the
 * TOML parse and the rendering
 * of resolved values are the format's and stay in `parsers/toml.ts`.
 */
export class CodexCompiledMcpCarrierRule
  extends CodexCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (registry.ts § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `[mcp_servers.*]` declarations one admitted carrier makes, one per
   * named server table, in the parser's resolved order (FR-007), read over
   * the document's rendered entries — a table renders as the `mapping` kind,
   * so the structural question is the entries' own discriminant.
   *
   * Contained-declaration classification is structural and total: only a
   * table under `mcp_servers` is a server declaration, and a `mcp_servers`
   * entry that is not a table — a scalar, an array — is omitted whole rather
   * than published partially, exactly as an absent `mcp_servers` declares
   * nothing. No field is validated, no environment reference is resolved, and
   * no declared command, URL, or path gains read or connection authority.
   * Throws on text TOML cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the carrier
   * stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const declared = new ParsedTomlDocument(sourceText).entries.find(
      (entry) => entry.key === 'mcp_servers',
    );
    if (declared === undefined || declared.value.kind !== 'mapping') {
      return [];
    }
    return declared.value.entries.flatMap((entry) =>
      entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
    );
  }

  /** Compiles one Codex MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * A Codex rule of every other kind, compiled for execution. It answers no
 * per-kind question — neither an instruction rule's applicability nor an MCP
 * carrier's declarations — which is exactly what a skill rule has to say
 * about either (see `CompiledStaticOtherKindRule`).
 */
export class CodexCompiledOtherKindRule
  extends CodexCompiledRule
  implements CompiledStaticOtherKindRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<
    CustomizationKind,
    'instructions' | 'prompt/command' | 'MCP' | 'permissions'
  >;

  /** Compiles one Codex record of any kind but the four with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'MCP' ||
      rule.kind === 'permissions'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Codex unit that answers for its kind`);
    }
  }
}

/**
 * A Codex permission-policy rule compiled for execution: the admitted file is
 * itself the whole policy, so this unit reads nothing out of it. A
 * `.codex/rules/*.rules` file is the Starlark document its author wrote, and
 * its detail serves that document (contracts/http-api.md
 * § get-permission-policy-detail).
 */
export class CodexCompiledPermissionsDocumentRule
  extends CodexCompiledRule
  implements CompiledStaticPermissionsDocumentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads nothing: the admitted document is the policy (registry.ts § CompiledStaticPermissionsDocumentRule). */
  public readonly permissionsReading: 'whole-document';

  /** Compiles one Codex permission-policy record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex permission-policy rule`);
    }
    this.permissionsReading = 'whole-document';
  }
}

/**
 * A Codex derived rule compiled for execution: the shared derivation from the
 * base, plus what is Codex's own — the same two things a static Codex rule
 * fixes, for the same reasons. A derived candidate is recognized and rendered
 * exactly like a static one, so it has to answer the same questions: which
 * product recognized it, and which documented behavior its rule rests on.
 */
/**
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers static instructions, skills, the
 * MCP carrier, and rule files, with the configured instruction fallbacks
 * reaching the same walk through the derived rule below.
 *
 * The catalog now carries both discovery classes, and each compiles through
 * its own gate: the static rules below feed the traversal, while the derived
 * rule compiles into {@link CODEX_DERIVED_FALLBACK_RULE} for the
 * configuration-read stage — the selection is by declared class, and a record of
 * either class that cannot be executed still fails the build that ships it
 * through its constructor guard.
 */
export const CODEX_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CODEX_INSPECTION_RULES,
)
  .filter((rule) => rule.discoveryClass === 'static-candidate')
  .map((rule) =>
    // Each record compiles into the unit that can answer its kind's question:
    // an instruction record what its files govern, an MCP record which
    // servers its carrier declares; every other kind compiles into the plain
    // one.
    rule.kind === 'instructions'
      ? new CodexCompiledInstructionRule(rule)
      : rule.kind === 'MCP'
        ? new CodexCompiledMcpCarrierRule(rule)
        : rule.kind === 'permissions'
          ? new CodexCompiledPermissionsDocumentRule(rule)
          : new CodexCompiledOtherKindRule(rule),
  );

export class CodexCompiledDerivedRule extends CompiledDerivedRule {
  /** Always `codex`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'codex';

  /** The rule's edges from {@link CODEX_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Codex derived record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'codex') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex rule`);
    }
    this.tool = rule.tool;
    // Widened for the lookup and rejected loudly on a miss, exactly as in
    // `CodexCompiledRule`: `InspectionRule` does not correlate `tool` with
    // `ruleId`, so a Codex-tagged record whose ID another vendor's catalog
    // owns must fail rather than compile with that vendor's edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CODEX_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Codex relations`);
    }
    this.relations = edges;
  }
}

/**
 * The compiled `codex.derived.fallback-basename` unit the configuration-read
 * stage expands (T1089): the seed is the repository's own `.codex/config.toml`
 * read as configuration, and the derived targets are `instructions` candidates
 * at the Repository root, one per declared basename, scanned by the same walk
 * as every static candidate.
 */
export const CODEX_DERIVED_FALLBACK_RULE = new CodexCompiledDerivedRule(
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
);

/**
 * Reads one configuration seed for a vendor's configuration-read logic
 * (T1090): probes the exact pinned path, and returns the decoded text of a
 * present, readable seed — through the same single read path as every
 * published file — beside the read it performed, so the scan can seed the
 * walk's classification cache with it and the seed's own candidacy
 * (`codex.repo.config`, T282) reuses this read instead of opening the file
 * again.
 *
 * An absent seed configures nothing — the probe's failure is the absence
 * fact — and performed no read to seed. An unreadable or binary seed also
 * configures nothing here, but its read did happen and is seeded, so the
 * walk publishes the candidate from the same classification this reader saw.
 */
async function readConfigurationSeed(
  root: string,
  seedSegments: readonly string[],
): Promise<{
  readonly sourceText: string | null;
  readonly seededRead: SeededCandidateRead | null;
}> {
  const absolutePath = join(root, ...seedSegments);
  let target;
  try {
    // Through the link, like every other read (FR-024): a seed reached by a
    // symbolic link is the file it resolves to.
    target = await statThroughLink(absolutePath);
  } catch (error) {
    // Reached by every repository that ships no `.codex/config.toml`, and by
    // one whose seed is a dangling link: absence is the ordinary answer here.
    // The rethrow separates the machine running out of descriptors or memory
    // from that answer, because reporting exhaustion as "this repository
    // declares no fallback names" would commit a complete generation missing
    // every configured instruction file.
    rethrowIfResourceExhaustion(error);
    return { sourceText: null, seededRead: null };
  }
  if (!target.isFile) {
    // A directory, FIFO, socket, or device at the pinned path configures
    // nothing. The type is decided before the read because the one flag-free
    // `readFile` below would block indefinitely on a FIFO — the same gate
    // `probeExactTarget` applies to an exact target, and the walk gets from
    // its directory-entry types.
    return { sourceText: null, seededRead: null };
  }
  try {
    // The walk decides descent on resolved real paths, so a `.codex` entry
    // that is a symbolic link into `.git` never becomes a candidate
    // (`isVcsInternalPath`). Configuration must refuse the same spelling:
    // without this gate, the read that configures the scan would come from
    // the VCS store the walk itself excludes, and the derived fallback plans
    // would rest on bytes no candidate can ever publish.
    if (isVcsInternalPath(await realpath(root), await realpath(absolutePath))) {
      return { sourceText: null, seededRead: null };
    }
  } catch (error) {
    // The same absence window as the stat above: a seed removed between the
    // probe and the resolution configures nothing.
    rethrowIfResourceExhaustion(error);
    return { sourceText: null, seededRead: null };
  }
  const outcome = await readCandidate(absolutePath);
  return {
    sourceText: outcome.kind === 'readable' ? outcome.sourceText : null,
    seededRead: { rawSegments: seedSegments, outcome },
  };
}

/**
 * The configured fallback basenames one carrier document declares, in
 * authored order — or null when the field is absent or is not a string array,
 * which both mean the carrier configures nothing. Throws on a document TOML
 * cannot parse; the caller's extraction boundary owns that throw as
 * "configures nothing", because the stage-one read is configuration input
 * only — the same document reaches the carrier's own MCP recognition through
 * the seeded walk, and that recognition's extraction is where a parse
 * failure gets its diagnostic (FR-028).
 *
 * Retention is complete: every declaration is kept, duplicates included, and
 * no Inspector cap or character grammar edits the list
 * (contracts/inspection-path-allowlist.md § Common conformance
 * requirements). A declared value is a name, not a path: the walk compares it
 * to the entry names it enumerated and opens the entry, so a value holding a
 * separator, a dot segment, or a home marker matches nothing rather than
 * reaching anything — there is no escape for a grammar to prevent, and
 * rejecting the declaration would only lose the ordinary names beside it.
 */
export function configuredFallbackBasenamesOf(sourceText: string): readonly string[] | null {
  const declared = new ParsedTomlDocument(sourceText).table['project_doc_fallback_filenames'];
  return Array.isArray(declared) &&
    declared.every((value): value is string => typeof value === 'string')
    ? declared
    : null;
}

/**
 * Codex's configuration-read contribution (T1090): reads the root
 * `.codex/config.toml` — configuration deciding what counts as an
 * instruction file, before any candidate is scanned — and expands the
 * declared fallback basenames into the plan the same walk executes under
 * {@link CODEX_DERIVED_FALLBACK_RULE}'s identity. An absent, unreadable,
 * malformed, or invalidly-declaring carrier configures nothing here; the
 * carrier's own candidacy is `codex.repo.config`'s, which is why the read
 * this function performed is returned as a seeded read — the walk classifies
 * the candidate from this same read instead of opening the file a second
 * time, so the fallback plan and the published carrier can never disagree
 * about one generation's bytes (T282).
 */
export async function readCodexConfiguredFallbackPlans(
  root: string,
): Promise<ConfigurationReadResult> {
  const seed = await readConfigurationSeed(root, ['.codex', 'config.toml']);
  const seededReads = seed.seededRead === null ? [] : [seed.seededRead];
  if (seed.sourceText === null) {
    return { plans: [], seededReads };
  }
  // The extraction boundary is the one sanctioned soft-failure seam: a parse
  // throw becomes the `failed` status here instead of a bare catch.
  const extraction = RecognitionExtraction.run(seed.sourceText, configuredFallbackBasenamesOf);
  const basenames = extraction.extracted ?? null;
  return {
    plans:
      basenames !== null && basenames.length > 0
        ? [
            {
              rule: CODEX_DERIVED_FALLBACK_RULE,
              plan: CODEX_DERIVED_FALLBACK_RULE.planFor(basenames),
            },
          ]
        : [],
    seededReads,
  };
}
