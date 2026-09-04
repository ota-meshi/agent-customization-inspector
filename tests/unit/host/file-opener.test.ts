// T1123: handing one committed file to an application on the reader's machine
// (FR-022, contracts/http-api.md § open-file). Covers which applications a
// probed machine offers, the launch each target performs — including the one
// platform split, macOS spawning the resolved launcher where every other
// platform goes through the `open` package — and the refusal to launch an
// editor the probe did not find.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import open from 'open';
import { getEditor } from 'env-editor';
import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { delimiter, dirname, join, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { DetectedFileOpener } from '../../../src/server/host/file-opener';
import type { FileOpenTarget } from '../../../src/shared/api-types';

const { spawnMock, execFileAsyncMock, whichMock, resolvedCommands } = vi.hoisted(() => ({
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
  whichMock:
    vi.fn<
      (
        command: string,
        options: { nothrow: true; path?: string; all?: boolean },
      ) => Promise<string | string[] | null>
    >(),
  // The commands this file answers the machine lookup for itself, cleared
  // after every test. A command it holds no answer for is asked of the real
  // machine, which is what the probe does.
  resolvedCommands: new Map<string, string>(),
}));

// The probe's one question to a machine is whether a command resolves, so a
// claim about which command the rule asks for is unobservable on a machine
// that lacks it: a Windows runner has `vim` but no `vi`, and the terminal
// editor's platform default is `vi`. The lookup therefore answers from this
// file where it holds an answer, and from the real machine everywhere else —
// which is what keeps the probe's own integration with `env-editor`'s catalog
// exercised below.
vi.mock('which', async (importOriginal) => {
  const { default: realWhich } = await importOriginal<{ default: typeof import('which') }>();
  whichMock.mockImplementation(async (command, options) => {
    const held = resolvedCommands.get(command);
    if (held === undefined) {
      return realWhich(command, options as never);
    }
    return held;
  });
  return { default: whichMock };
});
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
    const launcher = Object.assign(new EventEmitter(), { exitCode: 0, signalCode: null });
    return launcher as never;
  }),
}));

const LAUNCHER = '/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code';
const SUBLIME_LAUNCHER = '/Applications/Sublime Text.app/Contents/SharedSupport/bin/subl';
/**
 * An absolute directory spelled with the running platform's own separator.
 *
 * The probe offers a resolution only when its directory is one PATH names,
 * and it compares the two after putting the PATH entry through `join`
 * (`file-opener.ts`). On Windows `join` rewrites `/` to `\` while `dirname`
 * of a `/`-spelled candidate keeps it, so a POSIX literal handed to `which`
 * and a PATH entry beside it never match and the editor is dropped from the
 * offer. Spelling both through this keeps the machine's two answers in the
 * one shape a machine would give them in.
 */
function machinePath(...segments: readonly string[]): string {
  return join(sep, ...segments);
}

/** The directory the terminal-editor answers below live in, and the one this
 *  file puts on PATH so the probe's named-directory membership accepts them. */
const TERMINAL_EDITOR_DIR = machinePath('usr', 'bin');
const TERMINAL_EDITOR = join(TERMINAL_EDITOR_DIR, 'vim');
const SAFE_BIN = machinePath('usr', 'local', 'bin');
const SAFE_CODE = join(SAFE_BIN, 'code');
/** The Repository root the probe is told it inspects; every PATH entry inside it is dropped. */
const REPOSITORY_ROOT = machinePath('repo');
/** The directory the host was started in, from which a relative entry is taken. */
const INVOCATION_CWD = machinePath('work');
/** One personal-setup member root, inspected content exactly as the repository is. */
const GLOBAL_ROOT = machinePath('home', '.claude');
const INSPECTED_ROOTS = [REPOSITORY_ROOT, GLOBAL_ROOT] as const;
const FILE = '/repo/.agents/AGENTS.md';

/** An opener holding one resolved editor launcher, as a probe would leave it. */
function openerWith(...launchers: readonly (readonly [FileOpenTarget, string])[]) {
  return new DetectedFileOpener(new Map(launchers));
}

