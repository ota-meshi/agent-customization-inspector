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

/**
 * How long the printed origin may take to deliver the whole shell, request
 * and body together. A process that prints its origin, accepts the
 * connection, and never answers is alive, so the exit this fetch is raced
 * against never comes, and the cleanup that ends the process is reached only
 * once the race settles; the deadline is what settles it.
 */
const RESPONSE_TIMEOUT_MS = 10_000;

/**
 * How long a launch that served the shell is watched before it is asked to
 * stop. A process that ends by itself in that moment did not stay up, and the
 * wait is what makes that observable: it yields to the event loop, so an exit
 * the operating system has already reported is delivered here rather than
 * arriving after the shutdown request and passing as its answer.
 */
const LIVENESS_GRACE_MS = 250;

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
child.stdout.on('data', (chunk) => {
  output += chunk;
});
child.stderr.on('data', (chunk) => {
  stderr += chunk;
});

/**
 * The one exit, held from the spawn: a process that ends before the launch
 * line, during the fetch, or when asked to stop is judged by this same
 * settlement, so an early end cannot pass as the stop this check asks for.
 * @type {Promise<{ code: number | null; signal: NodeJS.Signals | null }>}
 */
const exited = new Promise((resolve) => {
  child.once('exit', (code, signal) => resolve({ code, signal }));
});
/** A spawn that never started — no such file, no permission to run it. */
const failedToStart = new Promise((_, reject) => child.once('error', reject));

/**
 * Resolves after `ms`. The timer holds nothing open: once the check is
 * decided by an event that came first, it must not keep the process alive
 * for the rest of the interval.
 * @param {number} ms
 */
const after = (ms) => new Promise((resolve) => setTimeout(resolve, ms).unref());

/**
 * The printed origin, or a rejection naming what happened instead of it.
 * @type {Promise<string>}
 */
const launched = Promise.race([
  new Promise((resolve) => {
    const look = () => {
      const line = output.match(LAUNCH_LINE);
      if (line !== null) {
        child.stdout.off('data', look);
        resolve(line[0]);
      }
    };
    child.stdout.on('data', look);
    look();
  }),
  exited.then(({ code, signal }) => {
    throw new Error(
      `exited with ${code ?? signal} before printing a launch line:\n${output}${stderr}`,
    );
  }),
  failedToStart,
  after(LAUNCH_TIMEOUT_MS).then(() => {
    throw new Error(`no launch line within ${LAUNCH_TIMEOUT_MS}ms; printed:\n${output}${stderr}`);
  }),
]);

/**
 * Whether the served page is the packaged shell, so a 200 from anything else
 * fails: the shell is a client-rendered application whose served bytes carry
 * its mount point and nothing of the product's own words, which is the same
 * marker `tests/package/npx-launch.test.ts` asserts. Raced against the exit,
 * because a process that ends after printing its origin is a failed launch
 * whatever the socket then reports.
 * @param {string} origin
 */
async function servesTheShell(origin) {
  // One signal over the request and the body read: `text()` rejects under the
  // same signal, so a response that opens and never completes fails the same
  // way as a connection that is never answered.
  const signal = AbortSignal.timeout(RESPONSE_TIMEOUT_MS);
  let response;
  let body;
  try {
    response = await fetch(origin, { signal });
    body = await response.text();
  } catch (error) {
    if (signal.aborted) {
      throw new Error(`${origin} gave no complete response within ${RESPONSE_TIMEOUT_MS}ms`, {
        cause: error,
      });
    }
    throw error;
  }
  if (!response.ok) {
    throw new Error(`${origin} answered ${response.status}`);
  }
  if (!body.includes('<div id="__nuxt">')) {
    throw new Error(`${origin} served a page that is not the packaged shell`);
  }
}

/** @type {Error | null} */
let failure = null;
/** @type {string | null} */
let origin = null;
/** Whether this check successfully sent the shutdown request a passing launch must answer. */
let shutdownRequested = false;
try {
  const printed = await launched;
  origin = printed;
  await Promise.race([
    servesTheShell(printed),
    exited.then(({ code, signal }) => {
      throw new Error(`exited with ${code ?? signal} after printing ${origin}:\n${stderr}`);
    }),
  ]);
  const endedByItself = await Promise.race([exited, after(LIVENESS_GRACE_MS).then(() => null)]);
  if (endedByItself !== null) {
    throw new Error(
      `exited with ${endedByItself.code ?? endedByItself.signal} after serving the shell, before the shutdown request${stderr === '' ? '' : `:\n${stderr}`}`,
    );
  }
} catch (error) {
  failure = error instanceof Error ? error : new Error(String(error));
  // A process that has already ended is the cause of whatever the socket
  // reported, so its exit is named beside the report rather than left for the
  // reader to infer from a refused connection.
  if (
    (child.exitCode !== null || child.signalCode !== null) &&
    !failure.message.startsWith('exited with')
  ) {
    failure = new Error(
      `${failure.message}; the process had exited with ${child.exitCode ?? child.signalCode}`,
    );
  }
} finally {
  // Every path ends what it started. The CLI owns the port until it is told
  // to stop, which is the last thing this check asserts: a launch that cannot
  // be ended leaves the port held, and so would a check that gave up on a
  // silent process and left it running. The process signalled is the CLI
  // itself, there being no wrapper between.
  if (child.exitCode === null && child.signalCode === null) {
    shutdownRequested = child.kill('SIGTERM');
    // Escalated rather than waited on indefinitely. A CLI that ignores SIGTERM
    // would hold this `await` for as long as the job is allowed to run —
    // measured once at six hours on the Ubuntu runners, where the step was
    // cancelled by the job timeout rather than by anything this check decided.
    // The escalation makes the refusal a reported failure instead of a hang,
    // and it is a failure: the port stays held by a launch nothing could end.
    const stopped = await Promise.race([
      exited.then(() => true),
      after(SHUTDOWN_TIMEOUT_MS).then(() => false),
    ]);
    if (!stopped) {
      child.kill('SIGKILL');
      await Promise.race([exited, after(SHUTDOWN_TIMEOUT_MS)]);
      failure ??= new Error(`still running ${SHUTDOWN_TIMEOUT_MS}ms after SIGTERM; killed`);
    }
  }
  await rm(root, { recursive: true, force: true });
}

// A launch that served the shell passes only if this check then asked it to
// stop and it answered that request. A process that exited cleanly on its own
// between the response and the request did not stay up, and is not mistaken
// for a graceful shutdown.
if (failure === null && (child.exitCode !== null || child.signalCode !== null)) {
  const { code, signal } = await exited;
  if (!shutdownRequested) {
    failure = new Error(`exited with ${signal ?? `code ${code}`} before the shutdown request`);
  } else if (signal !== 'SIGTERM' && code !== 0) {
    failure = new Error(`stopped with ${signal ?? `code ${code}`} rather than on SIGTERM`);
  }
}

if (failure !== null) {
  console.error(`launch check failed: ${failure.message}`);
  process.exit(1);
}
console.log(`launch check passed: ${cliEntry} printed ${origin} and served the shell there`);
