# Data Model: Inspect Agent Customizations

[日本語](data-model.ja.md)

The model has two representations:

- **Internal session records** may contain absolute paths, raw bytes, and decoded
  authored content while an atomic snapshot is being built. They never enter public DTOs
  or Diagnostics.
- **Public DTOs** contain Source-relative locator fields for inventoried files and safely
  normalized in-Source targets, complete authored source text for readable files, the value the
  parser resolved for each declaration the recognized kind publishes, the exact decoded
  source slice of an authored relationship target, escaped non-authorizing root
  presentation labels, recognitions, relationships, diagnostics, and opaque
  generation-scoped IDs. Environment-variable references in
  authored content remain literal text and never authorize reading process-environment
  values.

The checked-in release-evidence fixture manifest is test-only data, not a product DTO. Its
closed versioned schema contains unique stable case IDs; SC-003/004/005/007 criterion
and required-class membership; a fixture or deterministic-builder reference; an objective
expected outcome; each referenced fixture digest; and declared nonzero class minima.
`manifestVersion` is a positive safe integer whose initial value is 1. A
separate canonical digest file covers the manifest bytes. Release evidence names that
version/digest and every executed case ID; schema errors, duplicate or missing cases, empty
classes, fixture/digest drift, unexecuted cases, or denominator counts below a declared
minimum are invalid release records. Case removal or reclassification, a required-class
definition change, or an expected-outcome change requires a manifest-version increment and
explicit review; a fixture-byte-only change instead requires updated affected-fixture and
canonical-manifest digests. The revision-policy validator accepts two test-only manifest
objects, `previous` and `current`; a denominator-semantics change requires
`current.manifestVersion > previous.manifestVersion`. These table-driven comparison
objects and their change classification are contract-test inputs, not release DTOs or review
records. Digest drift alone never authorizes changed denominator semantics. Human review is
recorded separately in the bilingual release validation with initial-creation or
prior/current-version context, changed denominator members/definitions/outcomes, and a
reviewer decision/reference.

## Entity relationships

```text
ContractRegistry (immutable, contract-versioned)
├── VendorBehaviorStatement
│   └── EvidenceCitation (one or more)
├── RuntimeCompositionStrategy
│   └── EvidenceCitation (one or more)
└── InspectionRuleRegistry
    └── InspectionRule
        └── EvidenceCitation (one or more)

SessionSnapshot
├── Source (exactly one Repository)
│   ├── SourceBoundary (exactly one)
├── Source (zero to three Global; at most one per supported tool)
│   ├── SourceBoundary (exactly one admitted tool home) → owning GlobalToolControl
├── ScanAttempt (zero or more queued; at most one running; never public before commit)
├── RepositoryScanGeneration (exactly one last committed; the Repository sequence exists from bootstrap)
│   └── CustomizationFile
│       ├── ToolRecognition (zero or more; empty exactly for a file no recognition
│       │   owns — a file only the census lists, or an admitted candidate whose read
│       │   left it diagnostic-only)
│       ├── Relationship (zero or more)
│       └── Diagnostic (zero or more)
├── GlobalScanGeneration (zero or one last committed; a Global sequence exists only between
│   enable and disable; same CustomizationFile substructure)
├── StaleSourceFailure (zero or more unresolved explicit-rescan failures)
├── GlobalConsentPreview (zero or one current lexical preview)
├── GlobalConsent (zero or one active record)
│   ├── GlobalToolControl (one per confirmed tool)
│   └── GlobalControlView (null or one recoverable public control DTO)
├── GlobalEnableOperation (zero or one running/queued cancellable command; internal)
├── GlobalDisableOperation (zero or one joined priority-barrier command; internal)
└── Diagnostic (file- or source-scoped failures)

BrowserState
├── ClientDataState (request/epoch/session/fence guards and central purge)
├── FilterState
├── ComparisonSelection (one per kind-specific comparison surface: the route's own coordinates)
├── EditorModelState (zero or more, active route/generation only)
├── RecoveryViewState (control-only post-purge recovery and explicit resume)
└── SessionViewState (booting/inspection/recovery/ended view and transport-loss adoption)
```

## Entities

### SessionSnapshot

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Random per process; non-authorizing session identity only, never an access-control secret |
| `createdAt` | `UtcTimestamp` | DTO | Process start time |
| `sources` | `Source[]` | DTO | Exactly one Repository; zero to three Global, with at most one for each of Copilot, Claude, and Codex |
| `repositoryGeneration` | `GenerationNumber` | DTO | Identifies the Repository sequence's last committed snapshot; monotonically increases only on a successful complete or partial Repository-sequence commit |
| `globalGeneration` | `GenerationNumber \| null` | DTO | Identifies the Global sequence's last committed snapshot; null exactly while no Global sequence exists (Global inspection disabled or never enabled); monotonically increases within one sequence, and a fresh sequence created after disable restarts at `1` under the incremented `globalContentEpoch` |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | Derived from `staleFailures`; stale exactly while one or more explicit-rescan failures remain unresolved |
| `staleFailures` | `StaleSourceFailure[]` | DTO | One current entry may exist per published Source, sorted by Source; empty exactly while `snapshotState` is current |
| `globalControl` | `GlobalControlView \| null` | DTO | Null only when no active consent/control state exists; lets a fresh client recover immediate disable and preview-gated retry controls after a purge without exposing raw roots |
| `globalEnableInProgress` | `{ kind: 'initial-enable' \| 'retry', operationId, previewId } \| null` | DTO | Read-only coordinator projection for any registered Global enable operation; contains no tool subset/outcome, root, context, source/boundary/scan ID, job, or authority and lets a fresh client suppress duplicate retry, refetch the frozen preview, and invoke disable |
| `globalDisableInProgress` | `{ operationId, state: 'draining' \| 'committing' \| 'failed', message? } \| null` | DTO | Read-only projection of a non-complete disable barrier, including when `globalControl` is null; contains no root/content/resource ledger, selects the control-only all-inspection-data fence, carries the failed request's error message in `message` only while `failed`, and lets a fresh client join or retry cleanup |
| `globalContentEpoch` | non-negative safe integer | DTO | Starts at zero and increments atomically on first acceptance of each non-no-op Global disable barrier; every ordinary success is bound to it so the server rejects an inspection-data success not yet linearized at the fence and clients reject older data after observing the greater epoch |
| `sessionDiagnosticIds` | opaque string[] | DTO | Current out-of-generation lifecycle diagnostics |
| `repositoryFailureDiagnosticId` | opaque session Diagnostic ID or null | DTO | Current deterministic automatic Repository admission/initial-scan failure; retained while the first explicit rescan runs, then cleared on success or atomically replaced by that rescan's `StaleSourceFailure` owner on terminal failure |
| `invocationCwd` | absolute platform path string | internal | Exact value captured once from `process.cwd()` before CLI validation; never changed or exposed as read authority |
| `rootOptionValue` | exact string or null | internal | Null when omitted; otherwise the sole validated `--root` argument retained for lifecycle/audit correlation only; it is never used as a filesystem operand after lexical selection |
| `selectedRepositoryRoot` | absolute platform path string | internal | `invocationCwd` when `--root` is omitted; otherwise the absolute option kept as given, or the relative option resolved against `invocationCwd` with the platform `node:path` resolution; selection performs zero filesystem or network I/O |

`SessionSnapshot` is the normal full snapshot and is returned only while
`globalDisableInProgress` is null. Once a disable barrier is accepted, the committed
generations and all Sources may remain internally for cleanup/retry, but every full session,
inventory, generation, Source, file, detail, Diagnostic, relationship, authored metadata,
and comparison route returns the fixed `global-disable-pending` conflict. The session route instead returns
the separate control-only `GlobalFenceRecoverySnapshot` below. Each data handler captures
`globalContentEpoch`, fully constructs its success body, then under the coordinator lock
requires the epoch unchanged and the fence still null before binding it; otherwise it
discards the body and returns the conflict. A body completely bound before acceptance is
pre-fence-authorized and cannot be recalled; another tab may receive and adopt it until that
client observes the greater epoch/fence. This bounded in-flight residual is explicit, not a
claim of retroactive revocation. The browser purge below removes it after observation. A
`failed` disable never restores data access. Terminal success for `remove-active-state`
discards the entire Global generation sequence and its Sources while leaving the Repository
sequence, its generation, and its IDs untouched; terminal success for `cleanup-only` removes
the fence while changing no committed state. Either terminal success re-exposes the
unchanged Repository generation. Process restart is the fallback for unrecoverable cleanup.

### GlobalFenceRecoverySnapshot

This exact DTO is the only session response while `globalDisableInProgress` is non-null. It
contains `{ sessionId, globalContentEpoch, globalControl, globalEnableInProgress,
globalDisableInProgress }`. The disable
projection is required and non-null and, while `failed`, carries the failed request's error
message. A failed tool's reason is on its own control as that control's `failureCode`, so
recovery needs no Diagnostic array of its own. It has no generation, Source, Repository
failure, stale-failure, Diagnostic or error, file, path, authored value, or resource
field.

The CLI captures `process.cwd()` exactly once and accepts `--root <path>`; a repeated
`--root` resolves to the argument parser's last value (last-wins). An explicit empty value
produces a fixed actionable, source-value-free startup error before session creation or
browser opening; a missing value is rejected at the same boundary by Gunshi's typed
argument validation, which the product does not duplicate (FR-001). An absolute option is kept as given; a
relative option is resolved against the captured `invocationCwd`. Root selection uses no
`process.chdir()`, environment reread, or filesystem I/O; whether the selected root exists
and is readable is decided by the first scan (FR-002), not at selection time. At process
start the session publishes zero-I/O bootstrap Repository generation 0 with empty files/diagnostics,
an enabled idle Repository Source bound to that selected string only as non-authorizing
identity, and no Global Sources before automatically queuing the first Repository scan. It
has no repository picker, ancestor search, profile, cache, or resume identifier.

The local host is the devframe local-tool framework with authentication disabled
(spec Clarifications § Session 2026-07-22; Constitution § Quality and Safety Standards). devframe serves the
built SPA directly from the packaged `dist/public` tree, exposes every session API
operation as a devframe RPC function (`defineRpcFunction`) on the same loopback channel,
and owns port selection and host binding, while the product owns startup browser opening
through the `open` package with devframe's bundled opener disabled. Session protection
is the loopback-only `localhost` bind: the model defines no per-session capability or token
entity and no request-classification record, and the residual exposure of an
unauthenticated loopback host — other local processes and, via DNS rebinding, a
malicious web page — is the documented limitation (QR-003).

`UtcTimestamp` is an exact 24-byte ASCII UTC value in
`YYYY-MM-DDTHH:mm:ss.sssZ` form with valid calendar fields; every field called timestamp in
this model uses it. `GenerationNumber` is a non-negative safe integer representable by the
active Node.js runtime.

The Inspector defines no product-specific byte, file-count, entry-count, graph-count,
parser-depth, request-size, response-size, queue-capacity, or
wall-clock resource ceiling. Capacity is inherited from Node.js, the parser libraries, the
browser, the operating system, the filesystem, and the execution environment. Error
handling is layered: a failure confined to one file becomes that file's
Diagnostic under FR-028, while any other thrown or rejected read/parser/scan
operation is not caught or classified by the domain layers. Such an operation produces no
item, Diagnostic, scan result, response body from the attempt, or generation. A request-owning
outer boundary reports the failure ordinarily as that request's error; an automatic
startup operation reaches the process top level. Unrecoverable engine/process termination
and runtime-owned uncaught-error output cannot be converted into or controlled by an
application Diagnostic.

Successful API responses contain complete DTOs and are never deliberately truncated.
Response serialization is owned by the devframe RPC channel: the handler commits its
state/job under the coordinator lock and returns the declared result value, and devframe
serializes that value — successes and handler errors alike — as-is. A second, pre-serialized copy cannot be expressed on the devframe channel
without redundant serialization, and every declared result is a plain JSON value whose
serialization cannot fail outside an implementation bug. A
serialization/encoding or delivery failure after the handler returns never rolls back or
duplicates the committed job/state, records no second failure,
and never converts a truncated body into a partial DTO; the request reports its ordinary
error and the client recovers from a fresh
session snapshot, exactly as for a transport failure. Monaco and the browser likewise use their
environment-provided capabilities; comparison failure leaves every present side's
complete authored source view available — both files', or the one present file's beside
its stated absence.

An authority-free live-operation projection such as `globalEnableInProgress` is not an
admitted success and may appear while its owning session API request is still running. It contains
no candidate state or authority, is removed if that operation fails before its atomic
commit, and does not weaken the success-response gate for any committed state.

Global disable is the sole exception because barrier acceptance must revoke publication
authority before asynchronous drain can complete and cannot truthfully be rolled back. Its
acceptance mutation, terminal success gate, retained request failure, and retry rules
are closed by `GlobalDisableOperation`; no other command may copy that exception.

### Source

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ASCII string | Server-generated and stable for the process lifetime |
| `kind` | `repository \| global` | Exactly one Repository source; zero to three Global Sources |
| `tool` | `copilot \| claude \| codex \| null` | Repository pairs with null; each Global Source pairs with exactly one supported tool, and no two Global Sources share a tool |
| `enabled` | boolean | Repository and every published Global Source are true; absence means only that no Source is published for that tool, while `globalControl` distinguishes disabled, pending, and retryable control states; a disabling source remains true until atomic removal |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | Follows transitions below; public `partial` denotes only a generation committed after complete traversal in which one or more files have file-confined outcomes (unreadable, an admitted candidate's binary content, parse failure — a census-listed companion's binary bytes are its ordinary fact and confine nothing, FR-025) while every unaffected file is complete; `failed` means the latest attempt failed while the last committed snapshot remains available; only a fatal explicit rescan marks that snapshot stale |
| `boundary` | `SourceBoundary` | Exactly one selected root: the captured `process.cwd()` or resolved `--root` for Repository, or the one consented home root for this Global Source's tool |
| `generation` | `GenerationNumber` | Equals the owning sequence's last committed generation: `repositoryGeneration` for the Repository Source and `globalGeneration` for every published Global Source |
| `scanRequestId` | opaque ASCII string or null | Latest admitted scan for this Source; set immediately on admission and retained through waiting/scanning/ready/partial/failed so status cannot be confused with an older request; null only before any scan admission, or after every admitted attempt for the Source has had its publication authority revoked — a revoked attempt's overlay reverts to the exact pre-admission state, so the Source states no request rather than one whose result was discarded |
| `progress` | `ScanProgress` or null | Non-null only while `scanning`/`disabling` or after `ready`/`partial`; null for `idle` and `failed` |
| `diagnosticIds` | opaque string[] | Source-scoped diagnostics in the last committed generation |

`status`, `scanRequestId`, and `progress` are session-owned operational overlays; a fatal attempt may update
them without mutating the committed Source graph or generation-owned IDs. Boundary,
condition, file, recognition, relationship, and generation-scoped diagnostic content
changes only through an atomic generation commit.

### SourceBoundary

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `tool` | `copilot \| claude \| codex \| null` | internal | Must equal the owning Source's already-published tool; Repository uses null |
| `displayRoot` | ASCII `RootPresentationEncoding` string | DTO | Deterministic encoding of the Source root; not a `SourceRelativePath`, inventory-item locator, caller input, or read authority |
| `root` | exact absolute platform path string | internal | The selected Repository root or this tool's consented home root; the base path for every inspected-source filesystem operation of this Source |
| `origin` | `process-cwd \| root-option \| default-home \| environment` | DTO | Explains how the root was selected without granting read authority |

Every Source has exactly one boundary and root. The Repository boundary exists in
generation 0 with an escaped `displayRoot`; a Global boundary's `tool` must match its
owning Source and its active `GlobalToolControl`. Tool homes are never combined into one
Source. All inspected-source filesystem I/O lives in the single inspection module under
`src/server/inspection/` and is read-only ordinary `node:fs/promises` traversal below the
boundary root (QR-003, FR-019). Traversal and reading follow symbolic links transparently,
because the inspector shows what an agent reading the same path would see; a link whose
target is missing or unreadable yields that file's ordinary per-file diagnostic, and
recursive traversal tracks visited directories by real path so a link cycle cannot prevent
a scan from terminating (FR-024). A file that cannot be read yields a per-file diagnostic
without affecting other files (FR-028). A Repository root that does not exist or cannot be
read as a directory fails the scan with an actionable diagnostic while the session stays
usable and publishes no partial inventory for that attempt (FR-002); a consented Global
root that is missing or not a readable directory marks that tool absent or failed without
preventing the other tools from committing (FR-013).

### SourceRelativePath

`SourceRelativePath` is the value object used for file display, filtering, admission
records, and normalized relationship targets.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ID | Binds the path to one owning Source; never accepted alone as read authority |
| `value` | POSIX-style string | The exact raw entry names joined with `/`, relative to that Source root; no leading slash, URI scheme, NUL, empty or dot segment, `..`, home shorthand, or environment expansion |

For the Repository Source, `value` is relative to the selected Repository root. For a
Global Source, it is relative to that tool's admitted home root. The value is the
presentation, filtering, lookup, and selection identity and is spelled exactly as the
raw entry names traversal returned (FR-024); filesystem operations use the retained raw
segments rather than re-parsing it. A raw name is the string Node.js returned for the
entry — `fs` decodes names as UTF-8 by documented default, so a platform name that is
not valid UTF-8 arrives replacement-decoded, and a name the platform cannot resolve
again through that string surfaces as the affected operation's ordinary failure. Presentation escapes control characters, the bidirectional formatting characters
(U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069), and lone surrogates without
changing the stored value: the formatting characters reorder the text around them, so a
path carrying one would render as a different path than the one it identifies, and a
lone surrogate draws as the one replacement glyph, so two names differing only in which
surrogate they carry would render identically. A path label with
no character that draws — one built only from whitespace or default-ignorable code points
such as U+200B — is instead spelled out in full, because a label that renders as nothing
leaves its control with neither visible text nor an accessible name. On the wire, `sourceRelativePath` serializes only the `value`
string; the containing file DTO's `sourceId` supplies the public ownership link.

### Packaged dist contents

There is no shipped static-asset manifest entity. The packaged `dist/` tree is tool-owned
build output: the pipeline's clean step guarantees a fresh `dist/`, `nuxt build` emits the
SPA into `dist/public`, and tsdown emits the Node server bundle at the dist root. The
devframe host serves `dist/public` directly, and `package.json.bin` maps directly to
`dist/cli.mjs`; artifacts that ship together are not re-verified against each other at
user runtime (Constitution Principle I — the build pipeline and release gates own artifact
integrity).

The `verify:package` release gate checks exactly the two entry points the package
contract depends on, each as a regular file: `dist/public/index.html` (the SPA shell
served by the devframe host) and `dist/cli.mjs` (the direct `package.json.bin`
target). Package tests separately assert the exact
contracted `package.json` `name`, `version`, `type`, `bin: dist/cli.mjs`, `files`, and
`engines.node` values against the packed tarball. `node:fs` may read package-owned files
but never treats build output as an inspected-source fallback.

### GlobalRootInputCapture

Each request that creates a new unconsented preview creates one operation-local capture.
The host reads the three environment properties exactly once in the fixed order
`COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`. Only a captured JavaScript `undefined`
means absent; every string, including `''`, is a present override. If at least one property
is absent, the host calls the already imported `node:os.homedir()` exactly once for that
request and retains its exact returned string as `capturedHomedir`. It does not read or
choose `HOME`, `USERPROFILE`, or another platform home input itself; the Node.js API owns
that platform behavior.

The fixed mapping is Copilot → `COPILOT_HOME` or
`node:path.join(capturedHomedir, '.copilot')`, Claude → `CLAUDE_CONFIG_DIR` or
`node:path.join(capturedHomedir, '.claude')`, and Codex → `CODEX_HOME` or
`node:path.join(capturedHomedir, '.codex')`. Each join occurs at most once and only for an
absent property. It is lexical and performs no existence check or other filesystem
operation. Its exact string becomes `lexicalRoot`; empty, relative, NUL-containing, or
otherwise unrepresentable results remain strings and receive the closed lexical input state
instead of another fallback. If environment access, `homedir()`, joining, retention,
presentation encoding, or preview serialization throws/rejects or
cannot produce the required string, the operation-local capture is discarded and the session API
request fails ordinarily with that error before acceptance. It creates no preview,
`scanRequestId`, consent, root, Source, or authority. A successful preview owns the capture
and freezes its three exact roots; active consent retrieval never repeats it.

### GlobalConsentPreview

The session API consent route creates this preview from exactly one
`GlobalRootInputCapture` using lexical path operations only. Creating or returning it
performs no filesystem operation under any proposed Global root.

| Field | Type | Rules |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | Canonical encoding of an independent 32-byte CSPRNG draw and a process-memory lookup key; a new preview invalidates the previous unconsented preview, while active consent freezes and reuses its exact preview |
| `previewEpoch` | non-negative safe integer | Internal and never serialized; increments with every newly captured preview and binds replacement/revalidation without using an opaque ID as an order value |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | date string | Version of the shipped typed traversal-plan set; with `allowlistVersion` this record-level pair identifies the closed selection policy and canonical selector programs the preview binds |
| `entries` | exactly three tool entries | Fixed Copilot, Claude, and Codex order |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | An environment entry is used even when invalid; no silent fallback |
| `entries[].lexicalRoot` | exact raw string | Internal only; preserves the pre-escape environment/default value; never logged or serialized |
| `entries[].displayRoot` | ASCII `RootPresentationEncoding` string | Exact deterministic encoding of `lexicalRoot`; originates before an owning Source exists, and is never a `SourceRelativePath`, inventory-item locator, canonicalization claim, or read authority |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | Assigned by the exact ordered `Global lexical state` algorithm below before I/O; only `eligible` may become a boundary after consent |
| `excludedRuleIds` | sorted excluded rule ID[] | Drives the displayed exclusions without accepting authored prose |

`allowlistVersion` and `traversalPlanVersion` are both `YYYY-MM-DD` date strings that name
the shipped contract as a whole and the shipped compiled `TraversalPlan` set, respectively.
Each is bumped in lockstep with any change to what it identifies — `allowlistVersion` when
the presentation allowlist / vendor contracts change, `traversalPlanVersion` when any
compiled plan in the shipped set changes — and each has one canonical current value baked
into the shipped registry, not derived at runtime. They are distinct from the per-plan
`TraversalPlan.schemaVersion` (fixed literal `1`), which versions the plan-record shape, not
the plan set's contents; a plan-set change bumps `traversalPlanVersion` without changing
`schemaVersion`.

The host applies `RootPresentationEncoding` without changing the retained raw value. Its
ability to allocate that value is inherited from Node.js, the operating system,
and the browser. A throw/rejection during lexical preview creation reaches the session API request
boundary before acceptance and fails that request ordinarily without a
`scanRequestId`, normalization, canonicalization, root creation, or read. It does not create
a size-based input state. The preview is the one server-retained record identified by its
opaque `previewId`; neither root field is nullable, and no encoding step relies on
reversing an escape or on Unicode normalization. An invalid environment value is
escaped and displayed but is not normalized into an authorized path. Present-empty,
relative, and invalid entries use only fixed preview presentation and create no retained
`Diagnostic`. After confirmation all three entries receive a `GlobalToolControl`; only an
`eligible` entry may enter post-consent admission and later produce a tool failure
Diagnostic. A lexical-ineligible control is a path-free rejected control whose fixed
reason remains visible through the frozen preview. Every absolute spelling is `eligible`
regardless of whether it lies outside the ordinary home; that location alone neither
rejects it nor grants pre-consent I/O. Only an absent setting selects the documented
default. An empty, relative, invalid, or post-consent rejected setting never creates
fallback authority.
Admission uses only the stored internal raw `lexicalRoot`; it never uses `displayRoot` as a
path and never rereads the environment. Preview creation/retrieval linearizes under the
coordinator lock. While consent is active, an initial `GlobalEnableOperation` is registered,
or a non-complete `GlobalDisableOperation` retains its preview fence, retrieval returns the
same DTO-visible object byte-for-byte in field semantics,
including its ID, and never rereads the environment or creates a replacement.
Only when neither condition holds may a request perform a new capture, increment
`previewEpoch`, and replace the prior unconsented preview. If an initial operation terminates
without activating consent, its freeze ends only after the operation unregisters. This is
the only recovery path for redisplaying exact consent after a client purge and prevents an
in-flight enable from committing authority for an unreachable preview.

### GlobalConsent

| Field | Type | Rules |
|---|---|---|
| `allowlistVersion` | date string | Must equal the displayed current contract |
| `previewId` | opaque string | Must match the current in-memory preview exactly |
| `confirmedTools` | exact `[copilot, claude, codex]` | Server-derived fixed set matching all three frozen entries; the request contains no selector and cannot narrow it |
| `confirmedAt` | `UtcTimestamp` | Memory only |
| `active` | boolean | Cleared when Global inspection is disabled and all tool-specific Global Sources are removed |

Consent authorizes only the paths shown in the allowlist contract. It does not authorize
neighboring settings, credentials, state, skills, plugins, or arbitrary env paths.
The confirmation command contains no tool list: after verifying the frozen preview, the
server derives all three tools in closed order, including entries already known lexically
invalid. On retry, the server derives the work set only from controls projected in
`retryableTools`—non-pending unpublished admitted controls and rejected controls whose
`retryDisposition` is `same-preview`. Lexical `new-preview-required` controls remain
excluded under the frozen preview; the client still cannot alter
consent by selecting tools.
After confirmation, each eligible frozen root is admitted exactly when it exists and is a
readable directory; a missing or unreadable root rejects only that tool with its
actionable failure record and no fallback. The application never substitutes another root
or broadens consent; the user must make that exact frozen root admissible and use the
same-preview retry. If the root string itself must change, the user disables Global
inspection and requests a new preview instead.
Each admitted tool may create one Global Source bound to that tool's one shown
root. Confirmation never creates a combined Global Source and never gives one tool's
Source authority over another tool's root.
If initial enable leaves any retryable tool without a Source—including all-rejected
or mixed outcomes—the exact active consent and its `GlobalToolControl` records may requeue
only that complete server-derived retryable subset. Lexical-ineligible controls require
disable and a new preview. Existing Sources retain their semantic content and stable `sourceId`.
Each successful initial or retry admitted-subset transaction publishes all newly admitted
Sources together and commits exactly one Global-sequence generation — creating the sequence
at generation 1 when none exists, or atomically replacing the current Global snapshot at
exactly N+1 — regenerating every Global generation-owned ID and invalidating only the
Global sequence's old file/detail/comparison/editor state; the Repository sequence, its
generation, its IDs, and its views are untouched. A different preview or root requires disabling
Global inspection first; a request with no retryable tool is rejected as closed conflict
`no-retryable-global-tool`.

Post-consent root admission can admit zero to three tools. The serialized coordinator
activates consent and creates at most one provisional batch scan for the entire admitted
subset. A lexical-invalid entry or a root that is missing or not a readable directory
affects only that tool. Any unexpected throw/rejection propagates to the session API boundary,
aborts the whole transaction, and publishes none of its provisional subset. If
every tool is deterministically rejected, consent remains active, no Source or scan job is
published, and the operation returns the contracted `active-no-job` state.
Initial activation therefore has zero Global Sources; an all-rejected retry commits no
generation and leaves existing Sources and their IDs unchanged. A later exact-consent retry
may revalidate only the current server-derived `retryableTools` subset; changing the lexical
root or making a lexical-ineligible control eligible requires disable and a new preview.

### GlobalToolControl

| Field | Type | Rules |
|---|---|---|
| `tool` | tool enum | Exactly one of each supported tool exists while consent is active |
| `previewId` | opaque string | References the active frozen preview and cannot be changed in place |
| `state` | `unvalidated \| rejected \| admitted \| published` | All three provisional operation-local controls begin `unvalidated`, but that state is never serialized in an active `GlobalControlView`; lexical-ineligible entries become rejected without filesystem I/O, `admitted` has passed readable-directory admission but has no published Source, and `published` has exactly one Source |
| `sourceId` | opaque ID or null | Allocated only after successful root admission; remains internal until a Source commit and is discarded if admission must be repeated |
| `failureCode` | closed reason code or null | Non-null exactly while this tool has failed and has no published Source. Lexical rejection reasons are exactly `present-empty \| relative \| invalid`, a root that is missing or not a readable directory is exactly `root-unreadable`, and a deterministic post-consent scan failure carries its own reason; none contains a path or environment value. It is the failure — the client renders the sentence the code names, and no Diagnostic restates it |
| `retryDisposition` | `same-preview \| new-preview-required \| null` | Null unless `rejected`; lexical reasons are exactly `new-preview-required`, while every deterministic post-consent admission/initial-scan reason is `same-preview` |

`GlobalToolControl` is session control state, never part of a scan working set. A
successful admission preallocates its unpublished Source ID before queuing the single
provisional subset scan. A deterministic fatal initial scan destroys the entire batch
working set but leaves this control for exact-consent retry; every retry re-admits the
same frozen root—readable directory or not—before scanning, without mutating the
pre-operation control until its atomic disposition commits either the
rejected state or the admitted replacement. An unexpected throw/rejection discards only
operation-local state and leaves every pre-operation field active and
unchanged. A post-consent admission failure therefore commits a `rejected` control only at
that disposition and can be revalidated under the same preview. A successful Source commit
publishes the preallocated ID and binds its `SourceBoundary` to the admitted root. A
deterministic admission rejection or fatal returned scan outcome sets or replaces that
control's `failureCode`. A lexical `present-empty`, `relative`, or `invalid` rejection is
explained by that code plus the frozen preview, and needs nothing further. An unexpected throw/rejection creates no per-tool failure and,
for an accepted admitted-subset Global batch, is recorded once for the whole consent as the
failed request's error in the failed `batchStatus`. A
successful Source commit clears the applicable deterministic failure record, and unrelated
tool outcomes preserve it. Global disable first aborts work, then removes all
control-owned diagnostics and removes every control with the consent and frozen preview.
No DTO can create or mutate this authority.

### GlobalControlView

| Field | Type | Rules |
|---|---|---|
| `state` | `active \| disabling` | `disabling` begins when the priority barrier is accepted and lasts until the field becomes null at its single commit |
| `previewId` | exact 43-character base64url string | Equals the active 256-bit `GlobalConsentPreview.previewId`; an opaque lookup reference that is neither a filesystem path nor any grant of authority |
| `confirmedTools` | exact `[copilot, claude, codex]` | Fixed all-tools consent set; never client-selected |
| `pendingTools` | sorted tool enum[] | Admitted tools owned by one accepted subset scan only after atomic batch acceptance; initial and retry validation/admission are operation-local and unobservable; empty with null `batchStatus` while `disabling` after cancellation begins |
| `batchStatus` | `GlobalBatchStatus \| null` | Non-null from accepted admitted-subset queueing through terminal success/failure; preserves the promoted `scanRequestId` for fresh-snapshot and lost-acceptance-response recovery |
| `retryableTools` | sorted tool enum[] | While `active`, exactly each non-pending unpublished `admitted` control and each `rejected` control whose `retryDisposition` is `same-preview`; it retains the exact pre-operation projection during operation-local retry validation, lexical `new-preview-required` controls are excluded, `unvalidated` exists only in non-serialized operation-local work, and the array is empty while `disabling` |

