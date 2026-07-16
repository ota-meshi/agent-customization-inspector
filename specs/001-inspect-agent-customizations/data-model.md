# Data Model: Inspect Agent Customizations

[日本語](data-model.ja.md)

The model has two representations:

- **Internal session records** may contain canonical paths, file descriptors during a
  read, raw bytes, and the original value behind a mask. They never cross the HTTP
  boundary or enter logs.
- **Public DTOs** contain source-relative display paths, masked text, bounded metadata,
  recognitions, relationships, diagnostics, and opaque generation-scoped IDs.

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
│   ├── SourceBoundary (exactly one) → SafeRootCapability (internal)
│   └── SourceConditionFact (zero or more; no originating file)
├── Source (zero or one Global)
│   ├── SourceBoundary (one per enabled tool home) → SafeRootCapability (internal)
│   └── SourceConditionFact (zero or more; no originating file)
├── ScanGeneration (exactly one active, session-wide)
│   └── CustomizationFile
│       ├── EntryTicket + SafeReadReceipt (internal)
│       ├── ToolRecognition (one or more)
│       │   └── CandidateProvenance (one or more)
│       │       └── ApplicabilityAssessment
│       ├── Relationship (zero or more)
│       │   └── ApplicabilityAssessment
│       ├── Mask (zero or more; raw value internal only)
│       └── Diagnostic (zero or more)
├── GlobalConsentPreview (zero or one current lexical preview)
├── GlobalConsent (zero or one active record)
└── Diagnostic (session/source-level failures)

