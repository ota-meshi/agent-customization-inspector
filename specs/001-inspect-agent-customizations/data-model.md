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
├── Source (zero to four Global; at most one per member)
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
| `sources` | `Source[]` | DTO | Exactly one Repository; zero to four Global, with at most one for each member — Copilot, Claude, Codex, and the shared agent home (FR-045) |
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
| `kind` | `repository \| global` | Exactly one Repository source; zero to four Global Sources |
| `member` | `copilot \| claude \| codex \| agents \| null` | Repository pairs with null; each Global Source pairs with exactly one member of the fixed four-member set — the three supported tools plus the shared agent home — and no two Global Sources share a member |
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
| `member` | `copilot \| claude \| codex \| agents \| null` | internal | Must equal the owning Source's already-published member; Repository uses null |
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
(U+061C, U+200E, U+200F, U+202A–U+202E, U+2066–U+2069), lone surrogates, and
default-ignorable code points such as U+200B without
changing the stored value: the formatting characters reorder the text around them, so a
path carrying one would render as a different path than the one it identifies, a
lone surrogate draws as the one replacement glyph, so two names differing only in which
surrogate they carry would render identically, and a default-ignorable code point draws
nothing at all, so a name carrying one would render as the name without it. Whitespace is
deliberately left as authored, because a space is a character a reader recognizes; a path
label whose every character is whitespace is instead spelled out in full, because a label
that renders as nothing leaves its control with neither visible text nor an accessible
name, and so is any value a surface that collapses whitespace would draw ambiguously. On the wire, `sourceRelativePath` serializes only the `value`
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

