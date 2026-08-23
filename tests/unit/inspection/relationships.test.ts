// T141/T217/T238/T292: the shipped relationship policy for the Claude skill
// detail, the two instruction detail milestones, and the Codex MCP carrier (data-model.md § Relationship,
// FR-028, FR-029).
//
// A relationship may be emitted only when its kind is listed by the owning
// presentation-allowlist row *and* its origin is covered by a relationship-only
// rule in the central registry (contracts/runtime-composition.md § Normative
// relationship-only registry). No relationship-only record ships yet — each is
// based on behavior statements that arrive with their own inventory phases —
// so no shipped recognition can produce an edge: there is no authored
// `targetOrigin`, no exact authored target, no null-authored documented
// default, no semantic normalization against a provenance-relative base, and
// no boundary status, because there is no edge to carry them. What this suite
// proves is the half of the model that is observable now: zero relationship
// read authority, rejection of any expansion before target access, and the
// FR-028/FR-029 failure doctrine — a file-confined extraction failure stays
// that recognition's `failed` state, while a thrown or rejected
// provenance-side operation propagates unchanged through the domain with no
// cause classification, retry, recovered output, Diagnostic, or generation.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import * as fsIo from '../../../src/server/inspection/fs-io';
import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import {
  CODEX_RULE_RELATIONS,
  CODEX_STRATEGY_RELATIONS,
} from '../../../src/shared/registries/codex/relations';
import {
  CLAUDE_RULE_RELATIONS,
  CLAUDE_STRATEGY_RELATIONS,
} from '../../../src/shared/registries/claude/relations';
import {
  COPILOT_RULE_RELATIONS,
  COPILOT_STRATEGY_RELATIONS,
} from '../../../src/shared/registries/copilot/relations';
import { assembleScanPublication } from '../../../src/server/inspection/scan';

// Pass-through spies over the closed fs surface, so a case can prove which
// paths recognition actually touched.
vi.mock('../../../src/server/inspection/fs-io', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/server/inspection/fs-io')>();
  return Object.fromEntries(
    Object.entries(actual).map(([name, value]) => [
      name,
      typeof value === 'function' ? vi.fn(value as (...args: never[]) => unknown) : value,
    ]),
  );
});

const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;

const claudeAgentRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.agent',
)!;
const copilotAgentRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.agent',
)!;
const codexInstructionRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.instructions',
);

const claudeInstructionRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.instructions',
)!;

let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-relationships-'));
  mkdirSync(join(root, '.claude/skills/refs'), { recursive: true });
  // A real file a reference-looking value points at, outside the skill's own
  // directory: the one thing every case below must prove is that no shipped
  // path ever opens it.
  mkdirSync(join(root, 'docs'), { recursive: true });
  writeFileSync(join(root, 'docs/target.md'), 'never read\n', 'utf8');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

afterEach(() => {
  vi.clearAllMocks();
});

/** Recognizes one authored Claude `SKILL.md` at the given admitted path. */
async function recognizeClaude(matchedPath: string, sourceText: string) {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: claudeSkillRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['claude'],
  );
  return recognitions;
}

