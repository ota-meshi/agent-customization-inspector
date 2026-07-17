# Implementation Plan: Inspect Agent Customizations

[日本語](plan.ja.md)

**Branch**: `dev` | **Date**: 2026-07-16 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-inspect-agent-customizations/spec.md`

## Summary

Build a read-only local inspector, launched with `npx`, that inventories and compares
allowlisted customization files for GitHub Copilot, Claude Code, and OpenAI Codex without
activating any inspected content. Use one cohesive package: a Nuxt client SPA in `app/`,
a Node CLI and local inspection host in `src/`, serializable contracts in `shared/`, a
minimal `bin.mjs` shim, and one published `dist/` tree. A fixed clean step removes only
package-owned prior `.output/`, `.build/`, and `dist/` trees. `nuxt build` produces the
static browser application in its standard `.output/public` staging tree; fixed assembly
steps validate and copy its root-absolute assets into `dist/public`, record exact
inline-script CSP hashes, and copy a manifest-closed tsdown CLI/parser-Worker bundle from
`.build/server`. The pure Node.js `src/inspection/safe-fs.ts` layer is the sole path by
which inspected sources are enumerated or read. It uses bounded `node:fs/promises`
traversal, canonical-path checks, opaque scan tickets, and same-`FileHandle` identity and
metadata checks before and after bounded reads. The browser presents masked source in a
read-only Monaco editor and uses
Monaco's diff editor for source comparison; typed recognition metadata is compared and
rendered separately with ordinary Vue components.

The security boundary is strict: the browser never reads the filesystem,
the Node host never dynamically imports customization files, and the initial release has
no static-export, MCP, remote-host, or automatic-watch mode. A loopback-only host sends
masked DTOs through a versioned HTTP API protected by a random per-process capability.
Explicit scans use the frozen inspection path allowlist, reject symlink traversal, apply
bounded reads and best-effort parsers, and atomically replace the in-memory generation so
reveal state cannot survive a rescan.

Customization discovery is maintained as four contract-versioned registries: documented
vendor lookup behavior (`behaviorId`), Inspector matcher/read policy (`ruleId`), runtime
composition strategies (`strategyId`), and official source records (`sourceId`). The common
allowlist contract owns matcher grammar and safety
invariants; separate Copilot, Claude, and Codex contracts own vendor behavior and
tool-specific rules; the composition contract owns ordering and relationship-only rules;
and the source registry owns exact official URL/section evidence and review metadata.
Repository and User/Global behavior use separate tables, and Copilot VS Code, CLI, and
Cloud surfaces are never collapsed into one lookup model.

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
(latest Nuxt-compatible release), `cac` 7.0.0, `open` 11.0.0, `yaml` 2.9.0,
`jsonc-parser` 3.3.1, `smol-toml` 1.7.0, and `monaco-editor` 0.55.1. The first lockfile
MUST revalidate these exact stable versions; prereleases and incompatible newer majors
are not considered eligible “latest” versions.

**Storage**: No durable application storage. Session, raw file bytes, masked values,
diagnostics, comparison selection, and reveal state exist only in process/browser memory.

**Testing**: Vitest 4.1.10 with `@vitest/coverage-v8` 4.1.10, Nuxt Test Utils 4.0.3,
Vue Test Utils 2.4.11, happy-dom 20.10.6, Playwright 1.61.1, and
`@axe-core/playwright` 4.12.1; fixture-driven unit, contract, integration, packaging,
performance, security, browser, and manual accessibility checks

**Target Platform**: Node.js-supported macOS, Windows, and Linux environments with a
modern browser. The package contains only platform-independent JavaScript and static
assets and requires no install script, runtime download, or end-user compiler. The server
binds only to `127.0.0.1` and has no remote deployment mode

**Project Type**: Single publishable ESM npm package containing a static Nuxt web client,
a Node CLI/local HTTP service, and shared serializable contracts. All executable runtime,
build, and test code is JavaScript/TypeScript; generated HTML/CSS, JSON manifests,
documentation, and the license are permitted declarative package artifacts

**Performance Goals**: Publish scan status within 1 second; complete a scan of 100,000
filesystem entries and 500 matching files within 10 seconds on the reference environment;
keep filtering and selection feedback under 100 ms for 500 items

**Constraints**: No customization-derived execution, child process, dynamic import,
network request, MCP connection, or source mutation; no boundary-external bytes are
accepted or published;
no exposed symlink is intentionally followed, and detected path changes commit no bytes;
the documented active path-component mutator remains outside the current threat model;
explicit opt-in before Global reads; raw secrets remain server-side until one
value is explicitly revealed; inert text rendering only; WCAG 2.2 AA; English/Japanese
documentation parity. Hard limits are 1 MiB per file, 32 MiB total file bytes, 200,000
visited entries, 2,000 customization files, 64 path segments, 1,024 aliases per file, 1,000 direct relationships
per file, 2,000 candidate provenances per recognition, 256 source-level condition facts
per source, 64 condition facts per assessment, 128 diagnostics per file, 5,000 per source,
10,000 per generation, 1,024 out-of-generation lifecycle diagnostics per session,
32 KiB per proposed Global-root input and 192 KiB per escaped Global-root display,
4,096 mask matches and 2 MiB
masked UTF-8 output per file, parser depth 64, 50,000 parser nodes, 64 KiB per scalar, 512
metadata entries and 2,000 ms per recognition, at most two parser workers with 64/16/4 MiB
old/young/stack limits, 64 KiB request bodies, and a 30-second scan deadline. Monaco diff highlighting
is attempted only when each side has at most 20,000 lines, uses an explicit 5,000 ms
computation timeout, and never receives a file beyond the 1 MiB read limit. Reaching a
scan-accumulation limit whose contract specifies partial publication produces a bounded
partial result and diagnostic. Request, registry-validation, per-item, and editor limits
use their exact `ResourceLimits` and contract behavior instead. Typed derivation is limited to one
edge and the first 128 distinct targets in deterministic rule/field/source order per static
seed; the 129th stops before target access and publishes the contracted partial result. A Codex config contributes at most 16 fallback basenames of
128 UTF-8 bytes each. Depth is per provenance: a bounded-derived provenance cannot seed an
edge, while an independent static provenance on the same file remains eligible. Generic
relationships never authorize a read.

Trusted package manifests use separate fail-closed build/runtime limits rather than scan
DTO limits: static manifest 2 MiB, 4,096 assets, 512 UTF-8 bytes per request path, and 32
inline hashes; server manifest 1 MiB, 256 `.mjs` records, 16 MiB per file, and 64 MiB
listed total. Both reject unknown keys, and the published package verifies the recursively
exact declared set.

**Scale/Scope**: One local user, one Repository source rooted at launch `cwd`, zero or one
opted-in Global source containing only the three documented instruction sets, up to 2,000
items in one transient session, and exactly two files in a comparison

## Constitution Check

*GATE: Passed before Phase 0 research and re-checked after Phase 1 design.*

- [x] **Root-cause design**: One package and one immutable source-root parameter solve the
      launch and inspection problem without a workspace split, repository picker, root
      discovery, static export, file watcher, or speculative extension system.
- [x] **Readable implementation**: `host`, `inspection/rules`, `recognizers`, `parsers`,
      `masking`, and `session` own separate invariants; vendor behavior, Inspector
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
- [x] **Safe boundaries**: The design freezes read candidates, keeps raw values on the
      Node side, authenticates local API requests, rejects every link or unverifiable
      boundary exposed by Node.js, destroys bytes after detected races, bounds every scan
      dimension, and records the non-atomic and platform-unobservable residual limits.
- [x] **Welcoming participation**: One-package setup, reproducible pinned tooling,
      objective expected results, keyboard-first workflows, actionable errors, and
      automated plus manual accessibility gates keep the project approachable.

### Post-design re-check

The data model distinguishes physical files, candidate provenances, documentation status,
and runtime applicability facts. The HTTP contract never returns unmasked source by
default, and the matcher contract permits only explicit static or vendor-specific one-edge
derived candidates; relationships, components, vendor locators, and excluded inputs cannot
expand the read boundary. The quickstart covers every stable behavior, rule, strategy, and
source ID, official-source drift review, the Repository `./` grammar and bare-`**/`
rejection, all required quality gates, and all four end-to-end stories. Monaco is
client-only, same-origin, bounded, and model-lifetime scoped; its own diff engine avoids a
duplicate dependency while typed metadata comparison stays explicit. The Node.js-only
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
└── tasks.md                         # Created later by /speckit-tasks
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
│   ├── monaco.ts
│   └── session.ts
├── pages/
│   ├── index.vue
│   ├── compare.vue
│   ├── global-consent.vue
│   └── files/[id].vue
└── styles/

src/
├── cli.ts
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
│   ├── parsers/
│   │   ├── json.ts
│   │   ├── markdown.ts
│   │   ├── pool.ts
│   │   ├── toml.ts
│   │   ├── worker.ts
│   │   └── yaml.ts
│   └── masking/
│       ├── detectors.ts
│       └── mask.ts
└── session/
    ├── scan-generation.ts
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

bin.mjs
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
starts with the exact BOM-free, LF-terminated first line `#!/usr/bin/env node` and imports
`dist/cli.mjs`.

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

