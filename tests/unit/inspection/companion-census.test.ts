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

/**
 * The files half of one census, for the cases about enumeration alone; the
 * containment verdict has its own case below.
 */
async function companionFiles(
  sourceRoot: string,
  censusRoot: string,
  continueScan?: () => boolean,
): Promise<readonly { censusRelativePath: string; absolutePath: string }[]> {
  return (await listCompanionFiles(sourceRoot, censusRoot, continueScan)).files;
}

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
  it('lists the files below the directory it is given, sorted', async () => {
    // Paths are relative to the enumerated directory: this module is told
    // which directory to walk and nothing else, so it cannot state a
    // Source-relative Path and does not try to.
    const listed = (await companionFiles(root, join(root, '.agents/skills/greet'))).map(
      (companion) => companion.censusRelativePath,
    );
    // The seed is not excluded here: this module enumerates a directory, and
    // the caller removes whatever the walk already published (`scan.ts`).
    const expected = ['SKILL.md', 'reference.md', 'scripts/lib/helper.sh', 'scripts/run.sh'];
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
    // `.git` is excluded from enumeration everywhere. The entry point itself is
    // not: this module enumerates a directory, and the caller removes whatever
    // the walk already published (`scan.ts`).
    expect(listed).toContain('SKILL.md');
    expect(listed.some((path) => path.startsWith('.git/'))).toBe(false);
  });

  it('terminates on a link cycle and never leaves the skill directory', async () => {
    if (!symlinks) {
      return;
    }
    // Both `loop` and `up` resolve outside or back onto the census root. The
    // call returning at all is half the assertion; the other half is that
    // nothing above the skill directory appears.
    const listed = (await companionFiles(root, join(root, '.agents/skills/greet'))).map(
      (companion) => companion.censusRelativePath,
    );
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
    const listed = (await companionFiles(root, join(root, '.agents/skills/greet'))).map(
      (companion) => companion.censusRelativePath,
    );
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
      // The verdict is published, not folded into emptiness: the session
      // refuses membership below the spelling on its strength
      // (session.ts § pluginRootFilesOf).
      expect(await listCompanionFiles(root, join(root, '.agents/skills/escaped'))).toEqual({
        rootContained: false,
        files: [],
      });
    } finally {
      rmSync(outside, { recursive: true, force: true });
    }
  });

  it('reports both the display path and the operand for every file', async () => {
    // Neither is decoded from the other: the display path is presentation
    // identity and the absolute path is never published. The scan needs
    // both — one to read with, one to publish (FR-024).
    const census = await companionFiles(root, join(root, '.agents/skills/greet'));
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
    const census = await companionFiles(root, directory);
    // The entry point is listed like any other entry — this module enumerates
    // a directory and the caller removes what the walk already published — so
    // the two spellings are the entries beside it.
    const spellings = census
      .map((file) => file.censusRelativePath)
      .filter((path) => path !== 'SKILL.md');
    expect(spellings).toHaveLength(2);
    // Two distinct strings: the composed and the decomposed name are two
    // entries, and no normalization step folds them into one.
    expect(new Set(spellings).size).toBe(2);
  });

  it('propagates a failure rather than reporting an empty directory', async () => {
    // The empty list means "the directory holds nothing else". Returning it for
    // a permission or I/O error would publish a statement about the directory
    // on the strength of not having read it, so the failure propagates exactly
    // as it does in the ordinary walk.
    await expect(listCompanionFiles(root, join(root, 'no-such-skill'))).rejects.toThrow();
    await expect(listCompanionFiles(join(root, 'no-such-root'), join(root, 'a'))).rejects.toThrow();
  });
});

