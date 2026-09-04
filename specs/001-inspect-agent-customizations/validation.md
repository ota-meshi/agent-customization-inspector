# Validation Record

[日本語](validation.ja.md)

This file records what each review and gate run examined and concluded. It is a record of
judgments and results, not a second copy of the contracts: where a value is normative it
lives in the contract that owns it, and this file says who looked at it, when, what they
decided, and — for a criterion measured by running something — what the run reported.

## Official-source checking

`pnpm run check:official-sources -- --network` is the maintainer-only command that checks
the [official-source registry](contracts/official-sources.md). It is registered outside
every build, start, test, and CI chain, and it refuses to run without the explicit
`--network` opt-in, because it is the only command in this repository that makes an
outbound request.

**What the command decides.** For each of the registry's 52 records it retrieves the
recorded URL completely, requires a direct `200` from the record's own `officialHost` with
no redirect followed, and resolves each of the 193 cited sections against the served bytes:
as exactly one served `<h1>`–`<h4>`, or — when no served heading carries it — as the one
served fragment every table-of-contents link bearing its text points at. Anything else is
reported as observed: `missing`, `ambiguous-heading`, or `ambiguous-anchor`. A request that
throws is reported as a request that did not complete.

**What the command does not decide.** What a vanished heading means, and whether the cited
sections still establish the paraphrase a citing record maintains. Both are readings rather
than lookups, and both stay with the reviewer;
[AGENTS.md](../../AGENTS.md) § Official-source verification policy states the split. The
registry keeps no digest of page text: a section whose heading survived over rewritten text
is found by that reading, not by a lookup.

**Mutation.** The command changes nothing. It reports, and a reviewer decides what follows.

**Network runs.** 2026-09-04, over all 52 records. The first run reported 18 sections
missing. Seventeen were on code.claude.com pages whose headings are served with a zero-width
space inside each heading's own anchor link, which the checker's text normalization had kept;
it now drops format characters, and those sections resolve as served headings. One was
`vscode.copilot.instructions`, whose heading `Use multiple AGENTS.md files (experimental)` is
now rendered `Use multiple AGENTS.md files` with the experimental label beside it; the citation
was updated after re-reading the three cited sections against every record that maintains a
paraphrase from them. The run after that fix reported the two changelog records, whose cited
releases the page renders as labelled entries rather than headings and lists in its table of
contents; the fallback now reads that list, and each of the four entries was re-read against
the paraphrase it backs. The final run reported 52 sources checked, 0 with drift, and named
those four sections as established through the table of contents.

## Presentation Allowlist freeze

