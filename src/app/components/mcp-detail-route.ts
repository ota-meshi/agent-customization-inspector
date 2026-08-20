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

/**
 * The detail route for one MCP carrier. Each path segment is percent-encoded
 * so an authored entry name cannot smuggle a separator or a query into the
 * URL, while the `/` separators stay separators for the catch-all route to
 * split on — the same encoding the skill and instruction routes use.
 */
export function mcpDetailRoute(sourceRelativePath: string): string {
  const encoded = sourceRelativePath.split('/').map(encodeURIComponent).join('/');
  return `/mcp/${encoded}`;
}

/**
 * The detail route for one server declaration: the carrier's route selecting
 * the declared name. The name is percent-encoded whole — it is a TOML key,
 * so a `/`, `&`, or `=` in it is authored text rather than URL structure.
 *
 * The name passes through {@link encodeMcpServerRouteName} first, because a
 * declared name is not always well-formed UTF-16: strict JSON resolves an
 * authored `"\uD800"` escape to a lone surrogate, which no URL can carry —
 * `encodeURIComponent` throws `URIError` on it, and the throw would surface
 * inside the inventory computed that builds these links. The page decodes the
 * query with {@link decodeMcpServerRouteName}, so every declared name — the
 * lone surrogate included — round-trips to its own selection.
 */
export function mcpServerDetailRoute(sourceRelativePath: string, name: string): string {
  return `${mcpDetailRoute(sourceRelativePath)}?server=${encodeURIComponent(
    encodeMcpServerRouteName(name),
  )}`;
}

/**
 * Spells a declared server name as the well-formed text the `server` query
 * carries: every backslash doubles, and every lone surrogate becomes its
 * `\uXXXX` escape. Escaping the introducer first is what keeps the spelling
 * reversible — a decoded `\uXXXX` can only ever have come from a lone
 * surrogate, never from authored text that happened to spell the escape.
 * A paired surrogate is well-formed and stays as authored.
 */
export function encodeMcpServerRouteName(name: string): string {
  return name.replaceAll(/[\uD800-\uDBFF][\uDC00-\uDFFF]|[\uD800-\uDFFF]|\\/gu, (match) =>
    match === '\\'
      ? '\\\\'
      : match.length === 2
        ? match
        : `\\u${match.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')}`,
  );
}

/**
 * The inverse of {@link encodeMcpServerRouteName}: the page applies it to the
 * router-decoded `server` query value to recover the declared name exactly.
 * A backslash the encoder did not write — a hand-authored URL — stays a
 * literal backslash rather than failing the whole selection.
 */
export function decodeMcpServerRouteName(value: string): string {
  return value.replaceAll(/\\\\|\\u[0-9A-Fa-f]{4}/gu, (match) =>
    match === '\\\\' ? '\\' : String.fromCharCode(Number.parseInt(match.slice(2), 16)),
  );
}
