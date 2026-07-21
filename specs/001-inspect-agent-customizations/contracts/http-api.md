# Contract: Local HTTP API

[日本語](http-api.ja.md)

**API version**: 1
**Base path**: `/api/v1`
**Transport**: JSON over loopback HTTP only

This API connects the static Nuxt SPA to the same-process Node inspection host. It is not
a public network API. It accepts opaque IDs and closed commands only; no endpoint accepts
a filesystem path, URL, command, source text, parser option, glob, or executable content.
FR-022 authorizes browser/host HTTP at the exact issued `127.0.0.1` authority in exactly
two closed internal-loopback classes: unauthenticated `GET`/`HEAD` for manifest-listed packaged
static assets and the closed SPA-shell/client-route fallback paths, which contain no session
data; and capability-authenticated bundled-SPA requests to the declared `/api/v1` routes under
the exact Host, method, and Origin rules below. Neither class is an outbound request or MCP
connection. Any non-loopback or remote authority, unlisted path, route, or method, API request
without the valid session capability, customization-selected destination, or transmission of
inspected content to another machine remains prohibited.

## Host and capability requirements

1. The process binds an ephemeral port on `127.0.0.1`. The initial release has no host
   override and does not bind `0.0.0.0`, a LAN address, or a Unix socket. Before binding it
   reads and strictly parses the packed `package.json`, verifies that
   `engines.node` is exactly `^24.11.0 || ^26.0.0`, that the running
   Node.js version is in its expanded compatibility range, the package version, the closed
   static/server manifests, and every asset they list, then initializes the centralized
   Node.js filesystem service used for every
   inspected-source operation. A missing, malformed, or inconsistent package asset or an
   unavailable filesystem service exits with a fixed actionable CLI error before any HTTP
   session starts. All authored application code and executable code in the project-package
   and production-dependency tarball payloads is JavaScript; generated HTML shell, CSS, JSON
   manifests, documentation, and license files are declarative, non-executable package
   artifacts. Any manifest-authorized bootstrap embedded in the HTML remains JavaScript
   executable code governed by the CSP requirements below. Package-manager-generated
   `node_modules/.bin` symlinks and `.cmd`/`.ps1` launch shims are outside those package
   payloads and are the sole limited interoperability exception: each must correspond to an
   exact declared `package.json.bin` entry whose target is audited Node JavaScript, forward
   argv only, accept no additional input, and contain no additional application logic. An
   undeclared, mismatched, or otherwise unexpected shim fails the install audit. The
   production-graph digest covers each package name, version, integrity, and package-payload
   digest, excludes generated shims, and is paired with a separate shim audit on every CI OS.
   No project/dependency package payload may contain a package-owned shell helper. The
   production closure otherwise contains no lifecycle build/download path, native addon or
   binary/Wasm artifact, platform-specific artifact selector, non-Node shebang, or executable
   non-JavaScript file. Development/test tooling is not shipped product application code.
2. At process start, the host creates a random 256-bit capability and constructs the exact
   `http://127.0.0.1:<port>/#cap=<43-character-base64url>` URL. It prints that URL once to the
   initiating terminal before any browser attempt. Unless `--no-open` is set, the
   project-owned TypeScript launcher revalidates the grammar and calls
   `node:child_process.spawn` with `shell: false`, ignored stdio, a fixed minimal environment,
   fixed argv, and `unref()`. On macOS and Linux the executable is exactly `/usr/bin/open` or
   `/usr/bin/xdg-open`, respectively, and argv is exactly the one generated URL. Windows and
   every other platform deliberately spawn no helper in this release because portable Node
   provides no independent trusted system-helper boundary; they emit the fixed manual-URL
   warning and keep the server running.
   The closed environment allowlist is macOS `HOME`, `TMPDIR`, `LANG`, and `LC_ALL`; or Linux
   `HOME`, `DISPLAY`, `WAYLAND_DISPLAY`, `XDG_CURRENT_DESKTOP`, `DESKTOP_SESSION`,
   `DBUS_SESSION_BUS_ADDRESS`, `XDG_RUNTIME_DIR`, `LANG`, and `LC_ALL`. An OS helper may itself read
   those ambient desktop/session values, but the Inspector does not select a handler from
   them. The allowlisted keys are copied directly as ambient platform provenance only; no
   Source/preview/candidate/file path is copied from inspection state, and lexical equality
   changes no provenance or authority. `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`, every other
   environment value, every inspection-derived value, and every environment-supplied or
   additional argv element are omitted. Missing or
   nonzero helpers, spawn errors, and unsupported platforms emit a fixed
   warning only; the server and printed fallback URL remain.
   The helper delegates to the operating system's default browser and neither selects nor
   verifies its version; successful spawn is not browser-compatibility evidence. Automated
   release certification uses the exact revisions pinned by Playwright 1.61.1, with
   `--no-open` and the printed URL as the manual certified-browser fallback.
3. The fragment never reaches the HTTP server. The SPA reads it once, removes it with
   `history.replaceState`, keeps it only in memory, and sends
   `Authorization: Bearer <capability>` on every `/api/v1` request.
   It never writes the capability to a cookie, query string, `localStorage`,
   `sessionStorage`, IndexedDB, service worker, or another durable/browser-managed store.
   A reload or direct navigation after fragment removal therefore has no authority: the
   SPA makes no API request and shows a safe authorization-lost view whose exact next step
   is to reopen the printed launch URL. That URL remains reusable only for the lifetime of
   the same process and returns the user to `/` with the fragment again.
4. Other than fixed help/version text, the required one-time initiating-terminal launch
   line, and fixed actionable startup warnings, which are presentation output rather than
   operational events, the host emits only the closed `OperationalEvent` schema from the
   data model: a stable event code plus optional opaque session, source, file, scan-request,
   and operation IDs. An operational event has no free-form field and never
   contains a Source-relative, absolute, or canonical path, root, filename, inspected
   content or metadata, authored value, capability, request/response body, parser/system
   error, exception string, or Diagnostic argument. A capability-authenticated file
   Diagnostic may contain its minimum necessary `sourceRelativePath`, but that value is never copied
   into an operational event. The host compares the capability in constant time and never
   logs the header, fragment, or token.
5. Every request must have the exact assigned `Host` value. State-changing requests must
   also have the exact same-origin `Origin`; API navigations and cross-site fetch metadata
   are rejected. CORS headers are never emitted.
6. Before bind, the host strictly loads the closed
   `dist/manifests/static-assets.json` and `dist/manifests/server-assets.json` described in
   the data model. The host verifies every listed regular asset's exact path, declared byte
   length, actual byte length, and lowercase SHA-256 before import or bind. File and manifest
   capacity is inherited from Node.js, the operating system, the filesystem, and the
   execution environment; the host defines no product-specific size or record-count ceiling.
   The build rejects
   relative/external executable assets, executable attributes, `<base>`, nonces, malformed
   or unrecorded inline scripts, symlinks, and unexpected output. It requires then removes
   Nuxt's `200.html`/`404.html` static-host aliases and permits HTML only at `index.html`.
   Static responses use a
   restrictive CSP: `default-src 'none'`; `script-src 'self'` plus only the manifest's
   exact `sha256-<base64>` values for Nuxt's executable inline bootstrap;
   `script-src-attr 'none'`; no `unsafe-inline`, `unsafe-eval`, or nonce for script;
   `style-src 'self' 'unsafe-inline'` only because Monaco generates layout/theme styles;
   `font-src 'self'`; `connect-src 'self'`; `worker-src 'self'`; `img-src 'self' data:`;
   `object-src 'none'`; `base-uri 'none'`; `form-action 'none'`; and
   `frame-ancestors 'none'`. Monaco workers are emitted root-absolute same-origin static
   assets, so no external or `blob:` worker source is permitted. API responses use
   `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`. Build verification,
   packed-tarball verification, and runtime bootstrap enforce the same package/static/server
   integrity contract.
7. JSON request bodies must use `application/json`, contain only the documented keys, and
   pass strict manual type/enum guards. Transport capacity is inherited from Node.js and the
   execution environment rather than a product-defined request-size ceiling.

Static assets and the packaged SPA shell may be fetched without the capability because
they contain no session data. The shell performs the authorization-lost behavior above;
it never embeds a token or session snapshot. Every API route, including progress,
diagnostics, and the Global-consent preview, requires the capability.

## Common envelopes

Successful responses:

```json
{
  "apiVersion": 1,
  "globalContentEpoch": 4,
  "generation": 3,
  "data": {}
}
```

