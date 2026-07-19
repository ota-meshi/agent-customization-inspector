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
`/speckit-plan` and `/speckit-tasks`. Do not continue with a second local dependency baseline.

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
  validates that the packed `engines.node` string is exactly `^24.11.0 || ^26.0.0`, that the
  running Node.js version is inside its expanded range, the installed package version, both
  static/server manifests, and every listed asset's exact path, regular-file type, size, and
  digest. Only after all checks succeed does it perform the dynamic import of `dist/cli.mjs`;
  only that imported CLI may bind the server.
- `package.json.bin` is exactly `{ "agent-customization-inspector": "bin.mjs" }`, while
  `main`, `module`, and `exports` are absent.
- A malformed or inconsistent manifest, package-version mismatch, missing/unexpected asset,
  symlink/non-regular asset, or size/digest mismatch fails before CLI module evaluation and
  before any local server bind.
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

Expected:

- The CLI prints the closed-grammar capability URL exactly once before any browser attempt
  and never binds a non-loopback address. With `--no-open`, it creates no child process.
- The Repository source root shown by the browser is the `all-supported` fixture itself.
- Within 1 second the UI visibly renders and exposes to assistive technology a status for the
  current scan request that says queued, names an active phase, or reports complete, partial,
  or failed (with a practical next step for failure). A generic spinner/loading label,
  unchanged control, acknowledgement without scan state, or earlier-scan status does not count.
- The first complete inventory appears within the documented limits and contains no file
  outside the frozen path contract.
