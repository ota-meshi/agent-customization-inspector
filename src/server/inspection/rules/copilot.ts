// Copilot classification over the registry-compiled inspection rules (T162,
// extended by T253 through T256). This module owns no walker and no selector
// semantics of its own: it takes the shipped Copilot matchers, hands them to
// the one registry compiler, and pairs the resulting immutable
// `TraversalPlan`s with each rule's identity. Discovery itself is executed by
// `traversal.ts` against those plans.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
import { CopilotCompiledRule } from './vendor/copilot';
import { CopilotCompiledAgentRule } from './agents/copilot';
import { CopilotCompiledSkillRule } from './skills/copilot';
import {
  CopilotCompiledMcpCarrierRule,
  CopilotCompiledMcpProvenanceRule,
  CopilotCompiledVscodeMcpCarrierRule,
} from './mcp/copilot';
import {
  CopilotCompiledPromptRule,
  CopilotCompiledPromptFileRule,
} from './prompts-and-commands/copilot';
import { CopilotCompiledInstructionRule } from './instructions/copilot';
import {
  CopilotCompiledSettingsHookRule,
  CopilotCompiledStandaloneHookRule,
} from './hooks/copilot';
import type { CompiledStaticCandidateRule, CompiledStaticOtherKindRule } from './registry';
import { CopilotCompiledPluginCatalogRule } from './plugins/copilot';
import type { CustomizationKind } from '../../../shared/entities';
import { COPILOT_INSPECTION_RULES } from '../../../shared/registries/copilot/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Copilot rule of every other kind, compiled for execution. It answers no
 * per-kind question — nothing about applicability, nothing a carrier
 * declares, nothing a file is invoked by (see
 * `CompiledStaticOtherKindRule`).
 */
