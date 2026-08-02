// T050/T124: deterministic SKILL fixture repositories for the Phase 4 and
// Phase 8 inventory suites (FR-003, FR-004, FR-005, FR-024).
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
   *
   * Not admitted is not the same as not published: a near miss that happens to
   * sit inside an admitted skill's own directory is also that skill's companion
   * and is published as an ordinary file (see {@link expectedCompanionPaths}).
   * What "near miss" states is that no rule admitted it.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The files an admitted skill's census lists, sorted. They are read and
   * published as ordinary files that no rule admitted and nothing recognized
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   */
  readonly expectedCompanionPaths: readonly string[];
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
    symlinkSync(join(root, 'linked-target/SKILL.md'), join(root, '.agents/skills/linked/SKILL.md'));
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
    // Only `greet/` holds anything besides its own `SKILL.md`; every other
    // admitted skill directory has exactly one file.
    expectedCompanionPaths: [
      '.agents/skills/greet/README.md',
      '.agents/skills/greet/nested/SKILL.md',
    ],
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

/** One built mixed Claude-and-Codex SKILL fixture repository (T124). */
export interface ClaudeSkillFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `claude.repo.skill` allowlist must admit,
   * sorted exactly as the scan publishes them. Capability-gated members are
   * present only when the corresponding capability is.
   */
  readonly expectedClaudeSkillPaths: readonly string[];
  /**
   * Every Source-relative Path the `codex.repo.skill` allowlist must admit in
   * the same tree, sorted. The Codex-preservation half of the phase: the same
   * scan that adds Claude rows must keep admitting exactly these.
   */
  readonly expectedCodexSkillPaths: readonly string[];
  /**
   * Paths one segment away from an admitted skill that no rule may admit; see
   * {@link CodexSkillFixture.nearMissPaths}. The nested `.agents/skills` entry
   * matters most here: it is admitted for *Claude's* spelling and refused for
   * Codex's, so a scan that blurred the two vendors' expansions would fail on
   * it.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The files the admitted skills' censuses list, sorted. They are read and
   * published as ordinary files that no rule admitted and nothing recognized
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   */
  readonly expectedCompanionPaths: readonly string[];
}

/**
 * Builds the canonical mixed Claude-and-Codex SKILL fixture repository (T124).
 *
 * Positive Claude cases: a root-level skill, a *nested* skill in a package
 * directory — admitted for Claude because its documented discovery reaches
 * ancestor and lazy-descendant layers, where the same nesting is a Codex near
 * miss — and two skills whose directories share one name at different depths,
 * which must coexist as two rows rather than resolve to a winner.
 *
 * Codex-preservation cases: one admitted Codex skill and the nested Codex
 * near miss, so the suites can prove the Claude phase changed neither side of
 * the Codex allowlist.
 *
 * Symlink cases (capability-gated): a skill file that is a link and is read
 * transparently through its target, a broken link that yields that file's
 * `file-unreadable` outcome, and a directory link pointing back at the fixture
 * root, which the walk's real-path tracking must terminate rather than
 * recurse through (FR-024).
 */
