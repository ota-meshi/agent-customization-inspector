// Gemini CLI classification over the registry-compiled inspection rules. This
// module owns no walker and no selector semantics of its own: it takes the
// shipped Gemini CLI matchers, hands them to the one registry compiler, and
// pairs the resulting immutable `TraversalPlan`s with each rule's identity.
// Discovery itself is executed by `traversal.ts` against those plans
// (contracts/inspection-path-allowlist.md § "Vendor locators are not Inspector
// matchers").
//
// The vendor's configuration-read logic — plain code that reads the root
// `.gemini/settings.json` before a scan, takes `context.fileName`, and builds
// the one context-file plan the walk executes, default or configured — lives
// in `./instructions/gemini.ts` and is re-exported here so the scan composes
// each vendor's reader exactly like the rule catalogs
// (contracts/vendors/gemini-cli.md § Derived Repository rules). The settings
// file is also a candidate of its own, admitted by three rules over one read:
// `gemini.repo.settings` for the document, `gemini.repo.mcp` for the
// `mcpServers` map it carries, and `gemini.repo.hooks` for its `hooks` object.
import { GeminiCompiledRule } from './vendor/gemini';
import { GeminiCompiledAgentRule } from './agents/gemini';
import { GeminiCompiledSkillRule } from './skills/gemini';
import { GeminiCompiledCommandRule } from './prompts-and-commands/gemini';
import { GeminiCompiledPolicyDocumentRule } from './permissions/gemini';
import { GeminiCompiledMcpCarrierRule } from './mcp/gemini';
import { GeminiCompiledSettingsHookRule } from './hooks/gemini';
import { GeminiCompiledInstructionRule } from './instructions/gemini';
import type { CompiledStaticCandidateRule, CompiledStaticOtherKindRule } from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import { GEMINI_INSPECTION_RULES } from '../../../shared/registries/gemini/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';

// The configuration read a scan performs before any candidate is scanned is
// this vendor's context-filename derivation, published from here so nothing
// outside `rules/` imports the instructions directory.
export { readGeminiConfiguredContextPlans } from './instructions/gemini';

/**
 * A Gemini CLI rule of every other kind, compiled for execution — the
 * `settings/config` document. It answers no per-kind question (see
 * `CompiledStaticOtherKindRule`).
 */
export class GeminiCompiledOtherKindRule
  extends GeminiCompiledRule
  implements CompiledStaticOtherKindRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<
    CustomizationKind,
    | 'instructions'
    | 'skill'
    | 'MCP'
    | 'agent'
    | 'prompt/command'
    | 'permissions'
    | 'hook'
    | 'plugin'
    | 'output style'
  >;

  /** Compiles one Gemini CLI record of any kind but the ones with a unit of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'skill' ||
      rule.kind === 'MCP' ||
      rule.kind === 'agent' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'permissions' ||
      rule.kind === 'hook' ||
      // No shipped rule of this vendor carries either kind; the exclusions
      // keep the unit's type in step with the base.
      rule.kind === 'plugin' ||
      rule.kind === 'output style'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Gemini CLI unit that answers for its kind`);
    }
  }
}

/**
 * Each shipped record compiled into the unit that answers its kind's question:
 * an instruction record what its file governs, a skill record what Gemini CLI
 * invokes it by, an MCP record which servers its carrier declares, a hook
 * record which events, an agent record what its file declares, a command record
 * its `:`-joined name, a policy record nothing (the document is the policy),
 * and the settings document the plain unit. The same dispatch serves every
 * scope, because the vendor reads one format at each of its tiers.
 */
function compileGeminiRule(rule: InspectionRule): CompiledStaticCandidateRule {
  return rule.kind === 'instructions'
    ? new GeminiCompiledInstructionRule(rule)
    : rule.kind === 'skill'
      ? new GeminiCompiledSkillRule(rule)
      : rule.kind === 'MCP'
        ? new GeminiCompiledMcpCarrierRule(rule)
        : rule.kind === 'hook'
          ? new GeminiCompiledSettingsHookRule(rule)
          : rule.kind === 'agent'
            ? new GeminiCompiledAgentRule(rule)
            : rule.kind === 'prompt/command'
              ? new GeminiCompiledCommandRule(rule)
              : rule.kind === 'permissions'
                ? new GeminiCompiledPolicyDocumentRule(rule)
                : new GeminiCompiledOtherKindRule(rule);
}

/**
 * The Gemini CLI Repository rules a Repository scan executes, in shipped order —
 * every static Repository row of this vendor's contract, derived from the
 * catalog rather than listed here. The context file is not among them: its
 * rule is the derivation the configuration-read stage expands
 * (`readGeminiConfiguredContextPlans`), so the static rows are the settings
 * carrier's three recognitions, the commands, the skills, and the sub-agents.
 *
 * Selected by scope as well as by class: a Global rule's base is a consented
 * home, so executing one here would run a Global selector against the
 * Repository root — a read nobody consented to, of a path that means
 * something else.
 */
export const GEMINI_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  GEMINI_INSPECTION_RULES,
)
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('repository'),
  )
  .map(compileGeminiRule);

/**
 * The Gemini CLI rules a consented scan executes, split by the boundary each
 * compiled plan carries: `GEMINI_GLOBAL_RULES` below the Gemini CLI home —
 * the global context file, the settings document with its MCP and hook
 * recognitions, commands, skills, sub-agents, and policies — and
 * `GEMINI_AGENTS_HOME_RULES` below the shared agent home, the personal skills
 * alias where one admitted file carries this vendor's recognition beside
 * Codex's and Copilot's (FR-045). The boundary the plan carries decides the
 * member catalog, so a rule cannot end up scanned against a root its
 * selector was never authored for.
 *
 * The defaults stand in for groups the grouping's `Partial` result cannot
 * promise; the registry contract gates freeze both catalogs non-empty, so an
 * empty list here is a registry change those gates fail on, never a silent
 * state a reader meets.
 */
export const { gemini: GEMINI_GLOBAL_RULES = [], agents: GEMINI_AGENTS_HOME_RULES = [] } =
  Object.groupBy(
    Object.values(GEMINI_INSPECTION_RULES)
      .filter(
        (rule) =>
          rule.discoveryClass === 'static-candidate' && rule.matcher?.base.kind === 'global',
      )
      .map(compileGeminiRule),
    // The repository arm is the boundary union's other member, which the filter
    // above keeps out of this population, so no group ever forms under it.
    (compiled) =>
      compiled.plan.boundary.kind === 'global' ? compiled.plan.boundary.member : 'repository',
  );
