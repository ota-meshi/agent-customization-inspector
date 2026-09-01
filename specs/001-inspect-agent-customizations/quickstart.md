# Quickstart and Validation Guide

[日本語](quickstart.ja.md)

This guide is the end-to-end acceptance path for the implementation described by this
feature. Commands become runnable as the corresponding implementation tasks add the named
scripts and fixtures; this document does not claim that the current scaffold already has
them.

## Prerequisites

- Node.js satisfying the exact `package.json` compatibility contract
  `^24.11.0 || ^26.0.0` (`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`); the active
  LTS Node.js is the development/build baseline
- pnpm satisfying the repository `packageManager` declaration
- No additional compiler or platform-specific build workspace is required;
  inspected-source access is implemented by packaged Node.js modules
- The exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 through
  the project setup command; these pinned revisions are the reproducible automated browser-
  certification baseline, not an exhaustive list of browsers a user may run
- A browser capable of reaching `localhost`; for release evidence, use one of those certified
  revisions, including when the OS default handler selects some other browser

Confirm the toolchain:

```bash
node --version
pnpm --version
```

Expected: both commands satisfy the checked-in package declarations. Do not change major
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
- The build first removes only the root-resolved package-owned `.output/` and
  `dist/` trees (`scripts/clean-build-output.mjs`). `nuxt build` then emits root-absolute
  same-origin static assets directly into `dist/public` (`nitro.output.publicDir`). There
  is no post-build validator and no generated asset manifest: the emitted tree is owned by
  the pipeline tools that produce it, and the devframe host serves it unchanged at
  runtime.
- tsdown emits the named `cli.mjs` entry, the bundled server modules including the
  inspection module, and any code-split chunks with fixed ESM extensions directly into
  `dist/`. There is no staging copy step and no server-side manifest.
- The packaged `dist/cli.mjs` starts with the exact BOM-free, LF-terminated first line
  `#!/usr/bin/env node` preserved by tsdown from the `src/server/cli.ts` entry; the package
  manager makes the linked bin executable at install time. Node.js compatibility is
  declared only through the packed `engines.node` range and enforced by the package
  manager's engines mechanism; the CLI re-checks neither the declared string nor the
  running version, and the package tests assert the packed exact string.
- `package.json.bin` is exactly `{ "agent-customization-inspector": "dist/cli.mjs" }`,
  while `main`, `module`, and `exports` are absent.
- Before packing, `pnpm run verify:package` — a CI and release gate, not part of every
  local build — asserts that exactly the two packaged entry points exist as regular
  files: `dist/public/index.html` (the SPA shell served by the devframe host) and
  `dist/cli.mjs` (the `package.json.bin`
  target). It re-verifies nothing else: the remaining `dist` contents are
  Nuxt/tsdown build output, and re-enumerating sibling artifacts the same pipeline just
  produced would be redundant policy. A missing or non-regular entry fails the gate before
  publish. The locked production dependencies are asserted directly from `pnpm-lock.yaml`
  by the package tests. These checks do not validate customization-file content.
- All project-authored application code and executable code in every project/dependency
  tarball payload is JavaScript, with two limited recorded exceptions. Package-
  manager-generated `.bin` symlinks and `.cmd`/`.ps1` launch shims exist outside those
  payloads: each maps one exact
  declared `package.json.bin` target to audited Node JavaScript, forwards argv only, and
  adds no input or application logic. The `open` package's vendored POSIX-shell
  `xdg-open` is the one in-payload exception (spec.md FR-038): on a Linux host the
  package's own selection policy uses that vendored copy whenever it is executable and
  falls back to the system `xdg-open` otherwise. The generated HTML shell, CSS, JSON files, and required
  documentation/license files are declarative, non-executable artifacts. The direct production dependencies are exactly the eleven
  packages `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml`; devframe's and `open`'s transitive trees are owned by those packages
  and the lockfile.
- Build output contains no fixture, raw customization text, Global content, cache, or
  source-map path that exposes an inspected machine.

## Run the local inspector manually

From a fresh checkout, one script builds and launches:

```bash
pnpm run build-and-start
```

`start` launches without building, for when `dist/` is already current:

```bash
pnpm start
```

Both run the packaged `dist/cli.mjs` — the exact `package.json.bin` entry an installed user
gets — so a local launch exercises the shipped path rather than a development-only one.
`start` deliberately does not build: rebuilding under it would hide which `dist/` is
running, which is the one thing a launch check needs to be sure of. Pass options without a
`--` separator, because pnpm forwards that separator to the command, where the strict
rest-argument rejection refuses it:

```bash
pnpm start --no-open --root /path/to/repository
```

Read the printed URL rather than assuming a port. devframe selects another local port when
its default is already bound, so a stale inspector left running would otherwise take the
connection.

`--port <number>` states a preferred port instead of devframe's default, and `--port 0`
asks for a free one to be selected automatically. The preference is resolved the same way
the default is — an occupied port still moves to another — so the printed URL remains the
only place the bound port is stated. Use `--port 0` for any launch that must not take a
port someone is holding for their own use; the suites launch that way for the same reason
(AGENTS.md § Agent-started process policy).

`--inspect-personal-setup` also inspects the documented customization files in the four
member roots — the tools' own configuration directories and the shared agent home — the
same read the consent page's checkbox authorizes, stated
in the command instead. The flag _is_ the confirmation: the CLI captures the preview from
the three environment properties and the always-derived shared agent home, confirms it as
captured, and waits for the read to
commit, so the printed URL appears with the Global Source already on the inventory. What
each tool ended as, and what stays excluded, is on the consent page as it always is;
without the flag a launch reads nothing outside the selected repository, and the page
offers to work the directories out.

```bash
pnpm start --no-open --inspect-personal-setup
```

To exercise the inspector against a deterministic fixture repository — the exact trees
the suites assert against, written by the builders in
`tests/fixtures/repositories/build-fixtures.ts` — one script rebuilds the named fixture
under the git-ignored `.tmp/fixtures/` tree and serves it with the same packaged CLI:

```bash
pnpm run start:fixture all-instructions --no-open
```

The first argument names the fixture (omitted, it is `all`, which builds every `all-*`
tree into one root so one launch serves all three inventories; an unknown name lists
the available ones), and everything after it is passed to the CLI verbatim. The name
stays optional in front of the CLI's own options: an argument opening with `-` is one of
those options, so `pnpm run start:fixture --inspect-personal-setup` serves the default
tree with that option rather than looking for a fixture named after it. Each launch
replaces that fixture's previous tree, so edits made while browsing never leak into the
next one, and the tree stays on disk afterwards for inspection. The launcher selects the
root with `--root`; to exercise the invocation-`cwd` selection instead, change into a
tree a launch left behind and start the CLI from there:

```bash
cd .tmp/fixtures/all-instructions
node ../../../dist/cli.mjs --no-open
```

The CLI captures the invocation `process.cwd()` once. Omission uses that exact string.
`--root` is accepted, a repeated option resolving to the parser's last value: an absolute option is kept as given, and a relative
option is resolved against the captured invocation directory. An explicit empty value exits
with fixed actionable, source-value-free output before a session or browser attempt. A
missing value is rejected at the same boundary by Gunshi's typed argument validation.
Selection never calls `process.chdir()`, and a startup failure ends the launch with an
actionable message rather than a session or session-API error.

Expected:

- The host prints the local `http://localhost:<port>/` origin exactly once before
  any browser attempt and never binds a non-loopback address. The printed URL is the plain origin: it
  carries no per-session token, fragment, or other secret. With `--no-open` — the CLI's
  negatable product flag — no browser opens and no browser-helper child process is created.
- The Repository source root shown by the browser is the launched fixture tree itself.
- Within 1 second the UI visibly renders and exposes to assistive technology a status for the
  current scan request that says queued, names an active phase, or reports complete, partial,
  or failed (with a practical next step for failure), and the Source/progress identifies that
  request's opaque `scanRequestId`. A generic spinner/loading label,
  unchanged control, acknowledgement without scan state, or earlier-scan status does not count.
