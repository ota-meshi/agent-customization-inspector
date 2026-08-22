// T050/T124/T152/T178/T205/T226/T245/T268: deterministic SKILL,
// Codex-instruction, Claude-instruction, Copilot-instruction, and all-vendor
// instruction fixture repositories for the Phase 4, Phase 8, Phase 10,
// Phase 12, Phase 15, Phase 17, Phase 19, and Phase 21 inventory suites
// (FR-003, FR-004, FR-005, FR-024, FR-028).
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
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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

// Writes one fixture file from raw bytes, for the deterministic binary case:
// a NUL byte is what the read boundary classifies as binary content, so the
// bytes are authored explicitly rather than through a text encoding.
function writeBytes(root: string, relative: string, content: Uint8Array): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
}

/** Creates one unique fixture root under the OS temporary directory. */
export function createRepositoryFixtureRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `${prefix}-`));
}

// Materializes a builder's capability-gated symbolic-link cases as one
// transaction: either every link exists and the returned description may
// include them, or none does. The two callbacks split what the capability
// question is actually about: `prepare` writes the ordinary target files and
// directories, whose failures always propagate — a failed `write` is a broken
// harness, never evidence about links — and `link` holds only the
// `symlinkSync` calls, where EPERM (Windows without developer mode), EACCES,
// and ENOSYS report the platform's link incapacity. Any other link error is a
// real failure and propagates. A link failure rolls the link-side entries
// back — a tree holding half of them would contradict the expected path and
// diagnostic sets the builder returns — while the prepared target files stay:
// the builder's `nearMissPaths` lists them unconditionally, so removing them
// would open the same description-versus-tree gap in the other direction.
// `rm` removes a symbolic link itself, never its target, so rolling back the
// cycle link cannot delete the tree it points at.
function tryMaterializeSymlinks(
  root: string,
  prepare: () => void,
  link: () => void,
  linkSidePaths: readonly string[],
): boolean {
  prepare();
  try {
    link();
    return true;
  } catch (cause) {
    for (const relative of linkSidePaths) {
      rmSync(join(root, relative), { recursive: true, force: true });
    }
    const code = (cause as NodeJS.ErrnoException).code;
    if (code === 'EPERM' || code === 'EACCES' || code === 'ENOSYS') {
      return false;
    }
    throw cause;
  }
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
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCodexSkillFixture(
  prefix = 'inspector-codex-skills',
  root = createRepositoryFixtureRoot(prefix),
): CodexSkillFixture {
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
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'linked-target/SKILL.md', '# linked skill\n');
      mkdirSync(join(root, '.agents/skills/linked'), { recursive: true });
      mkdirSync(join(root, '.agents/skills/broken'), { recursive: true });
    },
    () => {
      // A symlinked skill file is read transparently through its target,
      // because an agent loading the same path would resolve it too (FR-024).
      symlinkSync(
        join(root, 'linked-target/SKILL.md'),
        join(root, '.agents/skills/linked/SKILL.md'),
      );
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-target.md'), join(root, '.agents/skills/broken/SKILL.md'));
    },
    ['.agents/skills/linked', '.agents/skills/broken'],
  );
  if (symlinks) {
    expectedSkillPaths.push('.agents/skills/broken/SKILL.md', '.agents/skills/linked/SKILL.md');
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
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildClaudeSkillFixture(
  prefix = 'inspector-claude-skills',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeSkillFixture {
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
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'claude-linked-target/SKILL.md', '# linked claude skill\n');
      mkdirSync(join(root, '.claude/skills/linked'), { recursive: true });
      mkdirSync(join(root, '.claude/skills/broken'), { recursive: true });
    },
    () => {
      // A symlinked skill file is read transparently through its target, because
      // Claude loading the same path would resolve it too (FR-024;
      // contracts/vendors/claude-code.md § Known ambiguities item 9).
      symlinkSync(
        join(root, 'claude-linked-target/SKILL.md'),
        join(root, '.claude/skills/linked/SKILL.md'),
      );
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-target.md'), join(root, '.claude/skills/broken/SKILL.md'));
      // A directory link back to the fixture root. The Claude program's leading
      // recursive step would walk it forever if the traversal did not track
      // visited real paths; terminating on it is the cycle-safety the phase must
      // prove. It admits nothing: the root's own real path is already visited.
      symlinkSync(root, join(root, '.claude/skills/cycle'));
    },
    ['.claude/skills/linked', '.claude/skills/broken', '.claude/skills/cycle'],
  );
  if (symlinks) {
    expectedClaudeSkillPaths.push(
      '.claude/skills/broken/SKILL.md',
      '.claude/skills/linked/SKILL.md',
    );
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
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCopilotSkillFixture(
  prefix = 'inspector-copilot-skills',
  root = createRepositoryFixtureRoot(prefix),
): CopilotSkillFixture {
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

/** One built all-tool SKILL fixture repository (T178). */
export interface AllToolSkillFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /** Every Source-relative Path `codex.repo.skill` must admit, sorted. */
  readonly expectedCodexSkillPaths: readonly string[];
  /** Every Source-relative Path `claude.repo.skill` must admit, sorted. */
  readonly expectedClaudeSkillPaths: readonly string[];
  /** Every Source-relative Path `copilot.repo.skill` must admit, sorted. */
  readonly expectedCopilotSkillPaths: readonly string[];
  /**
   * The admitted paths whose bytes this scan cannot use — the NUL-carrying
   * candidate and, when symlinks exist, the broken link. They publish as
   * diagnostic-only files, gain no recognition, and are the deterministic
   * file-confined outcomes that make an otherwise publishable generation
   * `partial` (FR-028).
   */
  readonly diagnosticOnlyPaths: readonly string[];
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
  /**
   * Every Source-relative Path one complete scan publishes, sorted exactly as
   * the snapshot lists it: the union of the three admitted sets plus the
   * companions.
   */
  readonly expectedPublishedPaths: readonly string[];
  /**
   * The admitted skill an injected filesystem-operation failure targets. It
   * is an ordinary readable candidate; a suite makes its one read — or the
   * enumeration that would discover it — throw or reject through the closed
   * `fs-io` surface, and the fixture names it so those suites inject against
   * the same deterministic file. Only the filesystem injections address a
   * path: an injected recognition failure is a callback replacing the
   * recognizer itself and throws on the first candidate it is handed,
   * whichever file that is.
   */
  readonly injectionTargetPath: string;
  /** The secret-bearing skill whose literal must never leave the detail route. */
  readonly secretSkillPath: string;
}

/**
 * Builds the canonical all-tool SKILL fixture repository (T178): one tree
 * that exercises every supported selector and the complete recognition
 * matrix at once.
 *
 * Positive cases: a `.github` skill (Copilot-only), root `.agents` skills
 * (Codex+Copilot) — among them a same-name pair, a secret bearer, an empty
 * file, a NUL-carrying candidate, and the injection target — root `.claude`
 * skills (Claude+Copilot), and nested `.claude` skills (Claude alone, through
 * its documented lazy descendant discovery). Duplicate declared names exist
 * at three scopes: a Codex pair inside one directory (`alpha`), a Claude
 * directory name at two depths (`dup`), and a Copilot-vs-Copilot collision
 * across two of its directories (`voyage`).
 *
 * Deterministic failures: the NUL-carrying `.agents` candidate publishes as
 * `binary` with its diagnostic, and the capability-gated broken link as
 * `file-unreadable` — both file-confined, so the generation commits `partial`
 * while every other file publishes (FR-028). Injected failures are runtime
 * behavior, never tree state: suites inject filesystem-operation failures
 * against {@link injectionTargetPath} through the mocked `fs-io` surface,
 * while a recognition failure replaces the recognizer callback itself and
 * throws on the first candidate it is handed, addressing no path.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildAllToolSkillFixture(
  prefix = 'inspector-all-skills',
  root = createRepositoryFixtureRoot(prefix),
): AllToolSkillFixture {
  // Copilot-only: the `.github` spelling belongs to no other vendor. Its
  // declared name collides with the `.claude` lander below, so one grouped
  // row carries the surface-dependent Copilot statement.
  write(root, '.github/skills/ship/SKILL.md', '---\nname: voyage\n---\n\nGitHub ship.\n');
  // Companions of the `.github` skill: a sibling reference and a
  // one-level-too-deep `SKILL.md` that is also a depth near miss.
  write(root, '.github/skills/ship/reference.md', 'reference\n');
  write(root, '.github/skills/ship/nested/SKILL.md', 'too deep\n');

  // Codex+Copilot: the shared root `.agents` spelling. `orbit` is the file
  // the filesystem-failure injections target through the `fs-io` mocks; its
  // README makes it the one `.agents` skill with a census.
  write(root, '.agents/skills/orbit/SKILL.md', '---\nname: orbit\n---\n\nShared orbit.\n');
  write(root, '.agents/skills/orbit/README.md', 'orbit companion\n');
  // A same-name pair inside one skills directory: two files, one declared
  // name, so the Codex naming rule faces its own collision.
  write(root, '.agents/skills/alpha-a/SKILL.md', '---\nname: alpha\n---\n\nFirst alpha.\n');
  write(root, '.agents/skills/alpha-b/SKILL.md', '---\nname: alpha\n---\n\nSecond alpha.\n');
  // A literal credential in authored source, readable only through an
  // explicit detail request (FR-027).
  write(root, '.agents/skills/secretive/SKILL.md', `token: ${FIXTURE_SECRET_LITERAL}\n`);
  // An empty file is still an admitted, readable candidate.
  write(root, '.agents/skills/empty/SKILL.md', '');
  // Deterministic file-confined failure: NUL bytes in an admitted candidate
  // publish the textless `binary` item with its diagnostic (FR-025/FR-028).
  writeBytes(root, '.agents/skills/binary/SKILL.md', new Uint8Array([0x23, 0x00, 0xff, 0x00]));

  // Claude+Copilot at the root; Claude alone below it. `lander` declares the
  // colliding `voyage` name, and `dup` exists at two depths so Claude's
  // directory-name rule faces its own collision.
  write(root, '.claude/skills/lander/SKILL.md', '---\nname: voyage\n---\n\nClaude lander.\n');
  write(root, '.claude/skills/dup/SKILL.md', '# root dup\n');
  write(root, 'packages/api/.claude/skills/dup/SKILL.md', '# nested dup\n');
  write(root, 'packages/api/.claude/skills/deploy/SKILL.md', '# Nested deploy\n');

  // Near misses, one per selector edge; see the earlier builders for why
  // each is the exact shape an over-broad rule would wrongly admit.
  write(root, '.agents/skills/SKILL.md', 'no name segment\n');
  write(root, '.claude/skill/solo/SKILL.md', 'singular skill dir\n');
  write(root, 'agents/skills/solo/SKILL.md', 'no leading dot\n');
  write(root, '.github/skills/uppercase/SKILL.MD', 'wrong case\n');
  write(root, '.git/.agents/skills/hidden/SKILL.md', 'vcs internal\n');
  write(root, 'packages/api/.agents/skills/deploy/SKILL.md', 'nested codex context\n');
  write(root, 'packages/api/.github/skills/nested-ship/SKILL.md', 'nested github context\n');
  write(root, '.copilot/skills/tool/SKILL.md', 'repository .copilot\n');
  write(root, 'README.md', 'unrelated\n');

  const expectedCodexSkillPaths = [
    '.agents/skills/alpha-a/SKILL.md',
    '.agents/skills/alpha-b/SKILL.md',
    '.agents/skills/binary/SKILL.md',
    '.agents/skills/empty/SKILL.md',
    '.agents/skills/orbit/SKILL.md',
    '.agents/skills/secretive/SKILL.md',
  ];
  const expectedClaudeSkillPaths = [
    '.claude/skills/dup/SKILL.md',
    '.claude/skills/lander/SKILL.md',
    'packages/api/.claude/skills/deploy/SKILL.md',
    'packages/api/.claude/skills/dup/SKILL.md',
  ];
  const diagnosticOnlyPaths = ['.agents/skills/binary/SKILL.md'];
  const nearMissPaths = [
    '.agents/skills/SKILL.md',
    '.claude/skill/solo/SKILL.md',
    '.copilot/skills/tool/SKILL.md',
    '.git/.agents/skills/hidden/SKILL.md',
    '.github/skills/ship/nested/SKILL.md',
    '.github/skills/ship/reference.md',
    '.github/skills/uppercase/SKILL.MD',
    'README.md',
    'agents/skills/solo/SKILL.md',
    'claude-linked-target/SKILL.md',
    'packages/api/.agents/skills/deploy/SKILL.md',
    'packages/api/.github/skills/nested-ship/SKILL.md',
  ];

  // Linked cases are capability-gated; see {@link buildCodexSkillFixture}.
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'claude-linked-target/SKILL.md', '# linked claude skill\n');
      mkdirSync(join(root, '.claude/skills/linked'), { recursive: true });
      mkdirSync(join(root, '.agents/skills/broken'), { recursive: true });
    },
    () => {
      // A symlinked skill file reads transparently through its target (FR-024).
      symlinkSync(
        join(root, 'claude-linked-target/SKILL.md'),
        join(root, '.claude/skills/linked/SKILL.md'),
      );
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-target.md'), join(root, '.agents/skills/broken/SKILL.md'));
      // A directory link back to the fixture root, which the walk's real-path
      // tracking must terminate rather than recurse through (FR-024).
      symlinkSync(root, join(root, '.claude/skills/cycle'));
    },
    ['.claude/skills/linked', '.agents/skills/broken', '.claude/skills/cycle'],
  );
  if (symlinks) {
    expectedCodexSkillPaths.push('.agents/skills/broken/SKILL.md');
    expectedClaudeSkillPaths.push('.claude/skills/linked/SKILL.md');
    diagnosticOnlyPaths.push('.agents/skills/broken/SKILL.md');
  }

  expectedCodexSkillPaths.sort();
  expectedClaudeSkillPaths.sort();
  diagnosticOnlyPaths.sort();

  // Copilot admits the root context of all three spellings and descends into
  // none, so its set is the two other vendors' root subsets plus `.github`.
  const expectedCopilotSkillPaths = [
    ...expectedCodexSkillPaths,
    ...expectedClaudeSkillPaths.filter((path) => !path.startsWith('packages/')),
    '.github/skills/ship/SKILL.md',
  ].sort();

  const expectedCompanionPaths = [
    '.agents/skills/orbit/README.md',
    '.github/skills/ship/nested/SKILL.md',
    '.github/skills/ship/reference.md',
  ];

  return {
    root,
    capabilities: { symlinks },
    expectedCodexSkillPaths,
    expectedClaudeSkillPaths,
    expectedCopilotSkillPaths,
    diagnosticOnlyPaths,
    nearMissPaths,
    expectedCompanionPaths,
    expectedPublishedPaths: [
      ...new Set([
        ...expectedCodexSkillPaths,
        ...expectedClaudeSkillPaths,
        ...expectedCopilotSkillPaths,
        ...expectedCompanionPaths,
      ]),
    ].sort(),
    injectionTargetPath: '.agents/skills/orbit/SKILL.md',
    secretSkillPath: '.agents/skills/secretive/SKILL.md',
  };
}

/** The literal environment-reference text the instruction fixtures author. */
export const FIXTURE_ENVIRONMENT_REFERENCE = '${CODEX_FIXTURE_ENDPOINT}';

/** One built Codex instruction fixture repository (T205, extended by T1084). */
export interface CodexInstructionFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the static `codex.repo.instructions` allowlist
   * must admit, sorted exactly as the traversal discovers them.
   */
  readonly expectedInstructionPaths: readonly string[];
  /**
   * The Source-relative Paths the Copilot instruction rules admit in the same
   * tree, sorted. `AGENTS.md` is Codex's and Copilot's at the root, and the
   * nested `docs/AGENTS.md` is Copilot's alone: Codex's rule is anchored at
   * the selected root while Copilot's reaches every depth, so one file is a
   * Codex near miss and a Copilot candidate at once.
   */
  readonly expectedCopilotInstructionPaths: readonly string[];
  /**
   * Paths that sit one step away from an admitted file and that no shipped
   * rule or derivation of any product may admit — the nested chain the vendor
   * walks at runtime, spelling variants, VCS internals, and nested carriers.
   * Listing them explicitly is what makes an over-broad selector a test
   * failure rather than a silent inventory expansion.
   *
   * A path another product admits is not one of these, however plainly it is a
   * near miss for Codex: `docs/AGENTS.md` proves Codex's rule stays anchored at
   * the root, and the suites that scan Codex's rules alone assert their
   * admitted set exactly, which is what keeps that proof.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The Source-relative Path of the root `.codex/config.toml` carrier the
   * `codex.repo.config` rule admits (T1089). It declares the fallback
   * basenames below, and its one read seeds the derivation.
   */
  readonly configCarrierPath: string;
  /**
   * The fallback basenames the carrier declares, in authored order. One of
   * them names no on-disk file, so a scan proves an absent declared name is
   * the ordinary negative rather than a diagnostic.
   */
  readonly configuredFallbackBasenames: readonly string[];
  /**
   * The declared fallback files that exist on disk — the derived
   * `instructions` candidates the deriving stage must read and publish
   * (T1090), sorted.
   */
  readonly expectedDerivedFallbackPaths: readonly string[];
  /** The declared basename with no on-disk file: derives nothing, silently. */
  readonly absentFallbackBasename: string;
}

