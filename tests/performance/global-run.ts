// T183: executes the one SC-002 smoke pass for the performance project. The
// pass is one run by contract — one fresh process, one fixture, one measured
// rescan, the two standardized interactions on that rescan's generation —
// so it runs once here, before the suites, and both suites read this same
// run's record through `inject` instead of each starting a run of their own.
import { existsSync } from 'node:fs';
import type { TestProject } from 'vitest/node';

import { CLI_ENTRY } from '../e2e/launch-host';
import { runSc002SmokePass, type Sc002RunRecord } from './harness';

declare module 'vitest' {
  interface ProvidedContext {
    /** The one smoke run's record, shared by both performance suites. */
    sc002RunRecord: Sc002RunRecord;
  }
}

/** Runs the single smoke pass and provides its record to the suites. */
export default async function runSmokePassOnce(project: TestProject): Promise<void> {
  if (!existsSync(CLI_ENTRY)) {
    throw new Error('dist/cli.mjs is missing — run `pnpm run build` before the performance suite');
  }
  project.provide('sc002RunRecord', await runSc002SmokePass());
}