export function buildClaudeSkillFixture(prefix = 'inspector-claude-skills'): ClaudeSkillFixture {
  const root = createRepositoryFixtureRoot(prefix);

  // Positive: the plainest possible case at the selected root.
  write(root, '.claude/skills/greet/SKILL.md', '---\nname: claude-greet\n---\n\nSay hello.\n');
  // Positive: a nested skill directory. Claude discovers descendant skill
  // layers lazily as files under them are accessed, so this is a real Claude
  // layer — and the exact shape that stays a near miss for Codex.
  write(root, 'packages/api/.claude/skills/deploy/SKILL.md', '# Nested deploy\n');
  // Positive: one directory name declared at two depths. Both are admitted and
  // both must remain visible; which one Claude would select stays conditional.
  write(root, '.claude/skills/dup/SKILL.md', '# root dup\n');
  write(root, 'packages/api/.claude/skills/dup/SKILL.md', '# nested dup\n');

  // Codex preservation: an admitted Codex skill beside the Claude ones, and
  // the nested Codex near miss the Claude expansion must not start admitting.
  write(root, '.agents/skills/codex-greet/SKILL.md', '---\nname: codex-greet\n---\n');
  write(root, 'packages/api/.agents/skills/deploy/SKILL.md', '# Codex near miss\n');

  // Near miss: no skill-name segment between `skills` and the file.
  write(root, '.claude/skills/SKILL.md', 'no name segment\n');
  // Near miss: one level deeper than the single direct-child name step. It
  // sits inside `greet/`, so it is also that skill's companion.
  write(root, '.claude/skills/greet/nested/SKILL.md', 'too deep\n');
  // Near miss: singular directory name.
  write(root, '.claude/skill/solo/SKILL.md', 'singular skills dir\n');
  // Near miss: the dotless spelling.
  write(root, 'claude/skills/solo/SKILL.md', 'no leading dot\n');
  // Near miss: the terminal literal is case-sensitive, in its own directory so
  // a case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.claude/skills/uppercase/SKILL.MD', 'wrong case\n');
  // Near miss: a sibling file inside an admitted skill directory.
  write(root, '.claude/skills/greet/README.md', 'sibling\n');
  // Near miss: VCS internals are excluded from traversal entirely — for
  // Claude's descendant expansion too, which would otherwise reach them.
  write(root, '.git/.claude/skills/hidden/SKILL.md', 'vcs internal\n');
  // Unrelated file that shares no segment with either selector.
  write(root, 'README.md', 'unrelated\n');

  const expectedClaudeSkillPaths = [
    '.claude/skills/dup/SKILL.md',
    '.claude/skills/greet/SKILL.md',
    'packages/api/.claude/skills/deploy/SKILL.md',
    'packages/api/.claude/skills/dup/SKILL.md',
  ];
  const nearMissPaths = [
    '.claude/skill/solo/SKILL.md',
    '.claude/skills/SKILL.md',
    '.claude/skills/greet/README.md',
    '.claude/skills/greet/nested/SKILL.md',
    '.claude/skills/uppercase/SKILL.MD',
    '.git/.claude/skills/hidden/SKILL.md',
    'README.md',
    'claude-linked-target/SKILL.md',
    'claude/skills/solo/SKILL.md',
    'packages/api/.agents/skills/deploy/SKILL.md',
  ];

  // Linked cases are capability-gated; see {@link buildCodexSkillFixture}.
  let symlinks = true;
  try {
    // A symlinked skill file is read transparently through its target, because
    // Claude loading the same path would resolve it too (FR-024;
    // contracts/vendors/claude-code.md § Known ambiguities item 9).
    write(root, 'claude-linked-target/SKILL.md', '# linked claude skill\n');
    mkdirSync(join(root, '.claude/skills/linked'), { recursive: true });
    symlinkSync(
      join(root, 'claude-linked-target/SKILL.md'),
      join(root, '.claude/skills/linked/SKILL.md'),
    );
    // A link whose target is missing is that candidate's `file-unreadable`
    // Diagnostic, not an absent file.
    mkdirSync(join(root, '.claude/skills/broken'), { recursive: true });
    symlinkSync(join(root, 'no-such-target.md'), join(root, '.claude/skills/broken/SKILL.md'));
    // A directory link back to the fixture root. The Claude program's leading
    // recursive step would walk it forever if the traversal did not track
    // visited real paths; terminating on it is the cycle-safety the phase must
    // prove. It admits nothing: the root's own real path is already visited.
    symlinkSync(root, join(root, '.claude/skills/cycle'));
    expectedClaudeSkillPaths.push(
      '.claude/skills/broken/SKILL.md',
      '.claude/skills/linked/SKILL.md',
    );
  } catch {
    symlinks = false;
  }

  expectedClaudeSkillPaths.sort();

  return {
    root,
    capabilities: { symlinks },
    expectedClaudeSkillPaths,
    expectedCodexSkillPaths: ['.agents/skills/codex-greet/SKILL.md'],
    // Only `greet/` holds anything besides its own `SKILL.md`; every other
    // admitted skill directory has exactly one file.
    expectedCompanionPaths: [
      '.claude/skills/greet/README.md',
      '.claude/skills/greet/nested/SKILL.md',
    ],
    nearMissPaths,
  };
}
