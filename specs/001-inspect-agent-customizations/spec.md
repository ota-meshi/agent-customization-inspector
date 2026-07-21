# Feature Specification: Inspect Agent Customizations

[日本語](spec.ja.md)

**Feature Branch**: `dev`

**Created**: 2026-07-15

**Status**: Ready for Implementation

**Input**: User description: "Define the initial Agent Customization Inspector product from the supplied local product description without retaining a link to that temporary source."

## Clarifications

### Session 2026-07-15

- Q: What establishes the Repository source root? → A: The selected Repository root: the exact process working directory returned by the one `process.cwd()` capture when `--cwd` is omitted, or the one valid path supplied by `--cwd`. On Windows, explicit UNC/server-share/device, current-drive/root-relative, and drive-relative forms such as `C:` or `C:foo` are rejected before resolution; only a plain relative option is resolved lexically against the captured anchored invocation directory, while an absolute drive option is retained. POSIX retains an absolute option or resolves a relative option against the capture. The resulting absolute string must pass the shared pure `LexicalAbsoluteRootParts` parser, and root selection itself performs zero filesystem/network I/O. Before the CLI is imported, the fixed package-integrity bootstrap may read only package-owned manifests and their declared package assets; a rejected selection performs no I/O derived from or directed at the invocation `cwd`, `--cwd`, or any Repository root and no DNS, SMB, or outbound-network call. The initial release has no separate repository picker or ancestor-root discovery.
- Q: Which term should describe the first product scope? → A: Use “initial release” throughout the specification.
- Q: What should the specification call a discovered agent-customization file? → A: Use “customization file” throughout the specification.
- Q: What should the specification call the documented set of filesystem paths eligible for inspection? → A: Use “inspection path allowlist” throughout the specification.
- Q: How must vendor lookup tables and their evidence be organized? → A: Keep vendor lookup behavior separate from Inspector matchers and runtime composition; use separate product documents, separate Repository and User/Global tables, separate GitHub Copilot VS Code/CLI/Cloud tables, and stable official-source references for every maintained row.

### Session 2026-07-16

- Q: What runtime implementation constraint applies to the initial release? → A: Implement all executable application code as JavaScript/TypeScript. The CLI, local host, and inspected-source I/O run on Node.js public JavaScript APIs, while the browser receives generated JavaScript plus declarative HTML/CSS assets; strict JSON manifests, documentation, and license files remain valid package data. Do not use Rust, Node-API or other native addons, prebuilt native binaries, package-lifecycle compilation, or package-lifecycle/runtime artifact downloads.
- Q: What filesystem-race guarantee is possible under that Node.js-only constraint? → A: Centralize inspected-source I/O in one Node.js module, reject links and boundary failures exposed by public Node.js APIs, compare root, ancestor, candidate-path, open-handle, and post-read identity, canonical-location, and metadata snapshots, and discard all candidate bytes when a mismatch is detected. Use `O_NOFOLLOW` as final-component defense in depth when Node.js exposes it and the platform enforces it. The threat model excludes an adversarial local process that races a source root or ancestor or, where effective `O_NOFOLLOW` is unavailable, final path component between these non-atomic checks; public Node.js APIs also cannot reveal every same-device mount or reparse behavior. These residual risks and their Node.js or operating-system resolution paths must remain documented.

### Session 2026-07-17

- Q: How are user-global roots represented as Sources? → A: Represent each supported tool's admitted Global root as its own Global Source—Codex at `CODEX_HOME`, Claude at `CLAUDE_CONFIG_DIR`, and Copilot at `COPILOT_HOME`—so a session has zero to three Global Sources. A Source has exactly one root; customization files of different types within that root remain separately visible.
- Q: How should literal credentials and environment-variable references in customization files be presented? → A: Display source text, displayed declared metadata values, authored relationship targets, and comparison content as authored without credential masking or a reveal workflow so literal differences remain visible. Treat environment-variable references in inspected content as literal text and never resolve or substitute their process values; the documented tool-home environment variables are used only to locate Global roots. Warn users that opening a file displays its full content, which may include sensitive values, while keeping operational diagnostics and logs free of duplicated source values.
- Q: What happens to the previous inventory when an explicit rescan fails fatally? → A: Keep the last successfully committed snapshot visible, label it as stale because the rescan failed, and show an actionable failure diagnostic. Discard every uncommitted result from the failed scan, including partial results, and replace the retained snapshot only after a later rescan commits successfully.
- Q: What path term applies consistently across Repository and Global sources? → A: Use “source-relative path” for the path from a customization file's owning Source root. For the Repository Source this is relative to the selected Repository root; for each Global Source it is relative to that tool's admitted home root. Use “repository-relative path” only when discussing the Repository Source specifically.
- Q: What environment is used for SC-002 performance measurements? → A: Before any release measurement, freeze a versioned SC-002 reference-environment profile in the repository. The profile identifies the exact operating-system image and version, processor architecture and model, logical processor count, memory, storage medium and filesystem, exact application-runtime version, benchmark command and configuration, and deterministic fixture manifest and digest. Every run in one measurement set must match that profile. Publish the profile ID and actual recorded environment values with the result, omitting only personal identifiers and absolute user paths. Changing any profile field creates a new profile, and results from different profile IDs are not directly comparable.
- Q: How many measured runs make up one SC-002 measurement set? → A: Use exactly 10 measured runs on one unchanged versioned reference-environment profile.
- Q: How many of the 10 measured SC-002 runs must pass? → A: At least 9 runs must each show a qualifying current-request scan status within 1 second and a complete inventory within 10 seconds.
- Q: Does each measured SC-002 run reuse one Inspector process or start a new one? → A: End the Inspector after every measured run and start a new process for the next run so application-memory state and the previous scan snapshot are not reused.
- Q: What are the start and end points for SC-002 timing? → A: Start both timers when the browser submits the scan request. Stop the 1-second timer when the first qualifying current-request scan status is visibly rendered and exposed to assistive technology, and stop the 10-second timer when the complete inventory is rendered and its primary list controls are operable. Exclude `npx` download, installation, and process-start time.
- Q: How many participants are used to evaluate SC-001 and SC-006? → A: Use exactly 20 participants for each criterion; SC-001 requires at least 19 successes and SC-006 requires at least 18 successes.
- Q: Do SC-001 and SC-006 use the same participants or separate cohorts? → A: Use the same 20 participants in one evaluation session; they attempt SC-001 first and then SC-006.
- Q: What experience must SC-001 and SC-006 participants have? → A: Participants use Git and a command-line interface in their normal development work but have never used the Inspector or contributed to its development.
- Q: May moderators give operational hints during SC-001 and SC-006? → A: Moderators may only repeat the standardized task prompt verbatim; they must not provide command, navigation, or interface-operation hints.
- Q: How are equipment, environment, or product failures handled in the participant evaluation? → A: Keep every enrolled participant in the fixed denominator and never replace one. A failure is unsuccessful when it prevents or interrupts criterion completion, including before the task timer starts. The sole scoring distinction is a handled SC-001 automatic-browser-opening failure: record it and require the printed-URL fallback in a pinned certified browser, but do not count that condition alone as unsuccessful when the participant completes without prohibited hints inside the original two-minute interval; the timer is never paused or restarted. Failure to complete or interruption during that fallback remains unsuccessful.
- Q: What starting state is used for SC-006 after SC-001? → A: Regardless of the SC-001 result, place every participant in the same prepared Inspector state with the same designated customization file open; start the SC-006 timer when that state is ready and the standardized task prompt is presented.
- Q: What counts as a critical usability issue for SC-006? → A: A problem is critical if it prevents completion of a primary workflow without prohibited assistance or causes an unsafe behavior such as unintended execution, inspected-source mutation, a prohibited direct product-issued outbound request or MCP connection as defined by FR-022, or exposure of inspected content to another machine. The two exact internal loopback HTTP classes authorized by FR-022 are neither outbound nor MCP connections and are not this automatic event. Recorded OS-mediated traffic for a pre-mounted or mapped source remains the FR-022 platform/environment limitation rather than this automatic connection event.
- Q: Is the operating system filesystem cache cleared between SC-002 runs? → A: Do not deliberately clear or reset the operating system filesystem cache; run all 10 measurements in its natural evolving state while still starting a new Inspector process for each run.
- Q: Where does the SC-001 two-minute timer start and stop? → A: Start when the standardized task prompt is presented, and stop when the source/details view for one discovered customization file is visibly open and operable. The timed interval includes launching the Inspector from the intended Repository root and every subsequent participant action through that stop condition. In the controlled study the equipment prepares the intended Repository root as the working directory of the fixed launch command, so root selection is not a separate timed participant action; selecting a root by changing to it or by supplying `--cwd` remains a product capability verified by the automated User Story 1 tests.
- Q: How is a successful SC-006 identification recorded and scored? → A: Provide a standardized response form with required fields for source, recognizing tools, file type, and certain or conditional effective behavior. A participant succeeds only by submitting all four fields within two minutes with every field matching the designated file's predefined ground truth; any missing or incorrect field is unsuccessful.
- Q: How is the SC-002 performance fixture managed across its 10 measured runs? → A: Prepare one deterministic fixture before measurement, keep it unchanged, and reuse it for all 10 runs. Fixture construction and setup are outside the timing intervals.

### Session 2026-07-18

- Q: How are critical usability issues evaluated across all primary workflows for SC-006? → A: After the timed SC-006 response, the same 20 participants attempt standardized comparison and Global-consent tasks; SC-001 and SC-006 supply discovery and inspection. An ACKed context correlation is only an eligible failure link: success keeps all submission link/review fields N/A while the automatic issue is counted separately; a failure with an eligible candidate MUST use its exact `automatic-critical` link without review; and only a candidate-free failure receives two isolated, hidden, one-use reviewer votes. Two `product-caused-blocker` votes yield `reviewer-confirmed-critical`, two `not-product-caused-blocker` votes yield `reviewer-cleared`, and one of each yields `reviewer-disagreement-critical`. The published governance plan names the required reviewer roster, while a separate access-controlled administrative assignment record audits one unique human pair per case and is destroyed under the consent-retention policy; no reviewer identity, assignment, note, communication, reuse, or third reviewer enters runtime collectors, study-input artifacts, capture, or evidence. Automatic IDs are derived as `automatic:<correlationId>` and reviewer IDs as `reviewer:<subjectId>:<workflowClass>`. The final seal recomputes their tagged, de-duplicated union without double-counting automatic-linked rows. Every enrolled participant and outcome remains recorded, and the gate passes only when the exact 20-by-4 terminal set is complete and that union is empty; success thresholds remain independent.

### Session 2026-07-19

In the preceding reviewer answer, “reuse” means reuse of a human, collector process/component-run
identity, or case assignment; literal reviewer slot labels and sanitized terminal-equipment
surfaces may be drained/reset and freshly mapped to a later case.

- Q: Does the child-process prohibition also forbid the product's browser-launch helper? → A: No. The only permitted product-initiated child process is the fixed operating-system browser-launch helper used at startup under FR-001. It receives no inspection-derived content or path, authored value, user-supplied command, or environment-selected handler. It may copy only the closed ambient platform-key set directly from the launch environment; lexical equality with a Source root does not change provenance, grant authority, or permit copying an inspection-derived value. Inspection remains usable when automatic opening is disabled, unsupported, or fails. No customization-file discovery, read, parsing, display, comparison, or relationship processing may initiate a child process.
- Q: Which declared metadata and relationships are relevant or known for FR-007? → A: For presentation, each supported customization file type is an exact `(tool, kind)` plus an admitted source form. The maintained supported-customization documentation enumerates the closed field and relationship sets for each row and its exact source-form extractor applicability. The initial release presents only authored occurrences that satisfy both gates and never infers an unlisted entry or promotes a field across source forms.
- Q: How is the sub-100-millisecond inventory interaction target measured? → A: After the complete 500-match inventory is operable in each SC-002 run, perform one standardized filter action and one standardized item-selection action. Time each action from browser input dispatch until the corresponding filtered results or selected-state feedback is visibly rendered and operable. At least 9 of the same 10 runs must keep both actions below 100 milliseconds.
- Q: What qualifies as the one-second SC-002 status? → A: A qualifying status is a visibly rendered, assistive-technology-exposed state for the current scan request that explicitly says the scan is queued, names an active scan phase, or reports complete, partial, or failed; a failure also identifies a practical next step. A generic spinner or “loading” label, an unchanged control, an acknowledgement without scan state, or status retained from an earlier scan does not qualify.
- Q: Who owns the first-time participant evaluation? → A: The maintainer team owns the initial-release study and its recruitment, compensation funding, moderation, review, consent/privacy handling, equipment and session support, bilingual materials, and accessibility accommodations. It is a release-evidence obligation, not a per-pull-request obligation, and ordinary contributors are never asked to recruit, fund, moderate, or review participants.
- Q: How are documented runtime or hosted inputs with no originating customization file represented? → A: Represent them as evidence-linked Source Condition Facts attached to the relevant Source. They are documented, non-authorizing facts, not Customization Files or Tool Recognitions; they never create a file ID, source-relative path, source text, comparison target, relationship origin, local or hosted read, or network request. Uninspected current runtime state remains conditional or unavailable.
- Q: How do user-story priorities constrain implementation order? → A: Priorities describe relative user value, while implementation preserves the original family-vertical delivery order. After shared setup and blocking foundations, each family completes its US1 discovery and US2 complete inert detail before its US3 comparison, then the next family begins in this exact order: SKILL (including Skill Metadata) → Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents → Configuration/Settings → Output Styles → Marketplaces → Plugin Manifests → Hooks. Repository-wide Inventory, Detail, and Comparison Acceptance close Repository work in that order; Global inspection (US4, P3) follows, and cross-cutting verification and release evidence remain last.
- Q: What does it mean for Repository results to remain unchanged when Global enablement commits? → A: The Repository Source keeps its stable `sourceId`, and its customization-file membership, source-relative paths, readable or diagnostic states, recognitions, relationships, Source Condition Facts, Repository-scoped diagnostics, and authored source text remain semantically unchanged because that operation does not rescan the Repository. Every successful initial or retry Global Source commit advances the session generation, rekeys all generation-owned graph IDs, and invalidates every previous-generation `FileDetail`, comparison selection or view, and editor-model state. Those identity and user-interface lifecycle changes are not semantic changes to Repository results. An all-rejected attempt produces no Global Source commit and is outside this rule.
- Q: What location context does each Diagnostic carry? → A: Every retained Diagnostic has exactly one scope. A file-scoped Diagnostic requires a coherent `sourceId`, `fileId`, and `sourceRelativePath` tuple in which the file belongs to that Source and the path is that file's path within the Source; a source-scoped Diagnostic requires only `sourceId` and forbids `fileId` and `sourceRelativePath`; a session-scoped Diagnostic forbids all three location fields. Scope describes location independently of whether the Diagnostic belongs to a committed generation or the session lifecycle.
- Q: How is SC-008 scored? → A: Maintain semantically equivalent English and Japanese WCAG 2.2 AA applicability matrices that enumerate every Level A and AA success criterion. Each row records applicability, a rationale when not applicable, stable IDs for its named automated checks, manual checks, or both, the expected observation, and resulting evidence. Manual check IDs run against a closed matrix that fixes the packed release candidate, both locales, exact platform/browser/assistive-technology versions, viewport/orientation/zoom/text-spacing profiles, UI modes, workflow states, and input profiles; every applicable cell is recorded, and changing a frozen release or matrix value reruns all manual checks. Applicable rows form the denominator, which must be nonzero. Every applicable row and applicable manual cell must have all required mappings and evidence and pass every mapped check; a missing row, rationale, mapping, cell, or result fails the gate. SC-008 passes only with zero failed applicable criteria, without a separate “critical accessibility defect” classification.
- Q: Which scan does each SC-002 run measure when the Repository scan starts automatically? → A: Wait for the automatic initial Repository scan to finish, then have the browser submit one explicit Repository rescan. The admission response supplies an opaque `scanRequestId`; qualifying status, the successful commit, and the rendered inventory must all identify that same request. Only the generation committed by that request can stop the 10-second timer, so an earlier automatic inventory or status can never satisfy the run.
- Q: What counts as an inspected-source mutation? → A: Count product-issued requests to write, truncate, create, rename, delete, link, change mode or ownership, set times, extended attributes, or ACLs, or open with mutation-capable flags. The Inspector issues none. A read-side access-time update performed solely by the operating system is outside product control and is not counted as a product-issued mutation; tests record it separately, never request it, and never use it as evidence that the Inspector mutated the source.
- Q: What structural interpretation is allowed without making the Inspector a semantic analyzer? → A: Allow syntax-only parsing, exact extraction of authored literal occurrences, mechanical typed decoding, classification against frozen documented catalogs, and projection of documented order, scope, condition, selection, and reference relationships. Across inventory, detail, comparison, Global controls, diagnostics, Source Condition Facts, API responses, CLI output, and documentation, do not interpret or rank natural-language meaning, decide correctness, effectiveness, compliance, or quality, or provide remediation advice.
- Q: Is sensitive-content acknowledgement an API authorization factor? → A: No. Capability authentication on the loopback, session-only API is the access-control boundary. Acknowledgement is a mandatory bundled-browser presentation invariant: each newly loaded browser document and every client-data purge resets it, and the bundled browser issues no `FileDetail` request and constructs no comparison until the user acknowledges the warning. The gate therefore covers complete source text, authored declared-metadata values, authored relationship targets, and either comparison side. A client-data purge is the central full-session client reset that clears inventory, detail, comparison, editor models, in-memory metadata, and acknowledgement after document-liveness failure or an equivalent terminal reset. The Global-disable action MUST perform that purge before sending its request, and observation of a greater Global content epoch or a non-null disable fence MUST repeat it before rendering. Closing a route, ordinary file or Source removal, or changing generation may instead dispose only the affected models and is not by itself a client-data purge, so acknowledgement may remain for the loaded document. The API and operational logs never treat acknowledgement as a substitute for capability authentication.
- Q: Does the Inspector define file-size or item-count validation limits? → A: No. File and collection capacity is determined by Node.js, the parser, the operating system, the filesystem, the browser, and the execution environment. The Inspector does not reject or classify customization content by a product-defined size or count ceiling. Any thrown exception or rejected operation aborts the affected publication attempt without the file or scan layers classifying whether its cause is capacity, resource, or operational; that attempt commits no item, Source, recognition or derived result, scan-result record or success response, or generation, never authorizes a partial generation, and leaves only any prior committed snapshot available.
- Q: When may a scan publish a partial generation? → A: Only after complete traversal and generation assembly when one or more admitted entries produced an FR-028-eligible deterministic, non-throwing entry-local outcome as data while unaffected entries remain complete. Complete outcomes such as readable `utf-8-replaced` text are expressly excluded from that partial condition. An exception or rejected operation from filesystem I/O, decoding, parsing, extraction, coordination, assembly, serialization, transport, or lost authority is never converted into an entry outcome and never authorizes partial publication.
- Q: How are verified bytes decoded? → A: After the same-handle read and all post-read identity checks succeed, any NUL byte classifies the file as binary and diagnostic-only. Otherwise decode once as UTF-8 using replacement semantics, recording and removing one leading BOM when present. When invalid byte sequences are replaced with `U+FFFD`, record `utf-8-replaced` and pass that exact garbled decoded string through display, parsing, extraction, and comparison. Never detect or retry another encoding.
- Q: Does an absolute Global root outside the ordinary home fail merely because of its location? → A: No. An absolute configured root accepted by the shared pure `LexicalAbsoluteRootParts` parser is eligible for post-consent admission even when it is outside the ordinary home. Absence selects the documented default; empty, relative, parser-rejected, inaccessible, or boundary-unverifiable roots follow the closed outcomes below and never create fallback authority.
- Q: How are the release-evidence denominators for SC-003, SC-004, SC-005, SC-007, and SC-009 frozen? → A: A checked-in, versioned release-evidence fixture manifest assigns stable case IDs, required classes, fixture or builder references, expected outcomes, and content digests to those criteria. The manifest version and digest identify the exact denominator used for a release candidate; a missing case, unexecuted case, digest mismatch, or empty required class fails the affected criterion. Removing or reclassifying a case, changing a required-class definition, or changing an expected outcome requires an explicit manifest-version increment and review rather than silently weakening the denominator. A fixture-byte-only change instead requires both the referenced-fixture digest and canonical manifest digest to change. Either kind of change starts a new non-comparable measurement set.

### Session 2026-07-20

