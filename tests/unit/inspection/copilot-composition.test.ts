// T260: what Copilot's documented instruction composition does and does not
// let this product say (FR-001, FR-007, FR-009;
// contracts/runtime-composition.md § GitHub Copilot strategies).
//
// The three surfaces compose instructions incompatibly, and two of the three
// leave order unresolved. That makes this kind's risk the opposite of a
// missing feature: it is a surface quietly answering a question the vendor
// left open — which file wins, whether a location is enabled, whether a
// declared pattern matches the session. These cases pin the three places that
// answer could leak in — the declared range, the boundary above the selected
// root, and the shipped strategies — and prove none of them does.
//
// The declared range's own derivation is `rules.test.ts`; what this suite adds
// is what the product does with it afterwards, which is nothing.
import { describe, expect, it } from 'vitest';

import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS } from '../../../src/shared/registries/relations';
import { RUNTIME_COMPOSITION_STRATEGIES } from '../../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../../src/shared/registries/vendor-behaviors';
import type { DeclaredEntryDto } from '../../../src/shared/api-types';

/** The compiled Copilot instruction units, which are what a scan submits. */
const copilotInstructionRules = COPILOT_REPOSITORY_RULES.filter(
  (compiled) => compiled.kind === 'instructions',
);

describe('an `applyTo` declaration keys a row and decides nothing else', () => {
  /** One `applyTo` declaration, as the parser resolves it. */
  const declaredApplyTo = (text: string): readonly DeclaredEntryDto[] => [
    { key: 'applyTo', keyKind: 'string', value: { kind: 'scalar', scalarKind: 'string', text } },
  ];

  it('takes the declared pattern as the row identity without interpreting it', () => {
    // The value is a glob the author wrote for their own repository. This
    // product neither matches it against anything nor normalizes its
    // spelling: rows group by exact text (spec.md § Clarifications), so two
    // spellings of one intent are two rows and that is the honest outcome
    // rather than a similarity judgement.
    const pathRule = copilotInstructionRules.find(
      (compiled) => compiled.rule.ruleId === 'copilot.repo.instructions.path',
    )!;
    if (pathRule.kind !== 'instructions') {
      throw new Error('expected a compiled Copilot instruction rule');
    }
    const admitted = '.github/instructions/frontend.instructions.md';
    for (const declared of ['src/**', 'src/**/', '**/*.ts,**/*.tsx', '!src/vendor/**']) {
      expect(pathRule.applicabilityRangeOf(admitted, declaredApplyTo(declared)), declared).toBe(
        declared,
      );
    }
  });

  it('claims nothing about which files a session would actually match', () => {
    // `target-match` is a required condition fact of every Copilot instruction
    // layering: whether a declared pattern matches depends on the path the
    // session is working on, which this product never observes. So the range
    // is published and no surface pairs it with a repository file, a count, or
    // a verdict — the inventory row lists the files that *govern* a range, not
    // the files a range would reach.
    const pathRule = INSPECTION_RULES['copilot.repo.instructions.path'];
    expect(pathRule.kind).toBe('instructions');
    // A rule states where the Inspector may read; it holds no matcher over the
    // declared pattern and no field that could carry a match result.
    expect(Object.keys(pathRule)).not.toContain('applicability');
    expect(Object.keys(pathRule)).not.toContain('conditions');
  });
});

describe('no rule or strategy reaches above the selected root', () => {
  it('bases every Copilot instruction matcher at the one Repository boundary', () => {
    // Both local surfaces document discovery above their own base — VS Code's
    // opt-in parent-repository setting, the CLI's directories between the
    // repository root and its runtime working directory. The Inspector's
    // selected root *is* that boundary (FR-001), so an upward walk terminates
    // at it and needs no notation: every shipped selector is anchored there,
    // and there is deliberately no upward axis to author one with.
    expect(copilotInstructionRules.length).toBeGreaterThan(0);
    for (const compiled of copilotInstructionRules) {
      expect(compiled.plan.boundary, compiled.rule.ruleId).toEqual({ kind: 'repository' });
      for (const selector of compiled.plan.selectors) {
        expect(selector.mode, compiled.rule.ruleId).toBe('repository-program');
      }
    }
  });

  it('keeps the parent-discovery setting a documented behavior and never a locator', () => {
    // The behavior statements record the vendor's own lookup, and none of the
    // instruction ones names a base outside the repository or the user's own
    // home. A locator is documentation and grants no read authority
    // (contracts/inspection-path-allowlist.md § "Vendor locators are not
    // Inspector matchers"), so recording parent discovery cannot widen a scan.
    const instructionBehaviors = Object.values(VENDOR_BEHAVIOR_STATEMENTS).filter(
      (statement) => statement.tool === 'copilot' && statement.behaviorId.includes('.instructions'),
    );
    expect(instructionBehaviors.length).toBeGreaterThan(0);
    for (const statement of instructionBehaviors) {
      expect(
        ['workspace-root', 'repository-root', 'runtime-cwd', 'tool-home', 'profile-data'],
        statement.behaviorId,
      ).toContain(statement.locator!.lookupBase);
      // A recursive token in a locator would read as an Inspector selector.
      expect(statement.locator!.relativeSelector ?? '', statement.behaviorId).not.toMatch(/\*\*/u);
    }
  });
});

