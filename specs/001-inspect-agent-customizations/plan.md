# Implementation Plan: Inspect Agent Customizations

[日本語](plan.ja.md)

**Branch**: `dev` | **Date**: 2026-07-17 | **Spec**: [spec.md](spec.md)

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
which inspected sources are enumerated or read. It uses bounded `node:fs/promises`
traversal, canonical-path checks, opaque scan tickets, and same-`FileHandle` identity and
metadata checks before and after bounded reads. The browser presents complete authored
source in a read-only Monaco editor and uses Monaco's diff editor for source comparison;
recognition metadata is matched by tool/kind/field/occurrence and compares exact authored literals in
ordinary Vue components, never parser-normalized display values.

The security boundary is strict: the browser never reads the filesystem,
the Node host never dynamically imports customization files, and the initial release has
no static-export, MCP, remote-host, or automatic-watch mode. A loopback-only host sends
inert DTOs, including complete authored source only for an explicit detail or comparison
request after the sensitive-content warning, through a versioned HTTP API protected by a
random per-process capability. Environment-variable references remain literal text and
never authorize process-environment lookup or substitution. Explicit scans use the frozen
inspection path allowlist, reject symlink traversal, apply bounded reads and best-effort
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
inventory never masquerades as an effective agent configuration. Closed context
relationships show which independently inventoried instructions, rules, skills, MCP
declarations, or memory scopes an agent may reference without following a path; Codex
instruction-byte limits and excluded non-file inputs stay explicit condition facts.

## Technical Context

**Language/Version**: Node.js 24.18.0 Active LTS development baseline, package engines
`^24.11.0 || >=26.0.0`; TypeScript 6.0.3; Vue 3.5.39

**Primary Dependencies**: Nuxt 4.4.8, Vue Router 5.2.0, tsdown 0.22.8, Vite 7.3.6
(latest Nuxt-compatible release), `cac` 7.0.0, `yaml` 2.9.0,
`jsonc-parser` 3.3.1, `smol-toml` 1.7.0, and `monaco-editor` 0.55.1. The first lockfile
MUST revalidate these exact stable versions; prereleases and incompatible newer majors
are not considered eligible “latest” versions.

**Storage**: No durable application storage. Session state, bounded file bytes, complete
authored-source DTOs, diagnostics, the sensitive-content warning acknowledgement, and
comparison selection exist only in process/browser memory.

**Testing**: Vitest 4.1.10 with `@vitest/coverage-v8` 4.1.10, Nuxt Test Utils 4.0.3,
Vue Test Utils 2.4.11, happy-dom 20.10.6, Playwright 1.61.1, and
`@axe-core/playwright` 4.12.1; fixture-driven unit, contract, integration, packaging,
performance, security, browser, and manual accessibility checks. The maintained usability
study kit uses one 20-person first-time cohort for SC-001 then SC-006, fixed prompts and
moderator limits, failure-as-unsuccessful accounting without replacements, the defined
timer boundaries, and a four-field SC-006 response form scored against fixed ground truth.

**Target Platform**: Node.js-supported macOS, Windows, and Linux environments with a
modern browser. Published project/dependency package payloads and project-authored installed
application code contain only platform-independent JavaScript application code and
declarative static/package data; they require no install script, runtime download, or end-user
compiler. Package-manager-generated `node_modules/.bin` symlink/`.cmd`/`.ps1` launchers are
payload-external interoperability metadata and receive a separate exact-target/content audit.
Development-only tooling is outside the product package and remains separately pinned/audited. The server
binds only to `127.0.0.1` and has no remote deployment mode

**Project Type**: Single publishable ESM npm package containing a static Nuxt web client,
a Node CLI/local HTTP service, and shared serializable contracts. All project-authored
executable application code is JavaScript/TypeScript, and executable code in every published
package payload is JavaScript; generated
HTML/CSS, JSON manifests, documentation, and the license are permitted declarative package
artifacts. This FR-038 boundary does not misclassify third-party development/test tooling as
published application code.

