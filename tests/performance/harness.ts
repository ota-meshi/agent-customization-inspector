// T183: the reusable SC-002 harness — the deterministic 100,000-entry/500-file
// reference fixture, the versioned fixture-manifest and profile validators,
// the rendered-page session the smoke passes measure on, and the RPC bridge
// that reads back the opaque session identifiers a run record needs
// (plan.md § Performance Goals; quickstart.md § Performance smoke pass).
//
// The checked-in manifest freezes the fixture: `expectedSc002Entries` expands
// the manifest's own declarative rules into the complete entry inventory, the
// walk recomputes every content digest from the built tree, and the two must
// agree exactly — so a builder change, a stray file, or a mutated byte
// invalidates the run instead of silently measuring a different repository.
// The canonical listing digest binds that expansion as one value the profile
// can reference.
//
// This harness performs measurement plumbing only: the fixture, the profile
// binding, one measured run, and that run's integrity checks. No threshold is
// asserted over its figures (spec.md § Clarifications, Session 2026-09-01) —
// the performance project's global setup runs one non-gating smoke pass over
// the rendered surfaces, and both suites assert against that single run.
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import type { Browser, Page } from 'playwright';

// The closed label tables the page renders scan state from. The qualifying
// predicate reads individual members of these tables — the scanning source
// status, the terminal phase label — rather than keeping a copy of its own:
// the tables are the one place each wording lives (AGENTS.md: publish one
// fact), and the predicate's independence comes from how it combines them,
// not from a second copy.
import { SCAN_PROGRESS_PHASE_TEXT } from '../../src/shared/api-text';
import { SOURCE_STATUS_STANDALONE_TEXT } from '../../src/shared/entities';

/** The one authored content of every matching `SKILL.md` in the fixture. */
export const SC002_SKILL_CONTENT = '# Performance skill\n\nDeterministic SC-002 fixture content.\n';

/** The one authored content of every non-matching filler file. */
export const SC002_FILLER_CONTENT = 'SC-002 filler entry.\n';

/** Absolute path of the checked-in fixture manifest. */
export const SC002_MANIFEST_PATH = fileURLToPath(
  new URL('./sc002-fixture-manifest.json', import.meta.url),
);

/** Absolute path of the manifest's canonical SHA-256 companion. */
export const SC002_MANIFEST_DIGEST_PATH = fileURLToPath(
  new URL('./sc002-fixture-manifest.sha256', import.meta.url),
);

/** Absolute path of the checked-in reference-environment profile. */
export const SC002_PROFILE_PATH = fileURLToPath(
  new URL('./sc002-reference-profile.json', import.meta.url),
);

/**
 * The checked-in SC-002 fixture manifest (plan.md § Performance Goals). The
 * declarative rules below expand deterministically into every generated
 * entry, so the manifest fixes the complete tree while staying reviewable:
 * each content-bearing file's digest is one of the two content digests, and
 * `canonicalEntryListingSha256` binds the full expansion as one value.
 */
export interface Sc002Manifest {
  /** Manifest schema/denominator version; a semantic change increments it. */
  readonly manifestVersion: number;
  /** Total directory-plus-file entries the fixture holds below its root. */
  readonly totalEntries: number;
  /** How many `SKILL.md` candidates the shipped selectors admit. */
  readonly matchingFiles: number;
  /** Skill directory name prefix; directory `i` is `<prefix><i>`. */
  readonly skillDirectoryPrefix: string;
  /** SHA-256 of {@link SC002_SKILL_CONTENT}, the one skill-file content. */
  readonly skillContentSha256: string;
  /** How many filler directories sit under `filler/`. */
  readonly fillerDirectoryCount: number;
  /** How many filler files exist; file `k` lives in `dir-<k % dirCount>`. */
  readonly fillerFileCount: number;
  /** SHA-256 of {@link SC002_FILLER_CONTENT}, the one filler-file content. */
  readonly fillerContentSha256: string;
  /** SHA-256 over the canonical sorted entry listing; see {@link canonicalListingSha256}. */
  readonly canonicalEntryListingSha256: string;
}

/**
 * The kind of one fixture entry under lstat semantics. Nothing else may
 * exist in the fixture; the walk rejects any other kind.
 */
export type Sc002EntryKind =
  /** A directory entry the walk descends into. */
  | 'directory'
  /** A regular file whose exact bytes are digested. */
  | 'file';

/** One expanded fixture entry: its kind and, for a file, its content digest. */
export interface Sc002Entry {
  /** The entry's kind, as the walk must observe it. */
  readonly kind: Sc002EntryKind;
  /** Lowercase SHA-256 of the file's exact bytes; null for a directory. */
  readonly sha256: string | null;
}

