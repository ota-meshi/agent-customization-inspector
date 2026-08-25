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
import {
  CompiledInspectionRule,
  escapeGlobLiteral,
  type CompiledStaticAgentRule,
  type CompiledStaticCandidateRule,
  type CompiledStaticPromptRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpProvenanceRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
  type CompiledStaticPluginCatalogRule,
  type PluginCarrierReading,
  type CompiledStaticSkillRule,
  authoredSkillNameOf,
  localPluginRootSegments,
} from './registry';
import { ParsedJsoncDocument, ParsedStrictJsonDocument } from '../parsers/json';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  McpServerDeclarationDto,
} from '../../../shared/api-types';
import type { CustomizationKind } from '../../../shared/entities';
import { COPILOT_RULE_RELATIONS } from '../../../shared/registries/copilot/relations';
import { COPILOT_INSPECTION_RULES } from '../../../shared/registries/copilot/rules';
import type { RuleId } from '../../../shared/registries/identifier-types';
import type { RuleRelations } from '../../../shared/registries/relation-types';
import type { InspectionRule } from '../../../shared/registries/rule-types';

/**
 * A Copilot rule compiled for execution: the shared compilation from the base,
 * plus what is Copilot's own — the `tool` literal a mixed rule list
 * discriminates on, and the relations resolved from Copilot's catalog by the
 * rule's own identity, so no rule can be compiled with another rule's edges.
 */
export abstract class CopilotCompiledRule extends CompiledInspectionRule {
  /** Always `copilot`; the discriminant a mixed vendor list narrows on. */
  public override readonly tool: 'copilot';

  /** The rule's edges from {@link COPILOT_RULE_RELATIONS}, keyed by its own ID. */
  public override readonly relations: RuleRelations;

  /** Compiles one Copilot record, rejecting one another product owns. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.tool !== 'copilot') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot rule`);
    }
    this.tool = rule.tool;
    // Widened to a partial view for the lookup: `InspectionRule` does not
    // correlate `tool` with `ruleId`, so the vendor registry could supply a
    // Copilot-tagged record whose ID another vendor's catalog owns. The lookup
    // must fail loudly rather than compile that record with another vendor's
    // edges.
    const relations: Readonly<Partial<Record<RuleId, RuleRelations>>> = COPILOT_RULE_RELATIONS;
    const edges = relations[rule.ruleId];
    if (edges === undefined) {
      throw new TypeError(`rule ${rule.ruleId} has no Copilot relations`);
    }
    this.relations = edges;
  }
}

/**
 * A Copilot instruction rule compiled for execution: everything a Copilot rule
 * is, plus the one question only an instruction rule answers — what a file it
 * admitted governs.
 *
 * The repository-wide file derives its range from its path: `.github` is
 * where Copilot keeps it, not what it governs, so that segment is stripped
 * from the tail and the directory above it is the range (data-model.md
 * § Inventory unit). The root file therefore derives the root's `**`, and a
 * `packages/api/.github/copilot-instructions.md` — admitted because the CLI
 * reads that filename relative to the context its session runs in — derives
 * `packages/api/**`. The agent-instruction filenames — `AGENTS.md`,
 * `CLAUDE.md`, `GEMINI.md` — keep their whole directory: no source documents
 * Copilot keeping one of them in `.github`, so a `.github/AGENTS.md` governs
 * that directory rather than borrowing a strip decided for a different
 * filename.
 *
 * A path-specific file is the one shipped case that names its own range: its
 * `applyTo` declaration is what it governs, wherever the file sits, so the
 * declared value keys the row and the path decides nothing (spec.md
 * § Clarifications). When such a file declares nothing a row can be keyed
 * by — no `applyTo`, an empty one, a shape with no row spelling, or a parse
 * that failed — the answer is null, not a path: the vendor documents these
 * files as applied by their declaration alone, VS Code saying outright that
 * an undeclared file is not applied automatically, so a range read off the
 * path would state the widest governance for a file the vendor gives none.
 * The inventory lists such a file under the row that says no range is known,
 * with its own diagnostics beside it when the reason is a failed parse
 * (FR-028).
 */
export class CopilotCompiledInstructionRule
  extends CopilotCompiledRule
  implements CompiledStaticInstructionRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'instructions';

