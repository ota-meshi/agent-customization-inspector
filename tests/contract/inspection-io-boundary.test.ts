// T022: architectural contract — inspected-source filesystem I/O is owned by
// the src/server/inspection/ directory (spec.md FR-022, plan.md Project
// Structure). No production module outside that directory (including the
// src/app/ browser SPA and src/shared/ contracts) may import a Node.js
// filesystem API. The directory itself arrives with the traversal tasks; the
// boundary rule holds whether or not it exists yet.
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = join(__dirname, '..', '..');

const FILESYSTEM_IMPORT_PATTERN =
  /from\s+['"]node:fs(?:\/promises)?['"]|require\(\s*['"]node:fs(?:\/promises)?['"]\s*\)|from\s+['"]fs(?:\/promises)?['"]/u;

const AUTHORITY_DIRECTORY = 'src/server/inspection/';

function collectSourceFiles(directory: string, collected: string[]): void {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      continue;
    }
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(absolute, collected);
    } else if (/\.(?:ts|mts|cts|vue)$/u.test(entry.name)) {
      collected.push(absolute);
    }
  }
}

describe('inspection I/O boundary', () => {
  it('permits Node filesystem imports only inside the inspection directory', () => {
    const offenders: string[] = [];
    const files: string[] = [];
    collectSourceFiles(join(REPO_ROOT, 'src'), files);
    for (const file of files) {
      const repoRelative = relative(REPO_ROOT, file).replaceAll('\\', '/');
      if (repoRelative.startsWith(AUTHORITY_DIRECTORY)) {
        continue;
      }
      const text = readFileSync(file, 'utf8');
      if (FILESYSTEM_IMPORT_PATTERN.test(text)) {
        offenders.push(repoRelative);
      }
    }
    expect(offenders).toEqual([]);
  });
});
