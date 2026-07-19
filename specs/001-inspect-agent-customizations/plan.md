# Implementation Plan: Inspect Agent Customizations

[日本語](plan.ja.md)

**Branch**: `dev` | **Date**: 2026-07-19 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-inspect-agent-customizations/spec.md`

## Summary

Build a read-only local inspector, launched with `npx`, that inventories and compares
allowlisted customization files for GitHub Copilot, Claude Code, and OpenAI Codex without
activating any inspected content. Use one cohesive package: a Nuxt client SPA in `app/`,
a Node CLI and local inspection host in `src/`, serializable contracts in `shared/`, a
small project-owned `bin.mjs` integrity bootstrap, and one published `dist/` tree. A fixed clean step removes only
package-owned prior `.output/`, `.build/`, and `dist/` trees. `nuxt build` produces the
static browser application in its standard `.output/public` staging tree; fixed assembly
steps validate and copy its root-absolute assets into `dist/public`, record exact
inline-script CSP hashes, and copy a manifest-closed tsdown CLI/parser-Worker bundle from
`.build/server`. The pure Node.js `src/inspection/safe-fs.ts` layer is the sole path by
which inspected sources are enumerated or read. It uses registry-directed `node:fs/promises`
traversal, canonical-path checks, opaque scan tickets, and same-`FileHandle` identity and
metadata checks before and after reads. The browser presents complete authored
source in a read-only Monaco editor and uses Monaco's diff editor for source comparison;
recognition metadata is matched by tool/kind/field/occurrence and compares exact authored literals in
ordinary Vue components, never parser-normalized display values.

The security boundary is strict: the browser never reads the filesystem,
the Node host never dynamically imports customization files, and the initial release has
no static-export, MCP, remote-host, or automatic-watch mode. A loopback-only host sends
inert DTOs through a versioned HTTP API protected by a random per-process capability. The
API returns complete authored source only to a capability-authenticated explicit detail
request; the bundled browser makes that request or constructs a comparison only after its
client-memory sensitive-content acknowledgement. That acknowledgement is a presentation
invariant, not an API authorization factor. Environment-variable references remain literal text and
never authorize process-environment lookup or substitution. Explicit scans use the frozen
inspection path allowlist, reject symlink traversal, use inert best-effort
parsers, and atomically replace the in-memory generation so stale generation-owned details
and comparisons cannot survive a successful rescan. A fatal rescan publishes none of its
uncommitted results and retains the last committed snapshot with a per-Source stale-failure
entry and actionable lifecycle diagnostic until that Source is refreshed or removed.

Customization discovery is maintained as four contract-versioned registries: documented
vendor lookup behavior (`behaviorId`), Inspector matcher/read policy (`ruleId`), runtime
composition strategies (`strategyId`), and official source records (`sourceId`). The common
allowlist contract owns matcher grammar and safety
invariants; separate Copilot, Claude, and Codex contracts own vendor behavior and
tool-specific rules; the composition contract owns ordering and relationship-only rules;
and the source registry owns exact official URL/section evidence and review metadata.
Repository and User/Global behavior use separate tables, and Copilot VS Code, CLI, and
Cloud surfaces are never collapsed into one lookup model.

Every inventory and API path exposed to users is a Source-relative Path computed from the
one root of its owning Source. It is repository-relative only for the Repository Source;
each Global Source uses its own admitted tool-home root and never shares a path namespace
with another Source.

Every Inspector Repository matcher is explicitly based at the launch root and rendered
with `./`; a bare `**/` is invalid. `./**/` means only downward Inspector descendant
inventory, never vendor traversal. Static candidates, vendor-specific one-edge
derivations, relationship-only references, and exclusions remain distinct. File existence
is kept separate from product surface, runtime root/`cwd`, target matching, trust,
enablement, selection, installation, managed policy, and external runtime facts, so the
inventory never masquerades as an effective agent configuration. Origin-file-less hosted or
runtime inputs are evidence-linked `SourceConditionFact` records attached to the
relevant Source; they authorize no I/O and create no synthetic file, path, source text,
relationship origin, or comparison target. Closed context
relationships show which independently inventoried instructions, rules, skills, MCP
declarations, or memory scopes an agent may reference without following a path; Codex
instruction-byte limits and excluded non-file inputs stay explicit condition facts.

## Technical Context

**Language/Version**: Node.js 24.18.0 LTS development/build baseline; package runtime
compatibility contract `^24.11.0 || ^26.0.0`, exactly
`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`; TypeScript 6.0.3; Vue 3.5.39. The six
Node/OS floor jobs certify the two declared lower bounds rather than enumerating every
compatible minor/patch release. Versions below either floor, Node 25, and future majors are
outside the contract.

**Primary Dependencies**: Nuxt 4.4.8, Vue Router 5.2.0, tsdown 0.22.8, Vite 7.3.6
(latest Nuxt-compatible release), `gunshi` 0.37.0, `yaml` 2.9.0,
`jsonc-parser` 3.3.1, `smol-toml` 1.7.0, and `monaco-editor` 0.55.1. The first lockfile
MUST revalidate these exact stable versions; prereleases and incompatible newer majors
are not considered eligible “latest” versions.
That revalidation is a planning gate, not permission for a task-local package or version
edit. If any selected package or version changes, implementation stops before configuration
work, the compatibility decision is reviewed again, every dependency-baseline-bearing
English/Japanese research, plan, quickstart, and task artifact is synchronized, and
`/speckit-plan` followed by `/speckit-tasks` is rerun before work resumes. Configuration,
CI, release, and package-policy
instructions MUST use only that one synchronized baseline.

`src/cli.ts` uses only Gunshi's stable root `define`/`cli` API. It defines a negatable
`open` boolean with a true default to provide `--no-open`, enables
`strict: true`, explicitly rejects every positional/rest argument before binding, awaits
`cli()`, and maps its validation `AggregateError` to fixed actionable output plus a nonzero exit. Built-in
help/version are handled without binding. The production entry does not import
`gunshi/agent`, lazy commands, custom plugins, or experimental parser combinators.

**Storage**: No durable application storage. Session state, inspected file bytes, complete
authored-source DTOs, diagnostics, the sensitive-content warning acknowledgement, and
comparison selection exist only in process/browser memory.

**Testing**: Vitest 4.1.10 with `@vitest/coverage-v8` 4.1.10, Nuxt Test Utils 4.0.3,
Vue Test Utils 2.4.11, happy-dom 20.10.6, Playwright 1.61.1, and
`@axe-core/playwright` 4.12.1; fixture-driven unit, contract, integration, packaging,
performance, security, browser, and manual accessibility checks. `vitest.config.ts`
defines named unit, contract, integration, security, package, performance, and coverage
projects. The security project includes exactly `tests/security/**/*.test.ts`, including
the T996 Global zero-activation test, and every other project excludes that root so each
root security test runs exactly once; security tests under `tests/integration/security/`
remain owned by the integration project. The browser release gate
runs the complete primary-workflow and accessibility suite against the exact Chromium,
Firefox, and WebKit revisions installed by the pinned Playwright version as a reproducible
automated certification baseline, not as an assertion that the startup helper selects one of
those revisions. The bilingual `contracts/accessibility-acceptance.md` and
`contracts/accessibility-acceptance.ja.md` matrices inventory all
55 WCAG 2.2 Level A/AA criteria, freeze an Applicable or criterion-rationale-backed
Not-applicable state and required automated/manual evidence for every row, and use the
nonzero Applicable-row count as the SC-008 denominator. The release gate passes only when
every required check for every Applicable row passes, every Not-applicable rationale is
revalidated, all four keyboard workflows pass, and the English/Japanese records remain
semantically equivalent; severity labels cannot waive a failure. Criterion-specific stable
IDs bind automated checks to exact E2E test titles and manual checks to each row's expected
observation. The closed manual matrix uses the packed tarball, both locales, all three
supported OS/browser/assistive-technology cells, exact responsive/zoom/spacing profiles,
visual modes, workflow states, and input profiles. Actual version/revision values are frozen
before execution; any release or matrix change reruns every manual check, and no applicable
cell may be sampled or silently omitted. The maintained usability
study kit uses one 20-person first-time cohort for SC-001 then SC-006, fixed prompts
and moderator limits, failure-as-unsuccessful accounting without replacements, the defined
timer boundaries, and a four-field SC-006 response form scored against fixed ground truth.
After that timed response, the same participants attempt standardized comparison and Global-
consent tasks. Moderators record objective workflow outcomes and predefined safety events;
every safety event is automatically critical. Only a suspected product-caused workflow
blocker needs two independent rubric classifications, and a disagreement counts as critical
without a third adjudicator. The gate passes only after all 20 participants attempt all four
primary workflows with no automatic or reviewer-confirmed critical issue. The maintainer team,
not ordinary contributors, owns recruitment, compensation funding, moderation, review,
consent/privacy handling, supplied equipment/session support, bilingual materials, and
accessibility accommodations through a published study plan. Each study session records the
actual default handler or its unavailability and, when resolvable, the actual browser family
and revision. If automatic opening is disabled, unsupported, or fails; the handler or resolved
browser is unavailable or cannot be identified; or the resolved browser falls outside the
release-certification baseline, the same enrolled session uses and records the documented
manual-opening fallback in a certified browser, remains in the fixed denominator, and does
not replace the participant. The default handler itself need not be certified.

**Target Platform**: The supported runtime contract is the complete declared Node.js 24/26
engine range on `ubuntu-24.04` x64, `macos-15` arm64, and `windows-2025` x64. The exact
six-job Cartesian product of the `24.11.0` and `26.0.0` floors with those OS/architecture
targets is the mandatory lower-bound release-certification sample, not the full list of
compatible Node minor/patch releases. One platform-independent tarball is built on
`ubuntu-24.04` x64 with the Node.js 24.18.0 development/build baseline, receives a separate
build/package smoke check there, and is installed unchanged in all six floor jobs. Each
release records the resolved runner-image identifier and actual Node version. Other OS/
architecture targets and Node versions outside the declared engine range are unsupported.
Browser release certification runs the complete browser and accessibility suite against the
exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 on
`ubuntu-24.04` x64 with Node.js 24.18.0. Those revisions are a finite reproducible
certification baseline, not an exhaustive list of user browsers. The fixed OS helper passes
the printed URL to the user's default handler without selecting or validating its family or
version; helper success is not browser-compatibility evidence. A handler outside the
certification baseline, an unavailable handler, or an unidentifiable resolved browser leaves
automatic opening best-effort; the printed URL plus `--no-open`/manual opening in a certified
browser is the actionable fallback. Published project/dependency package payloads and project-authored installed
application code contain only platform-independent JavaScript application code and
declarative static/package data; they require no install script, runtime download, or end-user
compiler. Package-manager-generated `node_modules/.bin` symlink/`.cmd`/`.ps1` launchers are
payload-external interoperability metadata and receive a separate exact-target/content audit.
Development-only tooling is outside the product package and remains separately pinned/audited.
The server binds only to `127.0.0.1` and has no remote deployment mode.

**Project Type**: Single publishable ESM npm package containing a static Nuxt web client,
a Node CLI/local HTTP service, and shared serializable contracts. All project-authored
executable application code is JavaScript/TypeScript, and executable code in every published
package payload is JavaScript; generated
HTML/CSS, JSON manifests, documentation, and the license are permitted declarative package
artifacts. This FR-038 boundary does not misclassify third-party development/test tooling as
published application code.

**Performance Goals**: On the versioned, published profile in
`tests/performance/sc002-reference-profile.json`, visibly render a current-request status
that says queued, names an active phase, or reports complete/`partial` (contracted-partial only)/failed and is exposed to
assistive technology within 1 second, and render the complete inventory with its primary
list controls operable for one unchanged deterministic fixture containing 100,000 filesystem
entries and 500 matching files within 10 seconds in at least 9 of exactly 10 fresh-process
runs. A spinner, generic loading label, acknowledgement without scan state, unchanged
control, or prior-request status does not qualify. In each fresh process, wait for the
automatic initial Repository scan to reach a terminal state outside the measurement, then
dispatch exactly one explicit Repository rescan. Start both timers at that browser request,
capture its opaque `scanRequestId`, and stop them only for a qualifying status carrying that
ID and the operable inventory generation committed by that same request. An earlier status,
snapshot, or automatic-scan generation never qualifies. Exclude fixture construction,
`npx` download/install/process startup, and the automatic initial scan; do not deliberately
reset the operating-system filesystem cache between runs, and record the profile ID, exact
actual environment fields, fixture-manifest digest, request ID, and committed generation while omitting only personal
identifiers and absolute user paths. Any profile-field change starts a new non-comparable
measurement set. After the complete
inventory becomes operable in each run, perform one standardized filter action and one
standardized item-selection action. Measure each from browser input dispatch until the
corresponding filtered results or selected-state feedback is visibly rendered and operable;
at least 9 of the same 10 runs must keep both interactions below 100 ms.
SC-002 passes only if one common subset of at least 9 of those exact 10 runs satisfies all
four thresholds: current-request status within 1 second, complete operable inventory within
10 seconds, filter feedback below 100 ms, and selection feedback below 100 ms. Separate
9-of-10 subsets for different thresholds do not qualify.

**Constraints**: Inspected customization must cause no execution, child process, dynamic
import, network request, MCP connection, or product-issued source mutation. The inspected-
source I/O boundary never requests a write/append/create/truncate open, write, truncate,
create, rename, delete, link, mode/ownership/time/xattr/ACL change, or equivalent platform
mutation. Tests instrument those calls and compare content, length, identity/link state,
mode, mtime, ctime, and observable xattrs/ACLs; an OS-only read-side atime update is recorded
separately and is neither a failure nor proof of mutation. The separately constrained startup
launcher owns the only permitted product-initiated child process: its fixed OS browser helper.
The helper receives no inspection-derived content or path in argv or environment, no
authored value or user-supplied command, and no environment-selected handler. It may copy
only the closed ambient platform-key set directly from the launch environment; lexical
equality between an ambient value and a Source root does not change its provenance or grant
read authority. The session remains usable when automatic opening is disabled, unsupported,
or fails.
No boundary-external bytes are accepted or published;
no exposed symlink is intentionally followed, and detected path changes commit no bytes;
the documented active source-root/ancestor mutator and, only where effective `O_NOFOLLOW`
is unavailable, active final-component mutator remain outside the current threat model;
explicit opt-in before Global reads; the capability-authenticated loopback API returns
complete authored source only for explicit detail requests, while the bundled browser does
not issue those requests or construct a comparison before its in-memory sensitive-content
acknowledgement; environment-variable references are never resolved or substituted; inert
text rendering only. The acknowledgement resets on reload or client purge and never travels
to the API. Displayed metadata fields and relationship kinds
must both belong to the maintained closed presentation-allowlist row for the supported
`(tool, kind)` and be recognized by the exact extractor for the actual admitted source form;
entries failing either gate remain available only in complete source text and are never
inferred as metadata or relationships. Product surfaces are limited to syntactic
parsing, exact authored-literal extraction, mechanical typed decoding, frozen-catalog
classification, and projection of documented order, scope, condition, selection, and
reference facts. Inventory, Detail, Comparison, Global controls, Diagnostics, Source
Condition Facts, APIs, CLI output, and documentation never interpret or rank natural-
language meaning, decide validity/correctness/effectiveness/compliance/quality, advise
remediation, or lint, synchronize, convert, format, or fix customization content. Internal
validation of Inspector-owned manifests, registries, DTOs, and invariants is not a judgment
about a customization file. WCAG 2.2 Level A/AA acceptance uses the complete
bilingual criterion matrix above; English/Japanese documentation remains semantically
equivalent. The Inspector defines no product-specific ceiling for file bytes, aggregate
bytes, discovered files or entries, parser depth or nodes, diagnostics, graph records,
messages, request or response bodies, package assets, or retained session data. Capacity is
inherited from the supported Node.js runtime, parser libraries, operating system,
filesystem, browser, and current execution environment. A recoverable capacity or resource
failure is reported as an operational/read or extraction failure; it never becomes a
valid/invalid verdict, lint finding, or evidence that a customization artifact is
well-formed or malformed. A capacity or resource failure never authorizes a partial
generation: it aborts the attempt, commits no item, Source, recognition, derived result,
scan-result record or response, or generation, and leaves only the previously committed graph
available. Contracted partial publication is reserved for deterministic,
entry-local, non-capacity failures after complete traversal and serializable assembly.

Relationship projection remains functionally limited to one direct hop from each
originating recognition and is non-recursive. This is a semantic/read-authority boundary,
not a resource quota. Generic relationships have zero read authority, and relationship
processing never follows a target or projects that target's relationships through the
originating edge. If parser, recognizer, or composition output would create a nested or
transitive relationship, the Inspector omits that projection before target access, retains
the eligible direct relationships and complete authored source, and emits an actionable,
source-value-free relationship diagnostic.
The authorized browser uses a one-second liveness heartbeat, a 750 ms request timeout, and
a two-second monotonic memory lease with immediate hidden/page lifecycle purge.
Monaco receives complete authored source. If the browser or editor runtime cannot compute a
diff, the UI keeps the complete read-only side-by-side source available and reports an
actionable comparison failure without treating either artifact as valid or invalid. HTTP
delivery never truncates an API DTO.

Typed derivation uses the closed `DerivationProgram` schema and only direct edges from an
exact static seed provenance. A derived provenance cannot seed another derivation edge,
while an independent static provenance on the same file remains eligible. Values used to
derive paths must satisfy the supported runtime and platform path representation. After
complete traversal, a deterministic entry-local non-capacity parser/path failure may omit
that derivation under the contracted-partial outcome before target access. A memory,
capacity, or other environment-resource failure aborts the attempt, commits no item,
recognition, derived artifact, scan-result record or response, or generation, and leaves only
the previously committed snapshot available.

The coordinator imposes no product-defined wall-clock scan cutoff. Global disable, process
shutdown, and explicit operation cancellation irrevocably revoke publication authority.
Any outstanding Node.js filesystem promise then becomes cleanup-only: late bytes, results,
DTOs, and operational events are discarded. The API and liveness endpoint remain responsive
while the event loop can serve them, but physical cleanup cannot be promised before an
uncancellable kernel operation settles.

Trusted package manifests use the same closed schemas at build, packed-package, and runtime
verification. Both manifests reject unknown keys, verify the recursively exact declared
file set, compare every declared length with the actual file length, and verify hashes before
import or host bind. Their size and record capacity is inherited from Node.js, the
filesystem, and the current build/runtime environment; a recoverable inability to read,
parse, hash, or retain a manifest or listed asset fails closed before import or bind.

Operational event records use one closed logger schema containing only fixed codes and
opaque session/source/file/scan/operation IDs. No operational event contains a Source-
relative/absolute/canonical path, root, filename, inspected content or metadata, authored
value, capability, body, raw parser/system error, or exception string. An authenticated
file-scoped `Diagnostic` DTO may retain its minimum Source-relative Path, but no log
projection may copy it. Fixed CLI help/version text, the one launch-URL line, and fixed
actionable startup warnings are presentation output rather than operational events and still
receive inspected-content/path/value negative tests.

**Scale/Scope**: One local user, exactly one Repository source rooted at launch `cwd`, zero
to three opted-in tool-specific Global sources (at most one each for Copilot, Claude, and
Codex), exactly one root per Source, and exactly two files in a comparison. Inventory size
is governed by the supported runtime and execution environment rather than a product-defined
item ceiling.

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- [x] **Root-cause design**: One package and exactly one immutable root per Source solve the
      launch and inspection problem without a workspace split, repository picker, root
      discovery, static export, file watcher, or speculative extension system.
- [x] **Readable implementation**: `host`, `inspection/rules`, `recognizers`, `parsers`,
      and `session` own separate invariants; vendor behavior, Inspector
      matchers, runtime composition, and official evidence have four closed registries,
      while vendor-specific policy remains isolated and shared behavior stays small and
      explicit.
- [x] **Complete verification**: The test layout covers unit, contract, integration,
      security, package, performance, end-to-end, error, boundary, accessibility, and adversarial
      safety scenarios, including all four user stories, the published SC-002 profile/status
      request/generation protocol, environment-induced resource failures,
      product-issued mutation and OS-atime separation, path/content-free operational logs,
      the product-wide FR-032 negative boundary, the complete bilingual 55-row WCAG Level
      A/AA acceptance matrix, and FR-039/SC-009 origin-file-less Source Condition Facts.
- [x] **Documentation parity**: Every Phase 0/1 artifact has an English canonical file and
      a semantically equivalent `*.ja.md` companion. Implementation must update both user
      and contributor guides, all vendor/Repository/User/Global/surface tables, official
      evidence, security boundaries, and diagnostics.
- [x] **Safe boundaries**: The design freezes read candidates, authenticates local API
      requests, and separates capability-authenticated API access from the bundled browser's
      in-memory sensitive-content acknowledgement. Deliberately inspected complete content
      remains inert, local, session-only, and absent from persistence, egress, and logs.
      Authenticated diagnostics may carry only actionable location fields, while
      operational events contain fixed codes and opaque IDs with no path, content, metadata,
      capability, body, or raw error. Resource capacity is inherited from Node.js, parser
      libraries, the OS, filesystem, browser, and execution environment; recoverable
      failures, authority revocation, late cleanup, and fail-closed behavior are explicit. Product-issued
      mutation is prohibited and distinguished from OS-only atime effects. The design
      rejects every Node-observable link or unverifiable boundary, discards revoked/late
      bytes, and records non-atomic, platform-unobservable, and physically uncancellable-I/O
      residual risks with resolution paths.
- [x] **Welcoming participation**: One-package setup, reproducible pinned tooling,
      objective expected results, keyboard-first workflows, actionable errors, and
      automated plus manual accessibility gates keep the project approachable. The
      maintainer-owned release study publishes its necessity, accountable owner, funding,
      support, privacy, accessibility, and rerun policy and never shifts recruitment or
      review obligations to ordinary contributors.

### Post-design re-check

The data model distinguishes physical files, candidate provenances, documentation status,
and runtime applicability facts. The HTTP contract returns complete authored source only
to a capability-authenticated explicit detail request; the bundled SPA makes that request or
constructs comparison content only after its client-memory warning gate. The API neither
receives nor persists acknowledgement. It provides no masking or reveal workflow, never
resolves environment-variable references, and emits only metadata
fields and relationship kinds that belong to the maintained closed presentation-allowlist
row and are recognized by the exact extractor for the actual admitted source form. The matcher contract
permits only explicit static or vendor-specific one-edge
derived candidates; relationships, components, vendor locators, and excluded inputs cannot
expand the read boundary. Relationship projection is limited to direct edges one hop from
each origin, is non-recursive, has zero read authority, and reports any attempted nested/transitive
projection with an actionable diagnostic before target access. The quickstart covers every stable behavior, rule, strategy, and
source ID, official-source drift review, the Repository `./` grammar and bare-`**/`
rejection, all required quality gates, and all four end-to-end stories. Monaco is
client-only, same-origin, and model-lifetime scoped; its own diff engine avoids a
duplicate dependency while exact authored metadata comparison stays explicit. The
project-owned browser launcher removes the shell-bearing `open` package and confines the sole
permitted product child process to a fixed startup OS helper that receives no inspection-derived
content/path, authored value, user command, or environment-selected handler. It copies only the
closed ambient platform-key set directly from the launch environment; lexical equality with a
Source root changes no provenance and grants no authority. Package gates
audit the root tarball plus the installed exact production closure for JavaScript-only
application code, lifecycle/build/download paths, selectors, and native/binary artifacts;
third-party development/test tooling remains outside the published FR-038 boundary. The Node.js-only
verification limitation is recorded with its active-mutator/platform residual risk and the
concrete future public Node.js filesystem API or OS-enforced snapshot/sandbox resolution path required by the
constitution. The same residual record covers the lack of hard cancellation for a stalled
kernel filesystem operation: disable, shutdown, or cancellation revokes publication
authority and discards late results, but physical completion awaits the operation. It is not
treated as passing-test proof or an implicit waiver. No unresolved
clarification or known constitutional violation remains.

## Project Structure

### Documentation (this feature)

```text
specs/001-inspect-agent-customizations/
├── plan.md
├── plan.ja.md
├── research.md
├── research.ja.md
├── data-model.md
├── data-model.ja.md
├── quickstart.md
├── quickstart.ja.md
├── validation.md                     # Created during release-gate execution
├── validation.ja.md                  # Created with validation.md
├── contracts/
│   ├── accessibility-acceptance.md
│   ├── accessibility-acceptance.ja.md
│   ├── http-api.md
│   ├── http-api.ja.md
│   ├── inspection-path-allowlist.md
│   ├── inspection-path-allowlist.ja.md
│   ├── official-sources.md
│   ├── official-sources.ja.md
│   ├── runtime-composition.md
│   ├── runtime-composition.ja.md
│   └── vendors/
│       ├── github-copilot.md
│       ├── github-copilot.ja.md
│       ├── claude-code.md
│       ├── claude-code.ja.md
│       ├── openai-codex.md
│       └── openai-codex.ja.md
├── tasks.md                         # Created later by /speckit-tasks
└── tasks.ja.md                      # Created with tasks.md
```

### Source Code (repository root)

```text
app/
├── app.vue
├── components/
│   ├── inventory/
│   ├── inspection/
│   ├── comparison/
│   ├── consent/
│   └── diagnostics/
├── composables/
│   ├── api.ts
│   ├── comparison.ts
│   ├── filters.ts
│   ├── liveness.ts
│   ├── monaco.ts
│   └── session.ts
├── pages/
│   ├── index.vue
│   ├── compare.vue
│   ├── global-consent.vue
│   └── files/[id].vue
├── locales/
│   ├── en.ts
│   └── ja.ts
└── styles/

