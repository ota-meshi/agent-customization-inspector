// T050: deterministic Codex SKILL fixture repositories for the Phase 4
// inventory suites (FR-003, FR-004, FR-005, FR-024).
//
// The tree is built to make the allowlist's edges observable rather than
// assumed: every positive case has a near miss one segment away from it, so a
// selector that is too loose fails a test instead of quietly inventorying
// more of the user's repository than the contract permits. The near misses
// are the point of this module.
//
// Nothing here is fabricated content the product then re-reads as truth: the
// secret-bearing skill holds a literal credential-shaped string precisely so
// a test can prove it never reaches an inventory summary, and the harness is
// the only writer — the product must not mutate this tree (FR-023).
import { mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

/** What the current platform could actually materialize in the tree. */
export interface RepositoryFixtureCapabilities {
  /** Symbolic-link cases (linked skill file, linked directory, broken link) exist. */
  readonly symlinks: boolean;
}

/** One built Codex SKILL fixture repository. */
export interface CodexSkillFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `codex.repo.skill` allowlist must admit,
   * sorted exactly as the scan publishes them. Capability-gated members are
   * present only when the corresponding capability is.
   */
  readonly expectedSkillPaths: readonly string[];
  /**
   * Paths that sit one segment away from an admitted skill and must never be
   * admitted. Listing them explicitly is what makes an over-broad selector a
   * test failure rather than a silent inventory expansion.
   */
  readonly nearMissPaths: readonly string[];
}

/** The literal credential-shaped value the secret-bearing skill declares. */
export const FIXTURE_SECRET_LITERAL = 'ghp_FIXTURE000000000000000000000000000000';

// Writes one fixture file, creating parents. Every write happens here, before
// the product runs.
function write(root: string, relative: string, content: string): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

/** Creates one unique fixture root under the OS temporary directory. */
export function createRepositoryFixtureRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

/**
 * How many skills {@link buildCodexSkillFixture} materializes for the
 * performance case. Large enough that a per-entry cost shows up in a timed
 * scan, small enough that every suite can build the tree.
 */
export const PERFORMANCE_SKILL_COUNT = 60;

/**
 * Builds the canonical Codex SKILL fixture repository.
 *
 * Positive cases: a root-level skill, a skill whose directory name is
 * "malformed" by human convention (spaces, dots, uppercase) but is an
 * ordinary entry name the `ANY_NAME` step matches, an empty skill file, and a
 * secret-bearing skill.
 *
 * Near misses: a well-formed `.agents/skills/<name>/SKILL.md` in a nested
 * package directory, the `skills` directory's own `SKILL.md` (no name
 * segment), a `SKILL.md` one level too deep inside a skill, a singular
 * `.agent`/`.skill` misspelling, the dotless `agents/`, a case-varied
 * `SKILL.MD`, a sibling `README.md`, and a skill inside VCS internals.
 */
