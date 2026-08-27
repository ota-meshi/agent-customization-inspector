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
import { CodexCompiledPermissionsDocumentRule } from './permissions/codex';
import { CodexCompiledMcpCarrierRule } from './mcp/codex';
import { CodexCompiledInlineHookRule, CodexCompiledStandaloneHookRule } from './hooks/codex';
import { CodexCompiledInstructionRule } from './instructions/codex';
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
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers static instructions, skills, the
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
  .filter((rule) => rule.discoveryClass === 'static-candidate')
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
