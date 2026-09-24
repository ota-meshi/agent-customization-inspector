// T021: FR-024/FR-028 publication-matrix boundaries — file-confined
// outcomes retain diagnostic-only records in a partial generation,
// recognition parse failures keep the readable source displayed, an
// unreadable root fails the Source attempt with the source-scoped
// Diagnostic and no partial generation, a failure outside any single file
// aborts the attempt with nothing committed, external fixture mutation is
// not a product mutation, and late results after revocation are discarded
// without hard-cancellation claims (FR-002, FR-029, FR-030).
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
  type CompiledStaticSkillRule,
} from '../../../src/server/inspection/rules/registry';
import { authoredSkillNameOf } from '../../../src/server/inspection/rules/skills/invocation-name';
import { runTraversalScan } from '../../../src/server/inspection/traversal';
import { assembleScanPublication } from '../../../src/server/inspection/scan';
import {
  CODEX_REPO_INSTRUCTIONS_RULE,
  CODEX_REPO_SKILL_RULE,
} from '../../../src/shared/registries/codex/rules';
import { CodexCompiledInstructionRule } from '../../../src/server/inspection/rules/instructions/codex';
import { CODEX_RULE_RELATIONS } from '../../../src/shared/registries/codex/relations';
import type { RecognitionParseStatus } from '../../../src/shared/api-types';
import { RecognitionExtraction } from '../../../src/server/inspection/parsers/extraction';
import { ToolRecognition } from '../../../src/server/inspection/recognizers/candidate';
import { DiagnosticRecord } from '../../../src/shared/diagnostics';
import { SessionCoordinator, InspectionSession } from '../../../src/server/session/session';
import { prepareNextRepositoryGeneration } from '../../../src/server/session/scan-generation';
import { RecordingFileOpener } from '../../fixtures/file-opener';

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
function codexSkillRule(plan: TraversalPlan): CompiledStaticSkillRule {
  return {
    rule: CODEX_REPO_SKILL_RULE,
    relations: CODEX_RULE_RELATIONS['codex.repo.skill'],
    tool: 'codex',
    kind: 'skill',
    plan,
    // Stated rather than derived from the relations beside it: a stand-in
    // supplies the identity a candidate carries, and Codex's one surface is
    // that identity's whole answer here.
    recognizingSurfaces: ['codex-local-clients'],
    // Codex's own answer, restated by the stand-in: these suites publish
    // candidates rather than exercise naming, and a skill rule that could not
    // answer its kind's question would not compile (FR-007).
    invocationNameOf: (sourceRelativePath, declared) =>
      authoredSkillNameOf(sourceRelativePath, declared),
  };
}

const AGENTS_RULES: readonly CompiledStaticSkillRule[] = [codexSkillRule(AGENTS_PLAN)];

// The shipped Codex instruction rule, compiled as itself: the stand-in
// recognitions below are of the `instructions` kind, and an instruction
// recognition's range is answered by the rule that admitted it, so the
// admission has to be a rule that can answer. Its own plan is irrelevant here —
// the traversal runs `AGENTS_RULES` above.
const INSTRUCTION_ADMISSION_RULE = new CodexCompiledInstructionRule(CODEX_REPO_INSTRUCTIONS_RULE);

