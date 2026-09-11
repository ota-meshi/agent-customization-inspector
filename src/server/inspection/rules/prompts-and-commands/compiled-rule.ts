// What a prompt-or-command rule is to the scan: the contract a compiled unit of
// this kind answers — the name a reader invokes an admitted file by, which is
// this kind's inventory unit (data-model.md § Inventory unit).
//
// The kind's own contract rather than a member of every compiled rule: how a
// name follows from a path and a declaration is a fact about a command or a
// prompt file alone (AGENTS.md § Class and interface policy). Each vendor's
// answer is its own module beside this one, and the two locations of this kind
// answer differently even inside one vendor.
import { ParsedMarkdownDocument } from '../../parsers/markdown';
import type { DeclaredEntryDto, PromptPresentationDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits a prompt or command file, and can therefore
 * answer the one question only this kind's rule answers — the name a reader
 * invokes it by, which is the kind's inventory unit (data-model.md § Inventory
 * unit).
 *
 * The command sibling of {@link CompiledStaticInstructionRule}, and its own
 * unit for the same reason: how a name follows from a path and a declaration
 * is the admitting vendor's own contract, so a skill or rule-file rule must
 * not be asked for it. The two locations of this kind answer differently — a
 * command file declares no name, because both products that read one ignore a
 * `name` key in it, while a VS Code prompt file declares the name a reader
 * types — which is what makes the derivation the rule's rather than the
 * parser's.
 */
export interface CompiledStaticPromptRule extends CompiledInspectionRule {
  /** The recognized kind; this unit compiles `prompt/command` records alone. */
  readonly kind: 'prompt/command';
  /**
   * One admitted file's complete decoded text, split into the two halves its
   * detail publishes — the metadata the file declares and the prompt the
   * product sends — both in the parser's resolved order and resolution
   * (FR-007). The admitting rule's own reading, as an agent's is
   * (`../agents/compiled-rule.ts` § agentPresentationOf), because the format
   * is the vendor's: a Claude Code, Copilot, or Codex command is Markdown
   * whose frontmatter block is the metadata and whose remainder is the prompt
   * ({@link markdownPromptPresentationOf}); a format that instead declares its
   * prompt beside its other keys answers from its own reading, which is why
   * this is the rule's question rather than one shared shape's.
   * Throws on text the format cannot read; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * file stays an admitted candidate whose complete source is still displayed
   * (FR-028).
   */
  promptPresentationOf(sourceText: string): PromptPresentationDto;
  /**
   * The name one admitted file is invoked by, as the admitting product builds
   * it. Empty exactly where that product's own derivation is — a file named
   * `.md` in a command directory has nothing before its extension — because
   * reporting anything else would report a command the product does not have
   * (api-types.ts § PromptInventoryEntryDto).
   *
   * Both inputs, because the products differ on which one answers: Claude Code
   * and the Copilot CLI derive a command's name from the path and read no
   * `name` key at all, while a VS Code prompt file declares its own `name` and
   * uses its file name only when it declares none. A unit that took one input
   * would leave the other vendor's answer unreachable.
   *
   * `declared` is the file's frontmatter as the one scan-time parse resolved
   * it, empty for a failed extraction — which lands a prompt on its file name,
   * the same string the vendor's fallback produces for a file that declares
   * none, reached for a different reason. What distinguishes the two is the
   * extraction Diagnostic the recognition carries, which every surface showing
   * the definition shows beside it (FR-028).
   *
   * Never a claim that the file is reachable: a same-name skill outranks a
   * command, a prompt is invoked by hand, and which locations a session
   * searches is runtime this tool never observes (FR-009).
   */
  invocationNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string;
}

/**
 * The reading of every product whose command or prompt file is Markdown —
 * Claude Code, Copilot, and Codex: the frontmatter block's entries are the
 * metadata and the text the block leaves is the prompt, the parser module's
 * own split (`parsers/markdown.ts`). One function rather than three that
 * happen to agree, so the products that share a format share its answer.
 */
export function markdownPromptPresentationOf(sourceText: string): PromptPresentationDto {
  const document = new ParsedMarkdownDocument(sourceText);
  return { metadata: document.frontmatterEntries, promptText: document.body };
}
