// T004: what identifies one declaration inside a hook carrier, and what
// happens to a second declaration that shares part of that identity
// (FR-007, FR-009, `api-types.ts` § DeclaredHookDto).
//
// A carrier of the named-hook format declares one event under as many hook
// names as its author wrote, so a declaration is the pair — the hook and the
// event — rather than either half. The union that answers a detail request
// deduplicates on that pair because one carrier can be read by more than one
// product and a shared declaration is one declaration read twice; what it must
// never do is treat two different pairs as one, because the inventory counts
// them separately and the reader would be shown fewer declarations than their
// file holds with nothing saying so.
//
// The names here are what makes the case: a hook name is authored JSON text,
// and JSON can spell every character, so a name may hold whatever the
// separator is. Joining the two halves with U+0000 put the pairs
// `("audit", "log" + NUL + "PostToolUse")` and `("audit" + NUL + "log",
// "PostToolUse")` on one key, and the second declaration left the detail while
// the inventory still counted both.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it } from 'vitest';

import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { RecordingFileOpener } from '../fixtures/file-opener';

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

/** One repository root holding the carrier under test, cleaned up after the case. */
function rootWithHookCarrier(contents: string): string {
  const root = mkdtempSync(join(tmpdir(), 'inspector-hook-identity-'));
  cleanups.push(() => rmSync(root, { recursive: true, force: true }));
  mkdirSync(join(root, '.agents'), { recursive: true });
  writeFileSync(join(root, '.agents/hooks.json'), contents, 'utf8');
  return root;
}

/**
 * The (hook, event) pairs the carrier's detail publishes, in publish order.
 * A carrier whose text did not parse publishes no declarations at all, which
 * is a different finding from the one under test, so it fails here rather than
 * comparing an absent list against the expected pairs.
 */
async function declaredPairs(root: string): Promise<(string | null)[][]> {
  const detail = (await scannedSession(root)).hookCarrierDetail('.agents/hooks.json', 'repository');
  if (detail === null || detail.events === null) {
    throw new Error('expected a parsed hook carrier detail');
  }
  return detail.events.map((event) => [event.namedHook?.name ?? null, event.event]);
}

/** Scans `root` once through the coordinator and returns the committed session. */
async function scannedSession(root: string): Promise<InspectionSession> {
  const session = new InspectionSession({
    invocationCwd: root,
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  const coordinator = new SessionCoordinator(session);
  const sourceId = session.repositorySourceId;
  const admitted = coordinator.admitScan(sourceId, { kind: 'startup', operationId: null });
  if (admitted.kind !== 'admitted') {
    throw new Error('expected admission');
  }
  const publication = await runSourceScan({
    sourceId,
    root: session.selectedRepositoryRoot,
    rootFailureOwner: 'repository',
    scope: 'repository',
  });
  if (publication.kind !== 'publishable') {
    throw new Error('expected a publishable outcome');
  }
  await coordinator.completeScan(admitted.scanRequestId, {
    files: publication.files,
    recognitions: publication.recognitions,
    diagnostics: publication.diagnostics,
    outcome: publication.outcome,
    visitedEntries: publication.visitedEntries,
    candidateFiles: publication.candidateFiles,
    readBytes: publication.readBytes,
    censusEscapedDirectories: publication.censusEscapedDirectories,
  });
  return session;
}

it('publishes both declarations when two hook names differ only by where a separator sits', async () => {
  // `JSON.stringify` writes the NUL as its `\u0000` escape and strict JSON
  // parsing decodes it back, so this is a file a reader can actually have.
  const root = rootWithHookCarrier(
    `${JSON.stringify(
      {
        audit: { ['log\u0000PostToolUse']: [{ matcher: 'Write' }] },
        ['audit\u0000log']: { PostToolUse: [{ matcher: 'Edit' }] },
      },
      null,
      2,
    )}\n`,
  );
  // Two declarations in, two declarations out, each still carrying the hook
  // its author wrote it inside.
  expect(await declaredPairs(root)).toEqual([
    ['audit', 'log\u0000PostToolUse'],
    ['audit\u0000log', 'PostToolUse'],
  ]);
});

it('publishes both declarations when one hook names two events, and each once', async () => {
  // The ordinary shape of the same rule, and the case the event-only key
  // dropped: two hooks declaring one event, plus one hook declaring two.
  const root = rootWithHookCarrier(
    `${JSON.stringify(
      {
        'lint-on-write': {
          PostToolUse: [{ matcher: 'Write' }],
          PreToolUse: [{ matcher: 'Write' }],
        },
        'audit-writes': { PostToolUse: [{ matcher: 'Edit' }] },
      },
      null,
      2,
    )}\n`,
  );
  expect(await declaredPairs(root)).toEqual([
    ['lint-on-write', 'PostToolUse'],
    ['lint-on-write', 'PreToolUse'],
    ['audit-writes', 'PostToolUse'],
  ]);
});
