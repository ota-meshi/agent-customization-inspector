// How Claude's one explicit MCP carrier is read: which servers an admitted
// `.mcp.json` declares (contracts/vendors/claude-code.md § Normative
// initial-release presentation allowlist, the `MCP` row).
//
// Which key means "MCP declarations" is this vendor's fact, so the container is
// found here; what a found map means is the rule every vendor shares
// (`server-map.ts`). Only explicit MCP configuration joins the MCP surfaces, so
// a file of another kind that spells the key holds its own kind's recognition
// alone, its declarations visible in that file's own detail.
//
// The base this unit extends is `../vendor/claude.ts` rather than
// `../claude.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { ClaudeCompiledRule } from '../vendor/claude';
import type { CompiledStaticMcpReadingRule } from './compiled-rule';
import { declaredServersIn } from './server-map';
import { ParsedStrictJsonDocument } from '../../parsers/json';
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Claude MCP carrier rule compiled for execution: everything a Claude rule
 * is, plus the one question only an MCP rule answers — which servers a
 * carrier it admitted declares.
 */
export class ClaudeCompiledMcpCarrierRule
  extends ClaudeCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `mcpServers` declarations one admitted `.mcp.json` makes, one per
   * named map entry, in the parser's resolved order (FR-007): which key
   * means "MCP declarations" is Claude's vendor fact, so the reading lives
   * here, on the vendor's one explicit carrier — only explicit MCP
   * configuration joins the MCP surfaces, so a file of another kind that
   * spells the key holds its own kind's recognition alone, its declarations
   * visible in that file's own detail (contracts/vendors/claude-code.md
   * § Normative initial-release presentation allowlist, MCP row).
   *
   * What a found map means is the shared projection
   * ({@link declaredServersIn}); an absent or non-mapping `mcpServers`
   * declares nothing.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const declared = new ParsedStrictJsonDocument(sourceText).entries;
    // Strict JSON keys are strings, and the parser resolves a key declared
    // twice to its later declaration, so the spelling alone identifies the
    // one possible container entry.
    const container = declared.find((entry) => entry.key === 'mcpServers');
    if (container === undefined || container.value.kind !== 'mapping') {
      return [];
    }
    return declaredServersIn(container.value.entries);
  }

  /** Compiles one Claude MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Claude MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}