/** Lowercase hex SHA-256 of the given bytes. */
export function sha256Hex(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * Reads and verifies the checked-in manifest pair: the companion `.sha256`
 * must match the manifest bytes exactly, and the schema must be the one
 * version this harness interprets. Returns the parsed manifest with the
 * canonical digest of its own bytes, which is what the profile binds.
 */
export function loadSc002Manifest(): { manifest: Sc002Manifest; manifestSha256: string } {
  const bytes = readFileSync(SC002_MANIFEST_PATH);
  const recorded = readFileSync(SC002_MANIFEST_DIGEST_PATH, 'utf8').trim();
  const actual = sha256Hex(bytes);
  if (recorded !== actual) {
    throw new Error(
      `the SC-002 manifest bytes do not match their canonical digest: recorded ${recorded}, actual ${actual}`,
    );
  }
  const manifest = JSON.parse(bytes.toString('utf8')) as Sc002Manifest;
  if (manifest.manifestVersion !== 1) {
    throw new Error(`unknown SC-002 manifest version ${manifest.manifestVersion}`);
  }
  if (sha256Hex(SC002_SKILL_CONTENT) !== manifest.skillContentSha256) {
    throw new Error('the harness skill content no longer matches the frozen manifest digest');
  }
  if (sha256Hex(SC002_FILLER_CONTENT) !== manifest.fillerContentSha256) {
    throw new Error('the harness filler content no longer matches the frozen manifest digest');
  }
  return { manifest, manifestSha256: actual };
}

/**
 * Expands the manifest's declarative rules into the complete entry inventory,
 * keyed by fixture-relative POSIX path. This expansion reads only the
 * manifest, never the builder, so the walk-versus-expansion comparison can
 * catch a builder that drifted from the frozen declaration.
 */
export function expectedSc002Entries(manifest: Sc002Manifest): Map<string, Sc002Entry> {
  const entries = new Map<string, Sc002Entry>();
  const directory = (path: string): void => {
    entries.set(path, { kind: 'directory', sha256: null });
  };
  const file = (path: string, sha256: string): void => {
    entries.set(path, { kind: 'file', sha256 });
  };
  directory('.agents');
  directory('.agents/skills');
  for (let index = 0; index < manifest.matchingFiles; index += 1) {
    const skillDirectory = `.agents/skills/${manifest.skillDirectoryPrefix}${index}`;
    directory(skillDirectory);
    file(`${skillDirectory}/SKILL.md`, manifest.skillContentSha256);
  }
  directory('filler');
  for (let index = 0; index < manifest.fillerDirectoryCount; index += 1) {
    directory(`filler/dir-${index}`);
  }
  for (let index = 0; index < manifest.fillerFileCount; index += 1) {
    file(
      `filler/dir-${index % manifest.fillerDirectoryCount}/file-${index}.txt`,
      manifest.fillerContentSha256,
    );
  }
  if (entries.size !== manifest.totalEntries) {
    throw new Error(
      `the manifest rules expand to ${entries.size} entries, not the declared ${manifest.totalEntries}`,
    );
  }
  return entries;
}

/**
 * The canonical digest over one entry inventory: the sorted
 * `<path>\t<kind>\t<sha256|->` lines joined by `\n`, hashed once. Both the
 * manifest expansion and the walked tree are digested through this same
 * function, so equality of the two digests is equality of the inventories.
 */
export function canonicalListingSha256(entries: ReadonlyMap<string, Sc002Entry>): string {
  const lines = [...entries.entries()]
    .map(([path, entry]) => `${path}\t${entry.kind}\t${entry.sha256 ?? '-'}`)
    .sort();
  return sha256Hex(lines.join('\n'));
}

// Runs asynchronous jobs over an index range with bounded concurrency. The
// fixture writes and digest reads are ~100k tiny operations each; sequential
// awaiting would dominate the suite's wall clock with syscall latency.
async function forEachIndex(
  count: number,
  concurrency: number,
  job: (index: number) => Promise<void>,
): Promise<void> {
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (cursor < count) {
      const index = cursor;
      cursor += 1;
      await job(index);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, count) }, worker));
}

/**
 * Builds the reference fixture under a fresh OS-temporary root and returns
 * that root. Construction is outside both SC-002 timers; the tree is exactly
 * the manifest expansion, which {@link validateSc002Fixture} then proves.
 */
export async function buildSc002Fixture(manifest: Sc002Manifest): Promise<string> {
  const root = mkdtempSync(join(tmpdir(), 'inspector-sc002-'));
  try {
    mkdirSync(join(root, '.agents/skills'), { recursive: true });
    for (let index = 0; index < manifest.matchingFiles; index += 1) {
      mkdirSync(join(root, '.agents/skills', `${manifest.skillDirectoryPrefix}${index}`));
    }
    mkdirSync(join(root, 'filler'));
    for (let index = 0; index < manifest.fillerDirectoryCount; index += 1) {
      mkdirSync(join(root, 'filler', `dir-${index}`));
    }
    await forEachIndex(manifest.matchingFiles, 128, (index) =>
      writeFile(
        join(root, '.agents/skills', `${manifest.skillDirectoryPrefix}${index}`, 'SKILL.md'),
        SC002_SKILL_CONTENT,
        'utf8',
      ),
    );
    await forEachIndex(manifest.fillerFileCount, 128, (index) =>
      writeFile(
        join(root, 'filler', `dir-${index % manifest.fillerDirectoryCount}`, `file-${index}.txt`),
        SC002_FILLER_CONTENT,
        'utf8',
      ),
    );
  } catch (cause) {
    // A build that fails midway must not strand a partial hundred-thousand
    // entry tree in the OS temporary directory for the caller to guess at.
    rmSync(root, { recursive: true, force: true });
    throw cause;
  }
  return root;
}

/**
 * Walks the built tree and recomputes every entry and content digest, then
 * compares the observed inventory — membership, kinds, digests, and the
 * canonical listing digest — against the manifest expansion. A missing entry,
 * an extra entry, or any mismatch throws, which invalidates the run
 * (plan.md § Performance Goals: the validator runs before and after).
 */
export async function validateSc002Fixture(root: string, manifest: Sc002Manifest): Promise<void> {
  const expected = expectedSc002Entries(manifest);
  const observedDirectories: string[] = [];
  const observedFiles: string[] = [];
  const walk = async (relative: string): Promise<void> => {
    const names = await readdir(join(root, relative), { withFileTypes: true });
    await Promise.all(
      names.map(async (entry) => {
        const path = relative === '' ? entry.name : `${relative}/${entry.name}`;
        if (entry.isDirectory()) {
          observedDirectories.push(path);
          await walk(path);
        } else if (entry.isFile()) {
          observedFiles.push(path);
        } else {
          // A symbolic link to the same bytes would digest identically
          // through `readFile`, so entry kind is checked here, on the
          // lstat-semantics dirent, rather than inferred from a readable
          // content digest: the manifest declares regular files only.
          throw new Error(`fixture entry is not a regular file or directory: ${path}`);
        }
      }),
    );
  };
  await walk('');
  const observed = new Map<string, Sc002Entry>();
  for (const path of observedDirectories) {
    observed.set(path, { kind: 'directory', sha256: null });
  }
  await forEachIndex(observedFiles.length, 128, async (index) => {
    const path = observedFiles[index]!;
    const digest = sha256Hex(await readFile(join(root, path)));
    observed.set(path, { kind: 'file', sha256: digest });
  });
  if (observed.size !== expected.size) {
    throw new Error(
      `the built fixture holds ${observed.size} entries, not the manifest's ${expected.size}`,
    );
  }
  for (const [path, entry] of expected) {
    const seen = observed.get(path);
    if (seen === undefined || seen.kind !== entry.kind || seen.sha256 !== entry.sha256) {
      throw new Error(`fixture entry drifted from the manifest: ${path}`);
    }
  }
  const canonical = canonicalListingSha256(observed);
  if (canonical !== manifest.canonicalEntryListingSha256) {
    throw new Error(
      `the walked canonical listing digest ${canonical} does not match the manifest's ${manifest.canonicalEntryListingSha256}`,
    );
  }
}