- The first complete inventory appears without any file outside the frozen path contract.
- Stopping the process destroys the server session. On a loaded page, devframe reports loss
  of the loopback host through its transport without being queried. A transport-reported channel loss —
  or a protocol the client cannot speak — purges the DTO, DOM source value, editor
  model/worker, and comparison state from every state owner and rendered surface before
  the session-ended view, and revokes settlement authority so a response a still-pending
  request captured settles as a no-op (data-model.md § BrowserState). An ordinary rejection of the
  current session RPC, from a handler or from delivery, is that request's error alone: the
  committed snapshot stays on screen and another refresh can still succeed
  (contracts/http-api.md § Concurrency and lifecycle). The SPA issues no liveness RPC, installs
  no visibility, unload, or other page-lifecycle listener, does not purge merely because the
  page becomes hidden, and does not refetch when it returns to visibility. It defines no
  polling interval, request timeout, retry timer, memory lease, or wall-clock process-loss
  guarantee for a continuously idle page. Restarting—even with port reuse—has a different
  `sessionId`, and neither a response captured before the purge nor one with a mismatched
  session identity restores previously displayed state.
- The session is unauthenticated behind the loopback bind: the product adds no
  per-session token,
  Origin or Host check, or hand-written router, and no session identity, credential, or
  inspected value is stored in browser storage or a cookie — the only stored values are
  the two FR-044 presentation preferences (colour scheme and open target), which hold no
  inspected value. The documented residual limitation is that other local processes and, via
  DNS rebinding, a malicious web page can reach the session while the inspector runs.

For ordinary use, the equivalent launch contract is:

```bash
cd /path/to/intended/repository-root
npx agent-customization-inspector
```

Port and host resolution and the printed origin are owned by
the devframe local-tool framework that hosts the session: devframe serves the built SPA
from `dist/public` and exposes the session API as its RPC channel. Automatic browser
opening is product-owned through the startup opener: after the launch line, on macOS the
host first tries to focus a session tab a running Chromium-family browser already has —
the fixed process-list probe and the fixed tab-reuse script through the OS `osascript`
automation host — and otherwise spawns `open`'s fixed OS helper with the printed origin,
with devframe's bundled opener disabled so only the product's opener runs. That fixed
startup opening and the reader's own explicit open-in-editor request are the product-initiated child-process surfaces permitted in the
initial release. The startup opener's processes receive only fixed arguments and the
printed origin. The open-in-editor request passes exactly one more value: the absolute
path of the one committed file the reader asked to open — that is the feature — and
never authored content or a user-supplied command. Every spawned process inherits the
launch environment unchanged, into which the product writes no inspection-derived
value; a platform helper honoring the user's own `$BROWSER` applies user preference. The CLI's negatable `--open` flag (default true)
provides `--no-open` suppression. A missing or failing opener leaves the
server running: the already printed local origin is the FR-001 fallback. Apart from the
optional single `--root`, there is no repository picker/ancestor-root discovery,
remote-host flag, static-export command, or MCP command in the initial release.

Failures are reported ordinarily. A startup problem ends the launch with an actionable
message, and a failed session-API request returns its real error over the devframe
channel while the session stays usable and the last committed snapshot remains visible.
There is no separate operational-event log, closed error-code taxonomy, or generic error
envelope: terminal and UI output are read by the same user who owns the inspected files.

Automatic opening merely delegates the printed origin to the operating system's default
browser; the helper neither selects nor verifies a browser version, and a successful open is
not compatibility evidence.
For deterministic certification, use `--no-open` and paste the printed URL into one of the
three pinned Playwright revisions. Reaching the inspector through the printed URL is what the
first-use evaluation does as well: it is part of the guidance a session is given, so it never
pauses or restarts the two-minute timer, and it is not by itself an unsuccessful SC-001
result. Inability or interruption that prevents completion is.

## Automated quality gates

Run every gate before considering an implementation change complete:

```bash
pnpm run build
pnpm run verify:package
pnpm run format:check
pnpm run lint
pnpm run typecheck
pnpm run test:unit
pnpm run test:contract
pnpm run test:integration
pnpm run test:security
pnpm run test:package
pnpm run test:docs
pnpm run test:performance
pnpm run test:coverage
pnpm run test:e2e
```

Expected:

- The build completes. Code formatting is Prettier's (`pnpm run format` rewrites,
  `format:check` gates); line endings are normalized by `.gitattributes` and editor
  conventions come from `.editorconfig`.
- Lint and type checking complete without ignored failures.
- Unit tests cover path classification, ordering, parser failure isolation, exact authored-value
  presentation, environment-reference non-resolution, diagnostics, state transitions, and
  deterministic projections.
- Contract tests cover every session-API status rule and every stable behavior, inspection-
  rule, composition-strategy, and official-source ID, including positive, one-rule
  near-miss, derived, relationship-only, excluded, multi-provenance, multi-tool, and Global
  cases. They also prove every returned relationship kind is present in
  the maintained closed presentation allowlist for its supported `(tool, kind)` and is an
  exact occurrence recognized by that admission's source-form extractor; one source form's
  kinds never become eligible in another by tuple membership alone. A skill's declarations
  pass no such gate — they are the keys its file wrote — while a reference the allowlist
  does not name remains available only in complete source text. Before these tests or their
  implementation begin, the Presentation Allowlist sections in all three vendor-contract
  language pairs must already enumerate every supported `(tool, kind)` and admitted source
  form. This gate verifies the approved rows and bilingual digest only; it must not author
  or semantically edit them. Any membership/source-form/extractor/relationship change stops
  work, synchronizes design artifacts, and reruns plan/task generation.
- Integration/security tests use recorded local fixture roots and instrument all product
  network/URL/MCP surfaces. They separately classify and validate the two exact FR-022
  authorized internal loopback classes at the issued `localhost` authority—static/SPA
  `GET`/`HEAD` for the packaged UI assets and the local session API channel, both
  unauthenticated behind the loopback-only devframe bind—and
  prove zero customization-derived execution, child process, MCP connection, prohibited direct
  product-issued outbound request as defined by FR-022, dynamic evaluation, or source mutation. Explicit
  UNC/server-share/device vectors prove zero filesystem/DNS/SMB calls. A lexically
  indistinguishable pre-mounted/mapped network source may cause OS-mediated traffic and is
  recorded separately as the FR-022 platform/environment limitation. The product-owned
  startup browser opening — on macOS the fixed tab-reuse attempt in front of the `open`
  package's helper — passes its child processes only fixed arguments and the printed
  origin — no inspection-derived content/path, authored value, or user-supplied
  command — and every spawned process inherits the launch environment, into which the
  product writes no inspection-derived value.
  There are no host-security or HTTP-router contract suites to run: protection is the
  loopback-only `localhost` bind alone — no per-session token, Origin check, or product
  router exists — and an unexpected session-API failure propagates its real error to the requesting
  client while the session stays usable.
- At the Phase 3 checkpoint, package tests launch `dist/cli.mjs` from an unrelated working
  directory and verify the packaged shell, closed manifest fields, printed-URL fallback,
  unchanged inspected fixture, and graceful shutdown. This is packaged-path isolation only:
  the current gate neither installs a tarball nor invokes an installed package link. T917 owns
  the final-release test that packs and installs into an isolated fixture and launches
  `npx --no-install` without relying on the working tree or a runtime download.
  The production-graph tests assert exactly the eleven approved direct dependencies
  `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml` — their resolved versions
  and integrity hashes stay owned by the committed
  `pnpm-lock.yaml` — and negative packaging fixtures prove that a missing or non-regular
  required entry point fails `verify:package` before publish.
- Documentation tests read this repository's own artifacts and prove they agree: every
  `pnpm run` command either quickstart names is a script `package.json` declares, every CI job
  they declare exists in `.github/workflows/ci.yml` in the order given, the Normative
  Requirement Traceability matrix carries every FR/QR/SC row and names every declared task ID,
  and each task's English and Japanese entries carry the same normative identifiers and the same
  owned file paths. A path a task quotes that resolves to nothing here is a content literal —
  an inspected location, a package name, a glob shape — and is read as one.
