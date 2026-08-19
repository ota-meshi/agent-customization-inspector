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

/** Resolves the probe with the given `ps cax` output. */
function probeFinds(stdout: string): void {
  execFileAsyncMock.mockResolvedValueOnce({ stdout });
}

afterEach(() => {
  setPlatform(realPlatform);
  vi.clearAllMocks();
});

describe('openStartupBrowser on macOS', () => {
  it('runs the fixed reuse script against a running Chromium-family browser', async () => {
    setPlatform('darwin');
    probeFinds('loginwindow\nGoogle Chrome\nTerminal\n');
    execFileAsyncMock.mockResolvedValueOnce({ stdout: '' });
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(1, 'ps', ['cax']);
    // The closed argument set (FR-022): the fixed script, the session URL,
    // and the fixed-list application name — nothing inspection-derived.
    expect(execFileAsyncMock).toHaveBeenNthCalledWith(2, 'osascript', [
      '-l',
      'JavaScript',
      '-e',
      expect.stringContaining('lookupTabWithUrl'),
      SESSION_URL,
      'Google Chrome',
    ]);
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it('prefers the fixed list order over the process-list order', async () => {
    setPlatform('darwin');
    // `ps` reports Edge before Chrome; the closed list ranks Chrome variants
    // first, so the pick is the list's, deterministic across hosts.
    probeFinds('Microsoft Edge\nGoogle Chrome\n');
    execFileAsyncMock.mockResolvedValueOnce({ stdout: '' });
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock.mock.calls[1]![1]).toContain('Google Chrome');
  });

  it('falls back to open when no Chromium-family application is running', async () => {
    setPlatform('darwin');
    probeFinds('loginwindow\nSafari\nfirefox\n');
    await openStartupBrowser(SESSION_URL);
    expect(execFileAsyncMock).toHaveBeenCalledTimes(1);
    expect(vi.mocked(open)).toHaveBeenCalledWith(SESSION_URL);
  });

  it('falls back to open when the reuse script fails', async () => {
    setPlatform('darwin');
    probeFinds('Google Chrome\n');
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
