// T050/T124/T152: deterministic SKILL fixture repositories for the Phase 4,
// Phase 8, and Phase 10 inventory suites (FR-003, FR-004, FR-005, FR-024).
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
   * Paths that sit one segment away from an admitted skill and that no
   * shipped rule may admit. Listing them explicitly is what makes an
   * over-broad selector a test failure rather than a silent inventory
   * expansion.
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
  // root. Codex scans `.agents/skills` upward and never descends, and no
  // Copilot surface documents a downward skill lookup from a root context, so
  // the file belongs to a runtime context this product does not select
  // (FR-003) — the one near miss a leading recursive step would wrongly
  // accept for either vendor's spelling.
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
    // Copilot shares the root `.agents` spelling, so `copilot.repo.skill`
    // admits exactly this same set; both vendors' recognitions attach to it.
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
   * Every Source-relative Path the `copilot.repo.skill` allowlist must admit
   * in the same tree, sorted: the root `.claude` and `.agents` skills, since
   * both spellings are shared at the root while no Copilot surface documents
   * a downward lookup — a nested `.claude` skill stays Claude's alone (T152).
   */
  readonly expectedCopilotSkillPaths: readonly string[];
  /**
   * Paths one segment away from an admitted skill that no shipped rule may
   * admit; see {@link CodexSkillFixture.nearMissPaths}.
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
  // the nested `.agents` near miss no rule may admit — Codex's and Copilot's
  // programs are both anchored at the root, so the same nesting that is a
  // real Claude layer under `.claude` stays out under `.agents` (T152).
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
    // Copilot shares both other vendors' spellings at the root alone, so its
    // admitted set is the root `.claude` skills plus the root Codex one.
    expectedCopilotSkillPaths: [
      ...expectedClaudeSkillPaths.filter((path) => !path.startsWith('packages/')),
      '.agents/skills/codex-greet/SKILL.md',
    ].sort(),
    // Only `greet/` holds anything besides its own `SKILL.md`; every other
    // admitted skill directory has exactly one file.
    expectedCompanionPaths: [
      '.claude/skills/greet/README.md',
      '.claude/skills/greet/nested/SKILL.md',
    ],
    nearMissPaths,
  };
}

/** One built three-vendor Copilot SKILL fixture repository (T152). */
export interface CopilotSkillFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the `copilot.repo.skill` allowlist must admit,
   * sorted: the root context of each of the three fixed directory spellings.
   */
  readonly expectedCopilotSkillPaths: readonly string[];
  /** The subset `codex.repo.skill` must also admit: the root `.agents` skill alone. */
  readonly expectedCodexSkillPaths: readonly string[];
  /**
   * The paths `claude.repo.skill` must admit: every `.claude` skill, root and
   * nested — the nested one through Claude's own documented lazy descendant
   * discovery, which no Copilot surface shares.
   */
  readonly expectedClaudeSkillPaths: readonly string[];
  /**
   * Paths `copilot.repo.skill` may not admit: nested contexts of its three
   * spellings, the one-direct-child depth violations, per-segment near
   * misses, VCS internals, and the configured-root shapes — a
   * `COPILOT_SKILLS_DIRS`-style directory and a repository `.copilot`
   * location — that stay condition facts rather than scan roots
   * (contracts/vendors/github-copilot.md § `copilot.excluded.extra-directories`).
   * The nested `.claude` entry is Claude's candidate and no one else's.
   */
  readonly copilotNearMissPaths: readonly string[];
  /**
   * The files the admitted skills' censuses list, sorted. They are read and
   * published as ordinary files that no rule admitted and nothing recognized.
   */
  readonly expectedCompanionPaths: readonly string[];
}

/**
 * Builds the canonical three-vendor Copilot SKILL fixture repository (T152).
 *
 * Positive cases exercise the exact recognition matrix at the root — a
 * `.github` skill is Copilot-only, an `.agents` skill is Codex+Copilot, and a
 * `.claude` skill is Claude+Copilot — with the root `.github` and `.claude`
 * skills declaring one shared name, so one grouped row carries a
 * Copilot-vs-Copilot collision whose only honest statement is
 * surface-dependent.
 *
 * Negative cases pin the selector edges: the nested contexts of all three
 * spellings — no Copilot surface documents a downward skill lookup from a
 * root context, so a nested skills directory belongs to a runtime context
 * this product does not select (FR-003); the nested `.claude` one stays a
 * real Claude lazy-discovery layer — plus no skill-name segment, one level
 * too deep, singular and dotless directory spellings, a case-varied terminal,
 * VCS internals, and two configured-root shapes that must never become scan
 * roots.
 */