describe('a census root the walk could never have descended to', () => {
  it('lists nothing below VCS internals or an installed-package directory', async () => {
    // A skill's directory is one the walk reached, but a plugin root is named
    // by a catalog entry's declared source, so `./.git` and
    // `./node_modules/pkg` are spellings a file can ask for. The descent
    // excludes both, and the root is held to the same rule: without it, where
    // a census started would decide whether the exclusion applied at all
    // (contracts/inspection-path-allowlist.md § Bounded companion census).
    const root = mkdtempSync(join(tmpdir(), 'inspector-census-excluded-'));
    try {
      mkdirSync(join(root, '.git/objects'), { recursive: true });
      writeFileSync(join(root, '.git/config'), '[core]\n', 'utf8');
      mkdirSync(join(root, 'node_modules/pkg'), { recursive: true });
      writeFileSync(join(root, 'node_modules/pkg/index.js'), 'module.exports = {};\n', 'utf8');
      expect(await companionFiles(root, join(root, '.git'))).toEqual([]);
      expect(await companionFiles(root, join(root, 'node_modules/pkg'))).toEqual([]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
  it('holds each half of the rule to the descent own terms', async () => {
    // The descent excludes VCS internals by the entry name *and* by where it
    // resolves, and an installed-package directory by the name alone. A root
    // is held to that same split: a link is how a declared source reaches an
    // object store under an ordinary name, while a directory that merely
    // resolves inside an installed package is not the name a package manager
    // filled — enumerating one is what the walk itself would do.
    const root = mkdtempSync(join(tmpdir(), 'inspector-census-halves-'));
    try {
      mkdirSync(join(root, '.git/objects'), { recursive: true });
      writeFileSync(join(root, '.git/config'), '[core]\n', 'utf8');
      symlinkSync(join(root, '.git'), join(root, 'store'), 'dir');
      mkdirSync(join(root, 'node_modules/pkg/skill'), { recursive: true });
      writeFileSync(join(root, 'node_modules/pkg/skill/SKILL.md'), '# packaged\n', 'utf8');
      symlinkSync(join(root, 'node_modules/pkg/skill'), join(root, 'vendored'), 'dir');

      expect(await companionFiles(root, join(root, 'store'))).toEqual([]);
      const vendored = await companionFiles(root, join(root, 'vendored'));
      expect(vendored.map((entry) => entry.censusRelativePath)).toEqual(['SKILL.md']);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

describe('an installed-package name that is not a directory (T1097)', () => {
  it('stops enumerating once scan authority is withdrawn', async () => {
    // Disable/shutdown revokes authority between filesystem promises
    // (data-model.md § ScanAttempt "stops new scheduling"): a census that has
    // answered its containment realpaths but not yet enumerated must start no
    // readdir, and one interrupted mid-tree must stop at the next entry.
    const askedNever = await companionFiles(root, join(root, '.agents/skills/greet'), () => false);
    expect(askedNever).toEqual([]);

    // Authority leaves after the first asks: the walk returns what it had
    // rather than continuing into scripts/lib — a partial list the commit
    // gates discard, never a published census.
    let asks = 0;
    const interrupted = await companionFiles(root, join(root, '.agents/skills/greet'), () => {
      asks += 1;
      return asks <= 3;
    });
    const full = await companionFiles(root, join(root, '.agents/skills/greet'));
    expect(interrupted.length).toBeLessThan(full.length);
  });

  it('lists a regular file named node_modules beside the skill', async () => {
    // The exclusion is about a directory a package manager filled. An entry of
    // that name resolving to a regular file is one of the files that ship with
    // the skill, and dropping it would show a skill missing a file its own
    // directory has (contracts/inspection-path-allowlist.md).
    const root = mkdtempSync(join(tmpdir(), 'inspector-census-installed-'));
    try {
      mkdirSync(join(root, 'skill/node_modules'), { recursive: true });
      writeFileSync(join(root, 'skill/SKILL.md'), '# skill\n', 'utf8');
      writeFileSync(join(root, 'skill/node_modules/pkg.md'), '# packaged\n', 'utf8');
      const listed = await companionFiles(root, join(root, 'skill'));
      expect(listed.map((entry) => entry.censusRelativePath)).toEqual(['SKILL.md']);

      rmSync(join(root, 'skill/node_modules'), { recursive: true, force: true });
      writeFileSync(join(root, 'skill/node_modules'), 'an ordinary file\n', 'utf8');
      const withFile = await companionFiles(root, join(root, 'skill'));
      expect(withFile.map((entry) => entry.censusRelativePath)).toEqual([
        'SKILL.md',
        'node_modules',
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
