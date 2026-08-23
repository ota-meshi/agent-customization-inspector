// OpenAI Codex same-name skill collisions (FR-007): Codex invokes a skill by
// the name authored in its own file (contracts/vendors/openai-codex.md
// § Normative initial-release presentation allowlist), so its clash is one
// row's own — two files it invokes by one name — and a file whose extraction
// failed never had that name resolved. `src/shared/skill-collision.ts`
// composes this into the closed per-tool table.
import {
  SkillCollisionPolicy,
  parsedDefinitionPaths,
  rowInternalCollisionGate,
  type SameNameCollisionDefinition,
} from '../skill-collision';

/** Codex's collision policy: a row-internal clash, with failed parses excluded. */
class CodexSkillCollisionPolicy extends SkillCollisionPolicy {
  /**
   * Codex's clash is confined to one row: it invokes what each file declares,
   * so two files it invokes by one name are the whole collision and no path
   * elsewhere in the view bears on it.
   */
  public override collisionGate(
    _viewPaths: readonly string[],
  ): (rowPaths: readonly string[]) => boolean {
    return rowInternalCollisionGate();
  }

  /**
   * Codex invokes the authored name, and a failed extraction leaves that name
   * unknown, so such a definition is provisional grouping rather than
   * evidence (FR-028).
   */
  public override collisionEvidencePaths(
    rowDefinitions: readonly SameNameCollisionDefinition[],
  ): readonly string[] {
    return parsedDefinitionPaths(rowDefinitions);
  }
}

/** Codex's contribution to the per-tool collision table. */
export const CODEX_SKILL_COLLISION_POLICY: SkillCollisionPolicy = new CodexSkillCollisionPolicy();
