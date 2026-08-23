// T052/T060/T126/T130/T133/T154/T158/T179/T269/T282: the inspection-rule half of
// the registry contract gate — the closed matcher grammar, deterministic
// compilation into the immutable versioned `TraversalPlan`, reciprocal
// references, the same-name skill statement each rule derives, the unified
// skill and instruction selector matrices, and the closed structure-only
// projection vocabulary.
//
// Production exclusion of maintenance-only data is not here. A citation lives
// on the record that carries it, so no import graph separates them; the built
// artifact is the only place the absence is observable, and
// `tests/package/verify-package-files.test.ts` owns that assertion.
//
// The runtime deliberately re-checks none of this
// (contracts/inspection-path-allowlist.md § Common conformance requirements),
// so these assertions are the only thing standing between an authoring
// mistake and a shipped allowlist that reads more than the contract permits.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { INSPECTION_RULES } from '../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS, STRATEGY_RELATIONS } from '../../src/shared/registries/relations';
import { RUNTIME_COMPOSITION_STRATEGIES } from '../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../src/shared/registries/vendor-behaviors';
import {
  TRAVERSAL_PLAN_SCHEMA_VERSION,
  assertLoadableTraversalPlan,
  TraversalPlan,
  type MatcherSegment,
} from '../../src/server/inspection/rules/registry';
import { CLAUDE_REPOSITORY_RULES } from '../../src/server/inspection/rules/claude';
import { CODEX_REPOSITORY_RULES } from '../../src/server/inspection/rules/codex';
import { COPILOT_REPOSITORY_RULES } from '../../src/server/inspection/rules/copilot';
import { sameNameSkillResolutionFor } from '../../src/shared/registries/skill-resolution';
import { SUPPORTED_TOOL_ORDER } from '../../src/shared/entities';
import { serializeInspectionRules } from '../fixtures/conformance/serialize';

const rules = Object.values(INSPECTION_RULES);

// The closed literal alphabet from data-model.md § StructuredInspectorMatcher:
// printable ASCII U+0021–U+007E except the path/glob metacharacters, and
// never `.` or `..`.
const FORBIDDEN_LITERAL_CHARS = new Set(['/', '\\', ':', '*', '?', '"', '<', '>', '|']);

function isLegalLiteral(value: string): boolean {
  if (value.length === 0 || value === '.' || value === '..') {
    return false;
  }
  for (const character of value) {
    const code = character.codePointAt(0)!;
    if (code < 0x21 || code > 0x7e || FORBIDDEN_LITERAL_CHARS.has(character)) {
      return false;
    }
  }
  return true;
}

describe('same-name skill resolution', () => {
  // T1076: a grouped skill row states what each recognizing product documents.
  // The statement is derived from that product's own shipped strategies, so it
  // cannot disagree with them and there is no table to check against. What is
  // left to gate is coverage: a product whose skill rule ships while its
  // strategies establish nothing would silently drop out of every grouped row.
  // `shared` owns no skill: a shared rule is a non-read exclusion, so it has no
  // product whose resolution could be stated.
  const skillTools = new Set(
    rules.flatMap((rule) => (rule.kind === 'skill' && rule.tool !== 'shared' ? [rule.tool] : [])),
  );

  it('states a resolution for every product that can recognize a skill', () => {
    expect(skillTools.size).toBeGreaterThan(0);
    for (const tool of skillTools) {
      expect(sameNameSkillResolutionFor(tool), tool).not.toBeNull();
    }
  });

  it('claims nothing for a product that recognizes no skill', () => {
    // No row can reach that product, and answering anyway would state something
    // about a product on the strength of strategies no skill rule explains.
    for (const tool of SUPPORTED_TOOL_ORDER) {
      if (!skillTools.has(tool)) {
        expect(sameNameSkillResolutionFor(tool), tool).toBeNull();
      }
    }
  });

  it('reads the statement out of the strategies a skill rule names', () => {
    // Not a restatement of the derivation: it checks that the strategies the
    // graph reaches for a skill-recognizing product are the ones the shipped
    // registry publishes, so the derived statement rests on reviewed records
    // rather than on records the walk happened to find.
    for (const tool of skillTools) {
      const reached = rules
        .filter((rule) => rule.kind === 'skill' && rule.tool === tool)
        .flatMap((rule) => [...RULE_RELATIONS[rule.ruleId].explainedByStrategies]);
      expect(reached.length, tool).toBeGreaterThan(0);
      for (const strategy of reached) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId], strategy.strategyId).toBe(
          strategy,
        );
        expect(strategy.tool, strategy.strategyId).toBe(tool);
      }
    }
  });
});

