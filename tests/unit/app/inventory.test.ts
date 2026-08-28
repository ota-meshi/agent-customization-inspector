// T058/T181/T271: the browser-side inventory behavior — generation-aware
// filters over the committed snapshot, the request-correlated rescan/retry
// lifecycle, the unified skill and instruction rows, the empty state, and the
// guarantee that a session summary carries no authored source. The authored
// values it does carry are row identities — the skill's declared name and an
// instruction row's declared applicability range (FR-007/FR-027/T1064):
// every other authored value stays behind the one-file-at-a-time detail
// route.
//
// These suites drive the session classes rather than mounting the components.
// The unit project has no single-file-component compiler, and adding one would
// change the shared dependency baseline for a rendering claim the browser
// acceptance suite (`tests/e2e/codex-skills-list.spec.ts`) already makes
// against the real page — including the two claims only a rendered page can
// support: that the escaped root label is presented distinctly from every
// Source-relative item path, and that it is never used as a navigation or
// read locator.
import { describe, expect, it, vi } from 'vitest';
import { ref, shallowRef, type Ref } from 'vue';

import { useInventoryFilters } from '../../../src/app/composables/filters';
import type { NarrowedInventoryRow } from '../../../src/app/composables/filters';
import { SessionViewState } from '../../../src/app/session/view-state';
import type {
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  InstructionInventoryFileDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceDto,
  SourceKind,
} from '../../../src/shared/api-types';
import { SUPPORTED_TOOL_ORDER } from '../../../src/shared/entities';
import type { CustomizationKind, SupportedTool } from '../../../src/shared/entities';

const REPOSITORY_SOURCE: SourceDto = {
  sourceId: 'src-repo',
  kind: 'repository',
  member: null,
  enabled: true,
  status: 'ready',
  boundary: { displayRoot: '/tmp/my\\u0020repo', origin: 'process-cwd' },
  generation: 1,
  scanRequestId: null,
  progress: null,
  diagnosticIds: [],
};

/** A published file: its own facts only, as the snapshot now carries them. */
function file(path: string): CustomizationFileSummaryDto {
  return {
    sourceId: 'src-repo',
    sourceRelativePath: path,
    diagnosticIds: [],
    encoding: 'utf-8',
    hadLeadingBom: false,
    sizeBytes: 12,
  };
}

/**
 * One skill row: a resolved name and the files resolving to it. The row's unit
 * is the name, so a case that wants two rows gives two names and a case that
 * wants one row with two definitions gives one.
 */
function skill(name: string, ...paths: readonly string[]): SkillInventoryEntryDto {
  return skillWithCompanions([], name, ...paths);
}

/** A skill entry whose one definition ships the given companion files. */
function skillWithCompanions(
  companionFiles: readonly string[],
  name: string,
  ...paths: readonly string[]
): SkillInventoryEntryDto {
  return {
    name,
    definitions: paths.map((path) => ({
      sourceId: 'src-repo',
      sourceRelativePath: path,
      tool: 'codex' as const,
      surfaces: [],
      parseStatus: 'parsed' as const,
      diagnosticIds: [],
      companionFiles,
    })),
    sameNameResolutions:
      paths.length > 1 ? [{ tool: 'codex', resolution: 'all-remain' as const }] : [],
  };
}

/**
 * One instruction file under its row, with one recognition per named tool in
 * the given order — the projection publishes the closed tool order, so a case
 * spells the order it expects. The surfaces stand in for whatever the
 * admitting rules rest on; the filter keeps or drops a recognition whole, so
 * one representative surface per tool is enough.
 */
function instructionFile(
  path: string,
  ...tools: readonly ('copilot' | 'claude' | 'codex')[]
): InstructionInventoryFileDto {
  const surfaces = {
    copilot: 'copilot-vscode',
    claude: 'claude-cli-and-ide-clients',
    codex: 'codex-local-clients',
  } as const;
  return {
    sourceRelativePath: path,
    recognitions: tools.map((tool) => ({ tool, surfaces: [surfaces[tool]] })),
  };
}

/** One instructions row: an applicability range and the files governing it. */
/**
 * One instruction row as the filter view publishes it. `rowFileIdentities` is
 * the row's own files, which no narrowing changes, so an expectation for a
 * narrowed row states them rather than deriving them from what survived —
 * that difference is the whole point of the field
 * (`filters.ts` § NarrowedInventoryRow).
 */
function instructionEntry(
  applicabilityRange: string | null,
  files: readonly InstructionInventoryFileDto[],
  rowFilePaths: readonly string[] = files.map((entryFile) => entryFile.sourceRelativePath),
): NarrowedInventoryRow<InstructionInventoryEntryDto> {
  // One Source in these cases, named so the row carries the identity the DTO
  // requires: a row is one range of one Source (FR-030).
  return {
    sourceId: 'src-repo',
    applicabilityRange,
    files,
    rowFileIdentities: rowFilePaths.map((sourceRelativePath) => ({
      sourceId: 'src-repo',
      sourceRelativePath,
    })),
  };
}

/** The `**` row's own files, whichever of them a narrowing leaves. */
const ROOT_RANGE_FILE_PATHS = [
  'AGENTS.md',
  'AGENTS.override.md',
  'CLAUDE.local.md',
  'CLAUDE.md',
  'TEAM_GUIDE.md',
] as const;

function snapshotWith(
  files: readonly CustomizationFileSummaryDto[],
  skills: readonly SkillInventoryEntryDto[] = [],
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    sessionId: 'session-1',
    createdAt: '2026-07-25T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [REPOSITORY_SOURCE],
    files,
    instructions: [],
    rules: [],
    prompts: [],
    plugins: [],
    outputStyles: [],
    permissions: [],
    hooks: [],
    settings: [],
    agents: [],
    skills,
    mcp: [],
    diagnostics: [],
    repositoryGeneration: 1,
    globalGeneration: null,
    snapshotState: 'current',
    staleFailures: [],
    globalControl: null,
    globalEnableInProgress: null,
    globalDisableInProgress: null,
    globalContentEpoch: 0,
    sessionDiagnosticIds: [],
    repositoryFailureDiagnosticId: null,
    ...overrides,
  };
}

// The selection belongs to the caller, so each case declares it the way a page
// does and passes it in; the composable returns only what it derives.
function withSelection(snapshot: Ref<SessionSnapshot | null>) {
  const selection = {
    sourceKind: ref<SourceKind | null>(null),
    tool: ref<SupportedTool | null>(null),
    kind: ref<CustomizationKind | null>(null),
    pathQuery: ref(''),
  };
  const clear = (): void => {
    selection.sourceKind.value = null;
    selection.tool.value = null;
    selection.kind.value = null;
    selection.pathQuery.value = '';
  };
  return { ...selection, clear, view: useInventoryFilters(snapshot, selection) };
}

