// The repository the readme's screenshots are taken of: a plausible product
// monorepo — "Tidewater", a booking platform with an API package and a web
// package — whose agent customizations read the way a real team's do.
//
// It is deliberately not one of the suites' fixture trees. Those exist to make
// the allowlist's edges observable, so they are built from near misses,
// credential-shaped literals, malformed documents, and names like `alpha-a`;
// a reader deciding whether to run the product needs the opposite — files
// they could imagine in their own repository, with nothing on the page that
// asks to be explained. Every path below is one docs/which-files-are-listed.md
// names, so the tree also stands as one worked example of that list.
//
// What the two screenshots rest on is written here, not in the capture
// script: the `changelog` skill is spelled in `.claude/skills/` and in
// `.agents/skills/`, as two copies that drifted, because that is the pair the
// readme's comparison prose names; and the same server name is declared by
// several carriers so the MCP inventory has something to gather by name.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/** Writes one file under `root`, creating its parent directories. */
function write(root: string, relative: string, lines: readonly string[]): void {
  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, `${lines.join('\n')}\n`, 'utf8');
}

/** Writes one JSON document under `root`, formatted the way an editor saves it. */
function writeJson(root: string, relative: string, value: unknown): void {
  write(root, relative, [JSON.stringify(value, null, 2)]);
}

/**
 * The two `changelog` copies the comparison screenshot diffs. The `.agents`
 * copy is the one a team kept current; the `.claude` copy is what the skill
 * said before the team switched from commit lines to pull requests, and it
 * was never updated — a difference the diff shows line by line. Every line
 * is kept short enough to fit one side of the diff at the captured width, so
 * nothing in the image is cut off mid-sentence.
 */
const CHANGELOG_SKILL_CURRENT = [
  '---',
  'name: changelog',
  'description: Draft the changelog entry from merged pull requests.',
  '---',
  '',
  '1. Find the last release tag with `git describe --tags --abbrev=0`.',
  '2. List the pull requests merged since it with `gh pr list`.',
  '3. Group them under **Added**, **Changed**, **Fixed**, **Removed**.',
  '4. One line per pull request: a verb first, its number last.',
  '5. Leave out internal-only changes: CI, tests, tooling.',
];

const CHANGELOG_SKILL_STALE = [
  '---',
  'name: changelog',
  'description: Draft the changelog entry from the latest commits.',
  '---',
  '',
  '1. Find the last release tag with `git describe --tags --abbrev=0`.',
  '2. List the commits since it with `git log <tag>..HEAD --oneline`.',
  '3. Group them under **Added**, **Changed**, **Fixed**, **Removed**.',
  '4. One line per commit: a verb first, its short hash last.',
];

/**
 * Writes the showcase repository into `root`, which must exist and should be
 * empty: nothing here removes what it does not write.
 */
