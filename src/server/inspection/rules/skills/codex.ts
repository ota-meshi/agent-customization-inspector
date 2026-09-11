// How Codex names a skill: the frontmatter `name` this vendor documents as the
// skill's identity, with the skill directory as the fallback
// (contracts/vendors/openai-codex.md § Normative initial-release presentation
// allowlist).
//
// The answer itself is `invocation-name.ts`, shared with every product that
// resolves a skill by that field: their answer is one rule rather than three
// that happen to agree.
//
// The base this unit extends is `../vendor/codex.ts` rather than `../codex.ts`,
// which holds this vendor's other kinds: both modules extend that base, and a
// base declared in either would have to be imported back by the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { authoredSkillNameOf } from './invocation-name';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Codex skill rule, compiled for execution: the plan and guards every
 * compiled rule is, plus the one question only a skill rule answers — the
 * name Codex invokes an admitted `SKILL.md` by. The answer lives here,
 * beside the rule that owns it, because a skill's identity is this vendor's
 * own contract (contracts/vendors/openai-codex.md § Normative
 * initial-release presentation allowlist).
 */
export class CodexCompiledSkillRule extends CodexCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /** A directory: this vendor documents one skill shape, the folder holding an entry point. */
  public readonly skillRowUnit: 'directory';

  /**
   * The `name` the file declares, with the skill directory as the fallback —
   * the shared answer of every product that resolves a skill by that field
   * ({@link authoredSkillNameOf}), which Codex does for all of its own.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    return authoredSkillNameOf(sourceRelativePath, declared);
  }

  /** Compiles one Codex skill record. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex skill rule`);
    }
    this.skillRowUnit = 'directory';
  }
}
