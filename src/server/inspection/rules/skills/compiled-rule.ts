// What a skill rule is to the scan: the contract a compiled unit of this kind
// answers — the name the admitting product invokes the skill by, which is this
// kind's inventory unit (data-model.md § Inventory unit).
//
// The kind's own contract rather than a member of every compiled rule: how a
// name follows from a path and a declaration is a fact about a skill alone
// (AGENTS.md § Class and interface policy). Every product resolves a root
// skill by the frontmatter field and shares that answer
// (`invocation-name.ts`); Claude Code alone reaches nested skills, and names
// those by their directory-qualified command in its own module beside this
// one.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits a `SKILL.md`, and can therefore answer the one
 * question only this kind's rule answers — the name the admitting product
 * invokes the skill by, which is the kind's inventory unit (data-model.md
 * § Inventory unit).
 *
 * The skill sibling of {@link CompiledStaticPromptRule}, and its own unit for
 * the same reason: how a name follows from a path and a declaration is the
 * admitting vendor's own contract, so an instruction or rule-file rule must
 * not be asked for it. The products' answers are not one rule — every product
 * resolves a root skill by the `name` the file declares, while Claude Code
 * names a nested skill by its directory-qualified command and reads no
 * declaration for it — which is what makes the derivation the rule's rather
 * than the parser's.
 */
export interface CompiledStaticSkillRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `skill` records alone. */
  readonly kind: 'skill';
  /**
   * The name one admitted `SKILL.md` is invoked by, as the admitting product
   * builds it. Never empty: a product invoking a file that declares no usable
   * name falls back to the skill directory, and being a named directory is
   * what a skill is (FR-007).
   *
   * Both inputs, because the answers differ on which one decides: a root
   * skill's name is read from the declared `name`, while Claude Code's nested
   * command is derived from the path alone. A unit that took one input would
   * leave the other answer unreachable.
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands a declared-name product's
   * skill on its skill directory, the same string that product's own fallback
   * produces for a file declaring none, reached for a different reason. What
   * distinguishes the two is the extraction Diagnostic the recognition
   * carries, which every surface showing the definition shows beside it, and
   * which is why such a row is provisional grouping rather than evidence of a
   * clash on the authored name — Codex's and Copilot's. Claude Code's clash is
   * between skill directories, the path's own fact, so its failed definition
   * stays evidence either way (FR-028, shared/skill-collision.ts).
   *
   * Never a claim that the skill is reachable: which locations a session
   * searches, and which of two same-name skills it would load, is runtime this
   * tool never observes (FR-009).
   */
  invocationNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}
