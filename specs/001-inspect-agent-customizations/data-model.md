# Data Model: Inspect Agent Customizations

[日本語](data-model.ja.md)

The model has two representations:

- **Internal session records** may contain canonical paths, file descriptors during a
  verified read, raw bytes, and decoded authored content while an atomic snapshot is being
  built. They never enter operational diagnostics or logs.
- **Public DTOs** contain Source-relative locator fields for inventoried files and safely
  normalized in-Source targets, complete authored source text for readable files, exact
  returned declared-metadata/relationship source slices, escaped non-authorizing root
  presentation labels, recognitions, relationships, diagnostics, and opaque
  generation-scoped IDs. Environment-variable references in
  authored content remain literal text and never authorize reading process-environment
  values.

The checked-in release-evidence fixture manifest is test-only data, not a product DTO. Its
closed versioned schema contains unique stable case IDs; SC-003/004/005/007/009 criterion
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
├── OfficialSourceRecord
├── VendorBehaviorStatement
├── RuntimeCompositionStrategy
└── InspectionRuleRegistry
    └── InspectionRule

InspectionSession
├── Source (exactly one Repository)
│   ├── SourceBoundary (exactly one; root context absent until admission)
│   └── SourceConditionFact (zero or more; no originating file)
├── Source (zero to three Global; at most one per supported tool)
│   ├── SourceBoundary (exactly one admitted tool home) → owning GlobalToolControl
│   └── SourceConditionFact (zero or more; no originating file)
├── ScanAttempt (zero or more queued; at most one running; never public before commit)
├── ScanGeneration (exactly one last committed, session-wide)
│   └── CustomizationFile
│       ├── ScanEntryTicket + VerifiedReadReceipt (internal)
│       ├── ToolRecognition (one or more)
│       │   ├── DeclaredMetadataEntry (zero or more, ordered authored occurrences)
│       │   └── CandidateProvenance (one or more)
│       │       └── ApplicabilityAssessment
│       ├── Relationship (zero or more)
│       │   └── ApplicabilityAssessment
│       └── Diagnostic (zero or more)
├── StaleSourceFailure (zero or more unresolved explicit-rescan failures)
├── OperationError (zero or more outer-boundary failures; never a scan result)
├── GlobalConsentPreview (zero or one current lexical preview)
├── GlobalConsent (zero or one active record)
│   ├── GlobalToolControl (one per confirmed tool; owns an optional InspectionRootContext)
│   └── GlobalControlView (null or one recoverable public control DTO)
├── GlobalEnableOperation (zero or one running/queued cancellable command; internal)
├── GlobalDisableOperation (zero or one joined priority-barrier command; internal)
├── ClosableResourceRegistry (one process-wide internal ownership/state registry)
└── Diagnostic (session/source-level failures)

BrowserState
├── FilterState
├── ComparisonSelection (zero or exactly two readable files)
├── EditorModelState (zero or more, active route/generation only)
├── SensitiveContentNoticeState (session-only presentation state)
├── RecoveryViewState (control-only post-purge recovery and explicit resume)
└── SessionLivenessState (authorized-page lifecycle-check and purge state)
```

## Entities

### InspectionSession

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Random per process; not the API capability |
| `apiVersion` | literal `1` | DTO | Reject incompatible clients |
| `createdAt` | `UtcTimestamp` | DTO | Process start time |
| `sources` | `Source[]` | DTO | Exactly one Repository; zero to three Global, with at most one for each of Copilot, Claude, and Codex |
| `activeGeneration` | `GenerationNumber` | DTO | Identifies the last committed snapshot; monotonically increases only on a successful complete or contracted-partial commit |
| `snapshotState` | `current \| stale-after-fatal-rescan` | DTO | Derived from `staleFailures`; stale exactly while one or more explicit-rescan failures remain unresolved |
| `staleFailures` | `StaleSourceFailure[]` | DTO | One current entry may exist per published Source, sorted by Source; empty exactly while `snapshotState` is current |
| `globalControl` | `GlobalControlView \| null` | DTO | Null only when no active consent/control state exists; lets a freshly authenticated client recover immediate disable and preview-gated retry controls after a purge without exposing canonical roots |
| `globalEnableInProgress` | `{ kind: 'initial-enable' \| 'retry', operationId, previewId } \| null` | DTO | Read-only coordinator projection for any registered Global enable operation; contains no tool subset/outcome, root, context, source/boundary/scan ID, job, or authority and lets a fresh client suppress duplicate retry, refetch the frozen preview, and invoke disable |
| `globalDisableInProgress` | `{ operationId, state: 'draining' \| 'committing' \| 'failed' } \| null` | DTO | Read-only projection of a non-complete disable barrier, including when `globalControl` is null; contains no root/content/resource ledger, selects the control-only all-inspection-data fence, and lets a fresh client join or retry cleanup |
| `globalContentEpoch` | non-negative safe integer | DTO | Starts at zero and increments atomically on first acceptance of each non-no-op Global disable barrier; every liveness and inspection-data success is bound to it so the server rejects a success not yet linearized at the fence and clients reject older data after observing the greater epoch |
| `sensitiveContentWarning` | `{ messageKey, nextStepKey, acknowledgementScope }` | DTO | Fixed localized keys explain before source or comparison opens that complete authored content may contain sensitive values; scope is literal `authorized-browser-session` |
| `sessionDiagnosticIds` | opaque string[] | DTO | Current out-of-generation lifecycle diagnostics |
| `repositoryFailureDiagnosticId` | opaque session Diagnostic ID or null | DTO | Current deterministic automatic Repository admission/initial-scan failure; retained while the first explicit rescan runs, then cleared on success or atomically replaced by that rescan's `StaleSourceFailure` owner on terminal failure |
| `globalDisableOperationErrorId` | opaque Operation Error ID or null | DTO | Current post-acceptance Global-disable barrier failure, including when no consent/control DTO exists; cleared only by a later successful disable completion |
| `operationErrors` | `OperationError[]` | DTO | Current generic outer-boundary errors for accepted REST operations/jobs; never part of a generation or Diagnostic list |
| `capability` | 256-bit random token | internal | Constant-time comparison; never serialized in snapshots/logs |
| `previewDigestKey` | exactly 32 random bytes | internal | Independent HMAC key for Global previews; generated once at process-session bootstrap and never serialized, logged, persisted, or sent to a Worker/child process |
| `invocationCwd` | absolute platform path string | internal | Exact value captured once from `process.cwd()` before CLI validation; never changed or exposed as read authority |
| `cwdOptionValue` | exact string or null | internal | Null when omitted; otherwise the sole validated `--cwd` argument retained for lifecycle/audit correlation only; it is never used as a filesystem operand after lexical selection |
| `selectedRepositoryRoot` | parser-accepted absolute platform path string | internal | `invocationCwd` when `--cwd` is omitted; otherwise an absolute option retained or a platform-valid plain relative option resolved lexically against it only after the Windows pre-resolution rejection gate below; the result passes shared pure `LexicalAbsoluteRootParts` with zero selection-stage filesystem/network I/O, independently of the earlier fixed package-owned integrity reads |
| `closableResourceRegistry` | `ClosableResourceRegistry` | internal | Sole process-wide owner/state machine for every opened inspection `FileHandle` and `fs.Dir`; never serialized |

`InspectionSession` is the normal full snapshot and is returned only while
`globalDisableInProgress` is null. Once a disable barrier is accepted, the committed
generation and all Sources may remain internally for cleanup/retry, but every full session,
inventory, generation, Source, file, detail, Diagnostic, relationship, authored metadata,
and comparison route returns `409 global-disable-pending`. The session route instead returns
the separate control-only `GlobalFenceRecoverySnapshot` below. Each data handler captures
`globalContentEpoch`, fully constructs its success body, then under the coordinator lock
requires the epoch unchanged and the fence still null before binding it; otherwise it
discards the body and returns the conflict. A body completely bound before acceptance is
pre-fence-authorized and cannot be recalled; another tab may receive and adopt it until that
client observes the greater epoch/fence. This bounded in-flight residual is explicit, not a
claim of retroactive revocation. The browser purge below removes it after observation. A
`failed` disable never restores data access. Terminal success for `remove-active-state`
publishes the new Repository-only generation; terminal success for `cleanup-only` removes
the fence and re-exposes the unchanged preexisting generation. Process restart is the
fallback for unrecoverable cleanup.

### GlobalFenceRecoverySnapshot

This exact DTO is the only session response while `globalDisableInProgress` is non-null. It
contains `{ sessionId, apiVersion, liveness, globalContentEpoch, globalControl,
globalEnableInProgress, globalDisableInProgress, toolFailureDiagnostics,
lastGlobalOperationError, globalDisableOperationError }`. The disable projection is required
and non-null. `toolFailureDiagnostics` contains exactly the pathless session Diagnostics
referenced by `globalControl.toolFailures`; each optional error is exactly the record named by
its corresponding control/error ID. It has no generation, Source, Repository failure,
stale-failure, unrelated Diagnostic/error, file, path, authored value, or resource field.

The CLI captures `process.cwd()` exactly once. It rejects a missing/empty or duplicate
`--cwd`, any U+0000 code unit, and any unpaired UTF-16 surrogate before session creation.
On Windows it also rejects, before calling `resolve`, every explicit two-leading-separator
UNC/server-share or device spelling, single-separator current-drive/root-relative value, and drive-
relative value including `C:` and `C:foo`. Only a plain relative option is lexically
resolved against the captured anchored drive-form `invocationCwd`; an absolute drive option
is retained unchanged. POSIX retains an absolute option or lexically resolves a relative
option against the capture. The selected absolute result—including `invocationCwd` when the
option is omitted—must then pass the same pure `LexicalAbsoluteRootParts` parser used at the
authority boundary. Failure is a fixed startup argument/root error with zero filesystem or
network I/O and no session publication. This uses no `process.chdir()`, per-drive working
directory, environment reread, or filesystem I/O. At process start the session
publishes zero-I/O bootstrap generation 0 with empty files/diagnostics, an enabled idle
Repository Source bound to that selected string only as non-authorizing identity, and no
Global Sources before automatically queuing boundary admission and the first Repository
scan. It has no repository picker, ancestor search, profile, cache, or resume identifier.

The host obtains `previewDigestKey` from an independent 32-byte CSPRNG draw exactly once
during process-session bootstrap. It is distinct from the draws and values used for
`sessionId`, the API capability, every `previewId`, and every other opaque ID. It remains
unchanged across preview replacement, consent, retries, Global disable, and generation
changes, exists only in process memory until process termination, and is then discarded.
A key-generation throw/rejection reaches the process top level before session publication
or host bind; the product never substitutes, derives, persists, or rotates a key.

`UtcTimestamp` is an exact 24-byte ASCII UTC value in
`YYYY-MM-DDTHH:mm:ss.sssZ` form with valid calendar fields; every field called timestamp in
this model uses it. `GenerationNumber` is a non-negative safe integer representable by the
active Node.js runtime. A coordinator that cannot represent the next generation rejects the
operation with a fixed process-restart error before mutation.

The Inspector defines no product-specific byte, file-count, entry-count, graph-count,
parser-depth, message-size, request-size, response-size, worker-count, queue-capacity, or
wall-clock resource ceiling. Capacity is inherited from Node.js, the parser libraries, the
browser, the operating system, the filesystem, and the execution environment. A
thrown or rejected read/parser/Worker/scan operation is not caught or classified by the
domain layers. Such an operation produces no item, Diagnostic, scan result, response body
from the attempt, or generation. A REST-owning outer boundary converts only the lifecycle
into a generic `OperationError`; an automatic startup operation reaches the process top
level. Unrecoverable engine/process termination and runtime-owned uncaught-error output
cannot be converted into or controlled by an application Diagnostic.

Successful API responses contain complete DTOs and are never deliberately truncated. Except
for the explicitly two-stage Global-disable barrier below, for every REST command whose
success admits a job or changes committed authority, control, or Source state, the
coordinator first prepares tentative IDs, state, job, disposition, and the exact success
envelope without publishing any of them. While holding the same serialization lock, the host
fully JSON-serializes and UTF-8-encodes that envelope into one immutable entity-body buffer.
A serialization/encoding throw or rejection discards the tentative IDs/job/state, publishes
no attempt, admission, control transition, response disposition, or generation, retains the
prior snapshot, and reaches the trigger-owning REST boundary as its generic pre-acceptance
Operation Error with null `scanRequestId`. Once the complete buffer exists, the coordinator
revalidates the operation ID, epoch, abort/barrier state, and base snapshot under that lock,
then atomically commits the exact tentative state/job/disposition and binds that immutable
buffer to the accepted response. A failed revalidation discards the buffer and follows its
contracted conflict/cancellation outcome without partial mutation. A socket close, write
throw/rejection, or other delivery failure after commit never rolls back or duplicates the
accepted job/state, creates no second product Operation Error, reports no successful payload,
and never converts a truncated body into a partial DTO; the client recovers from a fresh
authenticated session snapshot. Serialization of the generic error envelope itself belongs
to the REST runtime/transport boundary. Monaco and the browser likewise use their
environment-provided capabilities; comparison failure leaves both complete authored source
views available.

An authority-free live-operation projection such as `globalEnableInProgress` is not an
admitted success and may appear while its owning REST request is still running. It contains
no candidate state or authority, is removed if that operation fails before its buffer-bound
commit, and does not weaken the success-response gate for any committed state.

Global disable is the sole exception because barrier acceptance must revoke publication
authority before asynchronous drain can complete and cannot truthfully be rolled back. Its
acceptance mutation, terminal success-buffer gate, retained REST failure, and retry rules
are closed by `GlobalDisableOperation`; no other command may copy that exception.

### Source

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ASCII string | Server-generated and stable for the process lifetime |
| `kind` | `repository \| global` | Exactly one Repository source; zero to three Global Sources |
| `tool` | `copilot \| claude \| codex \| null` | Repository pairs with null; each Global Source pairs with exactly one supported tool, and no two Global Sources share a tool |
| `enabled` | boolean | Repository and every published Global Source are true; absence means only that no Source is published for that tool, while `globalControl` distinguishes disabled, pending, and retryable control states; a disabling source remains true until atomic removal |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | Follows transitions below; public `partial` denotes only a contracted-partial result committed after complete traversal and a deterministic entry-local non-capacity failure; `failed` means the latest attempt failed while the last committed snapshot remains available; only a fatal explicit rescan marks that snapshot stale |
| `boundary` | `SourceBoundary` | Exactly one selected root: captured `process.cwd()`/lexically resolved `--cwd` for Repository, or the one consented home root for this Global Source's tool |
| `generation` | `GenerationNumber` | Equals the session-wide last committed generation for every published source |
| `scanRequestId` | opaque ASCII string or null | Latest admitted scan for this Source; set immediately on admission and retained through waiting/scanning/ready/partial/failed so status cannot be confused with an older request; null only before any scan admission |
| `progress` | `ScanProgress` or null | Non-null only while `scanning`/`disabling` or after `ready`/`partial`; null for `idle` and `failed` |
| `conditionFacts` | `SourceConditionFact[]` | Source-level facts for documented non-file behavior or excluded/runtime inputs that have no originating file |
| `diagnosticIds` | opaque string[] | Source-scoped diagnostics in the last committed generation |

`status`, `scanRequestId`, and `progress` are session-owned operational overlays; a fatal attempt may update
them without mutating the committed Source graph or generation-owned IDs. Boundary,
condition, file, recognition, relationship, and generation-scoped diagnostic content
changes only through an atomic generation commit.

Source-level condition facts never authorize a path read and never fabricate a
`Relationship.fromFileId`. A candidate provenance or relationship whose rule is listed in
`affectedRuleIds` may project the relevant condition into its applicability assessment,
but the source fact remains the canonical explanation for documented product behavior,
an uninspected environment or user setting, managed policy, or another excluded/runtime
input that has no originating file.

### SourceConditionFact

| Field | Type | Rules |
|---|---|---|
| `tool` | tool enum | Product whose documented non-file behavior or uninspected input is being described |
| `surface` | product-surface enum | Exact CLI, IDE, Cloud, or other maintained surface; never inferred from the owning Source kind |
| `ruleId` | stable excluded or relationship-only rule ID | Defines the non-file fact and can never authorize a file candidate |
| `affectedRuleIds` | non-empty sorted inspection-rule ID[] | Candidate or relationship-only subset of the shipped registry; controls which provenance/edge may project the fact |
| `behaviorRefs` | sorted `VendorBehaviorStatement.behaviorId`[] | Exact surface/scope lookup statements that explain the fact; never grants a read |
| `strategyRefs` | sorted `RuntimeCompositionStrategy.strategyId`[] | Exact composition or selection statements used by the projection |
| `sourceRefs` | non-empty sorted `OfficialSourceRecord.sourceId`[] | Stable evidence exposed for the fact and reciprocally validated; never grants a read |
| `evidenceAssessments` | `EvidenceAssessment[]` | Exactly one assessment for `ruleId` and every `behaviorRefs`/`strategyRefs` member; no aggregate status |
| `condition` | `ConditionFact` | Fixed reason code and any documented status; `satisfied` records a non-file runtime fact but still grants no read authority and never duplicates an authored source value |

The fixed registry entries are deduplicated by
tool, surface, explaining rule, affected-rule set, evidence set, condition key, and reason
code. A fact has no file ID, path, authored source, relationship origin, or comparison target
and never initiates local or hosted I/O.

### SourceBoundary

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `boundaryId` | opaque string | internal | Binds tickets and root context; unnecessary in the DTO because every Source has exactly one boundary |
| `tool` | `copilot \| claude \| codex \| null` | internal | Must equal the owning Source's already-published tool; Repository uses null |
| `displayRoot` | ASCII `RootPresentationEncoding` string | DTO | Deterministic encoding of the enabled Source root; not a `SourceRelativePath`, inventory-item locator, caller input, operational-log field, or read authority |
| `canonicalRoot` | exact platform canonical representation or null | internal | POSIX private Buffer or Windows exact code-unit string used for comparison and repeated containment checks; never sufficient by itself to authorize a read, never substituted for the raw operand, and never returned outside an enabled boundary |
| `rootContext` | `InspectionRootContext \| null` | internal | Null for the bootstrap Repository Source until central admission succeeds; required before enumeration. Repository then owns it directly, while a Global boundary references the active consent's `GlobalToolControl`-owned context; only the central safe-filesystem layer can create or consume it |
| `origin` | `process-cwd \| cwd-option \| default-home \| environment` | DTO | Explains how the lexical boundary was selected without granting read authority |

Every Source has exactly one boundary and root. The Repository boundary exists in generation
0 with an escaped `displayRoot` and null context. Central admission later creates its context
from `selectedRepositoryRoot`; a deterministic rejection keeps the Source and null context,
while a thrown/rejected startup admission propagates to the process top level. A Global boundary's `tool` must match its owning Source and
its active `GlobalToolControl`; it references that control's one admitted home context.
Tool homes are never combined into one Source.

### LexicalAbsoluteRootParts and root spelling admission

Preview eligibility remains the four-state no-I/O algorithm under
`RootPresentationEncoding and Global lexical state`; it does not imply that a spelling is
admitted. After Repository bootstrap or matching Global consent and before the first
filesystem call for that root, `safe-fs.ts` applies the following pure closed parser to the
exact retained string. It does not call `normalize`, `resolve`, or `join`, case-fold, perform
Unicode normalization, or change a separator. The result owns the exact platform path
operands used by row 1:

All platforms first reject U+0000 and any unpaired UTF-16 surrogate with path-free
`safe-fs-root-rejected` and zero I/O. This repeats the CLI/Global-preview invariant at the
authority boundary rather than relying on Node to throw.

| Field | Type | Rules |
|---|---|---|
| `platform` | `posix \| win32` | Active Node platform only |
| `anchorKind` | `posix-root \| drive-root` | Explicit UNC/server-share, current-drive, device, and volume-relative anchors are unrepresentable |
| `anchorParts` | exact string[] | Empty for POSIX; one raw drive letter for Windows |
| `components` | exact string[] | Non-empty path segments after the anchor, in order; no normalization |
| `lstatPrefixes` | `{ platform: 'posix', prefixes: private Buffer[] } \| { platform: 'win32', prefixes: string[] }` | Anchor first, then each component prefix; POSIX slices the accepted root Buffer at parsed component-byte ends and defensively copies each prefix, while Windows slices the original string at parsed code-unit boundaries |

POSIX first rejects any U+FFFD code unit as an unrepresentable root spelling: Node's
string-valued `process.cwd()`, argv, environment, and `homedir()` inputs cannot distinguish a
literal U+FFFD filename from replacement of invalid filesystem bytes. This root-only rule is
separate from file-content replacement decoding. It then accepts exactly `/` or
`/segment(/segment)*`. A segment is non-empty and is neither `.` nor `..`; a repeated
separator or non-root trailing slash is a deterministic zero-I/O
`safe-fs-root-rejected` outcome. `/` itself yields the sole prefix `/`. Only an
accepted string is encoded once with `Buffer.from(lexicalRoot, 'utf8')`; decoding that Buffer
and re-encoding it must reproduce both the string and exact bytes, and the private byte copy
becomes the sole POSIX root operand.

Windows treats either U+005C or U+002F as a separator only while parsing. Any string with
two leading separators is rejected as an unsupported explicit UNC/server-share or device authority with
zero I/O, regardless of the remaining code units. A drive form is exactly
`[A-Za-z]:<sep>` optionally followed by `segment(<sep>segment)*`. Every other empty, dot, or
dot-dot segment and every repeated/non-root trailing separator is rejected without I/O. A
single-leading-separator current-drive path is also rejected; `C:relative` was already
non-absolute. Prefixes are the drive root followed by each component prefix. This removes
all explicitly spelled UNC, device, and volume-GUID paths before any `lstat`, `realpath`, DNS, or SMB access;
the product never probes a server/share spelling. No other Windows
reserved-name/character policy is added here; a later Node/OS throw follows the
outer-boundary rule.

A syntactically plain drive root may be an OS-mapped network drive, and a POSIX root may
reside on a network mount. The pure parser cannot identify either case; after consent/root
selection their ordinary exact-operand checks may perform network filesystem I/O and cause
OS-mediated traffic. FR-022 excludes that traffic from its direct product-issued outbound-
request definition, requires local roots for that assertion, and retains this as a documented
platform/environment limitation. This is not an explicit-UNC zero-I/O bypass or a promise to
reject all network-backed storage.
Separately, FR-022 classifies exactly two browser/host HTTP classes at the issued `127.0.0.1`
authority as authorized internal loopback transport rather than outbound traffic or MCP:
closed unauthenticated static/SPA `GET`/`HEAD` and capability-authenticated declared API
requests. Network instrumentation validates both closed classes independently and requires
zero requests outside them, including customization-selected, remote-reference, or MCP requests.

The service mints one row-1 checkpoint for the anchor and then one for each component and
calls `lstat(prefix, { bigint: true })` in that order using the exact platform operand. Exact `ENOENT`
alone returns `absent`; a lifecycle owner records that returned outcome as
`safe-fs-root-absent`, while every other rejection propagates unchanged. A returned link,
detectable reparse object, non-directory, or unusable identity is a deterministic root
rejection. Only after all prefixes succeed does it call `realpath` on the exact raw root;
that call has no catch carve-out. POSIX requests a Buffer result and parses it as an exact
absolute byte vector; every component must pass strict UTF-8 validation and an exact
decode/re-encode round trip, otherwise the boundary is unverifiable. Windows accepts only a plain drive result and, for comparison only,
maps a Node-returned prefix with code units `[0x005C, 0x005C, 0x003F, 0x005C]` followed by a drive
letter, U+003A, one separator, and components to a drive vector. A plain UNC result, a
device-prefix `UNC` result, malformed/root-relative/volume-GUID output, or any other
network/device form is
`safe-fs-boundary-unverifiable`. The comparison requires the same anchor kind, exact drive
letter, component count, and exact component code units/UTF-8 bytes. It ignores only the
Windows separator glyph; it never case-folds or normalizes. A difference exposed by Node—including case,
normalization, or short-name expansion—is `safe-fs-root-rejected`. Canonical output
is comparison/containment data only and never replaces the raw I/O operand.

For `origin: process-cwd`, admission also requires `lstat('.')` identity to equal the
selected absolute-root identity. This detects a lossy or drifting `process.cwd()` result
without changing generation 0 or choosing a different root. It is a verification `lstat`
outside row 1: no rejection, including `ENOENT`, is caught or converted. A relative
`--cwd` is never probed in its original process-relative spelling because symlink resolution
could make that operand escape the lexically selected absolute root; admission and all I/O
use only `selectedRepositoryRoot`. An absolute option and every Global root likewise use
their retained exact absolute string. An identity mismatch is path-free
`safe-fs-boundary-unverifiable`.

### SourceRelativePath

`SourceRelativePath` is the value object used for file display, filtering, aliases,
provenance paths, and normalized relationship targets.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ID | Binds the path to one owning Source; never accepted alone as read authority |
| `boundaryId` | opaque ID | Internal binding to that Source's sole boundary; never serialized or accepted from the client |
| `value` | collision-free NFC POSIX-style string | Classification segments joined with `/`, relative to that Source root; no leading slash, URI scheme, NUL, empty or dot segment, `..`, home shorthand, or environment expansion |

For the Repository Source, `value` is relative to the selected Repository root. For a Global Source,
it is relative to that tool's admitted home root. Presentation escapes control characters
without changing the stored value. The value is never used to reconstruct a filesystem
path: the closed `ScanEntryTicket.rawRelativeSegments` union owns that role as all-enumerated
raw segments, an all-registry exact target, or the sole permitted mixed form of a non-empty
fixed registry prefix followed by a non-empty enumerated raw remainder. No element-wise
segment union or NFC value is an I/O operand. Any accepted alias uses the same value object and the
same owning Source.
On the wire, `sourceRelativePath` and each `aliasSourceRelativePaths` entry serialize only
the normalized `value` string; the containing file DTO's `sourceId` supplies the public
ownership link. `boundaryId` never crosses the HTTP boundary.

NFC classification is non-authorizing. Distinct raw paths that normalize to the same public
`value` form one collision group and no member receives a file DTO or read. Because there is
no unambiguous published Source-relative item path—and an initial Global Source may not yet
exist—the corresponding Diagnostic is pathless and session-scoped; its lifecycle owner
is carried by the nonserialized `lifecycleOwnerKey` and is exposed exactly once through
`repositoryFailureDiagnosticId`, `GlobalControlView.toolFailures`, or a published Source's
`StaleSourceFailure`, as applicable. The source-fatal attempt publishes no generation. When,
within one Source scan attempt, multiple collision-free allowlisted raw paths identified
before group consumption resolve to one verified physical regular file,
the primary path is the lowest `value` by unsigned UTF-8-byte lexicographic order and all
remaining unique values become aliases in that same order. Every provenance retains the
exact raw segments by which it was admitted. Filtering, item lookup within a returned DTO,
detail labels, and comparison selection match the primary and all aliases, but a file-scoped
Diagnostic always carries the primary `sourceRelativePath`; alias-specific observations stay
in provenance rather than creating a second file or ambiguous Diagnostic locator. A
different raw hard-link path discovered only after group consumption is not an accepted
alias/provenance and follows the `safe-fs-late-derived-alias-rejected` protocol below.

### RawEntrySegment, RegistryTargetSegment, InspectionRootContext, DirectoryEnumerationGuard, ScanEntryTicket, and VerifiedReadReceipt

These pure Node.js records are internal only. They cannot be serialized, cloned from a
DTO, reconstructed from an HTTP path, or accepted from a request. Their private module
brand enforces application-level authority; it is not an OS filesystem capability.

| Entity / field | Type | Rules |
|---|---|---|
| `RawEntrySegment` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | Exact directory-entry identity: POSIX owns a defensive copy of the `encoding: 'buffer'` name; Windows owns the exact returned UTF-16 code-unit sequence; values are module-private and never serialized, logged, normalized, or replacement-decoded |
| `RegistryTargetSegment` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | Compile/load-time platform form of one immutable, NFC, well-formed registry literal: POSIX UTF-8 encoding must exact decode/re-encode round-trip; Windows retains exact code units; separators, NUL, empty/dot segments, and extra fields are rejected |
| `InspectionRootContext.privateBrand` | module-private symbol/registry membership | Created and checked only by `src/inspection/safe-fs.ts`; never leaves process memory |
| `InspectionRootContext.sourceId` / `boundaryId` | opaque IDs | Bind the context to exactly one Repository boundary or to the unpublished IDs preallocated by one `GlobalToolControl`; those IDs become the Global Source/boundary IDs only on commit |
| `InspectionRootContext.lexicalRoot` | exact accepted absolute string | Retained identity/presentation input; a client value cannot replace it after creation |
| `InspectionRootContext.canonicalRoot` | `{ platform: 'posix', bytes: private Buffer } \| { platform: 'win32', codeUnits: string }` | Exact parsed `realpath` result used only for comparison/containment; never an I/O replacement operand |
| `InspectionRootContext.lexicalParts` / `canonicalParts` | exact `LexicalAbsoluteRootParts`-compatible vectors | Admission-time component comparison; canonical parts are comparison-only and never become an I/O operand |
| `InspectionRootContext.rawRootOperand` | private POSIX Buffer or exact Windows string | Sole root base for descendant I/O; POSIX owns an exact byte copy, Windows owns exact UTF-16 code units |
| `InspectionRootContext.rootIdentity` | bigint `dev`/`ino`/`mode` snapshot | Captured with `lstat`; identity/type is compared by row 20 before Global fixed-selector descendant I/O, by rows 21/25 around every source-root directory enumeration, and again in every candidate read phase; long-lived root state does not freeze directory timestamps |
| `InspectionRootContext.rootDevice` | bigint `dev` | Detects device changes exposed by Node; does not claim to identify every mount transition |
| `InspectionRootContext.state` | `active \| closed` | Contains no open OS handle; its module-registry close/unregister transition is synchronous and non-throwing. Close on Repository/process end, owning Global-control disposal/disable, or the atomic successful disposition of a retry that rejects/replaces a formerly admitted root; closed contexts reject all calls |
| `DirectoryEnumerationGuard.preOpenSnapshots` | ordered internal snapshot[] | Ephemeral per-`opendir` records from rows 21–24 for the root, relative ancestors, and non-root target as applicable; exact bigint `dev`, `ino`, `mode`, `mtimeNs`, and `ctimeNs`, never serialized or reused by another enumeration |
| `DirectoryEnumerationGuard.postEnumerationChecks` | ordered internal verification[] | Rows 25–28 compare the same operands with the corresponding pre-open snapshots after sibling collection and before confirmed close/use; the guard is consumed whether verification or close succeeds or fails |
| `ScanEntryTicket.privateBrand` / `rootContext` | module-private brand / internal reference | Issued only by authorized enumeration for one active root context |
| `ScanEntryTicket.sourceId` / `boundaryId` / `generationId` | opaque IDs / integer | Bind the ticket to exactly one source boundary and scan generation |
| `ScanEntryTicket.scanRequestId` | opaque ASCII string | Binds publication authority to exactly one automatic or explicit source scan; revocation makes every late continuation cleanup-only |
| `ScanEntryTicket.authorizingProgram` | internal closed union | Either `{ kind: 'traversal', plan: TraversalPlan }` or `{ kind: 'bounded-derivation', authority: DerivedTicketAuthority }`; a seed plan is never substituted for derived target authority |
| `ScanEntryTicket.structuralCheckpointInstances` | ordered module-private consumed/unconsumed records | Exact catalog-derived instances for enumerated admission, pre/post-directory-enumeration, and pre-open/pre-read/post-read rechecks; no caller-defined catch authority |
| `ScanEntryTicket.rawRelativeSegments` | closed exact-path union | Sole ordered segments used to reconstruct, verify, and read the path: `{ kind: 'enumerated', segments: RawEntrySegment[] }`, `{ kind: 'registry-target', segments: RegistryTargetSegment[] }`, or `{ kind: 'fixed-prefix-enumerated', fixedPrefix: non-empty RegistryTargetSegment[], enumeratedRemainder: non-empty RawEntrySegment[] }`. The third form is the only permitted mixed representation and preserves prefix-then-remainder order; no array element union, empty part, reordering, serialization, or client input is allowed |
| `ScanEntryTicket.classificationSegments` | collision-free NFC segment array | Used only for matcher classification, deterministic order, and `SourceRelativePath`; never substituted into a filesystem operation |
| `ScanEntryTicket.canonicalAtEnumeration` | exact platform canonical representation | POSIX private Buffer or Windows exact code-unit string returned for this ticket and parsed losslessly; internal comparison value, not standalone read authority |
| `ScanEntryTicket.ancestorSnapshots` | ordered snapshot[] | One record per relative directory prefix with exact bigint `dev`, `ino`, `mode`, `mtimeNs`, and `ctimeNs`; directory enumeration additionally binds and compares these fields before and after collecting siblings, while candidate reads compare identity/mode before open, before read, and after read |
| `ScanEntryTicket.enumerationIdentity` / `enumerationMetadata` | bigint path-stat snapshot | Exact `dev`, `ino`, `nlink`, `mode`, `size`, `mtimeNs`, and `ctimeNs` compared with every path snapshot and the opened `FileHandle` before bytes are accepted |
| `ScanEntryTicket.occurrence` | non-negative integer | Deterministic enumeration order |
| `ScanEntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | A ticket can be read at most once per generation; stale/rejected tickets return no accepted bytes |
| `VerifiedReadReceipt.entryTickets` | non-empty ordered internal references | Exactly one consumed ticket per collision-free admitted raw path consolidated into this physical file, ordered by primary then unsigned-UTF-8-bytewise NFC aliases; every phase revalidates every ticket and no path/ticket is duplicated |
| `VerifiedReadReceipt.primaryEntryTicket` | internal reference | First `entryTickets` member and sole path operand used to open/read the physical file |
| `VerifiedReadReceipt.fileHandleIdentity` | bigint `dev`/`ino`/`nlink`/`mode` snapshot | Sole source of `CustomizationFile.identity`; never treated as durable |
| `VerifiedReadReceipt.preOpenChecks` | ordered per-ticket verification records | Before the one primary `open`, records rows 8–11 for every `entryTickets` member in order: root identity, every ancestor `lstat`, candidate path `lstat`, exact-platform candidate `realpath` containment, and repeated candidate `lstat`; each path must match its enumeration snapshot and the same physical identity |
| `VerifiedReadReceipt.preReadChecks` / `postReadChecks` | ordered per-ticket verification records | After `open` before any read and again after the complete read while the same handle remains open, records rows 12–15 or 16–19 respectively for every ticket in the same order, then compares `FileHandle.stat({ bigint: true })`; all tickets must still match the one handle identity and exact metadata before bytes are accepted |
| `VerifiedReadReceipt.fileType` | literal `regular-file` | No directory, link, device, socket, or pipe; unsupported/unverifiable objects are rejected |
| `VerifiedReadReceipt.acceptedByteCount` | non-negative integer | Exact bytes accepted from the verified handle; equals the readable file record's byte count |
| `VerifiedReadReceipt.finalOpenDefense` | `effective-o-nofollow \| no-effective-o-nofollow-postchecks` | The first value is mandatory when Node exposes and the platform enforces `O_NOFOLLOW`; the second covers both absent and ineffective support and records the explicit residual limitation |
| `VerifiedReadReceipt.containmentMode` | literal `node-realpath-fstat-best-effort` | Records repeated canonical and same-handle validation without claiming atomic kernel containment |
| `VerifiedReadReceipt.openMode` | literal `read-only` | Mutation-capable open flags are unrepresentable and rejected by instrumentation tests |
| `VerifiedReadReceipt.mutationObservation` | runtime metadata record | Contains only values already obtained by the contracted path `lstat`/`realpath` and same-handle `FileHandle.stat` checks plus the one accepted byte count/digest; it records any observed atime difference separately and makes no claim about unqueried xattrs/ACLs or a second content snapshot |

