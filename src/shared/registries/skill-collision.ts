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
// (`server/inspection/rules/registry.ts` § CompiledStaticSkillRule), because
// how a name follows from a path and a declaration is the vendor's own
// contract. What is here is view-wide rather than per-file — a gate is built
// from every path a tool defines in the view — and the client re-derives it
// over its filtered definitions, which is why it lives in shared code that
// carries no compiled rule.
// Platform-neutral by design — only Web APIs, no node: imports — so the
// client build can import it.
import { skillDirectoryOf } from './skill-directory';
import type { SkillDefinitionDto } from '../api-types';

/**
 * What every vendor's same-name policy has to answer (FR-007). The closed
 * table in `src/shared/skill-collision.ts` is the one way a caller reaches an
 * instance.
 */
export abstract class SkillCollisionPolicy {
  /**
   * A per-view gate for the collision this tool's documented same-name rule
   * answers, built once from every `SKILL.md` path the tool defines in the
   * view and then asked with one row's paths at a time (FR-007).
   *
   * The population is the whole view rather than one row because a clash can
   * span rows: Claude Code's does, since its nested prefixing puts the sides
   * of one directory clash on different rows. A vendor whose clash is
   * row-internal ignores the view-wide paths ({@link rowInternalCollisionGate}).
   */
  public abstract collisionGate(
    viewPaths: readonly string[],
  ): (rowPaths: readonly string[]) => boolean;

  /**
   * The paths of one row's definitions that evidence this tool's same-name
   * collision (FR-007) — which is not always every definition the row holds,
   * because a definition can sit on a row for a reason the vendor's rule does
   * not recognize as a clash ({@link parsedDefinitionPaths}).
   */
  public abstract collisionEvidencePaths(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly string[];
}

/**
 * The gate for a vendor whose clash is one row's own: a tool invoking two or
 * more files by one name has definitions to choose between, and nothing
 * outside the row bears on it. Exported for the vendor policies that answer
 * this way; no surface calls it directly.
 */
export function rowInternalCollisionGate(): (rowPaths: readonly string[]) => boolean {
  return (rowPaths) => rowPaths.length >= 2;
}

/**
 * The evidence paths for a vendor that invokes the authored name: every
 * definition of the row except one whose extraction failed. Such a definition
 * fell back to the skill directory, so counting it would let this product's
 * provisional grouping stand in for a name the tool never resolved (FR-028).
 * Exported for the vendor policies that invoke the authored name.
 */
export function parsedDefinitionPaths(
  rowDefinitions: readonly SameNameCollisionDefinition[],
): readonly string[] {
  return rowDefinitions
    .filter((definition) => definition.parseStatus !== 'failed')
    .map((definition) => definition.sourceRelativePath);
}

/**
 * The skill directory names two or more of these `SKILL.md` paths share — the
 * clash of unqualified commands. Exported for the vendor whose documented
 * rule answers that clash; no surface renders it.
 */
export function clashingSkillDirectories(paths: readonly string[]): ReadonlySet<string> {
  const seen = new Set<string>();
  const clashing = new Set<string>();
  for (const path of paths) {
    const directory = skillDirectoryOf(path);
    if (seen.has(directory)) {
      clashing.add(directory);
    }
    seen.add(directory);
  }
  return clashing;
}

/**
 * The definition facts the same-name collision machinery reads (FR-007): the
 * tool whose rule is being asked, the path that names the file, and the parse
 * state that decides whether the definition is evidence for a tool that
 * invokes the authored name at all.
 */
export type SameNameCollisionDefinition = Pick<
  SkillDefinitionDto,
  'tool' | 'sourceRelativePath' | 'parseStatus'
>;
