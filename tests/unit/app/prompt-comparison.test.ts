// @vitest-environment happy-dom
// T503: the prompt-and-command comparison view state and its recognition
// rows (FR-011, FR-012, FR-030, FR-027; data-model.md § BrowserState
// · ComparisonSelection). Scoped to this kind by design: comparison is
// kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's model is two files of one invocation-name row
// compared whole — the row ownership is the compare route's own validation,
// so the state here sees only the two paths.
//
// One surface covers the whole kind, so the pairs under test are the ones
// its inventory can produce: a Claude command file beside the VS Code prompt
// file that declares the same name, and two files one product invokes by one
// name.
//
// The state under test is the browser's: two distinct readable
// current-generation files named by Source-relative Path — the pair is the
// compare route's query, with no standing pre-selection — loaded through two
// ordinary `get-file-detail` requests, because there is no compare API, and
// dropped again by the same three cleanups every detail obeys: a newer
// committed generation, the central client-data purge, and leaving the view.
// What is under test on the data side is this kind's recognition metadata:
// tool recognition compared per tool, each cell carrying the name that tool
// invokes that file by and the surfaces its admissions rest on; the files'
// declared metadata — one parse per kind (FR-028) — serialized once per side
// into the canonical YAML document the diff mounts; and nothing fabricated —
// relationship rows above all, because a file of this kind never publishes
// an edge for the wire to carry (api-types.ts § PromptFileDetailDto).
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { describe, expect, it, vi } from 'vitest';

import {
  PromptRecognitionComparison,
  type PromptComparisonSideInput,
  type PromptSideDefinition,
} from '../../../src/app/components/prompt-comparison/recognition-comparison';
import { promptComparisonRouteFor } from '../../../src/app/composables/prompt-comparison';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  DeclaredEntryDto,
  FileDetailDto,
  InspectionDataResult,
  PromptDefinitionDto,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The command file two products read, and the prompt file naming itself the same. */
const LEFT_PATH = '.claude/commands/deploy.md';
const RIGHT_PATH = '.github/prompts/deploy.prompt.md';

/**
 * One compared side as the route now addresses it: the fixture files are the
 * repository's, so the Source token is fixed here (FR-030).
 */
function side(sourceRelativePath: string): { source: 'repository'; sourceRelativePath: string } {
  return { source: 'repository', sourceRelativePath };
}

/** The name both files resolve, and therefore the row that owns the pair. */
const SHARED_NAME = 'deploy';

/** A committed snapshot holding the two readable files under one name's row. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-22T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [
      {
        sourceId: 'source-repository',
        kind: 'repository',
        member: null,
        enabled: true,
        status: 'ready',
        boundary: { displayRoot: '/tmp/fixture', origin: 'process-cwd' },
        generation: 0,
        scanRequestId: null,
        progress: null,
        diagnosticIds: [],
      },
    ],
    files: [LEFT_PATH, RIGHT_PATH].map((sourceRelativePath) => ({
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8' as const,
      hadLeadingBom: false,
      sizeBytes: 10,
    })),
    instructions: [],
    rules: [],
    prompts: [
      {
        name: SHARED_NAME,
        definitions: [
          definition(LEFT_PATH, 'copilot', ['copilot-cli']),
          definition(LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
          definition(RIGHT_PATH, 'copilot', ['copilot-vscode']),
        ],
      },
    ],
    plugins: [],
    outputStyles: [],
    permissions: [],
    hooks: [],
    settings: [],
    agents: [],
    skills: [],
    mcp: [],
    diagnostics: [],
    repositoryGeneration: 0,
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

/** One inventory definition: one `(file, tool)` recognition of this kind. */
function definition(
  sourceRelativePath: string,
  tool: PromptDefinitionDto['tool'],
  surfaces: PromptDefinitionDto['surfaces'],
): PromptDefinitionDto {
  return {
    sourceId: 'source-repository',
    sourceRelativePath,
    tool,
    surfaces,
    diagnosticIds: [],
  };
}

