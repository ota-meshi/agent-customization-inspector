# Data Model: Inspect Agent Customizations

[日本語](data-model.ja.md)

The model has two representations:

- **Internal session records** may contain canonical paths, file descriptors during a
  verified read, raw bytes, and decoded authored content while an atomic snapshot is being
  built. They never enter operational diagnostics or logs.
- **Public DTOs** contain Source-relative Paths, complete authored source text for readable
  files, exact returned declared-metadata/relationship source slices, recognitions, relationships,
  diagnostics, and opaque generation-scoped IDs. Environment-variable references in
  authored content remain literal text and never authorize reading process-environment
  values.

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
│   ├── SourceBoundary (exactly one) → InspectionRootContext (internal)
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
├── GlobalConsentPreview (zero or one current lexical preview)
├── GlobalConsent (zero or one active record)
│   ├── GlobalToolControl (one per confirmed tool; owns an optional InspectionRootContext)
│   └── GlobalControlView (null or one recoverable public control DTO)
├── GlobalEnableOperation (zero or one running/queued cancellable command; internal)
└── Diagnostic (session/source-level failures)

BrowserState
├── FilterState
├── ComparisonSelection (zero or exactly two readable files)
├── EditorModelState (zero or more, active route/generation only)
├── SensitiveContentNoticeState (session-only presentation state)
├── RecoveryViewState (control-only post-purge recovery and explicit resume)
└── SessionLivenessState (authorized-page heartbeat and purge state)
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
| `liveness` | `{ heartbeatIntervalMs: 1000, requestTimeoutMs: 750, leaseDurationMs: 2000 }` | DTO | Fixed authorized-page liveness protocol; each successful liveness response renews only the current browser-memory lease |
| `globalControl` | `GlobalControlView \| null` | DTO | Null only when no active consent/control state exists; lets a freshly authenticated client recover immediate disable and preview-gated retry controls after a purge without exposing canonical roots |
| `sensitiveContentWarning` | `{ messageKey, nextStepKey, acknowledgementScope }` | DTO | Fixed localized keys explain before source or comparison opens that complete authored content may contain sensitive values; scope is literal `authorized-browser-session` |
| `sessionDiagnosticIds` | opaque string[] | DTO | Current out-of-generation lifecycle diagnostics |
| `capability` | 256-bit random token | internal | Constant-time comparison; never serialized in snapshots/logs |

The session is created from the launch process `cwd`. At process start it publishes the
zero-I/O bootstrap generation 0 with empty files/diagnostics, an enabled idle Repository
source, and no Global Sources before automatically queuing the first Repository
scan. It has no repository picker, ancestor search, profile, cache, or resume identifier.

`UtcTimestamp` is an exact 24-byte ASCII UTC value in
`YYYY-MM-DDTHH:mm:ss.sssZ` form with valid calendar fields; every field called timestamp in
this model uses it. `GenerationNumber` is a non-negative safe integer representable by the
active Node.js runtime. A coordinator that cannot represent the next generation rejects the
operation with a fixed process-restart error before mutation.

The Inspector defines no product-specific byte, file-count, entry-count, graph-count,
parser-depth, message-size, request-size, response-size, worker-count, queue-capacity, or
wall-clock resource ceiling. Capacity is inherited from Node.js, the parser libraries, the
browser, the operating system, the filesystem, and the execution environment. A
recoverable capacity or resource failure is reported with a safe fixed-code lifecycle diagnostic and
never becomes a customization-validity verdict or contracted-partial justification. Extraction
for an affected recognition is all-or-nothing, and a capacity/resource-failed scan aborts its
attempt, commits no item, Source, recognition, derived result, scan-result record or response,
or generation, and leaves only the prior committed snapshot available. Unrecoverable
engine or process termination cannot be converted into an application diagnostic.

Successful API responses contain complete DTOs and are never deliberately truncated. The
host serializes a coherent snapshot once and passes the resulting unchanged entity body to
the HTTP layer. A recoverable pre-commit serialization or encoding failure aborts the current
attempt, publishes no item, Source, recognition, derived result, scan-result record or
response, or generation, and retains only the prior committed snapshot. A socket-write or
other delivery failure after atomic commit does not alter that committed snapshot or outcome,
reports no successful response payload, and never converts a truncated body into a partial
DTO. Monaco and the browser likewise use their environment-provided capabilities; comparison
failure leaves both complete authored source views available.

### Source

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ASCII string | Server-generated and stable for the process lifetime |
| `kind` | `repository \| global` | Exactly one Repository source; zero to three Global Sources |
| `tool` | `copilot \| claude \| codex \| null` | Repository pairs with null; each Global Source pairs with exactly one supported tool, and no two Global Sources share a tool |
| `enabled` | boolean | Repository and every published Global Source are true; absence means only that no Source is published for that tool, while `globalControl` distinguishes disabled, pending, and retryable control states; a disabling source remains true until atomic removal |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | Follows transitions below; public `partial` denotes only a contracted-partial result committed after complete traversal and a deterministic entry-local non-capacity failure; `failed` means the latest attempt failed while the last committed snapshot remains available; only a fatal explicit rescan marks that snapshot stale |
| `boundary` | `SourceBoundary` | Exactly one root: launch `cwd` for Repository or the one consented home root for this Global Source's tool |
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
| `displayRoot` | string | DTO | Local path intended for the user; control characters are escaped for presentation |
| `canonicalRoot` | absolute canonical path or null | internal | Diagnostic/consent comparison and repeated containment checks; never sufficient by itself to authorize a read and never returned outside an enabled boundary |
| `rootContext` | `InspectionRootContext` | internal | Required before enumeration; Repository owns it directly, while a Global boundary references the active consent's `GlobalToolControl`-owned context; only the central safe-filesystem layer can create or consume it |
| `origin` | `cwd \| default-home \| environment` | DTO | Explains how the boundary was selected |

Every Source has exactly one boundary and root. The Repository boundary directly owns the
context rooted at launch `cwd`. A Global boundary's `tool` must match its owning Source and
its active `GlobalToolControl`; it references that control's one admitted home context.
Tool homes are never combined into one Source.

### SourceRelativePath

`SourceRelativePath` is the value object used for file display, filtering, aliases,
provenance paths, and normalized relationship targets.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque ID | Binds the path to one owning Source; never accepted alone as read authority |
| `boundaryId` | opaque ID | Internal binding to that Source's sole boundary; never serialized or accepted from the client |
| `value` | collision-free NFC POSIX-style string | Classification segments joined with `/`, relative to that Source root; no leading slash, URI scheme, NUL, empty or dot segment, `..`, home shorthand, or environment expansion |

For the Repository Source, `value` is relative to the launch `cwd`. For a Global Source,
it is relative to that tool's admitted home root. Presentation escapes control characters
without changing the stored value. The value is never used to reconstruct a filesystem
path: internal exact raw entry-name segments own that role. Any accepted alias uses the same value object and the
same owning Source.
On the wire, `sourceRelativePath` and each `aliasSourceRelativePaths` entry serialize only
the normalized `value` string; the containing file DTO's `sourceId` supplies the public
ownership link. `boundaryId` never crosses the HTTP boundary.

