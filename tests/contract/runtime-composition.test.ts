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

/** How many cells a normative strategy row has; see {@link parseStrategyRow}. */
const STRATEGY_ROW_CELLS = 8;

/**
 * Parses one strategy's row out of a runtime-composition contract file. The
 * row is found by its backticked strategy ID in the first cell; backticked
 * tokens are extracted per cell, so the English `, ` and Japanese `、`
 * separators parse identically.
 *
 * A strategy ID can open more than one row of that contract: the canonical
 * evidence-assessment index keys its exceptions by the same ID, in a
 * four-column table. The normative row is the one with the strategy table's
 * own column count, so the cell count is what selects it — reading the first
 * match instead would compare a documentation status against an operations
 * list.
 */
function parseStrategyRow(path: string, strategyId: string): ContractStrategyRow {
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith(`| \`${strategyId}\` |`)) {
      continue;
    }
    const cells = line.replace(/^\| /u, '').replace(/ \|$/u, '').split(' | ');
    if (cells.length !== STRATEGY_ROW_CELLS) {
      continue;
    }
    const tokens = (cell: string | undefined): string[] =>
      [...(cell ?? '').matchAll(/`([^`]+)`/gu)].map((match) => match[1]!);
    return {
      operations: tokens(cells[2]),
      consumesBehaviors: tokens(cells[4]),
      evidence: tokens(cells[7]),
    };
  }
  throw new Error(`no normative ${strategyId} row in ${path}`);
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

/** The three Copilot instruction layerings, as the cases below index them. */
type CopilotInstructionStrategyId =
  | 'copilot.cli.instructions.layering'
  | 'copilot.cloud.instructions.layering'
  | 'copilot.vscode.instructions.layering';

/** The seven Copilot instruction rules, as the cases below index them. */
type CopilotInstructionRuleId =
  | 'copilot.repo.instructions.agents'
  | 'copilot.repo.instructions.claude-root'
  | 'copilot.repo.instructions.gemini-root'
  | 'copilot.repo.instructions.path'
  | 'copilot.repo.instructions.path-cli-context'
  | 'copilot.repo.instructions.repository'
  | 'copilot.repo.instructions.repository-cli-context';

describe('the Copilot instruction composition strategies (T262)', () => {
  /** The three surface layerings the Copilot instruction rules name. */
  const COPILOT_INSTRUCTION_STRATEGY_IDS = [
    'copilot.cli.instructions.layering',
    'copilot.cloud.instructions.layering',
    'copilot.vscode.instructions.layering',
  ] as const;

  it('ships one pipeline per surface, never one merged product claim', () => {
    // The three surfaces document incompatible composition — the CLI
    // deduplicates identical files of three documented categories and
    // establishes no precedence among the rest, Cloud takes the nearest
    // `AGENTS.md` on the worked path while leaving the combined files' order
    // unresolved, and VS Code has a layer order but no order inside a layer —
    // so collapsing them would invent a product-wide rule no surface
    // documents (FR-009).
    const operations = Object.fromEntries(
      COPILOT_INSTRUCTION_STRATEGY_IDS.map((strategyId) => [
        strategyId,
        RUNTIME_COMPOSITION_STRATEGIES[strategyId].operations,
      ]),
    );
    expect(operations).toEqual({
      'copilot.cli.instructions.layering': ['filter', 'deduplicate', 'append', 'unknown-order'],
      'copilot.cloud.instructions.layering': [
        'filter',
        'select-closest',
        'append',
        'unknown-order',
      ],
      'copilot.vscode.instructions.layering': ['filter', 'append', 'unknown-order'],
    });
    for (const strategyId of COPILOT_INSTRUCTION_STRATEGY_IDS) {
      const record = RUNTIME_COMPOSITION_STRATEGIES[strategyId];
      expect(record.tool, strategyId).toBe('copilot');
      expect(record.surfaces, strategyId).toHaveLength(1);
    }
    // `unknown-order` on all three is the content, not a gap: what is
    // unresolved stays unresolved rather than becoming an inferred winner —
    // the Cloud pipeline's own unknowns are the order among the combined
    // repository files and the coexistence of the agent-instruction
    // alternatives.
    for (const strategyId of COPILOT_INSTRUCTION_STRATEGY_IDS) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategyId].documentationStatus, strategyId).toBe(
        'partially-documented',
      );
    }
  });

  it('composes each surface from exactly its own documented scopes, by identity', () => {
    // Every scope the surface reads, User and hosted included: a behavior
    // grants no read authority, so naming one says what the product documents
    // rather than what the Inspector may open. The Cloud pipeline's hosted
    // organization layer is listed exactly like a located scope — what it
    // lacks is a path, not a place in the composition.
    const consumed = (strategyId: CopilotInstructionStrategyId): readonly string[] =>
      STRATEGY_RELATIONS[strategyId].consumesBehaviors.map((behavior) => behavior.behaviorId);
    expect(consumed('copilot.cli.instructions.layering')).toEqual([
      'copilot.behavior.cli.instructions.agents',
      'copilot.behavior.cli.instructions.claude',
      'copilot.behavior.cli.instructions.gemini',
      'copilot.behavior.cli.instructions.path',
      'copilot.behavior.cli.instructions.repository',
      'copilot.behavior.cli.user.instructions.path',
      'copilot.behavior.cli.user.instructions.root',
    ]);
    expect(consumed('copilot.cloud.instructions.layering')).toEqual([
      'copilot.behavior.cloud.instructions.agents',
      'copilot.behavior.cloud.instructions.alternatives',
      'copilot.behavior.cloud.instructions.path',
      'copilot.behavior.cloud.instructions.repository',
      'copilot.behavior.cloud.organization-instructions',
    ]);
    expect(consumed('copilot.vscode.instructions.layering')).toEqual([
      'copilot.behavior.vscode.instructions.agents',
      'copilot.behavior.vscode.instructions.claude',
      'copilot.behavior.vscode.instructions.path',
      'copilot.behavior.vscode.instructions.repository',
      'copilot.behavior.vscode.user.claude',
      'copilot.behavior.vscode.user.instructions',
    ]);
    for (const strategyId of COPILOT_INSTRUCTION_STRATEGY_IDS) {
      for (const behavior of STRATEGY_RELATIONS[strategyId].consumesBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
    }
    // No settings behavior takes part. `chat.instructionsFilesLocations` and
    // the CLI's own configuration decide at runtime which locations
    // participate, and that stays a condition rather than a scope a strategy
    // composes — a settings statement would invite a settings rule, and this
    // wave authorizes no settings read.
    for (const strategyId of COPILOT_INSTRUCTION_STRATEGY_IDS) {
      for (const behaviorId of consumed(strategyId)) {
        expect(behaviorId, strategyId).not.toContain('settings');
      }
    }
  });

  it('explains each instruction rule through the surfaces it rests on, by identity', () => {
    // The reciprocal half of the split: a rule's strategies are the layerings
    // of the surfaces its behaviors belong to, so the root-exact rule is
    // explained by two and its CLI-context twin by one. That is what makes a
    // recognition's surfaces readable off the rule rather than inferred.
    const explained = (ruleId: CopilotInstructionRuleId): readonly string[] =>
      RULE_RELATIONS[ruleId].explainedByStrategies.map((strategy) => strategy.strategyId);
    expect(explained('copilot.repo.instructions.repository')).toEqual([
      'copilot.cloud.instructions.layering',
      'copilot.vscode.instructions.layering',
    ]);
    expect(explained('copilot.repo.instructions.repository-cli-context')).toEqual([
      'copilot.cli.instructions.layering',
    ]);
    expect(explained('copilot.repo.instructions.path')).toEqual([
      'copilot.cloud.instructions.layering',
      'copilot.vscode.instructions.layering',
    ]);
    expect(explained('copilot.repo.instructions.path-cli-context')).toEqual([
      'copilot.cli.instructions.layering',
    ]);
    expect(explained('copilot.repo.instructions.agents')).toEqual([
      'copilot.cli.instructions.layering',
      'copilot.cloud.instructions.layering',
      'copilot.vscode.instructions.layering',
    ]);
    expect(explained('copilot.repo.instructions.claude-root')).toEqual([
      'copilot.cli.instructions.layering',
      'copilot.cloud.instructions.layering',
      'copilot.vscode.instructions.layering',
    ]);
    // VS Code documents no `GEMINI.md`, so its layering is absent here rather
    // than assumed from the root alternative beside it.
    expect(explained('copilot.repo.instructions.gemini-root')).toEqual([
      'copilot.cli.instructions.layering',
      'copilot.cloud.instructions.layering',
    ]);
    for (const [ruleId, edges] of Object.entries(RULE_RELATIONS)) {
      if (!ruleId.startsWith('copilot.repo.instructions.')) {
        continue;
      }
      for (const strategy of edges.explainedByStrategies) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
      }
    }
  });

  it.each(COPILOT_INSTRUCTION_STRATEGY_IDS)(
    'states the %s contract row reciprocally with the shipped record, in both languages',
    (strategyId) => {
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
