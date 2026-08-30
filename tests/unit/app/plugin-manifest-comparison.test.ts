// T829: the plugin comparison view and its declaration documents (FR-011,
// FR-012, FR-025, FR-026, FR-028, FR-030).
//
// The behavior under test is the kind's own comparison surface: the
// comparison unit is one plugin name — the inventory's row unit — and its two
// sides are that name's declarations in two of the row's carriers, loaded
// through the existing `get-plugin-carrier-detail` calls (no compare API
// exists on the wire), each request naming the row so neither side can hold
// another plugin's entry. A path that is no current plugin carrier is
// rejected as the stale state.
//
// Each side is one JSON document: a catalog's entry serialized canonically
// (research.md § 7) and a manifest's the file it is, with no value masked,
// shortened, or substituted. What the surface never carries is runtime — a
// plugin's form, registration, installation, enablement, and trust are state
// outside this repository (FR-009) — and a relationship a manifest declares
// is a value here, never a file this surface opens.
import { describe, expect, it, vi } from 'vitest';

import { canonicalDeclaredEntriesJsonText } from '../../../src/app/components/declared-entries-json';
import { pluginComparisonRouteFor } from '../../../src/app/composables/plugin-comparison';
import { SessionViewState } from '../../../src/app/session/view-state';
import { SESSION_RPC_FUNCTIONS } from '../../../src/app/session/api-client';
import type {
  DeclaredEntryDto,
  InspectionDataResult,
  PluginCarrierDetailDto,
  PluginCarrierDto,
  PluginDeclarationDto,
  SessionSnapshot,
} from '../../../src/shared/api-types';

/** The two catalogs one marketplace is kept in, which most cases compare. */
const LEFT_PATH = '.claude-plugin/marketplace.json';

/**
 * One compared side as the route now addresses it: the fixture carriers are
 * the repository's, so the Source token is fixed here (FR-030).
 */
function side(sourceRelativePath: string): { source: 'repository'; sourceRelativePath: string } {
  return { source: 'repository', sourceRelativePath };
}
const RIGHT_PATH = '.agents/plugins/marketplace.json';

/** The plugin name both catalogs offer; the row that owns the comparison. */
const PLUGIN_NAME = 'review-assistant@acme-tools';

/** One inventory carrier of one row by one tool. */
function carrierOf(
  sourceRelativePath: string,
  tool: PluginCarrierDto['tool'],
  surfaces: PluginCarrierDto['surfaces'],
): PluginCarrierDto {
  return {
    sourceId: 'source-repository',
    sourceRelativePath,
    tool,
    surfaces,
    carrier: 'catalog',
    parseStatus: 'parsed',
    diagnosticIds: [],
    // What this carrier's offering reaches; these cases compare declarations,
    // so the plugin ships nothing beside them.
    files: [],
  };
}

/** A committed snapshot holding the two catalogs on one plugin row. */
function snapshotWith(overrides: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    sessionId: 'session-a',
    createdAt: '2026-08-25T00:00:00.000Z',
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
      sizeBytes: 64,
    })),
    instructions: [],
    rules: [],
    prompts: [],
    plugins: [
      {
        name: PLUGIN_NAME,
        carriers: [
          carrierOf(LEFT_PATH, 'claude', ['claude-cli-and-ide-clients']),
          carrierOf(RIGHT_PATH, 'codex', ['codex-plugin-clients']),
        ],
      },
    ],
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

/** Wraps a payload in the inspection-data success envelope. */
function dataResult<Data>(data: Data): InspectionDataResult<Data> {
  return { globalContentEpoch: 0, repositoryGeneration: 0, globalGeneration: null, data };
}

/** One catalog carrier detail offering the given declarations (null = failed extraction). */
function catalogDetail(
  sourceRelativePath: string,
  plugins: readonly PluginDeclarationDto[] | null,
): PluginCarrierDetailDto {
  return {
    carrier: 'catalog',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sizeBytes: 64,
    },
    catalogFields: [],
    plugins,
    diagnostics: [],
  };
}

