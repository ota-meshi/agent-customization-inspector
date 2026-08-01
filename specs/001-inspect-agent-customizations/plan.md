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
recognition metadata is matched by tool/kind/field and compares the values the parsers
resolved, in ordinary Vue components.

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
selection, host binding, and startup browser opening. Protection is the loopback-only
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
merge into the one `(fileId, copilot, MCP)` recognition and one read of that file.

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
(latest Nuxt-compatible release), `devframe` 0.7.5 (the pre-1.0 local-tool
host framework), `gunshi` 0.37.0, `yaml` 2.9.0,
`jsonc-parser` 3.3.1, `smol-toml` 1.7.0, and `monaco-editor` 0.55.1. Each is declared as a
caret range in `package.json`; the committed lockfile pins these exact resolved versions
with integrity. devframe's transitive
tree (h3 2.0.1-rc.22, birpc, crossws, valibot, destr, mrmime, nostics, pathe, ufo) is
owned by devframe and the lockfile rather than declared as direct dependencies. The first lockfile
MUST revalidate these exact stable resolved versions; prereleases and incompatible newer majors
are not considered eligible “latest” versions, and the devframe choice plus its
lockfile-owned h3 release candidate are the one reviewed exception, accepted with the
framework adoption decision (spec Clarifications § Session 2026-07-22).
That revalidation is a planning gate, not permission for a task-local package or version
edit. If any selected package or version changes, implementation stops before configuration
work, the compatibility decision is reviewed again, every dependency-baseline-bearing
English/Japanese research, plan, quickstart, and task artifact is synchronized, and
`/speckit.plan` followed by `/speckit.tasks` is rerun before work resumes. Configuration,
CI, release, and package-policy
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
change MUST record its rationale and migration impact. Design evidence MUST exist before
implementation; the corresponding `validation.md`/`validation.ja.md` evidence MUST exist
before release. Each record MUST identify affected consumers, contracts, data, and workflows;
required migration steps and compatibility or support window; and rollback/support path, or
give an explicit reasoned no-impact determination. Missing or stale bilingual design evidence
blocks T002; missing bilingual validation evidence fails the release gate.

`src/server/cli.ts` uses only Gunshi's stable root `define`/`cli` API. It defines a negatable
`open` boolean with a true default to provide `--no-open` and a single string-valued
`root` option for `--root <path>`, enables `strict: true`, explicitly rejects every
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
`src/server/host/devframe-app.ts`; devframe owns port selection, the loopback `localhost` bind, and the
startup browser-open attempt, and the CLI prints the loopback origin once for the FR-001
manual fallback.

**Storage**: No durable application storage. Session state, inspected file bytes, complete
authored-source DTOs, diagnostics, and comparison selection exist only in process/browser
memory.

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
observation. The closed manual matrix uses the packed tarball, all three
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
rejected selector families, and shared-file combinations for SC-003; prohibited effects
and Repository/Global boundary rejection for SC-004;
exact tool/kind/source rows, source/comparison surfaces, literal-credential/environment-
reference classes, and set/unset referenced-variable states for SC-005; every file-confined
outcome class and failure class for SC-007; and every maintained Source Condition
Fact row, tool, product surface, and documented/unavailable state for SC-009. Release records
name the manifest version and digest plus every executed case ID; missing, omitted,
unexecuted, or mismatched evidence fails the affected criterion. The maintained usability
study kit uses one 20-person first-time cohort for SC-001 then SC-006, fixed prompts
and moderator limits, no replacement, unsuccessful scoring for failures that prevent or
interrupt completion, the handled SC-001 automatic-open distinction, the defined timer
boundaries, and a four-field SC-006 response form scored against fixed ground truth.
After that timed response, the same participants attempt standardized comparison and Global-
consent tasks. Moderators record objective workflow outcomes and predefined safety events.
Study equipment uses the one prepared profile
`playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`: Playwright 1.61.1 Chromium on
Ubuntu 24.04 x64 and Node.js 24.18.0, a headed fresh nonpersistent browser context with no
extensions, a browser-context-only proxy, and the `single-407-basic` bootstrap. Chromium-
controlled Fetch Metadata plus exact Origin/Referer values are reduced independently at the
proxy and server and discarded, but are consistency signals rather than human attestation.
Participant classification additionally requires the one current armed navigation grant and
the exact authorized-static target; a participant-shaped request without that grant is an open-
binding, product-attributable/prohibited `unknown` row. Extensions, missing-secret other-host
traffic, and invalid-secret unknown rows use N/A IDs and are blocked. A valid transport marker
is necessary but never sufficient for actor, product-attribution, or forwarding decisions.
An ACKed context correlation is only an eligible failure link. Success remains all N/A while
its automatic issue is counted separately. Candidate-bearing failure MUST use the exact same-
run/subject/process/workflow `automatic-critical` link without review; only candidate-free
failure receives two isolated hidden one-use votes. Both
`product-caused-blocker` votes yield `reviewer-confirmed-critical`; both
`not-product-caused-blocker` votes yield `reviewer-cleared`; a mismatch yields
`reviewer-disagreement-critical`. The published bilingual governance plan names the reviewer
roster, while a separate access-controlled administrative record audits one unique human pair per
case and is destroyed under the consent-retention policy; no identity, assignment, note, or third
reviewer enters runtime collectors, repository study inputs, capture, or evidence. Only
`reviewer-confirmed-critical`/`reviewer-disagreement-critical` results use
`workflow-blocker`. The gate passes only after all 20 participants attempt all four primary
workflows and the verifier recomputes an empty tagged, de-duplicated union of
`automatic:<correlationId>` and `reviewer:<subjectId>:<workflowClass>`, without counting an
automatic-linked workflow row again. The maintainer team,
not ordinary contributors, owns recruitment, compensation funding, moderation, review,
consent/privacy handling, supplied equipment/session support, bilingual materials, and
accessibility accommodations through a published study plan that includes the required reviewer
roster. The unique-pair administrative assignment record remains outside the repository bundle,
work root, candidate, capture, evidence, and runtime IPC and cannot affect scoring bytes. Each study session records the
actual default handler or its unavailability and, when resolvable, the actual browser family
and revision. If automatic opening is disabled, unsupported, or fails; the handler or resolved
browser is unavailable or cannot be identified; or the resolved browser falls outside the
release-certification baseline, the same enrolled session uses and records the documented
manual-opening fallback in a certified browser, remains in the fixed denominator, and does
not replace the participant. The automatic-open condition is recorded but is not itself an
unsuccessful result when the participant completes the fallback without prohibited hints
inside the original two-minute interval; fallback never pauses or restarts that timer, and an
inability or interruption that prevents completion is unsuccessful. The default handler
itself need not be certified.

Study-kit authoring materializes and contract-tests the candidate-independent closed bundle
`tests/usability/sc001-sc006-study-inputs/`, its versioned manifest, and companion; it does not
freeze a candidate. The exact repository-owned member set is fixed in
`contracts/usability-study-evidence.md`. Every participant-, moderator-, or scorer-consumed
input byte other than the separately bound candidate and equipment/runtime comes only from a
repository-owned builder distribution that the independent verifier accepts. `manifestVersion` is a positive safe integer
starting at 1, `bundleRoot` is that exact `/`-terminated literal, `inputs` is nonempty, and every
closed role has nonzero coverage. Exact root-property order is `manifestVersion`, `bundleRoot`,
`inputs`; entry-property order is `inputId`, `role`, `path`, `sha256`; entries use ascending raw
UTF-16-code-unit `inputId` order. The roles are `guidance`, `task-prompt`, `evaluation-fixture`,
`prepared-state`, `response-form`, `ground-truth`, and `scoring-rubric`. Paths are unique
`/`-normalized repository-relative paths below the root, bilingual bytes have distinct IDs,
and each lowercase digest covers referenced raw bytes. Construct new objects in those orders
without Unicode normalization and serialize exact bytes as
`Buffer.from(JSON.stringify(canonicalValue, null, 2) + '\n', 'utf8')`; byte equality fixes
Node.js 24/26 string escaping and number spelling. The companion is exactly 64 lowercase
digest characters plus LF. The verifier recursively compares the actual regular-file set with
both the contract member set and manifest path set, rejects links, aliases, non-regular objects,
unusable identity/link metadata, path escape, and destination drift, and is the only delivery
path. Missing, extra, duplicate, unordered, unreadable, non-canonical, invalid-path, empty-role,
mismatched, or otherwise supplied-but-unmanifested input fails both criteria.

Each materialized participant distribution is a closed root with exactly two direct-child
directories and no other direct child. `study-inputs/` contains the exact sixteen source-bundle
members under the same direct-child names and bytes; `repository/` contains the descriptor's
complete derived file set and only its implied directories. Descriptor paths are relative to
`repository/`, so they cannot address or overwrite `study-inputs/`. The separately bound
candidate and equipment/runtime remain outside the distribution. The verifier rejects any
extra top-level member, sidecar, namespace collision, alias or reused file identity, or escape.

The paired `evaluation-fixture.json` members are closed deterministic file-tree descriptors:
each derived entry fixes its output path, encoding, exact byte representation, and lowercase
digest. The builder, verifier, and capture-controller script paths and digests are bound in
both descriptors. Focused contract, integration, and security suites verify those bindings,
and their executed results are release evidence. The builder alone creates the twenty fresh
fixture repositories, and the independent verifier requires every derived output set and byte
to match both descriptors before enrollment and again at finalization.

Those three public harness scripts are each a self-contained single file whose source may use
only literal static imports of `node:` built-ins. Reject local/package imports or helpers,
dynamic `import()`, `require`, `createRequire`, `eval`, `Function`, `vm`, `process.dlopen`, any
other loader hook, and alternate worker/child entry files. During materialization the builder may internally execute only the exact
descriptor-bound and digest-verified capture script in supervisor mode. The capture script may
re-execute only itself in exact modes `supervisor`, `study-harness`, `scoring-moderator`,
`reviewer-one`, `reviewer-two`, the three named adapters, and the three named watchdogs.
The product probe is a distinct import mode. Every internal role requires authenticated
inherited parent IPC plus a fresh one-use bootstrap nonce; no other executable entry can
participate in the evidence chain.

