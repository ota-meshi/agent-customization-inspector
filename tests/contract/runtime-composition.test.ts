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
//
// One gate here is contract-wide rather than instruction-scoped: the
// canonical evidence-assessment index is normative for every subject this
// contract owns, and the shipped `documentationStatus` and
// `lifecycleQualifiers` fields (T028) are its expansion, so this is where
// that expansion is checked against both language versions (QR-005).
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { RUNTIME_COMPOSITION_STRATEGIES } from '../../src/shared/registries/runtime-composition';
import { INSPECTION_RULES } from '../../src/shared/registries/inspection-rules';
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

/** How many cells an evidence-assessment exception row has; see {@link parseAssessmentExceptions}. */
const ASSESSMENT_ROW_CELLS = 4;

/**
 * Parses the canonical evidence-assessment index out of a runtime-composition
 * contract file: every subject the exception table lists, mapped to its
 * documentation status and its lifecycle qualifiers.
 *
 * The index is a closed subject-by-subject mapping whose unlisted subjects
 * take the defaults, and the contract states that the typed registry expands
 * that default-plus-exception table to one record per subject. This parser is
 * what lets the expansion be checked rather than assumed: a strategy that
 * gains a non-default status in the registry without joining the table would
 * otherwise be `documented` in the normative contract and something else in
 * the shipped record, with no gate between them.
 *
 * The exception rows are told from the strategy rows by their cell count, the
 * way {@link parseStrategyRow} tells them apart from the other side.
 */
