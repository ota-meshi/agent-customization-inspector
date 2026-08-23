// T043: the Gunshi root command surface (FR-001, contracts/http-api.md
// § Host requirements #4/#5). Covers the positive default-true `open` flag
// and its generated `--no-open`, optional `--root <path>` with last-wins
// repetition, the one captured `process.cwd()`, purely lexical absolute and
// relative resolution, zero selection I/O and no `process.chdir()`, fixed
// actionable rejection of an empty option value and of operands, strict
// unknown-option rejection, non-binding help/version, and the single
// loopback launch line.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resolve } from 'node:path';

// The invocation directory is captured once when the CLI module loads, so
// the spy is installed before the dynamic import below and its value is the
// captured one for every test in this file.
const CAPTURED_CWD = resolve('/captured/invocation');
const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(CAPTURED_CWD);

vi.mock('../../src/server/host/devframe-app', () => ({
  startInspectorHost: vi.fn(),
  executeRepositoryScan: vi.fn(),
}));

// The machine this suite runs on is not consulted for the applications a
// session would offer. The real probe asks it whether each editor's command
// resolves, and that lookup reads `process.cwd()` on Windows — which the
// working-directory claim below would then see as the command re-reading it,
// though selection never does. What the probe publishes is proven in
// tests/unit/host/file-opener.test.ts.
vi.mock('../../src/server/host/file-opener', () => ({
  DetectedFileOpener: {
    // The two targets every machine satisfies through its own handlers, and
    // no editor: nothing here asks the session what it would open a file in.
    probe: async () => ({
      targets: ['default-application', 'containing-folder'],
      openFile: vi.fn(),
    }),
  },
}));

const { executeRepositoryScan, startInspectorHost } =
  await import('../../src/server/host/devframe-app');
const { runInspectorCli } = await import('../../src/server/cli');

/** The exact source-value-free CLI rejection for an empty `--root`. */
const ROOT_VALUE_REQUIRED = '--root requires a non-empty path value.';
/** The exact source-value-free CLI rejection for an extra operand. */
const NO_OPERANDS_ACCEPTED =
  'This command accepts options only. Pass the inspected repository root with --root <path>.';

/** The mocked host start, typed for its captured options. */
const startHost = vi.mocked(startInspectorHost);

/** The retained selected root of the session the run created. */
function selectedRoot(): string {
  const options = startHost.mock.calls[0]?.[0];
  if (options === undefined) {
    throw new Error('the host was never started');
  }
  return options.context.session.selectedRepositoryRoot;
}

let chdirSpy: ReturnType<typeof vi.spyOn>;
let logSpy: ReturnType<typeof vi.spyOn>;
let errorSpy: ReturnType<typeof vi.spyOn>;
let closeHost: ReturnType<typeof vi.fn>;
// A real run installs its shutdown handlers once; this file runs the command
// many times in one process, so each run's handlers are removed afterwards
// rather than accumulating on the shared process object.
let priorSignalListeners: Record<'SIGINT' | 'SIGTERM', unknown[]>;

beforeEach(() => {
  priorSignalListeners = {
    SIGINT: [...process.listeners('SIGINT')],
    SIGTERM: [...process.listeners('SIGTERM')],
  };
  vi.mocked(executeRepositoryScan).mockReset();
  vi.mocked(executeRepositoryScan).mockResolvedValue(undefined);
  startHost.mockReset();
  closeHost = vi.fn().mockResolvedValue(undefined);
  startHost.mockImplementation(async (options) => {
    await options.onReady?.({
      origin: 'http://localhost:9999',
      port: 9999,
      app: {} as never,
    });
    return {
      origin: 'http://localhost:9999',
      close: closeHost,
    } as never;
  });
  cwdSpy.mockClear();
  chdirSpy = vi.spyOn(process, 'chdir').mockImplementation(() => {});
  logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  process.exitCode = undefined;
});

afterEach(() => {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    for (const listener of process.listeners(signal)) {
      if (!priorSignalListeners[signal].includes(listener)) {
        process.removeListener(signal, listener);
      }
    }
  }
  chdirSpy.mockRestore();
  logSpy.mockRestore();
  errorSpy.mockRestore();
  process.exitCode = undefined;
});

