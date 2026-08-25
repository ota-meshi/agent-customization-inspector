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
import {
  CompiledInspectionRule,
  declaredAgentNameOf,
  escapeGlobLiteral,
  type CompiledStaticAgentRule,
  type CompiledStaticCandidateRule,
  type CompiledStaticPromptRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
  type CompiledStaticOutputStyleRule,
  type CompiledStaticPermissionsCarrierRule,
  type CompiledStaticPluginCatalogRule,
  type CompiledStaticPluginManifestRule,
  type CompiledStaticSkillRule,
  type PluginCarrierReading,
  localPluginRootSegments,
} from './registry';
import { ParsedStrictJsonDocument } from '../parsers/json';
import { skillDirectoryOf } from '../../../shared/registries/skill-directory';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  McpServerDeclarationDto,
  PluginDeclarationDto,
} from '../../../shared/api-types';
import type { CustomizationKind } from '../../../shared/entities';
import { CLAUDE_RULE_RELATIONS } from '../../../shared/registries/claude/relations';
import { CLAUDE_INSPECTION_RULES } from '../../../shared/registries/claude/rules';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Claude rule compiled for execution: the shared compilation from the base,
 * plus what is Claude's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Claude's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class ClaudeCompiledRule extends CompiledInspectionRule {
  /** Always `claude`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'claude';

  /** The rule's edges from {@link CLAUDE_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Claude record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'claude') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Claude-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = CLAUDE_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Claude relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Claude instruction rule compiled for execution: everything a Claude rule
 * is, plus the one question only an instruction rule answers — what a file it
 * admitted governs.
 *
 * Claude discovers instruction files per directory: the launch directory's at
 * session start, an ancestor's with them, a subdirectory's once it reads a
 * file there. A Claude instruction file therefore governs the directory
 * holding it rather than the whole repository, which is why Claude is the one
 * shipped product that derives a range from the path instead of answering the
 * Repository root's `**` (data-model.md § Inventory unit).
 */
export class ClaudeCompiledInstructionRule
  extends ClaudeCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /**
   * The glob one admitted Claude instruction file governs: the directory
   * holding it, with a trailing `.claude` dropped for a `CLAUDE.md` — the page
   * names `./CLAUDE.md` **or** `./.claude/CLAUDE.md` as the one project
   * instruction location, so for that filename the directory is where Claude
   * keeps the file rather than what the file governs, and both spellings land
   * on one row (anthropic.claude-code.memory.locations-load § Choose where to
   * put CLAUDE.md files).
   *
   * For every other admitted filename the segment is kept, because no cited
   * page names a `.claude` alternative for one: the same table lists local
   * instructions at `./CLAUDE.local.md` alone, so treating a
   * `.claude/CLAUDE.local.md` as the directory's own would assert an
   * equivalence the documentation does not make.
   */
  public applicabilityRangeOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(0, -1);
    if (segments.at(-1) === 'CLAUDE.md' && directory.at(-1) === '.claude') {
      directory.pop();
    }
    return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
  }

  /** Compiles one Claude instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude instruction rule`);
    }
  }
}

/**
 * A Claude command rule compiled for execution: everything a Claude rule is,
 * plus the one question only a command rule answers — the name a reader
 * invokes an admitted file by.
 */
