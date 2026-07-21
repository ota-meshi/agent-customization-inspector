# Contract: SC-001/SC-006 Usability-Study Evidence

[日本語](usability-study-evidence.ja.md)

**Contract version**: 1
**Runtime**: the declared Node.js 24/26 contract
**Authority**: canonical bytes and closed sets, never parse-equivalent or manually described data

This contract closes the supplied-input, participant-distribution, continuous-capture, privacy,
handoff, and final-seal boundaries for the paired SC-001/SC-006 study. A failure invalidates the
complete paired evidence set. A failed SC-001 threshold never permits capture to stop or a
participant to be removed: SC-006 and all four observations still run, and release approval is
decided only after final verification.

## Canonical primitives

- `LF` is exactly byte `0x0a`. A lowercase SHA-256 is exactly 64 lowercase hexadecimal
  characters over the stated exact bytes.
- A safe integer is a JavaScript safe integer. A count is nonnegative; a version is positive.
- A canonical object is newly constructed in the stated property order, has exactly the stated
  properties, performs no Unicode normalization, and contains no `undefined`, accessor, proxy,
  inherited, or extra property.
- Manifest, fixture-descriptor, handoff, continuity-witness, and seal objects use
  `Buffer.from(JSON.stringify(value, null, 2) + '\n', 'utf8')`. Capture envelopes and their
  kind-specific safe payloads use compact
  `Buffer.from(JSON.stringify(value) + '\n', 'utf8')`. Byte-for-byte equality is authoritative.
- Runtime-control messages are newly constructed compact canonical objects. Their authenticated
  bytes omit the framing LF and reconstruct `authenticationTag` as literal `null`; their wire
  bytes append exactly one LF after the populated compact object. No other serializer is valid.
- `StudyOpaqueId` is exactly `[A-Za-z0-9_-]{43}`. It must strictly base64url-decode to exactly 32
  bytes and unpadded canonical base64url re-encoding must equal the original 43-character text;
  padding,
  whitespace, alternate alphabets, ignored characters, wrong length, and noncanonical encodings
  fail. Every harness/supervisor-generated opaque ID uses fresh cryptographically random bytes.
  This includes control-session/request/challenge/study/checkpoint/event/correlation/bootstrap/
  pre-readiness/readiness,
  browser-attempt, subject and Inspector-process IDs, and all capture/watchdog instance/process-run IDs whenever
  the field is not literal `not-applicable`. Allocations are pairwise distinct within the current
  run unless this contract requires the same semantic reference to repeat. Fresh cryptographic
  generation provides non-reuse and unlinkability across runs; the verifier requires exact
  uniqueness only within the current run and keeps no cross-run ID registry. An ID is never an OS PID, path,
  authority, participant response, raw-value encoding, or digest of a raw value.

## Closed study-input bundle

The manifest is `tests/usability/sc001-sc006-study-inputs.json`, its companion is
`tests/usability/sc001-sc006-study-inputs.sha256`, and `bundleRoot` is the exact literal
`tests/usability/sc001-sc006-study-inputs/`. The root is a direct-child-only closed directory.
Its recursive regular-file set and the manifest's path set are exactly these 16 members:

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

Each `prepared-state*.json` member includes one fresh `studyBrowserProfile` object. Its complete
property order is `profileId`, `playwrightVersion`, `browserEngine`, `browserRevision`,
`browserVersion`, `browserDistribution`, `operatingSystem`, `architecture`, `nodeVersion`, `headed`, `contextPersistence`,
`extensionSet`, `proxyConfigurationScope`, `proxyAuthenticationMode`. The exact values are,
respectively, literal `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`, `1.61.1`,
`chromium`, `1228`, `149.0.7827.55`, `chrome-for-testing`, `ubuntu-24.04`, `x64`, `24.18.0`, literal
`true`, `fresh-nonpersistent`, an empty array, `browser-context-only`, and
`single-407-basic`. The browser is headed and uses the Chromium revision installed by
Playwright 1.61.1: revision `1228`, browser version `149.0.7827.55`, Chrome for Testing distribution.
An installed system browser, persistent context, extension, different proxy
scope/authentication flow, platform, architecture, Node version, or profile ID is ineligible.
Profile verification may expose only the fixed `profileId`, a fixed pass/fail code, and the
already required canonical input/evidence digests. Browser revision paths, executable/profile
paths, configuration bytes, store contents, and equipment details remain runtime-only raw values.

The manifest root's complete property set and order are `manifestVersion`, `bundleRoot`,
`inputs`. `manifestVersion` is a positive safe integer starting at `1`; `bundleRoot` is the
literal above; and `inputs` contains exactly 16 fresh objects sorted by raw UTF-16 code units of
unique `inputId`. Each entry's complete property set and order are `inputId`, `role`, `path`,
`sha256`. A path is exactly `bundleRoot` plus one listed basename. Roles are closed to
`guidance | task-prompt | evaluation-fixture | prepared-state | response-form | ground-truth |
scoring-rubric`; every role has nonzero coverage and every bilingual pair has separate IDs,
paths, bytes, and digests. The companion contains only the lowercase SHA-256 of the exact
canonical manifest bytes followed by one LF.

Validation recursively enumerates without following links and compares sorted raw paths, not
normalized display names. No directory member is permitted below `bundleRoot`. The root and
every member must remain the same readable object from enumeration through open, hashing,
and post-read validation. Every regular member must have `nlink` exactly `1`; that condition
applies only to regular files, never to the root or another permitted directory. A symlink,
Windows junction/reparse alias, directory member, non-regular object, repeated or externally
aliased stable file identity, case-folded/NFC/canonical-path alias, root escape, missing or extra
member, byte drift, or unverifiable/ambiguous identity fails closed. Where the platform cannot
provide usable stable identity and regular-file link-count evidence, validation fails rather
than treating absence as safety. Directory identity must remain stable, but directory `nlink`
may have its normal platform value and is not required to equal `1`.

Only a successfully verified bundle may be supplied. Each participant distribution receives
byte-identical copies of all 16 members and no out-of-band guidance, prompt, form, ground truth,
rubric, fixture input, or generated sidecar. The read-only verifier re-enumerates the source and
all twenty supplied copies; it never trusts the builder's file list or digest output.

Every `participant-01` through `participant-20` distribution root has exactly two direct-child
directories, `study-inputs/` and `repository/`, and no other direct child. `study-inputs/` has
exactly the 16 direct-child basenames listed above, with bytes equal to the source bundle, and no
subdirectory. `repository/` has exactly the descriptor's `outputs[].path` regular-file set and
the proper directory-prefix set implied by those paths. A top-level file, third directory,
sidecar, collision between the two trees, link or identity alias, canonical/case/normalization
alias, or escape from either child root fails the complete twenty-distribution set. The packed
candidate, equipment configuration, capture runtime, and other session infrastructure are not
distribution members; they use their separate required bindings and cannot introduce another
supplied study-input byte.

### Deterministic participant fixture repositories

`evaluation-fixture.json` and `evaluation-fixture.ja.json` are canonical
`ParticipantFixtureRepositoryDescriptor` values, not labels for an unbound generator. Their
exact root property order is `schemaVersion`, `descriptorLocale`, `distributionIds`,
`materializer`, `verifier`, `captureHarness`, `outputs`.

- `schemaVersion` is literal `1`. `descriptorLocale` is respectively `en` or `ja`.
- `distributionIds` is exactly `participant-01` through `participant-20` in ascending order.
  These are slots, not participant identity or personal data.
- `materializer`, `verifier`, and `captureHarness` are fresh `RepositoryArtifactBinding`
  objects with exact order `path`, `sha256`. They bind, respectively, the exact raw bytes of
  `scripts/build-usability-study-inputs.mjs`,
  `scripts/verify-usability-study-evidence.mjs`, and
  `scripts/run-usability-study-capture.mjs`. Installed, downloaded, PATH-resolved, network-
  fetched, symlinked, or digest-mismatched substitutes are ineligible.
- `outputs` is nonempty and sorted by raw UTF-16 code units of unique `path`. Each fresh output
  object has exact order `path`, `contentEncoding`, `bytesBase64`, `sha256`.
  `contentEncoding` is `utf-8 | binary`; `bytesBase64` is canonical padded RFC 4648 base64;
  and `sha256` covers its exact decoded bytes. A `utf-8` value must decode strictly, but neither
  encoding permits normalization or transcoding. Paths are nonempty `/`-separated paths relative
  to the distribution's `repository/` root, with no absolute, backslash, empty, `.`, `..`,
  percent-encoded, or NUL segment.

Except for `descriptorLocale`, the two descriptors have exactly equal distribution IDs,
artifact bindings, output paths, encodings, represented bytes, and digests. The implied proper
directory-prefix set is the complete derived directory set and `outputs[].path` is the complete
derived regular-file set. For every one of the twenty fresh fixture repositories, the
materialized set and exact bytes must equal that descriptor, with no sidecar, implicit default,
hard-link/file-identity alias, normalized/case-folded/canonical alias, root escape, reused output,
or drift. All study-input and fixture-repository bytes inside a distribution are therefore bound
either by the 16-member manifest or by the nested fixture descriptor; there is no generated-byte
exception.

Exact `pnpm run study:evidence:inputs -- materialize` verifies the three artifact bindings and
uses only the bound materializer to create all twenty fresh distributions. Exact
`pnpm run study:evidence:verify -- inputs` independently and read-only verifies the source
bundle, both descriptors, all three script bindings, all twenty supplied bundle copies, and all
twenty derived fixture trees. Both commands must pass before enrollment or capture.

Each of the three bound scripts is a single-file trust boundary. Its source may contain only
literal static imports of `node:` built-ins. Local or package imports, dynamic `import()`,
`require`, `createRequire`, `eval`, `Function`, `vm`, a module-loader hook other than the one
explicitly allowed below, `process.dlopen`, and any other worker or child entry point fail
closed. The only execution exceptions are:

1. the materializer may execute the identity- and digest-verified bound capture script through
   `process.execPath` in its fixed internal supervisor mode;
2. the capture script may re-execute those same verified bytes through `process.execPath` only in
   the closed internal modes `supervisor`, `study-harness`, `scoring-moderator`, `reviewer-one`,
   `reviewer-two`, `product-instrumentation-adapter`, `inspector-server-ledger-adapter`,
   `study-browser-adapter`, `product-instrumentation-watchdog`,
   `inspector-server-ledger-watchdog`, and `study-browser-watchdog`;
3. the supervisor may directly execute, without a shell, the single exact participant-equipment
   command defined below in the subject's identity-verified distribution `repository/`; the
   resulting `npx`/Inspector process and only the package execution closure selected there are a
   narrow external-equipment exception and are not internal capture-script modes;
4. the same bound capture script may self-import as the sole exact
   `NODE_OPTIONS=--import=<bound-capture-script-file-url>` probe in that participant-equipment
   `npx` and Inspector process; and
5. the study-browser adapter may directly execute only the exact identity- and digest-verified
   pinned Chromium binary and prepared profile defined below. Chromium is the sole additional
   external-equipment child exception and is not an internal capture-script mode.

Every internal mode requires both inherited authenticated parent IPC sponsored by its current
verified parent and a fresh one-use bootstrap nonce. An invocation lacking that current-parent-
sponsored channel, or replaying a channel from another edge/run, fails. The capability protects
the current legitimate run from injection and replay; it does not claim to authenticate source
identity against a same-user process that deliberately creates a separate emulated run. Such a
process cannot join the current run because its endpoint, session, channel IDs, channel keys, and
nonces differ. Immediately before every permitted exec
or self-import, the caller reopens the script, proves stable identity, type, `nlink === 1`, and
the descriptor digest before and after reading, and compares the exact bytes to the binding.
No helper file, generated module, package resolution, alternate child program, or changed script
can become executable authority except the two exact external-equipment execution closures above.

## Work root, candidate, and retained layout

`INSPECTOR_STUDY_WORK_ROOT`, `INSPECTOR_STUDY_CONTROL_ENDPOINT`, and
`INSPECTOR_STUDY_CONTROL_TOKEN` are required, byte-identical environment bindings on
`materialize` and every command through `finalize`. The inputs phase must neither read nor
require the candidate or browser-proxy bindings. `INSPECTOR_STUDY_CANDIDATE_TARBALL` is required
from `start` through `finalize`. `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` is required from
`start` through `stop`, but `materialize`, `inputs`, and `finalize` must neither read nor require
it. A missing, newly introduced, or changed phase binding fails before phase work.

At `materialize`, the work-root value must be an absolute lexical path to an existing, empty
directory that the study setup provides as an ordinary local directory. Before any
work-root-derived I/O, the harness rejects every explicit UNC, server-share, device, or network
spelling recognized by the active platform. The directory must not be a symlink, junction,
reparse alias, or canonical alias. Public Node.js APIs cannot distinguish every lexically
ordinary pre-mounted or mapped filesystem; that remains the documented FR-022
platform/environment limitation and this contract does not claim locality proof for it.
Directory `nlink` is not required to equal `1`.

After verifying all three script bindings, the materializer starts the bound capture script in
internal supervisor mode before changing the initially empty work root. No work-root authority,
control-endpoint authority, control token, or derivative is inherited through environment or
argv. After the inherited channel's exact 96-byte bootstrap and the supervisor's authenticated
`ready` at child-to-parent sequence `0`, the materializer sends exactly one authenticated
`runtime-bootstrap` at parent-to-child sequence `0`. Its payload is exact
`StudySupervisorRuntimeBootstrap`. The supervisor validates the canonical values, independently
resolves and obtains a fresh current root identity equal to the transferred identity, verifies
the endpoint's local authority and absence, validates the canonical fresh token, creates its
stable control session and continuity state, and exclusively binds the endpoint before returning
the matching authenticated acknowledgement. Only acceptance of that acknowledgement authorizes
the materializer to mutate the still-empty root. The supervisor then records the root's exact
lexical path, canonical path, type, and stable identity baseline and persists through
`finalize-commit`. Each later command supplies the same raw lexical and canonical values in its
authenticated transient control request; the supervisor compares them byte-for-byte to its
baseline, independently resolves and stats the root, and requires unchanged identity before and
after the command. Replacement, unverifiable identity, aliasing, or escape fails closed.

The authorized materialize caller/study setup also supplies exactly four distinct bidirectional,
nonrecording external terminal-equipment handles to the materializer, mapped child-visible as
descriptor `6` participant, `7` moderator, `8` reviewer-one, and `9` reviewer-two. Before launch,
the materializer verifies that every handle is terminal equipment, that their stable equipment
identities are pairwise distinct, and that history, recording, transcript capture, and echo are
disabled. These four descriptors are a closed external-equipment exception, not an internal IPC
pipe/channel and not authority conveyed by environment, argv, path, or evidence. The materializer
inherits the same slots to the supervisor and closes all of its own copies only after the
supervisor's runtime-bootstrap acknowledgement. Missing, aliased, reordered, recording-capable,
echoing, or extra terminal equipment fails before retained mutation. Abort, crash, or failed
bootstrap closes every surviving copy and wipes every pending input buffer.

Raw lexical/canonical work-root authority may exist only in the materializer's transient input,
the one authenticated anonymous-pipe `runtime-bootstrap` frame, token-authenticated runtime-
control requests, and the supervisor's dedicated memory. Raw candidate authority may exist only
in the authorized post-input/pre-start candidate-store provisioner's transient input, an
authorized start-or-later caller's transient input, its token-authenticated runtime-control
request, and the supervisor's dedicated memory; it never enters `runtime-bootstrap`, the
provisioned store, or an internal child frame. Raw browser-proxy authority follows exactly this runtime-only, one-way route
and no other: `authorized start-through-stop caller transient input -> authenticated runtime-
control StudyLiveBinding -> supervisor dedicated memory -> exact one-use browser-proxy-binding
-> study-browser-adapter dedicated memory -> attempt-local DevTools control request/browser
context`. It never enters `runtime-bootstrap`. The caller and each transfer/control-request
buffer are wiped immediately after the matching response/ACK; the supervisor and adapter may
retain only their dedicated run-level copies until `stop`, and attempt-local DevTools request
bytes and browser proxy-auth cache are destroyed with that attempt context on normal close,
abort, crash, or terminalization. Covering the exact `runtime-bootstrap`,
`browser-proxy-binding`, authenticated runtime-control request, inherited-IPC frame
authentication, identity-commitment, and proxy-marker-install preimages explicitly enumerated in
this contract are the complete allowed secret/raw-authority HMAC preimages. No other holder,
copy, hash/preimage, capture-evidence IPC, digest, commitment, log, output, evidence field, or ID
encoding is permitted; the browser context is the only equipment-side raw-authority exception.
Each later caller drops its values when its one command exits, and all remaining run-level copies
are wiped at stop/failure or when the supervisor exits.

Materialization creates exactly `distributions/participant-01` through
`distributions/participant-20`, each with only the `study-inputs/` and `repository/` layout
defined above, plus the `capture/streams/` directories needed by capture. The only retained
capture files permitted over the lifecycle are:

```text
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

The three stream files are created by `start`; the handoff pair is created only by successful
`verify -- checkpoint`; and the witness and seal pairs are absent until successful
`verify -- finalize`, which creates the witness pair before the seal pair.
Before each phase, files not yet authorized for that phase must be absent. No other top-level
entry, distribution, stream, retained regular or non-regular artifact, PID/control/state file,
temporary file, log, crash dump, backup, lock, socket sidecar, or generated metadata is allowed.
Every retained regular file and every distribution file must have `nlink` exactly `1`; this
condition does not apply to any permitted directory.
The control endpoint is transient external local IPC, lexically and canonically outside the work
root, every distribution, and the candidate. On POSIX its value is an absolute Unix-domain
socket path. On Windows it is exactly `\\.\pipe\agent-customization-inspector-study-` followed
by 32 lowercase hexadecimal characters; remote and network pipe spellings are forbidden. TCP,
UDP, DNS, and every other network transport are forbidden. No endpoint, PID, socket, control,
or state sidecar may exist under the work root. The endpoint is absent before `materialize`, is
bound exclusively by that run's supervisor, resolves through no link/alias, remains the same
endpoint through `finalize-commit`, and is removed before final evidence creation.
Its raw spelling is used only by the materializer while constructing the one
`StudySupervisorRuntimeBootstrap`, by the supervisor/socket API, by later authorized callers from
their required environment, and in authenticated runtime-control requests. It is never a
capture-evidence payload, another digest/commitment preimage, retained value, log, output, or
evidence field.

The control token is exactly 32 fresh cryptographically random bytes per run, encoded as 43
unpadded base64url characters and distinct from every ID and the continuity key. It is used only
as the HMAC key for the closed protocol below. Its raw bytes/text may occur only in the
materializer's transient input, the one authenticated `StudySupervisorRuntimeBootstrap` payload,
the supervisor's dedicated memory, an authorized later command, and the inherited target-launch
chain until exact probe readiness. It is never placed in argv, retained state, a log, process
output, or evidence. The materializer and supervisor wipe the bootstrap transfer/frame copies
after acknowledgement. The sole emitted derivative is the per-message HMAC value in the root
`authenticationTag`; it exists only on that transient control exchange and is never a payload,
retained, logged, output, reused, or copied into evidence. Each process destroys or removes the
raw token at the earliest required boundary and on exit.

The candidate must be an absolute path to one existing, non-link regular file with usable stable
identity and `nlink` exactly `1`, lexically and canonically outside the work root and every
distribution. At `start` the supervisor stores its lexical and canonical authority and stable
identity while the capture controller hashes the exact bytes. Every later command through
`finalize` supplies the same transient authority; both the supervisor and independent verifier
reopen, stat, and hash that same stable object before and after work. Identity, link-count, type,
or byte drift fails. The candidate authority follows the same raw-value restrictions as the
work-root authority. Only its required lowercase digest and path-free commitment are retained.

`StudyRuntimeIdentityTuple` is an in-memory-only fresh object with exact order `platformClass`,
`objectType`, `device`, `inode`, `typeBits`. `platformClass` is `posix | windows`; `objectType` is
`directory | regular-file`; and the remaining three values are canonical nonnegative decimal
strings from one BigInt `lstat` snapshot. It contains no path, timestamp, byte count, digest,
PID, or OS handle. Each command obtains a fresh tuple and the supervisor compares it with the
stored initial tuple and separately required lexical/canonical values. Candidate `nlink === 1`
and digest stability remain separate mandatory checks.

`StudySupervisorRuntimeBootstrap` is a runtime-only fresh canonical object with exact root order
`schemaVersion`, `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`,
`controlEndpoint`, `controlToken`. Version is literal `1`; `workRootIdentity` is the exact current
`StudyRuntimeIdentityTuple`; lexical and canonical root values satisfy the work-root rules above;
`controlEndpoint` satisfies the exact absent local-endpoint authority; and `controlToken` is fresh
canonical 43-character unpadded base64url text that strictly decodes to exactly 32 bytes. It is the sole `runtime-bootstrap` payload and may
occur exactly once only on the materializer-to-supervisor inherited edge after `ready`. Unknown,
missing, extra, reordered, inherited-through-environment/argv, duplicate, replayed, stale-root,
wrong-identity, nonlocal/present/aliased endpoint, or malformed/reused token input fails before
root mutation, tears down the supervisor and endpoint, and produces no retained output.

The runtime-only `StudyWorkRootBinding` has exact order `workRootLexicalValue`,
`workRootCanonicalValue`, `workRootIdentity`, `studyInputManifestSha256`. `StudyFullBinding` has
exact order `workRootLexicalValue`, `workRootCanonicalValue`, `workRootIdentity`,
`candidateLexicalValue`, `candidateCanonicalValue`, `candidateIdentity`, `candidateSha256`,
`studyInputManifestSha256`. `StudyLiveBinding` has exact order `runtimeBinding`,
`browserProxyAuthority`, where `runtimeBinding` is an exact fresh `StudyFullBinding`.

The supervisor creates one fresh 256-bit continuity key and never returns it. The two
commitments are 64-lowercase-hex domain-separated HMAC-SHA-256 values. Their exact preimages are
ASCII `work-root-identity\0` or `candidate-identity\0`, respectively, followed by the compact
canonical no-LF object in exact order `controlSessionId`, `identity`, where `identity` is the
corresponding exact tuple. Neither preimage contains a lexical/canonical path or candidate
digest. The work-root commitment is fixed at materialization and the candidate commitment at
start. The key, tuples, raw bindings, and mapping to commitments remain only in supervisor
memory and are destroyed at finalization. Start, handoff, witness, and seal bind the same
`controlSessionId`, both commitments, candidate digest, and study-input-manifest digest.

The browser-proxy authority is exactly `127.0.0.1:<port>`, where `<port>` is a nonzero canonical
decimal integer from `1` through `65535`. `StudyBrowserProxyRuntimeBinding` is a runtime-only
fresh canonical object with exact root order `schemaVersion`, `studyRunId`,
`browserProxyAuthority`; version is literal `1`, the run is current, and the authority is that
exact value. After the study-browser adapter is ready and its own and matching-watchdog
registrations are supervisor-ACKed, the supervisor sends this binding exactly once as
`browser-proxy-binding`. The adapter validates the authority, exclusively binds the listener, and
returns the existing child-to-parent acknowledgement; only that ACK permits `start` completion,
stream start control, or capture-start output. Both endpoints wipe transfer/frame copies after
the ACK. The supervisor and adapter retain only dedicated raw-authority memory through `stop`,
when the adapter closes the listener and wipes its copy; checkpoint and continuation compare
every resent control authority with the supervisor copy. The authority is never inherited through
environment/argv and never retained, logged, emitted, or copied into evidence. Its only hash
coverage is the exact authenticated runtime-control request and this exact inherited-IPC frame;
it is never another digest or commitment preimage. Wrong/missing/duplicate binding, wrong run,
bind drift/failure, pre-ACK stream action, or authority leakage invalidates the run.

`StudyStreamWriterRuntimeBinding` is a path-free runtime-only fresh canonical object with exact
root order `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`,
`captureComponentRunId`, `captureInstanceId`, `captureProcessRunId`, `writerFileIdentity`,
`writerLinkCount`, `writerOpenMode`. Version is literal `1`; session/run/stream are current;
the three capture IDs equal the matching adapter's authenticated ready and self-registration
identities; `writerFileIdentity` is the exact current path-free `StudyRuntimeIdentityTuple` for
that regular stream file; `writerLinkCount` is literal `1`; and `writerOpenMode` is literal
`append-only`. It contains no path, descriptor number, raw handle, authority, or retained value.

For each stream the adapter first authenticates ready and sends its own registration; after the
supervisor ACKs that registration, the supervisor sends exactly one `stream-writer-binding`.
The adapter validates its IDs and descriptor `5`, relays the binding byte-for-byte to its matching
watchdog, and does not ACK upstream yet. The watchdog verifies the IDs plus descriptor `5`'s
stable regular-file identity, `nlink === 1`, and append-only authority, returns the binding
acknowledgement, then sends its own registration. Only after that downstream binding ACK may the
adapter ACK the upstream binding, ACK and forward the byte-identical watchdog registration, and
close its descriptor-`5` copy. The supervisor ACKs the forwarded registration and closes its own
descriptor-`5` copy. The browser proxy binding is sent only after both browser registrations are
supervisor-ACKed and itself requires the adapter's binding ACK. No `stream-control: start`,
capture-start append, or start completion is permitted until all three writer-binding relay/ACK
barriers, all six registrations, and the browser-proxy-binding ACK have completed. Wrong,
missing, duplicate, reordered, mutated, path-bearing, or post-control binding invalidates the run.

## Closed runtime-control protocol

Every connection carries exactly one LF-terminated `hello` request, one `hello` response, one
phase request, and one phase response, then closes. A request has this complete root order:

`schemaVersion`, `requestId`, `command`, `controlSessionId`, `challengeId`,
`authenticationTag`, `payload`.

A response has this complete root order:

`schemaVersion`, `requestId`, `command`, `controlSessionId`, `challengeId`, `ok`, `errorCode`,
`authenticationTag`, `payload`.

Version is literal `1`. `requestId` is a fresh opaque ID and the response repeats it. The
`hello` request has `controlSessionId`, `challengeId`, `authenticationTag`, and `payload` all
literal `null`. Its response returns the supervisor's stable fresh `controlSessionId`, a fresh
one-use `challengeId`, `ok: true`, `errorCode: none`, `payload: null`, and an authenticated tag.
The phase request repeats that session and challenge. The response repeats both. A challenge is
consumed by an accepted, rejected, malformed, disconnected, or replayed attempt; every command
requires a new hello. A request ID cannot be reused, and a connection cannot carry a second
phase request.

For HMAC computation the sender reconstructs the exact compact canonical message with
`authenticationTag: null`, without LF, preserving the command-specific payload's exact bytes.
The HMAC input is ASCII `request\0` or `response\0`, respectively, followed by those bytes.
HMAC-SHA-256 uses the decoded control token; `authenticationTag` is the resulting 43-character
unpadded base64url value. Receivers decode and compare the 32 bytes in constant time before
acting. The token itself is never sent. Unknown or extra fields, noncanonical bytes, malformed
IDs/tags, replay, wrong phase, wrong session, wrong direction, or payload mismatch fail closed.
On success `ok` is literal `true`, `errorCode` is literal `none`, and payload follows the command
schema. On failure `ok` is literal `false`, payload is `null`, and `errorCode` is one non-`none`
member of the complete closed enum `none | malformed-message | authentication-failed |
challenge-replayed | command-not-allowed | payload-invalid | binding-mismatch | state-mismatch |
runtime-control-unavailable`. No code reveals a token, path, identity component, raw field, or
child detail. The response is authenticated whenever a canonical response can be produced, then
the connection closes.

The command set is exactly `hello | verify-inputs | start | checkpoint | read-checkpoint |
anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
submit-product-event | close-product-probe`. Payloads are fresh
canonical values with exactly these schemas and orders:

| Command | Request payload | Response payload |
|---|---|---|
| `hello` | `null` | `null` |
| `verify-inputs` | exact `StudyWorkRootBinding` | `workRootIdentityCommitment`, `runtimeControlReady` |
| `start` | exact `StudyLiveBinding` | `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `processes`, `orchestrators` |
| `checkpoint` | exact `StudyLiveBinding` | `checkpointRequestId` |
| `read-checkpoint` | exact `StudyLiveBinding` | `checkpointRequestId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streams` |
| `anchor-handoff` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `anchorPositions` |
| `verify-continuation` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `anchorPositions` |
| `stop` | `liveBinding`, `checkpointRequestId`, `handoffSha256` | `null` |
| `finalize-prepare` | `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | `null` |
| `finalize-commit` | `runtimeBinding`, `checkpointRequestId`, `handoffSha256` | exact `StudyContinuityWitness` |
| `abort` | `null` | `null` |
| `register-pre-readiness-probe` | `studyRunId`, `subjectId`, `bootstrapProof` | `preReadinessProbeId` |
| `buffer-pre-readiness-product-event` | `preReadinessProbeId`, `destinationRole`, `payload` | `null` |
| `register-product-probe` | `studyRunId`, `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles` | `inspectorProcessId` |
| `submit-product-event` | `inspectorProcessId`, `destinationRole`, `payload` | `null` |
| `close-product-probe` | `inspectorProcessId` | `null` |

`runtimeControlReady` is literal `true`. A response `processes` array contains exactly six
objects in fixed stream order and, within each stream, `watchdog` then `capture`; each has exact
order `streamRole`, `processRole`, `instanceId`, `processRunId`. The checkpoint `streams` array
contains exactly three entries in fixed stream order, each with exact order `streamRole`,
`checkpointSequence`, `checkpointMonotonicNs`, `running`, `sealed`, with literal `true`/`false`
for the last two fields. `anchorPositions` has the same three-role order and each fresh entry has
exact order `streamRole`, `anchorSequence`, `anchorEnvelopeSha256`.

The separate start-response `orchestrators` array has exactly two entries in order
`study-harness`, `scoring-moderator`. Each entry has exact root order `processRole`,
`componentRunId`; the role is that literal slot and the ID is the fresh component-run ID from
its authenticated `ready` frame. Neither array contains an OS PID or reviewer process. Unknown,
missing, extra, duplicated, or reordered process entries fail.

`liveBinding` is an exact `StudyLiveBinding`; `runtimeBinding` is an exact `StudyFullBinding`.
`bootstrapProof` is exact `StudyPreReadinessBootstrapProof` with root order `schemaVersion`,
`productId`, `bootstrapEventId`, values literal `1`, literal
`agent-customization-inspector`, and one fresh one-use opaque ID. A successful pre-readiness
registration response contains one fresh runtime-only `preReadinessProbeId`.
`readinessProof` has exact order `schemaVersion`, `productId`, `readinessEventId`, with literal
`1`, literal `agent-customization-inspector`, and one fresh one-use opaque ID. The nonempty
`requestedDestinationRoles` array is a duplicate-free subset of `product-instrumentation`,
`inspector-server-ledger` in that fixed order. `destinationRole` is one registered member of that
set and can never be `study-browser`. `payload` is exactly one of two closed variants: a canonical
safe observation whose `inspectorProcessId` equals the registered outer ID and whose `subjectId`
is carried only inside that observation; or, only for `destinationRole: inspector-server-ledger`,
an exact `StudyServerCorrelationClaim` for one already-pending browser candidate. The outer
`inspectorProcessId` always equals the registered ID and authenticates the submitting probe. A
claim uses the registered subject/process IDs and actor `participant | bundled-spa`; a claim with
N/A IDs or any other actor is invalid. The supervisor
routes a safe-observation variant exactly once to the selected adapter/watchdog; it routes a claim
variant exactly once to the in-memory broker and never directly to a watchdog. A successful
registration response contains one supervisor-generated fresh `inspectorProcessId`; null-response
commands have literal `null` payload and no success boolean side channel.

For `buffer-pre-readiness-product-event`, `destinationRole` is the sole literal
`product-instrumentation` and `payload` is exact `StudyPreReadinessProductObservationDraft`
defined below. It cannot be a server claim or another safe variant. The register-product request
must carry the exact still-open `preReadinessProbeId` that belongs to the same run/subject and
bootstrap; the ID is not an environment/argv/application/evidence field. Unknown, duplicated,
replayed, post-bind, wrong-run/subject/ID/destination, raw-bearing, mutated, or reordered input
fails.

The supervisor state machine is exactly `materialized -> inputs-verified -> live -> checkpointed
-> handoff-anchored -> continuation-verified -> stopped -> finalize-prepared -> finalized`.
`verify-inputs`, `start`, `checkpoint`, `anchor-handoff`, `verify-continuation`, `stop`,
`finalize-prepare`, and `finalize-commit` perform those transitions; `read-checkpoint` is allowed
only while checkpointed. Probe commands are allowed only while live through continuation-
verified and before stop. `abort` is allowed from every non-final phase, invalidates the run,
removes the endpoint, and exits. Every other command/phase pairing fails without transition.
`finalize-commit` is accepted exactly once after successful prepare. Any failure before commit
keeps the endpoint available only for a fail-closed retry or `abort`; no witness or seal is
written.

## Closed inherited-IPC protocol

Every internal channel uses this protocol; the earlier one-use-bootstrap requirement is not an
informal OS-pipe trust assumption. The complete role enum is `materializer | supervisor |
study-harness | scoring-moderator | reviewer-one | reviewer-two |
product-instrumentation-adapter | inspector-server-ledger-adapter | study-browser-adapter |
product-instrumentation-watchdog | inspector-server-ledger-watchdog | study-browser-watchdog`.
For each allowed role edge, the channel sponsor creates exactly two fresh unidirectional
anonymous inherited pipes: parent-to-child and child-to-parent. The parent-to-child pipe begins
with exactly 96 bootstrap bytes in order: a fresh 32-byte `channelSeed`, a fresh 32-byte
`bootstrapNonce`, and a fresh 32-byte `channelId`; only after that prefix may the same pipe carry
LF-framed parent-to-child messages. The child consumes exactly the first 96 bytes before enabling
frame parsing and can never treat a later byte as bootstrap. EOF/parent close before byte 96,
partial/reordered/replayed bootstrap, or any frame parse attempted before byte 96 fails. A byte
following the prefix is the beginning of the next canonical frame, or remains pending until that
frame is complete; malformed/trailing bytes fail under the frame rules below. Bootstrap material is never an
environment value, argv, file, named endpoint, log, output, or evidence field; the frame uses the
canonical 43-character encoding of `channelId` only.

The allowed parent/child edges and message types are closed. `ready`, `acknowledgement`, and
`lifecycle` mean only the exact schemas below; a listed payload-bearing type means only the exact
canonical schema owned elsewhere in this contract.

| Parent role | Verified child role | Parent-to-child message types | Child-to-parent message types |
|---|---|---|---|
| `materializer` | `supervisor` | `runtime-bootstrap`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-harness` | `attempt-binding`, `terminalization-decision`, `lifecycle` | `ready`, `acknowledgement`, `lifecycle` |
| `supervisor` | `scoring-moderator` | `scoring-context`, `acknowledgement`, `lifecycle` | `ready`, `workflow-outcome`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-one` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `scoring-moderator` | `reviewer-two` | `review-case`, `lifecycle` | `ready`, `reviewer-vote`, `acknowledgement`, `lifecycle` |
| `supervisor` | `study-browser-adapter` | `browser-proxy-binding`, `stream-writer-binding`, `attempt-binding`, `proxy-marker-install`, `participant-navigation-grant`, `browser-broker-decision`, `safe-payload`, `workflow-outcome`, `terminalization-decision`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `browser-request-candidate`, `attempt-terminalization`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| `supervisor` | `product-instrumentation-adapter` or `inspector-server-ledger-adapter` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |
| each `*-adapter` | its same-prefix `*-watchdog` | `stream-writer-binding`, `safe-payload`, `stream-control`, `acknowledgement`, `lifecycle` | `ready`, `stream-control-result`, `process-lifecycle-attestation`, `acknowledgement`, `lifecycle` |

No other edge or message type exists. In particular there is no `study-harness ->
study-browser-adapter` edge and no reuse of another message type for workflow transport.
`workflow-outcome` on the moderator edge and on the browser-adapter edge carries only the exact
`StudyWorkflowOutcomeSubmission`; the latter is the sole path by which the supervisor routes an
accepted workflow submission to that adapter, which converts it to the canonical workflow
payload and uses `safe-payload` only on its own watchdog edge. Review-case and reviewer-vote
channels are safe-only and cannot carry raw review material. On the supervisor-to-browser-adapter
edge, `safe-payload` is restricted to one exact canonical nonworkflow browser-observation variant
constructed by the supervisor broker from one validated/stored matching candidate and current-context
decision. It has the complete canonical observation-payload root defined below, literal
`eventCode: observation`, and nonworkflow `observationClass`. It cannot carry a workflow outcome, product/server variant, or bypass candidate/broker
state. A blocked candidate is validated/stored but never accepted; `candidate-forward` is the
only candidate-acceptance transition and exists only for a forwarded branch. The adapter validates the candidate binding and never infers or self-assigns a workflow
tag. `StudyInheritedIpcFrame` has complete root order `schemaVersion`,
`channelId`, `sequence`, `direction`, `senderRole`, `receiverRole`, `messageType`,
`authenticationTag`, `payload`. Version is literal `1`; `direction` is exactly
`parent-to-child | child-to-parent`; `sequence` is a nonnegative safe integer that starts at `0`
and increases by exactly one independently in each direction; and `authenticationTag` is a
canonical 43-character HMAC or literal `null` only while constructing its preimage. `payload` is
the exact closed message payload; unknown, extra, or reordered fields fail.

Direction keys are derived exactly as follows, where `||` is byte concatenation, the nonce and
channel ID are their raw 32 bootstrap bytes, roles are their exact ASCII literals, and the final
role separator is present:

```text
K_parent_to_child = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0parent-to-child\0") || bootstrapNonce || channelId ||
  ASCII(parentRole) || 0x00 || ASCII(childRole) || 0x00)
