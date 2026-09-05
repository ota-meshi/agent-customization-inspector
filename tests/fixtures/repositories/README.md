# Repository fixture trees

[日本語](README.ja.md)

`build-fixtures.ts` writes every repository this project's suites inspect. One builder is
one deterministic tree: given the same root it writes the same bytes, so a suite asserting
an exact path list, an exact digest, or an exact row order can be re-run without a golden
file beside it.

## What these trees are for

The allowlist is the product's whole read authority, so a fixture exists to make its edges
observable rather than assumed. Every admitted path in a tree has a **near miss** one
segment away from it — `.claude/skills/deploy/SKILL.md` beside `.claude/skills/SKILL.md`,
`.mcp.json` beside `.mcp.json.bak`, `.codex/config.toml` beside
`packages/api/.codex/config.toml` — so a selector that is one segment too loose fails a test
instead of quietly inventorying more of a reader's repository than the contract permits.

A near miss is per product, because an allowlist is: `docs/AGENTS.md` is a near miss for
Codex, which reads the root file alone, and an admitted instruction file for Copilot, whose
CLI reads the same filename at any depth. The result types name each one against the rule
it misses rather than against the tree as a whole. The near misses are the point of the
module; the builder result types name them (`nearMissPaths`) so a suite can assert that
nothing admitted them.

Two rules hold for every tree:

- **The harness is the only writer.** The product never mutates an inspected tree (FR-023),
  and a suite that finds a tree changed after a scan has found a defect rather than a stale
  fixture.
- **Nothing here is content the product re-reads as truth.** The credential-shaped literal
  (`FIXTURE_SECRET_LITERAL`) and the environment reference (`FIXTURE_ENVIRONMENT_REFERENCE`)
  are written precisely so a test can prove they reach no inventory row, no summary, and no
  resolved value — the product shows them where a detail is explicitly requested and
  nowhere else (FR-025, FR-026, FR-027).

## The families

| Family | Builders | What the tree makes observable |
| --- | --- | --- |
| All-supported | `buildAllCustomizationKindFixture` | Every kind this release publishes in one root, which is what `pnpm run start:fixture` serves by default — including one cross-Source group per comparing kind, paired with the Global homes fixture so `--inspect-personal-setup` shows two comparison entries on those rows |
| Multi-tool | `buildAllToolSkillFixture`, `buildAllVendorInstructionFixture`, `buildUnifiedHookFixture`, `buildUnifiedPluginFixture`, `buildPriorityMcpFixture` | One physical file two or three products read: one read, one recognition per product, and one row that names them all (FR-004) |
| Cross-source | `buildCrossSourceGroupFixture` | For each comparing kind, one group name spelled by two Repository files here and by two personal files in the Global homes fixture, so with the personal setup enabled each family block of that row offers its own comparison entry (`pnpm run start:fixture cross-source`) |
| Per-vendor | `buildCodex*`, `buildClaude*`, `buildCopilot*` | One product's documented locations for one kind, with that product's own near misses beside them |
| Near-miss | every builder's `nearMissPaths` | Paths one segment from an admitted one that no rule may admit — subdirectory copies, `.bak` suffixes, nested `SKILL.md`, User-scope filenames inside the repository |
| Empty | `buildAllToolSkillFixture` (`.agents/skills/empty/SKILL.md`), `buildCodexHookFixture` | A file admitted and read that declares nothing: a finding with a row of its own, not an absence |
| Derived | `buildCodexInstructionFixture`, `buildAllVendorInstructionFixture` | Configured fallback names, whose only path into the walk is the configuration read — never filename inference |
| Malformed | `buildUnifiedHookFixture` (`.github/hooks/draft.json`), `buildCopilotSettingsFixture` and `buildClaudePermissionsFixture` (their `malformedRoot` trees), `buildCodexMcpFixture` (a non-table `mcp_servers` entry) | An extraction that fails all-or-nothing: the file keeps its diagnostic in a `partial` generation while every unaffected file stays complete (FR-028), and a malformed declaration inside a document that parses is omitted whole |
| Secret | `buildAllToolSkillFixture` (`.agents/skills/secretive/`), the hook and MCP builders | A literal credential and an unresolved `${VAR}` reference inside authored content |
| Performance | `tests/performance/harness.ts` (`buildSc002Fixture`) | The SC-002 measurement tree — 100,000 entries, 500 matching files — built from the checked-in manifest and verified by digest before and after a run |

The performance tree is deliberately not here: it is generated from
`tests/performance/sc002-fixture-manifest.json` and bound to that manifest's canonical
digest, so its content is a measurement input rather than an authored repository.

## Using a tree

From a suite, call the builder and clean up after:

```ts
const fixture = buildAllToolSkillFixture('aci-my-suite');
// … scan `fixture.root`, assert against `fixture.expectedSkillPaths` …
await rm(fixture.root, { recursive: true, force: true });
```

Every builder takes an optional prefix and an optional root. With no root it creates one
under the OS temporary directory; with a root it writes into that directory, which is how
the composite builders layer several families into one tree.

To look at a tree in the product, serve it:

```bash
pnpm run build && pnpm run start:fixture all
```

`scripts/serve-fixture.ts` lists every name it accepts; the tree it writes stays under
`.tmp/fixtures/<name>/` for inspection until the next launch of that same name replaces it.

## Adding to a tree

- Add the positive case and its near miss in the same change, and name the near miss in the
  builder's result type. A positive case with no near miss beside it tests that the product
  reads a file, not that it reads only that file.
- Keep the bytes deterministic: no timestamps, no random names, no host paths inside file
  content.
- When a builder is composed into `buildAllCustomizationKindFixture`, check the paths it
  writes against the builders already there. Where two builders write one path — the
  `.claude/settings*.json` pair, the `.codex/config.toml` layer — the composite says which
  write is the one the tree shows and why.