## Implementation Boundaries

- `src/inspection/safe-fs.ts` is the sole component allowed to enumerate or read enabled
  inspection sources. It creates an internal `InspectionRootContext` by checking every
  exposed lexical root component with `lstat`, rejecting links, resolving the accepted
  root with `realpath`, requiring a directory, and recording bounded bigint identity and
  metadata. Its deterministic bounded walker uses
  `node:fs/promises.opendir`, collects and sorts each directory within the remaining entry
  budget, validates every relative segment, counts every entry, and
  rejects links, non-directory traversal objects, and detectable device changes before
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
  independently addressable rather than sharing an inferred traversal.
- Static matchers and the three vendor-specific one-edge derivation families are the only
  read authorities. Derived segments pass the host-independent NFC/Windows-special grammar
  and must resolve to an exact enumerated `ScanEntryTicket` before read, so ADS, device,
  trailing-dot/space, case/normalization, and 8.3 aliases are rejected before candidate
  open. FR-015 through
  FR-018 continue to limit Global reads to the three instruction sets even when the vendor
  behavior registry records other supported User customizations.
- Tool recognizers attach one or more `ToolRecognition` values to every accepted
  `CustomizationFile`. A semantic recognition retains every accepted, in-limit independent
  candidate provenance while reading one physical file once; overflow publishes the
  contracted partial result and diagnostic. Recognizers may parse declarations as
  inert data but cannot import, evaluate, resolve remote content, or read relationship
  targets. Context extraction may synthesize only closed vendor-documented edges between
  already admitted files or fixed relationship-only defaults; non-file and excluded
  context becomes a source-level condition fact.
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
  disabled, JSONC tree extraction of known fields, TOML normalization without executing
  values, and Markdown/frontmatter extraction without HTML rendering. At most two parser
  `Worker` threads isolate synchronous parser work from the host event loop; V8 old/young/
  stack limits are 64/16/4 MiB, and each recognition has a 2,000 ms kill-and-replace
  timeout. A bounded traversal enforces depth 64, 50,000 nodes, 64 KiB scalars, and 512
  metadata entries. Any parser/resource failure discards that recognition's complete
  extraction result, including its relationships and derivation declarations, while the
  already-masked source and other successful recognitions remain usable.
