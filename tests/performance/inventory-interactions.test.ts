// T918: the interaction half of the SC-002 release protocol (plan.md
// § Performance Goals: after the request-correlated complete inventory is
// operable, one standardized filter action and one standardized
// item-selection action must each give visibly rendered feedback below
// 100 ms).
//
// Both interactions belong to the run that measured the scan — the same fresh
// process and the same explicit rescan's committed generation — so this suite
// reads the same ten-run series `globalSetup` produced and asserts the
// interaction half of every run in it. The threshold is asserted where the
// checked-in profile applies and recorded where it does not, for the reason
// the scan suite states.
import { describe, expect, inject, it } from 'vitest';

import {
  SC002_QUALIFYING_RUNS,
  SC002_RUN_COUNT,
  isSc002MeasurementEnvironment,
  loadSc002Manifest,
  loadSc002Profile,
  qualifyingSc002Runs,
} from './harness';

describe('SC-002 standardized interactions across the series', () => {
  it('timed both interactions on every run’s own rescan-committed inventory', () => {
    const records = inject('sc002RunRecords');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);

    expect(records).toHaveLength(SC002_RUN_COUNT);
    for (const [index, record] of records.entries()) {
      // The interactions ran in the same run as the measured rescan, on the
      // generation that request committed — never on the automatic baseline.
      expect(record.committedGeneration, `run ${index}`).toBe(record.baselineGeneration + 1);
      expect(record.profileId, `run ${index}`).toBe(profile.profileId);
      expect(record.manifestSha256, `run ${index}`).toBe(manifestSha256);
      expect(record.filterMillis, `run ${index}`).toBeGreaterThan(0);
      expect(record.selectMillis, `run ${index}`).toBeGreaterThan(0);
    }
  });

  it('is part of the common subset of at least nine qualifying runs', () => {
    const records = inject('sc002RunRecords');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);
    // A run qualifies only when all four of its figures do — both
    // interactions among them — because the contract's subset is one set of
    // runs rather than one per threshold ({@link qualifyingSc002Runs}).
    const qualifying = qualifyingSc002Runs(records).length;

    console.info(
      `SC-002 interaction series: ${JSON.stringify({
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
          filterMillis: record.filterMillis,
          selectMillis: record.selectMillis,
        })),
      })}`,
    );

    if (isSc002MeasurementEnvironment(profile)) {
      expect(qualifying).toBeGreaterThanOrEqual(SC002_QUALIFYING_RUNS);
    }
  });
});