describe('inspection rule records', () => {
  it('gives a matcher exactly to the read-authorizing static rules', () => {
    for (const rule of rules) {
      if (rule.discoveryClass === 'static-candidate') {
        expect(rule.matcher).not.toBeNull();
        expect(rule.kind).not.toBeNull();
      } else {
        // A derived rule has no matcher of its own: its targets come from the
        // vendor's configuration-read logic beside it, and the compiled unit
        // still demands a non-null kind (T1089/T1090).
        expect(rule.matcher).toBeNull();
      }
      if (rule.discoveryClass === 'bounded-derived-candidate') {
        expect(rule.kind).not.toBeNull();
      }
    }
  });

  it('names its FR/QR policy clauses on the record itself', () => {
    for (const rule of rules) {
      // `policyRefs` points at spec.md rather than another registry, so it
      // stays a field of the record (data-model.md § InspectionRule).
      expect(rule.policyRefs.length).toBeGreaterThan(0);
      expect(Object.keys(rule)).not.toContain('behaviorRefs');
      expect(Object.keys(rule)).not.toContain('strategyRefs');
      expect(Object.keys(rule)).not.toContain('sourceRefs');
    }
  });

  it('matches the checked-in conformance fixture', () => {
    expect(
      JSON.parse(readFileSync('tests/fixtures/conformance/inspection-rules.json', 'utf8')),
    ).toEqual(JSON.parse(JSON.stringify(serializeInspectionRules())));
  });
});

describe('closed selector grammar', () => {
  const selectors = rules.flatMap((rule) => rule.matcher?.selectors ?? []);

  it('gives every matcher-bearing rule at least one distinct program', () => {
    // The flattened list cannot show this: a rule shipping no selector at all,
    // or two rules shipping the same program, would still leave the flattened
    // array non-empty.
    const programs = new Set<string>();
    for (const rule of rules) {
      if (rule.matcher === null) {
        continue;
      }
      expect(rule.matcher.selectors.length, rule.ruleId).toBeGreaterThan(0);
      for (const selector of rule.matcher.selectors) {
        const key = `${rule.ruleId}\u0000${JSON.stringify(selector.map((step) => (step instanceof RegExp ? step.source : step)))}`;
        expect(programs.has(key), key).toBe(false);
        programs.add(key);
      }
    }
    expect(programs.size).toBeGreaterThan(0);
  });

  it('authors a non-empty program whose terminal step denotes a regular file', () => {
    expect(selectors.length).toBeGreaterThan(0);
    for (const selector of selectors) {
      expect(selector.length).toBeGreaterThan(0);
      const terminal = selector.at(-1)!;
      expect(terminal.kind === 'literal' || terminal.kind === 'regex').toBe(true);
    }
  });

  it('anchors the Codex skill program at the repository root', () => {
    // The selected root is the repository root (FR-001), which is where Codex's
    // upward skill scan terminates. A leading `ANY_DIRECTORIES` would inventory
    // nested `.agents/skills` directories that an upward scan never reaches, so
    // the program must stay anchored.
    const matcher = INSPECTION_RULES['codex.repo.skill']!.matcher!;
    for (const selector of matcher.selectors) {
      expect(selector[0]!.kind).not.toBe('recursive-directories');
    }
  });

  it('expands the Claude skill program to descendants with one direct name child (T126)', () => {
    // The opposite decision from Codex, and deliberately so: Claude discovers
    // ancestor skill layers at startup and nested descendant layers lazily, so
    // a nested `.claude/skills` is a layer Claude can genuinely load and the
    // program leads with `ANY_DIRECTORIES`. The skill name stays exactly one
    // dynamic direct child and the terminal literal stays exact
    // (contracts/vendors/claude-code.md § Repository Inspector matchers).
    const matcher = INSPECTION_RULES['claude.repo.skill']!.matcher!;
    expect(matcher.selectors).toHaveLength(1);
    expect(matcher.selectors[0]!.map((segment) => segment.kind)).toEqual([
      'recursive-directories',
      'literal',
      'literal',
      'regex',
      'literal',
    ]);
  });

  it('rejects a terminal or adjacent recursive step', () => {
    for (const selector of selectors) {
      selector.forEach((segment: MatcherSegment, index: number) => {
        if (segment.kind !== 'recursive-directories') {
          return;
        }
        expect(index).toBeLessThan(selector.length - 1);
        expect(selector[index + 1]!.kind).not.toBe('recursive-directories');
      });
    }
  });

  it('uses only the closed ASCII literal alphabet', () => {
    for (const selector of selectors) {
      for (const segment of selector) {
        if (segment.kind === 'literal') {
          expect(isLegalLiteral(segment.value)).toBe(true);
        }
      }
    }
  });

  it('carries a real Unicode-mode regular expression in every dynamic step', () => {
    for (const selector of selectors) {
      for (const segment of selector) {
        if (segment.kind === 'regex') {
          expect(segment.pattern).toBeInstanceOf(RegExp);
          expect(segment.pattern.flags).toContain('u');
          // No `g` or `y`: the walk calls `test` repeatedly on the one shipped
          // instance, and a stateful pattern advances `lastIndex` between
          // calls, so the same name would match or not depending on what was
          // tested before it.
          expect(segment.pattern.global, `${String(segment.pattern)} is global`).toBe(false);
          expect(segment.pattern.sticky, `${String(segment.pattern)} is sticky`).toBe(false);
        }
      }
    }
  });
});

