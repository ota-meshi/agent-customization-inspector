// T1081: per-tool same-name skill collisions — the clash each tool's
// documented rule answers and which of a row's definitions are evidence of
// it, reached through the closed per-tool table so no caller branches on tool
// literals (FR-007, data-model.md § Inventory unit, § Skill presentation).
// What a skill is named is the admitting rule's answer instead, covered by
// the recognizer suites.
import { describe, expect, it } from 'vitest';

import { SKILL_COLLISION_POLICY } from '../../../src/shared/skill-collision';

describe('the row-internal clash Codex and Copilot share', () => {
  it('faces a collision exactly when one name has two definitions in the row', () => {
    const gate = SKILL_COLLISION_POLICY.copilot.collisionGate([
      '.github/skills/a/SKILL.md',
      '.claude/skills/b/SKILL.md',
    ]);
    expect(gate(['.github/skills/a/SKILL.md', '.claude/skills/b/SKILL.md'])).toBe(true);
    expect(gate(['.github/skills/a/SKILL.md'])).toBe(false);
  });

  it('ignores paths of the view that are not the row asked about', () => {
    // These tools invoke what the file declares, so no clash follows from two
    // files merely sitting in same-named directories on different rows.
    const gate = SKILL_COLLISION_POLICY.codex.collisionGate([
      '.agents/skills/wave/SKILL.md',
      'apps/.agents/skills/wave/SKILL.md',
    ]);
    expect(gate(['.agents/skills/wave/SKILL.md'])).toBe(false);
  });
});

describe("Claude Code's clash", () => {
  it('spans rows when skill directories clash anywhere in the view', () => {
    // Claude's clash is the unqualified command, and nested prefixing puts
    // its sides on different rows, so the gate is built from every Claude
    // path in the view and asked with one row's paths at a time (FR-007).
    const gate = SKILL_COLLISION_POLICY.claude.collisionGate([
      '.claude/skills/wave/SKILL.md',
      'apps/web/.claude/skills/wave/SKILL.md',
      '.claude/skills/tide/SKILL.md',
    ]);
    expect(gate(['.claude/skills/wave/SKILL.md'])).toBe(true);
    expect(gate(['apps/web/.claude/skills/wave/SKILL.md'])).toBe(true);
    expect(gate(['.claude/skills/tide/SKILL.md'])).toBe(false);
  });

  it('faces no collision when every skill directory in the view is unique', () => {
    const gate = SKILL_COLLISION_POLICY.claude.collisionGate([
      '.claude/skills/foo/SKILL.md',
      '.claude/skills/bar/SKILL.md',
    ]);
    // Two rows sharing only an authored label are two commands with no clash
    // (FR-007), however many definitions a row holds.
    expect(gate(['.claude/skills/foo/SKILL.md', '.claude/skills/bar/SKILL.md'])).toBe(false);
  });
});

describe('collision evidence per vendor policy (FR-007/FR-028)', () => {
  const failed = {
    tool: 'claude',
    sourceRelativePath: '.claude/skills/wave/SKILL.md',
    parseStatus: 'failed',
  } as const;
  const parsed = {
    tool: 'claude',
    sourceRelativePath: 'apps/.claude/skills/wave/SKILL.md',
    parseStatus: 'parsed',
  } as const;

  it('keeps a failed extraction as evidence for the path-derived Claude clash', () => {
    // The unqualified command is the skill directory — the path's own fact —
    // so a broken frontmatter changes nothing about the collision Claude's
    // documented rule answers.
    expect(SKILL_COLLISION_POLICY.claude.collisionEvidencePaths([failed, parsed])).toEqual([
      failed.sourceRelativePath,
      parsed.sourceRelativePath,
    ]);
  });

  it('excludes a failed extraction for the tools that invoke the authored name', () => {
    // Such a tool never resolved the failed file's name, so its row
    // membership is this product's provisional grouping, not evidence.
    const codexFailed = { ...failed, tool: 'codex' } as const;
    const codexParsed = { ...parsed, tool: 'codex' } as const;
    expect(SKILL_COLLISION_POLICY.codex.collisionEvidencePaths([codexFailed, codexParsed])).toEqual(
      [codexParsed.sourceRelativePath],
    );
  });
});
