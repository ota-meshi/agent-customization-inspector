// T1041: the contract gate over the frozen SC-003/SC-004/SC-005/SC-007 outcome
// manifest (`tests/fixtures/outcomes/manifest.json`, plan.md § Outcome fixture
// manifest; spec.md SC-003, SC-004, SC-005, SC-007).
//
// The manifest is the denominator those four criteria are measured against:
// each says "across 100% of manifested fixtures", so what the manifest lists
// decides what 100% means. Two things therefore have to hold, and this suite
// owns both.
//
// The first is the schema: a positive version, unique case IDs, real criterion
// and required-class membership, a fixture reference per case, an objective
// expected outcome, a byte digest per referenced fixture, nonempty required
// classes, and nonzero declared minima. Coverage of the exact `(tool, kind)`
// rows is cross-checked against the shipped registry rather than against a
// second copy of the row list: a rule added for a new row makes the missing
// case a failure here.
//
// The second is the freeze. `manifest.sha256` holds the canonical digest of the
// manifest's own bytes, and each fixture entry holds the digest of the artifact
// that decides what a case actually measures. Which artifact that is follows
// from the suite: one importing a shared builder binds to that builder, and one
// writing its own tree binds to itself, because its own bytes are the fixture.
// Binding every case to a builder instead would have recorded digests over
// bytes most cases never touch — a freeze that cannot fail is not a freeze.
//
// The cost is deliberate: editing a suite that carries its own fixture
// invalidates the recorded result for its cases, including when the edit was to
// an assertion rather than to the tree. Separating those would mean parsing the
// suite to find which statements write bytes, and a recorded measurement that
// re-binds itself on inspection is worth less than one that is simply re-taken.
//
// The change rules are table-driven over previous/current manifest objects and
// are pure functions of those two values. They consult no VCS history, no
// network, and no reviewer state, and they establish no human review: what they
// decide is whether a stated pair of revisions is internally consistent, which
// is all a test can decide. T1062 records the actual review separately.
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { INSPECTION_RULES } from '../../src/shared/registries/inspection-rules';

/** Absolute path of the checked-in outcome manifest. */
const MANIFEST_PATH = fileURLToPath(new URL('../fixtures/outcomes/manifest.json', import.meta.url));

/** Absolute path of the manifest's canonical SHA-256 companion. */
const MANIFEST_DIGEST_PATH = fileURLToPath(
  new URL('../fixtures/outcomes/manifest.sha256', import.meta.url),
);

/** Repository root, from which every recorded fixture path is resolved. */
const REPOSITORY_ROOT = new URL('../../', import.meta.url);

/**
 * The one command that re-records the freeze after a deliberate change. Named
 * in every freeze failure so the fix is not guessed at.
 */
const REGENERATION_COMMAND =
  'shasum -a 256 tests/fixtures/outcomes/manifest.json | cut -d" " -f1 > tests/fixtures/outcomes/manifest.sha256';

/**
 * The criteria this manifest is the denominator for (spec.md SC-003, SC-004,
 * SC-005, SC-007). SC-001, SC-002, SC-006, and SC-008 are measured by their own
 * protocols and are deliberately absent.
 */
const MANIFESTED_CRITERIA = ['SC-003', 'SC-004', 'SC-005', 'SC-007'] as const;

/** One criterion the outcome manifest carries cases for. */
type ManifestedCriterion = (typeof MANIFESTED_CRITERIA)[number];

/** How one fixture's bytes are fixed. */
interface ManifestFixture {
  /**
   * How the fixture's bytes are authored: `deterministic-builder` for a shared
   * builder module several suites import, `inline-fixture-suite` for a suite
   * that writes its own tree and is therefore its own fixture.
   */
  readonly kind: string;
  /** Repository-relative path of the artifact whose bytes this digest covers. */
  readonly path: string;
  /** Lowercase hex SHA-256 of that artifact's exact bytes. */
  readonly sha256: string;
}

/** One required class and the nonzero floor of cases the criterion needs for it. */
interface RequiredClass {
  /** Stable class identifier, unique within its criterion. */
  readonly classId: string;
  /** Declared nonzero minimum number of cases in this class. */
  readonly minimumCases: number;
}

