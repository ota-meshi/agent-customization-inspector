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
    const sections = noticeText()
      .split(/^={72}$/mu)
      .slice(1);
    expect(sections.length).toBeGreaterThan(20);
    for (let index = 1; index < sections.length; index += 2) {
      expect(sections[index]?.trim()).not.toBe('');
      expect(sections[index]).not.toContain('Declared license:');
    }
  });
});