### InspectionRootContext, ScanEntryTicket, and VerifiedReadReceipt

These pure Node.js records are internal only. They cannot be serialized, cloned from a
DTO, reconstructed from an HTTP path, or accepted from a request. Their private module
brand enforces application-level authority; it is not an OS filesystem capability.

| Entity / field | Type | Rules |
|---|---|---|
| `InspectionRootContext.privateBrand` | module-private symbol/registry membership | Created and checked only by `src/inspection/safe-fs.ts`; never leaves process memory |
| `InspectionRootContext.sourceId` / `boundaryId` | opaque IDs | Bind the context to exactly one Repository boundary or to the unpublished IDs preallocated by one `GlobalToolControl`; those IDs become the Global Source/boundary IDs only on commit |
| `InspectionRootContext.lexicalRoot` / `canonicalRoot` | absolute paths | Accepted internal root and its `realpath`; client values cannot replace either after creation |
| `InspectionRootContext.rootIdentity` | bigint `dev`/`ino`/`mode` snapshot | Captured with `lstat`; compared again before traversal and every candidate read |
| `InspectionRootContext.rootDevice` | bigint `dev` | Detects device changes exposed by Node; does not claim to identify every mount transition |
| `InspectionRootContext.state` | `active \| closed` | Close on Repository/process end, owning Global-control disposal/disable, or retry revalidation that rejects a formerly admitted root; closed contexts reject all calls |
| `ScanEntryTicket.privateBrand` / `rootContext` | module-private brand / internal reference | Issued only by authorized enumeration for one active root context |
| `ScanEntryTicket.sourceId` / `boundaryId` / `generationId` | opaque IDs / integer | Bind the ticket to exactly one source boundary and scan generation |
| `ScanEntryTicket.scanRequestId` | opaque ASCII string | Binds publication authority to exactly one automatic or explicit source scan; revocation makes every late continuation cleanup-only |
| `ScanEntryTicket.traversalPlan` | internal immutable reference | Exact versioned plan that authorized the targeted lookup or directory enumeration |
| `ScanEntryTicket.rawRelativeSegments` | exact `Dirent.name`/target-spelling segment array | Sole segments used to reconstruct, verify, and read the filesystem path; never serialized or accepted from a client |
| `ScanEntryTicket.classificationSegments` | collision-free NFC segment array | Used only for matcher classification, deterministic order, and `SourceRelativePath`; never substituted into a filesystem operation |
| `ScanEntryTicket.canonicalAtEnumeration` | absolute canonical path | Internal comparison value, not standalone read authority |
| `ScanEntryTicket.ancestorSnapshots` | ordered snapshot[] | One record per relative directory prefix with `dev`, `ino`, and `mode`; compared before open, before read, and after read |
| `ScanEntryTicket.enumerationIdentity` / `enumerationMetadata` | bigint path-stat snapshot | Exact `dev`, `ino`, `mode`, `size`, `mtimeNs`, and `ctimeNs` compared with the path and opened `FileHandle` before bytes are read |
| `ScanEntryTicket.occurrence` | non-negative integer | Deterministic enumeration order |
| `ScanEntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | A ticket can be read at most once per generation; stale/rejected tickets return no accepted bytes |
| `VerifiedReadReceipt.entryTicket` | internal reference | Exact ticket consumed for this file |
| `VerifiedReadReceipt.fileHandleIdentity` | bigint `dev`/`ino`/`mode` snapshot | Sole source of `CustomizationFile.identity`; never treated as durable |
| `VerifiedReadReceipt.preOpenChecks` | ordered verification record | Before `open`, records root identity, every ancestor `lstat`, candidate path `lstat`, candidate `realpath`/`path.relative`, and the repeated candidate path `lstat` in that order; comparisons use `dev`, `ino`, `mode`, `size`, `mtimeNs`, and `ctimeNs` where applicable, the first candidate check rejects links/non-regular objects before canonicalization, and both candidate snapshots must match each other and enumeration |
| `VerifiedReadReceipt.preReadChecks` / `postReadChecks` | ordered verification records | After `open` before any read, and again after the read while the same handle remains open, repeat the exact pre-open sequence in the same order and then compare the same `FileHandle.stat({ bigint: true })` fields |
| `VerifiedReadReceipt.fileType` | literal `regular-file` | No directory, link, device, socket, or pipe; unsupported/unverifiable objects are rejected |
| `VerifiedReadReceipt.acceptedByteCount` | non-negative integer | Exact bytes accepted from the verified handle; equals the readable file record's byte count |
| `VerifiedReadReceipt.finalOpenDefense` | `effective-o-nofollow \| no-effective-o-nofollow-postchecks` | The first value is mandatory when Node exposes and the platform enforces `O_NOFOLLOW`; the second covers both absent and ineffective support and records the explicit residual limitation |
| `VerifiedReadReceipt.containmentMode` | literal `node-realpath-fstat-best-effort` | Records repeated canonical and same-handle validation without claiming atomic kernel containment |
| `VerifiedReadReceipt.openMode` | literal `read-only` | Mutation-capable open flags are unrepresentable and rejected by instrumentation tests |
| `VerifiedReadReceipt.mutationObservation` | before/after record | Content, length, identity/link state, mode, mtime, ctime, and observable xattrs/ACLs are unchanged; OS-only atime differences are recorded separately and prove neither mutation nor safety |

Repository root creation derives its context from process `cwd`. Global root creation
occurs only after matching preview consent. Root creation checks every exposed lexical
component with `lstat`, rejects links, then records the accepted root `realpath` and
identity; these separate checks remain subject to the residual race below. The Node
filesystem service alone creates tickets while interpreting an immutable `TraversalPlan`;
static/derived classifiers may select a ticket but may not create one. For each opened
directory it processes the sibling set exposed by Node before descending. Distinct raw sibling
names that normalize to the same NFC classification key form a collision group: every member
is rejected without descend/open/read and receives
`safe-fs-path-normalization-collision`. A non-colliding NFD-only entry remains readable by
its exact raw segments while its classification and displayed path are NFC. A derived value
must match exactly one collision-free classification record. Candidate reads rebuild a path
only from the owning root context and ticket's raw segments. Before `open`, they compare root identity and every
ancestor snapshot, `lstat` the candidate path to reject a link/non-regular object and
compare its exact fields, check candidate `realpath`/`path.relative`, then repeat the
candidate path `lstat` comparison, requiring both snapshots to match each other and
enumeration. After `open` but before reading, they repeat that
ordered sequence and compare the opened
`FileHandle.stat({ bigint: true })`. After the same-handle read and while the handle
is still open, they repeat the complete ordered pre-read sequence over the same exact fields before
accepting bytes. A detected identity/type/metadata/boundary change
discards all collected bytes and marks the ticket stale or rejected. Client or HTTP path
strings never authorize a read.

One process-wide executor serializes inspected-source filesystem work. The production
module exposes only read-only operations and never requests
write, truncate, create, rename, delete, link, chmod/chown, utimes, xattr, ACL, or an atime
change. Disable or process shutdown revokes the affected request's publication authority
and stops new scheduling. A pending promise becomes cleanup-only: its late bytes and all
graph/Diagnostic/DTO/log mutations are discarded, and every opened handle is closed in
`finally`. Node does not guarantee physical kernel-I/O termination when application
authority is revoked; a future cancellable primitive or OS-enforced worker/sandbox is the
resolution path.

Required identity/metadata or canonicalization reported by Node as unavailable, ambiguous,
malformed, or otherwise unusable produces `safe-fs-boundary-unverifiable`; the layer never
guesses. A root-level failure aborts the source attempt, and an item-level failure can retain
only a diagnostic-only inventory record.

Because Node does not provide atomic directory-handle-relative child open, these records
cannot prove containment against an active process that replaces the root or an ancestor
between checks, or the final entry where effective `O_NOFOLLOW` is unavailable. Those cases,
not the whole actor class, are outside the current threat model. Detected ordinary concurrent
changes, effective-`O_NOFOLLOW` final-component defense, and all other detected races remain
in scope and fail closed. Expanding the threat model requires a future atomic Node
beneath/no-follow API or an OS-enforced read-only snapshot/sandbox and renewed review.
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

After all assembly, the recursive expected set is exactly the two manifest files,
every `public/...` path listed by `StaticAssetManifest`, every server path listed by
`ServerBundleManifest`. The final verifier rejects any difference, including a stale
regular file, unlisted chunk, symlink, directory in place of a file, or other
platform-safe non-regular object. Package tests apply the same set to the unpacked tarball.
The build normalizer, unpacked-package verifier, and runtime bootstrap share the same
manifest schema, path rules, byte-length equality check, and hash verification. Tests prove
that a mismatch or recoverable environment failure is rejected before CLI import or host
bind.

### GlobalConsentPreview

The capability-protected consent route creates this preview from the process environment
and default-home value using lexical path operations only. Creating or returning it does
not call `stat`, `realpath`, directory enumeration, or file reads under any proposed Global
root.

| Field | Type | Rules |
|---|---|---|
| `previewId` | 256-bit random opaque string | Process-memory lookup key; a new preview invalidates the previous unconsented preview, while active consent freezes and reuses its exact preview |
| `previewDigest` | keyed SHA-256 | Covers the canonical encoding of every field below plus `sessionId`; compared in constant time and never accepted from another process |
| `allowlistVersion` | date string | Current shipped contract version |
| `traversalPlanVersion` | literal `1` | Equals the schema version of every immutable entry plan and is bound by `previewDigest` |
| `entries` | exactly three tool entries | Fixed Copilot, Claude, and Codex order |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | An environment entry is used even when invalid; no silent fallback |
| `entries[].lexicalRoot` | exact raw string | Internal only; preserves the pre-escape environment/default value; never logged or serialized |
| `entries[].displayRoot` | escaped lexical absolute/invalid value | Exact proposed root shown to the user; never a canonicalization claim |
| `entries[].pathPatterns` | non-empty fixed relative-pattern array | Rendered from the exact immutable Global `TraversalPlan`; no neighboring customization classes |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid` | Determined before I/O; only `eligible` may become a boundary after consent |
| `excludedRuleIds` | sorted excluded rule ID[] | Drives the displayed exclusions without accepting authored prose |

