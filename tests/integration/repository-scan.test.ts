// T055/T128/T156/T180/T270: the Repository scan end to end — from the
// synchronous zero-I/O generation 0 through the committed Copilot, Claude,
// and Codex SKILL inventories, the per-vendor and unified instruction
// inventories, the multi-tool recognition matrix, the file-confined
// diagnostic matrix, the source-scoped root failure, and the failures that
// are not confined to one file (FR-001, FR-002, FR-024, FR-028, FR-030).
//
// The suite starts from generation 0 rather than from a scan on purpose: the
// Source the first scan reads is the one bootstrap already created, and the
// root it reads is the retained raw selection — never the escaped display
// boundary, which grants no read authority.
import { chmodSync, linkSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
// The builtin behind the fs-io seam: an injection that passes every other
// path through must call this, not the spy it is installed on.
import { readFile as realReadFile } from 'node:fs/promises';
import { join, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../src/server/inspection/fs-io';
import {
  FIXTURE_ENVIRONMENT_REFERENCE,
  FIXTURE_SECRET_LITERAL,
  NUMEROUS_FALLBACK_BASENAMES,
  NUMEROUS_FALLBACK_DECLARATION_COUNT,
  buildAllCustomizationKindFixture,
  buildAllToolSkillFixture,
  buildAllVendorInstructionFixture,
  buildClaudeInstructionFixture,
  buildClaudeMcpFixture,
  buildClaudeAgentFixture,
  buildClaudeSkillFixture,
  buildCommandFixture,
  buildCopilotCliMcpFixture,
  buildCopilotVscodeMcpFixture,
  buildPriorityMcpFixture,
  buildCodexAgentFixture,
  buildCodexInstructionFixture,
  buildClaudePermissionsFixture,
  buildCodexMcpFixture,
  buildCopilotSettingsFixture,
  buildCodexSkillFixture,
  buildCopilotInstructionFixture,
  buildCopilotSkillFixture,
  createRepositoryFixtureRoot,
  buildClaudePluginFixture,
  buildCodexPluginFixture,
  buildCopilotPluginFixture,
  buildUnifiedPluginFixture,
} from '../fixtures/repositories/build-fixtures';
import { CLAUDE_REPOSITORY_RULES } from '../../src/server/inspection/rules/claude';
import { CODEX_REPOSITORY_RULES } from '../../src/server/inspection/rules/codex';
import { configuredFallbackBasenamesOf } from '../../src/server/inspection/rules/instructions/codex';
import { COPILOT_REPOSITORY_RULES } from '../../src/server/inspection/rules/copilot';
import { REPOSITORY_INSPECTION_RULES, runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';

// Pass-through spies over the closed fs surface, so the suite can prove which
// root was actually read (contracts/inspection-path-allowlist.md § Symlink and read invariants).
vi.mock('../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const cleanups: (() => void)[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

function bootstrap(root: string) {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/** Runs one accepted attempt through the coordinator exactly as the host does. */
async function scanOnce(
  context: ReturnType<typeof bootstrap>,
  trigger: 'startup' | 'request' = 'startup',
) {
  const sourceId = context.session.repositorySourceId;
  const admitted = context.coordinator.admitScan(
    sourceId,
    trigger === 'startup'
      ? { kind: 'startup', operationId: null }
      : { kind: 'request', operationId: 'op-1' },
  );
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId,
    root: context.session.selectedRepositoryRoot,
    rootFailureOwner: trigger === 'startup' ? 'repository' : `published-source:${sourceId}`,
  });
  if (publication.kind === 'publishable') {
    await context.coordinator.completeScan(admitted.scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
    });
  } else {
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'diagnostic',
      diagnostic: publication.diagnostic,
    });
  }
  return { sourceId, scanRequestId: admitted.scanRequestId, publication };
}

/**
 * Every file one plugin row's carriers reach, sorted: the row publishes the
 * list per carrier — the directory each offering named — so its whole file
 * list is theirs together, derived where it is read
 * (`api-types.ts` § PluginCarrierDto.files).
 */
function pluginRowFiles(
  row: { readonly carriers: readonly { readonly files: readonly string[] }[] } | undefined,
) {
  return [...new Set((row?.carriers ?? []).flatMap((carrier) => carrier.files))].toSorted();
}

describe('generation 0 exists before any filesystem operation (FR-002)', () => {
  it('contains exactly one enabled idle Repository Source with no I/O', () => {
    const root = createRepositoryFixtureRoot('inspector-scan-gen0');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    vi.clearAllMocks();
    const { session } = bootstrap(root);
    const snapshot = session.snapshot();

    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources).toHaveLength(1);
    expect(snapshot.sources[0]).toMatchObject({
      kind: 'repository',
      tool: null,
      enabled: true,
      status: 'idle',
      generation: 0,
      scanRequestId: null,
      progress: null,
      diagnosticIds: [],
    });
    expect(snapshot.sources[0]!.sourceId).toMatch(/^[A-Za-z0-9_-]{22}$/u);
    expect(snapshot.files).toEqual([]);
    expect(snapshot.diagnostics).toEqual([]);
    // The public boundary is an escaped label plus its origin, and nothing
    // else: the retained raw root stays internal and is the only read operand.
    expect(snapshot.sources[0]!.boundary.origin).toBe('process-cwd');
    expect(Object.keys(snapshot.sources[0]!.boundary).sort()).toEqual(['displayRoot', 'origin']);
    for (const name of ['lstat', 'readFile', 'readdir', 'realpath', 'stat'] as const) {
      expect(vi.mocked(fsIo[name])).not.toHaveBeenCalled();
    }
  });

  it('escapes a root the shell would treat as several words into one inert label', () => {
    const parent = createRepositoryFixtureRoot('inspector-scan-escape');
    cleanups.push(() => rmSync(parent, { recursive: true, force: true }));
    const root = join(parent, 'my repo');
    mkdirSync(root, { recursive: true });
    const { session } = bootstrap(root);

    const { displayRoot } = session.snapshot().sources[0]!.boundary;
    // The space is escaped, so the label cannot be pasted back as a path and
    // is visibly a presentation value rather than a locator (FR-002).
    expect(displayRoot).not.toContain(' ');
    expect(displayRoot).toContain('\\u0020');
  });

  it('keeps the Source identity and every file identity stable across a commit', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-stable');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const originalSourceId = context.session.snapshot().sources[0]!.sourceId;

    await scanOnce(context);
    const first = context.session.snapshot();
    expect(first.sources[0]!.sourceId).toBe(originalSourceId);

    await scanOnce(context, 'request');
    const second = context.session.snapshot();
    expect(second.sources[0]!.sourceId).toBe(originalSourceId);
    expect(second.repositoryGeneration).toBe(2);
    // A file's identity is its Source-relative Path, stable across
    // generations (FR-030): the new commit publishes the same identities, so
    // a retained link resolves against it rather than dangling.
    expect(second.files.map((file) => file.sourceRelativePath)).toEqual(
      first.files.map((file) => file.sourceRelativePath),
    );
  });
});

describe('the scan reads the retained raw selected root', () => {
  it('bases every filesystem operation on that root and commits its skills', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-root');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    for (const call of vi.mocked(fsIo.readdir).mock.calls) {
      expect(String(call[0]).startsWith(fixture.root)).toBe(true);
    }
    // The published set is the admitted skills plus the files their censuses
    // bound: a skill is its `SKILL.md` and what ships beside it. Copilot
    // shares the root `.agents` spelling, so its rule admits this same set
    // and adds no path of its own.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      [...fixture.expectedSkillPaths, ...fixture.expectedCompanionPaths].sort(),
    );
  });

  it('publishes rows in the contracted order: source kind, then path', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-order');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const paths = context.session.snapshot().files.map((file) => file.sourceRelativePath);
    expect(paths).toEqual([...paths].sort());
  });
});

describe("a skill's own directory is published with it", () => {
  it('publishes each companion as a readable file that nothing recognized', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-companions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    for (const path of fixture.expectedCompanionPaths) {
      const file = snapshot.files.find((one) => one.sourceRelativePath === path);
      expect(file, `companion not published: ${path}`).toBeDefined();
      if (file?.encoding !== 'utf-8') {
        throw new Error(`expected a readable companion at ${path}`);
      }
      // Read like any other file, and classified as nothing: no rule admitted
      // it, so it has no recognition, no kind, and no extractor applied to it.
      expect(file.diagnosticIds).toEqual([]);
      const detail = context.session.fileDetail(file.sourceRelativePath);
      expect(detail?.kind).toBe('file');
    }
  });

  it('carries replacement-decoded text through extraction and the detail route', async () => {
    // Invalid non-NUL UTF-8 decodes once with replacement semantics and the
    // garbled result proceeds as ordinary readable text (FR-025): the
    // extractor parses it, the declared name carries the inserted U+FFFD
    // exactly, and the detail route serves the same garbled `sourceText` —
    // nothing re-decodes, cleans, or drops it on the way to the reader.
    const root = createRepositoryFixtureRoot('inspector-scan-replaced');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/garbled'), { recursive: true });
    writeFileSync(
      join(root, '.agents/skills/garbled/SKILL.md'),
      Buffer.concat([
        Buffer.from('---\nname: gar', 'utf8'),
        Buffer.from([0xff]),
        Buffer.from('bled\n---\n', 'utf8'),
      ]),
    );
    const context = bootstrap(root);
    const { publication } = await scanOnce(context);
    const snapshot = context.session.snapshot();

    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === '.agents/skills/garbled/SKILL.md',
    );
    expect(file?.encoding).toBe('utf-8-replaced');
    // A replacement decode is complete, not partial (FR-025).
    expect(publication.kind === 'publishable' && publication.outcome).toBe('complete');
    const row = snapshot.skills.find((entry) => entry.name === 'gar\uFFFDbled');
    expect(row).toBeDefined();
    const detail = context.session.fileDetail(file!.sourceRelativePath);
    if (detail?.file.encoding !== 'utf-8-replaced') {
      throw new Error('expected the replacement-decoded variant');
    }
    expect(detail.file.sourceText).toContain('gar\uFFFDbled');
  });

  it('publishes a binary companion as an ordinary fact of the skill', async () => {
    // A skill shipping an image or a compiled asset is ordinary: the census
    // lists it, the read classifies its bytes, and binary is the answer —
    // not a failure. Nothing expected an asset to be text, so there is no
    // Diagnostic and the generation commits complete. This is the property
    // the fixture is minimal for: with only this skill in it, `complete` can
    // only come from the asset being an ordinary fact.
    const root = createRepositoryFixtureRoot('inspector-scan-binary-companion');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/greet'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/greet/SKILL.md'), '---\nname: greet\n---\n', 'utf8');
    const assetPath = '.agents/skills/greet/logo.png';
    writeFileSync(join(root, ...assetPath.split('/')), 'PNG\u0000\u0001bytes\n', 'utf8');
    const context = bootstrap(root);
    const { publication } = await scanOnce(context);
    const snapshot = context.session.snapshot();

    const asset = snapshot.files.find((file) => file.sourceRelativePath === assetPath);
    expect(asset?.encoding).toBe('binary');
    expect(asset && 'sourceText' in asset).toBe(false);
    expect(asset?.diagnosticIds).toEqual([]);
    expect(snapshot.diagnostics).toEqual([]);
    expect(publication.kind === 'publishable' && publication.outcome).toBe('complete');
    expect(snapshot.sources[0]!.status).toBe('ready');
    // And the skill still ships it: the asset is part of the customization,
    // listed with its other files.
    const greet = snapshot.skills.find((entry) => entry.name === 'greet');
    expect(greet?.definitions[0]?.companionFiles).toContain(assetPath);
  });

  it('serves a companion\u2019s complete authored source through the detail route', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-companion-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const readme = context.session
      .snapshot()
      .files.find((file) => file.sourceRelativePath === '.agents/skills/greet/README.md');
    const detail = context.session.fileDetail(readme!.sourceRelativePath);
    if (detail?.file.encoding !== 'utf-8') {
      throw new Error('expected a readable companion detail');
    }
    // The fixture authored exactly this beside the skill.
    expect(detail.file.sourceText).toBe('sibling\n');
  });

  it('keeps a companion out of the skill inventory it belongs to', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-companion-rows');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // A companion is part of the customization the row already names; it never
    // becomes a definition of its own.
    const definitionPaths = snapshot.skills.flatMap((entry) =>
      entry.definitions.map((definition) => definition.sourceRelativePath),
    );
    for (const path of fixture.expectedCompanionPaths) {
      expect(definitionPaths).not.toContain(path);
    }
    // It is named by the skill that ships it, which is how the detail view
    // resolves the directory.
    const greet = snapshot.skills.find((entry) => entry.name === 'greet');
    expect(greet?.definitions[0]?.companionFiles).toEqual([...fixture.expectedCompanionPaths]);
  });
});

describe('recognition is atomic per admitted candidate (FR-005)', () => {
  it('publishes one skill row per resolved name, naming its file by path', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-recognize');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    const row = snapshot.skills.find((entry) => entry.name === 'greet');
    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === '.agents/skills/greet/SKILL.md',
    );
    // The row's resolved name is the fixture's own declared frontmatter
    // value — authored when declared (FR-007) — carried end to end from the
    // file through the recognizer to the row, and it is the row's own
    // identity rather than a field on the file.
    // The census is recursive and excludes the seed: `greet/` holds the
    // admitted `SKILL.md`, a sibling `README.md`, and `nested/SKILL.md` (a
    // near miss that is never admitted but is still a file beside the skill),
    // so both accompany it. `.agents/skills/` is both a Copilot and a Codex
    // location, so the one physical file is one definition per recognizing
    // product — the ToolRecognition unit — in the closed tool order, each
    // carrying its own invocation name and the file's one census.
    const companionFiles = [
      '.agents/skills/greet/README.md',
      '.agents/skills/greet/nested/SKILL.md',
    ];
    expect(row).toEqual({
      name: 'greet',
      definitions: [
        {
          sourceRelativePath: '.agents/skills/greet/SKILL.md',
          tool: 'copilot',
          // The surfaces the admitting rules rest on, stated beside this
          // definition exactly as beside any other recognition (FR-009): one
          // shared `.agents/skills/` location all three Copilot surfaces
          // document.
          surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'],
          parseStatus: 'parsed',
          diagnosticIds: [],
          companionFiles,
        },
        {
          sourceRelativePath: '.agents/skills/greet/SKILL.md',
          tool: 'codex',
          surfaces: ['codex-local-clients'],
          parseStatus: 'parsed',
          diagnosticIds: [],
          companionFiles,
        },
      ],
      // A single tool resolving the name once faces no collision, so the row
      // states no rule.
      sameNameResolutions: [],
    });
    // The file publishes its own facts and nothing about what it was
    // recognized as; the row above is where that lives.
    if (file?.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect('recognitions' in file).toBe(false);
    // The Codex `skill` row has an extractor, and it ran: the frontmatter
    // block parsed and produced this file's `codex.skill.name` entry, so the
    // rollup is `all-parsed` rather than the `not-applicable` a kind with no
    // extractor would show.
  });

  it('never puts authored source or a validity verdict in a session summary', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-secret');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const serialized = JSON.stringify(context.session.snapshot());
    // The secret is in the fixture's authored source and in the committed
    // generation, but the snapshot's inventory rows must not carry it: source
    // text is served only through the detail route.
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toMatch(/"valid"|"invalid"|"compliant"|"effective"/u);
  });
});

