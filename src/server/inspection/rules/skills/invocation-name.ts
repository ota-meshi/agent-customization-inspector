// The name a product invokes a skill by: the frontmatter `name`, with the
// skill directory where nothing usable was declared.
//
// One rule rather than three that happen to agree — Codex and Copilot
// document the field as the skill's identity, and Claude Code lists a root
// skill under it — while the one answer that is not this rule's, Claude
// Code's directory-qualified nested command, is a branch of that vendor's own
// unit rather than of this module (`claude.ts`).
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import { skillDirectoryOf } from '../../../../shared/registries/skill-directory';

/**
 * The declared-`name` answer to {@link CompiledStaticSkillRule.invocationNameOf},
 * shared by every product's rule for the skills it resolves by that field —
 * Codex and Copilot for all of theirs, Claude Code for a skill at the selected
 * root — because their answer is one rule rather than three that happen to
 * agree. Read by the string key and the scalar kind: a sequence under that key
 * has a rendering too, and taking its text would name a skill after the first
 * item of a list the file did not write as a name.
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