src/
├── cli.ts
├── launch-browser.ts
├── host/
│   ├── api-router.ts
│   ├── capability.ts
│   ├── global-consent.ts
│   ├── operational-events.ts
│   ├── runtime-failures.ts
│   ├── server.ts
│   └── static-files.ts
├── inspection/
│   ├── safe-fs.ts
│   ├── scan.ts
│   ├── rules/
│   │   ├── registry.ts
│   │   ├── types.ts
│   │   ├── copilot.ts
│   │   ├── claude.ts
│   │   └── codex.ts
│   ├── applicability/
│   │   ├── conditions.ts
│   │   ├── context.ts
│   │   └── precedence.ts
│   ├── recognizers/
│   │   ├── claude.ts
│   │   ├── codex.ts
│   │   └── copilot.ts
│   └── parsers/
│       ├── json.ts
│       ├── markdown.ts
│       ├── pool.ts
│       ├── source-ranges.ts
│       ├── toml.ts
│       ├── worker.ts
│       └── yaml.ts
└── session/
    ├── scan-generation.ts
    ├── stale-failures.ts
    └── session.ts

shared/
├── api.ts
├── diagnostics.ts
├── entities.ts
├── operational-events.ts
├── runtime-failures.ts
└── registries/
    ├── vendor-behaviors.ts
    ├── inspection-rules.ts
    ├── runtime-composition.ts
    └── official-sources.ts

