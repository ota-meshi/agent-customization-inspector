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

describe('the Claude command composition strategy (T451)', () => {
  it('ships the command selection pipeline with its exact documented operations', () => {
    // `select-first` is the complete documented pipeline: a command file and a
    // skill compete for one command name and the skill wins, so one input is
    // selected rather than both retained. The subdirectory namespacing keeps
    // two commands in different namespaces from being that clash at all
    // (contracts/runtime-composition.md § claude.commands.selection).
    const selection = RUNTIME_COMPOSITION_STRATEGIES['claude.commands.selection'];
    expect(selection.tool).toBe('claude');
    expect(selection.operations).toEqual(['select-first']);
    // Command files are said to work the way skills do, but the ancestor and
    // lazy-descendant traversal documented for skills is never restated for
    // the command directory (contracts/runtime-composition.md § Canonical
    // evidence-assessment index).
    expect(selection.documentationStatus).toBe('partially-documented');
    expect(selection.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from both command scopes and both skill scopes, by identity', () => {
    // The User scopes are listed even though only the project ones are
    // readable: omitting them would describe the selection as choosing among
    // project files alone. The skill scopes are listed because they are the
    // other side of the one selection this strategy records — the documented
    // outcome is that a same-name skill wins over a command, so a graph naming
    // only the command lookups would describe a choice with one candidate.
    const consumed = STRATEGY_RELATIONS['claude.commands.selection'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.commands',
      'claude.behavior.repo.skills',
      'claude.behavior.user.commands',
      'claude.behavior.user.skills',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the command rule through the selection strategy alone, by identity', () => {
    const rule = RULE_RELATIONS['claude.repo.command'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.commands',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.commands.selection',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `prompt/command` kind and projects no same-name skill
    // winner, no namespace, and no invocation (FR-009).
    expect(INSPECTION_RULES['claude.repo.command'].kind).toBe('prompt/command');
    expect(INSPECTION_RULES['claude.repo.command'].precedenceGroup).toBeNull();
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    // The bilingual contract is the normative side and the registry its
    // implementation counterpart; the reciprocal check is what keeps one from
    // drifting past the other.
    const record = RUNTIME_COMPOSITION_STRATEGIES['claude.commands.selection'];
    const consumed = STRATEGY_RELATIONS['claude.commands.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'claude.commands.selection');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Copilot command composition graph (T469)', () => {
  it('explains the command rule through the CLI skill selection alone, by identity', () => {
    // Copilot documents no command-specific composition: the outcome it
    // states — a same-name skill outranks a command — belongs to the skill
    // selection, and inventing a second strategy would record an edge no page
    // establishes (contracts/runtime-composition.md
    // § copilot.cli.skills.selection).
    const rule = RULE_RELATIONS['copilot.repo.command'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.commands',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.skills.selection',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `prompt/command` kind and projects no priority (FR-009).
    expect(INSPECTION_RULES['copilot.repo.command'].kind).toBe('prompt/command');
    expect(INSPECTION_RULES['copilot.repo.command'].precedenceGroup).toBeNull();
  });

  it('keeps the command behavior inside the strategy it was shipped for', () => {
    // The legacy command surface shipped with the skill phase because the
    // selection composes it; the command rule resting on it must not change
    // what that strategy consumes.
    const consumed = STRATEGY_RELATIONS['copilot.cli.skills.selection'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toContain(
      'copilot.behavior.cli.commands',
    );
  });
});

describe('the Copilot prompt composition graph (T497)', () => {
  it('names no strategy, because the contract row records none', () => {
    // The behavior's composition column is explicit prompt invocation: the
    // reader runs a prompt by hand, so there is no documented combination for
    // a strategy to describe and none is invented
    // (contracts/runtime-composition.md § Registry completeness).
    const rule = RULE_RELATIONS['copilot.repo.prompt'];
    expect(rule.explainedByStrategies).toEqual([]);
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.vscode.prompts',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `prompt/command` kind and projects no invocation
    // (FR-009).
    expect(INSPECTION_RULES['copilot.repo.prompt'].kind).toBe('prompt/command');
    expect(INSPECTION_RULES['copilot.repo.prompt'].precedenceGroup).toBeNull();
  });

  it('keeps the User prompt scope a statement no rule rests on', () => {
    // The profile scope is documented and unread: it exists as a maintained
    // record, and no shipped rule may name it as its basis (FR-016, FR-018).
    expect(VENDOR_BEHAVIOR_STATEMENTS['copilot.behavior.vscode.user.prompts']).toBeDefined();
    for (const relations of Object.values(RULE_RELATIONS)) {
      expect(relations.basedOnBehaviors.map((behavior) => behavior.behaviorId)).not.toContain(
        'copilot.behavior.vscode.user.prompts',
      );
    }
  });
});

describe('the Claude output-style composition strategy (T669)', () => {
  it('ships the selection pipeline with its exact documented operations', () => {
    // `select-closest`, `replace`: the page states that a same-name style
    // resolves to the project layer closest to the working directory, and
    // that one style is applied at a time — the `outputStyle` setting or the
    // session's choice picks it, and a plugin style marked `force-for-plugin`
    // overrides that choice
    // (contracts/runtime-composition.md § claude.output-style.selection).
    const selection = RUNTIME_COMPOSITION_STRATEGIES['claude.output-style.selection'];
    expect(selection.tool).toBe('claude');
    expect(selection.surfaces).toEqual(['claude-cli-and-ide-clients']);
    expect(selection.operations).toEqual(['select-closest', 'replace']);
    expect(selection.documentationStatus).toBe('documented');
    expect(selection.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from every documented style source, by identity', () => {
    // The closest-layer rule is about the project chain alone, while the style
    // a session ends up applying is chosen from every documented source: the
    // User layer, and the plugin scopes a plugin ships its `output-styles/`
    // directory through, whose `force-for-plugin` style overrides the user's
    // own setting. Omitting any of them would describe a selection over inputs
    // the page does not have.
    const consumed = STRATEGY_RELATIONS['claude.output-style.selection'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.output-style',
      'claude.behavior.repo.plugin',
      'claude.behavior.user.output-style',
      'claude.behavior.user.plugins',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the output-style rule through the selection strategy alone, by identity', () => {
    const rule = RULE_RELATIONS['claude.repo.output-style'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.output-style',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.output-style.selection',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });
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

describe('the Claude custom-agent composition strategies (T540)', () => {
  it('ships the selection pipeline with its exact documented operations', () => {
    // `select-first`, `select-closest`, `unknown-order` is the complete
    // documented pipeline: the higher-priority scope wins across managed,
    // session, project, User, and plugin locations, the closest project layer
    // wins among nested ones, and a duplicate inside one tree is recorded as
    // unresolved rather than ordered (contracts/runtime-composition.md
    // § claude.agents.selection).
    const selection = RUNTIME_COMPOSITION_STRATEGIES['claude.agents.selection'];
    expect(selection.tool).toBe('claude');
    expect(selection.operations).toEqual(['select-first', 'select-closest', 'unknown-order']);
    expect(selection.documentationStatus).toBe('partially-documented');
    expect(selection.lifecycleQualifiers).toEqual([]);
  });

  it('ships the context pipeline with its exact documented operations', () => {
    // `concatenate`, `filter`, `replace`: the fresh context is assembled from
    // the documented inputs, the built-in omissions and the depth limit take
    // some away, and `context: fork` replaces the fresh context with the
    // parent conversation.
    const composition = RUNTIME_COMPOSITION_STRATEGIES['claude.agent-context.composition'];
    expect(composition.tool).toBe('claude');
    expect(composition.operations).toEqual(['concatenate', 'filter', 'replace']);
    expect(composition.documentationStatus).toBe('documented');
    expect(composition.lifecycleQualifiers).toEqual([]);
  });

  it('composes each strategy from its documented inputs, by identity', () => {
    const selection = STRATEGY_RELATIONS['claude.agents.selection'].consumesBehaviors;
    expect(selection.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.agents',
      'claude.behavior.user.agents',
    ]);
    const composition = STRATEGY_RELATIONS['claude.agent-context.composition'].consumesBehaviors;
    expect(composition.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.agent-memory.local',
      'claude.behavior.repo.agent-memory.project',
      'claude.behavior.repo.agents',
      'claude.behavior.repo.instructions.ancestor',
      'claude.behavior.repo.instructions.descendant',
      'claude.behavior.repo.instructions.launch',
      'claude.behavior.repo.rules',
      'claude.behavior.repo.skills',
      'claude.behavior.user.agent-memory',
      'claude.behavior.user.agents',
      'claude.behavior.user.auto-memory',
    ]);
    for (const behavior of [...selection, ...composition]) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the subagent rule through both agent strategies, by identity', () => {
    const rule = RULE_RELATIONS['claude.repo.agent'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.agents',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.agent-context.composition',
      'claude.agents.selection',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `agent` kind and carries no projection of a selection.
    expect(INSPECTION_RULES['claude.repo.agent'].kind).toBe('agent');
    expect(INSPECTION_RULES['claude.repo.agent'].precedenceGroup).toBeNull();
  });

  it('keeps the memory scopes composition-only, with no rule of their own', () => {
    // The three memory behaviors exist so the context strategy can name what
    // it composes. None of them is `basedOnBehaviors` of any rule, which is
    // what keeps a running subagent's accumulated notes out of the read
    // allowlist entirely (contracts/vendors/claude-code.md § Repository vendor
    // behavior).
    const memoryBehaviors = [
      'claude.behavior.repo.agent-memory.local',
      'claude.behavior.repo.agent-memory.project',
      'claude.behavior.user.agent-memory',
      'claude.behavior.user.auto-memory',
    ];
    for (const [ruleId, edges] of Object.entries(RULE_RELATIONS)) {
      for (const behavior of edges.basedOnBehaviors) {
        expect(memoryBehaviors, `${ruleId} rests on ${behavior.behaviorId}`).not.toContain(
          behavior.behaviorId,
        );
      }
    }
  });

  it('states both contract rows reciprocally with the shipped records, in both languages', () => {
    for (const strategyId of ['claude.agents.selection', 'claude.agent-context.composition']) {
      const record = RUNTIME_COMPOSITION_STRATEGIES[strategyId as 'claude.agents.selection'];
      const consumed = STRATEGY_RELATIONS[
        strategyId as 'claude.agents.selection'
      ].consumesBehaviors.map((behavior) => behavior.behaviorId);
      const cited = record.evidence.map((citation) => citation.sourceId);
      expect(cited.length).toBeGreaterThan(0);
      for (const path of [
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
      ]) {
        const row = parseStrategyRow(path, strategyId);
        expect(row.operations, `${strategyId} ${path}`).toEqual(record.operations);
        expect(row.consumesBehaviors, `${strategyId} ${path}`).toEqual(consumed);
        expect(row.evidence, `${strategyId} ${path}`).toEqual(cited);
      }
    }
  });
});

describe('the Codex custom-agent composition strategy (T520)', () => {
  it('ships the inheritance pipeline with its exact documented operations', () => {
    // `select-first`, `merge-map`, `replace` is the complete documented
    // pipeline: a custom agent whose name matches a built-in one takes
    // precedence over it, the child file then overlays the parent session per
    // key, and a value the file declares replaces the one already resolved. No
    // `append`, because nothing is accumulated, and no `unknown-order`,
    // because the page makes no ordering claim between the personal and
    // project scopes for one to qualify (contracts/runtime-composition.md
    // § codex.agents.inheritance).
    const inheritance = RUNTIME_COMPOSITION_STRATEGIES['codex.agents.inheritance'];
    expect(inheritance.tool).toBe('codex');
    expect(inheritance.operations).toEqual(['select-first', 'merge-map', 'replace']);
    // The project traversal is unstated and child `AGENTS.md` inheritance is
    // established nowhere, which is what keeps the record short of
    // `documented` (contracts/runtime-composition.md § Canonical
    // evidence-assessment index).
    expect(inheritance.documentationStatus).toBe('partially-documented');
    expect(inheritance.lifecycleQualifiers).toEqual([]);
  });

  it('composes the strategy from both documented agent scopes, by identity', () => {
    // The User half is listed even though only the project files are
    // readable: a personal agent whose name matches takes precedence over a
    // built-in one, so omitting it would describe a selection over project
    // files alone.
    const consumed = STRATEGY_RELATIONS['codex.agents.inheritance'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.agents',
      'codex.behavior.user.agents',
    ]);
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('explains the agent rule through the inheritance strategy alone, by identity', () => {
    // The rule's own candidacy rests on the project agent lookup alone — the
    // personal `<CODEX_HOME>/agents/` scope is a Source boundary it may not
    // open — while the spawned-session overlay, the selection, and the live
    // sandbox and approval reapplication stay the strategy's (FR-009;
    // codex/relations.ts).
    const rule = RULE_RELATIONS['codex.repo.agent'];
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.agents',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.agents.inheritance',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `agent` kind and carries no projection of a selection.
    expect(INSPECTION_RULES['codex.repo.agent'].kind).toBe('agent');
    expect(INSPECTION_RULES['codex.repo.agent'].precedenceGroup).toBeNull();
  });

  it('adds no MCP edge in either direction, which is what keeps an agent no carrier', () => {
    // The inheritance the page documents — a spawned session taking its
    // parent's `mcp_servers` when the file omits them — is composition rather
    // than a lookup, so the strategy consumes no MCP behavior and the rule is
    // explained by no MCP strategy. Without those edges an agent file's own
    // `mcp_servers` table stays its declared content and joins no MCP row
    // (data-model.md § Inventory unit).
    const consumed = STRATEGY_RELATIONS['codex.agents.inheritance'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    expect(consumed.filter((behaviorId) => behaviorId.includes('.mcp'))).toEqual([]);
    const rule = RULE_RELATIONS['codex.repo.agent'];
    expect(
      rule.basedOnBehaviors.filter((behavior) => behavior.behaviorId.includes('.mcp')),
    ).toEqual([]);
    expect(
      rule.explainedByStrategies.filter((strategy) => strategy.strategyId.includes('.mcp')),
    ).toEqual([]);
    // And no MCP rule is explained by the inheritance strategy either, so the
    // two registries stay disjoint in both directions.
    for (const [ruleId, edges] of Object.entries(RULE_RELATIONS)) {
      if (INSPECTION_RULES[ruleId as keyof typeof INSPECTION_RULES].kind !== 'MCP') {
        continue;
      }
      expect(
        edges.explainedByStrategies.filter(
          (strategy) => strategy.strategyId === 'codex.agents.inheritance',
        ),
        ruleId,
      ).toEqual([]);
    }
  });

  it('states the contract row reciprocally with the shipped record, in both languages', () => {
    const record = RUNTIME_COMPOSITION_STRATEGIES['codex.agents.inheritance'];
    const consumed = STRATEGY_RELATIONS['codex.agents.inheritance'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    const cited = record.evidence.map((citation) => citation.sourceId);
    expect(cited.length).toBeGreaterThan(0);
    for (const path of [
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
      'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
    ]) {
      const row = parseStrategyRow(path, 'codex.agents.inheritance');
      expect(row.operations, path).toEqual(record.operations);
      expect(row.consumesBehaviors, path).toEqual(consumed);
      expect(row.evidence, path).toEqual(cited);
    }
  });
});

describe('the Copilot settings composition graph (T636)', () => {
  it('ships one precedence strategy per settings surface, with its documented operations', () => {
    const cli = RUNTIME_COMPOSITION_STRATEGIES['copilot.cli.settings.precedence'];
    expect(cli.tool).toBe('copilot');
    expect(cli.surfaces).toEqual(['copilot-cli']);
    // The merge behaviors the page's repository-settings table states per key:
    // replaced by the repository layer, merged by key, a union it can add
    // entries to and never remove from — a set union, which `append` with
    // `deduplicate` is and text `concatenate` is not — and the one key it may
    // only tighten, `respectGitignore`, which it may enable and never disable.
    expect(cli.operations).toEqual([
      'append',
      'replace',
      'merge-map',
      'deduplicate',
      'tighten-only',
    ]);
    const vscode = RUNTIME_COMPOSITION_STRATEGIES['copilot.vscode.settings.precedence'];
    expect(vscode.surfaces).toEqual(['copilot-vscode']);
    expect(vscode.operations).toEqual(['merge-map', 'replace']);
    // Each composes its own surface's Repository and User layers: the vendor's
    // order spans both, and omitting the User layer would describe a cascade
    // with a step missing.
    expect(
      STRATEGY_RELATIONS['copilot.cli.settings.precedence'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['copilot.behavior.cli.settings', 'copilot.behavior.cli.user.settings']);
    expect(
      STRATEGY_RELATIONS['copilot.vscode.settings.precedence'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['copilot.behavior.vscode.settings', 'copilot.behavior.vscode.user.settings']);
  });

  it('keeps the settings rule out of every MCP composition, permanently', () => {
    // A settings file is never an MCP owner: an MCP declaration's home is an
    // explicit carrier and nothing else (data-model.md § Inventory unit), so
    // the rule rests on no MCP behavior and no MCP strategy explains it.
    const settings = RULE_RELATIONS['copilot.repo.settings'];
    expect(settings.basedOnBehaviors.some((behavior) => behavior.behaviorId.includes('mcp'))).toBe(
      false,
    );
    expect(
      settings.explainedByStrategies.some((strategy) => strategy.strategyId.includes('mcp')),
    ).toBe(false);
    for (const strategyId of [
      'copilot.cli.mcp.selection',
      'copilot.vscode.mcp.selection',
    ] as const) {
      expect(
        STRATEGY_RELATIONS[strategyId].consumesBehaviors.some((behavior) =>
          behavior.behaviorId.includes('settings'),
        ),
        strategyId,
      ).toBe(false);
    }
  });

  it('keeps the Hook and Plugin families on the rules that own them', () => {
    // The settings documents can carry an inline hook block and a plugin map,
    // and both families now have their strategies — one per surface the vendor
    // documents. Neither belongs to the settings recognition: the hook
    // compositions are what the hook rules over those same files rest on, and
    // what a settings file names about plugins is registration and enablement,
    // which is runtime state this product never reads (FR-009). The settings
    // rule stays explained by the scope precedence alone (T894).
    const ids = Object.keys(RUNTIME_COMPOSITION_STRATEGIES);
    expect(ids.filter((id) => id.startsWith('copilot.') && id.includes('hooks'))).toEqual([
      'copilot.vscode.hooks.composition',
      'copilot.cli.hooks.composition',
      'copilot.cloud.hooks.composition',
    ]);
    expect(
      RULE_RELATIONS['copilot.repo.settings'].explainedByStrategies.map(
        (strategy) => strategy.strategyId,
      ),
    ).toEqual(['copilot.cli.settings.precedence']);
    expect(ids.filter((id) => id.startsWith('copilot.') && id.includes('plugins'))).toEqual([
      'copilot.vscode.plugins.activation',
      'copilot.cli.plugins.activation',
      'copilot.cloud.plugins.activation',
    ]);
    for (const strategyId of [
      'copilot.vscode.plugins.activation',
      'copilot.cli.plugins.activation',
      'copilot.cloud.plugins.activation',
    ] as const) {
      expect(
        STRATEGY_RELATIONS[strategyId].consumesBehaviors.some((behavior) =>
          behavior.behaviorId.includes('settings'),
        ),
        strategyId,
      ).toBe(false);
    }
  });
});

describe('the Claude settings composition graph (T615)', () => {
  it('reuses the shipped precedence strategy rather than adding one', () => {
    // The settings recognition is explained by the scope resolution already
    // shipped for the permission policy inside the same files: what a
    // `settings/config` row publishes is the document a settings scope is,
    // and how the scopes resolve against each other is
    // `claude.settings.precedence`'s. No strategy arrives with this phase,
    // because no composition it would describe is new
    // (contracts/runtime-composition.md § claude.settings.precedence).
    const precedence = RUNTIME_COMPOSITION_STRATEGIES['claude.settings.precedence'];
    expect(precedence.tool).toBe('claude');
    expect(precedence.operations).toEqual(['replace', 'merge-map', 'concatenate', 'deduplicate']);
    expect(precedence.documentationStatus).toBe('partially-documented');
  });

  it('explains the settings rule through the two project lookups, by identity', () => {
    // The same edges the permission rule carries, because both recognitions
    // come from one pair of documented locations: what differs between the
    // rows is the subject each names, which is not an edge (claude/relations.ts).
    const settings = RULE_RELATIONS['claude.repo.settings'];
    expect(settings.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.settings.local',
      'claude.behavior.repo.settings.shared',
    ]);
    expect(settings.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.settings.precedence',
    ]);
    for (const behavior of settings.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of settings.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });

  it('adds no MCP composition edge of any kind with the settings row', () => {
    // A settings file's inline `mcpServers` map is that file's own declared
    // content, so the rule that admits it rests on no MCP behavior and is
    // explained by no MCP strategy (data-model.md § Inventory unit).
    const settings = RULE_RELATIONS['claude.repo.settings'];
    expect(settings.basedOnBehaviors.some((behavior) => behavior.behaviorId.includes('mcp'))).toBe(
      false,
    );
    expect(
      settings.explainedByStrategies.some((strategy) => strategy.strategyId.includes('mcp')),
    ).toBe(false);
    // And the MCP selection strategy consumes no settings behavior back.
    expect(
      STRATEGY_RELATIONS['claude.mcp.selection'].consumesBehaviors.some((behavior) =>
        behavior.behaviorId.includes('settings'),
      ),
    ).toBe(false);
  });
});

describe('the Codex settings composition graph (T592)', () => {
  it('reuses the shipped precedence strategy rather than adding one', () => {
    // The settings recognition is explained by the layer resolution that was
    // already shipped for the carrier: a `settings/config` row publishes the
    // document a config layer is, and how layers resolve against each other
    // is `codex.config.precedence`'s. No strategy arrives with this phase,
    // because no composition it would describe is new
    // (contracts/runtime-composition.md § codex.config.precedence).
    const precedence = RUNTIME_COMPOSITION_STRATEGIES['codex.config.precedence'];
    expect(precedence.tool).toBe('codex');
    expect(precedence.operations).toEqual(['merge-map', 'replace', 'select-closest']);
    expect(precedence.documentationStatus).toBe('documented');
  });

  it('explains the settings rule through the precedence strategy alone, by identity', () => {
    // What the row publishes is the document the config-layer lookup locates,
    // so that lookup is its whole basis. The MCP and Hook statements the
    // carrier rule rests on are the other recognition's: a rule is based on
    // the behavior its own recognition reads out, and this one reads nothing
    // out at all (codex/relations.ts).
    const settings = RULE_RELATIONS['codex.repo.settings'];
    expect(settings.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
    ]);
    expect(settings.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
    ]);
    for (const behavior of settings.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of settings.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
  });

  it('leaves the hook composition to the hook rows (T850)', () => {
    // An inline `[hooks]` table is part of the document this row publishes,
    // and it is also its own recognition's subject: the hook composition is
    // that recognition's, never this row's, so the settings edges above name
    // no hook strategy while the one shipped hook strategy stands beside them.
    expect(
      Object.keys(RUNTIME_COMPOSITION_STRATEGIES).filter((id) => id.startsWith('codex.hooks')),
    ).toEqual(['codex.hooks.additive']);
    const additive = RUNTIME_COMPOSITION_STRATEGIES['codex.hooks.additive'];
    // Every active source contributes and every matching hook runs — a closer
    // layer adds rather than replaces (`append`), while which sources are
    // active at all is the documented filter (`filter`)
    // (contracts/runtime-composition.md § codex.hooks.additive).
    expect(additive.operations).toEqual(['filter', 'append']);
    expect(additive.tool).toBe('codex');
    expect(additive.documentationStatus).toBe('documented');
    // Every documented hook scope, because the strategy describes Codex's
    // runtime: the project layers this product can read, the User layer it may
    // not — which keeps contributing where an untrusted project layer does
    // not — and the plugin root whose manifest points at the hooks an enabled
    // plugin bundles, which the same page lists as a source of its own.
    expect(
      STRATEGY_RELATIONS['codex.hooks.additive'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual([
      'codex.behavior.plugin.manifest',
      'codex.behavior.repo.hooks',
      'codex.behavior.user.hooks',
    ]);
  });
});

describe('the Claude hook composition strategy (T871)', () => {
  it('composes every documented hook source and states no verdict', () => {
    const additive = RUNTIME_COMPOSITION_STRATEGIES['claude.hooks.additive'];
    expect(additive.tool).toBe('claude');
    // Every active source contributes and every applicable hook runs — a closer
    // settings level adds rather than replaces (`append`) — while which sources
    // are active is the documented filter (`filter`), and the one composition
    // over results is the restrictive one an explicit deny wins
    // (`select-first`) (contracts/runtime-composition.md
    // § claude.hooks.additive).
    expect(additive.operations).toEqual(['filter', 'append', 'select-first']);
    expect(additive.documentationStatus).toBe('documented');
    // Both scopes of every documented source, because the strategy describes
    // Claude's runtime: the contained-declaration statement that locates them,
    // the settings levels that merge, the skill and subagent lookups, and both
    // plugin scopes.
    expect(
      STRATEGY_RELATIONS['claude.hooks.additive'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual([
      'claude.behavior.repo.agents',
      'claude.behavior.repo.hooks-contained',
      'claude.behavior.repo.plugin',
      'claude.behavior.repo.settings.local',
      'claude.behavior.repo.settings.shared',
      'claude.behavior.repo.skills',
      'claude.behavior.user.plugins',
      'claude.behavior.user.settings',
    ]);
    // The one contained-hook rule is explained by it, and by nothing else: what
    // a row does not state — trust, a managed-hooks-only policy, how long a
    // registration lasts — is this strategy's (FR-009).
    const settingsHooks = RULE_RELATIONS['claude.repo.hooks.settings'];
    expect(settingsHooks.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.hooks.additive',
    ]);
    // It rests on the contained-declaration statement and on the two settings
    // lookups that located its owner.
    expect(settingsHooks.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.hooks-contained',
      'claude.behavior.repo.settings.local',
      'claude.behavior.repo.settings.shared',
    ]);
  });

  it('records the contained lookup with no standalone location of its own', () => {
    const contained = VENDOR_BEHAVIOR_STATEMENTS['claude.behavior.repo.hooks-contained'];
    expect(contained.tool).toBe('claude');
    expect(contained.documentationStatus).toBe('documented');
    // The base is the accepted artifact, and the traversal is none: the client
    // reads these declarations out of what it already loaded, so the statement
    // carries no walk of its own.
    expect(contained.locator?.lookupBase).toBe('active-config-layer');
    expect(contained.locator?.traversal).toBe('none');
    // No standalone project hook file is recorded anywhere in this vendor's
    // locator, which is what the rule table's absence of one means.
    expect(contained.locator?.relativeSelector).not.toContain('.claude/hooks.json');
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
    // sources; none is a local file, so nothing this strategy or its behavior
    // documents may reach the read allowlist. Stated as the two edges that
    // would carry it rather than as "no agent rule exists": the Codex
    // custom-agent rule ships with its own inventory wave and rests on a
    // located project directory, so a count of agent rules stopped being the
    // question this assertion is about.
    const consumed = STRATEGY_RELATIONS['copilot.cloud.mcp.selection'].consumesBehaviors.map(
      (behavior) => behavior.behaviorId,
    );
    expect(consumed).toEqual(['copilot.behavior.cloud.mcp']);
    expect(
      Object.entries(RULE_RELATIONS).filter(
        ([, edges]) =>
          edges.explainedByStrategies.some(
            (strategy) => strategy.strategyId === 'copilot.cloud.mcp.selection',
          ) ||
          edges.basedOnBehaviors.some(
            (behavior) => behavior.behaviorId === 'copilot.behavior.cloud.mcp',
          ),
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

describe('the Copilot custom-agent composition strategies (T559)', () => {
  it('ships one selection per surface with its exact documented operations', () => {
    // Three surfaces, three strategies, and deliberately not one: VS Code
    // filters by a profile's `target` and leaves cross-scope duplicates
    // unresolved, the CLI walks project layers closest-first with a documented
    // conflict about project versus User, and the Cloud agent selects
    // Repository before organization before enterprise and deduplicates by
    // the documented filename identity (contracts/runtime-composition.md).
    const cases = [
      {
        strategyId: 'copilot.vscode.agents.selection',
        surfaces: ['copilot-vscode'],
        operations: ['filter', 'select-first', 'unknown-order'],
        documentationStatus: 'partially-documented',
      },
      {
        strategyId: 'copilot.cli.agents.selection',
        surfaces: ['copilot-cli'],
        operations: ['select-closest', 'select-first', 'unknown-order'],
        documentationStatus: 'conflict',
      },
      {
        strategyId: 'copilot.cloud.agents.selection',
        surfaces: ['copilot-cloud'],
        operations: ['select-first', 'deduplicate'],
        documentationStatus: 'documented',
      },
    ] as const;
    for (const expected of cases) {
      const record = RUNTIME_COMPOSITION_STRATEGIES[expected.strategyId];
      expect(record.tool, expected.strategyId).toBe('copilot');
      expect(record.surfaces, expected.strategyId).toEqual(expected.surfaces);
      expect(record.operations, expected.strategyId).toEqual(expected.operations);
      expect(record.documentationStatus, expected.strategyId).toBe(expected.documentationStatus);
      expect(record.lifecycleQualifiers, expected.strategyId).toEqual([]);
    }
  });

  it('composes each selection from its own surface\u2019s two scopes, by identity', () => {
    const composed = {
      'copilot.vscode.agents.selection': [
        'copilot.behavior.vscode.agents',
        'copilot.behavior.vscode.user.agents',
      ],
      'copilot.cli.agents.selection': [
        'copilot.behavior.cli.agents',
        'copilot.behavior.cli.user.agents',
      ],
      'copilot.cloud.agents.selection': [
        'copilot.behavior.cloud.agents',
        'copilot.behavior.cloud.organization-agents',
      ],
    } as const;
    for (const [strategyId, expected] of Object.entries(composed)) {
      const consumed =
        STRATEGY_RELATIONS[strategyId as 'copilot.cli.agents.selection'].consumesBehaviors;
      expect(
        consumed.map((behavior) => behavior.behaviorId),
        strategyId,
      ).toEqual(expected);
      for (const behavior of consumed) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
    }
  });

  it('explains the profile rule through all three selections, by identity', () => {
    const rule = RULE_RELATIONS['copilot.repo.agent'];
    // The rule rests on the three repository-scoped behaviors alone: the User
    // and organization scopes the selections also consume describe files
    // outside every selected root, so no admitted file can be one.
    expect(rule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.agents',
      'copilot.behavior.cloud.agents',
      'copilot.behavior.vscode.agents',
    ]);
    expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.agents.selection',
      'copilot.cloud.agents.selection',
      'copilot.vscode.agents.selection',
    ]);
    for (const behavior of rule.basedOnBehaviors) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
    for (const strategy of rule.explainedByStrategies) {
      expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
    }
    // The admitting record is a read authorization and nothing more: it
    // recognizes the `agent` kind and carries no projection of a selection.
    expect(INSPECTION_RULES['copilot.repo.agent'].kind).toBe('agent');
    expect(INSPECTION_RULES['copilot.repo.agent'].precedenceGroup).toBeNull();
  });

  it('keeps the hosted organization scope composition-only, with no rule of its own', () => {
    // `copilot.behavior.cloud.organization-agents` exists so the Cloud
    // selection can name what it composes. It has no origin file anywhere —
    // an organization profile lives outside every inspected Source — so no
    // rule may rest on it (contracts/vendors/github-copilot.md).
    for (const [ruleId, edges] of Object.entries(RULE_RELATIONS)) {
      for (const behavior of edges.basedOnBehaviors) {
        expect(behavior.behaviorId, `${ruleId} rests on ${behavior.behaviorId}`).not.toBe(
          'copilot.behavior.cloud.organization-agents',
        );
      }
    }
  });

  it('states all three contract rows reciprocally with the shipped records, in both languages', () => {
    for (const strategyId of [
      'copilot.cli.agents.selection',
      'copilot.cloud.agents.selection',
      'copilot.vscode.agents.selection',
    ]) {
      const record = RUNTIME_COMPOSITION_STRATEGIES[strategyId as 'copilot.cli.agents.selection'];
      const consumed = STRATEGY_RELATIONS[
        strategyId as 'copilot.cli.agents.selection'
      ].consumesBehaviors.map((behavior) => behavior.behaviorId);
      const cited = record.evidence.map((citation) => citation.sourceId);
      expect(cited.length).toBeGreaterThan(0);
      for (const path of [
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.md',
        'specs/001-inspect-agent-customizations/contracts/runtime-composition.ja.md',
      ]) {
        const row = parseStrategyRow(path, strategyId);
        expect(row.operations, `${strategyId} ${path}`).toEqual(record.operations);
        expect(row.consumesBehaviors, `${strategyId} ${path}`).toEqual(consumed);
        expect(row.evidence, `${strategyId} ${path}`).toEqual(cited);
      }
    }
  });
});

describe('the Codex plugin activation strategy (T766)', () => {
  it('composes all three plugin scopes, by identity', () => {
    const strategy = RUNTIME_COMPOSITION_STRATEGIES['codex.plugins.activation'];
    expect(strategy.tool).toBe('codex');
    expect(strategy.surfaces).toEqual(['codex-local-clients']);
    // `filter` then `select-first`: a client keeps the entries the catalogs it
    // reads expose, then takes the manifest of the plugin root it established
    // (contracts/runtime-composition.md § codex.plugins.activation).
    expect(strategy.operations).toEqual(['filter', 'select-first']);
    const consumed = STRATEGY_RELATIONS['codex.plugins.activation'].consumesBehaviors;
    expect(consumed.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.plugin.manifest',
      'codex.behavior.repo.marketplace',
      'codex.behavior.user.plugins',
    ]);
    // The User scope is consumed though it is never read: the strategy
    // describes Codex's runtime, and a composition over the repository catalog
    // alone would describe a different product.
    for (const behavior of consumed) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
    }
  });

  it('bases each plugin rule on the behaviors it walks between, by identity', () => {
    const catalog = RULE_RELATIONS['codex.repo.marketplace'];
    expect(catalog.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.marketplace',
    ]);
    for (const rule of [catalog]) {
      expect(rule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
        'codex.plugins.activation',
      ]);
      for (const behavior of rule.basedOnBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
      for (const strategy of rule.explainedByStrategies) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
      }
    }
  });

  it('keeps the plugin-content exclusion citing what it does not authorize', () => {
    // An exclusion cites the behavior it declines to read: without the
    // citation the omission would be indistinguishable from the vendor not
    // documenting the content at all.
    const exclusion = RULE_RELATIONS['codex.excluded.plugin-files'];
    expect(exclusion.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.plugin.manifest',
      'codex.behavior.repo.marketplace',
      'codex.behavior.user.plugins',
    ]);
    expect(exclusion.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.plugins.activation',
    ]);
    expect(INSPECTION_RULES['codex.excluded.plugin-files'].matcher).toBeNull();
    expect(INSPECTION_RULES['codex.excluded.plugin-files'].kind).toBeNull();
  });
});

describe('the Copilot hook composition graph (T892)', () => {
  it('gives each surface its own composition, and each hook rule the ones it rests on', () => {
    // Three strategies rather than one, because the three surfaces compose
    // differently: the editor resolves an event's workspace and User hooks and
    // then adds the agent and plugin ones, the CLI appends every active
    // source's entries in the documented order, and the cloud sandbox has only
    // the repository files its clone holds.
    const vscode = RUNTIME_COMPOSITION_STRATEGIES['copilot.vscode.hooks.composition'];
    const cli = RUNTIME_COMPOSITION_STRATEGIES['copilot.cli.hooks.composition'];
    const cloud = RUNTIME_COMPOSITION_STRATEGIES['copilot.cloud.hooks.composition'];
    expect(vscode.operations).toEqual(['filter', 'select-first', 'append']);
    expect(cli.operations).toEqual(['filter', 'append']);
    expect(cloud.operations).toEqual(['filter', 'append']);
    expect([vscode.surfaces, cli.surfaces, cloud.surfaces]).toEqual([
      ['copilot-vscode'],
      ['copilot-cli'],
      ['copilot-cloud'],
    ]);
    // The standalone rule rests on all three lookups and is explained by all
    // three compositions: one location, three documented readers.
    const hookFiles = RULE_RELATIONS['copilot.repo.hooks'];
    expect(hookFiles.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.hooks',
      'copilot.behavior.cloud.hooks',
      'copilot.behavior.vscode.hooks',
    ]);
    expect(hookFiles.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'copilot.cli.hooks.composition',
      'copilot.cloud.hooks.composition',
      'copilot.vscode.hooks.composition',
    ]);
    // The CLI's own settings pair rests on the CLI lookup alone: the editor's
    // hook-locations table does not name it, so attaching that surface here
    // would claim a read no page documents.
    expect(
      RULE_RELATIONS['copilot.repo.hooks.settings'].basedOnBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['copilot.behavior.cli.hooks']);
    // The cross-tool pair rests on both lookups that name it.
    expect(
      RULE_RELATIONS['copilot.repo.hooks.settings.claude'].basedOnBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['copilot.behavior.cli.hooks', 'copilot.behavior.vscode.hooks']);
    // Every edge holds the published record rather than an equal-looking copy.
    for (const relations of [
      hookFiles,
      RULE_RELATIONS['copilot.repo.hooks.settings'],
      RULE_RELATIONS['copilot.repo.hooks.settings.claude'],
    ]) {
      for (const behavior of relations.basedOnBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId]).toBe(behavior);
      }
      for (const strategy of relations.explainedByStrategies) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId]).toBe(strategy);
      }
    }
  });

  it('states each contract row reciprocally with the shipped record, in both languages', () => {
    for (const strategyId of [
      'copilot.vscode.hooks.composition',
      'copilot.cli.hooks.composition',
      'copilot.cloud.hooks.composition',
    ] as const) {
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
        expect(row.operations, `${strategyId} in ${path}`).toEqual(record.operations);
        expect(row.consumesBehaviors, `${strategyId} in ${path}`).toEqual(consumed);
        expect(row.evidence, `${strategyId} in ${path}`).toEqual(cited);
      }
    }
  });

  it('keeps the User hook scopes statements no rule rests on', () => {
    // Both User scopes are consumed by their surface's composition and
    // authorize nothing: FR-015 through FR-018 admit only the two Copilot
    // Global instruction rules, and `copilot.excluded.user-runtime` is what
    // records that omission.
    for (const behaviorId of [
      'copilot.behavior.vscode.user.hooks',
      'copilot.behavior.cli.user.hooks',
    ] as const) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behaviorId].locator?.vendorScope).toBe('user');
      for (const relations of Object.values(RULE_RELATIONS)) {
        expect(
          relations.basedOnBehaviors.some((behavior) => behavior.behaviorId === behaviorId),
          behaviorId,
        ).toBe(false);
      }
    }
  });
});
