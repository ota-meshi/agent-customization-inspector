// What an MCP rule is to the scan: the contract a compiled unit of this kind
// answers — which servers a carrier it admitted declares, the rows the MCP
// inventory publishes one of per declaration (data-model.md § Inventory unit) —
// and the provenance-only variant that answers nothing.
//
// The kind's own contract rather than a member of every compiled rule: how
// declarations are read out of a carrier is the admitting vendor's own contract
// (AGENTS.md § Class and interface policy). Each vendor's reading is its own
// module beside this one, over the one structural rule they share
// (`server-map.ts`).
import type { McpServerDeclarationDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits an MCP declaration carrier, and can therefore
 * answer which servers one of its admitted files declares — the rows the MCP
 * inventory publishes, one per declaration (data-model.md § Inventory unit).
 *
 * The MCP sibling of {@link CompiledStaticInstructionRule}, and deliberately
 * not a member of {@link CompiledRule}, for the same reason: how declarations
 * are read out of a carrier is the admitting vendor's own contract — Codex's
 * TOML `[mcp_servers.*]` tables, Claude's strict-JSON `mcpServers` map, the
 * Copilot CLI's two schemas read as the `(tool, path)` pair's JSON mode
 * fixes, and VS Code's JSONC `servers` map — so a skill or instruction rule
 * must not be asked for it.
 *
 * The extraction produces the wire declaration shape directly
 * ({@link McpServerDeclarationDto}): what the one scan-time parse resolved is
 * what the carrier's detail publishes, so a second internal shape would be a
 * state able to disagree with it (FR-007).
 */
export interface CompiledStaticMcpReadingRule extends CompiledInspectionRule {
  /** The recognized kind; an MCP carrier unit compiles MCP records alone. */
  readonly kind: 'MCP';
  /**
   * Discriminant: this unit owns its vendor's documented reading of an
   * admitted carrier. The recognizer dispatches a group's extraction to the
   * admission that declares this, never to a provenance-only sibling.
   */
  readonly mcpReading: 'own';
  /**
   * The server declarations one admitted carrier's complete decoded text
   * makes, in the parser's resolved order — empty when it declares none, with
   * a declaration that is not a table omitted whole rather than published
   * partially. Throws on text the carrier's format cannot parse; the
   * recognizer's extraction boundary turns the throw into the recognition's
   * `failed` state (FR-028).
   *
   * The carrier's own Source-relative Path is what resolves the JSON document
   * this reading takes (`../../parsers/json.ts` § ParsedJsonDocument); a unit
   * whose carrier is not JSON declares the first parameter alone.
   */
  serverDeclarationsOf(
    sourceText: string,
    sourceRelativePath: string,
  ): readonly McpServerDeclarationDto[];
}

/**
 * A compiled MCP rule whose admission is path/surface provenance only: the
 * vendor documents the location but not the file's schema, so the rule can
 * put its surfaces on the carrier's recognition while the declarations stay a
 * co-admitting reading rule's own extraction. The shipped member is
 * `copilot.repo.mcp.vscode-root`, whose one exact selector coincides with a
 * `copilot.repo.mcp` selector by construction — a provenance-only admission
 * therefore never stands alone on a candidate
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 *
 * Its own unit rather than an optional reading on the family: a rule that
 * cannot answer which servers a carrier declares must not carry the member
 * that promises to, and the `mcpReading` discriminant is what lets the
 * recognizer prove which admission can answer without a cast.
 */
export interface CompiledStaticMcpProvenanceRule extends CompiledInspectionRule {
  /** The recognized kind; an MCP carrier unit compiles MCP records alone. */
  readonly kind: 'MCP';
  /** Discriminant: no reading — the admission carries provenance alone. */
  readonly mcpReading: 'none';
}

/**
 * A compiled rule that admits an MCP declaration carrier: the closed union of
 * the unit that owns its vendor's reading and the unit whose admission is
 * provenance alone, discriminated by `mcpReading`.
 */
export type CompiledStaticMcpRule = CompiledStaticMcpReadingRule | CompiledStaticMcpProvenanceRule;
