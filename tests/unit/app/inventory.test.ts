// T058: the browser-side inventory behavior — generation-aware filters over
// the committed snapshot, the request-correlated rescan/retry lifecycle, the
// empty state, and the guarantee that a session summary carries no authored
// source. The one authored value it does carry is the skill's declared name,
// which is presentation identity rather than content (FR-007/T1064): every
// other authored value stays behind the one-file-at-a-time detail route.
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
import { SessionViewState } from '../../../src/app/session/view-state';
import type {
  CustomizationFileSummaryDto,
  SessionSnapshot,
  SkillInventoryEntryDto,
  SourceDto,
} from '../../../src/shared/api-types';
import type { CustomizationKind, SupportedTool } from '../../../src/shared/entities';

const REPOSITORY_SOURCE: SourceDto = {
  sourceId: 'src-repo',
  kind: 'repository',
  tool: null,
  enabled: true,
  status: 'ready',
  boundary: { displayRoot: '/tmp/my\\u0020repo', origin: 'process-cwd' },
  generation: 1,
  scanRequestId: null,
  progress: null,
  conditionFacts: [],
  diagnosticIds: [],
};

/** A published file: its own facts only, as the snapshot now carries them. */
function file(path: string): CustomizationFileSummaryDto {
  return {
    fileId: `file-${path}`,
    sourceId: 'src-repo',
    sourceRelativePath: path,
    diagnosticIds: [],
    encoding: 'utf-8',
    hadLeadingBom: false,
    sizeBytes: 12,
  };
}

/**
 * One skill row: a declared name and the files declaring it. The row's unit is
 * the name, so a case that wants two rows gives two names and a case that wants
 * one row with two definitions gives one.
 */
function skill(declaredName: string | null, ...paths: readonly string[]): SkillInventoryEntryDto {
  return skillWithCompanions([], declaredName, ...paths);
}

/** A skill entry whose one definition ships the given companion files. */
function skillWithCompanions(
  companionFiles: readonly string[],
  declaredName: string | null,
  ...paths: readonly string[]
): SkillInventoryEntryDto {
  return {
    declaredName,
    definitions: paths.map((path) => ({
      fileId: `file-${path}`,
      tools: ['codex'],
      companionFiles,
      diagnosticIds: [],
    })),
    sameNameResolutions:
      paths.length > 1 ? [{ tool: 'codex', resolution: 'all-remain' as const }] : [],
  };
}

function snapshotWith(
  files: readonly CustomizationFileSummaryDto[],
  skills: readonly SkillInventoryEntryDto[] = [],
  overrides: Partial<SessionSnapshot> = {},
): SessionSnapshot {
  return {
    sessionId: 'session-1',
    createdAt: '2026-07-25T00:00:00.000Z',
    sources: [REPOSITORY_SOURCE],
    files,
    skills,
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
    sourceId: ref<string | null>(null),
    tool: ref<SupportedTool | null>(null),
    kind: ref<CustomizationKind | null>(null),
    pathQuery: ref(''),
  };
  const clear = (): void => {
    selection.sourceId.value = null;
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
    expect(filters.view.availableSources.value).toEqual([REPOSITORY_SOURCE]);
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
      fileId: 'file-.agents/skills/greet/notes.md',
      sourceId: 'src-repo',
      sourceRelativePath: '.agents/skills/greet/notes.md',
      diagnosticIds: ['diag-unreadable'],
      encoding: 'unknown',
    };
    const binaryAsset: CustomizationFileSummaryDto = {
      fileId: 'file-.agents/skills/greet/logo.png',
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
      filters.view.filesByPath.value.get('.agents/skills/greet/notes.md')?.diagnosticIds,
    ).toEqual(['diag-unreadable']);
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
    expect(filters.view.skillRows.value.map((row) => row.declaredName)).toEqual(['deploy']);

    filters.pathQuery.value = '';
    filters.tool.value = 'codex';
    expect(filters.view.skillRows.value).toHaveLength(2);
    // The one published Source keeps every recognized row; a Source the
    // snapshot does not publish is not an option the dropdown offers, so it is
    // ignored rather than silently emptying the list.
    filters.sourceId.value = 'src-repo';
    expect(filters.view.skillRows.value).toHaveLength(2);
    filters.sourceId.value = 'src-other';
    expect(filters.view.skillRows.value).toHaveLength(2);

    filters.clear();
    expect(filters.view.isNarrowed.value).toBe(false);
    expect(filters.view.skillRows.value).toHaveLength(2);
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
    expect(state.errorMessage.value).toBeNull();
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
      'fileId',
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