`GlobalControlView` is derived from the active consent, its `GlobalToolControl` records, the
coordinator, and published Sources. It is returned in every session snapshot
while consent or retained control state is active, including initial all-failed/
`active-no-job` outcomes with zero Global Sources and all-rejected retries that preserve
existing Sources. After a client purge, the SPA fetches a fresh session,
uses `previewId` to require the exact stored preview from the preview route, redisplays all
paths/states/exclusions, and only then offers retry; disable is available immediately.
Published tools are derived from `sources[].tool` and cannot also be retryable. The DTO
contains no admitted root or source content; the separately fetched
frozen preview supplies the exact displayed state for the unchanged enable request.
A failed tool's reason travels on that tool's own control, so a fresh client needs no
ownership map to attach one: the control it is reading is the tool it failed for. A
Diagnostic states what happened while reading something in a Source, and a tool whose root
was never admitted has no Source for one to belong to — which is why this failure is not
one, rather than a Diagnostic with its location left out. The code remains until the owning
control failure is cleared or disable commits removal.
`GlobalBatchStatus` is exactly `{ scanRequestId, tools, phase, failureRef }`. `tools` is the
non-empty fixed-tool-order admitted subset; `phase` is
`waiting \| deriving \| enumerating \| reading \| recognizing \| failed`; and `failureRef`
is null except in `failed`. A deterministic terminal failure uses
`{ kind: 'tool-failures', failedTools }`, where the non-empty fixed-tool-order tools are
exactly those this batch failed; each carries its reason as its own control's `failureCode`,
which this list does not repeat. A thrown/rejected terminal
failure uses `{ kind: 'error', message }`, carrying the failed request's error
message. There is no tool-independent deterministic Global batch failure:
every returned deterministic failure is attributed to at least one exact tool, while
cross-tool assembly/invariant/retention failures throw or reject and are
recorded as the failed request's error. On success, `batchStatus` is removed only in the same commit that
publishes every new Source with the same `Source.scanRequestId`; `active-no-job` creates no
status. Retry acceptance replaces a prior failed status, and disable acceptance clears it
while revoking the batch. Thus every accepted queued/running/terminal batch remains request-
correlated even when delivery of its queued-acceptance response fails.
While the disable barrier is pending or active, the view reports `state: disabling`, both
job/retry arrays are empty, the UI offers no retry, and the enable API rejects retry. The
view becomes null only when the disable commit has removed all controls and consent.
While `state: active` and `globalEnableInProgress` is non-null, the UI offers no enable or
retry and duplicate enable returns the fixed `global-enable-in-progress` conflict; a retry leaves the
pre-operation `retryableTools` projection unchanged until its atomic disposition. While
`state: active` and `pendingTools` is non-empty, `batchStatus` is a non-failed active
phase with the same tool set, and `retryableTools` remains an
informational projection of already rejected/non-pending admitted tools, but the UI does
not offer retry and the enable API returns the fixed `global-enable-in-progress` conflict; disable remains
immediately available. Retry is offered only after `pendingTools` becomes empty and the
matching frozen preview has been retrieved and verified. The invariant forbids every
`unvalidated` control in an active serialized view; every accepted pending control is
already `admitted` and has the same accepted-batch membership as `pendingTools`.

An accepted admitted-subset Global batch unexpected throw/rejection atomically records the
failed request's error message in the failed `batchStatus.failureRef` and leaves every tool
without a per-tool failure for that throw/rejection. A later same-consent retry preserves
the failed status through any pre-acceptance failure, then removes it when deterministic
validation reaches `active-no-job` or replaces it when a replacement batch is accepted. A
terminal failure of that replacement batch records the new failure the same way. Global
disable clears the status and its retained error. Repository operations and rescans of
already published Sources preserve it. Thus every retained Global batch failure remains
attributed to its exact accepted request.

### GlobalEnableOperation

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque string | Unique coordinator command for one initial enable or exact-consent retry |
| `kind` | `initial-enable \| retry` | Closed operation type; neither is a committed generation |
| `commandEpoch` | non-negative integer | Captured from the coordinator when accepted; every asynchronous continuation must still match it |
| `previewId` | opaque string | Must equal the frozen consent preview for the whole operation |
| `previewEpoch` | non-negative safe integer | Captured from the exact preview object at registration and revalidated with object identity after every asynchronous boundary and before terminal commit |
| `tools` | non-empty sorted tool enum[] | Exact fixed three-tool set for initial enable, or complete server-derived `retryableTools` subset for retry; never supplied or narrowed by the client |
| `scanRequestId` | opaque ASCII string or null | Allocated once only when at least one root is admitted and the single subset scan is accepted; shared by that batch and its one committed Global generation |
| `status` | `waiting \| validating \| admitting \| queueing-batch \| draining \| cancelled \| complete` | `draining` begins when disable aborts the operation; no new authority or job may be published afterward |
| `responseDisposition` | `unset \| queued \| active-no-job \| global-disable-pending` | Chosen exactly once at the coordinator linearization point; `queued` describes one atomic admitted-subset job |

Initial enable registers this command and freezes the exact current preview object/epoch
under the same coordinator lock while keeping the provisional consent, three controls,
candidate IDs, and all admission outcomes operation-local and unobservable; it
does not create `globalControl` or mutate `pendingTools` before deterministic validation of
all three entries finishes. While registered, only the authority-free
`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }` coordinator
projection is visible; it disappears when the operation unregisters or atomically creates
`globalControl`, and never exposes partial tool outcomes. Retry registers the command against the existing active consent
and snapshots its controls, failed `batchStatus`, diagnostics, and pending state before any
mutation, then publishes only the authority-free
`globalEnableInProgress { kind: 'retry', operationId, previewId }` projection. Retry
validation/admission is otherwise operation-local and unobservable until a
an atomic batch or active-no-job disposition commits. Root validation/admission
and scan-job creation run only under the coordinator. Before and after every asynchronous
boundary, a continuation must prove the same active `operationId`, `commandEpoch`, exact
preview object/`previewEpoch`, and non-aborted signal plus either the same initial
operation-local provisional state or the
same active retry control. Initial enable and retry register those transitions under the
coordinator lock before changing any session state. Cancellation or disable drains the
operation so late continuations cannot enqueue work or regain authority.
At most one `GlobalEnableOperation` is running or queued. Deterministic lexical outcomes
and readable-directory admission partition the tools into rejected and admitted sets. Any
unexpected throw/rejection unwinds to the session API owner: initial
enable discards all provisional state without activating consent/control, while retry
restores its exact pre-operation snapshot; neither commits a partial admitted subset. After
every owned tool reaches a deterministic validation outcome, the coordinator performs the
general pre-acceptance response transaction under its lock. It first validates the current
operation ID/command epoch/preview object/preview epoch/signal and prepares, without publication, either the initial consent plus
three controls or the retry partition, a candidate batch/`scanRequestId` and
`queued`, or no job/null ID and `active-no-job`. The
coordinator then revalidates the same operation ID/command epoch/preview object/preview epoch/
signal and barrier state under the same lock and only then atomically activates/applies the
controls, clears the prior `failureCode` for each tool admitted into this accepted batch,
promotes and enqueues the one candidate batch, creates its `batchStatus`, and sets
`pendingTools`, or commits active-no-job with null `batchStatus` while retaining/replacing
only rejected-tool failure codes, chooses the disposition,
marks the operation complete, unregisters it, and returns the declared result value for
the devframe channel to serialize. No observer can
see a per-tool Source commit. If the disable barrier has already linearized before that
commit, the prepared state is discarded, the check instead chooses
`global-disable-pending`, and cancellation drains. A drained operation becomes
`cancelled` and is unregistered before barrier cleanup. Thus either the operation wins with a committed queued acceptance, or the barrier
wins with the conflict, never both. Terminal operation history is not retained; the one accepted batch
remains represented by all of its admitted tools in `pendingTools` and by its exact
`batchStatus.scanRequestId` until it finishes. A failed status remains with empty
`pendingTools` until retry acceptance or disable.
Delivery after the commit never reserializes the envelope. A zero-byte/partial write, socket
close, or write rejection preserves the accepted controls/job/disposition and records no
failure or stale overlay; only later failure of the job
itself can record the accepted job's error under its promoted non-null request ID.

### GlobalDisableOperation

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque ASCII string | One accepted priority barrier; joined requests share it and its terminal result |
| `commandEpoch` | non-negative safe integer | Incremented and captured at barrier acceptance; every continuation and final commit must match it |
| `commitKind` | `cleanup-only \| remove-active-state` | Chosen at first acceptance and retained unchanged by every retry; only the second has public Global consent/control/Source state to remove |
| `baseGenerations` | `{ repository: GenerationNumber, global: GenerationNumber \| null }` | Exact per-sequence committed generations at acceptance; the barrier commits no generation in either sequence — `remove-active-state` discards the whole Global sequence and `cleanup-only` changes no committed state |
| `status` | `draining \| committing \| failed \| complete` | `failed` retains revoked authority and retryable cleanup state; it is not rolled back to active |
| `frozenPreview` | internal exact preview reference | Retains the pre-barrier preview through `failed`; preview capture/replacement remains fenced until terminal success |

A no-op disable with no active/queued Global authority and no retained disable failure uses
the ordinary single-stage response gate and mutates nothing. Otherwise request validation
and barrier registration linearize under the coordinator lock. On first acceptance,
`remove-active-state` is chosen exactly when public Global consent/control/Source state
exists; `cleanup-only` is chosen only when cancelling an operation-local initial enable that
has never published Global consent/control/Source state. A retry of a retained failure
inherits the failed operation's exact `commitKind`, `baseGenerations`, removal intent, and
`frozenPreview`; the replacement operation resumes the same cleanup rather than
reinitializing it, and never recomputes `commitKind` from the already
partially cleaned public projection. Thus a failed `remove-active-state` operation remains
`remove-active-state` until its terminal success removes the public Global graph.
Acceptance atomically
increments the epoch, registers this operation, irreversibly revokes affected publication
authority, changes an existing `globalControl` to `disabling`, empties `pendingTools`, clears
`batchStatus`, increments `globalContentEpoch`, activates the public Global-content access
fence, and aborts the active/queued `GlobalEnableOperation` and Global scans. An
operation-local initial enable has no control snapshot to expose, but the same internal
barrier still revokes and drains it. This acceptance phase deliberately precedes the
terminal success commit and is the only two-stage exception in the model. A second disable
while the operation is `draining` or `committing` joins the same completion; disconnecting a
joined transport never cancels the barrier.

`globalDisableInProgress` mirrors only this operation's ID/status from acceptance through
terminal failure and is removed only on terminal success; it exposes neither cleanup detail
nor authority. `globalEnableInProgress` disappears as soon as its initial-enable or retry
operation is cancelled/unregistered by the barrier.

From acceptance through `failed`, `committing`, or retry drain, the barrier remains the
highest-priority Global fence. Every Global enable/rescan request returns
the fixed `global-disable-pending` conflict, no queued Global command may dequeue, and preview retrieval
returns `frozenPreview` without capture/replacement—even when `globalControl` is null because
only an operation-local initial enable existed. It is also a generation fence: no new
Repository rescan is admitted, no generation-mutating command may dequeue, and no scan may
commit while the barrier is non-complete. A new Repository rescan returns
the fixed `global-disable-pending` conflict. Any Repository command already running at acceptance is
revoked before commit and held for exactly one requeue after terminal disable success, not
released by a failed attempt. Consequently `baseGenerations` cannot change across a failed
disable and its retries; a base mismatch is an internal invariant failure, never a rebase or
overwrite rule.

The same fence rejects every full session/inventory/generation/Source/file/detail/
Diagnostic/relationship/comparison data request and selects only
`GlobalFenceRecoverySnapshot`. It does not depend on drain, close, or terminal commit succeeding.
Disable retry inherits the already incremented `globalContentEpoch` and must not make the
retained graph readable again. No Repository or Global inspection data is public until
terminal success or process restart.

The barrier waits for enable to reach `cancelled`, performs the final queued-Global-work
cancellation sweep, waits for the affected in-flight work to settle while discarding its
late results, and prepares the zero-I/O discard of the Global sequence. A drained enable continuation
can never enqueue a job or mutate a control. This ordering prevents validation that
finishes after acceptance from adding authority after the sweep. If the barrier wins
before enable's atomic disposition, that enable returns the fixed `global-disable-pending` conflict;
if enable chose queued acceptance first, the barrier cancels/removes its accepted batch normally.
Expected cancellation creates no Diagnostic or retained error.

After cleanup, while holding the coordinator lock, disable prepares the exact final public
state without removing public controls or Sources. Neither commit kind
prepares a new generation: `remove-active-state` prepares the discard of the entire Global
sequence while the Repository sequence, its generation, and its files stay untouched by
disable; `cleanup-only` changes no committed state at all. It then
revalidates operation ID, epoch, barrier state, and
`baseGenerations`. Only then does one atomic terminal commit remove the frozen preview and all
remaining operation-local state and clear the retained failed request's error. For
`remove-active-state` that same commit discards the committed Global generation and removes
all Global Sources/controls/consent and their stale failures/diagnostics/batch errors; for
`cleanup-only` it performs no public graph transition. It then marks the
operation complete and returns the final result for the devframe channel to serialize. A later re-enable creates a fresh Global
sequence starting at generation 1; the incremented `globalContentEpoch` distinguishes the
eras. Delivery failure after that commit never rolls back or creates another error.

Any unexpected throw/rejection after barrier acceptance—including drain or
final assembly—propagates to the triggering session API boundary and is
reported ordinarily as that failed request's error. The operation becomes `failed` and
atomically retains that error message for join/retry display; because the retained error
lives on the failed operation itself, it exists even when only an operation-local initial
enable existed and `globalControl` is null. `globalControl` remains `disabling` when it exists, publication
authority stays revoked, the prior committed generations remain current, and no success body/removal
commit is published. A later Global-disable request starts/resumes idempotent cleanup and replaces the
failed operation; another terminal failure replaces the retained error, while terminal
success alone clears it. Because the trigger is a session API request, this failure does not terminate the
process. Coordinator queueing uses no product-defined numeric capacity.

### EvidenceCitation

Every maintained behavior, rule, and strategy cites the reviewed official sections it was
checked against inside the record itself. Keeping the citation beside the claim avoids a
separate subject-keyed citation layer and makes the basis of each record directly
inspectable.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | closed source-ID union | The official-sources contract row this citation is of; the page's stable identity, unchanged when a vendor moves the page (QR-005) |
| `url` | absolute HTTPS URL | Exact authored URL on `officialHost`; no credentials, query, or fragment |
| `officialHost` | lowercase DNS hostname | Exact host allowlist for this citation; no implied subdomain or sibling host |
| `sections` | non-empty exact heading-text strings | Exact rendered heading text only; no heading ID, URL fragment, CSS/XPath, or other executable selector |
| `reviewedOn` | ISO date | Updated only after those sections are read and compared against the claim the citing record makes; confirming a heading still exists does not advance it, and the comparison's performer is not restricted |
| `establishes` | paraphrased assertion | What the reviewed sections establish for the citing record; never copied page text |

The single normative row per reviewed page remains
[Official Sources](contracts/official-sources.md); these citations are its implementation
counterpart, not a second registry. One page cited by several records therefore repeats its
URL and review date, which is accepted deliberately in exchange for stating the basis beside
the claim.

Citations are compiled out of the packaged CLI, together with the vendor locators that share
their build flag. Nothing in the product reads either — a citation records where a claim
was established, and no DTO field carries a locator or a citation — so the
build replaces `__ACI_SHIP_MAINTENANCE_DATA__` with `false`, every citation array folds to
empty, and every `locator` folds to null. The substitution fails
silently if it is ever misspelled or dropped, so the package suite asserts the built artifact
carries no URL, host, review date, paraphrase, or locator value.

The explicit maintainer drift command sends no credentials, cookies, repository data, or
other local state. Per cited page it accepts UTF-8 HTML/Markdown and follows only HTTPS
redirects whose every hop remains on that citation's allowlisted host; redirect loops fail
closed. A redirect to a different final URL is reported for review rather than silently
changing `url`; downgrade, cross-host redirect, wrong content type, missing/duplicate
heading, decode failure, or a recoverable network/runtime failure is a hard drift-check
failure.

Normalization selects each cited heading through the next heading of equal or higher level,
removes document chrome plus script/style nodes, preserves prose and code text, decodes
entities, applies Unicode NFC and LF endings, trims line edges, collapses horizontal
whitespace, and joins sections in listed order before SHA-256. A drift result never changes a
behavior, rule, or strategy automatically. A maintainer reviews every citing record and both
language contracts/research, then explicitly updates headings, paraphrases, and `reviewedOn`;
no remote page text or response body is checked in.

### DocumentationStatus and LifecycleQualifier

`DocumentationStatus` is the closed completeness/consistency enum `documented |
partially-documented | unknown | conflict`. `LifecycleQualifier` is the separate closed enum
`preview | experimental | deprecated`. A `LifecycleQualifier[]` is unique and ordered
exactly `preview`, `experimental`, `deprecated`; an empty array means only that no lifecycle
claim is maintained and must never be displayed or inferred as `stable`.

Both are maintenance records on the behavior, rule, and strategy records themselves. No
response and no surface carries either (QR-005): the product reports the customization
files it found rather than how completely a vendor documents the rule that admitted one.

### VendorBehaviorStatement

`VendorBehaviorStatement` records one atomic, surface-specific interpretation of upstream
documentation. It explains where the product looks; it is not a filesystem matcher and
can never authorize a read.

The four locator parts are one field because they are one description of the vendor's own
locator, and because a packaged CLI drops them together: no DTO field carries any of them.
Modelling them as four independently nullable fields would permit a
half-described record that no build produces. A statement records no condition-key list: no
surface projects one, and a field no consumer reads is a field that drifts (FR-009).

An upward traversal descriptor names its stop condition, because that is what decides
which directories the walk reaches: `ancestor-chain-to-repository-root` ends at the
repository root, while `ancestor-chain-to-filesystem-root` keeps going past it. How a
vendor recognizes a repository root belongs in the record — Codex takes the nearest
ancestor holding a `project_root_markers` entry, default `.git` and user-overridable.

| Field | Type | Rules |
|---|---|---|
| `behaviorId` | stable dotted string | Unique and defined in exactly one bilingual vendor contract |
| `tool` | tool enum | Owning product |
| `surfaces` | non-empty surface enum[] | For example VS Code, CLI, cloud, or shared local Codex clients; no implicit “all” |
| `locator` | `VendorLocator` or null | Where the vendor looks and how it walks, as one field: `vendorScope` (repository/workspace, User, hosted/managed, plugin, or runtime-only), `lookupBase` (workspace root, Git/repository root, runtime `cwd`, target-path chain, tool home, profile data, active config layer, registered catalog, hosted state, or undocumented — for a documented relative location whose base the source never anchors, so that a specific member would record a guess), `relativeSelector` (path text only; no Inspector glob semantics and no authority), and `traversal` (exact, ancestor-chain-to-repository-root, ancestor-chain-to-filesystem-root, standard-location chain, recursive-under-base, lazy descendant, explicit registration, or none). Null in a packaged CLI |
| `documentationStatus` | `DocumentationStatus` | `conflict` retains all conflicting source assertions |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order; empty makes no stability claim |
| `evidence` | non-empty `EvidenceCitation[]` | The reviewed documentation establishing this record (§ EvidenceCitation); empty in a packaged CLI |

The registry never encodes an ancestor walk as `**/`. Lookup base, relative selector, and
traversal are separate closed fields. Two surfaces with different bases or traversal have
different behavior IDs even when the relative filename is identical.

A behavior statement carries no cross-registry reference of its own; see
§ RegistryRelations.

### RuntimeCompositionStrategy

`RuntimeCompositionStrategy` records documented layering, selection, fallback,
deduplication, or precedence without turning it into read authority.

| Field | Type | Rules |
|---|---|---|
| `strategyId` | stable dotted string | Unique and defined in the bilingual runtime-composition contract |
| `tool` / `surfaces` | tool enum / non-empty surface enum[] | Exact product and surface boundary |
| `operations` | non-empty ordered closed enum[] | Each entry is `append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| retain-all \| unknown-order`; array order is the documented pipeline order. `retain-all` states that every documented input remains available and none is merged away — the absence of a collapsing entry does not state it, because the array records the steps a source documents rather than the steps it rules out |
| `documentationStatus` | `DocumentationStatus` | Partial/unknown/conflicting order never becomes a fabricated winner |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order; independent of documentation completeness |
| `evidence` | non-empty `EvidenceCitation[]` | The reviewed documentation establishing this record (§ EvidenceCitation); empty in a packaged CLI |

Strategies are immutable contract data. They explain documented composition and the
same-name outcomes derived from it, and cannot enumerate a directory, open a relationship
target, or merge the Inspector's Repository and Global sources.

### StructuredInspectorMatcher

| Field | Type | Rules |
|---|---|---|
| `base` | one exact Source-boundary descriptor | Repository or the named consented tool-specific Global boundary; never inferred from a selector |
| `selectors` | non-empty ordered unique selector programs (`MatcherSegment[][]`) | Alternatives owned by one static rule, each a closed ordered program relative to the Source root; the final token denotes a regular file |
| `MatcherSegment` | exact discriminated union | `{ kind: 'literal', value: NonEmptyMatcherLiteralSegment }`, `{ kind: 'regex', pattern: RegExp }`, or `{ kind: 'recursive-directories' }`; no executable glob, implicit discriminator, or extra field |

`StructuredInspectorMatcher` is authored registry data, so its literals are constrained
before anything runs. A plan a vendor's reader builds per scan attempt is not: its segments
are entry names a repository's own configuration declared, kept exactly as authored, in
whatever Unicode a filesystem can hold. The walk compares them to the names it enumerated
and opens the entry, so a name no entry bears matches nothing (spec.md FR-007;
contracts/inspection-path-allowlist.md § "Read authority"), and the grammar below governs
the shipped matchers alone.

A `NonEmptyMatcherLiteralSegment` is a non-empty printable ASCII string whose code units are
U+0021–U+007E except `/`, `\\`, `:`, `*`, `?`, `\"`, `<`, `>`, and `|`; `.` and `..` are
also forbidden. This same closed type is used by static fixed prefixes, exact targets, and
fixed derived suffixes. The compiler rejects any non-ASCII registry path literal, so exact raw
byte/code-unit comparison is the whole relevance test for fixed prefixes and exact
targets. A `literal` matches one case-sensitive exact ASCII segment.
`regex` carries one JavaScript regular expression and matches one entry name exactly
when `pattern.test` matches the raw entry name — standard `RegExp` semantics, so anchoring
and escaping are the pattern author's explicit spelling and the shipped rule fixtures own
their correctness; a pattern tests the raw entry name, which may be an NFD spelling on
disk. It is a directory step when non-terminal and a file step when terminal, and is
written as its regex literal (for example `/\.md$/u`). `recursive-directories` — the `**`
step — matches zero or more directories, is non-terminal, and cannot
be adjacent to another recursive token.

`recursive-directories` is the one downward axis, and there is deliberately no upward one.
A vendor lookup that walks from a runtime working directory up to the repository root
terminates at the selected root, because the selected root *is* that repository root
(FR-001); the chain therefore has exactly one in-scope layer and needs no notation. The
Inspector never reads above a Source root: such a path has no `SourceRelativePath` and lies
outside the boundary entirely. The registry is authored directly in the typed
segment form, which is also what the contract tables show. Grammar, literal-alphabet,
uniqueness, and selection-policy obligations are enforced by the build/contract validator
(the registry contract gate), not re-checked by runtime logic. Runtime loads
only this immutable typed form.
This permits composites such as descendant context plus a direct child, or
descendant context plus a recursive fixed subtree, without inventing a single ambiguous
expansion enum.

### TraversalPlan

`TraversalPlan` is immutable, compiled from `StructuredInspectorMatcher`; it owns the
fixed per-tool inspection-path allowlist that the inspection module traverses (FR-003,
FR-015 through FR-017). A plan compiled from a shipped matcher is shipped data and exists
for the process's lifetime; a plan a vendor's reader builds from configuration exists for
the one scan attempt that read it, carries that attempt's declared entry names, and is
executed by the same walk under the derived rule's identity.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versions fail registry loading |
| `boundary` | exact Source-boundary descriptor | Copied from the matcher and never inferred from request/display text |
| `selectors` | non-empty ordered `TraversalSelectorPlan[]` | Deterministic one-to-one compilation of the authored typed selector programs |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy; the second value is valid only for `codex.global.instructions` with the exact ordered selectors `AGENTS.override.md`, `AGENTS.md` |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class; no generic ambient-root walker |
| `TraversalSelectorPlan.fixedPrefix` | ASCII literal segment array | Empty for Repository; for Global it includes the complete path through the exact target or fixed-subtree root, including that terminal target/subtree segment |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Repository's complete selector program, empty for a Global exact target, or the complete dynamic program strictly below a Global fixed-subtree root |

Compilation is a closed mapping: `repository-program` has an empty `fixedPrefix` and a
`remainder` equal to the complete selector program; `global-exact` compiles
an all-literal selector into a non-empty `fixedPrefix` ending at the target file with an
empty `remainder`; `global-fixed-subtree` compiles the maximal leading literal directory
chain into `fixedPrefix` and keeps the non-empty dynamic program below it as `remainder`.

Traversal itself is an ordinary recursive walk with `node:fs/promises`: the inspection
module enumerates only the directories reachable through a selector program, matches
entries against the compiled segments, and reads matching files. Symbolic links are
followed transparently, because agents resolve them when loading customization files; a
link whose target is missing or unreadable yields the ordinary `file-unreadable`
diagnostic, and the walk tracks visited directories by real path so a link cycle cannot
prevent a scan from terminating (FR-024). A file that
cannot be read yields its `file-unreadable` diagnostic without affecting other files
(FR-028). Unrepresented neighboring paths receive no read. A Global plan reads only its
exact targets and fixed subtrees below the admitted tool home; no missing target causes
sibling discovery (FR-018).

`codex-global-first-non-empty` is a project-owned closed scheduler branch, not authored
logic. It reads `AGENTS.override.md` first. A readable non-empty override is the single
published file and short-circuits without any operation on `AGENTS.md`. An absent or
readable empty override advances to the exact `AGENTS.md` target; a readable non-empty
regular file there is published, otherwise no Codex instruction file is published. Empty
means that, after removal of one optional leading UTF-8 BOM, the decoded string has
`String.prototype.trim().length === 0`; a whitespace-only file is empty, while a retained
`U+FFFD` is non-whitespace, so `utf-8-replaced` text is non-empty (FR-035). A binary or
unreadable override ends the branch with its diagnostic and no fallback.

### RegistryRelations

Cross-registry references are separate immutable release data, not fields of the records
they connect. A record states what one thing is; a relation states how
it depends on another registry, and separating them keeps each vendor catalog readable as a
description of that product while making the whole reference graph reviewable in one place.

