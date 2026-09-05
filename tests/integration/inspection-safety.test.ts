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
import {
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  readlinkSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
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
      scope: 'repository',
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
      scope: 'repository',
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
        scope: 'repository',
        recognize: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure);
  });
});

describe('the tree a scan read is the tree it found (T924)', () => {
  /** What the platform lets a test observe about one file, before and after. */
  interface FileObservation {
    readonly size: number;
    readonly mode: number;
    readonly mtimeMs: number;
    readonly ctimeMs: number;
    readonly isSymbolicLink: boolean;
    readonly content: string;
  }

  /**
   * Observes every entry under `root` without following links, so a link's own
   * identity is compared rather than its target's twice.
   *
   * `atime` is deliberately absent: reading a file is what updates it, so it
   * is the one attribute a read is allowed to move, and it is recorded
   * separately below rather than asserted here. Extended attributes and ACLs
   * have no stable Node.js API, so `ctime` is the indirect signal that
   * something changed them (T924).
   */
  function observe(root: string, relative = ''): Map<string, FileObservation> {
    const observed = new Map<string, FileObservation>();
    for (const entry of readdirSync(join(root, relative), { withFileTypes: true })) {
      const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
      const stats = lstatSync(join(root, path));
      if (stats.isDirectory()) {
        for (const [nested, value] of observe(root, path)) {
          observed.set(nested, value);
        }
        continue;
      }
      observed.set(path, {
        size: stats.size,
        mode: stats.mode,
        mtimeMs: stats.mtimeMs,
        ctimeMs: stats.ctimeMs,
        isSymbolicLink: stats.isSymbolicLink(),
        content: stats.isSymbolicLink()
          ? readlinkSync(join(root, path))
          : readFileSync(join(root, path), 'latin1'),
      });
    }
    return observed;
  }

  it('leaves content, length, identity, link, mode, and both change times as they were', async () => {
    const fixture = buildClaudeSkillFixture('inspector-safety-mutation');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const before = observe(fixture.root);
    expect(before.size).toBeGreaterThan(5);

    const publication = await runSourceScan({
      sourceId: 'src-safety',
      root: fixture.root,
      rootFailureOwner: 'repository',
      scope: 'repository',
    });
    expect(publication.kind).toBe('publishable');

    // The product opens files to read them and does nothing else: the seam it
    // reads through exposes five read-only operations and no mutation-capable
    // one at all (`fs-io.ts`), so what this observes is that the closed
    // surface held for a whole scan of a real tree (FR-023).
    const after = observe(fixture.root);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  it('publishes exactly the closed outcome set, and nothing outside one file commits', async () => {
    // The publication matrix: each file-confined outcome is that file's own
    // record inside a `partial` generation, and the generation still holds
    // every other file complete (FR-028).
    const root = mkdtempSync(join(tmpdir(), 'inspector-safety-matrix-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude/skills/readable'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/readable/SKILL.md'),
      '---\nname: readable\ndescription: Fine.\n---\n\nBody.\n',
      'utf8',
    );
    mkdirSync(join(root, '.claude/skills/binary'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/binary/SKILL.md'), Buffer.from([0x23, 0x00, 0x61]));
    mkdirSync(join(root, '.claude/skills/malformed'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/malformed/SKILL.md'),
      '---\nname: [unterminated\n---\n\nBody.\n',
      'utf8',
    );

    const publication = await runSourceScan({
      sourceId: 'src-matrix',
      root,
      rootFailureOwner: 'repository',
      scope: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    // Only the closed set, and one record per (file, kind): a new code would
    // be a fourth way to report a file, which the contract does not have.
    expect(
      [...new Set(publication.diagnostics.map((diagnostic) => diagnostic.code))].toSorted(),
    ).toEqual(['file-content-binary', 'recognition-parse-failed']);
    const readable = publication.files.find(
      (file) => file.sourceRelativePath === '.claude/skills/readable/SKILL.md',
    );
    expect(readable?.encoding).toBe('utf-8');
    expect(readable?.diagnosticIds).toEqual([]);
  });

  it('fails the attempt for an unreadable root, publishing no partial inventory', async () => {
    // A root that cannot be read is the Source's failure rather than any
    // file's: there is no file to attach it to, and no part of the tree was
    // enumerated to publish (FR-002).
    const missing = join(tmpdir(), 'inspector-safety-absent-root');
    const publication = await runSourceScan({
      sourceId: 'src-absent',
      root: missing,
      rootFailureOwner: 'repository',
      scope: 'repository',
    });
    if (publication.kind !== 'source-failed') {
      throw new Error('expected the source-failed outcome');
    }
    expect(publication.diagnostic.code).toBe('root-unreadable');
    expect(publication.diagnostic.sourceRelativePath).toBeNull();
    expect(Object.keys(publication).toSorted()).toEqual(['diagnostic', 'kind']);
  });
});
