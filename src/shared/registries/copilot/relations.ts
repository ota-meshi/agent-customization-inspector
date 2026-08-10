// Every edge GitHub Copilot records draw to another registry — the Copilot
// slice of the reference graph, in one place.
//
// A behavior and a strategy edge holds the referenced record itself, so
// reading a relation (and go-to-definition) lands on the thing being named.
// The graph being acyclic is what makes that possible at all: `const` object
// references across a cycle would fail at module evaluation.
//
// Citations are not edges and are not here: each record states its own in an
// `evidence` array, where the basis sits beside the claim. They are maintenance
// data the shipped CLI must not carry, which `tsdown.config.ts` enforces
// through the `__ACI_SHIP_MAINTENANCE_DATA__` define. A behavior has no edge in
// this file at all — its only outgoing reference was a citation.
//
// Ordering is by identifier within each array, so two builds of the same
// contract agree and the materialized fixture is byte-stable.
import {
  COPILOT_CLI_COMMANDS_BEHAVIOR,
  COPILOT_CLI_SKILLS_BEHAVIOR,
  COPILOT_CLI_USER_SKILLS_BEHAVIOR,
  COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
  COPILOT_CLOUD_SKILLS_BEHAVIOR,
  COPILOT_VSCODE_SKILLS_BEHAVIOR,
  COPILOT_VSCODE_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import { COPILOT_REPO_SKILL_RULE } from './rules';
import {
  COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
  COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
  COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { CopilotRuleId, CopilotStrategyId } from '../identifier-types';

/** What each Copilot strategy composes. What documents it is its own `evidence`. */
export const COPILOT_STRATEGY_RELATIONS: Readonly<Record<CopilotStrategyId, StrategyRelations>> = {
  /**
   * CLI selection composes the project skills, the legacy commands a
   * same-name skill outranks, and the User scope below them. Listing the
   * non-readable scopes is deliberate: the strategy describes Copilot's
   * runtime, and omitting them would misdescribe the documented first-found
   * order as choosing among repository skills alone.
   */
  [COPILOT_CLI_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [
      COPILOT_CLI_COMMANDS_BEHAVIOR,
      COPILOT_CLI_SKILLS_BEHAVIOR,
      COPILOT_CLI_USER_SKILLS_BEHAVIOR,
    ],
  },
  /**
   * Cloud selection composes the repository skills and the hosted remote
   * relay whose collision behavior stays unresolved — the origin-file-less
   * fact is listed exactly like a located behavior, because what it lacks is
   * a path, not a place in the documented composition.
   */
  [COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR, COPILOT_CLOUD_SKILLS_BEHAVIOR],
  },
  /** VS Code selection composes the workspace and User skill scopes. */
  [COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [COPILOT_VSCODE_SKILLS_BEHAVIOR, COPILOT_VSCODE_USER_SKILLS_BEHAVIOR],
  },
};

/** What each Copilot inspection rule is based on and explained by. What evidences it is its own `evidence`. */
export const COPILOT_RULE_RELATIONS: Readonly<Record<CopilotRuleId, RuleRelations>> = {
  /**
   * The Repository skill rule is based on the three Repository surface
   * behaviors alone — User, command, and hosted scopes are different Source
   * boundaries this rule may not read — and is explained by all three
   * selection strategies, one per surface, because no single strategy is true
   * of the product (FR-009). The grouped inventory row derives its same-name
   * statement from exactly these three (`skill-resolution.ts`).
   */
  [COPILOT_REPO_SKILL_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_SKILLS_BEHAVIOR,
      COPILOT_CLOUD_SKILLS_BEHAVIOR,
      COPILOT_VSCODE_SKILLS_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
      COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
      COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
    ],
  },
};
