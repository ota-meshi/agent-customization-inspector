// T054/T127: Codex and Claude recognition from the admitting rule alone —
// tool, the `skill` kind, path provenance with its record-by-record evidence,
// and the absence of any recognition the shipped registry does not authorize
// (FR-004, FR-005, QR-005).
//
// What a recognizer reads out of the bytes is fixed by its presentation
// allowlist, and the "no source exposure" assertions below are what keep it
// there: an authored value outside the allowlisted fields stays in the complete
// `sourceText`, which only the detail route serves. The Codex `skill` extraction
// itself is covered by `codex-metadata.test.ts`; these cases are about
// recognition from the admitting rule alone, so most of them pass no source at
// all.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { recognizeClaudeCandidate } from '../../../src/server/inspection/recognizers/claude';
import { recognizeCodexCandidate } from '../../../src/server/inspection/recognizers/codex';
import { CLAUDE_REPOSITORY_RULES } from '../../../src/server/inspection/rules/claude';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import type { CompiledInspectionRule } from '../../../src/server/inspection/rules/registry';

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
  recognizer: typeof recognizeCodexCandidate,
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
  const { recognitions } = await recognizer({
    fileId: 'file-1',
    matchedPath,
    absolutePath: join(root, matchedPath),
    sourceRoot: root,
    sourceText,
    admissions: rules.map((compiled, index) => ({
      compiled,
      origin: { planIndex: index, selectorIndex: 0 },
    })),
  });
  return recognitions;
}