`tests/contract/presentation-allowlist-freeze.test.ts` recomputes all six digest inputs with
the extraction algorithm
[the registry states](contracts/official-sources.md#presentation-allowlist-implementation-gate)
and compares each with its recorded value in constant time, then separately checks row
identifiers and English/Japanese parity.

| Vendor | English | Japanese | Row IDs and parity |
|---|---|---|---|
| GitHub Copilot | verified | verified | verified |
| Claude Code | verified | verified | verified |
| OpenAI Codex | verified | verified | verified |

The gate first reported the GitHub Copilot pair as mismatched, and that mismatch was an
edit to frozen bytes rather than a change to accept. The recorded pair reproduces exactly
the table held at commit `093112c`. At `abc2c0b` the plugin work correctly replaced the
prose describing how a nested manifest is reached — no rule derives one, and the census
enumerates the plugin root's files — and applied the same rewording inside the frozen
`plugin` row as well. Claude Code and OpenAI Codex made the equivalent prose change while
leaving their frozen rows untouched, which is why their four digests never moved, and the
paragraph seven lines below the Copilot table says outright that the row is frozen design
input whose change is a digest-recorded change under the stop-and-regenerate rule.

The row was therefore restored to its frozen bytes — one line in each language, after which
both recorded digests reproduce exactly — and the fact the rewording carried was written
where it belongs: the prose beside the table now states that the row's derivation clause is
frozen on the same terms and describes a derivation no rule performs, as the other two
vendor contracts already state for their own. No recorded digest was authored or updated,
no registry record was edited, and no conformance record needed regeneration.

## Dependency review

`pnpm outdated` reports 27 packages with a newer release available. Every dependency in
`package.json` is declared as a caret range and the committed lockfile owns the exact
resolved versions, so none of the 27 is behind what this repository declares: each is a
newer release inside or above a range that is satisfied as it stands.

**No update is accepted in this review, and the baseline stands unchanged.** Routine
version movement is Renovate's, under the rules `renovate.json` and
[AGENTS.md](../../AGENTS.md) § Release policy state: every update automerges once ci.yml has
run the whole suite against it, except a major to a runtime dependency and a minor to a
package below 1.0.0, which a maintainer decides. Accepting one here instead would put a
version decision in a review whose own rule is that an accepted change supersedes this task
set — for a bump that arrives with its own pull request and its own full-suite run either
way.

Licenses and notices are unchanged, because no package entered or left the graph. The
bundled third-party notices are generated at build time by
`scripts/third-party-notices-plugin.mjs`, which fails loudly on a bundled package with no
license text to publish, so an accepted future update that changed the set could not ship
silently.

Public-contract effects and migration impact: none, and the initial baseline's no-impact
determination is confirmed with its facts as [research.md](research.md) § Migration impact
records them — no prior published package, no public contract a consumer holds, no persisted
profile or user data, and no migration workflow. No breaking public-contract change is
proposed. The task set is not superseded by this review.

## Release gate execution

**The CLI's accepted-batch failure now propagates**, which is what
`tests/integration/cli-global-batch-failure.test.ts` had been failing on: `runGlobalEnable`
takes the disposition its caller needs, so the confirmation the consent page sends retains a
failed batch on `batchStatus` and answers with its acceptance, while the CLI's
`--inspect-personal-setup` throws it before a host exists, printing no launch URL — the same
end the automatic Repository scan's failure has. Both cases now pass.

**The launcher-exclusion review remains open.** `DetectedFileOpener` compares an executable
and each inspected root by lexical spelling. With an inspected root that is a symbolic link to
`/` and `EDITOR=/usr/bin/vi`, the probe offered `terminal-editor`: the executable is inside the
tree that root reaches but outside the root's spelling. That conflicts with FR-020, FR-022, and
the `open-file` contract's requirement to exclude every candidate directory inside an inspected
root. The SC-004 exception covers a lexically indistinguishable network filesystem, not a local
root alias, so the source comment cannot establish this as an accepted limitation. The gates
below do not exercise the alias case. Release approval remains blocked until the implementation
and a regression test establish the contracted exclusion.

Every gate below was run on 2026-09-04 against this tree, after `pnpm run build`, in one
sitting; the counts are what each run reported.

| Gate | Command | Result |
|---|---|---|
| Format | `pnpm run format:check` | silent, exit 0 |
| Lint | `pnpm run lint` | silent, exit 0 |
| Types | `pnpm run typecheck` | silent, exit 0 |
| Unit | `pnpm run test:unit` | 52 files, 1,224 tests passed |
| Contract | `pnpm run test:contract` | 12 files, 405 tests passed |
| Integration | `pnpm run test:integration` | 11 files, 270 tests passed |
| Security | `pnpm run test:security` | 1 file, 5 tests passed |
| Package | `pnpm run verify:package`, then `pnpm run test:package` | verification silent and exit 0; 8 files, 56 tests passed |
| Performance | `pnpm run test:performance` | 2 files, 4 tests passed |
| Browser | `pnpm exec playwright test --project=chromium` | 567 passed |
| Coverage | `pnpm run test:coverage` | 75 files, 1,899 tests passed; statements 86.14%, lines 86.45% |
| Documentation | `pnpm run test:docs` | 1 file, 41 tests passed |

**The browser gate here is one project; the certification matrix is CI's.**
`playwright.config.ts` pins one Chromium, one Firefox, and one WebKit revision, and the
three-project run is what CI performs on every push. A local three-project run on this
machine fails seven cases, all of them macOS WebKit and all of them asserting that a link is
reachable by pressing Tab: macOS does not put links in the keyboard tab order unless the
reader turns on Full Keyboard Access, so a local WebKit run reaches buttons and stops. Six are
`codex-skills-detail`, `instructions-inventory`, `mcp-inventory`, `skill-metadata-comparison`,
`skills-comparison`, and `skills-inventory`; the seventh is `AUTO-2.1.1`, which asserts the
same property for the four primary workflows. The certified WebKit is the Linux revision CI
runs, where the tab order includes links, so those assertions are kept as written rather than
weakened to what one uncertified host does. The row above is therefore the Chromium project,
and this record claims no local run on the certification matrix.

**This tree's certifying browser result is the CI run of its own commit**, over the three
pinned revisions, and it is not reproduced here: the row above is one project on one host, and
a local run stands in for none of it. The disposition is unchanged from the tree the rework
started on — what changed is which commit the certifying run is of.

**The coverage percentages are a run's, not a constant.** This tree's run reported the 75
files, 1,899 passing tests, and percentages recorded in the row above. No threshold is asserted
on them anywhere.

**The performance gate is the smoke pass, not a measurement.** `tests/performance/` runs one
non-gating pass over the 100,000-entry fixture and asserts harness integrity. No timing
threshold is asserted anywhere in this release. The checked-in reference profile
`sc002-smoke-reference-v2` describes a hosted Ubuntu 24.04 x86_64 runner on Node 24.18 and was
minted because the profile's benchmark fields changed, its own rule making any field change a
new, non-comparable ID. It is the reference these observations are read beside and not a claim
about where they were taken: nothing compares the executing environment with it, so the run
prints its own. The pass on 2026-09-04 ran on this machine — arm64, Node 24.14.0 — and observed the request-correlated
status 118 ms and the request-committed operable inventory 607 ms after the rescan was
dispatched, the filter feedback at 23 ms and the selection feedback at 45 ms; the global setup
prints these for whoever reads the log, and they describe this machine.


## Outcome-manifest criteria

The frozen manifest is `tests/fixtures/outcomes/manifest.json`, **version 3**, canonical
SHA-256 `58e3a057a3713d0896efd472527d3d2f73c89f4ade794a05c0fd07942cf372f5`, recorded in
`tests/fixtures/outcomes/manifest.sha256`. Its 99 cases were executed on 2026-09-04 by
running every suite each case names in `verifiedBy`: the vitest suites through
`pnpm run test:contract`/`test:integration`/`test:security`, and the browser specs through the
whole Chromium suite, 567 tests, all passing in the one run the release-gate table above
records. `tests/contract/outcome-fixture-manifest.test.ts` reproduced the canonical digest and
all 66 fixture digests in the same session.

The set is non-comparable with the one recorded after the interface rework: five referenced
fixtures changed — `tests/contract/http-api-session.test.ts`, whose rescan cases now
observe the answer a scan command gives once its scan reached a terminal state
(contracts/http-api.md § rescan-repository), the three skills specs that read the rail's
status words, and `tests/fixtures/global-homes/build-fixtures.ts`, which now pins
`USERPROFILE` beside `HOME` so a Windows run reads the fixture's shared agent home rather
than the developer's own — which spec.md § Release-Evidence Fixture Governance makes a new
measurement set. The manifest version stays at 3, because that governance requires an increment for a
case, required-class, or expected-outcome change and this was neither — the same 99 case IDs
across the same four criteria, each with a nonzero count for every required class. The
browser half of this execution was the Chromium project on this host; the three pinned
revisions are CI's, as the browser gate above records, and the macOS WebKit link-Tab
limitation recorded there was not re-measured for this set.

| Criterion | Cases | Passed | Failed |
|---|---:|---:|---:|
| SC-003 | 43 | 43 | 0 |
| SC-004 | 13 | 13 | 0 |
| SC-005 | 34 | 34 | 0 |
| SC-007 | 9 | 9 | 0 |

Six of these cases have a verifying spec that carries one of the macOS WebKit link-Tab tests
above: `sc003.shared-file.repository-agents-md`, `sc003.shared-file.repository-root-claude-md`,
`sc003.shared-file.repository-agents-skill`, `sc003.shared-file.repository-claude-skill`,
`sc003.shared-file.repository-root-mcp-json`, and `sc005.row.codex.skill`. In the Chromium
project every assertion in those specs passed; what the earlier execution recorded about the
local macOS WebKit project stands as that execution's.

**Denominators.** SC-003 covers 28 `(tool, kind)` rows at the Repository boundary — the exact
set the shipped registry produces, cross-checked in the contract suite rather than restated —
the four frozen selector families (`exact`, `direct-child`, `descendant-inventory`,
`recursive-subtree`), the eight documented multi-tool attribution combinations, and the three
Global source forms. The Global boundary has its own cases rather than a second case per row
because it is admitted per consented member: the admission specs are what exercise it. SC-004
covers three tools, five prohibited-effect classes, both source boundaries, and the three
classes that are about the environment moving under a running scan: an external writer
changing a fixture mid-read, a directory removed, renamed, or created during enumeration, and
a late result discarded after its authority was revoked. SC-005 covers
the same 28 rows plus both display surfaces, both credential classes, and both
referenced-variable states. SC-007 covers four file-confined outcome classes and five failure
classes, the failed initial Global enable among them — a distinct outcome from a
post-acceptance failure, because it creates neither Global Source nor generation. Each
declared minimum is one case per class, and each is met.

**What a fixture digest binds.** A case's fixture entries are the artifacts that decide what it
measures, derived from its suites rather than assigned: a suite importing a shared builder binds
to that builder, and a suite writing its own tree binds to itself. Sixty-two of the 66 entries
are suites of that second kind. Binding every case to a builder instead — which version 1 did —
recorded digests over bytes most cases never touched, so those digests could not have failed for
the reason they existed.

**SC-004's mutation observation.** The external mutation harness is
`tests/integration/boundaries/traversal.test.ts` § external mutation during a scan: it rewrites
a fixture, and reshapes directories, while the scan is reading, and asserts the instrumented
product surfaces stayed read-only. What an inspected file keeps is observed in
`tests/integration/inspection-safety.test.ts` — content, length, identity, link state, mode,
and both change times, with access time deliberately excluded because reading is what updates
it. Extended attributes and ACLs have no stable Node.js API, so change time is the indirect
signal, which is the disposition the task states rather than a gap in it.

**What this does not establish.** These are the automated cases the manifest lists. The two
criteria measured by running something other than this suite — the first-use sessions of
SC-001 and SC-006, and the browser accessibility run of SC-008 — have their own records.

## SC-008 accessibility

The acceptance matrix (`contracts/accessibility-acceptance.md`) holds 55 Level A/AA rows: 37
Applicable and 18 Not applicable, naming 34 `AUTO-*`, 36 `MANUAL-*`, and 18 `REVIEW-*` IDs.

**The automated half.** `tests/e2e/accessibility.spec.ts` carries one test per `AUTO-*` ID —
exactly the 34 the matrix rows name, with no ID the matrix does not define. A local
three-project run on 2026-09-04 passed 32 in every project; `AUTO-2.1.1` and `AUTO-2.4.1`
passed in chromium and firefox and failed in macOS WebKit, both for the tab-order reason
recorded above — one cannot reach a link-driven workflow by Tab, the other cannot focus the
skip link. The certified WebKit is the
Linux revision CI runs, so the certifying result for this half is CI's, and it is assumed
rather than observed here — the same disposition T1051 records for the lower-bound matrix.
No local run stands in for it.

### WCAG results

Every row of the acceptance matrix with the result of each check ID it names, as the contract
requires (contracts/accessibility-acceptance.md § Stable check IDs and execution locations).
The three project results are the local run above; `MANUAL-*` is unexecuted for the reason
below; each `REVIEW-*` result is the recheck recorded under § SC-008 accessibility:
Not-applicable revalidation. A passing Playwright run writes no artifact, so none is named:
the two failures' artifacts are this machine's `test-results/` and are not checked in.

| Criterion | Level | State | Checks and results |
|---|---:|---|---|
| 1.1.1 Non-text Content | A | Applicable | `AUTO-1.1.1` pass (chromium, firefox, webkit); `MANUAL-1.1.1` unexecuted |
| 1.2.1 Audio-only and Video-only (Prerecorded) | A | Not applicable | `REVIEW-1.2.1` pass |
| 1.2.2 Captions (Prerecorded) | A | Not applicable | `REVIEW-1.2.2` pass |
| 1.2.3 Audio Description or Media Alternative (Prerecorded) | A | Not applicable | `REVIEW-1.2.3` pass |
| 1.2.4 Captions (Live) | AA | Not applicable | `REVIEW-1.2.4` pass |
| 1.2.5 Audio Description (Prerecorded) | AA | Not applicable | `REVIEW-1.2.5` pass |
| 1.3.1 Info and Relationships | A | Applicable | `AUTO-1.3.1` pass (chromium, firefox, webkit); `MANUAL-1.3.1` unexecuted |
| 1.3.2 Meaningful Sequence | A | Applicable | `AUTO-1.3.2` pass (chromium, firefox, webkit); `MANUAL-1.3.2` unexecuted |
| 1.3.3 Sensory Characteristics | A | Applicable | `MANUAL-1.3.3` unexecuted |
| 1.3.4 Orientation | AA | Applicable | `AUTO-1.3.4` pass (chromium, firefox, webkit); `MANUAL-1.3.4` unexecuted |
| 1.3.5 Identify Input Purpose | AA | Not applicable | `REVIEW-1.3.5` pass |
| 1.4.1 Use of Color | A | Applicable | `AUTO-1.4.1` pass (chromium, firefox, webkit); `MANUAL-1.4.1` unexecuted |
| 1.4.2 Audio Control | A | Not applicable | `REVIEW-1.4.2` pass |
| 1.4.3 Contrast (Minimum) | AA | Applicable | `AUTO-1.4.3` pass (chromium, firefox, webkit); `MANUAL-1.4.3` unexecuted |
| 1.4.4 Resize Text | AA | Applicable | `AUTO-1.4.4` pass (chromium, firefox, webkit); `MANUAL-1.4.4` unexecuted |
| 1.4.5 Images of Text | AA | Not applicable | `REVIEW-1.4.5` pass |
| 1.4.10 Reflow | AA | Applicable | `AUTO-1.4.10` pass (chromium, firefox, webkit); `MANUAL-1.4.10` unexecuted |
| 1.4.11 Non-text Contrast | AA | Applicable | `AUTO-1.4.11` pass (chromium, firefox, webkit); `MANUAL-1.4.11` unexecuted |
| 1.4.12 Text Spacing | AA | Applicable | `AUTO-1.4.12` pass (chromium, firefox, webkit); `MANUAL-1.4.12` unexecuted |
| 1.4.13 Content on Hover or Focus | AA | Applicable | `AUTO-1.4.13` pass (chromium, firefox, webkit); `MANUAL-1.4.13` unexecuted |
| 2.1.1 Keyboard | A | Applicable | `AUTO-2.1.1` pass (chromium, firefox), fail (webkit — the uncertified macOS revision, tab order); `MANUAL-2.1.1` unexecuted |
| 2.1.2 No Keyboard Trap | A | Applicable | `AUTO-2.1.2` pass (chromium, firefox, webkit); `MANUAL-2.1.2` unexecuted |
| 2.1.4 Character Key Shortcuts | A | Not applicable | `REVIEW-2.1.4` pass |
| 2.2.1 Timing Adjustable | A | Not applicable | `REVIEW-2.2.1` pass |
| 2.2.2 Pause, Stop, Hide | A | Not applicable | `REVIEW-2.2.2` pass |
| 2.3.1 Three Flashes or Below Threshold | A | Not applicable | `REVIEW-2.3.1` pass |
| 2.4.1 Bypass Blocks | A | Applicable | `AUTO-2.4.1` pass (chromium, firefox), fail (webkit — the uncertified macOS revision, tab order); `MANUAL-2.4.1` unexecuted |
| 2.4.2 Page Titled | A | Applicable | `AUTO-2.4.2` pass (chromium, firefox, webkit); `MANUAL-2.4.2` unexecuted |
| 2.4.3 Focus Order | A | Applicable | `AUTO-2.4.3` pass (chromium, firefox, webkit); `MANUAL-2.4.3` unexecuted |
| 2.4.4 Link Purpose (In Context) | A | Applicable | `AUTO-2.4.4` pass (chromium, firefox, webkit); `MANUAL-2.4.4` unexecuted |
| 2.4.5 Multiple Ways | AA | Not applicable | `REVIEW-2.4.5` pass |
| 2.4.6 Headings and Labels | AA | Applicable | `AUTO-2.4.6` pass (chromium, firefox, webkit); `MANUAL-2.4.6` unexecuted |
| 2.4.7 Focus Visible | AA | Applicable | `AUTO-2.4.7` pass (chromium, firefox, webkit); `MANUAL-2.4.7` unexecuted |
| 2.4.11 Focus Not Obscured (Minimum) | AA | Applicable | `AUTO-2.4.11` pass (chromium, firefox, webkit); `MANUAL-2.4.11` unexecuted |
| 2.5.1 Pointer Gestures | A | Not applicable | `REVIEW-2.5.1` pass |
| 2.5.2 Pointer Cancellation | A | Applicable | `AUTO-2.5.2` pass (chromium, firefox, webkit); `MANUAL-2.5.2` unexecuted |
| 2.5.3 Label in Name | A | Applicable | `AUTO-2.5.3` pass (chromium, firefox, webkit); `MANUAL-2.5.3` unexecuted |
| 2.5.4 Motion Actuation | A | Not applicable | `REVIEW-2.5.4` pass |
| 2.5.7 Dragging Movements | AA | Not applicable | `REVIEW-2.5.7` pass |
| 2.5.8 Target Size (Minimum) | AA | Applicable | `AUTO-2.5.8` pass (chromium, firefox, webkit); `MANUAL-2.5.8` unexecuted |
| 3.1.1 Language of Page | A | Applicable | `AUTO-3.1.1` pass (chromium, firefox, webkit) |
| 3.1.2 Language of Parts | AA | Applicable | `MANUAL-3.1.2` unexecuted |
| 3.2.1 On Focus | A | Applicable | `AUTO-3.2.1` pass (chromium, firefox, webkit); `MANUAL-3.2.1` unexecuted |
| 3.2.2 On Input | A | Applicable | `AUTO-3.2.2` pass (chromium, firefox, webkit); `MANUAL-3.2.2` unexecuted |
| 3.2.3 Consistent Navigation | AA | Applicable | `AUTO-3.2.3` pass (chromium, firefox, webkit); `MANUAL-3.2.3` unexecuted |
| 3.2.4 Consistent Identification | AA | Applicable | `AUTO-3.2.4` pass (chromium, firefox, webkit); `MANUAL-3.2.4` unexecuted |
| 3.2.6 Consistent Help | A | Applicable | `MANUAL-3.2.6` unexecuted |
| 3.3.1 Error Identification | A | Applicable | `AUTO-3.3.1` pass (chromium, firefox, webkit); `MANUAL-3.3.1` unexecuted |
| 3.3.2 Labels or Instructions | A | Applicable | `AUTO-3.3.2` pass (chromium, firefox, webkit); `MANUAL-3.3.2` unexecuted |
| 3.3.3 Error Suggestion | AA | Applicable | `AUTO-3.3.3` pass (chromium, firefox, webkit); `MANUAL-3.3.3` unexecuted |
| 3.3.4 Error Prevention (Legal, Financial, Data) | AA | Not applicable | `REVIEW-3.3.4` pass |
| 3.3.7 Redundant Entry | A | Not applicable | `REVIEW-3.3.7` pass |
| 3.3.8 Accessible Authentication (Minimum) | AA | Applicable | `AUTO-3.3.8` pass (chromium, firefox, webkit); `MANUAL-3.3.8` unexecuted |
| 4.1.2 Name, Role, Value | A | Applicable | `AUTO-4.1.2` pass (chromium, firefox, webkit); `MANUAL-4.1.2` unexecuted |
| 4.1.3 Status Messages | AA | Applicable | `AUTO-4.1.3` pass (chromium, firefox, webkit); `MANUAL-4.1.3` unexecuted |

**`AUTO-2.1.2` certifies the exit from the editor on all three browsers.** Chromium and WebKit
assert a bounded forward-Tab exit. On the pinned Firefox revision, Tab does not leave Monaco's
input textarea, while Shift+Tab leaves it on the first press, so Firefox explicitly asserts that
backward exit. Measured on 2026-09-04
with a capture-phase `keydown` listener on `window`: every press reaches the page with
`defaultPrevented` false, no `focusin` follows, and `document.activeElement` stays
`textarea.inputarea` — Monaco is not consuming the key, so `tabFocusMode: true` and the
Ctrl+M toggle, which govern whether it does, change nothing. Firefox's forward sequential
focus navigation does not move from the textarea Monaco renders at 0×0 on that engine alone
(`canUseZeroSizeTextarea = isFirefox` in its text-area edit context; 1px on the others).
Chromium, whose input element is a `div.native-edit-context`, and WebKit release focus on
the first press. The test records the forward-Tab exemption, no workaround is installed in this
repository, and forward exit on Firefox stands as an open limitation of the editor on that
engine.

**The manual half is outside the criterion.** The 36 `MANUAL-*` IDs would be executed over
`3 × 5 × 3 × 8 × 3 = 1,080` keyed cells each — 38,880 cells requiring macOS with VoiceOver,
Windows with NVDA, and Ubuntu with Orca. SC-008 asserts the automated checks and the four
keyboard workflows instead, and every `MANUAL-*` ID is recorded as unexecuted rather than as
passed (spec.md § Clarifications, Session 2026-09-01).

**The 18 `REVIEW-*` IDs were performed**, on 2026-09-03, and are recorded in their own
section below.

## Lower-bound certification

`.github/workflows/ci.yml` packs one tarball in the `build` job and distributes those exact
bytes to six `certify-lower-bounds` jobs — Node.js 24.11.0 and 26.0.0 on `ubuntu-latest`,
`macos-latest`, and `windows-latest` — each of which records the runner image, the Node.js
version the range resolved to, and the SHA-256 of the received tarball before installing and
launching it. `tests/documentation/cross-artifact.test.ts` asserts that shape: packed once,
downloaded per sample, environment recorded.

**Not executed here.** The six jobs need three operating systems and two pinned Node.js
versions; this session has one macOS host. The certification result is what a CI run on the
matrix produces, and none is recorded.

## SC-001 and SC-006 first-use sessions

**Twenty agent-driven sessions, run on 2026-09-04 against the build that carries the rework
the first run's findings led to, each launching the Inspector itself.** The build is
`pnpm pack` of the working tree at commit `e683269` with that day's uncommitted changes —
among them the rail's status-only Repository entry, the personal-setup page's
`Statuses below are from the last refresh.`, the detail bar's `Previous` and `Next`, and the
agent comparison's note — tarball SHA-256
`66bcbab02419a8fb0a4c67d9a4067e429876f3855f2c1277a2eefe36b867e280`, installed with
`npm install` into one session folder. Each session's `repository/` was built in place by
`tests/fixtures/repositories/build-fixtures.ts`, so the `.claude/skills/cycle` link points at
that session's own root as the fixture designs it, and each session's four homes stood under a
`HOME` of its own, built by `tests/fixtures/global-homes/build-fixtures.ts`. Everything else
was the first run's: the guide, the four prompts, the three questions, the two equipment
conditions, a headless browser and a clock of each session's own, and five sessions at a time.

**What was enforced, and what was not.** As in the first run, reading this product's source,
tests, specifications, fixtures, and documents was forbidden by instruction and not prevented
mechanically, and each session's own runtime carried the repository's `AGENTS.md` and the
assistant's memory notes as ambient instructions before it began. This time every one of the
twenty disclosed it unprompted and stated that it navigated by the page alone. The guarantee
is the weaker one, and it is recorded rather than claimed away; it is also outside what
SC-001 allows a session to be given, as the first run's record below says, and the result
rows state it.

**One condition of the equipment bears on the record more than any other.** The service the
sessions' own runtime runs on — not the product — refused requests for between six and a half
and seven minutes, and cut the five sessions then in flight, 06 through 10, in the middle of a
turn. Each was resumed where it stopped, with its host and its browser still running and
reused. Sessions 06 and 07 were cut between tasks, so no timed interval of theirs spans the
gap: 06 re-established the prepared state and re-recorded T2 after resuming, and 07's gap fell
between Task 2 and Task 3, with T2 recorded after it. Sessions 08, 09, and 10 were cut inside
the discovery interval, after the launch and before a file was open, so their T1 stamps carry
the gap — 409, 403, and 404 seconds of it — and each is counted unsuccessful under the kit's
rule that an interrupted attempt is an unsuccessful one and that no session is excluded or
replaced. The sessions' own reckoning of the interval without the gap is kept as reference and
scores nothing: session 08 about 136 s, over the limit on its own, thirty of them a selector of
its own that timed out; session 09 about 58 s; session 10 about 60 s.

**Two more conditions of the equipment bear on the numbers.** A session's T1 is the moment its
own check confirmed the file's text on screen, so it errs late where the check lagged the page:
session 04's first probe used a wrong selector and timed out for 30 seconds after the view had
opened, session 05's check ran about 15 seconds after its click, session 07 found the text in an
untimestamped dump 0.8 seconds after its click and stamped T1 later, and session 10 discarded a
false positive before its first true sighting; session 19's stamp carries about 40 seconds
spent restarting a browser driver of its own. Two inspection intervals err the other way:
session 12 extracted the three answers by script from a page it had already read while
confirming the prepared state, and its T3 fell 19 ms after its T2; session 19 dumped the
prepared page's accessibility tree to repair a check of its own before recording T2, and says
its 19 s understates a cold read. All are recorded as they stand, the way the late stamps are.

**This is an agent-driven run and is recorded as one.** What twenty agents measure is whether
the product's own printed and rendered guidance is sufficient to launch it, reach a file, and
state what the product says about it. How a person experiences the same interface is not in
this record; SC-001 and SC-006 say so in their own text, and no sentence here may be read as a
human-subject result.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: from the launch command to one discovered file's detail view open within two minutes | 19 of 20 | **Not established by this run: 17 of 20.** The 17 uninterrupted sessions all reached a file within the limit, 27.7 s to 97.2 s, median 42.7 s among them; the three unsuccessful ones are the sessions the outage cut inside the interval — and, as in the first run, every session's runtime carried this repository's own instructions, which SC-001 excludes |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` within two minutes | 18 of 20 | **20 of 20 matched, and not established** under the same no-hint condition; 0.02 s to 39.0 s, median 21.8 s |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 of 20** complete |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 of 20** complete |
| Safety | SC-006 zero-critical gate | no critical issue | **none reported** |

Every session's three fields matched `ground-truth.json` with no partial credit: source
`Repository`, recognizing tools `GitHub Copilot` **and** `OpenAI Codex`, file type
`Instructions`; none named Claude Code. For discovery, every session opened the first row of
the kind the page shows by default, `.claude/CLAUDE.md`.

Every session reached the pair the ground truth names — the `changelog` skill in
`.agents/skills/` against the copy in `.github/skills/` — through the row's own Compare link,
most choosing it because it is one skill name at two skill paths where the other two-file
names, `alpha` and `voyage`, are not; every one named the description drift, and most also named the
instruction drift and the recognition difference the page states beside the text.

Every session reached the consent page, named the four directories exactly as the page shows
them — the three fixture homes as `From this tool's environment variable` and the shared
agent home as `Default location in your home directory` — and then went on to confirm the
read, each judging that the prompt's "get the tool to show you those" reaches past the list;
each host was that session's own, so no session met another's consent state. Every session
stopped its own host with SIGTERM and closed its own browser, and no process another session
started was touched: session 18 met sibling sessions' headless browsers in a process listing
and left them alone.

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 40.0 s | 25.8 s | complete | complete | none |
| 02 | 42.7 s | 11.1 s | complete | complete | none |
| 03 | 41.7 s | 25.7 s | complete | complete | none |
| 04 | 74.3 s | 14.8 s | complete | complete | none |
| 05 | 65.0 s | 26.3 s | complete | complete | none |
| 06 | 35.2 s | 18.2 s | complete | complete | none |
| 07 | 97.2 s | 33.9 s | complete | complete | none |
| 08 | 545.3 s, interrupted, unsuccessful | 17.2 s | complete | complete | none |
| 09 | 460.3 s, interrupted, unsuccessful | 25.6 s | complete | complete | none |
| 10 | 463.7 s, interrupted, unsuccessful | 24.6 s | complete | complete | none |
| 11 | 36.1 s | 11.5 s | complete | complete | none |
| 12 | 48.4 s | 0.02 s | complete | complete | none |
| 13 | 33.4 s | 17.7 s | complete | complete | none |
| 14 | 41.5 s | 36.7 s | complete | complete | none |
| 15 | 45.1 s | 29.0 s | complete | complete | none |
| 16 | 42.2 s | 39.0 s | complete | complete | none |
| 17 | 70.9 s | 28.5 s | complete | complete | none |
| 18 | 27.7 s | 13.2 s | complete | complete | none |
| 19 | 86.1 s | 19.1 s | complete | complete | none |
| 20 | 44.7 s | 16.4 s | complete | complete | none |

No session was excluded or replaced, so the fixed denominator and the recorded count are the
same twenty.

**What the sessions reported about safety.** No prohibited effect: no request beyond
localhost, no execution derived from a customization, no mutation of the repository copy or
of the fixture homes, and no browser opened by the product under `--no-open`. Every session
reported that the consent page reads nothing until the confirmation. The moderator's own check
after the run agrees: no file under any session's `repository/` or `homes/` carries a
modification time later than the build, except the `.npm` cache and logs that npm wrote under
each session's `HOME`. That cache is npm's, as is the notice every session's captured output
gained at exit — `New minor version of npm available` — which is npm's own update check under
the guide's `npx` and not a request the product makes; the sessions attributed it to npm, and
none observed the product's page request any host but its own loopback origin.

**What the sessions raised about the product.** Fifteen sessions (01–04, 06, 08–14, 16–18)
remarked on the rail's `Repository: Partial`: six read it as a failed scan at first sight, and
eight (03, 06, 11, 13, 14, 16, 17, 18) read it against the rail's `Source diagnostics 0` as a
contradiction until the Repository page, which says fourteen files kept a diagnostic of their
own, was open. Nearly every session noted that nothing updates by itself after the consent
and that `Refresh status` had to be pressed; session 03 waited a minute before reading the
sentence that says so, and session 16 found the inventory's `Personal setup — Not inspected`
and its counts unchanged after an accepted read until the same press. Session 15 saw the page
state, right after its confirmation, that the accepted read was running while the rows still
read `Accepted, not yet read`, which is the arrangement the rework made. Session 05 found the personal-setup page's loading placeholder,
`Reading the proposed directories…`, shown while the page fetches this session's proposal
and reads no directory, and session 12 found the consent page's `What stays excluded` to be
one sentence over a plain list of product names where it had expected each product's own
detail. Session 02 saw the first detail it opened show `Loading this instruction file…` for
about 8.6 seconds before the editor's text, with five sessions loading their editors on one
machine; the second detail took under a second, and session 18 saw the text 304 ms after its
click. Session 05 saw the loading sentence twice in extracted text, which is the visible
sentence and its live region. Two sessions saw the editor's own limits: session 04 that the
accessibility tree exposes it as a read-only text box without its text, session 12 that it
renders spaces as U+00A0 — both Monaco's, recorded and not worked around. Two (08, 13) saw
one file listed under two names, `lander` for Claude Code and `voyage` for GitHub Copilot, as
the products resolve it; session 10 counted the two steps the consent page takes before
anything is read, which the guide's one page does not mention; session 15 that the shared
agent home is proposed from `HOME` although no variable named it; session 07 that
`Work out the directories` made no HTTP request its logger saw, because the page speaks to
its host over its session channel; session 08 that the tab title read `Connecting` for a
moment on first load; and two (07, 14) named the detail's `Open in VS Code` and
`Choose how to open this file` controls and did not press them. As in the first run, two (11,
20) noticed the host listening on `[::1]` alone while printing `localhost`, which the browser
resolved; session 20 the bidi-isolate characters around the file name in the document title;
and two (07, 20) a row's diagnostic badge run together with its path in extracted text. Session 08 reported that a
row lands on an `Instructions` tab reading `This file declares none.` with the text one tab
away; its snapshot was taken while the detail was still loading, and sessions 12, 14, and 18
read the text on that tab. Three of these observations changed the product in the same
change as this record: the rail's Repository entry now states its status in words that carry
their own meaning — `Inspected`, `Not inspected`, and for a partial read `Inspected` with
`some files kept a diagnostic` on the line under it — the same vocabulary the personal-setup
entry uses, because a word that does not say what it means sends a reader looking for its
meaning, while the Repository page keeps its own word beside its explanation; the three commands that admit a scan — the consent page's `Inspect these directories`, a member row's `Rescan`, and the bar's and the Repository page's `Rescan` — now answer once the scans they admitted reached a terminal state, and the shell refetches on the answer, so what a press produced is on screen without a second press of `Refresh status`, which stays for a scan that was already running when a page opened — and the Repository page's and the personal-setup page's notes now say so, that a scan or read started there reports its own result and `Refresh status` is for one that started elsewhere; while a command is out, the surface holding it says so from the command's own state rather than from the snapshot, which is the value the command replaces — `Scanning now.` in the Repository panel, `<member> — scanning now.` on the pressed member row, `Rescanning…` on the bar's command — because the wait, being now the scan's whole length, would otherwise read as a finished scan; the observations of sessions 15 and 16, which met the stale rows and the stale rail from the two surfaces, are what this rests on, and the rail's own copy of the personal-setup page's dating sentence, added for the interval before this decision, is gone with it; and the personal-setup page's loading
placeholder says `Loading this page's status…`, which is what is loading. The `What stays
excluded` list stays one sentence over the product names: a per-product sentence would be
prose the registry does not hold, and `GlobalConsentPreview.vue` records that decision.

**What this run does not establish.** It does not establish SC-001 or SC-006: the outage cut
three sessions inside the interval SC-001 fixes, and every session's runtime carried this
repository's `AGENTS.md` and the assistant's memory notes, which the criteria's no-hint policy
excludes. A run that can establish them starts each session outside this working tree, so
that nothing of the repository's own instructions or memory is in its runtime, against the
current build. It does not establish anything about human first use. It carries no capture bundle: what it rests on is
each session's own report, kept beside the run's session folders outside this repository. And
it is one fixture tree: a session met the customization files this repository builds for its
own tests, not a repository it had never seen.

### The first run of 2026-09-04

**Twenty agent-driven sessions, run on 2026-09-04, each launching the Inspector itself.** The
build is `pnpm pack` of the working tree at commit `e683269` with that day's uncommitted
changes, tarball SHA-256 `1fbb6607d1a25c05f3c1cc228080e552188e6bfb5d9e4a19063ccb75ee012ec2`,
installed with `npm install` into one session folder. Each session had its own copy of the
all-kind fixture as that folder's `repository/`, which is where the guide's
`npx --no-install agent-customization-inspector --no-open` resolves the package by walking up
to the folder's `node_modules` — the folder the guide says the reader was given. Each session
was handed the text of `tests/usability/sc001-sc006-study-inputs/guidance.md`, the four
prompt files beside it verbatim, and the three questions of `response-form.json`, and drove a
headless browser of its own with its own clock. Two equipment conditions were stated to every
session: `--port 0` appended to the launch command, because the default port is this
machine's owner's; and `COPILOT_HOME`, `CLAUDE_CONFIG_DIR`, `CODEX_HOME`, and `HOME` set for
the launch command alone, pointing the personal-setup consent at four fixture homes built by
`tests/fixtures/global-homes/build-fixtures.ts` — which is what `ground-truth.json` says the
equipment may do. Five sessions ran at a time.

**What was enforced, and what was not.** Reading this product's source, tests,
specifications, fixtures, and documents was forbidden by instruction and not prevented
mechanically, as before: Playwright was loaded from this working tree. Weaker than that, and
new to this run: the sessions ran with this repository as their working directory, so each
one's own runtime carried the repository's `AGENTS.md` — and for one, the assistant's memory
notes — as ambient instructions before it began. Three sessions (09, 15, 19) disclosed this
unprompted and stated they navigated by the page alone. That is a guarantee weaker than a
session with nothing of this tree in view, and it is recorded rather than claimed away. It is
also outside what SC-001 allows: the criterion admits no hint beyond what the product prints
or renders, and a runtime that carries this repository's `AGENTS.md`, which names the
product's surfaces, before the session begins is not that. The figures below are recorded;
the criteria are not established by them, and SC-006 applies the same policy.

**Three conditions of the equipment bear on the record.** The fixture copies kept the
`.claude/skills/cycle` link's absolute target, which is the fixture tree they were copied
from, so the product followed the link out of the selected root and listed that whole tree a
second time under `.claude/skills/cycle/**` — counts inflated by the duplicates, no task
affected, and seven sessions remarked on the rows. The one `HOME` the launches shared
collected npm's own debug logs from every launch, which several sessions noticed and
attributed correctly to npm. And a session's T1 is the moment its own check confirmed the
file's text on screen, so it errs late where the check lagged the page: session 14 places its
true T1 somewhere in a 27-second window before its stamp, and session 07's stamp is what put
it over the limit.

**This is an agent-driven run and is recorded as one.** What twenty agents measure is whether
the product's own printed and rendered guidance is sufficient to launch it, reach a file, and
state what the product says about it. How a person experiences the same interface is not in
this record; SC-001 and SC-006 say so in their own text, and no sentence here may be read as a
human-subject result.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: from the launch command to one discovered file's detail view open within two minutes | 19 of 20 | **Not established: 19 of 20 reached a file within the limit, and the sessions were given more than the guidance** — the enforcement paragraph above says what. 21.9 s to 81.8 s among the nineteen, median 38.8 s over all twenty. Session 07 took 152.7 s: its own URL-wait script never matched the printed line (a POSIX character class inside a JavaScript regular expression) and sat for its 90-second timeout after the Inspector had printed the URL — an equipment fault, counted as unsuccessful under the kit's no-exclusion rule |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` within two minutes | 18 of 20 | **20 of 20 matched, and not established** for the reason the discovery row gives; 9.0 s to 47.8 s, median 24.1 s |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 of 20** complete |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 of 20** complete |
| Safety | SC-006 zero-critical gate | no critical issue | **none reported** |

Every session's three fields matched `ground-truth.json` with no partial credit: source
`Repository`, recognizing tools `GitHub Copilot` **and** `OpenAI Codex`, file type
`Instructions`; none named Claude Code. For discovery, seventeen sessions opened the first row
of the kind the page shows by default, `.claude/CLAUDE.md`; sessions 09 and 13 opened the root
`CLAUDE.md`, and session 16 `.github/copilot-instructions.md`.

Every session reached the pair the ground truth names — the `changelog` skill in
`.agents/skills/` against the copy in `.github/skills/` — through the row's own Compare
link, and every one named the description drift; most also named the instruction drift and
the recognition difference the page states beside the text. Session 19 disclosed that a
process listing it ran before the task showed a sibling session's comparison URL naming
`changelog`, and that it cannot rule out the string having biased its choice among the pairs
the page offered.

Every session reached the consent page, named the four directories exactly as the page shows
them — the three fixture homes as `From this tool's environment variable` and the shared
agent home as `Default location in your home directory` — and then went on to confirm the
read, each judging that the prompt's "get the tool to show you those" reaches past the list;
each host was that session's own, so no session met another's consent state. Every session
stopped its own host with SIGTERM and closed its own browser, and no process another session
started was touched.

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 31.9 s | 38.3 s | complete | complete | none |
| 02 | 46.7 s | 33.1 s | complete | complete | none |
| 03 | 34.1 s | 16.5 s | complete | complete | none |
| 04 | 42.1 s | 12.0 s | complete | complete | none |
| 05 | 30.9 s | 21.6 s | complete | complete | none |
| 06 | 36.8 s | 47.8 s | complete | complete | none |
| 07 | 152.7 s, over the limit | 17.0 s | complete | complete | none |
| 08 | 81.8 s | 38.2 s | complete | complete | none |
| 09 | 34.7 s | 21.6 s | complete | complete | none |
| 10 | 44.8 s | 39.6 s | complete | complete | none |
| 11 | 36.3 s | 18.9 s | complete | complete | none |
| 12 | 53.2 s | 36.4 s | complete | complete | none |
| 13 | 21.9 s | 26.6 s | complete | complete | none |
| 14 | 62.8 s | 40.7 s | complete | complete | none |
| 15 | 41.4 s | 14.8 s | complete | complete | none |
| 16 | 38.8 s | 15.5 s | complete | complete | none |
| 17 | 38.9 s | 36.2 s | complete | complete | none |
| 18 | 35.5 s | 15.4 s | complete | complete | none |
| 19 | 40.0 s | 31.1 s | complete | complete | none |
| 20 | 30.5 s | 9.0 s | complete | complete | none |

No session was excluded or replaced, so the fixed denominator and the recorded count are the
same twenty.

**What the sessions reported about safety.** No prohibited effect: no request beyond
localhost, no execution derived from a customization, no mutation of the repository copy or
of the fixture homes, and no browser opened by the product under `--no-open`. Every session
reported that the consent page reads nothing until the confirmation, and several that the
four proposed directories were an escaped presentation granting no read access.

**What the sessions raised about the product.** Five sessions (02, 05, 11, 12, 20) read the
rail's `Source diagnostics 0` beside `Repository: Partial · 17 files kept a diagnostic` as a
contradiction at first sight, before finding the per-file rows — the earlier run recorded no
such reading. Many noted that nothing updates by itself after the consent and that `Refresh
status` had to be pressed; two (09, 18) said a first-time reader could take the unchanged
`Accepted, not yet read` as a stall. Three (01, 12, 16) found the detail bar's next-range
control, which shows only the next range's pattern such as `.claude/skills/cycle/**`, cryptic
on sight, its purpose being in its accessible name alone. Three (05, 08, 17) saw a row's
source badge and its path run together in extracted text with no separator. Four (04, 08,
18, 20) noticed the host listening on `[::1]` alone while printing `localhost`, which the
browser resolved; four (03, 06, 15, 19) the bidi-isolate characters around the file name in
the document title; two (10, 19) one file listed under two names, `lander` for Claude Code
and `voyage` for GitHub Copilot, as the products resolve it. Session 14 saw the first detail's
editor empty for a moment after the page had settled. Session 02 found `Personal setup`
reachable only from the inventory's rail, not from a comparison page. Session 18 found the
custom-agent comparison's note stating that "the two formats have no line-for-line
alignment" over two Codex TOML files, which share a format — a false reason, corrected in the
same change as this record: the note now gives the kind's own reason for every pair — the declarations are compared
above in one canonical form and each file is shown whole — and
`tests/e2e/custom-agents-comparison.spec.ts` pins it for a cross-format pair and a same-format
pair alike. Three more of these observations changed the product in the same change: the
rail's Repository entry states its status alone, `Partial`, and the count of files that kept
a diagnostic stays on the Repository page beside the sentence saying where each is stated,
because a number that raises a question belongs where the answer is; while an accepted read
is still running, the personal-setup page says `Statuses below are from the last refresh.`
above its member rows, so the rows and the panel no longer describe one moment two ways; and
the detail bar's moves say their direction in a word, `Previous` and `Next`, as `Back to`
already did. The editor's first paint was measured rather than given a loading state: on a
cold direct load the panel's frame and headings are on screen 130 to 190 ms before the
editor's text on this machine, which is a box whose content is arriving, and below the
threshold at which a loading state would be considered.

**What this run does not establish.** It does not establish SC-001 or SC-006, for the reason
the enforcement paragraph gives. It does not establish anything about human first use. It
carries no capture bundle: what it rests on is each session's own report, kept beside the
run's session folders outside this repository. And it is one fixture tree: a session met the
customization files this repository builds for its own tests, not a repository it had never
seen.

### The run of 2026-09-03

**Twenty agent-driven sessions, run on 2026-09-03** against a build of this candidate
(`pnpm run build`, then the all-kind fixture `pnpm run start:fixture` builds, served by a
single host for the whole run). Each session was an independent autonomous agent handed one
thing besides the tasks: the origin the running Inspector printed, and the text of
`tests/usability/sc001-sc006-study-inputs/guidance.md`. No selector, no route, and no
description of the interface beyond that guide. Each drove its own browser and kept its own
clock, and the tasks were the four prompt files beside that guide.

**What was enforced, and what was not.** Reading this product's source, tests, specifications,
fixtures, and documents was forbidden by instruction, because a session that read them would
have been reading the answer rather than finding it. It was not prevented mechanically: the
sessions ran Playwright out of this working tree, which is where the browser binary is, so the
tree was reachable to them. That is a weaker guarantee than a session with no access at all,
and it is recorded rather than claimed away.

**Two conditions of this run bear on the numbers.** Every session was given its own scratch
directory, and four ran at once. And one session, looking for the wreckage of a crashed script
of its own, attached to a sibling's live browser over a shared debugging port and closed it;
its own check afterwards found that browser's page and context still open, and the three
sessions running at that moment all completed and answered all four tasks. The instruction was
extended from session 13 onward to forbid attaching to any browser a session did not launch,
which is the same rule as the standing prohibition on `kill` reaching the mechanism that got
around it.

**The consent state is server-side and the host is shared.** Personal inspection starts off, so
the first session to confirm it turns it on for every session after, and a session that
exercises `Disable personal inspection` turns it back off for them. One session did both — it
arrived to a completed read, disabled it, and redid the flow from a clean state to see the gate
for itself, which it reported working as specified. Four sessions met the un-consented page and
reported the two-step gate: the confirmation checkbox is what makes the `Inspect these
directories` button appear. Two others saw the consequence from the other side, a kind's count
moving between reloads and `Personal setup` reverting to `Not inspected` with no action of their
own; both read it as server-side state rather than as something they had caused. It is the
harness's condition, not the product's: one host cannot hold twenty independent first uses of a
once-per-process confirmation, and a reader with one session changes that state only by acting.

**This is an agent-driven run and is recorded as one.** What twenty agents measure is whether
the product's own printed and rendered guidance is sufficient to reach a file and to state
what the product says about it. How a person experiences the same interface is not in this
record; SC-001 and SC-006 say so in their own text, and no sentence here may be read as a
human-subject result. The run used no capture harness: the sealed-capture kit that a
moderated study would have needed was not exercised by it and has since been retired, which
the record below covers.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: one discovered file's detail view open within two minutes | 19 of 20 | **Not established.** 20 of 20 reached a file, 0.753 s to 93.6 s, median 5.72 s — but the timer began at an already-running origin, and SC-001 fixes an interval that includes launching the Inspector |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` within two minutes | 18 of 20 | **20 of 20**, 0.37 s to 29 s, median 1.12 s |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 of 20** complete |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 of 20** complete |
| Safety | SC-006 zero-critical gate | no critical issue | **none reported** |

Every session's three fields matched `tests/usability/sc001-sc006-study-inputs/ground-truth.json`
with no partial credit: source `Repository`, recognizing tools `GitHub Copilot` **and**
`OpenAI Codex`, file type `Instructions`. The tool field is the one that separates reading the
page from guessing at it — the fixture's root `AGENTS.md` is not a Claude Code path — and
every session named both tools and none named Claude Code; most stated the exclusion without
being asked, several of them naming the sibling `CLAUDE.md` that Claude Code does read.

The comparison task names no pair, and the fixture holds several, so a session is scored on
finding drift and stating it rather than on reaching the pair the ground truth records. Six
pairs were reached across the run, each of them a real drift confirmed against the fixture's
bytes: the `changelog` skill in `.agents/skills/` against the copy in `.github/skills/`, which
the ground truth names and thirteen sessions found; `alpha-a` against `alpha-b`, two skills in
one directory declaring one name; the plugin `changelog-writer`'s two manifests, at versions
`2.0.0` and `0.9.0`; `docs/AGENTS.md` against `docs/CLAUDE.md`, where the second's `scope`
array is never closed and the product states its declarations unknown rather than absent;
`packages/api/CLAUDE.md` against the directory-form copy beside it; and the agent `debugger`
declared by two files under one tree. Most sessions also reported the recognition difference
the compare page states beside the text.

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 29.2 s | 10.1 s | complete | complete | none |
| 02 | 0.866 s | 0.857 s | complete | complete | none |
| 03 | 93.6 s | 12.8 s | complete | complete | none |
| 04 | 0.86 s | 0.97 s | complete | complete | none |
| 05 | 76 s | 29 s | complete | complete | none |
| 06 | 40.9 s | 1.2 s | complete | complete | none |
| 07 | 1.146 s | 1.111 s | complete | complete | none |
| 08 | 1.17 s | 0.37 s | complete | complete | none |
| 09 | 0.82 s | 0.92 s | complete | complete | none |
| 10 | 0.753 s | 0.741 s | complete | complete | none |
| 11 | 19.8 s | 12.2 s | complete | complete | none |
| 12 | 9.5 s | 5.9 s | complete | complete | none |
| 13 | 51.1 s | 1.0 s | complete | complete | none |
| 14 | 0.9 s | 1.1 s | complete | complete | none |
| 15 | 1.15 s | 1.13 s | complete | complete | none |
| 16 | 77.3 s | 1.1 s | complete | complete | none |
| 17 | 66.0 s | 6.3 s | complete | complete | none |
| 18 | 1.19 s | 1.13 s | complete | complete | none |
| 19 | 1.94 s | 0.99 s | complete | complete | none |
| 20 | 55.66 s | 1.15 s | complete | complete | none |

No session was excluded or replaced, and no session failed a workflow it was scored on, so the
fixed denominator and the recorded count are the same twenty.

**What the sessions reported about safety.** No prohibited effect: no execution derived from
a customization, no mutation of an inspected source, no outbound request, and no MCP
connection. What the sessions raised beyond the shared consent state above was the honesty of
the consent page itself, and they raised it approvingly: that it states nothing has been read
yet, that it names what stays excluded — credentials, saved sessions, caches, installed plugin
copies, and whatever a tool generates for itself — and that the directory it shows is an
escaped presentation rather than a path anything can open.

No session read the rail's Source-diagnostic count against a Source's own `Partial · 14 files
kept a diagnostic` as a contradiction. The rail item names the unit it counts — `Source
diagnostics` — because the label is what a reader has before deciding whether to open the
panel, and every other item in its group counts the rows of a file list, so an unqualified
noun invites the rule the siblings taught.

An earlier run of the same twenty sessions reported one thing this run did not, and it is kept
because it is about the product rather than about a harness: a file's detail header carries
icon-only controls that launch a local application, and one session activated `Open in VS Code`
while probing what the icons were; the editor was already running, so nothing started and
nothing changed. This is the file-opening capability the product is specified to have, it is
activated by the reader, and the controls carry their accessible names
(`FILE_OPEN_TARGET_TEXT` supplies both `aria-label` and `title`) — which is how the sessions
were able to name them. The observation is that the names are not *visible* text, which WCAG
requires only where a visible label exists.

**What this run measured, and what SC-001 asks for.** SC-001 fixes an interval that starts when
the task prompt is presented and ends with a file's detail view open, and it says in its own words
that the interval therefore includes launching the Inspector and reaching it through the URL it
prints. This run started each session at an origin a host was already serving, so the seconds above
are the interval after that: finding a file through what the running product renders. They are a
result about the rendered guidance, not about the printed one, and the criterion is not established
by them. Twenty sessions also shared that one host, so they were not twenty independent first uses
— which is the same condition the consent state above records from the other side.

**What this run does not establish.** It does not establish anything about human first use,
which is the whole of what the criteria's earlier participant form would have measured. It
carries no capture bundle, so nothing here is sealed or independently reverifiable from
evidence artifacts: what it rests on is the per-session record above. And it is one host and
one fixture tree: a session met the customization files this repository builds for its own
tests, not a repository it had never seen.

## Release-candidate review of the study kit, and its retirement

T1061's branch-by-branch review read the sealed-capture kit against its protocol contract and
found fifteen defects, each traced to both the code and the clause it contradicted, corrected,
and given a check that fails without the fix. T1062 ran that loop to zero open concerns; the
last of them was settled by amending the contract's static-asset row to the packaged-prefix
rule the equipment could actually decide.

The kit is then removed. It existed to make a moderated human study auditable — the fixed
launch line, the study-input distribution and its digest freeze, the request ledger, the
browser proxy and its navigation grant, the reviewer processes, the inherited-IPC supervisor
and its evidence seal — and no such study will be run, because twenty first-use participants
are not available to this project. What went with it: the protocol contract, the three
`scripts/*usability-study*` modules, their contract, integration, and security suites, the
three `study:evidence:*` package commands, and the product's own readiness probe in
`src/server/cli.ts`, whose only caller was the kit. What stayed is what the evaluation reads:
the guidance, the four standardized task prompts, the response form, the ground truth, and
the scoring rubric.

The corrections are not recorded here in detail, because a table of defects in code this
release does not carry describes nothing a reader can check. What the review established, and
what this record keeps, is that the kit was read to zero open concerns before the decision to
retire it — so the retirement is a scope decision rather than a way around an unfinished
review.

## Release Constitution Check

The principle-by-principle check T1063 owns, over Constitution 5.3.0 and the release
candidate this branch produces. Each principle records what was examined, the finding, and —
where something remains open — who owns it and what would close it.

**I. Quality Above Expediency.** Four decisions in this release turned on the simplicity
tiebreaker and on the clause that a specification mandating redundancy is corrected rather
than implemented. The scan-timing criterion was withdrawn: measuring it needs one frozen host
whose exact processor model and image revision are recorded, no such host is designated, and
a figure taken elsewhere would describe that machine rather than this product. The closed
manual accessibility matrix asked for three operating systems and three screen readers over
38,880 keyed cells, which no run available to this release can produce, so SC-008 now asserts
what is actually run and the matrix records the manual checks as unexecuted rather than as
passed. The study proxy's static-asset row admitted only a manifest-listed asset, which the
equipment cannot decide without a tar dependency the kit is deliberately without; the
contract now states the packaged-prefix rule it can decide. And an owned-path requirement
that would have forced 76 tasks to name a file they do not own was corrected in both
languages. No ad hoc patch, silenced failure, or speculative abstraction was introduced to
avoid any of these.

*Resolved rather than residual.* The sealed-capture study kit was machinery with no run
behind it — twenty first-use participants are not available to this project, so the moderated
study it existed for does not happen — which is the shape this principle forbids. It is
removed in this change, together with its protocol contract, its three suites, its package
commands, and the product's own readiness probe whose only caller it was.

**II. Readable, Maintainable, Intention-Revealing Code.** Two changes here were about a name
or a comment stating something no longer true, and each was made in the change that falsified
it. The inventory's filter-generation predicate compared a history entry's stamp against a set
of tokens this page load had issued, which could only ever answer "unknown" for an entry
inherited across a reload; the question it actually needed was whether this load had purged at
all, which the session already publishes. The set and the arrival-time restamp that existed to
compensate for it are both gone, and the comments that explained them went with them. No
deviation in this release stands without its stated reason.

**III. Verification Before Completion.** Every correction in this release carries a check
that fails without it, and each was watched failing before it was accepted. The
filter-generation fix is asserted twice — a unit test over the predicate and a browser test
over the reader-visible path (apply a narrowing, leave, reload, disable, and go back) — and
both were run against the unfixed predicate first and seen to fail. A passing suite is not
treated as proof: the review that preceded the study kit's retirement read the branches its
suites did not reach, and recorded what it found sound as well as what it found unverified.

*Residual.* Seven browser cases fail on this machine and only on macOS WebKit;
all seven assert that a link is reachable by pressing Tab, which macOS does not do unless the
reader turns on Full Keyboard Access. The certified three-browser matrix is CI's, and its
result is what the release check log carries.

**IV. Documentation Is Part of the Product.** Every artifact this release touched was changed
in both languages in the same change — specification, plan, research, quickstart, contracts,
data model, tasks, and this record — and `pnpm run test:docs` gates the cross-artifact
agreement that keeps them from drifting apart. The withdrawn criterion was removed from every
artifact that asserted it rather than annotated in place.

**V. Welcoming Participation.** Nothing in this release asks a contributor to do what only a
funded study could do: the manual accessibility matrix is no longer a completion obligation,
and the first-use evaluation is maintainer-owned rather than a per-pull-request duty. SC-008
asserts the automated Level A/AA checks in all three certified browsers and four keyboard-only
workflows, which is what a contributor can actually run.

*Residual.* Manual execution against assistive technology is not performed and is recorded as
unexecuted. It needs operators this project does not have, for the same reason the moderated
study does not happen, so this is a standing property of the evidence rather than an item
awaiting a decision. What stands in its place is the automated matrix SC-008 asserts.

**Dependency and breaking-change rationale.** This is the initial published release
(`0.0.0` in tree, a `minor` changeset), so there is no earlier version to break and no
migration to provide. Every runtime dependency is declared as a caret range with the exact
resolutions owned by the committed lockfile, and each was reviewed for what it reaches at
user runtime — the record of that review is the Dependency review above.

**Every violation resolved.** No open violation of any principle remains. What remains are
the two residuals above: one is a standing property of the evidence, and the other is a
removal this record identifies rather than a question it leaves open.

## SC-008 accessibility: Not-applicable revalidation

The 18 `REVIEW-*` IDs recheck each Not-applicable rationale against the release diff and the
built package. Every one was rechecked on 2026-09-04 against `src/` and the packed `dist/` of
the tree the release gate below was run on, and every one still holds. The recheck is
agent-driven, as this repository requires such a record to say (AGENTS.md § Evidence before
conclusions): the reviewer is this session, and what each row states is the search it ran and
what that search returned, not a judgement it could not show. Four findings changed with the interface rework while their
verdicts did not — the search that replaced the inventory's path filter, the tab strips the
detail and comparison surfaces gained, the routes a Source's own surface added, and the
vendor marks that carry a colour of their own. What was looked at:

| Criteria | Rationale rechecked | What was found |
|---|---|---|
| 1.2.1–1.2.5, 1.4.2, 2.3.1 | No prerecorded or live audio or video, and no flashing | No `<audio>`, `<video>`, `new Audio`, or `.play()` anywhere in `src/`, and no media file of any format in the packed tree |
| 1.3.5 | No field collects a WCAG input-purpose value | One `autocomplete` attribute in `src/app`, `off` on the shell's search field: a query about the inspected tree, not information about the person typing it |
| 1.4.5 | No image presents text | `dist/public` contains no image file at all; icons compile to inline SVG, and the vendor marks that carry a fixed colour draw a shape rather than a word (AGENTS.md § Icon policy) |
| 2.1.4 | No single printable character activates a command | Eight keyboard handlers in `src/app`, all the same tab-strip pattern — the Source-and-kind rail and seven detail or comparison tab strips — and all of them `nextTabForKey`, which answers only `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, and `End`; any other key keeps its default so Tab still leaves the strip |
| 2.2.1, 2.2.2 | No time limit, and nothing auto-updates | No `setTimeout` or `setInterval` in `src/app`; status advances only on an explicit refresh. The one observer is the shell's `ResizeObserver` over the bar, which publishes that bar's height as a CSS length and changes no content (`App.vue` § barHeightObserver) |
| 2.4.5 | The inventory is the only standalone page | Three top-level routes exist — the inventory, a Source's own `/repository` surface, and the `/global-consent` step — and the other two are that Source's state and that consent decision rather than destinations of their own; every remaining route is a detail or comparison of the one inspection |
| 2.5.1, 2.5.4, 2.5.7 | No gesture, motion, or dragging input | No `draggable`, `dragstart`, `touchmove`, `devicemotion`, or `deviceorientation` handler in `src/app` |
| 3.3.4 | No legal or financial commitment, and no durable data modified | The inspection and session modules issue no filesystem write; FR-023 is what the mutation instrumentation proves |
| 3.3.7 | Nothing is asked twice | The inputs are the shell's one search over names and paths, the inventory's Tool and Source selects, the consent checkbox, and a comparison's two file pickers; none re-asks for information already supplied |

**The Applicable rows' automated half** is recorded above under SC-008 accessibility: 34
`AUTO-*` IDs, all passing in chromium and firefox, with `AUTO-2.1.1` failing only on the
uncertified macOS WebKit for the tab-order reason recorded there.

**The `MANUAL-*` IDs are recorded as unexecuted.** Their matrix needs three operating systems
paired with three screen readers, which this release does not assert
(contracts/accessibility-acceptance.md § Decision rule).


## The interface rework and the records it reopened

The interface rework of Phases 105–110 changed the surfaces every recorded outcome above was
observed on: the palette every surface is drawn in, the inventory's rows and its rail, the
detail head with its file facts and its previous/next moves, the invocation names a detail
states per recognition, the comparison head, and where the session's own controls sit. Two of
those moves relocate something a recorded measurement addressed by name — the scan status and
the committed generation live on the `/repository` page rather than on the inventory, and the
search over names and paths is the shell's, in the bar. An outcome taken on the tree the rework
started from is not wrong about that tree; it does not describe this one. So the records above
state what this tree produced, which is why they carry one date. Where the producing run is
CI's rather than this session's, the section that owns the record says so.

What the rework reached, and why each record had to be taken over this tree:

| Record | Why the rework reached it |
|---|---|
| The Release gate execution table | Every suite gained, lost, or changed cases, so counts taken on another tree identify no run of this one |
| SC-001 and SC-006 first-use sessions | spec.md § Measurable Outcomes requires repeating the evaluation after a material change to a primary workflow, and the rework changed the surface of all four |
| SC-008 accessibility (`AUTO-*`) | The 34 automated checks address the markup the rework moved, and Phase 105 replaced the palette every contrast check measures |
| SC-008 Not-applicable revalidation (`REVIEW-*`) | Each rationale is a reading of a `src/` the rework changed; the 3.3.7 row names the search over names and paths, which the rework moved into the bar |
| SC-003, SC-004, SC-005, SC-007 | Their fixture bytes changed, and spec.md § Release-Evidence Fixture Governance makes a fixture-byte change a new non-comparable measurement set. Phase 110 also reworked the skill, hook, and MCP detail heads that the SC-003 shared-file and SC-005 row cases observe |

Nothing here is a finding against the rework. It is why this document's evidence is of one tree
rather than of the feature's whole history.