A terminal-file identity is usable only when every `lstat` and same-handle
`FileHandle.stat({ bigint: true })` exposes exact bigint fields, `ino !== 0n`, and
`nlink > 0n`. A physical group exists only inside one Source scan attempt and only when all
member snapshots have the same `(dev, ino)`, the same stable `nlink`, and
`nlink >= BigInt(admittedPathCount)`. `nlink` is compared through enumerated admission,
pre-open, pre-read, handle-stat, and post-read checks just like the other file metadata. A
missing, non-bigint, zero/negative, changing, or group-inconsistent identity field produces
`safe-fs-boundary-unverifiable` before bytes are accepted; it is never used as a grouping
key. A filesystem that returns plausible but non-unique identity values beyond the fields
Node exposes remains an explicit `platform-unobservable` limitation rather than a claimed
proof. Repository and Global Sources, two Global tool Sources, different scan attempts, and
different generations never share a ticket, receipt, byte buffer, or read-once group; each
independently admitted Source attempt may therefore read the same underlying object once.

Content is read exactly once from the sole accepted handle. Mutation conformance uses an
external fixture harness that snapshots fixture bytes and, where the OS exposes stable test
APIs, xattrs/ACLs before and after the product run. Those harness observations are test
evidence, never fields in `VerifiedReadReceipt` and never an extra production read. An atime
change attributable to the OS read path is reported separately and does not prove either
application mutation or containment safety.

Repository root creation derives its context from the already selected lexical Repository
root and occurs only after the zero-I/O Source exists. Global root creation
occurs only after matching preview consent. Root creation checks every exposed lexical
component with `lstat`, rejects links, then records the accepted root `realpath` and
identity; these separate checks remain subject to the residual race below. The Node
filesystem service alone creates tickets while interpreting an immutable `TraversalPlan`;
static/derived classifiers may select a ticket but may not create one.

On POSIX the service calls only non-recursive
`opendir(parentBuffer, { encoding: 'buffer' })`, defensively copies every returned name, and
constructs every descendant `lstat`, `realpath`, `opendir`, and `open` operand with the one
closed `appendChild` helper. On POSIX, if the parent is the anchor Buffer `/`, it appends the
exact name bytes directly; otherwise it appends one byte `0x2f` and then those bytes. Thus
the helper never produces `//`. On Windows, it appends exact child code units directly when
the drive-form parent already ends in either accepted separator glyph, and otherwise inserts
exactly one native U+005C code unit before them. Empty/separator-containing child segments are
unrepresentable. The same helper handles enumerated and registry-target segments. It never uses
default directory decoding, `Dirent.parentPath`, string conversion, or `node:path.join` for
an enumerated operand. Before text/NFC classification it calls
`node:buffer.isUtf8(rawName)`, decodes a true result exactly once, and requires
`Buffer.from(decoded, 'utf8')` to equal the original bytes. A false or non-round-tripping
result is never replacement-decoded or charset-guessed. On Windows it retains the exact
`Dirent.name` UTF-16 code units and rejects an
unpaired surrogate before classification. Literal relevance is exact equality with the
registry literal's UTF-8 bytes/code units; `one-segment` relevance is a non-empty raw name
with the exact registry suffix bytes/code units. At a recursive directory position,
`Dirent.isDirectory() === true` or an unknown type (all type predicates false) is potentially
relevant; only a known non-directory is irrelevant without `lstat`. A selector-relevant
unrepresentable name receives one pathless
session-scoped `safe-fs-entry-name-unrepresentable` Diagnostic and zero `lstat`, descent,
`realpath`, open, or read calls for that entry; an irrelevant name is ignored. This is a
deterministic successful-enumeration result, not a caught file-read error, but it is a
source-fatal returned outcome because no unambiguous FR-028 item path can exist. The attempt
publishes no generation or partial item. The Diagnostic has no source/file/path fields; its
nonserialized lifecycle owner is exposed only through `GlobalControlView.toolFailures`,
`StaleSourceFailure`, or `InspectionSession.repositoryFailureDiagnosticId`, so no
unpublished Source is fabricated. File-content bytes remain
separate: invalid non-NUL UTF-8 content under a representable name is still replacement-
decoded and processed as `utf-8-replaced`.

For each opened directory, rows 21–24 bind exact pre-open directory/root/ancestor snapshots,
including bigint `dev`, `ino`, `mode`, `mtimeNs`, and `ctimeNs`. The service completes the
raw sibling set with explicit `Dir.read()` calls before descending, then rows 25–28 require
the same identity/type/mode and unchanged `mtimeNs`/`ctimeNs` against those bound snapshots.
The registered `fs.Dir` must reach `close-confirmed` before the buffer is used. A detectable
create, removal, or rename during enumeration therefore yields the applicable pathless
source-fatal stale/metadata diagnostic and no generation; a thrown/rejected post-check or
close propagates to the owning boundary and likewise publishes no attempt result. Among
representable relevant names, distinct raw sibling names that normalize to the same
NFC classification key form a collision group: every member is rejected without
descend/open/read and receives one pathless session-scoped
`safe-fs-path-normalization-collision`. That collision is
likewise source-fatal, never an FR-028 contracted-partial item outcome. A non-colliding
NFD-only entry remains readable by its exact raw segments while its classification and
displayed path are NFC. On Windows, each candidate `realpath` result is parsed relative to
the already verified canonical root and every returned component must equal the enumerated
or registry target code units exactly; a case, normalization, short-name, trailing-dot/space,
or other alias difference returned by Node fails closed before open. A derived value
must match exactly one collision-free classification record. Candidate reads rebuild a path
only from the owning root context and each ticket's raw segments. Every POSIX candidate
`realpath` requests a Buffer and is parsed as an absolute byte-component vector; every
component must pass `isUtf8` and exact decode/re-encode equality. The candidate is contained
only when its exact byte vector equals the canonical root or has the canonical root's exact
components as a prefix followed by at least one component. Every Windows result is parsed
only as the admitted plain drive or mapped drive-namespace code-unit vector and is contained
by the equivalent exact drive-anchor-and-component rule. Any UNC/network result is rejected
as `safe-fs-boundary-unverifiable`. Malformed or non-round-tripping
canonical output is deterministic `safe-fs-boundary-unverifiable` and is never replacement-
decoded. A later `path.posix.relative`/`path.win32.relative` check may reject as redundant
defense only after lossless decoding/parsing; it never admits a candidate or becomes an I/O
operand.

One lifecycle owner retains at most one source-fatal Diagnostic per attempt. Directory
entries are first sorted by unsigned raw bytes on POSIX or unsigned UTF-16 code units on
Windows before matcher classification. A complete sibling set is evaluated as one unit:
if it contains any selector-relevant unrepresentable name, the attempt retains exactly
`safe-fs-entry-name-unrepresentable`; otherwise, if it contains any relevant NFC collision,
it retains exactly `safe-fs-path-normalization-collision`. Multiple members/groups do not
emit additional Diagnostics. Across directories and later checkpoints, the first fatal in
selector order, root-to-leaf traversal order, sorted entry order, then checkpoint-catalog/
ticket order wins and immediately stops the Source attempt; later fatal conditions are not
evaluated or emitted. Root admission precedes traversal. This fixed precedence preserves the
single lifecycle owner without hiding a successfully reached earlier failure behind timing.

Except for the ordered Codex fallback branch defined below, a Source attempt completes all
static matcher traversal, sibling classification, rows 4–7 admission, and physical-group
formation before it consumes any static group. Group consumption then follows deterministic
primary-path order. Consequently every static hard-link path reached by the plan is present
before the sole group open/read; discovery and reading are separate phases, and a later
static admission after consumption is an internal invariant failure rather than an implicit
second read.

Within that one Source attempt, hard-link consolidation retains every admitted path ticket
in primary/alias order. Before
the sole primary-path `open`, rows 8–11 run for every ticket in that order and require its
root, ancestors, repeated candidate snapshots, canonical containment, enumeration identity,
and physical identity to match. After `open` but before any read, rows 12–15 run for every
ticket and all identities must equal the one `FileHandle.stat({ bigint: true })`. The bytes
are read exactly once from that primary handle. While it remains open after the complete
read, rows 16–19 run for every ticket, followed by the final same-handle stat; only then are
bytes accepted. An alias disappearance, replacement, identity divergence, or any other
identity/type/metadata/boundary change discards all collected bytes and marks the affected
tickets stale or rejected; an alias can never remain published from an old observation.

Derivation can discover a target only after its static seed has been read. If the derived
target is the exact same raw admitted path as an already verified file, the service attaches
the derived provenance to that existing ticket/receipt without another ticket or read. If a
different derived raw path resolves to a physical-identity group not yet consumed, its
ticket joins that group before the sole open and all checks above apply normally. If the
group has already been opened/read, the late hard-link path cannot be retroactively inserted
into pre-open/pre-read checks: it receives zero open/read, is not published as an alias or
provenance, and the existing file receives file-scoped
`safe-fs-late-derived-alias-rejected`. The generation is contracted-partial and the existing
file's read state/bytes remain unchanged. Re-reading the physical file, accepting old bytes
for the late path, or silently dropping the Diagnostic is forbidden.

Client or HTTP path strings never authorize a read.

The only filesystem rejection converted inside this model is Node's exact `ENOENT` from an
`lstat` invoked at a registry-declared structural existence checkpoint. Before admission it
means `absent`; after an entry was observed it means deterministic `entry-disappeared` and
discards all bytes. The handler checks only `error.code === 'ENOENT'`, never the message,
and applies to neither `open` nor `read`. Every other exception or rejection propagates
unchanged past the filesystem, parser, recognition, and scan domain layers.

One process-wide executor serializes inspected-source filesystem work. The production
module exposes only read-only operations and never requests
write, truncate, create, rename, delete, link, chmod/chown, utimes, xattr, ACL, or an atime
change. Disable or process shutdown revokes the affected request's publication authority
and stops new scheduling. A pending promise becomes cleanup-only: its late bytes and all
graph/Diagnostic/DTO/log mutations are discarded, and every opened handle is closed in
`finally`. Here “closed in `finally`” means the `ClosableResourceRegistry` helper is invoked
or joined; only `close-confirmed` proves closure, and a rejected unknown close poisons later
filesystem scheduling until restart. Node does not guarantee physical kernel-I/O termination when application
authority is revoked; a future cancellable primitive or OS-enforced worker/sandbox is the
resolution path.

Required identity/metadata or canonicalization that is successfully returned but is
structurally absent, ambiguous, malformed, or otherwise unusable produces the deterministic
`safe-fs-boundary-unverifiable` outcome; the layer never guesses. A root-level outcome aborts
the source attempt, and an item-level outcome can retain only a diagnostic-only inventory
record, and only after complete traversal and registry-confirmed closure of every acquired
resource. A root/shared-ancestor or directory-enumeration guard outcome, or any unconfirmed
FileHandle or `fs.Dir` close, aborts the affected Source attempt with no diagnostic-only
candidate record, contracted-partial generation, or success receipt. A throw or rejection
while obtaining that data instead follows the propagation rule.

Because Node does not provide atomic directory-handle-relative child open, these records
cannot prove containment against an active process that replaces the root or an ancestor
between checks, or the final entry where effective `O_NOFOLLOW` is unavailable. Those cases,
not the whole actor class, are outside the current threat model. Detected ordinary concurrent
changes, effective-`O_NOFOLLOW` final-component defense, and all other detected races remain
in scope and fail closed. Expanding the threat model requires a future atomic Node
beneath/no-follow API or an OS-enforced read-only snapshot/sandbox and renewed review.
On a filesystem where public Node.js APIs do not expose actual case, Unicode spelling, or
short-name expansion, an otherwise hidden alias cannot be proved absent without enumerating
an out-of-boundary parent. The Inspector does not do that; it records this as a
`platform-unobservable` limitation rather than claiming containment proof.
Same-device bind mounts and reparse metadata that Node never exposes remain explicit
platform limitations outside automated-test proof.

### StaticAssetManifest and ServerBundleManifest

These are trusted packaged-build records, not inspection-source DTOs. The build/package
verifier resolves both only from fixed package-root paths. At runtime the project-owned
`bin.mjs` bootstrap resolves the packed `package.json` and both manifests only from fixed
URLs relative to its own `import.meta.url`. Using only Node.js built-ins, it validates
the packed `package.json`, validates both strict manifests, and verifies every declared
asset byte length against the packaged bytes. It hashes every listed static/server asset
before it dynamically
imports the already-validated `dist/cli.mjs`; the host cannot bind first. `node:fs` may read and hash
package-owned files but may not use a build manifest as an inspected-source fallback.
Runtime validation rejects malformed JSON,
duplicate/unknown/missing key, unexpected order, symlink, non-regular file, size/hash
mismatch, or package-version mismatch before import/
server bind.
These JSON manifests, generated HTML/CSS, documentation, and the license are declarative
artifacts. All project-authored executable application code and every executable component
shipped in the package are JavaScript generated from JavaScript/TypeScript sources. This
boundary does not classify third-party development/test tooling as product code.
The verifier defines integrity, not resource admission or customization-file validation.
Package processing capacity is inherited from Node.js, the operating system, and the
execution environment; a recoverable runtime failure prevents import and host bind.