async function recognize(
  matchedPath: string,
  rules: readonly CompiledInspectionRule[] = [codexSkillRule],
  sourceText = '',
) {
  return recognizeWith(recognizeCodexCandidate, matchedPath, rules, sourceText);
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
      scope: {
        kind: 'matching-path',
        path: 'packages/api/.agents/skills/deploy/SKILL.md',
        selectorIndex: 0,
      },
    });
  });

  it('carries one sorted evidence record per referenced subject, unreduced', async () => {
    const [recognition] = await recognize('.agents/skills/greet/SKILL.md');
    expect(recognition!.provenances[0]!.evidenceAssessments).toEqual([
      {
        subjectKind: 'behavior',
        subjectId: 'codex.behavior.repo.skills',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'rule',
        subjectId: 'codex.repo.skill',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'strategy',
        subjectId: 'codex.skills.discovery',
        // Deliberately not `documented`: the cited section states that
        // same-name skills are not merged and both stay available, and
        // establishes no precedence among the four scopes, so the strategy
        // claims no selection order (corrected 2026-07-25). Keeping a
        // per-subject status is the point of this assertion — an aggregate
        // would hide that one referenced subject is weaker than its siblings.
        documentationStatus: 'partially-documented',
        lifecycleQualifiers: [],
      },
    ]);
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
    // The branch under test is decided by `tool` alone: the Codex recognizer
    // ignores a Claude-owned admission, and the Claude recognizer ignores a
    // Codex-owned one, so neither can fabricate the other product's
    // recognition from a shared candidate.
    expect(await recognize('.claude/skills/greet/SKILL.md', [claudeSkillRule])).toEqual([]);
    expect(
      await recognizeWith(recognizeClaudeCandidate, '.agents/skills/greet/SKILL.md', [
        codexSkillRule,
      ]),
    ).toEqual([]);
  });

  it('lifts the declared name and only allowlisted frontmatter fields', async () => {
    const [recognition] = await recognize(
      '.agents/skills/secretive/SKILL.md',
      [codexSkillRule],
      '---\nname: secretive\napi_key: ghp_EXAMPLE000000000000000000000000000000\n---\n\nBody.\n',
    );
    expect(recognition!.details.kind === 'skill' && recognition!.details.declaredName).toBe(
      'secretive',
    );
    // The presentation allowlist names two Codex skill fields, so an authored
    // key outside it produces no entry however credential-shaped it is: it
    // stays visible only in the complete `sourceText` the detail route serves.
    expect(recognition!.declaredMetadata).toEqual([
      { fieldId: 'codex.skill.name', value: 'secretive' },
    ]);
    const serialized = JSON.stringify(recognition);
    expect(serialized).not.toContain('ghp_');
    expect(serialized).not.toContain('sourceText');
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
    const [recognition] = await recognize('.agents/skills/greet/SKILL.md');
    expect(recognition!.details.kind === 'skill' && recognition!.details.companionFiles).toEqual([
      '.agents/skills/greet/reference.md',
      '.agents/skills/greet/scripts/run.sh',
    ]);
  });

  it('lists nothing for a skill whose directory holds only its own file', async () => {
    // Empty, not absent: every recognized skill has been enumerated, because
    // being a directory is what a skill is.
    const [recognition] = await recognize('.agents/skills/solo/SKILL.md');
    expect(recognition!.details.kind === 'skill' && recognition!.details.companionFiles).toEqual(
      [],
    );
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
    return recognizeWith(recognizeClaudeCandidate, matchedPath, rules, sourceText);
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
      // so the list milestone extracts exactly it — from the file, never from
      // the directory segment.
      details: { kind: 'skill', declaredName: 'authored-name' },
      parseStatus: 'parsed',
      declaredMetadata: [{ fieldId: 'claude.skill.name', value: 'authored-name' }],
      diagnosticIds: [],
    });
  });

  it('lifts only the name until the detail phase widens the allowlist slice', async () => {
    // `description` is an allowlist member the detail phase (T148) owns, and
    // a credential-shaped key is no member at all: neither produces an entry
    // here, and both stay visible only in the `sourceText` the detail route
    // serves.
    const [recognition] = await recognizeClaude(
      '.claude/skills/greet/SKILL.md',
      [claudeSkillRule],
      '---\nname: greet\ndescription: says hello\napi_key: ghp_EXAMPLE000000000000000000000000000000\n---\n',
    );
    expect(recognition!.declaredMetadata).toEqual([
      { fieldId: 'claude.skill.name', value: 'greet' },
    ]);
    const serialized = JSON.stringify(recognition);
    expect(serialized).not.toContain('ghp_');
    expect(serialized).not.toContain('says hello');
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
      scope: {
        kind: 'matching-path',
        path: 'packages/api/.claude/skills/deploy/SKILL.md',
        selectorIndex: 0,
      },
    });
  });

  it('carries one sorted evidence record per referenced Claude subject, unreduced', async () => {
    const [recognition] = await recognizeClaude('.claude/skills/greet/SKILL.md');
    expect(recognition!.provenances[0]!.evidenceAssessments).toEqual([
      {
        subjectKind: 'behavior',
        subjectId: 'claude.behavior.repo.skills',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'rule',
        subjectId: 'claude.repo.skill',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
      {
        subjectKind: 'strategy',
        subjectId: 'claude.skills.selection',
        documentationStatus: 'documented',
        lifecycleQualifiers: [],
      },
    ]);
  });

  it('keeps ancestor and lazy-discovery uncertainty conditional in the provenance', async () => {
    // The admission never upgrades `present` to `effective`: every runtime
    // input of the documented chain — the launch directory and the lazily
    // worked paths included — is recorded as an unknown condition.
    const [recognition] = await recognizeClaude('.claude/skills/greet/SKILL.md');
    const applicability = recognition!.provenances[0]!.applicability;
    const keys = applicability.conditions.map((condition) => condition.key);
    expect(keys).toContain('runtime-cwd');
    expect(keys).toContain('worked-path');
    expect(applicability.summary).toBe('conditional');
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
    const [recognition] = await recognizeClaude('.claude/skills/stocked/SKILL.md');
    expect(recognition!.details.kind === 'skill' && recognition!.details.companionFiles).toEqual([
      '.claude/skills/stocked/reference.md',
      '.claude/skills/stocked/scripts/run.sh',
    ]);
  });
});