tests/
├── unit/
├── contract/
├── integration/
├── security/
├── package/
├── performance/
├── e2e/
├── usability/
└── fixtures/
    ├── conformance/
    │   ├── vendor-behaviors.json
    │   ├── inspection-rules.json
    │   ├── runtime-composition.json
    │   └── official-sources.json
    ├── repositories/
    ├── global-homes/
    ├── secrets/
    └── adversarial/

scripts/
├── clean-build-output.mjs
├── assemble-server-manifest.mjs
├── build-static-manifest.mjs
├── build-production-graph.mjs
├── verify-package-files.mjs
└── check-official-sources.ts

.github/workflows/
├── ci.yml
└── release.yml

bin.mjs
package.json
pnpm-lock.yaml
nuxt.config.ts
tsconfig.json
eslint.config.js
tsdown.config.ts
playwright.config.ts
vitest.config.ts
.gitignore
```

**Structure Decision**: Use a single-package `app`/`src`/`shared` separation because the UI
and CLI are released and versioned together. Nuxt is configured as an SPA (`ssr: false`)
with the static Nitro preset, `app.baseURL: '/'`, `app.buildAssetsDir: '/_nuxt/'`, no CDN
URL, explicit imports, and component auto-discovery disabled. Every nested client route
therefore resolves the same root-absolute, same-origin asset URLs. Executable `bin.mjs`
starts with the exact BOM-free, LF-terminated first line `#!/usr/bin/env node` and uses
Node.js built-ins to parse the packed `package.json`, validate both closed manifests and
every listed static/server declared length and hash, and dynamically import the validated
`dist/cli.mjs` only afterward. Manifest and asset processing relies on the supported
Node.js/filesystem/build-environment capacity; any recoverable inability to read, parse,
hash, or retain the required data fails closed before import or host bind.

