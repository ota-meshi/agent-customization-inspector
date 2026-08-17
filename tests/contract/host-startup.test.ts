// T040: host startup contracts for the devframe dev server
// (contracts/http-api.md § Host requirements, § RPC function catalog).
// Covers the packaged-shell serving configuration, the product-owned
// best-effort `open` browser helper running after the launch line with
// devframe's bundled opener disabled, the unauthenticated
// loopback binding, the absence of startup documentation/network access and
// of any customization-content classification at startup, the exact packed
// package fields, and the ownerless automatic-startup rejection reaching the
// process top level without a fabricated Diagnostic or scan result.
import { basename, isAbsolute } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
import {
  createInspectorDevframe,
  executeRepositoryScan,
  startInspectorHost,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { createDevServer } from 'devframe/adapters/dev';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { runTraversalScan } from '../../src/server/inspection/traversal';
import type { InspectionDataResult, SessionSnapshot } from '../../src/shared/api-types';

// Only the walk is stubbed. The rest of the module is the real thing, because
// the scan's configuration-read stage reads the carrier through the same
// module — `statThroughLink`, `readCandidate`, `rethrowIfResourceExhaustion` —
// and a whole-module replacement would make those exports undefined rather
// than exercise the failure this suite is about.
vi.mock('../../src/server/inspection/traversal', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../src/server/inspection/traversal')>()),
  runTraversalScan: vi.fn(),
}));

vi.mock('devframe/adapters/dev', () => ({
  createDevServer: vi.fn(async () => ({ origin: 'http://localhost:1234', close: vi.fn() })),
}));

vi.mock('open', () => ({ default: vi.fn(async () => ({}) as never) }));
const { default: open } = await import('open');

/** The `onReady` payload devframe reports after binding the loopback port. */
const READY_INFO = { origin: 'http://localhost:1234', port: 1234, app: {} as never };

describe('host startup', () => {
  it('hands the inspector definition to devframe with its bundled opener disabled', async () => {
    // The suite otherwise exercises the definition directly, which cannot show
    // that anything starts a server with it: `startInspectorHost` is the one
    // call the CLI makes. The product owns browser opening through the `open`
    // package, so every launch hands devframe an explicit `openBrowser: false`
    // — inheriting devframe's own opener would let a second helper spawn.
    const context = hostContext();
    await startInspectorHost({ context, openBrowser: true });
    expect(vi.mocked(createDevServer)).toHaveBeenCalledTimes(1);
    const [definition, options] = vi.mocked(createDevServer).mock.calls[0]!;
    // The definition this suite exercises everywhere else — identified by the
    // contract-fixed product id, and carrying the same `setup` that registers
    // the RPC catalog.
    expect(definition.id).toBe(createInspectorDevframe(context).id);
    expect(typeof definition.setup).toBe('function');
    // Besides the composed onReady, the host always hands devframe the H3
    // app carrying the `/skills/**` shell fallback — the one route family
    // devframe's extension-guarded SPA fallback cannot serve; the served
    // behavior itself is proven in the browser suites' fresh deep-link loads.
    expect(options?.app).toBeDefined();
    expect(options?.openBrowser).toBe(false);
    expect(typeof options?.onReady).toBe('function');
  });

  it('prints through the caller onReady before spawning the open helper', async () => {
    // FR-001: the launch line is the fallback for a failed or unsupported
    // helper, so it must be observable before the helper runs.
    const order: string[] = [];
    const onReady = vi.fn(() => {
      order.push('caller-ready');
    });
    vi.mocked(open).mockImplementationOnce(async () => {
      order.push('open-helper');
      return {} as never;
    });
    await startInspectorHost({ context: hostContext(), openBrowser: true, onReady });
    await vi.mocked(createDevServer).mock.calls.at(-1)![1]!.onReady!(READY_INFO);
    expect(onReady).toHaveBeenCalledWith(READY_INFO);
    expect(vi.mocked(open)).toHaveBeenCalledWith('http://localhost:1234/');
    expect(order).toEqual(['caller-ready', 'open-helper']);
  });

  it.each([
    ['false maps from --no-open', { openBrowser: false }],
    ['an unset option opens nothing', {}],
  ])('spawns no helper when %s', async (_label, launch) => {
    vi.mocked(open).mockClear();
    await startInspectorHost({ context: hostContext(), ...launch });
    await vi.mocked(createDevServer).mock.calls.at(-1)![1]!.onReady!(READY_INFO);
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it('keeps a failed helper spawn best-effort instead of failing the launch', async () => {
    // The rejection `open` reports when no OS helper can spawn (e.g. a Linux
    // host without xdg-open). FR-001 makes opening best-effort: the launch
    // line already printed is the fallback and the startup must not fail.
    vi.mocked(open).mockRejectedValueOnce(new Error('no helper available'));
    await startInspectorHost({ context: hostContext(), openBrowser: true });
    await expect(
      vi.mocked(createDevServer).mock.calls.at(-1)![1]!.onReady!(READY_INFO),
    ).resolves.toBeUndefined();
  });
});

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly type: string;
  readonly handler: (...args: never[]) => unknown;
}

/** Builds a bootstrap session/coordinator pair for the host definition. */
function hostContext(): InspectorHostContext {
  const session = new InspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
  });
  return { session, coordinator: new SessionCoordinator(session) };
}

