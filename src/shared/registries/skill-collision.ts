// The same-name collision contract each vendor implements (FR-007,
// data-model.md § Inventory unit, § Skill presentation): which clash that
// vendor's documented same-name rule answers, and which of a row's
// definitions are evidence of it. Both are abstract — a vendor whose
// documentation was never read must not inherit the majority's answer
// silently — so this module holds only the abstract base and the answers
// vendors reach for, while each states its own in its
// `registries/<vendor>/skill-collision.ts` and
// `src/shared/skill-collision.ts` composes the closed per-tool table.
//
// What a skill is *named* is not here: that is the admitting rule's answer,
// resolved once at recognition time
// (`server/inspection/rules/skills/compiled-rule.ts` § CompiledStaticSkillRule), because
// how a name follows from a path and a declaration is the vendor's own
// contract. What is here is view-wide rather than per-file — a gate is built
// from every path a tool defines in the view — and the client re-derives it
// over its filtered definitions, which is why it lives in shared code that
// carries no compiled rule.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.
import { skillDirectoryOf } from './skill-directory';
import { fileIdentityKey } from '../entities';
import type { SkillDefinitionDto } from '../api-types';

/**
 * What every vendor's same-name policy has to answer (FR-007). The closed
 * table in `src/shared/skill-collision.ts` is the one way a caller reaches an
 * instance.
 */
export abstract class SkillCollisionPolicy {
  /**
   * A per-view gate for the collision this tool's documented same-name rule
   * answers, built once from every definition the tool holds in the view and
   * then asked with one row's evidence at a time (FR-007).
   *
   * The population is the whole view rather than one row because a clash can
   * span rows: Claude Code's does, since its nested prefixing puts the sides
   * of one directory clash on different rows. A vendor whose clash is
   * row-internal ignores the view-wide definitions
   * ({@link rowInternalCollisionGate}). Definitions rather than bare paths,
   * because what a definition is — which Source it is in, what its file
   * declares, whether its extraction parsed — is what each vendor's own rule
   * reads: Codex and Copilot invoke the authored name, so two members'
   * files sharing one name are one clash however many Sources they span,
   * while Claude's rule is about one root's tree and scopes its clash to a
   * single Source (`claude/skill-collision.ts`). A bare path could answer
   * neither question (FR-030; spec.md § FR-007 — "of the same generation").
   */
  public abstract collisionGate(
    viewDefinitions: readonly SameNameCollisionDefinition[],
  ): (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean;

  /**
   * The definitions of one row that evidence this tool's same-name collision
   * (FR-007) — which is not always every definition the row holds, because a
   * definition can sit on a row for a reason the vendor's rule does not
   * recognize as a clash ({@link parsedDefinitions}).
   */
  public abstract collisionEvidence(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly SameNameCollisionDefinition[];
}

/**
 * The gate for a vendor whose clash is one row's own: a tool invoking two or
 * more files by one name has definitions to choose between, and nothing
 * outside the row bears on it. Exported for the vendor policies that answer
 * this way; no surface calls it directly.
 */
export function rowInternalCollisionGate(): (
  rowEvidence: readonly SameNameCollisionDefinition[],
) => boolean {
  return (rowEvidence) => rowEvidence.length >= 2;
}

/**
 * The evidence for a vendor that invokes the authored name: every definition
 * of the row except one whose extraction failed. Such a definition fell back
 * to the skill directory, so counting it would let this product's provisional
 * grouping stand in for a name the tool never resolved (FR-028). Exported for
 * the vendor policies that invoke the authored name.
 */
export function parsedDefinitions(
  rowDefinitions: readonly SameNameCollisionDefinition[],
): readonly SameNameCollisionDefinition[] {
  return rowDefinitions.filter((definition) => definition.parseStatus !== 'failed');
}

/**
 * The `(Source, skill directory)` identities two or more of these definitions
 * share a directory name within — the clash of unqualified commands, scoped
 * to one Source: a same-named directory in another Source is another place's
 * skill, not a clash this rule answers (FR-030). Keys are
 * {@link skillDirectoryIdentityOf}'s. Exported for the vendor whose
 * documented rule answers that clash; no surface renders it.
 */
export function clashingSkillDirectories(
  definitions: readonly SameNameCollisionDefinition[],
): ReadonlySet<string> {
  const seen = new Set<string>();
  const clashing = new Set<string>();
  for (const definition of definitions) {
    const identity = skillDirectoryIdentityOf(definition);
    if (seen.has(identity)) {
      clashing.add(identity);
    }
    seen.add(identity);
  }
  return clashing;
}

/**
 * One definition's `(Source, skill directory)` key — both halves, because two
 * Sources can hold one directory spelling (FR-030). Exported beside
 * {@link clashingSkillDirectories} so the gate that builds the set and the
 * check that asks it spell one key.
 */
export function skillDirectoryIdentityOf(definition: SameNameCollisionDefinition): string {
  return fileIdentityKey(definition.sourceId, skillDirectoryOf(definition.sourceRelativePath));
}

/**
 * The definition facts the same-name collision machinery reads (FR-007): the
 * tool whose rule is being asked, the path that names the file, and the parse
 * state that decides whether the definition is evidence for a tool that
 * invokes the authored name at all.
 */
export type SameNameCollisionDefinition = Pick<
  SkillDefinitionDto,
  'tool' | 'sourceId' | 'sourceRelativePath' | 'parseStatus'
>;
