# Quickstart and Validation Guide

[日本語](quickstart.ja.md)

This guide is the end-to-end acceptance path for the implementation described by this
feature. Commands become runnable as the corresponding implementation tasks add the named
scripts and fixtures; this document does not claim that the current scaffold already has
them.

## Prerequisites

- Node.js 24.18.0 Active LTS (the package also supports the declared compatible Node 26+
  range)
- pnpm 11.13.0
- No additional compiler or platform-specific build workspace is required;
  inspected-source access is implemented by packaged Node.js modules
- A Playwright-supported Chromium installation created by the project setup command
- A local browser capable of reaching `127.0.0.1`

Confirm the toolchain:

```bash
node --version
pnpm --version
```

Expected: Node reports `v24.18.0` for the reference environment and pnpm reports
`11.13.0`. Do not substitute TypeScript 7 or Vite 8 until Nuxt/Vue compatibility recorded
in [research.md](research.md) changes.

## Install and prepare

```bash
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
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
- `bin.mjs` is executable, starts with the exact BOM-free, LF-terminated first line
  `#!/usr/bin/env node`, and imports `dist/cli.mjs`.
- `package.json.bin` is exactly `{ "agent-customization-inspector": "bin.mjs" }`, while
  `main`, `module`, and `exports` are absent.
- The static/server manifests, package version, and assets all validate before the local
  server binds.
- Before packing, recursive verification finds exactly the two manifests and every
  static/server file they list under `dist/`, with no stale, linked, non-regular,
  or unexpected path.
- All executable runtime product code in the package is JavaScript. Generated HTML shell,
  CSS, JSON manifests, and the required documentation/license files are permitted as
  declarative, non-executable artifacts. The manifest-authorized bootstrap embedded in the
  HTML remains JavaScript executable code and is covered by the CSP checks above.
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

- The CLI prints a URL such as `http://127.0.0.1:<port>/#cap=<random>` and never binds a
  non-loopback address.
- The Repository source root shown by the browser is the `all-supported` fixture itself.
- Within 1 second the UI shows scan progress or a meaningful status.
- The first complete inventory appears within the documented limits and contains no file
  outside the frozen path contract.
- Stopping the process destroys the session; restarting creates a different capability and
  no reveal state returns.
- Reloading after the fragment has been removed sends no API request and shows the exact
  instruction to reopen the process-lifetime URL printed in this terminal; no capability
  is stored in browser storage or a cookie.

For ordinary use, the equivalent launch contract is:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

If automatic browser opening fails, the printed local URL is sufficient. There is no
repository argument, ancestor-root discovery, remote-host flag, static-export command, or
MCP command in the initial release.

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
- Unit tests cover path classification, ordering, parser bounds, masks, diagnostics,
  state transitions, and deterministic projections.
- Contract tests cover every API status/security rule and every stable behavior, inspection-
  rule, composition-strategy, and official-source ID, including positive, one-rule
  near-miss, derived, relationship-only, excluded, multi-provenance, multi-tool, and Global
  cases.
- Integration/security tests prove source containment and zero customization-derived
  execution, child process, MCP connection, outbound request, dynamic evaluation, or
  source mutation.
- Package tests build a tarball, inspect its contents, install it into an isolated fixture,
  load the packaged Node.js filesystem service and fixed packaged parser Worker URL, and
  launch the exact `npx` entry without relying on the working tree or a runtime download.
- The performance fixture with 100,000 entries and 500 in-limit customization files shows
  status within 1 second and completes within 10 seconds on the recorded reference host.
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
   from Inspector matchers. Every Repository matcher has the exact `./` Base and a
   `./`-relative selector; bare `**/` is rejected. `./**/` is accepted only as explicit
   Inspector descendant inventory and never interpreted as proof that a vendor walks
   downward.
3. Static rules authorize only their exact root/recursive/direct-child grammar. A file
   admitted by static and derived rules is read once and retains both provenances, each
   with its own matched path, behavior/strategy/source evidence, scope/order, and
   applicability.
4. Surface fixtures keep GitHub Copilot VS Code, CLI, and cloud lookup behavior distinct.
   They prove that the VS Code workspace-root instruction is exact, while CLI standard-
   location and target-path traversal is represented as vendor behavior rather than an
   Inspector glob. Root-only and nested near misses demonstrate the difference.