| Subject | Field | Type | Rules |
|---|---|---|---|
| strategy | `consumesBehaviors` | non-empty ordered behavior record[] | Every documented input the strategy composes, User and hosted scopes included — a behavior grants no read authority, so naming one states what the vendor documents rather than what the Inspector may open, and a hosted input is consumed exactly like a located scope once a maintained behavior statement records it (Copilot's remote-skill relay in its Cloud selection); what stays out is what the strategy does not compose at all — an excluded surface, or a hosted input no behavior statement records — which remain explicit conditions |
| rule | `basedOnBehaviors` | ordered behavior record[] | Documented vendor behavior the policy is based on; never a restatement of it |
| rule | `explainedByStrategies` | ordered strategy record[] | Composition facts used for order/applicability, never for path admission |

Each edge holds the referenced record itself rather than its identifier, which the acyclic
graph makes possible: `const` references across a cycle would fail at module evaluation.
Arrays are ordered by the referenced identifier so a materialization is byte-stable, and
identity — an edge holds the record the registry publishes, not an equal-looking copy — is
a contract-gate obligation, because the type alone cannot distinguish them.

Every edge runs one way, so the graph is acyclic: behavior ← strategy ← rule. A behavior
has no relation at all. No relation grants read authority; only an `InspectionRule`
discovery class does.

Which reviewed documentation establishes a record is not a relation: every behavior, rule,
and strategy states its own citations in a non-empty ordered `evidence` array on the record
itself (§ EvidenceCitation), so the basis sits beside the claim it supports. Citations are
maintenance evidence that nothing in the product reads — so `tsdown.config.ts` compiles them out of
the packaged CLI through the `__ACI_SHIP_MAINTENANCE_DATA__` define. Without that exclusion
every reviewed URL, review date, and paraphrased assertion would ship in the CLI.

One reference kind deliberately stays on its record for a different reason:
`InspectionRule.policyRefs` names FR/QR clauses owned by the specification rather than
another registry. Each relation map is keyed by its closed identifier catalog and complete
over it, so a record without declared references fails the build. The
conformance fixture materializes every reference as an identifier: JSON has no references,
and inlining a record would restate a definition one contract alone owns.

### InspectionRule

`InspectionRule` is immutable release data maintained as the implementation counterpart of
the bilingual inspection-rule contract. It is not read from the inspected repository.

| Field | Type | Rules |
|---|---|---|
| `ruleId` | stable dotted string | Unique within a registry; retained across versions only while semantics stay compatible |
| `tool` | tool enum or `shared` | `shared` is limited to cross-vendor safety/derivation rules |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate \| relationship-only \| excluded` | Only the first two may authorize a read |
| `kind` | customization-kind enum or null | Null for a cross-kind relationship/exclusion |
| `sourceKinds` | source-kind enum[] | Repository, Global, or both as explicitly contracted |
| `matcher` | `StructuredInspectorMatcher` or null | Static rules only, and null for a `bounded-derived-candidate`, whose targets come from its vendor's configuration-read stage under the bound the [inspection-path-allowlist contract](contracts/inspection-path-allowlist.md) states; never a vendor locator, ambient path, executable glob, or untyped selector string |
| `policyRefs` | sorted specification ID[] | FR/QR clauses that authorize or intentionally exclude the surface; non-empty in a maintained build and empty in a packaged CLI, because they are reviewer traceability that no DTO carries |
| `precedenceGroup` | stable string or null | Links only rules with documented selection/order semantics |
| `documentationStatus` | `DocumentationStatus` | Describes upstream documentation completeness/consistency, not runtime state |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Separate upstream lifecycle claims in unique fixed order |
| `evidence` | non-empty `EvidenceCitation[]` | The reviewed documentation establishing this record (§ EvidenceCitation); empty in a packaged CLI |

The build/contract validator checks uniqueness, legal field combinations, selector-program
token/position rules, exact traversal compilation, referenced
rule IDs, the identity-only shape of every `bounded-derived-candidate` record, and exact fixture agreement before packaging. The runtime
loader checks the embedded registry schema, integrity, and contract version before
scanning. There is no repository-provided plugin for adding rules.

### RepositoryScanGeneration and GlobalScanGeneration

Repository and Global inspection have independent lifecycles, so each keeps its own atomic
generation sequence (spec Clarifications § Session 2026-07-22; FR-030): the Repository
sequence exists from bootstrap generation 0, while a Global sequence exists only from the
enable commit that creates it until disable discards it. A commit invalidates
only its own sequence's views and never modifies the other sequence's state.
Cross-source comparison is unaffected: it always compares each source's last committed
state. Both generation entities share these fields:

| Field | Type | Rules |
|---|---|---|
| `generation` | `GenerationNumber` | Unique and monotonic within its own sequence; `0` exists only in the Repository sequence and is reserved for bootstrap, and the commit that creates a Global sequence is exactly `1` — a Global sequence has no generation 0 |
| `baseGeneration` | `GenerationNumber` | The same sequence's last committed generation from which the serialized transaction started; `0` for bootstrap and for the sequence-creating Global enable commit |
| `scannedSourceIds` | sorted opaque source ID[] | One for a Repository/per-Source Global rescan, one to three for an initial/retry Global batch, and empty for bootstrap |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Both present on every committed generation; in-flight timing belongs to `ScanAttempt`/`ScanProgress` |
| `outcome` | `complete \| partial` | `partial` means only the file-confined outcome of the Closed Scan Publication Outcomes table: traversal completed and one or more files have only file-confined outcomes (unreadable, an admitted candidate's binary content, parse failure — a census-listed companion's binary bytes are its ordinary fact and confine nothing, FR-025) while every unaffected file is complete; `utf-8-replaced` is complete, and a thrown/rejected attempt is never a generation |
| `files` | `CustomizationFile[]` | All enabled Sources of the owning sequence; the published snapshot projection establishes the deterministic source, Source-relative Path, then ID order in the one place a reader receives the list, so the retained assembly order carries no contract of its own |
| `diagnostics` | `Diagnostic[]` | Never duplicate customization source or declared-metadata values |

`RepositoryScanGeneration` adds `transactionKind: bootstrap | repository-scan` and a
`scanRequestId` that is null exactly for bootstrap generation 0 and required for every
`repository-scan` commit (FR-030 request correlation). `GlobalScanGeneration` adds
`transactionKind: global-enable | global-scan` and an always-required non-null
`scanRequestId` — one ID shared by a Global batch and every Source it commits.
`global-enable` is the one-transaction consent commit that publishes every admitted tool
Source atomically (FR-014), including an active-consent retry batch; `global-scan` is an
explicit rescan of the enabled Global sources. Global disable is deliberately not a
transaction kind: it discards the entire Global sequence and commits nothing, and a later
re-enable starts a fresh sequence at generation 1 under the incremented
`globalContentEpoch`.

Repository generation 0 is created synchronously at process start with `baseGeneration: 0`,
`transactionKind: bootstrap`, empty `scannedSourceIds`, null `scanRequestId`, equal
`startedAt`/`finishedAt`/session `createdAt`, `outcome: complete`, and empty files and
diagnostics. The session initially has no `StaleSourceFailure`, so its derived
`snapshotState` is `current`. Generation 0 is a legal readable base, not evidence that a
Repository admission or scanning succeeded. It coexists with exactly one non-authorizing,
idle Repository Source in the session.
The automatic first Repository scan starts from 0. A returned failure—including a
Repository root that does not exist or cannot be read as a directory—leaves generation 0
current with its actionable failure diagnostic while the session stays usable (FR-002); an
unexpected thrown/rejected startup operation has no request owner, publishes no application
failure representation, and reaches the process top level. Only a later user-requested
rescan failure can mark a retained snapshot stale.

### StaleSourceFailure

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | Identifies one still-published Source whose latest explicit rescan failed fatally |
| `failureRef` | `{ kind: diagnostic, diagnosticId } \| { kind: error, message }` | DTO | Exactly one reference: deterministic returned fatal outcomes use a lifecycle Diagnostic; a thrown/rejected accepted session API job carries the failed request's error message |
| `failedAt` | `UtcTimestamp` | DTO | Time the fatal explicit attempt ended |
| `baseGeneration` | `GenerationNumber` | DTO | The owning sequence's last committed generation the failed attempt tried to replace |

`StaleSourceFailure` is a session-owned lifecycle overlay, not a field of either committed
generation entity.
An explicit fatal rescan creates or replaces only the entry for its Source, so failures for
different Sources coexist. A complete or partial scan commit clears the entry
and any referenced lifecycle Diagnostic only for the Source it successfully refreshed;
a commit for another Source carries all unrelated entries and failure records forward.
Global disable clears entries and referenced records for the Global Sources it removes,
while a remaining Repository entry keeps the
session stale. `snapshotState` is `stale-after-fatal-rescan` exactly while this array is
non-empty. Automatic first Repository failure and initial Global enable failure create no
`StaleSourceFailure` entry because neither failed to refresh an already committed Source graph.
A deterministic returned failure may create its closed lifecycle Diagnostic; an unexpected
startup throw/rejection creates no product failure record, while a thrown/rejected accepted
Global batch records only the failed request's error in its failed `batchStatus`. Initial
Global enable preserves every pre-existing entry and
derived snapshot state.
Queuing a retry changes that Source's operational status to `scanning` but does not clear
its entry or referenced failure. An unrelated commit carries both the entry and reference plus the Source's failed/scanning
lifecycle overlay; only the affected Source's successful commit moves it to
`ready`/`partial` and resolves the entry.

### ScanAttempt

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `attemptId` | opaque string | internal | Identifies one serialized, uncommitted transaction |
| `scanRequestId` | opaque ASCII string | internal | Required for every attempt: generated at admission for automatic and explicit commands and copied to Source/progress/generation; the Global disable barrier is not an attempt and allocates none |
| `triggerOwner` | `{ kind: 'startup', operationId: null } \| { kind: 'request', operationId: opaque ASCII string }` | internal | Automatic first Repository work uses `startup`; explicit rescan copies its accepted session API operation ID; a Global batch copies its `GlobalEnableOperation.operationId`; requeue preserves the exact value |
| `baseGeneration` | `GenerationNumber` | internal | Must equal the owning sequence's last committed generation when the attempt starts; `0` when the attempt creates the Global sequence |
| `transactionKind` / `scannedSourceIds` | `repository-scan \| global-enable \| global-scan` with the owning generation entity's `scannedSourceIds` rules | internal | Identifies one requested Source scan or atomic Global subset operation without changing committed state; bootstrap is synchronous session state and Global disable is a barrier, so neither is an attempt |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| cleanup-only \| fatal \| cancelled` | internal | Only the two committable outcomes may create the next generation; `cleanup-only` follows disable or shutdown revocation and cannot mutate public state |
| `publicationAuthority` | `active \| revoked` | internal | Disable/shutdown changes this irreversibly to revoked before any later continuation can publish |
| `workingSet` | provisional source graph, files, metadata, relationships, and diagnostics, or null | internal | Null while queued; once running, isolated from every public DTO until one atomic commit and destroyed on fatal failure or cancellation |

No field from an in-flight attempt is merged into or exposed through the committed
snapshot. A partial result is public only after complete traversal, an FR-028-eligible
file-confined outcome, successful
assembly/serialization, transition to `committable-partial`, and atomic commit of the whole
generation. An unexpected throw or rejection is not caught by the scan domain and therefore creates no
domain transition or result. The trigger-owning outer boundary revokes publication authority,
destroys the abandoned working set when cleanup can run, preserves the prior snapshot, and
reports the failure ordinarily as the failed request's error when that boundary owns an
accepted session API job. That failure stays correlated with the job's `triggerOwner` and
`scanRequestId`; startup-owned propagation has no request owner and records no failure.
Unregistering a
`GlobalEnableOperation` after batch acceptance does not erase the copied owner, and a
disable-interrupted Repository requeue preserves it.

A single `ScanCoordinator` serializes `GlobalEnableOperation`, Repository scan, and Global
scan transactions plus the Global-disable barrier. Source scans never execute concurrently.
Ordinary source commands are FIFO. Global disable is a priority barrier: acceptance changes
`globalControl.state` to `disabling` and empties pending/retry arrays only when an active
consent/control snapshot exists. With only an operation-local initial enable,
`globalControl` remains null while the internal barrier drains it. In either case acceptance
rejects new Global-enable/Global-rescan commands. It aborts and discards the active uncommitted
transaction, aborts and drains an active/queued Global enable operation, performs a final
queued-Global-command cancellation sweep, and performs its own zero-I/O terminal cleanup
next in the queue.
An interrupted Repository command is retained for exactly one requeue only after terminal
disable success; it preserves the same `operationId`, `scanRequestId`, trigger owner, requested
Source, and queue order, returns the existing command to `waiting`, creates no new
admission or interim success status, and remains held while disable is failed. An interrupted Global
command is not requeued. A second disable while that barrier is draining/committing joins the same completion and creates no
additional transaction. If there is no tool-specific Global Source or graph, active consent
record, running/queued Global scan/enable command, or
retained disable failure, disable is an immediate no-op
regardless of unrelated Repository work. A scan transaction
starts from its own sequence's then-current generation N — or creates the Global sequence
when none exists — and builds its replacement snapshot off to the side: one scanned Source
for a Repository or per-Source Global rescan, or the entire Global admitted subset for an
enable/retry batch. A complete or partial result commits exactly N+1 atomically in the
owning sequence (the sequence-creating Global commit is exactly 1). Every Source of that
sequence then reports the new generation — file identities are Source-relative Paths and
stay stable across it, while per-attempt record identities (recognition and diagnostic
IDs) are the new attempt's own — the new
snapshot clears the `StaleSourceFailure` and referenced failure only for each successfully
scanned Source, carries every unrelated Source's entry and failure forward, and clears that
sequence's generation-scoped comparison/editor state. A commit never modifies or
invalidates the other sequence's generation or client state. A `remove-active-state`
Global disable is not a scan transaction: its terminal commit discards the entire Global
sequence — its committed generation, every tool-specific Global graph, and each
stale-failure entry/diagnostic pair — without filesystem I/O and commits no generation in
either sequence; an unrelated Repository pair remains. A `cleanup-only` disable removes only
operation-local/frozen control state, changes no committed state, and
then releases the held Repository command.

A deterministic fatal attempt never creates or partially merges a generation. Its entire
`workingSet`, including any provisional partial result, is destroyed. The owning sequence's
N, every prior ID, and all committed content remain visible. If and only if the attempt was an
explicit rescan, the session overlay creates or replaces that Source's
`StaleSourceFailure` and actionable lifecycle Diagnostic; failures for other
Sources remain. If this is the first explicit Repository rescan after an automatic failure,
the terminal transition also removes `repositoryFailureDiagnosticId` and its old
`repository`-owned Diagnostic, then creates the deterministic
`published-source:<sourceId>` Diagnostic, or records the failed request's error message,
referenced by the
new stale entry in the same atomic overlay update. A fatal automatic first Repository scan leaves bootstrap generation 0 current.
A fatal initial Global enable adds no `StaleSourceFailure` entry for the missing tool,
sets or replaces that tool's control `failureCode`, and preserves all pre-existing
entries and the derived snapshot state. Automatic first Repository failure likewise uses the
Repository failure record. Both report that no new inventory was committed. Expected cancellation by a
Global-disable barrier emits no failure diagnostic;
a different deterministic returned safe failure is an out-of-generation session-lifecycle Diagnostic.
Its attachment scope follows the `Diagnostic` rules below: a file-scoped record carries
`sourceId` and Source-relative Path together; a source-scoped record carries the
`sourceId` alone and never fabricates a path. It never carries customization source values and never
enters `Source.diagnosticIds`. The
coordinator then starts the next queued transaction from the still-current N. A later
successful complete or partial scan of the affected Source replaces N with N+1
and clears only its entry and failure reference; a different Source's commit leaves both unresolved. An unexpected throw/rejection bypasses this domain classification and is reported ordinarily by the request-owning boundary; an accepted explicit rescan MUST create the same stale overlay carrying the failed request's error message instead of a Diagnostic reference, while a pre-acceptance failure creates no overlay. At
most one scan command per source is running or queued; duplicate scan commands
return the documented conflict. Disable uses the join/no-op rules above and is not a
duplicate scan command.

Disable or process shutdown stops new scheduling and revokes `publicationAuthority`. A
still-pending Node.js filesystem promise moves the attempt to `cleanup-only`; every late
byte, graph/Diagnostic/DTO/log result is discarded and opened handles are closed during
cleanup. API processing continues. A disable barrier can revoke Global
authority immediately but cannot claim physical drain before an uncancellable kernel
operation settles.

### ScanProgress

| Field | Type | Rules |
|---|---|---|
| `scanRequestId` | opaque ASCII string or null | Non-null for waiting/active/final source-scan progress and equals `Source.scanRequestId`; null for barrier-owned disable progress |
| `phase` | `waiting \| cancelling \| deriving \| enumerating \| reading \| recognizing \| complete` | In pipeline order: `waiting` means queued; `deriving` is a vendor's reader expanding what a seed declares — the configuration read that precedes the walk, which is where an admitted attempt starts, and again after the walk for a reader seeded by a file that walk admitted (tasks.md T761); `cancelling` means a disable/shutdown abort is draining; none contains a path or source content |
| `queuedAt` | `UtcTimestamp` or null | Set when an accepted command waits behind another transaction; cleared when work begins |
| `startedAt` | `UtcTimestamp` or null | Source-scan start, or disable acceptance for barrier-owned progress; null while idle or waiting |
| `visitedEntries` | non-negative safe integer | Number of directory entries whose names have been observed by the bound traversal plan |
| `candidateFiles` | non-negative safe integer | Number of allowlisted candidate files discovered by traversal so far |
| `readBytes` | non-negative safe integer | Bytes returned by completed reads so far, including bytes later classified binary |
| `diagnosticCount` | non-negative safe integer | Attempt-local deterministic diagnostics accumulated so far |

`Source.progress` is null in `idle` and `failed`. For `scanning`, `waiting`
requires non-null `queuedAt` and null `startedAt`; an active phase requires null `queuedAt`
and non-null `startedAt`; `Source.scanRequestId` and `progress.scanRequestId` are the same
non-null value. `failed` retains the failed request ID even though progress is null. A
committed `ready`/`partial` Source, its final progress, and its source-scan generation carry
one matching request ID. `disabling` exposes the relevant `cancelling` progress while a
barrier drains. A committed `ready`/`partial` source retains its final `complete` progress
with null `queuedAt` and non-null `startedAt`. Bootstrap has no source progress.

On disable acceptance, every internally retained Global Source immediately becomes `disabling` and
its progress has null `queuedAt`. If the drained job is a Global scan, that scanned Source
preserves its original scan `startedAt` while only `phase` changes to `cancelling`; each
other present Global Source exposes barrier-owned `cancelling` progress with the disable-acceptance time in
`startedAt`. If no Global scan is being drained, every present Global Source exposes that
barrier-owned progress. A concurrently drained
Repository scan preserves its own `startedAt`, clears `queuedAt`, and changes only
its phase to `cancelling`. After the single disable terminal commit, the entire Global
sequence and all Global Sources are removed;
an interrupted Repository command reappears with `phase: waiting`, non-null
`queuedAt` at requeue, null `startedAt`, and its original `scanRequestId`. Joined disable requests reuse all of these
values and never create another progress record.
These Source/progress transitions are cleanup-overlay state only while the fence is active;
`GlobalFenceRecoverySnapshot` exposes none of them.

All four counters start at zero when active work begins, are monotonically non-decreasing
within one attempt, and remain at their final values in `complete` progress. Waiting
progress exposes zero counters. A transition to `cancelling` freezes the last published
counters; cleanup activity does not increment them. Requeue of an interrupted Repository
command preserves the request ID but starts a new attempt with zero counters when work
resumes, so monotonicity does not cross that requeue boundary. Every value must remain a
JavaScript safe integer; inability to represent the next exact count propagates under the
owning runtime/session API error rule rather than saturating or wrapping.

### CustomizationFile

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sourceId` | opaque string | DTO | Must identify one enabled Source |
| `sourceRelativePath` | `SourceRelativePath` | DTO | The file's identity within its Source (FR-030) — stable across generations, so no per-generation file ID exists: display, filtering, lookup, selection, and the detail request's parameter, relative to the owning Source root |
| `encoding` | `utf-8 \| utf-8-replaced \| binary \| unknown` | DTO | Closed variant discriminator; the read state is derived from it (readable text, textless `binary`, failed-read `unknown`); invalid non-NUL sequences remain readable as replacement-decoded text |
| `sizeBytes` | non-negative integer | DTO | Present exactly for readable text and `binary` — the outcomes with accepted bytes |
| `hadLeadingBom` | boolean | DTO | Readable text only — a BOM concept does not exist for the other variants; true exactly when one leading UTF-8 BOM was recorded and removed before publishing `sourceText`; independent of whether replacement occurred |
| `sourceText` | string | DTO | Readable text only, never null; complete decoded authored source; literal values and environment-variable reference syntax are preserved exactly; never HTML |
| `diagnosticIds` | opaque string[] | DTO | Present on every variant; refer to the same generation |

A Customization File is one discovered file within a Source, identified by its
Source-relative Path, with its encoding, complete source text when readable,
recognitions, relationships, and diagnostics. Each recognition additionally records the
inspection rule and matched path that admitted it, so which rule authorized a read stays
attached to that admission rather than to a lossy file-level aggregate.

`encoding` discriminates the three closed per-file outcomes (FR-024/FR-028): readable
text (`utf-8` or `utf-8-replaced`), textless `binary`, and `unknown` for a failed
read; a separate read-state field would only repeat the discriminator. Readable text and
`binary` are the only outcomes with accepted bytes and carry `sizeBytes`. `unknown`
records a file that disappeared between discovery and reading or failed with a read
error, including a symbolic link whose target is missing or unreadable (FR-024); it
carries no size, text, BOM record, parse summary, recognitions, or relationships. A
non-readable outcome is ineligible for comparison. Whether it carries a file-scoped
diagnostic depends on what was expected of the file: `unknown` always does, and `binary`
does for an admitted candidate, where a census-listed companion's binary bytes are the
ordinary fact of an asset (FR-025).
Encoding is assigned from the bytes of the one completed read.
Any NUL byte yields `encoding: binary` with no text and no BOM record — the NUL check
precedes BOM handling, so a BOM concept does not exist for binary bytes. Otherwise
the full byte sequence is decoded exactly once with UTF-8 replacement semantics. One leading
BOM sets `hadLeadingBom: true` and is removed from `sourceText`. Input decoded without
replacement uses `utf-8`; any inserted `U+FFFD` uses `utf-8-replaced`; both are
orthogonal to whether a leading BOM was removed. Replacement-decoded text remains
readable, and its exact garbled `sourceText` proceeds through parsing, display, extraction,
and comparison; it does not make the generation partial by itself. Binary input is textless and
comparison-ineligible; whether it is also a Diagnostic is FR-025's split between an
admitted candidate and a census-listed companion. Charset guessing, alternate decoding, sampling,
and truncation are unrepresentable; no product byte, line, or item ceiling affects this
state machine.
A file carries no parse rollup: a recognition's own `parseStatus` is the parse fact,
and a file-level aggregate had no reader. A file with a failed recognition may still be
readable text and show its complete source; its diagnostic describes only Inspector
extraction, not validity for the vendor.
The inspector treats strings such as `$TOKEN`, `${TOKEN}`, and platform-equivalent
environment references as authored text. It never reads, resolves, or substitutes the
referenced process-environment value while building source, metadata, relationships, or
comparison DTOs.

### Inventory unit

An inventory row's unit is decided by the recognized kind, not by the physical file. The
shipped kinds do not agree on one:

| Kind | The unit one row shows |
|---|---|
| `skill` | One name as one tool resolves it (FR-007): the authored frontmatter `name` — or the skill directory name when the file declares none — which a Claude Code recognition of a nested skill prefixes root-relative. A definition is one recognition — one per `(file, tool)` — so several files resolving to one name are one entry listing each recognition as a definition, and one file whose tools resolve different names defines on each name's entry. Being a recognition, a definition states the surfaces of the documented behaviors its admitting rules rest on, exactly as a path-identified row's recognitions do (FR-009) |
| `MCP` | One declared server name: every `[mcp_servers.*]`-style declaration resolving that name — one per `(carrier, tool)` — is listed inside the name's row, so one `.codex/config.toml` contributes one declaration per server it declares, and a second carrier declaring the same name joins that name's row. A declaration's home is an explicit carrier and nothing else: a file of any other kind that spells MCP-looking configuration — a skill's or an agent's frontmatter, a settings file's inline map — is that kind's ordinary content, visible in its own detail, and joins no MCP row. Each declaration names its own file. The one row whose name is null closes the list with the carriers currently publishing no named declaration — an unreadable declaration block, whose rows are unknown, or a carrier declaring none |
| `instructions` | One applicability range: the glob the governing files' own paths derive, listing each file it governs with that file's recognitions — each one product and the surfaces of the documented behaviors its admitting rules rest on, because a tool alone cannot say where a product reads the file from |
| `rule` | The file itself: a rule file is modular instructions a product loads into context, and it declares no name a row could be keyed by nor governs a range it could be grouped under, so its Source-relative Path is the row's identity, and two products recognizing one file are two recognitions on one row, each naming its product and the surfaces of the documented behaviors its admitting rules rest on |
| `permissions` | The file that declares the policy, on the same terms as a `rule` row. A separate kind because the subject differs: a permission policy decides which commands or tools a product may run, where a rule is guidance the product reads. Codex spells its policy in `.codex/rules/*.rules` and Claude calls its own modular instructions `rules` too, so grouping by the vendors' shared word would put two unrelated subjects in one list. A file whose whole content is the policy and a file carrying the policy in one block of a larger document are one row each: what differs is what the detail publishes, not what the row is. A carrier that declares no policy is no row at all — the rest of the document is the recognition that owns it, and a row would state a policy its author never wrote |
| `settings/config` | The file itself |

A CustomizationFile therefore publishes its own facts once — Source-relative Path, read
outcome, size, diagnostics — and each kind's inventory refers to it by `sourceRelativePath`
rather than repeating them. A companion is never a row of its own, whatever it carries (FR-003), so a
row states the diagnostics of the files in its own census beside the definition that owns
them, each named by its path: a read that failed inside a customization's directory is one
of the files that made the generation partial, and the row of the customization holding it
is the only place an inventory can say so (FR-028). One shared row shape cannot express either of the first two units: grouping
by name would break the one recognition per `(file, tool, kind)` rule that ToolRecognition
rests on, and a file-shaped row cannot become the N rows one carrier's declarations need.
Two units that happen to coincide in shape are still two: a rule row is a file and a
permissions row is a policy, so one type standing for both would say two subjects are one,
and the first fact either needs that the other cannot answer would be added to a row it is
not about.

An instruction row's applicability range is, for most files, derived from the file's Source-relative Path,
never from the vendor's runtime: the range is the directory the file sits in, spelled as a
glob relative to the Repository root, once a directory the recognizing product keeps its
instruction files in is stripped from the tail. Claude Code keeps one at `.claude` for
`CLAUDE.md` alone — the page names `./CLAUDE.md` **or** `./.claude/CLAUDE.md` as the one
project instruction location while listing local instructions at `./CLAUDE.local.md`
only — so `.claude/CLAUDE.md` and the root `CLAUDE.md` derive one range and share one row,
`packages/api/.claude/CLAUDE.md` derives `packages/api/**`, and a
`.claude/CLAUDE.local.md` keeps its directory and derives `.claude/**`. What such a
directory means is that product's own fact, so each product answers for its own rules
rather than declaring a list some shared derivation reads.

A derived range is a pattern built from literals, so each directory name is escaped where
a glob would read it as syntax — the wildcards, the class and brace delimiters, the
extended-group parentheses, a leading negation, and the escape character itself. A
repository holding `packages/[api]` therefore publishes `packages/\[api\]/**`, which
denotes that directory rather than a class over `a`, `p`, and `i`. Escaping is not
parsing: nothing interprets a pattern, and this only spells the product's own so the
spelling means what the path says. Rows group by exact text equality of that glob: nothing
parses a glob, normalizes a spelling, or decides whether two ranges overlap, so
`packages/api/**` and `packages/api/**/*` are two ranges. The derived spelling is one a
product fixes rather than one chosen per file, which is what keeps the derived side of the
grouping consistent; a file that declares its own range — Copilot's `applyTo` — is keyed by
that declared value instead. A declared range is published as the parser resolved it
(§ Field reading) — the value's own quotes and escapes resolved once, like every declared
value — and this product escapes nothing further: the resolved value already is the
author's pattern, and escaping it would spell a directory literally named that. Such a file that declares nothing a row can be keyed by — no
declaration, an authored empty value, a list or mapping with no row spelling, or
declarations that could not be read at all (FR-028) — has no known range: its vendor reads that
filename's applicability from the declaration alone, so a range read off the path would
state the widest governance for a file the vendor gives none. Those files share the one
row whose `applicabilityRange` is null, sorted after every ranged row. A range
states what a file governs. It is never a claim that a product loaded the file: an
admission is not an activation (FR-009).

A skill row's name is the name one tool resolves (FR-007): the authored frontmatter
`name` — or the skill directory name when the file declares none or declares it empty,
because being a named directory is what a skill is, so every row has a name and two such
files in same-named directories share one — which a Claude Code recognition of a nested
skill prefixes
with the `/`-joined root-relative path of the directory holding its `.claude` and a `:`,
so `apps/web/.claude/skills/deploy/SKILL.md` declaring `name: deploy` is `apps/web:deploy`
on its Claude row. The last segment deliberately differs from the vendor's documented
command name, which takes the skill directory name and treats the authored `name` as only
a display label: comparing one skill's definitions across tools is what the row exists
for, and the authored `name` is the one identity all three tools share, so every row is
keyed by it and only the nested qualification shape is the vendor's. The nested form is
always prefixed: the vendor qualifies on a name clash against layers this product never
reads, relative to a session working directory it never observes, so the root-relative
qualified spelling is the one stable name a static inventory can stand behind. A name is
rendered with the same control-character escaping as a Source-relative Path
(§ SourceRelativePath): a nested Claude row's prefix is path segments, so a name is a
lookup and selection identity and must read as what it is.

A definition carries its own recognition's parse facts: its `parseStatus`, and the
extraction-failure reference of its kind (FR-028). One extraction per `(file, kind)`
means one failure record, which every failed definition of the file names as its own
parse fact and the file's `files[]` entry lists once as its file-confined outcome. A failed extraction leaves
the authored name unknown rather than absent: the row keeps the directory-derived
provisional identity — the path's own fact, not a reading of the failed parse — while an
authored-name tool's `invocationName` is null and the definition evidences no
authored-name collision. Claude Code's path-derived command name stands either way.

A grouped entry never implies a winner the Inspector has not recorded. Each entry states how
a product resolves a name it recognizes on two or more of that entry's definitions, because
the recorded statements differ: Codex does not merge same-name skills and both stay
available with no documented order; Claude Code keeps every one available within a root —
a nested one under a directory-qualified command — and picks the variant matching the
files being worked on; Copilot's CLI resolves the first in a documented source order; and
Copilot's VS Code and Cloud surfaces document no duplicate precedence at all
(contracts/runtime-composition.md). A product that recognizes only one of the definitions
states nothing: it is facing no collision, so its resolution rule would answer a question
this entry is not asking it. The collision must also be the one the quoted rule answers, and
Claude Code's rule answers the clash of unqualified commands, which come from skill
directories: its statement attaches to every row holding a Claude definition whose skill
directory name is shared with another Claude-recognized skill of the same generation, and
never to rows that share only the authored name under differently named directories
(FR-007).

A statement is published only for a product whose composition strategy is in the shipped
registry. That is not a gap in the row: a product with no skill rule recognizes no skill, so
no entry can reach it, and restating a contract table in the product before its strategy
record exists would put a claim there that nothing can check it against. Shipping a
product's skill rule ships its strategy and its statement together.

### ToolRecognition

A recognition is an internal record of the committed generation, carried by no session
response (FR-027): the inventory rows and the detail are both projected from these —
a definition is one recognition's `(file, tool)` identity, and the detail's
`presentation` is one Markdown recognition's parse, the skill's or the instruction
file's. In code it is a class whose one
production construction site is the recognizer, while the recognize seam
(`CandidateRecognition`) stays an interface tests satisfy with literal doubles.

A recognition record's details are discriminated by `kind`, because what identifies a
recognition differs by kind and does not fit one shared optional field: a skill declares a
single `name`, while an MCP carrier declares one per server. A skill's details carry that
declared name — the display label and the identity every row's name is built from, which a
nested Claude Code recognition's row prefixes root-relative (FR-007, FR-027) — absent,
never empty, when the file declares none; a row whose file declares none, or declares it
empty, is named by its skill directory instead. An instruction recognition's details
carry the same one parse — the declared keys in authored order and the body the block
was removed from — and deliberately no name: what identifies the recognition is the file
it was found in, so the Source-relative Path it already carries is the whole identity.
That is the recognition's identity and not the row's unit — the instructions inventory
groups these records by the applicability range they carry (§ Inventory unit) — and the
two stay separate questions: the range is derived once by the admitting rule, which is the
only unit that knows where its vendor reads that filename from, and the record carries it
so the projection groups rather than re-derives it.

A recognition is not an inventory row. The row's unit is the kind's own (§ Inventory unit),
so each kind's inventory is built from these records rather than published as one summary
per file: a skill's rows group records by the name each tool resolves
(§ Inventory unit), and an MCP carrier's declarations
are grouped by declared name, one row per name across every carrier. The MCP kind's
recognitions come from the explicit carrier rules alone: a file of any other kind that
spells MCP-looking configuration in its own content — a skill's or an agent's
frontmatter, a settings file's inline map — holds that kind's recognition alone, its
configuration visible in its own detail as the declarations it wrote, and joins no MCP
row. A file publishes no recognition summary
of its own, so nothing has to state how many admissions back a record. An admission says
which rule authorized the read and where it matched; where the customization would apply,
and how well the rule is documented, are not on it, because no surface shows either.

The sorted companion file list a skill's census produced is not on the details. It is
published on the inventory definitions the file's recognitions back
(contracts/http-api.md `skills[].definitions[].companionFiles`): a second spelling on the
recognition would be a state able to disagree with those, and every definition of one
file — across tools and across entries — carries the same list, because the census is the
file's. The list is empty, never
absent, when the `SKILL.md` sits alone, because being a directory is what a skill is and
every recognized skill has been enumerated. Its `length` is the only count published
(contracts/inspection-path-allowlist.md § Bounded companion census).

Each listed path is also a `CustomizationFile` of the same generation: a directory-shaped
customization is read whole, so its accompanying files are read once each and published like
any other file — with their own identity, path, and read outcome, the complete authored
source included when the read yielded text (FR-025).
The census itself admits nothing: a file it alone lists carries no recognition and
appears in no kind's inventory, while a path a rule independently admits — a nested
`SKILL.md` inside another skill's directory — is a candidate with its own recognitions
even while an outer census lists it. The definition's list is what associates the
accompanying files with the
customization they belong to, and it is what a detail surface builds that customization's
directory from.

| Field | Type | Rules |
|---|---|---|
| `sourceRelativePath` | `SourceRelativePath` | The file the recognition is attached to, by its identity (FR-030); many recognitions may reference one physical file |
| `provenances` | ordered admission record[] | Sorted, non-empty set of rule/path admissions for this shared tool/kind interpretation; each record holds the compiled rule that authorized the read and derives its `ruleId` and `RuleDiscoveryClass` from it, beside the matched `SourceRelativePath` — and nothing beyond that |
| `tool` | `copilot \| claude \| codex` | Required |
| `details` | kind-discriminated payload | The recognized kind plus what identifies a recognition of that kind — for a skill, its declared name. One field, so projecting it is a copy rather than a per-kind reconstruction |
| `parseStatus` | `not-attempted \| parsed \| failed` | `not-attempted` means no allowlisted extractor applies; `failed` is all-or-nothing per `(file, kind)`: the Markdown kinds run one extraction shared by every recognizing tool, while the MCP kind runs each recognizing tool's own documented reading over the one decoded text (§ Field reading) — readings that share their parser family, so a text one rejects fails them all and the failure unit stays the `(file, kind)` pair |
| `diagnosticIds` | opaque string[] | The kind's extraction-failure record (FR-028): one per `(file, kind)`, referenced by each failed recognition of that kind and listed once by the file |

The maintained supported-customization documentation is the normative presentation
allowlist. For every supported `(tool, kind)`, it enumerates the relationship kinds and
admitted source forms covered by the row. It enumerates no metadata field catalog: a
skill's declarations are published by the keys the file wrote, and an authored key set is
not closed. An
entry is eligible only if the tuple allowlist contains it and the exact extractor for the
recognition's admitted source form defines that authored occurrence. Multiple source forms
in one row do not union or transfer schema fields between those forms. An authored field or
reference that fails either gate remains visible only in the complete `sourceText`; it does
not create a published value or `Relationship`, and the parser does not infer an
equivalent one from its shape or name.

The authoritative enumerations are the Presentation Allowlist sections in the
[GitHub Copilot](contracts/vendors/github-copilot.md), [Claude Code](contracts/vendors/claude-code.md),
and [OpenAI Codex](contracts/vendors/openai-codex.md) contracts, with the six deterministic
table digests and extraction algorithm recorded in the
[official-source contract](contracts/official-sources.md). They are frozen design inputs
before dependent implementation begins, and the implementation gate only recomputes and
verifies them. If a field, relationship kind, source form, extractor applicability, or
allowlist membership must change after implementation begins, dependent work stops before
any production registry mutation; maintainers synchronize every affected English/Japanese
specification, research, plan, quickstart, contract, and data-model artifact, then rerun
`/speckit.plan` followed by `/speckit.tasks`. Only the regenerated task set may authorize
the revised registry, conformance fixture, and test updates.

The customization-kind enum is shared, but each recognizer owns its path and interpretation
rules. A shared `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, skill, or marketplace therefore stays
one file with multiple recognitions. There is exactly one recognition for each
`(file, tool, kind)` pair. Compatible admissions merge their provenances into that one
record. If extractors for the same pair produce incompatible parsed meanings, that
recognition becomes `failed`, retains its complete source and compatible provenance
admissions, and publishes no metadata/relationship/derivation result. An admission is
never collapsed into a lossy recognition-level aggregate: each keeps the rule that
authorized its read and the path it matched.
For a Repository-root `.mcp.json`, the Copilot/MCP recognition can therefore carry both
the root-exact CLI provenance and the exact VS Code 1.118+ provenance without a
second file or read. CLI `mcpServers` extraction remains tied to the CLI provenance. The
VS Code provenance is path/surface-only, has `documentationStatus: conflict`, and adds no
VS Code-owned extractor fields or inferred same-name winner until direct official
documentation establishes the root schema and total location order.
The parser never resolves environment references. An FR-028-eligible parse or
extraction failure confined to one file — including an ordinary caught parser
exception — discards that recognition's entire
metadata/relationship/derivation result, reports a
safe diagnostic, and may retain the complete readable `sourceText` in a partial
generation. If a read or parser operation throws or rejects outside that file-confined
path, the recognizer and
scan domain do not catch, classify, retry, or recover it. It propagates to the trigger-owning
boundary, produces no recognition, item, Diagnostic, or generation result from that attempt,
and is reported ordinarily as the failed request's error when a session API boundary owns the trigger.

Recognitions are ordered by the closed tool order `copilot`, `claude`, `codex`, then the
closed kind order, never by opaque ID. Cross-file declaration comparison is
one canonical serialized document per side, diffed in Monaco (research.md § 7): a
frontmatter declaration is its file's one parse for the recognized Markdown kind, so a
tool is not a coordinate of it — tool recognition is compared per tool in typed rows
beside the diff — and each side serializes to YAML, the skill comparison leading with
`name` and `description` and every other key sorted, the instruction comparison sorting
every key. The MCP kind's declarations are each recognizing tool's own reading
(§ Field reading), and their comparison surface is the declared server name's own — one
name's declaration in each of two carriers of its row, serialized to one canonical JSON
document per side and diffed in Monaco, loaded through two ordinary
`get-mcp-carrier-detail` reads (§ BrowserState · ComparisonSelection) — while each
detail renders its declaration content as the same serialized document in the file's own
key order (FR-007).

### Field reading

An extractor reports what its format's parser resolves a declaration to — one
documented, deterministic reading per admitted source form: YAML 1.2's core schema for a
Markdown file's frontmatter, strict JSON (`JSON.parse`) for the `.mcp.json` and
`.github/mcp.json` MCP carriers and for the `.claude/settings.json` and
`.claude/settings.local.json` permission-policy carriers, JSONC for the `.vscode/mcp.json` carrier — comments and a
trailing comma are the editor configuration format's own syntax, and any other syntax
error still fails the document whole — and TOML 1.0 for the `.codex/config.toml`
carrier. In every
format, quoting and escapes are resolved once. A key declared twice resolves to its
later declaration where the format's parser resolves one — the YAML schema and strict
JSON both do — while TOML 1.0 refuses a redefined key outright, so a carrier declaring
one fails its recognition as any other document its parser rejects. Under the YAML
schema an alias additionally resolves to the value it
points at, `007` reads as `7`, and a tag outside the schema leaves the scalar it carried.
None of those is
refused. A scalar renders through the platform's own string conversion, so a distinction
that conversion does not spell — a signed zero renders as `0` — is the platform's
resolution accepted as is, exactly as the platform's integer-like key enumeration order
is. The parsed kind — string, number, or boolean — is published beside the rendered
text (`DeclaredScalarKind`), because the rendering alone cannot say whether `7` was a
number or a quoted string, and the serializing surfaces spell each scalar by it
(research.md § 7). The kind-plus-text pair is the raw resolved value's JSON-safe
encoding: the raw value itself cannot ride the JSON wire, because `NaN` and the
infinities have no JSON value and a TOML 64-bit integer overflows the double type,
while the pair decodes back exactly — `Number` or `BigInt` over the text — wherever a
value is needed. A datetime and any other host-object scalar publish as `string`: the
ISO rendering is their spelling. It is stated as the Inspector's reading, not as the value a vendor's runtime
holds: a vendor may coerce further per field — Claude Code reads `yes` as true for its
boolean frontmatter fields, where the core schema leaves the string `yes` — and what a
product does with a value is runtime this tool never observes (FR-009). The Inspector is
not a validator standing between the two either. For a file whose kind serves source — a
skill, an instruction file, a census companion — the complete decoded source is on the
same detail response as `sourceText` for any reader who needs the spelling; an MCP
carrier's detail deliberately carries none (FR-007), so its declarations are the reading's
whole publication. A permission-policy carrier is read on the same terms: the declared
`permissions` block is that reading's whole publication, and the document holding it is not
served through the permissions detail, because the rest of it is another recognition's
content and the block is what this row is about.

A recognition is refused when the file offers nothing this surface can show as the file
wrote it: a document its format's parser cannot parse at all — a malformed frontmatter
block, strict-JSON or TOML syntax the carrier's parser rejects; a YAML key that is not a
scalar, which has no text that names a row without inventing one — JSON and TOML keys are
always strings; a value an explicit YAML 1.1 tag
resolved to a host object, whose only spellings are a locale-dependent date or
`[object Set]`; and a value that contains itself, which has neither a shape to publish nor
a JSON form to send. Each yields no value to report rather than a value this product made
up. It is atomic per recognition: nothing is published for that recognition rather than
the fields that happened to parse, because a partial extraction cannot say which authored
values it skipped. Its file stays admitted, readable, and comparison-eligible.

Fields carry no source coordinates. Nothing points into a document — the detail surface
shows a file whole and an inventory row shows a name — so a range would be a field
every entry carries for no reader, and one nothing could check: an extractor takes a value
out of the same text it would measure, so requiring the two to agree can only restate the
value and stays true when the measurement itself is wrong. A projection that must point into
a source introduces coordinates together with the check that makes them meaningful.

Values are read in whole characters — an astral character is two UTF-16 code units and a
combining mark is two code points — so JSONC, YAML, TOML, Markdown/frontmatter/import,
astral-character, and combining-character fixtures must survive extraction and JSON
transport unaltered.

### Skill presentation

A skill's detail surface leads with the skill, not with the file that carries it: its row
name as the heading — this product's provisional identity, the same one the inventory
lists — with the owning definition's documented invocation name beside it from the published
`invocationName` (contracts/http-api.md § get-session `skills[]`). A definition
is one tool's recognition, and each publishes its own tool's documented name
(`definitions[].invocationName`); the page shows the definition its route addresses — a
detail URL is `/skills/<tool>/<source-relative path>`, the definition's own identity, tool first as the
broader segment, and a companion opens under the same tool segment — so which invocation
name sits beside the heading is the link's identity rather than a preference. That
identity is stable across rescans and server launches — it is the URL's path half, so a
bookmarked link's path keeps naming the same file across rescans and across launches that
select the same root, because the Source-relative Path is the
file's identity on the wire and a detail request resolves it against the current committed
snapshot (FR-030); a launch that selects another root (FR-001) resolves it against that
root's scan, and the origin is devframe's port selection, fixed-default unless occupied
(quickstart.md), so a moved port changes where a bookmark points, never which file its
path names — and a path the current scan does not hold for the URL's tool is
reported as a dead link. A root
`.claude` skill whose authored `name` differs from its directory is invoked by Copilot
under the authored name, which stays visible as the row's name, and by Claude Code under
the directory-derived command its own definition's page shows beside it. The published value is
the projection's, so the client renders vendor naming rather than re-deriving it. Then two tabs — the skill itself and its files. The skill
tab presents every key the frontmatter declares as one YAML document through the
read-only viewer — led by `name` and `description` however the file ordered them, every
other key in the file's own order; the block's own language, so a reader compares it
against their file and copies from it without converting (FR-007) — and then the
instructions that block was removed from. The files tab
holds the directory and the open file's complete authored `sourceText`, which is where
every authored spelling stays readable. Two tabs rather than one column: they are two
subjects, and stacked, the directory sat below everything the skill declares and
instructs.

The parse itself is published once, on the detail response's skill variant
(`SkillFileDetailDto.presentation`, contracts/http-api.md § get-file-detail): it is the
file's fact — every shipped vendor reads the same fixed YAML semantics — so no per-tool
copy exists on the wire, and the internal `ToolRecognition.details` carries, for the
`skill` kind:

| Field | Type | Rules |
|---|---|---|
| `declaredName` | string, absent when none | The `name` scalar as the parser resolved it (§ Field reading). Absent, never empty: an authored empty name is a different fact from no name. Absent too for a `name` that resolves to anything but a scalar — naming a skill after the first item of a list it wrote would be an identity the file never declared. It is the display label and the identity every row's name is built from; a row whose file declares none, or declares it empty, is named by its skill directory, and a nested Claude Code recognition's row prefixes it root-relative (§ Inventory unit, FR-007) |
| `frontmatter` | ordered entry[] | Every key the file declares, in authored order, keyed by the key the file wrote — never a maintained catalog's. Empty for a document with no frontmatter block, for a block written as a list or a bare scalar rather than a mapping — such a block declares no keys, and the index positions a list would be read by are not keys the file wrote — and for a `failed` extraction |
| `bodyText` | string | The same document with its frontmatter block removed. Empty for a `failed` extraction |

Each frontmatter entry is a `key`, its `keyKind`, and a `value`. The `keyKind` is the
key's parsed type — string, number, boolean, or null — published beside the rendering
because one spelling can stand for two keys: an unquoted `1` is a number and `"1"` a
string, both rendering as `1`, and a surface matching declarations across files matches
by that identity rather than by the spelling alone (FR-011). The value mirrors what the
parser resolved in the shape the file wrote it: a scalar carries its resolved text, an
authored null is its own variant, a sequence carries its items, and a mapping carries
entries of its own — recursively, so a nested block reads as the block it is. A flattened spelling
of a structure is never a value: it would be text the file does not contain. A value that
contains itself, which a YAML anchor can declare, has neither a shape to publish nor a
JSON form to send, so it fails that recognition all-or-nothing (FR-028) rather than being
summarized away.

The split between the declarations and the body is the frontmatter parser's own. Deciding
where the block ends is deciding line terminators, closing-fence forms, and what counts as
a fence — a grammar the parser already implements, and a second opinion about it is one
that can disagree with the values it produced.

No other authored value is republished: the detail surface serves the complete
`sourceText` beside these, so a captioned copy of a value already on the same screen would
be one fact in two spellings, and two spellings can disagree. Reading a value is
mechanical: it cannot represent natural-language meaning or intent, semantic rank,
validity/correctness/effectiveness/compliance/quality, policy or remediation advice, or a
fix action. JSON transport escaping does not alter a string after JSON decoding, and a
document the extractor cannot parse discards the recognition's whole extraction while its
complete decoded source stays available as `sourceText`.

### Relationship

| Field | Type | Rules |
|---|---|---|
| `relationshipId` | opaque string | Unique within generation |
| origin reference | file identity plus recognition | Names the origin file by its Source-relative Path (FR-030) and the owning recognition by its `(tool, kind)`; the admission-reference shape arrives with the relationship phases that construct these records — no per-generation file or recognition ID exists to point at. The referenced admission's matched path is the sole base for path-relative normalization |
| `ruleId` | stable relationship-only rule ID | Proves that the reference can never authorize a read |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptive only |
| `targetOrigin` | `authored \| documented-default` | `authored` requires one exact source occurrence; `documented-default` is allowed only for a fixed registry-defined default such as an omitted Codex plugin hook |
| `authoredTarget` | string or null | For `authored`, exact decoded-source slice for this target token/span, including authored quoting and escapes; for `documented-default`, null so a synthetic path is never presented as authored |
| `semanticTarget` | string | Internal separately decoded authored target or fixed registry default used only for path normalization/applicability; never substituted for an authored display value |
| `normalizedTarget` | `SourceRelativePath` or null | Set only when lexical normalization is safe and the target remains in the owning Source |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Does not authorize a read |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | A relationship itself never expands content |
| `behaviorRefs` | sorted behavior ID[] | Surface-specific upstream statements that permit describing this edge |
| `strategyRefs` | sorted strategy ID[] | Composition/selection strategies considered for the edge |
| `sourceRefs` | sorted source ID[] | Exact evidence union from the relationship rule, behavior, and strategy records |

Although `Relationship.kind` is globally closed, an extractor may emit only the subset
listed by the maintained presentation allowlist for the owning `(tool, kind)`. A reference
with an unlisted relationship kind remains authored source text only and cannot be promoted
to a generic, inferred, or fallback relationship.

Relationships are direct only. A candidate target is independently admitted by a static
or derived rule; a
relationship itself never promotes the target. Typed candidate derivation is modeled as a
derived admission record on the target's recognition and is not relationship traversal.
The relationship summary describes only whether the reference edge may be available or
selected under known product rules; it never describes target-file effectiveness.

An extracted reference is emitted once per applicable admission record, so distinct rule
admissions never borrow another admission's directory as the
relative base. Every extractor assigns an internal origin key made only from a closed declaration-field
identifier, `targetOrigin`, and a zero-based source or deterministic synthetic occurrence; it contains no authored field value and is
never serialized. The deduplication key is the origin file's Source-relative Path, the owning recognition's
`(tool, kind)`, the originating admission's stable reference (the shape the relationship
phases fix — no per-generation file, recognition, or provenance ID exists), `ruleId`,
`kind`, the origin key, and a target identity. That identity is the normalized target when available and otherwise
a process-keyed digest of the exact authored target for `authored`, or the fixed default ID
for `documented-default`; neither digest nor default ID leaves memory or enters logs.
Extractors emit by the originating provenance's stable array key, recognition tool/kind,
relationship `ruleId`/kind, declaration-field identifier, then source-occurrence order.
Distinct authored source occurrences remain distinct edges even when their semantic targets
match. A documented default uses `authoredTarget: null`; the UI labels it as a documented
default and may display the `normalizedTarget`, never as source-authored text.
Opaque IDs never participate in ordering. No target is opened while constructing or
retaining a relationship; only independent candidate admission can authorize a read.