Every normal inspection-data success envelope carries `globalContentEpoch` and
`generation`. For a full `InspectionSession`, `generation` equals
`data.activeGeneration`; for a
`FileDetail`, every returned generation-owned ID belongs to that exact value. The server
captures the epoch and generation, constructs the complete payload, and then revalidates
under the session coordinator lock that the epoch is unchanged and
`globalDisableInProgress` is still null before binding the immutable success body. A failed
revalidation discards that body and returns `409 global-disable-pending`. The server may
serialize and deliver an already-bound envelope after releasing the lock; it never reads one
generation, constructs data outside that generation, and later relabels the response. A
body fully bound before disable acceptance remains a bounded pre-fence-authorized response;
the browser rejects or purges it after observing the greater epoch or fence.

The normal envelope does not apply to the exact control-only
`GlobalFenceRecoverySnapshot` or the exact liveness body documented below; neither contains
a generation or inspection graph.

A preview or command success that returns no inspection graph uses
`{ apiVersion, globalContentEpoch, data }` and omits the envelope-level `generation`; any
generation carried inside its documented result is an explicit command outcome. This keeps
control responses epoch-aware without presenting them as generation snapshots.

The API defines no product-specific numeric limit for request bodies, files, item counts,
parser structures, snapshots, details, or response bodies. Capacity is inherited from
Node.js, the parser, the operating system, the filesystem, the browser, and the execution
environment. A serialization/encoding throw or rejection before atomic publication
propagates to the trigger-owning REST boundary, publishes no result or generation from the
attempt, retains the prior snapshot, and returns only the generic Operation Error defined
below. No domain layer classifies its cause. The host materializes one complete UTF-8
entity-body buffer for a successful envelope and passes that unchanged buffer to the HTTP
response. When `Content-Length` is emitted, it is the actual buffer length. If socket write or
other transport delivery fails after the atomic commit, the committed outcome and snapshot
remain unchanged; no successful response payload is reported, a truncated body is never a
partial result, and the authenticated client may refetch the committed generation.

Error responses:

```json
{
  "apiVersion": 1,
  "error": {
    "code": "stale-resource",
    "messageKey": "api.staleResource",
    "safeArgs": {},
    "nextStepKey": "api.refreshSession"
  }
}
```

No error contains a stack trace, arbitrary exception message, customization source or
declared-metadata value, API capability, referenced process-environment value, or canonical
path outside an enabled source. Literal credentials are returned only as part of an
explicitly requested readable file detail, never copied into an error or operational log. A
correlation ID may be returned and stored only in process memory. Error envelopes and
authenticated Diagnostics remain distinct from path-free operational events.

For a non-carveout thrown or rejected operation owned by a REST trigger, the `error` object is the closed `OperationError`
shape and has exactly an opaque `operationErrorId`, `code: "operation-failed"`, `messageKey: "api.operationFailed"`,
`nextStepKey: "api.retryOrRestart"`, an opaque `operationId`, and `scanRequestId`. The last
field is null before asynchronous job acceptance and no job/ID is created. For an accepted
scan job, the HTTP request has already returned `202`; the authenticated full session later
exposes the same closed terminal object with that job's non-null `scanRequestId`. The
two-stage Global-disable barrier is the sole exception: a post-acceptance failure returns
the error from that still-open disable POST with null `scanRequestId` and also retains it for
the fenced session. It is not a Diagnostic or scan result. Neither form has `safeArgs`, source/file/path/root identity, content,
exception class/message/stack/cause/code, parser/system error, or runtime arguments.
The pre-acceptance HTTP status is always `500`; its `operationErrorId` is response-only and
is not retained in the session, and no cause-specific status is inferred. A retained
accepted scan-job error is owned by exactly one `StaleSourceFailure` or
`globalControl.lastOperationErrorId`; an accepted Global-disable error has null
`scanRequestId` and is owned only by `globalDisableOperationErrorId`. A later terminal
outcome clears or supersedes the exact owner as defined by the data model. The REST response
survives as a generic failure and does not terminate the process. An automatic startup
throw/rejection has no REST owner or product `OperationError`, reaches the process top
level, and may terminate the process.

## Routes

### `GET /api/v1/session`

Returns the current session snapshot and scan progress. The client retrieves this endpoint
when source state changes; lifecycle-triggered session verification uses the separate
lightweight liveness route below, with no timer, watcher, SSE, or WebSocket.

Response data:

```text
InspectionSession
├── sessionId, apiVersion, createdAt, activeGeneration, snapshotState, globalContentEpoch,
│   staleFailures[] { sourceId, failureRef, failedAt, baseGeneration },
│   operationErrors[] { operationErrorId, code, messageKey, nextStepKey, operationId, scanRequestId },
│   globalEnableInProgress null | { kind, operationId, previewId },
│   globalDisableInProgress null | { operationId, state }, globalDisableOperationErrorId,
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[],
│                         batchStatus null | { scanRequestId, tools[], phase, failureRef },
│                         toolFailures[] { tool, diagnosticId }, lastOperationErrorId },
│   sensitiveContentWarning { messageKey, nextStepKey, acknowledgementScope },
│   sessionDiagnosticIds, repositoryFailureDiagnosticId
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── root { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      evidenceAssessments[] { subjectKind, subjectId,
│   │                                                documentationStatus, lifecycleQualifiers[] },
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, aliasSourceRelativePaths, readState, parseSummary, sizeBytes,
│       encoding, hadLeadingBom, recognition summaries { tool, kind, parseStatus, provenance count, diagnostic IDs }, diagnostic IDs
└── diagnostics[] { diagnosticId, code, severity, scope,
                    sourceId?, fileId?, sourceRelativePath?, messageKey, safeArgs, nextStepKey }
    (active-generation records plus session-owned lifecycle records)
```

This full DTO is returned only while `globalDisableInProgress` is null. After a non-no-op
disable barrier is accepted, this route instead returns only this exact control DTO:

```text
GlobalFenceRecoverySnapshot
├── sessionId, apiVersion, liveness, globalContentEpoch
├── globalControl, globalEnableInProgress, globalDisableInProgress (required and non-null)
├── toolFailureDiagnostics[]
├── lastGlobalOperationError
└── globalDisableOperationError
```

`toolFailureDiagnostics` contains exactly the pathless session Diagnostics referenced by
`globalControl.toolFailures`; each nullable error is exactly the record referenced by its
corresponding control/error ID. The DTO contains no generation, Source, Repository failure,
stale failure, unrelated Diagnostic/error, file, path, authored value, relationship, or
resource field. The fence remains in force when disable state is `failed`; only terminal
disable success or process restart permits a full DTO again. Every other inspection-data
route, including inventory/generation/Source/file/detail/Diagnostic/relationship/comparison
data, returns `409 global-disable-pending` throughout the fence.
For every fenced route, this check follows transport/capability/Host/Origin/body-shape
validation but precedes resource-ID existence, generation staleness, duplicate-work, and
other inspection-state checks; the fence conflict therefore wins without leaking retained
graph state.

Every Source has exactly one root. The Repository Source has `tool: null`; the session has
zero to three Global Sources, at most one each with `tool: codex`, `tool: claude`, or
`tool: copilot`. A Global root is never represented as a boundary inside another Source.
`root.displayRoot` is a one-way escaped root presentation label, not a
`SourceRelativePath`, inventory-item locator, caller input, operational-log field, or read
authority. The same distinction applies to a pre-admission consent-preview `displayRoot`,
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
Source. A deterministic returned failure references a Diagnostic; a thrown/rejected accepted
job references only its Operation Error. Entries and failure records for different Sources
coexist. A successful complete or contracted-partial scan clears only the entry and referenced
failure for the Source it refreshed; a commit for another Source preserves both, and Global disable clears both for
Sources it removes. `snapshotState` is stale exactly while the
array is non-empty. Automatic first Repository failure and initial Global-enable failure
create no `staleFailures` entry. A deterministic returned failure may use its closed
Diagnostic; a startup throw/rejection reaches the process top level and a REST-owned Global
failure uses only Operation Error. Initial Global-enable failure preserves all pre-existing
entries and the derived snapshot state.
Each `sourceRelativePath` and alias path is relative to its owning Source's single root; the
API never substitutes an absolute or canonical filesystem path for it.
Paths serialize as collision-free NFC values, while filesystem operations retain their
provenance-specific exact segments internally: `Dirent.name` for enumerated paths and the
immutable registry spelling for targeted fixed paths that forbid parent enumeration. A verified hard-linked file uses the unsigned UTF-8-bytewise
lowest admitted NFC value as primary and returns every remaining unique value as a sorted
alias. Filters and selection match both; a file Diagnostic always uses the primary. Distinct
raw paths with one NFC value produce only one pathless session-scoped collision Diagnostic,
no ambiguous file DTO, and no generation from that Source attempt.
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

