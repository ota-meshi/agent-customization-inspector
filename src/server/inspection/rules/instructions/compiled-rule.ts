// What an instruction rule is to the scan: the contract a compiled unit of this
// kind answers, for the static rules that admit a file at a matched path and
// for the one derivation whose targets are named by configuration.
//
// The kind's own contract rather than a member of every compiled rule: an
// applicability range is a fact about an instruction file alone, so declaring
// it on the shared base would make a skill rule answer a question it has none
// of (AGENTS.md § Class and interface policy). Each vendor's answer is its own
// module beside this one.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledDerivedRule, CompiledInspectionRule, TraversalPlan } from '../registry';

/**
 * A compiled rule that admits *instruction* files, and can therefore answer
 * the glob one of its admitted files governs, relative to the Repository root
 * (data-model.md § Inventory unit) — the identity the instructions inventory
 * groups its rows by.
 *
 * Deliberately not a member of {@link CompiledRule}. That class is what every
 * kind compiles to, and an applicability range is a fact about an instruction
 * file alone: declaring it there would make a skill rule answer a question it
 * has no answer to (AGENTS.md § Class and interface policy). A product whose
 * catalog holds an instruction record compiles that record into a unit
 * implementing this — each shipped product has one.
 *
 * What the answer is belongs to the product: a root-anchored lookup answers
 * the root's `**`, because that is where the Inspector's boundary is (FR-001)
 * and a file admitted there governs the repository entirely, while a product
 * documenting per-directory discovery derives the range from the path.
 *
 * `sourceRelativePath` is the file's own path segments joined with `/` on every platform
 * ({@link toPublicPath}), so an implementation that reads it splits on `/`
 * rather than on the host separator.
 *
 * `declared` is what the file's frontmatter declares, because some products
 * let a file name its own range — Copilot's `applyTo` — and a declared range
 * is what that file governs however its path reads (spec.md § Clarifications).
 * It is empty for a file that declares nothing and for one whose extraction
 * failed (FR-028).
 *
 * The answer is null exactly when the product reads the filename's range from
 * its declaration alone and the declarations supply none — Copilot's
 * `.instructions.md` without a usable `applyTo`, which its surfaces document
 * as not applied automatically. Deriving a range from such a file's path
 * would state the widest governance for a file the vendor gives none, so the
 * honest answer is that no range is known, and the inventory lists the file
 * under the row that says so (data-model.md § Inventory unit).
 *
 * Never a claim that a product loaded the file: an admission is not an
 * activation (FR-009).
 */
export interface CompiledStaticInstructionRule extends CompiledInspectionRule {
  /** The recognized kind; an instruction unit compiles instruction records alone. */
  readonly kind: 'instructions';
  /** The glob one admitted file governs, or null when it has none; see above. */
  applicabilityRangeOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null;
}

/**
 * A compiled derivation whose candidates are instruction files: the
 * configured-basename derivation, whose plan is one exact Repository-root
 * selector per declared name.
 *
 * The derived counterpart of {@link CompiledStaticInstructionRule}, and its
 * own type for the same reason the static kinds are: a derivation of another
 * kind cannot answer what range its files govern, and a union member that
 * could be either would make every caller assert.
 */
export interface CompiledDerivedInstructionRule extends CompiledDerivedRule {
  /** The derived kind; this unit derives instruction candidates alone. */
  readonly kind: 'instructions';
  /** The range each derived file governs, exactly as a static instruction unit answers it. */
  applicabilityRangeOf(): string;
  /** Builds the per-attempt plan from the configuration values the reader validated. */
  planFor(declaredBasenames: readonly string[]): TraversalPlan;
}