function parseAssessmentExceptions(path: string): Map<string, [string, string[]]> {
  const exceptions = new Map<string, [string, string[]]>();
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.startsWith('| `')) {
      continue;
    }
    const cells = line.replace(/^\| /u, '').replace(/ \|$/u, '').split(' | ');
    if (cells.length !== ASSESSMENT_ROW_CELLS) {
      continue;
    }
    const tokens = (cell: string | undefined): string[] =>
      [...(cell ?? '').matchAll(/`([^`]+)`/gu)].map((match) => match[1]!);
    const [subject] = tokens(cells[0]);
    const [status] = tokens(cells[1]);
    if (subject === undefined || status === undefined) {
      continue;
    }
    // The qualifier cell is one backticked array literal — `[]`, or
    // `[preview]` — rather than one token per qualifier, so the members are
    // read out of the brackets. The English `, ` and Japanese `、`
    // separators are both accepted, as in the strategy rows.
    const [literal = '[]'] = tokens(cells[2]);
    const qualifiers = literal
      .replace(/^\[/u, '')
      .replace(/\]$/u, '')
      .split(/,\s*|、/u)
      .filter((qualifier) => qualifier !== '');
    exceptions.set(subject, [status, qualifiers]);
  }
  return exceptions;
}

describe('the canonical evidence-assessment index (QR-005)', () => {
  it('expands to every shipped strategy record, in both languages', () => {
    // Exhaustive rather than sampled, and driven from the registry rather
    // than from the table: the failure this catches is a subject whose
    // record carries a non-default assessment while the table still leaves
    // it to the defaults, which reads as `documented` in the one artifact
    // that is normative for it. Only this direction is checked, because the
    // table also carries the assessments of subjects whose records ship in
    // later phases — an unmatched exception row is pending work, not drift.
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const exceptions = parseAssessmentExceptions(path);
      for (const [strategyId, record] of Object.entries(RUNTIME_COMPOSITION_STRATEGIES)) {
        const [status, qualifiers] = exceptions.get(strategyId) ?? ['documented', []];
        expect(record.documentationStatus, `${strategyId} in ${path}`).toBe(status);
        expect(record.lifecycleQualifiers, `${strategyId} in ${path}`).toEqual(qualifiers);
      }
    }
  });
});

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

describe('the Claude rule composition strategy (T431)', () => {
  it('ships the rule layering pipeline with its exact documented operations', () => {
    // `filter`, `append` is the complete documented pipeline: a `paths` rule
    // is kept out of context until Claude reads a file its glob matches, and
    // the applicable layers are added rather than made to override each
    // other. The page states no order among same-layer rules, and none is
    // claimed (contracts/runtime-composition.md § claude.rules.layering).
    const layering = RUNTIME_COMPOSITION_STRATEGIES['claude.rules.layering'];
    expect(layering.tool).toBe('claude');
    expect(layering.operations).toEqual(['filter', 'append']);
    // The on-demand trigger for a nested rules directory and the base an
    // ancestor layer resolves its `paths` globs against are what the page
    // leaves open (contracts/runtime-composition.md § Canonical
    // evidence-assessment index).
    expect(layering.documentationStatus).toBe('partially-documented');
    expect(layering.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from both documented rule scopes, by identity', () => {
    // User rules load before project rules, which is what gives project rules
    // the higher priority; omitting the User half would describe the layering
    // as starting at the repository.
    const consumed = STRATEGY_RELATIONS['claude.rules.layering'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.rules',
      'claude.behavior.user.rules',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the rule-file rule through the layering strategy alone, by identity', () => {
    const rule = RULE_RELATIONS['claude.repo.rules'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.rules',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.rules.layering',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `rule` kind and projects no activation of a `paths`
    // glob (FR-009, FR-019).
    expect(INSPECTION_RULES['claude.repo.rules'].kind).toBe('rule');
    expect(INSPECTION_RULES['claude.repo.rules'].precedenceGroup).toBeNull();
  });
});

describe('the Codex rule composition strategy (T413)', () => {
  it('ships the rule resolution pipeline with its exact documented operations', () => {
    // `filter`, `select-first` is the complete documented pipeline: the
    // layers actually in play are kept — the active User and Team Config
    // layers and the project layers whose `.codex/` is trusted — and when
    // several rules match one command the most restrictive decision applies,
    // `forbidden` over `prompt` over `allow`. `select-first` is over that
    // fixed severity order rather than over a layer order, because the page
    // establishes no precedence between layers at all
    // (contracts/runtime-composition.md § codex.rules.resolution).
    const resolution = RUNTIME_COMPOSITION_STRATEGIES['codex.rules.resolution'];
    expect(resolution.tool).toBe('codex');
    expect(resolution.operations).toEqual(['filter', 'select-first']);
    // Nested recursion under a layer's `rules/` is unspecified and the
    // feature is documented as experimental, which is what keeps the record
    // short of `documented` (contracts/runtime-composition.md § Canonical
    // evidence-assessment index).
    expect(resolution.documentationStatus).toBe('partially-documented');
    expect(resolution.lifecycleQualifiers).toEqual(['experimental']);
  });

  it('composes the strategy from both documented rule scopes, by identity', () => {
    // The User half is listed even though only the project layers are
    // readable: the restrictive decision is taken across every active layer
    // at once, so omitting it would describe a combination over the
    // repository alone.
    const consumed = STRATEGY_RELATIONS['codex.rules.resolution'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.rules',
      'codex.behavior.user.rules',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the rule-file rule through the resolution strategy alone, by identity', () => {
    // The rule's own candidacy rests on the project rule lookup alone — the
    // User layer the same startup scan reads is a Source boundary it may not
    // open — while the restrictive combination across layers stays the
    // strategy's, never something the rule projects (FR-009;
    // codex/relations.ts).
    const rule = RULE_RELATIONS['codex.repo.rules'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.rules',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.rules.resolution',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `permissions` kind — the file decides which commands may
    // run outside the sandbox — and carries no projection of a decision.
    expect(INSPECTION_RULES['codex.repo.rules'].kind).toBe('permissions');
    expect(INSPECTION_RULES['codex.repo.rules'].precedenceGroup).toBeNull();
  });
});

describe('the Codex MCP composition strategy (T296)', () => {
  it('ships the MCP configuration pipeline with its exact documented operations', () => {
    // `merge-map`, `replace` is the complete documented pipeline: the
    // per-name declarations merge across the active config layers and a
    // closer layer's declaration replaces a broader one's. Trust, enablement,
    // and availability stay condition facts rather than operations, and no
    // operation connects: a strategy explains a documented runtime edge and
    // never creates one (contracts/runtime-composition.md
    // § codex.mcp.configuration).
    const configuration = RUNTIME_COMPOSITION_STRATEGIES['codex.mcp.configuration'];
    expect(configuration.tool).toBe('codex');
    expect(configuration.operations).toEqual(['merge-map', 'replace']);
    expect(configuration.documentationStatus).toBe('documented');
  });

  it('composes the strategy from the declaration and host-config behaviors, by identity', () => {
    // The User half is listed even though only the Repository carrier is
    // readable: the same layer resolution reads the host configuration, and
    // omitting it would misdescribe the merge as project-only. No agent
    // behavior is consumed — the agent-inheritance edge stays dormant until
    // the phase that ships Codex agents, with nothing here for it to link
    // back to.
    const consumed = STRATEGY_RELATIONS['codex.mcp.configuration'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.mcp',
      'codex.behavior.user.config',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the carrier rule through the precedence and MCP strategies, by identity', () => {
    // The carrier's candidacy rests on the three behaviors its contract row
    // names — the contained-Hook statement among them, recorded without any
    // Hook candidate — and is explained by the precedence that resolves the
    // layers and the MCP configuration that resolves the contained
    // declarations (codex/relations.ts).
    const carrier = RULE_RELATIONS['codex.repo.config'];
    expect(carrier.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
      'codex.behavior.repo.hooks',
      'codex.behavior.repo.mcp',
    ]);
    expect(carrier.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
      'codex.mcp.configuration',
    ]);
    for (const strategy of carrier.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    for (const behavior of carrier.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    // The instruction-fallback graph stays what Phase 15 made it: the
    // derivation still spans the config and instruction behaviors and both of
    // their strategies, untouched by the carrier's candidacy.
    const fallback = RULE_RELATIONS['codex.derived.fallback-basename'];
    expect(fallback.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
      'codex.instructions.layering',
    ]);
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    // The bilingual contract is the normative side and the registry its
    // implementation counterpart, so a shipped operation the row does not
    // state — or a row behavior the relation does not consume — fails here
    // rather than in review.
    const record = RUNTIME_COMPOSITION_STRATEGIES['codex.mcp.configuration'];
    const consumed = STRATEGY_RELATIONS['codex.mcp.configuration'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'codex.mcp.configuration');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
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

describe('the Claude MCP composition strategy (T317, T327)', () => {
  it('ships the MCP selection pipeline with its exact documented operations', () => {
    // `select-first`, `replace`, `filter` is the complete documented
    // pipeline: one entire same-name entry is selected in local, project,
    // User, plugin, then connector order, the closer scope's entry replaces
    // the broader one's whole rather than merging fields, and a subagent
    // filters the inherited tools. Trust, approval, and enablement stay
    // condition facts rather than operations, and no operation connects
    // (contracts/runtime-composition.md § claude.mcp.selection).
    const selection = RUNTIME_COMPOSITION_STRATEGIES['claude.mcp.selection'];
    expect(selection.tool).toBe('claude');
    expect(selection.operations).toEqual(['select-first', 'replace', 'filter']);
    // Partially documented per the canonical index: the exact project-root
    // selection the project scope rests on is only partially specified.
    expect(selection.documentationStatus).toBe('partially-documented');
  });

  it('composes the strategy from every documented scope of its order, by identity', () => {
    // Only the project carrier is readable; the agent, plugin, User-state,
    // and installed-plugin statements are listed all the same, because the
    // strategy describes Claude's runtime and omitting one would misdescribe
    // the documented scope order. Each is a non-authorizing statement — no
    // rule reads its surface, so no unresolved reference and no read
    // authority hides behind the future owner families (T327).
    const consumed = STRATEGY_RELATIONS['claude.mcp.selection'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.agents',
      'claude.behavior.repo.mcp',
      'claude.behavior.repo.plugin',
      'claude.behavior.user.mcp-state',
      'claude.behavior.user.plugins',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the carrier rule through the selection strategy, by identity', () => {
    const carrier = RULE_RELATIONS['claude.repo.mcp'];
    expect(carrier.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.mcp',
    ]);
    expect(carrier.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.mcp.selection',
    ]);
    for (const behavior of carrier.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of carrier.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });

  it('grants MCP-looking spellings in files of other kinds no registry surface (T327)', () => {
    // Only explicit MCP configuration joins the MCP surfaces: a file of
    // another kind that spells MCP configuration — a skill's or an agent's
    // frontmatter, a settings file's inline map — is that kind's ordinary
    // content, so the skill rule's edges stay the skill's — its selection
    // strategy, its one Repository behavior — with no contained-MCP rule,
    // behavior, or strategy ID to dangle from. What the registry proves is
    // that every reference the shipped records make resolves to a currently
    // owned record.
    const skill = RULE_RELATIONS['claude.repo.skill'];
    expect(skill.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.skills',
    ]);
    expect(skill.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.skills.selection',
    ]);
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    const record = RUNTIME_COMPOSITION_STRATEGIES['claude.mcp.selection'];
    const consumed = STRATEGY_RELATIONS['claude.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'claude.mcp.selection');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Copilot Cloud MCP composition strategy (T379)', () => {
  it('consumes the one hosted behavior and adds no candidate rule', () => {
    // The pipeline's three inputs — out-of-box, custom-agent, and
    // repository-settings MCP — are the hosted behavior's own documented
    // sources; none is a local file, so no rule of the MCP or agent kind
    // joins the catalog with it, and nothing about a custom agent is
    // referenced before its own inventory wave.
    const consumed = STRATEGY_RELATIONS['copilot.cloud.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    expect(consumed).toEqual(['copilot.behavior.cloud.mcp']);
    expect(
      Object.values(INSPECTION_RULES).filter(
        (rule) => rule.kind === 'agent' && rule.discoveryClass !== 'excluded',
      ),
    ).toEqual([]);
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    const record = RUNTIME_COMPOSITION_STRATEGIES['copilot.cloud.mcp.selection'];
    // `replace` alone, partially documented: the cited page fixes the
    // three-level processing order and the later-overrides-earlier
    // direction, but neither the override unit nor any cross-level merge
    // rule, so no `merge-map` step may be recorded from it (QR-005).
    expect(record.operations).toEqual(['replace']);
    expect(record.documentationStatus).toBe('partially-documented');
    const consumed = STRATEGY_RELATIONS['copilot.cloud.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'copilot.cloud.mcp.selection');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Copilot VS Code MCP composition strategy (T367)', () => {
  it('consumes the workspace and User MCP inputs, and deliberately no agent input', () => {
    // The pipeline spans the documented filesystem inputs whose same-name
    // winner the 1.118 release note leaves unresolved: the workspace files
    // and the User configuration. An agent profile is no input — the
    // custom-agents reference documents its mcp-servers field as not used
    // in VS Code custom agents — and plugin servers are runtime inputs with
    // no behavior record to consume.
    const consumed = STRATEGY_RELATIONS['copilot.vscode.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    expect(consumed).toEqual(['copilot.behavior.vscode.mcp', 'copilot.behavior.vscode.user.mcp']);
  });

  it('retains the location conflict and the unknown total order as recorded facts', () => {
    // The current guide's exhaustive location list and the 1.118 release
    // note disagree, and no page defines the root file's schema or a total
    // same-name order — the strategy states that rather than composing an
    // inferred winner (FR-009).
    const record = RUNTIME_COMPOSITION_STRATEGIES['copilot.vscode.mcp.selection'];
    expect(record.documentationStatus).toBe('conflict');
    expect(record.operations).toEqual(['merge-map', 'replace', 'unknown-order']);
    const behavior = VENDOR_BEHAVIOR_STATEMENTS['copilot.behavior.vscode.mcp'];
    expect(behavior.documentationStatus).toBe('conflict');
    expect(behavior.evidence.map((citation) => citation.sourceId)).toEqual([
      'vscode.copilot.mcp',
      'vscode.copilot.mcp.workspace-root-release',
    ]);
  });

  it('explains both VS Code rules through the one selection strategy', () => {
    // Both read-authorizing rules rest on the one workspace behavior — the
    // dedicated carrier on its guide half, the root provenance on its
    // release-note half — and the selection strategy explains the documented
    // outcome neither rule projects (FR-009).
    for (const ruleId of ['copilot.repo.mcp.vscode', 'copilot.repo.mcp.vscode-root'] as const) {
      const rule = RULE_RELATIONS[ruleId];
      expect(
        rule.basedOnBehaviors.map((behavior) => behavior.behaviorId),
        ruleId,
      ).toEqual(['copilot.behavior.vscode.mcp']);
      expect(
        rule.explainedByStrategies.map((strategy) => strategy.strategyId),
        ruleId,
      ).toEqual(['copilot.vscode.mcp.selection']);
    }
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    const record = RUNTIME_COMPOSITION_STRATEGIES['copilot.vscode.mcp.selection'];
    const consumed = STRATEGY_RELATIONS['copilot.vscode.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'copilot.vscode.mcp.selection');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Copilot CLI MCP composition strategy (T347)', () => {
  it('consumes exactly the workspace and User carrier behaviors', () => {
    // The one CLI MCP pipeline spans the two declaration sources the vendor
    // documents on the local filesystem — the workspace files and the User
    // configuration — and nothing else: session-additional configuration and
    // plugin-provided servers are runtime inputs with no behavior record to
    // consume, and the exclusion keeping the User file out of the read
    // allowlist ships with the Global phase that owns it.
    const consumed = STRATEGY_RELATIONS['copilot.cli.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    expect(consumed).toEqual(['copilot.behavior.cli.mcp', 'copilot.behavior.cli.user.mcp']);
  });

  it('explains the carrier rule through the one selection strategy', () => {
    // The read-authorizing rule rests on the CLI workspace behavior alone —
    // admission is not an activation, and the User behavior authorizes no
    // Repository read — while the selection strategy is what explains a
    // duplicate's documented outcome (FR-009).
    const rule = RULE_RELATIONS['copilot.repo.mcp'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.mcp',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.mcp.selection',
    ]);
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    const record = RUNTIME_COMPOSITION_STRATEGIES['copilot.cli.mcp.selection'];
    const consumed = STRATEGY_RELATIONS['copilot.cli.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'copilot.cli.mcp.selection');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Claude settings precedence strategy (T1110)', () => {
  it('ships the precedence pipeline with its exact documented operations', () => {
    // `replace` for a scalar key the higher scope sets, `merge-map` because a
    // key the higher scope omits keeps the lower scope's value, and
    // `concatenate` then `deduplicate` for an array-valued key such as
    // `permissions.allow`, which the page states merges across scopes rather
    // than being replaced (contracts/runtime-composition.md
    // § claude.settings.precedence).
    const precedence = RUNTIME_COMPOSITION_STRATEGIES['claude.settings.precedence'];
    expect(precedence.tool).toBe('claude');
    expect(precedence.operations).toEqual(['replace', 'merge-map', 'concatenate', 'deduplicate']);
    // Two array keys are excepted from the merge and a security-sensitive tier
    // does not follow the order in either direction, so what a concrete key
    // does is not settled by the order alone.
    expect(precedence.documentationStatus).toBe('partially-documented');
    expect(precedence.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from both documented settings scopes, by identity', () => {
    // The documented order starts above the project files, so leaving the User
    // scope out would describe a precedence that begins where this product's
    // read authority happens to begin.
    const consumed = STRATEGY_RELATIONS['claude.settings.precedence'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.settings.local',
      'claude.behavior.repo.settings.shared',
      'claude.behavior.user.settings',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the permission-policy rule through the precedence strategy alone, by identity', () => {
    const rule = RULE_RELATIONS['claude.repo.permissions'];
    // Both project files, because the rule admits both and they are two
    // statements: the shared file stays in the project folder, the personal one
    // moves to the repository root with documented exceptions.
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.settings.local',
      'claude.behavior.repo.settings.shared',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.settings.precedence',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });
});
