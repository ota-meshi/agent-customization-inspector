// How Gemini CLI names a skill: the frontmatter `name` this vendor documents as
// the skill's identity, with the skill directory as the fallback
// (contracts/vendors/gemini-cli.md § Normative initial-release presentation
// allowlist).
//
// The answer itself is `invocation-name.ts`, shared with every product that
// resolves a skill by that field: their answer is one rule rather than four
// that happen to agree. The vendor's guidance that the name match its
// directory is not something this unit checks (parent FR-012).
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { authoredSkillNameOf } from './invocation-name';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Gemini CLI skill rule, compiled for execution: the plan and guards every
 * compiled rule is, plus the one question only a skill rule answers — the
 * name Gemini CLI invokes an admitted `SKILL.md` by.
 */
export class GeminiCompiledSkillRule extends GeminiCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The `name` the file declares, with the skill directory as the fallback —
   * the shared answer of every product that resolves a skill by that field
   * ({@link authoredSkillNameOf}).
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one Gemini CLI skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI skill rule`);
    }
  }
}