describe('root selection', () => {
  it('propagates a process.cwd() failure before creating a session or browser', async () => {
    const failure = new Error('invocation directory unavailable');
    cwdSpy.mockImplementationOnce(() => {
      throw failure;
    });
    // Re-evaluate the entry module so its one module-load capture observes
    // the injected ownerless failure. The already imported command remains
    // available to the other tests in this file.
    vi.resetModules();
    await expect(import('../../src/server/cli')).rejects.toBe(failure);
    expect(startHost).not.toHaveBeenCalled();
    expect(executeRepositoryScan).not.toHaveBeenCalled();
  });

  it('uses the exact captured invocation directory when --root is omitted', async () => {
    await runInspectorCli([]);
    expect(selectedRoot()).toBe(CAPTURED_CWD);
    expect(startHost.mock.calls[0]?.[0].context.session.rootOptionValue).toBeNull();
  });

  it('keeps an absolute --root exactly as given', async () => {
    const absolute = resolve('/elsewhere/repo');
    await runInspectorCli(['--root', absolute]);
    expect(selectedRoot()).toBe(absolute);
  });

  it('resolves a relative --root against the captured invocation directory', async () => {
    await runInspectorCli(['--root', 'nested/repo']);
    expect(selectedRoot()).toBe(resolve(CAPTURED_CWD, 'nested/repo'));
  });

  it('resolves a repeated --root to the parser last value', async () => {
    await runInspectorCli(['--root', 'first', '--root', 'second']);
    expect(selectedRoot()).toBe(resolve(CAPTURED_CWD, 'second'));
  });

  it('never re-reads or changes the process working directory', async () => {
    await runInspectorCli(['--root', 'nested/repo']);
    // The one capture happened at module load; selection reads it again from
    // the retained string, never from the process.
    expect(cwdSpy).not.toHaveBeenCalled();
    expect(chdirSpy).not.toHaveBeenCalled();
  });
});

describe('browser opening', () => {
  it('defaults the positive open flag to true', async () => {
    await runInspectorCli([]);
    expect(startHost.mock.calls[0]?.[0].openBrowser).toBe(true);
  });

  it('disables opening through the generated --no-open', async () => {
    await runInspectorCli(['--no-open']);
    expect(startHost.mock.calls[0]?.[0].openBrowser).toBe(false);
  });

  it('prints the loopback URL exactly once as the manual fallback', async () => {
    await runInspectorCli(['--no-open']);
    expect(logSpy.mock.calls).toEqual([['http://localhost:9999/']]);
  });
});

describe('rejections before any session or browser exists', () => {
  it.each([
    ['a separate empty value', ['--root', '']],
    ['an inline empty value', ['--root=']],
  ])('rejects %s with the fixed source-value-free message', async (_label, argv) => {
    await runInspectorCli(argv);
    expect(errorSpy).toHaveBeenCalledWith(ROOT_VALUE_REQUIRED);
    expect(process.exitCode).toBe(1);
    expect(startHost).not.toHaveBeenCalled();
  });

  it('rejects a missing --root value through the parser type validation', async () => {
    // The parser owns "the option needs a value"; the product does not
    // re-implement that check (Implementation simplicity policy).
    await expect(runInspectorCli(['--root'])).rejects.toThrow();
    expect(startHost).not.toHaveBeenCalled();
  });

  it('rejects a positional operand', async () => {
    await runInspectorCli(['extra']);
    expect(errorSpy).toHaveBeenCalledWith(NO_OPERANDS_ACCEPTED);
    expect(process.exitCode).toBe(1);
    expect(startHost).not.toHaveBeenCalled();
  });

  it('rejects a rest argument after --', async () => {
    await runInspectorCli(['--', 'rest']);
    expect(errorSpy).toHaveBeenCalledWith(NO_OPERANDS_ACCEPTED);
    expect(process.exitCode).toBe(1);
    expect(startHost).not.toHaveBeenCalled();
  });

  it('rejects an undeclared option strictly', async () => {
    // Gunshi renders the validation errors and throws, so the entry's
    // top-level await exits nonzero without starting a host.
    await expect(runInspectorCli(['--unknown'])).rejects.toThrow();
    expect(startHost).not.toHaveBeenCalled();
  });

  it('never echoes a rejected option value back to the terminal', async () => {
    await runInspectorCli(['--root', '']);
    for (const call of errorSpy.mock.calls) {
      expect(String(call[0])).toBe(ROOT_VALUE_REQUIRED);
    }
  });
});

