// T083: the packaged editor is same-origin and carries only what it needs
// (research.md § 7, QR-003).
//
// The source viewer is the one part of the client with a large third-party
// runtime, and the two things that could go wrong with it are invisible in
// source: an asset could be fetched from a CDN at runtime, and the language
// services' workers could be dragged in by importing the wrong entry point.
// Both are properties of the built artifact, so this is where they are checked.
//
// A CDN fetch would take the user's file browsing off their machine on a
// product whose whole security position is that nothing leaves it. An unused
// language-service worker would ship a JSON/CSS/HTML/TypeScript validator into
// a product that validates nothing.
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

/** Every emitted text asset's contents, concatenated for substring probes. */
function assetText(): string {
  return assetNames()
    .filter((name) => name.endsWith('.js') || name.endsWith('.css') || name.endsWith('.html'))
    .map((name) => readFileSync(join(ASSETS_DIR, name), 'utf8'))
    .join('\n');
}

describe('the packaged Monaco editor', () => {
  it('emits the editor worker as a same-origin asset', () => {
    // Vite's `?worker` import emits the worker beside the rest of the bundle,
    // so the constructor built into the client names a local file instead of
    // assembling a URL at runtime.
    expect(assetNames().some((name) => /^editor\.worker-.*\.js$/u.test(name))).toBe(true);
  });

  it('emits the editor stylesheet and its icon font', () => {
    const names = assetNames();
    expect(names.some((name) => /^editor\..*\.css$/u.test(name))).toBe(true);
    // Monaco's icons are a font rather than an image request; emitting it is
    // what keeps the editor from reaching for one.
    expect(names.some((name) => /^codicon\..*\.ttf$/u.test(name))).toBe(true);
  });

  it('registers the whole basic-language set, not a chosen few', () => {
    // Which languages a reader can meet is decided by whatever a skill's
    // directory contains, so the registration table is the full set. Each entry
    // is a lazy loader, so this costs the registration and nothing else until a
    // file of that language is opened. "The full set" is asserted against the
    // installed package rather than against a sample: the expected list is
    // enumerated from `monaco-editor`'s own `basic-languages` directory, so
    // dropping any single import fails this case by name.
    const contributions = readdirSync(
      fileURLToPath(
        new URL('../../node_modules/monaco-editor/esm/vs/basic-languages', import.meta.url),
      ),
      { withFileTypes: true },
    )
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
    expect(contributions.length).toBeGreaterThan(50);
    const registrations = readFileSync(
      fileURLToPath(new URL('../../src/app/composables/monaco-languages.ts', import.meta.url)),
      'utf8',
    );
    for (const language of contributions) {
      expect(registrations, `no basic-language registration imports ${language}`).toContain(
        `/basic-languages/${language}/${language}.contribution`,
      );
    }
    // And the built asset carries the registrations, sampled by id: the
    // bundler renames files, so the dist assertion is on registered ids.
    const text = assetText();
    for (const language of ['"shell"', '"dockerfile"', '"powershell"', '"rust"', '"python"']) {
      expect(text, `no basic language registered as ${language}`).toContain(language);
    }
  });

  it('ships no language-service worker', () => {
    // The application imports `editor.api` and the basic-language
    // contributions, never the full `monaco-editor` entry point that would also
    // pull in the JSON, CSS, HTML, and TypeScript services. A basic language
    // only colours text; a service validates, and validating an inspected file
    // is the one thing this product must not do.
    for (const service of ['json', 'css', 'html', 'ts']) {
      expect(assetNames().some((name) => name.startsWith(`${service}.worker`))).toBe(false);
    }
  });

  it('references no asset CDN from any emitted asset', () => {
    const text = assetText();
    // A CDN reference anywhere in the bundle is a request off the user's
    // machine, which the loopback-only position does not permit. Documentation
    // and namespace URLs that libraries carry in their own text are not
    // fetched and are not what this looks for.
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
});
