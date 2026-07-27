// T053: the Codex SKILL rule as executed — the authored program
// `['.agents', 'skills', ANY_NAME, 'SKILL.md']` compiles once into the typed
// plan, the safe filesystem executes only that plan, and vendor code
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
  buildCodexSkillFixture,
  type CodexSkillFixture,
} from '../../fixtures/repositories/build-fixtures';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS } from '../../../src/shared/registries/relations';
import {
  compileTraversalPlan,
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
      compileTraversalPlan(INSPECTION_RULES['codex.repo.skill']!.matcher!),
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
  async function skillDetails(publicPath: string) {
    const publication = await runSourceScan({
      sourceId: 'src-1',
      root: fixture.root,
      rootFailureOwner: 'repository',
    });
    if (publication.kind !== 'publishable') {
      throw new Error(`expected a publishable scan, got ${publication.kind}`);
    }
    const file = publication.files.find((entry) => entry.sourceRelativePath === publicPath);
    const recognition = publication.recognitions.find((entry) => entry.fileId === file?.fileId);
    return recognition?.details;
  }

  it('lists what accompanies a skill without admitting or reading any of it', async () => {
    // `greet/` holds the admitted `SKILL.md`, a sibling `README.md`, and a
    // `nested/SKILL.md` one level too deep to be admitted. The census is
    // recursive and excludes the seed, so it lists the other two — and
    // neither of them became a row.
    const details = await skillDetails('.agents/skills/greet/SKILL.md');
    expect(details?.kind === 'skill' && details.companionFiles).toEqual([
      '.agents/skills/greet/README.md',
      '.agents/skills/greet/nested/SKILL.md',
    ]);
    const result = await scanFixture();
    const paths = new Set(result.files.map((file) => file.publicPath));
    expect(paths.has('.agents/skills/greet/README.md')).toBe(false);
    expect(paths.has('.agents/skills/greet/nested/SKILL.md')).toBe(false);
  });

  it('lists nothing beside a skill whose directory holds only its own file', async () => {
    const details = await skillDetails('.agents/skills/empty/SKILL.md');
    expect(details?.kind === 'skill' && details.companionFiles).toEqual([]);
  });

  it('reads exactly the admitted candidates and nothing the census listed', async () => {
    // "The census reads no bytes" has to be the exact read set, not merely the
    // absence of an extra row: a companion opened for any reason would be
    // content the user never asked to expose (FR-027).
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
        String(call[0]).slice(fixture.root.length + 1).split(sep).join('/'),
      )
      .sort();
    const admitted = publication.files
      .filter((file) => file.encoding !== 'unknown')
      .map((file) => file.sourceRelativePath)
      .sort();
    expect(opened).toEqual(admitted);
    // The census did list companions for `greet`, and none of them was opened.
    const companions = publication.recognitions
      .flatMap((recognition) =>
        recognition.details.kind === 'skill' ? recognition.details.companionFiles : [],
      );
    expect(companions.length).toBeGreaterThan(0);
    for (const companion of companions) {
      expect(opened).not.toContain(companion);
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
    const opened = vi
      .mocked(fsIo.readFile)
      .mock.calls.map((call) =>
        String(call[0]).slice(fixture.root.length + 1).split(sep).join('/'),
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
    const realReaddir = (await vi.importActual<typeof import('../../../src/server/inspection/fs-io')>(
      '../../../src/server/inspection/fs-io',
    )).readdir;
    vi.mocked(fsIo.readdir).mockImplementation(async (directory, options) => {
      const entries = (await realReaddir(directory, options)) as unknown as import('node:fs').Dirent[];
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

describe('runtime-chain facts stay conditional', () => {
  it('keeps the shipped rule pointing at condition keys rather than a verdict', () => {
    const rule = INSPECTION_RULES['codex.repo.skill']!;
    // Admission proves only that an authored file exists at an allowlisted
    // location. Whether Codex would select it depends on every key below, and
    // the rule records them instead of resolving them
    // (contracts/inspection-path-allowlist.md § existence-versus-activation).
    expect(rule.conditionKeys).toContain('runtime-cwd');
    expect(rule.conditionKeys).toContain('selection');
    expect(rule.conditionKeys).toContain('enablement');
    expect(
      RULE_RELATIONS[rule.ruleId].explainedByStrategies.map((strategy) => strategy.strategyId),
    ).toEqual(['codex.skills.discovery']);
  });
});
