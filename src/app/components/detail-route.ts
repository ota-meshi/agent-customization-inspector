// The detail routes addressed by a file's Source-relative Path alone, and the
// one encoding every detail route uses (FR-030).
//
// One module rather than one per kind, because the route is the same
// construction for all of them: the kind's own URL segment, then the path
// encoded segment by segment. A copy per kind would be the same rule written
// several times, free to drift in how it encodes — and encoding is the half
// that matters, because an authored entry name must not be able to smuggle a
// separator or a query into the URL.
//
// A detail whose subject is not the file alone carries a second coordinate in
// the query. The file a reader selected inside a directory-shaped
// customization is one of them and lives here, because two kinds share it; a
// coordinate one kind has keeps its own module and builds on these — an MCP
// declaration's route names the declared server (`mcp-detail-route.ts`), and a
// plugin carrier's names the row (`plugin-detail-route.ts`).
import type { CustomizationKind } from '../../shared/entities';

/**
 * The kinds whose detail is rooted at a Source-relative Path. A kind is here
 * exactly when one file names the subject: an instruction file, a rule file, a
 * prompt or command file, and a custom-agent file each have one page however
 * many products recognize them, a permission policy is addressed by the path
 * of the file that declares it — the identity its inventory row is named by —
 * an MCP or hook carrier's own page is the carrier's, and a settings or
 * configuration file's page is that file's, its row unit being the file. A skill is here
 * too: its row unit is one invocation name, and two products that invoke one
 * `SKILL.md` differently put it on two rows, but both read the same bytes, the
 * same frontmatter, and the same companion directory, so the page is the
 * `SKILL.md`'s and the names are what the page states (FR-007).
 */
export type PathAddressedDetailKind = Extract<
  CustomizationKind,
  | 'instructions'
  | 'skill'
  | 'MCP'
  | 'agent'
  | 'prompt/command'
  | 'rule'
  | 'permissions'
  | 'hook'
  | 'plugin'
  | 'output style'
  | 'settings/config'
>;

/**
 * The URL segment each path-addressed detail route is rooted at, in the closed
 * kind order (`entities.ts` § CUSTOMIZATION_KIND_ORDER).
 */
const DETAIL_ROUTE_SEGMENT: Readonly<Record<PathAddressedDetailKind, string>> = {
  /** Instruction files live under `/instructions/`. */
  instructions: 'instructions',
  /**
   * Skills live under `/skills/`, addressed by the `SKILL.md`'s own path: the
   * skill is the page's subject, and the file a reader selects inside its
   * directory is the query coordinate {@link selectedFileQuery} adds.
   */
  skill: 'skills',
  /** MCP carriers live under `/mcp/`. */
  MCP: 'mcp',
  /**
   * Custom-agent files live under `/agents/`. The row unit is the declared
   * agent name, but a name is not a locator — two files can declare one, and a
   * file can declare none at all — so the route is the file's own path, like
   * every other path-addressed kind.
   */
  agent: 'agents',
  /**
   * Prompt and command files live under `/prompts-and-commands/`. The segment
   * spells the whole kind out rather than taking the shorter half of it: a
   * reader reads this one in the address bar, and `/prompts/` would name a
   * surface that also lists commands.
   */
  'prompt/command': 'prompts-and-commands',
  /** Rule files live under `/rules/`. */
  rule: 'rules',
  /** Declared permission policies live under `/permissions/`. */
  permissions: 'permissions',
  /**
   * Hook carriers live under `/hooks/`. The row unit is the declared
   * lifecycle event, but an event is not a locator — one carrier declares
   * several, and two carriers declare one — so the route is the carrier's own
   * path with the event as the query coordinate, exactly as an MCP
   * declaration's is.
   */
  hook: 'hooks',
  /** Plugin carriers live under `/plugins/`. */
  plugin: 'plugins',
  /** Output styles live under `/output-styles/`. */
  'output style': 'output-styles',
  /**
   * Settings and configuration files live under `/settings-and-configuration/`.
   * The segment spells the kind out rather than taking the shorter half of it,
   * the same choice `/prompts-and-commands/` makes: a reader reads this one in
   * the address bar, and `/settings/` would name a surface that also lists
   * configuration files no vendor calls settings.
   */
  'settings/config': 'settings-and-configuration',
};

