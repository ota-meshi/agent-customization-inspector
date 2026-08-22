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
  escapeGlobLiteral,
  type CompiledStaticCandidateRule,
  type CompiledStaticPromptRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
  type CompiledStaticPermissionsCarrierRule,
} from './registry';
import { ParsedStrictJsonDocument } from '../parsers/json';
import type { DeclaredEntryDto, McpServerDeclarationDto } from '../../../shared/api-types';
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
   * nothing is written is the standing decision for this kind (user decision).
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
 * A Claude rule of every other kind, compiled for execution. It answers
 * nothing about applicability, which is exactly what a skill rule has to say
 * about it (see `CompiledNonInstructionRule`).
 */
export class ClaudeCompiledOtherKindRule
  extends ClaudeCompiledRule
  implements CompiledStaticOtherKindRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<
    CustomizationKind,
    'instructions' | 'prompt/command' | 'MCP' | 'permissions'
  >;

  /** Compiles one Claude record of any kind but the four with a question of their own. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (
      rule.kind === 'instructions' ||
      rule.kind === 'prompt/command' ||
      rule.kind === 'MCP' ||
      rule.kind === 'permissions'
    ) {
      throw new TypeError(`rule ${rule.ruleId} needs a Claude unit that answers for its kind`);
    }
  }
}

/**
 * The Claude Repository rules a Repository scan executes, in shipped order.
 * The remaining Claude rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers instructions and skills, so a
 * repository whose only Claude files are settings or agents legitimately
 * contributes nothing to the inventory.
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
  // files are invoked by, an MCP record which servers its carrier declares;
  // every other kind compiles into the plain one, which is what keeps a skill
  // rule from carrying an answer it has none of.
  rule.kind === 'instructions'
    ? new ClaudeCompiledInstructionRule(rule)
    : rule.kind === 'prompt/command'
      ? new ClaudeCompiledPromptRule(rule)
      : rule.kind === 'MCP'
        ? new ClaudeCompiledMcpCarrierRule(rule)
        : rule.kind === 'permissions'
          ? new ClaudeCompiledPermissionsCarrierRule(rule)
          : new ClaudeCompiledOtherKindRule(rule),
);