/**
 * The checked-in SC-002 smoke-reference profile: it binds the fixture
 * manifest for the one non-gating pass and declares the environment class
 * that pass runs in. No measurement set or threshold is published under it
 * (spec.md § Clarifications, Session 2026-09-01).
 */
export interface Sc002Profile {
  /** Stable profile identity; any field change requires a new one. */
  readonly profileId: string;
  /** Profile schema version this harness interprets. */
  readonly profileVersion: number;
  /** Operating-system image and version, as the smoke reference declares them. */
  readonly operatingSystem: {
    /** Runner/OS image name of the smoke reference. */
    readonly image: string;
    /** Operating-system release the image carries. */
    readonly version: string;
  };
  /** Processor architecture, model class, and logical count of the smoke reference. */
  readonly processor: {
    /** Instruction-set architecture, e.g. `x86_64`. */
    readonly architecture: string;
    /** Processor model class as far as the reference can pin it. */
    readonly model: string;
    /** Logical processor count the reference provisions. */
    readonly logicalProcessors: number;
  };
  /** Reference memory size in GiB. */
  readonly memoryGiB: number;
  /** Storage medium and filesystem. */
  readonly storage: {
    /** Storage medium class backing the fixture and the host. */
    readonly medium: string;
    /** Filesystem the fixture tree is built on. */
    readonly filesystem: string;
  };
  /** Application-runtime name and version the smoke reference declares. */
  readonly runtime: {
    /** Runtime name, `node` for this product. */
    readonly name: string;
    /** Exact runtime version the reference runs. */
    readonly version: string;
  };
  /**
   * Benchmark command, its standardized observation configuration, and the
   * profile's own scope note — which states that no measurement set or
   * threshold is published under this smoke profile.
   */
  readonly benchmark: {
    /** The command that executes the pass. */
    readonly command: string;
    /** The standardized smoke-pass and interaction configuration prose. */
    readonly configuration: string;
    /** The profile's own scope statement; see the field's outer doc. */
    readonly notes: string;
  };
  /** The fixture manifest this profile binds, by version and canonical digest. */
  readonly fixtureManifest: {
    /** The bound manifest's schema/denominator version. */
    readonly manifestVersion: number;
    /** Lowercase SHA-256 of the bound manifest's exact bytes. */
    readonly canonicalSha256: string;
  };
}

/** The primitive validation a required profile field must satisfy. */
type ProfileFieldType =
  /** The value must be a non-empty string. */
  | 'string'
  /** The value must be a finite number. */
  | 'number';

// One required profile field, spelled as the path the error names and the
// validation the value must satisfy.
function requireProfileField(
  profile: Record<string, unknown>,
  path: string,
  type: ProfileFieldType,
): void {
  let value: unknown = profile;
  for (const segment of path.split('.')) {
    value = (value as Record<string, unknown> | undefined)?.[segment];
  }
  const valid =
    type === 'string'
      ? typeof value === 'string' && value.length > 0
      : typeof value === 'number' && Number.isFinite(value);
  if (!valid) {
    throw new Error(`the SC-002 profile is missing or mistypes required field ${path}`);
  }
}

/**
 * Reads and verifies the checked-in profile: the schema version, the presence
 * and type of every declared environment field, and the binding to the
 * manifest actually checked in. A profile naming a different manifest version
 * or digest would report observations for a fixture nobody can rebuild.
 */
export function loadSc002Profile(manifest: Sc002Manifest, manifestSha256: string): Sc002Profile {
  const raw = JSON.parse(readFileSync(SC002_PROFILE_PATH, 'utf8')) as Record<string, unknown>;
  requireProfileField(raw, 'profileId', 'string');
  requireProfileField(raw, 'profileVersion', 'number');
  requireProfileField(raw, 'operatingSystem.image', 'string');
  requireProfileField(raw, 'operatingSystem.version', 'string');
  requireProfileField(raw, 'processor.architecture', 'string');
  requireProfileField(raw, 'processor.model', 'string');
  requireProfileField(raw, 'processor.logicalProcessors', 'number');
  requireProfileField(raw, 'memoryGiB', 'number');
  requireProfileField(raw, 'storage.medium', 'string');
  requireProfileField(raw, 'storage.filesystem', 'string');
  requireProfileField(raw, 'runtime.name', 'string');
  requireProfileField(raw, 'runtime.version', 'string');
  requireProfileField(raw, 'benchmark.command', 'string');
  requireProfileField(raw, 'benchmark.configuration', 'string');
  requireProfileField(raw, 'benchmark.notes', 'string');
  requireProfileField(raw, 'fixtureManifest.manifestVersion', 'number');
  requireProfileField(raw, 'fixtureManifest.canonicalSha256', 'string');
  const profile = raw as unknown as Sc002Profile;
  if (profile.profileVersion !== 1) {
    throw new Error(`unknown SC-002 profile version ${profile.profileVersion}`);
  }
  if (profile.fixtureManifest.manifestVersion !== manifest.manifestVersion) {
    throw new Error('the profile binds a different manifest version than the checked-in one');
  }
  if (profile.fixtureManifest.canonicalSha256 !== manifestSha256) {
    throw new Error('the profile binds a different manifest digest than the checked-in bytes');
  }
  return profile;
}

/** One rendered browser session over a launched host. */
export interface Sc002BrowserSession {
  /** The launched Chromium instance; the owner closes it. */
  readonly browser: Browser;
  /** The one open page on the served inventory. */
  readonly page: Page;
}

/**
 * Launches the automated-baseline Chromium, opens the served status page, and
 * waits until the automatic initial Repository scan has reached a terminal
 * state.
 * That is the whole condition spec.md § SC-002 places before the dispatch —
 * "wait until that new process's automatic initial Repository scan reaches a
 * terminal state, then the browser MUST submit exactly one explicit
 * Repository rescan" — with no requirement on the outcome, so demanding the
 * complete inventory here would add a precondition the protocol does not
 * have and deadlock a run whose automatic scan failed or committed partial.
 * Nothing on the page updates by itself, so the wait drives the page's own
 * "Refresh status" control — exactly what a user observing a running scan
 * does. Everything here is outside both SC-002 timers (plan.md § Performance
 * Goals: the automatic initial scan is excluded).
 */
