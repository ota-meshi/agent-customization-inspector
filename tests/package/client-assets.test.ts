// T1208: the packaged client is same-origin and carries only what it needs
// (research.md § 7, QR-003).
//
// Four things about the client are properties of the built artifact rather
// than of the source. An asset could be fetched from a CDN at runtime, which
// would take the user's file browsing off their machine on a product whose
// whole security position is that nothing leaves it. The shell could load a
// script from another origin. The colouring's regular-expression engine could
// be the WebAssembly build, which would ship a `.wasm` asset and an
// instantiation the JavaScript engine has no need of. And a grammar could be
// bundled into the chunk every detail route loads instead of into the chunk
// fetched when a file of its language is shown. The bundled packages' notices
// have a suite of their own (`third-party-notices.test.ts`).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** The built SPA the devframe host serves; produced by `pnpm run build`. */
const PUBLIC_DIR = fileURLToPath(new URL('../../dist/public', import.meta.url));
const ASSETS_DIR = join(PUBLIC_DIR, '_nuxt');

/**
 * Every emitted asset file name. The build is a CI prerequisite of this
 * project's job, so a missing `dist/` is a broken run rather than a case to
 * tolerate — failing loudly here beats silently asserting nothing.
 */
function assetNames(): string[] {
  if (!existsSync(ASSETS_DIR)) {
    throw new Error('dist/public/_nuxt is missing: run `pnpm run build` before the package suite');
  }
  return readdirSync(ASSETS_DIR);
}

/** Each emitted script's contents, by file name. */
function scripts(): Map<string, string> {
  return new Map(
    assetNames()
      .filter((name) => name.endsWith('.js'))
      .map((name) => [name, readFileSync(join(ASSETS_DIR, name), 'utf8')]),
  );
}

/**
 * The message shiki's core raises for a language nobody loaded — the one
 * string that identifies the chunk carrying the highlighter, since the
 * bundler renames everything else.
 */
const HIGHLIGHTER_MARKER = 'you may need to load it first';

/** The Markdown grammar's own scope, as its registration spells it. */
const MARKDOWN_SCOPE = '"scopeName":"text.html.markdown"';

describe('the packaged client', () => {
  it('references no asset CDN from any emitted asset', () => {
    // A CDN reference anywhere in the bundle is a request off the user's
    // machine, which the loopback-only position does not permit (FR-022).
    // Documentation and namespace URLs that libraries carry in their own text
    // are not fetched and are not what this looks for.
    const text = [...scripts().values()].join('\n');
    for (const host of ['cdn.jsdelivr.net', 'unpkg.com', 'cdnjs.cloudflare.com', 'esm.sh']) {
      expect(text).not.toContain(host);
    }
  });

  it('loads every shell asset from a root-absolute same-origin path', () => {
    // The one place a packaged SPA could reach another origin without any
    // application code saying so. Every script and stylesheet the shell pulls
    // in must be a path this host serves itself.
    const shell = readFileSync(join(PUBLIC_DIR, 'index.html'), 'utf8');
    const references = [...shell.matchAll(/(?:src|href)=["']([^"']*)["']/gu)].map(
      (match) => match[1]!,
    );
    expect(references.length).toBeGreaterThan(0);
    for (const reference of references) {
      // Rooted at this host, and not merely starting with a slash: `//cdn.example/x`
      // is protocol-relative and resolves to another origin, which is exactly
      // what this exists to catch.
      expect(reference, `${reference} is not a root-absolute path`).toMatch(/^\/(?!\/)/u);
    }
  });

  it('ships the JavaScript regular-expression engine and no WebAssembly', () => {
    // The Oniguruma engine arrives as a `.wasm` asset and a chunk that
    // instantiates it; the JavaScript engine needs neither
    // (`syntax-highlighting.ts`). A language's display name may spell
    // "WebAssembly" — two bundled grammars are for it — so the instantiation
    // call is what is looked for, not the word.
    expect(assetNames().some((name) => name.endsWith('.wasm'))).toBe(false);
    for (const [name, text] of scripts()) {
      expect(text, `${name} instantiates WebAssembly`).not.toContain('WebAssembly.instantiate');
    }
  });

  it('carries the highlighter in one chunk and every grammar outside it', () => {
    // A grammar is fetched when a file of its language is first shown
    // (`syntax-highlighting.ts`), so none may be bundled into the chunk the
    // highlighter itself lives in — where Markdown, the language every skill
    // is written in, would be the first to end up. Markdown stands for the
    // set: its grammar is in the bundle, in a chunk of its own.
    const highlighter = [...scripts()].filter(([, text]) => text.includes(HIGHLIGHTER_MARKER));
    expect(highlighter.map(([name]) => name)).toHaveLength(1);
    expect(highlighter[0]![1]).not.toContain(MARKDOWN_SCOPE);
    const grammars = [...scripts()].filter(([, text]) => text.includes(MARKDOWN_SCOPE));
    expect(grammars.map(([name]) => name)).toHaveLength(1);
  });
});
