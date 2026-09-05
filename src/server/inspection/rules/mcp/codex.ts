// How Codex's MCP carrier is read: which servers an admitted
// `.codex/config.toml` declares under its `[mcp_servers.*]` tables
// (contracts/vendors/openai-codex.md § Normative initial-release presentation
// allowlist, the `MCP` row).
//
// Which key means "MCP declarations" is this vendor's fact, so the container is
// found here; what a found map means is the rule every vendor shares
// (`server-map.ts`). The admitted file is Codex's project configuration layer
// and these declarations are one block of it: the document itself is a
// different recognition of the same file, published as the TOML its author
// wrote — three rules over one candidate and one read, the third being the
// `[hooks]` table this layer can also contain (FR-007).
//
// The base this unit extends is `../vendor/codex.ts` rather than `../codex.ts`,
// which holds this vendor's other kinds: both modules extend that base, and a
// base declared in either would have to be imported back by the other.
import { CodexCompiledRule } from '../vendor/codex';
import type { CompiledStaticMcpReadingRule } from './compiled-rule';
import { declaredServersIn } from './server-map';
import { ParsedTomlDocument } from '../../parsers/toml';
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * The Codex MCP carrier rule compiled for execution: everything a Codex rule
 * is, plus the one question only an MCP carrier rule answers — which servers
 * an admitted carrier declares. The reading lives here, beside the rule that
 * owns it, because which file carries declarations and what a declaration
 * means is this vendor's own contract (contracts/vendors/openai-codex.md
 * § Normative initial-release presentation allowlist, the `MCP` row); the
 * TOML parse and the rendering
 * of resolved values are the format's and stay in `parsers/toml.ts`.
 *
 * The admitted `.codex/config.toml` is Codex's project configuration layer,
 * and these declarations are one block of it. The document itself is a
 * different recognition of the same file, admitted by `codex.repo.settings`
 * and published as the TOML its author wrote — three rules over one candidate
 * and one read, the `[hooks]` table this layer can also contain being the
 * third, each answering for the row that reaches it (FR-007).
 */
export class CodexCompiledMcpCarrierRule
  extends CodexCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `[mcp_servers.*]` declarations one admitted carrier makes, one per
   * named server table, in the parser's resolved order (FR-007), read over
   * the document's rendered entries — a table renders as the `mapping` kind,
   * so the structural question is the entries' own discriminant.
   *
   * What a found table means is the shared projection
   * ({@link declaredServersIn}); an absent or non-table `mcp_servers`
   * declares nothing.
   * Throws on text TOML cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state while the carrier
   * stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const declared = new ParsedTomlDocument(sourceText).entries.find(
      (entry) => entry.key === 'mcp_servers',
    );
    if (declared === undefined || declared.value.kind !== 'mapping') {
      return [];
    }
    return declaredServersIn(declared.value.entries);
  }

  /** Compiles one Codex MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Codex MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}