The SPA owns a monotonically increasing `clientDataEpoch`, a `currentGeneration`, and an
opaque request token for every state-bearing request. A session response from a generation
older than `currentGeneration` is ignored. An equal-generation response is adopted only
when its token is still the latest poll token and its captured epoch equals
`clientDataEpoch`. When a valid response carries a newer generation, the SPA first
increments `clientDataEpoch`, aborts every older data request, disposes generation-owned
editors/models and comparison/detail state, clears the prior DTO graph, then sets
`currentGeneration` and adopts the complete new snapshot. A response captured under the
old epoch cannot repopulate state even if its bytes arrive later.
Every returned diagnostic is referenced by the active generation/source/file graph or by
`sessionDiagnosticIds`; client-caused request errors are never accumulated here.
Every returned retained Operation Error is referenced by exactly one
`StaleSourceFailure`, `globalControl.lastOperationErrorId`, or
`globalDisableOperationErrorId`; it never enters either Diagnostic list.
`scope` is an obligatory attachment discriminator, independent of diagnostic lifetime.
The only legal location shapes are: `file`, with `sourceId`, `fileId`, and that file's
Source-relative Path all present; `source`, with only `sourceId` present; and `session`,
with all three location fields absent. Source- and session-scoped records never invent a
file ID or path. Serialization rejects any other combination.
Progress is null for `idle` and `failed`; it is present for active work and
for final `ready`/`partial` counters as defined in the data model. The first legal snapshot
is bootstrap generation 0 with exactly one idle Repository Source selected lexically from
captured `process.cwd()` or the single `--cwd`, and no files/diagnostics. Its escaped root
label is non-authorizing until central admission; a startup throw/rejection may terminate
the process, so no later readable snapshot is promised.

`sensitiveContentWarning` supplies the fixed warning and next-step message keys that explain
that opening detail or comparison surfaces displays complete authored values, including
possible credentials. Protected values include complete source text, declared authored
metadata, authored relationship targets, and either comparison side.
`acknowledgementScope` is the fixed value `authorized-browser-session`.
Before requesting any `FileDetail` or constructing a comparison, the SPA
requires an in-memory acknowledgement for the current authorized browser session. The
acknowledgement is client-only, is not sent to this API, and is not persisted by either side.
The bearer capability is the complete host-side authorization boundary: the API neither
accepts nor claims to enforce a presentation acknowledgement. The shipped SPA nevertheless
must obtain that acknowledgement before it requests detail or constructs comparison. A
newly loaded browser document and the central full-session client-data purge reset it. Route
closure, selection replacement, file or Source removal, and generation replacement are
scoped cleanup rather than that central purge and may retain acknowledgement for the loaded
document. Global disable uses the central purge and therefore resets it. It grants no
filesystem authority and does not alter the returned content.

`globalControl` is null only when Global consent/control state is inactive. Otherwise
`state` is `active` or `disabling`, and `previewId` identifies the frozen active preview.
`confirmedTools` is always the fixed closed `[copilot, claude, codex]` all-tools consent set.
Initial enable and retry validation/admission remain operation-local: only the authority-free
`globalEnableInProgress { kind, operationId, previewId }` is visible. Initial enable keeps
`globalControl: null`; retry preserves its exact pre-operation control projection until one
buffer-bound disposition atomically commits. A duplicate enable while that projection is
non-null returns `409 global-enable-in-progress`; disable remains immediately available.

At a queued disposition, `pendingTools` is exactly the admitted non-empty batch subset and
`batchStatus` is exactly `{ scanRequestId, tools, phase, failureRef }` for that same subset.
`tools` is non-empty, unique, and in fixed tool order. Its active `phase` is
`waiting | enumerating | reading | deriving | recognizing`, with null
`failureRef`. Batch success atomically publishes every Source, clears both fields, and
advances one generation. Terminal deterministic failure leaves empty `pendingTools` and
`phase: failed` with `{ kind: 'tool-failures', failedTools }`, where `failedTools` is the
non-empty fixed-order set with batch-owned `toolFailures` rows and repeats no Diagnostic ID;
terminal non-carveout throw/rejection uses
`{ kind: 'operation-error', operationErrorId }`, exactly matching
`lastOperationErrorId`. A failed batch remains request-correlated until retry acceptance or
disable. An `active-no-job` disposition has null `batchStatus`, creates no job/generation,
and retains or replaces only deterministic rejected-tool controls.

While `state: active`, `retryableTools` is exactly each unpublished non-pending `admitted`
control and each `rejected` control whose `retryDisposition` is `same-preview`; lexical
`new-preview-required` controls are excluded. It stays at the pre-operation projection
during operation-local retry validation. Retry is offered only when
`globalEnableInProgress` is null, `pendingTools` is empty, and the matching frozen preview
has been retrieved and verified. During a non-failed active batch, retryable tools are
informational only and enable returns `409 global-enable-in-progress`.

From disable-barrier acceptance through terminal success, `state: disabling` has empty
pending/retry arrays and null `batchStatus`; `globalDisableInProgress` is non-null through
`draining`, `committing`, and retained `failed`. The control becomes null only at successful
`remove-active-state` completion. A `cleanup-only` barrier can have null `globalControl`.
`toolFailures` is the fixed-tool-order unique mapping for every non-null control
`diagnosticId`; each ID also occurs in `sessionDiagnosticIds` and resolves to a
session-owned deterministic Diagnostic. It contains no Operation Error and remains until
that control failure is cleared or disable commits removal.
`lastOperationErrorId` is null or references the one accepted admitted-subset Global batch
non-carveout throw/rejection for the whole active consent. A pre-acceptance retry failure preserves it;
deterministic `active-no-job` retry or replacement-batch acceptance clears it; a terminal
replacement failure supersedes it; and Global disable removes it. It never identifies one
tool and never creates a `StaleSourceFailure`.

Status: `200` with the full or fenced DTO; `401`/`403` for capability/origin failures.

### `GET /api/v1/session/liveness`

The success body is exactly
`{ sessionId, globalContentEpoch, globalDisableInProgress }`. At final publication the
handler obtains all three values from one current coordinator-lock snapshot; unlike an
inspection-data success, it does not require a null fence and returns the current non-null
projection so another tab can observe disable. The SPA calls this route only for initial
authorization, return to a visible/focused page, explicit Resume, or fresh session adoption,
with at most one request in flight. That single-flight rule serializes state adoption to
reject stale responses and is a functional coordination invariant, not a resource-admission
or validation ceiling. It defines no polling interval, request timeout, retry
timer, or memory lease; the browser/network/runtime owns request settlement. A matching
`sessionId`, equal epoch, and null disable projection establishes or confirms the current
baseline. An older epoch is rejected. Before baseline confirmation or rendering, a greater
epoch or non-null projection invokes the central full purge, adopts the new epoch, and enters
control-only recovery. This is how a lifecycle check observes another tab's disable.

A network/runtime rejection, `401`/`403`, mismatched session, or hidden/page lifecycle event
also purges before rendering the ended/recovery view. Process loss on a continuously visible
idle page has no product-defined wall-clock detection guarantee and is handled by the next
lifecycle check or authorized request outcome. The memory-only
capability survives the purge. Any recovery fetch adopts only the fresh `sessionId`,
`globalContentEpoch`, `globalControl`, `globalEnableInProgress`,
`globalDisableInProgress`, the exact tool-failure Diagnostics, the one Global Operation
Error referenced by `globalControl.lastOperationErrorId` when present, the disable error ID
and its referenced Operation Error when
present, and an optionally reverified frozen preview. It restores no inventory, generation,
Source, file, detail, relationship, comparison, editor, warning acknowledgement, or authored
source. A null disable projection permits **Resume inspection**, which refetches a matching
full session and atomically builds the default inventory view. A draining/committing fence
offers join/wait; a failed fence offers retry-disable. Global retry is rebuilt only after
the matching frozen preview is retrieved, `globalEnableInProgress` is null,
`pendingTools` is empty, and `retryableTools` is non-empty. Authentication failure leaves
the session-ended view in place. A liveness call never extends Node process lifetime,
returns no inspection graph, and is never stored or cached.

Status: `200`, or `401`/`403` for capability/origin failures.

### `GET /api/v1/files/{fileId}`

Returns one active-generation file detail:

