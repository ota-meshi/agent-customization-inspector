// T054/T127/T155/T207/T228/T283: Codex, Claude, and Copilot recognition from
// the admitting rule alone — tool, the `skill`, `instructions`, and `MCP`
// kinds, path provenance, the exact multi-tool recognition matrix, and the absence of any
// recognition the shipped registry does not authorize (FR-004, FR-005).
//
// The one value a recognition lifts out of the bytes is the declared name, and
// the "no source exposure" assertions below are what keep it there: every other
// authored value stays in the complete `sourceText`, which only the detail
// route serves. The name reading itself is covered by `codex-metadata.test.ts`
// and `claude-metadata.test.ts`; these cases are about recognition from the
// admitting rule alone, so most of them pass no source at all.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { recognizeCandidateForVendors } from '../../../src/server/inspection/recognizers/candidate';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import {
  CODEX_DERIVED_FALLBACK_RULE,
  CODEX_REPOSITORY_RULES,
} from '../../../src/server/inspection/rules/codex';
import { COPILOT_REPOSITORY_RULES } from '../../../src/server/inspection/rules/copilot';
import type { CompiledStaticCandidateRule } from '../../../src/server/inspection/rules/registry';
import type { SupportedTool } from '../../../src/shared/entities';

// Selected by identity rather than position: a vendor catalog grows with its
// inventory phases, and these suites name the exact rule each case is about.
const codexSkillRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.skill',
)!;
const codexInstructionsRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.instructions',
)!;
const codexConfigRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.config',
)!;
const codexRulesRule = CODEX_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'codex.repo.rules',
)!;
const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;
const claudeMcpRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.mcp',
)!;
const claudeInstructionsRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.instructions',
)!;
const claudeRulesRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.rules',
)!;
const claudeCommandRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.command',
)!;
const copilotCommandRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.command',
)!;
const copilotPromptRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.prompt',
)!;
const copilotSkillRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.skill',
)!;
const copilotMcpRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp',
)!;
const copilotVscodeMcpRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp.vscode',
)!;
const copilotVscodeRootMcpRule = COPILOT_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'copilot.repo.mcp.vscode-root',
)!;

/**
 * A skill directory these cases can enumerate. The recognizer runs the census
 * itself, so a case that expects companion files has to name a real directory;
 * every other case names a path that does not exist, which is how it proves the
 * census stays absent rather than throwing.
 */
