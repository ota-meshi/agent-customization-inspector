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
//
// `README.md` and `README.ja.md` beside this module are the guidance for using
// and extending these trees: which family each builder belongs to, what a
// suite may rely on, and what a new case owes the tree it joins. They are
// where a reader starts; this file is where the bytes are.
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
   * The Source-relative Path of the root `.codex/config.toml` the two Codex
   * rules admit — `codex.repo.config` for the `[mcp_servers.*]` tables it
   * carries and `codex.repo.settings` for the document they sit in — as one
   * candidate read once. The same physical file still seeds the fallback
   * derivation as configuration.
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
 * The same file is the Codex settings document its `settings/config` row is
 * (T577), so it also carries the general configuration a reader opens that row
 * for: a comment, an underscored integer, a trust declaration, and configured
 * model-instruction, compact-prompt, and plugin paths. Those targets are
 * written to disk as near misses — a configured path gains no read authority
 * and becomes no candidate — and the comment and authored spellings are what
 * the detail must still show, since that row publishes the document rather
 * than a parser's resolution of it (FR-007).
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
      // A leading comment, and the authored spellings beside it: the settings
      // detail shows the document whole, so a comment and an underscored
      // integer are exactly what a parser-resolved declaration list would
      // have dropped.
      '# Codex project configuration for the fixture repository.',
      'model = "gpt-5.4-codex"',
      'project_doc_max_bytes = 32_768',
      'approval_policy = "on-request"',
      'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
      '',
      // Inert configured targets: a declared path never gains read authority
      // and creates no candidate, whichever family it names.
      '[projects."."]',
      'trust_level = "trusted"',
      '',
      '[experimental]',
      'model_instructions_file = "./.codex/model-instructions.md"',
      'compact_prompt_file = "./.codex/compact-prompt.md"',
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
  // Near miss: the targets the configuration above names. A configured path
  // gains no read authority and becomes no candidate, so these files exist
  // precisely to stay absent from every inventory.
  write(root, '.codex/model-instructions.md', '# configured model instructions\n');
  write(root, '.codex/compact-prompt.md', '# configured compact prompt\n');

  return {
    root,
    carrierPath: '.codex/config.toml',
    expectedServerNames: ['context7', 'docs-http', 'odd'],
    expectedInstructionPaths: ['AGENTS.md'],
    configuredFallbackBasenames,
    expectedDerivedFallbackPaths: ['TEAM_GUIDE.md'],
    nearMissPaths: [
      '.codex/compact-prompt.md',
      '.codex/config.toml.bak',
      '.codex/model-instructions.md',
      '.codex/nested/config.toml',
      'packages/api/.codex/config.toml',
    ],
  };
}

/** One built all-vendor settings fixture repository (T622, unified by T643). */
export interface CopilotSettingsFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The four settings documents `copilot.repo.settings` admits, sorted: the
   * two GitHub Copilot files and the two Claude-format ones the CLI reads for
   * the documented shared cross-tool subset. The last two are shared physical
   * files Claude Code admits under its own rules — one file, one read, one
   * recognition per product.
   */
  readonly expectedSettingsPaths: readonly string[];
  /** The two of them Claude Code recognizes as well, sorted. */
  readonly sharedWithClaudePaths: readonly string[];
  /**
   * A marker only the GitHub settings document carries, so a surface showing
   * it is showing that document rather than a neighbour.
   */
  readonly githubSettingsMarker: string;
  /**
   * Paths no shipped rule may admit: the two explicitly excluded documents —
   * a general `.vscode/settings.json` and the CLI's `.github/lsp.json` — the
   * targets these documents declare, and spelling variants one segment from
   * each admitted literal.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * A second root whose GitHub settings document strict JSON cannot parse.
   * Its own root because one root's four filenames are already the positive
   * cases.
   */
  readonly malformedRoot: string;
  /**
   * The Codex configuration layer in the same root, so one tree holds all
   * three products' settings documents (T643). It is the settings family's
   * only MCP-row source, because only an explicit carrier holds an MCP
   * recognition.
   */
  readonly codexCarrierPath: string;
  /**
   * Every settings row this tree publishes, sorted — the four Copilot
   * documents and the Codex layer. Two of the four are also Claude rows, so
   * the row count is the file count and the recognitions differ per row.
   */
  readonly expectedUnifiedSettingsPaths: readonly string[];
  /** The server the Codex layer declares, which is the tree's one MCP row. */
  readonly codexServerName: string;
}

/**
 * Builds the canonical Copilot settings fixture repository (T622).
 *
 * The four admitted documents carry what a Copilot settings document carries:
 * general keys, an inline `hooks` block, an `enabledPlugins` map and an
 * `extraKnownMarketplaces` entry, a declared status-line command, a literal
 * credential, and a literal environment reference — every one of them a value
 * its author wrote, which no row may show and nothing may resolve (FR-026,
 * FR-027). None of them makes the file an MCP owner: an MCP declaration's home
 * is an explicit carrier and nothing else (data-model.md § Inventory unit).
 *
 * The negatives are the two documented exclusions this phase records — a
 * general `.vscode/settings.json` and the CLI's `.github/lsp.json` — beside
 * the configured targets the documents name and spelling variants one segment
 * from each admitted literal.
 */
