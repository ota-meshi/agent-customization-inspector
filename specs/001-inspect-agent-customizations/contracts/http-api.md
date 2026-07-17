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
   verifies the package version, the closed static/server manifests, and every asset they
   list, then initializes the centralized Node.js filesystem service used for every
   inspected-source operation. A missing, malformed, or inconsistent package asset or an
   unavailable filesystem service exits with a fixed actionable CLI error before any HTTP
   session starts. All executable runtime product code is JavaScript; generated HTML shell,
   CSS, JSON manifests, documentation, and license files are declarative, non-executable
   package artifacts. Any manifest-authorized bootstrap embedded in the HTML remains
   JavaScript executable code governed by the CSP requirements below. The package contains
   no native addon, platform-specific artifact selector, runtime download, or runtime build path.
2. At process start, the host creates a random 256-bit capability and opens the SPA at
   `http://127.0.0.1:<port>/#cap=<base64url>`. If browser opening fails or is disabled, the
   same local URL is printed.
3. The fragment never reaches the HTTP server. The SPA reads it once, removes it with
   `history.replaceState`, keeps it only in memory, and sends
   `Authorization: Bearer <capability>` on every `/api/v1` request.
   It never writes the capability to a cookie, query string, `localStorage`,
   `sessionStorage`, IndexedDB, service worker, or another durable/browser-managed store.
   A reload or direct navigation after fragment removal therefore has no authority: the
   SPA makes no API request and shows a safe authorization-lost view whose exact next step
   is to reopen the printed launch URL. That URL remains reusable only for the lifetime of
   the same process and returns the user to `/` with the fragment again.
4. The host compares the capability in constant time and never logs the header, fragment,
   token, request/response body, source path, raw parser error, or source value.
5. Every request must have the exact assigned `Host` value. State-changing requests must
   also have the exact same-origin `Origin`; API navigations and cross-site fetch metadata
   are rejected. CORS headers are never emitted.
6. Before bind, the host strictly loads the at-most-2-MiB
   `dist/manifests/static-assets.json` described in the data model and verifies every
   listed regular asset's exact path, byte length, and lowercase SHA-256. The build rejects
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
   `Cache-Control: no-store` and `X-Content-Type-Options: nosniff`.
7. JSON request bodies must use `application/json`, have a declared and actual size of at
   most 64 KiB, contain only the documented keys, and pass strict manual type/enum guards.

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

No error contains a stack trace, arbitrary exception message, raw content, secret, API
capability, or canonical path outside an enabled source. A correlation ID may be returned
and stored only in process memory.

## Routes

### `GET /api/v1/session`

Returns the current session snapshot and scan progress. The client polls this endpoint
while a source is scanning; no watcher, SSE, or WebSocket is required.

Response data:

```text
SessionSnapshot
├── sessionId, createdAt, activeGeneration, limits, maskingWarning, sessionDiagnosticIds
├── sources[]
│   ├── sourceId, kind, enabled, status, generation
│   ├── boundaries[] { boundaryId, tool, displayRoot, origin }
│   ├── conditionFacts[] { tool, ruleId, affectedRuleIds, behaviorRefs, strategyRefs,
│   │                      condition { key, status, reasonCode, basis } }
│   └── progress null | { phase, visitedEntries, candidateFiles, readBytes, diagnosticCount, queuedAt, startedAt }
├── files[]
│   └── fileId, sourceId, boundaryId, relativePath, aliasPaths, readState, parseStatus, sizeBytes,
│       encoding, recognition summaries, diagnostic IDs
└── diagnostics[] (active-generation records plus bounded out-of-generation lifecycle records)
```

The inventory summary does not include source text or raw mask values. Deterministic sort
order is source kind, boundary/tool, normalized relative path, then file ID.
Recognition summaries contain tool/kind, provenance count, and sorted sets of provenance
documentation/applicability states; they never invent an aggregate winner.
Every returned diagnostic is referenced by the active generation/source/file graph or by
`sessionDiagnosticIds`; client-caused request errors are never accumulated here. The exact
file/source/generation/session caps and overflow sentinels come from `limits`.
Progress is null for `idle` and `failed`; it is present for active work and
for final `ready`/`partial` counters as defined in the data model. The first legal snapshot
is bootstrap generation 0 with no files/diagnostics; it remains readable if the automatic
first Repository scan fails fatally.

