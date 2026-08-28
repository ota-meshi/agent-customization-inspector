// How Claude names a command: the one question a rule of this kind answers, for
// the legacy command Markdown files `claude.repo.command` admits
// (contracts/vendors/claude-code.md § Repository vendor behavior).
//
// The derivation is this vendor's contract rather than anything shared: Claude
// documents a subdirectory namespace joined with `:` and reads no `name` key at
// all, where another product documents neither, so one shared answer would put
// a namespace on a product that never wrote about one.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticPromptRule } from './compiled-rule';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude command rule compiled for execution: everything a Claude rule is,
 * plus the one question only a command rule answers — the name a reader
 * invokes an admitted file by.
 */
export class ClaudeCompiledPromptRule
  extends ClaudeCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The command name one admitted file is invoked by: the path below the
   * commands directory with every separator turned into a `:` and the `.md`
   * dropped from the leaf — `.claude/commands/deploy.md` is `deploy`,
   * `.claude/commands/frontend/component.md` is `frontend:component`, and
   * `.claude/commands/team/review/security.md` is `team:review:security`.
   *
   * Derived from the path because that is where the vendor puts it: Claude
   * Code ignores a `name` key in a command file, so the file declares no
   * identity of its own and the path is the only thing a row could be keyed by
   * (data-model.md § Inventory unit).
   *
   * The slicing is exact rather than defensive: this unit compiles the
   * `claude.repo.command` and `claude.global.command` records, whose one
   * selector each opens with the literal container segments —
   * `['.claude', 'commands', ...]` at the Repository root, `['commands', ...]`
   * below the consented home — so an admitted path always has exactly the
   * container segments the rule's own matcher names in front
   * ({@link ClaudeCompiledPromptRule.#containerDepth}) and always ends in
   * `.md`.
   *
   * The colon join is the documented transformation carried through: the
   * changelog turns `.claude/commands/frontend/component.md` into
   * `/frontend:component`, so the separator below the commands directory is
   * what becomes the `:`, and a deeper path has more of them. No cited page
   * spells a deeper case outright, and Claude Code 2.1.186 builds it this way
   * in both of the places that name a command, which is the corroboration
   * rather than the basis.
   *
   * A leaf whose stem is `skill` in any letter case is the one exception, and
   * it is
   * the product's behavior with no documentation behind it at all: such a file
   * takes its directory's name instead of its own, so
   * `.claude/commands/foo/SKILL.md` is `foo` and
   * `.claude/commands/a/b/SKILL.md` is `a:b`. Matching the product where
   * nothing is written is the standing decision for this kind.
   *
   * The one path that exception cannot answer is a `SKILL.md` directly in the
   * commands directory, where there is no directory below it to take a name
   * from — and where the product's own two naming sites disagree, one treating
   * the file as no command at all and the other naming it after the commands
   * directory. With no behavior to match, this falls back to what the skills
   * page does document for a command file: it is invoked by its file name, so
   * the name is `SKILL`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/');
    const directory = segments.slice(this.#containerDepth, -1);
    if (directory.length > 0 && /^skill\.md$/iu.test(segments.at(-1)!)) {
      return directory.join(':');
    }
    return segments.slice(this.#containerDepth).join(':').slice(0, -'.md'.length);
  }

  /**
   * How many leading path segments are the commands container rather than the
   * name: the count of leading literal steps in the rule's own selector, so
   * the namespace starts exactly below the directory the matcher names — two
   * segments for the Repository `.claude/commands/`, one for the consented
   * home's `commands/`.
   */
  readonly #containerDepth: number;

  /** Compiles one Claude command record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude command rule`);
    }
    const selector = rule.matcher?.selectors[0] ?? [];
    let depth = 0;
    while (selector[depth]?.kind === 'literal') {
      depth += 1;
    }
    this.#containerDepth = depth;
  }
}
