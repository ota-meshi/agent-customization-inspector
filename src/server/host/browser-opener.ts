// Startup browser opener for the bound loopback session URL (FR-001,
// research.md § 3). On macOS it first tries to reuse a tab a running
// Chromium-family browser already has on the session origin, by running a
// fixed product-authored JXA script through the operating system's
// `osascript` automation host — the tab-reuse approach Vite ships, adapted
// from create-react-app. Everywhere else — and whenever no such browser is
// running or the attempt fails — the maintained `open` package spawns the
// OS default handler, which always opens a new tab.
//
// Threat-model boundary (FR-022, spec.md § Clarifications Session
// 2026-07-19): startup browser opening is one of the product's two
// child-process-initiating surfaces — the other is the reader's own
// explicit open-in-editor request, whose separate authorization
// `file-opener.ts` states — and nothing spawned here receives
// inspection-derived content or paths. Every argument is closed before any
// inspection exists: the fixed `ps cax` probe, the fixed reuse script, a
// member of the fixed application list, and the bound loopback URL. Each
// child inherits the launch environment unchanged. Residual limitation: the
// reuse attempt prefers a running Chromium-family browser over the OS
// default handler, and macOS gates the script behind a one-time automation
// consent whose denial silently degrades the attempt to the fallback.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import open from 'open';

const execFileAsync = promisify(execFile);

/**
 * Chromium-family application names the reuse attempt recognizes in the
 * process list, in preference order — the closed list Vite ships. Only these
 * applications expose the automation tabs API the reuse script drives;
 * Safari and Firefox do not, so they stay on the `open` fallback
 * (research.md § 3).
 */
const CHROMIUM_APPLICATIONS: readonly string[] = [
  'Google Chrome Canary',
  'Google Chrome Dev',
  'Google Chrome Beta',
  'Google Chrome',
  'Microsoft Edge',
  'Brave Browser',
  'Vivaldi',
  'Chromium',
];

/**
 * Fixed JXA (JavaScript for Automation) source run through the macOS
 * `osascript` host with exactly two arguments: the session URL and the name
 * of the running application to drive. Inside that browser it focuses and
 * reloads an existing tab whose URL starts with the session URL — the bound
 * loopback origin with its trailing slash, so any of the session's own
 * client routes matches while another port sharing the digits' prefix
 * cannot — retargets an empty new-tab page next, and only otherwise opens a
 * new tab (research.md § 3). Reloading in place deliberately keeps a reused
 * tab's current client route. A prefix rather than Vite's substring match:
 * an unrelated site carrying the session URL inside its own query would
 * otherwise be the tab this focuses and reloads, ahead of — and instead of —
 * the session's real tab.
 *
 * Adapted from create-react-app's opener as Vite ships it (MIT License,
 * Copyright (c) 2015-present, Facebook, Inc.,
 * https://github.com/react/create-react-app/blob/main/LICENSE).
 */
const CHROMIUM_TAB_REUSE_SCRIPT = `
function run(argv) {
  const urlToOpen = argv[0]
  const programName = argv[1]

  const app = Application(programName)

  if (app.windows.length === 0) {
    app.Window().make()
  }

  // 1: A tab already showing the session is focused and reloaded in place.
  const found = lookupTabWithUrl(urlToOpen, app)
  if (found) {
    found.targetWindow.activeTabIndex = found.targetTabIndex
    found.targetTab.reload()
    found.targetWindow.index = 1
    app.activate()
    return
  }

  // 2: Otherwise an empty new-tab page is retargeted instead of duplicated.
  // Each Chromium-family browser spells its own new-tab page — Edge's is
  // edge://newtab, which Microsoft's own policy documentation states — so
  // every spelling is looked for rather than Chrome's alone; a browser whose
  // page is none of them simply opens a new tab at step 3.
  const emptyTabUrls = ['chrome://newtab/', 'edge://newtab', 'brave://newtab/', 'vivaldi://newtab/']
  for (const emptyTabUrl of emptyTabUrls) {
    const emptyTabFound = lookupTabWithUrl(emptyTabUrl, app)
    if (emptyTabFound) {
      emptyTabFound.targetWindow.activeTabIndex = emptyTabFound.targetTabIndex
      emptyTabFound.targetTab.url = urlToOpen
      app.activate()
      return
    }
  }

  // 3: Only then a new tab opens.
  const firstWindow = app.windows[0]
  firstWindow.tabs.push(app.Tab({ url: urlToOpen }))
  app.activate()
}

function lookupTabWithUrl(lookupUrl, app) {
  const windows = app.windows()
  for (const window of windows) {
    for (const [tabIndex, tab] of window.tabs().entries()) {
      if (tab.url().startsWith(lookupUrl)) {
        return {
          targetTab: tab,
          targetTabIndex: tabIndex + 1,
          targetWindow: window,
        }
      }
    }
  }
}
`;

/**
 * How long the `ps` process-list probe may run before the reuse attempt is
 * abandoned. The probe answers in milliseconds; a system where it does not is
 * one where waiting longer would not help, and the `open` fallback needs no
 * probe.
 */
const PROCESS_PROBE_TIMEOUT_MILLISECONDS = 2000;

/**
 * How long the reuse script may run, sized for the one dialog that legitimately
 * holds it: macOS asks for automation consent the first time this process
 * controls the probed browser, and `osascript` blocks until the user answers.
 * See the call site for what expiry falls back to.
 */
