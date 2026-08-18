// T219/T239: the instruction slice of the runtime-composition graph, with
// reciprocal contract references (contracts/runtime-composition.md § Codex and
// Claude rows; FR-035, FR-009).
//
// The generic registry gates (`vendor-behaviors.test.ts`) prove every record
// resolves, cites, and serializes; what this suite pins is the instruction
// graph itself — the two strategies the instruction rules rest on, the exact
// documented operations the same-name statements and the detail phases read,
// and the edges from each instruction rule to them — and that the normative
// contract row for each strategy states, in both languages, exactly what the
// shipped record ships. A strategy explains a documented runtime edge and
// never creates one: no operation here authorizes a read, projects a winner,
// or emits a relationship (T217, T221).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RUNTIME_COMPOSITION_STRATEGIES } from '../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../src/shared/registries/vendor-behaviors';
import { RULE_RELATIONS, STRATEGY_RELATIONS } from '../../src/shared/registries/relations';

/** The two strategies the Codex instruction rules name (codex/relations.ts). */
const INSTRUCTION_STRATEGY_IDS = [
  'codex.config.precedence',
  'codex.instructions.layering',
] as const;

/**
 * One normative strategy row of the runtime-composition contract, reduced to
 * the operational columns a registry record must agree with. The description
 * and conditionality columns are prose the generic documentation review owns.
 */
interface ContractStrategyRow {
  /** The backticked operations column, in row order. */
  readonly operations: readonly string[];
  /** The backticked consumed-behavior column, in row order. */
  readonly consumesBehaviors: readonly string[];
  /** The backticked evidence column, in row order. */
  readonly evidence: readonly string[];
}

/**
 * Parses one strategy's row out of a runtime-composition contract file. The
 * row is found by its backticked strategy ID in the first cell; backticked
 * tokens are extracted per cell, so the English `, ` and Japanese `、`
 * separators parse identically.
 */
