// T183: the SC-002 scan smoke pass (plan.md § Performance Goals; quickstart.md
// § SC-002 performance measurement). The pass itself runs once, in the
// project's `globalSetup` (`global-run.ts`): one fresh packaged-CLI process,
// the automatic scan settled outside timing, one explicit rescan measured on
// the rendered page from its input dispatch to request-correlated visible
// status and to the request-committed operable inventory, the two
// standardized interactions on that same generation, and the fixture digests
// recomputed before and after. This suite asserts the scan half of that one
// shared run.
//
// Non-gating on the timings: the pass records the figures with the profile
// and manifest identity instead of asserting the 1 s/10 s thresholds, because
// a smoke run on an arbitrary development machine is not a measurement on a
// frozen measurement profile. What is gated is harness integrity — the
// manifest/digest/profile binding, and the fixture's exact content before and
// after the run. The ten-run nine-of-ten protocol is T918's.
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

describe('SC-002 scan smoke pass', () => {
  it('measured one explicit rescan on the rendered page in a fresh process', () => {
    const record = inject('sc002RunRecord');

    // The run's own coherence: the measured rescan committed the generation
    // after the automatic baseline, under one recorded request ID, on the
    // checked-in manifest and profile.
    const { manifest, manifestSha256 } = loadSc002Manifest();
    expect(record.manifestVersion).toBe(manifest.manifestVersion);
    expect(record.manifestSha256).toBe(manifestSha256);
    expect(record.committedGeneration).toBe(record.baselineGeneration + 1);
    expect(record.scanRequestId.length).toBeGreaterThan(0);

    // The smoke pass records; it does not gate (T918 owns the protocol).
    console.info(`SC-002 smoke record: ${JSON.stringify(record)}`);
    expect(record.statusMillis).toBeGreaterThanOrEqual(0);
    expect(record.inventoryMillis).toBeGreaterThanOrEqual(record.statusMillis);
  });
});
