// T1046: every declared session-API result is one complete JSON-serializable
// value (contracts/http-api.md § Common results and errors; FR-042).
//
// devframe serializes what a registered function returns; nothing in this
// repository writes the response bytes. So the wire contract reduces to one
// property, and it is the property no type can state: that the value survives
// JSON with nothing lost. A `Map`, a `Set`, a `Date`, a class instance with
// getters, an `undefined` property, or a `RegExp` all type-check as part of a
// DTO and all arrive at the browser as something else — `{}` for the first
// three, a dropped key for the fourth.
//
// The check is therefore a round-trip: `JSON.parse(JSON.stringify(result))`
// must deep-equal the result, and every object inside it must be a plain
// object or an array. That fails for exactly the values above and passes for
// everything a DTO is allowed to hold.
//
// The suites that own what the envelopes *say* are the contract ones
// (`tests/contract/http-api-session.test.ts`, `http-api-files.test.ts`); what
// this one owns is that whatever they say survives the channel. It runs over a
// real fixture repository so the envelopes carry real content — a diagnostic,
// a stale-failure error, a progress record, and a file detail — rather than
// empty shapes that would round-trip whatever the code did.
import { rmSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { afterAll, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import {
  GLOBAL_HOME_VARIABLES,
  buildGlobalHomeFixture,
} from '../fixtures/global-homes/build-fixtures';
import { buildAllCustomizationKindFixture } from '../fixtures/repositories/build-fixtures';
import { RecordingFileOpener } from '../fixtures/file-opener';

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  /** The registered function name the browser calls. */
  readonly name: string;
  /** devframe's own function type; unused here. */
  readonly type: string;
  /** The handler whose return value devframe serializes. */
  readonly handler: (...args: never[]) => unknown;
}

const fixture = buildAllCustomizationKindFixture('aci-snapshot-encoding');

afterAll(() => {
  rmSync(fixture.root, { recursive: true, force: true });
});

/** A session rooted at the shared fixture, with its RPC functions registered. */
function hostFunctions(): {
  context: InspectorHostContext;
  functions: Map<string, CapturedRpcFunction>;
} {
  return hostFunctionsFor(fixture.root);
}

/** A session rooted at `root`, with its RPC functions registered. */
function hostFunctionsFor(root: string): {
  context: InspectorHostContext;
  functions: Map<string, CapturedRpcFunction>;
} {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  const context = { session, coordinator: new SessionCoordinator(session) };
  const functions = new Map<string, CapturedRpcFunction>();
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.set(fn.name, fn);
      },
    },
  };
  createInspectorDevframe(context).setup?.(ctx as never, undefined as never);
  return { context, functions };
}

/**
 * Every object reachable from `value`, so the plain-object check below reaches
 * a `Map` nested three levels down rather than only a top-level one.
 */
function reachableObjects(value: unknown, seen = new Set<object>()): readonly object[] {
  if (typeof value !== 'object' || value === null) return [];
  if (seen.has(value)) return [];
  seen.add(value);
  const found: object[] = [value];
  for (const member of Object.values(value)) found.push(...reachableObjects(member, seen));
  return found;
}

/**
 * Asserts one declared result is a complete JSON-serializable value: it
 * round-trips through JSON unchanged, and everything inside it is a plain
 * object or an array.
 */
function expectWireSerializable(result: unknown, label: string): void {
  const roundTripped: unknown = JSON.parse(JSON.stringify(result));
  // `toStrictEqual`, not `toEqual`: a property whose value is `undefined`
  // disappears through JSON, and `toEqual` treats the dropped key and the
  // present-but-undefined one as the same object. That difference is exactly
  // the defect this suite exists to catch.
  expect(roundTripped, `${label} loses or changes a value through JSON`).toStrictEqual(result);
  for (const reached of reachableObjects(result)) {
    const prototype = Object.getPrototypeOf(reached) as unknown;
    expect(
      Array.isArray(reached) || prototype === Object.prototype || prototype === null,
      `${label} carries a ${(reached as object).constructor?.name ?? 'prototyped'} value, which JSON does not preserve`,
    ).toBe(true);
  }
}

/**
 * Admits one rescan and runs it to its commit. The request ID has to be the
 * admitted one: a commit correlated to an ID the session never issued is
 * discarded, which would leave every envelope below empty and prove nothing.
 */
async function commitScan(host: {
  context: InspectorHostContext;
  functions: Map<string, CapturedRpcFunction>;
}): Promise<void> {
  const snapshot = host.context.session.snapshot();
  const admitted = (await host.functions
    .get('agent-customization-inspector:rescan-repository')!
    .handler()) as { data: { scanRequestId: string } };
  await executeRepositoryScan(
    host.context,
    admitted.data.scanRequestId,
    snapshot.sources[0]!.sourceId,
    'repository',
  );
}

/** A session over the shared fixture whose first scan has committed. */
async function scannedContext(): Promise<{
  context: InspectorHostContext;
  functions: Map<string, CapturedRpcFunction>;
}> {
  const host = hostFunctions();
  await commitScan(host);
  return host;
}

