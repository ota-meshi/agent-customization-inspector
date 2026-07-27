# Accessibility Acceptance Contract

[日本語](accessibility-acceptance.ja.md)

**Normative for**: QR-004 and SC-008 acceptance for the complete local browser interface

**Reference**: [Web Content Accessibility Guidelines (WCAG) 2.2](https://www.w3.org/TR/WCAG22/), Levels A and AA

## Decision rule

The release candidate MUST evaluate every WCAG 2.2 Level A and AA success criterion in
the matrix below across all four primary workflows and every responsive variation used by
those workflows. Each row has exactly one frozen applicability state:

- **Applicable**: the named automated, contract, and/or manual evidence MUST pass.
- **Not applicable**: the stated product fact MUST be rechecked against the complete
  release diff and built package. If that fact is no longer true, the row becomes
  Applicable and receives passing evidence before release.

SC-008 passes only when every Applicable row passes, every Not-applicable rationale remains
true, all four primary workflows complete using only a keyboard, and the result records a
nonzero denominator equal to the number of Applicable rows. All 55 Level A/AA criteria
remain in the inventory; a Not-applicable row is excluded from the denominator only while
its criterion-specific rationale remains true. The current frozen denominator is 38; any
applicability-state change MUST update that number and both language versions together.
There is no separate “critical defect”
escape or severity threshold: one failed Applicable criterion, one unsupported
Not-applicable claim, one untested responsive variation, or one incomplete keyboard
workflow fails SC-008.

## Stable check IDs and execution locations

Every row names its complete required check set. The criterion number is part of each stable
ID, so an ID cannot be reused by another criterion.

| ID form | Exact execution location and record rule |
|---|---|
| `AUTO-{criterion}` | A deterministic test whose title contains the complete ID in `tests/e2e/accessibility.spec.ts`. The test runs against the packed release candidate in all three Playwright 1.61.1 projects and asserts the row's product-specific acceptance; a supporting unit/contract test may add evidence but cannot replace this test. Record the ID, all three project results, artifact path, and pass/fail in the WCAG results table in `validation.md`. |
| `MANUAL-{criterion}` | The procedure is the row's product-specific acceptance, executed in every applicable cell of the closed manual matrix below. Record one result for every `(ID, platform, viewport, mode, scenario, input)` cell in the manual-cell table in `validation.md`, with evidence and reviewer. |
| `REVIEW-{criterion}` | Against the complete release diff, packed-file manifest, and rendered packed interface, recheck that the row's stated absent precondition remains absent. Record the ID, examined diff/manifest/build identifiers, reviewer, rationale, evidence, and pass/fail in the WCAG results table in `validation.md`. |

Rows that name both `AUTO-*` and `MANUAL-*` require both. Automated results are evidence,
not a substitute for required manual checks. A tool report that marks a rule “inapplicable”
does not establish a Not-applicable row.

## WCAG 2.2 Level A/AA applicability matrix

| Criterion | Level | State | Required checks | Frozen product-specific acceptance |
|---|---:|---|---|---|
| 1.1.1 Non-text Content | A | Applicable | `AUTO-1.1.1`; `MANUAL-1.1.1` | Every icon, status glyph, and non-text control has an equivalent accessible name; decorative content is hidden from assistive technology. |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Not applicable | `REVIEW-1.2.1` | The product ships and renders no prerecorded audio or video. Inspected markup/media references remain inert text and are never loaded. |
| 1.2.2 Captions (Prerecorded) | A | Not applicable | `REVIEW-1.2.2` | The product ships and renders no prerecorded synchronized media. |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Not applicable | `REVIEW-1.2.3` | The product ships and renders no prerecorded synchronized media. |
| 1.2.4 Captions (Live) | AA | Not applicable | `REVIEW-1.2.4` | The product provides no live audio or video. |
| 1.2.5 Audio Description (Prerecorded) | AA | Not applicable | `REVIEW-1.2.5` | The product ships and renders no prerecorded video. |
| 1.3.1 Info and Relationships | A | Applicable | `AUTO-1.3.1`; `MANUAL-1.3.1` | Headings, landmarks, lists, tables, labels, diagnostics, source metadata, and comparison relationships are programmatically represented. |
| 1.3.2 Meaningful Sequence | A | Applicable | `AUTO-1.3.2`; `MANUAL-1.3.2` | DOM, focus, reading, narrow-layout, and diff-view order preserve the intended meaning. |
| 1.3.3 Sensory Characteristics | A | Applicable | `MANUAL-1.3.3` | Instructions and next steps do not rely only on shape, color, position, orientation, or sound. |
| 1.3.4 Orientation | AA | Applicable | `AUTO-1.3.4`; `MANUAL-1.3.4` | Every primary workflow operates in portrait and landscape without an orientation lock. |
| 1.3.5 Identify Input Purpose | AA | Not applicable | `REVIEW-1.3.5` | No field collects information about the user from the WCAG input-purpose taxonomy. |
| 1.4.1 Use of Color | A | Applicable | `AUTO-1.4.1`; `MANUAL-1.4.1` | Tool, state, severity, selection, and diff meaning always have a non-color indicator. |
| 1.4.2 Audio Control | A | Not applicable | `REVIEW-1.4.2` | The product emits no audio. |
| 1.4.3 Contrast (Minimum) | AA | Applicable | `AUTO-1.4.3`; `MANUAL-1.4.3` | Text and text-equivalent contrast passes in light, dark, and forced-colors presentations. |
| 1.4.4 Resize Text | AA | Applicable | `AUTO-1.4.4`; `MANUAL-1.4.4` | Text remains readable and operable at 200% zoom without loss of content or function. |
| 1.4.5 Images of Text | AA | Not applicable | `REVIEW-1.4.5` | The product ships no image whose purpose is to present text; inspected images are never loaded. |
| 1.4.10 Reflow | AA | Applicable | `AUTO-1.4.10`; `MANUAL-1.4.10` | Primary workflows reflow at the WCAG reference width without two-dimensional page scrolling, except an allowed essential source-code region that has an accessible alternative/inline layout. |
| 1.4.11 Non-text Contrast | AA | Applicable | `AUTO-1.4.11`; `MANUAL-1.4.11` | Focus indicators, controls, selected states, boundaries, and meaningful graphics meet non-text contrast. |
| 1.4.12 Text Spacing | AA | Applicable | `AUTO-1.4.12`; `MANUAL-1.4.12` | Required text-spacing overrides cause no clipped, hidden, or overlapping content and no loss of function. |
| 1.4.13 Content on Hover or Focus | AA | Applicable | `AUTO-1.4.13`; `MANUAL-1.4.13` | Any tooltip, popover, or hover/focus content is dismissible, hoverable, and persistent as required; otherwise the release proves none exists. |
| 2.1.1 Keyboard | A | Applicable | `AUTO-2.1.1`; `MANUAL-2.1.1` | Every operation in all four primary workflows, including Monaco source/diff access, works from the keyboard. |
| 2.1.2 No Keyboard Trap | A | Applicable | `AUTO-2.1.2`; `MANUAL-2.1.2` | Focus can enter and leave every control, dialog, editor, error, and consent state using standard keyboard operation. |
| 2.1.4 Character Key Shortcuts | A | Not applicable | `REVIEW-2.1.4` | No single printable character activates an application command; read-only editor defaults are checked for the same property. |
| 2.2.1 Timing Adjustable | A | Not applicable | `REVIEW-2.2.1` | No visible user task has a time limit. Network settlement and terminal session reset do not expire a visible interaction, and restarting the inspector restores an operable fresh session without requiring completion within a fixed time. |
| 2.2.2 Pause, Stop, Hide | A | Applicable | `AUTO-2.2.2`; `MANUAL-2.2.2` | Automatically started scan/status updates presented in parallel with other content can be paused, stopped, hidden, or changed to a user-controlled update frequency. A documented essential exception must identify the exact update, prove why no alternative satisfies its purpose, and receive explicit release approval. |
| 2.3.1 Three Flashes or Below Threshold | A | Not applicable | `REVIEW-2.3.1` | No shipped animation or state transition flashes; inspected content never renders active media or animation. |
| 2.4.1 Bypass Blocks | A | Applicable | `AUTO-2.4.1`; `MANUAL-2.4.1` | Keyboard and assistive-technology users can bypass repeated navigation and reach the main workflow content. |
| 2.4.2 Page Titled | A | Applicable | `AUTO-2.4.2`; `MANUAL-2.4.2` | Every client route exposes a descriptive, state-appropriate document title. |
| 2.4.3 Focus Order | A | Applicable | `AUTO-2.4.3`; `MANUAL-2.4.3` | Focus order remains logical through route changes, warning gates, rescans, Global commits, disable, errors, and generation replacement. |
| 2.4.4 Link Purpose (In Context) | A | Applicable | `AUTO-2.4.4`; `MANUAL-2.4.4` | Every link or link-like navigation exposes its purpose from accessible text and context. Inspected links remain inert text. |
| 2.4.5 Multiple Ways | AA | Not applicable | `REVIEW-2.4.5` | The root inventory is the only standalone page; file, comparison, and consent routes are results of or steps in the single local inspection process. If a new standalone page appears, this row becomes Applicable. |
| 2.4.6 Headings and Labels | AA | Applicable | `AUTO-2.4.6`; `MANUAL-2.4.6` | Headings and labels describe topic or purpose, including filters, source facts, diagnostics, warning, comparison, and Global controls. |
| 2.4.7 Focus Visible | AA | Applicable | `AUTO-2.4.7`; `MANUAL-2.4.7` | Every keyboard-operable element has a visible focus indicator in all supported visual modes. |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Applicable | `AUTO-2.4.11`; `MANUAL-2.4.11` | Sticky regions, dialogs, Monaco surfaces, progress, and responsive layouts never entirely obscure the focused component. |
| 2.5.1 Pointer Gestures | A | Not applicable | `REVIEW-2.5.1` | No function requires a multipoint or path-based pointer gesture. |
| 2.5.2 Pointer Cancellation | A | Applicable | `AUTO-2.5.2`; `MANUAL-2.5.2` | Pointer actions do not complete on down-event without a cancellation/undo-safe equivalent. |
| 2.5.3 Label in Name | A | Applicable | `AUTO-2.5.3`; `MANUAL-2.5.3` | A control's visible label is contained in its accessible name. |
| 2.5.4 Motion Actuation | A | Not applicable | `REVIEW-2.5.4` | No function uses device or user motion as input. |
| 2.5.7 Dragging Movements | AA | Not applicable | `REVIEW-2.5.7` | No application function requires dragging; selection, comparison, filtering, editor navigation, and consent have non-drag controls. |
| 2.5.8 Target Size (Minimum) | AA | Applicable | `AUTO-2.5.8`; `MANUAL-2.5.8` | Pointer targets meet the minimum size or one of the criterion's explicit exceptions, recorded per exception. |
| 3.1.1 Language of Page | A | Applicable | `AUTO-3.1.1` | The shell sets the primary page language to the one language it ships (`lang="en"`), never a negotiated value. |
| 3.1.2 Language of Parts | AA | Applicable | `MANUAL-3.1.2` | Human-language changes are identified where required; code, paths, authored source, product names, and technical identifiers use the criterion's applicable treatment. |
| 3.2.1 On Focus | A | Applicable | `AUTO-3.2.1`; `MANUAL-3.2.1` | Receiving focus alone never changes context. |
| 3.2.2 On Input | A | Applicable | `AUTO-3.2.2`; `MANUAL-3.2.2` | Input changes have predictable effects; any context change is described before use. |
| 3.2.3 Consistent Navigation | AA | Applicable | `AUTO-3.2.3`; `MANUAL-3.2.3` | Repeated navigation remains in the same relative order for the same responsive variation. |
| 3.2.4 Consistent Identification | AA | Applicable | `AUTO-3.2.4`; `MANUAL-3.2.4` | Components with the same function use consistent visible and accessible identification. |
| 3.2.6 Consistent Help | A | Applicable | `MANUAL-3.2.6` | Repeated next-step/help mechanisms, when present, occur in the same relative order for the same responsive variation. |
| 3.3.1 Error Identification | A | Applicable | `AUTO-3.3.1`; `MANUAL-3.3.1` | Every detected input or workflow error is identified in text and associated with the affected control/state. |
| 3.3.2 Labels or Instructions | A | Applicable | `AUTO-3.3.2`; `MANUAL-3.3.2` | Controls and required confirmations have sufficient labels and instructions before input. |
| 3.3.3 Error Suggestion | AA | Applicable | `AUTO-3.3.3`; `MANUAL-3.3.3` | When a safe correction is known, the diagnostic or error provides a practical next step. |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Not applicable | `REVIEW-3.3.4` | The product creates no legal/financial commitment and does not modify or delete durable user-controlled data; Global disable removes only transient inspection state and is recoverable by explicit re-enable/rescan. |
| 3.3.7 Redundant Entry | A | Not applicable | `REVIEW-3.3.7` | The interface does not ask the user to re-enter previously supplied information; acknowledgements and confirmations are actions, not data entry. |
| 3.3.8 Accessible Authentication (Minimum) | AA | Applicable | `AUTO-3.3.8`; `MANUAL-3.3.8` | Opening/reopening the printed local session URL requires no authentication step, cognitive-function test, transcription, puzzle, or memorization; the printed-URL manual fallback remains available. |
| 4.1.2 Name, Role, Value | A | Applicable | `AUTO-4.1.2`; `MANUAL-4.1.2` | Custom controls, Monaco integration, state, properties, and changes expose correct programmatic name, role, and value. |
| 4.1.3 Status Messages | AA | Applicable | `AUTO-4.1.3`; `MANUAL-4.1.3` | Scan, rescan, stale, error, comparison, Global, and session-ended status changes are announced without forcing focus. |

## Closed manual execution matrix

Manual acceptance uses the packed release candidate, never a development server. Before
execution, freeze the tarball digest, Playwright 1.61.1 package version and bundled browser
revisions, supported OS version, actual browser/engine version, assistive-technology version,
OS locale pack, and display scaling in `validation.md`. The UI language is not a matrix
axis: the product ships one UI language, so the OS locale pack is
frozen as an environment fact rather than executed as a dimension. The three required
platform cells are:

| Platform ID | Supported OS, engine, and assistive technology |
|---|---|
| `P1` | macOS 15 arm64; Playwright-bundled WebKit revision; VoiceOver. |
| `P2` | Windows Server 2025 x64; Playwright-bundled Chromium revision; NVDA. |
| `P3` | Ubuntu 24.04 x64; Playwright-bundled Firefox revision; Orca. |

Record the resolved OS build, browser/engine revision, and AT version before the first
check; they then form the frozen release baseline. A change to any frozen version, revision,
tarball byte, matrix definition, or accessibility-affecting source reruns every manual
check.

Every `MANUAL-*` ID is executed over the Cartesian product of the following closed sets:

- **Viewport/profile**: `V1` 1440×900 CSS px landscape, 100% zoom, default spacing;
  `V2` 390×844 CSS px portrait, 100%, default spacing; `V3` 844×390 CSS px landscape,
  100%, default spacing; `V4` 1280×720 CSS px landscape, 200% browser zoom, default
  spacing; `V5` 1280×720 CSS px landscape, 100% zoom, with line height `1.5`, paragraph
  spacing `2em`, letter spacing `0.12em`, and word spacing `0.16em` applied simultaneously.
- **UI mode**: `M1` light, no forced colors, normal motion; `M2` dark, no forced colors,
  reduced motion; `M3` native OS forced colors, reduced motion. `P1/M3` and `P3/M3` are the
  only predefined platform-mode N/A cells and each requires a recorded rationale that the
  named supported OS has no native forced-colors mode; neither is silently omitted.
- **Workflow/state scenario**: `S1` Repository discovery with populated inventory, filter,
  and tool/source/kind facts; `S2` Repository empty state, a deterministic returned source
  Diagnostic, explicit rescan, and a separate thrown/rejected rescan shown as the failed
  request's error while the prior snapshot remains stale; `S3` file inspection before and after sensitive-content acknowledgement,
  including Monaco source access; `S4` file diagnostic and actionable next step; `S5`
  two-file comparison, Monaco accessible diff, and narrow inline alternative; `S6` stale or
  removed comparison after a compared file's owning sequence commits its replacement
  generation, plus a comparison that stays valid when a sequence owning neither compared
  file commits; `S7` Global disabled, selector-free
  fixed-three-tool session-wide consent pending, one-batch admitted-subset scan complete with
  exactly one atomic Global generation, whole-transaction abort on an unexpected failure, and
  explicit disable covering the pre-request full client-data purge, greater content epoch,
  non-null all-inspection-data fence, control-only draining/failed/retry/join state, restart
  next step for unconfirmed cleanup, terminal recovery, the `remove-active-state` discard of
  the entire Global sequence with the Repository generation unchanged, and the
  unpublished-initial-enable-only `cleanup-only` case that changes no committed state; `S8` scan/status updates presented in
  parallel, the purge-before-render transition on a greater epoch or non-null fence,
  Resume inspection only with a null disable fence,
  pause/stop/hide or user-frequency control, error recovery, and focus restoration.
- **Input profile**: `I1` keyboard only, including AT browse/virtual and focus modes; `I2`
  primary pointer through click activation and cancellation; `I3` mouse hover followed by
  keyboard focus, dismissal, pointer transfer, and persistence checks.

The cell key is
`(MANUAL-ID, P#, V#, M#, S#, I#)`. The closed product contains
`3 × 5 × 3 × 8 × 3 = 1,080` keyed cells per `MANUAL-*` ID, including cells that receive
an explicit N/A result. Execute every applicable cell; sampling, rotating
platforms, or substituting automated evidence is prohibited. If a criterion cannot apply to
a particular cell because its triggering component or OS capability is objectively absent,
record that individual cell as N/A with the exact technical rationale and evidence. Blank,
implicit, or group-level N/A entries fail the gate. The expected observation for every
executed cell is the corresponding matrix row's product-specific acceptance.

## Required execution record

`validation.md` and `validation.ja.md` MUST record, for each of the 55 rows, the frozen
state, complete required-check ID set, result and evidence location for each ID, row
pass/fail, reviewer, and any Not-applicable revalidation note. They MUST contain one record
for every manual matrix cell, keyed as defined above, with result, evidence, N/A rationale
when permitted, and reviewer. They also record the nonzero Applicable-row denominator, zero
failed Applicable criteria, and all four keyboard workflow outcomes. The two records remain
semantically equivalent and contain no inspected source values.