`app/locales/en.ts` and `app/locales/ja.ts` explicitly own user-visible UI copy;
components consume stable message keys so English/Japanese UI parity is planned rather
than introduced ad hoc. `validation.md` and `validation.ja.md` record final SC evidence and
remain semantically equivalent. CI and release ownership is explicit under
`.github/workflows/`, including documentation parity, package exact-set, and release gates.

Task generation preserves the original family-vertical delivery order rather than
stable-partitioning all P1 work ahead of all P2 work. Setup and the blocking secure
foundation run first. Each family then completes its US1 discovery and US2 complete inert
detail before its US3 comparison, and only then advances to the next family in this exact
order: SKILL (including Skill Metadata) → Instructions → MCP → Rules → Commands → Copilot
Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin
Manifests → Hooks. Repository-wide Inventory, Detail, and Comparison Acceptance follow in
that order; Global inspection (US4, P3), cross-cutting verification, and release evidence
remain last.

The four registry modules have distinct ownership even though one validator loads them as
a closed graph. `vendor-behaviors.ts` mirrors documented vendor lookup statements;
`inspection-rules.ts` alone carries static/derived matcher read authority;
`runtime-composition.ts` carries strategy and relationship-only policy; and
`official-sources.ts` is the development/test-only offline evidence-map counterpart and is
never imported by the startup or scan entry graph. The four conformance JSON fixtures
mirror those modules, require reciprocal IDs,
and fail the build on duplicates, orphan references, unanchored evidence, an Inspector
Repository matcher not beginning with `./`, or any bare `**/` matcher.

The Presentation Allowlist sections in the three maintained vendor contracts are a separate
normative design input. Before the first parser, recognizer, API, or UI detail task, those
sections enumerate every supported `(tool, kind)`, the admitted source forms covered by its
row, and its exact metadata `fieldId` and relationship-kind set in both languages. Effective
eligibility is a two-gate decision: tuple membership plus the exact source-form extractor
described by that row. A field listed for one source form is never transplanted into another
form by tuple membership alone. Registry and conformance work consumes and tests both gates;
implementation must not define the contract it is meant to satisfy. The later official
evidence phase may review and reconcile drift, but it does not create the initial allowlist.
Evidence-location, section-anchor, review-metadata, and semantically unchanged correction
updates may proceed under the current task set. If accepted drift changes normative behavior,
inspection rules, runtime strategies, Presentation Allowlist membership or source-form gates,
registry shape, or conformance expectations, work stops before production registry or any
later task that relies on superseded IDs. The English/Japanese specification, research, plan,
quickstart, and contracts are synchronized; planning and task generation are rerun; and only
the regenerated task set may continue.

The build first removes only the root-resolved package-owned `.output/`, `.build/`, and
`dist/` trees. It runs `nuxt build` into Nuxt's standard `.output/public` staging tree; a
strict normalizer validates that tree and copies only accepted files into a newly created
`dist/public`, so the design does not assume that Nuxt writes directly to `dist`. The
normalizer writes the closed `dist/manifests/static-assets.json` inventory and exact CSP
hashes after rejecting external/relative asset URLs, executable attributes, malformed
inline scripts, symlinks, and unexpected output. It requires but does not copy Nuxt's
redundant `200.html` and `404.html` static-host fallbacks and rejects every HTML file except
the retained `index.html`, because the Node host owns status routing. Before copying or
hashing, it verifies each declared length against the actual file and uses streaming
supported by Node.js and the current filesystem. Resource exhaustion or another recoverable
environment failure aborts assembly without classifying an artifact as valid or invalid.

`package.json` owns the runnable command graph. Its `build` script sequences the fixed
clean step, Nuxt client build, tsdown `cli`/`parser-worker` build, both manifest assemblers,
and the recursive exact-set verifier; `check:official-sources` is the only documented
network-enabled evidence-drift command. The `src/cli.ts` and parser-worker entries,
`tsdown.config.ts`, assembly scripts, and these package scripts are foundation prerequisites:
no build, package, or manifest quality gate may be scheduled before they exist.
Setup therefore scaffolds the CLI and parser-worker entries plus every referenced assembly
script before it configures or executes package commands, tsdown entries, or CI quality
gates. The Setup checkpoint is not considered runnable until those paths exist.
Production `dependencies` is the exact-version leaf set `gunshi`, `yaml`, `jsonc-parser`, and
`smol-toml`; `open` is absent from every dependency section and production lock closure.
Nuxt/Vue/Vite/tsdown, Monaco, Playwright, and other build/test tooling remain development-
only, while their assembled product output is covered by the closed manifests.

Cross-platform CI runs the same pure Node.js safe-filesystem integration and race-detection
suite on macOS, Linux, and Windows. tsdown uses the named `cli` (`src/cli.ts`) and `parser-worker`
(`src/inspection/parsers/worker.ts`) entries, `fixedExtension: true`, a clean dedicated
`.build/server` output directory, disabled source maps/declarations, Node ESM, bundled
project modules, and external declared runtime dependencies via
`deps.skipNodeModulesBundle: true`. A server assembler accepts only regular `.mjs` files
with safe relative names from that staging tree, requires `cli.mjs` and
`parser-worker.mjs`, records every emitted code-split chunk in the closed
`dist/manifests/server-assets.json`, and copies exactly those files into `dist/`. The host
starts parser workers only from the fixed package-owned
`new URL('./parser-worker.mjs', import.meta.url)`.

