# Implementation Plan: Support Gemini CLI

[日本語](plan.ja.md)

**Branch**: `002-gemini-cli-support` | **Date**: 2026-09-09 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-gemini-cli-support/spec.md`

## Summary

Add Gemini CLI as the fourth supported tool by giving it what the other three have — a
vendor registry directory, compiled units per kind, a vendor contract, a Global member, a
mark, a label, and documentation — and by amending the parent specification's fixed
"three tools" and "four members" statements to four and five. Nothing structural is new:
every Gemini CLI format already has a parser, every kind it publishes already has a compiled
shape, and the configuration-read stage Codex uses is what the context filename derivation
runs in. The two decisions that shape the code are research.md § 2 — the context file is one
derived rule that owns the default, because `context.fileName` replaces `GEMINI.md` rather
than adding to it — and § 3 — the member descriptor states whether a home setting names the
root or its parent, because `GEMINI_CLI_HOME` names the parent. Extensions are excluded, the
Global member admits `GEMINI.md` by its default name alone, the 20-session evaluation is
repeated only if the designated file's ground truth changes, and the tool is named
`Gemini CLI` (spec.md § Clarifications).

## Technical Context

**Language/Version**: The parent plan's baseline unchanged — Node `^24.11.0 || ^26.0.0`,
TypeScript 6.0.3, Vue 3.5.39.

**Primary Dependencies**: Unchanged. No package is added: `smol-toml` parses the command and
policy files, `strip-json-comments` plus `JSON.parse` the settings carrier,
`vfile-matter`/`yaml` the skill and agent frontmatter, and `@iconify-json/simple-icons`
already carries the `googlegemini` glyph. Every range stays caret; the lockfile does not
move for this feature.

**Storage**: None; session memory only, as the parent.

**Testing**: Vitest projects `unit`, `contract`, `integration`, `security`, `documentation`,
`package`; Playwright end-to-end, Chromium only for agent-run verification, named specs
only. Fixture builders under `tests/fixtures/repositories/` and `tests/fixtures/global-homes/`.

**Target Platform**: Unchanged — the three certified browsers, Node on the three CI
operating systems.

**Project Type**: The one package: Nuxt SPA in `src/app/`, Node CLI and host in
`src/server/`, shared contracts and registries in `src/shared/`.

**Performance Goals**: None specific; the scan gains one configuration read and eight rule
plans, all of the shapes already measured.

**Constraints**: The parent's — no execution, no MCP connection, no outbound request, no
source mutation, no numeric limits. The vendor contract's presentation allowlist is frozen
by digest once implementation begins. Every Gemini CLI evidence record cites a heading that
`check:official-sources -- --network` resolves.

**Scale/Scope**: One vendor directory of five registry modules, eight compiled units and a
catalog module, one JSON-parser branch, one member descriptor field, one label and one mark,
a vendor contract in two languages, documentation edits in two languages, fixtures, and
tests. The parent specification's amendments are enumerated in research.md § 10.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- [x] **Root-cause design**: One derivation owns the context filename instead of a static
      rule plus a suppression seam (research.md § 2); the member descriptor states what a
      setting names instead of a special case in the capture loop (§ 3); the lifecycle-rank
      ladder is derived from the member order instead of extended by one branch (§ 4). No
      kind, parser, package, or mechanism is added.
- [x] **Readable implementation**: The vendor's answers live in `src/shared/registries/gemini/`
      and `src/server/inspection/rules/**/gemini.ts`, shaped like the three existing vendors,
      so a reader carries what one taught them. The non-obvious decisions with rationale
      comments are named: the join in the member descriptor, the derived rule's default, the
      JSONC measurement on the parser entry, the `experimental` qualifier on agent records,
      and the excluded workspace policy tier.
- [x] **Complete verification**: Unit tests per compiled unit and for the descriptor's two
      derivations; contract tests over the registry (counts, IDs, evidence, freeze); an
      integration scan over Gemini fixtures including near misses and the two-tool and
      three-tool files; security zero-activation over hook commands, shell-block commands,
      and MCP declarations; the containment gate; end-to-end specs per kind and for the
      fifth member; the official-source check over the new records (spec.md QR-002).
- [x] **Documentation parity**: Listed in research.md § 10 and § Project Structure below, each
      with its `.ja.md`: the vendor contract, official-sources, runtime-composition, the
      parent spec and data-model and http-api, the readme, `docs/which-files-are-listed`,
      the study inputs, and `validation.md`.
- [x] **Safe boundaries**: The Gemini CLI home is a fifth consented member under the same
      preview, admission, retry, and disable rules; credentials, the trust record, `.env`,
      session state, and installed extensions below it are never read (spec.md QR-003).
      Trust is a recorded condition, never projected onto a recognition. No DTO shape
      changes except the closed enum and the entry count; the bundled browser is the only
      client.
- [x] **Welcoming participation**: The fixture launcher gains `gemini-*` rows so a
      contributor can see each surface; the legend names the product; the mark carries its
      accessible name; diagnostics for an unparsable settings file name the file.

### Post-design re-check

All six gates hold after Phase 1. The one design cost that could have been read as
complexity — a derived rule with a default — is the removal of a mechanism, not an addition:
it replaces a static rule and a withdrawal seam with one plan builder (research.md § 2).
Complexity Tracking is therefore empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-gemini-cli-support/
├── plan.md / plan.ja.md
├── research.md / research.ja.md
├── data-model.md / data-model.ja.md
├── quickstart.md / quickstart.ja.md
├── spec.md / spec.ja.md
├── checklists/requirements.md / requirements.ja.md
├── contracts/vendors/gemini-cli.md / gemini-cli.ja.md   # moves beside the three vendor contracts with the registry
└── tasks.md / tasks.ja.md                               # /speckit-tasks output
```

