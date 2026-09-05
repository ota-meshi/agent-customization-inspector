// T183, T918: the scan half of the performance smoke pass (plan.md
// § Performance Goals; quickstart.md § Performance smoke pass).
//
// The pass itself runs in the project's `globalSetup` (`global-run.ts`): one
// run against the unchanged, manifest-bound fixture in a fresh packaged-CLI
// process, whose automatic scan settles outside timing, with one explicit
// rescan observed on the rendered page from its input dispatch to the
// request-correlated visible status and to the request-committed operable
// inventory. This suite asserts the scan half of that run.
//
// What is gated is the pass's integrity: the manifest/digest/profile binding,
// and the run's own request correlation — a run that observed the automatic
// baseline, or blended two admissions, observed nothing. No threshold is
// asserted (spec.md § Clarifications, Session 2026-09-01): the global setup
// prints the figures for whoever reads the log, and the same figures on
// another machine describe that machine.
import { describe, expect, inject, it } from 'vitest';

import { loadSc002Manifest, loadSc002Profile } from './harness';

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

describe('the scan half of the smoke pass', () => {
  it('ran on the checked-in profile, manifest, and fixture', () => {
    const record = inject('sc002RunRecord');
    const { manifest, manifestSha256 } = loadSc002Manifest();
    const profile = loadSc002Profile(manifest, manifestSha256);
    // The record repeats the identity it was taken under: a run that
    // disagrees about the profile, the manifest version, or its canonical
    // digest observed something other than the reviewed fixture.
    expect(record.profileId).toBe(profile.profileId);
    expect(record.manifestVersion).toBe(manifest.manifestVersion);
    expect(record.manifestSha256).toBe(manifestSha256);
  });

  it('observed its own explicit rescan, never the automatic state', () => {
    const record = inject('sc002RunRecord');
    // The observed generation is the one that request committed, one past
    // the baseline the automatic scan left: a run that recorded the baseline
    // observed a scan nobody dispatched.
    expect(record.committedGeneration).toBe(record.baselineGeneration + 1);
    expect(record.scanRequestId.length).toBeGreaterThan(0);
    // The inventory cannot be rendered before the status that precedes it.
    expect(record.inventoryMillis).toBeGreaterThanOrEqual(record.statusMillis);
    // Both timers produced a figure, which is what the pass exists to prove;
    // the figures themselves are printed by the global setup rather than judged.
    expect(record.statusMillis).toBeGreaterThan(0);
    expect(record.inventoryMillis).toBeGreaterThan(0);
  });
});
