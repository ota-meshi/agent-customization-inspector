// T934: the strict consent-preview pair of the session API contract
// (contracts/http-api.md § get-global-consent-preview,
// § create-global-consent-preview).
//
// The pair is asymmetric on purpose, and that asymmetry is what this suite
// pins. The read function returns only what is already current and never
// captures; the capture function is the only one that reads the environment
// and the only one that creates or replaces a preview. A read that recaptured
// would hand a recovering client a different preview than the one a later
// enable is bound to — so "the read never recaptures" is a contract clause,
// not an implementation detail.
//
// Neither function takes a parameter, which is the other half of the position:
// there is no tool selector, no proposed root, and no way for a client to
// narrow the three entries or proposeenance a root of its own.
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';
import {
  GLOBAL_HOME_VARIABLES,
  buildGlobalHomeFixture,
  observeTree,
  type GlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { chmodSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  CommandResult,
  GlobalConsentPreviewDto,
  GlobalEnableResultDto,
} from '../../src/shared/api-types';

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly type: string;
  readonly handler: (...args: never[]) => unknown;
}

function hostContext(): InspectorHostContext {
  const session = new InspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/**
 * One host's registered functions. Each call builds a fresh definition, so
 * each returns a host whose consent state is empty — which is what a new
 * session's is (FR-013).
 */
function registerFunctions(): Map<string, CapturedRpcFunction> {
  const functions = new Map<string, CapturedRpcFunction>();
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.set(fn.name, fn);
      },
    },
  };
  createInspectorDevframe(hostContext()).setup?.(ctx as never, undefined as never);
  return functions;
}

/** The two functions under test, from one host. */
function previewFunctions(): {
  read: () => unknown;
  create: () => unknown;
} {
  const functions = registerFunctions();
  const read = functions.get('agent-customization-inspector:get-global-consent-preview');
  const create = functions.get('agent-customization-inspector:create-global-consent-preview');
  if (read === undefined || create === undefined) {
    throw new Error('the consent-preview pair is not registered');
  }
  return { read: () => read.handler(), create: () => create.handler() };
}

/** The preview payload of a success, or a failure naming what came back. */
function payload(result: unknown): GlobalConsentPreviewDto {
  const success = result as CommandResult<GlobalConsentPreviewDto>;
  if (typeof success !== 'object' || success === null || !('data' in success)) {
    throw new Error(`expected a preview success, got ${JSON.stringify(result)}`);
  }
  return success.data;
}

const realEnvironment = { ...process.env };

/**
 * Every environment property a case may set: the three tool overrides, and
 * `HOME`, which is what `node:os.homedir()` answers from on POSIX — the shared
 * agent home always derives from that answer (FR-045), so a case that does not
 * pin it would capture the developer's real `~/.agents`.
 */
const MANAGED_VARIABLES = [...Object.values(GLOBAL_HOME_VARIABLES), 'HOME'];

afterEach(() => {
  for (const variable of MANAGED_VARIABLES) {
    const original = realEnvironment[variable];
    if (original === undefined) {
      // `Reflect.deleteProperty`, not `delete`: the lint rule forbids deleting
      // a computed key, and an absent property is what the capture treats as
      // absent — assigning `undefined` would leave the string "undefined".
      Reflect.deleteProperty(process.env, variable);
    } else {
      process.env[variable] = original;
    }
  }
});

