// What an instruction rule is to the scan: the contract a compiled unit of this
// kind answers, for the static rules that admit a file at a matched path and
// for the one derivation whose targets are named by configuration.
//
// The kind's own contract rather than a member of every compiled rule: an
// applicability range is a fact about an instruction file alone, so declaring
// it on the shared base would make a skill rule answer a question it has none
// of (AGENTS.md § Class and interface policy). Each vendor's answer is its own
// module beside this one.
//
// Two static units rather than one, because the format a rule admits decides
// what the scan reads out of a file (api-types.ts § InstructionFileFormat): a
// format that opens with declarations is parsed, and its range can come from
// what it declares, while a format its products read whole is read out of by
// nothing, so its range can only come from where it sits. One unit answering
// both would hand a declaration list to rules whose files declare nothing.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledDerivedRule, CompiledInspectionRule, TraversalPlan } from '../registry';

/**
 * A compiled rule that admits *instruction* files, and can therefore answer
 * the glob one of its admitted files governs, relative to the Repository root
 * (data-model.md § Inventory unit) — the identity the instructions inventory
 * groups its rows by. The union of the two formats a static rule can admit,
 * discriminated by `format` (api-types.ts § InstructionFileFormat).
 *
 * Deliberately not a member of {@link CompiledRule}. That class is what every
 * kind compiles to, and an applicability range is a fact about an instruction
 * file alone: declaring it there would make a skill rule answer a question it
 * has no answer to (AGENTS.md § Class and interface policy). A product whose
 * catalog holds an instruction record compiles that record into a unit
 * implementing one of these — each shipped product has one.
 *
 * Never a claim that a product loaded the file: an admission is not an
 * activation (FR-009).
 */
export type CompiledStaticInstructionRule =
  CompiledStaticFrontmatterLedInstructionRule | CompiledStaticWholeDocumentInstructionRule;

/**
 * A static instruction rule whose files open with declarations their product
 * reads — GitHub Copilot's path-specific `*.instructions.md`, the one shipped
 * format with a frontmatter of its own.
 *
 * What such a file governs is what it declared, because the product lets the
 * file name its own range (`applyTo`) and applies it by that declaration
 * wherever the file sits (spec.md § Clarifications) — so the answer is asked
 * of the declarations alone. `declared` is empty for a file that declares
 * nothing and for one whose extraction failed (FR-028).
 *
 * The answer is null exactly when the declarations supply no range, which the
 * vendor documents as a file that is not applied automatically. Deriving a
 * range from such a file's path would state the widest governance for a file
 * the vendor gives none, so the honest answer is that no range is known, and
 * the inventory lists the file under the row that says so (data-model.md
 * § Inventory unit).
 */
export interface CompiledStaticFrontmatterLedInstructionRule extends CompiledInspectionRule {
  /** The recognized kind; an instruction unit compiles instruction records alone. */
  readonly kind: 'instructions';
  /** The format this unit's files are read in; see api-types.ts § InstructionFileFormat. */
  readonly format: 'frontmatter-led';
  /** The glob one admitted file governs, or null when it declares none; see above. */
  applicabilityRangeOf(declared: readonly DeclaredEntryDto[]): string | null;
}

/**
 * A static instruction rule whose files their products read whole — every
 * shipped instruction format but Copilot's `*.instructions.md`
 * (api-types.ts § InstructionFileFormat).
 *
 * Nothing is read out of such a file, so what it governs is answered from its
 * path alone: a root-anchored lookup answers the root's `**`, because that is
 * where the Inspector's boundary is (FR-001) and a file admitted there governs
 * the repository entirely, while a product documenting per-directory discovery
 * derives the range from the directory holding the file.
 *
 * `sourceRelativePath` is the file's own path segments joined with `/` on every
 * platform ({@link toPublicPath}), so an implementation that reads it splits on
 * `/` rather than on the host separator.
 */
export interface CompiledStaticWholeDocumentInstructionRule extends CompiledInspectionRule {
  /** The recognized kind; an instruction unit compiles instruction records alone. */
  readonly kind: 'instructions';
  /** The format this unit's files are read in; see api-types.ts § InstructionFileFormat. */
  readonly format: 'whole-document';
  /** The glob one admitted file governs; see above. */
  applicabilityRangeOf(sourceRelativePath: string): string;
}

/**
 * A compiled derivation whose candidates are instruction files. One ships:
 * Codex's configured-basename derivation, whose plan is one exact
 * Repository-root selector per declared name.
 *
 * The derived counterpart of {@link CompiledStaticWholeDocumentInstructionRule},
 * and its own type for the same reason the static kinds are: a derivation of
 * another kind cannot answer what range its files govern, and a union member
 * that could be either would make every caller assert.
 */
export interface CompiledDerivedInstructionRule extends CompiledDerivedRule {
  /** The derived kind; this unit derives instruction candidates alone. */
  readonly kind: 'instructions';
  /**
   * The format a derived file is read in: a configured fallback name stands in
   * for `AGENTS.md`, for which no Codex page documents a frontmatter
   * (api-types.ts § InstructionFileFormat).
   */
  readonly format: 'whole-document';
  /**
   * The range one derived file governs, exactly as a static instruction unit
   * answers it. The path is handed over because the answer can depend on it —
   * a derivation admitting names at every depth would answer the directory
   * each file sits in — while the one shipped derivation admits names at the
   * Repository root alone and answers `**` for every file.
   */
  applicabilityRangeOf(sourceRelativePath: string): string;
  /** Builds the per-attempt plan from the configuration values the reader validated. */
  planFor(declaredBasenames: readonly string[]): TraversalPlan;
}