describe('physical identity and mid-scan change (T055)', () => {
  it('publishes each hard link as its own file with no identity grouping', async () => {
    // Two paths to one inode are two discovered files: the Inspector has no
    // physical-identity grouping, because an agent reading either path reads a
    // skill and both are separately authored locations.
    const root = createRepositoryFixtureRoot('inspector-scan-hardlink');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/first'), { recursive: true });
    mkdirSync(join(root, '.agents/skills/second'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/first/SKILL.md'), '---\nname: shared\n---\n', 'utf8');
    linkSync(
      join(root, '.agents/skills/first/SKILL.md'),
      join(root, '.agents/skills/second/SKILL.md'),
    );

    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual([
      '.agents/skills/first/SKILL.md',
      '.agents/skills/second/SKILL.md',
    ]);
    // One declared name, one row: the row's unit is the name, both files
    // declare it, and each file is one definition per recognizing product —
    // Codex and Copilot both read `.agents/skills/`.
    expect(snapshot.skills).toHaveLength(1);
    expect(snapshot.skills[0]!.definitions).toHaveLength(4);
    // Distinct file identities, so neither is a projection of the other.
    expect(new Set(snapshot.files.map((file) => file.sourceRelativePath)).size).toBe(2);
  });

  it('publishes a file that disappeared between discovery and reading', async () => {
    // The walk found it; the read did not. That is file-confined (FR-028): the
    // candidate publishes as `unknown` with its diagnostic, and every other
    // file still commits in the same partial generation.
    const fixture = buildCodexSkillFixture('inspector-scan-vanished');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const vanishing = join(fixture.root, '.agents/skills/greet/SKILL.md');
    const readFile = vi.mocked(fsIo.readFile);
    const original = readFile.getMockImplementation()!;
    readFile.mockImplementation(async (path, ...rest) => {
      if (String(path) === vanishing) {
        const error: NodeJS.ErrnoException = new Error('ENOENT: no such file');
        error.code = 'ENOENT';
        throw error;
      }
      return original(path, ...rest);
    });

    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    const vanished = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/greet/SKILL.md',
    );
    expect(vanished?.encoding).toBe('unknown');
    expect(vanished?.diagnosticIds.length).toBeGreaterThan(0);
    // Unaffected files still published, so the outcome is partial rather than a
    // failed attempt.
    expect(snapshot.files.length).toBeGreaterThan(1);
    expect(snapshot.sources[0]!.status).toBe('partial');
  });
});

describe('progress moves while the scan is running', () => {
  it('advances phase and entries before the attempt commits', async () => {
    // A refresh mid-scan must show where the attempt is. Without live reports
    // the counters stay at the zeros an admission starts them with until the
    // commit replaces them wholesale.
    const fixture = buildCodexSkillFixture('inspector-scan-live-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const seen: { phase: string; visitedEntries: number }[] = [];
    await runSourceScan({
      sourceId,
      root: fixture.root,
      rootFailureOwner: 'repository',
      onProgress: (update) => {
        context.coordinator.reportProgress(admitted.scanRequestId, update);
        const source = context.session.snapshot().sources[0]!;
        seen.push({
          phase: source.progress!.phase,
          visitedEntries: source.progress!.visitedEntries,
        });
      },
    });
    expect(seen.length).toBeGreaterThan(0);
    // The counter only ever grows, and the last report is past enumeration.
    expect(seen.at(-1)!.visitedEntries).toBeGreaterThan(0);
    expect(seen.map((entry) => entry.phase)).toContain('recognizing');
    expect(
      seen.every(
        (entry, index) => index === 0 || entry.visitedEntries >= seen[index - 1]!.visitedEntries,
      ),
    ).toBe(true);
  });

  it('advances readBytes as census-listed companions are read', async () => {
    // Companions are read during assembly, after the walk's own reads. Their
    // bytes are part of "completed reads so far" (data-model.md § ScanProgress
    // `readBytes`), so progress must move through that stretch rather than
    // stall at the traversal's figure until the commit.
    const fixture = buildCodexSkillFixture('inspector-scan-companion-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const recognizingBytes: number[] = [];
    await runSourceScan({
      sourceId: 'companion-progress-source',
      root: fixture.root,
      rootFailureOwner: 'repository',
      onProgress: (update) => {
        if (update.phase === 'recognizing') {
          recognizingBytes.push(update.readBytes);
        }
      },
    });
    // Candidate outcomes report too, so the phase carries more observations
    // than the companion reads alone; what matters is that the companion
    // stretch moves the byte figure past the walk's.
    expect(recognizingBytes.length).toBeGreaterThan(fixture.expectedCompanionPaths.length);
    expect(recognizingBytes.at(-1)!).toBeGreaterThan(recognizingBytes[0]!);
  });
});

describe('completed progress reports the attempt, not its starting zeros', () => {
  it('publishes the entries walked, files published, bytes read, and diagnostics', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const source = context.session.snapshot().sources[0]!;
    expect(source.progress?.phase).toBe('complete');
    // Every counter has to reflect the work. They are admitted at zero, and
    // leaving them there would report "0 files" beside a published inventory.
    //
    // `candidateFiles` counts what the walk admitted, which is fewer than what
    // the generation publishes: a companion is read and published without any
    // rule admitting it, so it is not a candidate and is not counted as one.
    const published = context.session.snapshot().files.length;
    expect(source.progress?.candidateFiles).toBe(published - fixture.expectedCompanionPaths.length);
    expect(source.progress?.visitedEntries).toBeGreaterThan(source.progress!.candidateFiles);
    expect(source.progress?.readBytes).toBeGreaterThan(0);
    expect(source.progress?.diagnosticCount).toBe(
      context.session.snapshot().diagnostics.filter((entry) => entry.sourceRelativePath !== null)
        .length,
    );
  });
});

describe('the inventory unit is the kind, not the file (T1078)', () => {
  /** A repository whose skills declare the names each case needs. */
  function skillsDeclaring(prefix: string, named: Readonly<Record<string, string>>) {
    const root = createRepositoryFixtureRoot(prefix);
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    for (const [directory, frontmatter] of Object.entries(named)) {
      mkdirSync(join(root, '.agents/skills', directory), { recursive: true });
      writeFileSync(join(root, '.agents/skills', directory, 'SKILL.md'), frontmatter, 'utf8');
    }
    return root;
  }

  it('groups two files declaring one name into one row with two definitions', async () => {
    // The name is the unit, and it need not match the directory: `deploy/` and
    // `ship/` both declare `release`, so the inventory has one row for it.
    const root = skillsDeclaring('inspector-scan-same-name', {
      deploy: '---\nname: release\n---\n',
      ship: '---\nname: release\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    expect(snapshot.skills).toHaveLength(1);
    const [row] = snapshot.skills;
    expect(row!.name).toBe('release');
    // Definitions are ordered by their file's own path, then the closed tool
    // order within one file — never by an opaque ID. Each file is one
    // definition per recognizing product.
    expect(
      row!.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([
      ['.agents/skills/deploy/SKILL.md', 'copilot'],
      ['.agents/skills/deploy/SKILL.md', 'codex'],
      ['.agents/skills/ship/SKILL.md', 'copilot'],
      ['.agents/skills/ship/SKILL.md', 'codex'],
    ]);
    // Two definitions resolve differently per product, so the row states each
    // statement instead of ordering them (FR-007). Both products face the
    // collision — `.agents/skills/` is a shared spelling — and each states its
    // own documented rule: Copilot's depends on the surface, Codex keeps both.
    expect(row!.sameNameResolutions).toEqual([
      { tool: 'copilot', resolution: 'surface-dependent' },
      { tool: 'codex', resolution: 'all-remain' },
    ]);
  });

  it('states a resolution only for a tool that recognizes the name twice', async () => {
    // One authored name, two files: Codex reads only the `.agents` one, so it
    // has nothing to resolve between and states no rule. Copilot reads both
    // spellings, so it alone faces the collision — and its statement is the
    // surface-dependent one, because no single Copilot rule is documented
    // across VS Code, CLI, and Cloud. Counting the row's definitions instead
    // of each tool's would state all three.
    const root = skillsDeclaring('inspector-scan-split-tools', {
      ship: '---\nname: release\n---\n',
    });
    mkdirSync(join(root, '.claude/skills/deploy'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/deploy/SKILL.md'),
      '---\nname: release\n---\n',
      'utf8',
    );
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    // A row is one invocation name as one tool resolves it (FR-007), so
    // Claude Code's reading of `.claude/skills/deploy/SKILL.md` is its own
    // row: Claude derives the command from the skill directory and never from
    // the authored `name`, so `release` is not a command it answers to.
    expect(
      snapshot.skills.map((entry) => [
        entry.name,
        entry.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
      ]),
    ).toEqual([
      ['deploy', [['.claude/skills/deploy/SKILL.md', 'claude']]],
      [
        'release',
        [
          ['.agents/skills/ship/SKILL.md', 'copilot'],
          ['.agents/skills/ship/SKILL.md', 'codex'],
          ['.claude/skills/deploy/SKILL.md', 'copilot'],
        ],
      ],
    ]);
    const [deployRow, releaseRow] = snapshot.skills;
    // Claude's clash is between skill directories anywhere in the generation,
    // and this one is the only `deploy` directory Claude reads, so it states
    // nothing either.
    expect(deployRow!.sameNameResolutions).toEqual([]);
    expect(releaseRow!.sameNameResolutions).toEqual([
      { tool: 'copilot', resolution: 'surface-dependent' },
    ]);
  });

  it('publishes two rows for two names, each stating no resolution', async () => {
    const root = skillsDeclaring('inspector-scan-two-names', {
      deploy: '---\nname: release\n---\n',
      greet: '---\nname: hello\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    // Rows are ordered by their own key — the declared name — so nothing
    // opaque decides what the user sees first.
    expect(snapshot.skills.map((entry) => entry.name)).toEqual(['hello', 'release']);
    expect(snapshot.skills.every((entry) => entry.sameNameResolutions.length === 0)).toBe(true);
  });

  it('names a skill that declares no name by its skill directory', async () => {
    // A file with no usable name is still a named directory (FR-007):
    // `anonymous/` and `unnamed/` take their directory names — never
    // `release`, which only `deploy/` declares — so every row has a name and
    // rows keep sorting by it.
    const root = skillsDeclaring('inspector-scan-nameless', {
      deploy: '---\nname: release\n---\n',
      anonymous: '# no frontmatter\n',
      unnamed: '---\ndescription: none\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    expect(snapshot.skills.map((entry) => entry.name)).toEqual(['anonymous', 'release', 'unnamed']);
    for (const entry of snapshot.skills) {
      // One file per row, one definition per recognizing product — Codex and
      // Copilot both read `.agents/skills/`.
      expect(entry.definitions.map((definition) => definition.tool)).toEqual(['copilot', 'codex']);
    }
  });

  it('states each file fact once and repeats none of them per definition', async () => {
    const root = skillsDeclaring('inspector-scan-one-place', {
      deploy: '---\nname: release\n---\n',
    });
    const context = bootstrap(root);
    await scanOnce(context);

    const snapshot = context.session.snapshot();
    const [definition] = snapshot.skills[0]!.definitions;
    // A definition names its file by path and carries only what is its own —
    // the recognition's parse state and its extraction diagnostics. The name
    // is the row's, because a row is one invocation name; the file's size,
    // encoding, and file-scoped diagnostics live on the file itself, so no
    // two of them can disagree
    // (T1074; the recognition-owned diagnostics are the one deliberate
    // exception: an extraction failure is the kind's one shared record, and
    // each definition republishes its own recognition's reference to it).
    expect(Object.keys(definition!).sort()).toEqual([
      'companionFiles',
      'diagnosticIds',
      'parseStatus',
      'sourceRelativePath',
      // The surfaces this recognition's admissions rest on: a definition is a
      // recognition, and FR-009 states them beside every one.
      'surfaces',
      'tool',
    ]);
    expect(
      snapshot.files.filter((file) => file.sourceRelativePath === definition!.sourceRelativePath),
    ).toHaveLength(1);
  });
});

describe('a failed extraction is separated from a nameless parse (FR-028)', () => {
  it('shares the one extraction-failure record across a shared file’s definitions', async () => {
    // One unparseable `.agents` skill: the extraction ran once, so however
    // many products recognize the kind there is one failure record (FR-028) —
    // each definition references it as its own parse fact, and the file lists
    // it once as its file-confined outcome.
    const root = createRepositoryFixtureRoot('inspector-scan-failed-shared');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/broken-front'), { recursive: true });
    writeFileSync(
      join(root, '.agents/skills/broken-front/SKILL.md'),
      '---\nname: [unterminated\n---\n\n# Body\n',
      'utf8',
    );
    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The row still exists — a partial generation must say which file — and
    // is named by the skill directory: the path's own fact, not a reading of
    // the failed parse.
    const [row] = snapshot.skills;
    expect(row!.name).toBe('broken-front');
    expect(row!.definitions.map((definition) => definition.tool)).toEqual(['copilot', 'codex']);
    for (const definition of row!.definitions) {
      expect(definition.parseStatus).toBe('failed');
      expect(definition.diagnosticIds).toHaveLength(1);
    }
    // One shared record: both definitions name the same diagnostic, and the
    // file lists exactly that one.
    const [copilotDefinition, codexDefinition] = row!.definitions;
    expect(copilotDefinition!.diagnosticIds).toEqual(codexDefinition!.diagnosticIds);
    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === '.agents/skills/broken-front/SKILL.md',
    );
    expect(file!.diagnosticIds).toEqual(copilotDefinition!.diagnosticIds);
  });

  it('lets no failed pair evidence an authored-name collision', async () => {
    // Two unparseable files in same-named skill directories — `.github` and
    // `.agents`, both Copilot locations — share the directory-named row, so
    // Copilot holds two of its definitions. Neither authored name is known,
    // so Copilot is not quoted as resolving the name twice (FR-007): the
    // shared row is this product's provisional grouping, not evidence the
    // tool faced a collision.
    const root = createRepositoryFixtureRoot('inspector-scan-failed-pair');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    for (const spelling of ['.agents', '.github']) {
      mkdirSync(join(root, spelling, 'skills/dup'), { recursive: true });
      writeFileSync(
        join(root, spelling, 'skills/dup/SKILL.md'),
        '---\nname: [unterminated\n---\n',
        'utf8',
      );
    }
    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    const [row] = snapshot.skills;
    expect(row!.name).toBe('dup');
    expect(row!.definitions.map((definition) => [definition.tool, definition.parseStatus])).toEqual(
      [
        ['copilot', 'failed'],
        ['codex', 'failed'],
        ['copilot', 'failed'],
      ],
    );
    expect(row!.sameNameResolutions).toEqual([]);
  });
});

describe('file-confined outcomes keep the generation publishable (FR-028)', () => {
  it('records an unreadable file per file while every other file commits', async () => {
    const root = createRepositoryFixtureRoot('inspector-scan-unreadable');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/ok'), { recursive: true });
    mkdirSync(join(root, '.agents/skills/locked'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/ok/SKILL.md'), 'ok\n');
    const locked = join(root, '.agents/skills/locked/SKILL.md');
    writeFileSync(locked, 'locked\n');
    chmodSync(locked, 0o000);
    cleanups.push(() => chmodSync(locked, 0o644));

    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const ok = snapshot.files.find((file) => file.sourceRelativePath.endsWith('ok/SKILL.md'));
    expect(ok?.encoding).toBe('utf-8');
    const lockedRow = snapshot.files.find((file) =>
      file.sourceRelativePath.endsWith('locked/SKILL.md'),
    );
    // A root-owned process can read a mode-000 file, so the mode is not always
    // the way to make one unreadable. Rather than skipping the assertion — which
    // would let the whole case pass without testing anything — fall back to
    // failing the read itself, so the unreadable branch is always exercised.
    if (lockedRow?.encoding === 'unknown') {
      expect(snapshot.sources[0]!.status).toBe('partial');
      expect(
        snapshot.diagnostics.filter((entry) => entry.code === 'file-unreadable'),
      ).not.toHaveLength(0);
      return;
    }
    const readFile = vi.mocked(fsIo.readFile);
    const original = readFile.getMockImplementation()!;
    readFile.mockImplementation(async (path, ...rest) => {
      if (String(path) === locked) {
        const error: NodeJS.ErrnoException = new Error('EACCES: permission denied');
        error.code = 'EACCES';
        throw error;
      }
      return original(path, ...rest);
    });
    const forced = bootstrap(root);
    await scanOnce(forced);
    const forcedSnapshot = forced.session.snapshot();
    expect(
      forcedSnapshot.files.find((file) => file.sourceRelativePath.endsWith('locked/SKILL.md'))
        ?.encoding,
    ).toBe('unknown');
    expect(forcedSnapshot.sources[0]!.status).toBe('partial');
    expect(
      forcedSnapshot.diagnostics.filter((entry) => entry.code === 'file-unreadable'),
    ).not.toHaveLength(0);
  });

  it('reads a symlinked skill through its target and diagnoses a broken link', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-links');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    if (!fixture.capabilities.symlinks) {
      return;
    }
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const linked = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/linked/SKILL.md',
    );
    // Transparent read: the inspector shows what an agent resolving the same
    // path would see, so the link is an ordinary readable file (FR-024).
    expect(linked?.encoding).toBe('utf-8');

    const broken = snapshot.files.find(
      (file) => file.sourceRelativePath === '.agents/skills/broken/SKILL.md',
    );
    expect(broken?.encoding).toBe('unknown');
    expect(broken?.diagnosticIds).toHaveLength(1);
    const diagnostic = snapshot.diagnostics.find(
      (entry) => entry.diagnosticId === broken?.diagnosticIds[0],
    );
    expect(diagnostic).toMatchObject({
      code: 'file-unreadable',
      sourceRelativePath: '.agents/skills/broken/SKILL.md',
    });
    expect(snapshot.sources[0]!.status).toBe('partial');
  });
});

describe('an unreadable root fails the Source attempt (FR-002)', () => {
  it('publishes the source-scoped diagnostic and no partial inventory', async () => {
    const missing = join(createRepositoryFixtureRoot('inspector-scan-missing'), 'absent');
    const context = bootstrap(missing);
    const { publication } = await scanOnce(context);

    expect(publication.kind).toBe('source-failed');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.files).toEqual([]);
    expect(snapshot.sources[0]!.status).toBe('failed');
    expect(snapshot.repositoryFailureDiagnosticId).not.toBeNull();
    expect(
      snapshot.diagnostics.find(
        (entry) => entry.diagnosticId === snapshot.repositoryFailureDiagnosticId,
      ),
    ).toMatchObject({ code: 'root-unreadable', sourceRelativePath: null });
  });
});

describe('a failure not confined to one file aborts the attempt (FR-030)', () => {
  it('propagates ordinarily, commits nothing, and retains the last snapshot', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-throw');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();
    expect(committed.repositoryGeneration).toBe(1);

    // A deep enumeration failure is not confined to one file: it is never
    // converted into a Diagnostic, and no partial result is invented from the
    // candidates already discovered.
    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-fatal',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    vi.mocked(fsIo.readdir).mockImplementationOnce(() => {
      throw new Error('injected enumeration failure');
    });
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
      }),
    ).rejects.toThrow('injected enumeration failure');

    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'injected enumeration failure',
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(1);
    expect(after.files.map((file) => file.sourceRelativePath)).toEqual(
      committed.files.map((file) => file.sourceRelativePath),
    );
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
    expect(after.staleFailures[0]).toMatchObject({
      sourceId,
      failureRef: { kind: 'error', message: 'injected enumeration failure' },
      baseGeneration: 1,
    });
  });
});

describe('Claude skills join the inventory without changing Codex results (T128)', () => {
  it('publishes every vendor’s skills from one scan of one tree', async () => {
    const fixture = buildClaudeSkillFixture('inspector-scan-claude');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The published set is the admitted skills plus the files their censuses
    // bound — and nothing else: every near miss, the nested `.agents`
    // spelling included, stays out. Copilot's admitted set is the root subset
    // of both other vendors' spellings, so it adds no path of its own.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      [
        ...fixture.expectedClaudeSkillPaths,
        ...fixture.expectedCodexSkillPaths,
        ...fixture.expectedCompanionPaths,
      ].sort(),
    );

    // Each candidate is recognized by exactly the vendors whose rules
    // admitted it, in the closed tool order; the Claude and Codex halves are
    // what the Copilot phase must not have changed, and a nested `.claude`
    // skill stays Claude's alone — Claude documents lazy descendant
    // discovery, Copilot documents no downward lookup.
    const skillEntries = snapshot.skills.flatMap((entry) => entry.definitions);
    for (const path of fixture.expectedClaudeSkillPaths.filter(
      (one) => !one.includes('/broken/'),
    )) {
      const tools = skillEntries
        .filter((one) => one.sourceRelativePath === path)
        .map((one) => one.tool)
        .sort();
      const shared = fixture.expectedCopilotSkillPaths.includes(path);
      expect(tools, path).toEqual(shared ? ['claude', 'copilot'] : ['claude']);
    }
    for (const path of fixture.expectedCodexSkillPaths) {
      const tools = skillEntries
        .filter((one) => one.sourceRelativePath === path)
        .map((one) => one.tool)
        .sort();
      expect(tools, path).toEqual(['codex', 'copilot']);
    }
  });

  it('keeps Codex recognitions in a Codex-only tree exactly as the Codex phase committed them', async () => {
    // The preservation half stated directly: the shipped catalog now carries
    // three vendors, and in a tree with no `.claude` directory the published
    // set is still exactly the Codex phase's — Copilot's recognitions share
    // those same root files and admit nothing of their own.
    const fixture = buildCodexSkillFixture('inspector-scan-preserved');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      [...fixture.expectedSkillPaths, ...fixture.expectedCompanionPaths].sort(),
    );
    // A broken-link candidate is admitted but unreadable, so it publishes as a
    // diagnostic-only file with no recognition and appears in no definition.
    const definitions = snapshot.skills.flatMap((entry) => entry.definitions);
    const recognizable = fixture.expectedSkillPaths.filter((path) => !path.includes('/broken/'));
    expect(
      definitions
        .filter((definition) => definition.tool === 'codex')
        .map((definition) => definition.sourceRelativePath)
        .sort(),
    ).toEqual(recognizable);
    expect(
      definitions
        .filter((definition) => definition.tool === 'copilot')
        .map((definition) => definition.sourceRelativePath)
        .sort(),
    ).toEqual(recognizable);
    expect(definitions.some((definition) => definition.tool === 'claude')).toBe(false);
  });

  it('keeps the safe-filesystem boundary: reads only admitted candidates and their censuses', async () => {
    const fixture = buildClaudeSkillFixture('inspector-scan-claude-reads');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);

    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    // Descendant expansion widens where the walk *looks*, never what it may
    // *open*: every read is an admitted candidate or a census-bound companion,
    // each opened exactly once — a candidate two products admit is still one
    // read — and VCS internals are never touched.
    const bounded = new Set([
      ...fixture.expectedClaudeSkillPaths,
      ...fixture.expectedCodexSkillPaths,
      ...fixture.expectedCompanionPaths,
    ]);
    for (const path of opened) {
      expect(bounded.has(path), `opened outside the shipped plans and censuses: ${path}`).toBe(
        true,
      );
    }
    expect(new Set(opened).size).toBe(opened.length);
    const touched = [
      ...vi.mocked(fsIo.readdir).mock.calls,
      ...vi.mocked(fsIo.readFile).mock.calls,
    ].map((call) => String(call[0]));
    expect(touched.some((path) => path.includes(`${sep}.git`))).toBe(false);
  });
});

describe('the Copilot recognition matrix (T156)', () => {
  it('publishes one physical item per matrix row with one read and the exact tool sets', async () => {
    const fixture = buildCopilotSkillFixture('inspector-scan-copilot');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // Each physical file publishes exactly once: the set is exactly the root
    // Copilot matrix, the nested Claude layer, and the census-bound
    // companions — with no nested Copilot context, extra-depth,
    // configured-root, or near-miss entry, and no second identity for a
    // second recognizing product.
    const admitted = [
      ...new Set([...fixture.expectedCopilotSkillPaths, ...fixture.expectedClaudeSkillPaths]),
    ];
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      [...admitted, ...fixture.expectedCompanionPaths].sort(),
    );

    // The exact matrix: `.github` is Copilot-only, `.agents` is
    // Codex+Copilot, `.claude` is Claude+Copilot — at the root, where every
    // Copilot surface reads — and the nested `.claude` layer is Claude's
    // alone, through its own documented lazy descendant discovery. No
    // definition carries any other tool set.
    const toolsOf = (path: string): readonly string[] =>
      snapshot.skills
        .flatMap((entry) => entry.definitions)
        .filter((definition) => definition.sourceRelativePath === path)
        .map((definition) => definition.tool)
        .sort();
    expect(toolsOf('.github/skills/ship/SKILL.md')).toEqual(['copilot']);
    expect(toolsOf('.agents/skills/orbit/SKILL.md')).toEqual(['codex', 'copilot']);
    expect(toolsOf('.claude/skills/lander/SKILL.md')).toEqual(['claude', 'copilot']);
    expect(toolsOf('packages/api/.claude/skills/lander-nested/SKILL.md')).toEqual(['claude']);

    // One read per matrix row: a shared candidate is read once however many
    // rules admit it, and companions are read once through the same path.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect([...opened].sort()).toEqual([...admitted, ...fixture.expectedCompanionPaths].sort());
    expect(new Set(opened).size).toBe(opened.length);
  });

  it('attaches deterministic per-tool provenance on a shared physical file', async () => {
    const fixture = buildCopilotSkillFixture('inspector-scan-copilot-provenance');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }

    // One recognition per recognizing product in the closed tool order, each
    // carrying its own admitting rule's provenance — never one merged record
    // and never another product's rule ID. Asserted on the committed graph:
    // provenance is an internal admission record no session response carries.
    expect(
      publication.recognitions
        .filter((recognition) => recognition.sourceRelativePath === '.agents/skills/orbit/SKILL.md')
        .map((recognition) => ({
          tool: recognition.tool,
          ruleIds: recognition.provenances.map((provenance) => provenance.ruleId),
        })),
    ).toEqual([
      { tool: 'copilot', ruleIds: ['copilot.repo.skill'] },
      { tool: 'codex', ruleIds: ['codex.repo.skill'] },
    ]);
  });

  it('groups the shared declared name and states only the surface-dependent Copilot rule', async () => {
    // `.github/skills/ship` and `.claude/skills/lander` both declare `voyage`,
    // which is the name Copilot invokes each by — so Copilot recognizes both
    // files under one name and faces the collision. Its statement is the
    // surface-dependent one, because its CLI documents a first-found winner
    // while VS Code and Cloud document no duplicate precedence (FR-007).
    const fixture = buildCopilotSkillFixture('inspector-scan-copilot-shared-name');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const row = snapshot.skills.find((entry) => entry.name === 'voyage');
    expect(
      row?.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([
      ['.claude/skills/lander/SKILL.md', 'copilot'],
      ['.github/skills/ship/SKILL.md', 'copilot'],
    ]);
    expect(row?.sameNameResolutions).toEqual([
      { tool: 'copilot', resolution: 'surface-dependent' },
    ]);

    // Claude Code reads the same `lander` file, but invokes it by its skill
    // directory whatever the frontmatter declares, so its recognition is its
    // own row and no `voyage` statement is made for it (FR-007).
    const claudeRow = snapshot.skills.find((entry) => entry.name === 'lander');
    expect(
      claudeRow?.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([['.claude/skills/lander/SKILL.md', 'claude']]);
    expect(claudeRow?.sameNameResolutions).toEqual([]);
  });
});