Each parent/child edge uses two unidirectional inherited anonymous pipes—parent-to-child and
child-to-parent—and no environment, argv, or file bootstrap. After child verification, the
parent-to-child pipe begins with an exact 96-byte bootstrap prefix containing a fresh seed,
nonce, and `channelId`, then remains open and carries LF-framed parent-to-child messages on the
same pipe; EOF does not delimit the prefix. EOF before byte 96 fails, and all post-prefix bytes
enter canonical frame parsing. The child-to-parent pipe's first message is authenticated
one-use `ready` at sequence 0. The child derives direction-separated keys with domain-separated HMAC.
Every LF-terminated canonical frame has exact root order `schemaVersion`, `channelId`,
`sequence`, `direction`, `senderRole`, `receiverRole`, `messageType`, `authenticationTag`,
`payload`. The HMAC preimage is compact canonical JSON with `authenticationTag: null` and no
LF; only the populated transmitted frame appends one LF. Verification is constant-time. Each direction begins at sequence 0 and
increments by one, the role/message matrix is closed, and readiness consumes the bootstrap
once. Premature EOF, unexpected post-bootstrap bytes, truncation, replay, gap, wrong role/direction/message/channel/tag, child mismatch, pipe
close, abort, crash, or exit fails closed and wipes seeds, nonces, keys, and buffered frames.
This inherited protocol adds no runtime-control command.

The materializer-to-supervisor edge uses one additional exact message after authenticated child
`ready`: one-use `runtime-bootstrap` carries `StudySupervisorRuntimeBootstrap` root
`schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`,
`controlEndpoint`, `controlToken`. Before root mutation the supervisor independently validates the
root, binds the endpoint, loads the token, ACKs, and wipes the frame buffer; only then may the
materializer write. Success uses an authenticated role-specific lifecycle close/ACK to detach and
wipe that edge while the supervisor remains live, and failure aborts/exits it. These authorities
never enter supervisor child environment/argv and exist only in that transient bootstrap,
supervisor memory, and later authenticated runtime-control.

Descendant reporting uses `process-lifecycle-attestation` with exact
`StudyProcessLifecycleAttestation` root `schemaVersion`, `processRole`, `streamRole`,
`componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`; event is
`registered | exited`. Adapter self-registration to the supervisor is not an exit observation.
Direct parents OS-observe before forwarding/creating child reports: adapters forward matching
watchdog registration and later report directly observed clean exit, the moderator reports
reviewer registration after ready and exit after direct observation, and the supervisor directly
observes adapters/harness/moderator. Reverse
`acknowledgement` is allowed only for the immediately preceding valid attestation on supervisor/
moderator, supervisor/adapter, and adapter/watchdog edges, never for candidate/terminal reports.
Adapter registration supervisor ACK precedes writer-binding relay; watchdog registration receives
adapter and supervisor ACK before start, reviewer exit ACK precedes outcome, and watchdog exit ACK
precedes adapter exit. Start waits for all six stream registrations;
stop waits for three adapter-observed watchdog exit attestations plus direct adapter/orchestrator
exits. Reviewer count uses moderator-observed attested distinct clean exits. A nonclean child uses
`lifecycle: child-exit`, invalidates the run, and never enters the witness.

Stream phases use exact `StudyStreamControl` root `schemaVersion`, `controlSessionId`,
`studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`,
repeating immutable bindings for command `start | checkpoint | anchor-handoff | stop`. Exact
`StudyStreamControlResult` root is `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`,
`command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`. Byte-identical
`stream-control` travels supervisor→adapter→watchdog and semantic `stream-control-result` returns
the reverse route; all three fixed-role results gate each phase. Start result follows that
watchdog's capture-start plus first heartbeat, reports the current position, and uses N/A
`checkpointRequestId`. The supervisor creates/validates each stream and passes one dedicated
append-only handle only through exact spawn inheritance as fd5. A path-free runtime-only
`StudyStreamWriterRuntimeBinding` binds adapter component/instance/process identities to expected
fd5 stable handle identity, `nlink`, and append mode. After supervisor ACKs adapter registration,
the adapter relays binding/handle and obtains binding ACK; the watchdog independently validates,
registers, and receives adapter plus supervisor ACK. All three such barriers/all six registrations
precede browser-proxy binding ACK, which precedes stream start. The handle travels
in the contract-fixed child-visible evidence-writer slot, alongside the separately fixed parent-
to-child and child-to-parent IPC slots, never path/cwd/env/argv. The writer slot is absent for
every nonstream role and is not a third IPC pipe. The adapter only transfers it and closes after
watchdog registration; the supervisor closes its copy after complete downstream registration ACK.
Extra/duplicate copies are forbidden, so the watchdog is sole holder/writer. This writer authority is not IPC bootstrap/channel authority.
Stop order is result→handle close→clean exit; any failure closes every copy and invalidates.

Immediately before SC-001, the independent verifier re-enumerates the source bundle and all
twenty actual distributions and requires exact-set and byte equality without rewriting an
input, reading candidate authority or bytes, calling `stat` on the candidate, hashing it, or
freezing it. That successful inputs phase
freezes only the verified canonical study-input-manifest digest and exact-set state. After the
release candidate exists, `capture -- start` is the first phase that reads its authority; it
reopens, stats, hashes, and freezes the candidate identity and SHA-256 before capture begins and
binds them to the already verified manifest digest. The evidence record and capture handoff
carry both digests. Any
packed-candidate byte change, or any material primary-workflow or enumerated-input change,
invalidates both SC-001 and SC-006 evidence. The final release gate must reproduce both
recorded digests or rerun the complete paired protocol against the final packed candidate.

The exact stream roles are `product-instrumentation`, `inspector-server-ledger`, and
`study-browser`. Each role has one separate capture adapter and one separate watchdog process;
the watchdog is the sole envelope writer and owns sequence, monotonic time, and hashing.
Adapters inspect raw traffic only ephemerally, convert it to the contract's closed safe event,
discard all raw values before local IPC, and never log, hash, or retain them. Each authenticated
IPC message carries exactly one canonical safe payload; any number of messages may occur within
one primary-workflow observation, and every accepted message is counted and chained. Persisted
payloads contain only allowlisted fixed codes, protocol-owner-generated opaque IDs, booleans/enums,
safe integers, and evidence digests. Raw header names, framing, wire or encoded representations,
every noncanonical derivative, bodies, inspected/authored content or metadata, participant
responses, paths, URLs/authority values, capabilities, environment values, raw errors, and
exception text are forbidden. The sole header-derived exception is the strictly validated
decoded canonical safe ID retained as `correlationId`; it appears in the retained canonical
payload and its digest chain. No captured wire, browser, or Inspector byte is itself a hash
preimage.

At capture start the supervisor generates exactly twenty fresh, unique, cryptographically random, run-local
unlinkable participant tokens, each made from exactly 32 random bytes (256 bits) and encoded as
exactly 43 unpadded base64url characters. A participant-specific `subjectId` is exactly one of
those tokens and a non-participant observation uses literal `not-applicable`. `subjectId` is the
only permitted pseudonymous human evidence: it encodes no identity, distribution slot,
response, or participant property, and has no retained external mapping. The supervisor keeps the
ordered token set only for the run, sends only the next token in each authenticated attempt
binding, and keeps no identity/distribution map; the harness schedules but never creates or
selects tokens. It is freshly generated for every run; verification checks within-run uniqueness and keeps no cross-run registry.
`study-browser` is the sole workflow-outcome authority and records exactly one terminal
`success | failure` for every token crossed with `discovery`, `inspection`, `comparison`, and
`global-consent`: 80 terminal outcomes with no missing, duplicate, extra, or mismatched pair.
Discovery requires at least 19 successes and inspection at least 18, both over the same exact
twenty-token denominator. Arbitrarily many nonterminal and request-event messages remain valid.
Exact-80 cardinality/canonicality is independent of those success thresholds: 80 valid terminal
records permit verification, stop, finalize, witness, and seal even when discovery or inspection
misses its target. A target miss blocks the release criterion but neither invalidates evidence
nor becomes automatic critical; protocol, cardinality, authentication, and privacy violations
fail closed separately.

`capture -- start` is run-level only: through the existing materialization-created supervisor it
binds the listener/proxy, launches the study harness, scoring moderator, and three adapters,
requires each adapter to launch its watchdog, yielding exactly eight internal long-lived
descendants/processes below the supervisor with watchdogs as adapter children, and produces three stream starts, but
creates no attempt profile, bootstrap, marker, grant, candidate, correlation, or workflow row.
Attempts run sequentially. Participants 1–19 each complete all four workflows and close before
the next attempt; participant 20 completes discovery before checkpoint/handoff and, unless
terminalized, remains the sole open attempt while the remaining three workflows complete during
continuation. A terminalized participant 20 uses a post-anchor heartbeat for continuation
progress. This yields all 20 SC-001 outcomes at checkpoint with at most one live attempt. Every
attempt receives fresh binding/profile/marker/bootstrap only after streams are live and
immediately before its `npx` and first capturable request.

The authorized materialize caller/study setup supplies four pairwise-distinct bidirectional
nonrecording external terminal-equipment handles: fd6 participant, fd7 moderator, fd8 reviewer-one,
and fd9 reviewer-two. They are not internal evidence IPC. Before launching the supervisor, the
materializer verifies stable identity, distinctness, bidirectionality, no echo, no history, and no
recording. The supervisor keeps fd6, passes fd7–9 to the moderator, and closes its fd7–9 copies.

