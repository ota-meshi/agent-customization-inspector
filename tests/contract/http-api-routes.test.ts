// T082: the registered RPC function catalog, and what is absent from it
// (contracts/http-api.md § RPC function catalog).
//
// Absence is the contract here. The product has no reveal, unmask, redact, or
// environment-resolution operation, and that is a position rather than a gap:
// an authored value is published exactly as written or not at all, so there is
// nothing for a reveal step to uncover and nothing a masking step could
// correctly hide. A resolution operation would be worse — it would read the
// process environment on an inspected file's behalf, which is the one thing the
// read boundary exists to prevent.
//
// A test that only checked the shipped names would pass while such a function
// sat one commit away, so this suite pins the absent names too. What an
// unregistered call does is devframe's own dispatch and is not re-asserted
// here; what belongs to this product is that setting the host up registers
// nothing under those names and writes no session state of its own.
import { describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { SESSION_RPC_FUNCTIONS } from '../../src/app/session/api-client';
import { RecordingFileOpener } from '../fixtures/file-opener';

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

/**
 * Operation names for the capabilities this product deliberately does not
 * have. Spelled the way each would plausibly be named, so a future
 * registration under any of them fails this suite rather than shipping.
 */
const ABSENT_OPERATIONS = [
  'agent-customization-inspector:reveal-value',
  'agent-customization-inspector:reveal-secret',
  'agent-customization-inspector:unmask-value',
  'agent-customization-inspector:mask-value',
  'agent-customization-inspector:redact-value',
  'agent-customization-inspector:resolve-environment-reference',
  'agent-customization-inspector:resolve-environment-variable',
];

describe('the registered session RPC catalog', () => {
  it('registers exactly the functions this release ships', () => {
    expect([...registerFunctions().keys()].toSorted()).toEqual([
      'agent-customization-inspector:create-global-consent-preview',
      'agent-customization-inspector:disable-global',
      'agent-customization-inspector:enable-global',
      'agent-customization-inspector:get-file-detail',
      'agent-customization-inspector:get-global-consent-preview',
      'agent-customization-inspector:get-hook-carrier-detail',
      'agent-customization-inspector:get-mcp-carrier-detail',
      'agent-customization-inspector:get-permission-policy-detail',
      'agent-customization-inspector:get-plugin-carrier-detail',
      'agent-customization-inspector:get-plugin-file-detail',
      'agent-customization-inspector:get-session',
      'agent-customization-inspector:open-file',
      'agent-customization-inspector:rescan-global',
      'agent-customization-inspector:rescan-repository',
    ]);
  });

  it('is exactly what the browser client is able to call', () => {
    // The client's catalog is a closed union, so a name it cannot spell is a
    // name it cannot issue. Comparing the two sets is what keeps the browser
    // from being able to ask for something the host does not define, and the
    // host from quietly defining something nothing calls.
    expect(Object.values(SESSION_RPC_FUNCTIONS).toSorted()).toEqual(
      [...registerFunctions().keys()].toSorted(),
    );
  });

  it.each(ABSENT_OPERATIONS)('registers no %s function', (name) => {
    expect(registerFunctions().has(name)).toBe(false);
  });

  it('writes no session state while registering', () => {
    // Registration is declaration, not execution: no handler has run yet, so
    // the session must be exactly what its constructor bootstrapped — no
    // diagnostic, no generation, no Source change. This is what makes the
    // absence assertions above meaningful: a name that registers nothing can
    // still be reached if setting the host up already did the work.
    const context = hostContext();
    const before = JSON.stringify(context.session.snapshot());
    createInspectorDevframe(context).setup?.(
      { rpc: { register() {} } } as never,
      undefined as never,
    );
    expect(JSON.stringify(context.session.snapshot())).toBe(before);
  });
});
