// How Claude names an output style: the frontmatter `name` an admitted style
// declares, or its own file name when it declares none
// (contracts/vendors/claude-code.md § Repository Inspector matchers).
//
// One product documents this kind, so the derivation is this vendor's and
// nothing is shared: a style is a named Markdown file, and the fallback is what
// makes every admitted file nameable.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticOutputStyleRule } from './compiled-rule';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude output-style rule compiled for execution: everything a Claude rule
 * is, plus the one question only an output-style rule answers — the name a
 * reader selects an admitted style by. The derivation lives here, beside the
 * rule that owns it, because it is this vendor's own contract
 * (contracts/vendors/claude-code.md § Repository Inspector matchers).
 */
export class ClaudeCompiledOutputStyleRule
  extends ClaudeCompiledRule
  implements CompiledStaticOutputStyleRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'output style';

  /**
   * The vendor's documented style name: the frontmatter `name` the file
   * declares, or its own file name without the `.md` extension when it
   * declares none — "the file name becomes the style name unless you set
   * `name` in the frontmatter" (output-styles page § Create a custom output
   * style).
   *
   * Read by the string key and the scalar kind: a sequence under that key has
   * a rendering too, and taking its text would name a style after the first
   * item of a list the file did not write as a name. An authored empty name
   * falls back the same way an absent one does, because a picker cannot show
   * a style by a name with no characters.
   *
   * A failed extraction hands this an empty list, so the style lands on its
   * file name — the same string the vendor's own fallback produces for a file
   * declaring none, reached for a different reason (FR-028).
   *
   * Never empty, whatever the file is called: a file named exactly `.md` has no
   * basename to fall back to, so the name is its entry name as written.
   */
  public styleNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string {
    for (const entry of declared) {
      if (entry.keyKind === 'string' && entry.key === 'name' && entry.value.kind === 'scalar') {
        if (entry.value.text !== '') {
          return entry.value.text;
        }
        break;
      }
    }
    const fileName = sourceRelativePath.split('/').at(-1) ?? '';
    const withoutExtension = fileName.slice(0, -'.md'.length);
    // A file named exactly `.md` is admitted — the selector's terminal step
    // matches the extension, and `.md` ends with it — and stripping the
    // extension from it leaves nothing. The name is then the entry name as
    // written: a style name is never empty (api-types.ts
    // § OutputStyleInventoryEntryDto), and `.md` is what a picker listing this
    // file has to show, because the vendor's rule is the file name and this
    // file's name is all extension.
    return withoutExtension === '' ? fileName : withoutExtension;
  }

  /** Compiles one Claude output-style record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'output style') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude output-style rule`);
    }
  }
}
