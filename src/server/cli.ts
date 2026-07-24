#!/usr/bin/env node
// CLI entry (FR-001, T038): captures the invocation working directory
// exactly once, resolves the optional `--cwd` lexically, bootstraps the
// session synchronously with zero filesystem I/O, starts the loopback
// devframe host, and kicks the automatic first Repository scan. This file
// is the direct `package.json.bin` target: tsdown preserves the shebang in
// the bundled `dist/cli.mjs`. A repeated `--cwd` follows Gunshi's
// deterministic last-wins; the product adds no duplicate-option check
// (FR-001, superseded 2026-07-23). The exhaustive Gunshi surface contract —
// strict unknown/positional rejection fixtures, help/version text, and
// launch-line fixtures — is completed by the Phase 3 CLI tasks (T043/T047)
// on top of this entry.
import { isAbsolute, resolve } from 'node:path';
import { cli, define } from 'gunshi';
import packageJson from '../../package.json' with { type: 'json' };
import { executeRepositoryScan, startInspectorHost } from './host/devframe-app';
import { SessionCoordinator, createInspectionSession } from './session/session';

// The one capture of the invocation working directory (FR-001), taken at
// module load before any argument validation. Selection never calls
// `process.cwd()` again and never calls `process.chdir()`.
const invocationCwd = process.cwd();

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
    const cwdOptionValue = ctx.values.cwd ?? null;
    // Lexical selection only (FR-001): an absolute --cwd is kept as given
    // and a relative one resolves against the captured invocation
    // directory; selection performs no filesystem I/O.
    const selectedRepositoryRoot =
      cwdOptionValue === null
        ? invocationCwd
        : isAbsolute(cwdOptionValue)
          ? cwdOptionValue
          : resolve(invocationCwd, cwdOptionValue);
    const session = createInspectionSession({
      invocationCwd,
      cwdOptionValue,
      selectedRepositoryRoot,
    });
    const coordinator = new SessionCoordinator(session);
    const context = { session, coordinator };
    await startInspectorHost({
      context,
      openBrowser: ctx.values.open,
      onReady: ({ origin }) => {
        // The one launch line (FR-001, contracts/http-api.md § Host
        // requirements #4): the plain loopback URL, printed once to the
        // initiating terminal for the manual fallback.
        console.log(`${origin}/`);
      },
    });
    // Automatic first Repository scan (FR-002), owned by the ownerless
    // startup trigger: a deterministic root failure is retained inside the
    // job as its lifecycle Diagnostic, while an unexpected rejection is
    // deliberately not caught here so it reaches the process top level
    // (spec.md Clarifications § Session 2026-07-22).
    const repositorySourceId = session.internal.repositorySourceId;
    const admission = coordinator.admitScan(repositorySourceId, {
      kind: 'startup',
      operationId: null,
    });
    if (admission.kind === 'admitted') {
      void executeRepositoryScan(context, admission.scanRequestId, repositorySourceId, 'repository');
    }
  },
});

await cli(process.argv.slice(2), command, {
  name: packageJson.name,
  version: packageJson.version,
  description: packageJson.description,
  // The contracted terminal output is only fixed help/version text, the
  // one launch line, and fixed actionable warnings (contracts/http-api.md
  // § Host requirements #5) — no banner header.
  renderHeader: null,
});