**Performance Goals**: On the maintainer-designated current local reference environment,
visibly render scan progress or meaningful status in the browser within 1 second and render
the complete inventory with its primary list controls operable for one unchanged
deterministic fixture containing 100,000 filesystem entries and 500 matching files within
10 seconds in at least 9 of exactly 10 fresh-process runs. Start both timers at the browser scan request,
exclude fixture construction and `npx` download/install/process startup, do not deliberately
reset the operating-system filesystem cache between runs, and publish no concrete reference-
environment machine, operating-system, hardware, or runtime details. Keep filtering and
selection feedback under 100 ms for 500 items.

**Constraints**: Inspected customization must cause no execution, child process, dynamic
import, network request, MCP connection, or source mutation; the separately bounded startup
launcher may invoke only its fixed OS browser helper and never receives inspected content.
No boundary-external bytes are accepted or published;
no exposed symlink is intentionally followed, and detected path changes commit no bytes;
the documented active path-component mutator remains outside the current threat model;
explicit opt-in before Global reads; complete authored source and displayed metadata,
including literal credentials, are shown without masking or reveal controls only after a
sensitive-content warning; environment-variable references are never resolved or
substituted; inert text rendering only; WCAG 2.2 AA; English/Japanese
documentation parity. Hard limits are 1 MiB per file, 32 MiB total file bytes, 200,000
visited entries, 2,000 customization files, 64 path segments, 1,024 aliases per file and
50,000 per generation, 36 recognitions per file and 8,000 per generation, 1,000 direct
relationships per file and 100,000 per generation, 2,000 candidate provenances per
recognition and 100,000 per generation, 256 source-level condition facts
per source, 64 condition facts per assessment, 128 diagnostics per file, 5,000 per source,
10,000 per generation, 1,024 out-of-generation lifecycle diagnostics per session (four
fixed failure slots—Repository plus one per Global tool—one session sentinel, and 1,019 ordinary details),
2 KiB per paired lifecycle record/ID insertion, a 2 MiB lifecycle-diagnostic sub-budget
with 16 KiB reserved for those fixed diagnostic-control records, a disjoint 1 MiB
session-control/progress sub-budget, and a 3 MiB total session overlay,
32 KiB per proposed Global-root input and 192 KiB per escaped Global-root display,
parser depth 64, 50,000 parser nodes, 64 KiB per scalar, 512 metadata entries per recognition
and 100,000 per generation, 2,000 ms and a 2 MiB worker message per recognition, 32 MiB
parser messages per generation, at most two parser workers with 64/16/4 MiB old/young/stack
limits, 64 MiB retained graph data, a 5 MiB neutral-overlay snapshot base plus the 3 MiB
overlay within the 8 MiB complete session snapshot, 4 MiB file details, 64 KiB
request bodies, and a 30-second scan deadline.
The authorized browser uses a one-second liveness heartbeat, a 750 ms request timeout, and
a two-second monotonic memory lease with immediate hidden/page lifecycle purge.
Monaco diff highlighting
is attempted only when each side has at most 20,000 lines, uses an explicit 5,000 ms
computation timeout, and never receives a file beyond the 1 MiB read limit. Reaching a
scan-accumulation limit whose contract specifies partial publication produces a bounded
partial result and diagnostic. Request, registry-validation, per-item, and editor limits
use their exact `ResourceLimits` and contract behavior instead. Aggregate admission applies
deterministic count and encoded-byte accounting before retaining complete records; it never
truncates an API DTO. Canonical accounting and HTTP delivery share one deterministic
production JSON encoder and the same already-accounted UTF-8 entity-body buffer. Typed
derivation is limited to one closed `DerivationProgram` edge and
the first 128 distinct targets in deterministic rule/field/source order per exact static
seed provenance; the 129th stops before target access and publishes the contracted partial result. A Codex config contributes at most 16 fallback basenames of
128 UTF-8 bytes each. Depth is per provenance: a bounded-derived provenance cannot seed an
edge, while an independent static provenance on the same file remains eligible. Generic
relationships never authorize a read.