```text
FileDetail
├── file summary fields including parseSummary
├── sourceText (null for non-readable read states)
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
every API envelope, CLI output, and documentation, the product is limited to syntax-only parsing, exact authored
literal extraction, mechanical typed decoding, frozen-catalog classification, and documented
structural scope/order/condition/selection/reference projection. It never interprets or
ranks natural-language meaning or intent; decides customization correctness, validity,
compliance, effectiveness, or quality; or provides policy/remediation advice, validation,
lint, synchronization, conversion, formatting, or fixing. Strict validation of
Inspector-owned manifests, DTOs, registries, capabilities, and internal invariants remains
permitted and is not customization validation. Deterministic availability Diagnostics carry
no content verdict. The event-confirmed-close observation retains only already-confirmed
successful close lifecycle and creates no error; non-carveout thrown/rejected operations use
only the outer-boundary Operation Error and never become Diagnostics.

The file encoding state is assigned only after a completed same-handle read passes every
post-read check. Any NUL byte yields `binary`, null `sourceText`, no comparison eligibility,
and an otherwise publishable contracted-partial generation. Every other byte sequence is
decoded exactly once as UTF-8 with replacement semantics. One leading BOM sets
`hadLeadingBom: true` and is removed. Valid text uses `utf-8` or `utf-8-bom`; any inserted
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
session summary apply identically to detail. Only an FR-028-eligible deterministic,
non-throwing parser/extraction outcome may produce this failed-recognition state in a
contracted-partial generation. A read/parser/Worker throw or rejection propagates without a
domain catch, classification, retry, item, Diagnostic, or generation result and is exposed,
when REST-owned, only through the generic Operation Error. Structural metadata comparison uses
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

The response uses inert JSON strings. The SPA must render `sourceText` and metadata through
Vue text bindings, not `v-html`, Markdown rendering, clickable links, URI handlers, or image
loads. The response is `no-store` and is never logged. The SPA requests it only after showing
and receiving the client-only sensitive-content acknowledgement described above.

A detail request token captures exactly `(clientDataEpoch, currentGeneration, fileId)`.
The SPA adopts the response only when all three captured values still equal the live epoch,
generation, and selected file; replacement of the request token invalidates that capture.
Any mismatch disposes the response without creating a model, DOM text, metadata row, or
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

Status: `200`; `404 stale-resource` when the file ID is unknown, belongs to a previous
generation or removed file, or belongs to a disabled source; `409 global-disable-pending`
while the disable fence is non-null.

### `POST /api/v1/repository/rescan`

Body:

```json
{}
```

Accepts one Repository scan command when that source has no running or queued command. The
host generates one opaque `scanRequestId` at admission and returns
`ScanAdmission { scanRequestId, source }`; both fields in the returned Source/progress and
all later queued, active, complete, partial, or failed status for this command carry that
same ID. A successful committed generation records it, while older status or inventory
cannot satisfy this request. If
the coordinator is idle, work starts immediately; if another transaction is active, the
command is queued FIFO and the Repository summary returns `status: scanning`,
`progress.phase: waiting`, a non-null `queuedAt`, and null `startedAt`. The job begins from
the active generation at dequeue time, not the generation observed by this request. The
current generation remains readable until a complete or contracted-partial replacement is
atomically published. Publication invalidates every old file ID and comparison selection.
If the explicit rescan fails before commit, every uncommitted result, including any
provisional partial result, is discarded. The last committed generation and IDs remain
readable, the snapshot is `stale-after-fatal-rescan`, and the Repository Source is `failed`.
A deterministic returned fatal outcome uses its closed actionable lifecycle Diagnostic. A
non-carveout throw/rejection propagates past every domain layer and the accepted-job boundary records only
the generic Operation Error carrying this same `scanRequestId`. In either case the
`staleFailures` entry references exactly that failure representation; later success clears
both, while another Source's commit preserves them.

After authorization and body-shape validation and after any non-null Global-disable fence
has selected `409 global-disable-pending`, a `poisoned` process-wide resource registry is the
next pre-schedule gate. It returns
`409 resource-cleanup-restart-required` without allocating a request ID or job, changing
state, or performing filesystem I/O.

Status: `202` with the request ID and updated source summary; `409 scan-in-progress` only
for a duplicate running/queued Repository command; `409 global-disable-pending` while the
disable fence is non-null; or `409 resource-cleanup-restart-required` while the registry is
poisoned and no disable fence already governs the response.

### `GET /api/v1/global/consent-preview`

Returns only the already-current process-memory preview. It never captures environment
values and never creates, replaces, or invalidates a preview. With active consent or a
registered initial enable it returns that exact frozen preview; while a disable fence is
non-null it returns the barrier's exact `frozenPreview` so the control-only recovery view can
display the consent being revoked. With neither a current unconsented preview nor a frozen
preview it returns `404 consent-preview-missing`.

### `POST /api/v1/global/consent-preview`

Body:

```json
{}
```

Captures and atomically creates or replaces an unconsented lexical, process-scoped preview
before any proposed Global path is touched. This state-changing request requires the exact
same-origin `Origin` in addition to the capability:

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

For every permitted POST capture attempt after coordinator conflicts are checked, the server reads `COPILOT_HOME`,
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
retention, presentation encoding, digest construction, or serialization reaches this pre-acceptance REST boundary and
returns the generic Operation Error with null `scanRequestId`, creates no authorization, and
performs no normalization, canonicalization, root creation, or read. Otherwise `displayRoot` shows the exact escaped lexical value; invalid empty
or relative overrides are shown as invalid instead of falling back. A successful POST
atomically replaces the prior unconsented preview only after its complete response buffer is
ready. Active consent returns `409 consent-preview-frozen`; a registered enable returns
`409 global-enable-in-progress`; and a disable fence returns
`409 global-disable-pending`, with no environment recapture or state change. The GET route
supplies the exact frozen preview for fresh-client recovery; a different preview requires
disable first. The canonical HMAC digest binds the session, `previewId`, version, ordered tool entries,
each exact raw `lexicalRoot` using a type-tagged length-prefix encoding, its
separately length-prefixed escaped `displayRoot`, origins, states, exclusions, and
the typed `TraversalPlan` version, closed selection policy, and canonical program. It never substitutes escaped
`displayRoot` for the raw digest input, so two raw values that render similarly cannot
collide through presentation escaping.

Every public `pathPatterns` entry is generated from the same shipped static typed
`TraversalPlan`; it is explanatory display, not a second matcher or authority source.
After consent and root admission, an exact-file operation does not `opendir` the Global
root: it applies `lstat` only to the exact root/ancestor/target chain and performs the common
canonical identity checks without enumerating a neighbor. A fixed-instruction-subtree
operation may `opendir` only the plan-named instruction subtree directories needed for its
plan-defined walk. No operation lists, stats, or reads a sibling setting, credential, state,
plugin, or other neighboring path.

The Codex plan alone uses `codex-global-first-non-empty`: it safely probes
`AGENTS.override.md`, short-circuits before any `AGENTS.md` operation when the override is
non-empty, and advances only from an absent or safely established empty override. A present
deterministically unsafe or binary candidate ends selection without fallback. An optional
leading UTF-8 BOM alone or whitespace-only content is empty under
`decodedText.trim().length === 0`; `utf-8-replaced` participates as ordinary text and every
`U+FFFD` is non-whitespace. At most one non-empty Codex instruction file is published.
`absent` means only Node's exact `ENOENT` returned by that contract-declared target `lstat`
after root verification. The same code after prior observation is `entry-disappeared`, not
fallback. The FR-041 event-confirmed-close observation retains only already-confirmed
successful close lifecycle and does not select fallback. Every non-carveout
throw/rejection—including from `open` or `read`—propagates to the owning REST boundary
without a domain catch or fallback.

GET status: `200`; `404 consent-preview-missing`; or `401`/`403` for capability/Host
failures. POST status: `201`; `409 consent-preview-frozen`,
`global-enable-in-progress`, `global-disable-pending`, or
`resource-cleanup-restart-required`; or `401`/`403` for capability/Host/Origin failures. A
capture/serialization throw or rejection returns the generic pre-acceptance Operation Error
with status `500`.

For POST, after authorization and body-shape validation plus the existing active-consent,
registered-enable, and non-null-disable-fence conflict checks, a `poisoned` process-wide
resource registry is the next pre-capture gate. It returns
`409 resource-cleanup-restart-required` without capturing environment values, creating or
replacing a preview, allocating a job or request ID, changing state, or performing
filesystem I/O. GET remains a read-only current-preview lookup and does not schedule work.

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-20",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

Response data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── scanRequestId: opaque ID | null
├── acceptedTools[] (zero to three tool enums)
└── rejectedTools[] (zero to three tool enums)
```

The UI may send this only after showing all three exact Global path sets, lexical input
states, and exclusions from that preview. The host rejects a false confirmation, stale
contract version, superseded preview, or non-constant-time digest mismatch. It uses only
the stored internal raw `lexicalRoot` and stored typed traversal program; it never rereads
environment input, reverse-converts `displayRoot`, or accepts `pathPatterns` as authority.
The body intentionally has no tool selector. Initial enable derives the exact fixed
`[copilot, claude, codex]` set from all three frozen preview entries, including entries that
are already lexically invalid. A retry derives the exact current server-side
`retryableTools` subset: unpublished non-pending admitted controls and same-preview rejected
controls only. Lexical `new-preview-required` controls require disable and a new preview.
The client cannot add, omit, remove, or reorder a tool.

