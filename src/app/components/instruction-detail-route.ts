// Builds the instruction detail route for one recognized instruction file
// (FR-007, data-model.md § Inventory unit): `/instructions/<source-relative
// path>`. The inventory groups files by applicability range, but a detail
// stays addressed by the file, so the path alone is the route's identity — no
// tool segment exists, because no per-tool fact (an invocation name, a
// per-tool parse) distinguishes what the page would show, and the recognizing
// products are the inventory row's own statement. The
// path is the file's identity on the wire too (FR-030), so the route
// survives rescans and server launches and resolves against whatever the
// current scan holds at it.

/**
 * The detail route for one instruction file. Each path segment is
 * percent-encoded so an authored entry name cannot smuggle a separator or a
 * query into the URL, while the `/` separators stay separators for the
 * catch-all route to split on — the same encoding the skill route uses.
 */
export function instructionDetailRoute(sourceRelativePath: string): string {
  const encoded = sourceRelativePath.split('/').map(encodeURIComponent).join('/');
  return `/instructions/${encoded}`;
}
