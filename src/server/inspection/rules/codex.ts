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
import { compileTraversalPlan, type CompiledInspectionRule } from './registry';
import { CODEX_RULE_RELATIONS } from '../../../shared/registries/codex/relations';
import { CODEX_REPO_SKILL_RULE } from '../../../shared/registries/codex/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';
import type { CodexRuleId } from '../../../shared/registries/identifier-types';

// Compiles one shipped rule's matcher. A rule that is not a matcher-bearing
// static candidate is an authoring error in the shipped registry, so it fails
// loudly at module load instead of silently contributing no plan; a silently
// absent plan would read as "this repository has no Codex skills".
function compileStaticRule(rule: InspectionRule & { ruleId: CodexRuleId }): CompiledInspectionRule {
  if (rule.discoveryClass !== 'static-candidate' || rule.matcher === null) {
    throw new TypeError(`rule ${rule.ruleId} is not a matcher-bearing static candidate`);
  }
  if (rule.kind === null) {
    throw new TypeError(`rule ${rule.ruleId} admits candidates but names no recognition kind`);
  }
  if (rule.tool === 'shared') {
    throw new TypeError(`rule ${rule.ruleId} is shared and has no owning Codex tool`);
  }
  return {
    rule,
    relations: CODEX_RULE_RELATIONS[rule.ruleId],
    tool: rule.tool,
    kind: rule.kind,
    plan: compileTraversalPlan(rule.matcher),
  };
}

/**
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; this milestone ships skills only, so a repository whose
 * only Codex files are configs legitimately produces an empty inventory.
 */
export const CODEX_REPOSITORY_RULES: readonly CompiledInspectionRule[] = [
  compileStaticRule(CODEX_REPO_SKILL_RULE),
];
