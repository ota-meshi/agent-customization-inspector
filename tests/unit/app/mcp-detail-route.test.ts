// T302: the MCP detail route builders. A declaration is addressed as
// `/mcp/<source-relative path>?server=<name>` with every authored segment
// percent-encoded, and the name spelled through a reversible escape so a
// declared name that is not well-formed UTF-16 — a lone surrogate strict
// JSON resolves from an authored `"\uD800"` escape — still selects its own
// declaration instead of throwing `URIError` out of the inventory's render.
import { describe, expect, it } from 'vitest';

import {
  decodeDetailRoutePath,
  detailRoute,
  encodeDetailRoutePath,
  familyGenerationOf,
  toJsonStringBody,
  fromJsonStringBody,
} from '../../../src/app/components/detail-route';
import { mcpServerDetailRoute } from '../../../src/app/components/mcp-detail-route';

describe('the MCP detail routes', () => {
  it('percent-encodes each path segment and the declared name', () => {
    expect(detailRoute('MCP', '.mcp.json')).toBe('/mcp/detail/repository/.mcp.json');
    expect(detailRoute('MCP', 'packages/a b/#x.json')).toBe(
      '/mcp/detail/repository/packages/a%20b/%23x.json',
    );
    expect(mcpServerDetailRoute('.mcp.json', 'context7')).toBe(
      '/mcp/detail/repository/.mcp.json?server=context7',
    );
    // Separators and query characters in a declared name are authored text.
    expect(mcpServerDetailRoute('.mcp.json', 'a/b&c=d')).toBe(
      '/mcp/detail/repository/.mcp.json?server=a%2Fb%26c%3Dd',
    );
  });

  it('round-trips every declared name through the query spelling', () => {
    // JSON.parse('"\\uD800"') resolves to a lone surrogate, which
    // encodeURIComponent rejects with URIError; the escape spelling is what
    // keeps the link buildable and the selection exact.
    const loneSurrogate = JSON.parse('"\\uD800"') as string;
    expect(loneSurrogate.isWellFormed()).toBe(false);
    for (const name of [
      loneSurrogate,
      `a${loneSurrogate}b`,
      // Authored text that spells the escape introducer itself must stay
      // distinct from a real lone surrogate after the round trip.
      String.raw`\uD800`,
      String.raw`back\slash`,
      '\u{1F600}',
      'plain',
    ]) {
      const encoded = toJsonStringBody(name);
      expect(encoded.isWellFormed()).toBe(true);
      expect(fromJsonStringBody(encoded)).toBe(name);
      expect(() => mcpServerDetailRoute('.mcp.json', name)).not.toThrow();
    }
    // A well-formed name with no backslash keeps its plain spelling, so the
    // ordinary link is unchanged by the escape layer.
    expect(mcpServerDetailRoute('.mcp.json', '\u{1F600}')).toBe(
      `/mcp/detail/repository/.mcp.json?server=${encodeURIComponent('\u{1F600}')}`,
    );
  });
});

describe('the JSON-string-body route codec (T1102)', () => {
  it('round-trips a path segment holding a lone surrogate', () => {
    // `fs` returns whatever the platform's name decodes to, and the model says
    // a stored path may hold a lone surrogate (data-model.md
    // § SourceRelativePath). `encodeURIComponent` throws `URIError` on one, so
    // the escape runs first and the route survives the name.
    const authored = '.claude/rules/lone\uD800.md';
    const encoded = encodeDetailRoutePath(authored);
    expect(() => new URL(`/rules/${encoded}`, 'http://localhost')).not.toThrow();
    expect(decodeDetailRoutePath(encoded.split('/').map(decodeURIComponent))).toBe(authored);
  });

  it('round-trips a backslash the escape uses as its own introducer', () => {
    const authored = String.raw`dirA/name\\.md`;
    const encoded = encodeDetailRoutePath(authored);
    expect(decodeDetailRoutePath(encoded.split('/').map(decodeURIComponent))).toBe(authored);
  });
});

describe('the JSON string body a route carries', () => {
  it('returns text no JSON string can hold unchanged rather than throwing', () => {
    // The caller is a route resolving a URL: a hand-authored or truncated one
    // is a link that resolves to nothing, which the page reports as a path
    // this scan holds nothing at. Throwing would take the page down instead.
    expect(fromJsonStringBody(String.raw`a\q`)).toBe(String.raw`a\q`);
    expect(fromJsonStringBody('trailing\\')).toBe('trailing\\');
  });

  it('leaves an ordinary path readable in the address bar', () => {
    // Only what JSON escapes is escaped, so an ordinary name is its own text.
    expect(toJsonStringBody('.claude/rules/style.md')).toBe('.claude/rules/style.md');
  });
});

describe('familyGenerationOf', () => {
  // The generation a detail route watches is the one its open Source's
  // family commits into (FR-030): a Global page must notice its own family's
  // commit even though the Repository generation never moved, and a
  // Repository page must not refetch over a Global commit.
  const snapshot = { repositoryGeneration: 3, globalGeneration: 5 };

  it('reads the family the selector addresses', () => {
    expect(familyGenerationOf(snapshot, 'repository')).toBe(3);
    expect(familyGenerationOf(snapshot, 'global-claude')).toBe(5);
    expect(familyGenerationOf(snapshot, 'global-agents')).toBe(5);
  });

  it('answers 0 while no snapshot or no Global sequence exists', () => {
    expect(familyGenerationOf(null, 'repository')).toBe(0);
    expect(
      familyGenerationOf({ repositoryGeneration: 1, globalGeneration: null }, 'global-codex'),
    ).toBe(0);
  });
});
