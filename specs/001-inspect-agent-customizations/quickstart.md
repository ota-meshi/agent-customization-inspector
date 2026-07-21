# Quickstart and Validation Guide

[日本語](quickstart.ja.md)

This guide is the end-to-end acceptance path for the implementation described by this
feature. Commands become runnable as the corresponding implementation tasks add the named
scripts and fixtures; this document does not claim that the current scaffold already has
them.

## Prerequisites

- Node.js satisfying the exact `package.json` compatibility contract
  `^24.11.0 || ^26.0.0` (`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`); Node.js
  24.18.0 is the development/build baseline
- pnpm satisfying the repository `packageManager` declaration
- No additional compiler or platform-specific build workspace is required;
  inspected-source access is implemented by packaged Node.js modules
- The exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 through
  the project setup command; these pinned revisions are the reproducible automated browser-
  certification baseline, not an exhaustive list of browsers a user may run
- A browser capable of reaching `127.0.0.1`; for release evidence, use one of those certified
  revisions, including when the OS default handler selects some other browser

Confirm the toolchain:

```bash
node --version
pnpm --version
```

Expected: both commands satisfy the checked-in package declarations. Performance evidence
names the checked-in SC-002 profile ID and fixture digest and publishes the actual profile
values used, omitting only personal identifiers and absolute user paths. Do not change major
toolchain versions until Nuxt/Vue compatibility recorded in [research.md](research.md)
changes.

## Install and prepare

Dependency revalidation is a planning gate. If it changes any approved package or version,
stop before editing package or configuration files, synchronize every dependency-baseline-
bearing English/Japanese pair in `research`, `plan`, `quickstart`, and `tasks`, and rerun
`/speckit.plan` and `/speckit.tasks`. Do not continue with a second local dependency baseline.
Before package/configuration work, confirm the initial baseline's recorded no-migration-impact
determination: there is no prior published Inspector package, public contract, persisted
profile, or user data. If that premise is false, stop and replan. Every accepted dependency
addition/change or breaking public-contract change must record its rationale, affected
consumers/contracts/data/workflows, migration and compatibility/support steps, and
rollback/support path, or an explicit reasoned no-impact determination, in both languages.
The `**Migration impact**`/`**移行影響**` research sections and the paired
`**Dependency and breaking-change migration gate**`/
`**Dependencyおよび破壊的変更の移行gate**` plan sections are T001's exact design-
evidence destination; do not begin T002 while they are missing, stale, or inconsistent.
Release validation records the corresponding bilingual evidence before publication.

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium firefox webkit
pnpm run build
```

Expected:

- Install uses the committed lockfile without changing it.
- The build first removes only root-resolved package-owned `.output/`, `.build/`, and
  `dist/` trees. `nuxt build` creates root-absolute same-origin static assets in its
  standard `.output/public` staging tree; the strict assembler requires but omits the
  redundant `200.html`/`404.html`, rejects every HTML file except `index.html`, copies the
  accepted tree to a new `dist/public`, and writes `dist/manifests/static-assets.json` with
  every copied asset size/hash and every exact executable inline-script CSP hash.
- tsdown writes the named `cli.mjs`/`parser-worker.mjs` entries, the centralized Node.js
  filesystem service, and any code-split chunks with fixed ESM extensions into clean
  `.build/server`; the assembler writes
  `dist/manifests/server-assets.json` and copies exactly its listed regular `.mjs` files
  into `dist/`.
- `bin.mjs` is executable and starts with the exact BOM-free, LF-terminated first line
  `#!/usr/bin/env node`. Its bootstrap has no static import of `dist/cli.mjs`: it first
  verifies that the packed `package.json` is well formed, that its `engines.node` string is
  exactly `^24.11.0 || ^26.0.0`, that the
  running Node.js version is inside its expanded range, the installed package version, both
  static/server manifests, and every listed asset's exact path, regular-file type, size, and
  digest. Each manifest's declared byte length must equal the regular file's actual byte
  length, and the closed file set, MIME type, and digest must agree. Node.js, the filesystem,
  and the execution environment determine available capacity; the bootstrap defines no
  file-size, record-count, buffering, or open-handle ceiling. Only after all checks succeed
  does it perform the dynamic import of `dist/cli.mjs`;
  only that imported CLI may bind the server.
- `package.json.bin` is exactly `{ "agent-customization-inspector": "bin.mjs" }`, while
  `main`, `module`, and `exports` are absent.
- A malformed or inconsistent manifest, package-version mismatch, missing/unexpected asset,
  symlink/non-regular asset, or size/digest mismatch fails before CLI module evaluation and
  before any local server bind. Build, packed-tarball, and runtime verification enforce the
  same integrity contract while leaving available capacity to the execution environment. These
  checks do not validate customization-file content.
- Before packing, recursive verification finds exactly the two manifests and every
  static/server file they list under `dist/`, with no stale, linked, non-regular,
  or unexpected path.
- All project-authored application code and executable code in every project/dependency
  tarball payload is JavaScript. Generated HTML shell, CSS, JSON manifests, and required
  documentation/license files are declarative, non-executable artifacts; the manifest-
  authorized HTML bootstrap remains JavaScript and is covered by the CSP checks. Package-
  manager-generated `.bin` symlinks and `.cmd`/`.ps1` launch shims exist outside those
  payloads and are the only limited interoperability exception: each maps one exact
  declared `package.json.bin` target to audited Node JavaScript, forwards argv only, and
  adds no input or application logic. Package-owned shell helpers and unexpected shims are
  rejected. The exact production dependencies are the leaf packages `gunshi`, `yaml`,
  `jsonc-parser`, and `smol-toml`; `open` is absent.
- Build output contains no fixture, raw customization text, Global content, cache, or
  source-map path that exposes an inspected machine.

## Run the local inspector manually

Build first, then launch from a conformance fixture so that the fixture directory—not the
repository containing the implementation—is the process `cwd`:

```bash
cd tests/fixtures/repositories/all-supported
node ../../../../bin.mjs --no-open
```

The equivalent explicit-root launch from another directory is:

```bash
cd /path/to/agent-customization-inspector
node bin.mjs --no-open --cwd tests/fixtures/repositories/all-supported
```

The CLI captures the invocation `process.cwd()` once. Omission uses that exact string.
`--cwd` is accepted at most once. On Windows, UNC/server-share/device, current-drive/root-
relative, and `C:`/`C:foo` drive-relative forms are rejected before `resolve`; an absolute
drive option is retained and only a plain relative option is resolved against the anchored
capture. POSIX retains an absolute option or resolves a relative option against the capture.
Every selected absolute result must pass the shared pure `LexicalAbsoluteRootParts` parser.
A missing, empty, duplicate, pre-resolution-invalid, or parser-rejected value exits with
fixed actionable output before a session or browser attempt. Before CLI import, the launcher
may read only fixed package-owned manifests and their declared assets; root selection itself
does zero filesystem/network I/O, and the rejected launch does zero invocation-`cwd`-,
`--cwd`-, or selected-root-derived I/O and zero DNS, SMB, or outbound-network calls. Selection
never calls `process.chdir()` or uses per-drive working-directory semantics. A throwing
`process.cwd()` is an ownerless startup failure and reaches the process top level without a
session, browser, or REST `OperationError`.

Expected:

- The CLI prints the closed-grammar capability URL exactly once before any browser attempt
  and never binds a non-loopback address. With `--no-open`, it creates no child process.
- The Repository source root shown by the browser is the `all-supported` fixture itself.
- Within 1 second the UI visibly renders and exposes to assistive technology a status for the
  current scan request that says queued, names an active phase, or reports complete, partial,
  or failed (with a practical next step for failure), and the Source/progress identifies that
  request's opaque `scanRequestId`. A generic spinner/loading label,
  unchanged control, acknowledgement without scan state, or earlier-scan status does not count.
- The first complete inventory appears without any file outside the frozen path contract.
- Stopping the process destroys the server session. On an authorized page, a lifecycle-triggered
  liveness check or another authorized request that observes browser/network/runtime failure,
  authorization loss, or session mismatch purges every DTO, DOM source value, editor
  model/worker, comparison, and warning acknowledgement before the session-ended view; a
  hidden/page lifecycle event purges immediately. No product-defined interval, timeout, or
  lease controls this transition. Restarting—even with port reuse—has a different `sessionId` and
  capability, and no late response or previously displayed state returns.
- Reloading after the fragment has been removed sends no API request and shows the exact
  instruction to reopen the process-lifetime URL printed in this terminal; no capability
  is stored in browser storage or a cookie.

For ordinary use, the equivalent launch contract is:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