- Stopping the process destroys the server session. On a visible authorized page, a failed
  one-second liveness heartbeat or the two-second monotonic lease purges every DTO, DOM
  source value, editor model/worker, comparison, and warning acknowledgement before the
  session-ended view. Restarting—even with port reuse—has a different `sessionId` and
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
`DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, `LC_ALL`. `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`, inspected
content or paths, authored values, user-supplied commands, environment-selected handlers,
other environment values, and extra environment-derived argv are omitted. This fixed startup
helper is the sole product-initiated child process permitted in the initial release.
Windows and every other platform deliberately skip automatic opening in this release because
portable Node supplies no independent trusted system-helper boundary. Missing/nonzero helpers
and unsupported platforms leave the server running with a fixed manual-URL warning. If automatic browser
opening fails, the already printed local URL is sufficient. There is no repository
argument, ancestor-root discovery, remote-host flag, static-export command, or MCP command
in the initial release.

The fixed helper delegates the URL to the operating system's default browser; it neither
selects nor verifies a browser version, and helper success is not compatibility evidence.
For deterministic certification, use `--no-open` and paste the printed URL into one of the
three pinned Playwright revisions. Participant-study evidence records the default handler and
counts the run only when that handler is a certified revision; otherwise use the same manual
certified-browser fallback before enrollment.

## Automated quality gates

Run every gate before considering an implementation change complete:

```bash
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:security
pnpm run test:package
pnpm run test:performance
pnpm run test:e2e
pnpm run test:docs
```

Expected:

- Lint and type checking complete without ignored failures.
- Unit tests cover path classification, ordering, parser bounds, exact authored-value
  presentation, environment-reference non-resolution, diagnostics, state transitions, and
  deterministic projections.
- Contract tests cover every API status/security rule and every stable behavior, inspection-
  rule, composition-strategy, and official-source ID, including positive, one-rule
  near-miss, derived, relationship-only, excluded, multi-provenance, multi-tool, and Global
  cases. They also prove every returned metadata field and relationship kind is present in
  the maintained closed presentation allowlist for its supported type, while unknown
  authored keys and references remain available only in complete source text.
- Integration/security tests prove source containment and zero customization-derived
  execution, child process, MCP connection, outbound request, dynamic evaluation, or
  source mutation; the separately tested startup launcher never receives inspected content,
  an inspected path, an authored value, a user-supplied command, or an environment-selected
  handler.
- Package tests build a tarball, inspect its contents, install it into an isolated fixture,
  load the packaged Node.js filesystem service and fixed packaged parser Worker URL, and
  launch the exact `npx` entry without relying on the working tree or a runtime download.
  They also audit scripts-disabled and network-disabled normal installs of the complete
  production closure for the closed payload-JavaScript/no-lifecycle/no-native policy,
  separate package-manager-generated shim audit, and equal package graph digest on every CI
  OS. Negative bootstrap fixtures prove that `bin.mjs` never evaluates the CLI or binds
  before both manifests and every listed asset pass verification.
- The unchanged deterministic performance fixture with 100,000 entries and 500 in-limit
  customization files is measured in exactly 10 fresh Inspector processes on the same
  versioned checked-in profile. At least 9 runs show a qualifying current-request status
  within 1 second and complete within 10 seconds under the timer/cache protocol below. After
  each complete inventory becomes operable, perform one standardized filter action and one
  standardized item-selection action; at least 9 of the same 10 runs keep both dispatch-to-
  visible-operable-result measurements below 100 ms.
- Browser tests cover all four user stories and axe reports no critical applicable WCAG
  2.2 AA violation.
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
   resolves, and every `sourceRefs` entry is reciprocal with a bounded
   `OfficialSourceRecord`; offline tests recompute its semantic fingerprint. The explicit
   drift check enforces official HTTPS hosts, redirect/content/size/time limits, exact
   section selection and normalization, and fails closed without auto-updating a behavior,
   rule, strategy, or checked-in digest.
2. Vendor lookup bases, relative selectors, and traversal modes are validated independently
   from Inspector matchers. Every Repository matcher has the exact `./` Base and
   canonical-round-tripping typed segment programs paired one-to-one with its `./`-relative
   selectors; bare `**/`, unknown/misplaced tokens, adjacent or third recursive tokens, and
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
   after an absent or safely empty override, fails closed without fallback for an unsafe,
   unreadable, oversized, or undecodable present candidate, and publishes at most one
   non-empty file. Apply absent, empty, BOM-only, whitespace-only, non-empty, unreadable,
   oversized, undecodable, and non-regular fixtures independently to both ordered targets.
   Only explicit exact-target `lstat` not-found after root verification is absent; every
   other error and disappearance after the first observation fails closed. These fixtures
   pin the content rule, short-circuit behavior, and zero operations on an unselected target.
3. Static rules authorize only their exact typed literal/one-segment/recursive-directory
   programs and shared scan bounds, never a text glob evaluated at runtime. A file
   admitted by static and derived rules is read once and retains both provenances, each
   with its own matched path, behavior/strategy/source evidence, scope/order, and
   applicability. Public provenance DTOs use the closed `ScopeDescriptor` and
   `OrderDescriptor` unions with Source-relative paths and stable comparison keys; unknown
   order is represented by null plus its condition fact, never a lossy recognition-level
   aggregate.
4. Surface fixtures keep GitHub Copilot VS Code, CLI, and cloud lookup behavior distinct.
   They prove that the VS Code workspace-root instruction is exact, while CLI standard-
   location and target-path traversal is represented as vendor behavior rather than an
   Inspector glob. Root-only and nested near misses demonstrate the difference.
5. Repository, documented User, and consented Global tables are validated independently.
   A documented User location never becomes Global read authority unless FR-015 through
   FR-018 name it, and runtime composition never merges the Inspector's Repository and
   Global source graphs.
6. The closed `DerivationProgram` has exactly five initial mappings and no runtime
   extension point: `copilot.derived.local-plugin-manifest`,
   `claude.derived.local-plugin-manifest`, `codex.derived.local-plugin-manifest`,
   `codex.derived.fallback-basename`, and `codex.derived.skill-metadata`. Each is one typed
   edge with an exact static seed rule/kind, closed declaration syntax, fixed base/
   placement/suffix, and bounded fan-out; callbacks, arbitrary joins, expressions, globs,
   and recursive derivation are unrepresentable. Fixtures enforce mapping-local
   `maxTargetsPerDeclaration` values 4/1/1/1 for the Copilot-marketplace,
   Claude-marketplace, Codex-marketplace, and Codex-skill-metadata mappings, respectively.
   The Codex-fallback `maxTargetsPerDeclaration` is 64, allowing at most 64 bounded ancestor
   positions per declaration; one config contributes at most 16 names, and all of its
   declarations still share the exact static seed's 128-target cap. A bounded-derived
   provenance, generic
   relationship, sibling Codex subtree, remote source, or arbitrary config/component path
   never seeds another read. An independent static provenance on the same physical file can
   seed its own typed rule. Every derived provenance names its exact `seedProvenanceId`, and
   declarations from two seed provenances—including hard-link aliases of one physical seed
   file—never collapse even when they resolve to one target. Codex fixtures
   cover both plain-string and object `source.path` local marketplace forms. Seed-state
   fixtures prove known-satisfied output, unresolved conditional output, no output from a
   known unsatisfied/shadowed or bounded-derived seed, stable deduplication/first-128
   retention, and no target access for the 129th value. Pure path fixtures run on every OS
   for ADS colons, Windows-special characters and device names, trailing dot/space,
   ambiguous case/Unicode-normalization alias collisions, and 8.3 aliases; none reaches read authorization or
   the centralized Node.js filesystem read operation.
7. Applicability keeps documentation status, product surface, root/runtime `cwd`, target
   match, trust/approval, enablement, selection, agent context, tool availability,
   installation, managed policy, and external runtime as separate facts. Codex instruction
   byte budget is a separate fact; it can produce `omitted` only when the runtime chain and
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
   target versus exact authored occurrence, and instruction budgets at one byte before,
   exactly at, and one byte above both the default 32-KiB and project-declared cumulative
   UTF-8 caps, with the broad-to-narrow omitted provenance asserted.
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

1. Repository source equals child-process `cwd` and no picker/ancestor root appears.
2. Source, tool, kind, and Source-relative Path filters work with keyboard and pointer
   input; every path is relative to its owning Source's one root and no cross-Source path
   namespace is implied.
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
5. The first snapshot has legal empty bootstrap generation 0. The automatic Repository
   scan commits generation 1 on success; a forced fatal first attempt publishes no partial
   results, leaves generation 0 active and current, exposes null failed progress, and
   reports only a bounded actionable lifecycle diagnostic.

### 2. Inspect without activation

```bash
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm exec playwright test tests/e2e/session-liveness.spec.ts
pnpm run test:security
```

Verify:

1. Hook commands, scripts, plugin components, URIs, markup, and MCP declarations appear as
   inert text/data and never execute, connect, load, or navigate.
2. Before source or comparison opens, the UI states that complete authored content may
   contain sensitive values. After that warning, every maintained literal credential and
   displayed metadata value appears exactly as authored in source and comparison views;
   no mask or reveal control exists. JSONC escaped strings, YAML quoted/block scalars,
   TOML quoted strings/datetimes, collection punctuation, and accepted duplicate fields
   retain their exact source slices, source order, and occurrences after API transport.
   Structural metadata comparison matches `(tool, kind, fieldId, occurrence)` and exposes
   lexical differences even when typed semantic values are equal. Boundary-sized TOML integers,
   floats, and date/time values retain their typed canonical semantic payload without
   JavaScript precision loss while their authored spellings remain unchanged.
3. Environment-variable references remain literal text even when sentinel process values
   are set; no referenced process-environment value appears in any displayed content.
4. Operational diagnostics and logs contain no duplicated customization source value.
5. Malformed, unreadable, stale, binary, oversized, cyclic, traversal, and boundary-
   crossing fixtures produce actionable safe diagnostics while unaffected files remain
   usable.
6. Parser timeout, worker-memory, depth, node, scalar, or metadata-entry overflow discards
   only that recognition's whole extraction result, retains the complete authored source,
   and never leaves a derived read authority. Every half-open `SourceTextRange` is measured
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
7. Documentation status and applicability facts remain separate; conditional, conflicting,
   experimental, deprecated, disabled, omitted, shadowed, and unknown provenances/edges
   never become an invented “effective” result.

### 3. Compare two files

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
```