let root: string;

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-codex-recognizer-'));
  mkdirSync(join(root, '.agents/skills/greet/scripts'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/greet/SKILL.md'), '# greet\n', 'utf8');
  writeFileSync(join(root, '.agents/skills/greet/reference.md'), 'reference\n', 'utf8');
  writeFileSync(join(root, '.agents/skills/greet/scripts/run.sh'), 'echo hi\n', 'utf8');
  mkdirSync(join(root, '.agents/skills/solo'), { recursive: true });
  writeFileSync(join(root, '.agents/skills/solo/SKILL.md'), '# solo\n', 'utf8');
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

async function recognizeWith(
  tool: SupportedTool,
  matchedPath: string,
  rules: readonly CompiledStaticCandidateRule[],
  sourceText = '',
) {
  // The census enumerates the candidate's own directory and propagates a
  // failure rather than reporting an empty one, so every path a case names has
  // to exist — as it does in a real scan, where the traversal found it.
  mkdirSync(dirname(join(root, matchedPath)), { recursive: true });
  // These cases are about the recognitions; the census the recognizer also
  // returns has its own suite (`companion-census.test.ts`) and its own
  // publication path (`repository-scan.test.ts`).
  const { recognitions, companions } = await recognizeCandidateForVendors(
    {
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      sourceText,
      admissions: rules.map((compiled, index) => ({
        compiled,
        origin: { planIndex: index, selectorIndex: 0 },
      })),
    },
    [tool],
  );
  return { recognitions, companions };
}

async function recognize(
  matchedPath: string,
  rules: readonly CompiledStaticCandidateRule[] = [codexSkillRule],
  sourceText = '',
) {
  return (await recognizeWith('codex', matchedPath, rules, sourceText)).recognitions;
}

/** The census paths the recognizer returned beside its recognitions. */
async function censusOf(
  tool: SupportedTool,
  matchedPath: string,
  rules: readonly CompiledStaticCandidateRule[],
) {
  const { companions } = await recognizeWith(tool, matchedPath, rules);
  return companions.map((companion) => companion.sourceRelativePath);
}

describe('Codex skill recognition', () => {
  it('attaches exactly one codex/skill recognition to the admitted file', async () => {
    const recognitions = await recognize('.agents/skills/greet/SKILL.md');
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.agents/skills/greet/SKILL.md',
      tool: 'codex',
      details: { kind: 'skill' },
      // An empty file parses: the extractor runs and finds no frontmatter, so
      // the recognition is `parsed` with nothing declared. `not-attempted`
      // would be a different claim — that no allowlisted extractor applies to
      // this kind at all.
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
  });

  it('derives its provenance from the admitted path and the admitting rule', async () => {
    const [recognition] = await recognize('packages/api/.agents/skills/deploy/SKILL.md');
    expect(recognition!.provenances).toHaveLength(1);
    expect(recognition!.provenances[0]).toMatchObject({
      ruleId: 'codex.repo.skill',
      matchedPath: 'packages/api/.agents/skills/deploy/SKILL.md',
    });
  });

  it('merges two admissions of the same kind into one recognition', async () => {
    // One physical file may be admitted by several rules within one Source
    // and retains each provenance; compatible admissions never split into
    // competing recognitions (data-model.md § ToolRecognition). The same
    // compiled rule stands in for both admissions: what the case exercises is
    // two admission entries, not two distinct records.
    const recognitions = await recognize('.agents/skills/greet/SKILL.md', [
      codexSkillRule,
      codexSkillRule,
    ]);
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.provenances).toHaveLength(2);
  });

  it('produces nothing for an admission owned by another tool', async () => {
    // The branch under test is decided by `tool` alone: the Codex pass
    // ignores a Claude-owned admission, and the Claude pass ignores a
    // Codex-owned one, so neither can fabricate the other product's
    // recognition from a shared candidate.
    expect(await recognize('.claude/skills/greet/SKILL.md', [claudeSkillRule])).toEqual([]);
    expect(
      (await recognizeWith('claude', '.agents/skills/greet/SKILL.md', [codexSkillRule]))
        .recognitions,
    ).toEqual([]);
  });

  it('names the skill by its declared name and lists what else it declares', async () => {
    const [recognition] = await recognize(
      '.agents/skills/secretive/SKILL.md',
      [codexSkillRule],
      '---\nname: secretive\napi_key: ghp_EXAMPLE000000000000000000000000000000\n---\n\nBody.\n',
    );
    expect(recognition!.details.kind === 'skill' && recognition!.details.declaredName).toBe(
      'secretive',
    );
    // Every declared key is listed, credential-shaped ones included: this is
    // the reader's own frontmatter shown back to them, unmasked (FR-025). What
    // the recognition never carries is a second copy of the complete source.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
  });

  it('takes the declared name from the file, not from the directory', async () => {
    // The two are independent: a skill may be authored with a name that does
    // not match the directory holding it, and the row must show what the file
    // says (FR-007).
    const [recognition] = await recognize(
      '.agents/skills/greet/SKILL.md',
      [codexSkillRule],
      '---\nname: say-hello\n---\n\nSay hello.\n',
    );
    expect(recognition!.details.kind === 'skill' && recognition!.details.declaredName).toBe(
      'say-hello',
    );
  });

  it('leaves the declared name absent rather than guessing one', async () => {
    // Absent, not empty, and never the directory segment: "this file declares
    // no name" is a different fact from "it declares an empty one".
    for (const source of ['', '# no frontmatter\n', '---\ndescription: x\n---\n']) {
      const [recognition] = await recognize(
        '.agents/skills/greet/SKILL.md',
        [codexSkillRule],
        source,
      );
      expect('declaredName' in recognition!.details).toBe(false);
    }
  });

  it('lists what accompanies the skill as Source-relative Paths', async () => {
    // The census answers relative to the directory it enumerated; the
    // recognizer holds the candidate's own Source-relative Path and is what
    // turns one into the other.
    expect(await censusOf('codex', '.agents/skills/greet/SKILL.md', [codexSkillRule])).toEqual([
      '.agents/skills/greet/reference.md',
      '.agents/skills/greet/scripts/run.sh',
    ]);
  });

  it('lists nothing for a skill whose directory holds only its own file', async () => {
    // Empty, not absent: every recognized skill has been enumerated, because
    // being a directory is what a skill is.
    expect(await censusOf('codex', '.agents/skills/solo/SKILL.md', [codexSkillRule])).toEqual([]);
  });

  it('keeps a malformed frontmatter document from failing the recognition', async () => {
    // An unparseable document is still an admitted, readable candidate whose
    // complete source the user can open. Losing the row over a display name
    // would be a worse answer than showing it without one.
    const [recognition] = await recognize(
      '.agents/skills/greet/SKILL.md',
      [codexSkillRule],
      '---\nname: [unterminated\n---\n',
    );
    expect(recognition!.details.kind).toBe('skill');
    expect('declaredName' in recognition!.details).toBe(false);
  });
});

describe('Claude skill recognition (T127)', () => {
  async function recognizeClaude(
    matchedPath: string,
    rules: readonly CompiledStaticCandidateRule[] = [claudeSkillRule],
    sourceText = '',
  ) {
    return (await recognizeWith('claude', matchedPath, rules, sourceText)).recognitions;
  }

  it('attaches exactly one claude/skill recognition carrying the authored name', async () => {
    const recognitions = await recognizeClaude(
      '.claude/skills/greet/SKILL.md',
      [claudeSkillRule],
      '---\nname: authored-name\n---\n\nBody.\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.claude/skills/greet/SKILL.md',
      tool: 'claude',
      // The name is the value the grouped inventory row is keyed by (FR-007),
      // extracted from the file and never from the directory segment.
      details: { kind: 'skill', declaredName: 'authored-name' },
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
  });

  it('names the skill by its declared name and lists what else it declares', async () => {
    const [recognition] = await recognizeClaude(
      '.claude/skills/greet/SKILL.md',
      [claudeSkillRule],
      '---\nname: greet\ndescription: says hello\napi_key: ghp_EXAMPLE000000000000000000000000000000\n---\n',
    );
    if (recognition!.details.kind !== 'skill') {
      throw new Error('expected a skill recognition');
    }
    expect(recognition!.details.declaredName).toBe('greet');
    expect(recognition!.details.frontmatter.map((entry) => entry.key)).toEqual([
      'name',
      'description',
      'api_key',
    ]);
    // The declarations are what the detail surface shows; the complete source
    // it also serves is not copied into the recognition.
    expect(JSON.stringify(recognition)).not.toContain('sourceText');
  });

  it('leaves the declared name absent rather than guessing one', async () => {
    // Absent, not empty, and never the directory segment: "this file declares
    // no name" is a different fact from "it declares an empty one".
    for (const source of ['', '# no frontmatter\n', '---\ndescription: x\n---\n']) {
      const [recognition] = await recognizeClaude(
        '.claude/skills/greet/SKILL.md',
        [claudeSkillRule],
        source,
      );
      expect('declaredName' in recognition!.details).toBe(false);
    }
  });

  it('derives its provenance from the admitted path and the admitting rule', async () => {
    const [recognition] = await recognizeClaude('packages/api/.claude/skills/deploy/SKILL.md');
    expect(recognition!.provenances).toHaveLength(1);
    expect(recognition!.provenances[0]).toMatchObject({
      ruleId: 'claude.repo.skill',
      matchedPath: 'packages/api/.claude/skills/deploy/SKILL.md',
    });
  });

  it('recognizes nothing from a filename alone, outside the rule', async () => {
    // A `SKILL.md` the traversal never admitted reaches the recognizer with no
    // admissions, and path shape alone creates no recognition (FR-004).
    expect(await recognizeClaude('docs/SKILL.md', [])).toEqual([]);
  });

  it('lists what accompanies the skill as Source-relative Paths', async () => {
    // The census is the shared engine's: a Claude skill is a directory exactly
    // as a Codex one is, so its companions are enumerated the same way.
    mkdirSync(join(root, '.claude/skills/stocked/scripts'), { recursive: true });
    writeFileSync(join(root, '.claude/skills/stocked/SKILL.md'), '# stocked\n', 'utf8');
    writeFileSync(join(root, '.claude/skills/stocked/reference.md'), 'reference\n', 'utf8');
    writeFileSync(join(root, '.claude/skills/stocked/scripts/run.sh'), 'echo hi\n', 'utf8');
    expect(await censusOf('claude', '.claude/skills/stocked/SKILL.md', [claudeSkillRule])).toEqual([
      '.claude/skills/stocked/reference.md',
      '.claude/skills/stocked/scripts/run.sh',
    ]);
  });
});

describe('the Copilot recognition matrix (T155)', () => {
  /** Recognizes one candidate for all three products at once, as the scan does. */
  async function recognizeMatrix(
    matchedPath: string,
    admitting: readonly CompiledStaticCandidateRule[],
  ) {
    mkdirSync(dirname(join(root, matchedPath)), { recursive: true });
    return recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        sourceText: '',
        admissions: admitting.map((compiled, index) => ({
          compiled,
          origin: { planIndex: index, selectorIndex: 0 },
        })),
      },
      ['copilot', 'claude', 'codex'],
    );
  }

  it('recognizes a .github admission as Copilot alone', async () => {
    const { recognitions } = await recognizeMatrix('.github/skills/ship/SKILL.md', [
      copilotSkillRule,
    ]);
    expect(recognitions.map((one) => one.tool)).toEqual(['copilot']);
    expect(recognitions[0]).toMatchObject({
      details: { kind: 'skill' },
      provenances: [{ ruleId: 'copilot.repo.skill', matchedPath: '.github/skills/ship/SKILL.md' }],
    });
  });

  it('recognizes one shared .agents candidate for Copilot and Codex, and no one else', async () => {
    // Zero extra recognitions is the matrix's negative half: a Claude
    // recognition here would be an admission Claude's rule never made
    // (FR-004), and the two real ones stay separate records with their own
    // rules' provenance rather than one merged claim.
    const { recognitions } = await recognizeMatrix('.agents/skills/greet/SKILL.md', [
      copilotSkillRule,
      codexSkillRule,
    ]);
    expect(recognitions.map((one) => one.tool)).toEqual(['copilot', 'codex']);
    expect(recognitions.map((one) => one.provenances.map((p) => p.ruleId))).toEqual([
      ['copilot.repo.skill'],
      ['codex.repo.skill'],
    ]);
  });

  it('recognizes one shared .claude candidate for Copilot and Claude, and no one else', async () => {
    const { recognitions } = await recognizeMatrix('.claude/skills/greet/SKILL.md', [
      copilotSkillRule,
      claudeSkillRule,
    ]);
    expect(recognitions.map((one) => one.tool)).toEqual(['copilot', 'claude']);
    expect(recognitions.map((one) => one.provenances.map((p) => p.ruleId))).toEqual([
      ['copilot.repo.skill'],
      ['claude.repo.skill'],
    ]);
  });

  it('lists a shared candidate’s companions once, however many products recognize it', async () => {
    // The census belongs to the candidate's directory: two recognizing
    // products do not give a skill two sets of accompanying files, so the
    // companion list carries each path exactly once.
    const { companions } = await recognizeMatrix('.agents/skills/greet/SKILL.md', [
      copilotSkillRule,
      codexSkillRule,
    ]);
    expect(companions.map((companion) => companion.sourceRelativePath)).toEqual([
      '.agents/skills/greet/reference.md',
      '.agents/skills/greet/scripts/run.sh',
    ]);
  });
});