### Diagnostic

| Field | Type | Rules |
|---|---|---|
| `diagnosticId` | opaque ASCII string | Server-generated and unique within generation/session |
| `code` | stable closed code | Suitable for objective tests and documentation links; the shared registry fixes each code's scope, severity, and actionable English message/next-step text, so none of them serializes |
| `severity` | `info \| warning \| error` | Registry-fixed by `code` and not serialized; does not imply vendor validation |
| `scope` | `file \| source` | Registry-fixed by `code` and not serialized; required attachment discriminator; independent of generation-scoped versus session-lifecycle lifetime |
| `sourceId` | opaque ASCII ID | Required for both scopes: every diagnostic this product produces belongs to a Source, so none of them is pathless |
| `sourceRelativePath` | optional Source-relative Path | Required only for `file`, must equal that file's path within `sourceId`, and is forbidden for `source` |
| `lifecycleOwnerKey` | `repository \| global:<tool> \| published-source:<sourceId> \| null` | Internal and never serialized; required and non-null for every out-of-generation lifecycle Diagnostic, null for generation-owned candidates, and validated against the one public owner reference |

The two legal attachment shapes are therefore exactly: `file` with non-null
`sourceId` and `sourceRelativePath`; and `source` with non-null `sourceId` and a null
path field. A DTO using any other combination is invalid. There is no pathless
scope: a diagnostic states what happened while reading something, and the Source it was
read under is the least context that makes it resolvable — a record naming neither would
tell a reader that something failed somewhere. Scope is orthogonal to lifetime: a fatal
rescan lifecycle record and a per-file read failure are both source- or file-scoped, and
which of the two they are says nothing about whether they live inside a committed
generation.

The closed diagnostic-code registry lives beside the closed code union in the shared
module and fixes each code's severity, attachment scope, and one actionable English
message that identifies the problem and a practical next step. The server and browser read
that same registry; there is no client message catalog or localized/bilingual runtime
variant. `lifecycleOwnerKey`
identifies the one lifecycle instance and
is never serialized. Candidates are emitted in
fixed phase, lifecycle-owner semantic order (Repository, fixed Global tool order, then the
existing public Source order), scope, Source-relative Path, rule/code, then emitter-
occurrence order; an opaque Source ID never supplies the sort order. Aggregation is
order-only: each emitter creates every observation exactly once — legitimately repeated
records exist, because an extraction failure is one record per `(file, kind)` (FR-028)
and one file's two kinds can each fail, sharing every public field — so there is
no deduplication pass, and a double emission is an ordinary implementation bug owned by
tests and review, not a runtime filter. A scan candidate belongs to one
committed generation. An out-of-generation lifecycle candidate—including a fatal scan attempt
that cannot be committed—belongs to the session only and is never inserted into a
generation or Source ID list. Malformed-request and other client-caused
API errors are returned but not retained as diagnostics.

The session keeps at most one current actionable failure for each lifecycle owner key. An
automatic Repository admission/initial-scan deterministic failure is referenced by
`repositoryFailureDiagnosticId`. The first explicit rescan keeps that reference while
running; terminal success clears it, while deterministic or thrown/rejected terminal failure
atomically removes it and creates the `published-source:<sourceId>` stale owner described
above. Later explicit outcomes use only `StaleSourceFailure`. An unpublished Global tool has no lifecycle Diagnostic at all: its failure is its control's
`failureCode`, which successful publication or Global disable clears. A published Source explicit-rescan failure uses
`published-source:<sourceId>` and is referenced only by that Source's
`StaleSourceFailure`; later terminal failure replaces it, while successful refresh or Source
removal clears it. Unrelated owner commits preserve each record. Every non-null public
reference resolves to exactly one unique member of `sessionDiagnosticIds`, and each such
lifecycle Diagnostic has exactly one public owner reference. Diagnostics are
never deliberately truncated or replaced by an aggregate suppression record. An unexpected
thrown or rejected operation never enters this
registry: it propagates past the domain and, if request-owned, surfaces as an ordinary
error, never as a Diagnostic. If retaining or serializing a deterministic Diagnostic itself throws or
rejects, that unexpected failure follows the same rule
and no Diagnostic or generation from the attempt is published.

The inspection-traversal subset is exactly:

| Code | Scope | Severity |
|---|---|---|
| `root-unreadable` | `source` for a published Source; `session` for an unpublished Global tool | `error` |
| `file-unreadable` | `file` | `error` |
| `file-content-binary` | `file` | `warning` |
| `recognition-parse-failed` | `file` | `warning` |

No other code in this subset is valid, and every code has one fixed scope.
`root-unreadable` records a Source root that does not exist or cannot be read as a
directory, source-scoped with that Source's `sourceId` — the Repository Source, or a
published Global Source at rescan. An unpublished Global tool has no Source to attach a
record to, and this model has no pathless scope to fall back on, so that failure is not a
Diagnostic: it is the `failureCode` of the `GlobalToolControl` it belongs to. A Diagnostic
never fabricates a Source or a path to fill the gap. `file-unreadable` records a per-file read failure, including a file that disappears
between discovery and reading and a symbolic link whose target is missing or unreadable
(FR-024); `file-content-binary` records an admitted
candidate's NUL-byte diagnostic-only outcome (FR-025) — a census-listed companion's binary
bytes are the ordinary fact of an asset, published with no Diagnostic; and
`recognition-parse-failed` records an
FR-028 parser or extractor failure that keeps the complete readable source displayed and
comparison-eligible while omitting only the affected recognition's derived
metadata/relationships. Each of these three file-confined outcomes makes an otherwise
publishable generation `partial`. File rows require the coherent tuple of a file the generation already
published — an admitted candidate, or a file a companion census listed beside one and the
scan read the same way. No row can carry OS error text, an outside path, filesystem handle/descriptor, or
source bytes.

### RootPresentationEncoding and Global lexical state

Repository and Global root labels use one shared deterministic, injective presentation
encoding over exact ECMAScript UTF-16 code units. Iterate the string without Unicode
normalization or scalar/grapheme conversion. An ASCII letter, digit, or one of the five code
units `.`, `/`, `:`, `_`, `-` is copied unchanged. Every other code unit—including space,
backslash, quote, markup punctuation, control and bidi characters, non-ASCII code units, and
each half of a surrogate pair—is emitted as the six ASCII characters `\uXXXX`, where
`XXXX` is that 16-bit code unit in four uppercase hexadecimal digits. Because backslash is
never copied, this mapping is injective and unambiguous; an empty input alone produces an
empty output. Rendering uses a text node/`textContent`, never HTML parsing. The encoded value
is display-only and is never decoded or used for I/O.

Global `inputState` is assigned in this exact order to the captured string:

1. `present-empty` when and only when `origin === 'environment'` and
   `lexicalRoot.length === 0`.
2. `invalid` when any code unit is U+0000 or when UTF-16 is not well formed: a high
   surrogate U+D800–U+DBFF is not immediately followed by a low surrogate U+DC00–U+DFFF,
   or a low surrogate is not immediately preceded by a high surrogate.
3. `relative` when active-platform `node:path.isAbsolute(lexicalRoot)` returns false.
4. `eligible` otherwise; the exact string is frozen into the preview and carries no read
   authority until consent.

The product adds no lexical spelling policy beyond this closed algorithm; whether an
`eligible` root is usable is decided only by post-consent readable-directory admission, and
a later Node.js/OS rejection follows the normal boundary rule. A throw during
`isAbsolute` or state/presentation construction propagates to the preview session API boundary and
creates no preview. No step normalizes the string, changes separators, calls the
filesystem, or silently chooses another root.

### BrowserState

This state is not authoritative and is never persisted.

- `FilterState`: selected source/tool/kind and Source-relative Path query.
- `ClientDataState`: a monotonic `clientDataEpoch`, the adopted `sessionId` and
  `globalContentEpoch`, the current per-sequence generations (`repositoryGeneration` and
  nullable `globalGeneration` from the adopted snapshot), and one exact request token per
  request family. Every ordinary settlement first requires its request token to remain
  current and its captured client epoch to equal `clientDataEpoch`; a late rejection has no
  authority to purge newer state. Every ordinary success is then checked against the
  adopted session identity, Global content epoch, and null disable fence before it can
  mutate browser state. A sequence generation lower than the current one is ignored. Before
  adopting a sequence's greater generation, the client
  aborts the detail/comparison requests bound to that sequence's files, disposes that
  sequence's detail/editor/comparison objects, and only then replaces that sequence's
  inventory entries; the other sequence's state, requests, and models are untouched
  (FR-030). An equal-generation response is accepted only for the exact
  still-current request token. A detail request captures
  `{ clientDataEpoch, sourceRelativePath }`;
  its callback adopts the response only when the
  epoch still equals current state — the path is the file's stable identity (FR-030), so
  the host resolves it against whatever generation is current, and the epoch is what keeps
  a response captured before a purge from repopulating state. Every central invalidation/purge increments the same
  epoch, so a late callback is a no-op even when response delivery was already queued.
- `ComparisonSelection`: what a kind-specific comparison route names, by that kind's own
  coordinates (spec.md § Clarifications Session 2026-08-14). The skill route names the
  two compared copies' entry files' `sourceRelativePath` identities
  plus the copy-relative compared file, resolved against the owning sequence's current
  committed generation into zero files, two readable corresponding files, or one
  readable file beside its stated absent counterpart. The instruction route names two
  files' `sourceRelativePath` identities that one applicability-range row of the
  current generation holds — the row-owned pair the skill precedent establishes, the
  range row standing where the skill name's row stands, and derived from the two
  identities because a file governs exactly one range — resolved into zero or two
  readable files: an instruction file is complete in itself, so no side can be a
  stated absence, and a pair no single row holds is reported rather than compared. The
  MCP route names one declared server name — the kind's row unit — and two carriers'
  `sourceRelativePath` identities that name's row of the current generation holds; a
  selection outside the named row, a name no current row is included, is reported
  rather than compared. Its pair is loaded through two ordinary
  `get-mcp-carrier-detail` reads, and what Monaco diffs is each side's declaration for
  the named server serialized to one canonical JSON document (research.md § 7): the
  carriers need not share a syntax and no carrier shows its bytes (FR-007), so the
  serialization is the one spelling both sides can be read in. A
  cross-source comparison always
  compares each source's last committed state. A file pair is loaded through two ordinary
  `FileDetail` requests and a one-sided skill comparison through one — the absence needs
  no request — and Monaco compares the complete `sourceText` values, the absent side
  empty, which renders the present content, line by line, as the difference it is.
  Literal differences, including credential-like strings and environment references,
  remain visible.
- `EditorModelState`: generation-scoped Monaco models with opaque in-memory URIs and
  complete authored `sourceText` — or, on the MCP comparison, the canonical JSON
  serialization of one declaration's parsed entries, which carries the declared values
  in full and is purged under the same rules. The owning editor, subscriptions, and every model are disposed
  independently on route close, selection replacement, file removal, source disable, or
  the owning sequence's generation change.
- There is no sensitive-content state of any kind: no acknowledged flag, no notice, and no
  confirmation step in front of a `FileDetail` request or a comparison (FR-027). The session
  is loopback-bound and the files are the viewer's own, so a confirmation would guard nothing
  while making every file take two interactions to read, and a standing notice would spend
  the screen telling a reader about their own repository. What bounds authored content instead
  is where it can be reached — one file or comparison at a time, never through an inventory or
  session response — and how long it is held, which the central full-session purge below
  ends. Route close, selection replacement, file or Source removal, and generation change
  dispose their scoped models independently and are not central client-data purges.
- A Global-disable action purges all inspection content locally before sending the request; observing
  a greater `globalContentEpoch` or non-null `globalDisableInProgress` in any ordinary
  response repeats the idempotent purge before rendering it. The client increments
  `clientDataEpoch`, aborts every request that could return inspection data, disposes every
  editor/model/comparison, clears filter state, removes all Source, generation, file,
  detail, authored metadata, relationship, and Diagnostic DTO/DOM text from every state
  owner and rendered surface, and retains only
  the control/error projections needed to join or retry
  disable. The purge's synchronous guarantee is that owner disposal plus the revocation
  of settlement authority: a continuation still awaiting an aborted request may hold a
  response it captured until that request settles and is discarded, and the epoch check
  above is what makes such a settlement a no-op rather than a repopulation. A failed accepted barrier does not restore purged content; a later new full
  snapshot obtains content only after terminal disable success or process restart. If the
  request fails before barrier acceptance, or is a true no-op, a fresh
  session snapshot has a null fence and the purged client may immediately fetch a new full snapshot.
- `RecoveryViewState`: created after the Global-disable pre-send purge or after an ordinary
  response exposes a greater epoch or non-null fence and a fresh session snapshot is
  fetched. It is not created by page visibility or navigation. A transport-reported channel
  loss or unsupported protocol, or a session mismatch, instead leaves the
  session-ended view after the central purge; an ordinary request rejection purges nothing. Recovery holds only the adopted `sessionId`,
  the fresh `globalContentEpoch`, `globalControl`, `globalEnableInProgress`, and
  `globalDisableInProgress` projections, each failed tool's `failureCode` on its own
  control, the failed request's error retained by a failed
  `globalControl.batchStatus` or disable projection when present, and an optional newly
  verified frozen preview. It offers **Resume inspection** only when
  `globalDisableInProgress` is null and a normal full snapshot can be fetched. It offers
  immediate disable when control or any enable is active, join/wait while disable drains,
  retry-disable when disable is failed, and Global retry only after the preview is verified,
  `globalEnableInProgress` is null, `pendingTools` is empty, and `retryableTools` is
  non-empty. Resume fetches the session again, requires the returned `sessionId` to match
  the adopted recovery baseline, and atomically constructs a fresh inventory-summary view
  with default filters. It restores no prior detail, comparison, editor state, or authored
  source; opening detail/comparison later fetches it again from the fresh session. If that
  fetch fails or the returned `sessionId` does not match, only the
  session-lost next step to reopen the printed process-lifetime URL remains.
