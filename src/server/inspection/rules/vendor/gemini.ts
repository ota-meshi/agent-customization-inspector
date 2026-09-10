// The compiled rule every Gemini CLI unit extends: the shared compilation from
// `registry.ts`, plus what is this vendor's — the `tool` literal a mixed rule
// list discriminates on, and the relations resolved from Gemini CLI's own
// catalog by the rule's own identity (AGENTS.md § Class and interface policy).
//
// A module of its own for the reason `../vendor/codex.ts` is: this vendor's
// units are written across the per-kind directories and `../gemini.ts`, and a
// base declared in any of them would have to be imported back by the others.
import { CompiledDerivedRule, CompiledInspectionRule } from '../registry';
import { GEMINI_RULE_RELATIONS } from '../../../../shared/registries/gemini/relations';
import type { RuleId } from '../../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Gemini CLI rule compiled for execution: the shared compilation from the
 * base, plus what is Gemini CLI's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from its catalog by the rule's
 * own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class GeminiCompiledRule extends CompiledInspectionRule {
  /** Always `gemini`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'gemini';

  /** The rule's edges from {@link GEMINI_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /**
   * Compiles one Gemini CLI record, rejecting one another product owns. No
   * selection policy is passed through: every Gemini CLI rule admits all of
   * its matches, so the base's default is the whole answer.
   */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'gemini') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Gemini-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = GEMINI_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Gemini CLI relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Gemini CLI derived rule compiled for execution: the shared derivation from
 * the base, plus what is Gemini CLI's own — the same two things a static rule
 * fixes, for the same reasons. A derived candidate is recognized and rendered
 * exactly like a static one, so it has to answer the same questions: which
 * product recognized it, and which documented behavior its rule rests on.
 */
export class GeminiCompiledDerivedRule extends CompiledDerivedRule {
  /** Always `gemini`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'gemini';

  /** The rule's edges from {@link GEMINI_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Gemini CLI derived record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'gemini') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI rule`);
    }
    this.tool = rule.tool;
    // Widened for the lookup and rejected loudly on a miss, exactly as in
    // `GeminiCompiledRule`.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = GEMINI_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Gemini CLI relations`);
    }
    this.relations = edges;
  }
}
