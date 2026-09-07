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
import { execFile, spawn, type ChildProcessByStdio } from 'node:child_process';
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
 *
 * `--port 0` is added to every launch: these assertions read the origin off
 * that line and never name a port, while devframe's fixed default is a port
 * the machine's owner may be reserving (AGENTS.md § Agent-started process
 * policy).
 */
async function launchCli(
  workingDirectory: string,
  args: readonly string[],
  nodeArguments: readonly string[] = [],
): Promise<LaunchedCli> {
  const child = spawn(process.execPath, [...nodeArguments, CLI_ENTRY, '--port', '0', ...args], {
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

/**
 * Runs the packaged CLI to completion and returns what it wrote and exited
 * with. For the invocations that are supposed to finish by themselves — a
 * rejected option, `--help` — where waiting for a launch line would only time
 * out.
 */
async function runToCompletion(
  args: readonly string[],
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  const child = spawn(process.execPath, [CLI_ENTRY, ...args], {
    cwd: tmpdir(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk: string) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk: string) => {
    stderr += chunk;
  });
  const code = await new Promise<number | null>((resolve) => {
    child.once('exit', (exitCode) => resolve(exitCode));
  });
  return { code, stdout, stderr };
}

/**
 * Asks a launched CLI which root its session actually selected, through the
 * session API a browser would use.
 *
 * The launch line carries only the origin, and the selected root reaches no
 * HTML — it is a field of the session snapshot — so a test that wants to know
 * which of two `--root` values won has to ask. The read runs in its own Node
 * process because `devframe/client` resolves its socket URL against
 * `globalThis.location`, which this one does not have.
 */
async function readSelectedRootLabel(origin: string): Promise<string> {
  const script = [
    'globalThis.location = new URL(`${process.env.ACI_ORIGIN}/`);',
    "const { connectDevframe } = await import('devframe/client');",
    'const rpc = await connectDevframe({ simpleAuth: false, baseURL: process.env.ACI_ORIGIN });',
    "const session = await rpc.call('agent-customization-inspector:get-session');",
    'process.stdout.write(session.data.sources[0].boundary.displayRoot, () => process.exit(0));',
  ].join('\n');
  return new Promise<string>((resolve, reject) => {
    execFile(
      process.execPath,
      ['--input-type=module', '-e', script],
      { cwd: REPO_ROOT, env: { ...process.env, ACI_ORIGIN: origin }, timeout: 60_000 },
      (error, stdout, stderr) => {
        if (error !== null) {
          reject(new Error(`the session read-back failed: ${stderr || error.message}`));
          return;
        }
        resolve(stdout);
      },
    );
  });
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

describe('the packaged root selection and its modes (T917)', () => {
  let fixture: string;

  beforeAll(async () => {
    fixture = await mkdtemp(join(tmpdir(), 'aci-npx-root-'));
    await writeFile(join(fixture, 'AGENTS.md'), '# fixture instructions\n', 'utf8');
  }, 30_000);

  afterAll(async () => {
    if (fixture !== undefined) {
      await rm(fixture, { recursive: true, force: true });
    }
  }, 30_000);

  it('inspects the invocation directory when `--root` is omitted', async () => {
    // `--root` is optional: launched inside a repository, the packaged CLI
    // inspects the directory it was invoked from. The unit suite owns which
    // string is captured; what is packaged-only is that the launch works with
    // no option at all and serves that tree.
    const launched = await launchCli(fixture, ['--no-open']);
    try {
      expect(launched.origin).toMatch(LOOPBACK_LAUNCH_LINE);
      const response = await fetch(new URL('/', launched.origin));
      expect(response.status).toBe(200);
    } finally {
      await shutdown(launched);
    }
  }, 60_000);

  it('takes the parser’s last value for a repeated `--root`', async () => {
    // A repeated option is the parser's to resolve, and it resolves to the
    // last value. Which root won is not visible in the launch line — a root
    // that cannot be read still launches and still prints one, with its own
    // diagnostic on the Source (FR-002) — so the session itself is asked.
    const other = await mkdtemp(join(tmpdir(), 'aci-npx-other-root-'));
    try {
      const launched = await launchCli(tmpdir(), ['--no-open', '--root', other, '--root', fixture]);
      try {
        expect(launched.origin).toMatch(LOOPBACK_LAUNCH_LINE);
        expect(await readSelectedRootLabel(launched.origin)).toBe(fixture);
      } finally {
        await shutdown(launched);
      }
    } finally {
      await rm(other, { recursive: true, force: true });
    }
  }, 90_000);

  it('changes no working directory and opens no outbound connection', async () => {
    // Instrumented from outside the product: the preload replaces
    // `process.chdir` and every outbound-connection entry point with throwing
    // stubs, so a launch that reaches any of them fails instead of passing
    // quietly. Root selection is lexical (`node:path` only) and the product
    // issues no outbound request at all (FR-022), so the launch must survive
    // all of it.
    const probeDirectory = await mkdtemp(join(tmpdir(), 'aci-npx-probe-'));
    const probe = join(probeDirectory, 'probe.mjs');
    await writeFile(
      probe,
      [
        "import { syncBuiltinESMExports } from 'node:module';",
        "import net from 'node:net';",
        "import http from 'node:http';",
        "import https from 'node:https';",
        'process.chdir = () => {',
        "  throw new Error('the packaged CLI called process.chdir');",
        '};',
        'net.connect = () => {',
        "  throw new Error('the packaged CLI opened an outbound connection');",
        '};',
        'net.createConnection = net.connect;',
        'http.request = () => {',
        "  throw new Error('the packaged CLI issued an outbound http request');",
        '};',
        'https.request = () => {',
        "  throw new Error('the packaged CLI issued an outbound https request');",
        '};',
        '// A builtin materializes its named exports when it is first imported,',
        '// so replacing a property on the default export leaves every',
        "// `import { connect } from 'node:net'` bound to the original. This is",
        '// what Node provides to republish them, and without it the probe',
        '// would watch a door nothing uses.',
        'syncBuiltinESMExports();',
        '',
      ].join('\n'),
      'utf8',
    );
    try {
      const launched = await launchCli(
        tmpdir(),
        ['--no-open', '--root', fixture],
        ['--import', probe],
      );
      try {
        expect(launched.origin).toMatch(LOOPBACK_LAUNCH_LINE);
        expect(launched.stderr()).toBe('');
      } finally {
        await shutdown(launched);
      }
    } finally {
      await rm(probeDirectory, { recursive: true, force: true });
    }
  }, 60_000);

  it('offers one mode: no subcommand, no second thing it can be asked to do', async () => {
    // Zero extra modes. `--help` is the whole surface, and it names options
    // rather than commands: a packaged tool that grew a second mode would
    // list it here.
    const help = await runToCompletion(['--help']);
    expect(help.code).toBe(0);
    expect(help.stdout).toContain('--root');
    expect(help.stdout).toContain('--no-open');
    expect(help.stdout.toLowerCase()).not.toContain('commands:');
    expect(help.stdout.toLowerCase()).not.toContain('subcommand');
  }, 30_000);

  it('rejects an empty root before it starts anything, saying nothing back', async () => {
    const empty = await runToCompletion(['--root', '']);
    expect(empty.code).toBe(1);
    // Fixed, actionable, and free of the value it rejected — a rejected value
    // is the reader's own text and never goes back to the terminal.
    expect(`${empty.stdout}${empty.stderr}`).toMatch(/--root/u);
    expect(empty.stdout).not.toContain('http://localhost');
  }, 30_000);
});
