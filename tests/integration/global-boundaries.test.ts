// T947: what the Codex member of the fixed-three transaction touches, and
// what it must not (FR-013 through FR-018, FR-023, QR-003).
//
// This is the suite that runs against real directories, which is why the
// exhaustive first-non-empty traces live here rather than in the unit file
// beside the host: `tests/unit/host/global-consent.test.ts` refuses every
// `node:fs` export for the whole file — that refusal is how it proves the host
// itself touches nothing — so a trace over real bytes cannot run there. The
// two halves together are T944's statement: the host issues no filesystem
// call, and the branch the inspection module runs selects exactly one file.
//
// The boundary claims asserted here:
//
//  - The consented root is a filesystem operand exactly as retained. Nothing
//    normalizes it, and the escaped display value is never used as a path.
//  - Only the contracted member files are read. Every neighbour in each
//    home — credentials, memories, sessions, managed state — is left
//    untouched, which is what the exclusion rules state and this measures.
//  - The member root itself is never enumerated. Admission is `stat`/`access`
//    on the exact root, exact targets are probed by name, and the walked
//    selectors enumerate only their fixed subtrees, so consenting to the
//    contracted files does not consent to a listing of the home.
//  - Repository state is preserved: a Global batch commits its own sequence
//    and leaves the Repository generation, its Sources, and its files alone.
import { chmodSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import { access, constants } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';

import { admitGlobalRoot } from '../../src/server/inspection/global-admission';
import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import type { CompiledStaticCandidateRule } from '../../src/server/inspection/rules/registry';
import {
  CODEX_AGENTS_HOME_RULES,
  CODEX_GLOBAL_RULES,
} from '../../src/server/inspection/rules/codex';
import {
  COPILOT_AGENTS_HOME_RULES,
  COPILOT_GLOBAL_RULES,
} from '../../src/server/inspection/rules/copilot';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { isReadableFile } from '../../src/shared/entities';
import { RecordingFileOpener } from '../fixtures/file-opener';
import {
  CODEX_INSTRUCTION_CASES,
  buildCodexInstructionHome,
  buildGlobalHomeFixture,
  buildUnreadableGlobalHome,
  observeTree,
  type CodexInstructionCaseName,
} from '../fixtures/global-homes/build-fixtures';

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

/**
 * The repository `AGENTS.md` of the same-path case. The home's own selection
 * says something else, so which text a detail carries is what says which
 * Source's file was resolved.
 */
const REPOSITORY_AGENTS_TEXT = '# instructions\n\nRepository, not the home.\n';

/**
 * Scans the session's own repository root and commits the result as its
 * startup generation, so a Global commit has a Repository generation to sit
 * beside.
 */
async function commitRepositoryScan(
  session: InspectionSession,
  coordinator: SessionCoordinator,
): Promise<void> {
  const admitted = coordinator.admitScan(session.repositorySourceId, {
    kind: 'startup',
    operationId: null,
  });
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId: session.repositorySourceId,
    root: session.selectedRepositoryRoot,
    rootFailureOwner: 'repository',
    scope: 'repository',
  });
  if (publication.kind !== 'publishable') {
    throw new Error('expected a publishable Repository outcome');
  }
  await coordinator.completeScan(admitted.scanRequestId, {
    files: publication.files,
    recognitions: publication.recognitions,
    diagnostics: publication.diagnostics,
    outcome: publication.outcome,
    visitedEntries: publication.visitedEntries,
    candidateFiles: publication.candidateFiles,
    readBytes: publication.readBytes,
  });
}

/**
 * Registers and settles a one-member Codex enable over `home`, scans it with
 * the Global catalog, and commits the batch — the production sequence the
 * coordinator owns, minus the host's own environment capture.
 */
async function commitCodexGlobalScan(
  session: InspectionSession,
  coordinator: SessionCoordinator,
  home: string,
): Promise<void> {
  const registered = coordinator.registerGlobalEnable('preview-id', 'initial-enable');
  if (registered.kind !== 'admitted') {
    throw new Error('expected registration');
  }
  const result = coordinator.settleGlobalEnable(registered.operationId, 'preview-id', [
    {
      member: {
        member: 'codex',
        origin: 'environment',
        lexicalRoot: home,
        inputState: 'eligible',
        port: null,
      },
      outcome: { kind: 'admitted', root: home },
    },
  ]);
  const control = session.globalConsent!.controls.get('codex')!;
  const publication = await runSourceScan({
    sourceId: control.sourceId!,
    root: control.root!,
    rootFailureOwner: 'global:codex',
    scope: 'global',
    rules: CODEX_GLOBAL_RULES,
  });
  if (publication.kind !== 'publishable') {
    throw new Error('expected a publishable Global outcome');
  }
  coordinator.completeGlobalBatch(result.scanRequestId!, [
    {
      member: 'codex',
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
    },
  ]);
}

/**
 * Creates one symbolic link, answering whether the platform allowed it. A case
 * that needs a link proves nothing where links are refused, so it returns
 * instead of failing (the repository fixtures' own all-or-nothing rule).
 */