  /** The glob one admitted Copilot instruction file governs, or null; see the class comment. */
  public applicabilityRangeOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(0, -1);
    const name = segments.at(-1);
    if (name?.endsWith('.instructions.md') === true) {
      // The declared branch, and only for the filename Copilot documents
      // `applyTo` on: an `AGENTS.md` that happens to carry the key declared it
      // to nobody, and keying its row by it would report a scope no surface
      // reads. The parser resolves a key declared twice to its later
      // declaration, so the entry found here is the one the file itself
      // resolves to.
      const applyTo = declared.find(
        (entry) => entry.keyKind === 'string' && entry.key === 'applyTo',
      );
      // Published as the parser resolved it (data-model.md § Field reading) —
      // the value's own quotes and YAML escapes resolved once, exactly as the
      // detail shows the declaration — and deliberately not escaped further:
      // the resolved value already is the author's pattern, and escaping it
      // would turn `src/frontend/**` into a directory literally named that.
      // A sequence or mapping has no spelling a row can be keyed by, and an
      // authored empty string denotes nothing; both are the null answer, like
      // a file that declares no `applyTo` at all. The declaration still
      // reaches the reader through the file's own detail, so nothing about it
      // is hidden by not keying a row.
      return applyTo?.value.kind === 'scalar' && applyTo.value.text !== ''
        ? applyTo.value.text
        : null;
    }
    if (name === 'copilot-instructions.md' && directory.at(-1) === '.github') {
      // `.github` is where Copilot keeps this file, not what it governs.
      directory.pop();
    }
    return directory.length === 0 ? '**' : `${directory.map(escapeGlobLiteral).join('/')}/**`;
  }

  /** Compiles one Copilot instruction record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot instruction rule`);
    }
  }
}

/**
 * A Copilot CLI MCP carrier rule compiled for execution: everything a Copilot
 * rule is, plus the one question only an MCP rule answers — which servers a
 * carrier it admitted declares.
 */
export class CopilotCompiledMcpCarrierRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns the CLI's documented reading (registry.ts § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The server declarations one admitted CLI carrier makes, one per named
   * map entry, in the parser's resolved order (FR-007). The CLI documents
   * two strict-JSON schemas for a project-level file — the top-level
   * `mcpServers` object, and the bare top-level format where each key is a
   * server name (contracts/vendors/github-copilot.md § Repository vendor
   * behavior, `copilot.behavior.cli.mcp`) — and this reading accepts both,
   * which is one reason it is this vendor's own contract rather than a
   * shared one: Claude reads only the wrapper form out of the same root
   * `.mcp.json`.
   *
   * A file declaring a top-level `mcpServers` key is the wrapper form —
   * the vendor documents that key as the wrapper, so it is never read as a
   * bare server of that name, and a non-mapping `mcpServers` then declares
   * none. Classification is structural and total: only a mapping-valued
   * entry declares a server, and any other entry is omitted whole rather
   * than published partially. No field is validated, no environment
   * reference is resolved, and no declared command, URL, or path gains read
   * or connection authority. Throws on text strict JSON cannot parse; the
   * recognizer's extraction boundary turns the throw into the recognition's
   * `failed` state while the carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const { entries } = new ParsedStrictJsonDocument(sourceText);
    const wrapper = entries.find((entry) => entry.key === 'mcpServers');
    const declared =
      wrapper !== undefined
        ? wrapper.value.kind === 'mapping'
          ? wrapper.value.entries
          : []
        : entries;
    return declared.flatMap((entry) =>
      entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
    );
  }

  /** Compiles one Copilot MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * The VS Code `.vscode/mcp.json` carrier rule compiled for execution. Its own
 * unit beside the CLI's because the two schemas are different vendors' —
 * different surfaces' — contracts: the guide documents a top-level `servers`
 * map in the editor's JSONC configuration format, while the CLI carriers are
 * strict JSON with the `mcpServers` wrapper or the bare map (T361, T371).
 */
export class CopilotCompiledVscodeMcpCarrierRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns the guide's documented reading (registry.ts § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The server declarations one admitted `.vscode/mcp.json` makes, one per
   * named entry of the documented top-level `servers` map, in the parser's
   * resolved order (FR-007). Read as JSONC — comments and a trailing comma
   * are the editor configuration format's own syntax — and never leniently
   * beyond that: a document with any syntax error fails whole (FR-028).
   * Classification is structural and total, exactly as the CLI reading's: a
   * non-mapping `servers` declares none, only a mapping-valued entry declares
   * a server, and any other entry is omitted whole rather than published
   * partially. There is no bare form here — the guide documents the wrapper
   * alone — and the `inputs` and `sandbox` sections beside it declare no
   * server. No field is validated, no environment or input reference is
   * resolved, and no declared command, URL, or path gains read or connection
   * authority.
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const { entries } = new ParsedJsoncDocument(sourceText);
    const wrapper = entries.find((entry) => entry.key === 'servers');
    const declared = wrapper?.value.kind === 'mapping' ? wrapper.value.entries : [];
    return declared.flatMap((entry) =>
      entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
    );
  }

  /** Compiles the one VS Code MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * A Copilot MCP rule whose admission is path/surface provenance only
 * (registry.ts § CompiledStaticMcpProvenanceRule): the shipped record is
 * `copilot.repo.mcp.vscode-root`, whose one selector coincides with a
 * `copilot.repo.mcp` selector, so its admission adds the VS Code surface to
 * the root carrier's one Copilot recognition while the declarations stay the
 * CLI unit's independently documented extraction. No VS Code-owned extractor
 * exists until direct documentation establishes the root file's schema.
 */
export class CopilotCompiledMcpProvenanceRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpProvenanceRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** No reading: the admission carries provenance alone (see the class doc). */
  public readonly mcpReading: 'none';

  /** Compiles one provenance-only MCP record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'none';
  }
}

/**
 * The longer of the two agent-profile spellings the shared reference names.
 * Declared once because the name derivation strips it and the shorter `.md`
 * is what remains, so the two must not drift apart.
 */
const COPILOT_AGENT_PROFILE_SUFFIX = '.agent.md';

/**
 * A Copilot custom-agent rule compiled for execution: everything a Copilot
 * rule is, plus the two questions only an agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin, and
 * which name the product identifies it by.
 *
 * The reading lives here, beside the rule that owns it, because the profile
 * format is this vendor's own contract
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules);
 * the Markdown parse and the rendering of resolved values are the format's and
 * stay in `parsers/markdown.ts`.
 *
 * Both agent records compile into this one unit: the two differ in which
 * directory they admit and therefore in which surfaces they rest on, which is
 * the rules' own fact, while how an admitted file splits and what names it is
 * identical for either.
 */
export class CopilotCompiledAgentRule
  extends CopilotCompiledRule
  implements CompiledStaticAgentRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted agent profile split into the two halves its detail shows
   * (FR-007): every frontmatter key the file declares — `name`, `description`,
   * `target`, `tools`, and the `mcp-servers` block among them — as the
   * metadata, and the body the fence leaves as the instructions the profile
   * gives the agent.
   *
   * The parse is this vendor's reading rather than the shared Markdown slot's,
   * for the reason Claude's is: what a rule reads out of a file is its own
   * contract, and a `.claude/agents/*.md` this rule admits is one physical
   * file two products define an agent from. Where the format coincides — as it
   * does here — the two resolve identically, so the repetition is work over
   * one string rather than a second fact
   * (`recognizers/candidate.ts` § CandidateExtractions).
   *
   * No field is validated, no environment reference is resolved, and no
   * declared tool, skill, server, or path gains read or connection authority.
   * A declared `mcp-servers` block is one metadata entry and nothing more: it
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
   * The configuration file's own name minus `.agent.md` or `.md`, which is
   * what the shared profile reference states Copilot identifies an agent by:
   * that name is what deduplicates the levels, while the frontmatter `name` is
   * documented as an optional display name. So the declarations are unused
   * here, deliberately — a row named after a declared `name` would report an
   * agent this product does not deduplicate under it — and a failed extraction
   * takes nothing away from the row's identity (FR-028).
   *
   * Never `null`: a path always answers. A file named `.agent.md` or `.md`
   * outright has an empty name, which is the vendor's own answer for it rather
   * than an absent one, and the row states it as the empty name it is.
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `copilot.repo.agent` record, whose two selectors both end in `/\.md$/u`.
   */
  public agentNameOf(sourceRelativePath: string): string {
    const fileName = sourceRelativePath.split('/').at(-1)!;
    return fileName.endsWith(COPILOT_AGENT_PROFILE_SUFFIX)
      ? fileName.slice(0, -COPILOT_AGENT_PROFILE_SUFFIX.length)
      : fileName.slice(0, -'.md'.length);
  }

  /** Compiles one Copilot custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot custom-agent rule`);
    }
  }
}

/**
 * A Copilot command rule compiled for execution: everything a Copilot rule is,
 * plus the one question only a command rule answers — the name a reader
 * invokes an admitted file by.
 */
