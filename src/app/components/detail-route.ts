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
// The one kind whose detail carries a second coordinate keeps its own module
// for that coordinate alone and builds on these: an MCP declaration's route
// names the declared server (`mcp-detail-route.ts`).
import type { CustomizationKind } from '../../shared/entities';

/**
 * The kinds whose detail is addressed by a Source-relative Path alone. A kind
 * is here exactly when no further fact splits its detail: an instruction file,
 * a rule file, a prompt or command file, and a custom-agent file each have one
 * page however many products recognize them, a permission policy is addressed
 * by the path of the file that declares it — the identity its inventory row is
 * named by — an MCP carrier's own page is the carrier's, and a settings or
 * configuration file's page is that file's, its row unit being the file. A
 * skill is here too: its row unit is one invocation name, and two products
 * that invoke one `SKILL.md` differently put it on two rows, but both read the
 * same bytes, the same frontmatter, and the same companion directory, so the
 * page is the file's and the names are what the page states (FR-007).
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
   * Skills live under `/skills/`, addressed by the file's path — the
   * `SKILL.md` or one of the companions its census lists, since the page shows
   * the whole directory and lets the reader move between its files.
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