Trusted package manifests use separate fail-closed build/runtime limits rather than scan
DTO limits: static manifest 2 MiB, 4,096 assets, 512 UTF-8 bytes per request path, and 32
inline hashes; server manifest 1 MiB, 256 `.mjs` records, 16 MiB per file, and 64 MiB
listed total. Both reject unknown keys, and the published package verifies the recursively
exact declared set.

**Scale/Scope**: One local user, exactly one Repository source rooted at launch `cwd`, zero
to three opted-in tool-specific Global sources (at most one each for Copilot, Claude, and
Codex), exactly one root per Source, up to 2,000 items in one transient session, and exactly
two files in a comparison

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
      package, performance, end-to-end, error, boundary, accessibility, and adversarial
      safety scenarios, including all four user stories.
- [x] **Documentation parity**: Every Phase 0/1 artifact has an English canonical file and
      a semantically equivalent `*.ja.md` companion. Implementation must update both user
      and contributor guides, all vendor/Repository/User/Global/surface tables, official
      evidence, security limits, and diagnostics.
- [x] **Safe boundaries**: The design freezes read candidates, authenticates local API
      requests, sends complete authored content only over the loopback session after the
      sensitive-content warning, keeps diagnostics and logs free of duplicated source
      values, rejects every link or unverifiable
      boundary exposed by Node.js, destroys bytes after detected races, bounds every scan
      dimension, and records the non-atomic and platform-unobservable residual limits.
      The constitution's secret-safe-display requirement is met by preventing unintended
      disclosure: content is shown only in the initiating capability-authenticated browser
      after explicit acknowledgement, remains inert and session-only, is never copied into
      diagnostics or logs, and is never sent to another machine. It does not alter the
      explicitly requested literal source through masking or redaction.
- [x] **Welcoming participation**: One-package setup, reproducible pinned tooling,
      objective expected results, keyboard-first workflows, actionable errors, and
      automated plus manual accessibility gates keep the project approachable.

### Post-design re-check

The data model distinguishes physical files, candidate provenances, documentation status,
and runtime applicability facts. The HTTP contract returns complete authored source only
for explicit detail/comparison requests after the warning gate, provides no masking or
reveal workflow, and never resolves environment-variable references. The matcher contract
permits only explicit static or vendor-specific one-edge
derived candidates; relationships, components, vendor locators, and excluded inputs cannot
expand the read boundary. The quickstart covers every stable behavior, rule, strategy, and
source ID, official-source drift review, the Repository `./` grammar and bare-`**/`
rejection, all required quality gates, and all four end-to-end stories. Monaco is
client-only, same-origin, bounded, and model-lifetime scoped; its own diff engine avoids a
duplicate dependency while exact authored metadata comparison stays explicit. The
project-owned browser launcher removes the shell-bearing `open` package, and package gates
audit the root tarball plus the installed exact production closure for JavaScript-only
application code, lifecycle/build/download paths, selectors, and native/binary artifacts;
third-party development/test tooling remains outside the published FR-038 boundary. The Node.js-only
verification limitation is recorded with its active-mutator/platform residual risk and the
concrete future public Node.js filesystem API or OS-enforced snapshot/sandbox resolution path required by the
constitution. It is not treated as passing-test proof or an implicit waiver. No unresolved
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
│   ├── server.ts
│   └── static-files.ts
├── inspection/
│   ├── limits.ts
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
├── limits.ts
└── registries/
    ├── vendor-behaviors.ts
    ├── inspection-rules.ts
    ├── runtime-composition.ts
    └── official-sources.ts

tests/
├── unit/
├── contract/
├── integration/
├── package/
├── performance/
├── e2e/
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
├── verify-package-files.mjs
└── check-official-sources.ts

.github/workflows/
├── ci.yml
└── release.yml

