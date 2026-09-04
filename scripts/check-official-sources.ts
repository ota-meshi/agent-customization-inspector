// Official-source drift checker (T1032). A maintainer-only command, outside
// every default build, start, test, and CI chain: it is the only thing in this
// repository that makes an outbound request, so it runs when a maintainer asks
// it to and never as a side effect of another command
// (contracts/official-sources.md § Presentation Allowlist implementation gate).
//
// What it decides is what a script can decide: that a recorded URL still
// answers on its own official host without redirecting, and that each cited
// section still resolves — as a served heading, or, when no served heading
// carries it, as the one fragment every table-of-contents link bearing its
// text points at. What it does not
// decide is what a vanished heading means, or whether the sections still
// establish the paraphrase a record maintains; those stay the reviewer's, and
// AGENTS.md § Official-source verification policy says so.
//
// It reports and mutates nothing. Every network or runtime failure is reported
// as itself, with no partial write and no automatic cause-based conclusion.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/** The registry this checker reads, relative to the repository root. */
const REGISTRY_PATH = 'specs/001-inspect-agent-customizations/contracts/official-sources.md';

/** The flag that opts this run into making requests. */
const NETWORK_FLAG = '--network';

/** The fixed actionable line a run without the opt-in prints. */
const NETWORK_REQUIRED = `This command makes outbound requests. Re-run it with ${NETWORK_FLAG}.`;

/** One authored row of the official-source registry. */
export interface OfficialSourceRecord {
  /** The stable key the vendor and composition contracts cite. */
  readonly sourceId: string;
  /** The exact HTTPS URL the row records, with no credentials, query, or fragment. */
  readonly canonicalUrl: string;
  /** The exact host allowlist for this record; a subdomain is not implied. */
  readonly officialHost: string;
  /** The exact rendered heading texts this record cites. */
  readonly sectionAnchors: readonly string[];
  /** The date those sections were last read and compared. */
  readonly reviewedOn: string;
}

/** How one cited section resolved against the bytes a host served. */
export type SectionResolution =
  /** Exactly one served heading element carries that text. */
  | 'heading'
  /** No served heading carries it; every table-of-contents link bearing it points at one fragment. */
  | 'anchor'
  /** More than one served heading carries that text, so no one heading is cited. */
  | 'ambiguous-heading'
  /** No served heading carries it, and links bearing it point at two or more fragments. */
  | 'ambiguous-anchor'
  /** Neither a served heading nor a table-of-contents link carries it. */
  | 'missing';

/** One record's outcome, as this checker observed it. */
export interface SourceCheckResult {
  /** The record checked. */
  readonly record: OfficialSourceRecord;
  /** The status the host answered with, or null when no response was obtained. */
  readonly status: number | null;
  /** Why the response was not usable, or null when it was. */
  readonly rejection: string | null;
  /** Each cited section's resolution, in the record's own order. */
  readonly sections: readonly { readonly anchor: string; readonly resolution: SectionResolution }[];
}

/**
 * Parses the registry's source table. Only the rows are read: the table is the
 * normative owner of every `sourceId`, and prose around it owns nothing.
 * @param markdown the registry contract's own bytes
 */
export function parseOfficialSourceRegistry(markdown: string): OfficialSourceRecord[] {
  const records: OfficialSourceRecord[] = [];
  for (const line of markdown.split('\n')) {
    if (!line.startsWith('| `')) {
      continue;
    }
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((cell) => cell.trim());
    const [sourceId, canonicalUrl, officialHost, anchors, reviewedOn] = cells;
    if (cells.length !== 5 || sourceId === undefined || canonicalUrl === undefined) {
      continue;
    }
    if (!canonicalUrl.startsWith('<https://')) {
      // The header row's own cells are code spans; a record's URL cell is the
      // autolink the registry writes every canonical URL as.
      continue;
    }
    records.push({
      sourceId: unwrapCode(sourceId),
      // The registry writes its URLs as autolinks, which are the URL and two
      // brackets; the row's value is the URL.
      canonicalUrl: (canonicalUrl.startsWith('<')
        ? canonicalUrl.slice(1, -1)
        : canonicalUrl
      ).trim(),
      officialHost: unwrapCode(String(officialHost)),
      sectionAnchors: String(anchors)
        .split(';')
        .map((anchor) => unwrapCode(anchor.trim()))
        .filter((anchor) => anchor !== ''),
      reviewedOn: unwrapCode(String(reviewedOn)),
    });
  }
  return records;
}

