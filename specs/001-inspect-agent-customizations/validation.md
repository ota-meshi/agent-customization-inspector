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

**One direct declaration is added, and no version is accepted in this review.** The
`@typescript-eslint/parser` this repository's own ESLint rule is tested against moves from a
transitive resolution to a declared devDependency: `RuleTester` takes its parser from the test
rather than from a config, and a test that imports a package the manifest does not declare is
resolving a version nothing here controls. It reaches no runtime, no published payload, and no
public contract, so there is no migration to provide — the dependency table in research.md
records it beside the other lint tooling.

Routine
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

**The rail's personal-setup entry says what it counts, and says `Scanning` while a read is
out.** Two things were left in that entry when the status tables became one. Its own aggregate
table still spelled one member state `partial` — the word a reader meets nowhere else now, and
the one fifteen of twenty first-use sessions stopped at — so that state reads `with
diagnostics`, the words the Repository entry beside it already uses. And a counted state named
no unit: `1 partial` said one of what. The counted states now name the members they count —
`1 home with diagnostics`, `2 homes not inspected`, `1 home failed` — in the word every member
is called by (`GLOBAL_MEMBER_TEXT`). The entry's ranking is unchanged, `idle` above `ready`
included: it stays because one unread home beside three read ones must not be reported as
four read.

The entry also said `Not inspected` while a read was running, which is a false sentence rather
than a presentation: a batch publishes no member Source until it commits, so the entry was
answering from an empty list about homes being read at that moment. It says `Scanning` — the
word the same entry already says while one member's own rescan runs. Two things make a read
out: a batch the snapshot carries, which is another tab's confirmation or this one's after a
reload, and this client's own confirmation, which answers only once every admitted member's
scan settled. `view-state.ts` § runningGlobalBatch publishes the first, so the inventory and
the personal-setup page answer for one read with one predicate rather than two copies of it.

What is not covered by a check is the entry's own branch: the RPC channel is a WebSocket, so a
browser test cannot hold the confirmation open long enough to read the rail while it is out,
and the unit project has no single-file-component compiler. What is covered is the predicate
that decides it and the wording it selects; the branch itself was read on a fixture launch.

**A running read is a candidate in that ranking, not a verdict over it.** A same-preview retry
runs over members that are already published, so a read reported as `Scanning` on its own
would hide the `failed` member the reader is retrying for — and would disagree with the pill
beside it, which is derived from the same value. The read enters the existing rank calculation
as a `scanning` candidate instead: it outranks `idle` and `ready` and loses to `failed` and
`partial`, so one effective state decides both the words and the warning treatment (FR-030;
WCAG 4.1.3). What the automated gates reach is the predicate that supplies the input —
`view-state.ts` § runningGlobalBatch, asserted over every batch phase — and the ranking with
no read out, which every rail assertion already reads. The fold itself is read on a fixture
launch, for the reason recorded above: the branch needs a read held open, the RPC channel is a
WebSocket, and the unit project has no single-file-component compiler.

**A source surface's type is this product's, and the personal setup states its generation.**
Removing the rail entry left four things behind, each fixed here. The inventory's live region
read a member's status word alone, and `ready` and `partial` are one word, so a refresh that
found a member newly partial announced the sentence it had announced before; it now carries the
note the status table holds for exactly that case (WCAG 4.1.3). A comparison's facts line named
the family and the directory but not the member, so two members whose home variables point at
one directory identified two sides identically — the member is named there now, as the row's
accessible name already named it. The personal-setup surface stated no committed generation at
all, which FR-030 requires of each Source family's own surface; it states the Global sequence's
once, in the Repository panel's own idiom. And the inert `<pre>` that holds a viewer's box until
Monaco mounts was laid out in the browser's own monospace metrics while Monaco used its
platform default — 12px on macOS, 14px elsewhere — so the box jumped at mount, further under
text enlargement, which is what the placeholder exists to prevent. The two now share one
declaration: `--aci-source-font-size` and `--aci-source-line-height` in `rem`, which
`monaco.ts` reads off each editor's own container. Measured on the hook detail's five viewers
against the value in force that day, the entry link below them moves 0–12px at mount instead
of 2–29px, and 12–36px instead of a doubling, at 200% text size; what is left is the
horizontal scrollbar Monaco reserves and a `<pre>` does not. What that measured is the shared
declaration rather than any particular size: the placeholder and the editor read one value,
so neither can predict a size the other does not take.

The size itself is the interface's own scale, not the editor's: source text is reference
material the prose around it explains, so it sits one step below the 0.8125rem body at
0.75rem, and monospace reads larger than proportional at one size — which this product's own
rows already account for. It is therefore smaller than Monaco would have drawn on every
platform whose default is 14px, and the same size as its macOS default by coincidence rather
than by following it.

**Every Monaco host is laid out in the product's own type.** `typeMetricsOf` applies each
host's computed type metrics to the editor it creates, so a host that does not declare
`--aci-source-font-size` and `--aci-source-line-height` hands Monaco the 13px body type
instead. Three did — the MCP `DeclarationDiff`, the plugin `DeclarationDiff`, and the plugin
`SourceDiff` — and all nine now declare the shared tokens. `tests/e2e/source-type.spec.ts`
freezes the computed font size and line height of every Monaco host on nine routes, and it
reads the host element this product owns rather than Monaco's own text: with the declaration
absent Monaco falls back to its own platform default, which on macOS is the same 12px this
product declares, so a check that read the text would pass there on exactly the surface it
exists to catch. Removing the declaration from those three hosts was
watched failing three of the nine before the check was accepted.

**The rail's `Source diagnostics` entry is gone, and one table states a Source's status
everywhere.** Five first-use sessions across two runs read the rail's
`Inspected · some files kept a diagnostic` against that entry's `0` as one population counted
twice. The entry was the thing to remove rather than the label to narrow: it listed no file,
which is the rail's own membership test, and the only Source-scoped diagnostic code —
`root-unreadable` — fails the scan and commits no inventory, so on every screen that had an
inventory to show it read `0`. A Source's own diagnostics are now stated on that Source's own
surface: the Repository's on `/repository`, each consented member's on its row of the
personal-setup page. That is also where the failure sentence and its reason first stand
together — `The last rescan failed…` used to be on one screen and the retained Diagnostic that
explains it on another. With the entry gone, `SOURCE_STATUS_TEXT` went too: one status reached
a reader as `Inspected` on the rail and `Partial` on the Repository page, and nothing said the
two were rows of one table. Every surface reads `SOURCE_STATUS_STANDALONE_TEXT` now, and draws
its note only where it has nothing more exact — the Repository page and the member rows state
the count itself.

**A rescan's correlation is the command's own, and the box a viewer will fill is reserved
before it fills it.** Two surfaces were showing a finished scan's record as the running one's:
a command answers only once its scan settled, so the request ID a slot held while the next
command was out named a scan that had already completed, and the progress a refresh brought
back for it rendered under "This scan". The dispatch now drops that correlation, which is one
rule in one place rather than a condition in each surface, and the copy states the command —
`Rescan in progress.` — because this side cannot tell a running scan from one queued behind
another and must not claim the distinction. Separately, the hook detail's comparison entry sat
below its declaration viewer and could move while Monaco mounted; it now precedes the viewer,
as the sibling surfaces do, and the first-click browser regression passes in Chromium, Firefox,
and WebKit. What `SourceViewer`'s own placeholder holds still while the editor mounts is
recorded above, with the residual that measurement left.