/**
 * Builds the canonical Codex instruction fixture repository.
 *
 * Positive cases: the root `AGENTS.override.md` — carrying a secret, a
 * literal environment reference, an import-like line, and a malformed
 * frontmatter-shaped block, none of which may fail a recognition that runs no
 * extractor — an empty root `AGENTS.md`, admitted like any readable candidate
 * even though the vendor's own selection would skip an empty file (FR-009),
 * the root `.codex/config.toml` carrier, and the two on-disk files its
 * declared fallback basenames name, which the deriving stage turns into
 * `instructions` candidates (T1090).
 *
 * Near misses: the nested per-directory chain Codex walks at runtime
 * (`docs/`, `packages/api/`), root spelling variants one step from each
 * literal, VCS internals, and a nested carrier. Case variants live in
 * near-miss directories because a case-insensitive filesystem would fold a
 * root-level variant into the admitted file itself.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCodexInstructionFixture(
  prefix = 'inspector-codex-instructions',
  root = createRepositoryFixtureRoot(prefix),
): CodexInstructionFixture {
  // Positive: the override, with every content shape the inventory must keep
  // inert — a frontmatter block whose declarations stay out of every session
  // summary, an import-like reference that stays source text (no cited Codex
  // page establishes a reference syntax, T217), a literal credential
  // (readable only through the detail route, FR-027), and a literal
  // environment reference that must never be resolved against the process
  // environment (FR-025). The block parses: a malformed block is the
  // instruction extraction's own `failed` state since T222, and that failure
  // case lives in the Phase 16 suites rather than in this inventory fixture,
  // whose committed generation stays complete.
  write(
    root,
    'AGENTS.override.md',
    [
      '---',
      'scope: override',
      `endpoint: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      '# Override instructions',
      '',
      '@docs/setup.md',
      `token: ${FIXTURE_SECRET_LITERAL}`,
      '',
    ].join('\n'),
  );
  // Positive: an empty regular file is still an admitted, readable candidate.
  // The vendor's first-non-empty selection is runtime behavior this product
  // does not project (FR-009).
  write(root, 'AGENTS.md', '');

  // Near miss: the per-directory chain Codex consults at runtime, one and
  // several directories below the selected root. The selected root is the one
  // in-scope layer of that chain (FR-003), so these belong to runtime working
  // directories this product does not select.
  write(root, 'docs/AGENTS.md', '# docs instructions\n');
  write(root, 'packages/api/AGENTS.override.md', '# nested override\n');
  // Near miss: spelling variants one step from each root literal. The case
  // variants live in the near-miss directories above because a root-level
  // `AGENTS.MD` would fold into the admitted `AGENTS.md` on a
  // case-insensitive filesystem.
  write(root, 'AGENT.md', 'singular\n');
  write(root, 'AGENTS-override.md', 'hyphenated\n');
  write(root, 'AGENTS.md.bak', 'backup suffix\n');
  write(root, 'docs/AGENTS.MD', 'wrong case\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/AGENTS.md', 'vcs internal\n');
  // Near miss: a nested carrier belongs to a runtime context this product
  // does not select, exactly like a nested AGENTS.md.
  write(root, 'packages/api/.codex/config.toml', 'project_doc_fallback_filenames = ["X.md"]\n');
  // Unrelated file that shares no segment with the selectors.
  write(root, 'README.md', 'unrelated\n');

  // The admitted configuration carrier and the fallback files it names
  // (T1084/T1090). One declared basename exists nowhere, so the scan proves
  // an absent declared name derives nothing — the ordinary negative, not a
  // diagnostic. `X.md` exists only in the nested near-miss carrier above, so
  // it also proves an unadmitted carrier seeds nothing.
  const configuredFallbackBasenames = ['TEAM_GUIDE.md', 'GUIDE.codex.md', 'ABSENT_GUIDE.md'];
  write(
    root,
    '.codex/config.toml',
    `project_doc_fallback_filenames = [${configuredFallbackBasenames
      .map((basename) => JSON.stringify(basename))
      .join(', ')}]\n`,
  );
  write(root, 'TEAM_GUIDE.md', '# configured fallback TEAM_GUIDE.md\n');
  write(root, 'GUIDE.codex.md', '# configured fallback GUIDE.codex.md\n');

  return {
    root,
    expectedInstructionPaths: ['AGENTS.md', 'AGENTS.override.md'],
    expectedCopilotInstructionPaths: ['AGENTS.md', 'docs/AGENTS.md'],
    nearMissPaths: [
      '.git/AGENTS.md',
      'AGENT.md',
      'AGENTS-override.md',
      'AGENTS.md.bak',
      'README.md',
      'docs/AGENTS.MD',
      'packages/api/.codex/config.toml',
      'packages/api/AGENTS.override.md',
      'X.md',
    ],
    configCarrierPath: '.codex/config.toml',
    configuredFallbackBasenames,
    expectedDerivedFallbackPaths: ['GUIDE.codex.md', 'TEAM_GUIDE.md'],
    absentFallbackBasename: 'ABSENT_GUIDE.md',
  };
}

/**
 * How many in-memory fallback declarations the retention cases feed the pure
 * validator (T208). Far above any plausible authored list, so an Inspector
 * numeric cap — which the contract forbids — would fail the count assertion
 * rather than hide behind a small fixture.
 */
export const NUMEROUS_FALLBACK_DECLARATION_COUNT = 64;

/**
 * Numerous distinct configured fallback basenames, in authored order, for the
 * complete-retention cases: every one must come back, in order, with no cap.
 */
export const NUMEROUS_FALLBACK_BASENAMES: readonly string[] = Array.from(
  { length: NUMEROUS_FALLBACK_DECLARATION_COUNT },
  (_unused, index) => `TEAM_GUIDE_${index}.md`,
);

/** One built Codex MCP carrier fixture repository (T280). */
export interface CodexMcpFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The Source-relative Path of the root `.codex/config.toml` carrier the
   * `codex.repo.config` rule admits — its first and only candidacy. The same
   * physical file still seeds the fallback derivation as configuration.
   */
  readonly carrierPath: string;
  /**
   * The server names the carrier declares as `[mcp_servers.*]` tables, in
   * authored order — the MCP inventory's rows, one per declaration. A
   * `mcp_servers` entry that is not a table is deliberately absent: a
   * malformed declaration is omitted whole.
   */
  readonly expectedServerNames: readonly string[];
  /**
   * Every Source-relative Path the static `codex.repo.instructions` allowlist
   * must admit, sorted — the unchanged instruction rows beside the new MCP
   * recognition.
   */
  readonly expectedInstructionPaths: readonly string[];
  /** The fallback basenames the carrier declares, in authored order. */
  readonly configuredFallbackBasenames: readonly string[];
  /** The declared fallback files on disk — the unchanged derived candidates, sorted. */
  readonly expectedDerivedFallbackPaths: readonly string[];
  /**
   * Paths no shipped rule or derivation of any product may admit: the nested
   * carrier chain Codex walks at runtime — which also re-declares a root
   * server name, proving nothing merges a duplicate in — and spelling
   * variants one step from the carrier's literals. The root `.mcp.json` is
   * deliberately not here: it is Claude's own carrier (T309), admitted by
   * `claude.repo.mcp` and by no Codex rule.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Codex MCP carrier fixture repository (T280).
 *
 * The one root carrier declares named servers with commands, arguments, URLs,
 * headers, environment values — a literal credential and a literal environment
 * reference among them, which must reach no snapshot and never be resolved
 * (FR-026/FR-027) — plus an inert agent-inheritance reference, an inert plugin
 * relationship, a malformed non-table `mcp_servers` entry, a malformed
 * numeric `command`, and the same fallback declaration Phase 15 activates, so
 * one scan proves the MCP rows, the unchanged instruction/fallback rows, and
 * the atomic omission of a malformed declaration at once.
 *
 * Near misses: the nested carrier chain (which re-declares `context7`, so a
 * duplicate name in an unadmitted layer provably contributes nothing) and
 * spelling variants beside the carrier's literals. The root `.mcp.json` is a
 * Claude candidate instead — not a Codex one — declaring no server, so the
 * same tree also proves the two products' carriers stay their own.
 */
export function buildCodexMcpFixture(
  prefix = 'inspector-codex-mcp',
  root = createRepositoryFixtureRoot(prefix),
): CodexMcpFixture {
  const configuredFallbackBasenames = ['TEAM_GUIDE.md'];
  write(
    root,
    '.codex/config.toml',
    [
      'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
      '',
      // An inert plugin relationship: a declared path never gains read
      // authority and creates no candidate.
      '[plugins]',
      'marketplace = "./.agents/plugins/marketplace.json"',
      '',
      '[mcp_servers]',
      // Malformed: a `mcp_servers` entry that is not a table declares no
      // server and is omitted whole.
      'broken = "not a table"',
      '',
      '[mcp_servers.context7]',
      'command = "npx"',
      'args = ["-y", "@upstash/context7-mcp"]',
      // An inert agent-inheritance reference beside the declaration.
      'agents = ["reviewer"]',
      '',
      '[mcp_servers.context7.env]',
      `API_KEY = "${FIXTURE_SECRET_LITERAL}"`,
      `ENDPOINT = "${FIXTURE_ENVIRONMENT_REFERENCE}"`,
      '',
      '[mcp_servers.docs-http]',
      'url = "https://docs.example.com/mcp"',
      '',
      '[mcp_servers.docs-http.headers]',
      `Authorization = "Bearer ${FIXTURE_SECRET_LITERAL}"`,
      '',
      // Malformed command: still a named declaration this release lists; no
      // field schema is applied before the detail phase that owns one.
      '[mcp_servers.odd]',
      'command = 42',
      '',
    ].join('\n'),
  );
  // The unchanged static instruction row and the declared fallback beside it.
  write(root, 'AGENTS.md', '# instructions\n');
  write(root, 'TEAM_GUIDE.md', '# configured fallback TEAM_GUIDE.md\n');

  // Not a Codex candidate — but Claude's own carrier (T309): the standalone
  // root MCP file is admitted by `claude.repo.mcp` alone, so this tree also
  // proves the two products' MCP carriers stay their own. It declares no
  // server, which is the null-row inventory case.
  write(root, '.mcp.json', '{ "mcpServers": {} }\n');
  // Near miss: the nested carrier chain belongs to runtime working
  // directories this product does not select; it re-declares a root server
  // name, so a duplicate in an unadmitted layer provably contributes nothing.
  write(root, 'packages/api/.codex/config.toml', '[mcp_servers.context7]\ncommand = "other"\n');
  // Near miss: spelling variants one step from the carrier's literals.
  write(root, '.codex/config.toml.bak', 'backup suffix\n');
  write(root, '.codex/nested/config.toml', 'wrong depth\n');

  return {
    root,
    carrierPath: '.codex/config.toml',
    expectedServerNames: ['context7', 'docs-http', 'odd'],
    expectedInstructionPaths: ['AGENTS.md'],
    configuredFallbackBasenames,
    expectedDerivedFallbackPaths: ['TEAM_GUIDE.md'],
    nearMissPaths: [
      '.codex/config.toml.bak',
      '.codex/nested/config.toml',
      'packages/api/.codex/config.toml',
    ],
  };
}