K_child_to_parent = HMAC-SHA-256(channelSeed,
  ASCII("study-inherited-ipc-key-v1\0child-to-parent\0") || bootstrapNonce || channelId ||
  ASCII(childRole) || 0x00 || ASCII(parentRole) || 0x00)
```

The child sends the first authenticated `ready` frame at child-to-parent sequence `0`; its
payload has exact order `schemaVersion`, `bootstrapNonce`, `componentRunId`, with literal `1`
and canonical 43-character encodings of the boot nonce and the fresh verified component-run ID.
After the parent authenticates that frame and consumes the nonce, both endpoints overwrite/drop
`channelSeed` and `bootstrapNonce`; neither may bootstrap another edge. Direction keys remain
only for the life of that edge.

On the materializer-to-supervisor edge only, the first parent-to-child frame is the sole
`runtime-bootstrap` at sequence `0`, carrying exact `StudySupervisorRuntimeBootstrap`. The
supervisor returns an `acknowledgement` for precisely that sequence only after completing every
validation, creating the stable session/continuity state, and binding the endpoint. After that
ACK, successful materialization sends one authenticated `lifecycle: close`; acceptance detaches
and wipes the materializer edge without stopping the supervisor. A rejected, missing, replayed,
or disconnected bootstrap, any root mutation before its ACK, or `abort`/failure tears down that
edge, the endpoint, and the supervisor and authorizes no retained mutation.

For every later frame, the sender constructs the exact compact canonical frame with
`authenticationTag: null` and no LF. Its HMAC preimage is exact
`ASCII("study-inherited-ipc-frame-v1\0") || ASCII(direction) || 0x00 || canonicalFrameBytes`.
HMAC-SHA-256 uses the corresponding direction key; the populated tag is canonical unpadded
base64url, and wire bytes are the populated compact object followed by exactly one LF. The
receiver validates exact canonical bytes, channel, direction, roles, edge/type permission,
sequence, and 32 decoded tag bytes in constant time before payload parsing or state change.
`acknowledgement` payload has exact order `schemaVersion`, `acknowledgedSequence`, `result`, with
literal `1`, the accepted opposite-direction sequence, and literal `accepted`. `lifecycle`
payload has exact order `schemaVersion`, `event`, with literal `1` and one of `close | abort |
child-exit`; no free-form detail is permitted.

Parent-to-child `acknowledgement` is permitted on the scoring-moderator, adapter, and watchdog
edges only for the immediately preceding valid child-to-parent
`process-lifecycle-attestation` sequence. It cannot acknowledge a browser request candidate,
attempt terminalization, workflow outcome, reviewer vote, ready frame, or any other message;
those messages retain their exact semantic response/barrier. A missing, wrong-sequence,
duplicate, cross-type, or late attestation ACK invalidates the run. A watchdog registration must
be ACKed by its adapter before the adapter forwards that registration; a forwarded registration
must be ACKed by the supervisor before `start` may complete; a watchdog exit attestation must be
ACKed before its adapter exits; and every reviewer exit attestation must be ACKed before the
moderator submits that workflow outcome.

On the supervisor-to-study-browser-adapter edge, the child-to-parent `acknowledgement` for a
`workflow-outcome` is its mandatory semantic response: `acknowledgedSequence` must be that exact
accepted workflow-outcome frame sequence, and the adapter may send it only after constructing the
canonical workflow payload and receiving the matching watchdog `safe-payload` acknowledgement.
The next scoring context, an attempt-binding transition, a lifecycle frame, stream control, or
any other later message is never an implicit workflow-outcome acknowledgement. Missing,
wrong-sequence, premature, duplicate, or cross-type workflow acknowledgement invalidates the run.

Every other message payload is a freshly constructed exact canonical root. `runtime-bootstrap`
carries only exact `StudySupervisorRuntimeBootstrap`, `browser-proxy-binding` carries only
exact `StudyBrowserProxyRuntimeBinding`, and `stream-writer-binding` carries only exact
`StudyStreamWriterRuntimeBinding`. `attempt-binding`,
`proxy-marker-install`, `participant-navigation-grant`, `scoring-context`, `workflow-outcome`,
`review-case`, `reviewer-vote`, and `browser-request-candidate` carry only the correspondingly
named canonical records defined below, without a wrapper. `StudyBrowserBrokerDecision` is the
sole `browser-broker-decision` payload and has exact root order `schemaVersion`, `studyRunId`,
`browserAttemptId`, `correlationId`, `decision`; version is literal `1` and decision is exactly
`candidate-forward | browser-only-released | joined-pair-released`. For `candidate-forward` and
`joined-pair-released`, `browserAttemptId` is the current non-N/A attempt ID. For
`browser-only-released`, it is the current ID for a valid-marker candidate bound to that attempt,
and literal `not-applicable` only for a missing/invalid-marker unrelated candidate whose derived
subject/process IDs are also N/A. `candidate-forward` occurs once only for an eligible
validated/stored candidate while the canonical grant remains armed; acceptance of that decision
atomically changes the canonical grant `armed -> consumed` before any forwarding;
`browser-only-released` occurs once only for a blocked candidate after its sole browser payload
has adapter/watchdog downstream ACK; and `joined-pair-released` occurs once only after a
previously forwarded candidate is joined and both payloads have downstream ACK. The first and third decisions may occur once each, in
that order, for one forwarded correlation; the second is a mutually exclusive terminal path.
Duplicate, skipped, reordered, wrong-state, or reused decisions fail.

`process-lifecycle-attestation` carries only exact `StudyProcessLifecycleAttestation`, with root
order `schemaVersion`, `processRole`, `streamRole`, `componentRunId`, `instanceId`,
`processRunId`, `event`, `exitCode`, `signal`. Version is literal `1`. `processRole` is exactly
one of the three named `*-adapter` roles, the three named `*-watchdog` roles, `reviewer-one`, or
`reviewer-two`. For an adapter or watchdog, `streamRole` is its same-prefix stream,
`componentRunId` equals its authenticated ready ID, and `instanceId`/`processRunId` are its fresh
uninterrupted capture-envelope identities. For a reviewer, `streamRole`, `instanceId`, and
`processRunId` are literal `not-applicable`, while `componentRunId` equals that one-use
collector's authenticated ready ID. `event` is exactly `registered | exited`; `registered`
requires `exitCode: null` and `signal: null`; the only accepted witness-bearing `exited` value
requires `exitCode: 0` and `signal: null` and repeats the registered identities byte-for-byte.

A watchdog sends only its self-`registered` attestation to its adapter. After authenticating and
ACKing it, the adapter forwards that byte-identical registration to the supervisor. Each adapter
also sends its own `registered` attestation to the supervisor. After the adapter has caused its
watchdog to stop and has directly observed the matching OS child exit, it constructs and sends
that watchdog's matching clean `exited` attestation. The scoring moderator constructs and sends
each reviewer's `registered` attestation after authenticated ready and its matching `exited`
attestation only after directly observing that distinct one-use OS child exit. No process attests
its own exit, no sibling attests another process, and no role may attest a mismatched stream or
identity. A nonzero, signalled, missing, premature, replaced, or otherwise nonclean child exit is
reported only as `lifecycle: child-exit`, invalidates the run, and never becomes a clean
attestation or synthesized workflow outcome.

`StudyStreamControl`, the sole `stream-control` payload, has exact root order `schemaVersion`,
`controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `streamRole`,
`command`, `checkpointRequestId`, `handoffSha256`. Version is literal `1`; the session, run, both
commitments, candidate digest, manifest digest, and stream are the current exact immutable start
values; and command is exactly `start | checkpoint | anchor-handoff | stop`. `start` uses literal
`not-applicable` for both final fields; `checkpoint` uses its fresh current checkpoint ID and
`handoffSha256: not-applicable`; and `anchor-handoff`/`stop` use the exact current checkpoint ID
and lowercase handoff digest. `StudyStreamControlResult`, the sole `stream-control-result`
payload, has exact root order `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`,
`command`, `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`. It repeats the
matching version/session/run/stream/command. Its `checkpointRequestId` is literal
`not-applicable` for `start`, the fresh request ID for `checkpoint`, and the exact current
accepted checkpoint ID for `anchor-handoff` and `stop`; no other N/A use is permitted. It identifies the
actual immutable checkpoint, handoff anchor, or terminal stop envelope by canonical nonnegative
safe sequence, canonical nonnegative monotonic nanoseconds, and lowercase SHA-256 digest. The
`start` result is returned only after both capture-start and first heartbeat are appended and
identifies that first-heartbeat position.

The supervisor sends one control to the matching adapter, which validates and relays that request
byte-for-byte to its watchdog. The watchdog alone acts and returns the exact result; the adapter
validates and relays the result byte-for-byte to the supervisor and may neither synthesize nor
mutate either record. `stream-control-result` is the semantic response and generic
`acknowledgement` cannot replace or acknowledge it. Missing, extra, wrong-stream/run/command/ID,
duplicate, reordered, mutated, or noncanonical control/result, or a result not equal to the sole
writer's actual envelope position, invalidates the run.

`attempt-terminalization` and `terminalization-decision` both carry the byte-identical canonical
`StudyAttemptTerminalization` root in exact order `schemaVersion`, `studyRunId`,
`browserAttemptId`, `subjectId`, `inspectorProcessId`, `cause`. Version is literal `1`; IDs equal
the current attempt, process ID may be literal `not-applicable` before readiness, and cause is
exactly `product-exit | browser-exit | equipment-failure | premature-probe-close`. The harness
is never a terminalization source. The supervisor is the sole participant-launch controller,
owns the participant-equipment OS child handle/wait state, and creates `product-exit` only from
its direct OS observation of that child exit; an exit before the bound product bootstrap is
reached is exclusively `product-exit`, never probe failure or equipment failure. The
study-browser adapter directly owns and observes the Chromium OS child/context and may report
`browser-exit` only for an actual browser process/context exit or `equipment-failure` only for an
externally observed browser/bootstrap/environment failure while the adapter, proxy, DevTools
controller, inherited IPC, marker authentication, and implementation remain healthy. An internal
adapter/proxy/controller malformed response or output, DevTools/authentication/marker/IPC fault,
implementation fault, or adapter/watchdog child fault performs cleanup, invalidates the run, and
synthesizes no participant outcome.

Authenticated `close-product-probe` and probe EOF are serialized under the same supervisor
attempt mutex with the OS child wait state. If the child has already exited, the cause is
`product-exit`; if it is still live before all four outcomes, the cause is
`premature-probe-close`; after four outcomes and zero pending join, the same orderly close is
normal and is not terminalization. The first valid cause committed under that serialization wins;
later/racing child-exit, probe-close, or adapter reports are rejected. The supervisor sends that
byte-identical value once as `terminalization-decision` to both the harness and browser adapter.
On that decision the adapter cleans only attempt-local browser/grant/marker/
reservation/candidate/pending state and retains its terminalizing binding copy; the harness also
retains its terminalizing binding and fixed remaining schedule. Both binding copies remain until
the moderator/supervisor complete exactly four outcomes and the later closed-snapshot dual ACK.
`participant-navigation-grant`, review-case, and all other
record roots retain the exact schemas and state rules below. No payload permits a free-form
cause, error, note, raw value, or nested alternate variant.

Truncated bootstrap, role, edge, type, channel, direction, order, tag, duplicate, skip,
replay, trailing bytes, partial frame, EOF within a frame, frame after lifecycle close, or
unexpected child exit closes the edge, invalidates the run, and releases no partially routed
message. On orderly close, abort, crash, authentication failure, or child exit, both endpoints
wipe both direction keys, buffered frames, bootstrap state, and replay/sequence state. The
control token, continuity key, `browserProxyMarkerSecret`, another channel's seed/key, or a
derivative of any of them may never be substituted or reused. Within inherited capture IPC, raw
bootstrap/frame bytes and authentication tags are transient protocol material, never capture
evidence or another digest preimage; only this exact frame authentication and the separately
defined marker-install frame may authenticate those frame payloads. The complete cross-protocol
allowed HMAC-preimage set is the exact set enumerated above; no other preimage is permitted.

## Capture process boundary

The executable process tree is closed. Materialization launches exactly one long-lived
`supervisor`. At `start`, the supervisor launches exactly one long-lived `study-harness`, one
long-lived `scoring-moderator`, and one adapter for each of the three stream roles, in that order;
each adapter launches exactly its one matching watchdog before reporting ready. Thus capture has
exactly eight long-lived internal descendants below the supervisor: two orchestrators and six
stream processes. The watchdogs are adapter children, never direct supervisor children. The
participant `npx`/Inspector child and the pinned Chromium child/context are attempt-local,
ephemeral external equipment and are not members of those eight internal descendants. When the
supervisor launches the scoring moderator, it passes terminal-equipment descriptors `7`, `8`, and
`9` in those exact child-visible slots and immediately closes its own copies; descriptor `6`
remains solely with the supervisor for participant command ingress. For every workflow that later becomes a
review-required failure, the moderator first launches fresh `reviewer-one` and `reviewer-two`
one-use vote-collector processes in slot order, waits for both authenticated ready frames, sends
and receives supervisor ACK for both parent-OS-observed registered attestations, sends the two
byte-identical safe cases, accepts the first hidden vote and then the second vote, directly
observes both clean OS exits, and receives supervisor ACK for both distinct matching exit
attestations before destroying both channels and submitting the outcome. It launches no
reviewer process for success or an automatically linked failure, and never reuses a reviewer
process.

Launch readiness, cardinality, ownership, and exit are exact. Each adapter first authenticates
ready and sends its own registration; after the supervisor ACK it receives and relays its exact
stream-writer binding. Only after the watchdog validates that binding and ACKs it does the
watchdog send its self-registration; the adapter ACKs and forwards that registration, and the
supervisor ACKs it. `start` succeeds only after all eight long-lived internal processes are
authenticated and ready, all three writer bindings and all six stream registrations are accepted,
the browser-proxy-binding is ACKed, and each of the three watchdogs has returned its exact `start` result after writing its
capture-start pair and first heartbeat. The start response's six identities are derived only from
those accepted registrations. At `stop`, there must be no live reviewer, open review case,
attempt, or pending join. The supervisor closes the harness and moderator in that order, then
issues exact stream stop control in fixed stream order. Each adapter relays the control, receives
the watchdog's terminal result, causes the watchdog handle to close, directly observes its clean
OS child exit, sends the matching exit attestation, waits for supervisor ACK, and only then exits
cleanly itself. The supervisor directly observes the three adapter and two orchestrator OS exits;
it uses the three adapter-OS-observed watchdog exit attestations for the other long-lived exit
facts. An unexpected launch, extra/reused process, wrong
parent, wrong role/order, nonzero/signalled exit, or premature death of the harness, moderator,
any adapter, any watchdog, or any reviewer invalidates the run and permits no synthesized
workflow outcomes. Participant Inspector/browser/equipment terminalization follows the separate
attempt rule below.

Exactly three streams exist in this fixed order:

1. `product-instrumentation`
2. `inspector-server-ledger`
3. `study-browser`

Each stream has one distinct capture-adapter child process and one distinct watchdog child
process. All six process-run IDs and all six instance IDs are pairwise distinct. The capture
adapter observes raw traffic only in its own memory, classifies it immediately, discards every
raw value before IPC, and submits only over authenticated local IPC. Each authenticated IPC
message carries exactly one closed canonical safe payload value. Any number of messages/events
may be submitted within one primary-workflow/study observation, and every accepted message is
counted as one payload record and chained as one envelope/payload pair. The adapter cannot write,
append, rewrite, truncate, checkpoint, stop, seal, or repair evidence.
The watchdog is the sole envelope and safe-payload writer for its stream and serializes capture
events and heartbeat ticks through one append queue. A pause, death, restart, replacement,
writer change, ID reuse, or stream stitch invalidates the complete study.

At start the supervisor securely creates and validates each exact stream file and opens exactly
one dedicated append-only handle for it. On every internal child, child-visible descriptor `3` is
the parent-to-child read pipe and descriptor `4` is the child-to-parent write pipe. Only adapter
and watchdog modes additionally receive the matching stream append-only handle at child-visible
descriptor `5`; descriptor `5` is absent/closed for every other role. The single descriptor-`5`
handle passes through the matching adapter launch to its watchdog; it is not a third IPC pipe or
message channel. No stream path, cwd,
environment value, argv value, or alternate handle conveys file authority. Descriptor `5` is the
sole required non-IPC inheritance exception and may appear only in the exact supervisor-to-
adapter-to-matching-watchdog spawn mapping. The adapter may only verify and pass the slot
unchanged: it cannot read, write, seek, duplicate, replace, or retain the handle and closes its
copy only after the downstream stream-writer-binding ACK and watchdog registration relay. The
supervisor closes its own copy after the forwarded registration is ACKed. Registration is invalid
unless the watchdog independently verifies the writer binding, matching stable regular-file
identity, `nlink === 1`, and append-only authority; after both upstream copies close, the watchdog
is the sole holder and writer. Any extra duplicate, read/write/seek authority, retained copy, or
alternate inheritance is forbidden. This handle is evidence-writer authority, not inherited-IPC/
bootstrap material and not another message channel. The exact stop result precedes watchdog handle close and clean exit; abort or failure
closes every remaining copy and invalidates the run. A readable, swapped, extra, missing,
wrong-slot, identity-drifted, adapter-accessed, or path/cwd/environment/argv-leaking handle fails.

