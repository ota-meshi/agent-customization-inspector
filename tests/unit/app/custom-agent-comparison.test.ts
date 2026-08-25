// @vitest-environment happy-dom
// T573: the custom-agent comparison view state and its recognition rows
// (FR-011, FR-012, FR-030, FR-027; data-model.md § BrowserState
// · ComparisonSelection). Scoped to this kind by design: comparison is
// kind-specific with no shared module (spec.md § Clarifications Session
// 2026-08-14), and this kind's model is two files of one agent-name row
// compared whole — the row ownership is the compare route's own validation,
// so the state here sees only the two paths.
//
// One surface covers the whole kind, so the pairs under test are the ones its
// inventory can produce: a Codex TOML agent beside a Claude Code subagent,
// and a `.claude/agents/*.md` two products read under two different names.
//
// The state under test is the browser's: two distinct readable
// current-generation files named by Source-relative Path — the pair is the
// compare route's query, with no standing pre-selection — loaded through two
// ordinary `get-file-detail` requests, because there is no compare API, and
// dropped again by the same three cleanups every detail obeys: a newer
// committed generation, the central client-data purge, and leaving the view.
// What is under test on the data side is this kind's recognition metadata:
// tool recognition compared per tool, each cell carrying the name that tool
// identifies the agent by and the surfaces its admissions rest on; the files'
// declared metadata — one parse per kind (FR-028) — serialized once per side
// into the canonical YAML document the diff mounts, with a declared
// `mcp_servers`/`mcpServers`/`mcp-servers` block among its ordinary entries;
// and nothing fabricated — Codex's documented carrier inheritance above all,
// which is a strategy-registry fact no surface projects (FR-009).
//
// Environment note: this suite exercises browser-side code, so it names
// happy-dom explicitly — the `coverage` project runs the same files under the
// Node environment its contract and integration members need.
import { describe, expect, it } from 'vitest';

import {
  CustomAgentRecognitionComparison,
  type CustomAgentComparisonSideInput,
  type CustomAgentSideDefinition,
} from '../../../src/app/components/custom-agent-comparison/recognition-comparison';
import { customAgentComparisonRouteFor } from '../../../src/app/composables/custom-agent-comparison';
import { fromJsonStringBody } from '../../../src/app/components/detail-route';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  AgentDefinitionDto,
  DeclaredEntryDto,
  FileDetailDto,
  InspectionDataResult,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The Codex TOML agent and the Claude subagent that declare one name. */
const LEFT_PATH = '.codex/agents/reviewer.toml';
const RIGHT_PATH = '.claude/agents/reviewer.md';

/** The name both files declare, and therefore the row that owns the pair. */
const SHARED_NAME = 'reviewer';

/** One inventory definition: one `(file, tool)` recognition of this kind. */
function definition(
  sourceRelativePath: string,
  tool: AgentDefinitionDto['tool'],
  surfaces: AgentDefinitionDto['surfaces'],
): AgentDefinitionDto {
  return { sourceRelativePath, tool, surfaces, parseStatus: 'parsed', diagnosticIds: [] };
}

/** A committed snapshot holding the two readable files under one name's row. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-23T00:00:00.000Z',
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
    instructions: [],
    rules: [],
    prompts: [],
    plugins: [],
    outputStyles: [],
    permissions: [],
    settings: [],
    agents: [
      {
        name: SHARED_NAME,
        definitions: [
          definition(RIGHT_PATH, 'copilot', ['copilot-vscode', 'copilot-cli', 'copilot-cloud']),
          definition(RIGHT_PATH, 'claude', ['claude-cli-and-ide-clients']),
          definition(LEFT_PATH, 'codex', ['codex-local-clients']),
        ],
      },
    ],
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

/** One declared scalar entry, as a parser resolves it. */
function scalar(key: string, text: string): DeclaredEntryDto {
  return { key, keyKind: 'string', value: { kind: 'scalar', scalarKind: 'string', text } };
}

/**
 * One readable agent detail with the given parsed metadata, or — with a null
 * metadata — one whose extraction failed all-or-nothing (FR-028): no
 * presentation, the complete source still readable.
 */