- `SessionViewState`: stores the current booting/inspection/recovery/ended view and adopts
  devframe's connection-status signal directly. There is no separate liveness RPC, probe,
  or DTO. Initial adoption, source-state refresh, and explicit Resume use the ordinary
  session function; elapsed time, an idle page, and page-lifecycle events issue no request.
  The client installs no visibility, focus, or unload listener, and
  `visibilitychange`, `pagehide`, and `beforeunload` trigger neither a purge nor a refetch.
  A discarded document releases its own references; a bfcached document retains the same
  user's view of their own files on their own machine, which the trusted-workspace model
  does not treat as exposure. A transport-reported channel loss or unsupported
  protocol on the current RPC, or a session-ID mismatch, synchronously invokes one central
  purge before rendering the session-ended view — an ordinary handler, serialization, or
  delivery failure is that request's error alone and purges nothing: dispose every Monaco
  editor/model/worker and subscription, clear comparison and filter state, drop all
  source/detail/metadata/diagnostic DTOs, abort pending requests, and increment
  the epoch so every response captured under the prior epoch is ignored. The DOM those
  DTOs rendered is removed by the framework's own flush, which is a microtask and therefore
  completes before the next paint, so no frame is drawn from dropped state; an editor model
  is disposed explicitly because it is a resource the DOM removal would not release. Before any
  ordinary response confirms the current baseline or renders, its request token,
  `clientDataEpoch`, session identity, Global content epoch, and fence must still pass. An
  older epoch is rejected, an equal epoch plus a null fence confirms the baseline, and a
  greater epoch or non-null fence invokes the same purge and enters control-only recovery.
  The product does not model proactive observation by a second tab. It defines no polling
  interval, request timeout, retry timer, or memory lease, and gives process loss on a
  continuously idle visible page no product-defined wall-clock detection guarantee.
  No service worker, browser storage, or HTTP cache persists content. What the
  application guarantees is the synchronous disposal of its state owners, rendered
  surfaces, and editor models plus the revocation of settlement authority — a
  continuation still awaiting an aborted request may hold a captured response until it
  settles as a no-op (§ ClientDataState) — not physical zeroization of browser-process
  memory outside JavaScript control.

## Release usability-study evidence

These records are test and release evidence, never product/API DTOs. The owning normative
contract is [Usability-study evidence](contracts/usability-study-evidence.md); unknown,
missing, extra, or non-canonical fields fail its contract rather than being ignored.

### StudyInputBundle

`StudyInputBundle` is the closed, candidate-independent input set used by SC-001 and SC-006.
It has this fixed repository layout:

| Field | Exact value | Rules |
|---|---|---|
| `manifestPath` | `tests/usability/sc001-sc006-study-inputs.json` | Canonical `StudyInputManifest` bytes |
| `manifestDigestPath` | `tests/usability/sc001-sc006-study-inputs.sha256` | Lowercase SHA-256 of the exact manifest bytes plus one LF |
| `bundleRoot` | `tests/usability/sc001-sc006-study-inputs/` | Closed direct-child root; no subdirectory, symlink, or other member is permitted |
| `memberPaths` | the exact 16 paths below | Equals the recursively observed regular-file set and the manifest's `inputs[].path` set |

The exact members under `bundleRoot` are:

```text
guidance.md
guidance.ja.md
task-prompt-sc001.md
task-prompt-sc001.ja.md
task-prompt-sc006.md
task-prompt-sc006.ja.md
evaluation-fixture.json
evaluation-fixture.ja.json
prepared-state.json
prepared-state.ja.json
response-form.json
response-form.ja.json
ground-truth.json
ground-truth.ja.json
scoring-rubric.json
scoring-rubric.ja.json
```

Each `prepared-state*.json` includes one fresh `studyBrowserProfile` object with complete exact
property order `profileId`, `playwrightVersion`, `browserEngine`, `browserRevision`,
`browserVersion`, `browserDistribution`, `operatingSystem`, `architecture`, `nodeVersion`, `headed`, `contextPersistence`,
`extensionSet`, `proxyConfigurationScope`, `proxyAuthenticationMode`. Values are respectively
literal `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`, `1.61.1`, `chromium`,
`1228`, `149.0.7827.55`, `chrome-for-testing`, `ubuntu-24.04`, `x64`, `24.18.0`, literal `true`,
`fresh-nonpersistent`, an empty array, `browser-context-only`, and `single-407-basic`. This means
headed Chromium revision `1228`, browser version `149.0.7827.55`, Chrome for Testing installed by
Playwright 1.61.1, Ubuntu 24.04 x64, Node 24.18.0,
an empty-extension fresh nonpersistent context, and browser-context-only proxy configuration.
Only the fixed profile ID, fixed pass/fail status, and required input/evidence digests may leave
profile verification; executable/profile paths, revision/config bytes, and store contents remain
runtime-only.

Each English/Japanese pair has separate IDs, paths, bytes, and digests and is semantically
equivalent. The manifest and its companion are siblings of, not members of, `bundleRoot`.
A candidate tarball and its digest are also outside this candidate-independent bundle.

#### ParticipantStudyDistribution

Each of the twenty `ParticipantStudyDistribution` roots is a fresh closed directory whose
complete direct-child set is exactly the two directories `study-inputs/` and `repository/`:

| Direct child | Complete contents |
|---|---|
| `study-inputs/` | Exactly the sixteen `StudyInputBundle` direct-child names and byte-for-byte copies; no nested directory or other member |
| `repository/` | Exactly the descriptor's `outputs[].path` regular files and the proper directory-prefix set implied by those paths |

The candidate and equipment/runtime are separately bound and are not distribution members.
No descriptor path can address `study-inputs/`; every stored `outputs[].path` is relative to
the `repository/` directory and omits that directory prefix. A top-level file, third
directory, other extra member, sidecar, cross-tree namespace collision,
symlink/non-regular member, hard-link or reused file identity within or across trees or
distributions, normalized, case-folded, or canonical-path alias, or root escape invalidates
all twenty distributions.

#### Participant fixture repository descriptor

The fixed members `evaluation-fixture.json` and `evaluation-fixture.ja.json` are the English
and Japanese `ParticipantFixtureRepositoryDescriptor` for the actual Repository tree
distributed to participants; they are not a loose fixture label or a reference to an
unclosed generator. Each is a fresh object with exact root-property order
`schemaVersion`, `descriptorLocale`, `distributionIds`, `materializer`, `verifier`,
`captureHarness`, `outputs`:

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versions fail closed |
| `descriptorLocale` | `en \| ja` | `en` only in `evaluation-fixture.json`, `ja` only in its companion; all operational fields are otherwise semantically and byte-for-byte equal |
| `distributionIds` | exact fixed string array | Exactly `participant-01` through `participant-20` in ascending order; these are study slots, not participant identity or personal data |
| `materializer` | `RepositoryArtifactBinding` | Exact repository-owned `scripts/build-usability-study-inputs.mjs` bytes |
| `verifier` | `RepositoryArtifactBinding` | Exact repository-owned `scripts/verify-usability-study-evidence.mjs` bytes |
| `captureHarness` | `RepositoryArtifactBinding` | Exact repository-owned `scripts/run-usability-study-capture.mjs` bytes |
| `outputs` | nonempty `ParticipantFixtureOutput[]` | Unique and sorted by raw UTF-16 code units of `path`; identical in both descriptors and defines the complete derived regular-file set |

Each `RepositoryArtifactBinding` is a freshly constructed object in exact order `path`,
`sha256`. Its `path` is the corresponding exact repository-relative literal above, names a
non-symlink regular file owned by the repository, and its `sha256` is 64 lowercase
hexadecimal characters over that file's exact raw bytes. The three bindings are mandatory;
an installed, downloaded, PATH-resolved, network-fetched, or digest-mismatched substitute is
never eligible to materialize or verify a distribution.

Each `ParticipantFixtureOutput` is a freshly constructed object in exact order `path`,
`contentEncoding`, `bytesBase64`, `sha256`:

| Field | Type | Rules |
|---|---|---|
| `path` | normalized `repository/`-relative path, stored without that prefix | Nonempty unique `/`-separated path with no absolute, backslash, empty, `.`/`..`, percent-encoded, or NUL spelling; it cannot address `study-inputs/`, and raw UTF-16 order is authoritative |
| `contentEncoding` | `utf-8 \| binary` | `utf-8` requires the represented bytes to decode as strict UTF-8; neither value authorizes normalization or transcoding |
| `bytesBase64` | canonical padded RFC 4648 base64 | Round-trips to the exact bytes written to every distribution; parse-equivalent text is insufficient |
| `sha256` | 64 lowercase hexadecimal characters | SHA-256 of the exact decoded `bytesBase64`, which must equal the materialized raw file bytes |

The two descriptors MUST have identical `distributionIds`, artifact paths/digests, output
paths, encodings, exact represented bytes, and output digests; only `descriptorLocale`
differs. The complete derived directory set is exactly the proper directory-prefix set
implied by `outputs[].path`, and the complete derived file set is exactly `outputs[].path`.
There is no generated sidecar, ignored file, implicit default, or unmanifested derived byte.

Exact `pnpm run study:evidence:inputs -- materialize` first verifies all three bound script
digests and then uses only the bound materializer to create one fresh closed distribution,
including both fixed namespaces, for each of the twenty fixed distribution IDs. Exact
`pnpm run study:evidence:verify -- inputs` independently verifies the three script bindings,
recomputes both descriptors, and read-only enumerates and hashes every actual distribution;
it never trusts a generated file list or digest emitted by the materializer. A missing or
extra file/directory, symlink, non-regular output, hard-link/file-identity alias, normalized,
case-folded, or canonical-path alias, encoding/base64 mismatch, byte/digest drift, unequal
distribution, script drift, or output outside the selected `repository/` root fails the
entire twenty-distribution set. No participant enrollment or evidence capture can begin
until a clean materialization and independent recomputation both pass.

### StudyEvidenceWorkspace

The executable protocol has five operational environment bindings. A required binding is read
exactly once by that command. Raw values are never evidence fields, logs, retained bytes,
validation-record values, evidence-digest or identity-commitment preimages, IDs, or output; the
sole hashing exceptions are the exact transient runtime-bootstrap, browser-proxy-binding, and
authenticated-control-message HMACs defined below:

| Binding | Rules |
|---|---|
| `INSPECTOR_STUDY_WORK_ROOT` | Absolute existing empty ordinary-local directory supplied by study setup at `materialize`; active-platform explicit UNC/server-share/device/network spellings fail before I/O, and the same lexical value, canonical location, type, and stable root identity are required through `finalize` |
| `INSPECTOR_STUDY_CONTROL_ENDPOINT` | External OS-local endpoint supplied by study setup: an absolute Unix-domain socket location outside the work/distribution roots, or a local Windows named-pipe name; TCP, IP, URL, remote-pipe, network, and work-root-sidecar spellings are rejected |
| `INSPECTOR_STUDY_CONTROL_TOKEN` | Exactly 43 unpadded base64url characters encoding 256 random bits; used only for challenge authentication over the external control endpoint |
| `INSPECTOR_STUDY_CANDIDATE_TARBALL` | Exact non-symlink regular candidate file outside the work root and every distribution with `nlink === 1`; required and read only from `start` through `finalize`, held to one stable identity and independently rehashed at every verifier phase and finalization |
| `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` | Exact runtime `127.0.0.1:<nonzero-port>` authority supplied by study setup; required only while capture is live, bound by the `study-browser` adapter at `start`, and closed at `stop`; no hostname, IPv6, zero port, URL syntax, credentials, path, query, or fragment |

The phase matrix is closed. “Required” means missing or malformed input fails before the
command's filesystem operation; “forbidden” means the command neither reads nor requires the
binding, even when the ambient environment happens to contain it:

| Exact command | Work root | Control endpoint | Control token | Candidate | Browser proxy authority |
|---|---:|---:|---:|---:|---:|
| `study:evidence:inputs -- materialize` | required | required | required | forbidden | forbidden |
| `study:evidence:verify -- inputs` | required | required | required | forbidden | forbidden |
| `study:evidence:capture -- start` | required | required | required | required | required |
| `study:evidence:capture -- checkpoint` | required | required | required | required | required |
| `study:evidence:verify -- checkpoint` | required | required | required | required | required |
| `study:evidence:verify -- continuation` | required | required | required | required | required |
| `study:evidence:capture -- stop` | required | required | required | required | required |
| `study:evidence:verify -- finalize` | required | required | required | required | forbidden |

The inputs executable accepts only canonical `materialize`; capture accepts externally only
canonical `start`, `checkpoint`, and `stop`; verifier alone accepts `inputs`, `checkpoint`,
`continuation`, and `finalize`. Internal modes are available only through current-parent-sponsored
inherited channels, never as command aliases. Wrong entrypoint, spelling, phase, or extra argument
fails before phase work.

The work root's retained layout is closed and lifecycle-additive:

```text
distributions/participant-01/ ... participant-20/
capture/streams/product-instrumentation.ndjson
capture/streams/inspector-server-ledger.ndjson
capture/streams/study-browser.ndjson
capture/study-capture-handoff.json
capture/study-capture-handoff.sha256
capture/study-continuity-witness.json
capture/study-continuity-witness.sha256
capture/study-capture-seal.json
capture/study-capture-seal.sha256
```

Each distribution has the exact two-directory layout above. Every stream ledger consists of
the compact canonical envelope line immediately followed by its compact canonical safe-payload
line for each sequence. The handoff pair appears only during checkpoint verification. The
continuity-witness pair and then the seal pair appear only after successful finalization. No
other retained artifact, control file, endpoint under the work root, retention handle, or
sidecar is allowed.

Exact materialization verifies the repository path, raw-byte digest, non-link regular-file
type, `nlink === 1`, and stable identity of the bound capture script, and then launches that
script's internal supervisor over an inherited anonymous IPC channel. After ready, the
materializer sends exact `StudySupervisorRuntimeBootstrap`, waits for its ACK, and only then may
mutate the empty root; authenticated lifecycle close detaches that edge while the supervisor
remains live. The supervisor binds the external local endpoint only from that bootstrap and is
the runtime holder of initial work-root identity, start-time candidate identity/digest, the
checkpoint snapshot, handoff anchor, its directly OS-observed adapter/orchestrator exits, the
accepted adapter-OS-observed watchdog exit attestations, and accepted moderator-OS-observed
reviewer exit attestations. `stop` terminates the six watchdog/capture processes and both
orchestrators but deliberately retains the supervisor. `finalize` authenticates
and verifies the complete continuity state, makes the supervisor close and remove the external
endpoint, independently proves that a new connection can no longer be made, and only then
writes the witness pair followed by the seal pair. No TCP listener, network request, remote
pipe, work-root socket/control artifact, PID file, lock file, or runtime filesystem sidecar is
permitted.

The authorized materialize caller/study setup also supplies exactly four distinct bidirectional,
nonrecording external terminal-equipment handles, mapped child-visible as descriptor `6`
participant, `7` moderator, `8` reviewer-one, and `9` reviewer-two. The materializer verifies
terminal type, pairwise-distinct stable equipment identity, and disabled echo/history/recording/
transcript state, inherits the four slots to the supervisor, and closes its own copies only after
runtime-bootstrap ACK. They are a closed external-equipment exception, not inherited IPC and not
environment/argv/path/evidence authority. Missing, aliased, reordered, extra, echoing, or
recording-capable equipment fails before retained mutation; bootstrap failure, abort, or crash
closes all copies and wipes pending buffers.

Node.js cannot prove that an otherwise ordinary lexical path is not backed by a pre-mounted or
mapped network filesystem. That case remains the documented FR-022 platform/environment
limitation and is never recorded as proven local; it does not weaken all observable identity,
containment, alias, or drift checks.

#### Study runtime bindings and identity commitments

`StudyRuntimeIdentityTuple` is an in-memory-only fresh object with exact property order
`platformClass`, `objectType`, `device`, `inode`, `typeBits`. `platformClass` is
`posix | windows`; `objectType` is `directory | regular-file`; and the remaining three values
are canonical nonnegative decimal strings from one BigInt `lstat` snapshot. The tuple contains
no path, timestamp, byte count, digest, PID, or OS handle. Every command obtains a fresh tuple
and the supervisor compares it with the stored initial tuple and the separately required
lexical and canonical values.

The runtime-only `StudyWorkRootBinding` has exact order `workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `studyInputManifestSha256`. The runtime-only
`StudyFullBinding` has exact order `workRootLexicalValue`, `workRootCanonicalValue`,
`workRootIdentity`, `candidateLexicalValue`, `candidateCanonicalValue`, `candidateIdentity`,
`candidateSha256`, `studyInputManifestSha256`. Raw work-root values may cross only exact
materializer input, the one `runtime-bootstrap` frame, runtime control, and supervisor dedicated
memory. Raw candidate values may cross only the authorized post-input/pre-start candidate-store
provisioner's transient input, authorized start-or-later caller input, runtime control, and
supervisor dedicated memory, and never enter runtime-bootstrap or the provisioned store. They never cross
capture-evidence IPC and are never committed, retained, logged, or returned. Their sole hash uses
are the non-retained authentication tags over those exact permitted frames/requests; they never
enter an identity commitment or evidence digest. `verify-inputs` accepts only
`StudyWorkRootBinding`; every start-through-finalize
command accepts `StudyFullBinding`, so materialization and input verification cannot
accidentally inspect candidate state.

While capture is live, `StudyLiveBinding` has exact order `runtimeBinding`,
`browserProxyAuthority`, where `runtimeBinding` is exact `StudyFullBinding` and the authority is
the current exact `127.0.0.1:<nonzero-port>` value. It is runtime-only and receives all the same
non-retention/non-hashing treatment as raw path values. Start through stop commands require it;
finalize accepts only `StudyFullBinding` and must not read the proxy binding after stop. Raw proxy
authority follows exactly `authorized start-through-stop caller transient input -> authenticated
runtime-control StudyLiveBinding -> supervisor dedicated memory -> exact one-use browser-proxy-
binding -> study-browser-adapter dedicated memory -> attempt-local DevTools control request/
browser context`. Caller/transfer/control-request buffers are wiped immediately after response/
ACK. Supervisor and adapter retain only dedicated run-level copies through stop; attempt-local
request bytes and browser auth cache are destroyed with the context on normal close, abort,
crash, or terminalization. It never enters runtime-bootstrap, Chromium environment/argv/profile,
evidence, another holder, another hash/preimage, or a retained artifact. The browser context is
the sole equipment-side raw-authority exception.

The complete allowed secret/raw-authority HMAC preimages are the exact runtime-bootstrap frame,
browser-proxy-binding frame, authenticated runtime-control request, inherited-IPC frame,
domain-separated identity commitment, and proxy-marker-install frame specified here. Each
contains only the values its schema requires and is transient. No raw authority enters any other
digest, commitment, tag preimage, or encoded ID.

`StudySupervisorRuntimeBootstrap` is runtime-only with exact root order `schemaVersion`,
`workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`,
`controlToken`. Version is literal `1`; identity is an exact fresh current
`StudyRuntimeIdentityTuple`; endpoint is the exact absent local authority; and token is canonical
43-character unpadded base64url text strictly decoding to 32 fresh bytes. It occurs exactly once
only materializer-to-supervisor after ready and before any root mutation. The supervisor
independently revalidates root values/current identity, endpoint authority/absence, and token,
creates stable session/continuity state, binds the endpoint, then ACKs. Transfer buffers are wiped
after ACK; failure tears down the supervisor/endpoint and authorizes no retained mutation.

`StudyBrowserProxyRuntimeBinding` is runtime-only with exact root order `schemaVersion`,
`studyRunId`, `browserProxyAuthority`. Version is literal `1`; run is current; authority is exact
`127.0.0.1:<1..65535>`. After adapter and watchdog registrations, the supervisor sends it once
only to study-browser-adapter; the adapter validates/binds and ACKs before start control or
capture-start. Transfer buffers are wiped, dedicated copies survive only through stop, and every
checkpoint/continuation authority must equal the supervisor copy.

`StudyStreamWriterRuntimeBinding` is path-free and runtime-only with exact root order
`schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `captureComponentRunId`,
`captureInstanceId`, `captureProcessRunId`, `writerFileIdentity`, `writerLinkCount`,
`writerOpenMode`. Version is literal `1`; session/run/stream are current; the three capture IDs
equal the matching adapter ready/self-registration identities; `writerFileIdentity` is exact
path-free `StudyRuntimeIdentityTuple` for the regular stream file; link count is literal `1`; and
open mode is literal `append-only`. No path, descriptor, handle, authority, or retained value is
present.

Per stream, adapter ready plus self-registration and supervisor ACK precede the supervisor's
one-use `stream-writer-binding`. The adapter verifies its IDs/descriptor `5`, relays the binding
byte-identically, and withholds upstream ACK. The watchdog verifies IDs, stable fd-5 regular-file
identity, `nlink === 1`, and append-only authority, ACKs the binding, then sends self-registration.
Only after downstream binding ACK may the adapter ACK upstream, ACK/forward the watchdog
registration, and close its fd-5 copy; the supervisor ACKs that registration and closes its copy.
Browser-proxy-binding follows only after both browser registrations are supervisor-ACKed and
requires adapter ACK. All three binding barriers, all six registrations, and browser-proxy ACK
precede stream start/capture-start/start completion.

At supervisor creation, a fresh 256-bit `continuityKey` is held only in supervisor memory. The
64-lowercase-hex `workRootIdentityCommitment` and `candidateIdentityCommitment` are
domain-separated HMAC-SHA-256 values over the exact canonical identity tuple and
`controlSessionId`; their preimages contain no lexical or canonical path. The work-root
commitment is fixed at materialization and the candidate commitment at start. The raw token,
authentication key material, continuity key, identity tuple, raw bindings, and the mapping to
commitments are never retained or emitted and are zeroed/dropped when finalization closes the
supervisor.

`StudyOpaqueId` is the sole grammar for every opaque study identifier: exactly 43 ASCII
characters matching `[A-Za-z0-9_-]{43}`, with no `=` padding, whose strict base64url decode is
exactly 32 bytes and whose canonical unpadded re-encoding is byte-for-byte equal to the input.
Each newly allocated semantic ID is generated from 32 fresh cryptographically random bytes and
is distinct from every other allocated ID in the current run. Fresh cryptographic generation
provides cross-run non-reuse and unlinkability; the verifier checks exact uniqueness only within
the current run and keeps no retained cross-run registry. A
schema-required reference to the same semantic ID repeats that exact value and is not a new
allocation. This grammar applies to `requestId`,
`controlSessionId`, `challengeId`, `studyRunId`, `checkpointRequestId`, `eventId`,
`correlationId`, `browserAttemptId`, `subjectId`, `preReadinessProbeId`, `bootstrapEventId`, `readinessEventId`,
`inspectorProcessId`, `componentRunId`, and every watchdog/capture instance or process-run ID. A field whose closed
union permits literal `not-applicable` treats that literal
as a separate non-ID variant. The control token uses the same canonical 32-byte/43-character
encoding grammar, and every HMAC-SHA-256 `authenticationTag` is the canonical unpadded
base64url encoding of its exact 32 output bytes. Wrong length, padding, non-alphabet character,
noncanonical encoding, wrong decoded length, duplicate allocation, or cross-purpose reuse fails
closed.

#### Study control protocol

The supervisor generates one fresh opaque `controlSessionId`. External control uses only an
OS-authenticated local Unix-domain socket or local Windows named pipe. Every command performs
an exact hello/challenge exchange. `StudyControlRequest` has exact root order
`schemaVersion`, `requestId`, `command`, `controlSessionId`, `challengeId`,
`authenticationTag`, `payload`; `StudyControlResponse` has exact root order `schemaVersion`,
`requestId`, `command`, `controlSessionId`, `challengeId`, `ok`, `errorCode`,
`authenticationTag`, `payload`. Version is literal `1`; unknown,
missing, extra, reordered, noncanonical, oversized, truncated, or trailing data fails closed.

The fixed command enum is `hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`.
Every `requestId` is a fresh run-local 43-character base64url token. A `hello` request has null
session, challenge, authentication tag, and payload. Its response repeats request ID/command
and returns the session ID and a fresh 43-character base64url `challengeId` plus an
authentication tag. Every non-hello request repeats that
session/challenge and authenticates
the direction- and domain-separated canonical request bytes with `authenticationTag` set to
null, including the exact canonical payload bytes, under HMAC-SHA-256 with the decoded control
token. This is the
sole transient hash preimage allowed for raw path-bearing control values; no tag is retained.
The response repeats request ID/command/session/challenge and authenticates its complete
canonical bytes with `authenticationTag` set to null in the opposite direction. A challenge is
single-use across accepted, rejected, malformed, disconnected, and replayed requests; a new
hello is required for every command. Tokens and tags are compared in constant time. They are
never placed in argv, files, evidence, logs, or errors; the sole child-environment use is the
exact start-through-stop participant Inspector product-probe binding described below; the
study-browser adapter strips it before direct Chromium spawn.

`errorCode` is the closed enum `none | malformed-message | authentication-failed |
challenge-replayed | command-not-allowed | payload-invalid | binding-mismatch |
state-mismatch | runtime-control-unavailable`. `ok: true` requires `errorCode: none`; `ok: false`
requires exactly one non-`none` code and null payload. No code exposes which token, path,
identity component, raw field, or child detail failed. Command payloads are closed as follows:

| Command | Request payload | Successful response payload |
|---|---|---|
| `hello` | null | null |
| `verify-inputs` | exact `StudyWorkRootBinding` | `workRootIdentityCommitment`, `runtimeControlReady: true` |
| `start` | exact `StudyLiveBinding` | exact root order `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `processes`, `orchestrators`; six fixed stream identities and two fixed orchestrator identities |
| `checkpoint` | exact `StudyLiveBinding` | fresh `checkpointRequestId` after the supervisor stores the immutable three-stream snapshot |
| `read-checkpoint` | exact `StudyLiveBinding` | unmodified supervisor-owned checkpoint snapshot; creates no handoff bytes |
| `anchor-handoff` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | fixed three-stream anchor positions after all three sole writers append |
| `verify-continuation` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | the three stored anchor positions |
| `stop` | exact `liveBinding`, `checkpointRequestId`, `handoffSha256` | null only after three exact stop results, three directly OS-observed adapter exits, three accepted adapter-OS-observed watchdog exit attestations, two directly OS-observed orchestrator exits, zero live reviewer, and browser-proxy closure |
| `finalize-prepare` | exact `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | null after independent current-state checks complete and complete witness material is ready while endpoint remains live |
| `finalize-commit` | exact `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | exact `StudyContinuityWitness` only over the authenticated existing connection after listener teardown begins |
| `abort` | null | null after destroying live children, endpoint, keys, raw bindings, and in-memory continuity state without witness or seal |
| `register-pre-readiness-probe` | exact `studyRunId`, `subjectId`, `bootstrapProof` | one fresh runtime-only `preReadinessProbeId` |
| `buffer-pre-readiness-product-event` | exact `preReadinessProbeId`, sole `destinationRole: product-instrumentation`, exact `StudyPreReadinessProductObservationDraft` | null after validating and storing the draft in order |
| `register-product-probe` | exact `studyRunId`, still-open `preReadinessProbeId`, readiness proof, requested destination-role set | one fresh `inspectorProcessId` only after candidate-owned handshake succeeds and the readiness-bound buffer is released, acknowledged, and destroyed |
| `submit-product-event` | exact outer registered `inspectorProcessId`, `destinationRole`, and one closed payload variant: canonical safe observation, or exact `StudyServerCorrelationClaim` only for `inspector-server-ledger` | null after routing a safe observation once to its selected adapter/watchdog or a server claim once to the in-memory broker |
| `close-product-probe` | exact `inspectorProcessId` | null after the registered probe can submit no later event |

The start `processes` array contains exactly six entries in fixed stream order and, within each
stream, watchdog then capture; exact entry order is `streamRole`, `processRole`, `instanceId`,
`processRunId`. Its separate `orchestrators` array contains exactly `study-harness`, then
`scoring-moderator`; exact entry order is `processRole`, `componentRunId`. Component IDs equal
the authenticated ready frames. Neither array admits an OS PID, reviewer, extra, duplicate, or
reordered entry.

Here `runtimeBinding` is exact `StudyFullBinding`; `liveBinding` is exact `StudyLiveBinding`; and
`destinationRole` is exact `product-instrumentation | inspector-server-ledger`; each is nested
and fresh with no other field. `bootstrapProof` is exact `StudyPreReadinessBootstrapProof` with
root order `schemaVersion`, `productId`, `bootstrapEventId`; its values are literal `1`, literal
`agent-customization-inspector`, and one fresh one-use opaque ID. `readinessProof` has exact root
order `schemaVersion`, `productId`, `readinessEventId`, with literal `1`, literal
`agent-customization-inspector`, and one fresh one-use opaque ID. The register-product request
must carry the exact still-open `preReadinessProbeId` belonging to the same run, subject, and
bootstrap. `requestedDestinationRoles` is a nonempty duplicate-free subset of
`product-instrumentation`, `inspector-server-ledger` in that fixed order. The ID is never placed
in environment, argv, application code, evidence, a digest, or output.

For `buffer-pre-readiness-product-event`, the destination is the sole literal
`product-instrumentation` and the payload is only the exact closed draft defined below; a server
claim or any other safe variant is invalid. A post-readiness safe-observation payload's process
ID equals the registered
outer ID. A claim payload is accepted only for one already-pending browser candidate; its outer
ID still equals and authenticates the registered probe, while its subject/process fields are the
registered IDs and its actor is exactly `participant | bundled-spa`; N/A claim IDs and every
other actor are invalid. The supervisor sends a claim only to the broker and never directly
to a watchdog. Unknown, duplicate, replayed, post-bind, wrong-run/subject/ID/destination,
raw-bearing, mutated, or reordered pre-readiness input fails closed. Probe commands are valid
only after start and before their
close/stop, use a fresh hello/challenge for every request, carry no raw observation, and never
select `study-browser`. A command rejected before its lifecycle phase has `ok: false` and null
payload. There is no free-form error payload. `finalize-commit` is accepted exactly once after a
successful `finalize-prepare`; any failure before commit leaves the endpoint available for
fail-closed retry or `abort`. During finalization the authenticated existing connection may
return the witness after the listener and Unix socket path have been removed or Windows pipe
acceptance has stopped; the verifier requires endpoint reconnection failure before persisting
evidence.

#### StudyInheritedIpcFrame and binary bootstrap

Every internal channel uses the owning contract's exact inherited-IPC protocol. The closed role
enum is `materializer | supervisor | study-harness | scoring-moderator | reviewer-one |
reviewer-two | product-instrumentation-adapter | inspector-server-ledger-adapter |
study-browser-adapter | product-instrumentation-watchdog | inspector-server-ledger-watchdog |
study-browser-watchdog`. Each allowed parent/verified-child edge owns exactly two fresh
unidirectional anonymous inherited pipes, parent-to-child and child-to-parent. The parent-to-child
pipe begins with exactly 96 bytes in order `channelSeed` (32 fresh bytes), `bootstrapNonce` (32
fresh bytes), `channelId` (32 fresh bytes), then switches to LF-framed parent-to-child messages.
The child consumes exactly 96 bytes before frame parsing; later bytes cannot be bootstrap and are
the first following canonical frame or remain pending. EOF/parent close before byte 96 is a
truncated-bootstrap failure, and malformed/trailing bytes after the prefix fail as frames. None
may enter environment, argv, a file, endpoint, log, output, or evidence.

The role/edge/type matrix is closed:

| Parent | Child | Parent-to-child types | Child-to-parent types |
|---|---|---|---|
| `materializer` | `supervisor` | `runtime-bootstrap`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-harness` | `attempt-binding`, `terminalization-decision`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `scoring-moderator` | `scoring-context`, `acknowledgement`, `lifecycle` | `ready`, `workflow-outcome`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-one` or `reviewer-two` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-browser-adapter` | `browser-proxy-binding`, `stream-writer-binding`, `attempt-binding`, `proxy-marker-install`, `participant-navigation-grant`, `browser-broker-decision`, `safe-payload`, `workflow-outcome`, `terminalization-decision`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `browser-request-candidate`, `attempt-terminalization`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `supervisor` | `product-instrumentation-adapter` or `inspector-server-ledger-adapter` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| each `*-adapter` | its matching `*-watchdog` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |

