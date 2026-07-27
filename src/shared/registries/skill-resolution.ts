// What each product documents for a skill name that several definitions
// declare, derived from that product's shipped composition strategies
// (contracts/runtime-composition.md). A grouped inventory row publishes this
// instead of ordering its definitions, because the Inspector states what the
// vendors state and no more (FR-007).
//
// Derived rather than tabulated. A strategy's `operations` already carry the
// documented outcome, so a second hand-written statement beside them would be
// a state that can disagree with the first — and a gate that only detects the
// disagreement is a third place holding the same rule.
//
// Nothing here assigns a meaning to an operation the vendors have not
// established. Each statement is recognized from the exact pipeline that
// establishes it and nothing else; every other pipeline yields no statement,
// which is the silence a product with no shipped skill strategy already
// produces. Deciding what a new pipeline means is evidence review, not
// arithmetic over an enum.
//
// A product's strategies are reached through the rule they explain
// (`RuleRelations.explainedByStrategies`), which is the graph's own edge. A
// strategy carries no customization kind of its own, and recognizing one by
// its identifier text would make an unrelated ID that happens to contain
// `skill` a skill strategy — and a skill strategy named otherwise invisible.
import { INSPECTION_RULES } from './inspection-rules';
import { RULE_RELATIONS } from './relations';
import type { SameNameSkillResolution, SupportedTool } from '../entities';
import type { RuntimeCompositionStrategy } from './strategy-types';

/**
 * The statement one strategy establishes, or `null` when its documented
 * pipeline establishes none.
 *
 * Each statement is read from the operation that states it, never from the
 * absence of others: `operations` records the steps a source documents, not
 * the steps it rules out, so a pipeline without a collapsing entry does not
 * thereby say that every definition survives.
 *
 * `retain-all` is that statement for `all-remain`; `unknown-order` beside it
 * only says no order is documented, which is what keeps the row from claiming
 * one. A pipeline that states neither yields nothing, and so does one that
 * states both `retain-all` and a selection: what a vendor documents that way
 * is a question for evidence review, not for arithmetic over an enum.
 */
function resolutionOf(strategy: RuntimeCompositionStrategy): SameNameSkillResolution | null {
  const retains = strategy.operations.includes('retain-all');
  const selectsFirst = strategy.operations.includes('select-first');
  if (retains === selectsFirst) {
    return null;
  }
  return retains ? 'all-remain' : 'select-first';
}

/**
 * The one statement true of every strategy in `strategies`, or `null` when
 * they establish none.
 *
 * Strategies that disagree produce `surface-dependent`: no single statement is
 * true of the product, and naming one of them would be a claim about the
 * other. A strategy that establishes nothing silences the whole group instead,
 * because "the surfaces differ" is itself a claim, and one unestablished
 * surface is not evidence that they do.
 *
 * Takes the strategies rather than reading them, so the outcome for a product
 * whose surfaces disagree — which no shipped product has yet — is a call away
 * rather than unreachable until one ships.
 */
export function sameNameSkillResolutionOf(
  strategies: readonly RuntimeCompositionStrategy[],
): SameNameSkillResolution | null {
  let agreed: SameNameSkillResolution | null = null;
  for (const strategy of strategies) {
    const resolution = resolutionOf(strategy);
    if (resolution === null) {
      return null;
    }
    if (agreed === null) {
      agreed = resolution;
    } else if (agreed !== resolution) {
      return 'surface-dependent';
    }
  }
  // Null here means the group was empty, which is the same silence as a group
  // whose strategies establish nothing.
  return agreed;
}

/**
 * What `tool` documents for a same-name skill, or `null` when the shipped
 * registry establishes nothing for it — which is also the answer for a product
 * whose skill rule is not shipped, and therefore recognizes no skill and can
 * reach no row.
 */
export function sameNameSkillResolutionFor(tool: SupportedTool): SameNameSkillResolution | null {
  return sameNameSkillResolutionOf(
    Object.values(INSPECTION_RULES).flatMap((rule) =>
      rule.kind === 'skill' && rule.tool === tool
        ? [...RULE_RELATIONS[rule.ruleId].explainedByStrategies]
        : [],
    ),
  );
}