The project-owned launcher uses `spawn` with `shell: false`, the URL as its sole argv item,
and exactly one fixed helper: `/usr/bin/open` on macOS or `/usr/bin/xdg-open` on Linux. Its complete
environment is limited to macOS `HOME`, `TMPDIR`, `LANG`, `LC_ALL`; or Linux `HOME`, `DISPLAY`,
`WAYLAND_DISPLAY`, `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`,
`DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, `LC_ALL`. `BROWSER`, `NODE_OPTIONS`,
`NODE_PATH`, every non-allowlisted environment key, all inspection-derived content, paths, and
authored values, user-supplied commands, environment-selected handlers, and extra argv are
omitted. The allowlisted keys are copied directly from the launch environment as ambient
platform context only; no Source/preview/candidate/file path or authored value is copied from
inspection state into argv or environment. Lexical equality with an ambient value neither
changes provenance nor grants authority or selects a handler. This fixed startup
helper is the sole product-initiated child process permitted in the initial release.
Windows and every other platform deliberately skip automatic opening in this release because
portable Node supplies no independent trusted system-helper boundary. Missing/nonzero helpers
and unsupported platforms leave the server running with a fixed manual-URL warning. If automatic browser
opening fails, the already printed local URL is sufficient. Apart from the optional single
`--cwd`, there is no repository picker/ancestor-root discovery, remote-host flag,
static-export command, or MCP command
in the initial release.

Operational events use only stable fixed codes and optional opaque session/source/file/
scan/operation IDs. They contain no Source-relative, absolute, or canonical path,
root, filename, inspected content/metadata, authored value, capability, request/response
body, raw parser/system error, exception string, or Diagnostic argument. Fixed help/version,
the single launch URL, and fixed actionable startup warnings are presentation output, not
operational logs. An authenticated file Diagnostic may show its containment-proven Source-relative
Path in the session UI, but that path is never copied to operational output.

The fixed helper delegates the URL to the operating system's default browser; it neither
selects nor verifies a browser version, and helper success is not compatibility evidence.
For deterministic certification, use `--no-open` and paste the printed URL into one of the
three pinned Playwright revisions. For every enrolled participant-study session, record the
actual operating-system default handler or its unavailability and, when resolvable, the actual
browser family and revision. The default handler itself need not be certified, and fallback is
not a prerequisite to enrollment. If automatic opening is disabled, unsupported, or fails; the
handler or browser is unavailable or unidentifiable; or the resolved browser is outside the
certification baseline, use and record the printed URL in a pinned certified browser within the
same enrolled session. Keep that session's outcome in the fixed denominator and do not replace
the participant. Record the automatic-open condition separately: it is not itself an
unsuccessful SC-001 result when the participant completes the fallback without prohibited hints
inside the original two-minute interval. The timer never pauses or restarts; inability or
interruption that prevents completion is unsuccessful.

## Automated quality gates

Run every gate before considering an implementation change complete:

```bash
pnpm run build
pnpm run test:format
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:security
pnpm run test:package
pnpm run test:performance
pnpm run test:coverage
pnpm run test:e2e
pnpm run test:docs
```

Expected:

- The build completes. `test:format` passes the exact scope, byte-rule, exception, diagnostic,
  symlink, and pass/fail non-mutation matrix; `format:check` then reports no canonical-text
  drift without writing any file. Its closed scope and exact-path fixture exceptions match
  research and the package/CI contract.
- Lint and type checking complete without ignored failures.
- Unit tests cover path classification, ordering, parser failure isolation, exact authored-value
  presentation, environment-reference non-resolution, diagnostics, state transitions, and
  deterministic projections.
- Contract tests cover every API status/security rule and every stable behavior, inspection-
  rule, composition-strategy, and official-source ID, including positive, one-rule
  near-miss, derived, relationship-only, excluded, multi-provenance, multi-tool, and Global
  cases. They also prove every returned metadata field and relationship kind is present in
  the maintained closed presentation allowlist for its supported `(tool, kind)` and is an
  exact occurrence recognized by that admission's source-form extractor; one source form's
  fields never become eligible in another by tuple membership alone. Unknown authored keys
  and references remain available only in complete source text. Before these tests or their
   implementation begin, the Presentation Allowlist sections in all three vendor-contract
   language pairs must already enumerate every supported `(tool, kind)` and admitted source
   form. This gate verifies the approved rows and bilingual digest only; it must not author
   or semantically edit them. Any membership/source-form/extractor/relationship change stops
   work, synchronizes design artifacts, and reruns plan/task generation.
- Integration/security tests use recorded local fixture roots and instrument all product
  network/URL/MCP surfaces. They separately classify and validate the two exact FR-022
  authorized internal loopback classes at the issued `127.0.0.1` authority—closed unauthenticated
  static/SPA `GET`/`HEAD` and capability-authenticated declared API requests—and
  prove zero customization-derived execution, child process, MCP connection, prohibited direct
  product-issued outbound request as defined by FR-022, dynamic evaluation, or source mutation. Explicit
  UNC/server-share/device vectors prove zero filesystem/DNS/SMB calls. A lexically
  indistinguishable pre-mounted/mapped network source may cause OS-mediated traffic and is
  recorded separately as the FR-022 platform/environment limitation. The separately tested startup launcher receives no inspection-derived
  content/path, authored value, user-supplied command, or environment-selected handler; it
  copies only the closed ambient platform keys directly from the launch environment, and
  lexical equality with a Source root changes no provenance or authority.
- Package tests build a tarball, inspect its contents, install it into an isolated fixture,
  load the packaged Node.js filesystem service and fixed packaged parser Worker URL, and
  launch the exact `npx` entry without relying on the working tree or a runtime download.
  They also audit scripts-disabled and network-disabled normal installs of the complete
  production closure for the closed payload-JavaScript/no-lifecycle/no-native policy,
  separate package-manager-generated shim audit, and equal package graph digest on every CI
  OS. Negative bootstrap fixtures prove that `bin.mjs` never evaluates the CLI or binds
  before both manifests and every listed asset pass verification.
- The unchanged deterministic performance fixture with 100,000 entries and 500
  customization files is measured in exactly 10 fresh Inspector processes on the same
  versioned checked-in profile. The same at least 9 individual runs must each show a
  qualifying current-request status within 1 second, complete within 10 seconds, and keep
  both the standardized filter and item-selection dispatch-to-visible-operable-result
  measurements below 100 ms under the timer/cache protocol below.
- Browser, contract, and manual evidence cover all four user stories and satisfy every
  Applicable row and Not-applicable recheck in the
  [55-row SC-008 matrix](contracts/accessibility-acceptance.md); an axe severity result alone
  is not a pass.
- Documentation tests verify links, commands, the allowlist version, diagnostic codes,
  reciprocal cross-registry references, and semantic parity between each English/Japanese
  pair, and flag a changed official source snapshot for behavior/rule/strategy review.

## Contract-registry validation

```bash
pnpm exec vitest run tests/contract/vendor-behaviors
pnpm exec vitest run tests/contract/inspection-rules
pnpm exec vitest run tests/contract/runtime-composition
pnpm exec vitest run tests/contract/official-sources
```

The tests above are offline. A maintainer runs `pnpm run check:official-sources` explicitly
when reviewing upstream drift; it is the only source check allowed to use the network.

Verify:

1. Every shipped `behaviorId`, `ruleId`, `strategyId`, and `sourceId` occurs in exactly one
   owning bilingual contract and its matching immutable registry. Every cross-reference
   resolves, and every `sourceRefs` entry is reciprocal with its
   `OfficialSourceRecord`; offline tests recompute its semantic fingerprint. The explicit
   drift check enforces official HTTPS hosts plus exact section selection and normalization.
   Recoverable network or execution-environment failures fail closed without auto-updating
   a behavior, rule, strategy, or checked-in digest; no product-specific numeric fetch cap is
   part of the contract.
2. Vendor lookup bases, relative selectors, and traversal modes are validated independently
   from Inspector matchers. Every Repository matcher has the exact `./` Base and
   canonical-round-tripping typed segment programs paired one-to-one with its `./`-relative
   selectors; bare `**/`, unknown/misplaced tokens, adjacent recursive tokens, and
   selector/program count mismatches are rejected. Fixtures cover descendant-plus-direct-
   child and descendant-plus-recursive-subtree composites. `./**/` is accepted only as
   explicit Inspector descendant inventory and never interpreted as proof that a vendor
   walks downward. Build validation compiles the accepted programs into immutable,
   versioned `TraversalPlan` data, and runtime tests prove that the filesystem service
   interprets only that data rather than reparsing selector text or substituting a generic
   walker. A Global exact-file plan never opens the tool-home root and touches only its
   fixed ancestor/target chain; a fixed-instruction-subtree plan opens only that named
   subtree and permitted descendants. Every adjacent Global setting, credential, state,
   plugin, and other neighboring path receives zero `opendir`, `lstat`, `realpath`, open,
   or read calls. The closed Codex Global plan probes `AGENTS.override.md` first, performs
   zero operations on `AGENTS.md` after a safely read non-empty override, advances only
   after an absent or safely empty override, ends without fallback for a deterministic unsafe
   or binary present candidate, and publishes at most one non-empty file. Empty is exact
   post-BOM `decodedText.trim().length === 0`; `utf-8-replaced` is ordinary text and every
   `U+FFFD` is non-whitespace. Apply absent, empty, BOM-only, whitespace-only, non-empty,
   replacement-decoded, binary, and non-regular fixtures independently to both targets.
   Only exact `ENOENT` from the declared target `lstat` is caught as absence; after prior
   observation it is `entry-disappeared`. Every other throw/rejection propagates without
   fallback. These fixtures
   pin the content rule, short-circuit behavior, and zero operations on an unselected target.
3. Static rules authorize only their exact typed literal/one-segment/recursive-directory
   programs and traversal boundaries, never a text glob evaluated at runtime. A file
   admitted by static and derived rules is read once and retains both provenances, each
   with its own matched path, behavior/strategy/source evidence, scope/order, and
   applicability. Public provenance DTOs use the closed `ScopeDescriptor` and
   `OrderDescriptor` unions with Source-relative paths and stable comparison keys; unknown
   order is represented by null plus its condition fact, never a lossy recognition-level
   aggregate.
4. Surface fixtures keep GitHub Copilot VS Code, CLI, and cloud lookup behavior distinct.
   They prove that the VS Code workspace-root instruction is exact, while CLI standard-
   location and target-path traversal is represented as vendor behavior rather than an
   Inspector glob. Root-only and nested near misses demonstrate the difference. For MCP,
   they additionally require exact VS Code 1.118+ root `.mcp.json` provenance alongside
   `.vscode/mcp.json`, one physical read and one Copilot/MCP recognition when the CLI rule
   also matches the root file, reciprocal evidence for the release note and current guide,
   `documentationStatus: conflict`, no VS Code-owned root-schema fields, and unknown
   same-name ordering across root, `.vscode`, User, agent, and plugin inputs. A nested
   `.mcp.json` remains CLI-only; the product never infers a VS Code schema or winner.
5. Repository, documented User, and consented Global tables are validated independently.
   A documented User location never becomes Global read authority unless FR-015 through
   FR-018 name it, and runtime composition never merges the Inspector's Repository and
   Global source graphs.
6. The closed `DerivationProgram` has exactly five initial mappings and no runtime
   extension point: `copilot.derived.local-plugin-manifest`,
   `claude.derived.local-plugin-manifest`, `codex.derived.local-plugin-manifest`,
   `codex.derived.fallback-basename`, and `codex.derived.skill-metadata`. Each is one typed
   edge with an exact static seed rule/kind, closed declaration syntax, and fixed base/
   placement/suffix; callbacks, arbitrary joins, expressions, globs,
   and recursive derivation are unrepresentable. The program defines no numeric target,
   declaration, name, or ancestry ceiling; available capacity comes from Node.js and the
   execution environment. A bounded-derived
   provenance, generic
   relationship, sibling Codex subtree, remote source, or arbitrary config/component path
   never seeds another read. An independent static provenance on the same physical file can
   seed its own typed rule. Every derived provenance names its exact `seedProvenanceId`, and
   declarations from two seed provenances—including hard-link aliases of one physical seed
   file—never collapse even when they resolve to one target. Codex fixtures
   cover both plain-string and object `source.path` local marketplace forms. Seed-state
   fixtures prove known-satisfied output, unresolved conditional output, no output from a
   known unsatisfied/shadowed or bounded-derived seed, and stable deduplication without a
   product-defined retention count. Pure path fixtures run on every OS
   for ADS colons, Windows-special characters and device names, trailing dot/space,
   ambiguous case/Unicode-normalization alias collisions, and 8.3 aliases; none reaches read authorization or
   the centralized Node.js filesystem read operation.
7. Applicability keeps evidence assessment, product surface, root/runtime `cwd`, target
   match, trust/approval, enablement, selection, agent context, tool availability,
   installation, managed policy, and external runtime as separate facts. Every directly
   referenced behavior, rule, and strategy contributes one record-keyed
   `EvidenceAssessment`; `documentationStatus` accepts only `documented`,
   `partially-documented`, `unknown`, or `conflict`, while duplicate-free
   `lifecycleQualifiers` use fixed `preview`, `experimental`, `deprecated` order. Empty
   qualifiers make no lifecycle claim and never mean `stable`. Fixtures reject
   `documentation-conflict` in that enum, duplicate/out-of-order qualifiers, a missing or
   duplicate subject, and any provenance or relationship that replaces its sorted
   subject-by-subject `EvidenceAssessment[]` with one lossy scalar or union. Codex
   instruction byte budget is a separate fact; it can produce `omitted` only when the runtime chain and
   effective cap are known. Missing or excluded inputs remain unknown. Projection fixtures
   cover every summary and collision priority: disabled over shadowed, shadowed over
   omitted, omitted over selected, documentation-unknown over runtime-conditional, plus
   selected, available, authored, and conditional-only cases.
8. Fixtures assert known order/override rules, documented conflicts, settings disablement,
   and the Claude skills-directory plugin matrix: launch-`cwd` versus ancestor placement,
   workspace trust, implicit root skill, explicit `skills: ["./"]`, `skills/`, and another
   declared skills path.
9. Copilot agent fixtures cover profile body/name/description/metadata, `target` values
   (`vscode`, `github-copilot`, and omitted/both), tool/invocation fields, outer-model
   inheritance, IDE handoffs/legacy agents/body links/hooks, VS Code conditional
   instruction edges, unknown Cloud/CLI instruction composition and skill preload, Cloud
   versus CLI MCP source order, independently admitted Repository declarations, and
   excluded source layers.
10. Claude agent fixtures cover settings-selected main agents plus excluded CLI override,
   ordinary fresh versus forked conversation context, inherited instruction/rule context,
   custom-agent parent MCP inheritance and tool filters, inline versus named servers,
   strict/bare/managed restrictions, built-in positive/negative context facts, full-preload
   eligibility, optional Skill-tool discovery, and the three fixed memory scope targets.
11. Codex agent fixtures cover parent inheritance of omitted `nickname_candidates`, model/
   reasoning, sandbox, MCP, and skill config versus explicit child values, live sandbox/
   approval reapplication, local versus hosted surfaces, and unknown AGENTS.md inheritance. Other Codex fixtures cover default
   `hooks/hooks.json` versus manifest override, including documented-default/null-authored-
   target versus exact authored occurrence. Upstream-configured instruction-budget behavior
   remains a vendor applicability fact and is not redefined as an Inspector validation cap.
12. Source-level incompleteness and product-versus-inspector symlink-divergence fixtures
   identify the tool, explaining non-candidate rule, affected candidate/relationship rules,
   and fixed reason code for every source-level fact; matching provenance/edge conditions
   project it without losing the canonical source fact. Origin-file-less Source Condition
   Facts additionally retain the correct Source, tool, product surface, condition or
   unavailable state, scope, uncertainty, and evidence, while creating no physical or
   synthetic file, file ID, Source-relative Path, authored text, comparison target,
   relationship origin, local or hosted read, or network request.

## User story validation

### 1. Discover Repository customizations

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
```

Verify:

1. With no option, Repository Source equals the exact captured child-process
   `process.cwd()`. With relative/absolute `--cwd`, it equals the lexically selected root;
   the process working directory is unchanged and no picker/ancestor search appears.
2. Source, tool, kind, and Source-relative Path filters work with keyboard and pointer
   input; every inventory-file or safely normalized target path is relative to its owning
   Source's one root and no cross-Source path namespace is implied. Escaped enabled-Source
   and consent-preview root labels remain presentation-only, are not Source-relative Paths,
   and grant no read authority.
3. One physical `AGENTS.md`, `CLAUDE.md`, skill, `.mcp.json`, or marketplace remains one
   file without duplicate content and has exactly one recognition for each
   `(fileId, tool, kind)`; compatible admissions merge as provenances of that record. Each
   recognition exposes only `not-attempted | parsed | failed`, while the file-level
   `parseSummary` exposes only `not-applicable | all-parsed | mixed | all-failed`, derived
   from the complete recognition set with `not-attempted` neutral: all `not-attempted` is
   `not-applicable`; one or more `parsed` and no `failed` is `all-parsed`; one or more
   `failed` and no `parsed` is `all-failed`; and the coexistence of `parsed` and `failed` is
   `mixed`. Recognition order is the closed tool order followed by the closed kind order,
   never an opaque-ID tie-break.
4. Near-miss paths remain absent and an empty repository shows a successful supported-
   scope explanation.
5. The first snapshot has legal bootstrap generation 0 with exactly one stable-ID idle
   Repository Source, its escaped non-authorizing selected-root label, and zero inspected-
   source I/O/files/diagnostics. Central admission then uses the separately retained raw
   selected root. The automatic scan commits generation 1 on success; a deterministic fatal
   result leaves generation 0, while an injected startup read rejection reaches the process
   top level and makes no process/session survival guarantee.
6. Each automatic or explicit scan has one opaque `scanRequestId`. An explicit Repository
   rescan admission response, its Source/progress through waiting, active, complete, partial,
   or failed state, and any generation it commits all preserve that ID; a prior status or
   inventory cannot satisfy the new command.

### 2. Inspect without activation

```bash
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm exec playwright test tests/e2e/session-liveness.spec.ts
pnpm run test:security
```

Verify:

1. Hook commands, scripts, plugin components, URIs, markup, and MCP declarations appear as
   inert text/data and never execute, connect, load, or navigate.
2. Before any `FileDetail` request or comparison construction, the UI states that complete
   authored content may contain sensitive values. The acknowledgement gates complete source
   text, declared authored metadata, authored relationship targets, and either comparison
   side. After that warning, every maintained literal credential and
   displayed metadata value appears exactly as authored in source and comparison views;
   no mask or reveal control exists. JSONC escaped strings, YAML quoted/block scalars,
   TOML quoted strings/datetimes, collection punctuation, and accepted duplicate fields
   retain their exact source slices, source order, and occurrences after API transport.
   Structural metadata comparison matches `(tool, kind, fieldId, occurrence)` and exposes
   lexical differences even when typed semantic values are equal. Boundary-sized TOML integers,
   floats, and date/time values retain their typed canonical semantic payload without
   JavaScript precision loss while their authored spellings remain unchanged. The
   acknowledgement exists only in browser memory as a presentation gate: it is never sent
   to or persisted by the host, no acknowledgement API/field exists, and the bearer
   capability remains the complete host-side authorization boundary. Document reload and
   the central full-session client-data purge reset it; scoped route, selection, file/Source,
   Global, and generation cleanup may retain it for the loaded document.
3. Environment-variable references remain literal text even when sentinel process values
   are set; no referenced process-environment value appears in any displayed content.
4. Authenticated Diagnostics contain only their documented closed fields. Captured
   operational events accept only the closed fixed-code/opaque-ID schema and contain no
   Source-relative/absolute/canonical path, root, filename, customization content/metadata,
   authored value, capability, body, raw error, exception string, or Diagnostic argument.
   Operation Error is a separate exact object with fixed code/message/next step, opaque
   operation ID, and null pre-acceptance or matching non-null accepted-job `scanRequestId`;
   it contains no Diagnostic location/arguments or raw runtime error fields.
