// Anthropic Claude Code same-name skill collisions (FR-007, spec.md
// § Clarifications Session 2026-08-08): its clash is between unqualified
// commands — the skill directories — so it spans rows, because the
// root-relative prefix its naming applies to a nested skill puts the sides of
// one clash on different rows. `src/shared/skill-collision.ts` composes this
// into the closed per-tool table.
import {
  SkillCollisionPolicy,
  clashingSkillDirectories,
  skillDirectoryIdentityOf,
  type SameNameCollisionDefinition,
} from '../skill-collision';

/**
 * Claude Code's collision policy: a view-wide clash of skill directories,
 * with every definition of a row as evidence.
 */
class ClaudeSkillCollisionPolicy extends SkillCollisionPolicy {
  /**
   * Claude's clash is the unqualified command — the skill directory name —
   * shared with any other Claude-recognized skill of the same Source in the
   * view, so the gate is built from every Claude definition at once and a row
   * is involved when one of its definitions sits in a clashing `(Source,
   * directory)` identity. A row-internal count cannot see this clash: nested
   * prefixing puts its sides on different rows. Scoped to one Source, because
   * the quoted rule is about one root's tree — its qualifying prefix is
   * root-relative — so a same-named directory in a consented home is another
   * place's skill, not this clash (FR-030).
   */
  public override collisionGate(
    viewDefinitions: readonly SameNameCollisionDefinition[],
  ): (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean {
    const clashing = clashingSkillDirectories(viewDefinitions);
    return (rowEvidence) =>
      rowEvidence.some((definition) => clashing.has(skillDirectoryIdentityOf(definition)));
  }

  /**
   * Every definition's path evidences Claude's clash, failed extraction or
   * not: the unqualified command is the skill directory — the path's own
   * fact — so the parse state changes nothing about the collision the
   * documented rule answers (FR-007; contracts/http-api.md § get-session
   * `skills[]` — "Claude Code's path-derived command name stands either
   * way").
   */
  public override collisionEvidence(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly SameNameCollisionDefinition[] {
    return rowDefinitions;
  }
}

/** Claude's contribution to the per-tool collision table. */
export const CLAUDE_SKILL_COLLISION_POLICY: SkillCollisionPolicy = new ClaudeSkillCollisionPolicy();
