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
// 2026-07-19): startup browser opening is the product's only
// child-process-initiating surface, and nothing spawned here receives
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
 * reloads an existing tab whose URL contains the session URL, retargets an
 * empty new-tab page next, and only otherwise opens a new tab
 * (research.md § 3). Reloading in place deliberately keeps a reused tab's
 * current client route.
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
  const emptyTabFound = lookupTabWithUrl('chrome://newtab/', app)
  if (emptyTabFound) {
    emptyTabFound.targetWindow.activeTabIndex = emptyTabFound.targetTabIndex
    emptyTabFound.targetTab.url = urlToOpen
    app.activate()
    return
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
      if (tab.url().includes(lookupUrl)) {
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
 * Attempts the macOS tab reuse: reads the process list for a running
 * Chromium-family application and, when one is found, runs the fixed reuse
 * script against it. Returns whether the script ran to completion; `false`
 * hands the URL to the caller's `open` fallback.
 */
async function reuseChromiumTab(url: string): Promise<boolean> {
  try {
    // `ps cax` prints the running command names only. The probe reads which
    // fixed-list application is running and nothing about the resolved OS
    // handler's identity or version, so a successful reuse stays
    // non-evidentiary for the certification baseline (FR-001).
    const { stdout } = await execFileAsync('ps', ['cax']);
    const application = CHROMIUM_APPLICATIONS.find((name) => stdout.includes(name));
    if (application === undefined) {
      return false;
    }
    await execFileAsync('osascript', [
      '-l',
      'JavaScript',
      '-e',
      CHROMIUM_TAB_REUSE_SCRIPT,
      url,
      application,
    ]);
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
export async function openStartupBrowser(url: string): Promise<void> {
  if (process.platform === 'darwin' && (await reuseChromiumTab(url))) {
    return;
  }
  await open(url);
}