/** One manifest carrier detail: the carrier *is* the plugin's manifest file. */
function manifestDetail(sourceRelativePath: string, pluginRoot: string): PluginCarrierDetailDto {
  return {
    carrier: 'manifest',
    file: {
      sourceId: 'source-repository',
      sourceRelativePath,
      diagnosticIds: [],
      encoding: 'utf-8',
      hadLeadingBom: false,
      sourceText: `{ "name": "${PLUGIN_NAME}" }\n`,
      sizeBytes: 40,
    },
    pluginRoot,
    diagnostics: [],
  };
}

/** One catalog entry with scalar fields, by the keys written. */
function declaration(name: string, fields: Record<string, string>): PluginDeclarationDto {
  return {
    name,
    fields: Object.entries(fields).map(([key, text]): DeclaredEntryDto => ({
      key,
      keyKind: 'string',
      value: { kind: 'scalar', scalarKind: 'string', text },
    })),
    sourceForm: 'repository-directory',
    pluginRoot: 'plugins/review-assistant/',
    manifestPaths: ['plugins/review-assistant/.claude-plugin/plugin.json'],
  };
}

/**
 * A channel scripted per function: `get-session` repeats its snapshot and
 * `get-plugin-carrier-detail` answers from the handler the case installed.
 * Every issued call is recorded, so a case can assert the exact request
 * sequence — two carrier-detail requests and no other function is what "no
 * compare API" means on the wire.
 */
function scriptedChannel(options: {
  sessions: readonly unknown[];
  carrier?: (params: { sourceRelativePath: string; pluginName: string | null }) => unknown;
  file?: (sourceRelativePath: string) => unknown;
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
        if (method === SESSION_RPC_FUNCTIONS.getPluginCarrierDetail) {
          const handler = options.carrier;
          if (handler === undefined) {
            return Promise.reject(new Error('no carrier handler scripted'));
          }
          return Promise.resolve().then(() =>
            handler(args[0] as { sourceRelativePath: string; pluginName: string | null }),
          );
        }
        if (method === SESSION_RPC_FUNCTIONS.getFileDetail) {
          const handler = options.file;
          if (handler === undefined) {
            return Promise.reject(new Error('no file handler scripted'));
          }
          return Promise.resolve().then(() => handler(args[0] as string));
        }
        if (method === SESSION_RPC_FUNCTIONS.getPluginFileDetail) {
          const handler = options.file;
          if (handler === undefined) {
            return Promise.reject(new Error('no plugin-file handler scripted'));
          }
          return Promise.resolve().then(() => handler((args[0] as { filePath: string }).filePath));
        }
        return Promise.reject(new Error(`unexpected call: ${method}`));
      },
    },
  };
}

/** The recorded carrier-detail requests, in issue order. */
function carrierCalls(calls: readonly { method: string; args: readonly unknown[] }[]) {
  return calls
    .filter((call) => call.method === SESSION_RPC_FUNCTIONS.getPluginCarrierDetail)
    .map((call) => call.args[0] as { sourceRelativePath: string; pluginName: string | null });
}