export async function openSettledInventory(
  origin: string,
  onPage?: (page: Page) => void,
): Promise<Sc002BrowserSession> {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    // Before the navigation, so a listener the caller attaches — the
    // admission-frame capture — sees the WebSocket the page opens on load.
    onPage?.(page);
    // The status page rather than the inventory: the source status, the
    // committed generation, the correlated progress row, and the two commands
    // that drive them are `ScanProgress.vue`'s, and that panel is rendered by
    // the `/repository` route (`pages/repository.vue`). The inventory the
    // second timer gates on is reached from there through the page's own way
    // back, exactly as a reader watching a scan reaches it.
    await page.goto(new URL('/repository', origin).href);
    // The terminal labels come from the canonical table, never a copy: a
    // reviewed wording change that updates the seal must not strand this
    // wait — which runs before the seal check — on a stale spelling.
    await page.waitForFunction(
      (terminalLabels) => {
        const textOf = (element: Element | null | undefined): string =>
          (element?.textContent ?? '').trim();
        const statusHeader = [...document.querySelectorAll('dt')].find(
          (candidate) => textOf(candidate) === 'Source status',
        );
        const settled = terminalLabels.includes(textOf(statusHeader?.nextElementSibling));
        if (!settled) {
          [...document.querySelectorAll('button')]
            .find((candidate) => textOf(candidate) === 'Refresh status')
            ?.click();
        }
        return settled;
      },
      // Two labels, not three: `ready` and `partial` are one word, because one
      // table states a Source's status wherever it is shown.
      [SOURCE_STATUS_STANDALONE_TEXT.ready.word, SOURCE_STATUS_STANDALONE_TEXT.failed.word],
      { polling: 250, timeout: 120_000 },
    );
    return { browser, page };
  } catch (cause) {
    // A navigation or settle failure must not strand the launched browser;
    // the caller only owns what this function actually returned.
    await browser.close();
    throw cause;
  }
}

/** The opaque session identifiers a run record needs; see {@link readBackSessionIdentifiers}. */
export interface Sc002SessionIdentifiers {
  /** The Repository generation the host holds committed. */
  readonly repositoryGeneration: number;
  /** The scan request ID the committed Repository Source carries. */
  readonly scanRequestId: string | null;
  /** The request ID the Source's retained progress record carries. */
  readonly progressScanRequestId: string | null;
  /** The retained progress record's phase. */
  readonly progressPhase: string | null;
}

/**
 * Reads the committed generation and its scan request ID back over the
 * devframe RPC channel — the one thing the record needs that the page
 * deliberately never spells out as copy. The read runs in a short-lived child
 * process on purpose: the devframe client exposes no close for its WebSocket
 * and reconnection machinery, so a connection opened in this process — the
 * runner's own for a `globalSetup` pass — would keep it from exiting after
 * the suites finish. The child exits, and its socket dies with it.
 */
export async function readBackSessionIdentifiers(origin: string): Promise<Sc002SessionIdentifiers> {
  const script = [
    // The client resolves its WebSocket URL against `globalThis.location`,
    // which Node does not define.
    'globalThis.location = new URL(`${process.env.SC002_ORIGIN}/`);',
    "const { connectDevframe } = await import('devframe/client');",
    'const rpc = await connectDevframe({ simpleAuth: false, baseURL: process.env.SC002_ORIGIN });',
    "const session = await rpc.call('agent-customization-inspector:get-session');",
    // The exit waits for the write to flush: `stdout` is a pipe here, so an
    // unconditional `process.exit(0)` could truncate the JSON mid-write and
    // fail a perfectly good run at the parse.
    'process.stdout.write(',
    '  JSON.stringify({',
    '    repositoryGeneration: session.repositoryGeneration,',
    '    scanRequestId: session.data.sources[0].scanRequestId,',
    '    progressScanRequestId: session.data.sources[0].progress?.scanRequestId ?? null,',
    '    progressPhase: session.data.sources[0].progress?.phase ?? null,',
    '  }),',
    '  () => process.exit(0),',
    ');',
  ].join('\n');
  const { execFile } = await import('node:child_process');
  const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url));
  const stdout = await new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ['--input-type=module', '-e', script],
      {
        cwd: repositoryRoot,
        env: { ...process.env, SC002_ORIGIN: origin },
        timeout: 60_000,
      },
      (error, out, stderr) => {
        if (error !== null) {
          reject(new Error(`the SC-002 identifier read-back failed: ${stderr || error.message}`));
          return;
        }
        resolve(out);
      },
    );
  });
  return JSON.parse(stdout) as Sc002SessionIdentifiers;
}

// The status-wording gate (QR-002; spec.md § SC-002 Clarifications: a
// qualifying status says the scan is queued, names an active scan phase, or
// reports the terminal outcome, and a generic spinner or "loading" label
// does not qualify). No mechanical vocabulary can establish that a wording
// carries that meaning — successive denylists, frozen copies, and stem
// approximations each either duplicated the shipped table or admitted a new
// false positive ("Ready" contains "read") — so the harness does not parse
// meaning at all. It records a review seal instead, with the same mechanism
// this repository already uses for vendor-contract tables: the SHA-256 below
// covers the canonical listing of exactly the wordings that have been
// reviewed against the qualifying definition, keyed by member so a swap
// changes the listing. A copy change fails the run before anything is
// measured, until the new wording is reviewed and the seal re-recorded; the
// digest freezes that review event without holding a second copy of any
// label.
const REVIEWED_STATUS_WORDING_SHA256 =
  'c3cca773646e53a917d511720ed8b56e41c82de811791ae1c9685a2b20488335';

/**
 * The canonical listing the review seal covers: each measured status wording
 * keyed by its member, sorted, one per line — so a member's wording change
 * and two members' wordings swapped both change the digest.
 */
export function statusWordingListing(): string {
  const lines = [
    ...Object.entries(SCAN_PROGRESS_PHASE_TEXT).map(([phase, label]) => `phase:${phase}=${label}`),
    ...(['scanning', 'ready', 'partial', 'failed'] as const).map(
      (status) => `status:${status}=${SOURCE_STATUS_STANDALONE_TEXT[status].word}`,
    ),
  ];
  return lines.toSorted().join('\n');
}

