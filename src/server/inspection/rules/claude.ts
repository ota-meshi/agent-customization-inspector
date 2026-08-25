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
    | 'plugin'
    | 'output style'
  >;

  /** Compiles one Claude record of any kind but the seven with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'skill' ||
      rule.kind === 'MCP' ||
      rule.kind === 'agent' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'permissions' ||
      rule.kind === 'output style'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Claude unit that answers for its kind`);
    }
  }
}

/**
 * The Claude Repository rules a Repository scan executes, in shipped order.
 * The remaining Claude rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers instructions, skills, commands, the
 * MCP carrier, rule files, the permission policy, custom agents, and the
 * settings documents — the last two rules over one candidate, since
 * `.claude/settings*.json` is both the permission policy's carrier and a
 * settings document of its own (FR-007).
 *
 * The selection is by declared class, as the Codex list's is: the catalog now
 * carries an `excluded` row — `claude.excluded.plugin-files`, which authorizes
 * no traversal by definition — so the static candidates are taken and every one
 * of them is compiled. A static record that still cannot be executed fails the
 * build that ships it through the {@link ClaudeCompiledRule} constructor's
 * guard rather than disappearing from the scan.
 */
export const CLAUDE_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CLAUDE_INSPECTION_RULES,
)
  .filter((rule) => rule.discoveryClass === 'static-candidate')
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
                  : rule.ruleId === 'claude.repo.marketplace'
                    ? new ClaudeCompiledPluginCatalogRule(rule)
                    : rule.ruleId === 'claude.repo.skills-directory-plugin'
                      ? new ClaudeCompiledPluginManifestRule(rule)
                      : new ClaudeCompiledOtherKindRule(rule),
  );