describe('Codex instruction recognition (T207, presentation added by T222)', () => {
  it('attaches exactly one codex/instructions recognition to an admitted override', async () => {
    const recognitions = (
      await recognizeWith('codex', 'AGENTS.override.md', [codexInstructionsRule])
    ).recognitions;
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: 'AGENTS.override.md',
      tool: 'codex',
      // The payload is the file's presentation plus the range its row is
      // grouped by — one applicability range, or the no-range row
      // (data-model.md § Inventory unit) — so no declared name exists to
      // extract: the one frontmatter parse a skill uses feeds the detail's
      // declarations and instructions (T222).
      details: { kind: 'instructions' },
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    expect(Object.keys(recognitions[0]!.details)).toEqual([
      'kind',
      'frontmatter',
      'bodyText',
      'applicabilityRange',
    ]);
    // The root's range: the file governs the whole Repository (data-model.md
    // § Inventory unit), which is what puts it on one row with the
    // `CLAUDE.md` beside it.
    expect(recognitions[0]!.details).toMatchObject({ applicabilityRange: '**' });
  });

  it('derives deterministic provenance from the admitting instruction rule', async () => {
    const recognitions = (await recognizeWith('codex', 'AGENTS.md', [codexInstructionsRule]))
      .recognitions;
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'codex.repo.instructions',
      matchedPath: 'AGENTS.md',
    });
  });

  it('runs no census for an instruction candidate', async () => {
    // A skill is a directory; an instruction file is just a file. The census
    // is called for by the recognized kind, and `instructions` calls for
    // none — nothing beside the file belongs to it
    // (contracts/inspection-path-allowlist.md § Bounded companion census).
    const { companions } = await recognizeWith('codex', 'AGENTS.override.md', [
      codexInstructionsRule,
    ]);
    expect(companions).toEqual([]);
  });

  it('fails a malformed frontmatter block all-or-nothing, publishing nothing parsed', async () => {
    // The instructions kind runs the one frontmatter parse a skill uses
    // (T222), so a malformed block is that recognition's `failed` state:
    // extraction is all-or-nothing, nothing parsed is published, and the
    // complete source stays with the file — the scan attaches the failure's
    // diagnostic, which is why none is here (FR-028).
    const recognitions = (
      await recognizeWith(
        'codex',
        'AGENTS.override.md',
        [codexInstructionsRule],
        '---\nmalformed: [unclosed\n---\n\n# Override\n',
      )
    ).recognitions;
    expect(recognitions[0]!.parseStatus).toBe('failed');
    // The range survives the failure: what a file governs comes from where it
    // sits, not from what parsed (FR-028).
    expect(recognitions[0]!.details).toEqual({
      kind: 'instructions',
      frontmatter: [],
      bodyText: '',
      applicabilityRange: '**',
    });
    expect(recognitions[0]!.diagnosticIds).toEqual([]);
  });

  it('produces no recognition for a tool the admission does not belong to', async () => {
    // Dispatching the Codex admission to another product must yield nothing:
    // a filename-only `AGENTS.md` is no one else's candidate before that
    // vendor's own instruction phase ships its rule.
    const { recognitions } = await recognizeWith('claude', 'AGENTS.md', [codexInstructionsRule]);
    expect(recognitions).toEqual([]);
  });
});

describe('Codex MCP recognition (T283)', () => {
  const carrierPath = '.codex/config.toml';

  it('attaches one codex/MCP recognition with one row per declaration, in authored order', async () => {
    const recognitions = (
      await recognizeWith(
        'codex',
        carrierPath,
        [codexConfigRule],
        [
          'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]',
          '',
          '[mcp_servers.context7]',
          'command = "npx"',
          'args = ["-y", "@upstash/context7-mcp"]',
          '',
          '[mcp_servers.docs-http]',
          'url = "https://docs.example.com/mcp"',
          '',
        ].join('\n'),
      )
    ).recognitions;
    // One recognition per `(file, tool, kind)`: the carrier's admission
    // yields the MCP recognition and nothing else — no instructions, no
    // settings recognition before the phase that owns one.
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: carrierPath,
      tool: 'codex',
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    // One declaration per named server table, in the parser's resolved
    // order, each carrying the fields the carrier wrote as resolved values
    // (FR-007); the fallback declaration beside them stays configuration.
    expect(recognitions[0]!.details.servers.map((server) => server.name)).toEqual([
      'context7',
      'docs-http',
    ]);
    expect(recognitions[0]!.details.servers[0]!.fields).toEqual([
      {
        key: 'command',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'npx' },
      },
      {
        key: 'args',
        keyKind: 'string',
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', scalarKind: 'string', text: '-y' },
            { kind: 'scalar', scalarKind: 'string', text: '@upstash/context7-mcp' },
          ],
        },
      },
    ]);
  });

  it('derives deterministic provenance from the admitting carrier rule', async () => {
    const recognitions = (
      await recognizeWith('codex', carrierPath, [codexConfigRule], '[mcp_servers.one]\n')
    ).recognitions;
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'codex.repo.config',
      discoveryClass: 'static-candidate',
      matchedPath: carrierPath,
    });
  });

  it('publishes an empty declaration set for a carrier that declares none', async () => {
    // Absent declarations are omitted, not failed: the carrier is a
    // recognized MCP carrier either way, and `parsed` with zero rows is what
    // "declares no server" looks like — distinct from the failed state below.
    for (const sourceText of [
      'project_doc_fallback_filenames = ["TEAM_GUIDE.md"]\n',
      // A `mcp_servers` value that is not a table declares nothing either.
      'mcp_servers = "not a table"\n',
    ]) {
      const recognitions = (
        await recognizeWith('codex', carrierPath, [codexConfigRule], sourceText)
      ).recognitions;
      expect(recognitions[0]).toMatchObject({
        parseStatus: 'parsed',
        details: { kind: 'MCP', servers: [] },
      });
    }
  });

  it('omits a malformed declaration whole while keeping the ordinary ones', async () => {
    // Atomic omission: a `mcp_servers` entry that is not a table is no
    // declaration, and dropping it must not take the well-formed neighbors
    // with it — or publish any partial rendering of the dropped one.
    const recognitions = (
      await recognizeWith(
        'codex',
        carrierPath,
        [codexConfigRule],
        ['[mcp_servers]', 'broken = "oops"', '', '[mcp_servers.kept]', 'command = "npx"', ''].join(
          '\n',
        ),
      )
    ).recognitions;
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.parseStatus).toBe('parsed');
    expect(recognitions[0]!.details.servers.map((server) => server.name)).toEqual(['kept']);
  });

  it('fails the whole recognition on a document TOML cannot parse', async () => {
    // All-or-nothing (FR-028): nothing parsed is published — no partial
    // declaration list — while the carrier stays an admitted candidate whose
    // diagnostic the scan attaches.
    const recognitions = (
      await recognizeWith('codex', carrierPath, [codexConfigRule], '[mcp_servers.broken\n')
    ).recognitions;
    expect(recognitions[0]!.parseStatus).toBe('failed');
    expect(recognitions[0]!.details).toEqual({ kind: 'MCP', servers: [] });
    expect(recognitions[0]!.diagnosticIds).toEqual([]);
  });

  it('keeps declared secrets and environment references literal and unresolved', async () => {
    // The values are the file's own resolved literals: nothing looks up the
    // process environment, so no process value can reach the record (FR-026).
    const recognitions = (
      await recognizeWith(
        'codex',
        carrierPath,
        [codexConfigRule],
        '[mcp_servers.ctx.env]\nAPI_KEY = "$HOME/${TOKEN}"\n',
      )
    ).recognitions;
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.details.servers[0]).toEqual({
      name: 'ctx',
      fields: [
        {
          key: 'env',
          keyKind: 'string',
          value: {
            kind: 'mapping',
            entries: [
              {
                key: 'API_KEY',
                keyKind: 'string',
                value: { kind: 'scalar', scalarKind: 'string', text: '$HOME/${TOKEN}' },
              },
            ],
          },
        },
      ],
    });
    expect(JSON.stringify(recognitions[0])).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('runs no census for an MCP carrier and produces nothing for another tool', async () => {
    // The carrier is just a file — nothing beside it belongs to it — and the
    // admission is Codex's alone.
    const { companions, recognitions } = await recognizeWith('codex', carrierPath, [
      codexConfigRule,
    ]);
    expect(companions).toEqual([]);
    expect(recognitions).toHaveLength(1);
    const other = await recognizeWith('claude', carrierPath, [codexConfigRule]);
    expect(other.recognitions).toEqual([]);
  });
});