The host escapes the proposed root for presentation without changing the retained raw
value. Its ability to process that value is inherited from Node.js, the operating system,
and the browser. A recoverable environment/runtime failure aborts preview creation without
normalization, canonicalization, root creation, or a read; it does not create a size-based
input state. The digest uses length-prefixed
UTF-8 fields, explicit null tags, fixed enum encodings, and the listed array order. It binds
each raw `lexicalRoot`, its escaped `displayRoot`, and the traversal-plan schema/version
and canonical selector programs behind `pathPatterns`; it never relies on reversing an
escape or on Unicode normalization.
Fixed registry strings are already canonical NFC.
It contains no filesystem-derived value. An invalid
environment value is escaped and displayed but is not normalized into an authorized path.
Present-empty, relative, and invalid entries use only fixed preview presentation
and create no retained `Diagnostic`; only an `eligible` entry may receive a
`GlobalToolControl` after confirmation and can later produce a tool failure diagnostic.
Every representable absolute path is `eligible` regardless of whether it lies outside the
ordinary home; that location alone neither rejects it nor grants pre-consent I/O. Only an
absent setting selects the documented default. An empty, relative, invalid, or post-consent
rejected setting never creates fallback authority.
Admission uses only the stored internal raw `lexicalRoot`; it never uses `displayRoot` as a
path and never rereads the environment. While consent is active, preview retrieval returns
the same DTO-visible object byte-for-byte in field semantics, including its ID and digest,
and never rereads the environment or creates a
replacement. This is the only recovery path for redisplaying exact consent after a client purge.

### GlobalConsent

| Field | Type | Rules |
|---|---|---|
| `allowlistVersion` | date string | Must equal the displayed current contract |
| `previewId` / `previewDigest` | opaque strings | Must match the current in-memory preview exactly |
| `confirmedTools` | non-empty sorted tool enum[] | Server-derived exact set of every `eligible` preview entry whose non-null path was shown; the request confirms all of them and cannot choose a subset; an all-ineligible preview cannot create active consent |
| `confirmedAt` | `UtcTimestamp` | Memory only |
| `active` | boolean | Cleared when Global inspection is disabled and all tool-specific Global Sources are removed |

Consent authorizes only the paths shown in the allowlist contract. It does not authorize
neighboring settings, credentials, state, skills, plugins, or arbitrary env paths.
The confirmation command contains no tool list: after verifying the frozen preview, the
server derives `confirmedTools` as all and only its `eligible` entries in closed tool order.
On retry, the operation work set is the subset of that immutable set that still has no
Source; the client still cannot alter consent by selecting tools.
After confirmation, each eligible lexical root is canonicalized without following a
candidate entry. The tool is rejected with a safe diagnostic before enumeration if the
canonical root is not component-identical to the displayed lexical absolute root,
including any symlink, junction, case, Unicode-normalization, or short-name alias. The
application never silently substitutes the canonical target or broadens consent; the user
must correct the configured root and request a new preview.
Each confirmed eligible tool may create one Global Source bound to that tool's one shown
root. Confirmation never creates a combined Global Source and never gives one tool's
Source authority over another tool's root.
If initial enable leaves any confirmed tool without a Source—including an all-failed or
mixed outcome—the exact active consent and its `GlobalToolControl` records may requeue only
those missing tools. Existing Sources retain their semantic content and stable `sourceId`.
Each successful initial or retry Global Source commit nevertheless advances the session
generation, regenerates every generation-owned ID in every carried graph, and invalidates
old file/detail/comparison/editor state. A different preview or root requires disabling
Global inspection first; a request with no missing tool is rejected as a conflict.