describe('inventory filters over the committed snapshot', () => {
  it('offers only the tools and kinds the current inventory actually recognizes', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('.agents/skills/greet/SKILL.md')],
        [skill('greet', '.agents/skills/greet/SKILL.md')],
      ),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.availableTools.value).toEqual(['codex']);
    expect(filters.view.availableKinds.value).toEqual(['skill']);
    // The Source axis is the family, not one option per Source: the tool axis
    // beside it already answers which product recognized a file, and this
    // selection rides in the inventory's URL where a Source ID would name
    // nothing after the next launch (`api-text.ts` § SOURCE_KIND_TEXT).
    expect(filters.view.availableSourceKinds.value).toEqual(['repository']);
  });

  it('leaves a skill\u2019s own supporting files out of the unrecognized list', () => {
    // A companion is read and published, but it belongs to the customization
    // whose directory holds it and that customization already has a row.
    // Listing it as a file nothing recognized would be true of the file and
    // misleading about why it was read.
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          file('.agents/skills/greet/SKILL.md'),
          file('.agents/skills/greet/scripts/run.sh'),
          file('other/SKILL.md'),
        ],
        [
          skillWithCompanions(
            ['.agents/skills/greet/scripts/run.sh'],
            'greet',
            '.agents/skills/greet/SKILL.md',
          ),
        ],
      ),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.unrecognizedRows.value.map((row) => row.sourceRelativePath)).toEqual([
      'other/SKILL.md',
    ]);
  });

  it('keeps a companion out of the rows even when its read failed', () => {
    // FR-003 is explicit that an accompanying file acquires no inventory row of
    // its own, and a diagnostic does not buy it one. What names the file is the
    // row of the skill whose directory holds it: `SkillRow` resolves the census
    // files' diagnostics beside the definition, which is what keeps a `partial`
    // generation able to say which file (FR-028).
    const brokenLink: CustomizationFileSummaryDto = {
      sourceId: 'src-repo',
      sourceRelativePath: '.agents/skills/greet/notes.md',
      diagnosticIds: ['diag-unreadable'],
      encoding: 'unknown',
    };
    const binaryAsset: CustomizationFileSummaryDto = {
      sourceId: 'src-repo',
      sourceRelativePath: '.agents/skills/greet/logo.png',
      diagnosticIds: [],
      encoding: 'binary',
      sizeBytes: 12,
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          file('.agents/skills/greet/SKILL.md'),
          file('.agents/skills/greet/scripts/run.sh'),
          brokenLink,
          binaryAsset,
        ],
        [
          skillWithCompanions(
            [
              '.agents/skills/greet/scripts/run.sh',
              '.agents/skills/greet/notes.md',
              '.agents/skills/greet/logo.png',
            ],
            'greet',
            '.agents/skills/greet/SKILL.md',
          ),
        ],
      ),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.unrecognizedRows.value).toEqual([]);
    // The file is still reachable by path, which is how the skill's row states
    // its census diagnostics.
    expect(
      filters.view.filesBySource.value.get('src-repo')?.get('.agents/skills/greet/notes.md')
        ?.diagnosticIds,
    ).toEqual(['diag-unreadable']);
  });

  it('keeps the files in no kind under a tool selection (T1124)', () => {
    // A file here was recognized by no product, so a tool selection cannot
    // match it — and emptying the list under one would take the only statement
    // a `partial` generation has about that file off the page (FR-028). The
    // rows stand, and the page states that a tool filter is applied rather than
    // listing them under a tool none of them belongs to.
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('.agents/skills/greet/SKILL.md'), file('other/SKILL.md')],
        [skill('greet', '.agents/skills/greet/SKILL.md')],
      ),
    );
    const filters = withSelection(snapshot);
    filters.tool.value = 'codex';
    expect(filters.view.effectiveTool.value).toBe('codex');
    expect(filters.view.unrecognizedRows.value.map((row) => row.sourceRelativePath)).toEqual([
      'other/SKILL.md',
    ]);

    // The Source and path filters still apply: each is a fact about the file
    // itself rather than about a recognition it does not have.
    filters.pathQuery.value = 'skills/';
    expect(filters.view.unrecognizedRows.value).toEqual([]);
  });

  it('narrows by source, tool, and Source-relative path', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          file('.agents/skills/greet/SKILL.md'),
          file('packages/api/.agents/skills/deploy/SKILL.md'),
          file('other/SKILL.md'),
        ],
        [
          skill('greet', '.agents/skills/greet/SKILL.md'),
          skill('deploy', 'packages/api/.agents/skills/deploy/SKILL.md'),
        ],
      ),
    );
    const filters = withSelection(snapshot);
    // A file in no kind's inventory is not a skill row at all; it is reported
    // separately so a partial generation can still say which file it was.
    expect(filters.view.activeKind.value).toBe('skill');
    expect(filters.view.skillRows.value).toHaveLength(2);
    expect(filters.view.unrecognizedRows.value.map((row) => row.sourceRelativePath)).toEqual([
      'other/SKILL.md',
    ]);

    filters.pathQuery.value = 'packages/';
    // The filter matches a definition's file, and the row it keeps is the name
    // that definition declares.
    expect(filters.view.skillRows.value.map((row) => row.name)).toEqual(['deploy']);

    filters.pathQuery.value = '';
    filters.tool.value = 'codex';
    expect(filters.view.skillRows.value).toHaveLength(2);
    // The one published family keeps every recognized row; a family the
    // snapshot does not publish is not an option the dropdown offers, so it is
    // ignored rather than silently emptying the list.
    filters.sourceKind.value = 'repository';
    expect(filters.view.skillRows.value).toHaveLength(2);
    filters.sourceKind.value = 'global';
    expect(filters.view.skillRows.value).toHaveLength(2);

    filters.clear();
    expect(filters.view.isNarrowed.value).toBe(false);
    expect(filters.view.skillRows.value).toHaveLength(2);
  });

  it('groups one range’s rows across Sources, keeping each Source its own row', () => {
    // The reader looking for what governs `**` finds one heading for it, with
    // the repository's files and the consented home's under it as two rows —
    // each with its own Source, its own files, and its own comparison, because
    // no comparison pairs files across Sources (FR-011, FR-030).
    const globalSource: SourceDto = {
      ...REPOSITORY_SOURCE,
      sourceId: 'src-global-codex',
      kind: 'global',
      member: 'codex',
      boundary: { displayRoot: '/home/reader/.codex', origin: 'environment' },
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          file('AGENTS.md'),
          file('docs/AGENTS.md'),
          { ...file('AGENTS.md'), sourceId: 'src-global-codex' },
        ],
        [],
        {
          sources: [REPOSITORY_SOURCE, globalSource],
          instructions: [
            // The home's row first in the snapshot, so the group's order is the
            // published Source order rather than the order the rows arrive in.
            {
              ...instructionEntry('**', [instructionFile('AGENTS.md', 'codex')]),
              sourceId: 'src-global-codex',
            },
            instructionEntry('**', [instructionFile('AGENTS.md', 'codex')]),
            instructionEntry('docs/**', [instructionFile('docs/AGENTS.md', 'codex')]),
          ],
        },
      ),
    );
    const filters = withSelection(snapshot);
    // One heading per range, its rows in family-major order — the
    // repository's row before the home's — so the shared family grouping
    // renders the repository block first (`SourceFamilyBlocks.vue`).
    expect(
      filters.view.instructionRangeGroups.value.map((group) => [
        group.applicabilityRange,
        group.rows.map((row) => row.sourceId),
      ]),
    ).toEqual([
      ['**', ['src-repo', 'src-global-codex']],
      ['docs/**', ['src-repo']],
    ]);
    // Two ranges are two list items, and the counts beside the list say two —
    // the rows under them are three.
    expect(filters.view.instructionRangeGroupTotal.value).toBe(2);
    expect(filters.view.kindCounts.value.get('instructions')).toBe(2);
    expect(filters.view.instructionRows.value).toHaveLength(3);

    // A Source filter leaves the range standing with the rows it kept.
    filters.sourceKind.value = 'global';
    expect(
      filters.view.instructionRangeGroups.value.map((group) => [
        group.applicabilityRange,
        group.rows.map((row) => row.sourceId),
      ]),
    ).toEqual([['**', ['src-global-codex']]]);
  });

  it('keeps a family block’s comparison identities when a narrowing drops one home’s row', () => {
    // Two consented homes govern `**`, each with a file only its own tool
    // recognizes. Narrowing to Codex drops the Claude home's row from the
    // rendered block — but the block can still make that comparison, so its
    // published identities keep both files, exactly as a row's own
    // `rowFileIdentities` keeps a narrowed-out member (FR-011, FR-030).
    const claudeSource: SourceDto = {
      ...REPOSITORY_SOURCE,
      sourceId: 'src-global-claude',
      kind: 'global',
      member: 'claude',
      boundary: { displayRoot: '/home/reader/.claude', origin: 'environment' },
    };
    const codexSource: SourceDto = {
      ...REPOSITORY_SOURCE,
      sourceId: 'src-global-codex',
      kind: 'global',
      member: 'codex',
      boundary: { displayRoot: '/home/reader/.codex', origin: 'environment' },
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          { ...file('CLAUDE.md'), sourceId: 'src-global-claude' },
          { ...file('AGENTS.override.md'), sourceId: 'src-global-codex' },
        ],
        [],
        {
          sources: [REPOSITORY_SOURCE, claudeSource, codexSource],
          instructions: [
            {
              ...instructionEntry('**', [instructionFile('CLAUDE.md', 'claude')]),
              sourceId: 'src-global-claude',
            },
            {
              ...instructionEntry('**', [instructionFile('AGENTS.override.md', 'codex')]),
              sourceId: 'src-global-codex',
            },
          ],
        },
      ),
    );
    const filters = withSelection(snapshot);
    filters.tool.value = 'codex';
    const groups = filters.view.instructionRangeGroups.value;
    // The rendered block narrowed to the Codex home's row alone…
    expect(
      groups.map((group) => [group.applicabilityRange, group.rows.map((row) => row.sourceId)]),
    ).toEqual([['**', ['src-global-codex']]]);
    // …while the group's comparison identities still pair both homes' files,
    // in the family-major order.
    expect(groups[0]?.fileIdentities).toEqual([
      { sourceId: 'src-global-claude', sourceRelativePath: 'CLAUDE.md' },
      { sourceId: 'src-global-codex', sourceRelativePath: 'AGENTS.override.md' },
    ]);
  });

  it('lists a Global file no kind holds, at a path a repository row does hold', () => {
    // A consented home's `AGENTS.md` whose bytes were never accepted: it is a
    // published file with a diagnostic and no recognition, so no kind lists it
    // and this list is the only place it can be stated (FR-028). The
    // repository's own `AGENTS.md` has an instruction row, and keying by path
    // alone would let that row account for the home's file — dropping it, and
    // its diagnostic, from the page entirely (FR-030).
    const globalSource: SourceDto = {
      ...REPOSITORY_SOURCE,
      sourceId: 'src-global-codex',
      kind: 'global',
      member: 'codex',
      boundary: { displayRoot: '/home/reader/.codex', origin: 'environment' },
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [
          file('AGENTS.md'),
          {
            sourceId: 'src-global-codex',
            sourceRelativePath: 'AGENTS.md',
            diagnosticIds: ['diag-binary'],
            encoding: 'binary',
            sizeBytes: 3,
          },
        ],
        [],
        {
          sources: [REPOSITORY_SOURCE, globalSource],
          instructions: [instructionEntry('**', [instructionFile('AGENTS.md', 'codex')])],
        },
      ),
    );
    const filters = withSelection(snapshot);
    expect(
      filters.view.unrecognizedRows.value.map((row) => [row.sourceId, row.sourceRelativePath]),
    ).toEqual([['src-global-codex', 'AGENTS.md']]);

    // And the Source families narrow it the way they narrow every other row.
    filters.sourceKind.value = 'repository';
    expect(filters.view.unrecognizedRows.value).toHaveLength(0);
    filters.sourceKind.value = 'global';
    expect(filters.view.unrecognizedRows.value).toHaveLength(1);
  });

  it('narrows to one Source family, keeping the same path in the other out', () => {
    // Two Sources holding one path — the case the family axis exists for. The
    // repository's `AGENTS.md` and the consented home's are different files
    // (FR-030), and choosing a family is how a reader sees one set or the
    // other.
    const globalSource: SourceDto = {
      ...REPOSITORY_SOURCE,
      sourceId: 'src-global-codex',
      kind: 'global',
      member: 'codex',
      boundary: { displayRoot: '/home/reader/.codex', origin: 'environment' },
    };
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('AGENTS.md'), { ...file('AGENTS.md'), sourceId: 'src-global-codex' }],
        [],
        {
          sources: [REPOSITORY_SOURCE, globalSource],
          instructions: [
            instructionEntry('**', [instructionFile('AGENTS.md', 'codex')]),
            {
              ...instructionEntry('**', [instructionFile('AGENTS.md', 'codex')]),
              sourceId: 'src-global-codex',
            },
          ],
        },
      ),
    );
    const filters = withSelection(snapshot);
    // Both families are offered, in the fixed order.
    expect(filters.view.availableSourceKinds.value).toEqual(['repository', 'global']);
    expect(filters.view.instructionRows.value).toHaveLength(2);

    filters.sourceKind.value = 'global';
    expect(filters.view.instructionRows.value.map((row) => row.sourceId)).toEqual([
      'src-global-codex',
    ]);
    filters.sourceKind.value = 'repository';
    expect(filters.view.instructionRows.value.map((row) => row.sourceId)).toEqual(['src-repo']);
    expect(filters.view.isNarrowed.value).toBe(true);

    filters.clear();
    expect(filters.view.instructionRows.value).toHaveLength(2);
  });

  it('matches the path filter case-insensitively without treating it as a locator', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('.agents/skills/Weird Name.v2/SKILL.md')],
        [skill('weird', '.agents/skills/Weird Name.v2/SKILL.md')],
      ),
    );
    const filters = withSelection(snapshot);
    filters.pathQuery.value = 'weird name';
    expect(filters.view.skillRows.value).toHaveLength(1);
    // A leading separator is matched as text, not resolved as a path.
    filters.pathQuery.value = '/etc/passwd';
    expect(filters.view.skillRows.value).toEqual([]);
  });

  it('stops applying a selection the current commit no longer offers', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('.agents/skills/greet/SKILL.md')],
        [skill('greet', '.agents/skills/greet/SKILL.md')],
      ),
    );
    const filters = withSelection(snapshot);
    filters.tool.value = 'codex';
    expect(filters.view.skillRows.value).toHaveLength(1);

    // A failed rescan keeps the previous commit readable, so the filter the
    // user set over it still applies: nothing about their view changed.
    snapshot.value = snapshotWith(
      [file('.agents/skills/greet/SKILL.md')],
      [skill('greet', '.agents/skills/greet/SKILL.md')],
      {
        snapshotState: 'stale-after-fatal-rescan',
        staleFailures: [
          {
            sourceId: 'src-repo',
            failureRef: { kind: 'error', message: 'boom' },
            failedAt: '2026-07-25T00:00:01.000Z',
            baseGeneration: 1,
          },
        ],
      },
    );
    expect(filters.view.skillRows.value).toHaveLength(1);
    expect(filters.view.isNarrowed.value).toBe(true);

    // A commit whose inventory recognizes no Codex stops applying the filter:
    // the new row is listed instead of an empty page filtered by an option the
    // dropdown no longer offers. The field is never written, so the user's
    // choice survives.
    snapshot.value = snapshotWith([file('other/file.md')], [], { repositoryGeneration: 2 });
    expect(filters.view.availableTools.value).toEqual([]);
    // Nothing was recognized, so no kind tab lists it and it is reported apart.
    expect(filters.view.skillRows.value).toEqual([]);
    expect(filters.view.unrecognizedRows.value).toHaveLength(1);
    expect(filters.view.isNarrowed.value).toBe(false);
    expect(filters.tool.value).toBe('codex');

    // Offering it again reapplies the filter on its own.
    snapshot.value = snapshotWith(
      [file('.agents/skills/greet/SKILL.md')],
      [skill('greet', '.agents/skills/greet/SKILL.md')],
      { repositoryGeneration: 3 },
    );
    expect(filters.view.skillRows.value).toHaveLength(1);
    expect(filters.view.isNarrowed.value).toBe(true);
  });
});