/** One built Claude permission-policy fixture repository (T1105). */
export interface ClaudePermissionsFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The shared project settings file, which declares a `permissions` object:
   * one permissions row, whose detail publishes the block and never the keys
   * around it.
   */
  readonly declaringCarrierPath: string;
  /**
   * The personal settings file, which declares its own `permissions` object —
   * a second row, because the row's identity is the declaring file's path.
   */
  readonly localCarrierPath: string;
  /**
   * A second fixture root whose shared settings file strict JSON cannot parse:
   * its extraction fails all-or-nothing, so the block is unknown rather than
   * absent (FR-028). Its own root because the two admitted filenames of one
   * root are already the declaring cases.
   */
  readonly malformedRoot: string;
  /** The rule strings the shared file's `allow` array declares, in authored order. */
  readonly allowRules: readonly string[];
  /**
   * A marker the shared file declares beside `permissions`, in a settings key
   * of its own: no permissions surface may show it, because the keys around
   * the block are the settings recognition's content (FR-007).
   */
  readonly unrelatedSettingsMarker: string;
  /**
   * A settings file in a subdirectory: the vendor documents the project scope
   * at the launch directory alone, so no selector reaches this one.
   */
  readonly nestedSettingsPath: string;
  /**
   * A third fixture root whose two settings files declare no `permissions`
   * object at all: admitted, readable candidates that gain no recognition and
   * reach no row.
   */
  readonly policylessRoot: string;
  /** One of that root's files, for a test that names a path rather than a set. */
  readonly policylessCarrierPath: string;
}

/** One built Claude rule fixture repository (T419). */
export interface ClaudeRuleFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `claude.repo.rules` allowlist must admit,
   * sorted exactly as the scan publishes them. Capability-gated members are
   * present only when the corresponding capability is.
   */
  readonly expectedRulePaths: readonly string[];
  /** The rule file whose frontmatter declares `paths` globs, and the globs it declares. */
  readonly pathScopedRulePath: string;
  /** The `paths` values that file declares, in authored order. */
  readonly declaredPaths: readonly string[];
  /**
   * The rule file whose frontmatter is malformed YAML: its extraction fails
   * all-or-nothing while the complete source stays displayed (FR-028).
   */
  readonly malformedRulePath: string;
  /**
   * The rule file whose body holds a literal credential and an environment
   * reference, so a test can prove neither reaches the inventory and neither
   * is resolved (FR-026, FR-027).
   */
  readonly secretRulePath: string;
  /**
   * Paths no shipped rule of any product may admit: the `.claude` locations
   * this release leaves out, the spelling variants one step from the
   * selector's literals, and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * Files another product owns and this one recognizes, listed apart from
   * {@link nearMissPaths} because a shipped rule does admit them — just not
   * the Claude rule one. They are what makes "a Claude rule file acquires no
   * Copilot recognition, and a Copilot file no rule one" a positive case in
   * the tree.
   */
  readonly otherVendorPaths: readonly string[];
}

/**
 * Builds the canonical Claude rule fixture repository (T419).
 *
 * The admitted set is every `.md` file under any `.claude/rules/` subtree,
 * which is two documented recursions at once: nested `.claude/rules/`
 * directories load on demand, and all `.md` files inside one rules directory
 * are discovered recursively. The tree exercises both — a root rules
 * directory with a subdirectory, and a `packages/api/.claude/rules/` with one
 * of its own — beside the near misses one segment away from each.
 *
 * The admitted files carry what a Claude rule carries: a `paths` frontmatter
 * scoping a rule to globs this product never evaluates, a rule with no
 * frontmatter at all, malformed YAML whose extraction fails while the source
 * stays displayed, and a literal credential and environment reference that
 * must reach no inventory and never be resolved.
 *
 * Copilot compatibility is proved by absence: the `.claude` instruction
 * locations Copilot documents are the ones this release leaves out, so the
 * tree holds Copilot's own files and the Claude rule files, and no file is
 * recognized as both.
 */
/**
 * Builds a Claude permission-policy fixture (T1105): the two root settings
 * files that declare a policy, one that declares none, one strict JSON
 * rejects, and a subdirectory copy no selector reaches.
 *
 * The declared blocks carry a literal credential and an environment reference
 * so a test can prove both are shown exactly as authored and neither is
 * resolved (FR-025, FR-026), and rule strings that name tools, commands,
 * paths, and a domain so a test can prove none of them is resolved or
 * evaluated (FR-019).
 */
export function buildClaudePermissionsFixture(
  prefix = 'inspector-claude-permissions',
  root = createRepositoryFixtureRoot(prefix),
): ClaudePermissionsFixture {
  const allowRules = ['Bash(npm run test:*)', 'Read(./src/**)', 'WebFetch(domain:example.com)'];
  // The shared project file: a declared policy beside settings keys that are
  // the `settings/config` recognition's content and reach no permissions
  // surface.
  write(
    root,
    '.claude/settings.json',
    `${JSON.stringify(
      {
        $schema: 'https://json.schemastore.org/claude-code-settings.json',
        permissions: {
          allow: allowRules,
          deny: [`Read(./${FIXTURE_SECRET_LITERAL}.env)`],
          ask: ['Bash(git push *)'],
          defaultMode: 'acceptEdits',
          additionalDirectories: ['../docs/'],
        },
        env: { CLAUDE_FIXTURE_ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE },
        companyAnnouncements: ['fixture-unrelated-settings-marker'],
      },
      null,
      2,
    )}\n`,
  );
  // The personal file: its own policy, so the two files are two rows.
  write(
    root,
    '.claude/settings.local.json',
    `${JSON.stringify({ permissions: { allow: ['Bash(git status)'] } }, null, 2)}\n`,
  );
  // A near miss: the project scope is the launch directory's own `.claude/`.
  write(root, 'packages/api/.claude/settings.json', '{ "permissions": { "allow": [] } }\n');
  // Two more roots, because one root has only two admitted filenames and both
  // are the declaring cases above: a settings file that declares no policy —
  // admitted, readable, and no row — and one strict JSON cannot parse.
  const policylessRoot = createRepositoryFixtureRoot(`${prefix}-policyless`);
  write(policylessRoot, '.claude/settings.json', '{ "model": "opus" }\n');
  write(policylessRoot, '.claude/settings.local.json', '{ "env": { "A": "1" } }\n');
  const malformedRoot = createRepositoryFixtureRoot(`${prefix}-malformed`);
  write(malformedRoot, '.claude/settings.json', '{ "permissions": { "allow": [ }\n');
  return {
    root,
    declaringCarrierPath: '.claude/settings.json',
    localCarrierPath: '.claude/settings.local.json',
    malformedRoot,
    allowRules,
    unrelatedSettingsMarker: 'fixture-unrelated-settings-marker',
    nestedSettingsPath: 'packages/api/.claude/settings.json',
    policylessRoot,
    policylessCarrierPath: '.claude/settings.local.json',
  };
}

export function buildClaudeRuleFixture(
  prefix = 'inspector-claude-rules',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeRuleFixture {
  const declaredPaths = ['src/api/**/*.ts', 'src/**/*.{ts,tsx}'];
  // A path-scoped rule: the globs are declared values this product publishes
  // and never runs against the filesystem.
  write(
    root,
    '.claude/rules/api.md',
    [
      '---',
      'paths:',
      ...declaredPaths.map((glob) => `  - "${glob}"`),
      '---',
      '',
      '# API Development Rules',
      '',
      '- All API endpoints must include input validation',
      '',
    ].join('\n'),
  );
  // A rule with no frontmatter: the vendor loads it unconditionally, and this
  // product publishes it with no declarations.
  write(root, '.claude/rules/code-style.md', '# Code style\n\n- Two spaces.\n');
  // Recursive inside one rules directory: the page shows `frontend/` and
  // `backend/` subdirectories doing exactly this.
  write(root, '.claude/rules/frontend/components.md', '# Components\n\n- One per file.\n');
  // Malformed YAML frontmatter: extraction fails all-or-nothing while the
  // complete source stays displayed (FR-028).
  write(root, '.claude/rules/broken.md', '---\npaths: [src/**\n---\n\n# Broken\n');
  // The credential and environment-reference case: both are authored text a
  // rule file happens to contain, and neither may reach an inventory row or
  // be resolved against the process environment (FR-026, FR-027).
  write(
    root,
    '.claude/rules/secrets.md',
    [
      '# Deployment',
      '',
      `- Never commit ${FIXTURE_SECRET_LITERAL}.`,
      `- The endpoint is ${FIXTURE_ENVIRONMENT_REFERENCE}.`,
      '',
    ].join('\n'),
  );
  // A nested rules directory, which the page documents as loading on demand:
  // a descendant inventory rather than a guess at a session's working
  // directory.
  write(root, 'packages/api/.claude/rules/http.md', '# HTTP\n\n- Prefer 204.\n');
  write(root, 'packages/api/.claude/rules/deep/nested/timeouts.md', '# Timeouts\n');

  // Near miss: the container literals are exact.
  write(root, '.claude/rule/code-style.md', 'singular rules dir\n');
  write(root, 'claude/rules/code-style.md', 'no leading dot\n');
  write(root, 'rules/code-style.md', 'no .claude above it\n');
  // Near miss: the terminal step is the extension, in its own directory so a
  // case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.claude/rules/uppercase/STYLE.MD', 'wrong case\n');
  write(root, '.claude/rules/notes.md.bak', 'backup suffix\n');
  write(root, '.claude/rules/script.sh', 'echo not markdown\n');
  // Near miss: VCS internals are excluded from traversal entirely, which the
  // leading recursive step would otherwise reach.
  write(root, '.git/.claude/rules/hidden.md', 'vcs internal\n');
  // Near miss: an installed dependency tree is never entered.
  write(root, 'node_modules/pkg/.claude/rules/vendored.md', 'installed package\n');
  // An unrelated file sharing no segment with the selector.
  write(root, 'README.md', 'unrelated\n');

  // Other products' own customizations, admitted by their own rules and by no
  // Claude rule one. The `.claude/CLAUDE.md` beside the rules directory is the
  // sharpest case: it is a Claude instruction file, not a rule.
  write(root, '.claude/CLAUDE.md', '# Directory-form project instructions\n');
  write(root, '.github/copilot-instructions.md', '# Repository-wide instructions\n');

  const expectedRulePaths = [
    '.claude/rules/api.md',
    '.claude/rules/broken.md',
    '.claude/rules/code-style.md',
    '.claude/rules/frontend/components.md',
    '.claude/rules/secrets.md',
    'packages/api/.claude/rules/deep/nested/timeouts.md',
    'packages/api/.claude/rules/http.md',
  ];
  const nearMissPaths = [
    '.claude/rule/code-style.md',
    '.claude/rules/notes.md.bak',
    '.claude/rules/script.sh',
    '.claude/rules/uppercase/STYLE.MD',
    '.git/.claude/rules/hidden.md',
    'claude/rules/code-style.md',
    'claude-rules-linked-target.md',
    'node_modules/pkg/.claude/rules/vendored.md',
    'rules/code-style.md',
    'shared-claude-rules/security.md',
  ];

  // Linked cases are capability-gated; see {@link buildCodexSkillFixture}. The
  // vendor documents `.claude/rules/` supporting symbolic links explicitly,
  // both for a linked directory and for a linked file.
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'claude-rules-linked-target.md', '# shared rule\n');
      write(root, 'shared-claude-rules/security.md', '# shared security rule\n');
    },
    () => {
      symlinkSync(
        join(root, 'claude-rules-linked-target.md'),
        join(root, '.claude/rules/security.md'),
      );
      symlinkSync(join(root, 'shared-claude-rules'), join(root, '.claude/rules/shared'));
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-rule.md'), join(root, '.claude/rules/broken-link.md'));
    },
    ['.claude/rules/security.md', '.claude/rules/shared', '.claude/rules/broken-link.md'],
  );
  if (symlinks) {
    expectedRulePaths.push(
      '.claude/rules/broken-link.md',
      '.claude/rules/security.md',
      '.claude/rules/shared/security.md',
    );
  }

  expectedRulePaths.sort();
  nearMissPaths.sort();

  return {
    root,
    capabilities: { symlinks },
    expectedRulePaths,
    pathScopedRulePath: '.claude/rules/api.md',
    declaredPaths,
    malformedRulePath: '.claude/rules/broken.md',
    secretRulePath: '.claude/rules/secrets.md',
    nearMissPaths,
    otherVendorPaths: ['.claude/CLAUDE.md', '.github/copilot-instructions.md'],
  };
}

/** One built Codex rule fixture repository (T402). */
export interface CodexRuleFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `codex.repo.rules` allowlist must admit,
   * sorted exactly as the scan publishes them. Capability-gated members are
   * present only when the corresponding capability is.
   */
  readonly expectedRulePaths: readonly string[];
  /**
   * The Source-relative Path of the rule file whose `prefix_rule()` holds a
   * literal credential and an environment reference, so a test can prove
   * neither reaches the inventory: a rule's content is the detail's, one file
   * at a time (FR-026, FR-027).
   */
  readonly secretRulePath: string;
  /**
   * The Source-relative Path of the rule file whose Starlark is malformed. It
   * is admitted and published like any other: this phase attempts no
   * extraction for the `rule` kind, so a file the vendor could not load is
   * still a rule file the inventory lists.
   */
  readonly malformedRulePath: string;
  /**
   * Paths no shipped rule of any product may admit: the descendant `.codex`
   * layer, the nested subdirectory the page establishes no recursion for, and
   * the spelling variants one step from the selector's literals.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * Files another product owns and this one recognizes, listed apart from
   * {@link nearMissPaths} because a shipped rule does admit them — just not a
   * Codex one. They are what makes "no unrelated Claude or Copilot file
   * becomes a Codex rule" a positive case in the tree rather than an
   * assumption about the selector.
   */
  readonly otherVendorPaths: readonly string[];
}

/**
 * Builds the canonical Codex rule fixture repository (T402).
 *
 * The admitted set is the direct `.rules` children of the Repository root's
 * own `.codex/rules/`, and every other case in the tree sits one segment away
 * from it: the nested subdirectory the page documents no recursion for, the
 * descendant `.codex/rules/` belonging to a runtime working directory this
 * product never selects, the singular and dotless directory spellings, a
 * wrong-case extension, and a root `rules/` with no `.codex` above it.
 *
 * The admitted files carry what a rule file carries: a literal credential and
 * an environment reference that must reach no inventory and must never be
 * resolved, an inert command reference and an inert path reference that grant
 * no read or execution authority, and one file whose Starlark is malformed.
 * A rule declaring `forbidden` sits beside one declaring `allow`, so a tree
 * that proves nothing is enforced also contains a decision worth enforcing.
 *
 * Trust is deliberately not modelled by a file: whether the project `.codex/`
 * layer is trusted is a runtime input this product never observes, so the
 * fixture's job is to make the inventory state it nowhere (FR-009).
 */