5. Malformed, stale, binary, cyclic, traversal, and boundary-crossing deterministic fixtures
   produce actionable safe Diagnostics. Only FR-028-eligible deterministic non-throwing
   outcomes may retain unaffected files through contracted-partial after complete traversal.
   Injected read/parser/Worker/assembly/serialization rejections bypass domain catch,
   classification, retry, recovery, and Diagnostic creation. A REST owner exposes only its
   generic Operation Error before/after acceptance; startup work reaches the process top
   level. The attempt publishes no result/generation and retains any prior snapshot. File size and collection counts never produce a
   valid/invalid, correctness, compliance, or lint verdict.
6. After all post-read checks, any NUL byte yields a binary diagnostic-only item and an
   otherwise publishable contracted-partial generation. Otherwise decode exactly once with
   UTF-8 replacement semantics, record/remove one leading BOM, label any replacement result
   `utf-8-replaced`, and preserve every `U+FFFD` through parser, source, and comparison. That
   garbled readable text is complete by itself; no alternate decoder runs. An FR-028-eligible
   deterministic parser/extraction outcome discards only that recognition's whole result, retains the
   complete authored source and comparison eligibility, and never leaves derived read
   authority; a parser/Worker throw or rejection follows the propagation rule above. Every half-open `SourceTextRange` is measured
   in ECMAScript UTF-16 code units and must round-trip exactly through
   `sourceText.slice(start, end)`; astral characters, unpaired surrogates, combining
   sequences, and ordinary BMP text verify that UTF-8 byte counts are never reused as
   offsets. Metadata, relationship, and derivation outputs for the same logical origin
   occurrence may reuse one exactly identical span. Identical, partial, nested, or crossing
   overlap between distinct origin occurrences, and any missing, ambiguous, or non-round-
   tripping span, fails that recognition all-or-nothing. An authored relationship uses the
   exact target token slice, while `normalizedTarget` and derivation use only the separate typed
   semantic value; neither normalized value is substituted for authored display. The
   conditional Codex default `hooks/hooks.json` relation instead has
   `targetOrigin: documented-default` and null `authoredTarget`, while an explicit hook
   field is `authored` and replaces the default.
7. Evidence assessments and applicability facts remain separate. Provenances and edges
   retain the sorted record-by-record `EvidenceAssessment[]`: documentation completeness
   uses only `documented`, `partially-documented`, `unknown`, or `conflict`, while upstream
   lifecycle uses the distinct ordered `preview`, `experimental`, `deprecated` qualifier
   array. An empty qualifier array is displayed as no lifecycle claim, not as `stable`.
   Runtime `ConditionFact.status: documentation-conflict`, conditionality, disablement,
   omission, shadowing, and unknown inputs never alter those assessments or become an
   invented “effective” result.
8. Inventory, Detail, Comparison, Global controls, Diagnostics, Source Condition Facts, API
   responses, CLI text, and documentation remain within syntactic parsing, exact
   authored-literal extraction, mechanical typed decoding, frozen-catalog classification,
   and documented structural scope/order/condition/selection/reference projection. They do
   not interpret or rank natural-language meaning or intent, decide correctness, validity,
   compliance, effectiveness, or quality, or offer policy/remediation advice, validation,
   lint, synchronization, conversion, formatting, or fixing.

### 3. Compare two files

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
```

Verify:

1. At the Repository comparison checkpoint, exactly two distinct readable active-generation physical file IDs
   from the same Repository Source can be selected; binary and other diagnostic-only items
   cannot be selected. Cross-Source comparison is verified only after Global enablement in
   the next workflow.
2. Read-only Monaco source models contain the complete authored text without masking or
   environment substitution, disable links/editing, and use opaque in-memory URIs rather
   than filesystem paths.
3. Monaco shows literal source differences without semantic ranking, merge, lint,
   validation, formatting, conversion, or fix suggestions. Recognition metadata remains
   distinguishable and is compared by typed fields in Vue rather than serialized as JSON;
   provenance paths/status/scope/order/applicability and relationship-edge applicability
   remain separate rows.
4. Monaco and browser capacity comes from the browser engine and execution environment.
   A recoverable editor computation failure reports an actionable diagnostic without
   removing the complete read-only side-by-side authored source.
5. Rescan, removal, Global disable, or route close clears stale selections and displayed
   detail state and disposes every associated editor/model instance.
6. Keyboard and screen-reader users can enter, navigate, and leave the source diff through
   labeled controls and the accessible diff viewer without a focus trap.
7. The packed app loads its editor worker from a same-origin static asset with no CSP
   violation, external request, or `blob:` worker.
8. Direct loads of `/`, `/compare`, `/global-consent`, and `/files/<fileId>` all boot from
   the same root-absolute assets. The CSP's exact Nuxt bootstrap hash succeeds while a
   modified/unrecorded inline script and executable attribute are blocked.
9. Liveness tests cover lifecycle-triggered checks, browser/network/runtime rejection,
   authorization failure, hidden/page lifecycle purge, session-ID mismatch after port reuse, and a late in-flight
   response after the client epoch changes; no pre-purge inventory, detail, comparison,
   editor, authored-content DTO/DOM state, or acknowledgement remains or is automatically
   restored. The successful liveness body is exactly
   `{ sessionId, globalContentEpoch, globalDisableInProgress }`. Before confirming the current baseline or
   rendering it, the client treats a greater epoch or non-null disable projection as a full
   client-data purge trigger and enters control-only recovery; an older epoch is rejected,
   and only an equal epoch with a null projection is an ordinary baseline confirmation. Deterministic
   delivery pauses hold an already-linearized SessionSnapshot or FileDetail while a scan or
   Global-disable acceptance changes its generation or epoch, proving that envelope and
   payload never mix and that every inspection-data success rechecks an unchanged epoch plus
   a null fence at final publication. A liveness success instead binds exact `{ sessionId,
   globalContentEpoch, globalDisableInProgress }` values from one current coordinator-lock
   snapshot and returns a current non-null fence. They verify the SPA's monotonic `clientDataEpoch`,
   `currentGeneration`, and latest request token: an older-generation or superseded-token/
   epoch response cannot repopulate state; adopting a newer snapshot first advances the
   client epoch and aborts/disposes old requests and generation-owned state. A file detail is
   adopted only when its captured `(clientDataEpoch, currentGeneration, fileId)` still
   matches all three live values.
10. After any central purge, including Global-disable activation or an epoch/fence observed by
    liveness, recovery authenticates a fresh session using only the retained memory
    capability. It adopts the returned `sessionId` without retaining or comparing the
    purged ID and constructs only client-side `RecoveryViewState`. With a non-null disable
    fence, the session route returns the exact control-only `GlobalFenceRecoverySnapshot`;
    with a null fence it returns a normal full `InspectionSession`, but recovery adopts only
    `globalContentEpoch`, Global control and enable/disable projections, their referenced
    pathless session Diagnostics and generic Operation Errors, and any newly verified frozen
    preview, and discards the inspection graph. It restores no inventory, Source, file, generation, detail, comparison, editor,
    authored source, selection, filter, or acknowledgement. Disable/join/wait, retry-disable,
    or an eligible Global retry is available from that state as applicable. The explicit
    Resume inspection action appears only when `globalDisableInProgress` is null; it
    re-fetches the matching session and atomically constructs a fresh inventory summary with
    default filters. A later detail/comparison request requires a new acknowledgement.

### 4. Opt in to Global inspection

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

The test harness supplies isolated fake tool homes; it must never inspect the developer's
real home directory. Verify:

1. No Global path is touched before consent; the preview is derived lexically without
   `stat`, `realpath`, enumeration, or file reads. Instrumented capture proves each of
   `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` is read once in that order; only
   `undefined` is absent; `node:os.homedir()` is called exactly once iff any is absent; and
   active-platform `node:path.join` applies only the fixed corresponding suffix. No direct
   `HOME`/`USERPROFILE` selection or existence check occurs.
2. The consent view shows the exact Copilot, Claude, and Codex lexical roots, relative path
   patterns, input states, exclusions, and contract version `2026-07-20`. The frozen
   internal preview separately retains each exact raw `lexicalRoot` string;
   `displayRoot` is a one-way escaped string and is never decoded into
   read authority. A preview-construction throw/rejection returns only the generic
   pre-acceptance Operation Error with no `scanRequestId` or authority.
3. After opt-in, only the documented instruction candidates appear under zero to three
   separately identified tool-specific Global Sources—at most one each for Copilot,
   Claude, and Codex—and every Source has exactly one root. Every admitted Source from the
   initial/retry transaction appears together in one atomic generation, with no observable
   per-tool commit. Compare one readable Repository
   file with one readable Global file and verify that each remains under its independently
   identified owning Source and Source-relative Path without merging roots or producing a
   semantic verdict.
4. Present-empty, relative, and invalid env overrides use fixed preview states/
   messages, create no retained Diagnostic, and never silently fall back; only an absent
   setting uses the documented default. Exact `ENOENT` from a declared root `lstat` is the
   only caught absence; successfully detected link/type/boundary mismatch is a deterministic
   rejection. A shared-`LexicalAbsoluteRootParts`-accepted
   absolute root remains eligible even when it is outside the ordinary home; its location
   alone does not reject it or grant pre-consent I/O.
   An all-invalid preview, or an eligible preview whose three roots are all found absent
   after consent, may still receive the one all-tools confirmation and
   deterministically becomes `active-no-job`.
5. Any other injected admission throw/rejection propagates without domain classification;
   initial enable returns the generic pre-acceptance Operation Error and activates no
   consent/control/job, while retry preserves existing state. No numeric root or escaped-
   display ceiling is defined.
6. A stale, changed, or cross-session replayed preview ID/digest is rejected. For every
   entry the digest binds two separate type-tagged, length-prefixed strings: the stored raw
   `lexicalRoot` and the escaped `displayRoot`. It also binds the
   typed `TraversalPlan` version, closed selection policy, and canonical program. The display field never
   substitutes for the raw field. Enable uses only the frozen raw value and stored plan; it
   never rereads the environment, reverse-converts `displayRoot`, or treats displayed
   `pathPatterns` as authority. Escape-collision, control-character, and backslash fixtures
   prove that digest preserves the separate fields and admission uses the stored raw value.
   A preview with two eligible entries and one invalid entry has no request-side tool
   selector: initial enable derives fixed `confirmedTools: [copilot, claude, codex]`,
   evaluates all three, and returns disjoint `acceptedTools`/`rejectedTools` whose union is
   all three. A `tools` key or other selector-shaped input is rejected. Retry derives the
   complete fixed-order `retryableTools` projection—non-pending unpublished `admitted`
   controls plus `same-preview` rejected controls—and excludes published, pending, and lexical
   `new-preview-required` controls; the client cannot add, narrow, or reorder it. Reusing exact
   active consent is accepted only while that projection is nonempty; existing Sources remain
   semantically unchanged and a different preview/root requires disable first. Every
   successful initial or retry admitted-subset batch commit
   advances the generation exactly once, rekeys the carried Repository and other Source graphs plus every
   generation-owned ID, and invalidates old file/detail/comparison/selection/editor state.
   A canonical root that differs from the stored raw lexical absolute root shown by the
   preview through a symlink, junction, case, normalization, or short-name alias is rejected
   before enumeration and is never silently substituted.
   The coordinator serializes correctness-sensitive admission and scan work without a
   product-defined slot or queue-capacity ceiling. Non-`ENOENT` admission rejections
   propagate before state mutation. All-rejected, contracted-partial, accepted-batch error, cancellation, and
   repeated-retry fixtures prove terminal `GlobalEnableOperation` records are unregistered.
   At the final locked
   disposition point, an operation-first race commits `202` even if delivery follows disable
   acceptance, while a barrier-first race returns `409`, leaves no late side effect or
   operation-history leak, and permits the next enable. Exercise both orderings while paused during
   validation, after admission but before mutation, and immediately before the single batch enqueue/
   disposition.
7. Disable is a priority security barrier over all inspection data. Before sending the
   request, the SPA performs the same full client-data purge as a liveness failure. First
   acceptance of a non-no-op barrier atomically increments `globalContentEpoch`, installs a
   non-null `globalDisableInProgress`, revokes publication authority, and makes the session
   route return only `GlobalFenceRecoverySnapshot`; every other inspection-data route returns
   `409 global-disable-pending`. It then discards active uncommitted work, cancels queued
   Global work, and drains every affected process-wide closable-resource record. If any
   public Global consent, control, or Source state exists, `remove-active-state` removes
   every Global Source and commits exactly N+1 containing only carried Repository state,
   then requeues an interrupted Repository command once to commit at most N+2. Global files,
   exact-content DTOs, generation diagnostics, `GlobalToolControl`-owned lifecycle failures,
   comparisons, stale-failure entry/failure-reference pairs for removed Global Sources,
   consent, all controls, every retained root context, and the frozen preview disappear;
   Repository content and any Repository stale-failure pair are carried while generation-
   owned IDs rekey. Only an unpublished operation-local initial enable may select
   `cleanup-only`; successful cleanup removes the fence while preserving N and every
   generation-owned ID.
   A paused validation/admission fixture accepts disable, increments the command and content
   epochs, drains and
   unregisters the enable operation, then releases a late completion; that completion creates
   no control mutation, diagnostic, context, ID, or scan job after the final cancellation
   sweep. A post-acceptance drain, close-confirmation, assembly, or serialization failure
   keeps the process alive, the fence closed, the generic disable Operation Error retained,
   and retry/join available without restoring content. An indefinitely unconfirmed close
   requires process restart. A pre-acceptance failure or true no-op leaves the fence null so
   the already-purged client can immediately retrieve a fresh authenticated full snapshot.
8. Explicit Global rescan is accepted only while enabled, follows the same FIFO and
   dequeue-time generation rules as Repository rescan, and rekeys all carried Source graphs on
   commit. Its admission response, Source/progress, and successful generation preserve the
   same opaque `scanRequestId`. An unknown/removed Source returns `404 stale-resource`, a pending/active disable
   returns `409 global-disable-pending`, and a duplicate returns `409 scan-in-progress`. A fatal
   attempt publishes zero uncommitted partial results, keeps exact consent/boundaries and
   every prior per-tool graph, creates or replaces only that Source's stale-failure entry and
   references a Diagnostic for a deterministic returned failure or only Operation Error for
   a throw/rejection, reports failed/null progress, and remains eligible for explicit
   rescan or disable. A different Source's successful commit preserves both; the affected
   Source's successful complete/contracted-partial rescan clears both.
9. A thrown/rejected accepted initial/retry batch publishes no provisional Source/file/
   generation, adds no `StaleSourceFailure`, preserves the prior snapshot, and exposes only
   the terminal Operation Error for the batch `scanRequestId`, retained exactly once through
   `globalControl.lastOperationErrorId`. A deterministic rejected tool
   may retain its closed control state for exact-consent retry or disable. In a mixed
   deterministic outcome, retry validation/admission exposes only authority-free
   `globalEnableInProgress`; it leaves the exact pre-operation `globalControl`, `pendingTools`,
   `retryableTools`, `batchStatus`, and diagnostic projection unchanged. Atomic queued
   acceptance alone sets `pendingTools` and `batchStatus` to exactly the admitted accepted-
   batch subset and shared request ID. Initial enable has no projection until atomic activation
   and then exposes only accepted-batch tools. `unvalidated` exists only in non-serialized
   operation-local work; every accepted-pending control is already `admitted`, and an active
   serialized control is never `unvalidated`. Rejected same-preview and
   non-pending unpublished admitted controls may be listed as retryable, but retry remains
   disabled with `409 global-enable-in-progress` until all pending work finishes. It then uses
   the exact nonempty `retryableTools` projection and preserves successful Sources. Lexical
   `new-preview-required` controls require disable/new preview. Disable remains immediate.
10. On initial activation, when all three tools are deterministically rejected by lexical or
    post-consent root validation, enable returns `202 active-no-job` with empty
    `acceptedTools`, all three `rejectedTools`, and no Source/job/generation/stale entry.
    `globalControl` remains active with only the same-preview rejected controls retryable;
    lexical `new-preview-required` controls are excluded, so an all-lexically-invalid preview
    has empty `retryableTools` and requires disable/new preview. The preview route returns the
    same frozen preview and disable remains available. An all-rejected retry creates no new Source/job, commits no
    generation, and preserves existing Sources and their IDs exactly; partial acceptance
    returns `queued`, partitions every evaluated tool, and publishes the subset atomically.
    A retry after a deterministic fatal initial scan closes/unregisters any retained context whose root
    changed or became unverifiable, discards its unpublished IDs, and leaves no authority in
    the rejected control before a later complete re-admission.
11. A second disable while a barrier is draining/committing joins the same operation and adds
   no generation; after a retained failure, another disable resumes the same cleanup lineage,
   commit kind, base generation, resource records, and already-incremented content epoch.
   With no tool-specific Global Source or graph, active consent record, retained admitted
   Global root context, affected `opening`/`open`/`closing`/`close-unknown` registry record,
   running/queued Global scan/enable command, retained disable failure, or registry poison,
   disable is a true no-op even while unrelated Repository work is active. When active
   consent/control exists during the barrier, the projection is
   `globalControl.state: disabling` with empty pending/retry arrays. With only an
   operation-local initial enable it remains null. In both cases enable returns
   `409 global-disable-pending`; a visible control offers no Global retry while the barrier
   remains non-terminal.

## Measurable outcome protocols

### SC-001 and SC-006 participant study

Prepare one bilingual study kit containing the product guidance, standardized SC-001 and
SC-006 task prompts, intended fixture repository, designated SC-006 customization file,
four-field response form, and predefined ground truth. Enroll exactly 20 people who use Git
and a command-line interface in normal development work but have never used the Inspector
or contributed to it. Use the same cohort in one session, with SC-001 before SC-006.

Before enrollment, the maintainer team publishes a bilingual plan naming the accountable
study owner, recruitment and compensation-funding owner, moderators and the required reviewer roster, schedule
and support contact, consent/privacy and anonymized-retention procedure, supplied repository
and equipment/session support, and accessibility accommodations. Participants need no
personal repository, paid product, or personal expenditure. Ordinary contributors do not
recruit, fund, moderate, or review participants. Missing resources block the initial-release
claim, not review of an otherwise conforming contribution; repeat the study only after a
material change to a primary workflow, supplied guidance, fixture, or scoring rubric. Keep one
separately governed access-controlled administrative assignment record outside the repository
bundle, work root, candidate, runtime IPC, capture, and evidence; use it only to audit one unique
human pair per case, never to affect scoring bytes, and destroy it under the consent-retention
policy.

While preparing the kit, materialize and contract-test the exact closed member set under
`tests/usability/sc001-sc006-study-inputs/`, its candidate-independent versioned manifest, and
companion; do not compute or freeze a candidate digest then. Require a positive safe-integer
`manifestVersion` starting at 1, exact `bundleRoot` equal to that `/`-terminated literal,
nonempty `inputs`, and nonzero coverage for all seven roles. Use exact root-property order
`manifestVersion`, `bundleRoot`, `inputs` and the existing exact entry order/sorting/serializer.
The verifier must recursively find exactly the contract's regular-file members and exactly the
manifest path set, with no link, alias, non-regular or identity-unverifiable object, path escape,
missing/extra file, or byte drift. Except for the separately bound candidate and study
equipment/runtime, give participants, moderators, and scorers input bytes only through a
repository-owned builder distribution accepted by the independent verifier—never through extra local, remote, printed, or
ad hoc material.

Treat the paired evaluation-fixture JSON members as deterministic virtual file-tree
descriptors: every derived output path, encoding, exact byte representation, and digest is
closed. `study:evidence:inputs -- materialize` is the sole builder, and the independent
verifier must reproduce the exact derived set and bytes for all twenty distributions.
Every distribution root contains exactly `study-inputs/` and `repository/` as its two
direct-child directories: the former contains only byte-identical copies of the sixteen
source-bundle members, and the latter contains the descriptor's complete file tree. Reject any
other top-level member, sidecar, collision, alias/reused identity, or escape. Keep the candidate
and equipment/runtime outside this root under their separate bindings.

Before running the harness, verify that the public builder, capture, and verifier scripts are
each one self-contained file whose source contains only literal static imports of `node:`
built-ins. Reject local/package imports or helpers, dynamic `import()`, `require`,
`createRequire`, `eval`, `Function`, `vm`, `process.dlopen`, another loader hook, and alternate
worker/child entries. Materialize may internally
execute only the descriptor-bound, digest-verified capture file in supervisor mode; that file
may re-execute only itself in exact `supervisor`, `study-harness`, `scoring-moderator`,
`reviewer-one`, `reviewer-two`, three named adapter, and three named watchdog modes. The
product probe is a distinct import mode. Each child uses authenticated inherited parent IPC
and a fresh one-use bootstrap nonce.

For each parent/child edge, create two unidirectional inherited anonymous pipes: parent-to-child
and child-to-parent. After verifying the child, write an exact 96-byte bootstrap prefix with a
fresh seed, nonce, and `channelId` to the parent-to-child pipe, keep that same pipe open, and
continue with LF-framed parent-to-child messages; do not send EOF after bootstrap. Reject EOF
before 96 bytes and parse every post-prefix byte as canonical frame data. Require the first
child-to-parent message to be authenticated one-use `ready` at sequence 0. Do not pass bootstrap
material through environment, argv, or files. Derive domain- and direction-separated HMAC keys,
and use LF-terminated canonical frames in exact root order `schemaVersion`, `channelId`,
`sequence`, `direction`, `senderRole`, `receiverRole`, `messageType`, `authenticationTag`,
`payload`. Authenticate compact canonical JSON reconstructed with a null tag and no LF;
only the populated transmitted frame appends LF. Compare in constant time.
Start each direction at sequence 0, increment by one, enforce the closed role/message matrix,
and consume ready once. On any parse/tag/sequence/role/pipe/child/abort/crash/exit failure, close
both pipes, wipe bootstrap/key/buffer state, and fail without adding a control command.

After materializer→supervisor `ready`, send exactly one authenticated `runtime-bootstrap` with
exact `StudySupervisorRuntimeBootstrap` root `schemaVersion`, `workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`. Before mutating the
root, require the supervisor to validate it, bind endpoint, load token, ACK, and wipe the frame.
Then use authenticated lifecycle close/ACK to detach and wipe the materializer edge while the
supervisor remains live; on failure abort/exit it. Never put these authorities in supervisor child
env/argv; allow them only in this frame, supervisor memory, and later authenticated control.

Use `process-lifecycle-attestation` with exact `StudyProcessLifecycleAttestation` root
`schemaVersion`, `processRole`, `streamRole`, `componentRunId`, `instanceId`, `processRunId`,
`event`, `exitCode`, `signal`; event is `registered | exited`. Adapter self-registration is not an
exit observation. Direct parents OS-observe before forwarding/creating reports: adapters forward
matching watchdog registration and report directly observed clean exit, moderator reports ready
reviewer registration and directly observed clean exit, supervisor directly observes adapter/
harness/moderator. Reverse ACK is
only for the immediately preceding attestation on the applicable edges. Require supervisor ACK of
adapter registration before writer-binding relay, adapter plus supervisor ACK of watchdog
registration before start, reviewer-exit ACK before outcome, watchdog-exit
ACK before adapter exit; start waits for all six stream registrations and stop combines three
watchdog attestations with direct adapter/orchestrator exits. Count only moderator-observed,
attested distinct clean reviewer exits. Nonclean `lifecycle: child-exit` invalidates and is no
witness fact.

Send exact `StudyStreamControl` root `schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256` with
unchanged bindings and command `start | checkpoint | anchor-handoff | stop` as byte-identical
`stream-control` supervisor→adapter→watchdog. Return exact `StudyStreamControlResult` root
`schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `command`, `checkpointRequestId`,
`sequence`, `monotonicNs`, `envelopeSha256` as `stream-control-result` in reverse and wait for all
three results at every
phase; start result follows capture-start plus first heartbeat and uses N/A `checkpointRequestId`.
Have the supervisor create/validate each stream and pass one dedicated append-only handle only by
exact spawn inheritance as fd5. Bind expected adapter component/instance/process identities to fd5
stable handle identity, `nlink`, and append mode in path-free runtime-only
`StudyStreamWriterRuntimeBinding`. After supervisor ACKs adapter registration, relay binding/handle,
obtain binding ACK, then have the watchdog independently validate/register and receive adapter plus
supervisor ACK. Complete all three writer barriers/all six registrations before proxy-binding ACK,
and proxy-binding ACK before stream start. Use the contract-fixed writer slot beside the two fixed
IPC slots; it is absent for nonstream roles and is not a third IPC pipe. Never pass path/cwd/env/
argv. Adapter transfers only and closes after watchdog registration; supervisor closes after the
complete downstream ACK; forbid extra/duplicate copies so watchdog remains sole holder/writer. Stop
order is result→handle close→clean exit; failure closes all copies and invalidates.