describe('settings and configuration rows in the filtered view (T588)', () => {
  /** The one shipped settings row: the Codex carrier, named by its path. */
  const CODEX_CONFIG = {
    sourceId: 'src-repo',
    sourceRelativePath: '.codex/config.toml',
    recognitions: [{ tool: 'codex', surfaces: ['codex-local-clients'] }],
  } as const;

  /** One Claude-recognized skill, so a second tool is offered to filter by. */
  const CLAUDE_SKILL: SkillInventoryEntryDto = {
    name: 'greet',
    definitions: [
      {
        sourceId: 'src-repo',
        sourceRelativePath: '.claude/skills/greet/SKILL.md',
        tool: 'claude',
        surfaces: [],
        parseStatus: 'parsed',
        diagnosticIds: [],
        companionFiles: [],
      },
    ],
    sameNameResolutions: [],
  };

  it('offers the kind, counts its rows, and narrows them by tool and path', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith(
        [file('.codex/config.toml'), file('.claude/skills/greet/SKILL.md')],
        [CLAUDE_SKILL],
        { settings: [CODEX_CONFIG] },
      ),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.availableKinds.value).toEqual(['skill', 'settings/config']);
    expect(filters.view.availableTools.value).toEqual(['claude', 'codex']);
    expect(filters.view.settingsRows.value).toEqual([CODEX_CONFIG]);
    // Counted with every other filter applied but not the kind itself, so the
    // tab reads its own row count rather than the active kind's.
    expect(filters.view.kindCounts.value.get('settings/config')).toBe(1);
    // A tool the row does not carry drops it whole, exactly as the other
    // path-identified rows narrow.
    filters.tool.value = 'claude';
    expect(filters.view.settingsRows.value).toEqual([]);
    expect(filters.view.kindCounts.value.get('settings/config')).toBe(0);
    filters.tool.value = null;
    // The path filter matches the spelling the row renders, case-folded.
    filters.pathQuery.value = 'CONFIG.TOML';
    expect(filters.view.settingsRows.value).toEqual([CODEX_CONFIG]);
    filters.pathQuery.value = 'settings.json';
    expect(filters.view.settingsRows.value).toEqual([]);
  });

  it('narrows a shared row to the recognitions that match, and drops none that does (T647)', () => {
    // A settings document two products recognize is one row naming both, so a
    // tool filter narrows the row rather than removing it — the same rule the
    // instruction rows follow.
    const shared = {
      sourceId: 'src-repo',
      sourceRelativePath: '.claude/settings.json',
      recognitions: [
        { tool: 'copilot', surfaces: ['copilot-cli'] },
        { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] },
      ],
    } as const;
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file('.claude/settings.json'), file('.codex/config.toml')], [], {
        settings: [shared, CODEX_CONFIG],
      }),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.settingsRows.value).toEqual([shared, CODEX_CONFIG]);
    filters.tool.value = 'claude';
    expect(filters.view.settingsRows.value).toEqual([
      { ...shared, recognitions: [shared.recognitions[1]] },
    ]);
    filters.tool.value = 'codex';
    expect(filters.view.settingsRows.value).toEqual([CODEX_CONFIG]);
    filters.tool.value = 'copilot';
    expect(filters.view.settingsRows.value).toEqual([
      { ...shared, recognitions: [shared.recognitions[0]] },
    ]);
  });

  it('leaves a recognized settings file out of the files in no kind', () => {
    // The row is the file, so a file this kind recognizes is not a file
    // nothing recognized — even when another kind also lists it.
    const snapshot = shallowRef<SessionSnapshot | null>(
      snapshotWith([file('.codex/config.toml'), file('notes.txt')], [], {
        settings: [CODEX_CONFIG],
      }),
    );
    const filters = withSelection(snapshot);
    expect(filters.view.unrecognizedRows.value.map((row) => row.sourceRelativePath)).toEqual([
      'notes.txt',
    ]);
  });
});