describe('publication authority and relationship targets', () => {
  it('discards a late result after revocation without touching the commit', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-revoked');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    context.coordinator.revokePublicationAuthority(admitted.scanRequestId);
    const publication = await runSourceScan({
      sourceId,
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    await context.coordinator.completeScan(admitted.scanRequestId, {
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
    });
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.sources[0]!.status).toBe('idle');
  });

  it('reads no relationship target: only the shipped plans are executed', async () => {
    const fixture = buildCodexSkillFixture('inspector-scan-targets');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);

    // The shipped rules are the only source of read authority; a path
    // mentioned inside an authored file never becomes a candidate.
    expect(REPOSITORY_INSPECTION_RULES.map((compiled) => compiled.rule.ruleId)).toEqual([
      ...COPILOT_REPOSITORY_RULES.map((compiled) => compiled.rule.ruleId),
      ...CLAUDE_REPOSITORY_RULES.map((compiled) => compiled.rule.ruleId),
      ...CODEX_REPOSITORY_RULES.map((compiled) => compiled.rule.ruleId),
    ]);
    // Every opened path is either a file a shipped plan admitted or a file an
    // admitted skill's census bound. A path merely mentioned inside an authored
    // file is neither, and is never opened.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    const bounded = new Set([...fixture.expectedSkillPaths, ...fixture.expectedCompanionPaths]);
    for (const path of opened) {
      expect(bounded.has(path), `opened outside the shipped plans and censuses: ${path}`).toBe(
        true,
      );
    }
  });
});

describe('the Codex plugin scan (T754)', () => {
  const cleanups: (() => void)[] = [];
  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
  });

  /** Scans the plugin fixture with the shipped catalog and returns the publication. */
  async function scanPluginFixture(prefix: string) {
    const fixture = buildCodexPluginFixture(prefix);
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const publication = await runSourceScan({
      sourceId: 'src-codex-plugins',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    return { fixture, publication };
  }

  it('admits the catalogs and nothing below the plugin roots they name', async () => {
    const { fixture, publication } = await scanPluginFixture('inspector-plugin-scan');
    const pluginRecognitions = publication.recognitions.filter(
      (recognition) => recognition.details.kind === 'plugin',
    );
    const pluginPaths = [
      ...new Set(pluginRecognitions.map((recognition) => recognition.sourceRelativePath)),
    ].toSorted();
    expect(pluginPaths).toEqual([...fixture.expectedPluginPaths].toSorted());
    // The legacy-compatible catalog is one file all three products read: Codex
    // reads it at the location its own page names, it is where Claude documents
    // a repository's own catalog, and it is one of the four locations Copilot
    // checks. One file, three recognitions, one row per name each of them
    // resolves (FR-007).
    expect(
      pluginRecognitions
        .filter(
          (recognition) => recognition.sourceRelativePath === '.claude-plugin/marketplace.json',
        )
        .map((recognition) => recognition.tool)
        .toSorted(),
    ).toEqual(['claude', 'codex', 'copilot']);
    // The components a manifest points at stay relationships: admitting one
    // would read a file on the strength of a value another file wrote, which
    // is exactly what `codex.excluded.plugin-files` forbids.
    for (const componentPath of fixture.componentPaths) {
      expect(pluginPaths, componentPath).not.toContain(componentPath);
    }
    // A manifest at any other depth, a catalog one directory below the root,
    // and another extension are paths no selector reaches.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(pluginPaths, nearMiss).not.toContain(nearMiss);
    }
  });

  it('reads each physical file once, however many rules reached it', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-reads');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const reads: string[] = [];
    const readFile = vi.spyOn(fsIo, 'readFile');
    readFile.mockImplementation(async (path) => {
      reads.push(String(path));
      return realReadFile(path);
    });
    try {
      const publication = await runSourceScan({
        sourceId: 'src-codex-plugin-reads',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      readFile.mockRestore();
    }
    for (const path of fixture.expectedPluginPaths) {
      const absolute = join(fixture.root, ...path.split('/'));
      expect(
        reads.filter((read) => read === absolute),
        path,
      ).toHaveLength(1);
    }
  });

  it('ships nothing for a source the Source does not hold as a directory', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-absent');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const rows = context.session.snapshot().plugins;

    // A Git, npm, absolute, home, or root-escaping source names no directory
    // here, and neither does a local path this repository does not carry: the
    // offering stands as a row and ships nothing (FR-004, FR-024).
    for (const name of [...fixture.nonLocalPluginNames, 'absent-plugin']) {
      const row = rows.find((entry) => entry.name === `${name}@inspector-examples`);
      expect(row, name).toBeDefined();
      expect(pluginRowFiles(row), name).toEqual([]);
    }
  });

  it('keeps a plugin root on the offering that named it, whatever its manifest calls itself', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-divergent');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    // The entry is `renamed-helper` and the manifest below it declares another
    // name. What a reader installs is the entry — `plugin@marketplace` — so the
    // row is the offering's and the manifest is one of the files it ships.
    const row = context.session
      .snapshot()
      .plugins.find((entry) => entry.name === 'renamed-helper@inspector-examples');
    expect(pluginRowFiles(row)).toContain(fixture.divergentNameManifestPath);
    expect(context.session.snapshot().plugins.map((entry) => entry.name)).not.toContain(
      'renamed-helper-v2',
    );
  });

  it('keys a row by the catalog that offers the plugin, not by the name alone', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-marketplace');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const rows = context.session.snapshot().plugins;

    // Both catalogs offer `release-notes` from plugin roots of their own, so
    // the name is two rows and each ships its own files.
    const current = rows.find((entry) => entry.name === 'release-notes@inspector-examples');
    const legacy = rows.find((entry) => entry.name === 'release-notes@inspector-legacy');
    expect(pluginRowFiles(current)).toContain(fixture.objectSourceManifestPath);
    expect(pluginRowFiles(legacy)).toContain(fixture.legacyCatalogManifestPath);
    expect(pluginRowFiles(current)).not.toContain(fixture.legacyCatalogManifestPath);
  });

  it('publishes a malformed manifest as one of the plugin files, with its own diagnostic', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-malformed');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The manifest is one of the files the plugin ships, so nothing parses it
    // and nothing fails: it is published as the ordinary file it is, and the
    // generation stays complete.
    const row = snapshot.plugins.find((entry) => entry.name === 'broken-plugin@inspector-legacy');
    expect(pluginRowFiles(row)).toContain(fixture.malformedManifestPath);
    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === fixture.malformedManifestPath,
    );
    expect(file?.diagnosticIds).toEqual([]);
    expect(
      snapshot.diagnostics.filter(
        (diagnostic) => diagnostic.sourceRelativePath === fixture.malformedManifestPath,
      ),
    ).toEqual([]);
  });

  it('reads the whole plugin root a catalog offering names (T773)', async () => {
    const fixture = buildCodexPluginFixture('inspector-plugin-files');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    // A plugin is its root: the skills, hooks, MCP files, and documents it
    // ships are what an agent is given, and the offering shown without them
    // would show the entry and not the customization
    // (contracts/inspection-path-allowlist.md § Bounded companion census).
    const row = context.session
      .snapshot()
      .plugins.find((entry) => entry.name === 'release-notes@inspector-examples');
    expect(pluginRowFiles(row)).toEqual([
      'plugins/release-notes/.codex-plugin/plugin.json',
      'plugins/release-notes/.mcp.json',
      'plugins/release-notes/README.md',
      'plugins/release-notes/hooks/hooks.json',
      'plugins/release-notes/skills/draft/SKILL.md',
      'plugins/release-notes/skills/draft/reference.md',
    ]);

    // Each is published as the ordinary file it is, and none acquires a
    // recognition: being in a plugin's directory makes a file the plugin's, not
    // a customization of its own (`codex.excluded.plugin-files`).
    const snapshot = context.session.snapshot();
    const published = new Set(snapshot.files.map((file) => file.sourceRelativePath));
    for (const file of pluginRowFiles(row)) {
      expect(published, file).toContain(file);
    }
  });
});

describe('the unified skill inventory (T180)', () => {
  it('publishes every vendor’s rows deterministically with one read per physical file', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-unified');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The published set is the union of the three admitted sets plus the
    // censuses' companions — sorted by path, nothing else (FR-003;
    // contracts/inspection-path-allowlist.md § Bounded companion census).
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      fixture.expectedPublishedPaths,
    );

    // One read per physical file: a path two or three vendors admit is one
    // candidate whose one read every recognizing tool republishes, and the
    // exact raw operands aggregate under the retained raw root — the raw
    // spelling is FR-024's, and the retained raw selection is what bootstrap
    // created (spec.md § Clarifications, generation 0). The broken link is
    // the one published path never opened — its target is already known
    // missing at discovery, so `readFile` is never issued.
    const opened = vi
      .mocked(fsIo.readFile)
      .mock.calls.map((call) =>
        String(call[0])
          .slice(fixture.root.length + 1)
          .split(sep)
          .join('/'),
      )
      .sort();
    expect(opened).toEqual(
      fixture.expectedPublishedPaths.filter((path) => path !== '.agents/skills/broken/SKILL.md'),
    );

    // Each admitted path is recognized by exactly its contracted combination.
    const definitions = snapshot.skills.flatMap((entry) => entry.definitions);
    const recognizable = (paths: readonly string[]): string[] =>
      paths.filter((path) => !fixture.diagnosticOnlyPaths.includes(path));
    for (const path of recognizable(fixture.expectedCodexSkillPaths)) {
      const tools = definitions
        .filter((definition) => definition.sourceRelativePath === path)
        .map((definition) => definition.tool)
        .sort();
      expect(tools, path).toEqual(['codex', 'copilot']);
    }
    for (const path of recognizable(fixture.expectedClaudeSkillPaths)) {
      const tools = definitions
        .filter((definition) => definition.sourceRelativePath === path)
        .map((definition) => definition.tool)
        .sort();
      const shared = fixture.expectedCopilotSkillPaths.includes(path);
      expect(tools, path).toEqual(shared ? ['claude', 'copilot'] : ['claude']);
    }
    expect(
      definitions
        .filter((definition) => definition.sourceRelativePath === '.github/skills/ship/SKILL.md')
        .map((definition) => definition.tool),
    ).toEqual(['copilot']);

    // A second scan of the unchanged tree replaces the generation with the
    // identical publication: order and content are functions of the tree.
    // Diagnostic IDs are each attempt's own records, so they are compared by
    // count rather than by value.
    const withoutDiagnosticIds = (value: unknown): unknown =>
      JSON.parse(
        JSON.stringify(value, (key, entry: unknown) =>
          key === 'diagnosticIds' ? (entry as readonly string[]).length : entry,
        ),
      );
    await scanOnce(context, 'request');
    const again = context.session.snapshot();
    expect(again.repositoryGeneration).toBe(2);
    expect(withoutDiagnosticIds(again.files)).toEqual(withoutDiagnosticIds(snapshot.files));
    expect(withoutDiagnosticIds(again.skills)).toEqual(withoutDiagnosticIds(snapshot.skills));
  });

  it('groups each duplicate declared name under the recognizing tools’ own rules', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-dup-names');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    const byName = new Map(snapshot.skills.map((entry) => [entry.name, entry]));

    // Two `.agents` files declare `alpha`, so Codex and Copilot each face the
    // collision among their own two definitions of that name.
    const alpha = byName.get('alpha')!;
    expect(alpha.definitions).toHaveLength(4);
    expect(alpha.sameNameResolutions.map((resolution) => resolution.tool).sort()).toEqual([
      'codex',
      'copilot',
    ]);

    // `voyage` is declared by a `.claude` file and a `.github` file, and it is
    // the name Copilot invokes both by — so Copilot alone faces the collision,
    // and its three surfaces make the statement `surface-dependent`, never a
    // winner. Claude Code reads the `.claude` file too but invokes it by its
    // skill directory, so its recognition heads a `lander` row of its own
    // (FR-007).
    const voyage = byName.get('voyage')!;
    expect(voyage.definitions.map((definition) => definition.tool).sort()).toEqual([
      'copilot',
      'copilot',
    ]);
    expect(voyage.sameNameResolutions).toEqual([
      { tool: 'copilot', resolution: 'surface-dependent' },
    ]);
    const lander = byName.get('lander')!;
    expect(
      lander.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([['.claude/skills/lander/SKILL.md', 'claude']]);
    expect(lander.sameNameResolutions).toEqual([]);

    // `dup` exists at two depths under `.claude`. The nested declaration is
    // its own context-prefixed row, and Claude's directory-name collision
    // gate spans the two rows: each carries Claude's statement while
    // Copilot, which sees only the root file, states nothing.
    const dup = byName.get('dup')!;
    expect(dup.definitions.map((definition) => definition.tool).sort()).toEqual([
      'claude',
      'copilot',
    ]);
    expect(dup.sameNameResolutions).toEqual([
      { tool: 'claude', resolution: 'all-remain-context-selected' },
    ]);
    const nestedDup = byName.get('packages/api:dup')!;
    expect(nestedDup.definitions.map((definition) => definition.tool)).toEqual(['claude']);
    expect(nestedDup.sameNameResolutions).toEqual([
      { tool: 'claude', resolution: 'all-remain-context-selected' },
    ]);
  });

  it('replaces the skill rows, resolutions, and companions whole on a rescan of a changed tree', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-replace');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const before = context.session.snapshot();
    expect(before.skills.map((entry) => entry.name)).toContain('orbit');
    const orbitBefore = before.skills.find((entry) => entry.name === 'orbit')!;
    expect(orbitBefore.definitions[0]!.companionFiles).toContain('.agents/skills/orbit/README.md');

    // Remove one skill directory — its rows, its same-name statement
    // population, and its companion census all belong to the replaced
    // generation and none of them may survive into the next (FR-030:
    // whole-generation replacement, never a merge).
    rmSync(join(fixture.root, '.agents/skills/orbit'), { recursive: true, force: true });
    await scanOnce(context, 'request');
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(2);
    expect(after.skills.map((entry) => entry.name)).not.toContain('orbit');
    expect(
      after.files.some((file) => file.sourceRelativePath.startsWith('.agents/skills/orbit/')),
    ).toBe(false);
    expect(
      after.skills.flatMap((entry) =>
        entry.definitions.flatMap((definition) => definition.companionFiles),
      ),
    ).not.toContain('.agents/skills/orbit/README.md');
    // The rest of the inventory is the changed tree's own publication, and
    // the other rows' statements survive on their own evidence.
    expect(after.skills.map((entry) => entry.name)).toContain('alpha');
    expect(after.skills.find((entry) => entry.name === 'alpha')!.sameNameResolutions).toHaveLength(
      2,
    );
  });

  it('commits partial with exactly the deterministic file-confined diagnostics', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-partial');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // The NUL-carrying candidate and, when links exist, the broken link are
    // the only failures, each confined to its file (FR-028); every other
    // file publishes complete in the same generation.
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    const diagnosed = snapshot.files.filter((file) => file.diagnosticIds.length > 0);
    expect(diagnosed.map((file) => file.sourceRelativePath)).toEqual(fixture.diagnosticOnlyPaths);
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.sourceRelativePath)).toEqual(
      fixture.diagnosticOnlyPaths,
    );
    // A diagnostic-only file gains no recognition and no definition.
    const definitionPaths = new Set(
      snapshot.skills.flatMap((entry) =>
        entry.definitions.map((definition) => definition.sourceRelativePath),
      ),
    );
    for (const path of fixture.diagnosticOnlyPaths) {
      expect(definitionPaths.has(path), path).toBe(false);
    }
  });

  it('confines an injected read failure to that file while the generation commits', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-inject-read');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const target = join(fixture.root, ...fixture.injectionTargetPath.split('/'));
    // An ordinary read failure on one file — not a resource-exhaustion errno —
    // is file-confined: the walk classifies it `unreadable` and every other
    // file still publishes (FR-028). The passthrough goes to the builtin the
    // seam re-exports; calling the spy itself here would recurse.
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    const targetFile = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.injectionTargetPath,
    )!;
    expect(targetFile.encoding).toBe('unknown');
    expect(targetFile.diagnosticIds).toHaveLength(1);
    // Only the injected file's diagnostic joins the deterministic ones; the
    // other vendors' files are untouched by the injection.
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.sourceRelativePath).sort()).toEqual(
      [...fixture.diagnosticOnlyPaths, fixture.injectionTargetPath].sort(),
    );
    // The complete published set, not a sample of it: every other file is
    // still published, and the one absence the injection causes is the
    // target's own companion — an unreadable candidate is never recognized,
    // so its census never runs and the README beside it is not bound.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      fixture.expectedPublishedPaths.filter((path) => path !== '.agents/skills/orbit/README.md'),
    );
    // And the complete definition set: the unreadable target gains no
    // definition under any tool, while every other recognizable path keeps
    // exactly one definition per contracted recognizing tool.
    const definitionPaths = snapshot.skills
      .flatMap((entry) => entry.definitions.map((definition) => definition.sourceRelativePath))
      .sort();
    for (const path of fixture.expectedPublishedPaths) {
      const expectedCount =
        fixture.diagnosticOnlyPaths.includes(path) ||
        path === fixture.injectionTargetPath ||
        fixture.expectedCompanionPaths.includes(path)
          ? 0
          : [
              fixture.expectedCodexSkillPaths.includes(path),
              fixture.expectedClaudeSkillPaths.includes(path),
              fixture.expectedCopilotSkillPaths.includes(path),
            ].filter(Boolean).length;
      expect(definitionPaths.filter((definitionPath) => definitionPath === path).length, path).toBe(
        expectedCount,
      );
    }
  });

  it('aborts the attempt for an injected recognition failure with no extra read or generation', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-inject-throw');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();
    expect(committed.repositoryGeneration).toBe(1);

    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-inject',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    vi.clearAllMocks();
    // A thrown recognition operation is not confined to one file: no cause
    // inspection reclassifies, retries, or recovers it (FR-029), and the
    // aborted attempt commits nothing while the prior snapshot is retained
    // (FR-030). The first recognition throws, so the companion reads that
    // assembly would issue afterwards must never happen — and the rejection
    // must be the injected object itself, exactly once: a caught-and-rethrown
    // wrapper, or a second recognition after a swallowed first, would each be
    // a domain catch FR-029 forbids.
    const injected = new Error('injected recognition failure');
    let recognizeCalls = 0;
    let readsAtThrow = -1;
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
        recognize: () => {
          recognizeCalls += 1;
          readsAtThrow = vi.mocked(fsIo.readFile).mock.calls.length;
          throw injected;
        },
      }),
    ).rejects.toBe(injected);
    expect(recognizeCalls).toBe(1);
    // The attempt aborted where it threw: no further read was issued.
    expect(readsAtThrow).toBeGreaterThanOrEqual(0);
    expect(vi.mocked(fsIo.readFile).mock.calls.length).toBe(readsAtThrow);

    // Lifecycle handling belongs to the trigger-owning boundary: only the
    // coordinator's failScan records the failed request, and the prior
    // committed snapshot is all that remains.
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'injected recognition failure',
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(1);
    expect(after.files).toEqual(committed.files);
    expect(after.skills).toEqual(committed.skills);
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
  });

  it('aborts the attempt for an injected resource-exhaustion read failure', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-inject-emfile');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();

    // Running out of descriptors is a process condition, not a fact about one
    // file; converting it into that file's diagnostic would misreport the
    // whole repository (traversal.ts § rethrowIfResourceExhaustion).
    const target = join(fixture.root, ...fixture.injectionTargetPath.split('/'));
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected exhaustion'), { code: 'EMFILE' });
      }
      return realReadFile(path, options as never);
    });
    const sourceId = context.session.repositorySourceId;
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
      }),
    ).rejects.toThrow('injected exhaustion');
    // No attempt state leaked: the committed snapshot is unchanged.
    expect(context.session.snapshot().files).toEqual(committed.files);
  });

  it('reports monotonic progress phases across the unified attempt', async () => {
    const fixture = buildAllToolSkillFixture('inspector-scan-progress');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const phases: string[] = [];
    const updates: { visitedEntries: number; readBytes: number; diagnosticCount: number }[] = [];
    const publication = await runSourceScan({
      sourceId: 'src-progress',
      root: fixture.root,
      rootFailureOwner: 'repository',
      onProgress: (update) => {
        phases.push(update.phase);
        updates.push({
          visitedEntries: update.visitedEntries,
          readBytes: update.readBytes,
          diagnosticCount: update.diagnosticCount,
        });
      },
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // The pipeline never reports itself running in reverse: every phase it
    // reported is the next one of the documented sequence or a repeat of the
    // current one (data-model.md § ScanProgress).
    const pipeline = ['deriving', 'enumerating', 'reading', 'recognizing'];
    let stage = 0;
    for (const phase of phases) {
      const rank = pipeline.indexOf(phase);
      expect(rank, `${phase} after ${phases.join(' → ')}`).toBeGreaterThanOrEqual(stage);
      stage = rank;
    }
    // The counters are cumulative for the attempt, and the committed figures
    // are the attempt's own totals rather than its starting zeros.
    for (let index = 1; index < updates.length; index += 1) {
      expect(updates[index]!.visitedEntries).toBeGreaterThanOrEqual(
        updates[index - 1]!.visitedEntries,
      );
      expect(updates[index]!.readBytes).toBeGreaterThanOrEqual(updates[index - 1]!.readBytes);
      expect(updates[index]!.diagnosticCount).toBeGreaterThanOrEqual(
        updates[index - 1]!.diagnosticCount,
      );
    }
    expect(publication.visitedEntries).toBe(updates.at(-1)!.visitedEntries);
    expect(publication.readBytes).toBe(updates.at(-1)!.readBytes);
  });
});