export class CopilotCompiledOtherKindRule
  extends CopilotCompiledRule
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

  /** Compiles one Copilot record of any kind but the eight with a question of their own. */
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
      // No shipped rule of this vendor carries the kind; the exclusion keeps
      // the unit's type in step with the base, whose `kind` an output-style
      // unit answers for (`output-styles/compiled-rule.ts` § CompiledStaticOutputStyleRule).
      rule.kind === 'output style'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Copilot unit that answers for its kind`);
    }
  }
}

/**
 * The Copilot Repository rules a Repository scan executes, in shipped order.
 * The remaining Copilot rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers instructions, skills, prompts and
 * commands, custom agents, the MCP carriers — the CLI's two root spellings
 * and the VS Code pair — and the settings documents, the CLI's own pair
 * beside the Claude-compatible subset it also reads.
 *
 * Several shipped selectors overlap other vendors' spellings — a root
 * `.agents` or `.claude` skill, a root `AGENTS.md`, a root `CLAUDE.md` — so
 * one physical file the traversal reads once is admitted for each vendor's
 * plan, and this list joining the scan catalog is what turns those candidates
 * into multi-tool recognitions rather than duplicate rows. The expansions
 * still differ where the documentation does: a nested `.claude` skill stays
 * Claude's alone, and a nested `CLAUDE.md` likewise, because Copilot documents
 * its `CLAUDE.md` alternative at the repository root only.
 *
 * Two selectors of this catalog also overlap each other, and deliberately: a
 * root `.github/copilot-instructions.md` is admitted by the root-exact rule
 * and by the CLI-context rule whose leading recursive step matches zero
 * directories. Those are two admissions of one candidate, which is what lets
 * its one recognition name all three Copilot surfaces while a nested file
 * names the CLI's alone.
 *
 * Only the read-authorizing records reach the walk. The two `excluded` records
 * this catalog ships state that a documented location was left out of the
 * release; they carry no matcher, so submitting them would be submitting
 * nothing. Every record that is selected is still compiled rather than
 * filtered by shape: a static record that authorizes no traversal is rejected
 * by the {@link CopilotCompiledRule} constructor instead of being skipped, so
 * a registry row that cannot be executed fails the build that ships it rather
 * than disappearing from the scan.
 */
export const COPILOT_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  COPILOT_INSPECTION_RULES,
)
  // Selected by scope as well as by class: a Global rule's base is a consented
  // member boundary, so executing one here would run a Global selector against
  // the Repository root. {@link COPILOT_GLOBAL_RULES} and
  // {@link COPILOT_AGENTS_HOME_RULES} below are where those go.
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('repository'),
  )
  .map((rule) =>
    // Each record compiles into the unit that can answer its kind's question:
    // an instruction record what its files govern, a command record the name
    // its files are invoked by, an agent record how its files split and what
    // names them, an MCP record which servers its carrier declares, a skill
    // record the name its file is invoked by; every other kind compiles into
    // the plain one, which is what keeps a rule-file rule from carrying an
    // answer it has none of.
    rule.kind === 'instructions'
      ? new CopilotCompiledInstructionRule(rule)
      : rule.kind === 'skill'
        ? new CopilotCompiledSkillRule(rule)
        : rule.kind === 'MCP'
          ? rule.ruleId === 'copilot.repo.mcp.vscode'
            ? new CopilotCompiledVscodeMcpCarrierRule(rule)
            : rule.ruleId === 'copilot.repo.mcp.vscode-root'
              ? new CopilotCompiledMcpProvenanceRule(rule)
              : new CopilotCompiledMcpCarrierRule(rule)
          : rule.kind === 'agent'
            ? new CopilotCompiledAgentRule(rule)
            : rule.kind === 'hook'
              ? // The standalone carrier is one file whose whole purpose is
                // hooks; the two settings rules share the contained unit,
                // because what separates them is which surfaces document the
                // read rather than how the block is written.
                rule.ruleId === 'copilot.repo.hooks'
                ? new CopilotCompiledStandaloneHookRule(rule)
                : new CopilotCompiledSettingsHookRule(rule)
              : rule.kind === 'prompt/command'
                ? rule.ruleId === 'copilot.repo.prompt'
                  ? new CopilotCompiledPromptFileRule(rule)
                  : new CopilotCompiledPromptRule(rule)
                : rule.kind === 'plugin'
                  ? new CopilotCompiledPluginCatalogRule(rule)
                  : new CopilotCompiledOtherKindRule(rule),
  );

/**
 * The Copilot rules the consented member scans execute, one catalog per
 * member, split from one compiled population by the boundary each record's
 * own matcher names — so a rule cannot be scanned against a root its selector
 * was never authored for, and the one dispatch below serves both members.
 *
 * `COPILOT_GLOBAL_RULES` is the consented `COPILOT_HOME` catalog
 * (contracts/vendors/github-copilot.md § Inspector Global rule): the personal
 * instruction pair, skills, agents, standalone and inline hooks, the settings
 * document, and the user MCP carrier. `COPILOT_AGENTS_HOME_RULES` is the
 * consented shared-agent-home catalog: the personal skills below `~/.agents`
 * (FR-045), where one admitted file carries this vendor's recognition beside
 * Codex's, exactly as one Repository `.agents/skills` file does.
 *
 * The defaults stand in for groups the grouping's `Partial` result cannot
 * promise; the registry contract gates freeze both catalogs non-empty, so an
 * empty list here is a registry change those gates fail on, never a silent
 * state a reader meets.
 */
export const { copilot: COPILOT_GLOBAL_RULES = [], agents: COPILOT_AGENTS_HOME_RULES = [] } =
  Object.groupBy(
    Object.values(COPILOT_INSPECTION_RULES)
      .filter(
        (rule) =>
          rule.discoveryClass === 'static-candidate' && rule.matcher?.base.kind === 'global',
      )
      // Each record compiles into the unit that answers its kind's question —
      // the same dispatch the Repository catalog uses, minus the branches
      // whose rule IDs only exist at the Repository scope — before the split,
      // because the shared agent home's Copilot rule is the same vendor's
      // reading at another consented boundary.
      .map((rule) =>
        rule.kind === 'instructions'
          ? new CopilotCompiledInstructionRule(rule)
          : rule.kind === 'skill'
            ? new CopilotCompiledSkillRule(rule)
            : rule.kind === 'MCP'
              ? new CopilotCompiledMcpCarrierRule(rule)
              : rule.kind === 'agent'
                ? new CopilotCompiledAgentRule(rule)
                : rule.kind === 'hook'
                  ? rule.ruleId === 'copilot.global.hooks'
                    ? new CopilotCompiledStandaloneHookRule(rule)
                    : new CopilotCompiledSettingsHookRule(rule)
                  : new CopilotCompiledOtherKindRule(rule),
      ),
    // The boundary the compiled plan carries decides the member catalog. The
    // repository arm is the boundary union's other member, which the filter
    // above keeps out of this population, so no group ever forms under it.
    (compiled) =>
      compiled.plan.boundary.kind === 'global' ? compiled.plan.boundary.member : 'repository',
  );
