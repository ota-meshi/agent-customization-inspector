# Specification Quality Checklist: Inspect Agent Customizations

[日本語](requirements.ja.md)

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-07-15
**Feature**: [Inspect Agent Customizations specification](../spec.md)

## Content Quality

- [x] Implementation details are absent except for the explicit Node.js-only constraint and minimum public-API behavior needed to define its security guarantee, environment-owned resource behavior and residual risk, plus request/generation identity and state-lifecycle terms needed to make scan completion and US4 result stability objective
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No `[NEEDS CLARIFICATION]` markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] SC-002 uses a versioned, published reference profile, a fixture digest, and an objective explicit-rescan protocol that correlates status and the committed inventory generation to one `scanRequestId` after the automatic initial scan
- [x] Success criteria are technology-agnostic
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified
- [x] Origin-file-less Source Condition Facts are defined and covered by user scenarios, requirements, entities, edge cases, and a measurable outcome without granting file or read authority
- [x] US4 requires every successful initial or retry Global Source commit to preserve `Source.sourceId` and semantic Repository inventory/source content while advancing the generation, rekeying generation-owned IDs, and invalidating prior-generation detail, comparison, and editor state; all-rejected attempts create no commit
- [x] The closed Diagnostic union defines exact location invariants: file scope requires a coherent `sourceId`/`fileId`/`sourceRelativePath` tuple, source scope requires only `sourceId` and forbids file/path, session scope forbids all three, and scope is orthogonal to generation-versus-lifecycle ownership
- [x] Product-issued mutation is defined by prohibited mutation-capable requests and observable source properties, with operating-system-only access-time changes recorded separately as neither failure nor proof
- [x] FR-032 defines the allowed structural-projection boundary and prohibits validation, semantic interpretation/ranking, verdicts, and remediation advice across every product and documentation surface
- [x] FR-029 and FR-042 prohibit product-defined numeric resource-validation limits, revoke and discard late work, and close the Global-disable purge/epoch/fence/recovery lifecycle; failures are reported as ordinary errors (FR-040/FR-041 were removed 2026-07-22) while per-file isolation and stale-snapshot semantics stay in FR-028/FR-030
- [x] File size and item count never determine customization validity, correctness, compliance, or lint findings; capacity is inherited from Node.js, parsers, the operating system, the filesystem, the browser, and the execution environment
- [x] The closed scan-publication table permits partial publication only for file-confined outcomes after complete traversal; any other failure commits nothing, reports the failure as an ordinary error, and retains the prior committed snapshot
- [x] The byte-decoding table covers NUL/binary, valid UTF-8, one recorded and removed leading BOM, and one-pass replacement decoding of invalid non-NUL UTF-8 as complete `utf-8-replaced` garbled text, without alternate decoding or a product-defined byte, line, or item ceiling
- [x] The Customization File entity exposes complete source text for `utf-8` and `utf-8-replaced` reads, forbids it for binary outcomes, and represents an unreadable file as a diagnostic-only item that does not affect other files
- [x] US3 is independently testable with two distinct readable Repository files before Global work and rejects the same file in both inputs, while US4 separately covers a Repository-to-Global comparison without merging Source-relative namespaces
- [x] SC-003, SC-004, SC-005, SC-007, and SC-009 use a frozen versioned release-evidence fixture manifest with stable case IDs, per-fixture digests, nonzero required classes, exact executed-case records, paired automated manifest-version transition tests for denominator-semantic changes, a separate T1062 human-review record, both fixture and canonical digest updates for fixture-byte-only changes, and mandatory failure for missing, omitted, duplicate, or mismatched evidence
- [x] Every bundled-browser `FileDetail` request and comparison construction shares one acknowledgement gate covering source text, declared metadata, authored relationship targets, and both comparison sides; ordinary route, Source, and generation cleanup remains scoped, while Global disable is the explicit full-session-purge exception before request and again on greater-epoch or non-null-fence observation
- [x] The closed Global-root table distinguishes absent/default, empty, invalid, relative, and eligible roots including those outside the ordinary home, records a missing or unreadable consented root as absent or failed without blocking the others, and admits readable roots into one atomic batch commit
- [x] Repository-root selection is closed to captured `process.cwd()` or one resolved `--cwd` value, performs no `chdir`, rejects invalid option shapes before session creation, and creates exactly one generation-0 Repository Source at bootstrap
- [x] One selector-free session-wide Global action binds the fixed Copilot/Claude/Codex preview, evaluates all three entries, excludes a missing or unreadable root without blocking the others, and publishes every admitted Source in one batch and one atomic generation; an unexpected failure aborts the whole transaction
- [x] Active-consent Global retry reuses the frozen preview and fixed tuple, derives the complete retryable target set server-side only after pending work empties, preserves existing Sources and the prior snapshot, creates no request/job/generation for an all-rejected retry, and otherwise publishes one request-correlated atomic batch
- [x] Filesystem operations use raw entry names while public Source-relative Paths use NFC display segments; hard links are ordinary files, and symbolic links are read through their targets, with a broken link yielding a per-file diagnostic
- [x] Traversal is ordinary and reads only allowlisted paths: a problem confined to one file yields that file's diagnostic without affecting other files, and the specification adds no adversarial-input machinery (FR-019)
- [x] The Codex Global override fallback defines emptiness by one optional leading-BOM removal followed by `String.prototype.trim()`, treats retained `U+FFFD` as non-whitespace, and permits fallback only for safely read empty content or an absent initial target
- [x] Presentation Allowlist freeze is verification-only; any semantic membership, source-form, extractor-applicability, or relationship-kind change stops dependent implementation and requires synchronized design plus regenerated plan/tasks
- [x] QR-005 closes `documentationStatus` to `documented | partially-documented | unknown | conflict`, keeps duplicate-free lifecycle qualifiers in `preview`, `experimental`, `deprecated` order, defines empty qualifiers as no lifecycle claim rather than `stable`, reserves `documentation-conflict` for `ConditionFact.status`, and requires provenance/relationship `EvidenceAssessment[]` to preserve every subject record without lossy aggregation
- [x] The fixed browser helper receives no inspection-derived path or content; only a closed ambient platform-key set may be copied directly, and lexical equality with a Source root neither changes provenance nor grants authority or selects a handler
- [x] SC-008 defines a bilingual all-Level-A-and-AA applicability matrix, criterion-specific non-applicability rationale, automated/manual check mappings, a nonzero applicable-criterion denominator, and a zero-failure pass rule
- [x] Every applicable SC-008 row has stable criterion-specific check IDs and an expected observation, and the closed manual matrix fixes both locales, release/environment versions, responsive and visual profiles, workflow states, and input profiles with no unrecorded sampling
- [x] WCAG 2.2 criterion 2.2.2 treats parallel automatically updating scan/status information as applicable and requires a tested pause/stop/hide or user-frequency mechanism unless a criterion-compliant essential exception is proved

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] The first-time study states its necessity, accountable ownership, recruitment and compensation funding, participant support, privacy, accessibility, defined review protocol, and rerun trigger without making ordinary contributors responsible
- [x] No implementation details leak into the specification beyond the intentional Node.js-only constraint and public-API checks needed to make security and cancellation limitations testable, plus request/generation identity, mutation measurement, and state-lifecycle terms needed to make scan completion and US4 result stability testable