After the confirmation fields are verified, the coordinator registers exactly one
`GlobalEnableOperation` and exposes only
`globalEnableInProgress { kind, operationId, previewId }` while one provisional transaction
evaluates the whole derived set. A duplicate enable returns
`409 global-enable-in-progress`; no tool outcome, root, context, Source, job, or authority is
published by that projection. Empty/relative/unrepresentable entries are deterministic
rejections with no filesystem call. For an eligible absolute root, only Node's exact
`ENOENT` from its contract-declared structural `lstat` becomes `absent`. Successful
link/type/canonical/identity checks may deterministically reject that tool without fallback.
The FR-041 event-confirmed-close observation retains only already-confirmed successful close
lifecycle. Every non-carveout throw or rejection—including permission failures and any
`open`/`read` rejection—propagates to the REST owner without domain classification. During initial enable
this occurs before job acceptance, returns the generic Operation Error with null
`scanRequestId`, activates no consent/control/job, and commits none of a provisional subset.
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
`phase: waiting`, and null `failureRef`; fresh polling can therefore recover a lost `202`.
Separate tool roots remain separate Source
identities, but all ready/partial Sources in the admitted subset appear together in exactly
one N+1 generation; no poll can observe a per-tool commit. That one commit preserves stable
IDs and semantic content for carried Sources, rekeys all generation-owned IDs, invalidates
old detail/comparison/editor state, and clears the applicable deterministic tool failures.

The operation checks its ID/epoch and non-aborted signal before and after each asynchronous
step, plus the same operation-local provisional state for initial enable or the same active
control snapshot for retry. Immediately before the one batch enqueue, the coordinator
atomically activates initial consent/controls or applies the retry partition and verifies
that resulting active control state. A disable-first race
drains and returns `409 global-disable-pending` with no late mutation; an operation-first
`202` remains its accepted disposition even if a later barrier cancels the batch. A
non-carveout throw/rejection after `202` is the terminal generic Operation Error for the same non-null
`scanRequestId`, commits no subset Source/generation, and preserves the prior snapshot. It
creates no Diagnostic or `StaleSourceFailure` for an initial/retry admitted-subset Global batch;
instead one operation-wide error is retained and referenced by
`globalControl.lastOperationErrorId`. A later retry and disable apply the exact clear/
supersede lifecycle defined on the session projection.

The exact same consent may be retried only while the server-derived `retryableTools`
projection is nonempty. That exact eligible subset, not mere Source absence, is derived by the
server and cannot be narrowed by the client. A different preview/root or lexical
`new-preview-required` control requires Global disable first. An empty projection returns
`409 no-retryable-global-tool`; the presence of a non-retryable missing tool creates no
separate active-consent conflict. Even an all-lexically-invalid preview may be
confirmed and returns the deterministic `active-no-job` state, so there is no separate
`no-eligible-global-root` response.

Status: `202`; `400 consent-required`, `allowlist-version-mismatch`, or
`consent-preview-mismatch`; `409 no-retryable-global-tool`,
`global-enable-in-progress`, `global-disable-pending`, or
`resource-cleanup-restart-required`; or the generic pre-acceptance Operation Error. After
authorization and body-shape validation and after any non-null disable fence has selected
`global-disable-pending`, a `poisoned` process-wide resource registry is the next
pre-schedule gate: it returns the restart-required conflict
without evaluating or changing consent/control state, allocating a request ID or job,
admitting a root, or performing filesystem I/O.

### `POST /api/v1/global/rescan`

Body:

```json
{
  "sourceId": "opaque-enabled-global-source-id"
}
```

Accepts one scan command for the identified enabled tool-specific Global Source only while
Global disable is not pending. `sourceId` is an opaque ID and never a path. The command uses
the same FIFO, dequeue-time base-generation, atomic publication, progress, invalidation, and
serialization rules as Repository rescan. At most one scan command is running or queued
for that Source; a duplicate cannot silently coalesce or trigger a second read. Admission
returns `ScanAdmission { scanRequestId, source }`; the opaque request ID is identical in the
returned Source/progress, every later status for the command, and any generation it commits.

A failed Global rescan commits nothing and publishes zero partial results from the failed
attempt. It reports top-level `snapshotState: stale-after-fatal-rescan`, Source
`status: failed`, and null `progress`, while
retaining `enabled: true`, the exact consent and validated single-root record, the last
committed graph, and all IDs from that graph. Its one actionable Diagnostic or Operation
Error identifies only the allowed lifecycle context and explains that the retained snapshot is stale.
This creates or replaces only that Source's `staleFailures` entry. A deterministic returned
failure references its lifecycle Diagnostic; a non-carveout throw/rejection propagates past the domain
and references only the generic accepted-job Operation Error for this `scanRequestId`. A
later successful or contracted-partial rescan of the same Source replaces its graph atomically
and clears both; another Source's commit preserves both.

Status: `202` with the request ID and updated source summary; `404 stale-resource` for an unknown or removed
Source ID; `409 global-disable-pending` if Global disable is pending/active;
`409 resource-cleanup-restart-required` if the registry is poisoned and no disable fence
already governs the response; or `409 scan-in-progress` for a duplicate running/queued scan
for that Source. After authorization and body-shape validation and the non-null-disable-fence
check, the poisoned-registry gate runs before scheduling and allocates no request ID or job,
changes no state, and performs no filesystem I/O.

### `POST /api/v1/global/disable`

Body:

```json
{}
```

Response data:

```text
GlobalDisableResult
├── state: disabled | no-op
├── operationId: opaque ID | null
├── commitKind: cleanup-only | remove-active-state | null
└── generation
```

This is the priority security barrier for all inspection data, not merely a Global Source
deletion command. Before sending it, the SPA performs the central full purge. A true no-op
is possible only when no active/queued Global authority, retained disable failure, or
affected closable-resource record exists and the resource registry is not poisoned. It uses
the ordinary pre-acceptance response-buffer gate, returns null operation/commit kind with
the unchanged generation, does not increment `globalContentEpoch`, and does not disturb
Repository work. If validation or response construction fails before barrier acceptance,
the request returns the response-only generic Operation Error and mutates nothing; because
the fresh session has a null fence, the already-purged client may immediately recover a full
snapshot. The deterministic pre-acceptance restart-required conflict has the same
mutationless, null-fence recovery behavior.

Every non-no-op first acceptance atomically allocates the barrier operation, increments the
command epoch and `globalContentEpoch`, irreversibly revokes publication authority, exposes
non-null `globalDisableInProgress`, changes an existing `globalControl` to `disabling`, and
clears its `pendingTools`, `retryableTools`, and `batchStatus`. It aborts the registered
`globalEnableInProgress` operation and Global scans, prevents any queued Global command from
dequeueing, and fences every generation-mutating command. Repository rescan requests then
return `409 global-disable-pending`; already-running Repository work is revoked and held for
one requeue only after terminal disable success. Global enable/rescan also returns that
conflict. The session route returns only `GlobalFenceRecoverySnapshot`; every other
inspection-data route returns the same conflict. Liveness continues to report the greater
epoch and non-null projection.
An existing poisoned registry never blocks this revocation when active/queued Global state
exists: the barrier accepts first, adopts every affected record, and reports any unresolved
cleanup only through its retained generic error and fence.

The first acceptance fixes `commitKind`. `remove-active-state` is selected exactly when
public Global consent/control/Source state exists. `cleanup-only` is selected only when the
barrier must cancel and drain an operation-local initial enable that published no such
state. The barrier drains every revoked continuation, performs the final queued-Global-work
cancellation sweep, and closes or joins every inspection `FileHandle` and `fs.Dir` through
the process-wide `ClosableResourceRegistry`. It never requeues interrupted Global work.
Expected cancellation creates no Diagnostic or Operation Error.

A request received while the barrier is `draining` or `committing` joins the same
`operationId` and terminal result; disconnecting any transport does not cancel it. An
unexpected non-carveout post-acceptance throw/rejection, including drain, close/unregister, final
assembly, or success serialization failure, returns the generic Operation Error with null
`scanRequestId`. That exact retained error is owned only by
`globalDisableOperationErrorId`; `globalDisableInProgress.state` becomes `failed`, the
process remains alive, the prior generation stays internal, and every inspection-data fence
remains closed. No failed cleanup re-exposes content.

A later disable POST in `failed` state starts or resumes idempotent cleanup with a new
operation that inherits the exact `commitKind`, base generation, frozen preview, cleanup
ledger, resource records, close promises, observers, and already incremented
`globalContentEpoch`; retry does not increment the content epoch again. It never guesses an uncertain
close outcome or double-closes a resource. Another failure supersedes the sole retained
disable error; terminal success alone clears it and removes the fence. An indefinitely
unknown close requires process restart, but the REST-triggered failure itself never exits
the process.

Terminal success is buffer-bound and atomic. For `remove-active-state`, it removes all
Global Sources, consent, controls, roots, preview, stale failures, tool Diagnostics, and
owned Operation Errors; commits a fully rekeyed Repository-only generation N+1; clears the
fence; and returns that new generation. The held Repository command is then requeued once
from N+1 and may later commit N+2. For `cleanup-only`, it removes only the unpublished
operation-local state, clears the fence, and re-exposes the unchanged generation N with all
generation-owned IDs unchanged. Concurrent joiners receive that same terminal result.