Post-consent canonical/root validation can accept zero to three tools. The serialized
coordinator activates consent and queues one job per accepted root. If every tool is
rejected before enumeration, consent remains active,
no new Source or scan job is published, and the operation returns the contracted
`active-no-job` state with safe diagnostics for the affected tools.
Initial activation therefore has zero Global Sources; an all-rejected retry commits no
generation and leaves existing Sources and their IDs unchanged. A later exact-consent retry may
revalidate only tools that still have no Source; changing the lexical root requires disable
and a new preview.

### GlobalToolControl

| Field | Type | Rules |
|---|---|---|
| `tool` | tool enum | Unique within the active consent and present in `confirmedTools` |
| `previewId` | opaque string | References the active frozen preview and cannot be changed in place |
| `state` | `unvalidated \| rejected \| admitted \| published` | `admitted` has a valid retained context but no published Source; `published` has exactly one Source |
| `sourceId` / `boundaryId` | opaque IDs or null | Allocated together only after successful root admission; remain internal until a Source commit and are discarded if admission must be repeated |
| `rootContext` | `InspectionRootContext \| null` | Created only by safe-fs after lexical/canonical/root-identity validation; owned here even before a Source exists |
| `rejectionCode` | closed reason code or null | Non-null only in `rejected`; contains no path or environment value |
| `diagnosticId` | session diagnostic ID or null | References the current post-consent rejection or fatal-scan diagnostic for that tool |

`GlobalToolControl` is session control state, never part of a scan working set. A successful
admission preallocates its unpublished Source/boundary IDs and root context before queuing
the provisional scan. A fatal initial scan destroys the entire job working set but leaves
this control and context for exact-consent retry; every retry rechecks root identity and
containment before enumeration. If the retained context still matches, it remains active.
If any check rejects or cannot verify the formerly admitted root, safe-fs closes and
unregisters the old context, discards the unpublished Source/boundary IDs, nulls those
fields, and changes the control to `rejected` before another job can be queued. A later
retry may create a new context and IDs only after a complete new admission under the same
frozen lexical preview. A post-consent validation failure therefore leaves a `rejected`
control with no IDs/context and can be revalidated only under that preview. A
successful Source commit publishes the preallocated IDs and makes its `SourceBoundary`
reference this context. Rejection or fatal initial scan creates/replaces that control's
current tool diagnostic; a successful Source commit clears it, and unrelated tool outcomes
preserve it. Global disable first aborts work and closes open file handles, then removes all
control-owned diagnostics, closes every control-owned context, and removes every control
with the consent and frozen preview. No DTO can create or mutate this authority.

### GlobalControlView

| Field | Type | Rules |
|---|---|---|
| `state` | `active \| disabling` | `disabling` begins when the priority barrier is accepted and lasts until the field becomes null at its single commit |
| `previewId` | exact 43-character base64url string | Equals the active 256-bit `GlobalConsentPreview.previewId`; not a capability or filesystem path |
| `confirmedTools` | non-empty sorted tool enum[] | Exact tools bound by active consent |
| `pendingTools` | sorted tool enum[] | Confirmed tools owned by a running/queued enable or retry operation during validation/admission, or by its running/queued initial scan job; empty while `disabling` after cancellation begins |
| `retryableTools` | sorted tool enum[] | While `active`, exactly confirmed controls in `rejected` or non-pending `admitted` state with no published Source and no active operation/job; an `unvalidated` control is always pending; empty while `disabling` |

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
While the disable barrier is pending or active, the view reports `state: disabling`, both
job/retry arrays are empty, the UI offers no retry, and the enable API rejects retry. The
view becomes null only when the disable commit has removed all controls and consent.
While `state: active` and `pendingTools` is non-empty, `retryableTools` remains an
informational projection of already rejected/non-pending admitted tools, but the UI does
not offer retry and the enable API returns `409 global-enable-in-progress`; disable remains
immediately available. Retry is offered only after `pendingTools` becomes empty and the
matching frozen preview has been retrieved and verified. The invariant forbids an
`unvalidated` control outside `pendingTools`.

### GlobalEnableOperation

| Field | Type | Rules |
|---|---|---|
| `operationId` | opaque string | Unique coordinator command for one initial enable or exact-consent retry |
| `kind` | `initial-enable \| retry` | Closed operation type; neither is a committed generation |
| `commandEpoch` | non-negative integer | Captured from the coordinator when accepted; every asynchronous continuation must still match it |
| `previewId` | opaque string | Must equal the frozen consent preview for the whole operation |
| `tools` | non-empty sorted tool enum[] | Exact missing confirmed tools initially owned by this operation; rejected tools leave `pendingTools` at terminal validation, while accepted tools transfer pending ownership to the initial scan job until that job terminates |
| `status` | `waiting \| validating \| admitting \| queueing-scans \| draining \| cancelled \| complete` | `draining` begins when disable aborts the operation; no new authority or job may be published afterward |
| `responseDisposition` | `unset \| 202-queued \| 202-active-no-job \| 409-global-disable-pending` | Chosen exactly once at the coordinator linearization point; transport delivery may occur later |
| `abortSignal` | internal `AbortSignal` | Shared by root validation/admission and every pre-queue safe-fs call |

Initial enable atomically activates the consent, creates `unvalidated` controls for
confirmed eligible tools, registers this command, and places every owned tool in
`pendingTools`; retry registers the same command against the
existing consent. Root validation/admission and scan-job creation run only under the
coordinator. Before and after every asynchronous boundary, and immediately before any
control/diagnostic mutation or scan-job enqueue, the continuation must prove the same active
`operationId`, `commandEpoch`, non-aborted signal, and `globalControl.state: active`.
Initial enable and retry register their state transition under the coordinator lock before
changing consent, controls, contexts, IDs, or diagnostics. Cancellation or disable drains
the operation so late continuations cannot enqueue work or regain authority.
At most one `GlobalEnableOperation` is running or queued. After every owned tool reaches a
terminal validation outcome and all accepted scan commands are transferred, the coordinator
performs one final operation-ID/epoch/state check under its lock. It atomically chooses the
`202-queued` or `202-active-no-job` disposition, marks the operation `complete`, and
unregisters it; later response delivery does not change that earlier
linearization. If the disable barrier has already linearized, the same check instead chooses
`409-global-disable-pending` and drains cancellation. A drained operation becomes
`cancelled` and is unregistered before barrier cleanup. Thus the operation wins the race
with a committed `202`, or the barrier wins
with `409`, never both. Terminal operation history is not retained; pending scan jobs remain
represented independently in `pendingTools` until they finish.