export class ClaudeCompiledPromptRule
  extends ClaudeCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The command name one admitted file is invoked by: the path below the
   * commands directory with every separator turned into a `:` and the `.md`
   * dropped from the leaf — `.claude/commands/deploy.md` is `deploy`,
   * `.claude/commands/frontend/component.md` is `frontend:component`, and
   * `.claude/commands/team/review/security.md` is `team:review:security`.
   *
   * Derived from the path because that is where the vendor puts it: Claude
   * Code ignores a `name` key in a command file, so the file declares no
   * identity of its own and the path is the only thing a row could be keyed by
   * (data-model.md § Inventory unit).
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `claude.repo.command` record, whose one selector is
   * `['.claude', 'commands', ANY_DIRECTORIES, /\.md$/u]`, so an admitted path
   * always has the two container segments in front and always ends in `.md`.
   *
   * The colon join is the documented transformation carried through: the
   * changelog turns `.claude/commands/frontend/component.md` into
   * `/frontend:component`, so the separator below the commands directory is
   * what becomes the `:`, and a deeper path has more of them. No cited page
   * spells a deeper case outright, and Claude Code 2.1.186 builds it this way
   * in both of the places that name a command, which is the corroboration
   * rather than the basis.
   *
   * A leaf whose stem is `skill` in any letter case is the one exception, and
   * it is
   * the product's behavior with no documentation behind it at all: such a file
   * takes its directory's name instead of its own, so
   * `.claude/commands/foo/SKILL.md` is `foo` and
   * `.claude/commands/a/b/SKILL.md` is `a:b`. Matching the product where
   * nothing is written is the standing decision for this kind.
   *
   * The one path that exception cannot answer is a `SKILL.md` directly in the
   * commands directory, where there is no directory below it to take a name
   * from — and where the product's own two naming sites disagree, one treating
   * the file as no command at all and the other naming it after the commands
   * directory. With no behavior to match, this falls back to what the skills
   * page does document for a command file: it is invoked by its file name, so
   * the name is `SKILL`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(2, -1);
    if (directory.length > 0 && /^skill\.md$/iu.test(segments.at(-1)!)) {
      return directory.join(':');
    }
    return segments.slice(2).join(':').slice(0, -'.md'.length);
  }

  /** Compiles one Claude command record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude command rule`);
    }
  }
}

/**
 * A Claude MCP carrier rule compiled for execution: everything a Claude rule
 * is, plus the one question only an MCP rule answers — which servers a
 * carrier it admitted declares.
 */
export class ClaudeCompiledMcpCarrierRule
  extends ClaudeCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (registry.ts § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `mcpServers` declarations one admitted `.mcp.json` makes, one per
   * named map entry, in the parser's resolved order (FR-007): which key
   * means "MCP declarations" is Claude's vendor fact, so the reading lives
   * here, on the vendor's one explicit carrier — only explicit MCP
   * configuration joins the MCP surfaces, so a file of another kind that
   * spells the key holds its own kind's recognition alone, its declarations
   * visible in that file's own detail (contracts/vendors/claude-code.md
   * § Normative initial-release presentation allowlist, MCP row).
   *
   * Classification is structural and total: only a mapping under
   * `mcpServers` declares servers, and an entry whose value is not a
   * mapping — a scalar, a sequence, an authored `null` — is omitted whole
   * rather than published partially, exactly as an absent or non-mapping
   * `mcpServers` declares nothing. No field is validated, no environment
   * reference is resolved, and no declared command, URL, or path gains read
   * or connection authority: the output is the file's own declarations,
   * rendered and nothing more.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const declared = new ParsedStrictJsonDocument(sourceText).entries;
    // Strict JSON keys are strings, and the parser resolves a key declared
    // twice to its later declaration, so the spelling alone identifies the
    // one possible container entry.
    const container = declared.find((entry) => entry.key === 'mcpServers');
    if (container === undefined || container.value.kind !== 'mapping') {
      return [];
    }
    return container.value.entries.flatMap((entry) =>
      entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
    );
  }

  /** Compiles one Claude MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * A Claude permission-policy carrier rule compiled for execution: everything a
 * Claude rule is, plus the one question only this kind's carrier unit answers —
 * which policy block a settings file it admitted declares.
 */
