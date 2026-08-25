// The compiled rule every Copilot unit extends: the shared compilation from
// `registry.ts`, plus what is this vendor's — the `tool` literal a mixed rule
// list discriminates on, and the relations resolved from Copilot's own catalog
// by the rule's own identity (AGENTS.md § Class and interface policy).
//
// It is a module of its own because this vendor's units are written in two:
// the kinds a file is read as in `../copilot.ts`, and the plugin carriers in
// `../plugins/copilot.ts`. A base declared in either would have to be imported
// back by the other, and a class cannot extend a base whose module is still
// being evaluated.
import { CompiledInspectionRule } from '../registry';
import { COPILOT_RULE_RELATIONS } from '../../../../shared/registries/copilot/relations';
import type { RuleId } from '../../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Copilot rule compiled for execution: the shared compilation from the base,
 * plus what is Copilot's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Copilot's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class CopilotCompiledRule extends CompiledInspectionRule {
  /** Always `copilot`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'copilot';

  /** The rule's edges from {@link COPILOT_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Copilot record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'copilot') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Copilot-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = COPILOT_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Copilot relations`);
    }
    this.relations = edges;
  }
}