- Q: Does generation 0 require filesystem admission before the Repository Source exists? → A: No. Session bootstrap MUST capture the invocation working directory from `process.cwd()`, select the Repository root from that string or a valid `--cwd` value using lexical path operations only, and create exactly one Repository Source synchronously with zero filesystem I/O. Its escaped root label and stable `sourceId` are non-authorizing session identity only; the central source-boundary module MUST separately admit the retained raw selected root before any Repository enumeration or read. A deterministic admission or scan failure outcome leaves that Source present with failed scan status and publishes no customization files or generation. A thrown or rejected automatic-startup operation instead follows FR-041 and may end the process or session.
- Q: How may a user select a Repository root other than the invocation working directory? → A: The CLI MUST accept `--cwd <path>` at most once. When omitted, the selected Repository root is the exact string from the one `process.cwd()` capture. On Windows it MUST reject every explicit two-leading-separator UNC/server-share/device spelling, single-separator current-drive/root-relative value, and drive-relative value including `C:` and `C:foo` before calling `resolve`; only a plain relative option is lexically resolved against the captured anchored drive-form invocation directory, while an absolute drive option remains unchanged. POSIX retains an absolute option or lexically resolves a relative option against the capture. The selected absolute result, including the omitted-option invocation string, MUST pass the same shared pure `LexicalAbsoluteRootParts` parser used by Global preview and central admission. A missing or empty value, duplicate `--cwd`, pre-resolution Windows rejection, or parser rejection MUST produce a fixed actionable startup diagnostic and exit before creating a session or opening a browser. Only the earlier fixed package-owned integrity reads may have occurred: root selection itself MUST perform zero filesystem/network I/O, and the rejected launch MUST perform no invocation-`cwd`-, `--cwd`-, or selected-root-derived I/O and no DNS, SMB, or outbound-network call. A syntactically valid selected root still grants no authority until normal source-boundary admission succeeds.
- Q: Which tools does one Global-inspection consent enable? → A: Consent is session-wide, not tool-selective. Before consent, the product performs no proposed-root filesystem I/O. After one explicit Global opt-in, one transaction MUST attempt all three frozen preview entries and automatically include every root that is structurally present and passes admission. The user cannot select or deselect individual tools. A lexically invalid root, an exact structural `lstat` absence, or a deterministic link/type/boundary rejection creates no Source and does not block the admitted subset; all admitted Sources publish together in one atomic generation. Any other thrown or rejected operation follows FR-041, aborts that transaction, and commits none of its subset. If no root is admitted and no operation throws or rejects, the transaction uses the documented all-rejected outcome.
- Q: How are the three Global root inputs captured consistently across platforms? → A: On each request that creates a new unconsented preview, read `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once each in that fixed order. A value is absent only when the captured value is `undefined`; an empty string is a present override. If any value is absent, call the imported `node:os.homedir()` exactly once for that request and lexically append `.copilot`, `.claude`, or `.codex` with the active platform's `node:path.join` for the corresponding absent value. Do not separately choose among `HOME`, `USERPROFILE`, or another platform variable. This capture performs no filesystem operation or existence check. Any throw/rejection during environment capture, `homedir()`, joining, retention, escaping, or preview serialization propagates to the preview REST boundary as the generic pre-acceptance Operation Error and creates no preview or authority. A successfully created preview freezes all three exact strings and is never recaptured while active consent uses it.
- Q: How are root strings classified, displayed, and bound without Unicode or escape ambiguity? → A: Assign Global state in order: a present environment string of length zero is `present-empty`; a string containing U+0000 or an unpaired UTF-16 surrogate is `invalid`; otherwise active-platform `node:path.isAbsolute` false is `relative`; an absolute spelling rejected by the shared pure zero-I/O `LexicalAbsoluteRootParts` parser is `invalid`; and only a remaining parser-accepted absolute spelling is `eligible`, carrying its exact parsed operands into post-consent admission. Parser rejection includes the exact POSIX and Windows component, separator, U+FFFD, UNC/network/device/current-drive, and malformed-drive cases closed in the data model. For every Repository or Global root label, iterate exact UTF-16 code units without normalization: copy only ASCII letters, digits, `.`, `/`, `:`, `_`, and `-`; encode every other code unit as `\uXXXX` with four uppercase hex digits, including each surrogate half and every backslash. Render that ASCII result as text, never HTML, and never decode it for I/O. Bind previews with the data-model's canonical HMAC-SHA-256 record encoding over exact big-endian UTF-16 code units, both raw and display strings, the fixed-order roots, and the complete traversal/checkpoint plans; do not use UTF-8 replacement encoding for raw JavaScript strings.
- Q: Who handles a runtime file-read error? → A: The file, parser, recognition, and scan layers MUST NOT catch it to classify, retry, recover, or create a diagnostic item. The rejected Node.js operation propagates to the execution boundary that owns the trigger. For a REST-triggered operation, that boundary exposes a path/content-free REST error—directly if the request has not been accepted, or as the terminal error of the already accepted asynchronous job—and keeps the process and prior committed snapshot available. For an automatic startup operation with no REST owner, the error propagates to the process top level and the product does not promise process survival. Neither path commits a failed-attempt item, result body, or generation, and no product operational log or REST representation exposes the raw error.
- Q: How can expected absence coexist with runtime-owned file-read errors? → A: Only an `lstat` call made at a contract-declared structural existence checkpoint MAY catch Node's exact `ENOENT` code and return the closed `absent` or `entry-disappeared` outcome required for root selection, exact-target fallback, or race detection. This narrow conversion is not a content `open` or `read` failure and MUST NOT inspect the message, infer another cause, or apply to any other code or operation. Every other throw or rejection, including `ENOENT` from `open` or `read`, follows FR-041 unchanged.
- Q: What happens to non-NUL bytes that are not valid UTF-8? → A: Process the replacement-decoded garbled text as-is. Decode once with UTF-8 replacement semantics, preserve every resulting `U+FFFD` in `sourceText`, label the encoding `utf-8-replaced`, and continue ordinary parsing, extraction, display, and comparison. This decode outcome is complete rather than partial by itself. Do not guess a source charset or try a second decoder. A NUL-containing file remains `binary`, diagnostic-only, and contracted-partial.
- Q: How are Unicode-normalization collisions and multiple hard-link paths represented? → A: For an enumerated path, retain the exact raw entry-name segments returned by `Dirent.name`; for a targeted fixed path that intentionally performs no parent enumeration, retain the exact immutable registry target spelling. Use only that provenance-specific spelling for filesystem operations, while deriving a collision-free NFC Source-relative Path for public matching and display. If distinct enumerated raw paths in one Source normalize to the same NFC path, reject the whole collision group before opening any member and emit only one pathless session-scoped Diagnostic because no unambiguous public path exists. If distinct collision-free allowlisted paths in one Source resolve to the same verified physical regular file, publish one Customization File: choose the unsigned UTF-8-bytewise lowest NFC path as its primary Source-relative Path, retain the remaining unique NFC paths as sorted aliases, and keep every raw provenance. Filters, detail labels, and selection match the primary and aliases; a file-scoped Diagnostic uses only the primary path. Symlinks are never aliases, and identity is never merged across Sources.
- Q: What exactly counts as an empty Codex override for fallback selection? → A: Only a safely verified and read non-binary `AGENTS.override.md` whose decoded string has `String.prototype.trim().length === 0` after recording and removing one optional leading UTF-8 BOM is empty. Whitespace-only text is empty. A safely read `utf-8-replaced` string follows the same test, so any retained `U+FFFD` makes it non-empty. Only exact `ENOENT` from the contract-declared initial target `lstat` counts as absent and permits fallback; a deterministic unsafe or binary outcome ends selection with its Diagnostic, and every throw or rejection, including `open` or `read` `ENOENT`, propagates under FR-041 without fallback.
- Q: How is VS Code 1.118+ workspace-root `.mcp.json` handled while the current MCP guide still omits it? → A: Admit the exact root file as a second compatible Copilot/MCP provenance on the same physical file already eligible for CLI recognition. The 1.118 release note establishes only the VS Code path and a most-specific same-name rule; the current guide still documents `.vscode/mcp.json` as the workspace `servers` file and does not establish the root-file schema or a total order. Preserve `documentationStatus: conflict`, add no VS Code-owned root extractor fields, and retain selection as unknown until direct official documentation resolves it.

### Session 2026-07-21

- Q: What does an active-consent Global retry target, and what state may it replace? → A: It reuses the same frozen preview, consent record, and fixed ordered tuple `[copilot, claude, codex]`. Retry is offered only after the matching preview is verified, `globalEnableInProgress` is null, `pendingTools` is empty, and `retryableTools` is nonempty. The server derives the complete fixed-order `retryableTools` set: non-pending unpublished `admitted` controls plus `rejected` controls whose `retryDisposition` is `same-preview`; published, pending, and lexical `new-preview-required` controls are excluded, and neither the UI nor API may add, omit, or reorder a target. During tentative validation/admission only authority-free `globalEnableInProgress` becomes newly visible; every existing Repository and Global Source, control, batch/diagnostic field, `pendingTools`, `retryableTools`, and the prior committed snapshot retain their exact pre-operation projection. If every retry target is deterministically rejected, atomically update those controls and return `active-no-job` without a `scanRequestId`, scan job, Source, generation, or existing-Source replacement. If one or more targets are admitted, atomic queued acceptance creates exactly one `GlobalBatchScan` and one `scanRequestId`, changes `pendingTools` to exactly that admitted subset with matching `batchStatus`, preserves the existing Sources, and publishes all newly admitted Sources together in one atomic generation; a throw or rejection follows FR-041 and restores the exact pre-operation state.
- Q: How does SC-001 apply under the fixed study launch protocol? → A: The study equipment spawns the fixed fd6 launch line `npx --no-install agent-customization-inspector --no-open` without a shell in the verified distribution `repository/` working directory, so the equipment prepares the intended Repository root and the participant neither changes directory nor supplies `--cwd`; those selection forms remain product capabilities verified by the automated User Story 1 tests rather than timed participant actions. Because the fixed line includes `--no-open`, every study attempt deliberately follows the documented printed-URL fallback in the pinned certified browser; that condition is recorded uniformly for every attempt and is never by itself unsuccessful, exactly as the handled automatic-opening condition already provides.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Repository Customizations (Priority: P1)

A developer selects the intended Repository root by changing to it or supplying `--cwd <path>`, launches the inspector through `npx`, and receives a browser-based inventory of the customization files recognized for GitHub Copilot, Claude Code, and OpenAI Codex. The selected Repository root is always represented as its own Repository Source. The inventory may also present maintained Source Condition Facts about relevant non-file or uninspected runtime behavior, clearly separated from customization files.

**Why this priority**: Finding the relevant files without running an agent is the smallest useful version of the product and the prerequisite for every later workflow.

**Independent Test**: Launch the inspector once with a fixture repository containing supported, unsupported, nested, and multiply recognized files as the invocation `cwd`, and once from another directory with that fixture selected by relative `--cwd`. Confirm that both runs select the same Repository root and that the inventory contains every supported customization file at an allowlisted inspection path, excludes unrelated files, and identifies its Repository Source, customization file type, source-relative path, and recognizing tools.

**Acceptance Scenarios**:

1. **Given** `--cwd` is omitted and the invocation `cwd` contains supported customization files for all three tools, **When** the user starts an inspection, **Then** the browser shows that directory as one Repository Source and an inventory that can be filtered by tool and customization file type.
2. **Given** the user launches from another directory and supplies an accepted plain-relative or absolute `--cwd`, **When** the user starts an inspection, **Then** the selected parser-accepted root is shown as the one Repository Source, the process working directory is unchanged, and no path derived from or directed at that selected root is read before source-boundary admission; only the earlier fixed package-owned integrity reads may already have occurred.
3. **Given** `--cwd` is duplicated, lacks a non-empty value, uses a rejected Windows UNC/device/current-drive/drive-relative form, or yields a result rejected by `LexicalAbsoluteRootParts`, **When** startup parses the command line, **Then** it emits a fixed actionable diagnostic and exits without creating a session or opening a browser; after the fixed package-owned integrity bootstrap, root selection performs zero filesystem/network I/O and the whole rejected launch performs zero selected-root, DNS, SMB, or outbound-network I/O.
4. **Given** one physical `AGENTS.md` recognized by both Copilot and Codex, **When** the inventory is displayed, **Then** it appears once as a customization file with two distinct tool recognitions.
5. **Given** files outside the repository inspection path allowlist, **When** the repository is scanned, **Then** those files are not interpreted or presented as customization files.
6. **Given** no supported customization files, **When** the scan completes, **Then** the user sees a successful empty state that explains the supported scope rather than an error.
7. **Given** documented Copilot Cloud behavior is relevant to the Repository Source but has no local originating file and its hosted state is not inspected, **When** the inventory is shown, **Then** the inspector presents a separately labelled Source Condition Fact with its tool, surface, documented condition or unavailable state, and evidence; it creates no synthetic file, source-relative path, source-text action, comparison target, hosted read, or network request.

---

### User Story 2 - Inspect Customization Files Without Activating Them (Priority: P1)

A developer opens a customization file to read its source text, relevant metadata, source boundary, tool recognitions, and documented scope or relationships. The inspector makes uncertainty explicit and never executes or evaluates the customization file.

**Why this priority**: The product is intended for untrusted customization files; safe, faithful inspection is a core value rather than a later enhancement.

**Independent Test**: Inspect fixtures containing executable hook commands, skills with scripts, MCP server definitions, imports, malformed data, literal credentials, environment-variable references, and boundary-crossing links while monitoring filesystem writes, child processes, and network activity and supplying sentinel environment values. Disable automatic browser opening or begin child-process monitoring after the one permitted fixed browser-launch helper has completed. Confirm that the inspected content remains inert, literal values and references are displayed as authored without environment substitution, no sentinel value is introduced into displayed content, and diagnostics preserve access to unaffected customization files.

**Acceptance Scenarios**:

1. **Given** a customization file declaring a command, hook, plugin, skill, workflow, extension, or MCP server, **When** the user opens it, **Then** the inspector displays the declaration without starting it, connecting to it, or evaluating its instructions.
2. **Given** a supported configuration with a literal credential and an environment-variable reference, **When** it is displayed or compared, **Then** both are shown as authored without masking, the environment-variable reference is not resolved, and no reveal action is required.
3. **Given** a Claude import that points outside its source boundary, **When** the customization file is inspected, **Then** the relationship and a boundary diagnostic are shown without reading or expanding the target.
4. **Given** precedence or effective behavior that depends on an unknown runtime surface, version, trust decision, working directory, flag, or environment, **When** the customization file is inspected, **Then** the inspector labels the uncertainty and does not claim a definitive winner or effective configuration.
5. **Given** a file produces a deterministic, non-throwing malformed, binary, changed-entry, or boundary outcome after complete traversal, **When** the scan assembles results, **Then** the inspector may publish only the contracted-partial outcome with an actionable diagnostic and complete unaffected files. Invalid non-NUL UTF-8 alone instead produces a readable `utf-8-replaced` result and does not make the scan partial. **Given instead** a file read throws or rejects, **Then** no file or scan layer catches or classifies it: a REST-owned operation exposes a generic REST error and keeps the process and prior committed snapshot available, while an automatic startup operation propagates to the process top level; neither path publishes a result from that attempt or a validity or lint verdict.
6. **Given** a Source Condition Fact has no originating file, **When** the user reviews its details, **Then** the inspector explains the documented behavior, affected scope, evidence, and uncertainty without fabricating authored content, file provenance, or an effective runtime result.

---

### User Story 3 - Compare Customizations (Priority: P2)

A developer selects any two distinct readable discovered customization files with different physical file IDs and compares their source text and recognition metadata side by side to understand overlap and differences without asking an agent to interpret them. Authored values remain visible so credential differences are not hidden. Deterministic diagnostic-only items remain visible in the inventory but are not comparison-selectable; a thrown or rejected read never creates such an item.

**Why this priority**: Comparison turns a file inventory into a practical migration and troubleshooting aid while preserving the product's non-semantic scope.

**Independent Test**: Select two distinct readable fixtures with different physical file IDs from the same Repository Source with different tool recognitions, verify aligned source and metadata views, and confirm that the inspector reports literal differences and recognition differences without rating correctness or proposing changes. Confirm that a deterministic diagnostic-only Repository fixture cannot be selected for comparison and that a rejected read creates no item. This test requires only the Repository work completed before Global inspection.

**Acceptance Scenarios**:

1. **Given** two distinct readable customization files with different physical file IDs, **When** the user compares them, **Then** both complete source views and their source-relative path, source, file type, and tool-recognition metadata are visible together without content-based masking.
2. **Given** the same customization file has multiple tool recognitions, **When** it is compared with another customization file, **Then** each recognition remains distinguishable from the physical file.
3. **Given** two files contain conflicting natural-language instructions, **When** they are compared, **Then** the literal difference is shown without declaring which instruction is semantically correct or effective.
4. **Given** a discovered customization file has a deterministic diagnostic-only outcome, **When** the user reviews comparison choices, **Then** that item remains available for diagnostic review but cannot be selected as a comparison input; a file whose read threw or rejected is absent because the attempt did not commit.

---

### User Story 4 - Opt In to User-Global Inspection (Priority: P3)

A developer deliberately gives one session-wide consent to inspect the small, documented set of user-global instruction paths. The product attempts all three supported tool roots and automatically includes every root that exists and passes admission; it offers no per-tool selector. The Repository Source remains independently identifiable by its stable `sourceId`, and its semantic inventory and authored source content remain available unchanged while every successful Global admitted-subset commit replaces generation-owned identities and resets prior-generation detail, comparison, and editor-model state.

**Why this priority**: Global instructions can explain behavior that repository files alone do not, but inspecting a user's home configuration increases privacy risk and therefore must remain optional and strictly scoped.

**Independent Test**: Start with two supported Global roots present and one missing, and confirm that none are probed or read before opt-in. Confirm that the consent UI offers one all-tools action and no per-tool selector. Enable Global inspection and verify that the product attempts all three frozen preview entries, rejects the missing root without fallback, and atomically publishes only files at the specified instruction paths under the two separately identified admitted Global Sources, each with exactly one root. Compare one readable Repository file with one readable Global file and confirm that both remain bound to their independently identified owning Source and Source-relative Path while retaining the literal, non-semantic behavior required by User Story 3. Confirm that the successful admitted-subset commit advances the session generation, rekeys all generation-owned graph IDs, invalidates all previous-generation `FileDetail`, comparison, and editor-model state, and keeps the Repository Source's `sourceId`, semantic inventory, and authored source content unchanged. Then disable Global inspection and confirm all Global results are removed from the session.

**Acceptance Scenarios**:

1. **Given** Global inspection has not been enabled, **When** the inspector starts, **Then** it does not read or display files at user-global inspection paths.
2. **Given** the user reviews the complete three-tool preview and explicitly opts in once, **When** Global inspection runs without rescanning the Repository Source, **Then** the product attempts every previewed tool root without accepting a tool selector, excludes any root that is missing or returns a deterministic non-throwing admission rejection, and atomically publishes every admitted tool root as a separately identified Global Source bound to exactly one root; any non-carveout throw or rejection instead aborts the whole transaction as defined below; a successful commit advances the session generation, rekeys every generation-owned graph ID, and invalidates all previous-generation `FileDetail`, comparison selection or view, and editor-model state; and the Repository Source retains its `sourceId` and semantically unchanged inventory and authored source content.
3. **Given** credentials, logs, runtime state, caches, or other out-of-scope files exist beside an allowlisted global instruction path, **When** Global inspection runs, **Then** those neighboring files are not read.
4. **Given** the user disables Global inspection, **When** the disable barrier completes successfully and the view refreshes from the authoritative snapshot, **Then** all Global sources and Global customization files are removed from the active session.
5. **Given** a non-no-op disable barrier has been accepted, **When** drain, close, or final serialization fails, **Then** the process remains live, all inspection data stays fenced and purged from the client, the generic retry/join control remains available, and unconfirmed cleanup presents restart as the fallback; no prior Global content is restored.
6. **Given** a readable Repository file and a readable Global file are active, **When** the user compares them, **Then** each file is presented under its independently identified owning Source and Source-relative Path without merging their roots, issuing a semantic verdict, or proposing a change.
7. **Given** active Global consent has no enable operation or pending work, its matching preview is verified, and `retryableTools` contains one or more non-pending unpublished `admitted` controls or `same-preview` rejected controls, **When** the user invokes Global retry, **Then** the server retries that complete fixed-order projection against the same frozen preview without accepting a selector, excludes published, pending, and lexical `new-preview-required` controls, preserves every existing Source and the exact pre-operation control/snapshot projection while tentative, returns `active-no-job` with no request or generation when all targets are again rejected, or atomically exposes only the admitted accepted-batch subset as pending and publishes every newly admitted Source together through exactly one request, batch, and generation.

#### Closed Global Root Admission Outcomes

| Configured-root input or phase | I/O before the closed outcome | Closed outcome |
|---|---|---|
| Setting absent | Perform no filesystem/network I/O | Derive the documented default exact string and classify it through the ordered rows below; create no read authority |
| Captured environment setting has length zero | Perform no filesystem/network I/O | Assign `present-empty`; retain the invalid preview entry without fallback, root, Source, scan job, generation, or authority |
| Otherwise the exact string contains U+0000 or an unpaired UTF-16 surrogate | Perform no filesystem/network I/O | Assign `invalid` before `path.isAbsolute` or the shared parser; retain no parsed operand or authority |
| Otherwise active-platform `node:path.isAbsolute` returns false | Perform no filesystem/network I/O | Assign `relative`; do not normalize, resolve, fall back, or create authority |
| Otherwise shared pure `LexicalAbsoluteRootParts` rejects the absolute spelling | Perform no filesystem/network I/O | Assign `invalid` for the closed POSIX U+FFFD/component/separator cases or Windows UNC/network/device/current-drive/malformed-drive/component cases; retain no parsed operand or authority |
| Otherwise the shared parser accepts the absolute spelling, including one outside the ordinary home | Perform no filesystem/network I/O | Assign `eligible`, retain its exact parsed platform operands, and await explicit consent; location outside the ordinary home is not itself a rejection reason, and only this row may reach post-consent admission |
| Submitted consent or preview digest is stale, replayed, or mismatched | Perform no proposed-root filesystem I/O | Reject the request; create no authority, root, Source, scan job, or generation |
| An exact contract-declared root `lstat` returns `ENOENT` | Only the centralized structural existence check may touch that proposed root | Record that tool as absent without fallback; continue the current server-owned operation set—all three tools initially or the exact `retryableTools` subset on retry—and create no Source for that root |
| A contract-declared structural `lstat` returns exact `ENOENT` after the entry was observed or ticketed | Only work preceding the structural recheck may have touched that entry | Return `entry-disappeared`, discard its tentative authority and bytes, and never fall back. Root, ancestor, and directory roles are Source-fatal; terminal-regular-file candidate roles map to file-scoped `safe-fs-entry-stale` and may contribute only a contracted-partial scan outcome after complete traversal and confirmed closure; unaffected siblings remain eligible |
| Consented root deterministically fails a successful link, type, change, boundary, or identity check | Only the centralized admission checks may touch that proposed root | Reject that tool without fallback; continue the current server-owned operation set—all three tools initially or the exact `retryableTools` subset on retry—and create no Source for that root |
| Any proposed-root operation throws or rejects other than the exact structural-`lstat` `ENOENT` exception | Only work completed before propagation may have touched its proposed root | Apply FR-041 and abort the whole Global transaction; publish none of its provisional subset and retain the prior snapshot |
| One or more consented roots pass lexical, canonical, link, type, containment, and identity checks and no operation throws or rejects | No access outside each proposed root | Admit those roots into one provisional Global transaction; publish every resulting Source together in one atomic generation, never as observable per-tool commits |

#### Verified Byte Decode Outcomes

| Verified-byte condition | Encoding state | Source and comparison outcome |
|---|---|---|
| At least one NUL byte | `binary` | Diagnostic-only; expose no source text or comparison eligibility and make an otherwise publishable generation `contracted-partial` |
| No NUL; one leading UTF-8 BOM; remaining bytes are valid UTF-8 | `utf-8-bom` | Record and remove the BOM; expose the complete decoded source and allow comparison |
| No NUL or BOM; all bytes are valid UTF-8 | `utf-8` | Expose the complete decoded source and allow comparison |
| No NUL; one or more invalid UTF-8 byte sequences | `utf-8-replaced` | Decode once with replacement semantics, record and remove one leading BOM when present, preserve the resulting garbled text including every inserted `U+FFFD`, and continue ordinary parsing, extraction, source display, and comparison; do not detect or retry another encoding |

### Edge Cases

- The selected Repository root cannot be read, becomes unavailable after startup, or is not the root the user intended to inspect; the invocation `cwd` itself may also become unavailable before `process.cwd()` can be captured.
- A file at an allowlisted inspection path is a broken symbolic link, resolves outside its source boundary, forms a link cycle, or changes between discovery and reading.
- A supported filename contains invalid text encoding, malformed frontmatter or configuration, extremely long lines, or binary content, or the execution environment reports that it cannot continue processing the file.
- Two physical paths refer to the same file, or one customization file has multiple recognized file types or recognizing tools.
- A customization file references another file through an absolute path, `..` traversal, environment-variable text, or a chain of imports.
- A configured tool home is missing, empty, relative, inaccessible, or outside the user's ordinary home location.
- A Global override file exists but is empty; the documented fallback file may then apply.
- Files change while the browser is open, including sensitive content becoming newly present.
- An explicit rescan fails fatally after producing partial results; the partial results are discarded and the last successfully committed snapshot remains visible with a stale marker and failure diagnostic.
- A browser session is refreshed or opened from a host other than the initiating machine.
- A customization file contains a literal credential or an environment-variable reference whose variable is set in the Inspector process; the literal source is displayed without masking, and the reference is not resolved or substituted.
- A documented Cloud or external-runtime behavior is relevant, but the current hosted state is unavailable and no local file originates the fact; it remains a non-authorizing Source Condition Fact rather than a synthetic customization file.
- A read causes the operating system to update access time even though the Inspector issued no mutation-capable filesystem request; that OS side effect is recorded separately and does not fail the product-issued-mutation assertion.
- An admitted operation throws or rejects during filesystem I/O, decoding, parsing, extraction, coordination, generation assembly, serialization, transport, or authority checking. Except for exact `ENOENT` from a contract-declared structural `lstat` checkpoint, no file or scan layer converts the error into an item or partial result. A REST-owned operation reports only its generic boundary error and retains any prior committed snapshot; an automatic startup operation propagates to the process top level. An FR-028-eligible deterministic, non-throwing entry-local outcome after complete traversal is excluded from this fatal case; complete outcomes such as `utf-8-replaced` remain complete rather than partial.

#### Closed Scan Publication Outcomes

| Terminal condition | Public status | Commit and response outcome |
|---|---|---|
| Traversal is complete, every admitted entry has a complete allowed result (including any readable `utf-8-replaced` result), generation assembly and serialization succeed, and publication authority remains current | `complete` | Atomically commit one complete generation and expose only the complete response |
| Traversal is complete, generation assembly and serialization succeed, and one or more admitted entries have only FR-028-eligible deterministic, non-throwing entry-local outcomes while every unaffected entry is complete; no complete outcome such as `utf-8-replaced` is counted as a partial cause | `partial` (`contracted-partial`) | Atomically commit one contracted partial generation with affected-entry diagnostics and complete unaffected results |
| An operation owned by an accepted REST-triggered job throws or rejects before commit | `failed` for that `scanRequestId` | Let the error propagate to the REST job boundary; abort the attempt, revoke publication authority, commit no failed-attempt item, Source, recognition or derived result, scan-result body, success response, or generation, and expose only a generic path/content-free error representation. Retain any prior committed snapshot. If and only if this is an explicit rescan, create or replace that Source's stale-failure overlay and reference only the accepted job's Operation Error; an initial scan or initial/retry Global batch creates no stale overlay |
| A REST request throws or rejects before asynchronous job acceptance | HTTP error; no `scanRequestId` | Let the error propagate to the REST request boundary; return only a generic path/content-free error representation and create no job, item, Source, result, or generation |
| An automatic startup operation with no REST owner throws or rejects | No public terminal status is guaranteed | Let the error propagate to the process top level, commit nothing from the attempt, and make no product guarantee that the process or session survives |
| A deterministic fatal outcome value prevents complete traversal or safe assembly without throwing | `failed` | Abort the attempt; commit no item, Source, recognition or derived result, scan-result body, success response, or generation; retain only any prior committed snapshot and expose an actionable fixed-code failure. If and only if this is an explicit rescan, create or replace that Source's stale-failure overlay and reference the deterministic lifecycle Diagnostic; an initial scan or initial/retry Global batch creates no stale overlay. An all-rejected Global admission creates no scan request and instead returns the closed `active-no-job` control outcome |
| Disable, shutdown, supersession, or failure revokes publication authority | No later success status | Discard every late result and commit nothing from the revoked request |
| Response transport fails after an atomic commit | Committed `complete` or `partial` status is unchanged | A truncated response is never a partial contract; the client may refetch the committed generation through the authenticated session API |

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to launch the product through `npx` and open the resulting local inspection session in a browser. Before importing the CLI, the fixed package-integrity bootstrap MAY read only package-owned manifests and the package assets declared by those manifests; it MUST NOT derive an operand from the invocation `cwd` or `--cwd`, access a Repository root, or issue a DNS, SMB, or outbound-network request. The CLI MUST capture `process.cwd()` exactly once and accept `--cwd <path>` at most once. When omitted, the selected Repository root MUST be that exact invocation working-directory string. On Windows, before calling `resolve`, the CLI MUST reject every explicit two-leading-separator UNC/server-share/device spelling, single-separator current-drive/root-relative value, and drive-relative value including `C:` and `C:foo`; only a plain relative option may be resolved lexically against the captured anchored drive-form invocation directory, while an absolute drive option MUST remain unchanged. On POSIX, an absolute option MUST remain unchanged and a relative option MUST be resolved lexically against the capture. The selected absolute result—including the omitted-option invocation string—MUST pass the same shared pure `LexicalAbsoluteRootParts` parser used by Global preview and central admission. A missing or empty value, duplicate option, pre-resolution Windows rejection, or parser rejection MUST produce a fixed actionable startup diagnostic and exit before session creation or browser opening; root selection itself MUST perform zero filesystem/network I/O, and the rejected launch MUST perform no I/O derived from or directed at the invocation `cwd`, `--cwd`, or selected Repository root and no DNS, SMB, or outbound-network call. If `process.cwd()` itself throws, the ownerless startup failure MUST follow FR-041, create no session or browser, and MUST NOT be converted into an Operation Error. The CLI MUST NOT call `process.chdir()`, use a per-drive working directory, or probe the filesystem during selection. The initial release MUST NOT prompt for another repository path or search ancestor directories for a different root. If automatic browser opening is disabled, unsupported, fails, is unavailable or unidentifiable, or resolves outside the certification baseline, the product MUST provide a usable printed local address for the pinned-certified-browser fallback.
- **FR-002**: Every inspection MUST include exactly one independently identified Repository Source rooted at the selected Repository root from FR-001. Session bootstrap MUST create that Source synchronously from the selected absolute path string with zero filesystem I/O, assign it an opaque stable `sourceId`, and expose only a non-authorizing escaped root label. The Source and its display root MUST NOT grant read authority; the central source-boundary module MUST separately admit the retained raw selected root before any Repository enumeration or read. A deterministic admission or scan failure outcome MUST leave the same Repository Source present with failed scan status and MUST NOT publish a customization file, scan result, or generation. A thrown or rejected automatic-startup operation MUST instead follow FR-041 and MAY end the process or session.
- **FR-003**: The inspector MUST discover repository customization files only at paths in a documented inspection path allowlist and MUST NOT indiscriminately interpret every file in the repository.
- **FR-004**: The initial release MUST recognize the repository customization file types listed in Supported Initial Release Customization Files for GitHub Copilot, Claude Code, and OpenAI Codex.
- **FR-005**: The product MUST represent a physical file separately from each tool-specific recognition so that one file can have multiple tools, kinds, scopes, or relationships without being duplicated as multiple physical files.
- **FR-006**: Users MUST be able to browse and filter the inventory by source, tool, customization file type, and source-relative path.
- **FR-007**: For each readable customization file, the inspector MUST show its source, source-relative path, file type, recognizing tools, source text, relevant declared metadata, and known relationships. For presentation, a supported customization file type is the exact `(tool, kind)` recognition together with its admitted source form. Maintained supported-customization documentation MUST enumerate the closed `(tool, kind)` presentation allowlist and the supported source forms to which each row applies. An entry is eligible only when both its field or relationship kind is named by that row and the admitted source form's exact extractor recognizes the authored occurrence; listing a field for one source form MUST NOT promote or infer it in another. The initial release MUST NOT infer any unlisted metadata or relationship.
- **FR-008**: The inspector MUST describe deterministic discovery order and scope rules when they are documented, including per-directory overrides and fallbacks, while keeping the underlying physical files visible.
- **FR-009**: The inspector MUST label behavior as conditional or unknown when it depends on runtime version, product surface, working directory, trust, flags, environment, organization policy, or undocumented conflict resolution.
- **FR-010**: Claude import relationships MUST be displayed as references only; the inspector MUST NOT automatically expand imported content, and references outside the originating source boundary MUST produce a diagnostic.
- **FR-011**: Users MUST be able to compare any two distinct readable customization files with different physical file IDs side by side, including complete source text and recognition metadata without content-based masking. The same physical file ID MUST NOT be accepted for both comparison inputs, even when it has multiple recognitions or hard-link aliases.
- **FR-012**: Comparison MUST remain literal and descriptive; it MUST NOT validate, lint, semantically rank, synchronize, convert, format, or propose automatic fixes for either customization file.
- **FR-013**: Global inspection MUST be disabled on every new session and MUST require one explicit session-wide user action after the complete three-tool scope and frozen root preview are explained. The UI and API MUST NOT accept a per-tool selector. Before that action, the product MUST perform no proposed-root filesystem I/O. Each newly created unconsented preview MUST capture `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, and `CODEX_HOME` exactly once in that order, treating only `undefined` as absent, and MUST call the imported `node:os.homedir()` exactly once if any is absent. It MUST derive absent defaults with the active platform's `node:path.join` and fixed suffixes `.copilot`, `.claude`, and `.codex`, MUST NOT independently select `HOME`, `USERPROFILE`, or another home source, and MUST freeze the resulting three exact strings. It MUST classify those strings by the closed ordered lexical-state algorithm and MUST encode every Repository/Global root label and the preview digest with the exact injective UTF-16-code-unit and canonical HMAC algorithms defined in the data model; normalization, UTF-8 replacement of raw strings, presentation-to-path decoding, and HTML rendering MUST NOT be used. Any capture/construction/retention/escape/serialization throw or rejection MUST follow FR-041 at the preview REST boundary, create no preview, and grant no authority. After consent, the coordinator MUST attempt admission for all three frozen preview entries and MUST NOT let the client omit an eligible tool. An active-consent retry MUST reuse that same frozen preview, consent record, and fixed ordered three-tool tuple and MUST be offered only after the matching preview is verified, `globalEnableInProgress` is null, `pendingTools` is empty, and `retryableTools` is nonempty. The server MUST derive the complete fixed-order `retryableTools` set from non-pending unpublished `admitted` controls and `rejected` controls whose `retryDisposition` is `same-preview`; it MUST exclude published, pending, and lexical `new-preview-required` controls, and the UI and API MUST NOT let the client add, omit, or reorder a retry target.
- **FR-014**: One initial Global-enable operation MUST process the full three-tool preview as one transaction and atomically create zero to three separately identified tool-specific Global Sources—at most one each for Copilot, Claude, and Codex—in one generation. Every root that is structurally present and passes admission MUST be included automatically. A lexically invalid root, exact pre-observation structural-`lstat` `ENOENT`, root-/ancestor-/directory-role `entry-disappeared`, or deterministic root-admission link/type/boundary rejection MUST create no Source for that tool and MUST NOT prevent the admitted subset from committing. Terminal-regular-file candidate-role `entry-disappeared` MUST instead map through FR-024/FR-028 to file-scoped `safe-fs-entry-stale` and MAY contribute that admitted tool's Source to the single `contracted-partial` batch generation after complete traversal and confirmed closure; it MUST NOT permit fallback. Any other throw or rejection MUST instead apply FR-041, abort the whole transaction, and commit none of its provisional subset. An active-consent retry MUST preserve every existing Repository and Global Source, control, and prior committed snapshot while it tentatively evaluates the complete server-derived `retryableTools` set. During retry validation/admission, only authority-free `globalEnableInProgress` MAY become newly visible; the exact pre-operation `globalControl`, `pendingTools`, `retryableTools`, batch/diagnostic fields, and snapshot MUST remain unchanged. Only atomic queued acceptance MAY set `pendingTools` and `batchStatus`, and it MUST set both to exactly the admitted accepted-batch subset and its shared request. An all-rejected deterministic initial attempt or retry MUST create no `scanRequestId`, scan job, Source, or generation and MUST return the closed `active-no-job` control outcome. A retry that admits one or more roots MUST create exactly one `GlobalBatchScan` and one `scanRequestId` and MUST publish every newly admitted tool-specific Source together with all preserved Sources in one atomic generation. A retry throw or rejection MUST restore the exact pre-operation state under FR-041. Each Global Source MUST be bound to exactly one admitted root for its tool, and Global customization files MUST NOT be merged into the Repository Source or another tool's Global Source.
- **FR-015**: The Copilot Global source MUST inspect only `copilot-instructions.md` and `instructions/**/*.instructions.md` below the captured `COPILOT_HOME`, or below `node:path.join(capturedHomedir, '.copilot')` when that setting is absent.
- **FR-016**: The Claude Global source MUST inspect only `CLAUDE.md` below the captured `CLAUDE_CONFIG_DIR`, or below `node:path.join(capturedHomedir, '.claude')` when that setting is absent.
- **FR-017**: The Codex Global source MUST inspect only the documented instruction fallback at the captured `CODEX_HOME`, or at `node:path.join(capturedHomedir, '.codex')` when that setting is absent: a non-empty `AGENTS.override.md` when present, otherwise `AGENTS.md`.
- **FR-018**: Global inspection MUST exclude additional Copilot instruction and skill directories, hosted or organization settings, Claude's separate user state file and other configuration files, Codex user skills and state, credentials, logs, caches, session data, managed policy, and any directory not named by FR-015 through FR-017.
- **FR-019**: The inspector MUST treat every customization file and every value derived from it as untrusted data.
- **FR-020**: The inspector MUST NOT execute skills, commands, hooks, plugins, workflows, extensions, scripts, handlers, prompts, agents, rules, or any other inspected content.
- **FR-021**: The inspector MUST NOT start, connect to, probe, or send requests to MCP servers described by inspected content.
- **FR-022**: Customization file discovery and viewing MUST NOT cause a direct product-issued outbound network request, dynamic code evaluation, or any child-process execution derived from customization content. A direct product-issued outbound request means traffic initiated by Inspector code or an Inspector-started child through a socket, HTTP(S), DNS, SMB, URI/image, remote-reference, or MCP API. Contract-required browser/host HTTP at the exact issued `127.0.0.1` authority is authorized internal loopback transport in exactly two closed classes: unauthenticated `GET`/`HEAD` requests for manifest-listed packaged static assets and the closed SPA-shell/client-route fallback paths, which contain no session data; and capability-authenticated requests from the bundled SPA to the declared `/api/v1` routes under the HTTP contract's exact Host, method, and Origin rules. Neither class is outbound or an MCP connection, and both are excluded from the definition. The authorized transport MUST NOT use a non-loopback or remote authority, an unlisted path, route, or method, an API request without the valid session capability, a destination selected from inspected content, or transmit inspected content to another machine. Every other non-loopback, remote, undeclared, unauthorized, non-session, customization-selected, or MCP request remains a prohibited direct product-issued outbound request. The definition also does not include network traffic that the operating system may perform while satisfying an ordinary central-boundary Node.js filesystem operation against a lexically indistinguishable pre-mounted POSIX network filesystem or mapped Windows drive. The Inspector cannot portably detect that backing store and MUST document this platform/environment limitation rather than claim zero network-filesystem traffic; it MUST reject an explicitly spelled UNC/server-share/device root before any filesystem, DNS, or SMB call. Security tests and SC-004 validation MUST classify and validate both exact authorized loopback classes separately, use and record local fixture roots for the zero-prohibited-direct-request assertion, and MUST separately preserve the mounted/mapped-filesystem limitation. The only product-initiated child process permitted in the initial release is the fixed operating-system browser-launch helper used at startup under FR-001. That helper MUST receive no inspection-derived content or path in its arguments or environment. Its implementation MAY pass only a closed set of ambient platform keys directly from the launch environment; lexical equality between an ambient value and a Source root does not change that value's provenance. The helper MUST NOT copy a Source root, preview root, candidate path, file path, or authored value into arguments or environment, grant authority from such a value, select an environment-named handler, or accept a user-supplied command. Inspection MUST remain usable when automatic opening is disabled, unsupported, or fails. No customization-file discovery, read, parsing, display, comparison, or relationship processing may initiate a child process. Inspected-source reads MUST be initiated only by the central Node.js source-boundary module from internally admitted entries; client-supplied paths and referenced files that fail the applicable lexical, canonical, link, regular-file, or source-boundary check MUST NOT be accepted as read authority.
- **FR-023**: The inspector MUST issue no product-controlled mutation request against an inspected source. Product-issued mutation includes any request to write, truncate, create, rename, delete, link, change mode or ownership, set file times, extended attributes, or ACLs, or open with mutation-capable flags. The inspector MUST NOT request an access-time update. A read-side access-time change performed solely by the operating system is outside product control and MUST be recorded separately rather than counted as a product-issued mutation or used as evidence that the Inspector changed the source.
- **FR-024**: Symbolic links, aliases, imports, and referenced paths exposed by public Node.js APIs MUST NOT be accepted or presented as customization content beyond their source boundary; cycles, boundary crossings, and unusable or ambiguous verification metadata MUST fail safely with an actionable diagnostic. The central Node.js source-boundary module MUST use `O_NOFOLLOW` as final-component defense in depth when Node.js exposes it and the platform enforces it. At enumeration, before `open`, after `open` but before reading, and after the same-handle read, candidate verification MUST check path `lstat` first to reject a link or wrong identity/type, then evaluate candidate `realpath` and canonical containment, and then repeat path `lstat` to require the same identity across canonicalization; the applicable phases MUST also compare root identity, every available ancestor identity, and open-handle identity and metadata. Each directory enumeration MUST likewise snapshot the root, available ancestors, and target directory immediately before `opendir`; drive the registered `fs.Dir` with explicit `Dir.read()` until null; and, while it remains open, repeat the corresponding identity, type, canonical-containment, modification-time, and change-time checks before any collected sibling can be classified, descended into, or issued a read ticket. The directory MUST then reach registry-confirmed closure before those entries are used. Any detected change, unverifiable required check, or unconfirmed close MUST discard the affected enumeration or candidate bytes and MUST NOT publish or commit a result; a thrown or rejected filesystem operation follows FR-041. For an enumerated path, exact raw `Dirent.name` segments MUST be the only filesystem operands; for a targeted fixed path whose plan forbids parent enumeration, the exact immutable registry target-spelling segments MUST instead be the only operands. Neither provenance MAY substitute NFC classification/display spelling into I/O. Public Source-relative Paths MUST use collision-free NFC segments. Distinct enumerated raw paths in one Source that normalize to the same NFC path MUST be rejected as one collision group before any member is opened and MUST yield only one pathless session-scoped Diagnostic because no unambiguous public path exists. Within one Source scan attempt, complete static discovery, admission, normalization-collision rejection, and physical grouping MUST finish before any physical group is read, except for FR-035's content-dependent Codex fallback. A usable hard-link identity requires exact bigint `dev`, `ino`, and `nlink`, with `ino !== 0n`, stable positive `nlink`, and an admitted-path count no greater than `nlink`; an unusable or changing identity MUST produce the boundary-unverifiable outcome with no accepted bytes. Distinct collision-free allowlisted paths in that attempt that share one usable verified physical regular-file identity MUST produce one Customization File and exactly one physical read: the unsigned UTF-8-bytewise lowest NFC path MUST be primary, the remaining unique NFC paths MUST be sorted aliases, and every raw admission provenance MUST remain distinct. Sources, later scan attempts, and later generations MUST verify and read independently. A different raw hard-link path discovered only after its group was consumed MUST receive the specified late-derived-alias rejection with zero additional reads and MUST NOT be merged. Filtering, detail labels, lookup, and comparison selection MUST match the primary and every alias, while a file-scoped Diagnostic MUST use only the primary path. A symlink MUST never become an alias, and physical identity MUST never merge files across Sources.
- **FR-025**: The inspector MUST display readable customization-file source text without credential detection, content-based masking, redaction, or a reveal step. For valid UTF-8, displayed declared metadata values and comparison content MUST preserve authored literal values so differences, including differences between credentials, remain visible. Only verified bytes from a completed same-handle read may be decoded. Any NUL byte MUST classify the item as `binary`; that item MUST remain diagnostic-only, expose no source text, be ineligible for comparison, and make an otherwise publishable generation `contracted-partial`. Every non-NUL file MUST be decoded exactly once with UTF-8 replacement semantics. If decoding inserts one or more `U+FFFD` characters, the encoding state MUST be `utf-8-replaced`; the exact resulting garbled string MUST become `sourceText` and MUST continue through ordinary parsing, extraction, display, and comparison without making the scan partial by itself. One leading UTF-8 BOM, when present, MUST be recorded separately and removed from `sourceText`. The Inspector MUST NOT guess or retry another encoding, remove or hide replacement characters, sample or truncate content, or introduce a product-defined byte, line, or item ceiling.
- **FR-026**: Environment-variable references in inspected content MUST remain literal text and MUST NOT cause the Inspector to read, resolve, or substitute the referenced process-environment value. This restriction does not prevent FR-015 through FR-017 from using their explicitly documented tool-home environment variables solely to locate Global source roots.
- **FR-027**: Before users open a detail or comparison surface that can expose authored values, the inspector MUST clearly explain that it displays complete authored content and that the content may include sensitive values. The bundled browser MUST hold acknowledgement only in memory, reset it for every newly loaded browser document and every client-data purge, and MUST NOT issue any `FileDetail` request or construct any comparison before acknowledgement. This gate MUST cover complete source text, authored declared-metadata values, authored relationship targets, and either comparison side. A client-data purge MUST be the central full-session client reset that clears inventory, detail, comparison, editor models, in-memory metadata, and acknowledgement after document-liveness failure or an equivalent terminal reset. The Global-disable action MUST perform that purge before sending its request, and the client MUST repeat it before rendering after observing a greater `globalContentEpoch` or non-null `globalDisableInProgress`. Route closure, ordinary file or Source removal, and generation change MAY dispose their scoped models without constituting a client-data purge or resetting acknowledgement for the still-loaded document. This presentation acknowledgement is not an API authorization factor: the capability-authenticated loopback session API remains the access-control boundary. The initial release MUST NOT provide credential masking or a reveal workflow.
- **FR-028**: After complete traversal, a deterministic, non-throwing entry-local outcome returned as data for one file at an allowlisted inspection path MUST NOT prevent complete unaffected files from being discovered or viewed through the contracted-partial outcome, and the affected item MUST retain enough source-relative path and Source context for the user to resolve the problem. Binary classification and an application-detected changed-entry or boundary outcome MUST leave the affected item diagnostic-only with no source or comparison eligibility. A `utf-8-replaced` decode is instead a complete readable result and MUST NOT make the scan partial by itself. After decoding, a parser or extractor MAY return a structured malformed or unsupported-recognition outcome; that outcome MUST retain the complete readable source—including any replacement characters—and comparison eligibility while atomically omitting only the affected recognition and its derived metadata or relationships. A thrown exception or rejected operation, including any file-read, decoder, parser, Worker, or extraction rejection, MUST NOT be converted into an entry-local outcome and is governed by FR-041.
- **FR-029**: The Inspector MUST NOT define product-specific numeric validation limits for file size, file or item count, parser structure, request or response size, work queues, scan duration, filesystem operations, open handles, or coordinator capacity. Available capacity MUST be inherited from Node.js, the selected parser, the operating system, the filesystem, the browser, and the execution environment. The application MUST NOT inspect a thrown or rejected operation to distinguish capacity, resource, or operational causes at the file or scan layer; FR-041's boundary propagation MUST abort the affected attempt and commit no item, Source, recognition or derived result, scan-result body, success response, or generation. If work completes after its request loses publication authority through disable, shutdown, supersession, or failure, every late result MUST be discarded. Engine or operating-system termination is an environment limitation and MUST NOT be represented as a product guarantee.
- **FR-030**: Users MUST be able to rescan the active sources explicitly. Every admitted scan command MUST receive an opaque `scanRequestId`; every queued, active, complete, partial, or failed status MUST identify that request; and a successful generation MUST record the request that committed it. A prior status, snapshot, or generation MUST NOT satisfy completion of a newer request. Public `partial` MUST mean only the `contracted-partial` outcome in the Closed Scan Publication Outcomes table; no other incomplete state may be published. Scan results MUST be committed atomically as one generation snapshot. A successful complete or contracted-partial commit MUST replace the previous snapshot; if the rescan fails fatally before commit, the inspector MUST discard all of that scan's uncommitted results, including partial results, retain the last successfully committed snapshot, mark it as stale because the rescan failed, and show an actionable failure representation: a Diagnostic for a deterministic returned failure or only the accepted job's Operation Error for a throw/rejection. Every successful initial or retry Global admitted-subset commit that does not rescan the Repository Source MUST preserve that Source's stable `sourceId` and carry forward its semantic inventory and authored source content unchanged; it MUST advance the session generation exactly once, rekey all generation-owned graph IDs, and invalidate every previous-generation `FileDetail`, comparison selection or view, and editor-model state, which MUST NOT be restored from a stale response. An all-rejected Global attempt MUST produce no Global Source commit and therefore MUST NOT advance the generation under this rule.
- **FR-031**: Inspection results MUST remain session-scoped by default and MUST NOT be persisted as a profile, cache, or repository file by the initial release.
- **FR-032**: Across inventory, detail, comparison, Global controls, diagnostics, Source Condition Facts, API responses, CLI output, and documentation, the initial release MUST NOT act as a validator, linter, natural-language semantic analyzer or ranker, synchronizer, converter, formatter, auto-fixer, policy engine, or remediation adviser. It MAY perform only syntax-only parsing, exact extraction of authored literal occurrences, mechanical typed decoding, classification against frozen documented fields and rules, and projection of documented order, scope, condition, selection, and reference relationships. Those operations MUST NOT decide or imply correctness, effectiveness, compliance, quality, or support beyond the frozen catalogs, and parse diagnostics MUST remain descriptive failures rather than validation findings.
- **FR-033**: Customization file source text and declared metadata MUST be presented as inert text or inert data; embedded markup, images, links, URI handlers, control sequences, or other content MUST NOT execute, load, or navigate merely because the customization file is displayed.
- **FR-034**: The inspector MUST NOT attach a Claude Code recognition to `AGENTS.md` solely because of its filename, infer that an unreferenced script in `.claude/hooks` is a hook, or treat a standalone `.claude/prompts` directory as a supported Claude Code customization file type.
- **FR-035**: For Codex instructions, the inspector MUST represent the documented per-directory selection of at most one non-empty instruction file—an applicable override first, otherwise the regular file and configured fallback names—and the broad-to-narrow ordering from Global through the repository toward a runtime working directory. For the exact Global `AGENTS.override.md`/`AGENTS.md` branch, empty MUST mean that a safely verified and read non-binary decoded string has `String.prototype.trim().length === 0` after one optional leading UTF-8 BOM is recorded and removed; whitespace-only text is empty, while a retained `U+FFFD` participates in the test and is non-whitespace. Only exact `ENOENT` from the contract-declared initial target `lstat` MAY select the fallback as absence. A deterministic unsafe or binary outcome MUST end that branch with its Diagnostic, and any throw or rejection from another operation, including `open` or `read` `ENOENT`, MUST propagate under FR-041 without fallback. This content-dependent fallback is the sole exception to FR-024's static-discovery-before-read order. If the safely consumed empty override and subsequently admitted fallback share the same usable physical identity, the fallback MUST receive zero opens and reads, MUST NOT merge with or reuse the override's bytes or provenance, and MUST publish only the contracted-partial diagnostic-only `safe-fs-ordered-fallback-alias-rejected` outcome while the empty override remains unpublished. When the working directory or configuration is unavailable, the resulting chain MUST remain conditional.
- **FR-036**: For Claude instructions, the inspector MUST represent the documented broad-to-narrow ordering, the local instruction after the regular instruction at the same level, and instruction files below the working directory as conditional when the runtime working directory is unknown.
- **FR-037**: When Copilot instruction sources can apply together or their precedence varies by product surface, the inspector MUST preserve each recognition and MUST NOT invent a general semantic winner.
- **FR-038**: All executable application code in the initial-release implementation and package MUST be JavaScript/TypeScript. The CLI, local host, and inspected-source filesystem layer MUST run on Node.js public JavaScript APIs, and browser logic MUST be generated from JavaScript/TypeScript sources. Declarative generated HTML/CSS, strict JSON manifests, documentation, and license files MAY be packaged. The product MUST NOT contain Rust code, Node-API or other native addons, prebuilt native binaries, package-lifecycle compilation, or package-lifecycle/runtime artifact downloads.
- **FR-039**: The inspector MUST represent maintained documented non-file behavior and excluded, hosted, or runtime inputs that have no originating customization file as evidence-linked Source Condition Facts attached to the relevant Source. Each fact MUST identify its tool, product surface, documented condition or availability state, affected scope, uncertainty, and stable evidence. It MUST remain distinct from a Customization File and Tool Recognition and MUST NOT create file identity, a source-relative path, authored source text, comparison eligibility, a relationship origin, read authority, a local or hosted read, or a network request. Current state that the inspector does not observe MUST remain conditional or unavailable rather than inferred.
- **FR-040**: Operational log and telemetry event records MUST contain only stable fixed codes and opaque session, source, file, scan-request, or operation identifiers. They MUST NOT contain inspected content or metadata, authored or displayed values, source-relative or absolute paths, roots or filenames, capabilities, request or response bodies, or raw parser, exception, or system errors. Fixed CLI help/version text, the one required launch-URL presentation line, and fixed actionable startup warnings are presentation output rather than operational event records, but MUST still contain no inspected content, inspected path, or authored value. An authenticated session diagnostic MAY show only the minimum source-relative path and metadata required to resolve a file-specific problem, and those fields MUST NOT be copied into operational logs or telemetry.
- **FR-041**: Except for Node's exact `ENOENT` code from an `lstat` call at a contract-declared structural existence checkpoint, a thrown exception or rejected operation from inspected-source reading MUST propagate without a catch in the filesystem, parser, recognition, or scan domain layers; those layers MUST NOT classify its cause, retry it, recover an item, or convert it into `complete` or `contracted-partial` data. The narrow `ENOENT` checkpoint MAY return only the specified `absent` or `entry-disappeared` structural outcome; it MUST NOT inspect the error message, apply to another error code or operation (including `open` or `read`), or authorize a read. The outer boundary that owns any other throw/rejection MAY catch only to express execution lifecycle. Before REST job acceptance, it MUST return a generic path/content-free HTTP error and create no `scanRequestId`; after acceptance, the job boundary MUST expose a generic path/content-free terminal error for that `scanRequestId`. Either REST path MUST keep the process and session available, commit no failed-attempt result body or generation, and retain any prior committed snapshot. An automatic startup operation with no REST owner MUST allow the error to reach the process top level; the product MUST NOT promise that the process or session survives. Product REST representations, operational logs, and telemetry MUST NOT expose the raw error or copy runtime-owned uncaught-error output. The product does not control whether the Node.js runtime or host writes its own uncaught-error diagnostic locally, and documentation MUST identify that residual local-disclosure and process-liveness limitation.
- **FR-042**: Global disable MUST be a recoverable coordinator barrier, not a scoped client-model disposal. Before sending a disable request, the bundled browser MUST perform the FR-027 full client-data purge. On first acceptance of a non-no-op barrier, the server MUST atomically increment `globalContentEpoch`, install non-null `globalDisableInProgress`, revoke publication authority, and fence every inspection-data route with the fixed conflict; while fenced, the session route MUST return only the control/error `GlobalFenceRecoverySnapshot`. Every inspection-data success MUST bind its captured epoch and recheck an unchanged epoch plus a null fence at final response publication. Every liveness success MUST instead bind exact `{ sessionId, globalContentEpoch, globalDisableInProgress }` values from one current coordinator-lock snapshot at final response publication and MUST report a current non-null fence rather than suppressing it. A client that observes a greater epoch or non-null fence MUST purge before rendering and enter control-only recovery. A post-acceptance failure MUST keep the fence, generic Operation Error, and retry/join control while preserving process liveness and MUST NOT restore purged content; an unconfirmed registered-resource close is such a failure, and process restart is the fallback when cleanup cannot be confirmed. A pre-acceptance failure or true no-op MUST leave the fence null so a purged client can immediately fetch a fresh authenticated full snapshot. If any public Global consent, control, or Source state exists, successful `remove-active-state` MUST publish exactly generation N+1 containing only carried Repository state. Only cleanup of an unpublished operation-local initial-enable state may use `cleanup-only`; its success MUST remove the fence while preserving generation N and all generation-owned IDs.

