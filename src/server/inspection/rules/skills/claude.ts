// How Claude names a skill: the vendor's documented command name, which is the
// skill directory qualified by the root-relative path of the directory holding
// its `.claude` (contracts/vendors/claude-code.md § Repository vendor
// behavior).
//
// The declared `name` is deliberately not read: this vendor treats that field
// as a display label, so the answer comes from the path alone — which is why it
// is this module rather than the shared one the other two products use
// (`invocation-name.ts`).
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { skillDirectoryOf } from '../../../../shared/registries/skill-directory';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude skill rule compiled for execution: everything a Claude rule is,
 * plus the one question only a skill rule answers — the command name Claude
 * Code invokes an admitted `SKILL.md` by. The derivation lives here, beside
 * the rule that owns it, because it is built from the path this rule's own
 * selectors match (contracts/vendors/claude-code.md § Normative
 * initial-release presentation allowlist).
 */
export class ClaudeCompiledSkillRule extends ClaudeCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /**
   * The vendor's documented command name: the skill directory, qualified with
   * the root-relative `/`-joined path of the directory holding the skill's
   * `.claude` and a `:` when the skill is nested — `apps/web:deploy` — and the
   * bare directory name at the root (skills page § How a skill gets its
   * command name).
   *
   * The declared `name` is deliberately not read, which is why the parameter
   * is unused: the vendor treats that field as a display label, so a row keyed
   * by it would head a group Claude Code does not answer to. It also means a
   * failed extraction takes nothing away from the name — the path is its whole
   * basis (FR-028).
   *
   * The qualification is always applied, deliberately diverging from the
   * vendor's clash-conditional, session-cwd-relative prefix: the inspector
   * observes no session and never reads the layers that decide whether an
   * unqualified name is free, so the root-relative spelling is the one stable
   * name a static inventory can stand behind.
   *
   * Defined for the paths this rule admits, whose shape is
   * `<prefix...>/.claude/skills/<skill-directory>/SKILL.md`.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    _declared: readonly DeclaredEntryDto[],
  ): string {
    const segments = sourceRelativePath.split('/');
    const prefix = segments.slice(0, -4);
    const skillDirectory = skillDirectoryOf(sourceRelativePath);
    return prefix.length === 0 ? skillDirectory : `${prefix.join('/')}:${skillDirectory}`;
  }

  /** Compiles one Claude skill record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude skill rule`);
    }
  }
}
