// T1041: the hard bilingual cross-artifact gate. It reads this repository's own
// authoritative artifacts and proves they agree with each other and with the
// tree they describe (quickstart.md § Automated quality gates; tasks.md
// § Normative Requirement Traceability).
//
// What it owns is the class of drift no other suite can see, because no other
// suite reads two documents at once: a quickstart naming a `pnpm run` script
// that no longer exists, a declared CI job that was renamed, a trace matrix
// that stopped covering a task, and — the one that only a bilingual repository
// has — an English task whose Japanese counterpart quietly dropped a
// cross-reference or a file it owns.
//
// It lives in its own directory rather than under `tests/contract/`: every
// suite here is separated by where its tests live, so a documentation test in
// the contract root would run in the contract and coverage jobs too, leaving
// the documentation job verifying nothing those had not already verified —
// unless two projects each carried an exclusion for one file.
//
// Two extraction decisions are load-bearing, and both were measured against the
// real artifacts rather than assumed:
//
//   - Inline code is paired with `` `([^`]*)` `` rather than a
//     no-whitespace body. A body that forbids spaces cannot match a span like
//     `--port <number>`, so the scanner resynchronizes on the wrong backtick and
//     silently loses the path that follows it. Tokens containing whitespace are
//     dropped afterwards, when they are no longer able to misalign the pairing.
//   - Identifier boundaries are ASCII-only lookarounds, not `\b`. Japanese
//     characters are word characters, so `\bT091\b` never matches `T091を`,
//     and the parity gate would report agreement it never checked.
//
// An owned path is a quoted token that resolves in this repository. A token
// that resolves to nothing is a content literal — an inspected location such as
// `.claude/settings.json`, a package name, a glob shape — and is read as one
// (tasks.md T1041). A task that owns no file is not required to name one:
// user-visible copy is written in the component that renders it and an evidence
// citation lives on the record it supports, so those tasks have no single
// owning file to name.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import packageJson from '../../package.json' with { type: 'json' };
import { CLAUDE_INSPECTION_RULES } from '../../src/shared/registries/claude/rules';
import { CODEX_INSPECTION_RULES } from '../../src/shared/registries/codex/rules';
import { COPILOT_INSPECTION_RULES } from '../../src/shared/registries/copilot/rules';

/** Repository root, from which every artifact and quoted path is resolved. */
const REPOSITORY_ROOT = new URL('../../', import.meta.url);

/** The feature directory whose artifacts this gate reads. */
const FEATURE_DIRECTORY = 'specs/001-inspect-agent-customizations/';

/** Reads one repository-relative artifact as text. */
function readArtifact(relativePath: string): string {
  return readFileSync(new URL(relativePath, REPOSITORY_ROOT), 'utf8');
}

/** True when a repository-relative path exists in the working tree. */
function existsInRepository(relativePath: string): boolean {
  return existsSync(fileURLToPath(new URL(relativePath, REPOSITORY_ROOT)));
}

const tasksEnglish = readArtifact(`${FEATURE_DIRECTORY}tasks.md`);
const tasksJapanese = readArtifact(`${FEATURE_DIRECTORY}tasks.ja.md`);
const quickstartEnglish = readArtifact(`${FEATURE_DIRECTORY}quickstart.md`);
const quickstartJapanese = readArtifact(`${FEATURE_DIRECTORY}quickstart.ja.md`);
const readmeEnglish = readArtifact('README.md');
const notListedEnglish = readArtifact('docs/which-files-are-listed.md');
const notListedJapanese = readArtifact('docs/which-files-are-listed.ja.md');
const readmeJapanese = readArtifact('README.ja.md');
const continuousIntegration = readArtifact('.github/workflows/ci.yml');
const releaseWorkflow = readArtifact('.github/workflows/Release.yml');

/** One task's checklist entry, keyed by task ID. */
type TaskBodies = ReadonlyMap<string, string>;

/**
 * Splits a tasks document into one body per task ID. A body runs from its
 * checklist line to the next task line or the next level-2 heading, so the
 * nested lists, fenced blocks, and amendment notes a task carries stay with it.
 */