export function buildCodexSkillFixture(prefix = 'inspector-codex-skills'): CodexSkillFixture {
  const root = createRepositoryFixtureRoot(prefix);

  // Positive: the plainest possible case at the selected root.
  write(root, '.agents/skills/greet/SKILL.md', '---\nname: greet\n---\n\nSay hello.\n');
  // Positive: an entry name a human would call malformed. The contract's
  // dynamic step is an ordinary regular expression over the raw entry name,
  // so this is admitted like any other name — the Inspector does not judge
  // the authored name's validity.
  write(root, '.agents/skills/Weird Name.v2/SKILL.md', '# Weird\n');
  // Positive: an empty file is still an admitted, readable candidate.
  write(root, '.agents/skills/empty/SKILL.md', '');
  // Positive: a literal credential in authored source. It must be readable
  // through the detail route only, never through an inventory summary.
  write(root, '.agents/skills/secretive/SKILL.md', `token: ${FIXTURE_SECRET_LITERAL}\n`);

  // Near miss: a perfectly well-formed skill, one package directory below the
  // root. Codex scans `.agents/skills` from its working directory *upward* to
  // the repository root and never descends, and the selected root is that
  // repository root (FR-001), so this file is never loaded. Admitting it would
  // report a skill the agent does not read — this is the one near miss that a
  // leading `ANY_DIRECTORIES` would wrongly accept.
  write(root, 'packages/api/.agents/skills/deploy/SKILL.md', '# Deploy\n');
  // Near miss: no skill-name segment between `skills` and the file.
  write(root, '.agents/skills/SKILL.md', 'no name segment\n');
  // Near miss: one level deeper than the single direct-child name step.
  write(root, '.agents/skills/greet/nested/SKILL.md', 'too deep\n');
  // Near miss: singular directory names.
  write(root, '.agents/skill/solo/SKILL.md', 'singular skill dir\n');
  write(root, '.agent/skills/solo/SKILL.md', 'singular agent dir\n');
  // Near miss: the dotless spelling.
  write(root, 'agents/skills/solo/SKILL.md', 'no leading dot\n');
  // Near miss: the terminal literal is case-sensitive. It lives in its own
  // skill directory because a case-insensitive filesystem (APFS, NTFS) would
  // otherwise treat it as the same entry as the admitted `SKILL.md` beside it.
  write(root, '.agents/skills/uppercase/SKILL.MD', 'wrong case\n');
  // Near miss: a sibling file inside an admitted skill directory.
  write(root, '.agents/skills/greet/README.md', 'sibling\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.agents/skills/hidden/SKILL.md', 'vcs internal\n');
  // Unrelated file that shares no segment with the selector.
  write(root, 'README.md', 'unrelated\n');

  // Performance: enough sibling skills that a scan does real work. They are
  // siblings inside the one admitted skills directory, because that is where
  // an anchored program actually does its work.
  for (let index = 0; index < PERFORMANCE_SKILL_COUNT; index += 1) {
    write(root, `.agents/skills/bulk-${index}/SKILL.md`, `# ${index}\n`);
  }

  const expectedSkillPaths = [
    '.agents/skills/Weird Name.v2/SKILL.md',
    '.agents/skills/empty/SKILL.md',
    '.agents/skills/greet/SKILL.md',
    '.agents/skills/secretive/SKILL.md',
    ...Array.from(
      { length: PERFORMANCE_SKILL_COUNT },
      (_unused, index) => `.agents/skills/bulk-${index}/SKILL.md`,
    ),
  ];

  // Linked cases are capability-gated: symlink creation can be unavailable on
  // Windows without developer mode, and a suite must skip exactly the
  // unprovable case rather than fake it.
  let symlinks = true;
  try {
    // A symlinked skill file is read transparently through its target,
    // because an agent loading the same path would resolve it too (FR-024).
    write(root, 'linked-target/SKILL.md', '# linked skill\n');
    mkdirSync(join(root, '.agents/skills/linked'), { recursive: true });
    symlinkSync(
      join(root, 'linked-target/SKILL.md'),
      join(root, '.agents/skills/linked/SKILL.md'),
    );
    // A link whose target is missing is that candidate's `file-unreadable`
    // Diagnostic, not an absent file.
    mkdirSync(join(root, '.agents/skills/broken'), { recursive: true });
    symlinkSync(join(root, 'no-such-target.md'), join(root, '.agents/skills/broken/SKILL.md'));
    expectedSkillPaths.push('.agents/skills/broken/SKILL.md', '.agents/skills/linked/SKILL.md');
  } catch {
    symlinks = false;
  }

  expectedSkillPaths.sort();

  return {
    root,
    capabilities: { symlinks },
    expectedSkillPaths,
    nearMissPaths: [
      '.agent/skills/solo/SKILL.md',
      '.agents/skill/solo/SKILL.md',
      '.agents/skills/SKILL.md',
      '.agents/skills/greet/README.md',
      '.agents/skills/uppercase/SKILL.MD',
      '.agents/skills/greet/nested/SKILL.md',
      '.git/.agents/skills/hidden/SKILL.md',
      'README.md',
      'agents/skills/solo/SKILL.md',
      'linked-target/SKILL.md',
      'packages/api/.agents/skills/deploy/SKILL.md',
    ],
  };
}