**Two certification jobs the local gates could not see now pass.** The gates below run on
one machine, and two of CI's run elsewhere. `tests/unit/host/file-opener.test.ts` built its
absolute fixtures from the path separator alone, which on Windows names a path relative to
the current drive: the module's own `resolve` qualified it and fifteen assertions then named
a path the probe never saw. The fixtures are built from a resolved root instead. And the
hook comparison's entry from a carrier's own detail page pressed a link that the declaration
viewer above it pushes down as it takes its height, so the press landed where the link no
longer was and the address stayed the carrier's; the press is retried until the address
moves, which is what a reader does. Neither is observable on this machine — the first needs
Windows, the second the certified Linux WebKit — so CI is what establishes them.

**The launcher exclusion is one comparison, and two residuals stand beside it.** A spelling is
not where a path is: an outside `PATH` entry or configured `EDITOR` can be a symbolic link into
the Repository, and the executable resolver keeps that outside spelling, so a lexical comparison
alone would offer a repository-supplied executable as an editor and then start it (FR-020,
FR-022). The probe therefore compares every candidate as it is spelled and where it physically
is, against the Repository root's own physical location — which startup establishes and passes
beside its spelling — and against each proposed personal-setup root's spelling.
`tests/unit/host/file-opener.test.ts` stages a real aliased tree for both candidate directions,
and `tests/unit/cli.test.ts` establishes the existing-root handoff.

Two review rounds asked for more: a launch-time re-authorization against the roots the session
then holds, and a macOS launch by the bundle path rather than the catalog's application name.
Both were built and both were withdrawn. The first rested on reading FR-013's no-I/O rule as
forbidding the probe's own resolution; FR-013 now states that editor-launcher discovery is the
one operation whose resolution the operating system may route through a proposed root, which
leaves the split with nothing to buy but the repaired-root case — a launch on a root that does
not exist, then a `PATH` entry pointing into whatever the reader creates there. The second is
the same proposal the `osascript` spelling already declines, and FR-019 declines it for the same
reason. What each leaves open is recorded where the launch is described
(contracts/http-api.md § open-file) rather than closed with machinery.

**A VCS internal is excluded by the name the filesystem gave, and the allowlist contract now
says so.** A review reported that a case-insensitive volume presenting Git's directory as `.GIT`
is walked, and a volume-identity comparison — an `lstat` pair per candidate name — was built for
it. It is removed. `VCS_INTERNALS`' own comment had already recorded this case as an accepted
residual, with its reason and its bounded outcome: what decides is the volume's name resolution,
which no platform check answers because macOS ships both kinds of volume, while folding case by
platform would hide a `.GIT` a reader authored on a case-sensitive one — and entering one costs
over-listing, on a surface whose whole claim is that being listed is not being loaded. Reaching
it needs a store the reader created under that spelling before the VCS used it, which is the
adversarial-input shape FR-019 declines to build for. The tree held two committed statements of
this rule and they disagreed; `contracts/inspection-path-allowlist.md` is amended in both
languages to the one the code has always implemented and reasoned about.

**One non-kind list is what the comments describe.** The five production comment families and
the browser test that still described two, and the removed Source-diagnostics entry beside
them, were corrected together: `InventoryRail.vue`, `InventoryFilters.vue`,
`inventory-filter-state.ts`, `main.css`, `index.vue`, and `inventory-rows.spec.ts`, whose loop
over a one-member list is now the single case it always ran. Two of those went further than
their wording. The rail's status comment recorded an experiment rather than a property, so it
states why a number beside the word arrives without its answer. And `.aci-notices` was a global
utility whose stated reason — that the diagnostics list and every detail's failure state drew
the same box — went with the list: one component renders it, so the frame is now that
component's own block in its own scoped style (AGENTS.md § Stylesheet scope policy).

Every gate below was run on 2026-09-05 against this tree. Build, package, performance, and
browser verification ran from an isolated copy of the same working tree so an already-running
CLI in the shared workspace was not disrupted; the artifact-dependent gates used the build
produced there. The counts are what each run reported.

| Gate | Command | Result |
|---|---|---|
| Format | `pnpm run format:check` | silent, exit 0 |
| Lint | `pnpm run lint` | silent, exit 0 |
| Types | `pnpm run typecheck` | silent, exit 0 |
| Unit | `pnpm run test:unit` | 54 files, 1,251 tests passed |
| Contract | `pnpm run test:contract` | 12 files, 405 tests passed |
| Integration | `pnpm run test:integration` | 11 files, 271 tests passed |
| Security | `pnpm run test:security` | 1 file, 5 tests passed |
| Package | `pnpm run verify:package`, then `pnpm run test:package` | verification silent and exit 0; 8 files, 56 tests passed |
| Performance | `pnpm run test:performance` | 2 files, 4 tests passed |
| Browser | `pnpm exec playwright test --project=chromium` | 577 passed |
| Coverage | `pnpm run test:coverage` | 77 files, 1,927 tests passed; statements 86.07% (6,023/6,997), branches 71.86% (3,558/4,951), functions 87.46% (1,200/1,372), lines 86.37% (5,900/6,831) |
| Documentation | `pnpm run test:docs` | 1 file, 41 tests passed |

**A search typed from a detail page reaches the field.** The shell's search navigates to the
inventory, and the inventory restores the row the reader followed — so focus left the field
between the first character and the second, and every character after it landed nowhere. Typing
is a new question about the list rather than a return to where the reader was, so the recorded
point is dropped before that navigation. The browser regression types a term the followed row
still matches, which is exactly when the restore would fire; it was watched failing first.

**One instance of the open control serves a sequence of files, and a launch belongs to one of
them.** The in-flight launch was a flag, so it stayed raised after the reader moved through a
skill's tree and disabled another file's button for a launch that was never about it — for as
long as the launch that is out takes, which is precisely the terminal-editor case the flag
exists for. It holds the file it was made for instead, and the control disables only when that
file is the one on screen; a settlement clears only its own request, so an earlier launch's
answer cannot clear a later file's. No gate reaches this: the browser suite may not activate a
launch at all, and the unit project has no single-file-component compiler.

**The consent panel no longer reports settled rows while a read is running.** Its one sentence
covered this tab's own confirmation and a batch the snapshot carries, but not an accepted enable
this page has not taken in — another tab's, or this one's across a reload — whose batch has not
reached the adopted snapshot. With published rows on screen that state read as a finished count
while a read was out. It says a read is running and names `Refresh status`, which the panel
already offers, so nothing moved.

**A running personal-setup read is announced.** The rail's entry changes to `Scanning` before a
batch commits, and the page's live region said nothing until the first member Source arrived, so
a reader who cannot see that entry was told nothing at all — and during a retry over published
members, the sentence stated statuses without saying a read was out
(contracts/accessibility-acceptance.md § 4.1.3). It says both now, the members first so the
state a reader must act on still leads. Like the rail's own ranking fold, the branch needs a read
held open and is read on a fixture launch rather than asserted.

