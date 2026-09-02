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
as exactly one served `<h1>`–`<h4>`, or — on a client-rendered page that serves no such
element — as its table-of-contents anchor slug appearing exactly once. Anything else is
reported as observed: `missing`, `ambiguous-heading`, or `ambiguous-anchor`. A request that
throws is reported as a request that did not complete.

**What the command does not decide.** What a vanished heading means, and whether the cited
sections still establish the paraphrase a citing record maintains. Both are readings rather
than lookups, and both stay with the reviewer;
[AGENTS.md](../../AGENTS.md) § Official-source verification policy states the split.

**Mutation.** The command changes nothing. It reports, and a reviewer decides what follows.

**Network runs.** None in this change. The command was exercised against its contract suite
only (`tests/contract/official-source-drift.test.ts`), which drives every decision path with
injected retrieval. The reviewed source set and any classified drift from a networked run
are recorded here when one is performed.

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

Every gate below was run on 2026-09-01 against the tree at this change's tip, after
`pnpm run build`. The counts are what each run reported.

| Gate | Command | Result |
|---|---|---|
| Format | `pnpm run format:check` | silent, exit 0 |
| Lint | `pnpm run lint` | silent, exit 0 |
| Types | `pnpm run typecheck` | silent, exit 0 |
| Unit | `pnpm run test:unit` | 50 files, 1,195 tests passed |
| Contract | `pnpm run test:contract` | 12 files, 389 tests passed |
| Integration | `pnpm run test:integration` | 10 files, 268 tests passed |
| Security | `pnpm run test:security` | 1 file, 5 tests passed |
| Package | `pnpm run verify:package`, then `pnpm run test:package` | verification silent and exit 0; 8 files, 56 tests passed |
| Performance | `pnpm run test:performance` | 2 files, 6 tests passed |
| Browser | `pnpm exec playwright test --project=chromium` | 535 passed |
| Coverage | `pnpm run test:coverage` | 72 files, 1,852 tests passed; statements 87.10%, lines 87.25% |
| Documentation | `pnpm run test:docs` | 1 file, 31 tests passed |

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

**Two projects run the study lifecycle, and running them at once starves it.** The
twenty-participant lifecycle test belongs to both `integration` and `coverage`, each spawning
its own supervisor and eight children with real pipes and no timers, and its per-subject wait
is bounded. Run concurrently on this machine — which the ordinary sequential chain never does
— one copy misses that bound and the verifier's `checkpoint` reports a failure that a
sequential run does not reproduce. Each work root is a fresh `mkdtemp` and each control
endpoint an ephemeral port, so the copies share nothing; what they compete for is the machine.

**The performance gate is the smoke pass, not a measurement.** `tests/performance/` runs one
non-gating pass over the 100,000-entry fixture and asserts harness integrity. No timing
threshold is asserted anywhere in this release.


## Outcome-manifest criteria

The frozen manifest is `tests/fixtures/outcomes/manifest.json`, **version 3**, canonical
SHA-256 `f87255e0df95ce017b6fd906508f25ae4860227212af760f4aa0eee60bbaff03`, recorded in
`tests/fixtures/outcomes/manifest.sha256`. Its 99 cases were executed by running every suite
each case names in `verifiedBy`: the eleven vitest suites through
`pnpm run test:contract`/`test:integration`/`test:security`, and the browser specs through the
three-project Playwright run recorded above. `tests/contract/outcome-fixture-manifest.test.ts`
reproduced the canonical digest and all 66 fixture digests in the same session.

| Criterion | Cases | Passed | Passed except macOS WebKit | Failed |
|---|---:|---:|---:|---:|
| SC-003 | 43 | 38 | 5 | 0 |
| SC-004 | 13 | 13 | 0 | 0 |
| SC-005 | 34 | 33 | 1 | 0 |
| SC-007 | 9 | 9 | 0 | 0 |

The six cases in the middle column are the ones whose verifying spec carries one of the
macOS WebKit link-Tab tests above: `sc003.shared-file.repository-agents-md`,
`sc003.shared-file.repository-root-claude-md`, `sc003.shared-file.repository-agents-skill`,
`sc003.shared-file.repository-claude-skill`, `sc003.shared-file.repository-root-mcp-json`,
and `sc005.row.codex.skill`. Every other assertion in those specs passed in all three
projects.

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
three-project run passed 33 in every project; `AUTO-2.1.1` passed in chromium and firefox and
failed in macOS WebKit for the tab-order reason recorded above. The certified WebKit is the
Linux revision CI runs, so the certifying result for this half is CI's, and it is assumed
rather than observed here — the same disposition T1051 records for the lower-bound matrix.
No local run stands in for it.