The final recursive verifier derives the complete `dist/` file set from the static and
server manifests—both manifests, every listed public asset, and every listed server
`.mjs`—and rejects a symlink, non-regular file, missing record, or stale/unexpected path
before `npm pack`. No install-time build or download occurs. `package.json.files` is exactly
`["bin.mjs", "dist", "README.md", "README.ja.md", "LICENSE"]`; npm also includes
`package.json`, so the tarball allowlist is that manifest plus those five entries and their
contents, with no source, fixtures, or planning artifacts. The package is CLI-only:
`package.json.bin` is exactly `{ "agent-customization-inspector": "bin.mjs" }`, while
`main`, `module`, and `exports` are absent so no nonexistent library entry point is
advertised. The package test verifies the shim's exact shebang and executable mode, installs
the tarball into an isolated fixture, actually launches its local command through
`npx --no-install`, observes the loopback URL, and terminates it. This proves that the Nuxt
assets, CLI, parser Worker, safe-filesystem layer, and runtime dependencies remain usable
through `npx` from their packaged locations.

The package gate also audits every project/dependency tarball payload and the installed
production graph, not only the root tarball. It first installs with lifecycle scripts
disabled and development dependencies omitted, checks the exact graph against the
lockfile/package manifest, and rejects any `preinstall`/`install`/`postinstall` or build
requirement; `os`/`cpu`/`libc` selector; bundled/optional native package;
native/binary/Wasm extension or ELF/Mach-O/PE magic; `binding.gyp`, Rust/C/C++ source,
`prebuilds`; package-owned non-Node shebang, shell helper, or executable non-JavaScript
payload. It then performs a network-disabled normal lifecycle install from the same
verified cache. Package-manager-generated `node_modules/.bin` symlinks and Windows
`.cmd`/`.ps1` shims are the sole payload-external exception: exact names must come from an
audited `package.json.bin`, their symlink target or generated body may only dispatch to that
declared audited Node JavaScript target and forward argv, and no extra logic, environment/
configuration input, or unexpected shim is accepted. The cross-OS production-graph digest
covers package name/version/integrity and package-payload digests, excludes generated
`.bin` artifacts, and is accompanied by the OS-specific shim audit. Any new production
dependency or artifact fails until explicitly reviewed.

## Implementation Boundaries

- `src/inspection/rules/types.ts` first owns the minimum closed, immutable, versioned
  `TraversalPlan` and segment-program types, including stable schema/version discriminants;
  registry compilation may populate only those already-defined types and cannot widen them.
  `src/inspection/safe-fs.ts` is the sole component allowed to enumerate or read enabled
  inspection sources. It creates an internal `InspectionRootContext` by checking every
  exposed lexical root component with `lstat`, rejecting links, resolving the accepted
  root with `realpath`, requiring a directory, and recording bigint identity and
  metadata. It interprets only the immutable versioned `TraversalPlan` compiled from typed
  matchers. Repository plans may use their explicitly represented descendant
  programs. Global plans never enumerate the home root: an exact target `lstat`s only its
  fixed ancestors/target, and the Copilot fixed instructions subtree may `opendir` only that
  subtree and permitted descendants; neighboring Global paths receive no I/O. For every
  opened directory, it collects the sibling entries needed by the traversal plan before descent, retains
  exact `Dirent.name` raw segments for path operations, and separately derives NFC
  classification segments for matching, sorting, and DTO paths. Distinct raw sibling
  spellings with one NFC key fail closed as a whole collision group without descent/read; a
  non-colliding NFD-only spelling is read through its raw segments and displayed as NFC. The
  service rejects links, non-directory traversal objects, and detectable device changes before
  emitting generation-bound `ScanEntryTicket` objects. A ticket is branded in private JS
  state, cannot be serialized or reconstructed from a DTO or HTTP request, and can be
  consumed at most once. Client-supplied paths never authorize I/O.
- A candidate read reconstructs a path only from its owning root context and ticket. It
  rechecks the root and each ancestor with bigint `lstat`, comparing `dev`, `ino`, and
  `mode` with the ticket snapshots; first checks the candidate path with `lstat`, rejects
  a link or non-regular object, and compares `dev`, `ino`, `mode`, `size`, `mtimeNs`, and
  `ctimeNs` with enumeration metadata; then uses candidate `realpath` plus `path.relative`
  for canonical containment and immediately repeats the candidate path `lstat` comparison.
  It calls `open` only after both path-stat snapshots agree with each other and the
  enumeration metadata. If `O_NOFOLLOW` exists and is effective on the platform, the open
  must use it as mandatory
  final-component defense in depth; absence or ineffective support is not treated as a
  cross-platform guarantee. Before reading any bytes, the implementation repeats that
  ordered root/ancestor/candidate-`lstat`/canonical/candidate-`lstat` sequence and compares
  the same fields with `FileHandle.stat({ bigint: true })`. The reader consumes the authored
  bytes from that same `FileHandle`, subject only to what Node.js, the filesystem, and the
  execution environment can provide. While it is still open and before accepting bytes,
  post-read validation repeats that complete ordered sequence and the same-`FileHandle.stat`
  comparisons over the same fields, then closes the handle in `finally`. Any detected link,
  boundary, identity, type, size, or metadata change rejects the candidate; any collected bytes are discarded, no readable
  content or receipt is committed, and only a diagnostic-only inventory record may
  remain. An authenticated Diagnostic is emitted; its Source-relative Path is never
  projected into the fixed-code/opaque-ID operational event. A changed root aborts
  that source attempt and preserves its previously committed graph.
- All inspected-source filesystem work is coordinated with scan serialization so generation
  publication cannot overlap or interleave.
  Opens use read-only flags; the module exposes no mutation-capable open, write, truncate,
  create, rename, delete, link, chmod/chown, utimes, xattr, ACL, or equivalent operation.
  Safety tests instrument the calls and compare bytes, length, identity/link state, mode,
  mtime, ctime, and observable xattrs/ACLs before and after; OS-only atime changes are
  recorded separately and prove neither failure nor success. Global disable, process
  shutdown, or explicit cancellation revokes the ticket/attempt's publication authority. A
  pending promise may perform only cleanup when it settles; late bytes, diagnostics, graph
  changes, DTOs, and operational events are discarded. The design does not claim physical
  cancellation before Node.js and the kernel report the operation settled.
- If Node reports required identity/metadata or canonicalization as unavailable, ambiguous,
  malformed, or otherwise unusable, the layer rejects the boundary or candidate with
  `safe-fs-boundary-unverifiable`; it never guesses. A root-level failure aborts the source
  attempt, while a candidate-level failure may retain only the diagnostic record.
- Pure Node.js does not expose a directory-handle-relative open or an atomic equivalent of
  `RESOLVE_BENEATH`, so the checks above cannot prove kernel-enforced containment against an
  active adversarial process that replaces the root or an ancestor between path checks, or
  that replaces the final entry on a Node.js/platform combination without effective
  `O_NOFOLLOW`.
  Node also cannot portably identify every Windows reparse tag or every mount transition;
  same-device bind mounts and reparse metadata that Node does not report remain explicit
  platform limitations outside test proof.
  This release's race threat model therefore covers ordinary concurrent edits, every
  detectable change, and effective-`O_NOFOLLOW` final-component defense; every detected case
  fails closed. Active source-root/ancestor replacement and final-component replacement only
  where effective `O_NOFOLLOW` is unavailable are explicitly out of scope. No test result may
  be described as proof of stronger containment. The concrete resolution path is to adopt a future Node handle-relative API
  when one is available, or place scanning inside an OS-enforced read-only snapshot/sandbox
  before expanding that threat model.
- The four registries form one validated reference graph but grant different authority.
  Vendor behavior records describe upstream lookup without authorizing I/O; only static
  and typed derived Inspector rules authorize reads; runtime strategies project order,
  conditions, and relationship-only edges; official source records provide evidence and
  never change a rule automatically. Every Repository matcher separates Base, Relative
  selector, and Expansion, renders from the exact launch root with `./`, and rejects bare
  `**/`. An explicit `./**/` is downward Inspector inventory only. Copilot VS Code, CLI,
  and Cloud behavior, and each vendor's Repository versus User/Global behavior, remain
  independently addressable rather than sharing an inferred traversal. Every Repository
  selector is compiled into a closed, canonical-round-tripping segment program. Literal,
  one-segment, and non-adjacent recursive-directory tokens express composite
  descendant/direct-child/subtree rules without a general glob engine. The compiler also
  emits immutable `TraversalPlan` records; Global preview patterns come from those same
  records and the consent digest binds their schema, closed selection policy, and canonical
  programs. The only content-dependent scheduler branch is the exact
  `codex-global-first-non-empty` policy: it safely probes `AGENTS.override.md`, short-circuits
  on non-empty content, advances to `AGENTS.md` only when the override is absent or safely
  established empty, and fails closed without fallback when a present candidate cannot be
  safely classified. It publishes at most one Codex Global instruction file.