Global-disable acceptance changes control state to `disabling`, increments the coordinator
epoch, aborts the active/queued `GlobalEnableOperation`, and waits for it to reach
`cancelled` before the final queued-Global-work cancellation sweep and zero-I/O removal
transaction. A drained continuation closes and unregisters only an operation-local
provisional context not yet attached to a `GlobalToolControl`, and discards only similarly
unattached IDs/diagnostics. Any context already attached to a control remains owned by that
control and is closed exactly once by the disable commit. The continuation cannot enqueue a
job or mutate a control. This ordering prevents validation that finishes after barrier acceptance from
adding authority or work after the cancellation sweep. An enable request for which the
barrier wins the disposition point completes with `409 global-disable-pending`; if the
operation chose `202` first, a later barrier may cancel/remove that accepted work normally.
Barrier cancellation creates no failure diagnostic. Coordinator queueing uses no
product-defined numeric capacity; recoverable Node.js or operating-system failures fail the
operation safely before publication.

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
| `documentationStatus` | documentation-status enum | `conflict` retains all conflicting source assertions |
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
| `documentationStatus` | documentation-status enum | Ambiguous/conflicting order never becomes a fabricated winner |
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
| `MatcherSegment` | discriminated union | `literal { value }`, `one-segment { suffix }`, or `recursive-directories`; no executable glob or regular-expression object |

A `literal` matches one case-sensitive NFC segment. `one-segment` is rendered as `*` plus
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
| `TraversalSelectorPlan.fixedPrefix` | NFC literal segment array | Exact ancestors that may be `lstat`ed; Global entries contain every path component before an allowed subtree/target |
| `TraversalSelectorPlan.remainder` | `MatcherSegment[]` | Empty for a Global exact target; a Global subtree remainder can enumerate only below its fixed prefix |

A Repository plan may perform the broad traversal explicitly represented by its
selector programs. A Global plan never begins with `opendir` on its home root. An exact
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
`String.prototype.trim().length === 0`; a whitespace-only file is empty. If either present candidate is unsafe, unreadable, or
cannot be decoded under the shared file contract, selection fails closed with a safe
diagnostic and does not inspect any later selector. `absent` is only the explicit not-found
result from the exact target `lstat` after the admitted root remains verified. Permission,
type, metadata, ancestor/root, canonicalization, and all other errors—and a target that
disappears after its first observation—are failures, never absence. Thus determining emptiness may safely read
the first target, but the plan publishes at most one readable customization file and never
touches an unrepresented neighboring path.

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
| `fixedSuffixAlternatives` | non-empty arrays of NFC literal segments | Registry constants appended after extracted segments; no authored suffix or free-form join |

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

### InspectionRule

`InspectionRule` is immutable release data maintained as the implementation counterpart of
the bilingual inspection-rule contract. It is not read from the inspected repository.

| Field | Type | Rules |
|---|---|---|
| `ruleId` | stable dotted string | Unique within a registry; retained across versions only while semantics stay compatible |
| `contractVersion` | date string | Must match `GlobalConsent` and the shipped registry |
| `tool` | tool enum or `shared` | `shared` is limited to cross-vendor safety/derivation rules |
| `discoveryClass` | `static-candidate \| derived-candidate \| relationship-only \| excluded` | Only the first two may authorize a read |
| `kind` | customization-kind enum or null | Null for a cross-kind relationship/exclusion |
| `sourceKinds` | source-kind enum[] | Repository, Global, or both as explicitly contracted |
| `matcher` | `StructuredInspectorMatcher` or null | Static rules only; never a vendor locator, ambient path, executable glob, or untyped selector string |
| `derivation` | `DerivationProgram` or null | Present only for derived rules; the exact five mappings above are the complete initial registry |
| `behaviorRefs` | sorted behavior ID[] | Exact upstream lookup statements relevant to this policy; exclusions may reference documented User behavior without authorizing it |
| `policyRefs` | non-empty sorted specification ID[] | FR/QR clauses that authorize or intentionally exclude the surface |
| `strategyRefs` | sorted strategy ID[] | Composition facts used for order/applicability, never for path admission |
| `conditionKeys` | condition-key enum[] | Runtime facts needed before applicability can be assessed |
| `precedenceGroup` | stable string or null | Links only rules with documented selection/order semantics |
| `documentationStatus` | `documented \| ambiguous \| conflict \| experimental \| deprecated` | Describes the upstream rule, not runtime state |
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
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-disable` | Closed transaction classification |
| `scannedSourceId` | opaque source ID or null | One source for either scan kind; null for bootstrap and zero-I/O Global disable |
| `scanRequestId` | opaque ASCII string or null | Required for `repository-scan` and `global-scan` and equals the request carried by the committed Source/progress; null for bootstrap and Global disable |
| `startedAt` / `finishedAt` | `UtcTimestamp` | Both present on every committed generation; in-flight timing belongs to `ScanAttempt`/`ScanProgress` |
| `outcome` | `complete \| partial` | `partial` means only a contracted partial after complete traversal and serializable assembly with deterministic entry-local non-capacity failures; a capacity/resource or other fatal attempt is never a generation |
| `files` | `CustomizationFile[]` | All enabled sources, deterministically sorted by source, Source-relative Path, then ID |
| `diagnostics` | `Diagnostic[]` | Never duplicate customization source or declared-metadata values |

Generation 0 is created synchronously at process start with `baseGeneration: 0`,
`transactionKind: bootstrap`, null `scannedSourceId`/`scanRequestId`, equal
`startedAt`/`finishedAt`/session `createdAt`, `outcome: complete`, and empty files and
diagnostics. The session initially has no `StaleSourceFailure`, so its derived
`snapshotState` is `current`. Generation 0 is a legal readable base, not evidence that a
Repository scan succeeded.
The automatic first Repository scan starts from 0; if it fails fatally, generation 0 stays
committed and current while a safe session-lifecycle diagnostic explains that no first
inventory was committed. Only a later user-requested rescan failure can mark a retained
snapshot stale.

### StaleSourceFailure

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sourceId` | opaque Source ID | DTO | Identifies one still-published Source whose latest explicit rescan failed fatally |
| `diagnosticId` | session diagnostic ID | DTO | References that Source's current actionable fatal-rescan diagnostic |
| `failedAt` | `UtcTimestamp` | DTO | Time the fatal explicit attempt ended |
| `baseGeneration` | `GenerationNumber` | DTO | Last committed generation the failed attempt tried to replace |