/**
 * The value inside a Markdown code span, or the text unchanged when it is not
 * one.
 * @param cell one table cell's trimmed text
 */
export function unwrapCode(cell: string): string {
  return cell.startsWith('`') && cell.endsWith('`') ? cell.slice(1, -1) : cell;
}

/**
 * The text of every heading element the response served, in document order.
 * Read from the bytes rather than from a rendered tree: what this checker can
 * observe is what the host sent.
 * @param html the complete served body
 */
export function servedHeadings(html: string): string[] {
  const headings: string[] = [];
  for (const match of html.matchAll(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>/giu)) {
    headings.push(collapseText(String(match[1])));
  }
  return headings;
}

/**
 * One heading's text with markup stripped, the five XML entities decoded, and
 * whitespace collapsed, which is the form a rendered heading is cited by.
 *
 * Five, not the HTML named-character-reference table: every one of the
 * registry's cited headings is plain ASCII with no reference in it, so a
 * decoder for the rest would be a mechanism with no row behind it. The
 * `normalizationVersion: 1` clause that decodes references in full belongs to
 * `snapshotFingerprint`, which the contract defers and this command does not
 * compute (contracts/official-sources.md). A served heading carrying a
 * reference this misses is reported as a missing section — loudly, for a
 * maintainer to read — never as a silent match.
 *
 * A format character (Unicode `Cf`) renders as nothing, so it is no part of
 * the rendered text a heading is cited by and is dropped: code.claude.com
 * places a zero-width space inside each heading's own anchor link, and
 * keeping it would report every heading on that host as missing.
 * @param fragment the element's inner bytes
 */
export function collapseText(fragment: string): string {
  return fragment
    .replaceAll(/<[^>]*>/gu, '')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll(/\p{Cf}/gu, '')
    .replaceAll(/\s+/gu, ' ')
    .trim();
}

/** The two body syntaxes the command accepts (contracts/official-sources.md). */
export type BodySyntax =
  /** An HTML page, whose headings are `<h1>`–`<h4>` elements. */
  | 'html'
  /** A Markdown document, whose headings are ATX `#` lines. */
  | 'markdown';

/** One retrieved response, before anything is decided about it. */
export interface Retrieval {
  /** The HTTP status the host answered with. */
  readonly status: number;
  /** The final URL, which a redirect would move off the record's own host. */
  readonly url: string;
  /** The `content-type` header verbatim, or the empty string when none was sent. */
  readonly contentType: string;
  /** The undecoded body, so an invalid sequence is still detectable. */
  readonly bytes: Uint8Array;
}

/**
 * The body as text and which syntax its headings are in, or null when the bytes
 * are not valid UTF-8. Decoding is fatal because the contract makes a decoding
 * failure a hard failure rather than something to read through.
 * @param response one retrieved response whose status and host were accepted
 */
export function decodeBody(response: Retrieval): { text: string; syntax: BodySyntax } | null {
  try {
    return {
      text: new TextDecoder('utf-8', { fatal: true }).decode(response.bytes),
      syntax: bodySyntax(response.contentType) ?? 'html',
    };
  } catch {
    return null;
  }
}

/**
 * The syntax a `content-type` names, or null when it is neither accepted one.
 * A missing header is read as HTML: the header is the host's to send, and the
 * registry's pages are HTML.
 * @param contentType the header verbatim
 */
export function bodySyntax(contentType: string): BodySyntax | null {
  const essence = contentType.split(';')[0]!.trim().toLowerCase();
  if (essence === '' || essence === 'text/html' || essence === 'application/xhtml+xml') {
    return 'html';
  }
  return essence === 'text/markdown' || essence === 'text/plain' ? 'markdown' : null;
}

/**
 * Every heading a Markdown body serves, in document order. ATX only: the
 * registry cites rendered heading text, and a setext underline carries the same
 * text one line above it, which this reads as a paragraph rather than guessing.
 * @param markdown the complete served body
 */
