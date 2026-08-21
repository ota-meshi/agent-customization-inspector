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
  COPILOT_CLI_MCP_BEHAVIOR,
  COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
  COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
  COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR,
  COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  COPILOT_CLI_SKILLS_BEHAVIOR,
  COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR,
  COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR,
  COPILOT_CLI_USER_MCP_BEHAVIOR,
  COPILOT_CLI_USER_SKILLS_BEHAVIOR,
  COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR,
  COPILOT_CLOUD_MCP_BEHAVIOR,
  COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR,
  COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR,
  COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR,
  COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
  COPILOT_CLOUD_SKILLS_BEHAVIOR,
  COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR,
  COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
  COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  COPILOT_VSCODE_MCP_BEHAVIOR,
  COPILOT_VSCODE_SKILLS_BEHAVIOR,
  COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR,
  COPILOT_VSCODE_USER_MCP_BEHAVIOR,
  COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR,
  COPILOT_VSCODE_USER_SKILLS_BEHAVIOR,
} from './behaviors';
import {
  COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE,
  COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE,
  COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE,
  COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE,
  COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE,
  COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE,
  COPILOT_REPO_INSTRUCTIONS_PATH_RULE,
  COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE,
  COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE,
  COPILOT_REPO_MCP_RULE,
  COPILOT_REPO_MCP_VSCODE_ROOT_RULE,
  COPILOT_REPO_MCP_VSCODE_RULE,
  COPILOT_REPO_SKILL_RULE,
} from './rules';
import {
  COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
  COPILOT_CLI_MCP_SELECTION_STRATEGY,
  COPILOT_CLI_SKILLS_SELECTION_STRATEGY,
  COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
  COPILOT_CLOUD_MCP_SELECTION_STRATEGY,
  COPILOT_CLOUD_SKILLS_SELECTION_STRATEGY,
  COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
  COPILOT_VSCODE_MCP_SELECTION_STRATEGY,
  COPILOT_VSCODE_SKILLS_SELECTION_STRATEGY,
} from './strategies';
import type { RuleRelations, StrategyRelations } from '../relation-types';
import type { CopilotRuleId, CopilotStrategyId } from '../identifier-types';

/** What each Copilot strategy composes. What documents it is its own `evidence`. */
export const COPILOT_STRATEGY_RELATIONS: Readonly<Record<CopilotStrategyId, StrategyRelations>> = {
  /**
   * CLI instruction layering composes every instruction location the surface
   * documents, Repository and User alike. The User scopes are listed for the
   * same reason as in the skill selections: the strategy describes Copilot's
   * runtime, and leaving them out would misdescribe a combination of
   * repository and personal files as a combination of repository files alone.
   */
  [COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
      COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR,
    ],
  },
  /**
   * CLI MCP selection composes both documented MCP sources this product
   * records: the workspace files and the User configuration. Only the
   * workspace carriers are readable; the User statement is listed all the
   * same, because the strategy describes the CLI's runtime and omitting it
   * would misdescribe the documented session-additional/plugin/workspace/User
   * order as choosing among workspace files alone. The session-additional
   * option and plugin-provided servers are runtime and plugin state with no
   * behavior statement to consume at this milestone
   * (contracts/runtime-composition.md § copilot.cli.mcp.selection).
   */
  [COPILOT_CLI_MCP_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [COPILOT_CLI_MCP_BEHAVIOR, COPILOT_CLI_USER_MCP_BEHAVIOR],
  },
  /**
   * Cloud instruction layering composes the four Repository locations and the
   * hosted organization layer they precede — the origin-file-less fact listed
   * exactly like a located behavior, because what it lacks is a path, not a
   * place in the documented composition. Hosted personal Chat instructions are
   * deliberately absent: the support matrix does not list them as a
   * Cloud-agent layer, so composing them would be an inference.
   */
  [COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [
      COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
      COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR,
    ],
  },
  /**
   * VS Code instruction layering composes the workspace locations and the
   * personal ones documented above them in the layer order.
   */
  [COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY.strategyId]: {
    consumesBehaviors: [
      COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
      COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR,
      COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR,
    ],
  },
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
   * Cloud MCP selection composes the one hosted behavior: the out-of-box,
   * custom-agent, and repository-settings sources are that record's own
   * documented inputs, and none of them is a local file another behavior
   * could state (contracts/runtime-composition.md).
   */
  [COPILOT_CLOUD_MCP_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [COPILOT_CLOUD_MCP_BEHAVIOR],
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
  /**
   * VS Code MCP selection composes the workspace file scopes with the User
   * configuration — the release note's most-specific rule leaves the
   * same-name winner across them unresolved. An agent profile is not an
   * input: the custom-agents reference documents `mcp-servers` as not used
   * in VS Code custom agents (contracts/runtime-composition.md).
   */
  [COPILOT_VSCODE_MCP_SELECTION_STRATEGY.strategyId]: {
    consumesBehaviors: [COPILOT_VSCODE_MCP_BEHAVIOR, COPILOT_VSCODE_USER_MCP_BEHAVIOR],
  },
};