No harness-to-browser-adapter edge exists. `workflow-outcome` carries only exact
`StudyWorkflowOutcomeSubmission`: moderator to supervisor, then supervisor to browser adapter;
the adapter alone converts it to a canonical workflow payload and uses `safe-payload` on its
watchdog edge. No other message type is reused for that transport. On the supervisor-to-browser-
adapter edge, `safe-payload` is only an exact canonical nonworkflow browser-observation variant
constructed by the supervisor broker from a validated/stored matching candidate and current-context
decision, using the complete observation-payload root below, literal `eventCode: observation`,
and nonworkflow `observationClass`. It cannot carry workflow/product/server data or bypass candidate state; the adapter
validates the binding and never derives a workflow tag. A blocked candidate is validated/stored
but never accepted; only a forwarded candidate's `candidate-forward` is acceptance.

`StudyInheritedIpcFrame` has exact root order `schemaVersion`, `channelId`, `sequence`,
`direction`, `senderRole`, `receiverRole`, `messageType`, `authenticationTag`, `payload`.
Version is literal `1`; direction is `parent-to-child | child-to-parent`; each direction's
nonnegative safe-integer sequence starts at `0` and increments exactly one; and payload is the
exact schema selected by the matrix. Direction keys are exactly:

```text
K_parent_to_child = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId ||
  ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)
K_child_to_parent = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId ||
  ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)
```

The first child-to-parent frame is `ready` at sequence `0` with exact payload order
`schemaVersion`, `bootstrapNonce`, `componentRunId`. After it authenticates, seed and nonce are
wiped. For each frame the sender reconstructs the compact canonical no-LF frame with tag null;
the HMAC preimage is exact `ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00
|| canonicalFrameBytes`. The corresponding direction key produces the canonical 43-character
tag; populated compact JSON plus one LF is the sole wire form. Validation is constant-time and
precedes payload/state action. Acknowledgement payload order is `schemaVersion`,
`acknowledgedSequence`, `result`, with literal result `accepted`; lifecycle payload order is
`schemaVersion`, `event`, with event `close | abort | child-exit`.

Only on materializer-to-supervisor, parent-to-child sequence `0` is the sole
`runtime-bootstrap` after ready. Its ACK is returned only after full validation, stable session/
continuity creation, and endpoint bind; only that ACK permits root mutation. Successful
authenticated lifecycle close then detaches/wipes the materializer edge without stopping the
supervisor; failure/abort tears down both. Parent-to-child acknowledgement on moderator, adapter,
and watchdog edges may acknowledge only the immediately preceding valid child-to-parent
`process-lifecycle-attestation` sequence. It cannot acknowledge candidate, terminalization,
workflow, vote, ready, stream result, or another message. Watchdog registration ACK precedes
upstream relay; supervisor registration ACK precedes start; watchdog exit ACK precedes adapter
exit; reviewer exit ACK precedes outcome.

On supervisor-to-study-browser-adapter, child-to-parent `acknowledgement` of
`workflow-outcome` is the mandatory semantic response for that exact accepted sequence and may
be sent only after matching watchdog safe-payload ACK. A next context/binding/lifecycle/control
frame is never implicit acknowledgement; wrong, missing, premature, duplicate, or cross-type ACK
invalidates. This does not widen the parent-to-child attestation-only rule above.

Every named payload-bearing message carries the exact correspondingly named canonical record
below without a wrapper; `stream-writer-binding` carries exact
`StudyStreamWriterRuntimeBinding`. `StudyBrowserBrokerDecision`, the sole `browser-broker-decision`
payload, has exact root order `schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`,
`decision`; version is literal `1` and decision is `candidate-forward | browser-only-released | joined-pair-released`.
Candidate-forward/joined-pair-released require the current non-N/A browser-attempt ID. Browser-
only-released uses the current ID for a valid-marker bound candidate and N/A only for missing/
invalid-marker unrelated candidate with derived subject/process IDs also N/A. Eligible forwarding
uses candidate-forward exactly once while the validated/stored candidate is pending and its
canonical grant remains armed; committing that sole acceptance/authorization atomically changes
the grant armed to consumed before forwarding. A blocked
candidate uses browser-only-released exactly once after its browser adapter/watchdog downstream
ACK as its mutually exclusive terminal path; a forwarded candidate uses joined-pair-released
exactly once after join and both payload downstream ACKs.
Duplicate, skipped, reordered, wrong-state, or reused decisions fail.

`StudyProcessLifecycleAttestation` has exact root order `schemaVersion`, `processRole`,
`streamRole`, `componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`.
Version is `1`; process role is one named adapter, matching watchdog, or reviewer slot. Adapter/
watchdog stream and fresh instance/process IDs match its prefix and uninterrupted envelopes;
reviewer uses stream/instance/process literal `not-applicable`; component ID always equals ready.
Event is `registered | exited`; registered requires null/null exit fields, and accepted clean exit
requires `0`/null with byte-identical registered identities. Adapter ready/self-registration and
supervisor ACK precede writer-binding relay; only after the watchdog ACKs that binding does its
self-registration go to the adapter and get ACKed/relayed to the supervisor. Adapter constructs watchdog exit only after direct OS child observation; moderator
constructs each reviewer registered/exit attestation from ready/direct OS child observation. No
self/sibling exit attestation exists. Nonclean child exit uses lifecycle child-exit and invalidates.

`StudyStreamControl` exact root order is `schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`.
Immutable binding values repeat start; command is `start | checkpoint | anchor-handoff | stop`;
start uses literal `not-applicable` for both final fields, checkpoint uses its fresh ID and literal
`not-applicable` digest, and anchor/stop use the exact current ID/digest.
`StudyStreamControlResult` exact root order is `schemaVersion`, `controlSessionId`, `studyRunId`,
`streamRole`, `command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256` and
reports the matching actual first-heartbeat, immutable checkpoint, anchor, or terminal-stop
position/digest. Result checkpoint ID is literal `not-applicable` for start, the fresh ID for
checkpoint, and the exact current accepted ID for anchor-handoff/stop; no other N/A is allowed.
Adapter relays control/result byte-identically and cannot act, synthesize, or
mutate. Result is the semantic response, never a generic ACK.

Both `attempt-terminalization` and `terminalization-decision` carry byte-identical exact
`StudyAttemptTerminalization` root order `schemaVersion`, `studyRunId`, `browserAttemptId`,
`subjectId`, `inspectorProcessId`, `cause`. Version is `1`; process ID may be `not-applicable`
before readiness; cause is `product-exit | browser-exit | equipment-failure |
premature-probe-close`. Harness is never a terminalization source. Supervisor is sole participant
launch controller/OS child observer and derives product-exit only from that child wait; a child
exit before bound bootstrap is exclusively product-exit. Study-browser-adapter directly owns/
observes Chromium child/context: browser-exit means their actual exit; equipment-failure means
external browser/bootstrap/environment failure while adapter/proxy/DevTools controller/marker/
IPC/implementation are healthy. Internal proxy/controller output, DevTools/auth/marker/IPC/
implementation, adapter, or watchdog fault cleans up and invalidates with no synthesis.
Authenticated probe close/EOF is serialized with OS child state: already exited means product-
exit, still live before four outcomes means premature-probe-close, and after four outcomes plus
zero join it is normal. First valid committed cause wins; later races are rejected. Supervisor
fans out the byte-identical decision to harness and browser
adapter. The adapter cleans browser/grant/marker/reservation/candidate/pending state but retains
its terminalizing binding; the harness retains its terminalizing binding/fixed schedule until the
moderator/supervisor finish four outcomes and closed-snapshot dual ACK destroys both. No payload admits a wrapper, free-form detail, raw case, or alternate
variant.

Truncated bootstrap, role, edge, type, channel, direction, property/order, tag, duplicate,
skip, replay, trailing/partial bytes, late frame, or child exit closes the channel, fails the run,
and releases no partial routed value. Close, abort, crash, child exit, or authentication failure
wipes direction keys, buffered frames, and replay/sequence state. The control token, continuity
key, marker secret, or another channel seed/key is never reused. Within inherited capture IPC,
only this transient frame HMAC, including the exact marker-install frame where applicable, may
authenticate its runtime secret payload; frame bytes/tags are not capture evidence or another
digest input. The complete cross-protocol HMAC-preimage set remains the exact set enumerated
above, and no other preimage is allowed.

#### Study harness executable closure

Each of `scripts/build-usability-study-inputs.mjs`,
`scripts/run-usability-study-capture.mjs`, and
`scripts/verify-usability-study-evidence.mjs` is a self-contained single-file literal Node.js
program. It may statically import only `node:` built-ins. Repository-local or package imports,
dynamic import, CommonJS `require`, `createRequire`, `eval`, `Function`, `node:vm`, worker or
cluster entrypoints, downloaded/PATH-resolved helpers, and alternate child entry files are
forbidden. The internal exception is identity- and digest-verified execution of the exact capture
script: materialization may start its supervisor over inherited anonymous IPC, and that capture
script may re-execute only its own verified file through exact `process.execPath` in the closed
internal modes `supervisor`, `study-harness`, `scoring-moderator`, `reviewer-one`, `reviewer-two`,
the three named adapters, and the three matching watchdogs, with authentication material carried
only by inherited IPC. Each internal invocation requires a channel sponsored by its current
verified parent plus fresh nonce; unsponsored/replayed invocation fails and cannot join the
current endpoint/session/channel-key namespace. This capability does not purport to identify a
same-user process that deliberately creates a distinct emulated run.

The only external-equipment execution exceptions are: the supervisor directly spawns without a
shell the exact participant `npx --no-install agent-customization-inspector --no-open` closure in
the verified subject repository while the capture script is the sole exact NODE_OPTIONS import;
and study-browser-adapter directly spawns only the identity/digest-verified pinned Chromium
binary/profile. Neither participant `npx`/Inspector nor Chromium is an internal capture-script
mode, and no other helper/import/package/child closure is authorized.

The process tree is exact. Materialization launches one long-lived supervisor. At start the
supervisor launches, in order, one long-lived study harness, one long-lived scoring moderator,
and the product, server-ledger, and browser adapters; each adapter launches exactly its matching
watchdog before ready. This yields exactly eight long-lived internal descendants: two
orchestrators plus six stream processes. Watchdogs are adapter children, not direct supervisor
children; attempt-local participant and Chromium children are external equipment outside the
eight. Supervisor passes descriptors `7`/`8`/`9` to moderator in those slots and closes its
copies, while retaining `6` for participant ingress. For each reviewed
failure only, the moderator launches fresh reviewer-one then reviewer-two one-use vote collectors,
waits for both ready and both supervisor-ACKed registered attestations, sends byte-identical safe
cases, accepts the hidden first vote then the second, directly observes both clean exits, and
waits for both supervisor-ACKed exit attestations before outcome. It launches none for success or valid
automatic-link failure. Stop requires no live reviewer/case/attempt/join, closes harness then
moderator then adapters in fixed stream order, and each adapter closes/observes its watchdog
before sending its watchdog clean-exit attestation and receiving supervisor ACK, then exits. The
supervisor directly observes three adapter and two orchestrator exits and uses three accepted
adapter-OS-observed watchdog exit attestations for the remaining long-lived facts; it remains
until finalize. Wrong parent/order/cardinality, reuse, extra process, nonzero/signalled exit, or
evidence harness/orchestrator/adapter/watchdog/reviewer failure invalidates the run and produces no
synthesized workflow outcome.

The supervisor securely creates each exact stream file and one append-only handle at start.
Child-visible descriptor `3` is parent-to-child read IPC, descriptor `4` child-to-parent write IPC,
and descriptor `5` is the matching evidence-writer append handle only in adapter/watchdog modes;
descriptor 5 is absent/closed for all other roles and is not a third IPC channel. It is the sole
required non-IPC inheritance exception and appears only in exact supervisor-to-adapter-to-matching-
watchdog spawn mapping. Adapter verifies/passes descriptor 5 unchanged without read/write/seek/
duplication and closes its copy only after downstream writer-binding ACK plus watchdog registration
relay; supervisor closes its copy after upstream registration ACK. Watchdog registration requires
the binding's matching stable file identity, `nlink === 1`, and append-only authority, then
watchdog is sole holder/writer. Extra duplicate/read/write/seek/retain authority is forbidden.
Stop result precedes handle close and clean exit. Wrong/readable/swapped/extra/
missing handle, adapter access, identity drift, or path/cwd/environment/argv leakage invalidates.

At materializer-to-supervisor launch, sanitized ordinary equipment `PATH` is fixed to exactly the
identity-pinned `npx` launcher bin plus one reserved, initially empty candidate-launch-store bin
slot outside the work root, every distribution, control endpoint, and browser profile. That same
fixed slot is inherited by the supervisor; materialize and inputs neither read nor require its
contents. After successful `verify -- inputs` and before capture start, authorized study setup
provisions the store into that already reserved slot. Provisioning uses only the exact candidate tarball plus frozen
production dependency graph, with network and lifecycle scripts disabled, and binds the exact
package/bin/runtime payload identities and digests to the candidate digest. It also provides one
identity/digest-verified pinned `npx` launcher. Start makes the supervisor resolve only those
inherited fixed PATH slots and independently reverify the store/launcher against the candidate
digest; no new environment variable, control field, path frame, or post-materialize store path is
accepted. Each participant child receives that same exact two-entry sanitized `PATH`, so
`npx --no-install` can resolve only the candidate.
Raw tarball lexical/canonical authority never reaches the child, and distribution bytes or
`node_modules` are never changed. Missing/extra/cache/network/install/global/PATH fallback or
substitution fails. Store path/identity/handles are runtime equipment only, never evidence/log/
output/ID/retained digest material; stop, finalize, abort, and crash destroy the store and block
completion until absence is verified. Provisioning is outside the eight internal descendants.

The supervisor is sole participant-launch controller and OS observer. After attempt preparation,
it enables nonrecording terminal descriptor `6` for exactly one LF-terminated ASCII line
`npx --no-install agent-customization-inspector --no-open`, revalidates the subject distribution,
and directly spawns without a shell in that exact `repository/` cwd. The child environment is
the fixed product environment plus audited `PATH`, exact
`NODE_OPTIONS=--import=<verified-capture-script-file-URL>`, exact control endpoint/token, and
minimum safe run/subject context only. Candidate/proxy authority, browser attempt ID, internal
channel state, or another study value enters neither argv/environment/terminal. The command
buffer is wiped after spawn; supervisor owns the child handle/wait. After normal/terminal close,
child exit, abort, or crash it closes the child view, drains/resets fd6, wipes pending input/output,
and proves no prior bytes/history/context before fixed-surface reuse; participant process/probe
context is always fresh. No Inspector-process ID is preassigned or placed in the environment.

The single-file capture script's product-probe mode attaches to the candidate-owned fixed optional
readiness handshake in the packaged `dist/cli.mjs` entry.

Before candidate module-body evaluation, the imported code transiently verifies the bound
candidate bootstrap identity, immediately discards raw identity material, and registers exact
`StudyPreReadinessBootstrapProof`. The supervisor creates one runtime-only
`StudyPreReadinessProductBuffer` with exact root order `schemaVersion`, `studyRunId`, `subjectId`,
`preReadinessProbeId`, `state`. Version is literal `1`; IDs are the current/fresh safe values;
state is exactly `open | readiness-bound | terminalization-bound | destroyed`, one-way from open
to either bound state and then destroyed. The probe ID is module-private and runtime-only.

`StudyPreReadinessProductObservationDraft` has the same complete root order as the canonical
observation payload: `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`,
`inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `originClass`, `effectClass`, `workflowClass`,
`outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`,
`productAttributable`, `prohibited`. Version/event are `1`/`observation`; event/correlation are
fresh transient IDs; subject is current; process, workflow, automatic, and review fields are
literal `not-applicable`; outcome is `observed`; and the remaining tuple is one closed
product-instrumentation observation row. A draft is neither evidence nor a server claim.

Before any observable or prohibited pre-readiness effect continues, the hook safely classifies
the event, immediately discards all raw values, submits exact
`buffer-pre-readiness-product-event` to sole destination `product-instrumentation`, and waits for
ACK. No such effect continues before ACK. The supervisor validates and stores accepted drafts in
exact order without hashing, routing, or retaining them as evidence; an abrupt target exit does
not erase acknowledged drafts.

On exact candidate-owned readiness, `register-product-probe` includes the open
`preReadinessProbeId`. The supervisor changes the buffer to `readiness-bound`, generates a fresh
`inspectorProcessId`, reconstructs fresh canonical payloads in stored order using fresh evidence
event/correlation IDs and that process ID, routes each to product-instrumentation, and waits for
adapter ACKs. It destroys even an empty buffer before the acknowledged attempt-open flow and the
readiness response. The response stays blocked through every buffer release ACK and destruction,
both open-binding ACKs, and moderator ACK of the discovery context; only then does it return the
process ID/readiness, and only afterward may grant/navigation/task activity begin. On pre-
readiness terminalization it changes the buffer to
`terminalization-bound`, reconstructs and releases every draft in order with process ID
`not-applicable`, waits for all ACKs, and destroys even an empty buffer before the terminalization
decision and synthesized workflow outcomes.

A canonical product-attributable observation may carry `inspectorProcessId: not-applicable`
only when released from this same-run/same-subject `terminalization-bound` buffer before any
readiness, with workflow `not-applicable`. Every `readiness-bound` release uses the newly assigned
non-N/A ID. Any other product-attributable N/A row, including one after readiness, is invalid.

After readiness, every later safe observation uses a distinct `submit-product-event`; a
browser-origin server correlation uses that command's exact `StudyServerCorrelationClaim`
variant, with the registered ID only in the outer authentication field. The probe closes the ID
on orderly Inspector exit. It is neither an adapter nor a watchdog and writes no evidence.
Before minting readiness proof it verifies that the call came from the bound candidate's fixed
bootstrap identity at the required pre-server/pre-browser point, discards raw call-site/path
material, and prevents a helper or wrapper from minting proof by directly calling the global
symbol.

A helper or unrelated process without that exact bootstrap identity never registers and
discards local data with zero evidence. An expected participant child directly observed by the
supervisor exiting before reaching the bound bootstrap is exclusively pre-readiness product-exit
and four reviewed failures; no
candidate-body effect was possible. Once the bound bootstrap is reached, module-body evaluation
is blocked until registration ACK. Identity, registration, or ACK failure then invalidates the
run with the body unevaluated. Buffer-ACK failure, missing/wrong/duplicate readiness, direct or
duplicate probe installation, changed self-import bytes, raw IPC, binding mismatch, or
duplicate/replayed/mutated/post-bind draft also invalidates the run and permits no synthesis.

The study-browser adapter strips `NODE_OPTIONS`, both control bindings, both safe-context
bindings, candidate authority, and inherited internal IPC before direct Chromium creation; proxy
authority reaches only the attempt-local DevTools request/context route. Probe
path/options/environment and rejected non-target data remain runtime-only and unretained.
Contract and integration tests exercise actual pinned `npx --no-install` resolution through only
the audited candidate-launch store, target readiness, pre-readiness buffering,
non-target discard, helper stripping, missing/tampered probe behavior, and all product/server
observation surfaces.

Workflow terminals never use a study-control command, `submit-product-event`, proxy request path,
or product/server destination. The scoring moderator owns the sole call-local raw response,
timing, ground-truth, and rubric boundary and reads them only from external terminal-equipment
descriptor `7`. After the matching open context is delivered and its workflow display completes,
it enables exactly one LF-terminated compact canonical UTF-8 JSON `StudyModeratorInput` with
exact root order `schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`,
`workflowClass`, `response`, `timing`, `groundTruth`, `rubric`. Version is `1`; IDs/workflow
match the open context; process ID is non-N/A; timing is a canonical nonnegative decimal string;
and response/groundTruth/rubric are canonical JSON strings whose contents are call-local raw
values. Unknown/extra/reordered/noncanonical input, CR/extra line, EOF, replay, duplicate, or
cross-context ID/workflow fails. Echo/history/recording/transcript/log/retention/other-surface
routing is forbidden. After safe outcome construction, moderator wipes record/parsed raw values,
disables input, and drains/resets fd7; abort/crash/terminalization wipes partial bytes.

Each normally completed workflow requires exactly one record. Terminalization-synthesized
remaining workflows read no record; any input for a synthetic/closed/already accepted workflow is
late/cross-context and fails. The accepted prefix has consumed one record per normal workflow,
and no empty/default raw value is invented for synthetic rows. The moderator may hold at most one runtime-only
`StudyCurrentSubjectScoringContext`. Its exact root order is `schemaVersion`, `studyRunId`,
`subjectId`, `inspectorProcessId`, `workflowClass`, `automaticIssueCorrelationId`,
`terminalizationClass`, `state`. Version is literal `1`; IDs/workflow are the current safe values; the automatic field is initially
`not-applicable`; terminalization is `none | product-exit | browser-exit | equipment-failure`;
state is monotonically `open | submitted | destroyed` in that order. While open, automatic ID may change once from N/A to the
earliest already accepted matching nonworkflow prohibited correlation, and terminalization may
change once from none to the mapped cause. Later synthesized contexts initialize the mapped
class. Those are the only mutation exceptions; replacement, reversal, second update, or
post-submission mutation fails. Only in that call may safe context IDs/workflow associate with raw
scoring inputs; no identity, recruitment, distribution, profile, retained/external/reidentifying,
or cross-workflow response mapping exists. Raw values never enter the context, IPC, hash, log,
output, or evidence and are destroyed with it before the next workflow.

The supervisor is the safe current-context coordinator. It mirrors each open context, sends it to
the moderator by exact `scoring-context`, and never accepts a source-declared workflow. Before
canonical payload serialization it assigns the current open workflow tag, or permanent N/A when
no eligible context is open, including pre-readiness/context-free cases. Downstream ACK(s) then
precede accepting/counting the immutable observation. Only afterward may the first matching
product-attributable prohibited observation atomically update the mirror correlation and send the
complete updated context; moderator ACK precedes release or matching outcome. Accepted retained
observations are never mutated, backfilled, or retagged. Later/closed/cross-context values retain
their originally serialized workflow.

Scheduling is closed: pre-readiness buffered observations have no eligible context and remain
workflow N/A. After buffer release/destruction and open-binding dual ACK, while Inspector body,
readiness response, discovery task, grant, and navigation remain blocked, the supervisor opens
the discovery mirror and waits for moderator ACK. Only then may it return readiness and proceed.
After each workflow outcome is accepted through the browser watchdog, that context becomes
submitted then destroyed; the next fixed-order context is opened and ACKed before its task,
timer, or prompt begins. A post-ready/pre-context event interval is impossible.

The moderator produces
`StudyWorkflowOutcomeSubmission`; it crosses exact `workflow-outcome` moderator-to-supervisor and
then supervisor-to-browser-adapter, which alone emits the canonical workflow safe payload to its
watchdog and ACKs only after watchdog ACK. Exact submission order is `schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`,
`reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`. Version is literal `1`; workflow is
`discovery | inspection | comparison | global-consent`; outcome is `success | failure`;
disposition is `not-applicable | automatic-critical | reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`; classification is
`not-applicable | product-caused-blocker | not-product-caused-blocker`.
`inspectorProcessId` is `StudyOpaqueId | not-applicable`; N/A is allowed only for the exact
terminalization-bound pre-readiness synthetic branch, and submission/review case/both votes must
match it. Normal-input and post-readiness terminalized submissions use the current non-N/A ID.

The context correlation is an eligible failure-link candidate, not an outcome override. Success
always submits N/A automatic ID/disposition/votes even when the context has a candidate; its
underlying prohibited nonworkflow observation remains independently counted as an automatic
issue. Failure with a non-N/A context candidate must submit that exact same earliest accepted
matching correlation, `automatic-critical`, and N/A votes; a reviewer disposition is invalid.
Only failure with context candidate N/A uses automatic ID N/A, one reviewer disposition, and two
votes. Missing, unrelated, later, mismatched, reused, or independent fresh issue IDs fail. A
pre-readiness observation accepted with no open context remains workflow N/A, cannot be backfilled
or linked, and still counts in the independent automatic issue set. Issue derivation is only
`automatic:<correlationId>` or `reviewer:<subjectId>:<workflowClass>`.

Before a subject attempt, distinct human pairs are assigned out of band for each of its four
workflows; no person is reused. A separate governed access-controlled administrative roster/
assignment record may retain minimum identities/slots for uniqueness audit outside the repository
bundle, work root, candidate, runtime, capture/evidence, hashes, logs, outputs, handoff, witness,
and seal, and is destroyed under the published consent/privacy retention procedure. Runtime uses
slots only; bundle/runtime/evidence retain no identity/assignment. Fixed slot labels/equipment
may be reused only after drain/reset; human identity, case-local assignment instance, collector
component-run/process instance, and case are never reused. Each pair directly and
independently observes the same live attempt/workflow without recording or internal IPC, including a live
terminal event before its workflow begins. A synthesized remaining row uses that pair's direct
observation of the same event, not a recording. For every failure whose context candidate is N/A,
the moderator creates exact `StudySafetyReviewCase` root `schemaVersion`, `studyRunId`,
`subjectId`, `inspectorProcessId`, `workflowClass`, `caseClass`, with literal case
`nonautomatic-workflow-failure` and version `1`; process ID uses the exact union/rule above. After fresh reviewer-one/two collectors are both
ready, the moderator sends registered attestations and waits for supervisor ACKs, then sends byte-
identical safe cases before either vote. Moderator maps only fd8 to reviewer-one and fd9 to
reviewer-two. After safe-case acceptance/display completion, each collector reads only its slot's
one exact LF ASCII enum `product-caused-blocker | not-product-caused-blocker`, with no CR,
variant, second line, echo, history, recording, transcript, log, or raw IPC. It constructs the
safe vote, wipes raw input, disables input, and closes its child view. Vote one stays only in
moderator memory and is never exposed to fd9/other surfaces before vote two. No raw case crosses IPC. Each
`StudySafetyReviewVote` exact root is `schemaVersion`, `studyRunId`, `subjectId`,
`inspectorProcessId`, `workflowClass`, `reviewerSlot`, `classification`. Vote one stays hidden
until vote two; version is `1`, process ID uses the exact union/rule above, slot is `reviewer-one | reviewer-two`, and classification is
`product-caused-blocker | not-product-caused-blocker`. The moderator directly observes both exits,
sends matching clean exit attestations, and waits for supervisor ACKs before outcome/destruction.
It drains/resets fd8/fd9 before reuse. EOF/malformed/extra/replayed/cross-case/cross-descriptor
input, first-vote exposure, abort, or crash closes both child views and wipes buffers/hidden vote.
No identity, note, raw case, recording, third/replacement vote, replay, or process reuse is accepted.

Truth is exact: success has N/A link/disposition/votes and effect none regardless of a context
candidate; failure with a non-N/A eligible candidate requires its correlation,
automatic-critical, N/A votes, and effect none; only failure with candidate N/A gets two votes,
yielding reviewer-cleared/effect none for two nonblockers,
reviewer-confirmed-critical/workflow-blocker for two blockers, or
reviewer-disagreement-critical/workflow-blocker for disagreement. For every accepted exact-once
submission, the adapter generates fresh event/correlation IDs, constructs the closed workflow
tuple, and submits once to its watchdog. Duplicate pair or any raw/mismatched review state fails.

### StudyBrowserAttemptBinding and browser/server request join

`StudyBrowserAttemptBinding` is a runtime-only canonical record generated by the supervisor and
distributed by exact `attempt-binding` only to the broker, standardized harness, and
`study-browser` adapter over authenticated inherited IPC. It is never a control command, capture payload, evidence/
retained digest input, log/output value, or retained record. Its complete field set and exact root
order are:

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown, missing, extra, or reordered fields fail |
| `studyRunId` | `StudyOpaqueId` | Equals the live supervisor run |
| `browserAttemptId` | fresh `StudyOpaqueId` | Supervisor-generated after stream start and immediately before the next subject's candidate `npx`; distinct from every other ID |
| `subjectId` | `StudyOpaqueId` | Equals the next member of the fixed twenty-subject order |
| `inspectorProcessId` | `StudyOpaqueId \| not-applicable` | `not-applicable` while prepared and on pre-readiness close; the readiness-generated ID while open |
| `state` | `prepared \| open \| terminalizing \| closed` | Exact paths `prepared -> open -> closed`, `prepared -> terminalizing -> closed`, or `prepared -> open -> terminalizing -> closed` |

At most one binding exists in any runtime state and it is destroyed after closed before another
is constructed. `browserAttemptId` may exist only in supervisor/broker/harness/adapter memory,
their authenticated frames, and a request candidate. It never reaches an actual browser
process/context, profile/configuration/credential, application request, environment, argv,
evidence, or retained digest.

Replication is exact and acknowledged: prepared snapshot to harness/adapter and both ACK before
launch; canonical open snapshot with fresh process ID to both and both ACK before register
response, followed by discovery-context moderator ACK before the response and any grant/
candidate/task; terminalization-decision atomically makes all copies terminalizing;
canonical closed snapshot to both after four outcomes, with adapter ACK only after attempt-local
cleanup; then all copies are destroyed before another attempt. Normal close uses the same closed
path. Wrong, skipped, stale, reordered, duplicate, mismatched, or partial ACK fails the run.

The supervisor separately generates fresh 32-byte/43-character `browserProxyMarkerSecret` and one
runtime-only `StudyBrowserProxyMarkerBinding` with exact root order `schemaVersion`, `studyRunId`,
`browserAttemptId`, `browserProxyMarkerSecret`, `state`; state is `prepared | active |
destroyed`. It crosses only supervisor-to-browser-adapter `proxy-marker-install`; the harness
never receives it. The adapter installs the prepared secret in ephemeral browser equipment and
ACKs only after exact bootstrap success; ACK acceptance atomically makes only marker copies
active, while attempt binding remains prepared until readiness/open dual ACK. Actual browser
process/context exit destroys prepared marker and reports browser-exit; external browser/
bootstrap/environment failure observed while adapter/proxy/DevTools controller/marker/IPC/implementation are healthy
destroys it and reports equipment-failure. Internal malformed 407/204/output, proxy/controller,
DevTools/auth,
IPC, implementation, adapter, or watchdog fault destroys it but invalidates the run with no
synthesis. That frame is its sole
transient secret-bearing HMAC preimage.

The study-browser adapter directly revalidates/spawns the exact identity/digest-pinned Chromium
binary/profile, headed, with fresh nonpersistent context and empty extensions. It owns the OS
child/context and directly observes their exit. The closed nonsecret argv includes literal
`--remote-debugging-pipe` plus exact pinned headed/profile switches only; no shell, helper,
package/import expansion, raw proxy/marker, browser-attempt ID, control, or internal IPC value is
present in Chromium argv/environment/profile/history/log/evidence. Browser-attempt mapping stays
only in adapter memory.

The anonymous browser-equipment DevTools pipe is outside inherited capture IPC and retains no
data. Per attempt the adapter issues exact `Target.createBrowserContext` with `proxyServer` equal
to raw authority, `disposeOnDetach: true`, and empty proxy bypass, then exact `Fetch.enable` with
`handleAuthRequests: true`. For one exact Proxy Basic `Fetch.authRequired`, exact
`Fetch.continueWithAuth` uses `ProvideCredentials`, username `study`, password marker secret once.
Beyond the authorized dedicated adapter proxy-authority and marker-binding copies, only adapter
call-local control-request buffer and actual context/auth cache hold additional DevTools-stage raw
copies; the buffer is wiped after DevTools response ACK. The adapter verifies exact `407 -> retry -> 204`
through that context before marker ACK. Normal close/abort/crash/terminalization/internal fault
disposes the context/auth cache, closes the pipe, terminates the attempt Chromium child, and
destroys its fresh isolated profile; no process/context is reused.

Pinned Chromium is eligible only when its verified remote-debugging-pipe implementation uses
exact `StartRemoteDebuggingPipeHandler(base::BindOnce(&ChromeDevToolsManagerDelegate::CloseBrowserSoon))`,
so disconnect schedules browser close. Adapter owns the pipe/child. The supported platform also
supplies fresh attempt-isolated process-group/job containment plus emptiness observation through
the Node.js built-in child-spawn/OS boundary; it is lifecycle equipment, not helper/import/IPC/
environment/path authority, and an unsupported platform fails before launch. Live EOF requires
context disposal, pipe close, child exit, profile destruction. Adapter crash closes the pipe,
invokes verified `CloseBrowserSoon`, and containment closes any survivor. Supervisor retains raw
handles/PIDs only as runtime observer state and blocks next attempt/stop/finalize after adapter
exit until zero descendant/context/profile is proven. Failure invalidates/cleans; no observer
state is evidence.

Browser-context proxy username is literal `study` and password is the marker secret. After all stream starts but immediately before this attempt's
`npx` and first capturable request, fixed proxy-local URI
`http://inspector-study.invalid/.well-known/proxy-auth-bootstrap` receives exactly one bodyless
407 whose exact two headers, in order, are `Proxy-Authenticate: Basic
realm="inspector-study"` and `Connection: close`, with no others; then one canonical Basic retry
receives bodyless fixed 204 whose sole header is `Connection: close`, with no others. There is
zero DNS, connect, application, correlation, candidate, or evidence effect even while streams are
live. With exact internal output, an actual browser/environment retry, credential, sequence, or
completion failure follows external equipment-failure; adapter/proxy-produced status/header/body/
network/evidence/output deviation is an internal run-invalidating fault. During capture every later study-browser request has exactly
one canonical Basic field. Missing secret on syntactically valid traffic projects to other-host;
malformed/duplicate/noncanonical/unknown/stale/mismatched secret projects to unknown; both use N/A
IDs, are unrelated/false, and block before DNS/connect.