BrowserState
├── FilterState
├── ComparisonSelection (zero or exactly two readable files)
├── EditorModelState (zero or more, active route/generation only)
└── RevealedValue (zero or more, active generation only)
```

## Entities

### InspectionSession

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `sessionId` | opaque string | DTO | Random per process; not the API capability |
| `apiVersion` | literal `1` | DTO | Reject incompatible clients |
| `createdAt` | ISO timestamp | DTO | Process start time |
| `sources` | `Source[]` | DTO | Exactly one Repository; zero or one Global |
| `activeGeneration` | integer | DTO | Monotonically increasing; changes invalidate UI state |
| `limits` | `ResourceLimits` | DTO | Exact enforced limits, not advisory values |
| `maskingWarning` | localized message key | DTO | Always states that masking is not exhaustive |
| `sessionDiagnosticIds` | opaque string[] | DTO | Out-of-generation lifecycle diagnostics accepted under the 1,024-entry session limit |
| `capability` | 256-bit random token | internal | Constant-time comparison; never serialized in snapshots/logs |

The session is created from the launch process `cwd`. At process start it publishes the
zero-I/O bootstrap generation 0 with empty files/diagnostics, an enabled idle Repository
source, and no Global source before automatically queuing the first Repository
scan. It has no repository picker, ancestor search, profile, cache, or resume identifier.

### ResourceLimits

| Field | Value | Limit behavior |
|---|---:|---|
| `maxFileBytes` | 1 MiB | Do not read beyond the limit; retain the inventory item with a diagnostic |
| `maxTotalFileBytes` | 32 MiB | Publish a bounded partial generation |
| `maxVisitedEntries` | 200,000 | Stop enumeration deterministically |
| `maxCustomizationFiles` | 2,000 | Stop accepting new candidates |
| `maxPathSegments` | 64 | Skip deeper entries with a diagnostic |
| `maxAliasPathsPerFile` | 1,024 | Keep the primary identity, stop accepting aliases, publish partial, and add a diagnostic |
| `maxDirectRelationshipsPerFile` | 1,000 | Retain the first 1,000 in stable extractor order, publish partial with a diagnostic, and never follow relationships |
| `maxProvenancesPerRecognition` | 2,000 | Stop accepting additional admissions, publish a partial generation, and add a diagnostic |
| `maxDerivedTargetsPerSeed` | 128 | Retain the first 128 distinct validated targets in stable typed-extractor order; stop the seed, publish partial, and offer a diagnostic candidate on the next target |
| `maxDerivationDepth` | 1 | A bounded-derived provenance cannot seed another derived edge |
| `maxFallbackBasenamesPerConfig` | 16 | Reject additional Codex fallback values with a limit diagnostic |
| `maxFallbackBasenameBytes` | 128 UTF-8 bytes | Reject the individual Codex fallback value |
| `maxMaskMatchesPerFile` | 4,096 | Withhold all source and metadata for the file on the next match; never emit a partly masked view |
| `maxMaskedTextBytes` | 2 MiB UTF-8 | Withhold all source and metadata before constructing an oversized masked string |
| `maxParseDepth` | 64 | Discard the affected recognition's extraction result and publish a partial diagnostic |
| `maxParseNodes` | 50,000 | Discard the affected recognition's extraction result and publish a partial diagnostic |
| `maxScalarBytes` | 64 KiB UTF-8 | Discard that recognition's extraction result; retain no value in metadata, relationships, or derivation |
| `maxMetadataEntriesPerRecognition` | 512 | Discard the affected recognition's whole extraction result instead of returning a lossy prefix |
| `parseTimeBudgetMs` | 2,000 per recognition | Terminate and replace the parser worker; retain only the already-masked source and a diagnostic |
| `maxParserWorkers` | 2 | Queue bounded parser jobs instead of creating another worker |
| `parserWorkerMaxOldGenerationMiB` | 64 | Set the Worker V8 old-generation resource limit; discard the failed recognition result if exceeded |
| `parserWorkerMaxYoungGenerationMiB` | 16 | Set the Worker V8 young-generation resource limit; discard the failed recognition result if exceeded |
| `parserWorkerStackSizeMiB` | 4 | Set the Worker V8 stack resource limit; discard the failed recognition result if exceeded |
| `maxSourceConditionFactsPerSource` | 256 | Reject an invalid shipped registry before scanning; never truncate known limitations |
| `maxConditionFactsPerAssessment` | 64 | Truncate no known fact; reject an invalid registry emitter before scanning |
| `maxDiagnosticsPerFile` | 128 | Reserve the final slot for a file-limit sentinel; suppress later details and publish partial on overflow |
| `maxDiagnosticsPerSource` | 5,000 | Reserve the final slot for a source-limit sentinel; suppress later details and publish partial on overflow |
| `maxDiagnosticsPerGeneration` | 10,000 | Reserve the final slot for a generation-limit sentinel; suppress later details and publish partial on overflow |
| `maxDiagnosticsPerSession` | 1,024 | Bound out-of-generation lifecycle diagnostics; reserve the final slot for a session-limit sentinel without mutating the active generation |
| `maxGlobalPreviewRootInputBytes` | 32 KiB UTF-8 | Stop bounded length counting before normalization/escaping and return an `oversized` null-display entry |
| `maxGlobalPreviewDisplayBytes` | 192 KiB UTF-8 | Stop the streaming escape before output expansion and return the same `oversized` null-display entry |
| `maxRequestBodyBytes` | 64 KiB | Reject before JSON parsing |
| `scanDeadlineMs` | 30,000 | Abort and publish a bounded partial generation |
| `maxComparisonLinesPerFile` | 20,000 | Skip Monaco diff highlighting; retain both complete masked source views |
| `comparisonTimeBudgetMs` | 5,000 | Cancel Monaco diff computation; retain both complete masked source views |

The server enforces scan, masking, parser, and request limits. Parser jobs run outside the
host event loop in a pool of at most two `Worker` threads. Each worker has V8 resource
limits of 64 MiB old generation, 16 MiB young generation, and a 4 MiB stack; it is replaced
after a timeout, resource-limit exit, or uncaught failure. Tree traversal additionally
enforces the depth, node, scalar, and metadata-entry limits above. A failed recognition
result is all-or-nothing: no relationships or derived declarations from that result are
published, while successful recognitions for the same physical file may remain. The
client enforces the two comparison limits from the same DTO values and configures Monaco
with the same finite time budget; neither side treats these values as advisory.

### Source

| Field | Type | Rules |
|---|---|---|
| `sourceId` | opaque string | Stable for the process lifetime |
| `kind` | `repository \| global` | Exactly one Repository source |
| `enabled` | boolean | Repository and a present Global Source are true; Global absence represents disabled, and a disabling Global remains true until atomic removal |
| `status` | `idle \| scanning \| disabling \| ready \| partial \| failed` | Follows transitions below; `disabling` is Global-only while the priority barrier drains work |
| `boundaries` | `SourceBoundary[]` | Repository has one; Global has only consented tool-home boundaries |
| `generation` | integer | Equals the session-wide active generation for every published source |
| `progress` | `ScanProgress` or null | Non-null only while `scanning`/`disabling` or after `ready`/`partial`; null for `idle` and `failed` |
| `conditionFacts` | `SourceConditionFact[]` | Bounded source-level facts for documented non-file behavior or excluded/runtime inputs that have no originating file |
| `diagnosticIds` | opaque string[] | Source-scoped diagnostics in the active generation accepted under the 5,000-entry source limit |

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
| `ruleId` | stable excluded or relationship-only rule ID | Defines the non-file fact and can never authorize a file candidate |
| `affectedRuleIds` | non-empty sorted inspection-rule ID[] | Candidate or relationship-only subset of the shipped registry; controls which provenance/edge may project the fact |
| `behaviorRefs` | sorted `VendorBehaviorStatement.behaviorId`[] | Exact surface/scope lookup statements that explain the fact; never grants a read |
| `strategyRefs` | sorted `RuntimeCompositionStrategy.strategyId`[] | Exact composition or selection statements used by the projection |
| `condition` | `ConditionFact` | Fixed reason code and any documented status; `satisfied` records a non-file runtime fact but still grants no read authority and never contains an unmasked raw value |

The fixed registry may emit at most 256 entries per source. Entries are deduplicated by
tool, explaining rule, affected-rule set, condition key, and reason code.

### SourceBoundary

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `boundaryId` | opaque string | DTO | Used for grouping, never accepted as a path |
| `tool` | `copilot \| claude \| codex \| repository` | DTO | Repository uses `repository` |
| `displayRoot` | string | DTO | Local path intended for the user; control characters escaped and bounded by `maxGlobalPreviewDisplayBytes` |
| `canonicalRoot` | absolute canonical path or null | internal | Diagnostic/consent comparison only; never read authority and never returned outside an enabled boundary |
| `safeRoot` | `SafeRootCapability` | internal | Sole read authority; required before enumeration |
| `origin` | `cwd \| default-home \| environment` | DTO | Explains how the boundary was selected |

One logical Global source may contain up to three separate boundaries. This preserves one
filterable Global source without pretending that all tool homes share a directory.

### SafeRootCapability, EntryTicket, and SafeReadReceipt

These native-backed records are internal only. They cannot be serialized, cloned from a
DTO, reconstructed from a path, or accepted from an HTTP request.

| Entity / field | Type | Rules |
|---|---|---|
| `SafeRootCapability.nativeHandle` | native external | Retained directory/volume-root-derived handle; never exposed to JS as a numeric descriptor |
| `SafeRootCapability.sourceId` / `boundaryId` | opaque IDs | Bind the capability to exactly one source boundary |
| `SafeRootCapability.backendTarget` / `backendVersion` | closed target ID / native ABI integer | Must match the one manifest-selected prebuild and custom native ABI 1 |
| `SafeRootCapability.rootIdentity` | platform handle identity | Captured from the opened handle, not a prior path lookup |
| `SafeRootCapability.mountOrVolumeIdentity` | platform identity | Crossing it is rejected |
| `SafeRootCapability.state` | `open \| closed` | Close on source disable or process end; closed capabilities reject all calls |
| `EntryTicket.nativeTicket` | native external | Issued only by bounded enumeration beneath one open root |
| `EntryTicket.relativeSegments` | NFC segment array | Same normalized path used for classification; never an ambient absolute path |
| `EntryTicket.enumerationIdentity` / `enumerationMetadata` | handle-relative snapshot | Compared with the final handle before any result is accepted |
| `EntryTicket.occurrence` | non-negative integer | Deterministic native enumeration order; capped by `maxVisitedEntries` |
| `EntryTicket.state` | `enumerated \| consumed \| stale \| rejected` | A ticket can be read at most once per generation; stale/rejected tickets return no bytes |
| `SafeReadReceipt.entryTicket` | internal reference | Exact ticket consumed for this file |
| `SafeReadReceipt.finalHandleIdentity` | platform handle identity | Sole source of `CustomizationFile.identity` |
| `SafeReadReceipt.preReadMetadata` / `postReadMetadata` | bounded metadata | Type, identity, size, and change fields must agree under the native contract |
| `SafeReadReceipt.fileType` | literal `regular-file` | No directory, link, device, socket, pipe, or reparse target |
| `SafeReadReceipt.acceptedByteCount` | integer | Never exceeds `maxFileBytes` or remaining total budget |
| `SafeReadReceipt.containmentMode` | closed OS mode | `linux-openat2`, `macos-handle-walk`, or `windows-handle-walk` |

Repository root creation opens process `.` directly. Global root creation occurs only
after matching preview consent and walks from the filesystem/volume root without following
components. Native enumeration alone creates tickets; static/derived classifiers may
select a ticket but may not create one. A derived value must match the ticket's exact
normalized segments. A failed identity/type/metadata check destroys the bytes and marks
the ticket stale or rejected. Canonical paths and JS path strings never reopen an item.

### StaticAssetManifest, ServerBundleManifest, and NativeRuntimeManifest

These are trusted packaged-build records, not inspection-source DTOs. The build/package
verifier resolves all three only from fixed package-root paths. At runtime the CLI resolves
the static and native manifests only from fixed URLs relative to its own `import.meta.url`;
`node:fs` may read and hash these package-owned files but may not use a manifest as an
inspected-source fallback. Runtime loaders reject an oversized document, malformed JSON,
duplicate/unknown/missing key, unexpected order, symlink, non-regular file, size/hash
mismatch, or package-version mismatch before server bind.

Before creating the static manifest, the fixed normalizer reads Nuxt's standard
`.output/public` staging tree, requires regular generated `200.html` and `404.html` files
but does not copy those redundant static-host fallbacks, and rejects any other HTML file
except `index.html`. It copies every other accepted regular file into a new `dist/public`;
the manifest describes every copied file and the packaged output contains neither alias.
The server assembler similarly reads only the clean `.build/server` staging tree and
copies exactly its manifest-listed regular `.mjs` files into `dist/`.

| Entity / field | Type | Rules |
|---|---|---|
| `StaticAssetManifest` | strict JSON, at most 2 MiB | Exact keys `manifestVersion`, `packageVersion`, `shellPath`, `assets`, `inlineScriptSha256` |
| `StaticAssetManifest.manifestVersion` | literal `1` | No compatibility guessing |
| `StaticAssetManifest.packageVersion` | semver string, at most 64 UTF-8 bytes | Equals the version embedded from the packed `package.json` |
| `StaticAssetManifest.shellPath` | literal `/index.html` | Exact SPA fallback bytes |
| `StaticAssetManifest.assets` | 1..4,096 ordered unique records | Sorted by `requestPath`; every post-normalization generated regular file appears exactly once |
| `StaticAssetRecord` | closed object | Exact keys `requestPath`, `file`, `byteLength`, `sha256`, `mediaType` |
| `StaticAssetRecord.requestPath` | root-absolute URL path, at most 512 UTF-8 bytes | No query, fragment, dot segment, encoded separator, malformed escape, or external origin |
| `StaticAssetRecord.file` | exact `public/...` relative path | Must be the unique lexical counterpart of `requestPath`; no separator alias or traversal |
| `StaticAssetRecord.byteLength` / `sha256` | non-negative integer / 64 lowercase hex | Verified against packaged bytes before bind |
| `StaticAssetRecord.mediaType` | closed MIME enum | Determined at build time by the same fixed extension table used by the host; HTML is legal only for `/index.html` |
| `StaticAssetManifest.inlineScriptSha256` | 0..32 unique ordered 44-character base64 hashes | SHA-256 of each exact executable inline-script byte sequence in `/index.html`; no executable attribute, `<base>`, nonce, external URL, or unrecorded inline script passes the build |
| `ServerBundleManifest` | strict JSON, at most 1 MiB | Exact keys `manifestVersion`, `packageVersion`, `assets` |
| `ServerBundleManifest.manifestVersion` | literal `1` | No compatibility guessing |
| `ServerBundleManifest.packageVersion` | semver string, at most 64 UTF-8 bytes | Equals the same packed-package version |
| `ServerBundleManifest.assets` | 2..256 ordered unique records | Sorted by `file`; includes `cli.mjs`, `parser-worker.mjs`, and every tsdown code-split chunk exactly once; total listed bytes at most 64 MiB |
| `ServerBundleRecord` | closed object | Exact keys `file`, `byteLength`, `sha256` |
| `ServerBundleRecord.file` | normalized relative `.mjs` path, at most 256 UTF-8 bytes | No absolute path, empty/dot segment, separator alias, traversal, or `public`, `native`, or `manifests` top-level collision |
| `ServerBundleRecord.byteLength` / `sha256` | non-negative integer / 64 lowercase hex | Verified against staged bytes before copy and packaged bytes before pack; each file at most 16 MiB |
| `NativeRuntimeManifest` | strict JSON, at most 64 KiB | Exact keys `manifestVersion`, `packageVersion`, `nativeAbiVersion`, `nodeApiVersion`, `targets` |
| `NativeRuntimeManifest.packageVersion` | semver string, at most 64 UTF-8 bytes | Equals the same embedded packed-package version |
| `NativeRuntimeManifest.manifestVersion` / `nativeAbiVersion` / `nodeApiVersion` | literals `1` / `1` / `10` | `process.versions.napi` must be a canonical decimal string whose parsed integer is at least 10; addon report must match both ABI values |
| `NativeRuntimeManifest.targets` | exactly eight ordered `NativeTargetRecord`s | IDs in order: `darwin-x64`, `darwin-arm64`, `win32-x64`, `win32-arm64`, `linux-x64-gnu`, `linux-arm64-gnu`, `linux-x64-musl`, `linux-arm64-musl` |
| `NativeTargetRecord` | closed object | Exact keys `targetId`, `file`, `byteLength`, `sha256`; `file` is exactly `<targetId>/safe-fs.node`; length/hash use the rules above |

After all assembly, the recursive expected set is exactly the three manifest files,
every `public/...` path listed by `StaticAssetManifest`, every server path listed by
`ServerBundleManifest`, and every `native/<target.file>` listed by
`NativeRuntimeManifest`. The final verifier rejects any difference, including a stale
regular file, unlisted chunk/prebuild, symlink, directory in place of a file, or other
platform-safe non-regular object. Package tests apply the same set to the unpacked tarball.

The native loader maps `process.platform`/`process.arch` to one listed OS/architecture.
For Linux it calls `process.report.getReport()` once: a well-formed header with a non-empty
string `glibcVersionRuntime` selects `gnu`, a well-formed header where that field is absent
selects the `musl` candidate, and an unavailable API, thrown call, non-object header, or
present empty/non-string field is unsupported. It verifies and loads exactly the selected
artifact with a fixed package-owned loader, then requires the addon's target/ABI report and
self-test to pass. It never probes a second target, libc variant, filename, ABI, download,
build, or path-based implementation.

### GlobalConsentPreview

The capability-protected consent route creates this preview from the process environment
and default-home value using lexical path operations only. Creating or returning it does
not call `stat`, `realpath`, directory enumeration, or file reads under any proposed Global
root.

| Field | Type | Rules |
|---|---|---|
| `previewId` | 256-bit random opaque string | Process-memory lookup key; a new preview invalidates the previous unconsented preview |
| `previewDigest` | keyed SHA-256 | Covers the canonical encoding of every field below plus `sessionId`; compared in constant time and never accepted from another process |
| `allowlistVersion` | date string | Current shipped contract version |
| `entries` | exactly three tool entries | Fixed Copilot, Claude, and Codex order |
| `entries[].tool` | tool enum | Closed value |
| `entries[].origin` | `default-home \| environment` | An environment entry is used even when invalid; no silent fallback |
| `entries[].displayRoot` | escaped lexical absolute/invalid value or null | Exact proposed root shown when bounded; null only for `oversized`, never a canonicalization claim |
| `entries[].pathPatterns` | non-empty fixed relative-pattern array | Exact instruction candidates beneath that root; no neighboring customization classes |
| `entries[].inputState` | `eligible \| present-empty \| relative \| invalid \| oversized` | Determined before I/O; only `eligible` may become a boundary after consent |
| `excludedRuleIds` | sorted excluded rule ID[] | Drives the displayed exclusions without accepting authored prose |

The host counts the proposed root's UTF-8 length incrementally and stops after 32 KiB
without constructing another copy. For an in-limit value it escapes incrementally and
stops before output would exceed 192 KiB. Either overflow sets `inputState: oversized` and
`displayRoot: null`, performs no normalization/canonicalization/root creation/read, and
causes the UI to show only the fixed localized `global.previewTooLarge` message. The user
must correct the environment and request a new preview. The digest uses length-prefixed
UTF-8 fields, fixed enum encodings, and the listed array order. It binds an in-limit
`displayRoot` as the exact escaped lexical UTF-8 bytes without Unicode normalization, or
explicitly binds null plus `oversized`; fixed registry strings are already canonical NFC.
It contains no filesystem-derived value. An in-limit invalid
environment value is escaped and displayed but is not normalized into an authorized path.

### GlobalConsent

| Field | Type | Rules |
|---|---|---|
| `allowlistVersion` | date string | Must equal the displayed current contract |
| `previewId` / `previewDigest` | opaque strings | Must match the current in-memory preview exactly |
| `confirmedTools` | tool enum[] | Only `eligible` tools whose exact non-null paths were shown; never `oversized` |
| `confirmedAt` | ISO timestamp | Memory only |
| `active` | boolean | Cleared when Global inspection is disabled |

Consent authorizes only the paths shown in the allowlist contract. It does not authorize
neighboring settings, credentials, state, skills, plugins, or arbitrary env paths.
After confirmation, each eligible lexical root is canonicalized without following a
candidate entry. The tool is rejected with a safe diagnostic before enumeration if the
canonical root is not component-identical to the displayed lexical absolute root,
including any symlink, junction, case, Unicode-normalization, or short-name alias. The
application never silently substitutes the canonical target or broadens consent; the user
must correct the configured root and request a new preview.

### OfficialSourceRecord

`tests/fixtures/conformance/official-sources.json` is immutable release/test data, never
input from the inspected repository and never fetched during product startup or scanning.

| Field | Type | Rules |
|---|---|---|
| `sourceId` | stable dotted string | Unique; every behavior, rule, and strategy `sourceRefs` entry resolves only to this key |
| `canonicalUrl` | absolute HTTPS URL | Exact authored URL on `officialHost`; no credentials, query, or fragment |
| `officialHost` | lowercase DNS hostname | Exact per-record host allowlist; the URL and every permitted redirect hop must match it exactly, with no implied subdomain or sibling host |
| `sectionAnchors` | 1..16 exact heading-text strings | Exact rendered heading text only, each at most 256 UTF-8 bytes; no heading ID, URL fragment, CSS/XPath, or other executable selector |
| `affectedBehaviorIds` | sorted behavior ID[] | Reciprocal with every referenced `VendorBehaviorStatement.sourceRefs` entry |
| `affectedRuleIds` | sorted rule ID[] | Reciprocal with every referenced `InspectionRule.sourceRefs` entry |
| `affectedStrategyIds` | sorted strategy ID[] | Reciprocal with every referenced `RuntimeCompositionStrategy.sourceRefs` entry |
| `reviewedOn` | ISO date | Updated only after human semantic review |
| `normalizationVersion` | literal `1` | Selects the checked-in deterministic normalization algorithm |
| `snapshotFingerprint` | lowercase SHA-256 | Digest of normalized text from only the selected official sections |
| `assertions` | 1..64 maintained assertion[] | Stable assertion ID, paraphrased expected semantics up to 1,024 UTF-8 bytes, and affected behavior, rule, or strategy IDs; never copied page text |
| `semanticFingerprint` | lowercase SHA-256 | Digest of canonical JSON for sorted maintained assertions |

The offline contract test validates IDs, reciprocal contract-record links, exact official hosts, bounds,
and recomputes `semanticFingerprint`; it never contacts the network. The explicit
maintainer drift command sends no credentials, cookies, repository data, or other local
state. Per source it allows 10 seconds, 2 MiB after decompression, UTF-8 HTML/Markdown, and
at most three HTTPS redirects whose every hop remains on the source's allowlisted official
host. A redirect to a different final URL is reported for review rather than silently
changing `canonicalUrl`; downgrade, cross-host redirect, wrong content type, oversize,
missing/duplicate anchor, or decode failure is a hard drift-check failure.

Normalization selects each anchored heading through the next heading of equal or higher
level, removes document chrome plus script/style nodes, preserves prose and code text,
decodes entities, applies Unicode NFC and LF endings, trims line edges, collapses horizontal
whitespace, and joins sections in listed order before SHA-256. A digest or assertion drift
never changes a behavior, rule, or strategy automatically. A maintainer reviews all affected contract records and both
language contracts/research, then explicitly updates anchors, assertions, fingerprints,
and `reviewedOn`; no remote page text or response body is checked in.

At least one affected-ID array is non-empty. Every assertion names a non-empty subset of
that record's reverse-indexed behavior, rule, or strategy IDs rather than a generic product area. The map contains at most 128
source records. An out-of-bound or unsupported record fails
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
| `relativeSelector` | bounded vendor-relative string or null | Path text only; does not contain Inspector glob semantics or grant authority |
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
| `operations` | 1..4 ordered closed enum[] | Each entry is `append \| concatenate \| select-first \| select-closest \| replace \| merge-map \| deduplicate \| filter \| unknown-order`; array order is the documented pipeline order |
| `inputBehaviorRefs` | non-empty sorted behavior ID[] | Only documented inputs; excluded/user/hosted inputs remain explicit conditions |
| `requiredConditionKeys` | condition-key enum[] | Every input required before a terminal applicability result is permitted |
| `documentationStatus` | documentation-status enum | Ambiguous/conflicting order never becomes a fabricated winner |
| `sourceRefs` | non-empty source ID[] | Reciprocal official evidence for the operations |

Strategies are immutable contract data. They can explain or project an applicability
assessment, but cannot enumerate a directory, open a relationship target, or merge the
Inspector's Repository and Global sources.

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
| `matcher` | structured Inspector matcher or null | Static rules only: exact source Base, `./`-prefixed Repository selector (or consented Global-relative selector), and closed expansion mode; never a vendor locator or executable glob |
| `derivation` | closed typed-edge descriptor or null | Present only for bounded-derived rules |
| `behaviorRefs` | sorted behavior ID[] | Exact upstream lookup statements relevant to this policy; exclusions may reference documented User behavior without authorizing it |
| `policyRefs` | non-empty sorted specification ID[] | FR/QR clauses that authorize or intentionally exclude the surface |
| `strategyRefs` | sorted strategy ID[] | Composition facts used for order/applicability, never for path admission |
| `conditionKeys` | condition-key enum[] | Runtime facts needed before applicability can be assessed |
| `precedenceGroup` | stable string or null | Links only rules with documented selection/order semantics |
| `documentationStatus` | `documented \| ambiguous \| conflict \| experimental \| deprecated` | Describes the upstream rule, not runtime state |
| `sourceRefs` | non-empty `OfficialSourceRecord.sourceId`[] | Exact direct Evidence-cell sources for this rule, reciprocally validated. Evidence owned by referenced behaviors or strategies remains reachable through those IDs and is not silently copied into this registry field |

The build/contract validator checks uniqueness, legal field combinations, referenced rule
IDs, typed-derivation acyclicity, and exact fixture agreement before packaging. The runtime
loader checks the embedded registry schema, integrity, and contract version before
scanning. There is no repository-provided plugin for adding rules.

### ScanGeneration

| Field | Type | Rules |
|---|---|---|
| `generation` | non-negative integer | Unique and monotonic within the process; `0` is reserved for bootstrap |
| `baseGeneration` | non-negative integer | `0` for bootstrap; otherwise the active generation from which the serialized transaction started |
| `transactionKind` | `bootstrap \| repository-scan \| global-scan \| global-disable` | Closed transaction classification |
| `scannedSourceId` | opaque source ID or null | One source for either scan kind; null for bootstrap and zero-I/O Global disable |
| `startedAt` / `finishedAt` | timestamp | `finishedAt` absent while scanning |
| `outcome` | `complete \| partial` | Partial requires a limit/diagnostic; a fatal attempt is never a generation |
| `files` | `CustomizationFile[]` | All enabled sources, deterministically sorted by source, normalized path, then ID |
| `diagnostics` | `Diagnostic[]` | At most 10,000, including overflow sentinels, and secret-safe |
| `counters` | `ScanProgress` or null | Required for a source scan and bounded by configured limits; null for zero-I/O bootstrap/disable |

Generation 0 is created synchronously at process start with `baseGeneration: 0`,
`transactionKind: bootstrap`, null `scannedSourceId`/`counters`, equal
`startedAt`/`finishedAt`/session `createdAt`, `outcome: complete`, and empty files and
diagnostics. It is a legal readable base, not evidence that a Repository scan succeeded.
The automatic first Repository scan starts from 0; if it fails fatally, generation 0 stays
active and the failure is reported through the bounded session-lifecycle channel.

A single `ScanCoordinator` serializes Repository scan, Global scan, and Global-disable
transactions; two source scans never execute concurrently. Ordinary source commands are
FIFO. Global disable is a priority barrier: it aborts and discards the active uncommitted
transaction, cancels queued Global commands, and places a zero-I/O disable transaction
next. An interrupted Repository command is requeued exactly once immediately behind the
barrier with fresh counters; an interrupted Global command is not requeued. A second
disable while that barrier is queued or active joins the same completion and creates no
additional transaction. If no Global enabled flag, consent record, nonempty graph, open
root capability, or running/queued Global scan/enable command exists, disable is an
immediate no-op regardless of unrelated Repository work. A transaction
starts from the then-current generation N. It carries the unchanged source graph forward
and gives the scanned source only the remaining session-wide file-count, retained-byte, and generation-diagnostic
budgets, and builds the replacement off to the side. `maxVisitedEntries` and the deadline
apply to the active source job. A complete or contracted partial result commits exactly
N+1 atomically. Every source then reports N+1, every file/recognition/provenance/
relationship/mask ID—including IDs for an unchanged source—is regenerated, and all
comparison/reveal state is cleared. A Global-disable transaction removes the Global graph
under the same commit rule without filesystem I/O.

A fatal attempt never creates or partially merges a `ScanGeneration`: N and every prior
ID remain active. Expected cancellation by a Global-disable barrier emits no failure
diagnostic; a different bounded safe failure is an out-of-generation session-lifecycle
diagnostic that may carry `sourceId` for display but never enters `Source.diagnosticIds` or
the source/generation caps. The coordinator then starts the next queued transaction from
the still-current N. At most one scan command per source is running or queued; duplicate
scan commands return the documented conflict. Disable uses the join/no-op rules above and
is not a duplicate scan command.

### ScanProgress

| Field | Type | Rules |
|---|---|---|
| `phase` | `waiting \| cancelling \| enumerating \| reading \| deriving \| recognizing \| complete` | `waiting` means queued; `cancelling` means a disable/shutdown abort is draining; neither contains a path or source content |
| `visitedEntries` | non-negative integer | Maximum 200,000 |
| `candidateFiles` | non-negative integer | Maximum 2,000 accepted items |
| `readBytes` | non-negative integer | Maximum 32 MiB |
| `diagnosticCount` | non-negative integer | Accepted count including sentinels; maximum 10,000 |
| `queuedAt` | timestamp or null | Set when an accepted command waits behind another transaction; cleared when work begins |
| `startedAt` | timestamp or null | Source-scan start, or disable acceptance for barrier-owned progress; null while idle or waiting |

`Source.progress` is null in `idle` and `failed`. For `scanning`, `waiting`
requires non-null `queuedAt` and null `startedAt`; an active phase requires null `queuedAt`
and non-null `startedAt`. `disabling` exposes the relevant `cancelling` progress while a
barrier drains. A committed `ready`/`partial` source retains its final `complete` progress
with null `queuedAt` and non-null `startedAt`. Bootstrap has no source progress.

On disable acceptance, Global immediately becomes `disabling` and its progress has null
`queuedAt`. If the drained job is a Global scan, its current bounded counters and original
scan `startedAt` are preserved while only `phase` changes to `cancelling`. Otherwise
Global exposes barrier-owned `cancelling` progress with all four counters zero and the
disable-acceptance time in `startedAt`. A concurrently drained
Repository scan preserves its own counters/`startedAt`, clears `queuedAt`, and changes only
its phase to `cancelling`. After the single disable commit, the Global Source is removed;
an interrupted Repository command reappears with zero counters, `phase: waiting`, non-null
`queuedAt` at requeue, and null `startedAt`. Joined disable requests reuse all of these
values and never create another progress record. The committed disable generation still
has null `counters` because the barrier performs no source I/O.

### CustomizationFile

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `fileId` | 128-bit, 22-character base64url opaque string | DTO | Newly generated for every generation; API never accepts a path |
| `sourceId` / `boundaryId` | opaque string | DTO | Must identify an enabled boundary |
| `relativePath` | normalized POSIX-style path | DTO | No leading slash, NUL, empty segment, or `..`; control characters escaped for display |
| `aliasPaths` | normalized path[] | DTO | At most 1,024 other allowlisted hard-link paths for the same identity, sorted; symlinks are never aliases |
| `identity` | final-handle identity from `SafeReadReceipt` | internal | Used only for alias/race detection; never treated as durable |
| `safeReadReceipt` | `SafeReadReceipt` or null | internal | Present only for an accepted readable file and never serialized |
| `readState` | file read-state enum | DTO | See states below |
| `parseStatus` | `not-applicable \| not-attempted \| parsed \| partial \| malformed` | DTO | Metadata extraction only; never a vendor validation result |
| `sizeBytes` | integer or null | DTO | At most 1 MiB for readable files |
| `encoding` | `utf-8 \| utf-8-bom \| unsupported \| binary \| unknown` | DTO | Invalid text remains diagnostic-only |
| `maskedText` | string or null | DTO | Exact source with mask placeholders; never HTML |
| `contentDigest` | keyed per-session digest | internal | Detects stale content without exposing a reusable content hash |
| `recognitionIds` | opaque string[] | DTO | At least one for an accepted customization file |
| `relationshipIds` / `diagnosticIds` | opaque string[] | DTO | Refer to the same generation; diagnostics are accepted under the 128-entry file limit |

Read states are `readable`, `unreadable`, `oversized`, `binary`,
`unsupported-encoding`, `masking-overflow`, `stale`, `unsafe-link`,
`boundary-rejected`, and `limit-skipped`.
A file with `parseStatus: malformed` may still have `readState: readable` and show masked
source; the diagnostic describes only metadata extraction, not validity for the vendor.
`masking-overflow` is non-readable: `maskedText` is null, `masks` and metadata are empty,
`parseStatus` is `not-attempted`, the decoded/raw content is dropped immediately, and the
file is ineligible for comparison and reveal.

### ToolRecognition

| Field | Type | Rules |
|---|---|---|
| `recognitionId` | opaque string | Unique within generation |
| `fileId` | opaque string | Many recognitions may reference one physical file |
| `provenances` | `CandidateProvenance[]` | Sorted, non-empty set of rule/path admissions for this shared tool/kind interpretation; maximum 2,000 |
| `tool` | `copilot \| claude \| codex` | Required |
| `kind` | closed customization-kind enum | Instructions, rule, skill, agent, prompt/command, hook, MCP, settings/config, output style, plugin, marketplace, or skill metadata |
| `metadata` | bounded JSON-safe map | Only allowlisted keys; at most 512 entries and 64 KiB per scalar; secret values masked recursively |

The customization-kind enum is shared, but each recognizer owns its path and interpretation
rules. A shared `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, skill, or marketplace therefore stays
one file with multiple recognitions. Provenances may share a recognition only when tool,
kind, and parsed content meaning agree; path-specific scope, order, documentation status,
and applicability never use a lossy recognition-level aggregate.

