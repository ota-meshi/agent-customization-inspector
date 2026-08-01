// FR-043: the tarball carries the notices of the code it inlines.
//
// The browser bundle includes third-party code as its own bytes — Monaco is the
// largest, Vue, the Nuxt runtime, and the devframe client are also inlined — so
// the user never receives those packages with their license files. The licenses
// require the copyright and permission notice to travel with the copies, which
// makes the notice file part of the published artifact rather than a courtesy.
//
// This is asserted against the built output because that is where the answer
// lives: source cannot show whether the notice reached the tarball.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/** The generated notice document inside the published browser output. */
const NOTICES_PATH = fileURLToPath(
  new URL('../../dist/public/_nuxt/THIRD-PARTY-NOTICES.txt', import.meta.url),
);

/** One package's section of the notice document: what it names, and its terms. */
interface NoticeSection {
  /** The heading the section is titled by: a package name, with its version when the manifest declares one. */
  readonly title: string;
  /** Every notice text the section carries, trimmed. */
  readonly body: string;
}

/**
 * The document's sections. A section is a `===` rule, a title line, a second
 * rule, and the terms until the next one. Reading that structure once here is
 * what frees every assertion below from the renderer's own block order.
 *
 * Every block is consumed, and the count has to be even. The renderer always
 * writes a body block, empty or not, so an odd count means the document is
 * truncated or its rules have moved — and a loop that stopped one block short
 * would pass by the remainder without ever looking at it.
 */
function noticeSections(): NoticeSection[] {
  const blocks = noticeText().split(/^={72}$/mu);
  // The text before the first rule is the document's own header; what follows is
  // one title block and one body block per package, so an odd count means the
  // document is truncated mid-section rather than merely missing a licence.
  const [, ...sectionBlocks] = blocks;
  if (sectionBlocks.length === 0 || sectionBlocks.length % 2 !== 0) {
    throw new Error(
      `the notice document has ${sectionBlocks.length} block(s) after its header, which is not a whole number of title/body pairs`,
    );
  }
  const sections: NoticeSection[] = [];
  for (let index = 0; index + 1 < sectionBlocks.length; index += 2) {
    const title = (sectionBlocks[index] ?? '').trim();
    // The title block is one line naming one package. A blank one names
    // nothing, and a multi-line one means the rules moved and the split is
    // reading body text as a heading — either way the parse below would be
    // checking terms against a package it cannot name.
    if (title === '' || title.includes('\n')) {
      throw new Error(
        `the notice document has a section whose title is not a single package name: ${JSON.stringify(title)}`,
      );
    }
    sections.push({ title, body: (sectionBlocks[index + 1] ?? '').trim() });
  }
  return sections;
}

/**
 * The notice document's text. The build is a prerequisite of the package
 * suite's job, so a missing file is a broken run rather than a case to
 * tolerate — and a silent skip here is exactly the failure this test exists to
 * catch.
 */
function noticeText(): string {
  if (!existsSync(NOTICES_PATH)) {
    throw new Error(
      'dist/public/_nuxt/THIRD-PARTY-NOTICES.txt is missing: run `pnpm run build` before the package suite',
    );
  }
  return readFileSync(NOTICES_PATH, 'utf8');
}

describe('the packaged third-party notices', () => {
  it("carries the bundled editor's copyright and permission notice", () => {
    const text = noticeText();
    // The two parts MIT actually requires: whose copyright it is, and the
    // permission text itself. A list of package names would satisfy neither.
    expect(text).toContain('Microsoft Corporation');
    expect(text).toContain('Permission is hereby granted, free of charge');
    expect(text).toContain(
      'The above copyright notice and this permission notice shall be included in all',
    );
  });

  it('names the packages whose code the bundle inlines', () => {
    const text = noticeText();
    // Derived from the emitted chunks, so these are present because the bundle
    // really contains their modules — not because a list was written by hand.
    // `devframe` is here as a bundled package even though the manifest declares
    // it as a runtime dependency: its client half is in the bundle, and bundling
    // is what decides membership (FR-043).
    for (const bundled of [
      'monaco-editor@',
      '@vue/runtime-core@',
      'vue-router@',
      'devframe@',
      'nuxt@',
    ]) {
      expect(text).toContain(bundled);
    }
  });

  it('does not list the dependencies the package manager installs for the user', () => {
    // The CLI loads these from `node_modules` at run time, so they arrive with
    // their own license files. A second copy here could only go stale, and its
    // absence is what says the file covers the bundle rather than the
    // dependency tree.
    const text = noticeText();
    for (const installed of ['gunshi@', 'smol-toml@', 'vfile-matter@']) {
      expect(text).not.toContain(installed);
    }
  });

  it('gives every listed package its own license text', () => {
    // A section naming a package while carrying no license text would ship that
    // package's code with nothing that satisfies its license. The build fails
    // when it cannot find the text, so this is the packaged-side proof of that.
    //
    // Read as title/body pairs the parser has already checked, so this loop
    // states what a section must carry rather than which split index holds it.
    // `title` is what the assertion names when one fails.
    //
    // No floor on how many sections there are: how many packages the bundle
    // inlines is whatever the dependency graph currently yields, and a number
    // here would fail a legitimate build for going under it. What keeps this
    // loop from passing over an empty document is the parser, which rejects a
    // document with no title/body pair at all, and the assertion above that
    // names the packages the bundle is known to carry.
    for (const { title, body } of noticeSections()) {
      expect(body, `${title} has no license text`).not.toBe('');
      expect(body, `${title} carries only a license identifier`).not.toContain('Declared license:');
    }
  });
});
