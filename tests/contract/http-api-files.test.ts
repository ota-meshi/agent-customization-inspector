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
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createInspectorDevframe,
  executeRepositoryScan,
  type InspectorHostContext,
} from '../../src/server/host/devframe-app';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import { runSourceScan } from '../../src/server/inspection/scan';
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
  buildClaudeHookFixture,
  buildCodexHookFixture,
  buildCodexMcpFixture,
  buildCopilotCliMcpFixture,
  buildCopilotHookFixture,
  buildCopilotVscodeMcpFixture,
  createRepositoryFixtureRoot,
  type ClaudeMcpFixture,
  type ClaudeHookFixture,
  type CodexHookFixture,
  type CodexMcpFixture,
  type CopilotCliMcpFixture,
  type CopilotHookFixture,
  type CopilotVscodeMcpFixture,
} from '../fixtures/repositories/build-fixtures';
import type {
  DeterministicRejection,
  FileDetailDto,
  InspectionDataResult,
  HookCarrierDetailDto,
  McpCarrierDetailDto,
  SourceSelector,
} from '../../src/shared/api-types';
import { RecordingFileOpener } from '../fixtures/file-opener';

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
    fileOpener: new RecordingFileOpener(),
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
  source: SourceSelector = 'repository',
): Promise<InspectionDataResult<FileDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
  // Both halves of the identity: the function names the Source as well as the
  // path, because two Sources can hold one path (FR-030).
  return (await fn.handler({ sourceRelativePath, source } as never)) as
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

  it('answers a plugin catalog through its own detail routes, never as a file', async () => {
    // A plugin row's subject is a declaration (FR-007): the generic file
    // function refuses the catalog exactly as it refuses an MCP or hook
    // carrier, so the whole document's bytes are not reachable beside the
    // declaration-shaped response that deliberately omits them.
    const repository = mkdtempSync(join(tmpdir(), 'inspector-plugin-catalog-'));
    cleanups.push(() => rmSync(repository, { recursive: true, force: true }));
    mkdirSync(join(repository, '.agents', 'plugins'), { recursive: true });
    writeFileSync(
      join(repository, '.agents', 'plugins', 'marketplace.json'),
      `${JSON.stringify({ name: 'examples', plugins: [{ name: 'formatter', source: './plugins/formatter' }] })}\n`,
      'utf8',
    );
    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const source = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(source.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(context, admission.scanRequestId, source.sourceId, 'repository');
    expect(await getFileDetail(context, '.agents/plugins/marketplace.json')).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('attributes nothing below a plugin root whose real path escapes the Source', async () => {
    // The census refuses a root that resolves outside the Source — what lies
    // beyond the boundary belongs to no Source
    // (contracts/inspection-path-allowlist.md § Bounded companion census) —
    // and the verdict travels with the generation: a file another rule
    // independently admitted below the same spelling (the walk reads links
    // transparently, FR-024) must not surface as that plugin's shipped file,
    // and the plugin-file detail must not serve it under the plugin's name.
    const repository = mkdtempSync(join(tmpdir(), 'inspector-plugin-escape-'));
    const outside = mkdtempSync(join(tmpdir(), 'inspector-plugin-escape-outside-'));
    cleanups.push(() => rmSync(repository, { recursive: true, force: true }));
    cleanups.push(() => rmSync(outside, { recursive: true, force: true }));
    mkdirSync(join(repository, '.agents', 'plugins'), { recursive: true });
    writeFileSync(
      join(repository, '.agents', 'plugins', 'marketplace.json'),
      `${JSON.stringify({ name: 'examples', plugins: [{ name: 'escaped', source: './.claude' }] })}\n`,
      'utf8',
    );
    // The independently admitted file sits below the same spelling the
    // catalog names, reached through the link the walk reads transparently:
    // `.claude/skills/<name>/SKILL.md` is the skill rule's own location.
    mkdirSync(join(outside, 'skills', 'greet'), { recursive: true });
    writeFileSync(join(outside, 'skills', 'greet', 'SKILL.md'), '---\nname: greet\n---\n', 'utf8');
    try {
      symlinkSync(outside, join(repository, '.claude'));
    } catch {
      // A platform that refuses symlink creation cannot build this scenario.
      return;
    }
    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context: InspectorHostContext = {
      session,
      coordinator: new SessionCoordinator(session),
    };
    const source = session.snapshot().sources[0]!;
    const admission = context.coordinator.admitScan(source.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(context, admission.scanRequestId, source.sourceId, 'repository');
    const snapshot = session.snapshot();
    // The walk published the file through the link, on its own row's terms.
    expect(
      snapshot.files.some((file) => file.sourceRelativePath === '.claude/skills/greet/SKILL.md'),
    ).toBe(true);
    // The plugin whose root the census refused ships nothing.
    const row = snapshot.plugins.find((entry) => entry.name === 'escaped@examples');
    expect(row).toBeDefined();
    for (const carrier of row!.carriers) {
      expect(carrier.files).toEqual([]);
    }
    // And the detail authorizes nothing below the refused spelling.
    expect(
      session.pluginFileDetail({
        source: 'repository',
        sourceRelativePath: '.agents/plugins/marketplace.json',
        tool: 'codex',
        pluginName: 'escaped@examples',
        filePath: '.claude/skills/greet/SKILL.md',
      } as never),
    ).toBeNull();
  });

  it('resolves a missing Source selector to the same stale-resource rejection', async () => {
    // The Source is the identity's other half (contracts/http-api.md
    // § get-file-detail): a request that omits it resolves to no Source —
    // never to a silent repository default, which would answer with another
    // Source's file whenever the repository holds the same path.
    const { context, skillPath } = await scannedFixture();
    const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
    expect(await fn.handler({ sourceRelativePath: skillPath } as never)).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('never reads an extra positional argument', async () => {
    // A function reads only its declared parameters, and rejecting input it
    // never reads would be a runtime guard with no protective failure mode
    // (contracts/http-api.md § Host requirements 6, § Required contract
    // tests item 4): the declared path still resolves.
    const { context, skillPath, sourceText } = await scannedFixture();
    const fn = registerFunctions(context).get('agent-customization-inspector:get-file-detail')!;
    // The declared parameter is one object naming both halves of the identity,
    // so an extra positional argument beside it — and an extra key inside it —
    // are both input the function never reads.
    const result = (await (fn.handler as (...args: unknown[]) => unknown)(
      { sourceRelativePath: skillPath, source: 'repository', neverRead: 'ignored' },
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
    expect(values.get('endpoint')).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: ENVIRONMENT_REFERENCE,
    });
    expect(values.get('api_key')).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: SECRET_LITERALS.inOtherKey,
    });
    // The instructions are the body alone, and a reference-looking token in
    // them stays source text: no relationship field of any spelling is in the
    // response (T217; data-model.md § Relationship).
    expect(presentation.bodyText).not.toContain('scope:');
    expect(presentation.bodyText).toContain(`Deploy with ${SECRET_LITERALS.inBody}`);
    expect(presentation.bodyText).toContain('@docs/target.md');
    expect(JSON.stringify(result.data)).not.toContain('relationship');
    expect(Object.keys(result.data).toSorted()).toEqual([
      'diagnostics',
      // The `vscode://` link the server builds, because the absolute path is
      // the server's alone (data-model.md § SourceBoundary).
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
      // The `vscode://` link the server builds, because the absolute path is
      // the server's alone (data-model.md § SourceBoundary).
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

describe('get-file-detail over a consented member Source (T995)', () => {
  /** The exact authored member text, credential and reference included. */
  const MEMBER_TEXT =
    '# personal instructions\n\nToken: sk-live-contract-9876543210\nDeploy posts to ${MEMBER_CONTRACT_TOKEN}\n';

  /** Boots a session, commits a Repository scan, then one Claude-member enable. */
  async function globalFixture(): Promise<{ readonly context: InspectorHostContext }> {
    const base = mkdtempSync(join(tmpdir(), 'aci-detail-global-contract-'));
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const repository = join(base, 'repo');
    mkdirSync(repository, { recursive: true });
    // The repository holds no CLAUDE.md at all, so the member path resolves
    // in exactly one Source and a repository-Source request for it must miss.
    writeFileSync(join(repository, 'AGENTS.md'), '# repository instructions\n', 'utf8');
    const home = join(base, 'claude-home');
    mkdirSync(home, { recursive: true });
    writeFileSync(join(home, 'CLAUDE.md'), MEMBER_TEXT, 'utf8');

    const session = new InspectionSession({
      invocationCwd: repository,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const context: InspectorHostContext = { session, coordinator };
    const repositorySource = session.snapshot().sources[0]!;
    const admission = coordinator.admitScan(repositorySource.sourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      throw new Error('the first scan was not admitted');
    }
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repositorySource.sourceId,
      'repository',
    );

    const registered = coordinator.registerGlobalEnable('preview-contract', 'initial-enable');
    if (registered.kind !== 'admitted') {
      throw new Error('expected the operation to be registered');
    }
    const settled = coordinator.settleGlobalEnable(registered.operationId, 'preview-contract', [
      {
        member: {
          member: 'claude',
          origin: 'environment' as const,
          lexicalRoot: home,
          inputState: 'eligible' as const,
          port: null,
        },
        outcome: { kind: 'admitted' as const, root: home },
      },
    ]);
    if (settled.scanRequestId === null) {
      throw new Error('expected a queued batch');
    }
    const publication = await runSourceScan({
      sourceId: session.globalConsent!.controls.get('claude')!.sourceId!,
      root: home,
      rootFailureOwner: 'global:claude',
      scope: 'global',
      rules: CLAUDE_GLOBAL_RULES,
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected the member scan to publish');
    }
    coordinator.completeGlobalBatch(settled.scanRequestId, [
      {
        member: 'claude' as const,
        files: publication.files,
        recognitions: publication.recognitions,
        diagnostics: publication.diagnostics,
        outcome: publication.outcome,
        visitedEntries: publication.visitedEntries,
        candidateFiles: publication.candidateFiles,
        readBytes: publication.readBytes,
        censusEscapedDirectories: [],
      },
    ]);
    return { context };
  }

  it('serves the member file exactly under its own Source, and nowhere else', async () => {
    const { context } = await globalFixture();
    // The member Source's own identity answers with the authored bytes —
    // credential and environment reference literal, nothing masked or
    // resolved (FR-025, FR-026).
    const detail = await getFileDetail(context, 'CLAUDE.md', 'global-claude');
    if (!('data' in detail) || !('sourceText' in detail.data.file)) {
      throw new Error('expected a readable member detail');
    }
    expect(detail.data.file.sourceText).toBe(MEMBER_TEXT);
    // The same path under the Repository Source resolves nowhere: the
    // identity is the Source-and-path pair, and this repository holds no
    // such file (FR-030, contracts/http-api.md § get-file-detail).
    expect(await getFileDetail(context, 'CLAUDE.md', 'repository')).toEqual({
      error: { code: 'stale-resource' },
    });
  });
});

async function getMcpCarrierDetail(
  context: InspectorHostContext,
  sourceRelativePath: string,
  source: SourceSelector = 'repository',
): Promise<InspectionDataResult<McpCarrierDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get(
    'agent-customization-inspector:get-mcp-carrier-detail',
  )!;
  // Both halves of the identity, exactly as get-file-detail takes them: a
  // Global member publishes this kind too, so two Sources can hold one path
  // (FR-030, contracts/http-api.md).
  return (await fn.handler({ sourceRelativePath, source } as never)) as
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
      fileOpener: new RecordingFileOpener(),
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
    expect(context7!.fields[0]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: 'npx',
    });
    expect(docsHttp!.fields.map((field) => field.key)).toEqual(['url', 'headers']);
    expect(docsHttp!.fields[0]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: 'https://docs.example.com/mcp',
    });
    expect(odd!.fields).toEqual([
      {
        key: 'command',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'number', text: '42' },
      },
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
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
    const result = await getMcpCarrierDetail(context, '.codex/config.toml');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather
    // than absent, the failure's record is in `diagnostics`, and the
    // carrier's bytes still reach no response (FR-007, FR-028).
    expect(result.data.servers).toBeNull();
    // One record, this kind's own. The file carries two extracting
    // recognitions — its `[mcp_servers.*]` tables and the `[hooks]` table it
    // can also contain (T839) — and a failure is one record per (file, kind)
    // (FR-028), so the file's own list holds both while this response holds
    // the one its readings reference: publishing the file's list here would
    // report the hook row's failure as this row's.
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });

  it('answers a carrier that a configured fallback also recognizes under its file row (FR-007)', async () => {
    // A Codex `project_doc_fallback_filenames` entry naming `.mcp.json` makes
    // the root carrier an instruction file too. Which detail answers for a
    // file follows from the row it is reached through, never from the file:
    // the MCP row's subject is one declaration, so that detail publishes
    // declarations alone, while the instructions row's subject is the file,
    // so the instruction detail is the whole document — the same complete
    // source every other instruction file shows.
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
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
    // The premise this test exists for: the fallback really did add a Codex
    // instructions recognition on the carrier file. Without this, the
    // stale-resource assertion below would pass vacuously.
    const carrierInstructionFiles = session
      .snapshot()
      .instructions.flatMap((entry) => entry.files)
      .filter((file) => file.sourceRelativePath === '.mcp.json');
    expect(carrierInstructionFiles).not.toHaveLength(0);
    // The source-serving function answers under the instructions row, with
    // the document the reader wrote — credentials included, because a file
    // the inspector read is the reader's own and nothing is masked
    // (FR-025, FR-026).
    const detail = await getFileDetail(context, '.mcp.json');
    if (!('data' in detail) || detail.data.kind !== 'instructions') {
      throw new Error('expected the instructions file detail');
    }
    if (detail.data.file.encoding !== 'utf-8') {
      throw new Error('expected the readable carrier file');
    }
    expect(detail.data.file.sourceText).toContain(FIXTURE_SECRET_LITERAL);
    // The declarations are still served by the carrier's own function, which
    // is what the MCP row opens.
    const carrier = await getMcpCarrierDetail(context, '.mcp.json');
    if (!('data' in carrier)) {
      throw new Error('expected the carrier detail result');
    }
    expect(carrier.data.servers?.map((server) => server.name)).toEqual(['db']);
    // That response still carries no bytes: its subject is one declaration.
    expect(JSON.stringify(carrier)).not.toContain('sourceText');
  });

  it('validates by resolution: each function rejects the other’s resource as stale', async () => {
    const { context, fixture } = await scannedMcpFixture();
    // The nested near miss was never admitted, so its path resolves to
    // nothing for either function. (The root `.mcp.json` is no longer a
    // negative here: it is Claude's own carrier, T309.)
    expect(await getMcpCarrierDetail(context, 'packages/api/.codex/config.toml')).toEqual({
      error: { code: 'stale-resource' },
    });
    // A committed instruction file is `get-file-detail`'s resource and not a
    // carrier (contracts/http-api.md § get-mcp-carrier-detail).
    expect(await getMcpCarrierDetail(context, 'AGENTS.md')).toEqual({
      error: { code: 'stale-resource' },
    });
    // The Codex carrier resolves in both directions, because it holds a row
    // of each shape: its MCP rows are declarations inside the file, and its
    // `settings/config` row is the file. The MCP detail therefore publishes
    // declarations with no bytes, and the file detail the whole document
    // (contracts/http-api.md § get-file-detail).
    const fileDetail = await getFileDetail(context, fixture.carrierPath);
    if (!('data' in fileDetail) || fileDetail.data.kind !== 'settings/config') {
      throw new Error('expected the settings file detail');
    }
    expect(fileDetail.data.file.sourceRelativePath).toBe(fixture.carrierPath);
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
      fileOpener: new RecordingFileOpener(),
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
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
      fileOpener: new RecordingFileOpener(),
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
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
      fileOpener: new RecordingFileOpener(),
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
    expect(context7!.fields[0]!.value).toEqual({
      kind: 'scalar',
      scalarKind: 'string',
      text: './scripts/context7.sh',
    });
    expect(docsHttp!.fields.map((field) => field.key)).toEqual(['type', 'url', 'headers']);
    expect(odd!.fields).toEqual([
      {
        key: 'command',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'number', text: '42' },
      },
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
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

async function getHookCarrierDetail(
  context: InspectorHostContext,
  sourceRelativePath: string,
  source: SourceSelector = 'repository',
): Promise<InspectionDataResult<HookCarrierDetailDto> | DeterministicRejection> {
  const fn = registerFunctions(context).get(
    'agent-customization-inspector:get-hook-carrier-detail',
  )!;
  // Both halves of the identity, exactly as get-file-detail takes them: a
  // Global member publishes this kind too, so two Sources can hold one path
  // (FR-030, contracts/http-api.md).
  return (await fn.handler({ sourceRelativePath, source } as never)) as
    InspectionDataResult<HookCarrierDetailDto> | DeterministicRejection;
}

describe('get-hook-carrier-detail for the Codex hook carriers (T847)', () => {
  /** Boots a session over the hook fixture and runs its first scan. */
  async function scannedHookFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CodexHookFixture;
  }> {
    const fixture = buildCodexHookFixture('inspector-hook-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

  it('returns the events by the keys the carrier wrote, with the groups as authored', async () => {
    const { context, fixture } = await scannedHookFixture();
    const result = await getHookCarrierDetail(context, fixture.standaloneCarrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    const events = result.data.events;
    if (events === null) {
      throw new Error('expected parsed declarations');
    }
    // One declaration per declared event, in the parser's resolved order, the
    // event whose value is not a list of groups omitted whole (FR-007).
    expect(events.map((event) => event.event)).toEqual([...fixture.expectedStandaloneEvents]);
    // A group is the item its author wrote: a matcher and the handlers under
    // it, with the timeouts and status messages the declaration carries. A
    // malformed group — an item that is not a table — is published as authored
    // rather than dropped, because a reader needs it stated.
    const preToolUse = events.find((event) => event.event === 'PreToolUse')!;
    expect(preToolUse.groups.map((group) => group.kind)).toEqual(['mapping', 'scalar']);
    // The carrier's own keys, which only this response publishes: such a file
    // has no other row (FR-007).
    if (result.data.carrier !== 'standalone') {
      throw new Error('expected the standalone carrier form');
    }
    expect(result.data.carrierFields.map((field) => field.key)).toEqual(['description']);
  });

  it('answers for the inline table of a config layer as the contained form', async () => {
    const { context, fixture } = await scannedHookFixture();
    const result = await getHookCarrierDetail(context, fixture.inlineCarrierPath);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // The same physical file the MCP and settings rows answer for, under its
    // own kind's function: the events alone, with the document around them
    // left to the settings row and the `[mcp_servers.*]` tables to the MCP
    // rows (FR-007).
    expect(result.data.carrier).toBe('contained');
    expect(result.data.events?.map((event) => event.event)).toEqual([
      ...fixture.expectedInlineEvents,
    ]);
    expect(JSON.stringify(result)).not.toContain('mcp_servers');
    expect(JSON.stringify(result)).not.toContain('gpt-5.4-codex');
  });

  it('serves no file detail for a carrier whose whole purpose is hooks', async () => {
    const { context, fixture } = await scannedHookFixture();
    // The hook row's subject is one declared event inside the file, so the
    // file's own bytes reach no response: `get-file-detail` answers the same
    // staleness outcome it gives a path no generation holds, rather than
    // handing back the source the hook detail deliberately omits (FR-007).
    expect(await getFileDetail(context, fixture.standaloneCarrierPath)).toEqual({
      error: { code: 'stale-resource' },
    });
    // The config layer is its settings document besides, so that row answers
    // for it — with the complete TOML, `[hooks]` table included, which is the
    // one document seen under its own row.
    const settings = await getFileDetail(context, fixture.inlineCarrierPath);
    if (!('data' in settings) || settings.data.kind !== 'settings/config') {
      throw new Error('expected the settings document detail');
    }
    expect(settings.data.file.encoding).toBe('utf-8');
  });

  it('serves the carrier with no sourceText field at all', async () => {
    const { context, fixture } = await scannedHookFixture();
    for (const carrierPath of [fixture.standaloneCarrierPath, fixture.inlineCarrierPath]) {
      const result = await getHookCarrierDetail(context, carrierPath);
      if (!('data' in result)) {
        throw new Error('expected the carrier detail result');
      }
      // A file admitted so its declarations can be published shows those
      // declarations and never its bytes — absent from the shape rather than
      // withheld at render time (FR-007).
      expect(JSON.stringify(result)).not.toContain('sourceText');
      expect(result.data.file.sourceRelativePath).toBe(carrierPath);
    }
  });

  it('keeps a declared credential and environment reference literal', async () => {
    const { context, fixture } = await scannedHookFixture();
    const result = await getHookCarrierDetail(context, fixture.standaloneCarrierPath);
    // The characters the author wrote reach the response: no value is masked,
    // shortened, or resolved, and no process value is substituted (FR-026).
    const serialized = JSON.stringify(result);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('rejects a path the current generation holds no hook recognition for', async () => {
    const { context, fixture } = await scannedHookFixture();
    // The same staleness outcome every detail request has: a near miss, a
    // handler script a declaration names, and a path the scan never held are
    // indistinguishable here and answered alike (contracts/http-api.md
    // § get-hook-carrier-detail).
    for (const path of [...fixture.nearMissPaths, 'AGENTS.md', '.codex/hooks/does-not-exist.py']) {
      expect(await getHookCarrierDetail(context, path), path).toEqual({
        error: { code: 'stale-resource' },
      });
    }
  });

  it('publishes null events with the failure diagnostic for an unparseable carrier', async () => {
    const root = createRepositoryFixtureRoot('inspector-hook-detail-malformed');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.codex'), { recursive: true });
    writeFileSync(join(root, '.codex/hooks.json'), '{ "hooks": { "Stop": [ }\n', 'utf8');
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
    const result = await getHookCarrierDetail(context, '.codex/hooks.json');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Null exactly for the failed extraction: the rows are unknown rather than
    // absent, the failure's record is in `diagnostics`, and the carrier's bytes
    // still reach no response (FR-007, FR-028). The carrier form stands either
    // way, because it is the admitting rule's fact rather than the text's.
    expect(result.data.events).toBeNull();
    expect(result.data.carrier).toBe('standalone');
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({ code: 'recognition-parse-failed' }),
    ]);
    expect(JSON.stringify(result)).not.toContain('sourceText');
  });
});

describe('get-hook-carrier-detail for the Claude owners (T870)', () => {
  /** Boots a session over the Claude hook fixture and runs its first scan. */
  async function scannedClaudeHookFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: ClaudeHookFixture;
  }> {
    const fixture = buildClaudeHookFixture('inspector-claude-hook-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

  it('answers for the settings owners as the contained form, with their own events', async () => {
    const { context, fixture } = await scannedClaudeHookFixture();
    for (const [owner, events] of Object.entries(fixture.expectedEventsByOwner)) {
      const result = await getHookCarrierDetail(context, owner);
      if (!('data' in result)) {
        throw new Error(`expected the carrier detail result for ${owner}`);
      }
      // Claude declares hooks nowhere but inside an accepted artifact, so every
      // owner answers as the contained form — and a contained result carries no
      // `carrierFields`, because the keys beside the declaration belong to the
      // owner's other rows (FR-007).
      expect(result.data.carrier, owner).toBe('contained');
      expect(
        result.data.events?.map((event) => event.event),
        owner,
      ).toEqual([...events]);
      expect(JSON.stringify(result), owner).not.toContain('sourceText');
    }
  });

  it('answers for no owner whose hooks belong to another customization', async () => {
    const { context, fixture } = await scannedClaudeHookFixture();
    // A skill, a subagent, a plugin manifest, and a catalog entry may each
    // declare hooks, and none of them resolves here: such a declaration is part
    // of what that customization is, and its own row publishes the keys its
    // file wrote (contracts/vendors/claude-code.md § Normative initial-release
    // presentation allowlist, the `hook` row).
    for (const owner of [
      fixture.owners.skill,
      fixture.owners.agent,
      fixture.owners.pluginManifest,
      fixture.owners.marketplace,
    ]) {
      expect(await getHookCarrierDetail(context, owner), owner).toEqual({
        error: { code: 'stale-resource' },
      });
    }
  });

  it('keeps a declared credential and environment reference literal', async () => {
    const { context, fixture } = await scannedClaudeHookFixture();
    const result = await getHookCarrierDetail(context, fixture.owners.localSettings);
    const serialized = JSON.stringify(result);
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    expect(serialized).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(serialized).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('rejects the standalone path Claude documents nowhere', async () => {
    const { context, fixture } = await scannedClaudeHookFixture();
    // A fabricated `.claude/hooks.json` is no candidate at all, so its detail
    // is the same staleness outcome a removed file has — and so is a declared
    // handler script, and a plugin's own bundled hook file, which is read as
    // one of that plugin's files and is no hook carrier
    // (contracts/http-api.md § get-hook-carrier-detail).
    for (const path of [...fixture.nearMissPaths, ...fixture.pluginBundledHookPaths]) {
      expect(await getHookCarrierDetail(context, path), path).toEqual({
        error: { code: 'stale-resource' },
      });
    }
  });
});

describe('get-file-detail for the Codex settings document (T593)', () => {
  /** One scanned Codex carrier fixture and its host context. */
  async function scannedSettingsFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CodexMcpFixture;
  }> {
    const fixture = buildCodexMcpFixture('inspector-settings-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

  it('serves the complete document under its own variant, with no presentation', async () => {
    const { context, fixture } = await scannedSettingsFixture();
    const result = await getFileDetail(context, fixture.carrierPath);
    if (!('data' in result) || result.data.kind !== 'settings/config') {
      throw new Error('expected the settings file detail');
    }
    // Exactly the fields the contract's tree names for this variant: the
    // file, the diagnostics, and nothing read out of the document
    // (contracts/http-api.md § get-file-detail).
    expect(Object.keys(result.data).toSorted()).toEqual(['diagnostics', 'file', 'kind']);
    const file = result.data.file;
    if (file.encoding !== 'utf-8') {
      throw new Error('expected the readable carrier file');
    }
    expect(file.sourceRelativePath).toBe(fixture.carrierPath);
    expect(file.hadLeadingBom).toBe(false);
    expect(file.sizeBytes).toBe(Buffer.byteLength(file.sourceText, 'utf8'));
    // The document reaches the response as its author wrote it, which is what
    // separates this row from the MCP row of the same file: the comment, the
    // underscored integer, and the section order a parser's resolution would
    // have dropped are all still there (FR-007).
    expect(file.sourceText).toContain('# Codex project configuration for the fixture repository.');
    expect(file.sourceText).toContain('project_doc_max_bytes = 32_768');
    expect(file.sourceText).toContain('[mcp_servers.context7]');
    // Credentials and environment references are the characters that were
    // written: nothing is masked and no process value is substituted, because
    // the file is the reader's own (FR-025, FR-026).
    expect(file.sourceText).toContain(FIXTURE_SECRET_LITERAL);
    expect(file.sourceText).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // Nothing was read out, so nothing could fail to be read (FR-028).
    expect(result.data.diagnostics).toEqual([]);
  });

  it('answers a path the current generation holds no settings row at as stale', async () => {
    const { context, fixture } = await scannedSettingsFixture();
    // The nested layer is a near miss the walk never admitted, so no row of
    // any kind sits at it and both functions answer the same way.
    for (const nearMiss of fixture.nearMissPaths) {
      expect(await getFileDetail(context, nearMiss), nearMiss).toEqual({
        error: { code: 'stale-resource' },
      });
    }
    // A value of another type resolves the same way: the parameter validates
    // by resolution, so there is no separate malformed-argument outcome.
    expect(await getFileDetail(context, 42 as unknown as string)).toEqual({
      error: { code: 'stale-resource' },
    });
  });

  it('carries the epoch and both sequence generations beside the payload', async () => {
    const { context, fixture } = await scannedSettingsFixture();
    const result = await getFileDetail(context, fixture.carrierPath);
    expect(Object.keys(result).toSorted()).toEqual([
      'data',
      'globalContentEpoch',
      'globalGeneration',
      'repositoryGeneration',
    ]);
  });
});

describe('get-hook-carrier-detail for the Copilot hook carriers (T891)', () => {
  /** Boots a session over the Copilot hook fixture and runs its first scan. */
  async function scannedCopilotHookFixture(): Promise<{
    readonly context: InspectorHostContext;
    readonly fixture: CopilotHookFixture;
  }> {
    const fixture = buildCopilotHookFixture('inspector-copilot-hook-detail-contract');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

  it('returns a hook file’s events by the keys it wrote, with the keys beside them', async () => {
    const { context, fixture } = await scannedCopilotHookFixture();
    const result = await getHookCarrierDetail(context, fixture.owners.standalone);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    const events = result.data.events;
    if (events === null) {
      throw new Error('expected parsed declarations');
    }
    // One declaration per declared event, in the parser's resolved order, the
    // event whose value is not a list of groups omitted whole (FR-007). The
    // CLI's lowerCamelCase spelling is what this file wrote, so it is what the
    // response carries.
    expect(events.map((event) => event.event)).toEqual([
      ...fixture.expectedEventsByOwner[fixture.owners.standalone]!,
    ]);
    // The carrier's own keys, which only this response publishes: such a file
    // has no other row (FR-007).
    if (result.data.carrier !== 'standalone') {
      throw new Error('expected the standalone carrier form');
    }
    expect(result.data.carrierFields.map((field) => field.key)).toEqual(['version', 'description']);
    // The declared credential and environment reference reach the response
    // exactly as written, unresolved and unmasked (FR-026, FR-027).
    const rendered = JSON.stringify(result.data.events);
    expect(rendered).toContain(FIXTURE_SECRET_LITERAL);
    expect(rendered).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
  });

  it('answers for a settings document as the contained form, events alone', async () => {
    const { context, fixture } = await scannedCopilotHookFixture();
    const result = await getHookCarrierDetail(context, fixture.owners.settings);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // The same physical file the settings row answers for, under its own
    // kind's function: the events alone, with the document around them left to
    // that row (FR-007).
    expect(result.data.carrier).toBe('contained');
    expect(result.data.events?.map((event) => event.event)).toEqual([
      ...fixture.expectedEventsByOwner[fixture.owners.settings]!,
    ]);
    expect(JSON.stringify(result)).not.toContain('companyAnnouncements');
    expect(JSON.stringify(result)).not.toContain('enabledPlugins');
  });

  it('serves the cross-tool document once, under each product’s own recognition', async () => {
    const { context, fixture } = await scannedCopilotHookFixture();
    const result = await getHookCarrierDetail(context, fixture.owners.claudeSettings);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // One carrier detail for one file: the row unit is the declared event and
    // the declaration list is where the two products' recognitions differ, so
    // the carrier's own response states the file's declarations once (FR-007).
    expect(result.data.carrier).toBe('contained');
    expect(result.data.events?.map((event) => event.event)).toEqual([
      ...fixture.expectedEventsByOwner[fixture.owners.claudeSettings]!,
    ]);
    const snapshot = context.session.snapshot();
    const row = snapshot.hooks.find((entry) => entry.event === 'PreToolUse')!;
    expect(
      row.declarations
        .filter((declaration) => declaration.sourceRelativePath === fixture.owners.claudeSettings)
        .map((declaration) => declaration.tool)
        .toSorted(),
    ).toEqual(['claude', 'copilot']);
  });

  it('rejects a path the current generation holds no Copilot hook recognition for', async () => {
    const { context, fixture } = await scannedCopilotHookFixture();
    // A near miss, an accepted file of another kind whose frontmatter declares
    // hooks, and a path nothing admits all answer the same way: the response
    // is for a recognition of this generation, and there is none
    // (contracts/http-api.md § get-hook-carrier-detail).
    for (const path of [...fixture.nearMissPaths, fixture.owners.agent]) {
      expect(await getHookCarrierDetail(context, path), path).toEqual({
        error: { code: 'stale-resource' },
      });
    }
    // A settings document that declares no hooks is not that case: it holds a
    // recognition, so it answers with empty events — and it still reaches no
    // inventory row, because a file that merely may carry a hook block and does
    // not is no finding (contracts/http-api.md § get-hook-carrier-detail).
    const hookless = await getHookCarrierDetail(context, fixture.owners.localSettings);
    if (!('data' in hookless)) {
      throw new Error('expected the carrier detail result');
    }
    expect(hookless.data.events).toEqual([]);
    expect(
      context.session
        .snapshot()
        .hooks.flatMap((entry) => entry.declarations)
        .map((declaration) => declaration.sourceRelativePath),
    ).not.toContain(fixture.owners.localSettings);
  });

  it('states an unreadable hook file as unknown events rather than none', async () => {
    const { context, fixture } = await scannedCopilotHookFixture();
    const result = await getHookCarrierDetail(context, fixture.owners.malformed);
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // Extraction failed all-or-nothing, so `events` is null and the failure's
    // Diagnostic is on the response beside the file's own facts (FR-028).
    expect(result.data.events).toBeNull();
    expect(result.data.carrier).toBe('standalone');
    expect(result.data.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'recognition-parse-failed',
    ]);
  });
});

describe('get-hook-carrier-detail for one carrier two products read differently (T891)', () => {
  it('answers with the union of the readings and this kind’s diagnostics alone', async () => {
    // A `.claude/settings.json` holding a comment: Copilot's editor host takes
    // this pair through a JSONC reading while Claude Code reads it strictly, so
    // one carrier holds a reading that parsed beside one that failed
    // (`parsers/json.ts` § acceptsComments).
    const root = createRepositoryFixtureRoot('inspector-hook-detail-divergent');
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.claude'), { recursive: true });
    writeFileSync(
      join(root, '.claude/settings.json'),
      [
        '{',
        '  // the editor host reads this pair as JSONC',
        '  "permissions": { "allow": ["Bash(git status)"] },',
        '  "hooks": {',
        '    "PreToolUse": [{ "matcher": "Bash", "hooks": [{ "type": "command", "command": "./g.sh" }] }]',
        '  }',
        '}',
        '',
      ].join('\n'),
      'utf8',
    );
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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

    const result = await getHookCarrierDetail(context, '.claude/settings.json');
    if (!('data' in result)) {
      throw new Error('expected the carrier detail result');
    }
    // The file-unit response is the union of the parsed readings: the reading
    // that rejected the text contributes no event, and `events` is null only
    // when none parsed (FR-028).
    expect(result.data.carrier).toBe('contained');
    expect(result.data.events?.map((event) => event.event)).toEqual(['PreToolUse']);
    // One diagnostic, this kind's own: the same file's permission policy also
    // failed to parse, and that record belongs to the row whose subject it is.
    expect(result.data.diagnostics).toEqual([
      expect.objectContaining({
        code: 'recognition-parse-failed',
        sourceRelativePath: '.claude/settings.json',
      }),
    ]);
    // The inventory states which product read what: the event's row carries the
    // reading that parsed, and the closing row the one whose events are unknown.
    const snapshot = session.snapshot();
    expect(
      snapshot.hooks.map((entry) => [
        entry.event,
        entry.declarations.map((declaration) => `${declaration.tool}/${declaration.parseStatus}`),
      ]),
    ).toEqual([
      ['PreToolUse', ['copilot/parsed']],
      [null, ['claude/failed']],
    ]);
  });
});

describe('what a detail may and may not carry (T926)', () => {
  /**
   * Boots a session over a tree written for this case and runs its first
   * scan, so a variant that needs particular bytes — replaced text, NUL
   * bytes — has them without disturbing the shared secret fixture.
   */
  async function scannedTree(write: (root: string) => void): Promise<InspectorHostContext> {
    const root = mkdtempSync(join(tmpdir(), 'inspector-detail-variant-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    write(root);
    const session = new InspectionSession({
      invocationCwd: root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
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
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repository.sourceId,
      'repository',
    );
    return context;
  }

  it('serves replaced text as complete readable source, comparison and all', async () => {
    // A `U+FFFD` the decoder inserted is content: the file is readable, its
    // source is complete, and nothing about it is withheld or re-decoded
    // (FR-025). A reader comparing two such files gets the same text both
    // surfaces show.
    const context = await scannedTree((root) => {
      mkdirSync(join(root, '.claude/skills/replaced'), { recursive: true });
      writeFileSync(
        join(root, '.claude/skills/replaced/SKILL.md'),
        Uint8Array.from([
          ...new TextEncoder().encode('---\nname: replaced\ndescription: A '),
          0xff,
          ...new TextEncoder().encode(' name.\n---\n\nBody.\n'),
        ]),
      );
    });
    const result = await getFileDetail(context, '.claude/skills/replaced/SKILL.md');
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { file } = result.data;
    if (file.encoding !== 'utf-8-replaced') {
      throw new Error(`expected replaced text, got ${file.encoding}`);
    }
    expect(file.sourceText).toContain('\uFFFD');
    expect(file.sourceText.endsWith('Body.\n')).toBe(true);
    expect(file.diagnosticIds).toEqual([]);
  });

  it('serves a binary file as its diagnostic alone, with no field for content', async () => {
    const context = await scannedTree((root) => {
      mkdirSync(join(root, '.claude/skills/binary'), { recursive: true });
      writeFileSync(
        join(root, '.claude/skills/binary/SKILL.md'),
        Uint8Array.from([0x23, 0x00, 0x61]),
      );
    });
    const result = await getFileDetail(context, '.claude/skills/binary/SKILL.md');
    if (!('data' in result)) {
      throw new Error('expected a detail result');
    }
    const { file } = result.data;
    expect(file.encoding).toBe('binary');
    // Absent by construction rather than emptied at serialization: the binary
    // variant has no `sourceText` member at all, so there is nothing to
    // forget to clear (FR-025).
    expect(Object.keys(file)).not.toContain('sourceText');
    expect(Object.keys(file)).not.toContain('hadLeadingBom');
    expect(file.diagnosticIds).toHaveLength(1);
    expect(result.data.diagnostics.map((diagnostic) => diagnostic.code)).toEqual([
      'file-content-binary',
    ]);
  });

  it('offers no acknowledgement, notice, or reveal function at all', async () => {
    // FR-027 has neither: a session that could be asked to acknowledge
    // something would have a state a reader must clear before reading their
    // own file, and one that could reveal something would imply it had
    // hidden it. The whole registered surface is what proves the absence.
    const { context } = await scannedFixture();
    const names = [...registerFunctions(context).keys()].toSorted();
    expect(names.length).toBeGreaterThan(0);
    for (const forbidden of ['acknowledge', 'notice', 'reveal', 'unmask', 'resolve-value']) {
      expect(
        names.filter((name) => name.includes(forbidden)),
        forbidden,
      ).toEqual([]);
    }
  });

  it('fails a request-owned rejection with its real error and no payload', async () => {
    const { context, skillPath } = await scannedFixture();
    const committed = context.session.snapshot();
    // The detail is assembled from the committed generation, so a rejection
    // inside that assembly is this request's own: it reaches the caller
    // unchanged, and it publishes no result, no generation, and no partial
    // success to stand in for one (FR-030).
    const injected = new Error('injected detail failure');
    const detail = vi.spyOn(context.session, 'fileDetail').mockImplementation(() => {
      throw injected;
    });
    try {
      await expect(getFileDetail(context, skillPath)).rejects.toBe(injected);
    } finally {
      detail.mockRestore();
    }
    expect(context.session.snapshot()).toEqual(committed);
  });

  it('says what it read and never what it thinks of it', async () => {
    const { context, skillPath } = await scannedFixture();
    const result = await getFileDetail(context, skillPath);
    const payload = JSON.stringify(result).toLowerCase();
    // The detail carries the file's own text and its own facts. A judgement
    // about it — a validation outcome, a verdict, a remediation — has no
    // field to travel in (QR-001, FR-032). The authored text is excluded from
    // the scan: a reader's file may say anything.
    // The file's own text, excluded from the scan below: a reader's file may
    // say anything, and this case is about what the product says.
    let sourceText = '';
    if ('data' in result) {
      const { file } = result.data;
      if (file.encoding === 'utf-8' || file.encoding === 'utf-8-replaced') {
        sourceText = file.sourceText;
      }
    }
    const authored = JSON.stringify(sourceText).toLowerCase();
    for (const word of ['"valid', '"invalid', 'compliance', 'remediat', 'verdict', 'severity']) {
      expect(payload.replace(authored, ''), word).not.toContain(word);
    }
  });
});
