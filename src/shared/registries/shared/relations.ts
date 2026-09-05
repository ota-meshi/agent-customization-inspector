// The shared rules' edges into other registries — the cross-vendor slice of
// the reference graph. It imports each vendor's behavior records directly,
// which the acyclic graph permits: behaviors have no outgoing edges, so a
// shared rule naming three vendors' behaviors closes no cycle.
import { CLAUDE_USER_MCP_STATE_BEHAVIOR, CLAUDE_USER_PLUGINS_BEHAVIOR } from '../claude/behaviors';
import { CODEX_USER_PLUGINS_BEHAVIOR } from '../codex/behaviors';
import {
  COPILOT_CLOUD_MCP_BEHAVIOR,
  COPILOT_CLOUD_ORGANIZATION_AGENTS_BEHAVIOR,
  COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR,
  COPILOT_CLOUD_PLUGINS_BEHAVIOR,
  COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
} from '../copilot/behaviors';
import { SHARED_EXCLUDED_MANAGED_REMOTE_STATE_RULE } from './rules';
import type { RuleRelations } from '../relation-types';
import type { SharedRuleId } from '../identifier-types';

/**
 * What the one shared rule is based on
 * (contracts/runtime-composition.md § Shared non-read exclusions): the
 * managed, remote, and state surfaces of all three vendors that no local
 * consented boundary holds — Claude's separate `~/.claude.json` state file and
 * installed plugins, Codex's installed plugin copies, and the five hosted
 * Copilot surfaces. A vendor's own home-directory surfaces are its own
 * `*.excluded.user-runtime`'s, never this rule's.
 *
 * It is explained by no strategy: an exclusion says this product never looks,
 * so there is no composition for one to describe.
 */
export const SHARED_RULE_RELATIONS: Readonly<Record<SharedRuleId, RuleRelations>> = {
  [SHARED_EXCLUDED_MANAGED_REMOTE_STATE_RULE.ruleId]: {
    basedOnBehaviors: [
      CLAUDE_USER_MCP_STATE_BEHAVIOR,
      CLAUDE_USER_PLUGINS_BEHAVIOR,
      CODEX_USER_PLUGINS_BEHAVIOR,
      COPILOT_CLOUD_MCP_BEHAVIOR,
      COPILOT_CLOUD_ORGANIZATION_AGENTS_BEHAVIOR,
      COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR,
      COPILOT_CLOUD_PLUGINS_BEHAVIOR,
      COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
    ],
    explainedByStrategies: [],
  },
};