function tryLink(linkPath: string, targetPath: string): boolean {
  try {
    symlinkSync(targetPath, linkPath);
    return true;
  } catch {
    return false;
  }
}

/** Scans one Codex home with the Global catalog and returns the published paths. */
async function scanCodexHome(home: string): Promise<{
  readonly kind: string;
  readonly paths: readonly string[];
  readonly diagnosticCodes: readonly string[];
  readonly readBytes: number;
}> {
  const publication = await runSourceScan({
    sourceId: 'global-codex',
    root: home,
    rootFailureOwner: 'global:codex',
    scope: 'global',
    rules: CODEX_GLOBAL_RULES,
  });
  if (publication.kind !== 'publishable') {
    return { kind: publication.kind, paths: [], diagnosticCodes: [], readBytes: 0 };
  }
  return {
    kind: publication.kind,
    paths: publication.files.map((file) => file.sourceRelativePath).toSorted(),
    diagnosticCodes: publication.diagnostics.map((diagnostic) => diagnostic.code).toSorted(),
    readBytes: publication.readBytes,
  };
}

/** Scans one Claude home with the Global catalog and returns the published paths. */
async function scanClaudeHome(home: string): Promise<{
  readonly kind: string;
  readonly paths: readonly string[];
  readonly diagnosticCodes: readonly string[];
  readonly ranges: readonly (string | null)[];
}> {
  const publication = await runSourceScan({
    sourceId: 'global-claude',
    root: home,
    rootFailureOwner: 'global:claude',
    scope: 'global',
    rules: CLAUDE_GLOBAL_RULES,
  });
  if (publication.kind !== 'publishable') {
    return { kind: publication.kind, paths: [], diagnosticCodes: [], ranges: [] };
  }
  return {
    kind: publication.kind,
    paths: publication.files.map((file) => file.sourceRelativePath).toSorted(),
    diagnosticCodes: publication.diagnostics.map((diagnostic) => diagnostic.code).toSorted(),
    // The range an admitted Global instruction file governs, which the
    // recognition carries: a Claude file derives it from its own path. Narrowed
    // by the kind rather than by asking whether the field is there, so the
    // walk answers for instruction recognitions and nothing else.
    ranges: publication.recognitions.flatMap((recognition) =>
      recognition.details.kind === 'instructions' ? [recognition.details.applicabilityRange] : [],
    ),
  };
}

describe('the Codex Global instruction branch (T947)', () => {
  /**
   * Every override outcome against a non-empty fallback, and what the branch
   * publishes. The fallback is held constant so each row is about the override
   * alone; the pair cases below vary both.
   */
  const OVERRIDE_EXPECTATIONS: Readonly<
    Record<CodexInstructionCaseName, { readonly paths: readonly string[] }>
  > = {
    // No override file: the branch advances and publishes the fallback.
    absent: { paths: ['AGENTS.md'] },
    // Read successfully and empty: advances.
    empty: { paths: ['AGENTS.md'] },
    // A BOM and nothing else is empty after the BOM: advances.
    'bom-only': { paths: ['AGENTS.md'] },
    // Whitespace trims to nothing: advances.
    'whitespace-only': { paths: ['AGENTS.md'] },
    // Ordinary text short-circuits: the fallback is never operated on.
    'non-empty': { paths: ['AGENTS.override.md'] },
    // A retained U+FFFD is non-whitespace, so replaced text is non-empty.
    'replacement-decoded': { paths: ['AGENTS.override.md'] },
    // Binary ends the branch with its own Diagnostic and no fallback.
    binary: { paths: ['AGENTS.override.md'] },
    // Unreadable ends the branch the same way.
    unreadable: { paths: ['AGENTS.override.md'] },
  };

  it.each(Object.keys(OVERRIDE_EXPECTATIONS) as CodexInstructionCaseName[])(
    'publishes the right single file when the override is %s',
    async (override) => {
      const built = buildCodexInstructionHome({ override, fallback: 'non-empty' });
      cleanups.push(() => rmSync(built.home, { recursive: true, force: true }));
      if (!built.materialized) {
        // The `unreadable` case needs a symbolic link; a platform that grants
        // none cannot show it, and skipping beats asserting a case the tree
        // does not contain.
        return;
      }
      const scanned = await scanCodexHome(built.home);
      // At most one instruction file, always: the vendor selects one per
      // location and this rule publishes that one rather than admitting both
      // and projecting a winner.
      expect(scanned.paths, override).toEqual(OVERRIDE_EXPECTATIONS[override].paths);
      expect(scanned.paths.length).toBeLessThanOrEqual(1);
    },
  );

  it('ends the branch with the override’s own diagnostic and no fallback', async () => {
    for (const override of ['binary', 'unreadable'] as const) {
      const built = buildCodexInstructionHome({ override, fallback: 'non-empty' });
      cleanups.push(() => rmSync(built.home, { recursive: true, force: true }));
      if (!built.materialized) {
        continue;
      }
      const scanned = await scanCodexHome(built.home);
      // The fallback exists and is non-empty, and is still not published: an
      // override this product could not read is not an absent override, so
      // advancing would publish a file the vendor would not have selected.
      expect(scanned.paths, override).toEqual(['AGENTS.override.md']);
      expect(scanned.diagnosticCodes, override).toEqual([
        override === 'binary' ? 'file-content-binary' : 'file-unreadable',
      ]);
    }
  });

  it('publishes nothing when neither target has content', async () => {
    const built = buildCodexInstructionHome({ override: 'empty', fallback: 'empty' });
    cleanups.push(() => rmSync(built.home, { recursive: true, force: true }));
    // A readable empty fallback publishes no instruction file: the home holds
    // the two names and neither is something a session would select.
    expect((await scanCodexHome(built.home)).paths).toEqual([]);
  });

  it('counts one read per file even though two targets were probed', async () => {
    const built = buildCodexInstructionHome({ override: 'empty', fallback: 'non-empty' });
    cleanups.push(() => rmSync(built.home, { recursive: true, force: true }));
    const scanned = await scanCodexHome(built.home);
    // Both targets were read — the empty override to learn it was empty, the
    // fallback because it is the selection — and each contributed its own
    // bytes exactly once (contracts/inspection-path-allowlist.md § Common
    // conformance requirements).
    expect(scanned.paths).toEqual(['AGENTS.md']);
    expect(scanned.readBytes).toBe('# instructions\n\nDo the thing.\n'.length);
  });

  it('names every case the fixture catalog holds, so none goes unexercised', () => {
    // The catalog and the expectation table are the same eight names: a case
    // added to the fixture without a stated outcome fails here rather than
    // being silently untested.
    expect(Object.keys(OVERRIDE_EXPECTATIONS).toSorted()).toEqual(
      Object.keys(CODEX_INSTRUCTION_CASES).toSorted(),
    );
  });
});