export function buildCopilotSkillFixture(prefix = 'inspector-copilot-skills'): CopilotSkillFixture {
  const root = createRepositoryFixtureRoot(prefix);

  // Positive matrix, root: one skill per fixed directory spelling. `.github`
  // and `.claude` share a declared name so a Copilot collision exists.
  write(root, '.github/skills/ship/SKILL.md', '---\nname: voyage\n---\n\nGitHub ship.\n');
  write(root, '.agents/skills/orbit/SKILL.md', '---\nname: orbit\n---\n\nShared orbit.\n');
  write(root, '.claude/skills/lander/SKILL.md', '---\nname: voyage\n---\n\nClaude lander.\n');
  // Nested contexts of the same three spellings, one package below the root.
  // All three are Copilot near misses — no Copilot surface reads downward
  // from a root context — and only the `.claude` one is admitted at all, as a
  // Claude lazy-discovery layer.
  write(root, 'packages/api/.github/skills/nested-ship/SKILL.md', '# Nested ship\n');
  write(root, 'packages/api/.agents/skills/orbit-nested/SKILL.md', '# Nested near miss\n');
  write(root, 'packages/api/.claude/skills/lander-nested/SKILL.md', '# Nested lander\n');

  // Companions of the root `.github` skill: a sibling reference and a
  // one-level-too-deep `SKILL.md` that is also a depth near miss.
  write(root, '.github/skills/ship/reference.md', 'reference\n');
  write(root, '.github/skills/ship/nested/SKILL.md', 'too deep\n');

  // Near miss: no skill-name segment between `skills` and the file.
  write(root, '.github/skills/SKILL.md', 'no name segment\n');
  // Near miss: singular directory name.
  write(root, '.github/skill/solo/SKILL.md', 'singular skill dir\n');
  // Near miss: the dotless spelling.
  write(root, 'github/skills/solo/SKILL.md', 'no leading dot\n');
  // Near miss: the terminal literal is case-sensitive, in its own directory so
  // a case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.github/skills/uppercase/SKILL.MD', 'wrong case\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.github/skills/hidden/SKILL.md', 'vcs internal\n');
  // Configured-root exclusions: a directory a `COPILOT_SKILLS_DIRS` value or
  // a custom location setting could name, and a repository `.copilot`
  // directory. Both are documented behavior and neither is a shipped selector
  // spelling, so a scan admitting either has broadened the allowlist.
  write(root, 'copilot-configured/skills/tool/SKILL.md', 'configured root\n');
  write(root, '.copilot/skills/tool/SKILL.md', 'repository .copilot\n');
  // Unrelated file that shares no segment with any selector.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    expectedCopilotSkillPaths: [
      '.agents/skills/orbit/SKILL.md',
      '.claude/skills/lander/SKILL.md',
      '.github/skills/ship/SKILL.md',
    ],
    expectedCodexSkillPaths: ['.agents/skills/orbit/SKILL.md'],
    expectedClaudeSkillPaths: [
      '.claude/skills/lander/SKILL.md',
      'packages/api/.claude/skills/lander-nested/SKILL.md',
    ],
    // Only `ship/` holds anything besides its own `SKILL.md`.
    expectedCompanionPaths: [
      '.github/skills/ship/nested/SKILL.md',
      '.github/skills/ship/reference.md',
    ],
    copilotNearMissPaths: [
      '.copilot/skills/tool/SKILL.md',
      '.git/.github/skills/hidden/SKILL.md',
      '.github/skill/solo/SKILL.md',
      '.github/skills/SKILL.md',
      '.github/skills/ship/nested/SKILL.md',
      '.github/skills/ship/reference.md',
      '.github/skills/uppercase/SKILL.MD',
      'README.md',
      'copilot-configured/skills/tool/SKILL.md',
      'github/skills/solo/SKILL.md',
      'packages/api/.agents/skills/orbit-nested/SKILL.md',
      'packages/api/.claude/skills/lander-nested/SKILL.md',
      'packages/api/.github/skills/nested-ship/SKILL.md',
    ],
  };
}
