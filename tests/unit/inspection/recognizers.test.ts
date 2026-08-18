// T054/T127/T155/T207/T228: Codex, Claude, and Copilot recognition from the
// admitting rule alone — tool, the `skill` and `instructions` kinds, path
// provenance, the exact multi-tool recognition matrix, and the absence of any
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
const claudeSkillRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.skill',
)!;
const claudeInstructionsRule = CLAUDE_REPOSITORY_RULES.find(
  (compiled) => compiled.rule.ruleId === 'claude.repo.instructions',
)!;
const copilotSkillRule = COPILOT_REPOSITORY_RULES[0]!;

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
      // The payload is the file's presentation and nothing more: an
      // instructions row's unit is the file itself (data-model.md § Inventory
      // unit), so no declared name or other identity exists to extract — the
      // one frontmatter parse a skill uses feeds the detail's declarations
      // and instructions (T222).
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
