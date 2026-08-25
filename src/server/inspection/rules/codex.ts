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
// also a candidate of its own, admitted by two rules over one read:
// `codex.repo.config` for the `[mcp_servers.*]` tables it carries and
// `codex.repo.settings` for the document those tables sit in. Which detail
// answers for it follows from the row a reader arrives through, never from
// the file (FR-007): an MCP row's subject is one declaration, so
// `get-mcp-carrier-detail` publishes declarations and no bytes, while the
// settings row's subject is the file, so `get-file-detail` serves the
// complete TOML under its `settings/config` variant. The stage-one read is
// seeded into the walk so the one physical file is read once per attempt
// (T282).
import {
  CompiledDerivedRule,
  CompiledInspectionRule,
  authoredSkillNameOf,
  declaredAgentNameOf,
  type CompiledStaticAgentRule,
  type CompiledStaticCandidateRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
  type CompiledStaticPermissionsDocumentRule,
  type CompiledStaticPluginCatalogRule,
  type CompiledDerivedInstructionRule,
  TraversalPlan,
  type CompiledStaticSkillRule,
  type PluginCarrierReading,
  localPluginRootSegments,
} from './registry';
import type { CustomizationKind } from '../../../shared/entities';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  McpServerDeclarationDto,
} from '../../../shared/api-types';
import { join } from 'node:path';
import {
  isVcsInternalPath,
  readCandidate,
  rethrowIfResourceExhaustion,
  statThroughLink,
  toPublicPath,
  type ConfigurationReadResult,
  type SeededCandidateRead,
} from '../traversal';
import { realpath } from '../fs-io';
import { RecognitionExtraction } from '../parsers/extraction';
import { ParsedStrictJsonDocument } from '../parsers/json';
import { ParsedTomlDocument } from '../parsers/toml';
import { CODEX_RULE_RELATIONS } from '../../../shared/registries/codex/relations';
import {
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
  CODEX_INSPECTION_RULES,
} from '../../../shared/registries/codex/rules';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Codex rule compiled for execution: the shared compilation from the base,
 * plus what is Codex's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Codex's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class CodexCompiledRule extends CompiledInspectionRule {
  /** Always `codex`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'codex';

  /** The rule's edges from {@link CODEX_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Codex record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'codex') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Codex-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CODEX_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Codex relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Codex instruction rule compiled for execution: everything a Codex rule is,
 * plus the one question only an instruction rule answers.
 *
 * Codex builds its instruction chain from the project root down to the runtime
 * working directory and stops there, so a nested `AGENTS.md` belongs to a
 * context this product does not select and is never a candidate: every Codex
 * instruction this inventory holds sits at the selected root and governs the
 * repository entirely (data-model.md § Inventory unit).
 */
export class CodexCompiledInstructionRule
  extends CodexCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /** The Repository root's `**`; every Codex instruction candidate sits there. */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles one Codex instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex instruction rule`);
    }
  }
}

/**
 * The Codex MCP carrier rule compiled for execution: everything a Codex rule
 * is, plus the one question only an MCP carrier rule answers — which servers
 * an admitted carrier declares. The reading lives here, beside the rule that
 * owns it, because which file carries declarations and what a declaration
 * means is this vendor's own contract (contracts/vendors/openai-codex.md
 * § Normative initial-release presentation allowlist, the `MCP` row); the
 * TOML parse and the rendering
 * of resolved values are the format's and stay in `parsers/toml.ts`.
 *
 * The admitted `.codex/config.toml` is Codex's project configuration layer,
 * and these declarations are one block of it. The document itself is a
 * different recognition of the same file, admitted by `codex.repo.settings`
 * and published as the TOML its author wrote — two rules over one candidate
 * and one read, each answering for the row that reaches it (FR-007).
 */
export class CodexCompiledMcpCarrierRule
  extends CodexCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (registry.ts § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `[mcp_servers.*]` declarations one admitted carrier makes, one per
   * named server table, in the parser's resolved order (FR-007), read over
   * the document's rendered entries — a table renders as the `mapping` kind,
   * so the structural question is the entries' own discriminant.
   *
   * Contained-declaration classification is structural and total: only a
   * table under `mcp_servers` is a server declaration, and a `mcp_servers`
   * entry that is not a table — a scalar, an array — is omitted whole rather
   * than published partially, exactly as an absent `mcp_servers` declares
   * nothing. No field is validated, no environment reference is resolved, and
   * no declared command, URL, or path gains read or connection authority.
   * Throws on text TOML cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the carrier
   * stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const declared = new ParsedTomlDocument(sourceText).entries.find(
      (entry) => entry.key === 'mcp_servers',
    );
    if (declared === undefined || declared.value.kind !== 'mapping') {
      return [];
    }
    return declared.value.entries.flatMap((entry) =>
      entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
    );
  }

  /** Compiles one Codex MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * The key a Codex custom-agent file writes its instructions under
 * (contracts/vendors/openai-codex.md § Documented Repository behavior): the
 * page requires `name`, `description`, and `developer_instructions` of every
 * standalone agent file and calls the last one the core instructions that
 * define the agent's behavior. It is the split this vendor's presentation
 * falls at, so it is a literal here rather than anything a caller passes.
 */
const CODEX_AGENT_INSTRUCTIONS_KEY = 'developer_instructions';

/**
 * The Codex custom-agent rule compiled for execution: everything a Codex rule
 * is, plus the one question only a custom-agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin. The
 * reading lives here, beside the rule that owns it, because a Codex agent
 * file's format is this vendor's own contract
 * (contracts/vendors/openai-codex.md § Inspector Repository rules); the TOML
 * parse and the rendering of resolved values are the format's and stay in
 * `parsers/toml.ts`.
 */
export class CodexCompiledAgentRule extends CodexCompiledRule implements CompiledStaticAgentRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted `.codex/agents/*.toml` split into the two halves its detail
   * shows (FR-007). A Codex agent file is a configuration layer with one prose
   * key: `developer_instructions` holds the instructions, and every other
   * top-level entry — `name` and `description` among them, beside whatever
   * other supported `config.toml` keys the author wrote — is the metadata,
   * each published in the file's own order as the parser resolved it.
   *
   * The split is taken only when that key resolves to a string. A
   * `developer_instructions` the file wrote as a table, a list, a number, or a
   * datetime is a declaration rather than prose, so it stays a metadata entry
   * and the instructions are empty: moving a rendering of it into the prose
   * half would show the reader a document their file does not contain.
   *
   * No field is validated, no environment reference is resolved, and no
   * declared path, command, or server gains read or connection authority. A
   * declared `mcp_servers` table is one metadata entry and nothing more: it
   * makes the file no MCP carrier, because an MCP declaration's home is an
   * explicit carrier and nothing else (data-model.md § Inventory unit).
   * Throws on text TOML cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the file
   * stays an admitted candidate whose complete source is still displayed
   * (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedTomlDocument(sourceText);
    // Asked of the parser's typed resolution rather than of the rendered
    // entry, which is what that view exists for (`parsers/toml.ts`): the
    // rendering publishes a TOML datetime as a `string` scalar, because its
    // ISO spelling is its spelling (api-types.ts § DeclaredScalarKind), so a
    // `developer_instructions = 1979-05-27` would pass a check made over the
    // entry and become a Markdown body the file does not contain. `typeof`
    // over the resolution tells the two apart, exactly as the configuration
    // read tells a string basename from a number.
    const declared = document.table[CODEX_AGENT_INSTRUCTIONS_KEY];
    const instructionsText = typeof declared === 'string' ? declared : '';
    const metadata =
      typeof declared === 'string'
        ? document.entries.filter((entry) => entry.key !== CODEX_AGENT_INSTRUCTIONS_KEY)
        : document.entries;
    return { metadata, instructionsText };
  }

  /**
   * The agent's declared `name`, which is what Codex identifies a custom agent
   * by — the reference calls naming the file after it a convention rather than
   * a lookup — so a file declaring none has no name at all and joins the row
   * that says so rather than being named after its path.
   *
   * The path is unused for that reason, and the shared reading is the one both
   * declared-name products use (`registry.ts` § declaredAgentNameOf).
   */
  public agentNameOf(
    _sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null {
    return declaredAgentNameOf(declared);
  }

  /** Compiles one Codex custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex custom-agent rule`);
    }
  }
}

/**
 * A Codex skill rule, compiled for execution: the plan and guards every
 * compiled rule is, plus the one question only a skill rule answers — the
 * name Codex invokes an admitted `SKILL.md` by. The answer lives here,
 * beside the rule that owns it, because a skill's identity is this vendor's
 * own contract (contracts/vendors/openai-codex.md § Normative
 * initial-release presentation allowlist).
 */
export class CodexCompiledSkillRule extends CodexCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The `name` the file declares, with the skill directory as the fallback —
   * the shared answer of the products that document that field as the skill's
   * identity ({@link authoredSkillNameOf}), which Codex is one of.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one Codex skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex skill rule`);
    }
  }
}

/**
 * The key a Codex plugin catalog lists its entries under
 * (contracts/vendors/openai-codex.md § Documented Repository behavior): the
 * page defines a catalog as a `plugins` array of one object per plugin. It is
 * a literal here rather than anything a caller passes, because it is this
 * vendor's own format.
 */
const CODEX_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a plugin declaration writes its name under, in both carrier shapes. */
const CODEX_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const CODEX_PLUGIN_SOURCE_KEY = 'source';

/**
 * The key a local source object writes its path under; a local entry may also
 * spell the whole source as that path string
 * (`openai.codex.plugins` § Marketplace metadata).
 */
const CODEX_PLUGIN_SOURCE_PATH_KEY = 'path';

/** The value `source.source` carries for the one form that names a local directory. */
const CODEX_LOCAL_SOURCE_VALUE = 'local';

/**
 * Where a Codex plugin root keeps the plugin's own manifest, relative to that
 * root (`codex.behavior.plugin.manifest`): the required entry point a
 * plugin-capable client reads the plugin's declaration of itself from
 * (contracts/vendors/openai-codex.md § Documented Repository behavior).
 *
 * It names the file rather than admitting it: no rule reaches a manifest, and
 * the file is published as one of the plugin's own. What this answers is which
 * of those files the plugin's detail opens on.
 */
const CODEX_PLUGIN_MANIFEST_PATH = '.codex-plugin/plugin.json';

/**
 * The name one plugin declaration resolves: the `name` scalar exactly as it
 * was written, or null when the declaration writes none or writes it as
 * anything but a scalar — naming a plugin after the first item of a list it
 * wrote would be an identity the file never declared (FR-007).
 */
function codexPluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === CODEX_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * The plugin root one catalog entry names inside the Source, as raw
 * entry-name segments relative to the Source root, or null when the entry
 * names none this derivation may follow.
 *
 * The documented local form is what this accepts and nothing else: the source
 * is either the object form with `source: 'local'` and a `path`, or the plain
 * string path a local entry may use instead. The path must begin with `./`,
 * and every segment after that prefix must be an ordinary entry name — a `..`
 * segment, an absolute path, a `~` home path, and a Git or npm source all
 * derive nothing, because the derivation is closed and a source it cannot
 * validate is not a target it may read (FR-004, FR-024).
 *
 * `./` is relative to the marketplace root, which for a repository catalog is
 * the Source root itself — the personal pattern the same page documents,
 * `./.codex/plugins/<name>` beside a catalog at `~/.agents/plugins/`, resolves
 * against the home directory rather than against the catalog's own directory,
 * and the repository half of that rule is the root
 * (contracts/vendors/openai-codex.md § Derived Repository rules).
 */
function codexLocalPluginRootOf(fields: readonly DeclaredEntryDto[]): readonly string[] | null {
  let declaredPath: string | null = null;
  for (const field of fields) {
    if (field.keyKind !== 'string' || field.key !== CODEX_PLUGIN_SOURCE_KEY) {
      continue;
    }
    if (field.value.kind === 'scalar') {
      declaredPath = field.value.text;
      break;
    }
    if (field.value.kind !== 'mapping') {
      return null;
    }
    let isLocal = false;
    let path: string | null = null;
    for (const entry of field.value.entries) {
      if (entry.keyKind !== 'string' || entry.value.kind !== 'scalar') {
        continue;
      }
      if (entry.key === CODEX_PLUGIN_SOURCE_KEY) {
        isLocal = entry.value.text === CODEX_LOCAL_SOURCE_VALUE;
      }
      if (entry.key === CODEX_PLUGIN_SOURCE_PATH_KEY) {
        path = entry.value.text;
      }
    }
    // A `git-subdir` or `npm` entry also writes a `path` or a `package`; only
    // the local form names a directory this Source holds, so the discriminant
    // is checked rather than the presence of a path.
    declaredPath = isLocal ? path : null;
    break;
  }
  return localPluginRootSegments(declaredPath);
}

/**
 * The name Codex resolves one catalog offering by: the entry's own name
 * qualified by the catalog's, `plugin@marketplace`, or null when either half is
 * missing — an offering Codex could not address is no name at all.
 *
 * The spelling is the tool's own. `codex plugin add` and `codex plugin remove`
 * take a `PLUGIN[@MARKETPLACE]` selector, `codex plugin list` prints the
 * qualified form in its `PLUGIN` column, and the per-plugin state in
 * `~/.codex/config.toml` is keyed by it (observed against codex-cli 0.144.6).
 * The cited page does not spell the pair out; what it establishes is that the
 * pair is the identity — an installed plugin lives under
 * `<cache>/<marketplace>/<plugin>/<version>`
 * (contracts/vendors/openai-codex.md § Known uncertainties, item 7).
 *
 * It lives here because it is Codex's rule. Another product's plugin phase
 * resolves its own names in its own module, exactly as each vendor resolves its
 * own skill and command names (FR-007).
 */
function codexOfferedPluginNameOf(
  entryName: string | null,
  catalogName: string | null,
): string | null {
  return entryName === null || catalogName === null ? null : `${entryName}@${catalogName}`;
}

/**
 * The Codex plugin catalog rule compiled for execution: everything a Codex rule
 * is, plus the one question only a catalog answers — which plugins its entries
 * resolve, and where each of them sits inside this Source.
 */
export class CodexCompiledPluginCatalogRule
  extends CodexCompiledRule
  implements CompiledStaticPluginCatalogRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is a catalog listing plugins. */
  public readonly pluginCarrier: 'catalog';

  /**
   * What one admitted catalog declares: its own keys except `plugins`, and one
   * declaration per entry of that array in the parser's resolved order, each
   * carrying the directory that entry's plugin occupies here.
   *
   * Entry classification is structural and total, exactly as the MCP carrier
   * reading's is: only an object inside `plugins` is an entry, and a scalar or
   * an array there is omitted whole rather than published partially, as is a
   * `plugins` value that is not an array at all. Strict JSON for the reason
   * the manifest reading gives (FR-028).
   *
   * A plugin *is* its root: the `.codex-plugin/plugin.json` inside it is one of
   * the files it ships rather than a customization of its own, so an entry
   * answers the directory and never a file below it. Which source forms name a
   * directory here is this vendor's contract, which is why the catalog that
   * admitted the text is what answers.
   */
  public pluginCarrierReadingOf(sourceText: string): PluginCarrierReading {
    const entries = new ParsedStrictJsonDocument(sourceText).entries;
    const declared = entries.find(
      (entry) => entry.keyKind === 'string' && entry.key === CODEX_CATALOG_PLUGINS_KEY,
    );
    const catalogFields = entries.filter((entry) => entry !== declared);
    if (declared === undefined || declared.value.kind !== 'sequence') {
      return { catalogFields, plugins: [] };
    }
    // Each entry is published under the name Codex addresses that offering by,
    // qualified by this catalog's own name; the entry's raw `name` stays one of
    // the `fields` below, where the detail publishes it as written (FR-007).
    const catalogName = codexPluginNameOf(catalogFields);
    return {
      catalogFields,
      plugins: declared.value.items.flatMap((item) => {
        if (item.kind !== 'mapping') {
          return [];
        }
        const named = codexLocalPluginRootOf(item.entries);
        // A Git, npm, absolute, home, or root-escaping source names no
        // directory this Source holds: the offering stands and occupies
        // nothing here, and there is no manifest of its own to open either.
        const pluginRoot = named === null ? null : `${toPublicPath(named)}/`;
        return [
          {
            name: codexOfferedPluginNameOf(codexPluginNameOf(item.entries), catalogName),
            fields: item.entries,
            pluginRoot,
            manifestPaths:
              pluginRoot === null ? [] : [`${pluginRoot}${CODEX_PLUGIN_MANIFEST_PATH}`],
          },
        ];
      }),
    };
  }

  /** Compiles one Codex plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex plugin rule`);
    }
    this.pluginCarrier = 'catalog';
  }
}

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
    | 'plugin'
    | 'output style'
  >;

  /** Compiles one Codex record of any kind but the seven with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'skill' ||
      rule.kind === 'MCP' ||
      rule.kind === 'agent' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'permissions' ||
      // No shipped rule of this vendor carries the kind; the exclusion keeps
      // the unit's type in step with the base, whose `kind` an output-style
      // unit answers for (registry.ts § CompiledStaticOutputStyleRule).
      rule.kind === 'output style'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Codex unit that answers for its kind`);
    }
  }
}

/**
 * A Codex permission-policy rule compiled for execution: the admitted file is
 * itself the whole policy, so this unit reads nothing out of it. A
 * `.codex/rules/*.rules` file is the Starlark document its author wrote, and
 * its detail serves that document (contracts/http-api.md
 * § get-permission-policy-detail).
 */
