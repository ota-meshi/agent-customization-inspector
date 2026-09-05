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
import type { RuleId } from '../../src/shared/registries/identifier-types';
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
  it('ships the read-authorizing Claude records and its two exclusions', () => {
    // The phase-local half of the registry catalog check: the shipped Claude
    // catalog is the Repository set — command, instruction, marketplace, MCP
    // carrier, permission-policy, rule-file, settings, skill, and
    // skills-directory plugin rules, and the contained-hook rule over the
    // settings files' own matcher (T863) — the widened Global member set
    // (T970, T1138), all read-authorizing, plus the two `excluded` rows: the
    // one the plugin phases own and the User-runtime one the consent boundary
    // owns. No `relationship-only` Claude row ships — a symlinked
    // skill needs none because links are read through their targets (FR-024),
    // an unsupported instruction location is simply a path no selector reaches
    // (T232), and a standalone `.claude/prompts` directory is another one
    // (FR-034, T445) — and the complete catalog gate is the eighty-one-rule
    // case (T992), not this suite's.
    const claudeRules = rules.filter((rule) => rule.tool === 'claude');
    expect(claudeRules.map((rule) => rule.ruleId)).toEqual([
      'claude.repo.agent',
      'claude.repo.command',
      'claude.repo.hooks.settings',
      'claude.repo.instructions',
      'claude.repo.marketplace',
      'claude.repo.mcp',
      'claude.repo.output-style',
      'claude.repo.permissions',
      'claude.repo.rules',
      'claude.repo.settings',
      'claude.repo.skill',
      'claude.repo.skills-directory-plugin',
      'claude.excluded.plugin-files',
      'claude.excluded.user-runtime',
      'claude.global.agent',
      'claude.global.command',
      'claude.global.hooks.settings',
      'claude.global.instructions',
      'claude.global.output-style',
      'claude.global.permissions',
      'claude.global.rules',
      'claude.global.settings',
      'claude.global.skill',
    ]);
    for (const rule of claudeRules) {
      expect(rule.discoveryClass, rule.ruleId).toBe(
        rule.ruleId.startsWith('claude.excluded.') ? 'excluded' : 'static-candidate',
      );
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
  it('ships every read-authorizing Copilot candidate and exactly six exclusions', () => {
    // The phase-local half of the registry catalog check: the shipped Copilot
    // catalog is the skill rule, the CLI MCP carrier rule (T339), the two
    // VS Code MCP rules (T359), the seven instruction rules, the command and
    // prompt rules (T537), the two custom-agent rules (T551) — one per
    // documented agents directory, because the Cloud agent reads only
    // `.github/agents/` and a rule's surfaces come from the behaviors it
    // rests on — the settings rule (T628), the plugin catalog rule (T803),
    // and the three hook rules (T883, T895) — the root hook files every
    // surface reads, and one rule per settings pair, because the editor's
    // hook-locations table names the Claude-format pair and not the CLI's own
    // — all read-authorizing, plus the nine Global rules of the consented
    // member boundaries (FR-015, FR-045) and the catalog's six `excluded`
    // records. The eventual complete catalog gate is T913's, not this suite's.
    //
    // Naming the exclusions is what makes them reviewable: rejecting a
    // configured root, a general editor settings file, or a language-server
    // configuration is still the matchers' own doing — no selector reaches
    // those paths — so an exclusion record states that the omission was
    // decided, and a sixth one appearing here would be an exclusion nobody
    // reviewed.
    const byClass = (discoveryClass: string): string[] =>
      rules
        .filter((rule) => rule.tool === 'copilot' && rule.discoveryClass === discoveryClass)
        .map((rule) => rule.ruleId);
    expect(byClass('static-candidate')).toEqual([
      'copilot.global.agent',
      'copilot.global.agents-home.skill',
      'copilot.global.hooks',
      'copilot.global.hooks.inline',
      'copilot.global.instructions.path',
      'copilot.global.instructions.root',
      'copilot.global.mcp',
      'copilot.global.settings',
      'copilot.global.skill',
      'copilot.repo.agent',
      'copilot.repo.agent.claude',
      'copilot.repo.command',
      'copilot.repo.hooks',
      'copilot.repo.hooks.settings',
      'copilot.repo.hooks.settings.claude',
      'copilot.repo.instructions.agents',
      'copilot.repo.instructions.claude-root',
      'copilot.repo.instructions.gemini-root',
      'copilot.repo.instructions.path',
      'copilot.repo.instructions.path-cli-context',
      'copilot.repo.instructions.repository',
      'copilot.repo.instructions.repository-cli-context',
      'copilot.repo.marketplace',
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode',
      'copilot.repo.mcp.vscode-root',
      'copilot.repo.prompt',
      'copilot.repo.settings',
      'copilot.repo.skill',
    ]);
    expect(byClass('excluded')).toEqual([
      'copilot.excluded.additional-standard-locations',
      'copilot.excluded.cli-extensions',
      'copilot.excluded.cli-lsp',
      'copilot.excluded.extra-directories',
      'copilot.excluded.user-runtime',
      'copilot.excluded.vscode-settings',
    ]);
    expect(rules.filter((rule) => rule.tool === 'copilot')).toHaveLength(35);
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
    for (const [ruleId, edges] of Object.entries(RULE_RELATIONS)) {
      if (INSPECTION_RULES[ruleId as RuleId].discoveryClass === 'excluded') {
        // The shared managed-remote exclusion names this surface as scope it
        // declines — a non-read record that grants nothing — so the guard is
        // about the rules that could: no candidate may rest on it.
        continue;
      }
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

  it('ships exactly the seven read-authorizing skill rules', () => {
    expect(skillRules.map((rule) => rule.ruleId).sort()).toEqual([
      'claude.global.skill',
      'claude.repo.skill',
      'codex.global.agents-home.skill',
      'codex.repo.skill',
      'copilot.global.agents-home.skill',
      'copilot.global.skill',
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

  it('ships exactly the thirteen static instruction selectors of the three vendors', () => {
    // Nine Repository selectors plus the two Global selectors consent
    // authorizes. They are in this list rather than a Global one of their own
    // because the matrix is about the instruction kind: a selector's base is a
    // field of it, and the Global-scope assertions below are what separate the
    // two.
    expect(staticInstructionRules.map((rule) => rule.ruleId).sort()).toEqual([
      'claude.global.instructions',
      'claude.repo.instructions',
      'codex.global.instructions',
      'codex.repo.instructions',
      'copilot.global.instructions.path',
      'copilot.global.instructions.root',
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

  it('keeps every shipped exclusion non-authorizing', () => {
    // The shipped exclusions are the five Copilot ones (T251 owns the four
    // instruction/settings shapes), the two plugin-content records, and the two
    // User-runtime records consent is measured against; an exclusion authorizes
    // nothing: no matcher to admit by and no kind to recognize as.
    const exclusions = rules.filter((rule) => rule.discoveryClass === 'excluded');
    expect(exclusions.map((rule) => rule.ruleId).toSorted()).toEqual([
      'claude.excluded.plugin-files',
      'claude.excluded.user-runtime',
      'codex.excluded.plugin-files',
      'codex.excluded.user-runtime',
      'copilot.excluded.additional-standard-locations',
      'copilot.excluded.cli-extensions',
      'copilot.excluded.cli-lsp',
      'copilot.excluded.extra-directories',
      'copilot.excluded.user-runtime',
      'copilot.excluded.vscode-settings',
      'shared.excluded.managed-remote-state',
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
  it('registers the carrier under exactly its three Codex rules across the catalog', () => {
    // The file is admitted by the three rules whose recognitions it carries —
    // its `[mcp_servers.*]` tables, the `[hooks]` table it can also contain
    // (T839), and the settings document all of them sit in — and by nothing
    // else. Three rules over one path are one candidate and one read, because
    // the walk merges plans that match the same file; a fourth rule, or one of
    // another vendor, would be a recognition nobody decided on.
    const admitting = rules.filter(
      (rule) =>
        rule.matcher !== null &&
        rule.matcher.selectors.some((selector) => matches(selector, ['.codex', 'config.toml'])),
    );
    expect(admitting.map((rule) => rule.ruleId).toSorted()).toEqual([
      'codex.repo.config',
      'codex.repo.hooks.inline',
      'codex.repo.settings',
    ]);
    const config = INSPECTION_RULES['codex.repo.config'];
    expect(config.discoveryClass).toBe('static-candidate');
    // Admitted for the MCP inventory: the rows are the contained
    // `[mcp_servers.*]` declarations (data-model.md § Inventory unit).
    expect(config.kind).toBe('MCP');
    expect(config.sourceKinds).toEqual(['repository']);
    const settings = INSPECTION_RULES['codex.repo.settings'];
    expect(settings.discoveryClass).toBe('static-candidate');
    // Admitted for the settings inventory, whose row unit is the file itself.
    expect(settings.kind).toBe('settings/config');
    expect(settings.sourceKinds).toEqual(['repository']);
    const inlineHooks = INSPECTION_RULES['codex.repo.hooks.inline'];
    expect(inlineHooks.discoveryClass).toBe('static-candidate');
    // Admitted for the hook inventory, whose row unit is one declared event.
    expect(inlineHooks.kind).toBe('hook');
    expect(inlineHooks.sourceKinds).toEqual(['repository']);
    // Deliberately the same authored location written three times — each
    // record spells its matcher inline (AGENTS.md § Implementation simplicity
    // policy) — so value equality is the drift gate: it fails exactly when one
    // spelling changes without the others being decided too.
    expect(settings.matcher).toStrictEqual(config.matcher);
    expect(inlineHooks.matcher).toStrictEqual(config.matcher);
  });

  it('keeps the fallback derivation Phase 15’s and adds no other Codex row', () => {
    // The carrier's candidacy does not reshape the derivation: the seed is
    // still the configuration read, never the admission. The complete Codex
    // catalog is static candidates, the two derivations, and the one exclusion
    // that keeps the plugin content on record while admitting none of it — no
    // relationship-only row, and no plugin/User/managed promotion (every row
    // stays Repository-scoped, the plugin rows included: a catalog and a
    // manifest committed to the repository are Repository files, and the
    // installed copies under the User cache are not admitted at all). A later
    // inventory phase adds its own static candidate here; what this list holds
    // fixed is that nothing else arrives with it.
    const derived = INSPECTION_RULES['codex.derived.fallback-basename'];
    expect(derived.discoveryClass).toBe('bounded-derived-candidate');
    expect(derived.kind).toBe('instructions');
    expect(derived.matcher).toBeNull();
    const codexRules = rules.filter((rule) => rule.tool === 'codex');
    expect(codexRules.map((rule) => rule.ruleId)).toEqual([
      'codex.derived.fallback-basename',
      'codex.excluded.plugin-files',
      'codex.excluded.user-runtime',
      'codex.global.agent',
      'codex.global.agents-home.marketplace',
      'codex.global.agents-home.skill',
      'codex.global.config',
      'codex.global.hooks',
      'codex.global.hooks.inline',
      'codex.global.instructions',
      'codex.global.prompts',
      'codex.global.rules',
      'codex.global.settings',
      'codex.repo.agent',
      'codex.repo.config',
      'codex.repo.hooks',
      'codex.repo.hooks.inline',
      'codex.repo.instructions',
      'codex.repo.marketplace',
      'codex.repo.rules',
      'codex.repo.settings',
      'codex.repo.skill',
    ]);
    // Every Codex rule but the Global set reads at the Repository scope. The
    // set is named rather than skipped, so a Repository rule that quietly
    // acquired a Global scope still fails here.
    const codexGlobalRuleIds = new Set([
      'codex.excluded.user-runtime',
      'codex.global.agent',
      'codex.global.agents-home.marketplace',
      'codex.global.agents-home.skill',
      'codex.global.config',
      'codex.global.hooks',
      'codex.global.hooks.inline',
      'codex.global.instructions',
      'codex.global.prompts',
      'codex.global.rules',
      'codex.global.settings',
    ]);
    for (const rule of codexRules) {
      expect(rule.sourceKinds, rule.ruleId).toEqual(
        codexGlobalRuleIds.has(rule.ruleId) ? ['global'] : ['repository'],
      );
    }
  });

  it('cites only the two plugin behaviors the Claude exclusion is the scope of (T786)', () => {
    // The exclusion is a scope statement for what a manifest declares and what
    // a catalog entry reaches, so it cites those two behaviors and no more: the
    // installed copies under the User cache belong to `claude.excluded.user-runtime`,
    // which already owns that scope, and citing it here would make one omission
    // two records' claim.
    const relations = RULE_RELATIONS['claude.excluded.plugin-files'];
    expect(relations.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.marketplace',
      'claude.behavior.repo.plugin',
    ]);
    // Identity, not an equal-looking copy: the edge holds the published record.
    expect(relations.basedOnBehaviors[0]).toBe(
      VENDOR_BEHAVIOR_STATEMENTS['claude.behavior.repo.marketplace'],
    );
    expect(relations.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.plugins.activation',
    ]);
    // An exclusion authorizes nothing: no matcher to admit by, no kind to
    // recognize as, and a plugin component path is therefore never a candidate.
    const rule = INSPECTION_RULES['claude.excluded.plugin-files'];
    expect(rule.discoveryClass).toBe('excluded');
    expect(rule.matcher).toBeNull();
    expect(rule.kind).toBeNull();
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
      'codex.global.config',
      'codex.repo.config',
      'copilot.global.mcp',
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode',
      'copilot.repo.mcp.vscode-root',
    ]);
    // The matrix is about the Repository scope: a Global carrier's selector
    // is authored against its consented member boundary, so running it
    // against a Repository-relative path would test a base it never has.
    const repositoryMcpRules = mcpRules.filter((rule) => rule.sourceKinds.includes('repository'));
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
      expect(admittingTools(repositoryMcpRules, path), path).toEqual(expected);
    }
  });

  it('bases the carrier on its three behaviors and its inline hooks on two of them', () => {
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
    // The hook recognition of the same file is its own rule's, resting on the
    // two lookups it spans — the config layer that locates the file, and the
    // hook lookup that reads a `[hooks]` table out of it — and explained by
    // the additive composition that keeps it distinct from a standalone
    // `hooks.json` of the same layer (T839, T850).
    const inlineHooks = RULE_RELATIONS['codex.repo.hooks.inline'];
    expect(inlineHooks.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.config',
      'codex.behavior.repo.hooks',
    ]);
    expect(inlineHooks.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.config.precedence',
      'codex.hooks.additive',
    ]);
    // The standalone carrier rests on the hook lookup alone: the User layer's
    // own `hooks.json` is a different Source boundary this rule may not read.
    const standaloneHooks = RULE_RELATIONS['codex.repo.hooks'];
    expect(standaloneHooks.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.hooks',
    ]);
    expect(standaloneHooks.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.hooks.additive',
    ]);
    // Exactly the hook rules the shipped catalogs carry: a hook recognition
    // exists only where a rule produces one. Codex admits a file of its own and
    // the inline table of its config layer; Claude documents no standalone hook
    // file at all, and of the owners it does document only the settings files
    // publish hook rows — a skill's, a subagent's, a plugin manifest's, and a
    // catalog entry's declarations are part of what those customizations are,
    // and their own rows publish them (T839, T863). Copilot admits the root
    // hook files and both settings pairs, one rule each, because a rule's
    // surfaces are the behaviors it rests on and the editor's hook-locations
    // table names the Claude-format pair alone; a custom agent's frontmatter
    // hooks publish no row here for the reason a skill's do not (T883, T895).
    expect(rules.filter((rule) => rule.kind === 'hook').map((rule) => rule.ruleId)).toEqual([
      'copilot.global.hooks',
      'copilot.global.hooks.inline',
      'copilot.repo.hooks',
      'copilot.repo.hooks.settings',
      'copilot.repo.hooks.settings.claude',
      'claude.repo.hooks.settings',
      'claude.global.hooks.settings',
      'codex.global.hooks',
      'codex.global.hooks.inline',
      'codex.repo.hooks',
      'codex.repo.hooks.inline',
    ]);
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

describe('the registry this release owns (T913)', () => {
  it('ships eighty-one rules: forty-nine Repository and thirty-two Global (T992)', () => {
    // The phase gate: not a per-family list — each family's own case above
    // owns that — but the total this release is allowed to read by, split by
    // the scope each rule reads at. A rule added without a phase that owns it
    // fails here, which is the point of freezing the numbers rather than
    // deriving them.
    expect(rules).toHaveLength(81);
    const repository = rules.filter((rule) => rule.sourceKinds.includes('repository'));
    const global = rules.filter((rule) => rule.sourceKinds.includes('global'));
    expect(repository).toHaveLength(49);
    expect(repository.filter((rule) => rule.discoveryClass === 'static-candidate')).toHaveLength(
      41,
    );
    expect(
      repository.filter((rule) => rule.discoveryClass === 'bounded-derived-candidate'),
    ).toHaveLength(1);
    expect(repository.filter((rule) => rule.discoveryClass === 'excluded')).toHaveLength(7);
    // The complete Global scope (T992): twenty-eight static read-authorizing
    // rules across the four members, the three vendor exclusions, and the
    // shared managed-remote-state record. Naming the set is what keeps a new
    // rule from arriving without the phase that owns it.
    expect(global.filter((rule) => rule.discoveryClass === 'static-candidate')).toHaveLength(28);
    expect(global.map((rule) => rule.ruleId).toSorted()).toEqual([
      'claude.excluded.user-runtime',
      'claude.global.agent',
      'claude.global.command',
      'claude.global.hooks.settings',
      'claude.global.instructions',
      'claude.global.output-style',
      'claude.global.permissions',
      'claude.global.rules',
      'claude.global.settings',
      'claude.global.skill',
      'codex.excluded.user-runtime',
      'codex.global.agent',
      'codex.global.agents-home.marketplace',
      'codex.global.agents-home.skill',
      'codex.global.config',
      'codex.global.hooks',
      'codex.global.hooks.inline',
      'codex.global.instructions',
      'codex.global.prompts',
      'codex.global.rules',
      'codex.global.settings',
      'copilot.excluded.user-runtime',
      'copilot.global.agent',
      'copilot.global.agents-home.skill',
      'copilot.global.hooks',
      'copilot.global.hooks.inline',
      'copilot.global.instructions.path',
      'copilot.global.instructions.root',
      'copilot.global.mcp',
      'copilot.global.settings',
      'copilot.global.skill',
      'shared.excluded.managed-remote-state',
    ]);
    // No rule reads at both scopes. A Global selector is authored against a
    // consented vendor home and a Repository one against the selected root, so
    // a rule claiming both would be one record for two boundaries.
    for (const rule of rules) {
      expect(rule.sourceKinds.length, rule.ruleId).toBe(1);
    }
  });

  it('gives the merged root `.mcp.json` one recognition per product and two Copilot provenances', () => {
    // One physical file, one read, one recognition per product (FR-004) — and
    // on the Copilot side two rules admit it, because the CLI's own lookup and
    // the editor host's workspace-root discovery are separate documented
    // behaviors over one path. Two provenances on one recognition is what that
    // means; a second candidate for the same path would be a second read.
    const admitting = rules.filter(
      (rule) => rule.matcher !== null && admittingTools([rule], '.mcp.json').length > 0,
    );
    expect(admitting.map((rule) => rule.ruleId).toSorted()).toEqual([
      'claude.repo.mcp',
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode-root',
    ]);
    // The two Copilot rules rest on different behaviors — that difference is
    // the provenance, and a shared behavior list would make them one record
    // written twice.
    const cli = RULE_RELATIONS['copilot.repo.mcp'].basedOnBehaviors.map((b) => b.behaviorId);
    const editor = RULE_RELATIONS['copilot.repo.mcp.vscode-root'].basedOnBehaviors.map(
      (b) => b.behaviorId,
    );
    expect(cli).not.toEqual(editor);
    for (const behaviorId of [...cli, ...editor]) {
      expect(VENDOR_BEHAVIOR_STATEMENTS[behaviorId]).toBeDefined();
    }
  });

  it('adds no rule for a contained MCP declaration and one for each contained hook location', () => {
    // A contained MCP declaration is the carrying file's own content: the MCP
    // kind ships exactly the seven explicit carriers, so a settings document,
    // an agent file, or a plugin manifest that spells MCP configuration adds
    // no rule and no candidate (data-model.md § Inventory unit).
    const mcpMatchers = rules.filter((rule) => rule.kind === 'MCP' && rule.matcher !== null);
    expect(mcpMatchers).toHaveLength(7);
    for (const path of [
      '.claude/settings.json',
      '.github/copilot/settings.json',
      '.claude/agents/reviewer.md',
      '.claude-plugin/plugin.json',
    ]) {
      expect(admittingTools(mcpMatchers, path), path).toEqual([]);
    }

    // A contained hook declaration is the opposite case, and for the reason
    // the amendment states: a recognition is what a rule produces, so a
    // product reading hooks out of a document it also reads for other content
    // needs its own rule over that document. Those rules therefore share
    // their paths with another kind's rule — one file, one read, two
    // recognitions — which is what distinguishes them from a standalone hook
    // file's rule.
    const hookRules = rules.filter((rule) => rule.kind === 'hook' && rule.matcher !== null);
    const containedHookPaths = [
      '.claude/settings.json',
      '.claude/settings.local.json',
      '.github/copilot/settings.json',
      '.github/copilot/settings.local.json',
      '.codex/config.toml',
    ];
    // The rules of every other kind, which is where the owner each contained
    // hook rule shares its one read with must appear.
    const otherKindRules = rules.filter(
      (rule) => rule.kind !== null && rule.kind !== 'hook' && rule.matcher !== null,
    );
    for (const path of containedHookPaths) {
      expect(admittingTools(hookRules, path), path).not.toEqual([]);
      expect(admittingTools(otherKindRules, path), path).not.toEqual([]);
    }
  });

  it('creates no candidate without a selector to create it from', () => {
    // No synthetic file: a candidate exists because a matcher selected a path
    // the walk found, or because a configuration read named one. Nothing else
    // may produce a candidate, so a static rule without a matcher — a rule
    // that would admit by name alone — is what this rejects.
    for (const rule of rules) {
      if (rule.discoveryClass === 'static-candidate') {
        expect(rule.matcher, rule.ruleId).not.toBeNull();
      } else {
        expect(rule.matcher, rule.ruleId).toBeNull();
      }
    }
  });
});

describe('the Repository subgraph as one graph (T920)', () => {
  it('resolves every rule edge to the shipped record it names, by identity', () => {
    // The graph holds records rather than identifiers, so an edge that
    // resolved to an equal-looking copy would still be a second record: the
    // registry's acyclicity is what makes holding the reference possible at
    // all, and identity is what proves it was held.
    for (const rule of rules) {
      const relations = RULE_RELATIONS[rule.ruleId];
      expect(relations, rule.ruleId).toBeDefined();
      for (const behavior of relations.basedOnBehaviors) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId], rule.ruleId).toBe(behavior);
      }
      for (const strategy of relations.explainedByStrategies) {
        expect(RUNTIME_COMPOSITION_STRATEGIES[strategy.strategyId], rule.ruleId).toBe(strategy);
      }
    }
  });

  it('leaves no behavior nothing reaches, and no strategy composing nothing', () => {
    // A behavior no rule rests on and no strategy composes is maintenance data
    // with no consumer: either the rule that was to rest on it never shipped,
    // or the record outlived it. Both are findings.
    //
    // A strategy, by contrast, may legitimately be named by no rule — a User
    // or Cloud scope this release admits nothing from is still composed, and
    // its statement is what says the Inspector deliberately reads none of
    // it — so what is asserted of a strategy is that it composes something.
    const reachedBehaviors = new Set<string>();
    for (const rule of rules) {
      for (const behavior of RULE_RELATIONS[rule.ruleId].basedOnBehaviors) {
        reachedBehaviors.add(behavior.behaviorId);
      }
    }
    for (const strategy of Object.values(RUNTIME_COMPOSITION_STRATEGIES)) {
      const consumed = STRATEGY_RELATIONS[strategy.strategyId].consumesBehaviors;
      expect(consumed.length, strategy.strategyId).toBeGreaterThan(0);
      for (const behavior of consumed) {
        expect(VENDOR_BEHAVIOR_STATEMENTS[behavior.behaviorId], strategy.strategyId).toBe(behavior);
        reachedBehaviors.add(behavior.behaviorId);
      }
    }
    // Every behavior is reached: the three vendor User exclusions and the
    // shared managed-remote record now name every surface no Global rule
    // admits, so a behavior nothing reaches would be a record with no owner —
    // a finding rather than a silent addition.
    expect(
      Object.keys(VENDOR_BEHAVIOR_STATEMENTS)
        .filter((id) => !reachedBehaviors.has(id))
        .toSorted(),
    ).toEqual([]);
  });

  it('ships no relationship-only rule, so no recognition emits an edge', () => {
    // A relationship may be emitted only when a relationship-only rule covers
    // its origin (contracts/runtime-composition.md § Normative
    // relationship-only registry). This release ships none, so no recognition
    // can produce an edge and no presentation-allowlist row is consumed by
    // one: the allowlist permits kinds, and permission is not emission.
    expect(rules.filter((rule) => rule.discoveryClass === 'relationship-only')).toEqual([]);
    // Every shipped rule is a read decision — a candidate class or an
    // exclusion — which is what leaves the allowlist unconsumed.
    expect([...new Set(rules.map((rule) => rule.discoveryClass))].toSorted()).toEqual([
      'bounded-derived-candidate',
      'excluded',
      'static-candidate',
    ]);
  });

  it('names a documented source for every claim it records', () => {
    // Maintenance data only: a rule's evidence cites the page that
    // establishes it, and a citation with no source, no URL, or no reviewed
    // date is a claim with nothing behind it. What each page establishes is
    // `vendor-behaviors.test.ts`'s to check against the official-sources
    // rows; what this asserts is that the rule side carries one at all.
    for (const rule of rules) {
      if (rule.discoveryClass === 'excluded') {
        // An exclusion records the behavior it deliberately does not
        // authorize, and its basis is that behavior's own citation.
        continue;
      }
      expect(rule.evidence.length, rule.ruleId).toBeGreaterThan(0);
      for (const citation of rule.evidence) {
        expect(citation.sourceId.length, rule.ruleId).toBeGreaterThan(0);
        expect(citation.url.startsWith('https://'), `${rule.ruleId} ${citation.url}`).toBe(true);
        expect(citation.reviewedOn, rule.ruleId).toMatch(/^\d{4}-\d{2}-\d{2}$/u);
        expect(citation.establishes.length, rule.ruleId).toBeGreaterThan(0);
      }
    }
  });
});
