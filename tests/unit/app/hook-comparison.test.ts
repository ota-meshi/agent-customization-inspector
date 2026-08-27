// T908: the hook comparison view and the canonical serialization each side
// mounts (FR-011, FR-012, FR-027, FR-030; research.md § 7).
//
// The assertions run against the comparison state and the serializer rather
// than a mounted page: the unit project has no single-file-component compiler
// (the same reason T083 gives), and the decisions under test — which requests
// one open issues, what each outcome settles to, and what a declaration
// serializes to — are data decisions the page only draws. What genuinely needs
// a rendered page is asserted against the real app in
// `tests/e2e/hooks-comparison.spec.ts`: the pickers, the same-file rejection
// the compare route reports before requesting anything, and the diff itself.
//
// The contract: a comparison is two ordinary carrier-detail reads of files the
// inventory already lists, and a contained declaration is selected through the
// file that carries it. No runtime fact is selectable, because no row holds
// one (FR-009) — the route's coordinates are the event and the two paths, and
// nothing else.
import { describe, expect, it } from 'vitest';

import { canonicalHookEventJsonText } from '../../../src/app/components/declared-entries-json';
import { hookComparisonRouteFor } from '../../../src/app/composables/hook-comparison';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  DeclaredValueDto,
  HookCarrierDetailDto,
  HookDeclarationDto,
  HookEventDeclarationDto,
  InspectionDataResult,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The shared settings document both products read, and the Codex layer beside it. */
const LEFT_PATH = '.claude/settings.json';
const RIGHT_PATH = '.codex/config.toml';

/** One inventory declaration of one carrier by one tool. */
function declarationOf(
  sourceRelativePath: string,
  tool: HookDeclarationDto['tool'],
  carrier: HookDeclarationDto['carrier'],
  surfaces: HookDeclarationDto['surfaces'],
): HookDeclarationDto {
  return {
    sourceRelativePath,
    tool,
    carrier,
    surfaces,
    parseStatus: 'parsed',
    diagnosticIds: [],
  };
}

/** A committed snapshot holding the two readable carriers on one event row. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-26T00:00:00.000Z',
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
    hooks: [
      {
        event: 'PreToolUse',
        declarations: [
          declarationOf(LEFT_PATH, 'copilot', 'contained', ['copilot-vscode', 'copilot-cli']),
          declarationOf(LEFT_PATH, 'claude', 'contained', ['claude-cli-and-ide-clients']),
          declarationOf(RIGHT_PATH, 'codex', 'contained', ['codex-local-clients']),
        ],
      },
    ],
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

/** Wraps a payload in the inspection-data success envelope. */
function dataResult<Data>(data: Data): InspectionDataResult<Data> {
  return { globalContentEpoch: 0, repositoryGeneration: 0, globalGeneration: null, data };
}

/** One readable contained carrier detail with the given events (null = failed). */
function carrierDetail(
  sourceRelativePath: string,
  events: readonly HookEventDeclarationDto[] | null,
): HookCarrierDetailDto {
  return {
    carrier: 'contained',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sizeBytes: 24,
    },
    events,
    diagnostics: [],
  };
}

/** One declared event whose groups are the values given. */
function event(name: string, groups: readonly DeclaredValueDto[]): HookEventDeclarationDto {
  return { event: name, groups };
}

/** One scalar value as the wire publishes it. */
function text(value: string): DeclaredValueDto {
  return { kind: 'scalar', scalarKind: 'string', text: value };
}

/**
 * A channel scripted per function: `get-session` repeats its snapshot and
 * `get-hook-carrier-detail` answers from the handler the case installed. Every
 * issued call is recorded, so a case can assert the exact request sequence —
 * two carrier-detail requests and no other function is what "no compare API"
 * means on the wire.
 */
function scriptedChannel(options: {
  sessions: readonly unknown[];
  carrier?: (path: string) => unknown;
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
        if (method === SESSION_RPC_FUNCTIONS.getHookCarrierDetail) {
          const handler = options.carrier;
          if (handler === undefined) {
            return Promise.reject(new Error('no carrier handler scripted'));
          }
          return Promise.resolve().then(() => handler(String(args[0])));
        }
        return Promise.reject(new Error(`unexpected call: ${method}`));
      },
    },
  };
}

/** Paths of the recorded carrier-detail calls, in issue order. */
function carrierCalls(calls: readonly { method: string; args: readonly unknown[] }[]): string[] {
  return calls
    .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getHookCarrierDetail)
    .map((call) => String(call.args[0]));
}

