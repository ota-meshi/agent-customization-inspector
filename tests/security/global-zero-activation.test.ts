// T996: the fixed-four Global enable activates nothing (FR-013 through
// FR-019, FR-022, FR-023, QR-002, QR-003). Consent admission probes roots,
// the one batch scan reads the contracted member files, and the committed
// generation serves what was read; none of them may execute, connect,
// resolve, load, substitute, or modify anything.
//
// The suite proves that two ways, exactly as the Repository zero-activation
// suite does (`tests/integration/security/zero-activation.test.ts`), because
// neither alone is sufficient: a runtime spy only observes capabilities the
// test knows to watch, so the enable-reachable production module graph is
// also scanned statically for the forbidden capabilities — the stronger
// claim, covering code paths these fixtures never reach, and the proof that
// no removed surface reappears.
//
// The two authorized internal loopback classes of FR-022 — static/SPA
// GET/HEAD for the packaged UI assets, and the local session API channel —
// are classified here and belong to the host alone: both are inbound
// requests a reader's own browser issues against the loopback listener, and
// neither is product-issued. Consent admission and the batch scan own
// neither class, so the assertion for the whole enable path is that no
// product-issued request happens at all; the host's serving of the two
// authorized classes is proven where the host runs, in the browser suites.
import { readFileSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../src/server/inspection/fs-io';
import { admitGlobalRoot } from '../../src/server/inspection/global-admission';
import { CLAUDE_GLOBAL_RULES } from '../../src/server/inspection/rules/claude';
import {
  CODEX_AGENTS_HOME_RULES,
  CODEX_GLOBAL_RULES,
} from '../../src/server/inspection/rules/codex';
import {
  COPILOT_AGENTS_HOME_RULES,
  COPILOT_GLOBAL_RULES,
} from '../../src/server/inspection/rules/copilot';
import { runSourceScan } from '../../src/server/inspection/scan';
import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import {
  READ_ONLY_FS_SURFACE,
  collectFsMutationViolations,
  snapshotTreeState,
} from '../fixtures/filesystem/build-filesystem-fixtures';
import { buildGlobalHomeFixture } from '../fixtures/global-homes/build-fixtures';
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

/**
 * Capabilities that must not exist anywhere on the enable-reachable
 * production import graph — the same closed list the Repository suite scans
 * for, because the two paths must stay equally inert: process spawning and
 * dynamic evaluation execute inspected content, the network modules connect
 * somewhere on its behalf, and `node:vm`/`node:module` load it.
 */
const FORBIDDEN_SPECIFIERS = [
  'child_process',
  'node:child_process',
  'net',
  'node:net',
  'tls',
  'node:tls',
  'http',
  'node:http',
  'https',
  'node:https',
  'dgram',
  'node:dgram',
  'dns',
  'node:dns',
  'node:dns/promises',
  'vm',
  'node:vm',
  'worker_threads',
  'node:worker_threads',
  'module',
  'node:module',
];

// Follows the product's own relative imports from one entry module — the
// same walk the Repository suite performs, over the Global entries.
function collectImportGraph(entry: string): Map<string, string> {
  const sources = new Map<string, string>();
  const queue = [resolve(entry)];
  while (queue.length > 0) {
    const file = queue.pop()!;
    if (sources.has(file)) {
      continue;
    }
    const source = readFileSync(file, 'utf8');
    sources.set(file, source);
    // Every spelling that pulls in a relative module: static `from`, a bare
    // side-effect `import`, a re-export, a dynamic `import(...)`,
    // `require(...)`, and either quote style — the same reason the
    // Repository suite matches them all.
    for (const match of source.matchAll(/(?:from|import|require)\s*\(?\s*['"](\.[^'"]+)['"]/gu)) {
      const specifier = match[1]!;
      const candidate = resolve(dirname(file), specifier);
      for (const suffix of ['.ts', '/index.ts', '']) {
        try {
          readFileSync(`${candidate}${suffix}`, 'utf8');
          queue.push(`${candidate}${suffix}`);
          break;
        } catch {
          // Not this suffix; try the next spelling.
        }
      }
    }
  }
  return sources;
}

/**
 * The modules that read consented content: root admission and the batch scan
 * with every member catalog. Two entries rather than one, because neither
 * imports the other — the CLI wires them together. The session module stays
 * out of the static half deliberately: its graph reaches the FR-024 file
 * opener, the documented user-initiated launch surface, so the claim that an
 * enable invokes none of it is the runtime half's, made while the whole
 * enable — session commit included — runs under the spies below.
 */
const GLOBAL_ENTRIES = [
  'src/server/inspection/global-admission.ts',
  'src/server/inspection/scan.ts',
];

describe('the enable-reachable module graph has no activation capability (T996)', () => {
  it('imports no process, network, name-resolution, or dynamic-evaluation module', () => {
    for (const entry of GLOBAL_ENTRIES) {
      const graph = collectImportGraph(entry);
      expect(graph.size).toBeGreaterThan(1);
      for (const [file, source] of graph) {
        for (const specifier of FORBIDDEN_SPECIFIERS) {
          const quoted = specifier.replace(/\//gu, '\\/');
          // Every spelling that reaches a module — static, dynamic, require,
          // and a bare side-effect import — for the reason the Repository
          // suite checks them all: any one loads the same capability.
          expect(
            new RegExp(
              `(?:from\\s+|import\\s*\\(?\\s*|require\\s*\\(\\s*)['"]${quoted}['"]`,
              'u',
            ).test(source),
            `${file} imports ${specifier}`,
          ).toBe(false);
        }
        expect(
          /\beval\s*\(|new\s+Function\s*\(|\bcreateRequire\s*\(/u.test(source),
          `${file} evaluates dynamically or resolves a module at runtime`,
        ).toBe(false);
        // The browser helper is the host's post-bind convenience and must not
        // be reachable from consent admission, the batch scan, or the
        // session: an enable that could open a browser would be an enable
        // that launches something.
        expect(/browser-opener/u.test(source), `${file} reaches the browser helper`).toBe(false);
      }
    }
  });

  it('reaches the filesystem only through the closed read-only surface', () => {
    for (const entry of GLOBAL_ENTRIES) {
      for (const [file, source] of collectImportGraph(entry)) {
        if (file.endsWith('/inspection/fs-io.ts')) {
          continue;
        }
        expect(
          /(?:from|import|require)\s*\(?\s*['"]node:fs/u.test(source),
          `${file} names node:fs directly`,
        ).toBe(false);
      }
    }
    expect(
      Object.keys(fsIo)
        .filter((name) => typeof fsIo[name as keyof typeof fsIo] === 'function')
        .sort(),
    ).toEqual([...READ_ONLY_FS_SURFACE]);
  });
});

/** The fixed member order the batch settles in (FR-045). */
const MEMBERS = ['copilot', 'claude', 'codex', 'agents'] as const;

/** The shipped per-member rule catalogs, exactly as the CLI composes them. */
const CATALOGS = {
  copilot: COPILOT_GLOBAL_RULES,
  claude: CLAUDE_GLOBAL_RULES,
  codex: CODEX_GLOBAL_RULES,
  agents: [...CODEX_AGENTS_HOME_RULES, ...COPILOT_AGENTS_HOME_RULES],
} as const;

/**
 * Admits all four fixture homes, runs the one batch over them with the
 * shipped catalogs, and commits the Global generation — the whole enable
 * path the CLI drives, minus the host neither half needs.
 */
async function runFixedFourEnable(homes: Record<(typeof MEMBERS)[number], string>): Promise<{
  readonly session: InspectionSession;
}> {
  const session = new InspectionSession({
    invocationCwd: '/repo',
    rootOptionValue: null,
    fileOpener: new RecordingFileOpener(),
  });
  const coordinator = new SessionCoordinator(session);
  const registered = coordinator.registerGlobalEnable('preview-zero-activation', 'initial-enable');
  if (registered.kind !== 'admitted') {
    throw new Error('expected the operation to be registered');
  }
  const admissions = [];
  for (const member of MEMBERS) {
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
      // The admitted root travels with the outcome, exactly as the consent
      // domain settles it: the control's root is what the batch scans and
      // what the boundary presentation is derived from.
      outcome: { kind: 'admitted' as const, root: homes[member] },
    });
  }
  const settled = coordinator.settleGlobalEnable(
    registered.operationId,
    'preview-zero-activation',
    admissions,
  );
  if (settled.scanRequestId === null) {
    throw new Error('expected a queued batch');
  }
  const results = [];
  for (const member of MEMBERS) {
    const publication = await runSourceScan({
      sourceId: session.globalConsent!.controls.get(member)!.sourceId!,
      root: homes[member],
      rootFailureOwner: `global:${member}`,
      scope: 'global',
      rules: CATALOGS[member],
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
  coordinator.completeGlobalBatch(settled.scanRequestId, results);
  return { session };
}

describe('the fixed-four enable issues no product request and mutates nothing (T996)', () => {
  it('issues no socket, name resolution, subprocess, or browser launch across the whole batch', async () => {
    // The import graph proves the capability is absent from the modules; this
    // proves the running enable issues none of it. Sockets, DNS, SMB/UNC,
    // MCP, URI handlers, and image fetches each reach the outside through one
    // of the globals or modules spied on here — and a declared hook command
    // or browser helper would go through `child_process` — so an enable that
    // touches none of them executed and requested nothing.
    const fixture = buildGlobalHomeFixture('aci-zero-activation');
    cleanups.push(() => rmSync(fixture.base, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during an enable`);
      };
    }
    const nodeSurfaces: [Record<string, unknown>, string][] = [
      [net as unknown as Record<string, unknown>, 'createConnection'],
      [net as unknown as Record<string, unknown>, 'connect'],
      [tls as unknown as Record<string, unknown>, 'connect'],
      [dns as unknown as Record<string, unknown>, 'lookup'],
      [dns as unknown as Record<string, unknown>, 'resolve'],
      [childProcess as unknown as Record<string, unknown>, 'spawn'],
      [childProcess as unknown as Record<string, unknown>, 'exec'],
      [childProcess as unknown as Record<string, unknown>, 'execFile'],
      [childProcess as unknown as Record<string, unknown>, 'fork'],
      [http as unknown as Record<string, unknown>, 'request'],
      [https as unknown as Record<string, unknown>, 'request'],
      [dgram as unknown as Record<string, unknown>, 'createSocket'],
    ];
    const nodeOriginals = nodeSurfaces.map(([host, name]) => {
      const original = host[name];
      host[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during an enable`);
      };
      return { host, name, original } as const;
    });
    try {
      const { session } = await runFixedFourEnable(fixture.homes);
      expect(session.snapshot().sources.filter((source) => source.kind === 'global')).toHaveLength(
        MEMBERS.length,
      );
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
  });

  it('leaves every byte, mode, time, and link of all four homes unchanged', async () => {
    const fixture = buildGlobalHomeFixture('aci-zero-activation-tree');
    cleanups.push(() => rmSync(fixture.base, { recursive: true, force: true }));
    const before = snapshotTreeState(fixture.base);
    vi.clearAllMocks();

    await runFixedFourEnable(fixture.homes);

    const after = snapshotTreeState(fixture.base);
    // Content, length, identity, link state, mode, and both file times are
    // compared; access-time changes are the OS's and recorded separately
    // (contracts/inspection-path-allowlist.md § Symlink and read invariants).
    expect(after.entries).toEqual(before.entries);
    expect(Object.keys(after.atimes).sort()).toEqual(Object.keys(before.atimes).sort());
    expect(collectFsMutationViolations(fsIo as unknown as Record<string, unknown>)).toEqual([]);
  });

  it('serves each member file byte-exact, substituting and executing nothing', async () => {
    // A declared hook command and an environment-reference-looking value are
    // where activation or substitution would surface: the committed detail
    // must carry the authored bytes exactly, proving the declaration was
    // read, never run, and never resolved (FR-019, FR-020, FR-026).
    const fixture = buildGlobalHomeFixture('aci-zero-activation-detail');
    cleanups.push(() => rmSync(fixture.base, { recursive: true, force: true }));
    const { session } = await runFixedFourEnable(fixture.homes);

    for (const [selector, home, path] of [
      ['global-claude', fixture.homes.claude, 'settings.json'],
      ['global-codex', fixture.homes.codex, 'config.toml'],
    ] as const) {
      const detail = session.fileDetail(path, selector);
      if (detail === null || !('sourceText' in detail.file)) {
        throw new Error(`expected a readable ${selector} ${path} detail`);
      }
      expect(detail.file.sourceText).toBe(readFileSync(join(home, path), 'utf8'));
    }
  });
});
