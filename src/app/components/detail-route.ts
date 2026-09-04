// The detail routes addressed by a file's whole identity — the Source that
// holds it and its Source-relative Path — and the one encoding every detail
// route uses (FR-030).
//
// One module rather than one per kind, because the route is the same
// construction for all of them: the kind's own URL segment, then the path
// encoded segment by segment. A copy per kind would be the same rule written
// several times, free to drift in how it encodes — and encoding is the half
// that matters, because an authored entry name must not be able to smuggle a
// separator or a query into the URL.
//
// A detail carries a second coordinate in the query where the address alone
// does not settle what the reader is looking at. Two live here, because
// several kinds share each: the file a reader selected inside a
// directory-shaped customization, and the inventory row a link was followed
// from, for the kinds whose row unit is a name and whose one file can
// therefore be listed under two. A coordinate one kind has keeps its own
// module and builds on these — an MCP declaration's route names the declared
// server (`mcp-detail-route.ts`), and a plugin carrier's names the row
// (`plugin-detail-route.ts`).
import type { RouteLocationRaw } from 'vue-router';

import { fileIdentityKey } from '../../shared/entities';
import type { CustomizationKind } from '../../shared/entities';
import { GLOBAL_MEMBER_ORDER, SOURCE_SELECTOR_TEXT } from '../../shared/api-text';
import type {
  SessionSnapshot,
  SourceDto,
  SourceKind,
  SourceSelector,
} from '../../shared/api-types';

/**
 * Re-exported so a component naming a route's Source imports it from the module
 * that builds the route, rather than reaching past it into the wire types.
 */
export type { SourceSelector };

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
 * Every token a detail route's leading segment may be, in the closed member
 * order with the repository first — the shared agent home's `global-agents`
 * included (FR-045). A leading segment outside this list is not an address
 * this product issues.
 */
const SOURCE_SELECTORS: readonly SourceSelector[] = [
  'repository',
  ...GLOBAL_MEMBER_ORDER.map((member) => `global-${member}` as const),
];

/**
 * One compared file as a comparison route addresses it: the Source that holds
 * it and its Source-relative Path, which together are the file's identity
 * (FR-030). Every comparison surface carries its pair this way — each side
 * names its own Source in the query — because a pair lives inside one Source
 * family and the Global family holds up to four member Sources, so a pair may
 * hold one consented home's file beside another member's
 * (contracts/http-api.md § Host requirements #5).
 */
export interface ComparisonSide {
  /** Which Source holds it; see {@link SourceSelector}. */
  readonly source: SourceSelector;
  /** Its Source-relative Path, exactly as the inventory published it. */
  readonly sourceRelativePath: string;
}

/**
 * One file's detail route: the kind's segment, the Source that holds the file,
 * then its Source-relative Path.
 *
 * Both halves of the identity are in the address because both are needed: a
 * consented Global home and the selected repository can hold the same
 * Source-relative Path, and a route naming the path alone resolves to
 * whichever the session lists first — silently showing one file's contents
 * under the other's row (FR-030, contracts/http-api.md § get-file-detail).
 *
 * The Source leads the path rather than riding beside it in a query, so the
 * address reads as the identity it is and the router splits it: `[source]` is
 * its own parameter, and the catch-all below it holds the path alone.
 */
export function detailRoute(
  kind: PathAddressedDetailKind,
  sourceRelativePath: string,
  source: SourceSelector = 'repository',
): string {
  // The reserved `detail` segment names the page the way the comparison
  // routes' `compare` segment does, so the two page families own disjoint
  // address spaces whatever a Source-relative Path spells
  // (contracts/http-api.md § Host requirements #5).
  return `/${DETAIL_ROUTE_SEGMENT[kind]}/detail/${source}/${encodeDetailRoutePath(sourceRelativePath)}`;
}

/**
 * One row a detail page can move to without returning to the inventory: what
 * the control calls it, and where it goes (FR-007).
 *
 * The label is the row's own subject — the name a reader looked the row up by
 * — because that is what the move is offering to open. It is presentation
 * text, so a caller passes it through the label rules the row itself uses
 * (`entities.ts` § inlinePresentationLabel).
 */
export interface DetailNeighbour {
  /** The row's own subject as the control draws it. */
  readonly label: string;
  /**
   * The same subject as the fragment spliced into the control's accessible
   * name, directly after the visible direction word. It starts with the drawn
   * spelling, because the control shows that spelling beside it and a
   * speech-input user activates the move by saying what they see (WCAG
   * 2.5.3), and it is separate from {@link label} because an accessible name
   * collapses whitespace: two rows differing only in it must not announce as
   * one move, so the spelled-out presentation follows the drawn one where
   * that would happen (FR-025, WCAG 2.4.4; `entities.ts`
   * § accessiblePresentationLabel). Required rather than defaulted, so a kind
   * added later cannot leave a move announced as its arrow alone.
   */
  readonly accessibleLabel: string;
  /**
   * That row's own detail route, addressed exactly as the inventory links it.
   * A location rather than a path string, because a kind whose detail is one
   * product's reading carries that product in the query (`plugin-detail-route.ts`).
   */
  readonly route: RouteLocationRaw;
}