The vendor contract is authored here as design input and moved, unchanged, to
`specs/001-inspect-agent-customizations/contracts/vendors/` by the task that ships the
registry, when its presentation-allowlist digests are recorded in the official-sources
contract and the freeze test. Authoring it at its destination now would put an undigested
fourth table in a directory whose gate expects three.

### Source Code (repository root)

```text
src/
├── shared/
│   ├── entities.ts                       # SupportedTool + 'gemini'; SUPPORTED_TOOL_ORDER; SUPPORTED_TOOL_TEXT
│   ├── api-text.ts                       # GLOBAL_MEMBER_TEXT, SOURCE_SELECTOR_TEXT entries
│   ├── api-types.ts                      # doc comments: five entries
│   ├── diagnostics.ts                    # lifecycleOwnerRank derived from GLOBAL_MEMBER_ORDER
│   ├── skill-collision.ts                # SKILL_COLLISION_POLICY gemini entry
│   └── registries/
│       ├── identifier-types.ts           # GeminiBehaviorId, GeminiRuleId, GeminiStrategyId, GoogleSourceId
│       ├── behavior-types.ts / behavior-text.ts   # VendorSurface 'gemini-cli'
│       ├── inspection-rules.ts / vendor-behaviors.ts / runtime-composition.ts / relations.ts   # spreads
│       ├── skill-resolution.ts           # SAME_NAME_SKILL_RESOLUTIONS gemini entry
│       ├── shared/relations.ts           # the managed-remote-state exclusion names Gemini's system behavior
│       └── gemini/
│           ├── rules.ts
│           ├── behaviors.ts
│           ├── strategies.ts
│           ├── relations.ts
│           └── skill-collision.ts
├── server/
│   ├── host/global-consent.ts            # GLOBAL_TOOL_HOME_ORDER, descriptor with settingNames, member ports, version literals
│   ├── host/devframe-app.ts              # GLOBAL_RULES_BY_MEMBER gemini + agents spread
│   └── inspection/
│       ├── scan.ts                       # GEMINI_REPOSITORY_RULES spread; readGeminiConfiguredContextPlans reader
│       ├── parsers/json.ts               # acceptsComments: Gemini branch
│       └── rules/
│           ├── gemini.ts                 # catalogs + other-kind unit
│           ├── vendor/gemini.ts          # GeminiCompiledRule, GeminiCompiledDerivedRule
│           ├── instructions/gemini.ts    # derived unit + reader; Global unit
│           ├── skills/gemini.ts
│           ├── agents/gemini.ts
│           ├── mcp/gemini.ts
│           ├── hooks/gemini.ts
│           ├── prompts-and-commands/gemini.ts
│           └── permissions/gemini.ts
└── app/
    ├── components/ToolMark.vue           # googlegemini glyph, --aci-brand-gemini rule
    ├── styles/main.css                   # --aci-brand-gemini token, forced-colors line
    └── components/consent/GlobalConsentPreview.vue   # five directories; the shared-home sentence names three readers

tests/
├── unit/inspection/gemini-metadata.test.ts, rules.test.ts, seed-parsers.test.ts
├── unit/shared/entities.test.ts          # 'gemini' becomes a member
├── contract/inspection-rules.test.ts, vendor-behaviors.test.ts, runtime-composition.test.ts,
│   presentation-allowlist-freeze.test.ts, http-api-global.test.ts, outcome-fixture-manifest.test.ts
├── integration/repository-scan.test.ts, global-boundaries.test.ts
├── security/global-zero-activation.test.ts
├── documentation/cross-artifact.test.ts  # containment gate catalogs; derived-rule freeze; 002 task-count freeze
├── e2e/gemini-*.spec.ts, global-gemini-admission.spec.ts, inventory-rows.spec.ts
└── fixtures/
    ├── repositories/build-fixtures.ts    # gemini trees
    ├── global-homes/build-fixtures.ts    # gemini member, GEMINI_CLI_HOME map
    ├── conformance/*.json                # regenerated
    └── outcomes/manifest.json, manifest.sha256   # version 4

scripts/serve-fixture.ts                  # gemini-* rows
docs/which-files-are-listed.md / .ja.md   # Gemini CLI sections; shared home "Read by"
README.md / README.ja.md                  # four tools; five directories
specs/001-inspect-agent-customizations/   # amendments per research.md § 10; contracts/official-sources*.md host + rows + digest row;
                                          # contracts/runtime-composition*.md Gemini section; contracts/vendors/gemini-cli*.md (moved)
.changeset/*.md                           # minor
```