Before materialization, set required `INSPECTOR_STUDY_WORK_ROOT` to a newly created absolute,
empty ordinary-local directory supplied by study setup. Set
`INSPECTOR_STUDY_CONTROL_ENDPOINT` to a transient path outside that root and every distribution:
on POSIX, an absolute Unix-domain-socket pathname; on Windows, exactly
`\\.\pipe\agent-customization-inspector-study-` followed by 32 lowercase hexadecimal
characters. Set `INSPECTOR_STUDY_CONTROL_TOKEN` to a fresh per-run value made from exactly 32
cryptographically random bytes (256 bits) and encoded as exactly 43 unpadded base64url
characters. Do not use TCP, UDP, DNS, another network transport, remote/network named-pipe
spelling, or a work-root sidecar. These three variables are required for every command from materialize through
finalize. Reject an explicit platform UNC/server-share/device/network spelling before I/O; an
indistinguishable pre-mounted/mapped filesystem remains the FR-022 limitation.

Do not set or rely on `INSPECTOR_STUDY_CANDIDATE_TARBALL` for materialize or
`study:evidence:verify -- inputs`; those commands ignore it. The candidate file may already
exist, but the environment value is first required at `study:evidence:capture -- start` and must
be resent to every later command through finalize. Point it to the stable non-link regular file
outside the work root and all distributions. Each later client independently stats and hashes
that candidate while a token-authenticated hello/challenge with the materialize-created
supervisor checks the same lexical/canonical authority in memory. Require each runtime-control
authentication tag to cover the exact canonical payload. Permit a transient non-retained HMAC
of a runtime-control path only for channel integrity; keep evidence commitments/hashes
path-free. Initial work-root/endpoint/token authority uses only the exact transient
`runtime-bootstrap`; proxy authority follows the closed caller→`StudyLiveBinding`→supervisor→
`browser-proxy-binding`→adapter→attempt-local DevTools/context route below. Apart from those
authenticated/control frames, their dedicated memories/live context, and the exact transient control-message HMAC,
never copy either path, the control token, or the HMAC key into capture-evidence IPC, retained files, hashes as raw input,
logs, diagnostics, or output.

At materialization, have authorized setup fix an identity-pinned `npx` on the sanitized equipment
PATH plus one reserved initially empty candidate-launch store-bin slot outside the work root and
distributions; materializer/inputs must not read that slot. After successful input verification and
before start, setup alone provisions that same known slot from the candidate tarball plus frozen
production graph into a fresh network-disabled/scripts-disabled store and digest-binds it. At
start, the supervisor revalidates the inherited fixed slot and resolves only its sole audited bin
through pinned `npx --no-install`. Never expose raw tarball path in child env/argv or add a new
environment/control field; forbid distribution mutation, cache/network/install, alternate PATH,
global, or fallback resolution. Keep the store outside runtime/evidence, destroy it after abort,
stop, or finalize, and require an absence barrier.

For capture start through stop only, set required
`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` to an exact runtime-only `127.0.0.1:<port>` value.
Study setup configures only the fresh browser context's proxy to that authority—never a
browser-wide or system proxy. Use the exact route: authorized start-through-stop caller transient
input → authenticated runtime-control `StudyLiveBinding` → supervisor dedicated memory → one-use
`browser-proxy-binding` → adapter dedicated memory → attempt-local DevTools control request/browser
context. Wipe caller/control/frame/request buffers after ACK. Only after all six registrations and
writer-binding barriers are supervisor-ACKed, send exact `StudyBrowserProxyRuntimeBinding` root
`schemaVersion`, `studyRunId`, `browserProxyAuthority`; require adapter validation, exact listener
bind, and ACK; forbid `stream-control:start`, capture-start, and start completion before that ACK.
Only supervisor/adapter dedicated memory and the live attempt context hold it through stop/failure
cleanup; require checkpoint/continuation equality and close/wipe at stop. Never put it in child
env/argv or evidence.
Participant candidates use their supervisor-owned grant correlation; only other browser traffic
receives a proxy-generated fresh opaque ID. Treat another local client as unrelated and do not product-attribute it without
the required actor/process correlation. Materialize, input verification, and finalize do not
read or require this variable; pre-stop checkpoint and continuation do. Never retain or output the
proxy authority or browser proxy configuration.