5. Repository, documented User, and consented Global tables are validated independently.
   A documented User location never becomes Global read authority unless FR-015 through
   FR-018 name it, and runtime composition never merges the Inspector's Repository and
   Global source graphs.
6. Derived rules are one typed edge only: vendor-specific local marketplace syntax and
   catalog-root resolution, Codex ancestry-comparable fallback names, and skill-local
   `agents/openai.yaml`. A bounded-derived provenance, generic relationship, sibling Codex
   subtree, remote source, or arbitrary config/component path never seeds another read.
   An independent static provenance on the same physical file can seed its own typed rule,
   and two seed files declaring one target retain two provenance entries. Codex fixtures
   cover both plain-string and object `source.path` local marketplace forms. Seed-state
   fixtures prove known-satisfied output, unresolved conditional output, no output from a
   known unsatisfied/shadowed or bounded-derived seed, stable deduplication/first-128
   retention, and no target access for the 129th value. Pure path fixtures run on every OS
   for ADS colons, Windows-special characters and device names, trailing dot/space,
   case/Unicode-normalization mismatch, and 8.3 aliases; none reaches read authorization or
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
   `hooks/hooks.json` versus manifest override and instruction budgets at one byte before,
   exactly at, and one byte above both the default 32-KiB and project-declared cumulative
   UTF-8 caps, with the broad-to-narrow omitted provenance asserted.
12. Source-level incompleteness and product-versus-inspector symlink-divergence fixtures
   identify the tool, explaining non-candidate rule, affected candidate/relationship rules,
   and fixed reason code for every source-level fact; matching provenance/edge conditions
   project it without losing the canonical source fact.

## User story validation

### 1. Discover Repository customizations

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
```

Verify:

1. Repository source equals child-process `cwd` and no picker/ancestor root appears.
2. Source, tool, kind, and path filters work with keyboard and pointer input.
3. One physical `AGENTS.md`, `CLAUDE.md`, skill, `.mcp.json`, or marketplace can show
   multiple separate recognitions without duplicate file content.
4. Near-miss paths remain absent and an empty repository shows a successful supported-
   scope explanation.
5. The first snapshot has legal empty bootstrap generation 0. The automatic Repository
   scan commits generation 1 on success; a forced fatal first attempt leaves 0 active,
   exposes null failed progress, and reports only a bounded lifecycle diagnostic.

### 2. Inspect without activation

```bash
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm run test:security
```

Verify:

1. Hook commands, scripts, plugin components, URIs, markup, and MCP declarations appear as
   inert text/data and never execute, connect, load, or navigate.
2. All maintained secret values are masked in source, metadata, comparison, diagnostics,
   logs, and normal API responses.
3. Revealing one mask returns only that value; closing the file or rescanning immediately
   clears it.
4. Malformed, unreadable, stale, binary, oversized, cyclic, traversal, and boundary-
   crossing fixtures produce actionable safe diagnostics while unaffected files remain
   usable.
5. A 4,097th mask match or masked output above 2 MiB withholds the whole source/metadata,
   drops raw content, and cannot be compared or revealed. Parser timeout, worker-memory,
   depth, node, scalar, or metadata-entry overflow discards only that recognition's whole
   extraction result and never leaves a derived read authority.
6. Documentation status and applicability facts remain separate; conditional, conflicting,
   experimental, deprecated, disabled, omitted, shadowed, and unknown provenances/edges
   never become an invented “effective” result.

### 3. Compare two files

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
```

Verify:

1. Exactly two readable active-generation files can be selected from any source/tool.
2. Read-only Monaco source models contain masked text only, disable links/editing, and use
   opaque in-memory URIs rather than filesystem paths.
3. Monaco shows literal source differences without semantic ranking, merge, lint,
   validation, formatting, conversion, or fix suggestions. Recognition metadata remains
   distinguishable and is compared by typed fields in Vue rather than serialized as JSON;
   provenance paths/status/scope/order/applicability and relationship-edge applicability
   remain separate rows.
4. The 20,000-line-per-file cap or 5,000 ms Monaco computation timeout reports an
   actionable diagnostic without removing the complete read-only side-by-side masked
   source.
