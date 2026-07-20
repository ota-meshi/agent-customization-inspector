# Implementation Plan: Inspect Agent Customizations

[日本語](plan.ja.md)

**Branch**: `dev` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

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

The selected Repository root is captured without filesystem I/O before session bootstrap:
the CLI captures `process.cwd()` once and uses that exact string when `--cwd` is omitted.
On Windows it rejects explicit UNC/server-share/device, current-drive/root-relative, and
drive-relative values including `C:` and `C:foo` before `resolve`; only a plain relative
option is resolved against the anchored capture, while an absolute drive option is retained.
POSIX retains an absolute option or resolves a relative option against the capture. The
selected absolute result must pass the one shared pure `LexicalAbsoluteRootParts` parser
with zero filesystem/network I/O. The CLI never calls `process.chdir()` or uses a per-drive
working directory. Missing, empty, duplicate, pre-resolution-invalid, or parser-rejected
values fail before session creation or browser launch. Bootstrap generation
0 synchronously contains the one Repository Source with a stable `sourceId` and escaped,
non-authorizing root label; only later central boundary admission can grant read authority.

The security boundary is strict: the browser never reads the filesystem,
the Node host never dynamically imports customization files, and the initial release has
no static-export, MCP, remote-host, or automatic-watch mode. A loopback-only host sends
inert DTOs through a versioned HTTP API protected by a random per-process capability. The
API returns a `FileDetail`, including complete authored source and declared authored values,
only to a capability-authenticated explicit detail request; the bundled browser makes no
such request and constructs no comparison until after its client-memory sensitive-content
acknowledgement. That acknowledgement is a presentation
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
For VS Code 1.118+, the Copilot contract adds an exact root `./.mcp.json` Inspector rule
beside the existing exact `./.vscode/mcp.json` rule. The versioned release note establishes
the new root path and a most-specific same-name rule, while the current guide still presents
`.vscode/mcp.json` and User configuration as the exhaustive locations. The behavior and
strategy therefore retain `conflict`; the root provenance is path/surface-only, contributes
no VS Code-owned extractor fields, and preserves unknown schema and total order. Because
the CLI descendant rule already admits the physical root file, both compatible provenances
merge into the one `(fileId, copilot, MCP)` recognition and one verified read.

Every user-visible inventory/API filesystem locator that identifies an inventoried
customization file or a safely normalized target within its owning Source is a
Source-relative Path computed from that Source's one root. This includes primary and alias
file paths, provenance paths, non-null normalized relationship targets, comparison/filter
labels, and file-scoped Diagnostic locations. It is repository-relative only for the
Repository Source; each Global Source uses its own admitted tool-home root and never shares
a path namespace with another Source. Authored literals are a separate surface and remain
displayed exactly as authored.

Root labels are a distinct presentation surface. An enabled `SourceBoundary.displayRoot`
is the one-way escaped presentation of that Source's root. A
`GlobalConsentPreview.entries[].displayRoot` originates before admission, when no owning
Source exists, and is the one-way escaped proposed lexical root; it may be absolute or
invalid. Neither field is a `SourceRelativePath`, identifies an inventory item, grants read
authority, or enters operational logs.

Every Inspector Repository matcher is explicitly based at the selected Repository root and rendered
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
`/speckit.plan` followed by `/speckit.tasks` is rerun before work resumes. Configuration,
CI, release, and package-policy
instructions MUST use only that one synchronized baseline.

**Dependency and breaking-change migration gate**: This initial-release baseline has a
planned migration impact of none because there is no prior published Inspector package,
public contract, persisted profile, or user data to migrate. Before package or configuration
work, T001 MUST confirm that determination in the `**Migration impact**` section of
`research.md`, the `**移行影響**` section of `research.ja.md`, and the corresponding
`**Dependency and breaking-change migration gate**` section of `plan.md` and
`**Dependencyおよび破壊的変更の移行gate**` section of `plan.ja.md`;
those exact paired sections are its design-evidence destination. Discovery of an affected
consumer or prior contract invalidates the determination and stops implementation for
replanning. Every accepted new or changed dependency and every breaking public-contract
change MUST record its rationale and migration impact. Design evidence MUST exist before
implementation; the corresponding `validation.md`/`validation.ja.md` evidence MUST exist
before release. Each record MUST identify affected consumers, contracts, data, and workflows;
required migration steps and compatibility or support window; and rollback/support path, or
give an explicit reasoned no-impact determination. Missing or stale bilingual design evidence
blocks T002; missing bilingual validation evidence fails the release gate.

