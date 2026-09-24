// T1156: the grouping the compressed row rests on. A row's unit is one
// resolved name and its unit of listing is one recognition, but several
// recognitions can name one file — `.claude/skills/<name>/SKILL.md` is
// admitted by both Claude Code's and Copilot's rules — so a row that listed
// recognitions from the top would repeat the file's own facts once per
// product. This module is what puts one file on one line, and the rendered
// row's own shape is `tests/e2e/inventory-rows.spec.ts`'s: the unit project
// compiles no single-file component.
import { describe, expect, it } from 'vitest';

import { skillRowFiles } from '../../../src/app/components/inventory/rows/skill-row-files';
import type { SkillDefinitionDto } from '../../../src/shared/api-types';

/** One recognition of one file by one product, with the file facts it carries. */
function definition(
  overrides: Partial<SkillDefinitionDto> & Pick<SkillDefinitionDto, 'sourceRelativePath' | 'tool'>,
): SkillDefinitionDto {
  return {
    sourceId: 'src-repo',
    surfaces: [],
    parseStatus: 'parsed',
    diagnosticIds: [],
    companionFiles: [],
    ...overrides,
  } as SkillDefinitionDto;
}

describe('skill row files', () => {
  it('puts one file on one line however many products recognize it', () => {
    // The case the compression exists for: one path, two products. Listing the
    // recognitions from the top would state the path and its census count
    // twice, leaving the reader to compare two identical lines to discover
    // they name one file.
    const files = skillRowFiles([
      definition({ sourceRelativePath: '.claude/skills/deploy/SKILL.md', tool: 'copilot' }),
      definition({ sourceRelativePath: '.claude/skills/deploy/SKILL.md', tool: 'claude' }),
    ]);

    expect(files).toHaveLength(1);
    expect(files[0]!.sourceRelativePath).toBe('.claude/skills/deploy/SKILL.md');
    // Every recognition is kept: the three products do not read a shared
    // location under shared conditions, so none may be merged away (FR-009).
    expect(files[0]!.definitions.map((one) => one.tool)).toEqual(['copilot', 'claude']);
  });

  it('keeps a file per line, in the order the generation published them', () => {
    const files = skillRowFiles([
      definition({ sourceRelativePath: '.agents/skills/deploy/SKILL.md', tool: 'codex' }),
      definition({ sourceRelativePath: '.agents/skills/deploy/SKILL.md', tool: 'copilot' }),
      definition({ sourceRelativePath: '.claude/skills/deploy/SKILL.md', tool: 'claude' }),
    ]);

    expect(files.map((file) => file.sourceRelativePath)).toEqual([
      '.agents/skills/deploy/SKILL.md',
      '.claude/skills/deploy/SKILL.md',
    ]);
  });

  it('keeps two consented homes apart at one spelling', () => {
    // The identity is the Source and the path together (FR-030). Two homes can
    // hold one `skills/<name>/SKILL.md`, and those are two files however
    // identical their spelling — one line each.
    const files = skillRowFiles([
      definition({
        sourceId: 'src-global-claude',
        sourceRelativePath: 'skills/deploy/SKILL.md',
        tool: 'claude',
      }),
      definition({
        sourceId: 'src-global-codex',
        sourceRelativePath: 'skills/deploy/SKILL.md',
        tool: 'codex',
      }),
    ]);

    expect(files).toHaveLength(2);
    expect(files.map((file) => file.sourceId)).toEqual(['src-global-claude', 'src-global-codex']);
  });

  it('publishes the file’s own facts once rather than once per recognition', () => {
    // The census is taken over the admitted candidate's directory, so every
    // recognition of the file carries the same list; the row states it once
    // because it is the file's fact rather than any one product's.
    const files = skillRowFiles([
      definition({
        sourceRelativePath: '.claude/skills/deploy/SKILL.md',
        tool: 'copilot',
        companionFiles: ['.claude/skills/deploy/README.md'],
      }),
      definition({
        sourceRelativePath: '.claude/skills/deploy/SKILL.md',
        tool: 'claude',
        companionFiles: ['.claude/skills/deploy/README.md'],
      }),
    ]);

    expect(files[0]!.companionFiles).toEqual(['.claude/skills/deploy/README.md']);
  });

  it('states one extraction failure once, however many products recognize the file', () => {
    // The parse ran once per `(file, kind)` (FR-028), so a shared failure must
    // not read as several.
    const files = skillRowFiles([
      definition({
        sourceRelativePath: '.claude/skills/broken/SKILL.md',
        tool: 'copilot',
        diagnosticIds: ['diag-1'],
      }),
      definition({
        sourceRelativePath: '.claude/skills/broken/SKILL.md',
        tool: 'claude',
        diagnosticIds: ['diag-1'],
      }),
    ]);

    expect(files[0]!.diagnosticIds).toEqual(['diag-1']);
  });

  it('escapes the path it renders, so a spanning path cannot read as two files', () => {
    const files = skillRowFiles([
      definition({ sourceRelativePath: '.claude/skills/od\nd/SKILL.md', tool: 'claude' }),
    ]);

    expect(files[0]!.pathText).not.toContain('\n');
    // The identity itself is untouched: what is escaped is the presentation.
    expect(files[0]!.sourceRelativePath).toContain('\n');
  });
});