The study harness owns schedule and attempt orchestration; the scoring moderator owns raw
response/rubric input and exact outcome construction. Exactly one runtime-only
`StudyCurrentSubjectScoringContext` has root `schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `automaticIssueCorrelationId`,
`terminalizationClass`, `state`. No context exists during launch/bootstrap or pre-readiness
buffering. Fresh process binding, ordered buffer release, and both open-binding ACKs precede
discovery-context creation; the supervisor obtains moderator ACK for that context before
returning readiness, and only then permits the grant, navigation, prompt/timer, and task. A
buffered pre-readiness event is workflow/process/link N/A, cannot update a later context, and
remains separately counted when automatic. Correlation begins N/A and terminalization class
begins `none`. The only one-way updates are correlation N/A to the first exact same-run/subject/
process/workflow candidate after supervisor validation and current-workflow tagging before
canonical safe-payload serialization, followed by applicable adapter/watchdog
ACK or ACKs make it accepted, and class `none` to one mapped terminalization cause;
post-terminalization missing-workflow contexts initialize with that class. The supervisor owns
the safe context mirror/current workflow, serializes that candidate once with the tag because
sources cannot self-assert workflow, waits for downstream ACKs, marks/counts it accepted, resends the updated `scoring-context` to
the moderator, and requires ACK before release decision or outcome submission. That
value is an eligible failure-link candidate, not an outcome decision. Accepted retained
observations are immutable; later tag mutation/backfill is forbidden, and pre-ready/context-free
N/A is permanent. Raw response, timing, ground truth, rubric, and reviewer input stay moderator-
call-local. For each normally completed open context fd7 accepts exactly one external runtime-only
`StudyModeratorInput`: compact canonical UTF-8 JSON plus one LF, exact root `schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`, `timing`,
`groundTruth`, `rubric`; timing is a canonical nonnegative decimal string and the last three raw
values are canonical JSON strings. EOF, parse/extra/trailing input, replay, and cross-context
routing fail; echo/history/recording/logging are disabled and the raw frame is wiped after use or
abort. A terminalization-synthesized remaining workflow accepts no record, rejects late input, and
derives failure only from the terminalization decision without invented empty fields. After an accepted outcome,
destroy its context and open/ACK the next one before the next workflow prompt, timer, or task.

The moderator constructs and submits each exact `StudyWorkflowOutcomeSubmission` with root
`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`,
`outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, `reviewerTwoClassification`. Success remains all N/A even when its
context has an eligible candidate; the accepted automatic issue is counted separately. A failure
with an ACKed eligible candidate MUST use that exact correlation as `automatic-critical` without
review; only a failure with no candidate is reviewed. Missing, mismatched, reused, optionalized,
or cross-workflow links are rejected. Before each attempt, a distinct human pair is procedurally assigned
out of band to each subject/workflow, with no human/collector-process/component-run identity/case-
assignment reuse. Literal reviewer slots and sanitized terminal-equipment surfaces may be drained,
reset, and remapped for later cases. The published bilingual
plan names the reviewer roster; a separate governed access-controlled administrative record outside
repository/work-root/candidate/runtime/capture/evidence state audits the unique pair per case and
is destroyed under the consent-retention policy without affecting scoring bytes. They directly observe
the same live attempt/workflow, including pre-workflow terminal events, without recording or
IPC. Only after failure does the moderator create byte-identical `StudySafetyReviewCase`
payloads for two fresh isolated one-use vote-collector processes; only after both cases are fully
displayed are fd8/fd9 enabled. Each collector reads one exact LF-terminated ASCII
`product-caused-blocker | not-product-caused-blocker` enum from its slot-isolated surface, with no
echo/history/recording/log/cross-slot output, and wipes the raw input. Success creates none.
Both non-product votes yield `reviewer-cleared`, both product votes
`reviewer-confirmed-critical`, and a split `reviewer-disagreement-critical`; only the latter
two use `workflow-blocker`. Both processes exit before submission acceptance. Identities and
assignments never enter collectors, outcomes, repository study-input artifacts, runtime IPC,
capture, or evidence; notes, communication, human/process/assignment reuse, and third review are not permitted.
The moderator sends the submission to the supervisor, which validates and forwards
`workflow-outcome` to the browser adapter; that adapter canonicalizes the workflow payload for
its watchdog. `safe-payload` on this edge is limited to nonworkflow browser observations and
cannot carry or bypass a workflow outcome. For those observations, only the supervisor tags the
current workflow (or N/A), constructs the canonical safe payload, and sends it to the adapter;
the adapter validates it against the stored candidate and returns its semantic ACK only after the
watchdog ACK. That ACK must
precede `browser-only-released`; both browser and server safe-payload ACKs must precede
`joined-pair-released`.

Request payloads use the contract's closed privacy-safe target, method, capability, origin,
authority, request, effect, attribution, and prohibition classes. Those closed literals and
their truth table are owned by `contracts/usability-study-evidence.md` and
`contracts/usability-study-evidence.ja.md`; the plan does not restate them. For browser traffic, the
proxy and server independently project exact Chromium-controlled `Sec-Fetch-Dest`,
`Sec-Fetch-Mode`, `Sec-Fetch-Site`, and `Sec-Fetch-User` plus Origin/Referer to closed classes,
discard raw inputs, and require identical projections. Fetch Metadata is not human attestation.
After product-probe readiness and immediately before the sole expected initial navigation, the
supervisor creates the fresh runtime-only `StudyParticipantNavigationGrant` root
`schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `state`, where state
is `armed | consumed | destroyed`, and sends it to the browser adapter. The ordered table is:

| Marker and projection | Actor and binding | Decision |
|---|---|---|
| Valid secret; navigate/document/`?1`; missing Origin; site none or same-origin; exact authorized-static target; current armed grant | `participant`; open binding | Reserve without state change, store pending while canonical grant stays armed, then let sole exact one-use `browser-broker-decision: candidate-forward` accept and atomically consume the canonical grant; validate it before adapter-copy consume/forward. |
| Valid secret; not participant; missing user; exact-issued Origin or missing Origin plus exact-issued Referer | `bundled-spa`; open binding | Forward only exact authorized static or API; every other request is product-attributable/prohibited and blocked. |
| Valid secret; extension Origin | `browser-extension`; N/A IDs | Always unrelated and blocked. |
| Remaining valid-secret projection | `unknown`; open binding | Fail closed as product-attributable/prohibited and block. |
| Missing secret after bootstrap | `other-host-process`; N/A IDs | Unrelated and blocked. |
| Invalid, duplicate, malformed, noncanonical, unknown, stale, or mismatched secret | `unknown`; N/A IDs | Unrelated and blocked. |

A fresh participant-shaped HTTP request without the exact armed grant—including a nonexact
target, post-consumption request, or user-activated page-script navigation—is `unknown` with open
binding IDs and a fresh proxy correlation, product-attributable/prohibited and blocked without
consuming or invalidating the grant. The browser/page never sees the grant before proxy injection.
The supervisor is canonical owner: the adapter reserves without state change; the supervisor
validates grant/correlation/attempt/candidate and stores pending while the canonical grant remains
armed, then sends sole exact one-use `browser-broker-decision: candidate-forward`; there is no
separate candidate ACK. That decision alone accepts and atomically consumes the canonical grant,
and only a validated matching decision permits adapter-copy consume/forward. Duplicate/replayed/stale authenticated
candidate/grant IPC, simultaneous second consumption, or skipped/mismatched decision/ACK forwards
nothing and invalidates the run; close destroys the grant. The broker independently validates the grant and correlation.

Only forwarded exact authorized participant or bundled-SPA requests produce the browser/server
two-stream join and server claim. Blocked rows are browser-only; there is no N/A-claim join for
extension, other-host, or unknown actors. Direct Inspector exact-issued requests still use the
product/server pair; nonexact Inspector requests, OS/effects, and MCP are product-only; workflow
outcomes are browser-only. Field-by-field contract and security tests reject every changed
projection, binding, role, and boolean. The
capture script supplies a Node-built-in-only deny-by-default local HTTP/CONNECT proxy, fixed by
study equipment and independent of Playwright/unbound modules. It forwards only an exact
authorized loopback request. It classifies `other-loopback`, `remote`, and `unclassifiable`
targets and every CONNECT request as prohibited, blocks them before DNS lookup, socket
connection, request-body forwarding, or response-content exposure, and never establishes a
CONNECT tunnel. A participant candidate uses the fresh correlation ID generated with its
supervisor-owned grant; only every other logical browser event receives a fresh 32-byte/
43-character unpadded-base64url `X-Inspector-Study-Correlation` from the adapter/proxy. It removes/replaces an existing header and the
Inspector probe assigns it. This non-capability never controls auth/routing. Server
instrumentation rejects duplicates or invalid grammar and sends only the same safe ID to its
ledger; adapters discard the header/raw fields before IPC. The raw header name, framing, and
representation are never retained, hashed, or logged; after strict grammar/canonical validation,
only the decoded canonical safe-ID value may be retained as `correlationId`. Another local client
stays unrelated without actor/process correlation. Required
roles' safe classifications, `subjectId`, and `inspectorProcessId` must match. Missing,
duplicate, extra, malformed, or semantically mismatched safe-ID propagation fails verification.

The evidence contract/data model own exact schemas for `StudyBrowserAttemptBinding`,
`StudyBrowserRequestCandidate`, `StudyServerCorrelationClaim`,
`StudyParticipantNavigationGrant`, and `StudyBrowserBrokerDecision`. The supervisor/broker
generates each fresh binding/attempt ID and distributes runtime-only `attempt-binding` to the
study harness and browser adapter. Prepared/open/closed snapshots are byte-identical and require
both ACKs. Ordered pre-readiness release, both open ACKs, and discovery-context ACK all precede
the readiness response; grants/candidates are permitted only after readiness.
terminalization-decision changes both copies to terminalizing. The adapter destroys only browser/
grant/marker/reservation/candidate/pending state and retains its terminalizing binding until closed
ACK; the harness retains its terminalizing binding and fixed remaining schedule through synthesis.
Both closed ACKs then permit canonical destruction and the next attempt. At most one binding is prepared/open/terminalizing; state is
exactly `prepared | open | terminalizing | closed`. Readiness supplies the process ID and opens
the binding. A valid product/browser/equipment/premature-probe-close cause atomically wins;
later causes are rejected. The supervisor is sole participant-launch controller/direct OS process
observer and sole `product-exit` source, including pre-bootstrap exit; the harness schedules/binds
only. The browser adapter is the sole browser-equipment observer: `browser-exit` means actual
browser process/context exit, and `equipment-failure` means an external browser/OS/environment
bootstrap failure while controller/proxy/auth are healthy. Adapter/proxy/controller/CDP/auth/
marker/IPC/implementation/child-management fault invalidates instead of synthesizing. On probe
close, serialized child state yields product-exit if already exited, premature-probe-close if live,
and no terminalization after normal four-outcome/zero-pending close. The first three map to same-name scoring classes and
premature probe close maps to `equipment-failure`.

Terminalization freezes accepted rows and pending joins. In fixed order the supervisor opens,
mirrors, and routes only missing contexts; the moderator alone constructs their failure/review/
outcome, while the harness retains schedule/orchestration only. Exactly four outcomes are required before close/wipe.
Evidence-role failure invalidates the run and never synthesizes rows. The supervisor fans out
byte-identical `terminalization-decision` to harness and browser adapter; the adapter destroys
browser/grant/marker/reservation/candidate/pending state, retains the terminalizing binding until
closed ACK, and remains alive; the harness retains its binding/schedule through closed dual ACK. Child failure reports use
`attempt-terminalization`; `browser-broker-decision` is supervisor-to-browser-adapter only.
`StudyBrowserBrokerDecision` root is `schemaVersion`, `studyRunId`, `browserAttemptId`,
`correlationId`, `decision` with
`candidate-forward | browser-only-released | joined-pair-released`. `browserAttemptId` is limited to supervisor/broker/harness/adapter
memory, authenticated frames, grants, and safe candidates, never the actual browser, profile,
configuration, credentials, request, application, evidence, or logs.
Valid-marker bound browser-only decisions use the open attempt ID; only missing/invalid-marker
unrelated branches use N/A. A pre-readiness terminal submission, case, and both votes repeat the
same N/A process ID.

Every actual capture uses the prepared-state-selected fixed profile
`playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`: Playwright 1.61.1 `chromium`
revision `1228`, browserVersion `149.0.7827.55`, title `Chrome for Testing`, on Ubuntu 24.04
x64 and Node.js 24.18.0, headed, with a fresh nonpersistent browser context, an
empty extension set, a browser-context-only proxy, and `single-407-basic`. The browser adapter
directly spawns and OS-observes the digest/identity-verified pinned Chromium binary through its
fixed anonymous `--remote-debugging-pipe`, which is browser-equipment control outside the internal
evidence-IPC matrix. It uses pinned DevTools `Target.createBrowserContext` with exact
`proxyServer`, `disposeOnDetach: true`, and empty bypass, plus
`Fetch.enable(handleAuthRequests: true)` and one `Fetch.continueWithAuth` `ProvideCredentials`
response for the exact Proxy Basic challenge. The supervisor
creates a separate fresh `browserProxyMarkerSecret` and sends `proxy-marker-install` directly
to the browser adapter. It stays `prepared` until the adapter completes the exact actual-browser
bootstrap and ACKs; only then do both sides atomically activate it. Failure destroys it without
activation. After run-level capture start and immediately before that attempt's `npx`/first
capturable request, the context requests exact proxy-local URI
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`. The proxy returns one
bodyless 407 with exactly `Proxy-Authenticate: Basic realm="inspector-study"` and
`Connection: close`, and no other header; one canonical Basic retry receives a bodyless 204
whose sole header is `Connection: close`. This bootstrap performs no
DNS/connect, application, correlation, candidate, forwarding, or evidence effect. During capture
each study request carries exactly one canonical Basic marker.

