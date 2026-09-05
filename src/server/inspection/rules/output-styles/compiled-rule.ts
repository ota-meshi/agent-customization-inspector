// What an output-style rule is to the scan: the contract a compiled unit of this
// kind answers — the name a reader selects an admitted style by, which is this
// kind's inventory unit (data-model.md § Inventory unit).
//
// The kind's own contract rather than a member of every compiled rule: how a
// style's name follows from a path and a declaration is a fact about an output
// style alone (AGENTS.md § Class and interface policy). One product documents
// this kind, so its reading is the one module beside this one.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits an output-style file, and can therefore answer
 * the one question only this kind's rule answers — the style name a reader
 * selects it by, which is the kind's inventory unit (data-model.md
 * § Inventory unit).
 *
 * The output-style sibling of {@link CompiledStaticPromptRule}, and its own
 * unit for the same reason: how a name follows from a path and a declaration
 * is the admitting vendor's own contract. Claude Code's is documented as the
 * file name unless the frontmatter sets `name`, which is one product's rule
 * rather than a shape every kind shares.
 */
export interface CompiledStaticOutputStyleRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `output style` records alone. */
  readonly kind: 'output style';
  /**
   * The style name one admitted file is selected by, as the admitting product
   * builds it. Never empty: a file whose frontmatter declares no usable name
   * falls back to its own file name, and being a named Markdown file is what
   * an output style is (FR-007).
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands the style on its file
   * name, the same string the vendor's own fallback produces for a file that
   * declares none, reached for a different reason. What distinguishes the two
   * is the extraction Diagnostic the recognition carries, which every surface
   * showing the definition shows beside it (FR-028).
   *
   * Never a claim that the style is applied: which style a session uses turns
   * on settings, session state, and plugin overrides this tool never observes
   * (FR-009).
   */
  styleNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}