describe('get-global-consent-preview', () => {
  it('rejects with the fixed code while no preview exists', () => {
    // A new session has none: Global inspection is disabled at start, so the
    // read function has nothing to return and says so as a declared outcome
    // rather than as an error.
    expect(previewFunctions().read()).toEqual({ error: { code: 'consent-preview-missing' } });
  });

  it('never captures, so a repeated read cannot create a preview', () => {
    const { read } = previewFunctions();
    process.env[GLOBAL_HOME_VARIABLES.claude] = '/env/claude';

    // Three reads with a perfectly capturable environment in place: the read
    // is a current-state lookup, and an environment it could have captured
    // changes nothing about what it returns.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      expect(read()).toEqual({ error: { code: 'consent-preview-missing' } });
    }
  });

  it('returns the same preview, byte-for-byte in field semantics, after a capture', () => {
    const { read, create } = previewFunctions();
    const created = payload(create());
    const first = payload(read());
    process.env[GLOBAL_HOME_VARIABLES.codex] = '/env/changed-after-capture';
    const second = payload(read());

    // The environment moved between the two reads and the preview did not: a
    // read never rereads the environment, so a recovering client sees the
    // exact preview the capture froze.
    expect(first).toEqual(created);
    expect(second).toEqual(created);
    expect(second.previewId).toBe(created.previewId);
  });

  it('is registered as a query, so it declares itself non-mutating', () => {
    const read = registerFunctions().get(
      'agent-customization-inspector:get-global-consent-preview',
    );
    expect(read?.type).toBe('query');
  });
});

describe('create-global-consent-preview', () => {
  it('captures all four entries in the fixed order, with no selector', () => {
    process.env[GLOBAL_HOME_VARIABLES.copilot] = '/env/copilot';
    process.env[GLOBAL_HOME_VARIABLES.claude] = '/env/claude';
    process.env[GLOBAL_HOME_VARIABLES.codex] = '/env/codex';
    process.env.HOME = '/env/home';
    const preview = payload(previewFunctions().create());

    // Every member is always evaluated: the request carries no parameter, so
    // there is nothing a client could send to narrow the set or to propose a
    // root the environment does not name. The shared agent home is the
    // always-derived fourth entry (FR-045).
    expect(preview.entries.map((entry) => entry.member)).toEqual([
      'copilot',
      'claude',
      'codex',
      'agents',
    ]);
    expect(preview.entries.map((entry) => entry.displayRoot)).toEqual([
      '/env/copilot',
      '/env/claude',
      '/env/codex',
      '/env/home/.agents',
    ]);
  });

  it('binds the shipped allowlist and traversal-plan versions', () => {
    const preview = payload(previewFunctions().create());
    // The exact strings, not whatever the source happens to hold: the pair
    // identifies the closed selection policy the preview commits to, and the
    // later enable request is refused when either no longer matches — so a
    // version that changed without anyone deciding to change it is the failure
    // this freezes.
    expect(preview.allowlistVersion).toBe('2026-08-27');
    expect(preview.traversalPlanVersion).toBe('2026-08-27');
  });

  it('shows an unusable override as itself rather than falling back', () => {
    process.env[GLOBAL_HOME_VARIABLES.copilot] = '';
    process.env[GLOBAL_HOME_VARIABLES.claude] = 'relative/claude';
    process.env[GLOBAL_HOME_VARIABLES.codex] = '/env/codex';
    process.env.HOME = '/env/home';
    const preview = payload(previewFunctions().create());

    // Two rejecting states, each attributed to the environment: replacing
    // either with the documented default would authorize a directory the
    // reader never set. The third row shows the ordinary case beside them.
    //
    // The `invalid` state is deliberately not driven through here. Measured on
    // Node 24 / darwin, neither of its triggers survives `process.env`: a NUL
    // truncates the value and a lone surrogate returns as U+FFFD. Asserting it
    // from this level would need a value the environment cannot carry, so the
    // unit suite covers that branch against the classifier directly.
    expect(preview.entries.map((entry) => [entry.inputState, entry.origin])).toEqual([
      ['present-empty', 'environment'],
      ['relative', 'environment'],
      ['eligible', 'environment'],
      ['eligible', 'default-home'],
    ]);
    // An empty override still has a row, and its display is the empty string:
    // the encoding produces an empty output only for an empty input.
    expect(preview.entries[0]?.displayRoot).toBe('');
    expect(preview.entries[1]?.displayRoot).toBe('relative/claude');
  });

  it('atomically replaces the previous unconsented preview', () => {
    const { read, create } = previewFunctions();
    process.env[GLOBAL_HOME_VARIABLES.codex] = '/env/first';
    const first = payload(create());
    process.env[GLOBAL_HOME_VARIABLES.codex] = '/env/second';
    const second = payload(create());

    // A new preview invalidates the previous one: the read function returns
    // only the newest, so the replaced ID names nothing the server still
    // holds.
    expect(second.previewId).not.toBe(first.previewId);
    expect(payload(read())).toEqual(second);
    expect(second.entries[2]?.displayRoot).toBe('/env/second');
  });

  it('is registered as a command, so it declares itself state-changing', () => {
    const create = registerFunctions().get(
      'agent-customization-inspector:create-global-consent-preview',
    );
    expect(create?.type).toBe('command');
  });

  it('carries an epoch-aware envelope with no generation fields', () => {
    const result = previewFunctions().create() as CommandResult<GlobalConsentPreviewDto>;
    // A preview is not a generation snapshot: the envelope is the command
    // shape — the epoch beside the payload — rather than the inspection-data
    // one (contracts/http-api.md § Common results and errors).
    expect(Object.keys(result).toSorted()).toEqual(['data', 'globalContentEpoch']);
    expect(result.globalContentEpoch).toBe(0);
  });
});