The marker is transport authentication only: even a valid marker cannot determine actor,
product attribution, or forwarding. The secret exists only in adapter attempt-local controller/
auth buffers and the exact DevTools auth request, never browser/child environment or argv. The
secret, raw Basic field, encoded or noncanonical derivative, and proxy configuration are forbidden
from hashes/evidence, logs/output, files, persistent profile/history/cache/keychain or other
credential store, and application requests. Marker-install and DevTools request buffers wipe after
ACK. Normal completion, abort, crash, terminalization, controller failure, and child exit dispose
the context, close equipment pipe/process, and wipe state. The pinned build's pipe-disconnect
contract invokes `CloseBrowserSoon`, and integration verifies that close-on-disconnect path. Any
further platform containment is supplied by study equipment/setup, not synthesized as an internal
Node.js-built-in-only capture role. Adapter crash or DevTools-pipe EOF must
leave no orphan: after observing adapter exit, the supervisor blocks next-attempt/finalize until
all browser-equipment descendants/contexts terminate and the fresh profile is cleaned; this
runtime OS-observer state is not evidence. Actual-browser integration tests inspect an isolated
HOME/XDG tree, context/profile, history, cache, and credential stores after all three paths and
require zero marker, encoded Basic value, or `browserAttemptId` residue.

For an exact authorized participant or bundled-SPA request, the adapter reserves without state
change; the supervisor validates and stores the complete safe `StudyBrowserRequestCandidate`
pending while canonical grant remains armed, then sends sole exact one-use authenticated
`browser-broker-decision: candidate-forward` as acceptance and canonical consume. The adapter
validates it before consuming its copy/forwarding; there is no separate candidate ACK. The Inspector probe strips the correlation header, constructs the sole permitted
`StudyServerCorrelationClaim`, and receives broker acknowledgement before application handling.
The `submit-product-event` outer root is only `inspectorProcessId`, `destinationRole`, `payload`;
the outer process equals the registered probe. The claim is permitted only for participant/
bundled-SPA and requires its payload subject/process IDs to equal the current open binding and
that outer process. The broker keyed by
`studyRunId + correlationId` validates one candidate plus one claim, obtains both browser/server
safe-payload ACKs, releases the two correlated records through `joined-pair-released`, and only
then acknowledges completion. Any mismatch emits zero records.

The join has no timeout, clock, or deadline. It fails only when the HTTP transaction/request
ends, aborts, errors, or closes; the relevant inherited IPC, probe, attempt, or binding closes;
capture stops; or the verified child exits. Duplicate, replay, mismatch, unexpected role/order,
second join, residue, and late input also fail closed. Every failure wipes the pending pair and
marker material, emits no partial record, and rejects later input. Lifecycle-order and race tests
exercise every interleaving without deadline assertions. The existing inherited IPC carries
these operations; no join-specific study-control command is added.

During the exact readiness transition for each successfully launched participant Inspector
process, before returning the readiness response, the supervisor
assigns one fresh opaque `inspectorProcessId` made from exactly 32 cryptographically random
bytes (256 bits) and encoded as exactly 43 unpadded base64url
characters, distinct from OS PID, subject, watchdog, and capture IDs. It is non-human launch
correlation only and is never pseudonymous participant evidence. It is reused only across
request/effect/workflow records for that launch and never across launches. A failure before
launch/readiness uses literal `not-applicable` for the process ID. Pre- and post-readiness
terminalization preserves accepted outcomes and creates a mapped-class context, one failure,
and the required review only for each missing workflow, without duplicate rows. This binds exactly twenty attempts
without retaining OS identities. For each subject the supervisor enables fd6 for exactly one
LF-terminated ASCII `npx --no-install agent-customization-inspector --no-open` line, rejects any
other/extra line, wipes it, and uses no shell. It spawns the candidate-bound local no-install npx
as a directly observed child in that subject's verified distribution `repository/` cwd with a
sanitized environment containing only the bound `NODE_OPTIONS` probe, control endpoint/token, and
minimum safe run/subject IDs. Candidate/proxy authority never enters terminal/env/argv. This
external ephemeral participant equipment is outside the eight long-lived internal descendants.
After every attempt the supervisor closes the fresh child/context and drains/resets/clears fd6 so
no prior input/output/history reaches the next fresh npx/Inspector process/context. The
candidate owns only a dormant optional bootstrap-readiness hook. On reaching bootstrap, block
the body and send exact `StudyPreReadinessBootstrapProof`
`schemaVersion,productId,bootstrapEventId` through `register-pre-readiness-probe`
(`studyRunId,subjectId,bootstrapProof`) to receive `preReadinessProbeId`. Maintain exact
runtime-only `StudyPreReadinessProductBuffer`
`schemaVersion,studyRunId,subjectId,preReadinessProbeId,state`, state
`open | readiness-bound | terminalization-bound | destroyed`. Send canonical N/A draft
observations through `buffer-pre-readiness-product-event`
(`preReadinessProbeId,destinationRole,payload`), require supervisor ACK before each product
effect, and discard raw input immediately. `register-product-probe` takes
`studyRunId,preReadinessProbeId,readinessProof,requestedDestinationRoles`; fresh process-ID
binding plus ordered-release ACK precedes both open-binding ACKs and discovery-context ACK, and
only that complete sequence permits the readiness response. Exit before bootstrap is ordinary
terminalization; exit after bootstrap binds N/A and releases before terminalization. Helpers
never register/emit; bootstrap identity/register/ACK failure invalidates the run. Because the
participant process cannot inherit the supervisor descriptor, the probe uses endpoint/token
environment only for `register-pre-readiness-probe`, `buffer-pre-readiness-product-event`,
`register-product-probe`, `submit-product-event`, and `close-product-probe`. The supervisor routes
each safe event plus `inspectorProcessId` to the distinct product or server adapter/watchdog.
Only `submit-product-event` with `destinationRole: inspector-server-ledger` carries the exact
`StudyServerCorrelationClaim` payload variant. Its outer root is only `inspectorProcessId`,
`destinationRole`, `payload`; the outer process authenticates the registered probe, while the
claim payload's subject/process IDs MUST equal the participant/bundled-SPA open binding and outer process.
The Inspector probe assigns the same closed correlation header before discarding raw fields.
The browser helper strips probe/control environment. Missing/tampered/alternate/duplicate probe,
unsafe raw IPC, path/options/environment retention, or process-ID propagation failure is
critical.

The watchdog generates pairwise-distinct opaque watchdog-instance, watchdog-process-run,
capture-instance, and capture-process-run IDs. Sequence starts at 0 and advances by one.
Canonical envelope bytes are `Buffer.from(JSON.stringify(canonicalEnvelope) + '\n', 'utf8')`
for a newly constructed, non-normalized object with exact order `schemaVersion`, `streamRole`,
`watchdogInstanceId`, `watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`,
`sequence`, `recordKind`, `monotonicNs`, `priorDigest`, `payloadSha256`; there are no extra keys.
`recordKind` is `capture-start | payload | heartbeat | handoff-anchor | capture-stop`, and each kind has the
closed canonical safe-payload schema in `contracts/usability-study-evidence.md`. Start and stop
bind both study digests; heartbeat binds observed adapter/IPC health; stop binds the preceding
envelope digest plus final sequence and kind counts. Lowercase SHA-256 uses 64 zeroes as the
first prior value, then hashes the preceding exact envelope; every payload digest is recomputed
from retained safe bytes. Sequence 0 is the sole start. The scheduler targets a heartbeat every
1,000 ms. Independently of that nominal scheduling assertion, the one observed continuity
ceiling is 1,500,000,000 ns for start-to-first-heartbeat, consecutive-heartbeat,
latest-heartbeat-to-checkpoint/handoff, and last-heartbeat-to-stop gaps; intervening payload
records cannot conceal a missing heartbeat, and only a larger gap fails continuity.

