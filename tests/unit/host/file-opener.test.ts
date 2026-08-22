// T1123: handing one committed file to an application on the reader's machine
// (FR-022, contracts/http-api.md § open-file). Covers which applications a
// probed machine offers, the launch each target performs — including the one
// platform split, macOS spawning the resolved launcher where every other
// platform goes through the `open` package — and the refusal to launch an
// editor the probe did not find.
import { afterEach, describe, expect, it, vi } from 'vitest';

import open from 'open';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { DetectedFileOpener } from '../../../src/server/host/file-opener';
import type { FileOpenTarget } from '../../../src/shared/api-types';

const { spawnMock, execFileAsyncMock } = vi.hoisted(() => ({
  // A real `ChildProcess` is an emitter the caller awaits `spawn` on before
  // detaching, so the double is one too: it emits `spawn` on the next tick,
  // which is what a successful launch does.
  spawnMock: vi.fn(() => {
    const child = new EventEmitter() as EventEmitter & { unref: () => void };
    child.unref = vi.fn();
    queueMicrotask(() => child.emit('spawn'));
    return child;
  }),
  execFileAsyncMock: vi.fn<(file: string, args: readonly string[]) => Promise<unknown>>(),
}));

vi.mock('node:child_process', () => ({
  spawn: spawnMock,
  // The module promisifies `execFile`; `promisify` resolves through this
  // shared-registry custom symbol, so the mock owns the promised shape.
  execFile: Object.assign(vi.fn(), {
    [Symbol.for('nodejs.util.promisify.custom')]: execFileAsyncMock,
  }),
}));
// `open` resolves with the launcher it spawned; the caller awaits that
// launcher's exit to learn whether the machine accepted the path, so the
// double is an emitter that exits cleanly.
vi.mock('open', () => ({
  default: vi.fn(async () => {
    // A launcher that has already handed the path over: `exitCode` is set,
    // which is the state the caller reads before it would await the event.
    const launcher = Object.assign(new EventEmitter(), { exitCode: 0 });
    return launcher as never;
  }),
}));

const LAUNCHER = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
const SUBLIME_LAUNCHER = '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl';
const TERMINAL_EDITOR = '/usr/bin/vim';
const FILE = '/repo/.agents/AGENTS.md';

/** An opener holding one resolved editor launcher, as a probe would leave it. */
function openerWith(...launchers: readonly (readonly [FileOpenTarget, string])[]) {
  return new DetectedFileOpener(new Map(launchers));
}

const realPlatform = process.platform;
const realEditor = process.env['EDITOR'];
const realVisual = process.env['VISUAL'];

/** Sets, or clears, the variables the terminal-editor probe reads. */
function setConfiguredEditor(value: string | undefined): void {
  if (value === undefined) {
    delete process.env['EDITOR'];
    delete process.env['VISUAL'];
    return;
  }
  process.env['EDITOR'] = value;
  process.env['VISUAL'] = value;
}

/** Overrides the platform the opener reads; restored after every test. */
function setPlatform(value: NodeJS.Platform): void {
  Object.defineProperty(process, 'platform', { value, configurable: true });
}

afterEach(() => {
  setPlatform(realPlatform);
  setConfiguredEditor(undefined);
  if (realEditor !== undefined) {
    process.env['EDITOR'] = realEditor;
  }
  if (realVisual !== undefined) {
    process.env['VISUAL'] = realVisual;
  }
  vi.clearAllMocks();
});

describe('the applications a machine offers', () => {
  it('offers only what every machine has when no editor was found', () => {
    // FR-022: an application the host could not launch is absent from the
    // list rather than offered and left to silently do nothing. The two
    // targets that go through the machine's own handlers always remain.
    expect(openerWith().targets).toEqual(['default-application', 'containing-folder']);
  });

  it('offers each resolved editor first, in catalog order', () => {
    // The first published target is what a plain click uses, and a reader
    // inspecting the files an agent reads is reading them to edit them.
    expect(
      openerWith(['visual-studio-code', LAUNCHER], ['sublime-text', SUBLIME_LAUNCHER]).targets,
    ).toEqual(['visual-studio-code', 'sublime-text', 'default-application', 'containing-folder']);
  });

  it('offers only the editor the machine actually has', () => {
    expect(openerWith(['sublime-text', SUBLIME_LAUNCHER]).targets).toEqual([
      'sublime-text',
      'default-application',
      'containing-folder',
    ]);
  });

  it('finds the launcher this machine actually has', async () => {
    // The probe reads no inspected content and starts no process, so it can
    // run here; what it finds is the machine's, so only the invariant every
    // machine satisfies is asserted — the default handler is always offered,
    // and the editor appears exactly when a launcher was resolved.
    const opener = await DetectedFileOpener.probe();
    expect(opener.targets.slice(-2)).toEqual(['default-application', 'containing-folder']);
  });
});