## Notes

- Validation iteration 3 passed all items on 2026-07-15 after making inert browser rendering,
  tool-specific instruction-selection rules, surface-separated behavior tables, and
  official-source traceability explicit.
- Validation iteration 4 passed on 2026-07-16 after recording the user-required Node.js-only
  runtime constraint. The specification names the relevant public-API limitation because
  omitting it would overstate filesystem containment; detailed algorithms and data structures
  remain in the plan and research artifacts.
- Validation iteration 5 on 2026-07-17 recorded five clarifications: separate tool-specific
  Global Sources, exact unmasked value presentation without environment substitution,
  fatal-rescan rollback, Source-relative path terminology, and use of the
  then-current unpublished performance-environment proposal, later superseded in iteration 7.
  Three checklist items were reopened because SC-002 still lacks a
  fixed sampling and aggregation protocol, while SC-001 and SC-006 still lack a participant
  population and study protocol. A follow-up clarification pass is required before these
  success criteria can serve as release gates.
- Validation iteration 6 passed all items on 2026-07-19 after distinguishing the one fixed
  startup browser-launch helper from customization-derived child processes, closing the
  FR-007 metadata/relationship presentation allowlist, adding the exact sub-100-millisecond
  interaction protocol to SC-002, and marking the specification ready for implementation.
  The sampling, participant, and cross-workflow protocols identified in iteration 5 were
  treated as fully specified at that iteration, and no clarification marker remained.