The command phase matrix requires `INSPECTOR_STUDY_WORK_ROOT`,
`INSPECTOR_STUDY_CONTROL_ENDPOINT`, and a fresh per-run
`INSPECTOR_STUDY_CONTROL_TOKEN` made from exactly 32 cryptographically random bytes (256 bits)
and encoded as exactly 43 unpadded base64url characters for every materialize-through-finalize command. Materialize and
`verify -- inputs` ignore and do not require `INSPECTOR_STUDY_CANDIDATE_TARBALL`; it first
becomes required at `capture -- start` and is resent by every later client through finalize.
The candidate file may preexist materialization—the builder creates distributions, not the
candidate. At materialization, authorized setup fixes an identity-pinned `npx` on the sanitized
equipment PATH and one reserved initially empty candidate-launch store-bin slot outside the work
root and distributions; materializer/inputs never reads that slot. After successful
`verify -- inputs` and before start, authorized study setup alone provisions that same known slot
from the candidate tarball plus frozen production graph into a fresh network-disabled,
scripts-disabled store and digest-binds it. At start the supervisor revalidates the inherited fixed
slot and resolves only its sole audited bin through pinned `npx --no-install`. The raw tarball path
never enters child env/argv, no new environment/control field is added, and distribution mutation,
cache/network/install, alternate PATH, global, or fallback resolution is forbidden. The store is
outside runtime/evidence and is destroyed with an absence barrier after abort, stop, or finalize.
At materialization the work root is an absolute existing empty ordinary-local
directory supplied by study setup, and active-platform explicit UNC/server-share/device/network
spellings fail before I/O. A lexically indistinguishable pre-mounted or mapped filesystem
remains the documented FR-022 limitation and is never claimed as proven local.

`INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` is a separate start-through-stop-only runtime input
with exact `127.0.0.1:<port>` form. Materialize, input verification, and finalize neither read
nor require it; pre-stop checkpoint and continuation require it. The exact raw route is authorized
start-through-stop caller transient input → authenticated runtime-control `StudyLiveBinding` →
supervisor dedicated memory → one-use `browser-proxy-binding` → adapter dedicated memory →
attempt-local DevTools control request/browser context. Caller/control/frame/request buffers wipe
after ACK. Only after all six adapter/watchdog registrations and writer-binding barriers are
supervisor-ACKed does the study-browser adapter receive the one authenticated one-use binding
carrying exact `StudyBrowserProxyRuntimeBinding` root `schemaVersion`, `studyRunId`,
`browserProxyAuthority`, validates and binds that exact listener, ACKs, and wipes the frame. Only
that ACK permits `stream-control: start`, capture-start, or start completion. Supervisor/adapter
dedicated memory and the live attempt-local browser context are the only holders through stop;
checkpoint/continuation require equality, and stop/failure closes/wipes all. No browser/child
env/argv, profile/history, or evidence carries it. The adapter installs it only on the fresh browser context, never
as a browser-wide or system proxy. Participant traffic uses its supervisor-owned grant
correlation; the proxy assigns/replaces a fresh safe opaque ID only for other browser traffic.
Another local client remains unrelated and is not product-attributed
without required actor/process correlation. Except for exact runtime-control/frame authentication
and the transient attempt-local DevTools configuration, the authority and browser proxy configuration do not enter retained
evidence, hashing, logs, diagnostics, or output.

The control endpoint is transient and external to the work root and every distribution. On
POSIX it is an absolute Unix-domain-socket pathname. On Windows it is exactly
`\\.\pipe\agent-customization-inspector-study-` followed by 32 lowercase hexadecimal
characters. TCP, UDP, DNS, every network transport, remote/network named-pipe spelling, and
work-root sidecars are invalid. Materialization starts the sole digest-verified capture script as
an internal supervisor, sends exact one-use `StudySupervisorRuntimeBootstrap` after ready and
before root mutation, waits for ACK, then detaches the materializer edge while the supervisor
remains live. At start, that existing supervisor spawns long-lived study-harness, scoring-moderator,
and three adapters; each adapter spawns its watchdog, and only the moderator spawns two ephemeral reviewer collectors per
reviewed failure after failure determination. Token-authenticated hello/challenge sessions keep
the supervisor alive through finalize.
Every runtime-control authentication tag covers the exact canonical message payload. A
transient non-retained HMAC of runtime-control path values is permitted only for channel
integrity; evidence commitments and hashes stay path-free. Initial work-root authority crosses
only exact `runtime-bootstrap`; later work-root/candidate lexical and canonical authority uses
only runtime-control and supervisor memory so later clients can resend it and independently
stat/hash the candidate. Apart from exact transient control-message HMAC, `runtime-bootstrap`,
`browser-proxy-binding`, and their dedicated in-memory holders, capture-evidence
IPC, commitments/hashes as raw input, retained files, logs, diagnostics, and output never carry
those paths, the in-memory HMAC key, or the control
token. The supervisor retains the initial work-root identity, start candidate identity/digest,
checkpoint positions, original handoff anchor, three directly observed adapter exits, three
adapter-observed authenticated watchdog exit attestations, two directly observed orchestrator
exits, and the moderator-observed attested distinct-clean reviewer exit count until finalize,
then destroys all authority values and secrets. Path-free HMAC work-root/candidate identity
commitments and one `controlSessionId` bind start, handoff, continuity witness, and seal.

The contract fixes canonical request/response order, retains `requestId` and closed response
`errorCode`, and never transmits the raw token. The materialized supervisor generates one fresh
run-scoped `controlSessionId` and keeps it stable through finalize. Hello uses null
session/challenge/tag/payload; its response returns that stable session ID, creates only a fresh
one-use `challengeId`, and authenticates the response. Later direction-separated HMACs cover the
complete canonical message with a null tag, and challenges/request IDs are single-use. The
closed internal command set is `hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`. Finalize-prepare performs
the supervisor's internal current-binding, continuity, and exit checks, prepares complete witness
material while the endpoint stays live, and returns literal `null`; the continuity key never
leaves supervisor memory. The verifier then opens a separately authenticated finalize-commit
connection. After accepting it, the supervisor begins listener teardown and returns the exact
`StudyContinuityWitness` over that already-open authenticated connection before destroying keys
and exiting. The verifier requires the complete response followed by EOF and reconnection
failure, then writes and re-reads the witness pair followed by the seal pair.

Retained work-root state is closed to `distributions/participant-01` through
`participant-20`, the three fixed `capture/streams/<role>.ndjson` ledgers with one envelope
line immediately followed by its safe payload line per sequence,
`capture/study-capture-handoff.json` and `capture/study-capture-handoff.sha256`, and, after
successful finalize only, `capture/study-continuity-witness.json`,
`capture/study-continuity-witness.sha256`, `capture/study-capture-seal.json`, and
`capture/study-capture-seal.sha256`. No other retained sidecar exists, and the endpoint and all
runtime-control state are gone before the witness and seal are written.

The controller's checkpoint command makes each sole writer atomically snapshot an immutable
prefix position and monotonic value, then immediately resume appends without pausing heartbeat;
it does not write or accept the handoff. The independent verifier alone writes its canonical
file and companion from that prefix while later pairs may continue to append. The contract's
canonical handoff binds the checkpoint/study identities, both frozen study digests,
`controlSessionId`, both identity commitments, and the exact fixed-order stream prefix state.
After writing it, the verifier sends the run ID, checkpoint request ID, and exact handoff digest
through the authenticated supervisor. Every watchdog appends exactly one matching
`handoff-anchor` payload record after its checkpoint sequence and before stop while normal
append and heartbeat scheduling continue without pause. An ordinary post-prefix pair already
queued at checkpoint may precede the anchor. Continuation validates every intervening pair,
the sole matching anchor, and at least one subsequent ordinary heartbeat or payload on the
same uninterrupted chain. Stops and the final seal bind that digest and require a literal
anchor count of one per stream. Continuation recomputes the complete bound prefix and original
anchor before accepting the first later record's exact next sequence/prior digest. Replacing the
handoff and companion with a different valid prefix fails even when the replacement digest and
later links are recomputed.

`pnpm run study:evidence:inputs -- materialize` invokes the repository-owned descriptor-driven
builder in `scripts/build-usability-study-inputs.mjs` to create exactly twenty fresh
distributions. `pnpm run study:evidence:capture -- <start|checkpoint|stop>` invokes the repository-owned
capture controller in `scripts/run-usability-study-capture.mjs`.
`pnpm run study:evidence:verify -- <inputs|checkpoint|continuation|finalize>` invokes the
structurally independent read-only/recomputing verifier in
`scripts/verify-usability-study-evidence.mjs`. Start returns six stream processes plus a separate
ordered field containing exactly two long-lived orchestrators. Stop requires zero live reviewer,
ends all eight long-lived internal descendants, and leaves the supervisor/endpoint alive. Finalize independently
verifies the complete streams, commitments, original handoff anchor, 80 terminal outcomes, role
matrix, three directly observed adapter exits, three adapter-observed authenticated watchdog exit
attestations, two directly observed orchestrator exits, and the moderator-observed attested equation
`ephemeralReviewerProcessExitCount == reviewVoteCount`, then completes finalize-prepare while the endpoint remains live. A separately
authenticated finalize-commit connection receives the exact witness after listener teardown
begins but before supervisor key destruction and exit. The verifier requires the complete
response, EOF, and failed reconnection to prove endpoint removal, then writes and re-reads the
canonical continuity-witness pair followed by the cross-stream seal pair. The
witness binds the control session, work-root/candidate commitments, original handoff digest,
eight long-lived exits, and the ephemeral reviewer exit count. The seal binds the witness and handoff digests, both study digests, and exactly
three fixed-order first/final stream roots and counts; verified terminal stops and envelope
counts bind terminal sequences. It also binds the exact aggregate summary
`automaticCriticalIssueCount,suspectedWorkflowBlockerCount,reviewVoteCount,reviewDisagreementCount,reviewerCriticalIssueCount,criticalIssueCount,zeroCriticalIssueGate`.
The verifier derives automatic issue IDs as `automatic:<correlationId>` and recomputes
`reviewVoteCount = 2 × suspectedWorkflowBlockerCount`,
where suspected count includes every reviewed nonautomatic failure, plus the reviewer-critical
issue-ID set as exact `reviewer:<subjectId>:<workflowClass>` for confirmed or
disagreement rows, and `criticalIssueCount` as the cardinality of the tagged, de-duplicated
union of `automatic:<correlationId>` and `reviewer:<subjectId>:<workflowClass>` IDs. An
`automatic-critical` workflow row adds no second issue. `zeroCriticalIssueGate` is true exactly
when that union is empty and the exact 20-by-4 terminal set is complete; the 19/20 and 18/20
success thresholds stay independent.

