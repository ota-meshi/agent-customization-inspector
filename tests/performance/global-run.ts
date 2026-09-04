// T183, T918: the one performance smoke pass for the performance project —
// a single run against the unchanged, manifest-bound 100,000-entry fixture in
// a fresh packaged-CLI process, with the fixture and manifest digests
// recomputed immediately before and after it (plan.md § Performance Goals;
// quickstart.md § Performance smoke pass).
//
// The pass runs here, once, before the suites: building the fixture and
// launching the process is the whole of the pass, and two suites each running
// their own would build the tree twice and contend with each other while doing
// it. Both suites read this same record through `inject` — the scan suite
// asserts the scan half of it, the interaction suite the interaction half.
//
// No threshold is asserted anywhere (spec.md § Clarifications, Session
// 2026-09-01): a timing that would decide a release needs a frozen, recorded
// measurement host, and none is designated. What the pass proves is that the
// harness still expands, walks, and digests the fixture, and that one scan and
// its two standardized interactions still produce a figure at all.
import { existsSync } from 'node:fs';
import type { TestProject } from 'vitest/node';

import { CLI_ENTRY } from '../e2e/launch-host';
import { runSc002SmokePass, type Sc002RunRecord } from './harness';

declare module 'vitest' {
  interface ProvidedContext {
    /** The one smoke pass's record, shared by both suites. */
    sc002RunRecord: Sc002RunRecord;
  }
}

/**
 * Runs the smoke pass, prints its figures, and provides its record to the
 * suites. The figures are printed here rather than from the suites: what a
 * reader of the log wants is the one run's numbers, once, beside the identity
 * they were taken under, and this process writes to the terminal directly
 * where a suite's console output is the reporter's to show or fold.
 */
export default async function runSmokePassOnce(project: TestProject): Promise<void> {
  if (!existsSync(CLI_ENTRY)) {
    throw new Error('dist/cli.mjs is missing — run `pnpm run build` before the performance suite');
  }
  const record = await runSc002SmokePass();
  console.info(
    `SC-002 smoke pass: ${JSON.stringify({
      profileId: record.profileId,
      manifestVersion: record.manifestVersion,
      manifestSha256: record.manifestSha256,
      environment: { architecture: process.arch, runtime: process.versions.node },
      scanRequestId: record.scanRequestId,
      baselineGeneration: record.baselineGeneration,
      committedGeneration: record.committedGeneration,
      statusMillis: record.statusMillis,
      inventoryMillis: record.inventoryMillis,
      filterMillis: record.filterMillis,
      selectMillis: record.selectMillis,
    })}`,
  );
  project.provide('sc002RunRecord', record);
}
