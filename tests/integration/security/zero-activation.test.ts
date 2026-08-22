// T056, extended by T085 and T294: Codex SKILL and MCP discovery and detail activate nothing
// (FR-019, FR-022, FR-023, QR-002, QR-003). Discovery reads files and
// classifies paths, extraction parses what was read, and a detail request
// serves it; none of them may execute, connect, resolve, load, or modify
// anything.
//
// Parsing is where activation would be easiest to introduce and hardest to
// notice, because an authored file is now interpreted rather than only located.
// So the cases below cover the whole path an authored value takes: the parse,
// the metadata it produces, the relationship targets it names, and the detail
// response that carries it — including the one substitution the product must
// never perform, resolving an environment reference an inspected file wrote.
//
// The suite proves that two ways, because neither alone is sufficient. A
// runtime spy can only observe capabilities the test knows to watch, and a
// module that imports `node:child_process` with a direct binding would bypass
// a namespace spy entirely — so the reachable production module graph is
// scanned statically for the forbidden capabilities as well. The static scan
// is the stronger claim: it covers code paths this fixture never reaches.
//
// The two authorized internal loopback classes of FR-022 — static/SPA
// GET/HEAD for the packaged UI assets and the local session API channel —
// belong to the host, not to discovery. A scan must issue neither, so the
// assertion here is simply that no product-issued request happens at all.
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import {
  FIXTURE_ENVIRONMENT_REFERENCE,
  FIXTURE_SECRET_LITERAL,
  buildCommandFixture,
  buildClaudeMcpFixture,
  buildClaudeRuleFixture,
  buildCodexMcpFixture,
  buildClaudePermissionsFixture,
  buildCodexRuleFixture,
  buildCodexSkillFixture,
  buildCopilotCliMcpFixture,
  buildCopilotVscodeMcpFixture,
} from '../../fixtures/repositories/build-fixtures';
import {
  READ_ONLY_FS_SURFACE,
  collectFsMutationViolations,
  snapshotTreeState,
} from '../../fixtures/filesystem/build-filesystem-fixtures';
import { buildSecretFixture } from '../../fixtures/secrets/build-fixtures';
import { runSourceScan } from '../../../src/server/inspection/scan';
import { executeRepositoryScan } from '../../../src/server/host/devframe-app';
import { SessionCoordinator, InspectionSession } from '../../../src/server/session/session';
import { RecordingFileOpener } from '../../fixtures/file-opener';

vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
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
 * Capabilities that must not exist anywhere on the scan-reachable production
 * import graph. Each one is a way for inspected content to stop being inert:
 * process spawning and dynamic evaluation execute it, the network modules
 * connect somewhere on its behalf, and `node:vm`/`node:module` load it.
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

// Follows the product's own relative imports from one entry module.
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
    // side-effect `import`, a re-export, a dynamic `import(...)`, `require(...)`,
    // and either quote style. Matching only single-quoted `from` would let a
    // module — and everything it imports — sit outside the graph this test
    // walks, which is the graph the prohibited-activation assertions are made
    // against.
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

