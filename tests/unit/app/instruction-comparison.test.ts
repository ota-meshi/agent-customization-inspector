// @vitest-environment happy-dom
// T276: the instruction comparison view state and its recognition rows
// (FR-011, FR-012, FR-030, FR-027; data-model.md § BrowserState
// · ComparisonSelection). Instruction-scoped by design: comparison is
// kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's model is two files of one
// applicability-range row compared whole — the row ownership is the compare
// route's own validation, so the state here sees only the two paths.
//
// The state under test is the browser's: two distinct readable
// current-generation files named by Source-relative Path — the pair is the
// compare route's query, with no standing pre-selection — loaded through two
// ordinary `get-file-detail` requests, because there is no compare API, and
// dropped again by the same three cleanups every detail obeys: a newer
// committed generation, the central client-data purge, and leaving the view.
// What is under test is the data half of the kind's recognition metadata:
// tool recognition compared per tool with its typed surfaces, the files'
// declared metadata — one parse per kind (FR-028) — serialized once per side
// into the canonical YAML document the diff mounts, and nothing fabricated —
// relationship rows above all,
// because an instruction file never publishes an edge for the wire to carry
// (api-types.ts § FileDetailDto, T217/T238).
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under
// the Node environment its contract and integration members need.
import { describe, expect, it, vi } from 'vitest';

import {
  InstructionRecognitionComparison,
  type InstructionComparisonSideInput,
} from '../../../src/app/components/instruction-comparison/recognition-comparison';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  FileDetailDto,
  DeclaredEntryDto,
  InspectionDataResult,
  FileRecognitionDto,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The two readable instruction paths most cases compare. */
const LEFT_PATH = 'AGENTS.md';
const RIGHT_PATH = 'CLAUDE.md';

/** A committed snapshot holding the two readable instruction files. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-19T00:00:00.000Z',
    fileOpenTargets: ['visual-studio-code', 'default-application'],
    sources: [
      {
        sourceId: 'source-repository',
        kind: 'repository',
        tool: null,
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
    instructions: [
      {
        applicabilityRange: '**',
        files: [
          {
            sourceRelativePath: LEFT_PATH,
            recognitions: [
              { tool: 'copilot', surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'] },
              { tool: 'codex', surfaces: ['codex-local-clients'] },
            ],
          },
          {
            sourceRelativePath: RIGHT_PATH,
            recognitions: [
              { tool: 'copilot', surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'] },
              { tool: 'claude', surfaces: ['claude-cli-and-ide-clients'] },
            ],
          },
        ],
      },
    ],
    rules: [],
    permissions: [],
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
 * One readable instruction detail with the given parsed declarations, or —
 * with a null frontmatter — one whose extraction failed all-or-nothing
 * (FR-028): no presentation, the complete source still readable.
 */
