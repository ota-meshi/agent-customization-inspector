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
import { execFile, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { delimiter, dirname, isAbsolute, join, resolve, sep } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { promisify } from 'node:util';
import { getEditor, type Editor } from 'env-editor';
import open from 'open';
import which from 'which';
import { resolvePhysicalLocation } from '../inspection/traversal';
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
 * The exit of the process `open` spawned, as an ordinary failure when it is
 * not a success.
 *
 * Only for the macOS handoff, where that process is `/usr/bin/open`: it hands
 * the document to LaunchServices and exits, so its status is the answer to
 * "did this open". Everywhere else the spawned process is the editor itself and
 * waiting for it would wait for the reader to close the window.
 */
async function handoffOf(handoff: ChildProcess): Promise<void> {
  // Read before it is waited for: `/usr/bin/open` can be gone by the time the
  // promise that spawned it resolves, and a listener attached after `close`
  // has already fired never runs.
  const [code, signal] =
    handoff.exitCode === null && handoff.signalCode === null
      ? ((await once(handoff, 'close')) as [number | null, NodeJS.Signals | null])
      : [handoff.exitCode, handoff.signalCode];
  if (code === 0) {
    return;
  }
  throw new Error(
    `the operating system could not open the file: \`open\` ${
      signal === null ? `exited with status ${String(code)}` : `was terminated by ${signal}`
    }`,
  );
}

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
 * One path as the exclusion compares it: absolute from the directory the host
 * was started in, normalized, trailing separators dropped — `.`,
 * `node_modules/.bin/`, and `node_modules/.bin/.` all name the directory they
 * resolve to — and, on Windows and macOS, without regard to case. Both
 * platforms' default filesystems compare two spellings of one directory as
 * the same directory, and the comparison is lexical: nothing here asks the
 * volume, because reading it is outside the I/O this module performs
 * (QR-003). Folding case on a case-sensitive macOS volume can at most drop an
 * editor whose directory is spelled like an inspected root; not folding it on
 * the default volume would offer, and then start, an executable inside one
 * (FR-020, FR-022) — so the fold is the side to err on.
 */
function comparablePath(invocationCwd: string, path: string): string {
  const normalized = resolve(invocationCwd, path).replace(/[\\/]+$/u, '');
  return process.platform === 'win32' || process.platform === 'darwin'
    ? normalized.toLowerCase()
    : normalized;
}

/**
 * Whether a comparable path lies at or below one of the comparable inspected
 * roots — the selected Repository root and every personal-setup member root
 * the machine would offer for consent. An executable there is inspected
 * content, which this product never executes (FR-020), and a destination
 * chosen from inspected content is what FR-022 forbids.
 *
 * The comparison is between spellings, and a root's spelling does not always
 * name the tree that is read: a scan follows links (FR-024) and appends
 * without normalizing, so a root reached through a symbolic link — or one
 * whose `..` follows one, where the lexical fold in {@link comparablePath}
 * and the operating system's own resolution disagree (`traversal.ts`
 * § pathBelow) — is read at a location no spelling here names.
 *
 * The caller closes that for the Repository root by passing the place it
 * physically is beside its own spelling (`cli.ts`; `traversal.ts`
 * § resolvePhysicalLocation): a root that is a link to `/` would
 * otherwise leave every executable on the machine outside this comparison
 * while the scan read them all. A proposed personal-setup root is not
 * resolved, because FR-013 forbids touching one before the reader has
 * consented to it, so a member home reached through a link keeps the
 * documented residual — the same class as the FR-022 limitation SC-004
 * records for a lexically indistinguishable network filesystem.
 */
function insideInspectedRoot(candidate: string, inspectedRoots: readonly string[]): boolean {
  return inspectedRoots.some((root) => candidate === root || candidate.startsWith(root + sep));
}

/**
 * Whether one launcher candidate may be probed or run: it must lie outside
 * every inspected root both as it is spelled and where it physically is.
 *
 * The spelling alone is not enough in either direction. A `PATH` entry or a
 * configured `EDITOR` outside the Repository can be a symbolic link into it,
 * and both the candidate and what `which` resolves keep that outside spelling
 * — so a repository that ships its own `code` and a link to it would be
 * offered as "Visual Studio Code" and then started, which is the destination
 * chosen from inspected content that FR-022 forbids (FR-020).
 *
 * The physical comparison is exact for the Repository, whose own physical
 * location is passed beside its spelling (`cli.ts`; `traversal.ts`
 * § resolvePhysicalLocation). A personal-setup member root is compared by
 * spelling only, because FR-013 forbids resolving a proposed one before the
 * reader has consented to it; {@link insideInspectedRoot} records what that
 * leaves open.
 *
 * Resolving a candidate is not proposed-root I/O and does not become it when
 * the candidate leads into a personal home: the operand is a `PATH` entry or a
 * configured editor, never one of the four proposed roots, and a resolution
 * that passes through a home does so because the machine's own tooling was
 * spelled through it. The executable lookup below already resolves the same
 * candidate the same way, so this adds no class of pre-consent I/O that the
 * probe did not perform before it.
 *
 * A candidate the filesystem cannot resolve is admitted on its spelling alone.
 * Refusing it instead would take an editor away from a reader over a transient
 * error on a path that has already passed the lexical comparison, and the
 * probe's whole purpose is to offer what the machine actually has.
 */
async function outsideInspectedRoots(
  candidate: string,
  invocationCwd: string,
  comparableRoots: readonly string[],
): Promise<boolean> {
  if (insideInspectedRoot(comparablePath(invocationCwd, candidate), comparableRoots)) {
    return false;
  }
  const location = await resolvePhysicalLocation(candidate);
  return (
    location === null ||
    !insideInspectedRoot(comparablePath(invocationCwd, location), comparableRoots)
  );
}

/**
 * The directories this probe may search, each entry taken from the directory
 * the host was started in — a relative entry is what a shell started there
 * would resolve, so the same directory is searched rather than dropped — less
 * every entry inside an inspected root ({@link outsideInspectedRoots}), as it
 * is spelled and as it physically is. An empty entry is the invocation
 * directory, as it is for a POSIX `PATH`; it is kept when that directory is
 * outside every inspected root and excluded otherwise.
 *
 * An executable under inspected content must never become the editor this
 * product offers as "Visual Studio Code" and then starts, and reading one is
 * outside the allowlisted I/O this product performs (QR-003). The entry a
 * package manager prepends when it runs a command inside the inspected
 * repository — `npx agent-customization-inspector` there puts that
 * repository's `node_modules/.bin` first — is the ordinary way such an entry
 * arrives, but the rule is the root, not the entry's name: a `bin/` the
 * repository puts on `PATH` itself, or one below a personal-setup member's
 * home, is the same hazard, and a `node_modules/.bin` elsewhere on the
 * machine is the reader's own tooling, which the contract promises to search
 * (contracts/http-api.md § open-file).
 */
async function probeDirectories(
  searchPath: string | undefined,
  invocationCwd: string,
  inspectedRoots: readonly string[],
): Promise<readonly string[]> {
  if (searchPath === undefined) {
    return [];
  }
  const roots = inspectedRoots.map((root) => comparablePath(invocationCwd, root));
  const admitted: string[] = [];
  for (const entry of searchPath
    .split(delimiter)
    .map((value) => resolve(invocationCwd, unquotePathEntry(value)))) {
    if (await outsideInspectedRoots(entry, invocationCwd, roots)) {
      admitted.push(entry);
    }
  }
  return admitted;
}

/**
 * The application name macOS knows one editor target by, as `env-editor`
 * publishes it — `Visual Studio Code`, `Sublime Text`. It is what `open -a`
 * takes, so no path is resolved to launch an editor there.
 *
 * Total over the targets that reach it: only a target this catalog names is
 * ever published as an editor, and the terminal editor returns before the
 * caller below.
 */
function editorNameOf(target: FileOpenTarget): string {
  for (const candidate of EDITOR_TARGETS) {
    if (candidate.target === target) {
      return candidate.editor.name;
    }
  }
  throw new Error(`no editor catalog entry names ${target}`);
}

/**
 * One PATH entry with the surrounding double quotes Windows permits removed —
 * the same stripping `which` applies to each entry before resolving inside
 * it. Spelled once and used by both the probe's exclusion and the
 * named-directory membership below, because the two must read an entry the
 * same way: a quoted repository `.bin` must not evade the exclusion, and a
 * quoted legitimate directory must not be dropped as unreadable and lose the
 * editor `which` correctly resolved in it.
 */
function unquotePathEntry(entry: string): string {
  return entry.length > 1 && entry.startsWith('"') && entry.endsWith('"')
    ? entry.slice(1, -1)
    : entry;
}

/**
 * Resolves an executable name on exactly the given search path — and nothing
 * else — without ever asking `which` about a candidate under an inspected
 * root. Each allowed directory is joined to the command before lookup. That
 * absolute, separator-carrying candidate also prevents `which` on Windows
 * from injecting the process working directory ahead of the named path and
 * probing a committed `code.cmd` there (FR-022).
 *
 * A configured value that names a path rather than a command — one carrying
 * a separator — never searches: `which` checks it directly, exactly where the
 * reader pointed. A relative spelling points from the directory the host was
 * started in, which is where a shell started there would take it. That
 * candidate is rejected before lookup when it lies below an inspected root —
 * `EDITOR=/repo/bin/vi` is never probed however it was spelled, and neither is
 * an outside spelling that is a link into one. The resolved result is checked
 * again because the lookup owns the final spelling.
 */
async function resolveOnSearchPath(
  binary: string,
  searchPath: string | undefined,
  invocationCwd: string,
  inspectedRoots: readonly string[],
): Promise<string | null> {
  const roots = inspectedRoots.map((root) => comparablePath(invocationCwd, root));
  const admitted = (candidate: string): Promise<boolean> =>
    outsideInspectedRoots(candidate, invocationCwd, roots);
  if (binary.includes('/') || binary.includes(sep)) {
    const candidate = resolve(invocationCwd, binary);
    if (!(await admitted(candidate))) {
      return null;
    }
    const named = await which(candidate, { nothrow: true });
    return named !== null && (await admitted(named)) ? named : null;
  }
  for (const directory of await probeDirectories(searchPath, invocationCwd, inspectedRoots)) {
    const candidate = join(directory, binary);
    const resolved = await which(candidate, { nothrow: true });
    if (resolved !== null && (await admitted(resolved))) {
      return resolved;
    }
  }
  return null;
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
  // whitespace, and a relative separator-carrying spelling is resolved by
  // {@link resolveOnSearchPath} from the directory the host was started in,
  // which need not be where the reader meant.
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
async function resolveTerminalEditor(
  invocationCwd: string,
  inspectedRoots: readonly string[],
): Promise<string | null> {
  if (process.platform !== 'darwin') {
    return null;
  }
  // The same search-path discipline as the editor probes: every `PATH` entry
  // inside an inspected root removed, and a resolution inside one refused —
  // a configured `EDITOR=/repo/bin/vi` included — so inspected content cannot
  // become the executable this product offers as "Terminal editor" and then
  // starts (FR-020, FR-022; see {@link probeDirectories},
  // {@link resolveOnSearchPath}).
  for (const command of terminalEditorCommands()) {
    const resolved = await resolveOnSearchPath(
      command,
      process.env['PATH'],
      invocationCwd,
      inspectedRoots,
    );
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
   * catalog entry's executable on PATH first — less every entry inside an
   * inspected root, the Repository this session inspects and the
   * personal-setup member roots it would offer for consent
   * ({@link probeDirectories}) — then that entry's known installation
   * locations. Both are executable lookups outside every inspected Source —
   * they read no inspected content and start no process (QR-003).
   *
   * The second lookup is what an installation that never put the command on
   * PATH needs, which is the ordinary macOS case: the launcher sits inside
   * the application bundle, and installing the shell command is a step the
   * reader has to take themselves.
   * @param invocationCwd the directory the host was started in, from which a
   *   relative `PATH` entry or configured spelling is taken
   * @param inspectedRoots the selected Repository root and every
   *   personal-setup member root, inside which nothing is offered
   */
  public static async probe(
    invocationCwd: string,
    inspectedRoots: readonly string[],
  ): Promise<DetectedFileOpener> {
    const launchers = new Map<FileOpenTarget, string>();
    for (const { target, editor } of EDITOR_TARGETS) {
      const onPath = await resolveOnSearchPath(
        editor.binary,
        process.env['PATH'],
        invocationCwd,
        inspectedRoots,
      );
      if (onPath !== null) {
        launchers.set(target, onPath);
        continue;
      }
      const catalogPath = catalogSearchPath(editor.paths);
      if (catalogPath === null) {
        continue;
      }
      const bundled = await resolveOnSearchPath(
        editor.binary,
        catalogPath,
        invocationCwd,
        inspectedRoots,
      );
      if (bundled !== null) {
        launchers.set(target, bundled);
      }
    }
    // After the editors that bring their own window, because it is the reader's
    // configured editor rather than one this catalog names, and because the
    // first target published is the one a plain click uses.
    const terminalEditor = await resolveTerminalEditor(invocationCwd, inspectedRoots);
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
      // Handed to LaunchServices by application name — the form `open -a`
      // takes, and the name `env-editor` already publishes for each catalog
      // entry — rather than by running the editor's own command-line script.
      //
      // That script resolves the editor's user data directory from `HOME`, so
      // a host whose `HOME` is not the reader's own opened nothing: it started
      // a second instance under that directory instead of reaching the editor
      // already running. The fixture harness is such a host, because the
      // consent preview derives the shared agent home from the home directory
      // itself (FR-013, FR-045) and the harness points it into the built tree.
      // LaunchServices reads none of that: it hands the document to the
      // application registered under this name, running or not.
      //
      // The handoff is waited for, not the application. `open` resolves as soon
      // as it has spawned `/usr/bin/open`, so a name LaunchServices has no
      // application for — this machine has the editor's command-line launcher,
      // which is what was detected, but not its bundle — exited non-zero after
      // this call had already reported success, and the page said it had opened
      // a file nothing opened. `/usr/bin/open` returns as soon as it has handed
      // the document over, so awaiting it waits for the answer and not for the
      // reader to close the window (T1123; contracts/http-api.md
      // § open-file).
      await handoffOf(await open(absolutePath, { app: { name: editorNameOf(target) } }));
      return;
    }
    // Everywhere else the same `open` package runs the launcher with the path
    // as its argument, which is also what makes a Windows `code.cmd` work: the
    // package hands it to PowerShell with its own escaping, so no argument of
    // ours is ever parsed by a shell.
    await open(absolutePath, { app: { name: launcher } });
  }
}