function parseTasks(document: string): TaskBodies {
  const bodies = new Map<string, string>();
  let current: string | null = null;
  let buffer: string[] = [];
  const commit = (): void => {
    if (current !== null) bodies.set(current, buffer.join('\n'));
  };
  for (const line of document.split('\n')) {
    const started = /^- \[[ X]\] (T\d+)\b/u.exec(line);
    if (started !== null) {
      commit();
      current = started[1]!;
      buffer = [line];
    } else if (current !== null) {
      if (line.startsWith('## ')) {
        commit();
        current = null;
        buffer = [];
      } else {
        buffer.push(line);
      }
    }
  }
  commit();
  return bodies;
}

/**
 * Every inline-code span in document order. Pairing on a body that may contain
 * spaces is what keeps the scanner aligned; see the module header.
 */
function inlineCodeSpans(text: string): readonly string[] {
  return [...text.matchAll(/`([^`]*)`/gu)].map((match) => match[1]!);
}

/**
 * The repository-relative file paths one task owns: quoted, slashed or
 * explicitly `./`-prefixed, and resolving in this repository or under the
 * feature directory. Everything else is a content literal.
 */
function ownedPaths(body: string): ReadonlySet<string> {
  const owned = new Set<string>();
  for (const span of inlineCodeSpans(body)) {
    const prefixed = span.startsWith('./');
    const token = prefixed ? span.slice(2) : span;
    if (token === '' || /\s/u.test(token) || token.startsWith('http')) continue;
    if (!/^[\w.@[\]{}*+-]+(?:\/[\w.@[\]{}*+-]*)*$/u.test(token)) continue;
    // An unprefixed basename is never an owned path (tasks.md T1041).
    if (!token.includes('/') && !prefixed) continue;
    if (existsInRepository(token)) owned.add(token);
    else if (existsInRepository(`${FEATURE_DIRECTORY}${token}`))
      owned.add(`${FEATURE_DIRECTORY}${token}`);
  }
  return owned;
}

/**
 * The normative identifiers one task names: requirement IDs and task IDs, in
 * plain text and code spans alike. ASCII-only boundaries; see the module header.
 */
function normativeIdentifiers(body: string): ReadonlySet<string> {
  return new Set(
    body.match(/(?<![0-9A-Za-z])(?:(?:FR|QR|SC)-\d{3}|T\d{3,4})(?![0-9A-Za-z])/gu) ?? [],
  );
}

const englishTasks = parseTasks(tasksEnglish);
const japaneseTasks = parseTasks(tasksJapanese);

/**
 * The declared task-ID space: T001 through T1177, less the ranges the withdrawn
 * phases left vacant (tasks.md T1041). Written out here and in the task text
 * both, because what this freezes is that a range nobody meant to change did
 * not change.
 */
const VACANT_TASK_RANGES: readonly (readonly [number, number])[] = [
  [436, 439],
  [482, 485],
  [654, 657],
  [675, 678],
  [679, 750],
];

/** Every task ID the current task set declares, in numeric order. */
const DECLARED_TASK_IDS: readonly string[] = Array.from({ length: 1201 }, (_, index) => index + 1)
  .filter((number) => !VACANT_TASK_RANGES.some(([from, to]) => number >= from && number <= to))
  .map((number) => `T${String(number).padStart(3, '0')}`);

describe('quickstart commands are runnable', () => {
  const declaredScripts = new Set(Object.keys(packageJson.scripts));

  it.each([
    ['quickstart.md', quickstartEnglish],
    ['quickstart.ja.md', quickstartJapanese],
  ])('%s names only scripts package.json declares', (_name, document) => {
    const named = [...document.matchAll(/pnpm run ([\w:-]+)/gu)].map((match) => match[1]!);
    expect(named.length).toBeGreaterThan(0);
    for (const script of new Set(named)) {
      expect(declaredScripts.has(script), `pnpm run ${script}`).toBe(true);
    }
  });

  it('names the same script set in both languages', () => {
    const scriptsOf = (document: string): ReadonlySet<string> =>
      new Set([...document.matchAll(/pnpm run ([\w:-]+)/gu)].map((match) => match[1]!));
    expect([...scriptsOf(quickstartJapanese)].toSorted()).toEqual(
      [...scriptsOf(quickstartEnglish)].toSorted(),
    );
  });

  it('runs the documentation gate this suite belongs to', () => {
    // A suite whose own gate is undeclared reports success for a verification
    // nobody can run in CI (T996, T1041).
    expect(declaredScripts.has('test:docs')).toBe(true);
    for (const document of [quickstartEnglish, quickstartJapanese]) {
      expect(document).toContain('pnpm run test:docs');
    }
  });
});

/**
 * The heading levels of a document, in order. Heading *text* is prose and
 * differs by language; the shape a reader navigates is what must not.
 */
function headingLevels(document: string): readonly number[] {
  return [...withoutFences(document).matchAll(/^(#{1,6}) /gmu)].map((match) => match[1]!.length);
}

/** One document with its fenced blocks removed, so code never feeds a prose scan. */
function withoutFences(document: string): string {
  return document.replaceAll(/```[\s\S]*?```/gu, '');
}

/**
 * The commands in a document's fenced blocks, with trailing comments removed.
 * A reader of either language runs the same command; the comment beside it is
 * prose and is translated, which is why the comment is stripped rather than
 * compared. The separator is two or more spaces before `#`, which is how these
 * blocks are written and which a `#` inside a command does not produce.
 */
function fencedCommands(document: string): readonly string[] {
  return [...document.matchAll(/```\w*\n([\s\S]*?)```/gu)].flatMap((match) =>
    match[1]!
      .split('\n')
      .map((line) => line.replaceAll(/\s{2,}#.*$/gu, '').trim())
      .filter((line) => line !== ''),
  );
}

/**
 * One link target with its language suffix removed, so the counterpart each
 * language correctly points at — `AGENTS.ja.md` beside `AGENTS.md`, `tasks.ja.md`
 * beside `tasks.md` — is one target rather than a difference to report.
 */
function languageNeutralTarget(target: string): string {
  return target.replace(/\.ja\.md$/u, '.md');
}

/** Every link target in a document, excluding images, language-neutralized. */
function linkTargets(document: string): ReadonlySet<string> {
  return new Set(
    [...withoutFences(document).matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/gu)].map((match) =>
      languageNeutralTarget(match[1]!),
    ),
  );
}

/** Every image source in a document. */
function imageSources(document: string): ReadonlySet<string> {
  return new Set([...document.matchAll(/!\[[^\]]*\]\(([^)]+)\)/gu)].map((match) => match[1]!));
}