Verify:

1. Exactly two readable active-generation files can be selected from any source/tool.
2. Read-only Monaco source models contain the complete authored text without masking or
   environment substitution, disable links/editing, and use opaque in-memory URIs rather
   than filesystem paths.
3. Monaco shows literal source differences without semantic ranking, merge, lint,
   validation, formatting, conversion, or fix suggestions. Recognition metadata remains
   distinguishable and is compared by typed fields in Vue rather than serialized as JSON;
   provenance paths/status/scope/order/applicability and relationship-edge applicability
   remain separate rows.
4. The 20,000-line-per-file cap or 5,000 ms Monaco computation timeout reports an
   actionable diagnostic without removing the complete read-only side-by-side authored
   source.
5. Rescan, removal, Global disable, or route close clears stale selections and displayed
   detail state and disposes every associated editor/model instance.
6. Keyboard and screen-reader users can enter, navigate, and leave the source diff through
   labeled controls and the accessible diff viewer without a focus trap.
7. The packed app loads its editor worker from a same-origin static asset with no CSP
   violation, external request, or `blob:` worker.
8. Direct loads of `/`, `/compare`, `/global-consent`, and `/files/<fileId>` all boot from
   the same root-absolute assets. The CSP's exact Nuxt bootstrap hash succeeds while a
   modified/unrecorded inline script and executable attribute are blocked.
9. Liveness tests cover visible-page process termination, heartbeat timeout, lease expiry,
   hidden/page lifecycle purge, session-ID mismatch after port reuse, and a late in-flight
   response after the client epoch changes; no pre-purge inventory, detail, comparison,
   editor, authored-content DTO/DOM state, or acknowledgement remains or is automatically
   restored. Deterministic delivery pauses hold an already-linearized SessionSnapshot or
   FileDetail while a scan or Global-disable commit advances the generation, proving that
   envelope generation and payload never mix. They verify the SPA's monotonic
   `clientDataEpoch`, `currentGeneration`, and latest request token: an older-generation or
   superseded-token/epoch response cannot repopulate state; adopting a newer snapshot first
   advances the epoch and aborts/disposes old requests and generation-owned state. A file
   detail is adopted only when its captured `(clientDataEpoch, currentGeneration, fileId)`
   still matches all three live values.
10. With active Global consent, hidden-to-visible recovery first proves the purge removed all
    old DOM/DTO/editor/acknowledgement state, then authenticates a fresh session using only
    the retained memory capability. It adopts the returned `sessionId` without retaining or
    comparing the purged ID and constructs only a fresh `globalControl` projection. Disable
    is available immediately; retrieving and verifying the same frozen preview ID/digest
    rebuilds only retry controls. The explicit Resume inspection action re-fetches the
    matching session and constructs a fresh inventory summary with default filters, but
    restores no old detail, comparison, editor, authored source, selection, filter, or
    acknowledgement. A later detail/comparison request requires a new acknowledgement.

### 4. Opt in to Global inspection

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

The test harness supplies isolated fake tool homes; it must never inspect the developer's
real home directory. Verify:

1. No Global path is touched before consent; the preview is derived lexically without
   `stat`, `realpath`, enumeration, or file reads.
