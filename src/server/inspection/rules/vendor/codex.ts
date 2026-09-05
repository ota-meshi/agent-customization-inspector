// The compiled rule every Codex unit extends: the shared compilation from
// `registry.ts`, plus what is this vendor's — the `tool` literal a mixed rule
// list discriminates on, and the relations resolved from Codex's own catalog
// by the rule's own identity (AGENTS.md § Class and interface policy).
//
// It is a module of its own because this vendor's units are written in two:
// the kinds a file is read as in `../codex.ts`, and the plugin carriers in
// `../plugins/codex.ts`. A base declared in either would have to be imported
// back by the other, and a class cannot extend a base whose module is still
// being evaluated.
import { CompiledDerivedRule, CompiledInspectionRule, type SelectionPolicy } from '../registry';
import { CODEX_RULE_RELATIONS } from '../../../../shared/registries/codex/relations';
import type { RuleId } from '../../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

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

  /**
   * Compiles one Codex record, rejecting one another product owns.
   *
   * `selectionPolicy` is passed through for the one Codex rule whose selection
   * depends on what it read: the Global instruction pair
   * ({@link CodexCompiledGlobalInstructionRule}).
   */
  public constructor(rule: InspectionRule, selectionPolicy?: SelectionPolicy) {
    super(rule, selectionPolicy);
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
 * A Codex derived rule compiled for execution: the shared derivation from the
 * base, plus what is Codex's own — the same two things a static Codex rule
 * fixes, for the same reasons. A derived candidate is recognized and rendered
 * exactly like a static one, so it has to answer the same questions: which
 * product recognized it, and which documented behavior its rule rests on.
 */
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