export function markdownHeadings(markdown: string): string[] {
  return [...markdown.matchAll(/^ {0,3}#{1,4}[ \t]+(.+?)[ \t]*#*[ \t]*$/gmu)].map((match) =>
    String(match[1]).replaceAll(/\s+/gu, ' ').trim(),
  );
}

/**
 * How one cited section resolves against a served body. A heading element is
 * the primary evidence; when no served heading carries the text, the page's
 * table of contents is — the fragment links bearing that text, which must all
 * point at one fragment, because two fragments cite no one section.
 * @param html the complete served body
 * @param anchor the exact rendered heading text the record cites
 */
export function resolveCitedSection(
  body: string,
  anchor: string,
  syntax: BodySyntax = 'html',
): SectionResolution {
  // Exact, as the registry states the descriptor is: only whitespace is
  // collapsed, because that is markup's to decide and not the author's. A
  // case-folded comparison would accept a heading the vendor recapitalized,
  // which is drift a reviewer has to see (contracts/official-sources.md
  // § Record notation and ownership).
  const wanted = anchor.replaceAll(/\s+/gu, ' ').trim();
  const served = syntax === 'markdown' ? markdownHeadings(body) : servedHeadings(body);
  const headings = served.filter((heading) => heading === wanted);
  if (headings.length === 1) {
    return 'heading';
  }
  if (headings.length > 1) {
    return 'ambiguous-heading';
  }
  // No served heading carries it, so the page's own table of contents is the
  // remaining evidence: the site derives that list from the same content, so
  // a fragment link whose text is the cited section names a section the page
  // has — one whose heading a client-rendered page did not serve, or one the
  // page renders as something other than a heading, as the code.claude.com
  // changelog renders each release as a labelled entry and lists it here.
  // Headings the page serves for its own chrome do not block the fallback:
  // what would hide a lost section is a link to it that stayed behind, and a
  // generated table of contents loses the entry with the section. Every link
  // bearing the text must point at one fragment — a table of contents and an
  // in-prose cross-reference name the same one section, while two fragments
  // are two sections and cite neither (contracts/official-sources.md
  // § Offline validation and explicit drift review).
  const targets = new Set<string>();
  for (const link of body.matchAll(/<a\b[^>]*\bhref="#([^"]*)"[^>]*>([\s\S]*?)<\/a>/giu)) {
    if (collapseText(String(link[2])) === wanted) {
      targets.add(String(link[1]));
    }
  }
  if (targets.size === 1) {
    return 'anchor';
  }
  return targets.size > 1 ? 'ambiguous-anchor' : 'missing';
}

/**
 * Why one response is not usable evidence for its record, or null when it is.
 * A redirect is rejected rather than followed: the record's own URL is what the
 * citing records point at, and a location that answers elsewhere is
 * evidence-location drift for a reviewer to resolve, not a page to read
 * instead.
 * @param record the row the request was made for
 * @param response what the host answered
 */
export function rejectionFor(
  record: OfficialSourceRecord,
  response: { readonly status: number; readonly url: string; readonly contentType?: string },
): string | null {
  const host = new URL(record.canonicalUrl).host;
  if (host !== record.officialHost) {
    return `the recorded URL is not on its own official host ${record.officialHost}`;
  }
  if (response.status >= 300 && response.status < 400) {
    return `the host redirected (${response.status})`;
  }
  if (response.status !== 200) {
    return `the host answered ${response.status}`;
  }
  if (new URL(response.url).host !== record.officialHost) {
    return `the response came from ${new URL(response.url).host}`;
  }
  if (response.contentType !== undefined && bodySyntax(response.contentType) === null) {
    return `the host served ${response.contentType.split(';')[0]!.trim()}, which is neither HTML nor Markdown`;
  }
  return null;
}

/**
 * The report one run prints. It states what was observed and nothing else: a
 * vanished heading is reported as vanished, because whether it means the page
 * moved is the reviewer's to decide.
 * @param results every record's outcome, in registry order
 */