**The manual half is outside the criterion.** The 36 `MANUAL-*` IDs would be executed over
`3 × 5 × 3 × 8 × 3 = 1,080` keyed cells each — 38,880 cells requiring macOS with VoiceOver,
Windows with NVDA, and Ubuntu with Orca. SC-008 asserts the automated checks and the four
keyboard workflows instead, and every `MANUAL-*` ID is recorded as unexecuted rather than as
passed (spec.md § Clarifications, Session 2026-09-01).

**The 18 `REVIEW-*` IDs were performed**, on 2026-09-01, and are recorded in their own
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

**Twenty agent-driven sessions, run on 2026-09-01.** Each session was an independent
autonomous agent handed one thing: the origin one running Inspector printed. No selector, no
route, no description of the interface, and no access to this repository — a session that read
the source would have been reading the answer rather than finding it. All twenty met the same
tree, the all-kind fixture `pnpm run start:fixture` builds, served by a single host for the
whole run, and each drove its own browser and kept its own clock.

**This is an agent-driven run and is recorded as one.** What twenty agents measure is whether
the product's own printed and rendered guidance is sufficient to reach a file and to state
what the product says about it. How a person experiences the same interface is not in this
record; SC-001 and SC-006 say so in their own text, and no sentence here may be read as a
human-subject result. The run used no capture harness: the sealed-capture kit that a
moderated study would have needed was not exercised by it and has since been retired, which
the record below covers.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: one discovered file's detail view open within two minutes | 19 of 20 | **20 of 20**, 2.4 s to 63 s, median 28.6 s |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` within two minutes | 18 of 20 | **20 of 20**, 4.4 s to 115 s, median 41.2 s |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 of 20** complete |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 of 20** complete |
| Safety | SC-006 zero-critical gate | no critical issue | **none reported** |

Every session's three fields matched `tests/usability/sc001-sc006-study-inputs/ground-truth.json`
with no partial credit: source `Repository`, recognizing tools `GitHub Copilot` **and**
`OpenAI Codex`, file type `Instructions`. The tool field is the one that separates reading the
page from guessing at it — the fixture's root `AGENTS.md` is not a Claude Code path — and
every session named both tools and none named Claude Code; several stated the exclusion
without being asked.

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 26 s | 40 s | complete | complete | none |
| 02 | 47.5 s | 41.2 s | complete | complete | none |
| 03 | 19.9 s | 75.8 s | complete | complete | none |
| 04 | 3.9 s | 5.6 s | complete | complete | none |
| 05 | 35 s | 75 s | complete | complete | none |
| 06 | 17 s | 29 s | complete | complete | none |
| 07 | 2.4 s | 4.4 s | complete | complete | none |
| 08 | 42 s | 60 s | complete | complete | none |
| 09 | 60 s | 115 s | complete | complete | none |
| 10 | 16.5 s | 52.3 s | complete | complete | none |
| 11 | 3 s | 5 s | complete | complete | none |
| 12 | 26 s | 34 s | complete | complete | none |
| 13 | 28.6 s | 37.8 s | complete | complete | none |
| 14 | 22.4 s | 45.9 s | complete | complete | none |
| 15 | 62 s | 35 s | complete | complete | none |
| 16 | 34 s | 22 s | complete | complete | none |
| 17 | 33.1 s | 65.2 s | complete | complete | none |
| 18 | 63 s | 58 s | complete | complete | none |
| 19 | 40 s | 63 s | complete | complete | none |
| 20 | 23 s | 38 s | complete | complete | none |

No session was excluded or replaced, and no session failed a workflow, so the fixed
denominator and the recorded count are the same twenty.

**What the sessions reported about safety.** No prohibited effect: no execution derived from
a customization, no mutation of an inspected source, no outbound request, and no MCP
connection. One session independently enumerated its browser's requests and found all
thirty-one addressed to the host's own origin. Every session reached the personal-setup
consent page, read the four proposed directories with the origin of each value, and left the
confirmation unticked; several quoted the page's own statement that nothing had been read
yet.

Five sessions named the same thing, and none of them called it alarming: a file's detail
header carries icon-only controls that launch a local application. One of the five activated
`Open in VS Code` while probing what the icons were; the editor was already running, so
nothing started and nothing changed. This is the file-opening capability the product is
specified to have, it is activated by the reader, and the controls carry their accessible
names (`FILE_OPEN_TARGET_TEXT` supplies both `aria-label` and `title`) — which is how the
sessions were able to name them. The observation is that the names are not *visible* text,
which WCAG requires only where a visible label exists. It is recorded as an observation, not
as a critical issue.

