// T053/T126/T154/T207/T228/T282: the Codex, Claude, and Copilot SKILL,
// instruction, and MCP-carrier rules as executed — each authored program compiles once into the
// typed plan, the safe filesystem executes only that plan, and vendor code
// classifies matches without owning a walker or reinterpreting selectors
// (FR-003, FR-019, FR-024).
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
  buildClaudeInstructionFixture,
  buildClaudeMcpFixture,
  buildClaudeSkillFixture,
  buildCodexInstructionFixture,
  buildCodexMcpFixture,
  buildCodexSkillFixture,
  buildCopilotCliMcpFixture,
  buildCopilotVscodeMcpFixture,
  buildCopilotInstructionFixture,
  buildCopilotSkillFixture,
  type ClaudeInstructionFixture,
  type ClaudeMcpFixture,
  type ClaudeSkillFixture,
  type CodexInstructionFixture,
  type CodexMcpFixture,
  type CodexSkillFixture,
  type CopilotCliMcpFixture,
  type CopilotVscodeMcpFixture,
  type CopilotInstructionFixture,
  type CopilotSkillFixture,
} from '../../fixtures/repositories/build-fixtures';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import {
  CODEX_DERIVED_FALLBACK_RULE,
  CODEX_REPOSITORY_RULES,
} from '../../../src/server/inspection/rules/codex';
import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS } from '../../../src/shared/registries/relations';
import {
  TraversalPlan,
  resolveAdmittingRules,
  type CompiledInspectionRule,
} from '../../../src/server/inspection/rules/registry';
import { runTraversalScan } from '../../../src/server/inspection/traversal';
import { runSourceScan } from '../../../src/server/inspection/scan';
import type { DeclaredEntryDto, DeclaredValueDto } from '../../../src/shared/api-types';

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

/** Runs one traversal over `root` with `rules`' plans, expecting a scan. */
async function scanWith(root: string, rules: readonly CompiledInspectionRule[]) {
  vi.clearAllMocks();
  const result = await runTraversalScan({ root, plans: rules.map((rule) => rule.plan) });
  if (result.kind !== 'scanned') {
    throw new Error(`expected a scanned result, got ${result.kind}`);
  }
  return result;
}

async function scanFixture() {
  return scanWith(fixture.root, CODEX_REPOSITORY_RULES);
}