export class CopilotCompiledPromptRule
  extends CopilotCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The command name one admitted file is invoked by: its file name without
   * the `.md` extension. That is the whole rule the CLI reference states —
   * "the command name is derived from the filename" — and there is nothing
   * for a namespace to come from, because this rule admits root direct
   * children alone.
   *
   * Deliberately not Claude's derivation over the same directory: Claude
   * documents a subdirectory namespace and Copilot documents none, so one
   * shared answer would put a namespace on a product that never wrote about
   * one. A root direct child is where the two derivations agree, which is why
   * a shared file lands on one inventory row with a definition from each
   * product (data-model.md § Inventory unit).
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `copilot.repo.command` record, whose one selector ends in `/\.md$/u`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    return sourceRelativePath.split('/').at(-1)!.slice(0, -'.md'.length);
  }

  /** Compiles one Copilot command record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot command rule`);
    }
  }
}

/**
 * A Copilot prompt-file rule compiled for execution: everything a Copilot rule
 * is, plus the name a reader invokes an admitted prompt by.
 *
 * Its own unit beside {@link CopilotCompiledPromptRule}, which compiles the
 * legacy command rule of the same kind, because the two answer the question
 * differently — a prompt file declares its own name and a command file never
 * does — and one unit answering both would have to ask which rule compiled it.
 */
export class CopilotCompiledPromptFileRule
  extends CopilotCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The prompt's own declared `name`, or its file name without the
   * `.prompt.md` extension when it declares none — which is what the page
   * states: the `name` field is the name of the prompt used after typing `/`
   * in chat, and if it is not specified the file name is used.
   *
   * A declared `name` counts only when it resolved to a non-empty scalar: a
   * mapping or a sequence under that key is not a name a reader could type,
   * and an authored empty string names nothing, so both fall back to the file
   * name rather than putting an unusable row heading on screen.
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `copilot.repo.prompt` record, whose one selector ends in
   * `/\.prompt\.md$/u`.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    for (const entry of declared) {
      if (entry.key === 'name' && entry.value.kind === 'scalar' && entry.value.text !== '') {
        return entry.value.text;
      }
    }
    return sourceRelativePath.split('/').at(-1)!.slice(0, -'.prompt.md'.length);
  }

  /** Compiles one Copilot prompt-file record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot prompt rule`);
    }
  }
}

/**
 * A Copilot skill rule, compiled for execution: everything a Copilot rule is,
 * plus the one question only a skill rule answers — the name Copilot invokes
 * an admitted `SKILL.md` by. The answer lives here, beside the rule that owns
 * it, because a skill's identity is this vendor's own contract
 * (contracts/vendors/github-copilot.md § Normative initial-release
 * presentation allowlist).
 */