### Supported Initial Release Customization Files

The planning phase MUST revalidate these customization file types and inspection paths against the then-current official specifications and freeze the exact inspection path allowlist before implementation. Revalidation may narrow ambiguous filename patterns but MUST NOT add another product or expand a Global source beyond FR-015 through FR-018 without a specification change.

| Tool | Repository inspection paths and customization file types | Explicitly excluded or conditional behavior |
|---|---|---|
| GitHub Copilot | Repository and path-specific instructions; recognized `AGENTS.md`, root `CLAUDE.md`, and root `GEMINI.md`; custom agents; skills under `.github/skills`, `.agents/skills`, and `.claude/skills`; prompts and Copilot CLI-compatible commands; hook declarations; MCP declarations including exact VS Code `.vscode/mcp.json` and, for VS Code 1.118+, exact workspace-root `.mcp.json`; supported settings and plugin metadata | Surface-dependent support and undocumented precedence are shown as conditional. The 1.118 root `.mcp.json` release assertion conflicts with the current guide's exhaustive location list; its VS Code schema and total same-name order remain unknown, so that provenance is path/surface-only while independent CLI extraction on the same physical file remains separate. Hosted personal or organization configuration and extra directories named by `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` or `COPILOT_SKILLS_DIRS` are outside the initial release. Documented Cloud/runtime behavior without a local origin may be shown only as a non-authorizing Source Condition Fact; hosted state and configuration remain uninspected |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, and nested instruction files; `.claude/rules`; skills; legacy commands; subagents; project and local settings; declared hooks; root MCP configuration; output styles; marketplace catalogs; plugin manifests | Imports are relationships only; `AGENTS.md` is not recognized by filename alone; unreferenced scripts are not inferred to be hooks; a standalone `.claude/prompts` directory, managed settings, managed instructions, and unrelated user state are outside the Repository source |
| OpenAI Codex | `AGENTS.md` and `AGENTS.override.md`; `.agents/skills`; custom agent definitions; project configuration; hook declarations; MCP declarations; rules; plugin and marketplace metadata | Effective configuration that depends on project trust or working directory is conditional; deprecated user custom prompts and user-level skills are outside the Repository source |