5. Rescan, removal, Global disable, or route close clears stale selections and reveals and
   disposes every associated editor/model instance.
6. Keyboard and screen-reader users can enter, navigate, and leave the source diff through
   labeled controls and the accessible diff viewer without a focus trap.
7. The packed app loads its editor worker from a same-origin static asset with no CSP
   violation, external request, or `blob:` worker.
8. Direct loads of `/`, `/compare`, `/global-consent`, and `/files/<fileId>` all boot from
   the same root-absolute assets. The CSP's exact Nuxt bootstrap hash succeeds while a
   modified/unrecorded inline script and executable attribute are blocked.

### 4. Opt in to Global inspection

```bash
pnpm exec playwright test tests/e2e/global-consent.spec.ts
```

The test harness supplies isolated fake tool homes; it must never inspect the developer's
real home directory. Verify:

1. No Global path is touched before consent; the preview is derived lexically without
   `stat`, `realpath`, enumeration, or file reads.
2. The consent view shows the exact Copilot, Claude, and Codex lexical roots, relative path
   patterns, input states, exclusions, and contract version `2026-07-15`.
3. After opt-in, only the documented instruction candidates appear under one separately
   identified Global source with per-tool boundaries.
4. Present-empty, relative, missing, unreadable, and otherwise invalid env overrides
   produce diagnostics without silently falling back; only an absent entry uses default.
5. A 32-KiB root and 192-KiB escaped display remain exact. The next byte produces
   `inputState: oversized`, `displayRoot: null`, and `global.previewTooLarge` with no
   displayed prefix, normalization, canonicalization, root creation, or authorization.
6. A stale, changed, or replayed preview ID/digest is rejected. A canonical root that
   differs from the displayed lexical path through a symlink, junction, case,
   normalization, or short-name alias is rejected before enumeration and is never silently
   substituted.
7. Disable is a priority barrier: it discards active uncommitted work, cancels queued
   Global work, commits removal as N+1, and requeues an interrupted Repository command once
   to commit at most N+2. Global files, raw bytes, diagnostics, comparisons, masks, and
   revealed values disappear; Repository content is carried unchanged but its IDs rekey.
8. Explicit Global rescan is accepted only while enabled, follows the same FIFO and
   dequeue-time generation rules as Repository rescan, and rekeys both source graphs on
   commit. Disabled/disabling and duplicate cases return the contracted conflicts. A fatal
   attempt keeps exact consent/boundaries and any prior graph, reports failed/null progress,
   and remains eligible for explicit rescan or disable.
9. A second disable while a barrier is queued/active joins the same completion and adds no
   generation. With no Global enabled flag, consent, nonempty graph, open capability, or
   scan/enable command, disable is a no-op even while unrelated Repository work is active.

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
| Relationships | 1,000 per file, direct depth 1 | Keep the first 1,000 in provenance/recognition/rule/kind/closed-origin/source-occurrence order; on the next distinct edge publish partial with a diagnostic; never follow them |
| Candidate provenances | 2,000 per recognition | Stop further admissions, publish partial, retain explicit diagnostic instead of a lossy aggregate |
| Derived targets | 128 distinct per static seed, provenance depth 1 | Keep the first 128 in derivation-rule/closed-field/source-occurrence order; on the 129th stop before target stat/read, publish partial, and offer a capped diagnostic candidate |
| Codex fallback names | 16 per config, 128 UTF-8 bytes each | Reject an extra or oversized value without authorizing its path |
| Mask matches | 4,096 per file | On the 4,097th, publish `masking-overflow`, withhold all source/metadata, drop raw content, and publish partial with a fixed diagnostic |
| Masked output | 2 MiB UTF-8 per file | Abort before allocation/output expansion and use the same fail-closed `masking-overflow` result |
| Parser structure | depth 64, 50,000 nodes, 64 KiB per scalar, 512 metadata entries per recognition | Discard that recognition's complete extraction result; retain already-masked source and unrelated successful recognitions |
| Parser time/isolation | 2,000 ms per recognition; at most two workers with 64/16/4 MiB old/young/stack limits | Terminate and replace the worker; publish partial with no relationships or derivations from the failed result |
| Source condition facts | 256 per source | Reject an invalid shipped registry before scanning; do not truncate known limitations |
| Assessment condition facts | 64 per provenance/relationship | Reject an invalid registry emitter; preserve distinct reason/basis facts for one key |
| Scan diagnostics | 128 per file, 5,000 per source, 10,000 per generation | Reserve each final slot for its fixed sentinel; deterministically suppress later distinct details and publish partial on overflow |
| Session lifecycle diagnostics | 1,024 outside committed generations | Keep at most 1,023 details plus a fixed session sentinel; include fatal uncommitted attempts, but do not retain client request errors or mutate the active generation |
| Global preview root input | 32 KiB UTF-8 | On the next byte return `oversized`/null before normalization or escaping |
| Global preview escaped display | 192 KiB UTF-8 | Stop before output expansion, return `oversized`/null, and expose no prefix |
| Request body | 64 KiB | Reject with `413` before JSON parsing |
| Scan wall time | 30 seconds | Abort and publish bounded partial result |
| Comparison lines | 20,000 per file | Skip Monaco diff highlighting; keep both complete masked source views |
| Comparison computation | 5,000 ms | Cancel Monaco diff; keep both complete masked source views |

