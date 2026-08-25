// How Copilot names a skill: the frontmatter `name` this vendor documents as the
// skill's identity, with the skill directory as the fallback
// (contracts/vendors/github-copilot.md § Normative initial-release
// presentation allowlist).
//
// The answer itself is `invocation-name.ts`, shared with the other product
// documenting the same field: it is what makes one `SKILL.md` declaring
// `name: voyage` this product's `voyage` and another product's directory name,
// each product asked its own rule about the same file.
//
// The base this unit extends is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { authoredSkillNameOf } from './invocation-name';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Copilot skill rule, compiled for execution: everything a Copilot rule is,
 * plus the one question only a skill rule answers — the name Copilot invokes
 * an admitted `SKILL.md` by. The answer lives here, beside the rule that owns
 * it, because a skill's identity is this vendor's own contract
 * (contracts/vendors/github-copilot.md § Normative initial-release
 * presentation allowlist).
 */
export class CopilotCompiledSkillRule
  extends CopilotCompiledRule
  implements CompiledStaticSkillRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The `name` the file declares, with the skill directory as the fallback —
   * the shared answer of the products that document that field as the skill's
   * identity ({@link authoredSkillNameOf}), which Copilot is one of. It is
   * what makes a `.claude/skills/lander/SKILL.md` declaring `name: voyage`
   * Copilot's `voyage` and Claude Code's `lander`: each product is asked its
   * own rule about the same file.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one Copilot skill record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot skill rule`);
    }
  }
}