export function buildCodexRuleFixture(
  prefix = 'inspector-codex-rule-files',
  root = createRepositoryFixtureRoot(prefix),
): CodexRuleFixture {
  // A plain rule at the root layer, with an inert command reference: a
  // pattern names a command and never runs one.
  write(
    root,
    '.codex/rules/default.rules',
    [
      'prefix_rule(',
      '    pattern = ["gh", "pr", "view"],',
      '    decision = "prompt",',
      '    justification = "Viewing PRs is allowed with approval",',
      ')',
      '',
    ].join('\n'),
  );
  // A restrictive rule beside it: a `forbidden` decision is inert here too.
  write(
    root,
    '.codex/rules/deploy.rules',
    [
      '# Blocks the deploy script outside the sandbox.',
      'prefix_rule(',
      '    pattern = ["./scripts/deploy.sh"],',
      '    decision = "forbidden",',
      '    justification = "Use the release workflow instead.",',
      ')',
      '',
    ].join('\n'),
  );
  // The credential and environment-reference case: both are authored text a
  // rule file happens to contain, and neither may reach an inventory row or
  // be resolved against the process environment (FR-026, FR-027).
  write(
    root,
    '.codex/rules/secrets.rules',
    [
      'prefix_rule(',
      `    pattern = ["curl", "-H", "Authorization: Bearer ${FIXTURE_SECRET_LITERAL}"],`,
      '    decision = "forbidden",',
      `    justification = "Endpoint ${FIXTURE_ENVIRONMENT_REFERENCE} is not reachable from a sandbox.",`,
      ')',
      '',
    ].join('\n'),
  );
  // Malformed Starlark: the vendor could not load this file, and this release
  // extracts nothing from a rule file, so it is admitted and listed like any
  // other rule.
  write(root, '.codex/rules/malformed.rules', 'prefix_rule(\n    pattern = ["gh"\n');

  // Near miss: the page documents no recursion under a layer's `rules/`, so a
  // subdirectory below it is not admitted.
  write(root, '.codex/rules/team/review.rules', 'nested subdirectory\n');
  // Near miss: a descendant `.codex` layer belongs to a runtime working
  // directory this product never selects, exactly as the nested
  // `config.toml` and `AGENTS.md` do.
  write(root, 'packages/api/.codex/rules/default.rules', 'descendant layer\n');
  // Near miss: the extension is the selector's own step.
  write(root, '.codex/rules/notes.rules.bak', 'backup suffix\n');
  write(root, '.codex/rules/README.md', 'sibling of another kind\n');
  // Near miss: the terminal step is case-sensitive, in its own directory so a
  // case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.codex/uppercase/deploy.RULES', 'wrong case\n');
  // Near miss: the container literals are exact.
  write(root, '.codex/rule/default.rules', 'singular rules dir\n');
  write(root, 'codex/rules/default.rules', 'no leading dot\n');
  write(root, 'rules/default.rules', 'no .codex above it\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.codex/rules/hidden.rules', 'vcs internal\n');
  // The User layer this rule may never read, spelled inside the repository so
  // a test can prove the path is a near miss rather than a Source.
  write(root, 'home/.codex/rules/user.rules', 'user layer\n');
  // An unrelated file sharing no segment with the selector.
  write(root, 'README.md', 'unrelated\n');
  // Other products' own customizations, admitted by their own rules and by no
  // Codex one: the Codex program starts at `.codex`, so neither can arrive in
  // the rule inventory.
  write(root, '.claude/CLAUDE.md', '# claude instructions\n');
  write(root, '.github/copilot-instructions.md', '# copilot instructions\n');

  const expectedRulePaths = [
    '.codex/rules/default.rules',
    '.codex/rules/deploy.rules',
    '.codex/rules/malformed.rules',
    '.codex/rules/secrets.rules',
  ];
  const nearMissPaths = [
    '.codex/rule/default.rules',
    '.codex/rules/README.md',
    '.codex/rules/notes.rules.bak',
    '.codex/rules/team/review.rules',
    '.codex/uppercase/deploy.RULES',
    '.git/.codex/rules/hidden.rules',
    'README.md',
    'codex-linked-target.rules',
    'codex/rules/default.rules',
    'home/.codex/rules/user.rules',
    'packages/api/.codex/rules/default.rules',
    'rules/default.rules',
  ];

  // Linked cases are capability-gated; see {@link buildCodexSkillFixture}.
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'codex-linked-target.rules', 'prefix_rule(pattern = ["ls"])\n');
    },
    () => {
      // A symlinked rule file is read transparently through its target,
      // because Codex loading the same path would resolve it too (FR-024).
      symlinkSync(join(root, 'codex-linked-target.rules'), join(root, '.codex/rules/linked.rules'));
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-target.rules'), join(root, '.codex/rules/broken.rules'));
    },
    ['.codex/rules/linked.rules', '.codex/rules/broken.rules'],
  );
  if (symlinks) {
    expectedRulePaths.push('.codex/rules/broken.rules', '.codex/rules/linked.rules');
  }

  expectedRulePaths.sort();

  return {
    root,
    capabilities: { symlinks },
    expectedRulePaths,
    secretRulePath: '.codex/rules/secrets.rules',
    malformedRulePath: '.codex/rules/malformed.rules',
    nearMissPaths,
    otherVendorPaths: ['.claude/CLAUDE.md', '.github/copilot-instructions.md'],
  };
}

/** One built Claude instruction fixture repository (T226). */
export interface ClaudeInstructionFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the `claude.repo.instructions` allowlist must
   * admit, sorted exactly as the scan publishes them. The any-depth program
   * reaches the root, `.claude/`, and every descendant alike: which layer a
   * concrete session would load depends on its working directory and on the
   * files it reads, neither of which this product observes (FR-009).
   */
  readonly expectedClaudeInstructionPaths: readonly string[];
  /**
   * The Source-relative Paths `codex.repo.instructions` admits in the same
   * tree, sorted. The Codex-preservation half of the phase: the same scan
   * that adds Claude rows must keep admitting exactly these, and no Claude
   * rule may recognize one of them.
   */
  readonly expectedCodexInstructionPaths: readonly string[];
  /**
   * The Source-relative Paths the Copilot instruction rules admit in the same
   * tree, sorted. The root `AGENTS.md` and the root `CLAUDE.md` are shared
   * files — one physical file, two products — while the nested and `.claude`
   * spellings stay Claude's alone, because Copilot documents its `CLAUDE.md`
   * alternative at the repository root only (T256).
   */
  readonly expectedCopilotInstructionPaths: readonly string[];
  /**
   * Paths that sit one step away from an admitted file and that no shipped
   * rule may admit — spelling variants, VCS internals, and the target of the
   * authored import. Listing them explicitly is what makes an over-broad
   * selector a test failure rather than a silent inventory expansion.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The admitted instruction file whose frontmatter block cannot be parsed:
   * its recognition fails all-or-nothing and publishes the
   * `recognition-parse-failed` Diagnostic while its complete source stays
   * readable, making the attempt's generation `partial` (FR-028).
   */
  readonly malformedInstructionPath: string;
  /**
   * The file the root `CLAUDE.md` names with an authored `@path` token. It
   * exists on disk precisely so a scan can prove no target is opened: this
   * phase emits no relationship at all, and a relationship target confers no
   * read authority wherever one is emitted (T238 owns the imports).
   */
  readonly importTargetPath: string;
  /** The admitted instruction file carrying the literal credential. */
  readonly secretInstructionPath: string;
}

/**
 * Builds the canonical Claude instruction fixture repository (T226).
 *
 * Positive cases: the root `CLAUDE.md` — carrying frontmatter, a literal
 * credential, an authored `@path` import token, and a literal environment
 * reference — the root `CLAUDE.local.md`, the root `.claude/CLAUDE.md` the
 * any-depth program reaches through its directory step, a nested
 * `packages/api/CLAUDE.md`, a nested `packages/api/.claude/CLAUDE.md`, and a
 * `docs/CLAUDE.md` whose frontmatter cannot be parsed.
 *
 * Codex preservation: the root `AGENTS.md`. Claude Code reads `CLAUDE.md`,
 * not `AGENTS.md` (memory page § AGENTS.md), so the file stays a Codex
 * instruction row alone however many Claude rules ship.
 *
 * Near misses: spelling variants one step from each literal, VCS internals,
 * an installed package's own `CLAUDE.md` at the root's `node_modules` and at a
 * nested one, and the import target. The case variants live in a directory holding no
 * admitted file, because a case-insensitive filesystem would fold a variant
 * written beside an admitted file into that file itself.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildClaudeInstructionFixture(
  prefix = 'inspector-claude-instructions',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeInstructionFixture {
  // Positive: the root project instruction file, with every content shape the
  // inventory must keep inert — declarations that stay out of every session
  // summary, an authored `@path` token whose target is never opened in this
  // phase, a literal credential readable only through the detail route
  // (FR-027), and a literal environment reference that must never be resolved
  // against the process environment (FR-025).
  write(
    root,
    'CLAUDE.md',
    [
      '---',
      'scope: project',
      `endpoint: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      '# Project instructions',
      '',
      '@docs/setup.md',
      `token: ${FIXTURE_SECRET_LITERAL}`,
      '',
    ].join('\n'),
  );
  // Positive: the local variant beside it, and the `.claude` directory form
  // the page names as the other project instruction location. Both are
  // reached by the same any-depth programs.
  write(root, 'CLAUDE.local.md', '# Local instructions\n');
  write(root, '.claude/CLAUDE.md', '# Directory-form project instructions\n');
  // Positive: nested files. Claude discovers subdirectory instruction files
  // on demand as it reads files under them, so a descendant is a layer Claude
  // can genuinely load — the same nesting that stays a near miss for Codex.
  write(root, 'packages/api/CLAUDE.md', '# Nested instructions\n');
  write(root, 'packages/api/.claude/CLAUDE.md', '# Nested directory-form instructions\n');
  // Positive, and the attempt's one file-confined failure: a frontmatter block
  // no parser can read. The recognition fails all-or-nothing, its diagnostic
  // is confined to this file, and the complete source stays readable (FR-028).
  write(root, 'docs/CLAUDE.md', '---\nscope: [docs\n---\n\n# Docs instructions\n');

  // Codex preservation: `AGENTS.md` is a Codex instruction candidate and never
  // a Claude one — the memory page states that Claude Code reads `CLAUDE.md`,
  // not `AGENTS.md`.
  write(root, 'AGENTS.md', '# Codex instructions\n');

  // Near miss: the target of the authored import. This phase emits no
  // relationship at all, and no scan may open it.
  write(root, 'docs/setup.md', '# setup\n');
  // Near miss: spelling variants one step from each literal. The case
  // variants live under `tools/`, which holds no admitted file, because a
  // case-insensitive filesystem would fold one written beside an admitted
  // file into that file itself.
  write(root, 'CLAUDE.md.bak', 'backup suffix\n');
  write(root, 'CLAUDE-local.md', 'hyphenated\n');
  write(root, 'CLAUDE.local.md.bak', 'backup suffix\n');
  write(root, 'tools/CLAUDE.MD', 'wrong case\n');
  write(root, 'tools/claude.md', 'wrong case\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/CLAUDE.md', 'vcs internal\n');
  // Near miss: an installed package's own instruction file, at the root's own
  // `node_modules` and at a nested one. A package manager put them there and
  // the packages that ship them own them, so they are not this repository's
  // customizations however deep the walk would otherwise reach
  // (contracts/inspection-path-allowlist.md).
  write(root, 'node_modules/some-package/CLAUDE.md', '# package instructions\n');
  write(root, 'packages/api/node_modules/other-package/CLAUDE.md', '# package instructions\n');
  // Unrelated file that shares no segment with the selectors.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    expectedClaudeInstructionPaths: [
      '.claude/CLAUDE.md',
      'CLAUDE.local.md',
      'CLAUDE.md',
      'docs/CLAUDE.md',
      'packages/api/.claude/CLAUDE.md',
      'packages/api/CLAUDE.md',
    ],
    expectedCodexInstructionPaths: ['AGENTS.md'],
    expectedCopilotInstructionPaths: ['AGENTS.md', 'CLAUDE.md'],
    nearMissPaths: [
      '.git/CLAUDE.md',
      'CLAUDE-local.md',
      'CLAUDE.local.md.bak',
      'CLAUDE.md.bak',
      'README.md',
      'docs/setup.md',
      'node_modules/some-package/CLAUDE.md',
      'packages/api/node_modules/other-package/CLAUDE.md',
      'tools/CLAUDE.MD',
      'tools/claude.md',
    ],
    malformedInstructionPath: 'docs/CLAUDE.md',
    importTargetPath: 'docs/setup.md',
    secretInstructionPath: 'CLAUDE.md',
  };
}

/** One built Claude MCP fixture repository (T304, extended by T324 for the skill-frontmatter negative). */
export interface ClaudeMcpFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The one admitted Claude MCP carrier: the exact root `.mcp.json`. */
  readonly carrierPath: string;
  /**
   * Whether the carrier was materialized as a symbolic link to
   * {@link linkTargetPath}. Capability-gated like every fixture link: when the
   * platform cannot create links, the same content is written as a regular
   * file and the inspection outcome is identical, because a link is read
   * transparently through its target (FR-024).
   */
  readonly carrierLinked: boolean;
  /**
   * The link target the carrier resolves to when {@link carrierLinked}. It is
   * itself a near miss: no rule admits `configs/mcp.json`, so the content is
   * published once, under the carrier's own path.
   */
  readonly linkTargetPath: string;
  /**
   * The server names the carrier declares, in authored order. The non-object
   * `broken` entry is omitted whole, and the malformed-command `odd` entry is
   * still a named declaration this release lists (no field schema).
   */
  readonly expectedCarrierServerNames: readonly string[];
  /**
   * An admitted skill whose frontmatter spells `mcpServers` (Phase 27's
   * negative): Claude documents no such skill field — the documented inline
   * owners are agents, plugin manifests, and settings — so this file must
   * gain no MCP recognition however many declarations its frontmatter
   * carries.
   */
  readonly mcpFrontmatterSkillPath: string;
  /** An admitted skill declaring no MCP servers: it must gain no MCP recognition. */
  readonly plainSkillPath: string;
  /**
   * Files of future owner families that carry MCP declarations but that no
   * shipped rule admits — a plugin manifest, an agent file. They must produce
   * no candidate, no recognition, and no row: an owner adapter is dispatched
   * only on an independently admitted owner. The settings file this fixture
   * also writes is not among them any more: `claude.repo.permissions` admits
   * it for the policy it may declare, which is a candidacy of its own kind and
   * still no MCP one.
   */
  readonly unadmittedOwnerPaths: readonly string[];
  /**
   * The file the carrier's relative `command` value names. It exists on disk
   * precisely so a scan can prove no declared command target is opened.
   */
  readonly commandTargetPath: string;
  /**
   * Paths one step from the carrier's exact literal that no shipped rule may
   * admit: the descendant `.mcp.json` no product reads from the selected
   * root's frame, spelling and location variants, the User-state filename,
   * and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Claude MCP fixture repository (T304).
 *
 * Positive cases: the exact root `.mcp.json` carrier — materialized as a
 * symbolic link where the platform allows, to prove a linked carrier is read
 * transparently through its target (FR-024) — declaring a stdio server with a
 * relative command, a literal credential, and a literal
 * environment reference; an HTTP server with a literal bearer header; a
 * malformed-command declaration that is still listed; and a non-object entry
 * omitted whole. Plus one admitted skill whose frontmatter spells
 * `mcpServers` — Claude documents no such skill field, so it must gain no
 * MCP recognition and its re-declared server name must join no row.
 *
 * Near misses: a descendant `packages/api/.mcp.json` (Claude reads exactly one
 * project file), spelling and location variants, the User MCP state filename
 * `.claude.json` at the Repository root, VCS internals, and unadmitted future
 * owner files (plugin manifest, settings, agent) that carry `mcpServers`
 * declarations no shipped rule may read.
 */