- The performance suite runs one non-gating smoke pass against the packaged CLI (build it
  first) over the unchanged, manifest-bound 100,000-entry/500-file fixture: a fresh process
  whose automatic scan settles outside the pass, one explicit rescan on the rendered page, and
  its own admission's request ID on the status and the committed generation. The fixture and
  manifest digests are recomputed around it, so a builder change or a stray file invalidates
  the pass rather than quietly measuring a different repository. No timing threshold is
  asserted: the same figures on another machine measure that machine.
- Browser, contract, and manual evidence cover all four user stories and satisfy every
  Applicable row and Not-applicable recheck in the
  [55-row SC-008 matrix](contracts/accessibility-acceptance.md); an axe severity result alone
  is not a pass.

## Contract-registry validation

```bash
pnpm exec vitest run --project contract tests/contract/vendor-behaviors
pnpm exec vitest run --project contract tests/contract/runtime-composition
pnpm exec vitest run --project contract tests/contract/inspection-rules
```

The tests above are offline. A maintainer runs `pnpm run check:official-sources -- --network`
explicitly
when reviewing upstream drift; it is the only source check allowed to use the network.

Verify:

1. Every shipped `behaviorId`, `ruleId`, and `strategyId` occurs in exactly one owning
   bilingual contract and its matching immutable registry. Every cross-reference resolves,
   and every citation in a record's `evidence` array is reciprocal with the official-sources
   contract row it cites; offline tests recompute its semantic fingerprint. The explicit
   drift check enforces official HTTPS hosts plus exact section selection and normalization.
   Recoverable network or execution-environment failures fail closed without auto-updating
   a behavior, rule, strategy, or checked-in digest; no product-specific numeric fetch cap is
   part of the contract.
2. Vendor lookup bases, relative selectors, and traversal modes are validated independently
   from Inspector matchers. Every Repository selector is authored directly as a typed
   segment-array program — literal, regex, and non-adjacent recursive-directory segments,
   with no glob-looking string form — and the registry contract gate rejects
   unknown/misplaced tokens and adjacent recursive tokens. Fixtures cover
   descendant-plus-direct-child and descendant-plus-recursive-subtree composites. Build
   validation compiles the authored programs into immutable,
   versioned `TraversalPlan` data, and runtime tests prove that the inspection module
   interprets only that data rather than reparsing selector text or substituting a generic
   walker. A Global exact-file plan never opens the tool-home root and touches only its
   fixed ancestor/target chain; a fixed-instruction-subtree plan opens only that named
   subtree and permitted descendants. Every adjacent Global setting, credential, state,
   plugin, and other neighboring path receives zero `opendir`, `lstat`, `realpath`, open,
   or read calls. The closed Codex Global plan probes `AGENTS.override.md` first, performs
   zero operations on `AGENTS.md` after a read non-empty override, advances only
   after an absent or empty override, and publishes at most one non-empty file. Empty is exact
   post-BOM `decodedText.trim().length === 0`; `utf-8-replaced` is ordinary text and every
   `U+FFFD` is non-whitespace. Apply absent, empty, BOM-only, whitespace-only, non-empty,
   replacement-decoded, binary, symlinked, and unreadable fixtures independently to both
   targets. An absent target selects fallback, and a present symlinked override is read
   transparently through its target like any other file; an unreadable override —
   including a broken symbolic link — or a binary override ends selection with its
   per-file diagnostic (`file-unreadable` or `file-content-binary`) instead of falling
   back. These fixtures
   pin the content rule, short-circuit behavior, and zero operations on an unselected target.
3. Static rules authorize only their exact typed literal/regex/recursive-directory
   programs and traversal boundaries, never a text glob evaluated at runtime. A file
   admitted by static and derived rules remains one inventory file retaining both
   provenances, each with its own matched path. A provenance says which rule authorized the
   read and where it matched; where the customization would apply, in what order, and under
   which conditions are projections no surface makes, so no DTO carries one.
4. Surface fixtures keep GitHub Copilot VS Code, CLI, and cloud lookup behavior distinct.
   They prove that the VS Code workspace-root instruction is exact, while CLI standard-
   location and target-path traversal is represented as vendor behavior rather than an
   Inspector glob. Root-only and nested near misses demonstrate the difference. For MCP,
   they additionally require exact VS Code 1.118+ root `.mcp.json` provenance alongside
   `.vscode/mcp.json`, one inventory file and one Copilot/MCP recognition when the CLI rule
   also matches the root file, reciprocal evidence for the release note and current guide,
   `documentationStatus: conflict`, no VS Code-owned root-schema fields, and unknown
   same-name ordering across root, `.vscode`, User, agent, and plugin inputs. A nested
   `.mcp.json` remains CLI-only; the product never infers a VS Code schema or winner.
5. Repository, documented User, and consented Global tables are validated independently.
   A documented User location never becomes Global read authority unless FR-015 through
   FR-018 name it, and runtime composition never merges the Inspector's Repository and
   Global source graphs.
6. The shipped `bounded-derived-candidate` rule is exactly one, expanded by its own
   vendor's configuration-read stage and none by a runtime extension point:
   `codex.derived.fallback-basename`. Three kinds of file are deliberately not among them:
   a skill's sibling `agents/openai.yaml`, published through the owning skill's bounded
   companion census, and the files of a plugin root, enumerated because the root is a
   directory-shaped customization the admitting rule named — none is a candidate, so none
   is a derivation
   (contracts/vendors/openai-codex.md § Derived Repository rules,
   contracts/vendors/claude-code.md § Repository vendor behavior). Each is one typed
   edge with an exact seed path or seed rule/kind, closed declaration syntax, and fixed base/
   placement/suffix; callbacks, arbitrary joins, expressions, globs,
   and recursive derivation are unrepresentable. The program defines no numeric target,
   declaration, name, or ancestry ceiling; available capacity comes from Node.js and the
   execution environment. A bounded-derived
   provenance, generic
   relationship, sibling Codex subtree, remote source, or arbitrary config/component path
   never seeds another read. An independent static provenance on the same file can
   seed its own typed rule. Every derived admission names its derived rule, and two
   readers' declarations never collapse even when they resolve to one target: the path
   keeps both admissions. Codex fixtures
   cover both plain-string and object `source.path` local marketplace forms. Seed-state
   fixtures prove known-satisfied output, unresolved conditional output, no output from a
   known unsatisfied/shadowed or bounded-derived seed, and stable deduplication without a
   product-defined retention count. Pure path fixtures run on every OS
   for ADS colons, Windows-special characters and device names, trailing dot/space,
   and 8.3 aliases; each is rejected lexically with its reference diagnostic and is never
   read.
7. Every directly referenced behavior, rule, and strategy carries its own maintenance
   record; `documentationStatus` accepts only `documented`,
   `partially-documented`, `unknown`, or `conflict`, while duplicate-free
   `lifecycleQualifiers` use fixed `preview`, `experimental`, `deprecated` order. Empty
   qualifiers make no lifecycle claim and never mean `stable`. Fixtures reject
   `documentation-conflict` in that enum, duplicate/out-of-order qualifiers, and a missing
   or duplicate subject. No response serializes any of them, and no applicability or
   condition projection exists for a fixture to cover: what a product would do with a file
   is runtime the host never observes (FR-009).
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
12. Symlinked-skill fixtures prove the
    Inspector follows skill symlinks exactly as Claude Code does and inspects the linked
    target content, so no product-versus-inspector divergence fact exists. There is no
    source-level condition projection for a fixture to cover: what a vendor documents about
    its own conditions stays in that vendor's maintained contract, and nothing projects it
    onto a recognition, provenance, or detail (FR-009).

## User story validation

### 1. Discover Repository customizations

```bash
pnpm exec playwright test tests/e2e/discovery.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-inventory.spec.ts
```

Verify:

1. With no option, Repository Source equals the exact captured child-process
   `process.cwd()`. With relative/absolute `--root`, it equals the selected root;
   the process working directory is unchanged and no picker/ancestor search appears.
