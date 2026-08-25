// How Claude reads a custom agent: the name a spawn addresses it by, and where
// the admitted file's configuration ends and its instructions begin
// (contracts/vendors/claude-code.md § Repository Inspector matchers).
//
// A Claude subagent is Markdown, so the split is the frontmatter fence: the
// block configures the agent and the body is the system prompt it runs with.
// Where that split falls is this vendor's contract; the name is the answer it
// shares with the other product documenting the same field
// (`declared-name.ts`), and the Markdown parse stays in `parsers/markdown.ts`.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticAgentRule } from './compiled-rule';
import { declaredAgentNameOf } from './declared-name';
import { ParsedMarkdownDocument } from '../../parsers/markdown';
import type { AgentPresentationDto, DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The Claude custom-agent rule compiled for execution: everything a Claude
 * rule is, plus the one question only a custom-agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin.
 *
 * A Claude subagent is Markdown, so the split is the frontmatter fence: the
 * block configures the agent and the body is the system prompt it runs with
 * (contracts/vendors/claude-code.md § Repository Inspector matchers). The
 * reading lives here, beside the rule that owns it, because where the split
 * falls is this vendor's own contract; the Markdown parse and the rendering of
 * resolved values are the format's and stay in `parsers/markdown.ts`.
 */
export class ClaudeCompiledAgentRule extends ClaudeCompiledRule implements CompiledStaticAgentRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted Markdown file from the root's own `.claude/agents/` subtree,
   * split into the two halves its detail shows (FR-007): every frontmatter key
   * the file declares — `name`,
   * `description`, `tools`, `skills`, `memory`, and the `mcpServers` block
   * among them — as the metadata, and the body the fence leaves as the
   * instructions.
   *
   * The parse is this vendor's reading rather than the shared Markdown slot's,
   * for the reason the MCP and permission readings are keyed by tool: what a
   * rule reads out of a file is its own contract, and one physical file can be
   * two products' agent definition. Where the format coincides with the shared
   * parse — as it does here — the two resolve identically, so the repetition
   * is work over one string rather than a second fact
   * (`recognizers/candidate.ts` § CandidateExtractions).
   *
   * No field is validated, no environment reference is resolved, and no
   * declared skill, server, tool, or path gains read or connection authority.
   * A declared `mcpServers` block is one metadata entry and nothing more: it
   * makes the file no MCP carrier, because an MCP declaration's home is an
   * explicit carrier and nothing else (data-model.md § Inventory unit).
   * Throws on text the frontmatter parser cannot read; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the file stays an admitted candidate whose complete source is still
   * displayed (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedMarkdownDocument(sourceText);
    return { metadata: document.frontmatterEntries, instructionsText: document.body };
  }

  /**
   * The agent's declared `name`, which is what Claude Code identifies a
   * subagent by: the page documents the `name` field as the identifier and
   * adds that a subfolder inside the agents directory does not affect it, so
   * neither the file name nor the directory above it names a row here, and a
   * file declaring none joins the row that says the name is not known.
   *
   * The path is unused for that reason, and the shared reading is the one both
   * declared-name products use (`registry.ts` § declaredAgentNameOf).
   */
  public agentNameOf(
    _sourceRelativePath: string,
    declared: readonly DeclaredEntryDto[],
  ): string | null {
    return declaredAgentNameOf(declared);
  }

  /** Compiles one Claude custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude custom-agent rule`);
    }
  }
}
