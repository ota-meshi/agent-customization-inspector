// T1081: per-tool same-name skill collisions — the clash each tool's
// documented rule answers and which of a row's definitions are evidence of
// it, reached through the closed per-tool table so no caller branches on tool
// literals (FR-007, data-model.md § Inventory unit, § Skill presentation).
// What a skill is named is the admitting rule's answer instead, covered by
// the recognizer suites.
import { describe, expect, it } from 'vitest';

import { SKILL_COLLISION_POLICY } from '../../../src/shared/skill-collision';
import type { SameNameCollisionDefinition } from '../../../src/shared/skill-collision';

/** One parsed definition of the repository Source, for the gate cases. */
function definition(
  tool: SameNameCollisionDefinition['tool'],
  sourceRelativePath: string,
  sourceId = 'src-repo',
): SameNameCollisionDefinition {
  return { tool, sourceId, sourceRelativePath, parseStatus: 'parsed' };
}

describe('the row-internal clash Codex and Copilot share', () => {
  it('faces a collision exactly when one name has two definitions in the row', () => {
    const a = definition('copilot', '.github/skills/a/SKILL.md');
    const b = definition('copilot', '.claude/skills/b/SKILL.md');
    const gate = SKILL_COLLISION_POLICY.copilot.collisionGate([a, b]);
    expect(gate([a, b])).toBe(true);
    expect(gate([a])).toBe(false);
  });

  it('ignores definitions of the view that are not the row asked about', () => {
    // These tools invoke what the file declares, so no clash follows from two
    // files merely sitting in same-named directories on different rows.
    const a = definition('codex', '.agents/skills/wave/SKILL.md');
    const b = definition('codex', 'apps/.agents/skills/wave/SKILL.md');
    const gate = SKILL_COLLISION_POLICY.codex.collisionGate([a, b]);
    expect(gate([a])).toBe(false);
  });
});

describe("Claude Code's clash", () => {
  it('spans rows when skill directories clash anywhere in one Source', () => {
    // Claude's clash is the unqualified command, and nested prefixing puts
    // its sides on different rows, so the gate is built from every Claude
    // definition in the view and asked with one row's evidence at a time
    // (FR-007).
    const root = definition('claude', '.claude/skills/wave/SKILL.md');
    const nested = definition('claude', 'apps/web/.claude/skills/wave/SKILL.md');
    const other = definition('claude', '.claude/skills/tide/SKILL.md');
    const gate = SKILL_COLLISION_POLICY.claude.collisionGate([root, nested, other]);
    expect(gate([root])).toBe(true);
    expect(gate([nested])).toBe(true);
    expect(gate([other])).toBe(false);
  });

  it('faces no collision when every skill directory in the view is unique', () => {
    const foo = definition('claude', '.claude/skills/foo/SKILL.md');
    const bar = definition('claude', '.claude/skills/bar/SKILL.md');
    const gate = SKILL_COLLISION_POLICY.claude.collisionGate([foo, bar]);
    // Two rows sharing only an authored label are two commands with no clash
    // (FR-007), however many definitions a row holds.
    expect(gate([foo, bar])).toBe(false);
  });

  it('faces no collision across two Sources holding one directory spelling', () => {
    // The repository's `deploy` and a consented home's `deploy` are two
    // different places' skills: the quoted rule's qualifying prefix is
    // root-relative, so the clash it answers never spans Sources (FR-030).
    const repository = definition('claude', '.claude/skills/deploy/SKILL.md', 'src-repo');
    const home = definition('claude', 'skills/deploy/SKILL.md', 'src-global-claude');
    const gate = SKILL_COLLISION_POLICY.claude.collisionGate([repository, home]);
    expect(gate([repository])).toBe(false);
    expect(gate([home])).toBe(false);
  });
});

describe('collision evidence per vendor policy (FR-007/FR-028)', () => {
  const failed = {
    tool: 'claude',
    sourceId: 'src-repo',
    sourceRelativePath: '.claude/skills/wave/SKILL.md',
    parseStatus: 'failed',
  } as const;
  const parsed = {
    tool: 'claude',
    sourceId: 'src-repo',
    sourceRelativePath: 'apps/.claude/skills/wave/SKILL.md',
    parseStatus: 'parsed',
  } as const;

  it('keeps a failed extraction as evidence for the path-derived Claude clash', () => {
    // The unqualified command is the skill directory — the path's own fact —
    // so a broken frontmatter changes nothing about the collision Claude's
    // documented rule answers.
    expect(SKILL_COLLISION_POLICY.claude.collisionEvidence([failed, parsed])).toEqual([
      failed,
      parsed,
    ]);
  });

  it('excludes a failed extraction for the tools that invoke the authored name', () => {
    // Such a tool never resolved the failed file's name, so its row
    // membership is this product's provisional grouping, not evidence.
    const codexFailed = { ...failed, tool: 'codex' } as const;
    const codexParsed = { ...parsed, tool: 'codex' } as const;
    expect(SKILL_COLLISION_POLICY.codex.collisionEvidence([codexFailed, codexParsed])).toEqual([
      codexParsed,
    ]);
  });
});
