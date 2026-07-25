# Contract: Local Session Transport

[日本語](http-api.ja.md)

**API version**: 1
**Transport**: devframe 0.7.5 standalone host, bound to `localhost` (loopback only),
authentication disabled (`auth: false`)
**RPC namespace**: every session function is registered under the
`agent-customization-inspector:` name prefix

This contract connects the static Nuxt SPA to the same-process Node inspection host
through the devframe local-tool framework, the same foundation eslint/config-inspector
uses. The file keeps its historical `http-api` filename for stable cross-references; what
it defines is the complete local session transport. It is not a public network API. The
session channel accepts opaque IDs and closed commands only; no function accepts a
filesystem path, URL, command, source text, parser option, glob, or executable content.

FR-022 authorizes exactly two closed internal-loopback classes at the issued `localhost`
authority:

1. **Packaged UI serving** — unauthenticated `GET`/`HEAD` for the packaged UI assets: the
   built Nuxt SPA output served by devframe from `cli.distDir` (`dist/public`) at `/`,
   including the SPA shell, its client-route fallback, and devframe's own
   connection-discovery metadata. Served static content contains no session data.
2. **Local session RPC channel** — the devframe RPC channel (WebSocket upgrade plus
   strict-JSON messages at the same loopback authority) carrying the functions declared
   below.

Neither class is an outbound request or MCP connection. Any non-loopback or remote
authority, customization-selected destination, or transmission of inspected content to
another machine remains prohibited.

## Host requirements

1. The process binds a devframe-selected local port on the loopback interface only, via
   the fixed host name `localhost` (which the platform resolver yields as IPv4
   `127.0.0.1` or IPv6 `::1`). There is no host override: no configuration or flag binds
   `0.0.0.0`, a LAN address, or a Unix socket.
   Every inspected-source filesystem operation is issued by the inspection module
   (`src/server/inspection/`); no other production module imports a Node.js filesystem
   API, and there is no separate admission service in front of it. Node.js compatibility is declared
   once through `engines.node` and enforced by the package manager, and package/asset
   integrity is enforced by package tests and release gates; the host performs no runtime
   re-verification of its own packaged artifacts (Constitution Principle I).
2. The session host runs unauthenticated behind the loopback binding. There is no
   per-session token or capability, no bearer header, no origin or fetch-metadata
   classification, and no CORS emission; devframe authentication is disabled
   (`auth: false`), matching config-inspector. Loopback binding is the complete host-side
   protection (QR-003, Constitution v3.0.0). The residual limitation is documented: other
   local processes and, via DNS rebinding, a malicious web page can reach the session
   while the inspector runs. Served content may include the user's own secrets, so the
   host is never exposed beyond the initiating machine.
3. Static serving is devframe-owned. The served SPA shell and assets are exactly what the
   Nuxt build emitted into the packaged `dist/public`; the product defines no
   static-assets manifest, no per-asset integrity re-verification, no HTML alias rules,
   and no hand-written router. Nuxt uses `app.baseURL: '/'` and no CDN URL, so the shell
   works unchanged on every client route. Static serving never reaches outside the
   packaged UI output directory and never falls back to an inspected file.
4. At startup the host prints the exact `http://localhost:<port>/` URL once to the
   initiating terminal. Automatic browser opening is devframe-owned and best-effort under
   FR-001: `--no-open` silently suppresses opening, and an unsupported or failed helper
   does not block startup; the printed URL remains the fallback. The product fabricates no
   browser-opening outcome warning because devframe exposes no helper outcome. The helper
   receives no inspection-derived content or path (FR-022). A reload or direct navigation
   of any client route needs no token: the served shell embeds no session data, and the
   freshly loaded SPA adopts state only through the RPC channel.
5. Beyond fixed help/version text and the required one-time initiating-terminal launch
   line, the host defines no telemetry or operational-event stream; FR-022 already
   prohibits transmitting anything off the
   initiating machine. Terminal and UI output are read by the same user who owns the
   inspected files, so failures are reported ordinarily: the real error message is
   printed or returned without a product-defined content filter.
6. Every function with declared parameters accepts only those documented parameters,
   validated by strict manual
   type/enum guards; extra keys, path-shaped values, and malformed arguments are rejected
   with the documented safe rejections. A function declared with `Parameters: none` reads
   no input, so it has nothing to validate at its boundary (superseded 2026-07-23: the
   every-function argument-rejection rule was narrowed — rejecting arguments a function
   never reads is a runtime guard with no protective failure mode). Every declared result and rejection is one
   complete strict-JSON-serializable value. Transport capacity is inherited from Node.js,
   devframe, and the execution environment rather than a product-defined request-size
   ceiling.

## RPC function catalog

| Function | Kind | Purpose |
|---|---|---|
| `agent-customization-inspector:get-session` | read | Full `InspectionSession` snapshot, or the control-only `GlobalFenceRecoverySnapshot` while fenced |
| `agent-customization-inspector:get-file-detail` | read | One active-generation `FileDetail` |
| `agent-customization-inspector:rescan-repository` | command | Accept one explicit Repository scan command |
| `agent-customization-inspector:get-global-consent-preview` | read | Current or frozen `GlobalConsentPreview` |
| `agent-customization-inspector:create-global-consent-preview` | command | Capture and atomically create or replace the unconsented preview |
| `agent-customization-inspector:enable-global` | command | Confirm the session-wide consent; initial enable and active-consent retry |
| `agent-customization-inspector:rescan-global` | command | Accept one scan command for one enabled Global Source |
| `agent-customization-inspector:disable-global` | command | The priority Global-disable barrier |

Comparison views are constructed client-side from two `get-file-detail` results; there is
no separate comparison function. There is also no masking, redaction, reveal, or
environment-resolution function anywhere in the catalog, and the host does not enable
devframe's optional MCP route.

## Common results and errors

Successful inspection-data results:

```json
{
  "globalContentEpoch": 4,
  "repositoryGeneration": 3,
  "globalGeneration": 1,
  "data": {}
}
```

Every normal inspection-data success result carries `globalContentEpoch`,
`repositoryGeneration`, and `globalGeneration` (null while no Global sequence exists).
Repository and Global inspection keep independent generation sequences because their
lifecycles are independent (FR-030): the Repository sequence starts at bootstrap
generation 0, while a Global sequence is created at generation 1 by the enable commit and
discarded by disable, which commits nothing. For a full `InspectionSession`, the
result-level values equal `data.repositoryGeneration` and `data.globalGeneration`; for a
`FileDetail`, every returned generation-owned ID belongs to the exact committed generation
of the file's owning sequence. The server captures the epoch and both generations,
constructs the complete payload, and then revalidates under the session coordinator lock
that the epoch is unchanged and `globalDisableInProgress` is still null before binding the
immutable success result. A failed revalidation discards that result and returns the
`global-disable-pending` conflict rejection. The server may deliver an already-bound
result after releasing the lock; it never reads one generation, constructs data outside
that generation, and later relabels the result. A result fully bound before disable
acceptance remains a bounded pre-fence-authorized response; the browser rejects or purges
it after observing the greater epoch or fence.

The normal result shape does not apply to the exact control-only
`GlobalFenceRecoverySnapshot`, which contains no generation or inspection graph.

A preview or command success that returns no inspection graph uses
`{ globalContentEpoch, data }` and omits the result-level generation fields;
any generation carried inside its documented result is an explicit command outcome. This keeps
control results epoch-aware without presenting them as generation snapshots.

The API defines no product-specific numeric limit for parameters, files, item counts,
parser structures, snapshots, details, or results. Capacity is inherited from Node.js,
the parser, the operating system, the filesystem, the browser, and the execution
environment. Response serialization is owned by the devframe channel: the handler returns
its declared result value, and a serialization/encoding or delivery failure after the
handler returns is reported as that request's ordinary error without rolling back or
duplicating any state the handler committed — no
successful result is reported, a partially delivered message is never a partial result,
and the client refetches the committed generation, exactly as for a transport failure
(superseded 2026-07-23: the pre-serialized immutable result buffer and the
publishes-nothing-on-serialization-failure ordering were removed with the
self-verification cleanups). No domain layer classifies the failure's cause.

Deterministic rejections:

```json
{
  "error": {
    "code": "stale-resource"
  }
}
```

Every function's outcome is one of its declared closed result or rejection variants, or
the ordinary error of an unexpected failure. The former HTTP status semantics survive as
those variants: queued command acceptance is the documented acceptance result, and each
`4xx` conflict or validation failure is a named deterministic rejection with the same
`code` (for example `stale-resource`, `scan-in-progress`, `global-enable-in-progress`,
`global-disable-pending`, `consent-preview-frozen`, `consent-preview-missing`,
`consent-required`, `allowlist-version-mismatch`, `consent-preview-mismatch`,
`no-retryable-global-tool`). These deterministic variants are declared functional
outcomes with fixed codes, not sanitization.

