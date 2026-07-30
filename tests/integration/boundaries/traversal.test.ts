// T021: FR-024/FR-028 publication-matrix boundaries — file-confined
// outcomes retain diagnostic-only records in a partial generation,
// recognition parse failures keep the readable source displayed, an
// unreadable root fails the Source attempt with the source-scoped
// Diagnostic and no partial generation, a failure outside any single file
// aborts the attempt with nothing committed, external fixture mutation is
// not a product mutation, and late results after revocation are discarded
// without hard-cancellation claims (FR-002, FR-029, FR-030).
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import {
  addUnreadableDirectory,
  buildTraversalFixtureTree,
  collectFsMutationViolations,
  createFixtureRoot,
} from '../../fixtures/filesystem/build-filesystem-fixtures';
import {
  ANY_DIRECTORIES,
  TraversalPlan,
  type CompiledInspectionRule,
} from '../../../src/server/inspection/rules/registry';
import { runTraversalScan } from '../../../src/server/inspection/traversal';
import { assembleScanPublication } from '../../../src/server/inspection/scan';
import { CODEX_REPO_SKILL_RULE } from '../../../src/shared/registries/codex/rules';
import { CODEX_RULE_RELATIONS } from '../../../src/shared/registries/codex/relations';
import type { RecognitionParseStatus, ToolRecognitionDto } from '../../../src/shared/api-types';
import { DiagnosticRecord } from '../../../src/shared/diagnostics';
import { SessionCoordinator, InspectionSession } from '../../../src/server/session/session';
import { prepareNextRepositoryGeneration } from '../../../src/server/session/scan-generation';

// Pass-through spies over the inspection module's closed fs surface —
// production-call instrumentation for the external-mutation case
// (contracts/inspection-path-allowlist.md § Symlink and read invariants).
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const AGENTS_PLAN = TraversalPlan.fromPrograms({ kind: 'repository' }, [
  [ANY_DIRECTORIES, 'AGENTS.md'],
]);

// These suites exercise the publication matrix itself, so they pair the plan
// under test with a stand-in rule identity rather than the shipped Codex
// catalog: the matrix must behave identically for whichever rule admitted a
// candidate.
function codexSkillRule(plan: TraversalPlan): CompiledInspectionRule {
  return {
    rule: CODEX_REPO_SKILL_RULE,
    relations: CODEX_RULE_RELATIONS['codex.repo.skill'],
    tool: 'codex',
    kind: 'skill',
    plan,
  };
}

const AGENTS_RULES: readonly CompiledInspectionRule[] = [codexSkillRule(AGENTS_PLAN)];

// A recognizer stand-in for the FR-028 parse-failure arm. The shipped Codex
// recognizer reaches `failed` only through a malformed `SKILL.md`, so the
// matrix's own behavior — which is about the publication outcome and not about
// any one vendor's extractor — is driven through the same dispatch seam the
// production recognizers are injected on.
function fakeRecognition(
  fileId: string,
  recognitionId: string,
  parseStatus: RecognitionParseStatus,
): ToolRecognitionDto {
  return {
    recognitionId,
    fileId,
    tool: 'codex',
    // These cases assert the parse-summary projection, so the kind is the one
    // the fixture's `AGENTS.md` actually is and carries no per-kind detail.
    details: { kind: 'instructions' },
    parseStatus,
    // A failed recognition publishes no metadata at all, and this stand-in
    // extracts nothing in the first place (FR-028).
    declaredMetadata: [],
    provenances: [],
    diagnosticIds: [],
  };
}