2. The consent view shows the exact Copilot, Claude, and Codex lexical roots, relative path
   patterns, input states, exclusions, and contract version `2026-07-17`. The frozen
   internal preview separately retains each exact bounded raw `lexicalRoot` string (or null
   only for an oversized entry); `displayRoot` is one-way escaped presentation and is never
   decoded into read authority.
3. After opt-in, only the documented instruction candidates appear under zero to three
   separately identified tool-specific Global Sources—at most one each for Copilot,
   Claude, and Codex—and every Source has exactly one root.
4. Present-empty, relative, invalid, and oversized env overrides use fixed preview states/
   messages, create no retained Diagnostic, and never silently fall back; only an absent
   entry uses default. A lexically eligible but missing, unreadable, or otherwise unusable
   root is rejected after consent with that tool's reserved failure diagnostic.
   A preview with no eligible tool root returns `no-eligible-global-root` and activates no
   consent/control record.
5. A 32-KiB root and 192-KiB escaped display remain exact. The next byte produces
   `inputState: oversized`, `displayRoot: null`, and `global.previewTooLarge` with no
   displayed prefix, normalization, canonicalization, root creation, or authorization.
6. A stale, changed, or cross-session replayed preview ID/digest is rejected. For every
   entry the digest binds two separate type-tagged, length-prefixed fields: the stored raw
   `lexicalRoot` string/null and the escaped `displayRoot` string/null. It also binds the
   typed `TraversalPlan` version, closed selection policy, and canonical program. The display field never
   substitutes for the raw field. Enable uses only the frozen raw value and stored plan; it
   never rereads the environment, reverse-converts `displayRoot`, or treats displayed
   `pathPatterns` as authority. Escape-collision, control-character, and backslash fixtures
   prove that digest preserves the separate fields and admission uses the stored raw value.
   A preview with two eligible entries and one ineligible entry has no request-side tool
   selector: initial enable derives `confirmedTools` as exactly those two eligible tools in
   closed order, reserves and validates both, and returns disjoint `acceptedTools` and
   `rejectedTools` whose union is that complete work set. A `tools` key or any other selector-
   shaped extra input is rejected and cannot narrow or reorder it. Retry derives the same
   way from every confirmed tool that still lacks a Source.
   Reusing the exact active consent is accepted only to retry a confirmed tool that still
   has no Source;
   existing Sources remain unchanged and a different preview/root requires disable first.
   A canonical root that differs from the stored raw lexical absolute root shown by the
   preview through a symlink, junction, case, normalization, or short-name alias is rejected
   before enumeration and is never silently substituted.
   Capacity exhaustion for either initial enable or retry returns `503` before state
   mutation. Exact-capacity, all-rejected, partial, fatal-scan, cancellation, and repeated-
   retry fixtures prove each reservation share is released or transferred exactly once and
   terminal `GlobalEnableOperation` records are unregistered. At the final locked
   disposition point, an operation-first race commits `202` even if delivery follows disable
   acceptance, while a barrier-first race returns `409`, leaves no late side effect or
   reservation leak, and permits the next enable. Exercise both orderings while paused during
   validation, after admission but before mutation, and immediately before job enqueue/
   disposition.
7. Disable is a priority barrier: it discards active uncommitted work, cancels queued
   Global work, commits removal of every Global Source as N+1, and requeues an interrupted
   Repository command once to commit at most N+2. Global files, exact-content DTOs,
   generation diagnostics, `GlobalToolControl`-owned lifecycle diagnostics, comparisons,
   stale-failure entry/diagnostic pairs for removed Global Sources, consent, all controls,
   every retained root context, and the frozen preview disappear; Repository
   content and any Repository stale-failure pair are carried while
   generation-owned IDs rekey.
   A paused validation/admission fixture accepts disable, increments the command epoch,
   drains and unregisters the enable operation, then releases a late completion; that
   completion creates no control mutation, diagnostic, context, ID, or scan job after the
   final cancellation sweep. The barrier-first cases release every untransferred capacity
   share exactly once before a later enable reserves it again.
8. Explicit Global rescan is accepted only while enabled, follows the same FIFO and
   dequeue-time generation rules as Repository rescan, and rekeys all carried Source graphs on
   commit. An unknown/removed Source returns `404 stale-resource`, a pending/active disable
   returns `409 global-disable-pending`, and a duplicate returns `409 scan-in-progress`. A fatal
   attempt publishes zero uncommitted partial results, keeps exact consent/boundaries and
   every prior per-tool graph, creates or replaces only that Source's stale-failure entry and
   reserved diagnostic, reports failed/null progress, and remains eligible for explicit
   rescan or disable. A different Source's successful commit preserves both; the affected
   Source's successful complete/bounded-partial rescan clears both.
9. A fatal initial tool enable publishes no provisional Source or file result, adds no
   `StaleSourceFailure` entry for the missing tool, preserves all pre-existing entries and the
   derived snapshot state, creates/replaces that tool's keyed reserved failure diagnostic, and retains
   only the consent/`GlobalToolControl` state needed for exact-consent retry or disable.
   In a mixed outcome, validation/admission and initial-scan tools remain in `pendingTools`;
   an `unvalidated` tool is never retryable. Rejected/non-pending admitted tools may be
   listed as retryable, but retry remains disabled with `409 global-enable-in-progress`
   until all pending work finishes. It then queues only those tools and preserves successful
   Sources. Disable remains immediate.