An unexpected thrown or rejected handler failure is not wrapped in a product envelope: it
crosses the devframe channel as an ordinary serialized RPC error (devframe/birpc
behavior), and the client shows the real error message. A failure before asynchronous job
acceptance rejects only that invocation; no job or `scanRequestId` is created and nothing
is retained in the session. For an accepted scan job, the invocation has already resolved
with its queued acceptance, so the terminal failure is retained where the data model
defines it: an explicit-rescan failure in the affected Source's `staleFailures` entry as
`{ kind: 'error', message }`, and an accepted admitted-subset Global batch failure in the
failed `batchStatus`. The two-stage Global-disable barrier is the sole exception: a
post-acceptance failure rejects that still-pending disable invocation with the real error
and also retains the same message for the fenced session as the failed disable
projection's `globalDisableInProgress.message`, present only while its `state` is `failed`
(FR-042). A failed request leaves the session usable and does not terminate the process;
the prior committed snapshot stays readable under its retained IDs. An automatic startup
throw/rejection has no RPC owner, reaches the process top level, and may terminate the
process.

## RPC functions

### `agent-customization-inspector:get-session`

Parameters: none.

Returns the current session snapshot and scan progress. The client invokes this function
on initial adoption and when source state changes; there is no separate liveness probe and
no page-lifecycle refetch (amended 2026-07-24 — see § Concurrency and lifecycle). The
product defines no timer, filesystem watcher, or server-initiated push of inspection data;
the devframe channel is used request/response only for the declared functions.

Result data:

```text
InspectionSession
├── sessionId, createdAt, repositoryGeneration, globalGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state, message? },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef },
│                         toolFailures[] { tool, diagnosticId } },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── boundary { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      evidenceAssessments[] { subjectKind, subjectId,
│   │                                                documentationStatus, lifecycleQualifiers[] },
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, diagnostic IDs, and encoding as the variant
│       discriminator — readable text adds parseSummary, sizeBytes, hadLeadingBom, and
│       recognition summaries { tool, kind, parseStatus, provenance count, diagnostic IDs };
│       binary adds only sizeBytes; unknown adds nothing
└── diagnostics[] { diagnosticId, code, sourceId?, fileId?, sourceRelativePath? }
    (active-generation records plus session-owned lifecycle records)
```

This full DTO is returned only while `globalDisableInProgress` is null. After a non-no-op
disable barrier is accepted, this function instead returns only this exact control DTO:

```text
GlobalFenceRecoverySnapshot
├── sessionId, globalContentEpoch
├── globalControl, globalEnableInProgress, globalDisableInProgress (required and non-null)
└── toolFailureDiagnostics[]
```

`toolFailureDiagnostics` contains exactly the session Diagnostics referenced by
`globalControl.toolFailures`; the retained failed disable request's error message is
carried only as the non-null projection's `globalDisableInProgress.message`, present
exactly while its `state` is `failed`. The DTO contains no generation, Source, Repository failure,
stale failure, unrelated Diagnostic/error, file, path, authored value, relationship, or
resource field. The fence remains in force when disable state is `failed`; only terminal
disable success or process restart permits a full DTO again. Every other inspection-data
function, including inventory/generation/Source/file/detail/Diagnostic/relationship/
comparison data, returns the `global-disable-pending` conflict rejection throughout the
fence. For every fenced function, this check follows parameter-shape validation but
precedes resource-ID existence, generation staleness, duplicate-work, and other
inspection-state checks; the fence conflict therefore wins without leaking retained graph
state.

Every Source has exactly one root. The Repository Source has `tool: null`; the session has
zero to three Global Sources, at most one each with `tool: codex`, `tool: claude`, or
`tool: copilot`. A Global root is never represented as a boundary inside another Source.
`repositoryGeneration` and `globalGeneration` are the two sequences' independently
committed generations; `globalGeneration` is null exactly while Global inspection is
disabled and no Global sequence exists. Each Source's `generation` is its owning
sequence's value: the Repository Source carries `repositoryGeneration`, and every Global
Source carries `globalGeneration`. Each `staleFailures` entry's `baseGeneration` likewise
references the affected Source's owning sequence. A commit in one sequence rekeys and
invalidates only that sequence's generation-owned IDs and views; the other sequence's
files, detail, comparison views, and IDs are untouched (FR-030).
`boundary.displayRoot` is a one-way escaped root presentation label, not a
`SourceRelativePath`, inventory-item locator, caller input, or read authority. The same distinction applies to a pre-admission consent-preview `displayRoot`,
which may represent an absolute or invalid lexical root before any owning Source exists.
The bootstrap Repository root has `origin: process-cwd` when `--cwd` was omitted and
`origin: cwd-option` otherwise; the API never exposes the retained raw or canonical root.
Every `conditionFacts` entry is an evidence-linked, origin-file-less Source Condition Fact:
it stays distinct from `files` and recognitions and cannot create a physical or synthetic
file, file ID/path/text, comparison target, relationship origin, local or hosted read, or
network request. Its `evidenceAssessments` uses the exact record schema, closed enums, and
ordering defined under File Detail; no scalar documentation status is serialized. An
unobserved current state remains conditional or unavailable.
Top-level `snapshotState` is `current` or `stale-after-fatal-rescan`; only a fatal explicit
rescan adds or replaces one `staleFailures` entry and its failure reference for the affected
Source. Its `failureRef` is `{ kind: 'diagnostic', diagnosticId }` for a deterministic
returned failure and `{ kind: 'error', message }` carrying the failed request's error
message for a thrown/rejected accepted job. Entries and failure records for different
Sources coexist. A successful complete or partial scan clears only the entry and any
Diagnostic it references for the Source it refreshed; a commit for another Source preserves both, and Global disable clears both for
Sources it removes. `snapshotState` is stale exactly while the
array is non-empty. Automatic first Repository failure and initial Global-enable failure
create no `staleFailures` entry: a deterministic returned failure may use its closed
Diagnostic, a startup throw/rejection reaches the process top level, and an RPC-owned Global
failure surfaces as that request's ordinary error. Initial Global-enable failure preserves
all pre-existing entries and the derived snapshot state.
Each `sourceRelativePath` is relative to its owning Source's single root; the
API never substitutes an absolute or canonical filesystem path for it.
Public Source-relative Paths serialize with NFC display segments while filesystem
operations use the raw entry names internally (FR-024). Hard links are ordinary files:
there is no physical-identity grouping, no primary-path selection, and no alias path
list.
The inventory summary does not include source text. Deterministic sort order is source kind,
Global tool where present, normalized source-relative path, then file ID.
`parseSummary` is the file-level closed projection
`not-applicable | all-parsed | mixed | all-failed`: it is `not-applicable` when every
recognition is `not-attempted`, `all-parsed` when at least one is `parsed` and none is
`failed`, `all-failed` when at least one is `failed` and none is `parsed`, and `mixed` when
`parsed` and `failed` coexist. `not-attempted` records do not change the last three
projections. Recognition summaries contain tool/kind, recognition-level `parseStatus`,
provenance count, and diagnostic IDs only; they never invent an aggregate documentation or
applicability status, parse result, or winner. Record-by-record evidence/applicability stays
on the detail provenances and relationships below.

Within one generation there is exactly one `ToolRecognition` for each
`(fileId, tool, kind)`. Compatible provenances merge into that recognition. If those
provenances require inconsistent parsed meaning, the one recognition becomes `failed` and
publishes none of that recognition's metadata, relationships, or derivations; it is never
split into competing recognitions. Recognition arrays use the shipped closed tool order,
then the shipped closed kind order, with no opaque ID tie-break.

The SPA owns a monotonically increasing `clientDataEpoch` (incremented only by the
central full client-data purge), one current generation per sequence
(`currentRepositoryGeneration` and `currentGlobalGeneration`), and an opaque request
token for every state-bearing request. A session result carrying an older value for
either sequence is ignored. An equal-generations result is adopted only when its token is
still the latest request token and its captured epoch equals `clientDataEpoch`. When a valid
result carries a newer generation for one sequence, the SPA aborts that sequence's
outstanding data requests, disposes only that sequence's generation-owned editors/models
and every detail or comparison state that includes one of that sequence's files, sets
that sequence's current generation, and adopts the complete new snapshot; the other
sequence's committed files, detail, comparison views, and editor models stay valid and
are not refetched. A result captured under an old epoch or a superseded owning-sequence
generation cannot repopulate state even if its bytes arrive later.
Every returned diagnostic is referenced by the active generation/source/file graph or by
`sessionDiagnosticIds`; client-caused request errors are never accumulated here.
Every retained failed-request error message is owned by exactly one `staleFailures`
entry, the failed `batchStatus`, or the failed disable projection's
`globalDisableInProgress.message`; it never enters either
Diagnostic list.
`scope` is an obligatory attachment discriminator, independent of diagnostic lifetime.
The only legal location shapes are: `file`, with `sourceId`, `fileId`, and that file's
Source-relative Path all present; `source`, with only `sourceId` present; and `session`,
with all three location fields absent. Source- and session-scoped records never invent a
file ID or path. Serialization rejects any other combination.
Progress is null for `idle` and `failed`; it is present for active work and
for final `ready`/`partial` counters as defined in the data model. The first legal snapshot
is bootstrap generation 0 with exactly one idle Repository Source selected lexically from
captured `process.cwd()` or the single `--cwd`, and no files/diagnostics. Its escaped root
label is presentation only and carries no read authority; the first scan reads the retained
selected root, and a root that does not exist or cannot be read as a directory fails that
scan with the source-scoped `root-unreadable` Diagnostic while the session stays usable
(FR-002). A startup throw/rejection may terminate the process, so no later readable
snapshot is promised.