/** Wraps a payload in the inspection-data success envelope. */
function dataResult<Data>(
  data: Data,
  generations: { repositoryGeneration?: number } = {},
): InspectionDataResult<Data> {
  return {
    globalContentEpoch: 0,
    repositoryGeneration: generations.repositoryGeneration ?? 0,
    globalGeneration: null,
    data,
  };
}

/**
 * One readable detail of this kind with the given parsed declarations, or —
 * with a null frontmatter — one whose extraction failed all-or-nothing
 * (FR-028): no presentation, the complete source still readable.
 */
function promptDetail(
  sourceRelativePath: string,
  frontmatter: readonly DeclaredEntryDto[] | null = [],
  sourceText = `source of ${sourceRelativePath}`,
): FileDetailDto {
  return {
    kind: 'prompt/command',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText,
      sizeBytes: sourceText.length,
    },
    presentation: frontmatter === null ? null : { frontmatter, bodyText: sourceText },
    diagnostics: [],
  };
}

/** A binary detail: committed, listed, and comparison-ineligible (FR-025). */
function binaryDetail(sourceRelativePath: string): FileDetailDto {
  return {
    kind: 'file',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'binary',
      sizeBytes: 4,
    },
    diagnostics: [],
  };
}

/**
 * A channel scripted per function: `get-session` answers from a queue that
 * repeats its last entry, and `get-file-detail` answers from the handler the
 * case installed. Every issued call is recorded with its arguments, so a case
 * can assert the exact request sequence — two detail requests and no other
 * function is what "no compare API" means on the wire.
 */
function scriptedChannel(options: {
  sessions: readonly unknown[];
  detail?: (path: string) => unknown | Promise<unknown>;
}) {
  const calls: { method: string; args: readonly unknown[] }[] = [];
  const sessions = [...options.sessions];
  return {
    calls,
    channel: {
      call: (method: string, ...args: readonly unknown[]): Promise<unknown> => {
        calls.push({ method, args });
        if (method === SESSION_RPC_FUNCTIONS.getSession) {
          const next = sessions.length > 1 ? sessions.shift() : sessions[0];
          return next instanceof Error ? Promise.reject(next) : Promise.resolve(next);
        }
        if (method === SESSION_RPC_FUNCTIONS.getFileDetail) {
          const handler = options.detail;
          if (handler === undefined) {
            return Promise.reject(new Error('no detail handler scripted'));
          }
          // `get-file-detail` sends one object naming both halves of the
          // identity (FR-030); the carrier functions still send a bare path,
          // and this double answers for whichever arrived.
          const payload = args[0];
          const path =
            typeof payload === 'string'
              ? payload
              : String((payload as { sourceRelativePath?: unknown })?.sourceRelativePath);
          return Promise.resolve().then(() => handler(path));
        }
        return Promise.reject(new Error(`unexpected call: ${method}`));
      },
    },
  };
}

/** Paths of the recorded `get-file-detail` calls, in issue order. */
function detailCalls(calls: readonly { method: string; args: readonly unknown[] }[]): string[] {
  return calls
    .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getFileDetail)
    .map((call) => {
      // `get-file-detail` sends one object naming both halves of the identity
      // (FR-030); the carrier functions still send a bare path.
      const payload = call.args[0];
      return typeof payload === 'string'
        ? payload
        : String((payload as { sourceRelativePath?: unknown })?.sourceRelativePath);
    });
}

