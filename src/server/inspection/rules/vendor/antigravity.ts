// The compiled rule every Antigravity CLI unit extends: the shared compilation
// from `registry.ts`, plus what is this vendor's — the `tool` literal a mixed
// rule list discriminates on, and the relations resolved from Antigravity CLI's
// own catalog by the rule's own identity (AGENTS.md § Class and interface
// policy).
//
// A module of its own for the reason `../vendor/codex.ts` is: this vendor's
// units are written across the per-kind directories and `../antigravity.ts`,
// and a base declared in any of them would have to be imported back by the
// others.
//
// There is no derived counterpart here: this vendor ships no derived rule,
// because no cited page documents a terminal setting that renames or relocates
// a workspace customization (contracts/vendors/antigravity-cli.md § Derived
// Repository rules).
import { CompiledInspectionRule } from '../registry';
import { ANTIGRAVITY_RULE_RELATIONS } from '../../../../shared/registries/antigravity/relations';
import type { RuleId } from '../../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * An Antigravity CLI rule compiled for execution: the shared compilation from
 * the base, plus what is Antigravity CLI's own — the `tool` literal a mixed
 * rule list discriminates on, and the relations resolved from its catalog by
 * the rule's own identity, so no rule can be compiled with another rule's
 * edges.
 */
export abstract class AntigravityCompiledRule extends CompiledInspectionRule {
  /** Always `antigravity`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'antigravity';

  /** The rule's edges from {@link ANTIGRAVITY_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /**
   * Compiles one Antigravity CLI record, rejecting one another product owns.
   * No selection policy is passed through: every Antigravity CLI rule admits
   * all of its matches, so the base's default is the whole answer.
   */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'antigravity') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply an
    // Antigravity-tagged record whose ID another vendor's catalog owns. The
    // lookup must fail loudly rather than compile that record with another
    // vendor's edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = ANTIGRAVITY_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Antigravity CLI relations`);
    }
    this.relations = edges;
  }
}