/**
 * One string as the body of a JSON string literal: `JSON.stringify`'s own
 * output with its quotes removed.
 *
 * That one call is the whole escape. A raw entry name can hold a lone
 * surrogate — the model says so, and says presentation escapes one without
 * changing the stored value (data-model.md § SourceRelativePath) — and
 * `encodeURIComponent` throws `URIError` on one, which would surface inside
 * the inventory computed that builds these links rather than as one broken
 * row. `JSON.stringify` is required to escape a lone surrogate as `\udXXX`
 * (well-formed JSON.stringify), so the result is always text a URL can carry,
 * and it escapes the backslash that makes the spelling reversible for free.
 * Ordinary characters pass through unchanged, so an ordinary path still reads
 * as itself in the address bar.
 */
export function toJsonStringBody(text: string): string {
  return JSON.stringify(text).slice(1, -1);
}

/**
 * The inverse of {@link toJsonStringBody}, applied to router-decoded text to
 * recover the authored string exactly.
 *
 * Text no JSON string can hold is returned unchanged rather than throwing:
 * the caller is a route resolving a URL, and a hand-authored or truncated one
 * — `a\q`, a trailing backslash — is a link that resolves to nothing, which
 * the page already reports as a path this scan holds nothing at. Throwing
 * would take the page down instead of reporting the link.
 */
export function fromJsonStringBody(text: string): string {
  try {
    return JSON.parse(`"${text}"`) as string;
  } catch {
    return text;
  }
}

/**
 * One Source-relative Path as URL path segments: each segment spelled as
 * well-formed text and then percent-encoded, so an authored entry name can
 * neither smuggle a separator or a query into the URL nor throw the encoder,
 * while the `/` separators stay separators for a catch-all route to split on.
 */
export function encodeDetailRoutePath(sourceRelativePath: string): string {
  return sourceRelativePath
    .split('/')
    .map((segment) => encodeURIComponent(toJsonStringBody(segment)))
    .join('/');
}

/**
 * The Source-relative Path a catch-all route's decoded segments name: the
 * inverse of {@link encodeDetailRoutePath}, since the router percent-decodes
 * each segment but knows nothing of the escape that made it well-formed.
 */
export function decodeDetailRoutePath(segments: readonly string[]): string {
  return segments.map(fromJsonStringBody).join('/');
}

/**
 * The detail route for one file of `kind`. The path is the file's identity on
 * the wire too (FR-030), so the route survives rescans and server launches and
 * resolves against whatever the current scan holds at it.
 */
export function detailRoute(kind: PathAddressedDetailKind, sourceRelativePath: string): string {
  return `/${DETAIL_ROUTE_SEGMENT[kind]}/${encodeDetailRoutePath(sourceRelativePath)}`;
}

/**
 * The `file` query one directory-shaped customization's detail route carries,
 * as the router's own query record, or no query at all for the selection the
 * page opens on by itself.
 *
 * A second coordinate rather than a second address: a skill's scripts and a
 * plugin's assets are files *of* one customization, so the page's subject —
 * and therefore its path — stays that customization however many of its files
 * a reader steps through. Addressing them by path instead put one skill's
 * directory under as many URLs as it holds files, each of which had to work
 * out which customization it belonged to before it could say anything about
 * it.
 *
 * A record for the router to encode and join, never a string this module
 * concatenates: `?` and `&` are the router's to place. The path still passes
 * through {@link toJsonStringBody} first, for the reason a plugin name does
 * (`plugin-detail-route.ts`): it is authored text that may not be well-formed
 * UTF-16, which the router's `encodeURIComponent` throws on.
 */
export function selectedFileQuery(
  sourceRelativePath: string | null,
): Readonly<Record<string, string>> {
  return sourceRelativePath === null ? {} : { file: toJsonStringBody(sourceRelativePath) };
}

/**
 * The Source-relative Path a detail route's `file` query names, or null when
 * it names none — an absent query, and the repeated one the router hands over
 * as an array, which no link this product builds produces and which names no
 * single file.
 */
export function selectedFileOf(parameter: unknown): string | null {
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
}
