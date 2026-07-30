// T1071: the bounded companion census
// (contracts/inspection-path-allowlist.md § Bounded companion census) — what a
// skill's own directory holds.
//
// The census bounds what a directory-shaped customization *is*, and the scan
// reads what it lists, so the boundary is what these cases are about: what the
// census excludes, how far it descends, and that no link can make it walk
// outside the customization's own directory or forever. The scan-level
// assertions in `rules.test.ts` and `repository-scan.test.ts` prove that what
// it lists is exactly what gets read and published.
import { mkdirSync, mkdtempSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listCompanionFiles } from '../../../src/server/inspection/companion-census';

/** Absolute path of the temporary repository these cases enumerate. */
let root: string;

/** Whether this platform allowed the fixture to create symbolic links. */
let symlinks = true;

/** Writes `content` at `relativePath` below {@link root}, creating parents. */
function write(relativePath: string, content: string): void {
  const absolute = join(root, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

beforeAll(() => {
  root = mkdtempSync(join(tmpdir(), 'inspector-companion-census-'));
  write('.agents/skills/greet/SKILL.md', '---\nname: greet\n---\n');
  write('.agents/skills/greet/reference.md', 'reference\n');
  write('.agents/skills/greet/scripts/run.sh', 'echo hi\n');
  write('.agents/skills/greet/scripts/lib/helper.sh', 'echo helper\n');
  // Excluded like anywhere else: a census never enumerates VCS internals.
  write('.agents/skills/greet/.git/config', '[core]\n');
  // Outside the skill, and reachable from it only through the links below.
  write('.agents/skills/other/SKILL.md', '# other\n');
  write('outside.md', 'outside\n');

  try {
    symlinkSync(
      join(root, '.agents/skills/greet/reference.md'),
      join(root, '.agents/skills/greet/alias.md'),
    );
    // A cycle: the skill's own directory, reached from inside itself.
    symlinkSync(join(root, '.agents/skills/greet'), join(root, '.agents/skills/greet/loop'));
    // An escape upward: without containment this would enumerate the whole
    // repository and report it as `greet`'s companions.
    symlinkSync(join(root, '.agents/skills'), join(root, '.agents/skills/greet/up'));
    symlinkSync(join(root, 'no-such-target.md'), join(root, '.agents/skills/greet/dangling.md'));
    // VCS internals reached under a name the exclusion list does not hold.
    symlinkSync(join(root, '.agents/skills/greet/.git'), join(root, '.agents/skills/greet/meta'));
  } catch {
    symlinks = false;
  }
});

afterAll(() => {
  rmSync(root, { recursive: true, force: true });
});

describe('listCompanionFiles', () => {
  it('lists the files below the skill directory, sorted, without the seed', async () => {
    // Paths are relative to the enumerated directory: this module is told
    // which directory to walk and nothing else, so it cannot state a
    // Source-relative Path and does not try to.
    const listed = (
      await listCompanionFiles(root, join(root, '.agents/skills/greet/SKILL.md'))
    ).map((companion) => companion.censusRelativePath);
    const expected = ['reference.md', 'scripts/lib/helper.sh', 'scripts/run.sh'];
    // A symlinked file is the directory's own entry and is listed at its own
    // path (FR-024). A dangling one is listed too: it is an entry a reader can
    // see and an agent would try to open, and the read path it then takes is
    // what answers `file-unreadable` for it. Leaving it out would show a skill
    // missing a file its own directory has.
    if (symlinks) {
      expected.push('alias.md', 'dangling.md');
    }
    expected.sort();
    expect(listed).toEqual(expected);
    // The seed is what the row already names, and `.git` is excluded from
    // enumeration everywhere.
    expect(listed).not.toContain('SKILL.md');
    expect(listed.some((path) => path.startsWith('.git/'))).toBe(false);
  });

  it('terminates on a link cycle and never leaves the skill directory', async () => {
    if (!symlinks) {
      return;
    }
    // Both `loop` and `up` resolve outside or back onto the census root. The
    // call returning at all is half the assertion; the other half is that
    // nothing above the skill directory appears.
    const listed = (
      await listCompanionFiles(root, join(root, '.agents/skills/greet/SKILL.md'))
    ).map((companion) => companion.censusRelativePath);
    expect(listed.every((path) => !path.startsWith('..'))).toBe(true);
    expect(listed).not.toContain('outside.md');
    expect(listed.some((path) => path.includes('other/'))).toBe(false);
  });

  it('excludes VCS internals reached through a link named something else', async () => {
    if (!symlinks) {
      return;
    }
    // The entry-name exclusion cannot see `meta -> .git`. Without the resolved-
    // path check the census would report the repository's object store as this
    // skill's companion files.
    const listed = (
      await listCompanionFiles(root, join(root, '.agents/skills/greet/SKILL.md'))
    ).map((companion) => companion.censusRelativePath);
    expect(listed.some((path) => path.startsWith('meta/'))).toBe(false);
    expect(listed).not.toContain('meta/config');
  });

  it('lists nothing for a skill directory that is itself a link out of the Source', async () => {
    if (!symlinks) {
      return;
    }
    // The census root's own real path decides nothing on its own: a linked
    // skill directory would make an outside tree the census root. The Source is
    // the boundary of what was authorized for inspection, so a candidate
    // reached that way accompanies nothing.
    const outside = mkdtempSync(join(tmpdir(), 'inspector-census-outside-'));
    try {
      mkdirSync(join(outside, 'linked'), { recursive: true });
      writeFileSync(join(outside, 'linked/SKILL.md'), '# linked\n', 'utf8');
      writeFileSync(join(outside, 'linked/secret.md'), 'not a companion\n', 'utf8');
      symlinkSync(join(outside, 'linked'), join(root, '.agents/skills/escaped'));
      expect(await listCompanionFiles(root, join(root, '.agents/skills/escaped/SKILL.md'))).toEqual(
        [],
      );
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('reports both the display path and the operand for every file', async () => {
    // Neither is decoded from the other: the display path is presentation
    // identity and the absolute path is never published. The scan needs
    // both — one to read with, one to publish (FR-024).
    const census = await listCompanionFiles(root, join(root, '.agents/skills/greet/SKILL.md'));
    const reference = census.find((file) => file.censusRelativePath === 'reference.md');
    expect(reference?.absolutePath).toBe(join(root, '.agents/skills/greet/reference.md'));
    for (const file of census) {
      expect(file.absolutePath.startsWith(root)).toBe(true);
    }
  });

  it('lists two spellings of one display name as two companions', async () => {
    // Distinct raw entries that would render alike are two real files the
    // skill's directory holds apart, so the census lists both at their own
    // raw paths — no normalization step exists to make them ambiguous
    // (FR-024).
    const directory = join(root, '.agents/skills/collide');
    mkdirSync(directory, { recursive: true });
    writeFileSync(join(directory, 'SKILL.md'), '# collide\n', 'utf8');
    // U+00E9 versus e + U+0301: distinct raw names, one rendered appearance.
    writeFileSync(join(directory, 'caf\u00e9.md'), 'composed\n', 'utf8');
    writeFileSync(join(directory, 'cafe\u0301.md'), 'decomposed\n', 'utf8');
    if (readdirSync(directory).length < 3) {
      // A normalization-insensitive filesystem stored one entry, so the pair
      // does not exist here.
      return;
    }
    const census = await listCompanionFiles(root, join(directory, 'SKILL.md'));
    const listed = census.map((file) => file.censusRelativePath);
    expect(listed).toHaveLength(2);
    expect(new Set(listed).size).toBe(2);
  });

  it('propagates a failure rather than reporting an empty directory', async () => {
    // The empty list means "the SKILL.md sits alone". Returning it for a
    // permission or I/O error would publish a statement about the directory on
    // the strength of not having read it, so the failure propagates exactly as
    // it does in the ordinary walk.
    await expect(listCompanionFiles(root, join(root, 'no-such-skill/SKILL.md'))).rejects.toThrow();
    await expect(
      listCompanionFiles(join(root, 'no-such-root'), join(root, 'a/SKILL.md')),
    ).rejects.toThrow();
  });
});
