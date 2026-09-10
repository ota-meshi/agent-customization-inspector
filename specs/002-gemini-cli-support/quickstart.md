# Quickstart: Support Gemini CLI

[日本語](quickstart.ja.md)

**Feature**: [spec.md](spec.md) | **Plan**: [plan.md](plan.md) | **Date**: 2026-09-09

How to see the fourth tool working and how to prove it. Setup, gates, and the general
launch procedure are the parent's
([001 quickstart.md](../001-inspect-agent-customizations/quickstart.md)); only what this
feature adds is here. Every launch below passes `--no-open --port 0` (AGENTS.md
§ Agent-started process policy), and every launched host is stopped before the turn ends.

## Prerequisites

The parent quickstart's install and build. The end-to-end suite launches `dist/cli.mjs`, so
rebuild before trusting a browser run:

```bash
pnpm run build
```

## See it in a fixture repository

The fixture builder gains Gemini CLI trees; `scripts/serve-fixture.ts` gains one row per
kind. Serve the instructions fixture and open the printed URL:

```bash
pnpm run start:fixture gemini-instructions -- --no-open --port 0
```

Expected on the inventory: the root `GEMINI.md` row lists two marks — GitHub Copilot and
Gemini CLI — and the nested `packages/api/GEMINI.md` row lists Gemini CLI alone on the
`packages/api/**` range. The legend names four products.

```bash
pnpm run start:fixture gemini-settings -- --no-open --port 0
```

Expected: `.gemini/settings.json` appears under settings; each `mcpServers` name appears as
an MCP row citing that file; the file appears under hooks. No process is spawned and no
server is contacted, which the zero-activation tests assert.

```bash
pnpm run start:fixture gemini-commands -- --no-open --port 0
```

Expected: `.gemini/commands/git/commit.toml` is the `git:commit` row; its detail shows the
TOML as written, `!{...}` block included.

```bash
pnpm run start:fixture gemini-context-filename -- --no-open --port 0
```

Expected: with `context.fileName: ["AGENTS.md", "CONTEXT.md"]` in `.gemini/settings.json`,
every `AGENTS.md` and `CONTEXT.md` carries a Gemini CLI mark, and the root `GEMINI.md`
carries Copilot's mark alone.

## See the fifth member

Build the Global home fixtures (the builder gains a `gemini` member) and launch with the
environment pointing at them:

```bash
GEMINI_CLI_HOME=/path/to/fixture-home node dist/cli.mjs --no-open --port 0
```

Open the consent page. Expected: five proposed directories, the fourth being
`/path/to/fixture-home/.gemini` — the join the reference documents — and, after confirming,
a `Gemini home` Source publishing exactly `GEMINI.md`, `settings.json`,
`skills/*/SKILL.md`, `agents/*.md`, `commands/**/*.toml`, and `policies/*.toml`. A
`GEMINI_CLI_HOME=` (empty) launch shows that entry as present-empty with no root.

## Automated verification

Run the gates that own each change. Unit and contract first:

```bash
pnpm run test:unit
```

```bash
pnpm run test:contract
```

The contract run must fail before the frozen counts, the digest table, the version literals,
and the five-member tuples are updated, and pass after — watch it fail (AGENTS.md
§ Implementation simplicity policy). Then the suites that hold four-member tuples and the
documentation gate:

```bash
pnpm run test:integration
```

```bash
pnpm run test:security
```

```bash
pnpm run test:docs
```

`test:docs` runs the containment gate: both `docs/which-files-are-listed*.md` pages must
name every literal segment the Gemini CLI rules admit and must mention `GEMINI.md` and
`context.fileName` for the derived rule.

End-to-end, name the specs the change reaches and run Chromium only:

```bash
npx playwright test --project=chromium tests/e2e/gemini-instructions-inventory.spec.ts tests/e2e/gemini-instructions-detail.spec.ts tests/e2e/gemini-settings-inventory.spec.ts tests/e2e/gemini-settings-detail.spec.ts tests/e2e/gemini-commands-inventory.spec.ts tests/e2e/gemini-commands-detail.spec.ts tests/e2e/gemini-skills-list.spec.ts tests/e2e/gemini-skills-detail.spec.ts tests/e2e/gemini-custom-agents-inventory.spec.ts tests/e2e/gemini-custom-agents-detail.spec.ts tests/e2e/gemini-context-filename.spec.ts tests/e2e/gemini-same-name-skill.spec.ts tests/e2e/global-gemini-admission.spec.ts tests/e2e/global-consent-preview.spec.ts tests/e2e/inventory-rows.spec.ts
```

`inventory-rows.spec.ts` is named because it pins the mark set per row; the legend and
filter assertions live there too.

## Official-source check

The one command that makes outbound requests, run once when the records are written and
again before the release candidate:

```bash
pnpm run check:official-sources -- --network
```

Expected: every `google.gemini-cli.*` URL answers `200` on `geminicli.com` without a
redirect, and every cited heading resolves to exactly one served heading. The two paths
that redirect (`/docs/core/policy-engine/`) or 404 (`/docs/cli/configuration/`) are not
cited.

## Release evidence

The outcome manifest's fixture bytes change, so `manifestVersion` advances to 4 and every
affected digest and the canonical digest are recomputed:

```bash
pnpm run test:contract -- outcome-fixture-manifest
```

Then record in `validation.md`, both languages: the new manifest version and digest, the
executed case IDs with Gemini CLI rows for SC-003, SC-004, and SC-005, and — for SC-001 and
SC-006 — whether the designated file's ground truth changed and therefore whether a run was
owed (spec.md § Clarifications).

## Package

```bash
pnpm run build && pnpm run verify:package
```

`test:package`'s notices test needs no new row: the Gemini mark comes from
`@iconify-json/simple-icons`, which the bundle already carries.