### Key Entities

- **Inspection Session**: The transient user activity containing exactly one Repository Source created during bootstrap without filesystem I/O from the selected Repository root defined by FR-001, zero to three tool-specific Global Sources, current scan results, source condition facts, comparison selection, and diagnostics.
- **Scan Request**: One admitted Repository initial scan or explicit rescan, or one nonempty initial-enable/retry `GlobalBatchScan`, identified by one opaque `scanRequestId`. A deterministic all-rejected Global initial attempt or retry is `active-no-job` and creates no Scan Request. A Global batch uses one request for all of its admitted tool roots rather than one request per Source. Every Scan Request's status and successful committed generation remain request-correlated so an older snapshot or status cannot satisfy a newer request.
- **Source**: An explicit source identity with a kind (`Repository` or `Global`), exactly one root location, enabled state, scan status, and zero or more Source Condition Facts. The Repository Source exists at session bootstrap with a stable `sourceId` and a non-authorizing escaped root label; its retained raw root grants no read authority until the central source-boundary module admits it. A Global Source is created only by its atomic post-consent commit and is additionally identified by exactly one supported tool; customization files of different types within that root remain separate inventory items.
- **Source-relative Path**: A customization file's collision-free NFC display, filtering, lookup, and selection path relative to the one root of its owning Source. It is repository-relative to the selected Repository root only for the Repository Source and tool-home-relative for a Global Source. It never replaces the retained raw entry-name segments used for filesystem operations. One Customization File has one deterministic primary path and may have sorted hard-link alias paths within the same Source; aliases are equally matchable, while a file-scoped Diagnostic uses the primary path only.
- **Customization File**: One discovered physical file within a Source, identified by its deterministic primary Source-relative Path, zero or more same-Source hard-link alias paths, retained raw admission provenances, and safe file identity, with a readable or deterministic diagnostic state. It has source text without content-based masking only after a completed verified-byte read is decoded once with the documented UTF-8 replacement and optional leading-BOM handling. Valid UTF-8 yields its complete authored text; invalid non-NUL byte sequences yield a readable `utf-8-replaced` representation containing the decoder's `U+FFFD` characters. A binary state exposes no source text. A thrown or rejected read creates no Customization File from that attempt. Symlinks never become aliases, and physical identity never merges Customization Files across Sources.
- **Tool Recognition**: A tool-specific interpretation attached to a customization file, including tool, file type, documented scope or order, declared metadata, and any uncertainty.
- **Evidence Assessment**: The atomic evidence state for one exact behavior, rule, or strategy subject. It keeps closed documentation completeness and ordered lifecycle qualifiers separate. Provenance and Relationship records preserve one sorted, deduplicated assessment per directly referenced subject; they never replace those records with one scalar or qualifier union.
- **Relationship**: A non-executed reference from a customization file to another path or declared component, including boundary and resolution status without imported content expansion, together with its record-by-record evidence assessments.
- **Source Condition Fact**: An evidence-linked, source-scoped statement about documented non-file behavior or an excluded, hosted, or runtime input with no originating customization file. It identifies the relevant tool and surface, condition or availability, affected scope, uncertainty, and evidence, but has no file identity, Source-relative Path, authored source text, comparison eligibility, Relationship origin, or read authority. It never causes local or hosted I/O; unobserved current state remains conditional or unavailable.
- **Diagnostic**: An authenticated, session-only, actionable explanation of an empty result, deterministic malformed or binary content outcome, uncertainty, stale file, cycle, or boundary violation that does not duplicate customization source values and is never copied verbatim into operational logs. It has exactly one location scope. A file-scoped Diagnostic MUST require a coherent `sourceId`, `fileId`, and `sourceRelativePath` tuple: the file MUST belong to the identified Source, and the path MUST be that file's path within that Source. A source-scoped Diagnostic MUST require only `sourceId` and MUST forbid `fileId` and `sourceRelativePath`. A session-scoped Diagnostic MUST forbid `sourceId`, `fileId`, and `sourceRelativePath`. This location scope is independent of whether the Diagnostic belongs to a committed generation or to the session lifecycle. A thrown or rejected runtime operation is represented only by an Operation Error at its owning outer boundary and MUST NOT become a Diagnostic.
- **Operation Error**: A generic, path/content-free outer-boundary representation of a thrown or rejected operation. It is lifecycle state outside a scan result and its complete serialized shape contains exactly an opaque `operationErrorId`, fixed `code: operation-failed`, fixed actionable `messageKey: api.operationFailed`, fixed `nextStepKey: api.retryOrRestart`, an opaque `operationId`, and `scanRequestId`, which is null before job acceptance and equals the admitted request ID for an accepted job. It contains no file identity, location, raw exception, cause taxonomy, or runtime error arguments.

**FR-024/FR-028 publication taxonomy**: In FR-024, an accepted candidate result means any
accepted candidate bytes, readable content, recognition, derived metadata or relationship,
comparison eligibility, or success receipt. A deterministic candidate-local changed-entry
or unusable-verification-data outcome returned as data MAY, under FR-028, retain only a
diagnostic-only inventory record and participate in one contracted-partial generation, but
only after traversal is complete and every acquired resource is registry-confirmed closed;
that record is not an accepted candidate result. A root or shared-ancestor guard outcome, a
directory-enumeration guard outcome, or any unconfirmed FileHandle or `fs.Dir` close MUST
abort the affected Source attempt and MUST NOT commit a candidate diagnostic-only record,
contracted-partial generation, or success receipt. Throws and rejections remain governed by
FR-041.

## Quality Requirements *(mandatory)*

### Maintainability and Code Clarity

- **QR-001**: Inspection path definitions, source boundaries, recognitions, and precedence rules MUST have cohesive ownership and explicit invariants so maintainers can update one tool without changing unrelated tools. Every non-obvious safety or compatibility decision MUST document its rationale, and abstractions MUST be limited to demonstrated shared behavior.

### Testing and Verification