`StaleSourceFailure` is a session-owned lifecycle overlay, not a `ScanGeneration` field.
An explicit fatal rescan creates or replaces only the entry for its Source, so failures for
different Sources coexist. A complete or contracted-partial scan commit clears the entry
and its diagnostic only for the Source it successfully refreshed; a commit for another
Source carries all unrelated entries and diagnostics forward. Global disable clears
entries and diagnostics for the Global Sources it removes, while a remaining Repository entry keeps the
session stale. `snapshotState` is `stale-after-fatal-rescan` exactly while this array is
non-empty. Automatic first Repository failure and initial Global enable failure create no
`StaleSourceFailure` entry because neither failed to refresh an already committed Source graph.
They may create a keyed lifecycle diagnostic without making the snapshot stale;
initial Global enable also preserves every pre-existing entry and derived snapshot state.
Queuing a retry changes that Source's operational status to `scanning` but does not clear
its entry or diagnostic. An unrelated commit carries both the entry and diagnostic plus the Source's failed/scanning
lifecycle overlay; only the affected Source's successful commit moves it to
`ready`/`partial` and resolves the entry.

### ScanAttempt

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `attemptId` | opaque string | internal | Identifies one serialized, uncommitted transaction |
| `scanRequestId` | opaque ASCII string or null | internal | Required for a source scan, generated for automatic and explicit commands, and copied to Source/progress/generation; null only for zero-I/O disable |
| `baseGeneration` | `GenerationNumber` | internal | Must equal the last committed generation when the attempt starts |
| `transactionKind` / `scannedSourceId` | same closed values as `ScanGeneration` | internal | Identifies the requested source operation without changing committed state |
| `status` | `waiting \| running \| committable-complete \| committable-partial \| cleanup-only \| fatal \| cancelled` | internal | Only the two committable outcomes may create the next generation; `cleanup-only` follows disable or shutdown revocation and cannot mutate public state |
| `publicationAuthority` | `active \| revoked` | internal | Disable/shutdown changes this irreversibly to revoked before any later continuation can publish |
| `workingSet` | provisional source graph, files, metadata, relationships, and diagnostics, or null | internal | Null while queued; once running, isolated from every public DTO until one atomic commit and destroyed on fatal failure or cancellation |

No field from an in-flight attempt is merged into or exposed through the committed
snapshot. A contracted partial result is public only after complete traversal, deterministic
entry-local non-capacity failure classification, successful assembly/serialization, transition
to `committable-partial`, and atomic commit of the whole generation. Any capacity or resource
failure transitions the attempt to `fatal`, publishes no item, Source, recognition, derived
result, scan-result record or response, or generation, destroys the working set, and retains
only the prior committed snapshot.

A single `ScanCoordinator` serializes `GlobalEnableOperation`, Repository scan, Global scan,
and Global-disable transactions. Source scans and root admission never execute concurrently.
Ordinary source commands are FIFO. Global disable is a priority barrier: acceptance changes `globalControl.state` to
`disabling`, empties pending/retry arrays, and rejects new Global-enable/Global-rescan commands. It aborts and discards the active uncommitted
transaction, aborts and drains an active/queued Global enable operation, performs a final
queued-Global-command cancellation sweep, and places a zero-I/O disable transaction next.
An interrupted Repository command is requeued exactly once immediately behind the
barrier with fresh progress; an interrupted Global command is not requeued. A second
disable while that barrier is queued or active joins the same completion and creates no
additional transaction. If there is no tool-specific Global Source or graph, active consent
record, retained admitted Global root context, open Global inspection `FileHandle`, or
running/queued Global scan/enable command,
disable is an immediate no-op regardless of unrelated Repository work. A transaction
starts from the then-current generation N. It carries the unchanged source graph forward
and builds the scanned Source replacement off to the side. A complete or contracted-partial
result commits exactly N+1 atomically. Every source then reports N+1, every file/recognition/provenance/
relationship ID—including IDs for an unchanged source—is regenerated, the new snapshot
clears the `StaleSourceFailure` and diagnostic only for the successfully scanned Source,
carries both for other Sources, and clears generation-scoped comparison/editor
state. A Global-disable transaction removes every tool-specific Global graph and its
stale-failure entry/diagnostic pair under the same commit rule without filesystem I/O;
an unrelated Repository pair remains.

A fatal attempt never creates or partially merges a `ScanGeneration`. Its entire
`workingSet`, including any provisional partial result, is destroyed. N, every
prior ID, and all committed content remain visible. If and only if the attempt was an
explicit rescan, the session overlay creates or replaces that Source's
`StaleSourceFailure` and actionable lifecycle diagnostic; failures for other
Sources remain. A fatal automatic first Repository scan leaves bootstrap generation 0 current.
A fatal initial Global enable adds no `StaleSourceFailure` entry for the missing tool,
creates/replaces that tool's keyed failure diagnostic, and preserves all pre-existing
entries and the derived snapshot state. Automatic first Repository failure likewise uses the
Repository failure record. Both report that no new inventory was committed. Expected cancellation by a
Global-disable barrier emits no failure diagnostic;
a different recoverable safe failure is an out-of-generation session-lifecycle diagnostic.
Its attachment scope follows the `Diagnostic` rules below: a file-scoped record carries
`sourceId`, `fileId`, and Source-relative Path together; source- and session-scoped records
never fabricate a file ID or path. It never carries customization source values and never
enters `Source.diagnosticIds`. The
coordinator then starts the next queued transaction from the still-current N. A later
successful complete or contracted-partial scan of the affected Source replaces N with N+1
and clears only its entry and diagnostic; a different Source's commit leaves both unresolved. At
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

`Source.progress` is null in `idle` and `failed`. For `scanning`, `waiting`
requires non-null `queuedAt` and null `startedAt`; an active phase requires null `queuedAt`
and non-null `startedAt`; `Source.scanRequestId` and `progress.scanRequestId` are the same
non-null value. `failed` retains the failed request ID even though progress is null. A
committed `ready`/`partial` Source, its final progress, and its source-scan generation carry
one matching request ID. `disabling` exposes the relevant `cancelling` progress while a
barrier drains. A committed `ready`/`partial` source retains its final `complete` progress
with null `queuedAt` and non-null `startedAt`. Bootstrap has no source progress.

On disable acceptance, every present Global Source immediately becomes `disabling` and
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

### CustomizationFile

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `fileId` | 128-bit, 22-character base64url opaque string | DTO | Newly generated for every generation; API never accepts a path |
| `sourceId` | opaque string | DTO | Must identify one enabled Source |
| `boundaryId` | opaque string | internal | Binds the file to that Source's sole boundary and is never serialized |
| `sourceRelativePath` | `SourceRelativePath` | DTO | Primary display and filtering path relative to the owning Source root |
| `aliasSourceRelativePaths` | `SourceRelativePath[]` | DTO | Other allowlisted hard-link paths in the same Source, sorted; symlinks are never aliases |
| `identity` | file-handle identity from `VerifiedReadReceipt` | internal | Used only for alias/race detection; never treated as durable |
| `verifiedReadReceipt` | `VerifiedReadReceipt` or null | internal | Present only for an accepted readable file and never serialized |
| `readState` | file read-state enum | DTO | See states below |
| `parseSummary` | `not-applicable \| all-parsed \| mixed \| all-failed` | DTO | Projection of recognition-level extraction states; never a vendor validation result |
| `sizeBytes` | non-negative integer or null | DTO | Exact byte count for a readable file |
| `encoding` | `utf-8 \| utf-8-bom \| unsupported \| binary \| unknown` | DTO | Invalid text remains diagnostic-only |
| `sourceText` | string or null | DTO | Complete decoded authored source for a readable text file; literal values and environment-variable reference syntax are preserved exactly; never HTML |
| `contentDigest` | keyed per-session digest | internal | Detects stale content without exposing a reusable content hash |
| `recognitionIds` | opaque string[] | DTO | At least one for an accepted customization file |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | Refer to the same generation |

