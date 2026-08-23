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
  type CompiledStaticPermissionsCarrierRule,
  type CompiledStaticSkillRule,
} from './registry';
import { ParsedStrictJsonDocument } from '../parsers/json';
import { skillDirectoryOf } from '../../../shared/registries/skill-directory';
import { ParsedMarkdownDocument } from '../parsers/markdown';
import type {
  AgentPresentationDto,
  DeclaredEntryDto,
  McpServerDeclarationDto,
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
    'instructions' | 'skill' | 'MCP' | 'agent' | 'prompt/command' | 'permissions'
  >;

  /** Compiles one Claude record of any kind but the six with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'skill' ||
      rule.kind === 'MCP' ||
      rule.kind === 'agent' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'permissions'
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
 * Every shipped rule is compiled rather than filtered: a Claude record that
 * authorizes no traversal is rejected by the {@link ClaudeCompiledRule}
 * constructor instead of being skipped, so a registry row that cannot be
 * executed fails the build that ships it rather than disappearing from the
 * scan. Skipping arrives with the first rule whose class belongs in this
 * registry but not in this list.
 */
export const CLAUDE_REPOSITORY_RULES: readonly CompiledStaticCandidateRule[] = Object.values(
  CLAUDE_INSPECTION_RULES,
).map((rule) =>
  // Each record compiles into the unit that can answer its kind's question:
  // an instruction record what its files govern, a command record the name its
  // files are invoked by, an MCP record which servers its carrier declares, a
  // custom-agent record where its file's configuration ends and its
  // instructions begin, a skill record the command name its file is invoked
  // by; every other kind compiles into the plain one, which is what keeps a
  // rule-file rule from carrying an answer it has none of.
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
              : new ClaudeCompiledOtherKindRule(rule),
);