describe('traversal-plan compilation', () => {
  it('compiles deterministically into the one loadable schema version', () => {
    for (const rule of rules) {
      if (rule.matcher === null) {
        continue;
      }
      const first = new TraversalPlan(rule.matcher);
      const second = new TraversalPlan(rule.matcher);
      expect(first).toEqual(second);
      expect(first.schemaVersion).toBe(TRAVERSAL_PLAN_SCHEMA_VERSION);
      expect(first.boundary).toEqual(rule.matcher.base);
      expect(first.selectors).toHaveLength(rule.matcher.selectors.length);
      expect(() => assertLoadableTraversalPlan(first)).not.toThrow();
    }
  });

  it('refuses to interpret a plan of an unknown schema version', () => {
    const plan = new TraversalPlan(INSPECTION_RULES['codex.repo.skill']!.matcher!);
    expect(() =>
      assertLoadableTraversalPlan({ ...plan, schemaVersion: 2 as typeof plan.schemaVersion }),
    ).toThrow(/unknown traversal-plan schema version/u);
  });

  it('compiles a Repository program to the unchanged anchored walk', () => {
    const matcher = INSPECTION_RULES['codex.repo.skill']!.matcher!;
    const selector = new TraversalPlan(matcher).selectors[0]!;
    expect(selector.mode).toBe('repository-program');
    expect(selector.fixedPrefix).toEqual([]);
    expect(selector.remainder).toEqual(matcher.selectors[0]!);
  });

  it('pairs each shipped Codex rule with the plan compiled from its own matcher', () => {
    for (const compiled of CODEX_REPOSITORY_RULES) {
      // The compiled unit carries the shipped record itself, so there is
      // nothing to look up and no way for the two to disagree.
      expect(INSPECTION_RULES[compiled.rule.ruleId]).toBe(compiled.rule);
      expect(RULE_RELATIONS[compiled.rule.ruleId]).toBe(compiled.relations);
      expect(compiled.tool).toBe(compiled.rule.tool);
      expect(compiled.kind).toBe(compiled.rule.kind);
      expect(compiled.plan).toEqual(new TraversalPlan(compiled.rule.matcher!));
    }
  });

  it('pairs each shipped Claude rule with the plan compiled from its own matcher (T130)', () => {
    for (const compiled of CLAUDE_REPOSITORY_RULES) {
      expect(INSPECTION_RULES[compiled.rule.ruleId]).toBe(compiled.rule);
      expect(RULE_RELATIONS[compiled.rule.ruleId]).toBe(compiled.relations);
      expect(compiled.tool).toBe(compiled.rule.tool);
      expect(compiled.kind).toBe(compiled.rule.kind);
      expect(compiled.plan).toEqual(new TraversalPlan(compiled.rule.matcher!));
    }
  });

  it('pairs each shipped Copilot rule with the plan compiled from its own matcher (T154)', () => {
    for (const compiled of COPILOT_REPOSITORY_RULES) {
      expect(INSPECTION_RULES[compiled.rule.ruleId]).toBe(compiled.rule);
      expect(RULE_RELATIONS[compiled.rule.ruleId]).toBe(compiled.relations);
      expect(compiled.tool).toBe(compiled.rule.tool);
      expect(compiled.kind).toBe(compiled.rule.kind);
      expect(compiled.plan).toEqual(new TraversalPlan(compiled.rule.matcher!));
    }
  });
});

describe('the Claude skill slice of the reference graph (T130, T133)', () => {
  it('ships only read-authorizing Claude records and no exclusion', () => {
    // The phase-local half of the registry catalog check: the shipped Claude
    // catalog is the command, instruction, MCP carrier, permission-policy,
    // rule-file, and skill rules, all read-authorizing. No `excluded` or
    // `relationship-only` Claude row ships yet — a symlinked skill needs none
    // because links are read through their targets (FR-024), an unsupported
    // instruction location is simply a path no selector reaches (T232), a
    // standalone `.claude/prompts` directory is another one (FR-034, T445),
    // and the plugin/User exclusions ship with the phases that own their
    // surfaces (T309) — and the eventual complete catalog gate is T913's, not
    // this suite's.
    const claudeRules = rules.filter((rule) => rule.tool === 'claude');
    expect(claudeRules.map((rule) => rule.ruleId)).toEqual([
      'claude.repo.agent',
      'claude.repo.command',
      'claude.repo.instructions',
      'claude.repo.mcp',
      'claude.repo.permissions',
      'claude.repo.rules',
      'claude.repo.skill',
    ]);
    for (const rule of claudeRules) {
      expect(rule.discoveryClass, rule.ruleId).toBe('static-candidate');
    }
  });

  it('bases the rule on the Repository behavior and explains it by the selection strategy', () => {
    // The reciprocal edges the phase adds, asserted by identity: the edge must
    // hold the record the registry publishes, not an equal-looking copy.
    const relations = RULE_RELATIONS['claude.repo.skill'];
    expect(relations.basedOnBehaviors).toEqual([
      VENDOR_BEHAVIOR_STATEMENTS['claude.behavior.repo.skills'],
    ]);
    expect(relations.basedOnBehaviors[0]).toBe(
      VENDOR_BEHAVIOR_STATEMENTS['claude.behavior.repo.skills'],
    );
    expect(relations.explainedByStrategies).toEqual([
      RUNTIME_COMPOSITION_STRATEGIES['claude.skills.selection'],
    ]);
    expect(relations.explainedByStrategies[0]).toBe(
      RUNTIME_COMPOSITION_STRATEGIES['claude.skills.selection'],
    );
  });
});