Contract tests own canonical schemas, phase/env/token validation, subject cardinality and
workflow equations, request truth-table and role-matrix rejection, and privacy rejection.
Static/source-structure tests reject imports/helpers and alternate child entries; deterministic
fake-clock tests own the 1,000-ms scheduler and 1,500,000,000-ns boundary; real OS-specific
child-process/control-endpoint integration and security tests own token hello/challenge,
safe-ID propagation, initially-empty candidate-launch slot, post-input digest-bound provisioning,
sole audited-bin resolution, network/scripts/cache/global/fallback rejection and teardown absence,
endpoint placement/teardown, path/secret non-retention, pause/death/restart,
identity and commitment change, eight long-lived exit witnesses and reviewer-exit equality,
crashes after zero through four accepted workflows with exact missing-row terminalization, prohibited combinations, truncation,
corruption, alternate-valid-prefix handoff rewrite, premature stop, and stitch cases. Every
command returns zero only for its complete expected state. Any failure is automatic critical
and streams are never stitched.

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

**Performance Goals**: On the versioned, published profile in
`tests/performance/sc002-reference-profile.json`, visibly render a current-request status
that says queued, names an active phase, or reports complete/`partial`/failed and is exposed to
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
measurement set.
The profile binds `tests/performance/sc002-fixture-manifest.json` by version and the canonical
SHA-256 in `tests/performance/sc002-fixture-manifest.sha256`. The manifest enumerates every
generated entry and each content-bearing file digest. The validator recomputes the canonical
manifest digest and all referenced content digests immediately before run 1 and after each
run; a missing entry or any mismatch invalidates the complete ten-run set, and each run record
repeats the same profile ID, manifest version, and canonical digest.
After the complete
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
launcher owns the only permitted product-initiated child process: its fixed OS browser helper.
The helper receives no inspection-derived content or path in argv or environment, no
authored value or user-supplied command, and no environment-selected handler. It may copy
only the closed ambient platform-key set directly from the launch environment; lexical
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
rendering only. Displayed metadata fields and relationship kinds
must both belong to the maintained closed presentation-allowlist row for the supported
`(tool, kind)` and be recognized by the exact extractor for the actual admitted source form;
entries failing either gate remain available only in complete source text and are never
inferred as metadata or relationships. Product surfaces are limited to syntactic
parsing, reading the value a parser resolves for an allowlisted field, frozen-catalog
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
memory lease, and no liveness probe. It purges on browser/network/
runtime rejection, a transport-reported channel loss, session mismatch, a greater content
epoch, or a non-null disable fence. A lost host closes the loopback socket, which devframe
reports to the page without being asked, so process loss is detected without polling for
it. A page-lifecycle event is not among the triggers: FR-027 purges after a failure or an
equivalent terminal reset, and neither switching tabs nor navigating away is either, so the
client installs no visibility or unload listener.
Monaco receives complete authored source. If the browser or editor runtime cannot compute a
diff, the UI keeps the complete read-only side-by-side source available and reports an
actionable comparison failure without treating either artifact as valid or invalid. HTTP
delivery never truncates an API DTO.

Typed derivation uses the closed `DerivationProgram` schema and only direct edges from an
exact static seed provenance. A derived provenance cannot seed another derivation edge,
while an independent static provenance on the same file remains eligible. Values used to
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
to three admitted tool-specific Global sources produced by one session-wide all-tools
opt-in (at most one each for Copilot, Claude, and Codex), exactly one root per Source, and
exactly two distinct readable customization files in a comparison. Inventory size is governed by the supported runtime and
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
      `.editorconfig`; lint, typecheck, and the automated suites run locally, in independent
      CI jobs, and again
      after final release edits. Every repository remediation found by release review reruns the
      complete applicable automated matrix, invalidates and regenerates every affected
      candidate/profile/fixture/human or manual evidence set, and repeats complete-diff/tarball
      review until no concern remains. After the bilingual Constitution record is the sole
      planned validation-only edit, all applicable automated gates run once more against the
      frozen final tree and final candidate. Outcomes are captured outside the repository; any
      later repository edit invalidates them and returns to remediation, digest/evidence
      revalidation, applicable gate reruns, and complete-diff review before the final sequence.
      The independent ESLint gate and the independent strict `typecheck` type-checking gate
      run in each workflow as well.
      The test layout covers unit, contract, integration,
      security, package, performance, end-to-end, error, boundary, and accessibility
      scenarios, including all four user stories, the published SC-002 profile/status
      request/generation protocol, the ordinary-error failure model (a file-confined
      failure becomes that file's diagnostic in a `partial` generation per FR-028; any
      other failure commits nothing, retains the prior snapshot, and reports the failed
      request's error per FR-030),
      product-issued mutation and OS-atime separation,
      the product-wide FR-032 negative boundary, the complete bilingual 55-row WCAG Level
      A/AA acceptance matrix, FR-039/SC-009 origin-file-less Source Condition Facts, the
      versioned digest-bound nonzero release-evidence denominators for SC-003/004/005/007/009,
      and the repository-owned usability-evidence bundle/capture/verifier protocol. Its
      deterministic contract tests, fake-clock heartbeat boundaries, real child-process/IPC
      integration tests, privacy-negative security tests, and independent final-seal
      recomputation run before human evidence may be accepted.
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
      The four external terminal descriptors, supervisor-owned product child, adapter-owned pinned
      Chromium/DevTools pipe, bound fd5 writer authority, and external candidate-launch store are
      explicit closed study-equipment boundaries; none is a Constitution exception or waiver.
- [x] **Welcoming participation**: One-package setup, reproducible pinned tooling,
      objective expected results, keyboard-first workflows, actionable errors, and
      automated plus manual accessibility gates keep the project approachable. The
      maintainer-owned release study publishes its necessity, accountable owner, funding,
      support, privacy, accessibility, and rerun policy and never shifts recruitment or
      review obligations to ordinary contributors.

### Post-design re-check

The data model distinguishes physical files, candidate provenances, documentation status,
and runtime applicability facts. The session API contract returns complete authored source and
declared authored values only to an explicit detail request over the loopback devframe
channel; the
bundled SPA requests one file or constructs one comparison at a time and shows the result
with no notice in front of or beside it. The session API neither
receives nor persists any acknowledgement or notice state, because neither exists. It provides no masking or reveal workflow, never
resolves environment-variable references, and emits only metadata
fields and relationship kinds that belong to the maintained closed presentation-allowlist
row and are recognized by the exact extractor for the actual admitted source form. The matcher contract
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
project-owned browser launcher removes the shell-bearing `open` package and confines the sole
permitted product child process to a fixed startup OS helper that receives no inspection-derived
content/path, authored value, user command, or environment-selected handler. It copies only the
closed ambient platform-key set directly from the launch environment; lexical equality with a
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
│   ├── usability-study-evidence.md
│   ├── usability-study-evidence.ja.md
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
│   ├── worker-modules.d.ts
│   ├── components/
│   │   ├── inventory/
│   │   ├── inspection/
│   │   ├── comparison/
│   │   ├── consent/
│   │   └── diagnostics/
│   ├── composables/
│   │   ├── comparison.ts
│   │   ├── filters.ts
│   │   ├── monaco.ts
│   │   └── monaco-languages.ts
│   ├── session/
│   │   ├── api-client.ts
│   │   ├── client-data.ts
│   │   └── view-state.ts
│   ├── pages/
│   │   ├── index.vue
│   │   ├── compare.vue
│   │   ├── global-consent.vue
│   │   └── skills/[fileId].vue
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
│   │   ├── applicability/
│   │   │   ├── conditions.ts
│   │   │   ├── context.ts
│   │   │   └── precedence.ts
│   │   ├── recognizers/
│   │   │   ├── claude.ts
│   │   │   ├── codex.ts
│   │   │   └── copilot.ts
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
        ├── identifier-text.ts        # what those identifiers read as on screen
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
│   └── usability-study-evidence.test.ts
├── integration/
│   └── usability-study-evidence.test.ts
├── security/
│   └── usability-study-evidence.test.ts
├── package/
├── performance/
├── e2e/
├── usability/
│   ├── sc001-sc006-study-kit.md
│   ├── sc001-sc006-study-kit.ja.md
│   ├── sc001-sc006-study-inputs.json
│   ├── sc001-sc006-study-inputs.sha256
│   └── sc001-sc006-study-inputs/
│       ├── guidance.md
│       ├── guidance.ja.md
│       ├── task-prompt-sc001.md
│       ├── task-prompt-sc001.ja.md
│       ├── task-prompt-sc006.md
│       ├── task-prompt-sc006.ja.md
│       ├── evaluation-fixture.json
│       ├── evaluation-fixture.ja.json
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
├── build-usability-study-inputs.mjs
├── run-usability-study-capture.mjs
└── verify-usability-study-evidence.mjs

.github/workflows/
├── ci.yml
└── release.yml

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
therefore resolves the same root-absolute, same-origin asset URLs. The `src/server/cli.ts` entry
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
runtime code, its table is the `*-text.ts` companion beside it: `src/shared/api-text.ts`
and `src/shared/registries/identifier-text.ts`. This is also what keeps a contract
identifier off the screen. A rule ID, a metadata field ID, and a condition key are tokens a
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
Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin
Manifests → Hooks. Repository-wide Inventory, Detail, and Comparison Acceptance follow in
that order; Global inspection (US4, P3), cross-cutting verification, and release evidence
remain last.

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

`src/shared/entities.ts` owns the closed `EvidenceAssessment` DTO shape, each registry module
owns the exact `documentationStatus` and `lifecycleQualifiers` on its own subject records,
and `src/server/inspection/rules/registry.ts` is the sole assessment assembler. It resolves the
owning rule plus every referenced behavior and strategy, copies one exact subject record per
`(subjectKind, subjectId)`, rejects missing or duplicate subjects, and sorts by the fixed
subject-kind/ID order. Recognizers and relationship/fact projection consume that assembled
array without recomputing, unioning qualifiers, or reducing status to a scalar.

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
in `tsconfig.json` and is a required quality gate in local verification, its own independent
CI job, and release. `study:evidence:inputs` invokes only
`node scripts/build-usability-study-inputs.mjs`, `study:evidence:capture` invokes only
`node scripts/run-usability-study-capture.mjs`, and `study:evidence:verify` invokes only
`node scripts/verify-usability-study-evidence.mjs`; none belongs to a default build/start/test
chain, and only the explicit initial-release study protocol may invoke them. CI runs `format:check`
as its own job, and release reruns it with the other gates after final edits. `check:official-sources` is the only
documented network-enabled evidence-drift command. The `src/server/cli.ts` entry,
`tsdown.config.ts`, assembly scripts, and these package scripts are foundation prerequisites:
no build or package quality gate may be scheduled before they exist.
Setup therefore configures the formatter and scaffolds the CLI entry plus every referenced assembly
script before it configures or executes package commands, tsdown entries, or CI quality
gates. The Setup stage is not considered runnable until those paths exist.
Production `dependencies` is the exact-version direct set `devframe`, `gunshi`, `yaml`,
`jsonc-parser`, `smol-toml`, `vfile`, and
`vfile-matter`, asserted from `pnpm-lock.yaml` by `tests/package/production-graph.test.ts`;
devframe's transitives are lockfile-owned, and `open` is absent from every dependency
section and production lock closure.
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
`["dist", "README.md", "README.ja.md", "LICENSE"]`; npm also includes
`package.json`, so the tarball allowlist is `dist/` plus those four entries and their
contents, with no source, fixtures, or planning artifacts. The package is CLI-only:
`package.json.bin` is exactly `{ "agent-customization-inspector": "dist/cli.mjs" }`, while
`main`, `module`, and `exports` are absent so no nonexistent library entry point is
advertised. The package test verifies the bin target's exact preserved shebang, launches the
built `dist/cli.mjs` the bin points at, observes the loopback URL, and terminates it. That
proves the Nuxt assets, CLI, and inspection layer resolve from their built locations. It does
not prove the packed tarball: installing one into an isolated fixture and launching it
through `npx --no-install` is T917, which the release gate owns.

The package gate asserts the approved direct production dependency set — exactly those seven
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
  the documented instruction paths — an exact target checks only its own path, and the
  Copilot fixed instructions subtree enumerates only that subtree; neighboring Global
  paths receive no I/O. Traversal and reading follow symbolic links transparently,
  because the inspector shows what an agent reading the same path would see; recursive
  traversal tracks visited directories by real path so a link cycle cannot prevent a scan
  from terminating, and a link whose target is missing or unreadable yields the
  file-scoped `file-unreadable` diagnostic. Hard links are
  ordinary files. Raw entry names are the only filesystem operands, and joined with `/`
  they are the published Source-relative Path. Client-supplied paths never authorize
  I/O; reads are driven by the compiled allowlist plans and server-owned identifiers only.
- Per-file problems use the closed Diagnostic registry: `root-unreadable` (source scope for
  a published Source, session scope for an unpublished Global tool; error), `file-unreadable` (file scope, error),
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
- Static matchers and the exact four initial mappings of the closed `DerivationProgram`
  union are the only candidate read authorities. The one read they do not cover is a
  census-listed companion's, which no admission authorizes and no path outside an admitted
  candidate's own directory can reach (contracts/inspection-path-allowlist.md § Bounded
  companion census) — which is how a skill's sibling `agents/openai.yaml` is published
  (contracts/vendors/openai-codex.md § Derived Repository rules). The derivation schema pins a static seed
  provenance/rule/kind, closed declaration field/syntax, seed-relative or source-root base,
  fixed placement/suffix, and deterministic target construction; callback, arbitrary path join, free-form expression,
  glob, and recursive derivation are unrepresentable. Derived segments pass the host-independent closed spelling grammar
  and must resolve to exactly one enumerated allowlisted entry before read,
  so ADS, device, and trailing-dot/space spellings
  are rejected before the file is opened. FR-015 through
  FR-018 continue to limit Global reads to the three instruction sets even when the vendor
  behavior registry records other supported User customizations.