- Static matchers and the exact five initial mappings of the closed `DerivationProgram`
  union are the only read authorities. The derivation schema pins a static seed
  provenance/rule/kind, closed declaration field/syntax, seed-relative or source-root base,
  fixed placement/suffix, and deterministic target construction; callback, arbitrary path join, free-form expression,
  glob, and recursive derivation are unrepresentable. Derived segments pass the host-independent NFC/Windows-special grammar
  and must resolve to exactly one collision-free enumerated `ScanEntryTicket` before read,
  so ADS, device, trailing-dot/space, ambiguous case/normalization aliases, and 8.3 aliases
  are rejected before candidate open. A unique NFD raw entry remains eligible through its
  one NFC classification record. FR-015 through
  FR-018 continue to limit Global reads to the three instruction sets even when the vendor
  behavior registry records other supported User customizations.
- Tool recognizers attach exactly one `ToolRecognition` per `(fileId, tool, kind)` and sort
  them by the closed tool/kind order. Compatible admissions merge provenances; incompatible
  parsed meanings fail only that recognition's all-or-nothing extraction. A recognition retains every accepted independent
  candidate provenance while reading one physical file once. A deterministic entry-local
  non-capacity extraction failure may discard only that recognition under a contracted-partial
  outcome after complete traversal. An environment-resource failure aborts the attempt,
  commits no item, recognition, relationship, derived result, scan-result record or response,
  or generation, leaves only the previously committed snapshot available, and reports the
  lifecycle failure without judging the customization. Recognizers may parse declarations as
  inert data but cannot import, evaluate, resolve remote content, or read relationship
  targets. Context extraction may synthesize only closed vendor-documented edges between
  already admitted files or fixed relationship-only defaults; non-file and excluded
  context becomes a source-level condition fact. Relationship projection is limited to
  direct one-hop edges from each originating recognition and is non-recursive; multiple
  direct edges remain permitted according to the closed composition rules. An independently admitted
  target may expose its own direct edges only under its own recognition, never as a
  transitive expansion of the originating edge. Relationships confer zero read authority.
  Any attempted nested/transitive projection is rejected before target access, leaves the
  eligible direct edges and complete authored source available, and emits the
  actionable, source-value-free relationship-depth diagnostic. A fixed default is never labeled or
  serialized as an authored target. Public provenance scope and order use closed
  `ScopeDescriptor`/`OrderDescriptor` unions with Source-relative paths and stable
  comparison keys; unknown order remains null plus condition facts. A derived provenance
  names the exact `seedProvenanceId`, so hard-link alias seeds do not collapse.
- `src/inspection/applicability` evaluates only closed composition strategies and their
  cited vendor behavior/rules against available facts. Documentation status, product
  surface, runtime `cwd`/target, trust, approval, enablement,
  selection, agent context, tool availability, installation, instruction-byte budget,
  managed policy, and external state remain separate. An absent or excluded input stays
  unknown, including Codex user/profile fallback names, `project_doc_max_bytes`, and
  project roots outside Global instructions-only consent. Source-level facts retain the
  tool, explaining rule, and affected candidate/relationship-rule IDs instead of fabricating a source
  file relationship. Copilot surface differences, Claude's exact-launch-directory project
  settings, direct-child-only Codex rule files, and authored-but-not-activated plugin
  manifests remain explicit strategy/condition inputs rather than matcher side effects.
- The official-source registry gives each behavior, rule, and strategy reciprocal stable
  evidence IDs, canonical official HTTPS URLs, exact section anchors, review dates,
  and semantic fingerprints. Offline contract/build validation loads checked-in records;
  only the explicit maintainer drift command may fetch those pages. Startup and scans do
  not access documentation or copy remote page text into the package.
- Decoding begins only after same-handle reading and every post-read identity check complete.
  Any `0x00` byte produces `encoding: binary`, no `sourceText`, and diagnostic-only comparison
  ineligibility. All other bytes use fatal UTF-8 decoding. Exactly one leading UTF-8 BOM is
  recorded as `utf-8-bom` and removed from `sourceText`; invalid UTF-8 produces
  `encoding: unsupported`, no replacement characters or alternate decode, no `sourceText`,
  and no comparison eligibility. Decoding is complete rather than sampled or truncated and
  adds no product-defined byte, line, item, or structural ceiling.
- Parsers use safe modes only: YAML core schema without custom tags and with aliases
  disabled, JSONC tree extraction of known fields, TOML lexical-span extraction
  paired with semantic normalization without executing values, and Markdown/frontmatter
  extraction without HTML rendering. JSONC tree ranges, YAML CST/source-token ranges, TOML
  lexical spans, and Markdown/import spans must round-trip to the decoded source. Each
  allowlisted field occurrence emits an ordered exact `authoredLiteral` source slice plus a
  separate internal typed semantic value; accepted duplicate occurrences remain separate.
  `SourceTextRange` offsets are ECMAScript UTF-16 code units and must reproduce the literal
  with `String.prototype.slice`.
  The semantic value is a JSON-safe discriminated union; integer, float, and
  date/time payloads use typed canonical strings so JavaScript precision or parser-specific
  objects cannot change them.
  Metadata and authored-relationship display/comparison use only exact slices, while typed
  classification, target normalization, and derivation use only semantic values. A fixed
  registry-defined relationship default has null authored text and an explicit
  `documented-default` origin. Metadata, relationship, and derivation projections may share
  one exact occurrence/range; only partial/nested/crossing or identical overlap between
  distinct origin occurrences is invalid. All parser work runs through parser `Worker`
  threads; there is no synchronous host-event-loop fallback. Worker scheduling and capacity
  follow the supported Node.js runtime, parser libraries, browser, operating system, and
  execution environment, and the Inspector sets no product-defined worker count, V8
  heap/stack, message-size, parser-depth/node/scalar, or wall-clock extraction ceiling. A
  missing, ambiguous, illegally overlapping, or non-round-tripping span, or another
  deterministic non-capacity parser/Worker/extraction failure, discards that recognition's
  complete extraction result, including its relationships and derivation declarations, while
  the complete authored source, comparison eligibility, and other successful recognitions
  remain usable in a contracted partial generation. A parser/Worker resource or capacity
  failure instead returns no parser, recognition, relationship, or derived output, propagates
  `fatal-resource`, aborts the attempt with no scan-result record or response or generation,
  and leaves only the previously committed snapshot available. No parser or
  presentation step replaces an authored slice with its decoded value, resolves environment-variable
  references or performs credential detection, masking, or redaction. The internal
  `semanticValue` name denotes only mechanical typed decoding of an authored literal; it
  never carries a natural-language interpretation, rank, validity/correctness/effectiveness/
  compliance/quality verdict, or remediation advice. The same prohibition applies to every
  inventory, detail, comparison, Global-control, Diagnostic, Source Condition Fact, API,
  CLI, and documentation projection.
- The Node host uses `node:http`, a small static MIME table, a random 256-bit capability
  delivered in the URL fragment, exact Host/Origin checks, no CORS,
  `Cache-Control: no-store` for API responses, and a restrictive CSP. Before the CLI is
  imported, project-owned `bin.mjs` validates the packed `engines.node` string as exactly
  `^24.11.0 || ^26.0.0`, verifies `process.versions.node` is within that expanded range, and
  validates both closed manifests and every listed static/server hash; an out-of-range
  runtime exits with a fixed actionable error and the host cannot bind beforehand. The CSP permits
  same-origin scripts plus only the exact build-recorded SHA-256 hashes for Nuxt's
  executable inline bootstrap, forbids inline executable attributes, eval, nonces, and
  external/blob workers, and retains inline style permission only for Monaco layout/theme
  output. API payloads use IDs rather than caller-supplied filesystem paths. The capability is memory-only; a refresh
  after fragment removal performs no API call and shows the instruction to reopen the
  printed process-lifetime launch URL. Only a fixed client-route grammar and build-manifest
  assets receive the inert SPA shell. Global consent uses a no-I/O lexical preview and a
  session-keyed digest. Proposed roots are represented and escaped with the supported
  Node.js, browser, and platform string/path facilities rather than product-defined byte
  ceilings. If that environment cannot represent, escape, or retain a proposed root
  recoverably, it is not normalized or authorized and the preview reports an actionable
  failure without echoing unsafe data. Each accepted entry also retains an internal exact raw `lexicalRoot`; the digest binds that raw value, its escaped
  display, and the immutable traversal-plan schema/selection-policy/program. Enable uses only the stored raw
  value, never reverses `displayRoot`, and never rereads the environment. Canonical alias
  differences after consent fail before enumeration instead of silently changing the
  displayed boundary.