The secret authenticates proxy transport only and cannot establish actor, product attribution,
application/control capability, or forwarding. The raw secret/Basic/config/binding never enters
any other inherited/evidence IPC, hash, file, environment, argv, log/output, retained artifact,
application request, or persistent profile/history/cache/keychain/credential store. Control,
continuity, channel keys, `browserAttemptId`, and derivatives cannot be reused. Close, abort,
crash, and child exit destroy the context/process/configuration and every secret/binding copy.
Actual headed Chromium tests inspect isolated temporary HOME, every XDG root, profile, history,
cache, and credential store after normal/abort/crash boundaries, require zero secret/encoded
Basic/browserAttemptId persistence, and destroy all equipment before another attempt. Pinned-
binary integration disconnects the remote-debugging pipe at every boundary, proves verified
`CloseBrowserSoon` plus the absence barrier, and requires zero orphan child/context/profile after
adapter crash.

Proxy and server independently derive runtime-only `StudyBrowserInitiatorProjection` from the
same unchanged certified-Chromium-controlled `Sec-Fetch-Dest`, `Sec-Fetch-Mode`,
`Sec-Fetch-Site`, `Sec-Fetch-User`, `Origin`, and `Referer`. Exact root order is
`schemaVersion`, `destinationClass`, `modeClass`, `siteClass`, `userClass`,
`originEvidenceClass`, `refererEvidenceClass`; version is `1`. Closed values are respectively
`document | other | unknown`, `navigate | other | unknown`, `none | same-origin | other |
unknown`, `present | missing | unknown`, and for each final field `missing | exact-issued |
extension-scheme | other | unknown`. Only exact `?1` is present. Duplicate, noncanonical,
unknown, or inconsistent controlled headers project the actor to unknown. Raw values are
discarded before IPC, the proxy forwards the six headers unchanged, and the server projection
must equal the candidate projection. The production profile has no extension; a test-only
extension profile proves certified Chromium prevents page/extension spoofing.

Fetch Metadata is consistency only. After exact product readiness and immediately before the one
expected initial navigation, the supervisor creates one `StudyParticipantNavigationGrant` with
exact root order `schemaVersion`, `studyRunId`, `browserAttemptId`, `correlationId`, `state`;
version is literal `1`, IDs are the current/fresh safe values, and state is `armed | consumed |
destroyed`. It owns the canonical broker copy and sends an armed
copy to the adapter. Browser/page/application sees no grant before proxy header injection. Under
a call-local mutex the adapter reserves, but does not change, its armed copy only for valid
secret + exact participant-shaped projection + exact authorized-static target, and sends a
candidate using the grant correlation. The supervisor atomically verifies its armed copy,
attempt/correlation/tuple and stores the candidate pending while both grant copies remain armed.
It sends exact one-use candidate-forward as the sole authenticated acceptance/authorization;
committing that decision atomically changes canonical armed to consumed. No generic candidate ACK
exists and validation/storage is not acceptance. After validating matching candidate-forward the
adapter changes its copy to consumed and forwards. Failure before decision commit wipes pending
candidate and leaves both grants armed, except authenticated replay/race invalidates and destroys.
A fresh HTTP request with no armed grant, wrong target, page-script origin, or after consumption
uses a fresh proxy correlation and becomes the blocked unknown/prohibited observation below; it
does not consume a grant or invalidate. Duplicate/replayed/stale authenticated candidate/grant
IPC, simultaneous second consume, authenticated reservation/decision mismatch, a committed
decision missing/mutated at the adapter, or wrong authenticated attempt invalidates with no forwarding; close destroys all
copies.

Decision order is exact: valid secret plus navigate/document/?1/missing Origin, site none or
same-origin, exact authorized-static target, and current armed grant is participant and alone
uses the grant correlation and forwards. Any participant-shaped request missing any of those
conditions—including nonexact target, no grant/replay, or user-activated page-script navigation—
is valid-secret unknown with binding IDs and critical unauthorized/true tuple, and is blocked. A
nonparticipant valid-secret request with missing user and either exact-issued Origin
or missing Origin plus exact-issued Referer is bundled-SPA; only its exact authorized static/RPC
request forwards, while every nonexact/unauthorized request is product-attributable/prohibited and
blocked. Valid secret plus extension-scheme Origin is extension and always unrelated/N/A/false/
blocked. Every remaining valid-secret projection is unknown, uses binding IDs, is
product-attributable/prohibited with `effectClass: unauthorized-request`, and blocks critically.
Missing secret after bootstrap is syntactically valid other-host or malformed unknown as above.
Only the exact grant-attested participant and forwarded SPA branches may have a server claim.

The exact in-memory request-correlation records are content-free. A
`StudyBrowserRequestCandidate` has complete field set and exact root order `schemaVersion`,
`studyRunId`, `browserAttemptId`, `correlationId`, `actorClass`, `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `originClass`, `effectClass`,
`sameInspectorHost`, `productAttributable`, `prohibited`. `studyRunId` and `correlationId` are
current/fresh `StudyOpaqueId` values; `browserAttemptId` is the current valid binding ID or literal
`not-applicable` for a missing/invalid marker. A `StudyServerCorrelationClaim` has
complete field set and exact root order `schemaVersion`, `studyRunId`, `correlationId`,
`subjectId`, `inspectorProcessId`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`,
`methodClass`, `originClass`, `effectClass`, `sameInspectorHost`,
`productAttributable`, `prohibited`. Both versions are literal `1`; every claim has current
binding/registered `StudyOpaqueId` subject/process values and actor `participant | bundled-spa`;
N/A claim IDs and every other actor are invalid. Every other ID is current; every class and boolean is from the closed observation table; and neither
record may contain an `eventId`, raw header/method/path/authority/body, capability, URL, error,
content, or extra field.

The supervisor owns the sole content-free in-memory broker keyed by exact
`studyRunId + correlationId`. A participant request uses exactly the supervisor grant correlation;
the adapter generates no replacement. Only SPA and browser-only non-grant branches receive a
fresh adapter-generated correlation. For an exact forwarded participant/SPA request the proxy removes any incoming correlation field and
injects exactly one canonical `X-Inspector-Study-Correlation`. The canonical ID is generated
before the header by its branch owner and is not a capability. On receipt the server requires exactly one strict
43-character value, decodes to 32 bytes and canonically re-encodes equal text, strips it before
application handling, and independently requires its unchanged-header projection to equal the
candidate. The canonical string is the sole retained header-derived value and may enter the safe
payload and payload/stream/handoff/witness/seal digest chain. Raw header name/case/order/framing/
wire/encoded representation, whitespace, duplicate layout, noncanonical spelling, and alternate
derived values are discarded before IPC and never hashed or retained.

For each validated candidate, the supervisor broker snapshots the binding/current open context
and solely derives workflow/link scope. Sources/adapter cannot supply or infer workflow. Before
canonical serialization it assigns the current open workflow tag. Without an eligible context,
workflow/link are permanent N/A; before readiness, process is also permanent N/A. The accepted payload is never
backfilled/mutated. The broker adds the fresh evidence event ID and exact derived fields and sends the canonical
nonworkflow browser observation only by restricted supervisor-to-browser-adapter `safe-payload`.
The adapter validates/relays unchanged and ACKs only after watchdog ACK. Only then is the
observation accepted/counted. A first matching product-attributable prohibited observation then
updates the still-open mirror; complete updated scoring-context and moderator ACK precede any
release decision or matching outcome submission.

The join is timer-free. The broker validates/stores `candidate-pending`; for participant the
canonical grant remains armed during storage, while SPA consumes none. It commits exact one-use
`candidate-forward` as sole authenticated acceptance/authorization and atomically changes the
participant canonical grant armed to consumed before the proxy forwards. Adapter validates that
decision, consumes its copy, then forwards. Predecision failure wipes pending and leaves grants
armed except authenticated replay/race invalidates. The
probe submits its exact participant/SPA claim
and waits for broker acknowledgement before application handling. The broker validates binding,
registered subject/process IDs, projection, every class/boolean, and exact once-ness, atomically
changes `candidate-pending -> joined`, generates two event IDs, and constructs the browser/server
payloads. It sends the browser member by restricted supervisor-to-browser-adapter `safe-payload`
and the server member by supervisor-to-server-ledger-adapter `safe-payload`; each adapter validates
its candidate/claim and ACKs only after its watchdog ACK. After both downstream ACKs the broker
accepts/counts both observations, performs any eligible mirror/update-context ACK barrier, then
changes to `released`, sends exact one-use `joined-pair-released`, waits for decision ACK, and only
then acknowledges the claim and permits application/response completion. It revalidates participant grant/correlation and the independently
projected six-header tuple. Both payloads share correlation, subject/process, classes,
supervisor-selected workflow, N/A automatic/review fields, and booleans, with distinct event IDs.
No write precedes complete join and no response/content exposure
precedes release.

There is no wall-clock deadline/timeout/state. After candidate-forward commit, while pending, unmatched proxy transaction end,
abort, error, or connection close; Inspector request abort; inherited-IPC close; probe/attempt
close; stop; or child exit fails the run, wipes pending state, and releases zero partial pair. A
late claim fails. Claim-before-candidate, forwarding before candidate-forward,
accepting/counting before downstream ACK, release before required updated-context ACK,
application handling before claim acknowledgement, or response exposure before release also
fails; response/application completion before the released-decision ACK also fails. Clock advance
alone never changes state.

Blocked candidates are validated/stored but never accepted, are browser-only, permit no claim or
candidate-forward, and receive exact one-use
`browser-only-released` only after the broker's restricted browser `safe-payload` is matched by
the adapter, written by its watchdog, ACKed downstream, accepted/counted, and followed by any
required mirror/update-context ACK; blocked completion waits for the
decision ACK. Participant-shaped nonexact/no-grant/replayed
traffic is valid-secret unknown with binding IDs and the critical tuple. Extension,
missing-secret other-host, and invalid-secret unknown use N/A evidence IDs and unrelated/false
tuple. Blocked bundled-SPA uses binding IDs and its product/prohibited tuple. Remaining valid-
secret unknown uses binding IDs and the critical prohibited tuple. Each path validates exact
candidate order, unique correlation, actor/projection/class/boolean tuple, and role.

On readiness, the supervisor verifies the sole prepared binding's run/subject, allocates the
fresh `inspectorProcessId`, and atomically changes the binding to `open`. The existing
`register-product-probe` response follows only after the prebuffer, dual-ACK replication, and
discovery-context ACK chain above. Supervisor derives product-exit only from its participant OS
child wait; harness is no terminalization source. Healthy study-browser-
adapter reports actual browser process/context exit as browser-exit or the defined external
browser/bootstrap/environment branch as equipment-failure through exact `attempt-terminalization`.
Internal adapter/proxy/controller/DevTools/marker/auth/IPC/implementation/child fault cleans up
and invalidates without synthesis. Authenticated probe close/EOF is serialized with OS child
state: already exited produces product-exit, still live before four outcomes produces
`premature-probe-close`, and after four outcomes plus zero join it is normal.
The supervisor first-valid-cause wins exactly, rejects every later/racing cause, freezes accepted
rows, closes pending joins without partial release, changes the attempt to terminalizing, and
fans out byte-identical `terminalization-decision`. Context mapping is product-exit, browser-exit,
equipment-failure, and premature-probe-close to equipment-failure.

For terminalization after zero through four accepted workflows, already accepted rows remain
immutable. In fixed remaining workflow order the moderator opens a context initialized with the
mapped class, creates exact failure plus required review under the same subject/process IDs, and
waits for acceptance before the next. Harness owns only the fixed remaining schedule; moderator
owns synthesis. Pre-readiness process ID remains `not-applicable`; post-readiness retains its
assigned ID. At decision, adapter destroys browser/grant/marker/reservation/candidate/pending
state but adapter/harness retain terminalizing binding copies. After exactly four rows, supervisor
sends closed snapshots and requires both ACKs; then state and all joins/scoring context/binding
copies are destroyed before another attempt. Normal completion uses the same close/wipe only after probe
close, four rows, and zero join. Evidence harness/orchestrator/adapter/watchdog/reviewer failures
invalidate the run instead, with no synthesis. `stop` and finalization require zero live state.

Duplicate/replayed candidates or claims, duplicate correlation use, wrong run, binding,
projection, actor, class, boolean, role, or order, any lifecycle termination while pending,
unmatched-at-close/stop, and late-after-close input fail the complete run. An incomplete join
releases no evidence member and is wiped. Raw values never enter the broker. Direct Inspector-
origin correlations remain on the existing product/server path and cannot carry or consume a
browser-attempt marker.

### StudyInputManifest

The manifest root is a freshly constructed object whose exact property order and complete
field set are `manifestVersion`, `bundleRoot`, `inputs`:

| Field | Type | Rules |
|---|---|---|
| `manifestVersion` | positive safe integer | Initial value is `1`; denominator-semantic changes increment it |
| `bundleRoot` | literal `tests/usability/sc001-sc006-study-inputs/` | Ends in `/`; no absolute, backslash, dot-segment, empty-segment, or percent-encoded spelling |
| `inputs` | exact 16 `StudyInputEntry` records | Sorted by raw UTF-16 code units of unique `inputId`; every closed role has nonzero coverage |

Each `StudyInputEntry` is a fresh object with the exact property order and complete field
set `inputId`, `role`, `path`, `sha256`:

| Field | Type | Rules |
|---|---|---|
| `inputId` | nonempty stable ASCII ID | Unique and never inferred from localized content |
| `role` | `guidance \| task-prompt \| evaluation-fixture \| prepared-state \| response-form \| ground-truth \| scoring-rubric` | Must match the fixed member's function; both language members use the same role |
| `path` | `/`-normalized repository-relative path | Unique; exactly `bundleRoot` plus one fixed direct-child name |
| `sha256` | 64 lowercase hexadecimal characters | SHA-256 of that member's exact raw bytes |

Canonical manifest bytes are exactly
`Buffer.from(JSON.stringify(canonicalValue, null, 2) + '\n', 'utf8')`. Neither construction
nor comparison performs Unicode normalization, and byte equality rather than parse
equivalence is authoritative. The companion is exactly the lowercase SHA-256 of those bytes
followed by one LF. A missing/extra member, directory or symlink, duplicate ID/path,
noncanonical order or bytes, unreadable member, role mismatch/empty role, bilingual omission,
or digest mismatch invalidates the bundle before participant enrollment.

### StudyCaptureEnvelope

Exactly three independent streams exist in this fixed order:
`product-instrumentation`, `inspector-server-ledger`, `study-browser`. Each has its own
watchdog process and capture process. The watchdog is the sole writer of the stream's
canonical payload files and envelope ledger; the capture process can submit only a closed
`StudyCapturePayload` value and cannot append, rewrite, seal, or repair evidence. Each
authenticated IPC message carries exactly one such value; a primary-workflow observation may
produce any number of messages, all of which the watchdog counts and chains.

Every process start receives a fresh opaque `watchdogProcessRunId` or
`captureProcessRunId` that is distinct from an OS PID and is never reused. Each logical
watchdog and capture instance also receives a fresh opaque `watchdogInstanceId` or
`captureInstanceId`. All four values and the `streamRole` remain constant from the sole
start through the sole stop. A restart or replacement necessarily changes the corresponding
process-run and instance IDs and invalidates the paired study; retaining or copying earlier
IDs cannot make a restart continuous.

`StudyCaptureEnvelope` is newly constructed without Unicode normalization or extra fields
and has this exact property order:

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versions fail closed |
| `streamRole` | closed three-value stream role | Stable and matches the sealed stream slot |
| `watchdogInstanceId` | opaque instance ID | Stable and unique for this logical watchdog instance |
| `watchdogProcessRunId` | opaque process-run ID | Stable for the one uninterrupted watchdog process; unique across all three streams |
| `captureInstanceId` | opaque instance ID | Stable and unique for this stream in this study run |
| `captureProcessRunId` | opaque process-run ID | Stable for the one uninterrupted capture process; unique across all three streams |
| `sequence` | nonnegative safe integer | Sole start is `0`; every later envelope is exactly prior sequence plus one |
| `recordKind` | `capture-start \| payload \| heartbeat \| handoff-anchor \| capture-stop` | Selects exactly one closed canonical payload variant |
| `monotonicNs` | canonical nonnegative decimal string | Watchdog monotonic clock; no leading zero except `0`; never decreases |
| `priorDigest` | 64 lowercase hexadecimal characters | 64 zeroes at sequence 0; otherwise SHA-256 of the prior exact envelope bytes including LF |
| `payloadSha256` | 64 lowercase hexadecimal characters | SHA-256 of the retained exact canonical `StudyCapturePayload` bytes |

Exact envelope bytes are
`Buffer.from(JSON.stringify(canonicalEnvelope) + '\n', 'utf8')`. Sequence 0 is the sole
`capture-start`; `handoff-anchor` occurs exactly once after the handoff pair is written and
before stop; `capture-stop` occurs exactly once and is terminal. Neither handoff nor
verification closes or rewrites an open chain.

### StudyCapturePayload

`StudyCapturePayload` is the following closed discriminated union. Each variant is a newly
constructed object serialized exactly as
`Buffer.from(JSON.stringify(canonicalPayload) + '\n', 'utf8')`; the listed keys are its
complete field set and exact insertion order.

| Envelope `recordKind` | Exact payload keys in order | Value rules |
|---|---|---|
| `capture-start` | `schemaVersion`, `eventCode`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `captureProcessReady`, `watchdogReady` | Version is literal `1`, `eventCode` is literal `capture-start`, both ready fields are literal `true`, and the session/run IDs, commitments, and lowercase digests are common to all three streams |
| `payload` | `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `originClass`, `effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited` | Version is literal `1`; IDs are opaque or their exact not-applicable literal; all classes/event codes come from the closed privacy-safe tables; the final three fields are booleans and none is inferred by the verifier from retained raw data. For a product-attributable observation, the verifier accepts process N/A only as an ordered same-run/same-subject terminalization-bound pre-readiness release with workflow N/A; readiness-bound uses the assigned non-N/A ID, and every other/post-readiness product N/A row is invalid |
| `heartbeat` | `schemaVersion`, `eventCode`, `studyRunId`, `watchdogHealthy`, `captureProcessHealthy`, `acceptedPayloadCount` | `eventCode` is literal `heartbeat`; both health fields are literal `true`; the run ID matches start and the nonnegative safe-integer count equals accepted prior `payload` records |
| `handoff-anchor` | `schemaVersion`, `eventCode`, `studyRunId`, `checkpointRequestId`, `handoffSha256` | `eventCode` is literal `handoff-anchor`; run/request IDs match the supervisor snapshot and canonical handoff, and the lowercase digest equals the companion and exact handoff bytes |
| `capture-stop` | `schemaVersion`, `eventCode`, `studyRunId`, `candidateSha256`, `studyInputManifestSha256`, `checkpointRequestId`, `handoffSha256`, `continuityPassed`, `finalSequence`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `priorEnvelopeSha256` | `eventCode` is literal `capture-stop`; run ID and both lowercase study digests equal start; checkpoint/handoff values equal the sole anchor; continuity is literal `true`; `handoffAnchorRecordCount` is literal `1`; `finalSequence` equals the stop envelope sequence; `envelopeCount` equals `finalSequence + 1`, the observed total, and `2 + payloadRecordCount + heartbeatRecordCount + handoffAnchorRecordCount`; all kind counts equal observed prior records; `priorEnvelopeSha256` equals the exact preceding-envelope digest and the stop envelope's `priorDigest`; the verifier independently recomputes every value before sealing |

#### Study observation classification and pseudonyms

The closed observation-class fields are:

| Field | Closed values |
|---|---|
| `observationClass` | `request \| mcp \| execution \| inspected-source-mutation \| workflow` |
| `actorClass` | `inspector \| bundled-spa \| browser-extension \| other-host-process \| operating-system \| participant \| unknown` |
| `authorityClass` | `exact-issued \| other-loopback \| remote \| unclassifiable \| not-applicable` |
| `requestClass` | `authorized-static \| authorized-rpc \| prohibited \| unrelated \| os-mediated \| unclassifiable \| not-applicable` |
| `targetClass` | `static-manifested-asset \| static-spa-shell \| static-client-route-fallback \| connection-discovery-metadata \| rpc-channel-upgrade \| rpc-get-session \| rpc-get-file-detail \| rpc-get-mcp-carrier-detail \| rpc-get-permission-policy-detail \| rpc-open-file \| rpc-rescan-repository \| rpc-get-global-consent-preview \| rpc-create-global-consent-preview \| rpc-enable-global \| rpc-rescan-global \| rpc-disable-global \| rpc-devframe-framework \| other-loopback \| remote \| mcp \| unclassifiable \| not-applicable` |
| `methodClass` | `get \| head \| post \| other \| unclassifiable \| not-applicable` |
| `originClass` | `exact-same-origin \| missing \| mismatched \| unclassifiable \| not-applicable` |
| `effectClass` | `none \| unauthorized-request \| command-or-code-execution \| child-process \| mcp-connection \| prohibited-outbound-request \| inspected-source-mutation \| cross-machine-content-exposure \| workflow-blocker` |
| `workflowClass` | `discovery \| inspection \| comparison \| global-consent \| not-applicable` |
| `outcomeClass` | `observed \| success \| failure \| not-applicable` |
| `automaticIssueCorrelationId` | `StudyOpaqueId \| not-applicable` |
| `reviewDisposition` | `not-applicable \| automatic-critical \| reviewer-cleared \| reviewer-confirmed-critical \| reviewer-disagreement-critical` |
| `reviewerOneClassification`, `reviewerTwoClassification` | `not-applicable \| product-caused-blocker \| not-product-caused-blocker` |

Every nonworkflow observation has `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, and `reviewerTwoClassification` all literal `not-applicable`.
Before canonical serialization the supervisor current-context coordinator assigns each such
observation the current eligible open workflow, or permanent N/A when none is eligible. The
accepted tag is immutable and a source never self-declares it.

An authorized-static request must match exactly one row below; every listed class requires
`authorityClass: exact-issued`, `requestClass: authorized-static`,
`originClass: not-applicable`, `sameInspectorHost: true`,
`productAttributable: true`, `effectClass: none`, and `prohibited: false`:

| `targetClass` | Exact method |
|---|---|
| `static-manifested-asset` | `get \| head` to a manifest-listed non-HTML asset |
| `static-spa-shell` | `get \| head` to packaged `/`/`index.html` shell |
| `static-client-route-fallback` | `get \| head` to one closed client-route fallback |
| `connection-discovery-metadata` | `get \| head` to devframe's fixed connection-discovery document (`__connection.json`), which names the channel's own path and carries no session data |

An authorized-rpc observation is either the one channel-establishment HTTP request or a
dispatched-function server observation from the registered probe; every row requires
`actorClass: bundled-spa`, `authorityClass: exact-issued`, `requestClass: authorized-rpc`,
`sameInspectorHost: true`, `productAttributable: true`, `effectClass: none`, and
`prohibited: false`. The channel establishment uses `targetClass: rpc-channel-upgrade`,
`methodClass: get`, and `originClass: exact-same-origin` — the pinned browser always names
the page origin on a WebSocket upgrade. A dispatched-function row instead uses
`methodClass: not-applicable` and `originClass: not-applicable` — a devframe frame is not
an HTTP request, and its connection's method and origin were classified at the upgrade —
and `targetClass` exactly per dispatched function
(`contracts/http-api.md` § RPC function catalog):

| `targetClass` | RPC function |
|---|---|
| `rpc-get-session` | `agent-customization-inspector:get-session` |
| `rpc-get-file-detail` | `agent-customization-inspector:get-file-detail` |
| `rpc-get-mcp-carrier-detail` | `agent-customization-inspector:get-mcp-carrier-detail` |
| `rpc-get-permission-policy-detail` | `agent-customization-inspector:get-permission-policy-detail` |
| `rpc-rescan-repository` | `agent-customization-inspector:rescan-repository` |
| `rpc-get-global-consent-preview` | `agent-customization-inspector:get-global-consent-preview` |
| `rpc-create-global-consent-preview` | `agent-customization-inspector:create-global-consent-preview` |
| `rpc-enable-global` | `agent-customization-inspector:enable-global` |
| `rpc-rescan-global` | `agent-customization-inspector:rescan-global` |
| `rpc-disable-global` | `agent-customization-inspector:disable-global` |
| `rpc-devframe-framework` | devframe's own framework-registered functions — the trust handshake every connection issues and the built-ins the transport contract enumerates |

A dispatched invocation naming any other function matches no row and is an exact-issued
request outside the authorized tables, with `targetClass: unclassifiable` and
not-applicable method and origin. No other cross-field combination is authorized. The following five rows are the complete
product-attributable prohibited request/MCP effect table. Every row uses
`workflowClass: not-applicable` except for supervisor assignment to the first matching open-
context observation, `outcomeClass: observed`, and automatic plus three review fields
`not-applicable`; subject/process IDs come from the applicable open
browser-attempt binding or registered product probe.