bin.mjs
package.json
pnpm-lock.yaml
nuxt.config.ts
tsdown.config.ts
playwright.config.ts
vitest.config.ts
```

**Structure Decision**: Use a single-package `app`/`src`/`shared` separation because the UI
and CLI are released and versioned together. Nuxt is configured as an SPA (`ssr: false`)
with the static Nitro preset, `app.baseURL: '/'`, `app.buildAssetsDir: '/_nuxt/'`, no CDN
URL, explicit imports, and component auto-discovery disabled. Every nested client route
therefore resolves the same root-absolute, same-origin asset URLs. Executable `bin.mjs`
starts with the exact BOM-free, LF-terminated first line `#!/usr/bin/env node` and uses
Node.js built-ins to validate the packed `package.json`, both manifests, and every listed
static/server hash before dynamically importing the validated `dist/cli.mjs`; the host cannot bind
before that check completes.

`app/locales/en.ts` and `app/locales/ja.ts` explicitly own user-visible UI copy;
components consume stable message keys so English/Japanese UI parity is planned rather
than introduced ad hoc. `validation.md` and `validation.ja.md` record final SC evidence and
remain semantically equivalent. CI and release ownership is explicit under
`.github/workflows/`, including documentation parity, package exact-set, and release gates.

The four registry modules have distinct ownership even though one validator loads them as
a closed graph. `vendor-behaviors.ts` mirrors documented vendor lookup statements;
`inspection-rules.ts` alone carries static/derived matcher read authority;
`runtime-composition.ts` carries strategy and relationship-only policy; and
`official-sources.ts` is the development/test-only offline evidence-map counterpart and is
never imported by the startup or scan entry graph. The four conformance JSON fixtures
mirror those modules, require reciprocal IDs,
and fail the build on duplicates, orphan references, unanchored evidence, an Inspector
Repository matcher not beginning with `./`, or any bare `**/` matcher.

The build first removes only the root-resolved package-owned `.output/`, `.build/`, and
`dist/` trees. It runs `nuxt build` into Nuxt's standard `.output/public` staging tree; a
strict normalizer validates that tree and copies only accepted files into a newly created
`dist/public`, so the design does not assume that Nuxt writes directly to `dist`. The
normalizer writes the closed `dist/manifests/static-assets.json` inventory and exact CSP
hashes after rejecting external/relative asset URLs, executable attributes, malformed
inline scripts, symlinks, and unexpected output. It requires but does not copy Nuxt's
redundant `200.html` and `404.html` static-host fallbacks and rejects every HTML file except
the retained `index.html`, because the Node host owns status routing.

`package.json` owns the runnable command graph. Its `build` script sequences the fixed
clean step, Nuxt client build, tsdown `cli`/`parser-worker` build, both manifest assemblers,
and the recursive exact-set verifier; `check:official-sources` is the only documented
network-enabled evidence-drift command. The `src/cli.ts` and parser-worker entries,
`tsdown.config.ts`, assembly scripts, and these package scripts are foundation prerequisites:
no build, package, or manifest quality gate may be scheduled before they exist.
Production `dependencies` is the exact-version leaf set `cac`, `yaml`, `jsonc-parser`, and
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

- `src/inspection/safe-fs.ts` is the sole component allowed to enumerate or read enabled
  inspection sources. It creates an internal `InspectionRootContext` by checking every
  exposed lexical root component with `lstat`, rejecting links, resolving the accepted
  root with `realpath`, requiring a directory, and recording bounded bigint identity and
  metadata. It interprets only the immutable versioned `TraversalPlan` compiled from typed
  matchers. Repository plans may use their explicitly represented bounded descendant
  programs. Global plans never enumerate the home root: an exact target `lstat`s only its
  fixed ancestors/target, and the Copilot fixed instructions subtree may `opendir` only that
  subtree and permitted descendants; neighboring Global paths receive no I/O. For every
  opened directory, it collects a complete bounded sibling buffer before descent, retains
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
  the same fields with `FileHandle.stat({ bigint: true })`. The reader consumes at most the remaining byte
  budget from that same `FileHandle`. While it is still open and before accepting bytes,
  post-read validation repeats that complete ordered sequence and the same-`FileHandle.stat`
  comparisons over the same fields, then closes the handle in `finally`. Any detected link,
  boundary, identity, type, size, or metadata change rejects the candidate; any collected bytes are discarded, no readable
  content or receipt is committed, and only a bounded diagnostic-only inventory record may
  remain. A fixed secret-safe diagnostic is emitted. A changed root aborts
  that source attempt and preserves its previously committed graph.