**Structure Decision**: The existing single-package layout, extended by one vendor in every
family that already has three members. No directory is added outside the per-vendor
`gemini/` module and `gemini.ts` files each family already keys by vendor name.

## Implementation Boundaries

- **Read set**: Exactly the selectors in the vendor contract's Inspector tables. The
  derived rule's names come from the repository `.gemini/settings.json` alone; the Global
  member's context file is `GEMINI.md`. Nothing under `extensions/`, and no `.env`,
  `trustedFolders.json`, `.geminiignore`, or hook script, is opened.
- **Recognition, not loading**: Trust, the experimental agent gate, `mcp.allowed`/
  `mcp.excluded`, `skills`/`agents` overrides, and extension merging are conditions on the
  behavior records, never on a recognition (parent FR-009).
- **One file, several products**: A root `GEMINI.md` keeps Copilot's recognition and gains
  Gemini CLI's; `.agents/skills/` files carry three. The comment on
  `copilot.repo.instructions.gemini-root` that calls the row Copilot-only is deleted with
  the registry.
- **Freezes**: The counts, tuples, digests, version literals, and manifest version move in
  the same change as the code, and each is watched failing first (research.md § 9).
- **Family conversion**: Every `Record<SupportedTool, …>` compiles only once `gemini` is
  present; the two order arrays are covered by their gates; every "three"/"four" in copy
  and comments that counts tools or members is re-read; research.md § 9 names the gates,
  and the copy sites are the consent preview, the source controls, the mark component, and
  the source-name and detail-route modules.

## Complexity Tracking

No constitution gate is violated; the table is intentionally empty.
