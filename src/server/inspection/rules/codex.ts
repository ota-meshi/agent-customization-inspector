// Codex classification over the registry-compiled inspection rules (T065).
// This module owns no walker and no selector semantics of its own: it takes
// the shipped `codex.repo.skill` matcher, hands it to the one registry
// compiler, and pairs the resulting immutable `TraversalPlan` with the rule's
// identity. Discovery itself is executed by `traversal.ts` against that plan.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
import { CompiledInspectionRule } from './registry';
import { CODEX_RULE_RELATIONS } from '../../../shared/registries/codex/relations';
import { CODEX_INSPECTION_RULES } from '../../../shared/registries/codex/rules';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Codex rule compiled for execution: the shared compilation from the base,
 * plus what is Codex's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Codex's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export class CodexCompiledRule extends CompiledInspectionRule {
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
    this.relations = CODEX_RULE_RELATIONS[rule.ruleId];
  }
}

/**
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; this milestone ships skills only, so a repository whose
 * only Codex files are configs legitimately produces an empty inventory.
 *
 * Every shipped rule is compiled rather than filtered: a Codex record that
 * authorizes no traversal is rejected by the {@link CodexCompiledRule}
 * constructor instead of being skipped, so a registry row that cannot be
 * executed fails the build that ships it rather than disappearing from the
 * scan. Skipping arrives with the first rule whose class belongs in this
 * registry but not in this list.
 */
export const CODEX_REPOSITORY_RULES: readonly CodexCompiledRule[] = Object.values(
  CODEX_INSPECTION_RULES,
).map((rule) => new CodexCompiledRule(rule));