export function buildClaudeMcpFixture(
  prefix = 'inspector-claude-mcp',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeMcpFixture {
  const carrierText = `${JSON.stringify(
    {
      mcpServers: {
        context7: {
          // A relative command: published as the literal the file wrote,
          // never resolved against any base (FR-009).
          command: './scripts/context7.sh',
          args: ['--transport', 'stdio'],
          env: {
            API_KEY: FIXTURE_SECRET_LITERAL,
            ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE,
          },
        },
        'docs-http': {
          type: 'http',
          url: 'https://docs.example.com/mcp',
          headers: { Authorization: `Bearer ${FIXTURE_SECRET_LITERAL}` },
        },
        // Malformed command: still a named declaration this release lists; no
        // field schema is applied.
        odd: { command: 42 },
        // Malformed: an entry that is not an object declares no server and is
        // omitted whole.
        broken: 'not an object',
      },
    },
    null,
    2,
  )}\n`;
  // The carrier as a symbolic link where the platform allows (FR-024): the
  // link target itself is a near miss no rule admits, so the declarations are
  // published once, under the carrier's path.
  const carrierLinked = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'configs/mcp.json', carrierText);
    },
    () => {
      symlinkSync(join(root, 'configs/mcp.json'), join(root, '.mcp.json'));
    },
    ['.mcp.json'],
  );
  if (!carrierLinked) {
    write(root, '.mcp.json', carrierText);
  }
  // The declared command target: exists so a scan can prove it is never
  // opened (zero connection, FR-025).
  write(root, 'scripts/context7.sh', '#!/bin/sh\nexit 0\n');

  // Phase 27's negative: an admitted skill whose frontmatter spells
  // `mcpServers`. Claude documents no such skill field, so no MCP
  // recognition may attach — the re-declared `context7` provably joins no
  // row, and the credential below reaches only the skill's own detail
  //.
  write(
    root,
    '.claude/skills/deploy/SKILL.md',
    [
      '---',
      'name: deploy',
      'description: Deploy helper with contained MCP declarations',
      'mcpServers:',
      '  context7:',
      '    command: npx',
      '    args: ["-y", "@upstash/context7-mcp"]',
      '  deploy-db:',
      '    url: https://db.example.com/mcp',
      '    headers:',
      `      Authorization: Bearer ${FIXTURE_SECRET_LITERAL}`,
      '  malformed: just a string',
      '---',
      '',
      '# Deploy skill',
      '',
    ].join('\n'),
  );
  // An admitted skill with no MCP-looking frontmatter at all, beside the
  // negative above.
  write(root, '.claude/skills/plain/SKILL.md', '---\nname: plain\n---\n\n# Plain skill\n');

  // Future owner families carrying declarations no shipped rule admits: an
  // owner adapter grants no read authority, so none of these produces a
  // candidate, a recognition, or a row.
  write(
    root,
    '.claude-plugin/plugin.json',
    '{ "name": "fixture-plugin", "mcpServers": { "plugin-server": { "command": "noop" } } }\n',
  );
  write(
    root,
    '.claude/settings.json',
    '{ "mcpServers": { "settings-server": { "command": "noop" } } }\n',
  );
  write(
    root,
    '.claude/agents/reviewer.md',
    '---\nname: reviewer\nmcpServers:\n  agent-server:\n    command: noop\n---\n\n# Reviewer\n',
  );

  // Near miss for every product: a subdirectory carrier is a runtime-chain
  // member no product's rule admits from the selected root's frame; it
  // re-declares a root server name, so an unadmitted duplicate provably
  // contributes nothing.
  write(root, 'packages/api/.mcp.json', '{ "mcpServers": { "context7": { "command": "x" } } }\n');
  // Near miss: spelling and location variants one step from the literal.
  write(root, '.mcp.json.bak', 'backup suffix\n');
  write(root, '.claude/mcp.json', '{ "mcpServers": {} }\n');
  write(root, 'mcp.json', 'missing dot\n');
  // Near miss: the User MCP state filename is a `<home>` fact, not a
  // Repository one; at the Repository root it is admitted by nothing.
  write(root, '.claude.json', '{ "mcpServers": { "user-server": { "command": "x" } } }\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.mcp.json', 'vcs internal\n');

  return {
    root,
    carrierPath: '.mcp.json',
    carrierLinked,
    linkTargetPath: 'configs/mcp.json',
    expectedCarrierServerNames: ['context7', 'docs-http', 'odd'],
    mcpFrontmatterSkillPath: '.claude/skills/deploy/SKILL.md',
    plainSkillPath: '.claude/skills/plain/SKILL.md',
    unadmittedOwnerPaths: ['.claude-plugin/plugin.json', '.claude/agents/reviewer.md'],
    commandTargetPath: 'scripts/context7.sh',
    nearMissPaths: [
      '.claude.json',
      '.claude/mcp.json',
      '.git/.mcp.json',
      '.mcp.json.bak',
      'configs/mcp.json',
      'mcp.json',
      'packages/api/.mcp.json',
    ],
  };
}

/** One built Copilot CLI MCP fixture repository (T334). */
export interface CopilotCliMcpFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The root carrier `.mcp.json`. One physical file two products admit:
   * Claude's exact project rule and the Copilot CLI's exact root rule, so
   * its declarations appear under both recognitions.
   */
  readonly rootCarrierPath: string;
  /**
   * The `.github/mcp.json` spelling of the CLI carrier — materialized as a
   * symbolic link where the platform allows, to prove a linked carrier is
   * read transparently through its target (FR-024); the same content is a
   * regular file otherwise, with an identical inspection outcome. Only the
   * CLI admits this spelling.
   */
  readonly githubCarrierPath: string;
  /** Whether {@link githubCarrierPath} was materialized as a symbolic link. */
  readonly githubCarrierLinked: boolean;
  /** The link target for {@link githubCarrierPath}; itself a near miss. */
  readonly linkTargetPath: string;
  /** The names the root carrier declares, in authored order. */
  readonly expectedRootServerNames: readonly string[];
  /** The names the `.github` carrier declares, in authored order. */
  readonly expectedGithubServerNames: readonly string[];
  /**
   * The name declared by both root-level carriers, so the inventory provably
   * groups the two spellings' declarations of one name into one row — the
   * same-name case whose runtime selection stays the strategy's record,
   * never a projection (FR-009).
   */
  readonly duplicateServerName: string;
  /**
   * Paths no shipped rule may admit: subdirectory carriers of both spellings
   * — runtime-chain members no product's rule reads from the selected root's
   * frame — the general VS Code settings file, the `COPILOT_HOME` User
   * filename, spelling variants, and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Copilot CLI MCP fixture repository (T334).
 *
 * Positive cases: the root `.mcp.json` (also Claude's project carrier — the
 * shared physical file), the `.github/mcp.json` spelling — linked where the
 * platform allows (FR-024) — a duplicate server name across the two
 * spellings, a literal credential and environment reference in declared
 * values, a malformed-command declaration that is still listed, and a
 * non-object entry omitted whole.
 *
 * Near misses: subdirectory carriers of both spellings (runtime-chain
 * members outside the selected root's frame), `.vscode/mcp.json` (the VS
 * Code carrier arrives with its own phase), the `COPILOT_HOME` filename
 * `mcp-config.json` at the Repository root, a `mcp.json` outside `.github`,
 * spelling variants, and VCS internals.
 */
export function buildCopilotCliMcpFixture(
  prefix = 'inspector-copilot-cli-mcp',
  root = createRepositoryFixtureRoot(prefix),
): CopilotCliMcpFixture {
  write(
    root,
    '.mcp.json',
    `${JSON.stringify(
      {
        mcpServers: {
          'shared-tavily': {
            command: 'npx',
            args: ['-y', 'tavily-mcp'],
            env: { API_KEY: FIXTURE_SECRET_LITERAL, ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE },
          },
          // Malformed command: still a named declaration this release lists.
          odd: { command: 42 },
          // Malformed: a non-object entry declares no server and is omitted
          // whole.
          broken: 'not an object',
        },
      },
      null,
      2,
    )}\n`,
  );
  // The `.github` spelling re-declares the root file's name: both carriers
  // sit at the selected root, their same-name runtime selection is the
  // strategy's record, and the inventory groups both declarations under one
  // row without ordering them. Written in the CLI's bare top-level schema —
  // each key a server name, no `mcpServers` wrapper — the second documented
  // form the CLI reading accepts (T341). As a symbolic link where the
  // platform allows: a linked carrier is read transparently through its
  // target (FR-024), and the target itself is a near miss no rule admits.
  const githubCarrierText = `${JSON.stringify(
    {
      'gh-actions': { command: 'npx' },
      'shared-tavily': { command: 'other' },
    },
    null,
    2,
  )}\n`;
  const githubCarrierLinked = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'configs/github-mcp.json', githubCarrierText);
      mkdirSync(join(root, '.github'), { recursive: true });
    },
    () => {
      symlinkSync(join(root, 'configs/github-mcp.json'), join(root, '.github/mcp.json'));
    },
    ['.github/mcp.json'],
  );
  if (!githubCarrierLinked) {
    write(root, '.github/mcp.json', githubCarrierText);
  }

  // Near misses: subdirectory carriers of both spellings are runtime-chain
  // members no product's rule reads from the selected root's frame; they
  // re-declare root server names, so unadmitted duplicates provably
  // contribute nothing.
  write(
    root,
    'packages/api/.mcp.json',
    '{ "mcpServers": { "shared-tavily": { "command": "nested" } } }\n',
  );
  write(
    root,
    'packages/api/.github/mcp.json',
    '{ "mcpServers": { "gh-actions": { "command": "nested" } } }\n',
  );
  // Near miss: the general VS Code settings file beside the dedicated MCP
  // carrier's location; a documented VS Code settings input the read
  // allowlist deliberately does not admit.
  write(root, '.vscode/settings.json', '{ "mcp": { "servers": { "vscode-server": {} } } }\n');
  // Near miss: the `COPILOT_HOME` User filename is a home fact, not a
  // Repository one.
  write(root, 'mcp-config.json', '{ "mcpServers": { "user-server": { "command": "x" } } }\n');
  // Near miss: spelling variants and VCS internals.
  write(root, '.mcp.json.bak', 'backup suffix\n');
  write(root, 'docs/mcp.json', 'bare name outside .github\n');
  write(root, '.git/.mcp.json', 'vcs internal\n');

  return {
    root,
    rootCarrierPath: '.mcp.json',
    githubCarrierPath: '.github/mcp.json',
    githubCarrierLinked,
    linkTargetPath: 'configs/github-mcp.json',
    expectedRootServerNames: ['shared-tavily', 'odd'],
    expectedGithubServerNames: ['gh-actions', 'shared-tavily'],
    duplicateServerName: 'shared-tavily',
    nearMissPaths: [
      '.git/.mcp.json',
      '.mcp.json.bak',
      '.vscode/settings.json',
      'configs/github-mcp.json',
      'docs/mcp.json',
      'mcp-config.json',
      'packages/api/.github/mcp.json',
      'packages/api/.mcp.json',
    ],
  };
}

/** One built Copilot VS Code MCP fixture repository (T354). */
export interface CopilotVscodeMcpFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The dedicated VS Code carrier `.vscode/mcp.json`, written in the guide's
   * documented schema — a top-level `servers` map in the editor's JSONC
   * configuration format, comments and a trailing comma included — with the
   * `inputs` and `sandbox` sections beside it that declare no server.
   * Materialized as a symbolic link where the platform allows, to prove a
   * linked carrier is read transparently through its target (FR-024); the
   * same content is a regular file otherwise, with an identical outcome.
   */
  readonly vscodeCarrierPath: string;
  /** Whether {@link vscodeCarrierPath} was materialized as a symbolic link. */
  readonly vscodeCarrierLinked: boolean;
  /** The link target for {@link vscodeCarrierPath}; itself a near miss. */
  readonly linkTargetPath: string;
  /**
   * The root carrier `.mcp.json` in the CLI's wrapper schema. One physical
   * file three admissions share: Claude's project rule, the Copilot CLI's
   * root rule, and the VS Code 1.118+ path/surface provenance — whose
   * admission adds the VS Code surface without any VS Code-owned reading.
   */
  readonly rootCarrierPath: string;
  /** The names the `.vscode` carrier declares, in authored order. */
  readonly expectedVscodeServerNames: readonly string[];
  /** The names the root carrier declares, in authored order. */
  readonly expectedRootServerNames: readonly string[];
  /**
   * The name both carriers declare, so the inventory provably groups the
   * `.vscode` and root declarations of one name into one row — the same-name
   * case whose runtime selection stays the strategy's record (FR-009).
   */
  readonly duplicateServerName: string;
  /**
   * Paths no shipped rule may admit: the subdirectory `.vscode` carrier — a
   * workspace this product does not select — the general VS Code settings
   * file, the user-profile filename at the root, spelling variants, and the
   * link target.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the Copilot VS Code MCP fixture (T354): the dedicated JSONC
 * `.vscode/mcp.json` carrier beside the shared root `.mcp.json`, near
 * misses, a linked carrier where the platform allows, credential-shaped
 * literals, and an environment reference that must never be resolved.
 */
