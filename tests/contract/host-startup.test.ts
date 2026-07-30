// T040: host startup contracts for the devframe dev server
// (contracts/http-api.md § Host requirements, § RPC function catalog).
// Covers the packaged-shell serving configuration, the unauthenticated
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

vi.mock('../../src/server/inspection/traversal', () => ({
  runTraversalScan: vi.fn(),
}));

vi.mock('devframe/adapters/dev', () => ({
  createDevServer: vi.fn(async () => ({ origin: 'http://localhost:1234', close: vi.fn() })),
}));

describe('host startup', () => {
  it('hands the inspector definition to devframe and forwards only its options', async () => {
    // The suite otherwise exercises the definition directly, which cannot show
    // that anything starts a server with it: `startInspectorHost` is the one
    // call the CLI makes, and an option it dropped — `openBrowser`, `onReady` —
    // would silently change what a launch does.
    const context = hostContext();
    const onReady = vi.fn();
    await startInspectorHost({ context, openBrowser: false, onReady });
    expect(vi.mocked(createDevServer)).toHaveBeenCalledTimes(1);
    const [definition, options] = vi.mocked(createDevServer).mock.calls[0]!;
    // The definition this suite exercises everywhere else — identified by the
    // contract-fixed product id, and carrying the same `setup` that registers
    // the RPC catalog.
    expect(definition.id).toBe(createInspectorDevframe(context).id);
    expect(typeof definition.setup).toBe('function');
    expect(options).toEqual({ openBrowser: false, onReady });
  });

  it('passes no server options when the launch names none', async () => {
    await startInspectorHost({ context: hostContext() });
    const [, options] = vi.mocked(createDevServer).mock.calls.at(-1)!;
    // An absent option must stay absent rather than becoming an explicit
    // `undefined`, which devframe would read as a value the launch chose.
    expect(options).toEqual({});
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