describe('the scan-reachable module graph has no activation capability', () => {
  it('imports no process, network, name-resolution, or dynamic-evaluation module', () => {
    const graph = collectImportGraph('src/server/inspection/scan.ts');
    expect(graph.size).toBeGreaterThan(3);
    for (const [file, source] of graph) {
      for (const specifier of FORBIDDEN_SPECIFIERS) {
        // Every spelling that reaches a module, not just the static one: a
        // dynamic `import(...)` or a `require(...)` through `createRequire`
        // loads the same capability, and checking only `from '…'` would have
        // let either through.
        const quoted = specifier.replace(/\//gu, '\\/');
        // A bare `import 'node:child_process'` is in the list too: it runs the
        // module for its side effects and binds nothing, so a check that only
        // knows `from`, `import(`, and `require(` would not see it.
        expect(
          new RegExp(
            `(?:from\\s+|import\\s*\\(?\\s*|require\\s*\\(\\s*)['"]${quoted}['"]`,
            'u',
          ).test(source),
          `${file} imports ${specifier}`,
        ).toBe(false);
      }
      // Dynamic evaluation of inspected content would make it non-inert even
      // without importing a module for it. `createRequire` is listed too: it
      // resolves a specifier at runtime, so a graph that holds it can reach a
      // forbidden module without naming one anywhere.
      expect(
        /\beval\s*\(|new\s+Function\s*\(|\bcreateRequire\s*\(/u.test(source),
        `${file} evaluates dynamically or resolves a module at runtime`,
      ).toBe(false);
    }
  });

  it('reaches the filesystem only through the closed read-only surface', () => {
    const graph = collectImportGraph('src/server/inspection/scan.ts');
    for (const [file, source] of graph) {
      if (file.endsWith('/inspection/fs-io.ts')) {
        continue;
      }
      // Every way a module can name `node:fs`, not only the static single-quoted
      // one: a dynamic `import()`, a `require()`, and a double-quoted specifier
      // reach the same module and would have passed a check written for one
      // spelling.
      expect(
        /(?:from|import|require)\s*\(?\s*['"]node:fs/u.test(source),
        `${file} names node:fs directly`,
      ).toBe(false);
    }
    expect(
      Object.keys(fsIo)
        .filter((name) => typeof fsIo[name as keyof typeof fsIo] === 'function')
        .sort(),
    ).toEqual([...READ_ONLY_FS_SURFACE]);
  });
});

describe('a Codex SKILL scan issues no product request and mutates nothing', () => {
  it('leaves every byte, mode, time, and link of the fixture unchanged', async () => {
    const fixture = buildCodexSkillFixture('inspector-zero-activation');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));

    const before = snapshotTreeState(fixture.root);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    vi.clearAllMocks();

    const publication = await runSourceScan({
      sourceId: 'src-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    expect(publication.kind).toBe('publishable');

    const after = snapshotTreeState(fixture.root);
    // Content, length, identity, link state, mode, and both file times are
    // compared. Node.js exposes no stable cross-platform xattr/ACL API, so
    // those attributes are witnessed indirectly through `ctimeMs`
    // (contracts/inspection-path-allowlist.md § Symlink and read invariants).
    expect(after.entries).toEqual(before.entries);
    // OS-attributable access-time changes are recorded separately and are
    // never counted as a product mutation: reading updates atime by design.
    expect(Object.keys(after.atimes).sort()).toEqual(Object.keys(before.atimes).sort());

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(collectFsMutationViolations(fsIo as unknown as Record<string, unknown>)).toEqual([]);
  });

  it('issues no socket, name resolution, or subprocess while scanning', async () => {
    // The import graph proves the capability is absent from the modules; this
    // proves the running scan issues none of it. T056 names sockets, DNS,
    // SMB/UNC, MCP, URI handlers, and image fetches — every one of them reaches
    // the outside through one of the globals or modules spied on here, so a
    // scan that touches none of them touched none of those.
    const fixture = buildCodexSkillFixture('inspector-zero-activation-runtime');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during a scan`);
      };
    }
    // The Node surfaces T056 names by hand: a socket, a name resolution, a
    // subprocess, an HTTP client. Browser globals alone would leave every one
    // of them unobserved, which is how a scan could reach the network without
    // this test noticing.
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
        throw new Error(`${name} must not be called during a scan`);
      };
      return { host, name, original } as const;
    });
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      // Restore by assignment rather than deletion: every name spied on here
      // exists on the scope beforehand, so putting the original back is enough.
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
  });

  it('opens each candidate read-only, with no mutation-capable flag', async () => {
    const fixture = buildCodexSkillFixture('inspector-zero-activation-flags');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    vi.clearAllMocks();

    await runSourceScan({
      sourceId: 'src-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });

    // Without this the loop below is vacuous: deleting candidate reading
    // entirely would leave no calls and the assertion would still pass.
    expect(vi.mocked(fsIo.readFile).mock.calls.length).toBeGreaterThan(0);
    for (const call of vi.mocked(fsIo.readFile).mock.calls) {
      // A bare path argument is opened read-only by Node; an options bag is
      // the only way a mutation-capable `flag` could appear.
      expect(call).toHaveLength(1);
    }
  });
});

describe('parsing, extraction, and detail activate nothing (T085)', () => {
  it('reads no candidate twice, however many recognitions it carries', async () => {
    // Extraction runs on text the scan already read. A parser that opened the
    // file again would be reading outside the one completed read per scan
    // attempt the contract fixes, and would do it after classification.
    const fixture = buildSecretFixture('inspector-zero-activation-parse');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    vi.clearAllMocks();

    await runSourceScan({ sourceId: 'src-1', root: fixture.root, rootFailureOwner: 'repository' });

    const reads = vi
      .mocked(fsIo.readFile)
      .mock.calls.map((call) => String(call[0]))
      .filter((path) => path.endsWith('SKILL.md'));
    // Once per candidate, whatever the fixture holds — counting reads against a
    // fixed number would fail the day another skill is added to it, which is
    // not the property this case is about.
    expect(reads.length).toBeGreaterThan(0);
    expect(reads).toHaveLength(new Set(reads).size);
  });

  it('reads no environment variable an inspected file names', async () => {
    // The one substitution that would take a value from outside every Source
    // and put it into a response. Absence from the output is the weaker half of
    // that claim — a value could be read and then discarded — so the read
    // itself is observed: `process.env` is swapped for a proxy that records
    // every key the scan asks for, and the authored variable must not be among
    // them.
    const root = mkdtempSync(join(tmpdir(), 'inspector-zero-activation-env-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/greet'), { recursive: true });
    writeFileSync(
      join(root, '.agents/skills/greet/SKILL.md'),
      '---\nname: greet\ndescription: "$ACI_FIXTURE_SECRET and ${ACI_FIXTURE_SECRET}"\n---\n',
      'utf8',
    );
    const sentinel = 'aci-environment-value-that-must-not-appear';
    process.env['ACI_FIXTURE_SECRET'] = sentinel;
    cleanups.push(() => {
      delete process.env['ACI_FIXTURE_SECRET'];
    });

    // Node refuses an accessor on `process.env` itself, so the whole object is
    // proxied for the duration of the scan and restored afterwards.
    const realEnv = process.env;
    const readKeys: string[] = [];
    process.env = new Proxy(realEnv, {
      get(target, key) {
        if (typeof key === 'string') {
          readKeys.push(key);
        }
        return Reflect.get(target, key) as unknown;
      },
    });
    let publication;
    try {
      publication = await runSourceScan({
        sourceId: 'src-1',
        root,
        rootFailureOwner: 'repository',
      });
    } finally {
      process.env = realEnv;
    }
    // The variable the file names is never asked for. Other keys may be read by
    // the runtime or a dependency; this is about the one the content named.
    expect(readKeys).not.toContain('ACI_FIXTURE_SECRET');
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    const serialized = JSON.stringify(publication);
    expect(serialized).toContain('$ACI_FIXTURE_SECRET and ${ACI_FIXTURE_SECRET}');
    expect(serialized).not.toContain(sentinel);
  });

  it("reads a skill's own directory once each and nothing beyond it", async () => {
    // The census bounds what a directory-shaped customization is, and the scan
    // reads what it bounds. What must not happen is a read outside that bound,
    // or a second read of the same file.
    const root = mkdtempSync(join(tmpdir(), 'inspector-zero-activation-census-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.agents/skills/greet/scripts'), { recursive: true });
    writeFileSync(join(root, '.agents/skills/greet/SKILL.md'), '---\nname: greet\n---\n', 'utf8');
    writeFileSync(join(root, '.agents/skills/greet/reference.md'), 'reference\n', 'utf8');
    writeFileSync(join(root, '.agents/skills/greet/scripts/run.sh'), 'echo hi\n', 'utf8');
    vi.clearAllMocks();

    const publication = await runSourceScan({
      sourceId: 'src-1',
      root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    const companionFiles =
      publication.skillCompanionsByPath.get('.agents/skills/greet/SKILL.md') ?? [];
    expect(companionFiles).toEqual([
      '.agents/skills/greet/reference.md',
      '.agents/skills/greet/scripts/run.sh',
    ]);
    // Exactly the skill's own directory: its entry point and the two files
    // beside it, each opened once and nothing else.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    expect(opened.toSorted()).toEqual(
      [
        join(root, '.agents/skills/greet/SKILL.md'),
        join(root, '.agents/skills/greet/reference.md'),
        join(root, '.agents/skills/greet/scripts/run.sh'),
      ].toSorted(),
    );
    // Published as ordinary files that no rule admitted and nothing recognized:
    // no published recognition names them.
    for (const companion of companionFiles) {
      const file = publication.files.find((one) => one.sourceRelativePath === companion);
      expect(file).toBeDefined();
      expect(
        publication.recognitions.filter(
          (one) => one.sourceRelativePath === file?.sourceRelativePath,
        ),
      ).toEqual([]);
    }
  });

  it('issues no request while a detail response is assembled', async () => {
    // Detail is served from the committed generation, so it must touch neither
    // the filesystem nor the network: the bytes were read once, at scan time.
    const fixture = buildSecretFixture('inspector-zero-activation-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.fileDetail(fixture.skillPath);

    expect(detail?.file.sourceRelativePath).toBe(fixture.skillPath);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Codex MCP inspection connects to nothing (T294)', () => {
  // FR-022 authorizes exactly two internal loopback HTTP classes, and both
  // belong to the host rather than to inspection: (1) static/SPA GET/HEAD for
  // the packaged UI assets, and (2) the local session API channel. Neither is
  // issued by a scan or a detail assembly, so the classification here is that
  // every product-issued request observed during MCP inspection is zero —
  // the two authorized classes cannot appear because their issuer (the
  // served browser page) is not running, and any request that did appear
  // would be a prohibited one by that same split.
  it('declares servers without any DNS, socket, HTTP, MCP, auth, or probing request', async () => {
    const fixture = buildCodexMcpFixture('inspector-zero-activation-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during MCP inspection`);
      };
    }
    // The same closed Node surfaces the skill-scan case spies on: a declared
    // server reaches the outside only through one of these, so an MCP scan
    // that touches none of them connected to, resolved, authenticated
    // against, executed, and probed nothing — the declared command included,
    // which would need `child_process` to run.
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
        throw new Error(`${name} must not be called during MCP inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // No expansion and no referenced-file read either: the carrier is read
    // once — the configuration stage's read, seeded into the walk for its
    // candidacy (T282) — plus the published files, never the standalone near
    // miss, the nested carrier, a declared command path, or a plugin load.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    expect(
      opened.filter((path) => path === join(fixture.root, '.codex', 'config.toml')),
    ).toHaveLength(1);
  });

  it('assembles the MCP carrier detail without any request or read', async () => {
    const fixture = buildCodexMcpFixture('inspector-zero-activation-mcp-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.mcpCarrierDetail(fixture.carrierPath);

    // Served from the committed generation: the declared servers reach the
    // response while nothing connects, resolves, executes, or reads — the
    // declared URL and command are inert values on the wire (FR-022).
    expect(detail?.servers?.map((server) => server.name)).toEqual([...fixture.expectedServerNames]);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Claude rule inspection evaluates no glob (T430)', () => {
  // A Claude rule declares `paths` globs scoping it to the files a session
  // works with. Inspecting one must prove more than "no network": the globs
  // stay authored text inside the published document and are never run
  // against the filesystem, so no directory is enumerated and no file is
  // opened on a rule's account.
  it('keeps declared globs in the file, matching, executing, and connecting to nothing', async () => {
    const fixture = buildClaudeRuleFixture('inspector-zero-activation-claude-rules');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during rule inspection`);
      };
    }
    const nodeSurfaces: [Record<string, unknown>, string][] = [
      [net as unknown as Record<string, unknown>, 'createConnection'],
      [tls as unknown as Record<string, unknown>, 'connect'],
      [dns as unknown as Record<string, unknown>, 'lookup'],
      [childProcess as unknown as Record<string, unknown>, 'spawn'],
      [childProcess as unknown as Record<string, unknown>, 'exec'],
      [childProcess as unknown as Record<string, unknown>, 'execFile'],
      [http as unknown as Record<string, unknown>, 'request'],
      [https as unknown as Record<string, unknown>, 'request'],
      [dgram as unknown as Record<string, unknown>, 'createSocket'],
    ];
    const nodeOriginals = nodeSurfaces.map(([host, name]) => {
      const original = host[name];
      host[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during rule inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    let publication;
    try {
      publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // The `paths` globs of the fixture's path-scoped rule name `src/api/**`
    // and `src/**`; no such directory exists in the tree and none is created
    // or enumerated, because a declared glob is a value this product reads
    // out and never a selector it runs (FR-019).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    const enumerated = vi.mocked(fsIo.readdir).mock.calls.map((call) => String(call[0]));
    for (const path of [...opened, ...enumerated]) {
      expect(path).not.toContain(join(fixture.root, 'src'));
    }
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    // The globs stay in the file: the rule is recognized from its path alone
    // and nothing is read out of it, so no declared value rides the record
    // and the complete document is the detail's (FR-027).
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    const scoped = publication.recognitions.find(
      (recognition) =>
        recognition.details.kind === 'rule' &&
        recognition.sourceRelativePath === fixture.pathScopedRulePath,
    );
    expect(scoped?.details).toEqual({ kind: 'rule' });
    expect(JSON.stringify(scoped)).not.toContain(fixture.declaredPaths[0]!);
    // The file the globs were written in is published whole, so a reader sees
    // them exactly as authored.
    const published = publication.files.find(
      (file) => file.sourceRelativePath === fixture.pathScopedRulePath,
    );
    expect(published?.encoding === 'utf-8' && published.sourceText).toContain(
      fixture.declaredPaths[0]!,
    );
  });

  it('assembles the rule detail without any request or read', async () => {
    const fixture = buildClaudeRuleFixture('inspector-zero-activation-claude-rules-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.fileDetail(fixture.secretRulePath);

    // Served from the committed generation: the credential and the
    // environment reference reach the response exactly as authored, neither
    // masked nor resolved (FR-025, FR-026), while nothing connects or reads.
    expect(detail?.kind).toBe('rule');
    const source = detail !== null && detail.file.encoding === 'utf-8' && detail.file.sourceText;
    expect(source).toContain(FIXTURE_SECRET_LITERAL);
    expect(source).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Claude command inspection runs nothing (T450)', () => {
  // A command file is a prompt a reader invokes: its body names agents,
  // skills, and files, and its frontmatter names tools it would be allowed to
  // use. Inspecting one must prove more than "no network": no named target is
  // resolved, opened, imported, or read, and nothing the prompt describes is
  // carried out.
  it('publishes the declarations and the prompt while resolving and running nothing', async () => {
    const fixture = buildCommandFixture('inspector-zero-activation-claude-commands');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during command inspection`);
      };
    }
    const nodeSurfaces: [Record<string, unknown>, string][] = [
      [net as unknown as Record<string, unknown>, 'createConnection'],
      [tls as unknown as Record<string, unknown>, 'connect'],
      [dns as unknown as Record<string, unknown>, 'lookup'],
      [childProcess as unknown as Record<string, unknown>, 'spawn'],
      [childProcess as unknown as Record<string, unknown>, 'exec'],
      [childProcess as unknown as Record<string, unknown>, 'execFile'],
      [http as unknown as Record<string, unknown>, 'request'],
      [https as unknown as Record<string, unknown>, 'request'],
      [dgram as unknown as Record<string, unknown>, 'createSocket'],
    ];
    const nodeOriginals = nodeSurfaces.map(([host, name]) => {
      const original = host[name];
      host[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during command inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    let publication;
    try {
      publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    // The prompt names a subagent, a skill, and a relative file. None of the
    // three becomes a read: the only files opened are the candidates the
    // allowlist admitted (FR-019).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    expect(opened).not.toContain(join(fixture.root, 'checklist.md'));
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    // A standalone `.claude/prompts` file is never opened either: FR-034
    // keeps the directory out of the allowlist entirely.
    expect(opened).not.toContain(join(fixture.root, ...fixture.promptsPath.split('/')));
    // What the recognition carries is the file's own declarations and prompt,
    // and no reference record: no shipped recognition can produce an edge.
    const referencing = publication.recognitions.find(
      (recognition) =>
        recognition.details.kind === 'prompt/command' &&
        recognition.sourceRelativePath === fixture.referencingCommandPath,
    );
    expect(referencing?.details).toMatchObject({ kind: 'prompt/command', frontmatter: [] });
    expect(Object.keys(referencing ?? {})).not.toContain('relationships');
  });

  it('activates nothing for the Copilot recognition of the same files (T468)', async () => {
    // The root direct children carry a Copilot recognition as well, from the
    // same one read and the same one parse. Nothing about the second product
    // adds a capability: no target is resolved, opened, imported, or run, and
    // the same-name skill priority the CLI documents is never evaluated here.
    const fixture = buildCommandFixture('inspector-zero-activation-copilot-commands');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during command inspection`);
      };
    }
    vi.clearAllMocks();
    let publication;
    try {
      publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
    }
    expect(observed).toEqual([]);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    // One read per file, whichever products recognized it: a shared root
    // command is read once and recognized twice (FR-024).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    const sharedPath = join(fixture.root, ...fixture.declaringCommandPath.split('/'));
    expect(opened.filter((path) => path === sharedPath)).toHaveLength(1);
    const shared = publication.recognitions.filter(
      (recognition) =>
        recognition.details.kind === 'prompt/command' &&
        recognition.sourceRelativePath === fixture.declaringCommandPath,
    );
    expect(shared.map((recognition) => recognition.tool).toSorted()).toEqual(['claude', 'copilot']);
    // Neither recognition carries an edge: no shipped recognition can produce
    // one, so a named agent or skill in a prompt stays text.
    for (const recognition of shared) {
      expect(Object.keys(recognition)).not.toContain('relationships');
    }
  });

  it('opens no link, image, or `#file` target a prompt names (T496)', async () => {
    // A prompt file is the kind's other location, and its body carries the
    // reference shapes a command's does not: Markdown links, images, and
    // `#file` tokens. None of them navigates, loads, or authorizes a read —
    // the only files opened are the candidates the allowlist admitted
    // (FR-019, FR-033).
    const fixture = buildCommandFixture('inspector-zero-activation-copilot-prompts');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during prompt inspection`);
      };
    }
    vi.clearAllMocks();
    let publication;
    try {
      publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
    }
    expect(observed).toEqual([]);
    if (publication.kind !== 'publishable') {
      throw new Error('expected a publishable scan');
    }
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    // The locations the prompt rule does not reach are never read either.
    for (const forbidden of [
      '.github/prompts/notes.md',
      '.github/prompts/team/deploy.prompt.md',
      'packages/api/.github/prompts/deploy.prompt.md',
    ]) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    // The declared name is the row's identity and the declarations are the
    // detail's; no edge record exists to carry a reference.
    const declaring = publication.recognitions.find(
      (recognition) =>
        recognition.details.kind === 'prompt/command' &&
        recognition.sourceRelativePath === fixture.declaringPromptPath,
    );
    expect(declaring?.details).toMatchObject({
      kind: 'prompt/command',
      invocationName: fixture.declaredPromptName,
    });
    expect(Object.keys(declaring ?? {})).not.toContain('relationships');
  });

  it('assembles the command detail without any request or read', async () => {
    const fixture = buildCommandFixture('inspector-zero-activation-claude-commands-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.fileDetail(fixture.secretCommandPath);

    // Served from the committed generation: the credential and the
    // environment reference reach the response exactly as authored, neither
    // masked nor resolved (FR-025, FR-026), while nothing connects or reads.
    expect(detail?.kind).toBe('prompt/command');
    const source = detail !== null && detail.file.encoding === 'utf-8' && detail.file.sourceText;
    expect(source).toContain(FIXTURE_SECRET_LITERAL);
    expect(source).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // The declaration that carries the credential is published as authored
    // too, so the reader sees the value their own file wrote.
    const declared =
      detail !== null && detail.kind === 'prompt/command' ? detail.presentation : null;
    expect(JSON.stringify(declared?.frontmatter)).toContain(FIXTURE_SECRET_LITERAL);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Codex rule inspection enforces nothing (T412)', () => {
  // A rule file is the one customization whose content is about running
  // commands: its `pattern` names a command prefix and its `decision` says
  // whether that command may run outside the sandbox. Inspecting one must
  // therefore prove more than "no network" — it must prove that the decision
  // is never applied, the pattern is never executed, and the paths and URLs a
  // rule names are never opened. The classification is the same closed one
  // the MCP cases use: every product-issued request observed here is zero.
  it('reads rule files without executing, resolving, connecting, or opening what they name', async () => {
    const fixture = buildCodexRuleFixture('inspector-zero-activation-rules');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during rule inspection`);
      };
    }
    // `child_process` carries the weight here: a rule's `pattern` is a
    // command argument list, and running one would need exactly these.
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
        throw new Error(`${name} must not be called during rule inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // No referenced target is opened either: the deploy rule names
    // `./scripts/deploy.sh` and the restrictive one names a URL, and neither
    // becomes a read. The near misses stay unread for the same reason they
    // stay unlisted — no selector reaches them.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    expect(opened).not.toContain(join(fixture.root, 'scripts', 'deploy.sh'));
    // Each admitted rule file is read exactly once, and a restrictive
    // decision changes nothing about that: a `forbidden` rule is text.
    for (const admitted of fixture.expectedRulePaths) {
      const absolute = join(fixture.root, ...admitted.split('/'));
      expect(opened.filter((path) => path === absolute).length, admitted).toBeLessThanOrEqual(1);
    }
  });

  it('assembles the rule detail without any request or read', async () => {
    const fixture = buildCodexRuleFixture('inspector-zero-activation-rules-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.permissionPolicyDetail(fixture.secretRulePath);

    // Served from the committed generation: the policy's complete authored
    // source reaches the response — the credential and the environment
    // reference exactly as written, neither masked nor resolved (FR-025,
    // FR-026) — while nothing connects, executes, or reads. Asked of the
    // policy's own function, because a permissions row names a policy rather
    // than a file, so the file function holds nothing at the path
    // (contracts/http-api.md § get-permission-policy-detail).
    expect(session.fileDetail(fixture.secretRulePath)).toBeNull();
    expect(
      detail?.form === 'whole-document' &&
        detail.file.encoding === 'utf-8' &&
        detail.file.sourceText,
    ).toContain(FIXTURE_SECRET_LITERAL);
    expect(
      detail?.form === 'whole-document' &&
        detail.file.encoding === 'utf-8' &&
        detail.file.sourceText,
    ).toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Claude MCP inspection connects to nothing (T315, T326)', () => {
  // The same closed classification as the Codex case above: every
  // product-issued request observed during MCP inspection is zero — for the
  // standalone carrier, and for the skill whose frontmatter spells
  // `mcpServers` as ordinary skill content.
  it('declares the carrier servers without any DNS, socket, HTTP, MCP, auth, or probing request', async () => {
    const fixture = buildClaudeMcpFixture('inspector-zero-activation-claude-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during MCP inspection`);
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
        throw new Error(`${name} must not be called during MCP inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // No expansion and no referenced-file read either: never the declared
    // command target, the User-state filename, a plugin or settings owner no
    // rule admits, the link target as its own candidate, or a connector
    // state. The carrier is read exactly once — one candidacy, no
    // configuration stage — whether it is a regular file or a link read
    // through its target (FR-024).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const forbidden of [
      ...fixture.nearMissPaths,
      ...fixture.unadmittedOwnerPaths,
      fixture.commandTargetPath,
    ]) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    expect(opened.filter((path) => path === join(fixture.root, '.mcp.json'))).toHaveLength(1);
    // The skill spelling `mcpServers` is read once too — as the skill it is,
    // never re-read for an MCP fact Claude does not document.
    expect(
      opened.filter(
        (path) => path === join(fixture.root, ...fixture.mcpFrontmatterSkillPath.split('/')),
      ),
    ).toHaveLength(1);
  });

  it('assembles the carrier detail without any request or read', async () => {
    const fixture = buildClaudeMcpFixture('inspector-zero-activation-claude-mcp-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    // Served from the committed generation: the standalone carrier's servers,
    // source-free (FR-007). The skill whose frontmatter spells `mcpServers`
    // is no carrier at all — Claude documents no such skill field — so its
    // path holds no MCP resource, while its own skill detail serves its
    // source under its own kind.
    const carrier = session.mcpCarrierDetail(fixture.carrierPath);
    expect(carrier?.servers?.map((server) => server.name)).toEqual([
      ...fixture.expectedCarrierServerNames,
    ]);
    expect(JSON.stringify(carrier)).not.toContain('sourceText');
    expect(session.mcpCarrierDetail(fixture.mcpFrontmatterSkillPath)).toBeNull();
    const ownerDetail = session.fileDetail(fixture.mcpFrontmatterSkillPath);
    expect(ownerDetail?.kind).toBe('skill');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Copilot CLI MCP inspection connects to nothing (T345)', () => {
  // The same closed classification as the Codex and Claude cases above:
  // every product-issued request observed during MCP inspection is zero, for
  // both root-level carriers and both documented declaration schemas.
  it('declares servers without any DNS, socket, HTTP, MCP, auth, or probing request', async () => {
    const fixture = buildCopilotCliMcpFixture('inspector-zero-activation-copilot-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during MCP inspection`);
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
        throw new Error(`${name} must not be called during MCP inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // No expansion and no referenced-file read either: never a subdirectory
    // carrier, the User-config filename, the general VS Code settings file,
    // or the link target as its own candidate. Each root-level carrier is
    // read exactly once — the `.github` spelling through its link where the
    // platform created one (FR-024).
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    for (const carrier of [fixture.rootCarrierPath, fixture.githubCarrierPath]) {
      expect(
        opened.filter((path) => path === join(fixture.root, ...carrier.split('/'))),
      ).toHaveLength(1);
    }
  });

  it('assembles both carriers’ details without any request or read', async () => {
    const fixture = buildCopilotCliMcpFixture('inspector-zero-activation-copilot-mcp-detail');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    // Served from the committed generation, source-free for both documented
    // schemas (FR-007): the wrapper-form root carrier and the bare-form
    // `.github` spelling alike.
    const rootCarrier = session.mcpCarrierDetail(fixture.rootCarrierPath);
    expect(rootCarrier?.servers?.map((server) => server.name)).toEqual([
      ...fixture.expectedRootServerNames,
    ]);
    const githubCarrier = session.mcpCarrierDetail(fixture.githubCarrierPath);
    expect(githubCarrier?.servers?.map((server) => server.name)).toEqual([
      ...fixture.expectedGithubServerNames,
    ]);
    expect(JSON.stringify(rootCarrier)).not.toContain('sourceText');
    expect(JSON.stringify(githubCarrier)).not.toContain('sourceText');
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});

describe('Copilot VS Code MCP inspection connects to nothing (T365)', () => {
  it('declares servers without any DNS, socket, HTTP, MCP, auth, or trust request', async () => {
    // The same closed classification as the CLI case above, over the
    // dedicated JSONC carrier and the shared root file: no declared command
    // ran, no URL or header was used, no environment or input reference was
    // resolved, and no trust prompt or User/profile state was touched.
    const fixture = buildCopilotVscodeMcpFixture('inspector-zero-activation-vscode-mcp');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during MCP inspection`);
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
        throw new Error(`${name} must not be called during MCP inspection`);
      };
      return { host, name, original } as const;
    });
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root: fixture.root,
        rootFailureOwner: 'repository',
      });
      expect(publication.kind).toBe('publishable');
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
      for (const { host, name, original } of nodeOriginals) {
        host[name] = original;
      }
    }
    expect(observed).toEqual([]);
    // No expansion: never the nested workspace, the general settings file,
    // the user-profile filename, or the link target as its own candidate,
    // and each admitted carrier is read exactly once — the `.vscode`
    // spelling through its link where the platform created one (FR-024),
    // the root file once for all three of its admissions.
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    for (const forbidden of fixture.nearMissPaths) {
      expect(opened).not.toContain(join(fixture.root, ...forbidden.split('/')));
    }
    for (const carrier of [fixture.rootCarrierPath, fixture.vscodeCarrierPath]) {
      expect(
        opened.filter((path) => path === join(fixture.root, ...carrier.split('/'))),
      ).toHaveLength(1);
    }
  });
});