- **QR-002**: Automated verification MUST cover allowlisted and non-allowlisted inspection paths for every tool, multi-tool recognition, source separation, deterministic order and fallbacks, all uncertainty states, comparisons, opt-in and disable flows, malformed and changing files, encodings, recoverable environment and runtime failures, symbolic links, cycles, traversal attempts, root and candidate replacement fixtures, identity and metadata changes, discarded results after detected races, fatal-rescan rollback to the last committed snapshot, exact presentation of literal credentials, non-resolution of environment-variable references, and regression tests proving zero execution, source mutation, MCP connection, and prohibited customization-file-triggered network access. Network verification MUST separately classify and validate the two exact FR-022 authorized internal loopback classes—closed unauthenticated static/SPA `GET`/`HEAD` and capability-authenticated declared API requests at the issued authority—and require zero other product-issued socket, HTTP(S), DNS, SMB, URI/image, remote-reference, or MCP requests. Verification MUST also cover SC-002 reference-profile and fixture-digest validation, objective current-request qualifying-status assertions, and origin-file-less Source Condition Fact separation with the correct source, tool, surface, status, and evidence plus zero synthetic files and zero local or hosted I/O. It MUST validate the checked-in release-evidence fixture manifest for SC-003, SC-004, SC-005, SC-007, and SC-009, including its schema, version, reproducible manifest digest, unique stable case IDs, criterion and required-class membership, fixture or deterministic-builder reference, objective expected outcome, and referenced-fixture content digest. Every required class MUST be nonempty, every referenced case MUST exist and execute, and the measurement record MUST identify the exact manifest version, manifest digest, and executed case IDs. Every error case MUST have an objective expected result, and end-to-end browser tests MUST cover all four user stories. Diagnostic verification MUST cover the closed file, source, and session scope union: file scope requires a coherent `sourceId`/`fileId`/`sourceRelativePath` tuple; source scope requires only `sourceId` and forbids `fileId`/`sourceRelativePath`; session scope forbids all three. It MUST reject every missing, extra, cross-Source, or fabricated location tuple that violates those Diagnostic entity invariants, while treating committed-generation versus session-lifecycle ownership as an orthogonal lifetime concern. The supported-OS matrix MUST distinguish required rejection of stable and detectable unsafe objects, rejection with `safe-fs-boundary-unverifiable` when Node.js reports required metadata or canonicalization as unusable or ambiguous, and an explicit `platform-unobservable` record for an OS feature that public Node.js APIs do not expose; the last category MUST NOT count as containment proof. These tests MUST verify the documented Node.js checks without being described as proof against an unobservable adversarial path-component replacement race.
  Verification MUST instrument product filesystem requests to prove zero mutation-capable operations and unchanged content, length, identity, link state, mode, modification/change time, and extended attributes or ACLs where observable, while recording OS-only access-time changes separately. It MUST verify that the product defines no file-size, item-count, parser-shape, request/response-size, queue, time, or concurrency validation ceiling; every thrown or rejected read propagates without file/scan-layer classification or recovery; REST-owned failures produce only the generic Operation Error at the correct pre-acceptance or accepted-job boundary while preserving process liveness; startup-owned failures reach the process top level; publication authority is revoked when applicable; and discarded late results never enter a snapshot. Operational-log and Operation Error tests MUST reject every prohibited path, inspected value, metadata, capability, body, or raw-error field while authenticated Diagnostics retain only their minimum allowed fields. Cross-surface negative contract, browser, CLI-output, and documentation tests MUST prove that Inventory, Detail, Comparison, Global controls, Diagnostics, Source Condition Facts, API responses, CLI output, and documentation do not validate or lint, interpret or rank natural-language meaning, decide correctness/effectiveness/compliance/quality, synchronize, convert, format, or fix content, act as a policy engine, or advise remediation. SC-002 verification MUST wait for the automatic initial Repository scan to complete, submit one explicit Repository rescan, and require the same `scanRequestId` on qualifying status and on the generation whose rendered inventory stops the timer.

  Verification MUST additionally cover raw/NFC collision rejection, deterministic same-Source hard-link primary/alias selection and matching, retained per-alias provenance, primary-only file Diagnostic paths, symlink non-aliasing, and cross-Source identity non-merging.

  Evidence verification MUST require exactly one assessment per behavior, rule, and strategy subject; reject every documentation-status value outside the closed enum, every duplicate or out-of-order lifecycle qualifier, and any use of `documentation-conflict` as a documentation status; and prove that provenance and Relationship DTOs preserve the sorted, deduplicated record-by-record `EvidenceAssessment[]` without scalar or union reduction.

### Security and Privacy

- **QR-003**: The viewing session MUST be reachable only from the initiating machine by default and MUST use least-privilege filesystem access, a single Node.js inspected-source I/O boundary, lexical and canonical containment checks, link and non-regular-file rejection, `O_NOFOLLOW` where exposed and enforced, enumeration-to-open identity checks, root/ancestor/candidate/open-handle post-read revalidation, environment-owned resource capacity without product-defined numeric validation limits, and result discard on every detected, reported-unverifiable, revoked, or late file operation. Complete authored content MAY be intentionally returned only through the capability-authenticated loopback session API and displayed by the bundled browser only after in-memory acknowledgement; it MUST remain inert and session-only and MUST NOT be persisted, sent to another machine or remote service, or copied to logs or telemetry. Operational logs and telemetry MUST be path/content-free as defined by FR-040, while authenticated diagnostics MAY carry only their minimum actionable location fields. Because public Node.js APIs do not provide a cross-platform directory-handle-relative open, cannot force-cancel every pending filesystem promise, and do not reveal every same-device mount or reparse behavior, the product MUST document that it does not provide kernel-enforced containment against an adversarial local process concurrently replacing a source root or ancestor or an unsupported final path component, guaranteed physical cancellation of stalled kernel I/O, or visibility into an OS indirection that Node.js cannot observe; future resolution requires an appropriate public Node.js API or an operating-system-enforced read-only boundary.

### Documentation and Participation

- **QR-004**: English and Japanese user and contributor documentation MUST remain semantically equivalent and explain launch and setup, the default `process.cwd()` Repository root and optional `--cwd <path>` selection semantics, the exact supported inspection path allowlist, source boundaries and session-wide all-tools Global consent, conditional interpretations, complete source presentation and its sensitive-value warning, non-resolution of environment-variable references, environment-owned resource behavior, diagnostics, and out-of-scope behavior. Primary discovery, inspection, comparison, and consent workflows MUST be keyboard operable, expose meaningful labels and focus state, and meet WCAG 2.2 AA criteria applicable to the local browser interface. Maintainers MUST keep semantically equivalent English and Japanese WCAG 2.2 AA applicability and acceptance matrices that enumerate every Level A and AA success criterion. Each criterion row MUST state whether it applies; every non-applicable row MUST give a criterion-specific rationale; and every applicable row MUST name stable IDs for its required automated checks, manual checks, or both, together with the expected result and recorded evidence. The matrices MUST define a closed manual execution matrix for the packed release candidate across both locales, exact frozen platform/browser/assistive-technology versions, viewport/orientation/zoom/text-spacing profiles, UI modes, workflow states, and input profiles; every applicable manual cell MUST be recorded, and a frozen release or matrix change MUST rerun every manual check. Error messages MUST identify both the problem and a practical next step.
- **QR-005**: Every maintained vendor behavior, Inspector rule, and runtime-composition strategy MUST cite one or more stable source IDs that resolve to canonical first-party documentation URLs, exact reviewed sections, and a review date. Each atomic behavior, rule, or strategy assertion MUST own one `EvidenceAssessment` with its exact `subjectKind`, `subjectId`, `documentationStatus`, and `lifecycleQualifiers`; provenance and relationship records that depend on multiple assertions MUST preserve their deterministic record-by-record `EvidenceAssessment[]` and MUST NOT collapse it to one scalar, worst/best status, or union that loses which assessment belongs to which subject. `documentationStatus` is the closed enum `documented | partially-documented | unknown | conflict`: `documented` means the cited official sections completely establish the maintained assertion, `partially-documented` means they establish part but not all of it, `unknown` means they establish no determination for the maintained assertion, and `conflict` means retained official assertions are incompatible. `lifecycleQualifiers` is a duplicate-free array in fixed `preview`, `experimental`, `deprecated` order. An empty array means only that no lifecycle claim is made; it MUST NOT be presented as `stable`. The `documentation-conflict` value remains a `ConditionFact.status` used by runtime projection and MUST NOT be used as a `documentationStatus` alias. Vendor lookup behavior, Inspector matchers, and runtime composition MUST have separate ownership; each product MUST have its own behavior document; Repository behavior and User/Global behavior MUST use separate tables; and GitHub Copilot VS Code, CLI, and Cloud behavior MUST use separate tables. Every Repository matcher MUST state Base, Relative selector, and Expansion independently, render the exact selected-Repository-root boundary with `./`, and reject a bare `**/` prefix. Automated documentation checks MUST validate the closed assessment enums and ordering, record-by-record subject identity, bilingual parity, identifier uniqueness, reciprocal references, and controlled official-source drift without changing a behavior, rule, or strategy automatically.

## Success Criteria *(mandatory)*

### Measurable Outcomes

**First-Time Evaluation Governance**

The 20-person evaluation is performed once for the initial-release candidate because automated checks and contributors familiar with the project cannot establish first-use discoverability and correct interpretation without project context. The fixed denominator makes the observed 19-of-20 and 18-of-20 thresholds explicit; it is not a population-level statistical claim. The same cohort and session MUST be reused for SC-001 and SC-006 to avoid duplicate recruitment.

The maintainer team owns this release evidence; it is not a per-pull-request obligation and ordinary contributors MUST NOT be asked to recruit, fund, moderate, or review participants. Before enrollment, maintainers MUST publish a bilingual study plan naming an accountable study owner, recruitment and participant-compensation funding owner, moderators and the required reviewer roster, schedule and contact/support path, consent/privacy and anonymized-retention procedure, supplied test repository and equipment/session support, and reasonable accessibility accommodations. A separately governed, access-controlled administrative assignment record outside the repository bundle, work root, candidate, capture, evidence, and runtime IPC MUST record one unique human reviewer pair per case for audit, MUST NOT affect scoring bytes or cross into runtime/evidence, and MUST be destroyed according to the published consent-retention policy. Participants MUST NOT need a personal repository, paid product, or personal expenditure. Missing study resources block the initial-release claim, not review of an otherwise conforming contribution. Before SC-001 begins, the study record MUST freeze the SHA-256 digest of the exact packed release-candidate tarball used by every participant and a canonical study-input digest that enumerates the exact bilingual guidance, task prompts, evaluation fixture, prepared state, response form, ground truth, and scoring rubric. SC-001 and SC-006 evidence is valid only for those two digests. The study MUST be repeated after a material change to a primary workflow or any enumerated study input; any packed-candidate byte change is material for this evidence and MUST invalidate the earlier results. Release approval MUST bind the final packed-candidate digest to the valid study record or rerun the complete SC-001/SC-006 protocol against that final candidate.

The study-input digest MUST be reproducible from one checked-in, versioned manifest and the one
closed bundle root `tests/usability/sc001-sc006-study-inputs/`. Except for the separately
digest-bound candidate tarball and study equipment/runtime, every byte used by a participant,
moderator, or scorer MUST come only from the repository-owned builder and MUST be accepted by
the structurally independent verifier; no extra local, remote, printed, or ad hoc material is
permitted. `manifestVersion` MUST be a positive safe integer starting at 1, `bundleRoot` MUST
equal that exact `/`-terminated literal, `inputs` MUST be nonempty, and every closed input role
MUST have nonzero coverage. The manifest MUST enumerate every recursively discovered bundle
regular file through a unique stable input ID, a closed input role, its unique `/`-normalized
repository-relative path below `bundleRoot`, and its lowercase SHA-256 digest; bilingual
material MUST have separately identified entries. The recursive bundle regular-file set and
manifest path set MUST be exactly equal. Symbolic links, junctions, non-regular objects,
hard-link aliases, unusable identity/link metadata, path escape, missing or extra source,
derived, or destination files, and any delivery path other than the verified builder/bundle
MUST fail before enrollment. Canonical bytes MUST be
`Buffer.from(JSON.stringify(canonicalValue, null, 2) + '\n', 'utf8')`, where `canonicalValue`
is newly constructed without Unicode normalization with root properties inserted as
`manifestVersion`, `bundleRoot`, `inputs`, each entry's properties inserted as `inputId`,
`role`, `path`, `sha256`, and entries sorted by raw UTF-16 code units of `inputId`. This exact
Node.js 24/26 `JSON.stringify` procedure fixes string escaping and number spelling;
byte-for-byte comparison, not parse equivalence, determines canonicality. The companion file
MUST contain the lowercase SHA-256 of those exact manifest bytes followed by exactly one LF. A
missing, extra, duplicate, unordered, unreadable, non-canonical, path-invalid, empty-role, or
digest-mismatched manifest/input, or an unmanifested supplied byte, MUST fail both criteria
before enrollment. Study-kit authoring MUST materialize the candidate-independent bundle,
manifest, and companion and make their exact-set contract pass. Immediately before SC-001,
the builder MUST materialize exactly twenty fresh distributions and the verifier MUST
re-enumerate the source bundle and all twenty distributions without rewriting them, reading any
candidate authority or bytes, calling `stat` on the candidate, hashing it, or freezing it.
Successful `verify -- inputs`
MUST freeze only the verified canonical study-input-manifest digest and exact-set state.
`capture -- start` MUST be the first phase that reads the candidate authority; it MUST reopen,
stat, hash, and freeze the candidate identity and SHA-256 before starting capture and bind them
to the already verified manifest digest.

Each distribution root MUST contain exactly the two direct-child directories `study-inputs/`
and `repository/`, with no other direct child. `study-inputs/` MUST contain only the exact
sixteen bundle members under their direct-child names with byte-for-byte equality to the
verified source bundle. `repository/` MUST contain exactly the regular files and implied
directories defined by the applicable descriptor outputs. The separately bound candidate and
equipment/runtime MUST remain outside the distribution root. Any cross-namespace collision,
extra top-level member or sidecar, alias, reused file identity, or root escape MUST fail before
enrollment.

The paired `evaluation-fixture.json` bundle members MUST close every materialized
participant-repository output path relative to `repository/`, encoding, exact byte
representation, and lowercase digest. Only the repository-owned, digest-bound builder/verifier
may materialize those derived fixture bytes, and every one of the twenty actual distributions
MUST reproduce the descriptors' exact set and bytes. Missing, extra, aliased, or drifted
derived output MUST fail the same pre-enrollment exact-set gate.

**Release-Evidence Fixture Governance**

For each release candidate, SC-003, SC-004, SC-005, SC-007, and SC-009 MUST use one checked-in, versioned release-evidence fixture manifest frozen before measurement. Every manifest case MUST have a unique stable case ID, criterion and required-class membership, a fixture or deterministic-builder reference, an objective expected outcome, and a digest for every referenced fixture byte. Each evidence record MUST identify the manifest version and reproducible digest, record the exact executed case IDs, and show a nonzero count for every required class named by the applicable criterion. Removing or reclassifying a case, changing a required-class definition, or changing an expected outcome MUST increment the manifest version, receive explicit review, and start a new non-comparable measurement set. Changing only referenced fixture bytes MUST update every affected fixture digest and the canonical manifest digest and MUST also start a new non-comparable measurement set; a digest change alone MUST NOT authorize a denominator-semantics change. A missing, empty, unreadable, or digest-mismatched manifest, a missing or duplicate case, an empty required class, a missing referenced fixture, an unrecorded result, or any omitted manifested case MUST fail every affected criterion; a release denominator MUST NOT be reduced silently.

For an actual denominator-semantics change, release validation MUST record the prior and current manifest versions, the changed case IDs, required-class definitions, or expected outcomes, and an explicit reviewer decision or review reference. Automated contract tests MUST validate the version and digest transition rules against table-driven previous/current manifest revision pairs, but MUST NOT claim that those tests establish human review. Initial manifest creation has no prior revision and MUST be recorded as such.

- **SC-001**: In an evaluation with exactly 20 first-time participants who use Git and a command-line interface in their normal development work but have never used the Inspector or contributed to its development, at least 19 can launch the inspector from the prepared intended Repository root and open one discovered customization file within 2 minutes using only the provided product guidance. The two-minute timer MUST start when the standardized task prompt is presented and MUST stop when the source/details view for one discovered customization file is visibly open and operable; the timed interval therefore includes entering the fixed launch command and launching the Inspector from the equipment-prepared intended Repository root; selecting a root by changing to it or by supplying `--cwd` is a product capability verified by the automated User Story 1 tests rather than a timed participant action in this evaluation. When automatic browser opening is disabled, unsupported, fails, is unavailable or unidentifiable, or resolves outside the certification baseline, the printed-URL fallback in a pinned certified browser is part of the provided product guidance, MUST be used and recorded, and MUST NOT pause or restart the timer. Automatic-opening failure alone MUST NOT make the result unsuccessful if the participant completes the fallback within the original two-minute interval without prohibited hints; any equipment, environment, or product failure that prevents or interrupts completion still counts as unsuccessful. The same participant cohort MUST be used for SC-006 in the same evaluation session, with SC-001 attempted first. Moderators MAY repeat the standardized task prompt verbatim but MUST NOT provide command, navigation, or interface-operation hints for either criterion. Once a participant is enrolled in the 20-person cohort, every equipment, environment, or product failure that prevents or interrupts a criterion MUST count as an unsuccessful result for that criterion, including a failure before its task timer starts; the participant MUST NOT be excluded or replaced.
- **SC-002**: For a repository containing 100,000 filesystem entries and 500 matching customization files, users receive a complete inventory within 10 seconds and a qualifying current-request scan status within 1 second on the versioned, published SC-002 reference-environment profile. One deterministic fixture matching that workload MUST be prepared before measurement, remain unchanged, and be reused for all 10 measured runs; fixture construction and setup MUST be outside the timing intervals. Each run MUST wait until that new process's automatic initial Repository scan reaches a terminal state, then the browser MUST submit exactly one explicit Repository rescan. Both timers MUST start when the browser dispatches that rescan request. The admission response MUST provide an opaque `scanRequestId`; the 1-second timer MUST stop only when a qualifying status defined in Clarifications is visibly rendered, exposed to assistive technology, and identifies that same request. The 10-second timer MUST stop only when the complete inventory from the generation committed by that same request is rendered and its primary list controls are operable; an earlier status, snapshot, or automatic-scan generation MUST NOT satisfy either stop condition. After that request-correlated complete inventory becomes operable in each run, the measurement MUST perform one standardized filter action and one standardized item-selection action; each interaction timer MUST start when the browser dispatches the corresponding input and MUST stop when the filtered results or selected-state feedback is visibly rendered and operable. `npx` download, installation, process-start time, and the automatic initial scan MUST be outside these timers. Each measurement set MUST contain exactly 10 measured runs, all on that same profile, and at least 9 runs MUST individually meet both scan timing thresholds and keep both standardized interactions below 100 milliseconds. Every measured run MUST start a new Inspector process after the prior process has ended and MUST NOT reuse application-memory state or the prior scan snapshot from another run. The operating system filesystem cache MUST NOT be deliberately cleared or reset between runs; the 10 runs MUST use its natural evolving state. The measurement record MUST name the profile ID, fixture digest, request ID, committed generation, and actual environment values. A profile change starts a new, non-comparable measurement set. The result is specific to that published profile and is not a portable performance guarantee.
  The checked-in SC-002 profile MUST name one versioned canonical fixture manifest and its SHA-256 digest. That manifest MUST enumerate every generated entry and every content-bearing file digest needed to reproduce the 100,000-entry/500-match fixture. Validation MUST recompute the canonical manifest digest and all referenced content digests immediately before the first measured run and after every measured run; any mismatch, missing entry, or digest drift MUST invalidate the entire measurement set, and every per-run record MUST repeat the same profile ID, manifest version, and canonical digest.