describe('same-name resolutions in the filtered view', () => {
  it('drops a statement when the filter leaves a tool one definition', () => {
    const snapshot = ref<SessionSnapshot | null>(
      snapshotWith(
        [file('a/SKILL.md'), file('b/SKILL.md')],
        [skill('dup', 'a/SKILL.md', 'b/SKILL.md')],
      ),
    );
    const { pathQuery, view } = withSelection(snapshot);
    expect(view.skillRows.value[0]!.sameNameResolutions).toHaveLength(1);
    pathQuery.value = 'a/SKILL.md';
    expect(view.skillRows.value[0]!.sameNameResolutions).toHaveLength(0);
  });

  it("keeps Claude's statement only while the shown definitions still clash by directory", () => {
    // Claude's rule answers a directory-name clash, not a shared name
    // (FR-007): a filter can remove one of the clashing pair while a third
    // same-name definition keeps the count at two, and the statement must
    // leave with the clash it described. The gate is the same
    // clashingSkillDirectories the projection applied.
    const paths = [
      'one/.claude/skills/wave/SKILL.md',
      'two/.claude/skills/wave/SKILL.md',
      'one/.claude/skills/tide/SKILL.md',
    ];
    const entry: SkillInventoryEntryDto = {
      name: 'wave',
      definitions: paths.map((path) => ({
        sourceId: 'src-repo',
        sourceRelativePath: path,
        tool: 'claude' as const,
        surfaces: [],
        parseStatus: 'parsed' as const,
        diagnosticIds: [],
        companionFiles: [],
      })),
      sameNameResolutions: [{ tool: 'claude', resolution: 'all-remain-context-selected' }],
    };
    const snapshot = ref<SessionSnapshot | null>(
      snapshotWith(
        paths.map((path) => file(path)),
        [entry],
      ),
    );
    const { pathQuery, view } = withSelection(snapshot);
    expect(view.skillRows.value[0]!.sameNameResolutions).toHaveLength(1);
    // Filter away one clash partner; `wave` and `tide` remain — still two
    // definitions, but no directory clash, so no Claude statement.
    pathQuery.value = 'one/';
    const remaining = view.skillRows.value[0]!;
    expect(remaining.definitions).toHaveLength(2);
    expect(remaining.sameNameResolutions).toHaveLength(0);
  });

  it("carries Claude's statement across rows and drops it with the hidden side", () => {
    // Nested prefixing puts a clash's sides on different rows (FR-007): the
    // root `wave` and the nested `apps:wave` each hold one Claude definition,
    // and the clash they share is the directory name. Both rows carry the
    // statement while both sides are visible; hiding one side removes the
    // clash the statement described, from the row still in view.
    const rootPath = '.claude/skills/wave/SKILL.md';
    const nestedPath = 'apps/.claude/skills/wave/SKILL.md';
    const rowFor = (name: string, path: string): SkillInventoryEntryDto => ({
      name,
      definitions: [
        {
          sourceId: 'src-repo',
          sourceRelativePath: path,
          tool: 'claude' as const,
          surfaces: [],
          parseStatus: 'parsed' as const,
          diagnosticIds: [],
          companionFiles: [],
        },
      ],
      sameNameResolutions: [{ tool: 'claude', resolution: 'all-remain-context-selected' }],
    });
    const snapshot = ref<SessionSnapshot | null>(
      snapshotWith(
        [file(rootPath), file(nestedPath)],
        [rowFor('apps:wave', nestedPath), rowFor('wave', rootPath)],
      ),
    );
    const { pathQuery, view } = withSelection(snapshot);
    expect(view.skillRows.value.map((row) => row.sameNameResolutions.length)).toEqual([1, 1]);
    pathQuery.value = 'apps/';
    expect(view.skillRows.value).toHaveLength(1);
    expect(view.skillRows.value[0]!.name).toBe('apps:wave');
    expect(view.skillRows.value[0]!.sameNameResolutions).toHaveLength(0);
  });
});