/**
 * The recognitions an instruction row publishes, spelled once for the suites
 * below. A recognition names its tool and the surfaces its admitting rules
 * rest on, and every Copilot rule that reaches a shared instruction filename —
 * `AGENTS.md`, the root `CLAUDE.md` — rests on all three of that product's
 * surfaces (T257).
 */
const COPILOT_ALL_SURFACES = {
  tool: 'copilot',
  surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'],
} as const;
/** Codex's one surface; see {@link COPILOT_ALL_SURFACES}. */
const CODEX_ONLY = { tool: 'codex', surfaces: ['codex-local-clients'] } as const;
/** Claude Code's one surface; see {@link COPILOT_ALL_SURFACES}. */
const CLAUDE_ONLY = { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] } as const;
/**
 * Copilot's CLI alone — what a file admitted by a CLI-context rule names, and
 * the whole point of splitting one documented filename into two rules.
 */
const COPILOT_CLI_ONLY = { tool: 'copilot', surfaces: ['copilot-cli'] } as const;

describe('the committed Codex instructions inventory (T208, activated by T1087)', () => {
  it('commits the static rows, the carrier, and the derived fallbacks with one read each', async () => {
    const fixture = buildCodexInstructionFixture('inspector-scan-instructions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per applicability range — the unit of this kind (data-model.md
    // § Inventory unit) — with its files in Source-relative Path order. The
    // Codex files all sit at the Repository root, so the static pair and the
    // two derived configured fallbacks (T1090) share the root's one range. The
    // declared basename with no on-disk file derives nothing — the ordinary
    // negative, no diagnostic.
    //
    // `AGENTS.md` is Copilot's too, at the root and at the depth the fixture's
    // near miss sits at: Codex's rule is anchored at the root, while Copilot's
    // reaches every depth because all three of its surfaces document reaching a
    // nested file, each in its own way (T255). The nested file is therefore not
    // a near miss for every product — it is a Copilot row of its own range, and
    // the Codex rows beside it are unchanged.
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          { sourceRelativePath: 'AGENTS.md', recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY] },
          { sourceRelativePath: 'AGENTS.override.md', recognitions: [CODEX_ONLY] },
          { sourceRelativePath: 'GUIDE.codex.md', recognitions: [CODEX_ONLY] },
          { sourceRelativePath: 'TEAM_GUIDE.md', recognitions: [CODEX_ONLY] },
        ],
      },
      {
        applicabilityRange: 'docs/**',
        files: [{ sourceRelativePath: 'docs/AGENTS.md', recognitions: [COPILOT_ALL_SURFACES] }],
      },
    ]);
    // The carrier publishes like any candidate since its own candidacy
    // shipped (`codex.repo.config`, T286) — its facts in `files[]`, its
    // contained declarations as the MCP inventory, and never its source text
    // in any snapshot. The published set is the union across products, which
    // is what makes the nested `docs/AGENTS.md` appear at all: a file read
    // once by the walk and listed once, however many products' rules admitted
    // it.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      [
        ...new Set([
          fixture.configCarrierPath,
          ...fixture.expectedInstructionPaths,
          ...fixture.expectedCopilotInstructionPaths,
          ...fixture.expectedDerivedFallbackPaths,
        ]),
      ].sort(),
    );
    // The carrier's MCP row: this fixture's carrier declares fallback
    // basenames and no `[mcp_servers.*]` table, so it sits on the no-name row
    // that closes the list — "declares none", not a failure, which its
    // declaration's own `parseStatus` states (FR-028).
    expect(snapshot.mcp).toEqual([
      {
        name: null,
        declarations: [
          {
            sourceRelativePath: fixture.configCarrierPath,
            tool: 'codex',
            surfaces: ['codex-local-clients'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
        ],
      },
    ]);
    // Nothing published carries a diagnostic and the generation is complete:
    // an absent declared fallback is not a finding.
    expect(snapshot.diagnostics).toEqual([]);
    // The authored override content — the secret, the environment reference —
    // stays out of the committed snapshot entirely: complete source is served
    // only by the detail routes, one file at a time (FR-027), and no
    // environment reference is ever resolved against the process environment.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // The two-stage read set (T1087/T1090): the configuration-read stage
    // opens the carrier first — configuration decides what counts as an
    // instruction file before any candidate is scanned — and that one read is
    // seeded into the walk, so the carrier's own candidacy (T286) is
    // classified from the same bytes instead of a second open: one physical
    // file, one read per attempt (T282), and a generation whose fallback plan
    // and published carrier cannot disagree. The walk then reads every other
    // published file once. Nothing opens a near miss or the absent declared
    // name.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect(opened[0]).toBe(fixture.configCarrierPath);
    expect(opened.filter((path) => path === fixture.configCarrierPath)).toHaveLength(1);
    const walked = opened.slice(1);
    expect([...walked].sort()).toEqual(
      [
        ...new Set([
          ...fixture.expectedInstructionPaths,
          ...fixture.expectedCopilotInstructionPaths,
          ...fixture.expectedDerivedFallbackPaths,
        ]),
      ].sort(),
    );
    // One walk read per physical file, whichever products admitted it: the
    // root `AGENTS.md` carries a Codex and a Copilot recognition and is
    // opened once.
    expect(new Set(walked).size).toBe(walked.length);
    expect(opened).not.toContain(fixture.absentFallbackBasename);
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
  });

  it('configures nothing from a malformed carrier while its failed recognition publishes', async () => {
    const root = createRepositoryFixtureRoot('inspector-scan-instructions-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.codex'), { recursive: true });
    // A document TOML cannot parse: the configuration-read stage configures
    // nothing — no fallback plan, zero fallback reads — while the walk still
    // admits the carrier under its own candidacy (T286). Its MCP recognition
    // fails all-or-nothing with the `recognition-parse-failed` Diagnostic:
    // the declaration rows are unknown rather than absent, the carrier's
    // facts stay published, and the generation commits `partial` (FR-028).
    writeFileSync(join(root, '.codex/config.toml'), 'project_doc_fallback = [unclosed\n', 'utf8');
    writeFileSync(join(root, 'TEAM_GUIDE.md'), '# would-be fallback\n', 'utf8');
    writeFileSync(join(root, 'AGENTS.md'), '# instructions\n', 'utf8');
    const context = bootstrap(root);

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          {
            sourceRelativePath: 'AGENTS.md',
            recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY],
          },
        ],
      },
    ]);
    const carrier = snapshot.files.find((file) => file.sourceRelativePath === '.codex/config.toml');
    expect(carrier).toBeDefined();
    expect(carrier!.diagnosticIds).toHaveLength(1);
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'recognition-parse-failed',
        sourceRelativePath: '.codex/config.toml',
      }),
    ]);
    expect(snapshot.mcp).toEqual([
      {
        name: null,
        declarations: [
          {
            sourceRelativePath: '.codex/config.toml',
            tool: 'codex',
            surfaces: ['codex-local-clients'],
            parseStatus: 'failed',
            diagnosticIds: carrier!.diagnosticIds,
          },
        ],
      },
    ]);
    // The settings row of the same file is untouched by that failure: nothing
    // is read out of the document for it, so nothing can fail to be read and
    // the row carries no diagnostic list at all, while the file entry above
    // carries the MCP kind's record (FR-028). What the row opens is the bytes
    // the author wrote, malformed or not.
    expect(snapshot.settings).toEqual([
      {
        sourceRelativePath: '.codex/config.toml',
        recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
      },
    ]);
    // The would-be fallback stays a plain unadmitted file: a carrier that
    // configures nothing derives nothing.
    expect(snapshot.files.some((file) => file.sourceRelativePath === 'TEAM_GUIDE.md')).toBe(false);
  });

  it('commits one MCP row per declaration on the carrier, named by its authored key', async () => {
    const fixture = buildCodexMcpFixture('inspector-scan-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The MCP inventory: one row per declared server name in name order, each
    // listing the one declaration resolving it, the non-table `mcp_servers`
    // entry omitted whole (data-model.md § Inventory unit). The nested carrier
    // re-declares a root server name and contributes nothing: it belongs to a
    // runtime working directory this product does not select, so no second
    // declaration joins the name's row. The fixture's root `.mcp.json` is
    // Claude's carrier (T309) declaring no server, so the null row closes the
    // list with that one declaration.
    expect(snapshot.mcp).toEqual([
      ...[...fixture.expectedServerNames].sort().map((name) => ({
        name,
        declarations: [
          {
            sourceRelativePath: fixture.carrierPath,
            tool: 'codex',
            surfaces: ['codex-local-clients'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
        ],
      })),
      {
        name: null,
        // The shared root `.mcp.json` is one physical file two products
        // admit — Copilot's CLI workspace rule and Claude's project rule —
        // declaring no server for either, in the closed tool order.
        declarations: [
          {
            sourceRelativePath: '.mcp.json',
            tool: 'copilot',
            // Both Copilot surfaces: the CLI reading and the VS Code 1.118+
            // path/surface provenance share the root carrier's recognition
            // (T362).
            surfaces: ['copilot-vscode', 'copilot-cli'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
          {
            sourceRelativePath: '.mcp.json',
            tool: 'claude',
            surfaces: ['claude-cli-and-ide-clients'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
        ],
      },
    ]);
    // The instruction and fallback rows beside it stay what Phase 15 made
    // them: the carrier's candidacy changes neither.
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          { sourceRelativePath: 'AGENTS.md', recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY] },
          { sourceRelativePath: 'TEAM_GUIDE.md', recognitions: [CODEX_ONLY] },
        ],
      },
    ]);
    // No declared value reaches the snapshot: the secret and the environment
    // reference live in the carrier's declarations, which only the detail
    // serves, one file at a time (FR-026/FR-027).
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // Zero connection: the scan's reads are the carrier's two stages and the
    // published files — no declared command ran and no URL was fetched, so
    // nothing outside the fixture tree was opened.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
  });

  it('publishes the Claude carrier declarations alone, an mcpServers-spelling skill contributing none (T312)', async () => {
    const fixture = buildClaudeMcpFixture('inspector-scan-claude-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The name-grouped inventory (data-model.md § Inventory unit): every row
    // is the root carrier's own. The skill whose frontmatter spells
    // `mcpServers` contributes nothing — Claude documents no such skill
    // field, so its re-declared `context7` joins no row and its `deploy-db`
    // never appears — and the unadmitted owner files reach no recognition at
    // all. No null row exists: the one carrier publishes named rows.
    const claudeDeclaration = (sourceRelativePath: string) => ({
      sourceRelativePath,
      tool: 'claude',
      surfaces: ['claude-cli-and-ide-clients'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    const copilotDeclaration = (sourceRelativePath: string) => ({
      sourceRelativePath,
      tool: 'copilot',
      // The root spelling carries the VS Code 1.118+ provenance beside the
      // CLI admission, so its one Copilot recognition names both surfaces;
      // every other carrier spelling stays the CLI's alone (T362).
      surfaces:
        sourceRelativePath === '.mcp.json' ? ['copilot-vscode', 'copilot-cli'] : ['copilot-cli'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    // The root carrier is one physical file two products admit, so every
    // name it declares lists a Copilot declaration beside Claude's (T342);
    // the subdirectory carrier is a near miss for every product.
    expect(snapshot.mcp).toEqual(
      ['context7', 'docs-http', 'odd'].map((name) => ({
        name,
        declarations: [
          copilotDeclaration(fixture.carrierPath),
          claudeDeclaration(fixture.carrierPath),
        ],
      })),
    );
    // Both skills stay exactly skills: the `mcpServers` spelling is ordinary
    // frontmatter under the skill's own kind, not a second inventory home.
    const skillPaths = snapshot.skills.flatMap((entry) =>
      entry.definitions.map((definition) => definition.sourceRelativePath),
    );
    expect(skillPaths).toContain(fixture.mcpFrontmatterSkillPath);
    expect(skillPaths).toContain(fixture.plainSkillPath);
    // No declared value reaches the snapshot (FR-026/FR-027), and no near
    // miss, unadmitted owner content, or command target was published.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const forbidden of [...fixture.nearMissPaths, ...fixture.unadmittedOwnerPaths]) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === forbidden),
        forbidden,
      ).toBe(false);
    }
  });

  it('groups ancestor workspace declarations and the shared root across products (T342)', async () => {
    const fixture = buildCopilotCliMcpFixture('inspector-scan-copilot-cli-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const copilotDeclaration = (sourceRelativePath: string) => ({
      sourceRelativePath,
      tool: 'copilot',
      // The root spelling carries the VS Code 1.118+ provenance beside the
      // CLI admission, so its one Copilot recognition names both surfaces;
      // every other carrier spelling stays the CLI's alone (T362).
      surfaces:
        sourceRelativePath === '.mcp.json' ? ['copilot-vscode', 'copilot-cli'] : ['copilot-cli'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    const claudeDeclaration = (sourceRelativePath: string) => ({
      sourceRelativePath,
      tool: 'claude',
      surfaces: ['claude-cli-and-ide-clients'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    // The name-grouped inventory across the two root-level spellings and two
    // products' shared root: the duplicate name lists the `.github` carrier —
    // the CLI's alone — and the root carrier as Copilot's and Claude's
    // recognitions of one physical file, with no order projected among them
    // (FR-009). The subdirectory carriers of both spellings are near misses
    // for every product.
    expect(snapshot.mcp).toEqual([
      { name: 'gh-actions', declarations: [copilotDeclaration(fixture.githubCarrierPath)] },
      {
        name: 'odd',
        declarations: [
          copilotDeclaration(fixture.rootCarrierPath),
          claudeDeclaration(fixture.rootCarrierPath),
        ],
      },
      {
        name: fixture.duplicateServerName,
        declarations: [
          copilotDeclaration(fixture.githubCarrierPath),
          copilotDeclaration(fixture.rootCarrierPath),
          claudeDeclaration(fixture.rootCarrierPath),
        ],
      },
    ]);
    // No declared value reaches the snapshot (FR-026/FR-027), and no near
    // miss was published.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
  });

  it('groups the VS Code carrier and the shared root across surfaces (T362)', async () => {
    const fixture = buildCopilotVscodeMcpFixture('inspector-scan-vscode-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The name-grouped inventory: the dedicated `.vscode` carrier's rows are
    // the VS Code surface's alone, the shared root's one Copilot recognition
    // names both surfaces — its CLI reading with the 1.118+ path/surface
    // provenance beside it — and Claude's recognition of the same physical
    // file stands beside them. The duplicate name groups both carriers'
    // declarations into one row with no order projected among them (FR-009).
    const vscodeDeclaration = {
      sourceRelativePath: fixture.vscodeCarrierPath,
      tool: 'copilot',
      surfaces: ['copilot-vscode'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    };
    const rootCopilotDeclaration = {
      sourceRelativePath: fixture.rootCarrierPath,
      tool: 'copilot',
      surfaces: ['copilot-vscode', 'copilot-cli'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    };
    const rootClaudeDeclaration = {
      sourceRelativePath: fixture.rootCarrierPath,
      tool: 'claude',
      surfaces: ['claude-cli-and-ide-clients'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    };
    expect(snapshot.mcp).toEqual([
      { name: 'root-only', declarations: [rootCopilotDeclaration, rootClaudeDeclaration] },
      {
        name: fixture.duplicateServerName,
        declarations: [rootCopilotDeclaration, rootClaudeDeclaration, vscodeDeclaration],
      },
      { name: 'vs-http', declarations: [vscodeDeclaration] },
      { name: 'vs-local', declarations: [vscodeDeclaration] },
    ]);
    // No declared value reaches the snapshot (FR-026/FR-027), and no near
    // miss was published.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
  });

  it('publishes the whole priority wave as one cross-vendor inventory (T392)', async () => {
    const fixture = buildPriorityMcpFixture('inspector-scan-priority-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    const declaration = (
      sourceRelativePath: string,
      tool: 'copilot' | 'claude' | 'codex',
      surfaces: readonly string[],
    ) => ({ sourceRelativePath, tool, surfaces, parseStatus: 'parsed', diagnosticIds: [] });
    const rootCopilot = declaration(fixture.rootCarrierPath, 'copilot', [
      'copilot-vscode',
      'copilot-cli',
    ]);
    const rootClaude = declaration(fixture.rootCarrierPath, 'claude', [
      'claude-cli-and-ide-clients',
    ]);
    const githubCopilot = declaration(fixture.githubCarrierPath, 'copilot', ['copilot-cli']);
    const vscodeCopilot = declaration(fixture.vscodeCarrierPath, 'copilot', ['copilot-vscode']);
    const codexDeclaration = declaration(fixture.codexCarrierPath, 'codex', [
      'codex-local-clients',
    ]);
    // One inventory across all four carriers: name rows in name order, the
    // shared name grouping five declarations — one per `(carrier, tool)` —
    // sorted by carrier path then the closed tool order, with no winner or
    // order projected among them (FR-009). The malformed-command `odd`
    // declaration still lists: a value is published as resolved, never
    // validated.
    expect(snapshot.mcp).toEqual([
      { name: 'codex-db', declarations: [codexDeclaration] },
      { name: 'gh-actions', declarations: [githubCopilot] },
      { name: 'odd', declarations: [rootCopilot, rootClaude] },
      { name: 'root-only', declarations: [rootCopilot, rootClaude] },
      {
        name: fixture.sharedServerName,
        declarations: [codexDeclaration, githubCopilot, rootCopilot, rootClaude, vscodeCopilot],
      },
      // The exact-pair name spans two carriers and three declarations — the
      // smallest row the comparison surface can be opened from.
      {
        name: fixture.pairedServerName,
        declarations: [codexDeclaration, rootCopilot, rootClaude],
      },
      { name: 'vs-docs', declarations: [vscodeCopilot] },
    ]);
    // The published files are the four carriers — one physical item and one
    // read each, the shared root once for its three admissions — beside the
    // two files another kind's rule admits: the settings file, which
    // `claude.repo.permissions` admits for the policy it may declare, and the
    // agent profile, which `copilot.repo.agent` admits for the agent it
    // defines. No near miss or plugin file joins them. Neither of the two
    // reaches an MCP row: the settings file declares no `permissions` object
    // so it carries no recognition at all, and both of their `mcpServers`
    // spellings join no MCP name above. Nothing is diagnosed, and no declared
    // value reaches the snapshot.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual([
      '.claude/settings.json',
      fixture.codexCarrierPath,
      '.github/agents/deploy.md',
      fixture.githubCarrierPath,
      fixture.rootCarrierPath,
      fixture.vscodeCarrierPath,
    ]);
    expect(snapshot.permissions).toEqual([]);
    expect(snapshot.diagnostics).toEqual([]);
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const carrier of [
      fixture.rootCarrierPath,
      fixture.githubCarrierPath,
      fixture.vscodeCarrierPath,
      fixture.codexCarrierPath,
    ]) {
      expect(
        opened.filter((path) => path === join(fixture.root, ...carrier.split('/'))),
        carrier,
      ).toHaveLength(1);
    }
  });

  it('confines one unreadable carrier to its diagnostic while the wave publishes (T392)', async () => {
    const fixture = buildPriorityMcpFixture('inspector-scan-priority-mcp-partial');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    // The `.vscode` carrier's read fails as a file-confined outcome: the
    // walk classifies it unreadable, the generation stays publishable as
    // `partial` with that file's diagnostic, and every other carrier's rows
    // are untouched — while a failure outside one file is the abort the
    // FR-030 suite proves and never a diagnostic.
    const vscodeAbsolute = join(fixture.root, '.vscode', 'mcp.json');
    chmodSync(vscodeAbsolute, 0o000);
    cleanups.push(() => chmodSync(vscodeAbsolute, 0o644));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    const vscodeFile = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.vscodeCarrierPath,
    );
    expect(vscodeFile?.encoding).toBe('unknown');
    expect(vscodeFile?.diagnosticIds).toHaveLength(1);
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'file-unreadable',
        sourceRelativePath: fixture.vscodeCarrierPath,
      }),
    ]);
    // The unreadable carrier holds no recognition, so its names are absent
    // rather than unknown-with-rows, and every other carrier's rows stand.
    const names = snapshot.mcp.map((entry) => entry.name);
    expect(names).not.toContain('vs-docs');
    expect(names).toContain('codex-db');
    expect(names).toContain('gh-actions');
    expect(names).toContain(fixture.sharedServerName);
  });

  it('serves a bare-form shared root as its union, with no no-name row', async () => {
    // One physical root `.mcp.json` in the CLI's bare top-level schema. The
    // Copilot CLI reading publishes both names; Claude's wrapper-only reading
    // parses the same document and finds no `mcpServers` entry. The no-name
    // row is a statement about the file — "this carrier publishes no named
    // declaration" — and this file does publish names, so Claude's empty
    // reading joins no row and the null row does not exist.
    const root = createRepositoryFixtureRoot('inspector-scan-bare-root-mcp');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(
      join(root, '.mcp.json'),
      '{ "alpha": { "command": "npx" }, "beta": { "url": "https://example.invalid/mcp" } }\n',
      'utf8',
    );
    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    expect(snapshot.mcp).toEqual([
      {
        name: 'alpha',
        declarations: [
          {
            sourceRelativePath: '.mcp.json',
            tool: 'copilot',
            // Both Copilot surfaces: the CLI reading and the VS Code 1.118+
            // path/surface provenance share the root carrier's recognition
            // (T362).
            surfaces: ['copilot-vscode', 'copilot-cli'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
        ],
      },
      {
        name: 'beta',
        declarations: [
          {
            sourceRelativePath: '.mcp.json',
            tool: 'copilot',
            // Both Copilot surfaces: the CLI reading and the VS Code 1.118+
            // path/surface provenance share the root carrier's recognition
            // (T362).
            surfaces: ['copilot-vscode', 'copilot-cli'],
            parseStatus: 'parsed',
            diagnosticIds: [],
          },
        ],
      },
    ]);
    // The file-unit detail answers with the union of the readings rather than
    // with whichever recognition sits first: Claude's parsed-empty reading
    // contributes nothing, and the CLI's names are served, not null
    // (contracts/http-api.md § get-mcp-carrier-detail).
    const detail = context.session.mcpCarrierDetail('.mcp.json');
    expect(detail?.servers?.map((server) => server.name)).toEqual(['alpha', 'beta']);
  });

  it('reads no configuration seed through a link into VCS internals', async () => {
    // A `.codex` that is a symbolic link to `.git`: the stage-one
    // configuration read resolves real paths and applies the same VCS
    // exclusion the walk applies, so a config carrier whose real location is
    // VCS-internal derives no plans and publishes no candidate
    // (rules/codex.ts § readConfigurationSeed).
    const root = createRepositoryFixtureRoot('inspector-scan-vcs-seed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.git'), { recursive: true });
    writeFileSync(
      join(root, '.git/config.toml'),
      'project_doc_fallback_filenames = ["EXTRA.md"]\n',
      'utf8',
    );
    writeFileSync(join(root, 'EXTRA.md'), 'configured fallback body\n', 'utf8');
    try {
      symlinkSync(join(root, '.git'), join(root, '.codex'));
    } catch {
      // The platform (or its configuration) does not permit creating the
      // link, so the case under test cannot exist here.
      return;
    }
    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    // No seed: the declared fallback derived nothing, so `EXTRA.md` was never
    // admitted, and the carrier path itself was published by nothing.
    expect(snapshot.files).toEqual([]);
    expect(snapshot.instructions).toEqual([]);
    expect(snapshot.mcp).toEqual([]);
  });

  it('confines a binary instruction candidate to its diagnostic and partial outcome', async () => {
    const root = createRepositoryFixtureRoot('inspector-scan-instructions-binary');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    // The override holds a NUL byte, so its read classifies as binary: the
    // candidate publishes textless with its diagnostic while the readable
    // regular file keeps its row (FR-025/FR-028).
    writeFileSync(join(root, 'AGENTS.override.md'), Buffer.from([0x23, 0x00, 0xff]));
    writeFileSync(join(root, 'AGENTS.md'), '# instructions\n', 'utf8');
    const context = bootstrap(root);

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    // A binary candidate is never recognized — recognition would need content
    // it has none of — so the instructions inventory lists the readable file
    // alone while the binary one stays visible under its own facts.
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          {
            sourceRelativePath: 'AGENTS.md',
            recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY],
          },
        ],
      },
    ]);
    const binary = snapshot.files.find((file) => file.sourceRelativePath === 'AGENTS.override.md');
    expect(binary?.encoding).toBe('binary');
    expect(binary?.diagnosticIds).toHaveLength(1);
    const diagnostic = snapshot.diagnostics.find(
      (record) => record.diagnosticId === binary?.diagnosticIds[0],
    );
    expect(diagnostic?.code).toBe('file-content-binary');
  });

  it('keeps instruction and skill rows apart when both kinds commit together', async () => {
    const fixture = buildCodexInstructionFixture('inspector-scan-instructions-mixed');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    mkdirSync(join(fixture.root, '.agents/skills/greet'), { recursive: true });
    writeFileSync(
      join(fixture.root, '.agents/skills/greet/SKILL.md'),
      '---\nname: greet\n---\n\nHi.\n',
      'utf8',
    );
    const context = bootstrap(fixture.root);

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The Repository root's range holds every static and derived instruction
    // file the fixture publishes; the fixture's nested `docs/AGENTS.md` is a
    // Copilot row of its own range beside it.
    expect(snapshot.instructions.map((entry) => entry.applicabilityRange)).toEqual([
      '**',
      'docs/**',
    ]);
    expect(snapshot.instructions[0]!.files.map((entry) => entry.sourceRelativePath)).toEqual([
      'AGENTS.md',
      'AGENTS.override.md',
      'GUIDE.codex.md',
      'TEAM_GUIDE.md',
    ]);
    // The shared `.agents` spelling makes the skill a Codex and Copilot
    // recognition; neither lands in the instructions inventory, and the
    // instruction files land in no skill row.
    expect(snapshot.skills.map((entry) => entry.name)).toEqual(['greet']);
    expect(
      snapshot.skills.flatMap((entry) =>
        entry.definitions.map((definition) => definition.sourceRelativePath),
      ),
    ).toEqual(['.agents/skills/greet/SKILL.md', '.agents/skills/greet/SKILL.md']);
  });
});

describe('the pure configured-fallback interface (T208)', () => {
  it('retains every declaration completely, with no Inspector numeric cap', () => {
    vi.clearAllMocks();
    const declarations = configuredFallbackBasenamesOf(
      `project_doc_fallback_filenames = [${NUMEROUS_FALLBACK_BASENAMES.map(
        (basename) => `"${basename}"`,
      ).join(', ')}]\n`,
    );
    // Complete retention in authored order: every one of the numerous
    // declarations comes back, duplicates would too, and nothing truncates —
    // capacity belongs to the vendor, the runtime, and the environment, never
    // to an Inspector-defined ceiling.
    expect(declarations).toHaveLength(NUMEROUS_FALLBACK_DECLARATION_COUNT);
    expect(declarations).toEqual([...NUMEROUS_FALLBACK_BASENAMES]);
    // Reading declarations is text, not I/O.
    for (const name of ['lstat', 'readFile', 'readdir', 'realpath', 'stat'] as const) {
      expect(vi.mocked(fsIo[name])).not.toHaveBeenCalled();
    }
  });

  it('keeps a declared name whatever characters it holds, with zero I/O', () => {
    vi.clearAllMocks();
    // A declared value is a name the walk compares to the entries it
    // enumerated, never a path it builds, so a separator, a dot segment, a
    // home marker, or a control character makes a name that matches nothing —
    // and the ordinary names declared beside it still stand. Rejecting the
    // list would lose those for a value that could not have reached anything.
    const declared = ['VALID.md', '~TEAM.md', 'docs/AGENTS.md', '..', 'C:AGENTS.md'];
    expect(
      configuredFallbackBasenamesOf(
        `project_doc_fallback_filenames = [${declared
          .map((basename) => `"${basename}"`)
          .join(', ')}]\n`,
      ),
    ).toEqual(declared);
    for (const name of ['lstat', 'readFile', 'readdir', 'realpath', 'stat'] as const) {
      expect(vi.mocked(fsIo[name])).not.toHaveBeenCalled();
    }
  });

  it('propagates a parse failure unchanged, leaving the prior snapshot intact', async () => {
    const fixture = buildCodexInstructionFixture('inspector-scan-fallback-throw');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const before = context.session.snapshot();

    // The pure reader's own failure: a document TOML cannot parse throws to
    // this caller — the trigger-owning boundary — with no domain catch, no
    // classification, no retry, no Diagnostic, and no partial declaration
    // list escaping.
    let caught: unknown;
    try {
      configuredFallbackBasenamesOf('project_doc_fallback_filenames = [unclosed\n');
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(Error);

    // Only the trigger-owning boundary handles lifecycle: the throw minted no
    // Diagnostic, advanced no generation, and left the committed snapshot as
    // it was.
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(before.repositoryGeneration);
    expect(after.instructions).toEqual(before.instructions);
    expect(after.diagnostics).toEqual(before.diagnostics);
  });
});

describe('the committed Claude instructions inventory (T229)', () => {
  it('commits every depth with one read each, keeping the Codex row unchanged', async () => {
    const fixture = buildClaudeInstructionFixture('inspector-scan-claude-instructions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per applicability range (data-model.md § Inventory unit), each
    // listing its files in Source-relative Path order. The root range holds
    // `AGENTS.md` beside the Claude files — which is the grouping this phase
    // exists for — and `.claude/CLAUDE.md` lands there too, because `.claude`
    // is the rule's own container rather than what the file governs.
    // `AGENTS.md` gains no Claude recognition: Claude Code reads `CLAUDE.md`,
    // not `AGENTS.md`. No row states which documented layer a file belongs
    // to, because that is a relation to a working directory this product does
    // not observe (FR-009).
    //
    // The two shared root files carry a Copilot recognition too, and the
    // Claude-only ones show why that is a statement rather than a filename
    // rule: Copilot documents its `CLAUDE.md` alternative at the repository
    // root alone, so `.claude/CLAUDE.md`, `CLAUDE.local.md`, and every nested
    // `CLAUDE.md` stay Claude's (T256).
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          {
            sourceRelativePath: '.claude/CLAUDE.md',
            recognitions: [CLAUDE_ONLY],
          },
          {
            sourceRelativePath: 'AGENTS.md',
            recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY],
          },
          {
            sourceRelativePath: 'CLAUDE.local.md',
            recognitions: [CLAUDE_ONLY],
          },
          {
            sourceRelativePath: 'CLAUDE.md',
            recognitions: [COPILOT_ALL_SURFACES, CLAUDE_ONLY],
          },
        ],
      },
      {
        applicabilityRange: 'docs/**',
        files: [
          {
            sourceRelativePath: 'docs/CLAUDE.md',
            recognitions: [CLAUDE_ONLY],
          },
        ],
      },
      {
        applicabilityRange: 'packages/api/**',
        files: [
          {
            sourceRelativePath: 'packages/api/.claude/CLAUDE.md',
            recognitions: [CLAUDE_ONLY],
          },
          {
            sourceRelativePath: 'packages/api/CLAUDE.md',
            recognitions: [CLAUDE_ONLY],
          },
        ],
      },
    ]);
    // Every published file is read exactly once, and no near miss — the
    // spelling variants, the VCS internal, or the target the root
    // `CLAUDE.md` names with an `@path` token — is opened at all. This phase
    // emits no relationship, and a relationship target confers no read
    // authority wherever one is emitted.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect([...opened].sort()).toEqual(
      [...fixture.expectedClaudeInstructionPaths, ...fixture.expectedCodexInstructionPaths].sort(),
    );
    expect(new Set(opened).size).toBe(opened.length);
    for (const nearMiss of fixture.nearMissPaths) {
      expect(opened, nearMiss).not.toContain(nearMiss);
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
    // The authored content — the credential, the environment reference, the
    // import token — stays out of the committed snapshot entirely: complete
    // source is served only by the detail routes, one file at a time
    // (FR-027), and no environment reference is ever resolved against the
    // process environment.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain('@docs/setup.md');
  });

  it('confines the malformed file to its own diagnostic and a partial outcome', async () => {
    const fixture = buildClaudeInstructionFixture('inspector-scan-claude-instructions-partial');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // A frontmatter block no parser can read is that recognition's `failed`
    // state: extraction is all-or-nothing, the file keeps its row and its
    // complete readable source, and the failure makes the generation
    // `partial` without touching any other file (FR-028).
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.diagnostics).toHaveLength(1);
    expect(snapshot.diagnostics[0]!.code).toBe('recognition-parse-failed');
    const malformed = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.malformedInstructionPath,
    );
    expect(malformed?.diagnosticIds).toEqual([snapshot.diagnostics[0]!.diagnosticId]);
    for (const file of snapshot.files) {
      if (file.sourceRelativePath !== fixture.malformedInstructionPath) {
        expect(file.diagnosticIds, file.sourceRelativePath).toEqual([]);
      }
    }
    // The failure changes no grouping: a range comes from where a file sits,
    // not from what parsed, so the three ranges and their seven files stay.
    expect(snapshot.instructions.map((entry) => entry.applicabilityRange)).toEqual([
      '**',
      'docs/**',
      'packages/api/**',
    ]);
    expect(snapshot.instructions.flatMap((entry) => entry.files)).toHaveLength(7);
  });
});

