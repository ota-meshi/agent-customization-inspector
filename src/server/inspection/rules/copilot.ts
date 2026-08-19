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
  type CompiledStaticCandidateRule,
  type CompiledStaticInstructionRule,
  type CompiledStaticNonInstructionRule,
} from './registry';
import type { FrontmatterEntryDto } from '../../../shared/api-types';
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
    declared: readonly FrontmatterEntryDto[],
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
 * A Copilot rule of every other kind, compiled for execution. It answers
 * nothing about applicability, which is exactly what a skill rule has to say
 * about it (see `CompiledNonInstructionRule`).
 */
export class CopilotCompiledOtherKindRule
  extends CopilotCompiledRule
  implements CompiledStaticNonInstructionRule
{
  /** Narrowed to the kinds this unit compiles; the constructor proves it. */
  declare public readonly kind: Exclude<CustomizationKind, 'instructions'>;

  /** Compiles one Copilot record of any kind but `instructions`. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind === 'instructions') {
      throw new TypeError(`rule ${rule.ruleId} needs the Copilot instruction unit`);
    }
  }
}

/**
 * The Copilot Repository rules a Repository scan executes, in shipped order.
 * The remaining Copilot rows of the vendor contract arrive with their own
 * inventory phases; the shipped set covers instructions and skills, so a
 * repository whose only Copilot files are agents or prompts legitimately
 * contributes nothing to the inventory.
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
    // An instruction record compiles into the unit that can answer what its
    // files govern; every other kind compiles into the plain one, which is what
    // keeps a skill rule from carrying an answer it has none of.
    rule.kind === 'instructions'
      ? new CopilotCompiledInstructionRule(rule)
      : new CopilotCompiledOtherKindRule(rule),
  );
