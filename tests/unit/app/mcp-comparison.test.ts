// T397: the MCP comparison view and its serialization model (FR-011,
// FR-012, FR-025, FR-026, FR-028, FR-030).
//
// The behavior under test is the kind's own comparison surface: the
// comparison unit is one declared server name — the inventory's row unit —
// and its two sides are that name's declarations in two of the row's
// carriers, loaded through the existing `get-mcp-carrier-detail` calls (no
// compare API exists on the wire), with a non-carrier path rejected as the
// stale state (only explicit MCP configuration joins the MCP surfaces). No
// same-path or unreadable state exists: the
// compare route rejects a same-file link before opening, and a named row's
// carriers are always parsed and readable
// (api-types.ts § McpDeclarationDto.parseStatus). Each side is serialized to one canonical JSON
// document for Monaco to diff (research.md § 7), with no value masked,
// shortened, or substituted; the detail's serialization of the same fields
// keeps the authored order (FR-007).
import { describe, expect, it } from 'vitest';

import {
  canonicalDeclaredEntriesJsonText,
  declaredEntriesJsonText,
} from '../../../src/app/components/declared-entries-json';
import { mcpComparisonRouteFor } from '../../../src/app/composables/mcp-comparison';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  DeclaredEntryDto,
  InspectionDataResult,
  McpCarrierDetailDto,
  McpDeclarationDto,
  McpServerDeclarationDto,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The two readable carrier paths most cases compare. */
const LEFT_PATH = '.codex/config.toml';
const RIGHT_PATH = '.mcp.json';

/** One inventory declaration of one carrier by one tool. */
function declarationOf(
  sourceRelativePath: string,
  tool: McpDeclarationDto['tool'],
  surfaces: McpDeclarationDto['surfaces'],
): McpDeclarationDto {
  return { sourceRelativePath, tool, surfaces, parseStatus: 'parsed', diagnosticIds: [] };
}

/** A committed snapshot holding the two readable carriers on one name row. */
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
    instructions: [],
    rules: [],
    prompts: [],
    permissions: [],
    skills: [],
    mcp: [
      {
        name: 'shared',
        declarations: [
          declarationOf(LEFT_PATH, 'codex', ['codex-local-clients']),
          declarationOf(RIGHT_PATH, 'copilot', ['copilot-vscode', 'copilot-cli']),
          declarationOf(RIGHT_PATH, 'claude', ['claude-cli-and-ide-clients']),
        ],
      },
    ],
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

/** One readable carrier detail with the given servers (null = failed extraction). */
function carrierDetail(
  sourceRelativePath: string,
  servers: readonly McpServerDeclarationDto[] | null,
): McpCarrierDetailDto {
  return {
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sizeBytes: 24,
    },
    servers,
    diagnostics: [],
  };
}

/** One declared server with scalar fields, by the keys written. */
function server(name: string, fields: Record<string, string>): McpServerDeclarationDto {
  return {
    name,
    fields: Object.entries(fields).map(([key, text]) => ({
      key,
      keyKind: 'string',
      value: { kind: 'scalar', scalarKind: 'string', text },
    })),
  };
}