The sensitive-content warning is client-owned: the component that renders it supplies fixed
English text explaining that opening detail or comparison surfaces displays complete
authored values, including possible credentials; the API sends no warning fields.
Protected values include complete source text, declared authored
metadata, authored relationship targets, and either comparison side.
Before requesting any `FileDetail` or constructing a comparison, the SPA
requires an in-memory acknowledgement for the current browser session. The
acknowledgement is client-only, is not sent to this API, and is not persisted by either side.
The acknowledgement is presentation-only, not an access-control factor (FR-027): loopback
binding is the complete host-side protection (QR-003), and the API neither accepts nor
claims to enforce a presentation acknowledgement. The shipped SPA nevertheless
must obtain that acknowledgement before it requests detail or constructs comparison. A
newly loaded browser document and the central full-session client-data purge reset it. Route
closure, selection replacement, file or Source removal, and generation replacement are
scoped cleanup rather than that central purge and may retain acknowledgement for the loaded
document; a generation replacement in either sequence disposes only that sequence's
scoped models. Global disable uses the central purge and therefore resets it. It grants
no filesystem authority and does not alter the returned content.

`globalControl` is null only when Global consent/control state is inactive. Otherwise
`state` is `active` or `disabling`, and `previewId` identifies the frozen active preview.
`confirmedTools` is always the fixed closed `[copilot, claude, codex]` all-tools consent set.
Initial enable and retry validation/admission remain operation-local: only the authority-free
`globalEnableInProgress { kind, operationId, previewId }` is visible. Initial enable keeps
`globalControl: null`; retry preserves its exact pre-operation control projection until one
result-bound disposition atomically commits. A duplicate enable while that projection is
non-null returns the `global-enable-in-progress` conflict rejection; disable remains
immediately available.

At a queued disposition, `pendingTools` is exactly the admitted non-empty batch subset and
`batchStatus` is exactly `{ scanRequestId, tools, phase, failureRef }` for that same subset.
`tools` is non-empty, unique, and in fixed tool order. Its active `phase` is
`waiting | enumerating | reading | deriving | recognizing`, with null
`failureRef`. Batch success atomically publishes every Source, clears both fields, and
commits exactly one Global generation: generation 1 at initial enable, the Global
sequence's N+1 for a retry batch. Terminal deterministic failure leaves empty `pendingTools` and
`phase: failed` with `{ kind: 'tool-failures', failedTools }`, where `failedTools` is the
non-empty fixed-order set with batch-owned `toolFailures` rows and repeats no Diagnostic ID;
a terminal throw/rejection uses
`{ kind: 'error', message }` carrying the failed request's error
message. A failed batch remains request-correlated until retry acceptance or
disable. An `active-no-job` disposition has null `batchStatus`, creates no job/generation,
and retains or replaces only deterministic rejected-tool controls.

While `state: active`, `retryableTools` is exactly each unpublished non-pending `admitted`
control and each `rejected` control whose `retryDisposition` is `same-preview`; lexical
`new-preview-required` controls are excluded. It stays at the pre-operation projection
during operation-local retry validation. Retry is offered only when
`globalEnableInProgress` is null, `pendingTools` is empty, and the matching frozen preview
has been retrieved and verified. During a non-failed active batch, retryable tools are
informational only and enable returns the `global-enable-in-progress` conflict rejection.

From disable-barrier acceptance through terminal success, `state: disabling` has empty
pending/retry arrays and null `batchStatus`; `globalDisableInProgress` is non-null through
`draining`, `committing`, and retained `failed`. The control becomes null only at successful
`remove-active-state` completion. A `cleanup-only` barrier can have null `globalControl`.
`toolFailures` is the fixed-tool-order unique mapping for every non-null control
`diagnosticId`; each ID also occurs in `sessionDiagnosticIds` and resolves to a
session-owned deterministic Diagnostic. It references only deterministic Diagnostics and
remains until that control failure is cleared or disable commits removal.
The failed `batchStatus` error message is the one retained record of an accepted
admitted-subset Global batch throw/rejection for the whole active consent. A
pre-acceptance retry failure preserves it; deterministic `active-no-job` retry or
replacement-batch acceptance clears it; a terminal replacement failure supersedes it; and
Global disable removes it. It never identifies one tool and never creates a
`StaleSourceFailure`.

Outcomes: the full or fenced DTO.

### `agent-customization-inspector:get-file-detail`

Parameters:

```json
{ "fileId": "opaque-file-id" }
```

Returns one active-generation file detail:

```text
FileDetail
├── file summary fields including parseSummary
├── sourceText (readable text only; absent for binary/unknown)
├── recognitions[]
│   ├── recognitionId, fileId, tool, kind, parseStatus, diagnosticIds[]
│   ├── declaredMetadata[] { closed fieldId, zero-based occurrence, exact authoredLiteral }
│   └── provenances[] { provenanceId, ruleId, discoveryClass, matchedPath,
│                       seedFileId, seedProvenanceId, seedRuleId,
│                       declarationKey, scope, evidenceAssessments[], order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, targetOrigin, authoredTarget (exact slice or null),
│                     normalizedTarget, boundary status, resolution status,
│                     evidenceAssessments[], behaviorRefs, strategyRefs, sourceRefs,
│                     applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                     condition facts[] } }
└── diagnostics[]
```