/** Runs the definition's `setup` against a collecting RPC registry. */
function registerFunctions(context: InspectorHostContext): {
  definition: ReturnType<typeof createInspectorDevframe>;
  functions: CapturedRpcFunction[];
} {
  const definition = createInspectorDevframe(context);
  const functions: CapturedRpcFunction[] = [];
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.push(fn);
      },
    },
  };
  definition.setup?.(ctx as never, undefined as never);
  return { definition, functions };
}

describe('devframe host definition', () => {
  it('serves the packaged SPA shell from the CLI bundle its own `public` sibling', () => {
    const { definition } = registerFunctions(hostContext());
    const distDir = definition.cli?.distDir ?? '';
    // The directory is resolved from `import.meta.url`, so from source it is
    // this module's `public` sibling and from the bundle it is `dist/public`.
    // What the contract fixes is the shape: an absolute path ending in
    // `public`, never a cwd-relative one — devframe resolves a relative
    // distDir against the invocation cwd, which is the *inspected*
    // repository. That the packaged value really is `dist/public` is proven
    // by the package suite, which serves the built shell from an unrelated
    // working directory.
    expect(isAbsolute(distDir)).toBe(true);
    expect(basename(distDir)).toBe('public');
  });

  it('runs unauthenticated behind the loopback binding', () => {
    const { definition } = registerFunctions(hostContext());
    expect(definition.cli?.auth).toBe(false);
  });

  it('declares no host override, so devframe binds its loopback default', () => {
    const { definition } = registerFunctions(hostContext());
    // No `host` key at all: re-declaring devframe's own 'localhost' default
    // would be duplicated policy, and any other value would leave loopback.
    expect(definition.cli).not.toHaveProperty('host');
    expect(JSON.stringify(definition.cli)).not.toMatch(/0\.0\.0\.0|::\b|\blan\b/u);
  });

  it('registers every session function under the product namespace', () => {
    const { functions } = registerFunctions(hostContext());
    expect(functions.map((fn) => fn.name)).toEqual([
      'agent-customization-inspector:get-session',
      'agent-customization-inspector:get-file-detail',
      'agent-customization-inspector:rescan-repository',
    ]);
  });

  it('does not enable the optional devframe MCP route', () => {
    const { definition } = registerFunctions(hostContext());
    expect(definition.cli).not.toHaveProperty('mcp');
  });

  it('performs zero documentation or network access while starting', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const context = hostContext();
    const { functions } = registerFunctions(context);
    // The read function is the whole startup path a freshly loaded shell
    // exercises; it may not reach the network.
    for (const fn of functions.filter((candidate) => candidate.type === 'query')) {
      fn.handler();
    }
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('classifies no customization content at startup', () => {
    const context = hostContext();
    const { functions } = registerFunctions(context);
    const getSession = functions.find(
      (fn) => fn.name === 'agent-customization-inspector:get-session',
    );
    const result = getSession?.handler() as InspectionDataResult<SessionSnapshot>;
    // Bootstrap generation 0 exists before any read: no file, no diagnostic,
    // and no recognition of any kind (FR-002).
    expect(result.repositoryGeneration).toBe(0);
    expect(result.globalGeneration).toBeNull();
    expect(result.data.files).toEqual([]);
    expect(result.data.diagnostics).toEqual([]);
    expect(runTraversalScan).not.toHaveBeenCalled();
  });
});

describe('packed package fields', () => {
  it('declares the exact Node.js engine range', () => {
    expect(packageJson.engines.node).toBe('^24.11.0 || ^26.0.0');
  });

  it('maps bin directly at the packaged CLI bundle', () => {
    expect(packageJson.bin).toEqual({ 'agent-customization-inspector': 'dist/cli.mjs' });
  });
});

describe('ownerless automatic startup failure', () => {
  it('propagates the rejection instead of fabricating a Diagnostic or result', async () => {
    const context = hostContext();
    const sourceId = context.session.repositorySourceId;
    const admission = context.coordinator.admitScan(sourceId, {
      kind: 'startup',
      operationId: null,
    });
    expect(admission.kind).toBe('admitted');
    const failure = new Error('the traversal collapsed');
    vi.mocked(runTraversalScan).mockRejectedValueOnce(failure);
    // The automatic startup scan has no RPC owner, so nothing here converts
    // its rejection into a product outcome: the caller — the process top
    // level — receives the real error.
    await expect(
      executeRepositoryScan(
        context,
        admission.kind === 'admitted' ? admission.scanRequestId : '',
        sourceId,
        'repository',
      ),
    ).rejects.toBe(failure);
    const snapshot = context.session.snapshot();
    expect(snapshot.repositoryGeneration).toBe(0);
    expect(snapshot.diagnostics).toEqual([]);
    expect(snapshot.sessionDiagnosticIds).toEqual([]);
    expect(snapshot.repositoryFailureDiagnosticId).toBeNull();
    expect(snapshot.staleFailures).toEqual([]);
  });
});