describe('the Copilot skill slice of the reference graph (T154, T158)', () => {
  it('ships every read-authorizing Copilot candidate and exactly two exclusions', () => {
    // The phase-local half of the registry catalog check: the shipped Copilot
    // catalog is the skill rule, the CLI MCP carrier rule (T339), the two
    // VS Code MCP rules (T359), the seven instruction rules, the command and
    // prompt rules (T537), and the two custom-agent rules (T551) — one per
    // documented agents directory, because the Cloud agent reads only
    // `.github/agents/` and a rule's surfaces come from the behaviors it
    // rests on — all read-authorizing, plus the catalog's first two
    // `excluded` records. The
    // eventual complete catalog gate is T913's, not this suite's.
    //
    // Naming the exclusions is what makes them reviewable: rejecting a
    // configured or environment-supplied root is still the matchers' own
    // doing — no selector reaches outside the fixed directory spellings — so
    // an exclusion record states that the omission was decided, and a third
    // one appearing here would be an exclusion nobody reviewed.
    const byClass = (discoveryClass: string): string[] =>
      rules
        .filter((rule) => rule.tool === 'copilot' && rule.discoveryClass === discoveryClass)
        .map((rule) => rule.ruleId);
    expect(byClass('static-candidate')).toEqual([
      'copilot.repo.agent',
      'copilot.repo.agent.claude',
      'copilot.repo.command',
      'copilot.repo.instructions.agents',
      'copilot.repo.instructions.claude-root',
      'copilot.repo.instructions.gemini-root',
      'copilot.repo.instructions.path',
      'copilot.repo.instructions.path-cli-context',
      'copilot.repo.instructions.repository',
      'copilot.repo.instructions.repository-cli-context',
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode',
      'copilot.repo.mcp.vscode-root',
      'copilot.repo.prompt',
      'copilot.repo.skill',
    ]);
    expect(byClass('excluded')).toEqual([
      'copilot.excluded.additional-standard-locations',
      'copilot.excluded.extra-directories',
    ]);
    expect(rules.filter((rule) => rule.tool === 'copilot')).toHaveLength(17);
  });

  it('gives an exclusion no matcher, no kind, and no strategy (T251)', () => {
    // An excluded record is the opposite of an admission: it states that a
    // documented location is outside this release. A matcher would make it
    // read-authorizing, a recognized kind would claim it recognizes something,
    // and a strategy would explain an order for a file that is never read. It
    // still names the behaviors it leaves out, which is what keeps "outside
    // this release" distinguishable from "the vendor documents nothing here".
    for (const ruleId of [
      'copilot.excluded.additional-standard-locations',
      'copilot.excluded.extra-directories',
    ] as const) {
      const rule = INSPECTION_RULES[ruleId];
      expect(rule.matcher, ruleId).toBeNull();
      expect(rule.kind, ruleId).toBeNull();
      expect(RULE_RELATIONS[ruleId].explainedByStrategies, ruleId).toEqual([]);
      expect(RULE_RELATIONS[ruleId].basedOnBehaviors.length, ruleId).toBeGreaterThan(0);
    }
    expect(
      RULE_RELATIONS['copilot.excluded.additional-standard-locations'].basedOnBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual([
      'copilot.behavior.cli.instructions.claude',
      'copilot.behavior.cli.instructions.gemini',
      'copilot.behavior.vscode.instructions.claude',
      'copilot.behavior.vscode.instructions.path',
    ]);
    expect(
      RULE_RELATIONS['copilot.excluded.extra-directories'].basedOnBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual([
      // The CLI agents behavior is here because COPILOT_CUSTOM_INSTRUCTIONS_DIRS
      // supplies additional AGENTS.md files as well as *.instructions.md ones.
      'copilot.behavior.cli.instructions.agents',
      'copilot.behavior.cli.instructions.path',
      'copilot.behavior.cli.skills',
      'copilot.behavior.vscode.instructions.path',
      'copilot.behavior.vscode.skills',
    ]);
  });

  it('splits each documented filename into the surfaces its rules rest on (T251, T257)', () => {
    // The phase's whole subject: a rule carries the surfaces of the behaviors
    // it is based on, so a root-exact rule and a CLI-context rule over one
    // filename are what let a root file name all three surfaces while a nested
    // one names the CLI's alone. Read off the compiled units, because that is
    // the value a recognition publishes.
    const surfacesOf = (ruleId: string): readonly string[] =>
      COPILOT_REPOSITORY_RULES.find((compiled) => compiled.rule.ruleId === ruleId)!
        .recognizingSurfaces;
    expect(surfacesOf('copilot.repo.instructions.repository')).toEqual([
      'copilot-vscode',
      'copilot-cloud',
    ]);
    expect(surfacesOf('copilot.repo.instructions.repository-cli-context')).toEqual(['copilot-cli']);
    expect(surfacesOf('copilot.repo.instructions.path')).toEqual([
      'copilot-vscode',
      'copilot-cloud',
    ]);
    expect(surfacesOf('copilot.repo.instructions.path-cli-context')).toEqual(['copilot-cli']);
    // `AGENTS.md` is the one location all three surfaces document without a
    // split, and `GEMINI.md` the one no editor documents at all.
    expect(surfacesOf('copilot.repo.instructions.agents')).toEqual([
      'copilot-vscode',
      'copilot-cli',
      'copilot-cloud',
    ]);
    expect(surfacesOf('copilot.repo.instructions.claude-root')).toEqual([
      'copilot-vscode',
      'copilot-cli',
      'copilot-cloud',
    ]);
    expect(surfacesOf('copilot.repo.instructions.gemini-root')).toEqual([
      'copilot-cli',
      'copilot-cloud',
    ]);
  });

  it('grants the hosted organization instructions no candidate at all (T252)', () => {
    // The origin-file-less instruction fact: it names no local path, so no
    // rule may rest on it and nothing about it can create a candidate. Its
    // only owner is the Cloud layering that composes it.
    for (const edges of Object.values(RULE_RELATIONS)) {
      expect(edges.basedOnBehaviors.map((behavior) => behavior.behaviorId)).not.toContain(
        'copilot.behavior.cloud.organization-instructions',
      );
    }
    const owners = Object.entries(STRATEGY_RELATIONS).filter(([, edges]) =>
      edges.consumesBehaviors.some(
        (behavior) => behavior.behaviorId === 'copilot.behavior.cloud.organization-instructions',
      ),
    );
    expect(owners.map(([strategyId]) => strategyId)).toEqual([
      'copilot.cloud.instructions.layering',
    ]);
    expect(
      VENDOR_BEHAVIOR_STATEMENTS['copilot.behavior.cloud.organization-instructions'].locator,
    ).toEqual({
      vendorScope: 'hosted-managed',
      lookupBase: 'hosted-state',
      relativeSelector: null,
      traversal: 'none',
    });
  });

  it('authors the three exact root-anchored selector programs and no broadening (T154)', () => {
    // One program per fixed directory, each `[<dir>, 'skills', ANY_NAME,
    // 'SKILL.md']` anchored at the Repository root: no Copilot surface
    // documents a downward skill lookup from a root context, so a leading
    // recursive step would inventory nested contexts this product does not
    // select (FR-003). Exactly one dynamic skill-name child and the exact
    // terminal literal; asserting the literals is what makes a fourth
    // directory — a configured root, a `COPILOT_SKILLS_DIRS` value —
    // unrepresentable rather than merely absent
    // (contracts/vendors/github-copilot.md § Inspector Repository matcher
    // rules).
    const matcher = INSPECTION_RULES['copilot.repo.skill']!.matcher!;
    expect(matcher.selectors).toHaveLength(3);
    for (const selector of matcher.selectors) {
      expect(selector[0]!.kind).not.toBe('recursive-directories');
    }
    expect(matcher.selectors.map((selector) => selector.map((segment) => segment.kind))).toEqual([
      ['literal', 'literal', 'regex', 'literal'],
      ['literal', 'literal', 'regex', 'literal'],
      ['literal', 'literal', 'regex', 'literal'],
    ]);
    expect(
      matcher.selectors.map((selector) =>
        selector.flatMap((segment) => (segment.kind === 'literal' ? [segment.value] : [])),
      ),
    ).toEqual([
      ['.github', 'skills', 'SKILL.md'],
      ['.agents', 'skills', 'SKILL.md'],
      ['.claude', 'skills', 'SKILL.md'],
    ]);
  });

  it('bases the rule on the three surface behaviors and explains it by their strategies', () => {
    // The reciprocal edges the phase adds, asserted by identity: the edge must
    // hold the record the registry publishes, not an equal-looking copy. The
    // User, command, and hosted scopes are deliberately absent from
    // `basedOnBehaviors` — they are Source boundaries this rule may not read.
    const relations = RULE_RELATIONS['copilot.repo.skill'];
    expect(relations.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.skills',
      'copilot.behavior.cloud.skills',
      'copilot.behavior.vscode.skills',
    ]);
    for (const behavior of relations.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    expect(relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.skills.selection',
      'copilot.cloud.skills.selection',
      'copilot.vscode.skills.selection',
    ]);
    for (const strategy of relations.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });

  it('derives the surface-dependent same-name statement from the three strategies', () => {
    // The CLI documents a first-found winner; VS Code and Cloud record
    // selection whose duplicate order is unresolved. No single statement is
    // true of the product, so the grouped row states that the rule depends on
    // the surface — never the CLI's winner as a product-wide claim
    // (`skill-resolution.ts`; FR-007).
    expect(sameNameSkillResolutionFor('copilot')).toBe('surface-dependent');
  });
});

// Applies one authored selector program to one already-split public path.
// This is a reading of the closed grammar, not a re-implementation of the
// walk: a literal equals the raw entry name, a dynamic step is its own
// unmodified regular expression, and the recursive step consumes zero or
// more directory entries (data-model.md § StructuredInspectorMatcher). The
// two selector-matrix suites below (T179, T269) share it.
function matches(program: readonly MatcherSegment[], segments: readonly string[]): boolean {
  function step(programIndex: number, segmentIndex: number): boolean {
    if (programIndex === program.length) {
      return segmentIndex === segments.length;
    }
    const matcherSegment = program[programIndex]!;
    if (matcherSegment.kind === 'recursive-directories') {
      for (let taken = 0; segmentIndex + taken < segments.length; taken += 1) {
        if (step(programIndex + 1, segmentIndex + taken)) {
          return true;
        }
      }
      return false;
    }
    if (segmentIndex >= segments.length) {
      return false;
    }
    const name = segments[segmentIndex]!;
    const admitted =
      matcherSegment.kind === 'literal'
        ? matcherSegment.value === name
        : matcherSegment.pattern.test(name);
    return admitted && step(programIndex + 1, segmentIndex + 1);
  }
  return step(0, 0);
}

// The distinct tools whose rules admit the given path, sorted. What a matrix
// case asserts is a tool combination, so the reduction from rules to tools
// lives beside the matcher reading rather than in every case.
function admittingTools(
  candidateRules: readonly (typeof rules)[number][],
  path: string,
): readonly string[] {
  const segments = path.split('/');
  return [
    ...new Set(
      candidateRules.flatMap((rule) =>
        rule.matcher !== null &&
        rule.matcher.selectors.some((selector) => matches(selector, segments))
          ? [rule.tool]
          : [],
      ),
    ),
  ].sort();
}

describe('the unified SKILL selector matrix (T179)', () => {
  // Phase 12 turns the three vendor demonstrations into one inventory, so the
  // complete selector catalog and the tool combinations it implies become one
  // contract: which shipped programs share a directory spelling is exactly
  // what makes one physical file publish once with several recognitions
  // (data-model.md § ToolRecognition). These cases assert the authored
  // matcher records; the real traversal semantics over a built tree are the
  // integration suite's (tests/integration/repository-scan.test.ts).
  const skillRules = rules.filter((rule) => rule.kind === 'skill');

  it('ships exactly the three vendors’ read-authorizing skill rules', () => {
    expect(skillRules.map((rule) => rule.ruleId).sort()).toEqual([
      'claude.repo.skill',
      'codex.repo.skill',
      'copilot.repo.skill',
    ]);
    for (const rule of skillRules) {
      expect(rule.discoveryClass, rule.ruleId).toBe('static-candidate');
      expect(rule.matcher, rule.ruleId).not.toBeNull();
    }
  });

  // The complete recognition matrix, one representative path per combination:
  // the four positive combinations the shipped programs must produce — the
  // three root rows plus Claude's descendant-only row — and the near misses
  // no combination may claim. VCS internals are absent on purpose — their
  // exclusion is the traversal boundary's, not any matcher's.
  const RECOGNITION_MATRIX: readonly (readonly [string, readonly string[]])[] = [
    ['.github/skills/ship/SKILL.md', ['copilot']],
    ['.agents/skills/orbit/SKILL.md', ['codex', 'copilot']],
    ['.claude/skills/lander/SKILL.md', ['claude', 'copilot']],
    // Claude's documented lazy descendant discovery is the one downward
    // program; no other vendor documents one (FR-003).
    ['packages/api/.claude/skills/deploy/SKILL.md', ['claude']],
    ['packages/api/.agents/skills/deploy/SKILL.md', []],
    ['packages/api/.github/skills/nested-ship/SKILL.md', []],
    // Configured-root shapes stay condition facts rather than selectors.
    ['.copilot/skills/tool/SKILL.md', []],
    // No skill-name segment, one level too deep, and a sibling companion.
    ['.agents/skills/SKILL.md', []],
    ['.agents/skills/orbit/nested/SKILL.md', []],
    ['.agents/skills/orbit/README.md', []],
  ];

  it('admits each representative path for exactly the contracted tool combination', () => {
    for (const [path, expected] of RECOGNITION_MATRIX) {
      expect(admittingTools(skillRules, path), path).toEqual(expected);
    }
  });
});

describe('the unified instruction selector matrix (T269)', () => {
  // Phase 21 consolidates the per-vendor instruction phases into the explicit
  // shared-file matrix, so the complete static selector catalog and the tool
  // combinations it implies become one contract, exactly as T179 did for
  // skills. These cases assert the authored matcher records; the traversal
  // semantics over a built tree — the derived fallback expansion included —
  // are the integration suite's (tests/integration/repository-scan.test.ts).
  const instructionRules = rules.filter((rule) => rule.kind === 'instructions');
  const staticInstructionRules = instructionRules.filter(
    (rule) => rule.discoveryClass === 'static-candidate',
  );

  it('ships exactly the nine static instruction selectors of the three vendors', () => {
    expect(staticInstructionRules.map((rule) => rule.ruleId).sort()).toEqual([
      'claude.repo.instructions',
      'codex.repo.instructions',
      'copilot.repo.instructions.agents',
      'copilot.repo.instructions.claude-root',
      'copilot.repo.instructions.gemini-root',
      'copilot.repo.instructions.path',
      'copilot.repo.instructions.path-cli-context',
      'copilot.repo.instructions.repository',
      'copilot.repo.instructions.repository-cli-context',
    ]);
    for (const rule of staticInstructionRules) {
      expect(rule.matcher, rule.ruleId).not.toBeNull();
    }
  });

  it('ships the derived fallback rule as identity only', () => {
    // The configured fallbacks reach the walk through the configuration-read
    // stage, so the shipped record is the derived candidates' identity and
    // nothing else: no matcher, and no second Codex instruction selector that
    // could admit a fallback name by path (data-model.md § InspectionRule).
    const derived = instructionRules.filter(
      (rule) => rule.discoveryClass === 'bounded-derived-candidate',
    );
    expect(derived.map((rule) => rule.ruleId)).toEqual(['codex.derived.fallback-basename']);
    expect(derived[0]!.matcher).toBeNull();
    expect(derived[0]!.tool).toBe('codex');
  });

  it('keeps the instruction-adjacent exclusions non-authorizing', () => {
    // The two Copilot exclusions are the only shipped exclusion records, and
    // an exclusion authorizes nothing: no matcher to admit by and no kind to
    // recognize as (T251 owns their full shape).
    const exclusions = rules.filter((rule) => rule.discoveryClass === 'excluded');
    expect(exclusions.map((rule) => rule.ruleId).sort()).toEqual([
      'copilot.excluded.additional-standard-locations',
      'copilot.excluded.extra-directories',
    ]);
    for (const rule of exclusions) {
      expect(rule.matcher, rule.ruleId).toBeNull();
      expect(rule.kind, rule.ruleId).toBeNull();
    }
  });

  // The complete static recognition matrix, one representative path per
  // combination (Phase 21): `AGENTS.md` is Codex+Copilot at the root and
  // Copilot's alone below it, root `CLAUDE.md` is Claude+Copilot while a
  // nested `CLAUDE.md` is Claude-only, `CLAUDE.local.md` is Claude-only at
  // every depth, and the remaining Copilot spellings are Copilot's alone. A
  // configured fallback name is deliberately admitted by no static selector:
  // its only path into the walk is the configuration-read derivation, which
  // is what "never by filename inference" means. VCS internals and
  // `node_modules` are absent on purpose — their exclusion is the traversal
  // boundary's, not any matcher's.
  const RECOGNITION_MATRIX: readonly (readonly [string, readonly string[]])[] = [
    ['AGENTS.md', ['codex', 'copilot']],
    ['AGENTS.override.md', ['codex']],
    ['docs/AGENTS.md', ['copilot']],
    ['CLAUDE.md', ['claude', 'copilot']],
    ['packages/api/CLAUDE.md', ['claude']],
    ['.claude/CLAUDE.md', ['claude']],
    ['CLAUDE.local.md', ['claude']],
    ['packages/api/CLAUDE.local.md', ['claude']],
    ['GEMINI.md', ['copilot']],
    ['packages/api/GEMINI.md', []],
    ['.github/copilot-instructions.md', ['copilot']],
    ['packages/api/.github/copilot-instructions.md', ['copilot']],
    ['.github/instructions/frontend.instructions.md', ['copilot']],
    ['packages/api/.github/instructions/api.instructions.md', ['copilot']],
    // A declared fallback basename and its carrier: no static selector.
    ['TEAM_GUIDE.md', []],
    ['.codex/config.toml', []],
    // Nested override, excluded Copilot locations, and spelling variants.
    ['packages/api/AGENTS.override.md', []],
    ['.claude/rules/style.md', []],
    ['.copilot/instructions/personal.instructions.md', []],
    ['AGENT.md', []],
    ['.github/instructions/README.md', []],
  ];

  it('admits each representative path for exactly the contracted tool combination', () => {
    for (const [path, expected] of RECOGNITION_MATRIX) {
      expect(admittingTools(staticInstructionRules, path), path).toEqual(expected);
    }
  });
});

describe('the Codex MCP carrier slice of the reference graph (T282)', () => {
  it('registers the carrier as its first and only candidacy across the catalog', () => {
    // "First and only" is a property of the complete registry, not of the
    // Codex catalog alone: a second rule of any vendor admitting
    // `.codex/config.toml` would publish the carrier twice with two reads.
    const admitting = rules.filter(
      (rule) =>
        rule.matcher !== null &&
        rule.matcher.selectors.some((selector) => matches(selector, ['.codex', 'config.toml'])),
    );
    expect(admitting.map((rule) => rule.ruleId)).toEqual(['codex.repo.config']);
    const config = INSPECTION_RULES['codex.repo.config'];
    expect(config.discoveryClass).toBe('static-candidate');
    // Admitted for the MCP inventory: the rows are the contained
    // `[mcp_servers.*]` declarations (data-model.md § Inventory unit).
    expect(config.kind).toBe('MCP');
    expect(config.sourceKinds).toEqual(['repository']);
  });

  it('keeps the fallback derivation Phase 15’s and adds no other Codex row', () => {
    // The carrier's candidacy does not reshape the derivation: the seed is
    // still the configuration read, never the admission. The complete Codex
    // catalog is static candidates plus that one derivation — no exclusion,
    // no relationship-only row, and no plugin/User/managed promotion (every
    // row stays Repository-scoped). A later inventory phase adds its own
    // static candidate here; what this list holds fixed is that nothing else
    // arrives with it.
    const derived = INSPECTION_RULES['codex.derived.fallback-basename'];
    expect(derived.discoveryClass).toBe('bounded-derived-candidate');
    expect(derived.kind).toBe('instructions');
    expect(derived.matcher).toBeNull();
    const codexRules = rules.filter((rule) => rule.tool === 'codex');
    expect(codexRules.map((rule) => rule.ruleId)).toEqual([
      'codex.derived.fallback-basename',
      'codex.repo.agent',
      'codex.repo.config',
      'codex.repo.instructions',
      'codex.repo.rules',
      'codex.repo.skill',
    ]);
    for (const rule of codexRules) {
      expect(rule.sourceKinds, rule.ruleId).toEqual(['repository']);
    }
  });

  it('admits each product exactly its own MCP carrier (T306)', () => {
    // Inline servers are metadata on the admitted carrier; each product's
    // carrier is its own — Codex's config layer, Claude's exact root
    // `.mcp.json` — and no rule admits the other product's spelling or a
    // location its product does not read.
    const mcpRules = rules.filter((rule) => rule.kind === 'MCP');
    // Sorted: the aggregate's own order is per-vendor spread order, which is
    // not what this case is about.
    expect(mcpRules.map((rule) => rule.ruleId).toSorted()).toEqual([
      'claude.repo.mcp',
      'codex.repo.config',
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode',
      'copilot.repo.mcp.vscode-root',
    ]);
    const MCP_MATRIX: readonly (readonly [string, readonly string[]])[] = [
      ['.codex/config.toml', ['codex']],
      // A subdirectory carrier is a runtime-chain member no product's rule
      // reads from the selected root's frame — the Codex config chain, the
      // Claude project file, and the Copilot CLI workspace walk all admit at
      // the selected root alone — while the shared root `.mcp.json` is one
      // candidate two products admit.
      ['packages/api/.codex/config.toml', []],
      ['packages/api/.mcp.json', []],
      ['.mcp.json', ['claude', 'copilot']],
      ['.github/mcp.json', ['copilot']],
      ['packages/api/.github/mcp.json', []],
      ['.mcp.json.bak', []],
      ['.claude/mcp.json', []],
      // The User MCP filenames are `<home>` facts, not Repository ones.
      ['.claude.json', []],
      ['mcp-config.json', []],
      // The dedicated VS Code carrier is Copilot's own (T359), and a
      // subdirectory `.vscode` belongs to a workspace this product does not
      // select.
      ['.vscode/mcp.json', ['copilot']],
      ['packages/api/.vscode/mcp.json', []],
      ['.vscode/settings.json', []],
      ['.vscode/mcp.jsonc', []],
      ['.codex/config.toml.bak', []],
      ['.codex/hooks.json', []],
    ];
    for (const [path, expected] of MCP_MATRIX) {
      expect(admittingTools(mcpRules, path), path).toEqual(expected);
    }
  });

  it('bases the carrier on its three behaviors and grants the contained hooks no candidate', () => {
    // The reciprocal edges the phase adds, asserted by identity: the edge
    // must hold the record the registry publishes, not an equal-looking copy.
    const relations = RULE_RELATIONS['codex.repo.config'];
    expect(relations.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
      'codex.behavior.repo.hooks',
      'codex.behavior.repo.mcp',
    ]);
    for (const behavior of relations.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    expect(relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
      'codex.mcp.configuration',
    ]);
    for (const strategy of relations.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The contained-Hook behavior is recorded — the carrier can hold an
    // inline `[hooks]` table — while no shipped rule recognizes the hook
    // kind: recording a documented fact is not authorizing a candidate.
    expect(rules.filter((rule) => rule.kind === 'hook')).toEqual([]);
  });
});

describe('structure-only projection vocabulary', () => {
  // The registries describe where files are and how documented that is. They
  // must not be able to express a verdict about the inspected customization —
  // validity, quality, compliance, effectiveness — or a remediation, because
  // the product renders registry data directly and any such value would
  // become a claim about the user's own files (spec.md QR-001).
  const FORBIDDEN = [
    'valid',
    'invalid',
    'correct',
    'incorrect',
    'compliant',
    'compliance',
    'effective',
    'quality',
    'lint',
    'remediat',
    'fix-',
    'severity',
    'score',
    'rank-',
    'recommend',
  ];

  it('keeps verdict and remediation words out of every registry value', () => {
    const serialized = JSON.stringify([
      VENDOR_BEHAVIOR_STATEMENTS,
      RUNTIME_COMPOSITION_STRATEGIES,
      INSPECTION_RULES,
    ]).toLowerCase();
    for (const word of FORBIDDEN) {
      expect(serialized).not.toContain(word);
    }
  });
});