describe('the committed Copilot instructions inventory (T248)', () => {
  it('commits every rule’s rows with one read each and no rejected-target access', async () => {
    const fixture = buildCopilotInstructionFixture('inspector-scan-copilot-instructions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const snapshot = context.session.snapshot();

    // One row per applicability range, each listing its files in
    // Source-relative Path order (data-model.md § Inventory unit). The
    // repository-wide file strips the `.github` Copilot keeps it in,
    // `AGENTS.md` keeps its own directory, a path-specific file's range is its
    // own `applyTo` declaration, and one that declares none lists under the
    // no-range row that closes the list — a range read off its path would
    // state governance the vendor gives such a file none of (T265).
    //
    // Which surfaces each recognition names is the phase's subject: the root
    // repository-wide file is admitted by the root-exact rule and by the
    // CLI-context rule, so it names all three, and the one under
    // `packages/api/` names the CLI's alone.
    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '**',
        files: [
          // Claude's own container spelling: `.claude/CLAUDE.md` derives the
          // root's range too, so the shared root row holds it beside the
          // Copilot files (T1092).
          { sourceRelativePath: '.claude/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
          {
            sourceRelativePath: '.github/copilot-instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
          { sourceRelativePath: 'AGENTS.md', recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY] },
          { sourceRelativePath: 'CLAUDE.local.md', recognitions: [CLAUDE_ONLY] },
          { sourceRelativePath: 'CLAUDE.md', recognitions: [COPILOT_ALL_SURFACES, CLAUDE_ONLY] },
          {
            // VS Code documents no `GEMINI.md`, so the editor is absent rather
            // than assumed from the root alternative beside it (T256).
            sourceRelativePath: 'GEMINI.md',
            recognitions: [{ tool: 'copilot', surfaces: ['copilot-cli', 'copilot-cloud'] }],
          },
        ],
      },
      {
        applicabilityRange: 'packages/api/**',
        files: [
          {
            sourceRelativePath: 'packages/api/.github/copilot-instructions.md',
            recognitions: [COPILOT_CLI_ONLY],
          },
          {
            sourceRelativePath: 'packages/api/AGENTS.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
          { sourceRelativePath: 'packages/api/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
        ],
      },
      {
        // A path-specific file names its own range, so `applyTo` keys the row
        // and the file's location decides nothing (T265). The value is the
        // author's pattern as the parser resolved it — quotes resolved, and
        // nothing escaped or normalized by this product.
        applicabilityRange: 'src/frontend/**',
        files: [
          {
            sourceRelativePath: '.github/instructions/frontend.instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
        ],
      },
      {
        // The no-range row closes the list: a path-specific file that
        // declares no usable `applyTo` has no range at all — one because it
        // declares none, one nested likewise, and one whose declarations
        // could not be parsed, with that file's own diagnostic saying why
        // (FR-028).
        applicabilityRange: null,
        files: [
          {
            sourceRelativePath: '.github/instructions/broken.instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
          {
            sourceRelativePath: '.github/instructions/nested/backend.instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
          {
            sourceRelativePath: 'packages/api/.github/instructions/api.instructions.md',
            recognitions: [COPILOT_CLI_ONLY],
          },
        ],
      },
    ]);

    // One read per physical file, and nothing outside the admitted set is
    // opened: an excluded location, a runtime-supplied root, a spelling
    // variant, and an installed package's own instruction file are all
    // rejected by never being matched (T251).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect(new Set(opened).size).toBe(opened.length);
    expect([...opened].sort()).toEqual(
      [
        ...new Set([
          ...Object.values(fixture.expectedCopilotInstructionPaths).flat(),
          ...fixture.expectedClaudeInstructionPaths,
          ...fixture.expectedCodexInstructionPaths,
          // A Claude rule file is read too: no Copilot rule reaches
          // `.claude/rules/`, and `claude.repo.rules` admits it.
          ...fixture.expectedClaudeRulePaths,
        ]),
      ].sort(),
    );
    for (const nearMiss of fixture.copilotNearMissPaths) {
      if (
        fixture.expectedClaudeInstructionPaths.includes(nearMiss) ||
        fixture.expectedCodexInstructionPaths.includes(nearMiss) ||
        fixture.expectedClaudeRulePaths.includes(nearMiss)
      ) {
        // Another product admits it; what the Copilot near-miss list states is
        // that no Copilot rule does, which the rows above assert.
        continue;
      }
      expect(opened, nearMiss).not.toContain(nearMiss);
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }

    // The one file-confined failure is the malformed path-instruction file:
    // its recognition fails all-or-nothing, the generation is `partial`, and
    // every other file keeps its row (FR-028).
    expect(publication.outcome).toBe('partial');
    const diagnosed = snapshot.files.filter((file) => file.diagnosticIds.length > 0);
    expect(diagnosed.map((file) => file.sourceRelativePath)).toEqual([
      fixture.malformedInstructionPath,
    ]);

    // The authored content — the credential, the environment reference —
    // stays out of the committed snapshot entirely: complete source is served
    // only by the detail routes, one file at a time (FR-027), and no
    // environment reference is ever resolved against the process environment.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // The declaration reaches the row as its range and nowhere else: the key
    // itself is the file's own and is published only by the detail route, one
    // file at a time (FR-027).
    expect(serialized).not.toContain('applyTo');
  });
});

describe('a census-listed path a rule independently admits (FR-007)', () => {
  it('keeps its own recognition and leaves the skill census without it', async () => {
    const root = createRepositoryFixtureRoot('inspector-scan-independent-companion');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude/skills/greet'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/greet/SKILL.md'),
      '---\nname: greet\n---\n\nHi.\n',
      'utf8',
    );
    // An ordinary instruction file that happens to sit in a skill's directory:
    // the walk admits it, so it is a customization of its own rather than one
    // of the files that ship with the skill.
    writeFileSync(join(root, '.claude/skills/greet/CLAUDE.md'), '# inside a skill\n', 'utf8');
    // A file no rule admits stays what it is — one of the skill's own files.
    writeFileSync(join(root, '.claude/skills/greet/reference.md'), '# reference\n', 'utf8');
    const context = bootstrap(root);

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    expect(snapshot.instructions).toEqual([
      {
        applicabilityRange: '.claude/skills/greet/**',
        files: [
          {
            sourceRelativePath: '.claude/skills/greet/CLAUDE.md',
            recognitions: [CLAUDE_ONLY],
          },
        ],
      },
    ]);
    // The census keeps the file that has no row of its own and drops the one
    // that does: a skill row that listed the instruction file would state its
    // diagnostics, offer it for comparison, and speak for a file its own kind
    // already publishes.
    expect(
      snapshot.skills.flatMap((entry) =>
        entry.definitions.flatMap((definition) => definition.companionFiles),
      ),
    ).toEqual(['.claude/skills/greet/reference.md', '.claude/skills/greet/reference.md']);
  });
});

describe('the Claude plugin scan (T777)', () => {
  /** Scans the Claude plugin fixture and returns its publishable outcome. */
  async function scanClaudePluginFixture() {
    const fixture = buildClaudePluginFixture('inspector-claude-plugin-scan');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const publication = await runSourceScan({
      sourceId: 'src-claude-plugins',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    return { fixture, publication };
  }

  it('publishes a catalog root that is itself a plugin by placement, both ways', async () => {
    // One directory, two ways in: a catalog offering names it, and the
    // manifest inside it makes the folder a plugin on its own. Both rows are
    // real and both list the file — a plugin is its root, so the manifest is
    // one of the files the offering ships as well as the carrier of the row it
    // heads (contracts/http-api.md § get-session `plugins[]`).
    const root = createRepositoryFixtureRoot('inspector-claude-plugin-both-ways');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(root, '.claude-plugin/marketplace.json'),
      `${JSON.stringify({
        name: 'inspector-examples',
        plugins: [{ name: 'shared', source: { source: 'local', path: './.claude/skills/shared' } }],
      })}\n`,
      'utf8',
    );
    mkdirSync(join(root, '.claude/skills/shared/.claude-plugin'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/shared/.claude-plugin/plugin.json'),
      `${JSON.stringify({ name: 'shared', version: '1.0.0' })}\n`,
      'utf8',
    );
    writeFileSync(join(root, '.claude/skills/shared/notes.md'), '# notes\n', 'utf8');

    const context = bootstrap(root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const rows = context.session.snapshot().plugins;
    const manifestPath = '.claude/skills/shared/.claude-plugin/plugin.json';
    const offered = rows.find((entry) => entry.name === 'shared@inspector-examples');
    const placed = rows.find((entry) => entry.name === 'shared@skills-dir');
    // The shared catalog location, so the offering has a carrier per product.
    expect(offered?.carriers.map((carrier) => carrier.tool)).toEqual([
      'copilot',
      'claude',
      'codex',
    ]);
    expect(new Set(offered?.carriers.map((carrier) => carrier.sourceRelativePath))).toEqual(
      new Set(['.claude-plugin/marketplace.json']),
    );
    expect(placed?.carriers.map((carrier) => carrier.sourceRelativePath)).toEqual([manifestPath]);
    for (const row of [offered, placed]) {
      expect(pluginRowFiles(row)).toEqual([manifestPath, '.claude/skills/shared/notes.md']);
    }
  });

  it('holds a declared root to the entry names its parents hold', async () => {
    // The one path in a scan that nothing enumerated is the root a catalog
    // spelled. A filesystem that compares names loosely resolves a spelling
    // its directories do not hold — macOS is case-insensitive by default — and
    // the files below it would then be published under a path no enumeration
    // produces, and `./Node_Modules/acme` would reach an installed package the
    // census root exclusion is written to keep out.
    const root = createRepositoryFixtureRoot('inspector-claude-plugin-spelling');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(root, '.claude-plugin/marketplace.json'),
      `${JSON.stringify({
        name: 'spelled',
        plugins: [
          { name: 'cased', source: { source: 'local', path: './Node_Modules/acme' } },
          { name: 'exact', source: { source: 'local', path: './plugins/acme' } },
        ],
      })}\n`,
      'utf8',
    );
    mkdirSync(join(root, 'node_modules/acme'), { recursive: true });
    writeFileSync(join(root, 'node_modules/acme/index.js'), 'module.exports = {};\n', 'utf8');
    mkdirSync(join(root, 'plugins/acme'), { recursive: true });
    writeFileSync(join(root, 'plugins/acme/notes.md'), '# notes\n', 'utf8');

    const publication = await runSourceScan({
      sourceId: 'src-claude-plugin-spelling',
      root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const paths = publication.files.map((file) => file.sourceRelativePath);
    expect(paths).toContain('plugins/acme/notes.md');
    // Neither under the spelling that was asked for nor under the one the disk
    // holds: the declaration names no directory this Source has.
    expect(paths).not.toContain('Node_Modules/acme/index.js');
    expect(paths).not.toContain('node_modules/acme/index.js');
  });

  it('keeps what a manifest placement establishes when its text does not parse', async () => {
    // The folder is a plugin because the manifest is in it, so the name, the
    // root, and the manifest's own path are the path's answers and not the
    // parse's. A file that does not parse loses its declared fields and says so
    // with a diagnostic; losing the plugin with them would move it to the row
    // for carriers that resolve no name and take every file below its root off
    // that plugin's page (FR-028).
    const root = createRepositoryFixtureRoot('inspector-claude-plugin-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude/skills/demo/.claude-plugin'), { recursive: true });
    writeFileSync(
      join(root, '.claude/skills/demo/.claude-plugin/plugin.json'),
      '{ "name": "demo",\n',
      'utf8',
    );
    writeFileSync(join(root, '.claude/skills/demo/notes.md'), '# notes\n', 'utf8');
    const publication = await runSourceScan({
      sourceId: 'src-claude-malformed-plugin',
      root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const recognition = publication.recognitions.find(
      (candidate) => candidate.details.kind === 'plugin',
    );
    expect(recognition?.parseStatus).toBe('failed');
    if (recognition?.details.kind !== 'plugin') {
      throw new Error('expected a plugin recognition');
    }
    expect(recognition.details.plugins).toEqual([
      {
        name: 'demo@skills-dir',
        fields: [],
        // The folder holding the manifest is the plugin, whatever the file
        // says, so its files come from a directory of this repository.
        sourceForm: 'repository-directory',
        pluginRoot: '.claude/skills/demo/',
        manifestPaths: ['.claude/skills/demo/.claude-plugin/plugin.json'],
      },
    ]);
    // The root was enumerated too, so the plugin's own page has the file it
    // ships beside the manifest that could not be read.
    expect(publication.files.map((file) => file.sourceRelativePath)).toContain(
      '.claude/skills/demo/notes.md',
    );
  });

  it('admits the catalog and the skills-directory manifest, and nothing else', async () => {
    const { fixture, publication } = await scanClaudePluginFixture();
    const pluginPaths = [
      ...new Set(
        publication.recognitions
          .filter(
            (recognition) => recognition.details.kind === 'plugin' && recognition.tool === 'claude',
          )
          .map((recognition) => recognition.sourceRelativePath),
      ),
    ].toSorted();
    expect(pluginPaths).toEqual([...fixture.expectedPluginPaths].toSorted());
    // A manifest at the repository's own root, one a directory below a skills
    // folder, and one under a nested `.claude/skills` are paths the anchored
    // selector does not reach.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(pluginPaths, nearMiss).not.toContain(nearMiss);
    }
    // A folder with a `SKILL.md` and no manifest is a skill and never a plugin.
    expect(pluginPaths).not.toContain(fixture.plainSkillPath);
    // The components the manifest points at stay relationships: admitting one
    // would read a file on the strength of a value another file wrote, which is
    // exactly what `claude.excluded.plugin-files` forbids.
    for (const componentPath of fixture.componentPaths) {
      expect(pluginPaths, componentPath).not.toContain(componentPath);
    }
  });

  it('publishes what each plugin root ships as that plugin own files', async () => {
    const fixture = buildClaudePluginFixture('inspector-claude-plugin-rows');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const rows = context.session
      .snapshot()
      .plugins.filter((entry) => entry.name?.includes('@') === true);
    const skillsDirectoryRow = rows.find(
      (entry) => entry.name === fixture.skillsDirectoryPluginName,
    );
    // The placement-loaded plugin: named after its folder, carried by the
    // manifest that made the folder a plugin, and shipping every file below it —
    // the manifest included, because a plugin is its root.
    expect(skillsDirectoryRow?.carriers.map((carrier) => carrier.sourceRelativePath)).toEqual([
      fixture.skillsDirectoryManifestPath,
    ]);
    // The manifest is one of the files the row lists as well as the carrier
    // that resolves it: a plugin is its root, so `files` is that whole
    // directory and the row's count is the number of files the plugin's own
    // page lists (contracts/http-api.md § get-session `plugins[]`).
    expect(pluginRowFiles(skillsDirectoryRow)).toContain(fixture.skillsDirectoryManifestPath);
    for (const componentPath of fixture.componentPaths) {
      expect(pluginRowFiles(skillsDirectoryRow), componentPath).toContain(componentPath);
    }

    // A catalog entry's local root: its optional manifest is one of the files,
    // never a carrier of its own.
    const catalogRow = rows.find((entry) => entry.name === 'quality-review@inspector-examples');
    // One catalog file, three products: `.claude-plugin/marketplace.json` is
    // where Claude documents a repository's own catalog, the legacy-compatible
    // location Codex reads, and one of the four Copilot checks — and all three
    // resolve the entry under the same `<plugin>@<marketplace>` name, so the
    // row lists a carrier per recognizing tool, in the closed tool order
    // (FR-007).
    expect(
      catalogRow?.carriers.map((carrier) => `${carrier.sourceRelativePath} ${carrier.tool}`),
    ).toEqual([
      `${fixture.catalogPath} copilot`,
      `${fixture.catalogPath} claude`,
      `${fixture.catalogPath} codex`,
    ]);
    expect(pluginRowFiles(catalogRow)).toContain(fixture.pathSourceManifestPath);

    // The bare-name entry beside it resolves under the catalog's own
    // `metadata.pluginRoot`, so its root ships the plugin's files exactly as a
    // `./` entry's does.
    const bareNameRow = rows.find((entry) => entry.name === 'changelog-writer@inspector-examples');
    expect(pluginRowFiles(bareNameRow)).toContain(fixture.bareNameManifestPath);

    // A root the catalog names that ships no manifest still ships its files.
    const bareRow = rows.find((entry) => entry.name === 'bare-helper@inspector-examples');
    expect(pluginRowFiles(bareRow)).toEqual([fixture.manifestlessRootFilePath]);

    // Every source form that names no directory here: the offering stands and
    // occupies nothing.
    for (const nonLocal of fixture.nonLocalPluginNames) {
      const row = rows.find((entry) => entry.name === `${nonLocal}@inspector-examples`);
      expect(pluginRowFiles(row), nonLocal).toEqual([]);
    }
  });

  it('reads a plugin file once and admits none of them', async () => {
    const { fixture, publication } = await scanClaudePluginFixture();
    const published = publication.files.map((file) => file.sourceRelativePath);
    // Each of the plugin's files is published exactly once, and none of them
    // carries a recognition: it belongs to the plugin whose root holds it, and
    // that plugin already has a row (FR-003).
    for (const componentPath of fixture.componentPaths) {
      expect(
        published.filter((path) => path === componentPath),
        componentPath,
      ).toHaveLength(1);
      expect(
        publication.recognitions.filter(
          (recognition) => recognition.sourceRelativePath === componentPath,
        ),
        componentPath,
      ).toEqual([]);
    }
    // The malformed manifest below a catalog's root is an ordinary published
    // file: nothing parses it, so its trailing comma is no diagnostic (FR-028).
    expect(published).toContain(fixture.malformedManifestPath);
    const malformed = publication.files.find(
      (file) => file.sourceRelativePath === fixture.malformedManifestPath,
    );
    expect(malformed?.diagnosticIds).toEqual([]);
  });
});

describe('the Copilot plugin scan (T799)', () => {
  it('admits the four catalog locations and nothing else', async () => {
    const fixture = buildCopilotPluginFixture('inspector-copilot-plugin-scan');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const publication = await runSourceScan({
      sourceId: 'src-copilot-plugins',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const pluginPaths = [
      ...new Set(
        publication.recognitions
          .filter(
            (recognition) =>
              recognition.details.kind === 'plugin' && recognition.tool === 'copilot',
          )
          .map((recognition) => recognition.sourceRelativePath),
      ),
    ].toSorted();
    expect(pluginPaths).toEqual([...fixture.expectedPluginPaths].toSorted());
    // A manifest at the repository's own root is the plugin this repository
    // publishes, a catalog a directory below the root is a path no selector
    // reaches, and another extension is a third.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(pluginPaths, nearMiss).not.toContain(nearMiss);
    }
    // An extension is never a plugin candidate (`copilot.excluded.cli-extensions`).
    expect(pluginPaths).not.toContain(fixture.extensionPath);
    expect(
      publication.recognitions.filter(
        (recognition) => recognition.sourceRelativePath === fixture.extensionPath,
      ),
    ).toEqual([]);
  });

  it('publishes each plugin root files under the row its catalog entry names', async () => {
    const fixture = buildCopilotPluginFixture('inspector-copilot-plugin-rows');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const rows = context.session.snapshot().plugins;

    // A root using the legacy `.plugin/` form, one using the plain
    // `plugin.json`, and one using the Claude form Copilot also reads: the row
    // is the offering either way, and the manifest is one of its files.
    const review = rows.find((entry) => entry.name === 'quality-review@inspector-examples');
    expect(pluginRowFiles(review)).toContain(fixture.legacyFormManifestPath);
    for (const component of fixture.componentPaths.filter((path) =>
      path.startsWith('plugins/quality-review/'),
    )) {
      expect(pluginRowFiles(review), component).toContain(component);
    }
    const changelog = rows.find((entry) => entry.name === 'changelog-writer@inspector-examples');
    expect(pluginRowFiles(changelog)).toEqual([fixture.rootFormManifestPath]);
    const notes = rows.find((entry) => entry.name === 'release-notes@inspector-examples');
    expect(pluginRowFiles(notes)).toEqual([fixture.claudeFormManifestPath]);

    // Every source form that names no directory here ships nothing.
    for (const nonLocal of fixture.nonLocalPluginNames) {
      const row = rows.find((entry) => entry.name === `${nonLocal}@inspector-examples`);
      expect(pluginRowFiles(row), nonLocal).toEqual([]);
    }

    // The other three catalogs carry one plugin name between them. Two of them
    // publish one marketplace — the same name from two documented locations —
    // so those two are carriers of one row, and the row's files are the union
    // of the two directories they name; the third publishes its own.
    const shared = rows.find((entry) => entry.name === 'shared-helper@inspector-shared');
    // Distinct files, because the catalog at the location every product reads
    // is one carrier per product on this row.
    expect(new Set(shared?.carriers.map((carrier) => carrier.sourceRelativePath))).toEqual(
      new Set(['.claude-plugin/marketplace.json', '.plugin/marketplace.json']),
    );
    expect(pluginRowFiles(shared)).toEqual([
      'plugins/shared/plugin.json',
      'plugins/shared/skills/review/SKILL.md',
      'vendor/shared/NOTICE.md',
      'vendor/shared/plugin.json',
      'vendor/shared/skills/review/SKILL.md',
    ]);
    const github = rows.find((entry) => entry.name === 'shared-helper@inspector-github');
    expect(pluginRowFiles(github)).toEqual([
      'plugins/shared/plugin.json',
      'plugins/shared/skills/review/SKILL.md',
    ]);
  });
});

describe('the unified plugin inventory (T821)', () => {
  /** Scans the unified plugin fixture through a session, returning its snapshot. */
  async function scanUnifiedPlugins(prefix: string) {
    const fixture = buildUnifiedPluginFixture(prefix);
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    return { fixture, snapshot: context.session.snapshot() };
  }

  it('makes one row of a name every product resolves, listing a carrier per tool', async () => {
    const { fixture, snapshot } = await scanUnifiedPlugins('inspector-unified-plugin-rows');
    const shared = snapshot.plugins.find((entry) => entry.name === fixture.sharedPluginName);
    // One catalog file, three products, one row: the row unit is the declared
    // name, and each recognizing tool is a carrier of it in the closed tool
    // order (data-model.md § Inventory unit).
    expect(shared?.carriers.map((carrier) => carrier.tool)).toEqual(['copilot', 'claude', 'codex']);
    expect(new Set(shared?.carriers.map((carrier) => carrier.sourceRelativePath))).toEqual(
      new Set([fixture.sharedCatalogPath]),
    );
    // The files below the root that entry names are the plugin's own, whichever
    // product reached them: two manifest forms, the skill it bundles, its hook
    // file, and its MCP configuration.
    expect(pluginRowFiles(shared)).toEqual([...fixture.sharedPluginFiles].toSorted());

    // Each product's own catalog location carries its own row.
    const codexRow = snapshot.plugins.find((entry) => entry.name === fixture.codexPluginName);
    expect(codexRow?.carriers.map((carrier) => carrier.tool)).toEqual(['codex']);
    const copilotRow = snapshot.plugins.find((entry) => entry.name === fixture.copilotPluginName);
    expect(copilotRow?.carriers.map((carrier) => carrier.tool)).toEqual(['copilot']);
    // And the one plugin a product loads by placement alone.
    const placed = snapshot.plugins.find(
      (entry) => entry.name === fixture.skillsDirectoryPluginName,
    );
    expect(placed?.carriers.map((carrier) => carrier.sourceRelativePath)).toEqual([
      fixture.skillsDirectoryManifestPath,
    ]);

    // A source outside this repository is a row that ships nothing here.
    const remote = snapshot.plugins.find((entry) => entry.name === fixture.nonLocalPluginName);
    expect(pluginRowFiles(remote)).toEqual([]);
  });

  it('reads one physical file once, however many products recognize it', async () => {
    const fixture = buildUnifiedPluginFixture('inspector-unified-plugin-reads');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    vi.clearAllMocks();
    const publication = await runSourceScan({
      sourceId: 'src-unified-plugins',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const path of [fixture.sharedCatalogPath, ...fixture.sharedPluginFiles]) {
      expect(
        opened.filter((opened) => opened === join(fixture.root, ...path.split('/'))),
        path,
      ).toHaveLength(1);
    }
    // Three recognitions come out of that one read of the shared catalog.
    expect(
      publication.recognitions
        .filter((recognition) => recognition.sourceRelativePath === fixture.sharedCatalogPath)
        .map((recognition) => recognition.tool)
        .toSorted(),
    ).toEqual(['claude', 'codex', 'copilot']);
  });

  it('keeps an MCP-shaped value inside a plugin file out of every MCP row', async () => {
    const { fixture, snapshot } = await scanUnifiedPlugins('inspector-unified-plugin-mcp');
    // The plugin's own manifest writes `mcpServers` as an inline map, and the
    // root carries an `.mcp.json` of its own. Neither is an MCP carrier: only
    // the exact locations a product documents are, and a plugin's files are
    // published as the plugin's (data-model.md § Inventory unit).
    const mcpPaths = snapshot.mcp.flatMap((entry) =>
      entry.declarations.map((declaration) => declaration.sourceRelativePath),
    );
    expect(mcpPaths).not.toContain(fixture.inlineMcpManifestPath);
    expect(mcpPaths).not.toContain('plugins/formatter/.mcp.json');
    // They are still the plugin's files, read and published as such.
    expect(
      pluginRowFiles(snapshot.plugins.find((entry) => entry.name === fixture.sharedPluginName)),
    ).toContain('plugins/formatter/.mcp.json');
  });
});

describe('the unified instructions inventory (T270)', () => {
  // Phase 21 consolidates the per-vendor instruction phases into one scan of
  // one tree: the explicit shared-file matrix — `AGENTS.md` Codex+Copilot,
  // root `CLAUDE.md` Claude+Copilot, nested `CLAUDE.md` Claude-only,
  // `CLAUDE.local.md` Claude-only — with the configured fallbacks Phase 15
  // activated, one physical item and one read per admitted file, and the
  // closed publication matrix under injected failures (FR-028, FR-030).

  /** The complete committed instruction rows of the untouched fixture tree. */
  function expectedInstructionRows(fixture: {
    readonly injectionUnreadable?: boolean;
  }): readonly unknown[] {
    // The injected read failure removes exactly the target's recognitions
    // while every other row survives; spelling both states here keeps the
    // partial-continuity case asserting the complete matrix rather than a
    // sample of it.
    const rootFiles = [
      { sourceRelativePath: '.claude/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
      {
        sourceRelativePath: '.github/copilot-instructions.md',
        recognitions: [COPILOT_ALL_SURFACES],
      },
      ...(fixture.injectionUnreadable === true
        ? []
        : [{ sourceRelativePath: 'AGENTS.md', recognitions: [COPILOT_ALL_SURFACES, CODEX_ONLY] }]),
      { sourceRelativePath: 'AGENTS.override.md', recognitions: [CODEX_ONLY] },
      { sourceRelativePath: 'CLAUDE.local.md', recognitions: [CLAUDE_ONLY] },
      { sourceRelativePath: 'CLAUDE.md', recognitions: [COPILOT_ALL_SURFACES, CLAUDE_ONLY] },
      {
        // VS Code documents no `GEMINI.md`, so the editor is absent rather
        // than assumed from the root alternative beside it (T256).
        sourceRelativePath: 'GEMINI.md',
        recognitions: [{ tool: 'copilot', surfaces: ['copilot-cli', 'copilot-cloud'] }],
      },
      { sourceRelativePath: 'GUIDE.codex.md', recognitions: [CODEX_ONLY] },
      { sourceRelativePath: 'TEAM_GUIDE.md', recognitions: [CODEX_ONLY] },
    ];
    return [
      { applicabilityRange: '**', files: rootFiles },
      {
        applicabilityRange: 'docs/**',
        files: [
          { sourceRelativePath: 'docs/AGENTS.md', recognitions: [COPILOT_ALL_SURFACES] },
          // The malformed file keeps its row: what failed is reading its
          // declarations, and a path-derived range comes from where the file
          // sits (FR-028, T1093).
          { sourceRelativePath: 'docs/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
        ],
      },
      {
        applicabilityRange: 'packages/api/**',
        files: [
          { sourceRelativePath: 'packages/api/.claude/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
          {
            sourceRelativePath: 'packages/api/.github/copilot-instructions.md',
            recognitions: [COPILOT_CLI_ONLY],
          },
          { sourceRelativePath: 'packages/api/AGENTS.md', recognitions: [COPILOT_ALL_SURFACES] },
          // The nested `CLAUDE.md` the configuration does not name: Claude's
          // alone, with zero Codex recognition — a configured fallback is an
          // entry name matched at the Repository root, and no filename
          // inference promotes a nested file (Phase 21).
          { sourceRelativePath: 'packages/api/CLAUDE.md', recognitions: [CLAUDE_ONLY] },
        ],
      },
      {
        applicabilityRange: 'src/frontend/**',
        files: [
          {
            sourceRelativePath: '.github/instructions/frontend.instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
        ],
      },
      {
        applicabilityRange: null,
        files: [
          {
            sourceRelativePath: '.github/instructions/nested/backend.instructions.md',
            recognitions: [COPILOT_ALL_SURFACES],
          },
          {
            sourceRelativePath: 'packages/api/.github/instructions/api.instructions.md',
            recognitions: [COPILOT_CLI_ONLY],
          },
        ],
      },
    ];
  }

  it('commits the exact shared-file matrix with one physical item and one read per file', async () => {
    const fixture = buildAllVendorInstructionFixture('inspector-scan-all-instructions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const snapshot = context.session.snapshot();

    // The complete committed rows: one row per applicability range, files in
    // Source-relative Path order, recognitions in the closed tool order with
    // deterministic per-tool surfaces. The binary candidate is recognized by
    // nothing and appears in no row (FR-025).
    expect(snapshot.instructions).toEqual(expectedInstructionRows({}));

    // One physical item per admitted file, published once whatever the number
    // of admitting products, in raw-path order.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      fixture.expectedPublishedPaths,
    );

    // The two-stage read set: the carrier first, as configuration, and that
    // one read seeded into the walk — the carrier's own candidacy (T286)
    // publishes from the same bytes, one read per physical file per attempt
    // (T282) — then the walk reading every other published file exactly
    // once. Nothing opens a near miss, the absent declared
    // name, the nested fallback variant, or the import target (FR-019,
    // QR-003).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect(opened[0]).toBe(fixture.configCarrierPath);
    expect(new Set(opened).size).toBe(opened.length);
    expect([...opened].sort()).toEqual([...fixture.expectedPublishedPaths].sort());
    expect(opened).not.toContain(fixture.absentFallbackBasename);
    expect(opened).not.toContain(fixture.nestedFallbackVariantPath);
    expect(opened).not.toContain(fixture.importTargetPath);
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }

    // Partial publication only after complete traversal: the two
    // deterministic file-confined outcomes — the malformed frontmatter and
    // the binary candidate — are the generation's only diagnostics, and both
    // files stay published under their own facts (FR-028).
    expect(publication.outcome).toBe('partial');
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.sourceRelativePath).sort()).toEqual(
      [fixture.malformedInstructionPath, ...fixture.diagnosticOnlyPaths].sort(),
    );
    const binary = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.diagnosticOnlyPaths[0],
    );
    expect(binary?.encoding).toBe('binary');

    // No authored content in the committed snapshot (FR-027), and no
    // environment reference resolved against the process environment.
    const serialized = JSON.stringify(snapshot);
    expect(serialized).not.toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
  });

  it('confines an injected read failure to that file while the matrix commits partial', async () => {
    const fixture = buildAllVendorInstructionFixture('inspector-scan-all-instructions-read');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const target = join(fixture.root, ...fixture.injectionTargetPath.split('/'));
    // An ordinary read failure on the shared root `AGENTS.md` is
    // file-confined: the walk classifies it `unreadable`, its recognitions —
    // Codex's and Copilot's alike — never come to exist, and every other file
    // of the matrix still publishes (FR-028).
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    // Only the injected file's diagnostic joins the two deterministic ones.
    expect(snapshot.diagnostics.map((diagnostic) => diagnostic.sourceRelativePath).sort()).toEqual(
      [
        fixture.injectionTargetPath,
        fixture.malformedInstructionPath,
        ...fixture.diagnosticOnlyPaths,
      ].sort(),
    );
    // The complete published set is retained — the unreadable target keeps
    // its diagnostic-only item — while its row alone drops out of the matrix.
    expect(snapshot.files.map((file) => file.sourceRelativePath)).toEqual(
      fixture.expectedPublishedPaths,
    );
    expect(snapshot.instructions).toEqual(expectedInstructionRows({ injectionUnreadable: true }));
  });

  it('aborts the attempt for an injected recognition failure, retaining the prior commit', async () => {
    const fixture = buildAllVendorInstructionFixture('inspector-scan-all-instructions-throw');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const committed = context.session.snapshot();
    expect(committed.repositoryGeneration).toBe(1);

    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-inject-instructions',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    vi.clearAllMocks();
    // A thrown recognition operation is not confined to one file: it
    // propagates unchanged with no domain catch, cause classification, or
    // retry (FR-029), the aborted attempt commits no item, derived result,
    // body, or generation, and the prior snapshot is retained (FR-030). The
    // rejection must be the injected object itself, exactly once.
    const injected = new Error('injected recognition failure');
    let recognizeCalls = 0;
    let readsAtThrow = -1;
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
        recognize: () => {
          recognizeCalls += 1;
          readsAtThrow = vi.mocked(fsIo.readFile).mock.calls.length;
          throw injected;
        },
      }),
    ).rejects.toBe(injected);
    expect(recognizeCalls).toBe(1);
    // The attempt aborted where it threw: no further read was issued — no
    // rejected target, no extra config access, no companion.
    expect(readsAtThrow).toBeGreaterThanOrEqual(0);
    expect(vi.mocked(fsIo.readFile).mock.calls.length).toBe(readsAtThrow);

    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'injected recognition failure',
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(1);
    expect(after.files).toEqual(committed.files);
    expect(after.instructions).toEqual(committed.instructions);
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
  });

  it('replaces the instruction rows, fallbacks included, whole on a rescan of a changed tree', async () => {
    const fixture = buildAllVendorInstructionFixture('inspector-scan-all-instructions-rescan');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    expect(context.session.snapshot().instructions).toEqual(expectedInstructionRows({}));

    // The tree changes under the committed generation: the override and one
    // fallback file disappear, and the carrier stops declaring any fallback.
    // A rescan replaces the rows whole — atomic continuity, not an edit of
    // the previous generation (FR-030).
    rmSync(join(fixture.root, 'AGENTS.override.md'));
    rmSync(join(fixture.root, 'TEAM_GUIDE.md'));
    writeFileSync(join(fixture.root, '.codex/config.toml'), 'model = "o4"\n', 'utf8');
    await scanOnce(context, 'request');

    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(2);
    const rootRow = snapshot.instructions.find((entry) => entry.applicabilityRange === '**')!;
    const rootPaths = rootRow.files.map((file) => file.sourceRelativePath);
    expect(rootPaths).not.toContain('AGENTS.override.md');
    expect(rootPaths).not.toContain('TEAM_GUIDE.md');
    // The other on-disk declared name loses its derivation with the
    // declaration, not with its file: `GUIDE.codex.md` still exists and is
    // simply no longer an instruction candidate of anything.
    expect(rootPaths).not.toContain('GUIDE.codex.md');
    expect(snapshot.files.some((file) => file.sourceRelativePath === 'GUIDE.codex.md')).toBe(false);
    // The rest of the matrix survives the rescan unchanged.
    expect(rootPaths).toEqual([
      '.claude/CLAUDE.md',
      '.github/copilot-instructions.md',
      'AGENTS.md',
      'CLAUDE.local.md',
      'CLAUDE.md',
      'GEMINI.md',
    ]);
  });
});

describe('the unified commands inventory (T478)', () => {
  it('reads a shared root command once and publishes one row with both products', async () => {
    const fixture = buildCommandFixture('inspector-scan-commands');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One read per discovered file, whichever products recognized it: the
    // root direct children carry two recognitions from one read (FR-024). The
    // dangling link is the exception the fixture also writes — its read never
    // completes, so it is admitted, unreadable, and recognized by neither.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const path of fixture.sharedCommandPaths) {
      if (path.endsWith('broken-link.md')) {
        continue;
      }
      const absolute = join(fixture.root, ...path.split('/'));
      expect(
        opened.filter((call) => call === absolute),
        path,
      ).toHaveLength(1);
    }

    // One row per name, in name order, with the definitions of each name in
    // Source-relative Path then contracted tool order.
    const rowsByName = new Map(snapshot.prompts.map((entry) => [entry.name, entry]));
    expect([...rowsByName.keys()]).toEqual([...rowsByName.keys()].toSorted());
    // The name two products derive from one command file, and that a prompt
    // file in the same tree declares for itself: three definitions of one
    // name across two files, which is what a row grouped by name is for.
    const shared = rowsByName.get('deploy')!;
    expect(shared.definitions).toEqual([
      {
        sourceRelativePath: '.claude/commands/deploy.md',
        tool: 'copilot',
        surfaces: ['copilot-cli'],
        diagnosticIds: [],
      },
      {
        sourceRelativePath: '.claude/commands/deploy.md',
        tool: 'claude',
        surfaces: ['claude-cli-and-ide-clients'],
        diagnosticIds: [],
      },
      {
        sourceRelativePath: '.github/prompts/deploy.prompt.md',
        tool: 'copilot',
        surfaces: ['copilot-vscode'],
        diagnosticIds: [],
      },
    ]);

    // A nested command is Claude's alone, under the namespaced name only
    // Claude derives.
    const nested = rowsByName.get('frontend:component')!;
    expect(nested.definitions.map((definition) => definition.tool)).toEqual(['claude']);
    expect(nested.definitions[0]!.sourceRelativePath).toBe(
      '.claude/commands/frontend/component.md',
    );

    // Every admitted path reaches a row exactly once per recognizing product,
    // and the excluded locations reach none.
    const definitionPaths = snapshot.prompts.flatMap((entry) =>
      entry.definitions.map((definition) => definition.sourceRelativePath),
    );
    for (const path of fixture.sharedCommandPaths) {
      expect(definitionPaths.filter((candidate) => candidate === path).length, path).toBe(
        path.endsWith('broken-link.md') ? 0 : 2,
      );
    }
    for (const path of fixture.claudeOnlyCommandPaths) {
      expect(definitionPaths.filter((candidate) => candidate === path).length, path).toBe(1);
    }
    for (const path of [...fixture.nearMissPaths, fixture.promptsPath, fixture.nestedCommandPath]) {
      expect(definitionPaths, path).not.toContain(path);
    }
  });

  it('states a malformed shared command once per product and commits the generation', async () => {
    // The extraction runs once per `(file, kind)`, so both products' failed
    // definitions reference the one record while the file's own entry lists
    // it once (FR-028), and the generation is partial rather than aborted.
    const fixture = buildCommandFixture('inspector-scan-commands-malformed');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    // The malformed command file's own definitions, taken out of the row by
    // path: the row's name is also what the tree's malformed prompt file falls
    // back to, and that file is a second extraction with a record of its own.
    const broken = snapshot.prompts.find((entry) => entry.name === 'broken')!;
    const references = broken.definitions
      .filter((definition) => definition.sourceRelativePath === fixture.malformedCommandPath)
      .map((definition) => definition.diagnosticIds);
    expect(references).toHaveLength(2);
    expect(new Set(references.flat()).size).toBe(1);
    const file = snapshot.files.find(
      (candidate) => candidate.sourceRelativePath === fixture.malformedCommandPath,
    )!;
    expect(file.diagnosticIds).toEqual(references[0]);
  });

  it('confines an injected command read failure to that file, and aborts on any other', async () => {
    const fixture = buildCommandFixture('inspector-scan-commands-inject');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const target = join(fixture.root, ...fixture.declaringCommandPath.split('/'));
    // An ordinary read failure on one command file is file-confined: the walk
    // classifies it `unreadable`, it gains no recognition under either
    // product, and every other command still publishes (FR-028).
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    // The unreadable file defines nothing under either product. Its name
    // survives on the row, because a prompt file in the same tree declares the
    // same one — which is the row saying what a reader can still invoke and
    // what it no longer resolves to.
    expect(
      snapshot.prompts.flatMap((entry) =>
        entry.definitions.map((definition) => definition.sourceRelativePath),
      ),
    ).not.toContain(fixture.declaringCommandPath);
    expect(snapshot.prompts.map((entry) => entry.name)).toContain('frontend:component');
    expect(
      snapshot.files.find((file) => file.sourceRelativePath === fixture.declaringCommandPath)!
        .encoding,
    ).toBe('unknown');
    vi.mocked(fsIo.readFile).mockReset();

    // A thrown recognition operation is not confined to one file: it
    // propagates unchanged, commits nothing, and leaves the prior generation
    // as all that remains (FR-029, FR-030).
    const sourceId = context.session.repositorySourceId;
    const admitted = context.coordinator.admitScan(sourceId, {
      kind: 'request',
      operationId: 'op-commands',
    });
    if (admitted.kind !== 'admitted') {
      throw new Error('expected admission');
    }
    const injected = new Error('injected command recognition failure');
    await expect(
      runSourceScan({
        sourceId,
        root: fixture.root,
        rootFailureOwner: `published-source:${sourceId}`,
        recognize: () => {
          throw injected;
        },
      }),
    ).rejects.toBe(injected);
    context.coordinator.failScan(admitted.scanRequestId, {
      kind: 'error',
      message: 'injected command recognition failure',
    });
    const after = context.session.snapshot();
    expect(after.repositoryGeneration).toBe(1);
    expect(after.prompts).toEqual(snapshot.prompts);
    expect(after.snapshotState).toBe('stale-after-fatal-rescan');
  });
});

describe('the unified settings and configuration inventory (T646)', () => {
  it('publishes one row per physical file, each naming the products that recognize it', async () => {
    const fixture = buildCopilotSettingsFixture('inspector-scan-unified-settings');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per recognized file in Source-relative Path order, because the
    // kind's unit is the file — a shared physical file is one row naming two
    // products rather than two rows (data-model.md § Inventory unit).
    expect(snapshot.settings.map((entry) => entry.sourceRelativePath)).toEqual([
      ...fixture.expectedUnifiedSettingsPaths,
    ]);
    const byPath = new Map(snapshot.settings.map((entry) => [entry.sourceRelativePath, entry]));
    expect(
      byPath.get('.claude/settings.json')!.recognitions.map((recognition) => recognition.tool),
    ).toEqual(['copilot', 'claude']);
    expect(
      byPath
        .get('.github/copilot/settings.json')!
        .recognitions.map((recognition) => recognition.tool),
    ).toEqual(['copilot']);
    expect(
      byPath.get(fixture.codexCarrierPath)!.recognitions.map((recognition) => recognition.tool),
    ).toEqual(['codex']);

    // Every settings file is a permanent MCP non-owner; the family's one MCP
    // row is the Codex carrier, which is an explicit carrier.
    expect(snapshot.mcp.map((entry) => entry.name)).toEqual([fixture.codexServerName]);
    expect(
      snapshot.mcp[0]!.declarations.map((declaration) => declaration.sourceRelativePath),
    ).toEqual([fixture.codexCarrierPath]);

    // One physical file, one read — the shared documents included.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    for (const path of fixture.expectedUnifiedSettingsPaths) {
      expect(
        opened.filter((candidate) => candidate === path),
        path,
      ).toHaveLength(1);
    }
    // And no configured target or excluded document was opened at all.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(opened, nearMiss).not.toContain(nearMiss);
    }
  });

  it('keeps a file-confined failure to its own file in a partial generation', async () => {
    const fixture = buildCopilotSettingsFixture('inspector-scan-unified-settings-partial');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const context = bootstrap(fixture.malformedRoot);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    const snapshot = context.session.snapshot();
    // Nothing is read out of a settings document, so a document strict JSON
    // rejects still publishes its row and its source, and the generation is
    // complete rather than partial: there is no extraction here to fail
    // (FR-028).
    expect(publication.outcome).toBe('complete');
    expect(snapshot.settings.map((entry) => entry.sourceRelativePath)).toEqual([
      '.github/copilot/settings.json',
    ]);
    expect(snapshot.diagnostics).toEqual([]);
    const detail = context.session.fileDetail('.github/copilot/settings.json');
    if (detail?.kind !== 'settings/config' || detail.file.encoding !== 'utf-8') {
      throw new Error('expected the readable settings file detail');
    }
    expect(detail.file.sourceText).toContain('"enabledPlugins"');
  });
});

describe('the committed Claude settings inventory (T610)', () => {
  it('publishes both documented layers, each beside its own permissions row', async () => {
    const fixture = buildClaudePermissionsFixture('inspector-scan-claude-settings');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.policylessRoot, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per recognized file, in Source-relative Path order: the shared
    // file and the personal one are two settings files rather than two
    // spellings of one (data-model.md § Inventory unit). Each row names both
    // products, because the Copilot CLI documents reading these same two
    // documents for the shared cross-tool subset — one physical file, one
    // read, one recognition per product (T645).
    expect(snapshot.settings).toEqual([
      {
        sourceRelativePath: fixture.declaringCarrierPath,
        recognitions: [
          { tool: 'copilot', surfaces: ['copilot-cli'] },
          { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] },
        ],
      },
      {
        sourceRelativePath: fixture.localCarrierPath,
        recognitions: [
          { tool: 'copilot', surfaces: ['copilot-cli'] },
          { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] },
        ],
      },
    ]);
    // The permissions rows of the same two files are unchanged by the settings
    // rows beside them: two rules over one candidate change neither neighbour.
    expect(snapshot.permissions.map((entry) => entry.sourceRelativePath)).toEqual([
      fixture.declaringCarrierPath,
      fixture.localCarrierPath,
    ]);
    // One physical file, one read: the settings recognition adds no second
    // open of either document.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    for (const path of [fixture.declaringCarrierPath, fixture.localCarrierPath]) {
      expect(
        opened.filter((candidate) => candidate === path),
        path,
      ).toHaveLength(1);
    }
    // Zero reads of what the documents declare: a hook command, a status-line
    // script, and every spelling variant beside them.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(opened, nearMiss).not.toContain(nearMiss);
    }
  });

  it('gives a settings file that declares no policy a settings row and no permissions row', async () => {
    const fixture = buildClaudePermissionsFixture('inspector-scan-claude-settings-policyless');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.policylessRoot, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const context = bootstrap(fixture.policylessRoot);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // A file declaring no `permissions` object is still the settings document
    // it is; what it is not is a policy row, because a policy nobody wrote is
    // not an empty policy.
    expect(snapshot.settings.map((entry) => entry.sourceRelativePath)).toEqual([
      '.claude/settings.json',
      '.claude/settings.local.json',
    ]);
    expect(snapshot.permissions).toEqual([]);
  });

  it('keeps the settings row of a document strict JSON cannot read', async () => {
    const fixture = buildClaudePermissionsFixture('inspector-scan-claude-settings-malformed');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.policylessRoot, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const context = bootstrap(fixture.malformedRoot);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // The permissions extraction failed all-or-nothing, which makes the
    // generation partial; the settings row reads nothing out of the document,
    // so it stands with no diagnostic of its own (FR-028).
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.settings).toEqual([
      {
        sourceRelativePath: '.claude/settings.json',
        recognitions: [
          { tool: 'copilot', surfaces: ['copilot-cli'] },
          { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] },
        ],
      },
    ]);
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'recognition-parse-failed',
        sourceRelativePath: '.claude/settings.json',
      }),
    ]);
    // And the document still reaches its own detail whole, because that row's
    // subject is the file rather than the block a parser rejected.
    const detail = context.session.fileDetail('.claude/settings.json');
    if (detail?.kind !== 'settings/config' || detail.file.encoding !== 'utf-8') {
      throw new Error('expected the readable settings file detail');
    }
    expect(detail.file.sourceText).toContain('"permissions"');
  });
});