export function buildCopilotVscodeMcpFixture(
  prefix = 'inspector-copilot-vscode-mcp',
  root = createRepositoryFixtureRoot(prefix),
): CopilotVscodeMcpFixture {
  // The documented `servers` schema in the editor's JSONC configuration
  // format: comments and a trailing comma are the format's own syntax, the
  // non-mapping entry declares no server and is omitted whole, and the
  // `inputs` and `sandbox` sections declare nothing.
  const vscodeCarrierText = `{
  // Workspace MCP servers, shared through source control.
  "servers": {
    "vs-http": {
      "type": "http",
      "url": "https://api.example.com/mcp",
      "headers": { "Authorization": "Bearer ${FIXTURE_SECRET_LITERAL}" }
    },
    "vs-local": {
      "command": "./scripts/vs.sh",
      "env": { "TOKEN": "${FIXTURE_SECRET_LITERAL}", "ENDPOINT": "${FIXTURE_ENVIRONMENT_REFERENCE}" }
    },
    "shared-tavily": { "command": "vscode-owned" },
    "broken": "not an object",
  },
  "inputs": [{ "id": "api-key", "type": "promptString" }],
  "sandbox": { "network": { "allowedDomains": ["api.example.com"] } }
}
`;
  const vscodeCarrierLinked = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'configs/vscode-mcp.json', vscodeCarrierText);
      mkdirSync(join(root, '.vscode'), { recursive: true });
    },
    () => {
      symlinkSync(join(root, 'configs/vscode-mcp.json'), join(root, '.vscode/mcp.json'));
    },
    ['.vscode/mcp.json'],
  );
  if (!vscodeCarrierLinked) {
    write(root, '.vscode/mcp.json', vscodeCarrierText);
  }
  // The shared root carrier in the CLI's wrapper schema: the VS Code
  // provenance adds its surface here and nothing else — the declarations are
  // the CLI reading's.
  write(
    root,
    '.mcp.json',
    `${JSON.stringify(
      {
        mcpServers: {
          'shared-tavily': { command: 'npx', args: ['-y', 'tavily-mcp'] },
          'root-only': { url: 'https://root.example.com/mcp' },
        },
      },
      null,
      2,
    )}\n`,
  );
  // Near misses: a subdirectory workspace, the general settings file, the
  // user-profile filename, and a spelling variant.
  write(root, 'packages/api/.vscode/mcp.json', '{ "servers": { "nested": {} } }\n');
  write(root, '.vscode/settings.json', '{ "chat.mcp.enabled": true }\n');
  write(root, 'mcp.json', '{ "servers": { "user-profile": {} } }\n');
  write(root, '.vscode/mcp.jsonc', '{ "servers": { "variant": {} } }\n');

  return {
    root,
    vscodeCarrierPath: '.vscode/mcp.json',
    vscodeCarrierLinked,
    linkTargetPath: 'configs/vscode-mcp.json',
    rootCarrierPath: '.mcp.json',
    expectedVscodeServerNames: ['vs-http', 'vs-local', 'shared-tavily'],
    expectedRootServerNames: ['shared-tavily', 'root-only'],
    duplicateServerName: 'shared-tavily',
    nearMissPaths: [
      '.vscode/mcp.jsonc',
      '.vscode/settings.json',
      'configs/vscode-mcp.json',
      'mcp.json',
      'packages/api/.vscode/mcp.json',
    ],
  };
}

/** One built priority cross-vendor MCP fixture repository (T388). */
export interface PriorityMcpFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The shared root carrier `.mcp.json` in the CLI wrapper schema: one
   * physical file three admissions share — Claude's project rule, the
   * Copilot CLI's root rule, and the VS Code 1.118+ path/surface
   * provenance — read once for all of them.
   */
  readonly rootCarrierPath: string;
  /** The `.github/mcp.json` CLI carrier, in the bare top-level schema. */
  readonly githubCarrierPath: string;
  /** The `.vscode/mcp.json` VS Code carrier, in the JSONC `servers` schema. */
  readonly vscodeCarrierPath: string;
  /** The `.codex/config.toml` carrier with its `[mcp_servers.*]` tables. */
  readonly codexCarrierPath: string;
  /**
   * The name all four carriers declare — the cross-vendor row this fixture
   * exists to produce: one row grouping five declarations across every
   * carrier and every recognizing tool, with no order projected (FR-009).
   */
  readonly sharedServerName: string;
  /**
   * The name exactly two carriers declare — the root `.mcp.json` and the
   * Codex configuration file. The smallest row a comparison can be opened
   * from: with two comparable carriers both already stand on the compare
   * route's two sides, so it renders no pickers, and the declarations
   * differ field by field so the diff shows a real difference. The two
   * sides also walk the canonical serialization's spellings
   * (declared-entries-json.ts): scrambled authored key orders that both
   * serialize into the one canonical order, numbers and booleans rendered
   * bare, a `007` string that keeps its quoting, and multiline notes whose
   * newlines spell their `\n` escapes.
   */
  readonly pairedServerName: string;
  /**
   * Paths no shipped rule may admit: nested carriers of every spelling —
   * runtime chains this product does not select — the agent, plugin, and
   * settings files whose MCP-looking configuration is their own kind's
   * content, the User filenames, spelling
   * variants, and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the priority cross-vendor MCP fixture (T388): every explicit
 * carrier of the priority wave in one tree, one name declared by all four,
 * one declared by exactly two — the picker-free exact-pair comparison
 * case — per-carrier names beside them, credential-shaped literals, an
 * environment reference that must never be resolved, one malformed-command
 * declaration that still lists, and the complete negative set — nested
 * carriers, the agent/plugin/settings files whose spellings join no MCP
 * surface, User filenames, variants, and VCS internals.
 */
