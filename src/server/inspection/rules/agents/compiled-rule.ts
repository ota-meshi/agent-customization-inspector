// What a custom-agent rule is to the scan: the contract a compiled unit of this
// kind answers — the name a spawn addresses the agent by, and where an admitted
// file's configuration ends and its instructions begin (data-model.md
// § Inventory unit).
//
// The kind's own contract rather than a member of every compiled rule: which
// key holds an agent's identity, and where the split between configuration and
// prose falls, is the admitting vendor's own contract (AGENTS.md § Class and
// interface policy). Two products document the same `name` field and share that
// answer (`declared-name.ts`); each vendor's split is its own module beside
// this one.
import type { AgentPresentationDto, DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits a custom-agent definition, and can therefore
 * split one of its admitted files into the two halves the kind's detail shows:
 * the declarations a product reads as configuration, and the instructions it
 * gives the agent (contracts/http-api.md § get-file-detail).
 *
 * The agent sibling of {@link CompiledStaticMcpReadingRule}, and its own unit
 * for the same reason: where that split falls is the admitting vendor's own
 * contract, and the vendors do not agree. A Codex agent is a TOML document
 * whose `developer_instructions` string is the prose and whose remaining
 * top-level keys are the configuration; the products that write an agent as
 * Markdown split at the frontmatter fence, the block being the configuration
 * and the body the prose. One shape for both, because the detail renders them
 * identically — the metadata as YAML, the instructions as Markdown — so a rule
 * of another kind must not be asked for it and neither vendor needs a surface
 * of its own.
 *
 * The agent's own name is a member here, because the vendors answer it
 * differently: Codex and Claude Code document the declared `name` as the
 * agent's identity and a matching filename as convention rather than lookup,
 * while GitHub documents Copilot's `name` as an optional display name and
 * deduplicates agents by the configuration file's own name minus `.md` or
 * `.agent.md`. A recognizer that read the `name` entry for every vendor would
 * name a Copilot agent after a field that product does not identify it by.
 *
 * The reading stops at what the file wrote. Which agent a spawn selects, what
 * a spawned session inherits from its parent, and what an `mcp_servers` key
 * inside the file would mean at runtime are the vendor's documented
 * composition (`codex.agents.inheritance`), recorded in the strategy registry
 * and projected by no surface (FR-009). In particular a declared
 * `mcp_servers` block is this file's own content and makes it no carrier: an
 * MCP declaration's home is an explicit carrier and nothing else
 * (data-model.md § Inventory unit).
 */
export interface CompiledStaticAgentRule extends CompiledInspectionRule {
  /** The recognized kind; an agent unit compiles custom-agent records alone. */
  readonly kind: 'agent';
  /**
   * One admitted agent file's complete decoded text, split into the metadata
   * and the instructions its detail publishes — both in the parser's resolved
   * order and resolution (FR-007), and both empty when the file declares
   * neither. Throws on text the file's format cannot parse; the recognizer's
   * extraction boundary turns the throw into the recognition's `failed` state
   * while the file stays an admitted candidate whose complete source is still
   * displayed (FR-028).
   */
  agentPresentationOf(sourceText: string): AgentPresentationDto;
  /**
   * The name the admitting product identifies one admitted agent by — the
   * identity its inventory row is grouped under (data-model.md § Inventory
   * unit) — or `null` when the product identifies agents by a declaration
   * this file does not make.
   *
   * Both inputs, because the products differ on which one answers: Codex and
   * Claude Code identify an agent by its declared `name`, so a file declaring
   * none has no name at all and joins the row that says so; the Copilot
   * surfaces identify one by its configuration file's own name, so the path
   * always answers and `null` never arises there.
   *
   * `declared` is the metadata {@link agentPresentationOf} resolved, empty for
   * a failed extraction — which leaves a declared-name product's row name
   * unknown rather than absent, while a file-name product's row keeps the
   * identity a failed parse cannot take away (FR-028).
   *
   * Never a claim that the agent is reachable: which locations a session
   * searches, whether a profile targets the running surface, and which of two
   * same-name agents a spawn selects are runtime this tool never observes
   * (FR-009).
   */
  agentNameOf(sourceRelativePath: string, declared: readonly DeclaredEntryDto[]): string | null;
}