`src/cli.ts` uses only Gunshi's stable root `define`/`cli` API. It defines a negatable
`open` boolean with a true default to provide `--no-open` and a single string-valued
`cwd` option for `--cwd <path>`, enables `strict: true`, explicitly rejects every
positional/rest argument before binding, awaits `cli()`, and maps its validation
`AggregateError` to fixed actionable output plus a nonzero exit. Before creating a
session it captures `process.cwd()` exactly once and rejects an empty or duplicate `--cwd`.
On Windows it rejects every explicit two-leading-separator UNC/server-share/device spelling,
single-separator current-drive/root-relative value, and drive-relative value such as `C:` or
`C:foo` before `resolve`; only a plain relative option is resolved against the captured
anchored drive-form value, while an absolute drive option is retained. POSIX retains an
absolute option or resolves a relative option against the capture. The resulting absolute
string—including the omitted-option capture—must pass the shared pure
`LexicalAbsoluteRootParts` parser reused by Global preview and central admission. Selection
performs zero filesystem/network I/O, never changes the process working directory, and never
uses per-drive working-directory semantics. Built-in
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
cell may be sampled or silently omitted. SC-003, SC-004, SC-005, SC-007, and SC-009 use
the checked-in `tests/fixtures/outcomes/manifest.json` and canonical
`tests/fixtures/outcomes/manifest.sha256` as one versioned, closed release-evidence
denominator. Each manifest case has a unique stable ID, criterion and required-class
membership, a fixture or deterministic-builder reference, an objective expected outcome,
and a digest for every referenced fixture byte. A contract test recomputes the canonical
digest and rejects schema/version errors, missing, duplicate, or undeclared cases, fixture
digest drift, empty required classes, missing fixtures, and any denominator below its
declared nonzero minimum. A case removal or reclassification, required-class-definition
change, or expected-outcome change must increment the manifest version and receive explicit
review; a fixture-byte-only change must update both the affected fixture digests and the
canonical manifest digest. `manifestVersion` is a positive safe integer beginning at 1.
The contract uses table-driven previous/current manifest objects in
`tests/contract/outcome-fixture-manifest.test.ts` to reject a denominator-semantics
change unless the current version is greater than the previous version and to reject
fixture-byte-only changes without both digest updates. It does not inspect VCS, network, or
reviewer state and does not establish human review. T1062 separately records actual initial
creation or prior/current versions, changed denominator semantics, and reviewer
decision/reference in the bilingual release validation. Either kind of change starts a new
non-comparable measurement set. The required classes are the exact tool/kind/admitted-source rows,
rejected selector families, and shared-file combinations for SC-003; prohibited effects,
Repository/Global boundary rejection, and detectable read-change classes for SC-004;
exact tool/kind/source rows, source/comparison surfaces, literal-credential/environment-
reference classes, and set/unset referenced-variable states for SC-005; every named failure
and first/explicit-rescan lifecycle class for SC-007; and every maintained Source Condition
Fact row, tool, product surface, and documented/unavailable state for SC-009. Release records
name the manifest version and digest plus every executed case ID; missing, omitted,
unexecuted, or mismatched evidence fails the affected criterion. The maintained usability
study kit uses one 20-person first-time cohort for SC-001 then SC-006, fixed prompts
and moderator limits, failure-as-unsuccessful accounting without replacements, the defined
timer boundaries, and a four-field SC-006 response form scored against fixed ground truth.
After that timed response, the same participants attempt standardized comparison and Global-
consent tasks. Moderators record objective workflow outcomes and predefined safety events;
the study equipment runs the SC-004 product network/URL/MCP instrumentation, an exact-authority
Inspector-server request ledger, and study-browser request capture continuously from Inspector
launch before SC-001 through all four observations. Process identity, exact issued authority,
request initiator and target, and server-ledger correlation attribute Inspector/bundled-SPA
traffic for exhaustive classification into the two exact authorized internal loopback classes
or prohibited traffic. Unrelated extension/host-process traffic and observable OS-mediated
mounted/mapped-source traffic are recorded separately; attributable but unclassifiable traffic
is outside the two classes. Every safety event is automatically critical. Only a suspected product-caused workflow
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
import, prohibited direct product-issued network request as defined by FR-022, MCP connection, or product-issued source mutation.
The two exact FR-022 browser/host classes at the issued `127.0.0.1` authority—closed
unauthenticated static/SPA `GET`/`HEAD` and capability-authenticated declared API requests—
are authorized internal loopback transport, not outbound requests or MCP connections; every
request outside those classes and every customization-selected or MCP request remains prohibited. Ordinary
Node.js filesystem I/O against a lexically indistinguishable pre-mounted POSIX network filesystem or mapped Windows drive may cause
OS-mediated traffic and remains an explicit platform/environment limitation; explicit UNC/server-share/device spellings are rejected
before filesystem, DNS, or SMB calls. The inspected-
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
filesystem, browser, and current execution environment. Deterministic, non-throwing
entry-local outcomes may use the contracted-partial path after complete traversal and
serializable assembly; binary input is one such outcome. Invalid non-NUL UTF-8 is instead a
complete readable `utf-8-replaced` outcome. The only inspected-source exception a domain
layer may catch is Node's exact `ENOENT` code from an `lstat` call that the contract declares
as a structural existence checkpoint. That checkpoint returns only `absent` when the entry
has not yet been observed or `entry-disappeared` when a previously observed or ticketed
entry vanishes; it does not inspect the message or apply to another code or operation,
including `realpath`, `open`, `FileHandle.stat`, or a read. Every other thrown exception or
rejected promise from inspected-source reading is not caught, classified, retried, or
converted into a file, Diagnostic, scan result, or partial generation by filesystem, parser,
recognition, or scan domain layers. Its trigger-owning outer boundary may catch only to
express execution lifecycle: a REST-owned operation returns a generic path/content-free
pre-acceptance HTTP error or accepted-job terminal Operation Error while keeping the process
and prior snapshot available; an automatic startup operation with no REST owner reaches the
process top level, with no process/session survival guarantee. Runtime-owned local
uncaught-error output is an explicit residual disclosure limitation outside the product API,
logs, and telemetry.

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
capacity, or other environment-resource condition has no application-defined classification
or recovery path when it manifests as a throw or rejection: it propagates to the
trigger-owning boundary, publishes no result from that attempt, and leaves any prior commit
unchanged. A deterministic returned derivation outcome may use only the closed complete or
contracted-partial transitions.

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

