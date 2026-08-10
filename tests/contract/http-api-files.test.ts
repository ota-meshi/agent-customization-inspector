// T081: the file-detail function of the session API
// (contracts/http-api.md § get-file-detail).
//
// This is the one function that returns authored content, so its contract is
// mostly about exactness and about how a request resolves across commits. Both
// are load-bearing: the path is the file's stable identity (FR-030), so a
// retained request resolves against the current committed snapshot — serving
// what that generation holds at the path, and the declared `stale-resource`
// outcome when it holds nothing.
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
  sourceRelativePath: string,
): Promise<InspectionDataResult<FileDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
  return (await fn.handler(sourceRelativePath as never)) as
    InspectionDataResult<FileDetailDto> | DeterministicRejection;
}

describe('get-file-detail', () => {
  it('carries the epoch and both sequence generations beside the payload', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillPath);
    expect(Object.keys(result).toSorted()).toEqual([
      'data',
      'globalContentEpoch',
      'globalGeneration',
      'repositoryGeneration',
    ]);
  });

  it('returns the complete authored source exactly as it was read', async () => {
    const { context, sourceText, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillPath);
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
    const result = await getFileDetail(context, skillPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    // The parse is the file's, published once whatever the recognizing tools
    // are (contracts/http-api.md § get-file-detail): `.agents/skills/` is
    // both a Copilot and a Codex location, and both read the same
    // declarations out of the same file, so the response carries one
    // presentation rather than one copy per product.
    if (result.data.kind !== 'skill') {
      throw new Error('expected the skill variant');
    }
    const presentation = result.data.presentation;
    if (presentation === null) {
      throw new Error('expected a parsed presentation');
    }
    // Every key the file declares — credential-shaped ones included, because
    // this is the reader's own frontmatter shown back to them without masking
    // (FR-025).
    const declared = new Map(presentation.frontmatter.map((entry) => [entry.key, entry.value]));
    const scalarOf = (key: string): string => {
      const value = declared.get(key);
      if (value?.kind !== 'scalar') {
        throw new Error(`expected a scalar for ${key}`);
      }
      return value.text;
    };
    expect(scalarOf('name')).toBe('secretive');
    expect(scalarOf('description')).toContain(SECRET_LITERALS.inDescription);
    expect(scalarOf('api_key')).toContain(SECRET_LITERALS.inOtherKey);
    // The instructions are the body alone: the block the declarations came
    // from is not in it, and the complete file is served once as `sourceText`.
    expect(presentation.bodyText).not.toContain('api_key:');
    expect(presentation.bodyText).toContain(SECRET_LITERALS.inBody);
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
    const result = await getFileDetail(context, unparseableSkillPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    // The file whose frontmatter cannot be parsed: one extraction per kind
    // means exactly one failure record however many tools recognize it
    // (FR-028), and the skill variant publishes no parsed presentation.
    if (result.data.kind !== 'skill') {
      throw new Error('expected the skill variant');
    }
    expect(result.data.presentation).toBeNull();
    expect(result.data.diagnostics).toHaveLength(1);
    // A Diagnostic record is an identity, a code, and a location. The message
    // is derived from the code by the shared registry, so no per-instance text
    // can carry a source value.
    for (const diagnostic of result.data.diagnostics) {
      expect(Object.keys(diagnostic).toSorted()).toEqual([
        'code',
        'diagnosticId',
        'sourceId',
        'sourceRelativePath',
      ]);
    }
  });

  it('resolves an argument of another type to the same stale-resource rejection', async () => {
    // The declared parameter validates by resolution, not by a shape guard
    // (contracts/http-api.md § Host requirements 6): a value of another type
    // equals no committed path, so it takes the same documented rejection as
    // a removed one, and no separate malformed-argument vocabulary exists.
    const { context } = await scannedFixture();
    const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
    expect(await fn.handler(42 as never)).toEqual({ error: { code: 'stale-resource' } });
    expect(await fn.handler(undefined as never)).toEqual({ error: { code: 'stale-resource' } });
  });

  it('never reads an extra positional argument', async () => {
    // A function reads only its declared parameters, and rejecting input it
    // never reads would be a runtime guard with no protective failure mode
    // (contracts/http-api.md § Host requirements 6, § Required contract
    // tests item 4): the declared path still resolves.
    const { context, skillPath, sourceText } = await scannedFixture();
    const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
    const result = (await (fn.handler as (...args: unknown[]) => unknown)(
      skillPath,
      'never-read',
    )) as InspectionDataResult<FileDetailDto> | DeterministicRejection;
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { file } = result.data;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(file.sourceText).toBe(sourceText);
  });

  it('rejects a path the current generations do not hold as a stale resource', async () => {
    const { context } = await scannedFixture();
    expect(await getFileDetail(context, 'not/a/committed/path.md')).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('keeps serving a path across a rescan through its stable identity', async () => {
    const { context, skillPath, sourceText } = await scannedFixture();
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
    // The path is the file's identity, stable across generations (FR-030), so
    // the request a client retained resolves against the new committed
    // snapshot rather than dangling with the one it was captured under.
    expect(context.session.snapshot().repositoryGeneration).toBe(2);
    const result = await getFileDetail(context, skillPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    expect(result.repositoryGeneration).toBe(2);
    if (result.data.file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(result.data.file.sourceText).toBe(sourceText);
  });

  it('states the minimum metadata a detail must carry', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    // The skill variant is the file, the one parse, and the diagnostics —
    // no per-tool recognition list and no admission records: which tools
    // recognize the file and each tool's invocation name are the inventory's
    // facts, and an admission is an internal read-authorization record no
    // session response carries (contracts/http-api.md § get-file-detail).
    expect(Object.keys(result.data).toSorted()).toEqual([
      'diagnostics',
      'file',
      'kind',
      'presentation',
    ]);
    if (result.data.kind !== 'skill') {
      throw new Error('expected the skill variant');
    }
    expect(Object.keys(result.data.presentation ?? {}).toSorted()).toEqual([
      'bodyText',
      'frontmatter',
    ]);
  });
});