10. On initial activation, when every lexically eligible tool is rejected by post-consent
    root validation, enable returns `202 active-no-job` with empty `acceptedTools`, all affected
    `rejectedTools`, no Global Source/job/stale-failure entry, and bounded diagnostics in the affected tools' reserved
    failure slots. `globalControl` remains
    active with those tools retryable, and the preview route returns the same frozen preview;
    disable remains available. An all-rejected retry creates no new Source/job and preserves
    existing Sources; a partial acceptance returns `queued` and partitions the tools.
    A retry after a fatal initial scan closes/unregisters any retained context whose root
    changed or became unverifiable, discards its unpublished IDs, and leaves no authority in
    the rejected control before a later complete re-admission.
11. A second disable while a barrier is queued/active joins the same completion and adds no
   generation. With no tool-specific Global Source or graph, active consent record, retained
   admitted Global root context, open Global inspection `FileHandle`, or running/queued Global
   scan/enable command, disable is a no-op even while unrelated Repository work is active.
   During the barrier the projection is `globalControl.state: disabling`, pending/retry arrays are empty,
   the UI offers no retry, and enable returns `409 global-disable-pending`.

## Measurable outcome protocols

### SC-001 and SC-006 participant study

Prepare one bilingual study kit containing the product guidance, standardized SC-001 and
SC-006 task prompts, intended fixture repository, designated SC-006 customization file,
four-field response form, and predefined ground truth. Enroll exactly 20 people who use Git
and a command-line interface in normal development work but have never used the Inspector
or contributed to it. Use the same cohort in one session, with SC-001 before SC-006.

Before enrollment, the maintainer team publishes a bilingual plan naming the accountable
study owner, recruitment and compensation-funding owner, moderators and reviewers, schedule
and support contact, consent/privacy and anonymized-retention procedure, supplied repository
and equipment/session support, and accessibility accommodations. Participants need no
personal repository, paid product, or personal expenditure. Ordinary contributors do not
recruit, fund, moderate, or review participants. Missing resources block the initial-release
claim, not review of an otherwise conforming contribution; repeat the study only after a
material change to a primary workflow, supplied guidance, fixture, or scoring rubric.

- A moderator may repeat the applicable prompt verbatim and may not provide command,
  navigation, or interface-operation hints.
- After enrollment, every equipment, environment, or product failure counts as an
  unsuccessful result for the affected criterion, including a failure before its timer;
  do not exclude or replace the participant.
- For SC-001, start the timer when the standardized prompt is presented. Stop when one
  discovered customization file's source/details view is visibly open and operable. The
  interval includes changing to the intended repository root and launching the Inspector.
  At least 19 of 20 participants must succeed within two minutes.
- For SC-006, place every participant—regardless of SC-001 result—in the same prepared
  Inspector state with the designated file open. Start when that state is ready and the
  standardized prompt is presented. The participant must submit source, recognizing tools,
  file type, and certain/conditional effective behavior within two minutes; all four must
  match the predefined ground truth. Any omitted or incorrect field is unsuccessful, and
  at least 18 of 20 participants must succeed.
- Record zero critical usability issues across primary workflows. Critical means either
  preventing workflow completion without prohibited assistance or causing unintended
  execution, inspected-source mutation, an MCP/network connection, or exposure of
  inspected content to another machine. A safety event is automatically critical. Only a
  suspected product-caused workflow blocker that is not a safety event receives two
  independent fixed-rubric classifications; disagreement counts as critical, with no third
  adjudicator. All 20 participants attempt the standardized comparison and Global-consent
  tasks after SC-006 so the recorded observations cover all four primary workflows.

### SC-002 performance measurement

Construct one deterministic fixture with exactly 100,000 filesystem entries and 500
matching customization files within the documented limits before measurement, then keep it
unchanged for all runs. Fixture construction/setup and `npx` download, installation, and
process startup are outside both timers.

Run exactly 10 measurements on the same versioned profile published at
`tests/performance/sc002-reference-profile.json`. It identifies the exact OS image/version,
processor architecture/model and logical count, memory, storage medium/filesystem, exact
runtime, benchmark command/configuration, and deterministic fixture manifest/digest. End the
Inspector after each run and start a fresh process for the next; do
not reuse application-memory state or the previous snapshot. Do not deliberately clear or
reset the operating-system filesystem cache—the measurements use its natural evolving
state. Start both timers when the browser submits the scan request. Stop the one-second
timer only when the qualifying current-request status defined above is visibly rendered and
exposed to assistive technology, and stop the ten-second timer when
the complete inventory renders with its primary list controls operable. Then perform one
standardized filter action and one standardized item-selection action. Time each interaction
from browser input dispatch until its filtered results or selected-state feedback is visibly
rendered and operable. At least 9 runs must meet both scan thresholds individually and keep
both interactions below 100 ms. Record the per-run outcomes and aggregate result with the
profile ID, fixture digest, and actual environment values, omitting only personal identifiers
and absolute user paths. A profile-field change starts a new, non-comparable measurement set;
the result is profile-specific rather than a portable performance guarantee.