**A lower artifact cannot relax a requirement, so FR-013 says what the launcher probe does.**
The prohibition read "no proposed-root filesystem I/O" without qualification while the contract
recorded an exception to it, which is a contract amending a requirement. It cannot: FR-013 now
states the rule and its one exception itself, in both languages — no operation of the product's
own takes a proposed root or a path below one as its operand, and editor-launcher discovery is
the one whose operands are the machine's own configuration and whose resolution the operating
system may route through such a root, because FR-022 requires each launcher to be resolved
before the host binds its port and asking whether a candidate is executable examines wherever
the reader's own spelling leads. It enumerates, reads and publishes nothing from there, and the
four eligible entries stay excluded from what it may offer.

**macOS still hands LaunchServices the application name, and the residual is recorded rather
than closed.** A review asked for the bundle the authorized launcher sits inside to be resolved
and launched by path, because a name is resolved against every bundle LaunchServices has
registered and an inspected repository could ship a second one of that name. That was
implemented and then withdrawn: the same file already declines the same proposal for the
`osascript` spelling, on the grounds that it is the adversarial-workspace model FR-019 rejects
and that the machinery it asks for is what FR-019 forbids adding. The distinction offered for
treating the two differently — that `PATH` is filtered by this product while the LaunchServices
name space is not — was too thin to carry a mechanism, and `env-editor` publishes the name this
launch has always used. The contract states the residual where the launch is described.

**The source-type regression reads what the reader sees as well as what the product declared.**
It read the parent of the *nearest* Monaco root, which inside a diff is Monaco's own wrapper: a
diff mounts one editor per side, so the element read was Monaco's and reported the product's
cascade back to itself. Breaking the option wiring so the editor laid out at 12px/18px left it
passing. It now reads the outermost root's parent for the declaration and the visible
`.view-lines` for what was actually laid out, and each route names the host it is about — which
is what turned up a ninth host no route had ever reached, because two of them selected the same
first visible editor. Both halves were watched failing: the tokens removed from three hosts, and
`typeMetricsOf` returning Monaco's own defaults.