describe('every declared result survives the devframe channel', () => {
  it('serializes the session snapshot, its diagnostics, and its progress record', async () => {
    const { functions } = await scannedContext();
    const result = await functions.get('agent-customization-inspector:get-session')!.handler();
    expectWireSerializable(result, 'get-session');

    // The fixture commits partial with file-confined outcomes, so what this
    // round-tripped is a snapshot carrying real files, real diagnostics, and a
    // real progress record — not an empty shape that would round-trip whatever
    // the code did.
    const snapshot = (
      result as {
        data: {
          files: readonly unknown[];
          diagnostics: readonly unknown[];
          sources: readonly { progress: unknown }[];
        };
      }
    ).data;
    expect(snapshot.files.length).toBeGreaterThan(0);
    expect(snapshot.diagnostics.length).toBeGreaterThan(0);
    expect(snapshot.sources[0]!.progress).not.toBeNull();
  });

  it('serializes a file detail envelope', async () => {
    const { context, functions } = await scannedContext();
    const snapshot = context.session.snapshot();
    const file = snapshot.files[0];
    expect(file, 'the fixture scan published no file to ask about').toBeDefined();
    const result = await functions.get('agent-customization-inspector:get-file-detail')!.handler({
      source: snapshot.sources[0]!.sourceId,
      sourceRelativePath: file!.sourceRelativePath,
    } as never);
    expectWireSerializable(result, 'get-file-detail');
  });

  it('serializes the scan admission a rescan returns', async () => {
    const { functions } = await scannedContext();
    const result = await functions
      .get('agent-customization-inspector:rescan-repository')!
      .handler();
    await setImmediate();
    expectWireSerializable(result, 'rescan-repository');
  });

  it('serializes the stale-failure error a request-owned failure leaves behind', async () => {
    // Its own fixture, removed after the first scan commits: a rescan whose
    // root has gone retains the failure on the Source it belongs to, and the
    // snapshot carrying it still has to reach the browser. The removal is why
    // this fixture is not the shared one.
    const doomed = buildAllCustomizationKindFixture('aci-snapshot-encoding-stale');
    const host = hostFunctionsFor(doomed.root);
    const { context, functions } = host;
    await commitScan(host);
    rmSync(doomed.root, { recursive: true, force: true });

    // A second admitted scan, now over a root that is gone: the attempt fails
    // and the session retains it as this Source's stale overlay.
    await commitScan(host);
    const result = await functions.get('agent-customization-inspector:get-session')!.handler();
    expectWireSerializable(result, 'get-session after a retained failure');
    expect(
      context.session.snapshot().staleFailures,
      'the retained failure did not reach the snapshot',
    ).not.toEqual([]);
  });

  it('serializes the control-only recovery snapshot while Global is fenced', async () => {
    // Two things have to be true before the fenced DTO exists at all, and
    // neither is free: Global must be enabled — a disable over a session that
    // never enabled is the documented no-op and fences nothing — and the
    // barrier must be held between acceptance and its terminal commit. One
    // tracked in-flight execution holds it, which is the window a still-running
    // scan holds open (contracts/http-api.md § disable-global).
    const global = buildGlobalHomeFixture('aci-encoding-homes');
    const restore = new Map<string, string | undefined>();
    for (const member of ['claude', 'codex', 'copilot'] as const) {
      const variable = GLOBAL_HOME_VARIABLES[member];
      restore.set(variable, process.env[variable]);
      process.env[variable] = global.homes[member];
    }
    restore.set('HOME', process.env['HOME']);
    process.env['HOME'] = global.home;

    const { context, functions } = hostFunctions();
    const call = async (name: string, body?: unknown): Promise<unknown> =>
      (
        functions.get(`agent-customization-inspector:${name}`)!.handler as (
          body?: unknown,
        ) => unknown
      )(body);

    const preview = (await call('create-global-consent-preview')) as {
      data: { allowlistVersion: string; previewId: string };
    };
    await call('enable-global', {
      confirmed: true,
      allowlistVersion: preview.data.allowlistVersion,
      previewId: preview.data.previewId,
    });
    await expect
      .poll(() => context.session.snapshot().globalControl?.batchStatus, { timeout: 10_000 })
      .toBeNull();

    const inFlight = Promise.withResolvers<unknown>();
    context.coordinator.trackInFlight(inFlight.promise);
    const disable = call('disable-global');

    const fenced = (await call('get-session')) as { readonly data: Record<string, unknown> };
    expectWireSerializable(fenced, 'get-session while fenced');
    // The control DTO, not a generation snapshot: what round-tripped above is
    // the fenced shape rather than the ordinary one.
    expect(Object.keys(fenced.data).toSorted()).toEqual([
      'globalContentEpoch',
      'globalControl',
      'globalDisableInProgress',
      'globalEnableInProgress',
      'sessionId',
    ]);

    inFlight.resolve(null);
    await disable;
    for (const [variable, value] of restore) {
      if (value === undefined) Reflect.deleteProperty(process.env, variable);
      else process.env[variable] = value;
    }
    rmSync(global.base, { recursive: true, force: true });
  });
});

/** A DTO-shaped class: it type-checks as a detail and loses its prototype through JSON. */
class FileDetailLike {
  /** The path the detail is for. */
  readonly sourceRelativePath: string;

  /** Records the path a serialization probe carries. */
  constructor(sourceRelativePath: string) {
    this.sourceRelativePath = sourceRelativePath;
  }
}

describe('the serialization check itself', () => {
  // A check nobody has seen fail is a check nobody has: these are the exact
  // values that type-check inside a DTO and arrive at the browser as something
  // else, and each one has to make the assertion above fail.
  it.each([
    { name: 'a Map', value: { data: new Map([['a', 1]]) } },
    { name: 'a Set', value: { data: new Set([1]) } },
    { name: 'a Date', value: { data: new Date(0) } },
    { name: 'an undefined property', value: { data: { present: 1, missing: undefined } } },
    { name: 'a class instance', value: { data: new FileDetailLike('a') } },
  ])('rejects $name', ({ value }) => {
    expect(() => {
      expectWireSerializable(value, 'probe');
    }).toThrow();
  });

  it('accepts a plain nested DTO', () => {
    expect(() => {
      expectWireSerializable(
        { globalContentEpoch: 1, data: { files: [{ path: 'a', diagnostics: [] }] } },
        'probe',
      );
    }).not.toThrow();
  });
});