describe('the shipped codex.repo.skill plan', () => {
  it('compiles the authored program once into the immutable typed plan', () => {
    expect(CODEX_REPOSITORY_RULES).toHaveLength(3);
    const compiled = CODEX_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'codex.repo.skill',
    )!;
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
      expect(
        publication.recognitions.filter(
          (one) => one.sourceRelativePath === file?.sourceRelativePath,
        ),
      ).toEqual([]);
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
    const shared = CODEX_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'codex.repo.skill',
    )!;
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
    // The skill fixture holds no instruction file, so every candidate resolves
    // to the skill rule — whose plan is the second of the shipped Codex pair.
    const skillPlanIndex = CODEX_REPOSITORY_RULES.findIndex(
      (candidate) => candidate.rule.ruleId === 'codex.repo.skill',
    );
    for (const candidate of result.files) {
      expect(candidate.admissions.length).toBeGreaterThan(0);
      const admitting = resolveAdmittingRules(CODEX_REPOSITORY_RULES, candidate.admissions);
      expect(admitting.map((compiled) => compiled.rule.ruleId)).toEqual(['codex.repo.skill']);
      // The admission names the authored selector, not the matched text, so
      // provenance never depends on re-parsing the public path.
      expect(candidate.admissions[0]).toEqual({ planIndex: skillPlanIndex, selectorIndex: 0 });
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
    const compiled = CLAUDE_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'claude.repo.skill',
    )!;
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
    return scanWith(mixed.root, [...CLAUDE_REPOSITORY_RULES, ...CODEX_REPOSITORY_RULES]);
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
    // descendant expansion must not leak into the anchored `.agents` programs
    // — Codex's, and equally Copilot's, which shares the spelling at the root
    // alone.
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

describe('the shipped copilot.repo.skill plan and its matrix (T154)', () => {
  let copilot: CopilotSkillFixture;

  beforeAll(() => {
    copilot = buildCopilotSkillFixture('inspector-copilot-rules');
  });

  afterAll(() => {
    rmSync(copilot.root, { recursive: true, force: true });
  });

  it('compiles the three authored programs once into the immutable typed plan', () => {
    const compiled = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'copilot.repo.skill',
    )!;
    expect(compiled.tool).toBe('copilot');
    expect(compiled.kind).toBe('skill');
    // The compiled plan is exactly what compiling the shipped matcher yields:
    // there is no second, vendor-owned interpretation of the selectors.
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['copilot.repo.skill']!.matcher!),
    );
    // Three programs, one per fixed directory spelling, each anchored at the
    // Repository root with exactly one dynamic skill-name child and the exact
    // terminal literal: no Copilot surface documents a downward skill lookup
    // from a root context, so a nested skills directory belongs to a runtime
    // context this product does not select (FR-003;
    // contracts/vendors/github-copilot.md § Inspector Repository matcher
    // rules).
    expect(
      compiled.plan.selectors.map((selector) => selector.remainder.map((segment) => segment.kind)),
    ).toEqual([
      ['literal', 'literal', 'regex', 'literal'],
      ['literal', 'literal', 'regex', 'literal'],
      ['literal', 'literal', 'regex', 'literal'],
    ]);
  });

  // The skill rule alone: this suite is about the skill matrix, and the
  // instruction rules that ship beside it admit files of the same tree.
  const copilotSkillRules = COPILOT_REPOSITORY_RULES.filter(
    (candidate) => candidate.rule.ruleId === 'copilot.repo.skill',
  );

  async function scanCopilot() {
    return scanWith(copilot.root, copilotSkillRules);
  }

  it('admits the root context of all three spellings, and nothing else', async () => {
    const result = await scanCopilot();
    expect(result.files.map((file) => file.publicPath)).toEqual([
      ...copilot.expectedCopilotSkillPaths,
    ]);
  });

  it('admits no nested context, near miss, extra depth, or configured root', async () => {
    // The negative matrix: the nested contexts of all three spellings — a
    // runtime project below the selected root is a context this product does
    // not select (FR-003) — plus a `SKILL.md` without its name segment, one a
    // level too deep, singular/dotless/case-varied spellings, VCS internals,
    // and the two configured-root shapes. No selector broadening admits any
    // of them — a `COPILOT_SKILLS_DIRS`-style directory stays a condition
    // fact, never a scan root (contracts/vendors/github-copilot.md
    // § `copilot.excluded.extra-directories`).
    const result = await scanCopilot();
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of copilot.copilotNearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('resolves each admission to copilot.repo.skill through its own spelling’s selector', async () => {
    // Deterministic provenance: the admission names the authored selector by
    // index — `.github` is the first program, `.agents` the second, `.claude`
    // the third — so which spelling admitted a candidate is a fact of the
    // walk, never re-derived from the public path.
    const result = await scanCopilot();
    const selectorByPrefix = (path: string): number =>
      path.includes('.github/') ? 0 : path.includes('.agents/') ? 1 : 2;
    for (const candidate of result.files) {
      const admitting = resolveAdmittingRules(copilotSkillRules, candidate.admissions);
      expect(admitting.map((compiled) => compiled.rule.ruleId)).toEqual(['copilot.repo.skill']);
      expect(candidate.admissions[0], candidate.publicPath).toEqual({
        planIndex: 0,
        selectorIndex: selectorByPrefix(candidate.publicPath),
      });
    }
  });

  it('keeps the exact recognition matrix when every vendor’s plans run together', async () => {
    // The one-pass walk over all three vendors' plans admits each physical
    // file once, with the admissions naming exactly the vendors whose
    // documented locations it sits in — and the nested `.claude` skill is
    // Claude's alone, through its own documented lazy descendant discovery.
    vi.clearAllMocks();
    const rules = [
      ...COPILOT_REPOSITORY_RULES,
      ...CLAUDE_REPOSITORY_RULES,
      ...CODEX_REPOSITORY_RULES,
    ];
    const result = await runTraversalScan({
      root: copilot.root,
      plans: rules.map((rule) => rule.plan),
    });
    if (result.kind !== 'scanned') {
      throw new Error(`expected a scanned result, got ${result.kind}`);
    }
    const expected = new Map<string, readonly string[]>([
      ['.github/skills/ship/SKILL.md', ['copilot.repo.skill']],
      ['.agents/skills/orbit/SKILL.md', ['copilot.repo.skill', 'codex.repo.skill']],
      ['.claude/skills/lander/SKILL.md', ['copilot.repo.skill', 'claude.repo.skill']],
      ['packages/api/.claude/skills/lander-nested/SKILL.md', ['claude.repo.skill']],
    ]);
    expect(result.files.map((file) => file.publicPath).sort()).toEqual([...expected.keys()].sort());
    for (const candidate of result.files) {
      const admitting = resolveAdmittingRules(rules, candidate.admissions);
      expect(
        admitting.map((compiled) => compiled.rule.ruleId),
        candidate.publicPath,
      ).toEqual(expected.get(candidate.publicPath));
    }
  });
});

describe('the shipped codex.repo.instructions plan (T207)', () => {
  it('compiles the exact override/regular pair in the authored order', () => {
    const compiled = CODEX_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'codex.repo.instructions',
    )!;
    expect(compiled.tool).toBe('codex');
    expect(compiled.kind).toBe('instructions');
    // The compiled plan is exactly what compiling the shipped matcher yields:
    // there is no second, vendor-owned interpretation of the selector.
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['codex.repo.instructions']!.matcher!),
    );
    // Two exact single-literal programs anchored at the Repository root, the
    // override first — the vendor's documented filename order, kept as
    // selector order so each admission names which filename matched.
    expect(compiled.plan.selectors.map((selector) => selector.remainder)).toEqual([
      [{ kind: 'literal', value: 'AGENTS.override.md' }],
      [{ kind: 'literal', value: 'AGENTS.md' }],
    ]);
    // The Repository pair publishes both files. First-non-empty selection is
    // the vendor's runtime rule — and, for the Inspector, solely the Global
    // rule's closed policy (FR-035); projecting it here would state a winner
    // this tool has not observed (FR-009).
    expect(compiled.plan.selectionPolicy).toBe('all-matches');
  });

  it('is explained by the layering strategy without claiming a selection', () => {
    const rule = INSPECTION_RULES['codex.repo.instructions']!;
    expect(
      RULE_RELATIONS[rule.ruleId].explainedByStrategies.map((strategy) => strategy.strategyId),
    ).toEqual(['codex.instructions.layering']);
    for (const field of ['conditionKeys', 'applicability', 'effective']) {
      expect(Object.keys(rule)).not.toContain(field);
    }
  });

  it('registers the fallback derivation rule as identity only (T1085)', () => {
    // The rule record is the derived candidates' identity — ruleId, class,
    // kind — and nothing more: how targets are discovered is the
    // configuration-read logic beside it, and the seed is a configuration
    // input this product never publishes or raw-displays
    // (contracts/vendors/openai-codex.md § Derived Repository rules).
    const derived = INSPECTION_RULES['codex.derived.fallback-basename']!;
    expect(derived.discoveryClass).toBe('bounded-derived-candidate');
    expect(derived.kind).toBe('instructions');
    expect(derived.matcher).toBeNull();
    // The derived rule feeds no static traversal plan: the walked list holds
    // the static rules alone, and the configuration-read stage expands the
    // derivation into its own per-scan plan. The carrier's own candidacy
    // (`codex.repo.config`, T286) does not change that: the derivation stays
    // Phase 15's, seeded by the configuration read rather than by the
    // carrier's admission.
    expect(CODEX_REPOSITORY_RULES.map((candidate) => candidate.rule.ruleId)).toEqual([
      'codex.repo.config',
      'codex.repo.instructions',
      'codex.repo.skill',
    ]);
    expect(CODEX_DERIVED_FALLBACK_RULE.rule).toBe(derived);
    expect(CODEX_DERIVED_FALLBACK_RULE.kind).toBe('instructions');
  });
});