2. Source, tool, kind, and Source-relative Path filters work with keyboard and pointer
   input; every inventory-file or safely normalized target path is relative to its owning
   Source's one root and no cross-Source path namespace is implied. Escaped enabled-Source
   and consent-preview root labels remain presentation-only, are not Source-relative Paths,
   and grant no read authority.
3. One physical `AGENTS.md`, `CLAUDE.md`, skill, `.mcp.json`, or marketplace remains one
   file without duplicate content and has exactly one internal recognition for each
   `(file, tool, kind)`; compatible admissions merge as provenances of that record, and no
   session response carries the record itself. Each inventory definition exposes only
   `not-attempted | parsed | failed`; a file carries no
   parse rollup, because the definition's own state is the parse fact and a
   file-level aggregate had no reader.
4. Near-miss paths remain absent and an empty repository shows a successful supported-
   scope explanation.
5. The first snapshot has bootstrap Repository generation 0 with exactly one stable-ID idle
   Repository Source, its escaped selected-root label, zero inspected-source
   I/O/files/diagnostics, and a null `globalGeneration`. The automatic scan commits
   Repository generation 1 on success. A missing or
   unreadable selected root fails that scan with a source-scoped `root-unreadable`
   diagnostic while the session and its controls stay usable; the failed attempt publishes
   no partial inventory and leaves Repository generation 0.
6. Each automatic or explicit scan has one opaque `scanRequestId`. An explicit Repository
   rescan admission response, its Source/progress through waiting, active, complete, partial,
   or failed state, and any generation it commits all preserve that ID; a prior status or
   inventory cannot satisfy the new command.

### 2. Inspect without activation

```bash
pnpm exec playwright test tests/e2e/boot.spec.ts
pnpm exec playwright test tests/e2e/inspection-safety.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-detail.spec.ts
pnpm exec vitest run --project unit \
  tests/unit/app/api-client.test.ts \
  tests/unit/app/session-view-state.test.ts \
  tests/unit/app/client-data.test.ts
pnpm run test:security
```

Verify:

1. Hook commands, scripts, plugin components, URIs, markup, and MCP declarations appear as
   inert text/data and never execute, connect, load, or navigate.
2. A detail or comparison surface shows the file exactly as written, with no notice about
   what it may contain and no confirmation step in front of it: nothing stands between the
   reader and the content — no acknowledgement, no gate, no standing caveat — because
   neither guards anything a loopback-bound session over the viewer's own files does not
   already. Moving between a skill's own tabs is navigation, not a gate.
   Every maintained literal credential appears exactly as authored in source and comparison
   views, and every displayed metadata value is the one its parser resolved for that field;
   no mask or reveal control exists. A key declared twice resolves to its later declaration,
   so there is one value per field and structural metadata comparison matches
   `(kind, declared key)`, with tool recognition compared per tool beside the
   declarations. Boundary-sized TOML integers,
   floats, and date/time values retain their typed canonical semantic payload without
   JavaScript precision loss while their authored spellings remain unchanged. No
   acknowledgement API, field, or client state exists, and none is needed: the session API is
   reachable only through the loopback-bound local host, which is the whole boundary.
   Authored content is reachable only one file or comparison at a time and is dropped by the
   central full-session client-data purge; scoped route, selection, file/Source, Global, and
   generation cleanup dispose only their own models.
3. Environment-variable references remain literal text even when sentinel process values
   are set; no referenced process-environment value appears in any displayed content.
4. Session Diagnostics contain only their documented closed fields. A failed session-API
   request returns its real error message to the browser — there is no generic error
   envelope or closed operational-event schema — and that message is shown to the user
   while the session stays usable.
5. Malformed, binary, unreadable, broken-symlink, disappeared-before-read, cyclic, and
   traversal fixtures produce actionable safe per-file Diagnostics
   (`recognition-parse-failed`, `file-content-binary`, and `file-unreadable`)
   while every unaffected file stays discoverable and
   viewable through a `partial` commit after complete traversal. A symlinked customization
   file is instead read transparently and its linked content is inspected; only a link
   whose target is missing or unreadable yields `file-unreadable`. A failure not confined to
   one file publishes no result/generation, retains any prior snapshot, and reports the
   failure as an ordinary error with its real message; a startup failure
   ends the launch with an actionable message. File size and collection counts never produce a
   valid/invalid, correctness, compliance, or lint verdict.
6. Any NUL byte yields a textless `binary` item — for an admitted candidate that is
   diagnostic-only (`file-content-binary`) and an otherwise publishable `partial`
   generation; a census-listed companion's binary bytes are the ordinary fact of an
   asset. Otherwise decode exactly once with
   UTF-8 replacement semantics, record/remove one leading BOM, label any replacement result
   `utf-8-replaced`, and preserve every `U+FFFD` through parser, source, and comparison. That
   garbled readable text is complete by itself; no alternate decoder runs and it does not
   make the scan partial. A parser or extractor failure discards only that recognition's
   whole result with its `recognition-parse-failed` diagnostic and retains the complete
   authored source and comparison eligibility. Every declared value is the one its parser
   resolved; astral characters and combining sequences survive extraction
   and JSON transport whole. No entry and no response carries source coordinates,
   because nothing points into a document. A document an extractor cannot parse fails that
   recognition all-or-nothing. An authored relationship uses the exact target token slice,
   while `normalizedTarget` and derivation use only the separately decoded value; neither
   normalized value is substituted for authored display. The
   conditional Codex default `hooks/hooks.json` relation instead has
   `targetOrigin: documented-default` and null `authoredTarget`, while an explicit hook
   field is `authored` and replaces the default.
7. Documentation completeness stays a maintenance record on the registry, using only
   `documented`, `partially-documented`, `unknown`, or `conflict`, while upstream lifecycle
   uses the distinct ordered `preview`, `experimental`, `deprecated` qualifier array. An
   empty qualifier array means no lifecycle claim, never `stable`. No response or surface
   carries either, so conditionality, disablement, omission, shadowing, and unknown inputs
   can never become an invented “effective” result.
8. Inventory, Detail, Comparison, Global controls, Diagnostics, API
   responses, CLI text, and documentation remain within syntactic parsing, reading the
   value a parser resolves for a declaration the recognized kind publishes, frozen-catalog
   classification,
   and documented structural scope/order/condition/selection/reference projection. They do
   not interpret or rank natural-language meaning or intent, decide correctness, validity,
   compliance, effectiveness, or quality, or offer policy/remediation advice, validation,
   lint, synchronization, conversion, formatting, or fixing.

### 3. Compare two files

```bash
pnpm exec playwright test tests/e2e/comparison.spec.ts
pnpm exec playwright test tests/e2e/repository-complete-comparison.spec.ts
```

Verify:

1. In the Repository comparison flow, a skill name with two or more readable entry files
   offers one comparison entry on its row and detail page; the comparison's switchers
   step the pair through corresponding files and copies, offering every file at least one
   current copy ships readably. A file only one copy ships shows its present side against
   a stated absence; a counterpart that exists without readable source text — binary
   among them — is not an absence, and selecting that pair reports the named not-readable
   outcome instead. A file readable in neither copy is never offered. Cross-Source
   comparison is verified only after Global enablement in the next workflow.
2. Read-only Monaco source models contain the complete authored text without masking or
   environment substitution, disable links/editing, and use opaque in-memory URIs rather
   than filesystem paths.
3. Monaco shows literal source differences without semantic ranking, merge, lint,
   validation, formatting, conversion, or fix suggestions. Declared metadata is compared as
   one canonical serialized document per side, diffed in Monaco beside the typed recognition
   rows each surface renders in Vue: the serialization is FR-012's stated presentation of the
   parse — the one spelling two sides written in different syntaxes can both be read in — not
   a conversion of either file.
4. Monaco and browser capacity comes from the browser engine and execution environment.
   A recoverable editor computation failure reports an actionable diagnostic without
   removing the complete read-only side-by-side authored source.
5. Rescan, removal, Global disable, or route close clears stale selections and displayed
   detail state and disposes every associated editor/model instance.
6. Keyboard and screen-reader users can enter, navigate, and leave the source diff through
   labeled controls and the accessible diff viewer without a focus trap.
