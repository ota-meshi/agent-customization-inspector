// How Codex reads a custom agent: the name a spawn addresses it by, and where
// the admitted file's configuration ends and its instructions begin
// (contracts/vendors/openai-codex.md § Documented Repository behavior).
//
// A Codex agent file is one document whose own key holds the prose, so the
// split is that key rather than a fence: `developer_instructions` is the
// instructions and every other key is configuration. Which key that is, is this
// vendor's contract; the name is the answer it shares with the other product
// documenting the same field (`declared-name.ts`), and the TOML parse stays in
// `parsers/toml.ts`.
//
// The base this unit extends is `../vendor/codex.ts` rather than `../codex.ts`,
// which holds this vendor's other kinds: both modules extend that base, and a
// base declared in either would have to be imported back by the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticAgentRule } from './compiled-rule';
import { declaredAgentNameOf } from './declared-name';
import { ParsedTomlDocument } from '../../parsers/toml';
import type { AgentPresentationDto, DeclaredEntryDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The key a Codex custom-agent file writes its instructions under
 * (contracts/vendors/openai-codex.md § Documented Repository behavior): the
 * page requires `name`, `description`, and `developer_instructions` of every
 * standalone agent file and calls the last one the core instructions that
 * define the agent's behavior. It is the split this vendor's presentation
 * falls at, so it is a literal here rather than anything a caller passes.
 */
const CODEX_AGENT_INSTRUCTIONS_KEY = 'developer_instructions';

/**
 * The Codex custom-agent rule compiled for execution: everything a Codex rule
 * is, plus the one question only a custom-agent rule answers — where an
 * admitted agent file's configuration ends and its instructions begin. The
 * reading lives here, beside the rule that owns it, because a Codex agent
 * file's format is this vendor's own contract
 * (contracts/vendors/openai-codex.md § Inspector Repository rules); the TOML
 * parse and the rendering of resolved values are the format's and stay in
 * `parsers/toml.ts`.
 */
export class CodexCompiledAgentRule extends CodexCompiledRule implements CompiledStaticAgentRule {
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'agent';

  /**
   * One admitted `.codex/agents/*.toml` split into the two halves its detail
   * shows (FR-007). A Codex agent file is a configuration layer with one prose
   * key: `developer_instructions` holds the instructions, and every other
   * top-level entry — `name` and `description` among them, beside whatever
   * other supported `config.toml` keys the author wrote — is the metadata,
   * each published in the file's own order as the parser resolved it.
   *
   * The split is taken only when that key resolves to a string. A
   * `developer_instructions` the file wrote as a table, a list, a number, or a
   * datetime is a declaration rather than prose, so it stays a metadata entry
   * and the instructions are empty: moving a rendering of it into the prose
   * half would show the reader a document their file does not contain.
   *
   * No field is validated, no environment reference is resolved, and no
   * declared path, command, or server gains read or connection authority. A
   * declared `mcp_servers` table is one metadata entry and nothing more: it
   * makes the file no MCP carrier, because an MCP declaration's home is an
   * explicit carrier and nothing else (data-model.md § Inventory unit).
   * Throws on text TOML cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the file
   * stays an admitted candidate whose complete source is still displayed
   * (FR-028).
   */
  public agentPresentationOf(sourceText: string): AgentPresentationDto {
    const document = new ParsedTomlDocument(sourceText);
    // Asked of the parser's typed resolution rather than of the rendered
    // entry, which is what that view exists for (`parsers/toml.ts`): the
    // rendering publishes a TOML datetime as a `string` scalar, because its
    // ISO spelling is its spelling (api-types.ts § DeclaredScalarKind), so a
    // `developer_instructions = 1979-05-27` would pass a check made over the
    // entry and become a Markdown body the file does not contain. `typeof`
    // over the resolution tells the two apart, exactly as the configuration
    // read tells a string basename from a number.
    const declared = document.table[CODEX_AGENT_INSTRUCTIONS_KEY];
    const instructionsText = typeof declared === 'string' ? declared : '';
    const metadata =
      typeof declared === 'string'
        ? document.entries.filter((entry) => entry.key !== CODEX_AGENT_INSTRUCTIONS_KEY)
        : document.entries;
    return { metadata, instructionsText };
  }

  /**
   * The agent's declared `name`, which is what Codex identifies a custom agent
   * by — the reference calls naming the file after it a convention rather than
   * a lookup — so a file declaring none has no name at all and joins the row
   * that says so rather than being named after its path.
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

  /** Compiles one Codex custom-agent record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'agent') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex custom-agent rule`);
    }
  }
}