describe('relationship read authority', () => {
  it('ships no rule class that could cover a relationship origin', () => {
    // The two-gate rule: an edge needs a relationship-only rule covering its
    // origin, and the shipped registry holds none. What it does hold beside
    // the read-authorizing candidate classes — static, plus the one closed
    // bounded derivation (T1089) — is `excluded` records, which are the
    // opposite of an edge: they say a documented location is outside this
    // release and authorize nothing at all (T251). With no covering
    // relationship-only rule there is no edge — and no edge means no authored
    // target, documented default, normalization, or boundary status to
    // fabricate.
    for (const rule of Object.values(INSPECTION_RULES)) {
      expect(['static-candidate', 'bounded-derived-candidate', 'excluded']).toContain(
        rule.discoveryClass,
      );
      expect(rule.discoveryClass, rule.ruleId).not.toBe('relationship-only');
    }
  });

  it('opens no target while recognizing reference-looking values', async () => {
    // Direct-only, proven at the strongest point: recognition of a skill whose
    // authored values point elsewhere performs the census enumeration and not
    // one file read — the target is never accessed, so nothing nested or
    // transitive can even begin (FR-020, data-model.md § Relationship).
    const recognitions = await recognizeClaude(
      '.claude/skills/refs/SKILL.md',
      '---\nname: refs\nagent: reviewer\npaths:\n  - ../../docs/target.md\n---\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    // The census stayed inside the candidate's own directory: every
    // enumeration was of the skill directory or below it.
    for (const call of vi.mocked(fsIo.readdir).mock.calls) {
      expect(String(call[0])).toContain(join('.claude', 'skills', 'refs'));
    }
  });

  it('publishes no relationship vocabulary on the recognition', async () => {
    const recognitions = await recognizeClaude(
      '.claude/skills/refs/SKILL.md',
      '---\nname: refs\ncontext: fork\npaths:\n  - ../../docs/target.md\n---\n',
    );
    const serialized = JSON.stringify(recognitions);
    // No edge fields: the reference-looking authored values are listed as the
    // declarations they are and nothing more (data-model.md § Relationship: an
    // unlisted or uncovered reference "cannot be promoted to a generic,
    // inferred, or fallback relationship").
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });
});

/** Recognizes the authored Codex MCP carrier at its one admitted path. */
async function recognizeCodexCarrier(sourceText: string) {
  const codexConfigRule = CODEX_REPOSITORY_RULES.find(
    (compiled) => compiled.rule.ruleId === 'codex.repo.config',
  )!;
  const matchedPath = '.codex/config.toml';
  mkdirSync(join(root, '.codex'), { recursive: true });
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: codexConfigRule, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['codex'],
  );
  return recognitions;
}

describe('Codex MCP declarations emit no relationship and promote no target (T292)', () => {
  // Every reference shape the eventual MCP schema will care about — a named
  // parent server, an inline command with arguments, an ancestor path, a
  // plugin path, a runtime-only environment reference — authored into one
  // carrier. The declarations publish as the values they are; no edge, no
  // read, no promotion.
  const CARRIER_TEXT = [
    '[mcp_servers.named]',
    'command = "npx"',
    'args = ["-y", "some-package"]',
    '',
    '[mcp_servers.named.env]',
    'ENDPOINT = "${RUNTIME_ONLY_REFERENCE}"',
    '',
    '[mcp_servers.pathy]',
    'command = "../../docs/target.md"',
    'plugin = "./.codex-plugin/plugin.json"',
    'agents = ["reviewer"]',
    '',
  ].join('\n');

  it('opens no declared target while recognizing the carrier', async () => {
    // The declared command names a real file outside the carrier; a plugin
    // path and an agent reference sit beside it. Recognition reads nothing:
    // the engine parses the text it was handed, runs no census for the MCP
    // kind, and never resolves a declared path to anything (FR-020).
    const recognitions = await recognizeCodexCarrier(CARRIER_TEXT);
    expect(recognitions).toHaveLength(1);
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes the references as declarations and no relationship vocabulary', async () => {
    const recognitions = await recognizeCodexCarrier(CARRIER_TEXT);
    const serialized = JSON.stringify(recognitions);
    // The values are there, exactly as authored...
    expect(serialized).toContain('../../docs/target.md');
    expect(serialized).toContain('${RUNTIME_ONLY_REFERENCE}');
    // ...and no edge fields are: an unlisted or uncovered reference cannot be
    // promoted to a generic, inferred, or fallback relationship
    // (data-model.md § Relationship).
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('keeps agent inheritance and MCP configuration disjoint in both directions', () => {
    // Codex agents ship, so the question is no longer whether an agent
    // identifier exists — it is whether either registry reaches the other.
    // Neither does: the MCP strategy composes the declaration behavior and the
    // User host configuration, and the agent-inheritance strategy composes the
    // two agent scopes. What a spawned session inherits from its parent's
    // servers is documented composition inside the agent strategy, never a
    // behavior the MCP strategy consumes.
    expect(
      CODEX_STRATEGY_RELATIONS['codex.mcp.configuration'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['codex.behavior.repo.mcp', 'codex.behavior.user.config']);
    expect(
      CODEX_STRATEGY_RELATIONS['codex.agents.inheritance'].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      ),
    ).toEqual(['codex.behavior.repo.agents', 'codex.behavior.user.agents']);
    // And the rule that admits an agent file rests on no MCP behavior and is
    // explained by no MCP strategy, which is what keeps a declared
    // `mcp_servers` block the agent file's own content rather than a second
    // carrier (data-model.md § Inventory unit).
    const agentRule = CODEX_RULE_RELATIONS['codex.repo.agent'];
    expect(agentRule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'codex.behavior.repo.agents',
    ]);
    expect(agentRule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'codex.agents.inheritance',
    ]);
  });
});