export function buildPriorityMcpFixture(
  prefix = 'inspector-priority-mcp',
  root = createRepositoryFixtureRoot(prefix),
): PriorityMcpFixture {
  const sharedServerName = 'shared-everywhere';
  const pairedServerName = 'shared-pair';
  // The shared root carrier, wrapper form: Claude and the Copilot CLI read
  // the same names out of it, and the VS Code 1.118+ admission adds its
  // surface without a reading of its own.
  write(
    root,
    '.mcp.json',
    `${JSON.stringify(
      {
        mcpServers: {
          [sharedServerName]: {
            command: 'npx',
            env: { API_KEY: FIXTURE_SECRET_LITERAL, ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE },
          },
          // The exact-pair name's root side, authored in a deliberately
          // scrambled key order the comparison must not show: the canonical
          // serialization reorders both sides identically. The values walk
          // the serializer's spellings - a JSON number and boolean render
          // bare, the `007` string keeps its quoting because its bare
          // spelling would read as `7`, and the multiline string spells its
          // newline as the `\n` escape.
          [pairedServerName]: {
            env: { API_KEY: FIXTURE_SECRET_LITERAL },
            version: '007',
            args: ['-y', 'shared-pair-mcp'],
            enabled: true,
            command: 'npx',
            notes: 'Root-owned launcher.\nSecond line of the note.',
            startup_timeout_ms: 9000,
          },
          'root-only': { url: 'https://root.example.com/mcp' },
          // Malformed command: still a named declaration this release lists.
          odd: { command: 42 },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The bare-schema CLI spelling re-declares the shared name.
  write(
    root,
    '.github/mcp.json',
    `{ "gh-actions": { "command": "npx" }, "${sharedServerName}": { "command": "gh" } }\n`,
  );
  // The VS Code JSONC carrier re-declares it too, comments and all.
  write(
    root,
    '.vscode/mcp.json',
    `{
  // Workspace MCP servers.
  "servers": {
    "vs-docs": { "type": "http", "url": "https://docs.example.com/mcp" },
    "${sharedServerName}": { "command": "vscode-owned" },
  }
}
`,
  );
  // The Codex configuration carrier declares it as a quoted table name.
  write(
    root,
    '.codex/config.toml',
    [
      '[mcp_servers.codex-db]',
      'command = "npx"',
      '',
      `[mcp_servers."${sharedServerName}"]`,
      'command = "codex-owned"',
      '',
      // The exact-pair name's Codex side, in another authored key order
      // and with TOML's own typed values: the integer and boolean render
      // bare like the root side's JSON ones, the multiline note - a TOML
      // `\n` escape - spells its newline back as the JSON `\n` escape,
      // and the environment table adds a variable the root side does not
      // declare.
      `[mcp_servers.${pairedServerName}]`,
      'startup_timeout_ms = 7000',
      String.raw`notes = "Codex-owned launcher.\nSecond line of the note."`,
      'command = "codex-owned"',
      'enabled = true',
      'version = "007"',
      '',
      `[mcp_servers.${pairedServerName}.env]`,
      `ENDPOINT = "${FIXTURE_ENVIRONMENT_REFERENCE}"`,
      `API_KEY = "${FIXTURE_SECRET_LITERAL}"`,
      '',
    ].join('\n'),
  );

  // Negatives: nested carriers of every spelling, each re-declaring the
  // shared name so an unadmitted duplicate provably contributes nothing.
  write(root, 'packages/api/.mcp.json', `{ "mcpServers": { "${sharedServerName}": {} } }\n`);
  write(root, 'packages/api/.github/mcp.json', `{ "${sharedServerName}": {} }\n`);
  write(root, 'packages/api/.vscode/mcp.json', `{ "servers": { "${sharedServerName}": {} } }\n`);
  write(root, 'packages/api/.codex/config.toml', '[mcp_servers.nested]\ncommand = "x"\n');
  // MCP-looking configuration in files of other kinds: their own kinds'
  // content once those kinds ship, never MCP rows.
  write(
    root,
    '.github/agents/deploy.md',
    '---\nname: deploy\ndescription: d\nmcp-servers:\n  agent-mcp:\n    command: x\n---\n\nBody\n',
  );
  write(
    root,
    '.claude-plugin/plugin.json',
    '{ "name": "p", "mcpServers": { "plugin-mcp": { "command": "x" } } }\n',
  );
  write(root, '.claude/settings.json', '{ "mcpServers": { "settings-mcp": {} } }\n');
  // User filenames, spelling variants, and VCS internals.
  write(root, 'mcp-config.json', '{ "mcpServers": { "user-server": {} } }\n');
  write(root, 'mcp.json', '{ "servers": { "profile-server": {} } }\n');
  write(root, '.mcp.json.bak', 'backup suffix\n');
  write(root, '.git/.mcp.json', 'vcs internal\n');

  return {
    root,
    rootCarrierPath: '.mcp.json',
    githubCarrierPath: '.github/mcp.json',
    vscodeCarrierPath: '.vscode/mcp.json',
    codexCarrierPath: '.codex/config.toml',
    sharedServerName,
    pairedServerName,
    nearMissPaths: [
      '.claude-plugin/plugin.json',
      // `.claude/settings.json` is not here: `claude.repo.permissions` admits
      // it for the policy it may declare, so it is a candidate of its own kind
      // — and still no MCP one, which the MCP rows this fixture asserts show.
      '.git/.mcp.json',
      '.github/agents/deploy.md',
      '.mcp.json.bak',
      'mcp-config.json',
      'mcp.json',
      'packages/api/.codex/config.toml',
      'packages/api/.github/mcp.json',
      'packages/api/.mcp.json',
      'packages/api/.vscode/mcp.json',
    ],
  };
}

/** One built Copilot instruction fixture repository (T245). */
export interface CopilotInstructionFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the Copilot instruction rules must admit,
   * keyed by the rule that admits it and sorted within each rule. Keyed
   * rather than flattened, because the phase's whole subject is which rule
   * admits which file: the root `.github/copilot-instructions.md` appears
   * under both repository rules and a nested one under the CLI-context rule
   * alone, which is what makes a recognition able to name its surfaces.
   */
  readonly expectedCopilotInstructionPaths: Readonly<Record<string, readonly string[]>>;
  /**
   * The Source-relative Paths the Claude and Codex instruction rules admit in
   * the same tree, sorted. The preservation half of the phase: the same scan
   * that adds Copilot rows must keep admitting exactly these.
   */
  readonly expectedClaudeInstructionPaths: readonly string[];
  /** As {@link expectedClaudeInstructionPaths}, for Codex. */
  readonly expectedCodexInstructionPaths: readonly string[];
  /**
   * Paths that sit one step away from an admitted file and that no shipped
   * rule may admit: spelling variants, the locations
   * `copilot.excluded.additional-standard-locations` keeps out of this
   * release, the runtime-supplied root shapes
   * `copilot.excluded.extra-directories` names, VCS internals, and installed
   * packages. Listing them explicitly is what makes an over-broad selector a
   * test failure rather than a silent inventory expansion.
   *
   * A path here is not necessarily unrecognized: `.claude/CLAUDE.md` and
   * `packages/api/CLAUDE.md` are Claude instruction files. What this states is
   * that no *Copilot* rule admits them.
   */
  readonly copilotNearMissPaths: readonly string[];
  /**
   * The Claude rule files this tree holds. They are Copilot near misses and
   * Claude candidates at once: `claude.repo.rules` admits them, so a scan
   * reads them, while no Copilot rule reaches `.claude/rules/` at all.
   */
  readonly expectedClaudeRulePaths: readonly string[];
  /**
   * The admitted path-instruction file declaring `applyTo`. Its declaration
   * is what it really governs, and nothing in this phase reads it: the row's
   * range comes from the path until the recognizer that extracts the
   * declaration ships (spec.md § Clarifications).
   */
  readonly applyToInstructionPath: string;
  /**
   * The admitted instruction file whose frontmatter block cannot be parsed:
   * its recognition fails all-or-nothing and publishes the
   * `recognition-parse-failed` Diagnostic while its complete source stays
   * readable, making the attempt's generation `partial` (FR-028).
   */
  readonly malformedInstructionPath: string;
  /** The admitted instruction file carrying the literal credential. */
  readonly secretInstructionPath: string;
}

/**
 * Builds the canonical Copilot instruction fixture repository (T245).
 *
 * Positive cases cover all seven shipped rules and, deliberately, both sides
 * of the root/CLI split: the root `.github/copilot-instructions.md` is
 * admitted twice — by the root-exact rule and by the CLI-context rule whose
 * leading recursive step matches zero directories — while
 * `packages/api/.github/copilot-instructions.md` is admitted by the
 * CLI-context rule alone. The same pairing exists for the path-instruction
 * subtree, where the range is the file's own `applyTo` or nothing: one file
 * declares one, and the nested one declares none, so it proves the no-range
 * row rather than a range read off its location (T265).
 *
 * Shared files: the root `AGENTS.md` is Codex's and Copilot's, and the root
 * `CLAUDE.md` is Claude's and Copilot's. The root `GEMINI.md` is Copilot's
 * alone — no other shipped product recognizes that filename.
 *
 * Exclusions, written as ordinary files so their absence from the Copilot
 * inventory is observable rather than assumed: the `.claude` instruction
 * spellings and the non-root `CLAUDE.md`/`GEMINI.md` that
 * `copilot.excluded.additional-standard-locations` keeps out, and the
 * `.copilot/instructions` and configured-location shapes
 * `copilot.excluded.extra-directories` names.
 *
 * Hosted inputs get no file at all, which is the point:
 * `copilot.behavior.cloud.organization-instructions` names no local path, so
 * no fixture can stand for it and no candidate may appear for it.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCopilotInstructionFixture(
  prefix = 'inspector-copilot-instructions',
  root = createRepositoryFixtureRoot(prefix),
): CopilotInstructionFixture {
  // Positive: the repository-wide file at the selected root, carrying the
  // content shapes the inventory must keep inert — a literal credential
  // readable only through the detail route (FR-027) and a literal environment
  // reference that must never be resolved against the process environment
  // (FR-025). Two rules admit it, and its recognition names all three surfaces.
  write(
    root,
    '.github/copilot-instructions.md',
    [
      '# Repository-wide instructions',
      '',
      `endpoint: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      `token: ${FIXTURE_SECRET_LITERAL}`,
      '',
    ].join('\n'),
  );
  // Positive: the same filename in a subdirectory. Copilot CLI reads it when
  // its session context is that directory; no editor or hosted surface
  // documents such a location, so this file's recognition names the CLI alone.
  write(
    root,
    'packages/api/.github/copilot-instructions.md',
    '# API context repository-wide instructions\n',
  );
  // Positive: path-specific instructions at the root-exact subtree, one
  // directly inside it and one nested below. Both derive the root's range:
  // the whole `.github/instructions` location is where Copilot keeps the file.
  write(
    root,
    '.github/instructions/frontend.instructions.md',
    ['---', "applyTo: 'src/frontend/**'", '---', '', '# Frontend instructions', ''].join('\n'),
  );
  write(root, '.github/instructions/nested/backend.instructions.md', '# Backend instructions\n');
  // Positive, and the attempt's one file-confined failure: a frontmatter block
  // no parser can read. The recognition fails all-or-nothing, its diagnostic
  // is confined to this file, and the complete source stays readable (FR-028).
  write(
    root,
    '.github/instructions/broken.instructions.md',
    '---\napplyTo: [src\n---\n\n# Broken instructions\n',
  );
  // Positive: the path-instruction subtree in a subdirectory — the CLI-context
  // rule alone, exactly like the repository-wide pair above.
  write(root, 'packages/api/.github/instructions/api.instructions.md', '# API path instructions\n');
  // Positive: `AGENTS.md` at the root and nested. All three surfaces reach it,
  // each in its own documented way, and the root file is a Codex instruction
  // too — one physical file, two products.
  write(root, 'AGENTS.md', '# Shared agent instructions\n');
  write(root, 'packages/api/AGENTS.md', '# Nested agent instructions\n');
  // Positive: the two root-only agent-instruction alternatives. `CLAUDE.md` is
  // Claude's as well; `GEMINI.md` is Copilot's alone, and its recognition
  // names the CLI and Cloud surfaces because VS Code documents no `GEMINI.md`.
  write(root, 'CLAUDE.md', '# Root Claude-compatible instructions\n');
  write(root, 'GEMINI.md', '# Root Gemini-compatible instructions\n');

  // Excluded by initial scope, written so their absence is observable: the
  // `.claude` instruction spellings and the local variant VS Code and the CLI
  // document, and the non-root alternatives the CLI documents. Each is
  // `copilot.excluded.additional-standard-locations`; the first three are
  // Claude instruction files, which is what makes "no Copilot rule admits it"
  // a statement about Copilot rather than about the file.
  write(root, '.claude/CLAUDE.md', '# Directory-form Claude instructions\n');
  write(root, 'CLAUDE.local.md', '# Local Claude instructions\n');
  write(root, 'packages/api/CLAUDE.md', '# Nested Claude instructions\n');
  write(root, 'packages/api/GEMINI.md', '# Nested Gemini instructions\n');
  write(root, '.claude/rules/style.md', '# Claude-compatible rule\n');

  // Runtime-supplied lookup roots — `copilot.excluded.extra-directories`. A
  // scan root is the one selected boundary (FR-001), so a directory named by
  // an environment variable or a setting is never one, and no selector reaches
  // these shapes.
  write(root, '.copilot/instructions/personal.instructions.md', '# Configured location\n');
  write(root, 'custom-instructions/team.instructions.md', '# Configured location\n');

  // Near miss: spelling variants one step from each literal. The case variants
  // live under `tools/`, which holds no admitted file, because a
  // case-insensitive filesystem would fold a variant written beside an
  // admitted file into that file itself.
  write(root, '.github/copilot-instructions.markdown', 'wrong suffix\n');
  write(root, '.github/instructions.md', 'not the directory\n');
  write(root, '.github/instructions/README.md', 'wrong suffix\n');
  write(root, '.github/instructions/notes.instructions.markdown', 'wrong suffix\n');
  write(root, 'tools/.github/COPILOT-INSTRUCTIONS.md', 'wrong case\n');
  write(root, 'tools/agents.md', 'wrong case\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/AGENTS.md', 'vcs internal\n');
  // Near miss: an installed package's own instruction files. A package manager
  // put them there and the packages that ship them own them, so they are not
  // this repository's customizations however deep the walk would otherwise
  // reach (contracts/inspection-path-allowlist.md).
  write(root, 'node_modules/some-package/AGENTS.md', '# package instructions\n');
  write(
    root,
    'node_modules/some-package/.github/copilot-instructions.md',
    '# package instructions\n',
  );
  // Unrelated file that shares no segment with the selectors.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    expectedCopilotInstructionPaths: {
      'copilot.repo.instructions.agents': ['AGENTS.md', 'packages/api/AGENTS.md'],
      'copilot.repo.instructions.claude-root': ['CLAUDE.md'],
      'copilot.repo.instructions.gemini-root': ['GEMINI.md'],
      'copilot.repo.instructions.path': [
        '.github/instructions/broken.instructions.md',
        '.github/instructions/frontend.instructions.md',
        '.github/instructions/nested/backend.instructions.md',
      ],
      'copilot.repo.instructions.path-cli-context': [
        '.github/instructions/broken.instructions.md',
        '.github/instructions/frontend.instructions.md',
        '.github/instructions/nested/backend.instructions.md',
        'packages/api/.github/instructions/api.instructions.md',
      ],
      'copilot.repo.instructions.repository': ['.github/copilot-instructions.md'],
      'copilot.repo.instructions.repository-cli-context': [
        '.github/copilot-instructions.md',
        'packages/api/.github/copilot-instructions.md',
      ],
    },
    expectedClaudeInstructionPaths: [
      '.claude/CLAUDE.md',
      'CLAUDE.local.md',
      'CLAUDE.md',
      'packages/api/CLAUDE.md',
    ],
    expectedCodexInstructionPaths: ['AGENTS.md'],
    expectedClaudeRulePaths: ['.claude/rules/style.md'],
    copilotNearMissPaths: [
      '.claude/CLAUDE.md',
      '.claude/rules/style.md',
      '.copilot/instructions/personal.instructions.md',
      '.git/AGENTS.md',
      '.github/copilot-instructions.markdown',
      '.github/instructions.md',
      '.github/instructions/README.md',
      '.github/instructions/notes.instructions.markdown',
      'CLAUDE.local.md',
      'README.md',
      'custom-instructions/team.instructions.md',
      'node_modules/some-package/.github/copilot-instructions.md',
      'node_modules/some-package/AGENTS.md',
      'packages/api/CLAUDE.md',
      'packages/api/GEMINI.md',
      'tools/.github/COPILOT-INSTRUCTIONS.md',
      'tools/agents.md',
    ],
    applyToInstructionPath: '.github/instructions/frontend.instructions.md',
    malformedInstructionPath: '.github/instructions/broken.instructions.md',
    secretInstructionPath: '.github/copilot-instructions.md',
  };
}

/** One built all-vendor instruction fixture repository (T268). */
export interface AllVendorInstructionFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The Source-relative Paths the static `codex.repo.instructions` selectors
   * must admit, sorted: the root override/regular pair and nothing nested,
   * because Codex's rule is anchored at the selected root.
   */
  readonly expectedCodexInstructionPaths: readonly string[];
  /**
   * The declared fallback files that exist at the Repository root — the
   * derived `instructions` candidates the configuration-read stage must
   * publish under `codex.derived.fallback-basename`, sorted.
   */
  readonly expectedDerivedFallbackPaths: readonly string[];
  /**
   * The Source-relative Path of the root `.codex/config.toml` the
   * configuration-read stage opens as configuration, and — since its own
   * candidacy shipped (`codex.repo.config`, T286) — the walk admits and reads
   * once more as the published MCP carrier.
   */
  readonly configCarrierPath: string;
  /** The fallback basenames the carrier declares, in authored order. */
  readonly configuredFallbackBasenames: readonly string[];
  /** The declared basename with no on-disk file: derives nothing, silently. */
  readonly absentFallbackBasename: string;
  /**
   * A nested file bearing a declared fallback basename. A configured Codex
   * fallback is an entry name matched at the Repository root, so this file is
   * never a candidate of any product — the "no nested file becomes one" half
   * of the Phase 21 matrix.
   */
  readonly nestedFallbackVariantPath: string;
  /**
   * Every Source-relative Path `claude.repo.instructions` must admit, sorted.
   * The binary candidate is a member — its admission is what makes its
   * diagnostic-only publication observable — while no nested member ever
   * gains a Codex recognition, however its filename is spelled.
   */
  readonly expectedClaudeInstructionPaths: readonly string[];
  /**
   * Every Source-relative Path the Copilot instruction rules must admit,
   * keyed by the admitting rule and sorted within each rule; see
   * {@link CopilotInstructionFixture.expectedCopilotInstructionPaths} for why
   * the split by rule is the point.
   */
  readonly expectedCopilotInstructionPaths: Readonly<Record<string, readonly string[]>>;
  /**
   * The admitted paths whose bytes this scan cannot use — the NUL-carrying
   * nested `CLAUDE.md`. It publishes as a diagnostic-only file, gains no
   * recognition, and is one of the deterministic file-confined outcomes that
   * make the otherwise publishable generation `partial` (FR-028).
   */
  readonly diagnosticOnlyPaths: readonly string[];
  /**
   * The admitted instruction file whose frontmatter block cannot be parsed:
   * its recognition fails all-or-nothing with the `recognition-parse-failed`
   * Diagnostic while its complete source and its path-derived range stay
   * published (FR-028) — the other deterministic file-confined outcome.
   */
  readonly malformedInstructionPath: string;
  /**
   * The Claude rule files this tree holds. They are near misses for every
   * instruction rule and candidates of `claude.repo.rules` at once, so a scan
   * reads them and they are listed here rather than among the paths nothing
   * admits.
   */
  readonly expectedClaudeRulePaths: readonly string[];
  /**
   * Paths one step away from an admitted file that no shipped rule or
   * derivation of any product may admit; see
   * {@link CodexInstructionFixture.nearMissPaths}.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * Every Source-relative Path one complete scan publishes, sorted exactly as
   * the snapshot lists it: the union of every product's admitted set and the
   * derived fallbacks. Instruction files have no census, so nothing else
   * publishes.
   */
  readonly expectedPublishedPaths: readonly string[];
  /**
   * The admitted instruction file an injected filesystem-operation failure
   * targets; see {@link AllToolSkillFixture.injectionTargetPath} for the
   * injection seam the suites drive.
   */
  readonly injectionTargetPath: string;
  /** The admitted instruction file carrying the literal credential. */
  readonly secretInstructionPath: string;
  /**
   * The file the root `CLAUDE.md` names with an authored `@path` token. It
   * exists on disk precisely so a scan can prove a relationship target is
   * never opened: a target confers no read authority (FR-003).
   */
  readonly importTargetPath: string;
}