describe('the request-correlated rescan lifecycle', () => {
  function harness(responses: Record<string, () => Promise<unknown>>) {
    const calls: string[] = [];
    return {
      calls,
      state: new SessionViewState({
        channel: {
          call: (method) => {
            calls.push(method);
            return responses[method]!();
          },
        },
      }),
    };
  }

  const adoptedSession = (overrides: Partial<SessionSnapshot> = {}) => ({
    globalContentEpoch: 0,
    repositoryGeneration: 1,
    globalGeneration: null,
    data: snapshotWith(
      [file('.agents/skills/greet/SKILL.md')],
      [skill('greet', '.agents/skills/greet/SKILL.md')],
      overrides,
    ),
  });

  it('adopts the admitted request ID and refetches the resulting status', async () => {
    const { calls, state } = harness({
      'agent-customization-inspector:get-session': () => Promise.resolve(adoptedSession()),
      'agent-customization-inspector:rescan-repository': () =>
        Promise.resolve({
          globalContentEpoch: 0,
          data: { scanRequestId: 'req-1', source: REPOSITORY_SOURCE },
        }),
    });
    await state.start();
    await state.requestRescan();

    expect(state.rescanState.value).toBe('accepted');
    expect(state.activeScanRequestId.value).toBe('req-1');
    // Acceptance is followed by exactly one adoption; nothing polls.
    expect(calls).toEqual([
      'agent-customization-inspector:get-session',
      'agent-customization-inspector:rescan-repository',
      'agent-customization-inspector:get-session',
    ]);
  });

  it('answers an acceptance with a fetch that starts after it', async () => {
    // A "Refresh status" pressed just before the acceptance must not answer
    // the rescan: its snapshot predates the accepted scan, and adopting it
    // would overwrite the scanning Source with a Ready row beside a live
    // `activeScanRequestId`. The acceptance therefore waits the stale fetch
    // out and issues one that starts now.
    const staleFetch = Promise.withResolvers<unknown>();
    let sessionCalls = 0;
    const scanning = {
      ...REPOSITORY_SOURCE,
      status: 'scanning' as const,
      scanRequestId: 'req-fresh',
    };
    const { calls, state } = harness({
      'agent-customization-inspector:get-session': () => {
        sessionCalls += 1;
        if (sessionCalls === 1) {
          return Promise.resolve(adoptedSession());
        }
        if (sessionCalls === 2) {
          // The stale fetch: started before the acceptance, settles after it,
          // and carries no accepted scan.
          return staleFetch.promise;
        }
        return Promise.resolve(adoptedSession({ sources: [scanning] }));
      },
      'agent-customization-inspector:rescan-repository': () => {
        // Release the stale fetch only after the acceptance settles, so it
        // is in flight across the whole command.
        queueMicrotask(() => staleFetch.resolve(adoptedSession()));
        return Promise.resolve({
          globalContentEpoch: 0,
          data: { scanRequestId: 'req-fresh', source: scanning },
        });
      },
    });
    await state.start();
    const stale = state.refresh();
    await state.requestRescan();
    await stale;

    expect(state.activeScanRequestId.value).toBe('req-fresh');
    // The adopted snapshot is the post-acceptance one: the Source still says
    // scanning, not the Ready row the stale fetch carried.
    expect(state.snapshot.value?.sources[0]?.status).toBe('scanning');
    expect(state.snapshot.value?.sources[0]?.scanRequestId).toBe('req-fresh');
    expect(
      calls.filter((method) => method === 'agent-customization-inspector:get-session'),
    ).toHaveLength(3);
  });

  it('surfaces the duplicate-command conflict as a declared outcome, not an error', async () => {
    const { state } = harness({
      'agent-customization-inspector:get-session': () => Promise.resolve(adoptedSession()),
      'agent-customization-inspector:rescan-repository': () =>
        Promise.resolve({ error: { code: 'scan-in-progress' } }),
    });
    await state.start();
    await state.requestRescan();

    expect(state.rescanState.value).toBe('rejected');
    expect(state.rescanRejection.value).toBe('scan-in-progress');
    // A conflict is a functional outcome: the view keeps its snapshot and the
    // session is not ended.
    expect(state.view.value).toBe('inspection');
    expect(state.sessionErrorMessage.value).toBeNull();
  });

  it('clears the previous rejection when the retry is dispatched', async () => {
    let refused = true;
    const { state } = harness({
      'agent-customization-inspector:get-session': () => Promise.resolve(adoptedSession()),
      'agent-customization-inspector:rescan-repository': () => {
        if (refused) {
          refused = false;
          return Promise.resolve({ error: { code: 'scan-in-progress' } });
        }
        return Promise.resolve({
          globalContentEpoch: 0,
          data: { scanRequestId: 'req-2', source: REPOSITORY_SOURCE },
        });
      },
    });
    await state.start();
    await state.requestRescan();
    expect(state.rescanRejection.value).toBe('scan-in-progress');

    await state.requestRescan();
    expect(state.rescanRejection.value).toBeNull();
    expect(state.activeScanRequestId.value).toBe('req-2');
  });

  it('retains the prior commit and its stale marker after a failed rescan', async () => {
    const stale = {
      snapshotState: 'stale-after-fatal-rescan' as const,
      staleFailures: [
        {
          sourceId: 'src-repo',
          failureRef: { kind: 'error' as const, message: 'injected accepted-job failure' },
          failedAt: '2026-07-25T00:00:01.000Z',
          baseGeneration: 1,
        },
      ],
    };
    const { state } = harness({
      'agent-customization-inspector:get-session': () => Promise.resolve(adoptedSession(stale)),
      'agent-customization-inspector:rescan-repository': () =>
        Promise.resolve({
          globalContentEpoch: 0,
          data: { scanRequestId: 'req-3', source: REPOSITORY_SOURCE },
        }),
    });
    await state.start();
    await state.requestRescan();

    // The committed inventory stays readable behind the stale marker; the
    // failure message belongs to the overlay, never to a Diagnostic list.
    expect(state.snapshot.value?.files).toHaveLength(1);
    expect(state.snapshot.value?.snapshotState).toBe('stale-after-fatal-rescan');
    expect(state.snapshot.value?.diagnostics).toEqual([]);
  });

  it('forgets the command state when the shared purge runs', async () => {
    const { state } = harness({
      'agent-customization-inspector:get-session': () => Promise.resolve(adoptedSession()),
      'agent-customization-inspector:rescan-repository': () =>
        Promise.resolve({
          globalContentEpoch: 0,
          data: { scanRequestId: 'req-4', source: REPOSITORY_SOURCE },
        }),
    });
    await state.start();
    await state.requestRescan();
    expect(state.activeScanRequestId.value).toBe('req-4');

    state.reportChannelLost(new Error('socket closed'));
    // A request ID is meaningless against a different host session; leaving
    // it set would let a post-purge status be read as this command's result.
    expect(state.activeScanRequestId.value).toBeNull();
    expect(state.rescanState.value).toBe('idle');
    expect(state.snapshot.value).toBeNull();
    expect(state.view.value).toBe('ended');
  });
});