/** One captured rescan admission: the response's own `scanRequestId`. */
export interface Sc002AdmissionCapture {
  /** Attach the frame listeners to a page; call before its navigation. */
  readonly attach: (page: Page) => void;
  /** The admission response's request ID, or a timeout rejection. */
  readonly admission: (timeoutMillis: number) => Promise<string>;
}

/**
 * Captures the rescan admission response off the page's own RPC WebSocket.
 * T183 requires the `scanRequestId` from the admission response itself, and
 * that response settles inside the page where no DOM or later session read
 * can stand in for it — a competing admission after the measured one would
 * leave a later read carrying the competitor's ID. The capture correlates
 * frames the devframe wire format itself correlates: the sent
 * `rescan-repository` call carries an opaque call ID, and the response frame
 * repeats that ID beside the admission payload. The extraction is
 * deliberately narrow — a wire-format change makes it miss, and the run then
 * fails for a missing admission instead of recording a wrong one.
 */
export function createSc002AdmissionCapture(): Sc002AdmissionCapture {
  const captured = Promise.withResolvers<string>();
  let callId: string | null = null;
  const frameText = (payload: string | Buffer): string =>
    typeof payload === 'string' ? payload : payload.toString('utf8');
  return {
    attach: (page: Page): void => {
      page.on('websocket', (socket) => {
        socket.on('framesent', (frame) => {
          const text = frameText(frame.payload);
          if (text.includes('agent-customization-inspector:rescan-repository')) {
            callId = /\[0,"i"\],\[0,"([^"]+)"\]/u.exec(text)?.[1] ?? null;
          }
        });
        socket.on('framereceived', (frame) => {
          const text = frameText(frame.payload);
          if (callId === null || !text.includes(`[0,"${callId}"]`)) {
            return;
          }
          const id = /\[0,"scanRequestId"\],\[0,"([^"]+)"\]/u.exec(text)?.[1];
          if (id !== undefined) {
            captured.resolve(id);
          }
        });
      });
    },
    admission: (timeoutMillis: number): Promise<string> =>
      Promise.race([
        captured.promise,
        new Promise<string>((_resolve, reject) => {
          // Unreferenced so a settled race does not hold the runner's own
          // process open for the remainder of the window: this timer runs in
          // the main process during a `globalSetup` pass.
          setTimeout(
            () =>
              reject(
                new Error(
                  'no rescan admission response was captured on the RPC channel — the wire format may have changed',
                ),
              ),
            timeoutMillis,
          ).unref();
        }),
      ]),
  };
}

/** One recorded smoke observation, printed with the run rather than asserted. */
export interface Sc002RunRecord {
  /**
   * The checked-in reference profile these observations are read beside. It
   * is not a claim about this run's own machine: nothing here compares the
   * executing environment with the profile's, and the printed record carries
   * that environment separately (`global-run.ts`).
   */
  readonly profileId: string;
  /** The manifest version the fixture was validated against. */
  readonly manifestVersion: number;
  /** The canonical digest of the manifest bytes. */
  readonly manifestSha256: string;
  /** The admission's opaque scan request ID. */
  readonly scanRequestId: string;
  /** The Repository generation that request committed. */
  readonly committedGeneration: number;
  /** The generation the automatic scan left, which the rescan must exceed. */
  readonly baselineGeneration: number;
  /** Milliseconds from dispatch to the first same-ID qualifying status. */
  readonly statusMillis: number;
  /** Milliseconds from dispatch to the same-ID complete inventory. */
  readonly inventoryMillis: number;
  /** Milliseconds from filter-input dispatch to the rendered filtered rows. */
  readonly filterMillis: number;
  /** Milliseconds from selection dispatch to the rendered detail feedback. */
  readonly selectMillis: number;
}

/**
 * Runs one measured SC-002 run against a fixture the caller built and owns: a
 * fresh packaged-CLI process; the automatic scan settled outside timing; one
 * explicit rescan measured on the rendered page; then, in that same process on
 * that same request-committed generation, the two standardized interactions;
 * and the fixture digests recomputed afterwards. Every resource the run
 * acquires is released in its own teardown, whatever failed — the tree
 * excepted, because the smoke pass that built it removes it after this run
 * ({@link runSc002SmokePass}).
 *
 * All four timers run inside the page, from input dispatch to rendered
 * feedback observed per animation frame, and every wait carries its own
 * deadline: an in-page loop with no deadline would keep its `evaluate` call
 * pending past the outer test timeout, and the teardown below can only run
 * once these calls settle. The stop conditions require the feedback to be
 * actually visible (`Element.checkVisibility`), exposed through a live
 * region that is not `off` and not inside `aria-hidden`, and — for the
 * selection — rendered by the detail route itself, so a failure surface
 * that also carries a heading cannot stop a timer (spec.md § SC-002).
 */
