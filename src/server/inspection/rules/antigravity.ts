// Antigravity CLI classification over the registry-compiled inspection rules.
// This module owns no walker and no selector semantics of its own: it takes
// the shipped Antigravity CLI matchers, hands them to the one registry
// compiler, and pairs the resulting immutable `TraversalPlan`s with each
// rule's identity. Discovery itself is executed by `traversal.ts` against
// those plans.
//
// The separation is the point (contracts/inspection-path-allowlist.md
// § "Vendor locators are not Inspector matchers"): a vendor module that walked
// the filesystem itself, or that re-derived which rule admitted a path by
// matching the path text again, could widen the allowlist without the plan
// changing. Here the plan is the only authority, and vendor code only says
// what an already-admitted candidate is recognized as.
//
// Unlike `./codex.ts`, this module owns no configuration read: this vendor
// ships no derived rule, because no cited page documents a terminal setting
// that renames or relocates a workspace customization
// (contracts/vendors/antigravity-cli.md § Derived Repository rules). And
// unlike `./codex.ts` and `./copilot.ts`, it contributes no shared-agent-home
// catalog: this vendor's global skills live below `~/.gemini`, and no cited
// page has it read `~/.agents` (FR-045).
//
// One home file is three recognitions here, the arrangement
// `.claude/settings.json` and `.codex/config.toml` already have:
// `antigravity-cli/settings.json` is admitted by `antigravity.global.settings`
// for the document it is, by `antigravity.global.permissions` for the three
// access lists its `permissions` object declares, and by
// `antigravity.global.hooks.inline` for the hook declarations it can also
// carry. Which detail answers for it follows from the row a reader arrives
// through, never from the file (FR-007).
import { AntigravityCompiledRule } from './vendor/antigravity';
import { AntigravityCompiledAgentRule } from './agents/antigravity';
import {
  AntigravityCompiledFileSkillRule,
  AntigravityCompiledSkillRule,
} from './skills/antigravity';
import { AntigravityCompiledPermissionsCarrierRule } from './permissions/antigravity';
import { AntigravityCompiledMcpCarrierRule } from './mcp/antigravity';
import {
  AntigravityCompiledInlineHookRule,
  AntigravityCompiledStandaloneHookRule,
} from './hooks/antigravity';
import { AntigravityCompiledInstructionRule } from './instructions/antigravity';
import type { CompiledStaticCandidateRule, CompiledStaticOtherKindRule } from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import { ANTIGRAVITY_INSPECTION_RULES } from '../../../shared/registries/antigravity/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * An Antigravity CLI rule of every other kind, compiled for execution. It
 * answers no per-kind question — neither an instruction rule's applicability,
 * nor an MCP carrier's declarations, nor a custom agent's, nor a skill's name
 * (see `CompiledStaticOtherKindRule`). Two shipped kinds reach it: the home's
 * settings document, whose subject is the file, and a workspace rule, which
 * publishes the file it names and asks nothing further of its unit — the
 * activation its frontmatter declares reaches the page as the file's own
 * declarations, not as an answer this unit computes.
 */
export class AntigravityCompiledOtherKindRule
  extends AntigravityCompiledRule
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

  /** Compiles one Antigravity CLI record of any kind but the eight with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'skill' ||
      rule.kind === 'MCP' ||
      rule.kind === 'agent' ||
      rule.kind === 'permissions' ||
      rule.kind === 'hook' ||
      // No shipped rule of this vendor carries these three kinds; the
      // exclusions keep the unit's type in step with the base, whose `kind`
      // the corresponding units answer for.
      rule.kind === 'prompt/command' ||
      rule.kind === 'plugin' ||
      rule.kind === 'output style'
    ) {
      throw new TypeError(
        `rule ${rule.ruleId} needs an Antigravity CLI unit that answers for its kind`,
      );
    }
  }
}

/**
 * Compiles one shipped record into the unit that answers its kind's question.
 * Shared by both catalogs below, because this vendor's Repository and Global
 * rules of one kind ask the same question of the same reading — a skill's
 * name is a skill's name at either boundary — and the two catalogs differ
 * only in which boundary they select.
 *
 * Two branches select by the record's own identity rather than by its kind,
 * and each is a place where one kind has two readings: the skill shapes, whose
 * row units differ (research.md § 2), and the hook carriers, where a file
 * whose whole purpose is hooks and a settings document that also declares them
 * are the split Codex's catalog already makes. The flat skill rules and the
 * inline hook rule are named explicitly, so a rule added later reaches the
 * directory-shaped and standalone units unless someone decides otherwise.
 */
function compileAntigravityRule(rule: InspectionRule): CompiledStaticCandidateRule {
  switch (rule.kind) {
    case 'instructions':
      return new AntigravityCompiledInstructionRule(rule);
    case 'skill':
      return rule.ruleId === 'antigravity.repo.skill.file'
        ? new AntigravityCompiledFileSkillRule(rule)
        : new AntigravityCompiledSkillRule(rule);
    case 'MCP':
      return new AntigravityCompiledMcpCarrierRule(rule);
    case 'agent':
      return new AntigravityCompiledAgentRule(rule);
    case 'permissions':
      return new AntigravityCompiledPermissionsCarrierRule(rule);
    case 'hook':
      return rule.ruleId === 'antigravity.global.hooks.inline'
        ? new AntigravityCompiledInlineHookRule(rule)
        : new AntigravityCompiledStandaloneHookRule(rule);
    default:
      return new AntigravityCompiledOtherKindRule(rule);
  }
}

/**
 * The Antigravity CLI Repository rules a Repository scan executes, in shipped
 * order — every Repository row of this vendor's contract, derived from the
 * catalog rather than listed here, so a rule added to the registry cannot be
 * missed by this list.
 *
 * Selected by scope as well as by class. A Global rule's base is a consented
 * vendor home, so executing one here would run a Global selector against the
 * Repository root — a read nobody consented to, of a path that means something
 * else. {@link ANTIGRAVITY_GLOBAL_RULES} below is where they go.
 */
export const ANTIGRAVITY_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  ANTIGRAVITY_INSPECTION_RULES,
)
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('repository'),
  )
  .map(compileAntigravityRule);

/**
 * The Antigravity CLI rules a consented Antigravity home scan executes: every
 * static candidate this vendor's catalog admits below that boundary — the
 * global context file, the shared configuration directory's MCP carrier, hook
 * carrier, custom agents, and skills, the terminal's own skills, and its
 * settings document under three recognitions
 * (contracts/vendors/antigravity-cli.md § Inspector Global rule). Derived from
 * the shipped catalog by boundary rather than listed here, so a rule added to
 * the member home cannot be missed by this map.
 *
 * Separate from the Repository catalog rather than filtered out of it at call
 * time, because the two are executed against different roots: a scan is given
 * the catalog for the Source it is scanning, and there is no call site that
 * should have to decide which rules of a mixed list apply to the root it holds.
 */
export const ANTIGRAVITY_GLOBAL_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  ANTIGRAVITY_INSPECTION_RULES,
)
  .filter(
    (rule) =>
      rule.discoveryClass === 'static-candidate' &&
      rule.sourceKinds.includes('global') &&
      rule.matcher?.base.kind === 'global' &&
      rule.matcher.base.member === 'antigravity',
  )
  .map(compileAntigravityRule);
