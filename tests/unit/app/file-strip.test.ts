// T1165: the strip of other copies a detail page offers — which entries it
// holds, and which one it leaves out.
//
// The rendered shape is not here: the unit project compiles no single-file
// component, and what a browser has to prove about this strip is that it stays
// one line whatever the count and that each entry carries its own recognizing
// marks (T1166). What is a question about data — that the file on screen is
// excluded, by its whole identity rather than by its path — is here.
import { describe, expect, it } from 'vitest';

import {
  otherCopiesOf,
  type FileStripEntry,
} from '../../../src/app/components/inspection/file-strip';
import { fileIdentityKey } from '../../../src/shared/entities';

/** One published copy, as a row hands it to the strip. */
function entry(sourceId: string, path: string): FileStripEntry {
  return {
    key: fileIdentityKey(sourceId, path),
    sourceId,
    pathText: path,
    opens: { accessibleText: path, route: `/instructions/detail/${sourceId}/${path}` },
    recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
    carrierText: null,
  };
}

describe('the other copies a detail offers', () => {
  it('leaves out the file the page is showing and keeps the rest in order', () => {
    // The heading already spells the open file, and a surface must not carry
    // one fact in two spellings (FR-007). The rest keep the row's own order,
    // because a reader moving between copies is continuing down the list the
    // row published.
    const entries = [
      entry('src-repo', 'AGENTS.md'),
      entry('src-repo', 'CLAUDE.md'),
      entry('src-repo', 'GEMINI.md'),
    ];
    expect(
      otherCopiesOf(entries, fileIdentityKey('src-repo', 'CLAUDE.md')).map((one) => one.pathText),
    ).toEqual(['AGENTS.md', 'GEMINI.md']);
  });

  it('keeps a same-path copy of another Source, which is a different file', () => {
    // Two Sources can hold one Source-relative Path, and they are two files
    // (FR-030): excluding by path alone would drop the copy the reader opened
    // the strip to reach.
    const entries = [entry('src-repo', 'AGENTS.md'), entry('src-global-codex', 'AGENTS.md')];
    const others = otherCopiesOf(entries, fileIdentityKey('src-repo', 'AGENTS.md'));
    expect(others).toHaveLength(1);
    expect(others[0]?.opens?.route).toBe('/instructions/detail/src-global-codex/AGENTS.md');
  });

  it('offers nothing when the name is carried by the open file alone', () => {
    // One copy is no set to move through, and the component draws nothing at
    // all rather than a line naming an empty one.
    const entries = [entry('src-repo', 'AGENTS.md')];
    expect(otherCopiesOf(entries, fileIdentityKey('src-repo', 'AGENTS.md'))).toEqual([]);
  });

  it('offers every copy when the open file is not among them', () => {
    // A link kept from an older generation can name a path the current one no
    // longer publishes. The strip is still the set of copies the name has, so
    // nothing is excluded on the strength of a key that matches none of them.
    const entries = [entry('src-repo', 'AGENTS.md'), entry('src-repo', 'CLAUDE.md')];
    expect(otherCopiesOf(entries, fileIdentityKey('src-repo', 'GONE.md'))).toHaveLength(2);
  });
});
