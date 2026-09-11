// How Antigravity CLI's MCP carriers are read: which servers an admitted
// `mcp_config.json` declares (contracts/vendors/antigravity-cli.md § Normative
// initial-release presentation allowlist, the `MCP` row).
//
// Which key means "MCP declarations" is this vendor's fact, so the container is
// found here; what a found map means is the rule every vendor shares
// (`server-map.ts`). One unit for both boundaries: the workspace's
// `.agents/mcp_config.json` and the user tier's `config/mcp_config.json` are
// the same standalone profile at two roots.
//
// The base this unit extends is `../vendor/antigravity.ts` rather than
// `../antigravity.ts`, which holds this vendor's other kinds: both modules
// extend that base, and a base declared in either would have to be imported
// back by the other.
import { AntigravityCompiledRule } from '../vendor/antigravity';
import type { CompiledStaticMcpReadingRule } from './compiled-rule';
import { declaredServersIn } from './server-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * An Antigravity CLI MCP carrier rule compiled for execution: everything an
 * Antigravity CLI rule is, plus the one question only an MCP rule answers —
 * which servers a carrier it admitted declares.
 */
export class AntigravityCompiledMcpCarrierRule
  extends AntigravityCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `mcpServers` declarations one admitted `mcp_config.json` makes, one
   * per named map entry, in the parser's resolved order (FR-007). The MCP page
   * documents the file as a standalone profile holding a single `mcpServers`
   * object mapping a server name to its configuration, so that spelling is the
   * container and every field a declaration carries is published as written —
   * a remote server's `serverUrl` and the legacy `url` or `httpUrl` a file
   * still spells alike, because whether the vendor accepts one is runtime this
   * product does not observe (spec.md § FR-005).
   *
   * What a found map means is the shared projection
   * ({@link declaredServersIn}); an absent or non-mapping `mcpServers`
   * declares nothing.
   *
   * Throws on text strict JSON cannot parse; the recognizer's extraction
   * boundary turns the throw into the recognition's `failed` state while the
   * carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(
    sourceText: string,
    sourceRelativePath: string,
  ): readonly McpServerDeclarationDto[] {
    const declared = new ParsedJsonDocument(sourceText, { tool: this.tool, sourceRelativePath })
      .entries;
    const container = declared.find((entry) => entry.key === 'mcpServers');
    if (container === undefined || container.value.kind !== 'mapping') {
      return [];
    }
    return declaredServersIn(container.value.entries);
  }

  /** Compiles one Antigravity CLI MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not an Antigravity CLI MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}
