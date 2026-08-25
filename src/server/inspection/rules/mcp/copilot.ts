// How Copilot's MCP carriers are read: which servers each of the two documented
// carriers declares, and the third admission that reads nothing at all
// (contracts/vendors/github-copilot.md § Repository vendor behavior).
//
// Three units, because the two carriers have different — and differently
// surfaced — contracts: the CLI documents an `mcpServers` wrapper it also
// accepts without, the VS Code guide documents a top-level `servers` map in
// JSONC, and one root-file admission exists to record provenance for a path
// another rule already reads. Where each map is is this vendor's fact; what a
// found map means is the rule every vendor shares (`server-map.ts`).
//
// The base these units extend is `../vendor/copilot.ts` rather than
// `../copilot.ts`, which holds this vendor's other kinds: both modules extend
// that base, and a base declared in either would have to be imported back by
// the other.
import { CopilotCompiledRule } from '../vendor/copilot';
import type {
  CompiledStaticMcpProvenanceRule,
  CompiledStaticMcpReadingRule,
} from './compiled-rule';
import { declaredServersIn } from './server-map';
import { ParsedJsoncDocument, ParsedStrictJsonDocument } from '../../parsers/json';
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { InspectionRule } from '../../../../shared/registries/rule-types';

/**
 * A Copilot CLI MCP carrier rule compiled for execution: everything a Copilot
 * rule is, plus the one question only an MCP rule answers — which servers a
 * carrier it admitted declares.
 */
export class CopilotCompiledMcpCarrierRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns the CLI's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The server declarations one admitted CLI carrier makes, one per named
   * map entry, in the parser's resolved order (FR-007). The CLI documents
   * two strict-JSON schemas for a project-level file — the top-level
   * `mcpServers` object, and the bare top-level format where each key is a
   * server name (contracts/vendors/github-copilot.md § Repository vendor
   * behavior, `copilot.behavior.cli.mcp`) — and this reading accepts both,
   * which is one reason it is this vendor's own contract rather than a
   * shared one: Claude reads only the wrapper form out of the same root
   * `.mcp.json`.
   *
   * A file declaring a top-level `mcpServers` key is the wrapper form —
   * the vendor documents that key as the wrapper, so it is never read as a
   * bare server of that name, and a non-mapping `mcpServers` then declares
   * none. What a found map means is the shared projection
   * ({@link declaredServersIn}). Throws on text strict JSON cannot parse; the
   * recognizer's extraction boundary turns the throw into the recognition's
   * `failed` state while the carrier stays an admitted candidate (FR-028).
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const { entries } = new ParsedStrictJsonDocument(sourceText);
    const wrapper = entries.find((entry) => entry.key === 'mcpServers');
    const declared =
      wrapper !== undefined
        ? wrapper.value.kind === 'mapping'
          ? wrapper.value.entries
          : []
        : entries;
    return declaredServersIn(declared);
  }

  /** Compiles one Copilot MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * The VS Code `.vscode/mcp.json` carrier rule compiled for execution. Its own
 * unit beside the CLI's because the two schemas are different vendors' —
 * different surfaces' — contracts: the guide documents a top-level `servers`
 * map in the editor's JSONC configuration format, while the CLI carriers are
 * strict JSON with the `mcpServers` wrapper or the bare map (T361, T371).
 */
export class CopilotCompiledVscodeMcpCarrierRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpReadingRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** This unit owns the guide's documented reading (`compiled-rule.ts` § CompiledStaticMcpReadingRule). */
  public readonly mcpReading: 'own';

  /**
   * The server declarations one admitted `.vscode/mcp.json` makes, one per
   * named entry of the documented top-level `servers` map, in the parser's
   * resolved order (FR-007). Read as JSONC — comments and a trailing comma
   * are the editor configuration format's own syntax — and never leniently
   * beyond that: a document with any syntax error fails whole (FR-028).
   * A non-mapping `servers` declares none, and what a found map means is the
   * shared projection ({@link declaredServersIn}). There is no bare form here
   * — the guide documents the wrapper alone — and the `inputs` and `sandbox`
   * sections beside it declare no server.
   */
  public serverDeclarationsOf(sourceText: string): readonly McpServerDeclarationDto[] {
    const { entries } = new ParsedJsoncDocument(sourceText);
    const wrapper = entries.find((entry) => entry.key === 'servers');
    const declared = wrapper?.value.kind === 'mapping' ? wrapper.value.entries : [];
    return declaredServersIn(declared);
  }

  /** Compiles the one VS Code MCP carrier record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'own';
  }
}

/**
 * A Copilot MCP rule whose admission is path/surface provenance only
 * (`compiled-rule.ts` § CompiledStaticMcpProvenanceRule): the shipped record is
 * `copilot.repo.mcp.vscode-root`, whose one selector coincides with a
 * `copilot.repo.mcp` selector, so its admission adds the VS Code surface to
 * the root carrier's one Copilot recognition while the declarations stay the
 * CLI unit's independently documented extraction. No VS Code-owned extractor
 * exists until direct documentation establishes the root file's schema.
 */
export class CopilotCompiledMcpProvenanceRule
  extends CopilotCompiledRule
  implements CompiledStaticMcpProvenanceRule
{
  /** Narrowed to the one kind this unit compiles; the constructor proves it. */
  declare public readonly kind: 'MCP';

  /** No reading: the admission carries provenance alone (see the class doc). */
  public readonly mcpReading: 'none';

  /** Compiles one provenance-only MCP record, rejecting one of another kind. */
  public constructor(rule: InspectionRule) {
    super(rule);
    if (rule.kind !== 'MCP') {
      throw new TypeError(`rule ${rule.ruleId} is not a Copilot MCP carrier rule`);
    }
    this.mcpReading = 'none';
  }
}