Raw header names, case/order, framing, wire bytes/text, encoded representations, whitespace,
duplicate layout, noncanonical values, and alternate values derived from any of them; request or
response bodies; inspected/authored content or metadata; filesystem paths or filenames;
capability or authority values; URLs; raw network bytes; raw parser/system errors or exception
strings; personal data; and participant response values must never cross capture-evidence IPC,
be hashed, be persisted, or appear in an envelope, safe payload, handoff, witness, seal, process
output, temporary file, or validation record. The sole retained header-derived exception is the
strictly decoded, canonically re-encoded 43-character `correlationId` defined below. Its
provenance is the contract-defined fresh generator, not the header representation: supervisor
grant for participant, browser adapter for SPA/browser-only, and the owning safe observation
generator for other paths. Only that canonical safe string may enter the safe payload and therefore the required payload, envelope, stream,
handoff, witness, and seal digest chain. The separate runtime-only
`browserProxyMarkerSecret` exception is limited to the exact authenticated `proxy-marker-install`
IPC frame and its HMAC processing plus the ephemeral browser-equipment configuration below, and
is never retained. The adapter may examine prohibited values
only transiently to emit fixed classifications, then must discard them. Encoding, encrypting,
redacting, normalizing, or hashing a prohibited raw value does not make it allowed. Candidate,
manifest, canonical-safe-payload, envelope, handoff, witness, and seal digests explicitly
required by this contract remain allowed.

### Product-instrumentation probe

At materializer-to-supervisor launch, sanitized ordinary equipment `PATH` is fixed to exactly an
identity/digest-pinned `npx` launcher bin plus one reserved, initially empty candidate-launch-
store bin slot outside the work root, every distribution, control endpoint, and browser profile.
The supervisor inherits those fixed slots; `materialize` and `inputs` neither read nor require the
store contents. Only after successful `verify -- inputs` and before capture `start`, authorized
study setup provisions that already reserved slot from the exact candidate tarball and frozen
production dependency graph with network and lifecycle scripts disabled. It binds exact package,
bin, and runtime payload identities/digests to the candidate digest without changing a
distribution or its `node_modules`.

At `start`, the supervisor resolves only those inherited PATH slots and independently revalidates
the pinned launcher/store against the candidate digest. No new environment variable, control
field, path frame, post-materialize store path, global install, cache, network/install fallback,
or alternate PATH entry is accepted. The raw tarball lexical/canonical authority never reaches a
participant child. Store path/identity/handles are runtime equipment only and never enter
capture/evidence IPC, log/output, an ID, or retained digest. `stop`, `finalize`, abort, and crash
destroy the store and block completion until absence is verified. Setup provisioning is outside
the eight long-lived internal descendants, and an actual pinned-`npx` integration test proves
no-install resolution through only this store.

The supervisor is the sole participant-launch controller and sole OS process observer. Only
after the prepared attempt/marker/browser-equipment barriers authorize launch, it enables
descriptor `6` and accepts exactly one LF-terminated ASCII line whose bytes before LF are the
literal `npx --no-install agent-customization-inspector --no-open`. No shell, command parser,
substitution, option, prefix/suffix, CR, second line, or terminal history/echo/recording is
permitted. The supervisor revalidates the subject distribution identity and directly spawns the
command with that distribution's exact `repository/` as cwd and with the same external terminal
equipment attached for participant interaction. The sanitized child environment contains only
the ordinary fixed product environment, that exact two-entry audited `PATH`, plus the exact bound
`NODE_OPTIONS=--import=<bound-capture-script-file-url>`, exact control endpoint/token, and current
safe `INSPECTOR_STUDY_RUN_ID`/`INSPECTOR_STUDY_SUBJECT_ID` values to the minimum scope needed by
the probe. Candidate/proxy authority, `browserAttemptId`, internal channel material, and any
other study value never enters argv, environment, cwd spelling, terminal bytes, or application
input. The supervisor wipes the command buffer immediately after successful spawn, owns the OS
child handle/wait through attempt cleanup, and closes/wipes it on abort or crash.
After each normal or terminalized attempt it disables participant input, closes the child view,
drains and resets descriptor `6`, clears pending input/output and any terminal state, and proves
that no prior participant bytes, output, history, or context remain before reuse. Reuse of the
fixed equipment surface/slot is permitted; the participant process, command buffer, probe
context, and attempt-local state are always fresh and are never reused. Child exit, abort, or
crash closes every child-visible descriptor and wipes all raw terminal buffers.

The sole exact `NODE_OPTIONS` value is present from that participant-equipment launch until its
Inspector child either completes probe readiness or fails; no other option or imported module is
present. Imported code installs exactly one optional
readiness function at `Symbol.for('agent-customization-inspector.study-probe.v1')`. The bound
Inspector bootstrap, if the function exists, calls it exactly once before starting its server or
browser with the fresh canonical object `schemaVersion`, `productId`, whose values are literal
`1` and `agent-customization-inspector`.

No Inspector-process ID is preassigned or placed in the environment.
Before candidate module-body evaluation, the imported code transiently verifies the bound
candidate bootstrap identity, discards raw identity material, and registers exact
`StudyPreReadinessBootstrapProof`. The supervisor creates one runtime-only
`StudyPreReadinessProductBuffer` with exact root order `schemaVersion`, `studyRunId`, `subjectId`,
`preReadinessProbeId`, `state`; version is literal `1`, IDs are the current/fresh safe values, and
state is exactly `open | readiness-bound | terminalization-bound | destroyed`, one-way from open
to either bound state and then destroyed. `preReadinessProbeId` is module-private and runtime-only;
it never enters environment, argv, application code, evidence, a digest, or output.

`StudyPreReadinessProductObservationDraft` has the same complete root order as a canonical
observation payload: `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`,
`inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`, `workflowClass`,
`outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`,
`reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`,
`productAttributable`, `prohibited`. Version/event are `1`/`observation`; event/correlation are
fresh transient IDs; subject is current; process, workflow, automatic, and review fields are all
literal `not-applicable`; outcome is `observed`; and the remaining tuple must be one closed
product-instrumentation observation row. It is not evidence and cannot be a claim.

Before each observable or prohibited pre-readiness effect continues, the hook classifies it into
that safe draft, immediately discards every raw value, submits exact
`buffer-pre-readiness-product-event` to sole destination `product-instrumentation`, and waits for
ACK. No effect continues before ACK. The supervisor validates and stores accepted drafts in exact
order in its buffer; it does not hash, route, or retain them as evidence yet, and an abrupt target
exit cannot erase acknowledged drafts.

On exact candidate-owned readiness, `register-product-probe` includes that open
`preReadinessProbeId`. The supervisor changes the buffer to `readiness-bound`, generates the fresh
`inspectorProcessId`, reconstructs fresh canonical payloads in stored order with new evidence
event/correlation IDs and that process ID, routes each to product-instrumentation, and waits for
adapter ACKs. It destroys even an empty buffer before it performs the acknowledged attempt-open
flow. The register/readiness response remains blocked through all buffer release ACKs and
destruction, the open-binding ACKs from both harness and browser adapter, and the discovery-
context ACK from the moderator. Only then does it return the assigned process ID/readiness; only
after that may grant/navigation/task activity begin. Thus no product event can occur in a
post-readiness/pre-context gap. On pre-readiness terminalization it instead changes the buffer to
`terminalization-bound`, reconstructs/releases every draft in order with process ID
`not-applicable`, waits for all ACKs, and destroys even an empty buffer before terminalization
decision and synthesized workflow outcomes. After readiness, each later safe observation uses a
distinct authenticated `submit-product-event` request. A browser-origin
server correlation instead sends the exact `StudyServerCorrelationClaim` variant under that same
command, with the registered ID remaining only in the outer authentication field. The probe closes the ID on
orderly Inspector exit. The probe is neither a capture adapter nor a watchdog and never writes
evidence.

A canonical product-attributable observation may use `inspectorProcessId: not-applicable` only
when it is released from that same-run/same-subject `terminalization-bound` pre-readiness buffer
before any readiness, and its workflow remains `not-applicable`. Every `readiness-bound` release
uses the newly assigned non-N/A process ID. Any other product-attributable N/A row, including one
after readiness, is invalid.

Before creating the readiness proof, the probe transiently verifies that the call originated
from the bound candidate's fixed bootstrap identity at the required pre-server/pre-browser point;
raw call-site/path material is discarded immediately and never enters the proof. A helper or
wrapper cannot mint a readiness proof by calling the global symbol itself.

An `npx` helper or unrelated process without the exact bootstrap identity never registers and
discards local data without evidence. An expected participant-equipment child that the supervisor
directly observes exiting before ever reaching the bound bootstrap follows the sole pre-readiness
classification `product-exit` and four reviewed failures; no
candidate-body effect was possible. Once the bound bootstrap is reached, module-body evaluation
is blocked until registration ACK; identity/register/ACK failure then invalidates the run and the
body remains unevaluated. Buffer ACK failure, missing/wrong/duplicate readiness, direct or duplicate
probe installation, changed self-import bytes, raw IPC, or run/subject/ID/destination mismatch
invalidates the run and permits no synthesized outcomes. Duplicate/replayed/mutated/post-bind
drafts also fail.
The study-browser adapter strips `NODE_OPTIONS`, both control bindings, both safe-context
bindings, candidate authority, and inherited internal IPC before directly creating Chromium;
proxy authority reaches only the attempt-local DevTools request/context route above.
Contract and integration tests exercise an actual pinned `npx --no-install` launch resolved only
through the audited candidate-launch store, target readiness, pre-readiness buffering, non-target discard, helper stripping,
missing/tampered probe behavior, and all product/server observation surfaces.

### Study-browser proxy

After the run-level stream start and immediately before each participant candidate `npx` and its
first capturable request, the supervisor prepares the next subject in fixed order. It generates
a fresh `browserAttemptId` and constructs one runtime-only `StudyBrowserAttemptBinding`. The
complete root order is
`schemaVersion`, `studyRunId`, `browserAttemptId`, `subjectId`, `inspectorProcessId`, `state`.
Version is literal `1`; `studyRunId`, `browserAttemptId`, and `subjectId` are the applicable safe run-local IDs;
`inspectorProcessId` is literal `not-applicable` while prepared; and `state` is exactly
`prepared | open | terminalizing | closed`. The permitted paths are `prepared -> open -> closed`,
`prepared -> terminalizing -> closed`, and `prepared -> open -> terminalizing -> closed`. There
is at most one binding in any of those runtime states; a closed binding is destroyed before the
next one is constructed.

Binding replication is a closed acknowledged state machine. The supervisor sends a byte-identical
prepared snapshot to the harness and browser adapter and requires both ACKs before marker install
or launch. On readiness it atomically creates the canonical open snapshot with fresh process ID,
sends that snapshot to both, then opens and obtains moderator ACK for the discovery scoring-
context mirror. It returns the register response only after buffer release/destruction, both open-
snapshot ACKs, and that moderator ACK; it creates a grant/candidate/task only after the response.
Acceptance of a terminalization decision atomically changes each copy to
terminalizing. After all four outcomes, the supervisor sends the byte-identical canonical closed
snapshot to both; the adapter performs attempt-local cleanup before ACK, and after both ACKs all
copies are destroyed. Normal completion uses the same closed snapshot/ACK path. Wrong, skipped,
reordered, stale, duplicated, mismatched, or partially acknowledged state fails the run and never
opens the next attempt.

`browserAttemptId` is a content-free broker ID only. It is never delivered to the browser,
browser process/context, browser profile/configuration/credential, application request, or
evidence. The supervisor distributes the binding only by `attempt-binding` to its broker, the
study harness, and the study-browser adapter. It and the ID may exist only in supervisor/broker,
harness, and adapter memory, those authenticated frames, and a browser request candidate; not in
an environment, argv, browser equipment, application/control message, log, output, or retained
digest input. The supervisor separately generates a fresh 32-byte/43-character
`browserProxyMarkerSecret` and constructs one
runtime-only `StudyBrowserProxyMarkerBinding` in exact root order `schemaVersion`, `studyRunId`,
`browserAttemptId`, `browserProxyMarkerSecret`, `state`. Version is literal `1`; both IDs and the
secret use strict `StudyOpaqueId` canonical encoding; and state is exactly `prepared | active |
destroyed`, monotonically `prepared -> active -> destroyed`. The supervisor sends the prepared
binding directly to the adapter only in `proxy-marker-install`. The adapter installs the secret
only in the ephemeral browser proxy-authentication equipment, completes the exact bootstrap, and
returns its authenticated acknowledgement only after exact success; acknowledgement acceptance
atomically changes only both marker copies to `active`; the attempt binding remains `prepared`
until product readiness creates the open snapshot and completes its dual ACK. A valid external
browser/bootstrap/environment failure changes both prepared marker copies directly to
`destroyed`, creates no active marker, and causes the healthy adapter to report exact
`equipment-failure`; an actual browser process/context exit instead reports exact `browser-exit`.
An internal proxy/adapter response, marker/authentication, IPC, implementation, or child fault
destroys the prepared marker but invalidates the run and creates no synthesized attempt outcome. The install
frame is the sole permitted transient HMAC preimage containing the raw secret. No marker binding
or secret is evidence, and the harness never receives either one.

For that attempt, the study-browser adapter directly revalidates and spawns the exact pinned
Chromium binary/profile by stable identity and digest, headed, with a fresh nonpersistent context
and empty extension set. It owns the OS child handle and browser context and is their sole direct
exit observer. The closed nonsecret launch vector includes literal `--remote-debugging-pipe` and
the exact pinned headed/prepared-profile switches only; no shell, package, helper, module/import
expansion, raw proxy authority, marker/credential, `browserAttemptId`, control authority, or
internal channel material is present in Chromium argv, environment, profile, history, log, or
evidence. The adapter maps the current `browserAttemptId` to the child/context only in its own
memory and never sends that ID to Chromium.

The adapter controls Chromium solely over the anonymous browser-equipment DevTools pipe created
by `--remote-debugging-pipe`. That pipe is outside the internal capture IPC role/edge/type matrix,
is not evidence transport, and retains no protocol data. For each attempt the adapter issues
exact `Target.createBrowserContext` with `proxyServer` equal to its dedicated raw proxy authority,
`disposeOnDetach: true`, and an empty proxy-bypass list. It then issues exact
`Fetch.enable` with `handleAuthRequests: true`. On the one exact Proxy Basic
`Fetch.authRequired`, it issues `Fetch.continueWithAuth` using response
`ProvideCredentials`, username literal `study`, and password exactly
`browserProxyMarkerSecret`, once only. Beyond the adapter's already authorized dedicated
run-level proxy-authority copy and attempt marker-binding copy, additional DevTools-stage raw
authority/credential copies may exist only in its call-local control-request buffer and the actual
attempt context/auth cache; the buffer is overwritten immediately after the DevTools response ACK. The adapter verifies through this
actual context the already specified exact `407 -> one credential retry -> 204` bootstrap before
acknowledging marker installation. It destroys the context/auth cache and closes the DevTools
view, terminates the attempt's Chromium child, and destroys the fresh isolated profile on normal
close, abort, crash, terminalization, or any internal fault; no Chromium process/context is
reused.

The pinned Chromium binding is eligible only when its verified close-on-disconnect implementation
is the exact remote-debugging-pipe source behavior
`StartRemoteDebuggingPipeHandler(base::BindOnce(&ChromeDevToolsManagerDelegate::CloseBrowserSoon))`:
pipe disconnect schedules browser close. The adapter creates/owns that pipe and child handle. The
supported study platform additionally supplies one fresh attempt-isolated process-group/job
containment and emptiness observer through the existing Node.js built-in child-spawn/OS boundary;
it is lifecycle equipment, not an executable helper, import, IPC message channel, environment or
path authority. A platform that cannot provide this boundary fails equipment preparation before
launch. Live-adapter pipe EOF requires `Target.disposeBrowserContext`, then pipe close, child exit,
and isolated-profile destruction. Adapter crash closes the pipe, invokes the verified
`CloseBrowserSoon` behavior, and the platform containment closes any survivor. The supervisor
keeps containment handles/PIDs only as runtime observer state and, after adapter exit, blocks the
next attempt, successful stop, and finalize until zero equipment descendant/context/profile is
proven. Failure invalidates and forces cleanup; no PID, handle, path, or observer state is evidence.

The browser-context proxy username is literal `study`; its password is exactly
`browserProxyMarkerSecret`. After all three
`capture-start` pairs exist, but immediately before this attempt's participant `npx` and first
capturable request, the browser navigates only to fixed proxy-local
bootstrap URI `http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`. The first
request has no `Proxy-Authorization` and receives exactly one bodyless `407`. Its raw response
has exactly the two headers `Proxy-Authenticate: Basic realm="inspector-study"` and
`Connection: close`, in that order, and no other header. The browser then
sends exactly one retry with one canonical `Proxy-Authorization: Basic <credentials>`, where
`<credentials>` is canonical RFC 4648 padded base64 of exact UTF-8
`study:<browserProxyMarkerSecret>`; the proxy strictly decodes and canonically re-encodes it and
returns the fixed bodyless `204` whose sole header is exactly `Connection: close`, with no other
header. Both bootstrap exchanges are proxy-local equipment traffic: they
perform zero DNS, connect, application handling, candidate creation, correlation, or evidence
write even though all streams are already live. If the healthy adapter/proxy emitted the exact
specified responses but the actual browser or environment produces another retry count,
credential form, request sequence, or otherwise cannot complete bootstrap, the adapter destroys
the marker and reports `equipment-failure`; actual browser process/context exit reports
`browser-exit`. Any adapter/proxy-produced other status, header name/order/value, body, network
effect, evidence effect, malformed output, marker/authentication fault, or IPC/implementation/
child fault invalidates the run rather than failing or terminalizing the participant attempt.
After bootstrap, every study-browser request during capture
has exactly one such canonical Basic field. A syntactically valid request with a missing marker
is `other-host-process`; a malformed, duplicate, noncanonical, unknown, stale, or mismatched
marker is `unknown`. Either is unrelated, has N/A binding IDs, and is blocked before DNS/connect.