### CandidateProvenance

| Field | Type | Rules |
|---|---|---|
| `provenanceId` | opaque string | Unique within generation and its owning recognition; used to anchor path-relative relationships |
| `discoveryClass` | `static-candidate \| bounded-derived-candidate` | Relationship/excluded rules can never appear here |
| `ruleId` | stable inspection-rule ID | One shipped rule that admitted the owning recognition |
| `matchedPath` | normalized source-relative path | Exact candidate path admitted by this rule; must be the file's primary or alias path |
| `seedFileId` | opaque string or null | Required for a derived candidate; null for static candidates |
| `seedRuleId` | stable rule ID or null | Independently admitted static-candidate provenance that is not known unsatisfied/shadowed; an unresolved seed yields only conditional output |
| `depth` | integer `0..1` | Static is zero; derived is one |
| `declarationKey` | closed field/component identifier or null | Never contains an arbitrary unmasked value |
| `scope` | structured scope descriptor | Repository/global, directory, matching path, or declared scope for this admission without evaluating it |
| `documentationStatus` | documentation-status enum | Copied from this rule; distinct from runtime applicability |
| `applicability` | `ApplicabilityAssessment` | Conditions and summary for this rule/path/seed admission only |
| `order` | structured order descriptor or null | Only documented broad-to-narrow/fallback facts for this admission |
| `behaviorRefs` | `VendorBehaviorStatement.behaviorId`[] | Copied from this rule; identifies the applicable surface lookup statements |
| `strategyRefs` | `RuntimeCompositionStrategy.strategyId`[] | Strategies actually considered for this provenance's order/applicability |
| `sourceRefs` | `OfficialSourceRecord.sourceId`[] | Exact validated evidence union for this provenance rather than an ambiguous product aggregate |