export class ClaudeCompiledPermissionsCarrierRule
  extends ClaudeCompiledRule
  implements CompiledStaticPermissionsCarrierRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'permissions';

  /** This unit reads a block out of the document it admits (registry.ts § CompiledStaticPermissionsCarrierRule). */
  public readonly permissionsReading: 'declared-block';

  /**
   * The entries of the `permissions` object one admitted settings file
   * declares, in the parser's resolved order (FR-007), or null when the file
   * declares no such object — which is no policy rather than an empty one, so
   * the recognizer publishes no recognition and the file reaches no
   * permissions row.
   *
   * The whole object, every key it holds: an allowlist of some of its keys
   * would drop authored policy without being able to say which was dropped
   * (contracts/vendors/claude-code.md § Normative initial-release presentation
   * allowlist). A `permissions` key whose value is not a mapping declares no
   * policy either — there is no block to publish — which is the same null.
   *
   * No rule string is resolved to a tool, a command, a path, or a domain, and
   * nothing is evaluated against a filesystem: the output is the block the
   * author wrote (FR-019, FR-026).
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * file stays an admitted candidate (FR-028).
   */
  public declaredPolicyOf(sourceText: string): readonly DeclaredEntryDto[] | null {
    const declared = new ParsedStrictJsonDocument(sourceText).entries;
    // Strict JSON keys are strings, and the parser resolves a key declared
    // twice to its later declaration, so the spelling alone identifies the
    // one possible policy entry.
    const container = declared.find((entry) => entry.key === 'permissions');
    return container === undefined || container.value.kind !== 'mapping'
      ? null
      : container.value.entries;
  }

  /** Compiles one Claude permission-policy carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'permissions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude permission-policy carrier rule`);
    }
    this.permissionsReading = 'declared-block';
  }
}

/**
 * A Claude skill rule compiled for execution: everything a Claude rule is,
 * plus the one question only a skill rule answers — the command name Claude
 * Code invokes an admitted `SKILL.md` by. The derivation lives here, beside
 * the rule that owns it, because it is built from the path this rule's own
 * selectors match (contracts/vendors/anthropic-claude-code.md § Normative
 * initial-release presentation allowlist).
 */
export class ClaudeCompiledSkillRule extends ClaudeCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The vendor's documented command name: the skill directory, qualified with
   * the root-relative `/`-joined path of the directory holding the skill's
   * `.claude` and a `:` when the skill is nested — `apps/web:deploy` — and the
   * bare directory name at the root (skills page § How a skill gets its
   * command name).
   *
   * The declared `name` is deliberately not read, which is why the parameter
   * is unused: the vendor treats that field as a display label, so a row keyed
   * by it would head a group Claude Code does not answer to. It also means a
   * failed extraction takes nothing away from the name — the path is its whole
   * basis (FR-028).
   *
   * The qualification is always applied, deliberately diverging from the
   * vendor's clash-conditional, session-cwd-relative prefix: the inspector
   * observes no session and never reads the layers that decide whether an
   * unqualified name is free, so the root-relative spelling is the one stable
   * name a static inventory can stand behind.
   *
   * Defined for the paths this rule admits, whose shape is
   * `<prefix...>/.claude/skills/<skill-directory>/SKILL.md`.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    _declared: readonly DeclaredEntryDto[],
  ): string {
    const segments = sourceRelativePath.split('/');
    const prefix = segments.slice(0, -4);
    const skillDirectory = skillDirectoryOf(sourceRelativePath);
    return prefix.length === 0 ? skillDirectory : `${prefix.join('/')}:${skillDirectory}`;
  }

  /** Compiles one Claude skill record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude skill rule`);
    }
  }
}

/**
 * A Claude output-style rule compiled for execution: everything a Claude rule
 * is, plus the one question only an output-style rule answers — the name a
 * reader selects an admitted style by. The derivation lives here, beside the
 * rule that owns it, because it is this vendor's own contract
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
export class ClaudeCompiledOutputStyleRule
  extends ClaudeCompiledRule
  implements CompiledStaticOutputStyleRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'output style';

  /**
   * The vendor's documented style name: the frontmatter `name` the file
   * declares, or its own file name without the `.md` extension when it
   * declares none — "the file name becomes the style name unless you set
   * `name` in the frontmatter" (output-styles page § Create a custom output
   * style).
   *
   * Read by the string key and the scalar kind: a sequence under that key has
   * a rendering too, and taking its text would name a style after the first
   * item of a list the file did not write as a name. An authored empty name
   * falls back the same way an absent one does, because a picker cannot show
   * a style by a name with no characters.
   *
   * A failed extraction hands this an empty list, so the style lands on its
   * file name — the same string the vendor's own fallback produces for a file
   * declaring none, reached for a different reason (FR-028).
   *
   * Never empty, whatever the file is called: a file named exactly `.md` has no
   * basename to fall back to, so the name is its entry name as written.
   */
  public styleNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string {
    for (const entry of declared) {
      if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
        if (entry.value.text !== '') {
          return entry.value.text;
        }
        break;
      }
    }
    const fileName = sourceRelativePath.split('/').at(-1) ?? '';
    const withoutExtension = fileName.slice(0, -'.md'.length);
    // A file named exactly `.md` is admitted — the selector's terminal step
    // matches the extension, and `.md` ends with it — and stripping the
    // extension from it leaves nothing. The name is then the entry name as
    // written: a style name is never empty (api-types.ts
    // § OutputStyleInventoryEntryDto), and `.md` is what a picker listing this
    // file has to show, because the vendor's rule is the file name and this
    // file's name is all extension.
    return withoutExtension === '' ? fileName : withoutExtension;
  }

  /** Compiles one Claude output-style record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'output style') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude output-style rule`);
    }
  }
}

/**
 * The key a Claude plugin catalog lists its entries under
 * (contracts/vendors/claude-code.md § Repository vendor behavior): the page
 * defines a marketplace as a `plugins` array of one object per plugin. A
 * literal here rather than anything a caller passes, because it is this
 * vendor's own format.
 */
