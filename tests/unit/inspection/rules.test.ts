// T053/T126: the Codex and Claude SKILL rules as executed — each authored
// program compiles once into the typed plan, the safe filesystem executes only
// that plan, and vendor code classifies matches without owning a walker or
// reinterpreting selectors (FR-003, FR-019, FR-024).
//
// The near-miss assertions carry the weight here. A selector that is one
// segment too loose still passes every positive case, so the only way an
// over-broad allowlist becomes visible is by naming the paths it must not
// reach.
import { rmSync } from 'node:fs';
import { sep } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import {
  buildClaudeSkillFixture,
  buildCodexSkillFixture,
  type ClaudeSkillFixture,
  type CodexSkillFixture,
} from '../../fixtures/repositories/build-fixtures';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS } from '../../../src/shared/registries/relations';
import {
  TraversalPlan,
  resolveAdmittingRules,
} from '../../../src/server/inspection/rules/registry';
import { runTraversalScan } from '../../../src/server/inspection/traversal';
import { runSourceScan } from '../../../src/server/inspection/scan';

// Pass-through spies over the inspection module's closed fs surface: the
// product's calls stay real while the suite asserts exactly which paths were
// touched (contracts/inspection-path-allowlist.md § Symlink and read invariants).
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

let fixture: CodexSkillFixture;

beforeAll(() => {
  fixture = buildCodexSkillFixture('inspector-codex-rules');
});

afterAll(() => {
  rmSync(fixture.root, { recursive: true, force: true });
});

async function scanFixture() {
  vi.clearAllMocks();
  const result = await runTraversalScan({
    root: fixture.root,
    plans: CODEX_REPOSITORY_RULES.map((rule) => rule.plan),
  });
  if (result.kind !== 'scanned') {
    throw new Error(`expected a scanned result, got ${result.kind}`);
  }
  return result;
}

describe('the shipped codex.repo.skill plan', () => {
  it('compiles the authored program once into the immutable typed plan', () => {
    expect(CODEX_REPOSITORY_RULES).toHaveLength(1);
    const compiled = CODEX_REPOSITORY_RULES[0]!;
    expect(compiled.rule.ruleId).toBe('codex.repo.skill');
    expect(compiled.tool).toBe('codex');
    expect(compiled.kind).toBe('skill');
    // The compiled plan is exactly what compiling the shipped matcher yields:
    // there is no second, vendor-owned interpretation of the selector.
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['codex.repo.skill']!.matcher!),
    );
    // Anchored at the Repository root, with no leading recursive step: the
    // allowlist reports the selected root's customizations (FR-003), so a
    // nested `.agents/skills` belongs to a working directory this product does
    // not select — not to a file no agent ever loads.
    expect(compiled.plan.selectors[0]!.remainder.map((segment) => segment.kind)).toEqual([
      'literal',
      'literal',
      'regex',
      'literal',
    ]);
  });
});

