// The one rule every comparison surface names a side by (FR-011, FR-030;
// comparison-side-picker.ts § comparisonSideLabel): the qualifier names the
// member with the directory, so two members pointed at one directory never
// read as one option twice — nor as one file in the sentence a comparison
// states about an unreadable side (FR-025).
import { describe, expect, it } from 'vitest';

import {
  comparisonSideOptions,
  comparisonSourceQualifierOf,
} from '../../../src/app/components/comparison-side-picker';
import type { SourceDto } from '../../../src/shared/api-types';

/** One minimal Source row of the shape the picker reads. */
function sourceOf(overrides: Partial<SourceDto> & Pick<SourceDto, 'sourceId'>): SourceDto {
  return {
    kind: 'repository',
    member: null,
    enabled: true,
    status: 'ready',
    boundary: { displayRoot: '/repo', origin: 'runtime-cwd' },
    generation: 1,
    scanRequestId: null,
    progress: null,
    diagnosticIds: [],
    ...overrides,
  } as SourceDto;
}

const REPOSITORY = sourceOf({ sourceId: 'src-repo' });

describe('the picker Source qualifier', () => {
  it('is null while the family holds one Source', () => {
    const claude = sourceOf({
      sourceId: 'src-claude',
      kind: 'global',
      member: 'claude',
      boundary: { displayRoot: '/home/reader/.claude', origin: 'default-home' },
    });
    expect(comparisonSourceQualifierOf([REPOSITORY, claude], 'src-claude')).toBeNull();
    expect(comparisonSourceQualifierOf([REPOSITORY, claude], 'src-repo')).toBeNull();
  });

  it('distinguishes two members pointed at one directory', () => {
    // COPILOT_HOME aimed at the shared agent home gives two Sources one
    // displayRoot; the directory alone would label their same-path sides
    // identically, so the member leads it.
    const copilot = sourceOf({
      sourceId: 'src-copilot',
      kind: 'global',
      member: 'copilot',
      boundary: { displayRoot: '/home/reader/.agents', origin: 'environment' },
    });
    const agents = sourceOf({
      sourceId: 'src-agents',
      kind: 'global',
      member: 'agents',
      boundary: { displayRoot: '/home/reader/.agents', origin: 'default-home' },
    });
    const sources = [REPOSITORY, copilot, agents];
    const options = comparisonSideOptions(sources, [
      { source: 'global-copilot', sourceRelativePath: 'skills/deploy/SKILL.md' },
      { source: 'global-agents', sourceRelativePath: 'skills/deploy/SKILL.md' },
    ]);
    expect(options.map((option) => option.label)).toEqual([
      'skills/deploy/SKILL.md — Copilot home — /home/reader/.agents',
      'skills/deploy/SKILL.md — Shared agent home — /home/reader/.agents',
    ]);
    expect(new Set(options.map((option) => option.label)).size).toBe(2);
  });
});