Status: `200` on no-op, joined success, retry success, or first-attempt success;
`409 resource-cleanup-restart-required` only when no Global state/barrier exists but an unrelated
poisoned resource registry forbids a no-op; or the generic post-acceptance Operation Error
with status `500`. Disable itself never returns `global-disable-pending`.

## Method and media handling

- Unknown `/api/v1` paths return `404`; known paths with a wrong method return `405` with
  an explicit `Allow` header.
- Unsupported media types return `415`; malformed JSON or unexpected keys return `400`.
  A Node.js transport/parser throw or rejection returns the closed pre-acceptance Operation
  Error without a partial body; the API defines no product-specific request-size ceiling.
- There is no masking, redaction, reveal, or environment-resolution API. In particular,
  `POST /api/v1/files/{fileId}/reveals` is an unknown path and returns `404`.
- API responses are always UTF-8 JSON. Static files use a fixed extension-to-MIME table;
  there is no user-controlled content type or path traversal.
- Static file resolution uses the validated build-generated manifest of exact Nuxt output
  paths under packaged `dist/public`. Nuxt uses `app.baseURL: '/'`,
  `app.buildAssetsDir: '/_nuxt/'`, and no CDN URL, so the HTML shell contains only
  root-absolute same-origin asset references and works unchanged on every nested route.
  For `GET` and `HEAD` only, `/`, `/compare`, `/global-consent`, and
  `/files/<22-character-base64url-fileId>` may fall back to packaged `index.html`; this is
  an explicit client-route allowlist, not a general history fallback. The host rejects an
  unknown route, trailing-path variant, encoded separator, encoded or literal dot segment,
  NUL, malformed percent escape, query-controlled asset path, and every non-manifest asset.
  It never falls back to an inspected file. A capability-less reload of an allowlisted
  route receives only the inert SPA shell and authorization-lost view. `/200.html`,
  `/404.html`, and every other HTML alias are absent from the manifest and return `404`.

## Concurrency and lifecycle

- One coordinator serializes scan transactions as a correctness invariant. It accepts one
  running or queued scan command per Source; duplicate scans conflict, while a scan for
  another Repository or tool-specific Global Source queues FIFO and reports the waiting
  phase. The only caught or observed filesystem-rejection cases are the exact `ENOENT`
  conversion from a declared structural `lstat` and the FR-041 event-confirmed-close
  observation; every non-carveout admission throw/rejection propagates to the owning
  boundary without domain state mutation. Disable follows its priority barrier join/no-op rules. Every
  automatic or explicit scan receives one opaque `scanRequestId` and starts from the
  generation current when it actually dequeues.
- Every scan and `GlobalEnableOperation` receives an `AbortSignal`. Process shutdown aborts
  all work. Global disable is the priority barrier documented above: it aborts any active
  uncommitted transaction, aborts/drains enable validation, performs a final queued-Global-
  work cancellation sweep, completes its fixed cleanup-only or remove-active-state
  disposition next, and requeues an interrupted Repository command once only after terminal
  success. Operation completion is governed by Node.js and the execution environment.
  Disable, shutdown, supersession, or a propagated fatal operation failure irreversibly
  revokes publication authority. An FR-028-eligible deterministic entry-local outcome does not by itself revoke
  the attempt's publication authority. A revoked pending Node.js filesystem promise is
  retained only for resource cleanup: every late byte,
  graph record, Diagnostic, DTO, and operational-event result is discarded. Physical
  cancellation of an uncancellable kernel operation is not guaranteed.
- A successful or contracted-partial scan commits exactly N+1 and regenerates generation-
  owned graph IDs for the scanned Source and all carried Sources; process-lifetime-stable
  Source IDs remain unchanged. It clears only the scanned Source's stale-failure
  entry and referenced failure and carries both for other Sources. A fatal explicit rescan discards every uncommitted
  result, including partial results, leaves N and its IDs active, marks the retained
  session snapshot stale, and creates or replaces one actionable out-of-generation
  lifecycle Diagnostic or Operation Error and entry for the affected Source, replacing both for that Source
  on repeated failure. N may be legal bootstrap
  generation 0. Barrier cancellation emits none.
- Session retrieval and lifecycle-triggered liveness checks never extend the Node process
  lifetime or persist data and define no product-specific time threshold. An exact matching
  session/equal-epoch response with a null disable projection confirms the current baseline.
  A greater epoch or non-null projection runs the central purge before entering control-only
  recovery; network/runtime failure, authorization/session mismatch, or hidden/page lifecycle
  events purge before an ended view.
  The purge increments a
  client epoch so a late in-flight response cannot repopulate DTOs or editor state, disposes
  Monaco models/editors/workers and subscriptions, clears DOM/store content and warning
  acknowledgement, and aborts pending requests. Closing the Node process destroys the
  server-side capability, complete source content, source roots, generations, and diagnostics.
- No API call starts an MCP server, follows an import, opens an inspected URL, invokes a
  customization command, or writes to an inspected source.
- Enabled inspection sources are enumerated/read only through one centralized service built
  on `node:fs/promises`. It accepts validated source IDs and source-relative enumeration
  records, never an arbitrary absolute path supplied by an API request, relationship, or
  source file. Its process-wide `ClosableResourceRegistry` solely owns the open/close state
  of every inspection `FileHandle` and `fs.Dir`; the service centrally owns each operation
  lifecycle and relies on
  Node.js, the operating system, and the execution environment for available capacity. Every open uses only
  read-only, non-create, non-truncate flags. The service never calls a write, append, create,
  truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
  equivalent mutation-capable primitive on an inspected source. Every candidate verification phase—enumeration, immediately before open,
  after open but before reading any bytes, and after the complete same-handle read—uses this exact order:
  (1) `lstat` the candidate path and reject a symbolic link, non-regular type, or unexpected
  identity; (2) only after that succeeds, resolve the candidate `realpath` and verify
  canonical containment with `node:path.relative`; and (3) `lstat` the candidate path again
  and require its identity, type, size, and relevant timestamps to match the first `lstat`.
  A stable symlink is therefore rejected before candidate `realpath` can follow it. At
  enumeration and immediately before open, the service also verifies lexical containment,
  the root identity, and every ancestor `lstat`. It opens with `O_NOFOLLOW` whenever
  `node:fs.constants.O_NOFOLLOW` exists and is effective on that Node.js/platform
  combination. After open, it runs the ordered candidate sequence before reading and
  compares pre-read `FileHandle.stat()` with both `lstat` results and the earlier snapshots.
  After the read and before parse, publish, or commit, it repeats the root and
  ancestor checks, the ordered candidate sequence, and `stat()` on the same open handle. A
  detected ambiguity, containment failure, or metadata change returned as data discards the
  entire byte buffer and fails closed. Unusable successfully returned metadata or
  canonicalization emits `safe-fs-boundary-unverifiable` and rejects the candidate, or its
  source when the root or a shared ancestor is unverifiable. Exact `ENOENT` from a
  contract-declared structural `lstat` is caught only as `absent`/`entry-disappeared`; the
  FR-041 event-confirmed-close observation retains only already-confirmed successful close
  lifecycle; every non-carveout throw/rejection propagates unchanged and produces no
  candidate Diagnostic. Only a
  deterministic candidate-local returned outcome may retain a diagnostic-only record, and
  only after complete traversal and registry-confirmed closure of every acquired resource.
  A root/shared-ancestor or directory-enumeration guard outcome, or any unconfirmed
  FileHandle or `fs.Dir` close, aborts the affected Source attempt and produces no candidate
  record, contracted-partial generation, or success receipt.
- Mutation verification instruments the product's filesystem calls and compares fixture
  content, length, identity/link state, mode, modification/change time, and extended
  attributes or ACLs where observable before and after inspection. Access-time movement
  caused only by an OS read is recorded separately; it neither fails the no-product-mutation
  claim nor counts as proof of it, and the product never requests an access-time update.
  A read throw/rejection propagates without domain classification, discards the incomplete
  attempt, commits no item/result/generation, and, when REST-owned, yields only the generic
  Operation Error. It is never labelled valid, invalid, correct, incorrect, or lint-failing.
- Public Node.js APIs do not provide a portable directory-handle-relative open. An active
  adversarial process that replaces the source root or an ancestor between checks is outside
  the initial-release threat model on every platform. Final-component replacement is outside
  only where effective `O_NOFOLLOW` is absent. Ordinary concurrent edits and all detectable
  races remain in scope and
  discard every byte. Same-device bind mounts, unreported reparse behavior, and other OS
  semantics unavailable through Node.js remain documented platform limitations, not
  absolute containment guarantees.

## Required contract tests