describe('plugin comparison view (T829)', () => {
  it('names the row and both carriers in the comparison route', () => {
    // The URL carries the model's own coordinates: the owning row's plugin
    // name and the two carriers by their whole identities — each side's own
    // Source and Source-relative Path — each path through the JSON string
    // body the detail routes use, so a name the URL cannot carry raw
    // round-trips to its own comparison (FR-030).
    expect(
      pluginComparisonRouteFor('repository', PLUGIN_NAME, side(LEFT_PATH), side(RIGHT_PATH)),
    ).toEqual({
      path: '/plugins/compare/repository',
      query: {
        name: PLUGIN_NAME,
        leftSource: 'repository',
        left: LEFT_PATH,
        rightSource: 'repository',
        right: RIGHT_PATH,
      },
    });
    expect(
      pluginComparisonRouteFor('repository', 'lone\uD800', side(LEFT_PATH), side(RIGHT_PATH)).query
        .name,
    ).toBe('lone\\ud800');
  });

  it('loads exactly two carrier details for the named row, with no compare API', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(
          catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, { version: '2.1.0' })]),
        ),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );

    expect(state.pluginComparison.status.value).toBe('ready');
    expect(state.pluginComparison.leftDetail.value?.file.sourceRelativePath).toBe(LEFT_PATH);
    expect(state.pluginComparison.rightDetail.value?.file.sourceRelativePath).toBe(RIGHT_PATH);
    // The row and the product travel with each request: the host answers for
    // one row as one product reads it, so neither side can come back holding
    // another plugin's entry or another product's reading of this one.
    expect(carrierCalls(scripted.calls)).toEqual([
      {
        source: 'repository',
        sourceRelativePath: LEFT_PATH,
        pluginName: PLUGIN_NAME,
        tool: 'claude',
      },
      {
        source: 'repository',
        sourceRelativePath: RIGHT_PATH,
        pluginName: PLUGIN_NAME,
        tool: 'codex',
      },
    ]);
    expect(
      scripted.calls.filter(
        (call) =>
          call.method !== SESSION_RPC_FUNCTIONS.getSession &&
          call.method !== SESSION_RPC_FUNCTIONS.getPluginCarrierDetail,
      ),
    ).toEqual([]);
    state.dispose();
  });

  it('reports a path that is no current plugin carrier as stale', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        sourceRelativePath === LEFT_PATH
          ? dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})]))
          : { error: { code: 'stale-resource' } },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side('plugins/gone/marketplace.json'),
      'codex',
    );

    expect(state.pluginComparison.status.value).toBe('stale');
    expect(state.pluginComparison.leftDetail.value).toBeNull();
    expect(state.pluginComparison.rightDetail.value).toBeNull();
    state.dispose();
  });

  it('retains the real failure message and recovers on retry', async () => {
    let fail = true;
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) => {
        if (fail && sourceRelativePath === RIGHT_PATH) {
          throw new Error('the host closed the connection');
        }
        return dataResult(
          catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, { version: '2.0.0' })]),
        );
      },
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );

    expect(state.pluginComparison.status.value).toBe('failed');
    expect(state.pluginComparison.errorMessage.value).toContain('the host closed the connection');

    fail = false;
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );
    expect(state.pluginComparison.status.value).toBe('ready');
    expect(state.pluginComparison.errorMessage.value).toBeNull();
    state.dispose();
  });

  it('settles a manifest pair and a file pair requested together (T829)', async () => {
    // A link that names a file wants three things at once: the carrier pair,
    // the manifests, and the compared file. The client correlates every detail
    // settlement through one request-token family, so two of them in flight at
    // once would leave whichever settled second discarded — and a discarded
    // request writes nothing, leaving its pane loading forever. They are
    // serialized instead, and this proves both settle.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})])),
      file: (sourceRelativePath) =>
        dataResult({
          file: {
            sourceId: 'source-repository',
            sourceRelativePath,
            encoding: 'utf-8',
            hadLeadingBom: false,
            sourceText: `# ${sourceRelativePath}\n`,
            sizeBytes: 8,
            diagnosticIds: [],
          },
          diagnostics: [],
        }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );

    const manifests = state.pluginComparison.openManifestPair(
      {
        filePath: 'plugins/left/.claude-plugin/plugin.json',
        carrier: {
          source: 'repository',
          sourceRelativePath: LEFT_PATH,
          tool: 'claude',
          pluginName: PLUGIN_NAME,
        },
      },
      {
        filePath: 'plugins/right/.claude-plugin/plugin.json',
        carrier: {
          source: 'repository',
          sourceRelativePath: RIGHT_PATH,
          tool: 'codex',
          pluginName: PLUGIN_NAME,
        },
      },
    );
    const files = state.pluginComparison.openFilePair(
      {
        filePath: 'plugins/left/README.md',
        carrier: {
          source: 'repository',
          sourceRelativePath: LEFT_PATH,
          tool: 'claude',
          pluginName: PLUGIN_NAME,
        },
      },
      {
        filePath: 'plugins/right/README.md',
        carrier: {
          source: 'repository',
          sourceRelativePath: RIGHT_PATH,
          tool: 'codex',
          pluginName: PLUGIN_NAME,
        },
      },
    );
    await Promise.all([manifests, files]);

    expect(state.pluginComparison.manifestStatus.value).toBe('ready');
    expect(state.pluginComparison.fileStatus.value).toBe('ready');
    state.dispose();
  });

  it('disposes the selected file pair\u2019s owners synchronously on a file change', async () => {
    // Choosing another of the plugin's files drops the previous file's
    // models in the same synchronous block as its state (data-model.md
    // \u00a7 BrowserState) \u2014 through the file pair's own registry, so the
    // carrier and manifest panes, which stay open across the change, keep
    // their models.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})])),
      file: (sourceRelativePath) =>
        dataResult({
          file: {
            sourceId: 'source-repository',
            sourceRelativePath,
            encoding: 'utf-8',
            hadLeadingBom: false,
            sourceText: `# ${sourceRelativePath}\n`,
            sizeBytes: 8,
            diagnosticIds: [],
          },
          diagnostics: [],
        }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );
    const fileOwner = vi.fn();
    const viewOwner = vi.fn();
    state.pluginComparison.registerOpenFileContentOwner(fileOwner);
    state.pluginComparison.registerOpenContentOwner(viewOwner);
    await state.pluginComparison.openFilePair(
      {
        filePath: 'plugins/left/README.md',
        carrier: {
          source: 'repository',
          sourceRelativePath: LEFT_PATH,
          tool: 'claude',
          pluginName: PLUGIN_NAME,
        },
      },
      {
        filePath: 'plugins/right/README.md',
        carrier: {
          source: 'repository',
          sourceRelativePath: RIGHT_PATH,
          tool: 'codex',
          pluginName: PLUGIN_NAME,
        },
      },
    );
    expect(fileOwner).toHaveBeenCalledTimes(1);
    expect(viewOwner).not.toHaveBeenCalled();
    state.dispose();
  });

  it('adopts a document a carrier response carried instead of reading it again', async () => {
    // One side is a catalog whose plugin declares itself with the very file the
    // other side's carrier is. That document arrived with the carrier
    // response, so neither pane may ask the host for it — the contract's one
    // request per document (contracts/http-api.md § Comparison views) — and
    // which side happens to hold it decides nothing: the same pair with the
    // sides swapped must cost the same nothing.
    const manifestPath = 'plugins/review-assistant/.claude-plugin/plugin.json';
    for (const manifestSide of ['left', 'right'] as const) {
      const scripted = scriptedChannel({
        sessions: [dataResult(snapshotWith())],
        // No file handler at all: any request for this document rejects, which
        // would settle the pane as failed instead of ready.
        carrier: ({ sourceRelativePath }) =>
          dataResult(
            (manifestSide === 'left') === (sourceRelativePath === LEFT_PATH)
              ? manifestDetail(manifestPath, 'plugins/review-assistant/')
              : catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})]),
          ),
      });
      const state = new SessionViewState({ channel: scripted.channel });
      await state.start();
      await state.pluginComparison.open(
        PLUGIN_NAME,
        side(LEFT_PATH),
        'claude',
        side(RIGHT_PATH),
        'codex',
      );
      const request = {
        filePath: manifestPath,
        carrier: {
          source: 'repository' as const,
          sourceRelativePath: LEFT_PATH,
          tool: 'claude' as const,
          pluginName: PLUGIN_NAME,
        },
      };
      // The page asks for the document each panel shows; two sides resolving
      // to one file are one read, which is the left's.
      await state.pluginComparison.openManifestPair(request, null);
      expect(state.pluginComparison.manifestStatus.value).toBe('ready');
      expect(state.pluginComparison.leftManifest.value?.file.sourceRelativePath).toBe(manifestPath);
      // The file panel reaches the same document when the reader selects the
      // manifest among the plugin's files.
      await state.pluginComparison.openFilePair(request, null);
      expect(state.pluginComparison.fileStatus.value).toBe('ready');
      expect(state.pluginComparison.leftFile.value?.file.sourceRelativePath).toBe(manifestPath);
      expect(
        scripted.calls.filter((call) => call.method === SESSION_RPC_FUNCTIONS.getPluginFileDetail),
      ).toEqual([]);
      state.dispose();
    }
  });

  it('refetches the carrier when the same row opens as another product\u2019s reading', async () => {
    // One catalog read as Claude reads it and as Codex reads it are two
    // answers (api-types.ts \u00a7 PluginCarrierDetailParams): a history step from
    // the Claude page to the Codex page \u2014 same file, same plugin name \u2014 must
    // fetch, never keep the other product's interpretation on screen as the
    // held declarations.
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    const open = (tool: 'claude' | 'codex') =>
      state.openPluginDetail(
        { source: 'repository', sourceRelativePath: LEFT_PATH, tool, pluginName: PLUGIN_NAME },
        null,
        null,
      );
    await open('claude');
    await open('codex');
    expect(
      scripted.calls.filter((call) => call.method === SESSION_RPC_FUNCTIONS.getPluginCarrierDetail),
    ).toHaveLength(2);
    state.dispose();
  });

  it('drops the plugin panel\u2019s own files when another detail route opens', async () => {
    // Leaving a plugin page for another kind's detail must take the plugin's
    // authored sources with it: the outgoing page's own close is a no-op by
    // then — the incoming open already owns the detail state — so the open is
    // what has to drop them (FR-027).
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})])),
      file: (sourceRelativePath) =>
        dataResult({
          file: {
            sourceId: 'source-repository',
            sourceRelativePath,
            encoding: 'utf-8',
            hadLeadingBom: false,
            sourceText: `# ${sourceRelativePath}\n`,
            sizeBytes: 8,
            diagnosticIds: [],
          },
          diagnostics: [],
        }),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    await state.openPluginDetail(
      {
        source: 'repository',
        sourceRelativePath: LEFT_PATH,
        tool: 'claude',
        pluginName: PLUGIN_NAME,
      },
      'plugins/review-assistant/.claude-plugin/plugin.json',
      'plugins/review-assistant/README.md',
    );
    expect(state.pluginDetail.value).not.toBeNull();
    expect(state.pluginManifestFile.value).not.toBeNull();
    expect(state.pluginOpenFile.value).not.toBeNull();

    // Any other detail route: the hook carrier's, which fails here because no
    // hook function is scripted — the point is what the open drops, not what
    // it adopts.
    await state.openHookCarrierDetail('.claude/settings.json');
    expect(state.pluginDetail.value).toBeNull();
    expect(state.pluginManifestFile.value).toBeNull();
    expect(state.pluginOpenFile.value).toBeNull();
    state.dispose();
  });

  it('runs registered content-owner disposers on close, like the sibling surfaces', async () => {
    const scripted = scriptedChannel({
      sessions: [dataResult(snapshotWith())],
      carrier: ({ sourceRelativePath }) =>
        dataResult(catalogDetail(sourceRelativePath, [declaration(PLUGIN_NAME, {})])),
    });
    const state = new SessionViewState({ channel: scripted.channel });
    await state.start();
    let disposed = 0;
    const unregister = state.pluginComparison.registerOpenContentOwner(() => {
      disposed += 1;
    });
    await state.pluginComparison.open(
      PLUGIN_NAME,
      side(LEFT_PATH),
      'claude',
      side(RIGHT_PATH),
      'codex',
    );
    state.pluginComparison.close();

    // Once for the open's own drop of the previous view, once for the close:
    // the models holding the declared values go with the view every time.
    expect(disposed).toBeGreaterThanOrEqual(2);
    expect(state.pluginComparison.status.value).toBe('idle');
    expect(state.pluginComparison.leftDetail.value).toBeNull();
    unregister();
    state.dispose();
  });
});