describe('the committed Codex settings inventory (T581)', () => {
  it('publishes the carrier under both of its rows from one read', async () => {
    const fixture = buildCodexMcpFixture('inspector-scan-codex-settings');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    vi.clearAllMocks();

    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per recognized file, because the kind's unit is the file
    // (data-model.md § Inventory unit): the one carrier, named by its path.
    expect(snapshot.settings).toEqual([
      {
        sourceRelativePath: fixture.carrierPath,
        recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
      },
    ]);
    // The MCP rows of the same file are unchanged by the settings row beside
    // them, and the configured fallback still derived its own candidate: two
    // rules over one candidate change neither neighbour. Filtered to the rows
    // the carrier declares, because the tree also holds Claude's own
    // `.mcp.json`, whose no-name row closes the list.
    expect(
      snapshot.mcp
        .filter((entry) =>
          entry.declarations.some(
            (declaration) => declaration.sourceRelativePath === fixture.carrierPath,
          ),
        )
        .map((entry) => entry.name),
    ).toEqual(fixture.expectedServerNames);
    for (const derived of fixture.expectedDerivedFallbackPaths) {
      expect(
        snapshot.instructions.some((entry) =>
          entry.files.some((file) => file.sourceRelativePath === derived),
        ),
        derived,
      ).toBe(true);
    }
    // One physical file, one read: the settings recognition adds no second
    // open of the carrier, and the configuration-read stage's own read is the
    // seeded one the walk reuses (T282).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect(opened.filter((path) => path === fixture.carrierPath)).toHaveLength(1);
    // Zero reads of the targets the document declares: read authority comes
    // from a matcher alone, so a configured path reaches nothing
    // (contracts/inspection-path-allowlist.md § Read authorization).
    for (const nearMiss of fixture.nearMissPaths) {
      expect(opened, nearMiss).not.toContain(nearMiss);
    }
  });

  it('lists the carrier in no other kind and outside the files in no kind', async () => {
    const fixture = buildCodexMcpFixture('inspector-scan-codex-settings-kinds');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The carrier is a settings row and an MCP row, and nothing else: it is
    // no rule file, no permission policy, no agent, and no command.
    expect(snapshot.rules.map((entry) => entry.sourceRelativePath)).not.toContain(
      fixture.carrierPath,
    );
    expect(snapshot.permissions.map((entry) => entry.sourceRelativePath)).not.toContain(
      fixture.carrierPath,
    );
    // It is a recognized file, so it belongs to no "files in no kind"
    // listing; the file entry itself still publishes its own facts (FR-003).
    expect(snapshot.files.some((file) => file.sourceRelativePath === fixture.carrierPath)).toBe(
      true,
    );
  });
});