- Validation iteration 7 passed all items on 2026-07-19 after replacing the mutable,
  unpublished SC-002 environment with a versioned published profile and objective status
  stop condition; assigning the 20-person release study, funding, support, privacy, and
  accessibility obligations to the maintainer team while bounding critical-issue review;
  and specifying origin-file-less Source Condition Facts across scenarios, requirements,
  entities, edge cases, verification, and SC-009.
- Validation iteration 8 passed all items on 2026-07-19 after limiting comparison eligibility
  to readable discovered customization files, keeping binary and other diagnostic-only items
  available only for diagnostic review, and making that selection boundary explicit before
  task regeneration.
- Validation iteration 9 passed all items on 2026-07-19 after defining each FR-007
  presentation file type as an exact `(tool, kind)` plus an admitted source form, making
  exact source-form extractor applicability a second eligibility gate, and explicitly adding
  Claude marketplace catalogs to the supported initial-release families.
- Validation iteration 10 passed all items on 2026-07-19 after rechecking the generated task
  history and restoring the original family-vertical order: each family's discovery and
  complete inert detail precede its comparison, families retain the exact SKILL →
  Instructions → MCP → Rules → Commands → Copilot Prompts → Custom Agents →
  Configuration/Settings order, and Global inspection remains after Repository acceptance.
- Validation iteration 11 passed all items on 2026-07-19 after defining US4's Repository
  result stability semantically while requiring successful Global Source commits to advance
  the generation, rekey generation-owned IDs, and invalidate prior-generation state; defining exclusive
  file, source, and session Diagnostic location invariants; and replacing SC-008's undefined
  critical-defect threshold with a bilingual all-Level-A-and-AA matrix and a nonzero-denominator,
  zero-failed-applicable-criteria gate.
- Validation iteration 12 passed all items on 2026-07-19 after assigning stable check IDs
  and expected observations to every WCAG row, closing the complete manual execution matrix,
  and correcting 2.2.2 so parallel automatically updating status requires its own control.
- Validation iteration 13 passed all items on 2026-07-19 after reconciling deliberate
  capability-authenticated complete-content inspection with path/content-free operational
  logs; defining revocation and late cleanup; binding SC-002 to
  an explicit rescan request and its committed generation; defining product-issued mutation
  independently of OS-only access-time effects; and applying the FR-032 non-analysis boundary
  across every product and documentation surface.
- Validation iteration 14 passed all items on 2026-07-19 after removing product-defined
  file-size, count, parser, transport, queue, time, and concurrency ceilings. Capacity is
  inherited from the supported engine and environment and never becomes a customization
  validation, correctness/compliance implication, or lint finding. The 2026-07-20 refinement
  supersedes domain classification of thrown/rejected failures with FR-041 propagation.
- Validation iteration 15 passed all items on 2026-07-19 after closing Global-root admission,
  verified-byte decoding, and scan-publication outcomes. The 2026-07-20 refinement limits
  contracted partial commits to FR-028-eligible deterministic non-throwing outcomes after
  complete traversal, makes invalid non-NUL UTF-8 complete replacement-decoded text, and sends
  all non-carveout throws/rejections to the owning outer boundary without a domain result.
- Validation iteration 16 passed all items on 2026-07-19 after making US3 independently
  Repository-scoped and moving cross-Source comparison coverage to US4; excluding deterministic
  entry-local non-throwing failures from abort-attempt wording; making source text conditional on
  a verified non-binary UTF-8 replacement decode; freezing SC-003/004/005/007/009 denominators with a versioned,
  digest-bound release-evidence manifest; and closing the authored-value acknowledgement and
  client-data-purge scope.