Provenances are deduplicated by source identity, `matchedPath`, `ruleId`, `seedFileId`,
`seedRuleId`, and `declarationKey`; declarations from two seeds are never collapsed. A file
admitted by both static and derived rules is read once and retains both entries. Every
derivation provenance is one typed edge and cannot seed another edge. An independent
static provenance on that same physical file remains eligible to seed its own typed rule.
The stable array order is `matchedPath`, `ruleId`, the nullable seed's stable
source/boundary/path key and `seedRuleId`, then nullable declaration key; opaque file and
provenance IDs never determine order. Overflow stops further admissions and makes the
generation partial.

For each independently admitted static seed provenance, typed extractors enumerate by
derivation `ruleId`, closed declaration field, then zero-based source occurrence. After
validation, targets are deduplicated by the seed's stable provenance key, derivation rule,
normalized target, and declaration key; the earliest occurrence wins. The first 128
distinct targets may proceed through normal candidate/safe-read limits. Encountering the
129th stops derivation for that seed before any target stat/read, makes the generation
partial, and offers one fixed-code diagnostic candidate to the diagnostic aggregator. A
known unsatisfied/shadowed seed emits none; an unresolved eligible static seed emits only
conditional candidates; a bounded-derived provenance never enters this algorithm.
Validation occurs before native ticket lookup and applies the contract's
platform-independent NFC segment grammar, exact enumerated-entry match, and canonical
component-identity check. ADS/device/trailing-dot-space/case/normalization/8.3 aliases are
therefore rejected without opening them, even on a host where that spelling would resolve.