- Masking uses only fixed bounded linear scanners. A 4,097th match or masked output above
  2 MiB produces the non-readable `masking-overflow` state: no prefix, metadata,
  relationship, derivation, mask, comparison, or reveal is exposed, raw/decoded content is
  dropped, and the generation is partial with a fixed safe diagnostic.
- The Node host uses `node:http`, a small static MIME table, a random 256-bit capability
  delivered in the URL fragment, exact Host/Origin checks, no CORS,
  `Cache-Control: no-store` for API responses, and a restrictive CSP. The host validates
  the closed static manifest and every packaged asset hash before bind. The CSP permits
  same-origin scripts plus only the exact build-recorded SHA-256 hashes for Nuxt's
  executable inline bootstrap, forbids inline executable attributes, eval, nonces, and
  external/blob workers, and retains inline style permission only for Monaco layout/theme
  output. API payloads use IDs
  rather than caller-supplied filesystem paths. The capability is memory-only; a refresh
  after fragment removal performs no API call and shows the instruction to reopen the
  printed process-lifetime launch URL. Only a fixed client-route grammar and build-manifest
  assets receive the inert SPA shell. Global consent uses a no-I/O lexical preview and a
  session-keyed digest. A proposed root above 32 KiB UTF-8 or whose bounded escaped display
  would exceed 192 KiB becomes `oversized` with `displayRoot: null`; it is neither
  normalized nor authorized, and the digest binds that null/state. Canonical alias
  differences after consent fail before enumeration instead of silently changing the
  displayed boundary.