- `src/launch-browser.ts` prints the closed-grammar capability URL once before attempting
  launch, revalidates its loopback/port/43-character-base64url form, and uses only
  `node:child_process.spawn` with `shell: false`, ignored stdio, fixed argv, and `unref()`.
  The closed platform map is `/usr/bin/open` on macOS and the OS-provided
  `/usr/bin/xdg-open` on Linux. Windows and every other platform deliberately skip
  automatic opening in this release because no independent trusted helper boundary is
  available through the portable Node API; they emit the fixed manual-URL warning and keep
  the server running. `--no-open` creates no child. Helper failure likewise leaves the
  server running with the printed URL. The child environment is an exact platform
  allowlist: macOS `HOME`, `TMPDIR`, `LANG`, `LC_ALL`; Linux `HOME`, `DISPLAY`,
  `WAYLAND_DISPLAY`, `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`,
  `DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, `LC_ALL`. `BROWSER`,
  `NODE_OPTIONS`, `NODE_PATH`, every non-allowlisted environment key, all inspection-derived
  content, paths, and authored values, and extra argv are omitted. The allowlisted keys are
  copied directly from the launch environment as ambient platform context only; no Source root,
  preview root, candidate path, file path, or authored value is copied from inspection state
  into argv or environment, even when its text equals an ambient value lexically. Such equality
  never changes provenance, grants read authority, or selects a handler. An OS helper may consume the listed desktop/session ambient
  values, but the Inspector never selects a handler from them. The helper delegates only navigation to the OS default handler and does
  not select or verify a browser family/version; a successful spawn is not compatibility
  evidence. If that handler or its resolved browser is unavailable, cannot be identified,
  or is outside the release-certification baseline, the printed URL and `--no-open` provide
  the documented manual-opening fallback in a certified browser. No package-owned or user-supplied shell helper, shell command string,
  or packaged platform helper is permitted; the fixed OS-provided `xdg-open` helper is
  outside the package payload and is still invoked with `shell: false`. The one terminal launch line is the only
  intentional capability display and is never copied into operational logs.
- The capability-authenticated API returns inert DTOs and complete authored source only for
  an explicit detail request. The bundled browser holds acknowledgement only in memory,
  resets it on reload or central purge, and issues no detail request or comparison
  construction before the sensitive-content warning is acknowledged; acknowledgement is
  never sent to or persisted by the API. It renders source through Vue
  components and the ESM build of `monaco-editor`, never `v-html`. Single-file source
  models and both sides of a source comparison are read-only, use opaque in-memory URIs,
  set `readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
  `renderMarginRevertIcon: false`, and contain the complete authored text without resolving
  environment-variable references. `accessibilitySupport`
  stays `auto`, `accessibilityVerbose` is enabled, and each view has an `ariaLabel`.
  Monaco's diff editor owns literal source comparison; recognition metadata is
  matched by `(tool, kind, fieldId, occurrence)` and compares/renders exact `authoredLiteral` values in
  Vue rather than substituting typed values or serializing them into an editor.
  Automatically updating Repository and Global scan/status information shown beside other
  content uses one keyboard-operable pause/resume plus on-demand-refresh control. Pausing
  freezes the presented/live-region status at its last value without stopping the underlying
  scan; resuming or explicit refresh presents the current state.
  The editor is client-only and lazy-loaded on file/compare routes. Nuxt/Vite emits the
  explicitly imported editor worker as a same-origin static asset; unused language-service
  workers, CDN assets, external workers, and blob workers are not allowed. Editor/model
  instances and subscriptions are disposed independently on route close, selection
  replacement, source disable, and generation replacement. The accessible diff viewer,
  meaningful ARIA labels, keyboard navigation, and inline narrow-screen view remain
  enabled and are verified manually as well as through browser tests. If the browser or
  editor cannot compute the diff with available environment capacity, an actionable
  diagnostic leaves the complete authored side-by-side source visible.
  `app/composables/liveness.ts` owns the only client purge path and the lightweight
  capability-protected `/api/v1/session/liveness` heartbeat: one-second visible-page
  checks, a 750 ms request timeout, and a two-second monotonic browser-memory lease. A
  failed/mismatched heartbeat, lease expiry, hidden/page lifecycle event, or process loss
  disposes editor models/workers/subscriptions, clears all session DTO/DOM/detail/
  comparison/warning state, aborts requests, and increments `clientDataEpoch` so a late
  response cannot restore content. Every SessionSnapshot/FileDetail request captures that
  epoch, current generation, file ID where applicable, and an exact request token. An older
  session generation is ignored. Every admitted automatic or explicit scan has an opaque
  `scanRequestId`; its Source progress and any generation it commits carry the same ID. The
  client stores the current explicit request ID and never treats an older status or inventory
  generation as that request's completion. Before a newer
  generation is adopted, the epoch increments
  and all detail/editor/comparison state is aborted/disposed. An equal generation requires
  the current token. File detail is adopted only when epoch/generation still match and the
  readable file still exists. No browser storage, service worker, or response cache
  persists inspected content. The capability remains memory-only across a hidden-page purge;
  on visibility return the retained capability authenticates a fresh session snapshot. The
  SPA adopts its returned `sessionId` as the new liveness baseline without retaining or
  comparing the purged ID, and retains only the minimal, control-only `globalControl`
  recovery view. If active, disable is available from that view immediately; the SPA fetches
  and verifies the matching frozen consent preview before reconstructing retry controls.
  The recovery view always offers an explicit Resume inspection action, which re-fetches a
  matching session and constructs a fresh inventory summary with default state while
  restoring no old detail, comparison, editor, selection, filter, authored source, or
  acknowledgement. A later detail/comparison open requires a new acknowledgement. Failed
  authentication stays ended with the next step to reopen the printed URL.
