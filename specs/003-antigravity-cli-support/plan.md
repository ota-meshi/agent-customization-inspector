# Implementation Plan: Support Antigravity CLI

[日本語](plan.ja.md)

**Branch**: `003-antigravity-cli-support` | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/003-antigravity-cli-support/spec.md`

## Summary

Make Antigravity CLI the fourth supported tool in place of the one the vendor has folded into
it, by giving it what the other three have — a vendor registry directory, compiled units per
kind, a vendor contract, a Global member, a mark, a label, and documentation — and by removing
the records, fixtures, and documentation of the tool it replaces so that no surface names a
product this release does not support. The member set does not move: the fifth member is the
same `~/.gemini` directory, because that is where Antigravity CLI keeps its personal setup.

Two decisions shape the code. The skill kind gains a second compiled shape whose row unit is one
Markdown file, as its own unit beside the directory-shaped one rather than as optional fields on
it (research.md § 2). And the member's root is derived from the home directory alone, which
removes the environment property, the descriptor row, and the `settingNames` field that existed
for the previous vendor (§ 4). Everything else reuses a shape the codebase already has: the
Markdown instruction and custom-agent units, the shared MCP server-map reading over a standalone
strict-JSON carrier, the shared hook and permissions readings, and the settings carrier with
several recognitions over one selector.

## Technical Context

**Language/Version**: The parent plan's baseline unchanged — Node `^24.11.0 || ^26.0.0`,
TypeScript 6.0.3, Vue 3.5.39.

**Primary Dependencies**: One collection is added for the vendor mark — `@iconify-json/thesvg`
(MIT), for `thesvg:antigravity-google` — because `simple-icons` does not carry the product's
glyph at its latest published version (research.md § 8). The change that first imports the glyph
carries the icon policy's three edits together: the devDependency, the notices row, and the
collection's license text at `licenses/`. `smol-toml` loses its command-file caller and keeps
its Codex ones. Every range stays caret; the lockfile moves for that collection alone.

**Storage**: None; session memory only, as the parent.

**Testing**: Vitest projects `unit`, `contract`, `integration`, `security`, `documentation`,
`package`; Playwright end-to-end, Chromium only for agent-run verification, named specs only.
Fixture builders under `tests/fixtures/repositories/` and `tests/fixtures/global-homes/`.

**Target Platform**: Unchanged — a local loopback host and the bundled browser client.

**Project Type**: Single project, as the parent.

**Performance Goals**: Unchanged. The repository walk gains no traversal: the tool's repository
locations sit under `.agents/` and the repository root, both already walked.

**Constraints**: The allowlist discipline, the non-execution guarantees, the consent model, and
the closed kind set are the parent's and are unchanged. No kind is added.

**Scale/Scope**: Four supported tools, five Global members, eleven kinds.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Root-cause design**: The file-shaped skill is a unit of its own rather than optional
      fields widening the directory-shaped record (research.md § 2); the member's root comes
      from the home directory as the shared agent home's already does, which deletes a field
      rather than adding a branch (§ 4); the records of the replaced vendor are removed rather
      than left as history (§ 9). No kind, parser, package, or mechanism is added.
- [x] **Readable implementation**: The vendor's answers live in
      `src/shared/registries/antigravity/` and `src/server/inspection/rules/**/antigravity.ts`,
      shaped like the three existing vendors, so a reader carries what one taught them. The
      non-obvious decisions carry rationale comments: why the skill kind has two units, why the
      member has no environment property, why a legacy MCP key is shown without comment, and
      why the mark is the glyph it is.
- [x] **Complete verification**: Unit tests per compiled unit and for both skill shapes;
      contract tests over the registry counts, IDs, evidence, and freezes; an integration scan
      over the fixtures including near misses and the files two and three products read;
      security zero-activation over hook declarations, permission rules, and MCP declarations;
      the containment gate; end-to-end specs per kind and for the fifth member; the
      official-source check over the new records (spec.md QR-003).
- [x] **Documentation parity**: Listed in research.md § 11 and § Project Structure below, each
      with its `.ja.md`: the vendor contract, official-sources, runtime-composition, the parent
      spec and data-model and http-api, the readme, `docs/which-files-are-listed`, the study
      inputs, and `validation.md`.
- [x] **Safe boundaries**: The home is a consented member under the same preview, admission,
      retry, and disable rules; credentials, session and history state, and installed plugin
      copies below it are never read (spec.md QR-005). No DTO shape changes: the member enum
      keeps five values and one of them is renamed, and the bundled browser is the only client.
- [x] **Welcoming participation**: The fixture launcher gains `antigravity-*` rows so a
      contributor can see each surface; the legend names the product; the mark carries its
      accessible name; a diagnostic for an unparsable carrier names the file.

### Post-design re-check

All six gates hold after Phase 1. The one design cost that could be read as complexity — a
second compiled shape for one kind — is what the row-unit rule requires rather than an
addition of the author's choosing, and it removes more than it adds: the descriptor field, the
environment property, and the derivation the replaced vendor needed all go. Complexity Tracking
is therefore empty.

## Project Structure

### Documentation (this feature)

```text
specs/003-antigravity-cli-support/
├── spec.md, spec.ja.md
├── plan.md, plan.ja.md
├── research.md, research.ja.md
├── data-model.md, data-model.ja.md
├── quickstart.md, quickstart.ja.md
├── contracts/vendors/antigravity-cli.md, antigravity-cli.ja.md
└── checklists/requirements.md, requirements.ja.md
```

The vendor contract is authored here and moves to
`specs/001-inspect-agent-customizations/contracts/vendors/` in the change that ships the rules,
which is where the shipped vendor contracts live and where the gates read them. The contract of
the replaced vendor is deleted in the same change.

### Source Code (repository root)

```text
src/shared/registries/
├── antigravity/          # rules, behaviors, strategies, relations, skill collisions
└── (gemini/ removed)
src/server/inspection/rules/
├── skills/               # gains the file-shaped compiled unit beside the directory one
├── instructions/, agents/, mcp/, hooks/, permissions/, settings/
└── **/antigravity.ts     # this vendor's units; **/gemini.ts removed
src/server/host/global-consent.ts   # three environment properties; no settingNames field
src/shared/entities.ts, api-text.ts, registries/behavior-text.ts  # labels and orders
src/app/components/ToolMark.vue     # the vendor mark
src/app/pages/skills/detail/…       # the file-shaped skill's panel-only detail
docs/which-files-are-listed.md, .ja.md
tests/fixtures/repositories/, tests/fixtures/global-homes/, tests/fixtures/outcomes/
```

## Implementation Boundaries

- **Read set**: Exactly the selectors in the vendor contract's Inspector tables. Nothing under
  `antigravity-cli/plugins/`, and no credential, session, history, or cache file, is opened. No
  `.gemini/` path in a repository is opened by any rule this release ships.
- **Recognition, not loading**: A permission rule, a hook declaration, and a legacy MCP key are
  recorded as what the file declares, never evaluated, resolved, or classified as accepted by
  the vendor (parent FR-009).
- **One file, several products**: The root `GEMINI.md` keeps Copilot's recognition and gains
  this tool's; the root `AGENTS.md` gains it beside Copilot's and Codex's. `.agents/skills/`
  now holds two shapes, which share a row when they share a name.
- **Removal is part of the change**: The replaced vendor's module, contract, records, fixtures,
  label, mark, documentation sections, evidence entries, frozen counts, and outcome-manifest
  cases go in the same change that adds this one, and `specs/002-gemini-cli-support` and its
  unpublished changeset go with them. The parent artifacts that cite that feature directory are
  re-pointed at this one.
- **Freezes**: The counts, tuples, digests, version literals, and manifest version move in the
  same change as the code, and each is watched failing first.
- **Family conversion**: Every `Record<SupportedTool, …>` compiles only once the member is
  renamed; the order arrays are covered by their gates; every count of tools or members in copy
  and comments is re-read.

## Complexity Tracking

No constitution gate is violated; the table is intentionally empty.
