// Antigravity CLI same-name skill collisions (FR-007): Antigravity CLI invokes
// a skill by the name its own file declares
// (contracts/vendors/antigravity-cli.md § Normative initial-release
// presentation allowlist), so its clash is one row's own — two files it invokes
// by one name — and a file whose extraction failed never had that name
// resolved. The vendor does not document which of a workspace and a global
// skill of one name it uses; the row therefore renders no same-name statement
// for this product — its one skill strategy establishes nothing, so the
// derivation yields `null` (`skill-resolution.ts`) — and that silence is not a
// reason to count the clash differently.
// `src/shared/skill-collision.ts` composes this into the closed per-tool table.
import {
  SkillCollisionPolicy,
  parsedDefinitions,
  rowInternalCollisionGate,
  type SameNameCollisionDefinition,
} from '../skill-collision';

/** Antigravity CLI's collision policy: a row-internal clash, with failed parses excluded. */
class AntigravitySkillCollisionPolicy extends SkillCollisionPolicy {
  /**
   * Antigravity CLI's clash is confined to one row: it invokes what each file
   * declares, so two files it invokes by one name are the whole collision and
   * no path elsewhere in the view bears on it. A file-shaped skill and a
   * directory-shaped one that share a name are two definitions of that row,
   * and this tool reads both shapes, so both are its own evidence — which is
   * what makes the clash a real one for it rather than a difference between
   * products (spec.md FR-004).
   */
  public override collisionGate(
    _viewDefinitions: readonly SameNameCollisionDefinition[],
  ): (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean {
    return rowInternalCollisionGate();
  }

  /**
   * Antigravity CLI invokes the authored name, and a failed extraction leaves
   * that name unknown, so such a definition is provisional grouping rather
   * than evidence (FR-028).
   */
  public override collisionEvidence(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly SameNameCollisionDefinition[] {
    return parsedDefinitions(rowDefinitions);
  }
}

/** Antigravity CLI's contribution to the per-tool collision table. */
export const ANTIGRAVITY_SKILL_COLLISION_POLICY: SkillCollisionPolicy =
  new AntigravitySkillCollisionPolicy();
