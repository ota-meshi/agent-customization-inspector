// T183: the SC-002 standardized-interaction smoke pass (plan.md § Performance
// Goals: after the request-correlated complete inventory is operable, one
// standardized filter action and one standardized item-selection action must
// each give visibly rendered feedback below 100 ms in the gated protocol).
//
// The pass runs once, in the project's `globalSetup` (`global-run.ts`), and
// both interactions belong to that same run — the same fresh process and the
// same explicit rescan's committed generation as the scan measurement, with
// the fixture digests recomputed before and after (spec.md § SC-002). This
// suite asserts the interaction half of that one shared run; the figures are
// recorded, not gated, and the ten-run nine-of-ten protocol on a frozen
// measurement profile is T918's.
import { describe, expect, inject, it } from 'vitest';

import { loadSc002Manifest, loadSc002Profile } from './harness';

describe('SC-002 interaction smoke pass', () => {
  it('timed the two standardized interactions on the rescan-committed inventory', () => {
    const record = inject('sc002RunRecord');

    // The interactions ran inside the same run as the measured rescan, on the
    // generation that request committed — never on the automatic baseline —
    // under the checked-in manifest and profile.
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);
    expect(record.committedGeneration).toBe(record.baselineGeneration + 1);
    expect(record.profileId).toBe(profile.profileId);
    expect(record.manifestSha256).toBe(manifestSha256);

    // Recorded, not gated: the thresholds are measured by T918's ten-run
    // protocol on the frozen measurement profile.
    console.info(
      `SC-002 interaction record: ${JSON.stringify({
        profileId: record.profileId,
        manifestVersion: record.manifestVersion,
        manifestSha256: record.manifestSha256,
        scanRequestId: record.scanRequestId,
        committedGeneration: record.committedGeneration,
        filterMillis: record.filterMillis,
        selectMillis: record.selectMillis,
      })}`,
    );
    expect(record.filterMillis).toBeGreaterThanOrEqual(0);
    expect(record.selectMillis).toBeGreaterThanOrEqual(0);
  });
});