- **SC-003**: The SC-003 manifest MUST contain at least one positive fixture for every supported exact `(tool, customization file type, admitted source form)` row, at least one rejected near-miss fixture for every frozen inspection-path selector family, and at least one shared-physical-file fixture for every documented multi-tool attribution combination. Across all manifested fixtures, the inspector achieves 100% recognition of customization files at supported inspection paths, zero interpretation of files outside the frozen inspection path allowlist, and 100% correct multi-tool attribution for shared physical files.
- **SC-004**: The SC-004 manifest MUST contain at least one fixture for every supported tool; every prohibited-effect class—customization-derived command or code execution, child process, MCP connection, direct product-issued outbound request as defined by FR-022, and product-issued inspected-source mutation; an out-of-bound selector for each Repository and Global source kind; and every detectable read-change class—link state, identity or type, canonical location or containment, relevant file metadata, and root/ancestor/target-directory identity or modification/change metadata during enumeration. Across 100% of manifested fixtures within the documented Node.js-only threat model, inspections cause zero customization-file-derived command or code executions, child processes, MCP connections, direct product-issued outbound requests, or product-issued inspected-source mutations; issue zero intentional read requests for selectors rejected as outside an enabled source boundary; and publish or commit zero bytes from every fixture whose link, identity, canonical location, relevant file metadata, or guarded-directory metadata changes detectably during enumeration or reading. The direct-request assertion MUST instrument the applicable product network/URL/MCP surfaces; classify and independently validate both exact FR-022 authorized internal loopback classes—closed unauthenticated static/SPA `GET`/`HEAD` and capability-authenticated declared API requests at the issued `127.0.0.1` authority, including their path, route, method, Host, Origin, capability, and same-Inspector-host constraints—and require zero prohibited requests across every other instrumented surface. It MUST record that every fixture root is local; lexically indistinguishable pre-mounted or mapped network filesystems are outside that assertion and MUST remain documented as the FR-022 platform/environment limitation, while explicit UNC/server-share/device vectors MUST prove zero filesystem, DNS, and SMB calls. The mutation assertion MUST instrument product filesystem operations, MUST verify exactly one production content read for each successfully consumed physical group, and MUST observe unchanged content, length, identity, link state, mode, modification/change time, and extended attributes or ACLs where the platform exposes them. Every adversarial create, remove, rename, hard-link, content, or metadata change used to exercise race detection MUST be issued only by an explicitly separate external mutation harness and MUST be excluded from the product-operation count. An access-time change attributable solely to operating-system read semantics MUST be recorded separately, MUST NOT fail this criterion, and MUST NOT be used as proof of a product-issued mutation.
- **SC-005**: The SC-005 manifest MUST contain at least one readable exact-display fixture for every supported exact `(tool, customization file type, admitted source form)` row and MUST have nonzero cases for both source and comparison surfaces, both literal-credential and environment-variable-reference classes, and both set-sentinel and unset referenced-variable states. Across 100% of manifested fixtures, literal credential values and environment-variable reference text appear unmasked and unchanged in source and comparison views, no referenced process-environment value is introduced into displayed content, and no masking or reveal control is presented.
- **SC-006**: After attempting SC-001, the same 20 first-time participants in that evaluation session attempt SC-006. Regardless of the SC-001 result, every participant MUST begin SC-006 in the same prepared Inspector state with the same designated customization file open; the 2-minute timer MUST start when that state is ready and the standardized task prompt is presented. Each participant MUST record their answer in a standardized response form with required fields for the file's source, recognizing tools, file type, and whether its effective behavior is certain or conditional. Success requires submitting all four fields within two minutes with every field matching the designated file's predefined ground truth; any missing or incorrect field MUST count as unsuccessful. At least 18 participants MUST succeed using only the provided product guidance and the moderator policy defined by SC-001. After submitting that timed response, all 20 participants MUST each attempt standardized comparison and Global-consent tasks under the same no-hints moderator policy; together with the SC-001 discovery observation and timed SC-006 inspection observation, these tasks MUST cover all four primary workflows. Every enrolled participant and every equipment, environment, or product outcome MUST remain recorded without exclusion or replacement. Moderators MUST record the four objective workflow-completion outcomes and predefined safety-event fields. Study equipment MUST run the SC-004 product network/URL/MCP instrumentation, an exact-authority Inspector-server request ledger, and study-browser request capture continuously from Inspector launch before SC-001 through completion of all four workflow observations. Fetch Metadata is only a consistency signal and MUST NOT by itself attest that a human initiated a navigation. A request is `participant` only when a valid marker, the participant-shaped Fetch Metadata tuple, the exact authorized-static target, and the one current armed `StudyParticipantNavigationGrant` agree; the proxy MUST use that grant's correlation ID, and only the exact one-use `candidate-forward` decision may consume the canonical grant and authorize injection/forwarding. A participant-shaped request without that exact armed grant, including a page-script navigation, nonexact target, or a post-consumption request, MUST use the open binding IDs and a fresh proxy-generated correlation ID, be classified `unknown`, marked product-attributable/prohibited, and be blocked without consuming or invalidating the grant. Bundled-SPA, extension, missing-marker, and invalid-marker rows retain their closed rules. The proxy and server MUST independently project the six Fetch Metadata/Origin/Referer fields, discard raw values, and agree, while the broker independently validates the grant and correlation. Any unintended execution, inspected-source mutation, prohibited direct product-issued outbound request or MCP connection as defined by FR-022, request outside the two exact authorized internal loopback classes, or exposure of inspected content to another machine is automatically critical. An ACKed context correlation is only an eligible failure link. Success MUST keep submission correlation and review fields `not-applicable`, while every accepted automatic issue remains separately counted. A failure with an eligible candidate MUST use its exact correlation as `automatic-critical` without review; only a candidate-free failure MUST be submitted to two isolated, hidden, one-use reviewer processes: two `product-caused-blocker` votes yield `reviewer-confirmed-critical`, two `not-product-caused-blocker` votes yield `reviewer-cleared`, and one of each yields `reviewer-disagreement-critical`. A success uses `not-applicable`. Reviewer identities and case assignments may exist only in the published roster and separate access-controlled administrative assignment record defined above; they, reviewer notes, communication, human/process/assignment reuse, and third adjudication are forbidden from collectors, outcomes, repository study-input artifacts, runtime IPC, capture, and evidence. The literal `reviewer-one`/`reviewer-two` slot labels and sanitized terminal-equipment surfaces MAY be drained, reset, and reused under a fresh case-scoped mapping. Only confirmed/disagreement rows use `effectClass: workflow-blocker`; all other rows use `none`. Automatic IDs are exactly `automatic:<correlationId>` and reviewer IDs exactly `reviewer:<subjectId>:<workflowClass>`. The zero-critical-issue gate MUST pass only after all 20 participants have exactly four terminal outcomes and the verifier recomputes their empty tagged, de-duplicated union without counting an automatic-linked row again. A non-safety problem is critical only through that closed reviewer rule.

  The three required capture roles are exactly `product-instrumentation`, `inspector-server-ledger`, and `study-browser`. Each MUST use a separate capture-adapter process and a separate watchdog process, all distinct from the Inspector and browser. The watchdog MUST be the sole envelope writer: its adapter may inspect raw traffic only ephemerally in process memory, classify it, discard it before IPC, and send only closed safe events to the watchdog. Each authenticated IPC message MUST carry exactly one canonical safe payload, while any number of event messages MAY occur within one primary-workflow observation and every accepted message MUST be counted and chained. Retained, transmitted, hashed, or error payloads MUST contain only contract-defined fixed codes, protocol-generated opaque IDs, booleans/enums, safe integers, and evidence digests. They MUST contain no raw header name, framing, wire representation, encoded value, or noncanonical derivative; request/response body; inspected/authored content or metadata; participant response; Source-relative or absolute path; URL or authority value; capability; environment value; raw error; or exception text. The sole header-derived exception is the strictly validated decoded canonical safe ID retained as `correlationId`, whose owner is the closed supervisor-grant or proxy/runtime protocol and which therefore appears in the retained canonical payload and its digest chain. `payloadSha256` MUST cover only retained canonical safe-payload bytes and MUST never cover captured wire/browser/Inspector bytes.

  At capture start the supervisor MUST create exactly twenty fresh, unique, cryptographically
  random, run-local, unlinkable participant tokens, each from exactly 32 random bytes (256 bits)
  encoded as exactly 43 unpadded base64url characters. Participant-specific observations MUST
  use one of those tokens as `subjectId`; observations that are not participant-specific MUST
  use literal `not-applicable`. `subjectId` is the sole explicitly permitted pseudonymous human
  evidence: it MUST encode no real identity, distribution slot, response, or other participant
  attribute and MUST have no retained external mapping. It MUST be freshly generated for each
  run. The supervisor MUST retain no identity or distribution mapping, MUST keep the ordered token
  set only for that run, and MUST send only the next token inside that attempt's authenticated
  `attempt-binding`; the harness schedules attempts but MUST NOT create or select tokens. The
  verifier checks uniqueness within that run and MUST keep no cross-run token registry. The
  `study-browser` stream is the sole workflow-outcome authority and MUST contain exactly one
  terminal `success | failure` outcome for every token and each of `discovery`, `inspection`,
  `comparison`, and `global-consent`: exactly 80 terminal outcomes, with no missing, duplicate,
  extra, or mismatched subject/workflow pair. Discovery succeeds for at least 19 of the 20 tokens
  and inspection for at least 18; all twenty tokens remain in both denominators. Any number of
  nonterminal or request-event messages MAY still occur within an observation. Exact-80
  cardinality and canonicality MUST be evaluated independently of those success thresholds:
  with 80 valid terminal records, verification, stop, finalize, witness, and seal MAY complete
  even when discovery or inspection misses its threshold. Such a miss MUST block that release
  criterion but MUST NOT invalidate evidence or become an automatic critical issue; a protocol,
  cardinality, authentication, or privacy violation MUST fail closed independently.

  `capture -- start` is run-level only: through the one existing materialization-created live
  supervisor it binds the proxy/listener, launches the study harness, scoring moderator, and three
  adapters, requires each adapter to launch its own watchdog, yielding exactly eight internal long-
  lived descendants/processes below the supervisor (watchdogs are adapter children), and creates the three live stream
  `capture-start` records, but creates no attempt profile, marker, grant, candidate, correlation,
  or workflow evidence. Attempts then run strictly sequentially. Participants 1 through 19 each
  complete discovery, inspection, comparison, and Global consent and fully close before the next
  attempt starts. Participant 20 completes discovery and, unless terminalized by a defined
  failure, remains the sole open attempt across the checkpoint/handoff before completing
  inspection, comparison, and Global consent during continuation. Therefore the checkpoint
  contains all 20 SC-001 outcomes while never retaining more than one live attempt. If participant
  20 is already terminalized, a post-anchor heartbeat supplies the required continuation progress.
  Each attempt creates its fresh profile, binding,
  secret, marker, and bootstrap only after the run streams are live and immediately before that
  attempt's `npx` and first capturable request.

  The authorized materialize caller/study setup MUST provide four pairwise-distinct bidirectional,
  nonrecording external terminal-equipment handles: descriptor 6 for the participant, 7 for the
  moderator, 8 for `reviewer-one`, and 9 for `reviewer-two`. They are equipment surfaces, not
  inherited internal evidence IPC. Before supervisor launch the materializer MUST verify stable
  handle identity, distinctness, bidirectionality, no history/recording, and no echo, and MUST pass
  only those fixed descriptors to the supervisor. The supervisor retains descriptor 6, passes
  descriptors 7–9 to the scoring moderator at its launch, and immediately closes its copies of
  7–9. Missing, aliased, swapped, recordable, echoing, or extra terminal handles invalidate before
  enrollment or participant launch.

  The standardized study harness and scoring moderator inside the digest-bound capture script
  MUST keep exactly one runtime-only `StudyCurrentSubjectScoringContext`. Its exact safe root is
  `schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`, `workflowClass`,
  `automaticIssueCorrelationId`, `terminalizationClass`, `state`. It starts with
  `automaticIssueCorrelationId: not-applicable` and `terminalizationClass: none`. No discovery
  context exists during launch/bootstrap or pre-readiness buffering. After fresh process binding,
  ordered pre-readiness release, and both open-binding ACKs, the supervisor MUST open the
  discovery context and obtain the moderator's `scoring-context` ACK; only then may readiness
  return, followed by the participant-navigation grant, navigation, prompt/timer, and task. A
  buffered pre-readiness observation therefore uses workflow/process/link fields `not-applicable`, cannot
  update a later workflow context, and remains a separately counted automatic issue when
  prohibited. While a workflow context is open, the first nonworkflow prohibited observation
  candidate for the same run, subject, process, and workflow MAY set the correlation only after
  the supervisor validates it, applies the open current-workflow tag before canonical safe-payload
  serialization, and obtains the applicable adapter/watchdog downstream ACK or ACKs
  complete, and the observation thereby becomes accepted. These are the only permitted one-way context
  updates: correlation `not-applicable` to the first exact match once, and terminalization class
  `none` to its mapped cause once. A remaining-workflow context created after terminalization is
  initialized directly with that mapped class. Every other mutation is rejected. The supervisor
  keeps the authoritative safe context mirror/current workflow; an observation source cannot
  self-assert a workflow. The supervisor serializes the matching candidate once with that current
  workflow, waits for its required downstream ACK or ACKs, marks and counts it accepted, performs the one-way correlation
  update, resends the updated `scoring-context` to the moderator, and requires its ACK before any
  release decision or outcome submission. An accepted retained observation is immutable: no later
  tag assignment, mutation, or backfill is permitted, and a pre-readiness/context-free N/A tag is
  permanent. That correlation is only an eligible
  failure-link candidate; it does not determine the workflow outcome. The moderator may create an
  automatic link only from that ACKed mirror. Raw response, timing, ground truth, rubric,
  and reviewer inputs are scoring-moderator call-local only and MUST never traverse safe IPC.
  For each normally completed open scoring context, the moderator MUST enable descriptor 7 for
  exactly one external runtime-only `StudyModeratorInput`, compact canonical UTF-8 JSON plus one
  LF, with exact root `schemaVersion`, `studyRunId`, `subjectId`, `inspectorProcessId`,
  `workflowClass`, `response`, `timing`, `groundTruth`, `rubric`; timing is a canonical nonnegative
  decimal string and the last three raw values are canonical JSON strings. It MUST reject EOF, parse failure,
  extra/trailing input, replay, and cross-context routing; the surface has no echo, history,
  recording, or log. A terminalization-synthesized remaining workflow accepts no such record and
  rejects late input; its failure comes only from the terminalization decision, with no invented
  empty response/timing fields. The moderator MUST destroy the raw frame and call-local values after the
  outcome/reviews or immediately on abort. After each
  workflow submission is accepted, its context MUST be destroyed; before the next workflow's
  prompt, timer, or task, the supervisor MUST open the next context and receive the moderator ACK.

  The study harness owns schedule/attempt orchestration only. The scoring moderator constructs
  and submits exactly one `StudyWorkflowOutcomeSubmission` for each of the 80
  subject/workflow pairs. Its exact root order is `schemaVersion`, `studyRunId`, `subjectId`,
  `inspectorProcessId`, `workflowClass`, `outcomeClass`, `automaticIssueCorrelationId`,
  `reviewDisposition`, `reviewerOneClassification`, `reviewerTwoClassification`. Success MUST keep
  submission correlation, disposition, and both reviewer classifications `not-applicable`, even
  when its context carries an eligible candidate; every accepted automatic issue remains counted
  separately. A failure whose ACKed context carries an eligible candidate MUST use
  `automatic-critical` with that exact correlation and no review. A failure whose context has no
  candidate MUST use correlation `not-applicable` and be reviewed. A missing, mismatched, reused,
  optionalized, or cross-workflow link MUST be rejected. The scoring moderator constructs
  the exact privacy-safe `StudySafetyReviewCase` root `schemaVersion`, `studyRunId`, `subjectId`,
  `inspectorProcessId`, `workflowClass`, `caseClass`, with case class
  `nonautomatic-workflow-failure`. Before the attempt begins, a distinct human pair is assigned
  procedurally and out of band to each subject/workflow; no human, collector process, component/run
  identity, or case assignment is reused for another case. The literal reviewer slots and sanitized
  terminal-equipment surfaces may be drained, reset, and remapped for a later case. The required roster is named in the published bilingual governance plan, and a
  separately governed access-controlled administrative assignment record outside the repository
  bundle, work root, candidate, runtime IPC, capture, and evidence records one unique pair per case
  for audit and is destroyed under the consent-retention policy. It MUST NOT affect scoring bytes
  or cross into runtime/evidence. Each pair directly observes the same live attempt/workflow, including a live
  pre-workflow terminal event, through a boundary that produces no recording or IPC. Synthesized
  missing rows are reviewed from that observed terminal event. Only after a failure is determined
  does the moderator spawn one fresh,
  isolated, one-use vote-collector process for each reviewer and send the two processes byte-
  identical safe cases before accepting either classification; success spawns no reviewer
  process. The moderator enables each slot-isolated reviewer equipment input only after both
  byte-identical cases have been displayed completely. Each collector reads exactly one LF-
  terminated ASCII enum, `product-caused-blocker | not-product-caused-blocker`, from its own
  inherited external terminal-equipment descriptor, with no echo, history, recording, log, or
  cross-slot output, then wipes its raw input. The first vote remains hidden from the second. Reviewer identity and assignment never
  enter collectors, outcomes, repository study-input artifacts, runtime IPC, capture, or evidence.
  Two `not-product-caused-blocker` votes use
  `reviewer-cleared`; two `product-caused-blocker` votes use `reviewer-confirmed-critical`; one of
  each uses `reviewer-disagreement-critical`. Only the last two dispositions use
  `effectClass: workflow-blocker`. Reviewer notes, communication, third review, and human/process/
  assignment reuse are forbidden; both reviewer processes MUST exit before the workflow
  submission is accepted. Product/server adapters MUST reject workflow outcomes.

  The final verifier MUST independently recompute the sealed aggregate fields in exact order
  `automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`, `reviewVoteCount`,
  `reviewDisagreementCount`, `reviewerCriticalIssueCount`, `criticalIssueCount`,
  `zeroCriticalIssueGate`. Automatic issue IDs are derived exactly as `automatic:<correlationId>`;
  reviewer-critical issue IDs are derived exactly as `reviewer:<subjectId>:<workflowClass>` for
  reviewer-confirmed/disagreement rows. `suspectedWorkflowBlockerCount` counts every
  nonautomatic failure sent to review, including reviewer-cleared rows, and `reviewVoteCount`
  equals twice that count;
  `reviewerCriticalIssueCount` is the cardinality of that reviewer issue-ID set; and
  `criticalIssueCount` is the cardinality of the tagged, de-duplicated union of the automatic and
  reviewer issue-ID sets. An `automatic-critical` workflow row refers to its existing automatic
  issue and MUST NOT add another reviewer issue or be double-counted. An automatic issue observed
  during a successful workflow remains in the automatic set even though the success submission
  stays all N/A. `zeroCriticalIssueGate` is
  true exactly when that union is empty AND the exact 20-by-4 terminal workflow set is complete.
  The 19/20 and 18/20 success thresholds remain independent of this aggregate, and the record-kind enum and
  retained filename set do not change.

  Every request observation MUST carry only closed safe classes. For the fixed headed
  `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0` profile, the proxy and server MUST
  independently project Chromium-controlled `Sec-Fetch-Dest`, `Sec-Fetch-Mode`,
  `Sec-Fetch-Site`, and `Sec-Fetch-User` together with Origin and Referer, then discard every raw
  field. Fetch Metadata is a consistency signal, not human attestation. Immediately after product-
  probe readiness and before the sole expected initial navigation, the supervisor MUST generate
  one fresh runtime-only `StudyParticipantNavigationGrant` with exact root `schemaVersion`,
  `studyRunId`, `browserAttemptId`, `correlationId`, `state` and state
  `armed | consumed | destroyed`, then send `participant-navigation-grant` to the browser adapter.
  The browser/page MUST not see the grant before proxy injection. Participant classification
  requires a valid marker, navigate/document, `?1`, missing Origin, site
  `none | same-origin`, the exact authorized-static target, and the current armed grant. For a
  participant-shaped candidate, the adapter call-locally reserves its armed copy and uses the
  supervisor-owned grant's correlation ID without changing any state. The supervisor validates the
  still-armed canonical grant, correlation, attempt, and complete candidate and stores that candidate
  as pending while the canonical grant remains armed. It then sends exact one-use
  `browser-broker-decision: candidate-forward` as the sole authenticated candidate acceptance and
  forwarding authorization; there is no separate candidate ACK. That decision atomically consumes
  the canonical grant. Only after validating the matching decision may the adapter consume its copy
  and forward. Replay, duplicate or stale authenticated candidate/
  grant IPC, simultaneous second consumption, or a skipped/mismatched broker decision or ACK
  forwards nothing and invalidates the run; close destroys the grant. A fresh HTTP request with
  no armed grant—including a nonexact target, post-consumption request, or user-activated page-
  script navigation—is instead a valid-marker `unknown` row with the open binding IDs and a fresh
  proxy-generated correlation ID, product-attributable/prohibited and blocked; it neither consumes
  nor invalidates the grant. Bundled SPA is a valid non-participant request with missing Fetch User and either exact-
  issued Origin or missing Origin plus exact-issued Referer; only its exact authorized static/API
  row forwards. Extension Origin is always unrelated with N/A IDs and blocked. Every remaining
  valid-marker row is `unknown`, uses open binding IDs, and is product-attributable/prohibited;
  missing or invalid marker is `other-host-process | unknown`, unrelated with N/A IDs and blocked.
  The proxy and server MUST reject any disagreement in their independently derived six-field
  projection.

  Only forwarded participant or bundled-SPA exact-issued requests produce the joined
  `study-browser` plus `inspector-server-ledger` pair, with binding IDs equal to the registered
  outer process and claim IDs. Extension, other-host, unknown, participant-shaped unauthorized, and all
  blocked rows are browser-only and never create an N/A server claim. Exact Inspector-originated
  requests retain the product-plus-server pair; nonexact Inspector and OS/effect observations are
  product-only; workflow outcomes are browser-only. Missing, duplicate, extra, or mismatched
  correlated records fail closed.

  Study-browser capture MUST use the capture script's Node.js-built-in-only deny-by-default local
  HTTP/CONNECT proxy. The `study-browser-adapter` MUST directly spawn and OS-observe the exact
  digest/identity-verified pinned Chromium binary. Browser-equipment control uses only Chromium's
  fixed anonymous `--remote-debugging-pipe`; that pipe is outside the inherited internal evidence-
  IPC matrix. The prepared-state input MUST select exactly
  `playwright-1.61.1-chromium-ubuntu-24.04-x64-node-24.18.0`: Playwright 1.61.1 `chromium`
  revision `1228`, browserVersion `149.0.7827.55`, title `Chrome for Testing`, on Ubuntu 24.04
  x64 with Node.js 24.18.0, headed, fresh, nonpersistent, empty-extension browser context and
  browser-context-only proxy mode `single-407-basic`. Through the pinned DevTools protocol the
  adapter MUST call `Target.createBrowserContext` with the exact proxy authority as `proxyServer`,
  `disposeOnDetach: true`, and an empty bypass list; enable `Fetch` with
  `handleAuthRequests: true`; and answer the one exact proxy Basic `authRequired` challenge with
  one `Fetch.continueWithAuth` `ProvideCredentials` response using literal username `study` and the
  current marker secret. After the run-level capture start has
  created all three live streams, and immediately before that attempt's participant `npx` and
  first capturable request, the fresh browser context requests exact proxy-local URI
  `http://inspector-study.invalid/.well-known/proxy-auth-bootstrap`. The proxy returns exactly one
  bodyless 407 with exactly the two headers `Proxy-Authenticate: Basic realm="inspector-study"`
  and `Connection: close`, and no others; exactly one canonical Basic retry succeeds with a
  bodyless 204 whose sole header is `Connection: close`. Bootstrap performs no DNS/connect, application,
  correlation, candidate, forwarding, or evidence effect. During capture, every study request
  carries exactly one canonical Basic field.

  For each attempt the supervisor MUST generate a fresh `browserProxyMarkerSecret`, distinct from
  and never derived from `browserAttemptId`, plus the exact marker binding. It sends
  `proxy-marker-install` directly to `study-browser-adapter`, which keeps the secret only in its
  attempt-local controller/auth buffer and supplies it for the browser context's sole Basic
  challenge paired with literal username `study`. The marker remains
  `prepared` until the adapter completes the exact actual-browser bootstrap above and ACKs success;
  only then do supervisor and adapter atomically transition it to `active`. Bootstrap failure
  transitions `prepared` directly to `destroyed` and MUST never expose an active marker. It is
  transport authentication only: it is not an application/control capability, and validity alone
  never decides actor, product attribution, or forwarding. The secret, raw/encoded Basic field,
  and proxy configuration MUST NOT enter browser or child environment/argv, files, helper IPC,
  evidence, logs, output, retained hashes, profile/history/cache/keychain/credential store, or
  application requests. The exact marker-install frame and attempt-local DevTools auth request are
  the only raw-secret transfer buffers; each MUST be wiped after acknowledgement. Normal close,
  abort, crash, terminalization, controller failure, and child exit MUST dispose the browser
  context, close the browser-equipment pipe/process as applicable, and wipe all copies; actual
  tests inspect isolated HOME/XDG/profile/history/cache/credential stores and require zero secret,
  encoded Basic, or `browserAttemptId` residue.
  The pinned Chromium build's remote-debugging-pipe disconnect contract MUST invoke
  `CloseBrowserSoon`; integration MUST verify that exact close-on-disconnect behavior. Any platform
  containment needed beyond that browser contract MUST be supplied and verified by study
  equipment/setup, not invented as an internal Node.js-built-in-only capture component.
  Adapter crash or DevTools-pipe EOF MUST NOT leave an orphan Chromium process or context. After
  directly observing adapter exit, the supervisor MUST block the next attempt and finalization
  until it has verified termination of all browser-equipment descendants/contexts and cleanup of
  the fresh profile. That runtime-only OS-observer state MUST never enter evidence.

  A participant candidate uses exactly the fresh correlation ID from the supervisor-generated
  grant; only other browser requests receive a fresh canonical
  `X-Inspector-Study-Correlation` from the adapter/proxy. It removes/replaces incoming copies and strips the forwarded
  header at the Inspector probe. The value is not a capability. Raw header name, framing, wire,
  and encoded or noncanonical derivative are discarded before IPC and never retained or hashed;
  the strictly decoded canonical safe ID is the sole header-derived exception and is retained as
  `correlationId` in the payload and digest chain. Nonexact/CONNECT traffic is blocked before DNS,
  socket, body forwarding, or response exposure.

  The bilingual evidence contract and data model MUST own the exact closed safe schemas and
  property orders for `StudyBrowserAttemptBinding`, `StudyBrowserRequestCandidate`,
  `StudyServerCorrelationClaim`, `StudyParticipantNavigationGrant`, and
  `StudyBrowserBrokerDecision`. Before each participant launch, the supervisor/broker MUST
  allocate a fresh `browserAttemptId` and one binding in `state: prepared` with
  `inspectorProcessId: not-applicable`, then distribute byte-identical runtime-only
  `attempt-binding` snapshots to the study harness and browser adapter and require both ACKs.
  Prepared, open, and closed snapshots use this rule. Both open ACKs, ordered pre-readiness
  release, and discovery-context ACK are all required before readiness may return; only after
  readiness may grants/candidates be accepted. Terminalization-decision changes both copies to
  terminalizing. The adapter MUST destroy only its browser/grant/marker/reservation/candidate/
  pending state and retain the terminalizing binding until it ACKs the later closed snapshot. The
  harness MUST retain its terminalizing binding and fixed remaining schedule until synthesis
  completes. Only after both closed ACKs may the canonical binding copies be destroyed and the
  next attempt begin. At most one binding may be prepared, open, or terminalizing.
  Exact readiness atomically adds the fresh process ID and changes the state to `open`. The state
  enum is exactly `prepared | open | terminalizing | closed`. A pre-readiness failure enters
  terminalizing with process ID `not-applicable`; a post-readiness product/browser/equipment/
  premature-probe-close failure freezes accepted outcomes, closes pending joins, and enters
  terminalizing with the assigned process ID. In fixed remaining workflow order, the supervisor
  MUST open, mirror, and route each missing-workflow scoring context, while the moderator alone
  constructs exactly one terminal failure plus its required review/outcome; the harness retains
  schedule and orchestration only. Accepted rows are preserved and no duplicate is produced. Only after exactly four
  outcomes may the attempt close and wipe its binding, grant, marker, and pending state. A failure
  of the evidence harness, supervisor/orchestrator, adapter, watchdog, moderator, or reviewer
  invalidates the run and MUST NOT synthesize outcomes. `browserAttemptId` may exist only in
  supervisor/broker/harness/browser-adapter memory, authenticated frames, grants, and safe
  candidates. It MUST NOT enter the actual browser process/context/profile/configuration/
  credentials, request, application, retained evidence, or logs.

  `StudyBrowserBrokerDecision` has exact root `schemaVersion`, `studyRunId`,
  `browserAttemptId`, `correlationId`, `decision`, with decision
  `candidate-forward | browser-only-released | joined-pair-released`. Attempt terminalization
  carries only the exact run, subject, attempt, process, and cause identifiers, with cause
  `product-exit | browser-exit | equipment-failure | premature-probe-close`. Scoring-context
  `terminalizationClass` is `none | product-exit | browser-exit | equipment-failure`: the first
  three causes map to their same-named class and `premature-probe-close` maps to
  `equipment-failure`. The supervisor is the sole participant-launch controller and direct OS
  process observer, and therefore the sole source of `product-exit`, including exit before
  bootstrap; the harness owns only schedule and binding state and never reports exit. The browser
  adapter is the sole attempt-bound browser-equipment observer and MAY report `browser-exit` only
  for actual browser process/context exit or `equipment-failure` only for an externally observed
  browser/OS/environment bootstrap failure while the exact controller, proxy, and authentication
  path remain healthy. An adapter/proxy/controller/CDP/authentication/marker/IPC/implementation or
  browser child-management fault invalidates the run and MUST NOT synthesize outcomes. On an
  authenticated probe close the supervisor serializes the child state: an already exited child
  yields `product-exit`, a still-live child yields `premature-probe-close`, and normal close after
  four outcomes and zero pending joins yields no terminalization. The first valid committed cause
  wins atomically and every later competing cause is rejected. The
  scoring moderator sends each exact submission to the supervisor; the
  supervisor validates and forwards it as `workflow-outcome` to the browser adapter, which
  canonicalizes and routes the safe workflow record to its watchdog. A `safe-payload` message on
  that edge is reserved for nonworkflow browser observations and MUST NOT carry or bypass a
  `workflow-outcome`. For each accepted nonworkflow browser observation, the supervisor alone
  applies the current workflow tag—or N/A when no context is open—and constructs the canonical
  safe payload. The browser adapter MUST validate it against the stored request candidate, route
  it to its watchdog, and return its semantic safe-payload ACK only after the watchdog ACK. A blocked/browser-only observation MUST
  receive that ACK before `browser-only-released`; a joined observation MUST receive both its
  browser and server safe-payload ACKs before `joined-pair-released`. On terminalization the
  supervisor fans out byte-identical `terminalization-decision` payloads to both the study harness
  and browser adapter; the adapter destroys its browser/grant/marker/reservation/candidate/pending
  state, retains the terminalizing binding until closed-snapshot ACK, and keeps its long-lived
  process running; the harness retains its terminalizing binding and fixed remaining schedule
  through synthesis and closed dual ACK. `browser-broker-decision` is supervisor-to-browser-adapter
  only, a child failure report is `attempt-terminalization`, and the parent fanout is
  `terminalization-decision`. All inherited message types—including `runtime-bootstrap` only on
  the materializer edge; `browser-proxy-binding`, `attempt-binding`, `proxy-marker-install`,
  `participant-navigation-grant`, `browser-broker-decision`, `safe-payload`, `workflow-outcome`,
  `terminalization-decision`, `stream-control`, `stream-control-result`,
  `process-lifecycle-attestation`, and `lifecycle` on their contract-listed edges—are permitted
  only by the contract's complete closed parent/child matrix; no prose subset changes that set.
  The browser adapter has no sibling edge to the study harness.

  A `browser-only-released` decision for a valid-marker bound candidate MUST carry that open
  attempt's `browserAttemptId`; only the missing/invalid-marker unrelated branch uses N/A attempt
  identity. A pre-readiness terminalized workflow submission, review case, and both review votes
  MUST all repeat the same literal `inspectorProcessId: not-applicable`. No later readiness or
  synthesis step may replace one of those N/A values.

  The bootstrap and decision table above are the sole browser marker and actor rules. No request
  field may carry `browserAttemptId`, and no valid marker may create a participant/SPA claim
  without the complete Fetch Metadata row. Extension and missing-secret other-host traffic never
  receive binding IDs or a server claim. A remaining valid-secret `unknown` row receives the open
  binding IDs but no server claim and is deliberately fail-closed as
  product-attributable/prohibited; a missing/invalid post-bootstrap marker is unrelated and
  blocked. This asymmetry prevents both marker-only product attribution and silent loss of a
  product SPA's remote or other-loopback attempt.

  For an eligible participant/SPA exact-issued request, the adapter MUST reserve without changing
  grant state; the supervisor MUST validate and store its `StudyBrowserRequestCandidate` as pending
  while the canonical grant remains armed, then issue exact one-use
  `browser-broker-decision: candidate-forward` as the sole authenticated candidate acceptance and
  forwarding authorization and atomic canonical consume. Only after validating that decision may
  the adapter consume its copy and forward; no separate candidate ACK exists. The probe
  MUST atomically submit the matching `StudyServerCorrelationClaim` and receive broker
  acknowledgement before application handling. The broker alone releases the joined pair only
  after both browser/server safe-payload ACKs, then sends `joined-pair-released` and acknowledges
  both sides. The `submit-product-event` outer request carries only `inspectorProcessId`,
  `destinationRole`, and `payload`; its outer process MUST equal the registered probe, while the
  claim's subject/process equality is enforced inside the payload against the open binding and
  that outer process. Any extension/host/unknown claim is invalid and releases no record. The join has no
  clock, timeout, retry delay, or elapsed-time acceptance rule. Failure is triggered only by
  transaction/request end, abort, error, or connection close; IPC, probe, attempt, or child close;
  stop; replay, mismatch, duplicate, or late input. Every failure releases zero partial records,
  wipes the pending entry, and rejects later input. Closing destroys the binding, marker secret/
  configuration, and pending joins; stop and finalize require zero residue. The join uses existing
  authenticated inherited IPC messages and adds no join-specific study-control command.

  During the exact readiness transition for each successfully launched participant Inspector
  process, before returning the readiness response, the
  supervisor MUST assign one fresh opaque `inspectorProcessId` made from exactly 32
  cryptographically random bytes (256 bits) encoded as exactly 43 unpadded
  base64url characters, distinct from the subject token, capture/watchdog IDs, and the OS
  process ID. It is non-human launch correlation only and MUST NOT be used as pseudonymous
  participant evidence. The same safe ID MUST identify cross-stream request, effect, and
  workflow records from that launch and MUST NOT be reused for another launch. A failure before
  launch or readiness MUST use literal `not-applicable` as the process value. For every pre- or
  post-readiness terminalization, accepted rows remain frozen and only missing workflows receive,
  in fixed remaining order, a mapped-class context, one terminal failure, and the review defined
  above. No duplicate or extra workflow record is permitted, and closure occurs only after exactly
  four outcomes. All twenty participant attempts
  MUST be bound to exactly these launch/failure records.

  For each fixed subject the supervisor MUST enable descriptor 6 for exactly one LF-terminated
  ASCII line, `npx --no-install agent-customization-inspector --no-open`, reject any other or extra
  line, and wipe the command buffer. Without a shell, it MUST spawn the candidate-bound local
  no-install `npx` resolved only from the identity-pinned sole audited bin on the sanitized
  equipment PATH as its directly observed child in that subject's verified distribution
  `repository/` cwd and a sanitized environment containing only the bound
  `NODE_OPTIONS=--import=<bound-capture-script-file-url>` probe plus the control endpoint/token and
  safe run/subject IDs to the minimum required scope. Candidate/proxy authority MUST NOT enter the
  terminal, child environment, or argv. The participant `npx`/Inspector is external ephemeral
  study equipment and is not one of the eight long-lived internal capture descendants. After each
  attempt the supervisor MUST close the fresh child/process context and drain, reset, and clear
  descriptor 6 so no prior participant input, output, or history reaches the next attempt; the next
  attempt always uses a fresh `npx`/Inspector process and context. The probe is
  distinct from every adapter and watchdog. If a target reaches the bootstrap, body execution
  MUST block while it provides exact `StudyPreReadinessBootstrapProof` root
  `schemaVersion`, `productId`, `bootstrapEventId`. The command
  `register-pre-readiness-probe` takes `studyRunId`, `subjectId`, `bootstrapProof` and
  returns `preReadinessProbeId`. The runtime-only `StudyPreReadinessProductBuffer` root is
  `schemaVersion`, `studyRunId`, `subjectId`, `preReadinessProbeId`, `state`, with state
  `open | readiness-bound | terminalization-bound | destroyed`.

  Each pre-readiness draft MUST be a canonical observation with process/workflow/automatic/
  review fields N/A. `buffer-pre-readiness-product-event` takes `preReadinessProbeId`,
  `destinationRole`, `payload`; the supervisor MUST ACK before the product effect and raw
  values MUST be discarded immediately. `register-product-probe` takes `studyRunId`,
  `preReadinessProbeId`, `readinessProof`, `requestedDestinationRoles`; fresh process-ID binding
  and ordered-release ACK MUST precede both open-binding ACKs and discovery-context ACK, and
  readiness may return only after that complete sequence. Exit
  before bootstrap is ordinary pre-readiness terminalization. Exit after bootstrap binds N/A
  and requires release ACK before terminalization. A non-target/helper never registers or emits
  evidence. Bootstrap identity, registration, or ACK failure invalidates the run. Because the
  participant process cannot inherit the supervisor descriptor, the probe MUST use endpoint/token
  environment only for `register-pre-readiness-probe`, `buffer-pre-readiness-product-event`,
  `register-product-probe`, `submit-product-event`, and `close-product-probe`; the supervisor MUST
  route each safe event plus `inspectorProcessId` to the distinct product or server
  adapter/watchdog. The `submit-product-event` outer request has exact root
  `inspectorProcessId`, `destinationRole`, `payload`; only `destinationRole: inspector-server-ledger`
  MAY carry the exact `StudyServerCorrelationClaim` payload variant:
  the outer `inspectorProcessId` MUST authenticate the registered probe, and a participant/SPA
  claim's subject/process IDs MUST equal the open binding and that outer ID. No unrelated-actor
  claim is permitted. The probe MUST
  assign the same closed correlation header for its logical
  Inspector request before raw values are discarded. The browser helper MUST NOT inherit the
  probe/control environment, and probe path/options/environment values MUST
  NOT enter evidence. A missing, altered, alternate, duplicate, or raw-value-emitting probe MUST
  be critical. The candidate owns only a dormant readiness hook and MUST have no evidence
  authority.

  Each supervisor/child edge MUST use exactly two unidirectional inherited anonymous pipes, one
  parent-to-child and one child-to-parent. Only after child-file identity verification, the
  parent-to-child pipe MUST begin with an exact 96-byte binary bootstrap prefix containing a
  fresh seed, nonce, and channel ID, then transition on that same still-open pipe directly to LF-
  terminated parent-to-child canonical frames; it MUST NOT signal EOF after the prefix. EOF before
  all 96 bytes MUST fail, and every byte after the prefix MUST belong to canonical frame parsing.
  The child-to-parent pipe's first message MUST be the authenticated one-use `ready` frame at
  sequence 0. Direction-specific keys MUST be derived with domain-separated HMAC; seed/nonce are
  wiped after derivation/ready and keys survive only until edge close. Every frame has exact root order `schemaVersion`,
  `channelId`, `sequence`, `direction`, `senderRole`, `receiverRole`, `messageType`,
  `authenticationTag`, `payload`; the tag preimage is the exact canonical object with
  `authenticationTag: null` serialized as compact JSON with no LF, while only the populated
  transmitted frame appends one LF. Receivers compare tags in constant time,
  require sequence 0 then exact +1, and enforce the contract's closed sender/receiver/message
  matrix. No seed, nonce, key, channel, or frame may use environment, argv, or a file. Wrong child,
  role, direction, sequence, field, tag, duplicate ready, replay, premature EOF, unexpected
  post-bootstrap byte, abort, crash, or close fails
  closed, wipes both directions, and releases no partial evidence. This inherited protocol adds no
  supervisor-control command.

  On the materializer-to-supervisor edge, the first authenticated parent-to-child frame after the
  supervisor's `ready` MUST be the one-use `runtime-bootstrap` carrying exact
  `StudySupervisorRuntimeBootstrap` root `schemaVersion`, `workRootLexicalValue`,
  `workRootCanonicalValue`, `workRootIdentity`, `controlEndpoint`, `controlToken`. Before any work-
  root mutation, the supervisor MUST independently validate the root, bind the endpoint, load the
  token, and ACK that frame; only then may materialization write distributions. Frame buffers MUST
  be wiped after consumption. On success the materializer MUST send the authenticated role-specific
  lifecycle close, receive its ACK, and detach/wipe that edge while the supervisor and endpoint
  remain live through finalize; bootstrap failure MUST abort and exit the supervisor. These
  authority values MUST be absent from supervisor child environment/argv and may exist only in
  this transient bootstrap, supervisor memory, and the authenticated runtime-control exchanges.

  Descendant lifecycle evidence MUST use only `process-lifecycle-attestation` carrying exact
  `StudyProcessLifecycleAttestation` root `schemaVersion`, `processRole`, `streamRole`,
  `componentRunId`, `instanceId`, `processRunId`, `event`, `exitCode`, `signal`, where `event` is
  `registered | exited`. An adapter self-registers to the supervisor; registration is not an exit
  observation. A direct parent MUST OS-observe a represented child before forwarding or creating
  that child's authenticated report: each adapter forwards its matching watchdog registration and
  later reports the directly observed watchdog clean exit; the moderator reports each reviewer's
  registration after ready and clean exit after direct observation; the supervisor directly OS-
  observes the adapters, harness, and moderator. An acknowledgement in
  the reverse direction is permitted only for the immediately preceding valid attestation on the
  supervisor/moderator, supervisor/adapter, and adapter/watchdog edges; it MUST NOT acknowledge a
  candidate or terminal report. Each adapter registration MUST be supervisor-ACKed before its
  writer binding is relayed; each watchdog registration MUST be adapter-ACKed and then supervisor-
  ACKed before start proceeds; every reviewer-exit attestation precedes outcome submission, and
  every watchdog-exit attestation precedes adapter exit. Start MUST wait for all six stream
  registrations. Stop MUST wait for the three adapter-OS-observed watchdog-exit
  attestations plus direct adapter/orchestrator exits, and reviewer count MUST use the moderator-
  OS-observed, attested distinct clean exits. A nonclean child sends `lifecycle: child-exit`,
  invalidates the run, and MUST NOT contribute to a witness.

  Stream lifecycle MUST use exact `StudyStreamControl` root `schemaVersion`, `controlSessionId`,
  `studyRunId`, `workRootIdentityCommitment`, `candidateIdentityCommitment`, `candidateSha256`,
  `studyInputManifestSha256`, `streamRole`, `command`, `checkpointRequestId`, `handoffSha256`,
  with those binding values repeated unchanged on every command and command
  `start | checkpoint | anchor-handoff | stop`, and exact `StudyStreamControlResult` root
  `schemaVersion`, `controlSessionId`, `studyRunId`, `streamRole`, `command`,
  `checkpointRequestId`, `sequence`, `monotonicNs`, `envelopeSha256`. The supervisor MUST send each byte-identical `stream-control`
  through the adapter to its watchdog, and the watchdog's semantic response MUST return as
  `stream-control-result` over the reverse path. Start, checkpoint, anchor-handoff, and stop phase
  barriers MUST wait for the exact three fixed-role results; a start result is valid only after
  that watchdog writes `capture-start` plus its first heartbeat and reports the resulting current
  position, and its `checkpointRequestId` MUST be literal N/A. The supervisor MUST create and validate each stream file and pass one dedicated append-
  only handle only through exact spawn inheritance at descriptor 5. A path-free runtime-only
  `StudyStreamWriterRuntimeBinding` MUST bind the capture adapter's authenticated component/
  instance/process identities to descriptor 5's expected stable handle identity, `nlink`, and
  append mode. After the adapter's registration is supervisor-ACKed, it MUST relay that binding and
  the inherited handle to its watchdog and receive the binding ACK; the watchdog MUST independently
  validate the binding and handle before registering, and both adapter and supervisor MUST ACK that
  registration. Only after this sequence completes for all three streams may the supervisor send
  and ACK the browser-proxy binding, followed by stream start. The handle travels through the
  contract-fixed child-visible evidence-writer slot beside the separately
  fixed parent-to-child and child-to-parent IPC slots, never as a path, cwd, environment value, or
  argv. The writer slot is absent for every nonstream role and is not a third IPC pipe.
  The adapter only transfers that handle, MUST NOT read or write it, and closes its copy after the
  watchdog's registered attestation; the supervisor closes its copy after the complete downstream
  registration ACK. No duplicate or extra handle copy is permitted, leaving the watchdog as sole
  holder and writer. This evidence-writer
  authority is distinct from IPC bootstrap/channel authority. Stop order is exact result, handle
  close, then clean exit; every failure closes every remaining copy and invalidates the run.

  Every stream MUST use pairwise-distinct, protocol-owner-generated opaque watchdog-instance,
  watchdog-process-run, capture-instance, and capture-process-run IDs for its full run.
  Append-only safe-integer sequence MUST start at 0 and increase by exactly 1. Exact envelope
  bytes MUST be `Buffer.from(JSON.stringify(canonicalEnvelope) + '\n', 'utf8')`, where
  `canonicalEnvelope` is newly constructed without Unicode normalization, has no extra keys,
  and inserts properties in the order `schemaVersion`, `streamRole`, `watchdogInstanceId`,
  `watchdogProcessRunId`, `captureInstanceId`, `captureProcessRunId`, `sequence`, `recordKind`,
  `monotonicNs`, `priorDigest`, `payloadSha256`; byte-for-byte comparison, not parse equivalence,
  determines canonicality. `recordKind` is the closed
  `capture-start | payload | heartbeat | handoff-anchor | capture-stop` enum. Each kind MUST use the closed
  canonical safe-payload schema in `contracts/usability-study-evidence.md`; the start and stop
  payloads MUST bind both frozen study digests, heartbeat MUST bind observed
  capture-process/IPC health, and stop MUST bind the final sequence, record/kind counts, and
  preceding envelope digest. The first `priorDigest` MUST be 64 zeroes, every later value MUST
  equal the lowercase SHA-256 of the prior exact envelope bytes, and every safe-payload digest
  MUST be recomputed from retained exact canonical safe-payload bytes. Sequence 0 MUST be the
  sole start. The watchdog scheduler MUST target one heartbeat every 1,000 milliseconds. The
  sole observed continuity acceptance ceiling, including scheduler tolerance, MUST be
  1,500,000,000 nanoseconds for start-to-first-heartbeat, consecutive-heartbeat,
  latest-heartbeat-to-checkpoint/handoff, and last-heartbeat-to-stop gaps; intervening payload
  records MUST NOT conceal a missing heartbeat, and any larger gap MUST be critical.

  The command phase matrix MUST require `INSPECTOR_STUDY_WORK_ROOT`,
  `INSPECTOR_STUDY_CONTROL_ENDPOINT`, and `INSPECTOR_STUDY_CONTROL_TOKEN` for every
  materialize-through-finalize command. The token MUST be a fresh per-run value made from
  exactly 32 cryptographically random bytes (256 bits) and encoded as exactly 43 unpadded
  base64url characters. Materialize and `verify -- inputs` MUST ignore and MUST NOT require
  `INSPECTOR_STUDY_CANDIDATE_TARBALL`; the candidate environment value is first required at
  `capture -- start` and is required again by every later client through finalize. A candidate
  file MAY already exist before materialization: materialization creates the closed
  distributions, not that candidate. At materialization, authorized setup MUST fix an identity-
  pinned `npx` on the sanitized equipment PATH and one reserved initially empty candidate-launch
  store-bin slot outside the work root and distributions; materializer and inputs verification
  MUST NOT read that slot. After successful `verify -- inputs` and before start, authorized study
  setup alone MUST provision that same known slot from the candidate tarball plus frozen production
  graph into a fresh network-disabled, scripts-disabled store and MUST digest-bind it. At start the
  supervisor MUST revalidate the inherited fixed slot and MUST resolve only its sole audited bin
  through pinned `npx --no-install`. The raw tarball path MUST NOT enter child environment or argv;
  this route MUST add no environment/control field and MUST NOT mutate a distribution or use cache,
  network, install, alternate PATH, global, or fallback resolution. The store MUST remain outside
  runtime/evidence and MUST be destroyed with a verified absence barrier after abort, stop, or
  finalize. At materialization the work root MUST be an absolute,
  existing, empty ordinary-local directory supplied by study setup; active-platform explicit
  UNC/server-share/device/network spellings MUST fail before I/O. The control endpoint MUST be
  transient and outside the work root and every distribution. On POSIX it MUST be an absolute
  Unix-domain-socket pathname. On Windows it MUST match exactly
  `\\.\pipe\agent-customization-inspector-study-` followed by 32 lowercase hexadecimal
  characters. TCP, UDP, DNS, every network transport, remote/network named-pipe spelling, and
  a work-root sidecar are forbidden. A lexically indistinguishable pre-mounted or mapped filesystem remains the
  documented FR-022 limitation and MUST NOT be claimed as proven local.

  `INSPECTOR_STUDY_BROWSER_PROXY_AUTHORITY` MUST be required only from capture start through
  stop and MUST be an exact runtime-only `127.0.0.1:<port>` authority. Materialize,
  `verify -- inputs`, and finalize MUST neither read nor require it; checkpoint and continuation
  occur before stop and MUST require it.
  Its exact raw route MUST be limited to authorized start-through-stop caller transient input,
  authenticated runtime-control `StudyLiveBinding`, supervisor dedicated memory, one authenticated
  one-use
  `browser-proxy-binding` frame carrying exact `StudyBrowserProxyRuntimeBinding` root
  `schemaVersion`, `studyRunId`, `browserProxyAuthority` to the already-ready, registered
  `study-browser` adapter, adapter dedicated memory, and the attempt-local DevTools control request/
  browser context described above. All six adapter/watchdog registrations and their writer-binding
  barriers MUST first be supervisor-ACKed. The browser adapter MUST then validate the authority, bind that exact loopback
  listener, ACK, and wipe the frame buffer; before that ACK no `stream-control: start`,
  `capture-start`, or start completion is permitted. Each caller, runtime-control, frame, and
  DevTools request buffer MUST be wiped after its acknowledgement. Supervisor and adapter dedicated
  memory plus only the live attempt-local browser context are its post-frame holders through stop;
  checkpoint/continuation MUST require the same value, and stop MUST close the listener and wipe
  all copies. It MUST NOT enter child/browser environment/argv, profile/history, retained evidence,
  or another channel. The adapter MUST install it only in the fixed prepared-state Chromium browser
  context. The fixed bootstrap, fresh marker
  secret, and Fetch Metadata table above are mandatory; system-wide proxy configuration is
  forbidden. Except for authentication of the exact runtime-control/frame and transient attempt-
  local DevTools configuration, the
  proxy authority/configuration and marker material MUST NOT enter retained evidence, hashes,
  logs, diagnostics, or command output and MUST be wiped on normal, abort, and crash paths.

  Materialization MUST digest-verify and start exactly one repository-owned capture script in its
  authenticated internal supervisor mode, complete the one-use `StudySupervisorRuntimeBootstrap`
  exchange before root mutation, and detach the materializer edge while that sole supervisor
  remains alive. At `capture -- start`, that existing supervisor MUST generate the ordered twenty
  fresh subject tokens and spawn the long-lived study harness, scoring moderator, and three
  adapters; each adapter MUST spawn its own watchdog. For every
  nonautomatic failed workflow the moderator, and no other role, spawns two fresh ephemeral
  reviewer vote-collector processes after failure determination. A token-authenticated hello/challenge protocol over
  the control endpoint MUST keep that supervisor alive continuously from materialization
  through finalize. Every runtime-control message authentication tag MUST cover its exact
  canonical payload. A transient, non-retained HMAC of runtime-control path values MAY be used
  only for channel integrity; evidence commitments and hashes MUST remain path-free. The
  supervisor MAY receive the initial work-root authority only through the authenticated one-use
  `runtime-bootstrap`, then retain work-root and candidate lexical/canonical authority values only
  in process memory and exchange later values only over the authenticated runtime-control channel
  so later clients can resend them and independently stat/hash the
  candidate. It MUST retain in memory the initial work-root identity, start-time candidate
  identity and digest, checkpoint positions, original handoff anchor, the three directly OS-
  observed adapter exits, three adapter-OS-observed authenticated watchdog exit attestations,
  both directly OS-observed harness/moderator exits, and the count of moderator-OS-observed,
  attested distinct clean ephemeral reviewer exits. Apart from the exact transient control-message
  HMAC, the exact `runtime-bootstrap` and `browser-proxy-binding` frames, and their dedicated
  in-memory holders,
  those path values, the HMAC key, and the control token MUST never enter capture-evidence IPC,
  any commitment or hash as raw input bytes, retained files, evidence,
  logs, diagnostics, or command output, and MUST be destroyed at finalize. Instead, path-free
  HMAC work-root and candidate identity commitments MUST be bound into every start, the handoff,
  the continuity witness, and the final seal together with one `controlSessionId`.

  The bilingual contract MUST own the exact canonical control request/response property order.
  Both directions MUST retain `requestId`; responses MUST use the closed `errorCode` enum, and a
  raw control token MUST never be sent. The materialized supervisor MUST generate exactly one
  fresh run-scoped `controlSessionId` and keep it stable through finalize. A `hello` request MUST
  carry null session, challenge, tag, and payload; its response MUST return that stable session ID,
  create only a fresh one-use `challengeId`, and authenticate the response with HMAC. Every later
  direction-separated HMAC MUST cover the exact canonical message bytes with `authenticationTag`
  treated as null, and every challenge and request ID MUST be single-use. The command enum
  MUST be exactly `hello | verify-inputs | start | checkpoint | read-checkpoint |
  anchor-handoff | verify-continuation | stop | finalize-prepare | finalize-commit | abort |
  register-pre-readiness-probe | buffer-pre-readiness-product-event | register-product-probe |
  submit-product-event | close-product-probe`. Finalize-prepare MUST
  perform the supervisor's internal current-binding, continuity, and exit validation, prepare the
  complete witness in supervisor memory while the endpoint remains live, and return literal
  `null`; the continuity key MUST never leave supervisor memory. Only after that succeeds may the
  verifier open a separately authenticated finalize-commit connection. After accepting that
  request, the supervisor MUST begin listener teardown and return the exact
  `StudyContinuityWitness` over the already-open authenticated connection before destroying its
  key material and exiting. The verifier MUST require the complete response followed by EOF and
  prove that a new connection fails, then write and re-read the canonical continuity-witness pair
  followed by the final seal pair.

  Retained paths under the work root MUST be exactly the twenty
  `distributions/participant-NN/` trees, the three fixed
  `capture/streams/<stream-role>.ndjson` ledgers whose lines alternate envelope then safe
  payload, verifier-produced `capture/study-capture-handoff.json` and
  `capture/study-capture-handoff.sha256`, and, only after successful finalize,
  `capture/study-continuity-witness.json`, `capture/study-continuity-witness.sha256`,
  `capture/study-capture-seal.json`, and `capture/study-capture-seal.sha256`. No other retained
  artifact, sidecar, path value, or final runtime-control state is permitted.

  The bilingual evidence contract owns the handoff's exact canonical schema and fixed
  three-role order. It MUST bind the checkpoint request and study run, both frozen study
  digests, `controlSessionId`, both path-free identity commitments, and the recomputed prefix
  identity/sequence/count/root/latest-heartbeat state. The independent verifier alone MUST
  serialize that canonical handoff and companion from the recomputed immutable ledger prefix.
  Each sole writer MUST atomically snapshot its prefix position and monotonic value, then
  immediately continue appending heartbeats and events while verification reads only that
  prefix; the controller MUST NOT accept or serialize the handoff. After writing the handoff,
  the verifier MUST submit its run ID, checkpoint request ID, and exact handoff digest through
  the authenticated supervisor. Each watchdog MUST then serialize exactly one matching
  `handoff-anchor` payload record after its checkpoint sequence and before stop while normal
  appends and heartbeat scheduling continue without pause. Ordinary post-prefix pairs already
  queued when the checkpoint was taken MAY precede that anchor. Continuation MUST validate all
  intervening pairs, the sole matching anchor, and at least one subsequent ordinary heartbeat
  or payload pair on the same uninterrupted chain. Every stop and the final seal MUST bind
  that same digest and MUST report a literal handoff-anchor count of 1 per stream. Replacing the
  handoff and companion with a different internally valid prefix MUST fail continuation and
  finalize even if the replacement companion and later sequence/digest links are recomputed.

  The builder, capture controller, and structurally independent verifier MUST each be one
  self-contained source file whose source may contain only literal static imports of `node:`
  built-ins. They MUST NOT use local or package imports or helpers, dynamic `import()`,
  `require`, `createRequire`, `eval`, `Function`, `vm`, `process.dlopen`, another loader hook,
  or alternate worker/child entry files. The materializer may execute
  only the exact descriptor-bound, digest-verified capture file internally; that file may
  re-execute only itself in the exact modes `supervisor`, `study-harness`, `scoring-moderator`,
  `reviewer-one`, `reviewer-two`, the three named adapters, and the three named watchdogs. The
  product probe remains a distinct import mode, not a child re-execution. Every internal role
  MUST require authenticated inherited parent IPC plus a fresh one-use bootstrap nonce. The T1056 handoff MUST be produced by the
  verifier while all streams remain open. The start response MUST list the six stream processes
  and, in a separate ordered field, exactly the two long-lived orchestrators. `capture -- stop`
  MUST require zero live reviewer process and terminate those eight long-lived internal descendants while
  leaving the supervisor and endpoint alive. Finalize MUST
  independently recompute every envelope and safe payload; verify the commitments, original
  handoff anchor, terminal outcomes, cross-stream matrix, three directly OS-observed adapter exits,
  three adapter-OS-observed authenticated watchdog exit attestations, two directly OS-observed
  orchestrator exits, and the moderator-OS-observed attested equation
  `ephemeralReviewerProcessExitCount == reviewVoteCount`, then
  complete finalize-prepare while the endpoint remains live. Through a separately authenticated
  finalize-commit connection it MUST receive the exact witness after listener teardown begins but
  before supervisor key destruction and exit. It MUST require the complete response, EOF, and
  failed reconnection to prove that the endpoint and runtime-control state are gone, then write and
  re-read the canonical continuity-witness pair followed by the final seal pair. The witness
  MUST bind the control session, both commitments, original handoff digest, the eight long-lived
  exit facts, and the ephemeral reviewer exit count;
  the seal MUST bind that witness digest and handoff digest in addition to the frozen study
  digests and exactly three final stream roots/counts. It MUST also carry the independently
  recomputed ordered aggregate `automaticCriticalIssueCount`, `suspectedWorkflowBlockerCount`,
  `reviewVoteCount`, `reviewDisagreementCount`, `reviewerCriticalIssueCount`,
  `criticalIssueCount`, `zeroCriticalIssueGate` under the equations defined above. Watchdog/capture/supervisor pause, death,
  restart, or identity replacement; endpoint/token/authentication failure; prohibited payload
  field/value or truth-table combination; subject/workflow or role-matrix mismatch; nominal
  scheduler misconfiguration; excessive observed gap; missing, duplicate, or out-of-order
  sequence; chain/payload/count/digest/commitment/anchor mismatch; handoff rewrite; clock
  regression; truncation; premature stop; non-clean/missing child exit; extra/missing role;
  failed independent verification; teardown residue; or missing/mismatched witness or seal MUST
  fail the zero-critical-issue gate. Streams MUST NOT be stitched to hide discontinuity.
  Contract/source-structure, deterministic fake-clock, and real OS-specific
  child-process/control-endpoint integration/security suites MUST cover the phase/env matrix,
  HMAC canonical-message and single-use-challenge rules, script import/entry closure,
  initially-empty candidate-launch slot, post-input digest-bound provisioning, sole audited-bin
  resolution, network/scripts/cache/global/fallback rejection, and teardown absence barrier,
  proxy/probe attach and stripping, correlation-header grammar and role matrix,
  participant/process/outcome cardinality, crashes after each of zero through four accepted
  workflows and exact terminalization of only the missing rows, path/secret non-retention,
  commitment/exit witness,
  alternate-valid-prefix handoff rewrite, endpoint teardown, and missing/mismatched witness or
  seal.
