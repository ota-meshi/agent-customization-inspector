// T1031 — the official-source drift checker's contracts
// (contracts/official-sources.md § Record notation and ownership). The checker
// is the one command in this repository that reaches the network, so every case
// here exercises its whole decision path without making a request: the
// retrieval is injected, and what is under test is what the checker concludes
// from bytes a host served.
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  checkOfficialSources,
  headingAnchorSlug,
  parseOfficialSourceRegistry,
  rejectionFor,
  renderReport,
  resolveCitedSection,
  servedHeadings,
} from '../../scripts/check-official-sources.ts';

/** The repository root, two directories above this suite. */
const repositoryRoot = resolve(import.meta.dirname, '../..');

/** One record, with only the fields a case varies spelled out. */
function record(overrides: Partial<Parameters<typeof rejectionFor>[0]> = {}) {
  return {
    sourceId: 'vendor.page',
    canonicalUrl: 'https://docs.example.test/en/page',
    officialHost: 'docs.example.test',
    sectionAnchors: ['Adding a server'],
    reviewedOn: '2026-08-27',
    ...overrides,
  };
}

/**
 * One served body as the retrieval carries it: the content type the host would
 * send and the undecoded bytes, because both are what the command decides on.
 * @param body the page the host answers with
 * @param contentType the header to claim, when a case is about the type itself
 */
function served(body: string, contentType = 'text/html; charset=utf-8') {
  return { contentType, bytes: new TextEncoder().encode(body) };
}

describe('the registry table', () => {
  it('reads every record the repository ships, and no header row', () => {
    const registry = [
      '| `sourceId` | `canonicalUrl` | `officialHost` | Exact `sectionAnchors` | `reviewedOn` |',
      '|---|---|---|---|---|',
      '| `vendor.page` | <https://docs.example.test/en/page> | `docs.example.test` | `One`; `Two` | `2026-08-27` |',
    ].join('\n');
    // The header's own cells are code spans, and a record's URL cell is an
    // autolink: reading the header as a record would check a URL nobody cites.
    expect(parseOfficialSourceRegistry(registry)).toEqual([
      {
        sourceId: 'vendor.page',
        canonicalUrl: 'https://docs.example.test/en/page',
        officialHost: 'docs.example.test',
        sectionAnchors: ['One', 'Two'],
        reviewedOn: '2026-08-27',
      },
    ]);
  });
});

describe('the response a record admits', () => {
  it('accepts only a direct answer from the record’s own official host', () => {
    expect(rejectionFor(record(), { status: 200, url: record().canonicalUrl })).toBeNull();
  });

  it.each([
    ['a redirect', { status: 301, url: 'https://docs.example.test/en/page' }, /redirected/u],
    ['a not-found', { status: 404, url: 'https://docs.example.test/en/page' }, /answered 404/u],
    [
      'an answer from another host',
      { status: 200, url: 'https://mirror.example.test/en/page' },
      /came from mirror\.example\.test/u,
    ],
  ])('rejects %s', (_label, response, expected) => {
    // A redirect is rejected rather than followed: the citing records point at
    // the recorded URL, and a page answering elsewhere is drift to resolve.
    expect(rejectionFor(record(), response)).toMatch(expected);
  });

  it('rejects a record whose own URL is not on its official host', () => {
    const drifted = record({ canonicalUrl: 'https://elsewhere.example.test/en/page' });
    expect(rejectionFor(drifted, { status: 200, url: drifted.canonicalUrl })).toMatch(
      /not on its own official host/u,
    );
  });
});

