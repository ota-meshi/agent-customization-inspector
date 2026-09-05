// Builds the hook detail routes (FR-007, data-model.md § Inventory unit). A
// declaration record — the kind's row unit, one per declared lifecycle event —
// is addressed as `/hooks/<source-relative path>?event=<name>`: the carrier
// path is the wire identity the fetch resolves (FR-030), and the query names
// the one declaration the page is about, the same way the MCP declaration
// route names its server. The path alone, `/hooks/<source-relative path>`,
// addresses the carrier itself: the view a carrier with no declaration keeps,
// and the file-unit facts every declaration of the carrier shares. Both
// survive rescans and resolve against whatever the current scan holds.
import { detailRoute, toJsonStringBody, type SourceSelector } from './detail-route';

/**
 * The detail route for one event declaration: the carrier's route selecting
 * the declared event. The name is percent-encoded whole — it is an authored
 * map key, so a `/`, `&`, or `=` in it is authored text rather than URL
 * structure.
 *
 * The name passes through {@link toJsonStringBody} first, for the reason the
 * MCP route does it: a declared key is not always well-formed UTF-16, strict
 * JSON resolves an authored `"\uD800"` escape to a lone surrogate, and
 * `encodeURIComponent` throws `URIError` on one — inside the inventory
 * computed that builds these links. The page decodes the query with
 * {@link fromJsonStringBody}, so every declared event round-trips to its own
 * selection.
 */
export function hookEventDetailRoute(
  sourceRelativePath: string,
  event: string,
  source: SourceSelector = 'repository',
): string {
  return `${detailRoute('hook', sourceRelativePath, source)}?event=${encodeURIComponent(
    toJsonStringBody(event),
  )}`;
}