7. The packed app loads its editor worker from a same-origin static asset with no
   external request or `blob:` worker.
8. Direct loads of `/`, `/global-consent`, every kind's `compare`-led comparison route
   (`/skills/compare/<family>`, `/instructions/compare/<family>`, `/mcp/compare/<family>`,
   `/prompts-and-commands/compare/<family>`, `/agents/compare/<family>`,
   `/plugins/compare/<family>`, `/hooks/compare/<family>`), and every kind's detail route
   all boot from the same root-absolute assets served by the devframe host.
9. Session-loss and response-guard tests cover a devframe-transport-reported channel loss,
   channel loss or unsupported protocol on the current non-superseded RPC, session-ID mismatch,
   greater Global content epoch or non-null disable fence, and a late in-flight response after
   the client epoch changes. A transport-reported channel loss or unsupported protocol on the current RPC performs
   the shared full client-data purge and enters the session-ended view, while an ordinary
   request rejection stays that request's error; every state owner and rendered surface
   drops its pre-purge inventory, detail, comparison, editor, and authored-content
   DTO/DOM state, none of it is automatically restored, and a late settlement is a no-op
   rather than a repopulation (data-model.md § BrowserState). The SPA calls no liveness function, installs no visibility,
   unload, or other page-lifecycle listener, and issues no request because time elapsed, the
   page became hidden, or it returned to visibility. Devframe owns the event-driven host-loss
   signal, and the product sets no wall-clock process-loss deadline for a continuously idle
   page. Before rendering an ordinary inspection-data response, the client treats a greater
   epoch or non-null disable projection as a full client-data purge trigger and enters
   control-only recovery; an older epoch is rejected, and only an equal epoch with a null
   projection may confirm the current baseline. Deterministic
   delivery pauses hold an already-linearized SessionSnapshot or FileDetail while a scan
   commit advances the owning sequence's generation or a
   Global-disable acceptance changes the epoch, proving that envelope and
   payload never mix and that every inspection-data success rechecks an unchanged epoch plus
   a null fence at final publication. They verify the SPA's monotonic `clientDataEpoch`,
   per-sequence generations (`repositoryGeneration` and nullable `globalGeneration`), and
   latest request token: an older-generation or superseded-token/
   epoch response cannot repopulate state; adopting a newer generation of a sequence first
   advances the
   client epoch and aborts/disposes that sequence's old requests and generation-owned
   state while the other sequence's committed views stay valid. A file detail is
   adopted only when its captured `(clientDataEpoch, sourceRelativePath)` still matches
   the live epoch and the selected file; the path is the file's stable identity, so the
   host resolves it against whatever generation is current.
10. Global disable retains its distinct recovery path: the SPA performs a central full
    client-data purge before sending the disable request, and a greater epoch or non-null
    fence observed in any response causes another purge before rendering. Recovery
    then fetches a fresh session over the loopback session API. It adopts
    the returned `sessionId` without retaining or comparing the
    purged ID and constructs only client-side `RecoveryViewState`. With a non-null disable
    fence, the session route returns the exact control-only `GlobalFenceRecoverySnapshot`;
    with a null fence it returns a normal full `SessionSnapshot`, but recovery adopts only
    `globalContentEpoch`, Global control and enable/disable projections, each failed tool's
    `failureCode` on its own control, the retained failure errors, and any newly verified
    frozen preview, and discards the inspection graph. It restores no inventory, Source, file, generation, detail, comparison, editor,
    authored source, selection, or filter. Disable/join/wait, retry-disable,
    or an eligible Global retry is available from that state as applicable. The explicit
    Resume inspection action appears only when `globalDisableInProgress` is null; it
    re-fetches the matching session and atomically constructs a fresh inventory summary with
    default filters. A later detail/comparison request fetches it again from the fresh
    session.

### 4. Opt in to Global inspection

The whole opt-in ships: the preview, the fixed-four confirmation, per-member rescan,
same-preview retry, and the priority disable barrier that removes every Global result
again.

```bash
pnpm exec playwright test tests/e2e/global-consent-preview.spec.ts
pnpm exec playwright test tests/e2e/global-consent.spec.ts
pnpm exec playwright test tests/e2e/global-disable.spec.ts
pnpm exec playwright test tests/e2e/global-codex-admission.spec.ts
pnpm exec playwright test tests/e2e/global-claude-admission.spec.ts
pnpm exec vitest run --project unit tests/unit/host/global-consent.test.ts
pnpm exec vitest run --project unit tests/unit/session/coordinator.test.ts
pnpm exec vitest run --project contract tests/contract/http-api-global.test.ts
pnpm exec vitest run --project integration tests/integration/global-boundaries.test.ts
```

The test harness supplies isolated fake tool homes; it must never inspect the developer's
real home directory. Verify:

1. No Global path is touched before consent; the preview is derived lexically without
   `stat`, `realpath`, enumeration, or file reads. Instrumented capture proves each of
   `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` is captured exactly once in that order; only
   `undefined` is absent; `node:os.homedir()` is called exactly once per preview — the shared agent home always derives from it; and
   active-platform `node:path.join` applies only the fixed corresponding suffix. No direct
   `HOME`/`USERPROFILE` selection or existence check occurs.
2. The consent view shows the exact Copilot, Claude, and Codex lexical roots, input
   states, and exclusions, with the read scope explained in plain language rather than
   per-pattern path displays. It shows neither version the preview binds: a reader can act
   on neither, cannot look either up, and the version mismatch they guard against cannot
   occur while the preview is on screen — the values are build constants, and a different
   build holds no preview to confirm. The confirmation submits `allowlistVersion` and the
   host refuses one that no longer matches, which is where the pair belongs. The frozen
   internal preview separately retains each exact raw `lexicalRoot` string;
   `displayRoot` is a one-way escaped string and is never decoded into
   read authority. A preview-construction throw/rejection returns its real error with no
   `scanRequestId` or granted authority.
3. After opt-in, only the documented member candidates appear under zero to four
   separately identified member Global Sources—at most one each for Copilot, Claude,
   Codex, and the shared agent home—and every Source has exactly one root. Every admitted Source from the
   initial/retry transaction appears together in one atomic Global generation — the enable
   commit creates the Global sequence at generation 1 without touching Repository views or
   state — with no observable
   per-tool commit. Compare two consented homes' readable
   files of one row — a comparison stays inside one Source family, so no Repository file
   is offered as a side of that pair (spec.md § Clarifications Session 2026-08-28) — and
   verify that each remains under its independently identified owning Source and
   Source-relative Path without merging roots or producing a semantic verdict.
4. Present-empty, relative, and invalid env overrides use fixed preview states/
   messages, create no retained Diagnostic, and never silently fall back; only an absent
   setting uses the documented default. A consented root that is missing or not a readable
   directory is recorded as absent or failed for that tool without preventing the other
   tools from committing. An eligible
   absolute root remains eligible even when it is outside the ordinary home; its location
   alone does not reject it or grant pre-consent I/O.
   An all-invalid preview, or an eligible preview whose four roots are all found absent
   after consent, may still receive the one all-tools confirmation and
   deterministically becomes `active-no-job`.
5. An unexpected injected admission failure aborts the whole transaction;
   initial enable returns that failure's real error and activates no
   consent/control/job, while retry preserves existing state. No numeric root or escaped-
   display ceiling is defined.
