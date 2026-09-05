// How Copilot names a command and a prompt file: the one question a rule of this
// kind answers, at the two locations this vendor documents for it
// (contracts/vendors/github-copilot.md § Repository vendor behavior).
//
// Two units rather than one, because the locations answer differently — a
// command file declares no name and takes its file name, while a prompt file
// declares the name a reader types and falls back to its own — and a single
// unit answering both would have to ask which rule compiled it.
//
// The base these units extend is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type { CompiledStaticPromptRule } from './compiled-rule';
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Copilot command rule compiled for execution: everything a Copilot rule is,
 * plus the one question only a command rule answers — the name a reader
 * invokes an admitted file by.
 */
export class CopilotCompiledPromptRule
  extends CopilotCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The command name one admitted file is invoked by: its file name without
   * the `.md` extension. That is the whole rule the CLI reference states —
   * "the command name is derived from the filename" — and there is nothing
   * for a namespace to come from, because this rule admits root direct
   * children alone.
   *
   * Deliberately not Claude's derivation over the same directory: Claude
   * documents a subdirectory namespace and Copilot documents none, so one
   * shared answer would put a namespace on a product that never wrote about
   * one. A root direct child is where the two derivations agree, which is why
   * a shared file lands on one inventory row with a definition from each
   * product (data-model.md § Inventory unit).
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `copilot.repo.command` record, whose one selector ends in `/\.md$/u`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    return sourceRelativePath.split('/').at(-1)!.slice(0, -'.md'.length);
  }

  /** Compiles one Copilot command record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot command rule`);
    }
  }
}

/**
 * A Copilot prompt-file rule compiled for execution: everything a Copilot rule
 * is, plus the name a reader invokes an admitted prompt by.
 *
 * Its own unit beside {@link CopilotCompiledPromptRule}, which compiles the
 * legacy command rule of the same kind, because the two answer the question
 * differently — a prompt file declares its own name and a command file never
 * does — and one unit answering both would have to ask which rule compiled it.
 */
export class CopilotCompiledPromptFileRule
  extends CopilotCompiledRule
  implements CompiledStaticPromptRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The prompt's own declared `name`, or its file name without the
   * `.prompt.md` extension when it declares none — which is what the page
   * states: the `name` field is the name of the prompt used after typing `/`
   * in chat, and if it is not specified the file name is used.
   *
   * A declared `name` counts only when it resolved to a non-empty scalar: a
   * mapping or a sequence under that key is not a name a reader could type,
   * and an authored empty string names nothing, so both fall back to the file
   * name rather than putting an unusable row heading on screen.
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `copilot.repo.prompt` record, whose one selector ends in
   * `/\.prompt\.md$/u`.
   */
  public invocationNameOf(
    sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string {
    for (const entry of declared) {
      if (entry.key === 'name' && entry.value.kind === 'scalar' && entry.value.text !== '') {
        return entry.value.text;
      }
    }
    return sourceRelativePath.split('/').at(-1)!.slice(0, -'.prompt.md'.length);
  }

  /** Compiles one Copilot prompt-file record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot prompt rule`);
    }
  }
}