describe('the committed Codex custom-agent inventory (T509, T524)', () => {
  it('groups the rows by declared name and closes the list with the unnamed files', async () => {
    const fixture = buildCodexAgentFixture('inspector-scan-codex-agents');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One row per declared name, in name order, with the one null-named row
    // last: a name is the unit, so the two files declaring `docs_researcher`
    // are two definitions of one row (data-model.md § Inventory unit).
    expect(snapshot.agents.map((entry) => entry.name)).toEqual([
      ...fixture.expectedAgentNames,
      null,
    ]);
    const shared = snapshot.agents.find((entry) => entry.name === 'docs_researcher')!;
    expect(shared.definitions.map((definition) => definition.sourceRelativePath)).toEqual([
      '.codex/agents/docs-researcher-2.toml',
      '.codex/agents/docs-researcher.toml',
    ]);
    expect(shared.definitions[0]).toEqual({
      sourceRelativePath: '.codex/agents/docs-researcher-2.toml',
      tool: 'codex',
      surfaces: ['codex-local-clients'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    // The null-named row holds the three files publishing no declared name:
    // one declaring none, one declaring a list, and the malformed one whose
    // name is unknown rather than absent (FR-028).
    const unnamed = snapshot.agents.at(-1)!;
    expect(unnamed.name).toBeNull();
    expect(unnamed.definitions.map((definition) => definition.sourceRelativePath)).toEqual([
      ...fixture.unnamedAgentPaths,
    ]);
    // No row is named after a file: the vendor makes the declared `name` the
    // identity and a matching filename convention, so a path-derived name
    // would report an agent the product does not have.
    expect(snapshot.agents.map((entry) => entry.name)).not.toContain('nameless');
  });

  it('keeps a malformed agent readable and diagnosed while the generation stays partial', async () => {
    const fixture = buildCodexAgentFixture('inspector-scan-codex-agents-malformed');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    // A file-confined extraction failure keeps the generation publishable and
    // marks it partial; the file itself stays published with its own facts.
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    const malformed = snapshot.files.find(
      (file) => file.sourceRelativePath === fixture.malformedAgentPath,
    )!;
    expect(malformed.diagnosticIds).toHaveLength(1);
    expect(snapshot.diagnostics).toEqual([
      expect.objectContaining({
        code: 'recognition-parse-failed',
        sourceRelativePath: fixture.malformedAgentPath,
      }),
    ]);
    const failed = snapshot.agents
      .at(-1)!
      .definitions.find(
        (definition) => definition.sourceRelativePath === fixture.malformedAgentPath,
      )!;
    expect(failed.parseStatus).toBe('failed');
    expect(failed.diagnosticIds).toEqual(malformed.diagnosticIds);
    // The complete source is still what the detail serves, and the parse
    // publishes nothing rather than the half that would have parsed (FR-028).
    const detail = context.session.fileDetail(fixture.malformedAgentPath);
    expect(detail).toMatchObject({ kind: 'agent', presentation: null });
    expect(detail!.file.encoding).toBe('utf-8');
  });

  it('serves the two halves of an agent detail and no MCP row for its declarations', async () => {
    const fixture = buildCodexAgentFixture('inspector-scan-codex-agents-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const detail = context.session.fileDetail(fixture.mcpSpellingAgentPath);
    if (detail?.kind !== 'agent' || detail.presentation === null) {
      throw new Error('expected a parsed custom-agent detail');
    }
    // The instructions are the prose half; every other key — the declared
    // `mcp_servers` table and the configured paths among them — is metadata,
    // in the file's own order.
    expect(detail.presentation.instructionsText).toBe('Use the docs server.');
    expect(detail.presentation.metadata.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'config_file',
      'skills',
      'mcp_servers',
    ]);
    // The credential and the environment reference reach the detail exactly as
    // written, and nothing resolves either (FR-025, FR-026).
    const serialized = JSON.stringify(detail.presentation);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // And the MCP inventory is empty: an MCP declaration's home is an explicit
    // carrier, so an agent spelling one joins no MCP row and this tree holds
    // no carrier at all (data-model.md § Inventory unit).
    expect(context.session.snapshot().mcp).toEqual([]);
  });
});

describe('the committed Claude subagent inventory (T529, T544)', () => {
  it('groups the recursive subtree by declared name and lists a duplicate twice', async () => {
    const fixture = buildClaudeAgentFixture('inspector-scan-claude-agents');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // The kind's inventory, not one product's: a `.claude/agents/*.md` direct
    // child is Claude Code's subagent and a Copilot agent profile alike, and
    // the two products name it differently — Claude Code by the declared
    // `name`, Copilot by the configuration file's own name — so a file whose
    // stem differs from its declared name heads a row for each.
    const expectedNames = [
      ...new Set([...fixture.expectedAgentNames, ...fixture.expectedCopilotAgentNames]),
    ].toSorted();
    expect(snapshot.agents.map((entry) => entry.name)).toEqual([...expectedNames, null]);
    // A subfolder changes nothing about identity: the nested `security.md`
    // heads its own name's row, and the two files declaring `debugger` — one
    // at the top of the tree and one in a subfolder — are two definitions of
    // one row, listed in Source-relative Path order with no winner stated.
    const nested = snapshot.agents.find((entry) => entry.name === 'security-reviewer')!;
    expect(nested.definitions.map((definition) => definition.sourceRelativePath)).toEqual([
      '.claude/agents/review/security.md',
    ]);
    // A definition is one recognition — one per `(file, tool)` — so the direct
    // child contributes two: Claude Code's, from its declared `name`, and
    // Copilot's, from the configuration file's own name, which happens to be
    // the same string.
    const duplicate = snapshot.agents.find((entry) => entry.name === 'debugger')!;
    expect(
      duplicate.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([
      ['.claude/agents/debugger.md', 'copilot'],
      ['.claude/agents/debugger.md', 'claude'],
      ['.claude/agents/research/debugger.md', 'claude'],
    ]);
    expect(duplicate.definitions[1]).toEqual({
      sourceRelativePath: '.claude/agents/debugger.md',
      tool: 'claude',
      surfaces: ['claude-cli-and-ide-clients'],
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    // The null-named row holds the file declaring no `name` and the malformed
    // one, and no row is named after a file.
    const unnamed = snapshot.agents.at(-1)!;
    expect(unnamed.name).toBeNull();
    expect(unnamed.definitions.map((definition) => definition.sourceRelativePath)).toEqual([
      ...fixture.unnamedAgentPaths,
    ]);
    // No declared-name product's row is named after a file: `README` heads a
    // row only because Copilot identifies an agent by the configuration file's
    // own name, and the Claude recognition of that same file is in the
    // null-named row above.
    const readme = snapshot.agents.find((entry) => entry.name === 'README')!;
    expect(
      readme.definitions.map((definition) => [definition.sourceRelativePath, definition.tool]),
    ).toEqual([['.claude/agents/README.md', 'copilot']]);
  });

  it('commits no candidate for agent memory, the extra directory, or a nested layer', async () => {
    const fixture = buildClaudeAgentFixture('inspector-scan-claude-agents-negatives');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();
    for (const nearMiss of fixture.nearMissPaths) {
      expect(
        snapshot.files.some((file) => file.sourceRelativePath === nearMiss),
        nearMiss,
      ).toBe(false);
    }
  });

  it('serves an agent that is also an instruction file from the variant it reaches', async () => {
    // `.claude/agents/CLAUDE.md` is a Claude subagent by its directory and a
    // Claude instruction file by its name, so both rules admit it and it is a
    // row in both inventories. `get-file-detail` is addressed by the path
    // alone and answers with the first variant its fixed order reaches — the
    // instructions one — and that variant carries the same two values a
    // Markdown agent's parse produces, so the agent route maps it rather than
    // reporting a parsed file as unparsed (pages/agents/[...path].vue).
    const root = createRepositoryFixtureRoot('inspector-scan-claude-agent-overlap');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude/agents'), { recursive: true });
    writeFileSync(
      join(root, '.claude/agents/CLAUDE.md'),
      '---\nname: overlapping\ndescription: both kinds\n---\n\n# Body\n',
      'utf8',
    );
    const context = bootstrap(root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // Two agent rows and one instruction row, all from the one file: Claude
    // Code's recognition names it by the declared `name` and Copilot's by the
    // configuration file's own name, so one file heads two rows of the agent
    // inventory while its instruction range heads one of that kind's.
    expect(snapshot.agents.map((entry) => entry.name)).toEqual(['CLAUDE', 'overlapping']);
    expect(snapshot.instructions.map((entry) => entry.applicabilityRange)).toEqual([
      '.claude/agents/**',
    ]);
    // The detail the fixed order settles on carries the parse both routes
    // draw, in the shape that variant publishes it.
    const detail = context.session.fileDetail('.claude/agents/CLAUDE.md');
    if (detail?.kind !== 'instructions' || detail.presentation === null) {
      throw new Error('expected a parsed instructions detail');
    }
    expect(detail.presentation.frontmatter.map((entry) => entry.key)).toEqual([
      'name',
      'description',
    ]);
    expect(detail.presentation.bodyText).toBe('\n# Body\n');
  });

  it('serves the two halves of a subagent detail and no MCP row for its frontmatter', async () => {
    const fixture = buildClaudeAgentFixture('inspector-scan-claude-agents-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);

    const detail = context.session.fileDetail(fixture.mcpFrontmatterAgentPath);
    if (detail?.kind !== 'agent' || detail.presentation === null) {
      throw new Error('expected a parsed subagent detail');
    }
    // The frontmatter is the metadata half and the body the instructions half,
    // exactly as the instruction detail splits a Markdown file.
    expect(detail.presentation.metadata.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'mcpServers',
    ]);
    expect(detail.presentation.instructionsText).toContain(
      'Use the Playwright tools to navigate and screenshot.',
    );
    // The credential and the environment reference reach the detail exactly as
    // written, and nothing resolves either (FR-025, FR-026).
    const serialized = JSON.stringify(detail.presentation);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // And the MCP inventory is empty: this tree holds no explicit carrier, so
    // an agent spelling `mcpServers` adds no row (data-model.md § Inventory
    // unit).
    expect(context.session.snapshot().mcp).toEqual([]);

    // The referencing agent's memory scope, preloaded skills, and agent
    // reference are declared values on the same terms.
    const referencing = context.session.fileDetail(fixture.referencingAgentPath);
    if (referencing?.kind !== 'agent' || referencing.presentation === null) {
      throw new Error('expected a parsed subagent detail');
    }
    expect(referencing.presentation.metadata.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'memory',
      'skills',
    ]);
    expect(referencing.presentation.instructionsText).toContain('@code-reviewer');
  });
});

describe('the combined all-kind fixture serves every inventory from one tree (T1099)', () => {
  it('publishes skills, rules, permissions, instructions, and MCP from one scan', async () => {
    const fixture = buildAllCustomizationKindFixture('inspector-scan-all-kinds');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // Each kind's inventory is present in the one snapshot. The per-kind
    // matrices are owned by the dedicated suites above; this test owns the
    // composition.
    expect(snapshot.skills.map((entry) => entry.name)).toContain('orbit');
    expect(snapshot.mcp.map((entry) => entry.name)).toContain(fixture.mcpFixture.sharedServerName);
    // The rule tree's readable files: the dangling link the fixture also
    // writes is admitted but never read, so it gains no recognition and
    // belongs to no kind (FR-028).
    // Two kinds, because the two vendors' same-named files are different
    // things: Claude's `.claude/rules/**` are modular instructions, and
    // Codex's `.codex/rules/*.rules` decide which commands may run outside
    // the sandbox. A dangling link is admitted but never read, so it gains no
    // recognition and belongs to no kind (FR-028).
    expect(snapshot.rules.map((entry) => entry.sourceRelativePath)).toEqual(
      [
        ...fixture.claudeRuleFixture.expectedRulePaths.filter(
          (path) => !path.endsWith('broken-link.md'),
        ),
        ...fixture.instructionFixture.expectedClaudeRulePaths,
      ].sort(),
    );
    // Both vendors' policies in one list: Codex's whole-document `.rules`
    // files and the two Claude settings files that declare a `permissions`
    // block. The dangling link is admitted but never read, so it gains no
    // recognition and no row.
    expect(snapshot.permissions.map((entry) => entry.sourceRelativePath)).toEqual(
      [
        ...fixture.ruleFixture.expectedRulePaths.filter((path) => !path.endsWith('broken.rules')),
        fixture.claudePermissionsFixture.declaringCarrierPath,
        fixture.claudePermissionsFixture.localCarrierPath,
      ].sort(),
    );
    const rootRow = snapshot.instructions.find((entry) => entry.applicabilityRange === '**')!;
    const rootPaths = rootRow.files.map((file) => file.sourceRelativePath);
    expect(rootPaths).toContain('AGENTS.md');

    // The merged root `.codex/config.toml` — the one path two builders own —
    // feeds both of its readers from one document: the configuration stage
    // derives the declared fallbacks from its top-level key, and the MCP
    // stage parses its server tables. Neither read diagnoses it, so the
    // concatenated file is valid TOML for both.
    for (const derived of fixture.instructionFixture.expectedDerivedFallbackPaths) {
      expect(rootPaths).toContain(derived);
    }
    const codexRow = snapshot.mcp.find((entry) => entry.name === 'codex-db')!;
    expect(codexRow.declarations).toEqual([
      {
        sourceRelativePath: '.codex/config.toml',
        tool: 'codex',
        surfaces: ['codex-local-clients'],
        parseStatus: 'parsed',
        diagnosticIds: [],
      },
    ]);
    expect(
      snapshot.diagnostics.some(
        (diagnostic) => diagnostic.sourceRelativePath === '.codex/config.toml',
      ),
    ).toBe(false);
  });
});

describe('the unified custom-agent inventory across all three products (T568)', () => {
  it('lists every product\u2019s agents as one inventory, each definition once', async () => {
    const fixture = buildAllCustomizationKindFixture('inspector-scan-all-agents');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    await scanOnce(context);
    const snapshot = context.session.snapshot();

    // One inventory for the kind, not one per product: every agent row's
    // definitions come from the tools that recognize the file, and all three
    // products contribute.
    const tools = new Set(
      snapshot.agents.flatMap((entry) => entry.definitions.map((definition) => definition.tool)),
    );
    expect([...tools].toSorted()).toEqual(['claude', 'codex', 'copilot']);
    // A definition is one recognition — one per `(file, tool)` — so no pair
    // appears twice however many rules admitted the file.
    const pairs = snapshot.agents.flatMap((entry) =>
      entry.definitions.map((definition) => `${definition.tool} ${definition.sourceRelativePath}`),
    );
    expect(pairs.length).toBe(new Set(pairs).size);
    // The shared file the two Markdown products both define an agent from is
    // two definitions under two different names, because the products
    // identify an agent by different facts.
    const sharedPath = fixture.copilotAgentFixture.sharedClaudeAgentPath;
    const sharedRows = snapshot.agents
      .filter((entry) =>
        entry.definitions.some((definition) => definition.sourceRelativePath === sharedPath),
      )
      .map((entry) => [
        entry.name,
        entry.definitions
          .filter((definition) => definition.sourceRelativePath === sharedPath)
          .map((definition) => definition.tool),
      ]);
    // In the inventory's own name order, which is what puts the Copilot row
    // first: the two names are different strings, not two spellings of one.
    expect(sharedRows).toEqual([
      ['copilot-shared', ['copilot']],
      [fixture.copilotAgentFixture.sharedClaudeAgentDeclaredName, ['claude']],
    ]);
    // No agent row exists for a file the Copilot rule may not reach, and no
    // MCP row is owned by any agent file (data-model.md § Inventory unit).
    const claudeOnly = snapshot.agents.filter((entry) =>
      entry.definitions.some(
        (definition) =>
          definition.sourceRelativePath === fixture.copilotAgentFixture.claudeOnlyAgentPath,
      ),
    );
    expect(claudeOnly.flatMap((entry) => entry.definitions.map((one) => one.tool))).toEqual([
      'claude',
    ]);
    for (const row of snapshot.mcp) {
      for (const declaration of row.declarations) {
        expect(declaration.sourceRelativePath, `${row.name}`).not.toContain('/agents/');
      }
    }
  });

  it('publishes the same rows and the same order on a rescan', async () => {
    const fixture = buildAllCustomizationKindFixture('inspector-scan-all-agents-rescan');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    // Every published fact of the inventory except the diagnostic IDs, which
    // are minted per generation and are the one thing a rescan is expected to
    // change (data-model.md § Diagnostic).
    const rowsOf = (snapshot: ReturnType<typeof context.session.snapshot>) =>
      snapshot.agents.map((entry) => ({
        name: entry.name,
        definitions: entry.definitions.map(({ diagnosticIds: _diagnosticIds, ...rest }) => rest),
      }));
    await scanOnce(context);
    const first = rowsOf(context.session.snapshot());
    await scanOnce(context);
    const second = context.session.snapshot();
    // A second generation over an unchanged tree publishes the identical
    // inventory: nothing an opaque ID or a filesystem read order decides
    // reaches a visible order (data-model.md § ToolRecognition).
    expect(second.repositoryGeneration).toBe(2);
    expect(rowsOf(second)).toEqual(first);
  });

  it('confines an injected agent read failure to that file while the rest commits', async () => {
    const fixture = buildAllCustomizationKindFixture('inspector-scan-all-agents-inject');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const context = bootstrap(fixture.root);
    const injected = fixture.copilotAgentFixture.mcpFrontmatterAgentPath;
    const target = join(fixture.root, ...injected.split('/'));
    // An ordinary read failure on one agent file is file-confined (FR-028):
    // the walk classifies it `unreadable`, so it gains no recognition and no
    // row, while every other agent still publishes. The abort half of the
    // doctrine — a thrown or rejected operation that is not confined to one
    // file — is owned by the suites above, which prove it without a kind of
    // their own.
    vi.mocked(fsIo.readFile).mockImplementation(async (path, options) => {
      if (String(path) === target) {
        throw Object.assign(new Error('injected read failure'), { code: 'EACCES' });
      }
      return realReadFile(path, options as never);
    });
    const { publication } = await scanOnce(context);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable outcome');
    }
    expect(publication.outcome).toBe('partial');
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(1);
    const targetFile = snapshot.files.find((file) => file.sourceRelativePath === injected)!;
    expect(targetFile.encoding).toBe('unknown');
    expect(targetFile.diagnosticIds).toHaveLength(1);
    // No agent definition anywhere names the unreadable file...
    for (const entry of snapshot.agents) {
      for (const definition of entry.definitions) {
        expect(definition.sourceRelativePath, entry.name ?? '(null row)').not.toBe(injected);
      }
    }
    // ...while its siblings under the same rule are untouched.
    const siblings = fixture.copilotAgentFixture.expectedAgentPaths.filter(
      (path) => path !== injected,
    );
    const published = new Set(
      snapshot.agents.flatMap((entry) =>
        entry.definitions.map((definition) => definition.sourceRelativePath),
      ),
    );
    for (const sibling of siblings) {
      expect(published.has(sibling), sibling).toBe(true);
    }
  });
});