- The browser receives masked source and inert DTOs only. It renders source through Vue
  components and the ESM build of `monaco-editor`, never `v-html`. Single-file source
  models and both sides of a source comparison are read-only, use opaque in-memory URIs,
  set `readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
  `renderMarginRevertIcon: false`, and contain masked text only. `accessibilitySupport`
  stays `auto`, `accessibilityVerbose` is enabled, and each view has an `ariaLabel`.
  Monaco's diff editor owns bounded literal source comparison; typed recognition metadata is
  compared field by field and rendered by Vue rather than serialized into an editor.
  The editor is client-only and lazy-loaded on file/compare routes. Nuxt/Vite emits the
  explicitly imported editor worker as a same-origin static asset; unused language-service
  workers, CDN assets, external workers, and blob workers are not allowed. Editor/model
  instances and subscriptions are disposed independently on route close, selection
  replacement, source disable, and generation replacement. The accessible diff viewer,
  meaningful ARIA labels, keyboard navigation, and inline narrow-screen view remain
  enabled and are verified manually as well as through browser tests. A line-cap or
  computation-timeout diagnostic leaves the complete masked side-by-side source visible.
- One coordinator serializes Repository scan, Global scan, and Global-disable transactions;
  ordinary scans are FIFO, while Global disable is a priority security barrier. It aborts
  and discards the active uncommitted transaction, cancels queued Global work, commits the
  zero-I/O Global removal next, and requeues an interrupted Repository command once behind
  that removal. Each scan job starts from the then-active session-wide generation, carries the
  unscanned source forward under the remaining shared file/byte/diagnostic budgets, and
  builds a replacement off to the side. Only a complete or bounded partial result commits
  the next generation; every commit rekeys all source graphs and invalidates all file IDs,
  comparison selection, and revealed values. A fatal attempt leaves the prior generation
  and IDs intact and reports only a capped session-lifecycle diagnostic; a fatal Global
  enable/rescan retains its exact consent/boundaries and any prior Global graph for explicit
  retry or disable. Generation 0 is
  a zero-I/O bootstrap snapshot with no files or diagnostics, so the first Repository scan
  and a fatal first attempt always have a legal active base. Explicit Repository and
  enabled-Global rescan commands share the same queue rules. Repeated Global disable joins
  an existing barrier; when no Global enabled flag, consent, nonempty graph, accepted root
  context, or running/queued Global scan/enable command exists, disable is an immediate
  no-op even if Repository work exists.

## Complexity Tracking

The pure Node.js product constraint introduces a documented residual race risk without
waiving the bounded-read, detected-race fail-closed, secret-safety, or review requirements.
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