function bootstrapSession(root: string) {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

describe('file-confined outcomes publish a partial generation (FR-028)', () => {
  it('retains diagnostic-only records with coherent tuples while unaffected files stay complete', async () => {
    const tree = buildTraversalFixtureTree('inspector-integration');
    try {
      const result = await runTraversalScan({ root: tree.root, plans: [AGENTS_PLAN] });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root: tree.root,
        rootFailureOwner: 'repository',
        rules: AGENTS_RULES,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.outcome).toBe('partial');

      const binary = publication.files.find(
        (file) => file.sourceRelativePath === 'binary-dir/AGENTS.md',
      );
      expect(binary?.encoding).toBe('binary');
      expect(binary && 'sourceText' in binary).toBe(false);
      const binaryDiagnostic = publication.diagnostics.find(
        (diagnostic) => diagnostic.diagnosticId === binary?.diagnosticIds[0],
      );
      expect(binaryDiagnostic).toMatchObject({
        code: 'file-content-binary',
        sourceId: 'src-1',
        fileId: binary?.fileId,
        sourceRelativePath: 'binary-dir/AGENTS.md',
      });

      if (tree.capabilities.symlinks) {
        const broken = publication.files.find(
          (file) => file.sourceRelativePath === 'broken/AGENTS.md',
        );
        expect(broken?.encoding).toBe('unknown');
        const brokenDiagnostic = publication.diagnostics.find(
          (diagnostic) => diagnostic.diagnosticId === broken?.diagnosticIds[0],
        );
        expect(brokenDiagnostic?.code).toBe('file-unreadable');
      }

      // Unaffected files are complete: full decoded text, no diagnostics.
      const unaffected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      expect(unaffected).toMatchObject({
        encoding: 'utf-8',
        sourceText: 'root agents\n',
        diagnosticIds: [],
      });

      // A replacement decode is a complete result, not a partial cause.
      const replaced = publication.files.find(
        (file) => file.sourceRelativePath === 'invalid-utf8/AGENTS.md',
      );
      expect(replaced).toMatchObject({ encoding: 'utf-8-replaced', diagnosticIds: [] });
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });

  it("publishes a candidate that is another candidate's census entry exactly once", async () => {
    // Two candidates in one directory list each other: every census covers its
    // candidate's own directory and excludes only its own seed. Publishing the
    // second copy would put one file in the inventory twice, under two
    // identities, with its bytes read and counted twice.
    //
    // The shipped Codex matcher admits one `SKILL.md` per skill directory, so no
    // shipped rule reaches this — which is why the case is built here from a
    // plan that does, rather than left to whichever rule ships next. It needs no
    // filesystem capability, so it runs everywhere the suite does.
    const root = createFixtureRoot('inspector-census-overlap');
    try {
      mkdirSync(join(root, 'siblings'), { recursive: true });
      writeFileSync(join(root, 'siblings', 'first.md'), 'first\n');
      writeFileSync(join(root, 'siblings', 'second.md'), 'second\n');
      const rules = [
        codexSkillRule(
          TraversalPlan.fromPrograms({ kind: 'repository' }, [['siblings', /\.md$/u]]),
        ),
      ];
      const result = await runTraversalScan({
        root,
        plans: rules.map((rule) => rule.plan),
      });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root,
        rootFailureOwner: 'repository',
        rules,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.files.map((file) => file.sourceRelativePath)).toEqual([
        'siblings/first.md',
        'siblings/second.md',
      ]);
      expect(publication.candidateFiles).toBe(2);
      expect(publication.diagnostics).toEqual([]);
      expect(publication.outcome).toBe('complete');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('publishes two spellings of one display name as two ordinary files', async () => {
    const tree = buildTraversalFixtureTree('inspector-siblings');
    try {
      if (!tree.capabilities.normalizationSiblings) {
        return;
      }
      // Distinct raw entries that would render alike are two real files the
      // agent's own filesystem holds apart, so each publishes at its own raw
      // path with its own bytes — nothing is normalized, rejected, or
      // diagnosed (FR-024).
      const rules = [
        codexSkillRule(
          TraversalPlan.fromPrograms({ kind: 'repository' }, [['siblings', /\.md$/u]]),
        ),
      ];
      const result = await runTraversalScan({
        root: tree.root,
        plans: rules.map((rule) => rule.plan),
      });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root: tree.root,
        rootFailureOwner: 'repository',
        rules,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.files).toHaveLength(2);
      expect(new Set(publication.files.map((file) => file.sourceRelativePath)).size).toBe(2);
      expect(publication.diagnostics).toEqual([]);
      expect(publication.outcome).toBe('complete');
      expect(publication.candidateFiles).toBe(2);
      expect(publication.candidateFiles).toBe(
        result.kind === 'scanned' ? result.candidateFiles : 0,
      );
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });
});

describe('recognition parse failure keeps the source displayed (FR-028)', () => {
  it('publishes a failed recognition as partial while keeping the readable source', async () => {
    const root = createFixtureRoot('inspector-parsefail');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root agents\n');
      mkdirSync(join(root, 'docs'));
      writeFileSync(join(root, 'docs', 'AGENTS.md'), 'docs agents\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root: root,
        rootFailureOwner: 'repository',
        rules: AGENTS_RULES,
        result,
        recognize: async ({ fileId, matchedPath }) => ({
          recognitions:
            matchedPath === 'AGENTS.md'
              ? [
                  fakeRecognition(fileId, 'rec-failed', 'failed'),
                  fakeRecognition(fileId, 'rec-parsed', 'parsed'),
                ]
              : [],
          // This stand-in is an instructions recognizer, and an instructions
          // file is one file rather than a directory, so it has no census.
          companions: [],
          companionCollisions: 0,
        }),
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // The parse failure is the only file-confined outcome here, and it
      // alone makes the generation partial.
      expect(publication.outcome).toBe('partial');
      const affected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      if (affected?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      // The complete source stays displayed and comparison-eligible; only
      // the failed recognition's derived data is omitted.
      expect(affected.sourceText).toBe('root agents\n');
      expect(affected.recognitionIds).toEqual(['rec-failed', 'rec-parsed']);
      expect(affected.diagnosticIds).toHaveLength(1);
      const diagnostic = publication.diagnostics.find(
        (entry) => entry.diagnosticId === affected.diagnosticIds[0],
      );
      expect(diagnostic).toMatchObject({
        code: 'recognition-parse-failed',
        sourceId: 'src-1',
        fileId: affected.fileId,
        sourceRelativePath: 'AGENTS.md',
      });
      // The failure is recognition-scoped (FR-028), so the recognition carries
      // it too: a row built from recognitions has no other way to reach it, and
      // a diagnostic nothing references is a diagnostic nobody sees. Both
      // owners reference the one published record.
      const failed = publication.recognitions.find(
        (recognition) => recognition.recognitionId === 'rec-failed',
      );
      expect(failed?.diagnosticIds).toEqual(affected.diagnosticIds);
      const parsed = publication.recognitions.find(
        (recognition) => recognition.recognitionId === 'rec-parsed',
      );
      expect(parsed?.diagnosticIds).toEqual([]);
      // A file with no recognitions stays complete and not-applicable.
      const unaffected = publication.files.find(
        (file) => file.sourceRelativePath === 'docs/AGENTS.md',
      );
      expect(unaffected).toMatchObject({ diagnosticIds: [] });
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('keeps one distinct diagnostic per failed recognition on the same file', async () => {
    const root = createFixtureRoot('inspector-parsefail-multi');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root agents\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root: root,
        rootFailureOwner: 'repository',
        rules: AGENTS_RULES,
        result,
        recognize: async ({ fileId }) => ({
          recognitions: [
            fakeRecognition(fileId, 'rec-a', 'failed'),
            fakeRecognition(fileId, 'rec-b', 'failed'),
          ],
          companions: [],
          companionCollisions: 0,
        }),
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // One record per failed recognition (FR-028): the two failures share
      // every public field and still publish separately — and every file
      // diagnostic ID must resolve to a published record.
      const parseFailures = publication.diagnostics.filter(
        (entry) => entry.code === 'recognition-parse-failed',
      );
      expect(parseFailures).toHaveLength(2);
      const affected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      if (affected?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      expect([...affected.diagnosticIds].sort()).toEqual(
        parseFailures.map((entry) => entry.diagnosticId).sort(),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('commits the readable source with only derived data omitted, rekeying the tuple coherently', () => {
    const { session } = bootstrapSession('/fixture-root');
    const parseDiagnostic = new DiagnosticRecord({
      code: 'recognition-parse-failed',
      lifecycleOwnerKey: null,
      sourceId: 'src-1',
      fileId: 'file-1',
      sourceRelativePath: 'AGENTS.md',
    }).serialize();
    const next = prepareNextRepositoryGeneration(session.committedRepositoryGeneration, {
      scannedSourceIds: ['src-1'],
      scanRequestId: 'scan-1',
      startedAt: '2026-07-22T00:00:00.000Z',
      finishedAt: '2026-07-22T00:00:01.000Z',
      outcome: 'partial',
      recognitions: [],
      files: [
        {
          fileId: 'file-1',
          sourceId: 'src-1',
          sourceRelativePath: 'AGENTS.md',
          encoding: 'utf-8',
          hadLeadingBom: false,
          sourceText: '# complete authored source\n',
          sizeBytes: 27,
          recognitionIds: [],
          relationshipIds: [],
          diagnosticIds: [parseDiagnostic.diagnosticId],
        },
      ],
      diagnostics: [parseDiagnostic],
    });
    const file = next.files[0]!;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(file.sourceText).toBe('# complete authored source\n');
    // Rekeying keeps the diagnostic tuple pointing at the republished file.
    expect(next.diagnostics[0]!.fileId).toBe(file.fileId);
    expect(next.outcome).toBe('partial');
  });
});

describe('unreadable root fails the Source attempt (FR-002)', () => {
  it('produces the source-scoped diagnostic and commits no partial generation', async () => {
    const missingRoot = join(createFixtureRoot('inspector-missing'), 'absent');
    const result = await runTraversalScan({ root: missingRoot, plans: [AGENTS_PLAN] });
    const publication = await assembleScanPublication({
      sourceId: 'src-1',
      root: missingRoot,
      rootFailureOwner: 'repository',
      rules: AGENTS_RULES,
      result,
    });
    if (publication.kind !== 'source-failed') {
      throw new Error('expected a source failure');
    }
    expect(publication.diagnostic).toMatchObject({
      code: 'root-unreadable',
      sourceId: 'src-1',
      fileId: null,
      sourceRelativePath: null,
    });

    // The session keeps its last committed snapshot; the failed attempt
    // publishes nothing, and the actionable Diagnostic is retained through
    // the repository owner reference instead of being discarded (FR-002).
    const { session, coordinator } = bootstrapSession(missingRoot);
    const sourceId = session.snapshot().sources[0]!.sourceId;
    const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const sessionPublication = await assembleScanPublication({
      sourceId,
      root: missingRoot,
      rootFailureOwner: 'repository',
      rules: AGENTS_RULES,
      result,
    });
    if (sessionPublication.kind !== 'source-failed') {
      throw new Error('expected a source failure');
    }
    coordinator.failScan(admitted.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: sessionPublication.diagnostic,
    });
    const snapshot = session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.snapshotState).toBe('current');
    expect(snapshot.repositoryFailureDiagnosticId).toBe(sessionPublication.diagnostic.diagnosticId);
    expect(snapshot.sessionDiagnosticIds).toEqual([sessionPublication.diagnostic.diagnosticId]);
  });
});

describe('a failure outside any single file aborts the attempt (FR-028/FR-030)', () => {
  it('propagates the ordinary error and commits nothing', async () => {
    const root = createFixtureRoot('inspector-abort');
    const locked = addUnreadableDirectory(root);
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'fine\n');
      if (locked === null) {
        return;
      }
      // The unreadable directory is not a file-confined outcome: the whole
      // attempt fails as an ordinary error, never as a Diagnostic.
      await expect(runTraversalScan({ root, plans: [AGENTS_PLAN] })).rejects.toThrow();

      const { session, coordinator } = bootstrapSession(root);
      const sourceId = session.snapshot().sources[0]!.sourceId;
      const admitted = coordinator.admitScan(sourceId, { kind: 'request', operationId: 'op-1' });
      if (admitted.kind !== 'admitted') {
        throw new Error('expected admission');
      }
      let requestError: string | null = null;
      try {
        await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      } catch (error) {
        requestError = (error as Error).message;
      }
      expect(requestError).not.toBeNull();
      // The accepted job records the failed request's real error; nothing
      // was committed from the attempt.
      coordinator.failScan(admitted.scanRequestId, { kind: 'error', message: requestError! });
      const snapshot = session.snapshot();
      expect(snapshot.repositoryGeneration).toBe(0);
      expect(snapshot.sources[0]!.status).toBe('failed');
    } finally {
      locked?.restore();
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('external mutation during a scan is not a product mutation', () => {
  it('keeps the product read-only while the harness mutates a fixture mid-scan', async () => {
    const root = createFixtureRoot('inspector-external');
    try {
      mkdirSync(join(root, 'a'));
      writeFileSync(join(root, 'a', 'AGENTS.md'), 'first\n');
      writeFileSync(join(root, 'AGENTS.md'), 'root\n');
      const mutationTarget = join(root, 'AGENTS.md');
      const trigger = join(root, 'a', 'AGENTS.md');
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      // The harness — not the product — rewrites a sibling fixture while
      // the scan is reading another file.
      vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
        if (path === trigger) {
          writeFileSync(mutationTarget, 'externally changed\n');
        }
        return actual.readFile(path as never, options as never) as never;
      });
      try {
        const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
        expect(result.kind).toBe('scanned');
        // The instrumented product surface stayed read-only even though the
        // tree changed under it (FR-023): the change is attributed to the
        // external writer, not to a product request.
        expect(collectFsMutationViolations(fsIo as unknown as Record<string, unknown>)).toEqual([]);
      } finally {
        vi.mocked(fsIo.readFile).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('aborts the attempt when a read exhausts descriptors instead of blaming the file', async () => {
    // The Constitution requires a recoverable environment or resource failure
    // to abort the publication attempt and publish nothing. Folding `EMFILE`
    // into that file's outcome would report the machine running out of
    // descriptors as the user's file being unreadable.
    const root = mkdtempSync(join(tmpdir(), 'inspector-emfile-'));
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root\n');
      const failure = Object.assign(new Error('too many open files'), { code: 'EMFILE' });
      vi.mocked(fsIo.readFile).mockRejectedValueOnce(failure);
      try {
        await expect(runTraversalScan({ root, plans: [AGENTS_PLAN] })).rejects.toThrow(failure);
      } finally {
        vi.mocked(fsIo.readFile).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('reports discovered candidates while it is still enumerating', async () => {
    // `candidateFiles` is "discovered so far" (data-model.md § ScanProgress).
    // Reporting a constant here would publish a counter that never moves until
    // the attempt is over, which is the one moment progress is not for.
    const root = mkdtempSync(join(tmpdir(), 'inspector-progress-'));
    try {
      mkdirSync(join(root, 'a', 'b'), { recursive: true });
      for (const path of ['AGENTS.md', 'a/AGENTS.md', 'a/b/AGENTS.md']) {
        writeFileSync(join(root, path), 'x\n');
      }
      const enumerating: number[] = [];
      await runTraversalScan({
        root,
        plans: [AGENTS_PLAN],
        onProgress: (update) => {
          if (update.phase === 'enumerating') {
            enumerating.push(update.candidateFiles);
          }
        },
      });
      expect(enumerating.length).toBeGreaterThan(1);
      expect(Math.max(...enumerating)).toBeGreaterThan(0);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails the Source when the selected root is a symbolic-link cycle', async () => {
    // A root that cannot be enumerated as a directory is the FR-002
    // `root-unreadable` outcome, whatever errno says so. `ELOOP` reaching the
    // caller as an exception would end the launch with an unexpected failure
    // instead of the actionable Diagnostic.
    const parent = mkdtempSync(join(tmpdir(), 'inspector-eloop-'));
    try {
      const root = join(parent, 'loop');
      try {
        symlinkSync(root, root);
      } catch {
        return;
      }
      expect(await runTraversalScan({ root, plans: [AGENTS_PLAN] })).toEqual({
        kind: 'root-unreadable',
      });
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('scans a root that itself lives under a VCS-internal path', async () => {
    // The exclusion is about what a walk descends into, judged from the walk's
    // own container. Testing the whole absolute path would make a checkout at
    // `…/.git/worktree` — or a fixture directory that happens to sit under
    // one — scan nothing at all.
    const parent = mkdtempSync(join(tmpdir(), 'inspector-vcs-root-'));
    try {
      const root = join(parent, '.git', 'worktree');
      // A nested directory, so the descent check actually runs: the root's own
      // path is not what the walk tests, every directory below it is.
      mkdirSync(join(root, 'packages'), { recursive: true });
      writeFileSync(join(root, 'AGENTS.md'), 'x\n');
      writeFileSync(join(root, 'packages', 'AGENTS.md'), 'x\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      if (result.kind !== 'scanned') {
        throw new Error('expected a scanned outcome');
      }
      expect(result.files.map((file) => file.publicPath)).toEqual([
        'AGENTS.md',
        'packages/AGENTS.md',
      ]);
    } finally {
      rmSync(parent, { recursive: true, force: true });
    }
  });

  it('aborts the attempt when any filesystem call exhausts a resource', async () => {
    // The rule is the same at every call site, not only at the one that reads
    // bytes: `readdir` running out of descriptors is the machine, not the
    // repository, and classifying it as `root-unreadable` would send the user
    // to fix a root that is fine.
    const root = mkdtempSync(join(tmpdir(), 'inspector-resource-'));
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'x\n');
      // The calls this plan actually makes: enumerate, resolve the root, read
      // a candidate. `lstat` belongs to the exact-target probe, which a
      // repository-program walk never reaches.
      for (const call of ['readdir', 'realpath', 'readFile'] as const) {
        const failure = Object.assign(new Error('out of descriptors'), { code: 'EMFILE' });
        vi.mocked(fsIo[call]).mockRejectedValueOnce(failure as never);
        try {
          await expect(runTraversalScan({ root, plans: [AGENTS_PLAN] })).rejects.toThrow(failure);
        } finally {
          vi.mocked(fsIo[call]).mockReset();
        }
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("keeps a permission failure as that file's own outcome", async () => {
    const root = mkdtempSync(join(tmpdir(), 'inspector-eacces-'));
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root\n');
      vi.mocked(fsIo.readFile).mockRejectedValueOnce(
        Object.assign(new Error('permission denied'), { code: 'EACCES' }),
      );
      try {
        const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
        if (result.kind !== 'scanned') {
          throw new Error('expected a scanned outcome');
        }
        expect(result.files[0]?.outcome.kind).toBe('unreadable');
      } finally {
        vi.mocked(fsIo.readFile).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('late results after revocation are discarded (FR-029)', () => {
  it('discards a real scan result without a hard-cancellation claim', async () => {
    const tree = buildTraversalFixtureTree('inspector-late');
    try {
      const { session, coordinator } = bootstrapSession(tree.root);
      const sourceId = session.snapshot().sources[0]!.sourceId;
      const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
      if (admitted.kind !== 'admitted') {
        throw new Error('expected admission');
      }
      // Disable/shutdown/supersession revokes publication authority while
      // the traversal is still running; the late result must be discarded,
      // not committed — and the scan itself is not claimed to be killed.
      coordinator.revokePublicationAuthority(admitted.scanRequestId);
      const result = await runTraversalScan({ root: tree.root, plans: [AGENTS_PLAN] });
      const publication = await assembleScanPublication({
        sourceId,
        root: tree.root,
        rootFailureOwner: 'repository',
        rules: AGENTS_RULES,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      await coordinator.completeScan(admitted.scanRequestId, {
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
        visitedEntries: 0,
        candidateFiles: 0,
        readBytes: publication.readBytes,
      });
      const snapshot = session.snapshot();
      expect(snapshot.repositoryGeneration).toBe(0);
      expect(snapshot.sources[0]!.status).toBe('idle');
    } finally {
      tree.restore();
      rmSync(tree.root, { recursive: true, force: true });
    }
  });
});