describe('the anchored Codex instruction inventory (T207)', () => {
  let instructionFixture: CodexInstructionFixture;

  beforeAll(() => {
    instructionFixture = buildCodexInstructionFixture('inspector-codex-instruction-rules');
  });

  afterAll(() => {
    rmSync(instructionFixture.root, { recursive: true, force: true });
  });

  async function scanInstructions() {
    return scanWith(instructionFixture.root, CODEX_REPOSITORY_RULES);
  }

  it('admits exactly the root pair and the carrier, the empty regular file included', async () => {
    const result = await scanInstructions();
    // `AGENTS.md` is authored empty and is still an admitted, readable
    // candidate: the vendor's first-non-empty selection is runtime behavior
    // the inventory does not project (FR-009). The carrier is among the
    // candidates since its own candidacy shipped (`codex.repo.config`,
    // T286) — its first and only one — while the fallback files it declares
    // still enter through the configuration-read stage's own plan, which this
    // bare traversal deliberately does not run.
    expect(result.files.map((file) => file.publicPath).sort()).toEqual(
      [instructionFixture.configCarrierPath, ...instructionFixture.expectedInstructionPaths].sort(),
    );
    const empty = result.files.find((file) => file.publicPath === 'AGENTS.md');
    if (empty?.outcome.kind !== 'readable') {
      throw new Error('expected the empty regular file to be readable');
    }
    expect(empty.outcome.sourceText).toBe('');
  });

  it('admits no higher-scope path and no spelling variant', async () => {
    const result = await scanInstructions();
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of instructionFixture.nearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('derives each provenance from the authored selector that matched', async () => {
    const result = await scanInstructions();
    const instructionsPlanIndex = CODEX_REPOSITORY_RULES.findIndex(
      (candidate) => candidate.rule.ruleId === 'codex.repo.instructions',
    );
    // Deterministic provenance: the override is the first authored selector
    // and the regular file the second, so which filename admitted a candidate
    // is a fact of the walk, never re-derived from the public path.
    const byPath = new Map(result.files.map((file) => [file.publicPath, file.admissions]));
    expect(byPath.get('AGENTS.override.md')).toEqual([
      { planIndex: instructionsPlanIndex, selectorIndex: 0 },
    ]);
    expect(byPath.get('AGENTS.md')).toEqual([
      { planIndex: instructionsPlanIndex, selectorIndex: 1 },
    ]);
  });

  it('walks only the static allowlist, reading each candidate once and no derived target', async () => {
    // The bare traversal reads exactly the static candidates — the pair and
    // the carrier, each once, with no duplicate read (T282). The declared
    // fallback files exist on disk, so a walk that reached one would show up
    // here; they enter only through the plan the configuration-read stage
    // expands (T1090), which the scan suite proves.
    await scanInstructions();
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(instructionFixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect([...opened].sort()).toEqual(
      [instructionFixture.configCarrierPath, ...instructionFixture.expectedInstructionPaths].sort(),
    );
    expect(new Set(opened).size).toBe(opened.length);
    for (const derivedPath of instructionFixture.expectedDerivedFallbackPaths) {
      expect(opened).not.toContain(derivedPath);
    }
  });
});

describe('the shipped codex.repo.config plan (T282)', () => {
  it('compiles the exact root carrier pair of literals and nothing wider', () => {
    const compiled = CODEX_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'codex.repo.config',
    )!;
    expect(compiled.tool).toBe('codex');
    // The carrier is admitted for the MCP inventory: its rows are the
    // contained `[mcp_servers.*]` declarations (data-model.md § Inventory
    // unit), and a standalone MCP file gets no Codex candidacy at all.
    expect(compiled.kind).toBe('MCP');
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['codex.repo.config']!.matcher!),
    );
    // One exact two-literal program anchored at the Repository root: the
    // carrier's first and only candidacy, so no second selector — and no
    // second rule below — can admit or read the same physical file twice.
    expect(compiled.plan.selectors).toHaveLength(1);
    expect(compiled.plan.selectors[0]!.remainder).toEqual([
      { kind: 'literal', value: '.codex' },
      { kind: 'literal', value: 'config.toml' },
    ]);
    expect(compiled.plan.selectionPolicy).toBe('all-matches');
  });

  it('is explained by the precedence and MCP strategies, by identity', () => {
    // The registry-wide half of this regression — the carrier candidacy being
    // unique across every vendor's catalog, and the contained-Hook behavior
    // granting no candidate — is the contract gate's
    // (tests/contract/inspection-rules.test.ts); what belongs here is the
    // compiled unit carrying its own vendor's edges.
    const compiled = CODEX_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'codex.repo.config',
    )!;
    expect(compiled.relations).toBe(RULE_RELATIONS['codex.repo.config']);
    expect(compiled.relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual(
      ['codex.config.precedence', 'codex.mcp.configuration'],
    );
  });
});