1. Every API route rejects missing, wrong, expired-process, cross-origin, wrong-Host, and
   navigation requests without returning session data. Operational-event schema tests
   reject every extra or free-form field and prove that Source-relative/absolute/canonical
   paths, roots, filenames, content, metadata, authored values, capabilities, bodies, raw
   parser/system errors, exception strings, and Diagnostic arguments never enter captured
   operational output. Fixed presentation-output tests admit only help/version, the one
   launch-URL line, and fixed startup warnings and include no inspected path or value.
2. Old file IDs fail after a successful Repository/Global rescan and a
   `remove-active-state` Global disable; `cleanup-only` instead preserves N and every
   generation-owned ID. A fatal
   explicit rescan publishes zero failed-attempt partials, retains the last committed IDs,
   marks the retained session snapshot stale, and references exactly one actionable
   Diagnostic for a deterministic returned failure or Operation Error for a throw/rejection.
   Bootstrap generation 0 contains exactly one non-authorizing Repository Source selected
   from captured `process.cwd()`/`--cwd`. Multi-Source sequences prove that A and B entry-failure pairs
   coexist, B's success does not clear A, A's contracted-partial success clears only A's pair,
   a repeated A failure replaces only A's pair, and Global disable clears only pairs for
   removed Global Sources. Diagnostic DTO fixtures accept exactly the three scoped shapes:
   file with matching `sourceId`/`fileId`/`sourceRelativePath`, source with only `sourceId`,
   and session with no location field. Every missing, extra, mismatched, or fabricated
   source/file/path combination is rejected before serialization.
   Operation Error fixtures require the exact closed fields, null `scanRequestId` before
   acceptance, the admitted ID for a scan job, and null for an accepted disable barrier.
   Each retained fixture has exactly one legal lifecycle owner and rejects every
   Diagnostic/path/content/raw-error field. REST-triggered rejections return the generic
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
   Encoding fixtures prove NUL is binary/diagnostic-only/contracted-partial, valid text is
   `utf-8` or `utf-8-bom`, and invalid non-NUL input is readable `utf-8-replaced` with every
   `U+FFFD` preserved through parsing, detail, and comparison without making the generation
   partial by itself. No alternate decoder is invoked.
   A fixed Codex default-hook fixture instead returns `targetOrigin: documented-default`,
   null `authoredTarget`, and an explicit documented-default label; an explicit manifest
   hook returns `targetOrigin: authored` with its exact occurrence. Sentinel process values
   prove that environment references are never resolved or substituted. The SPA shows
   and receives the in-memory sensitive-content acknowledgement before requesting any
   `FileDetail` or constructing comparison, and tests assert that no protected authored-value
   request or derived DOM/editor state exists earlier, while the removed reveal route returns `404`. Direct authorized
   API tests prove that no acknowledgement field or endpoint exists and that the capability,
   not a claimed server-side presentation gate, is the host authorization boundary.
   Cross-surface negative fixtures prove that Inventory, Detail, Comparison, Global
   controls, Diagnostics, Source Condition Facts, API DTOs, CLI output, and documentation expose only
   the documented structural projections: no natural-language meaning/intent
   interpretation or ranking, correctness/validity/compliance/effectiveness/quality verdict,
   policy/remediation advice, validation, lint, synchronization, conversion, formatting, or
   fixing field or behavior is admitted.
4. Extra JSON keys, path-shaped inputs, malformed bodies, wrong methods, and wrong media
   types produce the documented safe errors. Contract tests prove that no request, file,
   collection, parser, snapshot, detail, or response DTO exposes or enforces a product-
   defined numeric capacity ceiling. Injected non-carveout Node.js, parser, filesystem, and serialization
   throws/rejections bypass domain classification and return only the generic Operation
   Error at the owning REST boundary, never a Diagnostic, partial JSON body, incomplete
   generation, or validity/correctness/compliance/lint verdict. Escaping and key-order fixtures prove that the one complete
   serialized buffer is the HTTP entity body and matches `Content-Length` when present.
5. Static traversal and encoded traversal attempts never escape `dist/public`; the packed
   root, `/compare`, `/global-consent`, and `/files/<fileId>` routes all boot with the same
   root-absolute assets and a CSP whose exact hashes authorize the Nuxt bootstrap but no
   modified/unrecorded inline script or executable attribute.
6. Queue ordering across Repository and each tool-specific Global rescan, duplicate
   rejection, aborts, contracted-partial outcomes, fatal failures, and polling expose only
   whole generations. A scan queued behind another Source starts from the then-current
   generation. A `remove-active-state` barrier produces N/N+1/N+2, a `cleanup-only` barrier
   re-exposes unchanged N before the held Repository command may commit N+1, and a true no-op
   leaves N and Repository work untouched. No barrier exposes an aborted transaction, and
   the one accepted Repository command is requeued once only after terminal success.
   Concurrent disable during `draining`/`committing` joins one operation/result; a later
   request after `failed` retries the inherited cleanup ledger. A paused validation/admission operation is
   aborted and drained before the final cancellation sweep; releasing its late continuation
   afterward creates no mutation, diagnostic, context, ID, or job. Injected non-carveout
   admission rejections propagate to their outer boundary, leave domain state unchanged,
   and do not depend on a product-defined slot count. Deterministic barrier-race fixtures pause the operation (a) while
   validation is awaited, (b) after admission but before any control/context/diagnostic
   mutation, and (c) immediately before job enqueue/final response disposition. At every
   pause, a barrier-first ordering returns `409`, permits no late side effect, unregisters
   the operation, and allows a later enable; an operation-first final disposition remains
   the committed `202` even when response bytes are delivered after disable acceptance.
   Fence fixtures prove first non-no-op acceptance increments `globalContentEpoch` and
   immediately makes the session route control-only while every other inspection-data route
   returns `409 global-disable-pending`, including throughout retained `failed`. They inject
   the event-confirmed-close later-promise rejection and prove successful lifecycle with no
   poison, propagation, or Operation Error; they separately inject non-carveout close/unregister
   and final-serialization rejection, verify the sole null-scan-ID disable Operation Error
   owner, process survival, no content re-exposure, and idempotent retry.
   Separate deterministic delivery pauses hold a data response before or across scan commit
   and disable acceptance. They prove that envelope epoch/generation and payload never mix,
   a body not yet bound when the fence linearizes becomes `409`, and a body already bound is
   treated only as the documented bounded pre-fence response and is purged when the client
   observes the greater epoch/fence. Older responses are ignored, adopting a newer snapshot
   increments `clientDataEpoch` and aborts/disposes old state, and detail is adopted only when
   its captured epoch/generation/fileId all still match. Disable,
   shutdown, supersession, and injected read/parser/Worker/assembly/serialization rejection
   tests leave a filesystem
   promise pending, revoke publication authority, and prove that every late result is
   discarded and that the correct outer boundary alone exposes Operation Error or startup
   top-level propagation. A separate FR-028-eligible deterministic entry-local case proves contracted-partial
   publication without revoking the whole attempt, after complete traversal and confirmed
   closure of every acquired resource. Root/shared-ancestor and directory-enumeration guard
   outcomes plus unconfirmed FileHandle/`fs.Dir` closes instead prove Source-attempt abort
   with no candidate record, partial generation, or success receipt. Tests do not assert hard cancellation of the underlying Node.js/kernel
   operation or a product-defined completion deadline. Close-state fixtures prove concurrent
   join/retry shares the exact `FileHandle`/`fs.Dir` registry record and promise, never
   double-closes, and leaves an unknown outcome fenced with the restart next step.
7. Reloading every allowlisted client route after fragment removal makes no API call,
   returns no session data, and directs the user to the still-running process's printed
   launch URL; unknown routes and malformed asset paths never receive the SPA fallback.
   Liveness tests require the exact `{ sessionId, globalContentEpoch,
   globalDisableInProgress }` body and cover lifecycle-triggered checks, browser/network/runtime
   rejection, authorization failure, hidden/page lifecycle purge, port reuse with a different
   `sessionId`, older/equal/greater epochs, null/draining/committing/failed projections, and a late in-flight
   response after the client epoch changed; none may leave or automatically restore pre-purge inventory,
   detail, comparison, editor, or authored-content DTO/DOM state or the warning
   acknowledgement. With active consent, hidden-to-visible recovery authenticates with only
   the retained capability, adopts the returned `sessionId` without retaining/comparing the
   purged ID, and constructs only the closed recovery projections. Disable is available from
   active control/enable state immediately; draining/committing joins or waits, failed offers
   retry-disable, and retrieving/verifying the same frozen preview rebuilds only eligible
   retry controls. The explicit Resume inspection action is absent while the fence is
   non-null. With a null fence it re-fetches a matching full session and constructs a fresh
   inventory summary with default state, but restores no
   pre-purge authored content, selection, filter, detail, comparison, editor, or
   acknowledgement. A later detail/comparison request requires a new acknowledgement.
   Pre-acceptance disable failure and true no-op both leave a null fresh-session fence so a
   purged client can resume immediately.