Every derived provenance identifies one exact independently admitted static seed through
all three `seedFileId`, `seedProvenanceId`, and `seedRuleId`; static provenances serialize
all three as null. `scope` is the closed `ScopeDescriptor` union (`source-root`,
`directory-subtree`, `matching-path`, or `declared`), and `order` is null or the closed
`OrderDescriptor` with one to four ordered `path-depth`, `registry-rank`, or
`source-occurrence` components. Their exact fields and stable comparison keys are defined
in the [data-model contract](../data-model.md#scopedescriptor-and-orderdescriptor); the API
does not accept or return implementation-specific scope/order objects.

For a readable file, `sourceText`, every `declaredMetadata[].authoredLiteral`, and every
relationship with `targetOrigin: authored` preserve exact structurally delimited,
round-tripping slices of decoded source without
credential detection, masking, redaction, or a reveal step. The metadata array preserves
source-occurrence order and accepted duplicates; `occurrence` is scoped to its recognition,
and the full comparison identity is `(tool, kind, fieldId, occurrence)`. Authored quoting,
escapes, block/collection punctuation, numeric/date spelling,
and environment-reference syntax are returned rather than a parser-normalized value. A
separate internal typed semantic value may drive classification, target normalization, or
plan-defined derivation but is never serialized or displayed. JSON transport escaping must
round-trip to the same `authoredLiteral` string at the client. Environment-variable
references remain literal strings: the host never reads,
resolves, or substitutes the referenced process-environment value. The only environment
values used by inspection are the specifically documented tool-home variables used to derive
Global roots through the consent flow.
A registry-defined `targetOrigin: documented-default` relationship instead has
`authoredTarget: null`; the SPA labels its validated `normalizedTarget` as a documented
default and never implies that the synthetic path occurred in source.

Across Inventory, Detail, Comparison, Global controls, Diagnostics, Source Condition Facts,
every API result, CLI output, and documentation, the product is limited to syntax-only parsing, exact authored
literal extraction, mechanical typed decoding, frozen-catalog classification, and documented
structural scope/order/condition/selection/reference projection. It never interprets or
ranks natural-language meaning or intent; decides customization correctness, validity,
compliance, effectiveness, or quality; or provides policy/remediation advice, validation,
lint, synchronization, conversion, formatting, or fixing. Strict validation of
Inspector-owned DTOs, registries, and internal invariants remains
permitted and is not customization validation. Deterministic availability Diagnostics carry
no content verdict. A failure confined to one file becomes that file's Diagnostic under
FR-028; any other unexpected RPC-owned failure propagates as the request's ordinary error
and never becomes a Diagnostic.

The file encoding state is assigned from the bytes of one completed ordinary read. Any NUL
byte yields `binary` with no `sourceText` or BOM record, no comparison eligibility,
and an otherwise publishable `partial` generation. Every other byte sequence is
decoded exactly once as UTF-8 with replacement semantics. One leading BOM sets
`hadLeadingBom: true` and is removed. Text decoded without replacement uses `utf-8`; any inserted
`U+FFFD` uses `utf-8-replaced`. That exact garbled complete `sourceText` continues through
parsing, extraction, detail, and comparison and does not make the generation partial by
itself. There is no alternate decode, charset guessing, sampling, truncation, or product-
defined byte/line/item ceiling.

Each recognition's `parseStatus` is the closed enum
`not-attempted | parsed | failed`. Parsing and extraction are all-or-nothing per
recognition: `failed` retains that recognition and its diagnostic IDs but returns
no metadata, relationships, or derivations from the failed result; another recognition on
the same file may still be `parsed`. The uniqueness, compatible-provenance merge,
inconsistent-meaning failure, and closed tool-then-kind ordering rules stated for the
session summary apply identically to detail. A parser or extractor failure confined to one
recognition produces this failed-recognition state and its file-scoped
`recognition-parse-failed` Diagnostic in a `partial` generation while the complete readable
source stays displayed and comparison-eligible (FR-028). A failure that is not confined to
one file fails the attempt and is exposed, when RPC-owned, as the request's ordinary
error. Structural metadata comparison uses
`(tool, kind, fieldId, occurrence)`, so two tools or kinds never collide merely because
their field and occurrence match.

Every internal `SourceTextRange` used to produce metadata, an authored relationship target,
or a derivation is a half-open `{ start, end }` measured in ECMAScript UTF-16 code units.
`sourceText.slice(start, end)` must equal the returned authored literal exactly. UTF-8 byte
measurements are kept separate and never reused as offsets; no Unicode normalization,
code-point counting, or grapheme counting changes the range. Metadata, relationship, and
derivation outputs for the same logical source occurrence may reuse one exactly identical
range. Different logical occurrences may not partially overlap, nest, or cross; any such
overlap, ambiguous boundary, or non-round-tripping range fails the affected recognition
all-or-nothing.

The result uses inert JSON strings. The SPA must render `sourceText` and metadata through
Vue text bindings, not `v-html`, Markdown rendering, clickable links, URI handlers, or image
loads. The result is held only in memory, is never durably cached, and is never logged. The
SPA requests it only after showing and receiving the client-only sensitive-content
acknowledgement described above.

A detail request token captures exactly `(clientDataEpoch, the owning sequence's current
generation, fileId)`. The SPA adopts the result only when all three captured values still
equal the live epoch, owning-sequence generation, and selected file; replacement of the
request token invalidates that capture.
Any mismatch disposes the result without creating a model, DOM text, metadata row, or
comparison input.

Every `evidenceAssessments` member is exactly `{ subjectKind, subjectId,
documentationStatus, lifecycleQualifiers }`. `subjectKind` is
`behavior | rule | strategy`; `documentationStatus` is
`documented | partially-documented | unknown | conflict`; and
`lifecycleQualifiers` is a unique fixed-order subset of
`preview | experimental | deprecated`. An empty qualifier array makes no stability claim.
Each array contains one record for the owning rule and every referenced behavior/strategy,
deduplicated and sorted by subject-kind order then `subjectId`; the API never collapses it
to a scalar. The runtime `ConditionFact.status: documentation-conflict` remains a distinct
condition value, not a `DocumentationStatus` alias.

Outcomes: the `FileDetail` result; the `stale-resource` rejection when the file ID is
unknown, belongs to a superseded generation of its owning sequence or a removed file, or
belongs to a disabled source; the `global-disable-pending` conflict rejection while the
disable fence is non-null.

### `agent-customization-inspector:rescan-repository`

Parameters: none.

Accepts one Repository scan command when that source has no running or queued command. The
host generates one opaque `scanRequestId` at admission and returns
`ScanAdmission { scanRequestId, source }`; both fields in the returned Source/progress and
all later queued, active, complete, partial, or failed status for this command carry that
same ID. A successful committed generation records it, while older status or inventory
cannot satisfy this request. If
the coordinator is idle, work starts immediately; if another transaction is active, the
command is queued FIFO and the Repository summary returns `status: scanning`,
`progress.phase: waiting`, a non-null `queuedAt`, and null `startedAt`. The job begins from
the Repository sequence's committed generation at dequeue time, not the generation
observed by this request. The current Repository generation remains readable until a
complete or partial replacement is atomically published as exactly Repository generation
N+1. Publication rekeys only Repository generation-owned IDs and invalidates every old
Repository file ID and every detail or comparison view that includes a Repository file;
the Global sequence, its generation, its IDs, and Global-only views are untouched, so
clients refetch only Repository data.
If the explicit rescan fails before commit, every uncommitted result, including any
provisional partial result, is discarded. The last committed generation and IDs remain
readable, the snapshot is `stale-after-fatal-rescan`, and the Repository Source is `failed`.
A deterministic returned fatal outcome uses its closed actionable lifecycle Diagnostic; an
unreadable selected root uses `root-unreadable`. A throw/rejection that is not confined to
one file propagates past every domain layer, and the accepted job retains the failed
request's error message for this same `scanRequestId`. In either case the
`staleFailures` entry carries exactly that failure representation —
`{ kind: 'diagnostic', diagnosticId }` or `{ kind: 'error', message }`; later success
clears both, while another Source's commit preserves them.

Outcomes: the acceptance result with the request ID and updated source summary; the
`scan-in-progress` conflict rejection only for a duplicate running/queued Repository
command; or the `global-disable-pending` conflict rejection while the disable fence is
non-null.

### `agent-customization-inspector:get-global-consent-preview`

Parameters: none.

Returns only the already-current process-memory preview. It never captures environment
values and never creates, replaces, or invalidates a preview. With active consent or a
registered initial enable it returns that exact frozen preview; while a disable fence is
non-null it returns the barrier's exact `frozenPreview` so the control-only recovery view can
display the consent being revoked. With neither a current unconsented preview nor a frozen
preview it returns the `consent-preview-missing` rejection. It remains a read-only
current-preview lookup and does not schedule work.

Outcomes: the current or frozen `GlobalConsentPreview`; the `consent-preview-missing`
rejection.

### `agent-customization-inspector:create-global-consent-preview`

Parameters: none.

Captures and atomically creates or replaces an unconsented lexical, process-scoped preview
before any proposed Global path is touched:

```text
GlobalConsentPreview
├── previewId, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, inputState }
└── excludedRuleIds[]
```

For every permitted create invocation after coordinator conflicts are checked, the server reads `COPILOT_HOME`,
`CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once each in that order. Only `undefined` is
absent; an empty string is present. If any is absent, it calls imported
`node:os.homedir()` exactly once for that request and uses active-platform `node:path.join`
with fixed `.copilot`, `.claude`, or `.codex` suffixes for the corresponding absent entries.
It does not independently select `HOME`, `USERPROFILE`, or another home source, and the
lexical capture/join performs no existence check. Those variables are used only to locate proposed
Global roots and never to substitute references inside inspected content. The frozen
internal preview record, which is never serialized, additionally keeps each entry's
`lexicalRoot` as the exact raw string. Empty, relative, invalid, control-containing, and
backslash-containing values remain exact raw strings with their separate `inputState`. `displayRoot` is
one-way presentation escaping derived from `lexicalRoot`; it is never decoded back into a
path or used as admission input. The preview
performs no `stat`, `realpath`, directory enumeration, or file read under a
proposed Global root. Node.js and the execution environment determine whether the value can
be retained and escaped. A throw/rejection during environment capture, `homedir()`, join,
retention, presentation encoding, or serialization reaches this pre-acceptance RPC boundary and
rejects the invocation with its ordinary error (no job or `scanRequestId` is created), creates no read authority, and
performs no normalization, canonicalization, root creation, or read. Otherwise `displayRoot` shows the exact escaped lexical value; invalid empty
or relative overrides are shown as invalid instead of falling back. A successful create
atomically replaces the prior unconsented preview only after its complete result is
bound. Active consent returns the `consent-preview-frozen` conflict rejection; a
registered enable returns the `global-enable-in-progress` conflict rejection; and a
disable fence returns the `global-disable-pending` conflict rejection, with no environment
recapture or state change. The read function
supplies the exact frozen preview for fresh-client recovery; a different preview requires
disable first. The preview is the one server-retained record identified by its opaque
`previewId`; enable and retry name that ID, and the server acts only on its own stored
record — there is no cryptographic re-verification of server-retained state.

The preview intentionally carries no per-pattern display: what is read below an admitted
root is fixed by the shipped static typed `TraversalPlan` that the retained
`allowlistVersion`/`traversalPlanVersion` pair identifies, and the consent copy explains
that scope in plain language.
After consent and root admission, an exact-file rule reads only its named file and never
enumerates the Global root; a fixed-instruction-subtree rule enumerates only the plan-named
instruction subtree for its walk. No operation lists, stats, or reads a sibling setting,
credential, state, plugin, or other neighboring path.

The Codex plan alone uses `codex-global-first-non-empty`: it reads
`AGENTS.override.md` first, short-circuits before any `AGENTS.md` operation when the
override is non-empty, and advances only from an absent or safely-read empty override.
`absent` means the override file does not exist. An unreadable or binary override ends
selection with its file Diagnostic (`file-unreadable` or `file-content-binary`) and no
fallback. An optional
leading UTF-8 BOM alone or whitespace-only content is empty under
`decodedText.trim().length === 0`; `utf-8-replaced` participates as ordinary text and every
`U+FFFD` is non-whitespace. At most one non-empty Codex instruction file is published.

Outcomes: the created `GlobalConsentPreview`; the `consent-preview-frozen`,
`global-enable-in-progress`, or `global-disable-pending` conflict rejection; or, for a
capture/serialization throw or rejection, that request's ordinary pre-acceptance error.

### `agent-customization-inspector:enable-global`

Parameters:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-20",
  "previewId": "opaque-preview-id"
}
```

Result data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── scanRequestId: opaque ID | null
├── acceptedTools[] (zero to three tool enums)
└── rejectedTools[] (zero to three tool enums)
```

The UI may send this only after showing all three exact Global path sets, lexical input
states, and exclusions from that preview. The host rejects a false confirmation, stale
contract version, or superseded preview. It uses only
the stored internal raw `lexicalRoot` and stored typed traversal program; it never rereads
environment input or reverse-converts `displayRoot`.
The parameters intentionally have no tool selector. Initial enable derives the exact fixed
`[copilot, claude, codex]` set from all three frozen preview entries, including entries that
are already lexically invalid. A retry derives the exact current server-side
`retryableTools` subset: unpublished non-pending admitted controls and same-preview rejected
controls only. Lexical `new-preview-required` controls require disable and a new preview.
The client cannot add, omit, remove, or reorder a tool.

After the confirmation fields are verified, the coordinator registers exactly one
`GlobalEnableOperation` and exposes only
`globalEnableInProgress { kind, operationId, previewId }` while one provisional transaction
evaluates the whole derived set. A duplicate enable returns the
`global-enable-in-progress` conflict rejection; no tool outcome, root, context, Source,
job, or authority is
published by that projection. Empty, relative, and invalid entries are deterministic
rejections with no filesystem call. An eligible absolute root that is missing or is not a
readable directory records that tool as absent or failed without preventing the other
tools from committing (FR-014). An unexpected throw or rejection that is not confined to
one tool's files propagates to the RPC owner without domain classification. During initial enable
this occurs before job acceptance, rejects the invocation with its ordinary error (no
`scanRequestId` is created), activates no consent/control/job, and commits none of a provisional subset.
During retry, existing consent/control and the prior snapshot remain unchanged.
Either pre-acceptance failure unregisters `globalEnableInProgress`; no terminal operation
history is retained.

When validation finishes without such an exception, `acceptedTools` and `rejectedTools`
are disjoint, unique, fixed-tool-order arrays whose union is every tool evaluated by the
transaction. The coordinator atomically activates
initial consent with controls for all three tools. If no root was admitted, it returns
`state: active-no-job`, null `scanRequestId`, no Source/job/generation, and keeps controls
for disable plus same-preview retry only where `retryDisposition` permits it. Otherwise it allocates one `scanRequestId`, transfers every
admitted root into one provisional batch scan, returns `state: queued`, and publishes no
Source before that batch's commit. The same atomic acceptance publishes
`globalControl.pendingTools` and `batchStatus` with the promoted `scanRequestId`, tool set,
`phase: waiting`, and null `failureRef`; fresh polling can therefore recover a lost
acceptance result. Separate tool roots remain separate Source
identities, but all ready/partial Sources in the admitted subset appear together in exactly
one Global generation — the enable commit creates the Global sequence at generation 1, and
a retry batch beside existing Global Sources commits that sequence's exact N+1; no poll can
observe a per-tool commit. That one commit preserves stable Source IDs and semantic
content for carried Global Sources, rekeys all Global generation-owned IDs, invalidates
old Global detail/comparison/editor state, and clears the applicable deterministic tool
failures; the Repository sequence, its generation, its IDs, and Repository views are
untouched.

The operation checks its ID/epoch and non-aborted signal before and after each asynchronous
step, plus the same operation-local provisional state for initial enable or the same active
control snapshot for retry. Immediately before the one batch enqueue, the coordinator
atomically activates initial consent/controls or applies the retry partition and verifies
that resulting active control state. A disable-first ordering
drains and returns the `global-disable-pending` conflict rejection with no late mutation;
an operation-first queued acceptance remains its accepted disposition even if a later
barrier cancels the batch. A
throw/rejection after queued acceptance is the terminal failure for the same non-null
`scanRequestId`, commits no subset Source/generation, and preserves the prior snapshot. It
creates no Diagnostic or `StaleSourceFailure` for an initial/retry admitted-subset Global batch;
instead the one operation-wide failed-request error message is retained on the failed
`batchStatus`. A later retry and disable apply the exact clear/
supersede lifecycle defined on the session projection.

The exact same consent may be retried only while the server-derived `retryableTools`
projection is nonempty. That exact eligible subset, not mere Source absence, is derived by the
server and cannot be narrowed by the client. A different preview/root or lexical
`new-preview-required` control requires Global disable first. An empty projection returns
the `no-retryable-global-tool` conflict rejection; the presence of a non-retryable missing
tool creates no
separate active-consent conflict. Even an all-lexically-invalid preview may be
confirmed and returns the deterministic `active-no-job` state, so there is no separate
`no-eligible-global-root` outcome.

Outcomes: the acceptance result; the `consent-required`, `allowlist-version-mismatch`, or
`consent-preview-mismatch` rejection; the `no-retryable-global-tool`,
`global-enable-in-progress`, or `global-disable-pending` conflict rejection; or, for an
unexpected pre-acceptance throw/rejection, that request's ordinary error.

### `agent-customization-inspector:rescan-global`

Parameters:

```json
{ "sourceId": "opaque-enabled-global-source-id" }
```

Accepts one scan command for the identified enabled tool-specific Global Source only while
Global disable is not pending. `sourceId` is an opaque ID and never a path. The command uses
the same FIFO, dequeue-time base-generation, atomic publication, progress, invalidation, and
serialization rules as Repository rescan, applied within the Global sequence: a successful
commit is that sequence's exact N+1, rekeys only Global generation-owned IDs, and leaves
the Repository sequence, its generation, its IDs, and Repository views untouched, so
clients refetch only Global data. At most one scan command is running or queued
for that Source; a duplicate cannot silently coalesce or trigger a second read. Admission
returns `ScanAdmission { scanRequestId, source }`; the opaque request ID is identical in the
returned Source/progress, every later status for the command, and any generation it commits.

A failed Global rescan commits nothing and publishes zero partial results from the failed
attempt. It reports top-level `snapshotState: stale-after-fatal-rescan`, Source
`status: failed`, and null `progress`, while
retaining `enabled: true`, the exact consent and validated single-root record, the last
committed graph, and all IDs from that graph. This creates or replaces only that Source's
`staleFailures` entry, which explains that the retained snapshot is stale. A deterministic
returned failure references its actionable lifecycle Diagnostic; a throw/rejection not
confined to one file propagates past the domain
and is retained as the failed request's error message for this `scanRequestId`. A
later successful complete or partial rescan of the same Source replaces its graph atomically
and clears both; another Source's commit preserves both.

Outcomes: the acceptance result with the request ID and updated source summary; the
`stale-resource` rejection for an unknown or removed Source ID; the
`global-disable-pending` conflict rejection if Global disable is pending/active; or the
`scan-in-progress` conflict rejection for a duplicate running/queued scan for that Source.

### `agent-customization-inspector:disable-global`

Parameters: none.

Result data:

```text
GlobalDisableResult
├── state: disabled | no-op
├── operationId: opaque ID | null
├── commitKind: cleanup-only | remove-active-state | null
└── repositoryGeneration
```

This is the priority security barrier for all inspection data, not merely a Global Source
deletion command. Before sending it, the SPA performs the central full purge. A true no-op
is possible only when no active/queued Global authority or retained disable failure
exists. It uses
the ordinary pre-acceptance result-binding gate, returns null operation/commit kind with
the unchanged `repositoryGeneration`, does not increment `globalContentEpoch`, and does
not disturb Repository work. No disable disposition commits a generation in either
sequence: `repositoryGeneration` is always the unchanged Repository value, and after a
successful `remove-active-state` the Global sequence no longer exists, so the next full
snapshot reports `globalGeneration: null` (FR-042). If validation or result construction fails before barrier acceptance,
the invocation rejects with its ordinary error and mutates nothing; because
the fresh session has a null fence, the already-purged client may immediately recover a full
snapshot.

Every non-no-op first acceptance atomically allocates the barrier operation, increments the
command epoch and `globalContentEpoch`, irreversibly revokes publication authority, exposes
non-null `globalDisableInProgress`, changes an existing `globalControl` to `disabling`, and
clears its `pendingTools`, `retryableTools`, and `batchStatus`. It aborts the registered
`globalEnableInProgress` operation and Global scans, prevents any queued Global command from
dequeueing, and fences every generation-mutating command. Repository rescan requests then
return the `global-disable-pending` conflict rejection; already-running Repository work is
revoked and held for
one requeue only after terminal disable success. Global enable/rescan also returns that
conflict. The session function returns only `GlobalFenceRecoverySnapshot`; every other
inspection-data function returns the same conflict. Liveness continues to report the greater
epoch and non-null projection.

The first acceptance fixes `commitKind`. `remove-active-state` is selected exactly when
public Global consent/control/Source state exists. `cleanup-only` is selected only when the
barrier must cancel and drain an operation-local initial enable that published no such
state. The barrier drains every revoked continuation and performs the final
queued-Global-work
cancellation sweep. It never requeues interrupted Global work.
Expected cancellation creates no Diagnostic and retains no error.

A request received while the barrier is `draining` or `committing` joins the same
`operationId` and terminal result; disconnecting any transport does not cancel it. An
unexpected post-acceptance throw/rejection, including drain or final
assembly failure, rejects that still-pending invocation with
the real error; `globalDisableInProgress.state` becomes `failed` and retains the same
message as its `message` field, the
process remains alive, the prior generation stays internal, and every inspection-data fence
remains closed. No failed cleanup re-exposes content.

A later disable invocation in `failed` state starts or resumes idempotent cleanup with a
new operation that inherits the exact `commitKind`, base generation, frozen preview, and
already incremented
`globalContentEpoch`; retry does not increment the content epoch again. Another failure
supersedes the sole retained
disable error; terminal success alone clears it and removes the fence. Process restart is
the fallback when cleanup cannot be confirmed, but the request-owned failure itself never
exits the process.

Terminal success is result-bound and atomic. For `remove-active-state`, it discards the
entire Global generation sequence — all Global Sources, consent, controls, roots, preview,
stale failures, tool Diagnostics, and retained failure messages — commits no generation in
either sequence, clears the fence, and returns the unchanged `repositoryGeneration`; every
Repository generation-owned ID stays valid, and a later re-enable restarts the Global
sequence at generation 1 under the already-greater `globalContentEpoch` (FR-042). The held
Repository command is then requeued once and may later commit the Repository sequence's
N+1. For `cleanup-only`, it removes only the unpublished operation-local state, clears the
fence, and changes no committed state: both sequences' generations and generation-owned
IDs are unchanged. Concurrent joiners receive that same terminal result.

Outcomes: the result on no-op, joined success, retry success, or first-attempt success; or
the post-acceptance failure's ordinary error. Disable itself never returns
`global-disable-pending`.

## Concurrency and lifecycle

- One coordinator serializes scan transactions as a correctness invariant. It accepts one
  running or queued scan command per Source; duplicate scans conflict, while a scan for
  another Repository or tool-specific Global Source queues FIFO and reports the waiting
  phase. A failure confined to one file becomes that file's Diagnostic (FR-028); any other
  scan or admission throw/rejection propagates to the owning
  boundary without domain state mutation. Disable follows its priority barrier join/no-op rules. Every
  automatic or explicit scan receives one opaque `scanRequestId` and starts from its
  owning sequence's generation current when it actually dequeues.
- Every scan and `GlobalEnableOperation` receives an `AbortSignal`. Process shutdown aborts
  all work. Global disable is the priority barrier documented above: it aborts any active
  uncommitted transaction, aborts/drains enable validation, performs a final queued-Global-
  work cancellation sweep, completes its fixed cleanup-only or remove-active-state
  disposition next, and requeues an interrupted Repository command once only after terminal
  success. Operation completion is governed by Node.js and the execution environment.
  Disable, shutdown, supersession, or a propagated fatal operation failure irreversibly
  revokes publication authority. A file-confined outcome (FR-028) does not by itself revoke
  the attempt's publication authority. After revocation, every late byte,
  graph record, Diagnostic, and DTO result is discarded. Physical
  cancellation of an uncancellable kernel operation is not guaranteed.
- A successful complete or partial scan commits exactly N+1 in its owning sequence and
  regenerates that sequence's generation-owned graph IDs for the scanned Source and, in a
  Global batch commit, all carried Global Sources; process-lifetime-stable Source IDs and
  the entire other sequence — its generation, IDs, and views — remain unchanged. It clears
  only the scanned Source's stale-failure
  entry and referenced failure and carries both for other Sources. A fatal explicit rescan discards every uncommitted
  result, including partial results, leaves the owning sequence's N and its IDs active,
  marks the retained
  session snapshot stale, and creates or replaces one `staleFailures` entry for the
  affected Source referencing an actionable lifecycle Diagnostic or carrying the failed
  request's error message, replacing both for that Source
  on repeated failure. Repository N may be legal bootstrap
  generation 0; the Global enable commit creates its sequence at generation 1, and disable
  discards that sequence without committing a generation (FR-042). Barrier cancellation
  emits none.
- Session retrieval never extends the Node process lifetime or persists data and defines
  no product-specific time threshold. There is no liveness probe: the product does not model
  a second browser tab, and a lost host closes the loopback socket, which the transport
  reports to the page without being asked (amended 2026-07-24). Every response is still
  checked, so a matching session with an equal epoch and a null disable projection confirms
  the current baseline.
  A greater epoch or non-null projection runs the central purge before entering control-only
  recovery; network/runtime failure, channel loss, or session mismatch
  purges before an ended view. A page-lifecycle event is not a purge trigger (amended 2026-07-24): FR-027 purges after a document-liveness failure or an equivalent terminal reset, and neither switching tabs nor navigating away is either — a discarded document frees its own memory, and a bfcached one holds the same user's view of their own files on their own machine, which the trusted-workspace model does not treat as exposure. The client installs no visibility or unload listener.
  The purge increments a
  client epoch so a late in-flight result cannot repopulate DTOs or editor state, disposes
  Monaco models/editors/workers and subscriptions, clears DOM/store content and warning
  acknowledgement, and aborts pending requests. Closing the Node process destroys the
  server-side session state, complete source content, source roots, generations, and
  diagnostics.
- No session-channel invocation starts an MCP server, follows an import, opens an inspected
  URL, invokes a
  customization command, or writes to an inspected source; the host does not enable
  devframe's optional MCP route.
- Enabled inspection sources are enumerated/read only by the inspection module built
  on `node:fs/promises`. It accepts validated source IDs and source-relative enumeration
  records, never an arbitrary absolute path supplied by an API request, relationship, or
  source file, and it relies on
  Node.js, the operating system, and the execution environment for available capacity. Every open uses only
  read-only, non-create, non-truncate flags. The service never calls a write, append, create,
  truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
  equivalent mutation-capable primitive on an inspected source. Traversal is an ordinary
  recursive walk of the fixed inspection-path allowlist. Symbolic links are followed
  transparently, because the inspector shows what an agent reading the same path would see;
  a link whose target is missing or unreadable yields that file's `file-unreadable`
  Diagnostic, and recursive traversal tracks visited directories by real path so a link
  cycle cannot prevent a scan from terminating (FR-024). Hard links are ordinary files with
  no physical-identity grouping. A file whose read fails yields `file-unreadable`, and
  NUL-containing content yields `file-content-binary`; each outcome is file-confined, keeps
  every unaffected file complete, and makes an otherwise publishable generation `partial`
  (FR-028). A selected root that does not exist or cannot be read as a directory fails the
  Source attempt with `root-unreadable` and publishes no generation for that attempt
  (FR-002). There is no repeated identity re-verification between operations, no
  race-detection taxonomy, and no ticket, receipt, or resource-registry machinery (FR-019).
- Mutation verification instruments the product's filesystem calls and compares fixture
  content, length, identity/link state, mode, modification/change time, and extended
  attributes or ACLs where observable before and after inspection. Access-time movement
  caused only by an OS read is recorded separately; it neither fails the no-product-mutation
  claim nor counts as proof of it, and the product never requests an access-time update.
  A failed read of one file yields that file's `file-unreadable` Diagnostic in a `partial`
  generation; a failure not confined to one file discards the incomplete
  attempt, commits no item/result/generation, and, when RPC-owned, surfaces as the
  request's ordinary error. Neither outcome is labelled valid, invalid, correct, incorrect, or
  lint-failing.
- The product runs in a workspace the user already trusts: inspected customization files
  are not modeled as an adversary, and a file that changes or disappears during a scan is
  handled by the per-file diagnostics above or by the next explicit rescan rather than by
  race-detection machinery. The retained obligations are that inspected content is never
  executed, the session host binds loopback only and is never exposed beyond the initiating
  machine, and displayed content is rendered inert.

## Required contract tests

1. Startup fixtures assert that the standalone host's listening socket is bound to a
   loopback address (IPv4 `127.0.0.1` or IPv6 `::1`, per the platform's `localhost`
   resolution) on every supported OS and that no configuration or flag binds `0.0.0.0`, a
   LAN address, or a Unix socket; the printed launch line carries the `localhost`
   authority.
   Channel fixtures prove that no token, session capability, bearer header, or origin
   classification exists on the session channel and that the shipped documentation states
   the residual unauthenticated-loopback limitation (other local processes; DNS
   rebinding). Presentation-output tests cover help/version text, the one launch-URL
   line, and fixed startup warnings; an unexpected startup failure prints its ordinary
   error.
2. Old file IDs of the committing sequence fail after a successful Repository/Global
   rescan while the other sequence's file IDs and detail/comparison views stay valid; a
   `remove-active-state` Global disable fails every Global file ID while preserving every
   Repository generation-owned ID; `cleanup-only` changes no committed state and preserves
   both sequences' generations and every generation-owned ID. A fatal
   explicit rescan publishes zero failed-attempt partials, retains the last committed IDs,
   marks the retained session snapshot stale, and carries exactly one failure
   representation: an actionable Diagnostic reference for a deterministic returned failure
   or the failed request's error message for a throw/rejection; the stale-failure fixture
   asserts that retained message is returned with the stale snapshot.
   Bootstrap generation 0 contains exactly one non-authorizing Repository Source selected
   from captured `process.cwd()`/`--cwd`. Multi-Source sequences prove that A and B entry-failure pairs
   coexist, B's success does not clear A, A's partial success clears only A's pair,
   a repeated A failure replaces only A's pair, and Global disable clears only pairs for
   removed Global Sources. Diagnostic DTO fixtures accept exactly the three scoped shapes:
   file with matching `sourceId`/`fileId`/`sourceRelativePath`, source with only `sourceId`,
   and session with no location field. Every missing, extra, mismatched, or fabricated
   source/file/path combination is rejected before serialization.
   Failure fixtures prove that a pre-acceptance throw/rejection rejects only its
   invocation and retains nothing, that an accepted scan-job failure is retained as the
   failed request's error message with its `scanRequestId` in exactly one lifecycle owner,
   and that an accepted disable-barrier failure is retained only as the failed
   `globalDisableInProgress` projection's `message`.
   A failed request leaves the session usable: the same channel immediately serves the
   retained prior snapshot afterward. Request-owned rejections reject with the real
   error without exiting the process; automatic startup read rejection reaches the process
   top level and makes no product process-liveness guarantee.
3. Readable file detail returns complete authored source, exact metadata/authored-relationship source
   slices, credentials, and environment-reference text without masks or reveal controls.
   JSONC escape spelling, YAML quote/block spelling, TOML quote/date spelling, collection
   punctuation, source order, and accepted duplicate occurrences survive transport and
   structural comparison; a normalized semantic value is never substituted for display.
   File summaries expose only `not-applicable | all-parsed | mixed | all-failed`, while the
   exactly one recognition per `(fileId, tool, kind)` exposes
   `not-attempted | parsed | failed` and its own diagnostic IDs. Compatible provenance
   merges once, inconsistent meaning fails that recognition all-or-nothing, and arrays use
   closed tool-then-kind order. Comparison keys are
   `(tool, kind, fieldId, occurrence)`. Astral characters, unpaired surrogates, combining
   sequences, and ordinary BMP text prove that `SourceTextRange` uses UTF-16
   `String.prototype.slice` offsets while UTF-8 measurements remain separate. One logical
   occurrence may reuse an identical span across metadata/relationship/derivation output;
   partial, nested, or crossing overlaps between different occurrences fail the recognition.
   Every returned metadata tuple `(tool, kind, fieldId)` and relationship tuple
   `(tool, kind, relationship kind)` must appear in the maintained presentation allowlist,
   and the exact authored occurrence must be supported by the extractor for the recognition's
   actual admitted source form. Tuple membership never transfers eligibility between source
   forms. Unknown authored keys and references remain available only through complete
   `sourceText` and never produce inferred metadata or relationships.
   Evidence fixtures accept only `documented | partially-documented | unknown | conflict`,
   keep unique fixed-order `preview | experimental | deprecated` qualifiers separately,
   treat an empty qualifier array as no lifecycle claim, and require one sorted
   `EvidenceAssessment` for the rule and every referenced behavior/strategy. They reject a
   lossy scalar assessment and keep runtime `documentation-conflict` distinct.
   Encoding fixtures prove NUL is binary/diagnostic-only/`partial`, valid text is
   `utf-8`, and invalid non-NUL input is readable `utf-8-replaced` with every
   `U+FFFD` preserved through parsing, detail, and comparison without making the generation
   partial by itself. No alternate decoder is invoked.
   A fixed Codex default-hook fixture instead returns `targetOrigin: documented-default`,
   null `authoredTarget`, and an explicit documented-default label; an explicit manifest
   hook returns `targetOrigin: authored` with its exact occurrence. Sentinel process values
   prove that environment references are never resolved or substituted. The SPA shows
   and receives the in-memory sensitive-content acknowledgement before requesting any
   `FileDetail` or constructing comparison, and tests assert that no protected authored-value
   request or derived DOM/editor state exists earlier, while no reveal function exists in
   the RPC catalog. Direct RPC
   tests prove that no acknowledgement parameter or function exists and that the
   acknowledgement is presentation-only: the channel serves detail without it, and loopback
   binding, not a claimed server-side presentation gate, is the complete host-side
   protection.
   Cross-surface negative fixtures prove that Inventory, Detail, Comparison, Global
   controls, Diagnostics, Source Condition Facts, API DTOs, CLI output, and documentation expose only
   the documented structural projections: no natural-language meaning/intent
   interpretation or ranking, correctness/validity/compliance/effectiveness/quality verdict,
   policy/remediation advice, validation, lint, synchronization, conversion, formatting, or
   fixing field or behavior is admitted.
4. Extra parameter keys, path-shaped inputs, and malformed or wrongly typed arguments
   produce the documented safe rejections, and an unknown function name is not registered
   and cannot be invoked. Contract tests prove that no request, file,
   collection, parser, snapshot, detail, or result DTO exposes or enforces a product-
   defined numeric capacity ceiling. Injected Node.js, parser, filesystem, and serialization
   failures that are not confined to one file bypass domain classification and reject at
   the owning RPC boundary as ordinary errors carrying the real message, never a partial
   result, incomplete
   generation, or validity/correctness/compliance/lint verdict; the session stays usable
   and the prior snapshot stays readable afterward. Escaping and key-order
   fixtures prove that one complete strict-JSON-serializable result value crosses the
   channel unchanged and round-trips at the client.
5. Static traversal and encoded traversal attempts never escape the packaged `dist/public`
   output; every served byte comes from that packaged Nuxt output, no inspected file is
   ever served, and the root, `/compare`, `/global-consent`, and `/files/<fileId>` client
   routes all boot the same packaged SPA shell, which embeds no session data.
6. Queue ordering across Repository and each tool-specific Global rescan, duplicate
   rejection, aborts, partial outcomes, fatal failures, and polling expose only
   whole generations. A scan queued behind another Source starts from its owning
   sequence's then-current generation, and a commit in one sequence leaves the other
   sequence's committed state observable unchanged. A `remove-active-state` barrier
   discards the Global sequence without committing a generation and leaves the Repository
   sequence at unchanged N before the held Repository command may commit N+1; a later
   re-enable restarts the Global sequence at generation 1 under the already-greater
   `globalContentEpoch`, so a Global result from the discarded era can never be adopted. A
   `cleanup-only` barrier changes no committed state, and a true no-op
   leaves both sequences and Repository work untouched. No barrier exposes an aborted transaction, and
   the one accepted Repository command is requeued once only after terminal success.
   Concurrent disable during `draining`/`committing` joins one operation/result; a later
   request after `failed` resumes the inherited cleanup. A paused validation/admission operation is
   aborted and drained before the final cancellation sweep; releasing its late continuation
   afterward creates no mutation, diagnostic, context, ID, or job. Injected unexpected
   admission rejections propagate to their outer boundary, leave domain state unchanged,
   and do not depend on a product-defined slot count. Deterministic barrier-ordering fixtures pause the operation (a) while
   validation is awaited, (b) after admission but before any control/context/diagnostic
   mutation, and (c) immediately before job enqueue/final result disposition. At every
   pause, a barrier-first ordering returns the `global-disable-pending` conflict rejection,
   permits no late side effect, unregisters
   the operation, and allows a later enable; an operation-first final disposition remains
   the committed queued acceptance even when the result is delivered after disable
   acceptance.
   Fence fixtures prove first non-no-op acceptance increments `globalContentEpoch` and
   immediately makes the session function control-only while every other inspection-data
   function
   returns the `global-disable-pending` conflict rejection, including throughout retained
   `failed`. They inject
   a post-acceptance drain rejection, and verify that the
   failed request's error message is retained only in `globalDisableInProgress.message`
   while `state: 'failed'`, plus process
   survival, no content re-exposure, and idempotent retry.
   Separate deterministic delivery pauses hold a data result before or across scan commit
   and disable acceptance. They prove that result epoch/generation and payload never mix,
   a result not yet bound when the fence linearizes becomes the conflict rejection, and a
   result already bound is
   treated only as the documented bounded pre-fence response and is purged when the client
   observes the greater epoch/fence. Older results are ignored; adopting a newer
   generation for one sequence aborts and disposes only that sequence's state while the
   other sequence's detail/comparison views survive the commit; and detail is adopted only
   when its captured epoch, owning-sequence generation, and fileId all still match. Disable,
   shutdown, supersession, and injected assembly/serialization rejection
   tests leave a filesystem
   promise pending, revoke publication authority, and prove that every late result is
   discarded and that the correct outer boundary alone surfaces the failure — an ordinary
   RPC error or startup
   top-level propagation. A separate file-confined case — an unreadable file, binary
   content, or a parse failure — proves `partial`
   publication with the affected file's Diagnostic and every unaffected complete file,
   without revoking the whole attempt. An unreadable root instead proves a failed Source
   attempt with `root-unreadable` and no generation. Tests do not assert hard cancellation of the underlying Node.js/kernel
   operation or a product-defined completion deadline.
7. Reloading every client route discloses no session data: the served shell embeds no
   snapshot, and the freshly loaded SPA adopts state only through the loopback RPC channel.
   Session-response and recovery tests cover browser/network/runtime rejection, channel
   loss, port reuse with a different
   `sessionId`, older/equal/greater epochs, null/draining/committing/failed projections, and a late in-flight
   result after the client epoch changed; none may leave or automatically restore pre-purge inventory,
   detail, comparison, editor, or authored-content DTO/DOM state or the warning
   acknowledgement. With active consent, recovery after a greater epoch, non-null fence, or
   explicit Resume reconnects over the loopback channel, adopts the returned `sessionId`
   without retaining/comparing the purged ID, and constructs only the closed recovery
   projections. Disable is available from
   active control/enable state immediately; draining/committing joins or waits, failed offers
   retry-disable, and retrieving/verifying the same frozen preview rebuilds only eligible
   retry controls. The explicit Resume inspection action is absent while the fence is
   non-null. With a null fence the page re-fetches a matching full session and constructs a
   fresh inventory summary with default state, but restores no
   pre-purge authored content, selection, filter, detail, comparison, editor, or
   acknowledgement. A later detail/comparison request requires a new acknowledgement.
   Pre-acceptance disable failure and true no-op both leave a null fresh-session fence so a
   purged client can resume immediately.
8. A Global consent preview touches no proposed path, confirmation names the one
   server-retained preview by its `previewId` — binding the exact raw internal
   `lexicalRoot` values and typed traversal-plan version/program it retains — and
   a changed or superseded preview cannot authorize a read.
   Only the create function captures all three environment inputs and atomically creates or
   replaces an unconsented preview; the read function performs zero capture and returns only
   the current or
   frozen preview, including through the disable fence. Missing-current, active-consent,
   in-progress-enable, and disable-fence cases return their documented closed outcomes with
   no accidental replacement.
   Escape-collision, control-character, and backslash fixtures prove that
   enable uses only the stored raw value, never an environment reread or
   `displayRoot` reverse conversion. The parameters have no tool selector and initial
   enable always
   evaluates all three frozen entries. Missing or unreadable consented roots and
   deterministic lexical outcomes partition rejected tools from admitted ones; an
   unexpected throw/rejection
   rejects the invocation with its ordinary error, activates no initial control/job, and
   commits none of a provisional subset. Provisional enable work publishes no Source. One
   successful complete or partial batch commit produces one to three separately
   identified Global Sources together in exactly one Global generation, at most one per tool and
   exactly one root per Source; no cross-tool merge or observable per-tool commit occurs. An
   accepted batch throw/rejection not confined to one file retains the failed request's
   error message on the failed `batchStatus` for its one
   `scanRequestId`, commits no Source/generation, and creates no Diagnostic. Both prior-current and
   prior-stale cases are tested. Initial activation with every root deterministically
   rejected, including an all-lexically-invalid preview, yields the deterministic
   `active-no-job` acceptance, zero
   jobs/Sources, and an active `globalControl`. Its `retryableTools` contains exactly the
   same-preview subset; an all-lexically-invalid preview has none and requires disable/new
   preview. An all-rejected retry likewise creates zero new jobs/Sources while
   preserving existing Source semantic content and stable `sourceId` values without a
   generation commit. Partial acceptance partitions every evaluated tool. Every successful
   initial or retry batch publication advances the Global sequence exactly once — the
   initial enable commit creates it at generation 1 — rekeys all Global generation-owned
   IDs in carried Global graphs, and invalidates only old Global
   file/detail/comparison/editor state; Repository IDs and views survive unchanged. Successful
   publication clears its control diagnostic, unrelated outcomes preserve it, and disable
   removes every control diagnostic/context even when no Global Source was ever published.
   During initial and retry validation/admission, only `globalEnableInProgress` is newly
   visible: initial enable keeps `globalControl` null and retry keeps its exact
   pre-operation control projection. At result-bound queued acceptance, only accepted-batch
   tools appear in `pendingTools`, and `batchStatus` exposes the exact promoted request ID,
   tools, and active phase. Terminal deterministic and thrown/rejected failures use their
   exact closed `failureRef` variants; lost-acceptance recovery retains the status, while
   success,
   retry acceptance, and disable apply the contracted clear/replace lifecycle. An `unvalidated`
   active control is never retryable. During a
   mixed activation, already rejected/non-pending admitted tools may appear in
   `retryableTools`, but retry stays disabled and returns the `global-enable-in-progress`
   conflict rejection
   until `pendingTools` is empty; disable is available throughout.
   Injected unexpected admission rejections leave consent/control/Source state unchanged
   and surface only the invocation's ordinary error; every terminal outcome proves no
   stray operation history is retained.
   A fatal initial scan followed by a retry with a changed or now-unreadable retained root
   discards the old operation-local context and its unpublished IDs and leaves a rejected
   control with no authority before any later re-admission.
   An exact-active-consent retry derives the server's exact `retryableTools` subset; lexical
   `new-preview-required` controls and changed consent require disable/new preview first.
   Traversal fixtures prove that public patterns are derived from
   the typed plan, an exact Global target is read without enumerating the Global root, a
   fixed instruction-subtree walk enumerates only that subtree,
   and no neighboring setting, credential, state, or plugin path receives I/O.
9. The inspection module reads only allowlisted inspection paths on
   every supported OS. A symlinked customization file is read transparently and its linked
   content is displayed like any other file's; a link whose target is missing or unreadable
   yields the file-scoped `file-unreadable` Diagnostic in a `partial` generation. A
   directory-link cycle fixture proves that recursive traversal tracks visited directories
   by real path and terminates. Hard-linked entries are ordinary independent files with no
   grouping, alias, or read-once behavior. An unreadable file yields `file-unreadable` in a
   `partial` generation with every unaffected file complete; an unreadable root yields
   `root-unreadable` and a failed Source attempt with no generation.
   Instrumentation rejects every mutation-capable open flag and every write, append, create,
   truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
   equivalent call. Before/after fixtures prove unchanged content, length, identity/link
   state, mode, modification/change time, and extended attributes or ACLs where observable.
   OS-only access-time movement is recorded separately, is neither a failure nor proof, and
   no product call requests it. Operation lifecycle is managed without
   a product-defined concurrency ceiling.
10. The packaged CLI boots the devframe standalone adapter with authentication disabled:
    fixtures assert `auth: false`, the packaged `dist/public` UI directory, and the
    `agent-customization-inspector:` function namespace, and prove that `--no-open` opens
    no browser while inspection stays usable when automatic opening is disabled,
    unsupported, or fails (FR-001, FR-022). Package integrity, dependency-closure, and
    packed-file assertions are owned by package tests and release gates; the runtime
    performs no manifest or sibling-artifact re-verification (Constitution Principle I),
    and no packaging fixture classifies customization-file content.
11. Every automatic and explicit scan receives a unique opaque `scanRequestId`. Repository
    and Global rescan admission results, Source summaries, waiting/active/final progress,
    fatal status, and successful generation records preserve the same ID; stale or prior
    request state cannot satisfy the newer request. The SC-002 browser protocol starts a
    fresh process, waits for the automatic Repository scan to reach a terminal state outside
    timing, dispatches exactly one explicit Repository rescan, captures its admission ID,
    and stops the status and inventory timers only for visibly rendered state and the
    committed Repository generation associated with that same ID. Evidence records both
    the ID and Repository generation, and an already-rendered automatic inventory cannot
    qualify.
