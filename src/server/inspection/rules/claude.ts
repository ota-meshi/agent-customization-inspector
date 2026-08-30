// Claude classification over the registry-compiled inspection rules (T135,
// extended by T234). This module owns no walker and no selector semantics of
// its own: it takes the shipped Claude matchers, hands them to the one registry
// compiler, and pairs the resulting immutable `TraversalPlan`s with each rule's
// identity. Discovery itself is executed by `traversal.ts` against those plans.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
import { ClaudeCompiledRule } from './vendor/claude';
import { ClaudeCompiledAgentRule } from './agents/claude';
import { ClaudeCompiledOutputStyleRule } from './output-styles/claude';
import { ClaudeCompiledSkillRule } from './skills/claude';
import { ClaudeCompiledPermissionsCarrierRule } from './permissions/claude';
import { ClaudeCompiledMcpCarrierRule } from './mcp/claude';
import { ClaudeCompiledPromptRule } from './prompts-and-commands/claude';
import { ClaudeCompiledInstructionRule } from './instructions/claude';
import { ClaudeCompiledSettingsHookRule } from './hooks/claude';
import type { CompiledStaticCandidateRule, CompiledStaticOtherKindRule } from './registry';
import {
  ClaudeCompiledPluginCatalogRule,
  ClaudeCompiledPluginManifestRule,
} from './plugins/claude';
import type { CustomizationKind } from '../../../shared/entities';
import { CLAUDE_INSPECTION_RULES } from '../../../shared/registries/claude/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Claude rule of every other kind, compiled for execution. It answers no
 * per-kind question — nothing about applicability, nothing a carrier
 * declares, nothing a file is invoked by (see
 * `CompiledStaticOtherKindRule`).
 */
export class ClaudeCompiledOtherKindRule
  extends ClaudeCompiledRule
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

  /** Compiles one Claude record of any kind but the eight with a question of their own. */
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
      rule.kind === 'output style'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Claude unit that answers for its kind`);
    }
  }
}

/**
 * The Claude rules a consented Global scan executes: every static candidate
 * this vendor's catalog admits below the consented `<claude-config-dir>` —
 * the instruction file directly below it, and each further kind the contract
 * places in that home (contracts/vendors/claude-code.md § Inspector Global
 * rules). Derived from the shipped catalog by boundary rather than listed
 * here, so a rule added to a member home cannot be missed by this map.
 *
 * Separate from the Repository catalog rather than filtered out of it at call
 * time, because the two are executed against different roots: a scan is given
 * the catalog for the Source it is scanning, and there is no call site that
 * should have to decide which rules of a mixed list apply to the root it holds.
 *
 * It compiles through the same instruction unit as its Repository siblings, so
 * what an admitted Global instruction file governs is answered by the same code
 * path — the applicability range of a file below a vendor home is still a fact
 * about an instruction file, and for a file at the root of that home the unit's
 * own derivation answers `**`. The unit's constructor is also what refuses a
 * Global Claude record of any other kind, at module load rather than at scan
 * time.
 */
export const CLAUDE_GLOBAL_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CLAUDE_INSPECTION_RULES,
)
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('global'),
  )
  // Each record compiles into the unit that answers its kind's question — the
  // same dispatch the Repository catalog uses, minus the plugin branches
  // whose rule IDs only exist at the Repository scope — because the consented
  // home's rule is the same vendor's reading at another boundary.
  .map((rule) =>
    rule.kind === 'instructions'
      ? new ClaudeCompiledInstructionRule(rule)
      : rule.kind === 'skill'
        ? new ClaudeCompiledSkillRule(rule)
        : rule.kind === 'agent'
          ? new ClaudeCompiledAgentRule(rule)
          : rule.kind === 'prompt/command'
            ? new ClaudeCompiledPromptRule(rule)
            : rule.kind === 'permissions'
              ? new ClaudeCompiledPermissionsCarrierRule(rule)
              : rule.kind === 'output style'
                ? new ClaudeCompiledOutputStyleRule(rule)
                : rule.kind === 'hook'
                  ? new ClaudeCompiledSettingsHookRule(rule)
                  : new ClaudeCompiledOtherKindRule(rule),
  );

/**
 * The Claude Repository rules a Repository scan executes, in shipped order —
 * every Repository row of this vendor's contract, derived from the catalog
 * rather than listed here. They cover instructions, skills, commands, the
 * MCP carrier, rule files, the permission policy, custom agents, and the
 * settings documents — the last two rules over one candidate, since
 * `.claude/settings*.json` is both the permission policy's carrier and a
 * settings document of its own (FR-007).
 *
 * The selection is by declared class and by scope, as the Codex list's is: the
 * catalog carries `excluded` rows — `claude.excluded.plugin-files` and
 * `claude.excluded.user-runtime`, which authorize no traversal by definition —
 * and one Global rule, so the Repository static candidates are taken and every
 * one of them is compiled. A static record that still cannot be executed fails the
 * build that ships it through the {@link ClaudeCompiledRule} constructor's
 * guard rather than disappearing from the scan.
 */
export const CLAUDE_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CLAUDE_INSPECTION_RULES,
)
  // Selected by scope as well as by class. A Global rule's base is a consented
  // vendor home, so executing one here would run a Global selector against the
  // Repository root — a read nobody consented to, of a path that means
  // something else. {@link CLAUDE_GLOBAL_RULES} above is where they go.
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('repository'),
  )
  .map((rule) =>
    // Each record compiles into the unit that can answer its kind's question:
    // an instruction record what its files govern, a command record the name its
    // files are invoked by, an MCP record which servers its carrier declares, a
    // custom-agent record where its file's configuration ends and its
    // instructions begin, a skill record the command name its file is invoked
    // by; every other kind compiles into the plain one, which is what keeps a
    // rule-file rule from carrying an answer it has none of.
    //
    // The `plugin` kind is the one that dispatches on the rule rather than the
    // kind, because this vendor admits both carriers of it: a catalog resolves
    // many names out of its `plugins` array, and a skills-directory manifest
    // declares the one plugin the folder holding it is
    // (contracts/vendors/claude-code.md § Repository vendor behavior).
    rule.kind === 'instructions'
      ? new ClaudeCompiledInstructionRule(rule)
      : rule.kind === 'skill'
        ? new ClaudeCompiledSkillRule(rule)
        : rule.kind === 'MCP'
          ? new ClaudeCompiledMcpCarrierRule(rule)
          : rule.kind === 'agent'
            ? new ClaudeCompiledAgentRule(rule)
            : rule.kind === 'prompt/command'
              ? new ClaudeCompiledPromptRule(rule)
              : rule.kind === 'permissions'
                ? new ClaudeCompiledPermissionsCarrierRule(rule)
                : rule.kind === 'output style'
                  ? new ClaudeCompiledOutputStyleRule(rule)
                  : rule.kind === 'hook'
                    ? new ClaudeCompiledSettingsHookRule(rule)
                    : rule.ruleId === 'claude.repo.marketplace'
                      ? new ClaudeCompiledPluginCatalogRule(rule)
                      : rule.ruleId === 'claude.repo.skills-directory-plugin'
                        ? new ClaudeCompiledPluginManifestRule(rule)
                        : new ClaudeCompiledOtherKindRule(rule),
  );