6. A stale, changed, or cross-session replayed preview ID is rejected. Enable names only
   the one server-retained preview record by its opaque `previewId`; for every entry that
   record keeps the stored raw `lexicalRoot` and the escaped `displayRoot` as separate
   fields, together with the record-level `allowlistVersion`/`traversalPlanVersion` pair
   identifying the closed selection policy and canonical programs. The display field never
   substitutes for the raw field. Enable uses only the frozen raw value and stored plan; it
   never rereads the environment or reverse-converts `displayRoot`. Escape-collision, control-character, and backslash fixtures
   prove that the record preserves the separate fields and admission uses the stored raw value.
   A preview mixing eligible and invalid entries has no request-side tool
   selector: initial enable derives fixed `confirmedTools: [copilot, claude, codex, agents]`,
   evaluates all four, and returns disjoint `acceptedTools`/`rejectedTools` whose union is
   all four. A `tools` key or other selector-shaped input is rejected. Retry derives the
   complete fixed-order `retryableTools` projection—non-pending unpublished `admitted`
   controls plus `same-preview` rejected controls—and excludes published, pending, and lexical
   `new-preview-required` controls; the client cannot add, narrow, or reorder it. Reusing exact
   active consent is accepted only while that projection is nonempty; existing Sources remain
   semantically unchanged and a different preview/root requires disable first. Every
   successful initial or retry admitted-subset batch commit
   commits exactly one Global generation and invalidates only old Global
   detail/comparison/selection/editor state;
   Repository generation and views are untouched, and a Repository rescan likewise
   leaves committed Global detail and comparison views valid.
   The coordinator serializes correctness-sensitive admission and scan work without a
   product-defined slot or queue-capacity ceiling. An unexpected admission failure
   propagates before state mutation. All-rejected, partial, accepted-batch error, cancellation, and
   repeated-retry fixtures prove terminal `GlobalEnableOperation` records are unregistered.
   At the final locked
   disposition point, an operation-first ordering commits the accepted admission even if delivery follows disable
   acceptance, while a barrier-first ordering returns the fixed conflict, leaves no late side effect or
   operation-history leak, and permits the next enable. Exercise both orderings while paused during
   validation, after admission but before mutation, and immediately before the single batch enqueue/
   disposition.
7. Disable is a priority security barrier over all inspection data. Before sending the
   request, the SPA performs the FR-027 full client-data purge. First
   acceptance of a non-no-op barrier atomically increments `globalContentEpoch`, installs a
   non-null `globalDisableInProgress`, revokes publication authority, and makes the session
   route return only `GlobalFenceRecoverySnapshot`; every other inspection-data route returns
   the fixed `global-disable-pending` conflict. It then discards active uncommitted work and cancels queued
   Global work. If any
   public Global consent, control, or Source state exists, `remove-active-state` discards
   the entire Global generation sequence and its Sources while committing nothing,
   then requeues an interrupted Repository command once, which may later commit at most
   one Repository generation of its own. Global files,
   exact-content DTOs, generation diagnostics, `GlobalToolControl`-owned lifecycle failures,
   comparisons, stale-failure entry/failure-reference pairs for removed Global Sources,
   consent, all controls, every retained root context, and the frozen preview disappear;
   the Repository sequence, its generation, its IDs, its content, and any Repository
   stale-failure pair are untouched. Only an unpublished operation-local initial enable may select
   `cleanup-only`; successful cleanup removes the fence while changing no committed state.
   A paused validation/admission fixture accepts disable, increments the command and content
   epochs, drains and
   unregisters the enable operation, then releases a late completion; that completion creates
   no control mutation, diagnostic, context, ID, or scan job after the final cancellation
   sweep. A post-acceptance cleanup or assembly failure
   keeps the process alive, the fence closed, the failed request's error retained,
   and retry/join available without restoring content, with process restart presented as
   the fallback next step. A pre-acceptance failure or true no-op leaves the fence null so
   the already-purged client can immediately retrieve a fresh full snapshot.
8. Explicit Global rescan is accepted only while enabled, follows the same FIFO and
   dequeue-time generation rules as Repository rescan, and on commit advances only the
   Global sequence, invalidating only its own views while committed
   Repository views stay valid. Its admission response, Source/progress, and successful generation preserve the
   same opaque `scanRequestId`. An unknown/removed Source returns the fixed `stale-resource`
   rejection, a pending/active disable
   returns the fixed `global-disable-pending` conflict, and a duplicate returns the fixed
   `scan-in-progress` conflict. A failed
   attempt publishes zero uncommitted partial results, keeps exact consent/boundaries and
   every prior per-tool graph, creates or replaces only that Source's stale-failure entry —
   referencing its source-scoped diagnostic such as `root-unreadable` or, for an unexpected
   failure, the failed request's error message — reports failed/null progress, and remains eligible for explicit
   rescan or disable. A different Source's successful commit preserves both; the affected
   Source's successful complete/partial rescan clears both.
9. An unexpectedly failed accepted initial/retry batch publishes no provisional Source/file/
   generation, adds no `StaleSourceFailure`, preserves the prior snapshot, and retains and
   exposes the failed request's error exactly once for the whole consent, keyed by the
   batch `scanRequestId`. A tool rejected by root admission
   may retain its closed control state for exact-consent retry or disable. In a mixed
   outcome, retry validation/admission exposes only authority-free
   `globalEnableInProgress`; it leaves the exact pre-operation `globalControl`, `pendingTools`,
   `retryableTools`, `batchStatus`, and diagnostic projection unchanged. Atomic queued
   acceptance alone sets `pendingTools` and `batchStatus` to exactly the admitted accepted-
   batch subset and shared request ID. Initial enable has no projection until atomic activation
   and then exposes only accepted-batch tools. `unvalidated` exists only in non-serialized
   operation-local work; every accepted-pending control is already `admitted`, and an active
   serialized control is never `unvalidated`. Rejected same-preview and
   non-pending unpublished admitted controls may be listed as retryable, but retry remains
   disabled with the fixed `global-enable-in-progress` conflict until all pending work finishes. It then uses
   the exact nonempty `retryableTools` projection and preserves successful Sources. Lexical
   `new-preview-required` controls require disable/new preview. Disable remains immediate.
10. On initial activation, when all four members are deterministically rejected by lexical or
    post-consent root validation, enable returns `active-no-job` with empty
    `acceptedTools`, all four `rejectedTools`, and no Source/job/generation/stale entry.
    `globalControl` remains active with only the same-preview rejected controls retryable;
    lexical `new-preview-required` controls are excluded, so an all-lexically-invalid preview
    has empty `retryableTools` and requires disable/new preview. The preview route returns the
    same frozen preview and disable remains available. An all-rejected retry creates no new Source/job, commits no
    generation, and preserves existing Sources and their IDs exactly; partial acceptance
    returns `queued`, partitions every evaluated tool, and publishes the subset atomically.
    A retry after a failed initial scan discards the rejected control's
    unpublished IDs and leaves no stale root state in that control before a later complete
    re-admission.
11. A second disable while a barrier is draining/committing joins the same operation and
    still commits nothing; after a retained failure, another disable resumes the same
    cleanup lineage and the already-incremented content epoch.
    With no member Global Source or graph, active consent record,
    running/queued Global scan/enable command, or retained disable failure,
    disable is a true no-op even while unrelated Repository work is active. When active
    consent/control exists during the barrier, the projection is
    `globalControl.state: disabling` with empty pending/retry arrays. With only an
    operation-local initial enable it remains null. In both cases enable returns
    the fixed `global-disable-pending` conflict; a visible control offers no Global retry while the barrier
    remains non-terminal.

## Measurable outcome protocols

### SC-001 and SC-006 first-use evaluation

Twenty independent autonomous-agent sessions, run once for the release candidate. Each is
given the origin one running Inspector printed and nothing else, and each attempts discovery,
inspection, comparison, and personal-setup consent. How a run is performed, what may be said
to a session, and what is written down are in
[`tests/usability/sc001-sc006-study-kit.md`](../../tests/usability/sc001-sc006-study-kit.md);
the task prompts, guidance, response form, ground truth, and scoring rubric it reads are
under `tests/usability/sc001-sc006-study-inputs/`.

Serve the tree with `pnpm run start:fixture`, which builds and serves the all-kind fixture the
ground truth is written against. Record every session in `validation.md` and
`validation.ja.md` — the four workflow outcomes, the two timed intervals, and the safety
observations — without exclusion or replacement, and record that the run was agent-driven.


### Performance smoke pass

No scan-timing or interaction-latency threshold is asserted for this release. What runs is
one non-gating pass over the deterministic 100,000-entry, 500-match fixture that
`tests/performance/sc002-fixture-manifest.json` binds by version and canonical SHA-256: the
validator expands the manifest's declarative rules, walks the built tree, and recomputes
every entry and content digest, so a builder change or a stray file invalidates the pass
instead of quietly measuring a different repository. Run it with:

```bash
pnpm run test:performance
```

### SC-003/004/005/007 release-evidence fixtures

Freeze `tests/fixtures/outcomes/manifest.json` and its canonical
`tests/fixtures/outcomes/manifest.sha256` before measuring a release candidate. Validate the
manifest schema/version, unique stable case IDs, criterion and required-class membership,
fixture or deterministic-builder references, objective expected outcomes, every referenced
fixture digest, and the declared nonzero minimum for each required class. Execute every
manifested case and record the manifest version, canonical digest, exact case IDs, class
counts, and results in `validation.md` and `validation.ja.md`. A missing, duplicate,
undeclared, unexecuted, or digest-mismatched case, an empty required class, a missing fixture,
or a denominator below its declared minimum fails every affected criterion.

The SC-004 manifest contains at least one fixture for every supported tool; for every
prohibited-effect class — customization-derived command or code execution, child process,
MCP connection, direct product-issued outbound request as defined by FR-022, and
product-issued inspected-source mutation; and for an out-of-bound selector for each
Repository and Global source kind. Its cases independently validate the two exact FR-022
authorized internal loopback classes at the issued `localhost` authority, record that every
fixture root is local while documenting lexically indistinguishable pre-mounted/mapped
network filesystems as the FR-022 platform/environment limitation (explicit
UNC/server-share/device vectors prove zero filesystem, DNS, and SMB calls), instrument
product filesystem operations for the mutation assertion, and record any solely
OS-attributable access-time movement separately without counting it for or against the
criterion.

The SC-007 manifest contains at least one fixture for every file-confined outcome class —
malformed content, binary content, invalid non-NUL UTF-8 replacement decoding, and an
unreadable file (including a broken symbolic link) —
and for every
failure class — a session-API request rejected before job acceptance, a failure after an
accepted session-API job, and a startup failure. It also exercises a post-acceptance Global-disable
failure in which the process survives with all inspection data fenced, the failed
request's error retained with retry/join available, and restart as the presented next
step. Invalid non-NUL UTF-8 is
processed as readable `utf-8-replaced` text without making the scan partial by itself;
every other file-confined outcome yields that file's actionable diagnostic and its allowed
complete or `partial` commit without affecting other files; every failed session-API
attempt commits nothing, leaves only the last committed snapshot (marked stale by a
failed accepted rescan), and shows the failed request's error; and a startup failure ends
the launch with an actionable message.