describe('Codex permission-policy recognition (T409)', () => {
  /** A rule file's authored text, credential and all. */
  const RULE_SOURCE = [
    'prefix_rule(',
    '    pattern = ["curl", "-H", "Authorization: Bearer ghp_EXAMPLE0000000000000000000000000000"],',
    '    decision = "forbidden",',
    ')',
    '',
  ].join('\n');

  it('recognizes the admitted file as the rule kind from its path alone', async () => {
    const recognitions = await recognize(
      '.codex/rules/default.rules',
      [codexRulesRule],
      RULE_SOURCE,
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.codex/rules/default.rules',
      tool: 'codex',
      details: { kind: 'permissions' },
      // `not-attempted`, not `parsed`: no allowlisted extractor applies to the
      // permissions kind in this release, which is a different claim from "parsing
      // succeeded and found nothing". The file's own text is the detail's,
      // one file at a time (FR-027).
      parseStatus: 'not-attempted',
      diagnosticIds: [],
    });
  });

  it('carries no part of the rule text, credential-shaped values included', async () => {
    const [recognition] = await recognize(
      '.codex/rules/secrets.rules',
      [codexRulesRule],
      RULE_SOURCE,
    );
    // The row unit is the file, so the recognition's whole payload is its
    // kind: nothing a rule declares — a matched command prefix, a decision, a
    // justification, a credential inside one — reaches the inventory
    // (FR-026, FR-027).
    expect(recognition!.details).toEqual({ kind: 'permissions' });
    const serialized = JSON.stringify(recognition);
    expect(serialized).not.toContain('ghp_EXAMPLE');
    expect(serialized).not.toContain('prefix_rule');
  });

  it('derives its provenance from the admitted path and the admitting rule', async () => {
    const [recognition] = await recognize('.codex/rules/deploy.rules', [codexRulesRule]);
    expect(recognition!.provenances).toHaveLength(1);
    expect(recognition!.provenances[0]).toMatchObject({
      ruleId: 'codex.repo.rules',
      matchedPath: '.codex/rules/deploy.rules',
    });
  });

  it('enumerates no companion directory for a rule file', async () => {
    // The census belongs to a directory-shaped kind, which is `skill` alone
    // (contracts/inspection-path-allowlist.md § Bounded companion census). A
    // rule file is one file, so its siblings under `.codex/rules/` are
    // candidates or near misses on their own and never this file's
    // companions.
    expect(await censusOf('codex', '.codex/rules/default.rules', [codexRulesRule])).toEqual([]);
  });

  it('produces nothing for another product asked about the same path', async () => {
    // `.codex/rules/` is Codex's own location: no Claude or Copilot rule
    // admits it, so no other product can be handed the admission at all — and
    // a pass for another tool over a Codex-owned admission fabricates
    // nothing.
    expect(
      (await recognizeWith('claude', '.codex/rules/default.rules', [codexRulesRule])).recognitions,
    ).toEqual([]);
    expect(
      (await recognizeWith('copilot', '.codex/rules/default.rules', [codexRulesRule])).recognitions,
    ).toEqual([]);
  });
});

describe('Claude rule recognition (T426)', () => {
  /** Recognizes one authored `.claude/rules/**` file for Claude. */
  async function recognizeClaudeRule(matchedPath: string, sourceText = '') {
    return (await recognizeWith('claude', matchedPath, [claudeRulesRule], sourceText)).recognitions;
  }

  it('recognizes the admitted file as the rule kind from its path alone', async () => {
    // A rule is published as the one document its author wrote, so nothing is
    // read out of it — the frontmatter block included — and `not-attempted`
    // is the honest status for a kind no allowlisted extractor applies to.
    const recognitions = await recognizeClaudeRule(
      '.claude/rules/api.md',
      '---\npaths:\n  - "src/api/**/*.ts"\n---\n\n# API\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.claude/rules/api.md',
      tool: 'claude',
      details: { kind: 'rule' },
      parseStatus: 'not-attempted',
      diagnosticIds: [],
    });
    // The declared glob stays in the file, never in the record, and is never
    // evaluated against a filesystem path (FR-019).
    expect(JSON.stringify(recognitions)).not.toContain('src/api/**/*.ts');
  });

  it('derives its provenance from the admitted path and the admitting rule', async () => {
    const recognitions = await recognizeClaudeRule(
      'packages/api/.claude/rules/deep/nested/timeouts.md',
    );
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'claude.repo.rules',
      matchedPath: 'packages/api/.claude/rules/deep/nested/timeouts.md',
    });
  });

  it('produces nothing for another product asked about the same path', async () => {
    // The `.claude` locations Copilot documents are the ones this release
    // leaves out, so no Copilot pass can be handed a Claude rule admission
    // and fabricate a recognition from it.
    expect(
      (await recognizeWith('copilot', '.claude/rules/api.md', [claudeRulesRule])).recognitions,
    ).toEqual([]);
    expect(
      (await recognizeWith('codex', '.claude/rules/api.md', [claudeRulesRule])).recognitions,
    ).toEqual([]);
  });

  it('enumerates no companion directory beside a rule file', async () => {
    // The census belongs to a directory-shaped kind, which is `skill` alone.
    expect(await censusOf('claude', '.claude/rules/api.md', [claudeRulesRule])).toEqual([]);
  });
});

describe('Claude command recognition (T442)', () => {
  /** Recognizes one authored `.claude/commands/**` file for Claude. */
  async function recognizeClaudeCommand(matchedPath: string, sourceText = '') {
    return (await recognizeWith('claude', matchedPath, [claudeCommandRule], sourceText))
      .recognitions;
  }

  it('recognizes the admitted file as the command kind with the parse it shares', async () => {
    // A command file carries a skill's frontmatter keys, so the shared
    // Markdown extraction is what the recognition publishes — the same one
    // parse both other frontmatter-led kinds read.
    const recognitions = await recognizeClaudeCommand(
      '.claude/commands/deploy.md',
      '---\ndescription: Deploy the current branch\nmodel: opus\n---\n\n# Deploy\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.claude/commands/deploy.md',
      tool: 'claude',
      details: {
        kind: 'prompt/command',
        frontmatter: [
          { key: 'description', value: { kind: 'scalar', text: 'Deploy the current branch' } },
          { key: 'model', value: { kind: 'scalar', text: 'opus' } },
        ],
        bodyText: '\n# Deploy\n',
      },
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
  });

  it('names the recognition by the command the admitting rule derives', async () => {
    // The command a reader types is derived from the path — the file name
    // without its extension, namespaced by the subdirectories between it and
    // the commands directory — because Claude Code ignores a `name` key in a
    // command file. It is the admitting rule's answer, and it is the identity
    // the inventory row is grouped under (data-model.md § Inventory unit).
    const recognitions = await recognizeClaudeCommand(
      '.claude/commands/frontend/component.md',
      '---\ndescription: Scaffold a component\n---\n\n# Component\n',
    );
    const details = recognitions[0]!.details;
    expect(details).toMatchObject({ kind: 'prompt/command', invocationName: 'frontend:component' });
    expect(Object.keys(details).toSorted()).toEqual([
      'bodyText',
      'frontmatter',
      'invocationName',
      'kind',
    ]);
  });

  it('names a direct child by its file name alone', async () => {
    const recognitions = await recognizeClaudeCommand('.claude/commands/deploy.md');
    expect(recognitions[0]!.details).toMatchObject({ invocationName: 'deploy' });
  });

  it('keeps the name a failed extraction cannot take away', async () => {
    // The name is the path's own fact, so a failed parse costs the
    // declarations and nothing else (FR-028).
    const recognitions = await recognizeClaudeCommand(
      '.claude/commands/team/review/security.md',
      '---\nallowed-tools: [Bash\n---\n\n# Broken\n',
    );
    expect(recognitions[0]).toMatchObject({
      parseStatus: 'failed',
      details: { invocationName: 'team:review:security', frontmatter: [], bodyText: '' },
    });
  });

  it('derives its provenance from the admitted path and the admitting rule', async () => {
    const recognitions = await recognizeClaudeCommand('.claude/commands/team/review/security.md');
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'claude.repo.command',
      matchedPath: '.claude/commands/team/review/security.md',
    });
  });

  it('fails extraction all-or-nothing while the file stays an admitted candidate', async () => {
    // Malformed YAML publishes nothing parsed; the complete source stays
    // available through the detail route and the failure's own Diagnostic is
    // the scan's to attach (FR-028).
    const recognitions = await recognizeClaudeCommand(
      '.claude/commands/broken.md',
      '---\nallowed-tools: [Bash\n---\n\n# Broken\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      details: { kind: 'prompt/command', frontmatter: [], bodyText: '' },
      parseStatus: 'failed',
    });
  });

  it('produces nothing for another product asked about the same path', async () => {
    // No other product's shipped rule reaches `.claude/commands/` in this
    // release, so no pass can be handed a Claude command admission and
    // fabricate a recognition from it.
    expect(
      (await recognizeWith('copilot', '.claude/commands/deploy.md', [claudeCommandRule]))
        .recognitions,
    ).toEqual([]);
    expect(
      (await recognizeWith('codex', '.claude/commands/deploy.md', [claudeCommandRule]))
        .recognitions,
    ).toEqual([]);
  });

  it('enumerates no companion directory beside a command file', async () => {
    // The census belongs to a directory-shaped kind, which is `skill` alone —
    // a command's own namespace directory holds sibling commands, each its own
    // row, never a companion of one of them.
    expect(await censusOf('claude', '.claude/commands/deploy.md', [claudeCommandRule])).toEqual([]);
  });
});