The 10-second success criterion is a performance target, not the hard timeout. Every limit
test must assert deterministic ordering, no extra read after the stopping condition, and
no stale Monaco model after comparison fallback or teardown.

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

Public Node.js APIs do not provide a portable directory-handle-relative open. When
`O_NOFOLLOW` is unavailable or ineffective, the same lstat/realpath/open/fstat/post-check
sequence remains mandatory, but an active adversarial process replacing an ancestor or
final component between checks is outside the initial-release threat model. Ordinary
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
rejects one injected stale file or non-regular path in each output subtree.

Parser-limit tests cover every format, kill/replace behavior, a worker crash followed by a
successful file, and all-or-nothing recognition output. Mask-limit tests place a maintained
secret after the stopping point and prove that no prefix, suffix, metadata, raw value,
comparison model, reveal ID, diagnostic argument, or log entry exposes it.

Diagnostic-limit tests cover code/source/file/argument deduplication, fixed phase/source/
path/rule/code/occurrence order, unused reserved slots without overflow, all four
`diagnostic-limit-*` sentinels, saturating suppressed counts, removal of references to
details dropped by an outer scope cap, and session overflow without active-generation
mutation. Repeated client-caused API errors never increase a retained diagnostic count.

## Manual accessibility review

After automated E2E passes, complete these checks in the built package:

1. Use only the keyboard to launch/follow the URL, filter, open a file, reveal one value,
   close it, select two files, compare, open Global consent, enable/disable Global, rescan,
   and return to inventory.
2. Confirm visible focus, logical focus order, skip/navigation landmarks, unique labels,
   status announcements, error/next-step association, and no focus loss on generation
   replacement.
3. Test light/dark and forced-colors modes, 200% zoom, narrow viewport reflow, reduced
   motion, screen-reader names for tools, file kinds, documentation status, applicability
   facts, masks, and diagnostics,
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
files. Inspect the exact `bin` mapping and absence of `main`/`module`/`exports`, dependency
manifest, license notices, exact shebang/executable mode, strict static/server manifests,
absence of native addons, platform artifact selectors, and install/download scripts,
and the published README pair. Generated HTML shell, CSS, JSON manifests, documentation,
and license files are accepted as declarative, non-executable artifacts; any embedded
manifest-authorized bootstrap remains JavaScript executable code. These artifacts do not
weaken the JavaScript-only executable-code requirement. `pnpm run test:docs` separately validates all repository
English/Japanese document pairs without publishing the planning set. The same tarball must
install, launch, and pass the Node.js filesystem security suite on every supported OS in
the CI matrix. Finally review the complete diff
for untested branches, secret exposure, stale official-path assumptions, accidental source
mutation, and unrelated changes before release.

`pnpm run test:package` must install the newly packed tarball into an isolated fixture,
spawn `npx --no-install agent-customization-inspector --no-open`, observe a valid loopback
launch URL, and terminate the process; inspecting the tarball or mapping alone is not a
launch test.