- Validation iteration 17 passed all items on 2026-07-20 after closing selected-root and
  `--cwd` behavior, non-authorizing generation-0 Repository Source creation, selector-free
  fixed-three-tool Global batching, exact structural-`lstat` `ENOENT` handling, REST versus
  startup Operation Error ownership, as-is garbled-text UTF-8 replacement, raw/NFC and hard-link
  identity rules, exact Codex emptiness, and the verification-only Presentation Allowlist gate.
- Validation iteration 18 passed all items on 2026-07-20 after separating documentation
  completeness from lifecycle qualifiers, reserving `documentation-conflict` for runtime
  condition projection, and requiring deterministic subject-by-subject evidence assessments
  on provenance and relationships.
- Validation iteration 19 passed all items on 2026-07-20 after making Global disable a
  pre-request full client-data purge with an epoch-bound all-inspection-data fence and
  control-only failed-barrier recovery; completing directory-enumeration and hard-link race
  rules; and defining one process-wide confirmed-close registry with restart fallback.
- Validation iteration 20 passed all items on 2026-07-20 after separating fixed package-owned
  integrity reads from zero-I/O root selection, making preview construction failures generic
  pre-acceptance Operation Errors with no preview state, restoring mandatory explicit-rescan
  stale overlays, and assigning the outcome manifest, digest, and contract test to T1041.
- Validation iteration 21 passed all items on 2026-07-20 after making repository-root task
  paths explicit with `./`; replacing timed heartbeat, timeout, and memory-lease liveness with
  observable lifecycle-triggered checks; and defining the FR-024/FR-028 publication taxonomy
  so only a confirmed-close candidate-local returned outcome can retain a diagnostic-only
  record while root, directory-guard, and unconfirmed-close cases abort the Source attempt.
- Validation iteration 22 passed all items on 2026-07-20 after removing the remaining lease
  rationale and fixture wording from research; propagating the exact publication taxonomy
  through research, verification tables, and task notes; and assigning all four lifecycle
  triggers, non-trigger tests, single-flight coordination, stale-settlement rejection, and
  timer-free implementation ownership to T042 and T049.
- Validation iteration 23 passed all items on 2026-07-20 after restoring the omitted binary,
  BOM, typed-literal, malformed-extraction, tree-token UTF-16 range, environment-owned parser
  capacity, and source-value-free extraction obligations in Japanese T075 and T321; a fresh
  context-isolated analysis then confirmed zero critical or high findings.
- Validation iteration 24 passed all items on 2026-07-21 after specifying the complete
  server-derived active-consent Global retry set and request/job/state semantics, adding the
  missing `entry-disappeared` table row, distinguishing successful and failed Global disable,
  closing SC-001 manual-fallback scoring, and requiring two distinct physical file IDs for
  comparison.
- Validation iteration 25 passed all items on 2026-07-22 after the trusted-workspace
  re-scope (spec Clarifications Session 2026-07-22) replaced the adversarial-file model:
  ordinary traversal with per-file diagnostics superseded the TOCTOU checkpoint, race,
  hard-link grouping, and carve-out requirements; the public partial status replaced
  `contracted-partial`; and the affected checklist rows above were restated against the
  rewritten requirements.
- Validation iteration 26 passed all items on 2026-07-22 after the owner adopted the
  devframe host with authentication disabled (config-inspector parity): the loopback
  binding became the sole session protection (constitution v3.0.0), the per-session
  token, Origin checks, hand-written router, and static-assets manifest were removed,
  and FR-022/FR-027/QR-002/QR-003/SC-004/SC-007 were restated for the devframe
  static-plus-RPC transport.
- Validation iteration 27 passed all items on 2026-07-22 after the owner removed FR-040
  and FR-041: the product has no telemetry, its output is read by the file owner, and the
  unauthenticated session API already serves complete content, so the log-content rules
  and the generic OperationError envelope protected nothing; errors are now reported
  ordinarily and the affected rows above were restated.
- The exact repository inspection path allowlist is intentionally frozen during planning after revalidation against official vendor specifications; the specification fixes the supported product families and forbids Global-scope expansion without a specification change.
- The temporary local product-description file is neither linked nor required by this specification.