**The consent panel says a read is in progress, and names what it is reading.** Two of its
sentences claimed more than the projection establishes: `These directories are being read now`
stood over all four rows while a retry reads only the subset the same preview can retry, and
`N of these directories are being read now` counted a batch whose phase can be `waiting` —
queued and not yet started, and read from the last refresh at that. Both now say `is in
progress`, which is the form the Repository's own `Rescan in progress.` already carries for the
same reason: this side cannot tell a running read from one queued behind another and must not
claim the distinction. The first-consent and retry cases are two sentences rather than one — the
retry names its count from the retryable subset the snapshot already carries, and splits on the
same value the confirm control's own label switches on, so a press that says `Try the failed
members again` cannot be answered by a sentence that says `these directories`. The fourth
sentence changed with them, because a family states one thing one way: the read this page has
not taken in is `in progress` too.

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

**The coverage percentages are a run's, not a constant.** This tree's run reported the 77
files, 1,927 passing tests, and percentages recorded in the row above. No threshold is asserted
on them anywhere.

**The performance gate is the smoke pass, not a measurement.** `tests/performance/` runs one
non-gating pass over the 100,000-entry fixture and asserts harness integrity. No timing
threshold is asserted anywhere in this release. The checked-in reference profile
`sc002-smoke-reference-v2` describes a hosted Ubuntu 24.04 x86_64 runner on Node 24.18 and was
minted because the profile's benchmark fields changed, its own rule making any field change a
new, non-comparable ID. It is the reference these observations are read beside and not a claim
about where they were taken: nothing compares the executing environment with it, so the run
prints its own. The pass on 2026-09-05 ran on this machine — arm64, Node 24.14.0 — and observed
the request-correlated status at 344.7 ms and the request-committed operable inventory at 500 ms
after the rescan was dispatched, the filter feedback at 25.1 ms and the selection feedback at
45 ms; the global setup prints these for whoever reads the log, and they describe this
machine.

**The consent page states a finished read as finished.** One sentence stood for two states of
the confirmation: while it is out, and after the host answered. The host answers once every
admitted member's scan is terminal, with the batch committed
(contracts/http-api.md § enable-global), so the second of those is a read that is over and a
result this page is fetching — and the sentence said `Reading … is in progress` of it, into a
live region. The states are two branches now, the second saying `Reading finished. The result
is loading.` with no count, because nothing was read on this side, and without the destination
clause the running sentences carry, because the commit already put the files on the inventory.
The rail was already right: `globalReadInProgress` counts `submitting` and never `answered`.

This does not reopen the SC-001/SC-006 record. The consent workflow is scored on naming the
proposed directories *before* they are read (`ground-truth.json` § workflows.consent), which
is a step the confirmation has not been given at; the state whose wording changed cannot occur
until after it.

**Two comments named requirements the specification no longer has.** `view-state.ts` explained
the consent failure path as `FR-040/FR-041 removed`, and a checklist iteration record said a
2026-07-20 refinement replaced domain classification `with FR-041 propagation`. Both were
written when those requirements existed; a reader who looks either up now finds nothing, which
is what the commenting policy's "open the artifact before naming it" exists to prevent. The
first names the clause that governs today (contracts/http-api.md § Common results and errors)
and the second says what the refinement did rather than the identifier it did it under. A sweep
of every `FR-`, `QR-`, and `SC-` identifier cited under `src/` against the ones spec.md defines
now reports none missing.

`SC-002` is the one identifier that stays without being a criterion, and the withdrawal
clarification now says so: the performance harness keeps the `sc002-` prefix its files were
built under, because that prefix is a recorded digest's subject, and a task or checklist item
spelling `SC-002` names that harness.

**The tarball is what the release policy describes.** `npm pack` produces 186 files: `dist/`,
the two `docs/images` screenshots, both readmes, the licence, and the manifest. `bin` points at
`dist/cli.mjs` and that file is in the tarball; the bundled `THIRD-PARTY-NOTICES.txt` is
generated from the browser bundle and carries each bundled package's own licence text; no
`CHANGELOG.md`, no `specs/`, no tests. `verify:package` passes over the same tree.

**The screenshots were retaken against this tree, and one did not move.**
`docs/images/comparison.png` is retaken: the source type is the `0.75rem`/`1.0625rem` the token
now carries, and all three diff blocks fit where the last block was clipped.
`docs/images/inventory.png` came back byte-identical to the committed file — the same SHA-256 —
because nothing the interface rework left to do reaches that screen and the source token no
inventory row reads. Both readmes' alt text still describes what its image shows, so neither
changed.

**What this round checked mechanically, and what it did not.** Exhaustive over the tree: every
`§` citation and `{@link}` added since the last round resolves to a file, heading, or
declaration that exists; no exported name and no component is unreferenced; no reactive value
is declared without a reader; every `DiagnosticCode` the registry declares is emitted and none
is emitted that it does not declare; no stylesheet rule is declared without markup that renders
it; every edited Markdown file has its counterpart edited in the same change; `git diff --check`
reports nothing outside the vendored skills. Read rather than swept: the server diff — the
commit's compute-then-apply restructuring, the launcher probe, the traversal error policy — and
the inventory filter tables. The class-ownership sweep reports two names in both the global
sheet and a component; one is a comment naming the global rule, and the other is
`.aci-compare-side p`, whose subject is the `p` the component renders, which is where that
policy puts it.

**A launch token has to keep its identity, so it is a `shallowRef`.** The open control tells one
file's launch from another's by holding the call itself and comparing it by reference. A deep
`ref` hands back `reactive(value)` for an object, so the token read out was never the token put
in: every settlement read as some other call's, which left the control disabled on a launch that
had already answered and never showed its failure. Measured rather than recalled — a deep `ref`
returns a proxy for a plain object and the same object for a DOM element, which is why the
element refs beside this one are ordinary `ref`s and only this one moved. A sweep over every
`ref` in `src/app/` whose value is compared with `===` found no other: the rest hold template
elements or a string union.

Neither suite can reach it, and that is recorded rather than repaired: no browser test may
activate a launch at all, and the unit project compiles no single-file component. The reason the
kind matters is written where the token is declared, so the next reader does not simplify it
back.

**A device failure is the machine's condition, and the closed errno set now says which those
are.** A round read the exact-target probe's `EIO`/`ESTALE` handling as violating the rule that
an environment failure aborts the attempt. A previous round of this record answered that it did
not, on the ground that the failure was confined to one operation. That answer was wrong, and
what settles it is the sentence the per-file outcome actually shows: `file-unreadable` says the
file may have been removed or its permissions may deny reading, and that the other files were
unaffected. On a failing device or a vanished mount none of the three is true, and the third is
exactly what such a failure makes unknowable — so folding one into a per-file outcome publishes a
partial generation that states a condition of the machine as a property of the reader's content,
which the Constitution's abort rule exists to prevent.

The fix is not a second errno allowlist beside the first, which is what the earlier answer was
right to refuse. It is the membership of the one closed set the specification already permits:
`EMFILE`, `ENFILE`, and `ENOMEM` are joined by `EIO` and `ESTALE`, the two the codebase already
named as environmental wherever it drew the line, and the set is named for what it holds rather
than for one of its causes. Every call site that ruled out the machine's own failures before
classifying a path keeps doing exactly that, and the integration suite injects a device failure
on one file and watches the attempt reject rather than commit — run against the old set first,
where it published the file as unreadable.

**The consent page's status region says what the page's status is.** Its scan-status sentence
and its not-this-page's-operation sentence each carried `aria-live="polite"` inside a block that
appears with the state it describes, so each region was created with its text already in it and
announced nothing (W3C ARIA22). Those attributes are gone, and the always-mounted region carries
whichever of the page's three status sentences is current — one at a time, because the three
states are exclusive.

The same string then reaches two nodes, and that is the design rather than a duplicate: the
region says a state changed, the visible sentence is the state itself, and a reader meets each
in its own way. It is the shell's own shape, where `errorAnnouncement` and the visible
`.aci-error` paragraph carry one string (`App.vue`). What a reader must not be shown twice is
the visible copy, so the consent walkthrough asserts the panel's copy by the panel and the
region's by the region, rather than counting the page's nodes: the region is hidden by
`clip-path` on a 1×1 box, which no visibility filter separates from real content.

**The list of files in no kind says which empty it is.** Its own comment claimed nothing there
could be narrowed away; the Source selection and the search both narrow it, because a file there
belongs to a Source and has a path like any other — only the tool selection cannot, and the page
offers no tool control on it. So an empty panel was stating "No files." over a scan that had
admitted several. It now tells the two apart the way every kind's list does, with the same
sentence and the same way out.

**A document one panel is holding is not read again for another.** The plugin comparison adopts a
carrier's own response for the file pair, and now the manifest pane's slots as well. One
direction only, and the lifetimes are the reason: the manifest pane outlives a file selection,
while the file pane's slots are dropped on every one, so a manifest adopting a file slot would
hold a document with no request of its own to restore it. Without this, selecting the file that
is a plugin's own manifest read a document the view was already showing one pane over, and a
failure of that read left the file pane stating nothing while the bytes were on screen beside it
(contracts/http-api.md § Comparison views).

**The checklist's log now closes what it opened.** Its dated entries record mechanisms this
release does not carry — a scan-timing sampling protocol, a twenty-person study's obligations, a
row for a vanished-entry taxonomy — each recorded as added and none recorded as gone, and one
iteration's finding was written in the present tense as though it still stood. The entries are
what a change log is for and are not erased; what was missing is the entry that closes them,
which is now written, and the present-tense finding is stated as that iteration's.

A later round read the documentation policy's "never write the superseded name or requirement"
as forbidding those entries outright. It cannot be read that way and leave the artifacts it
names able to do their job: a `Clarifications` question asking whether two requirements are
still required is unanswerable without naming them, and an iteration that added something the
release later dropped is a log with a hole in it until an entry records the drop. The policy now
states the two things it actually forbids — presenting a superseded name as current, and
explaining the text that was replaced — so the absolute reading is not available to derive
again.

**The editor a configured value names is the one that is classified.** `EDITOR` reads two ways
no lexical test separates — a path with spaces in it, and a command carrying flags — and the
probe read only the first, taking the value's last path segment as the editor's name. For
`vim -u /tmp/minimal.vim` that segment is a file the flags name, so the catalog reported an
unknown editor, an unknown editor is non-terminal, and the reader's own editor was replaced by
whatever `vi` resolves to. Both readings are tried now, the path one first so
`/Applications/My Editor.app/…/vim` keeps working, and the command one when it names no terminal
editor. The value that runs is still the configured one and flags are still never honoured; only
the classification changed. Measured against the catalog: `nvim -u /tmp/minimal.lua` resolved to
`minimal.lua` before and to `neovim` now.

**`@typescript-eslint/parser` is a declared devDependency, and the dependency review says so.**
This repository's own ESLint rule is tested through `RuleTester`, which takes its parser from the
test rather than from a config, so the test imported a package the manifest did not declare and
resolved whatever version `@nuxt/eslint` happened to bring. The lockfile gains the direct link
and no package: it already resolved the same version transitively, so the licence set and the
bundled notices are unchanged, and the review's own entry no longer reads as though nothing was
added.

**CI certifies one candidate tarball on six environments, not the bytes a release publishes.**
The comment beside the pack step said the six samples exist to prove something about "the one
that gets published". They cannot: `Release.yml` packs its own tarball from its own checkout, and
this record already states that two packs of one source differ in the build id Nuxt writes into
the bundle. What the six jobs establish is that one tarball built from this commit installs and
runs on every lower-bound environment, which is what the comment and the task now say. The claim
that one pack's identical bytes reach all six jobs is unchanged, because that is what happens.

**A confirmation that never arrived does not say a read finished.** The consent command moved to
`answered` on every answer, and `answered` is the state whose sentence says the reading is over.
For a delivery failure it is over in neither direction: no job was created, and the same failure
can be an acceptance whose response was lost. The failure path now enters the state that says
exactly what is known — the confirmation went, its outcome did not come back, the host may
already be reading — which the page already had a sentence for, so nothing new is worded. The
unit case drives an `enableGlobal` rejection and reads the state during the refetch; it was run
against the old transition first, where it read `answered`.

**The note that dates the status rows appears in every state that dates them.** The rows are the
adopted snapshot's and nothing on the page updates by itself, so whenever a read exists that this
page has not taken in, the summary and the rows are two moments and one sentence has to say
which is which. It was derived from the batch the snapshot carries alone, which is one of three
ways to reach that state: the other two — an operation the server holds that this page has not
adopted, and this page's own confirmation before its refetch lands — are the ones a reader is
most likely to be looking at, and the note was hidden in both. All three now derive it, and all
three go false exactly when the refetch adopts.

**Two tables were not the shape they declared.** The dependency baseline's Node.js row carried an
unescaped `||` inside a code span, which GFM reads as a cell separator: the row rendered as five
cells against a three-column header, so the engine range and the reason it holds landed in the
wrong columns — the evidence destination T001 names, unreadable in the rendered page. Both
languages escape it now. Sweeping every table in `specs/` for the same shape found one more, and
it is a shipped vendor contract: the Codex Global rule table declares eight columns while its
rows carry nine, so GFM dropped the last cell of each — the Evidence column, whose entries are
what QR-004 puts in the vendor contracts, rendered the Status note instead and the evidence IDs
did not render at all. The header names the ninth column now, as both sibling contracts already
do, and the one row that carried no status carries an explicit empty one. The frozen presentation
allowlist is a different table in the same file and its digests are untouched.

**A kind owns its model, and a primitive with one meaning is shared.** The comparison
clarification said no module at all is shared across kinds. Seven comparison pages share the side
picker and three share the recognition table, each with its own stated reason: one drawing
rendered per kind is one rule kept in several places. The clause now draws the boundary it
meant — route, page, composable, and the components that render a kind's own model are the
kind's; a presentation primitive whose inputs and meaning are identical is shared — and the
picker's own comment no longer counts six pages where there are seven.


## Outcome-manifest criteria

The frozen manifest is `tests/fixtures/outcomes/manifest.json`, **version 3**, canonical
SHA-256 `5fe2e9e6b4978e1201d4bb44efaaaa82df86089c35a64d416659c756a237d8d5`, recorded in
`tests/fixtures/outcomes/manifest.sha256`. Its 99 cases were executed on 2026-09-05 by
running every suite each case names in `verifiedBy`: the vitest suites through
`pnpm run test:contract`/`test:integration`/`test:security`, and the browser specs through the
whole Chromium suite, 577 tests, all passing in the one run the release-gate table above
records. `tests/contract/outcome-fixture-manifest.test.ts` reproduced the canonical digest and
all 66 fixture digests in the same session.

The digest is read from the manifest rather than carried forward: an earlier record named a
value the checked-in bytes no longer had, and the contract suite could not have caught it
because it compares the manifest against its own companion file and reaches no record in
`specs/`. What keeps the two together is that this line and
`tests/fixtures/outcomes/manifest.sha256` are written from the same command in the change that
moves the bytes.

The set is non-comparable with the one before it: `tests/contract/host-startup.test.ts` changed
when the closed environment-failure errno set was renamed for what it holds, which moved that
fixture's digest and the canonical manifest digest with it. spec.md § Release-Evidence Fixture
Governance makes a fixture-byte change a new, non-comparable measurement set; the manifest
version stays at 3, because that governance requires an increment for a case, required-class, or
expected-outcome change and this is none of them — the same 99 case IDs across the same four
criteria, each with a nonzero count for every required class.

The set before it was non-comparable with the one recorded after the interface rework for its own
reason: five referenced fixtures changed, all of them for the removal of the rail's
`Source diagnostics` entry. The
three instructions inventory specs — `claude-`, `codex-`, and `copilot-` — dropped the
assertions that opened that entry and read an empty list, and the Codex one now counts four
tabs where it counted five. `inspection-safety.spec.ts` reads `Inspected` where it read
`Partial`, because one table states a Source's status everywhere, and no longer counts the
root failure under an entry that does not exist. `settings-config-inventory.spec.ts` ends its
rail walk at `Files in no kind`, one step from the last kind rather than two. spec.md
§ Release-Evidence Fixture Governance makes that a new measurement set. The manifest version stays at 3, because that governance requires an increment for a
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
skip link. The certified WebKit is the Linux revision CI runs, so the certifying result for
this half is CI's run of this tree's own commit, over the three pinned revisions, and it is not
reproduced here — the same disposition the release-gate review above records for the browser
gate. No local run stands in for it, and naming an earlier run would name one taken before the
interface, editor, and traversal changes this tree carries.

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

**Twenty agent-driven sessions, run on 2026-09-05 against the release candidate, with the
runner holding the clock.** The build is `npm pack` of the tree as it stood for that run —
which later edits do not reach, the digest below being the artifact the sessions actually ran —
tarball SHA-256
`7e852c2305971d91ca0e23aa23bafa1cac4d5b986b243d9ec8e167fc24245837`, installed with
`npm install` into one run folder. The digest names the artifact the sessions ran rather than
a value a re-pack reproduces: two packs of one source differ in the build id Nuxt writes into
`dist/public`, and everything else — `dist/cli.mjs` included — is byte-identical between them.
Each session had its own `repository/`, the all-kind fixture built in place by
`tests/fixtures/repositories/build-fixtures.ts`, and its own four homes under a `HOME` of its
own from `tests/fixtures/global-homes/build-fixtures.ts`.

**The material it scored against**, all of it under
`tests/usability/sc001-sc006-study-inputs/` and read from those files rather than copied:
`guidance.md`, the four prompt files `task-prompt-sc001.md`, `task-prompt-sc006.md`,
`task-prompt-comparison.md`, and `task-prompt-consent.md`, the three questions of
`response-form.json`, the answers in `ground-truth.json`, and the pass conditions and
thresholds in `scoring-rubric.json`. The two equipment conditions were the earlier runs':
`--port 0` appended to the launch command, and the four home variables set for that command
alone. Five sessions ran at a time, on Claude Sonnet 5.

**The runner owns what the criteria say it owns.** A session receives one task when the one
before it finished and cannot read ahead; the reveal and the finish are stamped by the runner,
which is what SC-001 means by the interval starting "when the standardized task prompt is
presented"; and the response form is printed by the runner and submitted back to it, which is
what SC-006 times. The guide each session reads is `guidance.md` injected into its prompt, not
a copy of it: an earlier attempt of 2026-09-04 handed its sessions a stale copy of one task
prompt, which is what a copy does.

**The browser is equipment the session reads rather than a module it scripts.** It answers
`open`, `snapshot`, `click`, `type`, `press`, `text`, `url`, and `stop`; a snapshot is the
page's roles and names with one short reference per actionable element, and a reference is
what a command names. No session writes a selector or reads the page's markup.

**What the sessions were isolated from.** Each was a Claude CLI print-mode process whose
working directory was its own session folder, outside this working tree, started with
`--setting-sources user` and with this repository's configuration variables removed from its
environment, so no project instruction and no memory of this repository was in its runtime.

**This is an agent-driven run and is recorded as one.** What twenty agents establish is
whether the product's own printed and rendered guidance is sufficient to launch it, reach a
file, state what the product says about that file, compare two copies, and see what the
personal-setup step proposes before anything is read. How a person experiences the same
interface is not in this evidence; SC-001 and SC-006 say so in their own text, and no sentence
here may be read as a human-subject result.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: from the prompt through the launch to one discovered file's detail view open within two minutes | 19 of 20 | **Established: 20 of 20**, 9.5 s to 18.6 s, median 11.5 s |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` submitted within two minutes, every field matching the ground truth | 18 of 20 | **Established: 20 of 20**, 9.6 s to 31.6 s, median 14.1 s |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 of 20** complete: every session put the two `changelog` copies side by side and named a difference |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 of 20** complete: every session reached the proposal page and named its four directories |
| Safety | SC-006 zero-critical gate | no critical issue | **Passed.** All twenty answered all seven predefined safety fields, and no session answered any of them `yes` |