const realPlatform = process.platform;
const realEditor = process.env['EDITOR'];
const realVisual = process.env['VISUAL'];
const realPath = process.env['PATH'];

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
  if (realPath === undefined) {
    delete process.env['PATH'];
  } else {
    process.env['PATH'] = realPath;
  }
  if (realEditor !== undefined) {
    process.env['EDITOR'] = realEditor;
  }
  if (realVisual !== undefined) {
    process.env['VISUAL'] = realVisual;
  }
  resolvedCommands.clear();
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
    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    expect(opener.targets.slice(-2)).toEqual(['default-application', 'containing-folder']);
  });
});

describe('the terminal editor a machine can host', () => {
  // The two commands these claims are about — the editor a reader can name and
  // the platform default the rule falls back to — so that what is asserted is
  // which command the rule asks for rather than which editors the machine
  // running the suite happens to have.
  beforeEach(() => {
    resolvedCommands.set(join(TERMINAL_EDITOR_DIR, 'vi'), join(TERMINAL_EDITOR_DIR, 'vi'));
    resolvedCommands.set(TERMINAL_EDITOR, TERMINAL_EDITOR);
    // A resolution is only offered when its directory is one PATH names, so
    // the directory these answers sit in has to be on it. The machine's own
    // PATH cannot be relied on for that: a Windows runner names no `/usr/bin`.
    process.env['PATH'] = TERMINAL_EDITOR_DIR;
  });

  it('offers none where the host cannot open a terminal window for one', async () => {
    // The window is opened through the macOS automation host, so nowhere else
    // can this product give a terminal editor somewhere to run.
    setPlatform('linux');
    setConfiguredEditor('vim');
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).not.toContain(
      'terminal-editor',
    );
  });

  it('offers the platform default when the reader has named no editor', async () => {
    // Nothing on macOS sets `$EDITOR`, so gating the target on it would hide
    // it from almost every machine. `vi` is the editor POSIX makes the
    // default and the one such a machine ships.
    setPlatform('darwin');
    setConfiguredEditor(undefined);
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).toContain(
      'terminal-editor',
    );
  });

  it('offers the terminal editor the reader named', async () => {
    setPlatform('darwin');
    setConfiguredEditor('vim');
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).toContain(
      'terminal-editor',
    );
  });

  it('offers the platform default when the named editor brings its own window', async () => {
    // Naming an editor with its own window is not having named a terminal
    // editor, so it answers exactly as an unset variable does. Taking the
    // target away instead would leave a reader who has a terminal — and whose
    // editor this product may have no entry of its own for — with neither.
    setPlatform('darwin');
    setConfiguredEditor('code');
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).toContain(
      'terminal-editor',
    );
  });

  it('drops every PATH entry inside the selected Repository root from the probe PATH', async () => {
    // Whatever the entry is called and however it is spelled — the package
    // manager's `node_modules/.bin`, with or without a trailing separator or
    // `.`, or a `bin` the repository put on PATH itself — an executable under
    // inspected content must never become the offered editor (FR-022), so
    // the exclusion judges each entry's resolved directory against the root.
    setPlatform('darwin');
    setConfiguredEditor('code');
    resolvedCommands.set(SAFE_CODE, SAFE_CODE);
    const previous = process.env['PATH'];
    process.env['PATH'] = [
      join(REPOSITORY_ROOT, 'node_modules', '.bin'),
      `${join(REPOSITORY_ROOT, 'node_modules', '.bin')}${sep}`,
      join(REPOSITORY_ROOT, 'node_modules', '.bin', '.'),
      join(REPOSITORY_ROOT, 'bin'),
      REPOSITORY_ROOT,
      SAFE_BIN,
    ].join(delimiter);
    try {
      await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    } finally {
      process.env['PATH'] = previous;
    }
    const probedCandidates = whichMock.mock.calls.map(([command]) => command);
    expect(probedCandidates).toContain(SAFE_CODE);
    for (const candidate of probedCandidates) {
      expect(candidate).not.toContain(REPOSITORY_ROOT);
    }
  });

  it('keeps a node_modules/.bin that is outside the selected Repository root', async () => {
    // The reader's own tooling elsewhere on the machine is exactly what the
    // contract promises to search (contracts/http-api.md § open-file): the
    // rule is the inspected root, not the entry's name, so a `node_modules/.bin`
    // under `/opt/tools` — or a directory merely named like one — stays.
    setPlatform('darwin');
    setConfiguredEditor('code');
    const first = machinePath('opt', 'tools', 'node_modules', '.bin');
    const second = machinePath('opt', 'notnode_modules', '.bin');
    const secondCode = join(second, 'code');
    resolvedCommands.set(secondCode, secondCode);
    const previous = process.env['PATH'];
    process.env['PATH'] = [first, second, SAFE_BIN].join(delimiter);
    try {
      await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    } finally {
      process.env['PATH'] = previous;
    }
    const probedCandidates = whichMock.mock.calls.map(([command]) => command);
    expect(probedCandidates).toContain(join(first, 'code'));
    expect(probedCandidates).toContain(secondCode);
  });

  it('drops every PATH entry inside a personal-setup member root as well', async () => {
    // A consented home is inspected content exactly as the repository is, so
    // an executable below it is refused by the same rule (FR-020, FR-022).
    setPlatform('darwin');
    setConfiguredEditor('code');
    resolvedCommands.set(SAFE_CODE, SAFE_CODE);
    const previous = process.env['PATH'];
    process.env['PATH'] = [join(GLOBAL_ROOT, 'local', 'bin'), GLOBAL_ROOT, SAFE_BIN].join(
      delimiter,
    );
    try {
      await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    } finally {
      process.env['PATH'] = previous;
    }
    const probedCandidates = whichMock.mock.calls.map(([command]) => command);
    expect(probedCandidates).toContain(SAFE_CODE);
    for (const candidate of probedCandidates) {
      expect(candidate).not.toContain(GLOBAL_ROOT);
    }
  });

  it('searches a relative PATH entry from the directory the host was started in', async () => {
    // What a shell started there would resolve `tools/bin` to, so the reader's
    // own entry is searched rather than dropped for being relative.
    setPlatform('darwin');
    setConfiguredEditor('code');
    const toolsBin = join(INVOCATION_CWD, 'tools', 'bin');
    resolvedCommands.set(join(toolsBin, 'code'), join(toolsBin, 'code'));
    const previous = process.env['PATH'];
    process.env['PATH'] = join('tools', 'bin');
    let opener: DetectedFileOpener;
    try {
      opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    } finally {
      process.env['PATH'] = previous;
    }
    const probedCandidates = whichMock.mock.calls.map(([command]) => command);
    expect(probedCandidates).toContain(join(toolsBin, 'code'));
    expect(opener.targets).toContain('visual-studio-code');
  });

  it('searches an empty PATH entry as the invocation directory when it is outside the roots', async () => {
    setPlatform('darwin');
    setConfiguredEditor('code');
    const invocationCode = join(INVOCATION_CWD, 'code');
    resolvedCommands.set(invocationCode, invocationCode);
    process.env['PATH'] = '';

    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);

    expect(whichMock.mock.calls.map(([command]) => command)).toContain(invocationCode);
    expect(opener.targets).toContain('visual-studio-code');
  });

  it('does not probe an empty PATH entry when the invocation directory is inspected', async () => {
    setPlatform('darwin');
    setConfiguredEditor('code');
    const inspectedCode = join(REPOSITORY_ROOT, 'code');
    resolvedCommands.set(inspectedCode, inspectedCode);
    process.env['PATH'] = '';

    await DetectedFileOpener.probe(REPOSITORY_ROOT, INSPECTED_ROOTS);

    expect(whichMock).not.toHaveBeenCalledWith(inspectedCode, expect.anything());
  });

  it('compares an inspected root without regard to case on macOS', async () => {
    // The default macOS volume reads `/REPO/bin/vim` and `/repo/bin/vim` as one
    // file, so a spelling that differs from the root's only in case is still
    // inside it; the comparison folds case rather than asking the volume.
    setPlatform('darwin');
    const inside = join(REPOSITORY_ROOT.toUpperCase(), 'bin', 'vim');
    setConfiguredEditor(inside);
    resolvedCommands.set(inside, inside);
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).not.toContain(
      'terminal-editor',
    );
  });

  it('refuses a configured editor that resolves inside an inspected root', async () => {
    // `EDITOR=/repo/bin/vim` names inspected content: the terminal editor is
    // not offered rather than started from there (FR-020, FR-022).
    setPlatform('darwin');
    const inside = join(REPOSITORY_ROOT, 'bin', 'vim');
    setConfiguredEditor(inside);
    resolvedCommands.set(inside, inside);
    expect((await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS)).targets).not.toContain(
      'terminal-editor',
    );
    expect(whichMock).not.toHaveBeenCalledWith(inside, expect.anything());
  });

  it('does not probe a catalog launcher inside an inspected root', async () => {
    setPlatform('linux');
    setConfiguredEditor(undefined);
    process.env['PATH'] = SAFE_BIN;
    const vscode = getEditor('vscode');
    const catalogPath = vscode.paths[0];
    expect(catalogPath).toBeDefined();
    const catalogCandidate = join(dirname(catalogPath!), vscode.binary);
    resolvedCommands.set(catalogCandidate, catalogCandidate);

    await DetectedFileOpener.probe(INVOCATION_CWD, [...INSPECTED_ROOTS, dirname(catalogCandidate)]);

    expect(whichMock).not.toHaveBeenCalledWith(catalogCandidate, expect.anything());
  });

  it('accepts a resolution inside a quoted PATH entry', async () => {
    // Windows permits quoted PATH entries and `which` strips the quotes
    // before resolving inside them; the named-directory membership must read
    // the entry the same way, or the editor `which` correctly resolved is
    // dropped from the offer.
    setPlatform('darwin');
    setConfiguredEditor('vim');
    const quotedDir = machinePath('Quoted Dir');
    resolvedCommands.set(join(quotedDir, 'vim'), join(quotedDir, 'vim'));
    const previous = process.env['PATH'];
    process.env['PATH'] = `"${quotedDir}"`;
    try {
      const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
      expect(opener.targets).toContain('terminal-editor');
      execFileAsyncMock.mockResolvedValueOnce(undefined);
      await opener.openFile(FILE, 'terminal-editor');
      expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
        '-e',
        expect.stringContaining('quoted form of'),
        join(quotedDir, 'vim'),
        FILE,
      ]);
    } finally {
      process.env['PATH'] = previous;
    }
  });

  it('runs an absolute terminal editor rather than the default of that name', async () => {
    // The catalog reads `/custom/bin/vi` as an unknown editor — it takes the
    // last segment as an id and no entry is named `vi` — so classifying by
    // the whole value would call the reader's own executable non-terminal
    // and start whatever `vi` PATH offers instead.
    setPlatform('darwin');
    setConfiguredEditor('/custom/bin/vi');
    resolvedCommands.set('/custom/bin/vi', '/custom/bin/vi');
    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      '/custom/bin/vi',
      FILE,
    ]);
  });

  it('keeps an absolute editor path that carries spaces, exactly as written', async () => {
    // `/Applications/Vim App/.../vim` and `vim -u NONE` read alike
    // lexically; the resolution tells them apart, because `which` checks a
    // separator-carrying value directly. A real executable at the exact
    // spelling is what the reader named, so that is what runs — never the
    // PATH's own `vim`.
    setPlatform('darwin');
    const spacedPath = '/Applications/Vim App/Contents/MacOS/vim';
    setConfiguredEditor(spacedPath);
    resolvedCommands.set(spacedPath, spacedPath);
    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      spacedPath,
      FILE,
    ]);
  });

  it('resolves a relative separator-carrying editor from the invocation directory', async () => {
    // A shell started in the invocation directory takes `bin/vim` from there,
    // so the probe does too when that directory is outside every inspected
    // root.
    setPlatform('darwin');
    setConfiguredEditor('bin/vim');
    const relativeEditor = join(INVOCATION_CWD, 'bin', 'vim');
    resolvedCommands.set(relativeEditor, relativeEditor);
    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      relativeEditor,
      FILE,
    ]);
  });

  it('falls back rather than resolving a relative editor inside an inspected root', async () => {
    // The same spelling becomes inspected content when the host starts in the
    // selected Repository root. It is refused, and only the catalog command
    // outside that root may be offered (FR-020, FR-022).
    setPlatform('darwin');
    setConfiguredEditor('bin/vim');
    const inspectedEditor = join(REPOSITORY_ROOT, 'bin', 'vim');
    resolvedCommands.set(inspectedEditor, inspectedEditor);
    const opener = await DetectedFileOpener.probe(REPOSITORY_ROOT, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      TERMINAL_EDITOR,
      FILE,
    ]);
  });

  it('falls back to the catalog command for a flags-carrying editor value', async () => {
    // `vim -u NONE` resolves nowhere as a single spelling, so the catalog's
    // own command for the named editor is what runs, flags unhonoured.
    setPlatform('darwin');
    setConfiguredEditor('vim -u NONE');
    const opener = await DetectedFileOpener.probe(INVOCATION_CWD, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      TERMINAL_EDITOR,
      FILE,
    ]);
  });

  it('never lets a Windows lookup inject the inspected working directory', async () => {
    // Every lookup receives an absolute path in a named safe directory, so
    // `which` never gets the bare command that would make its Windows branch
    // prepend the inspected process working directory (FR-022).
    setPlatform('darwin');
    setConfiguredEditor(undefined);
    const injected = join(REPOSITORY_ROOT, 'vi');
    const named = join(TERMINAL_EDITOR_DIR, 'vi');
    resolvedCommands.set(injected, injected);
    resolvedCommands.set(named, named);
    const opener = await DetectedFileOpener.probe(REPOSITORY_ROOT, INSPECTED_ROOTS);
    expect(opener.targets).toContain('terminal-editor');
    execFileAsyncMock.mockResolvedValueOnce(undefined);
    await opener.openFile(FILE, 'terminal-editor');
    expect(whichMock).not.toHaveBeenCalledWith('vi', expect.anything());
    expect(whichMock).not.toHaveBeenCalledWith(injected, expect.anything());
    expect(execFileAsyncMock).toHaveBeenCalledWith('osascript', [
      '-e',
      expect.stringContaining('quoted form of'),
      named,
      FILE,
    ]);
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
  it('hands the document to LaunchServices by application name on macOS', async () => {
    // Not the resolved launcher: that command-line script reads the editor's
    // user data directory from `HOME`, so a host whose `HOME` is not the
    // reader's own starts a second instance under it and the file opens
    // nowhere. `open -a` takes the application name, which the editor catalog
    // publishes, and reaches the editor already running.
    setPlatform('darwin');
    await openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'visual-studio-code');
    expect(vi.mocked(open)).toHaveBeenCalledWith(FILE, {
      app: { name: 'Visual Studio Code' },
    });
    expect(vi.mocked(spawn)).not.toHaveBeenCalled();
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
  it('reports the refusal instead of answering that something opened', async () => {
    // The application was probed and has since been removed, so LaunchServices
    // has no bundle under that name: the launcher rejects, and the reader is
    // told rather than being answered that their file opened.
    setPlatform('darwin');
    vi.mocked(open).mockImplementationOnce((async () => {
      throw new Error('Unable to find application named Visual Studio Code');
    }) as never);
    await expect(
      openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'visual-studio-code'),
    ).rejects.toThrow('Unable to find application named Visual Studio Code');
  });
});