const AUTOMATION_SCRIPT_TIMEOUT_MILLISECONDS = 10_000;

/**
 * The command names `ps cax` listed, one per running process.
 *
 * Matched whole rather than searched for as substrings: `ps cax` prints
 * `Google Chrome Helper` and `Google Chrome Helper (Renderer)` as command
 * names of their own, so a substring test reports Chrome as running from a
 * helper that outlived it — and the reuse script's `Application(name)` would
 * then *launch* the browser the reader had closed instead of leaving the URL
 * to the OS default handler.
 *
 * Each line is `PID TTY STAT TIME COMMAND` with the command last and free to
 * carry spaces, which is why the leading four fields are matched positionally
 * rather than the line being split on whitespace. The numeric first field
 * also skips the header row.
 */
function runningCommandNames(stdout: string): ReadonlySet<string> {
  const names = new Set<string>();
  for (const line of stdout.split('\n')) {
    const command = /^\s*\d+\s+\S+\s+\S+\s+\S+\s+(.+?)\s*$/u.exec(line)?.[1];
    if (command !== undefined) {
      names.add(command);
    }
  }
  return names;
}

/**
 * Attempts the macOS tab reuse: reads the process list for a running
 * Chromium-family application and, when one is found, runs the fixed reuse
 * script against it. Returns whether the script ran to completion; `false`
 * hands the URL to the caller's `open` fallback.
 */
async function reuseChromiumTab(
  url: string,
  shouldProceed: () => boolean,
  signal: AbortSignal | undefined,
): Promise<boolean> {
  try {
    // `ps cax` prints the running command names only. The probe reads which
    // fixed-list application is running and nothing about the resolved OS
    // handler's identity or version, so a successful reuse stays
    // non-evidentiary for the certification baseline (FR-001).
    // `ps` and the `osascript` below are named, not spelled as absolute system
    // paths: this is Vite's own tab-reuse invocation, and pinning them has
    // been proposed against a repository that ships its own — the
    // adversarial-workspace model FR-019 rejects, whose machinery FR-019
    // forbids adding.
    const { stdout } = await execFileAsync('ps', ['cax'], {
      timeout: PROCESS_PROBE_TIMEOUT_MILLISECONDS,
      // Shutdown interrupts a probe already waiting instead of waiting it
      // out; the rejection lands in the catch below like a timeout's.
      signal,
    });
    const running = runningCommandNames(stdout);
    const application = CHROMIUM_APPLICATIONS.find((name) => running.has(name));
    if (application === undefined) {
      return false;
    }
    if (!shouldProceed()) {
      // A SIGINT/SIGTERM that arrived while the `ps` probe ran: the reuse
      // script would focus or open a tab for a host that is already closing.
      // `false` is safe to return — the caller re-asks the same predicate
      // before its `open` fallback (`openStartupBrowser`), so nothing opens.
      return false;
    }
    await execFileAsync(
      'osascript',
      ['-l', 'JavaScript', '-e', CHROMIUM_TAB_REUSE_SCRIPT, url, application],
      // Bounded, because `osascript` blocks for as long as the one-time macOS
      // automation-consent dialog stays unanswered — and startup must not
      // wait on that indefinitely. Ten seconds is dialog-answering time; on
      // expiry the child is killed, the rejection lands in the catch below,
      // and the `open` fallback still surfaces the session in a new tab.
      // The same shutdown interrupt as the probe's: the script blocks for as
      // long as the automation-consent dialog stays unanswered, and a signal
      // must not leave shutdown waiting behind it — nor let a consent given
      // after the signal focus a tab for a closing host.
      { timeout: AUTOMATION_SCRIPT_TIMEOUT_MILLISECONDS, signal },
    );
    return true;
  } catch {
    // Reached when the user denies — or has denied — the one-time macOS
    // automation consent for controlling the probed browser, or when that
    // application quit between the probe and the script. The caller falls
    // back to `open`, exactly as if no Chromium-family browser were running.
    return false;
  }
}

/**
 * Opens the session URL in the user's browser, best-effort under FR-001. On
 * macOS a running Chromium-family browser is preferred so a tab already
 * showing the session is focused instead of duplicated (research.md § 3);
 * everywhere else — and whenever the reuse attempt does not apply or fails —
 * the maintained `open` package spawns the OS default handler. A rejection
 * from that fallback propagates to the caller, which owns the best-effort
 * swallow beside its already printed launch line.
 */
export async function openStartupBrowser(
  url: string,
  shouldProceed: () => boolean = () => true,
  signal?: AbortSignal,
): Promise<void> {
  // Asked before each launch step: a SIGINT/SIGTERM that arrived while the
  // reuse attempt ran must not have the fallback open a fresh browser for a
  // host that is already closing — the shutdown outranks the convenience.
  if (!shouldProceed()) {
    return;
  }
  if (process.platform === 'darwin' && (await reuseChromiumTab(url, shouldProceed, signal))) {
    return;
  }
  if (!shouldProceed()) {
    return;
  }
  // The last gate this function can hold: `open@11.0.1` resolves the platform's
  // handler asynchronously before it spawns, and exposes no signal or hook in
  // that window, so a shutdown accepted after this check can still be followed
  // by a browser opening. Nothing here can recall it either — on macOS the
  // launch is handed to LaunchServices, so killing the returned child would not
  // undo it. The residual window is accepted rather than defended with a check
  // that cannot close it.
  await open(url);
}