**Every session's own four outcomes and their intervals.** Each row is one enrolled session,
recorded without exclusion or replacement; every one completed all four workflows, so the
outcome column the criterion asks for is the interval itself.

| Session | Discovery | Inspection | Comparison | Consent | File opened |
|---:|---:|---:|---:|---:|---|
| 01 | 17.7 s | 19.7 s | 12.7 s | 15.7 s | `CLAUDE.md` |
| 02 | 11.5 s | 9.6 s | 8.9 s | 10.4 s | `CLAUDE.md` |
| 03 | 14.5 s | 14.0 s | 17.0 s | 16.0 s | `AGENTS.md` |
| 04 | 12.7 s | 13.6 s | 11.6 s | 12.4 s | `CLAUDE.md` |
| 05 | 14.5 s | 16.6 s | 9.5 s | 11.2 s | `.claude/CLAUDE.md` |
| 06 | 10.0 s | 14.3 s | 8.0 s | 12.7 s | `CLAUDE.md` |
| 07 | 10.6 s | 12.9 s | 8.7 s | 11.8 s | `CLAUDE.md` |
| 08 | 10.6 s | 13.6 s | 11.1 s | 9.8 s | `CLAUDE.md` |
| 09 | 10.3 s | 13.9 s | 12.1 s | 13.1 s | `CLAUDE.md` |
| 10 | 10.7 s | 14.9 s | 11.5 s | 12.1 s | `CLAUDE.md` |
| 11 | 11.0 s | 31.6 s | 9.0 s | 12.6 s | `CLAUDE.md` |
| 12 | 18.6 s | 18.4 s | 19.7 s | 18.0 s | `CLAUDE.md` |
| 13 | 12.1 s | 13.0 s | 8.9 s | 11.6 s | `CLAUDE.md` |
| 14 | 11.5 s | 10.9 s | 8.8 s | 13.2 s | `CLAUDE.md` |
| 15 | 11.1 s | 14.6 s | 11.9 s | 12.1 s | `CLAUDE.md` |
| 16 | 16.1 s | 13.8 s | 16.5 s | 17.9 s | `CLAUDE.md` |
| 17 | 9.5 s | 15.2 s | 9.8 s | 12.2 s | `CLAUDE.md` |
| 18 | 11.2 s | 14.1 s | 9.1 s | 10.1 s | `CLAUDE.md` |
| 19 | 13.5 s | 19.1 s | 9.9 s | 12.0 s | `CLAUDE.md` |
| 20 | 12.9 s | 14.2 s | 8.9 s | 10.4 s | `CLAUDE.md` |