8. A Global consent preview touches no proposed path, confirmation is bound to the exact
   raw internal `lexicalRoot`, typed traversal-plan version/program, and preview digest, and
   a changed/superseded preview or canonical alias mismatch cannot authorize a read.
   Only same-origin POST captures all three environment inputs and atomically creates or
   replaces an unconsented preview; GET performs zero capture and returns only the current or
   frozen preview, including through the disable fence. Missing-current, active-consent,
   in-progress-enable, and disable-fence cases return their documented closed outcomes with
   no accidental replacement.
   Escape-collision, control-character, and backslash fixtures prove the digest length-prefixes the
   raw value and that enable uses only the stored raw value, never an environment reread or
   `displayRoot` reverse conversion. The body has no tool selector and initial enable always
   evaluates all three frozen entries. Exact structural-`lstat` `ENOENT` and deterministic
   lexical/link/type/boundary outcomes partition rejected tools; the event-confirmed-close
   observation retains only already-confirmed successful close lifecycle; every
   non-carveout throw/rejection
   returns the generic pre-acceptance Operation Error, activates no initial control/job, and
   commits none of a provisional subset. Provisional enable work publishes no Source. One
   successful complete or contracted-partial batch commit produces one to three separately
   identified Global Sources together in exactly one generation, at most one per tool and
   exactly one root per Source; no cross-tool merge or observable per-tool commit occurs. An
   accepted batch non-carveout throw/rejection produces the terminal Operation Error for its one
   `scanRequestId`, no Source/generation, and no Diagnostic. Both prior-current and
   prior-stale cases are tested. Initial activation with every root deterministically
   rejected, including an all-lexically-invalid preview, yields `202 active-no-job`, zero
   jobs/Sources, and an active `globalControl`. Its `retryableTools` contains exactly the
   same-preview subset; an all-lexically-invalid preview has none and requires disable/new
   preview. An all-rejected retry likewise creates zero new jobs/Sources while
   preserving existing Source semantic content and stable `sourceId` values without a
   generation commit. Partial acceptance partitions every evaluated tool. Every successful
   initial or retry batch publication advances the generation exactly once, rekeys all generation-owned IDs
   in carried graphs, and invalidates old file/detail/comparison/editor state. Successful
   publication clears its control diagnostic, unrelated outcomes preserve it, and disable
   removes every control diagnostic/context even when no Global Source was ever published.
   During initial and retry validation/admission, only `globalEnableInProgress` is newly
   visible: initial enable keeps `globalControl` null and retry keeps its exact
   pre-operation control projection. At buffer-bound queued acceptance, only accepted-batch
   tools appear in `pendingTools`, and `batchStatus` exposes the exact promoted request ID,
   tools, and active phase. Terminal deterministic and thrown/rejected failures use their
   exact closed `failureRef` variants; lost-202 recovery retains the status, while success,
   retry acceptance, and disable apply the contracted clear/replace lifecycle. An `unvalidated`
   active control is never retryable. During a
   mixed activation, already rejected/non-pending admitted tools may appear in
   `retryableTools`, but retry stays disabled and returns `409 global-enable-in-progress`
   until `pendingTools` is empty; disable is available throughout.
   Injected non-carveout admission rejections leave consent/control/Source state unchanged,
   expose only Operation Error, and every terminal outcome proves there is no operation-history leak.
   A fatal initial scan followed by a retry with a changed or unverifiable retained root
   closes/unregisters the old context, discards its unpublished IDs, and leaves a rejected
   control with no authority before any later re-admission.
   An exact-active-consent retry derives the server's exact `retryableTools` subset; lexical
   `new-preview-required` controls and changed consent require disable/new preview first.
   Traversal call traces prove that public patterns are derived from
   the typed plan, an exact Global target never opens the root directory and touches only its
   exact ancestor/target chain, a fixed instruction-subtree walk opens only that subtree,
   and no neighboring setting, credential, state, or plugin path receives I/O.
9. The centralized Node.js filesystem service rejects lexical and canonical escapes,
   symbolic-link path segments, non-regular candidates, and every detectable mismatch in
   the required enumeration/pre-open/post-open-pre-read/post-read snapshots on every
   supported OS. A call trace for each phase proves the exact candidate-path `lstat`, then
   candidate `realpath` plus `path.relative` containment, then second candidate-path `lstat`
   order and matching identity in the `lstat` results immediately before and after
   `realpath`. A stable-symlink fixture proves that the first `lstat` rejects it without
   calling candidate `realpath`. The service uses
   effective `O_NOFOLLOW` when available. Root, parent, and final-entry replacement fixtures
   prove that every ordinary concurrent or otherwise detectable change publishes no bytes.
   Reported error, ambiguity, or unusable metadata/canonicalization returns
   `safe-fs-boundary-unverifiable`; unobservable OS behavior is recorded as a platform
   limitation and is not counted as proof against the excluded active-adversary race.
   Instrumentation rejects every mutation-capable open flag and every write, append, create,
   truncate, rename, delete, link, chmod/chown, timestamp, extended-attribute, ACL, or
   equivalent call. Before/after fixtures prove unchanged content, length, identity/link
   state, mode, modification/change time, and extended attributes or ACLs where observable.
   OS-only access-time movement is recorded separately, is neither a failure nor proof, and
   no product call requests it. Operation and handle lifecycle is centrally managed without
   a product-defined concurrency ceiling.
10. The bootstrap rejects a malformed packed `package.json`, an altered packed
    `engines.node` contract, or an executing Node.js
    version outside `>=24.11.0 <25.0.0 || >=26.0.0 <27.0.0` before CLI import or bind. The
    static loader rejects a malformed/extra-key/duplicate manifest,
    symlink/non-regular asset, unexpected file, path/MIME/size/hash mismatch, relative or
    external executable URL, `<base>`, nonce, executable attribute, and unrecorded inline
    script before bind. Fixtures prove every manifest path, declared byte length, actual byte
    length, MIME type, and digest agree without imposing a product-defined file-size or
    record-count ceiling. The build requires then removes only Nuxt's fixed `200.html` and
    `404.html`, rejects every other non-`index.html` HTML file, and the packed file list
    matches the exact npm allowlist. Build/package verification starts from clean
    `.output`/`.build`/`dist` trees and recursively matches `dist` against only the two
    manifests and their listed static and server records, rejecting stale output. Build,
    packed-tarball, and runtime-bootstrap fixtures enforce the identical integrity contract
    before import or bind and never classify customization-file content.
11. Package tests require exact production dependencies `gunshi`, `yaml`, `jsonc-parser`, and
    `smol-toml`, with `open` absent from every dependency section and lock closure. Every
    project/dependency tarball payload and authored application-code file is JavaScript or a
    permitted declarative artifact, and any package-owned shell helper is rejected. An
    isolated scripts-disabled/omit-dev install and a subsequent network-disabled normal
    install audit the complete production closure, rejecting lifecycle/build requirements,
    platform selectors, bundled/optional native packages, native/binary/Wasm extensions or
    magic, native source/build metadata, non-Node shebangs, and executable non-JavaScript
    payload files. The graph digest binds name/version/integrity and each package-payload
    digest while excluding generated shims. Per-OS audit permits only package-manager-
    generated `.bin` symlink/`.cmd`/`.ps1` shims for exact declared Node-JavaScript `bin`
    targets, with argv-only forwarding and no added input/logic; every unexpected shim fails.
    Every CI OS yields the same graph digest. Launcher tests assert the exact two supported platform
    commands, `shell: false`, URL-only argv, the exact minimal environment allowlist, one
    terminal display, `--no-open` zero-child behavior, and fixed-warning continuation for
    missing/nonzero/unsupported helpers. Malicious `BROWSER`, `NODE_OPTIONS`, `NODE_PATH`,
    inspected/env-supplied argv never select or alter a command; Windows and every other
    unsupported platform spawn zero children and emit the fixed manual-URL warning. Ambient
    allowlisted desktop/session values may reach the OS helper but never become an Inspector
    handler override. Tests distinguish default-handler delegation from certification:
    helper success proves no browser version, and release evidence uses the pinned Playwright
    revisions or the `--no-open` manual fallback.
12. Every automatic and explicit scan receives a unique opaque `scanRequestId`. Repository
    and Global rescan admission responses, Source summaries, waiting/active/final progress,
    fatal status, and successful generation records preserve the same ID; stale or prior
    request state cannot satisfy the newer request. The SC-002 browser protocol starts a
    fresh process, waits for the automatic Repository scan to reach a terminal state outside
    timing, dispatches exactly one explicit Repository rescan, captures its admission ID,
    and stops the status and inventory timers only for visibly rendered state and the
    committed generation associated with that same ID. Evidence records both the ID and
    generation, and an already-rendered automatic inventory cannot qualify.
