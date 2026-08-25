// Shared browser-acceptance harness: launches the packaged CLI exactly as a
// user would and returns the loopback origin it printed.
//
// The suites drive the real `dist/cli.mjs` rather than an in-process host,
// because the acceptance claims are about what someone actually gets after
// installing the package: the printed launch line, the served shell, and the
// committed inventory of a fixture repository the product never modifies.
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';

const REPO_ROOT = join(import.meta.dirname, '..', '..');

/** The packaged CLI entry `package.json.bin` points at. */
export const CLI_ENTRY = join(REPO_ROOT, 'dist', 'cli.mjs');

/** The one contracted launch line: a loopback origin and nothing else. */
export const LOOPBACK_LAUNCH_LINE = /^http:\/\/localhost:\d+\/$/u;

/** One launched host process and the loopback origin it printed. */
export interface LaunchedHost {
  /** The running CLI process. */
  readonly child: ChildProcessByStdio<null, Readable, Readable>;
  /** The exact origin the CLI printed, without a trailing path. */
  readonly origin: string;
}

/**
 * Launches the packaged CLI against `fixture` and resolves once it prints its
 * launch line. The process is started from an unrelated working directory so
 * the run also proves the packaged shell is served from the package, not from
 * the inspected repository.
 */
export async function launchHost(fixture: string): Promise<LaunchedHost> {
  // `--port 0` has devframe select a free port instead of reusing its fixed
  // default, so a suite run never takes the port the machine's owner reserved
  // for their own use (AGENTS.md § Agent-started process policy). No test
  // depends on which port it picks: the origin below is read from the printed
  // launch line.
  const child = spawn(
    process.execPath,
    [CLI_ENTRY, '--no-open', '--port', '0', '--root', fixture],
    {
      cwd: tmpdir(),
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  let stdout = '';
  let stderr = '';
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const origin = await new Promise<string>((resolve, reject) => {
    // The caller never receives a handle on the timeout path, so the spawned
    // child is reaped here — and the rejection waits for the `exit` event the
    // kill causes, because rejecting on the signal alone would let the caller
    // remove the fixture tree while the CLI still serves it.
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, 30_000);
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const line = stdout
        .split('\n')
        .find((candidate) => LOOPBACK_LAUNCH_LINE.test(candidate.trim()));
      if (line !== undefined) {
        clearTimeout(timer);
        resolve(line.trim());
      }
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(
        new Error(
          timedOut
            ? `the CLI printed no launch line within 30 s and was killed; stdout=${stdout} stderr=${stderr}`
            : `the CLI exited with code ${code}; stderr=${stderr}`,
        ),
      );
    });
  });
  child.removeAllListeners('exit');
  return { child, origin };
}

/**
 * Stops a launched host and waits for the process to actually exit. The
 * SIGKILL fallback escalates but never substitutes for the exit itself: a
 * caller that proceeds while the process lingers would race it for the
 * fixture tree it still serves, and a fresh-process protocol (SC-002) needs
 * the prior process ended, not merely signalled.
 */
export async function stopHost(host: LaunchedHost): Promise<void> {
  if (host.child.exitCode !== null || host.child.signalCode !== null) {
    return;
  }
  const exited = new Promise<void>((resolve) => {
    host.child.once('exit', () => resolve());
  });
  host.child.kill('SIGINT');
  const escalation = setTimeout(() => {
    host.child.kill('SIGKILL');
  }, 10_000);
  await exited;
  clearTimeout(escalation);
}