export class CopilotCompiledSkillRule
  extends CopilotCompiledRule
  implements CompiledStaticSkillRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The `name` the file declares, with the skill directory as the fallback —
   * the shared answer of the products that document that field as the skill's
   * identity ({@link authoredSkillNameOf}), which Copilot is one of. It is
   * what makes a `.claude/skills/lander/SKILL.md` declaring `name: voyage`
   * Copilot's `voyage` and Claude Code's `lander`: each product is asked its
   * own rule about the same file.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one Copilot skill record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot skill rule`);
    }
  }
}

/**
 * The key a Copilot plugin catalog lists its entries under
 * (contracts/vendors/github-copilot.md § Repository vendor behavior): the CLI
 * reference defines a marketplace as a `plugins` array of one object per
 * plugin. A literal here rather than anything a caller passes, because it is
 * this vendor's own format.
 */
const COPILOT_CATALOG_PLUGINS_KEY = 'plugins';

/** The key a catalog and a plugin declaration each write their name under. */
const COPILOT_PLUGIN_NAME_KEY = 'name';

/** The key a catalog entry writes its source under. */
const COPILOT_PLUGIN_SOURCE_KEY = 'source';

/** The key a source object writes its path under. */
const COPILOT_PLUGIN_SOURCE_PATH_KEY = 'path';

/** The `source.source` value naming the one form that is a path in this repository. */
const COPILOT_LOCAL_SOURCE_VALUE = 'local';

/**
 * Where a Copilot plugin root may keep the plugin's own manifest, relative to
 * that root, in the order the CLI checks them
 * (`github.copilot.cli.plugins` § File locations).
 *
 * Four forms rather than one because this vendor reads four: a root
 * `plugin.json` is the Copilot and Agent Plugins form, `.claude-plugin/` is the
 * Claude form it also accepts, and `.plugin/` is the legacy OpenPlugin one.
 * They name files rather than admitting them: no rule reaches a manifest below
 * a catalog's root, and each is published as one of the plugin's own files.
 */
const COPILOT_PLUGIN_MANIFEST_PATHS: readonly string[] = [
  '.plugin/plugin.json',
  'plugin.json',
  '.github/plugin/plugin.json',
  '.claude-plugin/plugin.json',
];

/**
 * The name one declaration resolves: the `name` scalar exactly as written, or
 * null when it writes none or writes it as anything but a scalar — naming a
 * plugin after the first item of a list it wrote would be an identity the file
 * never declared (FR-007).
 */
function copilotPluginNameOf(fields: readonly DeclaredEntryDto[]): string | null {
  for (const field of fields) {
    if (field.keyKind === 'string' && field.key === COPILOT_PLUGIN_NAME_KEY) {
      return field.value.kind === 'scalar' ? field.value.text : null;
    }
  }
  return null;
}

/**
 * The name Copilot addresses one plugin by: the plugin's own name qualified by
 * the marketplace it came from, `<plugin-name>@<marketplace-name>` — the key
 * `enabledPlugins` uses and `copilot plugins install` takes — or null when
 * either half is missing, because a plugin Copilot could not address is no name
 * at all.
 */
function copilotQualifiedPluginNameOf(
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
 * The documented local form and nothing else: the source is either the object
 * form with `source: 'local'` and a `path`, or the plain string path an entry
 * may use instead, and the path must begin with `./`. A GitHub shorthand, a Git
 * URL, an npm or PyPI package, an absolute path, and a `..` segment all name
 * nothing here, because the derivation is closed and a source it cannot
 * validate is not a directory it may name (FR-004, FR-024).
 */
function copilotLocalPluginRootOf(fields: readonly DeclaredEntryDto[]): string | null {
  let declaredPath: string | null = null;
  for (const field of fields) {
    if (field.keyKind !== 'string' || field.key !== COPILOT_PLUGIN_SOURCE_KEY) {
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
      if (entry.key === COPILOT_PLUGIN_SOURCE_KEY) {
        isLocal = entry.value.text === COPILOT_LOCAL_SOURCE_VALUE;
      }
      if (entry.key === COPILOT_PLUGIN_SOURCE_PATH_KEY) {
        path = entry.value.text;
      }
    }
    // A git or npm entry also writes a `path` or a `repo`, so the discriminant
    // is checked rather than the presence of a path.
    declaredPath = isLocal ? path : null;
    break;
  }
  const named = localPluginRootSegments(declaredPath);
  return named === null ? null : `${named.join('/')}/`;
}

/**
 * The Copilot plugin catalog rule compiled for execution: everything a Copilot
 * rule is, plus the one question only a catalog answers — which plugins its
 * entries resolve, and where each of them sits inside this Source.
 */
export class CopilotCompiledPluginCatalogRule
  extends CopilotCompiledRule
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
   * forms this vendor checks inside it.
   *
   * Entry classification is structural and total, exactly as the MCP carrier
   * reading's is: only an object inside `plugins` is an entry, and a scalar or
   * an array there is omitted whole rather than published partially, as is a
   * `plugins` value that is not an array at all. Strict JSON because that is
   * what the catalog is.
   */
  public pluginCarrierReadingOf(sourceText: string): PluginCarrierReading {
    const entries = new ParsedStrictJsonDocument(sourceText).entries;
    const declared = entries.find(
      (entry) => entry.keyKind === 'string' && entry.key === COPILOT_CATALOG_PLUGINS_KEY,
    );
    const catalogFields = entries.filter((entry) => entry !== declared);
    if (declared === undefined || declared.value.kind !== 'sequence') {
      return { catalogFields, plugins: [] };
    }
    const marketplaceName = copilotPluginNameOf(catalogFields);
    return {
      catalogFields,
      plugins: declared.value.items.flatMap((item) => {
        if (item.kind !== 'mapping') {
          return [];
        }
        const pluginRoot = copilotLocalPluginRootOf(item.entries);
        return [
          {
            name: copilotQualifiedPluginNameOf(copilotPluginNameOf(item.entries), marketplaceName),
            fields: item.entries,
            pluginRoot,
            manifestPaths:
              pluginRoot === null
                ? []
                : COPILOT_PLUGIN_MANIFEST_PATHS.map((form) => `${pluginRoot}${form}`),
          },
        ];
      }),
    };
  }

  /** Compiles one Copilot plugin catalog record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'plugin') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot plugin rule`);
    }
    this.pluginCarrier = 'catalog';
  }
}

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
    | 'plugin'
    | 'output style'
  >;

  /** Compiles one Copilot record of any kind but the seven with a question of their own. */
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
  .filter((rule) => rule.discoveryClass === 'static-candidate')
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
            : rule.kind === 'prompt/command'
              ? rule.ruleId === 'copilot.repo.prompt'
                ? new CopilotCompiledPromptFileRule(rule)
                : new CopilotCompiledPromptRule(rule)
              : rule.kind === 'plugin'
                ? new CopilotCompiledPluginCatalogRule(rule)
                : new CopilotCompiledOtherKindRule(rule),
  );