describe('plugin declaration documents (T829)', () => {
  /** One entry's fields as the wire publishes them, by the keys written. */
  const fields: readonly DeclaredEntryDto[] = [
    {
      key: 'version',
      keyKind: 'string',
      value: { kind: 'scalar', scalarKind: 'string', text: '2.1.0' },
    },
    {
      key: 'homepage',
      keyKind: 'string',
      value: {
        kind: 'scalar',
        scalarKind: 'string',
        text: 'https://acme.example/p?token=ghp_fixture_not_a_real_secret',
      },
    },
    {
      key: 'env',
      keyKind: 'string',
      value: {
        kind: 'mapping',
        entries: [
          {
            key: 'REVIEW_TOKEN',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: '${REVIEW_ASSISTANT_TOKEN}' },
          },
        ],
      },
    },
  ];

  it('serializes a declaration with every value exactly as authored', () => {
    // A credential stays the characters that were written and an environment
    // reference is never resolved: the comparison shows what the file says
    // (FR-026, FR-027). Nothing is masked, and no key is dropped.
    const text = canonicalDeclaredEntriesJsonText(fields);
    expect(text).toContain('"token=ghp_fixture_not_a_real_secret"'.slice(1));
    expect(text).toContain('${REVIEW_ASSISTANT_TOKEN}');
    expect(JSON.parse(text)).toEqual({
      env: { REVIEW_TOKEN: '${REVIEW_ASSISTANT_TOKEN}' },
      homepage: 'https://acme.example/p?token=ghp_fixture_not_a_real_secret',
      version: '2.1.0',
    });
  });

  it('orders both sides the same way, so a diff shows the drift and nothing else', () => {
    // The canonical order is the surface's, not either file's: two catalogs
    // that wrote the same keys in different orders differ in what they say,
    // never in the order they said it (research.md § 7).
    const reversed = [...fields].toReversed();
    expect(canonicalDeclaredEntriesJsonText(reversed)).toBe(
      canonicalDeclaredEntriesJsonText(fields),
    );
  });

  it('states no runtime fact about either side', () => {
    // Form, registration, installation, enablement, and trust are state
    // outside this repository (FR-009). A serialized declaration carries only
    // what the entry wrote, so none of those words can enter through it —
    // and a relationship the entry declares is a value here, never a file
    // this surface opens.
    const withComponents = canonicalDeclaredEntriesJsonText([
      ...fields,
      {
        key: 'skills',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: './skills/' },
      },
    ]);
    expect(JSON.parse(withComponents)).toEqual({
      env: { REVIEW_TOKEN: '${REVIEW_ASSISTANT_TOKEN}' },
      homepage: 'https://acme.example/p?token=ghp_fixture_not_a_real_secret',
      skills: './skills/',
      version: '2.1.0',
    });
    for (const word of ['installed', 'enabled', 'trusted', 'registered']) {
      expect(withComponents).not.toContain(word);
    }
  });

  it('serializes an entry that declares nothing as the empty object', () => {
    // A catalog may offer a plugin by name alone. The document is then the
    // empty object rather than absent: the entry exists and declares nothing,
    // which is what the other side is compared against.
    expect(canonicalDeclaredEntriesJsonText([])).toBe('{}');
  });
});
