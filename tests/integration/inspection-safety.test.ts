// T142: symlinked Claude skills through the whole scan (FR-024, FR-028;
// contracts/vendors/claude-code.md § Known ambiguities item 9).
//
// Claude follows supported skill symlinks, and the Inspector reads symbolic
// links through their targets the same way, so a symlinked skill is inspected
// as the content Claude would load. The regression this suite pins: the
// published item is the link's own admitted path carrying the resolved file's
// complete text — never the target's path, and never a synthetic "is a link"
// outcome — while a broken link is that file's `file-unreadable` diagnostic
// inside an otherwise publishable `partial` generation.
import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { buildClaudeSkillFixture } from '../fixtures/repositories/build-fixtures';
import { runSourceScan } from '../../src/server/inspection/scan';

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

describe('symlinked Claude skills', () => {
  it('inspects a linked skill through its target and diagnoses a broken link', async () => {
    const fixture = buildClaudeSkillFixture('inspector-inspection-safety');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    if (!fixture.capabilities.symlinks) {
      // The platform refused symlink creation (for example Windows without
      // the privilege); the behavior under test cannot exist there.
      return;
    }
    const publication = await runSourceScan({
      sourceId: 'source-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }

    // The linked skill publishes under its admitted path, with the resolved
    // target's complete text — exactly what Claude Code loading the same path
    // would read (FR-024).
    const linked = publication.files.find(
      (file) => file.sourceRelativePath === '.claude/skills/linked/SKILL.md',
    );
    expect(linked?.encoding).toBe('utf-8');
    expect(linked && 'sourceText' in linked ? linked.sourceText : null).toBe(
      '# linked claude skill\n',
    );
    expect(linked?.diagnosticIds).toEqual([]);
    // And it is a recognized Claude skill like any other: reading through the
    // link changed nothing about recognition.
    const recognition = publication.recognitions.find(
      (candidate) =>
        candidate.sourceRelativePath === linked?.sourceRelativePath && candidate.tool === 'claude',
    );
    expect(recognition?.details.kind).toBe('skill');

    // The broken link is that file's `file-unreadable` diagnostic — a
    // published diagnostic-only item, not an absent file — and it is what
    // makes the otherwise publishable generation `partial` (FR-028).
    const broken = publication.files.find(
      (file) => file.sourceRelativePath === '.claude/skills/broken/SKILL.md',
    );
    expect(broken?.encoding).toBe('unknown');
    const diagnostic = publication.diagnostics.find(
      (entry) => entry.diagnosticId === broken?.diagnosticIds[0],
    );
    expect(diagnostic).toMatchObject({
      code: 'file-unreadable',
      sourceRelativePath: '.claude/skills/broken/SKILL.md',
    });
    expect(publication.outcome).toBe('partial');
    // No recognition attaches to a file whose bytes never arrived.
    expect(
      publication.recognitions.some(
        (candidate) => candidate.sourceRelativePath === broken?.sourceRelativePath,
      ),
    ).toBe(false);
  });
});
