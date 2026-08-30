// T1098: the startup browser opener (FR-001, FR-022, research.md § 3).
// Covers the macOS Chromium tab reuse — the fixed `ps cax` probe, the fixed
// JXA reuse script run through `osascript` against the first fixed-list
// application found running, and the closed argument set none of which is
// inspection-derived — and the `open` fallback that runs on every other
// platform, when no Chromium-family application is running, when the reuse
// attempt fails, and whose own rejection propagates to the caller.
import { afterEach, describe, expect, it, vi } from 'vitest';

import open from 'open';
import { openStartupBrowser } from '../../../src/server/host/browser-opener';

const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock:
    vi.fn<(file: string, args: readonly string[]) => Promise<{ stdout: string }>>(),
}));

vi.mock('node:child_process', () => ({
  // The module promisifies `execFile`; `promisify` resolves through this
  // shared-registry custom symbol, so the mock owns the promised shape the
  // real `execFile` would produce.
  execFile: Object.assign(vi.fn(), {
    [Symbol.for('nodejs.util.promisify.custom')]: execFileAsyncMock,
  }),
}));
vi.mock('open', () => ({ default: vi.fn(async () => ({}) as never) }));

const SESSION_URL = 'http://localhost:1234/';

const realPlatform = process.platform;

/** Overrides the platform the opener reads; restored after every test. */
function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

/**
 * Resolves the probe with a `ps cax` listing of the named commands, rendered
 * in that command's own column layout — `PID TTY STAT TIME COMMAND`, header
 * included — because the parser matches a command name whole and reads it
 * out of that layout ({@link runningCommandNames}).
 */
function probeFinds(commands: readonly string[]): void {
  const lines = commands.map(
    (command, index) => `  ${String(100 + index)}   ??  Ss     0:01.00 ${command}`,
  );
  execFileAsyncMock.mockResolvedValueOnce({
    stdout: ['  PID   TT  STAT      TIME COMMAND', ...lines, ''].join('\n'),
  });
}

afterEach(() => {
  setPlatform(realPlatform);
  vi.clearAllMocks();
});

describe('openStartupBrowser on macOS', () => {
  it('runs the fixed reuse script against a running Chromium-family browser', async () => {
    setPlatform('darwin');
    probeFinds(['loginwindow', 'Google Chrome', 'Terminal']);
    execFileAsyncMock.mockResolvedValueOnce({ stdout: '' });
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(1, 'ps', ['cax'], { timeout: 2000 });
    // The closed argument set (FR-022): the fixed script, the session URL,
    // and the fixed-list application name — nothing inspection-derived.
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(
      2,
      'osascript',
      [
        '-l',
        'JavaScript',
        '-e',
        expect.stringContaining('lookupTabWithUrl'),
        SESSION_URL,
        'Google Chrome',
      ],
      { timeout: 10_000 },
    );
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it('prefers the fixed list order over the process-list order', async () => {
    setPlatform('darwin');
    // `ps` reports Edge before Chrome; the closed list ranks Chrome variants
    // first, so the pick is the list's, deterministic across hosts.
    probeFinds(['Microsoft Edge', 'Google Chrome']);
    execFileAsyncMock.mockResolvedValueOnce({ stdout: '' });
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock.mock.calls[1]![1]).toContain('Google Chrome');
  });

  it('reads a helper process as no browser of its own', async () => {
    // `ps cax` lists `Google Chrome Helper` and `(Renderer)` as command names
    // of their own, and one can outlive the browser: a substring test would
    // report Chrome as running, and the reuse script's `Application(name)`
    // would then launch the browser the reader had closed instead of leaving
    // the URL to the OS default handler.
    setPlatform('darwin');
    probeFinds(['Google Chrome Helper', 'Google Chrome Helper (Renderer)', 'loginwindow']);
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith(SESSION_URL);
  });

  it('falls back to open when no Chromium-family application is running', async () => {
    setPlatform('darwin');
    probeFinds(['loginwindow', 'Safari', 'firefox']);
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(open)).toHaveBeenCalledWith(SESSION_URL);
  });

  it('falls back to open when the reuse script fails', async () => {
    setPlatform('darwin');
    probeFinds(['Google Chrome']);
    // The rejection `osascript` reports when the user denies the one-time
    // automation consent, or when the application quit after the probe.
    execFileAsyncMock.mockRejectedValueOnce(new Error('Not authorized to send Apple events'));
    await openStartupBrowser(SESSION_URL);
    expect(vi.mocked(open)).toHaveBeenCalledWith(SESSION_URL);
  });

  it('falls back to open when the process-list probe fails', async () => {
    setPlatform('darwin');
    execFileAsyncMock.mockRejectedValueOnce(new Error('ps failed'));
    await openStartupBrowser(SESSION_URL);
    expect(vi.mocked(open)).toHaveBeenCalledWith(SESSION_URL);
  });
});

