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
// (contracts/vendors/openai-codex.md § Derived Repository rules). The file
// itself is a configuration input only: it is never published or
// raw-displayed, so it has no candidate, row, or detail here.
import {
  CompiledDerivedRule,
  CompiledInspectionRule,
  type CompiledStaticCandidateRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticNonInstructionRule,
  type ConfiguredDerivedPlan,
} from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import { join } from 'node:path';
import { readCandidate, rethrowIfResourceExhaustion, statThroughLink } from '../traversal';
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
 * A Codex rule of every other kind, compiled for execution. It answers nothing
 * about applicability, which is exactly what a skill rule has to say about it
 * (see `CompiledNonInstructionRule`).
 */
export class CodexCompiledOtherKindRule
  extends CodexCompiledRule
  implements CompiledStaticNonInstructionRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<CustomizationKind, 'instructions'>;

  /** Compiles one Codex record of any kind but `instructions`. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind === 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} needs the Codex instruction unit`);
    }
  }
}

/**
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers static instructions and skills,
 * with the configured instruction fallbacks reaching the same walk through
 * the derived rule below.
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
    // An instruction record compiles into the unit that can answer what its
    // files govern; every other kind compiles into the plain one.
    rule.kind === 'instructions'
      ? new CodexCompiledInstructionRule(rule)
      : new CodexCompiledOtherKindRule(rule),
  );

/**
 * The compiled `codex.derived.fallback-basename` unit the configuration-read
 * stage expands (T1089): the seed is the repository's own `.codex/config.toml`
 * read as configuration, and the derived targets are `instructions` candidates
 * at the Repository root, one per declared basename, scanned by the same walk
 * as every static candidate.
 */
export const CODEX_DERIVED_FALLBACK_RULE = new CompiledDerivedRule(
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
);

/**
 * Reads one configuration seed's text for a vendor's configuration-read
 * logic (T1090): probes the exact pinned path, and returns the decoded text
 * of a present, readable seed — through the same single read path as every
 * published file — or null otherwise.
 *
 * An absent seed configures nothing — the probe's failure is the absence
 * fact. An unreadable or binary seed also configures nothing here: the seed
 * is a configuration input only, never a published candidate, so there is no
 * row or diagnostic for it to carry, and null is the whole outcome.
 */
async function readConfigurationSeedText(
  root: string,
  seedSegments: readonly string[],
): Promise<string | null> {
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
    return null;
  }
  if (!target.isFile) {
    // A directory, FIFO, socket, or device at the pinned path configures
    // nothing. The type is decided before the read because the one flag-free
    // `readFile` below would block indefinitely on a FIFO — the same gate
    // `probeExactTarget` applies to an exact target, and the walk gets from
    // its directory-entry types.
    return null;
  }
  const outcome = await readCandidate(absolutePath);
  return outcome.kind === 'readable' ? outcome.sourceText : null;
}

/**
 * The configured fallback basenames one carrier document declares, in
 * authored order — or null when the field is absent or is not a string array,
 * which both mean the carrier configures nothing. Throws on a document TOML
 * cannot parse; the caller's extraction boundary owns that throw as
 * "configures nothing" too, because the carrier is never published and has no
 * recognition to fail.
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
  return Array.isArray(declared) && declared.every((value) => typeof value === 'string')
    ? declared
    : null;
}

/**
 * Codex's configuration-read contribution (T1090): reads the root
 * `.codex/config.toml` — configuration deciding what counts as an
 * instruction file, before any candidate is scanned — and expands the
 * declared fallback basenames into the plan the same walk executes under
 * {@link CODEX_DERIVED_FALLBACK_RULE}'s identity. An absent, unreadable,
 * malformed, or invalidly-declaring carrier configures nothing, and the
 * carrier itself is never a candidate.
 */
export async function readCodexConfiguredFallbackPlans(
  root: string,
): Promise<readonly ConfiguredDerivedPlan[]> {
  const seedText = await readConfigurationSeedText(root, ['.codex', 'config.toml']);
  if (seedText === null) {
    return [];
  }
  // The extraction boundary is the one sanctioned soft-failure seam: a parse
  // throw becomes the `failed` status here instead of a bare catch.
  const extraction = RecognitionExtraction.run(seedText, configuredFallbackBasenamesOf);
  const basenames = extraction.extracted ?? null;
  return basenames !== null && basenames.length > 0
    ? [{ rule: CODEX_DERIVED_FALLBACK_RULE, plan: CODEX_DERIVED_FALLBACK_RULE.planFor(basenames) }]
    : [];
}
