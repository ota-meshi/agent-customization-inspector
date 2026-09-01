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
import { delimiter, dirname, isAbsolute, join, normalize, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { getEditor, type Editor } from 'env-editor';
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
 * How long a default-handler launch listens for the launcher's exit before
 * treating it as accepted. A registration failure exits non-zero within
 * milliseconds, so one second catches it with scheduler latency to spare; a
 * launcher still alive then is the bundled `xdg-open`'s success shape — it
 * keeps running for the opened application's whole session, which no launch
 * should wait on (see the default-application branch of
 * {@link DetectedFileOpener.openFile}).
 */
const LAUNCHER_EXIT_GRACE_MILLISECONDS = 1000;

/**
 * The grace for a launch inside a Flatpak sandbox. There the bundled
 * `xdg-open` never keeps running: it asks the desktop portal to open the file
 * with `gdbus call --timeout 5` and exits either way (open/xdg-open
 * § open_flatpak), so a refusal can arrive as a non-zero exit up to five
 * seconds in — after the ordinary grace would have answered `opened`. Six
 * seconds outlasts the portal call's own timeout, and costs nothing on
 * success, which exits as soon as the portal replies.
 */
const FLATPAK_PORTAL_GRACE_MILLISECONDS = 6000;

/**
 * Whether this process runs inside a Flatpak sandbox. The bundled `xdg-open`
 * reads `$XDG_RUNTIME_DIR/flatpak-info` for this (open/xdg-open § detectDE);
 * here the sandbox's `FLATPAK_ID` export answers the same question — Flatpak
 * sets it for every sandboxed process — without a filesystem read, which the
 * QR-003 boundary reserves for the inspection modules. Read per launch so a
 * test can stage it.
 */
function insideFlatpakSandbox(): boolean {
  const flatpakApplicationId = process.env.FLATPAK_ID;
  return flatpakApplicationId !== undefined && flatpakApplicationId !== '';
}

/**
 * The grace race's "no exit yet" outcome. A symbol rather than a number-like
 * sentinel, because the race's other side yields the launcher's real exit
 * code and `null` already means "killed by a signal" there.
 */
const LAUNCHER_STILL_RUNNING = Symbol('launcher-still-running');

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
   *
   * The two handler targets are unconditional by design: the contract's
   * absence rule covers what the host resolves — the editors — while
   * `default-application` and `containing-folder` are defined as handing
   * the path to whatever this machine registered, which cannot be probed
   * reliably per file kind and platform. A machine with no handler answers
   * the launch itself: the non-zero exit reaches the reader as the failed
   * request's own error (contracts/http-api.md § open-file).
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
 * Judged on the entry's normalized spelling with its trailing separators
 * dropped, because `node_modules/.bin/.` and `node_modules/.bin/` name the
 * same directory the package manager prepends — a literal tail test alone
 * would keep them, and `which`'s own `join` would then resolve right back
 * into the repository's `.bin`.
 */
function probeSearchPath(): string | undefined {
  const inherited = process.env['PATH'];
  if (inherited === undefined) {
    return undefined;
  }
  const kept = inherited.split(delimiter).filter((entry) => {
    const segments = normalize(unquotePathEntry(entry))
      .replace(/[\\/]+$/u, '')
      .split(/[\\/]/u);
    // Exactly the two trailing segments the package manager prepends: a
    // string-suffix test would also swallow `/opt/notnode_modules/.bin`, a
    // legitimate entry whose editors would then be undetectable.
    return !(segments.at(-2) === 'node_modules' && segments.at(-1) === '.bin');
  });
  return kept.join(delimiter);
}

/**
 * One PATH entry with the surrounding double quotes Windows permits removed —
 * the same stripping `which` applies to each entry before resolving inside
 * it. Spelled once and used by both the probe's exclusion and the
 * named-directory membership below, because the two must read an entry the
 * same way: a quoted repository `.bin` must not evade the exclusion, and a
 * quoted legitimate directory must not fail `isAbsolute` and drop the editor
 * `which` correctly resolved in it.
 */
function unquotePathEntry(entry: string): string {
  return entry.length > 1 && entry.startsWith('"') && entry.endsWith('"')
    ? entry.slice(1, -1)
    : entry;
}

/**
 * Resolves an executable name on exactly the given search path — and nothing
 * else. `which` on Windows always prepends the process working directory to
 * whatever `path` it was given (its cmd.exe emulation), and this process's
 * working directory is the inspected repository, so a `code.cmd` committed
 * there would otherwise become the executable this product offers as an
 * editor and then starts — a destination chosen from inspected content,
 * which FR-022 forbids. The resolution is therefore accepted only when it
 * sits in a directory the caller actually named; the membership test spells
 * each entry through the same `join`-then-`dirname` normalization `which`
 * itself applies to the path it returns.
 *
 * A configured value that names a path rather than a command — one carrying
 * a separator — never searches: `which` checks it directly, exactly where
 * the reader pointed, and the working directory plays no part.
 *
 * Every match is read (`all`), and the first allowed one wins: the working
 * directory's injected candidate comes first in `which`'s own order, so
 * refusing only the first match would also lose the legitimate installation
 * sitting right behind it on the named path.
 */
async function resolveOnSearchPath(
  binary: string,
  searchPath: string | undefined,
): Promise<string | null> {
  if (binary.includes('/') || binary.includes(sep)) {
    // Only an absolute spelling is checked directly. `which` resolves a
    // relative separator-carrying value against this process's working
    // directory — the inspected repository — and an executable the
    // repository ships must never become the editor this product offers or
    // starts (FR-022): the same boundary the named-directory membership
    // below draws for PATH lookups.
    if (!isAbsolute(binary)) {
      return null;
    }
    return which(binary, {
      nothrow: true,
      ...(searchPath === undefined ? {} : { path: searchPath }),
    });
  }
  const resolved = await which(binary, {
    all: true,
    nothrow: true,
    ...(searchPath === undefined ? {} : { path: searchPath }),
  });
  if (resolved === null) {
    return null;
  }
  const allowed = new Set(
    (searchPath ?? process.env['PATH'] ?? '')
      .split(delimiter)
      .map(unquotePathEntry)
      .filter((entry) => entry !== '' && isAbsolute(entry))
      .map((entry) => dirname(join(entry, binary))),
  );
  return resolved.find((candidate) => allowed.has(dirname(candidate))) ?? null;
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
 * One value is read and both classified and run — `$EDITOR`, then `$VISUAL`,
 * `||`-selected, the catalog's own precedence — because the classification
 * and the command that runs must be the same selection: classifying from one
 * variable and running the other would call `EDITOR=vim, VISUAL=code` a
 * terminal editor and then start VS Code in the Terminal window.
 *
 * A configured value that is one word is used as it stands, so
 * `EDITOR=/custom/bin/nvim` runs the executable the reader named rather than
 * whatever `nvim` resolves to — `which` takes a path as readily as a name. A
 * value carrying whitespace reads two ways that no lexical test can tell
 * apart: an absolute path with spaces in it (`/Applications/My
 * Editor.app/...`) and a command carrying flags (`vim -u NONE`). Both
 * candidates are therefore returned in order — the exact configured value
 * first, then the catalog's command for the editor it names — and the
 * resolution decides: `which` checks a separator-carrying value directly, so
 * a real executable at the exact spelling wins, while a flags-carrying value
 * resolves nowhere and falls back. Running a split command line would be the
 * shell parsing this module exists to avoid, so flags are never honoured.
 */
function terminalEditorCommands(): readonly string[] {
  const configured = process.env['EDITOR'] || process.env['VISUAL'] || '';
  if (configured === '') {
    // Neither variable is set, which is the ordinary state of a macOS
    // install: the POSIX default is what a terminal launch then runs.
    return [DEFAULT_TERMINAL_EDITOR];
  }
  // Classified by the executable's own name rather than the whole configured
  // value. The catalog resolves a bare `vi` through its keywords but reads
  // `/custom/bin/vi` as an unknown editor — its lookup takes the last path
  // segment as an *id* and no entry is named `vi` — and an unknown editor is
  // reported as non-terminal, which would discard the reader's own
  // executable and run whatever `vi` PATH offers instead. The value that
  // runs stays the configured one; only the classification reads the name.
  const editor: Editor = getEditor(configured.split(/[\\/]/u).at(-1) ?? configured);
  if (!editor.isTerminalEditor) {
    return [DEFAULT_TERMINAL_EDITOR];
  }
  // A value that cannot run as written still names the editor, so the
  // catalog's own command follows it as the fallback: flags carry
  // whitespace, and a relative separator-carrying spelling is refused by
  // {@link resolveOnSearchPath} because it would resolve against the
  // inspected repository.
  const relativeWithSeparator =
    (configured.includes('/') || configured.includes(sep)) && !isAbsolute(configured);
  return /\s/u.test(configured) || relativeWithSeparator
    ? [configured, editor.binary]
    : [configured];
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
  // The same search-path discipline as the editor probes: `node_modules/.bin`
  // entries removed, and the resolution accepted only from a named directory,
  // so an inspected repository that ships a `vi` of its own cannot become the
  // executable this product offers as "Terminal editor" and then starts
  // (FR-022; see {@link probeSearchPath}, {@link resolveOnSearchPath}). An
  // absolute configured value is unaffected — a separator-carrying command is
  // checked directly, exactly where the reader pointed.
  for (const command of terminalEditorCommands()) {
    const resolved = await resolveOnSearchPath(command, probeSearchPath());
    if (resolved !== null) {
      return resolved;
    }
  }
  return null;
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
      const onPath = await resolveOnSearchPath(editor.binary, probeSearchPath());
      if (onPath !== null) {
        launchers.set(target, onPath);
        continue;
      }
      const catalogPath = catalogSearchPath(editor.paths);
      if (catalogPath === null) {
        continue;
      }
      const bundled = await resolveOnSearchPath(editor.binary, catalogPath);
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
    // The editors this machine has, in catalog order, then the two hand-offs
    // to the platform's own handler launcher — always offered, because
    // whether a handler is registered for a file is the machine's own state
    // and no probe short of launching answers it; a missing launcher reports
    // as that launch's ordinary error (contracts/http-api.md § open-file). A
    // reader inspecting the files an agent reads is reading them to edit
    // them, so an editor leads whenever there is one.
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
      // The launcher's own exit is awaited and reported: a machine with no
      // handler registered for the file type — a headless Linux without
      // `xdg-open`'s target, most plainly — exits non-zero within
      // milliseconds, and answering `opened` for that would tell the reader
      // something happened when nothing did.
      //
      // The wait is bounded, because on Linux a *successful* launch is
      // exactly when the launcher keeps running: the bundled `xdg-open`
      // deliberately does not fork the application off, so it lives as long
      // as the application does (open/xdg-open § "In case of success").
      // Waiting for that exit would hold this call — and every choice on the
      // page's open control, behind its own in-flight guard — until the
      // reader closes the application. A launcher still alive after the
      // grace period has accepted the handoff, and its eventual exit code
      // describes the application's session rather than the handoff, so the
      // launch resolves as requested — the contract {@link FileOpener.openFile}
      // states — and the process is released.
      const launched = await open(
        target === 'containing-folder' ? dirname(absolutePath) : absolutePath,
      );
      // Read before awaited: a launcher that already exited emitted `exit`
      // before this line could listen for it, and awaiting the event then
      // would wait for one that has been and gone.
      const graceWatch = new AbortController();
      // Both halves of the exit, because Node reports them separately: a
      // launcher killed by a signal exits with a null code and a non-null
      // signal, which reading the code alone would take for a clean exit
      // (nodejs.org/api/child_process.html#event-exit).
      const settled:
        { code: number | null; signal: NodeJS.Signals | null } | typeof LAUNCHER_STILL_RUNNING =
        launched.exitCode !== null || launched.signalCode !== null
          ? { code: launched.exitCode, signal: launched.signalCode }
          : await Promise.race([
              once(launched, 'exit', { signal: graceWatch.signal })
                .then((values) => {
                  // Node emits `exit` with both arguments; a listener that
                  // received only the code reads the second as undefined,
                  // which is the same "no signal" the null spelling means.
                  const [code, signal] = values as [
                    number | null,
                    NodeJS.Signals | null | undefined,
                  ];
                  return { code, signal: signal ?? null };
                })
                // Rejected by the abort below when the grace side settled the
                // race first; nothing awaits this listener any more.
                .catch((): typeof LAUNCHER_STILL_RUNNING => LAUNCHER_STILL_RUNNING),
              delay(
                // Inside Flatpak the launcher exits either way once the portal
                // replies, so the longer wait ends on the reply rather than
                // holding the page — see {@link FLATPAK_PORTAL_GRACE_MILLISECONDS}.
                insideFlatpakSandbox()
                  ? FLATPAK_PORTAL_GRACE_MILLISECONDS
                  : LAUNCHER_EXIT_GRACE_MILLISECONDS,
                LAUNCHER_STILL_RUNNING,
                {
                  signal: graceWatch.signal,
                  // The timer must not hold the process open past the launch
                  // that started it.
                  ref: false,
                },
              ).catch((): typeof LAUNCHER_STILL_RUNNING => LAUNCHER_STILL_RUNNING),
            ]);
      graceWatch.abort();
      if (settled === LAUNCHER_STILL_RUNNING) {
        launched.unref();
        return;
      }
      if (settled.signal !== null) {
        // A launcher the machine killed opened nothing, and its null code is
        // not a clean exit.
        throw new Error(
          `this machine's handler for that path was terminated by ${settled.signal}, so nothing was opened`,
        );
      }
      if (settled.code !== null && settled.code !== 0) {
        throw new Error(
          `this machine's handler for that path exited with code ${settled.code}, so nothing was opened`,
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
      //
      // By name, resolved through `PATH`, exactly as Vite invokes it. Naming
      // it `/usr/bin/osascript` instead has been proposed on the grounds that
      // an inspected repository could ship a `node_modules/.bin/osascript`;
      // that is the adversarial-workspace model FR-019 rejects, and the
      // machinery it asks for is what FR-019 forbids adding. A reader who does
      // not trust the workspace should not run the tool there (spec.md
      // § Assumptions), and the editor launcher this hands over was resolved
      // under the same assumption.
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
