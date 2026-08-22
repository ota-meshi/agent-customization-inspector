// Handing one committed customization file to an application on the reader's
// own machine (FR-022, contracts/http-api.md § open-file).
//
// The product opens nothing on its own initiative: every launch here answers
// one explicit request from the page the reader is looking at, for the one
// file that page is about. The host performs it rather than the browser
// because the absolute path is the host's — the client receives the Source's
// root only as a one-way display escaping that is never decoded for I/O
// (data-model.md § SourceBoundary), so the path never crosses to the page at
// all.
//
// Threat-model boundary (FR-022): this is the product's second
// child-process-initiating surface, after startup browser opening, and the
// first whose arguments are inspection-derived. What a spawned process
// receives is the absolute path of a file the current committed generation
// published, and nothing else: no file content, no authored value, and no
// value chosen from inspected content — the launcher is either the
// operating system's own default handler or an editor executable this module
// resolved before any request arrived. The path is never assembled into a
// command line here: an editor launcher receives it as one argument, and the
// default-handler and folder targets hand it to the maintained `open`
// package, which performs its own escaping for the platform launcher it runs
// — PowerShell's on Windows, `xdg-open` on Linux — so no escaping of this
// product's own is what a launcher parses.
// Residual limitation: the default handler is whatever the reader's machine
// registered for that file type, and a machine may register a handler that
// executes what it opens — the same outcome as opening the file from the
// system's own file browser, which is what this action offers.
import { execFile, spawn } from 'node:child_process';
import { once } from 'node:events';
import { delimiter, dirname } from 'node:path';
import { promisify } from 'node:util';
import { defaultEditor, getEditor, type Editor } from 'env-editor';
import open from 'open';
import which from 'which';
import type { FileOpenTarget } from '../../shared/api-types';

/**
 * The editors this product can offer, each paired with the maintained catalog
 * entry it is resolved from: the executable name a PATH lookup asks for, and
 * the places an installation puts that executable when it is not on PATH.
 * Those locations come from the `env-editor` package rather than being written
 * here, so they stay a maintained third-party fact rather than a table this
 * repository would have to follow each editor's packaging with.
 *
 * Catalog order is offer order, and the first target a machine satisfies is
 * what a plain click uses (see {@link FileOpener.targets}).
 */
const EDITOR_TARGETS: readonly { readonly target: FileOpenTarget; readonly editor: Editor }[] = [
  { target: 'visual-studio-code', editor: getEditor('vscode') },
  { target: 'sublime-text', editor: getEditor('sublime') },
];

const execFileAsync = promisify(execFile);

/**
 * The fixed AppleScript that gives a terminal editor a window to run in: it
 * opens a Terminal window and runs the editor on the file.
 *
 * A terminal hosts a program by running a command line, so this is the one
 * launch whose argument reaches a shell (FR-022). What keeps that safe is that
 * the path is never part of this source: the script receives the editor and
 * the file as `argv`, and `quoted form of` — the automation host's own
 * POSIX-shell quoter — is what puts them into the command line, so an authored
 * name holding shell metacharacters is still one literal argument. Building
 * the command line by concatenating text this product had assembled is what
 * that avoids, and is why the path arrives as an argument rather than in the
 * script.
 *
 * Terminal opens a window of its own when it was not already running, so a
 * first launch can leave an extra empty window; nothing here closes windows a
 * reader may be using.
 *
 * The explicit timeout is what a machine that has not granted this product
 * permission to control Terminal needs: macOS gates the first Apple event
 * behind a one-time consent dialog, and an unanswered one would otherwise hold
 * the request for the automation host's own default. Thirty seconds leaves a
 * reader time to answer it and turns a refusal into an ordinary failure the
 * control reports.
 */
const TERMINAL_EDITOR_SCRIPT = `
on run argv
  set editorCommand to (quoted form of (item 1 of argv)) & " " & (quoted form of (item 2 of argv))
  with timeout of 30 seconds
    tell application "Terminal"
      do script editorCommand
      activate
    end tell
  end timeout
end run
`;

/**
 * The applications a host can hand a file to, and the launch itself. An
 * interface because the session holds one and tests satisfy it with a literal
 * double: a unit test must be able to observe what would be launched without
 * launching anything (AGENTS.md Class and interface policy).
 */
export interface FileOpener {
  /**
   * The targets this machine can actually satisfy, in the order a reader
   * chooses from and with the one a plain click uses first. That is the
   * editor whenever this machine has it: a reader inspecting the files an
   * agent reads is reading them to edit them, and the machine's own handler
   * for a Markdown or JSON file is often a previewer. Published by the
   * session snapshot so the page offers no application the host could not
   * launch (FR-022).
   */
  readonly targets: readonly FileOpenTarget[];
  /**
   * Launches one absolute path in the chosen application. Resolves once the
   * launch has been requested, not once anything appears on screen: what a
   * machine does with a file it was handed is that machine's business.
   */
  openFile: (absolutePath: string, target: FileOpenTarget) => Promise<void>;
}

