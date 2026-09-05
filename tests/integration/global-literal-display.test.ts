// T995: what a consented member's committed files display, exactly
// (FR-025, FR-026, FR-027, FR-028; contracts/http-api.md § get-file-detail).
//
// A Global commit serves authored bytes on the same terms as the Repository's:
// a credential literal, an environment reference, a process sentinel, and an
// executable-looking payload are text served exactly as written — nothing is
// masked, resolved, executed, or judged. A binary member file is
// diagnostic-only, a mis-encoded one is served through UTF-8 replacement
// exactly as decoded, and a failure that is not confined to one file aborts
// the whole batch: no subset commits, no generation advances, no
// `StaleSourceFailure` is created for an initial enable, and the prior
// Repository state stays readable and untouched on disk.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../src/server/inspection/fs-io';
import { admitGlobalRoot } from '../../src/server/inspection/global-admission';
import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import { CODEX_GLOBAL_RULES } from '../../src/server/inspection/rules/codex';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import { observeTree } from '../fixtures/global-homes/build-fixtures';
import { RecordingFileOpener } from '../fixtures/file-opener';

vi.mock('../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const cleanups: (() => void)[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanups.length > 0) {
    cleanups.pop()!();
  }
});

/** The literal payloads whose exact display this suite is about (FR-025, FR-026). */
const CREDENTIAL = 'sk-live-global-literal-0123456789';
const ENVIRONMENT_REFERENCE = '${GLOBAL_LITERAL_TOKEN}';
const PROCESS_SENTINEL = '$(whoami)';
const EXECUTABLE_PAYLOAD = '<script>fetch("https://example.invalid")</script>';

/** One member home whose files carry every payload class. */
function buildLiteralHomes(prefix: string): {
  readonly base: string;
  readonly claude: string;
  readonly codex: string;
} {
  const base = mkdtempSync(join(tmpdir(), `${prefix}-`));
  const claude = join(base, 'claude-home');
  const codex = join(base, 'codex-home');
  mkdirSync(claude, { recursive: true });
  mkdirSync(codex, { recursive: true });
  // Readable text carrying the credential, the reference, the sentinel, and
  // the payload — one file, four classes, served as one exact source text.
  writeFileSync(
    join(claude, 'CLAUDE.md'),
    `# personal instructions\n\nToken: ${CREDENTIAL}\nDeploy posts to ${ENVIRONMENT_REFERENCE}\nShell: ${PROCESS_SENTINEL}\n${EXECUTABLE_PAYLOAD}\n`,
    'utf8',
  );
  // A mis-encoded settings file: the 0x80 byte is not UTF-8, so the read is
  // served through replacement, exactly as decoded (FR-025).
  writeFileSync(join(claude, 'settings.json'), Buffer.from([0x7b, 0x80, 0x7d]));
  // A binary member file at an admitted location: diagnostic-only (FR-028).
  writeFileSync(
    join(codex, 'AGENTS.md'),
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]),
  );
  // A walked fixed subtree, so the member's traversal issues a directory
  // listing — the call the abort case injects its unconfined failure into:
  // a member holding only probed exact targets would never list anything.
  mkdirSync(join(codex, 'agents'), { recursive: true });
  writeFileSync(join(codex, 'agents', 'deploy.toml'), 'description = "deploys"\n', 'utf8');
  return { base, claude, codex };
}

/** Registers and settles one two-member enable, returning the queued request. */
async function settleEnable(
  session: InspectionSession,
  coordinator: SessionCoordinator,
  homes: { readonly claude: string; readonly codex: string },
): Promise<string> {
  const registered = coordinator.registerGlobalEnable('preview-literal', 'initial-enable');
  if (registered.kind !== 'admitted') {
    throw new Error('expected the operation to be registered');
  }
  const admissions = [];
  for (const member of ['claude', 'codex'] as const) {
    const outcome = await admitGlobalRoot(homes[member]);
    if (outcome.kind !== 'admitted') {
      throw new Error(`expected the ${member} home to be admitted`);
    }
    admissions.push({
      member: {
        member,
        origin: 'environment' as const,
        lexicalRoot: homes[member],
        inputState: 'eligible' as const,
        port: null,
      },
      outcome: { kind: 'admitted' as const, root: homes[member] },
    });
  }
  const settled = coordinator.settleGlobalEnable(
    registered.operationId,
    'preview-literal',
    admissions,
  );
  if (settled.scanRequestId === null) {
    throw new Error('expected a queued batch');
  }
  return settled.scanRequestId;
}

/** Runs both member scans and commits the one batch generation. */
async function commitEnable(
  session: InspectionSession,
  coordinator: SessionCoordinator,
  homes: { readonly claude: string; readonly codex: string },
  scanRequestId: string,
): Promise<void> {
  const catalogs = { claude: CLAUDE_GLOBAL_RULES, codex: CODEX_GLOBAL_RULES } as const;
  const results = [];
  for (const member of ['claude', 'codex'] as const) {
    const publication = await runSourceScan({
      sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
      root: homes[member],
      rootFailureOwner: `global:${member}`,
      scope: 'global',
      rules: catalogs[member],
    });
    if (publication.kind !== 'publishable') {
      throw new Error(`expected the ${member} scan to publish`);
    }
    results.push({
      member,
      files: publication.files,
      recognitions: publication.recognitions,
      diagnostics: publication.diagnostics,
      outcome: publication.outcome,
      visitedEntries: publication.visitedEntries,
      candidateFiles: publication.candidateFiles,
      readBytes: publication.readBytes,
      censusEscapedDirectories: publication.censusEscapedDirectories,
    });
  }
  coordinator.completeGlobalBatch(scanRequestId, results);
}