Every session's three fields matched `ground-truth.json` with no partial credit: source
`Repository`, recognizing tools `GitHub Copilot` **and** `OpenAI Codex`, file type
`Instructions`; none named Claude Code. Eighteen opened the root `CLAUDE.md`, one opened
`.claude/CLAUDE.md`, and one opened `AGENTS.md`; eighteen reports carry that file's own detail
route, and the other two name the file and say they read the address after the view had been
closed.

**Every session's safety answers.** The seven predefined fields — a product-issued outbound
request beyond localhost, execution derived from a customization file, an MCP connection, a
mutation of the inspected tree, exposure of inspected content to another machine, a browser
opened without being asked, and a write into the inspected tree by the session's own tooling —
were answered by all twenty, and every answer was `no`. The two open fields are errors met and
anything surprising: the errors reported are the sessions' own equipment mistakes, and the
surprises are the two-step personal-setup gate described correctly as FR-013 behaving as
specified.

**What this run does not establish.** It says nothing about human first use. It carries no
capture bundle: what it rests on is the runner's own event log and each session's report, kept
beside the run's session folders outside this repository. And it is one fixture tree — the
sessions met the customization files this repository builds for its own tests, not a
repository none of them had seen.

**The runs of 2026-09-04 are superseded rather than corrected.** Their record stands below as
what each reported. The interface changed after them — the rail lost an entry and the status
vocabulary became one table — and so did the task material, each of which spec.md § SC-001
makes a reason to repeat the evaluation rather than to carry a result forward.

### The third run of 2026-09-04

**Twenty agent-driven sessions, run on 2026-09-04 against the build carrying this release's
review corrections, each session started outside this working tree.** The build is
`pnpm pack` of the tree as it stood for that run, tarball SHA-256
`169372b9fa8ff1df8c2ce6d0ec47f67e4eb09702757ed830a6ae34cebad44fdc`, installed with
`npm install` into one run folder. Each session had its own `repository/` — the all-kind
fixture built in place by `tests/fixtures/repositories/build-fixtures.ts`, which is where the
guide's `npx --no-install agent-customization-inspector --no-open` resolves the package — and
its own four homes under a `HOME` of its own from
`tests/fixtures/global-homes/build-fixtures.ts`. Each was handed the text of
`tests/usability/sc001-sc006-study-inputs/guidance.md`, the four prompt files beside it
verbatim, and the three questions of `response-form.json` as those files stood at commit
`980ee95229170b68e892e46ed78dd0420fd0a452`; it was scored against `ground-truth.json`
through `scoring-rubric.json` at that same revision. Each drove a headless
browser of its own with its own clock. The two equipment conditions were the earlier runs': `--port 0`
appended to the launch command, and the four home variables set for that command alone. Five
sessions ran at a time.

**What the isolation was, and what it establishes.** Each session was a Claude CLI print-mode
process whose working directory was its own session folder, started with `--setting-sources
user` and with this repository's configuration variables removed from its environment — so no
project instruction and no memory of this repository was in its runtime. Nineteen of the
twenty said so unprompted; the twentieth did not address it. That is the condition SC-001's
no-hint policy asks for and the two earlier runs of this date lacked, and it is what makes
this run's figures the product's own guidance rather than a mixture.

**The sessions ran on Claude Sonnet 5**, named because an agent-driven run's method includes
which model drove it: the earlier runs of this date ran on Fable 5.1, so their intervals and
this run's are not one series.

**What the timed intervals measure here, and why they are not the criterion's.** Three things
separate them. A session drives a headless browser it wrote itself, so reaching a file means
learning the page's markup well enough to script a click; four sessions say that is where
their time went, and one states the consequence plainly — the elapsed figure "mixes genuine
tool-discovery time with scripting/tooling overhead specific to this headless-Playwright
evaluation method". The runner handed every task to the session at once rather than presenting
each when the one before it finished, so a session could read ahead, and sessions 01 and 12
record that they learned the page in an untimed pass before stamping the T0 they report. And
the stamps are the sessions' own: SC-001 starts its interval when the prompt is presented,
which is a moment only the runner can hold. Nothing is adjusted for any of it — the kit's rule
is that every enrolled session stays in the results — and nothing here may be read as the
interval the criterion fixes, or as a claim about how long a person would take.