describe('the bounded companion census', () => {
  // The census is not part of the walk: `traversal.ts` executes the allowlist
  // and knows nothing about what sits beside a candidate. `runSourceScan` opts
  // in for the rules that declare it, so these assertions go through the scan.
  async function skillCompanions(publicPath: string) {
    const publication = await runSourceScan({
      sourceId: 'src-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error(`expected a publishable scan, got ${publication.kind}`);
    }
    return publication.skillCompanionsByPath.get(publicPath);
  }

  it('lists what accompanies a skill without admitting any of it', async () => {
    // `greet/` holds the admitted `SKILL.md`, a sibling `README.md`, and a
    // `nested/SKILL.md` one level too deep to be admitted. The census is
    // recursive and excludes the seed, so it lists the other two — and neither
    // was admitted as a candidate. Being listed is not being unread: the census
    // reads what it lists and the generation publishes it, which the case below
    // asserts. What must not happen is a companion entering through a rule.
    expect(await skillCompanions('.agents/skills/greet/SKILL.md')).toEqual([
      '.agents/skills/greet/README.md',
      '.agents/skills/greet/nested/SKILL.md',
    ]);
    const result = await scanFixture();
    const paths = new Set(result.files.map((file) => file.publicPath));
    expect(paths.has('.agents/skills/greet/README.md')).toBe(false);
    expect(paths.has('.agents/skills/greet/nested/SKILL.md')).toBe(false);
  });

  it('lists nothing beside a skill whose directory holds only its own file', async () => {
    expect(await skillCompanions('.agents/skills/empty/SKILL.md')).toEqual([]);
  });

  it('reads exactly the admitted candidates and the files the census listed', async () => {
    // The read set is the assertion, not merely the presence of an extra row: a
    // file opened for any other reason would be content nothing in the shipped
    // contract accounts for. A companion is read because the census bounds it as
    // part of the customization — never because a rule admitted it.
    vi.clearAllMocks();
    const publication = await runSourceScan({
      sourceId: 'src-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error(`expected a publishable scan, got ${publication.kind}`);
    }
    const opened = vi
      .mocked(fsIo.readFile)
      .mock.calls.map((call) =>
        String(call[0])
          .slice(fixture.root.length + 1)
          .split(sep)
          .join('/'),
      )
      .sort();
    const published = publication.files
      .filter((file) => file.encoding !== 'unknown')
      .map((file) => file.sourceRelativePath)
      .sort();
    // Every published file was opened exactly once, and nothing else was.
    expect(opened).toEqual(published);
    expect(new Set(opened).size).toBe(opened.length);
    // The census did list companions for `greet`, and each was read and
    // published as an ordinary file that no rule admitted.
    const companions = [...publication.skillCompanionsByPath.values()].flat();
    expect(companions.length).toBeGreaterThan(0);
    for (const companion of companions) {
      const file = publication.files.find((one) => one.sourceRelativePath === companion);
      expect(file, `companion not published: ${companion}`).toBeDefined();
      // Published, but not recognized: it has no kind and no inventory of its
      // own, which is what "the census admits nothing" now means. A file does
      // not list its recognitions, so what proves it holds none is that no
      // published recognition names it.
      expect(publication.recognitions.filter((one) => one.fileId === file?.fileId)).toEqual([]);
    }
  });
});

describe('anchored inventory and near misses', () => {
  it('admits exactly the allowlisted skill files at the repository root', async () => {
    const result = await scanFixture();
    const paths = result.files.map((file) => file.publicPath);
    expect(paths).toEqual([...fixture.expectedSkillPaths]);
  });

  it('admits no path that sits one segment away from the selector', async () => {
    const result = await scanFixture();
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of fixture.nearMissPaths) {
      expect(paths.has(nearMiss)).toBe(false);
    }
  });

  it('never enumerates or opens anything inside VCS internals', async () => {
    await scanFixture();
    const touched = [
      ...vi.mocked(fsIo.readdir).mock.calls,
      ...vi.mocked(fsIo.readFile).mock.calls,
      ...vi.mocked(fsIo.stat).mock.calls,
    ].map((call) => String(call[0]));
    expect(touched.some((path) => path.includes('/.git'))).toBe(false);
  });

  it('opens only the admitted candidates, never a near-miss sibling', async () => {
    const result = await scanFixture();
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(fixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    // A broken link is discovered as unreadable without a read attempt, so
    // the opened set is the admitted set minus those.
    const expectedOpened = result.files
      .filter((file) => file.outcome.kind !== 'unreadable')
      .map((file) => file.publicPath);
    expect([...opened].sort()).toEqual([...expectedOpened].sort());
  });

  it('reads each admitted file exactly once per scan attempt', async () => {
    await scanFixture();
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) => String(call[0]));
    expect(new Set(opened).size).toBe(opened.length);
  });
});

describe('an entry whose type the filesystem does not report', () => {
  it('resolves it with a stat rather than dropping it', async () => {
    // NFS without readdirplus and several FUSE drivers return entries whose
    // type is unknown, so every `Dirent` predicate answers false. Dropping
    // those would lose a candidate with no diagnostic to show for it.
    vi.clearAllMocks();
    const realReaddir = (
      await vi.importActual<typeof import('../../../src/server/inspection/fs-io')>(
        '../../../src/server/inspection/fs-io',
      )
    ).readdir;
    vi.mocked(fsIo.readdir).mockImplementation(async (directory, options) => {
      const entries = (await realReaddir(
        directory,
        options,
      )) as unknown as import('node:fs').Dirent[];
      return entries.map((entry) =>
        Object.assign(Object.create(Object.getPrototypeOf(entry)), entry, {
          isFile: () => false,
          isDirectory: () => false,
          isSymbolicLink: () => false,
        }),
      ) as never;
    });
    const result = await runTraversalScan({
      root: fixture.root,
      plans: CODEX_REPOSITORY_RULES.map((rule) => rule.plan),
    });
    if (result.kind !== 'scanned') {
      throw new Error(`expected a scanned result, got ${result.kind}`);
    }
    expect(result.files.map((file) => file.publicPath)).toEqual([...fixture.expectedSkillPaths]);
  });
});

