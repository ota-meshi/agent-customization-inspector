#!/usr/bin/env node
// CLI entry (FR-001, T038/T047): captures the invocation working directory
// exactly once, resolves the optional `--cwd` lexically, bootstraps the
// session synchronously with zero filesystem I/O, completes the Phase 3
// automatic Repository scan, and starts the loopback devframe host. This file
// is the direct `package.json.bin` target: tsdown preserves the shebang in
// the bundled `dist/cli.mjs`. A repeated `--cwd` follows Gunshi's
// deterministic last-wins; the product adds no duplicate-option check
// (FR-001, superseded 2026-07-23).
//
// Root selection is purely lexical and therefore performs no filesystem or
// network I/O of its own and never calls `process.chdir()`: an absolute
// `--cwd` is kept exactly as given and a relative one is resolved against
// the one captured invocation directory. Whether the resulting root exists
// is not selection's question — the first scan answers it, and a missing or
// unreadable root becomes that scan's source-scoped `root-unreadable`
// Diagnostic while the session stays usable (FR-002).
//
// The command runner is exported and the process entry is guarded by
// `import.meta.main`, the same idiom `scripts/verify-package-files.mjs`
// uses: running `dist/cli.mjs` executes the CLI, while a test importing
// this module can exercise the same runner without launching it at import.
import { isAbsolute, resolve } from 'node:path';
import { cli, define } from 'gunshi';
import packageJson from '../../package.json' with { type: 'json' };
import { executeRepositoryScan, startInspectorHost } from './host/devframe-app';
import { SessionCoordinator, createInspectionSession } from './session/session';

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
const CWD_VALUE_REQUIRED = '--cwd requires a non-empty path value.';

/**
 * The fixed actionable rejection for extra operands. The command takes
 * options only; a positional or `--` rest argument means the caller expected
 * a different surface, so it is rejected rather than silently ignored.
 */
const NO_OPERANDS_ACCEPTED =
  'This command accepts options only. Pass the inspected directory with --cwd <path>.';

/**
 * Resolves the selected Repository root lexically (FR-001): the captured
 * invocation directory when `--cwd` was omitted, the option value unchanged
 * when it is absolute, and the option resolved against the captured
 * directory when it is relative. Uses `node:path` operations only — it
 * never touches the filesystem, so it makes no claim about whether the root
 * exists.
 */
function selectRepositoryRoot(
  capturedInvocationCwd: string,
  cwdOptionValue: string | null,
): string {
  if (cwdOptionValue === null) {
    return capturedInvocationCwd;
  }
  return isAbsolute(cwdOptionValue) ? cwdOptionValue : resolve(capturedInvocationCwd, cwdOptionValue);
}

/**
 * The root Gunshi command (FR-001): a negatable default-true `open` flag
 * and an optional `--cwd <path>` whose resolution is purely lexical.
 */
const command = define({
  name: packageJson.name,
  args: {
    cwd: {
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
    const cwdOptionValue = ctx.values.cwd ?? null;
    if (cwdOptionValue === null && ctx.explicit.cwd) {
      // `--cwd ''` and `--cwd=` parse successfully, but Gunshi drops the
      // empty value, so `values.cwd` is indistinguishable from an omitted
      // option. `explicit` is the signal that separates them: without this
      // check an empty value would silently mean "the invocation
      // directory", selecting a root the caller never named. A missing
      // value (`--cwd` with nothing after it) is already the parser's own
      // typed validation error, so it is not re-checked here.
      console.error(CWD_VALUE_REQUIRED);
      process.exitCode = 1;
      return;
    }
    const selectedRepositoryRoot = selectRepositoryRoot(invocationCwd, cwdOptionValue);
    const session = createInspectionSession({
      invocationCwd,
      cwdOptionValue,
      selectedRepositoryRoot,
    });
    const coordinator = new SessionCoordinator(session);
    const context = { session, coordinator };
    // Automatic first Repository scan (FR-002), owned by the ownerless
    // startup trigger. At this Phase 3 checkpoint the catalog is empty, so
    // completing it before host startup is both deterministic and the
    // simplest way to ensure the SPA's one initial fetch cannot become
    // stranded on generation 0. T071 owns the later progress surface when
    // real family traversal plans make an in-flight scan user-visible.
    const repositorySourceId = session.internal.repositorySourceId;
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
    await executeRepositoryScan(
      context,
      admission.scanRequestId,
      repositorySourceId,
      'repository',
    );
    // Install shutdown handling before the launch line becomes observable.
    // devframe calls `onReady` before its browser helper and returns the
    // server handle afterwards, so an interrupt in that small interval is
    // remembered and closes the handle as soon as it becomes available.
    let closeHost: (() => Promise<void>) | null = null;
    let closeWhenReady = false;
    const requestClose = (): void => {
      if (closeWhenReady) {
        return;
      }
      closeWhenReady = true;
      if (closeHost !== null) {
        void closeHost();
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
        // requirements #4): devframe invokes this after binding and before
        // its best-effort browser helper, so the manual fallback is always
        // available first.
        console.log(`${origin}/`);
      },
    });
    closeHost = () => server.close();
    if (closeWhenReady) {
      void closeHost();
    }
  },
});

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