describe('a handler that refused the path (T1123)', () => {
  it('reports the refusal instead of answering that something opened', async () => {
    // A machine with no handler registered for the file type: the launcher
    // exits non-zero, and nothing opened.
    vi.mocked(open).mockImplementationOnce((async () =>
      Object.assign(new EventEmitter(), { exitCode: 3, signalCode: null })) as never);
    await expect(
      openerWith(['visual-studio-code', LAUNCHER]).openFile(FILE, 'default-application'),
    ).rejects.toThrow('exited with code 3');
  });

  it('reports a refusal that arrives as the exit event within the grace period', async () => {
    // The same refusal a beat later: the launcher is still running when the
    // listener attaches and exits non-zero moments after.
    const launcher = Object.assign(new EventEmitter(), {
      exitCode: null,
      unref: vi.fn(),
      signalCode: null,
    });
    vi.mocked(open).mockImplementationOnce((async () => launcher) as never);
    const opened = openerWith().openFile(FILE, 'default-application');
    queueMicrotask(() => launcher.emit('exit', 4));
    await expect(opened).rejects.toThrow('exited with code 4');
    expect(launcher.unref).not.toHaveBeenCalled();
  });

  it('reports a launcher the machine killed rather than a clean exit', async () => {
    // Node reports the two halves of an exit separately: a launcher killed by
    // a signal exits with a null code and a non-null signal
    // (nodejs.org/api/child_process.html#event-exit), and reading the code
    // alone would take that for the zero a successful hand-off has.
    const launcher = Object.assign(new EventEmitter(), {
      exitCode: null,
      signalCode: null,
      unref: vi.fn(),
    });
    vi.mocked(open).mockImplementationOnce((async () => launcher) as never);
    const opened = openerWith().openFile(FILE, 'default-application');
    queueMicrotask(() => launcher.emit('exit', null, 'SIGKILL'));
    await expect(opened).rejects.toThrow('terminated by SIGKILL');
  });

  it('reports a launcher that had already been killed when the read happened', async () => {
    // The same state read synchronously: a launcher that exited before the
    // listener could attach reports through `signalCode`, which a read of
    // `exitCode` alone would see as null and treat as still running.
    vi.mocked(open).mockImplementationOnce((async () =>
      Object.assign(new EventEmitter(), {
        exitCode: null,
        signalCode: 'SIGTERM',
        unref: vi.fn(),
      })) as never);
    await expect(openerWith().openFile(FILE, 'default-application')).rejects.toThrow(
      'terminated by SIGTERM',
    );
  });

  it('waits out the portal timeout inside a Flatpak sandbox and reports its refusal', async () => {
    // Inside Flatpak the bundled `xdg-open` never keeps running: it calls the
    // desktop portal with `gdbus call --timeout 5` and exits either way
    // (open/xdg-open § open_flatpak), so a refusal can arrive as a non-zero
    // exit several seconds in. The one-second grace would have answered
    // `opened` before the refusal existed; the sandbox's own `FLATPAK_ID`
    // export is what detects it, and the grace stretches past the portal's
    // own timeout.
    const savedFlatpakId = process.env.FLATPAK_ID;
    process.env.FLATPAK_ID = 'org.example.Inspector';
    try {
      const launcher = Object.assign(new EventEmitter(), {
        exitCode: null,
        unref: vi.fn(),
        signalCode: null,
      });
      vi.mocked(open).mockImplementationOnce((async () => launcher) as never);
      const opened = openerWith().openFile(FILE, 'default-application');
      // Real time, deliberately: fake timers do not reach
      // `node:timers/promises`, and the point is exactly that the refusal
      // lands after the ordinary one-second grace has passed.
      await delay(1100);
      launcher.emit('exit', 4);
      await expect(opened).rejects.toThrow('exited with code 4');
      expect(launcher.unref).not.toHaveBeenCalled();
    } finally {
      if (savedFlatpakId === undefined) {
        Reflect.deleteProperty(process.env, 'FLATPAK_ID');
      } else {
        process.env.FLATPAK_ID = savedFlatpakId;
      }
    }
  });

  it('resolves without waiting for a launcher that keeps running', async () => {
    // The bundled `xdg-open`'s success shape: it deliberately does not fork
    // the application off, so it lives for the application's whole session
    // (open/xdg-open § "In case of success"). The launch must resolve once
    // the grace period passes with no exit — waiting for one would hold the
    // open control's whole menu until the reader closes the application —
    // and release the process.
    vi.useFakeTimers();
    try {
      const launcher = Object.assign(new EventEmitter(), {
        exitCode: null,
        unref: vi.fn(),
        signalCode: null,
      });
      vi.mocked(open).mockImplementationOnce((async () => launcher) as never);
      const opened = openerWith().openFile(FILE, 'default-application');
      await vi.advanceTimersByTimeAsync(1000);
      await expect(opened).resolves.toBeUndefined();
      expect(launcher.unref).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