| Case | Exact classification and booleans |
|---|---|
| Exact-issued request outside the authorized tables | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: exact-issued`; `requestClass: prohibited`; observed closed `targetClass`, `methodClass`, and `originClass`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Other-loopback request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: other-loopback`; `requestClass: prohibited`; `targetClass: other-loopback`; observed closed non-N/A `methodClass`; `originClass: not-applicable`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Remote request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: remote`; `requestClass: prohibited`; `targetClass: remote`; observed closed non-N/A `methodClass`; `originClass: not-applicable`; `effectClass: prohibited-outbound-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Fully unclassifiable product-correlated request | `observationClass: request`; `actorClass: unknown`; `authorityClass: unclassifiable`; `requestClass: unclassifiable`; `targetClass: unclassifiable`; `methodClass: unclassifiable`; `originClass: unclassifiable`; `effectClass: unauthorized-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Product MCP observation | `observationClass: mcp`; `actorClass: inspector`; `authorityClass: not-applicable`; `requestClass: not-applicable`; `targetClass: mcp`; `methodClass: not-applicable`; `originClass: not-applicable`; `effectClass: mcp-connection`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |

On the browser-attempt path the exact initiator decision is authoritative. Extension,
missing-secret other-host, and invalid-secret unknown are unrelated with N/A evidence IDs, effect
none, and false attribution/prohibition. Participant-shaped nonexact/no-grant/replayed/user-
activated page-script traffic and every remaining valid-secret unknown
uses binding IDs and the critical unauthorized/true tuple; blocked bundled-SPA uses binding IDs
and its applicable product/prohibited tuple. All are nonworkflow/observed with automatic/review fields N/A.
Observable mounted/mapped backing-store traffic is
`observationClass: request`, `actorClass: operating-system`, `authorityClass: not-applicable`,
`requestClass: os-mediated`, `targetClass: not-applicable`, `methodClass: not-applicable`,
`originClass: not-applicable`, `effectClass: none`,
`workflowClass: not-applicable`, `outcomeClass: observed`, `sameInspectorHost: true`,
`productAttributable: false`, and `prohibited: false`, with both IDs `not-applicable`; it never
converts an Inspector request into an authorized class. Every unlisted field value or cross-field
combination fails closed.

`subjectId` is exactly one of twenty fresh run-local 43-character base64url random tokens or
literal `not-applicable`. At start the supervisor generates, owns, and fixes the order of exactly
those twenty tokens. It conveys only the next token in `attempt-binding`; no token-set message or
mapping route exists. A token is authorized pseudonymous evidence only for that study slot's
observations. No retained/external/re-identifying mapping may connect it to a distribution ID,
participant identity, browser profile, recruitment record, or response. Runtime association is
limited to the supervisor's ordered set, current attempt-binding copies, and exact at-most-one
call-local `StudyCurrentSubjectScoringContext`; raw scoring inputs never enter them or IPC and
current copies are destroyed at their defined boundary. Fresh generation provides cross-run non-
reuse and unlinkability. Unrelated and OS-mediated records use `not-applicable`.

`inspectorProcessId` is exactly a fresh run-local 43-character base64url token or literal
`not-applicable`. A token is generated for each participant-launched Inspector only after the
fixed readiness handshake; every correlated safe record from that launch uses the same token,
and no later launch may reuse it. It is not an OS PID and is never derived from a PID, path,
candidate digest, distribution, subject, or process metadata. A launch that fails before the
bound bootstrap can produce no product observation and uses `inspectorProcessId: not-applicable` on all
four of that subject's terminal workflow records: failed discovery plus failed
inspection/comparison/Global-consent records whose work was not started because launch was
blocked. If terminalization follows acknowledged pre-readiness registration, the only permitted
N/A product observations are the ordered terminalization-bound buffer releases defined above;
they retain workflow N/A. A successful handshake requires the same non-`not-applicable` process token on all
four terminal workflow records for that subject. Mixing a token and `not-applicable`, changing
the token, or recording any other N/A product-attributable event invalidates the run.

Only the `study-browser` stream may contain workflow records. It contains exactly eighty
terminal records: one `success | failure` record for every member of the closed twenty-token
subject set crossed with the four workflow classes, with no duplicate or extra subject/workflow
pair. This exact-set and canonicality check is independent of the success thresholds: a valid
threshold-failing run is still completed, sealed, and retained so it can prove failure. The
verifier separately computes discovery pass as at least nineteen successes and inspection pass
as at least eighteen successes; a miss blocks release approval but never suppresses the
remaining observations, stop, witness, or seal. All twenty comparison and Global-consent
outcomes are recorded without an additional success threshold. These eighty records do not
constrain the number of other authenticated messages or observations.

Scheduling is exact. Start is run-level only: bind proxy/listener, launch the two orchestrators
and six stream processes, and write three starts/first heartbeats; no attempt/profile/context,
marker/secret, grant, or bootstrap exists. After start, subjects 1-19 each execute discovery,
inspection, comparison, global-consent sequentially and destroy their closed attempt before the
next. Subject 20 executes discovery, may remain the sole open attempt through checkpoint/handoff,
then after continuation executes the remaining three and closes. If it terminalized early, all
four rows already exist and the post-anchor heartbeat supplies continuation progress. Therefore
all twenty discovery observations exist at checkpoint with at most one binding. Each attempt's
fresh context/secret/bootstrap is created after stream start but immediately before its own
`npx`/first capturable request, and bootstrap produces zero candidate/correlation/evidence.

Every terminal workflow payload has one exact cross-field tuple. `eventCode` is literal
`observation`; `observationClass` is `workflow`; `actorClass` is `participant`; and
`authorityClass`, `requestClass`, `targetClass`, `methodClass`, and
`originClass` are all `not-applicable`. `workflowClass` and `outcomeClass` equal the accepted
`StudyWorkflowOutcomeSubmission`; `sameInspectorHost` and `productAttributable` are literal
`true`; and `prohibited` is literal `false`. The automatic field and three review fields equal the
accepted submission. Success is all N/A/effect none. Failure follows the exact review truth
table; only confirmed or disagreement critical has `workflow-blocker`, while automatic and
cleared has effect none. `subjectId` is the submission's
member of the closed twenty-token set. `inspectorProcessId` is the subject launch's ready token,
or `not-applicable` for all four records only when that launch failed before readiness.
`eventId` and `correlationId` are adapter-generated fresh `StudyOpaqueId` values, and the
correlation occurs only in `study-browser`. Every other workflow cross-field combination,
caller-supplied event/correlation ID, wrong process-ID variant, or workflow record in another
stream is rejected.

#### Safe cross-stream correlation

Every logical observation receives one fresh run-local correlation token. Exactly one record
exists in each required role below and no other role; within the correlation, `correlationId`,
`subjectId`, `inspectorProcessId`, every closed classification, and all three booleans are
identical, while `eventId` remains unique per retained record:

| Observation origin | Required stream roles |
|---|---|
| Exact authorized projected `participant \| bundled-spa` request forwarded to `exact-issued` | `inspector-server-ledger`, `study-browser` |
| Any browser request blocked before forwarding | `study-browser` only |
| `inspector` request to `exact-issued` | `product-instrumentation`, `inspector-server-ledger` |
| `inspector` request to `other-loopback`, `remote`, `mcp`, or `unclassifiable` | `product-instrumentation` only |
| OS-mediated traffic or product execution, mutation, MCP, or other non-request effect | `product-instrumentation` only |
| Participant workflow terminal outcome | `study-browser` only |

The `study-browser` adapter is a Node-built-in, deny-by-default local HTTP/CONNECT proxy bound
to `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` and fixed in the study equipment/browser proxy
configuration. It accepts only the exact runtime-only Basic correlation credential defined by
`StudyBrowserProxyMarkerBinding`, consumes and strips it, and never accepts an authorizing proxy
credential or any value derived from `INSPECTOR_STUDY_CONTROL_TOKEN`. After safe classification,
it forwards only an exact authorized participant/SPA exact-issued loopback request. Every other
case follows the ordered initiator decision table and blocks. Secret validity never authorizes
actor, product attribution, application/control capability, or forwarding.

For an eligible browser request, the proxy creates/replaces exact
`X-Inspector-Study-Correlation` with the participant grant correlation or the adapter-generated
SPA candidate correlation, respectively. The Inspector-side single-file probe strips it before
application handling and submits the exact claim to the broker. The timer-free supervisor broker
enforces sole authenticated `candidate-forward` acceptance before forwarding; claim validation/
join then both restricted browser/server `safe-payload` downstream ACKs; observation acceptance/
counting and any mirror/update-context ACK; then `joined-pair-released` decision ACK; and only
then claim ACK, application handling, and response completion. A blocked candidate instead
requires browser `safe-payload` downstream ACK, acceptance/counting and any context ACK, then `browser-only-released`
decision ACK before completion. For direct Inspector HTTP, the probe
generates/propagates correlation itself and the existing two-product-role path applies. No blocked
case or extension/other-host/unknown actor has a claim. Missing pair, duplicate/replay, projection/
tuple mismatch, unexpected role/order, any enumerated lifecycle termination while pending,
unmatched entry at close/stop, late input, or residual binding/pending/marker/context/process
state at stop/finalize invalidates the run and emits no partial pair. Elapsed time alone has no
join effect. Raw method, path, authority, URL, marker/projection/correlation-header representation,
capability, or body is classified and discarded before broker/evidence IPC. Only the strictly
decoded canonical 43-character correlation string may occur in safe IPC/evidence and its required
digest chain.

The one-second value is the nominal watchdog scheduling cadence, not the acceptance maximum.
The watchdog schedules a heartbeat on that cadence. The four heartbeat-continuity gaps are
exactly start-to-first-heartbeat, consecutive-heartbeat, latest-heartbeat-to-checkpoint or
handoff, and last-heartbeat-to-stop; each MUST be no more than 1,500,000,000 monotonic
nanoseconds. Every envelope's `monotonicNs`, including a `payload` envelope, is
nondecreasing, but an intervening payload never resets a heartbeat endpoint or masks an
over-limit gap. Thus scheduling tests use the one-second nominal value while continuity
verification uses the explicit 1.5-second maximum.

Only canonical privacy-safe payload bytes may cross the writer boundary, be hashed, or retained.
Raw header names/case/order/framing/wire bytes/text/encoded representations/whitespace/duplicate
layout, noncanonical or alternate derived header values, request/response bodies, inspected or
authored content, paths/names, capabilities, URLs, authorities, raw errors, and participant
responses are prohibited in payloads, envelopes, sidecars, and evidence. The sole retained
header-derived exception is the strictly decoded/canonically re-encoded 43-character
`correlationId`, whose origin is its contract-defined protocol owner and which necessarily enters the
canonical payload, stream, handoff, witness, and seal digest chain. The separate marker secret is
runtime-only in its exact install-frame HMAC and ephemeral equipment configuration. Encoding,
normalizing, redacting, or hashing another prohibited value never makes it safe.

### StudyCaptureHandoff

Only the independent checkpoint verifier creates `StudyCaptureHandoff` and its companion. The
supervisor asks each sole writer to atomically snapshot one immutable prefix position and
monotonic value, retains that snapshot in memory, and immediately resumes its append queue; it
never pauses heartbeat emission or serializes the handoff. Its root has exact property order
`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`,
`checkpointRequestId`, `streams`. Version is literal `1`; session/request/run IDs,
commitments, and digests match start and supervisor state; and `streams` uses the fixed
three-role order.

Each `StudyCaptureHandoffStream` has exact order `streamRole`, `watchdogInstanceId`,
`watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `checkpointSequence`,
`checkpointMonotonicNs`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`,
`lastEnvelopeSha256`, `latestHeartbeatSequence`, `latestHeartbeatMonotonicNs`,
`latestHeartbeatEnvelopeSha256`, `running`, `sealed`:

| Field group | Rules |
|---|---|
| Role and four IDs | Equal the immutable values in every envelope of the verified prefix |
| `checkpointSequence` / `envelopeCount` | Nonnegative safe integers; sequence equals the last verified prefix envelope and count equals sequence plus one |
| `checkpointMonotonicNs` | Canonical nonnegative decimal sampled atomically by the watchdog; no earlier than the prefix's last envelope and no more than 1,500,000,000 ns after the latest heartbeat |
| Kind counts | Equal the verified prefix's observation and heartbeat record counts |
| `lastEnvelopeSha256` | Digest of the exact final envelope line in the verified prefix |
| Latest-heartbeat fields | Identify the prefix's actual latest heartbeat sequence, monotonic value, and exact-envelope digest |
| `running` / `sealed` | Literal `true` / literal `false` |

Handoff bytes use the pretty canonical serializer. Its companion is the lowercase SHA-256 of
those exact bytes plus one LF. The verifier may read that immutable prefix while later pairs
continue to append and MUST ignore them when constructing the handoff. After writing and
re-reading both files, the same verifier sends exact `checkpointRequestId` and `handoffSha256`
through runtime control `anchor-handoff`; the supervisor sends matching stream controls through
each byte-identical adapter relay. Each watchdog appends exactly one canonical `handoff-anchor`
pair, returns its exact result through the byte-identical reverse relay, and continues its chain.
The verifier waits for and validates all three results/anchors before
`verify -- checkpoint` succeeds; heartbeat and payload appends remain unblocked throughout.

Continuation verifies both handoff files, the complete checkpoint prefix, every intervening
pair, and the sole anchor. The first later envelope in each stream must retain all IDs, use
checkpoint sequence plus one, and use `lastEnvelopeSha256` as `priorDigest`; the anchor may
follow already-queued post-prefix pairs but occurs exactly once before stop. Any replacement,
alternate-valid-prefix rewrite, handoff rewrite, missing/duplicate/mismatched anchor, stale
barrier, extra field, mismatch, or noncanonical byte invalidates the paired study. Rewriting a
valid prefix and handoff to a different valid digest cannot rewrite the supervisor-retained
anchor binding.

### StudyContinuityWitness

Only the final verifier writes `capture/study-continuity-witness.json` and its companion after
validating three supervisor-observed adapter exits, three accepted adapter-observed watchdog exit
attestations, two supervisor-observed orchestrator exits, and every accepted moderator-observed
reviewer exit attestation, and receiving the authenticated witness after the supervisor removes
the external listener/socket, independently proving that removal, and failing to reconnect. The fresh canonical root
has exact property order `schemaVersion`, `controlSessionId`,
`studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `checkpointRequestId`, `handoffSha256`, `processes`,
`orchestrators`, `ephemeralReviewerProcessExitCount`, `runtimeControlRemoved`:

| Field | Rules |
|---|---|
| `schemaVersion` | Literal `1` |
| IDs, commitments, and digests | Equal capture start, handoff, supervisor state, current independently revalidated bindings, and exact canonical handoff bytes/companion |
| `processes` | Exactly six fixed entries: watchdog then capture for each fixed stream role; identities equal accepted registrations; watchdog exits come from matching accepted adapter parent-OS attestations and capture/adapter exits from supervisor direct OS observation |
| `orchestrators` | Exactly two entries, study-harness then scoring-moderator, each with exact `processRole`, `componentRunId`, `exitCode`, `signal`; IDs equal start and supervisor-direct exit is `0`/`null` |
| `ephemeralReviewerProcessExitCount` | Nonnegative safe integer exactly equal to `reviewVoteCount`; every counted one-use collector has distinct registered and clean-exit attestations from moderator parent-OS observation, ACKed before outcome, and none remains live |
| `runtimeControlRemoved` | Literal `true`; the verifier also independently proves endpoint disappearance before writing |

Each process entry has exact property order `streamRole`, `processRole`, `instanceId`,
`processRunId`, `stopEnvelopeSha256`, `exitCode`, `signal`. `processRole` is `watchdog | capture`;
IDs equal the uninterrupted stream envelopes and supervisor launch records;
`stopEnvelopeSha256` equals that stream's exact terminal envelope digest; `exitCode` is literal
`0`; and `signal` is literal `null`. All six combinations occur exactly once. Open,
replacement, restarted, signalled, unknown, or nonzero-exit state fails before witness output.
The three supervisor-observed adapter exits, three accepted adapter-observed watchdog exits, and
two supervisor-observed orchestrator exits are the exact eight long-lived clean exit facts
required at stop; the model makes no supervisor-OS-observed grandchild claim.

Witness bytes are exactly `Buffer.from(JSON.stringify(canonicalWitness, null, 2) + '\n', 'utf8')`;
the companion is the lowercase SHA-256 of those bytes plus one LF. Neither witness
contains nor permits a path, PID, endpoint, token, challenge, key, identity tuple, raw exit
text, runtime handle, or retention handle. A failed or partial finalization writes neither
witness nor seal.

### StudyCaptureSeal

`StudyCaptureSeal` is produced only after the exact twenty-subject-by-four-workflow terminal set
is complete, after each stream has a valid terminal `capture-stop`, and after the verifier has
validated the continuity witness and clean termination of all six watchdog/capture processes. It
also requires clean termination of both orchestrators and every ephemeral reviewer collector. It
is a fresh canonical object with
exact root order `schemaVersion`, `controlSessionId`, `studyRunId`,
`workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
`studyInputManifestSha256`, `handoffSha256`, `continuityWitnessSha256`,
`automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`, `reviewVoteCount`,
`reviewDisagreementCount`, `reviewerCriticalIssueCount`, `criticalIssueCount`,
`zeroCriticalIssueGate`, `streams`:

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versions fail closed |
| `controlSessionId` | opaque ID | Equals capture start, handoff, witness, and the one uninterrupted supervisor session |
| `studyRunId` | opaque ID | Equals every start payload and cannot be reused for a rerun |
| `workRootIdentityCommitment` / `candidateIdentityCommitment` | lowercase HMAC-SHA-256 | Equal capture start, handoff, witness, and supervisor-verified current runtime identity tuples |
| `candidateSha256` | lowercase SHA-256 | Equals every start payload and the exact installed candidate |
| `studyInputManifestSha256` | lowercase SHA-256 | Equals every start payload and the verified canonical manifest companion |
| `handoffSha256` | lowercase SHA-256 | Equals the handoff pair, all three anchor payloads, all three stop payloads, and witness; the handoff and witness bind the one checkpoint request ID |
| `continuityWitnessSha256` | lowercase SHA-256 | Equals the exact canonical witness bytes and companion |
| seven critical aggregate fields | nonnegative safe integers plus final boolean | Independently recomputed by the exact equations below; no declaration establishes itself |
| `streams` | exact three `StudyCaptureStreamSeal` records | Fixed stream-role order; no missing, extra, duplicate, or reordered role |

For every distinct nonworkflow `prohibited: true` correlation, construct tagged issue ID
`automatic:<correlationId>`; correlated stream copies deduplicate. Workflow-N/A pre-readiness
observations and candidates in successful workflows remain in this set; link use/non-use neither
suppresses nor duplicates them. For every workflow row with
disposition `reviewer-confirmed-critical | reviewer-disagreement-critical`, construct tagged ID
`reviewer:<subjectId>:<workflowClass>`. Prefixes make classes disjoint; IDs deduplicate within a
class. Let `A` and `R` be those set cardinalities, `S` count workflow rows with disposition
`reviewer-cleared | reviewer-confirmed-critical | reviewer-disagreement-critical`, and `D` count
disagreement. Then `automaticCriticalIssueCount=A`, `suspectedWorkflowBlockerCount=S`,
`reviewVoteCount=2*S`, `reviewDisagreementCount=D`, `reviewerCriticalIssueCount=R`, and
`criticalIssueCount` is the tagged union cardinality, equal to `A+R`. An `automatic-critical`
workflow row creates no reviewer ID; only its separate automatic correlation counts. Threshold
failures and cleared failures add no critical issue. Every automatic disposition must link to that exact
already accepted correlation under the context rules. `zeroCriticalIssueGate` is true iff
`criticalIssueCount===0` and the exact 20-by-4 terminal workflow set is complete, even though a
seal already requires that set. Missing/invalid review or protocol state prevents seal creation.

Each stream seal has exact property order `streamRole`, `watchdogInstanceId`,
`watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `firstEnvelopeSha256`,
`lastEnvelopeSha256`, `streamRootSha256`:

| Field | Type | Rules |
|---|---|---|
| IDs and `streamRole` | values from every envelope in that stream | All are constant, unique where required, and equal the fixed stream slot |
| `envelopeCount` | positive safe integer | Equals terminal sequence plus one and the number of retained envelope/payload pairs |
| `payloadRecordCount` | nonnegative safe integer | Equals both observed `recordKind: payload` records and the terminal payload's declared count |
| `heartbeatRecordCount` | positive safe integer | Equals both observed heartbeat records and the terminal payload's declared count |
| `handoffAnchorRecordCount` | literal `1` | Equals the sole canonical anchor and terminal payload's declared count |
| `firstEnvelopeSha256` | lowercase SHA-256 | Digest of the exact sequence-0 envelope bytes including LF |
| `lastEnvelopeSha256` | lowercase SHA-256 | Digest of the exact terminal envelope bytes including LF |
| `streamRootSha256` | lowercase SHA-256 | SHA-256 of the nonempty concatenation `envelopeBytes` then `safePayloadBytes` for every pair in sequence order; never accepted as a substitute for pair-by-pair verification |

Seal bytes are exactly `Buffer.from(JSON.stringify(canonicalSeal, null, 2) + '\n',
'utf8')`. Its companion is exactly the lowercase SHA-256 of those exact bytes followed by
one LF. The release verifier reconstructs rather than trusts all derived fields:

| Verification stage | Required recomputation | Failure condition |
|---|---|---|
| Bundle closure | Enumerate `bundleRoot`, rebuild every entry digest and canonical manifest/digest | Any departure from the exact 16-member set, bilingual pair, role, bytes, or digest |
| Payload privacy and canonicality | Reconstruct the kind-specific safe object and compare its exact bytes and digest | Unknown/extra field, noncanonical bytes, prohibited raw value, kind mismatch, or digest mismatch |
| Per-stream identity and chain | Rebuild every envelope, sequence, prior-envelope digest, payload digest, all-envelope nondecreasing monotonic order, and the exact four heartbeat gaps without payload masking | ID/role change, over-limit gap, regression, missing/duplicate/reorder, truncation, restart, stitch, or payload-masked liveness failure |
| Handoff anchoring | Recompute the handoff pair, require one matching anchor in each stream, compare supervisor anchor state, and reject an alternate valid prefix/handoff | Missing/duplicate/reordered anchor, anchor/handoff mismatch, prefix rewrite, or post-anchor handoff replacement |
| Terminal closure | Require sole start, sole handoff anchor, and sole terminal stop; recompute stop study/handoff bindings, preceding-envelope digest, final sequence, total/kind/anchor counts, continuity, exact counts/root, three supervisor-direct adapter exits, three accepted adapter-OS watchdog exit attestations, two supervisor-direct orchestrator exits, and moderator-OS-attested `ephemeralReviewerProcessExitCount === reviewVoteCount` | Premature/missing stop, any stop/witness binding mismatch, wrong exit source/cardinality/equation, open process, replacement, non-clean exit, or evidence appended after stop |
| Cross-stream seal | Rebuild the three fixed stream seals, independently recompute all seven critical aggregates from sealed ledgers, and rebuild the root seal from the same session/study/identity/candidate/manifest/handoff/witness values | Missing/extra/reordered stream, mismatched session/run/commitment/digest/count/aggregate, noncanonical seal, or any derived-field mismatch |

No failed or partial stream can be replaced, concatenated, or cross-stream stitched. Any
failure invalidates the complete SC-001/SC-006 evidence pair and requires a fresh study run
with new process-run, instance, and study-run IDs.

## State transitions

Every `partial` token in the following transition diagrams means only the file-confined
`partial` outcome in the Closed Scan Publication Outcomes table; it never denotes
provisional work or a resource-failure result.

### Repository source

```text
idle -> scanning (waiting or active) -> ready
                                    -> partial
                                    -> failed (bootstrap snapshot remains committed and current)

ready/partial -> scanning (waiting or active) -> ready/partial
                                              \-> failed/stale (creates this Source's entry)

failed/current -> scanning (waiting or active) -> ready/partial
                                               \-> failed/stale (creates first stale entry)

failed/stale -> scanning (waiting or active) -> ready/partial (clears this Source's entry + diagnostic)
                                             \-> failed/stale (replaces this Source's entry + diagnostic)
```

### Tool-specific Global sources

```text
0 sources -- consent preview --> 0 sources (no Source or I/O)
0 sources -- registered initial enable --> globalEnableInProgress; validate all 3 frozen entries operation-locally
0 admitted roots ------------> active-no-job (active control, no Source/generation)
1..3 admitted roots ---------> atomic queued acceptance + batchStatus(waiting/id) --> running --> one atomic Global generation containing every ready/partial Source
                                                                        \-> failed(tool failures or the failed request's error; same id)
exact retryable subset ------> same atomic batch lifecycle; lexical-ineligible controls require disable/new preview
unexpected pre-accept throw/rejection --> ordinary request error; no subset Source/generation from the transaction
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                     \-> failed/stale (creates own entry)
failed/stale -- accepted per-source rescan --> scanning --> ready/partial (clears own entry + diagnostic)
                                                     \-> failed/stale (replaces own entry + diagnostic)
active Global control (0..3 Sources) -- disable --> disabling barrier --> inactive / 0 Sources (Global sequence discarded; commits nothing)
                                                                  \-> failed + retained error --> retry disable
initial enable only -- disable --> cleanup-only barrier --> inactive / 0 Sources (no committed state changed)
                                                  \-> failed + retained error --> retry disable
```

Enabling requires a matching `GlobalConsent`. Disabling executes the coordinator barrier
and discards the entire Global sequence: all tool-specific Global files, generation
diagnostics, control-owned lifecycle diagnostics, comparisons, and source text.
`remove-active-state` commits no generation and never touches the Repository sequence, its
generation, or its IDs; operation-local `cleanup-only` changes no committed state. A later
re-enable starts a fresh Global sequence at generation 1 under the incremented
`globalContentEpoch`. A post-acceptance failure keeps the barrier/fence and error recoverable
until a later disable succeeds.
The lexical consent preview is not a `Source`; an accepted enable may commit at most one
Source for each admitted tool, each with one root, and every Source in that admitted subset
appears in the same Global generation. All are absent again after the applicable disable terminal
commit. A
deterministically all-rejected initial enable commits no Source/generation and leaves every
pre-existing entry and derived snapshot state unchanged. A thrown/rejected enable reports
only the failed request's error and likewise commits none of its provisional subset. A failed explicit per-source rescan leaves that Source's prior committed graph
readable and marks the snapshot stale. In either case `progress` is null for any published
failed Source, and an actionable Diagnostic or the failed request's error explains the discarded
attempt according to failure kind. A fatal enable/rescan never commits its new or partial graph. The exact consent and
admitted roots remain as session control state so the user may retry or disable; no Source
falls back to a different root.

The `current`/`stale` suffixes in these diagrams describe whether that Source owns a
`StaleSourceFailure`, not the whole session: another Source's unresolved entry can keep the
top-level `snapshotState` stale while this Source is ready, partial, or current.

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> replaced/removed on next generation
          -> binary
          -> unreadable
```

No state transition writes to the source. Rescan creates new entities instead of mutating
old file records in place.

## Cross-entity invariants

1. Every generation-scoped DTO belongs to one session and its owning sequence's last
   committed generation; a detail request resolves its path against that generation and a
   path it does not hold returns the fixed `stale-resource` rejection. A commit
   invalidates only its own sequence's views. A fatal attempt publishes nothing and
   leaves the retained generation unchanged.
2. Exactly one Repository Source exists from bootstrap and its boundary is the
   selected Repository root: the exact captured invocation `process.cwd()` by default or
   the single `--root` value resolved against it. It is not required to be a Git root, and
   its label grants no read authority.
3. Global is disabled in every new process. A session has zero to three Global Sources,
   at most one each for Copilot, Claude, and Codex; every Source owns exactly one boundary
   confirmed for that same tool by the current allowlist consent.
4. Every accepted file path is admitted by a shipped static or typed derived rule below
   its Source root. A parsed value admits a candidate only when
   it satisfies that exact derivation rule; relationships and excluded rules never do.
   No client-supplied path string authorizes a read. Raw entry-name segments drive
   filesystem operations, and joined with `/` they are the published display path. Global traversal
   performs only the exact operations represented by the consent-bound `TraversalPlan`.
5. A discovered file has one `CustomizationFile` record per Source/generation, identified
   by its Source-relative Path, and at most one
   recognition for each tool/kind pair. Distinct paths are distinct inventory items with
   no physical-identity grouping (FR-024, FR-019). Different Sources,
   attempts, and generations read independently.
6. Every readable file DTO returns its complete authored `sourceText`, except a carrier's:
   a file admitted so its declarations can be published returns those declarations and no
   `sourceText` at all (spec.md FR-007). Every returned
   declared value is the value the parser resolved for that declaration, while a
   documented default has null authored text and an explicit origin. Comparison uses each
   declaration's resolved value and `(kind, declared key)`, with tool recognition
   compared per tool beside the declarations.
   Environment references remain literal and never cause a process-environment
   lookup or substitution. Session Diagnostics may carry only their actionable
   location fields.
7. Documentation status, authored/installed state, selection, trust, enablement, and other
   condition facts remain orthogonal and provenance-specific; none is collapsed into
   “effective configuration” or a lossy recognition-level winner.
8. Typed derivation is exactly one closed derived-rule edge per derived admission record;
   generic relationships and derived admissions never seed it. An independent static
   admission remains eligible even when its file also has a derived admission.
9. Every file-originated relationship names one recognition and one admission record;
   only that record's matched path may be used as the base of a relative target.
10. Resource capacity is inherited from Node.js, parser libraries, the browser, the
    operating system, the filesystem, and the execution environment. The Inspector defines
    no product-specific byte/count/depth/queue/deadline ceiling and never turns an
    environment capacity failure into a customization-validity verdict.
11. Browser editor models use opaque in-memory identities, never filesystem or remote URLs,
   and never retain source beyond the active route and generation. Source and comparison
   surfaces carry no notice about what content may contain, and no confirmation step stands
   in front of a detail request or a comparison (FR-027), because
   the session API is reachable only through the loopback-bound local host and that binding is
   the whole boundary.
   A transport-reported channel loss or unsupported protocol on the current RPC,
   a session mismatch, the Global-disable pre-send action, or a response-observed greater
   Global epoch/non-null fence invokes the central purge and removes all
   application-held session content. Every ordinary response applies its request-token,
   `clientDataEpoch`, session, Global-epoch, and fence guards, so a response cannot revive
   an older generation or purged state. Page-lifecycle events invoke neither purge nor
   refetch, and the client installs no visibility or unload listener. The transport reports
   host loss without a separate liveness probe, polling interval, or product-specific
   wall-clock guarantee for a continuously idle visible page.
12. Every behavior, rule, strategy, and source ID is defined exactly once in its owning
    bilingual contract and executable registry. A record's own `evidence` citations equal
    the owning row's direct Evidence cell and are reciprocal with the official-source
    reverse index. No DTO carries a citation, a documentation status, or a lifecycle
    qualifier: they are maintenance records the product never reads. A missing, duplicate,
    orphaned, or language-divergent record fails the build.
13. Vendor lookup bases/traversal and Inspector matchers are different record types. Every
    Repository matcher is an authored typed segment program based at the selected
    Repository root; an `ANY_DIRECTORIES` segment can mean only explicit downward
    Inspector inventory—not vendor traversal or runtime selection—and a leading one is
    authored only for a location the vendor documents at any depth through a worked-file
    or descendant anchor. A vendor lookup that
    runs upward terminates at that same selected root, so it contributes exactly one
    in-scope layer and is never a selector token
    either.
14. `snapshotState` is derived from session-owned `staleFailures`, never stored in or used
    to mutate a committed generation. Each entry names one Source and carries its
    current actionable failure reference (a lifecycle `Diagnostic` or the failed request's
    error message); no `ScanAttempt` or
    working-set member is reachable from it. Only a successful complete/partial
    scan of that Source or removal of that Source clears its entry and failure reference,
    while unrelated commits preserve both.
15. The coordinator lock linearizes the generation and payload of every session snapshot
    and file-detail envelope. Network delivery may occur later, but cannot relabel the
    captured payload. Client request tokens, generation, epoch, and file existence are all
    rechecked at adoption time.
16. A Global preview retains the raw `lexicalRoot` and its escaped `displayRoot` only in
    process memory as the one record behind its `previewId`, and uses that stored raw value
    for admission.
    Escaped `displayRoot` is presentation only and environment input is never reread by enable.
17. Product-issued mutation-capable filesystem operations and open flags are absent. Tests
    compare content, length, identity/link state, mode, mtime, ctime, and observable xattrs/
    ACLs. OS-only atime changes are recorded separately and prove neither mutation nor
    safety.
18. Syntax parsing, reading the value a parser resolves for a declaration the recognized
    kind publishes, frozen-catalog classification, and documented structural projection are the only
    interpretation operations. No DTO or internal projection can express natural-language
    interpretation/ranking, customization validity/correctness/effectiveness/compliance/
    quality, policy/remediation advice, lint/sync/convert/format/fix behavior, or a size-based
    valid/invalid verdict.
19. The coordinator serializes scans. Global disable is a priority
    barrier that revokes publication authority; late results after disable or shutdown can
    never publish.
20. Every source scan has one `scanRequestId` shared by Source, progress, attempt, response,
    and any committed scan generation. Disable or shutdown revocation prevents every late
    result from publishing without claiming physical kernel-I/O cancellation.
21. Release usability evidence is closed and privacy-safe: the canonical manifest covers
    exactly the 16-member bilingual `StudyInputBundle`, and exactly the three fixed capture
    streams bind one control session, study run, both runtime identity commitments, candidate
    digest, and manifest digest. Only closed canonical
    `StudyCapturePayload` bytes are retained or hashed; prohibited raw values never enter an
    evidence artifact or digest preimage. Every one of the twenty participant distributions
    is closed to byte-identical `study-inputs/` and descriptor-complete `repository/`
    namespaces, materialized only by the descriptor-bound repository scripts, and independently
    recomputed from the exact closed output paths, encodings, byte representations, and
    digests; no unmanifested byte, extra namespace, or file-identity/path alias is permitted. Release
    approval requires recomputation of every payload/envelope chain, the handoff and exactly
    one anchored handoff digest per stream, the exact eighty subject/workflow terminal records,
    the `StudyContinuityWitness`, and the cross-stream `StudyCaptureSeal` after all three
    terminal stops, the exact eight long-lived clean-exit facts (three supervisor-direct adapter
    exits, three accepted adapter-OS watchdog exit attestations, and two supervisor-direct
    orchestrator exits), all distinct moderator-OS-attested clean ephemeral reviewer exits with
    exit count equal to review vote count, and verified runtime-control teardown.
    Missing, extra, drifted, aliased, noncanonical, restarted, unclosed, privacy-unsafe, or
    stitched evidence invalidates the complete paired study.