export async function runSc002MeasuredRun(
  root: string,
  manifest: Sc002Manifest,
  manifestSha256: string,
  profile: Sc002Profile,
): Promise<Sc002RunRecord> {
  let host: import('../e2e/launch-host').LaunchedHost | null = null;
  let session: Sc002BrowserSession | null = null;
  let record: Sc002RunRecord | null = null;
  let mainFailure: unknown = null;
  try {
    // Immediately before the run; a drifted entry or digest invalidates it.
    await validateSc002Fixture(root, manifest);
    const { launchHost } = await import('../e2e/launch-host');
    host = await launchHost(root);
    // The admission capture listens on the page's RPC WebSocket from before
    // the first navigation, so the measured rescan's admission response —
    // which settles inside the page — is read from its own frames rather
    // than reconstructed from a later session read a competing admission
    // could overwrite.
    const admissionCapture = createSc002AdmissionCapture();
    session = await openSettledInventory(host.origin, admissionCapture.attach);
    const page = session.page;

    // The shipped labels are the one place the wording lives; before
    // anything is measured, the canonical listing of the measured wordings
    // must match the recorded review seal, so a rewording — generic, wrong
    // meaning, or two members swapped — fails here instead of becoming its
    // own pass condition. See REVIEWED_STATUS_WORDING_SHA256 for why the
    // gate is a seal rather than a semantic check.
    const wordingDigest = sha256Hex(statusWordingListing());
    if (wordingDigest !== REVIEWED_STATUS_WORDING_SHA256) {
      throw new Error(
        `the measured status wordings (digest ${wordingDigest}) no longer match the reviewed seal — review the new copy against the SC-002 qualifying definition and, only if it qualifies, re-record REVIEWED_STATUS_WORDING_SHA256`,
      );
    }
    const phaseLabels = Object.values(SCAN_PROGRESS_PHASE_TEXT);

    const scan = await page.evaluate(
      async ({
        expectedRows,
        phaseLabels,
        scanningLabel,
        readyLabel,
        partialLabel,
        failedLabel,
        terminalPhaseLabel,
        statusDeadline,
        inventoryDeadline,
      }) => {
        // "Visibly rendered" is checked with every optional CSS gate on:
        // `checkVisibility()` alone skips `visibility: hidden`, `opacity: 0`,
        // and `content-visibility: auto` skipping, so a bare call would stop
        // a timer on state no user can see.
        const visible = (element: Element | null | undefined): boolean =>
          element instanceof HTMLElement &&
          element.checkVisibility({
            visibilityProperty: true,
            opacityProperty: true,
            contentVisibilityAuto: true,
          }) &&
          element.closest('[aria-hidden="true"]') === null;
        const textOf = (element: Element | null | undefined): string =>
          (element?.textContent ?? '').trim();
        const buttons = (): HTMLButtonElement[] => [...document.querySelectorAll('button')];
        const definitionTerms = (): HTMLElement[] => [...document.querySelectorAll('dt')];
        const committedGeneration = (): number => {
          const term = definitionTerms().find(
            (candidate) => textOf(candidate) === 'Committed generation',
          );
          return Number(textOf(term?.nextElementSibling));
        };
        // An announced element sits inside a live region that actually
        // announces: only `polite` and `assertive` notify (WAI-ARIA 1.2
        // § aria-live), so an empty or mistyped value fails exactly as `off`
        // does, and an `aria-hidden` ancestor silences it either way.
        const announced = (element: Element): boolean => {
          const region = element.closest('[aria-live]');
          return (
            region !== null &&
            ['polite', 'assertive'].includes(region.getAttribute('aria-live') ?? '')
          );
        };
        // A settled page shows no per-request progress row: this page has
        // issued no command yet, so a "This scan" row here means the
        // per-request correlation gate regressed into showing another
        // request's progress — and the status stop below could then end on
        // the automatic scan's leftover record instead of this rescan's.
        if (definitionTerms().some((candidate) => textOf(candidate) === 'This scan')) {
          throw new Error(
            'a progress row is rendered before any command was dispatched — the per-request correlation gate has regressed',
          );
        }
        const baselineGeneration = committedGeneration();
        // Resolve the control before starting the clock: the contract starts
        // the timers at the input dispatch, so DOM lookup is setup, not
        // measurement.
        // `Rescan`, not `Rescan repository`: this run is on the Repository
        // page, whose heading already names the Source, so the command does
        // not repeat it — the bar's command over the inventory is the one that
        // does (`ScanProgress.vue`, `App.vue`). Named rather than asserted
        // non-null, because a label this went looking for and did not find is
        // what a reworded command looks like, and `!` would report it as a
        // `TypeError` on `undefined` with nothing said about which control was
        // missing.
        const rescanButton = buttons().find((candidate) => textOf(candidate) === 'Rescan');
        if (rescanButton === undefined) {
          throw new Error(
            `SC-002 found no "Rescan" command on the Repository page; buttons: ${buttons()
              .map((candidate) => textOf(candidate))
              .join(' | ')}`,
          );
        }
        const start = performance.now();
        rescanButton.click();
        let lastRefresh = start;
        const refreshOccasionally = (): void => {
          if (performance.now() - lastRefresh > 400) {
            buttons()
              .find((candidate) => textOf(candidate) === 'Refresh status')
              ?.click();
            lastRefresh = performance.now();
          }
        };
        // The status observation: the first qualifying status correlated to
        // this request, in one of three shapes the qualifying definition names
        // (spec.md § SC-002 Clarifications). Each shape pairs the "This scan"
        // row with the source status it must agree with, so a phase label
        // shown against the wrong status — a terminal label mid-scan, the
        // shape a swapped label table produces — stops nothing and the run
        // fails at the deadline instead:
        //  - running: source status is the scanning one, and the row names an
        //    active (non-terminal) phase with the attempt's own figures — the
        //    structural check a label with no concrete state fails even if
        //    the closed table itself regressed toward one;
        //  - committed: source status is ready or partial, and the correlated
        //    row — still rendered only under the admitted request's ID — is
        //    visible with it;
        //  - failed: the failed status with its retained explanation and its
        //    "Retry scan" control, the practical next step. Production
        //    publishes a fatal rescan as `failed` with no progress row, so a
        //    harness waiting for "This scan" alone could never accept it.
        await new Promise<void>((resolve, reject) => {
          const check = (): void => {
            const statusTerm = definitionTerms().find(
              (candidate) => textOf(candidate) === 'Source status',
            );
            const statusValue = statusTerm?.nextElementSibling ?? null;
            const statusText = textOf(statusValue);
            const statusShown =
              statusValue !== null && visible(statusValue) && announced(statusValue);
            const term = definitionTerms().find((candidate) => textOf(candidate) === 'This scan');
            const named = term?.nextElementSibling ?? null;
            const namedText = textOf(named);
            const correlatedRowShown =
              term !== undefined && visible(term) && visible(named) && announced(term);
            const running =
              statusShown &&
              statusText === scanningLabel &&
              correlatedRowShown &&
              phaseLabels.some((label) => namedText.startsWith(label)) &&
              !namedText.startsWith(terminalPhaseLabel) &&
              namedText.includes(' — ') &&
              namedText.includes('candidate file');
            const committed =
              statusShown &&
              (statusText === readyLabel || statusText === partialLabel) &&
              correlatedRowShown;
            const failedExplanation = [...document.querySelectorAll('p')].find((candidate) =>
              textOf(candidate).includes('The last rescan failed'),
            );
            const failed =
              statusShown &&
              statusText === failedLabel &&
              failedExplanation !== undefined &&
              visible(failedExplanation) &&
              buttons().some(
                (candidate) => textOf(candidate) === 'Retry scan' && visible(candidate),
              );
            if (running || committed || failed) {
              // One more frame before the clock reads: an animation-frame
              // callback runs before its frame paints, so stopping here
              // would exclude the paint that makes the status visible. The
              // next callback fires after that paint has happened.
              requestAnimationFrame(() => resolve());
              return;
            }
            if (performance.now() - start > statusDeadline) {
              reject(
                new Error(
                  `SC-002 wait for a qualifying request-correlated status exceeded ${statusDeadline} ms`,
                ),
              );
              return;
            }
            refreshOccasionally();
            requestAnimationFrame(check);
          };
          check();
        });
        const statusMillis = performance.now() - start;
        // The inventory observation, in the two places the reworked surfaces
        // put its two halves. The generation this request committed is
        // rendered by the status panel, so it is waited for here, before the
        // run leaves it;
        // the inventory it belongs to is then the one the list renders, because
        // the page holds one committed snapshot at a time.
        await new Promise<void>((resolve, reject) => {
          const check = (): void => {
            if (committedGeneration() > baselineGeneration) {
              resolve();
              return;
            }
            if (performance.now() - start > inventoryDeadline) {
              reject(
                new Error(
                  `SC-002 wait for this request's committed generation exceeded ${inventoryDeadline} ms`,
                ),
              );
              return;
            }
            refreshOccasionally();
            requestAnimationFrame(check);
          };
          check();
        });
        // Read where it is rendered, before the run leaves the panel that
        // renders it: the inventory states no generation of its own.
        const committedGenerationValue = committedGeneration();
        // The way back the status page offers, which is how a reader returns to
        // the list — a router link rather than a navigation, so the session and
        // its committed snapshot survive the move.
        [...document.querySelectorAll('a')]
          .find((candidate) => textOf(candidate).endsWith('Back to the inventory'))!
          .click();
        // The rest of the stop: the complete row set visible and every primary
        // list control operable — the filter controls enabled and visible, and
        // the kind tab selected and visible. Every row must be visible, not
        // only the endpoints; the full sweep runs only once the cheap endpoint
        // gate holds, so the per-frame cost stays bounded while the sweep still
        // gates the stop.
        //
        // The source control is deliberately not among them. It renders only
        // where more than one Source kind is available, because with one it
        // would offer two options naming the same population
        // (`InventoryFilters.vue`), and this fixture is a Repository on its
        // own — so requiring it would wait for a control the measured page
        // never renders.
        await new Promise<void>((resolve, reject) => {
          const check = (): void => {
            const rows = document.querySelectorAll('[role="tabpanel"] .aci-item');
            // The search over names and paths is the shell's, in the bar
            // beside the session's own commands (`App.vue`); the tool filter
            // is the inventory's own (`InventoryFilters.vue`). Both are
            // primary list controls, wherever the surface puts them.
            const controls = [
              document.getElementById('aci-app-search'),
              document.getElementById('aci-inventory-filters-tool'),
            ] as (HTMLInputElement | HTMLSelectElement | null)[];
            const kindTab = document.querySelector('[role="tab"][aria-selected="true"]');
            const endpointGate =
              rows.length === expectedRows &&
              visible(rows[0] ?? null) &&
              visible(rows[rows.length - 1] ?? null) &&
              controls.every(
                (control) => control !== null && visible(control) && !control.disabled,
              ) &&
              kindTab !== null &&
              visible(kindTab);
            if (endpointGate && [...rows].every((row) => visible(row))) {
              // After the paint, as with the status stop above.
              requestAnimationFrame(() => resolve());
              return;
            }
            if (performance.now() - start > inventoryDeadline) {
              reject(
                new Error(
                  `SC-002 wait for the request-committed operable inventory exceeded ${inventoryDeadline} ms`,
                ),
              );
              return;
            }
            refreshOccasionally();
            requestAnimationFrame(check);
          };
          check();
        });
        return {
          statusMillis,
          inventoryMillis: performance.now() - start,
          baselineGeneration,
          committedGeneration: committedGenerationValue,
        };
      },
      {
        expectedRows: manifest.matchingFiles,
        phaseLabels,
        scanningLabel: SOURCE_STATUS_STANDALONE_TEXT.scanning.word,
        readyLabel: SOURCE_STATUS_STANDALONE_TEXT.ready.word,
        partialLabel: SOURCE_STATUS_STANDALONE_TEXT.partial.word,
        failedLabel: SOURCE_STATUS_STANDALONE_TEXT.failed.word,
        terminalPhaseLabel: SCAN_PROGRESS_PHASE_TEXT.complete,
        statusDeadline: 120_000,
        inventoryDeadline: 300_000,
      },
    );

    // The measured rescan's admission response, from its own RPC frames.
    const scanRequestId = await admissionCapture.admission(30_000);

    // Standardized filter action, on the same request-committed generation:
    // type the path query and stop when the one matching row — checked by its
    // own rendered text, not by count alone — is visible.
    const filterMillis = await page.evaluate(async (deadline: number) => {
      // Element lookup and the value assignment are setup; the contract
      // starts the interaction timer at the input dispatch itself.
      const input = document.getElementById('aci-app-search') as HTMLInputElement;
      input.value = 'perf-skill-250';
      const start = performance.now();
      input.dispatchEvent(new Event('input', { bubbles: true }));
      await new Promise<void>((resolve, reject) => {
        const check = (): void => {
          const rows = document.querySelectorAll('[role="tabpanel"] .aci-item');
          const only = rows[0] ?? null;
          if (
            rows.length === 1 &&
            only instanceof HTMLElement &&
            only.checkVisibility({
              visibilityProperty: true,
              opacityProperty: true,
              contentVisibilityAuto: true,
            }) &&
            (only.textContent ?? '').includes('perf-skill-250')
          ) {
            // After the paint; see the scan stops above.
            requestAnimationFrame(() => resolve());
            return;
          }
          if (performance.now() - start > deadline) {
            reject(new Error(`SC-002 wait for the filtered row exceeded ${deadline} ms`));
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      });
      return performance.now() - start;
    }, 60_000);
    // Back to the complete row set before the selection; outside both timers.
    await page.evaluate(() => {
      const input = document.getElementById('aci-app-search') as HTMLInputElement;
      input.value = '';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(
      (rows) => document.querySelectorAll('[role="tabpanel"] .aci-item').length === rows,
      manifest.matchingFiles,
    );

    // Standardized item-selection action: activate the first row's detail
    // link and stop when the detail route renders its own first state — the
    // skill detail's heading or its synchronous loading message, both scoped
    // to the detail component. The scope is the point: a session-failure
    // surface also carries a heading and an ended URL keeps the `/skills/`
    // path, so an unscoped heading check could record a failure screen as
    // selection feedback.
    const selectMillis = await page.evaluate(async (deadline: number) => {
      const link = document.querySelector(
        '[role="tabpanel"] .aci-item a',
      ) as HTMLAnchorElement | null;
      if (link === null) {
        throw new Error('no detail link rendered to select');
      }
      const start = performance.now();
      link.click();
      await new Promise<void>((resolve, reject) => {
        const strictlyVisible = (element: Element | null | undefined): boolean =>
          element instanceof HTMLElement &&
          element.checkVisibility({
            visibilityProperty: true,
            opacityProperty: true,
            contentVisibilityAuto: true,
          });
        const check = (): void => {
          const detail = document.querySelector('.aci-skill-detail');
          const heading = detail?.querySelector('h2') ?? null;
          const loading = [...(detail?.querySelectorAll('p') ?? [])].find((candidate) =>
            (candidate.textContent ?? '').includes('Loading this skill'),
          );
          const feedbackVisible = strictlyVisible(heading) || strictlyVisible(loading);
          if (
            window.location.pathname.startsWith('/skills/') &&
            detail !== null &&
            feedbackVisible
          ) {
            // After the paint; see the scan stops above.
            requestAnimationFrame(() => resolve());
            return;
          }
          if (performance.now() - start > deadline) {
            reject(new Error(`SC-002 wait for the detail feedback exceeded ${deadline} ms`));
            return;
          }
          requestAnimationFrame(check);
        };
        check();
      });
      return performance.now() - start;
    }, 60_000);

    // The post-run read-back proves the correlation held end to end: the
    // admission response's own ID is the one the committed source and its
    // retained, completed progress record still carry, and the committed
    // generation is the one the page measured. A competing admission after
    // the measured one would leave a different ID — or a non-complete
    // progress record — and fail the run instead of blending two requests
    // into one record.
    const final = await readBackSessionIdentifiers(host.origin);
    if (final.scanRequestId !== scanRequestId) {
      throw new Error('the committed source no longer carries the measured admission’s request ID');
    }
    if (final.progressScanRequestId !== scanRequestId || final.progressPhase !== 'complete') {
      throw new Error('the retained progress record is not the measured admission’s completed one');
    }
    if (final.repositoryGeneration !== scan.committedGeneration) {
      throw new Error('the recorded generation is not the one the page measured');
    }

    record = {
      profileId: profile.profileId,
      manifestVersion: manifest.manifestVersion,
      manifestSha256,
      scanRequestId,
      committedGeneration: scan.committedGeneration,
      baselineGeneration: scan.baselineGeneration,
      statusMillis: scan.statusMillis,
      inventoryMillis: scan.inventoryMillis,
      filterMillis,
      selectMillis,
    };
  } catch (cause) {
    mainFailure = cause;
  }

  // Teardown with per-resource isolation: one failing cleanup must not skip
  // the others — a rejecting `browser.close()` still leaves a CLI process and
  // a hundred-thousand-entry tree to release. Browser before host before tree
  // removal, because deleting a tree the process still serves races the
  // removal against open handles. The pass's own failure outranks a cleanup
  // failure; cleanup failures surface only when the pass itself succeeded.
  const cleanupFailures: unknown[] = [];
  if (session !== null) {
    try {
      await session.browser.close();
    } catch (cause) {
      cleanupFailures.push(cause);
    }
  }
  if (host !== null) {
    try {
      const { stopHost } = await import('../e2e/launch-host');
      await stopHost(host);
    } catch (cause) {
      cleanupFailures.push(cause);
    }
  }
  // The after-run half of the integrity gate runs here, in teardown, so the
  // digests are recomputed whatever the pass did: a mutated fixture must be
  // reported even when — especially when — the measurement itself failed,
  // because the mutation may be what failed it (FR-023; plan.md
  // § Performance Goals: the validator runs before and after). It runs after
  // the host stops, so nothing is still writing OS-level read state, and
  // before the removal, which would destroy the evidence.
  let mutationFailure: unknown = null;
  try {
    await validateSc002Fixture(root, manifest);
  } catch (cause) {
    mutationFailure = cause;
  }
  if (mainFailure !== null) {
    if (mutationFailure !== null) {
      console.error('SC-002 post-run fixture validation also failed:', mutationFailure);
    }
    if (cleanupFailures.length > 0) {
      console.error('SC-002 teardown also failed:', cleanupFailures);
    }
    throw mainFailure;
  }
  // A mutation finding outranks a cleanup failure: it is the integrity gate,
  // not housekeeping.
  if (mutationFailure !== null) {
    if (cleanupFailures.length > 0) {
      console.error('SC-002 teardown also failed:', cleanupFailures);
    }
    throw mutationFailure;
  }
  if (cleanupFailures.length > 0) {
    throw new AggregateError(cleanupFailures, 'the SC-002 smoke pass leaked resources');
  }
  return record!;
}

/**
 * Executes the performance smoke pass: one run against the unchanged,
 * manifest-bound fixture in a fresh packaged-CLI process (plan.md
 * § Performance Goals; quickstart.md § Performance smoke pass).
 *
 * The fixture is built, validated immediately before the run, and revalidated
 * by the run's own teardown, so a mutation is attributed to the run and the
 * manifest digest is recomputed with it — a fixture that still matches a
 * rewritten manifest matches nothing that was reviewed.
 *
 * One run rather than a series, because no threshold is asserted over the
 * figures (spec.md § Clarifications, Session 2026-09-01): a series only earns
 * its cost where a subset of runs decides something, and here nothing does.
 */
export async function runSc002SmokePass(): Promise<Sc002RunRecord> {
  const { manifest, manifestSha256 } = loadSc002Manifest();
  const profile = loadSc002Profile(manifest, manifestSha256);
  const root = await buildSc002Fixture(manifest);
  try {
    await validateSc002Fixture(root, manifest);
    return await runSc002MeasuredRun(root, manifest, manifestSha256, profile);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