Status: `200`, or `401`/`403` for capability/origin failures.

### `GET /api/v1/files/{fileId}`

Returns one active-generation file detail:

```text
FileDetail
├── file summary fields
├── maskedText (null for non-readable read states)
├── masks[] { maskId, kind, placeholder }
├── recognitions[]
│   ├── recognitionId, fileId, tool, kind, masked metadata
│   └── provenances[] { provenanceId, ruleId, discoveryClass, matchedPath, seed IDs, depth,
│                       declarationKey, scope, documentationStatus, order,
│                       behaviorRefs, strategyRefs, sourceRefs,
│                       applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                       condition facts[] } }
├── relationships[] { relationshipId, fromFileId, fromRecognitionId, fromProvenanceId,
│                     ruleId, kind, masked target,
│                     boundary status, resolution status,
│                     documentationStatus, behaviorRefs, strategyRefs, sourceRefs,
│                     applicability { summary, strategyRefs, evaluatedFromGeneration,
│                                     condition facts[] } }
└── diagnostics[]
```

The response uses inert JSON strings. The SPA must render `maskedText` through Vue text
bindings, not `v-html`, Markdown rendering, clickable links, URI handlers, or image loads.

Status: `200`; `404 stale-resource` when the file ID is unknown, belongs to a previous
generation or removed file, or belongs to a disabled source.

### `POST /api/v1/repository/rescan`

Body:

```json
{}
```

Accepts one Repository scan command when that source has no running or queued command. If
the coordinator is idle, work starts immediately; if another transaction is active, the
command is queued FIFO and the Repository summary returns `status: scanning`,
`progress.phase: waiting`, a non-null `queuedAt`, and null `startedAt`. The job begins from
the active generation at dequeue time, not the generation observed by this request. The
current generation remains readable until a complete or bounded-partial replacement is
atomically published. Publication invalidates every old file ID, comparison selection,
and revealed value.

Status: `202` with the updated source summary; `409 scan-in-progress` only for a duplicate
running/queued Repository command; `503` only when the bounded coordinator cannot accept
the command.

### `GET /api/v1/global/consent-preview`

Returns a lexical, process-scoped preview before any proposed Global path is touched:

```text
GlobalConsentPreview
├── previewId, previewDigest, allowlistVersion
├── entries[] { tool, origin, displayRoot, pathPatterns[], inputState }
└── excludedRuleIds[]
```

The server derives it only from the process environment, default-home value, and shipped
contract. It performs no `stat`, `realpath`, directory enumeration, or file read under a
proposed Global root. It incrementally counts the raw value and stops above 32 KiB UTF-8;
for an in-limit value it incrementally escapes and stops before 192 KiB UTF-8 output.
Either overflow returns `inputState: oversized`, `displayRoot: null`, and only the fixed
localized `global.previewTooLarge` presentation; it performs no normalization,
canonicalization, root creation, or read. The user must correct the environment and request
a new preview. Otherwise `displayRoot` shows the exact escaped lexical value; invalid empty
or relative overrides are shown as invalid instead of falling back. A new preview
invalidates the prior unconsented preview. The keyed digest binds the session, version,
ordered tool entries, exact displayed root or null, patterns, states, and exclusions.

Status: `200` or `401`/`403` for capability/origin failures.

### `POST /api/v1/global/enable`

Body:

```json
{
  "confirmed": true,
  "allowlistVersion": "2026-07-15",
  "previewId": "opaque-preview-id",
  "previewDigest": "opaque-keyed-digest"
}
```

The UI may send this only after showing all three exact Global path sets, lexical input
states, and exclusions from that preview. The host rejects a false confirmation, stale
contract version, superseded preview, or non-constant-time digest mismatch. It uses the
stored preview values rather than re-reading environment input. After consent it resolves
each eligible tool home independently. If a canonical root is not component-identical to
the displayed lexical absolute root because of a symlink, junction, case, Unicode-
normalization, short-name, or other alias, that tool is rejected before enumeration with
an actionable diagnostic; the host never substitutes the canonical target or broadens
consent. An invalid environment override likewise produces a tool-specific diagnostic and
never silently falls back. Oversized entries can never be confirmed or resolved. The
logical Global source is enabled and published as scanning when the command is accepted.
If another transaction is active, it reports `progress.phase: waiting` and is queued FIFO;
the scan starts from the active generation at dequeue time and publishes atomically as
ready/partial.