describe('every admission keeps its own selector origin', () => {
  it('retains both admissions when two plans share one selector program', async () => {
    // Two plans built from the same compiled rule share the matcher array by
    // reference. They are still two admissions with distinct origins, and a
    // candidate retains each as its own provenance (data-model.md
    // § ToolRecognition), so collapsing states by program and position alone
    // would drop one of them.
    const shared = CODEX_REPOSITORY_RULES[0]!;
    vi.clearAllMocks();
    const result = await runTraversalScan({
      root: fixture.root,
      plans: [shared.plan, shared.plan],
    });
    if (result.kind !== 'scanned') {
      throw new Error(`expected a scanned result, got ${result.kind}`);
    }
    const candidate = result.files.find(
      (file) => file.publicPath === '.agents/skills/greet/SKILL.md',
    );
    expect(candidate?.admissions).toEqual([
      { planIndex: 0, selectorIndex: 0 },
      { planIndex: 1, selectorIndex: 0 },
    ]);
  });
});

describe('vendor code classifies matches without reinterpreting selectors', () => {
  it('resolves each admission back to the rule whose plan admitted it', async () => {
    const result = await scanFixture();
    for (const candidate of result.files) {
      expect(candidate.admissions.length).toBeGreaterThan(0);
      const admitting = resolveAdmittingRules(CODEX_REPOSITORY_RULES, candidate.admissions);
      expect(admitting.map((compiled) => compiled.rule.ruleId)).toEqual(['codex.repo.skill']);
      // The admission names the authored selector, not the matched text, so
      // provenance never depends on re-parsing the public path.
      expect(candidate.admissions[0]).toEqual({ planIndex: 0, selectorIndex: 0 });
    }
  });
});

describe('an admission is not an activation', () => {
  it('records what the rule is explained by, and no verdict of its own', () => {
    const rule = INSPECTION_RULES['codex.repo.skill']!;
    // Admission proves only that an authored file exists at an allowlisted
    // location; whether Codex would select it is runtime this tool never
    // observes, so no field of the rule states it
    // (contracts/inspection-path-allowlist.md § existence-versus-activation).
    expect(
      RULE_RELATIONS[rule.ruleId].explainedByStrategies.map((strategy) => strategy.strategyId),
    ).toEqual(['codex.skills.discovery']);
    for (const field of ['conditionKeys', 'applicability', 'effective']) {
      expect(Object.keys(rule)).not.toContain(field);
    }
  });
});

describe('the shipped claude.repo.skill plan (T126)', () => {
  it('compiles the authored descendant program once into the immutable typed plan', () => {
    expect(CLAUDE_REPOSITORY_RULES).toHaveLength(1);
    const compiled = CLAUDE_REPOSITORY_RULES[0]!;
    expect(compiled.rule.ruleId).toBe('claude.repo.skill');
    expect(compiled.tool).toBe('claude');
    expect(compiled.kind).toBe('skill');
    // The compiled plan is exactly what compiling the shipped matcher yields:
    // there is no second, vendor-owned interpretation of the selector.
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['claude.repo.skill']!.matcher!),
    );
    // Descendant inventory with exactly one direct skill-name child: the
    // leading recursive step covers the root and every descendant layer —
    // Claude discovers ancestor layers at startup and nested layers lazily —
    // and the single dynamic name step keeps the admitted file exactly one
    // directory below `skills` (contracts/vendors/claude-code.md § Repository
    // Inspector matchers).
    expect(compiled.plan.selectors[0]!.remainder.map((segment) => segment.kind)).toEqual([
      'recursive-directories',
      'literal',
      'literal',
      'regex',
      'literal',
    ]);
  });

  it('is explained by the selection strategy without claiming a selection', () => {
    // Which layer actually participates in a session depends on where Claude
    // was launched and which files were worked on. The rule neither narrows
    // nor widens what it admits for that, and states nothing about it.
    const rule = INSPECTION_RULES['claude.repo.skill']!;
    expect(
      RULE_RELATIONS[rule.ruleId].explainedByStrategies.map((strategy) => strategy.strategyId),
    ).toEqual(['claude.skills.selection']);
    expect(Object.keys(rule)).not.toContain('conditionKeys');
  });
});