/**
 * The rows either side of the open one, in the list's published order.
 *
 * The order is the list's rather than this module's: a reader moving from a
 * detail is continuing down the list they came from, so the neighbours are
 * whatever that list showed next. A caller therefore passes its kind's rows
 * already ordered and says which one is open; a row the current generation no
 * longer publishes has no position, and `openIndex` below zero yields no move
 * in either direction rather than the list's ends.
 */
export function detailNeighbours(
  rows: readonly DetailNeighbour[],
  openIndex: number,
): { readonly previous: DetailNeighbour | null; readonly next: DetailNeighbour | null } {
  if (openIndex < 0) {
    return { previous: null, next: null };
  }
  return {
    previous: rows[openIndex - 1] ?? null,
    next: rows[openIndex + 1] ?? null,
  };
}

/**
 * The stable route token for one published Source: the repository's own token,
 * or the tool whose consented home the Source is.
 *
 * The token rather than the Source ID, because an ID belongs to the launch that
 * minted it while a link a reader keeps has to outlive that launch. Total over
 * the union by construction: a Global Source always names its member
 * (api-types.ts § SourceDto).
 */
export function sourceSelectorOf(source: SourceDto): SourceSelector {
  return source.kind === 'global' ? `global-${source.member}` : 'repository';
}

/**
 * The Source ID one route token names, or null when the snapshot lists no
 * Source answering to it — a hand-written address, or a link made while a
 * Global Source this session no longer carries was published.
 *
 * Callers scope a snapshot's rows and files by the returned ID: a row of
 * another Source is a different file however identical its path (FR-030).
 */
export function sourceIdOf(sources: readonly SourceDto[], selector: SourceSelector): string | null {
  for (const source of sources) {
    if (sourceSelectorOf(source) === selector) {
      return source.sourceId;
    }
  }
  return null;
}

/**
 * The Source a detail route's own `[source]` parameter names, or null when the
 * value is not one of the tokens this product issues — a hand-written URL, or a
 * link from before the token existed.
 *
 * A null resolves nothing, and the page reports what it already reports for a
 * path the current scan does not hold. Reading an unknown token as a path
 * segment instead would bring back the ambiguity the parameter exists to
 * remove.
 */
export function asSourceSelector(value: unknown): SourceSelector | null {
  return SOURCE_SELECTORS.find((candidate) => candidate === value) ?? null;
}

/**
 * How a document title names a comparison's two sides (WCAG 2.4.2): each path
 * led by the side it is, and by its Source's name as well when the sides sit
 * in two Sources — two tabs comparing one path across two consented homes must
 * not read identically, while two paths of one Source already tell themselves
 * apart.
 *
 * `first` and `second` are the words the comparison's own cards carry, and
 * they say which side a path is where a conjunction only sat between them: a
 * path may contain the conjunction, and then two different pairs title
 * themselves alike. It narrows the collision rather than closing it — any
 * string is one a file may write, which is why the sides are told apart by
 * structure wherever a surface has structure to spend (`authored-name.ts`).
 * Null while the URL does not name both sides; the raw paths, because the
 * shell escapes a title subject exactly once at the rendering boundary.
 */
export function comparisonTitleSides(
  left: ComparisonSide | null,
  right: ComparisonSide | null,
): string | null {
  if (left === null || right === null) {
    return null;
  }
  return left.source === right.source
    ? `first ${left.sourceRelativePath}, second ${right.sourceRelativePath}`
    : `first ${SOURCE_SELECTOR_TEXT[left.source]} ${left.sourceRelativePath}, second ${
        SOURCE_SELECTOR_TEXT[right.source]
      } ${right.sourceRelativePath}`;
}

/**
 * One compared side as a comparison route's query names it: its own Source
 * token under `sourceName` and its JSON-string-body path under `pathName`, or
 * null when either is missing or the token is not one this product issues
 * ({@link ComparisonSide}). One reading for every comparison page, so the
 * query spelling the route builders write is decoded exactly one way.
 *
 * A repeated parameter arrives as an array; these routes' are not repeated,
 * so the array form folds to its first value rather than being a case.
 */
export function querySideOf(
  query: Readonly<Record<string, unknown>>,
  sourceName: string,
  pathName: string,
): ComparisonSide | null {
  const single = (value: unknown): string | null => {
    if (typeof value === 'string') {
      return value;
    }
    return Array.isArray(value) && typeof value[0] === 'string' ? value[0] : null;
  };
  const selector = asSourceSelector(single(query[sourceName]));
  const raw = single(query[pathName]);
  const sourceRelativePath = raw === null ? '' : fromJsonStringBody(raw);
  return selector === null || sourceRelativePath === ''
    ? null
    : { source: selector, sourceRelativePath };
}