describe('a cited section', () => {
  it('resolves against exactly one served heading element', () => {
    const html = '<h2 id="adding-a-server">Adding a server</h2><h3>Other</h3>';
    expect(servedHeadings(html)).toEqual(['Adding a server', 'Other']);
    expect(resolveCitedSection(html, 'Adding a server')).toBe('heading');
  });

  it('resolves a client-rendered page through its one table-of-contents slug', () => {
    // The page ships only its contents list, so the heading exists but no
    // element carrying it does; the slug is then the evidence.
    const html = '<nav><a href="#adding-a-server">Adding a server</a></nav>';
    expect(resolveCitedSection(html, 'Adding a server')).toBe('anchor');
  });

  it.each([
    [
      'two headings carry it',
      '<h2>Adding a server</h2><h4>Adding a server</h4>',
      'ambiguous-heading',
    ],
    [
      'two anchors carry its slug',
      '<a href="#adding-a-server">a</a><a href="#adding-a-server">b</a>',
      'ambiguous-anchor',
    ],
    ['nothing carries it', '<h2>Something else</h2>', 'missing'],
  ])('reports %s rather than choosing one', (_label, html, expected) => {
    expect(resolveCitedSection(html, 'Adding a server')).toBe(expected);
  });

  it('derives a slug the way a documentation site does', () => {
    expect(headingAnchorSlug('Adding per-repository MCP servers')).toBe(
      'adding-per-repository-mcp-servers',
    );
    expect(headingAnchorSlug('Commands (alternative skill format)')).toBe(
      'commands-alternative-skill-format',
    );
  });

  it('reads a heading through the markup and entities a host serves', () => {
    expect(servedHeadings('<h2 class="x">Skills <code>&amp;</code>\n  commands</h2>')).toEqual([
      'Skills & commands',
    ]);
  });
});

