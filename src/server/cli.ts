#!/usr/bin/env node
// CLI entry (FR-001, T038/T047): captures the invocation working directory
// exactly once, validates the optional `--root`, bootstraps the session
// synchronously with zero filesystem I/O — the session's own constructor
// resolves the root lexically from those two facts — completes the automatic
// Repository scan, confirms the personal-setup consent when
// `--inspect-personal-setup` asked for it, and starts the loopback devframe
// host. This file
// is the direct `package.json.bin` target: tsdown preserves the shebang in
// the bundled `dist/cli.mjs`. A repeated `--root` follows Gunshi's
// deterministic last-wins; the product adds no duplicate-option check
// (FR-001).
//
// The option is `--root` because what it names is the repository root, not a
// working directory. Vendor lookups that walk upward from a working directory
// terminate at that repository root, so equating the two is what makes every
// Repository matcher a plainly anchored program instead of an ancestor
// search.
//
// Root selection (in the session constructor) is purely lexical and
// therefore performs no filesystem or network I/O and never calls
// `process.chdir()`: an absolute `--root` is kept exactly as given and a
// relative one is resolved against the one captured invocation directory.
// Whether the resulting root exists
// is not selection's question — the first scan answers it, and a missing or
// unreadable root becomes that scan's source-scoped `root-unreadable`
// Diagnostic while the session stays usable (FR-002).
//
// The command runner is exported and the process entry is guarded by
// `import.meta.main`, the same idiom `scripts/verify-package-files.mjs`
// uses: running `dist/cli.mjs` executes the CLI, while a test importing
// this module can exercise the same runner without launching it at import.
import { cli, define } from 'gunshi';
import packageJson from '../../package.json' with { type: 'json' };
import { executeRepositoryScan, runGlobalEnable, startInspectorHost } from './host/devframe-app';
import { DetectedFileOpener } from './host/file-opener';
import { GlobalConsentDomain, GlobalRootInputCapture } from './host/global-consent';
import { resolvePhysicalLocation } from './inspection/traversal';
import { selectRepositoryRoot, InspectionSession, SessionCoordinator } from './session/session';

// The one capture of the invocation working directory (FR-001), taken at
// module load before any argument validation. Selection never calls
// `process.cwd()` again and never calls `process.chdir()`. A `process.cwd()`
// throw here is ownerless and propagates to the process top level, so no
// session is created and no browser is opened.
const invocationCwd = process.cwd();

/**
 * The fixed actionable rejection for an option value the product cannot
 * use. Source-value-free by construction: it names the option and the
 * requirement, never the rejected value, so a pasted path never re-enters
 * terminal output (contracts/http-api.md § Host requirements #5).
 */
const ROOT_VALUE_REQUIRED = '--root requires a non-empty path value.';

/**
 * The fixed actionable rejection for extra operands. The command takes
 * options only; a positional or `--` rest argument means the caller expected
 * a different surface, so it is rejected rather than silently ignored.
 */
const NO_OPERANDS_ACCEPTED =
  'This command accepts options only. Pass the inspected repository root with --root <path>.';

/**
 * The root Gunshi command (FR-001): a negatable default-true `open` flag,
 * an optional `--root <path>` whose resolution is purely lexical, and an
 * optional `--port <number>` the host passes to devframe as a preference.
 */