/** Recognizes one authored Codex instruction file at the given admitted path. */
async function recognizeCodexInstruction(matchedPath: string, sourceText: string) {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: codexInstructionRule!, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['codex'],
  );
  return recognitions;
}

describe('Codex instruction files emit no relationship at all (T217)', () => {
  // No official Codex page this repository cites establishes an import or
  // reference syntax for `AGENTS.md` — the AGENTS.md page documents discovery
  // and fallback filenames only — so a Codex instruction file yields no
  // `runtime-reference`: the presentation allowlist's row permits the kind,
  // it does not require an extractor to invent occurrences.

  it('keeps reference-looking source as source text and accesses no target', async () => {
    // An `@path`-looking token, a Markdown link, and a bare path — each a
    // spelling an import syntax elsewhere might read — stay authored text,
    // and the real file they all point at is never opened. Recognition of an
    // instruction file performs no filesystem operation at all: no read, and
    // no census either, because the kind is not directory-shaped.
    const recognitions = await recognizeCodexInstruction(
      'AGENTS.md',
      '---\nscope: repo\n---\n\nSee @docs/target.md and [the guide](docs/target.md).\ndocs/target.md\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.details.kind).toBe('instructions');
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes no relationship vocabulary on the instruction recognition', async () => {
    const recognitions = await recognizeCodexInstruction(
      'AGENTS.md',
      'Read @docs/target.md before anything.\n',
    );
    const serialized = JSON.stringify(recognitions);
    // No edge fields (data-model.md § Relationship: an unlisted or uncovered
    // reference "cannot be promoted to a generic, inferred, or fallback
    // relationship").
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('resolves an environment reference nowhere', async () => {
    // The authored `${...}` spelling is published exactly as written, and no
    // process environment is consulted: a resolved value would be runtime
    // state this product never observes, and substituting it would rewrite
    // the reader's own file (FR-025).
    process.env['ACI_T217_REFERENCE'] = 'resolved-from-environment';
    try {
      const recognitions = await recognizeCodexInstruction(
        'AGENTS.md',

        '---\nendpoint: ${ACI_T217_REFERENCE}\n---\n\nUse ${ACI_T217_REFERENCE} here.\n',
      );
      const serialized = JSON.stringify(recognitions);
      expect(serialized).toContain('${ACI_T217_REFERENCE}');
      expect(serialized).not.toContain('resolved-from-environment');
    } finally {
      delete process.env['ACI_T217_REFERENCE'];
    }
  });

  it('confines an unparseable instruction frontmatter to the one recognition', async () => {
    // The same all-or-nothing rule the skill kind follows (FR-028): nothing
    // parsed is published — no declarations, no body — while the candidate
    // stays admitted and its complete source stays displayed.
    const recognitions = await recognizeCodexInstruction(
      'AGENTS.md',
      '---\nscope: [unterminated\n---\n\n# Body\n',
    );
    expect(recognitions[0]!.parseStatus).toBe('failed');
    expect(recognitions[0]!.details).toEqual({
      kind: 'instructions',
      frontmatter: [],
      bodyText: '',
      applicabilityRange: '**',
    });
    expect(recognitions[0]!.diagnosticIds).toEqual([]);
  });
});

/** Recognizes one authored Claude instruction file at the given admitted path. */
async function recognizeClaudeInstruction(matchedPath: string, sourceText: string) {
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled: claudeInstructionRule, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['claude'],
  );
  return recognitions;
}

describe('Claude instruction files emit no relationship either (T238)', () => {
  // Deliberately not the Codex case restated. Claude Code *does* document an
  // import syntax — `@path/to/import`, skipping Markdown code spans and fenced
  // blocks — so the reason no edge is emitted is a standing product decision
  // rather than an absent vendor statement: this product does not read
  // references out of prose. No page fixes where such a token ends, so every
  // boundary rule would be this product's own invention and a wrong one
  // asserts a reference the reader never wrote. That decision is not "not
  // yet": no relationship-only rule covers an instruction origin, and the
  // presentation allowlist merely permits a kind, which never requires an
  // extractor to find occurrences (T217). This suite is what keeps a reader of
  // the vendor page from "fixing" it back into existence.

  it('keeps an authored @path token as source text and accesses no target', async () => {
    const recognitions = await recognizeClaudeInstruction(
      'CLAUDE.md',
      '# Project instructions\n\nSee @docs/target.md and [the guide](docs/target.md).\ndocs/target.md\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.details.kind).toBe('instructions');
    // The token reaches the reader through the complete source and the body
    // the frontmatter block was removed from, which is where they wrote it.
    expect(recognitions[0]!.details).toMatchObject({
      bodyText: expect.stringContaining('@docs/target.md') as unknown as string,
    });
    // The file the token names exists on disk, and nothing opened it: an
    // instruction recognition performs no filesystem operation at all — no
    // read, and no census, because the kind is not directory-shaped.
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes no relationship vocabulary on the instruction recognition', async () => {
    const recognitions = await recognizeClaudeInstruction(
      'packages/api/CLAUDE.md',
      'Read @../../docs/target.md and @/etc/hosts and @~/notes.md before anything.\n',
    );
    const serialized = JSON.stringify(recognitions);
    // Not one edge field, and in particular no boundary verdict: the two
    // targets that leave this Source are as unclassified as the one that does
    // not (data-model.md § Relationship — an unlisted or uncovered reference
    // "cannot be promoted to a generic, inferred, or fallback relationship").
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('resolves an environment reference in a reference-looking token nowhere', async () => {
    // Same rule as everywhere else: the authored spelling is published as
    // written and no process environment is consulted (FR-026).
    process.env['ACI_T238_REFERENCE'] = 'resolved-from-environment';
    try {
      const recognitions = await recognizeClaudeInstruction(
        'CLAUDE.md',
        'Import @${ACI_T238_REFERENCE}/notes.md here.\n',
      );
      const serialized = JSON.stringify(recognitions);
      expect(serialized).toContain('${ACI_T238_REFERENCE}');
      expect(serialized).not.toContain('resolved-from-environment');
    } finally {
      delete process.env['ACI_T238_REFERENCE'];
    }
  });
});

describe('failure propagation through the recognition domain (FR-028/FR-029)', () => {
  it('confines an extraction failure to the one recognition', async () => {
    // The file-confined half of the doctrine: an unparseable document fails
    // that recognition all-or-nothing — no declared name, no invented edge —
    // while the candidate stays admitted and readable.
    const recognitions = await recognizeClaude(
      '.claude/skills/refs/SKILL.md',
      '---\nname: [unterminated\n---\n',
    );
    expect(recognitions[0]!.parseStatus).toBe('failed');
    expect(
      recognitions[0]!.details.kind === 'skill' && 'declaredName' in recognitions[0]!.details,
    ).toBe(false);
    expect(recognitions[0]!.diagnosticIds).toEqual([]);
  });

  it('propagates a provenance-side throw unchanged, with no recovered output', async () => {
    // The census enumeration is the provenance-scoped operation the recognizer
    // owns. Its failure is not confined to the file's own content, so the
    // domain must not catch, classify, or convert it: the promise rejects with
    // the real error and yields no recognition, Diagnostic, or partial result
    // (FR-029; data-model.md § ToolRecognition).
    await expect(
      recognizeClaude('.claude/skills/vanished/SKILL.md', '---\nname: gone\n---\n'),
    ).rejects.toThrow(/ENOENT/u);
  });

  it('aborts the whole publication when recognition rejects, committing nothing', async () => {
    // One layer up: the scan's publication assembly performs no domain catch
    // either. A recognizer rejection crosses it unchanged — no item, no
    // Diagnostic, no partial generation — leaving lifecycle handling to the
    // trigger-owning outer boundary (spec.md § Closed Scan Publication
    // Outcomes; FR-030 retains the prior committed snapshot).
    const failure = new Error('recognizer exploded');
    await expect(
      assembleScanPublication({
        sourceId: 'source-1',
        root,
        rootFailureOwner: 'repository',
        rules: [claudeSkillRule!],
        result: {
          kind: 'scanned',
          files: [
            {
              rawSegments: ['.claude', 'skills', 'refs', 'SKILL.md'],
              publicPath: '.claude/skills/refs/SKILL.md',
              admissions: [{ planIndex: 0, selectorIndex: 0 }],
              outcome: {
                kind: 'readable',
                encoding: 'utf-8',
                hadLeadingBom: false,
                sourceText: '---\nname: refs\n---\n',
                sizeBytes: 20,
              },
            },
          ],
          visitedEntries: 4,
          candidateFiles: 1,
          readBytes: 20,
        },
        recognize: () => Promise.reject(failure),
      }),
    ).rejects.toBe(failure);
  });
});

/** Recognizes one authored Copilot instruction file at the given admitted path. */
async function recognizeCopilotInstruction(
  matchedPath: string,
  sourceText: string,
  ruleId: string,
) {
  const compiled = COPILOT_REPOSITORY_RULES.find((candidate) => candidate.rule.ruleId === ruleId)!;
  const { recognitions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      admissions: [{ compiled, origin: { planIndex: 0, selectorIndex: 0 } }],
      sourceText,
    },
    ['copilot'],
  );
  return recognitions;
}

describe('Copilot instruction files emit no relationship either (T261)', () => {
  // A third product, and a third reason. Copilot's relationship-only rules
  // originate at an accepted prompt, settings file, component declaration, or
  // custom-agent profile — never at an instruction file — so there is no
  // covering rule and therefore no edge (contracts/runtime-composition.md
  // § Normative relationship-only registry). The CLI does document an
  // `@path` reference syntax for some instruction filenames, exactly as
  // Claude documents one for its own — and the answer is the same standing
  // decision: no covering rule, no edge, and the token stays source text
  // (T238). `applyTo` is not even that: it names a pattern, not a file.

  it('keeps a reference-looking value as an ordinary declaration and opens nothing', async () => {
    const recognitions = await recognizeCopilotInstruction(
      '.github/instructions/frontend.instructions.md',
      "---\napplyTo: 'src/frontend/**'\nreference: docs/target.md\n---\n\nSee docs/target.md.\n",
      'copilot.repo.instructions.path',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.details.kind).toBe('instructions');
    // Both values reach the reader as the file wrote them — one through the
    // declarations, one through the body — and neither is followed. An
    // instruction recognition performs no filesystem operation at all: no
    // read, and no census, because the kind is not directory-shaped.
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes no relationship vocabulary on the instruction recognition', async () => {
    const recognitions = await recognizeCopilotInstruction(
      '.github/copilot-instructions.md',
      '---\nreference: ../../etc/hosts\n---\n\nAlso ~/notes.md and /etc/hosts.\n',
      'copilot.repo.instructions.repository',
    );
    const serialized = JSON.stringify(recognitions);
    // Not one edge field, and in particular no boundary verdict: the values
    // that leave this Source are as unclassified as the one that does not
    // (data-model.md § Relationship).
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('resolves an environment reference in a declared value nowhere', async () => {
    // Same rule as everywhere else: the authored spelling is published as
    // written and no process environment is consulted (FR-026) — including in
    // the one declared value that keys a row.
    process.env['ACI_T261_REFERENCE'] = 'resolved-from-environment';
    try {
      const recognitions = await recognizeCopilotInstruction(
        '.github/instructions/env.instructions.md',
        "---\napplyTo: '${ACI_T261_REFERENCE}/**'\n---\n\nBody.\n",
        'copilot.repo.instructions.path',
      );
      const serialized = JSON.stringify(recognitions);
      expect(serialized).toContain('${ACI_T261_REFERENCE}');
      expect(serialized).not.toContain('resolved-from-environment');
      // The row it keys is the authored spelling too: a range is grouped by
      // exact text, and substituting one would group files by a value their
      // author never wrote.
      expect(recognitions[0]!.details).toMatchObject({
        applicabilityRange: '${ACI_T261_REFERENCE}/**',
      });
    } finally {
      delete process.env['ACI_T261_REFERENCE'];
    }
  });
});

describe('Claude subagent declarations emit no relationship and promote no target (T538)', () => {
  // Every reference shape the eventual agent relationship registry will care
  // about — a preloaded skill name, an agent reference, a memory scope, an
  // inline MCP command with arguments, a named parent server, a hook command
  // path, and a runtime-only environment reference — authored into one
  // subagent. The declarations publish as the values they are; no edge, no
  // read, no promotion.
  const AGENT_TEXT = [
    '---',
    'name: code-reviewer',
    'description: Reviews code',
    'memory: project',
    'skills:',
    '  - api-conventions',
    'mcpServers:',
    '  - playwright:',
    '      command: ../../scripts/playwright.sh',
    '      args: ["-y", "some-package"]',
    '      env:',
    '        ENDPOINT: ${RUNTIME_ONLY_REFERENCE}',
    '  - github',
    'hooks:',
    '  PreToolUse:',
    '    - command: ./scripts/validate.sh',
    '---',
    '',
    'Hand findings to @debugger, and read .claude/agent-memory/code-reviewer/MEMORY.md.',
    '',
  ].join('\n');

  /** Recognizes one authored subagent at the root\u2019s own agents directory. */
  async function recognizeClaudeAgent(sourceText: string) {
    const matchedPath = '.claude/agents/code-reviewer.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: claudeAgentRule, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['claude'],
    );
    return recognitions;
  }

  it('opens no declared target while recognizing the subagent', async () => {
    // A named skill, an inline command path, a hook command, and a memory
    // directory sit in the frontmatter, and the body names an agent and a
    // memory file. Recognition reads nothing: the engine parses the text it
    // was handed, runs no census for the agent kind, and never resolves a
    // declared path or name to anything (FR-020).
    vi.clearAllMocks();
    const recognitions = await recognizeClaudeAgent(AGENT_TEXT);
    expect(recognitions).toHaveLength(1);
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes the references as declarations and no relationship vocabulary', async () => {
    const recognitions = await recognizeClaudeAgent(AGENT_TEXT);
    const serialized = JSON.stringify(recognitions);
    // The values are there, exactly as authored...
    expect(serialized).toContain('../../scripts/playwright.sh');
    expect(serialized).toContain('./scripts/validate.sh');
    expect(serialized).toContain('${RUNTIME_ONLY_REFERENCE}');
    expect(serialized).toContain('api-conventions');
    // ...and no edge fields are: an unlisted or uncovered reference cannot be
    // promoted to a generic, inferred, or fallback relationship
    // (data-model.md § Relationship).
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('keeps the excluded memory roots out of the shipped rule catalog entirely', () => {
    // The memory scopes are behavior statements the context strategy composes
    // and nothing more: no rule of any product admits an `agent-memory` or
    // `agent-memory-local` path, so no candidate can be created there
    // (contracts/vendors/claude-code.md § Repository vendor behavior).
    for (const rule of Object.values(INSPECTION_RULES)) {
      const selectors = rule.matcher?.selectors ?? [];
      for (const selector of selectors) {
        for (const segment of selector) {
          if (segment.kind === 'literal') {
            expect(segment.value, rule.ruleId).not.toContain('agent-memory');
          }
        }
      }
    }
  });

  it('keeps agent selection and context composition free of MCP edges', () => {
    // A subagent inherits the selected parent MCP tools, which
    // `claude.mcp.selection` records by consuming the agent behavior. The
    // reverse edge does not exist: neither agent strategy consumes an MCP
    // behavior, and the rule that admits an agent file rests on none — which
    // is what keeps a declared `mcpServers` block the file's own content
    // (data-model.md § Inventory unit).
    for (const strategyId of ['claude.agents.selection', 'claude.agent-context.composition']) {
      const consumed = CLAUDE_STRATEGY_RELATIONS[
        strategyId as 'claude.agents.selection'
      ].consumesBehaviors.map((behavior) => behavior.behaviorId);
      expect(
        consumed.filter((behaviorId) => behaviorId.includes('.mcp')),
        strategyId,
      ).toEqual([]);
    }
    const agentRule = CLAUDE_RULE_RELATIONS['claude.repo.agent'];
    expect(agentRule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'claude.behavior.repo.agents',
    ]);
    expect(agentRule.explainedByStrategies.map((strategy) => strategy.strategyId)).toEqual([
      'claude.agent-context.composition',
      'claude.agents.selection',
    ]);
  });
});

describe('Copilot agent profiles emit no relationship and promote no target (T557)', () => {
  // Every reference shape the eventual agent relationship registry will care
  // about, authored into one profile: a handoff naming another agent, a
  // preloaded skill, a tool list, an inline MCP command with arguments, a
  // runtime-only environment reference, and a Markdown link. The declarations
  // publish as the values they are; no edge, no read, no promotion.
  const PROFILE_TEXT = [
    '---',
    'name: Deployer',
    'description: Runs a deployment',
    'target: github-copilot',
    'tools:',
    '  - read',
    '  - shell',
    'handoffs:',
    '  - planner',
    'mcp-servers:',
    '  deploy-mcp:',
    '    command: ../../scripts/deploy-mcp.sh',
    '    args: ["-y", "some-package"]',
    '    env:',
    '      ENDPOINT: ${RUNTIME_ONLY_REFERENCE}',
    'metadata:',
    '  owner: platform',
    '---',
    '',
    'Hand the verification to @planner, and read [the runbook](../docs/target.md).',
    '',
  ].join('\n');

  /** Recognizes one authored profile at the root\u2019s own agents directory. */
  async function recognizeCopilotAgent(sourceText: string) {
    const matchedPath = '.github/agents/deployer.md';
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        admissions: [{ compiled: copilotAgentRule, origin: { planIndex: 0, selectorIndex: 0 } }],
        sourceText,
      },
      ['copilot'],
    );
    return recognitions;
  }

  it('opens no declared target while recognizing the profile', async () => {
    vi.clearAllMocks();
    const recognitions = await recognizeCopilotAgent(PROFILE_TEXT);
    expect(recognitions).toHaveLength(1);
    expect(vi.mocked(fsIo.readFile)).not.toHaveBeenCalled();
    expect(vi.mocked(fsIo.readdir)).not.toHaveBeenCalled();
  });

  it('publishes the references as declarations and no relationship vocabulary', async () => {
    const recognitions = await recognizeCopilotAgent(PROFILE_TEXT);
    const serialized = JSON.stringify(recognitions);
    // The values are there, exactly as authored...
    expect(serialized).toContain('../../scripts/deploy-mcp.sh');
    expect(serialized).toContain('${RUNTIME_ONLY_REFERENCE}');
    expect(serialized).toContain('planner');
    // ...and no edge fields are: an unlisted or uncovered reference cannot be
    // promoted to a generic, inferred, or fallback relationship
    // (data-model.md § Relationship).
    for (const field of [
      'relationshipId',
      'targetOrigin',
      'authoredTarget',
      'semanticTarget',
      'normalizedTarget',
      'boundaryStatus',
      'resolutionStatus',
    ]) {
      expect(serialized).not.toContain(field);
    }
  });

  it('names the agent from its file while the declared name stays a declaration', async () => {
    const recognitions = await recognizeCopilotAgent(PROFILE_TEXT);
    const [recognition] = recognitions;
    if (recognition?.details.kind !== 'agent') {
      throw new Error('expected one agent recognition');
    }
    // GitHub documents the `name` field as an optional display name and
    // deduplicates agents by the configuration file's own name, so the row
    // identity is `deployer` while `Deployer` stays an ordinary declaration
    // the detail publishes (FR-007).
    expect(recognition.details.agentName).toBe('deployer');
    expect(recognition.details.metadata.find((entry) => entry.key === 'name')?.value).toMatchObject(
      { kind: 'scalar', text: 'Deployer' },
    );
  });

  it('keeps agent selection free of MCP edges in both directions', () => {
    // The three agent selections consume agent behaviors alone, and the rule
    // that admits a profile rests on none of the MCP behaviors — which is what
    // keeps a declared `mcp-servers` block the file's own content
    // (data-model.md § Inventory unit). The reference states the field is not
    // used in VS Code and other IDE custom agents at all, so no surface even
    // has an inverse edge to record.
    for (const strategyId of [
      'copilot.cli.agents.selection',
      'copilot.cloud.agents.selection',
      'copilot.vscode.agents.selection',
    ] as const) {
      const consumed = COPILOT_STRATEGY_RELATIONS[strategyId].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      );
      expect(
        consumed.filter((behaviorId) => behaviorId.includes('.mcp')),
        strategyId,
      ).toEqual([]);
    }
    const agentRule = COPILOT_RULE_RELATIONS['copilot.repo.agent'];
    expect(agentRule.basedOnBehaviors.map((behavior) => behavior.behaviorId)).toEqual([
      'copilot.behavior.cli.agents',
      'copilot.behavior.cloud.agents',
      'copilot.behavior.vscode.agents',
    ]);
    // And no MCP selection consumes an agent behavior either: a Copilot agent
    // profile is no MCP source on any surface.
    for (const strategyId of [
      'copilot.cli.mcp.selection',
      'copilot.cloud.mcp.selection',
      'copilot.vscode.mcp.selection',
    ] as const) {
      const consumed = COPILOT_STRATEGY_RELATIONS[strategyId].consumesBehaviors.map(
        (behavior) => behavior.behaviorId,
      );
      expect(
        consumed.filter((behaviorId) => behaviorId.includes('.agents')),
        strategyId,
      ).toEqual([]);
    }
  });
});