Before creating the static manifest, the fixed normalizer reads Nuxt's standard
`.output/public` staging tree, requires regular generated `200.html` and `404.html` files
but does not copy those redundant static-host fallbacks, and rejects any other HTML file
except `index.html`. It copies every other accepted regular file into a new `dist/public`;
the manifest describes every copied file and the packaged output contains neither alias.
The server assembler similarly reads only the clean `.build/server` staging tree and
copies exactly its manifest-listed regular `.mjs` files into `dist/`.

| Entity / field | Type | Rules |
|---|---|---|
| `StaticAssetManifest` | strict JSON | Exact keys `manifestVersion`, `packageVersion`, `shellPath`, `assets`, `inlineScriptSha256` |
| `StaticAssetManifest.manifestVersion` | literal `1` | No compatibility guessing |
| `StaticAssetManifest.packageVersion` | semver string | Equals the version embedded from the packed `package.json` |
| `StaticAssetManifest.shellPath` | literal `/index.html` | Exact SPA fallback bytes |
| `StaticAssetManifest.assets` | ordered unique records | Sorted by `requestPath`; every post-normalization generated regular file appears exactly once |
| `StaticAssetRecord` | closed object | Exact keys `requestPath`, `file`, `byteLength`, `sha256`, `mediaType` |
| `StaticAssetRecord.requestPath` | root-absolute URL path | No query, fragment, dot segment, encoded separator, malformed escape, or external origin |
| `StaticAssetRecord.file` | exact `public/...` relative path | Must be the unique lexical counterpart of `requestPath`; no separator alias or traversal |
| `StaticAssetRecord.byteLength` / `sha256` | non-negative integer / 64 lowercase hex | Declared byte length is verified for exact equality with packaged bytes before bind; mismatch fails closed |
| `StaticAssetRecord.mediaType` | closed MIME enum | Determined at build time by the same fixed extension table used by the host; HTML is legal only for `/index.html` |
| `StaticAssetManifest.inlineScriptSha256` | unique ordered 44-character base64 hashes | SHA-256 of each exact executable inline-script byte sequence in `/index.html`; no executable attribute, `<base>`, nonce, external URL, or unrecorded inline script passes the build |
| `ServerBundleManifest` | strict JSON | Exact keys `manifestVersion`, `packageVersion`, `assets` |
| `ServerBundleManifest.manifestVersion` | literal `1` | No compatibility guessing |
| `ServerBundleManifest.packageVersion` | semver string | Equals the same packed-package version |
| `ServerBundleManifest.assets` | ordered unique records | Sorted by `file`; includes `cli.mjs`, `parser-worker.mjs`, and every tsdown code-split chunk exactly once |
| `ServerBundleRecord` | closed object | Exact keys `file`, `byteLength`, `sha256` |
| `ServerBundleRecord.file` | normalized relative `.mjs` path | No absolute path, empty/dot segment, separator alias, traversal, or `public` or `manifests` top-level collision |
| `ServerBundleRecord.byteLength` / `sha256` | non-negative integer / 64 lowercase hex | Verified for exact equality with staged bytes before copy and packaged bytes before import |

After all assembly, the recursive expected set **inside `dist/`** is exactly the two
manifest files, every `public/...` path listed by `StaticAssetManifest`, and every server
path listed by `ServerBundleManifest`. The final dist verifier rejects any difference,
including a stale regular file, unlisted chunk, symlink, directory in place of a file, or
other platform-safe non-regular object.

The unpacked npm package uses a separate closed package-root set: exact regular non-symlink
files `package.json`, `bin.mjs`, `README.md`, `README.ja.md`, and `LICENSE`, plus `dist/`
containing exactly the recursive dist set above; directory entries are structural only and
no other file/object is allowed. `package.json` must also have the exact contracted name,
version, `type`, `bin`, `files`, and `engines.node` values. The pack verifier compares the
exact byte length and SHA-256 of each of those five fixed root files with its pre-pack source
and applies both manifests' length/hash records to every dist asset. Runtime bootstrap
`lstat`s its fixed `package.json`, `bin.mjs`, both manifests, and all declared assets and
requires regular non-symlink files before reading/hash/import; it validates the packed
metadata and manifest hashes as described above but does not claim that executing code can
self-authenticate its own pre-execution bytes. Package tests apply the package-root set to
the unpacked tarball and the dist set only to its `dist/` subtree.

The build normalizer, unpacked-package verifier, and runtime bootstrap share the same
manifest schema, path rules, byte-length equality check, and hash verification. Tests prove
that a mismatch or recoverable environment failure is rejected before CLI import or host
bind.

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
presentation encoding, digest construction, or preview serialization throws/rejects or
cannot produce the required string, the operation-local capture is discarded and the REST
owner returns only the generic pre-acceptance Operation Error. It creates no preview,
`scanRequestId`, consent, root context, or authority. A successful preview owns the capture
and freezes its three exact roots; active consent retrieval never repeats it.

### GlobalConsentPreview

The capability-protected consent route creates this preview from exactly one
`GlobalRootInputCapture` using lexical path operations only. Creating or returning it does
not call `stat`, `realpath`, directory enumeration, or file reads under any proposed Global
root.

| Field | Type | Rules |
|---|---|---|
| `previewId` | exact 43-character unpadded base64url string | Canonical encoding of an independent 32-byte CSPRNG draw and a process-memory lookup key; a new preview invalidates the previous unconsented preview, while active consent freezes and reuses its exact preview |
| `previewEpoch` | non-negative safe integer | Internal and never serialized; increments with every newly captured preview and binds replacement/revalidation without using an opaque ID as an order value |
| `previewDigest` | 43-character base64url HMAC-SHA-256 | Covers the exact `GlobalPreviewDigestEncoding` top record, including `sessionId` and `previewId`; compared in constant time and never accepted from another process |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | literal `1` | Equals the schema version of every immutable entry plan and is bound by `previewDigest` |
| `entries` | exactly three tool entries | Fixed Copilot, Claude, and Codex order |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | An environment entry is used even when invalid; no silent fallback |
| `entries[].lexicalRoot` | exact raw string | Internal only; preserves the pre-escape environment/default value; never logged or serialized |
| `entries[].displayRoot` | ASCII `RootPresentationEncoding` string | Exact deterministic encoding of `lexicalRoot`; originates before an owning Source exists, and is never a `SourceRelativePath`, inventory-item locator, canonicalization claim, operational-log field, or read authority |
| `entries[].pathPatterns` | non-empty fixed relative-pattern array | Rendered from the exact immutable Global `TraversalPlan`; no neighboring customization classes |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | Assigned by the exact ordered `Global lexical state` algorithm below before I/O; `invalid` includes any absolute spelling rejected by the shared pure root parser, including explicit Windows UNC/server-share spellings; only `eligible` may become a boundary after consent |
| `excludedRuleIds` | sorted excluded rule ID[] | Drives the displayed exclusions without accepting authored prose |

The host applies `RootPresentationEncoding` without changing the retained raw value. Its
ability to allocate that value is inherited from Node.js, the operating system,
and the browser. A throw/rejection during lexical preview creation reaches the REST request
boundary before acceptance, which returns the generic Operation Error without a
`scanRequestId`, normalization, canonicalization, root creation, or read. It does not create
a size-based input state. The digest uses the exact `GlobalPreviewDigestEncoding` below;
neither root field is nullable. It binds
each raw `lexicalRoot`, its escaped `displayRoot`, and the traversal-plan schema/version
and canonical selector programs behind `pathPatterns`; it never relies on reversing an
escape or on Unicode normalization.
Fixed registry strings are already canonical NFC.
It contains no filesystem-derived value. An invalid
environment value is escaped and displayed but is not normalized into an authorized path.
Present-empty, relative, and invalid entries use only fixed preview presentation
and create no retained `Diagnostic`. After confirmation all three entries receive a
`GlobalToolControl`; only an `eligible` entry may enter safe-fs admission, receive a root
context/IDs, and later produce a tool failure Diagnostic. A lexical-ineligible control is a
path-free rejected control whose fixed reason remains visible through the frozen preview.
Every absolute path accepted by the shared pure root parser is `eligible` regardless of
whether it lies outside the ordinary home; that location alone neither rejects it nor grants
pre-consent I/O. Explicit UNC/server-share and other parser-rejected spellings are `invalid`. Only an
absent setting selects the documented default. An empty, relative, invalid, or post-consent
rejected setting never creates fallback authority.
Admission uses only the stored internal raw `lexicalRoot`; it never uses `displayRoot` as a
path and never rereads the environment. Preview creation/retrieval linearizes under the
coordinator lock. While consent is active, an initial `GlobalEnableOperation` is registered,
or a non-complete `GlobalDisableOperation` retains its preview fence, retrieval returns the
same DTO-visible object byte-for-byte in field semantics,
including its ID and digest, and never rereads the environment or creates a replacement.
Only when neither condition holds may a request perform a new capture, increment
`previewEpoch`, and replace the prior unconsented preview. If an initial operation terminates
without activating consent, its freeze ends only after the operation unregisters. This is
the only recovery path for redisplaying exact consent after a client purge and prevents an
in-flight enable from committing authority for an unreachable preview.

### GlobalConsent

| Field | Type | Rules |
|---|---|---|
| `allowlistVersion` | date string | Must equal the displayed current contract |
| `previewId` / `previewDigest` | opaque strings | Must match the current in-memory preview exactly |
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
After confirmation, each eligible lexical root is canonicalized without following a
candidate entry. The tool is rejected with a safe diagnostic before enumeration if the
canonical root is not component-identical to the displayed lexical absolute root. This
rejects every symlink, junction, case, Unicode-normalization, or short-name difference that
the contracted Node checks expose; an alias that public Node APIs do not expose remains the
documented `platform-unobservable` limitation. The
application never silently substitutes the canonical target or broadens consent; the user
must make that exact frozen lexical root admissible and use the same-preview retry. If the
lexical root string itself must change, the user disables Global inspection and requests a
new preview instead.
Each admitted tool may create one Global Source bound to that tool's one shown
root. Confirmation never creates a combined Global Source and never gives one tool's
Source authority over another tool's root.
If initial enable leaves any retryable tool without a Source—including safe-fs all-rejected
or mixed outcomes—the exact active consent and its `GlobalToolControl` records may requeue
only that complete server-derived retryable subset. Lexical-ineligible controls require
disable and a new preview. Existing Sources retain their semantic content and stable `sourceId`.
Each successful initial or retry admitted-subset transaction publishes all newly admitted
Sources together, advances the session generation exactly once, regenerates every
generation-owned ID in every carried graph, and invalidates old file/detail/comparison/editor
state. A different preview or root requires disabling
Global inspection first; a request with no retryable tool is rejected as closed conflict
`no-retryable-global-tool`.

Post-consent canonical/root validation can admit zero to three tools. The serialized
coordinator activates consent and creates at most one provisional batch scan for the entire
admitted subset. An exact `ENOENT` from a contract-declared root `lstat`, a lexical-invalid
entry, or a deterministic link/type/boundary rejection affects only that tool. Any other
throw/rejection propagates to the REST boundary, aborts the whole transaction, and publishes
none of its provisional subset. If every tool is deterministically rejected, consent remains
active, no Source or scan job is published, and the operation returns the contracted
`active-no-job` state.
Initial activation therefore has zero Global Sources; an all-rejected retry commits no
generation and leaves existing Sources and their IDs unchanged. A later exact-consent retry
may revalidate only the current server-derived `retryableTools` subset; changing the lexical
root or making a lexical-ineligible control eligible requires disable and a new preview.

### GlobalToolControl

| Field | Type | Rules |
|---|---|---|
| `tool` | tool enum | Exactly one of each supported tool exists while consent is active |
| `previewId` | opaque string | References the active frozen preview and cannot be changed in place |
| `state` | `unvalidated \| rejected \| admitted \| published` | All three provisional operation-local controls begin `unvalidated`, but that state is never serialized in an active `GlobalControlView`; lexical-ineligible entries become rejected without safe-fs I/O, `admitted` has a valid retained context but no published Source, and `published` has exactly one Source |
| `sourceId` / `boundaryId` | opaque IDs or null | Allocated together only after successful root admission; remain internal until a Source commit and are discarded if admission must be repeated |
| `rootContext` | `InspectionRootContext \| null` | Created only by safe-fs after lexical/canonical/root-identity validation; owned here even before a Source exists |
| `rejectionCode` | closed reason code or null | Non-null only in `rejected`; lexical reasons are exactly `present-empty \| relative \| invalid`, root absence is exactly `safe-fs-root-absent`, and every other value is the exact owning deterministic Diagnostic code; none contains a path or environment value |
| `retryDisposition` | `same-preview \| new-preview-required \| null` | Null unless `rejected`; lexical reasons are exactly `new-preview-required`, while every deterministic post-consent admission/initial-scan reason is `same-preview` |
| `diagnosticId` | session diagnostic ID or null | Null exactly for lexical `new-preview-required` rejection; otherwise references the current deterministic admission/initial-scan Diagnostic while that tool has no published Source. Published-Source rescan failures belong only to `StaleSourceFailure`, and throws/rejections are never referenced here |

`GlobalToolControl` is session control state, never part of a scan working set. A successful
admission preallocates its unpublished Source/boundary IDs and root context before queuing
the single provisional subset scan. A deterministic fatal initial scan destroys the entire
batch working set but leaves
this control and context for exact-consent retry; every retry rechecks root identity and
containment before enumeration. If the retained context still matches, it remains active.
If any check rejects or cannot verify the formerly admitted root, safe-fs records a
tentative rejection and tentative context/ID replacement without mutating or closing the
pre-operation context. A later retry may create a new context and IDs only after a complete
new admission under the same frozen lexical preview. Until the success buffer exists, the
old context remains the exact rollback snapshot and cannot be used by a job because the
registered operation suppresses admission/dequeue. At the buffer-bound disposition, one
synchronous non-throwing memory transaction revokes and closes/unregisters the old
handle-free context, discards the old unpublished IDs, and applies either the rejected
null-context state or the tentative admitted replacement. A throw/rejection or
serialization failure discards only tentative resources and leaves every pre-operation
field/context active and byte-for-byte unchanged. A post-consent validation failure
therefore commits a `rejected` control with no IDs/context only at that disposition and can
be revalidated under the same preview. A
successful Source commit publishes the preallocated IDs and makes its `SourceBoundary`
reference this context. A safe-fs deterministic rejection or fatal returned scan outcome
creates/replaces that control's current tool Diagnostic. A lexical `present-empty`,
`relative`, or `invalid` rejection keeps `diagnosticId: null` and is explained only by its
fixed rejection code plus the frozen preview. A throw/rejection creates no per-tool failure and,
for an accepted admitted-subset Global batch, creates one operation-level REST Operation Error
referenced by `GlobalControlView.lastOperationErrorId` for the whole consent. A successful
Source commit clears the applicable deterministic failure record, and unrelated tool outcomes
preserve it. Global disable first aborts work and closes open file handles, then removes all
control-owned diagnostics, closes every control-owned context, and removes every control
with the consent and frozen preview. No DTO can create or mutate this authority.

### GlobalControlView

| Field | Type | Rules |
|---|---|---|
| `state` | `active \| disabling` | `disabling` begins when the priority barrier is accepted and lasts until the field becomes null at its single commit |
| `previewId` | exact 43-character base64url string | Equals the active 256-bit `GlobalConsentPreview.previewId`; not a capability or filesystem path |
| `confirmedTools` | exact `[copilot, claude, codex]` | Fixed all-tools consent set; never client-selected |
| `pendingTools` | sorted tool enum[] | Admitted tools owned by one accepted subset scan only after atomic buffer-bound batch acceptance; initial and retry validation/admission are operation-local and unobservable; empty with null `batchStatus` while `disabling` after cancellation begins |
| `batchStatus` | `GlobalBatchStatus \| null` | Non-null from accepted admitted-subset queueing through terminal success/failure; preserves the promoted `scanRequestId` for fresh-snapshot and lost-202 recovery |
| `retryableTools` | sorted tool enum[] | While `active`, exactly each non-pending unpublished `admitted` control and each `rejected` control whose `retryDisposition` is `same-preview`; it retains the exact pre-operation projection during operation-local retry validation, lexical `new-preview-required` controls are excluded, `unvalidated` exists only in non-serialized operation-local work, and the array is empty while `disabling` |
| `toolFailures` | fixed-tool-order `{ tool, diagnosticId }[]` | Exact public ownership map for every non-null `GlobalToolControl.diagnosticId`; each tool and diagnostic ID is unique, and no Operation Error appears here |
| `lastOperationErrorId` | opaque Operation Error ID or null | Current accepted admitted-subset Global batch throw/rejection for the whole active consent; resolves to exactly one `InspectionSession.operationErrors` entry and is never attributed to one tool |

`GlobalControlView` is derived from the active consent, its `GlobalToolControl` records, the
coordinator, and published Sources. It is returned in every authenticated session snapshot
while consent or retained control state is active, including initial all-failed/
`active-no-job` outcomes with zero Global Sources and all-rejected retries that preserve
existing Sources. After a client purge, the SPA fetches a fresh session,
uses `previewId` to require the exact stored preview from the preview route, redisplays all
paths/states/exclusions, and only then offers retry; disable is available immediately.
Published tools are derived from `sources[].tool` and cannot also be retryable. The DTO
contains no canonical/admitted root, digest, or source content; the separately fetched
capability-protected preview supplies its own digest for the unchanged enable request.
`toolFailures` lets a fresh client attach each session-owned deterministic admission/scan
Diagnostic to its exact tool; its IDs also occur in `sessionDiagnosticIds`. A control with a
null `diagnosticId` has no row, and serialization rejects a dangling, duplicate, cross-tool,
or non-session Diagnostic reference. The rows remain until the owning control failure is
cleared or disable commits removal.
`GlobalBatchStatus` is exactly `{ scanRequestId, tools, phase, failureRef }`. `tools` is the
non-empty fixed-tool-order admitted subset; `phase` is
`waiting \| enumerating \| reading \| deriving \| recognizing \| failed`; and `failureRef`
is null except in `failed`. A deterministic terminal failure uses
`{ kind: 'tool-failures', failedTools }`, where the non-empty fixed-tool-order tools are
exactly those whose sole current Diagnostic owner is a `toolFailures` row caused by that
batch; it does not repeat Diagnostic IDs or create another owner reference. A thrown/rejected terminal
failure uses `{ kind: 'operation-error', operationErrorId }`, which must equal
`lastOperationErrorId`. There is no tool-independent deterministic Global batch failure:
every returned deterministic failure is attributed to at least one exact tool, while
cross-tool assembly/invariant/retention/serialization failures throw or reject and use the
generic Operation Error. On success, `batchStatus` is removed only in the same commit that
publishes every new Source with the same `Source.scanRequestId`; `active-no-job` creates no
status. Retry acceptance replaces a prior failed status, and disable acceptance clears it
while revoking the batch. Thus every accepted queued/running/terminal batch remains request-
correlated even when delivery of its 202 response fails.
While the disable barrier is pending or active, the view reports `state: disabling`, both
job/retry arrays are empty, the UI offers no retry, and the enable API rejects retry. The
view becomes null only when the disable commit has removed all controls and consent.
While `state: active` and `globalEnableInProgress` is non-null, the UI offers no enable or
retry and duplicate enable returns `409 global-enable-in-progress`; a retry leaves the
pre-operation `retryableTools` projection unchanged until its atomic disposition. While
`state: active` and `pendingTools` is non-empty, `batchStatus` is a non-failed active
phase with the same tool set, and `retryableTools` remains an
informational projection of already rejected/non-pending admitted tools, but the UI does
not offer retry and the enable API returns `409 global-enable-in-progress`; disable remains
immediately available. Retry is offered only after `pendingTools` becomes empty and the
matching frozen preview has been retrieved and verified. The invariant forbids every
`unvalidated` control in an active serialized view; every accepted pending control is
already `admitted` and has the same accepted-batch membership as `pendingTools`.

An accepted admitted-subset Global batch throw/rejection atomically creates one `OperationError`,
sets `lastOperationErrorId` to that ID, and leaves every tool without a per-tool failure for
that throw/rejection. A later same-consent retry preserves the reference through any
pre-acceptance failure, then clears it only when deterministic validation reaches
`active-no-job` or a replacement batch is accepted. A successful replacement batch commit
also leaves it clear; a terminal failure of that batch atomically replaces it with the new
error and removes the superseded unreferenced error. Global disable clears the field and its
referenced error. Repository operations and rescans of already published Sources preserve
both. Thus every non-null value resolves to exactly one retained error and every such Global
batch error has exactly one owner.

### GlobalEnableOperation

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque string | Unique coordinator command for one initial enable or exact-consent retry |
| `kind` | `initial-enable \| retry` | Closed operation type; neither is a committed generation |
| `commandEpoch` | non-negative integer | Captured from the coordinator when accepted; every asynchronous continuation must still match it |
| `previewId` | opaque string | Must equal the frozen consent preview for the whole operation |
| `previewEpoch` | non-negative safe integer | Captured from the exact preview object at registration and revalidated with object identity after every asynchronous boundary and before terminal commit |
| `tools` | non-empty sorted tool enum[] | Exact fixed three-tool set for initial enable, or complete server-derived `retryableTools` subset for retry; never supplied or narrowed by the client |
| `scanRequestId` | opaque ASCII string or null | Allocated once only when at least one root is admitted and the single subset scan is accepted; shared by that batch and its one committed generation |
| `status` | `waiting \| validating \| admitting \| queueing-batch \| draining \| cancelled \| complete` | `draining` begins when disable aborts the operation; no new authority or job may be published afterward |
| `responseDisposition` | `unset \| 202-queued \| 202-active-no-job \| 409-global-disable-pending` | Chosen exactly once at the coordinator linearization point; `202-queued` describes one atomic admitted-subset job |
| `abortSignal` | internal `AbortSignal` | Shared by root validation/admission and every pre-queue safe-fs call |

Initial enable registers this command and freezes the exact current preview object/epoch
under the same coordinator lock while keeping the provisional consent, three controls,
contexts, candidate IDs, and all admission outcomes operation-local and unobservable; it
does not create `globalControl` or mutate `pendingTools` before deterministic validation of
all three entries finishes. While registered, only the authority-free
`globalEnableInProgress { kind: 'initial-enable', operationId, previewId }` coordinator
projection is visible; it disappears when the operation unregisters or atomically creates
`globalControl`, and never exposes partial tool outcomes. Retry registers the command against the existing active consent
and snapshots its controls, failed `batchStatus`, diagnostics, and pending state before any
mutation, then publishes only the authority-free
`globalEnableInProgress { kind: 'retry', operationId, previewId }` projection. Retry
validation/admission is otherwise operation-local and unobservable until a
buffer-bound batch or active-no-job disposition commits. Root validation/admission
and scan-job creation run only under the coordinator. Before and after every asynchronous
boundary, a continuation must prove the same active `operationId`, `commandEpoch`, exact
preview object/`previewEpoch`, and non-aborted signal plus either the same initial
operation-local provisional state or the
same active retry control. Initial enable and retry register those transitions under the
coordinator lock before changing any session state. Cancellation or disable drains the
operation so late continuations cannot enqueue work or regain authority.
At most one `GlobalEnableOperation` is running or queued. Deterministic lexical, exact
structural-`lstat` absence, link/type, and boundary outcomes partition the tools into
rejected and admitted sets. Any other throw/rejection unwinds to the REST owner: initial
enable discards all provisional state without activating consent/control, while retry
restores its exact pre-operation snapshot; neither commits a partial admitted subset. After
every owned tool reaches a deterministic validation outcome, the coordinator performs the
general pre-acceptance response transaction under its lock. It first validates the current
operation ID/command epoch/preview object/preview epoch/signal and prepares, without publication, either the initial consent plus
three controls or the retry partition, a candidate batch/`scanRequestId` and
`202-queued`, or no job/null ID and `202-active-no-job`, together with the exact projected
success envelope. It fully validates, JSON-serializes, UTF-8-encodes, and length-materializes
that envelope into one immutable buffer before activating controls, transferring a job,
clearing `lastOperationErrorId`, replacing a failed `batchStatus`, clearing superseded
diagnostics for newly admitted tools, or choosing a public disposition. Serialization failure
discards the initial provisional state or restores the retry's exact pre-operation
control/pending/error snapshot; the candidate ID never becomes a `scanRequestId` and the
REST owner returns the null-ID pre-acceptance Operation Error. After the buffer exists, the
coordinator revalidates the same operation ID/command epoch/preview object/preview epoch/
signal and barrier state under the same lock and only then atomically activates/applies the
controls, clears the prior `diagnosticId` for each tool admitted into this accepted batch,
promotes and enqueues the one candidate batch, creates its `batchStatus`, and sets
`pendingTools`, or commits active-no-job with null `batchStatus` while retaining/replacing
only rejected-tool diagnostics, chooses the disposition,
marks the operation complete, unregisters it, and binds that exact buffer. No observer can
see a per-tool Source commit. If the disable barrier has already linearized before that
commit, the prepared buffer/state are discarded, the check instead chooses
`409-global-disable-pending`, and cancellation drains. A drained operation becomes
`cancelled` and is unregistered before barrier cleanup. Thus the operation wins the race
with a committed/buffer-bound `202`, or the barrier wins
with `409`, never both. Terminal operation history is not retained; the one accepted batch
remains represented by all of its admitted tools in `pendingTools` and by its exact
`batchStatus.scanRequestId` until it finishes. A failed status remains with empty
`pendingTools` until retry acceptance or disable.
Delivery after the commit never reserializes the envelope. A zero-byte/partial write, socket
close, or write rejection preserves the accepted controls/job/disposition and creates no
Operation Error, stale overlay, or `lastOperationErrorId`; only later failure of the job
itself can create the accepted-job error with its promoted non-null ID.