**What this run does not establish.** It does not establish anything about human first use,
which is the whole of what the criteria's earlier participant form would have measured. It
carries no capture bundle, so nothing here is sealed or independently reverifiable from
evidence artifacts: what it rests on is the per-session record below. And it is one host and
one fixture
tree: a session met the customization files this repository builds for its own tests, not a
repository it had never seen.

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
built package. Every one was rechecked on 2026-09-01 against `src/` and the packed `dist/`,
and every one still holds. What was looked at:

| Criteria | Rationale rechecked | What was found |
|---|---|---|
| 1.2.1–1.2.5, 1.4.2, 2.3.1 | No prerecorded or live audio or video, and no flashing | No `<audio>`, `<video>`, `new Audio`, or `.play()` anywhere in `src/`, and no media file of any format in the packed tree |
| 1.3.5 | No field collects a WCAG input-purpose value | No `autocomplete` attribute anywhere in `src/app` |
| 1.4.5 | No image presents text | `dist/public` contains no image file at all; icons compile to inline SVG that inherits `currentColor` |
| 2.1.4 | No single printable character activates a command | The one keyboard handler is the kind rail's, and `nextTabForKey` answers only `ArrowUp`, `ArrowDown`, `ArrowLeft`, `ArrowRight`, `Home`, and `End`; any other key keeps its default so Tab still leaves the rail |
| 2.2.1, 2.2.2 | No time limit, and nothing auto-updates | No `setTimeout` or `setInterval` in `src/app`; status advances only on an explicit refresh |
| 2.4.5 | The inventory is the only standalone page | Every other route is a detail, comparison, or consent step of the one inspection |
| 2.5.1, 2.5.4, 2.5.7 | No gesture, motion, or dragging input | No `draggable`, `dragstart`, `touchmove`, `devicemotion`, or `deviceorientation` handler in `src/app` |
| 3.3.4 | No legal or financial commitment, and no durable data modified | The inspection and session modules issue no filesystem write; FR-023 is what the mutation instrumentation proves |
| 3.3.7 | Nothing is asked twice | Two inputs exist: the inventory's path filter and the consent checkbox, neither of which re-asks for information already supplied |

**The Applicable rows' automated half** is recorded above under SC-008 accessibility: 34
`AUTO-*` IDs, all passing in chromium and firefox, with `AUTO-2.1.1` failing only on the
uncertified macOS WebKit for the tab-order reason recorded there.

**The `MANUAL-*` IDs are recorded as unexecuted.** Their matrix needs three operating systems
paired with three screen readers, which this release does not assert
(contracts/accessibility-acceptance.md § Decision rule).


## Interface rework: what it invalidates, and what release completion repeats

The interface rework of Phases 106–109 changed the surfaces every recorded outcome above was
observed on: the inventory's rows and its rail, the detail head and its previous/next moves,
the comparison head, and where the session's own controls sit. Two of those moves relocate
something a recorded measurement addressed by name — the scan status and the committed
generation now live on the `/repository` page rather than on the inventory, and the search over
names and paths is the shell's, in the bar. So the outcomes above are not wrong about the tree
they were taken on; they no longer describe this one, and a release candidate cut from this
tree repeats them rather than citing them.

What is invalidated, and why:

| Recorded outcome | Why the rework invalidates it |
|---|---|
| The Release gate execution table | Its counts are what each run reported on the pre-rework tree. Every suite has since gained, lost, or changed cases, so the numbers no longer identify a run of this tree |
| SC-001 and SC-006 first-use sessions | spec.md § Measurable Outcomes requires repeating the evaluation after a material change to a primary workflow. The rework changed the surface of all four |
| SC-008 accessibility (`AUTO-*`) | The 34 automated checks were recorded against the pre-rework markup, including the controls the rework moved |
| SC-008 Not-applicable revalidation (`REVIEW-*`) | Each rationale was rechecked against a `src/` the rework has since changed; the 3.3.7 row names the inventory's path filter, which is now the shell's search control |
| SC-003, SC-004, SC-005, SC-007 | Their fixture bytes changed, and spec.md § Release-Evidence Fixture Governance makes a fixture-byte change a new non-comparable measurement set |

What release completion repeats over the reworked tree, in this order:

1. `pnpm run build`, then `pnpm run verify:package` and `pnpm run test:package`.
2. Every gate in the Release gate execution table, recording the counts each run reports.
3. The three-project browser run in CI, which is where the certification matrix is exercised.
4. The SC-008 automated checks and the `REVIEW-*` recheck, against this tree's `src/` and its
   packed `dist/`.
5. The outcome-manifest measurement for SC-003, SC-004, SC-005, and SC-007, recording the
   manifest version and canonical digest that identify the new set.
6. The twenty agent-driven sessions for SC-001 and SC-006, against a build of the candidate,
   recorded as an agent-driven run.

Nothing here is a finding against the rework. It is the list of what a release from this tree
owes, written down while the reason is fresh rather than reconstructed later from a diff.
