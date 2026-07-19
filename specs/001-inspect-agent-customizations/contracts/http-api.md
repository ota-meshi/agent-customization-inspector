# Contract: Local HTTP API

[日本語](http-api.ja.md)

**API version**: 1
**Base path**: `/api/v1`
**Transport**: JSON over loopback HTTP only

This API connects the static Nuxt SPA to the same-process Node inspection host. It is not
a public network API. It accepts opaque IDs and closed commands only; no endpoint accepts
a filesystem path, URL, command, source text, parser option, glob, or executable content.

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
  "generation": 3,
  "data": {}
}
```

The `GET /api/v1/session` and `GET /api/v1/files/{fileId}` success envelopes always carry
`generation`. For a `SessionSnapshot`, it equals `data.activeGeneration`; for a
`FileDetail`, every returned generation-owned ID belongs to that exact value. The server
selects the generation and constructs the complete payload at one linearization point under
the session coordinator lock, then may serialize and deliver the already-fixed envelope
after releasing the lock. It never reads a generation, constructs data outside that
generation, and later relabels the response.

The API defines no product-specific numeric limit for request bodies, files, item counts,
parser structures, snapshots, details, or response bodies. Capacity is inherited from
Node.js, the parser, the operating system, the filesystem, the browser, and the execution
environment. If recoverable serialization or encoding failure occurs before an atomic scan
publication commit, the current attempt aborts, publishes no item, Source, recognition,
derived result, scan-result record or response, or generation, retains only the prior
committed snapshot, and returns only a fixed safe failure outside the result. It does not
classify inspected content as valid or invalid. The host materializes one complete UTF-8
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

## Routes

### `GET /api/v1/session`

Returns the current session snapshot and scan progress. The client polls this endpoint
when source state changes; continuous lifetime detection uses the separate lightweight
liveness route below, so no watcher, SSE, or WebSocket is required.

Response data:

```text
SessionSnapshot
├── sessionId, createdAt, activeGeneration, snapshotState,
│   liveness { heartbeatIntervalMs, requestTimeoutMs, leaseDurationMs },
│   staleFailures[] { sourceId, diagnosticId, failedAt, baseGeneration },
│   globalControl null | { state, previewId, confirmedTools[], pendingTools[], retryableTools[] },
│   sensitiveContentWarning { messageKey, nextStepKey, acknowledgementScope }, sessionDiagnosticIds
├── sources[]
│   ├── sourceId, kind, tool, enabled, status, generation, scanRequestId
│   ├── root { displayRoot, origin }
│   ├── conditionFacts[] { tool, surface, ruleId, affectedRuleIds, behaviorRefs, strategyRefs, sourceRefs,
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { scanRequestId, phase, visitedEntries, candidateFiles, readBytes,
│                         diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, sourceRelativePath, aliasSourceRelativePaths, readState, parseSummary, sizeBytes,
│       encoding, recognition summaries { tool, kind, parseStatus, provenance count, diagnostic IDs }, diagnostic IDs
└── diagnostics[] { diagnosticId, code, severity, scope,
                    sourceId?, fileId?, sourceRelativePath?, messageKey, safeArgs, nextStepKey }
    (active-generation records plus session-owned lifecycle records)
```

Every Source has exactly one root. The Repository Source has `tool: null`; the session has
zero to three Global Sources, at most one each with `tool: codex`, `tool: claude`, or
`tool: copilot`. A Global root is never represented as a boundary inside another Source.
Every `conditionFacts` entry is an evidence-linked, origin-file-less Source Condition Fact:
it stays distinct from `files` and recognitions and cannot create a physical or synthetic
file, file ID/path/text, comparison target, relationship origin, local or hosted read, or
network request. An unobserved current state remains conditional or unavailable.
Top-level `snapshotState` is `current` or `stale-after-fatal-rescan`; only a fatal explicit
rescan adds or replaces one `staleFailures` entry and its lifecycle diagnostic for the affected
Source. Entries and diagnostics for different Sources coexist. A successful complete or
contracted-partial scan clears only the entry and lifecycle diagnostic for the Source it
refreshed; a commit for another Source preserves both, and Global disable clears both for
Sources it removes. `snapshotState` is stale exactly while the
array is non-empty. Automatic first Repository failure and initial Global-enable failure
create no `staleFailures` entry, but use a Repository- or Global-tool-owned lifecycle
diagnostic; initial Global-enable failure preserves all pre-existing entries and the derived snapshot state.
Each `sourceRelativePath` and alias path is relative to its owning Source's single root; the
API never substitutes an absolute or canonical filesystem path for it.
The inventory summary does not include source text. Deterministic sort order is source kind,
Global tool where present, normalized source-relative path, then file ID.
`parseSummary` is the file-level closed projection
`not-applicable | all-parsed | mixed | all-failed`: it is `not-applicable` when every
recognition is `not-attempted`, `all-parsed` when at least one is `parsed` and none is
`failed`, `all-failed` when at least one is `failed` and none is `parsed`, and `mixed` when
`parsed` and `failed` coexist. `not-attempted` records do not change the last three
projections. Recognition summaries contain tool/kind, recognition-level `parseStatus`,
provenance count, diagnostic IDs, and sorted sets of provenance documentation/applicability
states; they never invent an aggregate parse result or winner.

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
`scope` is an obligatory attachment discriminator, independent of diagnostic lifetime.
The only legal location shapes are: `file`, with `sourceId`, `fileId`, and that file's
Source-relative Path all present; `source`, with only `sourceId` present; and `session`,
with all three location fields absent. Source- and session-scoped records never invent a
file ID or path. Serialization rejects any other combination.
Progress is null for `idle` and `failed`; it is present for active work and
for final `ready`/`partial` counters as defined in the data model. The first legal snapshot
is bootstrap generation 0 with no files/diagnostics; it remains readable and current if the
automatic first Repository scan fails fatally.

`sensitiveContentWarning` supplies the fixed warning and next-step message keys that explain
that opening source or comparison content displays complete authored values, including
possible credentials. `acknowledgementScope` is the fixed value `authorized-browser-session`.
Before requesting a file detail or constructing a comparison, the SPA
requires an in-memory acknowledgement for the current authorized browser session. The
acknowledgement is client-only, is not sent to this API, and is not persisted by either side.
The bearer capability is the complete host-side authorization boundary: the API neither
accepts nor claims to enforce a presentation acknowledgement. The shipped SPA nevertheless
must obtain that acknowledgement before it requests detail or constructs comparison. It
grants no filesystem authority and does not alter the returned content.

`globalControl` is null only when Global consent/control state is inactive. Otherwise
`state` is `active` or `disabling`, and `previewId` identifies the frozen active preview.
`confirmedTools` lists the consented tools. `pendingTools` lists tools owned by a running or
queued enable/retry operation during validation/admission or by its running/queued initial
scan job. `retryableTools` is exactly the confirmed controls in `rejected` or non-pending
`admitted` state with no published Source and no active operation/job; an `unvalidated`
control is always pending. These sorted closed arrays expose no canonical root,
digest, or source content. The field remains present for all-failed and post-validation
initial `active-no-job` outcomes with zero Global Sources and all-rejected retries that
preserve existing Sources, so a fresh client can always offer disable and can retrieve the
matching preview before retry. From priority-barrier acceptance until
its commit, `state: disabling` makes `pendingTools` and `retryableTools` empty; the UI offers
no retry and the enable route rejects it. The field becomes null at the disable commit.
While `state: active` and `pendingTools` is non-empty, `retryableTools` is informational:
the UI does not offer retry and the enable route returns `409 global-enable-in-progress`.
Disable remains immediately available. Retry is offered only after `pendingTools` is empty
and the matching frozen preview has been retrieved and verified.

Status: `200`, or `401`/`403` for capability/origin failures.

### `GET /api/v1/session/liveness`

Returns only the current `sessionId` and fixed `leaseDurationMs: 2000`. While the authorized
page is visible, the SPA calls this route every `heartbeatIntervalMs: 1000` with a
`requestTimeoutMs: 750` timeout. A response renews the monotonic browser-memory lease only
when its `sessionId` exactly matches the initial authenticated snapshot. A timeout, network
failure, `401`/`403`, mismatched session, or lease expiry invokes the central client purge
before the session-ended view renders. Hidden/page lifecycle events purge immediately;
the lease is the hard fallback when timer scheduling or a completion callback is delayed.
The memory-only capability is retained across that purge. Returning to visibility requires
a fresh authenticated session snapshot; a new sensitive-content acknowledgement is required
only if the user later opens source/detail or comparison content. Recovery
uses the retained capability to authenticate that snapshot, adopts its returned `sessionId`
as the new liveness baseline without retaining or comparing the purged ID, retains only its
`globalControl` projection, and
discards the other snapshot fields without restoring inventory, detail, or acknowledgement
state. The recovery view always offers an explicit **Resume inspection** action. Resume
fetches the session again, requires its `sessionId` to match the adopted baseline, and
atomically constructs a fresh inventory-summary view with default filters; it restores no
prior detail, comparison, editor, warning acknowledgement, or authored source. When that
projection is non-null, disable is available immediately. The SPA retrieves
the exact frozen active preview and verifies its `previewId` before reconstructing retry
controls. Authentication failure leaves the
session-ended view in place. A liveness call never extends the Node process lifetime, returns
no source/root/diagnostic data, and is never stored or cached.

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
│                       seedFileId, seedProvenanceId, seedRuleId, depth,
│                       declarationKey, scope, documentationStatus, order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, targetOrigin, authoredTarget (exact slice or null),
│                     normalizedTarget, boundary status, resolution status,
│                     documentationStatus, behaviorRefs, strategyRefs, sourceRefs,
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
permitted and is not customization validation. Recoverable runtime/environment Diagnostics
describe inspection availability only and carry no content verdict.

The file encoding state is assigned only after a completed same-handle read passes every
post-read check. Any NUL byte yields `binary`; otherwise decoding is strict UTF-8. A strict
decode with one leading BOM records `utf-8-bom` and removes that BOM, strict success without
a BOM records `utf-8`, and invalid UTF-8 records `unsupported` without replacement or alternate decoding. Binary and unsupported
items expose null `sourceText` and are comparison-ineligible; successful decoding exposes the
complete text without sampling, truncation, or a product-defined byte/line/item ceiling.

Each recognition's `parseStatus` is the closed enum
`not-attempted | parsed | failed`. Parsing and extraction are all-or-nothing per
recognition: `failed` retains that recognition and its diagnostic IDs but returns
no metadata, relationships, or derivations from the failed result; another recognition on
the same file may still be `parsed`. The uniqueness, compatible-provenance merge,
inconsistent-meaning failure, and closed tool-then-kind ordering rules stated for the
session summary apply identically to detail. Only deterministic non-capacity parser/Worker/
extraction failure may produce this failed-recognition state in a contracted-partial
generation; a capacity/resource failure returns no item, recognition, relationship, or
derivation from the attempt, propagates `fatal-resource`, commits no scan-result record or
response or generation, and leaves only the prior committed snapshot available. Structural metadata comparison uses
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

Status: `200`; `404 stale-resource` when the file ID is unknown, belongs to a previous
generation or removed file, or belongs to a disabled source.

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
If the explicit rescan fails fatally, every uncommitted result from that attempt, including
any partial result, is discarded. The last committed generation and its IDs remain readable,
the top-level snapshot returns `snapshotState: stale-after-fatal-rescan`, the Repository
Source returns `status: failed`, and one
actionable lifecycle diagnostic explains that the rescan failed and that the retained
snapshot is stale. This creates or replaces the Repository entry in `staleFailures` and its
lifecycle diagnostic; a later successful or contracted-partial Repository rescan clears both,
while a commit for another Source leaves both unresolved.

Status: `202` with the request ID and updated source summary; `409 scan-in-progress` only
for a duplicate running/queued Repository command.

### `GET /api/v1/global/consent-preview`

Returns a lexical, process-scoped preview before any proposed Global path is touched:

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion, traversalPlanVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

The server derives it only from the three documented tool-home environment variables,
default-home values, and shipped contract. Those variables are used only to locate proposed
Global roots and never to substitute references inside inspected content. The frozen
internal preview record, which is never serialized, additionally keeps each entry's
`lexicalRoot` as the exact raw string. Empty, relative, invalid, control-containing, and
backslash-containing values remain exact raw strings with their separate `inputState`. `displayRoot` is
one-way presentation escaping derived from `lexicalRoot`; it is never decoded back into a
path or used as admission input. The preview
performs no `stat`, `realpath`, directory enumeration, or file read under a
proposed Global root. Node.js and the execution environment determine whether the value can
be retained and escaped. A recoverable failure returns a fixed environment-error state,
creates no authorization, and performs no normalization, canonicalization, root creation,
or read. Otherwise `displayRoot` shows the exact escaped lexical value; invalid empty
or relative overrides are shown as invalid instead of falling back. With no active consent,
a new preview invalidates the prior unconsented preview. While consent is active, this route
instead returns the exact frozen preview identified by `globalControl.previewId`, including
the same digest, without rereading the environment or creating a replacement. This lets a
fresh authenticated client recover the exact display after a purge; a different preview
requires disable first. The keyed digest binds the session, version, ordered tool entries,
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
unsafe, unreadable, environment-failed, or undecodable candidate fails closed without fallback. An
optional leading UTF-8 BOM alone or whitespace-only content is empty, and at most one non-empty
Codex instruction file is published. `absent` means only an explicit not-found result from
that exact target's `lstat` after root verification; permission, type, metadata,
ancestor/root, canonicalization, and disappearance after the first observation are
failures rather than fallback conditions.

Status: `200` or `401`/`403` for capability/origin failures.

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-17",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

Response data:

```text
GlobalEnableResult
├── state: queued | active-no-job
├── acceptedTools[] (zero to three tool enums)
└── rejectedTools[] (zero to three tool enums)
```

The UI may send this only after showing all three exact Global path sets, lexical input
states, and exclusions from that preview. The host rejects a false confirmation, stale
contract version, superseded preview, or non-constant-time digest mismatch. It uses only
the stored internal raw `lexicalRoot` and stored typed traversal program; it never rereads
environment input, reverse-converts `displayRoot`, or accepts `pathPatterns` as authority.
The body intentionally has no tool selector: initial enable confirms every `eligible`
entry in the frozen preview, and the server derives `confirmedTools` as that exact closed-
order set. A retry derives its work set as the confirmed tools that still have no Source;
the request cannot add, remove, or reorder consented tools. After consent it resolves each
eligible tool home independently. If a canonical root is not
component-identical to the stored raw lexical absolute root shown by that preview because of
a symlink, junction, case, Unicode normalization, short-name, or other alias, that tool is
rejected before enumeration with an actionable tool diagnostic; the host never
substitutes the canonical target or broadens consent. Lexically present-empty, relative,
invalid, or environment-failed
entries are not confirmed and create no retained Diagnostic; their fixed preview
`inputState`/message is the complete explanation and they never silently fall back. A
lexically eligible but missing, unreadable, or otherwise unusable root is a post-consent
rejection and uses that tool's diagnostic. Every representable absolute root is lexically
eligible even outside the ordinary home; location alone neither rejects it nor grants
pre-consent I/O. Before activating consent, the coordinator
serializes the operation, atomically activates consent, creates the
confirmed eligible tools' `unvalidated` controls, and registers one cancellable
`GlobalEnableOperation` whose command epoch and `pendingTools` cover validation, admission,
and scan-job queueing. Post-consent validation accepts zero to three roots.
Initial enable uses the whole derived `confirmedTools` set, while retry uses its whole
derived missing-tool work set. Capacity is inherited from Node.js and the execution
environment, and admission uses the availability those layers report.
After all validation outcomes and job enqueues,
the coordinator performs one final operation-ID/epoch/state check under its lock. At that
single linearization point it atomically chooses the response disposition. For `202`, it
also marks the operation complete and unregisters it. For `409`, it enters draining; only
after cancellation has released operation-local resources does it become cancelled and
unregister before barrier cleanup.
Terminal operation history is not kept, and later response-byte delivery cannot change the
chosen disposition.
Each accepted tool root creates one provisional scan job for a separate tool-specific Global
Source with exactly one root; roots and files for different tools are never merged. Rejected
tools create or replace their `GlobalToolControl`-owned tool failure diagnostic
and receive no Source, stale-failure entry, or
job. `acceptedTools` and `rejectedTools` partition the tools validated by this request. The
operation checks its ID/epoch, non-aborted signal, and `globalControl.state: active` before
and after every asynchronous step and immediately before any control/diagnostic mutation or
job enqueue. If the operation reaches the final disposition point first, its chosen `202`
remains committed even if response delivery occurs after a later disable acceptance; that
barrier may then cancel/remove the accepted work normally. If the disable barrier linearizes
first, the operation drains and chooses `409 global-disable-pending` without allowing a late
mutation or job. The request cannot produce both dispositions.
`202` response uses `state: queued` when at least one job was accepted and
`state: active-no-job` when all were rejected; it never returns Source summaries.
Consent and `globalControl` remain active in either state. Provisional Sources and their
progress are not published. Each accepted scan is
queued FIFO, starts from the active generation at dequeue time, and atomically publishes a
new Source only with a complete or contracted-partial generation. A later session poll
observes each Source only after that Source's scan
commits. Successful publication clears that `GlobalToolControl`'s tool failure
diagnostic from `sessionDiagnosticIds`; unrelated tools' diagnostics remain unchanged.

If the exact same active consent already exists, whether zero or more Global Sources have
committed, this route may be called again only to retry confirmed eligible tools that still
have no Source.
The host compares the same session-bound frozen preview ID/digest, active consent, and its
`GlobalToolControl` records, preserves every existing Source's semantic content and stable
`sourceId`, and validates only the tools listed by `globalControl.retryableTools`.
Every successful initial or retry Global Source commit still advances the session
generation, regenerates all generation-owned IDs in every carried graph, and invalidates
old file/detail/comparison/editor state. Revalidation of an admitted retained
context follows the close/discard/re-admit rule in the data model: a mismatch or unverifiable
root closes and unregisters the old context and discards its unpublished IDs before the
control becomes `rejected`. A different preview/root requires Global disable first; a request
with no missing tool is a conflict.
A fatal initial tool enable publishes no file or Source result, adds no `StaleSourceFailure`
entry for the missing tool, and preserves all pre-existing entries and the derived snapshot
state. It creates or replaces the affected `GlobalToolControl`'s keyed tool failure
diagnostic and retains only
the consent and `GlobalToolControl` state needed for this exact-consent retry or disable.

If the lexical preview has no eligible tool root, the host returns
`400 no-eligible-global-root` without activating consent or creating a control record. If it
has eligible tools but post-consent validation rejects all of them, the host instead returns
`202 active-no-job` with active recovery/disable control as defined above.

Status: `202`; `400 consent-required`, `no-eligible-global-root`, `allowlist-version-mismatch`, or
`consent-preview-mismatch`; `409 no-missing-global-tool` if no confirmed eligible tool is
missing, `409 active-global-consent-conflict` if the request would change active consent,
`409 global-enable-in-progress` if an enable/retry operation or one of its
initial scan jobs is running/queued, or
`409 global-disable-pending` if Global disable is pending/active.

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

A fatal Global rescan commits nothing and publishes zero partial results from the failed
attempt. It reports top-level `snapshotState: stale-after-fatal-rescan`, Source
`status: failed`, and null `progress`, while
retaining `enabled: true`, the exact consent and validated single-root record, the last
committed graph, and all IDs from that graph. One actionable lifecycle diagnostic
identifies the affected Source and explains that the retained session snapshot is stale.
This creates or replaces only that Source's `staleFailures` entry and lifecycle diagnostic. A
later successful or contracted-partial rescan of the same Source replaces its graph atomically
and clears both; another Source's commit preserves both.

Status: `202` with the request ID and updated source summary; `404 stale-resource` for an unknown or removed
Source ID; `409 global-disable-pending` if Global disable is pending/active;
`409 scan-in-progress` for a duplicate running/queued scan for that Source.

### `POST /api/v1/global/disable`

Body:

```json
{}
```

Acts as a priority security barrier for all tool-specific Global Sources. When any
tool-specific Global Source or graph, active consent record, retained admitted Global root
context, open Global inspection `FileHandle`, or running/queued Global scan/enable command exists,
the coordinator sets `globalControl.state: disabling` with empty pending/retry arrays,
increments the command epoch, and rejects new Global-enable/Global-rescan commands. It aborts and discards
whichever transaction is active, aborts any active/queued `GlobalEnableOperation`, waits for
its validation/admission continuations to drain without mutation or enqueue, performs a
final queued-Global-command cancellation sweep, and runs the zero-I/O Global-disable
transaction next. An interrupted
Repository command is requeued exactly once immediately behind the barrier with fresh
counters; an interrupted Global command is not requeued. Polling may observe every retained
Global Source as `status: disabling` and the draining active Source at
`progress.phase: cancelling`, then a requeued Repository at `progress.phase: waiting`. The
draining Global Source has null `queuedAt`; when draining a Global scan it preserves that
scan's counters/`startedAt`, otherwise it uses zero counters and the disable-acceptance
`startedAt`. A drained
Repository preserves its counters/start and clears `queuedAt`; a requeued Repository has
zero counters, a new non-null `queuedAt`, and null `startedAt`. The disable commit clears
consent, removes all Global Sources and their root records, closes any open inspection
`FileHandle`, removes every Global source/metadata record, clears every `GlobalToolControl`-
owned tool diagnostic from `sessionDiagnosticIds`, closes and removes every control-owned
root context and frozen preview, increments N to N+1, rekeys the
retained Repository graph, and returns only after every comparison referencing the prior
generation is invalid. It also removes the `staleFailures` entries and lifecycle diagnostics
for every removed Global Source; any Repository entry and lifecycle diagnostic remain and keep
the session stale.
A requeued Repository job then
starts from N+1 and may later commit N+2. Barrier cancellation is expected and adds no
failure diagnostic. A disable request received while the same barrier is queued or active
joins that barrier and returns when its single commit completes; it neither aborts the
barrier nor creates another generation. If no Global Source, consent record, nonempty Global
graph, retained validated Global root record, open Global inspection `FileHandle`, or
running/queued Global scan/enable command exists,
disable returns immediately as an idempotent no-op and does not increment the generation
or disturb Repository work.

Status: `200`.

## Method and media handling

- Unknown `/api/v1` paths return `404`; known paths with a wrong method return `405` with
  an explicit `Allow` header.
- Unsupported media types return `415`; malformed JSON or unexpected keys return `400`.
  A recoverable Node.js transport or parsing failure returns a fixed safe error without a
  partial body; the API defines no product-specific request-size ceiling.
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
  phase. If Node.js or the execution environment reports a recoverable admission failure,
  the command fails
  without state mutation. Disable follows its priority barrier join/no-op rules. Every
  automatic or explicit scan receives one opaque `scanRequestId` and starts from the
  generation current when it actually dequeues.
- Every scan and `GlobalEnableOperation` receives an `AbortSignal`. Process shutdown aborts
  all work. Global disable is the priority barrier documented above: it aborts any active
  uncommitted transaction, aborts/drains enable validation, performs a final queued-Global-
  work cancellation sweep, commits removal next, and requeues an interrupted Repository
  command once. Operation completion is governed by Node.js and the execution environment.
  Disable, shutdown, supersession, or a recoverable operation failure irreversibly revokes publication
  authority. A pending Node.js filesystem promise becomes cleanup-only: every late byte,
  graph record, Diagnostic, DTO, and operational-event result is discarded. Physical
  cancellation of an uncancellable kernel operation is not guaranteed.
- A successful or contracted-partial scan commits exactly N+1 and regenerates generation-
  owned graph IDs for the scanned Source and all carried Sources; process-lifetime-stable
  Source IDs remain unchanged. It clears only the scanned Source's stale-failure
  entry and lifecycle diagnostic and carries both for other Sources. A fatal explicit rescan discards every uncommitted
  result, including partial results, leaves N and its IDs active, marks the retained
  session snapshot stale, and creates or replaces one actionable out-of-generation
  lifecycle diagnostic and entry for the affected Source, replacing both for that Source
  on repeated failure. N may be legal bootstrap
  generation 0. Barrier cancellation emits none.
- Snapshot polling and liveness heartbeats never extend the Node process lifetime or persist
  data. The browser renews a two-second monotonic memory lease only from a matching
  authenticated liveness response. Failure, lease expiry, hidden/page lifecycle events, or
  process loss runs the central purge before an ended view is shown. The purge increments a
  client epoch so a late in-flight response cannot repopulate DTOs or editor state, disposes
  Monaco models/editors/workers and subscriptions, clears DOM/store content and warning
  acknowledgement, and aborts pending requests. Closing the Node process destroys the
  server-side capability, complete source content, source roots, generations, and diagnostics.
- No API call starts an MCP server, follows an import, opens an inspected URL, invokes a
  customization command, or writes to an inspected source.
- Enabled inspection sources are enumerated/read only through one centralized service built
  on `node:fs/promises`. It accepts validated source IDs and source-relative enumeration
  records, never an arbitrary absolute path supplied by an API request, relationship, or
  source file. The service centrally owns each operation and handle lifecycle and relies on
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
  detected error, ambiguity, containment failure, or metadata change discards the entire
  byte buffer and fails closed. Unusable required metadata or canonicalization emits
  `safe-fs-boundary-unverifiable` and rejects the candidate, or its source when the root or
  a shared ancestor is unverifiable.
- Mutation verification instruments the product's filesystem calls and compares fixture
  content, length, identity/link state, mode, modification/change time, and extended
  attributes or ACLs where observable before and after inspection. Access-time movement
  caused only by an OS read is recorded separately; it neither fails the no-product-mutation
  claim nor counts as proof of it, and the product never requests an access-time update.
  A recoverable environment capacity failure discards the incomplete read and every item,
  scan-result record or response, and generation from that attempt, leaves only the prior
  committed snapshot available, and is never labelled valid, invalid, correct, incorrect,
  or lint-failing.
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
2. Old file IDs fail after a successful Repository/Global rescan and Global disable. A fatal
   explicit rescan publishes zero failed-attempt partials, retains the last committed IDs,
   marks the retained session snapshot stale, and identifies the affected Source in the
   actionable lifecycle diagnostic. Bootstrap generation 0 is the legal empty base for the
   automatic first scan. Multi-Source sequences prove that A and B entry-diagnostic pairs
   coexist, B's success does not clear A, A's contracted-partial success clears only A's pair,
   a repeated A failure replaces only A's pair, and Global disable clears only pairs for
   removed Global Sources. Diagnostic DTO fixtures accept exactly the three scoped shapes:
   file with matching `sourceId`/`fileId`/`sourceRelativePath`, source with only `sourceId`,
   and session with no location field. Every missing, extra, mismatched, or fabricated
   source/file/path combination is rejected before serialization.
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
   A fixed Codex default-hook fixture instead returns `targetOrigin: documented-default`,
   null `authoredTarget`, and an explicit documented-default label; an explicit manifest
   hook returns `targetOrigin: authored` with its exact occurrence. Sentinel process values
   prove that environment references are never resolved or substituted. The SPA shows
   and receives the in-memory sensitive-content acknowledgement before requesting detail or
   constructing comparison, while the removed reveal route returns `404`. Direct authorized
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
   defined numeric capacity ceiling. Injected recoverable Node.js, parser, filesystem, and
   serialization failures return fixed safe errors or operational Diagnostics, never a
   partial JSON body or incomplete committed generation, and never a validity, correctness,
   compliance, or lint verdict. Escaping and key-order fixtures prove that the one complete
   serialized buffer is the HTTP entity body and matches `Content-Length` when present.
5. Static traversal and encoded traversal attempts never escape `dist/public`; the packed
   root, `/compare`, `/global-consent`, and `/files/<fileId>` routes all boot with the same
   root-absolute assets and a CSP whose exact hashes authorize the Nuxt bootstrap but no
   modified/unrecorded inline script or executable attribute.
6. Queue ordering across Repository and each tool-specific Global rescan, duplicate
   rejection, aborts, contracted-partial outcomes, fatal failures, and polling expose only
   whole generations. A scan queued behind another Source starts from the then-current
   generation; a Global-disable barrier produces the documented N/N+1/N+2 sequence, never
   exposes an aborted transaction, and preserves the one accepted Repository command by
   requeuing it once. Concurrent repeated disable joins one barrier; an already-empty Global
   no-op never interrupts Repository work. A paused validation/admission operation is
   aborted and drained before the final cancellation sweep; releasing its late continuation
   afterward creates no mutation, diagnostic, context, ID, or job. Injected recoverable
   environment admission failures leave state unchanged and do not depend on a product-
   defined slot count. Deterministic barrier-race fixtures pause the operation (a) while
   validation is awaited, (b) after admission but before any control/context/diagnostic
   mutation, and (c) immediately before job enqueue/final response disposition. At every
   pause, a barrier-first ordering returns `409`, permits no late side effect, unregisters
   the operation, and allows a later enable; an operation-first final disposition remains
   the committed `202` even when response bytes are delivered after disable acceptance.
   Separate deterministic delivery pauses hold a linearized SessionSnapshot or FileDetail
   response while a scan commit or Global-disable commit advances the generation. They prove
   that envelope generation and payload never mix, older responses are ignored, adopting a
   newer snapshot increments `clientDataEpoch` and aborts/disposes old state, and detail is
   adopted only when its captured epoch/generation/fileId all still match. Disable,
   shutdown, supersession, and injected recoverable-operation tests leave a filesystem
   promise pending, revoke publication authority, and prove that every late result is
   discarded. Tests do not assert hard cancellation of the underlying Node.js/kernel
   operation or a product-defined completion deadline.
7. Reloading every allowlisted client route after fragment removal makes no API call,
   returns no session data, and directs the user to the still-running process's printed
   launch URL; unknown routes and malformed asset paths never receive the SPA fallback.
   Liveness tests cover visible-page process termination, request timeout, lease expiry,
   hidden/page lifecycle purge, port reuse with a different `sessionId`, and a late in-flight
   response after the client epoch changed; none may leave or automatically restore pre-purge inventory,
   detail, comparison, editor, or authored-content DTO/DOM state or the warning
   acknowledgement. With active consent, hidden-to-visible recovery authenticates with only
   the retained capability, adopts the returned `sessionId` without retaining/comparing the
   purged ID, and constructs a fresh `globalControl` projection. Disable is available from
   that projection immediately; retrieving and verifying the same frozen preview ID/digest
   rebuilds only retry controls. The explicit Resume inspection action re-fetches a matching
   session and constructs a fresh inventory summary with default state, but restores no
   pre-purge authored content, selection, filter, detail, comparison, editor, or
   acknowledgement. A later detail/comparison request requires a new acknowledgement.
8. A Global consent preview touches no proposed path, confirmation is bound to the exact
   raw internal `lexicalRoot`, typed traversal-plan version/program, and preview digest, and
   a changed/superseded preview or canonical alias mismatch cannot authorize a read.
   Escape-collision, control-character, and backslash fixtures prove the digest length-prefixes the
   raw value and that enable uses only the stored raw value, never an environment reread or
   `displayRoot` reverse conversion. Injected recoverable environment failures return a
   fixed non-authorizing preview state with no normalization, prefix display, or read; an
   all-ineligible preview activates no consent. Provisional enable work
   publishes no Source. Successful complete or contracted-partial
   commits produce zero to three separately identified Global Sources, at most one per tool
   and exactly one root per Source; no cross-tool Source merges occur. Failed missing-tool jobs
   in an all-failed or mixed outcome add no `StaleSourceFailure` entry, create/replace their
   keyed tool diagnostics, and preserve all pre-existing entries and the derived
   snapshot state; successful tool commits
   carry unrelated entries and diagnostics. Both prior-current and prior-stale cases are tested.
   Initial activation with all post-consent roots rejected yields `202 active-no-job`, zero
   new jobs and zero Global Sources, an active
   `globalControl`, retryable tools, and one replaceable diagnostic per affected
   `GlobalToolControl`; an all-rejected retry likewise creates zero new jobs/Sources while
   preserving existing Source semantic content and stable `sourceId` values without a
   generation commit. Partial acceptance partitions accepted/rejected tools. Every successful
   initial or retry publication advances the generation, rekeys all generation-owned IDs
   in carried graphs, and invalidates old file/detail/comparison/editor state. Successful
   publication clears its control diagnostic, unrelated outcomes preserve it, and disable
   removes every control diagnostic/context even when no Global Source was ever published.
   During validation/admission and initial scan, every tool owned by the running enable/retry
   operation appears in `pendingTools`; an `unvalidated` tool is never retryable. During a
   mixed activation, already rejected/non-pending admitted tools may appear in
   `retryableTools`, but retry stays disabled and returns `409 global-enable-in-progress`
   until `pendingTools` is empty; disable is available throughout.
   Injected recoverable admission failures leave consent/control/diagnostic/Source state
   unchanged, and every terminal outcome proves there is no operation-history leak.
   A fatal initial scan followed by a retry with a changed or unverifiable retained root
   closes/unregisters the old context, discards its unpublished IDs, and leaves a rejected
   control with no authority before any later re-admission.
   An exact-active-consent retry queues only confirmed missing tools while a changed consent
   requires disable first. Traversal call traces prove that public patterns are derived from
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
