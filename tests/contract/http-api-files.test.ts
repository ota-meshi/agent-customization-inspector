// T081: the file-detail function of the session API
// (contracts/http-api.md § get-file-detail).
//
// This is the one function that returns authored content, so its contract is
// mostly about exactness and about what happens when a file ID no longer names
// anything. Both are load-bearing: a commit rekeys every generation-owned ID,
// so a page holding an ID from an earlier scan must get the declared
// `stale-resource` outcome rather than whatever now sits at that path.
//
// The suite runs the real scan over a real fixture rather than a hand-built
// generation, because the property under test is that the source the traversal
// read reaches the response unchanged — which a fabricated DTO could not show.
import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { buildSecretFixture, SECRET_LITERALS } from '../fixtures/secrets/build-fixtures';
import type {
  DeterministicRejection,
  FileDetailDto,
  InspectionDataResult,
} from '../../src/shared/api-types';

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly handler: (...args: never[]) => unknown;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
  while (cleanups.length > 0) {
    cleanups.pop()?.();
  }
});

function registerFunctions(context: InspectorHostContext): Map<string, CapturedRpcFunction> {
  const functions = new Map<string, CapturedRpcFunction>();
  const ctx = {
    rpc: {
      register(fn: CapturedRpcFunction) {
        functions.set(fn.name, fn);
      },
    },
  };
  createInspectorDevframe(context).setup?.(ctx as never, undefined as never);
  return functions;
}

/** Boots a session over the secret fixture and runs its first scan. */
async function scannedFixture(): Promise<{
  readonly context: InspectorHostContext;
  readonly sourceText: string;
  readonly skillPath: string;
  readonly unparseableSkillPath: string;
}> {
  const fixture = buildSecretFixture('inspector-detail-contract');
  cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
  const session = new InspectionSession({
    invocationCwd: fixture.root,
    rootOptionValue: null,
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
  return {
    context,
    sourceText: fixture.sourceText,
    skillPath: fixture.skillPath,
    unparseableSkillPath: fixture.unparseableSkillPath,
  };
}

async function getFileDetail(
  context: InspectorHostContext,
  fileId: string,
): Promise<InspectionDataResult<FileDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
  return (await fn.handler(fileId as never)) as
    InspectionDataResult<FileDetailDto> | DeterministicRejection;
}

/** The committed file ID of the fixture's one skill. */
function skillFileId(context: InspectorHostContext, skillPath: string): string {
  const file = context.session
    .snapshot()
    .files.find((candidate) => candidate.sourceRelativePath === skillPath);
  if (file === undefined) {
    throw new Error('the fixture skill was not committed');
  }
  return file.fileId;
}

describe('get-file-detail', () => {
  it('carries the epoch and both sequence generations beside the payload', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    expect(Object.keys(result).toSorted()).toEqual([
      'data',
      'globalContentEpoch',
      'globalGeneration',
      'repositoryGeneration',
    ]);
  });

  it('returns the complete authored source exactly as it was read', async () => {
    const { context, sourceText, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { file } = result.data;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    // Byte for byte, including the credential-shaped literals. Nothing is
    // masked, truncated, or normalized on the way out.
    expect(file.sourceText).toBe(sourceText);
    expect(file.sourceText).toContain(SECRET_LITERALS.inBody);
    expect(file.sourceText).toContain(SECRET_LITERALS.inOtherKey);
  });

  it('returns the skill as its declarations and its instructions, unmasked', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    expect(result.data.recognitions).toHaveLength(1);
    const details = result.data.recognitions[0]!.details;
    if (details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    // The two the detail surface leads with, then every key the file declares
    // — credential-shaped ones included, because this is the reader's own
    // frontmatter shown back to them without masking (FR-025).
    expect(details.declaredName).toBe('secretive');
    const declared = new Map(details.frontmatter.map((entry) => [entry.key, entry.value]));
    const scalarOf = (key: string): string => {
      const value = declared.get(key);
      if (value?.kind !== 'scalar') {
        throw new Error(`expected a scalar for ${key}`);
      }
      return value.text;
    };
    expect(scalarOf('description')).toContain(SECRET_LITERALS.inDescription);
    expect(scalarOf('api_key')).toContain(SECRET_LITERALS.inOtherKey);
    // The instructions are the body alone: the block the declarations came
    // from is not in it, and the complete file is served once as `sourceText`.
    expect(details.bodyText).not.toContain('api_key:');
    expect(details.bodyText).toContain(SECRET_LITERALS.inBody);
  });

  it('withholds authored source from the session snapshot', async () => {
    const { context } = await scannedFixture();
    const serialized = JSON.stringify(context.session.snapshot());
    // Browsing the inventory fetches no file content at all, so the snapshot
    // must carry none (FR-027).
    for (const literal of Object.values(SECRET_LITERALS)) {
      expect(serialized).not.toContain(literal);
    }
  });

  it('returns diagnostics that carry no authored value', async () => {
    const { context, unparseableSkillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, unparseableSkillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    // The file whose frontmatter cannot be parsed, so the assertions below run
    // over a diagnostic that exists. Asserting the shape of an empty list
    // proves nothing.
    expect(result.data.diagnostics.length).toBeGreaterThan(0);
    // A Diagnostic record is an identity, a code, and a location. The message
    // is derived from the code by the shared registry, so no per-instance text
    // can carry a source value.
    for (const diagnostic of result.data.diagnostics) {
      expect(Object.keys(diagnostic).toSorted()).toEqual([
        'code',
        'diagnosticId',
        'fileId',
        'sourceId',
        'sourceRelativePath',
      ]);
    }
  });

  it('rejects an unknown file ID as a stale resource', async () => {
    const { context } = await scannedFixture();
    expect(await getFileDetail(context, 'not-a-committed-id')).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('rejects a file ID from a superseded generation', async () => {
    const { context, skillPath } = await scannedFixture();
    const before = skillFileId(context, skillPath);
    const repository = context.session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'request',
      operationId: 'rescan-1',
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the rescan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      `published-source:${repository.sourceId}`,
    );
    // The file is still there; its identity is not. A commit rekeys every
    // generation-owned ID so a client holding an old one refetches instead of
    // silently reading newer data through a stale handle (FR-030).
    expect(skillFileId(context, skillPath)).not.toBe(before);
    expect(await getFileDetail(context, before)).toEqual({ error: { code: 'stale-resource' } });
  });

  it('states the minimum metadata a detail must carry', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    expect(Object.keys(result.data).toSorted()).toEqual(['diagnostics', 'file', 'recognitions']);
    const [recognition] = result.data.recognitions;
    expect(Object.keys(recognition!).toSorted()).toEqual([
      'details',
      'diagnosticIds',
      'fileId',
      'parseStatus',
      'provenances',
      'recognitionId',
      'tool',
    ]);
    // The admission says which rule admitted the file and where it matched —
    // never whether the product would use it, which is a runtime the Inspector
    // does not observe and therefore does not describe, and never where the
    // customization would apply, which no surface shows.
    const [provenance] = recognition!.provenances;
    expect(Object.keys(provenance!).toSorted()).toEqual([
      'discoveryClass',
      'matchedPath',
      'ruleId',
    ]);
  });
});