/**
 * The catalog's known locations spelled as a search path, or null when the
 * catalog names none for this editor.
 *
 * Searching them with the same PATH lookup that already found or missed the
 * command is what keeps this module free of `fs`, which QR-003 reserves to
 * the inspection module: an executable's presence is exactly what a PATH
 * lookup answers, so no second way of asking is written here.
 */
function catalogSearchPath(candidates: readonly string[]): string | null {
  return candidates.length === 0
    ? null
    : candidates.map((candidate) => dirname(candidate)).join(delimiter);
}

/**
 * The `PATH` this probe searches: the inherited one with every project-local
 * `node_modules/.bin` entry removed.
 *
 * That entry is what a package manager prepends when it runs a command inside
 * a project — `npx agent-customization-inspector` in the reader's repository
 * does exactly this — so an inspected repository that ships its own
 * `node_modules/.bin/code` would decide which executable this product offers
 * as "Visual Studio Code" and then starts. A destination chosen from
 * inspected content is what FR-022 forbids, and reading one is outside the
 * allowlisted I/O this product performs (QR-003).
 *
 * Removed by the entry's own trailing segments rather than by comparing
 * against a Source root: the probe runs before any Source exists, and the
 * package manager's injection is exactly this shape on every platform.
 */
function probeSearchPath(): string | undefined {
  const inherited = process.env['PATH'];
  if (inherited === undefined) {
    return undefined;
  }
  const kept = inherited
    .split(delimiter)
    .filter((entry) => !entry.split(/[\\/]/u).slice(-2).join('/').endsWith('node_modules/.bin'));
  return kept.join(delimiter);
}

/**
 * The editor a terminal launch runs when the reader has configured none:
 * `vi`, which is the editor POSIX makes the default and which every machine
 * this target runs on ships. Naming it is what keeps the target useful on a
 * machine that has never set `$EDITOR` — which is the ordinary state of a
 * macOS install, since nothing there sets it.
 */
const DEFAULT_TERMINAL_EDITOR = 'vi';

/**
 * The command a terminal launch would run: the editor `$EDITOR` or `$VISUAL`
 * names when that is a terminal editor, and {@link DEFAULT_TERMINAL_EDITOR}
 * otherwise.
 *
 * The two ways of having named none are the same state, so they answer alike:
 * a machine with neither variable set, and one whose variable names an editor
 * that brings its own window. Treating the second as "no terminal editor
 * available" would take the target away from a reader who has a terminal and
 * an editor in it — and take it away for good where this product has no entry
 * of its own for the editor they named.
 *
 * A configured value that is one word is used as it stands, so
 * `EDITOR=/custom/bin/nvim` runs the executable the reader named rather than
 * whatever `nvim` resolves to — `which` takes a path as readily as a name. A
 * value carrying flags (`vim -u NONE`) is not one word, and running it would
 * mean splitting a command line, which is the shell parsing this module exists
 * to avoid; such a value falls back to the catalog's command for the editor it
 * names, and the flags are not honoured.
 */
function terminalEditorCommand(): string {
  const configured = process.env['VISUAL'] ?? process.env['EDITOR'] ?? '';
  let editor: Editor;
  try {
    editor = defaultEditor();
  } catch {
    // The catalog throws when neither variable is set.
    return DEFAULT_TERMINAL_EDITOR;
  }
  if (!editor.isTerminalEditor) {
    return DEFAULT_TERMINAL_EDITOR;
  }
  return configured !== '' && !/\s/u.test(configured) ? configured : editor.binary;
}

/**
 * The terminal editor this machine can host, or null when it cannot host one.
 *
 * Two things have to hold, and each is what the launch itself needs: the
 * platform must be macOS, whose automation host is the one this product knows
 * how to give an editor a window through, and the editor's command must
 * resolve, since it is what runs.
 */
async function resolveTerminalEditor(): Promise<string | null> {
  if (process.platform !== 'darwin') {
    return null;
  }
  return which(terminalEditorCommand(), { nothrow: true });
}

/**
 * A {@link FileOpener} whose Visual Studio Code entry is the launcher one
 * probe of this machine found. Detection and capability are the same fact
 * here: the menu offers VS Code exactly when this class holds the executable
 * it would run, so a reader is never offered an application that would
 * silently do nothing.
 */
export class DetectedFileOpener implements FileOpener {
  /**
   * The launcher this machine holds for each editor the probe found, keyed by
   * the target that names it, in catalog order. An editor absent from this map
   * is absent from {@link targets}, which is what keeps the page from offering
   * an application the host could not start.
   */
  readonly #launchers: ReadonlyMap<FileOpenTarget, string>;

  /**
   * Holds the probe's result. Called by {@link probe}, which is the only
   * producer: which editors a machine has is a fact about the machine,
   * established once before the host binds and never re-probed, because a
   * reader who installs an editor mid-session restarts the inspector anyway.
   */
  public constructor(launchers: ReadonlyMap<FileOpenTarget, string>) {
    this.#launchers = launchers;
  }

