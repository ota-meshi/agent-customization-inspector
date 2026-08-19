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
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
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
   * configuration-read stage opens as configuration. It is read exactly once
   * and published nowhere (Phase 15, user decision 2026-08-17).
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
  // Excluded by initial Copilot scope, written so their absence from every
  // product's inventory except Claude's is observable
  // (`copilot.excluded.additional-standard-locations`,
  // `copilot.excluded.extra-directories`).
  write(root, '.claude/rules/style.md', '# Claude-compatible rule\n');
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
    nearMissPaths: [
      '.claude/rules/style.md',
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
        ...expectedCodexInstructionPaths,
        ...expectedDerivedFallbackPaths,
        ...expectedClaudeInstructionPaths,
        ...Object.values(expectedCopilotInstructionPaths).flat(),
      ]),
    ].sort(),
    injectionTargetPath: 'AGENTS.md',
    secretInstructionPath: 'AGENTS.override.md',
    importTargetPath: 'docs/setup.md',
  };
}