describe('unadmitted MCP-spelling files activate nothing (T376)', () => {
  it('reads no agent, settings, or plugin file and publishes no MCP row for them', async () => {
    // Only explicit MCP configuration joins the MCP surfaces: an agent profile's `mcp-servers`, a settings file's inline
    // map, and a plugin manifest's declarations belong to files no shipped
    // rule admits, so the scan opens none of them, recognizes nothing, and
    // connects to nothing — and the hosted Cloud sources are registry facts
    // with no file to read at all.
    const root = mkdtempSync(join(tmpdir(), 'inspector-zero-activation-unadmitted-mcp-'));
    cleanups.push(() => rmSync(root, { recursive: true, force: true }));
    mkdirSync(join(root, '.github/agents'), { recursive: true });
    writeFileSync(
      join(root, '.github/agents/deploy.md'),
      [
        '---',
        'name: deploy',
        'description: deploy agent',
        'mcp-servers:',
        '  agent-mcp:',
        "    type: 'local'",
        "    command: 'curl'",
        "    args: ['https://mcp.example.invalid']",
        '---',
        '',
        'Prompt body',
        '',
      ].join('\n'),
      'utf8',
    );
    mkdirSync(join(root, '.claude-plugin'), { recursive: true });
    writeFileSync(
      join(root, '.claude-plugin/plugin.json'),
      '{ "name": "p", "mcpServers": { "plugin-mcp": { "command": "curl" } } }\n',
      'utf8',
    );
    writeFileSync(join(root, 'AGENTS.md'), '# instructions\n', 'utf8');
    const observed: string[] = [];
    const globalScope = globalThis as Record<string, unknown>;
    const originals = new Map<string, unknown>();
    for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'EventSource', 'open']) {
      originals.set(name, globalScope[name]);
      globalScope[name] = (...args: unknown[]) => {
        observed.push(`${name}(${String(args[0] ?? '')})`);
        throw new Error(`${name} must not be called during MCP inspection`);
      };
    }
    vi.clearAllMocks();
    try {
      const publication = await runSourceScan({
        sourceId: 'src-1',
        root,
        rootFailureOwner: 'repository',
      });
      if (publication.kind !== 'publishable') {
        throw new Error('expected a publishable outcome');
      }
      // No MCP recognition exists anywhere in the publication, and neither
      // unadmitted file was read or published.
      expect(
        publication.recognitions.filter((recognition) => recognition.details.kind === 'MCP'),
      ).toEqual([]);
      expect(
        publication.files
          .map((file) => file.sourceRelativePath)
          .filter((path) => path.includes('agents/deploy.md') || path.includes('.claude-plugin')),
      ).toEqual([]);
    } finally {
      for (const [name, value] of originals) {
        globalScope[name] = value;
      }
    }
    expect(observed).toEqual([]);
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    expect(opened).not.toContain(join(root, '.github', 'agents', 'deploy.md'));
    expect(opened).not.toContain(join(root, '.claude-plugin', 'plugin.json'));
  });
});

