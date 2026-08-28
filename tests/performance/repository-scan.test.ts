// T918: the scan half of the SC-002 release protocol (plan.md § Performance
// Goals; quickstart.md § SC-002 performance measurement).
//
// The protocol itself runs in the project's `globalSetup` (`global-run.ts`):
// exactly ten measured runs against one unchanged, manifest-bound fixture,
// each a fresh packaged-CLI process whose automatic scan settles outside
// timing, with one explicit rescan measured on the rendered page from its
// input dispatch to the request-correlated visible status and to the
// request-committed operable inventory. This suite asserts the scan half of
// every run in that series, and the nine-of-ten rule over them.
//
// What is gated everywhere is the protocol's integrity: the
// manifest/digest/profile binding, ten runs against one fixture, and each
// run's own request correlation — a run that measured the automatic baseline,
// or blended two admissions, is not a measurement of anything. The thresholds
// themselves are asserted where the checked-in profile applies and recorded
// where it does not ({@link isSc002MeasurementEnvironment}): the same figures
// on another machine measure that machine, so gating them on an arbitrary
// runner would decide the release by that runner's load.
import { describe, expect, inject, it } from 'vitest';

import {
  SC002_QUALIFYING_RUNS,
  SC002_RUN_COUNT,
  isSc002MeasurementEnvironment,
  loadSc002Manifest,
  loadSc002Profile,
  qualifyingSc002Runs,
} from './harness';

describe('SC-002 harness integrity', () => {
  it('binds the manifest, its canonical digest, and the profile together', () => {
    const { manifest, manifestSha256 } = loadSc002Manifest();
    expect(manifest.totalEntries).toBe(100_000);
    expect(manifest.matchingFiles).toBe(500);
    const profile = loadSc002Profile(manifest, manifestSha256);
    expect(profile.profileId.length).toBeGreaterThan(0);
    expect(profile.benchmark.command).toBe('pnpm run test:performance');
  });
});

describe('SC-002 ten-run series', () => {
  it('measured exactly ten runs on one profile, one manifest, and one fixture', () => {
    const records = inject('sc002RunRecords');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);

    expect(records).toHaveLength(SC002_RUN_COUNT);
    for (const [index, record] of records.entries()) {
      // Every run repeats the same identity: a series whose runs disagree
      // about the profile, the manifest version, or its canonical digest is
      // ten measurements of different things.
      expect(record.profileId, `run ${index}`).toBe(profile.profileId);
      expect(record.manifestVersion, `run ${index}`).toBe(manifest.manifestVersion);
      expect(record.manifestSha256, `run ${index}`).toBe(manifestSha256);
    }
  });

  it('measured its own explicit rescan in every run, never the automatic state', () => {
    const records = inject('sc002RunRecords');
    const requestIds = new Set<string>();
    for (const [index, record] of records.entries()) {
      // The measured generation is the one that request committed, one past
      // the baseline the automatic scan left: a run that recorded the
      // baseline measured a scan nobody dispatched.
      expect(record.committedGeneration, `run ${index}`).toBe(record.baselineGeneration + 1);
      expect(record.scanRequestId.length, `run ${index}`).toBeGreaterThan(0);
      // A fresh process per run, so each run's admission is its own: a
      // repeated ID would mean two runs shared a process, and the second
      // measured a generation the first had already committed.
      expect(requestIds.has(record.scanRequestId), `run ${index}`).toBe(false);
      requestIds.add(record.scanRequestId);
      // The inventory cannot be rendered before the status that precedes it.
      expect(record.inventoryMillis, `run ${index}`).toBeGreaterThanOrEqual(record.statusMillis);
    }
    // Every run starts from the same baseline, because every run runs against
    // the same unchanged fixture in a fresh process.
    expect(new Set(records.map((record) => record.baselineGeneration)).size).toBe(1);
  });

  it('satisfies every threshold in at least nine of the ten runs', () => {
    const records = inject('sc002RunRecords');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);
    // The criterion is one common subset: the same runs must meet all four
    // thresholds, so the count is over runs rather than over each threshold's
    // own passers ({@link qualifyingSc002Runs}).
    const qualifying = qualifyingSc002Runs(records).length;

    // Recorded for every run whatever the environment is: the figures, the
    // request each belongs to, and the profile and manifest they were measured
    // under are the measurement set (spec.md § SC-002).
    console.info(
      `SC-002 scan series: ${JSON.stringify({
        profileId: profile.profileId,
        manifestVersion: manifest.manifestVersion,
        manifestSha256,
        environment: {
          architecture: process.arch,
          runtime: process.versions.node,
          measurementProfile: isSc002MeasurementEnvironment(profile),
        },
        qualifying,
        runs: records.map((record) => ({
          scanRequestId: record.scanRequestId,
          committedGeneration: record.committedGeneration,
          statusMillis: record.statusMillis,
          inventoryMillis: record.inventoryMillis,
        })),
      })}`,
    );

    if (isSc002MeasurementEnvironment(profile)) {
      expect(qualifying).toBeGreaterThanOrEqual(SC002_QUALIFYING_RUNS);
    } else {
      // Off the profile's own host the thresholds are not this suite's to
      // judge, so what stays gated is that every run produced a figure to
      // publish at all.
      for (const [index, record] of records.entries()) {
        expect(record.statusMillis, `run ${index}`).toBeGreaterThan(0);
        expect(record.inventoryMillis, `run ${index}`).toBeGreaterThan(0);
      }
    }
  });
});
