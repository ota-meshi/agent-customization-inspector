// The name two of the three products invoke a skill by: the frontmatter `name`
// each of them documents as the skill's identity, with the skill directory
// where nothing usable was declared.
//
// One rule rather than two that happen to agree — Codex and Copilot document
// the same field for the same purpose — while the third product invokes the
// directory whatever the file declares, which is why that answer is its own
// module rather than a branch here.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import { skillDirectoryOf } from '../../../../shared/registries/skill-directory';

/**
 * The declared-`name` answer to {@link CompiledStaticSkillRule.invocationNameOf},
 * shared by the two products that document the field as the skill's identity —
 * Codex and Copilot — because their answer is one rule rather than two that
 * happen to agree. Read by the string key and the scalar kind: a sequence
 * under that key has a rendering too, and taking its text would name a skill
 * after the first item of a list the file did not write as a name.
 *
 * Falls back to the skill directory when nothing usable was declared — an
 * absent `name`, an authored empty one, or a failed extraction's empty
 * `declared` — because a directory can name a row where an absent or empty
 * scalar cannot, and a product still invokes such a skill by something
 * (FR-007). Which of those three it was is not collapsed away: the authored
 * declarations are published in full beside the name, and a failed extraction
 * carries its own Diagnostic (FR-028).
 */
export function authoredSkillNameOf(
  sourceRelativePath: string,
  declared: readonly DeclaredEntryDto[],
): string {
  for (const entry of declared) {
    if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
      if (entry.value.text !== '') {
        return entry.value.text;
      }
      break;
    }
  }
  return skillDirectoryOf(sourceRelativePath);
}
