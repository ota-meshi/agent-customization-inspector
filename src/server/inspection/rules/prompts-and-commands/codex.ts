// The Codex answer to the prompt-and-command kind's one question (FR-007,
// data-model.md § Inventory unit): the name a reader invokes a personal
// prompt file by. Its own module beside the other vendors' answers, because
// how a name follows from a path is each admitting vendor's own contract.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticPromptRule } from './compiled-rule';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Codex prompt rule compiled for execution: everything a Codex rule is,
 * plus the one question only a prompt-or-command rule answers.
 */
export class CodexCompiledPromptRule extends CodexCompiledRule implements CompiledStaticPromptRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'prompt/command';

  /**
   * The slash-command name one admitted prompt file is invoked by: its file
   * name without the `.md` extension. The vendor's page creates
   * `~/.codex/prompts/draftpr.md` and invokes it as a slash command, deriving
   * the command from the file's own name; the `description` and
   * `argument-hint` frontmatter it documents carry presentation, not a name,
   * so a declared key never overrides the path
   * (contracts/vendors/openai-codex.md § Documented User behavior;
   * `openai.codex.custom-prompts`).
   *
   * The slicing is exact rather than defensive: this unit compiles only the
   * `codex.global.prompts` record, whose one selector ends in `/\.md$/u`.
   */
  public invocationNameOf(sourceRelativePath: string): string {
    return sourceRelativePath.split('/').at(-1)!.slice(0, -'.md'.length);
  }

  /** Compiles one Codex prompt record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'prompt/command') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex prompt rule`);
    }
  }
}