describe('Copilot command recognition (T459)', () => {
  /** Recognizes one authored root direct-child command file for Copilot. */
  async function recognizeCopilotCommand(matchedPath: string, sourceText = '') {
    return (await recognizeWith('copilot', matchedPath, [copilotCommandRule], sourceText))
      .recognitions;
  }

  it('recognizes the admitted file as the command kind, named by its file name', async () => {
    const recognitions = await recognizeCopilotCommand(
      '.claude/commands/deploy.md',
      '---\ndescription: Deploy the current branch\n---\n\n# Deploy\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.claude/commands/deploy.md',
      tool: 'copilot',
      details: {
        kind: 'prompt/command',
        invocationName: 'deploy',
        frontmatter: [
          { key: 'description', value: { kind: 'scalar', text: 'Deploy the current branch' } },
        ],
      },
      parseStatus: 'parsed',
    });
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'copilot.repo.command',
      matchedPath: '.claude/commands/deploy.md',
    });
  });

  it('gives one shared root file a recognition per product, from one parse', async () => {
    // The same physical file is admitted by both products' rules, and the one
    // Markdown extraction is shared: two recognitions, one read, one parse
    // (data-model.md § ToolRecognition).
    const { recognitions } = await recognizeWith(
      'claude',
      '.claude/commands/deploy.md',
      [claudeCommandRule, copilotCommandRule],
      '---\ndescription: Deploy\n---\n\n# Deploy\n',
    );
    // One tool at a time through this helper, so the Copilot pass is asked
    // separately; what both prove together is that each product's own rule
    // yields its own recognition of the one file.
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      tool: 'claude',
      details: { invocationName: 'deploy' },
    });
    const copilot = (
      await recognizeWith(
        'copilot',
        '.claude/commands/deploy.md',
        [claudeCommandRule, copilotCommandRule],
        '---\ndescription: Deploy\n---\n\n# Deploy\n',
      )
    ).recognitions;
    expect(copilot).toHaveLength(1);
    expect(copilot[0]).toMatchObject({
      tool: 'copilot',
      details: { invocationName: 'deploy', bodyText: '\n# Deploy\n' },
    });
    // Each recognition keeps only its own product's admission: a provenance
    // says which rule authorized this product's read, never another's.
    expect(copilot[0]!.provenances.map((provenance) => provenance.ruleId)).toEqual([
      'copilot.repo.command',
    ]);
  });

  it('produces nothing for a tool whose rule did not admit the path', async () => {
    expect(
      (await recognizeWith('codex', '.claude/commands/deploy.md', [copilotCommandRule]))
        .recognitions,
    ).toEqual([]);
  });
});

describe('Copilot prompt recognition (T488)', () => {
  /** Recognizes one authored `.github/prompts/*.prompt.md` for Copilot. */
  async function recognizePromptFile(matchedPath: string, sourceText = '') {
    return (await recognizeWith('copilot', matchedPath, [copilotPromptRule], sourceText))
      .recognitions;
  }

  it('recognizes the admitted file as the same kind a command file carries', async () => {
    // One kind for both locations, which is what puts a prompt and a command
    // of one name on one inventory row (data-model.md § Inventory unit).
    const recognitions = await recognizePromptFile(
      '.github/prompts/scaffold.prompt.md',
      '---\nname: scaffold-component\ndescription: Scaffold a React component\n---\n\n# Scaffold\n',
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.github/prompts/scaffold.prompt.md',
      tool: 'copilot',
      details: {
        kind: 'prompt/command',
        invocationName: 'scaffold-component',
        bodyText: '\n# Scaffold\n',
      },
      parseStatus: 'parsed',
    });
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'copilot.repo.prompt',
      matchedPath: '.github/prompts/scaffold.prompt.md',
    });
  });

  it('falls back to the file name when the file declares no name', async () => {
    const recognitions = await recognizePromptFile(
      '.github/prompts/review.prompt.md',
      '# Review\n',
    );
    expect(recognitions[0]!.details).toMatchObject({ invocationName: 'review' });
  });

  it('falls back to the file name when the declarations could not be read', async () => {
    // A failed extraction publishes no declarations, and the name the vendor
    // gives a file that declares none is the same answer (FR-028).
    const recognitions = await recognizePromptFile(
      '.github/prompts/broken.prompt.md',
      '---\ntools: [read\n---\n\n# Broken\n',
    );
    expect(recognitions[0]).toMatchObject({
      parseStatus: 'failed',
      details: { invocationName: 'broken', frontmatter: [], bodyText: '' },
    });
  });

  it('produces nothing for a tool whose rule did not admit the path', async () => {
    for (const tool of ['claude', 'codex'] as const) {
      expect(
        (await recognizeWith(tool, '.github/prompts/review.prompt.md', [copilotPromptRule]))
          .recognitions,
      ).toEqual([]);
    }
  });
});