export function buildShowcaseRepository(root: string): void {
  // The project itself, so the tree reads as a repository rather than as a
  // bundle of dot-directories. None of these is a customization file.
  write(root, 'README.md', [
    '# Tidewater',
    '',
    'Booking platform. `packages/api` is the Fastify service and `packages/web` is the Nuxt app.',
  ]);
  writeJson(root, 'package.json', {
    name: 'tidewater',
    private: true,
    packageManager: 'pnpm@10.12.1',
    scripts: {
      dev: 'pnpm -r --parallel run dev',
      test: 'vitest run',
      'test:e2e': 'playwright test',
      lint: 'eslint .',
      typecheck: 'tsc -b',
    },
  });
  write(root, 'pnpm-workspace.yaml', ['packages:', "  - 'packages/*'"]);
  write(root, 'scripts/format-changed.sh', [
    '#!/bin/sh',
    '# Formats the files the current change touched.',
    'git diff --name-only --diff-filter=ACMR | xargs -r pnpm exec prettier --write',
  ]);

  // Instructions. `AGENTS.md` is the shared file three of the four products
  // read; `CLAUDE.md` started as a copy of it and has since fallen behind, so
  // the two are a comparison a reader might actually want.
  write(root, 'AGENTS.md', [
    '# Tidewater',
    '',
    'A booking platform. `packages/api` is a Fastify service over Postgres, and `packages/web`',
    'is the Nuxt front end that talks to it.',
    '',
    '## Commands',
    '',
    '- `pnpm install`, then `pnpm dev` to run both packages.',
    '- `pnpm test` runs the unit tests; `pnpm test:e2e` runs Playwright against a built web app.',
    '- `pnpm lint && pnpm typecheck` must pass before a pull request is opened.',
    '',
    '## Conventions',
    '',
    '- TypeScript strict mode everywhere. Do not introduce `any`; narrow instead.',
    '- A database change is a new migration under `packages/api/migrations/`. Never edit a',
    '  migration that has been deployed.',
    '- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).',
    '- Keep pull requests to one concern. Refactors go in their own pull request.',
  ]);
  write(root, 'CLAUDE.md', [
    '# Tidewater',
    '',
    'A booking platform. `packages/api` is a Fastify service over Postgres, and `packages/web`',
    'is the Nuxt front end that talks to it.',
    '',
    '## Commands',
    '',
    '- `pnpm install`, then `pnpm dev` to run both packages.',
    '- `pnpm test` runs the unit tests.',
    '- `pnpm lint` must pass before a pull request is opened.',
    '',
    '## Conventions',
    '',
    '- TypeScript strict mode everywhere. Do not introduce `any`; narrow instead.',
    '- Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`).',
  ]);
  write(root, '.github/copilot-instructions.md', [
    '# Copilot instructions',
    '',
    'Read `AGENTS.md` first; it holds the commands and conventions.',
    '',
    'When suggesting a change to `packages/api`, include the migration and the updated',
    'OpenAPI document in the same change.',
  ]);
  write(root, '.github/instructions/tests.instructions.md', [
    '---',
    'applyTo: "**/*.test.ts"',
    '---',
    '',
    '- Name each test after the behavior it proves, not the function it calls.',
    '- Build test data with the factories under `test/factories/`; do not inline fixtures.',
    '- One assertion per behavior. A test that asserts five things is five tests.',
  ]);
  write(root, 'packages/api/AGENTS.md', [
    '# API package',
    '',
    '- Every route has a JSON schema for its body and its reply; Fastify validates both.',
    '- Errors are thrown as `HttpError` from `src/errors.ts`, never as bare strings.',
    '- Run `pnpm --filter api migrate` after pulling a change that adds a migration.',
  ]);
  write(root, 'packages/web/CLAUDE.md', [
    '# Web package',
    '',
    '- Components live in `app/components/`, one per file, named in PascalCase.',
    '- Fetch through the typed client in `app/api/`; never call `fetch` directly from a page.',
    '- Every page has a Playwright test under `e2e/` that loads it and checks the heading.',
  ]);

  // Skills. `changelog` is the comparison pair; the others give the inventory
  // the shape a team's skills directory has — skills with scripts and
  // references beside them, skills kept where only one product reads them,
  // and one inside a package — and enough of them that the Skill tab fills
  // the captured page.
  write(root, '.agents/skills/changelog/SKILL.md', CHANGELOG_SKILL_CURRENT);
  write(root, '.claude/skills/changelog/SKILL.md', CHANGELOG_SKILL_STALE);
  write(root, '.agents/skills/db-migration/SKILL.md', [
    '---',
    'name: db-migration',
    'description: Add a Postgres migration to packages/api and the model change that goes with it.',
    '---',
    '',
    '# Database migration',
    '',
    'Run `scripts/new-migration.sh <name>` to create the timestamped file, then fill in both',
    'directions. `reference.md` lists the column types and the naming rules.',
    '',
    '- Write the `down` migration before the `up` one; it is the one nobody tests.',
    '- A column that will be dropped is made nullable in one release and dropped in the next.',
    '- Run `pnpm --filter api migrate` and `pnpm --filter api test` before committing.',
  ]);
  write(root, '.agents/skills/db-migration/scripts/new-migration.sh', [
    '#!/bin/sh',
    'set -eu',
    'name="$1"',
    'stamp="$(date -u +%Y%m%d%H%M%S)"',
    'file="packages/api/migrations/${stamp}_${name}.sql"',
    'printf -- "-- up\\n\\n-- down\\n" > "$file"',
    'echo "$file"',
  ]);
  write(root, '.agents/skills/db-migration/reference.md', [
    '# Migration reference',
    '',
    '| Use | Column type |',
    '| --- | --- |',
    '| identifiers | `uuid` |',
    '| money | `numeric(12, 2)` |',
    '| timestamps | `timestamptz` |',
    '',
    'Tables are plural snake_case; foreign keys are `<table_singular>_id`.',
  ]);
  write(root, '.agents/skills/e2e-debugging/SKILL.md', [
    '---',
    'name: e2e-debugging',
    'description: Diagnose a failing Playwright test from its trace before changing the test.',
    '---',
    '',
    '# Debugging an end-to-end test',
    '',
    '1. Open the trace: `pnpm exec playwright show-trace test-results/<test>/trace.zip`.',
    '2. Find the last action that succeeded and the selector the failing one used.',
    '3. Decide whether the page changed or the test did, and say which before editing.',
    '',
    'A test is not fixed by widening its timeout.',
  ]);
  write(root, '.claude/skills/review-pr/SKILL.md', [
    '---',
    'name: review-pr',
    'description: Review a pull request the way this team reviews — behavior first, style last.',
    '---',
    '',
    '# Pull request review',
    '',
    'Read the description, then the tests, then the change. For each finding, name the input',
    'that produces the wrong result. Skip anything a formatter or linter already owns.',
  ]);
  write(root, '.github/skills/release/SKILL.md', [
    '---',
    'name: release',
    'description: Cut a release from main once the changelog entry is in.',
    '---',
    '',
    '# Release',
    '',
    '1. Confirm `CHANGELOG.md` has an entry for the version being released.',
    '2. Tag the commit: `git tag -a v<version> -m "v<version>"` and push the tag.',
    '3. Watch the `release` workflow; it builds, publishes, and opens the GitHub release.',
  ]);
  write(root, '.agents/skills/api-endpoint/SKILL.md', [
    '---',
    'name: api-endpoint',
    'description: Add a Fastify route to packages/api with its schema, handler, and test.',
    '---',
    '',
    '# New API endpoint',
    '',
    'Start from `templates/route.ts`. A route is three files: the schema under `src/schemas/`,',
    'the handler under `src/routes/`, and the test beside the handler.',
    '',
    '- Register the route in `src/app.ts`; nothing is auto-loaded.',
    '- Regenerate the OpenAPI document with the `openapi` skill once the route works.',
  ]);
  write(root, '.agents/skills/api-endpoint/templates/route.ts', [
    "import type { FastifyPluginAsync } from 'fastify';",
    '',
    'export const route: FastifyPluginAsync = async (app) => {',
    "  app.get('/example', { schema: {} }, async () => ({ ok: true }));",
    '};',
  ]);
  write(root, '.agents/skills/openapi/SKILL.md', [
    '---',
    'name: openapi',
    'description: Regenerate the OpenAPI document and the typed client packages/web uses.',
    '---',
    '',
    '1. `pnpm --filter api openapi` writes `packages/api/openapi.json` from the route schemas.',
    '2. `pnpm --filter web generate:client` rewrites `app/api/client.ts` from it.',
    '3. Commit both files in the same change as the route.',
  ]);
  write(root, '.agents/skills/seed-data/SKILL.md', [
    '---',
    'name: seed-data',
    'description: Load the development database with a realistic set of bookings.',
    '---',
    '',
    'Run `pnpm --filter api seed`. It is idempotent: it truncates the tables it owns first.',
    'Add a new kind of record to `seed/records.ts`, never to a migration.',
  ]);
  write(root, '.agents/skills/dependency-update/SKILL.md', [
    '---',
    'name: dependency-update',
    'description: Take a dependency update through the checks it needs before merging.',
    '---',
    '',
    '- A major bump reads the changelog first; note every breaking change in the pull request.',
    '- Run `pnpm test` and `pnpm test:e2e`; a lockfile-only change still runs both.',
  ]);
  write(root, '.claude/skills/component/SKILL.md', [
    '---',
    'name: component',
    'description: Scaffold a Nuxt component in packages/web with its unit test and story.',
    '---',
    '',
    'Create `app/components/<Name>.vue`, `app/components/<Name>.test.ts`, and',
    '`app/components/<Name>.stories.ts`. Props are typed with `defineProps<{ ... }>()`.',
  ]);
  write(root, '.claude/skills/perf-profile/SKILL.md', [
    '---',
    'name: perf-profile',
    'description: Profile a slow API request and report where the time goes.',
    '---',
    '',
    '1. Reproduce the request with `scripts/replay.sh <request id>`.',
    '2. Capture a CPU profile with `node --cpu-prof` and open it in Chrome DevTools.',
    '3. Report the three widest frames and the query behind each.',
  ]);
  write(root, '.claude/skills/perf-profile/scripts/replay.sh', [
    '#!/bin/sh',
    'set -eu',
    'curl -s "http://localhost:3000/_replay/$1"',
  ]);
  write(root, '.github/skills/incident-report/SKILL.md', [
    '---',
    'name: incident-report',
    'description: Write the post-incident report from the timeline in the incident channel.',
    '---',
    '',
    'Sections, in order: impact, timeline, root cause, what we are changing. No names.',
  ]);
  write(root, 'packages/web/.claude/skills/storybook/SKILL.md', [
    '---',
    'name: storybook',
    'description: Add or update a Storybook story for a component in this package.',
    '---',
    '',
    'One story per visual state. Run `pnpm storybook` and check the story renders before',
    'committing.',
  ]);

  // MCP. One `github` server declared by every product's carrier, a
  // `playwright` server by two of them, and a `postgres` server by one: what
  // the name-headed MCP inventory is for.
  writeJson(root, '.mcp.json', {
    mcpServers: {
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '${GITHUB_TOKEN}' },
      },
      playwright: {
        command: 'npx',
        args: ['@playwright/mcp@latest'],
      },
      postgres: {
        command: 'npx',
        args: [
          '-y',
          '@modelcontextprotocol/server-postgres',
          'postgresql://localhost:5432/tidewater_dev',
        ],
      },
    },
  });
  write(root, '.vscode/mcp.json', [
    '{',
    '  // Shared with the team; personal servers go in the user profile.',
    '  "servers": {',
    '    "github": {',
    '      "command": "npx",',
    '      "args": ["-y", "@modelcontextprotocol/server-github"],',
    '      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "${input:github-token}" }',
    '    },',
    '    "playwright": {',
    '      "command": "npx",',
    '      "args": ["@playwright/mcp@latest", "--headless"]',
    '    }',
    '  },',
    '  "inputs": [',
    '    { "id": "github-token", "type": "promptString", "description": "GitHub token", "password": true }',
    '  ]',
    '}',
  ]);
  write(root, '.codex/config.toml', [
    '# Codex settings shared through the repository.',
    'model = "gpt-5.4-codex"',
    'approval_policy = "on-request"',
    'sandbox_mode = "workspace-write"',
    '',
    '[mcp_servers.github]',
    'command = "npx"',
    'args = ["-y", "@modelcontextprotocol/server-github"]',
    '',
    '[mcp_servers.github.env]',
    'GITHUB_PERSONAL_ACCESS_TOKEN = "${GITHUB_TOKEN}"',
    '',
    '[mcp_servers.playwright]',
    'command = "npx"',
    'args = ["@playwright/mcp@latest"]',
  ]);
  writeJson(root, '.agents/mcp_config.json', {
    mcpServers: {
      github: {
        command: 'npx',
        args: ['-y', '@modelcontextprotocol/server-github'],
        env: { GITHUB_PERSONAL_ACCESS_TOKEN: '$GITHUB_TOKEN' },
      },
    },
  });

  // Agents. One `code-reviewer` written for each product that has its own
  // format, and one Claude-only agent beside them.
  write(root, '.claude/agents/code-reviewer.md', [
    '---',
    'name: code-reviewer',
    'description: Reviews a change for defects before it is committed. Use after finishing a task.',
    'tools: Read, Grep, Glob, Bash',
    'model: sonnet',
    '---',
    '',
    'You review the diff of the current branch against `main`.',
    '',
    'For each finding, state the input that produces the wrong behavior and where the fix goes.',
    'Do not comment on formatting; Prettier owns it.',
  ]);
  write(root, '.github/agents/code-reviewer.md', [
    '---',
    'name: Code reviewer',
    'description: Reviews a pull request for defects before it is merged.',
    'tools:',
    '  - read',
    '  - search',
    '---',
    '',
    'Review the pull request diff. For each finding, state the input that produces the wrong',
    'behavior and where the fix goes. Do not comment on formatting; Prettier owns it.',
  ]);
  write(root, '.codex/agents/code-reviewer.toml', [
    'name = "code-reviewer"',
    'description = "Reviews a change for defects before it is committed."',
    'model = "gpt-5.4-codex"',
    '',
    '[permissions]',
    'file_system = "read"',
  ]);
  write(root, '.agents/agents/code-reviewer.md', [
    '---',
    'name: code-reviewer',
    'description: Reviews a change for defects before it is committed.',
    'subagent: true',
    '---',
    '',
    'Review the diff of the current branch against `main`. For each finding, state the input',
    'that produces the wrong behavior and where the fix goes.',
  ]);
  write(root, '.claude/agents/migration-author.md', [
    '---',
    'name: migration-author',
    'description: Writes the Postgres migration for a model change, both directions.',
    'tools: Read, Write, Bash',
    '---',
    '',
    'Use the `db-migration` skill. Write the `down` migration first, then the `up` one, then run',
    'the migration against the development database and report the result.',
  ]);

  // Prompts and commands. One command kept for two products, and one Claude
  // command on its own.
  write(root, '.claude/commands/fix-issue.md', [
    '---',
    'description: Fix a GitHub issue by number',
    'argument-hint: "<issue number>"',
    'allowed-tools: Bash(gh issue view:*), Bash(gh pr create:*)',
    '---',
    '',
    'Read issue #$ARGUMENTS with `gh issue view`, reproduce it with a failing test, fix it, and',
    'open a pull request that closes the issue.',
  ]);
  write(root, '.github/prompts/fix-issue.prompt.md', [
    '---',
    'description: Fix a GitHub issue by number',
    'agent: agent',
    '---',
    '',
    'Read the issue, reproduce it with a failing test, fix it, and open a pull request that',
    'closes the issue.',
  ]);
  write(root, '.claude/commands/release-checklist.md', [
    '---',
    'description: Walk the release checklist and report what is left',
    '---',
    '',
    '# Release checklist',
    '',
    '- [ ] `CHANGELOG.md` has an entry for this version',
    '- [ ] `pnpm test` and `pnpm test:e2e` pass on `main`',
    '- [ ] The staging deployment has been checked by someone other than the author',
    '',
    'Report each item as done or not, with the evidence.',
  ]);

  // Rules. Path-scoped and unconditional Claude rules, and Antigravity rules
  // in each of its activation modes.
  write(root, '.claude/rules/api.md', [
    '---',
    'paths:',
    '  - "packages/api/**/*.ts"',
    '---',
    '',
    '# API rules',
    '',
    '- Every route validates its body and its reply with a JSON schema.',
    '- A query that can return more than 100 rows is paginated.',
  ]);
  write(root, '.claude/rules/testing.md', [
    '# Testing',
    '',
    '- Name each test after the behavior it proves.',
    '- Build test data with the factories under `test/factories/`.',
  ]);
  write(root, '.agents/rules/security.md', [
    '---',
    'activation: always',
    '---',
    '',
    '# Security',
    '',
    '- Never log a request body that can carry a card number or a password.',
    '- Secrets come from the environment; nothing under `config/` holds one.',
  ]);
  write(root, '.agents/rules/migrations.md', [
    '---',
    'activation: glob',
    'glob: "packages/api/migrations/**"',
    '---',
    '',
    'A migration that has been deployed is never edited. Write a new one.',
  ]);

  // Permissions and hooks share Claude's settings document; the other
  // products keep theirs in files of their own.
  writeJson(root, '.claude/settings.json', {
    permissions: {
      allow: ['Bash(pnpm test:*)', 'Bash(pnpm lint)', 'Bash(pnpm typecheck)', 'Bash(gh pr view:*)'],
      deny: ['Bash(git push --force:*)', 'Read(./.env)', 'Read(./.env.*)'],
    },
    hooks: {
      PostToolUse: [
        {
          matcher: 'Write|Edit',
          hooks: [
            {
              type: 'command',
              command: 'jq -r .tool_input.file_path | xargs pnpm exec prettier --write',
            },
          ],
        },
      ],
    },
  });
  write(root, '.codex/rules/default.rules', [
    'prefix_rule(',
    '    pattern = ["pnpm", "test"],',
    '    decision = "allow",',
    '    justification = "The unit tests are safe to run without asking.",',
    ')',
    '',
    'prefix_rule(',
    '    pattern = ["git", "push", "--force"],',
    '    decision = "forbidden",',
    '    justification = "History on shared branches is never rewritten.",',
    ')',
  ]);
  writeJson(root, '.github/hooks/format.json', {
    version: 1,
    description: 'Format what the agent edited.',
    hooks: {
      postToolUse: [{ type: 'command', command: './scripts/format-changed.sh' }],
    },
  });
  writeJson(root, '.codex/hooks.json', {
    hooks: {
      PostToolUse: [
        {
          matcher: '^apply_patch$',
          hooks: [{ type: 'command', command: './scripts/format-changed.sh', timeout: 30 }],
        },
      ],
    },
  });
  writeJson(root, '.agents/hooks.json', {
    'format-on-write': {
      PostToolUse: [
        {
          matcher: 'write_file',
          hooks: [{ type: 'command', command: './scripts/format-changed.sh', timeout: 30 }],
        },
      ],
    },
  });

  // Plugins: the team's own marketplace with one plugin kept in the repository.
  writeJson(root, '.claude-plugin/marketplace.json', {
    name: 'tidewater',
    owner: { name: 'Tidewater platform team' },
    plugins: [
      {
        name: 'tidewater-conventions',
        source: './plugins/tidewater-conventions',
        description: 'The pull request template and review checklist as a skill.',
        version: '1.2.0',
      },
    ],
  });
  writeJson(root, 'plugins/tidewater-conventions/.claude-plugin/plugin.json', {
    name: 'tidewater-conventions',
    version: '1.2.0',
    description: 'The pull request template and review checklist as a skill.',
    author: { name: 'Tidewater platform team' },
  });
  write(root, 'plugins/tidewater-conventions/skills/pr-template/SKILL.md', [
    '---',
    'name: pr-template',
    'description: Write a pull request description in the shape this team reviews.',
    '---',
    '',
    'Open with what changes for a user, then why. List anything a reviewer cannot reproduce.',
  ]);

  // Output style.
  write(root, '.claude/output-styles/terse.md', [
    '---',
    'name: Terse',
    'description: Answers first, reasons second, nothing else',
    'keep-coding-instructions: true',
    '---',
    '',
    'Lead with the answer in one sentence. Follow with the reasons, at most three.',
    'No preamble, no summary of what was just said.',
  ]);
}