## Boundary and resource-limit validation

```bash
pnpm exec vitest run tests/integration/boundaries
pnpm exec vitest run tests/integration/limits
pnpm exec vitest run tests/performance
```

Expected enforced limits:

| Limit | Value | Expected result at limit |
|---|---:|---|
| One file | 1 MiB | Keep inventory item; do not read beyond limit; add diagnostic |
| Total retained file bytes | 32 MiB | Publish bounded partial generation |
| Visited entries | 200,000 | Stop enumeration deterministically; publish partial generation |
| Customization files | 2,000 | Stop accepting new candidates; preserve accepted items |
| Path depth | 64 segments | Skip deeper entry with safe diagnostic |
| Hard-link aliases | 1,024 per file | Retain primary identity, stop new aliases, publish partial with a diagnostic |
| Hard-link aliases per generation (`maxAliasPathsPerGeneration`) | 50,000 | Stop in deterministic file/path order before the next alias; publish partial with a diagnostic |
| Recognitions (`maxRecognitionsPerFile` / `maxRecognitionsPerGeneration`) | 36 per file, 8,000 per generation | Keep at most one `(fileId, tool, kind)` record; stop later complete recognitions in deterministic file/tool/kind order and publish partial |
| Relationships | 1,000 per file, direct depth 1 | Keep the first 1,000 in provenance/recognition/rule/kind/closed-origin/source-occurrence order; on the next distinct edge publish partial with a diagnostic; never follow them |
| Relationships per generation (`maxRelationshipsPerGeneration`) | 100,000 | Stop before the next complete relationship record in stable global order and publish partial |
| Candidate provenances | 2,000 per recognition | Stop further admissions, publish partial, retain explicit diagnostic instead of a lossy aggregate |
| Candidate provenances per generation (`maxCandidateProvenancesPerGeneration`) | 100,000 | Stop before the next complete provenance record in stable global order and publish partial |
| Derived targets | 128 distinct per exact static `seedProvenanceId`, provenance depth 1 | Keep the first 128 in derivation-rule/closed-field/source-occurrence order; on the 129th stop before target stat/read, publish partial, and offer a capped diagnostic candidate |
| Codex fallback names/placement | 16 per config, 128 UTF-8 bytes each; at most 64 ancestor positions per declaration | Reject an extra/oversized value and any position beyond the bound without authorizing its path |
| Parser structure | depth 64, 50,000 nodes, 64 KiB per scalar, 512 metadata entries per recognition | Discard that recognition's complete extraction result; retain complete authored source and unrelated successful recognitions |
| Metadata entries per generation (`maxMetadataEntriesPerGeneration`) | 100,000 | Reject the next recognition's whole extraction result, publish partial, and retain no prefix from it |
| Parser time/isolation | 2,000 ms per recognition; at most two workers with 64/16/4 MiB old/young/stack limits | Terminate and replace the worker; publish partial with no relationships or derivations from the failed result |
| Parser messages (`maxParserMessageBytesPerRecognition` / `maxParserMessageBytesPerGeneration`) | 2 MiB per recognition, 32 MiB per generation | Reject an oversized recognition atomically; stop later parse dispatch in deterministic order at the generation cap and publish partial |
| Retained graph (`maxRetainedGraphBytes`) | 64 MiB | Stop before retaining the next complete graph record; publish partial and keep no partial record |
| Source condition facts | 256 per source | Reject an invalid shipped registry before scanning; do not truncate known limitations |
| Assessment condition facts | 64 per provenance/relationship | Reject an invalid registry emitter; preserve distinct reason/basis facts for one key |
| Scan diagnostics | 128 per file, 5,000 per source, 10,000 per generation | Reserve each final slot for its fixed sentinel; deterministically suppress later distinct details and publish partial on overflow |
| Session lifecycle diagnostics | 1,024 outside committed generations | Reserve four fixed failure slots—Repository plus one per Global tool—and one fixed session sentinel; keep at most 1,019 ordinary details, do not retain client request errors, and never mutate committed generation content |
| Lifecycle diagnostic insertion | 2 KiB canonical UTF-8 JSON delta per complete Diagnostic plus duplicated ID and separators | Convert an oversized keyed failure to its compact per-key record; suppress an oversized ordinary detail into the sentinel |
| Lifecycle-diagnostic sub-budget | 2 MiB canonical UTF-8 JSON delta, including a 16 KiB fixed-diagnostic reservation | Keep ordinary details outside the reservation and atomically credit a replaced keyed record |
| Session-control sub-budget | 1 MiB canonical UTF-8 JSON delta | Build-test the worst-case stale state, Global control, and Source lifecycle/progress projections; never borrow diagnostic/base bytes |
| Complete session overlay | 3 MiB canonical UTF-8 JSON delta | Exact sum of the disjoint 2-MiB diagnostic and 1-MiB control sub-budgets |
| Global preview root input | 32 KiB UTF-8 | On the next byte return `oversized`/null before normalization or escaping |
| Global preview escaped display | 192 KiB UTF-8 | Stop before output expansion, return `oversized`/null, and expose no prefix |
| Request body | 64 KiB | Reject with `413` before JSON parsing |
| Session snapshot | 5 MiB neutral-overlay base plus 3 MiB overlay; 8 MiB complete UTF-8 JSON | Enforce the base while constructing the generation and the overlay for every later session mutation; never truncate an API response |
| File detail (`maxFileDetailBytes`) | 4 MiB UTF-8 JSON | Enforce while accepting complete file records; never truncate source text or a graph record |
| Scan wall time | 30 seconds | Abort and publish bounded partial result |
| Comparison lines | 20,000 per file | Skip Monaco diff highlighting; keep both complete authored source views |
| Comparison computation | 5,000 ms | Cancel Monaco diff; keep both complete authored source views |