describe('a Global commit displays authored content exactly (T995)', () => {
  it('serves credentials, references, sentinels, and payloads as exact inert text', async () => {
    const homes = buildLiteralHomes('aci-global-literal');
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const scanRequestId = await settleEnable(session, coordinator, homes);
    await commitEnable(session, coordinator, homes, scanRequestId);

    const detail = session.fileDetail('CLAUDE.md', 'global-claude');
    if (detail === null || !('sourceText' in detail.file)) {
      throw new Error('expected a readable CLAUDE.md detail');
    }
    // Byte-exact read-through is the whole claim: no mask over the
    // credential, no substitution of the reference, no execution of the
    // sentinel or the payload, and no verdict about any of them.
    expect(detail.file.sourceText).toBe(readFileSync(join(homes.claude, 'CLAUDE.md'), 'utf8'));
    for (const literal of [
      CREDENTIAL,
      ENVIRONMENT_REFERENCE,
      PROCESS_SENTINEL,
      EXECUTABLE_PAYLOAD,
    ]) {
      expect(detail.file.sourceText).toContain(literal);
    }
  });

  it('serves a mis-encoded file through replacement and a binary one diagnostic-only', async () => {
    const homes = buildLiteralHomes('aci-global-encodings');
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const scanRequestId = await settleEnable(session, coordinator, homes);
    await commitEnable(session, coordinator, homes, scanRequestId);

    const replaced = session.fileDetail('settings.json', 'global-claude');
    if (replaced === null || !('sourceText' in replaced.file)) {
      throw new Error('expected a readable settings.json detail');
    }
    // The one 0x80 byte decodes to exactly one U+FFFD; the braces around it
    // survive untouched (FR-025 § utf-8-replaced).
    expect(replaced.file.encoding).toBe('utf-8-replaced');
    expect(replaced.file.sourceText).toBe('{�}');

    const binary = session.fileDetail('AGENTS.md', 'global-codex');
    if (binary === null) {
      throw new Error('expected the binary AGENTS.md detail');
    }
    // Binary input is textless: the detail carries the encoding and the
    // file-confined diagnostic, and no `sourceText` field at all (FR-028).
    expect(binary.file.encoding).toBe('binary');
    expect('sourceText' in binary.file).toBe(false);
    expect(binary.file.diagnosticIds.length).toBeGreaterThan(0);
  });

  it('aborts the whole batch on an unconfined failure, committing no subset', async () => {
    const homes = buildLiteralHomes('aci-global-abort');
    cleanups.push(() => rmSync(homes.base, { recursive: true, force: true }));
    const before = observeTree(homes.base);
    const session = new InspectionSession({
      invocationCwd: '/repo',
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const coordinator = new SessionCoordinator(session);
    const scanRequestId = await settleEnable(session, coordinator, homes);

    // The first member publishes; the second member's traversal throws an
    // unconfined error — a directory listing failure, which no per-file
    // diagnostic owns. The batch trigger owner converts that into the one
    // ordinary batch failure — no member result reaches the coordinator.
    const claudeScan = await runSourceScan({
      sourceId: session.globalConsent!.controls.get('claude')!.sourceId!,
      root: homes.claude,
      rootFailureOwner: 'global:claude',
      scope: 'global',
      rules: CLAUDE_GLOBAL_RULES,
    });
    expect(claudeScan.kind).toBe('publishable');
    vi.mocked(fsIo.readdir).mockRejectedValueOnce(new Error('EMFILE: too many open files'));
    await expect(
      runSourceScan({
        sourceId: session.globalConsent!.controls.get('codex')!.sourceId!,
        root: homes.codex,
        rootFailureOwner: 'global:codex',
        scope: 'global',
        rules: CODEX_GLOBAL_RULES,
      }),
    ).rejects.toThrow('EMFILE');
    coordinator.failGlobalBatch(scanRequestId, 'EMFILE: too many open files');

    // No subset committed: no Global generation exists, both members' details
    // resolve nowhere, and the failure is the batch's one ordinary error —
    // never a `StaleSourceFailure`, which belongs to explicit rescans alone.
    const snapshot = session.snapshot();
    expect(snapshot.globalGeneration).toBeNull();
    expect(snapshot.sources.filter((source) => source.kind === 'global')).toEqual([]);
    expect(session.fileDetail('CLAUDE.md', 'global-claude')).toBeNull();
    expect(session.globalConsent?.batchStatus?.phase).toBe('failed');
    expect(session.globalConsent?.batchStatus?.failureRef).toEqual({
      kind: 'error',
      message: 'EMFILE: too many open files',
    });
    expect(snapshot.staleFailures ?? []).toEqual([]);

    // And the filesystem observation: nothing in either home changed.
    const after = observeTree(homes.base);
    expect([...after.keys()].toSorted()).toEqual([...before.keys()].toSorted());
    for (const [path, observed] of after) {
      expect(observed, path).toEqual(before.get(path));
    }
  });
});
