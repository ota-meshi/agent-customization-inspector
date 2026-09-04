// T918: the interaction half of the performance smoke pass (plan.md
// § Performance Goals: one standardized filter action and one standardized
// item-selection action on the request-correlated complete inventory, each
// observed to visibly rendered feedback).
//
// Both interactions belong to the run that observed the scan — the same fresh
// process and the same explicit rescan's committed generation — so this suite
// reads the same record `globalSetup` produced and asserts the interaction
// half of it. No threshold is asserted (spec.md § Clarifications, Session
// 2026-09-01); the global setup prints the figures, for the reason the scan
// suite states.
import { describe, expect, inject, it } from 'vitest';

import { loadSc002Manifest, loadSc002Profile } from './harness';

describe('the interaction half of the smoke pass', () => {
  it('timed both interactions on the run’s own rescan-committed inventory', () => {
    const record = inject('sc002RunRecord');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);

    // The interactions ran in the same run as the observed rescan, on the
    // generation that request committed — never on the automatic baseline.
    expect(record.committedGeneration).toBe(record.baselineGeneration + 1);
    expect(record.profileId).toBe(profile.profileId);
    expect(record.manifestSha256).toBe(manifestSha256);
    expect(record.filterMillis).toBeGreaterThan(0);
    expect(record.selectMillis).toBeGreaterThan(0);
  });
});