describe('no surface derives a general winner from the shipped strategies', () => {
  it('records the unresolved order rather than an operation that resolves it', () => {
    // All three pipelines end in `unknown-order`, which is the content of the
    // vendor's documentation and not a gap in this record: the CLI establishes
    // no precedence among the non-identical files it combines, VS Code
    // guarantees no order inside a layer, and Cloud leaves the order among the
    // combined repository files unresolved. An operation that selected among
    // them would be this product's invention.
    for (const strategyId of [
      'copilot.cli.instructions.layering',
      'copilot.cloud.instructions.layering',
      'copilot.vscode.instructions.layering',
    ] as const) {
      const operations = RUNTIME_COMPOSITION_STRATEGIES[strategyId].operations;
      expect(operations.at(-1), strategyId).toBe('unknown-order');
      expect(operations, strategyId).not.toContain('select-first');
      expect(operations, strategyId).not.toContain('replace');
    }
    // The Cloud pipeline documents one selection and only one — the nearest
    // `AGENTS.md` on the worked path — so it carries `select-closest` beside
    // its own unknowns: the order among the combined repository files and the
    // coexistence of the agent-instruction alternatives.
    const cloud = RUNTIME_COMPOSITION_STRATEGIES['copilot.cloud.instructions.layering'].operations;
    expect(cloud).toContain('select-closest');
  });

  it('gives one documented filename its surfaces separately rather than merged', () => {
    // The reason no product-wide winner can be stated at all: the same
    // filename is read from different bases by different surfaces, so the
    // rules that admit it are split and each names its own layering. A single
    // rule explained by all three would be the merged claim
    // (contracts/vendors/github-copilot.md § Surface boundary).
    const rootExact = RULE_RELATIONS['copilot.repo.instructions.repository'];
    const cliContext = RULE_RELATIONS['copilot.repo.instructions.repository-cli-context'];
    expect(rootExact.explainedByStrategies.map((strategy) => strategy.strategyId)).not.toContain(
      'copilot.cli.instructions.layering',
    );
    expect(cliContext.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.instructions.layering',
    ]);
    // And the two rules admit the same filename, which is what makes the split
    // a statement about surfaces rather than about files.
    const terminalLiteral = (ruleId: string): string | undefined => {
      const selector =
        INSPECTION_RULES[ruleId as keyof typeof INSPECTION_RULES].matcher!.selectors[0]!;
      const terminal = selector.at(-1)!;
      return terminal.kind === 'literal' ? terminal.value : undefined;
    };
    expect(terminalLiteral('copilot.repo.instructions.repository')).toBe('copilot-instructions.md');
    expect(terminalLiteral('copilot.repo.instructions.repository-cli-context')).toBe(
      'copilot-instructions.md',
    );
  });

  it('reads no settings file to decide any of it', () => {
    // Enablement is settings-dependent for every one of these locations, and
    // this wave authorizes no settings read: no Copilot rule of any class
    // names a settings behavior, and the only rule that could reach a settings
    // path — one with a matcher — recognizes instructions or skills.
    const copilotRules = Object.values(INSPECTION_RULES).filter((rule) => rule.tool === 'copilot');
    for (const rule of copilotRules) {
      expect(rule.kind, rule.ruleId).not.toBe('settings/config');
      for (const behavior of RULE_RELATIONS[rule.ruleId].basedOnBehaviors) {
        expect(behavior.behaviorId, rule.ruleId).not.toContain('settings');
      }
    }
  });
});