The proxy consumes and strips the complete Basic field before forwarding. The secret is a proxy
transport-authentication capability only: validity alone never establishes actor class, product
attribution, application/control capability, or forwarding authorization, and never widens the
closed target/method/capability/origin policy. The raw/encoded Basic value, raw secret, install
configuration, and marker binding never enter any other inherited or evidence IPC, hash,
evidence, log, process output, file, environment, argv, persistent profile/history/cache/
credential store/keychain, or application request. The control token, continuity key, an IPC
key, `browserAttemptId`, or any derivative may not be used as the marker secret. Normal close,
abort, crash, and child exit destroy the browser context/process/configuration and overwrite/drop
every secret/binding copy. The Chromium child receives none of the control, safe-context,
candidate, proxy, probe, marker, or internal-IPC environment; within Chromium equipment, proxy
and marker values exist only inside the DevTools request/context/auth-cache route above.

The actual fixed headed Chromium profile is tested across normal completion, abort, and a crash
at every bootstrap/request boundary. After each case the harness inspects the attempt's isolated
temporary `HOME`, all XDG roots, browser profile, history, cache, and credential-store surfaces
and requires zero raw secret, encoded Basic value, or `browserAttemptId`; it then destroys the
context, browser process, configuration, and isolated storage before any later attempt. The
bodyless 407/204 exchange and every later one-Basic request are exercised through the actual
browser, not a synthetic HTTP client. A pinned-binary integration test also disconnects the
remote-debugging pipe at every bootstrap/request boundary, proves the verified
`CloseBrowserSoon` path and containment/absence barrier, and requires zero orphan Chromium child,
context, or fresh profile after adapter crash.

The `study-browser` capture adapter implements the proxy itself using only Node.js built-ins: it
binds exactly the declared loopback authority during `start`, closes it during `stop`, parses local
HTTP and CONNECT syntax only to classify it, and denies by default. A request with a missing,
malformed, noncanonical, unknown, stale, or mismatched marker is blocked before DNS, connect, or
forwarding. A current marker establishes only the attempt binding. No CONNECT tunnel exists.

The proxy and Inspector-side probe each independently construct an exact transient
`StudyBrowserInitiatorProjection` from the same unmodified certified-Chromium-controlled request
headers: `Sec-Fetch-Dest`, `Sec-Fetch-Mode`, `Sec-Fetch-Site`, `Sec-Fetch-User`, `Origin`, and
`Referer`. Its complete root order is `schemaVersion`, `destinationClass`, `modeClass`,
`siteClass`, `userClass`, `originEvidenceClass`, `refererEvidenceClass`. Version is literal `1`.
Closed values are `document | other | unknown`, `navigate | other | unknown`, `none |
same-origin | other | unknown`, `present | missing | unknown`, and, for each final field,
`missing | exact-issued | extension-scheme | other | unknown`. Only exact `Sec-Fetch-User: ?1`
is `present`; only the exact issued HTTP origin/referer is `exact-issued`; only a canonical
browser-extension-scheme origin is `extension-scheme`. A duplicate, noncanonical syntax/value,
unknown controlled value, or inconsistent combination makes the actor projection `unknown`.
Both classifiers discard every raw header value before IPC. The proxy forwards those six headers
unchanged, and the server projection must exactly equal the candidate projection. The production
study profile has an empty extension set; a separate test-only extension profile proves that
certified Chromium prevents page or extension code from spoofing Fetch Metadata into another
projection.

Fetch Metadata is only a consistency signal; it is never sufficient participant attestation.
Only after exact product-probe readiness and immediately before an attempt's sole expected
initial participant navigation, the supervisor generates one fresh `correlationId` and one
runtime-only `StudyParticipantNavigationGrant`. Its exact root order is `schemaVersion`,
`studyRunId`, `browserAttemptId`, `correlationId`, `state`; version is literal `1`, all IDs are
the current/fresh safe values, and state is exactly `armed | consumed | destroyed`. The
supervisor retains one broker copy and sends one byte-identical `participant-navigation-grant`
to the study-browser adapter. Neither the browser process/page nor application receives the
grant before the proxy injects its correlation field. The supervisor is the canonical state
owner. Under a call-local mutex, the adapter may reserve its armed copy once only when the current
valid secret, exact participant-shaped projection, and exact authorized-static target all match;
reservation adds no state and changes no canonical field. It uses that grant's correlation ID
rather than generating another and submits the candidate without forwarding. The supervisor
requires its own armed grant, the same attempt/correlation and exact participant tuple, then
validates and stores the candidate as pending without changing either grant copy. While its
canonical grant remains `armed`, the supervisor sends the exact one-use
`browser-broker-decision: candidate-forward`; authenticated acceptance of that decision is the
sole candidate acceptance/forwarding authorization and atomically changes the canonical grant
`armed -> consumed`. No generic candidate acknowledgement exists, and candidate receipt or
validation alone is not acceptance. Only after accepting the matching decision does the adapter
change its own copy to `consumed` and inject/forward. Failure before `candidate-forward`
acceptance wipes the pending candidate and leaves both grant copies armed for the same authorized
request; an authenticated replay/race instead invalidates the run and destroys the grant. A fresh HTTP request received with no current armed grant,
with a wrong target, from page script, or after grant consumption does not consume a grant and
does not invalidate the run: the adapter assigns a fresh proxy correlation and submits the
blocked unknown/prohibited browser-only candidate below. A duplicate/replayed/stale authenticated
candidate or grant IPC frame, simultaneous second consume, authenticated reservation/decision
mismatch, a committed candidate-forward missing/mutated at the adapter, or wrong authenticated
attempt/correlation is a protocol fault that
invalidates the run and forwards nothing. Attempt close changes every surviving copy to
`destroyed`.

The classification and forwarding decision table is closed and ordered:

| First matching case | Actor/evidence IDs | Attribution and action |
|---|---|---|
| Valid secret; `modeClass: navigate`, `destinationClass: document`, `userClass: present`, `originEvidenceClass: missing`, `siteClass: none \| same-origin`; exact authorized-static target; and the current armed grant | `participant`; open binding IDs and the grant correlation | Consume the grant once, then forward and join. |
| Any participant-shaped valid-secret request that lacks any preceding participant condition, including nonexact target, no grant, replay, or a user-activated page-script navigation | `unknown`; open binding IDs | Browser-only fail-closed critical `unauthorized-request`, product-attributable/prohibited true; blocked. |
| Valid secret; not participant; `userClass: missing`; and either `originEvidenceClass: exact-issued` or (`originEvidenceClass: missing` and `refererEvidenceClass: exact-issued`) | `bundled-spa`; open binding IDs | Only an exact authorized-static or authorized-api request may forward and join. Every nonexact or unauthorized request is browser-only product-attributable/prohibited with its applicable effect and is blocked. |
| Valid secret and `originEvidenceClass: extension-scheme` | `browser-extension`; N/A subject/process IDs | Always browser-only `unrelated`, `effectClass: none`, `productAttributable: false`, `prohibited: false`, and blocked. |
| Any remaining valid-secret projection | `unknown`; open binding IDs | Browser-only fail-closed critical request: `requestClass: unclassifiable \| prohibited` as applicable, `effectClass: unauthorized-request`, `productAttributable: true`, `prohibited: true`; blocked. |
| Missing secret after the completed bootstrap on an otherwise syntactically valid request | `other-host-process`; N/A subject/process IDs | Browser-only unrelated/false tuple; blocked. |
| Invalid, duplicate, malformed, noncanonical, unknown, stale, or mismatched secret | `unknown`; N/A subject/process IDs | Browser-only unrelated/false tuple; blocked. |

Thus only grant-attested exact authorized `participant` traffic and exact authorized
`bundled-spa` traffic can reach the Inspector and the
two-stream join. There is no valid-secret extension/other-host/unknown N/A-claim branch. Every
blocked request is classified and submits its candidate before any DNS, connect, request/body
forwarding, or response/content exposure. The supervisor broker, not the adapter, applies the
current-context rule, chooses the workflow tag/eligible correlation candidate, and constructs the
sole canonical browser observation. Proxy authority, marker,
projection headers, and other raw request values are discarded before broker/evidence IPC and
never retained. Proxy bind drift, proxy bypass, an authorizing proxy-credential scheme, key reuse,
remote resolution/connect, marker/configuration persistence, or failure to close at stop
invalidates the run.

On the exact candidate-owned readiness handshake, the supervisor verifies the sole prepared
binding's run and subject, generates the fresh `inspectorProcessId`, and atomically changes that
binding to `inspectorProcessId: <fresh-id>, state: open`. It returns the existing
`register-product-probe` response only after the prebuffer, dual-ACK replication, and discovery-
context ACK chain above. The supervisor derives product exit only from its participant child wait;
the healthy study-browser adapter sends exact `attempt-terminalization` only for actual browser process/context exit or the
defined external equipment-failure branch; and the supervisor locally creates only premature
probe close. The supervisor validates that exact source/cause pairing, freezes the already accepted workflow
prefix, closes every pending join with no partial release, changes the binding to
`terminalizing`, and fans out its byte-identical `terminalization-decision`. The scoring mapping
is exact: `product-exit -> product-exit`, `browser-exit -> browser-exit`, `equipment-failure ->
equipment-failure`, and `premature-probe-close -> equipment-failure`.

In fixed remaining workflow order, the moderator creates one scoring context for every
unaccepted workflow, records exact `failure`, performs the required review unless that failure
has a valid automatic link, and obtains acceptance before opening the next context. Already
accepted workflow rows are immutable and never duplicated or replaced. This rule covers
terminalization after zero, one, two, three, or four accepted workflows and always leaves exactly
the same four subject/workflow terminal rows under the attempt's subject ID and its existing
process ID, or `not-applicable` when readiness never occurred. After the decision, the adapter
destroys browser/grant/marker/reservation/candidate/pending state but retains its terminalizing
binding; the harness retains the same terminalizing binding and fixed remaining schedule. After
the fourth row, the supervisor sends the canonical closed snapshot to both, requires both ACKs,
then destroys context, joins, and all binding copies and only then permits the next
attempt. A normal ready attempt similarly closes only after probe close, all four accepted rows,
and zero pending join. Evidence-harness, orchestrator, adapter, watchdog, or reviewer failure
invalidates the run instead and never invokes synthesis. `stop` and finalization require zero
binding in any state and zero pending join, grant, marker, configuration, context, process, or
reviewer copy.

The scoring moderator, not the harness, owns the sole call-local raw response, timing,
ground-truth, and rubric boundary and produces every workflow submission. It reads those values
only from terminal-equipment descriptor `7`. After the matching open scoring context is delivered
and its current workflow display is complete, the moderator enables input for exactly one
LF-terminated compact canonical UTF-8 JSON `StudyModeratorInput` with exact root order
`schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `response`,
`timing`, `groundTruth`, `rubric`. Version is literal `1`; IDs/workflow byte-match that open
context; `inspectorProcessId` is non-N/A; `timing` is a canonical nonnegative decimal string; and
`response`, `groundTruth`, and `rubric` are canonical JSON strings whose raw content remains
call-local. Unknown/extra/reordered fields, noncanonical JSON/UTF-8/string escaping, CR or extra
line, premature EOF, duplicate/replayed input, or wrong-run/subject/process/workflow input
invalidates the run. Echo, history, recording, transcript, log, evidence retention, and routing
to another surface are forbidden. Immediately after producing the canonical safe outcome, the
moderator overwrites the record and all parsed raw fields, disables input, and drains/resets the
surface before the next open context; abort/crash/terminalization wipes partial bytes.

Every normally completed workflow requires exactly one such record. A terminalization decision
synthesizes failure for each unexecuted remaining workflow without reading descriptor `7`; any
record for a synthesized, closed, or already accepted workflow is late/cross-context input and
invalidates the run. The already accepted prefix has already consumed exactly one record per
normal workflow. No empty/default response, timing, ground truth, or rubric may be invented for a
synthesized row. The moderator may hold at most one
runtime-only `StudyCurrentSubjectScoringContext`, with exact root order `schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`,
`automaticIssueCorrelationId`, `terminalizationClass`, `state`. Version is literal `1`; IDs and
workflow are the current safe values; `automaticIssueCorrelationId` is initially literal
`not-applicable`; `terminalizationClass` is exactly `none | product-exit | browser-exit |
equipment-failure`; and state is exactly `open | submitted | destroyed`, monotonically in that
order. A normally opened context starts with terminalization `none`; after terminalization it may
change once from `none` to the mapped class, while each later synthesized context is initialized
with that class. While open, the automatic field may change once from `not-applicable` to the
earliest already accepted matching nonworkflow prohibited observation correlation. These two
one-way updates are the only field mutation exceptions; reversal, replacement, a second update,
or mutation after submission fails.

Only within that one call-local invocation may the context be associated with the current raw
scoring inputs. It contains and joins to no real identity, recruitment record, distribution ID,
browser profile, external/re-identifying value, retained map, or cross-workflow response map.
The supervisor is the safe current-context coordinator. On open it retains a safe mirror and
sends exact `scoring-context` to the moderator. A browser/product source never self-declares a
workflow. Before canonical payload serialization, the supervisor snapshots the current open
workflow context and assigns that workflow tag to the new observation; if no eligible context is
open, including every pre-readiness/context-free case, it assigns literal `not-applicable`, which
is permanent. It then obtains the required downstream adapter/watchdog ACK(s), accepts and counts
the immutable observation, and only then, for the first matching product-attributable nonworkflow
`prohibited: true` observation, atomically changes the mirror's automatic field from N/A to that
correlation and sends the complete updated exact context to the moderator. Only after the
moderator acknowledges that frame may the broker release the observation or the moderator submit
the matching outcome link. No accepted retained observation is mutated, backfilled, or retagged;
later, after-close, and cross-context observations keep their originally serialized workflow,
which is `not-applicable` when no context was eligible. Raw scoring bytes never enter the context,
safe IPC, a hash, log, output, or evidence. The context and all raw values are destroyed after
the accepted outcome and reviews, or on abort, before the next workflow context opens.

Context scheduling is exact. Pre-readiness buffered observations are accepted with no eligible
context and remain workflow N/A. After buffer release/destruction and open-binding dual ACK, but
while the Inspector body, readiness response, browser navigation, and discovery task remain
blocked, the supervisor opens the discovery mirror and waits for moderator ACK. Only then may it
return readiness and later create the grant/start navigation/task. After each workflow outcome is
accepted all the way through the browser watchdog, its context becomes submitted then destroyed;
before any next-workflow task, timer, or prompt begins, the next fixed-order context is opened and
ACKed. No observation can fall into a post-ready/pre-context interval.

The moderator emits exact `StudyWorkflowOutcomeSubmission` once per pair through
moderator-to-supervisor `workflow-outcome`; the supervisor validates and forwards that same exact
record only through supervisor-to-browser-adapter `workflow-outcome`, and the adapter constructs
one canonical workflow payload for its watchdog and ACKs the submission only after watchdog ACK.
The submission root order is `schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `outcomeClass`,
`automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`,
`reviewerTwoClassification`. Version is literal `1`; workflow is exactly `discovery |
inspection | comparison | global-consent`; outcome is `success | failure`; disposition is
exactly `not-applicable | automatic-critical | reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`; and each classification is
exactly `not-applicable | product-caused-blocker | not-product-caused-blocker`.
`inspectorProcessId` is `StudyOpaqueId | not-applicable`; literal `not-applicable` is permitted
only for the exact terminalization-bound pre-readiness synthetic branch and must match the
current context, any review case, both reviewer votes, and the final submission byte-for-byte.
Every normal-input submission and every post-readiness terminalized submission uses the current
non-N/A ID.

The context correlation is an eligible failure-link candidate, not an outcome override. A success
always submits automatic ID/disposition/votes as N/A even when its context has a candidate; the
underlying prohibited nonworkflow observation remains independently counted in the automatic
issue set. On failure, a non-N/A context candidate requires the exact same ID with
`automatic-critical` and N/A votes; taking a reviewer branch instead is invalid. Only failure
with a context candidate still N/A may use one of the three reviewer dispositions, exact two
votes, and automatic ID N/A. The linked candidate must be an already accepted nonworkflow
prohibited observation with the same run, subject, process, and workflow. Missing, mismatched,
later, unrelated, reused-across-outcome, or non-earliest links fail. A pre-readiness observation
accepted with no open context remains workflow N/A and cannot be backfilled or linked, but still
belongs to the independent automatic issue set. No independent issue ID is generated: the
verifier derives only `automatic:<correlationId>` for automatic observations and
`reviewer:<subjectId>:<workflowClass>` for reviewer-critical outcomes.