The 10-second success criterion is a performance target, not the hard timeout. Every limit
test must assert deterministic ordering, no extra read after the stopping condition, and
no stale Monaco model after comparison fallback or teardown.

Aggregate and response-budget fixtures count deterministic canonical encoded bytes and
record counts before retaining each complete file summary, alias, recognition, metadata
set, provenance, relationship, diagnostic, or other graph record. Reaching a cap rejects the next whole
record, publishes the contracted bounded-partial diagnostic where applicable, and never
cuts a string, array item, object, source text, or graph record. The API performs no
response-time truncation; deliberately inconsistent committed-state fixtures return the
fixed safe `500 response-size-invariant` error with no partial `data`.
Boundary fixtures fill the neutral-overlay base to exactly 5 MiB, then add, replace, clear,
and overflow lifecycle records while exercising every maximum legal session-control
transition in deterministic order. They verify the paired 2-KiB charge, 16-KiB fixed-
diagnostic reservation, keyed compact fallback, ordinary-detail suppression, shared session
sentinel, atomic old-charge credit, 2-MiB diagnostic and 1-MiB control isolation, the 3-MiB
total overlay cap, and an always-complete final envelope at or below 8 MiB. A build fixture
serializes the exact worst-case legal control projection within 1 MiB and rejects a synthetic
schema variant whose worst-case encoding is exactly 1 MiB plus one byte; an intentionally
corrupted over-limit committed control state takes the fixed no-data `500` path rather than
representing a legal runtime overflow.
Escaping and key-order fixtures assert that the canonical accounting buffer is byte-for-byte
the HTTP entity body, and that its exact length matches `Content-Length` when present.

Traversal-plan call traces additionally prove that Repository traversal executes the
compiled immutable plan, a Global exact target never opens the tool-home root, a fixed
instruction-subtree walk opens only that subtree, and every neighboring Global path has
zero I/O. Path-spelling fixtures keep the exact raw `Dirent.name` segment separate from its
NFC classification/display segment: a non-colliding NFD-only name is read through the raw
segment and displayed as NFC, while NFD/NFC sibling spellings with one classification key
emit `safe-fs-path-normalization-collision` and give the entire collision group zero
descend, open, or read operations.

Node.js filesystem boundary tests run on the supported macOS, Windows, and Linux CI matrix
against the same platform-neutral package. Each result records the platform, Node.js
version, and whether `node:fs.constants.O_NOFOLLOW` exists and is effective. At each
candidate verification phase—enumeration, immediately before open, after open but before
reading any bytes, and after the bounded read—the call trace must show this exact sequence:
(1) candidate-path `lstat`, rejecting a symbolic link, non-regular type, or unexpected
identity; (2) only after that succeeds, candidate `realpath` plus `path.relative` canonical
containment; and (3) a second candidate-path `lstat`, requiring identity, type, size, and
relevant timestamps to match the first `lstat`. The stable-symlink fixture must prove that
the first `lstat` rejects it before any candidate `realpath` call.

Enumeration and the immediately-pre-open phase also snapshot or recheck the root identity
and every ancestor `lstat`. The suite then requires effective `O_NOFOLLOW` when available
and opens the `FileHandle`. After open but before reading, it runs the ordered candidate
sequence and compares the handle's pre-read `stat()` with both phase `lstat` results and the
earlier snapshots. After the bounded read and before parse/publish/commit, it repeats the
root and ancestor checks, the ordered candidate sequence, and `stat()` on the same open
handle. Any detectable change drops the whole byte buffer and publishes no outside
sentinel.

Public Node.js APIs do not provide a portable directory-handle-relative open. The same
lstat/realpath/open/fstat/post-check sequence remains mandatory everywhere. An active
adversarial process replacing the source root or an ancestor between checks is outside the
initial-release threat model on every platform; replacement of the final component is also
outside only where effective `O_NOFOLLOW` is unavailable. Ordinary
concurrent edits and every detectable race remain in scope and fail closed. The packed
tarball repeats the same suite, and test-only barriers are absent from production exports.