function agentDetail(
  sourceRelativePath: string,
  metadata: readonly DeclaredEntryDto[] | null = [],
  sourceText = `source of ${sourceRelativePath}`,
): FileDetailDto {
  return {
    kind: 'agent',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText,
      sizeBytes: sourceText.length,
    },
    presentation: metadata === null ? null : { metadata, instructionsText: sourceText },
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

/** One comparison side: a detail plus the definitions the inventory attaches. */
function side(
  detail: FileDetailDto,
  definitions: readonly CustomAgentSideDefinition[],
): CustomAgentComparisonSideInput {
  return { detail, definitions };
}

describe('custom-agent comparison view (T573)', () => {
  it('loads exactly two existing details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(agentDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.customAgentComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.customAgentComparison.status.value).toBe('ready');
    expect(state.customAgentComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.customAgentComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary detail requests, one per side, in selection order. Every
    // call on the wire is a member of the closed catalog the client already
    // had — nothing compare-specific was requested.
    expect(detailCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('refuses the same path on both inputs without spending a request', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(agentDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.customAgentComparison.open(LEFT_PATH, LEFT_PATH);
    // The same file must not occupy both inputs, however many recognitions it
    // has (FR-011), and the client can answer that without asking the host.
    expect(state.customAgentComparison.status.value).toBe('same-path');
    expect(detailCalls(scripted.calls)).toEqual([]);
    state.dispose();
  });

  it('names the file that has no readable source instead of comparing it', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      detail: (path) => dataResult(path === RIGHT_PATH ? binaryDetail(path) : agentDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.customAgentComparison.open(LEFT_PATH, RIGHT_PATH);
    // A textless side is not comparison-eligible (FR-025), and the state
    // names the file rather than fabricating an empty side.
    expect(state.customAgentComparison.status.value).toBe('not-readable');
    expect(state.customAgentComparison.unreadablePath.value).toBe(RIGHT_PATH);
    state.dispose();
  });

  it('drops the open pair when a newer generation is committed (FR-030)', async () => {
    const scripted = scriptedChannel({
      sessions: [
        dataResult(snapshotWith()),
        dataResult(snapshotWith({ repositoryGeneration: 1 }), { repositoryGeneration: 1 }),
      ],
      detail: (path) => dataResult(agentDetail(path)),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.customAgentComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.customAgentComparison.status.value).toBe('ready');
    await state.refresh();
    // The previous generation's comparison view and its editor-model state go
    // together; the compare route re-requests the same pair afterwards.
    expect(state.customAgentComparison.status.value).toBe('idle');
    expect(state.customAgentComparison.leftDetail.value).toBeNull();
    expect(state.customAgentComparison.rightDetail.value).toBeNull();
    state.dispose();
  });

  it('names the row as well as the two files', () => {
    // The row is carried rather than derived, because one file can sit on two
    // rows: two files that share more than one name would otherwise settle on
    // whichever of them sorts first, and the compare page's pickers would
    // offer that row's files instead of the row the reader opened from.
    const route = customAgentComparisonRouteFor(SHARED_NAME, LEFT_PATH, RIGHT_PATH);
    expect(route.path).toBe('/agents/compare');
    expect(Object.keys(route.query).toSorted()).toEqual(['left', 'name', 'right']);
    // Each value rides as its JSON string body, the spelling every route in
    // this product uses, so a name holding any character a file name — or an
    // authored agent name — can reaches the comparison as it was published
    // (`detail-route.ts`).
    expect(fromJsonStringBody(route.query.name)).toBe(SHARED_NAME);
    expect(fromJsonStringBody(route.query.left)).toBe(LEFT_PATH);
    expect(fromJsonStringBody(route.query.right)).toBe(RIGHT_PATH);
  });
});

describe('custom-agent recognition metadata comparison (T573)', () => {
  it('compares recognition per tool and states each tool’s own name for the file', () => {
    // One `.claude/agents/*.md` is Claude Code's subagent and a Copilot agent
    // profile alike, and the two products name it differently — the cell is
    // where a reader sees that, per tool, never merged into one file-level
    // claim (US3 scenario 2, data-model.md § Inventory unit).
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH, [scalar('name', SHARED_NAME)]), [
        {
          agentName: SHARED_NAME,
          definition: definition(LEFT_PATH, 'codex', ['codex-local-clients']),
        },
      ]),
      side(agentDetail(RIGHT_PATH, [scalar('name', SHARED_NAME)]), [
        {
          agentName: 'reviewer',
          definition: definition(RIGHT_PATH, 'copilot', [
            'copilot-vscode',
            'copilot-cli',
            'copilot-cloud',
          ]),
        },
        {
          agentName: SHARED_NAME,
          definition: definition(RIGHT_PATH, 'claude', ['claude-cli-and-ide-clients']),
        },
      ]),
    );
    // Rows exist only where a recognition exists, in the contracted tool
    // order rather than any preference.
    expect(comparison.tools.map((row) => row.tool)).toEqual(['copilot', 'claude', 'codex']);
    const [copilot, claude, codex] = comparison.tools;
    // Copilot reads only the Markdown file here; Codex only the TOML one.
    expect(copilot!.left).toBeNull();
    expect(copilot!.right?.agentName).toBe('reviewer');
    expect(copilot!.right?.definition.surfaces).toEqual([
      'copilot-vscode',
      'copilot-cli',
      'copilot-cloud',
    ]);
    expect(claude!.left).toBeNull();
    expect(claude!.right?.agentName).toBe(SHARED_NAME);
    expect(codex!.left?.agentName).toBe(SHARED_NAME);
    expect(codex!.right).toBeNull();
    // Every row is this kind's; nothing else is captioned into the table.
    expect(comparison.tools.map((row) => row.kind)).toEqual(['agent', 'agent', 'agent']);
  });

  it('states a definition whose tool publishes no name for the file', () => {
    // A declared-`name` product reading a file that declares none publishes no
    // name at all, and the cell carries that rather than borrowing the path
    // (data-model.md § Inventory unit).
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH), [
        { agentName: null, definition: definition(LEFT_PATH, 'codex', ['codex-local-clients']) },
      ]),
      side(agentDetail(RIGHT_PATH), [
        {
          agentName: SHARED_NAME,
          definition: definition(RIGHT_PATH, 'claude', ['claude-cli-and-ide-clients']),
        },
      ]),
    );
    expect(comparison.tools.find((row) => row.tool === 'codex')?.left?.agentName).toBeNull();
  });

  it('serializes each side’s declared metadata into one canonical document', () => {
    // The two files wrote their keys in different orders and in different
    // formats; the canonical documents put the documented agent keys first
    // and sort the rest, so a line difference is a key or value difference
    // rather than an authoring-order difference (research.md § 7).
    const comparison = new CustomAgentRecognitionComparison(
      side(
        agentDetail(LEFT_PATH, [
          scalar('sandbox_mode', 'read-only'),
          scalar('description', 'Reviews code'),
          scalar('name', SHARED_NAME),
        ]),
        [],
      ),
      side(
        agentDetail(RIGHT_PATH, [
          scalar('description', 'Reviews code differently'),
          scalar('name', SHARED_NAME),
          scalar('model', 'sonnet'),
        ]),
        [],
      ),
    );
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.rightDeclarations).toBe('parsed');
    expect(comparison.metadataDiff?.originalText).toBe(
      'name: reviewer\ndescription: Reviews code\nsandbox_mode: read-only\n',
    );
    expect(comparison.metadataDiff?.modifiedText).toBe(
      'name: reviewer\ndescription: Reviews code differently\nmodel: sonnet\n',
    );
  });

  it('serializes an MCP-spelling block as an ordinary declared entry', () => {
    // Only explicit MCP configuration joins the MCP surfaces: an agent's
    // `mcp_servers`, `mcpServers`, or `mcp-servers` block is that file's own
    // declared content, so it is one entry of the diffed document and owns no
    // MCP row anywhere (data-model.md § Inventory unit).
    const declaration = (key: string): DeclaredEntryDto => ({
      key,
      keyKind: 'string',
      value: {
        kind: 'mapping',
        entries: [
          {
            key: 'docs',
            keyKind: 'string',
            value: {
              kind: 'mapping',
              entries: [scalar('command', 'npx'), scalar('api_key', 'ghp_LITERAL')],
            },
          },
        ],
      },
    });
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH, [scalar('name', SHARED_NAME), declaration('mcp_servers')]), []),
      side(agentDetail(RIGHT_PATH, [scalar('name', SHARED_NAME), declaration('mcp-servers')]), []),
    );
    // Each vendor's spelling survives as the key the file wrote (FR-007), the
    // credential inside it exactly as authored and unmasked (FR-025).
    expect(comparison.metadataDiff?.originalText).toContain('mcp_servers:');
    expect(comparison.metadataDiff?.originalText).toContain('api_key: ghp_LITERAL');
    expect(comparison.metadataDiff?.modifiedText).toContain('mcp-servers:');
    // And nothing in the built comparison is an MCP row, a connection, or a
    // carrier fact: the shape carries recognitions and two documents.
    expect(Object.keys(comparison).toSorted()).toEqual([
      'instructionsDiff',
      'leftDeclarations',
      'metadataDiff',
      'rightDeclarations',
      'tools',
    ]);
  });

  it('diffs the instructions apart from the declarations', () => {
    // The two locations are written in two formats, so aligning the files'
    // bytes would align quoting and delimiters instead of the prose: the
    // comparison splits each file's one parse into the same two halves its
    // detail shows and diffs each on its own (FR-007).
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH, [scalar('name', SHARED_NAME)], 'Review the change.'), []),
      side(agentDetail(RIGHT_PATH, [scalar('name', SHARED_NAME)], 'Review the change harder.'), []),
    );
    expect(comparison.instructionsDiff).toEqual({
      originalText: 'Review the change.',
      modifiedText: 'Review the change harder.',
    });
    // The instructions half carries no declarations and the metadata half no
    // prose: one parse, two documents, neither repeating the other.
    expect(comparison.metadataDiff?.originalText).toBe('name: reviewer\n');
  });

  it('diffs nothing against a side whose extraction failed', () => {
    // Extraction is all-or-nothing, so an unparsed side's declarations are
    // unknown rather than absent, and nothing may be diffed against them
    // (FR-028).
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH, null), []),
      side(agentDetail(RIGHT_PATH, [scalar('name', SHARED_NAME)]), []),
    );
    expect(comparison.leftDeclarations).toBe('extraction-failed');
    expect(comparison.rightDeclarations).toBe('parsed');
    expect(comparison.metadataDiff).toBeNull();
    // Both halves go together: an unparsed side has neither to diff.
    expect(comparison.instructionsDiff).toBeNull();
  });

  it('reads the instructions variant of a file both kinds own', () => {
    // `.claude/agents/CLAUDE.md` is a subagent by its directory and an
    // instruction file by its name, and `get-file-detail` answers with the
    // first variant its fixed order reaches — the comparison maps that
    // variant's two halves rather than reporting a parsed file as unparsed
    // (session.ts § fileDetail).
    const overlapping: FileDetailDto = {
      kind: 'instructions',
      file: {
        sourceId: 'source-repository',
        sourceRelativePath: '.claude/agents/CLAUDE.md',
        diagnosticIds: [],
        encoding: 'utf-8',
        hadLeadingBom: false,
        sourceText: '---\nname: overlapping\n---\n\nBody\n',
        sizeBytes: 32,
      },
      presentation: {
        frontmatter: [scalar('name', 'overlapping')],
        bodyText: '\nBody\n',
      },
      diagnostics: [],
    };
    const comparison = new CustomAgentRecognitionComparison(
      side(overlapping, []),
      side(agentDetail(RIGHT_PATH, [scalar('name', 'overlapping')]), []),
    );
    expect(comparison.leftDeclarations).toBe('parsed');
    expect(comparison.metadataDiff?.originalText).toBe('name: overlapping\n');
  });

  it('projects no carrier inheritance, order, or winner anywhere', () => {
    // Codex documents that a spawned agent inherits its parent's MCP
    // configuration, and Claude Code documents that only one of two same-name
    // files loads. Both are runtime composition the strategy registry
    // records and no surface projects (FR-009, FR-012).
    const comparison = new CustomAgentRecognitionComparison(
      side(agentDetail(LEFT_PATH, [scalar('name', SHARED_NAME)]), [
        {
          agentName: SHARED_NAME,
          definition: definition(LEFT_PATH, 'codex', ['codex-local-clients']),
        },
      ]),
      side(agentDetail(RIGHT_PATH, [scalar('name', SHARED_NAME)]), [
        {
          agentName: SHARED_NAME,
          definition: definition(RIGHT_PATH, 'claude', ['claude-cli-and-ide-clients']),
        },
      ]),
    );
    const serialized = JSON.stringify(comparison).toLowerCase();
    for (const projected of [
      'inherit',
      'precedence',
      'winner',
      'wins',
      'selected',
      'active',
      'relationship',
      'targetorigin',
    ]) {
      expect(serialized, projected).not.toContain(projected);
    }
  });
});