describe('unified SKILL rows across the recognizing tools (T181)', () => {
  // The committed shape of the all-tool fixture, as the client receives it:
  // one row per resolved name, each definition naming its file and tool, and
  // the per-tool statements the projection derived. The filters must treat
  // the three vendors' definitions as one population rather than per-vendor
  // lists (data-model.md § Inventory unit).
  function unifiedEntries(): SkillInventoryEntryDto[] {
    const definition = (
      tool: SupportedTool,
      path: string,
    ): SkillInventoryEntryDto['definitions'][number] => ({
      sourceId: 'src-repo',
      sourceRelativePath: path,
      tool,
      surfaces: [],
      parseStatus: 'parsed',
      diagnosticIds: [],
      companionFiles: [],
    });
    return [
      {
        name: 'alpha',
        definitions: [
          definition('copilot', '.agents/skills/alpha-a/SKILL.md'),
          definition('codex', '.agents/skills/alpha-a/SKILL.md'),
          definition('copilot', '.agents/skills/alpha-b/SKILL.md'),
          definition('codex', '.agents/skills/alpha-b/SKILL.md'),
        ],
        sameNameResolutions: [
          { tool: 'copilot', resolution: 'surface-dependent' },
          { tool: 'codex', resolution: 'all-remain' },
        ],
      },
      {
        name: 'voyage',
        definitions: [
          definition('copilot', '.claude/skills/lander/SKILL.md'),
          definition('copilot', '.github/skills/ship/SKILL.md'),
        ],
        sameNameResolutions: [{ tool: 'copilot', resolution: 'surface-dependent' }],
      },
      {
        // The same `.claude/skills/lander/SKILL.md` the `voyage` row above
        // holds, on its own row because Claude Code invokes it by its skill
        // directory whatever its frontmatter declares (FR-007). A double that
        // put the Claude definition under `voyage` would be a row the
        // projection cannot produce.
        name: 'lander',
        definitions: [definition('claude', '.claude/skills/lander/SKILL.md')],
        sameNameResolutions: [],
      },
      {
        name: 'orbit',
        definitions: [
          definition('copilot', '.agents/skills/orbit/SKILL.md'),
          definition('codex', '.agents/skills/orbit/SKILL.md'),
        ],
        sameNameResolutions: [],
      },
    ];
  }

  function unifiedSnapshot(): SessionSnapshot {
    const paths = [
      '.agents/skills/alpha-a/SKILL.md',
      '.agents/skills/alpha-b/SKILL.md',
      '.agents/skills/orbit/SKILL.md',
      '.claude/skills/lander/SKILL.md',
      '.github/skills/ship/SKILL.md',
    ];
    return snapshotWith(paths.map(file), unifiedEntries());
  }

  it('offers every recognizing tool from the one unified inventory', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(unifiedSnapshot());
    const filters = withSelection(snapshot);
    // Compared in order, not as a set: this array is rendered unchanged as
    // the tool filter's options, so it must hold the closed tool order
    // itself — all three tools recognize here, which makes the expectation
    // the whole canonical order.
    expect(filters.view.availableTools.value).toEqual(SUPPORTED_TOOL_ORDER);
    expect(filters.view.availableKinds.value).toEqual(['skill']);
    expect(filters.view.skillRows.value.map((entry) => entry.name)).toEqual([
      'alpha',
      'voyage',
      'lander',
      'orbit',
    ]);
  });

  it('narrows by tool and re-derives each row’s same-name statement', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(unifiedSnapshot());
    const filters = withSelection(snapshot);
    filters.tool.value = 'codex';
    // Only the rows with a Codex definition remain, reduced to those
    // definitions; Copilot's statement leaves with its hidden definitions
    // while Codex still faces its own two-file collision.
    const rows = filters.view.skillRows.value;
    expect(rows.map((entry) => entry.name)).toEqual(['alpha', 'orbit']);
    expect(rows[0]!.definitions.map((definition) => definition.tool)).toEqual(['codex', 'codex']);
    expect(rows[0]!.sameNameResolutions).toEqual([{ tool: 'codex', resolution: 'all-remain' }]);
    expect(rows[1]!.sameNameResolutions).toEqual([]);

    filters.tool.value = 'claude';
    const claudeRows = filters.view.skillRows.value;
    // Claude's one definition is on its own row, so no tool still faces a
    // collision and the row states nothing.
    expect(claudeRows.map((entry) => entry.name)).toEqual(['lander']);
    expect(claudeRows[0]!.sameNameResolutions).toEqual([]);
  });

  it('narrows by path across tools and drops a statement with the hidden side', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(unifiedSnapshot());
    const filters = withSelection(snapshot);
    filters.pathQuery.value = 'alpha-a';
    const rows = filters.view.skillRows.value;
    // One file remains, so each tool has one definition and no collision.
    expect(rows.map((entry) => entry.name)).toEqual(['alpha']);
    expect(rows[0]!.definitions.map((definition) => definition.sourceRelativePath)).toEqual([
      '.agents/skills/alpha-a/SKILL.md',
      '.agents/skills/alpha-a/SKILL.md',
    ]);
    expect(rows[0]!.sameNameResolutions).toEqual([]);

    // The `.github` spelling reaches only the Copilot definition of `voyage`.
    filters.pathQuery.value = '.github/';
    const githubRows = filters.view.skillRows.value;
    expect(githubRows.map((entry) => entry.name)).toEqual(['voyage']);
    expect(githubRows[0]!.definitions.map((definition) => definition.tool)).toEqual(['copilot']);
    expect(githubRows[0]!.sameNameResolutions).toEqual([]);
  });

  it('counts the kind tab from the filtered unified rows', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(unifiedSnapshot());
    const filters = withSelection(snapshot);
    expect(filters.view.kindCounts.value.get('skill')).toBe(4);
    filters.tool.value = 'claude';
    expect(filters.view.kindCounts.value.get('skill')).toBe(1);
    filters.pathQuery.value = 'no-such-path';
    expect(filters.view.kindCounts.value.get('skill')).toBe(0);
    // An unmatched filter empties the rows without touching the snapshot.
    expect(snapshot.value!.skills).toHaveLength(4);
  });

  it('adopts and filters the unified inventory without ever requesting a detail', async () => {
    // The detail route is the only way authored content reaches the client,
    // so the load-bearing negative is behavioral: adopting the inventory and
    // deriving every filtered view issues exactly one `get-session` and never
    // a `get-file-detail`. A view that started prefetching details would put
    // authored source into client memory from the inventory alone.
    const calls: string[] = [];
    const state = new SessionViewState({
      channel: {
        call: (method) => {
          calls.push(method);
          return Promise.resolve({
            globalContentEpoch: 0,
            repositoryGeneration: 1,
            globalGeneration: null,
            data: unifiedSnapshot(),
          });
        },
      },
    });
    await state.start();
    const filters = withSelection(state.snapshot);
    filters.tool.value = 'claude';
    expect(filters.view.skillRows.value.map((entry) => entry.name)).toEqual(['lander']);
    filters.pathQuery.value = 'alpha';
    filters.tool.value = null;
    expect(filters.view.skillRows.value.map((entry) => entry.name)).toEqual(['alpha']);
    expect(calls).toEqual(['agent-customization-inspector:get-session']);
    expect(state.entryDetail.value).toBeNull();
    expect(JSON.stringify(state.snapshot.value)).not.toContain('sourceText');
  });

  it('gives the inventory state no field that could carry authored content', () => {
    // What this suite can honestly prove is shape: the snapshot rows and
    // every view derived from them keep the closed summary key sets, so
    // authored content has no field to arrive in beyond the declared name.
    // That real scans put no source text or secret into these fields is
    // proven against actual fixture data where the data exists — the
    // integration suite's session-summary case and the T184 browser
    // regression's served-document check.
    const snapshot = shallowRef<SessionSnapshot | null>(unifiedSnapshot());
    const filters = withSelection(snapshot);
    const serialized = JSON.stringify({
      snapshot: snapshot.value,
      rows: filters.view.skillRows.value,
      unrecognized: filters.view.unrecognizedRows.value,
      files: [...filters.view.filesBySource.value.values()].flatMap((byPath) => [
        ...byPath.values(),
      ]),
    });
    // The derivations introduce no `sourceText`-shaped field of their own.
    expect(serialized).not.toContain('sourceText');
    // Each definition publishes identity and status facts only — never a
    // parsed frontmatter value.
    for (const entry of filters.view.skillRows.value) {
      for (const definition of entry.definitions) {
        expect(Object.keys(definition).sort()).toEqual([
          'companionFiles',
          'diagnosticIds',
          'parseStatus',
          'sourceId',
          'sourceRelativePath',
          'surfaces',
          'tool',
        ]);
      }
    }
  });
});

