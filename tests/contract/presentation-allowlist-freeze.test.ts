// T1034–T1037 — the Presentation Allowlist freeze gate
// (contracts/official-sources.md § Presentation Allowlist implementation gate).
// The six tables are approved design input: this suite recomputes all six
// inputs with the contract's own extraction algorithm and compares them with
// the recorded digests, and separately checks row IDs and English/Japanese
// parity — because a digest match alone does not prove parity, and parity
// without a digest does not prove the bytes are the frozen ones.
//
// The algorithm is spelled out here rather than imported from the code it
// gates: a check that computed its expectation the way the source does would
// agree with whatever the source currently holds.
import { createHash, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** The repository root, two directories above this suite. */
const repositoryRoot = resolve(import.meta.dirname, '../..');

/** Where the vendor contracts live. */
const vendorDirectory = 'specs/001-inspect-agent-customizations/contracts/vendors';

/**
 * The six recorded freeze digests, written out as the contract writes them.
 * Deliberately the same strings twice — here and in
 * `contracts/official-sources.md` — because they disagree exactly when someone
 * changed one without deciding to change the other.
 */
const RECORDED_DIGESTS = [
  {
    vendor: 'GitHub Copilot',
    file: 'github-copilot',
    english: 'a6f35ab28711f719500e2a4121a9aeb9d56f74f5b4accecdcd3e9c4643416525',
    japanese: 'b1ec5038a7c581fea4d4ed9e0f83eb7ca730c18312c65a6689bfcc3a93a3a926',
  },
  {
    vendor: 'Claude Code',
    file: 'claude-code',
    english: '2aad69c35c2ff0e348b62bd1f8f6007a538337f14d5ddaa08f6f159b3c46f858',
    japanese: '15862bf76910e507d65ebabe865f61c5652167dcfbaad07600d29a244ac3c73a',
  },
  {
    vendor: 'OpenAI Codex',
    file: 'openai-codex',
    english: '2a598e1bd30690cfe07d64cd6e1a8c5d80512249eacb5e1e59741bd3d9194226',
    japanese: 'e985ad14696d2ef2a47e7fcacbdbb39a83864fdd4d5c62546112f25e62e98301',
  },
] as const;

/**
 * The frozen table's exact digest input: locate the unique level-2 heading
 * whose case-folded text ends with `presentation allowlist`, skip subsequent
 * non-table lines, then concatenate the first contiguous run of lines whose
 * first byte is `|`, preserving every byte and appending one LF after every row
 * including the last.
 */
function extractFrozenTable(contract: string): string {
  const lines = contract.split('\n');
  const headings = lines
    .map((line, index) => ({ line, index }))
    .filter(
      ({ line }) =>
        line.startsWith('## ') &&
        line.slice(3).trim().toLowerCase().endsWith('presentation allowlist'),
    );
  expect(headings).toHaveLength(1);
  const table: string[] = [];
  for (let index = (headings[0]?.index ?? 0) + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (line.startsWith('|')) {
      table.push(line);
      continue;
    }
    if (table.length > 0) {
      break;
    }
  }
  expect(table.length).toBeGreaterThan(0);
  return `${table.join('\n')}\n`;
}

/** The row identifiers a frozen table declares, in order. */
function rowIdentifiers(table: string): string[] {
  return table
    .split('\n')
    .filter((line) => line.startsWith('| `'))
    .map((line) => (line.split('|')[1] ?? '').trim());
}

describe.each(RECORDED_DIGESTS)('the $vendor Presentation Allowlist', (frozen) => {
  const contracts = {
    english: readFileSync(join(repositoryRoot, vendorDirectory, `${frozen.file}.md`), 'utf8'),
    japanese: readFileSync(join(repositoryRoot, vendorDirectory, `${frozen.file}.ja.md`), 'utf8'),
  };

  it('is UTF-8, BOM-free, and LF-only, as the digest input requires', () => {
    for (const contract of Object.values(contracts)) {
      expect(contract.startsWith('﻿')).toBe(false);
      expect(contract).not.toMatch(/\r/u);
    }
  });

  it.each(['english', 'japanese'] as const)('matches its recorded %s digest', (language) => {
    const computed = createHash('sha256')
      .update(Buffer.from(extractFrozenTable(contracts[language]), 'utf8'))
      .digest();
    const recorded = Buffer.from(frozen[language], 'hex');
    // Equal-length bytes compared in constant time, as the gate states.
    expect(computed).toHaveLength(recorded.length);
    expect(
      timingSafeEqual(computed, recorded),
      `The ${frozen.vendor} ${language} Presentation Allowlist no longer matches its recorded ` +
        `freeze (computed ${computed.toString('hex')}, recorded ${frozen[language]}). This blocks ` +
        'implementation: do not update the digest or edit a row. Synchronize the applicable ' +
        'English and Japanese specification, research, plan, quickstart, and contract artifacts, ' +
        'then rerun /speckit-plan followed by /speckit-tasks. See ' +
        'specs/001-inspect-agent-customizations/validation.md § Presentation Allowlist freeze.',
    ).toBe(true);
  });

  it('declares the same row identifiers in both languages', () => {
    // Separate from the digest: two tables can each match their own recorded
    // value while having drifted apart from one another.
    const english = rowIdentifiers(extractFrozenTable(contracts.english));
    expect(english.length).toBeGreaterThan(0);
    expect(rowIdentifiers(extractFrozenTable(contracts.japanese))).toEqual(english);
  });

  it('keeps both languages at the same row count and column shape', () => {
    const shape = (table: string) =>
      table
        .split('\n')
        .filter((line) => line.startsWith('|'))
        .map((line) => line.split('|').length);
    expect(shape(extractFrozenTable(contracts.japanese))).toEqual(
      shape(extractFrozenTable(contracts.english)),
    );
  });
});

describe('the recorded freeze table', () => {
  it('records exactly the six digests this gate checks', () => {
    const registry = readFileSync(
      join(repositoryRoot, 'specs/001-inspect-agent-customizations/contracts/official-sources.md'),
      'utf8',
    );
    // The registry is where the freeze is published; this gate and that table
    // are two spellings of the same six values, and a row added to one without
    // the other is what this notices.
    const published = [
      ...registry.matchAll(
        /^\| (GitHub Copilot|Claude Code|OpenAI Codex) \| `([0-9a-f]{64})` \| `([0-9a-f]{64})` \|$/gmu,
      ),
    ];
    expect(published).toHaveLength(RECORDED_DIGESTS.length);
    expect(published.map((row) => ({ vendor: row[1], english: row[2], japanese: row[3] }))).toEqual(
      RECORDED_DIGESTS.map(({ vendor, english, japanese }) => ({ vendor, english, japanese })),
    );
  });
});