describe('Claude MCP recognition (T306)', () => {
  const carrierPath = '.mcp.json';

  it('attaches one claude/MCP recognition with one row per declaration, in authored order', async () => {
    const recognitions = (
      await recognizeWith(
        'claude',
        carrierPath,
        [claudeMcpRule],
        JSON.stringify({
          mcpServers: {
            context7: { command: 'npx', args: ['-y', '@upstash/context7-mcp'] },
            'docs-http': { url: 'https://docs.example.com/mcp' },
          },
        }),
      )
    ).recognitions;
    // One recognition per `(file, tool, kind)`: the carrier's admission
    // yields the MCP recognition and nothing else.
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: carrierPath,
      tool: 'claude',
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    // One declaration per named map entry, in the parser's resolved order,
    // each carrying the fields the carrier wrote as resolved values (FR-007).
    expect(recognitions[0]!.details.servers.map((server) => server.name)).toEqual([
      'context7',
      'docs-http',
    ]);
    expect(recognitions[0]!.details.servers[0]!.fields).toEqual([
      {
        key: 'command',
        keyKind: 'string',
        value: { kind: 'scalar', scalarKind: 'string', text: 'npx' },
      },
      {
        key: 'args',
        keyKind: 'string',
        value: {
          kind: 'sequence',
          items: [
            { kind: 'scalar', scalarKind: 'string', text: '-y' },
            { kind: 'scalar', scalarKind: 'string', text: '@upstash/context7-mcp' },
          ],
        },
      },
    ]);
  });

  it('derives deterministic provenance from the admitting carrier rule', async () => {
    const recognitions = (
      await recognizeWith('claude', carrierPath, [claudeMcpRule], '{ "mcpServers": {} }')
    ).recognitions;
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'claude.repo.mcp',
      discoveryClass: 'static-candidate',
      matchedPath: carrierPath,
    });
  });

  it('publishes an empty declaration set for a carrier that declares none', async () => {
    // Absent declarations are omitted, not failed: `parsed` with zero rows is
    // what "declares no server" looks like — distinct from the failed state
    // below (FR-028). A root or `mcpServers` value of another shape declares
    // nothing either.
    for (const sourceText of ['{}', '{ "mcpServers": 3 }', '{ "mcpServers": [] }', '[]', 'null']) {
      const recognitions = (await recognizeWith('claude', carrierPath, [claudeMcpRule], sourceText))
        .recognitions;
      expect(recognitions[0], sourceText).toMatchObject({
        parseStatus: 'parsed',
        details: { kind: 'MCP', servers: [] },
      });
    }
  });

  it('omits a malformed declaration whole while keeping the ordinary ones', async () => {
    // Atomic omission: an `mcpServers` entry that is not an object is no
    // declaration, and dropping it must not take the well-formed neighbors
    // with it — or publish any partial rendering of the dropped one.
    const recognitions = (
      await recognizeWith(
        'claude',
        carrierPath,
        [claudeMcpRule],
        JSON.stringify({
          mcpServers: { broken: 'oops', kept: { command: 'npx' }, alsoBroken: null },
        }),
      )
    ).recognitions;
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.parseStatus).toBe('parsed');
    expect(recognitions[0]!.details.servers.map((server) => server.name)).toEqual(['kept']);
  });

  it('fails the whole recognition on a document strict JSON cannot parse', async () => {
    // All-or-nothing (FR-028): nothing parsed is published — no partial
    // declaration list — while the carrier stays an admitted candidate whose
    // diagnostic the scan attaches. Strict JSON, so a comment or a trailing
    // comma fails the document exactly as the vendor's own reader would.
    for (const sourceText of [
      '{ "mcpServers": { broken\n',
      '{ "mcpServers": {}, } ',
      '// comment\n{}',
    ]) {
      const recognitions = (await recognizeWith('claude', carrierPath, [claudeMcpRule], sourceText))
        .recognitions;
      expect(recognitions[0]!.parseStatus, sourceText).toBe('failed');
      expect(recognitions[0]!.details).toEqual({ kind: 'MCP', servers: [] });
      expect(recognitions[0]!.diagnosticIds).toEqual([]);
    }
  });

  it('keeps declared secrets and environment references literal and unresolved', async () => {
    // The values are the file's own resolved literals: nothing looks up the
    // process environment, so no process value can reach the record (FR-026),
    // and a relative command stays the literal the file wrote — its
    // resolution base is not established by current official pages, and this
    // product records no base and computes no path (FR-009).
    const recognitions = (
      await recognizeWith(
        'claude',
        carrierPath,
        [claudeMcpRule],
        JSON.stringify({
          mcpServers: {
            ctx: { command: './scripts/run.sh', env: { API_KEY: '$HOME/${TOKEN}' } },
          },
        }),
      )
    ).recognitions;
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.details.servers[0]).toEqual({
      name: 'ctx',
      fields: [
        {
          key: 'command',
          keyKind: 'string',
          value: { kind: 'scalar', scalarKind: 'string', text: './scripts/run.sh' },
        },
        {
          key: 'env',
          keyKind: 'string',
          value: {
            kind: 'mapping',
            entries: [
              {
                key: 'API_KEY',
                keyKind: 'string',
                value: { kind: 'scalar', scalarKind: 'string', text: '$HOME/${TOKEN}' },
              },
            ],
          },
        },
      ],
    });
    expect(JSON.stringify(recognitions[0])).not.toContain(process.env['HOME'] ?? '\0unset');
  });

  it('runs no census for an MCP carrier and produces nothing for another tool', async () => {
    const { companions, recognitions } = await recognizeWith('claude', carrierPath, [
      claudeMcpRule,
    ]);
    expect(companions).toEqual([]);
    // An unparseable empty-string carrier still has its one failed
    // recognition; the point here is the census and the tool gate.
    expect(recognitions).toHaveLength(1);
    const other = await recognizeWith('codex', carrierPath, [claudeMcpRule]);
    expect(other.recognitions).toEqual([]);
  });
});

describe('Copilot CLI MCP recognition (T336)', () => {
  it('attaches one copilot/MCP recognition with rows per declaration and CLI provenance', async () => {
    // The CLI carrier is the same strict-JSON `mcpServers` form Claude's
    // carrier reads — the shared semantics are pinned by the Claude suite
    // above through the one JSON document seam — so what belongs here is the
    // Copilot rule's own classification and provenance.
    const recognitions = (
      await recognizeWith(
        'copilot',
        '.github/mcp.json',
        [copilotMcpRule],
        JSON.stringify({
          mcpServers: { 'api-db': { url: 'https://db.example.com/mcp' }, broken: 'x' },
        }),
      )
    ).recognitions;
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: '.github/mcp.json',
      tool: 'copilot',
      parseStatus: 'parsed',
    });
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    // The non-object entry is omitted whole; the kept declaration carries the
    // fields the file wrote as resolved values (FR-007).
    expect(recognitions[0]!.details.servers).toEqual([
      {
        name: 'api-db',
        fields: [
          {
            key: 'url',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'https://db.example.com/mcp' },
          },
        ],
      },
    ]);
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'copilot.repo.mcp',
      discoveryClass: 'static-candidate',
    });
    expect(recognitions[0]!.provenances[0]!.recognizingSurfaces).toEqual(['copilot-cli']);
  });

  it('fails the whole recognition on a document strict JSON cannot parse', async () => {
    const recognitions = (
      await recognizeWith('copilot', '.github/mcp.json', [copilotMcpRule], '{ "mcpServers": {')
    ).recognitions;
    expect(recognitions[0]).toMatchObject({
      parseStatus: 'failed',
      details: { kind: 'MCP', servers: [] },
    });
  });

  it('recognizes the shared root carrier once per product, each by its own reading', async () => {
    // The root `.mcp.json` is one physical file two products admit: Claude's
    // exact project rule and the CLI's root-exact workspace rule. One
    // candidate, one recognition per `(file, tool, kind)`, each carrying its
    // own product's admission — and each tool's own reading, because the two
    // vendors' schemas differ (data-model.md § ToolRecognition). On the
    // wrapper form both readings agree.
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        sourceText: JSON.stringify({ mcpServers: { shared: { command: 'npx' } } }),
        admissions: [
          { compiled: claudeMcpRule, origin: { planIndex: 0, selectorIndex: 0 } },
          { compiled: copilotMcpRule, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
      },
      ['claude', 'copilot'],
    );
    expect(recognitions.map((recognition) => [recognition.tool, recognition.details.kind])).toEqual(
      [
        ['claude', 'MCP'],
        ['copilot', 'MCP'],
      ],
    );
    for (const recognition of recognitions) {
      if (recognition.details.kind !== 'MCP') {
        throw new Error('expected MCP recognitions');
      }
      expect(recognition.details.servers.map((server) => server.name)).toEqual(['shared']);
      expect(recognition.provenances).toHaveLength(1);
    }
    expect(recognitions[0]!.provenances[0]!.ruleId).toBe('claude.repo.mcp');
    expect(recognitions[1]!.provenances[0]!.ruleId).toBe('copilot.repo.mcp');
  });

  it('reads the bare top-level schema as the CLI alone documents it (T341)', async () => {
    // The CLI accepts a project-level file whose top-level keys are the
    // server names themselves; Claude documents only the `mcpServers`
    // wrapper. One shared bare-format root carrier therefore declares
    // servers to Copilot and none to Claude — each tool's recognition is its
    // own vendor's reading.
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        sourceText: JSON.stringify({ playwright: { command: 'npx' }, note: 'not a mapping' }),
        admissions: [
          { compiled: claudeMcpRule, origin: { planIndex: 0, selectorIndex: 0 } },
          { compiled: copilotMcpRule, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
      },
      ['claude', 'copilot'],
    );
    const byTool = new Map(recognitions.map((recognition) => [recognition.tool, recognition]));
    const claude = byTool.get('claude');
    const copilot = byTool.get('copilot');
    if (claude?.details.kind !== 'MCP' || copilot?.details.kind !== 'MCP') {
      throw new Error('expected MCP recognitions for both tools');
    }
    expect(claude.details.servers).toEqual([]);
    expect(copilot.details.servers.map((server) => server.name)).toEqual(['playwright']);
    // A declared `mcpServers` key is the wrapper form for the CLI too: it is
    // never read as a bare server of that name, and a non-mapping wrapper
    // declares none.
    const wrapperAsScalar = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        sourceText: JSON.stringify({ mcpServers: 'not a mapping', other: { command: 'x' } }),
        admissions: [{ compiled: copilotMcpRule, origin: { planIndex: 0, selectorIndex: 0 } }],
      },
      ['copilot'],
    );
    const [only] = wrapperAsScalar.recognitions;
    if (only?.details.kind !== 'MCP') {
      throw new Error('expected the Copilot MCP recognition');
    }
    expect(only.details.servers).toEqual([]);
  });
});