describe('unified instruction rows across the recognizing tools (T271)', () => {
  // The Phase 21 matrix as the wire publishes it: one row per applicability
  // range, a shared physical file carrying one recognition per recognizing
  // product, and the configured fallbacks as ordinary Codex rows beside the
  // static pair (Phase 15 activated them; nothing here is pending).
  const matrixInstructions: readonly NarrowedInventoryRow<InstructionInventoryEntryDto>[] = [
    instructionEntry('**', [
      instructionFile('AGENTS.md', 'copilot', 'codex'),
      instructionFile('AGENTS.override.md', 'codex'),
      instructionFile('CLAUDE.local.md', 'claude'),
      instructionFile('CLAUDE.md', 'copilot', 'claude'),
      instructionFile('TEAM_GUIDE.md', 'codex'),
    ]),
    instructionEntry('packages/api/**', [instructionFile('packages/api/CLAUDE.md', 'claude')]),
    instructionEntry(null, [
      instructionFile('.github/instructions/nested/backend.instructions.md', 'copilot'),
    ]),
  ];
  const matrixFiles = matrixInstructions.flatMap((entry) =>
    entry.files.map((entryFile) => file(entryFile.sourceRelativePath)),
  );

  function matrixSnapshot(): SessionSnapshot {
    return snapshotWith(matrixFiles, [], { instructions: matrixInstructions });
  }

  it('offers the instructions kind and every recognizing tool of its rows', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(matrixSnapshot());
    const { view } = withSelection(snapshot);
    expect(view.availableKinds.value).toEqual(['instructions']);
    expect(view.availableTools.value).toEqual(['copilot', 'claude', 'codex']);
    expect(view.instructionRows.value).toEqual(matrixInstructions);
    expect(view.kindCounts.value.get('instructions')).toBe(3);
  });

  it('narrows a shared file to the selected tool, keeping the fallback rows beside it', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(matrixSnapshot());
    const { tool, view } = withSelection(snapshot);
    // Codex keeps its half of each shared recognition and the configured
    // fallback row, and drops the Claude-only and Copilot-only files with the
    // ranges they alone populated.
    tool.value = 'codex';
    expect(view.instructionRows.value).toEqual([
      instructionEntry(
        '**',
        [
          instructionFile('AGENTS.md', 'codex'),
          instructionFile('AGENTS.override.md', 'codex'),
          instructionFile('TEAM_GUIDE.md', 'codex'),
        ],
        ROOT_RANGE_FILE_PATHS,
      ),
    ]);
    // Claude keeps the shared root `CLAUDE.md`, its local variant, and the
    // nested row no other product recognizes.
    tool.value = 'claude';
    expect(view.instructionRows.value).toEqual([
      instructionEntry(
        '**',
        [instructionFile('CLAUDE.local.md', 'claude'), instructionFile('CLAUDE.md', 'claude')],
        ROOT_RANGE_FILE_PATHS,
      ),
      instructionEntry('packages/api/**', [instructionFile('packages/api/CLAUDE.md', 'claude')]),
    ]);
  });

  it('narrows by path inside each range and counts the kind tab from the result', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(matrixSnapshot());
    const { pathQuery, view } = withSelection(snapshot);
    pathQuery.value = 'claude.md';
    // Case-insensitive substring over the file paths — `CLAUDE.local.md`
    // does not contain it, so the query names the two exact spellings alone.
    // The ranges whose files all miss are not rows, and the no-range row
    // drops with its one file.
    expect(view.instructionRows.value).toEqual([
      instructionEntry(
        '**',
        [instructionFile('CLAUDE.md', 'copilot', 'claude')],
        ROOT_RANGE_FILE_PATHS,
      ),
      instructionEntry('packages/api/**', [instructionFile('packages/api/CLAUDE.md', 'claude')]),
    ]);
    expect(view.kindCounts.value.get('instructions')).toBe(2);
  });

  it('replaces the rows whole when a rescan commits a generation without them', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(matrixSnapshot());
    const { view } = withSelection(snapshot);
    expect(view.instructionRows.value).toHaveLength(3);
    // The rescanned tree lost the override and every configured fallback: the
    // derived view is the new commit's alone, with nothing retained from the
    // replaced generation (FR-030) — the fallback rows disappear with the
    // declaration, not with a UI state of their own.
    const rescanned = [
      instructionEntry('**', [
        instructionFile('AGENTS.md', 'copilot', 'codex'),
        instructionFile('CLAUDE.md', 'copilot', 'claude'),
      ]),
    ];
    snapshot.value = snapshotWith(
      rescanned.flatMap((entry) =>
        entry.files.map((entryFile) => file(entryFile.sourceRelativePath)),
      ),
      [],
      { instructions: rescanned, repositoryGeneration: 2 },
    );
    expect(view.instructionRows.value).toEqual(rescanned);
    expect(view.availableTools.value).toEqual(['copilot', 'claude', 'codex']);
  });

  it('gives the instruction rows no field that could carry authored content', () => {
    // The wire row is the range, the paths, and the recognitions — the range
    // being FR-027's stated row-identity exception. Nothing else authored may
    // travel with it, so the shape itself is asserted: a field added to the
    // DTO for content would fail this exhaustive key check.
    for (const entry of matrixInstructions) {
      expect(Object.keys(entry).sort()).toEqual([
        'applicabilityRange',
        'files',
        // The browser view's own field on a rendered row — the file
        // identities the row already holds, gathered so a comparison entry
        // link does not depend on what a filter left (`filters.ts`
        // § NarrowedInventoryRow). It travels no wire, and it carries no
        // value a file wrote.
        'rowFileIdentities',
        // The Source the row's range is relative to, and half of every listed
        // file's identity (FR-030). It is an opaque ID, not authored text.
        'sourceId',
      ]);
      for (const entryFile of entry.files) {
        expect(Object.keys(entryFile).sort()).toEqual(['recognitions', 'sourceRelativePath']);
        for (const recognition of entryFile.recognitions) {
          expect(Object.keys(recognition).sort()).toEqual(['surfaces', 'tool']);
        }
      }
    }
  });
});