describe('what a consented Codex scan touches (T947)', () => {
  it('reads exactly the contracted member files and leaves every neighbour untouched', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const before = observeTree(homes.homes.codex);
    expect(before.size).toBeGreaterThan(5);

    const scanned = await scanCodexHome(homes.homes.codex);

    // The widened member set (FR-017): the non-empty override — never the
    // fallback beside it — the config trio's one candidate, the standalone
    // hook file, the personal agent, the rules file, and the deprecated
    // prompt.
    expect(scanned.paths).toEqual(homes.expectedCandidatePaths.codex);
    // Nothing in the home changed. The credential file, the generated
    // memories, the installed plugin copy, and the session state are
    // all still exactly as the harness wrote them (FR-023, FR-018).
    const after = observeTree(homes.homes.codex);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  it('admits a readable directory and refuses everything else as that tool’s own failure', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    expect(await admitGlobalRoot(homes.homes.codex)).toEqual({ kind: 'admitted' });

    // A path that does not exist, and one that is a file rather than a
    // directory: both are this tool's `root-unreadable` rejection, which the
    // other tools' admissions are unaffected by (FR-014).
    expect(await admitGlobalRoot(join(homes.base, 'no-such-home'))).toEqual({
      kind: 'rejected',
      reason: 'root-unreadable',
    });
    expect(await admitGlobalRoot(join(homes.homes.codex, 'AGENTS.md'))).toEqual({
      kind: 'rejected',
      reason: 'root-unreadable',
    });

    const unreadable = buildUnreadableGlobalHome();
    cleanups.push(() => {
      // The mode has to go back before the tree can be removed; the fixture's
      // own guidance says so, and a `0o000` directory would fail the cleanup
      // rather than the test.
      chmodSync(unreadable.home, 0o700);
      rmSync(unreadable.home, { recursive: true, force: true });
    });
    if (unreadable.unreadable) {
      // A directory this process may not read is refused, so it creates no
      // Source at all — which is what FR-013's closed model says an unreadable
      // root does. `access` answers that without listing anything: admission
      // still never enumerates a Global root (FR-016 through FR-018).
      expect(await admitGlobalRoot(unreadable.home)).toEqual({
        kind: 'rejected',
        reason: 'root-unreadable',
      });
    }
  });

  it('refuses a directory whose mode permits an exact read but not a listing', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => {
      chmodSync(homes.homes.codex, 0o700);
      rmSync(homes.base, { recursive: true, force: true });
    });
    // Search permission alone is all the two named targets need, so this root
    // is readable for exactly what consent covers — and is refused anyway. The
    // contract's unit is a readable directory, and refusing one the product
    // could have partly read is the safe direction.
    chmodSync(homes.homes.codex, 0o111);
    let searchOnly = false;
    try {
      await access(homes.homes.codex, constants.R_OK);
    } catch {
      searchOnly = true;
    }
    if (searchOnly) {
      expect(await admitGlobalRoot(homes.homes.codex)).toEqual({
        kind: 'rejected',
        reason: 'root-unreadable',
      });
    }
  });

  it('fails only the member whose admitted root is gone by the time it is scanned', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    expect(await admitGlobalRoot(homes.homes.codex)).toEqual({ kind: 'admitted' });

    // Removed between admission and the scan. This is the one way a Global
    // scan reaches the root-failure branch at all: `stat` of the root is the
    // scan's own first step, and a root that is no longer there fails it
    // without any enumeration (FR-002).
    rmSync(homes.homes.codex, { recursive: true, force: true });
    expect((await scanCodexHome(homes.homes.codex)).kind).toBe('source-failed');
  });
});