describe('Copilot VS Code MCP recognition (T356, T364)', () => {
  it('reads the documented JSONC servers schema, comments and all, by the keys written', async () => {
    // The editor configuration format: comments and a trailing comma are the
    // format's own syntax, the non-mapping entry declares no server, and the
    // `inputs` and `sandbox` sections beside `servers` declare nothing. The
    // kept declaration carries the fields the file wrote as resolved values
    // (FR-007, FR-026).
    const recognitions = (
      await recognizeWith(
        'copilot',
        '.vscode/mcp.json',
        [copilotVscodeMcpRule],
        `{
  // Shared through source control.
  "servers": {
    "docs": { "type": "http", "url": "https://docs.example.com/mcp" },
    "broken": "not an object",
  },
  "inputs": [{ "id": "api-key" }],
  "sandbox": { "network": {} }
}`,
      )
    ).recognitions;
    expect(recognitions).toHaveLength(1);
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.details.servers).toEqual([
      {
        name: 'docs',
        fields: [
          {
            key: 'type',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'http' },
          },
          {
            key: 'url',
            keyKind: 'string',
            value: { kind: 'scalar', scalarKind: 'string', text: 'https://docs.example.com/mcp' },
          },
        ],
      },
    ]);
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'copilot.repo.mcp.vscode',
      discoveryClass: 'static-candidate',
    });
    expect(recognitions[0]!.provenances[0]!.recognizingSurfaces).toEqual(['copilot-vscode']);
  });

  it('reads no bare form: a document without the servers wrapper declares none', async () => {
    // The guide documents the wrapper alone, so top-level mapping keys are
    // not server names here — unlike the CLI schema — and a non-mapping
    // `servers` declares none rather than failing.
    for (const text of [
      JSON.stringify({ playwright: { command: 'npx' } }),
      JSON.stringify({ servers: 'not a mapping' }),
    ]) {
      const recognitions = (
        await recognizeWith('copilot', '.vscode/mcp.json', [copilotVscodeMcpRule], text)
      ).recognitions;
      expect(recognitions[0]).toMatchObject({
        parseStatus: 'parsed',
        details: { kind: 'MCP', servers: [] },
      });
    }
  });

  it('fails the whole recognition on a document JSONC cannot parse', async () => {
    const recognitions = (
      await recognizeWith('copilot', '.vscode/mcp.json', [copilotVscodeMcpRule], '{ "servers": {')
    ).recognitions;
    expect(recognitions[0]).toMatchObject({
      parseStatus: 'failed',
      details: { kind: 'MCP', servers: [] },
    });
  });

  it('merges the root provenances into one recognition read by the CLI alone (T362)', async () => {
    // The root `.mcp.json` under both Copilot admissions: one recognition
    // with two provenances — the surfaces union — whose declarations are the
    // CLI reading's. The bare form proves it: a VS Code extractor does not
    // exist for the root file, so the bare names could only have come from
    // the CLI's own documented schema.
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        sourceText: JSON.stringify({ playwright: { command: 'npx' } }),
        admissions: [
          { compiled: copilotMcpRule, origin: { planIndex: 0, selectorIndex: 0 } },
          { compiled: copilotVscodeRootMcpRule, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
      },
      ['copilot'],
    );
    expect(recognitions).toHaveLength(1);
    if (recognitions[0]!.details.kind !== 'MCP') {
      throw new Error('expected an MCP recognition');
    }
    expect(recognitions[0]!.details.servers.map((server) => server.name)).toEqual(['playwright']);
    expect(recognitions[0]!.provenances.map((provenance) => provenance.ruleId)).toEqual([
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode-root',
    ]);
  });
});

describe('the priority recognition matrix (T391)', () => {
  it('recognizes the three-admission shared root once per tool, by each schema', async () => {
    // One physical root `.mcp.json` under every admission the shipped
    // catalog gives it: Claude's project rule, the Copilot CLI rule, and the
    // VS Code 1.118+ provenance. Exactly two recognitions exist — one per
    // `(file, tool, kind)` — the Copilot one carrying both admissions as its
    // provenances in deterministic order, and each tool's declarations are
    // its own documented reading of the one text: the wrapper form reads
    // identically for both here, while the schema distinction is pinned by
    // the bare-form cases above (T341, T362).
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.mcp.json',
        absolutePath: join(root, '.mcp.json'),
        sourceRoot: root,
        sourceText: JSON.stringify({ mcpServers: { shared: { command: 'npx' } } }),
        admissions: [
          { compiled: claudeMcpRule, origin: { planIndex: 0, selectorIndex: 0 } },
          { compiled: copilotMcpRule, origin: { planIndex: 1, selectorIndex: 0 } },
          { compiled: copilotVscodeRootMcpRule, origin: { planIndex: 2, selectorIndex: 0 } },
        ],
      },
      ['claude', 'copilot'],
    );
    expect(recognitions.map((recognition) => [recognition.tool, recognition.details.kind])).toEqual(
      [
        ['claude', 'MCP'],
        ['copilot', 'MCP'],
      ],
    );
    const [claude, copilot] = recognitions;
    if (claude?.details.kind !== 'MCP' || copilot?.details.kind !== 'MCP') {
      throw new Error('expected MCP recognitions for both tools');
    }
    expect(claude.details.servers.map((server) => server.name)).toEqual(['shared']);
    expect(claude.provenances.map((provenance) => provenance.ruleId)).toEqual(['claude.repo.mcp']);
    expect(copilot.details.servers.map((server) => server.name)).toEqual(['shared']);
    expect(copilot.provenances.map((provenance) => provenance.ruleId)).toEqual([
      'copilot.repo.mcp',
      'copilot.repo.mcp.vscode-root',
    ]);
    // No synthetic file and no third record: the declarations live on the
    // carrier's own path, one recognition per tool.
    for (const recognition of recognitions) {
      expect(recognition.sourceRelativePath).toBe('.mcp.json');
    }
  });
});

describe('MCP recognitions come from explicit carriers alone (T325)', () => {
  const skillPath = '.claude/skills/deploy/SKILL.md';
  const mcpSpellingSource = [
    '---',
    'name: deploy',
    'mcpServers:',
    '  context7:',
    '    command: npx',
    '---',
    '',
    '# Deploy',
    '',
  ].join('\n');

  it('attaches no MCP recognition to a skill whose frontmatter spells mcpServers', async () => {
    // Only explicit MCP configuration joins the MCP surfaces: a file of any other kind that spells MCP-looking
    // configuration holds its own kind's recognition alone, and its
    // declarations are visible in that file's own detail as the frontmatter
    // it wrote. No contained-owner machinery exists — an agent file's
    // `mcp-servers` will be the agent's own declaration once an agents
    // inventory ships, never an MCP row.
    for (const sourceText of [
      mcpSpellingSource,
      '---\nname: deploy\n---\n\n# Deploy\n',
      '---\nname: deploy\nmcpServers: enabled\n---\n',
    ]) {
      const recognitions = (await recognizeWith('claude', skillPath, [claudeSkillRule], sourceText))
        .recognitions;
      expect(
        recognitions.map((recognition) => recognition.details.kind),
        sourceText,
      ).toEqual(['skill']);
    }
  });

  it('keeps the gate per tool: a Copilot admission of the same file contains nothing either', async () => {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: skillPath,
        absolutePath: join(root, skillPath),
        sourceRoot: root,
        sourceText: mcpSpellingSource,
        admissions: [
          { compiled: claudeSkillRule, origin: { planIndex: 0, selectorIndex: 0 } },
          { compiled: copilotSkillRule, origin: { planIndex: 1, selectorIndex: 0 } },
        ],
      },
      ['claude', 'copilot'],
    );
    expect(recognitions.map((recognition) => [recognition.tool, recognition.details.kind])).toEqual(
      [
        ['claude', 'skill'],
        ['copilot', 'skill'],
      ],
    );
  });

  it('creates no recognition for an unadmitted file however many declarations it carries', async () => {
    // A settings file, plugin manifest, or agent file that no rule admits
    // produces nothing at all — and when such a kind's own inventory phase
    // admits it, its configuration stays that kind's detail content rather
    // than becoming MCP rows.
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: '.claude/settings.json',
        absolutePath: join(root, '.claude/settings.json'),
        sourceRoot: root,
        sourceText: '{ "mcpServers": { "settings-server": { "command": "noop" } } }',
        admissions: [],
      },
      ['claude'],
    );
    expect(recognitions).toEqual([]);
  });
});

