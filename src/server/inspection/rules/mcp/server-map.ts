// The one rule every vendor's MCP reading shares: which entries of a declared
// server map are servers, and what each of them publishes.
//
// Where that map is, and which key holds it, is each vendor's own contract —
// Codex's TOML `[mcp_servers.*]` tables, Claude's strict-JSON `mcpServers`, the
// Copilot CLI's optional wrapper of the same name, and the VS Code guide's
// top-level `servers` — so each reading finds its own container and hands the
// entries here. What a found map means is not a vendor difference: all four
// documents describe a name-to-configuration map, and one shared projection is
// what keeps a server row identical whoever declared it.
import type { DeclaredEntryDto, McpServerDeclarationDto } from '../../../../shared/api-types';

/**
 * The servers one declared map declares: one per mapping-valued entry, in the
 * parser's resolved order, each carrying the name that entry wrote and the
 * fields under it (FR-007).
 *
 * Classification is structural and total: only a mapping declares a server, and
 * an entry whose value is a scalar, a sequence, or an authored `null` is
 * omitted whole rather than published partially — the same answer an absent or
 * non-mapping container gives. No field is validated, no environment reference
 * is resolved, and no declared command, URL, or path gains read or connection
 * authority: the output is the file's own declarations, rendered and nothing
 * more (FR-026).
 */
export function declaredServersIn(
  entries: readonly DeclaredEntryDto[],
): readonly McpServerDeclarationDto[] {
  return entries.flatMap((entry) =>
    entry.value.kind === 'mapping' ? [{ name: entry.key, fields: entry.value.entries }] : [],
  );
}