Before each subject attempt begins, a distinct human pair is procedurally assigned out of band
to each of that subject's four workflow slot pairs. No person is reused for another case. A
separate governed, access-controlled administrative roster/assignment record may retain the
minimum reviewer identities and slot assignments needed to audit that uniqueness. It is outside
the repository bundle, work root, candidate, study runtime, capture/evidence IPC, hashes, logs,
outputs, handoff, witness, and seal; runtime receives only literal reviewer slots. It is
administrative coordination rather than participant/moderator/scorer task or scoring content and
is destroyed according to the published consent/privacy retention procedure. Capture, evidence,
runtime, and bundle artifacts retain no reviewer identity or assignment. Fixed reviewer slot
labels and terminal-equipment surfaces may be reused only after drain/reset; the human identity,
fresh case-local administrative assignment instance, collector `componentRunId`, collector
process instance, and case are never reused. Each pair independently observes the same live
attempt and its assigned workflow through a viewing boundary with no recording or internal IPC, including
a terminal event that occurs before that workflow begins. For synthesized remaining rows, that
pair classifies the same directly observed live terminal event; no recording or replay is needed.
Only if the resulting outcome is a failure whose context candidate is literal N/A does
the moderator create exact runtime `StudySafetyReviewCase` in root order `schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `caseClass`, where version is
literal `1`, `inspectorProcessId` is `StudyOpaqueId | not-applicable` under the exact
terminalization-only rule above, and case class is literal `nonautomatic-workflow-failure`. It spawns fresh isolated
reviewer-one and reviewer-two one-use vote-collector processes, sends both registered
attestations to the supervisor after both are ready, waits for both ACKs, then sends byte-
identical privacy-safe cases before accepting either vote, and accepts no raw case on IPC. The
moderator maps only descriptor `8` to reviewer-one and only descriptor `9` to reviewer-two when
spawning those collectors; neither collector receives the other slot or descriptor `7`. After
each collector has accepted its internal `review-case`, displayed that safe case on its own
nonrecording surface, and completed display, it enables its slot input and reads exactly one
LF-terminated ASCII enum line: `product-caused-blocker` or
`not-product-caused-blocker`. It permits no CR, whitespace variant, second line, echo, history,
recording, transcript, log, or raw terminal bytes on internal IPC. The collector constructs the
canonical safe vote, then immediately overwrites its command/input buffer, disables input, and
closes its child view. Vote one is retained only in moderator dedicated memory and is never
displayed, echoed, or routed to descriptor `9`, reviewer-two, or any other surface before vote two
is accepted. Each exact `StudySafetyReviewVote` has root order `schemaVersion`,
`studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`, `reviewerSlot`,
`classification`; slot is `reviewer-one | reviewer-two` and classification is one of the two
non-N/A values. `inspectorProcessId` is `StudyOpaqueId | not-applicable` under the exact
terminalization-only rule above. Vote one remains hidden until vote two is accepted. Both processes then exit; the
moderator directly observes both OS exits, sends their distinct clean exit attestations, and
waits for both supervisor ACKs before the channels are destroyed or the outcome is submitted.
The moderator then drains/resets descriptors `8` and `9` and proves no prior case/vote/output
state remains before surface reuse. EOF before a vote, malformed/extra/replayed/cross-case input,
descriptor crossover, first-vote exposure, or any abort/crash closes both child views, wipes all
raw buffers and hidden vote state, and invalidates the run. No identity, pseudonym, note,
recording, raw response/rubric, third or replacement vote, reuse, or replay is accepted.

The outcome truth table is exact:

| Outcome case | `automaticIssueCorrelationId` | `reviewDisposition` | Reviewer one / two | `effectClass` |
|---|---|---|---|---|
| `success`, with or without a context candidate | `not-applicable` | `not-applicable` | both `not-applicable` | `none` |
| Failure with a non-N/A eligible context candidate | exact required linked correlation | `automatic-critical` | both `not-applicable` | `none` |
| Failure with context candidate N/A; both votes `not-product-caused-blocker` | `not-applicable` | `reviewer-cleared` | those two votes | `none` |
| Failure with context candidate N/A; both votes `product-caused-blocker` | `not-applicable` | `reviewer-confirmed-critical` | those two votes | `workflow-blocker` |
| Failure with context candidate N/A; votes disagree | `not-applicable` | `reviewer-disagreement-critical` | the two ordered votes | `workflow-blocker` |

Missing, duplicate, replayed, reordered, wrong-run/subject/process/workflow/slot, nonterminal,
truth-table mismatch, raw-bearing, or extra-destination input fails the run before a workflow
payload is accepted. This is the sole implementation path for all 80 workflow outcomes.

### Safe request correlation

The only injected header is exact `X-Inspector-Study-Correlation`. Its value is a fresh opaque ID
per logical request event, is not a capability, and cannot affect authentication or routing. A
participant candidate uses exactly the supervisor-generated armed grant correlation; the proxy
never generates a replacement for that branch. For a bundled-SPA or browser-only request outside
the grant branch, the adapter generates a fresh correlation before constructing any header.
After transient classification it constructs an in-memory `StudyBrowserRequestCandidate`. For
an eligible exact-issued request it removes every incoming
field with that name and injects exactly one canonical field; a blocked request receives no
forwarded header. The
candidate's complete root order is `schemaVersion`, `studyRunId`,
`browserAttemptId`, `correlationId`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`,
`methodClass`, `capabilityClass`, `originClass`, `effectClass`, `sameInspectorHost`,
`productAttributable`, `prohibited`. Version is literal `1`; `studyRunId` identifies the current
run; `browserAttemptId` is the current valid binding ID or literal `not-applicable` for a missing/
invalid marker; `correlationId` is the exact grant ID for participant or the adapter's fresh ID
for every other branch; and all classes and booleans
are the closed classification below. The candidate contains no subject/process ID and no raw
value.

Only a forwarded exact authorized `participant | bundled-spa` request reaches the server. Before
application handling, the Inspector-side probe requires exactly one correlation header, strictly
base64url-decodes it to 32 bytes, re-encodes it, and requires exact equality with the received
43-character canonical text. It then strips the header and constructs/submits only an exact
in-memory `StudyServerCorrelationClaim` through the existing `submit-product-event` command's
server-claim payload variant. The canonical `correlationId` string is the sole retained header-
derived value and may be covered by canonical payload/stream/handoff/witness/seal digests. Raw
header name/case/order/framing/wire bytes, whitespace, encoded representation, duplicate layout,
invalid/noncanonical spelling, and every alternate derived value are discarded before IPC and
never hashed or retained. The claim's complete root order is `schemaVersion`, `studyRunId`,
`correlationId`, `subjectId`, `inspectorProcessId`, `actorClass`, `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`,
`sameInspectorHost`, `productAttributable`, `prohibited`. It contains no browser-attempt ID and
no raw value. The command's outer process ID continues to authenticate the registered probe but
is not a claim/evidence field. Every claim copies the binding/registered subject and process IDs,
and its actor is exactly `participant | bundled-spa`; N/A claim IDs and all extension/other-host/
unknown claim branches are invalid. The probe independently derives
`StudyBrowserInitiatorProjection` from the unchanged six controlled headers and requires exact
agreement with the candidate tuple before submission. Direct Inspector-origin requests continue to use the probe-generated correlation
path and do not use a browser-attempt binding.

The supervisor owns a content-free in-memory broker keyed only by `studyRunId + correlationId`.
For every validated candidate it snapshots the current binding and open-context scope before
constructing evidence. Sources/adapters cannot supply or infer workflow. Before canonical payload
serialization the supervisor assigns the current open workflow tag. Without an eligible context,
workflow/link fields are literal N/A; before readiness, the process field is also literal N/A. That serialized choice is
immutable and can never be backfilled. A matching product-
attributable nonworkflow prohibited candidate is only a prospective eligible correlation until
its canonical observation is durably downstream-ACKed and accepted. The broker generates the
fresh evidence event ID and sends the canonical browser observation only as supervisor-to-
browser-adapter `safe-payload`. The adapter must match it to its validated candidate and binding,
then forward it unchanged to its watchdog; it cannot retag, create a workflow variant, or write
directly. Only after the watchdog ACK may the supervisor accept and count that observation. If it
is the first eligible correlation for the still-open matching context, the supervisor then
updates the mirror, sends the complete updated `scoring-context`, and waits for moderator ACK.
Only that sequence permits a later release decision or matching outcome submission.

For an exact-issued forwarded candidate, the lifecycle is timer-free and order-observable. The
broker first validates the exact attempt and actor projection. For `participant`, it additionally
requires the canonical armed grant and stores the candidate pending while that grant remains
armed; for
`bundled-spa`, it requires that the correlation is adapter-generated and consumes no grant. It
stores the validated candidate as `candidate-pending` and sends the one-use exact
`candidate-forward` `StudyBrowserBrokerDecision` as the sole authenticated acceptance and
forwarding authorization before the proxy forwards any byte. For participant, committing that
outbound decision atomically changes the canonical grant `armed -> consumed`; the adapter first
validates the matching decision, then changes its own copy to consumed and forwards. Failure
before the decision is committed wipes the pending candidate and leaves the canonical/local grant
armed, except that an authenticated replay or race invalidates the run and destroys both copies.
The Inspector probe then submits
exactly one claim and waits for the broker acknowledgement before application handling. The
broker resolves the current open attempt binding, requires actor exactly `participant |
bundled-spa`, requires the claim subject/process IDs to equal the binding and registered probe,
requires the independently projected six-header tuple and every class/boolean field to match,
and for participant revalidates the consumed grant/correlation relation. It atomically changes the entry to
`joined`, generates two distinct fresh `eventId` values, and constructs one canonical browser
payload plus one canonical server payload. It sends the browser member by the restricted
supervisor-to-browser-adapter `safe-payload` route and the server member by the existing
supervisor-to-server-ledger-adapter `safe-payload` route. Each adapter validates its matching
candidate or claim, sends the exact payload to its watchdog, and returns ACK only after watchdog
ACK. After both downstream ACKs the broker accepts and counts the joined observations, performs
the eligible mirror update and updated-context moderator-ACK barrier above when applicable, then
changes the entry to `released`, sends the one-use exact `joined-pair-released` decision, waits
for its ACK, and only then acknowledges the claim and
permits application handling and response/content completion. The two payloads
share correlation, subject/process IDs, classes, supervisor-selected workflow tag, N/A automatic/
review fields, and booleans, while event IDs are distinct. No adapter/watchdog may write
either before the complete join, and the proxy exposes no response/content before the released
decision.

There is no wall-clock join deadline, timeout, timeout state, or elapsed-time transition. After
`candidate-forward` commit, while `candidate-pending`, any unmatched proxy transaction end, abort, error, or connection close;
Inspector request abort; inherited-IPC close; product-probe close; attempt close; `stop`; or
relevant child exit atomically changes the entry to failed, invalidates the run, wipes the
pending candidate/claim, and releases zero members of the pair. A claim after any such lifecycle
event is late and fails. Claim-before-candidate, application handling before claim acknowledgement,
forwarding before matching `candidate-forward`, accepting/counting before every required
downstream ACK, releasing before any required updated-context ACK, or response exposure before the released decision
also fails. Advancing a clock alone can never change broker state.

For a browser-only blocked candidate, the broker requires that no server claim exists and
validates and stores exact order, unique correlation, actor decision, classes, booleans, and role.
That validated/stored blocked candidate is the safe-payload source but is never an accepted
candidate and never receives `candidate-forward`. It
constructs the browser payload under the context rule, sends restricted `safe-payload`; the
adapter validates the candidate and obtains watchdog ACK before ACKing the supervisor. Only then
does the supervisor accept/count the observation, perform any eligible mirror update and
moderator-ACK barrier, and send one exact `browser-only-released` decision. No blocked response can
complete before that decision ACK. Exact blocked cases follow the actor table: a participant-shaped nonexact/no-grant/
replayed request is valid-secret unknown with binding IDs and the critical tuple; an extension,
missing-secret other-host process, or invalid-secret unknown is
unrelated with N/A subject/process IDs and false attribution/prohibition; a blocked bundled-SPA
request uses binding IDs and its product-attributable prohibited tuple; a valid-secret unknown
uses binding IDs and the fail-closed critical tuple. No browser-only case may create a server
claim.

Each adapter classifies raw method, path, authority, marker, projection headers, and correlation
header only in memory and discards their prohibited representations before broker/evidence IPC.
Only the strict canonical correlation string may be retained and hashed as part of its canonical
safe payload. A duplicate, replayed, unknown, wrong-run, mismatched-projection/tuple,
unexpected-role/order, skipped acknowledgement, lifecycle-terminated, or late candidate/claim
fails the run. So does any unmatched broker entry at attempt close or `stop`. Failure releases no
member of an incomplete pair and destroys the pending entry.

The required role set per logical observation is closed:

| Observation source | `authorityClass` | Exact evidence roles |
|---|---|---|
| Exact authorized projected `participant \| bundled-spa` request forwarded to the exact-issued authority | `exact-issued` | `study-browser`, `inspector-server-ledger` |
| Any browser request blocked before forwarding | any | `study-browser` only |
| `inspector` request | `exact-issued` | `product-instrumentation`, `inspector-server-ledger` |
| `inspector` request | any other authority | `product-instrumentation` only |
| operating-system request, effect, MCP, execution, or mutation | any | `product-instrumentation` only |
| workflow result | `not-applicable` | `study-browser` only |

Every required role has exactly one record and no other role has one. Correlated records have the
same classifications, `subjectId`, and `inspectorProcessId`; their event IDs remain distinct and
their shared correlation ID occurs in no other logical event. Browser-only records use exactly
the IDs and classification selected by the ordered actor table; in particular, a valid-secret
unknown is critical with binding IDs, while extension and missing/invalid-secret unrelated cases
have N/A IDs. No blocked record or non-`participant | bundled-spa` actor has a server claim.
Missing, duplicate, malformed,
misrouted, or inconsistently classified propagation fails. A product request never requires a
browser record unless the matrix requires it.

## Envelope and chain

Each fixed `capture/streams/<streamRole>.ndjson` file has no header, footer, blank line, comment,
or alternate record. For every sequence it contains exactly two LF-terminated compact JSON lines
in order: exact `envelopeBytes`, then that envelope's exact `safePayloadBytes`. The next sequence
begins immediately with its envelope line. `StudyCaptureEnvelope` has this complete property set
and exact order:

`schemaVersion`, `streamRole`, `watchdogInstanceId`, `watchdogProcessRunId`,
`captureInstanceId`, `captureProcessRunId`, `sequence`, `recordKind`, `monotonicNs`,
`priorDigest`, `payloadSha256`.

- `schemaVersion` is literal `1`; `streamRole` is the stream's fixed role.
- The four opaque IDs are stable from the sole start through the sole stop. Every actual process
  start generates new instance and process-run IDs; a restarted process cannot inherit them.
- `sequence` is a nonnegative safe integer, starts at `0`, and increases by exactly one.
- `recordKind` is `capture-start | payload | heartbeat | handoff-anchor | capture-stop`.
- `monotonicNs` is a nonnegative base-10 integer string with no leading zero except `0`, sampled
  by the watchdog, and is nondecreasing across every envelope.
- `priorDigest` is 64 zeroes at sequence `0`; later it is the lowercase SHA-256 of the prior
  exact envelope bytes including LF. `payloadSha256` is the lowercase SHA-256 of only the
  corresponding canonical privacy-safe payload bytes.

Sequence `0` is the sole `capture-start`. Exactly one terminal `capture-stop` exists and no
byte may be appended afterward. Checkpoint and verification do not close or rewrite a chain.
`streamRootSha256` is therefore SHA-256 of the entire nonempty exact NDJSON file: the concatenation
of `envelopeBytes` then `safePayloadBytes` for every pair in sequence order. The verifier still
validates every line and pair rather than trusting that root.

## Closed privacy-safe payloads

Each payload has literal `schemaVersion: 1`, no extra property, and the following complete
property order. `eventCode` is the literal named for its row.

| `recordKind` | `eventCode` | Exact payload properties after canonical construction |
|---|---|---|
| `capture-start` | `capture-start` | `schemaVersion`, `eventCode`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `captureProcessReady`, `watchdogReady` |
| `payload` | `observation` | `schemaVersion`, `eventCode`, `eventId`, `correlationId`, `subjectId`, `inspectorProcessId`, `observationClass`, `actorClass`, `authorityClass`, `requestClass`, `targetClass`, `methodClass`, `capabilityClass`, `originClass`, `effectClass`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`, `sameInspectorHost`, `productAttributable`, `prohibited` |
| `heartbeat` | `heartbeat` | `schemaVersion`, `eventCode`, `studyRunId`, `watchdogHealthy`, `captureProcessHealthy`, `acceptedPayloadCount` |
| `handoff-anchor` | `handoff-anchor` | `schemaVersion`, `eventCode`, `studyRunId`, `checkpointRequestId`, `handoffSha256` |
| `capture-stop` | `capture-stop` | `schemaVersion`, `eventCode`, `studyRunId`, `candidateSha256`, `studyInputManifestSha256`, `checkpointRequestId`, `handoffSha256`, `continuityPassed`, `finalSequence`, `envelopeCount`, `payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`, `priorEnvelopeSha256` |

For `capture-start`, both readiness fields are literal `true`; the session, run, two identity
commitments, and two frozen lowercase study digests are identical in all streams. For
`heartbeat`, both health fields are literal `true`, `studyRunId` matches start, and
`acceptedPayloadCount` equals the number of prior accepted observation records.

Observation IDs are generated only by their contract-defined safe owner: the supervisor,
adapter, moderator, or registered product probe as explicitly assigned. Shared `correlationId`
values correlate only safe observations. At `start` the supervisor generates and owns exactly
twenty fresh unique subject tokens in one fixed runtime-only order; each is conveyed to the
harness and browser adapter only as the next `attempt-binding` and is used for one participant
across that participant's four workflows. No token-set, mapping, or extra token route exists.
`subjectId` is exactly one
of those tokens or literal `not-applicable`. It is the sole authorized pseudonymous participant
evidence and never embeds or maps to a real identity, distribution slot, response, or external
record. No mapping is distributed or retained.

`inspectorProcessId` is a fresh opaque supervisor-generated ID for one successfully ready
participant Inspector process or literal `not-applicable`. It is never an OS PID, path, digest,
distribution/subject/process-metadata derivative, capture/watchdog ID, prelaunch environment
value, or reused ID. A failure before exact Inspector
readiness records exactly four terminal workflow failures: discovery, inspection, comparison,
and global-consent. Each is independently classified by the review truth table; failure alone
never implies `workflow-blocker`. All four use the
same subject token, `inspectorProcessId: not-applicable`, occur exactly once, and admit no extra
or duplicate outcome. After readiness, every observation from that process uses the returned ID
through its exit. Every successful readiness registration gets a distinct ID.

Classification values are closed as follows:

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

`sameInspectorHost`, `productAttributable`, and `prohibited` are booleans. A request observation
uses non-`not-applicable` request and target classifications and `outcomeClass: observed`.
Before canonical serialization the supervisor assigns every nonworkflow observation the current
eligible open-context workflow, or literal `not-applicable` when no context is eligible; the
serialized tag is immutable and sources cannot self-declare it. A terminal
workflow row is exact: `eventCode: observation`,
`observationClass: workflow`, `actorClass: participant`; `authorityClass`, `requestClass`,
`targetClass`, `methodClass`, `capabilityClass`, and `originClass` all `not-applicable`; one of
the four non-N/A workflows; `outcomeClass: success | failure`; `sameInspectorHost: true` because
the outcome is bound to the study Inspector host context even for a pre-readiness failure;
`productAttributable: true`; and `prohibited: false`. Success requires `effectClass: none`;
failure follows the exact outcome review truth table above. Only reviewer-confirmed or reviewer-
disagreement critical failure has `effectClass: workflow-blocker`; automatic-critical and
reviewer-cleared failure has `effectClass: none`. Its automatic/review fields exactly equal the
submission truth table. A successfully ready launch uses
its returned process ID; a pre-readiness failure uses `inspectorProcessId: not-applicable`. It
contains no answer. Every other workflow tuple fails closed. Every nonworkflow payload uses
`automaticIssueCorrelationId`, `reviewDisposition`, `reviewerOneClassification`, and
`reviewerTwoClassification` all literal `not-applicable`; other observation classes use
`outcomeClass: observed`, and use workflow `not-applicable` except for the open-context automatic
link case above. MCP uses `targetClass: mcp`.

The authorized static row is closed to `authorityClass: exact-issued`, request class
`authorized-static`, one of the three static target classes, `methodClass: get | head`,
`capabilityClass: not-applicable`, `originClass: not-applicable`, `sameInspectorHost: true`,
`productAttributable: true`, `effectClass: none`, `prohibited: false`, and actor
`participant | bundled-spa`. `static-manifested-asset` is only a manifest-listed non-HTML asset;
`static-spa-shell` is only the packaged `/` or `index.html` shell; and
`static-client-route-fallback` is only one closed client-route fallback. The authorized API row
is closed to actor `bundled-spa`, exact-issued authority, authorized-api
request, `capabilityClass: valid`, same-host and attributable true, `effectClass: none`,
prohibited false, and exactly one method/target mapping. GET permits only `originClass: missing |
exact-same-origin`; POST requires `originClass: exact-same-origin`:

| Exact raw route classified only in adapter memory | `methodClass` | `targetClass` |
|---|---|---|
| `GET /api/v1/session` | `get` | `api-get-session` |
| `GET /api/v1/session/liveness` | `get` | `api-get-session-liveness` |
| `GET /api/v1/files/{fileId}` | `get` | `api-get-file` |
| `POST /api/v1/repository/rescan` | `post` | `api-post-repository-rescan` |
| `GET /api/v1/global/consent-preview` | `get` | `api-get-global-consent-preview` |
| `POST /api/v1/global/consent-preview` | `post` | `api-post-global-consent-preview` |
| `POST /api/v1/global/enable` | `post` | `api-post-global-enable` |
| `POST /api/v1/global/rescan` | `post` | `api-post-global-rescan` |
| `POST /api/v1/global/disable` | `post` | `api-post-global-disable` |

No other cross-field combination is authorized. The remaining product-attributable request/MCP
effect table is exact; `workflowClass` is `not-applicable` except for the open-context automatic
link case, `outcomeClass` is `observed`, and the automatic-link plus three review fields are
`not-applicable` for every nonworkflow row:

| Case | Exact classification and booleans |
|---|---|
| Exact-issued request outside the authorized tables | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: exact-issued`; `requestClass: prohibited`; observed closed `targetClass`, `methodClass`, `capabilityClass`, and `originClass`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Other-loopback request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: other-loopback`; `requestClass: prohibited`; `targetClass: other-loopback`; observed closed non-N/A `methodClass`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: unauthorized-request`; `sameInspectorHost: true`; `productAttributable: true`; `prohibited: true` |
| Remote request | `observationClass: request`; observed product-attributable `participant \| bundled-spa \| inspector` actor; `authorityClass: remote`; `requestClass: prohibited`; `targetClass: remote`; observed closed non-N/A `methodClass`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: prohibited-outbound-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Fully unclassifiable product-correlated request | `observationClass: request`; `actorClass: unknown`; `authorityClass: unclassifiable`; `requestClass: unclassifiable`; `targetClass: unclassifiable`; `methodClass: unclassifiable`; `capabilityClass: unclassifiable`; `originClass: unclassifiable`; `effectClass: unauthorized-request`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |
| Product MCP observation | `observationClass: mcp`; `actorClass: inspector`; `authorityClass: not-applicable`; `requestClass: not-applicable`; `targetClass: mcp`; `methodClass: not-applicable`; `capabilityClass: not-applicable`; `originClass: not-applicable`; `effectClass: mcp-connection`; `sameInspectorHost: false`; `productAttributable: true`; `prohibited: true` |

