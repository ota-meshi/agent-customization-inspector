// T918: executes the SC-002 release protocol for the performance project —
// exactly ten measured runs against one unchanged, manifest-bound fixture,
// each in a fresh packaged-CLI process, with the fixture and manifest digests
// recomputed immediately before the first run and after every run.
//
// The series runs here, once, before the suites: building the
// 100,000-entry fixture and launching ten processes is the measurement, and
// two suites each starting their own series would measure two different
// things and contend with each other while doing it. Both suites read this
// same series through `inject` — the scan suite asserts the scan half of
// every run, the interaction suite the interaction half.
import { existsSync } from 'node:fs';
import type { TestProject } from 'vitest/node';

import { CLI_ENTRY } from '../e2e/launch-host';
import { runSc002MeasurementSeries, type Sc002RunRecord } from './harness';

declare module 'vitest' {
  interface ProvidedContext {
    /** Every measured run's record, in run order, shared by both suites. */
    sc002RunRecords: readonly Sc002RunRecord[];
  }
}

/** Runs the ten-run series and provides its records to the suites. */
export default async function runMeasurementSeriesOnce(project: TestProject): Promise<void> {
  if (!existsSync(CLI_ENTRY)) {
    throw new Error('dist/cli.mjs is missing — run `pnpm run build` before the performance suite');
  }
  project.provide('sc002RunRecords', await runSc002MeasurementSeries());
}
