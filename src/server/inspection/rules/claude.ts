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
  type CompiledStaticInstructionRule,
  type CompiledStaticMcpReadingRule,
  type CompiledStaticOtherKindRule,
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
   * named map entry, in the parser's resolved order (FR-007) — the
   * {@link claudeMcpServersOf} reading over the document's rendered entries,
   * the same one the documented contained owners will hand their own entries
   * when their phases admit them (contracts/vendors/claude-code.md
   * § Normative initial-release presentation allowlist, MCP row).
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    return claudeMcpServersOf(new ParsedStrictJsonDocument(sourceText).entries);
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
 * A Claude rule of every other kind, compiled for execution. It answers
 * nothing about applicability, which is exactly what a skill rule has to say
 * about it (see `CompiledNonInstructionRule`).
 */
export class ClaudeCompiledOtherKindRule
  extends ClaudeCompiledRule
  implements CompiledStaticOtherKindRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<CustomizationKind, 'instructions' | 'MCP'>;

  /** Compiles one Claude record of any kind but `instructions` and `MCP`. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind === 'instructions' || rule.kind === 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} needs a Claude unit that answers for its kind`);
    }
  }
}

/**
 * The MCP servers a Claude file's `mcpServers` declarations make, read out of
 * the shared declared-entry shape its parse already rendered (T330): which
 * key means "MCP declarations" is Claude's vendor fact, so the reading lives
 * beside Claude's rules, while the entry shape it reads is format-neutral —
 * one reading for every home the vendor documents (contracts/vendors/
 * claude-code.md § Normative initial-release presentation allowlist, MCP
 * row). The standalone carrier hands its JSON document's rendered entries
 * today, and each documented contained owner — an agent's frontmatter, a
 * plugin manifest's inline declarations, a settings file — hands the entries
 * its own format rendering produces when its phase admits it, so activating
 * a later owner family changes no reading. A skill is not such a home:
 * Claude documents no `mcpServers` skill-frontmatter field (user decision,
 * 2026-08-20).
 *
 * Classification is structural and total: only a mapping under `mcpServers`
 * declares servers, and an entry whose value is not a mapping — a scalar, a
 * sequence, an authored `null` — is omitted whole rather than published
 * partially, exactly as an absent or non-mapping `mcpServers` declares
 * nothing. No field is validated, no environment reference is resolved, and
 * no declared command, URL, or path gains read or connection authority: the
 * input is already-rendered declarations, which is what keeps the
 * contained-owner adapter non-authorizing.
 */
export function claudeMcpServersOf(
  declared: readonly DeclaredEntryDto[],
): readonly McpServerDeclarationDto[] {
  // The parser resolves a key declared twice to its later declaration, so at
  // most one `mcpServers` entry exists; a non-string key spelling the same
  // text is a different key and declares no servers.
  const container = declared.find(
    (entry) => entry.keyKind === 'string' && entry.key === 'mcpServers',
  );
  if (container === undefined || container.value.kind !== 'mapping') {
    return [];
  }
  return container.value.entries.flatMap((entry) =>
    entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
  );
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
  // an instruction record what its files govern, an MCP record which servers
  // its carrier declares; every other kind compiles into the plain one, which
  // is what keeps a skill rule from carrying an answer it has none of.
  rule.kind === 'instructions'
    ? new ClaudeCompiledInstructionRule(rule)
    : rule.kind === 'MCP'
      ? new ClaudeCompiledMcpCarrierRule(rule)
      : new ClaudeCompiledOtherKindRule(rule),
);