describe('one checking run', () => {
  it('reports a thrown retrieval as itself, with no conclusion about the page', async () => {
    const [result] = await checkOfficialSources([record()], () => {
      throw new Error('getaddrinfo ENOTFOUND');
    });
    // No automatic cause: a request that did not complete says nothing about
    // whether the page moved, and the reviewer decides that.
    expect(result?.status).toBeNull();
    expect(result?.rejection).toMatch(/did not complete: getaddrinfo ENOTFOUND/u);
  });

  it('reads no section from a response it rejected', async () => {
    const [result] = await checkOfficialSources([record()], async () => ({
      status: 301,
      url: record().canonicalUrl,
      ...served('<h2>Adding a server</h2>'),
    }));
    // The body of a redirect is another page's; resolving against it would
    // report sections this record does not cite.
    expect(result?.rejection).toMatch(/redirected/u);
    expect(result?.sections).toEqual([{ anchor: 'Adding a server', resolution: 'missing' }]);
  });

  it('reports only what drifted, and states the reviewer still owns it', async () => {
    const results = await checkOfficialSources(
      [record(), record({ sourceId: 'vendor.moved', sectionAnchors: ['Gone'] })],
      async () => ({
        status: 200,
        url: record().canonicalUrl,
        ...served('<h2>Adding a server</h2>'),
      }),
    );
    const report = renderReport(results);
    expect(report).not.toMatch(/vendor\.page/u);
    expect(report).toMatch(/vendor\.moved/u);
    expect(report).toMatch(/section missing: Gone/u);
    expect(report).toMatch(/2 sources checked, 1 with drift a reviewer must resolve\./u);
  });

  it('names every heading a served table of contents established', async () => {
    // The contract requires the command to report which headings rest on the
    // client-rendered carve-out rather than on a served heading: an anchor
    // resolution passes, and a maintainer re-reading the paraphrase behind it
    // has to know it was a slug that matched (contracts/official-sources.md).
    const results = await checkOfficialSources([record()], async () => ({
      status: 200,
      url: record().canonicalUrl,
      ...served('<a href="#adding-a-server">Adding a server</a>'),
    }));
    const report = renderReport(results);
    expect(report).toMatch(/1 sources checked, 0 with drift a reviewer must resolve\./u);
    expect(report).toMatch(/1 heading\(s\) established through a served table of contents:/u);
    expect(report).toMatch(/vendor\.page: Adding a server/u);
  });

  it('says nothing about a table of contents when every heading was served', async () => {
    const results = await checkOfficialSources([record()], async () => ({
      status: 200,
      url: record().canonicalUrl,
      ...served('<h2>Adding a server</h2>'),
    }));
    expect(renderReport(results)).not.toMatch(/table of contents/u);
  });

  it('checks the repository’s own registry without reaching the network', async () => {
    const registry = parseOfficialSourceRegistry(
      readFileSync(
        join(
          repositoryRoot,
          'specs/001-inspect-agent-customizations/contracts/official-sources.md',
        ),
        'utf8',
      ),
    );
    // Every shipped record is well formed enough to be checked: an HTTPS URL on
    // its own official host, with at least one cited section.
    expect(registry.length).toBeGreaterThan(0);
    for (const shipped of registry) {
      expect(new URL(shipped.canonicalUrl).host).toBe(shipped.officialHost);
      expect(new URL(shipped.canonicalUrl).protocol).toBe('https:');
      expect(shipped.canonicalUrl).not.toMatch(/[?#]/u);
      expect(shipped.sectionAnchors.length).toBeGreaterThan(0);
      expect(shipped.reviewedOn).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
    }
  });
});

describe('what the contract makes a hard failure', () => {
  // Each case below passed before the behaviour it names existed, which is why
  // it is here: a checker that reports no drift is indistinguishable from one
  // that cannot see it (contracts/official-sources.md § Offline validation and
  // explicit drift review).

  it('reports a recapitalized heading as missing, because the descriptor is exact', () => {
    expect(resolveCitedSection('<h2>Adding a Server</h2>', 'Adding a server')).toBe('missing');
    expect(resolveCitedSection('<h2>Adding a server</h2>', 'Adding a server')).toBe('heading');
  });

  it('reads a table-of-contents slug only on a page that serves no heading at all', () => {
    const toc = '<a href="#adding-a-server">Adding a server</a>';
    // The client-rendered shape the carve-out exists for.
    expect(resolveCitedSection(toc, 'Adding a server')).toBe('anchor');
    // The same stale link on a page that does serve headings: the cited one is
    // gone, and the leftover link must not stand in for it.
    expect(resolveCitedSection(`<h2>Something else</h2>${toc}`, 'Adding a server')).toBe('missing');
  });

  it('rejects a body whose content type is neither HTML nor Markdown', () => {
    expect(
      rejectionFor(record(), {
        status: 200,
        url: record().canonicalUrl,
        contentType: 'application/json',
      }),
    ).toMatch(/neither HTML nor Markdown/u);
    expect(
      rejectionFor(record(), {
        status: 200,
        url: record().canonicalUrl,
        contentType: 'text/markdown; charset=utf-8',
      }),
    ).toBeNull();
  });

  it('rejects a body that is not valid UTF-8 rather than reading through it', async () => {
    const [result] = await checkOfficialSources([record()], async () => ({
      status: 200,
      url: record().canonicalUrl,
      contentType: 'text/html',
      // A lone continuation byte: `response.text()` would have replaced it with
      // U+FFFD and handed back a page that reads almost right.
      bytes: new Uint8Array([0x3c, 0x68, 0x32, 0x3e, 0x80, 0x3c, 0x2f, 0x68, 0x32, 0x3e]),
    }));
    expect(result?.rejection).toMatch(/not valid UTF-8/u);
    expect(result?.sections).toEqual([{ anchor: 'Adding a server', resolution: 'missing' }]);
  });

  it('resolves a Markdown body against its own headings', async () => {
    const [result] = await checkOfficialSources([record()], async () => ({
      status: 200,
      url: record().canonicalUrl,
      contentType: 'text/markdown',
      bytes: new TextEncoder().encode('# Page\n\n## Adding a server\n\nBody.\n'),
    }));
    expect(result?.rejection).toBeNull();
    expect(result?.sections).toEqual([{ anchor: 'Adding a server', resolution: 'heading' }]);
  });
});
