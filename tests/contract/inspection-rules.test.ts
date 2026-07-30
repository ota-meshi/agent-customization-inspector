// T052/T060: the inspection-rule half of the registry contract gate — the
// closed matcher grammar, deterministic compilation into the immutable
// versioned `TraversalPlan`, reciprocal references, and the sole
// `EvidenceAssessment[]` assembler.
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
import type { VendorBehaviorStatement } from '../../src/shared/registries/behavior-types';
import { RULE_RELATIONS } from '../../src/shared/registries/relations';
import { RUNTIME_COMPOSITION_STRATEGIES } from '../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../src/shared/registries/vendor-behaviors';
import {
  TRAVERSAL_PLAN_SCHEMA_VERSION,
  assembleRuleEvidenceAssessments,
  assertLoadableTraversalPlan,
  TraversalPlan,
  type MatcherSegment,
} from '../../src/server/inspection/rules/registry';
import { CODEX_REPOSITORY_RULES } from '../../src/server/inspection/rules/codex';
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
        expect(rule.matcher).toBeNull();
      }
      // The first bounded-derived rule ships with the skill-metadata phase;
      // until then no rule may carry a derivation mapping.
      expect(rule.derivation).toBeNull();
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

describe('the sole EvidenceAssessment[] assembler (QR-005)', () => {
  const rule = INSPECTION_RULES['codex.repo.skill']!;
  const compiled = CODEX_REPOSITORY_RULES.find((entry) => entry.rule.ruleId === rule.ruleId)!;

  /**
   * The assembler takes the compiled rule whole, so a case that varies a
   * subject varies the relations the rule actually declares. Supplying an
   * unrelated array is no longer expressible, which is the point.
   */
  function assemble(overrides: Partial<typeof compiled> = {}) {
    return assembleRuleEvidenceAssessments({ ...compiled, ...overrides });
  }

  it('copies exactly one exact record per referenced subject', () => {
    const assessments = assemble();
    expect(assessments).toHaveLength(
      1 +
        RULE_RELATIONS[rule.ruleId].basedOnBehaviors.length +
        RULE_RELATIONS[rule.ruleId].explainedByStrategies.length,
    );
    expect(assessments).toContainEqual({
      subjectKind: 'rule',
      subjectId: 'codex.repo.skill',
      documentationStatus: rule.documentationStatus,
      lifecycleQualifiers: [],
    });
    expect(assessments).toContainEqual({
      subjectKind: 'behavior',
      subjectId: 'codex.behavior.repo.skills',
      documentationStatus:
        VENDOR_BEHAVIOR_STATEMENTS['codex.behavior.repo.skills']!.documentationStatus,
      lifecycleQualifiers: [],
    });
    expect(assessments).toContainEqual({
      subjectKind: 'strategy',
      subjectId: 'codex.skills.discovery',
      documentationStatus:
        RUNTIME_COMPOSITION_STRATEGIES['codex.skills.discovery']!.documentationStatus,
      lifecycleQualifiers: [],
    });
  });

  it('sorts by the fixed subject-kind order and then by subject ID', () => {
    const assessments = assemble({
      relations: {
        ...compiled.relations,
        basedOnBehaviors: [
          VENDOR_BEHAVIOR_STATEMENTS['codex.behavior.user.skills'],
          VENDOR_BEHAVIOR_STATEMENTS['codex.behavior.repo.skills'],
        ],
      },
    });
    expect(assessments.map((entry) => `${entry.subjectKind}:${entry.subjectId}`)).toEqual([
      'behavior:codex.behavior.repo.skills',
      'behavior:codex.behavior.user.skills',
      'rule:codex.repo.skill',
      'strategy:codex.skills.discovery',
    ]);
  });

  it('cannot reference a subject the registries do not publish', () => {
    // A relation holds the record, so there is no identifier to mistype: the
    // only way to name a behavior is to take one out of a catalog, and a
    // catalog is keyed by the closed union. This `@ts-expect-error` fails the
    // typecheck job if either half of that stops being true.
    const unknown = 'codex.behavior.does-not-exist';
    // @ts-expect-error - not a member of the closed BehaviorId catalog.
    const missing = VENDOR_BEHAVIOR_STATEMENTS[unknown] as VendorBehaviorStatement | undefined;
    expect(missing).toBeUndefined();
  });

  it('assembles one record for the rule and every subject its relations name', () => {
    // The completeness invariant, checked against the relations themselves
    // rather than a hard-coded count: an omitted behavior or strategy would
    // otherwise produce a shorter array that still looks valid.
    const assessments = assemble();
    const expected = [
      { subjectKind: 'rule', subjectId: compiled.rule.ruleId },
      ...compiled.relations.basedOnBehaviors.map((behavior) => ({
        subjectKind: 'behavior',
        subjectId: behavior.behaviorId,
      })),
      ...compiled.relations.explainedByStrategies.map((strategy) => ({
        subjectKind: 'strategy',
        subjectId: strategy.strategyId,
      })),
    ];
    expect(
      assessments
        .map((entry) => ({ subjectKind: entry.subjectKind, subjectId: entry.subjectId }))
        .sort((left, right) => (left.subjectId < right.subjectId ? -1 : 1)),
    ).toEqual(expected.sort((left, right) => (left.subjectId < right.subjectId ? -1 : 1)));
  });

  it('rejects a duplicate subject rather than emitting it twice', () => {
    const behavior = VENDOR_BEHAVIOR_STATEMENTS['codex.behavior.repo.skills'];
    expect(() =>
      assemble({ relations: { ...compiled.relations, basedOnBehaviors: [behavior, behavior] } }),
    ).toThrow(/duplicate evidence subject/u);
  });

  it('never reduces the records to a scalar, a worst status, or a qualifier union', () => {
    // The rule's own state is weakened on the record itself, because the
    // assembler takes the record: its ID and its evidence state cannot be
    // supplied separately, so they cannot disagree.
    const assessments = assemble({
      rule: {
        ...rule,
        documentationStatus: 'partially-documented',
        lifecycleQualifiers: ['experimental'],
      },
    });
    // The weaker rule status stays on the rule record only; the behavior and
    // strategy records keep their own values, which is the whole point of a
    // record-by-record array (QR-005).
    expect(assessments.find((entry) => entry.subjectKind === 'rule')).toMatchObject({
      documentationStatus: 'partially-documented',
      lifecycleQualifiers: ['experimental'],
    });
    expect(assessments.find((entry) => entry.subjectKind === 'behavior')).toMatchObject({
      documentationStatus: 'documented',
      lifecycleQualifiers: [],
    });
    expect(assessments).not.toHaveProperty('documentationStatus');
  });
});