### ApplicabilityAssessment

| Field | Type | Rules |
|---|---|---|
| `summary` | `authored \| available \| selected \| omitted \| shadowed \| disabled \| conditional \| unknown` | Convenience projection only; never called `effective` |
| `conditions` | `ConditionFact[]` | Maximum 64, sorted/deduplicated by key, reason code, basis, then status; no missing input defaults to true |
| `strategyRefs` | sorted strategy ID[] | Strategies used by the projection; empty when only authorship is known |
| `evaluatedFromGeneration` | integer | Prevents facts from surviving a rescan |

Each `ConditionFact` has a `key` (`surface`, `engine-version`, `runtime-cwd`,
`workspace-root`, `repository-root`, `project-root`, `worked-path`, `target-match`,
`scope-availability`, `feature-state`, `trust`, `approval`, `enablement`, `selection`,
`settings-inputs`, `plugin-state`, `agent-context`, `event`, `content-limits`,
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

### Relationship

| Field | Type | Rules |
|---|---|---|
| `relationshipId` | opaque string | Unique within generation |
| `fromFileId` | opaque string | Required |
| `fromRecognitionId` | opaque string | Required; must belong to `fromFileId` and own `fromProvenanceId` |
| `fromProvenanceId` | opaque string | Required; its `matchedPath` is the sole base for path-relative normalization |
| `ruleId` | stable relationship-only rule ID | Proves that the reference can never authorize a read |
| `kind` | `import \| declared-component \| skill-resource \| plugin-source \| agent-reference \| context-inheritance \| runtime-reference \| order \| fallback` | Descriptive only |
| `rawTargetMasked` | string | Secrets/control characters masked or escaped |
| `normalizedTarget` | source-relative string or null | Set only when lexical normalization is safe |
| `boundaryStatus` | `inside \| outside \| invalid \| unknown` | Does not authorize a read |
| `resolutionStatus` | `not-followed \| independently-admitted \| missing \| rejected` | A relationship itself never expands content |
| `documentationStatus` | documentation-status enum | Runtime-dependent or conflicting references stay explicit |
| `behaviorRefs` | sorted behavior ID[] | Surface-specific upstream statements that permit describing this edge |
| `strategyRefs` | sorted strategy ID[] | Composition/selection strategies considered for the edge |
| `sourceRefs` | sorted source ID[] | Exact evidence union from the relationship rule, behavior, and strategy records |
| `applicability` | `ApplicabilityAssessment` | Edge-specific context/tool/trust/selection facts; never read authority for the target |

Relationships are direct only. Maximum depth is one and maximum count is 1,000 per file.
A candidate target is independently admitted by a static or bounded-derived rule; a
relationship itself never promotes the target. Typed candidate derivation is modeled in
`CandidateProvenance`, has separate depth/count limits, and is not relationship traversal.
The relationship summary describes only whether the reference edge may be available or
selected under known product rules; it never describes target-file effectiveness.

An extracted reference is emitted once per applicable candidate provenance, so hard-link
aliases or distinct rule admissions never borrow another provenance's directory as the
relative base. Every extractor assigns an internal origin key made only from a closed declaration-field
identifier and a zero-based source or deterministic synthetic occurrence; it contains no authored field value and is
never serialized. The deduplication key is `fromFileId`, `fromRecognitionId`,
`fromProvenanceId`, `ruleId`, `kind`, the origin key, and a target identity. That identity is the normalized target when available and otherwise
a process-keyed digest of the unmasked target that never leaves memory or enters logs.
Extractors emit by the originating provenance's stable array key, recognition tool/kind,
relationship `ruleId`/kind, declaration-field identifier, then source-occurrence order.
Opaque IDs never participate in ordering. On the 1,001st distinct edge, extraction for
that file stops, the first 1,000 remain
in that order, the generation becomes partial, and one fixed-code limit diagnostic is
offered to the diagnostic aggregator. If an outer diagnostic cap suppresses it, that cap's
fixed sentinel represents the suppression. No target is opened while deciding retention.

### Mask

| Field | Type | Visibility | Rules |
|---|---|---|---|
| `maskId` | opaque string | DTO | Newly generated for every scan |
| `fileId` | opaque string | DTO | Same active generation |
| `kind` | secret kind enum | DTO | Generic labels only, not secret-bearing key text |
| `placeholder` | string | DTO | Stable within one masked view |
| `start` / `end` | byte or code-point offsets | internal | Validated against the authoritative decoded source |
| `rawValue` | string | internal | Never included in normal DTOs, diagnostics, or logs |

Reveal returns one `rawValue` only after explicit action for `fileId` + `maskId`. The
browser keeps the revealed value only in the open file view. Closing the file, changing
generation, disabling Global, or ending the process clears it.

Mask detectors are fixed, repository-independent, bounded linear scanners. Candidates are
emitted in source-offset, detector-priority, then longest-match order; overlaps are merged
before placeholders are built. Encountering a 4,097th candidate match or discovering that
the UTF-8 masked output would exceed 2 MiB aborts masking before any DTO is published. The
server does not keep a prefix, placeholder-only approximation, metadata parse,
relationship, or derived declaration for that file: it applies `masking-overflow`, drops
all raw/decoded content and mask values, makes the generation partial, and emits only a
fixed safe diagnostic subject to the diagnostic caps. This fail-closed state prevents an
unscanned suffix from reaching a normal source, metadata, comparison, diagnostic, or
reveal response.

### Diagnostic

| Field | Type | Rules |
|---|---|---|
| `diagnosticId` | opaque string | Unique within generation/session |
| `code` | stable closed code | Suitable for objective tests and documentation links |
| `severity` | `info \| warning \| error` | Does not imply vendor validation |
| `sourceId` / `fileId` | optional opaque IDs | Scope without accepting paths from the client |
| `messageKey` | localized key | English/Japanese messages remain equivalent |
| `safeArgs` | bounded JSON-safe map | No raw source, secret, arbitrary exception string, or outside path |
| `nextStepKey` | localized key | Every error identifies a practical next action |

The closed diagnostic-code registry fixes severity, message/next-step keys, and a
code-specific argument schema; `safeArgs` has at most 16 scalar entries and any string is
at most 256 UTF-8 bytes after masking/escaping. Candidates are deduplicated by code,
source/file IDs, and canonical safe arguments. They are emitted in fixed phase,
source/boundary, normalized file path, rule/code, then emitter-occurrence order; opaque IDs
never determine retention.

Before aggregation, each candidate is assigned exactly one lifetime class. A scan
candidate belongs to one `ScanGeneration` and passes every applicable file, source, and
generation cap; those aggregators reserve their final slots and retain at most 127, 4,999,
and 9,999 detail diagnostics. An out-of-generation lifecycle candidate—including a fatal
scan attempt that cannot be committed—belongs to the session only, passes the separate
session cap, and is never inserted into a generation or source ID list. Authentication,
malformed-request, and other client-caused API errors are returned but not retained as
diagnostics. The session aggregator reserves its final slot and retains at most 1,023
lifecycle details.

Until overflow, a reserved slot is unused. On the first distinct candidate beyond an
applicable detail allowance, that slot receives the fixed `diagnostic-limit-file`,
`diagnostic-limit-source`, `diagnostic-limit-generation`, or
`diagnostic-limit-session` sentinel with a saturating 32-bit suppressed count; later
details are counted and suppressed. Only diagnostics that survive every applicable cap
appear in `diagnostics` or an ID list. Scan-class overflow makes its generation partial.
Session-class overflow retains only the session sentinel and never mutates the prior active
generation.

Unknown internal exceptions are mapped to a generic code and correlation ID held only in
memory; stack traces and raw parser errors are never sent to the browser by default.
The closed registry includes `safe-fs-backend-unavailable`,
`safe-fs-unsupported-target`, `safe-fs-root-rejected`,
`safe-fs-link-or-reparse-rejected`, `safe-fs-mount-rejected`,
`safe-fs-entry-stale`, and `safe-fs-handle-metadata-changed`. Their arguments contain no
OS error text, outside path, native handle, or source bytes.

### BrowserState

This state is not authoritative and is never persisted.

- `FilterState`: selected source/tool/kind and path query.
- `ComparisonSelection`: zero or exactly two readable `fileId` values from the active
  generation. Monaco compares masked source text; Vue compares typed recognition metadata
  fields without serializing them into source text.
- `EditorModelState`: generation-scoped Monaco models with opaque in-memory URIs and
  masked text only. The owning editor, subscriptions, and every model are disposed
  independently on route close, selection replacement, file removal, source disable, or
  generation change.
- `RevealedValue`: `fileId`, `maskId`, and returned value for the currently open view.
  It is dropped on route close, file removal, source disable, or generation change.

## State transitions

### Repository source

```text
idle -> scanning (waiting or active) -> ready
                                    -> partial
                                    -> failed (bootstrap generation remains active)

ready/partial -> scanning (waiting or active) -> ready/partial
                                              \-> failed (prior generation remains active)

failed -> scanning (waiting or active) -> ready/partial
                                       \-> failed (same active generation remains)
```

### Global source

```text
absent -- consent preview --> absent (no Source or I/O)
absent -- accepted enable --> scanning (create enabled Source) --> ready/partial
                                                                  \-> failed
ready/partial/failed -- accepted rescan --> scanning --> ready/partial
                                                    \-> failed
scanning/ready/partial/failed -- disable --> disabling/cancelling barrier --> absent
```

Enabling requires a matching `GlobalConsent`. Disabling executes the coordinator barrier,
removes Global files, diagnostics, comparisons, raw bytes, masks, and revealed values, and
rekeys carried Repository entities before the next DTO is published.
The lexical consent preview is not a `Source`; the Global Source is created only when an
enable command is accepted and is absent again after the disable commit.
In every `failed` state the active bootstrap/prior generation remains readable and
`progress` is null; the capped lifecycle diagnostic explains the uncommitted attempt.
For Global specifically, a fatal enable/rescan attempt retains `enabled: true`, the exact
consent record, open accepted boundaries/capabilities, and any prior committed Global graph
so the user may explicitly rescan or disable. It never falls back to different roots.

### Customization file

```text
candidate -> readable + parsed/partial/malformed/not-applicable parse status
                     -> stale/removed on next generation
          -> unreadable/oversized/binary/unsupported-encoding
          -> masking-overflow
          -> unsafe-link/boundary-rejected/limit-skipped
```

No state transition writes to the source. Rescan creates new entities instead of mutating
old file records in place.

## Cross-entity invariants

1. Every DTO belongs to one active session and generation; IDs from older generations
   return `404 stale-resource`.
2. Exactly one Repository source exists and its boundary is the launch `cwd`, even if it
   is not a Git root.
3. Global is disabled in every new process and may contain only boundaries confirmed by
   the current allowlist consent.
4. Every accepted file path is authorized by a shipped static or typed bounded-derived
   rule and independently passes safe-read checks. A parsed value grants access only when
   it satisfies that exact derivation rule; relationships and excluded rules never do.
   Authorization selects an existing native `EntryTicket`; only its owning open
   `SafeRootCapability` may resolve/read it, and no path string can substitute for either.
5. A physical file has one `CustomizationFile` record per source/generation and any number
   of tool recognitions; accepted in-limit hard-link aliases remain visible in `aliasPaths`
   without duplicating raw content, and overflow is represented by the required partial
   result and diagnostic.
6. Normal API responses contain no raw unmasked value. Diagnostics, logs, progress,
   exceptions, and comparison metadata use already-masked or fixed data only.
7. Documentation status, authored/installed state, selection, trust, enablement, and other
   condition facts remain orthogonal and provenance-specific; none is collapsed into
   “effective configuration” or a lossy recognition-level winner.
8. Typed derivation is exactly one edge and at most 128 targets per seed; generic
   relationships and bounded-derived provenances never seed it. An independent static
   provenance remains eligible even when its physical file also has a derived provenance.
9. Every file-originated relationship names one recognition and one candidate provenance;
   only that provenance's `matchedPath` may be used as the base of a relative target.
10. All arrays, strings, parse work, comparison work, request bodies, filesystem work,
   derivation, and relationship extraction are bounded before allocation or processing.
11. Browser editor models use opaque in-memory identities, never filesystem or remote URLs,
   and never retain source beyond the active route and generation.
12. Every behavior, rule, strategy, and source ID is defined exactly once in its owning
    bilingual contract and executable registry. Registry `sourceRefs` arrays equal the
    owning row's direct Evidence cell and are reciprocal with the official-source reverse
    index. Runtime provenance and relationship DTOs may expose the deterministic union of
    those direct records for display, but that derived union never changes registry
    backlinks. A missing, duplicate, orphaned, or language-divergent record fails the build.
13. Vendor lookup bases/traversal and Inspector matchers are different record types. Every
    Repository matcher starts with `./`; bare `**/` is invalid, and `./**/` can mean only
    explicit downward Inspector inventory—not vendor traversal or runtime selection.
