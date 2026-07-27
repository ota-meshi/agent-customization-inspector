// T054: Codex recognition from the admitting rule alone — tool, the `skill`
// kind, path provenance with its record-by-record evidence, and the absence of
// any recognition the shipped registry does not authorize (FR-004, FR-005,
// QR-005).
//
// The recognizer reads exactly one thing out of the bytes: the declared name
// a skill authors in its own frontmatter (T1066, FR-007). The "no source
// exposure" assertions below are what keep that narrow: everything else an
// authored file contains stays out of a recognition and is reached only
// through the FR-027 acknowledgement gate.
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { recognizeCodexCandidate } from '../../../src/server/inspection/recognizers/codex';
import { CODEX_REPOSITORY_RULES } from '../../../src/server/inspection/rules/codex';
import type { CompiledInspectionRule } from '../../../src/server/inspection/rules/registry';

const codexSkillRule = CODEX_REPOSITORY_RULES[0]!;

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

async function recognize(
  matchedPath: string,
  rules: readonly CompiledInspectionRule[] = [codexSkillRule],
  sourceText: string | null = null,
) {
  // The census enumerates the candidate's own directory and propagates a
  // failure rather than reporting an empty one, so every path a case names has
  // to exist — as it does in a real scan, where the traversal found it.
  mkdirSync(dirname(join(root, matchedPath)), { recursive: true });
  return recognizeCodexCandidate({
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
}

describe('Codex skill recognition', () => {
  it('attaches exactly one codex/skill recognition to the admitted file', async () => {
    const recognitions = await recognize('.agents/skills/greet/SKILL.md');
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]).toMatchObject({
      fileId: 'file-1',
      tool: 'codex',
      details: { kind: 'skill' },
      // No allowlisted extractor applies yet, so nothing was attempted. This
      // is not a claim that parsing succeeded, and it keeps the file's
      // parse summary at `not-applicable`.
      parseStatus: 'not-attempted',
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
    // competing recognitions (data-model.md § ToolRecognition).
    const second: CompiledInspectionRule = { ...codexSkillRule };
    const recognitions = await recognize('.agents/skills/greet/SKILL.md', [codexSkillRule, second]);
    expect(recognitions).toHaveLength(1);
    expect(recognitions[0]!.provenances).toHaveLength(2);
  });

  it('produces nothing for an admission owned by another tool', async () => {
    // The branch under test is decided by `tool` alone, and `RuleId` is the
    // closed catalog of shipped rules — no Claude rule exists yet — so the
    // stand-in keeps a real rule ID and changes only the owning product.
    const claudeOwnedAdmission: CompiledInspectionRule = { ...codexSkillRule, tool: 'claude' };
    expect(await recognize('.claude/skills/greet/SKILL.md', [claudeOwnedAdmission])).toEqual([]);
  });

  it('lifts only the declared name out of the authored source', async () => {
    const [recognition] = await recognize(
      '.agents/skills/secretive/SKILL.md',
      [codexSkillRule],
      '---\nname: secretive\n---\n\ntoken: ghp_EXAMPLE000000000000000000000000000000\n',
    );
    expect(recognition!.details.kind === 'skill' && recognition!.details.declaredName).toBe('secretive');
    // Everything else the file contains stays out: the body, the credential in
    // it, and any other frontmatter value.
    const serialized = JSON.stringify(recognition);
    expect(serialized).not.toMatch(/sourceText|authoredLiteral/u);
    expect(serialized).not.toContain('ghp_');
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
    expect(recognition!.details.kind === 'skill' && recognition!.details.declaredName).toBe('say-hello');
  });

  it('leaves the declared name absent rather than guessing one', async () => {
    // Absent, not empty, and never the directory segment: "this file declares
    // no name" is a different fact from "it declares an empty one".
    for (const source of [null, '# no frontmatter\n', '---\ndescription: x\n---\n']) {
      const [recognition] = await recognize('.agents/skills/greet/SKILL.md', [codexSkillRule], source);
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
