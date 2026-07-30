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
    expect(file.sourceText).toContain(SECRET_LITERALS.inUnlistedField);
  });

  it('returns the recognized value of each allowlisted field, unmasked', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    expect(result.data.recognitions).toHaveLength(1);
    expect(result.data.recognitions[0]!.declaredMetadata).toEqual([
      { fieldId: 'codex.skill.name', value: 'secretive' },
      {
        fieldId: 'codex.skill.description',
        value: `deploy token ${SECRET_LITERALS.inAllowlistedField}`,
      },
    ]);
  });

  it('publishes no entry for a frontmatter key outside the allowlist', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const values = result.data.recognitions.flatMap((recognition) =>
      recognition.declaredMetadata.map((entry) => entry.value),
    );
    // The value is in the source above and reachable there; what it is not is
    // a recognized field the product names and compares.
    expect(values.some((value) => value.includes(SECRET_LITERALS.inUnlistedField))).toBe(false);
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
      'declaredMetadata',
      'details',
      'diagnosticIds',
      'fileId',
      'parseStatus',
      'provenances',
      'recognitionId',
      'tool',
    ]);
    const [provenance] = recognition!.provenances;
    expect(Object.keys(provenance!).toSorted()).toEqual([
      'applicability',
      'discoveryClass',
      'evidenceAssessments',
      'matchedPath',
      'ruleId',
      'scope',
    ]);
  });

  it('states what is not known about whether the product applies the file', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillFileId(context, skillPath));
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { applicability } = result.data.recognitions[0]!.provenances[0]!;
    expect(applicability.summary).toBe('conditional');
    // The conditions stay beside the summary rather than being collapsed into
    // it, so a reader can see which specific input is missing (QR-005).
    expect(applicability.conditions.length).toBeGreaterThan(0);
  });
});
