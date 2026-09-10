// How Claude names a skill: the name its own menus list the skill under
// (contracts/vendors/claude-code.md § Repository vendor behavior; spec.md
// § Clarifications Session 2026-09-09). At the selected root that is the
// frontmatter `name` with the skill directory as the fallback — the answer
// `invocation-name.ts` gives every product — and for a nested skill it is the
// directory-qualified command Claude Code builds when it keeps a nested skill
// beside a root one, `<root-relative directory>:<skill directory>`, which
// reads no declaration.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticSkillRule } from './compiled-rule';
import { authoredSkillNameOf } from './invocation-name';
import { skillDirectoryOf } from '../../../../shared/registries/skill-directory';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude skill rule compiled for execution: everything a Claude rule is,
 * plus the one question only a skill rule answers — the name Claude Code
 * lists an admitted `SKILL.md` under, which is what a reader invokes it by.
 * The derivation lives here, beside the rule that owns it, because half of it
 * is built from the path this rule's own selectors match
 * (contracts/vendors/claude-code.md § Normative initial-release presentation
 * allowlist).
 */
export class ClaudeCompiledSkillRule extends ClaudeCompiledRule implements CompiledStaticSkillRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'skill';

  /** A directory: this vendor documents one skill shape, the folder holding an entry point. */
  public readonly skillRowUnit: 'directory';

  /**
   * The name Claude Code shows for the skill. At the selected root it is the
   * declared `name`, with the skill directory as the fallback
   * ({@link authoredSkillNameOf}); nested, it is the root-relative `/`-joined
   * path of the directory holding the skill's `.claude`, a `:`, and the skill
   * directory — `apps/web:deploy` — with the declared name unread.
   *
   * The skills page (§ How a skill gets its command name) says the `name`
   * field of a personal or project skill sets only the display label and the
   * command comes from the directory. Measured on 2026-09-09 against Claude
   * Code 2.1.186 and the desktop app's 2.1.260, the directory is the
   * product's internal command identifier and the declared name is the one a
   * person meets: the slash menu lists and completes it, the desktop app's
   * command list carries it and not the directory at all, and either spelling
   * invokes the skill when typed in full. A row headed by the directory would
   * name a skill by a spelling no menu shows, which is why the page's own
   * wording is not followed here. A qualified nested command is built from
   * the directory and drops the declared name, so the nested row keeps the
   * directory — the one spelling Claude Code ever shows for it once qualified.
   *
   * The qualification is always applied, deliberately diverging from the
   * vendor's clash-conditional, session-cwd-relative prefix: the inspector
   * observes no session and never reads the layers that decide whether an
   * unqualified name is free, so the root-relative spelling is the one stable
   * name a static inventory can stand behind.
   *
   * A failed extraction lands a root skill on its directory like every other
   * product's — provisional grouping, not a reading of the failed parse
   * (FR-028) — and changes nothing for a nested one, whose name the path
   * alone decides. Defined for the paths this rule admits, whose shape is
   * `<prefix...>/.claude/skills/<skill-directory>/SKILL.md`.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    const segments = sourceRelativePath.split('/');
    const prefix = segments.slice(0, -4);
    if (prefix.length === 0) {
      return authoredSkillNameOf(sourceRelativePath, declared);
    }
    return `${prefix.join('/')}:${skillDirectoryOf(sourceRelativePath)}`;
  }

  /** Compiles one Claude skill record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'skill') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude skill rule`);
    }
    this.skillRowUnit = 'directory';
  }
}