Read states are `readable`, `unreadable`, `binary`, `unsupported-encoding`, `stale`,
`unsafe-link`, and `boundary-rejected`.
Encoding is assigned only after a completed same-handle read passes every post-read check.
Any NUL byte yields `readState: binary`, `encoding: binary`, and null `sourceText`. Otherwise
the full byte sequence is decoded with fatal UTF-8 semantics. One leading BOM yields
`encoding: utf-8-bom` and is removed from `sourceText`; strict success without it yields
`encoding: utf-8`; failure yields `readState: unsupported-encoding`,
`encoding: unsupported`, and null `sourceText`. Binary and unsupported items are
diagnostic-only and comparison-ineligible. Replacement decoding, alternate encodings,
sampling, and truncation are unrepresentable; no product byte, line, or item ceiling affects
this state machine.
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
and [OpenAI Codex](contracts/vendors/openai-codex.md) contracts. They are frozen design
inputs before dependent implementation begins. A field, relationship, or source-form
applicability change updates the applicable English/Japanese contract pair, registry,
conformance fixture, and tests together.

The customization-kind enum is shared, but each recognizer owns its path and interpretation
rules. A shared `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, skill, or marketplace therefore stays
one file with multiple recognitions. There is exactly one recognition for each
`(fileId, tool, kind)` pair. Compatible admissions merge their provenances into that one
record. If extractors for the same pair produce incompatible parsed meanings, that
recognition becomes `failed`, retains its complete source and compatible provenance
admissions, and publishes no metadata/relationship/derivation result. Path-specific scope,
order, documentation status, and applicability never use a lossy recognition-level aggregate.
The parser never resolves environment references. A deterministic non-capacity extraction
failure discards that recognition's entire metadata/relationship/derivation result, reports a
safe diagnostic, and may retain the complete readable `sourceText` in a contracted partial
generation. If Node.js or a parser library reports a recoverable capacity/resource failure,
the Inspector returns no parser, extraction, recognition, relationship, derived result, item,
or Source, propagates `fatal-resource`, aborts the scan attempt without a scan-result record or
response or generation, and leaves only the prior committed snapshot available.

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
| `discoveryClass` | `static-candidate \| derived-candidate` | Relationship/excluded rules can never appear here |
| `ruleId` | stable inspection-rule ID | One shipped rule that admitted the owning recognition |
| `matchedPath` | `SourceRelativePath` | Exact candidate path admitted by this rule; must be the file's primary or alias path in the same Source |
| `seedFileId` | opaque string or null | Required for a derived candidate; null for static candidates |
| `seedProvenanceId` | opaque provenance ID or null | Required for a derived candidate and resolves one exact independently admitted static provenance; null for static candidates |
| `seedRuleId` | stable rule ID or null | Rule of that exact seed provenance; required for derived candidates and null for static candidates |
| `declarationKey` | closed field/component identifier or null | Never duplicates an arbitrary authored declaration value |
| `seedSourceOccurrenceKey` | internal occurrence reference or null | Reuses the seed's exact authored occurrence for declaration-driven derivation; null only for static or fixed matched-path derivation |
| `scope` | `ScopeDescriptor` | Closed, displayable admission scope without evaluating runtime effectiveness |
| `documentationStatus` | documentation-status enum | Copied from this rule; distinct from runtime applicability |
| `applicability` | `ApplicabilityAssessment` | Conditions and summary for this rule/path/seed admission only |
| `order` | `OrderDescriptor` or null | Only documented broad-to-narrow/fallback facts for this admission |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Copied from this rule; identifies the applicable surface lookup statements |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | Strategies actually considered for this provenance's order/applicability |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | Exact validated evidence union for this provenance rather than an ambiguous product aggregate |

Provenances are deduplicated by source identity, `matchedPath`, `ruleId`,
`seedProvenanceId`, `seedRuleId`, and `declarationKey`; declarations from two seed
provenances—including hard-link aliases of the same physical seed file—are never collapsed. A file
admitted by both static and derived rules is read once and retains both entries. Every
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
`instruction-byte-budget`, or `external-runtime`), a
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
| `documentationStatus` | documentation-status enum | Runtime-dependent or conflicting references stay explicit |
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

The three legal attachment shapes are therefore exactly: `file` with non-null
`sourceId`, `fileId`, and `sourceRelativePath`; `source` with non-null `sourceId` and null
file/path fields; and `session` with all three location fields null. A DTO using any other
combination is invalid. Scope is orthogonal to lifetime: for example, a generation-wide
runtime-failure diagnostic may be session-scoped, while a fatal rescan lifecycle record may
be source-scoped.

The closed diagnostic-code registry fixes severity, scope, message/next-step keys, and a
code-specific argument schema. Candidates are deduplicated by code,
scope, source/file IDs, Source-relative Path, and canonical safe arguments. They are emitted
in fixed phase, scope, source/boundary, Source-relative Path, rule/code, then emitter-
occurrence order; opaque IDs never determine retention. A scan candidate belongs to one
`ScanGeneration`. An out-of-generation lifecycle candidate—including a fatal scan attempt
that cannot be committed—belongs to the session only and is never inserted into a
generation or Source ID list. Authentication, malformed-request, and other client-caused
API errors are returned but not retained as diagnostics.

The session keeps the current actionable failure diagnostic for each Repository or Global
tool key. A later outcome for the same key replaces that diagnostic; successful Repository
refresh, successful Global Source publication/refresh, Source removal, or Global disable
clears the applicable record. Unrelated tool/Source commits preserve it. Recoverable
Node.js, parser, filesystem, browser, or operating-system capacity failures use fixed safe
codes and arguments. Diagnostics are never deliberately truncated or replaced by an
aggregate suppression record. If the active runtime cannot retain or serialize a diagnostic
result, `fatal-resource` aborts the whole publication attempt, publishes no item, Source,
recognition, derived result, scan-result record or response, diagnostic result, or generation,
and leaves only the prior committed snapshot available; an extraction-local or contracted-
partial outcome is not permitted.

Unknown internal exceptions are mapped to a generic code and correlation ID held only in
memory; stack traces and raw parser errors are never sent to the browser or an operational
event record.
The closed registry includes `safe-fs-root-rejected`,
`safe-fs-boundary-unverifiable`, `safe-fs-link-rejected`,
`safe-fs-device-changed`, `safe-fs-entry-stale`, `safe-fs-race-detected`,
`safe-fs-file-metadata-changed`, `safe-fs-path-normalization-collision`, and
`safe-fs-open-failed`. Their arguments contain no
OS error text, outside path, filesystem handle/descriptor, or source bytes.

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
  before its first source-detail request or comparison construction because complete
  authored content may contain sensitive values. Once acknowledged it covers both surfaces
  in that SPA session; reload/close loses it. This client-only state is never sent to the
  API, grants no read authority, and is discarded by the central purge path.
- `RecoveryViewState`: created only after the retained capability authenticates a fresh
  session following a hidden-page purge. It holds only the adopted `sessionId`, the fresh
  `globalControl` projection, and an optional newly verified frozen preview. It always
  offers an explicit **Resume inspection** action; when Global control is active it also
  offers immediate disable and offers retry only after the preview is verified and
  `pendingTools` is empty. Resume fetches the session again, requires the returned
  `sessionId` to match the adopted liveness baseline, and atomically constructs a fresh
  inventory-summary view with default filters. It restores no prior detail, comparison,
  editor, warning acknowledgement, or authored source; opening detail/comparison later
  requires a new acknowledgement. If authentication fails, only the authorization-lost
  next step to reopen the printed process-lifetime URL remains.
- `SessionLivenessState`: stores the expected `sessionId` and a monotonic two-second
  browser-memory lease plus the same `clientDataEpoch`. While the authorized page is visible it calls the capability-
  protected liveness route every second with a 750 ms request timeout. A timeout, network
  error, `401`/`403`, session-ID mismatch, or lease expiry synchronously invokes one central
  purge before rendering the session-ended view: dispose every Monaco editor/model/worker
  and subscription, clear comparison/notice/filter state, remove all source/detail/metadata/
  diagnostic DTOs and DOM text, abort pending requests, and increment the epoch so every
  response captured under the prior epoch is ignored. `visibilitychange` to hidden,
  `pagehide`, and `beforeunload` invoke the same purge immediately, avoiding background-
  timer retention. Returning to a visible page requires a fresh authenticated snapshot;
  a new warning acknowledgement is required only if the user later opens source/detail or
  comparison content. The memory-only capability itself is retained across a
  hidden-page purge. The retained capability authenticates the fresh snapshot; the client
  adopts its returned `sessionId` as the new liveness baseline without retaining or
  comparing the purged ID, constructs `RecoveryViewState` from only its `globalControl`
  projection, and discards every other field without restoring inventory, detail,
  comparison, or acknowledgement state; if that projection is non-null, the client fetches the
  matching frozen preview before rebuilding retry controls, while a failed authentication
  remains on the session-ended view. No service worker, browser storage, or HTTP cache persists
  content. The application guarantees removal of its live references, not physical
  zeroization of browser-process memory outside JavaScript control.

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
0 sources -- accepted enable --> 0..3 provisional scan jobs (at most one per tool)
zero jobs --------------------> active-no-job (active control, no Source)
each job ---------------------> commit one ready/partial Source
                               \-> no Source for that tool (committed graph/stale state unchanged; control diagnostic updated)
ready/partial -- accepted per-source rescan --> scanning --> ready/partial
                                                     \-> failed/stale (creates own entry)
failed/stale -- accepted per-source rescan --> scanning --> ready/partial (clears own entry + diagnostic)
                                                     \-> failed/stale (replaces own entry + diagnostic)
active Global control (0..3 Sources) -- disable --> disabling/cancelling barrier --> inactive / 0 Sources
```