describe('non-binding help and version', () => {
  it('renders help without creating a session or opening a browser', async () => {
    await runInspectorCli(['--help']);
    expect(startHost).not.toHaveBeenCalled();
    expect(executeRepositoryScan).not.toHaveBeenCalled();
  });

  it('renders the version without creating a session or opening a browser', async () => {
    await runInspectorCli(['--version']);
    expect(startHost).not.toHaveBeenCalled();
    expect(executeRepositoryScan).not.toHaveBeenCalled();
  });
});

describe('automatic first scan', () => {
  it('starts exactly one Repository scan before host startup', async () => {
    await runInspectorCli(['--no-open']);
    expect(startHost).toHaveBeenCalledTimes(1);
    expect(executeRepositoryScan).toHaveBeenCalledTimes(1);
    const [, , sourceId, owner] = vi.mocked(executeRepositoryScan).mock.calls[0] ?? [];
    expect(typeof sourceId).toBe('string');
    expect(owner).toBe('repository');
  });

  it('commits the automatic scan before publishing or opening the launch URL', async () => {
    const order: string[] = [];
    vi.mocked(executeRepositoryScan).mockImplementationOnce(async () => {
      order.push('scan-committed');
    });
    logSpy.mockImplementation(() => {
      order.push('launch-line');
    });
    startHost.mockImplementationOnce(async (options) => {
      order.push('host-listening');
      await options.onReady?.({
        origin: 'http://localhost:9999',
        port: 9999,
        app: {} as never,
      });
      // The host spawns its `open` browser helper only after onReady resolves.
      order.push('browser-open');
      return {
        origin: 'http://localhost:9999',
        close: closeHost,
      } as never;
    });

    await runInspectorCli([]);

    expect(order).toEqual(['scan-committed', 'host-listening', 'launch-line', 'browser-open']);
  });

  it('propagates an automatic-scan rejection before URL publication or browser opening', async () => {
    const failure = new Error('automatic scan collapsed');
    const order: string[] = [];
    vi.mocked(executeRepositoryScan).mockImplementationOnce(async () => {
      order.push('scan-started');
      throw failure;
    });
    await expect(runInspectorCli([])).rejects.toBe(failure);

    expect(order).toEqual(['scan-started']);
    expect(startHost).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
    expect(closeHost).not.toHaveBeenCalled();
  });
});

describe('graceful shutdown', () => {
  it.each(['SIGINT', 'SIGTERM'] as const)('closes the host once on %s', async (signal) => {
    await runInspectorCli(['--no-open']);
    const addedListeners = process
      .listeners(signal)
      .filter((listener) => !priorSignalListeners[signal].includes(listener));
    expect(addedListeners).toHaveLength(1);
    addedListeners[0]?.(signal);
    expect(closeHost).toHaveBeenCalledTimes(1);
  });

  it('closes after an interrupt between URL publication and host-handle return', async () => {
    startHost.mockImplementationOnce(async (options) => {
      await options.onReady?.({
        origin: 'http://localhost:9999',
        port: 9999,
        app: {} as never,
      });
      const addedListeners = process
        .listeners('SIGINT')
        .filter((listener) => !priorSignalListeners.SIGINT.includes(listener));
      expect(addedListeners).toHaveLength(1);
      addedListeners[0]?.('SIGINT');
      expect(closeHost).not.toHaveBeenCalled();
      return {
        origin: 'http://localhost:9999',
        close: closeHost,
      } as never;
    });

    await runInspectorCli(['--no-open']);

    expect(closeHost).toHaveBeenCalledTimes(1);
  });

  it('reports a rejected close and fails the launch instead of dropping it', async () => {
    // Shutdown after the handle exists is started from a signal handler with
    // no caller left to await it. An unreported rejection would exit zero,
    // telling the user the inspector shut down cleanly when it did not.
    const failure = new Error('close failed');
    closeHost.mockRejectedValueOnce(failure);
    const reported = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    await runInspectorCli(['--no-open']);
    const addedListeners = process
      .listeners('SIGINT')
      .filter((listener) => !priorSignalListeners.SIGINT.includes(listener));
    addedListeners[0]?.('SIGINT');
    // The handler cannot be awaited, so the rejection settles a turn later.
    await Promise.resolve();
    await Promise.resolve();
    expect(reported).toHaveBeenCalledWith(failure);
    expect(process.exitCode).toBe(1);
    reported.mockRestore();
  });
});