| Workflow | What it measures | Threshold | Result |
|---|---|---|---|
| Discovery | SC-001: from the launch command to one discovered file's detail view open within two minutes | 19 of 20 | **Not established: 14 of 20.** The fourteen took 1.7 s to 117.8 s, median 42.6 s. Four are over the limit — sessions 09 (123.5 s), 18 (120.4 s), 06 (443.7 s), and 15 (677.7 s), each attributing the interval to learning the page's markup for its own driver rather than to what the product printed or rendered — and two more are unsuccessful for a launch that died before their timed run began (13, 14), which SC-001 counts as a failure before the timer starts |
| Inspection | SC-006: the three response fields for the designated `AGENTS.md` within two minutes | 18 of 20 | **Not established.** All twenty answered the three fields correctly, but no form was presented and none was submitted: the sessions wrote the answers into their own report and stamped the interval themselves, so what is recorded is not the interval the criterion fixes |
| Comparison | SC-006 coverage: the standardized comparison task | all 20 attempt | **20 attempted; 7 complete.** `ground-truth.json` completes this task at the two `changelog` skill copies side by side, which seven reached; the other thirteen compared another drifted pair the fixture holds |
| Global consent | SC-006 coverage: the standardized personal-setup consent task | all 20 attempt | **20 attempted; 18 complete.** Sessions 17 and 19 named the page's labels for the four directories without the paths the ground truth's match rule asks for |
| Safety | SC-006 zero-critical gate | no critical issue | **Not established.** No session reported a critical issue, but the report carries one free-text field rather than the predefined safety-event fields the criterion asks for, and nothing scored it |

The inspection median is 0.24 s because there is no form. `response-form.json` names the three
questions, but the runner never put a form in front of a session and took no submission from
one: each wrote the answers into its own report and stamped the interval itself. What the
figures establish is that the three fields were answerable from the open page — every session
answered them correctly — and not the interval SC-006 fixes, which runs from a presented
prompt to a submitted form.

Every session's three fields matched `ground-truth.json` with no partial credit: source
`Repository`, recognizing tools `GitHub Copilot` **and** `OpenAI Codex`, file type
`Instructions`; none named Claude Code. For discovery, thirteen opened `.claude/CLAUDE.md`,
the first row of the kind the page shows by default, and seven opened the root `AGENTS.md`.

The comparison task's prompt names no pair, but `ground-truth.json` does: it completes the
task at the two `changelog` skill copies side by side with a difference named. Seven reached
that pair — the copy in `.agents/skills/` against the one in `.github/skills/` — and the other
thirteen reached a different drifted pair the fixture holds, which the material scores as
unsuccessful however real the drift they found: the two Codex `docs-researcher` agent files, the two `debugger` agent files
under `.claude/agents/`, `alpha-a` against `alpha-b`, `.github/mcp.json` against `.mcp.json`,
`reviewer.agent.md` against `reviewer.md`, `AGENTS.md` against `AGENTS.override.md`,
`CLAUDE.md` against `CLAUDE.local.md`, and one plugin's two marketplace entries. Every session
named a difference in the pair it chose.

Every session reached the consent page and reported what it proposes. Eighteen named the four
directories as the page shows them — the three fixture homes and the shared agent home — which
is what the ground truth's match rule asks for; two named the page's own labels for them
(`Copilot home`, `Claude home`, `Codex home`, `Shared agent home`) without the paths beside
them, and are unsuccessful for that. Most stopped at the proposal rather than
confirming the read, which is what the prompt's "before it reads them" invites; the sessions
that stopped there recorded that the page states nothing has been read yet. Every session
stopped its own host and closed its own browser. Whether every session touched only its own
processes cannot be established: session 12 reports that it swept for its own leftovers with a
broad `ps` before it understood that `npx` orphans a grandchild, and that among the process
IDs it killed in that sweep it cannot rule out one belonging to another session. Sessions 04,
07, and 13 also record broad listings they narrowed afterwards, and 19 records leaving other
sessions' hosts alone. The sessions shared one machine and one process namespace, which is
what makes the question askable at all.

| Session | Discovery | Inspection | Comparison | Consent | Safety |
|---|---|---|---|---|---|
| 01 | 2.1 s | 0.00 s | unsuccessful, another pair | complete | none |
| 02 | 48.8 s | 0.00 s | unsuccessful, another pair | complete | none |
| 03 | 88.2 s | 5.1 s | unsuccessful, another pair | complete | none |
| 04 | 44.8 s | 6.6 s | unsuccessful, another pair | complete | none |
| 05 | 1.7 s | 0.00 s | unsuccessful, another pair | complete | none |
| 06 | 443.7 s, over the limit | 0.00 s | unsuccessful, another pair | complete | none |
| 07 | 6.4 s | 0.4 s | unsuccessful, another pair | complete | none |
| 08 | 71.8 s | 4.7 s | complete | complete | none |
| 09 | 123.5 s, over the limit | 33.9 s | unsuccessful, another pair | complete | none |
| 10 | 85.7 s | 4.2 s | unsuccessful, another pair | complete | none |
| 11 | 12.3 s | 40.9 s | unsuccessful, another pair | complete | none |
| 12 | 1.7 s | 0.00 s | complete | complete | none |
| 13 | 6.3 s, unsuccessful: a launch died before the timed run | 0.00 s | unsuccessful, another pair | complete | none |
| 14 | 34.5 s, unsuccessful: a launch died before the timed run | 2.2 s | complete | complete | none |
| 15 | 677.7 s, over the limit | 0.00 s | unsuccessful, another pair | complete | none |
| 16 | 40.4 s | 0.00 s | unsuccessful, another pair | complete | none |
| 17 | 85.0 s | 2.7 s | complete | unsuccessful, labels only | none |
| 18 | 120.4 s, over the limit | 0.00 s | complete | complete | none |
| 19 | 117.8 s | 0.1 s | complete | unsuccessful, labels only | none |
| 20 | 34.9 s | 13.8 s | complete | complete | none |

No session was excluded or replaced, so the fixed denominator and the recorded count are the
same twenty.

**What the sessions reported about safety.** The report carries one free-text field rather
than the predefined safety-event fields SC-006 asks for, and the scorer reads none of it, so
what follows is a reading of twenty prose paragraphs rather than a scored result. No session
reported a prohibited effect by the product: no request beyond localhost, no execution derived
from a customization, no mutation of an inspected file, and no browser opened under
`--no-open`. Several verified the tree by hand — one compared every opened file's modification
time against the fixture's own and found them unchanged. Two sessions wrote files of their own
into `repository/` — session 03 two scratch scripts and session 07 seven — from a shell whose
working directory had drifted there, and both noticed and deleted them; that is the session's
own tooling in the tree the product reads, not the product writing to it, and it is the kind
of thing a structured safety field would have recorded rather than left to prose. Every session that reached the consent page reported
that it reads nothing before the confirmation, and the ones that stopped there quote the page
saying so. The npm notice several sessions saw at exit is npm's own update check under the
guide's `npx`, as the earlier runs recorded.

**What the sessions raised about the product.** Session 16 read the Repository status
`Inspected · some files kept a diagnostic` against the `Source diagnostics` count of 0 as two
notions of the same word and let it go — the same reading five sessions had before the status
words were rewritten, now met once and without a search for what the word meant. Five
sessions (06, 12, 14, 17, 20) met the same status and read it correctly as the fixture's own
malformed `docs/CLAUDE.md` being reported rather than a fault. Session 05 found that typing
`/instructions` into the address bar reaches an in-app "Page not found": that path is not a
route — the routes under it are a file's detail and a range's comparison — so the page is
answering correctly, and no deep link this product publishes was affected. Session 16 also
found the instructions comparison pairing `AGENTS.md` with `AGENTS.override.md`, which is what
that kind's comparison is: two files of one applicability range, whatever their names.
Session 09 clicked `Compare this instruction file` while looking for the `File` tab, both
carrying the word; session 11 found a kind tab's accessible name to be the kind and its count
in one string. Nothing was reported that the product states twice or states wrongly.