### ClosableResourceRegistry

The process-wide registry is the sole owner and close state machine for inspection resources;
`GlobalDisableOperation` references a cleanup lineage but does not own a second state map.

| Field | Type | Rules |
|---|---|---|
| `records` | internal map by opaque resource ID | Exactly one live record per opened inspection resource; IDs and records never serialize |
| `record.resource` | `{ kind: 'file-handle', value: FileHandle } \| { kind: 'directory', value: fs.Dir } \| null` | Null exactly while a preallocated reservation is `opening`; otherwise the exact strong reference, with no numeric descriptor or reconstructed wrapper |
| `record.owner` | `scan-attempt \| global-enable-operation \| global-disable-lineage` plus exact owner ID/source scope | Changes only under the coordinator lock; a revoked continuation cannot reacquire a prior owner |
| `record.state` | `opening \| open \| closing \| close-confirmed \| close-unknown` | Closed transition machine; no reset to `open` and no retry close call from `close-unknown` |
| `record.closePromise` | shared Promise or null | Non-null after `close()` returns its one promise; retained for all waiters through settlement even if a FileHandle event confirms first |
| `record.closeObserver` | one-shot FileHandle `close` observer or null | Armed only for `file-handle` before calling `close`; `fs.Dir` has no equivalent confirmation event |
| `poisoned` | boolean | True exactly while any retained record is `close-unknown`; blocks new inspection filesystem work, but a late FileHandle `close` event can clear it when it confirms the last unknown record |

Before invoking `open()` or `opendir()`, the coordinator allocates the opaque ID and inserts
an `opening` reservation with its exact owner. Failure occurs before any resource exists.
Fulfillment attaches the exact returned resource to that preexisting slot and changes it to
`open` synchronously, with no user callback or intervening await; rejection removes the empty
reservation. An engine failure that prevents this attachment is process-fatal because a live
resource could not be owned, and is never converted into a continuing REST error.
Explicit `Dir.read()` drives enumeration; async-iterator auto-close is forbidden. Every
normal/fatal/cancel/disable `finally` invokes or joins only the registry helper. In one
synchronous coordinator critical section, the first closer installs the FileHandle observer
when applicable and calls the exact resource's `close()` once. If that call throws before
returning a promise, the record moves directly from `open` to `close-unknown`, retains the
exact resource/observer, and poisons the registry. If it returns, the helper stores that
promise and publishes `closing` before releasing the critical section; no observer or caller
can see `closing` with a null promise. A synchronously observed close event wins as
`close-confirmed` while the returned promise remains shared through settlement.
Fulfillment, or a FileHandle `close` event, moves irreversibly to `close-confirmed`. If the
raw promise later rejects after event confirmation, the helper observes that rejection but
treats the shared close result as successful; it neither propagates nor poisons because
physical closure was independently confirmed. At rejection handling time, a FileHandle
without a confirming event, and every rejected `Dir.close()`, moves to `close-unknown`,
propagates through the current owner, and recomputes `poisoned`.
If a later FileHandle `close` event confirms an unknown record, that record becomes
`close-confirmed`; when it was the last unknown, `poisoned` clears and ordinary scheduling
may resume subject to other fences. A directory unknown has no such recovery and therefore
requires restart.
Confirmed records may be removed only after their owning attempt and every referencing
disable lineage release them. Unknown records and their exact resources remain strongly held.

Disable acceptance atomically transfers every affected Global record and every record owned
by the interrupted running Repository command to its `cleanupResourceIds`. A revoked pending
`open`/`opendir` that fulfills later must first register its returned resource directly to
that disable lineage as cleanup-only, then invoke/join the helper without reading or
enumerating it. The barrier waits for all affected continuations to settle and repeats the
registry sweep before terminal commit, so no late resource escapes the lineage. A retry
reuses the exact same IDs, records, promises, observers, and strong references.

A normal close rejection propagates through the trigger-owning runtime/REST boundary and
publishes no attempt result. While `poisoned`, no new Repository/Global admission, scan,
rescan, enable retry, or Global preview capture that could lead to filesystem work is
scheduled; those REST mutations return `409 resource-cleanup-restart-required`, while
already committed read-only DTOs/liveness remain available when no Global-disable fence is
active. Global disable is the security exception: when active/queued Global state exists,
its first request still linearizes revocation, epoch increment, and the control-only data
fence before adopting affected registry records; an existing disable cleanup retry may
still join/sweep its lineage. Either operation returns/retains the generic disable Operation
Error while an unknown record blocks completion. If no Global state/barrier exists, disable
cannot repair an unrelated poison and returns the restart-required conflict. An automatic-startup owner reaches the process top
level. A REST owner leaves the process running but requires restart unless a late FileHandle
event clears the last unknown. A
`finally` therefore guarantees helper invocation/join, not confirmed physical closure.

### GlobalDisableOperation

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque ASCII string | One accepted priority barrier; joined requests share it and its terminal result |
| `commandEpoch` | non-negative safe integer | Incremented and captured at barrier acceptance; every continuation and final commit must match it |
| `commitKind` | `cleanup-only \| remove-active-state` | Chosen at first acceptance and retained unchanged by every retry; only the second has public Global consent/control/Source state to remove |
| `baseGeneration` | `GenerationNumber` | Exact current generation at acceptance |
| `candidateGeneration` | `GenerationNumber \| null` | Base + 1 only for `remove-active-state`; null for `cleanup-only`, which preserves base and every generation-owned ID |
| `status` | `draining \| committing \| failed \| complete` | `failed` retains revoked authority and retryable cleanup state; it is not rolled back to active |
| `closedResourceKeys` | internal set | Contains only synchronously unregistered handle-free contexts and `close-confirmed` closable resources; membership is written only after confirmation and is never used to guess an uncertain close outcome |
| `cleanupResourceIds` | internal set | Exact references into the process-wide `ClosableResourceRegistry` for resources in this cleanup lineage, including interrupted Repository work; failed-operation replacement inherits the same set and records rather than cloning them |
| `frozenPreview` | internal exact preview reference | Retains the pre-barrier preview through `failed`; preview capture/replacement remains fenced until terminal success |
| `successBuffer` | immutable UTF-8 buffer or null | Created only after drain/cleanup and complete final-snapshot construction, before the removal commit |

A no-op disable with no active/queued Global authority and no retained disable failure uses
the ordinary single-stage response gate and mutates nothing. Otherwise request validation
and barrier registration linearize under the coordinator lock. On first acceptance,
`remove-active-state` is chosen exactly when public Global consent/control/Source state
exists; `cleanup-only` is chosen only when cancelling an operation-local initial enable that
has never published Global consent/control/Source state. A retry of a retained failure
inherits the failed operation's exact `commitKind`, `baseGeneration`, removal intent,
`closedResourceKeys`, `cleanupResourceIds` and their exact registry records including every
strong resource reference/shared promise/observer, and `frozenPreview`; the replacement operation retains
the same cleanup lineage rather than cloning or reinitializing it, and never recomputes `commitKind` from the already
partially cleaned public projection. Thus a failed `remove-active-state` operation remains
`remove-active-state` until its terminal success removes the public Global graph.
Acceptance atomically
increments the epoch, registers this operation, irreversibly revokes affected publication
authority, changes an existing `globalControl` to `disabling`, empties `pendingTools`, clears
`batchStatus`, increments `globalContentEpoch`, activates the public Global-content access
fence, and aborts the active/queued `GlobalEnableOperation` and Global scans. An
operation-local initial enable has no control snapshot to expose, but the same internal
barrier still revokes and drains it. This acceptance phase deliberately precedes terminal
response serialization and is the only two-stage exception in the model. A second disable
while the operation is `draining` or `committing` joins the same completion; disconnecting a
joined transport never cancels the barrier.

`globalDisableInProgress` mirrors only this operation's ID/status from acceptance through
terminal failure and is removed only on terminal success; it exposes neither cleanup detail
nor authority. `globalEnableInProgress` disappears as soon as its initial-enable or retry
operation is cancelled/unregistered by the barrier.

From acceptance through `failed`, `committing`, or retry drain, the barrier remains the
highest-priority Global fence. Every Global enable/rescan request returns
`409 global-disable-pending`, no queued Global command may dequeue, and preview retrieval
returns `frozenPreview` without capture/replacement—even when `globalControl` is null because
only an operation-local initial enable existed. It is also a generation fence: no new
Repository rescan is admitted, no generation-mutating command may dequeue, and no scan may
commit while the barrier is non-complete. A new Repository rescan returns
`409 global-disable-pending`. Any Repository command already running at acceptance is
revoked before commit and held for exactly one requeue after terminal disable success, not
released by a failed attempt. Consequently `baseGeneration` cannot change across a failed
disable and its retries; a base mismatch is an internal invariant failure, never a rebase or
overwrite rule.

The same fence rejects every full session/inventory/generation/Source/file/detail/
Diagnostic/relationship/comparison data request and selects only
`GlobalFenceRecoverySnapshot`. It does not depend on drain, close, final serialization, or terminal commit succeeding.
Disable retry inherits the already incremented `globalContentEpoch` and must not make the
retained graph readable again. No Repository or Global inspection data is public until
terminal success or process restart.

The barrier waits for enable to reach `cancelled`, performs the final queued-Global-work
cancellation sweep, closes/unregisters every provisional or control-owned context and open
closable resource through the cleanup state machine, and prepares the zero-I/O removal generation.
A drained enable continuation may close only unattached operation-local resources and can
never enqueue a job or mutate a control. This ordering prevents validation that finishes
after acceptance from adding authority after the sweep. If the barrier wins before enable's
buffer-bound disposition, that enable returns `409 global-disable-pending`; if enable chose
`202` first, the barrier cancels/removes its accepted batch normally. Expected cancellation
creates no Diagnostic or Operation Error.

The barrier uses only `ClosableResourceRegistry` for every ID in `cleanupResourceIds`.
Normal cleanup that raced with acceptance has already transferred or shares the same record
and promise. When a referenced record reaches `close-confirmed`, the barrier may add that ID
to `closedResourceKeys`; normal cleanup outside a disable lineage needs no such set. Retry
joins `closing`, closes each still-`open` record once through the helper, skips confirmed
records, and reports the generic Operation Error again while any referenced record remains
`close-unknown`. It never guesses or double-closes. Terminal disable success requires every
referenced closable resource `close-confirmed` and every context synchronously unregistered.
An indefinitely unknown outcome keeps all public inspection content fenced and requires
process restart for reclamation; the REST-triggered failure itself does not terminate the
process.

After cleanup, while holding the coordinator lock, disable prepares the exact final public
state and success envelope without removing public controls or Sources. For
`remove-active-state` it also prepares base + 1 and the fully rekeyed carried Repository
graph; for `cleanup-only` the response reports base and the generation graph/IDs are
unchanged. It fully validates, JSON-serializes, UTF-8-encodes, and length-materializes that
envelope as `successBuffer`, then revalidates operation ID, epoch, barrier state, and base
generation. Only then does one atomic terminal commit remove the frozen preview and all
remaining operation-local resources and clear `globalDisableOperationErrorId`. For
`remove-active-state` that same commit removes all Global Sources/controls/consent and their
stale failures/diagnostics/batch errors and commits the candidate generation; for
`cleanup-only` it performs no generation/public graph transition. It then marks the
operation complete and binds the exact buffer. Delivery
failure after that commit never rolls back or creates another error.

Any unexpected throw/rejection after barrier acceptance—including drain, close/unregister,
final assembly, or success serialization—propagates to the triggering REST boundary and is
returned as the generic Operation Error. It atomically creates/replaces one retained error
referenced by `InspectionSession.globalDisableOperationErrorId`, with this operation ID and
null `scanRequestId`; `globalControl` remains `disabling` when it exists, publication
authority stays revoked, the prior generation remains current, and no success body/removal
commit is published. This also supplies an owner when only an operation-local initial enable
existed. A later `POST /api/v1/global/disable` starts/resumes idempotent cleanup from the ledger and replaces the
failed operation; another terminal failure replaces the referenced error, while terminal
success alone clears it. Because the trigger is REST, this failure does not terminate the
process. Coordinator queueing uses no product-defined numeric capacity.

### OfficialSourceRecord

`tests/fixtures/conformance/official-sources.json` is immutable release/test data, never
input from the inspected repository and never fetched during product startup or scanning.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | stable dotted string | Unique; every behavior, rule, and strategy `sourceRefs` entry resolves only to this key |
| `canonicalUrl` | absolute HTTPS URL | Exact authored URL on `officialHost`; no credentials, query, or fragment |
| `officialHost` | lowercase DNS hostname | Exact per-record host allowlist; the URL and every permitted redirect hop must match it exactly, with no implied subdomain or sibling host |
| `sectionAnchors` | non-empty exact heading-text strings | Exact rendered heading text only; no heading ID, URL fragment, CSS/XPath, or other executable selector |
| `affectedBehaviorIds` | sorted behavior ID[] | Reciprocal with every referenced `VendorBehaviorStatement.sourceRefs` entry |
| `affectedRuleIds` | sorted rule ID[] | Reciprocal with every referenced `InspectionRule.sourceRefs` entry |
| `affectedStrategyIds` | sorted strategy ID[] | Reciprocal with every referenced `RuntimeCompositionStrategy.sourceRefs` entry |
| `reviewedOn` | ISO date | Updated only after human semantic review |
| `normalizationVersion` | literal `1` | Selects the checked-in deterministic normalization algorithm |
| `snapshotFingerprint` | lowercase SHA-256 | Digest of normalized text from only the selected official sections |
| `assertions` | non-empty maintained assertion[] | Stable assertion ID, paraphrased expected semantics, and affected behavior, rule, or strategy IDs; never copied page text |
| `semanticFingerprint` | lowercase SHA-256 | Digest of canonical JSON for sorted maintained assertions |

The offline contract test validates IDs, reciprocal contract-record links, exact official hosts,
and recomputes `semanticFingerprint`; it never contacts the network. The explicit
maintainer drift command sends no credentials, cookies, repository data, or other local
state. Per source it accepts UTF-8 HTML/Markdown and follows only HTTPS redirects whose
every hop remains on the source's allowlisted official host; redirect loops fail closed.
A redirect to a different final URL is reported for review rather than silently
changing `canonicalUrl`; downgrade, cross-host redirect, wrong content type,
missing/duplicate anchor, decode failure, or a recoverable network/runtime failure is a
hard drift-check failure.

Normalization selects each anchored heading through the next heading of equal or higher
level, removes document chrome plus script/style nodes, preserves prose and code text,
decodes entities, applies Unicode NFC and LF endings, trims line edges, collapses horizontal
whitespace, and joins sections in listed order before SHA-256. A digest or assertion drift
never changes a behavior, rule, or strategy automatically. A maintainer reviews all affected contract records and both
language contracts/research, then explicitly updates anchors, assertions, fingerprints,
and `reviewedOn`; no remote page text or response body is checked in.

At least one affected-ID array is non-empty. Every assertion names a non-empty subset of
that record's reverse-indexed behavior, rule, or strategy IDs rather than a generic product
area. An unsupported record fails
offline contract/build validation before packaging; the scanner never loads this test map,
and no source record, anchor, or assertion is truncated.

### DocumentationStatus, LifecycleQualifier, and EvidenceAssessment

`DocumentationStatus` is the closed completeness/consistency enum `documented |
partially-documented | unknown | conflict`. `LifecycleQualifier` is the separate closed enum
`preview | experimental | deprecated`. A `LifecycleQualifier[]` is unique and ordered
exactly `preview`, `experimental`, `deprecated`; an empty array means only that no lifecycle
claim is maintained and must never be displayed or inferred as `stable`.

An `EvidenceAssessment` is the exact DTO record `{ subjectKind, subjectId,
documentationStatus, lifecycleQualifiers }`. `subjectKind` is `behavior | rule | strategy`,
and `subjectId` resolves the corresponding immutable registry record. Arrays are complete,
deduplicated, and sorted by subject-kind order `behavior`, `rule`, `strategy`, then
`subjectId`; values are copied record by record and never collapsed to a worst/best scalar.
The `ConditionFact.status` value `documentation-conflict` remains a distinct runtime
condition result and is not a `DocumentationStatus` alias.

### VendorBehaviorStatement

`VendorBehaviorStatement` records one atomic, surface-specific interpretation of upstream
documentation. It explains where the product looks; it is not a filesystem matcher and
can never authorize a read.

| Field | Type | Rules |
|---|---|---|
| `behaviorId` | stable dotted string | Unique and defined in exactly one bilingual vendor contract |
| `tool` | tool enum | Owning product |
| `surfaces` | non-empty surface enum[] | For example VS Code, CLI, cloud, or shared local Codex clients; no implicit “all” |
| `vendorScope` | closed scope enum | Repository/workspace, User, hosted/managed, plugin, or runtime-only |
| `lookupBase` | closed locator-base descriptor | Workspace root, Git/repository root, runtime `cwd`, target-path chain, tool home, profile data, active config layer, registered catalog, or hosted state |
| `relativeSelector` | vendor-relative string or null | Path text only; does not contain Inspector glob semantics or grant authority |
| `traversal` | closed traversal descriptor | Exact, ancestor chain, standard-location chain, recursive-under-base, lazy descendant, explicit registration, or none |
| `activationConditions` | condition-key enum[] | Trust, feature flags, target match, installation, enablement, runtime version, and other required inputs |
| `strategyRefs` | sorted strategy ID[] | Composition/selection records applicable to this behavior |
| `documentationStatus` | `DocumentationStatus` | `conflict` retains all conflicting source assertions |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order; empty makes no stability claim |
| `sourceRefs` | non-empty source ID[] | Exact official sections reviewed for this statement; reciprocal with source records |

The registry never encodes an ancestor walk as `**/`. Lookup base, relative selector, and
traversal are separate closed fields. Two surfaces with different bases or traversal have
different behavior IDs even when the relative filename is identical.

### RuntimeCompositionStrategy

`RuntimeCompositionStrategy` records documented layering, selection, fallback,
deduplication, or precedence without turning it into read authority.

| Field | Type | Rules |
|---|---|---|
| `strategyId` | stable dotted string | Unique and defined in the bilingual runtime-composition contract |
| `tool` / `surfaces` | tool enum / non-empty surface enum[] | Exact product and surface boundary |
| `operations` | non-empty ordered closed enum[] | Each entry is `append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| unknown-order`; array order is the documented pipeline order |
| `inputBehaviorRefs` | non-empty sorted behavior ID[] | Only documented inputs; excluded/user/hosted inputs remain explicit conditions |
| `requiredConditionKeys` | condition-key enum[] | Every input required before a terminal applicability result is permitted |
| `documentationStatus` | `DocumentationStatus` | Partial/unknown/conflicting order never becomes a fabricated winner |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Unique fixed order; independent of documentation completeness |
| `sourceRefs` | non-empty source ID[] | Reciprocal official evidence for the operations |

Strategies are immutable contract data. They can explain or project an applicability
assessment, but cannot enumerate a directory, open a relationship target, or merge the
Inspector's Repository and Global sources.

### StructuredInspectorMatcher

| Field | Type | Rules |
|---|---|---|
| `base` | one exact Source-boundary descriptor | Repository or the named consented tool-specific Global boundary; never inferred from a selector |
| `selectors` | non-empty ordered unique `MatcherSelector[]` | Alternatives owned by one static rule; Repository renderings begin `./`, Global renderings are relative to that tool boundary |
| `MatcherSelector.rendered` | canonical string | Human contract spelling; must round-trip exactly from its typed segment program |
| `MatcherSelector.segments` | non-empty `MatcherSegment[]` | Closed ordered program; final token denotes a regular file |
| `MatcherSegment` | exact discriminated union | `{ kind: 'literal', value: NonEmptyMatcherLiteralSegment }`, `{ kind: 'one-segment', suffix: MatcherLiteralSuffix }`, or `{ kind: 'recursive-directories' }`; no executable glob, regular-expression object, implicit discriminator, or extra field |

A `NonEmptyMatcherLiteralSegment` is a non-empty printable ASCII string whose code units are
U+0021–U+007E except `/`, `\\`, `:`, `*`, `?`, `\"`, `<`, `>`, and `|`; `.` and `..` are
also forbidden. This same closed type is used by static fixed prefixes, exact targets, and
fixed derived suffixes. `MatcherLiteralSuffix` is either the empty string or one
`NonEmptyMatcherLiteralSegment`; empty renders the canonical bare `*` token and is allowed
only as a `one-segment` suffix. The compiler rejects any non-ASCII registry path literal, so raw
byte/code-unit relevance cannot disagree with later NFC classification. A `literal` matches
one case-sensitive exact ASCII segment. `one-segment` is rendered as `*` plus
its fixed literal suffix and matches one non-empty segment; it is a directory step when
non-terminal and a file step when terminal. `recursive-directories` is rendered only as
the complete `**` segment, matches zero or more directories, is non-terminal, and cannot
be adjacent to another recursive token. Build validation compiles
and canonical-round-trips every rendering; runtime loads only this immutable typed form.
This permits composites such as descendant context plus a direct child, or
descendant context plus a recursive fixed subtree, without inventing a single ambiguous
expansion enum.

### TraversalPlan

`TraversalPlan` is immutable shipped data compiled from `StructuredInspectorMatcher`; it
is the only traversal program accepted by `safe-fs.ts`.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Bound by the Global preview digest; unknown versions fail registry loading |
| `boundary` | exact Source-boundary descriptor | Copied from the matcher and never inferred from request/display text |
| `selectors` | non-empty ordered `TraversalSelectorPlan[]` | One-to-one canonical compilation of matcher selectors |
| `selectionPolicy` | `all-matches \| codex-global-first-non-empty` | Closed scheduler policy; the second value is valid only for `codex.global.instructions` with the exact ordered selectors `AGENTS.override.md`, `AGENTS.md` |
| `TraversalSelectorPlan.mode` | `repository-program \| global-exact \| global-fixed-subtree` | Closed operation class; no generic ambient-root walker |
| `TraversalSelectorPlan.fixedPrefix` | NFC literal segment array | Empty for Repository; for Global it includes the complete path through the exact target or fixed-subtree root, including that terminal target/subtree segment |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Repository's complete selector program, empty for a Global exact target, or the complete dynamic program strictly below a Global fixed-subtree root |
| `structuralCheckpointTemplates` | exact ordered `StructuralLstatCheckpointTemplate[]` | Closed catalog below; build validation rejects a missing, extra, reordered, or widened template |
| `TraversalSelectorPlan.discoveryCheckpointIds` | ordered checkpoint ID[] | Exact discovery templates that this selector may instantiate; every ID resolves in the owning plan and no runtime-supplied ID is accepted |

Compilation is a closed lossless mapping; the compiler derives every field and rejects
registry-authored traversal fields:

| Mode | Exact field invariants | Exact `discoveryCheckpointIds` |
|---|---|---|
| `repository-program` | `fixedPrefix` is empty; `remainder` equals the complete `MatcherSelector.segments`; matching occurs only through bounded directory enumeration represented by that program | `[]` |
| `global-exact` | Every matcher segment is `kind: literal`; `fixedPrefix` is the non-empty array of all literal values including the terminal regular-file target; `remainder` is empty | `['selector-root-recheck', 'selector-exact-target-discovery']` when `fixedPrefix.length === 1`; otherwise `['selector-root-recheck', 'selector-fixed-prefix-discovery', 'selector-exact-target-discovery']` |
| `global-fixed-subtree` | `fixedPrefix` is the non-empty maximal leading literal directory chain including the fixed-subtree root; `remainder` is the non-empty remaining segment program, its first segment is non-literal, and concatenating literal records for `fixedPrefix` with `remainder` exactly reproduces the matcher program | `['selector-root-recheck', 'selector-fixed-prefix-discovery']` |

For every Global selector execution, row 20 runs first and must complete before row 2 or 3
can perform descendant I/O. For `global-exact`, row 2 is instantiated in array order for every `fixedPrefix` component
except the final target and row 3 exactly once for that final component. For
`global-fixed-subtree`, row 2 is instantiated for every `fixedPrefix` component, including
the subtree-root leaf. Every row-2 component is a fresh observation in that selector
execution. It immediately receives rows 4–7 with expected type directory, and those checks
must succeed before the next component operand is constructed; an observation made by an
earlier selector is not a substitute. Repository selectors instantiate neither row. Row
4–7 occurrences are automatic for each observed candidate—a selected collision-free
enumerated entry, every immutable Global fixed-prefix directory component successfully
observed by row 2, or an immutable exact-file target successfully observed by row 3—and
never appear in `discoveryCheckpointIds`; rows 8–19 are automatic for every ticket, while
rows 21–24 are automatic before every `opendir` and rows 25–28 after its complete sibling
collection. A Global selector with an empty fixed prefix, a non-maximal prefix, a literal-first
subtree remainder, or a field tuple different from this table is invalid. This derivation is
the sole mode/segment-to-checkpoint mapping used by build validation and runtime.

### StructuralLstatCheckpointTemplate

This schema is the complete machine-readable definition of the only filesystem calls that
may convert a rejection. A call site must obtain a module-private, single-call checkpoint
instance from the active `TraversalPlan` before invoking `lstat`; the instance binds its
template ID, exact phase, exact target role, owning root context or pre-admission root
operation, selector/ticket when applicable, raw target identity, and occurrence. It is
consumed whether `lstat` returns or rejects and cannot be reused, serialized, synthesized by
a caller, or transferred to `open`, `read`, `opendir`, `realpath`, or `FileHandle.stat`.

| Field | Type | Rules |
|---|---|---|
| `checkpointId` | closed literal ID | Exactly one catalog row below |
| `phase` | `root-admission \| selector-discovery \| enumerated-admission \| pre-directory-open \| post-directory-enumeration \| pre-open \| pre-read \| post-read` | Exact algorithmic call site; no generic verification phase |
| `targetRole` | `lexical-root-component \| selector-fixed-prefix \| selector-exact-target \| admitted-root \| admitted-ancestor \| directory-to-open-first \| directory-to-open-repeat \| enumerated-directory-first \| enumerated-directory-repeat \| observed-candidate-first \| observed-candidate-repeat \| ticketed-candidate-first \| ticketed-candidate-repeat` | Exact structural object whose spelling/identity is bound by the instance |
| `observation` | `pre-observation \| post-observation` | Fixed by the catalog and never inferred from an error message or current filesystem state |
| `operation` | literal `lstat` | Any other operation is unrepresentable |
| `onExactEnoent` | `absent \| entry-disappeared` | The sole returned outcome for `error.code === 'ENOENT'`; fixed by observation |
| `readAuthority` | literal `false` | A checkpoint result never authorizes opening or reading |
| `multiplicity` | `per-root-component \| per-selector-execution \| per-selector-prefix-component \| per-target \| per-observed-candidate \| per-observed-ancestor \| per-directory-open \| per-directory-open-ancestor \| per-directory-enumeration \| per-directory-enumeration-ancestor \| per-ticket-and-phase` | Runtime may instantiate only the occurrences demanded by the bound plan/ticket |

The ordered catalog is exact:

| Order / checkpoint ID | Phase(s) | Target role | Observation / exact-`ENOENT` outcome | Multiplicity |
|---|---|---|---|---|
| 1 `root-admission-component` | `root-admission` | `lexical-root-component` | `pre-observation` / `absent` | Once for the parsed anchor, then once per lexical component, root to leaf, using exact platform operands |
| 2 `selector-fixed-prefix-discovery` | `selector-discovery` | `selector-fixed-prefix` | `pre-observation` / `absent` | Per plan-declared fixed-prefix component in every selector execution, including a component observed by an earlier selector |
| 3 `selector-exact-target-discovery` | `selector-discovery` | `selector-exact-target` | `pre-observation` / `absent` | Once per exact static target attempted; this is the Codex primary/fallback absence checkpoint |
| 4 `enumerated-admission-root-recheck` | `enumerated-admission` | `admitted-root` | `post-observation` / `entry-disappeared` | Once per observed candidate |
| 5 `enumerated-admission-ancestor-recheck` | `enumerated-admission` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Per admitted ancestor and observed candidate, root to leaf |
| 6 `enumerated-admission-candidate-first` | `enumerated-admission` | `observed-candidate-first` | `post-observation` / `entry-disappeared` | Once per observed candidate before candidate `realpath` |
| 7 `enumerated-admission-candidate-repeat` | `enumerated-admission` | `observed-candidate-repeat` | `post-observation` / `entry-disappeared` | Once per observed candidate after candidate `realpath` |
| 8 `pre-open-root-recheck` | `pre-open` | `admitted-root` | `post-observation` / `entry-disappeared` | Once per ticket |
| 9 `pre-open-ancestor-recheck` | `pre-open` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Per admitted ancestor and ticket, root to leaf |
| 10 `pre-open-candidate-first` | `pre-open` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Once per ticket before candidate `realpath` |
| 11 `pre-open-candidate-repeat` | `pre-open` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Once per ticket after candidate `realpath` |
| 12 `pre-read-root-recheck` | `pre-read` | `admitted-root` | `post-observation` / `entry-disappeared` | Once per ticket |
| 13 `pre-read-ancestor-recheck` | `pre-read` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Per admitted ancestor and ticket, root to leaf |
| 14 `pre-read-candidate-first` | `pre-read` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Once per ticket before candidate `realpath` |
| 15 `pre-read-candidate-repeat` | `pre-read` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Once per ticket after candidate `realpath` |
| 16 `post-read-root-recheck` | `post-read` | `admitted-root` | `post-observation` / `entry-disappeared` | Once per ticket |
| 17 `post-read-ancestor-recheck` | `post-read` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Per admitted ancestor and ticket, root to leaf |
| 18 `post-read-candidate-first` | `post-read` | `ticketed-candidate-first` | `post-observation` / `entry-disappeared` | Once per ticket before candidate `realpath` |
| 19 `post-read-candidate-repeat` | `post-read` | `ticketed-candidate-repeat` | `post-observation` / `entry-disappeared` | Once per ticket after candidate `realpath` |
| 20 `selector-root-recheck` | `selector-discovery` | `admitted-root` | `post-observation` / `entry-disappeared` | Once at the start of every Global selector execution, before row 2 or 3 |
| 21 `pre-directory-open-root-recheck` | `pre-directory-open` | `admitted-root` | `post-observation` / `entry-disappeared` | Once before every `opendir`; for the source root itself this is the complete pre-open sequence |
| 22 `pre-directory-open-ancestor-recheck` | `pre-directory-open` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Every admitted directory ancestor strictly below the root and strictly above the directory to open, root to leaf |
| 23 `pre-directory-open-target-first` | `pre-directory-open` | `directory-to-open-first` | `post-observation` / `entry-disappeared` | Once for a non-root directory to open, before its exact-platform `realpath` |
| 24 `pre-directory-open-target-repeat` | `pre-directory-open` | `directory-to-open-repeat` | `post-observation` / `entry-disappeared` | Once for a non-root directory to open, after its exact-platform `realpath` and before `opendir` |
| 25 `post-directory-enumeration-root-recheck` | `post-directory-enumeration` | `admitted-root` | `post-observation` / `entry-disappeared` | Once after complete sibling collection and before using it; for source-root enumeration this is the complete post-enumeration sequence |
| 26 `post-directory-enumeration-ancestor-recheck` | `post-directory-enumeration` | `admitted-ancestor` | `post-observation` / `entry-disappeared` | Every admitted directory ancestor strictly below the root and strictly above the enumerated directory, root to leaf |
| 27 `post-directory-enumeration-target-first` | `post-directory-enumeration` | `enumerated-directory-first` | `post-observation` / `entry-disappeared` | Once for a non-root enumerated directory, before its exact-platform `realpath` |
| 28 `post-directory-enumeration-target-repeat` | `post-directory-enumeration` | `enumerated-directory-repeat` | `post-observation` / `entry-disappeared` | Once for a non-root enumerated directory, after its exact-platform `realpath` and before closing its `fs.Dir` |

The compiler emits this exact catalog and each selector's exact discovery references.
`safe-fs.ts` alone instantiates the dynamic per-component/per-entry/per-ticket occurrences.
The numeric table order is the immutable schema order, not one chronological run: row 20
precedes row 2/3 for each Global selector, and rows 21, 22 in ancestor order, 23, exact-platform
`realpath`, then 24 complete immediately before each `opendir`. The registered `fs.Dir` is
then driven only with explicit `Dir.read()` until it returns null; while it remains open,
rows 25, 26 in ancestor order, 27, exact-platform `realpath`, then 28 complete. The registry
helper must then reach `close-confirmed` before the sibling buffer may be classified, used
for descent, or used to issue a ticket. For the source root only rows 21 and 25 apply. A
successful earlier `lstat` does not let a later
`opendir`, `open`, `read`, `realpath`, or handle operation reuse its checkpoint. An undeclared
call, mismatched phase/role/target, consumed token, non-`ENOENT` code, or any rejection from
another operation propagates unchanged. For `codex-global-first-non-empty`, only row 3 on
the primary selector can return `absent` and advance to the fallback; an unsafe/binary
outcome or any other rejection ends the branch as specified elsewhere.

For a post-observation `entry-disappeared`, root-role rows 4/8/12/16/20/21/25 map to pathless
source-fatal `safe-fs-root-stale`; ancestor-role rows 5/9/13/17/22/26 map to pathless source-fatal
`safe-fs-ancestor-stale`. They create no `CustomizationFile`, generation, or contracted-
partial result. At pre-ticket rows 6/7, an expected directory is a prospective shared
ancestor and maps to pathless source-fatal `safe-fs-ancestor-stale`, while an expected terminal regular file already has the coherent
attempt-local file identity described below and maps to file-scoped `safe-fs-entry-stale`
plus `readState: stale` under the contracted-partial rule. Ticketed candidate rows 10/11,
14/15, and 18/19 also map to that file-scoped code/state. Directory-to-open rows 23/24 and
enumerated-directory rows 27/28 map
to pathless source-fatal `safe-fs-ancestor-stale`. No other role-to-code mapping is
valid.

Every observation also binds `expectedType: directory | regular-file`. A root component,
admitted ancestor, fixed-subtree leaf, derived intermediate segment, and nonterminal matcher
step expects `directory`; every such non-root directory observation, including rows 6/7
before descent, uses `ownerKind: shared-ancestor-lifecycle`. Only a terminal file candidate expects `regular-file`. A returned
symbolic link or detectable reparse link maps to `safe-fs-link-rejected`. A successfully
returned directory/device/socket/pipe/other non-link type that differs from `expectedType`
maps to `safe-fs-type-rejected`; unusable/ambiguous type metadata instead maps to
`safe-fs-boundary-unverifiable`, and a thrown/rejected metadata operation propagates. For a
root, shared ancestor, or directory observation these are pathless source-fatal lifecycle
outcomes with zero descent/ticket/generation. For an observed terminal file, the service
first binds an attempt-local coherent source/file/path identity with no read authority, so a
link may commit only `readState: unsafe-link` and a non-link type mismatch only
`readState: boundary-rejected` under the contracted-partial rule; neither gets a ticket,
open, or bytes. No other expected/actual-type mapping is valid.

After exact-`ENOENT` handling, every successfully returned verification record is classified
by the following first-matching order. The order is identical in selector-root,
enumerated-admission, pre-directory-open, post-directory-enumeration, pre-open, pre-read,
and post-read phases; phase
changes when the check runs, not its code.

| Priority / failed check | Exact code | Terminal-file read state | Root/ancestor/directory outcome |
|---|---|---|---|
| 1 required identity/type/canonical field is absent, malformed, ambiguous, or unusable | `safe-fs-boundary-unverifiable` | `boundary-rejected` | Pathless source-fatal |
| 2 detectable symbolic/reparse link | `safe-fs-link-rejected` | `unsafe-link` | Pathless source-fatal |
| 3 returned non-link type differs from `expectedType` | `safe-fs-type-rejected` | `boundary-rejected` | Pathless source-fatal |
| 4 parsed canonical anchor/component or containment differs from the admitted exact vector | `safe-fs-boundary-unverifiable` | `boundary-rejected` | Pathless source-fatal |
| 5 `dev` differs from the bound snapshot/handle | `safe-fs-device-changed` | `stale` | Pathless source-fatal |
| 6 `ino` differs, or a path identity differs from the sole open handle | `safe-fs-race-detected` | `stale` | Pathless source-fatal |
| 7 non-type mode bits differ; for a terminal file, size, `mtimeNs`, `ctimeNs`, or `nlink` differs; for a directory between its bound pre-open and post-enumeration snapshots, `mtimeNs` or `ctimeNs` differs | `safe-fs-file-metadata-changed` | `stale` | Pathless source-fatal |

A row stops evaluation for that observation; no lower-priority code is also emitted. A
terminal file uses its coherent file owner and may participate only in contracted partial;
all other roles use the source lifecycle owner and publish no generation. Root-admission
canonical spelling inequality remains the earlier special `safe-fs-root-rejected` outcome.
After all read/post-read checks pass, a NUL byte maps exactly to `readState: binary`,
`encoding: binary`, and file-scoped `file-content-binary`; it is not a safe-fs race code.

Derived candidates never instantiate selector-discovery rows 2 or 3. If the complete
derived path already has collision-free enumeration records, the derivation reuses those
records and their existing admission sequence/ticket. Otherwise the centralized service,
and only that service, performs a typed targeted enumeration: starting at the admitted
program base, it completes rows 21–24 for exactly the current admitted directory and only
then opens it and obtains the complete sibling name set. Before inspecting that set it
completes rows 25–28, requires the registered `fs.Dir` to reach `close-confirmed`, and only
then selects the unique raw entry whose platform-independent classification equals
the next validated program segment. Each newly selected `Dirent` becomes an observed
candidate and receives exactly one rows 4–7 sequence before directory descent or ticket
issuance. Unselected siblings receive no `lstat`, `realpath`, open, or read. A missing exact
classification is a deterministic miss after that directory enumeration; an invalid
relevant name or classification collision is the owning Source-fatal filename outcome.
The interpreter cannot enumerate outside the program's exact segment sequence, and a
derived provenance cannot seed another enumeration. For a Global exact target,
successful row 3 creates exactly one immutable targeted-file observation and exactly one
rows 4–7 sequence follows before ticket issuance. For a fixed subtree, successful final row
2 creates exactly one immutable targeted-directory observation; rows 4–7 bind expected type
directory; rows 21–24 repeat the directory guard immediately before `opendir`, and rows
25–28 plus confirmed close complete before the returned set is used. For an enumerated entry, sibling completion and
collision resolution occur first and exactly one rows 4–7 sequence then precedes ticket
issuance or directory descent.

A Repository plan may perform the broad traversal explicitly represented by its
selector programs, but rows 21–28 guard every directory enumeration around its open/read/
close sequence. A Global plan never begins with `opendir` on its home root. Row 20 guards its
root before fixed selector I/O. An exact
target performs targeted `lstat`/verification only on its fixed ancestors and target; a
fixed subtree may `opendir` only that subtree and permitted descendants. No missing target
causes sibling discovery, and unrepresented neighboring paths receive no `opendir`,
`lstat`, `realpath`, open, or read call. `GlobalConsentPreview.pathPatterns` is rendered
from these exact selectors and its digest binds the schema version, selection policy, and
canonical programs.

`codex-global-first-non-empty` is a project-owned closed scheduler branch, not authored
logic. It safely probes `AGENTS.override.md` first. A safely read non-empty override is the
single published file and short-circuits without any operation on `AGENTS.md`. An absent or
safely read empty override advances to the exact `AGENTS.md` target; a safely read non-empty
regular file there is published, otherwise no Codex instruction file is published. Empty
means that, after removal of an optional leading UTF-8 BOM, the decoded string has
`String.prototype.trim().length === 0`; a whitespace-only file is empty. If either present
candidate has a deterministic unsafe or binary outcome, selection ends with its safe
diagnostic and does not inspect any later selector. A `utf-8-replaced` string is ordinary
decoded text for this policy; because `U+FFFD` is not whitespace, replacement bytes make it
non-empty. A thrown or rejected probe propagates without a domain catch or fallback.
`absent` is only the explicit not-found
result from the exact target `lstat` after the admitted root remains verified. Permission,
type, metadata, ancestor/root, canonicalization, and all other errors—and a target that
disappears after its first observation—are failures, never absence. Thus determining emptiness may safely read
the first target, but the plan publishes at most one readable customization file and never
touches an unrepresented neighboring path. This branch is the sole static-discovery
exception because fallback authority depends on the decoded primary content. If an empty
override was already consumed and the subsequently admitted fallback has the same usable
`(dev, ino)` identity, the fallback receives zero open/read and is not merged as an alias or
provenance. The attempt emits a diagnostic-only fallback `CustomizationFile` with
`readState: boundary-rejected` and file-scoped
`safe-fs-ordered-fallback-alias-rejected`, remains contracted-partial, and does not publish
the empty override probe. Reusing its bytes, reopening the group, or silently omitting the
fallback is forbidden.

### DerivationProgram

`DerivationProgram` is the only program that can turn an independently accepted static
provenance into a derived read candidate. It is an immutable closed discriminated
union, not executable registry content.

| Field | Type | Rules |
|---|---|---|
| `schemaVersion` | literal `1` | Unknown versions fail registry loading |
| `variant` | `marketplace-local-plugin \| codex-fallback-basename \| codex-skill-metadata` | Selects one project-owned interpreter branch |
| `seedRuleId` / `seedKind` | one exact static rule ID / kind | Both must match the owning static `CandidateProvenance` and recognition |
| `declarationFieldId` | closed field ID or literal `matched-path` | Exact allowlisted source occurrence; `matched-path` is permitted only for the location-derived skill-metadata rule |
| `syntaxVariants` | non-empty closed enum[] | Only the listed JSON/JSONC/TOML/frontmatter shapes are accepted; no authored key chooses code |
| `base` | `seed-matched-path-parent \| source-root` | Resolved from the exact seed provenance, never from another alias/provenance or an ambient path |
| `placement` | `at-base \| ancestor-chain-through-seed-owner` | The ancestor-chain form exists only for Codex fallback basenames and is constrained by the seed's collision-free path and source root |
| `prefixPolicy` | `none \| optional-dot-slash \| required-dot-slash` | Applied before individual segment validation |
| `fixedSuffixAlternatives` | non-empty ordered array of `NonEmptyMatcherLiteralSegment[]` | Registry constants appended after extracted segments; an inner array may be empty only for `codex-fallback-basename`; no authored suffix or free-form join |
| `suffixSelectionPolicy` | literal `first-present-exact` | Per placement, tries alternatives in registry order; only a missing exact classification advances, while the first observed path stops the alternatives regardless of its later safe/type/read/parse outcome |

The closed initial mappings are:

| Derived rule | Variant and exact seed | Declaration/syntax | Base and construction |
|---|---|---|---|
| `copilot.derived.local-plugin-manifest` | `marketplace-local-plugin`; `copilot.repo.marketplace`, kind `marketplace` | `marketplace.plugin.source`; plain string or object `source.path`; optional `./` | Seed matched-path parent; each validated relative-path segment is emitted as one authored-segment token; append one of `.plugin/plugin.json`, `plugin.json`, `.github/plugin/plugin.json`, `.claude-plugin/plugin.json` |
| `claude.derived.local-plugin-manifest` | `marketplace-local-plugin`; `claude.repo.marketplace`, kind `marketplace` | Same field; plain string or object `source.path`; required `./` | Seed matched-path parent; validated authored segments plus fixed `.claude-plugin/plugin.json` |
| `codex.derived.local-plugin-manifest` | `marketplace-local-plugin`; `codex.repo.marketplace`, kind `marketplace` | Same field; plain string or object `source.path`; required `./` | Seed matched-path parent; validated authored segments plus fixed `.codex-plugin/plugin.json` |
| `codex.derived.fallback-basename` | `codex-fallback-basename`; `codex.repo.config`, kind `settings/config` | `codex.config.project-doc-fallback-filename`; TOML string-array basename only | Source root; fixed ancestor chain from the source root through the exact parent of the seed's `.codex` directory, one validated basename segment at each position, root-to-narrow order |
| `codex.derived.skill-metadata` | `codex-skill-metadata`; `codex.repo.skill`, kind `skill` | `matched-path`; no authored declaration | Seed matched-path parent; fixed `agents/openai.yaml` |

Marketplace extraction decodes a documented local relative path into individual segments;
every emitted segment passes the same NFC collision, Windows-special, alias, and
containment grammar before a fixed suffix is considered. No program can contain a callback,
function pointer, arbitrary `path.join` recipe, free-form expression, glob, regular
expression, or recursive derivation. Adding a variant or mapping requires a contract-version
change and bilingual fixtures.

The authored-path tokenizer is one closed pure algorithm. It consumes only the semantic
string of the program's exact `ExtractedSourceOccurrence`; it never tokenizes the displayed
literal, expands an environment reference, percent/URL-decodes, URI-decodes, resolves a
home marker, or applies a platform path API. `optional-dot-slash` strips at most one exact
leading U+002E U+002F pair, `required-dot-slash` requires and strips exactly one such pair,
and `none` strips nothing. After that step the value must be non-empty and is split only on
U+002F. A leading/trailing U+002F, repeated U+002F, U+005C anywhere, a first segment beginning
with U+007E, U+003A anywhere, an empty/`.`/`..` segment, U+0000–U+001F or U+007F, an unpaired
surrogate, or a segment not already equal to its NFC form rejects the complete derivation
with zero target filesystem calls. Percent signs and all other accepted code units remain
literal and are never decoded. The `codex-fallback-basename` variant uses the same single-
segment grammar with `prefixPolicy: none` and additionally requires exactly one segment.
The matched-path variant emits no authored token.

`first-present-exact` evaluates a placement's suffix alternatives in their stored order by
the typed targeted-enumeration algorithm. A missing exact classification at any segment of
one alternative advances to the next alternative without touching siblings beyond name
enumeration. Once every segment of an alternative is observed, later alternatives receive
zero filesystem calls; any link/type/boundary/binary/parse/deterministic outcome belongs to
that selected path, and any throw/rejection propagates. At-base mappings have one placement.
`ancestor-chain-through-seed-owner` emits every independently authorized placement in fixed
root-to-narrow order; `first-present-exact` applies separately within each placement and does
not collapse those placements.

### DerivedTicketAuthority

`DerivedTicketAuthority` is a module-private immutable record minted only by `safe-fs.ts`
after successful extraction from an independently accepted static seed. It contains the
exact `DerivationProgram` reference; owning source/boundary/generation/scan IDs; the consumed
seed ticket, seed file/provenance/rule IDs, and nullable source-occurrence key; placement and suffix-
alternative indexes; the exact validated `AuthoredSegmentToken[]`; and the selected target's
collision-free classification segments. Every ID must match the same accepted seed
recognition and current attempt. It grants authority only to that one derived target and
cannot be serialized, cloned, retargeted, used after revocation, or used as another seed.
The source-occurrence key is non-null for declaration-driven programs and must resolve the
exact extracted occurrence; it is null only for `declarationFieldId: matched-path`, where
the exact seed ticket and seed provenance `matchedPath` are mandatory instead.
Each `AuthoredSegmentToken` stores one already-NFC segment plus its closed declaration field
and occurrence; it never stores a path expression or executable operation. A derived-only
ticket carries this record in `authorizingProgram`; an already admitted static ticket keeps
its traversal authority and attaches the derived provenance without minting a second ticket.