/** One manifested outcome case. */
interface ManifestCase {
  /** Stable, unique case identifier; release records name it. */
  readonly caseId: string;
  /** The required classes this case belongs to; never empty. */
  readonly requiredClasses: readonly string[];
  /** Keys into {@link OutcomeFixtureManifest.fixtures}; never empty. */
  readonly fixtureRefs: readonly string[];
  /** The objective outcome a run of this case must observe. */
  readonly expectedOutcome: string;
  /** Repository-relative suite paths that execute this case. */
  readonly verifiedBy: readonly string[];
}

/** One criterion's required classes and cases. */
interface ManifestCriterion {
  /** The criterion these cases are the denominator for. */
  readonly criterion: ManifestedCriterion;
  /** The classes every case is assigned to; never empty. */
  readonly requiredClasses: readonly RequiredClass[];
  /** The criterion's cases. */
  readonly cases: readonly ManifestCase[];
}

/** The frozen outcome-fixture manifest. */
interface OutcomeFixtureManifest {
  /** Positive safe integer beginning at 1; a denominator change increments it. */
  readonly manifestVersion: number;
  /** Fixture reference table, keyed by the reference name cases use. */
  readonly fixtures: Readonly<Record<string, ManifestFixture>>;
  /** One entry per manifested criterion. */
  readonly criteria: readonly ManifestCriterion[];
}

/** A manifest together with the canonical digest recorded for its bytes. */
interface ManifestRevision {
  /** The manifest object. */
  readonly manifest: OutcomeFixtureManifest;
  /** The canonical SHA-256 recorded alongside those bytes. */
  readonly canonicalSha256: string;
}

/**
 * The closed verdict of comparing two manifest revisions
 * (plan.md § Outcome fixture manifest).
 */
type ManifestChangeVerdict =
  /** Denominator semantics, recorded fixture digests, and canonical digest all agree. */
  | 'unchanged'
  /** Denominator semantics changed and the version was incremented. */
  | 'accepted-denominator-change'
  /**
   * Only the fixture binding changed — a recorded digest, or which fixtures a
   * case runs against — and the canonical digest moved with it.
   */
  | 'accepted-fixture-binding-change'
  /** Denominator semantics changed without a greater `manifestVersion`. */
  | 'rejected-denominator-change-without-version-increment'
  /** A fixture's bytes changed while its recorded digest stayed. */
  | 'rejected-fixture-byte-change-without-fixture-digest-update'
  /** The fixture binding moved while the canonical manifest digest stayed. */
  | 'rejected-fixture-binding-change-without-canonical-digest-update';