describe('the readme is one document in two languages', () => {
  // QR-004 makes the readme the user documentation, so it is the bilingual pair
  // a user is most likely to read — and it was the one pair no gate covered.
  // What this owns is the drift a reader meets: a section that exists in one
  // language only, a command that differs between them, a cross-reference or a
  // screenshot dropped from one side (T1029; QR-004).
  //
  // What it deliberately does not check is semantic equivalence of the prose,
  // which no test can decide. That obligation stays where the Documentation
  // language policy puts it: on whoever changes either file.
  it('carries the same section structure', () => {
    expect(headingLevels(readmeJapanese)).toEqual(headingLevels(readmeEnglish));
  });

  it('gives a reader of either language the same commands', () => {
    const english = fencedCommands(readmeEnglish);
    expect(english.length).toBeGreaterThan(0);
    expect(fencedCommands(readmeJapanese)).toEqual(english);
  });

  it('names the same cross-references, each in its own language', () => {
    expect([...linkTargets(readmeJapanese)].toSorted()).toEqual(
      [...linkTargets(readmeEnglish)].toSorted(),
    );
  });

  it.each([
    ['README.md', 'readmeEnglish'],
    ['README.ja.md', 'readmeJapanese'],
  ])('%s links only to documents this repository holds', (name) => {
    // Checked per language rather than through the neutralized set above,
    // because that set answers whether the two agree and this one answers
    // whether either resolves — a link is followed in the language it was
    // written in.
    const document = name === 'README.md' ? readmeEnglish : readmeJapanese;
    const targets = [...withoutFences(document).matchAll(/(?<!!)\[[^\]]*\]\(([^)]+)\)/gu)].map(
      (match) => match[1]!,
    );
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) {
      if (target.startsWith('http')) continue;
      expect(existsInRepository(target), `${name} → ${target}`).toBe(true);
    }
  });

  it('shows the same screenshots, and ships them', () => {
    const sources = imageSources(readmeEnglish);
    expect(sources.size).toBeGreaterThan(0);
    expect([...imageSources(readmeJapanese)].toSorted()).toEqual([...sources].toSorted());
    for (const source of sources) {
      expect(existsInRepository(source), source).toBe(true);
    }
  });

  it('opens each language with the link to its counterpart', () => {
    expect(readmeEnglish).toContain('[日本語](README.ja.md)');
    expect(readmeJapanese).toContain('[English](README.md)');
  });
});