const CLAUDE_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a catalog and a plugin declaration each write their name under. */
const CLAUDE_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const CLAUDE_PLUGIN_SOURCE_KEY = 'source';

/**
 * The key a source object writes its path under; an entry may also spell the
 * whole source as that path string
 * (`anthropic.claude-code.marketplaces.catalog-sources` § Plugin sources).
 */
const CLAUDE_PLUGIN_SOURCE_PATH_KEY = 'path';

/** The `source.source` value naming the one form that is a path in this repository. */
const CLAUDE_LOCAL_SOURCE_VALUE = 'local';

/**
 * Where a Claude plugin root keeps the plugin's own manifest, relative to that
 * root (`claude.behavior.repo.plugin`): the file locations reference puts it at
 * `.claude-plugin/plugin.json` and marks it optional.
 *
 * It names the file rather than admitting it below a catalog's root: no rule
 * reaches a manifest there, and the file is published as one of the plugin's
 * own. What this answers is which of those files the plugin's detail opens on.
 */
const CLAUDE_PLUGIN_MANIFEST_PATH = '.claude-plugin/plugin.json';

/**
 * The marketplace a skills-directory plugin is addressed under
 * (`anthropic.claude-code.plugins.components-scopes` § Skills-directory
 * plugins): the page names such a plugin `<folder>@skills-dir`, so the
 * qualifier is the vendor's own word rather than a catalog name.
 */
const CLAUDE_SKILLS_DIRECTORY_MARKETPLACE = 'skills-dir';

/**
 * The name one declaration resolves: the `name` scalar exactly as written, or
 * null when it writes none or writes it as anything but a scalar — naming a
 * plugin after the first item of a list it wrote would be an identity the file
 * never declared (FR-007).
 */
function claudePluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === CLAUDE_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * The name Claude addresses one plugin by: the plugin's own name qualified by
 * the marketplace it came from, `<plugin-name>@<marketplace-name>` — the key
 * `enabledPlugins` uses and `/plugin` takes — or null when either half is
 * missing, because a plugin Claude could not address is no name at all.
 *
 * It lives here because it is Claude's rule. Another product's plugin phase
 * resolves its own names in its own module, exactly as each vendor resolves its
 * own skill and command names (FR-007).
 */
function claudeQualifiedPluginNameOf(
  pluginName: string | null,
  marketplaceName: string | null,
): string | null {
  return pluginName === null || marketplaceName === null
    ? null
    : `${pluginName}@${marketplaceName}`;
}

/**
 * The plugin root one catalog entry names inside the Source, as a
 * Source-relative directory with its trailing slash, or null when the entry
 * names none this repository holds.
 *
 * The documented local form is what this accepts and nothing else: the source
 * is either the object form with `source: 'local'` and a `path`, or the plain
 * string path an entry may use instead. The path must begin with `./`, and
 * every segment after that prefix must be an ordinary entry name — a `..`
 * segment, an absolute path, a `~` home path, and a GitHub, git, npm, archive,
 * or command source all name nothing here, because the derivation is closed and
 * a source it cannot validate is not a directory it may name (FR-004, FR-024).
 *
 * `./` is relative to the marketplace root, which for a repository's own
 * catalog is the Source root: the catalog is documented at
 * `.claude-plugin/marketplace.json` in that root.
 */
