// T052/T060/T126/T130/T133/T154/T158/T179: the inspection-rule half of the registry contract gate — the
// closed matcher grammar, deterministic compilation into the immutable
// versioned `TraversalPlan`, reciprocal references, the same-name skill
// statement each rule derives, and the closed structure-only projection
// vocabulary.
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
import { RULE_RELATIONS } from '../../src/shared/registries/relations';
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
  it('ships exactly one read-authorizing Claude record and no exclusion', () => {
    // The phase-local half of the registry catalog check: this milestone adds
    // `claude.repo.skill` alone. No `excluded` or `relationship-only` Claude
    // row ships yet — a symlinked skill needs none because links are read
    // through their targets (FR-024) — and the eventual complete catalog gate
    // is T913's, not this suite's.
    const claudeRules = rules.filter((rule) => rule.tool === 'claude');
    expect(claudeRules.map((rule) => rule.ruleId)).toEqual(['claude.repo.skill']);
    expect(claudeRules[0]!.discoveryClass).toBe('static-candidate');
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
  it('ships exactly one read-authorizing Copilot record and no exclusion', () => {
    // The phase-local half of the registry catalog check: this milestone adds
    // `copilot.repo.skill` alone. Rejecting configured or environment-supplied
    // skill roots needs no `excluded` record — no selector reaches outside the
    // three fixed directory spellings — and the eventual complete catalog gate
    // is T913's, not this suite's.
    const copilotRules = rules.filter((rule) => rule.tool === 'copilot');
    expect(copilotRules.map((rule) => rule.ruleId)).toEqual(['copilot.repo.skill']);
    expect(copilotRules[0]!.discoveryClass).toBe('static-candidate');
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

  // Applies one authored selector program to one already-split public path.
  // This is a reading of the closed grammar, not a re-implementation of the
  // walk: a literal equals the raw entry name, a dynamic step is its own
  // unmodified regular expression, and the recursive step consumes zero or
  // more directory entries (data-model.md § StructuredInspectorMatcher).
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
      const segments = path.split('/');
      const tools = [
        ...new Set(
          skillRules.flatMap((rule) =>
            rule.matcher!.selectors.some((selector) => matches(selector, segments))
              ? [rule.tool]
              : [],
          ),
        ),
      ].sort();
      expect(tools, path).toEqual(expected);
    }
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
