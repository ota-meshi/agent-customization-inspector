// Builds the plugin detail routes (FR-007, data-model.md § Inventory unit). A
// plugin row's carrier — a catalog entry or the plugin's own manifest — is
// addressed as `/plugins/<source-relative path>`, with the row and the file
// the reader has open named in the query: the carrier path is the wire
// identity the fetch resolves (FR-030), the `plugin` query names the one
// plugin the page is about, because a catalog carries every plugin it lists
// and the reader followed one of them, and the `file` query names which of
// that plugin's own files is being read. The path alone addresses the carrier
// itself: the view a carrier that resolves no plugin name keeps. All of them
// survive rescans and server launches and resolve against whatever the current
// scan holds.
import type { RouteLocationRaw } from 'vue-router';

import type { SupportedTool } from '../../shared/entities';
import {
  detailRoute,
  selectedFileQuery,
  toJsonStringBody,
  type SourceSelector,
} from './detail-route';

/**
 * The detail route for one plugin carrier, selecting the plugin the row is
 * headed by — or the carrier alone when the row names none — and the file of
 * that plugin the page has open.
 *
 * A router location rather than a URL string: the query is a record the router
 * encodes and joins, so nothing here concatenates `?` or `&`, and a name that
 * carries either is authored text rather than URL structure. The name passes
 * through {@link toJsonStringBody} first, because a declared name is not
 * always well-formed UTF-16: strict JSON resolves an authored `"\uD800"`
 * escape to a lone surrogate, which no URL can carry, and the router's
 * `encodeURIComponent` throws `URIError` on it inside the computed that builds
 * these links. The page decodes the query the same way, so every declared
 * name — the lone surrogate included — round-trips to its own selection.
 */
export function pluginCarrierDetailRoute(
  sourceRelativePath: string,
  tool: SupportedTool,
  name: string | null,
  selectedFilePath: string | null = null,
  source: SourceSelector = 'repository',
): RouteLocationRaw {
  return {
    path: detailRoute('plugin', sourceRelativePath, source),
    query: {
      // The product whose reading the page opens: a row lists one carrier per
      // `(file, tool)`, and which directory an entry's source names is that
      // vendor's own contract, so the link that opens a carrier line names the
      // product that line is about (`api-types.ts`
      // § PluginCarrierDetailParams.tool).
      tool,
      ...(name === null ? {} : { plugin: toJsonStringBody(name) }),
      ...selectedFileQuery(selectedFilePath),
    },
  };
}
