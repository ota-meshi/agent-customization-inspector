# Quickstart: Support Antigravity CLI

[日本語](quickstart.ja.md)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-10

How to see this feature working and how to prove it. Every command runs from the repository
root. A host an agent starts always takes `--no-open --port 0` and is stopped before the turn
ends (AGENTS.md § Agent-started process policy).

## Prerequisites

```bash
pnpm install
pnpm run build
```

The end-to-end suites launch the packaged CLI, so a stale `dist/` measures the previous build.

## See it in a fixture repository

The fixture launcher builds a tree and serves it. The rows named below are the ones this
feature adds; `all` builds every tree at once.

```bash
pnpm run start:fixture antigravity-skills --no-open --port 0
```

Open the URL the launch line prints and check, in order:

1. The tool filter and the legend name four tools, the fourth `Antigravity CLI`, with its own
   mark carrying the product name as its accessible name. Look at the four marks together at the
   size a row draws them: the new one should sit at the same optical weight as the three beside
   it, neither heavier nor a step lighter.
2. The skills inventory lists `.agents/skills/deploy.md` as a skill of Antigravity CLI, with no
   supporting-file count beside it, and lists `.agents/skills/release/SKILL.md` naming all three
   products that read a skill directory, Antigravity CLI among them.
3. A name spelled in both shapes is one row whose definitions name each file and the product
   that reads it, with no precedence stated between them.
4. Opening the file-shaped skill shows the skill panel alone: no Files tab and no tab strip, and
   the file's own text under `Source` at the end of that panel. `.agents/skills/summarize.md`,
   whose frontmatter block is not YAML, shows the same panel with its diagnostic and that
   viewer and nothing else.

Then the other trees:

```bash
pnpm run start:fixture antigravity-rules --no-open --port 0
pnpm run start:fixture antigravity-hooks --no-open --port 0
pnpm run start:fixture antigravity-mcp --no-open --port 0
pnpm run start:fixture antigravity-agents --no-open --port 0
pnpm run start:fixture antigravity-instructions --no-open --port 0
```

- The rules inventory lists one row per Markdown file below `.agents/rules/`, each showing the
  activation its frontmatter declares — always on, manual, model decision, or a glob — as
  written, with no pattern matched against anything. The same tree's `.agent/rules/` file is
  listed under the superseded spelling; its `.agent/skills/legacy.md` neighbour is not, because
  no page documents the flat shape at that spelling.
- The hooks inventory lists `.agents/hooks.json` with its event map, matcher groups, and the
  `enabled` flag one hook carries, and runs nothing.

- The MCP inventory lists one row per name declared in `.agents/mcp_config.json`, and a remote
  server's `serverUrl` and a legacy `url` both appear exactly as written.
- The agents inventory lists `.agents/agents/<name>.md` and `.agents/agents/<name>/agent.md`.
- The root `GEMINI.md` and the root `AGENTS.md` each appear once, naming every product that
  reads them; a nested `GEMINI.md` names no Antigravity CLI recognition.

Stop the host by the process ID the launch recorded, and confirm the port is free.

## See the fifth member

```bash
pnpm run start:fixture all --inspect-personal-setup --no-open --port 0
```

The personal-setup page lists five directories before reading any of them, the fourth labelled
`Antigravity home` with its root path beside it. No environment property changes that root: a
session started with a variable set for the other three homes moves those three and leaves this
one at `.gemini` below the home directory. After consent, the home's context file, MCP carrier,
agents, skills, and settings are listed, and the installed plugin copies below it are not.

## Automated verification

```bash
pnpm run typecheck
pnpm run lint
pnpm run format:check
pnpm exec vitest run
```

The suites that own this feature's claims:

- `unit` — the vendor's rules and compiled units, including the file-shaped skill unit, the
  directory-shaped one, the workspace rules and hook carriers, and the
  selectors that reject each near miss.
- `contract` — the rule, behavior, strategy, and relationship counts, the Global rule-ID list,
  the presentation-allowlist digests, and the outcome manifest.
- `integration` — a scan of each fixture tree, the five-member consent transaction, and the
  Global boundary's per-member read set.
- `security` — zero execution, zero MCP connection, zero outbound request, and zero mutation
  across fixtures holding hook declarations, permission rules, and MCP declarations.
- `documentation` — both languages of every artifact, and the containment gate over
  `docs/which-files-are-listed.md`.
- `package` — the packaged tree and its launch.

End-to-end, name the specs the change reaches rather than the whole suite:

```bash
pnpm exec playwright test --project=chromium tests/e2e/antigravity-skills-detail.spec.ts
pnpm exec playwright test --project=chromium tests/e2e/antigravity-rules-detail.spec.ts
pnpm exec playwright test --project=chromium tests/e2e/antigravity-hooks-detail.spec.ts
```

## Official-source check

```bash
pnpm run check:official-sources -- --network
```

Every cited Antigravity CLI URL must answer directly on `antigravity.google` without
redirecting, and every cited section must resolve. What a vanished heading means, and whether
the cited text still establishes the maintained paraphrase, stay a reviewer's judgment.

## Release evidence

The outcome manifest gains one case per `(tool, customization file type, admitted source form)`
this tool contributes, which is a denominator change:
the manifest version increments and the canonical digest is re-recorded, with the run recorded in
`validation.md` in both languages.

The parent's first-use evaluation is run again for this change, because the designated file's
recognizing tools move from two to three. Its inputs under
`tests/usability/sc001-sc006-study-inputs/` name the tools this release supports and drop the
environment property that goes, and `validation.md` records the run.

## Package

```bash
pnpm run build
pnpm run verify:package
```

No dependency is added unless the mark needs a collection the bundle does not carry, in which
case the icon policy's three edits arrive together: the devDependency, the notices row, and the
license text.