Each session creates one startup capture before editor-launcher discovery. The host reads
the three environment properties exactly once in the fixed order `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, `CODEX_HOME`. Only a captured JavaScript `undefined` means absent;
every string, including `''`, is a present override. The host calls the
already imported `node:os.homedir()` exactly once for that session — the shared agent
home always derives from it — and retains its exact returned string as `capturedHomedir`. It does not read or
choose `HOME`, `USERPROFILE`, or another platform home input itself; the Node.js API owns
that platform behavior.

The fixed mapping is Copilot → `COPILOT_HOME` or
`node:path.join(capturedHomedir, '.copilot')`, Claude → `CLAUDE_CONFIG_DIR` or
`node:path.join(capturedHomedir, '.claude')`, and Codex → `CODEX_HOME` or
`node:path.join(capturedHomedir, '.codex')`. Each join occurs at most once and only for an
absent property in that session. It is lexical and performs no existence check or other filesystem
operation. Its exact string becomes `lexicalRoot`; empty, relative, NUL-containing, or
otherwise unrepresentable results remain strings and receive the closed lexical input state
instead of another fallback. If environment access, `homedir()`, joining, retention,
classification, or presentation encoding throws or cannot produce the required string, startup
fails ordinarily with that ownerless error before a session or browser exists. It creates no
preview, `scanRequestId`, consent, root, Source, or authority. A successful capture is retained
unchanged for the whole session. Its eligible roots join the selected Repository root as the
complete launcher-exclusion set, while the capture itself creates no preview or authority.

### GlobalConsentPreview

The session API consent route creates every preview from the session's one retained
`GlobalRootInputCapture` without rereading process inputs. Creating or returning it performs
no filesystem operation under any proposed Global root. Complete preview-object construction
is atomic: a construction throw/rejection fails that create request ordinarily before
acceptance, leaves the prior current preview unchanged, and creates no job or authority. Once
the complete object has been retained, a DTO- or transport-serialization throw/rejection is the
request's ordinary error and may leave that newly created preview current; it still creates no
job or authority.

| Field | Type | Rules |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | Canonical encoding of an independent 32-byte CSPRNG draw and a process-memory lookup key; a new preview invalidates the previous unconsented preview, while active consent freezes and reuses its exact preview |
| `previewEpoch` | non-negative safe integer | Internal and never serialized; records the creation order by incrementing with every newly created preview, but is not carried or compared by an enable operation because `previewId` identifies the current record and the operation registration prevents its replacement |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | date string | Version of the shipped typed traversal-plan set; with `allowlistVersion` this record-level pair identifies the closed selection policy and canonical selector programs the preview binds |
| `entries` | exactly four member entries | Fixed Copilot, Claude, Codex, shared-agent-home order |
| `entries[].member` | member enum (`copilot \| claude \| codex \| agents`) | Closed value; `agents` is the shared agent home (FR-045) |
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

The host applies `RootPresentationEncoding` while building the session-start capture, without changing the retained raw value. Its
ability to allocate that value is inherited from Node.js, the operating system,
and the browser. A throw/rejection before the complete capture is retained follows the ownerless
startup-failure rule above, before a session or browser exists and without a preview,
`scanRequestId`, normalization, canonicalization, root creation, or read. It does not create a
size-based input state. The preview is the one server-retained record identified by its
opaque `previewId`; neither root field is nullable, and no encoding step relies on
reversing an escape or on Unicode normalization. An invalid environment value is
escaped and displayed but is not normalized into an authorized path. Present-empty,
relative, and invalid entries use only fixed preview presentation and create no retained
`Diagnostic`. After confirmation all four entries receive a `GlobalToolControl`; only an
`eligible` entry may enter post-consent admission and later produce a tool failure
Diagnostic. A lexical-ineligible control is a path-free rejected control whose fixed
reason remains visible through the frozen preview. Every absolute spelling is `eligible`
regardless of whether it lies outside the ordinary home; that location alone neither
rejects it nor grants pre-consent I/O. Only an absent setting selects the documented
default. An empty, relative, invalid, or post-consent rejected setting never creates
fallback authority.
Admission uses only the stored internal raw `lexicalRoot`; it never uses `displayRoot` as a
path and never rereads the environment. The synchronous preview creation/retrieval handlers
linearize with enable registration without another operation field. While consent is active, an initial `GlobalEnableOperation` is registered,
or a non-complete `GlobalDisableOperation` retains its preview fence, retrieval returns the
same DTO-visible object byte-for-byte in field semantics,
including its ID, and never rereads the environment or creates a replacement.
Only when neither condition holds may a request create a new preview from the retained capture,
increment `previewEpoch`, and replace the prior unconsented preview. Complete construction must
finish before that replacement; a later DTO- or transport-serialization failure may leave the
new complete preview retained. If an initial operation terminates
without activating consent, its freeze ends only after the operation unregisters. This is
the only recovery path for redisplaying exact consent after a client purge and prevents an
in-flight enable from committing authority for an unreachable preview.

### GlobalConsent

| Field | Type | Rules |
|---|---|---|
| `allowlistVersion` | date string | Must equal the displayed current contract |
| `previewId` | opaque string | Must match the current in-memory preview exactly |
| `confirmedTools` | exact `[copilot, claude, codex, agents]` | Server-derived fixed member set matching all four frozen entries; the request contains no selector and cannot narrow it |
| `confirmedAt` | `UtcTimestamp` | Memory only |
| `active` | boolean | Cleared when Global inspection is disabled and all member Global Sources are removed |

Consent authorizes only the paths shown in the allowlist contract. It does not authorize
neighboring settings, credentials, state, skills, plugins, or arbitrary env paths.
The confirmation command contains no member list: after verifying the frozen preview, the
server derives all four members in closed order, including entries already known lexically
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
exactly N+1 — regenerating the generation-owned IDs of the Sources it publishes — carried
Sources keep their records and IDs — and invalidating the Global sequence's old
file/detail/comparison/editor state through the snapshot that adoption replaces; the Repository sequence, its
generation, its IDs, and its views are untouched. A different preview or root requires disabling
Global inspection first; a request with no retryable tool is rejected as closed conflict
`no-retryable-global-tool`.

Post-consent root admission can admit zero to four members. The serialized coordinator
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
| `member` | member enum | Exactly one of each Global member exists while consent is active |
| `previewId` | opaque string | References the active frozen preview and cannot be changed in place |
| `state` | `unvalidated \| rejected \| admitted \| published` | All four provisional operation-local controls begin `unvalidated`, but that state is never serialized in an active `GlobalControlView`; lexical-ineligible entries become rejected without filesystem I/O, `admitted` has passed readable-directory admission but has no published Source, and `published` has exactly one Source |
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
| `confirmedTools` | exact `[copilot, claude, codex, agents]` | Fixed all-members consent set; never client-selected |
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
| `previewId` | opaque string | Must equal the frozen consent preview for the whole operation |

The record holds these three fields and nothing more; each invariant the operation needs is
held by a mechanism that already exists rather than by a field of its own. One operation at a
time is the registration itself, which refuses while a record stands. Continuation across an
asynchronous boundary is checked by comparing the session's current `operationId` with the one
registration issued: an operation the barrier cancelled or a later registration replaced no
longer matches, and its continuation publishes nothing. The preview an operation is bound to
is the domain's own current object, identified by `previewId`. The evaluated member set is
derived at settlement — the fixed four for an initial enable, the server-derived
`retryableTools` subset for a retry — and never carried from the client. The `scanRequestId`
belongs to the batch the settlement queues, and is published on `batchStatus`. What the
operation resolved to is the settled `GlobalEnableResultDto.state`, `queued` or
`active-no-job`; a barrier that cancelled it answers the fixed `global-disable-pending`
conflict instead.

Initial enable synchronously registers
`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }` against the exact
current preview before the first asynchronous admission. That registration is the preview
freeze: the preview-creation route refuses replacement while the record stands, so the
operation carries and compares neither the preview object nor `previewEpoch`. The provisional
consent, four controls, candidate IDs, and admission outcomes remain operation-local and
unobservable; no `globalControl` or `pendingTools` mutation occurs before deterministic
validation of all four entries finishes. Retry likewise registers only the authority-free
`globalEnableInProgress { kind: 'retry', operationId, previewId }` projection. It does not
snapshot or mutate the active consent, controls, failed `batchStatus`, diagnostics, or pending
state during admission, so those values remain exactly as they were until an atomic batch or
active-no-job disposition commits. Root validation/admission and scan-job creation run only
under the coordinator. Before each eligible member probe, after that probe, after the complete
admission, and when synchronous settlement begins, a continuation proves only that the
registration still names the same `operationId`. No enable-specific command epoch, abort
signal, preview comparison, or duplicated state guard is required. Cancellation or disable
clears the registration, so every later check prevents the continuation from enqueueing work
or regaining authority.
At most one `GlobalEnableOperation` is running or queued. Deterministic lexical outcomes
and readable-directory admission partition the tools into rejected and admitted sets. Any
unexpected throw/rejection unwinds to the session API owner: initial
enable discards its operation-local values without activating consent/control, while retry
leaves the unmodified active state in place; neither commits a partial admitted subset and no
snapshot-restoration mechanism is needed. After every owned tool reaches a deterministic
validation outcome, synchronous settlement first validates the current operation ID. In that
same uninterrupted turn it constructs and atomically applies either the initial consent plus
four controls or the retry partition; chooses a candidate batch/`scanRequestId` and `queued`,
or no job/null ID and `active-no-job`; clears the prior `failureCode` for each tool admitted
into an accepted batch; creates its `batchStatus` and sets `pendingTools`; and unregisters the
operation. No observer can see a per-tool Source commit. If the disable barrier linearizes
first, it clears the registration; the post-admission or settlement-entry operation-ID check
then chooses `global-disable-pending` without mutating consent/control state. If settlement
begins first, its synchronous commit completes before a later barrier can interleave. Thus
either the operation wins with a committed queued acceptance, or the barrier wins with the
conflict, never both. Terminal operation history is not retained; the one accepted batch
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

A no-op disable with no active/queued Global authority and no retained disable failure uses
the ordinary single-stage response gate and mutates nothing. Otherwise request validation
and barrier registration linearize under the coordinator lock. On first acceptance,
`remove-active-state` is chosen exactly when public Global consent/control/Source state
exists; `cleanup-only` is chosen only when cancelling an operation-local initial enable that
has never published Global consent/control/Source state. A retry of a retained failure
inherits the failed operation's exact `commitKind`, `baseGenerations`, and removal intent;
the replacement operation resumes the same cleanup rather than
reinitializing it, and never recomputes `commitKind` from the already
partially cleaned public projection. It inherits no preview, because the preview was never
the operation's: the consent domain holds the one current preview object, and a barrier that
is not complete is what stops it being replaced. Thus a failed `remove-active-state` operation remains
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
the fixed `global-disable-pending` conflict, no queued Global command may dequeue, and preview
retrieval returns the domain's current preview without capture or replacement — even when
`globalControl` is null because only an operation-local initial enable existed. Only the
terminal success commit releases it. It is also a generation fence: no new
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
other local state. Per cited page it accepts UTF-8 HTML/Markdown, requires a direct `200`
from the citation's exact URL on its allowlisted host, and follows no redirect. A redirect,
wrong content type, missing or duplicate heading, unresolved or ambiguous served fragment,
decode failure, or a recoverable network/runtime failure is a hard drift-check failure.

A drift result never changes a behavior, rule, or strategy automatically. A maintainer
reviews every citing record and both language contracts/research, then explicitly updates
headings, paraphrases, and `reviewedOn`; no remote page text or response body is checked in.

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
| `operations` | non-empty ordered closed enum[] | Each entry is `append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| tighten-only \| filter \| retain-all \| unknown-order`; array order is the documented pipeline order, or the documented alternatives where a source states a per-key policy rather than a sequence — the Copilot CLI's repository layer lists one merge behavior per supported key. `tighten-only` states that a closer input may move a value in one direction only, which the source itself names. `retain-all` states that every documented input remains available and none is merged away — the absence of a collapsing entry does not state it, because the array records the steps a source documents rather than the steps it rules out |
| `documentationStatus` | `DocumentationStatus` | Partial/unknown/conflicting order never becomes a fabricated winner |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order; independent of documentation completeness |
| `evidence` | non-empty `EvidenceCitation[]` | The reviewed documentation establishing this record (§ EvidenceCitation); empty in a packaged CLI |

Strategies are immutable contract data. They explain documented composition and the
same-name outcomes derived from it, and cannot enumerate a directory, open a relationship
target, or merge the Inspector's Repository and Global sources.

### StructuredInspectorMatcher

| Field | Type | Rules |
|---|---|---|
| `base` | one exact Source-boundary descriptor | Repository or the named consented member Global boundary; never inferred from a selector |
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
| `scannedSourceIds` | sorted opaque source ID[] | One for a Repository/per-Source Global rescan, one to four for an initial/retry Global batch, and empty for bootstrap |
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
additional transaction. If there is no member Global Source or graph, active consent
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
sequence — its committed generation, every member Global graph, and each
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
| `phase` | `waiting \| cancelling \| deriving \| enumerating \| reading \| recognizing \| complete` | In pipeline order: `waiting` means queued; `deriving` is a vendor's reader expanding what a seed at a pinned path declares — the configuration read that precedes the walk, which is where an admitted attempt starts; `cancelling` means a disable/shutdown abort is draining; none contains a path or source content |
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
| `skill` | One invocation name as one tool resolves it (FR-007): the name that tool's own documentation invokes the file by, which the admitting rule answers — the authored frontmatter `name` for Codex and Copilot, or the skill directory name when the file declares none; the skill directory whatever the frontmatter declares for Claude Code, prefixed root-relative when nested. A definition is one recognition — one per `(file, tool)` — so several files one tool invokes by one name are one entry listing each recognition as a definition, and one file whose tools invoke it by different names defines on each name's entry. Being a recognition, a definition states the surfaces of the documented behaviors its admitting rules rest on, exactly as a path-identified row's recognitions do (FR-009) |
| `MCP` | One declared server name: every `[mcp_servers.*]`-style declaration resolving that name — one per `(carrier, tool)` — is listed inside the name's row, so one `.codex/config.toml` contributes one declaration per server it declares, and a second carrier declaring the same name joins that name's row. A declaration's home is an explicit carrier and nothing else: a file of any other kind that spells MCP-looking configuration — a skill's or an agent's frontmatter, a settings file's inline map — is that kind's ordinary content, visible in its own detail, and joins no MCP row. Each declaration names its own file. The one row whose name is null closes the list with the carriers currently publishing no named declaration — an unreadable declaration block, whose rows are unknown, or a carrier declaring none |
| `instructions` | One applicability range of one Source: the glob the governing files' own paths derive, listing each file it governs with that file's recognitions — each one product and the surfaces of the documented behaviors its admitting rules rest on, because a tool alone cannot say where a product reads the file from. The Source is half the row's identity, so the repository's `**` and a consented home's `**` are two rows; the list shows them under one heading for that range, grouped into one block per Source family — the selected repository, and the reader's own configuration directories. A comparison is a pair of one block's files, so it may pair two consented homes and never spans two families (FR-011, FR-030). A block names its family only where the session carries more than one Source, and a file names the directory it was in only where its family holds more than one: with one, either would repeat the page's only answer |
| `rule` | The file itself: a rule file is modular instructions a product loads into context, and it declares no name a row could be keyed by nor governs a range it could be grouped under, so its Source-relative Path is the row's identity, and two products recognizing one file are two recognitions on one row, each naming its product and the surfaces of the documented behaviors its admitting rules rest on |
| `permissions` | The file that declares the policy, on the same terms as a `rule` row. A separate kind because the subject differs: a permission policy decides which commands or tools a product may run, where a rule is guidance the product reads. Codex spells its policy in `.codex/rules/*.rules` and Claude calls its own modular instructions `rules` too, so grouping by the vendors' shared word would put two unrelated subjects in one list. A file whose whole content is the policy and a file carrying the policy in one block of a larger document are one row each: what differs is what the detail publishes, not what the row is. A carrier that declares no policy is no row at all — the rest of the document is the recognition that owns it, and a row would state a policy its author never wrote |
| `prompt/command` | One name a reader invokes, on the same terms as a `skill` row: every recognition resolving that name — one per `(file, tool)` — is a definition listed inside the name's row, so a file two products invoke by one name is two definitions of that row and a file they name differently defines on each name's row. Which name that is belongs to the rule that admitted the file, because this kind's two locations answer differently. A command file's name is never authored — both products ignore a `name` key in one — so each product's own admitting rule derives it from the path: Claude Code takes the file's path below its command directory and turns every separator into a `:`, so `frontend/component.md` is `frontend:component` and `team/review/security.md` is `team:review:security`; a leaf whose stem is `skill` in any letter case takes its directory’s name instead of its own, which the product does and no page documents — the stem is compared without case while the `.md` extension is the one the matcher admits, so a `SKILL.MD` is not a command file here at all. The Copilot CLI takes the file name alone, having documented no namespace and reaching no subdirectory. The two therefore agree exactly at a root direct child, which is why such a file is one row naming both products while a nested one is a row of Claude's alone. A VS Code prompt file names itself instead: the documented `name` is what a reader types after the `/`, and the file's own name stands in when it declares none — so a prompt declaring the name a command resolves to is a definition on that command's row, the way two files of one skill name share theirs. A row states no same-name resolution, unlike a skill's. Two prompt files can now reach one name, and VS Code documents no outcome for that, so a row that answered would be answering a question no page asks — the definitions stand side by side and the reader sees both (FR-009) |
| `agent` | One agent name the admitting rules resolve: every file that defines it — one definition per `(file, tool)` — is listed inside the name's row, so two files resolving one name are two definitions of one row. The name is the one the admitting product identifies the agent by, and which fact that is differs by product: OpenAI Codex and Claude Code make the `name` field the agent's identity and call a matching filename a convention rather than a lookup — Claude Code adds that a subfolder inside the agents directory does not affect it either — so naming one of their rows after a file would report an agent the product does not have, while GitHub Copilot documents `name` as an optional display name and identifies a profile by its configuration file's own name minus `.md` or `.agent.md`, so naming one of its rows after a declared `name` would report an agent Copilot does not deduplicate under it. One file two products recognize therefore defines on two rows whenever their answers differ. A row states no same-name resolution, unlike a skill's: Claude Code documents that only one of two same-name files under one `.claude/agents/` tree loads and names no rule for which, so a row that answered would be answering a question no page asks — the definitions stand side by side and the reader sees both (FR-009). The one row whose name is null closes the list with the files publishing no name — under a product that identifies an agent by its declared `name`, one declaring none, one declaring anything but a scalar, and one whose declarations could not be read at all, whose name is unknown rather than absent (FR-028). A file-name product's definition never reaches it: the path answers whatever the file declares, and a failed extraction takes nothing away from it. A definition states the surfaces of the documented behaviors its admitting rules rest on, exactly as a skill definition does (FR-009); it is never a claim that a session spawned or selected the agent |
| `hook` | One declared lifecycle event: every declaration of that event — one per `(carrier, tool)` — is listed inside the event's row, on the same terms as an `MCP` row. A declaration's home is a carrier a rule admitted for its hooks, in either of the two documented forms: a file whose whole purpose is hooks, and a hook table inside a file admitted for other content too, which each declaration states as its own fact because one config layer can hold both and the vendor loads both rather than choosing between them. So one layer's standalone file and inline table declaring one event are two declarations of that event's row, and the row is where a reader sees that both are in play. A file of any other kind that spells hook-looking configuration is that kind's ordinary content, visible in its own detail, and joins no hook row — and so is a documented hook declaration that is part of what another customization is, such as a Claude skill's or subagent's frontmatter `hooks` or a plugin manifest's and catalog entry's: what a vendor documents as a hook location is not by itself a row here, because the customization that carries it already publishes the keys its file wrote. The one row whose event is null closes the list with the carriers whose emptiness is a finding — an unreadable hook block, whose events are unknown, and a carrier whose whole purpose is hooks that declares none. A carrier that merely may contain a hook table and does not is on no row: saying so of every configured repository would state nothing about it, and would put the kind's tab on one with no hook anywhere. The row states no trust, review, or enablement: a non-managed hook must be reviewed against its current hash before a client will run it, which is runtime state this product never reads (FR-009), and nothing here runs a declared command (FR-020) |
| `plugin` | One plugin name as its admitting rule resolves it: every recognition resolving that name — one per `(carrier, tool)` — is a carrier listed inside the name's row, on the same terms as an `MCP` row. Which name that is belongs to the rule that admitted the file, exactly as a skill's invocation name does (FR-007): Codex addresses a catalog's offering as `plugin@marketplace`, so one name two catalogs offer is two rows. Another product's plugin phase resolves its own names. A carrier is a file that declares the plugin — a catalog whose entry offers it, or, for a product whose client reads one at a fixed path, the plugin's own manifest. A catalog is never a row of its own: it is the table that resolves a plugin name to the source that plugin comes from, which makes it a carrier of this kind. The row also carries the files the plugin ships — the plugin root its offering names, enumerated in full, the plugin's own manifest among them (contracts/inspection-path-allowlist.md § Bounded companion census). Those files acquire no rows of their own: the row states how many there are, and the carrier's own detail is where each is opened. A carrier that resolves no name at all joins the one null-named row, so its state stays a visible row rather than a file in no kind (FR-028). The row states no installation, enablement, trust, or cached copy: all four are User state this product never reads (FR-009) |
| `output style` | One style name a reader selects: every recognition resolving that name — one per `(file, tool)` — is a definition listed inside the name's row, on the same terms as a `prompt/command` row. Which name that is belongs to the rule that admitted the file, because it is the admitting vendor's own contract: Claude Code documents the file name as the style name unless the frontmatter sets `name`, and an authored empty name falls back like an absent one, because a picker cannot show a style by a name with no characters. Two project layers of one repository can define one name — the page resolves that by proximity to a session working directory this product never observes — so only the selected root's own layer is admitted and a row states no same-name resolution: the definitions stand side by side and the reader sees them (FR-009) |
| `settings/config` | The file itself, on the same terms as a `rule` row: a settings or configuration file declares no name a row could be keyed by and governs no range it could be grouped under, so its Source-relative Path is the row's identity, and two products recognizing one file are two recognitions on one row. A separate kind because the subject differs: what a product reads its settings from, where a rule is guidance it loads into context and a permission policy decides what it may run. One physical file can hold this row and another kind's — Codex's `.codex/config.toml` has one MCP row per server it declares and one row here for the document those declarations sit in — and which detail a link opens follows from the row it is on rather than from the file (FR-007) |

A CustomizationFile therefore publishes its own facts once — Source-relative Path, read
outcome, size, diagnostics — and each kind's inventory refers to it by its identity — the
Source that holds it and its Source-relative Path (FR-030) — rather than repeating them.
Every kind's row member — a skill definition, an MCP or hook declaration, an agent or
prompt or output-style definition, a rule, permissions, or settings row, a plugin
carrier — states its `sourceId` beside the path, because a Global member publishes every
kind and two Sources can hold one path (FR-015 through FR-018, FR-030). A companion is never a row of its own, whatever it carries (FR-003), so a
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

A skill row's name is the name one tool's own documentation invokes the file by (FR-007),
answered by the rule that admitted it because how a name follows from a path and a
declaration is that vendor's own contract. Codex and Copilot invoke the authored
frontmatter `name` — or the skill directory name when the file declares none or declares
it empty, because being a named directory is what a skill is, so every row has a name and
two such files in same-named directories share one. Claude Code invokes the skill
directory whatever the frontmatter declares, treating the authored `name` as only a
display label (skills page § How a skill gets its command name), and a nested skill's
command is prefixed
with the `/`-joined root-relative path of the directory holding its `.claude` and a `:`.
So `apps/web/.claude/skills/deploy/SKILL.md` declaring `name: ship` is `apps/web:deploy`
on its Claude Code row and `ship` on its Copilot one. A row headed by a name the tool
listed in it does not answer to would name something the reader cannot invoke, which is
why the row and the invocation name are one fact rather than two. The nested form is
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
the authored name unknown rather than absent, so a tool that invokes it falls back to the
skill directory — the path's own fact, not a reading of the failed parse. The row that
names is provisional grouping, and the definition evidences no same-name collision for
that tool. Claude Code's path-derived command name stands either way.

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

The sorted companion file list a skill's census produced is not on the details. The census
publishes its files as ordinary files of the generation, and the list is derived from those
paths where it is published, on the inventory definitions the file's recognitions back
(contracts/http-api.md `skills[].definitions[].companionFiles`): a second spelling on the
recognition would be a state able to disagree with those, and every definition of one
file — across tools and across entries — carries the same list, because the directory is the
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
beside the diff — and each side serializes to YAML, each comparison leading with the keys
the vendors document for its kind, in the order the page that publishes them does, and
sorting every other key (declaration-order.ts). The prompt-and-command comparison begins
with `description` because VS Code's prompt file format table does, not because this
product ranks it: that kind's row name stays the admitting rule's answer rather than one
declared key. The MCP kind's declarations are each recognizing tool's own reading
(§ Field reading), and their comparison surface is the declared server name's own — one
name's declaration in each of two carriers of its row, serialized to one canonical JSON
document per side and diffed in Monaco, loaded through two ordinary
`get-mcp-carrier-detail` reads (§ BrowserState · ComparisonSelection) — while each
detail renders its declaration content as the same serialized document in the file's own
key order (FR-007).

### Field reading

An extractor reports what its format's parser resolves a declaration to — one
documented, deterministic reading per admitted source form, and for the JSON family per
`(tool, path)`: YAML 1.2's core schema for a Markdown file's frontmatter, TOML 1.0 for the
`.codex/config.toml` carrier, and `JSON.parse` for every JSON carrier. That parse is strict
except where the reading's own client accepts comments, which is Copilot's editor: its
readings of `.vscode/mcp.json`, the root `.mcp.json`, the `.claude/settings.json` and
`.claude/settings.local.json` pair, and the `.github/hooks/*.json` files have comments and a
trailing comma blanked before the same parse, while any other syntax error still fails the
document whole. Which of the two a reading gets is a fact about the reader and the file
together rather than about the file, so one physical document can parse for the product
whose reader accepts comments and fail for the product that reads it strictly; the
recording of each answer, and what measured it, lives in the parsing seam. In every
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

A skill's detail surface leads with the skill, not with the file that carries it: the
skill's own directory as the heading — the one identity every product reading it shares —
and beneath it the name each recognizing product invokes the skill by, in the closed tool
order, read off the rows that hold the file (contracts/http-api.md § get-session
`skills[]`) rather than republished on the detail. A definition is one tool's
recognition, and one file two tools invoke differently is a definition of each name's
row; the page shows the file its URL selects — a detail URL is
`/skills/detail/<source>/<the SKILL.md's source-relative path>`, the skill's own identity, with the file
being read named in a `file` query beside it — so which document the page shows is the
link's identity rather than a preference. The skill is the address and the file is the
selection, because the page's subject is the skill: a companion has no page of its own to
be at, and giving it one made every URL work out which skill it belonged to before it
could say anything about it. No tool segment: two products reading one `SKILL.md` read the
same bytes, the same frontmatter, and the same companion directory, so a per-product
address would give one document two URLs differing only in a name. That
identity is stable across rescans and server launches — it is the URL's path half, so a
bookmarked link's path keeps naming the same file across rescans and across launches that
select the same root, because the Source-relative Path is the
file's identity on the wire and a detail request resolves it against the current committed
snapshot (FR-030); a launch that selects another root (FR-001) resolves it against that
root's scan, and the origin is devframe's port selection, fixed-default unless occupied
(quickstart.md), so a moved port changes where a bookmark points, never which file its
path names — and a path the current scan does not hold is
reported as a dead link. A root
`.claude` skill whose authored `name` differs from its directory is invoked by Copilot
under the authored name and by Claude Code under the directory-derived command, and the
page names both against their products. The published values are the projection's, so the
client renders vendor naming rather than re-deriving it. Then two tabs — the skill itself and its files. The skill
tab presents every key the frontmatter declares as one YAML document through the
read-only viewer — led by the keys the vendors document for a skill, in the order Claude
Code's own frontmatter reference publishes them, and every other key in the file's own
order; the block's own language, so a reader compares it
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
| `invocationName` | string | The name this recognition's own tool invokes the file by, answered by the admitting rule (§ Inventory unit, FR-007). Never empty: a rule that invokes the authored identity reads the `name` scalar as the parser resolved it (§ Field reading) and falls back to the skill directory when the file declares none, declares it empty, resolves it to anything but a scalar — naming a skill after the first item of a list it wrote would be an identity the file never declared — or when extraction failed; Claude Code's rule reads no declaration at all and takes the skill directory, root-relative-prefixed when nested. The authored `name` itself is not held here: it is one of the `frontmatter` entries below, so keeping it would publish a fact and something derived from it |
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
`isAbsolute` or state/presentation construction is an ownerless startup failure before a session
or browser exists and creates no capture or preview. No step normalizes the string, changes separators, calls the
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
  owning row's invocation name, the two compared copies' entry files'
  `sourceRelativePath` identities, and the copy-relative compared file, resolved
  against the owning sequence's current committed generation into zero files, two
  readable corresponding files, or one readable file beside its stated absent
  counterpart. The row is named rather than derived from the two identities, because
  two files can sit together on more than one row — the products invoke a skill by
  different facts, so a file declaring another's directory name as its own `name`
  puts both on both rows — and a derived row would be whichever the generation
  published first, dropping a third copy of the row the reader opened from out of the
  route's own switchers. The instruction route names the
  Source family it leads with and, per side, a Source and a `sourceRelativePath`
  identity (FR-030). The pair's owner is the block one applicability range holds for
  that family — the block the skill precedent's row becomes here, its range derived
  from the identities because a file governs exactly one range — so a pair may hold
  two consented homes' files and never spans two families. It resolves into zero or
  two readable files: an instruction file is complete in itself, so no side can be a
  stated absence, and a pair the owning block does not hold is reported rather than
  compared. The
  MCP route names one declared server name — the kind's row unit — and two carriers'
  `sourceRelativePath` identities that name's row of the current generation holds; a
  selection outside the named row, a name no current row is included, is reported
  rather than compared. Its pair is loaded through two ordinary
  `get-mcp-carrier-detail` reads, and what Monaco diffs is each side's declaration for
  the named server serialized to one canonical JSON document (research.md § 7): the
  carriers need not share a syntax and no carrier shows its bytes (FR-007), so the
  serialization is the one spelling both sides can be read in. The prompt-and-command
  route names two files' `sourceRelativePath` identities that one invocation-name row of
  the current generation holds — the row-owned pair again, the name row standing where
  the skill name's row stands, and derived from the two identities because no shipped
  rule lets one file resolve two names — resolved into zero or two readable files: a
  file of this kind is complete in itself, so no side can be a stated absence, and a
  pair no single row holds is reported rather than compared. One kind is one comparison
  surface, so the kind's locations meet on it: a VS Code prompt file stands opposite the
  command file whose name it declares. Beside the source diff, each recognizing tool's
  cell states the name that tool invokes that side's file by — this kind's own typed
  fact, because the admitting rule answers it and the kind's two locations answer
  differently — and a cell with no definition is the whole of that tool not reading that
  file. The hook route names one declared lifecycle event — the kind's row unit — and two
  carriers' `sourceRelativePath` identities that event's row of the current generation
  holds; a contained declaration is named through the file that carries it, because that
  file is what the row lists and what a detail request resolves, and a selection outside
  the named row, an event no current row is included, is reported rather than compared.
  Nothing a client decides at runtime is nameable, because no row holds such a value
  (FR-009). Its pair is loaded through two ordinary `get-hook-carrier-detail` reads, and
  what Monaco diffs is each side's declaration of the named event serialized to one
  canonical JSON document with every nested mapping's keys sorted (research.md § 7): one
  event can be declared by a TOML configuration layer and by a JSON settings document,
  and no carrier shows its bytes (FR-007), so the serialization is the one spelling both
  sides can be read in. A cross-source comparison always
  compares each source's last committed state. A file pair is loaded through two ordinary
  `FileDetail` requests and a one-sided skill comparison through one — the absence needs
  no request — and Monaco compares the complete `sourceText` values, the absent side
  empty, which renders the present content, line by line, as the difference it is.
  Literal differences, including credential-like strings and environment references,
  remain visible.
- `EditorModelState`: generation-scoped Monaco models with opaque in-memory URIs and
  complete authored `sourceText` — or, on a comparison whose sides are declarations
  rather than files, the canonical serialization of one declaration's parsed values,
  which carries the declared values in full and is purged under the same rules. The owning editor, subscriptions, and every model are disposed
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

### Member Global sources

```text
0 sources -- consent preview --> 0 sources (no Source or I/O)
0 sources -- registered initial enable --> globalEnableInProgress; validate all 4 frozen entries operation-locally
0 admitted roots ------------> active-no-job (active control, no Source/generation)
1..4 admitted roots ---------> atomic queued acceptance + batchStatus(waiting/id) --> running --> one atomic Global generation containing every ready/partial Source
                                                                        \-> failed(tool failures or the failed request's error; same id)
exact retryable subset ------> same atomic batch lifecycle; lexical-ineligible controls require disable/new preview
unexpected pre-accept throw/rejection --> ordinary request error; no subset Source/generation from the transaction
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                     \-> failed/stale (creates own entry)
failed/stale -- accepted per-source rescan --> scanning --> ready/partial (clears own entry + diagnostic)
                                                     \-> failed/stale (replaces own entry + diagnostic)
active Global control (0..4 Sources) -- disable --> disabling barrier --> inactive / 0 Sources (Global sequence discarded; commits nothing)
                                                                  \-> failed + retained error --> retry disable
initial enable only -- disable --> cleanup-only barrier --> inactive / 0 Sources (no committed state changed)
                                                  \-> failed + retained error --> retry disable
```

Enabling requires a matching `GlobalConsent`. Disabling executes the coordinator barrier
and discards the entire Global sequence: all member Global files, generation
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
3. Global is disabled in every new process. A session has zero to four Global Sources,
   at most one each for Copilot, Claude, Codex, and the shared agent home; every Source
   owns exactly one boundary confirmed for that same member by the current allowlist
   consent.
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
    the owning row's direct Evidence cell and resolve to the official-source row they
    cite. No DTO carries a citation, a documentation status, or a lifecycle
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
