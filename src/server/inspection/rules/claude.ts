// Claude classification over the registry-compiled inspection rules (T135,
// extended by T234). This module owns no walker and no selector semantics of
// its own: it takes the shipped Claude matchers, hands them to the one registry
// compiler, and pairs the resulting immutable `TraversalPlan`s with each rule's
// identity. Discovery itself is executed by `traversal.ts` against those plans.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
import {
  CompiledInspectionRule,
  escapeGlobLiteral,
  type CompiledStaticCandidateRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticNonInstructionRule,
} from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import { CLAUDE_RULE_RELATIONS } from '../../../shared/registries/claude/relations';
import { CLAUDE_INSPECTION_RULES } from '../../../shared/registries/claude/rules';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Claude rule compiled for execution: the shared compilation from the base,
 * plus what is Claude's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Claude's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class ClaudeCompiledRule extends CompiledInspectionRule {
  /** Always `claude`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'claude';

  /** The rule's edges from {@link CLAUDE_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Claude record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'claude') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Claude-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CLAUDE_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Claude relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Claude instruction rule compiled for execution: everything a Claude rule
 * is, plus the one question only an instruction rule answers — what a file it
 * admitted governs.
 *
 * Claude discovers instruction files per directory: the launch directory's at
 * session start, an ancestor's with them, a subdirectory's once it reads a
 * file there. A Claude instruction file therefore governs the directory
 * holding it rather than the whole repository, which is why Claude is the one
 * shipped product that derives a range from the path instead of answering the
 * Repository root's `**` (data-model.md § Inventory unit).
 */
export class ClaudeCompiledInstructionRule
  extends ClaudeCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * The glob one admitted Claude instruction file governs: the directory
   * holding it, with a trailing `.claude` dropped for a `CLAUDE.md` — the page
   * names `./CLAUDE.md` **or** `./.claude/CLAUDE.md` as the one project
   * instruction location, so for that filename the directory is where Claude
   * keeps the file rather than what the file governs, and both spellings land
   * on one row (anthropic.claude-code.memory.locations-load § Choose where to
   * put CLAUDE.md files).
   *
   * For every other admitted filename the segment is kept, because no cited
   * page names a `.claude` alternative for one: the same table lists local
   * instructions at `./CLAUDE.local.md` alone, so treating a
   * `.claude/CLAUDE.local.md` as the directory's own would assert an
   * equivalence the documentation does not make.
   */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(0, -1);
    if (segments.at(-1) === 'CLAUDE.md' && directory.at(-1) === '.claude') {
      directory.pop();
    }
    return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
  }

  /** Compiles one Claude instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude instruction rule`);
    }
  }
}

/**
 * A Claude rule of every other kind, compiled for execution. It answers
 * nothing about applicability, which is exactly what a skill rule has to say
 * about it (see `CompiledNonInstructionRule`).
 */
export class ClaudeCompiledOtherKindRule
  extends ClaudeCompiledRule
  implements CompiledStaticNonInstructionRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<CustomizationKind, 'instructions'>;

  /** Compiles one Claude record of any kind but `instructions`. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind === 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} needs the Claude instruction unit`);
    }
  }
}

/**
 * The Claude Repository rules a Repository scan executes, in shipped order.
 * The remaining Claude rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers instructions and skills, so a
 * repository whose only Claude files are settings or agents legitimately
 * contributes nothing to the inventory.
 *
 * Every shipped rule is compiled rather than filtered: a Claude record that
 * authorizes no traversal is rejected by the {@link ClaudeCompiledRule}
 * constructor instead of being skipped, so a registry row that cannot be
 * executed fails the build that ships it rather than disappearing from the
 * scan. Skipping arrives with the first rule whose class belongs in this
 * registry but not in this list.
 */
export const CLAUDE_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CLAUDE_INSPECTION_RULES,
).map((rule) =>
  // An instruction record compiles into the unit that can answer what its
  // files govern; every other kind compiles into the plain one, which is what
  // keeps a skill rule from carrying an answer it has none of.
  rule.kind === 'instructions'
    ? new ClaudeCompiledInstructionRule(rule)
    : new ClaudeCompiledOtherKindRule(rule),
);