  /**
   * Probes this machine for the editors the reader may choose from: each
   * catalog entry's executable on PATH first, then that entry's known
   * installation locations. Both are executable lookups outside every
   * inspected Source — they read no inspected content and start no process
   * (QR-003).
   *
   * The second lookup is what an installation that never put the command on
   * PATH needs, which is the ordinary macOS case: the launcher sits inside
   * the application bundle, and installing the shell command is a step the
   * reader has to take themselves.
   */
  public static async probe(): Promise<DetectedFileOpener> {
    const launchers = new Map<FileOpenTarget, string>();
    for (const { target, editor } of EDITOR_TARGETS) {
      const onPath = await which(editor.binary, { nothrow: true, path: probeSearchPath() });
      if (onPath !== null) {
        launchers.set(target, onPath);
        continue;
      }
      const catalogPath = catalogSearchPath(editor.paths);
      if (catalogPath === null) {
        continue;
      }
      const bundled = await which(editor.binary, { nothrow: true, path: catalogPath });
      if (bundled !== null) {
        launchers.set(target, bundled);
      }
    }
    // After the editors that bring their own window, because it is the reader's
    // configured editor rather than one this catalog names, and because the
    // first target published is the one a plain click uses.
    const terminalEditor = await resolveTerminalEditor();
    if (terminalEditor !== null) {
      launchers.set('terminal-editor', terminalEditor);
    }
    return new DetectedFileOpener(launchers);
  }

  public get targets(): readonly FileOpenTarget[] {
    // The editors this machine has, in catalog order, then the two targets
    // every machine satisfies through its own handlers. A reader inspecting
    // the files an agent reads is reading them to edit them, so an editor
    // leads whenever there is one.
    return [...this.#launchers.keys(), 'default-application', 'containing-folder'];
  }

  public async openFile(absolutePath: string, target: FileOpenTarget): Promise<void> {
    if (target === 'default-application' || target === 'containing-folder') {
      // The maintained `open` package spawns the platform's own handler
      // launcher — `open`, `xdg-open`, or PowerShell's `Start-Process` — with
      // the path as one argument it escapes itself. A directory is handed to
      // the same launcher, which is how every platform opens a folder in its
      // own file manager; nothing is selected inside it, because what the
      // reader asked for is the folder.
      //
      // The launcher's own exit is awaited and reported: it is a launcher
      // rather than the application, so it exits as soon as it has handed the
      // path over, and a machine with no handler registered for the file type
      // — a headless Linux without `xdg-open`'s target, most plainly — exits
      // non-zero. Answering `opened` for that would tell the reader something
      // happened when nothing did.
      const launched = await open(
        target === 'containing-folder' ? dirname(absolutePath) : absolutePath,
      );
      // Read before awaited: a launcher that already exited emitted `exit`
      // before this line could listen for it, and awaiting the event then
      // would wait for one that has been and gone.
      const code = launched.exitCode ?? ((await once(launched, 'exit')) as [number | null])[0];
      if (code !== null && code !== 0) {
        throw new Error(
          `this machine's handler for that path exited with code ${code}, so nothing was opened`,
        );
      }
      return;
    }
    const launcher = this.#launchers.get(target);
    if (launcher === undefined) {
      // Reached only by a client that asked for a target the snapshot did not
      // publish, which the shipped page cannot do; it is a broken client
      // rather than a functional outcome, so it propagates ordinarily.
      throw new Error(`this machine has no ${target} installation to open the file in`);
    }
    if (target === 'terminal-editor') {
      // The editor has no window of its own, so one is opened for it through
      // the operating system's `osascript` automation host, which runs the
      // fixed script above with the editor and the file as its arguments.
      await execFileAsync('osascript', ['-e', TERMINAL_EDITOR_SCRIPT, launcher, absolutePath]);
      return;
    }
    if (process.platform === 'darwin') {
      // macOS is the one platform whose `open -a` takes an application rather
      // than an executable, and a launcher resolved above is the editor's own
      // command-line script inside its bundle. Spawning it directly is what
      // the script is for; `open` is left to the default-handler branch, which
      // is the one it can express.
      //
      // Awaited to the point the child exists, then detached. `events.once` is
      // the platform's own way to await one: it resolves on `spawn` and
      // rejects on `error`, which is what a failed launch emits — the probed
      // launcher deleted or made unexecutable since, a process or descriptor
      // limit reached. Without that listener the emitter throws the `error`
      // event instead, ending the host on a reader's click. After `spawn`
      // Node emits `error` only for a kill or a message this caller never
      // sends, so nothing is left to listen for.
      const child = spawn(launcher, [absolutePath], { detached: true, stdio: 'ignore' });
      await once(child, 'spawn');
      child.unref();
      return;
    }
    // Everywhere else the same `open` package runs the launcher with the path
    // as its argument, which is also what makes a Windows `code.cmd` work: the
    // package hands it to PowerShell with its own escaping, so no argument of
    // ours is ever parsed by a shell.
    await open(absolutePath, { app: { name: launcher } });
  }
}
