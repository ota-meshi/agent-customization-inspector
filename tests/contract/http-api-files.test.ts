// T081/T218: the file-detail function of the session API
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
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import {
  buildSecretFixture,
  ENVIRONMENT_REFERENCE,
  SECRET_LITERALS,
  type SecretFixture,
} from '../fixtures/secrets/build-fixtures';
import {
  FIXTURE_ENVIRONMENT_REFERENCE,
  FIXTURE_SECRET_LITERAL,
  buildClaudeMcpFixture,
  buildCodexMcpFixture,
  buildCopilotCliMcpFixture,
  buildCopilotVscodeMcpFixture,
  createRepositoryFixtureRoot,
  type ClaudeMcpFixture,
  type CodexMcpFixture,
  type CopilotCliMcpFixture,
  type CopilotVscodeMcpFixture,
} from '../fixtures/repositories/build-fixtures';
import type {
  DeterministicRejection,
  FileDetailDto,
  InspectionDataResult,
  McpCarrierDetailDto,
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
  readonly fixture: SecretFixture;
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
    fixture,
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

  it('returns the instruction detail as its declarations and instructions, unmasked (T218)', async () => {
    const { context, fixture } = await scannedFixture();
    const result = await getFileDetail(context, fixture.instructionPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    // The instruction variant carries the same one scan-time parse the skill
    // variant does (contracts/http-api.md § get-file-detail): the file's own
    // fact, published once whatever the recognizing tools are.
    if (result.data.kind !== 'instructions') {
      throw new Error('expected the instructions variant');
    }
    const presentation = result.data.presentation;
    if (presentation === null) {
      throw new Error('expected a parsed presentation');
    }
    // Every key in authored order — the fixture's keys are deliberately not
    // alphabetical, so agreement here is agreement with the file, not with a
    // sort. The credential and the environment reference appear exactly as
    // written: nothing masks, and nothing resolves (FR-025).
    expect(presentation.frontmatter.map((entry) => entry.key)).toEqual([
      'scope',
      'endpoint',
      'api_key',
    ]);
    const values = new Map(presentation.frontmatter.map((entry) => [entry.key, entry.value]));
    expect(values.get('endpoint')).toEqual({ kind: 'scalar', text: ENVIRONMENT_REFERENCE });
    expect(values.get('api_key')).toEqual({ kind: 'scalar', text: SECRET_LITERALS.inOtherKey });
    // The instructions are the body alone, and a reference-looking token in
    // them stays source text: no relationship field of any spelling is in the
    // response (T217; data-model.md § Relationship).
    expect(presentation.bodyText).not.toContain('scope:');
    expect(presentation.bodyText).toContain(`Deploy with ${SECRET_LITERALS.inBody}`);
    expect(presentation.bodyText).toContain('@docs/target.md');
    expect(JSON.stringify(result.data)).not.toContain('relationship');
    expect(Object.keys(result.data).toSorted()).toEqual([
      'diagnostics',
      'file',
      'kind',
      'presentation',
    ]);
  });

  it('returns the complete authored instruction source exactly as it was read (T218)', async () => {
    const { context, fixture } = await scannedFixture();
    const result = await getFileDetail(context, fixture.instructionPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { file } = result.data;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(file.sourceText).toBe(fixture.instructionSourceText);
  });

  it('serves a configured fallback instruction file through the same variant (T218)', async () => {
    // The carrier's declared name became a scan target through the
    // configuration read (Phase 15); its detail is the ordinary instruction
    // detail — provenance is an internal read-authorization record no
    // response carries.
    const { context, fixture } = await scannedFixture();
    const result = await getFileDetail(context, fixture.fallbackInstructionPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    expect(result.data.kind).toBe('instructions');
    if (result.data.kind !== 'instructions' || result.data.presentation === null) {
      throw new Error('expected a parsed instructions variant');
    }
    expect(result.data.presentation.frontmatter).toEqual([]);
    expect(result.data.presentation.bodyText).toBe('# Configured fallback instructions\n');
  });

  it('publishes null presentation with the failure diagnostic for an unparseable instruction file (T218)', async () => {
    const { context, fixture } = await scannedFixture();
    const result = await getFileDetail(context, fixture.unparseableInstructionPath);
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    if (result.data.kind !== 'instructions') {
      throw new Error('expected the instructions variant');
    }
    // The same all-or-nothing rule as the skill variant (FR-028): nothing
    // parsed, one (file, kind) failure record, complete source still served.
    expect(result.data.presentation).toBeNull();
    expect(result.data.diagnostics).toHaveLength(1);
    expect(result.data.diagnostics[0]!.code).toBe('recognition-parse-failed');
    if (result.data.file.encoding !== 'utf-8') {
      throw new Error('expected the readable variant');
    }
    expect(result.data.file.sourceText).toContain('# Override');
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

async function getMcpCarrierDetail(
  context: InspectorHostContext,
  sourceRelativePath: string,
): Promise<InspectionDataResult<McpCarrierDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get(
    'agent-customization-inspector:get-mcp-carrier-detail',
  )!;
  return (await fn.handler(sourceRelativePath as never)) as
    InspectionDataResult<McpCarrierDetailDto> | DeterministicRejection;
}

describe('get-mcp-carrier-detail for the Codex MCP carrier (T295)', () => {
  /** Boots a session over the MCP fixture and runs its first scan. */
  async function scannedMcpFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CodexMcpFixture;
  }> {
    const fixture = buildCodexMcpFixture('inspector-mcp-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    return { context, fixture };
  }

  it('returns the declarations by the keys the carrier wrote, in authored order', async () => {
    const { context, fixture } = await scannedMcpFixture();
    const result = await getMcpCarrierDetail(context, fixture.carrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    const servers = result.data.servers;
    if (servers === null) {
      throw new Error('expected parsed declarations');
    }
    // One declaration per named server table, in the parser's resolved
    // order, the non-table `mcp_servers` entry omitted whole; each
    // declaration's fields are the keys the carrier wrote, resolved once —
    // the command and its arguments, the URL, the headers, the environment
    // values — with a numeric command kept as its resolved value rather than
    // schema-checked away (FR-007).
    expect(servers.map((server) => server.name)).toEqual([...fixture.expectedServerNames]);
    const [context7, docsHttp, odd] = servers;
    expect(context7!.fields.map((field) => field.key)).toEqual([
      'command',
      'args',
      'agents',
      'env',
    ]);
    expect(context7!.fields[0]!.value).toEqual({ kind: 'scalar', text: 'npx' });
    expect(docsHttp!.fields.map((field) => field.key)).toEqual(['url', 'headers']);
    expect(docsHttp!.fields[0]!.value).toEqual({
      kind: 'scalar',
      text: 'https://docs.example.com/mcp',
    });
    expect(odd!.fields).toEqual([
      { key: 'command', keyKind: 'string', value: { kind: 'scalar', text: '42' } },
    ]);
  });

  it('serves the carrier with no sourceText field at all', async () => {
    const { context, fixture } = await scannedMcpFixture();
    const result = await getMcpCarrierDetail(context, fixture.carrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // The function's whole point (FR-007): the carrier's facts and its
    // declarations, and never its bytes — the field is absent from the
    // shape, not nulled, so no surface has a value it must decline to
    // render. The raw TOML spelling reaches no response either.
    expect(Object.keys(result.data).toSorted()).toEqual(['diagnostics', 'file', 'servers']);
    expect('sourceText' in result.data.file).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('sourceText');
    expect(serialized).not.toContain('[mcp_servers');
    expect(result.data.file).toMatchObject({
      sourceRelativePath: fixture.carrierPath,
      encoding: 'utf-8',
    });
    expect(result.data.file.encoding === 'utf-8' && result.data.file.sizeBytes).toBeGreaterThan(0);
  });

  it('shows declared secrets and environment references literally, resolving nothing', async () => {
    const { context, fixture } = await scannedMcpFixture();
    const result = await getMcpCarrierDetail(context, fixture.carrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // The declared values are the carrier's own literals: the credential is
    // present, whole, and unmarked, and the environment reference stays the
    // exact characters that were written — no process value is substituted
    // for it (FR-026).
    const serialized = JSON.stringify(result.data.servers);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('publishes null servers with the failure diagnostic for an unparseable carrier', async () => {
    const root = createRepositoryFixtureRoot('inspector-mcp-detail-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(join(root, '.codex/config.toml'), '[mcp_servers.broken\n', 'utf8');
    const session = new InspectionSession({ invocationCwd: root, rootOptionValue: null });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    const result = await getMcpCarrierDetail(context, '.codex/config.toml');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather
    // than absent, the failure's record is in `diagnostics`, and the
    // carrier's bytes still reach no response (FR-007, FR-028).
    expect(result.data.servers).toBeNull();
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });

  it('withholds the carrier bytes even when a configured fallback recognizes it (FR-007)', async () => {
    // A Codex `project_doc_fallback_filenames` entry naming `.mcp.json` makes
    // the root carrier an instructions candidate too. The instructions
    // variant carries the full body text, so answering it for this file
    // would hand out the bytes — credentials included — that the carrier's
    // admission withholds; the carrier's protection wins, and the path is
    // `get-mcp-carrier-detail`'s resource alone.
    const root = createRepositoryFixtureRoot('inspector-mcp-fallback-carrier');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(
      join(root, '.codex/config.toml'),
      'project_doc_fallback_filenames = [".mcp.json"]\n',
      'utf8',
    );
    writeFileSync(
      join(root, '.mcp.json'),
      `{ "mcpServers": { "db": { "env": { "TOKEN": "${FIXTURE_SECRET_LITERAL}" } } } }\n`,
      'utf8',
    );
    const session = new InspectionSession({ invocationCwd: root, rootOptionValue: null });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    // The premise this test exists for: the fallback really did add a Codex
    // instructions recognition on the carrier file. Without this, the
    // stale-resource assertion below would pass vacuously.
    const carrierInstructionFiles = session
      .snapshot()
      .instructions.flatMap((entry) => entry.files)
      .filter((file) => file.sourceRelativePath === '.mcp.json');
    expect(carrierInstructionFiles).not.toHaveLength(0);
    // The source-serving function holds nothing at the carrier's path, and no
    // authored byte of the carrier reaches its response.
    const detail = await getFileDetail(context, '.mcp.json');
    expect(detail).toEqual({ error: { code: 'stale-resource' } });
    expect(JSON.stringify(detail)).not.toContain(FIXTURE_SECRET_LITERAL);
    // The declarations remain served by the carrier's own function.
    const carrier = await getMcpCarrierDetail(context, '.mcp.json');
    if (!('data' in carrier)) {
      throw new Error('expected the carrier detail result');
    }
    expect(carrier.data.servers?.map((server) => server.name)).toEqual(['db']);
  });

  it('validates by resolution: each function rejects the other’s resource as stale', async () => {
    const { context, fixture } = await scannedMcpFixture();
    // The nested near miss was never admitted, so its path resolves to
    // nothing for either function. (The root `.mcp.json` is no longer a
    // negative here: it is Claude's own carrier, T309.)
    expect(await getMcpCarrierDetail(context, 'packages/api/.codex/config.toml')).toEqual({
      error: { code: 'stale-resource' },
    });
    // A committed instruction file is `get-file-detail`'s resource, not a
    // carrier; the carrier is `get-mcp-carrier-detail`'s resource, not a
    // file detail — the carrier's bytes must reach no response, so the
    // source-serving function holds no detail at its path
    // (contracts/http-api.md § get-file-detail, § get-mcp-carrier-detail).
    expect(await getMcpCarrierDetail(context, 'AGENTS.md')).toEqual({
      error: { code: 'stale-resource' },
    });
    expect(await getFileDetail(context, fixture.carrierPath)).toEqual({
      error: { code: 'stale-resource' },
    });
  });
});

describe('get-mcp-carrier-detail for the Copilot CLI carriers (T346)', () => {
  /** One scanned Copilot CLI MCP fixture and its host context. */
  async function scannedCopilotMcpFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CopilotCliMcpFixture;
  }> {
    const fixture = buildCopilotCliMcpFixture('inspector-copilot-mcp-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    return { context, fixture };
  }

  it('serves both documented schemas by the keys each file wrote, source-free and literal', async () => {
    const { context, fixture } = await scannedCopilotMcpFixture();
    // The wrapper-form root carrier: one declaration per named `mcpServers`
    // entry in the parser's resolved order, the non-object entry omitted
    // whole, and every value the literal the file wrote — the credential
    // whole and unmarked, the environment reference as its own characters,
    // resolved against nothing (FR-007, FR-026).
    const root = await getMcpCarrierDetail(context, fixture.rootCarrierPath);
    if (!('data' in root) || root.data.servers === null) {
      throw new Error('expected the root carrier declarations');
    }
    expect(root.data.servers.map((server) => server.name)).toEqual([
      ...fixture.expectedRootServerNames,
    ]);
    const serializedRoot = JSON.stringify(root);
    expect(serializedRoot).toContain(FIXTURE_SECRET_LITERAL);
    expect(serializedRoot).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serializedRoot).not.toContain('sourceText');
    expect(serializedRoot).not.toContain('"mcpServers"');
    expect(serializedRoot).not.toContain(process.env['HOME'] ?? '\0unset');
    // The bare-form `.github` spelling — the second documented schema — is
    // served identically, read through its link where the platform created
    // one (FR-024), each declaration by the keys the file wrote.
    const github = await getMcpCarrierDetail(context, fixture.githubCarrierPath);
    if (!('data' in github) || github.data.servers === null) {
      throw new Error('expected the .github carrier declarations');
    }
    expect(github.data.servers.map((server) => server.name)).toEqual([
      ...fixture.expectedGithubServerNames,
    ]);
    expect(JSON.stringify(github)).not.toContain('sourceText');
    // The duplicate name appears in each carrier's own detail: which
    // declaration a session selects is the strategy's statement, never a
    // field either response projects (FR-009).
    for (const detail of [root.data, github.data]) {
      expect(
        detail.servers!.filter((server) => server.name === fixture.duplicateServerName),
      ).toHaveLength(1);
    }
  });

  it('validates by resolution: near misses and carriers resolve per function', async () => {
    const { context, fixture } = await scannedCopilotMcpFixture();
    // A subdirectory carrier was never admitted, so its path resolves to
    // nothing for either function; the admitted carriers' bytes reach no
    // response, so the source-serving function holds no detail at their
    // paths (contracts/http-api.md § get-file-detail,
    // § get-mcp-carrier-detail).
    expect(await getMcpCarrierDetail(context, 'packages/api/.mcp.json')).toEqual({
      error: { code: 'stale-resource' },
    });
    for (const carrier of [fixture.rootCarrierPath, fixture.githubCarrierPath]) {
      expect(await getFileDetail(context, carrier)).toEqual({
        error: { code: 'stale-resource' },
      });
    }
  });

  it('publishes null servers with the failure diagnostic for an unparseable CLI carrier', async () => {
    const root = createRepositoryFixtureRoot('inspector-copilot-mcp-detail-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.github'), { recursive: true });
    writeFileSync(join(root, '.github/mcp.json'), '{ "gh-actions": { broken\n', 'utf8');
    const session = new InspectionSession({ invocationCwd: root, rootOptionValue: null });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    const result = await getMcpCarrierDetail(context, '.github/mcp.json');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather
    // than absent, the failure's record is in `diagnostics`, and the
    // carrier's bytes still reach no response (FR-007, FR-028).
    expect(result.data.servers).toBeNull();
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });
});

describe('get-mcp-carrier-detail for the Copilot VS Code carriers (T366)', () => {
  /** One scanned Copilot VS Code MCP fixture and its host context. */
  async function scannedVscodeMcpFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CopilotVscodeMcpFixture;
  }> {
    const fixture = buildCopilotVscodeMcpFixture('inspector-vscode-mcp-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    return { context, fixture };
  }

  it('serves the dedicated JSONC carrier by the keys the file wrote, source-free', async () => {
    const { context, fixture } = await scannedVscodeMcpFixture();
    // One declaration per named `servers` entry in the parser's resolved
    // order, the non-object entry omitted whole, comments consumed as the
    // format's own syntax, and every value the literal the file wrote — the
    // credential whole and unmarked, the environment reference as its own
    // characters, resolved against nothing (FR-007, FR-026). The `inputs`
    // and `sandbox` sections declare no server and appear as none.
    const vscode = await getMcpCarrierDetail(context, fixture.vscodeCarrierPath);
    if (!('data' in vscode) || vscode.data.servers === null) {
      throw new Error('expected the .vscode carrier declarations');
    }
    expect(vscode.data.servers.map((server) => server.name)).toEqual([
      ...fixture.expectedVscodeServerNames,
    ]);
    const serialized = JSON.stringify(vscode);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain('sourceText');
    expect(serialized).not.toContain('"inputs"');
    expect(serialized).not.toContain(process.env['HOME'] ?? '\0unset');
    // The shared root file is served as its own carrier — the CLI reading's
    // declarations, with no VS Code-owned field beside them: the 1.118+
    // admission is path/surface provenance only.
    const root = await getMcpCarrierDetail(context, fixture.rootCarrierPath);
    if (!('data' in root) || root.data.servers === null) {
      throw new Error('expected the root carrier declarations');
    }
    expect(root.data.servers.map((server) => server.name)).toEqual([
      ...fixture.expectedRootServerNames,
    ]);
    // The duplicate name appears in each carrier's own detail: which
    // declaration a session selects is the strategy's statement, never a
    // field either response projects (FR-009).
    for (const detail of [vscode.data, root.data]) {
      expect(
        detail.servers!.filter((server) => server.name === fixture.duplicateServerName),
      ).toHaveLength(1);
    }
  });

  it('validates by resolution: near misses and carriers resolve per function', async () => {
    const { context, fixture } = await scannedVscodeMcpFixture();
    // The nested workspace carrier was never admitted, so its path resolves
    // to nothing for either function; the admitted carriers' bytes reach no
    // response, so the source-serving function holds no detail at their
    // paths (contracts/http-api.md § get-file-detail,
    // § get-mcp-carrier-detail).
    expect(await getMcpCarrierDetail(context, 'packages/api/.vscode/mcp.json')).toEqual({
      error: { code: 'stale-resource' },
    });
    for (const carrier of [fixture.vscodeCarrierPath, fixture.rootCarrierPath]) {
      expect(await getFileDetail(context, carrier)).toEqual({
        error: { code: 'stale-resource' },
      });
    }
  });

  it('publishes null servers with the failure diagnostic for an unparseable carrier', async () => {
    const root = createRepositoryFixtureRoot('inspector-vscode-mcp-detail-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.vscode'), { recursive: true });
    writeFileSync(join(root, '.vscode/mcp.json'), '{ "servers": { "gh": { broken\n', 'utf8');
    const session = new InspectionSession({ invocationCwd: root, rootOptionValue: null });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    const result = await getMcpCarrierDetail(context, '.vscode/mcp.json');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather
    // than absent, the failure's record is in `diagnostics`, and the
    // carrier's bytes still reach no response (FR-007, FR-028).
    expect(result.data.servers).toBeNull();
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });
});

describe('get-mcp-carrier-detail for Claude declarations (T316)', () => {
  /** One scanned Claude MCP fixture and its host context. */
  async function scannedClaudeMcpFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: ClaudeMcpFixture;
  }> {
    const fixture = buildClaudeMcpFixture('inspector-claude-mcp-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    return { context, fixture };
  }

  it('returns the carrier declarations by the keys the file wrote, source-free and literal', async () => {
    const { context, fixture } = await scannedClaudeMcpFixture();
    const result = await getMcpCarrierDetail(context, fixture.carrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    const servers = result.data.servers;
    if (servers === null) {
      throw new Error('expected parsed declarations');
    }
    // One declaration per named `mcpServers` entry in the parser's resolved
    // order, the non-object entry omitted whole; each declaration's fields
    // are the keys the carrier wrote, resolved once, with a numeric command
    // kept as its resolved value rather than schema-checked away (FR-007).
    expect(servers.map((server) => server.name)).toEqual([...fixture.expectedCarrierServerNames]);
    const [context7, docsHttp, odd] = servers;
    expect(context7!.fields.map((field) => field.key)).toEqual(['command', 'args', 'env']);
    // The relative command is the literal the file wrote — its resolution
    // base is not established by current official pages, and no computed
    // path stands in for it (FR-009).
    expect(context7!.fields[0]!.value).toEqual({ kind: 'scalar', text: './scripts/context7.sh' });
    expect(docsHttp!.fields.map((field) => field.key)).toEqual(['type', 'url', 'headers']);
    expect(odd!.fields).toEqual([
      { key: 'command', keyKind: 'string', value: { kind: 'scalar', text: '42' } },
    ]);
    // Source-free and unresolved: no sourceText field exists on the shape,
    // the raw JSON spelling reaches no response, the credential is present
    // whole and unmarked, and the environment reference stays the exact
    // characters that were written (FR-007, FR-026).
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('sourceText');
    expect(serialized).not.toContain('"mcpServers"');
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('keeps a skill spelling mcpServers a skill: no MCP resource at its path (T327)', async () => {
    const { context, fixture } = await scannedClaudeMcpFixture();
    // Claude documents no `mcpServers` skill-frontmatter field, so the
    // spelling declares nothing any product reads: the path holds no carrier
    // resource, for the spelling skill and the plain skill alike.
    for (const skillPath of [fixture.mcpFrontmatterSkillPath, fixture.plainSkillPath]) {
      expect(await getMcpCarrierDetail(context, skillPath)).toEqual({
        error: { code: 'stale-resource' },
      });
    }
    // The file itself keeps its own kind's detail, source included: the
    // frontmatter is ordinary skill content, credential and all (FR-027),
    // while only the pure carrier's path is stale for get-file-detail.
    const owner = await getFileDetail(context, fixture.mcpFrontmatterSkillPath);
    if (!('data' in owner) || owner.data.kind !== 'skill') {
      throw new Error('expected the skill detail');
    }
    expect(owner.data.file.encoding === 'utf-8' && owner.data.file.sourceText).toContain(
      'mcpServers:',
    );
    expect(await getFileDetail(context, fixture.carrierPath)).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('publishes null servers with the failure diagnostic for an unparseable carrier', async () => {
    const root = createRepositoryFixtureRoot('inspector-claude-mcp-detail-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    writeFileSync(join(root, '.mcp.json'), '{ "mcpServers": { broken\n', 'utf8');
    const session = new InspectionSession({ invocationCwd: root, rootOptionValue: null });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const repository = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(repository.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    const result = await getMcpCarrierDetail(context, '.mcp.json');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather
    // than absent, the failure's record is in `diagnostics`, and the
    // carrier's bytes still reach no response (FR-007, FR-028).
    expect(result.data.servers).toBeNull();
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });
});