/**
 * A channel scripted per function: `get-session` repeats its snapshot and
 * `get-mcp-carrier-detail` answers from the handler the case installed.
 * Every issued call is recorded, so a case can assert the exact request
 * sequence — two carrier-detail requests and no other function is what "no
 * compare API" means on the wire.
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
        if (method === SESSION_RPC_FUNCTIONS.getMcpCarrierDetail) {
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
    .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getMcpCarrierDetail)
    .map((call) => String(call.args[0]));
}

describe('MCP comparison view (T397)', () => {
  it('names the row and both carriers in the comparison route', () => {
    // The URL carries the model's own coordinates: the owning row's declared
    // name and the two carriers' Source-relative Paths (FR-030) — the same
    // builder every entry link and the pickers use.
    expect(mcpComparisonRouteFor('shared', LEFT_PATH, RIGHT_PATH)).toEqual({
      path: '/mcp/compare',
      query: { name: 'shared', left: LEFT_PATH, right: RIGHT_PATH },
    });
    // A declared name that is not well-formed UTF-16 — strict JSON resolves
    // an authored `"\uD800"` escape to a lone surrogate — rides the query
    // through the same reversible spelling the declaration detail uses
    // (`toJsonStringBody`): raw, the router's own query encoding
    // would throw `URIError` while the row's link renders. The escape is
    // `JSON.stringify`'s own, lowercase hex included — the spelling is the
    // platform's, and `JSON.parse` reads either case back.
    expect(mcpComparisonRouteFor('\uD800', LEFT_PATH, RIGHT_PATH).query.name).toBe('\\ud800');
  });

  it('loads exactly two carrier details and adopts both, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) => dataResult(carrierDetail(path, [server('shared', { command: 'npx' })])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.mcpComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.mcpComparison.status.value).toBe('ready');
    expect(state.mcpComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.mcpComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // Two ordinary carrier-detail requests, in link order, and nothing else:
    // a comparison is a read of committed details, not a new resource.
    expect(carrierCalls(scripted.calls)).toEqual([LEFT_PATH, RIGHT_PATH]);
    state.dispose();
  });

  it('reports a non-carrier path as stale: only explicit carriers resolve', async () => {
    // The host answers `stale-resource` for any path without an MCP
    // recognition — an agent file spelling `mcp-servers` included. The view
    // reports it as the stale state rather than fabricating a side.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) =>
        path === LEFT_PATH
          ? dataResult(carrierDetail(path, []))
          : { error: { code: 'stale-resource' } },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.mcpComparison.open(LEFT_PATH, '.github/agents/deploy.md');
    expect(state.mcpComparison.status.value).toBe('stale');
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
        return dataResult(carrierDetail(path, []));
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.mcpComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.mcpComparison.status.value).toBe('failed');
    expect(state.mcpComparison.errorMessage.value).toBe('carrier chunk lost');
    fail = false;
    await state.mcpComparison.open(LEFT_PATH, RIGHT_PATH);
    expect(state.mcpComparison.status.value).toBe('ready');
    expect(state.mcpComparison.errorMessage.value).toBeNull();
    state.dispose();
  });

  it('runs registered content-owner disposers on close, like the sibling surfaces', async () => {
    // The Monaco models holding the serialized declarations are owned by the
    // component that mounted them; the state's contract is that every drop
    // path disposes them synchronously (data-model.md § BrowserState).
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: (path) => dataResult(carrierDetail(path, [server('shared', {})])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.mcpComparison.open(LEFT_PATH, RIGHT_PATH);
    let disposed = 0;
    const unregister = state.mcpComparison.registerOpenContentOwner(() => {
      disposed += 1;
    });
    state.mcpComparison.close();
    expect(disposed).toBe(1);
    // An unregistered owner is not called again: the component that unmounts
    // normally has nothing left for the purge to clear.
    unregister();
    state.mcpComparison.close();
    expect(disposed).toBe(1);
    state.dispose();
  });
});

describe('MCP declaration JSON serialization (T397)', () => {
  /** One string-keyed entry, the shape every explicit carrier produces. */
  function entry(key: string, value: DeclaredEntryDto['value']): DeclaredEntryDto {
    return { key, keyKind: 'string', value };
  }

  it('orders the canonical document and serializes values as authored (FR-025, FR-026)', () => {
    // The authored order deliberately scrambles the canonical one: the
    // common declaration keys lead in the fixed reading order, every other
    // key follows sorted, and a nested mapping sorts its keys — so the same
    // field faces itself on the other side — while sequence items keep
    // their order, which is the declaration's own data. The values — a
    // literal credential and an environment reference among them — are
    // serialized as the characters the carrier wrote, with nothing masked
    // and nothing resolved.
    const text = canonicalDeclaredEntriesJsonText([
      entry('env', {
        kind: 'mapping',
        entries: [
          entry('ENDPOINT', { kind: 'scalar', scalarKind: 'string', text: '${MCP_ENDPOINT}' }),
          entry('API_KEY', { kind: 'scalar', scalarKind: 'string', text: 'ghp_SECRET000' }),
        ],
      }),
      entry('zeta', { kind: 'scalar', scalarKind: 'string', text: 'extra' }),
      entry('args', {
        kind: 'sequence',
        items: [
          { kind: 'scalar', scalarKind: 'string', text: 'value' },
          { kind: 'scalar', scalarKind: 'string', text: '--flag' },
        ],
      }),
      entry('custom', { kind: 'scalar', scalarKind: 'string', text: 'extra' }),
      entry('command', { kind: 'scalar', scalarKind: 'string', text: 'codex-owned' }),
      entry('type', { kind: 'scalar', scalarKind: 'string', text: 'stdio' }),
    ]);
    expect(text).toBe(
      [
        '{',
        '  "type": "stdio",',
        '  "command": "codex-owned",',
        '  "args": [',
        '    "value",',
        '    "--flag"',
        '  ],',
        '  "env": {',
        '    "API_KEY": "ghp_SECRET000",',
        '    "ENDPOINT": "${MCP_ENDPOINT}"',
        '  },',
        '  "custom": "extra",',
        '  "zeta": "extra"',
        '}',
      ].join('\n'),
    );
  });

  it('keeps the authored order whole in the detail serialization (FR-007)', () => {
    // The detail publishes the declaration by the keys the file wrote, in
    // the file's own order — nested mappings included — so its document is
    // serialized without the comparison's canonical reordering.
    expect(
      declaredEntriesJsonText([
        entry('env', {
          kind: 'mapping',
          entries: [
            entry('ENDPOINT', { kind: 'scalar', scalarKind: 'string', text: '${MCP_ENDPOINT}' }),
            entry('API_KEY', { kind: 'scalar', scalarKind: 'string', text: 'ghp_SECRET000' }),
          ],
        }),
        entry('command', { kind: 'scalar', scalarKind: 'string', text: 'npx' }),
      ]),
    ).toBe(
      [
        '{',
        '  "env": {',
        '    "ENDPOINT": "${MCP_ENDPOINT}",',
        '    "API_KEY": "ghp_SECRET000"',
        '  },',
        '  "command": "npx"',
        '}',
      ].join('\n'),
    );
  });

  it('spells each scalar by the parsed kind the wire publishes beside it', () => {
    // The kind directs the spelling, never a re-parse of the rendering: a
    // boolean and a double-representable number spell bare, a number JSON
    // has no bare spelling for — a TOML 64-bit integer's digits, a TOML
    // `nan` — keeps its exact text as a JSON string, and a string stays a
    // string, so the authored string `'7'` stays `"7"` and a
    // `null`-spelling string never reads as the authored null the absent
    // variant serializes. Both sides pass through the same rule, so no
    // spelling manufactures a difference.
    const fields = [
      entry('port', { kind: 'scalar', scalarKind: 'number', text: '7' }),
      entry('enabled', { kind: 'scalar', scalarKind: 'boolean', text: 'true' }),
      entry('padded', { kind: 'scalar', scalarKind: 'string', text: '007' }),
      entry('quoted', { kind: 'scalar', scalarKind: 'string', text: '7' }),
      entry('empty', { kind: 'scalar', scalarKind: 'string', text: '' }),
      entry('nullish', { kind: 'scalar', scalarKind: 'string', text: 'null' }),
      entry('unset', { kind: 'absent' }),
      entry('big', {
        kind: 'scalar',
        scalarKind: 'number',
        text: '123456789012345678901234567890',
      }),
      entry('notanumber', { kind: 'scalar', scalarKind: 'number', text: 'NaN' }),
    ];
    const text = canonicalDeclaredEntriesJsonText(fields);
    expect(text).toBe(
      [
        '{',
        '  "big": "123456789012345678901234567890",',
        '  "empty": "",',
        '  "enabled": true,',
        '  "notanumber": "NaN",',
        '  "nullish": "null",',
        '  "padded": "007",',
        '  "port": 7,',
        '  "quoted": "7",',
        '  "unset": null',
        '}',
      ].join('\n'),
    );
    expect(canonicalDeclaredEntriesJsonText(fields)).toBe(text);
  });

  it('escapes what a JSON string cannot carry raw, keeping every character visible', () => {
    // JSON's own escaping is the transport: a newline spells `\n`, so a
    // multiline value pastes back as authored, and a control character or
    // lone surrogate becomes its escape instead of an invisible byte.
    expect(
      declaredEntriesJsonText([
        entry('notes', { kind: 'scalar', scalarKind: 'string', text: 'line1\nline2' }),
      ]),
    ).toBe(['{', '  "notes": "line1\\nline2"', '}'].join('\n'));
    expect(
      declaredEntriesJsonText([
        entry('odd', { kind: 'scalar', scalarKind: 'string', text: 'a\u0000b' }),
      ]),
    ).toBe(['{', '  "odd": "a\\u0000b"', '}'].join('\n'));
  });

  it('serializes a fieldless declaration as the empty object', () => {
    // An authored `{}` is a declared fact, shown rather than an empty panel.
    expect(declaredEntriesJsonText([])).toBe('{}');
    // Empty containers inside a declaration keep their authored shape too,
    // in the canonical key order.
    expect(
      canonicalDeclaredEntriesJsonText([
        entry('env', { kind: 'mapping', entries: [] }),
        entry('args', { kind: 'sequence', items: [] }),
      ]),
    ).toBe(['{', '  "args": [],', '  "env": {}', '}'].join('\n'));
  });
});