const command = define({
  name: packageJson.name,
  args: {
    root: {
      type: 'string',
      description: 'Repository root to inspect (default: the invocation working directory)',
    },
    open: {
      type: 'boolean',
      default: true,
      negatable: true,
      description: 'Open the browser automatically (disable with --no-open)',
    },
    port: {
      type: 'number',
      description:
        'Preferred local port; 0 selects a free one automatically (default: devframe selects)',
    },
    'inspect-personal-setup': {
      type: 'boolean',
      default: false,
      description:
        'Also inspect your personal setup: the customization files each tool documents in its own configuration directory — instructions, skills, agents, prompts and commands, rules, permission policies, hooks, settings, output styles, and MCP declarations — plus the shared ~/.agents directory, its skills and its personal plugin marketplace file included; installed plugin copies are never read (this flag is the confirmation the consent page otherwise asks for)',
    },
  },
  async run(ctx) {
    // Strict operand rejection, before any session or browser exists. Gunshi
    // owns unknown-option rejection through `strict` below; positionals and
    // `--` rest arguments are collected rather than rejected, so the command
    // rejects them itself.
    if (ctx.positionals.length > 0 || ctx.rest.length > 0) {
      console.error(NO_OPERANDS_ACCEPTED);
      process.exitCode = 1;
      return;
    }
    const rootOptionValue = ctx.values.root ?? null;
    if (rootOptionValue === null && ctx.explicit.root) {
      // `--root ''` and `--root=` parse successfully, but Gunshi drops the
      // empty value, so `values.root` is indistinguishable from an omitted
      // option. `explicit` is the signal that separates them: without this
      // check an empty value would silently mean "the invocation
      // directory", selecting a root the caller never named. A missing
      // value (`--root` with nothing after it) is already the parser's own
      // typed validation error, so it is not re-checked here.
      console.error(ROOT_VALUE_REQUIRED);
      process.exitCode = 1;
      return;
    }
    // Capture the personal-setup inputs once for the whole session, before
    // launcher discovery. The same immutable capture is retained for every
    // consent preview below, so the roots excluded from editor probing cannot
    // differ from the roots a later confirmation authorizes. A capture failure
    // is an ownerless startup failure and propagates before a session or
    // browser exists (FR-013, FR-020, FR-022).
    const globalRootInputs = new GlobalRootInputCapture();
    const consent = new GlobalConsentDomain(globalRootInputs);
    const launcherExclusionRoots = globalRootInputs.entries
      .filter((entry) => entry.inputState === 'eligible')
      .map((entry) => entry.lexicalRoot);
    // Probed once, before the session exists: which applications this machine
    // can open a file in is a fact about the machine, and the snapshot offers
    // exactly what this opener can launch (contracts/http-api.md § open-file).
    // The selected Repository root and every eligible personal-setup root are
    // settled first because an executable under inspected content must never
    // become an editor this product offers.
    //
    // The Repository root is excluded by both its own spelling and the place
    // it physically is, because the scan reads the second: a root that is a
    // symbolic link — to `/`, in the case that makes this reachable — is read
    // wherever the link points, and a lexical comparison against the link's
    // own spelling would offer every executable under the tree being
    // inspected (FR-020, FR-022). A personal-setup root is not resolved:
    // FR-013 forbids touching a proposed one before consent, so those stay
    // lexical and `file-opener.ts` records what that leaves open.
    const repositoryRoot = selectRepositoryRoot(invocationCwd, rootOptionValue);
    const repositoryRootLocation = await resolvePhysicalLocation(repositoryRoot);
    const fileOpener = await DetectedFileOpener.probe(invocationCwd, [
      repositoryRoot,
      ...(repositoryRootLocation === null || repositoryRootLocation === repositoryRoot
        ? []
        : [repositoryRootLocation]),
      ...launcherExclusionRoots,
    ]);
    const session = new InspectionSession({ invocationCwd, rootOptionValue, fileOpener });
    const coordinator = new SessionCoordinator(session);
    const context = { session, coordinator };
    // Automatic first Repository scan (FR-002), owned by the ownerless
    // startup trigger. Completing it before host startup is both
    // deterministic and the simplest way to ensure the SPA's one initial
    // fetch cannot become stranded on generation 0.
    const repositorySourceId = session.repositorySourceId;
    const admission = coordinator.admitScan(repositorySourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind !== 'admitted') {
      // Bootstrap has no competing scan owner. A conflict would leave the
      // one-fetch shell permanently idle, so it is an unexpected startup
      // failure and propagates before a host or browser exists.
      throw new Error('the automatic Repository scan was not admitted');
    }
    // A deterministic root failure is retained as its lifecycle Diagnostic.
    // Any unexpected rejection is deliberately not caught, so it reaches
    // the process top level before a loopback listener is created
    // (spec.md Clarifications § Session 2026-07-22).
    await executeRepositoryScan(context, admission.scanRequestId, repositorySourceId, 'repository');
    if (ctx.values['inspect-personal-setup']) {
      // The flag is the confirmation. It states, in the command the reader
      // typed, the same thing the consent page's checkbox states: read the
      // customization files the allowlist names below the four member
      // directories, and nothing else in them (FR-013, FR-015 through
      // FR-018, FR-045). The preview is created from the retained startup
      // inputs and then confirmed, so what is read is decided by the same
      // roots that excluded inspected launchers and the same allowlist a
      // reader would have reviewed on screen.
      //
      // Awaited, for the reason the Repository scan above is: the personal
      // setup is read before the launch line prints, so the SPA's one initial
      // fetch already carries what that reading produced — a committed Global
      // generation when the batch admitted anything, and, when nothing could
      // be admitted, no Global generation at all and each member's own
      // `failureCode` on its control, which the consent page states. The flag
      // reports neither itself, because the terminal output is the one launch
      // line (contracts/http-api.md § Host requirements #5).
      //
      // An accepted batch's terminal failure propagates, as the Repository
      // scan's does: there is no host yet on which the session could state a
      // retained failure, so swallowing it would announce a launch URL for a
      // personal setup that was never read.
      await runGlobalEnable(context, consent.createPreview(), { onBatchFailure: 'propagate' });
    }
    // Install shutdown handling before the launch line becomes observable.
    // The host calls `onReady` before its `open` browser helper and returns
    // the server handle afterwards, so an interrupt in that small interval is
    // remembered and closes the handle as soon as it becomes available.
    let closeHost: (() => Promise<void>) | null = null;
    let closeWhenReady = false;
    // Aborts the startup opener's own child processes: `shouldProceed` stops
    // the next step, while this signal interrupts a wait already in
    // progress — the reuse script blocks for up to its timeout on the macOS
    // automation-consent dialog, and shutdown must not wait that out.
    const openerAbort = new AbortController();
    const requestClose = (): void => {
      if (closeWhenReady) {
        return;
      }
      closeWhenReady = true;
      openerAbort.abort();
      // A running scan outlives the host it was started for: closing the server
      // stops new requests but not the attempt already reading. Revoking its
      // publication authority first means a result arriving after shutdown
      // commits nothing (data-model.md § ScanAttempt).
      context.coordinator.revokeAllPublicationAuthority();
      if (closeHost !== null) {
        void reportCloseFailure(closeHost());
      }
    };
    for (const signal of ['SIGINT', 'SIGTERM'] as const) {
      process.once(signal, requestClose);
    }
    const server = await startInspectorHost({
      context,
      openBrowser: ctx.values.open,
      // A signal during the opener's own attempts must not end with a fresh
      // fallback browser for a closing host (§ requestClose above).
      openerShouldProceed: () => !closeWhenReady,
      openerAbortSignal: openerAbort.signal,
      // Forwarded exactly as parsed, `undefined` included: which port is bound
      // stays devframe's decision (FR-001), so the product neither substitutes
      // a default of its own nor range-checks a value devframe already
      // resolves against what the machine has free.
      preferredPort: ctx.values.port,
      // The same domain the flag above confirmed, so the consent page shows the
      // active consent instead of offering to work the directories out again.
      consent,
      onReady: ({ origin }) => {
        // The one launch line (FR-001, contracts/http-api.md § Host
        // requirements #4): the host invokes this after binding and before
        // its best-effort `open` browser helper, so the manual fallback is
        // always available first.
        console.log(`${origin}/`);
      },
    });
    closeHost = () => server.close();
    if (closeWhenReady) {
      await reportCloseFailure(closeHost());
    }
  },
});

/**
 * Awaits a host close and reports a failure instead of dropping it. Shutdown is
 * started from a signal handler and from the pre-ready interrupt path, where
 * there is no caller left to await the promise: without this a rejected close
 * becomes an unhandled rejection and the launch still exits zero, reporting a
 * clean shutdown that did not happen.
 */
async function reportCloseFailure(closing: Promise<void>): Promise<void> {
  try {
    await closing;
  } catch (error) {
    process.exitCode = 1;
    console.error(error);
  }
}

/**
 * Runs the root command for one argument vector and awaits its completion.
 * `strict` makes an undeclared option a validation error rather than an
 * ignored token: a mistyped flag must not be interpreted as consent to a
 * default. Help and version stay non-binding — they render and return
 * without creating a session or opening a browser.
 */
export async function runInspectorCli(argv: readonly string[]): Promise<void> {
  await cli([...argv], command, {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    strict: true,
    // The contracted terminal output is fixed help/version or validation
    // text plus the one launch line (contracts/http-api.md § Host
    // requirements #5) — no banner header or browser-helper outcome report.
    renderHeader: null,
  });
}

if (import.meta.main) {
  await runInspectorCli(process.argv.slice(2));
}
