// How Gemini CLI reads a sub-agent: the name it is invoked by, and where the
// admitted file's configuration ends and its system prompt begins
// (contracts/vendors/gemini-cli.md § Inspector Repository rules).
//
// A Gemini CLI sub-agent is Markdown with required YAML frontmatter, so the
// split is the frontmatter fence: the block configures the agent and the body
// is the system prompt it runs with. The name is the answer this vendor shares
// with the other declared-name products (`declared-name.ts`), and the Markdown
// parse stays in `parsers/markdown.ts`.
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticAgentRule } from './compiled-rule';
import { declaredAgentNameOf } from './declared-name';
import { ParsedMarkdownDocument } from '../../parsers/markdown';
import type { AgentPresentationDto, DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The Gemini CLI sub-agent rule compiled for execution: everything a Gemini
 * CLI rule is, plus the one question only a custom-agent rule answers — where
 * an admitted agent file's configuration ends and its instructions begin.
 */
export class GeminiCompiledAgentRule extends GeminiCompiledRule implements CompiledStaticAgentRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted Markdown file, split into the two halves its detail shows
   * (FR-007): every frontmatter key the file declares — `name`,
   * `description`, `tools`, `model`, `mcpServers` among them — as the
   * metadata, and the body the fence leaves as the system prompt.
   *
   * No field is validated, no server is connected to, and no declared tool
   * or path gains read authority. A declared `mcpServers` block is one
   * metadata entry and nothing more: it makes the file no MCP carrier,
   * because an MCP declaration's home is an explicit carrier and nothing
   * else (data-model.md § Inventory unit). Throws on text the frontmatter
   * parser cannot read; the recognizer's extraction boundary turns the throw
   * into the recognition's `failed` state while the file stays an admitted
   * candidate whose complete source is still displayed (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedMarkdownDocument(sourceText);
    return { metadata: document.frontmatterEntries, instructionsText: document.body };
  }

  /**
   * The agent's declared `name`, which the page documents as the tool name
   * the agent is invoked by; neither the file name nor the directory names a
   * row here, and a file declaring none joins the row that says the name is
   * not known — the shared declared-name reading (`declared-name.ts`).
   */
  public agentNameOf(
    _sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null {
    return declaredAgentNameOf(declared);
  }

  /** Compiles one Gemini CLI sub-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI custom-agent rule`);
    }
  }
}