/**
 * The identity key one side resolves to against the published Sources, or
 * null while its token names no committed Source — a link kept across a
 * Global disable, which a comparison page's pair fault reports
 * (`entities.ts` § fileIdentityKey).
 */
export function sideIdentityKeyOf(
  sources: readonly SourceDto[],
  side: ComparisonSide | null,
): string | null {
  if (side === null) {
    return null;
  }
  const sourceId = sourceIdOf(sources, side.source);
  return sourceId === null ? null : fileIdentityKey(sourceId, side.sourceRelativePath);
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

/**
 * The `name` query a link from an inventory row carries: which row the reader
 * followed, for the kinds whose row unit is a name.
 *
 * One file can be listed under more than one name — FR-007 has Claude Code
 * invoking a skill's directory while Copilot invokes the authored `name`, and
 * the same file is then a definition of both rows (spec.md § Clarifications).
 * The page stays the file's, addressed by `(source, path)`; this says nothing
 * about what the page shows and only records where it was opened from, so the
 * moves to the previous and next row step the list the reader was actually
 * reading rather than whichever of that file's rows the snapshot lists first.
 *
 * A second coordinate in the query rather than a second address, exactly as
 * {@link selectedFileQuery} is: two rows opening one file must not become two
 * pages, because they are one file with one set of bytes.
 *
 * No query for a row that has no name — the one row closing the custom-agent
 * list, whose files publish none (api-types.ts § AgentInventoryEntryDto.name).
 * A name is what this coordinate carries, so a nameless row states nothing and
 * the page falls back to the first row holding the file, which is what every
 * link did before this coordinate existed. A kept link that names a row the
 * current generation no longer publishes falls back the same way.
 */
export function originRowNameQuery(name: string | null): Readonly<Record<string, string>> {
  return name === null ? {} : { name: toJsonStringBody(name) };
}

/**
 * The row name a detail route's `name` query states, or null when it states
 * none — an absent query, and the repeated one the router hands over as an
 * array, which no link this product builds produces and which names no single
 * row.
 */
export function originRowNameOf(parameter: unknown): string | null {
  return typeof parameter === 'string' ? fromJsonStringBody(parameter) : null;
}

/**
 * The Source family one comparison address names, or null for a segment
 * outside the two this product issues. Every comparison route leads with the
 * family — `/<kind>/compare/<family>` (contracts/http-api.md § Host
 * requirements #5) — because a pair stays inside one family while a family
 * can hold two consented homes; a null resolves nothing, and the page reports
 * the link instead of comparing.
 */
export function comparisonFamilyOf(segment: unknown): SourceKind | null {
  for (const candidate of ['repository', 'global'] as const) {
    if (candidate === segment) {
      return candidate;
    }
  }
  return null;
}

/**
 * The Source family a selector addresses: the repository token is the
 * Repository family's, and every other token names a consented home
 * ({@link SourceSelector}). Resolved from the address alone, so a caller can
 * scope a request to its sequence before resolving anything — the open
 * detail's and each open comparison's generation-invalidation scope reads
 * this (FR-030).
 */
export function selectorFamilyOf(source: SourceSelector): SourceKind {
  return source === 'repository' ? 'repository' : 'global';
}

/** {@link selectorFamilyOf}, read from a comparison side's own selector. */
export function sideFamilyOf(side: ComparisonSide): SourceKind {
  return selectorFamilyOf(side.source);
}

/**
 * The committed generation of the family `source` addresses, or 0 while no
 * snapshot — or no Global sequence — exists. This is what a detail route
 * watches beside its path keys, so a commit re-requests the open file exactly
 * when the sequence it reads from advanced (FR-030): a Repository page must
 * not refetch over a Global commit, and a Global page must notice its own
 * family's commit even though the Repository generation never moved.
 */
export function familyGenerationOf(
  snapshot: Pick<SessionSnapshot, 'repositoryGeneration' | 'globalGeneration'> | null,
  source: SourceSelector,
): number {
  if (snapshot === null) {
    return 0;
  }
  return selectorFamilyOf(source) === 'repository'
    ? snapshot.repositoryGeneration
    : (snapshot.globalGeneration ?? 0);
}

/**
 * Each family's comparison pair among the offered sides — the family's first
 * two, for the families that hold two. What a row's per-block comparison
 * entries pair (FR-011): a block's comparison is that family's, so a family
 * with one comparable side offers none, exactly as the instruction blocks do
 * (contracts/http-api.md § Host requirements #5).
 */
export function familyComparisonPairsOf(
  sides: readonly ComparisonSide[],
): ReadonlyMap<SourceKind, readonly [ComparisonSide, ComparisonSide]> {
  const pairs = new Map<SourceKind, readonly [ComparisonSide, ComparisonSide]>();
  for (const [family, familySides] of Map.groupBy(sides, sideFamilyOf)) {
    const [first, second] = familySides;
    if (first !== undefined && second !== undefined) {
      pairs.set(family, [first, second]);
    }
  }
  return pairs;
}