The IDs are the applicable binding/probe subject and process IDs. On the browser-attempt path,
the ordered initiator decision table is authoritative. A browser extension, a syntactically valid
missing-secret `other-host-process`, and an invalid-secret unknown are unrelated and use both IDs
N/A, `effectClass: none`, and false attribution/prohibition. A participant-shaped nonexact,
no-grant, replayed, or user-activated page-script navigation and every other valid-secret
remainder projected as unknown instead use the binding IDs,
`effectClass: unauthorized-request`, and true attribution/prohibition. A blocked bundled-SPA
request uses the binding IDs and the applicable product-attributable prohibited tuple. All have
`workflowClass: not-applicable`, `outcomeClass: observed`, and automatic/review fields N/A.
Operating-system mediation without product correlation uses
`observationClass: request`, `actorClass: operating-system`, `authorityClass: not-applicable`,
`requestClass: os-mediated`, `targetClass: not-applicable`, `methodClass: not-applicable`,
`capabilityClass: not-applicable`, `originClass: not-applicable`, `effectClass: none`,
`workflowClass: not-applicable`, `outcomeClass: observed`, `sameInspectorHost: true`,
`productAttributable: false`, and `prohibited: false`, with both IDs `not-applicable`. Every unlisted field value or
cross-field combination fails closed.

The `study-browser` stream is the sole workflow-observation role. It must contain exactly one
terminal `success | failure` for each of the four workflows for each of the twenty unique subject
tokens: exactly 80 workflow records, with no missing or duplicate subject/workflow pair. All four
attempts run for all twenty participants regardless of an earlier threshold. Discovery has at
least 19 successes and inspection at least 18 only as aggregate release criteria; comparison and
global-consent still have all twenty terminal outcomes. Any success/failure ratio, including a
threshold miss, remains canonical evidence when the exact 80-record shape and all protocol/
privacy rules pass. A threshold miss blocks release after sealing but does not invalidate
evidence, create an automatic critical issue, or require a fresh run. Arbitrary non-workflow safe
observations remain allowed.

The command schedule is fixed and reconciles start, checkpoint, and the single-attempt
invariant. `capture -- start` is run-level only: it binds the listener/proxy, launches the eight
long-lived processes, and writes the three `capture-start` pairs and first heartbeats. It creates
no attempt binding, browser context/profile, marker binding/secret, navigation grant, or bootstrap
exchange. Only after start returns do attempts run sequentially. Subjects 1 through 19 each run
`discovery -> inspection -> comparison -> global-consent`, terminalize all four rows, and fully
close/destroy their attempt before the next subject is prepared. Subject 20 runs discovery, then
the checkpoint/handoff commands execute; only that subject-20 attempt may remain open across the
checkpoint. After continuation verification, subject 20 runs inspection, comparison, and
global-consent and closes. If subject 20 terminalized early, its four rows and destruction are
already complete; the required post-anchor ordinary heartbeat still establishes continuation
progress. Thus all twenty discovery observations required for the SC-001 checkpoint exist while
at most one attempt binding exists. Every attempt's fresh browser context, marker secret, and
407/Basic/204 bootstrap are created after stream start and only immediately before that attempt's
`npx`/first capturable request; the bootstrap contributes zero candidate, correlation, or evidence
records even though the streams are live.

The handoff-anchor payload binds the exact handoff digest and request ID and appears exactly once
per stream. For `capture-stop`, `studyRunId` and both study digests equal start;
`checkpointRequestId` and `handoffSha256` equal the sole anchor; `handoffAnchorRecordCount` is literal `1`;
`continuityPassed` is literal `true`; `finalSequence` equals the stop envelope sequence; and
`envelopeCount` equals both `finalSequence + 1` and
`2 + payloadRecordCount + heartbeatRecordCount + handoffAnchorRecordCount`. All kind counts equal the observed prior
records. `priorEnvelopeSha256` equals the lowercase SHA-256 of the exact preceding envelope bytes
including LF and the stop envelope's `priorDigest`. The independent verifier recomputes every
value; declarations never establish their own truth.

## Heartbeat boundary and handoff

The watchdog targets a nominal drift-free cadence of 1,000,000,000 monotonic nanoseconds. That
target is not a second acceptance threshold. The only observed maximum is 1,500,000,000 ns,
applied independently to all four gaps:

1. capture-start to first heartbeat;
2. every pair of consecutive heartbeats;
3. latest heartbeat to checkpoint/handoff; and
4. last heartbeat to capture-stop.

Exactly 1,500,000,000 ns passes; 1,500,000,001 ns fails. Intervening observation payloads do not
reset or conceal a heartbeat gap. The first heartbeat must pass before Inspector launch.

### StudyCaptureHandoff

Exact `capture -- checkpoint` makes the supervisor send one exact `checkpoint` stream control
through each adapter under one fresh `checkpointRequestId`. Each adapter relays byte-identically;
each watchdog finishes the pair currently ahead of that request, records the resulting complete
prefix position and checkpoint monotonic value, returns its exact immutable checkpoint result,
and immediately continues normal appends and nominal heartbeats without stopping, sealing, or
holding later records. The adapter relays each result byte-identically and the supervisor accepts
the checkpoint only after all three matching results. The
controller writes no handoff or sidecar. Exact `verify -- checkpoint` independently recomputes
the bundle, candidate digest, and those immutable prefixes while each ledger may continue to
grow, and is the sole creator of
`capture/study-capture-handoff.json` and
`capture/study-capture-handoff.sha256`. It then sends the exact handoff digest and checkpoint ID
through runtime control `anchor-handoff`; the supervisor sends matching exact stream controls
through the adapters. Each watchdog appends exactly one `handoff-anchor` pair without pausing its
heartbeat queue and returns its exact anchor result through the byte-identical relay; the verifier
returns success only after all three results and independent validation of all three anchors.
Snapshotting, anchoring, and a slow verifier must not cause a
heartbeat gap above the same 1.5-second ceiling.

`StudyCaptureHandoff` is a fresh canonical object with this complete root property order:
`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`,
`checkpointRequestId`, `streams`. Version is literal `1`; the session, checkpoint request, and
study run IDs and both commitments equal the supervisor/start values; both digests equal the
independently rehashed frozen inputs; and `streams` contains exactly three entries in fixed
stream-role order.

Every handoff stream entry has this complete property order:

`streamRole`, `watchdogInstanceId`, `watchdogProcessRunId`, `captureInstanceId`,
`captureProcessRunId`, `checkpointSequence`, `checkpointMonotonicNs`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `lastEnvelopeSha256`,
`latestHeartbeatSequence`, `latestHeartbeatMonotonicNs`, `latestHeartbeatEnvelopeSha256`,
`running`, `sealed`.

- Role and four IDs equal every retained envelope for that fixed stream. No `capture-stop` exists
  at or before the checkpoint.
- `checkpointSequence` is a nonnegative safe integer selecting the last complete retained pair
  in the atomic prefix snapshot. `checkpointMonotonicNs` uses the envelope `monotonicNs` decimal
  grammar, is sampled by that watchdog with the snapshot, is no earlier than that pair's
  `monotonicNs`, and does
  not regress the stream clock.
- `envelopeCount` equals `checkpointSequence + 1`, the actual retained pair count in the snapshot,
  and `1 + payloadRecordCount + heartbeatRecordCount`. Kind counts equal the observed
  records and `heartbeatRecordCount` is positive.
- `lastEnvelopeSha256` covers the exact envelope at `checkpointSequence`, including LF.
  `latestHeartbeatSequence` is a nonnegative safe integer selecting the actual latest heartbeat
  in the snapshot and is no greater than `checkpointSequence`;
  `latestHeartbeatMonotonicNs` uses the same decimal grammar and equals that envelope's value; and
  `latestHeartbeatEnvelopeSha256` covers its exact bytes including LF. The difference from that
  monotonic value to `checkpointMonotonicNs` is at most 1,500,000,000 ns regardless of
  intervening payloads.
- `running` is literal `true` and `sealed` is literal `false`.

Handoff bytes use the pretty canonical serialization defined above. Its companion contains only
the lowercase SHA-256 of those exact bytes followed by one LF. The verifier writes each once;
missing, partial, rewritten, noncanonical, mismatched, extra, or pre-existing handoff artifacts
invalidate the run. Later pairs may already exist when the handoff is completed; they are outside
the immutable checkpoint prefix, not part of its counts or roots. Continuation validates the
first pair after `checkpointSequence` with the same role/IDs, exact sequence +1, and
`lastEnvelopeSha256` as its `priorDigest`; requires exactly one request-ID/digest-matching
handoff anchor after the checkpoint and before stop; and requires at least one subsequent
ordinary heartbeat or payload pair under the same uninterrupted chain. Already queued
post-prefix pairs may precede the anchor. An alternate valid prefix plus recomputed handoff/
companion fails because its digest cannot equal the later chained anchor. SC-006 continuation is
mandatory regardless of SC-001 result.

## Cross-stream final seal

After stop, only the supervisor remains. The independent verifier revalidates the current full
binding and all retained input, handoff, stream, stop, and child-exit facts. Exact
`finalize-prepare` returns only literal `null` after the supervisor independently compares the
current binding, confirms the same continuity-key-held commitments, and prepares complete
witness material while leaving the endpoint live. The continuity key never leaves supervisor
memory.

The verifier then opens the separately authenticated `finalize-commit` connection and sends the
same runtime binding, checkpoint ID, and handoff digest. After accepting that request, the
supervisor begins listener teardown and returns the exact `StudyContinuityWitness` as the
authenticated response payload over that already-open connection. It constructs and queues the
response, destroys all authority and key material, closes after the complete response, and
exits. The verifier validates the returned witness against its independent checks, requires the
complete authenticated response followed by EOF, and requires a new local connection to fail
because the endpoint is absent/unavailable. Those are the portable finalize confirmation
semantics. The real-process integration test additionally owns a direct supervisor child handle
and proves actual process exit rather than inferring it only from the endpoint.

Only after that confirmation may the verifier reserialize the exact returned canonical value and create
`capture/study-continuity-witness.json` and its `.sha256` companion. The fresh canonical witness
has this complete root order:

`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`,
`checkpointRequestId`, `handoffSha256`, `processes`, `orchestrators`,
`ephemeralReviewerProcessExitCount`, `runtimeControlRemoved`.

Version is literal `1`, identifiers/commitments/digests equal every earlier binding, and
`runtimeControlRemoved` is literal `true`. `processes` contains exactly six fresh objects in
fixed stream order, and within each stream `watchdog` then `capture`. Each has exact order
`streamRole`, `processRole`, `instanceId`, `processRunId`, `stopEnvelopeSha256`, `exitCode`,
`signal`. `processRole` is respectively literal `watchdog` or `capture`; `instanceId` and
`processRunId` equal that role's chain IDs; `exitCode` is literal `0`, and `signal` is literal
`null`. The watchdog and capture entries for one stream repeat that stream's exact stop-envelope
digest. Each capture/adapter exit fact comes from the supervisor's direct OS child observation;
each watchdog exit fact comes from the matching adapter's parent-OS observation in an accepted,
ACKed, identity-matched clean exit attestation. The witness companion contains only the lowercase SHA-256 of the exact pretty canonical
witness bytes followed by one LF.

`orchestrators` contains exactly two exit entries in order `study-harness`,
`scoring-moderator`. Each has exact root order `processRole`, `componentRunId`, `exitCode`,
`signal`; role and component ID equal the start response, exit code is literal `0`, and signal is
literal `null`; both facts come from the supervisor's direct OS child observations.
`ephemeralReviewerProcessExitCount` is a nonnegative safe integer equal to `reviewVoteCount`;
every counted reviewer process has a distinct registered identity and matching clean exit
attestation created from the moderator's direct parent-OS observation and ACKed by the supervisor
before outcome submission, so two reviewed votes mean two process exits and no uncounted live/
replaced collector exists. These three direct adapter exits, three authenticated watchdog exits,
and two direct orchestrator exits are the exact eight long-lived clean exit facts required before
stop succeeds; no supervisor-OS-observed grandchild claim is made.

The verifier next creates exact `capture/study-capture-seal.json` and
`capture/study-capture-seal.sha256` as `StudyCaptureSeal`. Its fresh root has exact order
`schemaVersion`, `controlSessionId`, `studyRunId`, `workRootIdentityCommitment`,
`candidateIdentityCommitment`, `candidateSha256`, `studyInputManifestSha256`, `handoffSha256`,
`continuityWitnessSha256`, `automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`,
`reviewVoteCount`, `reviewDisagreementCount`, `reviewerCriticalIssueCount`,
`criticalIssueCount`, `zeroCriticalIssueGate`, `streams`. Version is literal `1`; all values equal the witness,
starts/stops, handoff, and independently recomputed candidate/manifest bytes. `streams` has
exactly three entries in fixed role order.

The seven aggregate fields are verifier-derived and exact. For each distinct correlation among
nonworkflow observation rows with `prohibited: true`, the verifier constructs tagged automatic
issue ID `automatic:<correlationId>`; correlated stream copies deduplicate. This includes a
workflow-N/A pre-readiness observation and an observation that was a candidate in a successful
workflow; link use or non-use neither suppresses nor duplicates it. For each workflow row
whose disposition is `reviewer-confirmed-critical | reviewer-disagreement-critical`, it constructs
tagged reviewer issue ID `reviewer:<subjectId>:<workflowClass>`. The prefixes make the two classes
disjoint, and IDs deduplicate within each class. Let `A` be automatic-set cardinality; let `S` be
the number of workflow rows whose disposition is `reviewer-cleared |
reviewer-confirmed-critical | reviewer-disagreement-critical`; let `D` be the number whose
disposition is disagreement; and let `R` be reviewer-set cardinality. Then
`automaticCriticalIssueCount = A`, `suspectedWorkflowBlockerCount = S`,
`reviewVoteCount = 2 * S`, `reviewDisagreementCount = D`,
`reviewerCriticalIssueCount = R`, and `criticalIssueCount` is the cardinality of the tagged,
deduplicated union, which equals `A + R` because the classes are disjoint. A workflow row marked
`automatic-critical` creates no reviewer issue ID; only its separate nonworkflow prohibited
correlation is counted, and its exact link must satisfy the accepted-observation rules above.
Threshold failures and `reviewer-cleared` rows add no
critical issue. `zeroCriticalIssueGate` is literal `true` iff `criticalIssueCount === 0` and the
exact twenty-subject-by-four-workflow terminal set is complete, even though seal creation already
requires that set. A protocol/review-shape error prevents a seal instead of becoming a count.