### InspectionRule

`InspectionRule` is immutable release data maintained as the implementation counterpart of
the bilingual inspection-rule contract. It is not read from the inspected repository.

| Field | Type | Rules |
|---|---|---|
| `ruleId` | stable dotted string | Unique within a registry; retained across versions only while semantics stay compatible |
| `contractVersion` | date string | Must match `GlobalConsent` and the shipped registry |
| `tool` | tool enum or `shared` | `shared` is limited to cross-vendor safety/derivation rules |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate \| relationship-only \| excluded` | Only the first two may authorize a read |
| `kind` | customization-kind enum or null | Null for a cross-kind relationship/exclusion |
| `sourceKinds` | source-kind enum[] | Repository, Global, or both as explicitly contracted |
| `matcher` | `StructuredInspectorMatcher` or null | Static rules only; never a vendor locator, ambient path, executable glob, or untyped selector string |
| `derivation` | `DerivationProgram` or null | Present only for derived rules; the exact five mappings above are the complete initial registry |
| `behaviorRefs` | sorted behavior ID[] | Exact upstream lookup statements relevant to this policy; exclusions may reference documented User behavior without authorizing it |
| `policyRefs` | non-empty sorted specification ID[] | FR/QR clauses that authorize or intentionally exclude the surface |
| `strategyRefs` | sorted strategy ID[] | Composition facts used for order/applicability, never for path admission |
| `conditionKeys` | condition-key enum[] | Runtime facts needed before applicability can be assessed |
| `precedenceGroup` | stable string or null | Links only rules with documented selection/order semantics |
| `documentationStatus` | `DocumentationStatus` | Describes upstream documentation completeness/consistency, not runtime state |
| `lifecycleQualifiers` | `LifecycleQualifier[]` | Separate upstream lifecycle claims in unique fixed order |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | Exact direct Evidence-cell sources for this rule, reciprocally validated. Evidence owned by referenced behaviors or strategies remains reachable through those IDs and is not silently copied into this registry field |

The build/contract validator checks uniqueness, legal field combinations, selector-program
token/position and canonical-round-trip rules, exact traversal compilation, referenced
rule IDs, closed derivation mapping/acyclicity, and exact fixture agreement before packaging. The runtime
loader checks the embedded registry schema, integrity, and contract version before
scanning. There is no repository-provided plugin for adding rules.

### ScanGeneration

| Field | Type | Rules |
|---|---|---|
| `generation` | `GenerationNumber` | Unique and monotonic within the process; `0` is reserved for bootstrap |
| `baseGeneration` | `GenerationNumber` | `0` for bootstrap; otherwise the last committed generation from which the serialized transaction started |
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-enable-batch \| global-disable` | Closed transaction classification |
| `scannedSourceIds` | sorted opaque source ID[] | One for a Repository/per-Source Global rescan, one to three for an initial/retry Global batch, and empty for bootstrap/disable |
| `scanRequestId` | opaque ASCII string or null | Required for every scan kind, including one ID shared by a Global enable batch and all Sources it commits; null for bootstrap and Global disable |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Both present on every committed generation; in-flight timing belongs to `ScanAttempt`/`ScanProgress` |
| `outcome` | `complete \| partial` | `partial` means only a contracted partial after complete traversal and serializable assembly with an FR-028-eligible deterministic non-throwing entry-local outcome; `utf-8-replaced` is complete, and a thrown/rejected attempt is never a generation |
| `files` | `CustomizationFile[]` | All enabled sources, deterministically sorted by source, Source-relative Path, then ID |
| `diagnostics` | `Diagnostic[]` | Never duplicate customization source or declared-metadata values |

Generation 0 is created synchronously at process start with `baseGeneration: 0`,
`transactionKind: bootstrap`, empty `scannedSourceIds`, null `scanRequestId`, equal
`startedAt`/`finishedAt`/session `createdAt`, `outcome: complete`, and empty files and
diagnostics. The session initially has no `StaleSourceFailure`, so its derived
`snapshotState` is `current`. Generation 0 is a legal readable base, not evidence that a
Repository admission or scanning succeeded. It coexists with exactly one non-authorizing,
idle Repository Source in the session.
The automatic first Repository scan starts from 0. A deterministic returned failure may
leave generation 0 current with its closed lifecycle state; a thrown/rejected operation has
no REST owner, publishes no application failure representation, and reaches the process top
level with no liveness guarantee. Only a later user-requested rescan failure can mark a
retained snapshot stale.

### StaleSourceFailure

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | Identifies one still-published Source whose latest explicit rescan failed fatally |
| `failureRef` | `{ kind: diagnostic, diagnosticId } \| { kind: operation-error, operationErrorId }` | DTO | Exactly one reference: deterministic returned fatal outcomes use a lifecycle Diagnostic; thrown/rejected accepted REST jobs use only their generic Operation Error |
| `failedAt` | `UtcTimestamp` | DTO | Time the fatal explicit attempt ended |
| `baseGeneration` | `GenerationNumber` | DTO | Last committed generation the failed attempt tried to replace |

`StaleSourceFailure` is a session-owned lifecycle overlay, not a `ScanGeneration` field.
An explicit fatal rescan creates or replaces only the entry for its Source, so failures for
different Sources coexist. A complete or contracted-partial scan commit clears the entry
and referenced Diagnostic or Operation Error only for the Source it successfully refreshed;
a commit for another Source carries all unrelated entries and failure records forward.
Global disable clears entries and referenced records for the Global Sources it removes,
while a remaining Repository entry keeps the
session stale. `snapshotState` is `stale-after-fatal-rescan` exactly while this array is
non-empty. Automatic first Repository failure and initial Global enable failure create no
`StaleSourceFailure` entry because neither failed to refresh an already committed Source graph.
A deterministic returned failure may create its closed lifecycle Diagnostic; a startup
throw/rejection creates no product failure record, while a REST-owned Global error creates
only its Operation Error. Initial Global enable preserves every pre-existing entry and
derived snapshot state.
Queuing a retry changes that Source's operational status to `scanning` but does not clear
its entry or referenced failure. An unrelated commit carries both the entry and reference plus the Source's failed/scanning
lifecycle overlay; only the affected Source's successful commit moves it to
`ready`/`partial` and resolves the entry.

### ScanAttempt

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `attemptId` | opaque string | internal | Identifies one serialized, uncommitted transaction |
| `scanRequestId` | opaque ASCII string or null | internal | Required for a source scan, generated for automatic and explicit commands, and copied to Source/progress/generation; null only for zero-I/O disable |
| `triggerOwner` | `{ kind: 'startup', operationId: null } \| { kind: 'rest', operationId: opaque ASCII string }` | internal | Automatic first Repository work uses `startup`; explicit rescan copies its accepted REST operation ID; a Global batch copies its `GlobalEnableOperation.operationId`; requeue preserves the exact value |
| `baseGeneration` | `GenerationNumber` | internal | Must equal the last committed generation when the attempt starts |
| `transactionKind` / `scannedSourceIds` | same closed values as `ScanGeneration` | internal | Identifies one requested Source scan or atomic Global subset operation without changing committed state |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| cleanup-only \| fatal \| cancelled` | internal | Only the two committable outcomes may create the next generation; `cleanup-only` follows disable or shutdown revocation and cannot mutate public state |
| `publicationAuthority` | `active \| revoked` | internal | Disable/shutdown changes this irreversibly to revoked before any later continuation can publish |
| `workingSet` | provisional source graph, files, metadata, relationships, and diagnostics, or null | internal | Null while queued; once running, isolated from every public DTO until one atomic commit and destroyed on fatal failure or cancellation |

No field from an in-flight attempt is merged into or exposed through the committed
snapshot. A contracted partial result is public only after complete traversal, an
FR-028-eligible deterministic non-throwing entry-local outcome, successful
assembly/serialization, transition to `committable-partial`, and atomic commit of the whole
generation. A throw or rejection is not caught by the scan domain and therefore creates no
domain transition or result. The trigger-owning outer boundary revokes publication authority,
destroys the abandoned working set when cleanup can run, preserves the prior snapshot, and
records only the generic REST `OperationError` when that boundary owns an accepted REST job.
Every accepted scan-job Operation Error copies both IDs from `triggerOwner` and
`scanRequestId`; startup-owned propagation creates no Operation Error. Unregistering a
`GlobalEnableOperation` after batch acceptance does not erase the copied owner, and a
disable-interrupted Repository requeue preserves it.

A single `ScanCoordinator` serializes `GlobalEnableOperation`, Repository scan, Global scan,
and Global-disable transactions. Source scans and root admission never execute concurrently.
Ordinary source commands are FIFO. Global disable is a priority barrier: acceptance changes
`globalControl.state` to `disabling` and empties pending/retry arrays only when an active
consent/control snapshot exists. With only an operation-local initial enable,
`globalControl` remains null while the internal barrier drains it. In either case acceptance
rejects new Global-enable/Global-rescan commands. It aborts and discards the active uncommitted
transaction, aborts and drains an active/queued Global enable operation, performs a final
queued-Global-command cancellation sweep, and places a zero-I/O disable transaction next.
An interrupted Repository command is retained for exactly one requeue only after terminal
disable success; it preserves the same `operationId`, `scanRequestId`, trigger owner, requested
Source, and queue order, returns the existing command to `waiting`, creates no new REST
admission or interim success status, and remains held while disable is failed. An interrupted Global
command is not requeued. A second disable while that barrier is draining/committing joins the same completion and creates no
additional transaction. If there is no tool-specific Global Source or graph, active consent
record, retained admitted Global root context, affected `ClosableResourceRegistry` record in
`opening`/`open`/`closing`/`close-unknown`, running/queued Global scan/enable command, or
retained disable failure, and the registry is not poisoned, disable is an immediate no-op
regardless of unrelated Repository work. An unrelated poison instead returns
`409 resource-cleanup-restart-required`. A transaction
starts from the then-current generation N. It carries the unchanged source graph forward
and builds one scanned Source replacement, or the entire Global admitted subset, off to the
side. A complete or contracted-partial result commits exactly N+1 atomically. Every source
then reports N+1, every file/recognition/provenance/
relationship ID—including IDs for an unchanged source—is regenerated, the new snapshot
clears the `StaleSourceFailure` and referenced failure only for each successfully scanned Source,
carries both for other Sources, and clears generation-scoped comparison/editor
state. A `remove-active-state` Global-disable transaction removes every tool-specific Global
graph and its stale-failure entry/diagnostic pair under the same N+1 commit rule without
filesystem I/O; an unrelated Repository pair remains. A `cleanup-only` disable removes only
operation-local/frozen control resources, preserves N and every generation-owned ID, and
then releases the held Repository command.

A deterministic fatal attempt never creates or partially merges a `ScanGeneration`. Its entire
`workingSet`, including any provisional partial result, is destroyed. N, every
prior ID, and all committed content remain visible. If and only if the attempt was an
explicit rescan, the session overlay creates or replaces that Source's
`StaleSourceFailure` and actionable lifecycle Diagnostic; failures for other
Sources remain. If this is the first explicit Repository rescan after an automatic failure,
the terminal transition also removes `repositoryFailureDiagnosticId` and its old
`repository`-owned Diagnostic, then creates the deterministic
`published-source:<sourceId>` Diagnostic or accepted-job Operation Error referenced by the
new stale entry in the same atomic overlay update. A fatal automatic first Repository scan leaves bootstrap generation 0 current.
A fatal initial Global enable adds no `StaleSourceFailure` entry for the missing tool,
creates/replaces that tool's keyed failure diagnostic, and preserves all pre-existing
entries and the derived snapshot state. Automatic first Repository failure likewise uses the
Repository failure record. Both report that no new inventory was committed. Expected cancellation by a
Global-disable barrier emits no failure diagnostic;
a different deterministic returned safe failure is an out-of-generation session-lifecycle Diagnostic.
Its attachment scope follows the `Diagnostic` rules below: a file-scoped record carries
`sourceId`, `fileId`, and Source-relative Path together; source- and session-scoped records
never fabricate a file ID or path. It never carries customization source values and never
enters `Source.diagnosticIds`. The
coordinator then starts the next queued transaction from the still-current N. A later
successful complete or contracted-partial scan of the affected Source replaces N with N+1
and clears only its entry and failure reference; a different Source's commit leaves both unresolved. A throw/rejection bypasses this domain classification and is handled only as described by `OperationError`; an accepted explicit rescan MUST create the same stale overlay referencing that Operation Error instead of a Diagnostic, while a pre-acceptance failure creates no overlay. At
most one scan command per source is running or queued; duplicate scan commands
return the documented conflict. Disable uses the join/no-op rules above and is not a
duplicate scan command.

Disable or process shutdown stops new scheduling and revokes `publicationAuthority`. A
still-pending Node.js filesystem promise moves the attempt to `cleanup-only`; every late
byte, graph/Diagnostic/DTO/log result is discarded and opened handles are closed during
cleanup. API and liveness processing continue. A disable barrier can revoke Global
authority immediately but cannot claim physical drain before an uncancellable kernel
operation settles.

### ScanProgress

| Field | Type | Rules |
|---|---|---|
| `scanRequestId` | opaque ASCII string or null | Non-null for waiting/active/final source-scan progress and equals `Source.scanRequestId`; null for barrier-owned disable progress |
| `phase` | `waiting \| cancelling \| enumerating \| reading \| deriving \| recognizing \| complete` | `waiting` means queued; `cancelling` means a disable/shutdown abort is draining; neither contains a path or source content |
| `queuedAt` | `UtcTimestamp` or null | Set when an accepted command waits behind another transaction; cleared when work begins |
| `startedAt` | `UtcTimestamp` or null | Source-scan start, or disable acceptance for barrier-owned progress; null while idle or waiting |
| `visitedEntries` | non-negative safe integer | Number of exact directory entries whose names have been observed by the bound traversal or targeted-enumeration plan |
| `candidateFiles` | non-negative safe integer | Number of collision-free file candidates admitted by rows 4–7; hard-link aliases count by admitted path |
| `readBytes` | non-negative safe integer | Bytes returned by completed reads so far, including bytes later classified binary or discarded after a deterministic post-read race |
| `diagnosticCount` | non-negative safe integer | Attempt-local deterministic diagnostics accumulated so far; excludes lifecycle `OperationError` records |

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
its phase to `cancelling`. After the single disable commit, all Global Sources are removed;
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
owning runtime/REST error rule rather than saturating or wrapping.

### CustomizationFile

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `fileId` | 128-bit, 22-character base64url opaque string | DTO | Newly generated for every generation; API never accepts a path |
| `sourceId` | opaque string | DTO | Must identify one enabled Source |
| `boundaryId` | opaque string | internal | Binds the file to that Source's sole boundary and is never serialized |
| `sourceRelativePath` | `SourceRelativePath` | DTO | Primary display and filtering path relative to the owning Source root |
| `aliasSourceRelativePaths` | `SourceRelativePath[]` | DTO | Other allowlisted hard-link paths in the same Source, sorted; symlinks are never aliases |
| `identity` | file-handle identity from `VerifiedReadReceipt` or null | internal | Present only for a verified-byte outcome; used only for alias/race detection and never treated as durable |
| `verifiedReadReceipt` | `VerifiedReadReceipt` or null | internal | Present only for an accepted `readable` or `binary` file and never serialized |
| `readState` | file read-state enum | DTO | See states below |
| `parseSummary` | `not-applicable \| all-parsed \| mixed \| all-failed` | DTO | Projection of recognition-level extraction states; never a vendor validation result |
| `sizeBytes` | non-negative integer or null | DTO | Exact byte count for a verified-byte `readable` or `binary` file |
| `encoding` | `utf-8 \| utf-8-bom \| utf-8-replaced \| binary \| unknown` | DTO | Invalid non-NUL sequences remain readable as replacement-decoded text |
| `hadLeadingBom` | boolean | DTO | True exactly when one leading UTF-8 BOM was recorded and removed before publishing `sourceText`; independent of whether replacement occurred |
| `sourceText` | string or null | DTO | Complete decoded authored source for a readable text file; literal values and environment-variable reference syntax are preserved exactly; never HTML |
| `contentDigest` | keyed per-session digest or null | internal | Present only for a verified-byte outcome; detects stale content without exposing a reusable content hash |
| `recognitionIds` | opaque string[] | DTO | At least one for an accepted customization file |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | Refer to the same generation |

Read states are `readable`, `binary`, `stale`,
`unsafe-link`, and `boundary-rejected`.
`readable` and `binary` are the only verified-byte outcomes: all four of
`verifiedReadReceipt`, `identity`, `contentDigest`, and `sizeBytes` are non-null and derive
from the sole accepted handle/read. For `stale`, `unsafe-link`, and `boundary-rejected`, no
bytes are accepted and those four fields are null; `encoding` is `unknown`, `sourceText` is
null, and `hadLeadingBom` is false.
Encoding is assigned only after a completed same-handle read passes every post-read check.
Any NUL byte yields `readState: binary`, `encoding: binary`, and null `sourceText`. Otherwise
the full byte sequence is decoded exactly once with UTF-8 replacement semantics. One leading
BOM sets `hadLeadingBom: true` and is removed from `sourceText`. Valid input without a BOM
uses `utf-8`; valid input with a BOM uses `utf-8-bom`; any inserted `U+FFFD` uses
`utf-8-replaced`, whether or not a leading BOM was removed. Replacement-decoded text remains
`readable`, and its exact garbled `sourceText` proceeds through parsing, display, extraction,
and comparison; it does not make the generation partial by itself. Only binary input is
diagnostic-only and comparison-ineligible. Charset guessing, alternate decoding, sampling,
and truncation are unrepresentable; no product byte, line, or item ceiling affects this
state machine.
`parseSummary` is `not-applicable` when every recognition is `not-attempted`, `all-parsed`
when at least one is parsed and none failed, `all-failed` when at least one failed and none
parsed, and `mixed` when parsed and failed recognitions coexist; `not-attempted` records do
not change the last three projections. A file with a failed recognition may still have
`readState: readable` and show its complete source; its diagnostic describes only Inspector
extraction, not validity for the vendor. A non-readable state has null `sourceText` and is ineligible for comparison.
The inspector treats strings such as `$TOKEN`, `${TOKEN}`, and platform-equivalent
environment references as authored text. It never reads, resolves, or substitutes the
referenced process-environment value while building source, metadata, relationships, or
comparison DTOs.

### ToolRecognition

| Field | Type | Rules |
|---|---|---|
| `recognitionId` | opaque string | Unique within generation |
| `fileId` | opaque string | Many recognitions may reference one physical file |
| `provenances` | `CandidateProvenance[]` | Sorted, non-empty set of rule/path admissions for this shared tool/kind interpretation |
| `tool` | `copilot \| claude \| codex` | Required |
| `kind` | closed customization-kind enum | Instructions, rule, skill, agent, prompt/command, hook, MCP, settings/config, output style, plugin, marketplace, or skill metadata |
| `parseStatus` | `not-attempted \| parsed \| failed` | `not-attempted` means no allowlisted extractor applies; `failed` is all-or-nothing for this recognition only |
| `declaredMetadata` | ordered `DeclaredMetadataEntry[]` | Only allowlisted closed field IDs; source-occurrence order and accepted duplicates are preserved |
| `diagnosticIds` | opaque string[] | Recognition-scoped extraction failures within the owning file |

The maintained supported-customization documentation is the normative presentation
allowlist. For every supported `(tool, kind)`, it enumerates the exact closed metadata
`fieldId` values, relationship kinds, and admitted source forms covered by the row. An
entry is eligible only if the tuple allowlist contains it and the exact extractor for the
recognition's admitted source form defines that authored occurrence. Multiple source forms
in one row do not union or transfer schema fields between those forms. An authored field or
reference that fails either gate remains visible only in the complete `sourceText`; it does
not create a `DeclaredMetadataEntry` or `Relationship`, and the parser does not infer an
equivalent entry from its shape or name.

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
`(fileId, tool, kind)` pair. Compatible admissions merge their provenances into that one
record. If extractors for the same pair produce incompatible parsed meanings, that
recognition becomes `failed`, retains its complete source and compatible provenance
admissions, and publishes no metadata/relationship/derivation result. Path-specific scope,
order, record-by-record evidence assessments, and applicability never use a lossy
recognition-level aggregate.
For a Repository-root `.mcp.json`, the Copilot/MCP recognition can therefore carry both
the CLI descendant-inventory provenance and the exact VS Code 1.118+ provenance without a
second file or read. CLI `mcpServers` extraction remains tied to the CLI provenance. The
VS Code provenance is path/surface-only, has `documentationStatus: conflict`, and adds no
VS Code-owned extractor fields or inferred same-name winner until direct official
documentation establishes the root schema and total location order.
The parser never resolves environment references. An FR-028-eligible deterministic,
non-throwing extraction failure discards that recognition's entire
metadata/relationship/derivation result, reports a
safe diagnostic, and may retain the complete readable `sourceText` in a contracted partial
generation. If a read, parser, or Worker operation throws or rejects, the recognizer and
scan domain do not catch, classify, retry, or recover it. It propagates to the trigger-owning
boundary, produces no recognition, item, Diagnostic, or generation result from that attempt,
and is represented only as a generic `OperationError` when a REST boundary owns the trigger.

Recognitions are ordered by the closed tool order `copilot`, `claude`, `codex`, then the
kind order listed in the table, never by opaque ID. Cross-file metadata comparison uses
`(tool, kind, fieldId, occurrence)`; it does not compare two unrelated recognitions merely
because their field IDs coincide.

### SourceTextRange and ExtractedSourceOccurrence

Every authored projection is first represented internally by one
`ExtractedSourceOccurrence`. Its key is the owning recognition plus a closed `fieldId` and
zero-based occurrence; it carries one exact authored literal, one typed semantic value when
available, and one `SourceTextRange`. A range is a half-open `{ start, end }` pair measured
in ECMAScript UTF-16 code units and is valid only when
`sourceText.slice(start, end) === authoredLiteral`.

Metadata, an authored relationship, and derivation may all reference that same
occurrence and therefore reuse its exact range. Exact range reuse is legal only through the
same occurrence key and identical literal. Distinct emitted occurrences must have disjoint
ranges: partial, crossing, containment, or identical overlap under different origin keys is
ambiguous and fails that recognition's complete extraction. An extractor that emits child
value occurrences does not also emit their enclosing collection as a distinct metadata
occurrence. JSONC, YAML, TOML, Markdown/frontmatter/import, astral-character, isolated-
surrogate, and combining-character fixtures must round-trip with `String.prototype.slice`.

### DeclaredMetadataEntry

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `fieldId` | closed metadata-field identifier | DTO | Registry-owned identity for an allowlisted field/path; never an arbitrary authored key |
| `occurrence` | zero-based integer | DTO | Counts occurrences of this `fieldId` in source order and, together with `fieldId`, is the stable metadata-comparison identity |
| `authoredLiteral` | string | DTO | Exact decoded-`sourceText` slice for the value token/span, including authored quotes, escapes, block/collection punctuation, and environment-reference syntax; never replaced by a decoded value |
| `sourceOccurrenceKey` | closed field/occurrence origin key | internal | References the one shared `ExtractedSourceOccurrence`; relationship/derivation projections reuse this key rather than copying a span |
| `sourceRange` | `SourceTextRange` | internal | UTF-16 half-open range whose `String.prototype.slice` must equal `authoredLiteral` |
| `semanticValue` | `SemanticMetadataValue` or null | internal | Separately decoded value for typed classification, relationship normalization, and derivation only; never serialized or displayed; null when the syntax supports literal display but no unambiguous typed value |

`SemanticMetadataValue` is a closed, JSON-safe discriminated union for null, boolean,
string, integer, float, date/time, array, and object values. Integer, float, and date/time
payloads use canonical strings plus their explicit type tag so JavaScript number
precision and parser-specific date objects cannot change the semantic value. Arrays and
objects recursively contain the same union as supported by the selected parser and runtime;
objects use ordered key/value entries rather than a JavaScript object map.
Despite the field name, this union is mechanical typed decoding of an authored literal. It
cannot represent natural-language meaning or intent, semantic rank, validity/correctness/
effectiveness/compliance/quality, policy/remediation advice, or a fix action. Inspector-
owned schema/registry validation never converts it into a customization-file verdict.

The array is serialized in exact source-occurrence order. Accepted duplicate field
occurrences remain separate rather than being collapsed by a map. JSON transport escaping
does not alter the DTO string after JSON decoding. JSONC syntax-tree ranges, YAML
CST/source-token ranges, TOML lexical spans cross-checked with semantic parsing, and
Markdown/frontmatter/import spans must reproduce the exact substring. Missing,
ambiguous, illegally overlapping, or non-round-tripping spans discard the recognition's complete
metadata/relationship/derivation extraction. Structural comparison matches
`(tool, kind, fieldId, occurrence)` and compares `authoredLiteral`, so semantically equal but lexically
different values remain visibly different.

### CandidateProvenance

| Field | Type | Rules |
|---|---|---|
| `provenanceId` | opaque string | Unique within generation and its owning recognition; used to anchor path-relative relationships |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate` | Relationship/excluded rules can never appear here |
| `ruleId` | stable inspection-rule ID | One shipped rule that admitted the owning recognition |
| `matchedPath` | `SourceRelativePath` | Exact candidate path admitted by this rule; must be the file's primary or alias path in the same Source |
| `seedFileId` | opaque string or null | Required for a derived candidate; null for static candidates |
| `seedProvenanceId` | opaque provenance ID or null | Required for a derived candidate and resolves one exact independently admitted static provenance; null for static candidates |
| `seedRuleId` | stable rule ID or null | Rule of that exact seed provenance; required for derived candidates and null for static candidates |
| `declarationKey` | closed field/component identifier or null | Never duplicates an arbitrary authored declaration value |
| `seedSourceOccurrenceKey` | internal occurrence reference or null | Reuses the seed's exact authored occurrence for declaration-driven derivation; null only for static or fixed matched-path derivation |
| `scope` | `ScopeDescriptor` | Closed, displayable admission scope without evaluating runtime effectiveness |
| `evidenceAssessments` | `EvidenceAssessment[]` | Exactly one record for this `ruleId` and one for every `behaviorRefs`/`strategyRefs` member, with no lossy aggregate; distinct from runtime applicability |
| `applicability` | `ApplicabilityAssessment` | Conditions and summary for this rule/path/seed admission only |
| `order` | `OrderDescriptor` or null | Only documented broad-to-narrow/fallback facts for this admission |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Copied from this rule; identifies the applicable surface lookup statements |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | Strategies actually considered for this provenance's order/applicability |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | Exact validated evidence union for this provenance rather than an ambiguous product aggregate |