describe('the Claude Global instruction file (T963, T964)', () => {
  it('reads exactly the contracted member files and leaves every neighbour untouched', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const before = observeTree(homes.homes.claude);
    // A realistic home: the admitted member files, an installed plugin's own
    // tree, the agent and automatic memories, the terminal-UI preferences,
    // and the session history.
    expect(before.size).toBeGreaterThan(10);

    const scanned = await scanClaudeHome(homes.homes.claude);

    // The widened member set (FR-016): the instruction file, the flat rules,
    // the personal skill, the namespaced command, both agents, the settings
    // document, and the output style. `CLAUDE.local.md` sits beside them and
    // is admitted by nothing — the cited table lists local instructions at
    // the project scope alone — and the reserved `skills/synced/` tree and
    // the nested rules subdirectory stay outside their selectors.
    expect(scanned.kind).toBe('publishable');
    expect(scanned.paths).toEqual(homes.expectedCandidatePaths.claude);
    expect(scanned.diagnosticCodes).toEqual([]);
    // What the one instruction file governs is `**`: a user instruction file
    // is not scoped to a directory of the home, and the unit derives that
    // from the path.
    expect(scanned.ranges).toEqual(['**']);

    // Nothing in the home changed, and nothing beside the admitted files was
    // opened for reading (FR-018, FR-023).
    const after = observeTree(homes.homes.claude);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  it('names every neighbour the fixture writes, so none goes unasserted', () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    // The home's own inventory of near misses is what the case above measures
    // "untouched" over, so a neighbour written without being listed would be
    // one this suite never notices (tests/fixtures/global-homes/README.md).
    const written = [...observeTree(homes.homes.claude).keys()].filter((path) => path !== '.');
    for (const nearMiss of homes.nearMissPaths.claude) {
      expect(written, nearMiss).toContain(nearMiss);
    }
    expect(written).toContain('CLAUDE.md');
  });

  it('publishes nothing when the home holds no admitted file', async () => {
    const home = mkdtempSync(join(tmpdir(), 'aci-claude-empty-'));
    cleanups.push(() => rmSync(home, { recursive: true, force: true }));
    // A directory a reader has but never put a customization file in: the
    // member is publishable with no file rather than a failure, because an
    // absent candidate is an absence rather than a read outcome. The one
    // neighbour written is a path no selector names.
    writeFileSync(join(home, 'history.jsonl'), '{}\n', 'utf8');
    const scanned = await scanClaudeHome(home);
    expect(scanned).toEqual({
      kind: 'publishable',
      paths: [],
      diagnosticCodes: [],
      ranges: [],
    });
  });

  it('keeps a file-confined failure inside the member as that file’s diagnostic', async () => {
    const home = mkdtempSync(join(tmpdir(), 'aci-claude-binary-'));
    cleanups.push(() => rmSync(home, { recursive: true, force: true }));
    // A `CLAUDE.md` whose bytes were never accepted: the member still publishes
    // — the failure is confined to one file — and the file carries the
    // diagnostic that says why (FR-025, FR-028).
    writeFileSync(join(home, 'CLAUDE.md'), Buffer.from([0x23, 0x00, 0x61]));
    const scanned = await scanClaudeHome(home);
    expect(scanned.kind).toBe('publishable');
    expect(scanned.paths).toEqual(['CLAUDE.md']);
    expect(scanned.diagnosticCodes).toEqual(['file-content-binary']);
  });

  it('reads the file through a link to its target', async () => {
    const base = mkdtempSync(join(tmpdir(), 'aci-claude-link-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const home = join(base, 'home');
    mkdirSync(home, { recursive: true });
    writeFileSync(join(base, 'shared-CLAUDE.md'), '# shared personal instructions\n', 'utf8');
    if (!tryLink(join(home, 'CLAUDE.md'), join(base, 'shared-CLAUDE.md'))) {
      // A platform that refuses symbolic links proves nothing here.
      return;
    }
    // A link is read through its target, because that is what a session reading
    // the same path sees (FR-024). The published identity stays the path inside
    // the home, never the target's.
    const scanned = await scanClaudeHome(home);
    expect(scanned.paths).toEqual(['CLAUDE.md']);
    expect(scanned.diagnosticCodes).toEqual([]);
  });

  it('records the member as failed when its admitted root is gone by the time it is scanned', async () => {
    const home = mkdtempSync(join(tmpdir(), 'aci-claude-vanished-'));
    writeFileSync(join(home, 'CLAUDE.md'), '# personal\n', 'utf8');
    expect(await admitGlobalRoot(home)).toEqual({ kind: 'admitted' });
    rmSync(home, { recursive: true, force: true });
    // Admission and the scan are separate moments, so the root can go between
    // them. That is this member's own failure — the source-level outcome — and
    // it leaves the sibling members free to commit (FR-014).
    const scanned = await scanClaudeHome(home);
    expect(scanned.kind).toBe('source-failed');
  });
});

describe('the widened Copilot member and the shared agent home (T977, T978, T1124)', () => {
  it('serves each same-path skill detail from its own member (FR-030)', async () => {
    // The Copilot home and the shared agent home both admit
    // `skills/<name>/SKILL.md`, so the one Global generation holds two
    // recognitions at one Source-relative Path. A detail resolved by path
    // alone answered with whichever member the batch listed first — the
    // shared home's page showing the Copilot home's frontmatter and body.
    const base = mkdtempSync(join(tmpdir(), 'aci-same-path-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const homes = {
      copilot: join(base, 'copilot-home'),
      agents: join(base, 'agents-home'),
    } as const;
    for (const [member, body] of [
      ['copilot', 'the copilot home copy'],
      ['agents', 'the shared agent home copy'],
    ] as const) {
      mkdirSync(join(homes[member], 'skills', 'demo'), { recursive: true });
      writeFileSync(
        join(homes[member], 'skills', 'demo', 'SKILL.md'),
        `---\nname: demo\n---\n\n${body}\n`,
        'utf8',
      );
    }

    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const registered = coordinator.registerGlobalEnable('preview-same-path', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const settled = coordinator.settleGlobalEnable(registered.operationId, 'preview-same-path', [
      ...(['copilot', 'agents'] as const).map((member) => ({
        member: {
          member,
          origin: 'environment' as const,
          lexicalRoot: homes[member],
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'admitted' as const, root: homes[member] },
      })),
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const catalogs = {
      copilot: COPILOT_GLOBAL_RULES,
      agents: [...CODEX_AGENTS_HOME_RULES, ...COPILOT_AGENTS_HOME_RULES],
    } as const;
    const results = [];
    for (const member of ['copilot', 'agents'] as const) {
      const publication = await runSourceScan({
        sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
        root: homes[member],
        rootFailureOwner: `global:${member}`,
        scope: 'global',
        rules: catalogs[member],
      });
      if (publication.kind !== 'publishable') {
        throw new Error(`expected the ${member} scan to publish`);
      }
      results.push({
        member,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
      });
    }
    coordinator.completeGlobalBatch(settled.scanRequestId, results);

    for (const [selector, body] of [
      ['global-copilot', 'the copilot home copy'],
      ['global-agents', 'the shared agent home copy'],
    ] as const) {
      const detail = session.fileDetail('skills/demo/SKILL.md', selector);
      if (detail?.kind !== 'skill') {
        throw new Error(`expected a skill detail for ${selector}`);
      }
      if (detail.file.encoding !== 'utf-8') {
        throw new Error('expected the readable variant');
      }
      // Both halves of the answer are the addressed member's own: the file's
      // bytes, and the parse the presentation renders.
      expect(detail.file.sourceText).toContain(body);
      expect(detail.presentation?.bodyText.trim()).toBe(body);
    }
  });

  /** Scans one home with the given member catalog and returns what published. */
  async function scanMember(
    sourceId: string,
    owner: 'global:copilot' | 'global:agents',
    home: string,
    rules: readonly CompiledStaticCandidateRule[],
  ): Promise<{
    readonly kind: string;
    readonly paths: readonly string[];
    readonly recognitions: readonly (readonly [string, string, string])[];
    readonly diagnosticCodes: readonly string[];
  }> {
    const publication = await runSourceScan({
      sourceId,
      root: home,
      rootFailureOwner: owner,
      scope: 'global',
      rules,
    });
    if (publication.kind !== 'publishable') {
      return { kind: publication.kind, paths: [], recognitions: [], diagnosticCodes: [] };
    }
    return {
      kind: publication.kind,
      paths: publication.files.map((file) => file.sourceRelativePath).toSorted(),
      recognitions: publication.recognitions
        .map(
          (recognition) =>
            [recognition.sourceRelativePath, recognition.tool, recognition.details.kind] as const,
        )
        .toSorted((left, right) => left.join('\u0000').localeCompare(right.join('\u0000'))),
      diagnosticCodes: publication.diagnostics.map((diagnostic) => diagnostic.code).toSorted(),
    };
  }

  it('reads exactly the contracted Copilot member files and leaves every neighbour untouched', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const before = observeTree(homes.homes.copilot);

    const scanned = await scanMember(
      'global-copilot',
      'global:copilot',
      homes.homes.copilot,
      COPILOT_GLOBAL_RULES,
    );

    // The widened member set (FR-015): the instruction pair, the personal
    // skill, the `.agent.md` custom agent, the standalone hook file, the JSONC
    // settings document, and the user MCP carrier — and nothing beside them.
    // `hooks/pre-commit.sh` sits in the admitted hooks directory and is
    // admitted by nothing: the documented filename pattern is `*.json`.
    expect(scanned.kind).toBe('publishable');
    expect(scanned.paths).toEqual(homes.expectedCandidatePaths.copilot);
    // The one diagnostic is the capability-gated broken instruction link,
    // which is that candidate's own `file-unreadable` (FR-024).
    expect(scanned.diagnosticCodes).toEqual(homes.capabilities.symlinks ? ['file-unreadable'] : []);

    // Nothing in the home changed, and no near miss was opened for reading
    // (FR-018, FR-023).
    const after = observeTree(homes.homes.copilot);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  it('publishes one shared-agent-home skill with both vendors’ recognitions (FR-045)', async () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const before = observeTree(homes.homes.agents);

    const scanned = await scanMember('global-agents', 'global:agents', homes.homes.agents, [
      ...CODEX_AGENTS_HOME_RULES,
      ...COPILOT_AGENTS_HOME_RULES,
    ]);

    // The two admitted files (FR-045): the personal skill and the personal
    // plugin marketplace. The skill is one candidate read once with a
    // recognition from each vendor that documents the location — exactly as a
    // Repository `.agents/skills` file is — while the catalog is Codex's own.
    expect(scanned.kind).toBe('publishable');
    expect(scanned.paths).toEqual(homes.expectedCandidatePaths.agents);
    expect(scanned.diagnosticCodes).toEqual([]);
    expect(scanned.recognitions).toEqual([
      ['plugins/marketplace.json', 'codex', 'plugin'],
      ['skills/pathfinder/SKILL.md', 'codex', 'skill'],
      ['skills/pathfinder/SKILL.md', 'copilot', 'skill'],
    ]);

    // The installed plugin copy the catalog names stays unread (FR-018), and
    // nothing in the home changed (FR-023).
    const after = observeTree(homes.homes.agents);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });

  it('names every neighbour the fixture writes for both members, so none goes unasserted', () => {
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    for (const member of ['copilot', 'agents'] as const) {
      const written = [...observeTree(homes.homes[member]).keys()].filter((path) => path !== '.');
      for (const nearMiss of homes.nearMissPaths[member]) {
        expect(written, nearMiss).toContain(nearMiss);
      }
      for (const candidate of homes.expectedCandidatePaths[member]) {
        expect(written, candidate).toContain(candidate);
      }
    }
  });
});

describe('a Global batch beside the Repository sequence (T947)', () => {
  it('commits its own generation and leaves the Repository sequence untouched', async () => {
    const repository = mkdtempSync(join(tmpdir(), 'aci-global-repo-'));
    cleanups.push(() => rmSync(repository, { recursive: true, force: true }));
    mkdirSync(join(repository, '.claude/skills/deploy'), { recursive: true });
    writeFileSync(
      join(repository, '.claude/skills/deploy/SKILL.md'),
      '---\nname: deploy\ndescription: Ship it.\n---\n\nBody.\n',
      'utf8',
    );
    const homes = buildGlobalHomeFixture();
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));

    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);

    // One Repository scan first, so there is a committed Repository generation
    // for the Global commit to leave alone.
    const admitted = coordinator.admitScan(session.repositorySourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const repositoryPublication = await runSourceScan({
      sourceId: session.repositorySourceId,
      root: session.selectedRepositoryRoot,
      rootFailureOwner: 'repository',
      scope: 'repository',
    });
    if (repositoryPublication.kind !== 'publishable') {
      throw new Error('expected a publishable Repository outcome');
    }
    await coordinator.completeScan(admitted.scanRequestId, {
      files: repositoryPublication.files,
      recognitions: repositoryPublication.recognitions,
      diagnostics: repositoryPublication.diagnostics,
      outcome: repositoryPublication.outcome,
      visitedEntries: repositoryPublication.visitedEntries,
      candidateFiles: repositoryPublication.candidateFiles,
      readBytes: repositoryPublication.readBytes,
    });
    const repositoryBefore = session.snapshot();

    // The Global side: register, settle with the one admitted Codex member,
    // scan it, and commit.
    const registered = coordinator.registerGlobalEnable('preview-id', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected registration');
    }
    const result = coordinator.settleGlobalEnable(registered.operationId, 'preview-id', [
      {
        member: {
          member: 'codex',
          origin: 'environment',
          lexicalRoot: homes.homes.codex,
          inputState: 'eligible',
          port: null,
        },
        outcome: { kind: 'admitted', root: homes.homes.codex },
      },
    ]);
    expect(result.state).toBe('queued');
    const control = session.globalConsent!.controls.get('codex')!;
    const globalPublication = await runSourceScan({
      sourceId: control.sourceId!,
      root: control.root!,
      rootFailureOwner: 'global:codex',
      scope: 'global',
      rules: CODEX_GLOBAL_RULES,
    });
    if (globalPublication.kind !== 'publishable') {
      throw new Error('expected a publishable Global outcome');
    }
    coordinator.completeGlobalBatch(result.scanRequestId!, [
      {
        member: 'codex',
        files: globalPublication.files,
        recognitions: globalPublication.recognitions,
        diagnostics: globalPublication.diagnostics,
        outcome: globalPublication.outcome,
      },
    ]);

    const after = session.snapshot();
    // Two sequences, two generations: the Global sequence starts at 1 and the
    // Repository generation is exactly what it was (FR-042).
    expect(after.globalGeneration).toBe(1);
    expect(after.repositoryGeneration).toBe(repositoryBefore.repositoryGeneration);
    // The Repository Source and its files are unchanged, and the Global Source
    // is a separate identity with its own root.
    const repositorySource = after.sources.find((source) => source.kind === 'repository')!;
    expect(repositorySource).toEqual(
      repositoryBefore.sources.find((source) => source.kind === 'repository'),
    );
    const globalSources = after.sources.filter((source) => source.kind === 'global');
    expect(globalSources.map((source) => source.member)).toEqual(['codex']);
    expect(globalSources[0]!.sourceId).not.toBe(repositorySource.sourceId);
    // The published files belong to the Global Source, and the Repository
    // files they sit beside are the same ones as before.
    const globalFiles = after.files.filter((file) => file.sourceId === globalSources[0]!.sourceId);
    expect(globalFiles.map((file) => file.sourceRelativePath)).toEqual(
      homes.expectedCandidatePaths.codex,
    );
    expect(
      after.files
        .filter((file) => file.sourceId === repositorySource.sourceId)
        .map((file) => file.sourceRelativePath),
    ).toEqual(repositoryBefore.files.map((file) => file.sourceRelativePath));
  });
  it('answers a path both Sources hold with each Source’s own file (FR-030)', async () => {
    // A file's identity is its Source and its Source-relative Path, and this
    // is the case that needs both halves: the repository publishes `AGENTS.md`
    // and so does the consented home, because the home's override is absent
    // and the fallback is its selection. Resolving by path alone answers both
    // requests with whichever generation is searched first, which is one
    // Source's authored content under the other's address.
    const repository = mkdtempSync(join(tmpdir(), 'aci-same-path-repo-'));
    cleanups.push(() => rmSync(repository, { recursive: true, force: true }));
    writeFileSync(join(repository, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
    const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
    cleanups.push(() => rmSync(home.home, { recursive: true, force: true }));

    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    await commitRepositoryScan(session, coordinator);
    await commitCodexGlobalScan(session, coordinator, home.home);

    // The home's file, at the path the repository also publishes.
    const global = session.fileDetail('AGENTS.md', 'global-codex');
    if (global === null || !isReadableFile(global.file)) {
      throw new Error('expected the Global instruction detail');
    }
    expect(global.file.sourceText).toBe(CODEX_INSTRUCTION_CASES['non-empty'].write.text);
    // And the repository's own file, at the same path.
    const repositoryDetail = session.fileDetail('AGENTS.md', 'repository');
    if (repositoryDetail === null || !isReadableFile(repositoryDetail.file)) {
      throw new Error('expected the Repository instruction detail');
    }
    expect(repositoryDetail.file.sourceText).toBe(REPOSITORY_AGENTS_TEXT);
    // The two are different files, so their Source IDs differ as well as their
    // content.
    expect(global.file.sourceId).not.toBe(repositoryDetail.file.sourceId);
    // A token no Source of this session answers to resolves nothing, which is
    // the `stale-resource` rejection the host returns for it.
    expect(session.fileDetail('AGENTS.md', 'global-claude')).toBeNull();
  });
  it('opens each Source’s file from that Source’s own root (FR-022, FR-030)', async () => {
    // The same path in two Sources, and two different roots to open it from:
    // the selected repository's, and the exact admitted root the consent
    // control retained. Resolving by path alone hands the reader a file from
    // the wrong root — the repository's copy under an address that named the
    // home.
    const repository = mkdtempSync(join(tmpdir(), 'aci-open-source-repo-'));
    cleanups.push(() => rmSync(repository, { recursive: true, force: true }));
    writeFileSync(join(repository, 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
    const home = buildCodexInstructionHome({ override: 'absent', fallback: 'non-empty' });
    cleanups.push(() => rmSync(home.home, { recursive: true, force: true }));

    const opener = new RecordingFileOpener();
    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: opener,
    });
    const coordinator = new SessionCoordinator(session);
    await commitRepositoryScan(session, coordinator);
    await commitCodexGlobalScan(session, coordinator, home.home);

    expect(
      await session.openCommittedFile('AGENTS.md', 'global-codex', 'default-application'),
    ).toBe(true);
    expect(await session.openCommittedFile('AGENTS.md', 'repository', 'default-application')).toBe(
      true,
    );
    expect(opener.launches.map((launch) => launch.absolutePath)).toEqual([
      join(home.home, 'AGENTS.md'),
      join(repository, 'AGENTS.md'),
    ]);
    // A Source this session does not carry resolves nothing, so no launch is
    // made from a root no consent admitted.
    expect(
      await session.openCommittedFile('AGENTS.md', 'global-claude', 'default-application'),
    ).toBe(false);
    expect(opener.launches).toHaveLength(2);
  });
  it('hands over the path the scan read, not a lexically joined one (FR-022)', async () => {
    // A root holding `link/..`: the operating system resolves that after
    // following the link, while `node:path.join` collapses it before anything
    // is followed. The scan reads through the first, so the launch must too —
    // otherwise the reader is handed a file this session never opened.
    const base = mkdtempSync(join(tmpdir(), 'aci-open-link-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    mkdirSync(join(base, 'home'), { recursive: true });
    writeFileSync(join(base, 'home', 'AGENTS.md'), REPOSITORY_AGENTS_TEXT, 'utf8');
    mkdirSync(join(base, 'target'), { recursive: true });
    mkdirSync(join(base, 'beside'), { recursive: true });
    if (!tryLink(join(base, 'beside', 'link'), join(base, 'target'))) {
      // A platform that refuses symbolic links proves nothing here.
      return;
    }
    // `<base>/beside/link/../home`: the operating system follows the link to
    // `<base>/target`, takes its parent, and lands on `<base>/home`, which
    // holds the file. Collapsed lexically the same string is
    // `<base>/beside/home`, which holds nothing at all.
    //
    // Concatenated rather than joined, because `node:path.join` is what
    // collapses it — building this root with the function under test would
    // hand the session the already-collapsed path and prove nothing.
    const root = `${base}${sep}beside${sep}link${sep}..${sep}home`;

    const opener = new RecordingFileOpener();
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: opener,
    });
    await commitRepositoryScan(session, new SessionCoordinator(session));
    // The scan read it through the unnormalized root, so the file is committed.
    expect(session.snapshot().files.map((file) => file.sourceRelativePath)).toEqual(['AGENTS.md']);

    expect(await session.openCommittedFile('AGENTS.md', 'repository', 'default-application')).toBe(
      true,
    );
    expect(opener.launches.map((launch) => launch.absolutePath)).toEqual([
      `${root}${sep}AGENTS.md`,
    ]);
  });
});

describe('the one fixed-four transaction over real roots (T991)', () => {
  it('publishes four separately identified one-root Sources in exactly one generation', async () => {
    const homes = buildGlobalHomeFixture('aci-fixed-four');
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const registered = coordinator.registerGlobalEnable('preview-fixed-four', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const members = ['copilot', 'claude', 'codex', 'agents'] as const;
    const settled = coordinator.settleGlobalEnable(
      registered.operationId,
      'preview-fixed-four',
      members.map((member) => ({
        member: {
          member,
          origin: 'environment' as const,
          lexicalRoot: homes.homes[member],
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'admitted' as const, root: homes.homes[member] },
      })),
    );
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const catalogs = {
      copilot: COPILOT_GLOBAL_RULES,
      claude: CLAUDE_GLOBAL_RULES,
      codex: CODEX_GLOBAL_RULES,
      agents: [...CODEX_AGENTS_HOME_RULES, ...COPILOT_AGENTS_HOME_RULES],
    } as const;
    const results = [];
    for (const member of members) {
      const publication = await runSourceScan({
        sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
        root: homes.homes[member],
        rootFailureOwner: `global:${member}`,
        scope: 'global',
        rules: catalogs[member],
      });
      if (publication.kind !== 'publishable') {
        throw new Error(`expected the ${member} scan to publish`);
      }
      results.push({
        member,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
      });
    }
    coordinator.completeGlobalBatch(settled.scanRequestId, results);

    // One complete generation of the Global sequence, holding all four
    // members together — never one commit per member (FR-014, FR-045).
    const snapshot = session.snapshot();
    expect(snapshot.globalGeneration).toBe(1);
    const globalSources = snapshot.sources.filter((source) => source.kind === 'global');
    expect(globalSources.map((source) => source.member)).toEqual([...members]);
    // Separately identified: four distinct Source IDs, each generation 1,
    // each carrying the one shared batch request (FR-014).
    expect(new Set(globalSources.map((source) => source.sourceId)).size).toBe(members.length);
    for (const source of globalSources) {
      expect(source.generation).toBe(1);
      expect(source.scanRequestId).toBe(settled.scanRequestId);
    }
    // One-member/one-root: each member's committed files are exactly the
    // contracted candidate paths of its own home, keyed by its own Source.
    for (const [index, member] of members.entries()) {
      const sourceId = globalSources[index]!.sourceId;
      const paths = snapshot.files
        .filter((file) => file.sourceId === sourceId)
        .map((file) => file.sourceRelativePath)
        .toSorted();
      expect(paths, member).toEqual([...homes.expectedCandidatePaths[member]].toSorted());
    }
  });

  it('allocates nothing and preserves the snapshot when zero roots are admitted', async () => {
    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const before = session.snapshot();
    const registered = coordinator.registerGlobalEnable('preview-zero', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const settled = coordinator.settleGlobalEnable(registered.operationId, 'preview-zero', [
      {
        member: {
          member: 'codex',
          origin: 'environment' as const,
          lexicalRoot: '/nowhere/codex-home',
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'rejected' as const, failureCode: 'root-unreadable' as const },
      },
    ]);
    // No batch, no job, no Source, no generation: the empty subset is the
    // declared `active-no-job` outcome, and every carried piece of the prior
    // snapshot survives untouched (FR-014).
    expect(settled.scanRequestId).toBeNull();
    expect(settled.state).toBe('active-no-job');
    const after = session.snapshot();
    expect(after.globalGeneration).toBeNull();
    expect(after.sources.filter((source) => source.kind === 'global')).toEqual([]);
    expect(after.sources.map((source) => source.sourceId)).toEqual(
      before.sources.map((source) => source.sourceId),
    );
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(after.files).toEqual(before.files);
  });
});