describe('prompt and command comparison view (T503)', () => {
  it('loads exactly two existing details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(promptDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.promptComparison.open(side(LEFT_PATH), side(RIGHT_PATH));
    expect(state.promptComparison.status.value).toBe('ready');
    expect(state.promptComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.promptComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary detail requests, one per side, in selection order. Every
    // call on the wire is a member of the closed catalog the client already
    // had — nothing compare-specific was requested.
    expect(detailCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('refuses the same path on both inputs without spending a request', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(promptDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.promptComparison.open(side(LEFT_PATH), side(LEFT_PATH));
    expect(state.promptComparison.status.value).toBe('same-path');
    expect(detailCalls(scripted.calls)).toEqual([]);
    state.dispose();
  });

  it('refuses a side with no readable source as not-readable', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(path === RIGHT_PATH ? binaryDetail(path) : promptDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.promptComparison.open(side(LEFT_PATH), side(RIGHT_PATH));
    expect(state.promptComparison.status.value).toBe('not-readable');
    expect(state.promptComparison.unreadablePath.value).toBe(RIGHT_PATH);
    // Neither side renders: a comparison with one side is not a comparison.
    expect(state.promptComparison.leftDetail.value).toBeNull();
    expect(state.promptComparison.rightDetail.value).toBeNull();
    state.dispose();
  });

  it('drops the open view when a newer committed generation is adopted (FR-030)', async () => {
    const scripted = scriptedChannel({
      sessions: [
        dataResult(snapshotWith()),
        dataResult(snapshotWith({ repositoryGeneration: 1 }), { repositoryGeneration: 1 }),
      ],
      detail: (path) => dataResult(promptDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.promptComparison.open(side(LEFT_PATH), side(RIGHT_PATH));
    expect(state.promptComparison.status.value).toBe('ready');
    // A component holding the pair's content registers its disposer; the
    // adoption of a newer generation must run it synchronously with the drop
    // (data-model.md § BrowserState).
    const disposer = vi.fn();
    state.promptComparison.registerOpenContentOwner(disposer);
    await state.refresh();
    expect(state.promptComparison.status.value).toBe('idle');
    expect(state.promptComparison.leftDetail.value).toBeNull();
    expect(state.promptComparison.rightDetail.value).toBeNull();
    expect(disposer).toHaveBeenCalledTimes(1);
    state.dispose();
  });

  it('retains the real failure message and recovers on retry', async () => {
    let failFirst = true;
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => {
        if (failFirst) {
          failFirst = false;
          throw new Error('detail request lost');
        }
        return dataResult(promptDetail(path));
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.promptComparison.open(side(LEFT_PATH), side(RIGHT_PATH));
    expect(state.promptComparison.status.value).toBe('failed');
    expect(state.promptComparison.errorMessage.value).toContain('detail request lost');
    // The retry is the same open with the same coordinates.
    await state.promptComparison.open(side(LEFT_PATH), side(RIGHT_PATH));
    expect(state.promptComparison.status.value).toBe('ready');
    state.dispose();
  });

  it('addresses the pair by the two identities alone, each path as its JSON string body', () => {
    // The kind's surface is its own route, and the pair is its whole
    // identity: each side's Source and path, the owning name derived from
    // them rather than carried (FR-030). Each path rides as its JSON string
    // body — the spelling that survives a lone surrogate, which the router's
    // own query encoding rejects (`detail-route.ts`).
    expect(promptComparisonRouteFor('repository', side(LEFT_PATH), side('\udbff/x.md'))).toEqual({
      path: '/prompts-and-commands/compare/repository',
      query: {
        leftSource: 'repository',
        left: LEFT_PATH,
        rightSource: 'repository',
        right: '\\udbff/x.md',
      },
    });
  });
});

describe('prompt and command recognition comparison rows (T503)', () => {
  /** One declared entry with a scalar value. */
  function scalarEntry(
    key: string,
    text: string,
    scalarKind: 'string' | 'number' | 'boolean' = 'string',
  ): DeclaredEntryDto {
    return { key, keyKind: 'string', value: { kind: 'scalar', scalarKind, text } };
  }

  /** One side input from a detail and the inventory's definitions of it. */
  function side(
    detail: FileDetailDto,
    definitions: readonly PromptSideDefinition[],
  ): PromptComparisonSideInput {
    return { detail, definitions };
  }

  /** One definition paired with the name of the row it sits under. */
  function invoked(
    invocationName: string,
    sourceRelativePath: string,
    tool: PromptDefinitionDto['tool'],
    surfaces: PromptDefinitionDto['surfaces'],
  ): PromptSideDefinition {
    return { invocationName, definition: definition(sourceRelativePath, tool, surfaces) };
  }

  it('states each tool’s own invocation name and surfaces per side', () => {
    // The pair the kind's row unit makes possible: a command file two
    // products read, and the prompt file that declares the same name. Each
    // cell is one `(file, tool)` recognition — never the row's identity
    // repeated — so Claude's absence from the prompt file is a cell with no
    // definition rather than a name it does not derive.
    const comparison = new PromptRecognitionComparison(
      side(promptDetail(LEFT_PATH), [
        invoked(SHARED_NAME, LEFT_PATH, 'copilot', ['copilot-cli']),
        invoked(SHARED_NAME, LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
      ]),
      side(promptDetail(RIGHT_PATH), [
        invoked(SHARED_NAME, RIGHT_PATH, 'copilot', ['copilot-vscode']),
      ]),
    );
    expect(
      comparison.tools.map((row) => [
        row.tool,
        row.kind,
        row.left?.invocationName ?? null,
        row.right?.invocationName ?? null,
      ]),
    ).toEqual([
      ['copilot', 'prompt/command', SHARED_NAME, SHARED_NAME],
      ['claude', 'prompt/command', SHARED_NAME, null],
    ]);
    // Copilot reaches the one name two ways, and the surfaces say which:
    // the CLI reads the command file and the editor reads the prompt file.
    expect(comparison.tools[0]!.left?.definition.surfaces).toEqual(['copilot-cli']);
    expect(comparison.tools[0]!.right?.definition.surfaces).toEqual(['copilot-vscode']);
    expect(comparison.tools[1]!.right).toBeNull();
  });

  it('builds no row for a tool that recognizes neither side', () => {
    const comparison = new PromptRecognitionComparison(
      side(promptDetail(LEFT_PATH), [invoked(SHARED_NAME, LEFT_PATH, 'claude', [])]),
      side(promptDetail(RIGHT_PATH), [invoked(SHARED_NAME, RIGHT_PATH, 'claude', [])]),
    );
    expect(comparison.tools.map((row) => row.tool)).toEqual(['claude']);
  });

  it('states a name one tool derives differently from the row the pair stands on', () => {
    // The definitions are gathered across rows, not out of the owning one,
    // so a cell reports what its own tool invokes its own file by. A name
    // that differs from the pair's own row is therefore visible rather than
    // silently restated (data-model.md § Inventory unit).
    const comparison = new PromptRecognitionComparison(
      side(promptDetail(LEFT_PATH), [
        invoked(SHARED_NAME, LEFT_PATH, 'copilot', ['copilot-cli']),
        invoked('team:deploy', LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
      ]),
      side(promptDetail(RIGHT_PATH), [
        invoked(SHARED_NAME, RIGHT_PATH, 'copilot', ['copilot-vscode']),
      ]),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left?.invocationName ?? null])).toEqual([
      ['copilot', SHARED_NAME],
      ['claude', 'team:deploy'],
    ]);
  });

  it('serializes both parsed sides to canonical YAML documents for the diff', () => {
    const comparison = new PromptRecognitionComparison(
      side(
        promptDetail(LEFT_PATH, [
          scalarEntry('description', 'Deploy the current branch'),
          scalarEntry('argument-hint', '[environment]'),
          scalarEntry('disable-model-invocation', 'false', 'boolean'),
        ]),
        [invoked(SHARED_NAME, LEFT_PATH, 'claude', ['claude-cli-and-ide-clients'])],
      ),
      side(
        promptDetail(RIGHT_PATH, [
          scalarEntry('name', SHARED_NAME),
          scalarEntry('description', 'Deploy from the editor'),
        ]),
        [invoked(SHARED_NAME, RIGHT_PATH, 'copilot', ['copilot-vscode'])],
      ),
    );
    // One canonical document per side — the documented prompt keys leading in
    // the order VS Code's prompt file format publishes them, every other key
    // sorted after (declaration-order.ts) — however many tools recognize
    // either side: the declarations are the files' one parse, not any tool's,
    // so no tool repeats or captions them (research.md § 7,
    // frontmatter-yaml.ts).
    expect(comparison.frontmatterDiff).toEqual({
      originalText: [
        'description: Deploy the current branch',
        'argument-hint: "[environment]"',
        'disable-model-invocation: false',
        '',
      ].join('\n'),
      modifiedText: ['description: Deploy from the editor', 'name: deploy', ''].join('\n'),
    });
  });

  it('reads extraction failure off the file’s null presentation (FR-028)', () => {
    // The parse is the file's, one per kind, so a side whose detail carries
    // no parsed presentation has unknown declarations for every recognizing
    // tool at once — and the cells keep stating the names, because this
    // kind's name is never read out of the parse.
    const comparison = new PromptRecognitionComparison(
      side(promptDetail(LEFT_PATH, null), [
        invoked(SHARED_NAME, LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
      ]),
      side(promptDetail(RIGHT_PATH, [scalarEntry('name', SHARED_NAME)]), [
        invoked(SHARED_NAME, RIGHT_PATH, 'copilot', ['copilot-vscode']),
      ]),
    );
    expect(comparison.leftDeclarations).toBe('extraction-failed');
    expect(comparison.rightDeclarations).toBe('parsed');
    expect(comparison.frontmatterDiff).toBeNull();
    expect(comparison.tools.map((row) => row.left?.invocationName ?? null)).toEqual([
      null,
      SHARED_NAME,
    ]);
  });

  it('reads the parse off whatever Markdown variant the path answered with', () => {
    // One file can hold two Markdown kinds — a `.claude/commands/CLAUDE.md`
    // is a Claude command by its directory and a Claude instruction file by
    // its name — and `get-file-detail` is addressed by the path alone,
    // answering with the first variant its fixed order reaches
    // (session.ts § fileDetail). The parse is the same for the same bytes, so
    // requiring this kind's own variant here would report a parsed file as
    // unparsed.
    const asPrompt = promptDetail('.claude/commands/CLAUDE.md', [
      scalarEntry('description', 'Both kinds'),
    ]);
    if (asPrompt.kind !== 'prompt/command') {
      throw new Error('expected this kind’s variant from the helper');
    }
    const bothKinds: FileDetailDto = {
      kind: 'instructions',
      file: asPrompt.file,
      presentation: asPrompt.presentation,
      diagnostics: asPrompt.diagnostics,
    };
    const comparison = new PromptRecognitionComparison(
      side(bothKinds, [
        invoked('CLAUDE', '.claude/commands/CLAUDE.md', 'claude', ['claude-cli-and-ide-clients']),
      ]),
      side(promptDetail(RIGHT_PATH, [scalarEntry('description', 'Editor')]), [
        invoked('CLAUDE', RIGHT_PATH, 'copilot', ['copilot-vscode']),
      ]),
    );
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.frontmatterDiff).toEqual({
      originalText: 'description: Both kinds\n',
      modifiedText: 'description: Editor\n',
    });
  });

  it('publishes descriptive rows only — no rank, no winner, no fabricated relationships', () => {
    // The comparison's whole shape is closed: per-tool side cells and the
    // two serialized documents. No field exists that could carry a
    // relationship row, a precedence, or a verdict — a file of this kind
    // never publishes an edge (api-types.ts § PromptFileDetailDto), a name
    // its prompt mentions stays text in the source diff (FR-019), and none
    // may be invented here (FR-012).
    const comparison = new PromptRecognitionComparison(
      side(promptDetail(LEFT_PATH, [scalarEntry('description', 'left')]), [
        invoked(SHARED_NAME, LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
      ]),
      side(promptDetail(RIGHT_PATH, [scalarEntry('description', 'right')]), [
        invoked(SHARED_NAME, RIGHT_PATH, 'copilot', ['copilot-vscode']),
      ]),
    );
    expect(Object.keys(comparison).sort()).toEqual([
      'bodyDiff',
      'frontmatterDiff',
      'leftDeclarations',
      'rightDeclarations',
      'tools',
    ]);
    for (const row of comparison.tools) {
      expect(Object.keys(row).sort()).toEqual(['kind', 'left', 'right', 'tool']);
      for (const cell of [row.left, row.right]) {
        if (cell !== null) {
          expect(Object.keys(cell).sort()).toEqual(['definition', 'invocationName']);
        }
      }
    }
    expect(Object.keys(comparison.frontmatterDiff ?? {}).sort()).toEqual([
      'modifiedText',
      'originalText',
    ]);
  });
});