/**
 * Every literal path segment the shipped inspection rules admit a candidate at.
 * Read from the rules themselves rather than from a list written beside them:
 * what the page must account for is what the scan actually opens.
 */
function literalSegments(): ReadonlySet<string> {
  const values = new Set<string>();
  for (const rules of [CLAUDE_INSPECTION_RULES, COPILOT_INSPECTION_RULES, CODEX_INSPECTION_RULES]) {
    for (const rule of Object.values(rules)) {
      if (rule.discoveryClass !== 'static-candidate' || rule.matcher === null) continue;
      for (const program of rule.matcher.selectors) {
        for (const segment of program) {
          if (typeof segment === 'object' && segment.kind === 'literal') values.add(segment.value);
        }
      }
    }
  }
  return values;
}

describe('the missing-file page accounts for every location a rule reaches', () => {
  // The page names the locations in prose, because `ANY_DIRECTORIES` and a
  // selector program are how a rule is authored rather than something a reader
  // of the product should meet (AGENTS.md § Readme policy; T1141). Prose cannot
  // be derived from the rules, so what a gate can hold is containment: a rule
  // admitting a candidate at a literal segment the page never names is a
  // location the page has stopped covering, which is the drift this page's own
  // form invites.
  it.each([
    ['docs/which-files-are-listed.md', notListedEnglish],
    ['docs/which-files-are-listed.ja.md', notListedJapanese],
  ])('%s names every literal segment the rules admit', (name, page) => {
    const missing = [...literalSegments()].filter((value) => !page.includes(value)).toSorted();
    expect(missing, `${name} names no location for: ${missing.join(', ')}`).toEqual([]);
  });

  it('carries the one derived rule the containment check cannot see', () => {
    // Containment reads literal path segments, and a derived rule has no
    // matcher to take them from: it admits names read out of a file at scan
    // time. So the count is frozen instead — the page states the one that
    // ships, and a second cannot arrive without this failing and someone
    // deciding what the page now says (AGENTS.md § Implementation simplicity
    // policy, on freezes).
    const derived = [CLAUDE_INSPECTION_RULES, COPILOT_INSPECTION_RULES, CODEX_INSPECTION_RULES]
      .flatMap((rules) => Object.values(rules))
      .filter((rule) => rule.discoveryClass === 'bounded-derived-candidate')
      .map((rule) => rule.ruleId)
      .toSorted();
    expect(derived).toEqual(['codex.derived.fallback-basename']);
    for (const page of [notListedEnglish, notListedJapanese]) {
      expect(page).toContain('project_doc_fallback_filenames');
    }
  });
});

describe('continuous integration declares one independent job per gate', () => {
  // Only the `jobs:` block: the workflow's `on:` triggers sit at the same
  // indentation, so a file-wide scan would read `push` and `pull_request` as
  // jobs and the ordered list below would be describing the wrong thing.
  const jobsBlock = continuousIntegration.slice(continuousIntegration.indexOf('\njobs:'));
  const jobs = [...jobsBlock.matchAll(/^ {2}([a-z][\w-]*):$/gmu)].map((match) => match[1]!);

  it('declares the expected jobs in order', () => {
    // Spelled out rather than derived from the file it checks: a list read from
    // its own source agrees with itself whatever it holds (AGENTS.md § freeze).
    expect(jobs).toEqual([
      'format',
      'lint',
      'typecheck',
      'unit',
      'contract',
      'integration',
      'security',
      'package',
      'documentation',
      'performance',
      'coverage',
      'browser',
      'build',
      'certify-lower-bounds',
    ]);
  });

  it('gives every vitest project a job that runs it', () => {
    const projects = ['unit', 'contract', 'integration', 'security', 'package', 'documentation'];
    for (const project of projects) {
      const script = project === 'documentation' ? 'test:docs' : `test:${project}`;
      expect(continuousIntegration, project).toContain(`pnpm run ${script}`);
    }
  });
});

