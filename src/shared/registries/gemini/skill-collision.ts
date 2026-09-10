// Gemini CLI same-name skill collisions (FR-007): Gemini CLI invokes a skill
// by the name authored in its own file (contracts/vendors/gemini-cli.md
// § Normative initial-release presentation allowlist), so its clash is one
// row's own — two files it invokes by one name — and a file whose extraction
// failed never had that name resolved. The vendor documents which of the two
// it uses (the higher tier, then the `.agents/skills/` alias), which is the
// row's same-name statement (`skill-resolution.ts`) rather than a reason to
// count the clash differently. `src/shared/skill-collision.ts` composes this
// into the closed per-tool table.
import {
  SkillCollisionPolicy,
  parsedDefinitions,
  rowInternalCollisionGate,
  type SameNameCollisionDefinition,
} from '../skill-collision';

/** Gemini CLI's collision policy: a row-internal clash, with failed parses excluded. */
class GeminiSkillCollisionPolicy extends SkillCollisionPolicy {
  /**
   * Gemini CLI's clash is confined to one row: it invokes what each file
   * declares, so two files it invokes by one name are the whole collision and
   * no path elsewhere in the view bears on it.
   */
  public override collisionGate(
    _viewDefinitions: readonly SameNameCollisionDefinition[],
  ): (rowEvidence: readonly SameNameCollisionDefinition[]) => boolean {
    return rowInternalCollisionGate();
  }

  /**
   * Gemini CLI invokes the authored name, and a failed extraction leaves that
   * name unknown, so such a definition is provisional grouping rather than
   * evidence (FR-028).
   */
  public override collisionEvidence(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly SameNameCollisionDefinition[] {
    return parsedDefinitions(rowDefinitions);
  }
}

/** Gemini CLI's contribution to the per-tool collision table. */
export const GEMINI_SKILL_COLLISION_POLICY: SkillCollisionPolicy = new GeminiSkillCollisionPolicy();