function instructionDetail(
  sourceRelativePath: string,
  frontmatter: readonly DeclaredEntryDto[] | null = [],
  sourceText = `source of ${sourceRelativePath}`,
): FileDetailDto {
  return {
    kind: 'instructions',
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
          return Promise.resolve().then(() => handler(String(args[0])));
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
    .map((call) => String(call.args[0]));
}

describe('instruction comparison view (T276)', () => {
  it('loads exactly two existing details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(instructionDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.instructionComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.instructionComparison.status.value).toBe('ready');
    expect(state.instructionComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.instructionComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary detail requests, one per side, in selection order. Every
    // call on the wire is a member of the closed catalog the client already
    // had — nothing compare-specific was requested.
    expect(detailCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('refuses the same path on both inputs without spending a request', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(instructionDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.instructionComparison.open(LEFT_PATH, LEFT_PATH);
    expect(state.instructionComparison.status.value).toBe('same-path');
    expect(detailCalls(scripted.calls)).toEqual([]);
    state.dispose();
  });

  it('refuses a side with no readable source as not-readable', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) =>
        dataResult(path === RIGHT_PATH ? binaryDetail(path) : instructionDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.instructionComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.instructionComparison.status.value).toBe('not-readable');
    expect(state.instructionComparison.unreadablePath.value).toBe(RIGHT_PATH);
    // Neither side renders: a comparison with one side is not a comparison.
    expect(state.instructionComparison.leftDetail.value).toBeNull();
    expect(state.instructionComparison.rightDetail.value).toBeNull();
    state.dispose();
  });

  it('drops the open view when a newer committed generation is adopted (FR-030)', async () => {
    const scripted = scriptedChannel({
      sessions: [
        dataResult(snapshotWith()),
        dataResult(snapshotWith({ repositoryGeneration: 1 }), { repositoryGeneration: 1 }),
      ],
      detail: (path) => dataResult(instructionDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.instructionComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.instructionComparison.status.value).toBe('ready');
    // A component holding the pair's content registers its disposer; the
    // adoption of a newer generation must run it synchronously with the drop
    // (data-model.md § BrowserState).
    const disposer = vi.fn();
    state.instructionComparison.registerOpenContentOwner(disposer);
    await state.refresh();
    expect(state.instructionComparison.status.value).toBe('idle');
    expect(state.instructionComparison.leftDetail.value).toBeNull();
    expect(state.instructionComparison.rightDetail.value).toBeNull();
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
        return dataResult(instructionDetail(path));
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.instructionComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.instructionComparison.status.value).toBe('failed');
    expect(state.instructionComparison.errorMessage.value).toContain('detail request lost');
    // The retry is the same open with the same coordinates.
    await state.instructionComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.instructionComparison.status.value).toBe('ready');
    state.dispose();
  });
});

describe('instruction recognition comparison rows (T276)', () => {
  /** One declared entry with a scalar value. */
  function scalarEntry(
    key: string,
    text: string,
    scalarKind: 'string' | 'number' | 'boolean' = 'string',
  ): DeclaredEntryDto {
    return { key, keyKind: 'string', value: { kind: 'scalar', scalarKind, text } };
  }

  /** One side input from a detail and the inventory's recognitions of it. */
  function side(
    detail: FileDetailDto,
    recognitions: readonly FileRecognitionDto[],
  ): InstructionComparisonSideInput {
    return { detail, recognitions };
  }

  const CODEX: FileRecognitionDto = { tool: 'codex', surfaces: ['codex-local-clients'] };
  const CLAUDE: FileRecognitionDto = {
    tool: 'claude',
    surfaces: ['claude-cli-and-ide-clients'],
  };
  const COPILOT_ALL: FileRecognitionDto = {
    tool: 'copilot',
    surfaces: ['copilot-vscode', 'copilot-cli', 'copilot-cloud'],
  };
  const COPILOT_CLI: FileRecognitionDto = { tool: 'copilot', surfaces: ['copilot-cli'] };

  it('serializes both parsed sides to canonical YAML documents for the diff', () => {
    const comparison = new InstructionRecognitionComparison(
      side(
        instructionDetail(LEFT_PATH, [
          scalarEntry('scope', 'project'),
          scalarEntry('retries', '7', 'number'),
          scalarEntry('only_left', 'yes'),
        ]),
        [COPILOT_ALL, CODEX],
      ),
      side(
        instructionDetail(RIGHT_PATH, [
          scalarEntry('scope', 'workspace'),
          scalarEntry('retries', '7', 'number'),
        ]),
        [COPILOT_ALL, CODEX],
      ),
    );
    expect(comparison.tools.map((row) => [row.tool, row.kind, row.left, row.right])).toEqual([
      ['copilot', 'instructions', 'recognized', 'recognized'],
      ['codex', 'instructions', 'recognized', 'recognized'],
    ]);
    // One canonical document per side — every key sorted, with no leading
    // identity pair, because an instruction file declares no identity this
    // product reads — however many tools recognize both sides: the
    // declarations are the files' one parse, not any tool's, so no tool
    // repeats or captions them (research.md § 7, frontmatter-yaml.ts).
    expect(comparison.frontmatterDiff).toEqual({
      originalText: ['only_left: yes', 'retries: 7', 'scope: project', ''].join('\n'),
      modifiedText: ['retries: 7', 'scope: workspace', ''].join('\n'),
    });
  });

  it('states each side’s surfaces per tool row — the typed layering fact', () => {
    // A root file all three Copilot surfaces read against one the CLI alone
    // does: the difference is typed rows, never a source-diff artifact.
    const comparison = new InstructionRecognitionComparison(
      side(instructionDetail(LEFT_PATH), [COPILOT_ALL]),
      side(instructionDetail(RIGHT_PATH), [COPILOT_CLI]),
    );
    expect(comparison.tools).toHaveLength(1);
    expect(comparison.tools[0]!.leftSurfaces).toEqual([
      'copilot-vscode',
      'copilot-cli',
      'copilot-cloud',
    ]);
    expect(comparison.tools[0]!.rightSurfaces).toEqual(['copilot-cli']);
  });

  it('states per-tool recognition apart from the files’ frontmatter diff', () => {
    // A configured fallback only Codex recognizes against a Claude-only
    // file: each tool's row states the side it does not recognize — with no
    // surfaces, because there is no recognition to rest on — while the
    // declared metadata still compares, because the declarations are the
    // files' parses and both parsed (research.md § 7).
    const comparison = new InstructionRecognitionComparison(
      side(instructionDetail('TEAM_GUIDE.md', [scalarEntry('a', '1', 'number')]), [CODEX]),
      side(instructionDetail('CLAUDE.local.md', [scalarEntry('a', '1', 'number')]), [CLAUDE]),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['claude', 'not-recognized', 'recognized'],
      ['codex', 'recognized', 'not-recognized'],
    ]);
    for (const row of comparison.tools) {
      expect(row.left === 'not-recognized' ? row.leftSurfaces : row.rightSurfaces).toEqual([]);
    }
    expect(comparison.frontmatterDiff).toEqual({
      originalText: 'a: 1\n',
      modifiedText: 'a: 1\n',
    });
  });

  it('reads extraction failure off the file’s null presentation (FR-028)', () => {
    // The parse is the file's, one per kind, so a side whose detail carries
    // no parsed presentation has unknown declarations for every recognizing
    // tool at once — the tool rows keep stating the recognitions, and the
    // unknown side serializes no document to diff against.
    const comparison = new InstructionRecognitionComparison(
      side(instructionDetail(LEFT_PATH, null), [COPILOT_ALL, CODEX]),
      side(instructionDetail(RIGHT_PATH, [scalarEntry('scope', 'project')]), [COPILOT_ALL]),
    );
    expect(comparison.tools.map((row) => [row.tool, row.left, row.right])).toEqual([
      ['copilot', 'recognized', 'recognized'],
      ['codex', 'recognized', 'not-recognized'],
    ]);
    expect(comparison.leftDeclarations).toBe('extraction-failed');
    expect(comparison.rightDeclarations).toBe('parsed');
    expect(comparison.frontmatterDiff).toBeNull();
  });

  it('publishes descriptive rows only — no rank, no winner, no fabricated relationships', () => {
    // The comparison's whole shape is closed: per-tool side states with
    // surfaces, per-side declaration states, and the two serialized
    // documents. No field exists that could carry a relationship row, a
    // precedence, or a verdict — an instruction file never publishes an
    // edge (api-types.ts § FileDetailDto, T217/T238), and none may be
    // invented here (FR-012).
    const comparison = new InstructionRecognitionComparison(
      side(instructionDetail(LEFT_PATH, [scalarEntry('scope', 'project')]), [CODEX]),
      side(instructionDetail(RIGHT_PATH, [scalarEntry('scope', 'workspace')]), [CLAUDE]),
    );
    expect(Object.keys(comparison).sort()).toEqual([
      'frontmatterDiff',
      'leftDeclarations',
      'rightDeclarations',
      'tools',
    ]);
    for (const row of comparison.tools) {
      expect(Object.keys(row).sort()).toEqual([
        'kind',
        'left',
        'leftSurfaces',
        'right',
        'rightSurfaces',
        'tool',
      ]);
    }
    expect(Object.keys(comparison.frontmatterDiff ?? {}).sort()).toEqual([
      'modifiedText',
      'originalText',
    ]);
  });
});