// A recognizer stand-in for the FR-028 parse-failure arm. The shipped Codex
// recognizer reaches `failed` only through a malformed `SKILL.md`, so the
// matrix's own behavior — which is about the publication outcome and not about
// any one vendor's extractor — is driven through the same dispatch seam the
// production recognizers are injected on.
function fakeRecognition(
  sourceRelativePath: string,
  tool: ToolRecognition['tool'],
  parseStatus: RecognitionParseStatus,
): ToolRecognition {
  // A real record rather than a literal: the factory owns construction, and
  // the stand-in differs only in what it recognized. The wanted parse status
  // is driven through the same extraction seam production runs — a throwing
  // extractor is `failed`, an extractor with nothing to return is `parsed`,
  // none is `not-attempted` — because the status is the extraction's own
  // fact, not a field to set. The kind is the one the fixture's `AGENTS.md`
  // actually is; a failed recognition publishes no metadata at all, and this
  // stand-in extracts nothing in the first place (FR-028). It still carries an
  // admission, because a recognition exists only where a rule admitted the
  // file, and an instruction recognition asks that rule what the file
  // governs.
  // Typed as the factory's own extraction parameter: the Markdown
  // presentation class is the recognizer module's private, so the stand-in
  // names the type through the signature it satisfies.
  const extraction: Parameters<typeof ToolRecognition.recognizeInstructions>[2] =
    parseStatus === 'failed'
      ? RecognitionExtraction.run('', () => {
          throw new Error('fixture extraction failure');
        })
      : parseStatus === 'parsed'
        ? RecognitionExtraction.run('', () => undefined)
        : RecognitionExtraction.run('', null);
  return ToolRecognition.recognizeInstructions(sourceRelativePath, tool, extraction, [
    { compiled: INSTRUCTION_ADMISSION_RULE, origin: { planIndex: 0, selectorIndex: 0 } },
  ]);
}

