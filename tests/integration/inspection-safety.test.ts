// T142/T217: inspection safety through the whole scan (FR-024, FR-028,
// FR-029; contracts/vendors/claude-code.md § Known ambiguities item 9).
//
// Two suites share the harness. The symlink suite pins Claude skill behavior:
// Claude follows supported skill symlinks, and the Inspector reads symbolic
// links through their targets the same way, so a symlinked skill is inspected
// as the content Claude would load — the published item is the link's own
// admitted path carrying the resolved file's complete text, while a broken
// link is that file's `file-unreadable` diagnostic inside an otherwise
// publishable `partial` generation. The Codex instruction suite pins the
// relationship and failure doctrine for that kind: reference-looking source
// stays source text with zero target access, and a rejected recognition
// crosses the scan unchanged — no domain catch, no Diagnostic, no generation.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

describe('Codex instruction scans stay inert and fail loudly (T217)', () => {
  /** A repository whose instruction file points, in three spellings, at a real neighbor. */
  function buildInstructionFixture(): string {
    const root = mkdtempSync(join(tmpdir(), 'inspector-instruction-safety-'));
    mkdirSync(join(root, 'docs'), { recursive: true });
    writeFileSync(join(root, 'docs/target.md'), 'never read\n', 'utf8');
    writeFileSync(
      join(root, 'AGENTS.md'),
      'See @docs/target.md and [the guide](docs/target.md).\ndocs/target.md\n',
      'utf8',
    );
    return root;
  }

  it('publishes the instruction file and never reads a reference target', async () => {
    const root = buildInstructionFixture();
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    const publication = await runSourceScan({
      sourceId: 'source-1',
      root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    // The instruction file is recognized with its complete text, and the
    // authored reference spellings changed nothing about the walk: the
    // pointed-at neighbor was admitted by no rule, read by nothing, and is in
    // no published item (FR-020; data-model.md § Relationship).
    expect(publication.outcome).toBe('complete');
    const recognition = publication.recognitions.find(
      (candidate) => candidate.sourceRelativePath === 'AGENTS.md' && candidate.tool === 'codex',
    );
    expect(recognition?.details.kind).toBe('instructions');
    expect(publication.files.map((file) => file.sourceRelativePath)).toEqual(['AGENTS.md']);
  });

  it('aborts the attempt unchanged when recognition rejects, committing nothing', async () => {
    // The trigger-owning outer boundary is the only lifecycle handler: a
    // rejected recognition crosses the scan with its identity intact — no
    // domain catch, no cause classification, no retry, no recovered item,
    // Diagnostic, or generation (FR-029; spec.md § Closed Scan Publication
    // Outcomes).
    const root = buildInstructionFixture();
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    const failure = new Error('instruction recognizer exploded');
    await expect(
      runSourceScan({
        sourceId: 'source-1',
        root,
        rootFailureOwner: 'repository',
        recognize: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure);
  });
});