describe('the preview performs no I/O under a proposed root', () => {
  let fixture: GlobalHomeFixture;

  beforeEach(() => {
    fixture = buildGlobalHomeFixture();
    for (const [variable, value] of Object.entries(fixture.environment)) {
      process.env[variable] = value;
    }
    // The shared agent home derives from `homedir()`, so the fixture's base is
    // what a launch exports as the home (FR-045).
    process.env.HOME = fixture.home;
  });

  afterEach(() => {
    rmSync(fixture.base, { recursive: true, force: true });
  });

  it('leaves all four homes exactly as it found them', () => {
    const before = observeTree(fixture.base);
    expect(before.size).toBeGreaterThan(10);

    const { read, create } = previewFunctions();
    const preview = payload(create());
    read();
    read();
    payload(create());

    // Every home the preview named is untouched. The preview is what a reader
    // reviews *before* authorizing anything, so a stat, an enumeration, or a
    // read here would mean the product had already looked (FR-023).
    const after = observeTree(fixture.base);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
    // And the roots it names are the ones the fixture set, escaped for display.
    expect(preview.entries.map((entry) => entry.displayRoot).toSorted()).toEqual(
      [
        fixture.homes.agents,
        fixture.homes.claude,
        fixture.homes.codex,
        fixture.homes.copilot,
      ].toSorted(),
    );
  });

  it('names no path below a root, however many the allowlist admits', () => {
    const preview = payload(previewFunctions().create());
    const serialized = JSON.stringify(preview);

    // The preview carries no per-pattern display: what is read below an
    // admitted root is fixed by the shipped plan the version pair identifies,
    // and the consent copy explains that scope in plain language. A candidate
    // filename appearing here would be a second, drifting allowlist.
    for (const member of ['copilot', 'claude', 'codex', 'agents'] as const) {
      for (const candidate of fixture.expectedCandidatePaths[member]) {
        expect(serialized, candidate).not.toContain(candidate);
      }
    }
  });

  it('states the Global exclusions alone, and no Repository one', () => {
    const preview = payload(previewFunctions().create());
    // The exclusions come from the shipped registry — no authored list beside
    // the rules that could disagree with them — and only the Global-scoped
    // ones: a Repository exclusion says nothing about what consent to read a
    // home directory covers, so putting one here would describe the wrong
    // boundary to a reader deciding. The three vendor exclusions and the
    // shared managed-remote one are all of them.
    expect(preview.excludedRuleIds).toEqual([
      'claude.excluded.user-runtime',
      'codex.excluded.user-runtime',
      'copilot.excluded.user-runtime',
      'shared.excluded.managed-remote-state',
    ]);
  });
});

