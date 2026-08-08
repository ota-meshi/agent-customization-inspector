// T054/T127: Codex and Claude recognition from the admitting rule alone —
// tool, the `skill` kind, path provenance, and the absence of any recognition
// the shipped registry does not authorize (FR-004, FR-005).
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

import { recognizeCandidateForVendor } from '../../../src/server/inspection/recognizers/candidate';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import type { CompiledInspectionRule } from '../../../src/server/inspection/rules/registry';
import type { SupportedTool } from '../../../src/shared/entities';

const codexSkillRule = CODEX_REPOSITORY_RULES[0]!;
const claudeSkillRule = CLAUDE_REPOSITORY_RULES[0]!;

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
  rules: readonly CompiledInspectionRule[],
  sourceText = '',
) {
  // The census enumerates the candidate's own directory and propagates a
  // failure rather than reporting an empty one, so every path a case names has
  // to exist — as it does in a real scan, where the traversal found it.
  mkdirSync(dirname(join(root, matchedPath)), { recursive: true });
  // These cases are about the recognitions; the census the recognizer also
  // returns has its own suite (`companion-census.test.ts`) and its own
  // publication path (`repository-scan.test.ts`).
  const { recognitions, companions } = await recognizeCandidateForVendor(
    {
      fileId: 'file-1',
      matchedPath,
      absolutePath: join(root, matchedPath),
      sourceRoot: root,
      sourceText,
      admissions: rules.map((compiled, index) => ({
        compiled,
        origin: { planIndex: index, selectorIndex: 0 },
      })),
    },
    tool,
  );
  return { recognitions, companions };
}

async function recognize(
  matchedPath: string,
  rules: readonly CompiledInspectionRule[] = [codexSkillRule],
  sourceText = '',
) {
  return (await recognizeWith('codex', matchedPath, rules, sourceText)).recognitions;
}

/** The census paths the recognizer returned beside its recognitions. */
async function censusOf(
  tool: SupportedTool,
  matchedPath: string,
  rules: readonly CompiledInspectionRule[],
) {
  const { companions } = await recognizeWith(tool, matchedPath, rules);
  return companions.map((companion) => companion.sourceRelativePath);
}

describe('Codex skill recognition', () => {
  it('attaches exactly one codex/skill recognition to the admitted file', async () => {
    const recognitions = await recognize('.agents/skills/greet/SKILL.md');
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      fileId: 'file-1',
      tool: 'codex',
      details: { kind: 'skill' },
      // An empty file parses: the extractor runs and finds no frontmatter, so
      // the recognition is `parsed` with nothing declared. `not-attempted`
      // would be a different claim — that no allowlisted extractor applies to
      // this kind at all.
      parseStatus: 'parsed',
      diagnosticIds: [],
    });
    expect(recognitions[0]!.recognitionId).toMatch(/^[A-Za-z0-9_-]{22}$/u);
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
    rules: readonly CompiledInspectionRule[] = [claudeSkillRule],
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
      fileId: 'file-1',
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