export function renderReport(results: readonly SourceCheckResult[]): string {
  const lines: string[] = [];
  let drifted = 0;
  for (const result of results) {
    const unresolved = result.sections.filter(
      (section) => section.resolution !== 'heading' && section.resolution !== 'anchor',
    );
    if (result.rejection === null && unresolved.length === 0) {
      continue;
    }
    drifted += 1;
    lines.push(`${result.record.sourceId} (reviewed ${result.record.reviewedOn})`);
    lines.push(`  ${result.record.canonicalUrl}`);
    if (result.rejection !== null) {
      lines.push(`  response: ${result.rejection}`);
    }
    for (const section of unresolved) {
      lines.push(`  section ${section.resolution}: ${section.anchor}`);
    }
  }
  lines.push(`${results.length} sources checked, ${drifted} with drift a reviewer must resolve.`);

  // The contract requires the command to report which headings were
  // established through the table-of-contents carve-out rather than by a
  // served heading (contracts/official-sources.md § the client-rendered
  // exception). Reported after the drift summary and separately from it: an
  // anchor resolution is a pass, and a maintainer re-reading a paraphrase
  // needs to know which passes rest on a slug rather than on the heading text
  // a citation names.
  const anchored = results.flatMap((result) =>
    result.sections
      .filter((section) => section.resolution === 'anchor')
      .map((section) => `  ${result.record.sourceId}: ${section.anchor}`),
  );
  if (anchored.length > 0) {
    lines.push(
      `${anchored.length} heading(s) established through a served table of contents:`,
      ...anchored,
    );
  }
  return lines.join('\n');
}

/**
 * Checks every record and returns each outcome. The fetch is injected so the
 * contract suite exercises the whole decision path without a request, and so
 * this function has one behavior whether the bytes came from a host or a
 * fixture.
 * @param records the registry's rows
 * @param retrieve how one URL's status and complete body are obtained
 */
export async function checkOfficialSources(
  records: readonly OfficialSourceRecord[],
  retrieve: (url: string) => Promise<Retrieval>,
): Promise<SourceCheckResult[]> {
  const results: SourceCheckResult[] = [];
  for (const record of records) {
    let answered;
    try {
      answered = await retrieve(record.canonicalUrl);
    } catch (cause: unknown) {
      // Reported as itself: a thrown request is not evidence about the page,
      // and turning it into a cause would be a conclusion this cannot reach.
      results.push({
        record,
        status: null,
        rejection: `the request did not complete: ${cause instanceof Error ? cause.message : String(cause)}`,
        sections: record.sectionAnchors.map((anchor) => ({
          anchor,
          resolution: 'missing' as const,
        })),
      });
      continue;
    }
    const rejection = rejectionFor(record, answered);
    const decoded = rejection === null ? decodeBody(answered) : null;
    results.push({
      record,
      status: answered.status,
      rejection: rejection ?? (decoded === null ? 'the body is not valid UTF-8' : null),
      sections: record.sectionAnchors.map((anchor) => ({
        anchor,
        // A body that was not usable evidence resolves nothing: reading it
        // would report sections from a page this record does not cite.
        resolution:
          decoded === null ? 'missing' : resolveCitedSection(decoded.text, anchor, decoded.syntax),
      })),
    });
  }
  return results;
}

/**
 * Retrieves one URL completely, without following a redirect. Capacity and
 * completion are the environment's, as the registry states.
 * @param url the record's own canonical URL
 */
export async function retrieveOverNetwork(url: string): Promise<Retrieval> {
  const response = await fetch(url, {
    redirect: 'manual',
    headers: { accept: 'text/html, text/markdown' },
  });
  return {
    status: response.status,
    url: response.url === '' ? url : response.url,
    contentType: response.headers.get('content-type') ?? '',
    // The raw bytes, not `response.text()`: `text()` replaces an invalid
    // sequence with U+FFFD, so a decoding failure would arrive as a page that
    // reads almost right. The contract makes it a hard failure, which needs the
    // bytes to still be undecoded here.
    bytes: new Uint8Array(await response.arrayBuffer()),
  };
}

if (import.meta.main) {
  const repositoryRoot = resolve(import.meta.dirname, '..');
  if (!process.argv.includes(NETWORK_FLAG)) {
    console.error(NETWORK_REQUIRED);
    process.exitCode = 1;
  } else {
    const records = parseOfficialSourceRegistry(
      readFileSync(join(repositoryRoot, REGISTRY_PATH), 'utf8'),
    );
    const results = await checkOfficialSources(records, retrieveOverNetwork);
    console.log(renderReport(results));
    process.exitCode = results.some(
      (result) =>
        result.rejection !== null ||
        result.sections.some(
          (section) => section.resolution !== 'heading' && section.resolution !== 'anchor',
        ),
    )
      ? 1
      : 0;
  }
}