**Scale/Scope**: One local user, exactly one Repository source rooted at the parser-accepted
selected Repository root (the exact one-time invocation `process.cwd()` capture by default
or the accepted single `--cwd` value after the platform-specific pre-resolution gate), zero
to three admitted tool-specific Global sources produced by one session-wide all-tools
opt-in (at most one each for Copilot, Claude, and Codex), exactly one root per Source, and
exactly two files in a comparison. Inventory size is governed by the supported runtime and
execution environment rather than a product-defined item ceiling.

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
- [x] **Dependency and public-contract governance**: The initial unpublished baseline has a
      reasoned no-migration-impact determination that T001 must confirm. Every accepted new
      or changed dependency and breaking public-contract change must record rationale,
      affected consumers/contracts/data/workflows, migration and compatibility steps, and a
      rollback/support path, or an explicit reasoned no-impact determination; missing or stale
      bilingual design evidence blocks T002, and missing bilingual validation evidence blocks
      release.
- [x] **Complete verification**: The test layout covers unit, contract, integration,
      security, package, performance, end-to-end, error, boundary, accessibility, and adversarial
      safety scenarios, including all four user stories, the published SC-002 profile/status
      request/generation protocol, unchanged propagation of thrown or rejected operations to their owning execution boundaries,
      product-issued mutation and OS-atime separation, path/content-free operational logs,
      the product-wide FR-032 negative boundary, the complete bilingual 55-row WCAG Level
      A/AA acceptance matrix, FR-039/SC-009 origin-file-less Source Condition Facts, and the
      versioned digest-bound nonzero release-evidence denominators for SC-003/004/005/007/009.
- [x] **Documentation parity**: Every Phase 0/1 artifact has an English canonical file and
      a semantically equivalent `*.ja.md` companion. Implementation must update both user
      and contributor guides, all vendor/Repository/User/Global/surface tables, official
      evidence, security boundaries, and diagnostics.
- [x] **Safe boundaries**: The design freezes read candidates, authenticates local API
      requests, and separates capability-authenticated API access from the bundled browser's
      in-memory sensitive-content acknowledgement. That gate covers every authored-value
      field in `FileDetail` and comparison-derived state. The central full-session purge is
      distinct from ordinary scoped route/Source/generation cleanup, and Global disable is
      the explicit exception that invokes the full purge before its request. Deliberately inspected complete content
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
and runtime applicability facts. The HTTP contract returns complete authored source and
declared authored values only to a capability-authenticated explicit detail request; the
bundled SPA makes no `FileDetail` request and constructs no comparison content before its
client-memory warning gate. The API neither
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
clarification or known constitutional violation remains. The frozen outcome-fixture
manifest and digest close the SC-003/004/005/007/009 release denominators and fail any
missing class, case, fixture, execution record, or digest match.

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
├── tasks.md                         # Created later by /speckit.tasks
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
    ├── outcomes/
    │   ├── manifest.json
    │   └── manifest.sha256
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
The implementation gate verifies the already-frozen bilingual rows and their recorded
digest only; it may not edit their membership, identifiers, or source-form applicability
under an implementation task. Any semantic mismatch or desired change stops dependent work
and requires synchronized plan/task regeneration before the changed rows can be consumed.
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
  directory enumeration, it completes checkpoint rows 21–24 immediately before `opendir`,
  after first preallocating the process-wide resource-registry reservation. It drives the
  registered `fs.Dir` only with explicit `Dir.read()` calls until null, then repeats rows
  25–28 while that directory remains open. Only after the directory reaches registry
  `close-confirmed` may it classify the complete sibling set, descend, or issue a ticket.
  Those checks compare root, available ancestor, and target-directory identity/type plus
  bound `mtimeNs`/`ctimeNs`; a detectable create/remove/rename, unverifiable check, or
  unconfirmed close discards the enumeration. The service retains exact `Dirent.name` raw
  segments for path operations and separately derives NFC
  classification segments for matching, sorting, and DTO paths. Distinct raw sibling
  spellings with one NFC key fail closed as a whole collision group without descent/read; a
  non-colliding NFD-only spelling is read through its raw segments and displayed as NFC. The
  collision diagnostic is one pathless session-scoped record because no unambiguous public file path exists.
  Within one Source scan attempt, static discovery, admission, normalization-collision
  rejection, and physical grouping complete before any group read, except for the
  content-dependent Codex ordered fallback. A physical identity is usable only with exact
  bigint `dev`/`ino`/`nlink`, `ino !== 0n`, stable positive `nlink`, and a group count no
  greater than `nlink`; otherwise the group is boundary-unverifiable with zero accepted
  bytes. For one usable verified physical file admitted through multiple allowlisted
  hard-link paths, exactly one primary handle/content read occurs. Its primary
  `sourceRelativePath` is the lowest NFC classification path by unsigned UTF-8-byte
  lexicographic order; the remaining unique paths use the same order in
  `aliasSourceRelativePaths`. Enumerated raw segments remain associated with each provenance
  and are its only filesystem operands. A targeted fixed path that forbids parent
  enumeration instead uses only the exact immutable registry target-spelling segments; it
  never substitutes NFC classification/display spelling. Inventory filtering, detail labels, and selection match the
  primary and every alias, while any file-scoped Diagnostic uses the primary path only.
  Sources, scan attempts, and generations verify and read independently. A hard-link path
  discovered after group consumption is never merged or reopened: the Codex ordered
  fallback and a later derived path use their distinct contracted zero-read rejection
  diagnostics.
  service rejects links, non-directory traversal objects, and detectable device changes before
  emitting generation-bound `ScanEntryTicket` objects. A ticket is branded in private JS
  state, cannot be serialized or reconstructed from a DTO or HTTP request, and can be
  consumed at most once. Client-supplied paths never authorize I/O.