- If Node reports required identity/metadata or canonicalization as unavailable, ambiguous,
  malformed, or otherwise unusable, the layer rejects the boundary or candidate with
  `safe-fs-boundary-unverifiable`; it never guesses. A root-level failure aborts the source
  attempt, while a candidate-level failure may retain only the bounded diagnostic record.
- Pure Node.js does not expose a directory-handle-relative open or an atomic equivalent of
  `RESOLVE_BENEATH`, so the checks above cannot prove kernel-enforced containment against an
  active adversarial process that can replace the root, an ancestor, or the final entry
  between path checks.
  Node also cannot portably identify every Windows reparse tag or every mount transition;
  same-device bind mounts and reparse metadata that Node does not report remain explicit
  platform limitations outside test proof.
  This release's race threat model therefore covers ordinary concurrent edits and other
  races that the implementation detects; every detected case fails closed. An active adversarial filesystem
  mutator is explicitly out of scope. No test result may be described as proof of stronger
  containment. The concrete resolution path is to adopt a future Node handle-relative API
  when one is available, or place scanning inside an OS-enforced read-only snapshot/sandbox
  before expanding that threat model.
- The four registries form one validated reference graph but grant different authority.
  Vendor behavior records describe upstream lookup without authorizing I/O; only static
  and bounded-derived Inspector rules authorize reads; runtime strategies project order,
  conditions, and relationship-only edges; official source records provide evidence and
  never change a rule automatically. Every Repository matcher separates Base, Relative
  selector, and Expansion, renders from the exact launch root with `./`, and rejects bare
  `**/`. An explicit `./**/` is downward Inspector inventory only. Copilot VS Code, CLI,
  and Cloud behavior, and each vendor's Repository versus User/Global behavior, remain
  independently addressable rather than sharing an inferred traversal. Every Repository
  selector is compiled into a closed, canonical-round-tripping segment program. Literal,
  one-segment, and at most two non-adjacent recursive-directory tokens express composite
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
  fixed placement/suffix, and fan-out; callback, arbitrary path join, free-form expression,
  glob, and recursive derivation are unrepresentable. Derived segments pass the host-independent NFC/Windows-special grammar
  and must resolve to exactly one collision-free enumerated `ScanEntryTicket` before read,
  so ADS, device, trailing-dot/space, ambiguous case/normalization aliases, and 8.3 aliases
  are rejected before candidate open. A unique NFD raw entry remains eligible through its
  one NFC classification record. FR-015 through
  FR-018 continue to limit Global reads to the three instruction sets even when the vendor
  behavior registry records other supported User customizations.
- Tool recognizers attach exactly one `ToolRecognition` per `(fileId, tool, kind)` and sort
  them by the closed tool/kind order. Compatible admissions merge provenances; incompatible
  parsed meanings fail only that recognition's all-or-nothing extraction. A recognition retains every accepted, in-limit independent
  candidate provenance while reading one physical file once; overflow publishes the
  contracted partial result and diagnostic. Recognizers may parse declarations as
  inert data but cannot import, evaluate, resolve remote content, or read relationship
  targets. Context extraction may synthesize only closed vendor-documented edges between
  already admitted files or fixed relationship-only defaults; non-file and excluded
  context becomes a source-level condition fact. A fixed default is never labeled or
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
  evidence IDs, canonical official HTTPS URLs, exact bounded section anchors, review dates,
  and semantic fingerprints. Offline contract/build validation loads checked-in records;
  only the explicit maintainer drift command may fetch those pages. Startup and scans do
  not access documentation or copy remote page text into the package.
