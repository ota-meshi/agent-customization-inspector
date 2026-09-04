// The two callers of Global enable own a post-acceptance batch failure
// differently. The CLI has no running host on which to retain and display the
// failure, so startup propagates it before publishing a launch URL. The RPC
// caller already has that host and returns the queued acceptance while the
// session retains the failed batch status (T046; contracts/http-api.md
// § enable-global).
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { InspectionSession, SessionCoordinator } from '../../src/server/session/session';
import type {
  CommandResult,
  GlobalConsentPreviewDto,
  GlobalEnableResultDto,
} from '../../src/shared/api-types';
import { RecordingFileOpener } from '../fixtures/file-opener';

const mocks = vi.hoisted(() => ({
  executeRepositoryScan: vi.fn(),
  fileOpenerProbe: vi.fn(),
  runSourceScan: vi.fn(),
  startInspectorHost: vi.fn(),
}));

// Leave the CLI and Global orchestration real. Only the filesystem scan at
// the center of the admitted batch fails, so this exercises the actual
// caller boundary rather than teaching a mock of `runGlobalEnable` what the
// production helper ought to do.
vi.mock('../../src/server/inspection/scan', () => ({
  runSourceScan: mocks.runSourceScan,
}));

vi.mock('../../src/server/host/devframe-app', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/host/devframe-app')>();
  return {
    ...actual,
    executeRepositoryScan: mocks.executeRepositoryScan,
    startInspectorHost: mocks.startInspectorHost,
  };
});

// Launcher discovery is unrelated machine state and must not inspect or open
// applications on the test runner. Keep the module's other exports real for
// the host definition exercised by the RPC guard below.
vi.mock('../../src/server/host/file-opener', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/server/host/file-opener')>();
  return {
    ...actual,
    DetectedFileOpener: { probe: mocks.fileOpenerProbe },
  };
});

const { createInspectorDevframe, executeRepositoryScan, startInspectorHost } =
  await import('../../src/server/host/devframe-app');
const { runSourceScan } = await import('../../src/server/inspection/scan');
const { runInspectorCli } = await import('../../src/server/cli');

/** One registered RPC function as captured from the definition's `setup`. */
interface CapturedRpcFunction {
  readonly name: string;
  readonly type: string;
  readonly handler: (...args: never[]) => unknown;
}

/** The data payload of a command success, or a failure naming its response. */
function acceptedData<Data>(result: unknown): Data {
  const success = result as CommandResult<Data>;
  if (typeof success !== 'object' || success === null || !('data' in success)) {
    throw new Error(`expected an acceptance, got ${JSON.stringify(result)}`);
  }
  return success.data;
}

const MANAGED_ENVIRONMENT = ['COPILOT_HOME', 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'HOME'] as const;
const realEnvironment = Object.fromEntries(
  MANAGED_ENVIRONMENT.map((variable) => [variable, process.env[variable]]),
) as Record<(typeof MANAGED_ENVIRONMENT)[number], string | undefined>;

describe('post-acceptance Global batch failure ownership', () => {
  let batchFailure: Error;
  let base: string;
  let repositoryRoot: string;
  let logSpy: ReturnType<typeof vi.spyOn>;
  let priorSignalListeners: Record<'SIGINT' | 'SIGTERM', unknown[]>;

  beforeEach(() => {
    base = mkdtempSync(join(tmpdir(), 'aci-cli-global-failure-'));
    repositoryRoot = join(base, 'repository');
    const codexHome = join(base, 'codex');
    const ordinaryHome = join(base, 'home');
    mkdirSync(repositoryRoot);
    mkdirSync(codexHome);
    mkdirSync(ordinaryHome);

    // Exactly one member is eligible and readable. The other environment
    // homes are explicit empty values, and the shared ~/.agents root does not
    // exist, so one rejected scan identifies the whole accepted batch.
    process.env.COPILOT_HOME = '';
    process.env.CLAUDE_CONFIG_DIR = '';
    process.env.CODEX_HOME = codexHome;
    process.env.HOME = ordinaryHome;

    batchFailure = new Error('injected accepted Global batch failure');
    vi.mocked(runSourceScan).mockReset();
    vi.mocked(runSourceScan).mockRejectedValue(batchFailure);
    vi.mocked(executeRepositoryScan).mockReset();
    vi.mocked(executeRepositoryScan).mockResolvedValue(undefined);
    mocks.fileOpenerProbe.mockReset();
    mocks.fileOpenerProbe.mockResolvedValue({
      targets: ['default-application', 'containing-folder'],
      openFile: vi.fn(),
    });
    vi.mocked(startInspectorHost).mockReset();
    vi.mocked(startInspectorHost).mockImplementation(async (options) => {
      await options.onReady?.({
        origin: 'http://localhost:9999',
        port: 9999,
        app: {} as never,
      });
      return {
        origin: 'http://localhost:9999',
        close: vi.fn().mockResolvedValue(undefined),
      } as never;
    });
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    priorSignalListeners = {
      SIGINT: [...process.listeners('SIGINT')],
      SIGTERM: [...process.listeners('SIGTERM')],
    };
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
    logSpy.mockRestore();
    process.exitCode = undefined;
    rmSync(base, { recursive: true, force: true });
    for (const variable of MANAGED_ENVIRONMENT) {
      const original = realEnvironment[variable];
      if (original === undefined) {
        Reflect.deleteProperty(process.env, variable);
      } else {
        process.env[variable] = original;
      }
    }
  });

  it('propagates the accepted batch failure before the CLI starts or announces a host', async () => {
    const outcome = await runInspectorCli([
      '--root',
      repositoryRoot,
      '--no-open',
      '--inspect-personal-setup',
    ]).then(
      () => ({ kind: 'resolved' as const }),
      (error: unknown) => ({ kind: 'rejected' as const, error }),
    );

    expect.soft(outcome.kind).toBe('rejected');
    if (outcome.kind === 'rejected') {
      expect.soft(outcome.error).toBe(batchFailure);
    }
    expect.soft(startInspectorHost).not.toHaveBeenCalled();
    expect(logSpy).not.toHaveBeenCalled();
  });

  it('retains the same failure on the RPC host while returning its queued acceptance', async () => {
    const session = new InspectionSession({
      invocationCwd: repositoryRoot,
      rootOptionValue: repositoryRoot,
      fileOpener: new RecordingFileOpener(),
    });
    const context = { session, coordinator: new SessionCoordinator(session) };
    const functions = new Map<string, CapturedRpcFunction>();
    createInspectorDevframe(context).setup?.(
      {
        rpc: {
          register(fn: CapturedRpcFunction) {
            functions.set(fn.name, fn);
          },
        },
      } as never,
      undefined as never,
    );
    const create = functions.get('agent-customization-inspector:create-global-consent-preview')!;
    const enable = functions.get('agent-customization-inspector:enable-global')!;
    const preview = acceptedData<GlobalConsentPreviewDto>(create.handler());
    const acceptance = acceptedData<GlobalEnableResultDto>(
      await (enable.handler as (body: unknown) => Promise<unknown>)({
        confirmed: true,
        allowlistVersion: preview.allowlistVersion,
        previewId: preview.previewId,
      }),
    );

    expect(acceptance).toMatchObject({
      state: 'queued',
      acceptedTools: ['codex'],
    });
    const snapshot = session.snapshot();
    expect(snapshot.globalGeneration).toBeNull();
    expect(snapshot.sources.filter((source) => source.kind === 'global')).toEqual([]);
    expect(snapshot.globalControl?.batchStatus).toMatchObject({
      phase: 'failed',
      failureRef: { kind: 'error', message: batchFailure.message },
    });
  });
});