- The traversal contract enumerates every structural existence checkpoint before execution.
  Only the `lstat` wrapper for one of those checkpoints may test whether Node's error code is
  exactly `ENOENT`: before any successful observation it returns `absent`, and after a
  successful observation or ticket issuance it returns `entry-disappeared`. Neither outcome
  grants authority or retains bytes. The wrapper does not inspect an error message, infer a
  cause, or catch another `lstat` error. Every throw or rejection from any non-structural
  `lstat` or from `realpath`, `opendir`, `open`, `FileHandle.stat`, byte reading, parsing, or
  any other operation propagates unchanged under FR-041, even when its code is `ENOENT`.
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
  comparisons over the same fields, then invokes or joins the registry closer in `finally`
  and accepts no result until the handle is `close-confirmed`. Any detected link,
  boundary, identity, type, size, or metadata change rejects the candidate; any collected bytes are discarded, no readable
  content or receipt is committed, and only a diagnostic-only inventory record may
  remain. An authenticated Diagnostic is emitted; its Source-relative Path is never
  projected into the fixed-code/opaque-ID operational event. A changed root aborts
  that source attempt and preserves its previously committed graph.
- One process-wide `ClosableResourceRegistry` is the sole owner and close-state machine for
  every inspection `FileHandle` and `fs.Dir`. Before `open`/`opendir`, the coordinator
  inserts an `opening` reservation; successful acquisition fills that record before the
  resource can escape, and failed acquisition removes it. The exact resource may be closed
  once, and all callers join one retained close promise. A fulfilled close, or a FileHandle
  `close` event, confirms closure. If the event confirms first, a later raw close-promise
  rejection is observed but treated as successful and neither propagates nor poisons.
  Rejection without confirmation produces `close-unknown`, propagates through the owning
  REST/startup boundary, and poisons new inspection scheduling until a later FileHandle
  event confirms it; an unknown `fs.Dir` close requires process restart. Disable reuses this
  same registry and cannot commit until every resource in its cleanup lineage is
  `close-confirmed`.
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
- If a successful operation returns required identity/metadata or canonical path data that
  is unavailable, ambiguous, malformed, or otherwise unusable, the layer returns the
  deterministic `safe-fs-boundary-unverifiable` boundary or candidate outcome; it never
  guesses. A root-level outcome aborts the source attempt, while a candidate-level outcome
  may retain only the diagnostic record. This classification uses returned data only: the
  exact structural-`lstat` `ENOENT` conversion above is the sole caught exception, and every
  other throw or rejection follows FR-041.
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
  selector, and Expansion, renders from the exact selected Repository root with `./`, and rejects bare
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
  on non-empty content, advances to `AGENTS.md` only when the override is safely established
  empty or its contract-declared pre-observation structural `lstat` returns exact `ENOENT`
  and therefore `absent`, and publishes at most one Codex Global instruction file. After one
  optional leading BOM is removed, empty means exactly
  `decodedText.trim().length === 0` under the supported ECMAScript runtime. A decoded
  `utf-8-replaced` string participates unchanged, so any `U+FFFD` makes it non-empty unless
  other non-whitespace text already does. Binary is a deterministic no-fallback outcome. An
  exact `ENOENT` from a contract-declared structural recheck after the override was observed
  becomes `entry-disappeared` and also performs no fallback. Every other thrown or rejected
  probe follows FR-041, performs no fallback, and, during an initial or retry Global batch,
  aborts the whole transaction rather than committing a sibling subset.
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
  outcome after complete traversal. A thrown or rejected read/parser/Worker operation is not
  caught or translated by recognizers or the scan domain; it propagates to the owning outer
  boundary and contributes no item or generation result from that attempt. Recognizers may parse declarations as
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
  In particular, Repository-root `.mcp.json` merges the Copilot CLI provenance and the
  exact VS Code 1.118+ path-only provenance without another file/read. CLI `mcpServers`
  extraction remains provenance-specific; the VS Code provenance adds no schema fields or
  inferred winner while the registered release-note/current-guide conflict remains open.
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
  ineligibility. All other bytes are decoded exactly once as UTF-8 with replacement
  semantics. Exactly one leading UTF-8 BOM is recorded and removed from `sourceText`;
  otherwise valid input uses `utf-8`, BOM-bearing valid input uses `utf-8-bom`, and any
  replaced invalid sequence uses `utf-8-replaced` (also recording BOM removal when present).
  Every resulting `U+FFFD` remains in the complete `sourceText` passed to parsing, display,
  extraction, and comparison. No charset detection, alternate decode, sampling, or
  truncation occurs, and this outcome alone does not make a generation partial.
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
  deterministic non-throwing parser/extraction outcome, discards that recognition's
  complete extraction result, including its relationships and derivation declarations, while
  the complete authored source, comparison eligibility, and other successful recognitions
  remain usable in a contracted partial generation. Any parser/Worker throw or rejection
  instead propagates without a domain catch, classification, retry, Diagnostic, or partial
  result and is represented, if REST-owned, only by the generic outer-boundary Operation
  Error. No parser or
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
  session-keyed digest. Each new unconsented preview reads `COPILOT_HOME`,
  `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once in that order, treats only `undefined`
  as absent, and calls imported `node:os.homedir()` exactly once if any is absent. It uses
  active-platform `node:path.join` with fixed `.copilot`, `.claude`, and `.codex` suffixes
  only for absent entries and never independently chooses `HOME` or `USERPROFILE`.
  Proposed roots are represented and escaped with the supported
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
- The capability-authenticated API returns inert DTOs and complete authored values only for
  an explicit detail request. The bundled browser holds acknowledgement only in memory,
  resets it on reload or central full-session purge, and issues no `FileDetail` request or
  comparison construction before the sensitive-content warning is acknowledged; this gate
  therefore covers complete source text, declared authored metadata, authored relationship
  targets, and either comparison side. A route close, ordinary file or Source removal,
  selection replacement, or generation replacement disposes only its scoped models and is
  not itself the central purge, so acknowledgement may remain for the loaded document.
  Global disable is different: the action invokes the central purge before sending its
  request, and observing a greater `globalContentEpoch` or non-null disable fence repeats
  that purge before rendering.
  Acknowledgement is
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
  Repository comparison acceptance first uses two readable current-generation files from the
  same Repository Source; only after a successful Global commit does US4 verify a readable
  Repository file against a readable Global file while retaining each owning Source and
  Source-relative namespace.
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
  `app/composables/liveness.ts` owns the shared central client-data purge implementation and the lightweight
  capability-protected `/api/v1/session/liveness` heartbeat: one-second visible-page
  checks, a 750 ms request timeout, and a two-second monotonic browser-memory lease. A
  failed/mismatched heartbeat, lease expiry, hidden/page lifecycle event, process loss, or
  equivalent terminal full-session reset
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
  persists inspected content. Each successful liveness response is bound exactly to
  `{ sessionId, globalContentEpoch, globalDisableInProgress }`: an older epoch is rejected,
  an equal epoch with a null fence renews the lease, and a greater epoch or non-null fence
  triggers the full purge and control-only Global recovery before rendering. The capability remains memory-only across a hidden-page purge;
  on visibility return the retained capability authenticates a fresh session snapshot. The
  SPA adopts its returned `sessionId` as the new liveness baseline without retaining or
  comparing the purged ID, and constructs the minimal client-side `RecoveryViewState` from
  epoch, Global control/progress, pathless tool-failure Diagnostics, and generic Operation
  Errors only. When the disable fence is non-null, the session route supplies the exact
  control-only `GlobalFenceRecoverySnapshot`; when the fence is null, it supplies a normal
  full `InspectionSession`, but the recovering client adopts only those control/error fields
  and discards its inspection graph. If active, disable is available from that view immediately; the SPA fetches
  and verifies the matching frozen consent preview before reconstructing retry controls.
  The recovery view offers an explicit Resume inspection action only when the disable fence
  is null and a normal full snapshot can be fetched. It then re-fetches a matching session
  and constructs a fresh inventory summary with default state while
  restoring no old detail, comparison, editor, selection, filter, authored source, or
  acknowledgement. A later detail/comparison open requires a new acknowledgement. Failed
  authentication stays ended with the next step to reopen the printed URL.
- One coordinator serializes cancellable `GlobalEnableOperation` admission and its single
  `GlobalBatchScan`, Repository scans, later explicit single-Source Global rescans, and
  Global-disable transactions so scans do not overlap and generations cannot interleave.
  Queue and operation capacity is inherited from Node.js and the current process environment;
  the Inspector defines no command-slot, queue-depth, handle-count, or admission-byte quota.
  Global disable is a priority security barrier that is accepted independently of ordinary
  work and may join an existing disable transaction.
  One consent record always previews the fixed closed-order tuple `[copilot, claude, codex]`
  and offers one all-tools confirmation action with no UI or API per-tool selector.
  `confirmedTools` is that complete tuple, including a frozen entry whose lexical preview is
  invalid; eligibility never narrows consent. The server owns one internal
  `GlobalToolControl` for each tuple member. After non-I/O request/digest validation, an
  initial enable keeps the frozen consent and all three controls operation-local and
  unobservable throughout root admission; it creates no session `globalControl` or pending
  state yet. A retry instead uses the existing active consent/control state as its exact
  pre-operation snapshot. New root contexts and candidate Source/boundary IDs remain
  operation-local in either case. Only after every owned tool has a deterministic admission
  outcome does one coordinator decision atomically activate the initial consent/controls or
  apply the retry partition and, when roots were admitted, attach every context and transfer
  one batch. Batch scan results and graph records then remain tentative until their one
  generation commit.
  Initial enable attempts all three frozen entries. Retry derives the complete currently
  missing or deterministically rejected set from the same fixed tuple; the request cannot
  select, omit, or narrow it. Admission partitions that server-owned set into a deterministic
  rejected subset and an admitted subset of zero to three roots. A lexically invalid entry,
  exact `ENOENT` from its contract-declared pre-observation root `lstat`, or non-throwing
  deterministic link/type/change/boundary/identity rejection excludes only that root and
  allows admitted siblings to continue. An exact `ENOENT` at a declared structural recheck
  after observation returns `entry-disappeared`, never fallback. Every other throw or
  rejection applies FR-041 and aborts the entire enable/retry transaction: every sibling's
  tentative context and result is discarded, no admitted subset is committed, and the exact
  pre-operation snapshot is restored. For initial enable that snapshot has no active
  consent/control; for retry, the pre-existing consent and controls remain available for
  retry or disable without acquiring tentative root authority.
  When the admitted subset is empty and no operation threw or rejected, the coordinator
  records the deterministic rejected controls and returns `active-no-job`; it creates no
  `scanRequestId`, scan job, Source, or generation. When at least one root is admitted, the
  coordinator atomically attaches every admitted context and candidate ID to its control and
  transfers them together into exactly one `GlobalBatchScan` with one `scanRequestId`, one
  publication authority, and one working set. That batch
  assembles one separately identified Global Source for each admitted tool/root pair—never a
  logical Source combining Copilot, Claude, and Codex—and publishes all of them together only
  through one post-read-verified `committable-complete` or `committable-partial` generation
  commit. Initial enable or retry therefore has exactly one batch-level scan job, result, and
  observable commit.
  After admission and any batch transfer, a final coordinator-locked
  operation-ID/epoch/state check atomically chooses the response disposition. A batch whose
  operation wins the race returns `202` with its shared `scanRequestId`; an all-rejected
  operation returns `active-no-job`. A disable-barrier-first race returns `409`, enters
  draining, and unregisters only after operation-local cleanup, with no late mutation or
  leak.
  The session `globalControl` DTO identifies the fixed confirmed tuple plus pending and
  retryable tools without exposing root authority. For active-consent retry,
  `pendingTools` projects the server-derived missing-Source set from validation/admission
  through the single batch. Initial enable keeps every provisional value operation-local
  with no `globalControl` until its final atomic activation; only its accepted batch tools
  then appear pending. An `unvalidated` active control is always pending. Retryable tools remain informational while any work is pending; retry
  is offered only after `pendingTools` is empty, while disable remains immediate. The
  consent-preview route returns the frozen active preview after a client purge.
  Ordinary work is FIFO, while Global disable is a priority security barrier. First
  acceptance of a non-no-op barrier atomically increments the command epoch and
  `globalContentEpoch`, installs non-null `globalDisableInProgress`, revokes publication
  authority, and rejects new Global-enable/Global-rescan commands. It sets
  `globalControl.state: disabling` and empties pending/retry arrays only when an active
  control snapshot exists; with only an operation-local initial enable, that control
  projection remains null while the barrier still appears in the control-only recovery DTO.
  Every ordinary inspection-data route is fenced with `409 global-disable-pending`; the
  session route returns only `GlobalFenceRecoverySnapshot`. Each inspection-data handler
  binds its captured `globalContentEpoch` and, under the coordinator lock at final
  publication, requires an unchanged epoch and null fence or discards the body. The liveness
  handler instead binds exact `{ sessionId, globalContentEpoch, globalDisableInProgress }`
  values from one current coordinator-lock snapshot at publication and returns a current
  non-null fence so another tab can observe the barrier.
  The barrier aborts and discards an active uncommitted batch, drains enable admission and
  every tentative root context/result through the shared resource registry, performs a
  final queued-Global-work cancellation sweep, and requeues one interrupted Repository
  command only after terminal success. Success with any public Global consent, control, or
  Source state publishes exactly Repository-only N+1 and rekeys carried graph IDs; only an
  unpublished operation-local initial-enable may use cleanup-only success, which removes the
  fence while preserving N and every generation-owned ID.
  Disable, shutdown, or explicit cancellation leaves pending work cleanup-only and never
  publishes or interleaves a late result. Disable succeeds only after every lineage resource
  is `close-confirmed`; an unknown close or other post-acceptance failure keeps the process
  alive but leaves the data fence and generic Operation Error retryable, with restart as the
  fallback for unrecoverable cleanup. A pre-acceptance failure or true no-op leaves the fence
  null. API and liveness handling continue while the event loop can serve them, but disable
  cannot claim physical drain completion before the underlying promise settles.
  The Global batch starts from the active session-wide generation, carries every unaffected
  Repository and previously committed Global Source forward, and builds all admitted
  replacements off to the side. A successful complete or contracted-partial batch advances
  the generation exactly once, publishes every assembled Global Source atomically, clears
  only the participating controls' applicable failure state, rekeys all generation-owned
  graphs, and invalidates old file IDs, detail DTOs, comparison selection, and editor state
  once. Carried Sources preserve their stable `sourceId`, semantic inventory, and authored
  source content. An all-rejected enable/retry commits no generation and changes no carried
  ID. The same coordinator lock linearizes the generation and payload of every
  SessionSnapshot/FileDetail envelope; later network delivery cannot mix or relabel them.
  A later explicit rescan remains a single job for one existing Source and may commit one
  replacement generation under the same complete/contracted-partial rules. Its success
  clears only that Source's stale-failure entry and lifecycle diagnostic while carrying
  another Source's failures. Its fatal failure may create or replace only that Source's stale
  overlay. This single-Source rescan path does not alter the atomic batch requirement for
  initial enable or retry.
  Any unexpected throw or rejection during a Global batch produces no domain result and
  follows its trigger-owning REST boundary. Before job acceptance it creates no
  `scanRequestId`; after acceptance it terminates the one shared request with a generic
  path/content-free Operation Error. In either case it commits none of the tentative sibling
  Sources or results, leaves the last committed generation and IDs intact, adds no
  `StaleSourceFailure` for an as-yet-uncommitted tool, and retains the exact pre-operation
  consent/control, admitted root contexts and candidate IDs, and prior per-tool graphs for
  retry or disable. A fatal automatic first Repository scan separately leaves bootstrap
  generation 0 current. Global disable removes control-owned lifecycle diagnostics,
  closes/removes all retained root contexts, and deletes every control, consent record, and
  frozen preview.
  Each retained Diagnostic uses exactly one attachment scope, independently of its generation
  or session-lifecycle lifetime. File scope requires a matching `sourceId`, `fileId`, and
  Source-relative Path; source scope requires only `sourceId`; session scope permits none of
  those location fields. Invalid combinations are rejected, and source/session records never
  fabricate a file ID or path.
  Generation 0 is a committed zero-I/O bootstrap snapshot with exactly one idle Repository
  Source selected lexically from the captured invocation working directory and optional
  `--cwd`, and with no files or diagnostics, so a fatal first attempt has a legal retained
  current base. Explicit Repository rescans, enabled-Global single-Source rescans, and Global
  batches share the same queue rules. Repeated Global disable joins an existing barrier;
  when no tool-specific Global Source or graph, active consent record, retained admitted
  Global root context, affected `ClosableResourceRegistry` record for a `FileHandle` or
  `fs.Dir` in `opening`/`open`/`closing`/`close-unknown`, running/queued Global
  scan/enable command, or retained disable failure exists, and the registry is not poisoned,
  disable is an immediate no-op even if unrelated Repository work exists. An unrelated
  registry poison instead returns `409 resource-cleanup-restart-required`; neither branch
  enumerates or reads the filesystem, creates a job, or changes the generation, epoch, or fence.

### Closed Runtime State Tables

#### Global root admission

| Input/phase | Internal transition | I/O and public result |
|---|---|---|
| Tool-home setting is captured as `undefined` | `preview-default` | From the one request-wide `node:os.homedir()` capture, use active-platform `node:path.join` with that tool's fixed `.copilot`/`.claude`/`.codex` suffix and zero filesystem I/O, then classify the resulting exact string through the ordered rows below; retain this tool in the fixed three-entry confirmation and create no authority |
| Captured environment setting has length zero | `inputState: present-empty` / `preview-invalid` | Apply this first and only to an environment-origin value; retain the entry in the fixed three-entry confirmation, perform no fallback or filesystem/network I/O, and create no root, Source, job, or generation for it |
| Otherwise the exact string contains U+0000 or an unpaired UTF-16 surrogate | `inputState: invalid` / `preview-invalid` | Reject before `path.isAbsolute` and before the shared parser, retaining only the invalid preview entry with zero filesystem/network I/O and no authority |
| Otherwise active-platform `node:path.isAbsolute` returns false | `inputState: relative` / `preview-invalid` | Retain the relative preview entry with zero filesystem/network I/O; do not normalize, resolve, fall back, or create authority |
| Otherwise the shared pure `LexicalAbsoluteRootParts` parser rejects the absolute spelling | `inputState: invalid` / `preview-invalid` | With zero filesystem/network I/O, reject the closed POSIX U+FFFD, empty/dot/dot-dot component, repeated/non-root trailing separator cases and the closed Windows UNC/network/device/current-drive, malformed-drive, and invalid-component cases; retain no parsed operand or authority |
| Otherwise the shared parser accepts the absolute spelling, including one outside the ordinary home | `inputState: eligible` / `preview-eligible` | Retain its exact parsed platform operands, escape and digest the stored raw lexical value with zero filesystem/network I/O, keep it in the fixed three-entry confirmation, and await the one all-tools consent action; only this row can reach post-consent admission |
| Consent/digest is stale, replayed, or mismatched | `consent-rejected` | Perform zero proposed-root I/O; create no authority |
| A contract-declared pre-observation root `lstat` returns exact `ENOENT` | `absent` | Touch only that proposed root through the centralized structural check; do not fall back or create its Source, and continue partitioning the same fixed-three transaction |
| A contract-declared structural `lstat` returns exact `ENOENT` after the entry was observed or ticketed | `entry-disappeared` | Discard its tentative authority and bytes, never fall back, and use only the applicable deterministic rejected/scan outcome while unaffected siblings remain eligible |
| Post-consent lexical/canonical/link/type/containment/identity checks return a deterministic failure without throwing | `root-rejected` | Touch only the proposed root through `safe-fs`; do not fall back or create its Source, and continue partitioning the same transaction |
| Any proposed-root operation throws or rejects other than exact `ENOENT` at a declared structural `lstat` | FR-041 propagation | Abort the whole Global transaction, discard every provisional sibling context/result, publish no admitted subset, and retain the prior snapshot |
| Post-consent admission succeeds for one or more roots and no operation throws or rejects | `root-admitted` batch subset | Atomically attach all admitted private contexts/IDs to their controls and transfer them together to the one `GlobalBatchScan`; create no public Source or graph before its single atomic commit |

#### Verified-byte decoding

| Verified-byte condition | `encoding` | Source and recognition state |
|---|---|---|
| Any `0x00` byte | `binary` | Diagnostic-only item; no `sourceText`, parser dispatch, recognition extraction, or comparison eligibility |
| No NUL, one leading UTF-8 BOM, remaining bytes decode without replacement | `utf-8-bom` | Record and remove the BOM; dispatch the complete remaining text to the Worker |
| No NUL or BOM and all bytes decode without replacement | `utf-8` | Preserve complete `sourceText`; dispatch it to the Worker |
| No NUL and one or more invalid UTF-8 sequences, with or without one leading BOM | `utf-8-replaced` | Decode exactly once with replacement semantics, record/remove the leading BOM when present, preserve every resulting `U+FFFD`, and use that complete garbled text for parsing, extraction, display, and comparison; this condition alone remains complete |

#### Scan publication and failure ownership

| Terminal condition | Internal outcome and owner | Atomic public result |
|---|---|---|
| Complete traversal; every admitted entry complete; assembly/serialization succeed; authority current | `committable-complete`, coordinator | Commit one `complete` generation and complete response; an initial/retry Global batch publishes every admitted tool-specific Source together in this one commit |
| Complete traversal; only deterministic entry-local non-capacity failures; unaffected entries complete; assembly/serialization succeed; authority current | `committable-partial`, scan assembler then coordinator | Commit one `contracted-partial` generation with affected diagnostics and complete unaffected entries; an initial/retry Global batch still publishes its whole committable admitted subset in this one commit |
| Fixed-three Global admission deterministically rejects every root and no operation throws or rejects | `active-no-job`, Global coordinator | Retain active consent/controls, create no `scanRequestId`, batch, Source, or generation, and preserve every carried ID |
| A filesystem, parser, Worker, coordinator, assembly, serialization, or authority operation other than the declared structural-`lstat` exact-`ENOENT` conversion throws or rejects before a REST job is accepted | Unclassified propagation to the REST request boundary | Create no `scanRequestId`, item, Diagnostic, scan result, response body from the attempt, or generation; abort every tentative Global sibling, return one generic path/content-free HTTP Operation Error, and keep the process/session and prior snapshot available |
| Such an operation throws or rejects after a REST job is accepted | Unclassified propagation to the accepted-job boundary | Abort the whole request, including every tentative Global batch sibling; commit no attempt result, Source, or generation; retain the prior snapshot and expose one generic path/content-free terminal Operation Error for the one `scanRequestId`; keep the process/session available |
| Automatic startup work with no REST owner throws or rejects | Unclassified propagation to the process top level | Publish no attempt result or generation; make no process/session survival guarantee. Product API/log/telemetry contains no raw error, while runtime-owned local uncaught-error output remains outside product control |
| Another deterministic fatal returned outcome that cannot use the complete or contracted-partial transition | Closed coordinator outcome | Abort the attempt, commit no result or generation, retain the prior snapshot, and expose only its fixed path/content-free lifecycle representation; an explicit rescan may mark that Source stale |
| Disable/shutdown/supersession/failure revokes authority | `revoked`, coordinator | Discard all late bytes, extraction, diagnostics, DTOs, events, and graph mutations |
| Transport fails after atomic commit | Existing committed outcome, host | Never relabel or expose a truncated body as partial; allow authenticated refetch of the already committed generation |

## Complexity Tracking

The pure Node.js product constraint introduces a documented residual race risk without
waiving same-handle reads, detected-race fail-closed behavior, source-value-free diagnostic/logging,
or review requirements.
The unavoidable implementation costs are tracked explicitly:

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