Status: `202`; `400 consent-required`, `allowlist-version-mismatch`, or
`consent-preview-mismatch`; `409` if Global is already enabled or has a running/queued
enable command.

### `POST /api/v1/global/rescan`

Body:

```json
{}
```

Accepts one Global scan command only while Global is enabled and not disabling. It uses
the same FIFO, dequeue-time base-generation, atomic publication, progress, invalidation,
and bounded-capacity rules as Repository rescan. At most one Global scan/enable command is
running or queued; a duplicate cannot silently coalesce or trigger a second read.
A fatal Global enable or rescan does not commit: it reports `status: failed` with null
`progress`, retains `enabled: true`, the exact consent and accepted validated boundary
records, and any prior Global graph, and permits a later explicit rescan or disable.

Status: `202` with the updated source summary; `409 source-disabled` if Global is not
enabled or is disabling; `409 scan-in-progress` for a duplicate running/queued Global scan
or enable command; `503` only when the bounded coordinator cannot accept the command.

### `POST /api/v1/global/disable`

Body:

```json
{}
```

Acts as a priority security barrier. When Global is enabled, consented, running, or queued,
the coordinator aborts and discards whichever transaction is active, cancels every queued
Global command, and runs the zero-I/O Global-disable transaction next. An interrupted
Repository command is requeued exactly once immediately behind the barrier with fresh
counters; an interrupted Global command is not requeued. Polling may observe Global as
`status: disabling` and the draining active source at `progress.phase: cancelling`, then a
requeued Repository at `progress.phase: waiting`. Global progress has null `queuedAt`; when
draining a Global scan it preserves that scan's counters/`startedAt`, otherwise it uses
zero counters and the disable-acceptance `startedAt`. A drained
Repository preserves its counters/start and clears `queuedAt`; a requeued Repository has
zero counters, a new non-null `queuedAt`, and null `startedAt`. The disable commit clears consent,
invalidates every Global source-root record, closes any open inspection `FileHandle`,
removes every Global raw byte/record, increments N to N+1, rekeys the retained Repository graph,
and returns only after every comparison, mask,
and reveal referencing the prior generation is invalid. A requeued Repository job then
starts from N+1 and may later commit N+2. Barrier cancellation is expected and adds no
failure diagnostic. A disable request received while the same barrier is queued or active
joins that barrier and returns when its single commit completes; it neither aborts the
barrier nor creates another generation. If no Global enabled flag, consent record,
nonempty graph, retained validated root record, open inspection `FileHandle`, or
running/queued Global scan/enable command exists,
disable returns immediately as an idempotent no-op and does not increment the generation
or disturb Repository work.

Status: `200`.

### `POST /api/v1/files/{fileId}/reveals`

Body:

```json
{
  "maskId": "opaque-active-mask-id"
}
```

Returns exactly one raw value after an explicit action for an active readable file:

```json
{
  "apiVersion": 1,
  "generation": 3,
  "data": {
    "fileId": "opaque-active-file-id",
    "maskId": "opaque-active-mask-id",
    "value": "the explicitly requested value"
  }
}
```

The server does not create durable reveal state. The SPA keeps the value only in the open
file view and drops it on route close, file removal, generation change, Global disable, or
session end. The response is `no-store` and its body is never logged.

Status: `200`; `404 stale-resource`; `409 file-not-readable` (including
`masking-overflow`); `422 unknown-mask`.

## Method and media handling

- Unknown `/api/v1` paths return `404`; known paths with a wrong method return `405` with
  an explicit `Allow` header.
- Unsupported media types return `415`; malformed JSON or unexpected keys return `400`;
  oversized requests return `413` before parsing.
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

- One bounded coordinator executes exactly one transaction at a time. It admits at most
  one running/queued scan command per source; duplicate scans conflict, while a scan for
  the other source queues FIFO and reports the waiting phase. Disable instead follows its
  barrier join/no-op rules. Every scan starts from the generation current when it actually dequeues.
- Every scan receives an `AbortSignal`. Process shutdown aborts all work. Global disable is
  the priority barrier documented above: it aborts any active uncommitted transaction,
  cancels queued Global work, commits removal next, and requeues an interrupted Repository
  command once. A deadline produces a bounded partial generation and diagnostic.
