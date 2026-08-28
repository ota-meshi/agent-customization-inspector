// The cross-vendor inspection rules: policy no single vendor owns
// (contracts/runtime-composition.md § Shared non-read exclusions). Exactly one
// record lives here — the shared non-read exclusion over managed,
// organization, hosted, remote, and state surfaces — and it authorizes
// nothing: an `excluded` rule exists so the consent flow can state what this
// product never looks at, across every vendor at once.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { SharedRuleId } from '../identifier-types';
import type { InspectionRule } from '../rule-types';

/**
 * Managed, organization, hosted, remote, credential, log, cache, session,
 * runtime-state, plugin-installation, and service-side surfaces across the
 * three vendors, on record as excluded (contracts/runtime-composition.md
 * § Shared non-read exclusions). What it names, it names through the behaviors
 * it is based on (`shared/relations.ts`): Claude's separate `~/.claude.json`
 * state file and installed plugins, Codex's installed plugin copies, and the
 * five hosted Copilot surfaces no local boundary holds.
 *
 * `kind` is null because the exclusion spans kinds, and `matcher` is null
 * because a rule that admits nothing needs no selector.
 */
export const SHARED_EXCLUDED_MANAGED_REMOTE_STATE_RULE = {
  ruleId: 'shared.excluded.managed-remote-state',
  tool: 'shared',
  discoveryClass: 'excluded',
  kind: null,
  sourceKinds: ['global'],
  matcher: null,
  policyRefs: SHIPS_MAINTENANCE_DATA
    ? ['FR-013', 'FR-014', 'FR-015', 'FR-016', 'FR-017', 'FR-018', 'QR-001', 'QR-005']
    : [],
  precedenceGroup: null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'anthropic.claude-code.mcp.scopes-precedence',
          url: 'https://code.claude.com/docs/en/mcp',
          officialHost: 'code.claude.com',
          sections: ['MCP installation scopes'],
          reviewedOn: '2026-08-27',
          establishes:
            'User and local MCP server state lives in the separate ~/.claude.json file outside the configuration directory, a state file this product never reads.',
        },
        {
          sourceId: 'github.copilot.plugins',
          url: 'https://docs.github.com/en/copilot/concepts/agents/about-plugins',
          officialHost: 'docs.github.com',
          sections: ['Where can I get plugins?'],
          reviewedOn: '2026-07-15',
          establishes:
            'Installed plugin copies and marketplace state are runtime-managed installation data, distinct from the authored manifests this product may read.',
        },
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Hosted Copilot surfaces read organization- and service-side configuration this product has no local boundary for, so they stay excluded.',
        },
      ]
    : [],
} as const satisfies InspectionRule;

/**
 * The shared rule registry, keyed by the closed {@link SharedRuleId} union and
 * complete over it, exactly as each vendor's map is.
 */
export const SHARED_INSPECTION_RULES: Readonly<Record<SharedRuleId, InspectionRule>> = {
  [SHARED_EXCLUDED_MANAGED_REMOTE_STATE_RULE.ruleId]: SHARED_EXCLUDED_MANAGED_REMOTE_STATE_RULE,
};
