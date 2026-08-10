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
 * What one strategy establishes for a duplicate name: a publishable statement,
 * `selects-in-unestablished-order`, or `null` when its documented pipeline
 * establishes nothing at all.
 *
 * `selects-in-unestablished-order` is internal to this derivation and is not a
 * {@link SameNameSkillResolution}: it is what a `select-first` pipeline that
 * also records `unknown-order` establishes — the product selects rather than
 * retains, while its duplicate order is documented as unresolved. Copilot's
 * VS Code and Cloud skill selection are that shape ("do not invent a
 * duplicate-name winner", contracts/runtime-composition.md). Reading
 * `select-first` out of such a pipeline would state the very winner the
 * contract withholds, and reading nothing would erase a recorded position —
 * distinct from a pipeline like bare `filter`, which takes none.
 */
type EstablishedResolution = SameNameSkillResolution | 'selects-in-unestablished-order';

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
 * only says no order is documented among the definitions that all survive,
 * which is what keeps the row from claiming one. `retain-all` followed by
 * `select-closest` is the exact pipeline Claude Code documents for a clash
 * within one root — every definition stays available and the product picks
 * the variant matching the files it is working on — and is
 * `all-remain-context-selected`. `select-first` beside `unknown-order` is the
 * selecting pipeline whose duplicate order is recorded unresolved; see
 * {@link EstablishedResolution}. A pipeline that states none of these yields
 * nothing, and so does one that states both `retain-all` and `select-first`:
 * what a vendor documents that way is a question for evidence review, not for
 * arithmetic over an enum.
 */
function resolutionOf(strategy: RuntimeCompositionStrategy): EstablishedResolution | null {
  const retains = strategy.operations.includes('retain-all');
  const selectsFirst = strategy.operations.includes('select-first');
  if (retains && strategy.operations.includes('select-closest') && !selectsFirst) {
    return 'all-remain-context-selected';
  }
  if (retains === selectsFirst) {
    return null;
  }
  if (retains) {
    return 'all-remain';
  }
  return strategy.operations.includes('unknown-order')
    ? 'selects-in-unestablished-order'
    : 'select-first';
}

/**
 * The one statement true of every strategy in `strategies`, or `null` when
 * they establish none.
 *
 * Strategies that establish different things produce `surface-dependent`: no
 * single statement is true of the product, and naming one of them would be a
 * claim about the others. Copilot is the shipped case — its CLI establishes a
 * documented first-found winner while its VS Code and Cloud pipelines
 * establish selection in an unresolved order, so the product's one honest
 * statement is that the rule depends on the surface. A strategy that
 * establishes nothing silences the whole group instead, because "the surfaces
 * differ" is itself a claim, and one unestablished surface is not evidence
 * that they do.
 *
 * A group agreeing on `selects-in-unestablished-order` alone would have no
 * publishable member to agree on and yields `null` — what such a product's
 * row should say is evidence review for the phase that ships one, and no
 * shipped product has that shape.
 */
export function sameNameSkillResolutionOf(
  strategies: readonly RuntimeCompositionStrategy[],
): SameNameSkillResolution | null {
  let agreed: EstablishedResolution | null = null;
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
  // whose strategies establish nothing. The internal marker never publishes:
  // a whole group establishing only unresolved selection states no rule.
  return agreed === 'selects-in-unestablished-order' ? null : agreed;
}

/**
 * What each tool documents for a same-name skill, or `null` when the shipped
 * registry establishes nothing for it — which is also the answer for a product
 * whose skill rule is not shipped, and therefore recognizes no skill and can
 * reach no row. Derived once at module load: the registries are shipped
 * constants, so the projection asking per row would re-walk them for a value
 * that cannot change within a process.
 */
const SAME_NAME_SKILL_RESOLUTIONS: Readonly<Record<SupportedTool, SameNameSkillResolution | null>> =
  {
    copilot: deriveSameNameSkillResolution('copilot'),
    claude: deriveSameNameSkillResolution('claude'),
    codex: deriveSameNameSkillResolution('codex'),
  };

/** Derives one tool's statement from the strategies its shipped skill rule names. */
function deriveSameNameSkillResolution(tool: SupportedTool): SameNameSkillResolution | null {
  return sameNameSkillResolutionOf(
    Object.values(INSPECTION_RULES).flatMap((rule) =>
      rule.kind === 'skill' && rule.tool === tool
        ? [...RULE_RELATIONS[rule.ruleId].explainedByStrategies]
        : [],
    ),
  );
}

/** Reads one tool's derived same-name statement; see {@link SAME_NAME_SKILL_RESOLUTIONS}. */
export function sameNameSkillResolutionFor(tool: SupportedTool): SameNameSkillResolution | null {
  return SAME_NAME_SKILL_RESOLUTIONS[tool];
}
