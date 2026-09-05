// Codex classification over the registry-compiled inspection rules (T065,
// extended by T213). This module owns no walker and no selector semantics of
// its own: it takes the shipped Codex matchers, hands them to the one registry
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
// This module also owns Codex's configuration-read logic (T1090): plain code
// that reads `.codex/config.toml` before a scan, takes the
// `project_doc_fallback_filenames` values, and builds the traversal plan the
// walk executes for them. The scan composes each vendor's reader exactly like
// the rule catalogs, so the logic lives with the vendor it belongs to
// (contracts/vendors/openai-codex.md § Derived Repository rules). The file is
// also a candidate of its own, admitted by three rules over one read:
// `codex.repo.config` for the `[mcp_servers.*]` tables it carries,
// `codex.repo.hooks.inline` for the `[hooks]` table it can also contain, and
// `codex.repo.settings` for the document all of them sit in. Which detail
// answers for it follows from the row a reader arrives through, never from
// the file (FR-007): an MCP row's subject is one declaration, so
// `get-mcp-carrier-detail` publishes declarations and no bytes, while the
// settings row's subject is the file, so `get-file-detail` serves the
// complete TOML under its `settings/config` variant. The stage-one read is
// seeded into the walk so the one physical file is read once per attempt
// (T282).
import { CodexCompiledRule } from './vendor/codex';
import { CodexCompiledAgentRule } from './agents/codex';
import { CodexCompiledSkillRule } from './skills/codex';
import { CodexCompiledPromptRule } from './prompts-and-commands/codex';
import { CodexCompiledPermissionsDocumentRule } from './permissions/codex';
import { CodexCompiledMcpCarrierRule } from './mcp/codex';
import { CodexCompiledInlineHookRule, CodexCompiledStandaloneHookRule } from './hooks/codex';
import {
  CodexCompiledGlobalInstructionRule,
  CodexCompiledInstructionRule,
} from './instructions/codex';
import type { CompiledStaticCandidateRule, CompiledStaticOtherKindRule } from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import { CodexCompiledPluginCatalogRule } from './plugins/codex';
import { CODEX_INSPECTION_RULES } from '../../../shared/registries/codex/rules';
import type { InspectionRule } from '../../../shared/registries/rule-types';

// The configuration read a scan performs before any candidate is scanned is
// this vendor's instruction derivation ({@link CodexCompiledInstructionRule}'s
// derived sibling), published from here so nothing outside `rules/` imports the
// instructions directory.
export { readCodexConfiguredFallbackPlans } from './instructions/codex';

/**
 * A Codex rule of every other kind, compiled for execution. It answers no
 * per-kind question — neither an instruction rule's applicability, nor an MCP
 * carrier's declarations, nor a custom agent's, nor a skill's name (see
 * `CompiledStaticOtherKindRule`).
 */
export class CodexCompiledOtherKindRule
  extends CodexCompiledRule
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

  /** Compiles one Codex record of any kind but the eight with a question of their own. */
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
      throw new TypeError(`rule ${rule.ruleId} needs a Codex unit that answers for its kind`);
    }
  }
}

/**
 * The Codex rules a consented `CODEX_HOME` scan executes: every static
 * candidate this vendor's catalog admits below that boundary — the ordered
 * override/fallback instruction pair, and each further kind the contract
 * places in that home (contracts/vendors/openai-codex.md § Inspector Global
 * rules). Derived from the shipped catalog by boundary rather than listed
 * here, so a rule added to the member home cannot be missed by this map. The
 * shared agent home's Codex rules are the separate catalog below, because the
 * two members are two consented roots.
 *
 * Separate from the Repository catalog rather than filtered out of it at call
 * time, because the two are executed against different roots: a scan is given
 * the catalog for the Source it is scanning, and there is no call site that
 * should have to decide which rules of a mixed list apply to the root it holds.
 *
 * It compiles through the same instruction unit as its Repository sibling, so
 * what an admitted Global instruction file governs is answered by the same
 * code path — the applicability range of a file below a vendor home is still a
 * fact about an instruction file.
 */
export const CODEX_GLOBAL_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CODEX_INSPECTION_RULES,
)
  .filter(
    (rule) =>
      rule.discoveryClass === 'static-candidate' &&
      rule.sourceKinds.includes('global') &&
      rule.matcher?.base.kind === 'global' &&
      rule.matcher.base.member === 'codex',
  )
  // Each record compiles into the unit that answers its kind's question — the
  // Repository catalog's dispatch, minus the plugin branch no `CODEX_HOME`
  // rule carries, plus the one branch only this scope has: the instruction
  // fallback compiles into its own unit, whose plan is the closed
  // first-non-empty pair.
  .map((rule) =>
    rule.kind === 'instructions'
      ? new CodexCompiledGlobalInstructionRule(rule)
      : rule.kind === 'MCP'
        ? new CodexCompiledMcpCarrierRule(rule)
        : rule.kind === 'agent'
          ? new CodexCompiledAgentRule(rule)
          : rule.kind === 'permissions'
            ? new CodexCompiledPermissionsDocumentRule(rule)
            : rule.kind === 'hook'
              ? rule.ruleId === 'codex.global.hooks.inline'
                ? new CodexCompiledInlineHookRule(rule)
                : new CodexCompiledStandaloneHookRule(rule)
              : rule.kind === 'prompt/command'
                ? new CodexCompiledPromptRule(rule)
                : new CodexCompiledOtherKindRule(rule),
  );