describe('hook comparison view (T908)', () => {
  it('names the event and both carriers in the comparison route, and nothing else', () => {
    // The URL carries the model's own coordinates: the owning row's declared
    // event and the two carriers' Source-relative Paths (FR-030) — the same
    // builder every entry link and the pickers use. Three coordinates and no
    // fourth: a runtime fact is on no row, so there is nothing else to name
    // (FR-009).
    const route = hookComparisonRouteFor('PreToolUse', LEFT_PATH, RIGHT_PATH);
    expect(route).toEqual({
      path: '/hooks/compare',
      query: { event: 'PreToolUse', left: LEFT_PATH, right: RIGHT_PATH },
    });
    expect(Object.keys(route.query)).toEqual(['event', 'left', 'right']);
    // A declared event that is not well-formed UTF-16 — strict JSON resolves
    // an authored escape to a lone surrogate — rides the query through the
    // same reversible spelling the declaration detail uses
    // (`toJsonStringBody`): raw, the router's own query encoding would throw
    // `URIError` while the row's link renders.
    expect(hookComparisonRouteFor('\uD800', LEFT_PATH, RIGHT_PATH).query.event).toBe('\\ud800');
  });

  it('loads exactly two carrier details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) =>
        dataResult(carrierDetail(path, [event('PreToolUse', [text('./guard.sh')])])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.hookComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.hookComparison.status.value).toBe('ready');
    expect(state.hookComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.hookComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary carrier-detail requests, in link order, and nothing else: a
    // comparison is a read of committed details, not a new resource. Both
    // sides are contained declarations, selected through the files that carry
    // them — the settings document and the config layer, never a synthetic
    // coordinate for the block inside.
    expect(carrierCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('reports a path that is no hook carrier as stale', async () => {
    // The host answers `stale-resource` for any path without a hook
    // recognition — a subagent file whose frontmatter declares `hooks`
    // included, because that declaration is part of what the agent is and
    // publishes no hook row (T889). The view reports it as the stale state
    // rather than fabricating a side.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) =>
        path === LEFT_PATH
          ? dataResult(carrierDetail(path, [event('PreToolUse', [])]))
          : { error: { code: 'stale-resource' } },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.hookComparison.open(LEFT_PATH, '.claude/agents/reviewer.md');
    expect(state.hookComparison.status.value).toBe('stale');
    state.dispose();
  });

  it('retains the real failure message and recovers on retry', async () => {
    let fail = true;
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) => {
        if (fail) {
          throw new Error('carrier chunk lost');
        }
        return dataResult(carrierDetail(path, [event('PreToolUse', [])]));
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.hookComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.hookComparison.status.value).toBe('failed');
    expect(state.hookComparison.errorMessage.value).toBe('carrier chunk lost');
    fail = false;
    await state.hookComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.hookComparison.status.value).toBe('ready');
    expect(state.hookComparison.errorMessage.value).toBeNull();
    state.dispose();
  });

  it('runs registered content-owner disposers on close, like the sibling surfaces', async () => {
    // The Monaco models holding the serialized declarations are owned by the
    // component that mounted them; the state's contract is that every drop
    // path disposes them synchronously (data-model.md § BrowserState).
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) => dataResult(carrierDetail(path, [event('PreToolUse', [])])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.hookComparison.open(LEFT_PATH, RIGHT_PATH);
    let disposed = 0;
    const unregister = state.hookComparison.registerOpenContentOwner(() => {
      disposed += 1;
    });
    state.hookComparison.close();
    expect(disposed).toBe(1);
    // An unregistered owner is not called again: the component that unmounts
    // normally has nothing left for the purge to clear.
    unregister();
    state.hookComparison.close();
    expect(disposed).toBe(1);
    state.dispose();
  });
});

describe('hook declaration JSON serialization (T908)', () => {
  it('serializes the event key with its groups, values exactly as authored', () => {
    // The document a side mounts: the event key its carrier wrote, with the
    // groups under it. The key stays in the document because that is what a
    // reader pastes back into a hook map, and it is identical on both sides of
    // a comparison the row owns (FR-007).
    const declaration = event('PreToolUse', [
      {
        kind: 'mapping',
        entries: [
          { key: 'matcher', keyKind: 'string', value: text('Bash') },
          {
            key: 'hooks',
            keyKind: 'string',
            value: {
              kind: 'sequence',
              items: [
                {
                  kind: 'mapping',
                  entries: [
                    { key: 'type', keyKind: 'string', value: text('command') },
                    {
                      key: 'command',
                      keyKind: 'string',
                      value: text('curl -H "Authorization: Bearer ghp_literal" ${ENDPOINT}'),
                    },
                  ],
                },
              ],
            },
          },
        ],
      },
    ]);
    const document = canonicalHookEventJsonText(declaration);
    expect(JSON.parse(document)).toEqual({
      PreToolUse: [
        {
          // Canonical order sorts each mapping's keys, so both sides align
          // line by line whatever order the files wrote.
          hooks: [
            { command: 'curl -H "Authorization: Bearer ghp_literal" ${ENDPOINT}', type: 'command' },
          ],
          matcher: 'Bash',
        },
      ],
    });
    // The credential and the environment reference reach the document exactly
    // as written: nothing is masked, shortened, or resolved (FR-025, FR-026).
    expect(document).toContain('ghp_literal');
    expect(document).toContain('${ENDPOINT}');
    // Sorted, so the two sides' lines pair: `hooks` precedes `matcher` here
    // even though the file wrote `matcher` first.
    expect(document.indexOf('"hooks"')).toBeLessThan(document.indexOf('"matcher"'));
  });

  it('keeps a malformed group as authored, and an eventless declaration an empty list', () => {
    // A group that is not an object at all is published as the scalar it is:
    // a reader comparing their own files needs it shown rather than dropped
    // (FR-007).
    expect(JSON.parse(canonicalHookEventJsonText(event('Stop', [text('always')])))).toEqual({
      Stop: ['always'],
    });
    // An event declared with no group serializes as the empty list, an
    // authored fact shown rather than an empty panel.
    expect(canonicalHookEventJsonText(event('SessionStart', []))).toBe(
      '{\n  "SessionStart": []\n}',
    );
  });
});