describe('session summaries expose no authored content', () => {
  it('carries no source text or declared value on any published file', () => {
    const published = file('.agents/skills/secretive/SKILL.md');
    // The summary variant simply has no field for it: complete authored
    // content is served only through the detail route
    // (FR-027), so the snapshot cannot leak it. A file publishes its own facts
    // and nothing about what it was recognized as.
    expect(Object.keys(published).sort()).toEqual([
      'diagnosticIds',
      'encoding',
      'hadLeadingBom',
      'sizeBytes',
      'sourceId',
      'sourceRelativePath',
    ]);
  });

  it('renders an empty inventory as an empty row set rather than an error', () => {
    const snapshot = shallowRef<SessionSnapshot | null>(snapshotWith([]));
    const filters = withSelection(snapshot);
    expect(filters.view.skillRows.value).toEqual([]);
    expect(filters.view.availableKinds.value).toEqual([]);
    expect(filters.view.isNarrowed.value).toBe(false);
  });

  it('issues no request from elapsed time or an idle page', async () => {
    vi.useFakeTimers();
    try {
      const calls: string[] = [];
      const state = new SessionViewState({
        channel: {
          call: (method) => {
            calls.push(method);
            return Promise.resolve({
              globalContentEpoch: 0,
              repositoryGeneration: 1,
              globalGeneration: null,
              data: snapshotWith([]),
            });
          },
        },
      });
      await state.start();
      expect(calls).toHaveLength(1);
      // Nothing on this page updates by itself: no polling interval, request
      // timeout, retry timer, or wall-clock process-loss check exists.
      await vi.advanceTimersByTimeAsync(10 * 60 * 1000);
      expect(calls).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
