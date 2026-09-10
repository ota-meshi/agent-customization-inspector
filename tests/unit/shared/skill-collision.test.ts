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
    // Two directories sharing only an authored name are two commands to Claude
    // Code, with no clash its rule answers (FR-007), however many definitions
    // the row they share holds.
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

  it('keeps a failed extraction as evidence for the directory-based Claude clash', () => {
    // The clash Claude Code detects is between skill directories — the path's
    // own fact — so a broken frontmatter changes nothing about the collision
    // Claude's documented rule answers.
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

describe("Gemini CLI's clash (specs/002-gemini-cli-support T053)", () => {
  it('is row-internal, like the other products that invoke the authored name', () => {
    // Gemini CLI invokes what each file declares, so two files it invokes by
    // one name are the whole collision and no path elsewhere in the view
    // bears on it — the `.gemini/skills/` file and its `.agents/skills/` alias
    // included (FR-007).
    const own = definition('gemini', '.gemini/skills/deploy/SKILL.md');
    const alias = definition('gemini', '.agents/skills/deploy/SKILL.md');
    const other = definition('gemini', '.gemini/skills/tide/SKILL.md');
    const gate = SKILL_COLLISION_POLICY.gemini.collisionGate([own, alias, other]);
    expect(gate([own, alias])).toBe(true);
    expect(gate([own])).toBe(false);
    expect(gate([other])).toBe(false);
  });

  it('excludes a failed extraction from its evidence', () => {
    // A failed extraction leaves the authored name unknown, so its row
    // membership is this product's provisional grouping rather than a clash
    // Gemini CLI's rule answers (FR-028).
    const failed = {
      ...definition('gemini', '.gemini/skills/deploy/SKILL.md'),
      parseStatus: 'failed',
    } as const;
    const parsed = definition('gemini', '.agents/skills/deploy/SKILL.md');
    expect(SKILL_COLLISION_POLICY.gemini.collisionEvidence([failed, parsed])).toEqual([parsed]);
  });
});