Provenances are deduplicated by source identity, `matchedPath`, `ruleId`,
`seedProvenanceId`, `seedRuleId`, and `declarationKey`; declarations from two seed
provenances—including hard-link aliases of the same physical seed file—are never collapsed. Within
one Source scan attempt, a file admitted by both static and derived rules is read once and
retains both entries. Every
derivation provenance is one typed edge and cannot seed another edge. An independent
static provenance on that same physical file remains eligible to seed its own typed rule.
The stable array order is `matchedPath`, `ruleId`, the resolved nullable seed provenance's
source/boundary/`matchedPath`/rule key, then nullable declaration key; opaque file and
provenance IDs resolve identity but never determine order.

For each independently admitted static seed provenance, typed extractors enumerate by
derivation `ruleId`, closed declaration field, then zero-based source occurrence. After
validation, targets are deduplicated by the seed's stable provenance key, derivation rule,
normalized target, and declaration key; the earliest occurrence wins. Each distinct target
proceeds through the same candidate and safe-read checks. A
known unsatisfied/shadowed seed emits none; an unresolved eligible static seed emits only
conditional candidates; a derived provenance never enters this algorithm.
Validation occurs before generation-bound ticket selection and applies the contract's
platform-independent NFC segment grammar, unique collision-free enumerated-entry match,
and canonical component-identity check. ADS/device/trailing-dot-space, ambiguous case or
normalization aliases, and 8.3 aliases are therefore rejected without opening them, even
on a host where that spelling would resolve. A single NFD raw spelling that maps uniquely
to one NFC classification record is not an alias and remains eligible through that record.

### ScopeDescriptor and OrderDescriptor

Public scope/order shapes are closed DTO unions so rendering and comparison do not depend
on implementation-specific objects.

`ScopeDescriptor` has a `kind` and only the fields listed for that variant:

| `kind` | Additional fields | Meaning |
|---|---|---|
| `source-root` | none | The owning Repository or tool-specific Global Source root |
| `directory-subtree` | `path: SourceRelativePath` | One collision-free Source-relative directory and its descendants |
| `matching-path` | `path: SourceRelativePath`, `selectorIndex: non-negative integer` | The exact admitted path and immutable matcher-selector alternative |
| `declared` | `fieldId`, `occurrence` | References one `DeclaredMetadataEntry` without duplicating its authored value |

Any path field belongs to the same Source/boundary as the provenance. The stable scope key
is the variant order above, then Source-relative path, selector index, field ID, and
occurrence as applicable.

`OrderDescriptor` contains `components`, a non-empty ordered array of values from this
closed union:

| Component `kind` | Fields | Meaning |
|---|---|---|
| `path-depth` | `direction: broad-to-narrow \| narrow-to-broad`, `depth: non-negative integer`, `path: SourceRelativePath` | Documented path-layer order only |
| `registry-rank` | `strategyId`, `rank: non-negative integer` | Fixed documented fallback/precedence rank within one strategy |
| `source-occurrence` | `fieldId`, `occurrence` | Authored declaration order without copying its value |

Components are already in documented pipeline order. Their stable comparison key is
component position, the component-kind order above, then direction/depth/path,
strategy/rank, or field/occurrence. Unknown or conflicting order is represented by null
plus applicability/documentation facts, never a fabricated rank.

### ApplicabilityAssessment

| Field | Type | Rules |
|---|---|---|
| `summary` | `authored \| available \| selected \| omitted \| shadowed \| disabled \| conditional \| unknown` | Convenience projection only; never called `effective` |
| `conditions` | `ConditionFact[]` | Sorted/deduplicated by key, reason code, basis, then status; no missing input defaults to true |
| `strategyRefs` | sorted strategy ID[] | Strategies used by the projection; empty when only authorship is known |
| `evaluatedFromGeneration` | integer | Prevents facts from surviving a rescan |

Each `ConditionFact` has a `key` (`surface`, `engine-version`, `runtime-cwd`,
`workspace-root`, `repository-root`, `project-root`, `worked-path`, `target-match`,
`scope-availability`, `feature-state`, `trust`, `approval`, `enablement`, `selection`,
`settings-inputs`, `plugin-state`, `agent-context`, `event`,
`documentation-variant`, `tool-availability`, `installation`, `managed-policy`,
`instruction-byte-budget`, `content-limits`, or `external-runtime`), a
`status` (`satisfied`, `unsatisfied`, `unknown`, or `documentation-conflict`), a fixed
`reasonCode`, and a `basis` (`inspected-data`,
`official-rule`, `excluded-input`, or `runtime-input`). A summary is `selected`,
`omitted`, `shadowed`, or `disabled` only when the applicable official rule and every
required input for that conclusion are known. Otherwise it remains `conditional` or
`unknown`.

The shipped condition-reason registry maps every `reasonCode` to one allowed key/basis/
status shape, whether it is required for a conclusion, and one projection role
(`authorship`, `availability`, `selection`, `omission`, `shadowing`, `disablement`, or
`documentation-uncertainty`). An emitter cannot choose a summary directly. Projection is
recomputed each generation using this decision table; the first proven row wins:

| Priority | Summary | Complete proof required |
|---:|---|---|
| 1 | `disabled` | A documented enablement, managed-policy, or tool-availability control is known to prohibit use; this proof is sufficient regardless of later selection facts |
| 2 | `shadowed` | A complete applicable precedence chain proves another candidate wins, and no disabling proof exists |
| 3 | `omitted` | A complete surface/target/selection/budget rule proves exclusion, with no higher-priority proof |
| 4 | `selected` | A documented selection rule proves inclusion and every condition capable of preventing that selection is satisfied |
| 5 | `unknown` | Documentation is absent/conflicting for a required composition or applicability rule, and no sufficient negative proof above exists |
| 6 | `conditional` | A documented applicability path exists, but a required runtime/excluded input is unknown or conflicting, and no sufficient negative proof exists |
| 7 | `available` | Every documented availability requirement is satisfied, no unresolved fact can prevent availability, and no selection result is claimed |
| 8 | `authored` | Only the accepted authored declaration is proven; installation/availability is intentionally not claimed |

Only file-originated candidate declarations can project `authored`. A relationship with
no stronger proof is `conditional` or `unknown`. Unrelated informational facts do not
block a terminal result; a fact marked required by the reason registry does. Conditions
remain authoritative and visible even when a higher-priority sufficient outcome wins.
These summaries mechanically project documented explicit facts; they do not interpret
natural-language content, judge customization validity/correctness/effectiveness/compliance/
quality, or advise remediation.

### Relationship

| Field | Type | Rules |
|---|---|---|
| `relationshipId` | opaque string | Unique within generation |
| `fromFileId` | opaque string | Required |
| `fromRecognitionId` | opaque string | Required; must belong to `fromFileId` and own `fromProvenanceId` |
| `fromProvenanceId` | opaque string | Required; its `matchedPath` is the sole base for path-relative normalization |
| `ruleId` | stable relationship-only rule ID | Proves that the reference can never authorize a read |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptive only |
| `targetOrigin` | `authored \| documented-default` | `authored` requires one exact source occurrence; `documented-default` is allowed only for a fixed registry-defined default such as an omitted Codex plugin hook |
| `authoredTarget` | string or null | For `authored`, exact decoded-source slice for this target token/span, including authored quoting and escapes; for `documented-default`, null so a synthetic path is never presented as authored |
| `sourceOccurrenceKey` | internal occurrence reference or null | For `authored`, references the same `ExtractedSourceOccurrence` used by metadata/derivation when applicable; null for `documented-default` |
| `targetSourceRange` | `SourceTextRange` or null | Required internally for `authored`, uses UTF-16 offsets, and must reproduce `authoredTarget`; null for `documented-default` |
| `semanticTarget` | string | Internal separately decoded authored target or fixed registry default used only for path normalization/applicability; never substituted for an authored display value |
| `normalizedTarget` | `SourceRelativePath` or null | Set only when lexical normalization is safe and the target remains in the owning Source |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Does not authorize a read |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | A relationship itself never expands content |
| `evidenceAssessments` | `EvidenceAssessment[]` | Exactly one record for this `ruleId` and every `behaviorRefs`/`strategyRefs` member; partial, unknown, conflict, and lifecycle qualifiers stay record-specific |
| `behaviorRefs` | sorted behavior ID[] | Surface-specific upstream statements that permit describing this edge |
| `strategyRefs` | sorted strategy ID[] | Composition/selection strategies considered for the edge |
| `sourceRefs` | sorted source ID[] | Exact evidence union from the relationship rule, behavior, and strategy records |
| `applicability` | `ApplicabilityAssessment` | Edge-specific context/tool/trust/selection facts; never read authority for the target |

Although `Relationship.kind` is globally closed, an extractor may emit only the subset
listed by the maintained presentation allowlist for the owning `(tool, kind)`. A reference
with an unlisted relationship kind remains authored source text only and cannot be promoted
to a generic, inferred, or fallback relationship.

Relationships are direct only. A candidate target is independently admitted by a static
or derived rule; a
relationship itself never promotes the target. Typed candidate derivation is modeled in
`CandidateProvenance` and is not relationship traversal.
The relationship summary describes only whether the reference edge may be available or
selected under known product rules; it never describes target-file effectiveness.

An extracted reference is emitted once per applicable candidate provenance, so hard-link
aliases or distinct rule admissions never borrow another provenance's directory as the
relative base. Every extractor assigns an internal origin key made only from a closed declaration-field
identifier, `targetOrigin`, and a zero-based source or deterministic synthetic occurrence; it contains no authored field value and is
never serialized. The deduplication key is `fromFileId`, `fromRecognitionId`,
`fromProvenanceId`, `ruleId`, `kind`, the origin key, and a target identity. That identity is the normalized target when available and otherwise
a process-keyed digest of the exact authored target for `authored`, or the fixed default ID
for `documented-default`; neither digest nor default ID leaves memory or enters logs.
Extractors emit by the originating provenance's stable array key, recognition tool/kind,
relationship `ruleId`/kind, declaration-field identifier, then source-occurrence order.
Distinct authored source occurrences remain distinct edges even when their semantic targets
match. A documented default uses `authoredTarget: null`; the UI labels it as a documented
default and may display the `normalizedTarget`, never as source-authored text.
When one declared field drives metadata, a relationship, and derivation, all three
projections reference its one occurrence/range; only overlaps between distinct origin
occurrences trigger extraction failure.
Opaque IDs never participate in ordering. No target is opened while constructing or
retaining a relationship; only independent candidate admission can authorize a read.

### Diagnostic

| Field | Type | Rules |
|---|---|---|
| `diagnosticId` | opaque ASCII string | Server-generated and unique within generation/session |
| `code` | stable closed code | Suitable for objective tests and documentation links |
| `severity` | `info \| warning \| error` | Does not imply vendor validation |
| `scope` | `file \| source \| session` | Required attachment discriminator; independent of generation-scoped versus session-lifecycle lifetime |
| `sourceId` | optional opaque ASCII ID | Required for `file` and `source`; forbidden for `session` |
| `fileId` | optional opaque ASCII ID | Required only for `file`; forbidden for `source` and `session` |
| `sourceRelativePath` | optional Source-relative Path | Required only for `file`, must equal that file's path within `sourceId`, and is forbidden for `source` and `session` |
| `messageKey` | localized key | English/Japanese messages remain equivalent |
| `safeArgs` | JSON-safe map | No customization source, declared-metadata value, comparison content, process-environment value, arbitrary exception string, or outside path |
| `nextStepKey` | localized key | Every error identifies a practical next action |
| `lifecycleOwnerKey` | `repository \| global:<tool> \| published-source:<sourceId> \| null` | Internal and never serialized; required and non-null for every out-of-generation lifecycle Diagnostic, null for generation-owned candidates, and validated against the one public owner reference |

The three legal attachment shapes are therefore exactly: `file` with non-null
`sourceId`, `fileId`, and `sourceRelativePath`; `source` with non-null `sourceId` and null
file/path fields; and `session` with all three location fields null. A DTO using any other
combination is invalid. Scope is orthogonal to lifetime: for example, a generation-wide
deterministic assembly-outcome Diagnostic may be session-scoped, while a fatal rescan lifecycle record may
be source-scoped.

The closed diagnostic-code registry is keyed by `(code, ownerKind)` and fixes severity,
attachment scope, message/next-step keys, and an argument schema. `ownerKind` is an internal
shape discriminant, while `lifecycleOwnerKey` identifies the one lifecycle instance; neither
is serialized. Candidates are deduplicated by code, `ownerKind`, `lifecycleOwnerKey`, scope,
source/file IDs, Source-relative Path, and canonical safe arguments. They are emitted in
fixed phase, lifecycle-owner semantic order (Repository, fixed Global tool order, then the
existing public Source order), scope, Source-relative Path, rule/code, then emitter-
occurrence order; an opaque Source ID never supplies the sort order. A scan candidate belongs to one
`ScanGeneration`. An out-of-generation lifecycle candidate—including a fatal scan attempt
that cannot be committed—belongs to the session only and is never inserted into a
generation or Source ID list. Authentication, malformed-request, and other client-caused
API errors are returned but not retained as diagnostics.

The session keeps at most one current actionable failure for each lifecycle owner key. An
automatic Repository admission/initial-scan deterministic failure is referenced by
`repositoryFailureDiagnosticId`. The first explicit rescan keeps that reference while
running; terminal success clears it, while deterministic or thrown/rejected terminal failure
atomically removes it and creates the `published-source:<sourceId>` stale owner described
above. Later explicit outcomes use only `StaleSourceFailure`. An unpublished Global tool uses
its `global:<tool>` control record and `toolFailures`; successful publication or Global
disable clears it. A published Source explicit-rescan failure uses
`published-source:<sourceId>` and is referenced only by that Source's
`StaleSourceFailure`; later terminal failure replaces it, while successful refresh or Source
removal clears it. Unrelated owner commits preserve each record. Every non-null public
reference resolves to exactly one unique member of `sessionDiagnosticIds`, and each such
lifecycle Diagnostic has exactly one public owner reference. Diagnostics are
never deliberately truncated or replaced by an aggregate suppression record. A thrown or
rejected operation never enters this registry: it propagates past the domain and, if
REST-owned, is represented only by `OperationError`. If retaining or serializing a
deterministic Diagnostic itself throws or rejects, that new failure follows the same rule
and no Diagnostic or generation from the attempt is published.

The safe-filesystem subset is exactly:

| Code | Allowed `ownerKind` → serialized scope | Severity | Message key | Next-step key | `safeArgs` |
|---|---|---|---|---|---|
| `safe-fs-root-absent` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootAbsent` | `diagnostic.createOrRestoreConfiguredRoot` | exact `{}` |
| `safe-fs-root-rejected` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootRejected` | `diagnostic.correctConfiguredRoot` | exact `{}` |
| `safe-fs-root-stale` | `root-lifecycle` → `session` | `error` | `diagnostic.safeFsRootStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-ancestor-stale` | `shared-ancestor-lifecycle` → `session` | `error` | `diagnostic.safeFsAncestorStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-boundary-unverifiable` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsBoundaryUnverifiable` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-link-rejected` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsLinkRejected` | `diagnostic.replaceLinkWithRegularPath` | exact `{}` |
| `safe-fs-type-rejected` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsTypeRejected` | `diagnostic.replaceWithExpectedFilesystemType` | exact `{}` |
| `safe-fs-device-changed` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsDeviceChanged` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-entry-stale` | `candidate-file` → `file` | `error` | `diagnostic.safeFsEntryStale` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-race-detected` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsRaceDetected` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-file-metadata-changed` | `root-lifecycle` or `shared-ancestor-lifecycle` → `session`; `candidate-file` → `file` | `error` | `diagnostic.safeFsFileMetadataChanged` | `diagnostic.retryAfterFilesystemStabilizes` | exact `{}` |
| `safe-fs-ordered-fallback-alias-rejected` | `candidate-file` → `file` | `error` | `diagnostic.safeFsOrderedFallbackAliasRejected` | `diagnostic.replaceOrderedFallbackHardLinkAndRescan` | exact `{}` |
| `safe-fs-late-derived-alias-rejected` | `candidate-file` → `file` | `error` | `diagnostic.safeFsLateDerivedAliasRejected` | `diagnostic.removeLateHardLinkAndRescan` | exact `{}` |
| `file-content-binary` | `candidate-file` → `file` | `warning` | `diagnostic.fileContentBinary` | `diagnostic.useTextCustomizationFile` | exact `{}` |
| `safe-fs-entry-name-unrepresentable` | `name-lifecycle` → `session` | `error` | `diagnostic.safeFsEntryNameUnrepresentable` | `diagnostic.correctFilesystemName` | exact `{}` |
| `safe-fs-path-normalization-collision` | `collision-lifecycle` → `session` | `error` | `diagnostic.safeFsPathNormalizationCollision` | `diagnostic.correctFilesystemName` | exact `{}` |

No other code/owner pairing is valid. Session-scoped lifecycle rows carry exactly one
validated `lifecycleOwnerKey` and are referenced by the affected Global tool control,
published-Source stale-failure record, or `repositoryFailureDiagnosticId`; the Diagnostic
itself never fabricates a Source or path. File rows require
the coherent already admitted candidate tuple. No row can carry OS error text, an outside
path, filesystem handle/descriptor, or source bytes.

### OperationError

`OperationError` is the only product representation of a thrown or rejected operation at a
REST-owning outer boundary. It is execution-lifecycle state, never a `Diagnostic`,
`CustomizationFile`, `ScanGeneration`, parser result, or operational-log payload.

| Field | Type | Rules |
|---|---|---|
| `operationErrorId` | opaque ASCII string | Server-generated and never derived from an exception; a retained accepted job/barrier instance is referenced by exactly one `StaleSourceFailure`, `GlobalControlView.lastOperationErrorId`, or `InspectionSession.globalDisableOperationErrorId`, while a response-only pre-acceptance instance has no retained owner |
| `code` | literal `operation-failed` | Fixed generic code; no cause taxonomy |
| `messageKey` | literal `api.operationFailed` | Fixed actionable localized message; no exception interpolation |
| `nextStepKey` | literal `api.retryOrRestart` | Fixed practical next step |
| `operationId` | opaque ASCII string | Correlates lifecycle only; may also appear in a path-free operational event |
| `scanRequestId` | opaque ASCII string or null | Null for a pre-acceptance HTTP error or an accepted Global-disable barrier error; otherwise required for a retained accepted scan-job terminal error and equal to that job's admitted ID |

Those are the complete serialized fields. In particular, an Operation Error has no
`sourceId`, `fileId`, path/root/filename, `safeArgs`, content/metadata/authored value,
capability, request/response body, exception class/message/stack/cause/code, parser/system
error, runtime argument, or filesystem descriptor. A pre-acceptance instance is returned in
the failing HTTP response and is not retained in `InspectionSession.operationErrors`. An
accepted-job instance is retained only while exactly one lifecycle owner references it. For
an explicit Source rescan that owner is the Source's `StaleSourceFailure`; success, Source
removal, or a later terminal failure clears or supersedes it. For an initial/retry
admitted-subset Global batch that owner is `GlobalControlView.lastOperationErrorId`; the
same-consent deterministic retry outcome or replacement-batch acceptance clears it, a later
terminal batch failure supersedes it, and Global disable removes it. A Global batch creates
no `StaleSourceFailure` because no failed-attempt Source exists. For an accepted Global-
disable barrier, the sole owner is `globalDisableOperationErrorId`; its scan ID is null, a
later terminal disable failure supersedes it, and terminal disable success clears it. An automatic startup
rejection has no REST boundary owner, creates no Operation Error, and reaches the process
top level.

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
4. `invalid` when the shared pure `LexicalAbsoluteRootParts` parser rejects the absolute
   spelling. This includes POSIX U+FFFD, empty/dot/dot-dot components and repeated or
   non-root trailing separators, plus every Windows UNC/network/device/current-drive form,
   malformed drive form, and the corresponding invalid components. The parser performs zero
   filesystem and network I/O.
5. `eligible` otherwise, carrying the parser's exact accepted platform operands forward to
   post-consent root admission.

The product adds no lexical Windows reserved-name/character policy beyond the shared parser;
later Node.js/OS rejection follows the normal boundary rule. A throw during
`isAbsolute` or state/presentation construction propagates to the preview REST boundary and
creates no preview. No step normalizes the string, changes separators, calls the
filesystem, or silently chooses another root.

### GlobalPreviewDigestEncoding

`previewDigest` is the unpadded 43-character base64url result of
HMAC-SHA-256 under the process's 256-bit preview key. Its input is a single canonical byte
record. `u64(n)` is an unsigned eight-byte big-endian integer. `string(s)` is byte `0x53`,
`u64(s.length)`, then each exact ECMAScript UTF-16 code unit as two big-endian bytes; it
therefore preserves lone surrogates and never uses replacement encoding. `array` is byte
`0x41`, `u64(elementCount)`, then its elements. `record` is byte `0x4f`, `u64(fieldCount)`,
then each `string(fieldName)` and value in its declared order. Integers use byte `0x49`
plus `u64`; Boolean false is bytes `0x42 0x00` and true is bytes `0x42 0x01`; all enums
and IDs use `string`. Null is not used in this digest schema.

The top value is exactly one record with field count 7 and fields in this exact order:
`domain`, whose fixed value is `agent-customization-inspector/global-preview/v1`,
`sessionId`, `previewId`, `allowlistVersion`, `traversalPlanVersion`, `entries`, and
`excludedRuleIds`. Entries stay in Copilot, Claude, Codex order and each is a field-count-7
record in exact order `tool`, `origin`, `lexicalRoot`, `displayRoot`, `pathPatterns`,
`inputState`, `traversalPlans`. `pathPatterns` retain displayed order. `traversalPlans` are
ordered by unsigned UTF-8-bytewise `ruleId`; each is a field-count-6 record in exact order
`ruleId`, `schemaVersion`, `boundary` (`repository`, `global-copilot`, `global-claude`, or
`global-codex`), `selectionPolicy`, `structuralCheckpointTemplates`, `selectors`. Every
checkpoint template is a field-count-8 record in exact order `checkpointId`, `phase`,
`targetRole`, `observation`, `operation`, `onExactEnoent`, `readAuthority`, `multiplicity`.
Every selector is a field-count-4 record in exact order `mode`, `fixedPrefix`, `remainder`,
`discoveryCheckpointIds`. A literal matcher segment is exactly a field-count-2 record
`kind: 'literal'`, then `value`; a one-segment matcher is exactly a field-count-2 record
`kind: 'one-segment'`, then `suffix`; a recursive matcher is exactly a field-count-1 record
`kind: 'recursive-directories'`. Arrays preserve their already contracted order, while
`excludedRuleIds` preserve their contracted sort.
Unknown/missing/extra fields, a noncanonical order, or a public pattern that does not
round-trip from the encoded plans prevents preview creation. Constant-time comparison uses
the 32 decoded digest bytes and rejects a value unless it is exactly 43 ASCII base64url
characters, decodes to exactly 32 bytes, and round-trips to the same unpadded canonical
base64url before comparison.

### OperationalEvent

Operational events are distinct from authenticated session `Diagnostic` DTOs and from
fixed CLI presentation output. Their closed schema has no free-form field:

| Field | Type | Rules |
|---|---|---|
| `eventCode` | stable closed code | Required; conveys the fixed event class without embedding an error/message string |
| `sessionId` / `sourceId` / `fileId` | opaque ASCII IDs or null | Optional event identities only; never resolved to or accompanied by a root, filename, or path |
| `scanRequestId` / `operationId` | opaque ASCII IDs or null | Optional command identities |

Every other field is rejected. In particular, an event contains no Source-relative,
absolute, or canonical path, root, filename, inspected content or metadata, authored value,
capability, request/response body, parser/system error, exception string, or Diagnostic
argument. A file-scoped Diagnostic may expose its `sourceRelativePath` to the
capability-authenticated session, but no projection copies it into `OperationalEvent`.
Fixed help/version text, the single launch-URL line, and fixed actionable startup warnings
are presentation output rather than operational events and still contain no inspected
content, inspected path, or authored value.

### BrowserState

This state is not authoritative and is never persisted.

- `FilterState`: selected source/tool/kind and Source-relative Path query.
- `ClientDataState`: a monotonic `clientDataEpoch`, `currentGeneration`, and one request
  token per session/detail request. Every session response is adopted only when its request
  token still belongs to the current epoch. A generation lower than `currentGeneration` is
  ignored. Before adopting a greater generation, the client increments the epoch, aborts
  all detail/comparison requests, disposes every detail/editor/comparison object, and only
  then replaces the inventory. An equal-generation response is accepted only for the exact
  still-current request token. A detail request captures
  `{ clientDataEpoch, generation: currentGeneration, fileId }`; its callback adopts the response only when the
  epoch and generation still equal current state and that readable `fileId` still exists in
  the inventory. Every invalidation/purge increments the same epoch, so a late callback is
  a no-op even when response delivery was already queued.
- `ComparisonSelection`: zero or exactly two readable `fileId` values from the active
  generation. Monaco compares both complete `sourceText` values; Vue compares complete
  returned `declaredMetadata` values without serializing them into source text. Literal
  differences, including credential-like strings and environment references, remain
  visible.
- `EditorModelState`: generation-scoped Monaco models with opaque in-memory URIs and
  complete authored `sourceText`. The owning editor, subscriptions, and every model are disposed
  independently on route close, selection replacement, file removal, source disable, or
  generation change.
- `SensitiveContentNoticeState`: the fixed warning object plus an `acknowledged` boolean for
  the current authorized browser-session memory lifetime. The UI requires acknowledgement
  before its first `FileDetail` request or comparison construction because complete source
  text, declared authored metadata, authored relationship targets, and either comparison
  side may contain sensitive values. Once acknowledged it covers every such authored-value
  surface in that SPA document; document reload or browser-document close loses it. This
  client-only state is never sent to the API, grants no read authority, and is discarded by
  the central full-session purge path. Route close, selection replacement, file or Source
  removal and generation change dispose their scoped models independently;
  they are not central client-data purges and may retain acknowledgement for the loaded
  document. Global disable instead uses the central full-session purge below.
- A Global-disable action purges all inspection content locally before sending the request; observing
  a greater `globalContentEpoch` or non-null `globalDisableInProgress` in any authenticated
  response repeats the idempotent purge before rendering it. The client increments
  `clientDataEpoch`, aborts every request that could return inspection data, disposes every
  editor/model/comparison, clears warning/filter state, removes all Source, generation, file,
  detail, authored metadata, relationship, and Diagnostic DTO/DOM text, and retains only
  the control/error projections needed to join or retry
  disable. A failed accepted barrier does not restore purged content; a later new full
  snapshot obtains content only after terminal disable success or process restart. If the
  request fails before barrier acceptance, or is a true no-op, an authenticated fresh
  session has a null fence and the purged client may immediately fetch a new full snapshot.
- `RecoveryViewState`: created after any central purge once the retained capability
  authenticates a fresh session. This includes Global-disable action, liveness epoch/fence
  observation, and hidden/page-lifecycle purge. It holds only the adopted `sessionId`, the fresh
  `globalContentEpoch`, `globalControl`, `globalEnableInProgress`, and
  `globalDisableInProgress` projections,
  the exact pathless session Diagnostics referenced by `globalControl.toolFailures`, the
  one generic Operation Error referenced by `globalControl.lastOperationErrorId` when
  present,
  `globalDisableOperationErrorId` plus its referenced generic Operation Error when present,
  and an optional newly verified frozen preview. It offers **Resume inspection** only when
  `globalDisableInProgress` is null and a normal full snapshot can be fetched. It offers immediate disable when control or any enable is active,
  join/wait while disable drains, retry-disable when disable is failed, and Global retry only
  after the preview is verified, `globalEnableInProgress` is null, `pendingTools` is empty,
  and `retryableTools` is non-empty.
  Resume fetches the session again, requires the returned
  `sessionId` to match the adopted liveness baseline, and atomically constructs a fresh
  inventory-summary view with default filters. It restores no prior detail, comparison,
  editor, warning acknowledgement, or authored source; opening detail/comparison later
  requires a new acknowledgement. If authentication fails, only the authorization-lost
  next step to reopen the printed process-lifetime URL remains.
- `SessionLivenessState`: stores the expected `sessionId`, last observed
  `globalContentEpoch`, and the same `clientDataEpoch`. It calls the capability-protected
  liveness route only for initial authorization, return to a visible/focused page, explicit
  Resume, or fresh session adoption, with at most one request in flight. This single-flight
  rule serializes state adoption to reject stale responses and is a functional coordination
  invariant rather than a resource-admission or validation ceiling. It defines no polling
  interval, request timeout, retry timer, or memory lease; the browser/network/runtime
  owns request settlement. A network/runtime rejection, `401`/`403`, or session-ID mismatch synchronously invokes one central
  purge before rendering the session-ended view: dispose every Monaco editor/model/worker
  and subscription, clear comparison/notice/filter state, remove all source/detail/metadata/
  diagnostic DTOs and DOM text, abort pending requests, and increment the epoch so every
  response captured under the prior epoch is ignored. `visibilitychange` to hidden,
  `pagehide`, and `beforeunload` invoke the same purge immediately, avoiding background-
  timer retention. Returning to a visible page requires a fresh authenticated snapshot;
  a new warning acknowledgement is required only if the user later opens source/detail or
  comparison content. Each successful liveness body is exactly `{ sessionId,
  globalContentEpoch, globalDisableInProgress }`, with all three values obtained from one
  current coordinator-lock snapshot at final publication. It does not require a null fence
  and returns a current non-null projection so another tab can observe disable. Before
  confirming the current baseline or rendering,
  a greater epoch or non-null disable projection invokes the same full purge, adopts the
  greater epoch, and enters control-only recovery; an older epoch is rejected and an equal
  null projection is the only ordinary baseline confirmation. Thus another tab's disable is
  observed by the next lifecycle-triggered liveness check or other authorized response.
  Process loss on a continuously visible idle page has no product-defined wall-clock detection
  guarantee and is handled on the next observable lifecycle or request outcome. The memory-only capability itself is retained across a
  hidden-page purge. The retained capability authenticates the fresh snapshot; the client
  adopts its returned `sessionId` as the new liveness baseline without retaining or
  comparing the purged ID. It constructs `RecoveryViewState` only from
  `globalContentEpoch`, `globalControl`, `globalEnableInProgress`,
  `globalDisableInProgress`, the exact pathless session
  Diagnostics referenced by `globalControl.toolFailures`, the generic Operation Error
  referenced by `globalControl.lastOperationErrorId` when present,
  `globalDisableOperationErrorId` plus its referenced generic Operation Error when present,
  and an optional newly verified frozen preview. It discards every other field without
  restoring inventory, detail, comparison, or acknowledgement state. If
  `globalControl` or `globalEnableInProgress` identifies a preview, the client fetches the
  matching frozen preview before rebuilding applicable controls, while a failed authentication
  remains on the session-ended view. No service worker, browser storage, or HTTP cache persists
  content. The application guarantees removal of its live references, not physical
  zeroization of browser-process memory outside JavaScript control.

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
readiness handshake in `./bin.mjs`.

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
`targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`, `workflowClass`,
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
or missing Origin plus exact-issued Referer is bundled-SPA; only its exact authorized static/API
request forwards, while every nonexact/unauthorized request is product-attributable/prohibited and
blocked. Valid secret plus extension-scheme Origin is extension and always unrelated/N/A/false/
blocked. Every remaining valid-secret projection is unknown, uses binding IDs, is
product-attributable/prohibited with `effectClass: unauthorized-request`, and blocks critically.
Missing secret after bootstrap is syntactically valid other-host or malformed unknown as above.
Only the exact grant-attested participant and forwarded SPA branches may have a server claim.

The exact in-memory request-correlation records are content-free. A
`StudyBrowserRequestCandidate` has complete field set and exact root order `schemaVersion`,
`studyRunId`, `browserAttemptId`, `correlationId`, `actorClass`, `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`,
`sameInspectorHost`, `productAttributable`, `prohibited`. `studyRunId` and `correlationId` are
current/fresh `StudyOpaqueId` values; `browserAttemptId` is the current valid binding ID or literal
`not-applicable` for a missing/invalid marker. A `StudyServerCorrelationClaim` has
complete field set and exact root order `schemaVersion`, `studyRunId`, `correlationId`,
`subjectId`, `inspectorProcessId`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`,
`methodClass`, `capabilityClass`, `originClass`, `effectClass`, `sameInspectorHost`,
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
| `payload` | `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited` | Version is literal `1`; IDs are opaque or their exact not-applicable literal; all classes/event codes come from the closed privacy-safe tables; the final three fields are booleans and none is inferred by the verifier from retained raw data. For a product-attributable observation, the verifier accepts process N/A only as an ordered same-run/same-subject terminalization-bound pre-readiness release with workflow N/A; readiness-bound uses the assigned non-N/A ID, and every other/post-readiness product N/A row is invalid |
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
| `requestClass` | `authorized-static \| authorized-api \| prohibited \| unrelated \| os-mediated \| unclassifiable \| not-applicable` |
| `targetClass` | `static-manifested-asset \| static-spa-shell \| static-client-route-fallback \| api-get-session \| api-get-session-liveness \| api-get-file \| api-post-repository-rescan \| api-get-global-consent-preview \| api-post-global-consent-preview \| api-post-global-enable \| api-post-global-rescan \| api-post-global-disable \| other-loopback \| remote \| mcp \| unclassifiable \| not-applicable` |
| `methodClass` | `get \| head \| post \| other \| unclassifiable \| not-applicable` |
| `capabilityClass` | `valid \| missing \| invalid \| unclassifiable \| not-applicable` |
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
`authorityClass: exact-issued`, `requestClass: authorized-static`, `capabilityClass: not-applicable`,
`originClass: not-applicable`, `sameInspectorHost: true`,
`productAttributable: true`, `effectClass: none`, and `prohibited: false`:

| `targetClass` | Exact method |
|---|---|
| `static-manifested-asset` | `get \| head` to a manifest-listed non-HTML asset |
| `static-spa-shell` | `get \| head` to packaged `/`/`index.html` shell |
| `static-client-route-fallback` | `get \| head` to one closed client-route fallback |

An authorized-api request must match exactly one row below; every row requires
`authorityClass: exact-issued`, `requestClass: authorized-api`, `capabilityClass: valid`,
`sameInspectorHost: true`, `productAttributable: true`, `effectClass: none`, and
`prohibited: false`. GET permits only `originClass: missing | exact-same-origin`; every POST
requires `originClass: exact-same-origin`:

| `targetClass` | `methodClass` | Exact HTTP contract route |
|---|---|---|
| `api-get-session` | `get` | `/api/v1/session` |
| `api-get-session-liveness` | `get` | `/api/v1/session/liveness` |
| `api-get-file` | `get` | `/api/v1/files/{fileId}` with a valid opaque ID |
| `api-post-repository-rescan` | `post` | `/api/v1/repository/rescan` |
| `api-get-global-consent-preview` | `get` | `/api/v1/global/consent-preview` |
| `api-post-global-consent-preview` | `post` | `/api/v1/global/consent-preview` |
| `api-post-global-enable` | `post` | `/api/v1/global/enable` |
| `api-post-global-rescan` | `post` | `/api/v1/global/rescan` |
| `api-post-global-disable` | `post` | `/api/v1/global/disable` |

No other cross-field combination is authorized. The following five rows are the complete
product-attributable prohibited request/MCP effect table. Every row uses
`workflowClass: not-applicable` except for supervisor assignment to the first matching open-
context observation, `outcomeClass: observed`, and automatic plus three review fields
`not-applicable`; subject/process IDs come from the applicable open
browser-attempt binding or registered product probe.

| Case | Exact classification and booleans |
|---|---|
| Exact-issued request outside the authorized tables | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: exact-issued`; `requestClass: prohibited`; observed closed `targetClass`, `methodClass`, `capabilityClass`, and `originClass`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Other-loopback request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: other-loopback`; `requestClass: prohibited`; `targetClass: other-loopback`; observed closed non-N/A `methodClass`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Remote request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: remote`; `requestClass: prohibited`; `targetClass: remote`; observed closed non-N/A `methodClass`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: prohibited-outbound-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Fully unclassifiable product-correlated request | `observationClass: request`; `actorClass: unknown`; `authorityClass: unclassifiable`; `requestClass: unclassifiable`; `targetClass: unclassifiable`; `methodClass: unclassifiable`; `capabilityClass: unclassifiable`; `originClass: unclassifiable`; `effectClass: unauthorized-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Product MCP observation | `observationClass: mcp`; `actorClass: inspector`; `authorityClass: not-applicable`; `requestClass: not-applicable`; `targetClass: mcp`; `methodClass: not-applicable`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: mcp-connection`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |

On the browser-attempt path the exact initiator decision is authoritative. Extension,
missing-secret other-host, and invalid-secret unknown are unrelated with N/A evidence IDs, effect
none, and false attribution/prohibition. Participant-shaped nonexact/no-grant/replayed/user-
activated page-script traffic and every remaining valid-secret unknown
uses binding IDs and the critical unauthorized/true tuple; blocked bundled-SPA uses binding IDs
and its applicable product/prohibited tuple. All are nonworkflow/observed with automatic/review fields N/A.
Observable mounted/mapped backing-store traffic is
`observationClass: request`, `actorClass: operating-system`, `authorityClass: not-applicable`,
`requestClass: os-mediated`, `targetClass: not-applicable`, `methodClass: not-applicable`,
`capabilityClass: not-applicable`, `originClass: not-applicable`, `effectClass: none`,
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
`authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, and
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

Every `partial` token in the following transition diagrams means the closed public
`contracted-partial` outcome; it never denotes provisional work or a resource-failure result.

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
1..3 admitted roots ---------> buffer-bound 202 + batchStatus(waiting/id) --> running --> one atomic generation containing every ready/partial Source
                                                                        \-> failed(tool failures or Operation Error; same id)
exact retryable subset ------> same buffer-bound batch lifecycle; lexical-ineligible controls require disable/new preview
unexpected pre-accept throw/rejection --> Operation Error; no subset Source/generation from the transaction
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                     \-> failed/stale (creates own entry)
failed/stale -- accepted per-source rescan --> scanning --> ready/partial (clears own entry + diagnostic)
                                                     \-> failed/stale (replaces own entry + diagnostic)
active Global control (0..3 Sources) -- disable --> disabling barrier --> inactive / 0 Sources (N+1)
                                                                  \-> failed + retained error --> retry disable
initial enable only -- disable --> cleanup-only barrier --> inactive / 0 Sources (N unchanged)
                                                  \-> failed + retained error --> retry disable
```

Enabling requires a matching `GlobalConsent`. Disabling executes the coordinator barrier,
removes all tool-specific Global files, generation diagnostics, control-owned lifecycle
diagnostics, comparisons, source text, and root contexts. `remove-active-state` rekeys
carried Repository entities at N+1; operation-local `cleanup-only` preserves N and every
generation-owned ID. A post-acceptance failure keeps the barrier/fence and error recoverable
until a later disable succeeds.
The lexical consent preview is not a `Source`; an accepted enable may commit at most one
Source for each admitted tool, each with one root, and every Source in that admitted subset
appears in the same generation. All are absent again after the applicable disable terminal
commit. A
deterministically all-rejected initial enable commits no Source/generation and leaves every
pre-existing entry and derived snapshot state unchanged. A thrown/rejected enable exposes
only its REST Operation Error and likewise commits none of its provisional subset. A failed explicit per-source rescan leaves that Source's prior committed graph
readable and marks the snapshot stale. In either case `progress` is null for any published
failed Source, and an actionable Diagnostic or Operation Error explains the discarded
attempt according to failure kind. A fatal enable/rescan never commits its new or partial graph. The exact consent and
admitted roots remain as session control state so the user may retry or disable; no Source
falls back to a different root.

The `current`/`stale` suffixes in these diagrams describe whether that Source owns a
`StaleSourceFailure`, not the whole session: another Source's unresolved entry can keep the
top-level `snapshotState` stale while this Source is ready, partial, or current.

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> stale/removed on next generation
          -> binary
          -> unsafe-link/boundary-rejected
```

No state transition writes to the source. Rescan creates new entities instead of mutating
old file records in place.

## Cross-entity invariants

1. Every generation-scoped DTO belongs to one session and its last committed generation;
   IDs from replaced generations return `404 stale-resource`. A fatal attempt creates no
   public IDs and leaves the retained generation's IDs unchanged.
2. Exactly one Repository Source exists from bootstrap and its lexical boundary is the
   selected Repository root: the exact captured invocation `process.cwd()` by default or
   the single `--cwd` value lexically resolved against it. It may lack an admitted
   `rootContext`, is not required to be a Git root, and its label grants no read authority.
3. Global is disabled in every new process. A session has zero to three Global Sources,
   at most one each for Copilot, Claude, and Codex; every Source owns exactly one boundary
   confirmed for that same tool by the current allowlist consent.
4. Every accepted file path is authorized by a shipped static or typed derived
   rule and independently passes safe-read checks. A parsed value grants access only when
   it satisfies that exact derivation rule; relationships and excluded rules never do.
   Authorization selects an existing `ScanEntryTicket`; only the central safe-filesystem
   layer may combine it with its owning active `InspectionRootContext`, and any readable
   result must pass the documented pre-open, pre-read, and post-read checks. No client path
   string can substitute for the context/ticket pair. Raw entry-name segments alone drive
   filesystem operations; NFC classification collisions fail closed. Global traversal
   performs only the exact operations represented by the consent-bound `TraversalPlan`.
5. A physical file has one `CustomizationFile` record per Source/generation and at most one
   recognition for each tool/kind pair. Within one Source scan attempt, a usable physical
   group is consumed once and accepted hard-link aliases remain visible in
   `aliasSourceRelativePaths` without duplicating source content. Different Sources,
   attempts, and generations have independent authority and may each perform one read.
6. Every readable file DTO returns its complete authored `sourceText`; every returned
   declared-metadata value and authored relationship target is an exact validated source
   UTF-16-indexed `String.prototype.slice`, while a documented default has null authored
   text and an explicit origin. Metadata/relationship/derivation may reuse one exact
   occurrence range; distinct origins may not overlap. Comparison uses authored slices and
   `(tool, kind, fieldId, occurrence)` so literal differences survive semantic decoding.
   Environment references remain literal and never cause a process-environment
   lookup or substitution. Authenticated Diagnostics may carry only their actionable
   location fields. Operational events contain fixed codes/opaque IDs only and never contain
   any path, root, filename, inspected content/metadata, authored value, capability, body,
   raw error, exception string, or Diagnostic argument.
7. Documentation status, authored/installed state, selection, trust, enablement, and other
   condition facts remain orthogonal and provenance-specific; none is collapsed into
   “effective configuration” or a lossy recognition-level winner.
8. Typed derivation is exactly one closed `DerivationProgram` edge per derived provenance;
   generic relationships and derived provenances never seed it. An independent static
   provenance remains eligible even when its physical file also has a derived provenance.
9. Every file-originated relationship names one recognition and one candidate provenance;
   only that provenance's `matchedPath` may be used as the base of a relative target.
10. Resource capacity is inherited from Node.js, parser libraries, the browser, the
    operating system, the filesystem, and the execution environment. The Inspector defines
    no product-specific byte/count/depth/worker/queue/deadline ceiling and never turns an
    environment capacity failure into a customization-validity verdict.
11. Browser editor models use opaque in-memory identities, never filesystem or remote URLs,
   and never retain source beyond the active route and generation. Source and comparison
   surfaces present and receive in-memory acknowledgement of the session's sensitive-content
   notice before the bundled SPA requests detail content or constructs a comparison.
   Capability authentication, not acknowledgement, is the API access boundary; the API
   never receives or persists acknowledgement.
   Lifecycle-triggered liveness checks and the central purge remove all application-held
   session content when browser/network/runtime failure, authorization/session mismatch, or
   hidden/page lifecycle events make session loss observable. They define no product-specific
   time threshold. Generation
   replacement increments `clientDataEpoch`; a response cannot revive an older generation.
12. Every behavior, rule, strategy, and source ID is defined exactly once in its owning
    bilingual contract and executable registry. Registry `sourceRefs` arrays equal the
    owning row's direct Evidence cell and are reciprocal with the official-source reverse
    index. Runtime provenance and relationship DTOs may expose the deterministic union of
    those direct records for display, but that derived union never changes registry
    backlinks. Their `evidenceAssessments` contain exactly one record for the owning rule
    and every referenced behavior/strategy, preserving each record's documentation status
    and lifecycle qualifiers in the fixed order above. A missing, duplicate, orphaned, or
    language-divergent record fails the build.
13. Vendor lookup bases/traversal and Inspector matchers are different record types. Every
    Repository matcher starts with `./`; bare `**/` is invalid, and `./**/` can mean only
    explicit downward Inspector inventory—not vendor traversal or runtime selection.
14. `snapshotState` is derived from session-owned `staleFailures`, never stored in or used
    to mutate a committed `ScanGeneration`. Each entry names one Source and its current
    actionable failure reference (a `Diagnostic` or `OperationError`); no `ScanAttempt` or
    working-set member is reachable from it. Only a successful complete/contracted-partial
    scan of that Source or removal of that Source clears its entry and referenced failure,
    while unrelated commits preserve both.
15. The coordinator lock linearizes the generation and payload of every session snapshot
    and file-detail envelope. Network delivery may occur later, but cannot relabel the
    captured payload. Client request tokens, generation, epoch, and file existence are all
    rechecked at adoption time.
16. A Global preview retains the raw `lexicalRoot` only in process memory, binds it
    and its exact `TraversalPlan` in the digest, and uses that stored raw value for admission.
    Escaped `displayRoot` is presentation only and environment input is never reread by enable.
17. Product-issued mutation-capable filesystem operations and open flags are absent. Tests
    compare content, length, identity/link state, mode, mtime, ctime, and observable xattrs/
    ACLs. OS-only atime changes are recorded separately and prove neither mutation nor
    safety.
18. Syntax parsing, exact authored-literal extraction, mechanical typed decoding,
    frozen-catalog classification, and documented structural projection are the only
    interpretation operations. No DTO or internal projection can express natural-language
    interpretation/ranking, customization validity/correctness/effectiveness/compliance/
    quality, policy/remediation advice, lint/sync/convert/format/fix behavior, or a size-based
    valid/invalid verdict.
19. The coordinator serializes scans and root admission. Global disable is a priority
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