| OS observation | Required outcome | Security-proof treatment |
|---|---|---|
| Observable stable unsafe state or detectable root/parent/final replacement, including a symlink, non-regular candidate, canonical escape, or metadata mismatch | Reject the candidate or affected source with the applicable bounded diagnostic; discard all bytes. Reject a stable symlink before candidate `realpath` | Required passing evidence |
| Node.js reports required identity metadata or canonicalization as errored, ambiguous, or unusable | Return `safe-fs-boundary-unverifiable`; reject the candidate, or the source for a root/shared-ancestor failure | Required passing evidence |
| An optional OS semantic is unobservable through Node.js, such as a same-device bind mount or unreported reparse behavior | Emit an explicit `platform-unobservable` test record with platform, Node.js version, and fixture; make no absolute containment claim | Never counted as security proof |

Static-package tests cover the 2-MiB/4,096-asset/512-byte-path/32-inline-hash manifest
limits, exact schema/order/MIME/size/hash validation, symlink and unexpected-file rejection,
and Nuxt's root-absolute asset references on every client route. They prove that the exact
recorded inline scripts boot under CSP while any byte change, unrecorded script, executable
attribute, nonce, `<base>`, relative/external executable URL, or blob/external worker fails
closed before bind or is blocked by CSP. They also assert that only fixed generated
`200.html`/`404.html` are removed, no other HTML is accepted, and neither alias is packed or
served.
Server/package cases validate the closed server manifest, required CLI/Worker entries,
every tsdown chunk, clean staging/output setup, and a recursive exact-set comparison that
rejects one injected stale file or non-regular path in each output subtree. Separate
bootstrap faults corrupt each static/server manifest field and each listed-asset property;
instrumentation proves `bin.mjs` neither dynamically imports/evaluates `dist/cli.mjs` nor
binds until the package version, both complete manifests, and every listed asset validate.

Parser-limit tests cover every format, kill/replace behavior, a worker crash followed by a
successful file, and all-or-nothing recognition output. Exact-display tests place distinct
literal credentials and environment-variable references in source and metadata, set
different sentinel process values, and prove that source/comparison views preserve the
authored text exactly, introduce none of the sentinel values, expose no masking/reveal
control, and duplicate no customization source value in diagnostics or logs.

Diagnostic-limit tests cover code/source/file/argument deduplication, fixed phase/source/
path/rule/code/occurrence order, unused reserved slots without overflow, all four
`diagnostic-limit-*` sentinels, saturating suppressed counts, removal of references to
details dropped by an outer scope cap, and session overflow without active-generation
mutation. Multi-Source cases prove A/B entry-diagnostic pairs coexist, B success preserves A,
A success clears only A's pair, repeated A failure replaces only A's pair, and Global disable
removes only Global pairs. Repeated client-caused API errors never increase a retained diagnostic count.

## Manual accessibility review

After automated E2E passes, complete these checks in the built package:

1. Use only the keyboard to launch/follow the URL, filter, acknowledge the sensitive-content
   warning, open and close a file, select two files, compare, open Global consent,
   enable/disable Global, rescan, and return to inventory.
2. Confirm visible focus, logical focus order, skip/navigation landmarks, unique labels,
   status announcements, error/next-step association, and no focus loss on generation
   replacement.
3. Test light/dark and forced-colors modes, 200% zoom, narrow viewport reflow, reduced
   motion, screen-reader names for tools, file kinds, documentation status, applicability
   facts, the sensitive-content warning, and diagnostics,
   and Monaco's accessible diff viewer and inline narrow-screen layout.
4. Confirm color is never the only indicator of tool, state, severity, selection, or diff.
5. Record browser/OS/assistive-technology versions and any residual issue; a critical
   WCAG 2.2 AA defect blocks completion.

## Release package verification

```bash
pnpm outdated
pnpm run test:package
pnpm run test:docs
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
explicit positional/rest rejection, fixed bounded nonzero validation failures, awaited
completion, and root-only import boundary. They assert the exact minimal per-OS environment
allowlists stated above and prove
that `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`, inspected values, other environment values, and
extra argv cannot select or alter a command. Windows and other unsupported-platform fixtures
assert zero child processes plus the fixed manual-URL warning. Tests also prove that the OS
helper merely delegates to the default handler and cannot certify its version; the release
record uses the pinned Playwright revisions, and `--no-open` plus the printed URL is the
manual certified-browser fallback. `pnpm run test:docs` separately
validates all
repository English/Japanese document pairs without publishing the planning set. The same
tarball must install, launch, and pass the Node.js filesystem security suite across the full
declared Node.js 24/26 engine ranges on every supported OS. The six exact lower-bound
OS/architecture jobs are certification samples, while Node.js 24.18.0 is the development/
build baseline; neither set narrows the declared compatibility range.
Finally review the complete diff for untested branches, secret exposure, stale official-path
assumptions, accidental source mutation, and unrelated changes before release.

`pnpm run test:package` must install the newly packed tarball into an isolated fixture,
spawn `npx --no-install agent-customization-inspector --no-open`, observe a valid loopback
launch URL, assert that the launched CLI spawned no browser-helper child, and terminate the
process; inspecting the tarball or mapping alone is not a launch test.
