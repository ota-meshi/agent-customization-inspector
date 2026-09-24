// How Antigravity CLI names a skill (contracts/vendors/antigravity-cli.md
// § Normative initial-release presentation allowlist, the `skill` row): the
// declared `name`, falling back to the skill folder — the shared answer every
// declared-name product gives (`invocation-name.ts`).
//
// A static reading of the published binary showed an absent name being filled
// from the file's own name, which for a `SKILL.md` would be
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
 * An Antigravity CLI skill rule, compiled for execution: the plan and guards
 * every compiled rule is, plus the one question only a skill rule answers —
 * the name this vendor invokes an admitted `SKILL.md` by.
 */
export class AntigravityCompiledSkillRule
  extends AntigravityCompiledRule
  implements CompiledStaticSkillRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

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

  /** Compiles one Antigravity CLI skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI skill rule`);
    }
  }
}