- Parsers use safe modes only: YAML core schema without custom tags and with aliases
  disabled, JSONC tree extraction of known fields, bounded TOML lexical-span extraction
  paired with semantic normalization without executing values, and Markdown/frontmatter
  extraction without HTML rendering. JSONC tree ranges, YAML CST/source-token ranges, TOML
  lexical spans, and Markdown/import spans must round-trip to the decoded source. Each
  allowlisted field occurrence emits an ordered exact `authoredLiteral` source slice plus a
  separate internal typed semantic value; accepted duplicate occurrences remain separate.
  `SourceTextRange` offsets are ECMAScript UTF-16 code units and must reproduce the literal
  with `String.prototype.slice`; UTF-8 scalar-byte limits remain separate.
  The semantic value is a bounded JSON-safe discriminated union; integer, float, and
  date/time payloads use typed canonical strings so JavaScript precision or parser-specific
  objects cannot change them.
  Metadata and authored-relationship display/comparison use only exact slices, while typed
  classification, target normalization, and derivation use only semantic values. A fixed
  registry-defined relationship default has null authored text and an explicit
  `documented-default` origin. Metadata, relationship, and derivation projections may share
  one exact occurrence/range; only partial/nested/crossing or identical overlap between
  distinct origin occurrences is invalid. At most two parser
  `Worker` threads isolate synchronous parser work from the host event loop; V8 old/young/
  stack limits are 64/16/4 MiB, and each recognition has a 2,000 ms kill-and-replace
  timeout and 2 MiB accepted worker-message bound; accepted parser messages total at most
  32 MiB per generation. A bounded traversal enforces depth 64, 50,000 nodes, 64 KiB
  scalars, and 512 metadata entries per recognition plus the aggregate graph/response
  limits; the scalar bound applies separately to the UTF-8 literal slice and semantic
  value. Any missing, ambiguous, illegally overlapping, or non-round-tripping span or parser/resource failure discards that recognition's complete
  extraction result, including its relationships and derivation declarations, while the
  complete authored source and other successful recognitions remain usable. No parser or
  presentation step replaces an authored slice with its decoded value, resolves environment-variable
  references or performs credential detection, masking, or redaction.
- The Node host uses `node:http`, a small static MIME table, a random 256-bit capability
  delivered in the URL fragment, exact Host/Origin checks, no CORS,
  `Cache-Control: no-store` for API responses, and a restrictive CSP. Before the CLI is
  imported, project-owned `bin.mjs` validates both closed manifests and every listed
  static/server hash; the host cannot bind beforehand. The CSP permits
  same-origin scripts plus only the exact build-recorded SHA-256 hashes for Nuxt's
  executable inline bootstrap, forbids inline executable attributes, eval, nonces, and
  external/blob workers, and retains inline style permission only for Monaco layout/theme
  output. API payloads use IDs rather than caller-supplied filesystem paths. The capability is memory-only; a refresh
  after fragment removal performs no API call and shows the instruction to reopen the
  printed process-lifetime launch URL. Only a fixed client-route grammar and build-manifest
  assets receive the inert SPA shell. Global consent uses a no-I/O lexical preview and a
  session-keyed digest. A proposed root above 32 KiB UTF-8 or whose bounded escaped display
  would exceed 192 KiB becomes `oversized` with `displayRoot: null`; it is neither
  normalized nor authorized, and the digest binds that null/state. Each in-limit entry also
  retains an internal exact raw `lexicalRoot`; the digest binds that raw value, its escaped
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
  `NODE_OPTIONS`, `NODE_PATH`, all
  other environment values, inspected values, and extra argv are omitted. An OS helper may
  consume the listed desktop/session ambient values, but the Inspector never selects a
  handler from them. No package-owned or user-supplied shell helper, shell command string,
  or packaged platform helper is permitted; the fixed OS-provided `xdg-open` helper is
  outside the package payload and is still invoked with `shell: false`. The one terminal launch line is the only
  intentional capability display and is never copied into operational logs.