Each `StudyCaptureStreamSeal` has exact order `streamRole`, `watchdogInstanceId`,
`watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `envelopeCount`,
`payloadRecordCount`, `heartbeatRecordCount`, `handoffAnchorRecordCount`,
`firstEnvelopeSha256`, `lastEnvelopeSha256`, `streamRootSha256`. IDs equal every envelope in that
stream; counts equal the stop and observed records; `handoffAnchorRecordCount` is literal `1`;
first/last digests cover the exact start/stop envelope bytes including LF; and the root uses the
ordered-pair preimage defined above. `continuityWitnessSha256` equals the witness companion
value. The seal companion contains only the lowercase SHA-256 of the exact pretty canonical seal
bytes followed by one LF. No alternate witness/seal filename, copy, or retention sidecar is
permitted.

The structurally independent verifier re-enumerates the bundle and twenty distributions;
recomputes candidate, manifest, descriptor, script-binding, output, payload, envelope, chain,
heartbeat, count, anchor, stop, stream-root, witness, seal, and companion bytes/digests; and
independently recomputes all seven critical-issue aggregates from the sealed ledgers; and verifies clean process termination, commitment continuity, supervisor removal, and the exact
final work-root layout. It does not trust the builder/capture serializer, supervisor
declarations, handoff/stop declarations, recorded counts, generated roots, or existing witness
or seal. A partial, restarted, replaced, truncated, concatenated, or stitched stream can never
be repaired or sealed.

## Exact commands and lifecycle

`package.json` defines exactly:

```json
{
  "study:evidence:inputs": "node scripts/build-usability-study-inputs.mjs",
  "study:evidence:capture": "node scripts/run-usability-study-capture.mjs",
  "study:evidence:verify": "node scripts/verify-usability-study-evidence.mjs"
}
```

The only command forms, in protocol order, are:

```text
pnpm run study:evidence:inputs -- materialize
pnpm run study:evidence:verify -- inputs
pnpm run study:evidence:capture -- start
pnpm run study:evidence:capture -- checkpoint
pnpm run study:evidence:verify -- checkpoint
pnpm run study:evidence:verify -- continuation
pnpm run study:evidence:capture -- stop
pnpm run study:evidence:verify -- finalize
```

The inputs executable accepts only canonical `materialize`; the capture executable's only
external operational subcommands are canonical `start`, `checkpoint`, and `stop`; and the
verifier executable alone accepts `inputs`, `checkpoint`, `continuation`, and `finalize`.
Internal capture-script modes require their current-parent-sponsored inherited channel and are
not command alternatives. No executable accepts a verifier phase through the capture entrypoint,
a capture phase through the inputs/verifier entrypoint, or an alias/spelling variant.

Unknown, missing, repeated, or extra subcommands/arguments fail. No command may fall back to an
installed, downloaded, PATH-selected, or network-fetched implementation. Exit `0` means that
the requested phase and every prerequisite check passed; skipped, partial, inconclusive,
unverifiable, invalid, already-stopped, or already-sealed states return nonzero.

`materialize` verifies and launches the supervisor before changing the empty root, completes the
one ready/runtime-bootstrap/ACK barrier, mutates only after that ACK, then detaches the
materializer edge with authenticated lifecycle close while leaving the external supervisor live.
It materializes only the closed distributions/directories. `inputs` is
read-only, uses `verify-inputs`, and does not read candidate/proxy environment. `start` requires
the unchanged root/control bindings plus candidate/proxy bindings, securely creates only the
three empty stream files and append-only handles, launches exactly two orchestrators plus six
stream processes, accepts all six registrations, transfers and ACKs the browser proxy binding,
thereby binds the deny-by-default proxy, then uses exact start controls/results to write the three
capture-start/first-heartbeat prefixes. It creates no attempt, browser
profile/context, marker, grant, or bootstrap. It returns only after all eight long-lived internal descendants,
three starts, and three first heartbeats are live; only then may the sequential attempt schedule
create per-attempt equipment immediately before that attempt's `npx`. Capture `checkpoint` records only the atomic
in-memory prefix snapshots, never holds later appends, and keeps all processes live. Verify
`checkpoint` uses `read-checkpoint`, creates only the exact handoff pair, anchors its digest in
all streams, and verifies those anchors. `continuation` is otherwise read-only, rehashes the
candidate, and uses `verify-continuation`. `stop` is accepted once only after 80 terminal
workflow records, all required observations, closure of every registered probe, zero live
reviewer, and destruction of all attempt/grant/marker state. It closes the proxy, appends terminal
pairs through exact stop controls/results, closes writer handles, accepts all three watchdog exit
attestations, directly observes all three adapter and two orchestrator exits, and leaves only the external supervisor live.
It writes no witness or seal. `finalize` does not read proxy environment; it rehashes candidate
and inputs, performs `finalize-prepare` and `finalize-commit`, confirms supervisor/endpoint
removal, and creates in order only the exact witness pair and seal pair after full protocol,
canonical, and final-layout verification. A canonical threshold-miss run still makes `finalize` exit `0` and
seal; the separate aggregate release decision is non-approving.

## Failure classes and required tests

Fixed failure classes are `input-closure`, `fixture-distribution`, `work-root-authority`,
`candidate-binding`, `script-closure`, `runtime-control-authentication`, `proxy-enforcement`,
`product-probe`, `privacy-schema`, `correlation-integrity`, `workflow-coverage`,
`process-continuity`, `canonical-chain`, `heartbeat-continuity`, `handoff-integrity`,
`handoff-continuation`, `continuity-witness`, `terminal-seal`, and `command-lifecycle`. Each
returns a fixed code with opaque IDs/counts only, nonzero exit, and no prohibited value. Every
class blocks release evidence; capture failures are automatic critical issues and require a
wholly fresh study run with new IDs.

`workflow-coverage` means a missing, duplicate, extra, nonterminal, or mismatched member of the
twenty-by-four matrix, never a release-threshold miss. A discovery/inspection threshold miss is a
valid sealed aggregate result that blocks release only; every other protocol/privacy failure
class retains the fail-closed critical handling above.

`tests/contract/usability-study-evidence.test.ts` must reject every manifest/root/member/role/
order/canonicalization/digest deviation; descriptor locale, script binding, base64, encoding,
output-set, and bilingual mismatch; unknown/extra/reordered envelope or payload field; invalid
enum/ID/count/digest; forbidden raw value; noncanonical seal; and companion mismatch.
It must also enforce all phase-specific environment-variable grammars without retaining their values;
the phase-specific exact work-root layout and NDJSON line alternation; regular-file-only
`nlink === 1` while accepting ordinary non-1 directory link counts; the complete exact
`StudyCaptureHandoff` root/stream orders, literals, equations, heartbeat binding, canonical bytes,
filename, companion, anchor payload, witness, and seal; candidate rehash/identity-commitment
requirements; and the sole authorized handoff/witness/seal writers and filenames. It must
enforce every runtime-control root/payload property order, command, phase, canonical HMAC
preimage, direction domain, one-use challenge, constant-time tag validation, null rule, error
code, and connection framing. It must also enforce the exact two-unidirectional-pipe/96-byte
inherited bootstrap, closed role/edge/message matrix, frame root/order/canonical bytes, direction-key derivation,
sequence/replay rules, constant-time tag comparison, ready/close/wipe lifecycle, and key nonreuse.
It validates exact `StudySupervisorRuntimeBootstrap`, `StudyBrowserProxyRuntimeBinding`,
`StudyProcessLifecycleAttestation`, `StudyStreamControl`, and `StudyStreamControlResult` roots,
orders, directions, source roles, one-use/state barriers, restricted reverse ACKs, parent-OS
provenance, immutable binding repetition, semantic result routing, and every wrong/missing/extra/
duplicate/replay/reorder/source/identity/exit/authority branch. It requires materializer mutation
only after runtime-bootstrap ACK, materializer detach without supervisor exit, browser proxy bind
only through its exact frame/ACK, and no authority transfer through environment or argv.
It enforces the browser-edge `safe-payload` restriction, rejects every workflow/product/server or
candidate-bypass variant, and proves the adapter cannot infer/replace a workflow tag. It checks
exact context schedule and readiness gating: pre-ready N/A; buffer ACK/destroy; open-binding dual
ACK; discovery-context ACK; readiness response; then grant/navigation/task, with later contexts
opened only after prior browser-watchdog acceptance and destruction.
It must enforce exactly one closed canonical safe payload per
authenticated IPC message, exercise multiple payloads in distinct messages within the same
primary-workflow/study observation, and require every accepted message to be counted and
chained. It also exhaustively checks the target/method matrix, all five exact prohibited/effect
rows and every rejected cross-field tuple, every invalid workflow tuple, actor false-attribution
rows, the correlation role matrix, both broker-candidate property orders, attempt-binding state
transitions and single-active-attempt invariant, twenty subject tokens, launch-ID lifecycle, and
exactly 80 workflow terminals. It validates the three review fields and truth table, two isolated
one-use votes for every failure whose context candidate is N/A, no third/raw/identity/notes in
runtime/evidence, a separately governed administrative uniqueness record with no runtime ingress, the one-at-a-
time scoring-context lifecycle, and every seven-field seal aggregate equation. It separately proves that threshold-pass and threshold-miss ratios both canonicalize
and seal, while only the aggregate release decision differs.
It covers every context-candidate/outcome branch: success keeps N/A submission fields while the
candidate observation still increments the independent automatic set; failure with a non-N/A
candidate must use that exact automatic link and cannot enter review; failure with candidate N/A
must use review; and a pre-readiness no-context observation stays workflow N/A/unlinked while
still incrementing the automatic set.
It rejects a claim payload on `product-instrumentation`, a safe-observation/claim variant swap,
wrong outer registered process ID, nonpending correlation, and either wrong claim-ID actor branch.
It rejects every `StudyWorkflowOutcomeSubmission`, `StudySafetyReviewVote`,
`StudyCurrentSubjectScoringContext`, and `StudyBrowserProxyMarkerBinding` field/order/enum/ID/
bootstrap/pair-count/state deviation and any attempt to treat one as a supervisor control command.
It validates the exact pre-readiness registration/buffering/register-product command roots,
proof roots, buffer/draft roots and orders, one-way states, ID freshness and non-disclosure,
single product destination, and ACK-before-effect/release/destroy/open/terminalization ordering.
It accepts a product-attributable N/A-process payload only as an ordered same-run/same-subject
`terminalization-bound` release before readiness with workflow N/A; it requires every
`readiness-bound` release to use the assigned non-N/A process ID and rejects every other or
post-readiness product-attributable N/A payload.

`tests/integration/usability-study-evidence.test.ts` must use real child processes and authenticated
IPC to run materialize, inputs, start, checkpoint, continuation, stop, and finalize. It proves
twenty fresh byte-identical distributions and exact derived trees; watchdog-only concurrent
serialization; independent recomputation; mandatory continuation after a simulated SC-001
failure; all four heartbeat gaps; and exact 1,500,000,000-pass/1,500,000,001-fail fake-clock
boundaries. It must create an existing empty local work root and an external candidate, verify
every exact phase transition in the retained tree, prove two NDJSON lines per sequence, take the
atomic prefix snapshots while real appends and heartbeats continue during a deliberately slow
verifier, submit multiple payloads in distinct authenticated IPC messages within the same
primary-workflow/study observation and prove each accepted message is counted and chained, create
the handoff only from the verifier, append and observe all three anchors, reject an alternate
valid prefix with a recomputed handoff, rehash the candidate at every verifier phase, and leave
no runtime-control endpoint or unlisted artifact after finalize. It uses a real Unix socket or
Windows named pipe, actual HMAC framing/replay attempts plus the exact inherited binary bootstrap/
frame protocol, exact descriptor slots 3/4/5 and pass-only append authority, real registration/
exit attestations and restricted reverse ACKs, byte-identical stream control/result relays, an
actual `npx`/self-import/readiness path including pre-ready buffering,
ACK-preserving abrupt exit, both readiness-bound and terminalization-bound releases, and non-
target discard, and the exact headed Playwright 1.61.1 Chromium revision `1228`, browser version
`149.0.7827.55`, Chrome for Testing profile with a distinct
`study:<browserProxyMarkerSecret>` Basic marker. After the run-level stream start and immediately
before every sequential candidate `npx`/first capturable request, it proves exactly one bodyless
407 whose headers are exactly `Proxy-Authenticate` followed by `Connection: close`, one canonical
retry, one bodyless 204 whose sole header is `Connection: close`, and zero DNS/connect/application/
evidence before authorization. It proves the distinct actual-browser-exit and healthy-adapter external-equipment-failure terminal branches,
and run invalidation without synthesis for every internal malformed 407/204/output, proxy,
marker/authentication, IPC, implementation, adapter, or watchdog fault. It proves marker ACK
activates only marker copies while the attempt remains prepared until readiness/open dual ACK.
It rejects adapter read/write/seek/duplication of descriptor 5, readable/wrong/swapped/extra/
missing handle authority, stable-identity drift, non-adapter descriptor 5, and every stream path/
cwd/environment/argv leak. It verifies start result only after first heartbeat, immutable
checkpoint result, exact anchor result, and stop result before handle close/clean-exit attestation.
Throughout the run it proves strict canonical decoding,
pre-forward stripping, no DNS/connect on blocked
targets, independent equal proxy/server initiator projections, and all exact broker correlation
surfaces. It proves that the marker grants no actor, product, application, control, or forwarding
authorization; sole authenticated `candidate-forward` acceptance precedes forwarding; fresh
no-grant/nonexact/page-script/post-consumption HTTP requests become blocked observations while
authenticated candidate/grant IPC replay or simultaneous consume invalidates; blocked
browser `safe-payload` candidate validation and watchdog/downstream ACK precede
observation acceptance/counting, any mirror/context ACK, `browser-only-released`, and completion;
joined browser/server `safe-payload` downstream ACKs precede observation acceptance/counting and
any mirror/context ACK, which precede `joined-pair-released` decision ACK, which precedes claim ACK, application handling, and
response completion. It also proves the full buffer/open-binding/context/readiness gate leaves no
post-ready/pre-context event. Fake-clock advance alone never
ends a join; every specified transaction/request/IPC/probe/attempt/stop/child lifecycle race fails
without a partial pair. Close/abort/crash/finalize leave no binding, pending join, marker
configuration, browser context/process, profile/history/cache/credential-store entry, raw marker
byte, encoded Basic value, or `browserAttemptId` persistence. It proves all twenty-by-four
workflow attempts, including four N/A-process failure outcomes following the review truth table for a pre-readiness failure,
plus both passing and failing aggregate-threshold outcomes, three supervisor-direct adapter exits,
three accepted adapter-OS watchdog exit attestations, two supervisor-direct orchestrator exits,
and exact moderator-OS-attested one-use reviewer-collector exit cardinality equal to the review-vote cardinality, continuity-key
non-disclosure and supervisor-held commitment continuity, authenticated final EOF, endpoint removal, and actual directly observed supervisor
process exit.

`tests/security/usability-study-evidence.test.ts` must inject sentinel headers, bodies, content,
paths, capabilities, authorities, URLs, errors, and participant responses and prove that no
sentinel, encoding, digest, or sidecar reaches capture-evidence IPC or any retained artifact. It also kills,
pauses, restarts, and replaces each process; races heartbeat/payload writes; changes IDs and
clocks; inserts missing/duplicate/reordered records; corrupts chains/payloads/counts/digests;
truncates or appends after stop; alters candidate/manifest/distribution/script bytes; introduces
extra, symlink, junction, non-regular, hard-link, alias, escape, and drift cases; and attempts
premature stop and cross-stream stitching. It must additionally cover missing/relative/nonempty/
explicit-UNC/server-share/device/network-spelled/replaced work roots, a changed work-root
environment or identity, candidate inside the work/distribution tree, candidate
link/type/identity/byte drift, missing or changed candidate
environment, extra retained/control artifacts, stream filename or line-pair deviations, every
handoff field/count/digest/order/literal corruption, handoff rewrite/precreation, and continuation
from anything other than the exact handoff boundary. It tampers every script/helper/child/module
load; directly invokes/replays internal modes and nonces; mutates verified bytes between check and
exec; injects raw or wrong-direction control tokens/tags, replayed challenges, extra commands,
wrong payload orders, TCP/UDP/network/remote-pipe endpoints, an authorizing proxy-credential
scheme or control-token reuse, missing/malformed/noncanonical/duplicate/stale/mismatched/replayed
marker secrets, duplicate/replayed/mismatched/unexpected-role/lifecycle-terminated/unmatched/late
broker candidates and claims, valid-secret initiator-projection spoofing, forbidden extension/
other-host/unknown claims, claim destination/outer-ID spoofing, remote CONNECT/DNS attempts,
malformed/duplicate correlation headers, probe handshake/import/
environment failures, duplicate/missing workflow terminals, current-run subject/process ID reuse,
and every workflow/reviewer cross-field mutation, witness/commitment/process-exit/removal
corruption. It also tries
wrong/missing/replayed runtime bootstrap before mutation, inherited authority/env/argv leakage,
wrong/present/aliased endpoint bootstrap, pre-ACK root mutation, materializer detach failure,
wrong/missing/replayed browser-proxy binding, pre-ACK proxy/stream action, forged or wrong-source
process registrations/exits, attestation ACK reuse for another message, nonclean-child laundering,
mutated stream controls/results, adapter-synthesized results, and readable/swapped/extra/missing/
wrong-slot descriptor-5 authority. It proves each rejected case closes required handles/state and
cannot create evidence or synthesized participant outcomes. It also tries
to inject raw response, ground-truth, rubric, DOM, screenshot, moderator, and scoring values into
the workflow IPC and to route workflow payloads through product commands or another stream.
Sentinel work-root, candidate, endpoint, proxy authority, token, raw/encoded marker, raw
correlation-header representation, response, timing, ground truth, and rubric bytes must be absent
from all retained bytes, hashes outside the exact contract-defined
runtime-bootstrap, browser-proxy-binding, runtime-control, marker-install, and frame-
authentication transient HMAC exceptions, and process output. Reviewer identity/notes must be absent
from the repository bundle, work root, candidate, study runtime, capture/evidence, hashes, logs,
outputs, handoff, witness, and seal; the separately governed administrative roster may contain
only the minimum identity/slot fields already permitted and must be destroyed under its retention
procedure. Tests instrument digest inputs to prove that only the canonical
43-character correlation string, never its wire/header representation, enters the required
evidence digest chain. Normal close, abort, and crash tests inspect isolated `HOME`, XDG, profile,
history, cache, keychain/credential-store, environment, argv, application-request, and output
surfaces and prove zero secret, encoded Basic, or `browserAttemptId` persistence. Every case must
fail closed with no raw disclosure or partial joined evidence.