describe('the anchored Codex MCP carrier inventory (T282)', () => {
  let mcpFixture: CodexMcpFixture;

  beforeAll(() => {
    mcpFixture = buildCodexMcpFixture('inspector-codex-mcp-rules');
  });

  afterAll(() => {
    rmSync(mcpFixture.root, { recursive: true, force: true });
  });

  it('admits the carrier exactly once, with one read and one admission', async () => {
    const result = await scanWith(mcpFixture.root, CODEX_REPOSITORY_RULES);
    const carrier = result.files.find((file) => file.publicPath === mcpFixture.carrierPath);
    expect(carrier).toBeDefined();
    // One admission from the one selector of the one rule: no duplicate
    // candidate, and each admitted file is read exactly once by the walk.
    expect(carrier!.admissions).toHaveLength(1);
    const [admitted] = resolveAdmittingRules(CODEX_REPOSITORY_RULES, carrier!.admissions);
    expect(admitted!.rule.ruleId).toBe('codex.repo.config');
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(mcpFixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect(opened.filter((path) => path === mcpFixture.carrierPath)).toHaveLength(1);
  });

  it('admits no standalone MCP file, nested carrier, or spelling variant', async () => {
    // The standalone `.mcp.json` near miss is the registry decision this
    // phase records: inline servers are metadata on the admitted carrier and
    // create no second candidate, and no plugin, User, or managed location is
    // promoted into the Repository walk.
    const result = await scanWith(mcpFixture.root, CODEX_REPOSITORY_RULES);
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of mcpFixture.nearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });
});

describe('the shipped claude.repo.mcp plan (T306)', () => {
  it('compiles the exact root one-literal program and nothing wider', () => {
    const compiled = CLAUDE_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'claude.repo.mcp',
    )!;
    expect(compiled.tool).toBe('claude');
    // The carrier is admitted for the MCP inventory: its rows are the named
    // `mcpServers` declarations (data-model.md § Inventory unit), and the
    // vendor documents exactly one project MCP file at the project root, so
    // the program is one literal with no recursive step.
    expect(compiled.kind).toBe('MCP');
    expect(compiled.plan).toEqual(new TraversalPlan(INSPECTION_RULES['claude.repo.mcp']!.matcher!));
    expect(compiled.plan.selectors).toHaveLength(1);
    expect(compiled.plan.selectors[0]!.remainder).toEqual([
      { kind: 'literal', value: '.mcp.json' },
    ]);
    expect(compiled.plan.selectionPolicy).toBe('all-matches');
  });

  it('is explained by the MCP selection strategy, by identity', () => {
    // The registry-wide half — the carrier candidacy staying unique across
    // every vendor's catalog — is the contract gate's
    // (tests/contract/inspection-rules.test.ts); what belongs here is the
    // compiled unit carrying its own vendor's edges.
    const compiled = CLAUDE_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'claude.repo.mcp',
    )!;
    expect(compiled.relations).toBe(RULE_RELATIONS['claude.repo.mcp']);
    expect(compiled.relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual(
      ['claude.mcp.selection'],
    );
  });
});

describe('the root-exact Claude MCP inventory (T306)', () => {
  let mcpFixture: ClaudeMcpFixture;

  beforeAll(() => {
    mcpFixture = buildClaudeMcpFixture('inspector-claude-mcp-rules');
  });

  afterAll(() => {
    rmSync(mcpFixture.root, { recursive: true, force: true });
  });

  it('admits the carrier exactly once, reading a linked carrier through its target', async () => {
    const result = await scanWith(mcpFixture.root, CLAUDE_REPOSITORY_RULES);
    const carrier = result.files.find((file) => file.publicPath === mcpFixture.carrierPath);
    expect(carrier).toBeDefined();
    // One admission from the one selector of the one rule — whether the
    // carrier is a regular file or, where the platform allowed it, a symbolic
    // link the walk reads transparently through its target (FR-024).
    expect(carrier!.admissions).toHaveLength(1);
    const [admitted] = resolveAdmittingRules(CLAUDE_REPOSITORY_RULES, carrier!.admissions);
    expect(admitted!.rule.ruleId).toBe('claude.repo.mcp');
  });

  it('admits no descendant carrier, User state, unadmitted owner, or spelling variant', async () => {
    // The registry decision this phase records: Claude reads exactly one
    // project MCP file, the User `.claude.json` is a `<home>` fact, and a
    // plugin manifest, settings file, or agent file carrying declarations is
    // an unadmitted owner no adapter can reach (T309, T325).
    const result = await scanWith(mcpFixture.root, CLAUDE_REPOSITORY_RULES);
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of [...mcpFixture.nearMissPaths, ...mcpFixture.unadmittedOwnerPaths]) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
    // The mcpServers-spelling skill and the plain skill are admitted — as
    // skills, by the skill rule, and as nothing else: a skill frontmatter
    // spelling `mcpServers` is a field Claude does not document, never a
    // second candidacy.
    for (const skillPath of [mcpFixture.mcpFrontmatterSkillPath, mcpFixture.plainSkillPath]) {
      const skill = result.files.find((file) => file.publicPath === skillPath);
      expect(skill, skillPath).toBeDefined();
      const admitted = resolveAdmittingRules(CLAUDE_REPOSITORY_RULES, skill!.admissions);
      expect(admitted.map((rule) => rule.rule.ruleId)).toEqual(['claude.repo.skill']);
    }
  });
});

describe('the shipped claude.repo.instructions plan (T228)', () => {
  it('compiles the two any-depth filename programs in the authored order', () => {
    const compiled = CLAUDE_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'claude.repo.instructions',
    )!;
    expect(compiled.tool).toBe('claude');
    expect(compiled.kind).toBe('instructions');
    // The compiled plan is exactly what compiling the shipped matcher yields:
    // there is no second, vendor-owned interpretation of the selector.
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['claude.repo.instructions']!.matcher!),
    );
    // Two programs rather than one dynamic step, so each admission carries
    // which authored filename matched — and exactly two, because the
    // any-depth `CLAUDE.md` program already reaches `./.claude/CLAUDE.md` at
    // the root and at every depth. A third `['.claude', 'CLAUDE.md']`
    // selector would only add a second admission of a file the first program
    // already admitted (contracts/vendors/claude-code.md § Repository
    // Inspector matchers).
    expect(compiled.plan.selectors.map((selector) => selector.remainder)).toEqual([
      [{ kind: 'recursive-directories' }, { kind: 'literal', value: 'CLAUDE.md' }],
      [{ kind: 'recursive-directories' }, { kind: 'literal', value: 'CLAUDE.local.md' }],
    ]);
    // Both admitted files are published side by side. Which one a session
    // loads depends on its working directory and on the files it reads,
    // neither of which this tool observes, so no winner is projected
    // (FR-009).
    expect(compiled.plan.selectionPolicy).toBe('all-matches');
  });

  it('rests on the three Repository lookups and is explained by the layering', () => {
    // The User scope is a different Source boundary this rule may not read,
    // so it is absent from the rule's own basis while the layering strategy
    // that owns the composition still consumes it. The rule states nothing
    // about which layer a session would load.
    const rule = INSPECTION_RULES['claude.repo.instructions']!;
    expect(
      RULE_RELATIONS[rule.ruleId].basedOnBehaviors.map((behavior) => behavior.behaviorId),
    ).toEqual([
      'claude.behavior.repo.instructions.ancestor',
      'claude.behavior.repo.instructions.descendant',
      'claude.behavior.repo.instructions.launch',
    ]);
    expect(
      RULE_RELATIONS[rule.ruleId].explainedByStrategies.map((strategy) => strategy.strategyId),
    ).toEqual(['claude.instructions.layering']);
    for (const field of ['conditionKeys', 'applicability', 'effective']) {
      expect(Object.keys(rule)).not.toContain(field);
    }
  });
});