Materialize starts the sole digest-verified capture file in internal supervisor mode, completes
the post-ready runtime bootstrap before root mutation, and detaches its edge while that supervisor
stays live. At start the existing supervisor spawns the long-lived study harness, scoring
moderator, and adapters; adapters spawn watchdogs, yielding exactly eight internal long-lived
descendants/processes with watchdogs as adapter children, and only
the moderator spawns two ephemeral reviewer collectors after each reviewed failure. Keep that
supervisor and its external endpoint alive through checkpoint, continuation, stop, and
finalize. It retains only in memory the initial work-root identity, start candidate
identity/digest, checkpoint positions, original handoff anchor, three direct adapter exits, three
adapter-observed authenticated watchdog exit attestations, two direct orchestrator exits, and the
moderator-observed attested distinct-clean reviewer exit count.
The evidence uses only path-free HMAC work-root/candidate identity commitments and one
`controlSessionId`.

Have the authorized materialize caller provide four pairwise-distinct bidirectional nonrecording,
no-echo, no-history external terminal-equipment handles: fd6 participant, fd7 moderator, fd8
reviewer one, fd9 reviewer two. These are not internal evidence IPC. Before supervisor launch,
verify their stable identity, distinctness, and properties. The supervisor retains fd6, passes
fd7–9 to the moderator, and closes its copies.

Use the contract's canonical control requests/responses with retained `requestId`, closed
response `errorCode`, and no raw token transmission. The materialized supervisor generates one
fresh run-scoped `controlSessionId` and keeps it stable through finalize. Hello sends null
session/challenge/tag/payload, receives that stable session ID, and creates only a fresh one-use
HMAC-authenticated `challengeId`; every later direction-separated HMAC covers the complete
canonical message with a null tag and uses each challenge/request ID once. Permit only `hello | verify-inputs | start | checkpoint |
read-checkpoint | anchor-handoff | verify-continuation | stop | finalize-prepare |
finalize-commit | abort | register-pre-readiness-probe | buffer-pre-readiness-product-event |
register-product-probe | submit-product-event | close-product-probe`.
Finalize-prepare performs the supervisor's internal current-binding,
continuity, and exit checks, prepares complete witness material while the endpoint stays live,
and returns literal `null`; the continuity key never leaves supervisor memory. Open a separately
authenticated finalize-commit connection; after accepting it, the supervisor begins listener
teardown and returns the exact `StudyContinuityWitness` over that already-open connection before
destroying keys and exiting. Require the complete response followed by EOF and reconnection
failure, then write and re-read the witness pair followed by the seal pair.

The only retained capture files are the three fixed
`capture/streams/<role>.ndjson` ledgers, verifier-created
`capture/study-capture-handoff.json`/`capture/study-capture-handoff.sha256`, and, after successful
finalize, `capture/study-continuity-witness.json`/
`capture/study-continuity-witness.sha256` plus `capture/study-capture-seal.json`/
`capture/study-capture-seal.sha256`. Do not hand-create or edit them; each ledger alternates one
envelope line and its safe-payload line, and no other retained sidecar is allowed.

Immediately before SC-001, run `pnpm run study:evidence:inputs -- materialize` to create twenty
fresh descriptor-bound distributions, then run `pnpm run study:evidence:verify -- inputs` to
re-enumerate the source bundle and all twenty actual distributions without rewriting them.
That verifier must not read, stat, hash, or freeze the candidate; only a zero result freezes the
verified canonical study-input-manifest digest and exact-set state. After the release candidate
exists, point `INSPECTOR_STUDY_CANDIDATE_TARBALL` at the exact candidate every participant will
use. `pnpm run study:evidence:capture -- start` is the first phase to read its authority; before
capture it reopens, stats, hashes, and freezes the candidate identity and SHA-256 and binds them
to the verified manifest digest for the handoff and release evidence. Any candidate byte, bundle member,
actual distribution, or digest change invalidates both results; rerun the complete paired study
unless the final pair exactly matches valid evidence.

- A moderator may repeat the applicable prompt verbatim and may not provide command,
  navigation, or interface-operation hints.
- After enrollment, keep every equipment, environment, and product outcome in the fixed
  denominator and do not exclude or replace the participant. A failure is unsuccessful when
  it prevents or interrupts completion, including before the timer. A handled SC-001
  automatic-open failure is recorded but is not itself unsuccessful when the participant uses
  the printed URL in a pinned certified browser and completes without prohibited hints inside
  the original two-minute interval; never pause or restart the timer.
- For SC-001, start the timer when the standardized prompt is presented. Stop when one
  discovered customization file's source/details view is visibly open and operable. The
  equipment prepares the intended Repository root as the verified distribution `repository/`
  working directory before the prompt. The interval includes entering the fixed fd6 line
  `npx --no-install agent-customization-inspector --no-open`, launching the Inspector from
  that prepared root, and completing the required printed-URL fallback in the pinned certified
  browser. Changing directory or supplying `--cwd` is not a participant action in this study;
  the automated User Story 1 tests verify those product capabilities. At least 19 of 20
  participants must succeed within two minutes.
- For SC-006, place every participant—regardless of SC-001 result—in the same prepared
  Inspector state with the designated file open. Start when that state is ready and the
  standardized prompt is presented. The participant must submit source, recognizing tools,
  file type, and certain/conditional effective behavior within two minutes; all four must
  match the predefined ground truth. Any omitted or incorrect field is unsuccessful, and
  at least 18 of 20 participants must succeed.
- At capture start, have the supervisor generate exactly twenty fresh, unique, cryptographically random, run-local
  unlinkable participant tokens, each from exactly 32 random bytes (256 bits) encoded as exactly
  43 unpadded base64url characters. Use a token only as participant-specific `subjectId`, and
  use literal `not-applicable` otherwise. `subjectId` is the sole pseudonymous human evidence;
  retain no identity/distribution/response mapping. Keep the ordered set only in supervisor
  run-memory and send only the next token in its attempt binding; the harness schedules but does
  not create/select tokens. Generate it freshly each run; verify only
  within-run uniqueness and keep no cross-run registry. The
  `study-browser` ledger is the sole workflow authority: require
  exactly one terminal success/failure for each token and each discovery, inspection,
  comparison, and Global-consent workflow—80 outcomes with no missing, duplicate, extra, or
  mismatched pair. Compute discovery >=19 and inspection >=18 from that exact denominator;
  nonterminal/request-event messages remain unbounded. Exact-80 cardinality and canonicality are
  independent of those success thresholds: with 80 valid terminal records, verification, stop,
  finalize, witness, and seal may complete even when discovery or inspection misses its target.
  A threshold miss blocks the release criterion but does not invalidate evidence or become an
  automatic critical issue; a protocol, cardinality, authentication, or privacy violation still
  fails closed independently.
- Treat `capture -- start` as run-level only: through the materialization-created live supervisor,
  bind the proxy, launch harness/moderator and three adapters, require each adapter's watchdog,
  yielding exactly eight internal long-lived descendants, and obtain three stream starts without attempt profile/marker/grant/
  correlation/workflow state. Sequentially complete and close all four workflows for
  participants 1–19. For participant 20, complete discovery, checkpoint/handoff, then complete
  the remaining three workflows during continuation unless terminalized; use a post-anchor
  heartbeat if already terminalized. Create each attempt's fresh profile/bootstrap only after
  streams are live and immediately before its `npx`/first capturable request.
- Keep one exact-root runtime-only `StudyCurrentSubjectScoringContext` with
  `automaticIssueCorrelationId` and `terminalizationClass`. Create no context during launch/
  bootstrap/buffering. Require process bind+ordered release, both open-binding ACKs, then
  discovery-context ACK before readiness; only then grant/navigate/start the task. Buffered events
  are workflow/process/link N/A and cannot link later. Permit only correlation N/A→first exact
  same-context candidate after supervisor validation and current-workflow tagging before canonical
  safe-payload serialization, followed by applicable downstream ACKs make it accepted, and class
  none→mapped cause, once each. The supervisor owns the current-workflow mirror, serializes a source
  that cannot self-assert workflow exactly once with that tag, waits for downstream ACKs, counts it
  accepted, resends updated `scoring-context`, and requires moderator ACK before release/outcome.
  Accepted retained observations are immutable: forbid later workflow-tag mutation/backfill and
  keep pre-ready/context-free N/A permanent. Treat that value only as an
  eligible failure-link candidate, count automatic issues separately, destroy context after
  accepted outcome, and ACK the next context before its prompt/timer/task. The moderator owns raw
  scoring input and constructs `StudyWorkflowOutcomeSubmission` with
  `automaticIssueCorrelationId` before review fields. Success stays all N/A with or without a
  candidate. Candidate-bearing failure requires the exact ACKed same-context `automatic-critical`
  link and no review; only candidate-free failure is reviewed.
- For each normally completed open context, enable fd7 for exactly one external runtime-only
  `StudyModeratorInput`: compact canonical UTF-8 JSON plus exactly one LF, root order
  `schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`,
  `timing`, `groundTruth`, `rubric`. Require timing to be a canonical nonnegative decimal string and
  the other three raw values to be canonical JSON strings. Fail EOF, parse/extra/trailing input,
  replay, and cross-context routing; disable echo/history/recording/logging and wipe the frame after
  use/abort. Accept zero records for terminalization-synthesized remaining workflows, reject late
  input, and never invent empty response/timing.
- Before each attempt, assign a distinct human pair per subject/workflow out of band from the
  published reviewer roster, with no human/collector-process/component-run identity/case-assignment
  reuse. Literal reviewer slots and sanitized terminal surfaces may be drained, reset, and freshly
  remapped for a later case. Audit that unique pair only in the
  separately governed access-controlled administrative record outside repository/work-root/
  candidate/runtime/capture/evidence state, destroy it under the consent policy, and never let it
  affect scoring bytes. They directly observe the same live attempt, including pre-workflow
  terminal events, with no recording/IPC. After failure only, send byte-identical
  `StudySafetyReviewCase` values to two fresh isolated one-use collector processes. Enable fd8/fd9
  only after each case is fully displayed. Each collector reads exactly one LF-terminated ASCII
  `product-caused-blocker | not-product-caused-blocker` enum from its slot-isolated surface with no
  echo/history/recording/log/cross-slot output, wipes it, and hides the first vote from reviewer two. Both non-
  product votes yield `reviewer-cleared`; both product votes `reviewer-confirmed-critical`;
  split votes `reviewer-disagreement-critical`; only the last two use `workflow-blocker`.
  Require both collector exits before moderator→supervisor→browser-adapter→watchdog outcome
  acceptance. Success starts no collector; put no identity/assignment in collector, outcome,
  repository study-input, runtime IPC, capture, or evidence and retain no note or communication.
  Reserve supervisor→browser-adapter `safe-payload` for nonworkflow browser observations; never
  carry/bypass an outcome. The supervisor alone tags/constructs it, the adapter validates its
  stored candidate and returns semantic ACK only after watchdog ACK, browser-only release waits for that ACK, and joined
  release waits for both browser/server safe ACKs.