describe('the terminal editor a machine can host', () => {
  it('offers none where the host cannot open a terminal window for one', async () => {
    // The window is opened through the macOS automation host, so nowhere else
    // can this product give a terminal editor somewhere to run.
    setPlatform('linux');
    setConfiguredEditor('vim');
    expect((await DetectedFileOpener.probe()).targets).not.toContain('terminal-editor');
  });

  it('offers the platform default when the reader has named no editor', async () => {
    // Nothing on macOS sets `$EDITOR`, so gating the target on it would hide
    // it from almost every machine. `vi` is the editor POSIX makes the
    // default and the one such a machine ships.
    setPlatform('darwin');
    setConfiguredEditor(undefined);
    expect((await DetectedFileOpener.probe()).targets).toContain('terminal-editor');
  });

  it('offers the terminal editor the reader named', async () => {
    setPlatform('darwin');
    setConfiguredEditor('vim');
    expect((await DetectedFileOpener.probe()).targets).toContain('terminal-editor');
  });

  it('offers the platform default when the named editor brings its own window', async () => {
    // Naming an editor with its own window is not having named a terminal
    // editor, so it answers exactly as an unset variable does. Taking the
    // target away instead would leave a reader who has a terminal — and whose
    // editor this product may have no entry of its own for — with neither.
    setPlatform('darwin');
    setConfiguredEditor('code');
    expect((await DetectedFileOpener.probe()).targets).toContain('terminal-editor');
  });
});

describe("opening through the machine's own handlers", () => {
  it('hands the path to the platform handler with no application named', async () => {
    await openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'default-application');
    expect(vi.mocked(open)).toHaveBeenCalledWith(FILE);
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('hands the directory to the same handler for the containing folder', async () => {
    // The folder is opened, and nothing inside it is selected: what the reader
    // asked for is the folder.
    await openerWith().openFile(FILE, 'containing-folder');
    expect(vi.mocked(open)).toHaveBeenCalledWith('/repo/.agents');
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe('opening in the resolved editor', () => {
  it('spawns the launcher directly on macOS', async () => {
    // macOS `open -a` takes an application, and the resolved launcher is the
    // editor's own command-line script inside the bundle.
    setPlatform('darwin');
    await openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'visual-studio-code');
    expect(vi.mocked(spawn)).toHaveBeenCalledWith(LAUNCHER, [FILE], {
      detached: true,
      stdio: 'ignore',
    });
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it('runs the launcher through the open package everywhere else', async () => {
    // The path stays one argument the package escapes itself, which is what
    // keeps a Windows `code.cmd` launch free of a shell (FR-022).
    setPlatform('win32');
    await openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'visual-studio-code');
    expect(vi.mocked(open)).toHaveBeenCalledWith(FILE, { app: { name: LAUNCHER } });
    expect(spawnMock).not.toHaveBeenCalled();
  });

  it('gives a terminal editor a window through the automation host', async () => {
    // The one launch whose argument reaches a shell (FR-022). What keeps it
    // safe is that the path is an argument to a fixed script rather than text
    // concatenated into it: the script's own `quoted form of` puts it into the
    // command line, so a name holding shell metacharacters stays one argument.
    setPlatform('darwin');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await openerWith(['terminal-editor', TERMINAL_EDITOR]).openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      TERMINAL_EDITOR,
      FILE,
    ]);
    expect(spawnMock).not.toHaveBeenCalled();
    expect(vi.mocked(open)).not.toHaveBeenCalled();
  });

  it('bounds the wait on the automation consent dialog', async () => {
    // macOS gates the first Apple event behind a one-time consent dialog; an
    // unanswered one would otherwise hold the request for the automation
    // host's own default.
    setPlatform('darwin');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await openerWith(['terminal-editor', TERMINAL_EDITOR]).openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock.mock.calls[0]?.[1][1]).toContain('with timeout of 30 seconds');
  });

  it('refuses a target the machine has no launcher for', async () => {
    // Only a client asking for a target the snapshot never published reaches
    // this, so it is an ordinary error rather than a functional outcome.
    await expect(openerWith().openFile(FILE, 'visual-studio-code')).rejects.toThrow(
      /visual-studio-code/u,
    );
    expect(vi.mocked(open)).not.toHaveBeenCalled();
    expect(spawnMock).not.toHaveBeenCalled();
  });
});

describe('a launch the machine refuses (T1123)', () => {
  it('rejects instead of letting the emitter throw the unhandled error', async () => {
    // The launcher was probed and is gone, unexecutable, or the machine is out
    // of processes: `spawn` emits `error`, and an `error` event nobody listens
    // for is thrown by the emitter — which would end the host on a click.
    setPlatform('darwin');
    vi.mocked(spawn).mockImplementationOnce((() => {
      const child = new EventEmitter() as EventEmitter & { unref: () => void };
      child.unref = vi.fn();
      queueMicrotask(() => child.emit('error', new Error('spawn EACCES')));
      return child;
    }) as never);
    await expect(
      openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'visual-studio-code'),
    ).rejects.toThrow('spawn EACCES');
  });
});

describe('a handler that refused the path (T1123)', () => {
  it('reports the refusal instead of answering that something opened', async () => {
    // A machine with no handler registered for the file type: the launcher
    // exits non-zero, and nothing opened.
    vi.mocked(open).mockImplementationOnce((async () =>
      Object.assign(new EventEmitter(), { exitCode: 3 })) as never);
    await expect(
      openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'default-application'),
    ).rejects.toThrow('exited with code 3');
  });
});
