// How Antigravity CLI names a skill, in each of the two shapes it admits at
// one location (contracts/vendors/antigravity-cli.md § Normative
// initial-release presentation allowlist, the `skill` row).
//
// Two units, because the two row units differ: one names a skill folder whose
// entry point is `SKILL.md`, the other names a flat Markdown file that has no
// folder at all and therefore publishes no companion census (research.md § 2).
// The fallback each uses follows its own shape — the folder for a folder, the
// file name for a file — which for the folder is the shared answer every
// declared-name product gives (`invocation-name.ts`).
//
// A static reading of the published binary showed an absent name being filled
// from the file's own name in both shapes, which for a `SKILL.md` would be
// `SKILL`. That is not followed, and the reason is inside the same binary:
// `GetSkillsCreatePath` builds `{workspace}/.agents/skills/{skill_name}/SKILL.md`,
// so the terminal itself treats the folder as carrying the name, and a
// `SKILL` fallback would collide every unnamed skill the terminal created. The
// documentation, the products that read the same file, and that path builder
// agree on the folder; one fallback read statically does not
// (contracts/vendors/antigravity-cli.md § Known uncertainties item 7).
//
// The base these units extend is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { authoredSkillNameOf } from './invocation-name';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The name a flat skill is invoked by: the frontmatter `name` when the file
 * declares a usable one, and otherwise the file's own name with the trailing
 * `.md` removed.
 *
 * The fallback is the file name because a flat skill has no folder to take one
 * from — the shape's own answer, not a vendor difference. Read by the string
 * key and the scalar kind, as every declared-name reading is: a sequence under
 * that key has a rendering too, and taking its text would name a skill after
 * the first item of a list the file did not write as a name.
 */
function flatSkillNameOf(
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
  const fileName = sourceRelativePath.split('/').at(-1) ?? sourceRelativePath;
  return fileName.endsWith('.md') ? fileName.slice(0, -'.md'.length) : fileName;
}

/**
 * A directory-shaped Antigravity CLI skill rule, compiled for execution: the
 * plan and guards every compiled rule is, plus the one question only a skill
 * rule answers — the name this vendor invokes an admitted `SKILL.md` by.
 */
export class AntigravityCompiledSkillRule
  extends AntigravityCompiledRule
  implements CompiledStaticSkillRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /** A directory: the skill folder whose `SKILL.md` this rule matched. */
  public readonly skillRowUnit: 'directory';

  /**
   * The declared `name`, else the skill folder — the shared answer of every
   * product that resolves a skill by that field ({@link authoredSkillNameOf}),
   * which is what puts this vendor's recognition of a `SKILL.md` on the same
   * row as the two products that read the same file.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one directory-shaped Antigravity CLI skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI skill rule`);
    }
    this.skillRowUnit = 'directory';
  }
}

/**
 * A flat Antigravity CLI skill rule, compiled for execution. It differs from
 * the unit above twice over: its row unit is the file itself, with no
 * directory and therefore no companion census, and its fallback is the file's
 * own name because there is no folder to take one from. Both differences
 * follow from the shape rather than from the vendor, which is why the two
 * shapes are two units and not one unit with a branch.
 */
export class AntigravityCompiledFileSkillRule
  extends AntigravityCompiledRule
  implements CompiledStaticSkillRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /** The file itself: this shape has no directory, so it occupies none. */
  public readonly skillRowUnit: 'file';

  /** The declared `name`, else the file's own name without its extension. */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return flatSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one flat Antigravity CLI skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI skill rule`);
    }
    this.skillRowUnit = 'file';
  }
}
