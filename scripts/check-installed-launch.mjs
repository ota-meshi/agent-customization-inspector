// Launch check for a command that is supposed to be this product's CLI: it
// prints one loopback origin, serves the shell there, and exits when asked
// (FR-001, contracts/http-api.md § Host requirements).
//
// It takes the command as its arguments rather than assuming one, so the same
// script covers the two things that need covering and can be run against
// either. CI points it at the tarball it just installed —
// `npx --no-install agent-customization-inspector` — which is the one path no
// other gate reaches: `tests/package/npx-launch.test.ts` runs `dist/cli.mjs`
// from an unrelated directory, and says in its own scope note that installing
// a tarball would need a network install the package gate deliberately does
// not perform. Locally the same script runs against `node dist/cli.mjs`, which
// is how it is checked before it is trusted in CI.
//
// Node rather than shell because the job runs on Windows too, where
// backgrounding a process in bash and killing the tree it spawned is the part
// that would differ; `spawn` and `kill` behave the same on all three runners.
import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

/** The one contracted launch line: a loopback origin and nothing else. */
const LAUNCH_LINE = /^http:\/\/localhost:\d+\/$/mu;

/** How long the launch line may take before this check fails. */
const LAUNCH_TIMEOUT_MS = 60_000;

const command = process.argv[2];
const commandArguments = process.argv.slice(3);
if (command === undefined) {
  console.error(
    'usage: node scripts/check-installed-launch.mjs <command> [args...]\n' +
      'example: node scripts/check-installed-launch.mjs node dist/cli.mjs',
  );
  process.exit(1);
}

// A root of its own, so the check never depends on what the working directory
// happens to hold and never reads the reader's own tree.
const root = await mkdtemp(join(tmpdir(), 'aci-launch-check-'));
await writeFile(join(root, 'AGENTS.md'), '# Launch check\n', 'utf8');

const child = spawn(command, [...commandArguments, '--root', root, '--no-open', '--port', '0'], {
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

// The command owns the port until it is told to stop, which is the last thing
// this check asserts: a launch that cannot be ended leaves the port held.
const ended = new Promise((resolve) => child.once('exit', () => resolve(undefined)));
child.kill('SIGTERM');
await ended;
await rm(root, { recursive: true, force: true });

if (failure !== null) {
  console.error(`launch check failed: ${failure.message}`);
  process.exit(1);
}
console.log(`launch check passed: ${command} printed ${origin} and served the shell there`);