export function buildCopilotSettingsFixture(
  prefix = 'inspector-copilot-settings',
  root = createRepositoryFixtureRoot(prefix),
): CopilotSettingsFixture {
  const githubSettingsMarker = 'fixture-github-copilot-settings-marker';
  write(
    root,
    '.github/copilot/settings.json',
    `${JSON.stringify(
      {
        companyAnnouncements: [githubSettingsMarker],
        enabledPlugins: { 'code-formatter@company-tools': true },
        extraKnownMarketplaces: {
          'company-tools': { source: { source: 'github', repo: 'your-org/plugin-marketplace' } },
        },
        statusLine: { type: 'command', command: './.github/copilot/statusline.sh' },
        env: { COPILOT_FIXTURE_ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE },
        hooks: {
          PostToolUse: [
            { matcher: 'Edit', hooks: [{ type: 'command', command: './.github/hooks/format.sh' }] },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.github/copilot/settings.local.json',
    `${JSON.stringify({ disableAllHooks: true, token: FIXTURE_SECRET_LITERAL }, null, 2)}\n`,
  );
  // The two cross-tool documents: one physical file each, admitted by this
  // product's Claude rules as well.
  write(root, '.claude/settings.json', `${JSON.stringify({ model: 'opus' }, null, 2)}\n`);
  write(
    root,
    '.claude/settings.local.json',
    `${JSON.stringify({ enabledPlugins: {} }, null, 2)}\n`,
  );

  // The two documented exclusions this phase records: both exist on disk
  // precisely so a test can prove no rule admits them.
  write(root, '.vscode/settings.json', `${JSON.stringify({ 'editor.tabSize': 2 }, null, 2)}\n`);
  write(root, '.github/lsp.json', `${JSON.stringify({ servers: {} }, null, 2)}\n`);
  // The targets the documents above declare: a configured path gains no read
  // authority and becomes no candidate.
  write(root, '.github/copilot/statusline.sh', 'echo status\n');
  write(root, '.github/hooks/format.sh', 'echo formatting\n');
  // Near misses one segment from each admitted literal.
  write(root, '.github/settings.json', '{}\n');
  write(root, '.github/copilot/settings.json.bak', 'backup suffix\n');
  write(root, 'packages/api/.github/copilot/settings.json', '{}\n');

  // The Codex layer, so one tree holds all three products' settings documents
  // (T643): the settings family's only MCP-row source, since a Claude or
  // Copilot settings file spelling MCP configuration is that file's own
  // content and joins no MCP row.
  write(
    root,
    '.codex/config.toml',
    ['model = "gpt-5.4-codex"', '', '[mcp_servers.codex-db]', 'command = "npx"', ''].join('\n'),
  );

  const malformedRoot = createRepositoryFixtureRoot(`${prefix}-malformed`);
  write(malformedRoot, '.github/copilot/settings.json', '{ "enabledPlugins": { \n');

  return {
    root,
    expectedSettingsPaths: [
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.github/copilot/settings.json',
      '.github/copilot/settings.local.json',
    ],
    sharedWithClaudePaths: ['.claude/settings.json', '.claude/settings.local.json'],
    githubSettingsMarker,
    nearMissPaths: [
      '.github/copilot/settings.json.bak',
      '.github/copilot/statusline.sh',
      '.github/hooks/format.sh',
      '.github/lsp.json',
      '.github/settings.json',
      '.vscode/settings.json',
      'packages/api/.github/copilot/settings.json',
    ],
    malformedRoot,
    codexCarrierPath: '.codex/config.toml',
    expectedUnifiedSettingsPaths: [
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.codex/config.toml',
      '.github/copilot/settings.json',
      '.github/copilot/settings.local.json',
    ],
    codexServerName: 'codex-db',
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
   * Paths no shipped rule of any product may admit (T601): spelling variants
   * one segment from each admitted literal, and the targets the settings
   * documents themselves name — a declared hook command and a status-line
   * script, which gain no read authority from being declared.
   */
  readonly nearMissPaths: readonly string[];
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
 *
 * The same two files are the Claude settings documents their `settings/config`
 * rows are (T601), so the shared one also carries the general settings a
 * reader opens that row for — a model, a retention period, a status line, a
 * hook command, and an enabled plugin — beside the near misses those
 * declarations name. Two rows of one file with visibly different subjects: the
 * permissions row publishes the `permissions` block alone, and the settings
 * row the whole document (FR-007).
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
        model: 'opus',
        cleanupPeriodDays: 20,
        statusLine: { type: 'command', command: './.claude/statusline.sh' },
        hooks: {
          PostToolUse: [
            { matcher: 'Edit', hooks: [{ type: 'command', command: './.claude/hooks/format.sh' }] },
          ],
        },
        enabledPlugins: { 'formatter@marketplace': true },
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
  // Near misses one segment from each admitted literal (T601): the container
  // is exact, the filename is exact, and no settings file outside `.claude/`
  // is admitted. A parent-directory copy needs no file of its own — the
  // Repository boundary is the selected root, so nothing above it is walked.
  write(root, 'settings.json', '{ "model": "opus" }\n');
  write(root, '.claude/settings.json.bak', 'backup suffix\n');
  write(root, '.claude/settings/config.json', '{ "model": "opus" }\n');
  write(root, '.claude/nested/settings.json', '{ "model": "opus" }\n');
  // Near misses the settings documents themselves name: a declared hook
  // command, a status-line script, and an additional directory gain no read
  // authority and become no candidate.
  write(root, '.claude/hooks/format.sh', 'echo formatting\n');
  write(root, '.claude/statusline.sh', 'echo status\n');
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
    nearMissPaths: [
      '.claude/hooks/format.sh',
      '.claude/nested/settings.json',
      '.claude/settings.json.bak',
      '.claude/settings/config.json',
      '.claude/statusline.sh',
      'packages/api/.claude/settings.json',
      'settings.json',
    ],
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

/**
 * The Codex plugin fixture (T751): the exact-root plugin manifest, the two
 * exact catalog locations, plugin roots the catalogs' local sources name, and
 * the sources and near misses that must derive nothing.
 */
export interface CodexPluginFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the Codex plugin rules admit: the two catalogs,
   * and nothing else. A plugin's own files — its `.codex-plugin/plugin.json`
   * included — are read from the plugin root a catalog entry names and
   * published as the plugin's files, never as candidates of their own
   * (contracts/inspection-path-allowlist.md § Bounded companion census).
   */
  readonly expectedPluginPaths: readonly string[];
  /** The catalog whose entries name every source form this fixture covers. */
  readonly catalogPath: string;
  /** The manifest inside the plugin root the catalog's object-form local source names. */
  readonly objectSourceManifestPath: string;
  /** The manifest derived from the catalog's plain-string local source. */
  readonly stringSourceManifestPath: string;
  /**
   * The manifest whose own `name` differs from the catalog entry that names its
   * plugin root: the row is the offering's, and this file is one of the files
   * that plugin ships.
   */
  readonly divergentNameManifestPath: string;
  /** The second catalog's own manifest for {@link sharedNameAcrossCatalogs}. */
  readonly legacyCatalogManifestPath: string;
  /**
   * The manifest reached through a plugin root that is a symbolic link to a
   * directory inside the repository: links are read through their targets, so
   * the file is published under the link's own path (FR-024). Null where the
   * platform refused to create the link, which is the one case the linked
   * plugin is not in the tree at all.
   */
  readonly linkedManifestPath: string | null;
  /**
   * The plugin names whose entries name a source outside this repository — a
   * Git subdirectory, an npm package, an absolute path, a home path, and a
   * traversal escaping the root. Each is a row whose only carrier is the
   * catalog entry.
   */
  readonly nonLocalPluginNames: readonly string[];
  /**
   * A manifest whose JSON no reader accepts. Nothing parses it — a plugin's own
   * files are published as the files they are — so it is an ordinary published
   * file of the plugin that ships it.
   */
  readonly malformedManifestPath: string;
  /**
   * The manifest declaring a literal credential and an environment reference,
   * so a test can prove neither reaches the inventory and neither is resolved
   * (FR-026, FR-027).
   */
  readonly secretManifestPath: string;
  /** The component paths a manifest points at, which no rule may admit. */
  readonly componentPaths: readonly string[];
  /** Paths that look like plugin files but no selector reaches. */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the Codex plugin fixture: one repository carrying both catalog
 * locations, every source form the catalog rule must accept or refuse,
 * and — as a near miss — the root manifest of a plugin this repository
 * publishes.
 */
export function buildCodexPluginFixture(
  prefix = 'inspector-codex-plugins',
  root = createRepositoryFixtureRoot(prefix),
): CodexPluginFixture {
  // The repository publishes a plugin of its own: the manifest a consumer
  // installs from, with the components that plugin ships. No rule reaches it —
  // Codex loads a plugin root a catalog entry or an installation selected, and
  // this repository's own catalogs point elsewhere — so every path written here
  // is a near miss that proves the root is not searched.
  write(
    root,
    '.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'inspector-tools',
        version: '1.4.0',
        description: 'Inspect a repository the way the docs describe it.',
        author: { name: 'Platform team', email: 'platform@example.com' },
        homepage: 'https://example.com/plugins/inspector-tools',
        license: 'MIT',
        keywords: ['inspection', 'docs'],
        skills: './skills/',
        mcpServers: './.mcp.json',
        hooks: './hooks/hooks.json',
        interface: {
          displayName: 'Inspector Tools',
          shortDescription: 'Repository inspection helpers',
          category: 'Productivity',
          capabilities: ['Read'],
        },
      },
      null,
      2,
    )}\n`,
  );
  // Components that plugin ships. None of them is a candidate either: the
  // manifest's values are relationships, never read authority
  // (`codex.excluded.plugin-files`). They accompany a manifest no rule reaches,
  // so nothing lists them at all — the plugin roots a catalog does offer carry
  // their own, below.
  write(root, 'skills/review/SKILL.md', '---\nname: review\n---\n\nReview the diff.\n');
  write(root, 'hooks/hooks.json', `${JSON.stringify({ PreToolUse: [] }, null, 2)}\n`);
  write(root, '.app.json', `${JSON.stringify({ servers: {} }, null, 2)}\n`);

  // The repository catalog at the current exact location, carrying every
  // source form the derivation has to decide about.
  write(
    root,
    '.agents/plugins/marketplace.json',
    `${JSON.stringify(
      {
        name: 'inspector-examples',
        interface: { displayName: 'Inspector Examples' },
        plugins: [
          {
            name: 'release-notes',
            source: { source: 'local', path: './plugins/release-notes' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'changelog-writer',
            source: './plugins/changelog-writer',
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'linked-helper',
            source: { source: 'local', path: './plugins/linked-helper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'renamed-helper',
            source: { source: 'local', path: './plugins/renamed-helper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'absent-plugin',
            source: { source: 'local', path: './plugins/absent-plugin' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'remote-helper',
            source: {
              source: 'git-subdir',
              url: 'https://github.com/example/codex-plugins.git',
              path: './plugins/remote-helper',
              ref: 'main',
            },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'npm-helper',
            source: {
              source: 'npm',
              package: '@example/codex-plugin',
              version: '^1.2.0',
              registry: 'https://registry.npmjs.org',
            },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'absolute-helper',
            source: { source: 'local', path: '/opt/plugins/absolute-helper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'home-helper',
            source: { source: 'local', path: '~/.codex/plugins/home-helper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'escaping-helper',
            source: { source: 'local', path: './../outside/escaping-helper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The legacy-compatible catalog at the second exact location, naming a
  // plugin the current catalog does not.
  write(
    root,
    '.claude-plugin/marketplace.json',
    `${JSON.stringify(
      {
        name: 'inspector-legacy',
        plugins: [
          {
            name: 'secret-keeper',
            source: { source: 'local', path: './plugins/secret-keeper' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          {
            name: 'broken-plugin',
            source: { source: 'local', path: './plugins/broken-plugin' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
          // The name the current catalog also offers, from a plugin root of
          // its own: two catalogs offering one name are two plugins, because
          // the vendor installs each under its own catalog.
          {
            name: 'release-notes',
            source: { source: 'local', path: './plugins/legacy-release-notes' },
            policy: { installation: 'AVAILABLE', authentication: 'ON_INSTALL' },
            category: 'Productivity',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  // The plugin roots the local sources name, each with the required manifest.
  write(
    root,
    'plugins/release-notes/.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'release-notes',
        version: '0.3.1',
        description: 'Draft release notes from merged pull requests.',
        skills: './skills/',
        mcpServers: './.mcp.json',
        hooks: './hooks/hooks.json',
        interface: {
          displayName: 'Release Notes',
          category: 'Productivity',
          logo: './assets/logo.png',
        },
      },
      null,
      2,
    )}\n`,
  );
  // What that plugin actually ships. Its census lists them as the plugin's own
  // files: they are read because they sit in the plugin root, never because the
  // manifest named them, and none of them becomes a candidate of its own
  // (contracts/inspection-path-allowlist.md § Bounded companion census).
  write(
    root,
    'plugins/release-notes/skills/draft/SKILL.md',
    '---\nname: draft\n---\n\nDraft the notes from the merged pull requests.\n',
  );
  write(root, 'plugins/release-notes/skills/draft/reference.md', 'Release note phrasing.\n');
  write(
    root,
    'plugins/release-notes/.mcp.json',
    `${JSON.stringify({ mcpServers: { changelog: { command: 'npx' } } }, null, 2)}\n`,
  );
  write(
    root,
    'plugins/release-notes/hooks/hooks.json',
    `${JSON.stringify({ PreToolUse: [] }, null, 2)}\n`,
  );
  write(root, 'plugins/release-notes/README.md', '# Release Notes\n\nInstall from the catalog.\n');
  write(
    root,
    'plugins/changelog-writer/.codex-plugin/plugin.json',
    `${JSON.stringify(
      { name: 'changelog-writer', version: '2.0.0', description: 'Keep CHANGELOG.md current.' },
      null,
      2,
    )}\n`,
  );
  // The catalog entry and this manifest agree on the name, so the plugin is one
  // row with two carriers.
  write(
    root,
    'plugins/secret-keeper/.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'secret-keeper',
        version: '0.1.0',
        description: 'Bundles an MCP server that needs a token.',
        mcpServers: './.mcp.json',
        interface: {
          displayName: 'Secret Keeper',
          websiteURL: 'https://example.com/?token=sk-live-fixture-not-a-real-secret',
        },
        env: { API_TOKEN: '${CODEX_FIXTURE_TOKEN}' },
      },
      null,
      2,
    )}\n`,
  );
  // The second `release-notes`: a different plugin root, offered by the legacy
  // catalog, which the vendor would install beside the other one.
  write(
    root,
    'plugins/legacy-release-notes/.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'release-notes',
        version: '0.9.0',
        description: 'The release-notes plugin the legacy catalog offers.',
      },
      null,
      2,
    )}\n`,
  );
  // A manifest whose own `name` differs from the entry that reached it: the
  // vendor documents the manifest `name` as the plugin identifier and never
  // says what happens when a catalog calls the same plugin something else, so
  // each declared name is its own row carrying the file that declared it, and
  // no winner is invented (FR-009).
  write(
    root,
    'plugins/renamed-helper/.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'renamed-helper-v2',
        version: '2.1.0',
        description: 'Renamed in the manifest without updating the catalog entry.',
      },
      null,
      2,
    )}\n`,
  );
  // Malformed JSON: a trailing comma the vendor's own strict reader rejects.
  write(
    root,
    'plugins/broken-plugin/.codex-plugin/plugin.json',
    '{\n  "name": "broken-plugin",\n  "version": "0.0.1",\n}\n',
  );
  // A plugin root reached through a symbolic link inside the repository. The
  // link is materialized through the shared helper, because a platform without
  // link support is a platform this fixture still has to build on: when the
  // link cannot be made, the linked plugin is simply not part of the tree the
  // builder describes.
  const linkedRootAvailable = tryMaterializeSymlinks(
    root,
    () => {
      write(
        root,
        'plugins/linked-target/.codex-plugin/plugin.json',
        `${JSON.stringify({ name: 'linked-helper', version: '0.2.0' }, null, 2)}\n`,
      );
    },
    () => {
      symlinkSync('linked-target', join(root, 'plugins/linked-helper'), 'dir');
    },
    ['plugins/linked-helper'],
  );

  // Further near misses: a manifest one directory below the root, a catalog
  // there too, and a manifest spelled with another extension.
  write(
    root,
    'packages/api/.codex-plugin/plugin.json',
    `${JSON.stringify({ name: 'nested-plugin' }, null, 2)}\n`,
  );
  write(
    root,
    'packages/api/.agents/plugins/marketplace.json',
    `${JSON.stringify({ name: 'nested-catalog', plugins: [] }, null, 2)}\n`,
  );
  write(root, '.codex-plugin/plugin.jsonc', '{\n  // not the required entry point\n}\n');

  return {
    root,
    expectedPluginPaths: ['.agents/plugins/marketplace.json', '.claude-plugin/marketplace.json'],
    catalogPath: '.agents/plugins/marketplace.json',
    objectSourceManifestPath: 'plugins/release-notes/.codex-plugin/plugin.json',
    stringSourceManifestPath: 'plugins/changelog-writer/.codex-plugin/plugin.json',
    divergentNameManifestPath: 'plugins/renamed-helper/.codex-plugin/plugin.json',
    legacyCatalogManifestPath: 'plugins/legacy-release-notes/.codex-plugin/plugin.json',
    linkedManifestPath: linkedRootAvailable
      ? 'plugins/linked-helper/.codex-plugin/plugin.json'
      : null,
    nonLocalPluginNames: [
      'absolute-helper',
      'escaping-helper',
      'home-helper',
      'npm-helper',
      'remote-helper',
    ],
    malformedManifestPath: 'plugins/broken-plugin/.codex-plugin/plugin.json',
    secretManifestPath: 'plugins/secret-keeper/.codex-plugin/plugin.json',
    componentPaths: ['skills/review/SKILL.md', 'hooks/hooks.json', '.app.json'],
    nearMissPaths: [
      // The repository's own published plugin: the exact manifest path, at the
      // one depth a root-anchored rule would have matched.
      '.codex-plugin/plugin.json',
      'packages/api/.codex-plugin/plugin.json',
      'packages/api/.agents/plugins/marketplace.json',
      '.codex-plugin/plugin.jsonc',
    ],
  };
}

/**
 * One built Claude plugin fixture repository (T774): both carriers this vendor
 * admits — the skills-directory manifest a folder is made a plugin by, and the
 * repository's own catalog — with the plugin roots their entries name, the
 * sources that name none, and the near misses that must stay unadmitted.
 */
export interface ClaudePluginFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the Claude plugin rules admit: the catalog, and
   * one manifest per skills-directory plugin. A plugin's own files — including
   * the optional manifest below a catalog's local root — are read from the
   * plugin root and published as the plugin's files, never as candidates of
   * their own (contracts/inspection-path-allowlist.md § Bounded companion
   * census).
   */
  readonly expectedPluginPaths: readonly string[];
  /** The catalog whose entries name every source form this fixture covers. */
  readonly catalogPath: string;
  /** The manifest that makes `.claude/skills/release-notes/` a plugin. */
  readonly skillsDirectoryManifestPath: string;
  /** The name that plugin is addressed by: the folder, qualified by the vendor's own word. */
  readonly skillsDirectoryPluginName: string;
  /** A skills-directory folder with a `SKILL.md` and no manifest: a skill, never a plugin. */
  readonly plainSkillPath: string;
  /** The optional manifest inside the plugin root a `./` entry names. */
  readonly pathSourceManifestPath: string;
  /**
   * The manifest inside the root a bare-name entry names, which resolves only
   * under the catalog's own `metadata.pluginRoot`.
   */
  readonly bareNameManifestPath: string;
  /** The plugin root a catalog entry names but that ships no manifest at all. */
  readonly manifestlessRootFilePath: string;
  /**
   * The plugin names whose entries name a place outside this repository —
   * every documented remote form, a relative path leaving the root, and the
   * spellings this vendor documents nowhere.
   */
  readonly nonLocalPluginNames: readonly string[];
  /**
   * A manifest whose JSON no reader accepts, below a catalog's local root.
   * Nothing parses it — a plugin's own files are published as the files they
   * are — so it is an ordinary published file of the plugin that ships it.
   */
  readonly malformedManifestPath: string;
  /**
   * The manifest declaring a literal credential and an environment reference,
   * so a test can prove neither is resolved (FR-026, FR-027).
   */
  readonly secretManifestPath: string;
  /** The component paths a manifest points at, which no rule may admit. */
  readonly componentPaths: readonly string[];
  /** Paths that look like plugin files but no selector reaches. */
  readonly nearMissPaths: readonly string[];
  /**
   * The near miss that sits inside a plugin root: a manifest one directory
   * deeper than the anchored selector reaches is no plugin of its own, and is
   * still one of the files the plugin whose root holds it ships — admission and
   * reading are different questions (contracts/inspection-path-allowlist.md
   * § Bounded companion census).
   */
  readonly nearMissInsidePluginRootPath: string;
}

/**
 * Builds the Claude plugin fixture: one repository carrying a skills-directory
 * plugin beside a plain skill, the repository's own catalog, every source form
 * the catalog rule must accept or refuse, and the near misses that prove the
 * root is not searched for manifests.
 */
export function buildClaudePluginFixture(
  prefix = 'inspector-claude-plugins',
  root = createRepositoryFixtureRoot(prefix),
): ClaudePluginFixture {
  // The one plugin Claude loads by placement: a folder under the skills
  // directory carrying the manifest, loaded as `<folder>@skills-dir` with no
  // marketplace and no install step.
  write(
    root,
    '.claude/skills/release-notes/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'release-notes',
        version: '0.3.1',
        description: 'Draft release notes from merged pull requests.',
        author: { name: 'Platform team', email: 'platform@example.com' },
        homepage: 'https://example.com/plugins/release-notes',
        license: 'MIT',
        keywords: ['release', 'changelog'],
        skills: './skills/',
        hooks: './hooks/hooks.json',
        mcpServers: './.mcp.json',
      },
      null,
      2,
    )}\n`,
  );
  // What that plugin ships. None of it is a candidate: the manifest's values
  // are relationships, never read authority (`claude.excluded.plugin-files`),
  // and these files are published because they sit in the plugin's own root.
  write(
    root,
    '.claude/skills/release-notes/skills/draft/SKILL.md',
    '---\nname: draft\ndescription: Draft the notes for a release.\n---\n\nDraft the notes.\n',
  );
  write(
    root,
    '.claude/skills/release-notes/hooks/hooks.json',
    `${JSON.stringify({ hooks: { SessionStart: [] } }, null, 2)}\n`,
  );
  write(
    root,
    '.claude/skills/release-notes/.mcp.json',
    `${JSON.stringify({ mcpServers: { notes: { command: 'notes-server' } } }, null, 2)}\n`,
  );
  write(root, '.claude/skills/release-notes/README.md', '# Release notes plugin\n');
  // A plain skill beside it: the same directory tree, no manifest, so it is a
  // skill and never a plugin.
  write(
    root,
    '.claude/skills/greet/SKILL.md',
    '---\nname: greet\ndescription: Greet a teammate.\n---\n\nSay hello.\n',
  );

  // The repository's own catalog, at the location the vendor documents.
  write(
    root,
    '.claude-plugin/marketplace.json',
    `${JSON.stringify(
      {
        name: 'inspector-examples',
        owner: { name: 'Platform team', email: 'platform@example.com' },
        // The directory bare plugin names resolve under, which is what makes
        // the bare-name spelling below a path at all.
        metadata: { pluginRoot: './plugins' },
        plugins: [
          {
            name: 'quality-review',
            source: './plugins/quality-review',
            description: 'Adds a quality-review skill for quick code reviews.',
            category: 'Productivity',
          },
          // The bare-name spelling of the same local form.
          { name: 'changelog-writer', source: 'changelog-writer' },
          // A local root the repository carries that ships no manifest: the
          // page makes the manifest optional, so the entry still declares a
          // plugin and the root still holds its files.
          { name: 'bare-helper', source: './plugins/bare-helper' },
          // A root this repository does not carry: the offering stands and
          // occupies nothing here.
          { name: 'missing-helper', source: './plugins/missing-helper' },
          // The manifest below this one is not JSON any reader accepts.
          { name: 'broken-plugin', source: './plugins/broken-plugin' },
          // Credentials and environment references stay exactly as written.
          { name: 'secret-keeper', source: './plugins/secret-keeper' },
          // One entry per documented form that names a place outside this
          // repository, so every member of the published classification has a
          // row to be read on.
          { name: 'github-helper', source: { source: 'github', repo: 'owner/plugin-repo' } },
          { name: 'git-helper', source: { source: 'url', url: 'https://example.com/p.git' } },
          {
            name: 'subdir-helper',
            source: {
              source: 'git-subdir',
              url: 'https://example.com/monorepo.git',
              path: 'tools/claude-plugin',
            },
          },
          { name: 'npm-helper', source: { source: 'npm', package: '@example/plugin' } },
          {
            name: 'archive-helper',
            source: { source: 'archive', url: 'https://example.com/plugins/helper-2.1.0.zip' },
          },
          { name: 'command-helper', source: { source: 'command', command: 'render-plugin' } },
          // A documented relative path that leaves this repository.
          { name: 'escaping-helper', source: './../outside/escaping' },
          // Spellings this vendor documents nowhere: a `/`-carrying string
          // with no `./` prefix, an absolute path, and a home path.
          { name: 'remote-helper', source: 'owner/repo' },
          { name: 'absolute-helper', source: '/opt/plugins/absolute' },
          { name: 'home-helper', source: '~/.claude/plugins/home' },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The plugin roots those entries name, each with the files it ships.
  write(
    root,
    'plugins/quality-review/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'quality-review',
        version: '1.2.0',
        description: 'Review a change against the team checklist.',
        skills: './skills/',
        agents: './agents/',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/quality-review/skills/checklist/SKILL.md',
    '---\nname: checklist\ndescription: Walk the review checklist.\n---\n\nWalk the checklist.\n',
  );
  write(root, 'plugins/quality-review/agents/reviewer.md', '---\nname: reviewer\n---\n\nReview.\n');
  write(
    root,
    'plugins/changelog-writer/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'changelog-writer', version: '0.9.0' }, null, 2)}\n`,
  );
  // A root with no manifest at all: the files are still the plugin's.
  write(root, 'plugins/bare-helper/commands/summarize.md', '# Summarize\n');
  write(
    root,
    'plugins/broken-plugin/.claude-plugin/plugin.json',
    '{\n  "name": "broken-plugin",\n  "version": "0.0.1",\n}\n',
  );
  write(
    root,
    'plugins/secret-keeper/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'secret-keeper',
        version: '0.1.0',
        description: 'Bundles an MCP server that needs a token.',
        mcpServers: './.mcp.json',
        env: { API_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
        interface: { websiteURL: `https://example.com/?token=${FIXTURE_SECRET_LITERAL}` },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/secret-keeper/.mcp.json',
    `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
  );

  // Near misses. A manifest at the repository's own root is the plugin this
  // repository publishes, which no rule reaches; a manifest one directory below
  // a skills directory, and one under a nested `.claude/skills`, are paths the
  // anchored selector does not admit.
  write(
    root,
    '.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'inspector-tools', version: '1.4.0' }, null, 2)}\n`,
  );
  write(
    root,
    '.claude/skills/release-notes/nested/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'nested-plugin' }, null, 2)}\n`,
  );
  write(
    root,
    'packages/api/.claude/skills/api-tools/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'api-tools' }, null, 2)}\n`,
  );
  write(root, 'packages/api/.claude-plugin/marketplace.json', `${JSON.stringify({}, null, 2)}\n`);

  return {
    root,
    expectedPluginPaths: [
      '.claude-plugin/marketplace.json',
      '.claude/skills/release-notes/.claude-plugin/plugin.json',
    ],
    catalogPath: '.claude-plugin/marketplace.json',
    skillsDirectoryManifestPath: '.claude/skills/release-notes/.claude-plugin/plugin.json',
    skillsDirectoryPluginName: 'release-notes@skills-dir',
    plainSkillPath: '.claude/skills/greet/SKILL.md',
    pathSourceManifestPath: 'plugins/quality-review/.claude-plugin/plugin.json',
    bareNameManifestPath: 'plugins/changelog-writer/.claude-plugin/plugin.json',
    manifestlessRootFilePath: 'plugins/bare-helper/commands/summarize.md',
    nonLocalPluginNames: [
      'absolute-helper',
      'archive-helper',
      'command-helper',
      'escaping-helper',
      'git-helper',
      'github-helper',
      'home-helper',
      'missing-helper',
      'npm-helper',
      'remote-helper',
      'subdir-helper',
    ],
    malformedManifestPath: 'plugins/broken-plugin/.claude-plugin/plugin.json',
    secretManifestPath: 'plugins/secret-keeper/.claude-plugin/plugin.json',
    componentPaths: [
      '.claude/skills/release-notes/skills/draft/SKILL.md',
      '.claude/skills/release-notes/hooks/hooks.json',
      '.claude/skills/release-notes/.mcp.json',
    ],
    nearMissPaths: [
      '.claude-plugin/plugin.json',
      '.claude/skills/release-notes/nested/.claude-plugin/plugin.json',
      'packages/api/.claude/skills/api-tools/.claude-plugin/plugin.json',
      'packages/api/.claude-plugin/marketplace.json',
    ],
    nearMissInsidePluginRootPath: '.claude/skills/release-notes/nested/.claude-plugin/plugin.json',
  };
}

/**
 * One built Copilot plugin fixture repository (T797): the four catalog
 * locations this vendor checks, the plugin roots their entries name, the four
 * manifest forms a root may use, and the near misses that must stay unadmitted
 * — a manifest at the repository's own root among them.
 */
export interface CopilotPluginFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the Copilot plugin rule admits: the four catalog
   * locations, and nothing else. A plugin's own files — its manifest included —
   * are read from the plugin root a catalog entry names and published as the
   * plugin's files, never as candidates of their own.
   */
  readonly expectedPluginPaths: readonly string[];
  /** The catalog whose entries name every source form this fixture covers. */
  readonly catalogPath: string;
  /** The three other documented catalog locations, each carrying a catalog of its own. */
  readonly otherCatalogPaths: readonly string[];
  /** The manifest of the root a `./` entry names, in the first documented form. */
  readonly legacyFormManifestPath: string;
  /** The manifest of a root that uses the plain `plugin.json` form instead. */
  readonly rootFormManifestPath: string;
  /** The manifest of a root that uses the `.claude-plugin/` form Copilot also reads. */
  readonly claudeFormManifestPath: string;
  /** The plugin names whose entries name a source outside this repository. */
  readonly nonLocalPluginNames: readonly string[];
  /**
   * The manifest declaring a literal credential and an environment reference,
   * so a test can prove neither is resolved (FR-026, FR-027).
   */
  readonly secretManifestPath: string;
  /** The component paths a manifest points at, which no rule may admit. */
  readonly componentPaths: readonly string[];
  /** The CLI extension file `copilot.excluded.cli-extensions` keeps out. */
  readonly extensionPath: string;
  /** Paths that look like plugin files but no selector reaches. */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the Copilot plugin fixture: one repository carrying all four catalog
 * locations, plugin roots that use three of the four manifest forms, every
 * source form the catalog rule must accept or refuse, an experimental CLI
 * extension, and the near misses that prove the root is not searched.
 */
export function buildCopilotPluginFixture(
  prefix = 'inspector-copilot-plugins',
  root = createRepositoryFixtureRoot(prefix),
): CopilotPluginFixture {
  // The catalog at the first documented location, naming every source form.
  write(
    root,
    'marketplace.json',
    `${JSON.stringify(
      {
        name: 'inspector-examples',
        owner: { name: 'Platform team', email: 'platform@example.com' },
        plugins: [
          {
            name: 'quality-review',
            source: './plugins/quality-review',
            description: 'Adds a quality-review skill for quick code reviews.',
          },
          { name: 'changelog-writer', source: './plugins/changelog-writer' },
          // A root that uses the Claude manifest form Copilot also reads.
          { name: 'release-notes', source: './plugins/release-notes' },
          { name: 'secret-keeper', source: './plugins/secret-keeper' },
          // A root this repository does not carry.
          { name: 'missing-helper', source: './plugins/missing-helper' },
          // The two object forms this vendor documents.
          {
            name: 'github-helper',
            source: { source: 'github', repo: 'octo-org/plugin-repo', ref: 'v1.0.0' },
          },
          { name: 'git-helper', source: { source: 'url', url: 'https://example.com/p.git' } },
          // A documented relative path that leaves this repository.
          { name: 'escaping-helper', source: './../outside/escaping' },
          // A string entry source is a path here, never a repository
          // shorthand: this one names a directory the repository does not
          // carry, which is a different absence from a form the vendor does
          // not document.
          { name: 'shorthand-helper', source: 'octo-org/plugin-repo' },
          // Spellings this vendor documents nowhere: an npm package and an
          // absolute path.
          { name: 'npm-helper', source: { source: 'npm', package: '@example/plugin' } },
          { name: 'absolute-helper', source: '/opt/plugins/absolute' },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The other three documented catalog locations. Two of them publish one
  // marketplace: a repository that kept the catalog where the legacy client
  // reads it and where the current one does, which is what a team migrating
  // between the documented locations has. They have drifted — the legacy copy
  // still names the vendored snapshot taken before the plugin moved under
  // `plugins/` — so one plugin name is carried by two files naming two
  // directories, which is what the plugin comparison compares.
  for (const [path, name, source] of [
    ['.plugin/marketplace.json', 'inspector-shared', './vendor/shared'],
    ['.github/plugin/marketplace.json', 'inspector-github', './plugins/shared'],
    ['.claude-plugin/marketplace.json', 'inspector-shared', './plugins/shared'],
  ] as const) {
    write(
      root,
      path,
      `${JSON.stringify(
        {
          name,
          plugins: [
            {
              name: 'shared-helper',
              description: 'Shares the review checklist across repositories.',
              version: source === './vendor/shared' ? '1.3.0' : '1.4.0',
              source,
            },
          ],
        },
        null,
        2,
      )}\n`,
    );
  }
  write(
    root,
    'plugins/shared/plugin.json',
    `${JSON.stringify({ name: 'shared-helper', version: '1.4.0' }, null, 2)}\n`,
  );
  write(
    root,
    'plugins/shared/skills/review/SKILL.md',
    '---\nname: review\ndescription: Share the review checklist.\n---\n\nWalk the checklist.\n',
  );
  // The vendored snapshot the legacy catalog still names: the same files one
  // version back, with one the current copy no longer ships.
  write(
    root,
    'vendor/shared/plugin.json',
    `${JSON.stringify({ name: 'shared-helper', version: '1.3.0' }, null, 2)}\n`,
  );
  write(
    root,
    'vendor/shared/skills/review/SKILL.md',
    '---\nname: review\ndescription: Share the review checklist.\n---\n\nWalk the checklist, then note the reviewer.\n',
  );
  write(root, 'vendor/shared/NOTICE.md', '# Vendored copy\n\nTaken at 1.3.0.\n');

  // Plugin roots, each using a different one of the documented manifest forms.
  write(
    root,
    'plugins/quality-review/.plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'quality-review',
        version: '1.2.0',
        description: 'Review a change against the team checklist.',
        skills: './skills/',
        agents: './agents/',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/quality-review/skills/checklist/SKILL.md',
    '---\nname: checklist\ndescription: Walk the review checklist.\n---\n\nWalk the checklist.\n',
  );
  write(
    root,
    'plugins/quality-review/agents/reviewer.agent.md',
    '---\nname: reviewer\n---\n\nReview the diff.\n',
  );
  write(
    root,
    'plugins/changelog-writer/plugin.json',
    `${JSON.stringify(
      {
        $schema: 'https://agent-plugins.org/schemas/1.0.0/plugin.schema.json',
        name: 'changelog-writer',
        version: '0.9.0',
        description: 'Turn merged pull requests into a changelog entry.',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/release-notes/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'release-notes', version: '0.3.1' }, null, 2)}\n`,
  );
  write(
    root,
    'plugins/secret-keeper/plugin.json',
    `${JSON.stringify(
      {
        name: 'secret-keeper',
        version: '0.1.0',
        description: 'Bundles an MCP server that needs a token.',
        env: { API_TOKEN: FIXTURE_ENVIRONMENT_REFERENCE },
        homepage: `https://example.com/?token=${FIXTURE_SECRET_LITERAL}`,
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/secret-keeper/.mcp.json',
    `${JSON.stringify({ mcpServers: {} }, null, 2)}\n`,
  );

  // The CLI's experimental project extension: executable JavaScript the
  // exclusion keeps out of the plugin kind entirely.
  write(
    root,
    '.github/extensions/formatter/extension.mjs',
    'export function activate() {\n  return { name: "formatter" };\n}\n',
  );

  // Near misses. A manifest at the repository's own root is the plugin this
  // repository publishes, and a catalog one directory below the root is a path
  // the anchored selectors do not reach.
  write(root, 'plugin.json', `${JSON.stringify({ name: 'inspector-tools' }, null, 2)}\n`);
  write(
    root,
    'packages/api/marketplace.json',
    `${JSON.stringify({ name: 'nested', plugins: [] }, null, 2)}\n`,
  );
  write(root, 'marketplace.jsonc', '{\n  // not the documented form\n}\n');

  return {
    root,
    expectedPluginPaths: [
      'marketplace.json',
      '.plugin/marketplace.json',
      '.github/plugin/marketplace.json',
      '.claude-plugin/marketplace.json',
    ],
    catalogPath: 'marketplace.json',
    otherCatalogPaths: [
      '.plugin/marketplace.json',
      '.github/plugin/marketplace.json',
      '.claude-plugin/marketplace.json',
    ],
    legacyFormManifestPath: 'plugins/quality-review/.plugin/plugin.json',
    rootFormManifestPath: 'plugins/changelog-writer/plugin.json',
    claudeFormManifestPath: 'plugins/release-notes/.claude-plugin/plugin.json',
    nonLocalPluginNames: [
      'absolute-helper',
      'escaping-helper',
      'git-helper',
      'github-helper',
      'missing-helper',
      'npm-helper',
      'shorthand-helper',
    ],
    secretManifestPath: 'plugins/secret-keeper/plugin.json',
    componentPaths: [
      'plugins/quality-review/skills/checklist/SKILL.md',
      'plugins/quality-review/agents/reviewer.agent.md',
      'plugins/secret-keeper/.mcp.json',
    ],
    extensionPath: '.github/extensions/formatter/extension.mjs',
    nearMissPaths: ['plugin.json', 'packages/api/marketplace.json', 'marketplace.jsonc'],
  };
}

/**
 * One built unified plugin fixture repository (T818): one repository whose
 * plugins reach it every way the three products document, including the one
 * catalog file all three read.
 *
 * The point of this tree is the cross-product view: a plugin name is one row
 * however many products resolve it, and one physical file is read once however
 * many of them recognize it (data-model.md § Inventory unit).
 */
/**
 * What {@link buildPluginComparisonFixture} writes: one plugin name offered by
 * two catalogs, which is what a repository publishing the same marketplace for
 * two products has, plus a second name only one catalog offers.
 */
export interface PluginComparisonFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The catalog Claude reads, and Codex and Copilot with it. */
  readonly claudeCatalogPath: string;
  /** The catalog at the location Codex reads for a repository's own plugins. */
  readonly codexCatalogPath: string;
  /** The name both catalogs offer, whose row therefore holds two carriers. */
  readonly sharedPluginName: string;
  /** The name only one catalog offers, whose row holds one carrier. */
  readonly singleCarrierPluginName: string;
  /** The literal credential one catalog entry writes, which must render as authored. */
  readonly credential: string;
  /** The environment reference the other entry writes, which is never resolved. */
  readonly environmentReference: string;
}

export interface UnifiedPluginFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The catalog at the one location all three products read. */
  readonly sharedCatalogPath: string;
  /** The name the shared catalog's local entry resolves, the same for every product. */
  readonly sharedPluginName: string;
  /** The Codex-only catalog location, and the name its entry resolves. */
  readonly codexCatalogPath: string;
  /** The name the Codex-only catalog's entry resolves. */
  readonly codexPluginName: string;
  /** The Copilot-only catalog location. */
  readonly copilotCatalogPath: string;
  /** The name the Copilot-only catalog's entry resolves. */
  readonly copilotPluginName: string;
  /** The manifest that makes a skills-directory folder a Claude plugin. */
  readonly skillsDirectoryManifestPath: string;
  /** The name that placement-loaded plugin is addressed by. */
  readonly skillsDirectoryPluginName: string;
  /**
   * The cross-tool plugin root the shared catalog names, with the files it
   * ships: two manifest forms, a bundled skill, a hook file, and an MCP
   * configuration file no MCP rule reaches.
   */
  readonly sharedPluginFiles: readonly string[];
  /**
   * The manifest whose `mcpServers` is an inline map rather than a path, so a
   * test can prove that an MCP-shaped value inside a plugin's own file joins no
   * MCP row (data-model.md § Inventory unit).
   */
  readonly inlineMcpManifestPath: string;
  /** The plugin name whose catalog entry names a source outside this repository. */
  readonly nonLocalPluginName: string;
}

/**
 * Builds the unified plugin fixture: one repository carrying the catalog all
 * three products read, each product's own catalog location, a placement-loaded
 * Claude plugin, and a cross-tool plugin root that ships two manifest forms.
 */
/**
 * A repository that publishes one marketplace to two products: the same
 * catalog is kept at the location Claude documents for a repository's own
 * catalog — which Codex and Copilot read too — and at the one Codex reads for
 * a repository's own plugins. Two files, one marketplace name, one plugin
 * name: the row has two carriers, and comparing them is what says whether the
 * copies still agree. They deliberately do not. The Codex-side entry is a
 * version behind, describes the plugin differently, and carries an extra key,
 * and it still names the vendored snapshot the team took before the plugin
 * moved under `plugins/` — so the two copies differ file by file as well, one
 * of them shipping a file the other does not.
 *
 * Values that must survive a comparison exactly as authored ride along: a
 * literal credential in a homepage query and an environment reference in an
 * `env` map, neither masked nor resolved anywhere (FR-026, FR-027).
 */
export function buildPluginComparisonFixture(
  prefix = 'inspector-plugin-comparison',
  root = createRepositoryFixtureRoot(prefix),
): PluginComparisonFixture {
  const credential = 'ghp_review_assistant_fixture_not_a_real_secret';
  const environmentReference = '${REVIEW_ASSISTANT_TOKEN}';
  const claudeCatalogPath = '.claude-plugin/marketplace.json';
  const codexCatalogPath = '.agents/plugins/marketplace.json';
  // The copy the editors read: current version, and the plugin's own
  // description.
  write(
    root,
    claudeCatalogPath,
    `${JSON.stringify(
      {
        name: 'acme-tools',
        owner: { name: 'Acme platform team', email: 'platform@acme.example' },
        metadata: { description: 'Plugins the platform team maintains', version: '3.2.0' },
        plugins: [
          {
            name: 'review-assistant',
            description: 'Reviews a diff against the team checklist.',
            version: '2.1.0',
            source: './plugins/review-assistant',
            homepage: `https://acme.example/plugins/review-assistant?token=${credential}`,
            env: { REVIEW_TOKEN: environmentReference },
          },
          {
            name: 'changelog-writer',
            description: 'Drafts the release notes for a milestone.',
            version: '1.4.0',
            source: './plugins/changelog-writer',
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The copy kept where Codex reads: a version behind, a description that was
  // edited on one side only, a key the other copy does not carry, and a
  // source still pointing at the vendored snapshot the team took before the
  // plugin moved under `plugins/`.
  write(
    root,
    codexCatalogPath,
    `${JSON.stringify(
      {
        name: 'acme-tools',
        owner: { name: 'Acme platform team', email: 'platform@acme.example' },
        metadata: { description: 'Plugins the platform team maintains', version: '3.2.0' },
        plugins: [
          {
            name: 'review-assistant',
            description: 'Reviews a pull request against the team checklist.',
            version: '2.0.0',
            source: './vendor/review-assistant',
            homepage: `https://acme.example/plugins/review-assistant?token=${credential}`,
            env: { REVIEW_TOKEN: environmentReference },
            keywords: ['review', 'checklist'],
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The root both entries name, with the manifest each product's client reads
  // and the skill the plugin ships.
  write(
    root,
    'plugins/review-assistant/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'review-assistant',
        version: '2.1.0',
        description: 'Reviews a diff against the team checklist.',
        skills: './skills/',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/review-assistant/.codex-plugin/plugin.json',
    `${JSON.stringify({ name: 'review-assistant', version: '2.0.0' }, null, 2)}\n`,
  );
  write(
    root,
    'plugins/review-assistant/skills/checklist/SKILL.md',
    '---\nname: checklist\ndescription: Walk the review checklist.\n---\n\nWalk the checklist.\n',
  );
  // The vendored snapshot the other catalog still points at: the same files
  // one version back, with one the current copy no longer ships.
  write(
    root,
    'vendor/review-assistant/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'review-assistant',
        version: '2.0.0',
        description: 'Reviews a pull request against the team checklist.',
        skills: './skills/',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'vendor/review-assistant/.codex-plugin/plugin.json',
    `${JSON.stringify({ name: 'review-assistant', version: '2.0.0' }, null, 2)}\n`,
  );
  write(
    root,
    'vendor/review-assistant/skills/checklist/SKILL.md',
    '---\nname: checklist\ndescription: Walk the review checklist.\n---\n\nWalk the checklist, then note the reviewer.\n',
  );
  write(root, 'vendor/review-assistant/NOTICE.md', '# Vendored copy\n\nTaken at 2.0.0.\n');
  write(
    root,
    'plugins/changelog-writer/.claude-plugin/plugin.json',
    `${JSON.stringify({ name: 'changelog-writer', version: '1.4.0' }, null, 2)}\n`,
  );
  return {
    root,
    claudeCatalogPath,
    codexCatalogPath,
    sharedPluginName: 'review-assistant@acme-tools',
    singleCarrierPluginName: 'changelog-writer@acme-tools',
    credential,
    environmentReference,
  };
}

export function buildUnifiedPluginFixture(
  prefix = 'inspector-unified-plugins',
  root = createRepositoryFixtureRoot(prefix),
): UnifiedPluginFixture {
  // The one catalog location all three read: Codex's legacy-compatible
  // location, where Claude documents a repository's own catalog, and the
  // fourth form Copilot checks.
  write(
    root,
    '.claude-plugin/marketplace.json',
    `${JSON.stringify(
      {
        name: 'shared-tools',
        owner: { name: 'Platform team', email: 'platform@example.com' },
        plugins: [
          {
            name: 'formatter',
            source: './plugins/formatter',
            description: 'Formats a diff the way the team writes it.',
          },
          { name: 'remote-linter', source: { source: 'url', url: 'https://example.com/lint.git' } },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The cross-tool plugin root that catalog names: it ships a manifest in each
  // form the products that read this catalog look for, plus its components.
  write(
    root,
    'plugins/formatter/.codex-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'formatter',
        version: '2.0.0',
        description: 'Formats a diff the way the team writes it.',
        skills: './skills/',
        hooks: './hooks/hooks.json',
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/formatter/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'formatter',
        version: '2.0.0',
        // An inline map rather than a path: an MCP-shaped value inside a
        // plugin's own file is that file's content and joins no MCP row.
        mcpServers: { formatter: { command: 'formatter-server', args: ['--stdio'] } },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/formatter/skills/format/SKILL.md',
    '---\nname: format\ndescription: Format the staged diff.\n---\n\nFormat the diff.\n',
  );
  write(
    root,
    'plugins/formatter/hooks/hooks.json',
    `${JSON.stringify({ hooks: { PreToolUse: [] } }, null, 2)}\n`,
  );
  write(
    root,
    'plugins/formatter/.mcp.json',
    `${JSON.stringify({ mcpServers: { formatter: { command: 'formatter-server' } } }, null, 2)}\n`,
  );

  // Codex's own catalog location, offering a plugin of its own.
  write(
    root,
    '.agents/plugins/marketplace.json',
    `${JSON.stringify(
      {
        name: 'codex-tools',
        plugins: [{ name: 'release-notes', source: './plugins/release-notes' }],
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/release-notes/.codex-plugin/plugin.json',
    `${JSON.stringify({ name: 'release-notes', version: '0.4.0' }, null, 2)}\n`,
  );

  // Copilot's first catalog location, offering another.
  write(
    root,
    'marketplace.json',
    `${JSON.stringify(
      {
        name: 'copilot-tools',
        plugins: [{ name: 'pr-summary', source: './plugins/pr-summary' }],
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    'plugins/pr-summary/plugin.json',
    `${JSON.stringify({ name: 'pr-summary', version: '1.1.0' }, null, 2)}\n`,
  );

  // The one plugin a product loads by placement alone.
  write(
    root,
    '.claude/skills/changelog/.claude-plugin/plugin.json',
    `${JSON.stringify(
      { name: 'changelog', version: '0.2.0', description: 'Keep the changelog current.' },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.claude/skills/changelog/skills/entry/SKILL.md',
    '---\nname: entry\ndescription: Add a changelog entry.\n---\n\nAdd an entry.\n',
  );
  // A plain skill beside it, so the skills inventory keeps its own row.
  write(
    root,
    '.claude/skills/greet/SKILL.md',
    '---\nname: greet\ndescription: Greet a teammate.\n---\n\nSay hello.\n',
  );

  return {
    root,
    sharedCatalogPath: '.claude-plugin/marketplace.json',
    sharedPluginName: 'formatter@shared-tools',
    codexCatalogPath: '.agents/plugins/marketplace.json',
    codexPluginName: 'release-notes@codex-tools',
    copilotCatalogPath: 'marketplace.json',
    copilotPluginName: 'pr-summary@copilot-tools',
    skillsDirectoryManifestPath: '.claude/skills/changelog/.claude-plugin/plugin.json',
    skillsDirectoryPluginName: 'changelog@skills-dir',
    sharedPluginFiles: [
      'plugins/formatter/.claude-plugin/plugin.json',
      'plugins/formatter/.codex-plugin/plugin.json',
      'plugins/formatter/.mcp.json',
      'plugins/formatter/hooks/hooks.json',
      'plugins/formatter/skills/format/SKILL.md',
    ],
    inlineMcpManifestPath: 'plugins/formatter/.claude-plugin/plugin.json',
    nonLocalPluginName: 'remote-linter@shared-tools',
  };
}

/** One built output-style fixture repository (T658). */
export interface ClaudeOutputStyleFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the `claude.repo.output-style` allowlist must
   * admit, sorted exactly as the scan publishes them.
   */
  readonly expectedStylePaths: readonly string[];
  /**
   * The style names the inventory must publish, sorted, one row each: the
   * frontmatter `name` where a file sets one, the file name without `.md`
   * otherwise.
   */
  readonly expectedStyleNames: readonly string[];
  /**
   * The two files that resolve to one style name from two project layers,
   * which the vendor resolves by proximity to a working directory this
   * product never observes. Only the selected root's own layer is admitted,
   * so the second is a near miss rather than a second definition.
   */
  readonly duplicateNamePath: string;
  /**
   * The style file whose frontmatter is malformed YAML: its extraction fails
   * all-or-nothing while the complete source stays displayed (FR-028).
   */
  readonly malformedStylePath: string;
  /**
   * The style file whose body holds a literal credential and an environment
   * reference, so a test can prove neither reaches the inventory and neither
   * is resolved (FR-026, FR-027).
   */
  readonly secretStylePath: string;
  /**
   * Paths no shipped rule of any product may admit: the nested project layers
   * the vendor documents but this Source boundary excludes, the spelling
   * variants one step from the selector's literals, and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the Claude output-style fixture (T658): direct Markdown children of
 * the selected root's `.claude/output-styles/`, the nested project layers that
 * are near misses at this Source boundary, a declared-name style beside
 * file-named ones, a duplicate name across layers, malformed frontmatter, and
 * a credential-bearing body.
 *
 * The admitted files are written as styles an author would actually ship, so
 * the fixture reads as a repository rather than as a test matrix.
 */
export function buildClaudeOutputStyleFixture(
  prefix = 'inspector-claude-output-styles',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeOutputStyleFixture {
  // A declared name that differs from the file name: the row is `Diagrams
  // first`, which is what the settings picker shows, and the file is
  // `diagrams.md`.
  write(
    root,
    '.claude/output-styles/diagrams.md',
    [
      '---',
      'name: Diagrams first',
      'description: Lead every explanation with a diagram',
      'keep-coding-instructions: true',
      '---',
      '',
      'When explaining code, architecture, or data flow, start with a Mermaid diagram',
      'showing the structure, then explain in prose.',
      '',
      '## Diagram conventions',
      '',
      'Use `flowchart TD` for control flow and `sequenceDiagram` for request paths.',
      'Keep diagrams under 15 nodes.',
      '',
    ].join('\n'),
  );
  // No `name` key: the file name is the style name, which is the vendor's
  // documented fallback.
  write(
    root,
    '.claude/output-styles/code-review.md',
    [
      '---',
      'description: Review changes as a staff engineer would',
      'keep-coding-instructions: true',
      '---',
      '',
      'Open with the one change that matters most, then the rest in descending order of',
      'consequence. Name the failure a defect would cause before naming the fix.',
      '',
      '## What not to raise',
      '',
      'Formatting a formatter already owns, and preferences with no failure behind them.',
      '',
    ].join('\n'),
  );
  // A style that turns the coding instructions off, which the page documents
  // as the case for a style whose work is not software engineering.
  write(
    root,
    '.claude/output-styles/plain-language.md',
    [
      '---',
      'name: Plain language',
      'description: Explain to a reader who does not write code',
      '---',
      '',
      'Write for someone who knows the product but not the codebase. Expand an acronym',
      'the first time it appears, and prefer a short sentence to a precise one.',
      '',
    ].join('\n'),
  );
  // A declared empty name: the picker cannot show a style by a name with no
  // characters, so the file name stands in exactly as an absent one does.
  write(
    root,
    '.claude/output-styles/unnamed.md',
    ['---', 'name: ""', 'description: Declares an empty name', '---', '', 'Body.', ''].join('\n'),
  );
  // Malformed YAML frontmatter: extraction fails all-or-nothing while the
  // complete source stays displayed (FR-028).
  write(root, '.claude/output-styles/broken.md', '---\nname: [Unterminated\n---\n\n# Broken\n');
  // The credential and environment-reference case: both are authored text a
  // style file happens to contain, and neither may reach an inventory row or
  // be resolved against the process environment (FR-026, FR-027).
  write(
    root,
    '.claude/output-styles/secrets.md',
    [
      '---',
      'name: Deploy notes',
      `description: Never echo ${FIXTURE_SECRET_LITERAL}`,
      '---',
      '',
      `- The staging token is ${FIXTURE_SECRET_LITERAL}.`,
      `- The endpoint is ${FIXTURE_ENVIRONMENT_REFERENCE}.`,
      '',
    ].join('\n'),
  );

  // The nested project layer the page documents and this Source boundary
  // excludes: it defines the same `Diagrams first` name, which is the
  // duplicate the vendor resolves by proximity to a working directory this
  // product never observes.
  write(
    root,
    'packages/api/.claude/output-styles/diagrams.md',
    ['---', 'name: Diagrams first', '---', '', 'Nested layer.', ''].join('\n'),
  );

  // Near miss: the page names direct children, so a subdirectory inside the
  // styles directory is not a style.
  write(root, '.claude/output-styles/team/reviewer.md', 'nested inside the styles directory\n');
  // Near miss: the container literals are exact.
  write(root, '.claude/output-style/diagrams.md', 'singular styles dir\n');
  write(root, 'claude/output-styles/diagrams.md', 'no leading dot\n');
  write(root, 'output-styles/diagrams.md', 'no .claude above it\n');
  // Near miss: the terminal step is the extension, in its own directory so a
  // case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.claude/output-styles/uppercase/STYLE.MD', 'wrong case\n');
  write(root, '.claude/output-styles/notes.md.bak', 'backup suffix\n');
  write(root, '.claude/output-styles/apply.sh', 'echo not markdown\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.claude/output-styles/hidden.md', 'vcs internal\n');
  // Near miss: an installed dependency tree is never entered.
  write(root, 'node_modules/pkg/.claude/output-styles/vendored.md', 'installed package\n');

  // Other products' own customizations, admitted by their own rules and by no
  // output-style rule: the fixture is a repository, not a directory of styles.
  write(root, '.claude/CLAUDE.md', '# Directory-form project instructions\n');
  write(root, '.github/copilot-instructions.md', '# Repository-wide instructions\n');

  return {
    root,
    expectedStylePaths: [
      '.claude/output-styles/broken.md',
      '.claude/output-styles/code-review.md',
      '.claude/output-styles/diagrams.md',
      '.claude/output-styles/plain-language.md',
      '.claude/output-styles/secrets.md',
      '.claude/output-styles/unnamed.md',
    ],
    expectedStyleNames: [
      'Deploy notes',
      'Diagrams first',
      'Plain language',
      'broken',
      'code-review',
      'unnamed',
    ],
    duplicateNamePath: 'packages/api/.claude/output-styles/diagrams.md',
    malformedStylePath: '.claude/output-styles/broken.md',
    secretStylePath: '.claude/output-styles/secrets.md',
    nearMissPaths: [
      '.claude/output-style/diagrams.md',
      '.claude/output-styles/apply.sh',
      '.claude/output-styles/notes.md.bak',
      '.claude/output-styles/team/reviewer.md',
      '.claude/output-styles/uppercase/STYLE.MD',
      '.git/.claude/output-styles/hidden.md',
      'claude/output-styles/diagrams.md',
      'node_modules/pkg/.claude/output-styles/vendored.md',
      'output-styles/diagrams.md',
      'packages/api/.claude/output-styles/diagrams.md',
    ],
  };
}

/** One built command fixture repository, covering both products (T440, T475). */
export interface CommandFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `claude.repo.command` allowlist must admit,
   * sorted exactly as the scan publishes them. Capability-gated members are
   * present only when the corresponding capability is.
   */
  readonly expectedCommandPaths: readonly string[];
  /**
   * The admitted paths both products recognize: the root direct children,
   * which is everything `copilot.repo.command` reaches. Derived from
   * {@link expectedCommandPaths} rather than listed again, so the two cannot
   * disagree about which files the tree holds.
   */
  readonly sharedCommandPaths: readonly string[];
  /**
   * The admitted paths only Claude recognizes: the ones inside a namespace
   * directory, which Copilot documents no read of. Derived from
   * {@link expectedCommandPaths} for the same reason.
   */
  readonly claudeOnlyCommandPaths: readonly string[];
  /** The command file whose frontmatter declares the keys a command supports. */
  readonly declaringCommandPath: string;
  /** The keys that file declares, in authored order. */
  readonly declaredKeys: readonly string[];
  /**
   * The two command files sharing one file name in different namespaces.
   * Claude derives two different names from them, because the subdirectory is
   * part of the name it derives, so they are two rows rather than a collision.
   */
  readonly duplicateNameCommandPaths: readonly string[];
  /**
   * The command file whose frontmatter is malformed YAML: its extraction fails
   * all-or-nothing while the complete source stays displayed (FR-028).
   */
  readonly malformedCommandPath: string;
  /**
   * The command file whose frontmatter and body hold a literal credential and
   * an environment reference, so a test can prove neither reaches the
   * inventory and neither is resolved (FR-026, FR-027).
   */
  readonly secretCommandPath: string;
  /**
   * The command file whose prompt names an agent and a skill, so a test can
   * prove neither is resolved, opened, or read (FR-019).
   */
  readonly referencingCommandPath: string;
  /**
   * Paths no shipped rule of any product may admit: the subdirectory
   * `.claude/commands` this release's root anchoring leaves out, the
   * standalone `.claude/prompts` directory FR-034 names, a `.copilot/commands`
   * directory no cited page documents, the spelling variants one step from
   * the selector's literals, and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * Every Source-relative Path the `copilot.repo.prompt` allowlist must admit,
   * sorted exactly as the scan publishes them: the VS Code prompt files, which
   * are the kind's other location.
   */
  readonly expectedPromptPaths: readonly string[];
  /** The prompt file that declares its own `name`, and the name it declares. */
  readonly declaringPromptPath: string;
  /** The `name` that file declares, which is what a reader types after the `/`. */
  readonly declaredPromptName: string;
  /** The prompt file that declares none, so its file name is its name. */
  readonly namelessPromptPath: string;
  /**
   * The prompt file whose declared `name` matches a command's derived name, so
   * one row lists both files.
   */
  readonly sharedNamePromptPath: string;
  /** The standalone `.claude/prompts` file FR-034 keeps out of the inventory. */
  readonly promptsPath: string;
  /** The subdirectory `.claude/commands` file the root anchoring keeps out. */
  readonly nestedCommandPath: string;
}

/**
 * Builds the canonical command fixture repository (T440, finalized for both
 * products by T475).
 *
 * The Claude admitted set is every `.md` file at any depth inside the root's
 * own `.claude/commands/`, which is the one documented recursion: the changelog
 * restored the subdirectory-derived namespace in a command name and shows
 * `.claude/commands/frontend/component.md` invoked as `/frontend:component`.
 * The tree exercises it — a direct child, a one-level namespace, and a deeply
 * nested one — beside the near misses one segment away from each.
 *
 * The leading recursion the rule file rule has is deliberately absent here and
 * is a near miss instead: `packages/api/.claude/commands/deploy.md` is a file
 * no cited page documents a read of, because the ancestor and lazy-descendant
 * sentences of the skills page are written about `.claude/skills/` alone.
 *
 * The admitted files carry what a command file carries: the frontmatter keys a
 * skill supports, two file names that coincide across namespaces, malformed
 * YAML whose extraction fails while the source stays displayed, a literal
 * credential and environment reference that must reach no inventory and never
 * be resolved, and a prompt naming an agent and a skill that must never be
 * resolved or read.
 *
 * Copilot reaches the root direct children of the same directory and nothing
 * below them, so the tree is also the unified case: a root file carries a
 * recognition from each product under one name, and a nested one carries
 * Claude's alone.
 *
 * A standalone `.claude/prompts` file is written on purpose: FR-034 requires
 * that it never becomes a supported Claude customization file.
 */
export function buildCommandFixture(
  prefix = 'inspector-commands',
  root = createRepositoryFixtureRoot(prefix),
): CommandFixture {
  const declaredKeys = ['description', 'argument-hint', 'allowed-tools', 'model'];
  // A direct child declaring the keys a command file supports. `name` and
  // `paths` are deliberately absent: Claude Code ignores both in a command
  // file, and declaring one would put a key in the fixture whose presence
  // says nothing about this product.
  write(
    root,
    '.claude/commands/deploy.md',
    [
      '---',
      'description: Deploy the current branch',
      'argument-hint: "[environment]"',
      'allowed-tools:',
      '  - Bash(git status)',
      '  - Read',
      'model: opus',
      '---',
      '',
      '# Deploy',
      '',
      'Deploy $1 after checking the working tree.',
      '',
    ].join('\n'),
  );
  // A command with no frontmatter at all: the whole file is the prompt.
  write(root, '.claude/commands/release.md', '# Release\n\nCut a release.\n');
  // The changelog's own namespacing example: the subdirectory is part of the
  // command name the vendor derives, which this product publishes nowhere.
  write(
    root,
    '.claude/commands/frontend/component.md',
    '---\ndescription: Scaffold a component\n---\n\n# Component\n',
  );
  // Two file names that coincide across namespaces: two commands to the
  // vendor, two rows here, and neither row is named by a command name.
  write(root, '.claude/commands/frontend/deploy.md', '# Deploy the frontend\n');
  // Deeper nesting, to prove the recursion is not one level.
  write(root, '.claude/commands/team/review/security.md', '# Security review\n');
  // Malformed YAML frontmatter: extraction fails all-or-nothing while the
  // complete source stays displayed (FR-028).
  write(root, '.claude/commands/broken.md', '---\nallowed-tools: [Bash\n---\n\n# Broken\n');
  // The credential and environment-reference case, in the frontmatter and in
  // the body: both are authored text a command file happens to contain, and
  // neither may reach an inventory row or be resolved against the process
  // environment (FR-026, FR-027).
  write(
    root,
    '.claude/commands/secrets.md',
    [
      '---',
      `description: Publish with ${FIXTURE_SECRET_LITERAL}`,
      '---',
      '',
      '# Publish',
      '',
      `- The endpoint is ${FIXTURE_ENVIRONMENT_REFERENCE}.`,
      '',
    ].join('\n'),
  );
  // Names of an agent and a skill inside the prompt: text this product never
  // resolves, opens, or reads (FR-019).
  write(
    root,
    '.claude/commands/references.md',
    [
      '# Audit',
      '',
      '- Hand the diff to the code-reviewer subagent.',
      '- Then run /skill-name and read ./checklist.md.',
      '',
    ].join('\n'),
  );

  // Near miss: the project command scope is the selected root's own, because
  // no skill-equivalent ancestor or lazy-descendant command traversal is
  // documented.
  write(root, 'packages/api/.claude/commands/deploy.md', 'nested commands directory\n');
  // Near miss: FR-034 — a standalone `.claude/prompts` directory is not a
  // supported Claude customization file type.
  write(root, '.claude/prompts/deploy.md', 'unsupported prompts directory\n');
  // Near miss: Copilot documents its commands at `.claude/commands/` and
  // names no product-home directory of its own, so nothing here may reach a
  // `.copilot/commands` one.
  write(root, '.copilot/commands/deploy.md', 'no documented copilot commands dir\n');
  // The kind's other location: VS Code prompt files, which a reader invokes
  // by hand with a `/`. A prompt declares its own `name` and falls back to its
  // file name, which is the difference from a command file.
  write(
    root,
    '.github/prompts/scaffold.prompt.md',
    [
      '---',
      'name: scaffold-component',
      'description: Scaffold a React component',
      'argument-hint: "componentName"',
      '---',
      '',
      '# Scaffold',
      '',
      'Create a component named ${input:componentName}.',
      '',
    ].join('\n'),
  );
  // No `name`, so the file name stands in.
  write(root, '.github/prompts/review.prompt.md', '# Review\n\nReview the diff.\n');
  // A declared name that collides with a root command's derived name, so the
  // two files land on one row.
  write(
    root,
    '.github/prompts/deploy.prompt.md',
    '---\nname: deploy\n---\n\n# Deploy from the editor\n',
  );
  // Malformed frontmatter: the extraction fails and the file name stands in,
  // exactly as it does for a file that declares no name (FR-028).
  write(root, '.github/prompts/broken.prompt.md', '---\ntools: [read\n---\n\n# Broken\n');
  // Near miss: the extension is exact, and a plain `.md` is not a prompt file.
  write(root, '.github/prompts/notes.md', 'not a prompt file\n');
  // Near miss: the page gives one default folder for the workspace scope and
  // puts every other location behind a setting this tool never reads.
  write(root, '.github/prompts/team/deploy.prompt.md', 'nested prompts directory\n');
  write(root, 'packages/api/.github/prompts/deploy.prompt.md', 'non-root prompts directory\n');

  // Near miss: the container literals are exact.
  write(root, '.claude/command/deploy.md', 'singular commands dir\n');
  write(root, 'claude/commands/deploy.md', 'no leading dot\n');
  write(root, 'commands/deploy.md', 'no .claude above it\n');
  // Near miss: the terminal step is the extension, in its own directory so a
  // case-insensitive filesystem cannot collide it with an admitted file.
  write(root, '.claude/commands/uppercase/DEPLOY.MD', 'wrong case\n');
  write(root, '.claude/commands/notes.md.bak', 'backup suffix\n');
  write(root, '.claude/commands/script.sh', 'echo not markdown\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.claude/commands/hidden.md', 'vcs internal\n');
  // Near miss: an installed dependency tree is never entered.
  write(root, 'node_modules/pkg/.claude/commands/vendored.md', 'installed package\n');
  // An unrelated file sharing no segment with the selector.
  write(root, 'README.md', 'unrelated\n');

  const expectedCommandPaths = [
    '.claude/commands/broken.md',
    '.claude/commands/deploy.md',
    '.claude/commands/frontend/component.md',
    '.claude/commands/frontend/deploy.md',
    '.claude/commands/references.md',
    '.claude/commands/release.md',
    '.claude/commands/secrets.md',
    '.claude/commands/team/review/security.md',
  ];
  const nearMissPaths = [
    '.claude/command/deploy.md',
    '.copilot/commands/deploy.md',
    '.github/prompts/notes.md',
    '.github/prompts/team/deploy.prompt.md',
    'packages/api/.github/prompts/deploy.prompt.md',
    '.claude/commands/notes.md.bak',
    '.claude/commands/script.sh',
    '.claude/commands/uppercase/DEPLOY.MD',
    '.claude/prompts/deploy.md',
    '.git/.claude/commands/hidden.md',
    'claude-commands-linked-target.md',
    'claude/commands/deploy.md',
    'commands/deploy.md',
    'node_modules/pkg/.claude/commands/vendored.md',
    'packages/api/.claude/commands/deploy.md',
    'shared-claude-commands/audit.md',
  ];

  // Linked cases are capability-gated; see {@link buildCodexSkillFixture}. A
  // link is read through its target like every other read (FR-024), so a
  // linked command file and a linked namespace directory are ordinary rows.
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(root, 'claude-commands-linked-target.md', '# shared command\n');
      write(root, 'shared-claude-commands/audit.md', '# shared audit command\n');
    },
    () => {
      symlinkSync(
        join(root, 'claude-commands-linked-target.md'),
        join(root, '.claude/commands/shared.md'),
      );
      symlinkSync(join(root, 'shared-claude-commands'), join(root, '.claude/commands/shared'));
      // A link whose target is missing is that candidate's `file-unreadable`
      // Diagnostic, not an absent file.
      symlinkSync(join(root, 'no-such-command.md'), join(root, '.claude/commands/broken-link.md'));
    },
    ['.claude/commands/shared.md', '.claude/commands/shared', '.claude/commands/broken-link.md'],
  );
  if (symlinks) {
    expectedCommandPaths.push(
      '.claude/commands/broken-link.md',
      '.claude/commands/shared.md',
      '.claude/commands/shared/audit.md',
    );
  }

  expectedCommandPaths.sort();
  nearMissPaths.sort();

  return {
    root,
    capabilities: { symlinks },
    expectedCommandPaths,
    // Both splits follow from the one admitted set: a root direct child has
    // exactly the two container segments in front of its file name, and
    // anything deeper sits inside a namespace directory Copilot documents no
    // read of.
    sharedCommandPaths: expectedCommandPaths.filter((path) => path.split('/').length === 3),
    claudeOnlyCommandPaths: expectedCommandPaths.filter((path) => path.split('/').length > 3),
    expectedPromptPaths: [
      '.github/prompts/broken.prompt.md',
      '.github/prompts/deploy.prompt.md',
      '.github/prompts/review.prompt.md',
      '.github/prompts/scaffold.prompt.md',
    ],
    declaringPromptPath: '.github/prompts/scaffold.prompt.md',
    declaredPromptName: 'scaffold-component',
    namelessPromptPath: '.github/prompts/review.prompt.md',
    sharedNamePromptPath: '.github/prompts/deploy.prompt.md',
    declaringCommandPath: '.claude/commands/deploy.md',
    declaredKeys,
    duplicateNameCommandPaths: [
      '.claude/commands/deploy.md',
      '.claude/commands/frontend/deploy.md',
    ],
    malformedCommandPath: '.claude/commands/broken.md',
    secretCommandPath: '.claude/commands/secrets.md',
    referencingCommandPath: '.claude/commands/references.md',
    nearMissPaths,
    promptsPath: '.claude/prompts/deploy.md',
    nestedCommandPath: 'packages/api/.claude/commands/deploy.md',
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

/**
 * The inline `[hooks]` tables of a Codex config layer (T833): the second of the
 * two documented hook forms, which the vendor loads beside a standalone
 * `hooks.json` of the same layer rather than instead of it.
 *
 * A shared constant because two builders write it — the hook fixture's own
 * config document, and the all-kinds tree, where several builders own that one
 * path and the tables are appended to whatever the last of them wrote. Table
 * headers only, so appending is always valid TOML.
 */
const CODEX_INLINE_HOOKS_TOML: readonly string[] = [
  '# The inline form of the same layer, which Codex loads beside the',
  '# standalone file rather than instead of it.',
  '[[hooks.SessionStart]]',
  'matcher = "^compact$"',
  '',
  '[[hooks.SessionStart.hooks]]',
  'type = "command"',
  'command = \'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/session_start.py"\'',
  'additionalContextLimit = 5000',
  '',
  '[[hooks.UserPromptSubmit]]',
  '',
  '[[hooks.UserPromptSubmit.hooks]]',
  'type = "command"',
  'command = \'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/user_prompt_submit.py"\'',
  'statusMessage = "Recording the prompt"',
  '',
];

/** One built Claude contained-hook fixture repository (T857). */
export interface ClaudeHookFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every accepted file in this tree that declares hooks, by its
   * Source-relative Path. Claude documents no standalone project hook file, so
   * every declaration is contained in a file another rule admits — and only
   * the two settings documents publish hook rows for theirs.
   */
  readonly owners: {
    /** The shared settings document, whose top-level `hooks` a team commits. */
    readonly settings: string;
    /** The personal settings document beside it, which declares its own. */
    readonly localSettings: string;
    /** A `SKILL.md` whose frontmatter registers hooks from its invocation onward. */
    readonly skill: string;
    /** A subagent file whose frontmatter registers hooks while it runs. */
    readonly agent: string;
    /** A skills-directory plugin manifest with inline hook configuration. */
    readonly pluginManifest: string;
    /** The repository's own catalog, whose entries declare hooks per plugin. */
    readonly marketplace: string;
  };
  /**
   * The events each hook-publishing owner declares, in authored order, by that
   * owner's path — the settings documents alone. The other files in
   * {@link owners} declare hooks too and publish no hook row: a skill's, a
   * subagent's, a plugin manifest's, and a catalog entry's declarations are
   * part of what that customization is, and its own row publishes the keys its
   * file wrote.
   */
  readonly expectedEventsByOwner: Readonly<Record<string, readonly string[]>>;
  /**
   * Paths no shipped rule of any product may admit and nothing reads: the
   * fabricated standalone hook file Claude documents nowhere, the handler
   * scripts declarations name, an unreferenced script beside them, and the User
   * layer spelled inside the repository.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The hook configuration a plugin bundles, inside the plugin roots the
   * catalog's entries name. These files *are* read — a plugin root is a
   * directory-shaped customization whose files the census enumerates
   * (contracts/inspection-path-allowlist.md § Bounded companion census) — and
   * they gain no hook recognition all the same: a plugin's components are that
   * plugin's row, and no rule admits one as a hook carrier.
   */
  readonly pluginBundledHookPaths: readonly string[];
}

/**
 * Builds the canonical Claude contained-hook fixture repository (T857).
 *
 * Claude documents no standalone project hook file at all, so this tree is
 * every documented owner instead: the two settings documents, a skill and a
 * subagent declaring hooks in frontmatter, a skills-directory plugin manifest
 * with inline configuration, and the repository's own catalog, whose entries
 * declare hooks for the plugins they offer.
 *
 * The declarations are what a hook declaration carries: command handlers with
 * matchers, timeouts, and status messages; a literal credential and a literal
 * environment reference inside a command, which must reach no inventory row and
 * must never be resolved (FR-026, FR-027); a `hooks` value written as a path
 * instead of a map — which the manifest schema allows and which declares no
 * event here, because a component path is never followed (FR-004, FR-024); a
 * malformed event whose value is not a list of groups, omitted whole; and one
 * event two catalog entries both declare, which is what makes the per-entry
 * identity visible.
 *
 * Near misses: a fabricated `.claude/hooks.json`, which Claude documents
 * nowhere and no rule admits; the handler scripts under `.claude/hooks/`,
 * including one no declaration names, because an unreferenced script is never
 * inferred to be a hook (FR-034); and the User layer. A plugin's own bundled
 * `hooks/hooks.json` sits apart from those: the census reads it as one of the
 * plugin's files, and it gains no hook recognition all the same.
 */
export function buildClaudeHookFixture(
  prefix = 'inspector-claude-hooks',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeHookFixture {
  const settingsPath = '.claude/settings.json';
  const localSettingsPath = '.claude/settings.local.json';
  const skillPath = '.claude/skills/release-notes/SKILL.md';
  const agentPath = '.claude/agents/reviewer.md';
  const pluginManifestPath = '.claude/skills/toolkit/.claude-plugin/plugin.json';
  const marketplacePath = '.claude-plugin/marketplace.json';

  // The shared settings document: the location the vendor names first, with a
  // permission policy beside the hooks so the file keeps its three
  // recognitions — the policy, the hooks, and the document itself.
  write(
    root,
    settingsPath,
    `${JSON.stringify(
      {
        permissions: { allow: ['Bash(git status)'], deny: ['Bash(rm -rf *)'] },
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: '"${CLAUDE_PROJECT_DIR}"/.claude/hooks/block-rm.sh',
                  timeout: 30,
                },
              ],
            },
          ],
          PostToolUse: [
            {
              matcher: 'Write|Edit',
              hooks: [
                {
                  type: 'command',
                  command: '"${CLAUDE_PROJECT_DIR}"/.claude/hooks/format-code.sh',
                  statusMessage: 'Formatting the edited file',
                },
              ],
            },
          ],
          // Malformed: an event whose value is not a list of groups declares
          // nothing and is omitted whole.
          Stop: { matcher: '*' },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The personal document beside it, whose own hooks merge with the shared
  // file's rather than replacing them.
  write(
    root,
    localSettingsPath,
    `${JSON.stringify(
      {
        permissions: { allow: ['Bash(gh pr view)'] },
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  // The credential and environment-reference case: both are
                  // authored characters inside a command, and neither may reach
                  // an inventory row or be resolved (FR-026, FR-027).
                  command: `curl -H "Authorization: Bearer ${FIXTURE_SECRET_LITERAL}" ${FIXTURE_ENVIRONMENT_REFERENCE}/session`,
                  statusMessage: 'Announcing the session',
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // A skill whose frontmatter registers hooks from its invocation onward, in
  // the same three-level format a settings file uses.
  write(
    root,
    skillPath,
    [
      '---',
      'name: release-notes',
      'description: Draft release notes from merged pull requests.',
      'hooks:',
      '  PreToolUse:',
      '    - matcher: Bash',
      '      hooks:',
      '        - type: command',
      '          command: ./scripts/security-check.sh',
      '  UserPromptSubmit:',
      '    - hooks:',
      '        - type: command',
      '          command: ./scripts/note-prompt.sh',
      '---',
      '',
      'Draft the notes from the merged pull requests.',
      '',
    ].join('\n'),
  );
  // A subagent whose frontmatter hooks run only while it runs.
  write(
    root,
    agentPath,
    [
      '---',
      'name: reviewer',
      'description: Review a diff for correctness.',
      'hooks:',
      '  PostToolUse:',
      '    - matcher: Edit',
      '      hooks:',
      '        - type: command',
      '          command: ./scripts/review-edit.sh',
      '          timeout: 20',
      '---',
      '',
      'Review the diff and report what would break.',
      '',
    ].join('\n'),
  );
  // A skills-directory plugin manifest: the folder holding it is the plugin,
  // and its `hooks` is inline configuration rather than a path.
  write(
    root,
    pluginManifestPath,
    `${JSON.stringify(
      {
        name: 'toolkit',
        version: '1.2.0',
        hooks: {
          SessionEnd: [
            {
              hooks: [{ type: 'command', command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/cleanup.sh' }],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.claude/skills/toolkit/SKILL.md',
    '---\nname: toolkit\ndescription: The skill this plugin folder ships.\n---\n\nRun the toolkit.\n',
  );
  // The repository's own catalog. Its first entry declares hooks as a path,
  // which names a plugin file and declares no event here; its second declares
  // them inline, for the plugin that entry offers.
  write(
    root,
    marketplacePath,
    `${JSON.stringify(
      {
        name: 'inspector-examples',
        owner: { name: 'Inspector Examples' },
        plugins: [
          {
            name: 'release-helper',
            source: './plugins/release-helper',
            hooks: './hooks/hooks.json',
          },
          {
            name: 'formatter',
            source: './plugins/formatter',
            hooks: {
              PostToolUse: [
                {
                  matcher: 'Write|Edit',
                  hooks: [
                    {
                      type: 'command',
                      command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/format.sh',
                      statusMessage: 'Formatting through the catalog entry',
                    },
                  ],
                },
              ],
              // The event the shared settings document also declares: one row
              // lists both carriers, and the catalog's declaration names the
              // plugin entry it was written for.
              PreToolUse: [
                {
                  matcher: 'Bash',
                  hooks: [{ type: 'command', command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/guard.sh' }],
                },
              ],
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );
  // The plugin roots the catalog's entries name, each with the manifest the
  // census reaches and one bundled hook file no rule admits.
  for (const plugin of ['release-helper', 'formatter']) {
    write(
      root,
      `plugins/${plugin}/.claude-plugin/plugin.json`,
      `${JSON.stringify({ name: plugin, version: '0.1.0' }, null, 2)}\n`,
    );
    write(root, `plugins/${plugin}/hooks/hooks.json`, '{ "hooks": { "SessionStart": [] } }\n');
  }
  // The handler scripts the declarations name, and one no declaration names: a
  // declared path gains no read authority and becomes no candidate, and an
  // unreferenced script is never inferred to be a hook (FR-034).
  for (const script of ['block-rm.sh', 'format-code.sh', 'unreferenced.sh']) {
    write(root, `.claude/hooks/${script}`, '#!/bin/sh\necho fixture\n');
  }
  // A fabricated standalone hook file: Claude documents no such project
  // location, so no rule admits it and it is a near miss at every phase.
  write(root, '.claude/hooks.json', '{ "hooks": { "Stop": [] } }\n');
  // The User layer this vendor reads and this product may not.
  write(root, 'home/.claude/settings.json', '{ "hooks": { "SessionStart": [] } }\n');
  // An unrelated file sharing no segment with any selector.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    owners: {
      settings: settingsPath,
      localSettings: localSettingsPath,
      skill: skillPath,
      agent: agentPath,
      pluginManifest: pluginManifestPath,
      marketplace: marketplacePath,
    },
    expectedEventsByOwner: {
      // The malformed `Stop` event is absent: its value is not a list of groups.
      [settingsPath]: ['PreToolUse', 'PostToolUse'],
      [localSettingsPath]: ['SessionStart'],
    },
    nearMissPaths: [
      '.claude/hooks.json',
      '.claude/hooks/block-rm.sh',
      '.claude/hooks/format-code.sh',
      '.claude/hooks/unreferenced.sh',
      'README.md',
      'home/.claude/settings.json',
    ],
    pluginBundledHookPaths: [
      'plugins/formatter/hooks/hooks.json',
      'plugins/release-helper/hooks/hooks.json',
    ],
  };
}

/** One built Codex hook fixture repository (T833). */
export interface CodexHookFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * The Source-relative Path of the standalone `.codex/hooks.json` carrier —
   * a file whose whole purpose is hooks, admitted by `codex.repo.hooks`.
   */
  readonly standaloneCarrierPath: string;
  /**
   * The Source-relative Path of the config layer whose inline `[hooks]` table
   * is the same layer's other hook carrier, admitted by
   * `codex.repo.hooks.inline`. The same physical file is also the MCP carrier
   * and the settings document — three rules over one candidate read once.
   */
  readonly inlineCarrierPath: string;
  /**
   * The events the standalone file declares, in authored order — the hook
   * inventory's rows. An event whose value is not a list of groups is
   * deliberately absent: a malformed declaration is omitted whole.
   */
  readonly expectedStandaloneEvents: readonly string[];
  /** The events the inline table declares, in authored order. */
  readonly expectedInlineEvents: readonly string[];
  /**
   * The event both carriers declare: the same-layer case Codex loads from both
   * forms rather than choosing between, so one row lists two declarations.
   */
  readonly sharedEvent: string;
  /**
   * Paths no shipped rule or derivation of any product may admit: the
   * descendant `.codex` layer a runtime working directory would use, the
   * scripts a handler names — an unreferenced script is never inferred to be a
   * hook — a plugin's own bundled hooks and the managed `requirements.toml`
   * that can declare them, and spelling variants one step from the carrier's
   * literals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Codex hook fixture repository (T833).
 *
 * The tree holds both documented forms at the one layer this product selects:
 * the standalone `.codex/hooks.json` and the inline `[hooks]` table of the
 * same layer's `.codex/config.toml`. That is the case the vendor documents as
 * loading both with a startup warning, so one event — `SessionStart` — is
 * declared by both carriers and its row lists two declarations, while the
 * others belong to one carrier each.
 *
 * The declarations are what a hook declaration carries: command handlers with
 * matchers, timeouts, and status messages; a literal credential and a literal
 * environment reference inside a command, which must reach no inventory row
 * and must never be resolved (FR-026, FR-027); handler scripts written as
 * git-root-relative paths, which are on disk as near misses because a declared
 * path gains no read authority and becomes no candidate; a malformed event
 * whose value is not a list of groups, omitted whole; and a malformed group
 * inside a well-formed event, published as authored because a reader needs the
 * malformed group stated rather than silently dropped.
 *
 * Near misses: the descendant `.codex` layer, the handler scripts themselves,
 * the singular and dotless directory spellings, a backup suffix, a root
 * `hooks.json` with no `.codex` above it, the User layer spelled inside the
 * repository, a plugin's own bundled `hooks/hooks.json`, the managed
 * `requirements.toml` that can declare hooks inline, and VCS internals.
 *
 * A linked carrier is deliberately absent, unlike the rule and skill trees'
 * cases: a layer has exactly one `.codex/hooks.json`, so a symbolic link at
 * that path cannot stand beside the real file this tree needs, and transparent
 * link reading is covered where a kind admits many files.
 *
 * Trust and review are deliberately not modelled by a file: whether the
 * project layer is trusted, and whether a hook has been reviewed against its
 * current hash, are runtime inputs this product never observes, so the
 * fixture's job is to make the inventory state them nowhere (FR-009).
 */
export function buildCodexHookFixture(
  prefix = 'inspector-codex-hooks',
  root = createRepositoryFixtureRoot(prefix),
): CodexHookFixture {
  write(
    root,
    '.codex/hooks.json',
    `${JSON.stringify(
      {
        // Top-level metadata the carrier declares about itself: documented as
        // optional and as changing which hooks run not at all, so it is the
        // carrier's own field rather than an event.
        description: 'Repository lifecycle hooks for the inspector fixture.',
        hooks: {
          // Also declared inline in the same layer's config.toml: the
          // documented both-forms case.
          SessionStart: [
            {
              matcher: 'startup|resume',
              hooks: [
                {
                  type: 'command',
                  command:
                    'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/session_start.py"',
                  statusMessage: 'Loading session notes',
                  additionalContextLimit: 5000,
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: '^Bash$',
              hooks: [
                {
                  type: 'command',
                  // The credential and environment-reference case: both are
                  // authored characters inside a command, and neither may
                  // reach an inventory row or be resolved (FR-026, FR-027).
                  command: `curl -H "Authorization: Bearer ${FIXTURE_SECRET_LITERAL}" ${FIXTURE_ENVIRONMENT_REFERENCE}/policy`,
                  statusMessage: 'Checking Bash command',
                  timeout: 30,
                },
              ],
            },
            // A malformed group inside a well-formed event: an item that is
            // not a table at all. It is published as authored, because a
            // reader inspecting their own file needs it stated rather than
            // dropped.
            'not a group',
          ],
          PostToolUse: [
            {
              matcher: '^apply_patch$',
              hooks: [
                {
                  type: 'command',
                  command:
                    'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/post_tool_use_review.py"',
                  timeout: 30,
                  async: true,
                },
              ],
            },
          ],
          // A handler form the page documents as parsed and skipped, kept
          // because what a client does with a declaration is not this
          // product's claim to make (FR-009).
          PreCompact: [
            {
              hooks: [
                { type: 'prompt', prompt: 'Summarize the open questions before compacting.' },
              ],
            },
          ],
          // Malformed: an event whose value is not a list of groups declares
          // nothing and is omitted whole, the same answer an absent hook map
          // gives.
          Stop: { matcher: '^.*$' },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The same layer's config document, carrying the inline `[hooks]` table
  // beside the general configuration and the MCP tables that are two other
  // recognitions of this one file. Top-level keys before the first table
  // header, because a TOML document requires that order.
  write(
    root,
    '.codex/config.toml',
    [
      '# Codex project configuration for the hook fixture repository.',
      'model = "gpt-5.4-codex"',
      'approval_policy = "on-request"',
      '',
      '[mcp_servers.context7]',
      'command = "npx"',
      'args = ["-y", "@upstash/context7-mcp"]',
      '',
      ...CODEX_INLINE_HOOKS_TOML,
    ].join('\n'),
  );

  // The handler scripts the declarations name. A declared path gains no read
  // authority and becomes no candidate, and an unreferenced script is never
  // inferred to be a hook (FR-034's rule, applied to this vendor's layer).
  write(root, '.codex/hooks/session_start.py', 'print("fixture hook")\n');
  write(root, '.codex/hooks/post_tool_use_review.py', 'print("fixture hook")\n');
  write(root, '.codex/hooks/user_prompt_submit.py', 'print("fixture hook")\n');
  write(root, '.codex/hooks/unreferenced.py', 'print("no declaration names this file")\n');
  // Near miss: a descendant `.codex` layer belongs to a runtime working
  // directory this product never selects, exactly as the nested `config.toml`
  // and `AGENTS.md` do.
  write(root, 'packages/api/.codex/hooks.json', '{ "hooks": { "Stop": [] } }\n');
  // Near miss: the terminal literal is exact.
  write(root, '.codex/hooks.json.bak', 'backup suffix\n');
  write(root, '.codex/hooks.jsonc', 'wrong extension\n');
  // Near miss: the container literals are exact.
  write(root, '.codex/hook.json', 'singular container\n');
  write(root, 'codex/hooks.json', 'no leading dot\n');
  write(root, 'hooks.json', 'no .codex above it\n');
  // Near miss: a plugin's own bundled hooks. The page documents that an enabled
  // plugin can bundle lifecycle hooks through its manifest or a default
  // `hooks/hooks.json`, and that content is on record as excluded — a plugin
  // root's files belong to the plugin's row, and no hook rule reaches them.
  write(root, 'plugins/release-notes/hooks/hooks.json', '{ "hooks": { "SessionEnd": [] } }\n');
  // Near miss: managed hooks. The page documents an enterprise
  // `requirements.toml` that can define `[hooks]` inline, which is
  // administrator configuration rather than a repository customization, and no
  // rule admits it.
  write(root, 'requirements.toml', '[hooks]\n[[hooks.Stop]]\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.codex/hooks.json', 'vcs internal\n');
  // The User layer this rule may never read, spelled inside the repository so
  // a test can prove the path is a near miss rather than a Source.
  write(root, 'home/.codex/hooks.json', 'user layer\n');
  // An unrelated file sharing no segment with the selector.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    standaloneCarrierPath: '.codex/hooks.json',
    inlineCarrierPath: '.codex/config.toml',
    // The malformed `Stop` event is absent: its value is not a list of groups.
    expectedStandaloneEvents: ['SessionStart', 'PreToolUse', 'PostToolUse', 'PreCompact'],
    expectedInlineEvents: ['SessionStart', 'UserPromptSubmit'],
    sharedEvent: 'SessionStart',
    nearMissPaths: [
      '.codex/hook.json',
      '.codex/hooks.json.bak',
      '.codex/hooks.jsonc',
      '.codex/hooks/post_tool_use_review.py',
      '.codex/hooks/session_start.py',
      '.codex/hooks/unreferenced.py',
      '.codex/hooks/user_prompt_submit.py',
      '.git/.codex/hooks.json',
      'README.md',
      'codex/hooks.json',
      'home/.codex/hooks.json',
      'hooks.json',
      'packages/api/.codex/hooks.json',
      'plugins/release-notes/hooks/hooks.json',
      'requirements.toml',
    ],
  };
}

/** One built Copilot hook fixture repository (T878). */
export interface CopilotHookFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every accepted file in this tree that declares hooks, by its
   * Source-relative Path. Copilot documents both forms — files whose whole
   * purpose is hooks, and an inline block in a settings document — and one
   * owner more that publishes no hook row of its own.
   */
  readonly owners: {
    /** A root hook file, the location all three surfaces read. */
    readonly standalone: string;
    /** A second hook file beside it: the documented lookup loads the directory's `*.json` files. */
    readonly secondStandalone: string;
    /** A hook file whose comment strict JSON cannot read, so its events are unknown. */
    readonly malformed: string;
    /** The CLI's shared repository settings document, whose top-level `hooks` a team commits. */
    readonly settings: string;
    /** The personal settings document beside it, which switches hooks off and declares none. */
    readonly localSettings: string;
    /** The cross-tool Claude-format document both the CLI and the editor read. */
    readonly claudeSettings: string;
    /**
     * The personal document beside it, commented the way the committed Copilot
     * settings document is: this vendor reads it, and Claude Code — whose
     * format it is, and which calls a `//` comment in one of these files a
     * syntax error — does not.
     */
    readonly claudeLocalSettings: string;
    /** A custom agent whose frontmatter hooks are part of what that agent is. */
    readonly agent: string;
  };
  /**
   * The events each hook-publishing owner declares, in authored order, by that
   * owner's path. The agent is absent: its frontmatter declarations are part
   * of what that agent is, and its own row publishes the keys its file wrote.
   * The file no reading can resolve is absent too — its events are unknown
   * rather than empty, which is the null row's `failed` case (FR-028).
   */
  readonly expectedEventsByOwner: Readonly<Record<string, readonly string[]>>;
  /**
   * The event two hook files of the same directory both declare, which is what
   * makes the per-carrier identity visible: one row, two declarations, neither
   * replacing the other.
   */
  readonly sharedEvent: string;
  /**
   * Paths no shipped rule of any product may admit and nothing reads: a nested
   * file below the hook directory — the lookup loads that directory's own
   * `*.json` files, not a subtree — the handler scripts a declaration names,
   * spelling variants one segment from each admitted literal, a plugin's own
   * bundled hook configuration, the User layer spelled inside the repository,
   * and VCS internals.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Copilot hook fixture repository (T878).
 *
 * The tree holds every documented Repository hook source at once: two files of
 * the root `.github/hooks/` directory, the CLI's own settings pair, and the
 * cross-tool Claude-format document the editor reads as well. One event —
 * `preToolUse` — is declared by both hook files, so its row lists two
 * declarations; the Claude-format document declares its own event in that
 * vendor's matcher-group spelling, and the same physical file is Claude Code's
 * hook carrier too, so that row lists one declaration per product.
 *
 * The declarations are what a Copilot hook declaration carries: the documented
 * `version` beside the event map, `bash`/`powershell`/`command` handlers with a
 * working directory, environment variables, and a timeout; a literal credential
 * and a literal environment reference inside a command, which must reach no
 * inventory row and must never be resolved (FR-026, FR-027); a malformed event
 * whose value is not a list of groups, omitted whole; and a malformed group
 * inside a well-formed event, published as authored because a reader needs it
 * stated rather than silently dropped.
 *
 * Two owners are here for what they do *not* produce. A settings document that
 * switches hooks off and declares none publishes no row at all — a file that
 * merely may carry a hook block and does not is on no row, not even the null
 * one — and a custom agent's frontmatter hooks are part of what that agent is,
 * so the agent's own row publishes them and the hook inventory does not.
 *
 * Comments run through the tree wherever this vendor accepts them — its hook
 * files and both settings pairs — so the fixture shows what its own clients
 * load. The cross-tool personal document is the same bytes read two ways: a
 * row here, and a failed Claude recognition beside it
 * (`parsers/json.ts` § ParsedJsonDocument).
 *
 * Near misses: a nested file under the hook directory, the handler scripts the
 * declarations name — including one no declaration names, because an
 * unreferenced script is never inferred to be a hook (FR-034) — the singular
 * and dotless directory spellings, a backup suffix, a non-JSON file in the hook
 * directory, a plugin's own bundled `hooks/hooks.json` with no catalog naming
 * that plugin, the User layer spelled inside the repository, and VCS internals.
 */
export function buildCopilotHookFixture(
  prefix = 'inspector-copilot-hooks',
  root = createRepositoryFixtureRoot(prefix),
): CopilotHookFixture {
  const standalonePath = '.github/hooks/security.json';
  const secondStandalonePath = '.github/hooks/format.json';
  const malformedPath = '.github/hooks/draft.json';
  const settingsPath = '.github/copilot/settings.json';
  const localSettingsPath = '.github/copilot/settings.local.json';
  const claudeSettingsPath = '.claude/settings.json';
  const claudeLocalSettingsPath = '.claude/settings.local.json';
  const agentPath = '.github/agents/reviewer.md';

  // A hook file of the documented format: a `version`, an optional
  // description, and the event map. The CLI's lowerCamelCase event names are
  // what this file writes; the editor converts them at runtime, and a detail
  // shows the key its author wrote (FR-007).
  write(
    root,
    standalonePath,
    `${JSON.stringify(
      {
        version: 1,
        description: 'Repository policy hooks for the inspector fixture.',
        hooks: {
          preToolUse: [
            {
              type: 'command',
              bash: './.github/hooks/scripts/check-policy.sh',
              powershell: 'pwsh -File .github/hooks/scripts/check-policy.ps1',
              cwd: '.',
              env: { COPILOT_FIXTURE_ENDPOINT: FIXTURE_ENVIRONMENT_REFERENCE },
              timeoutSec: 20,
            },
          ],
          sessionStart: [
            {
              type: 'command',
              // The credential and environment-reference case: both are
              // authored characters inside a command, and neither may reach an
              // inventory row or be resolved (FR-026, FR-027).
              command: `curl -H "Authorization: Bearer ${FIXTURE_SECRET_LITERAL}" ${FIXTURE_ENVIRONMENT_REFERENCE}/session`,
            },
          ],
          // Malformed: an event whose value is not a list of groups declares
          // nothing and is omitted whole, the same answer an absent hook map
          // gives.
          stop: { type: 'command', command: './.github/hooks/scripts/farewell.sh' },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The second file of the same directory, which the documented lookup loads
  // beside the first rather than instead of it — commented, because a hook
  // file's comments are its own syntax rather than a failure
  // (`parsers/json.ts` § ParsedJsonDocument).
  write(
    root,
    secondStandalonePath,
    [
      '// Formatting and push guards, run for every surface that loads this file.',
      '{',
      '  "version": 1,',
      '  "hooks": {',
      '    "postToolUse": [{ "type": "command", "command": "npx prettier --write ." }],',
      '',
      '    // Also declared by the file above: two carriers, one event row.',
      '    "preToolUse": [',
      '      { "type": "command", "bash": "./.github/hooks/scripts/reject-force-push.sh" },',
      '      // A malformed group inside a well-formed event: an item that is not',
      '      // an object at all, published as authored.',
      '      "always",',
      '    ],',
      '  },',
      '}',
      '',
    ].join('\n'),
  );
  // A hook file no reading can resolve: the object is never closed, which no
  // leniency repairs, so the events are unknown and the recognition fails
  // all-or-nothing (FR-028). Deliberately not a comment, which this carrier's
  // format allows.
  write(root, malformedPath, ['{', '  "version": 1,', '  "hooks": {', ''].join('\n'));
  // The CLI's shared repository settings document: the inline block sits at the
  // top level beside the other supported repository keys.
  //
  // Comment-free, because this pair is read strictly: the load that makes
  // settings take effect — and that hook loading goes through — rejects a
  // comment and a trailing comma, and no other surface of this vendor reads
  // these two files at all (`parsers/json.ts` § acceptsComments). A commented
  // file here would be a carrier whose recognition fails, which the JSONC
  // carriers below and the divergent-reading suites already cover.
  write(
    root,
    settingsPath,
    `${JSON.stringify(
      {
        companyAnnouncements: ['Run the policy hooks before pushing.'],
        enabledPlugins: { 'policy-guard@company-tools': true },
        hooks: {
          postToolUse: [
            {
              type: 'command',
              command: './.github/hooks/scripts/record-edit.sh',
              timeoutSec: 10,
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The personal document beside it: it switches every hook off and declares
  // none of its own, which puts it on no hook row at all. Strict too, since the
  // format is the pair's rather than one file's.
  write(
    root,
    localSettingsPath,
    `${JSON.stringify({ disableAllHooks: true, model: 'gpt-5.4-codex' }, null, 2)}\n`,
  );
  // The cross-tool document, in the Claude format both products read: the
  // matcher-group spelling, which the editor parses and whose matcher values it
  // ignores at runtime — a fact no surface projects (FR-009).
  write(
    root,
    claudeSettingsPath,
    `${JSON.stringify(
      {
        permissions: { allow: ['Bash(git status)'] },
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: './.claude/hooks/guard.sh',
                  timeout: 30,
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The personal document of the cross-tool pair, commented like the Copilot
  // settings document above: this vendor reads the block below and publishes
  // its event, while Claude Code's recognitions of the same bytes fail with
  // their diagnostic and the file stays an admitted candidate (FR-028). One
  // file, two products, two answers
  // (`parsers/json.ts` § ParsedJsonDocument).
  write(
    root,
    claudeLocalSettingsPath,
    [
      '{',
      '  // Personal: let git status through without a prompt.',
      '  "permissions": { "allow": ["Bash(git status)"] },',
      '',
      '  "hooks": {',
      '    // Announce the branch I am on when a session starts.',
      '    "SessionStart": [',
      '      { "hooks": [{ "type": "command", "command": "./.claude/hooks/announce.sh" }] },',
      '    ],',
      '  },',
      '}',
      '',
    ].join('\n'),
  );
  // A custom agent whose frontmatter hooks run only while it is active. It is
  // an accepted file that declares hooks and publishes no hook row: the
  // declaration is part of what this agent is.
  write(
    root,
    agentPath,
    [
      '---',
      'name: reviewer',
      'description: Review a diff for correctness.',
      'hooks:',
      '  PostToolUse:',
      '    - type: command',
      '      command: ./.github/hooks/scripts/review-edit.sh',
      '---',
      '',
      'Review the diff and report what would break.',
      '',
    ].join('\n'),
  );

  // The handler scripts the declarations name, and one no declaration names.
  // A declared path gains no read authority and becomes no candidate (FR-004,
  // FR-024), and an unreferenced script is never inferred to be a hook
  // (FR-034).
  write(root, '.github/hooks/scripts/check-policy.sh', 'echo policy\n');
  write(root, '.github/hooks/scripts/check-policy.ps1', 'Write-Output policy\n');
  write(root, '.github/hooks/scripts/reject-force-push.sh', 'echo push\n');
  write(root, '.github/hooks/scripts/record-edit.sh', 'echo edit\n');
  write(root, '.github/hooks/scripts/review-edit.sh', 'echo review\n');
  write(root, '.github/hooks/scripts/unreferenced.sh', 'echo "no declaration names this file"\n');
  // Near miss: the documented lookup loads the hook directory's own `*.json`
  // files, so a nested one is a file no page documents a read of.
  write(root, '.github/hooks/nested/deep.json', '{ "version": 1, "hooks": {} }\n');
  // Near miss: the terminal literal is exact.
  write(root, '.github/hooks/security.json.bak', 'backup suffix\n');
  write(root, '.github/hooks/README.md', 'not a hook file\n');
  // Near miss: the container literals are exact.
  write(root, '.github/hook/security.json', 'singular container\n');
  write(root, 'hooks/security.json', 'no .github above it\n');
  write(root, '.claude/settings.local.json.bak', 'backup suffix\n');
  // Near miss: a plugin's own bundled hooks. No catalog in this tree names
  // that plugin, so nothing makes its directory a plugin root here, and no
  // hook rule reaches a component path in any case.
  write(root, 'plugins/policy-guard/hooks/hooks.json', '{ "version": 1, "hooks": {} }\n');
  // Near miss: VCS internals are excluded from traversal entirely.
  write(root, '.git/.github/hooks/security.json', 'vcs internal\n');
  // The User layer these rules may never read, spelled inside the repository so
  // a test can prove the paths are near misses rather than a Source.
  write(root, 'home/.copilot/hooks/personal.json', '{ "version": 1, "hooks": {} }\n');
  write(root, 'home/.copilot/settings.json', '{ "hooks": {} }\n');
  // An unrelated file sharing no segment with any selector.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    owners: {
      standalone: standalonePath,
      secondStandalone: secondStandalonePath,
      malformed: malformedPath,
      settings: settingsPath,
      localSettings: localSettingsPath,
      claudeSettings: claudeSettingsPath,
      claudeLocalSettings: claudeLocalSettingsPath,
      agent: agentPath,
    },
    expectedEventsByOwner: {
      // The malformed `stop` event is absent: its value is not a list of groups.
      [standalonePath]: ['preToolUse', 'sessionStart'],
      [secondStandalonePath]: ['postToolUse', 'preToolUse'],
      [settingsPath]: ['postToolUse'],
      [localSettingsPath]: [],
      [claudeSettingsPath]: ['PreToolUse'],
      // Read by this vendor alone: Claude Code's own recognitions of the same
      // file fail on its comments, so the event has one declaration where the
      // shared document above has two.
      [claudeLocalSettingsPath]: ['SessionStart'],
    },
    sharedEvent: 'preToolUse',
    nearMissPaths: [
      '.claude/settings.local.json.bak',
      '.git/.github/hooks/security.json',
      '.github/hook/security.json',
      '.github/hooks/README.md',
      '.github/hooks/nested/deep.json',
      '.github/hooks/scripts/check-policy.ps1',
      '.github/hooks/scripts/check-policy.sh',
      '.github/hooks/scripts/record-edit.sh',
      '.github/hooks/scripts/reject-force-push.sh',
      '.github/hooks/scripts/review-edit.sh',
      '.github/hooks/scripts/unreferenced.sh',
      '.github/hooks/security.json.bak',
      'README.md',
      'home/.copilot/hooks/personal.json',
      'home/.copilot/settings.json',
      'hooks/security.json',
      'plugins/policy-guard/hooks/hooks.json',
    ],
  };
}

/** One built unified hook fixture repository (T899). */
export interface UnifiedHookFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every carrier in this tree that publishes hook rows, by its
   * Source-relative Path: the two Codex forms of one layer, the settings
   * documents two products read, and the Copilot hook files and settings pair.
   */
  readonly carriers: {
    /** Codex's standalone `.codex/hooks.json`. */
    readonly codexStandalone: string;
    /** The inline `[hooks]` table of the same Codex layer. */
    readonly codexInline: string;
    /** The shared `.claude/settings.json`, which Claude Code and Copilot both read. */
    readonly sharedSettings: string;
    /** The personal `.claude/settings.local.json` beside it, read by both as well. */
    readonly sharedLocalSettings: string;
    /** A Copilot hook file of the root `.github/hooks/` directory. */
    readonly copilotStandalone: string;
    /** A second file of that directory, so one event has two hook-file carriers. */
    readonly copilotSecondStandalone: string;
    /** The CLI's own repository settings document, whose inline block only it reads. */
    readonly copilotSettings: string;
    /** A hook file whose comment strict JSON cannot read, so its events are unknown. */
    readonly unreadable: string;
  };
  /**
   * The accepted files that declare hooks and publish no hook row: their
   * declarations are part of what those customizations are, and each one's own
   * row publishes the keys its file wrote.
   */
  readonly nonPublishingOwners: readonly string[];
  /**
   * The events each publishing carrier declares, in authored order, by that
   * carrier's path. The unreadable carrier is absent: its events are unknown
   * rather than empty, which is the closing row's own statement (FR-028).
   */
  readonly expectedEventsByCarrier: Readonly<Record<string, readonly string[]>>;
  /**
   * The event two products declare in one physical file — the one-read case:
   * `.claude/settings.json` is Claude Code's hook carrier and Copilot's, so
   * this event's row lists one declaration per product over a single read.
   */
  readonly sharedFileEvent: string;
  /**
   * The event two vendors declare in different files, which is what makes the
   * row unit visible: a hook row is one declared event name, and the carriers
   * that declare it join it whoever reads them.
   */
  readonly crossVendorEvent: string;
  /**
   * Paths no shipped rule of any product may admit and nothing reads: the
   * handler scripts declarations name, an unreferenced script beside them, the
   * nested file below a hook directory, the User layers spelled inside the
   * repository, and spelling variants one segment from an admitted literal.
   */
  readonly nearMissPaths: readonly string[];
  /**
   * The hook configuration a plugin bundles, inside the root the catalog's
   * entry names. These files *are* read — a plugin root is a directory-shaped
   * customization whose files the census enumerates
   * (contracts/inspection-path-allowlist.md § Bounded companion census) — and
   * they gain no hook recognition all the same: a plugin's components are that
   * plugin's row, and no hook rule admits one.
   */
  readonly pluginBundledHookPaths: readonly string[];
}

/**
 * Builds the canonical unified hook fixture repository (T899): one tree where
 * hooks reach the inventory every documented way at once.
 *
 * The point of the tree is the row unit. A hook row is one declared lifecycle
 * event, so a single event gathers every carrier that declares it: `SessionStart`
 * is declared by Codex's standalone file, by the inline table of the same Codex
 * layer, and by the shared `.claude/settings.local.json` that Claude Code and
 * Copilot both read — five declarations over four reads, on one row. `PreToolUse`
 * is the one-read case on its own: `.claude/settings.json` is one physical file
 * with one recognition per product.
 *
 * The Copilot files use the CLI's lowerCamelCase event names, which are their own
 * rows: an event row is the key its carrier wrote (FR-007), and this product
 * never folds two spellings into one row on a vendor's behalf.
 *
 * Five accepted files declare hooks and publish no hook row — a skill, a
 * subagent, a Copilot custom agent, a plugin manifest, and the repository's own
 * catalog. Their declarations are part of what those customizations are, and
 * each one's own row already publishes the keys its file wrote, so a hook row
 * would publish one fact twice on a page whose subject is not that
 * customization.
 *
 * One carrier is deliberately unreadable — a hook file with a comment, which
 * this vendor documents as JSON — so the closing row states unknown events
 * rather than none (FR-028), and the generation is partial.
 *
 * Near misses: the handler scripts the declarations name and one no declaration
 * names, the nested file below `.github/hooks/`, both products' User layers
 * spelled inside the repository, and the singular and dotless spellings of each
 * admitted container. A plugin's own bundled `hooks/hooks.json` sits apart from
 * those: the catalog names that root, so the census reads the file as one of
 * the plugin's own, and it gains no hook recognition all the same.
 */
export function buildUnifiedHookFixture(
  prefix = 'inspector-unified-hooks',
  root = createRepositoryFixtureRoot(prefix),
): UnifiedHookFixture {
  const codexStandalone = '.codex/hooks.json';
  const codexInline = '.codex/config.toml';
  const sharedSettings = '.claude/settings.json';
  const sharedLocalSettings = '.claude/settings.local.json';
  const copilotStandalone = '.github/hooks/security.json';
  const copilotSecondStandalone = '.github/hooks/format.json';
  const copilotSettings = '.github/copilot/settings.json';
  const unreadable = '.github/hooks/draft.json';

  // Codex's standalone form: the file whose whole purpose is hooks, with the
  // documented optional description beside its event map.
  write(
    root,
    codexStandalone,
    `${JSON.stringify(
      {
        description: 'Repository lifecycle hooks for the unified fixture.',
        hooks: {
          SessionStart: [
            {
              matcher: 'startup|resume',
              hooks: [
                {
                  type: 'command',
                  command:
                    'python3 "$(git rev-parse --show-toplevel)/.codex/hooks/session_start.py"',
                  statusMessage: 'Loading session notes',
                },
              ],
            },
          ],
          PreToolUse: [
            {
              matcher: '^Bash$',
              hooks: [
                {
                  type: 'command',
                  // The credential and environment-reference case: neither may
                  // reach an inventory row or be resolved (FR-026, FR-027).
                  command: `curl -H "Authorization: Bearer ${FIXTURE_SECRET_LITERAL}" ${FIXTURE_ENVIRONMENT_REFERENCE}/policy`,
                  timeout: 30,
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The inline form of the same layer, which Codex loads beside the standalone
  // file rather than instead of it — the same-layer case that puts two Codex
  // declarations of `SessionStart` on one row.
  write(
    root,
    codexInline,
    [
      '# Codex project configuration for the unified hook fixture.',
      'model = "gpt-5.4-codex"',
      '',
      '[mcp_servers.context7]',
      'command = "npx"',
      'args = ["-y", "@upstash/context7-mcp"]',
      '',
      ...CODEX_INLINE_HOOKS_TOML,
    ].join('\n'),
  );
  // The shared settings document: one physical file, one read, and a hook
  // recognition for each product that documents reading it.
  write(
    root,
    sharedSettings,
    `${JSON.stringify(
      {
        permissions: { allow: ['Bash(git status)'], deny: ['Bash(rm -rf *)'] },
        hooks: {
          PreToolUse: [
            {
              matcher: 'Bash',
              hooks: [
                {
                  type: 'command',
                  command: '"${CLAUDE_PROJECT_DIR}"/.claude/hooks/block-rm.sh',
                  timeout: 30,
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The personal document beside it, declaring the event two other carriers
  // declare as well: one row, five declarations, four reads.
  write(
    root,
    sharedLocalSettings,
    `${JSON.stringify(
      {
        hooks: {
          SessionStart: [
            {
              hooks: [
                {
                  type: 'command',
                  command: '"${CLAUDE_PROJECT_DIR}"/.claude/hooks/announce.sh',
                  statusMessage: 'Announcing the session',
                },
              ],
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // Copilot's hook files, in the CLI's own event spelling.
  write(
    root,
    copilotStandalone,
    `${JSON.stringify(
      {
        version: 1,
        description: 'Repository policy hooks.',
        hooks: {
          preToolUse: [
            {
              type: 'command',
              bash: './.github/hooks/scripts/check-policy.sh',
              powershell: 'pwsh -File .github/hooks/scripts/check-policy.ps1',
              timeoutSec: 20,
            },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    copilotSecondStandalone,
    `${JSON.stringify(
      {
        version: 1,
        hooks: {
          // Also declared by the file above: two hook files, one event row.
          preToolUse: [{ type: 'command', command: 'npx prettier --check .' }],
          postToolUse: [{ type: 'command', command: 'npx prettier --write .' }],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The CLI's own settings document, whose inline block the editor documents no
  // read of — which is why its row names the CLI surface alone.
  write(
    root,
    copilotSettings,
    `${JSON.stringify(
      {
        companyAnnouncements: ['Run the policy hooks before pushing.'],
        hooks: {
          postToolUse: [
            { type: 'command', command: './.github/hooks/scripts/record-edit.sh', timeoutSec: 10 },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  // The unreadable carrier: an unterminated object, which every reader of this
  // location rejects — the editor parses these files as JSONC and the CLI
  // strictly, and neither accepts a document that simply stops. The extraction
  // fails all-or-nothing, so the closing row states unknown events rather than
  // none and the generation is partial (FR-028).
  write(root, unreadable, ['{', '  "version": 1,', '  "hooks": {', ''].join('\n'));

  // The five accepted owners that declare hooks and publish no hook row.
  write(
    root,
    '.claude/skills/release-notes/SKILL.md',
    [
      '---',
      'name: release-notes',
      'description: Draft release notes from merged pull requests.',
      'hooks:',
      '  PreToolUse:',
      '    - matcher: Bash',
      '      hooks:',
      '        - type: command',
      '          command: ./scripts/security-check.sh',
      '---',
      '',
      'Draft the notes from the merged pull requests.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.claude/agents/reviewer.md',
    [
      '---',
      'name: reviewer',
      'description: Review a diff for correctness.',
      'hooks:',
      '  PostToolUse:',
      '    - matcher: Edit',
      '      hooks:',
      '        - type: command',
      '          command: ./scripts/review-edit.sh',
      '---',
      '',
      'Review the diff and report what would break.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/agents/reviewer.md',
    [
      '---',
      'name: reviewer',
      'description: Review a diff before it is pushed.',
      'hooks:',
      '  PostToolUse:',
      '    - type: command',
      '      command: ./.github/hooks/scripts/review-edit.sh',
      '---',
      '',
      'Review the diff and report what would break.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.claude/skills/toolkit/.claude-plugin/plugin.json',
    `${JSON.stringify(
      {
        name: 'toolkit',
        version: '1.2.0',
        hooks: {
          SessionEnd: [
            { hooks: [{ type: 'command', command: '"${CLAUDE_PLUGIN_ROOT}"/scripts/cleanup.sh' }] },
          ],
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.claude-plugin/marketplace.json',
    `${JSON.stringify(
      {
        name: 'shared-tools',
        owner: { name: 'The fixture team' },
        plugins: [
          {
            name: 'formatter',
            source: './plugins/formatter',
            hooks: {
              PostToolUse: [
                { hooks: [{ type: 'command', command: './plugins/formatter/format.sh' }] },
              ],
            },
          },
        ],
      },
      null,
      2,
    )}\n`,
  );

  // The handler scripts the declarations name, and one no declaration names. A
  // declared path gains no read authority and becomes no candidate (FR-004,
  // FR-024), and an unreferenced script is never inferred to be a hook (FR-034).
  write(root, '.codex/hooks/session_start.py', 'print("fixture hook")\n');
  write(root, '.codex/hooks/user_prompt_submit.py', 'print("fixture hook")\n');
  write(root, '.claude/hooks/block-rm.sh', 'echo blocked\n');
  write(root, '.claude/hooks/announce.sh', 'echo announcing\n');
  write(root, '.claude/hooks/unreferenced.sh', 'echo "no declaration names this file"\n');
  write(root, '.github/hooks/scripts/check-policy.sh', 'echo policy\n');
  write(root, '.github/hooks/scripts/check-policy.ps1', 'Write-Output policy\n');
  write(root, '.github/hooks/scripts/record-edit.sh', 'echo edit\n');
  write(root, '.github/hooks/scripts/review-edit.sh', 'echo review\n');
  // Near miss: the documented Copilot lookup loads the hook directory's own
  // `*.json` files, not a subtree.
  write(root, '.github/hooks/nested/deep.json', '{ "version": 1, "hooks": {} }\n');
  // Near miss: a plugin's own bundled hooks belong to the plugin's row.
  write(root, 'plugins/formatter/hooks/hooks.json', '{ "hooks": { "SessionEnd": [] } }\n');
  // Near miss: the container and terminal literals are exact.
  write(root, '.codex/hook.json', 'singular container\n');
  write(root, '.github/hook/security.json', 'singular container\n');
  write(root, 'hooks/security.json', 'no .github above it\n');
  write(root, '.claude/hooks.json', 'a location this vendor documents nowhere\n');
  // The User layers these rules may never read, spelled inside the repository.
  write(root, 'home/.codex/hooks.json', 'user layer\n');
  write(root, 'home/.claude/settings.json', 'user layer\n');
  write(root, 'home/.copilot/hooks/personal.json', 'user layer\n');
  // An unrelated file sharing no segment with any selector.
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    carriers: {
      codexStandalone,
      codexInline,
      sharedSettings,
      sharedLocalSettings,
      copilotStandalone,
      copilotSecondStandalone,
      copilotSettings,
      unreadable,
    },
    nonPublishingOwners: [
      '.claude-plugin/marketplace.json',
      '.claude/agents/reviewer.md',
      '.claude/skills/release-notes/SKILL.md',
      '.claude/skills/toolkit/.claude-plugin/plugin.json',
      '.github/agents/reviewer.md',
    ],
    expectedEventsByCarrier: {
      [codexStandalone]: ['SessionStart', 'PreToolUse'],
      [codexInline]: ['SessionStart', 'UserPromptSubmit'],
      [sharedSettings]: ['PreToolUse'],
      [sharedLocalSettings]: ['SessionStart'],
      [copilotStandalone]: ['preToolUse'],
      [copilotSecondStandalone]: ['preToolUse', 'postToolUse'],
      [copilotSettings]: ['postToolUse'],
    },
    sharedFileEvent: 'PreToolUse',
    crossVendorEvent: 'SessionStart',
    nearMissPaths: [
      '.claude/hooks.json',
      '.claude/hooks/announce.sh',
      '.claude/hooks/block-rm.sh',
      '.claude/hooks/unreferenced.sh',
      '.codex/hook.json',
      '.codex/hooks/session_start.py',
      '.codex/hooks/user_prompt_submit.py',
      '.github/hook/security.json',
      '.github/hooks/nested/deep.json',
      '.github/hooks/scripts/check-policy.ps1',
      '.github/hooks/scripts/check-policy.sh',
      '.github/hooks/scripts/record-edit.sh',
      '.github/hooks/scripts/review-edit.sh',
      'README.md',
      'home/.claude/settings.json',
      'home/.codex/hooks.json',
      'home/.copilot/hooks/personal.json',
      'hooks/security.json',
    ],
    pluginBundledHookPaths: ['plugins/formatter/hooks/hooks.json'],
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
   * shipped rule admits — a plugin manifest. They must produce no candidate,
   * no recognition, and no row: an owner adapter is dispatched only on an
   * independently admitted owner. Two files this fixture also writes are not
   * among them any more, each for the same reason: `claude.repo.permissions`
   * admits the settings file for the policy it may declare and
   * `claude.repo.agent` admits the agent file for the agent it defines, and
   * both candidacies are their own kind's rather than an MCP one.
   */
  readonly unadmittedOwnerPaths: readonly string[];
  /**
   * The admitted custom-agent file whose frontmatter spells `mcpServers`. It
   * is a candidate of the `agent` kind and gains no MCP recognition: an MCP
   * declaration's home is an explicit carrier (data-model.md § Inventory
   * unit).
   */
  readonly mcpFrontmatterAgentPath: string;
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

  // A future owner family carrying declarations no shipped rule admits: an
  // owner adapter grants no read authority, so it produces no candidate, no
  // recognition, and no row. The settings and agent files written beside it
  // are admitted by their own kinds' rules and still reach no MCP surface.
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
    unadmittedOwnerPaths: ['.claude-plugin/plugin.json'],
    mcpFrontmatterAgentPath: '.claude/agents/reviewer.md',
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
          // The empty declared name, which strict JSON accepts as a key: the
          // row, the detail, and the comparison all note it rather than
          // drawing nothing where the name goes (FR-025). Declared in two
          // carriers, because the note has to be reachable on a comparison
          // and a comparison needs a pair.
          '': { command: 'npx', args: ['-y', 'unnamed-mcp'] },
        },
      },
      null,
      2,
    )}\n`,
  );
  // The bare-schema CLI spelling re-declares the shared name — and `tickets`,
  // which the VS Code carrier below re-declares too: two Copilot carriers of
  // one name, so that row's Repository block holds a pair of its own. The
  // spelling pairs with the Global homes fixture, whose Codex config and
  // Copilot mcp-config declare the same name
  // (tests/fixtures/global-homes/build-fixtures.ts; T1140, FR-030).
  write(
    root,
    '.github/mcp.json',
    `{ "gh-actions": { "command": "npx" }, "${sharedServerName}": { "command": "gh" }, "tickets": { "command": "npx" }, "": { "command": "npx", "args": ["-y", "unnamed-mcp-cli"] } }\n`,
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
    "tickets": { "command": "npx" },
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
      // `.github/agents/deploy.md` is not here for the same reason:
      // `copilot.repo.agent` admits it for the agent it defines, so its
      // `mcp-servers` block is that agent's own declared content and still no
      // MCP row, which the MCP rows this fixture asserts show.
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
/** One built Codex custom-agent fixture repository (T507). */
export interface CodexAgentFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `codex.repo.agent` allowlist must admit,
   * sorted. Capability-gated members are present only when the corresponding
   * capability is.
   */
  readonly expectedAgentPaths: readonly string[];
  /**
   * The agent names the admitted files declare, sorted — the named rows of the
   * custom-agent inventory. A name two files declare appears once: the row is
   * the name, and both files are its definitions.
   */
  readonly expectedAgentNames: readonly string[];
  /**
   * The admitted files publishing no declared name, sorted — the members of
   * the one null-named row: a file declaring no `name`, a file declaring one
   * that is not a scalar, and the malformed file whose declarations could not
   * be read at all.
   */
  readonly unnamedAgentPaths: readonly string[];
  /**
   * The admitted file whose TOML cannot be parsed: its recognition fails
   * all-or-nothing, so it keeps its complete readable source and carries a
   * `recognition-parse-failed` diagnostic (FR-028).
   */
  readonly malformedAgentPath: string;
  /**
   * The admitted file whose declarations spell an `[mcp_servers.*]` table.
   * It joins no MCP inventory row: an MCP declaration's home is an explicit
   * carrier, and this block is the agent file's own content
   * (data-model.md § Inventory unit).
   */
  readonly mcpSpellingAgentPath: string;
  /**
   * Paths no shipped rule or derivation of any product may admit: the nested
   * subdirectory below the root's `.codex/agents/`, the subdirectory
   * `.codex/agents` belonging to a runtime chain member this product does not
   * select, and spelling variants one step from the matcher's literals.
   *
   * The User scope (`<CODEX_HOME>/agents/*.toml`) has no entry here because it
   * has no repository path at all: it lies outside every inspected Source, and
   * `codex.behavior.user.agents` records it without authorizing a read.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Codex custom-agent fixture repository (T507).
 *
 * Positive cases: two direct-child agents declaring distinct names, two more
 * declaring one shared name — the duplicate-name row — an agent that declares
 * a literal credential and a literal environment reference beside an
 * `[mcp_servers.*]` table and two arbitrary configured paths, an agent
 * declaring no `name`, an agent declaring a `name` that is a list rather than
 * a scalar, a malformed TOML file, and a linked agent file where the platform
 * materializes links.
 *
 * Near misses: a nested subdirectory below the root's `.codex/agents/` (the
 * page documents no recursion), the subdirectory `.codex/agents` a runtime
 * `cwd` below the root would reach — which re-declares a root agent name, so a
 * duplicate in an unadmitted layer provably contributes nothing — and spelling
 * variants beside the matcher's literals.
 *
 * The credential and the environment reference are here so a test can prove
 * they reach no inventory summary, are never masked on the detail, and are
 * never resolved (FR-025, FR-026). The configured paths are here so a test can
 * prove no target is opened: a declared path never gains read authority and
 * creates no candidate.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCodexAgentFixture(
  prefix = 'inspector-codex-agents',
  root = createRepositoryFixtureRoot(prefix),
): CodexAgentFixture {
  write(
    root,
    '.codex/agents/pr-explorer.toml',
    [
      'name = "pr_explorer"',
      'description = "Read-only codebase explorer."',
      'model = "gpt-5.3-codex-spark"',
      'model_reasoning_effort = "medium"',
      'sandbox_mode = "read-only"',
      'developer_instructions = """',
      'Stay in exploration mode.',
      'Cite files and symbols.',
      '"""',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.codex/agents/reviewer.toml',
    [
      'name = "reviewer"',
      'description = "PR reviewer focused on correctness."',
      'developer_instructions = "Review code like an owner."',
      '',
    ].join('\n'),
  );
  // The duplicate-name row: two files declare `docs_researcher`, so the
  // inventory shows one row with two definitions. The vendor makes the
  // declared name the identity, so the differing file names change nothing.
  write(
    root,
    '.codex/agents/docs-researcher.toml',
    [
      'name = "docs_researcher"',
      'description = "Documentation specialist."',
      'developer_instructions = "Verify APIs against the docs."',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.codex/agents/docs-researcher-2.toml',
    [
      'name = "docs_researcher"',
      'description = "Second file declaring the same agent name."',
      'developer_instructions = "Confirm framework behavior."',
      '',
    ].join('\n'),
  );
  // An agent spelling MCP configuration, a literal credential, a literal
  // environment reference, and two arbitrary configured paths. None of them
  // becomes an MCP row, a resolved value, or a candidate.
  write(
    root,
    '.codex/agents/secretive.toml',
    [
      'name = "secretive"',
      'description = "Declares a credential, an environment reference, and configured paths."',
      'developer_instructions = "Use the docs server."',
      'config_file = "./.codex/agents/shared.toml"',
      '',
      '[[skills.config]]',
      'path = "./.agents/skills/deploy"',
      '',
      '[mcp_servers.docs]',
      'url = "https://docs.example.com/mcp"',
      '',
      '[mcp_servers.docs.env]',
      `API_KEY = "${FIXTURE_SECRET_LITERAL}"`,
      `ENDPOINT = "${FIXTURE_ENVIRONMENT_REFERENCE}"`,
      '',
    ].join('\n'),
  );
  // Declares no `name`: the vendor requires one, so the file publishes no
  // agent name and joins the null-named row rather than being named after its
  // path.
  write(
    root,
    '.codex/agents/nameless.toml',
    [
      'description = "Declares no name at all."',
      'developer_instructions = "Do the work."',
      '',
    ].join('\n'),
  );
  // Declares a `name` that is a list: a rendering exists, but naming the agent
  // after a list's first item would be an identity the file never declared, so
  // this file joins the null-named row too.
  write(
    root,
    '.codex/agents/listed-name.toml',
    ['name = ["one", "two"]', 'description = "Declares a non-scalar name."', ''].join('\n'),
  );
  // Malformed TOML: the recognition fails all-or-nothing, the file keeps its
  // complete readable source, and its diagnostic says the declarations could
  // not be read (FR-028).
  write(root, '.codex/agents/broken.toml', 'name = "broken\nthis is not TOML = [\n');

  // Near miss: the nested subdirectory below the root's own agents directory.
  // The page names `.codex/agents/` and documents no recursion, so admitting
  // this would rest on a search no official text establishes.
  write(
    root,
    '.codex/agents/team/nested.toml',
    ['name = "nested"', 'description = "One directory too deep."', ''].join('\n'),
  );
  // Near miss: the subdirectory `.codex/agents` belongs to a runtime chain
  // member this product does not select. It re-declares a root agent name, so
  // a duplicate in an unadmitted layer provably contributes nothing.
  write(
    root,
    'packages/api/.codex/agents/reviewer.toml',
    ['name = "reviewer"', 'description = "Not the selected root\'s agent."', ''].join('\n'),
  );
  // Near misses: spelling variants one step from the matcher's literals.
  write(root, '.codex/agents/reviewer.toml.bak', 'name = "backup suffix"\n');
  write(root, '.codex/agents/reviewer.yaml', 'name: wrong extension\n');
  write(root, '.codex/agent/reviewer.toml', 'name = "singular directory"\n');
  write(root, 'codex/agents/reviewer.toml', 'name = "dotless directory"\n');
  write(root, 'README.md', 'unrelated\n');

  // The link case: an agent file reached through a symbolic link is the file
  // it resolves to, read through the link like every other candidate (FR-024).
  const linkedAgentPath = '.codex/agents/linked.toml';
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(
        root,
        'fixtures/linked-agent.toml',
        ['name = "linked"', 'description = "Reached through a symbolic link."', ''].join('\n'),
      );
    },
    () => {
      symlinkSync(join(root, 'fixtures/linked-agent.toml'), join(root, linkedAgentPath));
    },
    [linkedAgentPath],
  );

  return {
    root,
    capabilities: { symlinks },
    expectedAgentPaths: [
      '.codex/agents/broken.toml',
      '.codex/agents/docs-researcher-2.toml',
      '.codex/agents/docs-researcher.toml',
      ...(symlinks ? [linkedAgentPath] : []),
      '.codex/agents/listed-name.toml',
      '.codex/agents/nameless.toml',
      '.codex/agents/pr-explorer.toml',
      '.codex/agents/reviewer.toml',
      '.codex/agents/secretive.toml',
    ].toSorted(),
    expectedAgentNames: [
      'docs_researcher',
      ...(symlinks ? ['linked'] : []),
      'pr_explorer',
      'reviewer',
      'secretive',
    ].toSorted(),
    unnamedAgentPaths: [
      '.codex/agents/broken.toml',
      '.codex/agents/listed-name.toml',
      '.codex/agents/nameless.toml',
    ],
    malformedAgentPath: '.codex/agents/broken.toml',
    mcpSpellingAgentPath: '.codex/agents/secretive.toml',
    nearMissPaths: [
      '.codex/agent/reviewer.toml',
      '.codex/agents/reviewer.toml.bak',
      '.codex/agents/reviewer.yaml',
      '.codex/agents/team/nested.toml',
      'codex/agents/reviewer.toml',
      'packages/api/.codex/agents/reviewer.toml',
    ],
  };
}

/** One built Claude subagent fixture repository (T527). */
export interface ClaudeAgentFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** Which capability-gated cases exist; see {@link RepositoryFixtureCapabilities}. */
  readonly capabilities: RepositoryFixtureCapabilities;
  /**
   * Every Source-relative Path the `claude.repo.agent` allowlist must admit,
   * sorted — the root's own `.claude/agents/` subtree at every depth.
   * Capability-gated members are present only when the corresponding
   * capability is.
   */
  readonly expectedAgentPaths: readonly string[];
  /**
   * The agent names the admitted files declare, sorted — the rows Claude
   * Code's own recognitions head. A name two files declare appears once: the
   * row is the name, and both files are its definitions, which is how the
   * inventory shows a duplicate the vendor resolves by filesystem read order.
   */
  readonly expectedAgentNames: readonly string[];
  /**
   * The agent names Copilot's own rule resolves in this tree, sorted:
   * `copilot.repo.agent` names `.claude/agents/` as one of the two directories
   * it loads project agents from and identifies each by its configuration
   * file's own name, so every direct child's stem is a row — including the
   * files that declare no usable `name` at all, which have a Copilot row while
   * their Claude recognition joins the null one. The nested files are absent:
   * no Copilot page documents a subfolder inside an agents directory.
   */
  readonly expectedCopilotAgentNames: readonly string[];
  /**
   * The admitted files publishing no declared name, sorted: one declaring
   * none — which the vendor documents as a file it treats as documentation
   * beside the agents — and the malformed one whose frontmatter could not be
   * read at all.
   */
  readonly unnamedAgentPaths: readonly string[];
  /**
   * The admitted file whose frontmatter cannot be parsed: its recognition
   * fails all-or-nothing, so it keeps its complete readable source and carries
   * a `recognition-parse-failed` diagnostic (FR-028).
   */
  readonly malformedAgentPath: string;
  /**
   * The admitted file whose frontmatter spells an `mcpServers` block beside a
   * literal credential and a literal environment reference. It joins no MCP
   * inventory row: an MCP declaration's home is an explicit carrier, and this
   * block is the agent file's own content (data-model.md § Inventory unit).
   */
  readonly mcpFrontmatterAgentPath: string;
  /**
   * The admitted file declaring `memory: project`, a `skills` preload list,
   * and an agent reference. All three are inert values: no memory directory is
   * read, no skill is preloaded, and no agent is resolved.
   */
  readonly referencingAgentPath: string;
  /**
   * Paths no shipped rule or derivation of any product may admit: the two
   * agent-memory directories a running subagent writes, the subdirectory
   * `.claude/agents` belonging to a runtime chain member this product does not
   * select, the `--add-dir` directory a runtime could contribute, and spelling
   * variants one step from the matcher's literals.
   *
   * The User scope (`<claude-config-dir>/agents/`) has no entry here because
   * it has no repository path at all: it lies outside every inspected Source,
   * and `claude.behavior.user.agents` records it without authorizing a read.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Claude subagent fixture repository (T527).
 *
 * Positive cases: a root direct child, an agent one subfolder deep — the page
 * states `.claude/agents/` is scanned recursively and that the subfolder path
 * does not affect identity — two files in one tree declaring one name, an
 * agent whose frontmatter spells `mcpServers` beside a literal credential and
 * a literal environment reference, an agent declaring a memory scope, a skill
 * preload list, and an agent reference, an agent declaring no `name`, a
 * malformed frontmatter block, and a linked agent file where the platform
 * materializes links.
 *
 * Near misses: the `agent-memory` and `agent-memory-local` directories a
 * running subagent writes — runtime state rather than authored
 * customization — the subdirectory `.claude/agents` a runtime `cwd` below the
 * root would reach, the extra directory a `--add-dir` run would contribute,
 * and spelling variants beside the matcher's literals.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildClaudeAgentFixture(
  prefix = 'inspector-claude-agents',
  root = createRepositoryFixtureRoot(prefix),
): ClaudeAgentFixture {
  write(
    root,
    '.claude/agents/code-reviewer.md',
    [
      '---',
      'name: code-reviewer',
      'description: Reviews code for quality and best practices',
      'tools: Read, Glob, Grep',
      'model: sonnet',
      '---',
      '',
      '# Code reviewer',
      '',
      'Analyze the code and provide specific, actionable feedback.',
      '',
    ].join('\n'),
  );
  // One subfolder deep: the page states the directory is scanned recursively
  // and that the subfolder path does not affect how a subagent is identified.
  write(
    root,
    '.claude/agents/review/security.md',
    [
      '---',
      'name: security-reviewer',
      'description: Looks for security risks',
      '---',
      '',
      'Review for injection, secrets, and unsafe defaults.',
      '',
    ].join('\n'),
  );
  // The duplicate-name row: two files under one `.claude/agents/` tree declare
  // `debugger`, which the vendor loads by filesystem read order rather than a
  // documented precedence. The inventory lists both and states no winner.
  write(
    root,
    '.claude/agents/debugger.md',
    [
      '---',
      'name: debugger',
      'description: Debugs failures',
      '---',
      '',
      'Find root causes.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.claude/agents/research/debugger.md',
    [
      '---',
      'name: debugger',
      'description: A second file under the same tree declaring one name',
      '---',
      '',
      'Reproduce first.',
      '',
    ].join('\n'),
  );
  // An agent spelling MCP configuration, a literal credential, and a literal
  // environment reference. None becomes an MCP row, a resolved value, or a
  // candidate.
  write(
    root,
    '.claude/agents/browser-tester.md',
    [
      '---',
      'name: browser-tester',
      'description: Tests features in a real browser',
      'mcpServers:',
      '  - playwright:',
      '      type: stdio',
      '      command: npx',
      '      args: ["-y", "@playwright/mcp@latest"]',
      '      env:',
      `        API_KEY: ${FIXTURE_SECRET_LITERAL}`,
      `        ENDPOINT: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      '  - github',
      '---',
      '',
      'Use the Playwright tools to navigate and screenshot.',
      '',
    ].join('\n'),
  );
  // A memory scope, a skill preload list, and an agent reference: three inert
  // values. No memory directory is read, no skill is preloaded, and no agent
  // is resolved.
  write(
    root,
    '.claude/agents/api-developer.md',
    [
      '---',
      'name: api-developer',
      'description: Implements API endpoints',
      'memory: project',
      'skills:',
      '  - api-conventions',
      '  - error-handling-patterns',
      '---',
      '',
      'Follow the preloaded conventions. Hand findings to @code-reviewer.',
      '',
    ].join('\n'),
  );
  // Declares no `name`: the vendor documents treating such a file as
  // documentation kept beside the agents, so it publishes no agent name and
  // joins the row that says so rather than being named after its path.
  write(
    root,
    '.claude/agents/README.md',
    [
      '---',
      'description: Notes kept beside the agents',
      '---',
      '',
      'How we write agents.',
      '',
    ].join('\n'),
  );
  // Malformed frontmatter: the recognition fails all-or-nothing, the file
  // keeps its complete readable source, and its diagnostic says the
  // declarations could not be read (FR-028).
  write(root, '.claude/agents/broken.md', '---\nname: [unterminated\n---\n\n# Broken\n');

  // Near miss: the memory directories a running subagent writes. They hold
  // that session's accumulated notes rather than an authored customization.
  write(root, '.claude/agent-memory/code-reviewer/MEMORY.md', '# Remembered patterns\n');
  write(root, '.claude/agent-memory-local/code-reviewer/MEMORY.md', '# Local notes\n');
  // Near miss: the subdirectory `.claude/agents` belongs to a runtime working
  // directory this product does not select. It re-declares a root agent name,
  // so a duplicate in an unadmitted layer provably contributes nothing.
  write(
    root,
    'packages/api/.claude/agents/code-reviewer.md',
    ['---', 'name: code-reviewer', 'description: Not the selected root', '---', '', 'x', ''].join(
      '\n',
    ),
  );
  // Near miss: the extra directory a `--add-dir` run would contribute is a
  // runtime input this product never turns into a scan root.
  write(
    root,
    'extra/.claude/agents/helper.md',
    ['---', 'name: helper', 'description: Reached only through --add-dir', '---', '', 'x', ''].join(
      '\n',
    ),
  );
  // Near misses: the extension and the container literals are exact.
  write(root, '.claude/agents/code-reviewer.md.bak', 'backup suffix\n');
  write(root, '.claude/agents/code-reviewer.txt', 'wrong extension\n');
  write(root, '.claude/agent/code-reviewer.md', 'singular directory\n');
  write(root, 'claude/agents/code-reviewer.md', 'dotless directory\n');
  write(root, 'README.md', 'unrelated\n');

  // The link case: an agent file reached through a symbolic link is the file
  // it resolves to, read through the link like every other candidate (FR-024).
  const linkedAgentPath = '.claude/agents/linked.md';
  const symlinks = tryMaterializeSymlinks(
    root,
    () => {
      write(
        root,
        'fixtures/linked-agent.md',
        [
          '---',
          'name: linked',
          'description: Reached through a symbolic link',
          '---',
          '',
          'x',
          '',
        ].join('\n'),
      );
    },
    () => {
      symlinkSync(join(root, 'fixtures/linked-agent.md'), join(root, linkedAgentPath));
    },
    [linkedAgentPath],
  );

  return {
    root,
    capabilities: { symlinks },
    expectedAgentPaths: [
      '.claude/agents/README.md',
      '.claude/agents/api-developer.md',
      '.claude/agents/broken.md',
      '.claude/agents/browser-tester.md',
      '.claude/agents/code-reviewer.md',
      '.claude/agents/debugger.md',
      ...(symlinks ? [linkedAgentPath] : []),
      '.claude/agents/research/debugger.md',
      '.claude/agents/review/security.md',
    ].toSorted(),
    expectedAgentNames: [
      'api-developer',
      'browser-tester',
      'code-reviewer',
      'debugger',
      ...(symlinks ? ['linked'] : []),
      'security-reviewer',
    ].toSorted(),
    expectedCopilotAgentNames: [
      'README',
      'api-developer',
      'broken',
      'browser-tester',
      'code-reviewer',
      'debugger',
      ...(symlinks ? ['linked'] : []),
    ].toSorted(),
    unnamedAgentPaths: ['.claude/agents/README.md', '.claude/agents/broken.md'],
    malformedAgentPath: '.claude/agents/broken.md',
    mcpFrontmatterAgentPath: '.claude/agents/browser-tester.md',
    referencingAgentPath: '.claude/agents/api-developer.md',
    nearMissPaths: [
      '.claude/agent-memory-local/code-reviewer/MEMORY.md',
      '.claude/agent-memory/code-reviewer/MEMORY.md',
      '.claude/agent/code-reviewer.md',
      '.claude/agents/code-reviewer.md.bak',
      '.claude/agents/code-reviewer.txt',
      'claude/agents/code-reviewer.md',
      'extra/.claude/agents/helper.md',
      'packages/api/.claude/agents/code-reviewer.md',
    ],
  };
}

/** One built Copilot custom-agent fixture repository (T546). */
export interface CopilotAgentFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /**
   * Every Source-relative Path the `copilot.repo.agent` allowlist must admit,
   * sorted — the direct children of the root's own `.github/agents/` and
   * `.claude/agents/`, both `.md` spellings among them.
   */
  readonly expectedAgentPaths: readonly string[];
  /**
   * The agent names Copilot resolves for those files, sorted: the
   * configuration file's own name minus `.agent.md` or `.md`, which is what
   * the shared profile reference documents Copilot deduplicates agents by. A
   * name two files resolve to appears once — the row is the name, and both
   * files are its definitions.
   */
  readonly expectedAgentNames: readonly string[];
  /**
   * The `.claude/agents/*.md` direct child both products define an agent from:
   * Claude Code's subagent by its declared `name`, Copilot's agent profile by
   * the file's own name. One physical file, one read, two rows.
   */
  readonly sharedClaudeAgentPath: string;
  /** The name that file's Claude Code recognition heads its own row with. */
  readonly sharedClaudeAgentDeclaredName: string;
  /**
   * The `.claude/agents/` file one subfolder deep: Claude Code documents the
   * subtree as recursive and admits it, while no Copilot page documents a
   * subfolder inside an agents directory, so `copilot.repo.agent` does not.
   * It is not a {@link nearMissPaths} member for that reason — a shipped rule
   * does admit it, just not Copilot's.
   */
  readonly claudeOnlyAgentPath: string;
  /**
   * The two files whose names collide: the `.agent.md` Cloud spelling and the
   * plain `.md` one reduce to the same name, so they are two definitions of
   * one row with no winner stated — the reference documents deduplication
   * between levels and says nothing about two files of one level.
   */
  readonly duplicateNameAgentPaths: readonly string[];
  /**
   * The admitted file whose frontmatter cannot be parsed: its recognition
   * fails all-or-nothing, so it keeps its complete readable source and carries
   * a `recognition-parse-failed` diagnostic (FR-028). Its row name is
   * unaffected, because the path is what names a Copilot agent.
   */
  readonly malformedAgentPath: string;
  /**
   * The admitted file whose frontmatter spells an `mcp-servers` block beside a
   * literal credential and a literal environment reference, and names another
   * agent in its body. All of it is the agent's own content: it joins no MCP
   * inventory row, resolves no reference, and opens no handoff target
   * (data-model.md § Inventory unit, FR-025, FR-026).
   */
  readonly mcpFrontmatterAgentPath: string;
  /**
   * Paths no shipped rule or derivation of any product may admit: a subfolder
   * inside `.github/agents/`, the repository-local spelling of the CLI User
   * scope, the subdirectory `.github` layer belonging to a runtime chain
   * member this product does not select, the `--add-dir` directory a runtime
   * could contribute, and spelling variants one step from the matcher's
   * literals.
   *
   * The User scope (`~/.copilot/agents/`) and the hosted organization and
   * enterprise scopes have no entry here because they have no repository path
   * at all: `copilot.behavior.cli.user.agents` and
   * `copilot.behavior.cloud.organization-agents` record them without
   * authorizing a read, and the latter has no origin file anywhere.
   */
  readonly nearMissPaths: readonly string[];
}

/**
 * Builds the canonical Copilot custom-agent fixture repository (T546).
 *
 * Positive cases: direct children of both documented directories, the
 * `.agent.md` Cloud filename variant, two files whose names collide once the
 * suffix is removed, a `.claude/agents/*.md` two products define an agent
 * from, a profile declaring no `name` at all — which Copilot still names, from
 * the file — an `mcp-servers` block beside a literal credential and a literal
 * environment reference, a body naming another agent, and a malformed
 * frontmatter block.
 *
 * Near misses: a subfolder inside an agents directory, the repository-local
 * `.copilot/agents/` spelling of the CLI's User scope, the subdirectory
 * `.github` layer a runtime `cwd` below the root would reach, the extra
 * directory a `--add-dir` run would contribute, and spelling variants beside
 * the matcher's literals.
 *
 * `root` overrides where the tree is written; the default is a fresh root
 * under the OS temporary directory. The dev fixture launcher
 * (`scripts/serve-fixture.ts`) passes a repo-local git-ignored directory.
 */
export function buildCopilotAgentFixture(
  prefix = 'inspector-copilot-agents',
  root = createRepositoryFixtureRoot(prefix),
): CopilotAgentFixture {
  write(
    root,
    '.github/agents/planner.md',
    [
      '---',
      'name: Release planner',
      'description: Plans a release and hands the work out',
      'target: github-copilot',
      'tools:',
      '  - read',
      '  - search',
      'model: gpt-5.3',
      'user-invocable: true',
      '---',
      '',
      '# Release planner',
      '',
      'Draft the plan, then hand the review to @reviewer.',
      '',
    ].join('\n'),
  );
  // The Cloud filename variant and the plain spelling of one name: both reduce
  // to `reviewer`, so they are two definitions of one row.
  write(
    root,
    '.github/agents/reviewer.agent.md',
    [
      '---',
      'name: Code reviewer',
      'description: Reviews a pull request',
      'target: vscode',
      'disable-model-invocation: true',
      '---',
      '',
      'Review like an owner.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/agents/reviewer.md',
    [
      '---',
      'description: A second file of the same name at the same level',
      '---',
      '',
      'The reference documents deduplication between levels, not within one.',
      '',
    ].join('\n'),
  );
  // An agent spelling MCP configuration, a literal credential, a literal
  // environment reference, and a handoff. None becomes an MCP row, a resolved
  // value, or an opened target.
  write(
    root,
    '.github/agents/deployer.md',
    [
      '---',
      'name: Deployer',
      'description: Runs a deployment',
      'mcp-servers:',
      '  deploy-mcp:',
      '    type: local',
      '    command: npx',
      '    args: ["-y", "@example/deploy-mcp"]',
      '    env:',
      `      API_KEY: ${FIXTURE_SECRET_LITERAL}`,
      `      ENDPOINT: ${FIXTURE_ENVIRONMENT_REFERENCE}`,
      'metadata:',
      '  owner: platform',
      '---',
      '',
      'Deploy, then hand the verification to @planner.',
      '',
    ].join('\n'),
  );
  // Declares no `name`: Copilot names it from the file anyway, so it heads a
  // row rather than joining the one that says the name is not known.
  write(
    root,
    '.github/agents/README.md',
    [
      '---',
      'description: Notes kept beside the agent profiles',
      '---',
      '',
      'How we write them.',
      '',
    ].join('\n'),
  );
  // Malformed frontmatter: the recognition fails all-or-nothing while the file
  // keeps its complete readable source and its row keeps the name the path
  // gives it (FR-028).
  write(root, '.github/agents/broken.md', '---\nname: [unterminated\n---\n\n# Broken\n');
  // The shared file: `copilot.repo.agent` names `.claude/agents/` as one of the
  // two directories it loads project agents from, so this direct child is
  // Claude Code's subagent and a Copilot agent profile alike — one read, two
  // recognitions, two differently named rows.
  write(
    root,
    '.claude/agents/copilot-shared.md',
    [
      '---',
      'name: shared-reviewer',
      'description: One file, two products',
      '---',
      '',
      'Review the change.',
      '',
    ].join('\n'),
  );
  // Claude's alone: its page documents the subtree as recursive, and no
  // Copilot page documents a subfolder inside an agents directory.
  write(
    root,
    '.claude/agents/nested/deep.md',
    ['---', 'name: deep-reviewer', 'description: One subfolder deep', '---', '', 'x', ''].join(
      '\n',
    ),
  );

  // Near miss: a subfolder inside `.github/agents/`, which no Copilot page
  // documents.
  write(
    root,
    '.github/agents/team/nested.md',
    ['---', 'name: nested', 'description: A subfolder no page documents', '---', '', 'x', ''].join(
      '\n',
    ),
  );
  // Near miss: the CLI's User scope is `~/.copilot/agents/`, a different
  // Source boundary. Its spelling inside a repository is admitted by nothing.
  write(root, '.copilot/agents/personal.md', '---\nname: personal\n---\n\nx\n');
  // Near miss: the subdirectory `.github` layer belongs to a runtime working
  // directory this product does not select. It re-declares a root agent's
  // file name, so a duplicate in an unadmitted layer provably contributes
  // nothing.
  write(
    root,
    'packages/api/.github/agents/planner.md',
    '---\nname: Not the selected root\n---\n\nx\n',
  );
  // Near miss: the extra directory a `--add-dir` run would contribute is a
  // runtime input this product never turns into a scan root.
  write(root, 'extra/.github/agents/helper.md', '---\nname: helper\n---\n\nx\n');
  // Near misses: the extension and the container literals are exact.
  write(root, '.github/agents/planner.md.bak', 'backup suffix\n');
  write(root, '.github/agents/planner.txt', 'wrong extension\n');
  write(root, '.github/agent/planner.md', 'singular directory\n');
  write(root, 'github/agents/planner.md', 'dotless directory\n');
  write(root, 'README.md', 'unrelated\n');

  return {
    root,
    expectedAgentPaths: [
      '.claude/agents/copilot-shared.md',
      '.github/agents/README.md',
      '.github/agents/broken.md',
      '.github/agents/deployer.md',
      '.github/agents/planner.md',
      '.github/agents/reviewer.agent.md',
      '.github/agents/reviewer.md',
    ].toSorted(),
    expectedAgentNames: [
      'README',
      'broken',
      'copilot-shared',
      'deployer',
      'planner',
      'reviewer',
    ].toSorted(),
    sharedClaudeAgentPath: '.claude/agents/copilot-shared.md',
    sharedClaudeAgentDeclaredName: 'shared-reviewer',
    claudeOnlyAgentPath: '.claude/agents/nested/deep.md',
    duplicateNameAgentPaths: ['.github/agents/reviewer.agent.md', '.github/agents/reviewer.md'],
    malformedAgentPath: '.github/agents/broken.md',
    mcpFrontmatterAgentPath: '.github/agents/deployer.md',
    nearMissPaths: [
      '.copilot/agents/personal.md',
      '.github/agent/planner.md',
      '.github/agents/planner.md.bak',
      '.github/agents/planner.txt',
      '.github/agents/team/nested.md',
      'extra/.github/agents/helper.md',
      'github/agents/planner.md',
      'packages/api/.github/agents/planner.md',
    ],
  };
}

/**
 * The general Codex configuration the all-kinds tree's carrier carries, so its
 * `settings/config` row opens a document a reader can recognize as one: a
 * comment, an underscored integer, a trust declaration, and configured paths
 * that gain no read authority.
 */
const CODEX_GENERAL_CONFIGURATION = [
  '',
  '# Codex project configuration for the all-kinds fixture repository.',
  'model = "gpt-5.4-codex"',
  'project_doc_max_bytes = 32_768',
  'approval_policy = "on-request"',
  '',
  '[projects."."]',
  'trust_level = "trusted"',
  '',
  '[experimental]',
  'model_instructions_file = "./.codex/model-instructions.md"',
  '',
].join('\n');

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
  /** The Claude output-style fixture's own result, built into this root. */
  readonly claudeOutputStyleFixture: ClaudeOutputStyleFixture;
  /** The Codex plugin fixture's own result, built into this root. */
  readonly codexPluginFixture: CodexPluginFixture;
  /** The Claude plugin fixture's own result, built into this root. */
  readonly claudePluginFixture: ClaudePluginFixture;
  /** The Copilot plugin fixture's own result, built into this root. */
  readonly copilotPluginFixture: CopilotPluginFixture;
  /** The Claude command fixture's own result, built into this root. */
  readonly commandFixture: CommandFixture;
  /** The Claude permission-policy fixture's own result, built into this root. */
  readonly claudePermissionsFixture: ClaudePermissionsFixture;
  /** The Codex custom-agent fixture's own result, built into this root. */
  readonly agentFixture: CodexAgentFixture;
  /** The Claude subagent fixture's own result, built into this root. */
  readonly claudeAgentFixture: ClaudeAgentFixture;
  /** The Copilot custom-agent fixture's own result, built into this root. */
  readonly copilotAgentFixture: CopilotAgentFixture;
  /** The all-vendor settings fixture's own result, built into this root. */
  readonly settingsFixture: CopilotSettingsFixture;
  /** The Codex hook tree: both documented forms at the one selected layer. */
  readonly hookFixture: CodexHookFixture;
  /** The Claude hook tree: every documented owner of a contained declaration. */
  readonly claudeHookFixture: ClaudeHookFixture;
  /** The Copilot hook tree: the root hook files and the settings documents that carry a block. */
  readonly copilotHookFixture: CopilotHookFixture;
}

/**
 * Builds every kind's fixture into one repository (T1099): the all-tool SKILL
 * tree, both vendors' rule trees, the Claude command tree, the Codex, Claude,
 * and Copilot custom-agent trees, the cross-vendor MCP tree, and the
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
  // The output-style family, whose `.claude/output-styles/` paths are disjoint
  // from every other builder's.
  const claudeOutputStyleFixture = buildClaudeOutputStyleFixture(prefix, root);
  const codexPluginFixture = buildCodexPluginFixture(prefix, root);
  const claudePluginFixture = buildClaudePluginFixture(prefix, root);
  const copilotPluginFixture = buildCopilotPluginFixture(prefix, root);
  const commandFixture = buildCommandFixture(prefix, root);
  // The hook family, before the MCP builder because both write the root
  // `.codex/config.toml`: this builder's own inline `[hooks]` tables are
  // replaced by that write and appended again by the merge below, while its
  // `.codex/hooks.json`, handler scripts, and near misses are disjoint from
  // every other builder's paths and stand as written.
  const hookFixture = buildCodexHookFixture(prefix, root);
  const mcpFixture = buildPriorityMcpFixture(prefix, root);
  // The settings family, so one launch shows every inventory this release
  // publishes. Built before the permissions fixture, which owns the two
  // `.claude/settings*.json` documents in this tree and writes richer ones:
  // those files are exactly what the Copilot CLI also reads, so the later
  // write is the copy this tree shows and both products still recognize it.
  // Its own `.github/copilot/` documents and its excluded neighbours are
  // disjoint from every other builder's paths.
  // The Copilot hook family before the settings builder, which owns
  // `.github/copilot/settings*.json` here and writes its own `hooks` block into
  // the shared document — so the contained Copilot row this tree shows is that
  // builder's copy, while the `.github/hooks/` files, their handler scripts,
  // and their near misses are disjoint from every other builder's paths and
  // stand as written. Its `.claude/settings.json` and `.github/agents/` copies
  // are replaced later for the same reason: the permissions and Claude hook
  // builders own that settings document, and the Copilot agent builder owns
  // that duplicate-name profile.
  const copilotHookFixture = buildCopilotHookFixture(prefix, root);
  const settingsFixture = buildCopilotSettingsFixture(prefix, root);
  // After the MCP builder, which writes its own `.claude/settings.json` as an
  // unadmitted MCP owner: here that path is a permission-policy carrier, and
  // the later write is the one this tree shows. Its `mcpServers` spelling
  // still joins no MCP row, which is what the MCP builder's copy was for.
  const claudePermissionsFixture = buildClaudePermissionsFixture(prefix, root);
  // The custom-agent tree is disjoint from every other builder's: nothing else
  // writes below `.codex/agents/`, and its own near misses sit beside paths no
  // other builder claims.
  const agentFixture = buildCodexAgentFixture(prefix, root);
  // After the MCP builder, which writes its own `.claude/agents/reviewer.md`
  // as an agent whose frontmatter spells `mcpServers`: the Claude agent tree
  // owns `.claude/agents/` here, and its own `browser-tester.md` carries the
  // same MCP-spelling case, so nothing this tree shows is lost.
  const claudeAgentFixture = buildClaudeAgentFixture(prefix, root);
  // After both, and disjoint from either: its `.github/agents/` tree is its
  // own, and the one `.claude/agents/` file it writes carries a name no other
  // builder uses. The MCP builder's `.github/agents/deploy.md` stays where it
  // is — a second Copilot agent profile in the same directory, which is what
  // this tree shows anyway.
  const copilotAgentFixture = buildCopilotAgentFixture(prefix, root);
  // Capture the MCP builder's two Codex configs before the instruction
  // builder replaces those paths with its fallback declaration.
  const sharedCodexConfigPaths = ['.codex/config.toml', 'packages/api/.codex/config.toml'];
  const mcpCodexConfigs = sharedCodexConfigPaths.map((path) =>
    readFileSync(join(root, path), 'utf8'),
  );
  const instructionFixture = buildAllVendorInstructionFixture(prefix, root);
  for (const [index, path] of sharedCodexConfigPaths.entries()) {
    const fallbackDeclaration = readFileSync(join(root, path), 'utf8');
    // The general configuration between the two builders' outputs, so the
    // carrier is the settings document its own row publishes rather than a
    // fallback declaration and server tables alone: a comment and an
    // underscored integer are exactly what that row shows and what neither
    // neighbouring builder has a reason to write. Top-level keys before the
    // first table header, because a TOML document requires that order.
    // The inline hook tables last: they are table headers, so they follow the
    // server tables the MCP builder wrote, and the root layer alone carries
    // them — the descendant layer is a near miss at every phase, and giving it
    // hooks would state a candidacy no rule grants.
    write(
      root,
      path,
      `${fallbackDeclaration}${CODEX_GENERAL_CONFIGURATION}\n${mcpCodexConfigs[index]!}${
        path === '.codex/config.toml' ? `\n${CODEX_INLINE_HOOKS_TOML.join('\n')}` : ''
      }`,
    );
  }
  // The Claude hook family last among the builders that own its paths: the
  // permissions builder writes the two `.claude/settings*.json` documents and
  // the skill builders write `.claude/skills/`, and this tree needs those files
  // to carry `hooks` — so its own copies are the ones the merged tree shows,
  // each carrying the permission policy and skill content the earlier builders
  // put there.
  const claudeHookFixture = buildClaudeHookFixture(prefix, root);
  // One cross-Source group for each comparing kind the builders above do not
  // already give one, named to pair with the Global homes fixture
  // (tests/fixtures/global-homes/build-fixtures.ts): with the personal setup
  // enabled, each of these rows holds two Repository members and two personal
  // members, so both of its family blocks offer their own comparison entry
  // (T1140, FR-030). The `tickets` MCP pair lives in the priority fixture's
  // two Copilot carriers, and the hook pair completes the `postToolUse` row
  // the unified hook fixture's `.github/hooks/format.json` starts. The skill
  // pair avoids `.claude/skills/`, whose `changelog` directory is the unified
  // plugin fixture's placement-loaded plugin root.
  write(
    root,
    '.agents/skills/changelog/SKILL.md',
    [
      '---',
      'name: changelog',
      'description: Draft a changelog entry from recent commits.',
      '---',
      '',
      'Summarize the latest commits as one changelog entry.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/skills/changelog/SKILL.md',
    [
      '---',
      'name: changelog',
      'description: Draft a changelog entry from the staged diff.',
      '---',
      '',
      'Summarize the staged changes as one changelog entry.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.claude/agents/deploy-bot.md',
    [
      '---',
      'name: deploy-bot',
      'description: Runs the deploy checklist.',
      'tools: Bash, Read',
      '---',
      '',
      'Work through the deploy checklist before shipping.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.codex/agents/deploy-bot.toml',
    [
      'name = "deploy-bot"',
      'description = "Runs the deploy checklist."',
      '',
      '[permissions]',
      'file_system = "read"',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.claude/commands/draftpr.md',
    [
      '---',
      'description: Draft a pull request from the branch',
      '---',
      '',
      'Draft the pull request description from the staged commits.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/prompts/draftpr.prompt.md',
    [
      '---',
      'description: Draft a pull request from the branch',
      '---',
      '',
      'Draft the pull request description from the branch history.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/hooks/notify-team.json',
    `${JSON.stringify(
      {
        version: 1,
        description: 'Repository notification hook.',
        hooks: {
          postToolUse: [{ type: 'command', command: './scripts/notify-team.sh' }],
        },
      },
      null,
      2,
    )}\n`,
  );
  return {
    root,
    skillFixture,
    instructionFixture,
    mcpFixture,
    ruleFixture,
    claudeRuleFixture,
    claudeOutputStyleFixture,
    codexPluginFixture,
    claudePluginFixture,
    copilotPluginFixture,
    commandFixture,
    claudePermissionsFixture,
    agentFixture,
    claudeAgentFixture,
    copilotAgentFixture,
    settingsFixture,
    hookFixture,
    claudeHookFixture,
    copilotHookFixture,
  };
}

/**
 * What {@link buildCrossSourceGroupFixture} writes: for each kind with a
 * comparison surface, one group whose name has two Repository files and two
 * personal-setup files, so the group's row renders one comparison entry per
 * family block (T1140, FR-030).
 */
export interface CrossSourceGroupFixture {
  /** The absolute fixture root to scan. */
  readonly root: string;
  /** The skill name with two Repository copies and two personal copies. */
  readonly skillName: string;
  /** The agent name declared by two Repository files and two personal files. */
  readonly agentName: string;
  /** The invocation name two Repository prompt files and two personal files resolve to. */
  readonly promptName: string;
  /** The MCP server name declared by two Repository carriers and two personal carriers. */
  readonly mcpServerName: string;
  /** The hook event declared by two Repository hook files and two personal hook files. */
  readonly hookEvent: string;
  /**
   * The plugin name both Repository catalogs offer. Its row's personal-setup
   * block holds one carrier at most: the personal catalog is the one exact
   * `~/.agents/plugins/marketplace.json`, so only the Repository block can
   * offer a pair.
   */
  readonly pluginName: string;
}

/**
 * A repository whose customizations pair up with the Global homes fixture
 * (`tests/fixtures/global-homes/build-fixtures.ts`): each comparing kind has
 * one group name spelled by two Repository files here and by two personal
 * files there, so with the personal setup enabled that group's row shows a
 * Repository block and a personal-setup block that each offer their own
 * comparison entry (T1140, FR-030).
 *
 * The names deliberately equal the Global homes fixture's — `changelog`,
 * `deploy-bot`, `draftpr`, `tickets`, `postToolUse`, `team-tools` — because
 * the group exists only where both Sources spell one name.
 *
 * Two deliberate asymmetries, both the contracts' rather than this tree's:
 * the plugin row's personal block holds one carrier (the personal catalog is
 * one exact file, contracts/vendors/openai-codex.md § Inspector Global
 * rules), and the rule, permissions, settings, and output-style kinds have no
 * comparison surface at all, so this tree carries no group for them beyond
 * the root instruction files.
 */
export function buildCrossSourceGroupFixture(
  prefix = 'inspector-cross-source',
  root = createRepositoryFixtureRoot(prefix),
): CrossSourceGroupFixture {
  // The `**` instruction range: two root files here, and every home's root
  // instruction file on the personal side — the instructions row grouping
  // this fixture's other kinds mirror.
  write(
    root,
    'AGENTS.md',
    [
      '# Working agreements',
      '',
      'Run the linter before proposing a change, and keep commits scoped.',
      '',
    ].join('\n'),
  );
  write(
    root,
    'CLAUDE.md',
    [
      '# Project instructions',
      '',
      'Prefer small reviewable diffs and explain non-obvious decisions.',
      '',
    ].join('\n'),
  );

  // The skill group: the same name kept in the Claude skills directory and
  // the shared agent skills directory, drifted the way two maintained copies
  // drift. The Global homes' Claude and Copilot homes hold the other two.
  write(
    root,
    '.claude/skills/changelog/SKILL.md',
    [
      '---',
      'name: changelog',
      'description: Draft a changelog entry from the staged diff.',
      '---',
      '',
      'Summarize the staged changes as one changelog entry.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.agents/skills/changelog/SKILL.md',
    [
      '---',
      'name: changelog',
      'description: Draft a changelog entry from recent commits.',
      '---',
      '',
      'Summarize the latest commits as one changelog entry.',
      '',
    ].join('\n'),
  );

  // The agent group: one name declared for Claude and for Codex at the
  // project scope; the Global homes' Claude and Codex homes declare the same
  // name at the personal scope.
  write(
    root,
    '.claude/agents/deploy-bot.md',
    [
      '---',
      'name: deploy-bot',
      'description: Runs the deploy checklist.',
      'tools: Bash, Read',
      '---',
      '',
      'Work through the deploy checklist before shipping.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.codex/agents/deploy-bot.toml',
    [
      'name = "deploy-bot"',
      'description = "Runs the deploy checklist."',
      '',
      '[permissions]',
      'file_system = "read"',
      '',
    ].join('\n'),
  );

  // The prompt group: a Claude command and a Copilot prompt file whose
  // invocation names coincide; the Global homes' Claude and Codex homes
  // resolve the same name from their own files.
  write(
    root,
    '.claude/commands/draftpr.md',
    [
      '---',
      'description: Draft a pull request from the branch',
      '---',
      '',
      'Draft the pull request description from the staged commits.',
      '',
    ].join('\n'),
  );
  write(
    root,
    '.github/prompts/draftpr.prompt.md',
    [
      '---',
      'description: Draft a pull request from the branch',
      '---',
      '',
      'Draft the pull request description from the branch history.',
      '',
    ].join('\n'),
  );

  // The MCP group: one server name declared in the Claude project carrier and
  // the Codex project config; the Global homes' Codex config and Copilot
  // mcp-config declare the same name.
  write(
    root,
    '.mcp.json',
    `${JSON.stringify(
      {
        mcpServers: {
          tickets: { command: 'npx', args: ['-y', 'mcp-tickets'] },
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.codex/config.toml',
    [
      'model = "gpt-5-codex"',
      '',
      '[mcp_servers.tickets]',
      'command = "npx"',
      'args = ["-y", "mcp-tickets"]',
      '',
    ].join('\n'),
  );

  // The hook group: two hook files in the one loaded directory declaring the
  // same event, the way a team splits unrelated automations across files; the
  // Global homes' Copilot home holds the personal pair.
  write(
    root,
    '.github/hooks/format-on-save.json',
    `${JSON.stringify(
      {
        version: 1,
        description: 'Repository formatting hook.',
        hooks: {
          postToolUse: [{ type: 'command', command: 'npx prettier --write .' }],
        },
      },
      null,
      2,
    )}\n`,
  );
  write(
    root,
    '.github/hooks/notify-team.json',
    `${JSON.stringify(
      {
        version: 1,
        description: 'Repository notification hook.',
        hooks: {
          postToolUse: [{ type: 'command', command: './scripts/notify-team.sh' }],
        },
      },
      null,
      2,
    )}\n`,
  );

  // The plugin row: one marketplace kept in both Repository catalog
  // locations, offering the name the personal catalog also offers. The
  // Repository block pairs; the personal block cannot (one exact personal
  // catalog file), which is the plugin row's documented asymmetry.
  const marketplace = (description: string): string =>
    `${JSON.stringify(
      {
        name: 'personal',
        plugins: [
          {
            name: 'team-tools',
            description,
            version: '1.2.0',
            source: './plugins/team-tools',
          },
        ],
      },
      null,
      2,
    )}\n`;
  write(root, '.claude-plugin/marketplace.json', marketplace('Shared productivity commands.'));
  write(
    root,
    '.agents/plugins/marketplace.json',
    marketplace('Shared productivity commands for every agent.'),
  );

  return {
    root,
    skillName: 'changelog',
    agentName: 'deploy-bot',
    promptName: 'draftpr',
    mcpServerName: 'tickets',
    hookEvent: 'postToolUse',
    pluginName: 'team-tools',
  };
}