/** Lowercase hex SHA-256 of the given bytes. */
function sha256Hex(bytes: string | Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The denominator semantics of one manifest, as one comparable string: the
 * per-criterion required-class definitions and, per case, its criterion, its
 * class membership, and its expected outcome. Fixture references, verifying
 * suites, and case order are deliberately outside it — moving a case to another
 * suite does not change what the criterion is measured over.
 */
function denominatorSignature(manifest: OutcomeFixtureManifest): string {
  const criteria = manifest.criteria
    .map((entry) => ({
      criterion: entry.criterion,
      requiredClasses: entry.requiredClasses
        .map((required) => `${required.classId}:${required.minimumCases}`)
        .toSorted(),
      cases: entry.cases
        .map((manifestCase) =>
          [
            manifestCase.caseId,
            manifestCase.requiredClasses.toSorted().join('+'),
            manifestCase.expectedOutcome,
          ].join(' '),
        )
        .toSorted(),
    }))
    .toSorted((a, b) => a.criterion.localeCompare(b.criterion));
  return JSON.stringify(criteria);
}

/**
 * What every case is measured against, as one comparable string: each fixture
 * entry's recorded digest, and each case's fixture references. Separate from
 * {@link denominatorSignature} because plan.md requires a version increment for
 * a denominator change and only a digest update for a binding change.
 */
function fixtureBinding(manifest: OutcomeFixtureManifest): string {
  const entries = Object.entries(manifest.fixtures)
    .map(([ref, fixture]) => `${ref}=${fixture.sha256}`)
    .toSorted();
  const cases = manifest.criteria
    .flatMap((entry) =>
      entry.cases.map(
        (manifestCase) =>
          `${manifestCase.caseId}->${manifestCase.fixtureRefs.toSorted().join('+')}`,
      ),
    )
    .toSorted();
  return JSON.stringify([entries, cases]);
}

/**
 * Classifies a stated previous/current revision pair. Pure in its two
 * arguments: what it applies are the manifest's own consistency rules, never a
 * claim about who reviewed the change.
 */
function classifyManifestChange(
  previous: ManifestRevision,
  current: ManifestRevision,
): ManifestChangeVerdict {
  const denominatorChanged =
    denominatorSignature(previous.manifest) !== denominatorSignature(current.manifest);
  if (denominatorChanged && current.manifest.manifestVersion <= previous.manifest.manifestVersion) {
    return 'rejected-denominator-change-without-version-increment';
  }

  // The binding is both halves of what a case is measured against: the bytes a
  // fixture entry records, and which entries the case names. Re-pointing a case
  // at another existing fixture changes the measurement exactly as much as
  // editing that fixture does, so both move the canonical digest.
  const bindingChanged = fixtureBinding(previous.manifest) !== fixtureBinding(current.manifest);
  if (bindingChanged && previous.canonicalSha256 === current.canonicalSha256) {
    return 'rejected-fixture-binding-change-without-canonical-digest-update';
  }

  if (denominatorChanged) return 'accepted-denominator-change';
  if (bindingChanged) return 'accepted-fixture-binding-change';
  return 'unchanged';
}

/**
 * Rejects a fixture whose bytes moved while its recorded digest did not. The
 * classifier above cannot see this: it compares two recorded states, while this
 * compares one recorded state against the tree it describes.
 */
function classifyFixtureBytes(
  revision: ManifestRevision,
  actualDigests: Readonly<Record<string, string>>,
): ManifestChangeVerdict {
  for (const [ref, fixture] of Object.entries(revision.manifest.fixtures)) {
    if (actualDigests[ref] !== fixture.sha256) {
      return 'rejected-fixture-byte-change-without-fixture-digest-update';
    }
  }
  return 'unchanged';
}

const manifestBytes = readFileSync(MANIFEST_PATH);
const manifest = JSON.parse(manifestBytes.toString('utf8')) as OutcomeFixtureManifest;
const recordedCanonicalDigest = readFileSync(MANIFEST_DIGEST_PATH, 'utf8').trim();

describe('outcome fixture manifest schema', () => {
  it('declares a positive safe-integer version beginning at 1', () => {
    expect(Number.isSafeInteger(manifest.manifestVersion)).toBe(true);
    expect(manifest.manifestVersion).toBeGreaterThanOrEqual(1);
  });

  it('carries one entry per manifested criterion', () => {
    expect(manifest.criteria.map((entry) => entry.criterion)).toEqual([...MANIFESTED_CRITERIA]);
  });

  it('gives every criterion nonempty required classes with nonzero declared minima', () => {
    for (const entry of manifest.criteria) {
      expect(entry.requiredClasses.length, entry.criterion).toBeGreaterThan(0);
      const classIds = entry.requiredClasses.map((required) => required.classId);
      expect(new Set(classIds).size, entry.criterion).toBe(classIds.length);
      for (const required of entry.requiredClasses) {
        expect(Number.isSafeInteger(required.minimumCases), required.classId).toBe(true);
        expect(required.minimumCases, required.classId).toBeGreaterThan(0);
      }
    }
  });

  it('meets every declared minimum', () => {
    for (const entry of manifest.criteria) {
      for (const required of entry.requiredClasses) {
        const count = entry.cases.filter((manifestCase) =>
          manifestCase.requiredClasses.includes(required.classId),
        ).length;
        expect(count, `${entry.criterion} ${required.classId}`).toBeGreaterThanOrEqual(
          required.minimumCases,
        );
      }
    }
  });

  it('gives every case a unique stable ID', () => {
    const ids = manifest.criteria.flatMap((entry) =>
      entry.cases.map((manifestCase) => manifestCase.caseId),
    );
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id, id).toMatch(/^sc00[34578]\.[a-z0-9.-]+$/u);
  });

  it('assigns every case to declared classes of its own criterion', () => {
    for (const entry of manifest.criteria) {
      const declared = new Set(entry.requiredClasses.map((required) => required.classId));
      for (const manifestCase of entry.cases) {
        expect(manifestCase.requiredClasses.length, manifestCase.caseId).toBeGreaterThan(0);
        for (const classId of manifestCase.requiredClasses) {
          expect(declared.has(classId), `${manifestCase.caseId} -> ${classId}`).toBe(true);
        }
        expect(
          manifestCase.caseId.startsWith(`${entry.criterion.toLowerCase().replace('-', '')}.`),
          manifestCase.caseId,
        ).toBe(true);
      }
    }
  });

  it('gives every case a fixture reference, an objective outcome, and a verifying suite', () => {
    for (const entry of manifest.criteria) {
      for (const manifestCase of entry.cases) {
        expect(manifestCase.fixtureRefs.length, manifestCase.caseId).toBeGreaterThan(0);
        for (const ref of manifestCase.fixtureRefs) {
          expect(manifest.fixtures[ref], `${manifestCase.caseId} -> ${ref}`).toBeDefined();
        }
        // An objective outcome states what a run observes. A one-word or hedged
        // entry cannot be checked against a run, so it fails here rather than at
        // the release gate that reads it.
        expect(manifestCase.expectedOutcome.length, manifestCase.caseId).toBeGreaterThan(40);
        expect(manifestCase.expectedOutcome, manifestCase.caseId).not.toMatch(
          /\b(?:should probably|may vary|as appropriate|TBD)\b/iu,
        );
        expect(manifestCase.verifiedBy.length, manifestCase.caseId).toBeGreaterThan(0);
        for (const suite of manifestCase.verifiedBy) {
          expect(suite, manifestCase.caseId).toMatch(/^tests\/[\w./-]+\.(?:test|spec)\.ts$/u);
          expect(
            readFileSync(new URL(suite, REPOSITORY_ROOT), 'utf8').length,
            `${manifestCase.caseId} -> ${suite}`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});

describe('outcome fixture manifest coverage', () => {
  // The `(tool, kind)` denominator comes from the shipped registry, not from a
  // list kept beside it: a rule that introduces a row makes the missing case a
  // failure here instead of a silently smaller denominator (SC-003, SC-005).
  const registryRows = new Set<string>();
  for (const rule of Object.values(INSPECTION_RULES)) {
    if (rule.kind !== null) registryRows.add(`${rule.tool}|${rule.kind}`);
  }

  // Case IDs are lowercase, so `MCP` is `mcp` and `prompt/command` is
  // `prompt-command`; the manifest is authored to the same rule.
  const kindSlug = (kind: string): string => kind.toLowerCase().replace(/[ /]/gu, '-');

  it.each(['SC-003', 'SC-005'] as const)(
    '%s carries a supported-source-row case for every shipped (tool, kind) row',
    (criterion) => {
      const entry = manifest.criteria.find((candidate) => candidate.criterion === criterion)!;
      const covered = new Set(
        entry.cases
          .filter((manifestCase) => manifestCase.requiredClasses.includes('supported-source-row'))
          .map((manifestCase) => manifestCase.caseId),
      );
      const prefix = criterion.toLowerCase().replace('-', '');
      for (const row of registryRows) {
        const [tool, kind] = row.split('|');
        expect(covered.has(`${prefix}.row.${tool}.${kindSlug(kind!)}`), row).toBe(true);
      }
      expect(covered.size).toBe(registryRows.size);
    },
  );

  it('SC-003 carries every documented shared-file attribution combination', () => {
    // Enumerated rather than bounded below by two tools: a floor would pass a
    // manifest that dropped the one three-tool combination this release
    // documents, which is the case a two-tool check is least able to see.
    const documented = new Map<string, readonly string[]>([
      ['repository-agents-md', ['OpenAI Codex', 'GitHub Copilot']],
      ['repository-root-claude-md', ['Claude Code', 'GitHub Copilot']],
      ['repository-agents-skill', ['OpenAI Codex', 'GitHub Copilot']],
      ['repository-claude-skill', ['Claude Code', 'GitHub Copilot']],
      ['repository-claude-settings', ['Claude Code', 'GitHub Copilot']],
      ['repository-root-mcp-json', ['Claude Code', 'GitHub Copilot']],
      ['repository-marketplace-json', ['Claude Code', 'OpenAI Codex', 'GitHub Copilot']],
      ['global-shared-agent-home-skill', ['OpenAI Codex', 'GitHub Copilot']],
    ]);
    const entry = manifest.criteria.find((candidate) => candidate.criterion === 'SC-003')!;
    const shared = entry.cases.filter((manifestCase) =>
      manifestCase.requiredClasses.includes('shared-file-attribution'),
    );
    expect(shared.map((manifestCase) => manifestCase.caseId).toSorted()).toEqual(
      [...documented.keys()].map((combo) => `sc003.shared-file.${combo}`).toSorted(),
    );
    for (const manifestCase of shared) {
      const combo = manifestCase.caseId.replace('sc003.shared-file.', '');
      for (const tool of documented.get(combo)!) {
        expect(manifestCase.expectedOutcome, `${manifestCase.caseId} omits ${tool}`).toContain(
          tool,
        );
      }
    }
  });

  it('SC-003 carries one Global source-form case per vendor', () => {
    // The Repository row cases are verified by repository inventories, so the
    // Global boundary needs its own cases: it is admitted per consented member
    // rather than per `(tool, kind)` row, and that is what the admission specs
    // exercise (spec.md SC-003 "admitted source form").
    const entry = manifest.criteria.find((candidate) => candidate.criterion === 'SC-003')!;
    const global = entry.cases
      .filter((manifestCase) => manifestCase.requiredClasses.includes('global-source-form'))
      .map((manifestCase) => manifestCase.caseId)
      .toSorted();
    expect(global).toEqual([
      'sc003.global-source-form.claude',
      'sc003.global-source-form.codex',
      'sc003.global-source-form.copilot',
    ]);
  });
});

describe('outcome fixture manifest freeze', () => {
  it('reproduces the recorded canonical manifest digest', () => {
    expect(
      sha256Hex(manifestBytes),
      `the outcome manifest's bytes no longer match its recorded canonical digest. If the change was intended, re-record it with: ${REGENERATION_COMMAND}`,
    ).toBe(recordedCanonicalDigest);
  });

  it('reproduces every referenced fixture-byte digest', () => {
    for (const [ref, fixture] of Object.entries(manifest.fixtures)) {
      expect(['deterministic-builder', 'inline-fixture-suite'], ref).toContain(fixture.kind);
      const bytes = readFileSync(new URL(fixture.path, REPOSITORY_ROOT));
      expect(
        sha256Hex(bytes),
        `${fixture.path} changed, so every SC-003/SC-004/SC-005/SC-007 result recorded on it describes a tree that no longer exists. Re-record this entry's sha256, then ${REGENERATION_COMMAND}`,
      ).toBe(fixture.sha256);
    }
  });
});

describe('outcome fixture manifest change rules', () => {
  const baseFixture: ManifestFixture = {
    kind: 'deterministic-builder',
    path: 'tests/fixtures/repositories/build-fixtures.ts',
    sha256: 'a'.repeat(64),
  };
  const baseCase: ManifestCase = {
    caseId: 'sc003.row.codex.skill',
    requiredClasses: ['supported-source-row'],
    fixtureRefs: ['repositories'],
    expectedOutcome: 'The scan recognizes the candidate and publishes it in the skill inventory.',
    verifiedBy: ['tests/e2e/codex-skills-list.spec.ts'],
  };
  const base: OutcomeFixtureManifest = {
    manifestVersion: 1,
    fixtures: { repositories: baseFixture },
    criteria: [
      {
        criterion: 'SC-003',
        requiredClasses: [{ classId: 'supported-source-row', minimumCases: 1 }],
        cases: [baseCase],
      },
    ],
  };
  const baseRevision: ManifestRevision = { manifest: base, canonicalSha256: 'b'.repeat(64) };

  /** Returns `base` with one criterion's cases, and optionally its version, replaced. */
  const withCases = (
    cases: readonly ManifestCase[],
    manifestVersion = base.manifestVersion,
  ): OutcomeFixtureManifest => ({
    ...base,
    manifestVersion,
    criteria: [{ ...base.criteria[0]!, cases }],
  });

  /** Returns `base` with the one fixture entry's recorded digest replaced. */
  const withFixtureDigest = (sha256: string): OutcomeFixtureManifest => ({
    ...base,
    fixtures: { repositories: { ...baseFixture, sha256 } },
  });

  it.each([
    {
      name: 'an unchanged revision',
      current: baseRevision,
      expected: 'unchanged' as const,
    },
    {
      name: 'a removed case without a version increment',
      current: { manifest: withCases([]), canonicalSha256: 'c'.repeat(64) },
      expected: 'rejected-denominator-change-without-version-increment' as const,
    },
    {
      name: 'a reclassified case without a version increment',
      current: {
        manifest: withCases([{ ...baseCase, requiredClasses: ['shared-file-attribution'] }]),
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'rejected-denominator-change-without-version-increment' as const,
    },
    {
      name: 'a reworded expected outcome without a version increment',
      current: {
        manifest: withCases([{ ...baseCase, expectedOutcome: 'Something else entirely.' }]),
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'rejected-denominator-change-without-version-increment' as const,
    },
    {
      name: 'a changed required-class minimum without a version increment',
      current: {
        manifest: {
          ...base,
          criteria: [
            {
              ...base.criteria[0]!,
              requiredClasses: [{ classId: 'supported-source-row', minimumCases: 2 }],
            },
          ],
        },
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'rejected-denominator-change-without-version-increment' as const,
    },
    {
      name: 'a removed case with a version increment',
      current: { manifest: withCases([], 2), canonicalSha256: 'c'.repeat(64) },
      expected: 'accepted-denominator-change' as const,
    },
    {
      name: 'a fixture digest change without a canonical digest change',
      current: {
        manifest: withFixtureDigest('d'.repeat(64)),
        canonicalSha256: baseRevision.canonicalSha256,
      },
      expected: 'rejected-fixture-binding-change-without-canonical-digest-update' as const,
    },
    {
      name: 'a fixture digest change with a canonical digest change',
      current: {
        manifest: withFixtureDigest('d'.repeat(64)),
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'accepted-fixture-binding-change' as const,
    },
    {
      name: 'a case re-pointed at another fixture without a canonical digest change',
      current: {
        manifest: withCases([{ ...baseCase, fixtureRefs: ['other'] }]),
        canonicalSha256: baseRevision.canonicalSha256,
      },
      expected: 'rejected-fixture-binding-change-without-canonical-digest-update' as const,
    },
    {
      name: 'a case re-pointed at another fixture with a canonical digest change',
      current: {
        manifest: withCases([{ ...baseCase, fixtureRefs: ['other'] }]),
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'accepted-fixture-binding-change' as const,
    },
    {
      name: 'a moved verifying suite, which is not denominator semantics',
      current: {
        manifest: withCases([{ ...baseCase, verifiedBy: ['tests/e2e/skills-inventory.spec.ts'] }]),
        canonicalSha256: 'c'.repeat(64),
      },
      expected: 'unchanged' as const,
    },
  ])('classifies $name', ({ current, expected }) => {
    expect(classifyManifestChange(baseRevision, current)).toBe(expected);
  });

  it.each([
    {
      name: 'recorded digests that match the tree',
      actual: { repositories: baseFixture.sha256 },
      expected: 'unchanged' as const,
    },
    {
      name: 'a fixture whose bytes moved while its recorded digest stayed',
      actual: { repositories: 'e'.repeat(64) },
      expected: 'rejected-fixture-byte-change-without-fixture-digest-update' as const,
    },
  ])('classifies $name', ({ actual, expected }) => {
    expect(classifyFixtureBytes(baseRevision, actual)).toBe(expected);
  });
});