Enabling requires a matching `GlobalConsent`. Disabling executes the coordinator barrier,
removes all tool-specific Global files, generation diagnostics, control-owned lifecycle
diagnostics, comparisons, source text, and root contexts, and rekeys carried Repository
entities before the next DTO is published.
The lexical consent preview is not a `Source`; an accepted enable may commit at most one
Source for each confirmed eligible tool, each with one root. All are absent again after
the disable commit. A failed initial enable commits no Source, adds no `StaleSourceFailure`
entry for that tool, creates/replaces the tool's keyed failure diagnostic, and leaves
every pre-existing entry and the derived snapshot state unchanged. A failed explicit per-source rescan leaves that Source's prior committed graph
readable and marks the snapshot stale. In either case `progress` is null for any published
failed Source, and an actionable lifecycle diagnostic explains the discarded
attempt. A fatal enable/rescan never commits its new or partial graph. The exact consent and
admitted roots remain as session control state so the user may retry or disable; no Source
falls back to a different root.

The `current`/`stale` suffixes in these diagrams describe whether that Source owns a
`StaleSourceFailure`, not the whole session: another Source's unresolved entry can keep the
top-level `snapshotState` stale while this Source is ready, partial, or current.

### Customization file

```text
candidate -> readable + not-applicable/all-parsed/mixed/all-failed parse summary
                     -> stale/removed on next generation
          -> unreadable/binary/unsupported-encoding
          -> unsafe-link/boundary-rejected
```

No state transition writes to the source. Rescan creates new entities instead of mutating
old file records in place.

## Cross-entity invariants

1. Every generation-scoped DTO belongs to one session and its last committed generation;
   IDs from replaced generations return `404 stale-resource`. A fatal attempt creates no
   public IDs and leaves the retained generation's IDs unchanged.
2. Exactly one Repository source exists and its boundary is the launch `cwd`, even if it
   is not a Git root.
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
5. A physical file has one `CustomizationFile` record per source/generation and at most one
   recognition for each tool/kind pair; accepted hard-link aliases remain visible in
   `aliasSourceRelativePaths` without duplicating source content.
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
   The liveness lease and central purge remove all application-held session content on
   session loss, hidden/page lifecycle events, or browser-memory lease expiry. Generation
   replacement increments `clientDataEpoch`; a response cannot revive an older generation.
12. Every behavior, rule, strategy, and source ID is defined exactly once in its owning
    bilingual contract and executable registry. Registry `sourceRefs` arrays equal the
    owning row's direct Evidence cell and are reciprocal with the official-source reverse
    index. Runtime provenance and relationship DTOs may expose the deterministic union of
    those direct records for display, but that derived union never changes registry
    backlinks. A missing, duplicate, orphaned, or language-divergent record fails the build.
13. Vendor lookup bases/traversal and Inspector matchers are different record types. Every
    Repository matcher starts with `./`; bare `**/` is invalid, and `./**/` can mean only
    explicit downward Inspector inventory—not vendor traversal or runtime selection.
14. `snapshotState` is derived from session-owned `staleFailures`, never stored in or used
    to mutate a committed `ScanGeneration`. Each entry names one Source and its current
    actionable diagnostic; no `ScanAttempt` or working-set member is reachable from it.
    Only a successful complete/contracted-partial scan of that Source or removal of that
    Source clears its entry and diagnostic, while unrelated commits preserve both.
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
