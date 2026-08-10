// T1081: per-tool skill naming — the row names each tool resolves, the
// invocation names each vendor's documentation gives a file, and the
// collision each tool's same-name rule answers, all reached through the
// closed per-tool table so no caller branches on tool literals (FR-007,
// data-model.md § Inventory unit, § Skill presentation).
import { describe, expect, it } from 'vitest';

import { SKILL_NAMING } from '../../../src/shared/skill-naming';

describe('the authored naming Codex and Copilot share', () => {
  it('keeps a declared name as both the row name and the invocation name', () => {
    expect(SKILL_NAMING.codex.rowName('.agents/skills/greet/SKILL.md', 'hello')).toBe('hello');
    expect(SKILL_NAMING.copilot.invocationName('.github/skills/greet/SKILL.md', 'hello')).toBe(
      'hello',
    );
  });

  it('falls back to the skill directory name for an undeclared or empty one', () => {
    expect(SKILL_NAMING.codex.rowName('.agents/skills/greet/SKILL.md', undefined)).toBe('greet');
    expect(SKILL_NAMING.codex.rowName('.agents/skills/greet/SKILL.md', '')).toBe('greet');
  });

  it('keeps a whitespace-only name, which is declared and non-empty', () => {
    expect(SKILL_NAMING.codex.rowName('.agents/skills/greet/SKILL.md', ' ')).toBe(' ');
  });

  it('faces a collision exactly when one name has two definitions in the row', () => {
    const gate = SKILL_NAMING.copilot.collisionGate([
      '.github/skills/a/SKILL.md',
      '.claude/skills/b/SKILL.md',
    ]);
    expect(gate(['.github/skills/a/SKILL.md', '.claude/skills/b/SKILL.md'])).toBe(true);
    expect(gate(['.github/skills/a/SKILL.md'])).toBe(false);
  });
});

describe("Claude Code's naming", () => {
  it('keeps a root-level row at its authored name', () => {
    expect(SKILL_NAMING.claude.rowName('.claude/skills/deploy/SKILL.md', 'deploy')).toBe('deploy');
  });

  it('prefixes a nested row with the root-relative path of the `.claude` holder', () => {
    // The spec's own example (FR-007): the prefix is the directory holding
    // `.claude`, joined with `/`, then a `:`, then the authored name.
    expect(SKILL_NAMING.claude.rowName('apps/web/.claude/skills/deploy/SKILL.md', 'deploy')).toBe(
      'apps/web:deploy',
    );
    expect(SKILL_NAMING.claude.rowName('apps/.claude/skills/deploy/SKILL.md', 'ship')).toBe(
      'apps:ship',
    );
  });

  it('qualifies the authored row name, not the directory name', () => {
    // The row's last segment is deliberately the authored `name`, where the
    // vendor's command takes the skill directory (FR-007): comparison across
    // tools is what the row exists for.
    expect(SKILL_NAMING.claude.rowName('apps/web/.claude/skills/deploy/SKILL.md', 'deployer')).toBe(
      'apps/web:deployer',
    );
  });

  it('falls back to the skill directory name for an undeclared row name', () => {
    expect(SKILL_NAMING.claude.rowName('apps/web/.claude/skills/deploy/SKILL.md', undefined)).toBe(
      'apps/web:deploy',
    );
  });

  it('derives the invocation name from the path, whatever the frontmatter declares', () => {
    // The vendor's documented command: the skill directory, prefixed
    // root-relative when nested (skills page § How a skill gets its command
    // name); the authored label never reaches it.
    expect(SKILL_NAMING.claude.invocationName('.claude/skills/deploy/SKILL.md', 'deployer')).toBe(
      'deploy',
    );
    expect(
      SKILL_NAMING.claude.invocationName('apps/web/.claude/skills/deploy/SKILL.md', 'deployer'),
    ).toBe('apps/web:deploy');
  });

  it('faces a collision when skill directories clash anywhere in the view', () => {
    // Claude's clash is the unqualified command, and nested prefixing puts
    // its sides on different rows, so the gate is built from every Claude
    // path in the view and asked with one row's paths at a time (FR-007).
    const gate = SKILL_NAMING.claude.collisionGate([
      '.claude/skills/wave/SKILL.md',
      'apps/web/.claude/skills/wave/SKILL.md',
      '.claude/skills/tide/SKILL.md',
    ]);
    expect(gate(['.claude/skills/wave/SKILL.md'])).toBe(true);
    expect(gate(['apps/web/.claude/skills/wave/SKILL.md'])).toBe(true);
    expect(gate(['.claude/skills/tide/SKILL.md'])).toBe(false);
  });

  it('faces no collision when every skill directory in the view is unique', () => {
    const gate = SKILL_NAMING.claude.collisionGate([
      '.claude/skills/foo/SKILL.md',
      '.claude/skills/bar/SKILL.md',
    ]);
    // Two rows sharing only the authored name are two commands with no clash
    // (FR-007), however many definitions a row holds.
    expect(gate(['.claude/skills/foo/SKILL.md', '.claude/skills/bar/SKILL.md'])).toBe(false);
  });
});

describe('collision evidence per naming policy (FR-007/FR-028)', () => {
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
    expect(SKILL_NAMING.claude.collisionEvidencePaths([failed, parsed])).toEqual([
      failed.sourceRelativePath,
      parsed.sourceRelativePath,
    ]);
  });

  it('excludes a failed extraction for the authored-name tools', () => {
    // An authored-name tool never resolved the failed file's name, so its row
    // membership is this product's provisional grouping, not evidence.
    const codexFailed = { ...failed, tool: 'codex' } as const;
    const codexParsed = { ...parsed, tool: 'codex' } as const;
    expect(SKILL_NAMING.codex.collisionEvidencePaths([codexFailed, codexParsed])).toEqual([
      codexParsed.sourceRelativePath,
    ]);
  });
});