describe('the Claude descendant inventory beside the anchored Codex one (T126)', () => {
  let mixed: ClaudeSkillFixture;

  beforeAll(() => {
    mixed = buildClaudeSkillFixture('inspector-claude-rules');
  });

  afterAll(() => {
    rmSync(mixed.root, { recursive: true, force: true });
  });

  async function scanMixed() {
    vi.clearAllMocks();
    const result = await runTraversalScan({
      root: mixed.root,
      plans: [...CLAUDE_REPOSITORY_RULES, ...CODEX_REPOSITORY_RULES].map((rule) => rule.plan),
    });
    if (result.kind !== 'scanned') {
      throw new Error(`expected a scanned result, got ${result.kind}`);
    }
    return result;
  }

  it('admits the Claude skills at the root and in nested directories, and the Codex ones unchanged', async () => {
    const result = await scanMixed();
    expect(result.files.map((file) => file.publicPath)).toEqual(
      [...mixed.expectedClaudeSkillPaths, ...mixed.expectedCodexSkillPaths].sort(),
    );
  });

  it('keeps both same-name skill directories as two admitted candidates', async () => {
    // Two layers declare `dup`; both stay visible, and which one Claude would
    // select remains conditional rather than resolved by the inventory.
    const result = await scanMixed();
    const paths = result.files.map((file) => file.publicPath);
    expect(paths).toContain('.claude/skills/dup/SKILL.md');
    expect(paths).toContain('packages/api/.claude/skills/dup/SKILL.md');
  });

  it('admits no near miss, including the nested Codex spelling', async () => {
    // The nested `.agents/skills` file is the discriminating case: Claude's
    // descendant expansion must not leak into Codex's anchored program.
    const result = await scanMixed();
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of mixed.nearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('resolves each admission back to the vendor rule whose plan admitted it', async () => {
    const result = await scanMixed();
    const rules = [...CLAUDE_REPOSITORY_RULES, ...CODEX_REPOSITORY_RULES];
    for (const candidate of result.files) {
      const admitting = resolveAdmittingRules(rules, candidate.admissions);
      const expected = candidate.publicPath.includes('.claude/')
        ? ['claude.repo.skill']
        : ['codex.repo.skill'];
      expect(
        admitting.map((compiled) => compiled.rule.ruleId),
        candidate.publicPath,
      ).toEqual(expected);
    }
  });

  it('reads a symlinked skill transparently through its target', async () => {
    if (!mixed.capabilities.symlinks) {
      return;
    }
    const result = await scanMixed();
    const linked = result.files.find(
      (file) => file.publicPath === '.claude/skills/linked/SKILL.md',
    );
    // The candidate is the link's path; the content is the target's, exactly
    // as Claude would load it (FR-024; contracts/vendors/claude-code.md
    // § Known ambiguities item 9).
    expect(linked?.outcome.kind).toBe('readable');
    expect(linked?.outcome.kind === 'readable' && linked.outcome.sourceText).toBe(
      '# linked claude skill\n',
    );
    const broken = result.files.find(
      (file) => file.publicPath === '.claude/skills/broken/SKILL.md',
    );
    expect(broken?.outcome.kind).toBe('unreadable');
  });

  it('terminates the walk on a directory link cycle instead of recursing', async () => {
    // `.claude/skills/cycle` points back at the fixture root. The leading
    // recursive step would re-enter the whole tree through it forever; the
    // walk's real-path tracking terminates it, the scan completes, and the
    // cycle contributes no candidate.
    if (!mixed.capabilities.symlinks) {
      return;
    }
    const result = await scanMixed();
    expect(
      result.files.filter((file) => file.publicPath.startsWith('.claude/skills/cycle/')),
    ).toEqual([]);
  });
});
