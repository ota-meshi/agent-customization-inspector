# Implementation Plan: Inspect Agent Customizations

[日本語](plan.ja.md)

**Branch**: `dev` | **Date**: 2026-07-20 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-inspect-agent-customizations/spec.md`

## Summary

Build a read-only local inspector, launched with `npx`, that inventories and compares
allowlisted customization files for GitHub Copilot, Claude Code, and OpenAI Codex without
activating any inspected content. Use one cohesive package: a Nuxt client SPA in `src/app/`,
a Node CLI and local inspection host in `src/server/`, serializable contracts in `src/shared/`, and
one published `dist/` tree whose `dist/cli.mjs` is the direct `package.json.bin` target. A fixed clean step removes only
package-owned prior `.output/` and `dist/` trees. `nuxt build` emits the
static browser application directly into `dist/public` and tsdown emits the CLI
bundle directly into `dist/`; the `verify:package` gate requires exactly the two
packaged entry points `dist/public/index.html` and `dist/cli.mjs`
— there is no staging copy step, no static-asset manifest, and no CSP-hash recording step.
The Inspector
runs in a workspace the user already trusts: inspected customization files are not modeled
as an adversary, and all inspected-source filesystem I/O lives only under
`src/server/inspection/`, which performs an ordinary recursive `node:fs/promises` walk of
the fixed inspection-path allowlist with per-file diagnostics for entries it cannot use.
The browser presents complete authored
source in a read-only Monaco editor and uses Monaco's diff editor for source comparison;
tool recognition is compared per tool, and declared metadata is compared once —
serialized to one canonical document per side, which the diff editor mounts beside the
source. The parse behind it runs once per `(file, kind)` for the Markdown kinds and once
per `(file, tool)` for the custom-agent kind.

Root selection is simple and lexical: the CLI captures `process.cwd()` exactly once and
accepts `--root <path>`, resolving a repeated option to the parser's last value. An absolute option is kept as given, a relative option
is resolved against the captured invocation directory, and the result is the selected
Repository root. The CLI never calls `process.chdir()`. An explicit empty `--root` value
fails with a fixed actionable, source-value-free startup error before session creation or
browser launch; a missing value is rejected at the same boundary by Gunshi's typed argument
validation, which the product does not duplicate. Bootstrap generation 0 of the Repository sequence synchronously contains
the one Repository Source with a stable `sourceId` and an escaped root label.

The security boundary is strict: the browser never reads the filesystem,
the Node host never dynamically imports customization files, and the initial release has
no static-export, MCP, remote-host, or automatic-watch mode. The local host is the
devframe local-tool framework — the same foundation eslint/config-inspector uses — with
authentication disabled: it serves the built SPA from `cli.distDir` (`dist/public`) and
sends inert DTOs through devframe's RPC session API channel, and devframe owns port
selection and host binding, while the product owns startup browser opening — the macOS
Chromium tab reuse in front of the `open` package's helper (research.md § 3) — with
devframe's bundled opener disabled. Protection is the loopback-only
`localhost` bind — there is no per-session token, product-owned Origin check, or
hand-written router — and the residual exposure of an unauthenticated loopback host
(other local processes and, via DNS rebinding, a malicious web page) is a
documented limitation per the
Constitution § Quality and Safety Standards. The session API returns a `FileDetail`, including complete authored source and
declared authored values, only to an explicit detail request; the bundled browser asks for
one file or comparison at a time. Neither a notice nor a confirmation step stands beside or
in front of the content: loopback binding is the whole boundary, so neither guards
anything. Environment-variable references remain literal text and
never authorize process-environment lookup or substitution. Explicit scans use the frozen
inspection path allowlist, read symbolic links transparently the way an agent loading the
same path would (a link whose target is missing or unreadable yields that file's per-file
diagnostic), use inert best-effort
parsers, and atomically replace the owning sequence's in-memory generation — Repository
and Global inspection keep independent generation sequences because their lifecycles are
independent — so that sequence's stale generation-owned details and comparisons cannot
survive a successful rescan while the other sequence's committed views stay valid. Global
enable creates the Global sequence at generation 1 without touching Repository state, and
Global disable discards that sequence without committing anything. A fatal rescan publishes none of its
uncommitted results and retains the last committed snapshot with a per-Source stale-failure
entry — showing the failed request's error or the deterministic lifecycle diagnostic —
until that Source is refreshed or removed.

Customization discovery is maintained as three contract-versioned registries: documented
vendor lookup behavior (`behaviorId`), Inspector matcher/read policy (`ruleId`), and runtime
composition strategies (`strategyId`). Each record cites the official pages establishing it
in its own `evidence` array, keyed by `sourceId`, rather than through a registry of its
own. The common
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
merge into the one `(file, copilot, MCP)` recognition and one read of that file.

Every user-visible inventory/API filesystem locator that identifies an inventoried
customization file or a safely normalized target within its owning Source is a
Source-relative Path computed from that Source's one root. This includes file paths,
provenance paths, non-null normalized relationship targets, comparison/filter
labels, and file-scoped Diagnostic locations. It is repository-relative only for the
Repository Source; each Global Source uses its own admitted tool-home root and never shares
a path namespace with another Source. Authored literals are a separate surface and remain
displayed exactly as authored.

Root labels are a distinct presentation surface. An enabled `SourceBoundary.displayRoot`
is the one-way escaped presentation of that Source's root. A
`GlobalConsentPreview.entries[].displayRoot` originates before admission, when no owning
Source exists, and is the one-way escaped proposed lexical root; it may be absolute or
invalid. Neither field is a `SourceRelativePath`, identifies an inventory item, or grants read
authority.

Every Inspector Repository matcher is explicitly based at the selected Repository root and
authored as a typed segment-array program with no glob-looking rendered string form; a
leading `ANY_DIRECTORIES` segment means only downward Inspector descendant
inventory of a location the vendor documents at any depth through a worked-file or
descendant anchor, never vendor traversal; a location documented only on the runtime
cwd chain is admitted at the selected root alone. Static candidates, vendor-specific one-edge
derivations, relationship-only references, and exclusions remain distinct. File existence
is kept separate from product surface, runtime root/`cwd`, target matching, trust,
enablement, selection, installation, managed policy, and external runtime facts, so the
inventory never masquerades as an effective agent configuration. Origin-file-less hosted or
runtime inputs are out of scope: the product reports the customization files it found and
says nothing about behavior no file originates. Closed context
relationships show which independently inventoried instructions, rules, skills, MCP
declarations, or memory scopes an agent may reference without following a path; Codex
instruction-byte limits and excluded non-file inputs stay explicit condition facts.

## Technical Context

**Language/Version**: Active LTS Node.js development/build baseline; package runtime
compatibility contract `^24.11.0 || ^26.0.0`, exactly
`>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0`; TypeScript 6.0.3; Vue 3.5.39. The six
Node/OS floor jobs certify the two declared lower bounds rather than enumerating every
compatible minor/patch release. Versions below either floor, Node 25, and future majors are
outside the contract.

**Primary Dependencies**: Nuxt 4.4.8, Vue Router 5.2.0, tsdown 0.22.8, Vite 7.3.6
(latest Nuxt-compatible release), `devframe` 0.7.5 (the pre-1.0 local-tool
host framework), `gunshi` 0.37.0, `open` 11.0.1, `yaml` 2.9.0,
`strip-json-comments` 5.0.3, `smol-toml` 1.7.0, `h3` 2.0.1-rc.22, `monaco-editor` 0.55.1, and
`@ota-meshi/site-kit-monarch-syntaxes` 0.7.3 (the TOML Monarch grammar Monaco ships none of).
Each is declared as a caret range in `package.json`,
and the committed lockfile pins these exact resolved versions with integrity; `h3`'s
resolution coincides with devframe's own h3, so the host's `/skills/**` shell fallback
and devframe resolve one H3 module instance (research.md § 3). The rest of
devframe's transitive
tree (birpc, crossws, valibot, destr, mrmime, nostics, pathe, ufo) is
owned by devframe and the lockfile rather than declared as direct dependencies. The first lockfile
MUST revalidate these exact stable resolved versions; prereleases and incompatible newer majors
are not considered eligible “latest” versions, and the devframe choice plus its
lockfile-owned h3 release candidate are the one reviewed exception, accepted with the
framework adoption decision (spec Clarifications § Session 2026-07-22).
That revalidation is a planning gate, not permission for a task-local package or version
edit. If any selected package or version changes, implementation stops before configuration
work, the compatibility decision is reviewed again, every dependency-baseline-bearing
English/Japanese research, plan, quickstart, and task artifact is synchronized, and
`/speckit.plan` followed by `/speckit.tasks` is rerun before work resumes.
An update Renovate automerges is outside this gate: which packages this project selects, and
why each was chosen, do not change. Such an update is not confined to the lockfile —
`:preserveSemverRanges` is `rangeStrategy: replace`, which rewrites the accepted range in
`package.json` whenever the new version falls outside it — so what stands behind a bump is
ci.yml, which runs the whole suite against that pull request before it merges. A version
recorded in these artifacts is the one its reason was reviewed against. Two updates never
automerge — a runtime dependency's major, and a minor to a package below 1.0.0, where
SemVer permits a breaking change in any release — so replacing a package, crossing its
major, or moving a pre-1.0 caret range still reaches this gate (AGENTS.md § Release
policy).
Configuration, CI, release, and package-policy
instructions MUST use only that one synchronized baseline.

**Formatting/Linting**: Code formatting is owned by Prettier — `pnpm run format`
rewrites and `pnpm run format:check` gates locally and in CI — while byte hygiene stays
declarative: `.gitattributes` (`* text=auto eol=lf`) makes git normalize line endings and
`.editorconfig` declares charset/final-newline/trailing-whitespace conventions to editors
(research § 3). ESLint 10.7.0 with
`@nuxt/eslint` 1.16.0 is the lint
gate, and the strict TypeScript type check over the application, shared, source, script, and
test code configured in `tsconfig.json` runs as the equally independent `typecheck` gate.
Local verification, independent CI jobs, and release run ESLint and `typecheck` separately.

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
change MUST record its rationale and migration impact; an update Renovate automerges is not
such a change (see the dependency gate above). Design evidence MUST exist before
implementation; the corresponding `validation.md`/`validation.ja.md` evidence MUST exist
before release. Each record MUST identify affected consumers, contracts, data, and workflows;
required migration steps and compatibility or support window; and rollback/support path, or
give an explicit reasoned no-impact determination. Missing or stale bilingual design evidence
blocks T002; missing bilingual validation evidence fails the release gate.

`src/server/cli.ts` uses only Gunshi's stable root `define`/`cli` API. It defines a negatable
`open` boolean with a true default to provide `--no-open`, a single string-valued
`root` option for `--root <path>`, a number-valued `port` option for `--port <number>`,
and a false-by-default `inspect-personal-setup` boolean whose presence is itself the
consent confirmation — the entry constructs the preview from the retained session-start
Global root inputs, confirms it, and awaits the committed Global generation before the host
starts, exactly as it awaits the automatic Repository scan (FR-013) — enables `strict: true`, explicitly rejects every
positional/rest argument before binding, awaits `cli()`, and lets a parser-owned validation
`AggregateError` propagate ordinarily to a nonzero process exit. Before creating a
session it captures `process.cwd()` exactly once and rejects an explicit empty `--root`
with a fixed actionable, source-value-free startup error before session creation or browser
opening; a missing value is rejected at that boundary by Gunshi's typed validation. A
repeated `--root` resolves to the parser's last value. An
absolute `--root` value is kept as given and a relative value is resolved with
`node:path.resolve` against the captured invocation directory; the result is the selected
Repository root. The CLI never calls `process.chdir()`. Built-in
help/version are handled without binding. The production entry does not import
`gunshi/agent`, lazy commands, custom plugins, or experimental parser combinators. After
validation the CLI starts the devframe host through the app definition in
`src/server/host/devframe-app.ts`; devframe owns port selection and the loopback `localhost` bind,
the definition passes it `openBrowser: false` and makes the startup browser-open attempt itself,
and the CLI prints the loopback origin once for the FR-001 manual fallback. A `--port` value reaches the definition's `cli.port` exactly as parsed
and is a preference devframe resolves; with the option omitted the key is absent and
devframe's own default stands.

**Storage**: Nothing inspected is stored. Session state, inspected file bytes, complete
authored-source DTOs, diagnostics, and comparison selection exist only in process/browser
memory. Two reader preferences do persist, in browser local storage under this origin, and
neither carries anything read from a repository: which application the open control launches
a file in, and which colour scheme the page is drawn in. Both are about the reader's own
machine, both survive a reload and a rescan, and both are absent until the reader chooses.

**Testing**: Automated suites use Vitest 4.1.10 with `@vitest/coverage-v8` 4.1.10, Nuxt Test Utils 4.0.3,
Vue Test Utils 2.4.11, happy-dom 20.10.6, Playwright 1.61.1, and
`@axe-core/playwright` 4.12.1; fixture-driven unit, contract, integration, packaging,
performance, security, browser, and manual accessibility checks. `vitest.config.ts`
defines a named project per suite, each including exactly the directory it owns, so which
suite a test belongs to is decided by where it lives. `coverage` is the one project that
does not own a directory: it re-runs the unit, contract, and integration roots together
because a coverage figure is taken across them. A suite's project, its `package.json` command, its CI
job, and its quickstart entry all arrive with that suite's first test, in one change:
T996 brings `tests/security/`, T183 `tests/performance/`, and T1041
`tests/documentation/`. `passWithNoTests` is not set, so a project that matches none of
its own files fails instead of reporting a run that executed nothing — which is why a
suite is declared nowhere until it has a test. Security
tests under `tests/integration/security/` are owned by the integration project, like every
other directory under it. The browser release gate
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
observation. The manual matrix states the shape a `MANUAL-*`
check is defined over — three OS/assistive-technology cells, the responsive/zoom/spacing
profiles, visual modes, workflow states, and input profiles — and this release executes none
of it: every `MANUAL-*` ID is recorded as unexecuted rather than as passed, because executing
it needs three operating systems with three screen readers that no run available here can
produce. SC-003, SC-004, SC-005, and SC-007 use
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
rejected selector families, and shared-file combinations for SC-003; prohibited effects
and Repository/Global boundary rejection for SC-004;
exact tool/kind/source rows, source/comparison surfaces, literal-credential/environment-
reference classes, and set/unset referenced-variable states for SC-005; every file-confined
outcome class and failure class for SC-007. Release records
name the manifest version and digest plus every executed case ID; missing, omitted,
unexecuted, or mismatched evidence fails the affected criterion. The first-use evaluation of
SC-001 and SC-006 is twenty independent autonomous-agent sessions run once for the release
candidate: each is given its own copy of the all-kind fixture, the guidance, and the
standardized task prompt and nothing else, is started outside this working tree so that
nothing of the repository's own instructions is in its runtime, launches the Inspector
itself from that copy's root, attempts discovery, inspection, comparison, and personal-setup
consent, and is recorded without exclusion or replacement. There is no participant cohort,
moderator, reviewer, or capture harness — gathering twenty first-use participants is not
available to this project, so the evaluation asserts what an automated run establishes and
every record of it says it was agent-driven. Its material is the guidance, four task
prompts, response form, ground truth, and scoring rubric under
`tests/usability/sc001-sc006-study-inputs/`, and how a run is performed is in
`tests/usability/sc001-sc006-study-kit.md` and its Japanese companion.

**Target Platform**: The supported runtime contract is the complete declared Node.js 24/26
engine range on `ubuntu-latest`, `macos-latest`, and `windows-latest`. The exact
six-job Cartesian product of the `24.11.0` and `26.0.0` floors with those OS/architecture
targets is the mandatory lower-bound release-certification sample, not the full list of
compatible Node minor/patch releases. One platform-independent tarball is built on
`ubuntu-latest` with the active LTS Node.js development/build baseline, receives a separate
build/package smoke check there, and is installed unchanged in all six floor jobs. Each
release records the resolved runner-image identifier and actual Node version. Other OS/
architecture targets and Node versions outside the declared engine range are unsupported.
Browser release certification runs the complete browser and accessibility suite against the
exact Chromium, Firefox, and WebKit revisions installed by Playwright 1.61.1 on
`ubuntu-latest` with the active LTS Node.js. Those revisions are a finite reproducible
certification baseline, not an exhaustive list of user browsers. The fixed OS helper passes
the printed URL to the user's default handler without selecting or validating its family or
version; helper success is not browser-compatibility evidence. A handler outside the
certification baseline, an unavailable handler, or an unidentifiable resolved browser leaves
automatic opening best-effort; the printed URL plus `--no-open`/manual opening in a certified
browser is the actionable fallback. Published project/dependency package payloads and project-authored installed
application code contain only platform-independent JavaScript application code and
declarative static/package data — the one exception being the `open` package's vendored
POSIX-shell `xdg-open`, the recorded FR-038 closure exception — and they require no
install script, runtime download, or end-user
compiler. Package-manager-generated `node_modules/.bin` symlink/`.cmd`/`.ps1` launchers are
payload-external interoperability metadata that map to the declared `package.json.bin` target.
Development-only tooling is outside the product package and remains separately pinned/audited.
The server binds only the loopback interface (host `localhost`) and has no remote
deployment mode.

**Project Type**: Single publishable ESM npm package containing a static Nuxt web client,
a Node CLI/local HTTP service, and shared serializable contracts. All project-authored
executable application code is JavaScript/TypeScript, and executable code in every published
package payload is JavaScript; generated
HTML/CSS, JSON manifests, documentation, and the license are permitted declarative package
artifacts. This FR-038 boundary does not misclassify third-party development/test tooling as
published application code.

**Performance Goals**: None are asserted as a release threshold. Measuring scan timing or
interaction latency means naming one frozen host and recording its exact processor model,
image revision, memory, and storage before the run, because the same figures taken elsewhere
describe that machine rather than this product; no such host is designated. What remains is
`tests/performance/`, a non-gating smoke pass over the deterministic 100,000-entry fixture
`tests/performance/sc002-fixture-manifest.json` binds by version and canonical SHA-256. It
proves the harness still expands, walks, and digests that fixture, and asserts no threshold.

**Constraints**: Inspected customization must cause no execution, child process, dynamic
import, prohibited direct product-issued network request as defined by FR-022, MCP connection, or product-issued source mutation.
The two exact FR-022 browser/host classes at the issued `localhost` authority—closed
static/SPA `GET`/`HEAD` for the packaged UI assets and the local session API channel—
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
launcher owns one of the two permitted product-initiated child-process surfaces — the other is the reader's own explicit open-in-editor request (FR-022) — and on macOS the
fixed process-list probe and fixed tab-reuse script through the OS `osascript` automation
host, otherwise its fixed OS browser helper.
Every spawned process receives only fixed arguments and the printed loopback origin — no
inspection-derived content or
path, authored value, or user-supplied command — and inherits the launch environment
unchanged: the product writes no inspection-derived value into any environment variable,
and a platform helper honoring the user's own configuration, such as `xdg-open`
consulting `$BROWSER`, applies user preference. Lexical
equality between an ambient value and a Source root does not change its provenance or grant
read authority. The session remains usable when automatic opening is disabled, unsupported,
or fails.
No boundary-external bytes are accepted or published;
symbolic links are read transparently, and a link whose target is missing or unreadable
yields that file's per-file diagnostic;
explicit opt-in before Global reads; the loopback session API returns
complete authored source only for explicit detail requests, one file or comparison at a
time, with no confirmation step in front of the content and no notice in front of or
beside it;
environment-variable references are never resolved or substituted; inert text
rendering only. A displayed relationship kind
must belong to the maintained closed presentation-allowlist row for the supported
`(tool, kind)` and be recognized by the exact extractor for the actual admitted source form;
a reference failing either gate remains available only in complete source text and is never
inferred as a relationship. No allowlist stands between a declaration and its publication:
a skill's are the keys its file wrote, and an authored key set is not closed. Product surfaces are limited to syntactic
parsing, reading the value a parser resolves for a declaration the recognized kind publishes, frozen-catalog
classification, and projection of documented order, scope, condition, selection, and
reference relationships. Inventory, Detail, Comparison, Global controls, Diagnostics,
APIs, CLI output, and documentation never interpret or rank natural-
language meaning, decide validity/correctness/effectiveness/compliance/quality, advise
remediation, or lint, synchronize, convert, format, or fix customization content. Internal
validation of Inspector-owned manifests, registries, DTOs, and invariants is not a judgment
about a customization file. WCAG 2.2 Level A/AA acceptance uses the complete
bilingual criterion matrix above; English/Japanese documentation remains semantically
equivalent. The Inspector defines no product-specific ceiling for file bytes, aggregate
bytes, discovered files or entries, parser depth or nodes, diagnostics, graph records,
messages, request or response bodies, package assets, or retained session data. Capacity is
inherited from the supported Node.js runtime, parser libraries, operating system,
filesystem, browser, and current execution environment. Error handling is ordinary. A failure confined to one file — an unreadable file, binary
content, or a parser or extractor failure — becomes that file's actionable diagnostic
(FR-028), and when the rest of the traversal completes the scan commits a `partial`
generation containing every complete unaffected file. Invalid non-NUL UTF-8 alone is
instead a complete readable `utf-8-replaced` outcome. Any other unexpected failure fails
the affected attempt as an ordinary error: a request-owned session-API operation propagates
its failure to the caller as devframe serializes it — there is no sanitizing wrapper or
generic error envelope — while keeping the process, session, and prior committed snapshot
available (FR-030); an automatic startup operation with no request owner reaches the
process top level, with no process/session survival guarantee.

Relationship projection remains functionally limited to one direct hop from each
originating recognition and is non-recursive. This is a semantic/read-authority boundary,
not a resource quota. Generic relationships have zero read authority, and relationship
processing never follows a target or projects that target's relationships through the
originating edge. If parser, recognizer, or composition output would create a nested or
transitive relationship, the Inspector omits that projection before target access, retains
the eligible direct relationships and complete authored source, and emits an actionable,
source-value-free relationship diagnostic.
The authorized browser defines no heartbeat interval, request timeout, retry delay, or
memory lease, and no liveness probe. It purges on a
transport-reported channel loss or unsupported protocol, a session mismatch, a greater
content epoch, or a non-null disable fence — never on an ordinary request rejection. A lost host closes the loopback socket, which devframe
reports to the page without being asked, so process loss is detected without polling for
it. A page-lifecycle event is not among the triggers: FR-027 purges after a failure or an
equivalent terminal reset, and neither switching tabs nor navigating away is either, so the
client installs no visibility or unload listener.
Monaco receives complete authored source. If the browser or editor runtime cannot compute a
diff, the UI keeps the complete read-only side-by-side source available and reports an
actionable comparison failure without treating either artifact as valid or invalid. HTTP
delivery never truncates an API DTO.

Typed derivation is a vendor's own reader, running before the walk when it opens its seed
itself and after the walk when its seed is a file that walk admitted: it reads the seed its
vendor contract pins, takes the values that contract's declaration field holds, and expands them
into a plan of the same walk under a shipped derived rule's identity — a value the walk
compares to an entry name, or segments joined below the rule's fixed base when its contract
row builds a path. A derived candidate cannot seed another derivation, while an independent static
provenance on the same file remains eligible. Values used to
derive paths must satisfy the supported runtime and platform path representation. After
complete traversal, a parser or path failure confined to one file omits that derivation
with that file's diagnostic under the `partial` outcome before target access. A memory,
capacity, or other environment-resource condition has no application-defined classification
or recovery path when it manifests as a throw or rejection: it propagates to the
trigger-owning boundary, publishes no result from that attempt, and leaves any prior commit
unchanged. A deterministic returned derivation outcome may use only the closed complete or
partial transitions.

The coordinator imposes no product-defined wall-clock scan cutoff. Global disable, process
shutdown, and explicit operation cancellation irrevocably revoke publication authority.
Any outstanding Node.js filesystem promise then becomes cleanup-only: late bytes, results,
and DTOs are discarded. The API remains responsive
while the event loop can serve them, but physical cleanup cannot be promised before an
uncancellable kernel operation settles.

Packaged artifacts that ship together are never re-verified against each other at user
runtime: `dist/` is owned by the clean → `nuxt build` → tsdown pipeline that produced it,
the devframe host serves that tree as-is from `cli.distDir`, and exact-value assertions
about the packaged file set live only in the `verify:package` CI/release gate and the
package tests (Constitution Principle I).

Failures are reported as ordinary errors: per the Constitution § Quality and Safety Standards the product defines no
log-content rules and no sanitized error envelope, because it has no telemetry and its
terminal and UI output are read by the same user who owns the inspected files. A session-only
file-scoped `Diagnostic` DTO retains its minimum Source-relative Path as its actionable
location.

**Scale/Scope**: One local user, exactly one Repository source rooted at the
selected Repository root (the exact one-time invocation `process.cwd()` capture by default
or the accepted single `--root` value), zero
to four admitted member Global sources produced by one session-wide all-members
opt-in (at most one each for Copilot, Claude, and Codex), exactly one root per Source, and
at most two distinct readable customization files in a comparison, or one shown against its stated absent counterpart. Inventory size is governed by the supported runtime and
execution environment rather than a product-defined item ceiling.

## Constitution Check

_GATE: Passed before Phase 0 research and re-checked after Phase 1 design._

- [x] **Root-cause design**: One package and exactly one immutable root per Source solve the
      launch and inspection problem without a workspace split, repository picker, root
      discovery, static export, file watcher, or speculative extension system.
- [x] **Readable implementation**: `host`, `inspection/rules`, `recognizers`, `parsers`,
      and `session` own separate invariants; vendor behavior, Inspector
      matchers, runtime composition, and official evidence have four closed registries,
      while vendor-specific policy remains isolated and shared behavior stays small and
      explicit. Every module and exported name states what it is rather than what it
      resembles, and the longer name wins whenever the shorter one needs surrounding
      context to be understood (AGENTS.md § Naming policy).
- [x] **Dependency and public-contract governance**: The initial unpublished baseline has a
      reasoned no-migration-impact determination that T001 must confirm. Every accepted new
      or changed dependency and breaking public-contract change must record rationale,
      affected consumers/contracts/data/workflows, migration and compatibility steps, and a
      rollback/support path, or an explicit reasoned no-impact determination; missing or stale
      bilingual design evidence blocks T002, and missing bilingual validation evidence blocks
      release.
- [x] **Complete verification**: Byte hygiene is delegated to `.gitattributes` and
      `.editorconfig`; lint, typecheck, and the automated suites run locally and in
      independent CI jobs, and the release path re-runs none of them — a suite a pull
      request already ran against the same commit gains nothing by running again beside
      the publishing credential. Every repository remediation found by release review reruns the
      complete applicable automated matrix, invalidates and regenerates every affected
      candidate/profile/fixture/human or manual evidence set, and repeats complete-diff/tarball
      review until no concern remains. After the bilingual Constitution record is the sole
      planned validation-only edit, all applicable automated gates run once more against the
      frozen final tree and final candidate. Outcomes are captured outside the repository; any
      later repository edit invalidates them and returns to remediation, digest/evidence
      revalidation, applicable gate reruns, and complete-diff review before the final sequence.
      The independent ESLint gate and the independent strict `typecheck` type-checking gate
      are ci.yml's own jobs.
      The test layout covers unit, contract, integration,
      security, package, performance, end-to-end, error, boundary, and accessibility
      scenarios, including all four user stories, the ordinary-error failure model (a file-confined
      failure becomes that file's diagnostic in a `partial` generation per FR-028; any
      other failure commits nothing, retains the prior snapshot, and reports the failed
      request's error per FR-030),
      product-issued mutation and OS-atime separation,
      the product-wide FR-032 negative boundary, the complete bilingual 55-row WCAG Level
      A/AA acceptance matrix, the
      versioned digest-bound nonzero release-evidence denominators for SC-003/004/005/007,
      and the task material the first-use evaluation is scored against. That evaluation is
      twenty autonomous-agent sessions rather than a participant cohort, so no capture,
      seal, or reviewer protocol stands between running it and recording it.
- [x] **Documentation parity**: Every Phase 0/1 artifact has an English canonical file and
      a semantically equivalent `*.ja.md` companion. Implementation must update both user
      and contributor guides, all vendor/Repository/User/Global/surface tables, official
      evidence, security boundaries, and diagnostics.
- [x] **Safe boundaries**: Per the Constitution's trusted-workspace clause, the product
      runs in a workspace the user already trusts and inspected customization files are not
      modeled as an adversary; the three retained obligations — inspected content is never
      executed, the session host binds to loopback only and is never exposed beyond the
      initiating machine because served content may include the user's own secrets, and
      displayed content is rendered inert — anchor this design. The session host runs
      unauthenticated behind that loopback binding; the documented residual limitation is
      that other local processes and, via DNS rebinding, a malicious web page can reach the
      session while the inspector runs. The design freezes read candidates and keeps
      authored values reachable only through an explicit `FileDetail` request or comparison
      construction — never through an inventory or session response. The central full-session purge is
      distinct from ordinary scoped route/Source/generation cleanup, and Global disable is
      the explicit exception that invokes the full purge before its request. Deliberately inspected complete content
      remains inert, local, session-only, and absent from persistence and egress.
      Study capture adapters likewise classify raw traffic only ephemerally and discard it
      before IPC; retained evidence hashes only closed content-free safe events and rejects raw
      header names, framing, wire or encoded representations, every noncanonical derivative, bodies,
      content/metadata, participant responses, paths, URLs/authority values, capabilities,
      environment values, and raw errors. The sole exception is strictly validated decoded
      canonical safe `correlationId`, retained in the canonical payload and digest chain; captured
      wire/browser/Inspector bytes are never hash preimages.
      Session diagnostics may carry only actionable location fields. Failures are reported
      as ordinary errors: per the Constitution § Quality and Safety Standards, the product defines no
      log-content rules and no sanitized error envelope, because it has no telemetry and
      its output is read by the same user who owns the inspected files.
      Resource capacity is inherited from Node.js, parser
      libraries, the OS, filesystem, browser, and execution environment; recoverable
      failures, authority revocation, late cleanup, and fail-closed behavior are explicit. Product-issued
      mutation is prohibited and distinguished from OS-only atime effects. The design
      reads symbolic links transparently, yields per-file diagnostics for broken links,
      discards
      revoked/late bytes, and records the physically uncancellable-I/O residual risk with
      its resolution path.
- [x] **Welcoming participation**: One-package setup, reproducible pinned tooling,
      objective expected results, keyboard-first workflows, actionable errors, and
      automated plus manual accessibility gates keep the project approachable. The
      maintainer-owned release study publishes its necessity, accountable owner, funding,
      support, privacy, accessibility, and rerun policy and never shifts recruitment or
      review obligations to ordinary contributors.

### Post-design re-check

The data model distinguishes physical files and candidate provenances; documentation
status is a maintenance record on a registry, and what a product would do at runtime is
projected nowhere. The session API contract returns complete authored source and
declared authored values only to an explicit detail request over the loopback devframe
channel; the
bundled SPA requests one file or constructs one comparison at a time and shows the result
with no notice in front of or beside it. The session API neither
receives nor persists any acknowledgement or notice state, because neither exists. It provides no masking or reveal workflow, never
resolves environment-variable references, and emits only relationship kinds that belong to
the maintained closed presentation-allowlist row and are recognized by the exact extractor
for the actual admitted source form. The matcher contract
permits only explicit static or vendor-specific one-edge
derived candidates; relationships, components, vendor locators, and excluded inputs cannot
expand the read boundary. Relationship projection is limited to direct edges one hop from
each origin, is non-recursive, has zero read authority, and reports any attempted nested/transitive
projection with an actionable diagnostic before target access. Failure reporting matches
the Constitution's ordinary-error clause (§ Quality and Safety Standards): a file-confined failure becomes that file's
diagnostic, any other failure fails its attempt with the failed request's real error —
RPC-handler failures cross the devframe channel as devframe serializes them — and no
sanitized envelope, generic error entity, or log-content rule remains in the design. The quickstart covers every stable behavior, rule, strategy, and
source ID, official-source drift review, the typed segment-array selector grammar and its
contract-gate rejections, lint and the remaining tests, all
other required quality gates, and all four end-to-end stories. Monaco is
client-only, same-origin, and model-lifetime scoped; its own diff engine avoids a
duplicate dependency while exact authored metadata comparison stays explicit. The
product-owned browser launcher confines product child processes to startup opening —
on macOS the fixed process-list probe and fixed tab-reuse script through the OS
`osascript` automation host, otherwise the maintained `open` package's fixed startup OS
helper; every spawned process receives only fixed arguments and the
printed loopback origin — no inspection-derived content/path, authored value, or user
command — and inherits the launch environment unchanged, into which the product writes no
inspection-derived value; lexical equality with a
Source root changes no provenance and grants no authority. Package gates
assert the approved direct production dependency set from `package.json` and the
`pnpm-lock.yaml` closure, while the committed lockfile pins each resolved version with its
integrity hash, so the production payloads stay byte-pinned by their
digests; third-party development/test tooling remains outside the published FR-038 boundary. The
one recorded residual verification limitation is the lack of hard cancellation for a
stalled kernel filesystem operation: disable, shutdown, or cancellation revokes publication
authority and discards late results, but physical completion awaits the operation. It is not
treated as passing-test proof or an implicit waiver. No unresolved
clarification or known constitutional violation remains. The frozen outcome-fixture
manifest and digest close the SC-003/004/005/007 release denominators and fail any
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
src/
├── app/
│   ├── App.vue
│   ├── router.options.ts   # page identity, page-change scroll, and the inventory return point
│   ├── worker-modules.d.ts
│   ├── components/
│   │   ├── inventory/
│   │   ├── inspection/
│   │   ├── skill-comparison/
│   │   ├── consent/
│   │   └── diagnostics/
│   ├── composables/
│   │   ├── skill-comparison.ts
│   │   ├── filters.ts
│   │   ├── monaco.ts
│   │   └── monaco-languages.ts
│   ├── session/
│   │   ├── api-client.ts
│   │   ├── client-data.ts
│   │   └── view-state.ts
│   ├── pages/
│   │   ├── index.vue
│   │   ├── repository.vue
│   │   ├── global-consent.vue
│   │   ├── skills/compare/[family].vue
│   │   └── skills/detail/[source]/[...path].vue
│   └── styles/
├── server/
│   ├── cli.ts
│   ├── host/
│   │   ├── devframe-app.ts      # devframe app definition: RPC session API + createDevServer wiring
│   │   └── global-consent.ts    # Global consent/enable/retry/disable RPC handlers
│   ├── inspection/
│   │   ├── scan.ts
│   │   ├── rules/
│   │   │   ├── registry.ts
│   │   │   ├── copilot.ts
│   │   │   ├── claude.ts
│   │   │   └── codex.ts
│   │   ├── recognizers/
│   │   │   └── candidate.ts
│   │   └── parsers/
│   │       ├── extraction.ts
│   │       ├── json.ts
│   │       ├── markdown.ts
│   │       └── toml.ts
│   └── session/
│       ├── scan-generation.ts
│       ├── stale-failures.ts
│       └── session.ts
└── shared/
    ├── api-types.ts
    ├── api-text.ts               # what api-types' closed unions read as on screen
    ├── diagnostics.ts
    ├── entities.ts
    ├── rejection-codes.ts
    └── registries/
        ├── identifier-types.ts       # closed BehaviorId/StrategyId/RuleId unions
        ├── behavior-types.ts         # record shapes, one per registry
        ├── strategy-types.ts
        ├── rule-types.ts
        ├── relation-types.ts         # the edge kinds between the registries
        ├── evidence-types.ts         # on-record citations
        ├── maintenance-data.ts       # the build flag that drops data the product never reads
        ├── vendor-behaviors.ts       # aggregates: the public surface
        ├── inspection-rules.ts
        ├── runtime-composition.ts
        ├── relations.ts              # the graph the recognizer walks
        └── codex/                    # one directory per vendor, four files each
            ├── behaviors.ts
            ├── strategies.ts
            ├── rules.ts
            └── relations.ts

tests/
├── unit/
├── contract/
├── integration/
├── security/
├── package/
├── performance/
├── e2e/
├── usability/
│   ├── sc001-sc006-study-kit.md
│   ├── sc001-sc006-study-kit.ja.md
│   └── sc001-sc006-study-inputs/
│       ├── guidance.md
│       ├── guidance.ja.md
│       ├── task-prompt-sc001.md
│       ├── task-prompt-sc001.ja.md
│       ├── task-prompt-sc006.md
│       ├── task-prompt-sc006.ja.md
│       ├── task-prompt-comparison.md
│       ├── task-prompt-comparison.ja.md
│       ├── task-prompt-consent.md
│       ├── task-prompt-consent.ja.md
│       ├── prepared-state.json
│       ├── prepared-state.ja.json
│       ├── response-form.json
│       ├── response-form.ja.json
│       ├── ground-truth.json
│       ├── ground-truth.ja.json
│       ├── scoring-rubric.json
│       └── scoring-rubric.ja.json
└── fixtures/
    ├── conformance/
    │   ├── vendor-behaviors.json
    │   ├── inspection-rules.json
    │   ├── runtime-composition.json
    │   └── relations.json
    ├── outcomes/
    │   ├── manifest.json
    │   └── manifest.sha256
    ├── repositories/
    ├── global-homes/
    └── secrets/

scripts/
├── clean-build-output.mjs
├── verify-package-files.mjs
├── check-official-sources.ts

.github/workflows/
├── ci.yml
└── Release.yml

package.json
pnpm-lock.yaml
nuxt.config.ts
tsconfig.json
eslint.config.js
tsdown.config.ts
playwright.config.ts
vitest.config.ts
.gitignore
AGENTS.md
AGENTS.ja.md
README.md
README.ja.md
LICENSE
```

**Structure Decision**: Place all production source under `src/` — `src/app/` for the
browser SPA, `src/server/` for the Node-only CLI/host/inspection code, and `src/shared/`
for isomorphic contracts — because the UI
and CLI are released and versioned together. Nuxt is configured as an SPA (`ssr: false`)
with the static Nitro preset, `app.baseURL: '/'`, `app.buildAssetsDir: '/_nuxt/'`, no CDN
URL, explicit imports, and component auto-discovery disabled. Every nested client route
therefore resolves the same root-absolute, same-origin asset URLs. A detail route belongs
to the recognized kind whose surface it is, which is why `/skills/detail/<source>/<the
SKILL.md's source-relative path>` names `skills` rather than the file: what a detail shows is a
skill's declarations, its instructions, and its directory, and another kind's detail
answers different questions with a different layout. Which file of that directory is being
read is a `file` query beside the address, so the subject stays the customization the page
describes. Every recognized kind with a detail surface ships its own route of this shape, and a
phase that recognizes a new kind brings that kind's route and page with it. A Source's own
state is a route of the same standing: `/repository` states the Repository Source's root,
status, generation, and rescan, and `/global-consent` already states the personal setup's,
which is why only the first of the two is new (FR-030). The `src/server/cli.ts` entry
starts with the exact BOM-free, LF-terminated first line `#!/usr/bin/env node`, tsdown
preserves that shebang in the packaged `dist/cli.mjs`, and `package.json.bin` maps to it
directly with no separate bootstrap wrapper: same-tarball artifacts are never re-verified
at user runtime, and the packaged entry points are enforced by the `verify:package`
CI/release gate. Root selection itself is purely lexical: capture `process.cwd()`
once, keep an absolute `--root` or resolve a relative one against that capture. The
inspection I/O contract is directory-level ownership: all inspected-source filesystem I/O
lives only under `src/server/inspection/`, and no other module enumerates or reads
inspected sources.

`src/app/session/` holds the session transport and lifecycle modules — the shared
client-data purge (`client-data.ts`), the guarded RPC client (`api-client.ts`), and the
reactive browser view state they feed (`view-state.ts`), which installs no page-lifecycle
listener.
`client-data.ts` is the dependency leaf and imports nothing, so the API client and the
view state observe the same `clientDataEpoch` without a module cycle. There is no liveness
module: a probe of its own would duplicate the transport's connection-status signal, which
covers host loss, and the response-path epoch/fence checks, which cover the rest. They live
outside `src/app/composables/` because none of them is a Vue composable: each is a class
that owns instance-local state (`#`-private) and is constructed once, so filing them under
a directory whose name promises `use*` reactivity would misdescribe them.

The document is the one scroll container, and the shell's two frames stay on screen by
sticking rather than by being fixed: a fixed frame is out of flow, and the page would gain a
second scroller. The bar sticks to the top of the document and the rail just below it, so the
search, the scan commands, and the kind list are all reachable sixty rows down. The bar carries
its own spacing rather than sitting inside the page's top padding, because padding above a
sticky element is the distance it travels before it pins — which a reader sees as the header
jumping on the first scroll. What the rail is offset by is a token, since CSS cannot read the
bar's height; the browser suite asserts the two agree. A focused element is kept clear of the
bar by `scroll-padding-block-start` (WCAG 2.4.11), and below the two-column width the rail
returns above the rows and stops sticking, where a following rail would cover the row it was
used to choose.

The shell is a bar over a rail beside the rows. The bar carries what applies to every route
— the product name, the one search, and the colour-scheme control — together with the
inventory's own scan commands, which are there because the inventory is the one surface with
no panel of its own to carry them: each Source's state surface states its scan and commands
it there, so a bar command on those routes would be the same control twice on one screen.
The rail carries what decides which rows are on screen: the Source families with their
statuses and the way to each family's own state surface, then the closed kind catalog, then
the two lists that are lists of files without being a kind's inventory, `Files in no kind`
and `Source diagnostics`. Membership of the rail follows from that one test: a list of files is a
rail entry, and a Source's state is a route. Nothing in the rail carries an icon — a mark
beside `Rule` or `Hook` adds no information a reader gets before the word, and it moves
every label off a shared left edge, which is what a rail is scanned down — so the icons
this UI ships are the ones that carry meaning: the vendor marks, and the operation glyphs
on the search, rescan, colour-scheme, disclosure, and leave-the-page controls.

The palette is three surfaces, one product accent, and a border token, defined as literal
values with the system-colour palette kept as the forced-colors fallback. The system-colour
palette alone gave the shell two surface steps mixed from `Canvas` and `CanvasText`, which
draws a panel, a row, and the page as one plane whose boundaries a reader has to find by
following hairlines; and an `AccentColor` that follows the operating system is an accent
whose contrast against those surfaces is a different number on every machine, so no
measured judgement about it holds anywhere but where it was measured. Literal values make
the boundary and selected-state contrast one number this repository can measure and keep
(WCAG 1.4.11), and `forced-colors` returns the whole palette to the reader's own system
colours, where their choice outranks the product's. The vendor marks are the one place a
colour is not inherited, and the reason and its limits are the Icon policy's (AGENTS.md).

User-visible UI copy is written in the component that renders it; there is no message
catalog. The UI ships one language, so QR-004's bilingual obligation
is on user and contributor documentation and on the WCAG applicability matrices, not on the
running screen: the manual accessibility matrix has no locale axis and the shell states a
fixed `lang="en"` rather than negotiating one. A catalog keyed by message name would
therefore only add a lookup between a key and its one string. The exception is text a
closed union fixes — a Source status, a boundary origin, a Diagnostic code — which is
declared beside that union in `src/shared/entities.ts` and `src/shared/diagnostics.ts` so a
new member cannot compile without its text, and so the server and the browser read the same
vocabulary from one place. Where the union is declared in a `-types` module that ships no
runtime code, its table is the `*-text.ts` companion beside it: `src/shared/api-text.ts`.
This is also what keeps a contract
identifier off the screen. A rule ID, a behavior or strategy ID, and a matcher lookup base are tokens a
registry record is keyed by and a gate is checked against, so every surface renders the
statement the token names, and the DTO field carrying it is typed as its closed union rather
than as `string` so the table cannot fall behind the catalog.
`validation.md` and `validation.ja.md` record final SC evidence and
remain semantically equivalent. CI and release ownership is explicit under
`.github/workflows/`, including documentation parity, package exact-set, and release gates.

Task generation preserves the original family-vertical delivery order rather than
stable-partitioning all P1 work ahead of all P2 work. Setup and the blocking secure
foundation run first. Each family then completes its US1 discovery and US2 complete inert
detail before its US3 comparison, and only then advances to the next family in this exact
order: SKILL (including Skill Metadata) → Instructions → MCP → Rules → Commands → Copilot
Prompts → Custom Agents → Configuration/Settings → Output Styles → Plugins → Hooks.
Repository-wide Inventory, Detail, and Comparison Acceptance follow in that order;
Global inspection (US4, P3), cross-cutting verification, and release evidence remain
last.

The three registry modules have distinct ownership even though one validator loads them as
a closed graph. `vendor-behaviors.ts` mirrors documented vendor lookup statements;
`inspection-rules.ts` alone carries static/derived matcher read authority; and
`runtime-composition.ts` carries strategy and relationship-only policy. Evidence has no
module of its own: each maintained record states its citations in an `evidence` array, so
the basis sits beside the claim it supports rather than in a parallel map that can drift
from it, and the packaged CLI compiles those citations out. The conformance JSON fixtures
mirror those modules, require reciprocal IDs,
and fail the build on duplicates, orphan references, unanchored evidence, or an Inspector
Repository matcher whose authored segment program violates the closed token grammar (for
example adjacent recursive-directory segments).

Each registry module owns the exact `documentationStatus` and `lifecycleQualifiers` on its
own subject records. They are maintenance records: no response carries one, and nothing in
the product assembles or reads them. The contract gate reads them from the records
themselves, rejects missing or duplicate subjects, and sorts by the fixed subject-kind/ID
order.

The Presentation Allowlist sections in the three maintained vendor contracts are a separate
normative design input. Before the first parser, recognizer, API, or UI detail task, those
sections enumerate every supported `(tool, kind)`, the admitted source forms covered by its
row, and its relationship-kind set in both languages. A row lists no metadata field
catalog: a skill's declarations are published by the keys the file wrote, so there is no
closed set of them to enumerate. Effective
eligibility is a two-gate decision: tuple membership plus the exact source-form extractor
described by that row. A kind listed for one source form is never transplanted into another
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

The build first removes only the root-resolved package-owned `.output/` and
`dist/` trees. It runs `nuxt build`, which emits the browser application directly into
`dist/public` via `nitro.output.publicDir` while build metadata stays in `.output/`, and
then runs tsdown. There is no staging copy, post-build validator, asset manifest, or
CSP-hash step: the emitted tree is served as-is by the devframe host from `cli.distDir`
(`dist/public`), and packaged-artifact assertions live only in the `verify:package`
CI/release gate and the package tests, because the pipeline that just produced `dist/`
owns its contents (Implementation simplicity policy).

`package.json` owns the runnable command graph. Its `build` script sequences the fixed
clean step, Nuxt client build, and tsdown `cli`
build. The separate `verify:package` script runs the
packaged entry-point verifier `scripts/verify-package-files.mjs`, which requires exactly
`dist/public/index.html` and `dist/cli.mjs`; it is a CI and
release gate rather than part of every local
build, because packaged-artifact verification belongs to that layer. The package tests
assert the approved production-leaf set; the locked versions and their integrity stay owned
by the committed lockfile, and no separate production-graph script or evidence file exists. Its `typecheck` script runs the strict
TypeScript type check over the application, shared, source, script, and test code configured
in `tsconfig.json` and is a required quality gate in local verification and in its own
independent CI job. CI runs `format:check`
as its own job. `check:official-sources` is the only
documented network-enabled evidence-drift command. The `src/server/cli.ts` entry,
`tsdown.config.ts`, assembly scripts, and these package scripts are foundation prerequisites:
no build or package quality gate may be scheduled before they exist.
Setup therefore configures the formatter and scaffolds the CLI entry plus every referenced assembly
script before it configures or executes package commands, tsdown entries, or CI quality
gates. The Setup stage is not considered runnable until those paths exist.
Production `dependencies` is the caret-declared direct set `devframe`, `env-editor`, `gunshi`, `h3`, `open`, `smol-toml`, `strip-json-comments`, `vfile`, `vfile-matter`, `which`, and `yaml`,
asserted from `pnpm-lock.yaml` by `tests/package/production-graph.test.ts`;
devframe's and `open`'s transitives are lockfile-owned.
Nuxt/Vue/Vite/tsdown, Monaco, Playwright, and other build/test tooling remain development-
only.

Cross-platform CI runs the same pure Node.js inspection-filesystem integration suite on
macOS, Linux, and Windows. tsdown uses the single named `cli` entry
(`src/server/cli.ts`), `fixedExtension: true`, direct `dist/`
output with `clean: false` (the pipeline's own clean step owns `dist/` removal), disabled
source maps/declarations, Node ESM, bundled
project modules, and external declared runtime dependencies via
`deps.skipNodeModulesBundle: true`. The pipeline's
clean step guarantees a fresh `dist/`, so every dist-root `.mjs` is by construction a
tsdown output; the `verify:package` gate requires
`cli.mjs` as a regular file. The bundled parsers run in-process on the scan path,
so the CLI bundle is the only tsdown entry.

The `verify:package` gate requires exactly the two packaged entry points —
`dist/public/index.html` (the SPA shell the devframe host serves) and
`dist/cli.mjs` — as regular files
before `npm pack`; the rest of `dist/` is owned by the clean → `nuxt build` → tsdown
pipeline that just produced it, so no recursive re-verification duplicates that
ownership. No install-time build or download occurs. `package.json.files` is exactly
`["dist", "docs/images", "README.md", "README.ja.md", "LICENSE"]`; npm also includes
`package.json`, so the tarball allowlist is `dist/` plus those four entries and their
contents, with no source, fixtures, or planning artifacts. The package is CLI-only:
`package.json.bin` is exactly `{ "agent-customization-inspector": "dist/cli.mjs" }`, while
`main`, `module`, and `exports` are absent so no nonexistent library entry point is
advertised. The package test verifies the bin target's exact preserved shebang, launches the
built `dist/cli.mjs` the bin points at, observes the loopback URL, and terminates it. That
proves the Nuxt assets, CLI, and inspection layer resolve from their built locations. It does
not prove the packed tarball: installing one into an isolated fixture and launching it
through `npx --no-install` is T917, which the release gate owns.

The package gate asserts the approved direct production dependency set — exactly those eleven
names and no others — from `package.json` and the `pnpm-lock.yaml` closure, so any new
production dependency fails until the research.md § 3 decision is explicitly revisited. The
committed lockfile owns each resolved version and its integrity hash, which is what keeps
the production payload bytes fixed. Payload content scans — native/binary/Wasm magic, shell-helper and shebang audits,
lifecycle-disabled and network-disabled install runs, and the cross-OS shim audit — and
per-dependency version and integrity-hash assertions are out of scope: they are properties
of the exact hash-pinned payloads, established once at dependency review, and re-scanning
content the integrity hash already fixes — or restating in a test the values the lockfile
already pins — is the redundant re-verification Constitution Principle I excludes.
Install-time lifecycle and network enforcement belongs to the package manager's own
configuration.

## Implementation Boundaries

- All inspected-source filesystem I/O lives only under the `src/server/inspection/`
  directory; no module outside it enumerates or reads inspected sources. This is
  directory-level ownership rather than a single authority file. Traversal is an ordinary
  recursive `node:fs/promises` walk of the fixed inspection-path allowlist compiled from
  the typed matchers: Repository plans walk downward from the selected Repository root
  through their explicitly represented descendant programs, while Global plans touch only
  the documented member paths — an exact target checks only its own path, and a fixed
  subtree program enumerates only that subtree; neighboring Global
  paths receive no I/O. Traversal and reading follow symbolic links transparently,
  because the inspector shows what an agent reading the same path would see; recursive
  traversal tracks visited directories by real path so a link cycle cannot prevent a scan
  from terminating, and a link whose target is missing or unreadable yields the
  file-scoped `file-unreadable` diagnostic. Hard links are
  ordinary files. Raw entry names are the only filesystem operands, and joined with `/`
  they are the published Source-relative Path. Client-supplied paths never authorize
  I/O; reads are driven by the compiled allowlist plans and server-owned identifiers only.
- Per-file problems use the closed Diagnostic registry: `root-unreadable` (source scope;
  error), `file-unreadable` (file scope, error),
  `file-content-binary` (file scope, warning), and `recognition-parse-failed` (file scope,
  warning). A selected Repository root that does not exist or cannot be read as a
  directory fails that scan with the source-scoped `root-unreadable` diagnostic while the
  session stays usable, and the attempt publishes no partial inventory (FR-002). A
  consented Global root that is missing or unreadable records that tool as absent or
  failed without blocking sibling tools. A file that cannot be read — including a symbolic
  link whose target is missing or unreadable, or a file that
  disappears between discovery and reading — yields `file-unreadable` without affecting
  other files.
- Error handling is ordinary: a failure confined to one file becomes that file's
  diagnostic, and the scan publishes public status `partial` with every complete unaffected
  file (FR-028); any other unexpected failure propagates as an ordinary error from its
  request-owning session-API handler — devframe serializes the RPC failure for the caller,
  with no sanitizing wrapper — or reaches the process top level for automatic startup work
  with no request owner; either way it commits nothing from the attempt and retains the
  prior committed snapshot (FR-030).
- All inspected-source filesystem work is coordinated with scan serialization so generation
  publication cannot overlap or interleave.
  Opens use read-only flags; the inspection directory exposes no mutation-capable open,
  write, truncate,
  create, rename, delete, link, chmod/chown, utimes, xattr, ACL, or equivalent operation.
  Safety tests instrument the calls and compare bytes, length, identity/link state, mode,
  mtime, ctime, and observable xattrs/ACLs before and after; OS-only atime changes are
  recorded separately and prove neither failure nor success. Global disable, process
  shutdown, or explicit cancellation revokes the attempt's publication authority. A
  pending promise may perform only cleanup when it settles; late bytes, diagnostics, graph
  changes, and DTOs are discarded. The design does not claim physical
  cancellation before Node.js and the kernel report the operation settled.
- The three registries form one validated reference graph but grant different authority.
  Vendor behavior records describe upstream lookup without authorizing I/O; only static
  and typed derived Inspector rules authorize reads; runtime strategies project order,
  conditions, and relationship-only edges; official source records provide evidence and
  never change a rule automatically. Every Repository selector is authored directly as a
  typed segment-array program — literal, regex, and non-adjacent recursive-directory
  segments compose descendant/direct-child/subtree rules without a general glob engine or
  a glob-looking string form — and compiles deterministically into the immutable versioned
  `TraversalPlan` data. Copilot VS Code, CLI,
  and Cloud behavior, and each vendor's Repository versus User/Global behavior, remain
  independently addressable rather than sharing an inferred traversal. Global preview
  entries are the frozen lexical roots of the one server-retained record identified by its
  opaque `previewId`; what would be read below an admitted root is bound by the retained
  `allowlistVersion`/`traversalPlanVersion` pair. The only content-dependent scheduler branch is the exact
  `codex-global-first-non-empty` policy: it probes `AGENTS.override.md`, short-circuits
  on non-empty content, advances to `AGENTS.md` only when the override is absent or read
  as empty, and publishes at most one Codex Global instruction file. After one
  optional leading BOM is removed, empty means exactly
  `decodedText.trim().length === 0` under the supported ECMAScript runtime. A decoded
  `utf-8-replaced` string participates unchanged, so any `U+FFFD` makes it non-empty unless
  other non-whitespace text already does. A binary or unreadable override ends the branch
  with its file-scoped diagnostic and no fallback (FR-035).
- Static matchers and the vendors' configuration readers — one per shipped
  `bounded-derived-candidate` rule — are the only candidate read authorities. The one read they do not cover is a
  census-listed file's, which no admission authorizes and which stays inside one of two
  bounds: the admitted candidate's own directory, or the Source-relative plugin root a
  validated catalog entry's local source names — validated against the vendor's documented
  local form and contained in the same Source (contracts/inspection-path-allowlist.md
  § Bounded companion census) — which is how a skill's sibling `agents/openai.yaml` and a
  declared plugin's files are published (contracts/vendors/openai-codex.md § Derived
  Repository rules). The derivation schema pins a static seed
  provenance/rule/kind, closed declaration field/syntax, seed-relative or source-root base,
  fixed placement/suffix, and deterministic target construction; callback, arbitrary path join, free-form expression,
  glob, and recursive derivation are unrepresentable. Derived segments pass the host-independent closed spelling grammar
  and must resolve to exactly one enumerated allowlisted entry before read,
  so ADS, device, and trailing-dot/space spellings
  are rejected before the file is opened. FR-015 through
  FR-018 and FR-045 limit Global reads to the four members' frozen rule catalogs even when
  the vendor behavior registry records other supported User customizations.
- Tool recognizers attach exactly one `ToolRecognition` per `(file, tool, kind)` and sort
  them by the closed tool/kind order. Compatible admissions merge provenances; incompatible
  parsed meanings fail only that recognition's all-or-nothing extraction. A recognition retains every accepted independent
  candidate provenance for the one underlying file. A parser or extractor failure is
  file-confined: it discards only that recognition's derived metadata and relationships
  under the file's `recognition-parse-failed` diagnostic and the `partial` outcome, while
  the complete readable source stays displayed and comparison-eligible (FR-028). Recognizers may parse declarations as
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
  serialized as an authored target. A public provenance names the rule that authorized
  the read and the Source-relative path it matched, and nothing further: where a
  customization would apply and in what order are projections no surface makes. A derived candidate's
  admission names the derived rule that expanded it, exactly as a static candidate's names
  the rule whose plan matched.
  In particular, Repository-root `.mcp.json` merges the Copilot CLI provenance and the
  exact VS Code 1.118+ path-only provenance without another file/read. CLI `mcpServers`
  extraction remains provenance-specific; the VS Code provenance adds no schema fields or
  inferred winner while the registered release-note/current-guide conflict remains open.
- No module projects whether a product would use an admitted file. Documentation status,
  product surface, runtime `cwd`/target, trust, approval, enablement, selection, agent
  context, tool availability, installation, instruction-byte budget, managed policy, and
  external state are runtime inputs this tool never observes, and a recognition says
  nothing about any of them. Codex user/profile fallback names, `project_doc_max_bytes`,
  project roots outside Global instructions-only consent, Copilot surface differences,
  Claude's exact-launch-directory project settings, direct-child-only Codex rule files,
  and authored-but-not-activated plugin manifests are all cases of the same rule: what a
  vendor does with a file is that vendor's documentation, not a fact this product derives.
  Source-level facts retain the tool, explaining rule, and affected
  candidate/relationship-rule IDs instead of fabricating a source file relationship.
- The official-source registry gives each behavior, rule, and strategy reciprocal stable
  evidence IDs, canonical official HTTPS URLs, exact section anchors, and review dates.
  Offline contract/build validation loads checked-in records;
  only the explicit maintainer drift command may fetch those pages. Startup and scans do
  not access documentation or copy remote page text into the package.
- Decoding begins after the file's bytes are read.
  Any `0x00` byte produces `encoding: binary` with no `sourceText` and no comparison
  eligibility; for an admitted candidate it also produces the file-scoped
  `file-content-binary` diagnostic and makes an otherwise publishable generation
  `partial`, while a census-listed companion's binary bytes are the ordinary fact of an
  asset (FR-025). All other bytes are decoded exactly once as UTF-8 with replacement
  semantics. Exactly one leading UTF-8 BOM is recorded as `hadLeadingBom` and removed
  from `sourceText`; the encoding is orthogonal to that record — input decoded without
  replacement uses `utf-8`, and any replaced invalid sequence uses `utf-8-replaced`.
  Every resulting `U+FFFD` remains in the complete `sourceText` passed to parsing, display,
  extraction, and comparison. No charset detection, alternate decode, sampling, or
  truncation occurs, and the `utf-8-replaced` outcome alone does not make a generation
  partial.
- Parsers use safe modes only: YAML 1.2 core schema, which resolves an alias to the value it
  points at and leaves the scalar an unresolved tag carried — what a product loading the file
  reads, and not something this tool refuses; JSONC tree extraction of known fields, TOML lexical-span extraction
  paired with semantic normalization without executing values, and Markdown/frontmatter
  extraction without HTML rendering. Each declaration the recognized kind publishes carries
  one entry holding the value its parser resolved, in the order that kind publishes — a
  skill's is the order its file wrote; a key declared twice resolves to one value, so there
  is no occurrence index. No entry carries source coordinates: nothing points into
  a document, and a range beside the value taken with it asserts nothing further. A fixed
  registry-defined relationship default has null authored text and an explicit
  `documented-default` origin. All parser work runs in-process on the scan
  path with the bundled parser libraries. Parsing capacity
  follows the supported Node.js runtime, parser libraries, browser, operating system, and
  execution environment, and the Inspector sets no product-defined V8
  heap/stack, parser-depth/node/scalar, or wall-clock extraction ceiling. A
  parser or extraction failure for one file — a missing, ambiguous, illegally overlapping,
  or non-round-tripping span, a thrown or rejected parse, or another parser/extraction
  outcome confined to that file — is file-confined under FR-028: it discards that
  recognition's complete extraction result, including its relationships and derivation
  declarations, records the file's `recognition-parse-failed` diagnostic, and leaves
  the complete authored source, comparison eligibility, and other successful recognitions
  usable in a `partial` generation. A failure outside any single file instead fails the
  affected attempt and is reported as an ordinary error at its request-owning
  boundary. No parser or
  presentation step resolves environment-variable
  references or performs credential detection, masking, or redaction. Decoding an authored
  literal is mechanical; a decoded value never carries a natural-language interpretation, rank, validity/correctness/effectiveness/
  compliance/quality verdict, or remediation advice. The same prohibition applies to every
  inventory, detail, comparison, Global-control, Diagnostic, API,
  CLI, and documentation projection.
- The Node host is devframe 0.7.5: the CLI starts the app definition through
  `createDevServer` from
  `devframe/adapters/dev`, sets `auth: false`, and binds the loopback `localhost` only. devframe serves
  the built SPA from `cli.distDir` (`dist/public`) and owns port selection and host
  binding, while startup browser opening is product-owned — the macOS Chromium tab
  reuse in front of the `open` package's helper (research.md § 3) — with devframe's
  bundled opener disabled; the session API is the set of devframe RPC functions
  declared with `defineRpcFunction` in the app definition's `setup`
  (`src/server/host/devframe-app.ts`); the same channel also carries devframe's own
  built-ins (`devframe:agent:*`, `devframe:rpc:server-state:*`, `devframe:streaming:*`),
  which the framework registers unconditionally and this product leaves empty and
  unused, while the editor/finder helpers (`devframe:open-in-editor`,
  `devframe:open-in-finder`) live in opt-in recipes this product does not import. The
  product adds no per-session token, Origin/Host check,
  hand-written router, or product-owned static-file layer; protection is the loopback
  bind, and the residual exposure of an
  unauthenticated loopback host — other local
  processes and, via DNS rebinding, a malicious web page — is the documented limitation
  recorded by the Constitution § Quality and Safety Standards. devframe applies an origin
  gate of its own to the WebSocket upgrade, which is why no product-owned check stands
  beside it; it is not what bounds that limitation (research.md § 8). `package.json.bin`
  maps directly to `dist/cli.mjs`. Node.js
  compatibility is declared only through the packed `engines.node` range
  `^24.11.0 || ^26.0.0` and enforced by the package manager's engines mechanism; the
  CLI re-checks neither the declared string nor the running version, and the packed
  exact string is asserted by the package tests rather than re-compared at runtime.
  Session API payloads use IDs rather than caller-supplied filesystem paths. An
  unexpected RPC-handler failure propagates out of its handler and crosses the devframe
  channel as devframe serializes it — there is no sanitizing wrapper or generic error
  envelope; the startup path has no catch, so an ownerless rejection reaches the process
  top level. At session startup, before editor-launcher discovery, the CLI constructs one
  immutable Global root-input capture: it reads `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and
  `CODEX_HOME` exactly once in that order, treats only `undefined` as absent, and calls
  imported `node:os.homedir()` exactly once unconditionally — the shared agent home always
  derives from it (FR-013, FR-045). It uses active-platform
  `node:path.join` with the fixed `.copilot`, `.claude`, and `.codex` suffixes only for
  absent tool entries, derives `.agents` from the same one capture, and never
  independently chooses `HOME` or `USERPROFILE`. The same immutable capture supplies the
  eligible root exclusions for editor lookup and every no-I/O lexical consent preview the
  server later retains as the one record identified by its opaque `previewId`; preview
  creation never rereads process inputs.
  Proposed roots are represented and escaped with the supported Node.js, browser, and
  platform string/path facilities rather than product-defined byte ceilings. A throw while
  the startup path captures, classifies, or escapes those inputs fails before a session or
  browser exists. Each later preview request constructs a complete preview object before it
  replaces the current one, so a construction throw/rejection leaves the prior preview
  current. DTO construction or transport serialization can fail after the new preview
  becomes current; that is the request's ordinary error, and the created preview may remain
  retained. Neither failure creates authority or a job. Each accepted entry also retains an internal exact raw
  `lexicalRoot` beside its escaped display in that record. Enable uses only the stored raw
  value, never reverses `displayRoot`, and never rereads the environment.
- Startup browser opening is product-owned through the startup opener: the CLI prints the
  plain loopback origin once before the host runs it inside the closed child-process
  surface permitted by FR-022 — on macOS the fixed process-list probe and the fixed
  tab-reuse script through the OS `osascript` automation host in front of the fixed
  operating-system browser-launch helper, elsewhere that helper alone (research.md § 3) —
  devframe's bundled opener stays disabled so only the product's opener runs, and
  `--no-open` disables the attempt without creating any child process. Every
  spawned invocation receives only fixed arguments and the printed loopback origin — no
  inspection-derived content or path, authored value, or user-supplied command;
  no Source root, preview root, candidate path, file path, or authored value is copied
  from inspection state into argv or the inherited-unchanged environment, and lexical
  equality between such a
  value and ambient environment text never changes provenance or grants read authority.
  The fallback helper delegates only navigation to the platform's own resolution — the
  user's own configuration such as `$BROWSER` included — and beyond the fixed-list reuse
  choice the product
  does not select or verify a browser family/version; neither a successful reuse nor a
  successful open is compatibility evidence. If automatic opening is disabled, unsupported, fails, or the
  handler or its resolved browser is unavailable, cannot be identified, or is outside the
  release-certification baseline, the server keeps running and the printed URL plus
  `--no-open` provide the documented manual-opening fallback in a certified browser
  (FR-001). Tests instrument the launch path to prove the argv/environment boundary
  instead of re-implementing a product-owned platform map beside the `open` package. The one
  terminal launch line is presentation output.
- The session API returns inert DTOs and complete authored values only for
  an explicit detail request. The bundled browser requests one file or constructs one
  comparison at a time and shows the result with no notice and no
  confirmation step in front of it, because the session is loopback-bound and the files are
  the viewer's own. Complete source text, declared authored metadata, authored relationship
  targets, and either comparison side are therefore reachable only through those explicit
  requests, never through an inventory or session response. A route close, ordinary file or
  Source removal, selection replacement, or generation replacement disposes only its scoped
  models and is not itself the central purge.
  Global disable is different: the action invokes the central purge before sending its
  request, and observing a greater `globalContentEpoch` or non-null disable fence repeats
  that purge before rendering.
  No acknowledgement is
  sent to or persisted by the API, because none exists. It renders source through Vue
  components and the ESM build of `monaco-editor`, never `v-html`. Single-file source
  models and both sides of a source comparison are read-only, use opaque in-memory URIs,
  set `readOnly`, `domReadOnly`, `originalEditable: false`, `links: false`, and
  `renderMarginRevertIcon: false`, and contain the complete authored text without resolving
  environment-variable references. `accessibilitySupport`
  stays `auto`, `accessibilityVerbose` is enabled, and each view has an `ariaLabel`.
  Monaco's diff editor owns literal source comparison; tool recognition is compared per
  tool, and a file's declared metadata is compared once — serialized to one canonical
  document per side, which the diff editor mounts beside the source, rather than
  field-matched and rendered in Vue. The parse behind it runs once per `(file, kind)` for
  the Markdown kinds and once per `(file, tool)` for the custom-agent kind, whose split is
  the admitting rule's own reading.
  Repository comparison acceptance first uses two distinct readable current-generation customization files from the
  same Repository Source; only after a successful Global commit does US4 verify two
  consented homes' readable files of one row against each other while retaining each
  owning Source and Source-relative namespace — a comparison stays inside one Source
  family, so no pair spans Repository and Global.
  Automatically updating Repository and Global scan/status information shown beside other
  content uses one keyboard-operable pause/resume plus on-demand-refresh control. Pausing
  freezes the presented/live-region status at its last value without stopping the underlying
  scan; resuming or explicit refresh presents the current state.
  The editor is client-only and lazy-loaded on file/compare routes. Nuxt/Vite emits the
  explicitly imported editor worker as a same-origin static asset, plus one lazily fetched
  grammar chunk per basic language; language-service workers, CDN assets, external workers,
  and blob workers are not allowed. Editor/model
  instances and subscriptions are disposed independently on route close, selection
  replacement, source disable, and generation replacement. The accessible diff viewer,
  meaningful ARIA labels, keyboard navigation, and inline narrow-screen view remain
  enabled and are verified manually as well as through browser tests. If the browser or
  editor cannot compute the diff with available environment capacity, an actionable
  diagnostic leaves the complete authored side-by-side source visible.
  `src/app/session/client-data.ts` owns the shared central client-data purge
  implementation, and `src/app/session/view-state.ts` owns the reactive values `App.vue`
  renders over the loopback session API channel. It installs no listener at all: there is no
  liveness probe, no product-defined polling interval, request timeout, retry timer, or
  memory lease, and no page-lifecycle purge. The transport reports a lost host on its own, so
  process loss becomes the ended view without being polled for. An ordinary handler or
  delivery rejection is that request's own error: the committed snapshot stays on screen and
  another refresh can still succeed (FR-030). A lost channel, an unsupported session
  protocol, a session mismatch, or an equivalent terminal full-session reset
  disposes editor models/workers/subscriptions, clears the session DTO/DOM/detail/
  comparison state its owners and rendered surfaces hold, aborts requests, and
  increments `clientDataEpoch` so a late
  response settles as a no-op instead of restoring content. Every SessionSnapshot/FileDetail request captures that
  epoch, the owning sequence's current generation — the session snapshot exposes
  `repositoryGeneration` and a nullable `globalGeneration` — plus the file's
  Source-relative Path where applicable and an exact request token. An older
  generation of the owning sequence is ignored. Every admitted automatic or explicit scan has an opaque
  `scanRequestId`; its Source progress and any generation it commits carry the same ID. The
  client stores the current explicit request ID and never treats an older status or inventory
  generation as that request's completion. Before a newer
  generation of either sequence is adopted, the epoch increments
  and the detail/editor/comparison state owned by that sequence's replaced generation is
  aborted/disposed; the other sequence's committed views stay valid. An equal generation requires
  the current token. File detail is adopted only when the epoch and the owning sequence's
  generation still match and the
  readable file still exists. No browser storage, service worker, or response cache
  persists inspected content. Every response is checked against the adopted
  `{ sessionId, globalContentEpoch }` baseline: an older epoch is rejected, an equal epoch
  with a null fence confirms the current baseline, and a greater epoch or non-null fence
  triggers the full purge before rendering. T1027 owns the control-only Global recovery and
  the subsequent fresh session-snapshot fetch over the same loopback channel; that recovery
  retains no session data from before the purge. The
  SPA adopts its returned `sessionId` as the new baseline without retaining or
  comparing the purged ID, and constructs the minimal client-side `RecoveryViewState` from
  epoch, Global control/progress, each failed tool's control `failureCode`, and the failed
  requests' errors only. When the disable fence is non-null, the session route supplies the exact
  control-only `GlobalFenceRecoverySnapshot`; when the fence is null, it supplies a normal
  full `SessionSnapshot`, but the recovering client adopts only those control/error fields
  and discards its inspection graph. If active, disable is available from that view immediately; the SPA fetches
  and verifies the matching frozen consent preview before reconstructing retry controls.
  The recovery view offers an explicit Resume inspection action only when the disable fence
  is null and a normal full snapshot can be fetched. It then re-fetches a matching session
  and constructs a fresh inventory summary with default state while
  restoring no old detail, comparison, editor, selection, filter, or authored source. A
  later detail/comparison open fetches it again from the fresh session. A
  session that cannot be re-adopted — the host process is gone or replaced — stays ended
  with the next step to reopen the printed URL.
- One coordinator serializes cancellable `GlobalEnableOperation` admission and its single
  `GlobalBatchScan`, Repository scans, later explicit single-Source Global rescans, and
  Global-disable transactions so scans do not overlap and generations cannot interleave.
  Queue and operation capacity is inherited from Node.js and the current process environment;
  the Inspector defines no command-slot, queue-depth, handle-count, or admission-byte quota.
  Global disable is a priority security barrier that is accepted independently of ordinary
  work and may join an existing disable transaction.
  One consent record always previews the fixed closed-order tuple `[copilot, claude, codex, agents]`
  and offers one all-tools confirmation action with no UI or API per-tool selector.
  `confirmedTools` is that complete tuple, including a frozen entry whose lexical preview is
  invalid; eligibility never narrows consent. The server owns one internal
  `GlobalToolControl` for each tuple member. After non-I/O request/`previewId` validation, an
  initial enable keeps the frozen consent and all four controls operation-local and
  unobservable throughout root admission; it creates no session `globalControl` or pending
  state yet. A retry instead uses the existing active consent/control state as its exact
  pre-operation snapshot. New root contexts and candidate Source/boundary IDs remain
  operation-local in either case. Only after every owned tool has a deterministic admission
  outcome does one coordinator decision atomically activate the initial consent/controls or
  apply the retry partition and, when roots were admitted, attach every context and transfer
  one batch. Batch scan results and graph records then remain tentative until their one
  generation commit.
  Initial enable attempts all four frozen entries. Retry derives the complete fixed-order
  `retryableTools` projection from the same tuple: non-pending unpublished `admitted` controls
  plus `rejected` controls whose `retryDisposition` is `same-preview`; it excludes published,
  pending, and lexical `new-preview-required` controls, and the request cannot add, omit, or
  reorder it. Admission partitions that server-owned set into a deterministic
  rejected subset and an admitted subset of zero to four roots. A lexically invalid entry
  or a consented root that is missing or is not a readable directory excludes only that
  root — recorded as absent or failed per the closed admission outcomes — and
  allows admitted siblings to continue. Any other unexpected throw or
  rejection fails the attempt as an ordinary error and aborts the entire enable/retry transaction: every sibling's
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
  through one `committable-complete` or `committable-partial` Global generation
  commit. Initial enable or retry therefore has exactly one batch-level scan job, result, and
  observable commit.
  After admission and any batch transfer, a final coordinator-locked
  operation-ID/epoch/state check atomically chooses the response disposition. A batch whose
  operation wins the race returns queued acceptance with its shared `scanRequestId`; an all-rejected
  operation returns `active-no-job`. A disable-barrier-first race returns the fixed
  `global-disable-pending` conflict, enters
  draining, and unregisters only after operation-local cleanup, with no late mutation or
  leak.
  The session `globalControl` DTO identifies the fixed confirmed tuple plus pending and
  retryable tools without exposing root authority. Active-consent retry keeps validation and
  admission operation-local: only authority-free `globalEnableInProgress` is newly visible,
  while the exact pre-operation `globalControl`, `pendingTools`, `retryableTools`, batch, and
  diagnostic projection remains unchanged. Atomic queued acceptance alone replaces
  `pendingTools` with exactly the admitted accepted-batch subset and installs a matching
  `batchStatus`/shared request ID; `active-no-job` leaves pending empty and batch status null
  while atomically committing deterministic control outcomes. Initial enable keeps every
  provisional value operation-local with no `globalControl` until its final atomic activation;
  only its accepted batch tools then appear pending. `unvalidated` exists only in
  non-serialized operation-local work; every accepted pending control is already `admitted`,
  and an active serialized view never contains `unvalidated`. Retryable tools
  remain informational while any work is pending; retry is offered only after
  `globalEnableInProgress` is null, `pendingTools` is empty, the matching preview is verified,
  and `retryableTools` is nonempty, while disable remains immediate. The
  consent-preview route returns the frozen active preview after a client purge.
  Ordinary work is FIFO, while Global disable is a priority security barrier. First
  acceptance of a non-no-op barrier atomically increments the command epoch and
  `globalContentEpoch`, installs non-null `globalDisableInProgress`, revokes publication
  authority, and rejects new Global-enable/Global-rescan commands. It sets
  `globalControl.state: disabling` and empties pending/retry arrays only when an active
  control snapshot exists; with only an operation-local initial enable, that control
  projection remains null while the barrier still appears in the control-only recovery DTO.
  Every ordinary inspection-data route is fenced with the fixed `global-disable-pending`
  conflict; the
  session route returns only `GlobalFenceRecoverySnapshot`. Each inspection-data handler
  binds its captured `globalContentEpoch` and, under the coordinator lock at final
  publication, requires an unchanged epoch and null fence or discards the body. The
  disabling page learns the fence from its own disable response and its subsequent session
  fetches; no separate projection exists, because the product does not model a second tab
  observing the barrier.
  The barrier aborts and discards an active uncommitted batch, drains enable admission and
  every tentative root context/result, performs a
  final queued-Global-work cancellation sweep, and requeues the same interrupted Repository
  command exactly once only after terminal success. The requeue preserves its exact
  `operationId`, `scanRequestId`, trigger owner, requested Source, and queue order, returns the
  existing command to `waiting`, and creates no new session-API admission or interim success status.
  Success with any public Global consent, control, or
  Source state uses `remove-active-state`: it discards the entire Global generation
  sequence and its Sources and commits nothing — the Repository sequence, its generation,
  and its IDs are untouched; only an
  unpublished operation-local initial-enable may use cleanup-only success, which removes the
  fence while changing no committed state.
  Disable, shutdown, or explicit cancellation leaves pending work cleanup-only and never
  publishes or interleaves a late result. Disable succeeds only after its drain and close
  complete; a post-acceptance failure keeps the process
  alive but leaves the data fence, the failed request's error, and retry/join control in
  place, with restart as the
  fallback for unrecoverable cleanup. A pre-acceptance failure or true no-op leaves the fence
  null. API handling continues while the event loop can serve it, but disable
  cannot claim physical drain completion before the underlying promise settles.
  The Global batch owns only the Global generation sequence and builds all admitted
  replacements off to the side: a successful complete or partial batch commits exactly one
  Global generation — creating the sequence at generation 1 when no Global generation
  exists, or advancing it from its last committed snapshot — publishes every assembled
  Global Source atomically, clears
  only the participating controls' applicable failure state, and invalidates old Global
  detail DTOs,
  comparison selection, and editor state
  once — file identities are Source-relative Paths and stay stable across the commit.
  Repository state is not part of the commit: the Repository sequence, its
  generation, and its views are untouched. An all-rejected enable/retry commits
  no generation and changes no committed
  state. The same coordinator lock linearizes the sequence generations and payload of every
  SessionSnapshot/FileDetail envelope; later network delivery cannot mix or relabel them.
  A later explicit rescan remains a single job for one existing Source and may commit one
  replacement generation of the owning sequence under the same complete/partial rules. Its success
  clears only that Source's stale-failure entry and lifecycle diagnostic while preserving
  another Source's failures. Its fatal failure must create or replace only that Source's
  stale overlay: an accepted throw/rejection stores the failed request's error message,
  while a deterministic returned fatal outcome references its lifecycle `Diagnostic`.
  This single-Source rescan path does not alter the atomic batch requirement for
  initial enable or retry.
  Any unexpected throw or rejection during a Global batch produces no domain result and
  propagates as an ordinary error at its trigger-owning session-API request boundary. Before
  job acceptance it creates no
  `scanRequestId`; after acceptance it terminates the one shared request with the failed
  request's error. In either case it commits none of the tentative sibling
  Sources or results, leaves the last committed generation and IDs intact, adds no
  `StaleSourceFailure` for an as-yet-uncommitted tool, and retains the exact pre-operation
  consent/control, admitted root contexts and candidate IDs, and prior per-tool graphs for
  retry or disable. A fatal automatic first Repository scan separately leaves bootstrap
  generation 0 current. Global disable removes control-owned lifecycle diagnostics,
  closes/removes all retained root contexts, and deletes every control, consent record, and
  frozen preview.
  Each retained Diagnostic uses exactly one attachment scope, independently of its generation
  or session-lifecycle lifetime. File scope requires a matching `sourceId` and
  Source-relative Path; source scope requires only `sourceId`. There is no pathless scope:
  invalid combinations are rejected, and a source-scoped record never fabricates a
  path. An unadmitted Global tool's failure is its control's `failureCode`, not a
  Diagnostic.
  Generation 0 is a committed zero-I/O bootstrap snapshot with exactly one idle Repository
  Source selected lexically from the captured invocation working directory and optional
  `--root`, and with no files or diagnostics, so a fatal first attempt has a legal retained
  current base. Explicit Repository rescans, enabled-Global single-Source rescans, and Global
  batches share the same queue rules. Repeated Global disable joins an existing barrier;
  when no member Global Source or graph, active consent record, retained admitted
  Global root context, running/queued Global
  scan/enable command, or retained disable failure exists,
  disable is an immediate no-op even if unrelated Repository work exists. The no-op branch
  never enumerates or reads the filesystem, creates a job, or changes the generation, epoch, or fence.

### Closed Runtime State Tables

#### Global root admission

| Input/phase                                                                | Internal transition                             | I/O and public result                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tool-home setting is captured as `undefined`                               | `preview-default`                               | From the one session-start `node:os.homedir()` capture, use active-platform `node:path.join` with that tool's fixed `.copilot`/`.claude`/`.codex` suffix and zero filesystem I/O, then classify the resulting exact string through the ordered rows below; retain this tool in the fixed four-entry confirmation and create no authority |
| Captured environment setting has length zero                               | `inputState: present-empty` / `preview-invalid` | Apply this first and only to an environment-origin value; retain the entry in the fixed four-entry confirmation, perform no fallback or filesystem/network I/O, and create no root, Source, job, or generation for it                                                                                                                   |
| Otherwise the exact string contains U+0000 or an unpaired UTF-16 surrogate | `inputState: invalid` / `preview-invalid`       | Reject before `path.isAbsolute`, retaining only the invalid preview entry with zero filesystem/network I/O and no authority                                                                                                                                                                                                             |
| Otherwise active-platform `node:path.isAbsolute` returns false             | `inputState: relative` / `preview-invalid`      | Retain the relative preview entry with zero filesystem/network I/O; do not normalize, resolve, fall back, or create authority                                                                                                                                                                                                           |
| Otherwise the string is absolute, including one outside the ordinary home  | `inputState: eligible` / `preview-eligible`     | Escape and retain the stored exact raw lexical value in the server-retained preview record with zero filesystem/network I/O, keep it in the fixed four-entry confirmation, and await the one all-tools consent action; only this row can reach post-consent admission                                                                   |
| Consent names a stale, replayed, or superseded `previewId`                 | `consent-rejected`                              | Perform zero proposed-root I/O; create no authority                                                                                                                                                                                                                                                                                     |
| A consented root is missing or is not a readable directory                 | `absent` or `root-rejected`                     | Record that member as absent or failed without creating its Source and without blocking sibling members; continue partitioning the current server-owned set—all four members initially or exact `retryableTools` on retry                                                                                                               |
| Any proposed-root operation throws or rejects unexpectedly                 | Ordinary-error propagation                      | Abort the whole Global transaction, discard every provisional sibling context/result, publish no admitted subset, and retain the prior snapshot                                                                                                                                                                                         |
| Post-consent admission succeeds for one or more roots                      | `root-admitted` batch subset                    | Atomically attach all admitted contexts/IDs to their controls and transfer them together to the one `GlobalBatchScan`; create no public Source or graph before its single atomic commit                                                                                                                                                 |

#### Byte decoding

| Byte condition                                                                  | `encoding`       | Source and recognition state                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any `0x00` byte                                                                 | `binary`         | No `sourceText`, parser dispatch, recognition extraction, or comparison eligibility. An admitted candidate is diagnostic-only with the file-scoped `file-content-binary` diagnostic and makes an otherwise publishable generation `partial`; a census-listed companion is the ordinary fact of an asset, with no diagnostic |
| No NUL and all bytes decode without replacement                                 | `utf-8`          | Record and remove one leading BOM when present; preserve complete `sourceText`; parse it in-process                                                                                                                                                                                                                         |
| No NUL and one or more invalid UTF-8 sequences, with or without one leading BOM | `utf-8-replaced` | Decode exactly once with replacement semantics, record/remove the leading BOM when present, preserve every resulting `U+FFFD`, and use that complete garbled text for parsing, extraction, display, and comparison; this condition alone remains complete                                                                   |

#### Scan publication and failure ownership

| Terminal condition                                                                                                                                                                                                                                                              | Internal outcome and owner                                             | Atomic public result                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Complete traversal; every file complete, including readable `utf-8-replaced` results; assembly/serialization succeed; authority current                                                                                                                                         | `committable-complete`, coordinator                                    | Commit one `complete` generation of the owning sequence and a complete response; an initial/retry Global batch publishes every admitted tool-specific Source together in this one Global-sequence commit, touching no Repository state                                                                                                                                                    |
| Complete traversal; one or more files have only file-confined outcomes (unreadable, an admitted candidate's binary content, parse failure — a census-listed companion's binary bytes are its ordinary fact and confine nothing, FR-025) while every unaffected file is complete | `committable-partial`, scan assembler then coordinator                 | Commit one `partial` generation of the owning sequence with affected-file diagnostics and complete unaffected results; an initial/retry Global batch still publishes its whole committable admitted subset in this one Global-sequence commit                                                                                                                                             |
| Fixed-four Global admission deterministically rejects every root                                                                                                                                                                                                                | `active-no-job`, Global coordinator                                    | Retain active consent/controls, create no `scanRequestId`, batch, Source, or generation, and preserve every existing committed ID exactly                                                                                                                                                                                                                                                 |
| The selected Repository root does not exist or cannot be read as a directory                                                                                                                                                                                                    | Deterministic fatal outcome, coordinator                               | Fail the attempt with the source-scoped `root-unreadable` diagnostic while the session stays usable; commit nothing, publish no partial inventory, and retain the prior snapshot; if and only if the attempt is an explicit rescan, mark the retained snapshot stale for that Source                                                                                                      |
| The attempt fails before commit for any other reason not confined to one file                                                                                                                                                                                                   | `failed` for that `scanRequestId`, owning session-API request boundary | Commit nothing from the attempt, including every tentative Global batch sibling; report the failed request's error ordinarily (`scanRequestId` is null before job acceptance); retain any prior committed snapshot; if and only if the accepted job is an explicit rescan, create or replace that Source's stale overlay storing that error's message; keep the process/session available |
| Automatic startup work with no request owner fails                                                                                                                                                                                                                              | Propagation to the process top level                                   | Publish no attempt result or generation; make no process/session survival guarantee; the runtime's ordinary uncaught-error reporting applies                                                                                                                                                                                                                                              |
| Disable/shutdown/supersession/failure revokes authority                                                                                                                                                                                                                         | `revoked`, coordinator                                                 | Discard all late bytes, extraction, diagnostics, DTOs, and graph mutations; commit nothing from the revoked request                                                                                                                                                                                                                                                                       |
| Transport fails after atomic commit                                                                                                                                                                                                                                             | Existing committed outcome, host                                       | Never relabel or expose a truncated body as partial; allow refetch of the already committed generation over the loopback session API                                                                                                                                                                                                                                                      |

## Complexity Tracking

The trusted-workspace clarification (spec Clarifications § Session 2026-07-22) leaves no
adversarial-file inspection machinery to justify, so the table carries no row for it.
Devframe adoption (spec Clarifications § Session 2026-07-22, Constitution § Quality and Safety Standards) leaves
none for a per-session capability token, product-owned Origin checks, a hand-written
HTTP router, or a static-manifest/CSP pipeline. With no log-content rule and no sanitized error envelope (spec Clarifications § Session
2026-07-22, Constitution § Quality and Safety Standards) there is no generic error-envelope and no
operational-log/telemetry machinery, so the table carries no row for those either.
The remaining unavoidable implementation costs are tracked explicitly:

| Complexity                                                                                                                   | Why it is required                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | Simpler option rejected                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Lockfile-pinned pre-1.0 devframe 0.7.5 host with lockfile-owned transitives (including the h3 2.0.1-rc.22 release candidate) | Reuse the config-inspector-proven local-tool host for static serving and the RPC session API instead of maintaining a hand-written router, token authentication, and static-manifest pipeline; within this repository's own development and CI, the committed lockfile — which the published package does not carry — holds pre-1.0 API churn and the RC transitive at one reviewed baseline for every build and test run, and the manifest's `^0.7.5` only declares the range a deliberate update may move within here (a pre-1.0 caret stays below 0.8.0). A published-package consumer's package manager resolves that same `^0.7.5` fresh against the registry at install time, exactly as it does for any other pre-1.0 dependency; nothing in the package pins a runtime baseline for them | An exact manifest pin would duplicate, for this repository's own builds, the resolution the committed lockfile already owns there — every version move is a reviewed lockfile change either way — without changing what a package consumer resolves, since the published tarball carries no lockfile either way; re-implementing the host in-repo re-creates the complexity devframe already owns |
| Publication-authority revocation with cleanup-only late continuations                                                        | Prevent work completed after disable, shutdown, or cancellation from mutating a newer session state                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Treating cancellation as physical kernel-I/O termination would make an unsupported guarantee                                                                                                                                                                                                                                                                                                      |

These controls are required boundary implementations, not Constitution exceptions or waivers.
They preserve the existing closed authority, privacy, provenance, and verification principles; the
rejected simpler alternatives fail those principles.

**Residual risk and resolution path**: Node.js cannot guarantee wall-clock cancellation of every stalled kernel filesystem
operation. Disable, shutdown, and explicit cancellation therefore revoke publication
authority and discard late results, while coordinator serialization prevents those results
from interleaving with a committed generation. Approval MUST NOT describe authority
revocation as physical cancellation or proof of kernel completion within a product-defined
time. Removing this residual requires a future public
cancellable filesystem primitive or an OS-enforced read-only worker/sandbox that can be
terminated and drained, followed by renewed resource-leak and disable-race testing.
