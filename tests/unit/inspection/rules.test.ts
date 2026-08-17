// T053/T126/T154: the Codex, Claude, and Copilot SKILL rules as executed —
// each authored program compiles once into the typed plan, the safe filesystem
// executes only that plan, and vendor code classifies matches without owning a
// walker or reinterpreting selectors (FR-003, FR-019, FR-024).
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
  buildCodexInstructionFixture,
  buildCodexSkillFixture,
  buildCopilotSkillFixture,
  type ClaudeSkillFixture,
  type CodexInstructionFixture,
  type CodexSkillFixture,
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
    expect(CODEX_REPOSITORY_RULES).toHaveLength(2);
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
    expect(COPILOT_REPOSITORY_RULES).toHaveLength(1);
    const compiled = COPILOT_REPOSITORY_RULES[0]!;
    expect(compiled.rule.ruleId).toBe('copilot.repo.skill');
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

  async function scanCopilot() {
    return scanWith(copilot.root, COPILOT_REPOSITORY_RULES);
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
      const admitting = resolveAdmittingRules(COPILOT_REPOSITORY_RULES, candidate.admissions);
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
    // derivation into its own per-scan plan.
    expect(CODEX_REPOSITORY_RULES.map((candidate) => candidate.rule.ruleId)).toEqual([
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

  it('admits exactly the root pair, the empty regular file included', async () => {
    const result = await scanInstructions();
    // `AGENTS.md` is authored empty and is still an admitted, readable
    // candidate: the vendor's first-non-empty selection is runtime behavior
    // the inventory does not project (FR-009). The carrier is deliberately
    // not among the candidates: it is the configuration-read stage's input,
    // never a published file, and the fallback files it declares enter
    // through that stage's own plan — the scan suite's claim.
    expect(result.files.map((file) => file.publicPath)).toEqual([
      ...instructionFixture.expectedInstructionPaths,
    ]);
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

  it('walks only the static allowlist: neither the carrier nor derived targets', async () => {
    // The bare traversal reads exactly the static candidates — the pair. The
    // carrier and the declared fallback files exist on disk, so a walk that
    // reached either would show up here; the carrier is read only by the
    // configuration-read stage, and the fallback files only through the plan
    // that stage expands (T1090), which the scan suite proves.
    await scanInstructions();
    const opened = vi.mocked(fsIo.readFile).mock.calls.map((call) =>
      String(call[0])
        .slice(instructionFixture.root.length + 1)
        .split(sep)
        .join('/'),
    );
    expect([...opened].sort()).toEqual([...instructionFixture.expectedInstructionPaths]);
    expect(opened).not.toContain(instructionFixture.configCarrierPath);
    for (const derivedPath of instructionFixture.expectedDerivedFallbackPaths) {
      expect(opened).not.toContain(derivedPath);
    }
  });
});
