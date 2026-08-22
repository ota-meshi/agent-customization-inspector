// Builds the MCP detail routes (FR-007, data-model.md § Inventory unit). A
// declaration record — the kind's row unit, one per `[mcp_servers.*]` key —
// is addressed as `/mcp/<source-relative path>?server=<name>`: the carrier
// path is the wire identity the fetch resolves (FR-030), and the query names
// the one declaration the page is about, the same way the inventory's own
// kind selection lives in the query. The path alone,
// `/mcp/<source-relative path>`, addresses the carrier itself: the view a
// declarationless carrier's record keeps, and the file-unit facts every
// declaration of the carrier shares. Both survive rescans and server
// launches and resolve against whatever the current scan holds.
import { detailRoute, toJsonStringBody } from './detail-route';

/**
 * The detail route for one MCP carrier. Each path segment is percent-encoded
 * so an authored entry name cannot smuggle a separator or a query into the
 * URL, while the `/` separators stay separators for the catch-all route to
 * split on — the same encoding the skill and instruction routes use.
 */

/**
 * The detail route for one server declaration: the carrier's route selecting
 * the declared name. The name is percent-encoded whole — it is a TOML key,
 * so a `/`, `&`, or `=` in it is authored text rather than URL structure.
 *
 * The name passes through {@link toJsonStringBody} first, because a
 * declared name is not always well-formed UTF-16: strict JSON resolves an
 * authored `"\uD800"` escape to a lone surrogate, which no URL can carry —
 * `encodeURIComponent` throws `URIError` on it, and the throw would surface
 * inside the inventory computed that builds these links. The page decodes the
 * query with {@link fromJsonStringBody}, so every declared name — the
 * lone surrogate included — round-trips to its own selection.
 */
export function mcpServerDetailRoute(sourceRelativePath: string, name: string): string {
  return `${detailRoute('MCP', sourceRelativePath)}?server=${encodeURIComponent(
    toJsonStringBody(name),
  )}`;
}
