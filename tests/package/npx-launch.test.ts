// T043: packaged launch of the built CLI (FR-001, contracts/http-api.md
// § Host requirements). Runs `dist/cli.mjs` the way an installed bin does —
// from a directory that is not the package directory — and asserts the exact
// packed manifest fields, the closed loopback launch line, the
// devframe-served packaged shell, the usable printed-URL fallback with
// `--no-open`, that the inspected fixture is never mutated, and graceful
// shutdown on an interrupt.
//
// Scope note: "isolated" here means launched with an unrelated working
// directory, which is what exercises packaged-asset resolution from
// `import.meta.url`. Installing a packed tarball into a fresh tree would
// additionally require a network install, which the package gate
// deliberately does not perform.
import { spawn, type ChildProcessByStdio } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { Readable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };

const REPO_ROOT = join(__dirname, '..', '..');
const CLI_ENTRY = join(REPO_ROOT, 'dist', 'cli.mjs');
/** The closed launch-line form: loopback host, devframe-selected port, root path. */
const LOOPBACK_LAUNCH_LINE = /^http:\/\/localhost:(\d+)\/$/u;

/** One launched CLI process plus everything the assertions need from it. */
interface LaunchedCli {
  readonly child: ChildProcessByStdio<null, Readable, Readable>;
  readonly origin: string;
  readonly stdout: () => string;
  readonly stderr: () => string;
}

/**
 * Launches the packaged CLI from `workingDirectory` and resolves once the
 * one launch line has been printed. The launch line is the contract's manual
 * fallback, so waiting for it is also the readiness signal.
 */
async function launchCli(workingDirectory: string, args: readonly string[]): Promise<LaunchedCli> {
  const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
    cwd: workingDirectory,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  const origin = await new Promise<string>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`the CLI printed no launch line; stdout=${stdout} stderr=${stderr}`));
    }, 30_000);
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      const match = stdout.split('\n').find((line) => LOOPBACK_LAUNCH_LINE.test(line.trim()));
      if (match !== undefined) {
        clearTimeout(timer);
        resolve(match.trim());
      }
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once('exit', (code) => {
      clearTimeout(timer);
      reject(new Error(`the CLI exited with code ${code}; stderr=${stderr}`));
    });
  });
  child.removeAllListeners('exit');
  return { child, origin, stdout: () => stdout, stderr: () => stderr };
}

/** Terminates a launched CLI and requires its graceful zero-code exit. */
async function shutdown(launched: LaunchedCli): Promise<number> {
  const exited = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve) => {
    launched.child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  launched.child.kill('SIGINT');
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      exited,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => {
          launched.child.kill('SIGKILL');
          reject(new Error('the CLI did not exit within 10 seconds after SIGINT'));
        }, 10_000);
      }),
    ]);
    if (result.signal !== null || result.code === null) {
      throw new Error(
        `the CLI did not exit gracefully; code=${String(result.code)} signal=${String(result.signal)}`,
      );
    }
    return result.code;
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

describe('packed manifest fields', () => {
  it('declares exactly the contracted bin, files, type, and engines', () => {
    expect(packageJson.bin).toEqual({ 'agent-customization-inspector': 'dist/cli.mjs' });
    expect(packageJson.files).toEqual(['dist', 'README.md', 'README.ja.md', 'LICENSE']);
    expect(packageJson.type).toBe('module');
    expect(packageJson.engines.node).toBe('^24.11.0 || ^26.0.0');
    // No lifecycle build/download hooks may run at install time.
    for (const hook of ['preinstall', 'install', 'postinstall', 'prepare', 'prepack']) {
      expect(packageJson.scripts).not.toHaveProperty(hook);
    }
  });

  it('omits main, module, and exports so only bin is a public entry', () => {
    expect(packageJson).not.toHaveProperty('main');
    expect(packageJson).not.toHaveProperty('module');
    expect(packageJson).not.toHaveProperty('exports');
  });
});

describe('packaged launch', () => {
  let fixture: string;
  let launched: LaunchedCli;

  beforeAll(async () => {
    await expect(
      stat(CLI_ENTRY),
      'run `pnpm run build` before the package suite: dist/cli.mjs is missing',
    ).resolves.toBeDefined();
    fixture = await mkdtemp(join(tmpdir(), 'aci-npx-'));
    await writeFile(join(fixture, 'AGENTS.md'), '# fixture instructions\n', 'utf8');
    // Launched from an unrelated working directory: the packaged shell must
    // resolve from the CLI's own location, never from the inspected tree.
    launched = await launchCli(tmpdir(), ['--no-open', '--root', fixture]);
  }, 60_000);

  afterAll(async () => {
    if (launched !== undefined) {
      await shutdown(launched);
    }
    if (fixture !== undefined) {
      await rm(fixture, { recursive: true, force: true });
    }
  }, 30_000);

  it('prints exactly one closed loopback URL', () => {
    expect(launched.origin).toMatch(LOOPBACK_LAUNCH_LINE);
    const printed = launched
      .stdout()
      .split('\n')
      .filter((line) => LOOPBACK_LAUNCH_LINE.test(line.trim()));
    expect(printed).toHaveLength(1);
  });

  it('serves the packaged SPA shell at the root path', async () => {
    const response = await fetch(launched.origin);
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('<div id="__nuxt">');
    // Static content carries no session or inspected data.
    expect(html).not.toContain('fixture instructions');
  });

  it('serves the same shell for a nested client route', async () => {
    const response = await fetch(`${launched.origin}files/anything`);
    expect(response.status).toBe(200);
    expect(await response.text()).toContain('<div id="__nuxt">');
  });

  it('emits no warning while the printed URL fallback is in use', () => {
    expect(launched.stderr()).toBe('');
  });

  it('leaves the inspected fixture unmodified', async () => {
    expect(await readdir(fixture)).toEqual(['AGENTS.md']);
    expect(await readFile(join(fixture, 'AGENTS.md'), 'utf8')).toBe('# fixture instructions\n');
  });
});

describe('graceful shutdown', () => {
  it('closes the loopback listener on an interrupt', async () => {
    const fixture = await mkdtemp(join(tmpdir(), 'aci-npx-shutdown-'));
    try {
      const launched = await launchCli(tmpdir(), ['--no-open', '--root', fixture]);
      await expect(shutdown(launched)).resolves.toBe(0);
      await expect(fetch(launched.origin)).rejects.toThrow();
    } finally {
      await rm(fixture, { recursive: true, force: true });
    }
  }, 60_000);
});