function parseStrategyRow(path: string, strategyId: string): ContractStrategyRow {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith(`| \`${strategyId}\` |`)) {
      continue;
    }
    const cells = line.replace(/^\| /u, '').replace(/ \|$/u, '').split(' | ');
    const tokens = (cell: string | undefined): string[] =>
      [...(cell ?? '').matchAll(/`([^`]+)`/gu)].map((match) => match[1]!);
    return {
      operations: tokens(cells[2]),
      consumesBehaviors: tokens(cells[4]),
      evidence: tokens(cells[7]),
    };
  }
  throw new Error(`no ${strategyId} row in ${path}`);
}

describe('the Codex instruction composition strategies (T219)', () => {
  it('ships the layering pipeline with its exact documented operations', () => {
    // `select-first`, `concatenate`, `filter` is the complete documented
    // pipeline — per-directory first-non-empty selection, broad-to-narrow
    // concatenation, and the upstream byte budget. The same-name and detail
    // surfaces derive from these operations, so the exact list is contract,
    // not description (contracts/runtime-composition.md
    // § codex.instructions.layering).
    const layering = RUNTIME_COMPOSITION_STRATEGIES['codex.instructions.layering'];
    expect(layering.tool).toBe('codex');
    expect(layering.operations).toEqual(['select-first', 'concatenate', 'filter']);
    expect(layering.documentationStatus).toBe('documented');
  });

  it('ships the config precedence the fallback derivation rests on', () => {
    // The configured fallback basenames are configuration values this
    // resolution supplies (Phase 15's configuration read), which is why the
    // derivation names it below (contracts/runtime-composition.md
    // § codex.config.precedence).
    const precedence = RUNTIME_COMPOSITION_STRATEGIES['codex.config.precedence'];
    expect(precedence.tool).toBe('codex');
    expect(precedence.operations).toEqual(['merge-map', 'replace', 'select-closest']);
    expect(precedence.documentationStatus).toBe('documented');
  });

  it('composes each strategy from exactly its documented behaviors, by identity', () => {
    // Both scopes are listed even though only the Repository one is readable:
    // the strategy describes Codex's runtime, and omitting the User half
    // would misdescribe the chain as starting at the project root. Each edge
    // holds the published record itself, never an equal-looking copy.
    const layered = STRATEGY_RELATIONS['codex.instructions.layering'].consumesBehaviors;
    expect(layered.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.instructions',
      'codex.behavior.user.instructions',
    ]);
    const preceded = STRATEGY_RELATIONS['codex.config.precedence'].consumesBehaviors;
    expect(preceded.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
      'codex.behavior.user.config',
    ]);
    for (const behavior of [...layered, ...preceded]) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains each instruction rule through these strategies, by identity', () => {
    // The static instruction rule rests on the project lookup alone and is
    // explained by the layering that owns the selection order it does not
    // project (FR-009); the fallback derivation spans both behaviors and both
    // strategies, because precedence supplies the declared names and layering
    // the selection they join (codex/relations.ts).
    const staticRule = RULE_RELATIONS['codex.repo.instructions'];
    expect(staticRule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.instructions',
    ]);
    expect(staticRule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.instructions.layering',
    ]);
    const derivedRule = RULE_RELATIONS['codex.derived.fallback-basename'];
    expect(derivedRule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
      'codex.behavior.repo.instructions',
    ]);
    expect(derivedRule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
      'codex.instructions.layering',
    ]);
    for (const strategy of [
      ...staticRule.explainedByStrategies,
      ...derivedRule.explainedByStrategies,
    ]) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });

  it.each(INSTRUCTION_STRATEGY_IDS)(
    'states the %s contract row reciprocally with the shipped record, in both languages',
    (strategyId) => {
      // The bilingual contract is the normative side and the registry its
      // implementation counterpart; the reciprocal check is what keeps one
      // from drifting past the other — a shipped operation the row does not
      // state, or a row behavior the relation does not consume, fails here.
      const record = RUNTIME_COMPOSITION_STRATEGIES[strategyId];
      const consumed = STRATEGY_RELATIONS[strategyId].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      );
      const cited = record.evidence.map((citation) => citation.sourceId);
      expect(cited.length).toBeGreaterThan(0);
      for (const path of [
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
      ]) {
        const row = parseStrategyRow(path, strategyId);
        expect(row.operations, path).toEqual(record.operations);
        expect(row.consumesBehaviors, path).toEqual(consumed);
        expect(row.evidence, path).toEqual(cited);
      }
    },
  );
});

describe('the Claude instruction composition strategy (T239)', () => {
  it('ships one operation, which is the whole documented statement', () => {
    // `append` alone, and the absence is the content: every discovered file is
    // added rather than one winning, and the page states there is no hard
    // precedence between levels. A `select-first` or `replace` here would
    // record a resolution the vendor does not document, which is exactly what
    // the instruction detail must not project (FR-009,
    // contracts/runtime-composition.md § claude.instructions.layering).
    const layering = RUNTIME_COMPOSITION_STRATEGIES['claude.instructions.layering'];
    expect(layering.tool).toBe('claude');
    expect(layering.operations).toEqual(['append']);
    expect(layering.documentationStatus).toBe('documented');
    expect(layering.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from all four documented scopes, by identity', () => {
    // The User file is listed even though only the Repository scopes are
    // readable: the strategy describes Claude's runtime, and omitting it would
    // misdescribe the documented broadest-to-most-specific order as starting
    // at the repository (claude/relations.ts).
    const consumed = STRATEGY_RELATIONS['claude.instructions.layering'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.instructions.ancestor',
      'claude.behavior.repo.instructions.descendant',
      'claude.behavior.repo.instructions.launch',
      'claude.behavior.user.instructions',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the instruction rule through that strategy alone, by identity', () => {
    // The rule rests on the three Repository lookups it admits for — the User
    // file is a different Source boundary it may not read — and names one
    // strategy, which owns the load order the rule deliberately does not
    // project. The three Repository behaviors are what the any-depth matcher
    // covers between them, so a rule based on fewer would admit paths no
    // documented lookup reaches.
    const rule = RULE_RELATIONS['claude.repo.instructions'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.instructions.ancestor',
      'claude.behavior.repo.instructions.descendant',
      'claude.behavior.repo.instructions.launch',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.instructions.layering',
    ]);
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    // Same gate as the Codex rows: the bilingual contract is the normative
    // side and the registry its implementation counterpart, so a shipped
    // operation the row does not state — or a row behavior the relation does
    // not consume — fails here rather than in review.
    const record = RUNTIME_COMPOSITION_STRATEGIES['claude.instructions.layering'];
    const consumed = STRATEGY_RELATIONS['claude.instructions.layering'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'claude.instructions.layering');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});