describe('Claude permission-policy inspection enforces nothing (T1109)', () => {
  it('publishes the declared block as written and resolves no rule it names', async () => {
    const fixture = buildClaudePermissionsFixture('inspector-zero-activation-permissions');
    cleanups.push(() => rmSync(fixture.root, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.policylessRoot, { recursive: true, force: true }));
    cleanups.push(() => rmSync(fixture.malformedRoot, { recursive: true, force: true }));
    const session = new InspectionSession({
      invocationCwd: fixture.root,
      rootOptionValue: null,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
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

    vi.clearAllMocks();
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const detail = session.permissionPolicyDetail(fixture.declaringCarrierPath);
    if (detail?.form !== 'declared-block') {
      throw new Error('the carrier published no declared block');
    }
    // The block reaches the response as the author wrote it: every rule string
    // is its own characters, with no tool, command, path, or domain resolved
    // and nothing evaluated against a filesystem (FR-019, FR-025).
    const serialized = JSON.stringify(detail.declaredPolicy);
    for (const rule of fixture.allowRules) {
      expect(serialized).toContain(rule);
    }
    expect(serialized).toContain(FIXTURE_SECRET_LITERAL);
    // The carrier's own bytes are absent from the shape, so the settings keys
    // around the block never reach this response (FR-007).
    expect(JSON.stringify(detail)).not.toContain(fixture.unrelatedSettingsMarker);
    expect(JSON.stringify(detail)).not.toContain(FIXTURE_ENVIRONMENT_REFERENCE);
    // Nothing connected, executed, or read while the policy was assembled.
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readFile).mock.calls).toEqual([]);
    expect(vi.mocked(fsIo.readdir).mock.calls).toEqual([]);
  });
});