**What this run does not establish.** It does not establish SC-001: fourteen of twenty opened
a file inside the interval, and the criterion asks nineteen. It does not establish SC-006
either — not its timed half, which needs a form presented and submitted rather than three
answers a session writes into its own report, and not its zero-critical gate, which needs the
predefined safety-event fields the report does not carry. What it does establish is narrower
and worth keeping: every session reached a file, answered the three fields correctly from the
page, reached a drifted pair and named the drift, and reached the consent page and reported
what it proposes before anything was read.

It also establishes what the next run has to change, which is the instrument rather than the
product: the runner must present each task when the one before it finished and stamp the
intervals itself, put the response form in front of the session and take its submission, give
each session a browser it can read and act on instead of a Playwright module it must script,
take structured safety answers, and give each session a process namespace of its own — session
12 cannot rule out having killed another session's process while sweeping for its own.

It does not establish anything about human first use — least of all here, where four sessions
spent their interval writing a driver for a page a person would have clicked. It carries no
capture bundle: what it rests on is each session's own report, kept beside the run's session
folders outside this repository. And it is one fixture tree: a session met the customization
files this repository builds for its own tests, not a repository it had never seen.

### The second run of 2026-09-04

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
human-subject result. The run used no capture harness: the kit that a
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

T1061's branch-by-branch review read the capture kit against its protocol contract and found
fifteen defects, each traced to both the code and the clause it contradicted, corrected, and
given a check that fails without the fix. T1062 ran that loop to zero open concerns; the last
of them was settled by amending the contract's static-asset row to the packaged-prefix rule
the equipment could actually decide.

The capture kit is then removed, with its contract, its modules, their suites, its package
commands, and the product's own readiness probe whose only caller it was. It existed to make a
moderated human study auditable, and no such study will be run, because twenty first-use
participants are not available to this project. What stayed is what a run reads — the guidance,
the four standardized task prompts, the response form, the ground truth, and the scoring
rubric — and what says how one run is performed: `tests/usability/sc001-sc006-study-kit.md`
and its Japanese companion, now a static operator protocol rather than a harness.

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

A fifth turned on the same clause from the other side: here no specification mandated the
redundancy, a reading of one did. The launcher exclusion was proposed as two stages — a
pre-consent physical resolution of every candidate, then a re-authorization at the launch
against the roots the session then held — because FR-013's no-I/O rule was read as forbidding
the probe's own resolution. The operand is a `PATH` entry or a configured editor rather than
one of the four proposed roots, so FR-013 was corrected to state editor-launcher discovery as
the one operation whose resolution the operating system may route through such a root, and the
second stage had nothing left to buy. One comparison stands, made at probe time: each candidate
as it is spelled and where it physically is, against the Repository root's own physical
location and each proposed personal root's spelling. Repeating it before the launch it admits
is the identity re-verification FR-019 forbids, so what it leaves open is recorded at
`contracts/http-api.md` § open-file — which is also where a candidate the filesystem cannot
resolve is refused rather than admitted — instead of closed with machinery.

*Resolved rather than residual.* The capture study kit was machinery with no run
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
compensate for it are both gone, and the comments that explained them went with them.

The same rule caught the second. Removing the Source-diagnostics entry left five production
comment families and one browser test describing two non-kind lists, and left `.aci-notices` a
global utility whose stated reason for being global — two surfaces drawing one box — had gone
with the list. The family was corrected together, and the rule that a deviation whose reason is
gone is a defect rather than a decision moved that frame into the one component that renders it.

A third came from the final round, and it is the same rule read one level up: a comment naming a
requirement is stale the moment the specification drops that requirement, and nothing had been
checking. Two places still cited `FR-040`/`FR-041`, removed in July. What closed the family is
not the two edits but the sweep that found them — every `FR-`, `QR-`, and `SC-` identifier cited
under `src/` is now checked against the ones spec.md defines, and the one identifier that
legitimately outlives its criterion, the performance harness's `sc002-` prefix, is stated as
such where a reader looks it up.

**III. Verification Before Completion.** Every accepted correction in this release carries a
check that fails without it, and each was watched failing before it was accepted. The
filter-generation fix is asserted twice — a unit test over the predicate and a browser test
over the reader-visible path (apply a narrowing, leave, reload, disable, and go back) — and
both were run against the unfixed predicate first and seen to fail. A passing suite is not
treated as proof: the review that preceded the study kit's retirement read the branches its
suites did not reach, and recorded what it found sound as well as what it found unverified.
The Monaco host metrics carry the regression the review above specifies, watched failing
against the unfixed source. The launcher exclusion and the VCS exclusion are the two where a
review's mechanism was built and then withdrawn; what stands is the comparison that was already
there and the residual each leaves, recorded in the entries above. The rail's ranking fold is the one correction whose own branch no gate reaches — it
needs a read held open, the RPC channel is a WebSocket, and the unit project has no
single-file-component compiler — so what is checked is the predicate that supplies its input
and the ranking with no read out, and the fold itself is recorded as read on a fixture launch
rather than as asserted. Two later corrections are in that same position and are recorded as
such: the personal-setup live region's running sentence, which needs the same held-open read,
and the open control's per-file launch, which no browser suite may reach because none may
activate a launch at all.

Two of this release's corrections were regressions its own earlier corrections introduced, and
both were caught by reading the fix against the code it changed rather than by a suite. Widening
the launcher probe's error split had narrowed the physical resolver to two errno values, which
turned a Repository root that is a link cycle or sits under a directory this process may not
search into a startup failure with no host behind it, where FR-002 gives it a `root-unreadable`
Diagnostic a reader can see. Restructuring the Global commit into compute-then-apply had left a
member's first publication unranked while its diagnostics were sorted, which read a retried
member before one an earlier batch published. Each carries a check that was watched failing
first: the launcher one stages a real denied ancestor and launches, and the ordering one commits
a retry over an earlier publication and reads the committed order back.

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

**Nothing recorded above is open on a decision.** Every finding is implemented and covered as
its entry states, and the ones that turned on wording were settled and implemented with them.
The loop closed on the last round recorded under the release-gate section above. The round
before it found two comments citing removed requirements; the last one found a reactive
declaration whose kind defeated the comparison it existed for, two live regions that could not
announce, an empty state that stated the wrong empty, a document read twice across two panels,
and a change log that recorded additions without their removals. Each is corrected above, one is
answered in the code as a reading the contracts do not support, and the live regions are connected to the
page's own status rather than left silent, which is the shape the shell already carries.

The two actual residuals are unchanged, and neither is awaiting a decision. Manual execution
against assistive technology is not performed: it needs operators this project does not have,
for the same reason the moderated study does not happen, so it is a standing property of the
evidence rather than an item with an owner — what would close it is a release that gains those
operators, and the matrix each `MANUAL-*` row names is what it would then run. The seven
macOS WebKit link-Tab failures are a property of this machine rather than of the product; their
owner is CI, whose certified three-browser matrix is the result the release check log carries.

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
`AUTO-*` IDs, 32 of them passing in every local project and `AUTO-2.1.1`/`AUTO-2.4.1` failing
only on the uncertified macOS WebKit, for the tab-order reason recorded there. What the
certified Linux WebKit does with those two is CI's run of this tree's own commit, which is not
reproduced here and which no local run stands in for.

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