- The browser receives inert DTOs and complete authored source only for an explicit detail
  or comparison request after the sensitive-content warning. It renders source through Vue
  components and the ESM build of `monaco-editor`, never `v-html`. Single-file source
  models and both sides of a source comparison are read-only, use opaque in-memory URIs,
  set `readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
  `renderMarginRevertIcon: false`, and contain the complete authored text without resolving
  environment-variable references. `accessibilitySupport`
  stays `auto`, `accessibilityVerbose` is enabled, and each view has an `ariaLabel`.
  Monaco's diff editor owns bounded literal source comparison; recognition metadata is
  matched by `(tool, kind, fieldId, occurrence)` and compares/renders exact `authoredLiteral` values in
  Vue rather than substituting typed values or serializing them into an editor.
  The editor is client-only and lazy-loaded on file/compare routes. Nuxt/Vite emits the
  explicitly imported editor worker as a same-origin static asset; unused language-service
  workers, CDN assets, external workers, and blob workers are not allowed. Editor/model
  instances and subscriptions are disposed independently on route close, selection
  replacement, source disable, and generation replacement. The accessible diff viewer,
  meaningful ARIA labels, keyboard navigation, and inline narrow-screen view remain
  enabled and are verified manually as well as through browser tests. A line-cap or
  computation-timeout diagnostic leaves the complete authored side-by-side source visible.
  `app/composables/liveness.ts` owns the only client purge path and the lightweight
  capability-protected `/api/v1/session/liveness` heartbeat: one-second visible-page
  checks, a 750 ms request timeout, and a two-second monotonic browser-memory lease. A
  failed/mismatched heartbeat, lease expiry, hidden/page lifecycle event, or process loss
  disposes editor models/workers/subscriptions, clears all session DTO/DOM/detail/
  comparison/warning state, aborts requests, and increments `clientDataEpoch` so a late
  response cannot restore content. Every SessionSnapshot/FileDetail request captures that
  epoch, current generation, file ID where applicable, and an exact request token. An older
  session generation is ignored; before a newer generation is adopted, the epoch increments
  and all detail/editor/comparison state is aborted/disposed. An equal generation requires
  the current token. File detail is adopted only when epoch/generation still match and the
  readable file still exists. No browser storage, service worker, or response cache
  persists inspected content. The capability remains memory-only across a hidden-page purge;
  on visibility return the retained capability authenticates a fresh session snapshot. The
  SPA adopts its returned `sessionId` as the new liveness baseline without retaining or
  comparing the purged ID, and retains only the bounded, control-only `globalControl`
  recovery view. If active, disable is available from that view immediately; the SPA fetches
  and verifies the matching frozen consent preview before reconstructing retry controls.
  The recovery view always offers an explicit Resume inspection action, which re-fetches a
  matching session and constructs a fresh inventory summary with default state while
  restoring no old detail, comparison, editor, selection, filter, authored source, or
  acknowledgement. A later detail/comparison open requires a new acknowledgement. Failed
  authentication stays ended with the next step to reopen the printed URL.
- One coordinator serializes cancellable `GlobalEnableOperation` validation/admission,
  Repository scans, tool-specific Global scans, and Global-disable transactions. One consent record previews the three documented tool-home roots
  and owns one internal `GlobalToolControl` per confirmed tool. Each control owns any admitted
  root context and unpublished Source/boundary IDs outside scan working sets, so an initial
  scan failure can discard its whole working set without losing retry/disable authority.
  Initial enable and retry reserve all coordinator capacity for their full tool set before
  any state mutation. Rejection releases its share, accepted work transfers its share to the
  queued scan, and completion/failure/cancellation releases it; reservation failure is an
  all-or-none `503` with no state change. Once validation and job transfer finish, a final
  coordinator-locked operation-ID/epoch/state check atomically chooses the enable response
  disposition. An operation-first race commits `202`, closes the capacity lease, and
  unregisters immediately; a disable-barrier-first race commits `409`, enters draining, and
  closes/unregisters only after releasing operation-local resources and untransferred
  capacity, with no late mutation or leak.
  Post-consent validation accepts zero to three roots; each accepted root is scanned
  provisionally and a complete or contracted-partial commit
  creates its own Global Source identified by exactly one tool and bound to exactly one root
  and clears that control's reserved tool failure diagnostic. An all-rejected request retains
  active consent/control and returns `active-no-job` with no new Source or scan job; initial
  activation therefore has zero Global Sources, while a retry preserves existing Sources.
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
  unscanned Sources forward under the remaining shared file/byte/diagnostic budgets, and
  builds a replacement off to the side. Only a complete or contract-authorized bounded
  partial result commits the next generation. A successful source scan clears only that
  Source's session-owned stale-failure entry and its reserved diagnostic, carries both for other Sources, rekeys
  generation-owned graphs, and invalidates old file IDs, detail DTOs, and comparison
  selection. The same coordinator lock linearizes the generation and payload of every
  SessionSnapshot/FileDetail envelope; later network delivery cannot mix or relabel them.
  Global disable clears entries and reserved diagnostics for removed Global Sources but preserves any
  Repository entry and diagnostic. A fatal attempt publishes zero uncommitted results and leaves the
  last committed generation and IDs intact. When that attempt is an explicit rescan, the
  session creates or replaces one stale-failure entry and reserved actionable diagnostic
  for that Source, without removing another Source's failure. A fatal automatic first
  Repository scan leaves bootstrap generation 0 current. A fatal initial Global enable adds
  no `StaleSourceFailure` entry for the missing tool and preserves all
  pre-existing entries and the derived snapshot state. Both report through their keyed
  reserved failure diagnostic that no new inventory was committed. A fatal Global enable/rescan retains its exact consent,
  per-tool `GlobalToolControl` records, and any prior per-tool Global graphs for explicit retry or disable;
  Global disable removes their reserved tool lifecycle diagnostics, closes/removes all
  control-owned root contexts, and deletes every control, consent record, and frozen preview.
  Generation 0 is a committed zero-I/O bootstrap snapshot with no files or diagnostics, so
  a fatal first attempt has a legal retained current base. Explicit Repository and enabled-
  Global rescan commands share
  the same queue rules. Repeated Global disable joins an existing barrier; when no tool-specific
  Global Source or graph, active consent record, retained admitted Global root context,
  open Global inspection `FileHandle`, or running/queued Global scan/enable command
  exists, disable is an immediate no-op even if Repository work exists.

## Complexity Tracking

The pure Node.js product constraint introduces a documented residual race risk without
waiving the bounded-read, detected-race fail-closed, source-value-free diagnostic/logging,
or review requirements.
One unavoidable implementation cost is tracked explicitly:

| Complexity | Why it is required | Simpler option rejected |
|---|---|---|
| Repeated bounded `lstat`/`realpath`/`open`/`FileHandle.stat` validation and same-handle reads | Detect ordinary concurrent changes before accepting bytes and discard any result whose identity, metadata, or canonical containment changes | A direct `readFile(path)` or glob-only traversal has no generation-bound authorization, identity agreement, or post-read race detection |

**Residual risk and resolution path**: Path validation and `open` are not one atomic kernel
operation in Node.js, so a sufficiently privileged active mutator may win an undetectable
root, ancestor, or final-entry replacement race. Approval must treat that actor as out of
scope and must not call
the current checks a containment proof. Expanding the threat model requires either a future
Node directory-relative API with atomic beneath/no-follow semantics or an OS-enforced
read-only snapshot/sandbox around the scan root, followed by a renewed security review and
adversarial test plan.