describe('enable-global', () => {
  let fixture: GlobalHomeFixture;

  beforeEach(() => {
    fixture = buildGlobalHomeFixture();
    for (const [variable, value] of Object.entries(fixture.environment)) {
      process.env[variable] = value;
    }
    process.env.HOME = fixture.home;
  });

  afterEach(() => {
    rmSync(fixture.base, { recursive: true, force: true });
  });

  /**
   * The preview and enable functions of *one* host. Taking them from separate
   * `registerFunctions()` calls would mean confirming a preview the enabling
   * host never captured: each definition owns its own consent state, which is
   * what keeps one test's confirmation out of another's.
   */
  function enableFunctions(): {
    create: () => unknown;
    enable: (body: unknown) => Promise<unknown>;
  } {
    const functions = registerFunctions();
    const create = functions.get('agent-customization-inspector:create-global-consent-preview');
    const enable = functions.get('agent-customization-inspector:enable-global');
    if (create === undefined || enable === undefined) {
      throw new Error('the consent functions are not registered');
    }
    return {
      create: () => create.handler(),
      enable: async (body: unknown) => (await enable.handler(body as never)) as unknown,
    };
  }

  /** The acceptance payload, or a failure naming what came back. */
  function accepted(result: unknown): GlobalEnableResultDto {
    const success = result as CommandResult<GlobalEnableResultDto>;
    if (typeof success !== 'object' || success === null || !('data' in success)) {
      throw new Error(`expected an acceptance, got ${JSON.stringify(result)}`);
    }
    return success.data;
  }

  it('refuses every body that is not a confirmation of the stored preview', async () => {
    // A host that has captured no preview: there is nothing to confirm, and
    // the refusal names that rather than the body.
    expect(
      await enableFunctions().enable({
        confirmed: true,
        allowlistVersion: '2026-08-27',
        previewId: 'x',
      }),
    ).toEqual({ error: { code: 'consent-preview-missing' } });

    const { create, enable } = enableFunctions();
    const preview = payload(create());
    const valid = {
      confirmed: true,
      allowlistVersion: preview.allowlistVersion,
      previewId: preview.previewId,
    };
    // An unconfirmed body, a moved read scope, and a stale preview ID: three
    // separate refusals, each naming what the reader has to do next.
    expect(await enable({ ...valid, confirmed: false })).toEqual({
      error: { code: 'consent-required' },
    });
    expect(await enable({ ...valid })).not.toEqual({ error: { code: 'consent-required' } });
  });

  it('refuses a stale preview ID and a moved allowlist version', async () => {
    const { create, enable } = enableFunctions();
    const preview = payload(create());
    expect(
      await enable({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: 'a-preview-this-host-never-issued',
      }),
    ).toEqual({ error: { code: 'consent-preview-mismatch' } });
    expect(
      await enable({
        confirmed: true,
        allowlistVersion: '1999-01-01',
        previewId: preview.previewId,
      }),
    ).toEqual({ error: { code: 'allowlist-version-mismatch' } });
  });

  it('ignores a tool selector, because the parameters have none', async () => {
    const { create, enable } = enableFunctions();
    const preview = payload(create());
    const result = accepted(
      await enable({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
        // A key this product never ships. It names nothing the server reads, so
        // it cannot narrow the consent — which is the whole reason there is no
        // selector to send. Naming one bound member is the sharper case: the
        // accepted set below is all four, so the key neither narrowed the
        // consent to it nor excluded the others.
        tools: ['claude'],
      }),
    );
    expect(result.acceptedTools).toEqual(['copilot', 'claude', 'codex', 'agents']);
  });

  it('queues one batch with one shared request ID for the admitted subset', async () => {
    const { create, enable } = enableFunctions();
    const preview = payload(create());
    const result = accepted(
      await enable({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
      }),
    );

    // All four members are bound and every fixture root is a readable
    // directory, so the admitted set is the whole evaluated one. One request
    // ID covers them all: the batch is one operation over the fixed four,
    // never one job per member.
    expect(result.state).toBe('queued');
    expect(result.scanRequestId).not.toBeNull();
    expect(result.acceptedTools).toEqual(['copilot', 'claude', 'codex', 'agents']);
    expect(result.rejectedTools).toEqual([]);
  });

  it('returns active-no-job with a null ID when nothing could be admitted', async () => {
    // Every tool variable emptied, so each is a lexical rejection decided from
    // the captured string alone. The shared agent home cannot be refused
    // lexically — its root is always the derived absolute default — so its
    // rejection is the deterministic root admission of a directory that does
    // not exist: the home points at a base holding no `.agents`.
    process.env[GLOBAL_HOME_VARIABLES.copilot] = '';
    process.env[GLOBAL_HOME_VARIABLES.claude] = '';
    process.env[GLOBAL_HOME_VARIABLES.codex] = '';
    process.env.HOME = join(fixture.base, 'no-agents-here');
    const { create, enable } = enableFunctions();
    const preview = payload(create());
    const result = accepted(
      await enable({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
      }),
    );

    // Even an all-refused confirmation is accepted: the reader confirmed, and
    // the deterministic answer is that there was nothing to read. No job, no
    // Source, no generation.
    expect(result).toEqual({
      state: 'active-no-job',
      scanRequestId: null,
      acceptedTools: [],
      rejectedTools: ['copilot', 'claude', 'codex', 'agents'],
    });
  });

  it('refuses a confirmation over an active consent, by the batch and then by the empty subset', async () => {
    const context = hostContext();
    const functions = new Map<string, CapturedRpcFunction>();
    createInspectorDevframe(context).setup?.(
      {
        rpc: {
          register(fn: CapturedRpcFunction) {
            functions.set(fn.name, fn);
          },
        },
      } as never,
      undefined as never,
    );
    const create = functions.get('agent-customization-inspector:create-global-consent-preview')!;
    const enable = functions.get('agent-customization-inspector:enable-global')!;
    const enableCall = enable.handler as (body: unknown) => Promise<unknown>;
    const preview = payload(create.handler());
    const body = {
      confirmed: true,
      allowlistVersion: preview.allowlistVersion,
      previewId: preview.previewId,
    };
    accepted(await enableCall(body));
    // While the accepted batch is in flight, retry is not offered at all:
    // `pendingTools` is nonempty, so a confirmation takes the in-progress
    // conflict rather than settling a second batch over the running one
    // (contracts/http-api.md § enable-global).
    expect(await enableCall(body)).toEqual({ error: { code: 'global-enable-in-progress' } });
    await expect
      .poll(() => context.session.snapshot().globalControl?.batchStatus, { timeout: 10_000 })
      .toBeNull();
    // Every member is now published, so the server-derived retryable subset
    // is empty and the same-preview retry has nothing to run: the active
    // consent is never silently replaced.
    expect(await enableCall(body)).toEqual({ error: { code: 'no-retryable-global-tool' } });
  });

  it('retries exactly the retryable subset under the same preview', async () => {
    // The Codex home is unreadable at the first confirmation, so its member
    // is rejected `root-unreadable` with the same-preview disposition while
    // the other three publish. Restoring the directory and confirming the
    // exact same preview again must run the retry for that one member —
    // preserving the published Sources and their controls untouched
    // (contracts/http-api.md § enable-global `retryableTools`).
    const codexHome = fixture.homes.codex;
    chmodSync(codexHome, 0o000);
    try {
      if (statSync(codexHome).mode & 0o700) {
        // Running as root, or on a filesystem that ignores the mode: the
        // unreadable premise cannot be materialized here, and the
        // empty-subset refusal above already covers that shape.
        return;
      }
      const context = hostContext();
      const functions = new Map<string, CapturedRpcFunction>();
      createInspectorDevframe(context).setup?.(
        {
          rpc: {
            register(fn: CapturedRpcFunction) {
              functions.set(fn.name, fn);
            },
          },
        } as never,
        undefined as never,
      );
      const create = functions.get('agent-customization-inspector:create-global-consent-preview')!;
      const enable = functions.get('agent-customization-inspector:enable-global')!;
      const enableCall = enable.handler as (body: unknown) => Promise<unknown>;
      const preview = payload(create.handler());
      const body = {
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
      };
      const first = accepted(await enableCall(body));
      expect(first.state).toBe('queued');
      expect(first.acceptedTools).toEqual(['copilot', 'claude', 'agents']);
      expect(first.rejectedTools).toEqual(['codex']);
      // The accepted batch runs behind the response; wait for its commit so
      // the published Sources exist before the retry runs beside them.
      await expect
        .poll(() => context.session.snapshot().globalControl?.batchStatus, { timeout: 10_000 })
        .toBeNull();
      const before = context.session.snapshot();
      const publishedSourceIds = before.sources
        .filter((source) => source.kind === 'global')
        .map((source) => source.sourceId)
        .toSorted();
      const survivorsBefore = new Set(before.sources.map((source) => source.sourceId));
      expect(publishedSourceIds).toHaveLength(3);
      expect(before.globalControl?.retryableTools).toEqual(['codex']);

      chmodSync(codexHome, 0o700);
      const retry = accepted(await enableCall(body));
      // Exactly the server-derived subset, never the published members.
      expect(retry.state).toBe('queued');
      expect(retry.acceptedTools).toEqual(['codex']);
      expect(retry.rejectedTools).toEqual([]);
      await expect
        .poll(() => context.session.snapshot().globalControl?.batchStatus, { timeout: 10_000 })
        .toBeNull();
      const after = context.session.snapshot();
      // The three published Sources survive with their identities; the
      // retried member's commit adds its own beside them.
      const survivors = after.sources.map((source) => source.sourceId);
      for (const sourceId of publishedSourceIds) {
        expect(survivors).toContain(sourceId);
      }
      // And with their published files: the retry's one-member batch carries
      // the untouched Sources' data forward into the generation it commits,
      // so nothing already on the list goes stale (FR-014, FR-030).
      const filesBySource = Map.groupBy(after.files, (file) => file.sourceId);
      for (const sourceId of publishedSourceIds) {
        expect(before.files.filter((file) => file.sourceId === sourceId)).toEqual(
          filesBySource.get(sourceId) ?? [],
        );
      }
      const codexSourceId = after.sources.find(
        (source) => !survivorsBefore.has(source.sourceId) && source.kind === 'global',
      )?.sourceId;
      expect(codexSourceId).toBeDefined();
      expect(after.files.some((file) => file.sourceId === codexSourceId)).toBe(true);
      expect(
        after.globalControl?.controls.find((control) => control.member === 'codex')?.state,
      ).toBe('published');
      expect(after.globalControl?.retryableTools).toEqual([]);
    } finally {
      chmodSync(codexHome, 0o700);
    }
  });

  it('is registered as a command, so it declares itself state-changing', () => {
    const enable = registerFunctions().get('agent-customization-inspector:enable-global');
    expect(enable?.type).toBe('command');
  });
});

