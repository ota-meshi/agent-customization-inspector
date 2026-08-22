// T1123: the open-file function of the session API
// (contracts/http-api.md § open-file).
//
// The contract this suite holds to is what the host may launch: only a file
// the current committed generation published, addressed by the Source-relative
// Path every other request already uses, resolved to an absolute path the
// client never sees (FR-022, data-model.md § SourceBoundary). A path the
// generation does not hold takes the declared `stale-resource` outcome, the
// same one every detail function answers with.
//
// The suite runs the real scan over a real fixture so the path it opens is one
// the traversal actually published, and the session is built with a recording
// opener so nothing is launched on the machine running the tests.
import { rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { buildSecretFixture } from '../fixtures/secrets/build-fixtures';
import { RecordingFileOpener } from '../fixtures/file-opener';
import type { CommandResult, DeterministicRejection } from '../../src/shared/api-types';

/** The captured shape of one registered devframe RPC function. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly handler: (...args: readonly never[]) => unknown;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

/** Boots a session over a real fixture, runs its first scan, and keeps its opener. */
async function scannedFixture(
  targets?: readonly ('default-application' | 'visual-studio-code')[],
): Promise<{
  readonly context: InspectorHostContext;
  readonly opener: RecordingFileOpener;
  readonly root: string;
  readonly skillPath: string;
}> {
  const fixture = buildSecretFixture('inspector-open-file-contract');
  cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
  const opener =
    targets === undefined ? new RecordingFileOpener() : new RecordingFileOpener(targets);
  const session = new InspectionSession({
    invocationCwd: fixture.root,
    rootOptionValue: null,
    fileOpener: opener,
  });
  const context: InspectorHostContext = { session, coordinator: new SessionCoordinator(session) };
  const repository = session.snapshot().sources[0]!;
  const admission = context.coordinator.admitScan(repository.sourceId, {
    kind: 'startup',
    operationId: null,
  });
  if (admission.kind !== 'admitted') {
    throw new Error('the first scan was not admitted');
  }
  await executeRepositoryScan(context, admission.scanRequestId, repository.sourceId, 'repository');
  return { context, opener, root: fixture.root, skillPath: fixture.skillPath };
}

/** Invokes the registered `open-file` handler exactly as the channel would. */
async function openFile(
  context: InspectorHostContext,
  sourceRelativePath: string,
  target: string,
): Promise<CommandResult<null> | DeterministicRejection> {
  const functions = new Map<string, CapturedRpcFunction>();
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.set(fn.name, fn);
      },
    },
  };
  createInspectorDevframe(context).setup?.(ctx as never, undefined as never);
  const fn = functions.get('agent-customization-inspector:open-file')!;
  return (await fn.handler(sourceRelativePath as never, target as never)) as
    CommandResult<null> | DeterministicRejection;
}

describe('open-file', () => {
  it('launches the committed file at its absolute path', async () => {
    const { context, opener, root, skillPath } = await scannedFixture();
    const result = await openFile(context, skillPath, 'visual-studio-code');
    expect(result).toEqual({ globalContentEpoch: 0, data: null });
    // The path the launch receives is the Source's own root joined with the
    // published identity — the client sent no absolute path and holds none.
    expect(opener.launches).toEqual([
      { absolutePath: join(root, ...skillPath.split('/')), target: 'visual-studio-code' },
    ]);
  });

  it('carries the target the request named', async () => {
    const { context, opener, skillPath } = await scannedFixture();
    await openFile(context, skillPath, 'default-application');
    expect(opener.launches[0]?.target).toBe('default-application');
  });

  it('rejects a path no committed generation holds', async () => {
    const { context, opener } = await scannedFixture();
    // Never scanned, or removed by the commit that replaced the snapshot the
    // page was rendered from: indistinguishable, and answered alike.
    expect(await openFile(context, 'does/not/exist.md', 'default-application')).toEqual({
      error: { code: 'stale-resource' },
    });
    expect(opener.launches).toEqual([]);
  });

  it('launches nothing for a target outside the closed set', async () => {
    const { context, opener, skillPath } = await scannedFixture();
    // A client this product did not ship. The target resolves to none of the
    // launchers the host holds, so it throws there rather than at a guard that
    // would be the closed set written a second time.
    await expect(openFile(context, skillPath, 'some-other-editor')).rejects.toThrow();
    expect(opener.launches).toEqual([]);
  });

  it('publishes the applications the host can launch in the snapshot', async () => {
    const { context } = await scannedFixture(['default-application']);
    // FR-022: a machine with no editor installation publishes no editor, so
    // the page cannot offer one.
    expect(context.session.snapshot().fileOpenTargets).toEqual(['default-application']);
  });
});