- One coordinator serializes cancellable `GlobalEnableOperation` validation/admission,
  Repository scans, tool-specific Global scans, and Global-disable transactions so scans do
  not overlap and generations cannot interleave. Queue and operation capacity is inherited
  from Node.js and the current process environment; the Inspector defines no command-slot,
  queue-depth, handle-count, or admission-byte quota. Global disable is a priority security
  barrier that is accepted independently of ordinary work and may join an existing disable
  transaction. One consent record previews the three documented tool-home roots
  and owns one internal `GlobalToolControl` per confirmed tool. Each control owns any admitted
  root context and unpublished Source/boundary IDs outside scan working sets, so an initial
  scan failure can discard its whole working set without losing retry/disable authority.
  Initial enable and retry validate all confirmed tools before any state mutation, then
  enqueue accepted work through the same coordinator. A recoverable environment/resource
  failure rejects the operation with no state change and no claim about customization
  validity. Once validation and job transfer finish, a final
  coordinator-locked operation-ID/epoch/state check atomically chooses the enable response
  disposition. An operation-first race commits `202` and unregisters immediately; a
  disable-barrier-first race commits `409`, enters draining, and unregisters only after
  operation-local cleanup, with no late mutation or leak.
  Post-consent validation accepts zero to three roots; each accepted root is scanned
  provisionally and only a post-read-verified `committable-complete` or
  `committable-partial` commit
  creates its own Global Source identified by exactly one tool and bound to exactly one root
  and clears that control's tool failure diagnostic. An all-rejected request retains
  active consent/control and returns `active-no-job` with no new Source or scan job; initial
  activation therefore has zero Global Sources, while an all-rejected retry commits no
  generation and preserves existing Sources and their IDs exactly.
  The session `globalControl` DTO identifies confirmed, pending,
  and retryable tools without exposing root authority. `pendingTools` includes every tool
  owned by validation/admission in a running enable/retry operation as well as its queued or
  running initial scan; an `unvalidated` tool is always pending. Retryable tools remain informational
  while any such work is pending; retry is offered only after `pendingTools` is
  empty, while disable remains immediate. The consent-preview route returns the frozen
  active preview after a client purge. No logical Source combines Copilot, Claude,
  and Codex. Ordinary
  scans are FIFO, while Global disable is a priority security barrier. At acceptance it sets
  `globalControl.state: disabling`, empties pending/retry arrays, increments the command
  epoch, and rejects new Global-enable/Global-rescan commands. It aborts and discards the active uncommitted transaction,
  aborts and drains enable validation/admission, performs a final queued-Global-work cancellation sweep, and commits removal
  of all Global Sources next, and requeues an interrupted Repository command once behind
  that removal. Each scan job starts from the active session-wide generation, carries all
  unscanned Sources forward and builds a replacement off to the side. Only a
  post-read-verified `committable-complete` result or a `committable-partial` result limited
  to deterministic entry-local non-capacity failures commits the next generation. A
  recoverable environment or resource failure aborts the attempt, commits no item, Source,
  recognition, derived result, scan-result record or response, or generation, and leaves only
  the previous generation current. A successful source scan clears only that
  Source's session-owned stale-failure entry and lifecycle diagnostic, carries both for other Sources, rekeys
  generation-owned graphs, and invalidates old file IDs, detail DTOs, and comparison
  selection. Every successful initial or retry Global Source publication is such a commit:
  it preserves every carried Source's stable `sourceId` and semantic content, advances the
  generation, rekeys all generation-owned IDs, and invalidates old file/detail/comparison/
  editor state. An all-rejected enable/retry publishes no Source, commits no generation,
  and changes no carried ID. The same coordinator lock linearizes the generation and payload
  of every SessionSnapshot/FileDetail envelope; later network delivery cannot mix or relabel them.
  Global disable clears entries and lifecycle diagnostics for removed Global Sources but preserves any
  Repository entry and diagnostic. A fatal attempt publishes zero uncommitted results and leaves the
  last committed generation and IDs intact. When that attempt is an explicit rescan, the
  session creates or replaces one stale-failure entry and actionable diagnostic
  for that Source, without removing another Source's failure. A fatal automatic first
  Repository scan leaves bootstrap generation 0 current. A fatal initial Global enable adds
  no `StaleSourceFailure` entry for the missing tool and preserves all
  pre-existing entries and the derived snapshot state. Both report through their keyed
  failure diagnostic that no new inventory was committed. A fatal Global enable/rescan retains its exact consent,
  per-tool `GlobalToolControl` records, and any prior per-tool Global graphs for explicit retry or disable;
  Global disable removes their tool lifecycle diagnostics, closes/removes all
  control-owned root contexts, and deletes every control, consent record, and frozen preview.
  Each retained Diagnostic uses exactly one attachment scope, independently of its generation
  or session-lifecycle lifetime. File scope requires a matching `sourceId`, `fileId`, and
  Source-relative Path; source scope requires only `sourceId`; session scope permits none of
  those location fields. Invalid combinations are rejected, and source/session records never
  fabricate a file ID or path.
  Generation 0 is a committed zero-I/O bootstrap snapshot with no files or diagnostics, so
  a fatal first attempt has a legal retained current base. Explicit Repository and enabled-
  Global rescan commands share
  the same queue rules. Repeated Global disable joins an existing barrier; when no tool-specific
  Global Source or graph, active consent record, retained admitted Global root context,
  open Global inspection `FileHandle`, or running/queued Global scan/enable command
  exists, disable is an immediate no-op even if Repository work exists.
  When disable, shutdown, or explicit cancellation revokes a filesystem operation, the
  serialized coordinator does not publish or interleave its late result. API and liveness
  handling continue while the event loop can serve them, but disable cannot claim physical
  drain completion before the underlying promise settles.

### Closed Runtime State Tables

#### Global root admission

| Input/phase | Internal transition | I/O and public result |
|---|---|---|
| Tool-home setting is absent | `preview-default` | Compute the documented default lexically with zero filesystem I/O; create no authority |
| Setting is empty, relative, or cannot be represented as an absolute platform path | `preview-invalid` | Do not fall back; perform zero filesystem I/O and create no root, Source, job, or generation |
| Setting is a representable absolute path, including outside the ordinary home | `preview-eligible` | Escape and digest the stored raw lexical value with zero filesystem I/O; await explicit consent |
| Consent/digest is stale, replayed, or mismatched | `consent-rejected` | Perform zero proposed-root I/O; create no authority |
| Post-consent lexical/canonical/link/type/containment/identity admission fails | `root-rejected` | Touch only the proposed root through `safe-fs`; do not fall back or create a public Source, scan job, or generation |
| Post-consent admission succeeds | `root-admitted` | Transfer exactly one private root context to a provisional tool job; no public Source or graph exists before commit |

#### Verified-byte decoding

| Verified-byte condition | `encoding` | Source and recognition state |
|---|---|---|
| Any `0x00` byte | `binary` | Diagnostic-only item; no `sourceText`, parser dispatch, recognition extraction, or comparison eligibility |
| No NUL, one leading UTF-8 BOM, remaining bytes decode strictly | `utf-8-bom` | Record the BOM and remove it from complete `sourceText`; dispatch the complete text to the Worker |
| No NUL or BOM and all bytes decode strictly | `utf-8` | Preserve complete `sourceText`; dispatch the complete text to the Worker |
| Strict UTF-8 decoding fails | `unsupported` | Diagnostic-only item; no replacement decoding, alternate encoding, `sourceText`, parser dispatch, or comparison eligibility |

#### Scan publication and failure ownership

| Terminal condition | Internal outcome and owner | Atomic public result |
|---|---|---|
| Complete traversal; every admitted entry complete; assembly/serialization succeed; authority current | `committable-complete`, coordinator | Commit one `complete` generation and complete response |
| Complete traversal; only deterministic entry-local non-capacity failures; unaffected entries complete; assembly/serialization succeed; authority current | `committable-partial`, scan assembler then coordinator | Commit one `contracted-partial` generation with affected diagnostics and complete unaffected entries |
| Capacity/resource failure at any scan, Worker, coordinator, assembly, serialization, or pre-commit response step | `fatal-resource`, `src/host/runtime-failures.ts` plus coordinator using the `shared/runtime-failures.ts` schema | Abort the attempt; commit no item, Source, recognition or derived result, scan-result record or response, or generation, and revoke authority. Retain only any prior committed snapshot. Only an explicit fatal rescan creates/replaces the affected Source's stale-failure overlay; automatic first Repository and initial Global enable failures create none and preserve existing snapshot state |
| Non-capacity/resource root, traversal, assembly, serialization, or other fatal pre-commit failure | `fatal-operational`, owning boundary plus coordinator | Abort the attempt; commit no item, Source, recognition or derived result, scan-result record or response, or generation; retain only any prior committed snapshot and expose only fixed-code operational failure plus an authenticated actionable diagnostic. Only an explicit fatal rescan creates/replaces the affected Source's stale-failure overlay; automatic first Repository and initial Global enable failures create none and preserve existing snapshot state |
| Disable/shutdown/supersession/failure revokes authority | `revoked`, coordinator | Discard all late bytes, extraction, diagnostics, DTOs, events, and graph mutations |
| Transport fails after atomic commit | Existing committed outcome, host | Never relabel or expose a truncated body as partial; allow authenticated refetch of the already committed generation |

## Complexity Tracking

The pure Node.js product constraint introduces a documented residual race risk without
waiving same-handle reads, detected-race fail-closed behavior, source-value-free diagnostic/logging,
or review requirements.
One unavoidable implementation cost is tracked explicitly:

| Complexity | Why it is required | Simpler option rejected |
|---|---|---|
| Repeated `lstat`/`realpath`/`open`/`FileHandle.stat` validation and same-handle reads | Detect ordinary concurrent changes before accepting bytes and discard any result whose identity, metadata, or canonical containment changes | A direct `readFile(path)` or glob-only traversal has no generation-bound authorization, identity agreement, or post-read race detection |
| Publication-authority revocation with cleanup-only late continuations | Prevent work completed after disable, shutdown, or cancellation from mutating a newer session state | Treating cancellation as physical kernel-I/O termination would make an unsupported guarantee |

**Residual risk and resolution path**: Path validation and `open` are not one atomic kernel
operation in Node.js, so a sufficiently privileged active mutator may win an undetectable
root or ancestor replacement race, or a final-entry replacement race where effective
`O_NOFOLLOW` is unavailable. Approval must treat only those cases as out of scope and must not call
the current checks a containment proof. Expanding the threat model requires either a future
Node directory-relative API with atomic beneath/no-follow semantics or an OS-enforced
read-only snapshot/sandbox around the scan root, followed by a renewed security review and
adversarial test plan.

Node.js also cannot guarantee wall-clock cancellation of every stalled kernel filesystem
operation. Disable, shutdown, and explicit cancellation therefore revoke publication
authority and discard late results, while coordinator serialization prevents those results
from interleaving with a committed generation. Approval MUST NOT describe authority
revocation as physical cancellation or proof of kernel completion within a product-defined
time. Removing this residual requires a future public
cancellable filesystem primitive or an OS-enforced read-only worker/sandbox that can be
terminated and drained, followed by renewed resource-leak and disable-race testing.