- Run the SC-004 product network/URL/MCP instrumentation, an exact-authority Inspector-server
  request ledger, and study-browser request capture continuously from Inspector launch before
  SC-001 through completion of all four workflow observations. Correlate process identity, the
  exact issued authority, request initiator and target, and the server ledger. Classify every
  Inspector/bundled-SPA request as one of the two exact authorized internal loopback classes or
  as prohibited; treat attributable but unclassifiable traffic as outside both classes. Record
  unrelated extension/host-process traffic without attributing it to the product, and record
  observable OS-mediated mounted/mapped-source traffic separately as the FR-022 limitation.
  Use exact privacy-safe route/target classifier `targetClass` with closed literals
  `static-manifested-asset | static-spa-shell | static-client-route-fallback | api-get-session |
  api-get-session-liveness | api-get-file | api-post-repository-rescan |
  api-get-global-consent-preview | api-post-global-consent-preview | api-post-global-enable |
  api-post-global-rescan | api-post-global-disable | other-loopback | remote | mcp |
  unclassifiable | not-applicable`, and apply the contract's closed truth table across
  authority, target, route, method, capability, origin, same-host, attribution, request class,
  and prohibited status. Give every row `eventCode: observation`, not-applicable workflow class,
  observed outcome class, correlation-context subject/process IDs, and fresh event/correlation IDs. Use effect
  `none` and `prohibited: false` only for the exact authorized-static/API table rows. For a
  product-attributable exact-issued request outside those tables, use a request observation,
  participant/bundled-SPA/Inspector actor as applicable, exact-issued authority, prohibited request class, observed closed
  target/method/capability/origin, unauthorized-request effect, and true
  same-host/attribution/prohibited. For other-loopback, use other-loopback authority/target,
  prohibited request class, observed closed method, not-applicable capability/origin,
  unauthorized-request, and the same three true booleans. For remote, use remote
  authority/target, prohibited request class, observed closed method, not-applicable
  capability/origin, prohibited-outbound-request, false same-host, and true
  attribution/prohibited. For a fully unclassifiable product-correlated request, use unknown
  actor and unclassifiable authority/request/target/method/capability/origin,
  unauthorized-request, false same-host, and true attribution/prohibited. For MCP, use an MCP
  observation, Inspector actor, target `mcp`, not-applicable
  authority/request/method/capability/origin, effect `mcp-connection`, false same-host, and true
  attribution/prohibited. At both proxy and server, independently classify exact Chromium-
  controlled `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, `Sec-Fetch-User`, Origin,
  and Referer, then discard raw values and require identical projections. Treat Fetch Metadata
  as consistency, not human attestation. After product readiness and immediately before the
  initial navigation, generate the fresh armed `StudyParticipantNavigationGrant` with exact
  run/attempt/correlation/state fields. Participant requires valid marker, participant-shaped
  tuple, exact authorized-static target, and that current grant. Have the adapter reserve without
  state change; the supervisor validates grant/correlation/attempt/candidate and stores pending
  while the canonical grant stays armed, then sends sole exact one-use
  `browser-broker-decision: candidate-forward`. Do not use a separate candidate ACK. That decision
  alone accepts the candidate and atomically consumes the canonical grant; only after validating it
  may the adapter consume its copy/forward. The browser/page never sees the grant before proxy injection;
  duplicate/replayed/stale authenticated candidate/grant IPC, simultaneous second consumption,
  or skipped/mismatched decision/ACK forwards nothing and invalidates, and close destroys the
  grant. A fresh participant-shaped nonexact, post-consumption, page-script-navigation, or
  grantless HTTP request is open-binding `unknown` with a fresh proxy ID, product-attributable/
  prohibited and blocked without consuming or invalidating the grant.
  Valid + not participant + missing user + exact-issued Origin or missing Origin plus
  exact-issued Referer is `bundled-spa`; forward only exact authorized static/API and block all
  else product-attributable/prohibited. Valid + extension Origin is `browser-extension`, N/A,
  unrelated, and blocked. Every remaining valid projection is `unknown`, uses open binding IDs,
  is product-attributable/prohibited, and is blocked. Missing-after-bootstrap is
  `other-host-process`, N/A, unrelated, and blocked; invalid/duplicate/malformed/noncanonical/
  unknown/stale/mismatched is `unknown`, N/A, unrelated, and blocked. Forwarded exact authorized
  participant/SPA alone uses browser+server and a claim. Every blocked row is browser-only; no
  extension/other-host/unknown N/A claim exists. Direct Inspector exact-issued uses product+
  server; nonexact Inspector and OS/effect/MCP use product only; workflow uses browser only.
  Run field-by-field negative tests. Use the capture script's
  Node-built-in-only deny-by-default local HTTP/CONNECT proxy—fixed by study equipment and not
  Playwright/unbound instrumentation—for study-browser capture. Forward only an exact authorized
  loopback request. Classify `other-loopback`, `remote`, and `unclassifiable` targets and every
  CONNECT request as prohibited; block them before DNS lookup, socket connection, request-body
  forwarding, or response-content exposure, and never establish a CONNECT tunnel. Participant
  candidates use the supervisor-owned grant's fresh correlation; only other browser events
  receive a fresh 32-byte/43-character unpadded-base64url
  `X-Inspector-Study-Correlation` from the adapter/proxy. Have the browser proxy remove/replace an existing value and
  the Inspector probe assign it. Never use this non-capability for auth/routing. Have server
  instrumentation reject duplicate/invalid grammar and send only the same safe ID to its
  ledger; discard the header/raw fields before IPC. Never retain, hash, or log the raw header
  name, framing, or representation; after strict grammar/canonical validation, retain only the
  decoded canonical safe-ID value as `correlationId`. Treat another local client as unrelated
  without actor/process correlation. Match safe
  classifications, `subjectId`, and `inspectorProcessId` across required roles. Missing,
  duplicate, malformed, or mismatched propagation is critical.
- Use exact schemas for `StudyBrowserAttemptBinding`, `StudyBrowserRequestCandidate`,
  `StudyServerCorrelationClaim`, `StudyParticipantNavigationGrant`, and
  `StudyBrowserBrokerDecision`. Have the supervisor/broker generate the attempt and send byte-
  identical prepared/open/closed snapshots to harness and browser adapter with both ACKs. Only
  ordered pre-readiness release, both open ACKs, and discovery-context ACK permit readiness;
  grants/candidates follow readiness. Terminalization moves both copies to terminalizing. The
  adapter destroys browser/grant/marker/reservation/candidate/pending state but retains the
  terminalizing binding until closed ACK; the harness retains its binding and fixed remaining
  schedule through synthesis. Closed dual ACK permits destruction/next attempt. The state is
  `prepared | open | terminalizing | closed`, with at most one live binding.
- Make the supervisor the sole participant-launch controller/direct OS child observer and sole
  product-exit source, including pre-bootstrap exit; the harness only schedules and binds. On probe
  close, serialize child state: already exited yields product-exit, live yields premature-probe-
  close, and normal four-outcome/zero-pending close yields no terminalization. Use the browser
  adapter as sole attempt-bound equipment observer: browser exit is only actual browser process/
  context exit; equipment failure is only external browser/OS/environment bootstrap failure while
  controller/proxy/auth remain healthy. Treat adapter/proxy/controller/CDP/auth/marker/IPC/
  implementation/child-management fault as run invalidation, not synthesis. First valid cause
  wins; later causes are rejected; premature probe close maps to `equipment-failure`.
  Terminalization freezes accepted rows/joins; the supervisor opens/mirrors/routes only missing
  contexts, the moderator constructs their failures/reviews/outcomes, and the harness keeps only
  schedule/orchestration. Evidence-role failure invalidates the run and synthesizes nothing. Fan out
  byte-identical `terminalization-decision` to harness/adapter; clear the listed browser-local state,
  retain terminalizing binding/schedule through closed dual ACK, and keep both roles alive. Use `attempt-terminalization` only for child reports and
  `browser-broker-decision` only supervisor→adapter, with decision
  `candidate-forward | browser-only-released | joined-pair-released`. Keep attempt IDs out of the actual browser,
  requests, application, evidence, and logs.
  Use the open attempt ID for valid-marker bound browser-only decisions; only missing/invalid-marker
  unrelated branches use N/A. Repeat the same N/A process ID in a pre-readiness terminal submission,
  review case, and both votes.
- Select prepared profile `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0` exactly:
  Playwright 1.61.1 `chromium` revision `1228`, browserVersion `149.0.7827.55`, title
  `Chrome for Testing`, on Ubuntu 24.04 x64/Node.js 24.18.0, headed, a fresh
  nonpersistent context, empty extensions, browser-context-only proxy, and
  `single-407-basic`. Have the browser adapter directly spawn and OS-observe the digest/identity-
  verified pinned Chromium over its fixed anonymous `--remote-debugging-pipe`, browser-equipment
  control outside internal evidence IPC. Use pinned DevTools `Target.createBrowserContext` with
  exact proxy, `disposeOnDetach: true`, empty bypass; `Fetch.enable(handleAuthRequests: true)`;
  exactly one `Fetch.continueWithAuth` ProvideCredentials response for the exact `study`/marker
  challenge; and exact 407→retry→204 verification. Have the supervisor create a fresh `browserProxyMarkerSecret` and send
  install directly to the adapter. Keep it prepared until actual-browser bootstrap/ACK, then
  activate both copies atomically; destroy failure without activation. After run streams are
  live and immediately before that attempt's `npx`/first capturable request, request exact proxy-local URI
  `http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`: require one bodyless 407 whose
  exact two headers are `Proxy-Authenticate: Basic realm="inspector-study"` and
  `Connection: close`, one canonical Basic retry, and bodyless 204 whose sole header is
  `Connection: close`, with zero DNS/connect,
  application, correlation, candidate, forwarding, or evidence effect. During capture require
  exactly one canonical Basic marker per study request.
- Treat the marker as transport authentication only. Never use validity alone for actor,
  attribution, or forwarding. Never place the secret, raw Basic, encoded/noncanonical
  derivative, or proxy configuration in hashes/evidence, log/output, file, environment, argv,
  persistent profile/history/cache/keychain/credential store, or application requests; only
  transient marker-install frame authentication may use it as a preimage. Keep raw secrets only in
  adapter attempt-local control/auth request buffers, never browser env/argv/profile/history/log/
  evidence. Wipe marker-install/DevTools request buffers after ACK; on normal/abort/crash/
  terminalization/controller failure/child exit, dispose context/process and wipe all marker
  material. Require pinned Chromium's remote-debugging-pipe disconnect contract to invoke
  `CloseBrowserSoon`. Study equipment/setup supplies any required platform containment. After
  adapter exit, block next attempt/finalize until every browser-equipment descendant/context ends
  and fresh-profile absence is verified; do not retain runtime OS observer data as evidence. Inspect isolated HOME/XDG/profile/history/cache/
  credential stores after each actual-browser path and require zero marker, encoded Basic, or
  `browserAttemptId` residue.
- For exact authorized participant/SPA forwarding, have the adapter reserve without state change;
  the supervisor validates/stores the complete safe candidate pending while the canonical grant
  remains armed, then sole authenticated `browser-broker-decision: candidate-forward` accepts and
  atomically consumes it. The adapter validates the matching decision before copy consume/forward;
  there is no separate candidate ACK. In the probe, strip correlation, construct the sole
  permitted participant/SPA claim, and receive broker ACK before application handling. Require
  `submit-product-event` outer root to only `inspectorProcessId`, `destinationRole`, `payload`;
  require outer process equality with the registered probe and claim-payload subject/process IDs
  to equal the open binding and that outer process.
  Have the broker validate one candidate plus one claim, obtain both browser/server safe-payload
  ACKs, release both through `joined-pair-released`, then ACK; mismatch emits zero records. Use no
  timeout, clock, or deadline. Fail only on HTTP transaction/request
  end/abort/error/close; inherited IPC/probe/attempt/binding close; capture stop; verified child
  exit; or duplicate/replay/mismatch/unexpected-role/order/second-join/residue/late input. Wipe
  pending/marker state, emit no partial record, and reject late input. Run lifecycle-order/race
  cases without deadline assertions. Use existing inherited IPC and no new join-specific control
  command.
- During the exact readiness transition for each successfully launched participant Inspector
  process, before returning the response, have the supervisor assign one fresh opaque
  `inspectorProcessId` made from exactly 32 cryptographically
  random bytes (256 bits) and encoded as exactly 43 unpadded base64url
  characters, distinct from OS PIDs, subject IDs, and watchdog/capture IDs. Treat it only as
  non-human launch correlation, never as pseudonymous participant evidence. Use that same safe ID on every cross-stream
  request, effect, and workflow record from the launch and never reuse it for another launch.
  For a failure before launch/readiness, use literal `not-applicable` for the process ID.
  Preserve accepted outcomes and create a mapped-class context, terminal failure, and required
  review only for each missing workflow; do not add a duplicate or extra record. Bind
  all twenty participant attempts to these launch records and reject missing, duplicate,
  malformed, or reused process-ID propagation.
- For each subject, enable fd6 for exactly one LF-terminated ASCII
  `npx --no-install agent-customization-inspector --no-open` line; reject/wipe other or extra input
  and use no shell. In that subject's verified distribution `repository/` cwd, directly spawn and
  OS-observe the sanitized-equipment-PATH sole audited candidate-bound bin. Limit child environment
  to the bound `NODE_OPTIONS` probe, control endpoint/token, and minimum safe run/subject IDs; never
  expose candidate/proxy authority through terminal/env/argv. This fresh participant process/
  context is external ephemeral equipment outside the eight internal long-lived descendants. After
  each attempt close it and drain/reset/clear fd6 so no prior input/output/history crosses attempts.
- From `capture -- start` through `capture -- stop`, have study setup attach product
  instrumentation to each participant's `npx`-launched Inspector Node process by injecting
  only the digest/identity-bound capture script itself as exact
  `NODE_OPTIONS=--import=<bound-capture-script-file-url>`. The probe is distinct from adapters
  and watchdogs. If the candidate reaches its bootstrap, block the body and require exact
  `StudyPreReadinessBootstrapProof` root `schemaVersion`, `productId`, `bootstrapEventId`
  and call `register-pre-readiness-probe` with `studyRunId`, `subjectId`, and that proof to
  receive `preReadinessProbeId`. Keep exact runtime-only `StudyPreReadinessProductBuffer` root
  `schemaVersion`, `studyRunId`, `subjectId`, `preReadinessProbeId`, `state`, where state
  is `open | readiness-bound | terminalization-bound | destroyed`.
- Buffer each canonical safe draft observation with process/workflow/automatic/review fields N/A
  through `buffer-pre-readiness-product-event` request `preReadinessProbeId`,
  `destinationRole`, `payload`. Require supervisor ACK before the product effect; discard raw
  input immediately. On readiness, call `register-product-probe` with `studyRunId`,
  `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles`; bind a fresh process
  ID and complete ordered-release ACK, both open-binding ACKs, and discovery-context ACK before
  returning readiness. A pre-readiness
  exit before bootstrap is ordinary pre-readiness terminalization. An exit after bootstrap binds
  N/A and requires release ACK before terminalization/missing-workflow outcomes. Non-target/helper
  processes never register or emit evidence; after bootstrap, identity, registration, or ACK
  failure invalidates the run.
- Because this participant process cannot inherit the supervisor descriptor, use endpoint/token
  environment only for `register-pre-readiness-probe`, `buffer-pre-readiness-product-event`,
  `register-product-probe`, `submit-product-event`, and `close-product-probe`. The supervisor
  routes each safe event plus opaque
  `inspectorProcessId` to the distinct product or server adapter/watchdog. Use the exact
  `StudyServerCorrelationClaim` payload variant only for `submit-product-event` with
  `destinationRole: inspector-server-ledger`. Keep the outer root exactly `inspectorProcessId`,
  `destinationRole`, `payload`; authenticate the registered probe with the outer process and
  require payload subject/process IDs to equal the participant/SPA claim and binding IDs. Have
  the probe assign the closed correlation header before raw discard. Do not inherit the
  probe/control environment into the browser helper or retain its path/options/environment. A missing,
  altered, alternate, duplicate probe or raw-value IPC is critical; the candidate supplies only
  the dormant readiness hook, not evidence authority.
- Use exact roles `product-instrumentation`, `inspector-server-ledger`, and `study-browser`, each
  with a distinct adapter and watchdog; the watchdog is the sole envelope writer. Start them
  through the already-live supervisor with `pnpm run study:evidence:capture -- start`. Adapters inspect raw traffic only in memory,
  discard raw values before IPC, and send exactly one closed safe payload per authenticated IPC
  message. One primary-workflow observation may produce any number of messages; count and chain
  all of them. Retain/hash only fixed codes,
  protocol-owner-generated opaque IDs, booleans/enums, safe integers, and evidence digests—never raw
  header names, framing, wire or encoded representations, or any noncanonical derivative; bodies,
  content/metadata, participant responses, paths, URLs/authority values, capabilities,
  environment values, or raw errors. Treat only the strictly validated decoded canonical safe
  `correlationId` as the sole header-derived exception in the retained canonical payload and
  digest chain; never hash captured wire/browser/Inspector bytes.
- Use the contract's exact 11-property envelope, pairwise-distinct opaque watchdog/capture
  instance and process-run IDs, closed kind-specific canonical safe payloads, sequence 0 then
  exact +1, prior-envelope chaining, and safe-payload hashes. Configure the nominal scheduler
  target at 1,000 ms and apply one observed continuity ceiling of 1,500,000,000 ns to
  start-to-first-heartbeat, consecutive-heartbeat, latest-heartbeat-to-checkpoint, and
  last-heartbeat-to-stop gaps. Intervening payloads cannot mask a missed heartbeat; a larger
  gap is critical and a gap at or below the ceiling is accepted scheduler tolerance.
  `pnpm run study:evidence:capture -- checkpoint` makes each sole writer atomically snapshot an
  immutable prefix and immediately resume heartbeats/events; it writes no handoff.
  `pnpm run study:evidence:verify -- checkpoint` recomputes only that prefix while later pairs
  may append and creates the open SC-001 handoff. The verifier then authenticates to the
  supervisor with the run ID, checkpoint request ID, and exact handoff digest; require each
  watchdog to append exactly one matching `handoff-anchor` payload after the checkpoint and
  before stop while normal append/heartbeat scheduling continues without pause. An ordinary
  post-prefix pair already queued at checkpoint may precede the anchor. Require continuation to
  validate every intervening pair, the sole matching anchor, and at least one later ordinary heartbeat or
  payload on the same uninterrupted chain. Stops and the seal bind that
  digest with a literal anchor count of one per stream. Replacing both handoff files with a
  different valid prefix must fail even if its companion and later links are recomputed.
  Before SC-006, `pnpm run study:evidence:verify -- continuation` must return zero. After all
  four observations, run `pnpm run study:evidence:capture -- stop` and then
  `pnpm run study:evidence:verify -- finalize`. Start returns six stream processes plus an
  ordered field with exactly two orchestrators. Stop requires zero live reviewer and ends all
  eight internal long-lived descendants but leaves the supervisor/endpoint alive. Finalize independently verifies the commitments,
  original anchor, 80 outcomes, role matrix, three direct adapter exits, three adapter-observed
  authenticated watchdog exit attestations, two direct orchestrator exits, and the moderator-
  observed attested equation `ephemeralReviewerProcessExitCount == reviewVoteCount`, then completes
  finalize-prepare while the endpoint remains live. Receive the exact witness through a separately
  authenticated finalize-commit connection after listener teardown begins but before supervisor
  key destruction and exit. Require the complete response, EOF, and failed reconnection to prove
  endpoint removal, then write and re-read the continuity-witness pair followed by the canonical
  seal pair. The witness binds `controlSessionId`, both identity commitments,
  handoff digest, eight long-lived exits, and reviewer exit count; the seal binds witness/handoff digests, both study digests, and
  exactly three first/final roots plus record/kind counts, and exact aggregate summary
  `automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`.
  Derive automatic IDs as `automatic:<correlationId>`, recompute vote count = twice all
  nonautomatic reviewed failures, and derive reviewer-critical IDs exactly as
  `reviewer:<subjectId>:<workflowClass>` for confirmed/disagreement rows.
  Compute total as the cardinality of the tagged, de-duplicated union of
  `automatic:<correlationId>` and `reviewer:<subjectId>:<workflowClass>`; never count an
  automatic-critical workflow row again. Set zero gate only when that union is empty and the exact
  20-by-4 terminal set is complete; keep 19/20 and 18/20 thresholds independent. The validated terminal stop and
  envelope count bind each terminal sequence. A
  prohibited value, process/watchdog pause/death/restart, identity change,
  endpoint/token/authentication failure, probe or correlation failure, subject/workflow or
  role-matrix mismatch, scheduler misconfiguration, excessive gap, sequence/chain/payload/
  count/digest/commitment/anchor error, handoff rewrite, truncation, early/non-clean exit,
  teardown residue, missing role/witness/seal, failed verifier, or stitch is automatic critical.
- Record zero critical usability issues across primary workflows. Critical means either
  preventing workflow completion without prohibited assistance or causing unintended
  execution, inspected-source mutation, a prohibited direct product-issued outbound request or
  MCP connection as defined by FR-022, a request outside its two exact authorized internal
  loopback classes, or exposure of inspected content to another machine. Those closed classes
  are neither outbound nor MCP and are not this event. Recorded OS-mediated
  traffic for a pre-mounted/mapped source is the FR-022 limitation rather than this automatic
  connection event. An ACKed context correlation is only an eligible failure link: success stays
  all N/A while its automatic issue is counted separately; candidate-bearing failure requires
  the exact accepted same-context `automatic-critical` link without review; only candidate-free
  failure receives two isolated hidden one-use votes. Both product-caused votes are
  `reviewer-confirmed-critical`, both non-product-caused votes are `reviewer-cleared`, and one
  of each is `reviewer-disagreement-critical`; only confirmed/disagreement is a reviewer
  critical issue and there is no identity, note, communication, human/process/case-assignment
  reuse, or third reviewer; literal slots/sanitized terminal surfaces remain resettable. All
  20 participants attempt the standardized comparison and Global-consent
  tasks after SC-006 so the recorded observations cover all four primary workflows.

Before accepting the study evidence, require passing focused contract/source-structure,
fake-clock, and real OS-specific child-process/control-endpoint integration/security suites.
They cover the env phases, canonical HMAC and one-use challenges, single-file/no-import closure,
the initially empty candidate-launch slot, post-input digest-bound provisioning, sole audited-bin
resolution, network/scripts/cache/global/fallback rejection and teardown absence, proxy/probe
attachment and environment stripping, correlation-header grammar and exact role
matrix, 20-token/80-outcome/process-ID equations, crashes after zero through four accepted
workflows with exact missing-row terminalization, path/secret non-retention, eight long-lived
exits plus reviewer-exit equality and
commitments, alternate-valid-prefix handoff rewrite, endpoint teardown, witness, and seal.

### SC-002 performance measurement

Construct one deterministic fixture with exactly 100,000 filesystem entries and 500
matching customization files before measurement, then keep it
unchanged for all runs. Fixture construction/setup and `npx` download, installation, and
process startup are outside both timers.

Run exactly 10 measurements on the same versioned profile published at
`tests/performance/sc002-reference-profile.json`. It identifies the exact OS image/version,
processor architecture/model and logical count, memory, storage medium/filesystem, exact
runtime, benchmark command/configuration, and deterministic fixture manifest/digest. End the
Inspector after each run and start a fresh process for the next; do
not reuse application-memory state or the previous snapshot. Do not deliberately clear or
reset the operating-system filesystem cache—the measurements use its natural evolving
state. In each fresh process, first wait for the automatic initial Repository scan to reach
a terminal state; that scan and its inventory are outside both timers. Then have the browser
dispatch exactly one explicit Repository rescan, start both timers at that dispatch, and
capture the opaque `scanRequestId` from its admission response. Stop the one-second timer
only when the qualifying status defined above is visibly rendered, exposed to assistive
technology, and identifies that same request ID. Stop the ten-second timer only when the
complete inventory from the generation committed by that same request ID renders with its
primary list controls operable. An older status, snapshot, or automatic-scan generation
cannot stop either timer. Then perform one
standardized filter action and one standardized item-selection action. Time each interaction
from browser input dispatch until its filtered results or selected-state feedback is visibly
rendered and operable. One common subset of at least 9 runs must meet all four thresholds:
both scan thresholds individually and both interactions below 100 ms. Record the per-run outcomes and aggregate result with the
profile ID, fixture digest, scan request ID, committed generation, and actual environment values, omitting only personal identifiers
and absolute user paths. A profile-field change starts a new, non-comparable measurement set;
the result is profile-specific rather than a portable performance guarantee.

### SC-003/004/005/007/009 release-evidence fixtures

Freeze `tests/fixtures/outcomes/manifest.json` and its canonical
`tests/fixtures/outcomes/manifest.sha256` before measuring a release candidate. Validate the
manifest schema/version, unique stable case IDs, criterion and required-class membership,
fixture or deterministic-builder references, objective expected outcomes, every referenced
fixture digest, and the declared nonzero minimum for each required class. Execute every
manifested case and record the manifest version, canonical digest, exact case IDs, class
counts, and results in `validation.md` and `validation.ja.md`. A missing, duplicate,
undeclared, unexecuted, or digest-mismatched case, an empty required class, a missing fixture,
or a denominator below its declared minimum fails every affected criterion. Removing or
reclassifying a case, changing a required-class definition, or changing an expected outcome
requires a manifest-version increment and explicit review. Changing only referenced fixture
bytes requires every affected fixture digest and the canonical manifest digest to change.
Either kind of change starts a new non-comparable measurement set; a digest change alone
never authorizes changed denominator semantics, and a release denominator is never weakened
silently. The automated contract uses table-driven previous/current manifest revision pairs
to test the transition rules; it does not inspect or establish human review. For the actual
release diff, record initial creation or the prior/current versions, changed case IDs,
required-class definitions, or expected outcomes, and the explicit reviewer decision or
review reference in `validation.md` and `validation.ja.md`.

## Boundary and environment-capacity validation

```bash
pnpm exec vitest run tests/integration/boundaries
pnpm exec vitest run tests/performance
```

Inspector defines no numeric ceiling for file or aggregate bytes, file or record counts,
path or parser structure, workers, messages, retained graphs, request or response bodies,
package assets, previews, editor computation, coordinator work, or elapsed scan time.
Available capacity comes from Node.js, the selected parser, the operating system,
filesystem, browser engine, and execution environment; no equivalent product-level
capacity-validation contract is exposed.

Boundary fixtures inject throws/rejections from inspected-source read, parser/Worker,
coordination, assembly, and serialization boundaries. They prove no filesystem/parser/
recognition/scan domain catch, cause classification, retry, recovered item, or Diagnostic;
the owning REST boundary alone returns the generic pre-acceptance or accepted-job Operation
Error, while startup-owned work reaches the process top level. No attempt result/generation
is committed, any prior snapshot remains, and API responses/authored source are never
truncated. No error path emits a customization validity/correctness/compliance/lint verdict.

Separate fixtures prove that only FR-028-eligible deterministic non-throwing outcomes after
complete traversal can reach `committable-partial` and publish one atomic contracted-partial
generation with complete unaffected entries.

The boundary matrix distinguishes that candidate-only carveout from source-attempt aborts.
Only a deterministic candidate-local changed-entry or unusable-data value may retain a
diagnostic-only inventory record, and only after complete traversal plus confirmed closure
of every acquired resource. Root/shared-ancestor guards, directory-enumeration guards, and
unconfirmed FileHandle or `fs.Dir` closes commit no candidate record, partial generation, or
success receipt.

Coordinator tests preserve deterministic serialization, generation atomicity, cancellation,
disable/shutdown/supersession revocation, and late-result discard without defining slots,
queue capacity, or a scheduling deadline. The liveness protocol and SC-002 timing thresholds
remain acceptance criteria, not capacity ceilings. Tests do not claim recovery from
process-ending out-of-memory conditions or physical
cancellation of uncancellable Node.js or kernel I/O.

Traversal-plan call traces additionally prove that Repository traversal executes the
compiled immutable plan, a Global exact target never opens the tool-home root, a fixed
instruction-subtree walk opens only that subtree, and every neighboring Global path has
zero I/O. Path-spelling fixtures keep the exact raw `Dirent.name` segment separate from its
NFC classification/display segment, and prove that a no-parent-enumeration targeted fixed
path uses the immutable registry target spelling as its sole I/O operand. A non-colliding NFD-only name is read through the raw
segment and displayed as NFC, while NFD/NFC sibling spellings with one classification key
emit `safe-fs-path-normalization-collision` and give the entire collision group zero
descend, open, or read operations. Because no unambiguous public path exists, the collision
Diagnostic is pathless and session-scoped, and the Source attempt publishes no generation.
Except for the content-dependent Codex ordered fallback, every Source attempt completes
static discovery, admission, collision rejection, and physical grouping before any group is
read. Hard-link identity is usable only when every path and handle returns exact bigint
`dev`, `ino`, and `nlink`, `ino !== 0n`, `nlink` remains positive and stable, and admitted
path count does not exceed it. Fixtures choose the unsigned UTF-8-bytewise lowest
collision-free NFC path as primary, sort the rest as aliases, retain each raw provenance,
match filters/detail/selection across every path, use only the primary for a file Diagnostic,
and prove exactly one physical read for that group in that Source scan attempt. Different
Sources, attempts, and generations verify and read independently. A different derived alias
found after consumption receives `safe-fs-late-derived-alias-rejected` with zero additional
reads. If a consumed empty Codex override and its fallback share the same usable identity,
the fallback receives `safe-fs-ordered-fallback-alias-rejected` with zero fallback reads,
the override remains unpublished, and the attempt is contracted-partial.

Node.js filesystem boundary tests run on the supported macOS, Windows, and Linux CI matrix
against the same platform-neutral package. Each result records the platform, Node.js
version, and whether `node:fs.constants.O_NOFOLLOW` exists and is effective. The call trace
exercises the complete ordered checkpoint catalog, rows 1–28: root admission uses row 1;
each Global selector freshly runs row 20 before its row 2 fixed-prefix or row 3 exact-target
checks; every observed component/candidate receives rows 4–7; and every ticket receives
rows 8–19 across pre-open, post-open/pre-read, and post-read phases. At each candidate phase
the call trace must show this exact sequence:
(1) candidate-path `lstat`, rejecting a symbolic link, non-regular type, or unexpected
identity; (2) only after that succeeds, candidate `realpath` plus `path.relative` canonical
containment; and (3) a second candidate-path `lstat`, requiring identity, type, size, and
relevant timestamps to match the first `lstat`. The stable-symlink fixture must prove that
the first `lstat` rejects it before any candidate `realpath` call.

The filesystem call recorder also proves that every inspected-source open is read-only,
non-create, and non-truncate and that no write, append, create, truncate, rename, delete,
link, chmod/chown, timestamp, extended-attribute, ACL, or equivalent mutation-capable call
occurs. Before/after fixture measurements compare content, length, identity/link state,
mode, modification/change time, and extended attributes or ACLs where observable. Any
access-time movement caused solely by an OS read is recorded separately; it neither fails
the no-product-mutation assertion nor counts as proof, and no product call requests it.

Every directory enumeration runs rows 21–24 immediately before `opendir`, snapshots exact
bigint root/ancestor/target `dev`, `ino`, `mode`, `mtimeNs`, and `ctimeNs`, and registers the
returned `fs.Dir`. It collects the complete sibling set only by explicit `Dir.read()` calls
until null. While the directory remains open, rows 25–28 repeat the corresponding identity,
type, canonical-containment, modification-time, and change-time checks; the registry must
then report `close-confirmed` before the sibling buffer may be classified, descended into,
or used to issue a read ticket. Detectable create, removal, or rename during enumeration
drops that complete buffer and publishes no generation. Candidate enumeration and the
immediately-pre-open phase also snapshot or recheck root identity and every ancestor
`lstat`. The suite then requires effective `O_NOFOLLOW` when available and opens the
`FileHandle`. After open but before reading, it runs the ordered candidate sequence and
compares the handle's pre-read `stat()` with every path snapshot, including `nlink`. After
the sole complete physical read and before parse/publish/commit, it repeats the root and
ancestor checks, the ordered sequence for every hard-link ticket, and `stat()` on the same
open handle. Any detectable change drops the whole byte buffer and publishes no outside
sentinel.

Resource-race fixtures exercise the one process-wide `ClosableResourceRegistry`. An
`opening` reservation exists before each `open()`/`opendir()`; fulfillment attaches the exact
strong resource reference before another await, and rejection removes the empty reservation.
All normal, fatal, cancellation, disable, and shutdown paths invoke or join one shared close
operation. Only fulfillment or an observed FileHandle `close` event establishes
`close-confirmed`; a promise rejection after that event remains observed but succeeds and
does not poison the registry. A thrown/rejected close without confirmation becomes
`close-unknown`, propagates through the owning runtime/REST boundary, strongly retains the
record, publishes no attempt result, and blocks later inspection filesystem work with the
restart-required control. A late FileHandle event may clear that poison; a directory close
without confirmation requires process restart. Concurrent cleanup, disable join, and retry
share the exact record, promise, and observer and never guess closure or call `close()` twice.

Public Node.js APIs do not provide a portable directory-handle-relative open. The same
lstat/realpath/open/fstat/post-check sequence remains mandatory everywhere. An active
adversarial process replacing the source root or an ancestor between checks is outside the
initial-release threat model on every platform; replacement of the final component is also
outside only where effective `O_NOFOLLOW` is unavailable. Ordinary
concurrent edits and every detectable race remain in scope and fail closed. The packed
tarball repeats the same suite, and test-only barriers are absent from production exports.

| OS observation | Required outcome | Security-proof treatment |
|---|---|---|
| Observable stable unsafe state or detectable root/parent/final replacement, including a symlink, non-regular candidate, canonical escape, or metadata mismatch | Reject the candidate or affected source with the applicable diagnostic; discard all bytes. Reject a stable symlink before candidate `realpath` | Required passing evidence |
| Successfully returned identity metadata or canonicalization is structurally ambiguous or unusable | After complete traversal and confirmed closure, a candidate-local value may return `safe-fs-boundary-unverifiable` with only its diagnostic record. A root/shared-ancestor or directory-enumeration guard value, or any unconfirmed close, aborts the Source attempt with no candidate record, partial generation, or success receipt | Required passing evidence |
| Contract-declared structural `lstat` returns exact `ENOENT` | Return only `absent` before observation or `entry-disappeared` afterward; never apply this conversion to `open`/`read`. Prove root/ancestor/directory roles are Source-fatal while terminal regular-file candidate roles map to file-scoped `safe-fs-entry-stale` and may publish only a post-traversal, confirmed-closure contracted-partial Source | Required passing evidence |
| Any other inspected-source operation throws or rejects | Propagate unchanged to the owning outer boundary; publish no file Diagnostic or attempt result | Required passing evidence |
| An optional OS semantic is unobservable through Node.js, such as a same-device bind mount or unreported reparse behavior | Emit an explicit `platform-unobservable` test record with platform, Node.js version, and fixture; make no absolute containment claim | Never counted as security proof |

Static-package tests cover the packed `package.json`, the closed static-manifest schema,
exact record order, MIME/declared-length/digest validation, symlink and unexpected-file rejection,
and Nuxt's root-absolute asset references on every client route without imposing a product-
defined size or record-count ceiling. They prove that the exact
recorded inline scripts boot under CSP while any byte change, unrecorded script, executable
attribute, nonce, `<base>`, relative/external executable URL, or blob/external worker fails
closed before bind or is blocked by CSP. They also assert that only fixed generated
`200.html`/`404.html` are removed, no other HTML is accepted, and neither alias is packed or
served.
Server/package cases validate required CLI/Worker entries, ordered `.mjs` records,
every tsdown chunk, clean staging/output setup, and a recursive exact-set comparison that
rejects one injected stale file or non-regular path in each output subtree. Separate
bootstrap faults corrupt each static/server manifest field and each listed-asset property;
instrumentation proves `bin.mjs` neither dynamically imports/evaluates `dist/cli.mjs` nor
binds until the package version, both complete manifests, and every listed asset validate.
Build, packed-tarball, and runtime cases inject recoverable Node.js, filesystem, and hashing
failures while leaving buffering and handle capacity to the execution environment. None of
these package-owned checks reports a customization validity or lint result.

Parser-failure tests cover every format and distinguish deterministic returned extraction
outcomes from Worker/parser throws. A throw returns no parser, extraction, recognition,
relationship, derived result, item, or Source, propagates unchanged to the owning boundary,
creates only the generic Operation Error when REST-owned, and commits no result/generation,
followed by a successful file only in a newly
admitted retry; they also cover all-or-nothing recognition output. Exact-display tests place distinct
literal credentials and environment-variable references in source and metadata, set
different sentinel process values, and prove that source/comparison views preserve the
authored text exactly, introduce none of the sentinel values, expose no masking/reveal
control, and duplicate no customization source value in Diagnostics. A separate
operational-event capture accepts only fixed event codes and opaque IDs and proves that
no path, root, filename, inspected/authored value, capability, body, raw error, exception,
or Diagnostic argument is emitted.

Diagnostic-behavior tests cover code/source/file/argument deduplication and fixed phase/source/
path/rule/code/occurrence order. A Diagnostic serialization/retention throw propagates
without domain recovery, publishes no attempt result/generation, and is represented only by
the REST Operation Error when REST-owned. Multi-Source cases prove A/B entry-failure pairs coexist, B success preserves A,
A success clears only A's pair, repeated A failure replaces only A's pair, and Global disable
removes only Global pairs. Repeated client-caused API errors never increase a retained diagnostic count.
The same fixtures validate the closed `file | source | session` scope union: file scope
requires `sourceId`, `fileId`, and `sourceRelativePath`; source scope requires `sourceId` and
forbids `fileId`/`sourceRelativePath`; session scope forbids all three. Source- and
session-scoped diagnostics never invent a path for display, deduplication, or ordering.

## Manual accessibility review

Follow the normative [SC-008 accessibility acceptance contract](contracts/accessibility-acceptance.md).
After every criterion-specific `AUTO-*` check passes, execute every `MANUAL-*` check against
the packed release candidate and recheck every `REVIEW-*` rationale against the complete
diff, packed-file manifest, and rendered packed interface. An axe severity result alone does
not establish SC-008. The contract freezes the complete, non-sampled execution matrix:

1. Use only the keyboard to launch/follow the URL, filter, acknowledge the sensitive-content
   warning, open and close a file, select two files, compare, open Global consent,
   enable/disable Global, rescan, and return to inventory.
2. Confirm visible focus, logical focus order, skip/navigation landmarks, unique labels,
   status announcements, error/next-step association, and no focus loss on generation
   replacement.
3. Execute every contract cell across both locales; the three pinned OS/engine/AT profiles;
   all five exact viewport, orientation, zoom, and text-spacing profiles; all three UI modes;
   all eight workflow/state scenarios; and all three input profiles. Record the two explicit
   native-forced-colors N/A platform cells and every row-specific cell N/A individually.
4. Confirm color is never the only indicator of tool, state, severity, selection, or diff.
5. In `validation.md` and `validation.ja.md`, record all 55 Level A/AA rows with frozen state,
   complete required-check IDs, per-ID evidence/result, reviewer, and each Not-applicable
   revalidation note, plus one keyed result for every manual matrix cell. Also record the
   nonzero Applicable-row denominator, zero failed Applicable rows, and all four keyboard
   workflow outcomes. One failed Applicable row, unsupported rationale, missing check ID or
   cell, incomplete keyboard workflow, or untested matrix cell fails SC-008 regardless of severity.

## Release package verification

After all release-evidence and remediation edits are final, rerun the formatting behavioral
test and repository checker in the following order; neither command may rewrite the tree.

```bash
pnpm outdated
pnpm run test:package
pnpm run test:docs
pnpm run test:format
pnpm run format:check
git diff --check
```

Review `pnpm outdated` rather than blindly upgrading: a newer prerelease or an incompatible
TypeScript/Vite major does not replace the latest compatible versions documented in
[research.md](research.md). Assert that the tarball contains only npm's `package.json` plus
the exact `package.json.files` entries `bin.mjs`, `dist`, `README.md`, `README.ja.md`, and
`LICENSE`; the expanded `dist/**` contents must equal the two manifests and their listed
files. Inspect the exact `bin` mapping and absence of `main`/`module`/`exports`, license
notices, exact shebang/executable mode, strict static/server manifests, and the published
README pair. The exact production dependencies are `gunshi`, `yaml`, `jsonc-parser`, and
`smol-toml`; `open` must be absent from every dependency section and the production lock
closure.

For the release record, document the migration impact for every accepted dependency or
breaking public-contract decision. Record the initial baseline as no impact only after
confirming that no prior published package, public contract, persisted profile, user data, or
affected consumer exists. Otherwise record required consumer actions, compatibility/support
window, and rollback/support path. Missing or one-language-only evidence fails the release
gate.

Audit the unpacked root tarball and an isolated installed production closure. A first
scripts-disabled, omit-development install must match the exact lockfile/manifest graph and
verify that every project/dependency tarball payload contains no lifecycle/build requirement,
platform selector, bundled/optional native package, native/binary/Wasm extension or magic,
native build source/metadata, non-Node shebang, executable non-JavaScript file, or package-
owned shell helper. Repeat the audit after a normal-lifecycle install with network access
disabled from the same verified cache. Compute each `package-payload` digest separately, then
bind package name, version, integrity, and that payload digest into the production-graph
digest. Exclude package-manager-generated launch shims from payload and graph digests, require
the same graph digest on every CI OS, and audit shims separately per OS. Only generated
`.bin` symlinks and `.cmd`/`.ps1` shims for exact declared `package.json.bin` targets may
forward argv to audited Node JavaScript; extra input, logic, or any unexpected shim fails.
Generated HTML shell, CSS, JSON manifests, documentation, and license files are accepted as
declarative, non-executable payload artifacts; any manifest-authorized bootstrap remains
JavaScript executable code. FR-038 covers project-authored executable application code and
the published/installed product, while third-party development and test tooling remains
outside that published boundary and is audited separately.

Launcher tests must cover the exact macOS/Linux helpers, URL validation, `shell: false`, the URL
as the sole argv item, one URL line before the attempt, zero child processes under
`--no-open`, and fixed-warning/manual-URL fallback for a missing, nonzero, or unsupported
helper. They also cover Gunshi's non-binding help/version, strict unknown-option rejection,
explicit positional/rest rejection, default exact captured `process.cwd()`, and one `--cwd`
with the exact platform ordering—Windows UNC/device/current-drive/root-relative and
`C:`/`C:foo` drive-relative rejection before `resolve`, plain-relative-only resolution,
shared-parser admission, zero selection-stage filesystem/network I/O, and no `chdir` or
per-drive semantics. The packed-launch harness separately permits only fixed package-owned
manifest/declared-asset reads before CLI import and requires zero selected-root, DNS, SMB, or
outbound-network I/O for every rejected selection.
They reject missing/empty/duplicate/pre-resolution-invalid/parser-rejected `--cwd` before
session/browser creation and require fixed nonzero
validation failures, awaited
completion, and root-only import boundary. They assert the exact minimal per-OS environment
allowlists stated above and prove that only allowlisted keys are copied directly from the launch
environment as ambient provenance. No Source/preview/candidate/file path or authored value is
copied from inspection state, even when its text equals an ambient value; such equality never
changes provenance, grants authority, or selects or alters a command. They also prove that
`BROWSER`, `NODE_OPTIONS`, `NODE_PATH`, every non-allowlisted environment key, and extra argv
are omitted. Windows and other unsupported-platform fixtures
assert zero child processes plus the fixed manual-URL warning. Tests also prove that the OS
helper merely delegates to the default handler and cannot certify its version; the release
record uses the pinned Playwright revisions, and `--no-open` plus the printed URL is the
manual certified-browser fallback. `pnpm run test:docs` separately
validates all
repository English/Japanese document pairs without publishing the planning set. The same
tarball must install, launch, and pass the Node.js filesystem security suite in the six exact
lower-bound OS/architecture certification jobs defined in [research.md](research.md).
Node.js 24.18.0 is the development/build baseline. These finite samples do not claim that
CI has exhaustively executed every patch release in the declared Node.js 24/26 compatibility
ranges and do not narrow that runtime contract.
Finally review the complete diff for untested branches, secret exposure, stale official-path
assumptions, accidental source mutation, and unrelated changes. After every resulting
repository remediation, rerun the complete applicable automated matrix—build, frozen install,
lint, typecheck, unit, contract, integration, security, package, performance, browser,
coverage, documentation, and lower-bound candidate checks—regenerate every affected
candidate/profile/fixture/human or manual evidence set, and repeat complete-diff/tarball review
until it reports no concern. Then record the bilingual Constitution Check as the sole planned
validation-only edit and freeze the tree. Against that frozen tree and candidate, rerun all
applicable automated gates, ending with `pnpm run test:docs`, `pnpm run test:format`,
`pnpm run format:check`, and `git diff --check` before approval. Capture final outcomes in the
external release or pull-request check log rather than by editing a repository evidence file.
Any later repository edit invalidates every outcome and approval and returns to remediation,
candidate/study/evidence digest revalidation, applicable gate reruns, and complete-diff review
before the Constitution/final-gate sequence.

`pnpm run test:package` must install the newly packed tarball into an isolated fixture,
spawn `npx --no-install agent-customization-inspector --no-open`, observe a valid loopback
launch URL, assert that the launched CLI spawned no browser-helper child, and terminate the
process; inspecting the tarball or mapping alone is not a launch test.
