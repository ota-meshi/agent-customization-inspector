#!/usr/bin/env node
// CLI entry (FR-001, T038/T047): captures the invocation working directory
// exactly once, validates the optional `--root`, bootstraps the session
// synchronously with zero filesystem I/O — the session's own constructor
// resolves the root lexically from those two facts — completes the Phase 3
// automatic Repository scan, and starts the loopback devframe host. This file
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
import { executeRepositoryScan, startInspectorHost } from './host/devframe-app';
import { InspectionSession, SessionCoordinator } from './session/session';

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
 * The root Gunshi command (FR-001): a negatable default-true `open` flag
 * and an optional `--root <path>` whose resolution is purely lexical.
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
    const session = new InspectionSession({ invocationCwd, rootOptionValue });
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
    // Install shutdown handling before the launch line becomes observable.
    // The host calls `onReady` before its `open` browser helper and returns
    // the server handle afterwards, so an interrupt in that small interval is
    // remembered and closes the handle as soon as it becomes available.
    let closeHost: (() => Promise<void>) | null = null;
    let closeWhenReady = false;
    const requestClose = (): void => {
      if (closeWhenReady) {
        return;
      }
      closeWhenReady = true;
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
