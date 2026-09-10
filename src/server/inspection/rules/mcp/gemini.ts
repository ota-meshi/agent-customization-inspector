// How Gemini CLI's MCP carrier is read: which servers an admitted
// `settings.json` declares under `mcpServers` (contracts/vendors/gemini-cli.md
// § Normative initial-release presentation allowlist, the `MCP` row).
//
// Which key means "MCP declarations" is this vendor's fact, so the container is
// found here; what a found map means is the rule every vendor shares
// (`server-map.ts`). The carrier is the settings document itself — one file
// recognized three times — so the settings and hook readings of the same
// bytes live in their own units beside this one.
//
// The base this unit extends is `../vendor/gemini.ts` rather than
// `../gemini.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { GeminiCompiledRule } from '../vendor/gemini';
import type { CompiledStaticMcpReadingRule } from './compiled-rule';
import { declaredServersIn } from './server-map';
import { ParsedJsonDocument } from '../../parsers/json';
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Gemini CLI MCP carrier rule compiled for execution: everything a Gemini
 * CLI rule is, plus the one question only an MCP rule answers — which servers
 * a carrier it admitted declares.
 */
export class GeminiCompiledMcpCarrierRule
  extends GeminiCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns its vendor's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The `mcpServers` declarations one admitted settings document makes, one
   * per named map entry, in the parser's resolved order (FR-007). An absent,
   * empty, or non-mapping `mcpServers` declares nothing, and the settings and
   * hook recognitions of the same file stand as they are (spec.md FR-009).
   *
   * Read as JSON with comments, the format the vendor's own loader takes
   * (`parsers/json.ts` § acceptsComments). Throws on text the format cannot
   * parse; the recognizer's extraction boundary turns the throw into the
   * recognition's `failed` state while the carrier stays an admitted
   * candidate (FR-028).
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

  /** Compiles one Gemini CLI MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Gemini CLI MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}