function bootstrapSession(root: string) {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
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
        scope: 'repository',
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
        scope: 'repository',
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
        scope: 'repository',
        rules,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.files).toHaveLength(2);
      expect(new Set(publication.files.map((file) => file.sourceRelativePath)).size).toBe(2);
      // Each spelling carries its own authored bytes: the raw entry name is
      // the exact read operand, so a walk that normalized an NFD name to NFC
      // would read the sibling's content instead of its own — an identity
      // swap the distinct fixture bodies make visible (FR-024).
      for (const file of publication.files) {
        const isDecomposed = file.sourceRelativePath !== file.sourceRelativePath.normalize('NFC');
        expect('sourceText' in file ? file.sourceText : null, file.sourceRelativePath).toBe(
          isDecomposed ? 'nfd spelling\n' : 'nfc spelling\n',
        );
      }
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
        scope: 'repository',
        rules: AGENTS_RULES,
        result,
        recognize: async ({ matchedPath }) => ({
          recognitions:
            matchedPath === 'AGENTS.md'
              ? [
                  fakeRecognition(matchedPath, 'codex', 'failed'),
                  fakeRecognition(matchedPath, 'copilot', 'parsed'),
                ]
              : [],
          // This stand-in is an instructions recognizer, and an instructions
          // file is one file rather than a directory, so it has no census.
          directories: [],
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
      // Which recognitions belong to the file is what their own path says.
      expect(
        publication.recognitions
          .filter((recognition) => recognition.sourceRelativePath === affected.sourceRelativePath)
          .map((recognition) => recognition.parseStatus),
      ).toEqual(['failed', 'parsed']);
      expect(affected.diagnosticIds).toHaveLength(1);
      const diagnostic = publication.diagnostics.find(
        (entry) => entry.diagnosticId === affected.diagnosticIds[0],
      );
      expect(diagnostic).toMatchObject({
        code: 'recognition-parse-failed',
        sourceId: 'src-1',
        sourceRelativePath: 'AGENTS.md',
      });
      // The failure is the extraction's (FR-028), so the failed recognition
      // carries the reference too — it is what an inventory definition
      // republishes — while the parsed one carries none.
      const failed = publication.recognitions.find(
        (recognition) => recognition.parseStatus === 'failed',
      );
      expect(failed?.diagnosticIds).toEqual(affected.diagnosticIds);
      const parsed = publication.recognitions.find(
        (recognition) => recognition.parseStatus === 'parsed',
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

  it("shares one extraction-failure record among a kind's failed recognitions", async () => {
    const root = createFixtureRoot('inspector-parsefail-multi');
    try {
      writeFileSync(join(root, 'AGENTS.md'), 'root agents\n');
      const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root: root,
        rootFailureOwner: 'repository',
        scope: 'repository',
        rules: AGENTS_RULES,
        result,
        recognize: async ({ matchedPath }) => ({
          recognitions: [
            fakeRecognition(matchedPath, 'codex', 'failed'),
            fakeRecognition(matchedPath, 'copilot', 'failed'),
          ],
          directories: [],
        }),
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // One extraction per kind means one record (FR-028): however many tools
      // recognize the kind, the parse ran once, so both failed recognitions
      // reference the same published diagnostic and the file lists it once.
      const parseFailures = publication.diagnostics.filter(
        (entry) => entry.code === 'recognition-parse-failed',
      );
      expect(parseFailures).toHaveLength(1);
      const affected = publication.files.find((file) => file.sourceRelativePath === 'AGENTS.md');
      if (affected?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      expect(affected.diagnosticIds).toEqual([parseFailures[0]!.diagnosticId]);
      for (const recognition of publication.recognitions) {
        expect(recognition.diagnosticIds).toEqual([parseFailures[0]!.diagnosticId]);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('commits the readable source with only derived data omitted, the pair coherent', () => {
    const { session } = bootstrapSession('/fixture-root');
    const parseDiagnostic = new DiagnosticRecord({
      code: 'recognition-parse-failed',
      lifecycleOwnerKey: null,
      sourceId: 'src-1',
      sourceRelativePath: 'AGENTS.md',
    }).serialize();
    const next = prepareNextRepositoryGeneration(session.committedRepositoryGeneration, {
      scannedSourceIds: ['src-1'],
      scanRequestId: 'scan-1',
      startedAt: '2026-07-22T00:00:00.000Z',
      finishedAt: '2026-07-22T00:00:01.000Z',
      outcome: 'partial',
      censusEscapedDirectories: [],
      recognitions: [],
      files: [
        {
          sourceId: 'src-1',
          sourceRelativePath: 'AGENTS.md',
          encoding: 'utf-8',
          hadLeadingBom: false,
          sourceText: '# complete authored source\n',
          sizeBytes: 27,
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
    // The published pair keeps the diagnostic pointing at the committed file.
    expect(next.diagnostics[0]!.sourceRelativePath).toBe(file.sourceRelativePath);
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
      scope: 'repository',
      rules: AGENTS_RULES,
      result,
    });
    if (publication.kind !== 'source-failed') {
      throw new Error('expected a source failure');
    }
    expect(publication.diagnostic).toMatchObject({
      code: 'root-unreadable',
      sourceId: 'src-1',
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
      scope: 'repository',
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
  it('completes the walk when the harness removes and renames directories under it', async () => {
    // The other half of the same class: a tree that changes shape, not just
    // content, while the walk is in it. A directory that vanishes between
    // enumeration and descent is an ordinary race on a live checkout — a build
    // finishing, a branch switch — and the scan has to publish what it reached
    // rather than fail the Source or report a phantom entry (T1054, FR-023).
    //
    // The reshaping fires from the `readdir` seam, not from a read: the walk
    // enumerates the whole tree before it classifies anything, so a `readFile`
    // hook would change the tree after enumeration was over and would be a
    // read-phase race wearing this class's name. The names sort so the trigger
    // is not the last directory listed, which is what leaves the walk still
    // enumerating when the tree moves.
    const root = createFixtureRoot('inspector-reshaped');
    try {
      for (const directory of ['a-stays', 'b-vanishes', 'c-renamed']) {
        mkdirSync(join(root, directory));
        writeFileSync(join(root, directory, 'AGENTS.md'), `${directory}\n`);
      }
      writeFileSync(join(root, 'AGENTS.md'), 'root\n');
      const trigger = join(root, 'b-vanishes');
      const actual = await vi.importActual<typeof import('node:fs/promises')>('node:fs/promises');
      vi.mocked(fsIo.readdir).mockImplementation((async (path: never, options: never) => {
        const entries = await actual.readdir(path, options);
        if (String(path) === trigger) {
          // Enumerated, then gone: the harness reshapes the tree the walk is
          // standing in — one directory removed after its own listing, one
          // renamed before the walk reaches it, one created where the walk has
          // already been.
          rmSync(join(root, 'b-vanishes'), { recursive: true, force: true });
          renameSync(join(root, 'c-renamed'), join(root, 'c-renamed-away'));
          mkdirSync(join(root, 'a-appeared'));
          writeFileSync(join(root, 'a-appeared', 'AGENTS.md'), 'appeared\n');
        }
        return entries;
      }) as never);
      try {
        const result = await runTraversalScan({ root, plans: [AGENTS_PLAN] });
        // The attempt publishes rather than failing the Source, and the product
        // issued no write of its own while the tree moved under it.
        expect(result.kind).toBe('scanned');
        expect(collectFsMutationViolations(fsIo as unknown as Record<string, unknown>)).toEqual([]);
        const files = result.kind === 'scanned' ? result.files : [];
        // An entry enumerated before its directory went away is published as
        // its own file-confined outcome, never as a successful read of a file
        // that is no longer there (FR-028).
        const vanished = files.find((file) => file.publicPath === 'b-vanishes/AGENTS.md');
        expect(vanished, 'the removed directory published no entry at all').toBeDefined();
        expect(vanished?.outcome.kind, 'the removed entry published as readable').not.toBe(
          'readable',
        );
        // A directory renamed before the walk reached it is absent rather than
        // a phantom, and one created behind the walk is not invented.
        const published = files.map((file) => file.publicPath);
        expect(published).not.toContain('c-renamed/AGENTS.md');
        expect(published).not.toContain('a-appeared/AGENTS.md');
        // The directories that stayed are read normally, so the walk finished
        // rather than stopping where the tree moved.
        expect(
          files.filter((file) => file.outcome.kind === 'readable').map((file) => file.publicPath),
        ).toContain('a-stays/AGENTS.md');
      } finally {
        vi.mocked(fsIo.readdir).mockReset();
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('a resource failure aborts the attempt rather than blaming a file', () => {
  // The Constitution requires a recoverable environment or resource failure to
  // abort the publication attempt and publish nothing, and the rule holds at
  // every call site rather than only at the one that reads bytes. Folding
  // `EMFILE` into a file's own outcome would report the machine running out of
  // descriptors as the user's file being unreadable, and classifying it as
  // `root-unreadable` would send them to fix a root that is fine.
  it('aborts the attempt at the enumerate, resolve, and read calls a walk makes', async () => {
    // The three calls below are the ones a repository-program walk makes:
    // enumerate a directory, resolve the root, read a candidate.
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
});

describe('a permission failure is confined to the file it names', () => {
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

describe('scan progress counters', () => {
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

  it('never publishes a counter lower than the one before it', async () => {
    // The counters are monotonically non-decreasing within one attempt
    // (data-model.md § ScanProgress). Reading starts after enumeration
    // finished, so a reading-phase figure counted from what has been read so
    // far would step back from what enumeration had already published — a
    // progress line going 3 → 1 in front of the reader.
    const root = mkdtempSync(join(tmpdir(), 'inspector-monotonic-'));
    try {
      mkdirSync(join(root, 'a', 'b'), { recursive: true });
      for (const path of ['AGENTS.md', 'a/AGENTS.md', 'a/b/AGENTS.md']) {
        writeFileSync(join(root, path), 'x\n');
      }
      const updates: { phase: string; candidateFiles: number; readBytes: number }[] = [];
      await runTraversalScan({
        root,
        plans: [AGENTS_PLAN],
        onProgress: (update) => {
          updates.push({
            phase: update.phase,
            candidateFiles: update.candidateFiles,
            readBytes: update.readBytes,
          });
        },
      });
      // Both phases reported, so the boundary this guards is actually crossed.
      expect(updates.some((update) => update.phase === 'enumerating')).toBe(true);
      expect(updates.some((update) => update.phase === 'reading')).toBe(true);
      for (let index = 1; index < updates.length; index += 1) {
        const previous = updates[index - 1]!;
        const current = updates[index]!;
        expect(
          current.candidateFiles,
          `candidateFiles fell at update ${index} (${previous.phase} → ${current.phase})`,
        ).toBeGreaterThanOrEqual(previous.candidateFiles);
        expect(current.readBytes).toBeGreaterThanOrEqual(previous.readBytes);
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('counts and reports a target only the selection strategy reached', async () => {
    // An exact-selection plan never walks: the candidate is reached by naming
    // it, so nothing adds it to the walk's discoveries. Counting only those
    // would publish `candidateFiles: 0` for an attempt that read a file, and
    // reporting only from the walk's loop would publish no reading update at
    // all — the progress line would stay empty while work happened.
    const root = mkdtempSync(join(tmpdir(), 'inspector-selection-'));
    try {
      writeFileSync(join(root, 'AGENTS.override.md'), 'override\n');
      writeFileSync(join(root, 'AGENTS.md'), 'fallback\n');
      const updates: { phase: string; candidateFiles: number; readBytes: number }[] = [];
      const result = await runTraversalScan({
        root,
        plans: [
          TraversalPlan.fromPrograms(
            { kind: 'global', member: 'codex' },
            [['AGENTS.override.md'], ['AGENTS.md']],
            'codex-global-first-non-empty',
          ),
        ],
        onProgress: (update) => {
          updates.push({
            phase: update.phase,
            candidateFiles: update.candidateFiles,
            readBytes: update.readBytes,
          });
        },
      });
      if (result.kind !== 'scanned') {
        throw new Error('expected a scanned result');
      }
      // The non-empty override wins, and it is the one file the attempt read.
      expect(result.files.map((file) => file.publicPath)).toEqual(['AGENTS.override.md']);
      expect(result.candidateFiles).toBe(1);

      const reading = updates.filter((update) => update.phase === 'reading');
      expect(reading.length).toBeGreaterThan(0);
      expect(Math.max(...reading.map((update) => update.candidateFiles))).toBe(1);
      expect(Math.max(...reading.map((update) => update.readBytes))).toBeGreaterThan(0);
      for (let index = 1; index < updates.length; index += 1) {
        expect(updates[index]!.candidateFiles).toBeGreaterThanOrEqual(
          updates[index - 1]!.candidateFiles,
        );
      }
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('root handling', () => {
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
        scope: 'repository',
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
        censusEscapedDirectories: publication.censusEscapedDirectories,
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

describe('entries no selector names are never classified (FR-018, FR-024)', () => {
  it('walks past a self-referential link beside an admitted file', async () => {
    // A neighbour the plan does not name decides nothing, so its type is not
    // resolved: without that, the `stat` on `ignored.txt → ignored.txt` threw
    // `ELOOP`, which is not file-confined and aborted the whole attempt — a
    // reader's one broken link beside their hook files failed their entire
    // scan. The walk alone is the subject: a kind with a companion census
    // lists such a neighbour and reports its own read failure per file, but an
    // enumerated directory of a census-free kind — a hook directory — has only
    // this walk between the link and the whole attempt.
    const root = mkdtempSync(join(tmpdir(), 'inspector-self-link-'));
    try {
      mkdirSync(join(root, 'siblings'), { recursive: true });
      writeFileSync(join(root, 'siblings', 'first.md'), 'first\n');
      try {
        symlinkSync('ignored.txt', join(root, 'siblings', 'ignored.txt'));
      } catch {
        // A filesystem without symbolic links cannot build the case.
        return;
      }
      const plan = TraversalPlan.fromPrograms({ kind: 'repository' }, [['siblings', /\.md$/u]]);
      const result = await runTraversalScan({ root, plans: [plan] });
      if (result.kind !== 'scanned') {
        throw new Error('expected a completed traversal');
      }
      expect(
        result.files.map((candidate) => [candidate.publicPath, candidate.outcome.kind]),
      ).toEqual([['siblings/first.md', 'readable']]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("the admitted root string stays the operating system's to resolve (FR-024)", () => {
  it('reads children under a root spelled through a link and `..`', async () => {
    // `join` collapses `..` lexically while the operating system resolves it
    // through the link, so for a root spelled `<base>/lnk/../real` the two
    // disagree ({@link pathUnderRoot}). The walk must read the directory
    // admission checked — the OS-resolved one — not the lexical collapse.
    const base = mkdtempSync(join(tmpdir(), 'inspector-link-root-'));
    try {
      mkdirSync(join(base, 'deep', 'inner'), { recursive: true });
      mkdirSync(join(base, 'deep', 'real', 'siblings'), { recursive: true });
      writeFileSync(join(base, 'deep', 'real', 'siblings', 'first.md'), 'first\n');
      try {
        symlinkSync(join(base, 'deep', 'inner'), join(base, 'lnk'));
      } catch {
        return;
      }
      // OS resolution: lnk → deep/inner, so lnk/.. is deep and the root is
      // deep/real. The lexical collapse would be <base>/real, which does not
      // exist.
      const root = `${base}/lnk/../real`;
      // Which of the two the running platform performs is what this case is
      // about, so it is measured rather than assumed: Windows applies `..`
      // without following the link, landing on the lexical <base>/real that
      // was just described as absent. There the disagreement under test does
      // not exist and there is nothing to assert.
      if (!existsSync(root)) {
        return;
      }
      const rules = [
        codexSkillRule(
          TraversalPlan.fromPrograms({ kind: 'repository' }, [['siblings', /\.md$/u]]),
        ),
      ];
      const result = await runTraversalScan({ root, plans: rules.map((rule) => rule.plan) });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root,
        rootFailureOwner: 'repository',
        scope: 'repository',
        rules,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      expect(publication.files.map((file) => file.sourceRelativePath)).toEqual([
        'siblings/first.md',
      ]);
      const [file] = publication.files;
      if (file?.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      expect(file.sourceText).toBe('first\n');
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});

describe('a fixed-prefix scan never lists the root itself (Global least privilege)', () => {
  it('walks and censuses a discovered skill without a root readdir', async () => {
    // A Global member's plans probe exact targets and walk fixed subtrees, so
    // the consented home itself is never enumerated
    // (contracts/inspection-path-allowlist.md § Global least privilege). The
    // census's spelling verification re-lists every ancestor of a census
    // root — the Source root included — so it runs for Repository scans
    // alone, whose walk enumerates the root anyway; a Global scan must not
    // bring the root listing back through it.
    const root = mkdtempSync(join(tmpdir(), 'inspector-no-root-list-'));
    try {
      mkdirSync(join(root, 'skills', 'demo'), { recursive: true });
      writeFileSync(join(root, 'skills', 'demo', 'SKILL.md'), '---\nname: demo\n---\nbody\n');
      writeFileSync(join(root, 'skills', 'demo', 'notes.md'), 'companion\n');
      // A neighbour at the root: its name must never be read out of a listing.
      writeFileSync(join(root, 'credentials.txt'), 'secret\n');
      const rules = [
        codexSkillRule(
          TraversalPlan.fromPrograms({ kind: 'global', member: 'copilot' }, [
            ['skills', /(?:)/u, 'SKILL.md'],
          ]),
        ),
      ];
      vi.mocked(fsIo.readdir).mockClear();
      const result = await runTraversalScan({ root, plans: rules.map((rule) => rule.plan) });
      const publication = await assembleScanPublication({
        sourceId: 'src-1',
        root,
        rootFailureOwner: 'global:copilot',
        scope: 'global',
        rules,
        result,
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // The census still ran: the companion beside the entry point published.
      expect(publication.files.map((file) => file.sourceRelativePath)).toEqual([
        'skills/demo/SKILL.md',
        'skills/demo/notes.md',
      ]);
      const listed = vi.mocked(fsIo.readdir).mock.calls.map(([path]) => String(path));
      expect(listed).not.toContain(root);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