/** What each Copilot inspection rule is based on and explained by. What evidences it is its own `evidence`. */
export const COPILOT_RULE_RELATIONS: Readonly<Record<CopilotRuleId, RuleRelations>> = {
  /**
   * The additional-standard-location exclusion cites the behaviors it
   * deliberately does not authorize — an exclusion names the surfaces it
   * leaves out, which is what keeps "outside this release" distinguishable
   * from "the vendor documents nothing here". It is explained by no strategy:
   * a location that is never read takes part in no composition this product
   * can observe.
   */
  [COPILOT_EXCLUDED_ADDITIONAL_STANDARD_LOCATIONS_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
    ],
    explainedByStrategies: [],
  },
  /**
   * The extra-directories exclusion cites the behaviors whose documented
   * lookups a runtime-supplied root would extend — three instruction
   * locations, because `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` supplies additional
   * `AGENTS.md` files as well as `*.instructions.md` ones, and two skill
   * locations — which is why the record names no single kind.
   */
  [COPILOT_EXCLUDED_EXTRA_DIRECTORIES_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_CLI_SKILLS_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_VSCODE_SKILLS_BEHAVIOR,
    ],
    explainedByStrategies: [],
  },
  /**
   * `AGENTS.md` is the one instruction location all three surfaces document
   * without an Inspector-side split, so its rule rests on all three behaviors
   * and is explained by all three layerings. A file it admits therefore names
   * every Copilot surface, at the root and at any depth alike — each surface
   * reaches a nested file its own way, and which one a session performs is
   * runtime this product does not observe.
   */
  [COPILOT_REPO_INSTRUCTIONS_AGENTS_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
    ],
  },
  /**
   * The root `CLAUDE.md` rests on all three surfaces' own statements about
   * that filename — the Cloud one being the root-only alternatives record,
   * which is what makes the root the exact location admitted.
   */
  [COPILOT_REPO_INSTRUCTIONS_CLAUDE_ROOT_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
    ],
  },
  /**
   * The root `GEMINI.md` rests on two surfaces, not three: VS Code documents
   * no `GEMINI.md` at all, so a file it admits names the CLI and Cloud
   * surfaces and the editor is absent rather than assumed.
   */
  [COPILOT_REPO_INSTRUCTIONS_GEMINI_ROOT_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
      COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
    ],
  },
  /** The root-exact path-instruction subtree: the VS Code and Cloud surfaces. */
  [COPILOT_REPO_INSTRUCTIONS_PATH_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
    ],
  },
  /**
   * The CLI-context path-instruction subtree: the CLI surface alone. Its one
   * behavior is what a nested candidate's recognition names, so a file below a
   * subdirectory never claims a VS Code or Cloud location neither documents.
   */
  [COPILOT_REPO_INSTRUCTIONS_PATH_CLI_CONTEXT_RULE.ruleId]: {
    basedOnBehaviors: [COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR],
    explainedByStrategies: [COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /** The root-exact repository-wide file: the VS Code and Cloud surfaces. */
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_RULE.ruleId]: {
    basedOnBehaviors: [
      COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
      COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
    ],
    explainedByStrategies: [
      COPILOT_CLOUD_INSTRUCTIONS_LAYERING_STRATEGY,
      COPILOT_VSCODE_INSTRUCTIONS_LAYERING_STRATEGY,
    ],
  },
  /**
   * The CLI-context repository-wide file: the CLI surface alone. Together with
   * the rule above, a root file carries all three surfaces through two
   * admissions while a nested one carries the CLI's only.
   */
  [COPILOT_REPO_INSTRUCTIONS_REPOSITORY_CLI_CONTEXT_RULE.ruleId]: {
    basedOnBehaviors: [COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR],
    explainedByStrategies: [COPILOT_CLI_INSTRUCTIONS_LAYERING_STRATEGY],
  },
  /**
   * The Repository skill rule is based on the three Repository surface
   * behaviors alone — User, command, and hosted scopes are different Source
   * boundaries this rule may not read — and is explained by all three
   * selection strategies, one per surface, because no single strategy is true
   * of the product (FR-009). The grouped inventory row derives its same-name
   * statement from exactly these three (`skill-resolution.ts`).
   */
  /**
   * The CLI workspace MCP rule is based on the workspace lookup alone — the
   * User configuration, session additions, plugin servers, and hosted state
   * are different boundaries this rule may not read — and is explained by the
   * selection strategy, which owns the source order the rule deliberately
   * does not project (FR-009).
   */
  [COPILOT_REPO_MCP_RULE.ruleId]: {
    basedOnBehaviors: [COPILOT_CLI_MCP_BEHAVIOR],
    explainedByStrategies: [COPILOT_CLI_MCP_SELECTION_STRATEGY],
  },
  /**
   * The dedicated `.vscode/mcp.json` carrier rests on the VS Code workspace
   * lookup alone and is explained by the VS Code selection strategy, which
   * owns the input order the rule deliberately does not project (FR-009).
   */
  [COPILOT_REPO_MCP_VSCODE_RULE.ruleId]: {
    basedOnBehaviors: [COPILOT_VSCODE_MCP_BEHAVIOR],
    explainedByStrategies: [COPILOT_VSCODE_MCP_SELECTION_STRATEGY],
  },
  /**
   * The root `.mcp.json` path/surface provenance rests on the same VS Code
   * lookup — the release-note half of its conflict — and is explained by the
   * same strategy; that the admission carries no reading is the compiled
   * unit's own contract, not a different graph shape.
   */
  [COPILOT_REPO_MCP_VSCODE_ROOT_RULE.ruleId]: {
    basedOnBehaviors: [COPILOT_VSCODE_MCP_BEHAVIOR],
    explainedByStrategies: [COPILOT_VSCODE_MCP_SELECTION_STRATEGY],
  },
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