- A successful or contracted-partial scan commits exactly N+1 and regenerates IDs for both
  the scanned and carried source. A fatal attempt leaves N and its IDs active and emits only
  a capped out-of-generation lifecycle diagnostic. N may be legal bootstrap generation 0.
  Barrier cancellation emits none.
- Session polling never extends session lifetime or persists data. Closing the Node process
  destroys the capability, raw values, source roots, generations, and diagnostics.
- No API call starts an MCP server, follows an import, opens an inspected URL, invokes a
  customization command, or writes to an inspected source.
- Enabled inspection sources are enumerated/read only through one centralized service built
  on `node:fs/promises`. It accepts validated source IDs and source-relative enumeration
  records, never an arbitrary absolute path supplied by an API request, relationship, or
  source file. Every candidate verification phase—enumeration, immediately before open,
  after open but before reading any bytes, and after the bounded read—uses this exact order:
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
  After the bounded read and before parse, publish, or commit, it repeats the root and
  ancestor checks, the ordered candidate sequence, and `stat()` on the same open handle. A
  detected error, ambiguity, containment failure, or metadata change discards the entire
  byte buffer and fails closed. Unusable required metadata or canonicalization emits
  `safe-fs-boundary-unverifiable` and rejects the candidate, or its source when the root or
  a shared ancestor is unverifiable.
- Public Node.js APIs do not provide a portable directory-handle-relative open. An active
  adversarial process that replaces an ancestor or final component between checks is
  outside the initial-release threat model, including where `O_NOFOLLOW` is absent or
  ineffective. Ordinary concurrent edits and all detectable races remain in scope and
  discard every byte. Same-device bind mounts, unreported reparse behavior, and other OS
  semantics unavailable through Node.js remain documented platform limitations, not
  absolute containment guarantees.

## Required contract tests

1. Every API route rejects missing, wrong, expired-process, cross-origin, wrong-Host, and
   navigation requests without returning session data.
2. Old file/mask IDs fail after Repository/Global rescan and Global disable. Bootstrap
   generation 0 is the legal empty base for the automatic first scan and remains active
   after a fatal first attempt.
3. Reveal returns only the requested value, never adjacent values, and is absent from logs,
   diagnostics, session snapshots, and subsequent file responses.
4. Extra JSON keys, path-shaped inputs, malformed/oversized bodies, wrong methods, and
   wrong media types produce the documented safe errors.
5. Static traversal and encoded traversal attempts never escape `dist/public`; the packed
   root, `/compare`, `/global-consent`, and `/files/<fileId>` routes all boot with the same
   root-absolute assets and a CSP whose exact hashes authorize the Nuxt bootstrap but no
   modified/unrecorded inline script or executable attribute.
6. Queue ordering for both rescan routes, duplicate rejection, aborts, partial limits, fatal failures, and polling
   expose only whole generations. A scan queued behind the other source starts from the
   then-current generation; a Global-disable barrier produces the documented N/N+1/N+2
   sequence, never exposes an aborted transaction, and preserves the one accepted
   Repository command by requeuing it once. Concurrent repeated disable joins one barrier;
   an already-empty Global no-op never interrupts Repository work.
7. Reloading every allowlisted client route after fragment removal makes no API call,
   reveals no session data, and directs the user to the still-running process's printed
   launch URL; unknown routes and malformed asset paths never receive the SPA fallback.
8. A Global consent preview touches no proposed path, confirmation is bound to the exact
   preview digest, and a changed/superseded preview or canonical alias mismatch cannot
   authorize a read. Exact-limit and one-byte-over-limit root/display fixtures prove that
   `oversized` returns null with no normalization, prefix display, allocation expansion, or
   authorization.
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
10. The static loader rejects an oversized/malformed/extra-key/duplicate manifest,
    symlink/non-regular asset, unexpected file, path/MIME/size/hash mismatch, relative or
    external executable URL, `<base>`, nonce, executable attribute, and unrecorded inline
    script before bind. The build requires then removes only Nuxt's fixed `200.html` and
    `404.html`, rejects every other non-`index.html` HTML file, and the packed file list
    matches the exact npm allowlist. Build/package verification starts from clean
    `.output`/`.build`/`dist` trees and recursively matches `dist` against only the two
    manifests and their listed static and server records, rejecting stale output.