describe('openStartupBrowser elsewhere', () => {
  it('spawns no probe or script and hands the URL to open', async () => {
    setPlatform('linux');
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).not.toHaveBeenCalled();
    expect(vi.mocked(open)).toHaveBeenCalledWith(SESSION_URL);
  });

  it('propagates the fallback rejection to the caller that owns best-effort', async () => {
    setPlatform('linux');
    const failure = new Error('no helper available');
    vi.mocked(open).mockRejectedValueOnce(failure);
    // The host's onReady swallows this beside its printed launch line
    // (contracts/http-api.md § Host requirements #4/#5); the opener itself
    // reports it rather than deciding the policy.
    await expect(openStartupBrowser(SESSION_URL)).rejects.toBe(failure);
  });
});

describe('shutdown during the startup opener', () => {
  it('opens no fallback browser once a shutdown signal has arrived', async () => {
    // The signal can land while the reuse attempt runs: the fallback must
    // not open a fresh browser for a host that is already closing.
    setPlatform('darwin');
    let closing = false;
    execFileAsyncMock.mockImplementationOnce(async () => {
      // The probe is where the signal arrives in this scenario.
      closing = true;
      return { stdout: '' };
    });
    await openStartupBrowser(SESSION_URL, () => !closing);
    expect(open).not.toHaveBeenCalled();
  });

  it('opens nothing at all when the signal preceded the opener', async () => {
    await openStartupBrowser(SESSION_URL, () => false);
    expect(execFileAsyncMock).not.toHaveBeenCalled();
    expect(open).not.toHaveBeenCalled();
  });

  it('passes the shutdown signal to both child processes', async () => {
    // `shouldProceed` stops the next step; the AbortSignal is what interrupts
    // a wait already in progress — the reuse script blocks on the macOS
    // automation-consent dialog for up to its timeout, and shutdown must not
    // wait that out.
    setPlatform('darwin');
    probeFinds(['Google Chrome']);
    execFileAsyncMock.mockResolvedValueOnce({ stdout: '' });
    const controller = new AbortController();
    await openStartupBrowser(SESSION_URL, () => true, controller.signal);
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(1, 'ps', ['cax'], {
      timeout: 2000,
      signal: controller.signal,
    });
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(2, 'osascript', expect.any(Array), {
      timeout: 10_000,
      signal: controller.signal,
    });
  });

  it('runs no reuse script once the signal lands during the probe', async () => {
    // The signal arrives between `ps` and `osascript`: focusing a tab for a
    // closing host is the same wrong the fallback gate stops, so the reuse
    // asks again before the script — and the caller's own gate then stops
    // the `open` fallback too.
    setPlatform('darwin');
    let closing = false;
    execFileAsyncMock.mockImplementationOnce(async () => {
      closing = true;
      return { stdout: '  100   ??  Ss     0:01.00 Google Chrome\n' };
    });
    await openStartupBrowser(SESSION_URL, () => !closing);
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    expect(execFileAsyncMock).toHaveBeenCalledWith('ps', ['cax'], { timeout: 2000 });
    expect(open).not.toHaveBeenCalled();
  });
});