describe('the derived fallback recognition (T1086)', () => {
  it('recognizes a derived fallback admission as codex instructions with derived provenance', async () => {
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath: 'TEAM_GUIDE.md',
        absolutePath: join(root, 'TEAM_GUIDE.md'),
        sourceRoot: root,
        sourceText: '# configured fallback\n',
        admissions: [
          {
            compiled: CODEX_DERIVED_FALLBACK_RULE,
            origin: { planIndex: 3, selectorIndex: 0 },
          },
        ],
      },
      ['codex'],
    );
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: 'TEAM_GUIDE.md',
      tool: 'codex',
      // A derived admission's recognition is the ordinary instructions
      // recognition: the same one parse feeds its presentation (T222).
      details: { kind: 'instructions', bodyText: '# configured fallback\n' },
      parseStatus: 'parsed',
    });
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'codex.derived.fallback-basename',
      discoveryClass: 'bounded-derived-candidate',
      matchedPath: 'TEAM_GUIDE.md',
    });
  });
});

describe('Claude instruction recognition (T228)', () => {
  it('attaches exactly one claude/instructions recognition to an admitted CLAUDE.md', async () => {
    const recognitions = (await recognizeWith('claude', 'CLAUDE.md', [claudeInstructionsRule]))
      .recognitions;
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      sourceRelativePath: 'CLAUDE.md',
      tool: 'claude',
      // The payload is the file's presentation and nothing more: an
      // instructions row's unit is the file itself (data-model.md § Inventory
      // unit), so no declared name or other identity exists to extract, and
      // no per-file classification says which documented layer the file
      // belongs to — that is a relation to a working directory this product
      // does not observe (FR-009).
      details: { kind: 'instructions' },
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    expect(Object.keys(recognitions[0]!.details)).toEqual([
      'kind',
      'frontmatter',
      'bodyText',
      'applicabilityRange',
    ]);
  });

  it('recognizes a nested file exactly as it recognizes the root one', async () => {
    // Whether a file is the launch directory's, an ancestor's, or a lazily
    // discovered descendant's is a relation to the vendor's runtime working
    // directory. Nothing distinguishes the two recognitions but the path the
    // walk admitted.
    const nested = (
      await recognizeWith('claude', 'packages/api/.claude/CLAUDE.md', [claudeInstructionsRule])
    ).recognitions;
    expect(nested).toHaveLength(1);
    // `.claude` is the rule's own container, so the nested directory-form file
    // governs what a `packages/api/CLAUDE.md` governs rather than a
    // `.claude`-shaped range of its own (data-model.md § Inventory unit).
    expect(nested[0]!.details).toEqual({
      kind: 'instructions',
      frontmatter: [],
      bodyText: '',
      applicabilityRange: 'packages/api/**',
    });
    expect(nested[0]!.provenances).toMatchObject([
      { ruleId: 'claude.repo.instructions', matchedPath: 'packages/api/.claude/CLAUDE.md' },
    ]);
  });

  it('derives deterministic provenance from the admitting instruction rule', async () => {
    const recognitions = (
      await recognizeWith('claude', 'CLAUDE.local.md', [claudeInstructionsRule])
    ).recognitions;
    expect(recognitions[0]!.provenances).toHaveLength(1);
    expect(recognitions[0]!.provenances[0]).toMatchObject({
      ruleId: 'claude.repo.instructions',
      matchedPath: 'CLAUDE.local.md',
    });
  });

  it('runs no census for an instruction candidate', async () => {
    // A skill is a directory; an instruction file is just a file
    // (contracts/inspection-path-allowlist.md § Bounded companion census).
    const { companions } = await recognizeWith('claude', 'CLAUDE.md', [claudeInstructionsRule]);
    expect(companions).toEqual([]);
  });

  it('produces no Claude recognition for a filename-only AGENTS.md', async () => {
    // Claude Code reads `CLAUDE.md`, not `AGENTS.md`
    // (anthropic.claude-code.memory.locations-load § AGENTS.md): dispatching
    // the Codex admission to Claude must yield nothing rather than a
    // recognition invented from the filename.
    const { recognitions } = await recognizeWith('claude', 'AGENTS.md', [codexInstructionsRule]);
    expect(recognitions).toEqual([]);
  });
});

describe('surface-qualified Copilot instruction recognition (T247, T257)', () => {
  /** The compiled unit for one shipped Copilot rule, by its own identifier. */
  function copilotRule(ruleId: string): CompiledStaticCandidateRule {
    return COPILOT_REPOSITORY_RULES.find((compiled) => compiled.rule.ruleId === ruleId)!;
  }

  /** Recognizes one candidate for Copilot alone, from the rules that admitted it. */
  async function recognizeCopilot(matchedPath: string, ruleIds: readonly string[]) {
    mkdirSync(dirname(join(root, matchedPath)), { recursive: true });
    const { recognitions } = await recognizeCandidateForVendors(
      {
        matchedPath,
        absolutePath: join(root, matchedPath),
        sourceRoot: root,
        sourceText: '',
        admissions: ruleIds.map((ruleId, index) => ({
          compiled: copilotRule(ruleId),
          origin: { planIndex: index, selectorIndex: 0 },
        })),
      },
      ['copilot'],
    );
    expect(recognitions).toHaveLength(1);
    return recognitions[0]!;
  }

  it('unions the surfaces of every rule that admitted the file', async () => {
    // The root repository-wide file is admitted twice — the root-exact rule
    // and the CLI-context rule — so its one recognition names all three
    // surfaces. That union is what the row publishes, and it is derived from
    // the admissions rather than stored, so it cannot disagree with the rules
    // (contracts/vendors/github-copilot.md § Surface boundary).
    const rootFile = await recognizeCopilot('.github/copilot-instructions.md', [
      'copilot.repo.instructions.repository',
      'copilot.repo.instructions.repository-cli-context',
    ]);
    expect([
      ...new Set(rootFile.provenances.flatMap((provenance) => provenance.recognizingSurfaces)),
    ]).toEqual(['copilot-vscode', 'copilot-cloud', 'copilot-cli']);
  });

  it('names the CLI alone for a file only the CLI-context rule admitted', async () => {
    // The other half of the split: no editor or hosted surface documents
    // reading this location, so borrowing their provenance would assert a
    // lookup neither performs.
    const nested = await recognizeCopilot('packages/api/.github/copilot-instructions.md', [
      'copilot.repo.instructions.repository-cli-context',
    ]);
    expect(nested.provenances.flatMap((provenance) => provenance.recognizingSurfaces)).toEqual([
      'copilot-cli',
    ]);
  });

  it('names the two surfaces that document GEMINI.md and not the editor', async () => {
    // VS Code documents no `GEMINI.md` at all, so the editor is absent rather
    // than assumed from the other root alternative beside it.
    const gemini = await recognizeCopilot('GEMINI.md', ['copilot.repo.instructions.gemini-root']);
    expect(gemini.provenances.flatMap((provenance) => provenance.recognizingSurfaces)).toEqual([
      'copilot-cli',
      'copilot-cloud',
    ]);
  });

  it('recognizes each admitted file as the instructions kind with its own range', async () => {
    // A recognition carries what its inventory row is grouped by, derived from
    // the path by the rule that admitted it (data-model.md § Inventory unit).
    const cases: readonly (readonly [string, string, string | null])[] = [
      ['.github/copilot-instructions.md', 'copilot.repo.instructions.repository', '**'],
      // A path-specific file's range is its own declaration or nothing; this
      // one declares nothing, so it has no range and lists under the row that
      // says so (T265).
      [
        'packages/api/.github/instructions/api.instructions.md',
        'copilot.repo.instructions.path-cli-context',
        null,
      ],
      ['packages/api/AGENTS.md', 'copilot.repo.instructions.agents', 'packages/api/**'],
      ['CLAUDE.md', 'copilot.repo.instructions.claude-root', '**'],
    ];
    for (const [matchedPath, ruleId, range] of cases) {
      const recognition = await recognizeCopilot(matchedPath, [ruleId]);
      expect(recognition.tool, matchedPath).toBe('copilot');
      if (recognition.details.kind !== 'instructions') {
        throw new Error(`expected an instructions recognition for ${matchedPath}`);
      }
      expect(recognition.details.applicabilityRange, matchedPath).toBe(range);
    }
  });
});