Removing or
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
pnpm exec vitest run --project integration tests/integration/boundaries
```

Inspector defines no numeric ceiling for file or aggregate bytes, file or record counts,
path or parser structure, retained graphs, request or response bodies,
package assets, previews, editor computation, coordinator work, or elapsed scan time.
Available capacity comes from Node.js, the selected parser, the operating system,
filesystem, browser engine, and execution environment; no equivalent product-level
capacity-validation contract is exposed.

Failure fixtures exercise the inspected-source read, parser, coordination,
assembly, and serialization boundaries. A failure confined to one file becomes that file's
actionable per-file diagnostic while every unaffected file stays complete, and the attempt
then commits one atomic `partial` generation after traversal finishes. A failure not
confined to one file commits no item, result, or generation: a failed session-API
request — rejected before acceptance or failed after an accepted job — returns its real
error, startup-owned
work ends the launch with an actionable message, any prior snapshot remains, and API
responses/authored source are never truncated. No error path emits a customization
validity/correctness/compliance/lint verdict, and no failure is classified by capacity,
resource, or operational cause.

Per-file diagnostic fixtures cover each file-confined class: an unreadable or
disappeared-before-read file — including a symbolic link whose target is missing or
unreadable — yields `file-unreadable`; an admitted candidate's NUL-containing content
yields the diagnostic-only `file-content-binary` item, where a census-listed companion's
binary bytes yield none; a parser or extractor failure yields
`recognition-parse-failed` while the complete readable source stays displayed and
comparison-eligible. Each fixture proves that the affected item retains enough Source and
source-relative-path context to resolve the problem and that the same scan still publishes
every complete unaffected file. A missing or unreadable source root instead fails that
Source's scan with its source-scoped `root-unreadable` diagnostic while the session stays
usable.

Coordinator tests preserve deterministic serialization, per-sequence generation atomicity,
cancellation,
disable/shutdown/supersession revocation, and late-result discard without defining slots,
queue capacity, or a scheduling deadline. Independent-sequence fixtures prove that a
Repository rescan commit invalidates only Repository views and leaves committed Global
detail and comparison views valid, that a Global rescan likewise leaves committed
Repository views valid, and that Global disable discards the Global sequence without
committing any generation. The session-loss and response-guard contracts remain
acceptance criteria, not capacity ceilings; the product sets no process-loss
detection deadline for a continuously idle page. Tests do not claim recovery from
process-ending out-of-memory conditions or physical
cancellation of uncancellable Node.js or kernel I/O.

Traversal-plan call traces additionally prove that Repository traversal executes the
compiled immutable plan, a Global exact target never opens the tool-home root, a fixed
instruction-subtree walk opens only that subtree, and every neighboring Global path has
zero I/O. Path-spelling fixtures prove the exact raw `Dirent.name` segment is the one spelling:
filesystem operations use the raw entry name, a public Source-relative Path is those
names joined with `/`, and a targeted fixed path uses the immutable registry target
spelling as its sole I/O operand, so an NFD-only name is read through and published as
its raw segment. Hard links are ordinary files: two hard-linked paths
that both match allowlisted selectors are simply two inventory files, with no identity
grouping, alias ranking, or per-group bookkeeping to test. Symbolic links are followed
transparently, exactly as agents resolve them, so a symlinked customization file is
inspected through its linked target; recursive traversal tracks visited directories by
real path, and link-cycle fixtures prove the scan terminates without duplicating entries.
A link whose target is missing or unreadable yields `file-unreadable`.

Node.js filesystem tests run on the supported macOS, Windows, and Linux CI matrix
against the same platform-neutral package. Each result records the platform and Node.js
version. Reading is ordinary: every file — symlinked or not — is read read-only and
transparently, directory recursion tracks visited directories by real path so a link
cycle terminates the walk, and any file-confined read error, including a broken link
target, becomes that file's `file-unreadable` diagnostic. No adversarial-input machinery — repeated identity re-verification between
operations, failure taxonomies for concurrent modification, or per-identity bookkeeping —
exists in the product or its tests.

The filesystem call recorder also proves that every inspected-source open is read-only,
non-create, and non-truncate and that no write, append, create, truncate, rename, delete,
link, chmod/chown, timestamp, extended-attribute, ACL, or equivalent mutation-capable call
occurs. Before/after fixture measurements compare content, length, identity/link state,
mode, modification/change time, and extended attributes or ACLs where observable. Any
access-time movement caused solely by an OS read is recorded separately; it neither fails
the no-product-mutation assertion nor counts as proof, and no product call requests it.

The packed tarball repeats the same filesystem suite, and test-only instrumentation is
absent from production exports.

Package tests cover the packed `package.json`, the exact `bin` mapping, and the two
required entry points asserted by `verify:package` — `dist/public/index.html`
and `dist/cli.mjs` — without imposing a product-defined size or
record-count ceiling and without re-verifying the sibling build output that Nuxt and
tsdown just produced: there is no static-asset manifest, CSP-hash record, or per-asset
digest ledger to validate. Nuxt's root-absolute assets boot every client route through the
devframe host unchanged. Build-cleanup cases prove `scripts/clean-build-output.mjs`
removes only the root-resolved package-owned `.output/` and `dist/` trees, and negative
fixtures prove a missing or non-regular required entry point fails the gate before
publish. None of these package-owned checks reports a customization validity or lint
result.

Parser-failure tests cover every format. A parser or extractor failure inside one file —
whether returned or thrown — is file-confined: it discards only that recognition's whole
result, attaches the `recognition-parse-failed` diagnostic, keeps the complete readable
source displayed and comparison-eligible, and leaves every other file untouched;
they also cover all-or-nothing recognition output. Exact-display tests place distinct
literal credentials and environment-variable references in source and metadata, set
different sentinel process values, and prove that source/comparison views preserve the
authored text exactly, introduce none of the sentinel values, expose no masking/reveal
control, and duplicate no customization source value in Diagnostics.

Diagnostic-behavior tests cover the order-only aggregation — fixed phase/source/
path/rule/code/occurrence order with no dedup pass, so legitimately repeated records —
an extraction failure is one record per `(file, kind)`, and one file's two kinds can
each fail — all publish. A failure while retaining or serializing a Diagnostic is not
confined to one file: it fails the attempt, publishes no result/generation, and is reported
as an ordinary error with the failed request's message. Multi-Source cases prove A/B entry-failure pairs coexist, B success preserves A,
A success clears only A's pair, repeated A failure replaces only A's pair, and Global disable
removes only Global pairs. Repeated client-caused API errors never increase a retained diagnostic count.
The same fixtures validate the closed `file | source` scope union: file scope requires
`sourceId` and `sourceRelativePath`; source scope requires `sourceId` and
forbids `sourceRelativePath`. There is no pathless scope, and a source-scoped
diagnostic never invents a path for display or ordering.

## Manual accessibility review

Follow the normative [SC-008 accessibility acceptance contract](contracts/accessibility-acceptance.md).
After every criterion-specific `AUTO-*` check passes, execute every `MANUAL-*` check against
the packed release candidate and recheck every `REVIEW-*` rationale against the complete
diff, the packed tarball's file list, and the rendered packed interface. An axe severity result alone does
not establish SC-008. The contract freezes the complete, non-sampled execution matrix:

1. Use only the keyboard to launch/follow the URL, filter, open and close a file, open a
   skill's comparison from its row link and switch its compared file and copies, open Global
   consent, enable/disable Global, rescan, and return to inventory.
2. Confirm visible focus, logical focus order, skip/navigation landmarks, unique labels,
   status announcements, error/next-step association, and no focus loss on generation
   replacement.
3. Execute no `MANUAL-*` cell: this release asserts the automated layer, and the manual
   matrix is recorded as unexecuted rather than sampled.
4. Confirm color is never the only indicator of tool, state, severity, selection, or diff.
5. In `validation.md` and `validation.ja.md`, record all 55 Level A/AA rows with frozen state,
   complete required-check IDs, per-ID evidence/result, reviewer, and each Not-applicable
   revalidation note, with every `MANUAL-*` ID recorded as unexecuted. Also record the
   nonzero Applicable-row denominator, zero failed Applicable rows, and all four keyboard
   workflow outcomes. One failed Applicable row, unsupported rationale, missing check ID, or
   incomplete keyboard workflow fails SC-008 regardless of severity.

## Release package verification

After all release-evidence and remediation edits are final, rerun the following in order;
none of these commands may rewrite the tree.

```bash
pnpm outdated
pnpm run format:check
pnpm run test:package
pnpm run test:docs
git diff --check
```

Review `pnpm outdated` rather than blindly upgrading: a newer prerelease or an incompatible
TypeScript/Vite major does not replace the latest compatible versions documented in
[research.md](research.md). Assert that the tarball contains only npm's `package.json` plus
the exact `package.json.files` entries `dist`, `docs/images`, `README.md`, `README.ja.md`,
and `LICENSE`, and that the expanded `dist/**` tree contains the two entry points verified by
`verify:package` — `dist/public/index.html` and `dist/cli.mjs`;
the remaining `dist` contents are Nuxt/tsdown build output and are not re-enumerated by a
product manifest. Inspect the exact `bin` mapping and absence of `main`/`module`/`exports`,
license notices, exact shebang/executable mode, and the published README pair. The direct
production dependencies are exactly the eleven packages `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml`; devframe's and `open`'s transitive
trees are owned by those packages and the lockfile.

There is no host-security or HTTP-API-router contract step to rerun: devframe owns
hosting policy, so the product has no per-session token, product-owned Origin check, or
hand-written router. Transport protection is the devframe host's
loopback-only `localhost` bind with
devframe authentication disabled, an unexpected session-API
failure returns its real error to the requesting client, and the
residual exposure of an unauthenticated loopback host — other local processes and, via
DNS rebinding, a malicious web page — is the documented
limitation.

For the release record, document the migration impact for every accepted dependency or
breaking public-contract decision. Record the initial baseline as no impact only after
confirming that no prior published package, public contract, persisted profile, user data, or
affected consumer exists. Otherwise record required consumer actions, compatibility/support
window, and rollback/support path. Missing or one-language-only evidence fails the release
gate.

Assert the approved production dependency set from `package.json` and the `pnpm-lock.yaml`
closure: exactly the eleven direct dependencies `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml`, so a graph change fails the gate until the dependency decision is
explicitly revisited. The committed lockfile owns each resolved version and its integrity
hash, which is what pins every production package's payload bytes. Only generated
Package-manager-generated `.bin` symlinks and `.cmd`/`.ps1` shims map to the exact declared
`package.json.bin` target and forward argv to it.
Generated HTML shell, CSS, JSON files, documentation, and license files are accepted as
declarative, non-executable payload artifacts; any HTML-referenced bootstrap script remains
JavaScript executable code. FR-038 covers project-authored executable application code and
the published/installed product, while third-party development and test tooling remains
outside that published boundary and is audited separately. Per-payload content scans — platform selectors, native/binary/Wasm magic, native build
source/metadata, non-Node shebangs, shell helpers — along with scripts-disabled and
network-disabled install runs, the per-OS shim audit, and per-dependency version and
integrity-hash assertions are out of scope: the committed lockfile already pins every
resolved version with its integrity hash, so restating those values in a test only
duplicates the lockfile, and install-time enforcement belongs to the package manager.

Launch tests must cover the printed origin line appearing before any browser attempt, zero
opener child processes under `--no-open`, and inspection remaining usable when
automatic opening is disabled, unsupported, or fails — port/host
resolution is devframe-owned while automatic opening and the negatable `--open` flag are
product-owned through the startup opener — the macOS Chromium tab reuse in front of the
`open` package's helper — and the tests prove that no
inspection-derived content, path, or authored value reaches that opener. They also cover
Gunshi's non-binding help/version, strict unknown-option rejection,
explicit positional/rest rejection, default exact captured `process.cwd()`, and one `--root`
accepted with a repeated option resolving to the parser's last value — an absolute option kept as given, a relative option resolved
against the captured invocation directory, and no `chdir`.
They cover the optional `--port` preference reaching the host exactly as parsed — 0
included, that being devframe's request for an automatically selected free port — and its
absence leaving devframe's own default in place.
They reject an explicit empty `--root` value with the fixed actionable, source-value-free
startup error before session/browser creation and reject a missing value through Gunshi's
typed argument validation. They require nonzero
validation failures and awaited
completion. Tests also prove that automatic opening merely delegates to the operating
system's default handler and cannot certify its version; the release
record uses the pinned Playwright revisions, and `--no-open` plus the printed URL is the
manual certified-browser fallback. The documentation gate separately validates all
repository English/Japanese document pairs without publishing the planning set. The same
tarball must install, launch, and pass the Node.js filesystem suite in the six exact
lower-bound OS/architecture certification jobs defined in [research.md](research.md).
The active LTS Node.js is the development/build baseline. These finite samples do not claim
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
applicable automated gates, ending with the documentation gate and
`git diff --check` before approval. Capture final outcomes in the
external release or pull-request check log rather than by editing a repository evidence file.
Any later repository edit invalidates every outcome and approval and returns to remediation,
candidate/study/evidence digest revalidation, applicable gate reruns, and complete-diff review
before the Constitution/final-gate sequence.

After T917, the final-release `pnpm run test:package` gate must install the newly packed
tarball into an isolated fixture, spawn
`npx --no-install agent-customization-inspector --no-open`, observe a valid loopback launch
URL, assert that the launched CLI spawned no browser-helper child, and terminate the process;
inspecting the tarball or mapping alone is not a launch test.