describe('normative requirement traceability', () => {
  /** The matrix rows of one tasks document, as `requirement -> owning tasks`. */
  const traceRows = (document: string): ReadonlyMap<string, string> => {
    // The matrix is the first two-column table in the document, and its rows
    // are the ones after its own `|---|---|` separator. Taking them positionally
    // means neither language's header label has to be spelled here.
    const separator = document.indexOf('\n|---|---|\n');
    const table = document.slice(separator + 1).split('\n\n')[0]!;
    const rows = new Map<string, string>();
    for (const match of table.matchAll(/^\| ([^|]+?) \| ([^|]+?) \|$/gmu)) {
      rows.set(match[1]!.trim(), match[2]!.trim());
    }
    return rows;
  };

  const english = traceRows(tasksEnglish);
  const japanese = traceRows(tasksJapanese);

  it('carries exactly 53 FR/QR/SC rows', () => {
    const requirementRows = [...english.keys()].filter((key) => /^(?:FR|QR|SC)-\d{3}$/u.test(key));
    expect(requirementRows).toHaveLength(53);
    expect(requirementRows.filter((key) => key.startsWith('FR-'))).toHaveLength(41);
    expect(requirementRows.filter((key) => key.startsWith('QR-'))).toHaveLength(5);
    // Seven success criteria: the scan-timing and interaction-latency one is
    // withdrawn, because asserting a threshold needs a frozen measurement host
    // nobody designated (spec.md § Clarifications, Session 2026-09-01).
    expect(requirementRows.filter((key) => key.startsWith('SC-'))).toHaveLength(7);
    expect(requirementRows).not.toContain('SC-002');
    expect(requirementRows).toContain('FR-045');
  });

  it('carries the same rows and owners in both languages', () => {
    expect([...japanese.keys()]).toEqual([...english.keys()]);
    for (const [requirement, owners] of english) {
      expect(japanese.get(requirement), requirement).toBe(owners);
    }
  });

  it('names every declared task ID', () => {
    // A range in the matrix is inclusive, so expand each one before asking
    // whether a task is covered (tasks.md § Normative Requirement Traceability).
    const covered = new Set<string>();
    const pad = (number: number): string => `T${String(number).padStart(3, '0')}`;
    for (const owners of english.values()) {
      for (const match of owners.matchAll(/T(\d{3,4})(?:[–-]T?(\d{3,4}))?/gu)) {
        const from = Number(match[1]);
        const to = match[2] === undefined ? from : Number(match[2]);
        for (let number = from; number <= to; number += 1) covered.add(pad(number));
      }
    }
    const uncovered = DECLARED_TASK_IDS.filter((id) => !covered.has(id));
    expect(uncovered, `tasks named by no trace row: ${uncovered.join(', ')}`).toEqual([]);
  });
});

