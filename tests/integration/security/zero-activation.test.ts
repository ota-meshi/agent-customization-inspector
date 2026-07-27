// T056: Codex SKILL discovery activates nothing (FR-019, FR-022, FR-023,
// QR-002, QR-003). Discovery reads files and classifies paths; it must not
// execute, connect, resolve, load, or modify anything.
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
import { readFileSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import childProcess from 'node:child_process';
import dgram from 'node:dgram';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import { afterEach, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import { buildCodexSkillFixture } from '../../fixtures/repositories/build-fixtures';
import {
  READ_ONLY_FS_SURFACE,
  collectFsMutationViolations,
  snapshotTreeState,
} from '../../fixtures/filesystem/build-filesystem-fixtures';
import { runSourceScan } from '../../../src/server/inspection/scan';

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
    for (const match of source.matchAll(
      /(?:from|import|require)\s*\(?\s*['"](\.[^'"]+)['"]/gu,
    )) {
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
      expect(/from\s+'node:fs/u.test(source), `${file} imports node:fs directly`).toBe(false);
    }
    expect(Object.keys(fsIo).filter((name) => typeof fsIo[name as keyof typeof fsIo] === 'function').sort()).toEqual(
      [...READ_ONLY_FS_SURFACE],
    );
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
