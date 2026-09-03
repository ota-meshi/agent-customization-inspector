// Launch check for an installed copy of this package: what its `bin` points at
// prints one loopback origin, serves the shell there, and exits when asked
// (FR-001, contracts/http-api.md § Host requirements).
//
// It takes the package directory, reads that copy's own `package.json.bin`,
// and runs the file it names under this process's Node. CI points it at the
// tarball it just installed — `node_modules/agent-customization-inspector`
// inside a fresh `npm install` — which is the one path no other gate reaches:
// `tests/package/npx-launch.test.ts` runs `dist/cli.mjs` from an unrelated
// directory, and says in its own scope note that installing a tarball would
// need a network install the package gate deliberately does not perform.
// Locally the same script runs against `.`, whose `bin` is the same
// `dist/cli.mjs`, which is how it is checked before it is trusted in CI.
//
// `process.execPath` on the bin target rather than `npx` through `spawn`: on
// Windows `npx` is `npx.cmd`, which `spawn` cannot start without a shell, and
// through a shell the process this check would end is the wrapper rather than
// the CLI. Whether the bin *resolves* is the `--help` step's, which CI runs
// through `npx` on every runner just before this; what this adds is that the
// resolved file launches.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

/** The one contracted launch line: a loopback origin and nothing else. */
const LAUNCH_LINE = /^http:\/\/localhost:\d+\/$/mu;

/** How long the launch line may take before this check fails. */
const LAUNCH_TIMEOUT_MS = 60_000;

/** How long the CLI may take to stop after SIGTERM before it is killed. */
const SHUTDOWN_TIMEOUT_MS = 10_000;

const packageDirectory = process.argv[2];
if (packageDirectory === undefined) {
  console.error(
    'usage: node scripts/check-installed-launch.mjs <package directory>\n' +
      'example: node scripts/check-installed-launch.mjs node_modules/agent-customization-inspector',
  );
  process.exit(1);
}

/** The installed copy's own manifest, read from the directory the caller named. */
const manifest = JSON.parse(await readFile(join(packageDirectory, 'package.json'), 'utf8'));
/** The one file `bin` names; a string form or a single-entry object are the two shapes npm accepts. */
const binTarget =
  typeof manifest.bin === 'string' ? manifest.bin : Object.values(manifest.bin ?? {})[0];
if (typeof binTarget !== 'string') {
  console.error(`launch check failed: ${packageDirectory}/package.json names no bin`);
  process.exit(1);
}
const cliEntry = resolve(packageDirectory, binTarget);

// A root of its own, so the check never depends on what the working directory
// happens to hold and never reads the reader's own tree.
const root = await mkdtemp(join(tmpdir(), 'aci-launch-check-'));
await writeFile(join(root, 'AGENTS.md'), '# Launch check\n', 'utf8');

const child = spawn(process.execPath, [cliEntry, '--root', root, '--no-open', '--port', '0'], {
  stdio: ['ignore', 'pipe', 'pipe'],
});

/** Everything the command printed, for the failure message when it prints no origin. */
let output = '';
let stderr = '';
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

/** Resolves with the printed origin, or rejects when the command ends or stalls without one. */
/** @type {Promise<string>} */
const launched = new Promise((resolve, reject) => {
  const timer = setTimeout(() => {
    reject(new Error(`no launch line within ${LAUNCH_TIMEOUT_MS}ms; printed:\n${output}${stderr}`));
  }, LAUNCH_TIMEOUT_MS);
  /** Runs one settlement and stops the clock, whichever event came first. */
  const settle = (/** @type {() => void} */ outcome) => {
    clearTimeout(timer);
    outcome();
  };
  child.stdout.on('data', (chunk) => {
    output += chunk;
    const line = output.match(LAUNCH_LINE);
    if (line !== null) {
      settle(() => resolve(line[0]));
    }
  });
  child.on('error', (error) => settle(() => reject(error)));
  child.on('exit', (code) =>
    settle(() =>
      reject(new Error(`exited with ${code} before printing a launch line:\n${output}${stderr}`)),
    ),
  );
});
/** @type {string} */
let origin;
try {
  origin = await launched;
} catch (error) {
  await rm(root, { recursive: true, force: true });
  console.error(`launch check failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
}

/**
 * Whether the served page is the packaged shell, so a 200 from anything else
 * fails: the shell is a client-rendered application whose served bytes carry
 * its mount point and nothing of the product's own words, which is the same
 * marker `tests/package/npx-launch.test.ts` asserts.
 */
let failure = null;
try {
  const response = await fetch(origin);
  if (!response.ok) {
    failure = new Error(`${origin} answered ${response.status}`);
  } else if (!(await response.text()).includes('<div id="__nuxt">')) {
    failure = new Error(`${origin} served a page that is not the packaged shell`);
  }
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
}

// The CLI owns the port until it is told to stop, which is the last thing this
// check asserts: a launch that cannot be ended leaves the port held. The
// process signalled is the CLI itself, there being no wrapper between.
const ended = new Promise((resolve) => child.once('exit', () => resolve(undefined)));
child.kill('SIGTERM');
// Escalated rather than waited on indefinitely. A CLI that ignores SIGTERM
// would hold this `await` for as long as the job is allowed to run — measured
// once at six hours on the Ubuntu runners, where the step was cancelled by the
// job timeout rather than by anything this check decided. The escalation makes
// the refusal a reported failure instead of a hang, and it is a failure: the
// port stays held by a launch nothing could end.
const escalation = setTimeout(() => child.kill('SIGKILL'), SHUTDOWN_TIMEOUT_MS);
const shutdownDeadline = new Promise((resolve) => setTimeout(resolve, SHUTDOWN_TIMEOUT_MS * 2));
await Promise.race([ended, shutdownDeadline]);
clearTimeout(escalation);
if (child.exitCode === null && child.signalCode === null && failure === null) {
  failure = new Error(
    `still running ${SHUTDOWN_TIMEOUT_MS * 2}ms after SIGTERM, and after SIGKILL beyond that`,
  );
}
await rm(root, { recursive: true, force: true });

if (failure !== null) {
  console.error(`launch check failed: ${failure.message}`);
  process.exit(1);
}
console.log(`launch check passed: ${cliEntry} printed ${origin} and served the shell there`);