- **SC-007**: The SC-007 manifest MUST contain at least one fixture for every deterministic outcome class—malformed content, binary content, invalid non-NUL UTF-8 replacement decoding, cycle, stale or changed entry, and boundary crossing—and for every propagation class—REST rejection before job acceptance, rejection after accepted REST job execution, automatic-startup read rejection, and another fatal root, traversal, assembly, or serialization rejection. Across 100% of manifested fixtures, invalid non-NUL UTF-8 is processed as readable `utf-8-replaced` text without making the scan partial by itself, other deterministic entry outcomes use only their allowed complete or contracted-partial commit, every thrown or rejected REST-owned attempt commits 0 new or partial results and leaves only the last successfully committed snapshot available with a generic path/content-free Operation Error, and every startup-owned rejection reaches the process top level without a product liveness guarantee. Every accepted explicit rescan rejection retains the last successfully committed snapshot and marks it stale; a pre-acceptance rejection creates no `scanRequestId`, and a failed initial Global enable preserves any pre-existing snapshot state without creating a Global Source or generation. The manifest MUST also exercise a FileHandle close event that confirms closure before its raw close promise rejects, an unconfirmed FileHandle close rejection, an unconfirmed `fs.Dir` close rejection, and a post-acceptance Global-disable drain/close/final-serialization rejection. Event-confirmed closure MUST remain successful without poisoning or propagation; an unconfirmed ordinary close MUST publish no attempt result and propagate to its owning boundary while the process-wide registry blocks later inspection filesystem work; and the accepted-disable case is the sole exception to exposing the prior snapshot: the REST process MUST survive with all inspection data fenced, a retained generic retry/join error, and a restart next step whenever closure cannot be confirmed. No Operation Error or product operational record duplicates customization source values, paths, or raw errors.
- **SC-008**: All four primary workflows can be completed using only a keyboard. In the maintained bilingual WCAG 2.2 AA matrix, the denominator is the nonzero number of Level A and AA success criteria marked applicable to the local browser interface; a non-applicable criterion is excluded only when its row contains the required criterion-specific rationale. An applicable criterion passes only when every stable-ID automated and manual check required by its row has a recorded result and passes in every applicable cell of the closed manual execution matrix. A missing criterion row, required rationale, check ID or mapping, manual cell, frozen environment value, evidence, or result fails the gate. SC-008 passes only when zero applicable criteria fail and the English and Japanese matrices are semantically equivalent; defect severity does not alter this pass/fail rule.
- **SC-009**: The SC-009 manifest MUST contain at least one fixture for every documented initial-release Source Condition Fact row, yielding nonzero coverage for every supported tool and documented product surface, and MUST include at least one documented-condition case and one unavailable-state case. Across 100% of manifested facts, every fact appears under the correct Source, tool, and product surface with the expected documented condition or unavailable state and evidence, while zero facts create a physical or synthetic file, file ID, Source-relative Path, authored source text, comparison target, relationship origin, local or hosted read, or network request.