/**
 * Builds the canonical all-vendor instruction fixture repository (T268): one
 * tree that exercises every supported static instruction selector, the
 * configured fallback derivation, and the complete shared-file matrix at once
 * (Phase 21): `AGENTS.md` is Codex+Copilot, root `CLAUDE.md` is
 * Claude+Copilot, nested `CLAUDE.md` is Claude-only, and `CLAUDE.local.md` is
 * Claude-only, while a configured Codex fallback is an entry name matched at
 * the Repository root, so no nested file becomes one.
 *
 * Deterministic failures: the NUL-carrying nested `CLAUDE.md` publishes as
 * `binary` with its diagnostic, and the malformed `docs/CLAUDE.md` keeps its
 * complete source and range while its extraction fails — both file-confined,
 * so the generation commits `partial` while every other file publishes
 * (FR-028). Injected failures are runtime behavior, never tree state: suites
 * inject filesystem-operation failures against {@link injectionTargetPath}
 * through the mocked `fs-io` surface, while a recognition failure replaces
 * the recognizer callback itself, addressing no path.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildAllVendorInstructionFixture(
  prefix = 'inspector-all-instructions',
  root = createRepositoryFixtureRoot(prefix),
): AllVendorInstructionFixture {
  // Codex+Copilot at the root: the one physical file the two products'
  // root-anchored and any-depth `AGENTS.md` selectors both admit. It is also
  // the file the filesystem-failure injections target.
  write(root, 'AGENTS.md', '# Shared agent instructions\n');
  // Codex-only: no Copilot surface documents the override filename. It
  // carries every content shape the inventory must keep inert — declarations
  // that stay out of every session summary, a literal credential readable
  // only through the detail route (FR-027), and a literal environment
  // reference never resolved against the process environment (FR-025).
  write(
    root,
    'AGENTS.override.md',
    [
      '---',
      'scope: override',
      `endpoint: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      '---',
      '',
      '# Override instructions',
      '',
      `token: ${FIXTURE_SECRET_LITERAL}`,
      '',
    ].join('\n'),
  );
  // Claude+Copilot at the root: Copilot documents its `CLAUDE.md` alternative
  // at the repository root alone. The authored `@path` token's target exists
  // below so a scan can prove no relationship target is opened.
  write(root, 'CLAUDE.md', '# Root Claude instructions\n\n@docs/setup.md\n');
  // Claude-only: the local variant, the `.claude` directory form, and the
  // nested spellings Claude reaches through its documented any-depth
  // discovery — the same nesting that stays a near miss for every other
  // product's root-anchored or root-only rules.
  write(root, 'CLAUDE.local.md', '# Local instructions\n');
  write(root, '.claude/CLAUDE.md', '# Directory-form project instructions\n');
  write(root, 'packages/api/CLAUDE.md', '# Nested instructions\n');
  write(root, 'packages/api/.claude/CLAUDE.md', '# Nested directory-form instructions\n');
  // Deterministic file-confined failure: a frontmatter block no parser can
  // read. The recognition fails all-or-nothing while the complete source and
  // the path-derived `docs/**` range stay published (FR-028).
  write(root, 'docs/CLAUDE.md', '---\nscope: [docs\n---\n\n# Docs instructions\n');
  // Deterministic file-confined failure: NUL bytes in an admitted candidate
  // publish the textless `binary` item with its diagnostic and no
  // recognition (FR-025/FR-028).
  writeBytes(root, 'packages/web/CLAUDE.md', new Uint8Array([0x23, 0x00, 0xff, 0x00]));

  // The configuration carrier and the fallback files it names. One declared
  // basename exists nowhere, so the scan proves an absent declared name
  // derives nothing — the ordinary negative, not a diagnostic.
  const configuredFallbackBasenames = ['TEAM_GUIDE.md', 'GUIDE.codex.md', 'ABSENT_GUIDE.md'];
  write(
    root,
    '.codex/config.toml',
    `project_doc_fallback_filenames = [${configuredFallbackBasenames
      .map((basename) => JSON.stringify(basename))
      .join(', ')}]\n`,
  );
  write(root, 'TEAM_GUIDE.md', '# configured fallback TEAM_GUIDE.md\n');
  write(root, 'GUIDE.codex.md', '# configured fallback GUIDE.codex.md\n');
  // The configured-fallback variant of the nested matrix half: a nested file
  // bearing a declared basename. The derivation matches entry names at the
  // Repository root, so this file is never a candidate of any product.
  write(root, 'packages/api/TEAM_GUIDE.md', '# nested fallback variant\n');

  // Copilot: the repository-wide file at the root — admitted by the
  // root-exact rule and the CLI-context rule at once — and the same filename
  // in a subdirectory, which the CLI-context rule admits alone.
  write(root, '.github/copilot-instructions.md', '# Repository-wide instructions\n');
  write(
    root,
    'packages/api/.github/copilot-instructions.md',
    '# API context repository-wide instructions\n',
  );
  // Copilot path-specific instructions: one declaring its own range, one
  // declaring none — the no-range row — and one in a subdirectory the
  // CLI-context rule admits alone, likewise rangeless.
  write(
    root,
    '.github/instructions/frontend.instructions.md',
    ['---', "applyTo: 'src/frontend/**'", '---', '', '# Frontend instructions', ''].join('\n'),
  );
  write(root, '.github/instructions/nested/backend.instructions.md', '# Backend instructions\n');
  write(root, 'packages/api/.github/instructions/api.instructions.md', '# API path instructions\n');
  // Copilot-only root alternative, and the nested `AGENTS.md` files only
  // Copilot's any-depth rule reaches — the exact shape that proves Codex's
  // rule stays anchored at the root.
  write(root, 'GEMINI.md', '# Root Gemini-compatible instructions\n');
  write(root, 'docs/AGENTS.md', '# docs instructions\n');
  write(root, 'packages/api/AGENTS.md', '# Nested agent instructions\n');

  // Near miss: the target of the authored import. No scan may open it.
  write(root, 'docs/setup.md', '# setup\n');
  // A Claude rule file, which no instruction rule of any product admits and
  // `claude.repo.rules` does — the case that keeps "excluded from Copilot's
  // instruction scope" distinct from "in no inventory at all".
  write(root, '.claude/rules/style.md', '# Claude-compatible rule\n');
  // Excluded by initial Copilot scope, written so their absence from every
  // product's inventory is observable
  // (`copilot.excluded.additional-standard-locations`,
  // `copilot.excluded.extra-directories`).
  write(root, 'packages/api/GEMINI.md', '# Nested Gemini instructions\n');
  write(root, '.copilot/instructions/personal.instructions.md', '# Configured location\n');
  write(root, 'custom-instructions/team.instructions.md', '# Configured location\n');
  // Near miss: spelling variants one step from each root literal. The case
  // variants live under `tools/`, which holds no admitted file, because a
  // case-insensitive filesystem would fold one written beside an admitted
  // file into that file itself.
  write(root, 'AGENT.md', 'singular\n');
  write(root, 'AGENTS-override.md', 'hyphenated\n');
  write(root, 'CLAUDE-local.md', 'hyphenated\n');
  write(root, 'CLAUDE.md.bak', 'backup suffix\n');
  write(root, 'tools/CLAUDE.MD', 'wrong case\n');
  write(root, 'tools/AGENTS.MD', 'wrong case\n');
  write(root, '.github/copilot-instructions.markdown', 'wrong suffix\n');
  write(root, '.github/instructions/README.md', 'wrong suffix\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/AGENTS.md', 'vcs internal\n');
  write(root, '.git/CLAUDE.md', 'vcs internal\n');
  // Near miss: installed packages' own instruction files, at the root's
  // `node_modules` and at a nested one.
  write(root, 'node_modules/some-package/CLAUDE.md', '# package instructions\n');
  write(root, 'packages/api/node_modules/other-package/AGENTS.md', '# package instructions\n');
  // Near miss: a nested carrier belongs to a runtime context this product
  // does not select. `X.md` exists nowhere, so it also proves an unadmitted
  // carrier seeds nothing.
  write(root, 'packages/api/.codex/config.toml', 'project_doc_fallback_filenames = ["X.md"]\n');
  // Unrelated file that shares no segment with any selector.
  write(root, 'README.md', 'unrelated\n');

  const expectedCodexInstructionPaths = ['AGENTS.md', 'AGENTS.override.md'];
  const expectedDerivedFallbackPaths = ['GUIDE.codex.md', 'TEAM_GUIDE.md'];
  const expectedClaudeInstructionPaths = [
    '.claude/CLAUDE.md',
    'CLAUDE.local.md',
    'CLAUDE.md',
    'docs/CLAUDE.md',
    'packages/api/.claude/CLAUDE.md',
    'packages/api/CLAUDE.md',
    'packages/web/CLAUDE.md',
  ];
  const expectedCopilotInstructionPaths = {
    'copilot.repo.instructions.agents': ['AGENTS.md', 'docs/AGENTS.md', 'packages/api/AGENTS.md'],
    'copilot.repo.instructions.claude-root': ['CLAUDE.md'],
    'copilot.repo.instructions.gemini-root': ['GEMINI.md'],
    'copilot.repo.instructions.path': [
      '.github/instructions/frontend.instructions.md',
      '.github/instructions/nested/backend.instructions.md',
    ],
    'copilot.repo.instructions.path-cli-context': [
      '.github/instructions/frontend.instructions.md',
      '.github/instructions/nested/backend.instructions.md',
      'packages/api/.github/instructions/api.instructions.md',
    ],
    'copilot.repo.instructions.repository': ['.github/copilot-instructions.md'],
    'copilot.repo.instructions.repository-cli-context': [
      '.github/copilot-instructions.md',
      'packages/api/.github/copilot-instructions.md',
    ],
  };

  return {
    root,
    expectedCodexInstructionPaths,
    expectedDerivedFallbackPaths,
    configCarrierPath: '.codex/config.toml',
    configuredFallbackBasenames,
    absentFallbackBasename: 'ABSENT_GUIDE.md',
    nestedFallbackVariantPath: 'packages/api/TEAM_GUIDE.md',
    expectedClaudeInstructionPaths,
    expectedCopilotInstructionPaths,
    diagnosticOnlyPaths: ['packages/web/CLAUDE.md'],
    malformedInstructionPath: 'docs/CLAUDE.md',
    expectedClaudeRulePaths: ['.claude/rules/style.md'],
    nearMissPaths: [
      '.copilot/instructions/personal.instructions.md',
      '.git/AGENTS.md',
      '.git/CLAUDE.md',
      '.github/copilot-instructions.markdown',
      '.github/instructions/README.md',
      'AGENT.md',
      'AGENTS-override.md',
      'CLAUDE-local.md',
      'CLAUDE.md.bak',
      'README.md',
      'custom-instructions/team.instructions.md',
      'docs/setup.md',
      'node_modules/some-package/CLAUDE.md',
      'packages/api/.codex/config.toml',
      'packages/api/GEMINI.md',
      'packages/api/TEAM_GUIDE.md',
      'packages/api/node_modules/other-package/AGENTS.md',
      'tools/AGENTS.MD',
      'tools/CLAUDE.MD',
      'X.md',
    ],
    expectedPublishedPaths: [
      ...new Set([
        // The carrier's own candidacy (`codex.repo.config`, T286): the same
        // physical file the configuration stage reads as its seed also
        // publishes as an admitted candidate of the walk.
        '.codex/config.toml',
        ...expectedCodexInstructionPaths,
        ...expectedDerivedFallbackPaths,
        ...expectedClaudeInstructionPaths,
        ...Object.values(expectedCopilotInstructionPaths).flat(),
        // The Claude rule file the tree holds: no instruction rule admits it,
        // and `claude.repo.rules` does.
        '.claude/rules/style.md',
      ]),
    ].sort(),
    injectionTargetPath: 'AGENTS.md',
    secretInstructionPath: 'AGENTS.override.md',
    importTargetPath: 'docs/setup.md',
  };
}

/** One combined fixture repository holding every customization kind at once. */
export interface AllCustomizationKindFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The all-tool SKILL fixture's own result, built into this root. */
  readonly skillFixture: AllToolSkillFixture;
  /** The all-vendor instruction fixture's own result, built into this root. */
  readonly instructionFixture: AllVendorInstructionFixture;
  /** The cross-vendor MCP fixture's own result, built into this root. */
  readonly mcpFixture: PriorityMcpFixture;
  /** The Codex rule fixture's own result, built into this root. */
  readonly ruleFixture: CodexRuleFixture;
  /** The Claude rule fixture's own result, built into this root. */
  readonly claudeRuleFixture: ClaudeRuleFixture;
  /** The Claude permission-policy fixture's own result, built into this root. */
  readonly claudePermissionsFixture: ClaudePermissionsFixture;
}

/**
 * Builds every kind's fixture into one repository (T1099): the all-tool SKILL
 * tree, both vendors' rule trees, the cross-vendor MCP tree, and the
 * all-vendor instruction tree share a single root, so one launch exercises
 * every inventory this release publishes at once.
 *
 * The trees are disjoint except for two files both the MCP and instruction
 * builders own: the root and nested `.codex/config.toml`. Each of those
 * builders writes the whole file, so this builder rewrites the shared paths
 * as the concatenation of both outputs — the instruction builder's top-level
 * fallback key first, the MCP builder's server tables after it, because a
 * TOML document requires top-level keys before its first table header.
 *
 * Three more paths are written twice with the later write winning, which is
 * why the rule tree is built before the instruction tree: `README.md` is the
 * same `unrelated` placeholder in every builder, while the rule tree's
 * `.claude/CLAUDE.md` and `.github/copilot-instructions.md` stand in for
 * another product's customization and the instruction tree owns the real
 * ones. What the rule fixture claims about those two paths — that another
 * product's rule admits them and no Codex one does — holds for either
 * builder's bytes, because both write an instruction file of that product.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildAllCustomizationKindFixture(
  prefix = 'inspector-all-kinds',
  root = createRepositoryFixtureRoot(prefix),
): AllCustomizationKindFixture {
  const skillFixture = buildAllToolSkillFixture(prefix, root);
  const ruleFixture = buildCodexRuleFixture(prefix, root);
  const claudeRuleFixture = buildClaudeRuleFixture(prefix, root);
  const mcpFixture = buildPriorityMcpFixture(prefix, root);
  // After the MCP builder, which writes its own `.claude/settings.json` as an
  // unadmitted MCP owner: here that path is a permission-policy carrier, and
  // the later write is the one this tree shows. Its `mcpServers` spelling
  // still joins no MCP row, which is what the MCP builder's copy was for.
  const claudePermissionsFixture = buildClaudePermissionsFixture(prefix, root);
  // Capture the MCP builder's two Codex configs before the instruction
  // builder replaces those paths with its fallback declaration.
  const sharedCodexConfigPaths = ['.codex/config.toml', 'packages/api/.codex/config.toml'];
  const mcpCodexConfigs = sharedCodexConfigPaths.map((path) =>
    readFileSync(join(root, path), 'utf8'),
  );
  const instructionFixture = buildAllVendorInstructionFixture(prefix, root);
  for (const [index, path] of sharedCodexConfigPaths.entries()) {
    const fallbackDeclaration = readFileSync(join(root, path), 'utf8');
    write(root, path, `${fallbackDeclaration}\n${mcpCodexConfigs[index]!}`);
  }
  return {
    root,
    skillFixture,
    instructionFixture,
    mcpFixture,
    ruleFixture,
    claudeRuleFixture,
    claudePermissionsFixture,
  };
}