describe('the any-depth Claude instruction inventory (T228)', () => {
  let instructionFixture: ClaudeInstructionFixture;

  beforeAll(() => {
    instructionFixture = buildClaudeInstructionFixture('inspector-claude-instruction-rules');
  });

  afterAll(() => {
    rmSync(instructionFixture.root, { recursive: true, force: true });
  });

  it('admits CLAUDE.md and CLAUDE.local.md at the root and at every depth', async () => {
    const result = await scanWith(instructionFixture.root, CLAUDE_REPOSITORY_RULES);
    // The nested `.claude/CLAUDE.md` files are among them: `ANY_DIRECTORIES`
    // matches `.claude` like any other directory, so the directory form the
    // page names is reached by the same program that reaches the bare
    // filename, at the root and below it alike.
    expect(result.files.map((file) => file.publicPath).sort()).toEqual([
      ...instructionFixture.expectedClaudeInstructionPaths,
    ]);
  });

  it('never recognizes AGENTS.md, which the Codex plans still admit', async () => {
    // Claude Code reads `CLAUDE.md`, not `AGENTS.md`
    // (anthropic.claude-code.memory.locations-load § AGENTS.md), so the file
    // is a Codex instruction candidate and nothing more — the phase changes
    // neither side of the Codex allowlist.
    const claudeOnly = await scanWith(instructionFixture.root, CLAUDE_REPOSITORY_RULES);
    expect(claudeOnly.files.map((file) => file.publicPath)).not.toContain('AGENTS.md');
    const codexOnly = await scanWith(instructionFixture.root, CODEX_REPOSITORY_RULES);
    expect(codexOnly.files.map((file) => file.publicPath)).toEqual([
      ...instructionFixture.expectedCodexInstructionPaths,
    ]);
  });

  it('admits no spelling variant, VCS internal, installed package, or relationship target', async () => {
    const result = await scanWith(instructionFixture.root, [
      ...CLAUDE_REPOSITORY_RULES,
      ...CODEX_REPOSITORY_RULES,
    ]);
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of instructionFixture.nearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('derives each provenance from the authored selector that matched', async () => {
    const result = await scanWith(instructionFixture.root, CLAUDE_REPOSITORY_RULES);
    const planIndex = CLAUDE_REPOSITORY_RULES.findIndex(
      (candidate) => candidate.rule.ruleId === 'claude.repo.instructions',
    );
    // Deterministic provenance: `CLAUDE.md` is the first authored selector and
    // `CLAUDE.local.md` the second, so which filename admitted a candidate is
    // a fact of the walk rather than something re-derived from the public
    // path — and each file carries exactly one admission, because no second
    // program reaches it.
    const byPath = new Map(result.files.map((file) => [file.publicPath, file.admissions]));
    for (const path of ['CLAUDE.md', '.claude/CLAUDE.md', 'packages/api/.claude/CLAUDE.md']) {
      expect(byPath.get(path), path).toEqual([{ planIndex, selectorIndex: 0 }]);
    }
    expect(byPath.get('CLAUDE.local.md')).toEqual([{ planIndex, selectorIndex: 1 }]);
  });

  it('opens only the admitted candidates, never the authored import target', async () => {
    // This phase emits no relationship at all, and a relationship target
    // confers zero read authority wherever one is emitted (T238 owns the
    // imports): the file the root `CLAUDE.md` names with an `@path` token
    // exists on disk and is never opened.
    await scanWith(instructionFixture.root, CLAUDE_REPOSITORY_RULES);
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(instructionFixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect([...opened].sort()).toEqual([...instructionFixture.expectedClaudeInstructionPaths]);
    expect(opened).not.toContain(instructionFixture.importTargetPath);
  });
});

describe('the applicability range a Claude instruction rule answers (T1093)', () => {
  // Narrowed by the discriminant the union carries, exactly as the recognizer
  // narrows it: only an instruction unit answers a range.
  const instructionRule = CLAUDE_REPOSITORY_RULES.find(
    (candidate) => candidate.kind === 'instructions',
  );
  if (instructionRule === undefined || instructionRule.kind !== 'instructions') {
    throw new Error('expected a compiled Claude instruction rule');
  }
  // Claude's rules name no declaration that could carry a range, so every case
  // here answers from the path with an empty declaration set — and always
  // answers: only a declared-range filename can have no range, and Claude
  // ships none.
  const rangeOf = (path: string): string | null => instructionRule.applicabilityRangeOf(path, []);

  it('answers the Repository root for a file the root holds', () => {
    expect(rangeOf('CLAUDE.md')).toBe('**');
    expect(rangeOf('CLAUDE.local.md')).toBe('**');
  });

  it('drops a trailing `.claude` for CLAUDE.md and for nothing else', () => {
    // The page names `./CLAUDE.md` **or** `./.claude/CLAUDE.md` as the one
    // project instruction location, and lists local instructions at
    // `./CLAUDE.local.md` alone, so the directory form is that filename's.
    expect(rangeOf('.claude/CLAUDE.md')).toBe('**');
    expect(rangeOf('packages/api/.claude/CLAUDE.md')).toBe('packages/api/**');
    expect(rangeOf('.claude/CLAUDE.local.md')).toBe('.claude/**');
  });

  it('spells a directory name that reads as glob syntax as the literal it is', () => {
    // A range is published as a glob, so a literal directory name has to be
    // escaped or the pattern denotes something else — `packages/[api]/**`
    // would read as a class over `a`, `p`, and `i`.
    expect(rangeOf('packages/[api]/CLAUDE.md')).toBe('packages/\\[api\\]/**');
    expect(rangeOf('foo*/CLAUDE.md')).toBe('foo\\*/**');
    expect(rangeOf('!docs/CLAUDE.md')).toBe('\\!docs/**');
  });
});

describe('the shipped copilot.repo.mcp plan (T336)', () => {
  it('compiles the two root-exact CLI carrier programs and nothing wider', () => {
    const compiled = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'copilot.repo.mcp',
    )!;
    expect(compiled.tool).toBe('copilot');
    // The carriers are admitted for the MCP inventory: their rows are the
    // named `mcpServers` declarations (data-model.md § Inventory unit). The
    // Git root is the documented upward walk's one terminal every session
    // shares — the only chain point the selected root's frame contains — so
    // both spellings are root-exact and no recursive step exists.
    expect(compiled.kind).toBe('MCP');
    expect(compiled.plan).toEqual(
      new TraversalPlan(INSPECTION_RULES['copilot.repo.mcp']!.matcher!),
    );
    expect(compiled.plan.selectors).toHaveLength(2);
    expect(compiled.plan.selectors.map((selector) => selector.remainder)).toEqual([
      [{ kind: 'literal', value: '.mcp.json' }],
      [
        { kind: 'literal', value: '.github' },
        { kind: 'literal', value: 'mcp.json' },
      ],
    ]);
    expect(compiled.plan.selectionPolicy).toBe('all-matches');
  });

  it('is explained by the CLI MCP selection strategy, by identity', () => {
    const compiled = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'copilot.repo.mcp',
    )!;
    expect(compiled.relations).toBe(RULE_RELATIONS['copilot.repo.mcp']);
    expect(compiled.relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual(
      ['copilot.cli.mcp.selection'],
    );
  });
});

describe('the root-exact Copilot CLI MCP inventory (T336)', () => {
  let mcpFixture: CopilotCliMcpFixture;

  beforeAll(() => {
    mcpFixture = buildCopilotCliMcpFixture('inspector-copilot-cli-mcp-rules');
  });

  afterAll(() => {
    rmSync(mcpFixture.root, { recursive: true, force: true });
  });

  it('admits both root spellings once each, links read through targets', async () => {
    const result = await scanWith(mcpFixture.root, COPILOT_REPOSITORY_RULES);
    const paths = new Set(result.files.map((file) => file.publicPath));
    // The root spelling carries the VS Code 1.118+ path/surface provenance
    // beside the CLI admission (T359) — two provenances of one candidate,
    // never two files — while the `.github` spelling stays the CLI's alone.
    const expectedAdmissions: Record<string, readonly string[]> = {
      [mcpFixture.rootCarrierPath]: ['copilot.repo.mcp', 'copilot.repo.mcp.vscode-root'],
      [mcpFixture.githubCarrierPath]: ['copilot.repo.mcp'],
    };
    for (const carrier of [mcpFixture.rootCarrierPath, mcpFixture.githubCarrierPath]) {
      expect(paths.has(carrier), carrier).toBe(true);
      const admitted = resolveAdmittingRules(
        COPILOT_REPOSITORY_RULES,
        result.files.find((file) => file.publicPath === carrier)!.admissions,
      );
      expect(admitted.map((rule) => rule.rule.ruleId)).toEqual(expectedAdmissions[carrier]);
    }
  });

  it('admits no subdirectory carrier, User filename, VS Code carrier, or spelling variant', async () => {
    // The registry decision this phase records (T339): a subdirectory
    // carrier is a runtime-chain member outside the selected root's frame,
    // the `COPILOT_HOME` filename is a home fact, the general VS Code
    // settings file is a documented input the allowlist does not admit, and
    // session additions or plugin servers have no path a Repository walk
    // could reach.
    const result = await scanWith(mcpFixture.root, COPILOT_REPOSITORY_RULES);
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of mcpFixture.nearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });
});

describe('the exact Copilot VS Code MCP rules (T356)', () => {
  let vscodeFixture: CopilotVscodeMcpFixture;

  beforeAll(() => {
    vscodeFixture = buildCopilotVscodeMcpFixture('inspector-copilot-vscode-mcp-rules');
  });

  afterAll(() => {
    rmSync(vscodeFixture.root, { recursive: true, force: true });
  });

  it('admits the dedicated carrier and merges root provenances on one file', async () => {
    const result = await scanWith(vscodeFixture.root, COPILOT_REPOSITORY_RULES);
    // The `.vscode` carrier is one candidate of its own rule — read through
    // its link where the platform created one (FR-024) — and the root
    // spelling is one physical file whose CLI and VS Code admissions are two
    // provenances of one candidate and one read, never two files (T362).
    const byPath = new Map(result.files.map((file) => [file.publicPath, file]));
    const vscode = byPath.get(vscodeFixture.vscodeCarrierPath);
    expect(
      resolveAdmittingRules(COPILOT_REPOSITORY_RULES, vscode!.admissions).map(
        (rule) => rule.rule.ruleId,
      ),
    ).toEqual(['copilot.repo.mcp.vscode']);
    const root = byPath.get(vscodeFixture.rootCarrierPath);
    expect(
      resolveAdmittingRules(COPILOT_REPOSITORY_RULES, root!.admissions).map(
        (rule) => rule.rule.ruleId,
      ),
    ).toEqual(['copilot.repo.mcp', 'copilot.repo.mcp.vscode-root']);
    expect(
      result.files.filter((file) => file.publicPath === vscodeFixture.rootCarrierPath),
    ).toHaveLength(1);
  });

  it('admits no nested workspace, general settings, User filename, or variant', async () => {
    const result = await scanWith(vscodeFixture.root, COPILOT_REPOSITORY_RULES);
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of vscodeFixture.nearMissPaths) {
      // The link target is legitimately read through the link; it is still
      // never published as its own candidate.
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('compiles the reading and provenance-only units the contract names', () => {
    // The dedicated carrier owns the guide's JSONC `servers` reading; the
    // root provenance owns none, which is its unit's whole contract
    // (registry.ts § CompiledStaticMcpProvenanceRule) — no VS Code extractor
    // exists for the root file until documentation establishes its schema.
    const vscode = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'copilot.repo.mcp.vscode',
    )!;
    if (vscode.kind !== 'MCP') {
      throw new Error('expected the compiled VS Code MCP carrier rule');
    }
    expect(vscode.mcpReading).toBe('own');
    const root = COPILOT_REPOSITORY_RULES.find(
      (candidate) => candidate.rule.ruleId === 'copilot.repo.mcp.vscode-root',
    )!;
    if (root.kind !== 'MCP') {
      throw new Error('expected the compiled VS Code root MCP provenance rule');
    }
    expect(root.mcpReading).toBe('none');
    // Both are explained by the VS Code selection strategy, by identity.
    for (const compiled of [vscode, root]) {
      expect(
        compiled.relations.explainedByStrategies.map((strategy) => strategy.strategyId),
      ).toEqual(['copilot.vscode.mcp.selection']);
    }
  });
});

describe('the shipped Copilot instruction plans and their matrix (T247)', () => {
  let copilotInstructions: CopilotInstructionFixture;

  beforeAll(() => {
    copilotInstructions = buildCopilotInstructionFixture('inspector-copilot-instruction-rules');
  });

  afterAll(() => {
    rmSync(copilotInstructions.root, { recursive: true, force: true });
  });

  /** The compiled unit for one shipped Copilot rule, by its own identifier. */
  function copilotRule(ruleId: string) {
    return COPILOT_REPOSITORY_RULES.find((candidate) => candidate.rule.ruleId === ruleId)!;
  }

  /**
   * What one Copilot rule says an admitted file governs — null for a
   * declared-range filename that declares none. Declarations default to
   * empty, which is both a file that declares nothing and one whose
   * extraction failed.
   */
  function rangeOf(
    ruleId: string,
    path: string,
    declared: readonly DeclaredEntryDto[] = [],
  ): string | null {
    const compiled = copilotRule(ruleId);
    if (compiled.kind !== 'instructions') {
      throw new Error(`expected a compiled Copilot instruction rule for ${ruleId}`);
    }
    return compiled.applicabilityRangeOf(path, declared);
  }

  /** One declared frontmatter key, for the declared-range cases below. */
  function declare(key: string, value: DeclaredValueDto): DeclaredEntryDto[] {
    return [{ key, keyKind: 'string', value }];
  }

  /** The paths one Copilot rule admits on its own, sorted as the walk found them. */
  async function admittedBy(ruleId: string): Promise<string[]> {
    const result = await scanWith(copilotInstructions.root, [copilotRule(ruleId)]);
    return result.files.map((file) => file.publicPath);
  }

  it('admits exactly the contracted paths, rule by rule', async () => {
    // Each rule scanned alone, so an over-broad program is a failure of the
    // rule that owns it rather than of whichever one happened to admit the
    // file first. The expectation is the fixture's own description, keyed by
    // rule, so the built tree and the claim about it cannot drift
    // (contracts/vendors/github-copilot.md § Inspector Repository matcher
    // rules).
    const expectations = copilotInstructions.expectedCopilotInstructionPaths;
    // All seven, named here so a rule that stopped being described — and would
    // therefore be asserted about by nothing — fails instead of disappearing.
    expect(Object.keys(expectations)).toHaveLength(7);
    for (const [ruleId, expected] of Object.entries(expectations)) {
      expect(await admittedBy(ruleId), ruleId).toEqual(expected);
    }
  });

  it('admits no excluded location, configured root, or spelling variant', async () => {
    // The negative matrix, run against every Copilot rule at once: the
    // `.claude` instruction spellings and non-root alternatives
    // `copilot.excluded.additional-standard-locations` keeps out, the
    // runtime-supplied roots `copilot.excluded.extra-directories` names, VCS
    // internals, installed packages, and the spelling variants one step from
    // each literal. None of them is reachable at all — no selector goes
    // outside the fixed spellings, which is why the exclusions need no
    // mechanism (T251).
    const result = await scanWith(
      copilotInstructions.root,
      COPILOT_REPOSITORY_RULES.filter((candidate) => candidate.kind === 'instructions'),
    );
    const paths = new Set(result.files.map((file) => file.publicPath));
    for (const nearMiss of copilotInstructions.copilotNearMissPaths) {
      expect(paths.has(nearMiss), nearMiss).toBe(false);
    }
  });

  it('gives the root repository-wide file both provenances and a nested one only the CLI’s', async () => {
    // The phase's subject: `ANY_DIRECTORIES` matches zero segments, so the
    // root file is one candidate with two admissions while the nested file has
    // one. That is what lets a recognition name all three surfaces at the root
    // and the CLI's alone below it, without duplicating the file's identity.
    const rules = [
      copilotRule('copilot.repo.instructions.repository'),
      copilotRule('copilot.repo.instructions.repository-cli-context'),
    ];
    const result = await scanWith(copilotInstructions.root, rules);
    const admittingIds = (path: string): string[] =>
      resolveAdmittingRules(
        rules,
        result.files.find((file) => file.publicPath === path)!.admissions,
      ).map((compiled) => compiled.rule.ruleId);
    expect(admittingIds('.github/copilot-instructions.md')).toEqual([
      'copilot.repo.instructions.repository',
      'copilot.repo.instructions.repository-cli-context',
    ]);
    expect(admittingIds('packages/api/.github/copilot-instructions.md')).toEqual([
      'copilot.repo.instructions.repository-cli-context',
    ]);
  });

  it('derives what each path-ranged file governs from its own path', () => {
    // The repository-wide file strips the `.github` Copilot keeps it in and
    // the agent-instruction filenames keep their whole directory, because no
    // source documents Copilot keeping one of them in `.github`
    // (data-model.md § Inventory unit). A path-specific file is not here at
    // all: its range is its own declaration or nothing, so with no usable
    // `applyTo` the answer is null whichever rule admitted it (T265).
    expect(rangeOf('copilot.repo.instructions.repository', '.github/copilot-instructions.md')).toBe(
      '**',
    );
    expect(
      rangeOf(
        'copilot.repo.instructions.repository-cli-context',
        'packages/api/.github/copilot-instructions.md',
      ),
    ).toBe('packages/api/**');
    expect(
      rangeOf('copilot.repo.instructions.path', '.github/instructions/frontend.instructions.md'),
    ).toBeNull();
    expect(
      rangeOf(
        'copilot.repo.instructions.path-cli-context',
        'packages/api/.github/instructions/api.instructions.md',
      ),
    ).toBeNull();
    expect(rangeOf('copilot.repo.instructions.agents', 'AGENTS.md')).toBe('**');
    expect(rangeOf('copilot.repo.instructions.agents', 'packages/api/AGENTS.md')).toBe(
      'packages/api/**',
    );
    // `.github` is Copilot's keeping directory for the two filenames its own
    // selectors put there, and for nothing else: an `AGENTS.md` inside it
    // governs that directory, because no source says Copilot keeps one there.
    expect(rangeOf('copilot.repo.instructions.agents', 'tools/.github/AGENTS.md')).toBe(
      'tools/.github/**',
    );
    expect(rangeOf('copilot.repo.instructions.claude-root', 'CLAUDE.md')).toBe('**');
    expect(rangeOf('copilot.repo.instructions.gemini-root', 'GEMINI.md')).toBe('**');
  });

  it('keys a path-specific file by the range it declares, wherever it sits (T265)', () => {
    // `applyTo` is what a path-specific file governs, so the declared value
    // keys the row and the path decides nothing (spec.md § Clarifications).
    // The value is published as authored and never escaped: it already is the
    // author's pattern, and escaping would turn it into a directory literally
    // named that.
    const scalar = (text: string): DeclaredValueDto => ({ kind: 'scalar', text });
    expect(
      rangeOf(
        'copilot.repo.instructions.path',
        '.github/instructions/frontend.instructions.md',
        declare('applyTo', scalar('src/frontend/**')),
      ),
    ).toBe('src/frontend/**');
    // A file deep inside the subtree, and one under a CLI context: the
    // declaration outranks both paths, which is the whole content of the
    // declared branch.
    expect(
      rangeOf(
        'copilot.repo.instructions.path-cli-context',
        'packages/api/.github/instructions/api.instructions.md',
        declare('applyTo', scalar('packages/api/src/**')),
      ),
    ).toBe('packages/api/src/**');
    // Copilot writes several globs into one `applyTo` value. Nothing parses
    // it: rows group by exact text, so one declaration is one row however many
    // patterns its author put in it.
    expect(
      rangeOf(
        'copilot.repo.instructions.path',
        '.github/instructions/many.instructions.md',
        declare('applyTo', scalar('**/*.ts,**/*.tsx')),
      ),
    ).toBe('**/*.ts,**/*.tsx');
  });

  it('answers no range for a declaration a row cannot be keyed by (T265)', () => {
    // Each of these is a declared-range file that supplied nothing a row can
    // be keyed by. The product reads this filename's range from its
    // declaration alone — VS Code documents an undeclared file as not applied
    // automatically — so the honest answer is that there is no range, never a
    // governance read off the path. The declaration itself still reaches the
    // reader through the file's own detail.
    const path = '.github/instructions/frontend.instructions.md';
    // A sequence and a mapping have no rendering as one row's identity.
    expect(
      rangeOf(
        'copilot.repo.instructions.path',
        path,
        declare('applyTo', { kind: 'sequence', items: [] }),
      ),
    ).toBeNull();
    expect(
      rangeOf(
        'copilot.repo.instructions.path',
        path,
        declare('applyTo', { kind: 'mapping', entries: [] }),
      ),
    ).toBeNull();
    // An authored empty string denotes nothing, and a declared null is the key
    // written with no value at all.
    expect(
      rangeOf(
        'copilot.repo.instructions.path',
        path,
        declare('applyTo', { kind: 'scalar', text: '' }),
      ),
    ).toBeNull();
    expect(
      rangeOf('copilot.repo.instructions.path', path, declare('applyTo', { kind: 'absent' })),
    ).toBeNull();
    // A file whose extraction failed declares nothing here: no range is known,
    // and its parse-failure diagnostic states why beside it (FR-028).
    expect(rangeOf('copilot.repo.instructions.path', path, [])).toBeNull();
    // And the key is read only for the filename Copilot documents it on: an
    // `AGENTS.md` carrying `applyTo` declared it to nobody, and its range
    // stays the path's.
    expect(
      rangeOf(
        'copilot.repo.instructions.agents',
        'packages/api/AGENTS.md',
        declare('applyTo', { kind: 'scalar', text: 'src/**' }),
      ),
    ).toBe('packages/api/**');
  });

  it('keeps every product’s instruction rows when all three catalogs run together', async () => {
    // The shared-file half: one physical `AGENTS.md` is Codex's and Copilot's,
    // one physical root `CLAUDE.md` is Claude's and Copilot's, and each is
    // read once and admitted for each product's plan. The Claude-only
    // spellings stay Claude's, because Copilot documents its `CLAUDE.md`
    // alternative at the repository root alone.
    const rules = [
      ...CODEX_REPOSITORY_RULES,
      ...CLAUDE_REPOSITORY_RULES,
      ...COPILOT_REPOSITORY_RULES,
    ];
    const result = await scanWith(copilotInstructions.root, rules);
    const toolsFor = (path: string): string[] => {
      const file = result.files.find((candidate) => candidate.publicPath === path);
      return file === undefined
        ? []
        : [
            ...new Set(
              resolveAdmittingRules(rules, file.admissions).map((compiled) => compiled.tool),
            ),
          ].sort();
    };
    expect(toolsFor('AGENTS.md')).toEqual(['codex', 'copilot']);
    expect(toolsFor('CLAUDE.md')).toEqual(['claude', 'copilot']);
    expect(toolsFor('GEMINI.md')).toEqual(['copilot']);
    expect(toolsFor('.claude/CLAUDE.md')).toEqual(['claude']);
    expect(toolsFor('CLAUDE.local.md')).toEqual(['claude']);
    expect(toolsFor('packages/api/CLAUDE.md')).toEqual(['claude']);
    // The hosted organization instructions name no local path, so nothing in
    // the tree can stand for them and no candidate exists for them.
    expect(toolsFor('packages/api/GEMINI.md')).toEqual([]);
  });
});