describe('task set', () => {
  it('freezes the task and phase counts in both languages', () => {
    // The deliberate exception to deriving a value rather than restating it:
    // a count nobody intended to change must not change unnoticed, so the
    // literals are written here and a phase or task added without deciding to
    // add one fails (AGENTS.md § Implementation simplicity policy; T1049).
    expect(englishTasks.size).toBe(1113);
    expect(japaneseTasks.size).toBe(1113);
    expect(tasksEnglish.match(/^## Phase /gmu)).toHaveLength(116);
    expect(tasksJapanese.match(/^## フェーズ /gmu)).toHaveLength(116);
  });

  it('keeps every task self-contained, with no out-of-line amendment', () => {
    // An amendment is written inside the task it amends. A footnote marker or a
    // pointer to another document would put half of a task's meaning where a
    // reader following the checklist never goes (T1049).
    for (const [id, body] of englishTasks) {
      expect(body, `${id} carries a footnote reference`).not.toMatch(/\[\^[\w-]+\]/u);
      expect(body, `${id} defers to an amendments document`).not.toMatch(
        /see (?:the )?amendments? (?:file|document|log)/iu,
      );
    }
  });

  it('declares exactly the task IDs the vacant ranges leave', () => {
    // Compared as sets: tasks are ordered by delivery increment rather than by
    // number, so a later phase's IDs legitimately appear inside an earlier
    // phase (tasks.md § Organization).
    expect([...englishTasks.keys()].toSorted()).toEqual([...DECLARED_TASK_IDS].toSorted());
    expect([...japaneseTasks.keys()].toSorted()).toEqual([...DECLARED_TASK_IDS].toSorted());
  });

  it('declares them in the same order in both languages', () => {
    expect([...japaneseTasks.keys()]).toEqual([...englishTasks.keys()]);
  });

  it('rejects an unprefixed basename as an owned path', () => {
    // `package.json` is a manifest literal wherever it is written bare; the
    // same file is owned only when the task writes `./package.json`.
    expect([...ownedPaths('- [X] T000 Edit `package.json` and `vitest.config.ts`')]).toEqual([]);
    expect([...ownedPaths('- [X] T000 Edit `./package.json`')]).toEqual(['package.json']);
  });

  it('ignores a quoted token that resolves to nothing here', () => {
    // Inspected locations and package names are content the task quotes, not
    // files it owns (tasks.md T1041).
    expect([
      ...ownedPaths('- [X] T000 Admit `.claude/settings.json` and `@stylistic/quotes`'),
    ]).toEqual([]);
  });

  it('derives the same owned-path set for each task in both languages', () => {
    for (const id of DECLARED_TASK_IDS) {
      const english = [...ownedPaths(englishTasks.get(id)!)].toSorted();
      const japanese = [...ownedPaths(japaneseTasks.get(id)!)].toSorted();
      expect(japanese, id).toEqual(english);
    }
  });
});

describe('normative identifier parity', () => {
  // Independent of owned-path matching, and no substitute for human semantic
  // review: it compares identifier sets, ignores repetition, and treats a plain
  // text occurrence and a code span as the same occurrence (T1041).
  it('names the same normative identifiers in each task in both languages', () => {
    for (const id of DECLARED_TASK_IDS) {
      const english = [...normativeIdentifiers(englishTasks.get(id)!)].toSorted();
      const japanese = [...normativeIdentifiers(japaneseTasks.get(id)!)].toSorted();
      expect(japanese, id).toEqual(english);
    }
  });

  it('matches an identifier that Japanese text runs straight into', () => {
    // `\b` would not: Japanese characters are word characters, so the gate
    // above would compare two sets it never populated.
    expect([...normativeIdentifiers('T002を開始してはならない（FR-028）')].toSorted()).toEqual([
      'FR-028',
      'T002',
    ]);
    expect([...normativeIdentifiers('T09150 and FR-0281')]).toEqual([]);
  });
});

describe('later release and final reruns are declared in both languages', () => {
  it.each([
    ['quickstart.md', quickstartEnglish],
    ['quickstart.ja.md', quickstartJapanese],
  ])('%s declares the release package verification rerun', (_name, document) => {
    expect(document).toContain('pnpm run test:package');
    expect(document).toContain('pnpm run test:docs');
  });

  it.each([
    ['tasks.md', tasksEnglish],
    ['tasks.ja.md', tasksJapanese],
  ])('%s declares the later release and final reruns as tasks', (_name, document) => {
    // The tasks documents declare the reruns as owned work rather than as
    // command lines: T1049 reruns the targeted gates and T1050 the full set.
    for (const task of ['T1049', 'T1050']) {
      expect(document, task).toMatch(new RegExp(`^- \\[[ X]\\] ${task}\\b`, 'mu'));
    }
  });

  it('quickstart reruns the release gates in a fixed order in both languages', () => {
    const releaseBlock = /```bash\npnpm outdated\n([\s\S]*?)```/u;
    const english = releaseBlock.exec(quickstartEnglish);
    const japanese = releaseBlock.exec(quickstartJapanese);
    expect(english, 'quickstart.md release block').not.toBeNull();
    expect(japanese?.[1]).toBe(english![1]);
    expect(english![1]).toBe(
      'pnpm run format:check\npnpm run test:package\npnpm run test:docs\ngit diff --check\n',
    );
  });
});

describe('release workflow structure', () => {
  // T1048: the shape of the publishing path, not its coverage. The gates ci.yml
  // owns are deliberately not repeated here — a suite a pull request already
  // ran against the same commit gains nothing by running twice — so what these
  // assertions fix is where the credential lives and what order the artifact is
  // produced in (AGENTS.md § Release policy).
  //
  // The blocks are read by indentation because that is the structure the
  // assertions are about: which job a `permissions:` belongs to is exactly the
  // question, so flattening the file would erase the thing being checked.
  const jobBlocks = (workflow: string): ReadonlyMap<string, string> => {
    const body = workflow.slice(workflow.indexOf('\njobs:') + 1);
    const blocks = new Map<string, string>();
    let name: string | null = null;
    let lines: string[] = [];
    for (const line of body.split('\n')) {
      const started = /^ {2}([a-z][\w-]*):$/u.exec(line);
      if (started !== null) {
        if (name !== null) blocks.set(name, lines.join('\n'));
        name = started[1]!;
        lines = [];
      } else if (name !== null) {
        lines.push(line);
      }
    }
    if (name !== null) blocks.set(name, lines.join('\n'));
    return blocks;
  };

  const jobs = jobBlocks(releaseWorkflow);

  it('declares the four jobs the credential split requires', () => {
    expect([...jobs.keys()]).toEqual(['select-mode', 'version', 'pack', 'publish']);
  });

  it('grants id-token: write to the publishing job alone', () => {
    // `id-token: write` is what npm exchanges for a publish token. Any other
    // job holding it would run this repository's build, and every dependency's
    // code, while able to publish.
    for (const [name, block] of jobs) {
      expect(block.includes('id-token: write'), name).toBe(name === 'publish');
    }
    expect(releaseWorkflow).toContain('permissions: {}');
  });

  it('grants no job more than the write it names a reason for', () => {
    // `select-mode` and `pack` only check out; `version` writes the version
    // commit and its pull request; `publish` writes the tag and release.
    expect(jobs.get('select-mode')).toContain('contents: read');
    expect(jobs.get('select-mode')).not.toContain('contents: write');
    expect(jobs.get('pack')).toContain('contents: read');
    expect(jobs.get('pack')).not.toContain('contents: write');
    expect(jobs.get('version')).toContain('contents: write');
    expect(jobs.get('version')).not.toContain('id-token');
  });

  it('builds and verifies before the tarball is packed', () => {
    const pack = jobs.get('pack')!;
    const build = pack.indexOf('pnpm run build');
    const verify = pack.indexOf('pnpm run verify:package');
    const packed = pack.indexOf('changesets/action/pack');
    expect(build, 'pack does not build').toBeGreaterThan(-1);
    expect(verify, 'pack does not verify the packaged files').toBeGreaterThan(-1);
    expect(build).toBeLessThan(verify);
    expect(verify).toBeLessThan(packed);
  });

  it('publishes the packed artifact rather than a tree of its own', () => {
    const publish = jobs.get('publish')!;
    expect(publish).toContain('pack-dir-artifact-id');
    expect(publish).not.toContain('pnpm run build');
    expect(publish).not.toContain('pnpm pack');
  });

  it('supersedes a running release rather than queueing it', () => {
    // A run whose commit main has moved past must not publish the same content
    // under a second version; a missing tag is recoverable, a duplicate publish
    // is not (AGENTS.md § Release policy).
    expect(releaseWorkflow).toContain('cancel-in-progress: true');
  });
});

describe('lower-bound certification receives one tarball', () => {
  // T1047: the six samples certify the artifact a user downloads, so the bytes
  // are packed once and distributed, never packed per sample.
  it('packs once in the build job and downloads those bytes in every sample', () => {
    expect(continuousIntegration).toContain('name: certification-tarball');
    const packOccurrences = continuousIntegration.split('pnpm pack').length - 1;
    expect(packOccurrences, 'the tarball is packed more than once').toBe(1);
    expect(continuousIntegration).toContain('uses: actions/download-artifact@v4');
  });

  it('records the runner image and the Node.js the range resolved to', () => {
    expect(continuousIntegration).toContain('runner image:');
    expect(continuousIntegration).toContain('node --version');
  });
});
