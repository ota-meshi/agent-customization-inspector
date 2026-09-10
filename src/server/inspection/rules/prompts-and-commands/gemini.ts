// How Gemini CLI names a custom command: the one question a rule of this kind
// answers, for the TOML files `gemini.repo.command` and `gemini.global.command`
// admit (contracts/vendors/gemini-cli.md § Documented Repository behavior).
//
// The derivation is this vendor's documented rule: the file's path relative to
// the commands directory, with the separator converted to `:` and the `.toml`
// extension removed, so `git/commit.toml` is `git:commit`. The same shape
// Claude Code documents for its command files, spelled here for the format and
// the pages that are this vendor's — one product's rule is not evidence for
// another's (`../prompts-and-commands/claude.ts`).
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticPromptRule } from './compiled-rule';
import { ParsedTomlDocument } from '../../parsers/toml';
import type { PromptPresentationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key a Gemini CLI command file writes its prompt under
 * (contracts/vendors/gemini-cli.md § Documented Repository behavior): the
 * page requires `prompt` of every command file and describes `description`
 * beside it. It is the split this vendor's presentation falls at, so it is a
 * literal here rather than anything a caller passes.
 */
const GEMINI_COMMAND_PROMPT_KEY = 'prompt';

/**
 * A Gemini CLI custom-command rule compiled for execution: everything a Gemini
 * CLI rule is, plus the one question only a command rule answers — the name a
 * reader invokes an admitted file by.
 */
export class GeminiCompiledCommandRule
  extends GeminiCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * One admitted `.toml` split into the two halves its detail shows (FR-007):
   * the `prompt` string is the prompt, and every other top-level entry —
   * `description` among them — is the metadata, each in the file's own order
   * as the parser resolved it. The prompt reaches the detail exactly as
   * written: a `!{...}` shell block, an `@{...}` file reference, and an
   * `{{args}}` placeholder are characters of the string, evaluated by
   * nothing and opened nowhere (spec.md FR-006; FR-019, FR-026).
   *
   * Throws on text TOML cannot parse, and on a document whose `prompt` is
   * absent or not a string: the vendor requires the key, so a file without
   * it has no prompt to show, and the recognizer's extraction boundary turns
   * the throw into the recognition's `failed` state with its diagnostic while
   * the file stays an admitted candidate whose complete source is still
   * displayed (spec.md FR-006; FR-028). Asked of the parser's typed
   * resolution rather than of the rendered entry, as the Codex agent unit
   * does: the rendering publishes a TOML datetime as a `string` scalar, so
   * only `typeof` over the resolution tells a prompt from a date.
   */
  public promptPresentationOf(sourceText: string): PromptPresentationDto {
    const document = new ParsedTomlDocument(sourceText);
    const declared = document.table[GEMINI_COMMAND_PROMPT_KEY];
    if (typeof declared !== 'string') {
      throw new TypeError('a Gemini CLI command file declares no prompt string');
    }
    return {
      metadata: document.entries.filter((entry) => entry.key !== GEMINI_COMMAND_PROMPT_KEY),
      promptText: declared,
    };
  }

  /**
   * The command name one admitted file is invoked by: the path below the
   * commands directory with `.toml` dropped from the leaf, each segment
   * sanitized, and the segments joined with `:` — `.gemini/commands/test.toml`
   * is `test`, `.gemini/commands/git/commit.toml` is `git:commit`, and
   * `.gemini/commands/review/security/deps.toml` is `review:security:deps`.
   *
   * The page states the general rule — the name is the path relative to the
   * commands directory, subdirectories are namespaces, the separator becomes
   * a colon — and gives one nested example; no cited section spells a deeper
   * path or a depth limit, and none states what happens to a segment the
   * colon would make ambiguous. The vendor's loader
   * (`packages/cli/src/services/FileCommandLoader.ts` of
   * google-gemini/gemini-cli, measured 2026-09-10) enumerates every `.toml` at
   * any depth,
   * splits the extension-less relative path on the separator, replaces every
   * UTF-16 code unit outside `[A-Za-z0-9_.-]` in a segment with `_` — its
   * regex carries no `u` flag, so a character beyond the Basic Multilingual
   * Plane is two units and becomes `__` — cuts a segment longer than 50
   * characters to its first 47 followed by `...`, and joins with `:`. The depth is the documented rule carried through, which the
   * loader corroborates; the sanitization and the truncation are the loader's
   * alone, matched here so the row is named what the product invokes —
   * `my command.toml` is `/my_command` there, and a row named `my command`
   * would report a command the product does not have. The record states the
   * two as a source measurement rather than documentation
   * (contracts/vendors/gemini-cli.md § Known uncertainties; spec.md FR-006).
   *
   * Derived from the path because that is where the vendor puts it: a
   * command file's TOML declares a `prompt` and a `description` and no name,
   * so the path is the only thing a row could be keyed by (data-model.md
   * § Inventory unit). A file the TOML parser cannot read keeps this name and
   * carries its parse diagnostic beside it (spec.md FR-006).
   *
   * The slicing is exact rather than defensive: this unit compiles records
   * whose one selector opens with the literal container segments —
   * `['.gemini', 'commands', ...]` at the Repository root, `['commands', ...]`
   * below the consented home — so an admitted path always has exactly the
   * container segments the rule's own matcher names in front and always ends
   * in `.toml`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    const segments = sourceRelativePath.split('/').slice(this.#containerDepth);
    const leaf = segments.at(-1)!;
    return [...segments.slice(0, -1), leaf.slice(0, -'.toml'.length)]
      .map((segment) => {
        // The vendor's own expression, flag for flag: without `u` a regex
        // matches UTF-16 code units, so `😀.toml` is `/__` there, and a
        // code-point replacement would name a `/_` the product does not have.
        // eslint-disable-next-line require-unicode-regexp -- the measured rule is the flagless regex's unit semantics
        const sanitized = segment.replaceAll(/[^A-Za-z0-9_.-]/g, '_');
        return sanitized.length > 50 ? `${sanitized.slice(0, 47)}...` : sanitized;
      })
      .join(':');
  }

  /**
   * How many leading path segments are the commands container rather than the
   * name: the count of leading literal steps in the rule's own selector, so
   * the namespace starts exactly below the directory the matcher names.
   */
  readonly #containerDepth: number;

  /** Compiles one Gemini CLI command record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI command rule`);
    }
    const selector = rule.matcher?.selectors[0] ?? [];
    let depth = 0;
    while (selector[depth]?.kind === 'literal') {
      depth += 1;
    }
    this.#containerDepth = depth;
  }
}