describe('the preview freeze once consent exists', () => {
  let fixture: GlobalHomeFixture;

  beforeEach(() => {
    fixture = buildGlobalHomeFixture();
    for (const [variable, value] of Object.entries(fixture.environment)) {
      process.env[variable] = value;
    }
    process.env.HOME = fixture.home;
  });

  afterEach(() => {
    rmSync(fixture.base, { recursive: true, force: true });
  });

  it('refuses to replace the preview an active consent names', async () => {
    const functions = registerFunctions();
    const create = functions.get('agent-customization-inspector:create-global-consent-preview')!;
    const read = functions.get('agent-customization-inspector:get-global-consent-preview')!;
    const enable = functions.get('agent-customization-inspector:enable-global')!;
    const preview = (create.handler() as CommandResult<GlobalConsentPreviewDto>).data;
    await enable.handler({
      confirmed: true,
      allowlistVersion: preview.allowlistVersion,
      previewId: preview.previewId,
    } as never);

    // Replacing it would strand the consent: the recovery path for a fresh
    // client is to retrieve the exact record the active consent names, and a
    // replacement makes what the reader authorized unretrievable.
    expect(create.handler()).toEqual({ error: { code: 'consent-preview-frozen' } });
    // And the read still returns that exact frozen preview, which is what the
    // freeze exists to protect.
    expect((read.handler() as CommandResult<GlobalConsentPreviewDto>).data.previewId).toBe(
      preview.previewId,
    );
  });
});