/**
 * The Codex rules a consented shared-agent-home scan executes: the personal
 * skills and the personal plugin marketplace below `~/.agents` (FR-045;
 * contracts/vendors/openai-codex.md § Inspector Global rule). Selected by the
 * boundary their own matcher names, exactly as the `CODEX_HOME` catalog above
 * is: which rules run below which consented boundary is decided by the base
 * each record declares, so a rule cannot end up scanned against a root its
 * selector was never authored for.
 *
 * Each compiles through the unit that answers its kind's question — the skill
 * unit for the invocation name, the plugin-catalog unit for the names the
 * `plugins[]` entries declare — the same units the Repository `.agents` rules
 * compile through, because the shared home is that directory's personal
 * counterpart.
 */
export const CODEX_AGENTS_HOME_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CODEX_INSPECTION_RULES,
)
  .filter(
    (rule) =>
      rule.discoveryClass === 'static-candidate' &&
      rule.matcher?.base.kind === 'global' &&
      rule.matcher.base.member === 'agents',
  )
  .map((rule) =>
    rule.kind === 'skill'
      ? new CodexCompiledSkillRule(rule)
      : new CodexCompiledPluginCatalogRule(rule),
  );

/**
 * The Codex Repository rules a Repository scan executes, in shipped order —
 * every Repository row of this vendor's contract, derived from the catalog
 * rather than listed here. They cover static instructions, skills, the
 * MCP carrier, the settings document that carrier is, rule files, custom
 * agents, and both hook carriers, with the configured instruction fallbacks
 * reaching the same walk through the derived rule below.
 *
 * The catalog now carries both discovery classes, and each compiles through
 * its own gate: the static rules below feed the traversal, while the derived
 * rule compiles into {@link CODEX_DERIVED_FALLBACK_RULE} for the
 * configuration-read stage — the selection is by declared class, and a record of
 * either class that cannot be executed still fails the build that ships it
 * through its constructor guard.
 */
export const CODEX_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CODEX_INSPECTION_RULES,
)
  // Selected by scope as well as by class. A Global rule's base is a consented
  // vendor home, so executing one here would run a Global selector against the
  // Repository root — a read nobody consented to, of a path that means
  // something else. `CODEX_GLOBAL_RULES` below is where they go.
  .filter(
    (rule) => rule.discoveryClass === 'static-candidate' && rule.sourceKinds.includes('repository'),
  )
  .map((rule) =>
    // Each record compiles into the unit that can answer its kind's question:
    // an instruction record what its files govern, an MCP record which
    // servers its carrier declares, a custom-agent record what its file
    // declares, a skill record what Codex invokes it by; every other kind
    // compiles into the plain one.
    //
    // Every static Codex plugin record is a catalog: this vendor activates a
    // plugin root rather than discovering one, so no selector of its own
    // matches a manifest and the only plugin file it admits by path is the
    // catalog whose entries name the sources
    // (contracts/vendors/openai-codex.md § Derived Repository rules). A Codex
    // manifest is one of the files that plugin ships, read from the plugin
    // root the catalog's own entry names.
    rule.kind === 'instructions'
      ? new CodexCompiledInstructionRule(rule)
      : rule.kind === 'skill'
        ? new CodexCompiledSkillRule(rule)
        : rule.kind === 'MCP'
          ? new CodexCompiledMcpCarrierRule(rule)
          : rule.kind === 'agent'
            ? new CodexCompiledAgentRule(rule)
            : rule.kind === 'permissions'
              ? new CodexCompiledPermissionsDocumentRule(rule)
              : rule.kind === 'hook'
                ? // The two hook carriers are two formats at two locations, so
                  // the record's own identity selects the reading: the
                  // standalone strict-JSON file, or the inline table of the
                  // TOML config layer.
                  rule.ruleId === 'codex.repo.hooks.inline'
                  ? new CodexCompiledInlineHookRule(rule)
                  : new CodexCompiledStandaloneHookRule(rule)
                : rule.kind === 'plugin'
                  ? new CodexCompiledPluginCatalogRule(rule)
                  : new CodexCompiledOtherKindRule(rule),
  );