- Tool recognizers attach exactly one `ToolRecognition` per `(fileId, tool, kind)` and sort
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
  serialized as an authored target. Public provenance scope and order use closed
  `ScopeDescriptor`/`OrderDescriptor` unions with Source-relative paths and stable
  comparison keys; unknown order remains null plus condition facts. A derived provenance
  names the exact `seedProvenanceId`.
  In particular, Repository-root `.mcp.json` merges the Copilot CLI provenance and the
  exact VS Code 1.118+ path-only provenance without another file/read. CLI `mcpServers`
  extraction remains provenance-specific; the VS Code provenance adds no schema fields or
  inferred winner while the registered release-note/current-guide conflict remains open.
- `src/server/inspection/applicability` evaluates only closed composition strategies and their
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
  extraction without HTML rendering. Each allowlisted field carries one entry holding
  the value its parser resolved, in the allowlist row's order; a key declared twice
  resolves to one value, so there is no occurrence index. Only fields resolving to a scalar
  are entries, because a row names scalar fields and a text form of a structure would be a
  value the file does not contain. No entry carries source coordinates: nothing points into
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
  inventory, detail, comparison, Global-control, Diagnostic, Source Condition Fact, API,
  CLI, and documentation projection.
- The Node host is devframe 0.7.5: the CLI starts the app definition through
  `createDevServer` from
  `devframe/adapters/dev`, sets `auth: false`, and binds the loopback `localhost` only. devframe serves
  the built SPA from `cli.distDir` (`dist/public`) and owns port selection, host binding,
  and startup browser opening; the session API is the set of devframe RPC functions
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
  top level. Global consent uses a no-I/O lexical preview retained server-side as the one
  record identified by its opaque `previewId`. Each new unconsented preview reads `COPILOT_HOME`,
  `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once in that order, treats only `undefined`
  as absent, and calls imported `node:os.homedir()` exactly once if any is absent. It uses
  active-platform `node:path.join` with fixed `.copilot`, `.claude`, and `.codex` suffixes
  only for absent entries and never independently chooses `HOME` or `USERPROFILE`.
  Proposed roots are represented and escaped with the supported
  Node.js, browser, and platform string/path facilities rather than product-defined byte
  ceilings. If that environment cannot represent, escape, retain, or serialize a
  proposed root recoverably, the throw/rejection propagates unchanged to the preview
  session-API request boundary as an ordinary error and creates no preview, authority,
  job, or retained failure state. Each accepted entry also retains an internal exact raw
  `lexicalRoot` beside its escaped display in that record. Enable uses only the stored raw
  value, never reverses `displayRoot`, and never rereads the environment.
- Startup browser opening is devframe-owned: the CLI prints the plain loopback origin once
  before devframe attempts the fixed operating-system browser-launch helper permitted by
  FR-022, and `--no-open` disables that attempt without creating any child process. The
  helper invocation receives only the printed loopback origin — no inspection-derived
  content or path, authored value, user-supplied command, or environment-selected handler;
  no Source root, preview root, candidate path, file path, or authored value is copied
  from inspection state into argv or environment, and lexical equality between such a
  value and ambient environment text never changes provenance, grants read authority, or
  selects a handler. The helper delegates only navigation to the OS default handler and
  does not select or verify a browser family/version; a successful open is not
  compatibility evidence. If automatic opening is disabled, unsupported, fails, or the
  handler or its resolved browser is unavailable, cannot be identified, or is outside the
  release-certification baseline, the server keeps running and the printed URL plus
  `--no-open` provide the documented manual-opening fallback in a certified browser
  (FR-001). Tests instrument the launch path to prove the argv/environment boundary
  instead of re-implementing a product-owned platform map beside devframe. The one
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
  Monaco's diff editor owns literal source comparison; recognition metadata is
  matched by `(tool, kind, fieldId)` and compares/renders each field's resolved value in
  Vue rather than serializing it into an editor.
  Repository comparison acceptance first uses two distinct readable current-generation customization files from the
  same Repository Source; only after a successful Global commit does US4 verify a readable
  Repository file against a readable Global file while retaining each owning Source and
  Source-relative namespace.
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
  disposes editor models/workers/subscriptions, clears all session DTO/DOM/detail/
  comparison state, aborts requests, and increments `clientDataEpoch` so a late
  response cannot restore content. Every SessionSnapshot/FileDetail request captures that
  epoch, the owning sequence's current generation — the session snapshot exposes
  `repositoryGeneration` and a nullable `globalGeneration` — plus a file ID where
  applicable and an exact request token. An older
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
  epoch, Global control/progress, pathless tool-failure Diagnostics, and the failed
  requests' errors only. When the disable fence is non-null, the session route supplies the exact
  control-only `GlobalFenceRecoverySnapshot`; when the fence is null, it supplies a normal
  full `InspectionSession`, but the recovering client adopts only those control/error fields
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
  One consent record always previews the fixed closed-order tuple `[copilot, claude, codex]`
  and offers one all-tools confirmation action with no UI or API per-tool selector.
  `confirmedTools` is that complete tuple, including a frozen entry whose lexical preview is
  invalid; eligibility never narrows consent. The server owns one internal
  `GlobalToolControl` for each tuple member. After non-I/O request/`previewId` validation, an
  initial enable keeps the frozen consent and all three controls operation-local and
  unobservable throughout root admission; it creates no session `globalControl` or pending
  state yet. A retry instead uses the existing active consent/control state as its exact
  pre-operation snapshot. New root contexts and candidate Source/boundary IDs remain
  operation-local in either case. Only after every owned tool has a deterministic admission
  outcome does one coordinator decision atomically activate the initial consent/controls or
  apply the retry partition and, when roots were admitted, attach every context and transfer
  one batch. Batch scan results and graph records then remain tentative until their one
  generation commit.
  Initial enable attempts all three frozen entries. Retry derives the complete fixed-order
  `retryableTools` projection from the same tuple: non-pending unpublished `admitted` controls
  plus `rejected` controls whose `retryDisposition` is `same-preview`; it excludes published,
  pending, and lexical `new-preview-required` controls, and the request cannot add, omit, or
  reorder it. Admission partitions that server-owned set into a deterministic
  rejected subset and an admitted subset of zero to three roots. A lexically invalid entry
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
  only the participating controls' applicable failure state, rekeys only Global
  generation-owned graphs and IDs, and invalidates old Global file IDs, detail DTOs,
  comparison selection, and editor state
  once. Repository state is not part of the commit: the Repository sequence, its
  generation, its IDs, and its views are untouched. An all-rejected enable/retry commits
  no generation and changes no committed
  ID. The same coordinator lock linearizes the sequence generations and payload of every
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
  or session-lifecycle lifetime. File scope requires a matching `sourceId`, `fileId`, and
  Source-relative Path; source scope requires only `sourceId`; session scope permits none of
  those location fields. Invalid combinations are rejected, and source/session records never
  fabricate a file ID or path.
  Generation 0 is a committed zero-I/O bootstrap snapshot with exactly one idle Repository
  Source selected lexically from the captured invocation working directory and optional
  `--root`, and with no files or diagnostics, so a fatal first attempt has a legal retained
  current base. Explicit Repository rescans, enabled-Global single-Source rescans, and Global
  batches share the same queue rules. Repeated Global disable joins an existing barrier;
  when no tool-specific Global Source or graph, active consent record, retained admitted
  Global root context, running/queued Global
  scan/enable command, or retained disable failure exists,
  disable is an immediate no-op even if unrelated Repository work exists. The no-op branch
  never enumerates or reads the filesystem, creates a job, or changes the generation, epoch, or fence.

### Closed Runtime State Tables

#### Global root admission

| Input/phase | Internal transition | I/O and public result |
|---|---|---|
| Tool-home setting is captured as `undefined` | `preview-default` | From the one request-wide `node:os.homedir()` capture, use active-platform `node:path.join` with that tool's fixed `.copilot`/`.claude`/`.codex` suffix and zero filesystem I/O, then classify the resulting exact string through the ordered rows below; retain this tool in the fixed three-entry confirmation and create no authority |
| Captured environment setting has length zero | `inputState: present-empty` / `preview-invalid` | Apply this first and only to an environment-origin value; retain the entry in the fixed three-entry confirmation, perform no fallback or filesystem/network I/O, and create no root, Source, job, or generation for it |
| Otherwise the exact string contains U+0000 or an unpaired UTF-16 surrogate | `inputState: invalid` / `preview-invalid` | Reject before `path.isAbsolute`, retaining only the invalid preview entry with zero filesystem/network I/O and no authority |
| Otherwise active-platform `node:path.isAbsolute` returns false | `inputState: relative` / `preview-invalid` | Retain the relative preview entry with zero filesystem/network I/O; do not normalize, resolve, fall back, or create authority |
| Otherwise the string is absolute, including one outside the ordinary home | `inputState: eligible` / `preview-eligible` | Escape and retain the stored exact raw lexical value in the server-retained preview record with zero filesystem/network I/O, keep it in the fixed three-entry confirmation, and await the one all-tools consent action; only this row can reach post-consent admission |
| Consent names a stale, replayed, or superseded `previewId` | `consent-rejected` | Perform zero proposed-root I/O; create no authority |
| A consented root is missing or is not a readable directory | `absent` or `root-rejected` | Record that tool as absent or failed without creating its Source and without blocking sibling tools; continue partitioning the current server-owned set—all three tools initially or exact `retryableTools` on retry |
| Any proposed-root operation throws or rejects unexpectedly | Ordinary-error propagation | Abort the whole Global transaction, discard every provisional sibling context/result, publish no admitted subset, and retain the prior snapshot |
| Post-consent admission succeeds for one or more roots | `root-admitted` batch subset | Atomically attach all admitted contexts/IDs to their controls and transfer them together to the one `GlobalBatchScan`; create no public Source or graph before its single atomic commit |

#### Byte decoding

| Byte condition | `encoding` | Source and recognition state |
|---|---|---|
| Any `0x00` byte | `binary` | No `sourceText`, parser dispatch, recognition extraction, or comparison eligibility. An admitted candidate is diagnostic-only with the file-scoped `file-content-binary` diagnostic and makes an otherwise publishable generation `partial`; a census-listed companion is the ordinary fact of an asset, with no diagnostic |
| No NUL and all bytes decode without replacement | `utf-8` | Record and remove one leading BOM when present; preserve complete `sourceText`; parse it in-process |
| No NUL and one or more invalid UTF-8 sequences, with or without one leading BOM | `utf-8-replaced` | Decode exactly once with replacement semantics, record/remove the leading BOM when present, preserve every resulting `U+FFFD`, and use that complete garbled text for parsing, extraction, display, and comparison; this condition alone remains complete |

#### Scan publication and failure ownership

| Terminal condition | Internal outcome and owner | Atomic public result |
|---|---|---|
| Complete traversal; every file complete, including readable `utf-8-replaced` results; assembly/serialization succeed; authority current | `committable-complete`, coordinator | Commit one `complete` generation of the owning sequence and a complete response; an initial/retry Global batch publishes every admitted tool-specific Source together in this one Global-sequence commit, touching no Repository state |
| Complete traversal; one or more files have only file-confined outcomes (unreadable, an admitted candidate's binary content, parse failure — a census-listed companion's binary bytes are its ordinary fact and confine nothing, FR-025) while every unaffected file is complete | `committable-partial`, scan assembler then coordinator | Commit one `partial` generation of the owning sequence with affected-file diagnostics and complete unaffected results; an initial/retry Global batch still publishes its whole committable admitted subset in this one Global-sequence commit |
| Fixed-three Global admission deterministically rejects every root | `active-no-job`, Global coordinator | Retain active consent/controls, create no `scanRequestId`, batch, Source, or generation, and preserve every existing committed ID exactly |
| The selected Repository root does not exist or cannot be read as a directory | Deterministic fatal outcome, coordinator | Fail the attempt with the source-scoped `root-unreadable` diagnostic while the session stays usable; commit nothing, publish no partial inventory, and retain the prior snapshot; if and only if the attempt is an explicit rescan, mark the retained snapshot stale for that Source |
| The attempt fails before commit for any other reason not confined to one file | `failed` for that `scanRequestId`, owning session-API request boundary | Commit nothing from the attempt, including every tentative Global batch sibling; report the failed request's error ordinarily (`scanRequestId` is null before job acceptance); retain any prior committed snapshot; if and only if the accepted job is an explicit rescan, create or replace that Source's stale overlay storing that error's message; keep the process/session available |
| Automatic startup work with no request owner fails | Propagation to the process top level | Publish no attempt result or generation; make no process/session survival guarantee; the runtime's ordinary uncaught-error reporting applies |
| Disable/shutdown/supersession/failure revokes authority | `revoked`, coordinator | Discard all late bytes, extraction, diagnostics, DTOs, and graph mutations; commit nothing from the revoked request |
| Transport fails after atomic commit | Existing committed outcome, host | Never relabel or expose a truncated body as partial; allow refetch of the already committed generation over the loopback session API |

## Complexity Tracking

The trusted-workspace clarification (spec Clarifications § Session 2026-07-22) leaves no
adversarial-file inspection machinery to justify, so the table carries no row for it.
Devframe adoption (spec Clarifications § Session 2026-07-22, Constitution § Quality and Safety Standards) leaves
none for a per-session capability token, product-owned Origin checks, a hand-written
HTTP router, or a static-manifest/CSP pipeline. With no log-content rule and no sanitized error envelope (spec Clarifications § Session
2026-07-22, Constitution § Quality and Safety Standards) there is no generic error-envelope and no
operational-log/telemetry machinery, so the table carries no row for those either.
The remaining unavoidable implementation costs are tracked explicitly:

| Complexity | Why it is required | Simpler option rejected |
|---|---|---|
| Lockfile-pinned pre-1.0 devframe 0.7.5 host with lockfile-owned transitives (including the h3 2.0.1-rc.22 release candidate) | Reuse the config-inspector-proven local-tool host for static serving, the RPC session API, and browser opening instead of maintaining a hand-written router, token authentication, and static-manifest pipeline; within this repository's own development and CI, the committed lockfile — which the published package does not carry — holds pre-1.0 API churn and the RC transitive at one reviewed baseline for every build and test run, and the manifest's `^0.7.5` only declares the range a deliberate update may move within here (a pre-1.0 caret stays below 0.8.0). A published-package consumer's package manager resolves that same `^0.7.5` fresh against the registry at install time, exactly as it does for any other pre-1.0 dependency; nothing in the package pins a runtime baseline for them | An exact manifest pin would duplicate, for this repository's own builds, the resolution the committed lockfile already owns there — every version move is a reviewed lockfile change either way — without changing what a package consumer resolves, since the published tarball carries no lockfile either way; re-implementing the host in-repo re-creates the complexity devframe already owns |
| Publication-authority revocation with cleanup-only late continuations | Prevent work completed after disable, shutdown, or cancellation from mutating a newer session state | Treating cancellation as physical kernel-I/O termination would make an unsupported guarantee |
| Four fixed external terminal-equipment descriptors and supervisor-owned participant launch | Give participant, moderator, and two isolated reviewer slots deterministic nonrecording/no-echo ingress and give the sole product-exit source a real child handle | Implicit shared stdin cannot isolate votes or contexts; a harness without the product process handle cannot attest exit |
| Adapter-owned pinned Chromium plus anonymous DevTools equipment pipe | Configure attempt-local proxy/auth without env/argv/profile persistence and ground browser/context exit in a direct OS observer | Browser authority in argv, environment, or a persistent profile violates the privacy boundary; an unowned browser has no trustworthy equipment observer |
| Runtime-only `StudyStreamWriterRuntimeBinding` for fd5 | Bind the inherited append-only handle to authenticated adapter identities and stable handle metadata before watchdog registration | An unbound fd5 can be swapped, aliased, duplicated, or accepted by the wrong role |
| Identity-pinned, network/scripts-disabled candidate-launch store outside work root/distributions | Make the exact frozen packed candidate the sole `npx --no-install` resolution without mutating participant repositories or exposing tarball authority to the child | Global/cache/fallback resolution is not candidate-bound; installing into each distribution changes the study input and provenance boundary |

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