export class CodexCompiledPermissionsDocumentRule
  extends CodexCompiledRule
  implements CompiledStaticPermissionsDocumentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads nothing: the admitted document is the policy (registry.ts § CompiledStaticPermissionsDocumentRule). */
  public readonly permissionsReading: 'whole-document';

  /** Compiles one Codex permission-policy record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex permission-policy rule`);
    }
    this.permissionsReading = 'whole-document';
  }
}

/**
 * The Codex Repository rules a Repository scan executes, in shipped order.
 * The remaining Codex rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers static instructions, skills, the
 * MCP carrier, the settings document that carrier is, rule files, and custom
 * agents, with the configured instruction fallbacks reaching the same walk
 * through the derived rule below.
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
              : rule.kind === 'plugin'
                ? new CodexCompiledPluginCatalogRule(rule)
                : new CodexCompiledOtherKindRule(rule),
  );

/**
 * A Codex derived rule compiled for execution: the shared derivation from the
 * base, plus what is Codex's own — the same two things a static Codex rule
 * fixes, for the same reasons. A derived candidate is recognized and rendered
 * exactly like a static one, so it has to answer the same questions: which
 * product recognized it, and which documented behavior its rule rests on.
 */
export class CodexCompiledDerivedRule extends CompiledDerivedRule {
  /** Always `codex`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'codex';

  /** The rule's edges from {@link CODEX_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Codex derived record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'codex') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex rule`);
    }
    this.tool = rule.tool;
    // Widened for the lookup and rejected loudly on a miss, exactly as in
    // `CodexCompiledRule`: `InspectionRule` does not correlate `tool` with
    // `ruleId`, so a Codex-tagged record whose ID another vendor's catalog
    // owns must fail rather than compile with that vendor's edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CODEX_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Codex relations`);
    }
    this.relations = edges;
  }
}

/**
 * The Codex instruction derivation compiled for execution: the vendor half,
 * plus what an instruction derivation targets — one exact Repository-root
 * selector per configured basename, and the applicability range every file it
 * admits governs.
 */
export class CodexCompiledDerivedInstructionRule
  extends CodexCompiledDerivedRule
  implements CompiledDerivedInstructionRule
{
  /** Narrowed to the one kind this unit derives; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * Builds the traversal plan for one configuration-read result: one exact
   * Repository-root selector per declared basename, in authored order, each
   * segment the name as the configuration wrote it — a name is compared to
   * what the walk enumerated, so the shipped matchers' ASCII grammar is not
   * this plan's (data-model.md § StructuredInspectorMatcher). The plan is per
   * scan attempt, because the declared names are the attempt's stage-one
   * configuration, and the walk that executes it merges a name that collides
   * with a static target into one candidate with both provenances, exactly
   * like any two plans admitting one file.
   */
  public planFor(declaredBasenames: readonly string[]): TraversalPlan {
    return TraversalPlan.fromPrograms(
      { kind: 'repository' },
      declaredBasenames.map((basename) => [basename]),
    );
  }

  /**
   * The Repository root's `**`: a derived plan is one exact Repository-root
   * selector per declared basename ({@link planFor}), so every candidate it
   * admits sits at the root and governs the repository entirely.
   *
   * Declared here rather than inherited, because a derived rule has no
   * matcher and so cannot be a static instruction unit: this class is the
   * derived half of the instruction unit.
   */
  public applicabilityRangeOf(): string {
    return '**';
  }

  /** Compiles the shipped Codex instruction derivation, rejecting any other. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} derives a kind this unit cannot answer for`);
    }
  }
}

/**
 * The compiled `codex.derived.fallback-basename` unit the configuration-read
 * stage expands (T1089): the seed is the repository's own `.codex/config.toml`
 * read as configuration, and the derived targets are `instructions` candidates
 * at the Repository root, one per declared basename, scanned by the same walk
 * as every static candidate.
 */
export const CODEX_DERIVED_FALLBACK_RULE = new CodexCompiledDerivedInstructionRule(
  CODEX_DERIVED_FALLBACK_BASENAME_RULE,
);

/**
 * Reads one configuration seed for a vendor's configuration-read logic
 * (T1090): probes the exact pinned path, and returns the decoded text of a
 * present, readable seed — through the same single read path as every
 * published file — beside the read it performed, so the scan can seed the
 * walk's classification cache with it and the seed's own candidacy
 * (`codex.repo.config`, T282) reuses this read instead of opening the file
 * again.
 *
 * A seed this reader cannot decode configures nothing, whichever way it fails:
 * absent, unreadable, binary, or a non-regular entry at the pinned path. That
 * is not a claim withheld from the reader, because the seed is a candidate of
 * its own — `.codex/config.toml` is what `codex.repo.config` admits — so the
 * walk probes the same path and publishes whatever it classifies there, and an
 * unreadable one carries `file-unreadable` in a partial generation (FR-028).
 * A read that did happen is seeded, so the walk classifies from this reader's
 * bytes rather than opening the file again.
 */
async function readConfigurationSeed(
  root: string,
  seedSegments: readonly string[],
): Promise<{
  readonly sourceText: string | null;
  readonly seededRead: SeededCandidateRead | null;
}> {
  const absolutePath = join(root, ...seedSegments);
  let target;
  try {
    // Through the link, like every other read (FR-024): a seed reached by a
    // symbolic link is the file it resolves to.
    target = await statThroughLink(absolutePath);
  } catch (error) {
    // Reached by every repository that ships no seed at the path, by one whose
    // seed is a dangling link, and by one whose seed this process may not
    // stat. All three configure nothing, and none of them is a statement this
    // function has to make about the file: the walk admits the same path as a
    // candidate and publishes what it finds there, so a seed that could not be
    // read is reported as that file's own outcome (`codex.repo.config`).
    //
    // The rethrow separates the machine running out of descriptors or memory
    // from that answer, because reporting exhaustion as "this repository
    // declares nothing" would commit a complete generation missing every
    // configured target.
    rethrowIfResourceExhaustion(error);
    return { sourceText: null, seededRead: null };
  }
  if (!target.isFile) {
    // A directory, FIFO, socket, or device at the pinned path configures
    // nothing. The type is decided before the read because the one flag-free
    // `readFile` below would block indefinitely on a FIFO — the same gate
    // `probeExactTarget` applies to an exact target, and the walk gets from
    // its directory-entry types.
    return { sourceText: null, seededRead: null };
  }
  try {
    // The walk decides descent on resolved real paths, so a `.codex` entry
    // that is a symbolic link into `.git` never becomes a candidate
    // (`isVcsInternalPath`). Configuration must refuse the same spelling:
    // without this gate, the read that configures the scan would come from
    // the VCS store the walk itself excludes, and the derived plans would
    // rest on bytes no candidate can ever publish.
    if (isVcsInternalPath(await realpath(root), await realpath(absolutePath))) {
      return { sourceText: null, seededRead: null };
    }
  } catch (error) {
    // The same absence window as the stat above: a seed removed between the
    // probe and the resolution configures nothing.
    rethrowIfResourceExhaustion(error);
    return { sourceText: null, seededRead: null };
  }
  const outcome = await readCandidate(absolutePath);
  return {
    sourceText: outcome.kind === 'readable' ? outcome.sourceText : null,
    seededRead: { rawSegments: seedSegments, outcome },
  };
}

/**
 * The configured fallback basenames one carrier document declares, in
 * authored order — or null when the field is absent or is not a string array,
 * which both mean the carrier configures nothing. Throws on a document TOML
 * cannot parse; the caller's extraction boundary owns that throw as
 * "configures nothing", because the stage-one read is configuration input
 * only — the same document reaches the carrier's own MCP recognition through
 * the seeded walk, and that recognition's extraction is where a parse
 * failure gets its diagnostic (FR-028).
 *
 * Retention is complete: every declaration is kept, duplicates included, and
 * no Inspector cap or character grammar edits the list
 * (contracts/inspection-path-allowlist.md § Common conformance
 * requirements). A declared value is a name, not a path: the walk compares it
 * to the entry names it enumerated and opens the entry, so a value holding a
 * separator, a dot segment, or a home marker matches nothing rather than
 * reaching anything — there is no escape for a grammar to prevent, and
 * rejecting the declaration would only lose the ordinary names beside it.
 */
export function configuredFallbackBasenamesOf(sourceText: string): readonly string[] | null {
  const declared = new ParsedTomlDocument(sourceText).table['project_doc_fallback_filenames'];
  return Array.isArray(declared) &&
    declared.every((value): value is string => typeof value === 'string')
    ? declared
    : null;
}

/**
 * Codex's configuration-read contribution (T1090): reads the root
 * `.codex/config.toml` — configuration deciding what counts as an
 * instruction file, before any candidate is scanned — and expands the
 * declared fallback basenames into the plan the same walk executes under
 * {@link CODEX_DERIVED_FALLBACK_RULE}'s identity. An absent, unreadable,
 * malformed, or invalidly-declaring carrier configures nothing here; the
 * carrier's own candidacy is `codex.repo.config`'s, which is why the read
 * this function performed is returned as a seeded read — the walk classifies
 * the candidate from this same read instead of opening the file a second
 * time, so the fallback plan and the published carrier can never disagree
 * about one generation's bytes (T282).
 */
export async function readCodexConfiguredFallbackPlans(
  root: string,
): Promise<ConfigurationReadResult> {
  const seed = await readConfigurationSeed(root, ['.codex', 'config.toml']);
  const seededReads = seed.seededRead === null ? [] : [seed.seededRead];
  if (seed.sourceText === null) {
    return { plans: [], seededReads };
  }
  // The extraction boundary is the one sanctioned soft-failure seam: a parse
  // throw becomes the `failed` status here instead of a bare catch.
  const extraction = RecognitionExtraction.run(seed.sourceText, configuredFallbackBasenamesOf);
  const basenames = extraction.extracted ?? null;
  return {
    plans:
      basenames !== null && basenames.length > 0
        ? [
            {
              rule: CODEX_DERIVED_FALLBACK_RULE,
              plan: CODEX_DERIVED_FALLBACK_RULE.planFor(basenames),
            },
          ]
        : [],
    seededReads,
  };
}