function claudeLocalPluginRootOf(fields: readonly DeclaredEntryDto[]): string | null {
  let declaredPath: string | null = null;
  for (const field of fields) {
    if (field.keyKind !== 'string' || field.key !== CLAUDE_PLUGIN_SOURCE_KEY) {
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
      if (entry.key === CLAUDE_PLUGIN_SOURCE_KEY) {
        isLocal = entry.value.text === CLAUDE_LOCAL_SOURCE_VALUE;
      }
      if (entry.key === CLAUDE_PLUGIN_SOURCE_PATH_KEY) {
        path = entry.value.text;
      }
    }
    // A `github`, `git`, `npm`, `archive`, or `command` entry also writes a
    // `path` or a `repo`, so the discriminant is checked rather than the
    // presence of a path.
    declaredPath = isLocal ? path : null;
    break;
  }
  const named = localPluginRootSegments(declaredPath);
  return named === null ? null : `${named.join('/')}/`;
}

/**
 * The Claude plugin catalog rule compiled for execution: everything a Claude
 * rule is, plus the one question only a catalog answers — which plugins its
 * entries resolve, and where each of them sits inside this Source.
 */
export class ClaudeCompiledPluginCatalogRule
  extends ClaudeCompiledRule
  implements CompiledStaticPluginCatalogRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is a catalog listing plugins. */
  public readonly pluginCarrier: 'catalog';

  /**
   * What one admitted catalog declares: its own keys except `plugins`, and one
   * declaration per entry of that array in the parser's resolved order, each
   * carrying the directory that entry's plugin occupies here and the manifest
   * inside it.
   *
   * Entry classification is structural and total, exactly as the MCP carrier
   * reading's is: only an object inside `plugins` is an entry, and a scalar or
   * an array there is omitted whole rather than published partially, as is a
   * `plugins` value that is not an array at all. Strict JSON because that is
   * what the catalog is.
   *
   * A plugin *is* its root: the optional `.claude-plugin/plugin.json` inside it
   * is one of the files it ships rather than a customization of its own, so an
   * entry answers the directory and names the manifest without admitting it.
   */
  public pluginCarrierReadingOf(sourceText: string): PluginCarrierReading {
    const entries = new ParsedStrictJsonDocument(sourceText).entries;
    const declared = entries.find(
      (entry) => entry.keyKind === 'string' && entry.key === CLAUDE_CATALOG_PLUGINS_KEY,
    );
    const catalogFields = entries.filter((entry) => entry !== declared);
    if (declared === undefined || declared.value.kind !== 'sequence') {
      return { catalogFields, plugins: [] };
    }
    // Each entry is published under the name Claude addresses that plugin by,
    // qualified by this catalog's own name; the entry's raw `name` stays one of
    // the `fields` below, where the detail publishes it as written (FR-007).
    const marketplaceName = claudePluginNameOf(catalogFields);
    return {
      catalogFields,
      plugins: declared.value.items.flatMap((item) => {
        if (item.kind !== 'mapping') {
          return [];
        }
        const pluginRoot = claudeLocalPluginRootOf(item.entries);
        return [
          {
            name: claudeQualifiedPluginNameOf(claudePluginNameOf(item.entries), marketplaceName),
            fields: item.entries,
            pluginRoot,
            manifestPaths:
              pluginRoot === null ? [] : [`${pluginRoot}${CLAUDE_PLUGIN_MANIFEST_PATH}`],
          },
        ];
      }),
    };
  }

  /** Compiles one Claude plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude plugin rule`);
    }
    this.pluginCarrier = 'catalog';
  }
}

/**
 * The Claude skills-directory plugin rule compiled for execution: everything a
 * Claude rule is, plus the one question only a manifest carrier answers — which
 * plugin this file declares, and which directory that plugin is.
 */