## Assumptions

- The initial release is a local, single-user inspection session; remote hosting, collaboration, accounts, and durable profiles are outside scope.
- All executable application code in the initial release is JavaScript/TypeScript: the browser runs generated client logic and declarative assets, and all non-browser product code runs on Node.js. Strict manifests, documentation, and license files remain non-executable package data. Contributors and users need no Rust toolchain, native compiler, native addon, platform-specific prebuilt binary, or package-lifecycle/runtime artifact download.
- Inspected Repository and opted-in Global roots are ordinary local paths controlled by the initiating user. Normal concurrent edits are expected and must fail closed when the documented Node.js checks detect a change or report required verification data as unusable. An adversarial local process that races a source root or ancestor or, on a platform without effective `O_NOFOLLOW`, final path component between checks is outside the initial-release threat model because public Node.js APIs do not expose a cross-platform atomic directory-handle-relative open. Same-device mounts and reparse behavior that the platform does not expose through Node.js are also residual limitations. These limitations do not relax link, containment, identity, metadata, result-discard, or diagnostic requirements for detectable or reported-unverifiable cases.
- Product-issued source mutation is measured by mutation-capable filesystem requests and observable source properties, not by operating-system access-time policy. The Inspector never requests access-time changes; an OS-only read-side access-time update is recorded separately and does not establish a product mutation.
- The selected Repository root is the inspection boundary, not proof of the effective working directory used by any coding agent. Selecting a subdirectory through the invocation `cwd` or `--cwd` limits the Repository Source to that subtree; users rerun the command from the intended root or supply that root through `--cwd` to inspect a broader scope.
- Official customization formats can change. Their exact inspection paths, filenames, and extensions will be revalidated and frozen during planning, then published and covered by conformance fixtures. When a versioned release note directly adds behavior that a current general guide's exhaustive list omits, the specific addition remains in scope while the incompatible evidence is retained as `conflict`; unmentioned schema or ordering is not inferred.
- Global inspection covers only the instruction paths in FR-015 through FR-017; additional user-global skills, agents, settings, MCP definitions, plugins, managed configuration, and remote configuration require separate consent and future specification work. This exclusion does not prevent presentation of maintained, non-authorizing Source Condition Facts about documented hosted or runtime behavior; such facts do not inspect or expose remote configuration.
- Source text, displayed declared metadata values, authored relationship targets, and comparison content are presented without credential masking so authored differences remain visible. Environment-variable references in inspected content remain literal and are not resolved; the product has no reveal workflow. Capability authentication is the API access boundary, while the bundled-browser warning acknowledgement is an in-memory presentation invariant reset on each document load and client-data purge and required before every `FileDetail` request or comparison construction. Operational event records contain only fixed codes and opaque IDs; fixed CLI help/version, the one launch-URL line, and fixed startup warnings are presentation output. Authenticated session diagnostics are a separate product surface and may carry only the minimum actionable location fields.
- The inspector may perform syntax-only parsing, exact literal extraction, mechanical typed decoding, frozen-catalog classification, and projection of documented structural order, scope, condition, selection, and reference relationships. It does not interpret natural-language meaning, determine correctness, effectiveness, compliance, or quality, rank content, or advise remediation; a parse diagnostic is a descriptive failure, not a validation result.
- File, collection, parser, transport, queue, time, and concurrency capacity is inherited from Node.js, the parser, the operating system, the filesystem, the browser, and the execution environment. The Inspector defines no numeric capacity ceiling and never inspects a thrown or rejected operation to classify its cause or to classify customization content as valid or invalid.
- Public Node.js filesystem promises may not be force-cancellable. Disable, shutdown, supersession, or any thrown or rejected operation revokes publication authority and discards late results; a deterministic, non-throwing entry-local outcome eligible for FR-028 does not by itself revoke the attempt's publication authority. The product does not promise physical cancellation of kernel I/O, process survival after an uncaught startup-owned error, or control over runtime-owned local uncaught-error output.
- Comparisons are limited to two distinct customization files with different physical file IDs at a time in the initial release and do not merge or edit content.
- Product documentation and the supported matrix will use official vendor documentation as the normative external dependency; undocumented behavior will remain explicitly uncertain.