export class ClaudeCompiledPluginManifestRule
  extends ClaudeCompiledRule
  implements CompiledStaticPluginManifestRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'plugin';

  /** Discriminant: the admitted file is one plugin's own manifest. */
  public readonly pluginCarrier: 'manifest';

  /**
   * The one plugin this manifest declares: every key the file wrote, the folder
   * holding `.claude-plugin/` as the plugin root, and this file's own path as
   * that plugin's manifest.
   *
   * The name is the folder's, qualified by `skills-dir`: the cited page names
   * such a plugin `<folder>@skills-dir`, and what makes the folder a plugin is
   * this file being in it rather than anything the file says. The manifest's own
   * `name` key stays one of the fields the detail publishes.
   *
   * Strict JSON, and a manifest that declares nothing at all still declares its
   * plugin: the page makes every field optional but the folder is the plugin
   * either way.
   */
  public pluginCarrierReadingOf(
    sourceText: string,
    sourceRelativePath: string,
  ): PluginCarrierReading {
    const fields = new ParsedStrictJsonDocument(sourceText).entries;
    return {
      // A manifest declares one plugin and nothing about a catalog, so it
      // publishes no catalog fields: its own keys are that plugin's.
      catalogFields: [],
      // The placement is what establishes the plugin; the parse adds the keys
      // the file wrote to it.
      plugins: [{ ...this.pluginEstablishedByPath(sourceRelativePath), fields }],
    };
  }

  /**
   * The plugin this manifest's placement establishes, with no fields read out
   * of it (`registry.ts` § CompiledStaticPluginManifestRule).
   */
  public pluginEstablishedByPath(sourceRelativePath: string): PluginDeclarationDto {
    // `<root>/.claude-plugin/plugin.json`: the two trailing segments are the
    // rule's own literals, so what remains is the plugin root, and its last
    // segment is the folder Claude names the plugin after.
    const rootSegments = sourceRelativePath.split('/').slice(0, -2);
    return {
      name: claudeQualifiedPluginNameOf(
        rootSegments.at(-1) ?? null,
        CLAUDE_SKILLS_DIRECTORY_MARKETPLACE,
      ),
      fields: [],
      pluginRoot: `${rootSegments.join('/')}/`,
      manifestPaths: [sourceRelativePath],
    };
  }

  /** Compiles one Claude skills-directory plugin record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude plugin rule`);
    }
    this.pluginCarrier = 'manifest';
  }
}

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
 * The Claude custom-agent rule compiled for execution: everything a Claude
 * rule is, plus the one question only a custom-agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin.
 *
 * A Claude subagent is Markdown, so the split is the frontmatter fence: the
 * block configures the agent and the body is the system prompt it runs with
 * (contracts/vendors/claude-code.md § Repository Inspector matchers). The
 * reading lives here, beside the rule that owns it, because where the split
 * falls is this vendor's own contract; the Markdown parse and the rendering of
 * resolved values are the format's and stay in `parsers/markdown.ts`.
 */
export class ClaudeCompiledAgentRule extends ClaudeCompiledRule implements CompiledStaticAgentRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted Markdown file from the root's own `.claude/agents/` subtree,
   * split into the two halves its detail shows (FR-007): every frontmatter key
   * the file declares — `name`,
   * `description`, `tools`, `skills`, `memory`, and the `mcpServers` block
   * among them — as the metadata, and the body the fence leaves as the
   * instructions.
   *
   * The parse is this vendor's reading rather than the shared Markdown slot's,
   * for the reason the MCP and permission readings are keyed by tool: what a
   * rule reads out of a file is its own contract, and one physical file can be
   * two products' agent definition. Where the format coincides with the shared
   * parse — as it does here — the two resolve identically, so the repetition
   * is work over one string rather than a second fact
   * (`recognizers/candidate.ts` § CandidateExtractions).
   *
   * No field is validated, no environment reference is resolved, and no
   * declared skill, server, tool, or path gains read or connection authority.
   * A declared `mcpServers` block is one metadata entry and nothing more: it
   * makes the file no MCP carrier, because an MCP declaration's home is an
   * explicit carrier and nothing else (data-model.md § Inventory unit).
   * Throws on text the frontmatter parser cannot read; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the file stays an admitted candidate whose complete source is still
   * displayed (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedMarkdownDocument(sourceText);
    return { metadata: document.frontmatterEntries, instructionsText: document.body };
  }

  /**
   * The agent's declared `name`, which is what Claude Code identifies a
   * subagent by: the page documents the `name` field as the identifier and
   * adds that a subfolder inside the agents directory does not affect it, so
   * neither the file name nor the directory above it names a row here, and a
   * file declaring none joins the row that says the name is not known.
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

  /** Compiles one Claude custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude custom-agent rule`);
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
