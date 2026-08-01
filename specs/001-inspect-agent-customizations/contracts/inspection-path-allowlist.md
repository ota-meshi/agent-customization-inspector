# Contract: Inspection Path Allowlist Grammar and Index

[日本語](inspection-path-allowlist.ja.md)

**Contract version**: 2026-07-20

**Inspection-path decision revalidation**: 2026-07-20

**Normative for**: Rule classes, matcher notation, source-boundary interpretation, read
authorization, and cross-vendor conformance

This document defines the common grammar and invariants of the inspection rule registry.
It is intentionally not the vendor matrix. Exact vendor behavior, Inspector rules,
runtime composition, and evidence are defined once in the linked contracts below.
The date above records revalidation of this Inspector path decision, not a registry-wide
semantic source review. Per-record review dates remain owned by
[Official Sources](official-sources.md).

## Contract map and identifier ownership

| Contract | Sole ownership |
|---|---|
| [GitHub Copilot](vendors/github-copilot.md) | Copilot `behaviorId` statements and Copilot static, bounded-derived, and excluded `ruleId` definitions |
| [Claude Code](vendors/claude-code.md) | Claude `behaviorId` statements and Claude static, bounded-derived, and excluded `ruleId` definitions |
| [OpenAI Codex](vendors/openai-codex.md) | Codex `behaviorId` statements and Codex static, bounded-derived, and excluded `ruleId` definitions |
| [Runtime composition](runtime-composition.md) | `strategyId` definitions, precedence/composition projections, relationship-only `ruleId` definitions, and shared cross-vendor non-read `ruleId` definitions |
| [Official sources](official-sources.md) | `sourceId`, canonical official URL, enumerated section anchors, review date, and reciprocal affected-contract references |

An identifier is defined normatively in exactly one contract. Other contracts refer to
that identifier and must not restate its rule. `behaviorId` describes the maintained
interpretation of documented vendor behavior; `ruleId` describes Inspector policy;
`strategyId` describes runtime composition or projection; and `sourceId` identifies the
official evidence reviewed for one or more of those records.

Every vendor behavior and strategy row names its evidence `sourceId` values. Every
Inspector rule names the relevant `behaviorId` values and specification-policy references.
The executable registries and both language contracts must resolve those references
reciprocally.

## Vendor locators are not Inspector matchers

A **vendor locator** describes where a vendor documents looking for a customization. It
may be relative to a repository root, Git root, workspace, target file, runtime working
directory, user home, configuration home, profile, or hosted context. It may describe an
upward search, a downward search, a per-directory choice, or a surface-specific layer.

An **Inspector matcher** describes which enumerated entry records the Inspector may
classify inside one already-enabled source boundary. It is always relative to the exact
boundary named in the rule and never inherits a vendor locator's implicit base or traversal.

Consequently:

- A vendor locator never authorizes enumeration or a read.
- An Inspector matcher never claims to reproduce a vendor's runtime traversal.
- A vendor behavior table and an Inspector rule table remain separate even when they use
  similar path text.
- Runtime applicability, order, and selection are represented by condition facts and
  strategies, not encoded by broadening a matcher.

## Source boundaries

### Repository

The Repository boundary is the selected root: the exact one-time captured invocation
`process.cwd()` when `--root` is omitted. `--root` is accepted, a repeated option resolving
to the parser's last value; an absolute
value is kept as given, and a relative value is resolved against the captured invocation
directory with the active platform's `node:path.resolve`. An explicit empty value fails
with a fixed actionable, source-value-free startup error before session/browser creation;
a missing value is rejected at the same boundary by Gunshi's typed argument validation,
which the product does not duplicate (FR-001). Selection performs zero filesystem/network I/O and no `chdir`.
Generation 0 contains the one Repository Source created with zero filesystem I/O; its
escaped root label carries no read authority, and the first scan reads the retained
selected root, failing with the source-scoped `root-unreadable` Diagnostic when the root
does not exist or cannot be read as a directory (FR-002). The Inspector never walks above
a Source's own root: such a path has no `SourceRelativePath` and lies outside the boundary
entirely. It also never probes for a repository marker to find a root, because the selected
root already *is* the repository root — a vendor lookup that walks upward from a runtime
working directory terminates exactly there (FR-001). Repository inventory is an ordinary
recursive traversal below the selected root. A vendor may use a
different runtime root or walk direction; that fact belongs to the vendor and
runtime-composition contracts and never changes this boundary.

### Global

Global inspection is disabled in every new session and requires consent bound to the
current contract version and exact no-I/O preview. Consent is one selector-free action for
the fixed Copilot/Claude/Codex entries. One transaction evaluates all three; deterministic
rejections do not block admitted siblings, and one batch publishes all resulting Sources in
one atomic generation. Every accepted vendor-home root becomes
its own tool-specific Global Source, separately identified as Copilot, Claude, or Codex.
Each tool maps to its own Source, and each Source is bound to exactly one root. These
Sources are not Repository children, are never merged with one another, and are never
merged into the Repository Source.

Every displayed or serialized candidate path is a Source-relative Path computed from the
single root of its owning Source. It is repository-relative only for the Repository Source;
each Global Source uses its own admitted tool-home root.

Vendor contracts may record additional documented User behavior for maintenance and
future review. Such a record grants no read authority. Under FR-015 through FR-018, only
the explicitly contracted Global instruction rules may classify a Global candidate;
additional User settings, agents, skills, hooks, MCP configuration, plugins, state, and
neighboring directories remain excluded until the specification changes.

## Structured Inspector matcher notation

Every static Inspector rule separates these fields:

| Field | Meaning |
|---|---|
| **Base** | One exact enabled boundary: `Repository` or one named consented `Global` vendor boundary |
| **Selector programs** | A non-empty ordered list of authored typed segment programs, each relative to the Source root; a program cannot represent an absolute path, environment expansion, home expansion, URI, or implicit ancestor search |

Each selector program has a non-empty ordered sequence of segment tokens from this closed union:

- `literal(value)` matches one case-sensitive exact ASCII segment. `value` is a non-empty
  string of U+0021–U+007E except `/`, `\\`, `:`, `*`, `?`, `\"`, `<`, `>`, and `|`;
  `.` and `..` are also forbidden.
- `regex(pattern)` matches exactly one entry name, decided by one JavaScript
  regular expression applied to the raw entry name with standard
  `RegExp.prototype.test` semantics — anchoring and escaping are the pattern author's
  explicit spelling, and the shipped rule fixtures own their correctness. It is a
  directory step when non-terminal and a regular-file step when terminal, and renders as
  its regex literal (for example `/\.md$/u`).
- `recursive-directories` — the `**` step — matches zero or
  more directories, is never terminal, and never adjacent to another
  recursive token. It is a downward step only: no selector token names a parent
  directory, and none needs to: the allowlist is anchored at the selected root and reports
  that root's customizations (FR-003).

Static fixed prefixes, exact targets, and fixed derived suffixes use that same closed ASCII
literal type. Registry validation rejects every non-ASCII path literal, so exact
raw-byte/code-unit comparison is the whole relevance test for fixed prefixes and exact
targets, while a `regex` pattern tests the raw entry name (which may be an NFD spelling
on disk). The final token
must be `literal` or `regex` and denotes a regular file. A program
uses only this closed typed grammar; token and depth capacity and completion
behavior come from Node.js and the execution environment. The registry is authored
directly in this typed program form — selector text is never a parser input — and the
contract tables show those authored programs. Grammar and literal obligations are
enforced by the registry contract gate before release, not re-checked at runtime. The
runtime loads only the typed program
and never passes any selector text to a general-purpose glob evaluator; the only pattern
evaluation is each `regex` step's own regular expression applied to one enumerated
entry name.

The structured Base and authored segment programs are authoritative. The vendor
tables' **Expansion** cells are human summaries derived from those programs. They use
`exact`, `direct-child`, `descendant-inventory`, and `recursive-subtree` labels in program
order and may list more than one label for a composite selector.

### Repository selector requirements

Every Inspector Repository selector program is relative to the exact Repository source
root.

| Authored program (Repository base) | Required program summary | Meaning |
|---|---|---|
| `['path', 'file']` | `exact` | One exact file relative to the Repository source root |
| `['path', ANY_NAME]` | `direct-child` | Matching direct children of one root-relative directory; a segment never crosses `/` |
| `[ANY_DIRECTORIES, 'name']` | `descendant-inventory` | Explicit Inspector inventory at the root and every directory below it |
| `['path', ANY_DIRECTORIES, /\.ext$/u]` | `recursive-subtree` | Explicit recursive Inspector inventory below one root-relative subtree, including its root level |
| `['.agents', 'skills', ANY_NAME, 'SKILL.md']` | `exact`, then `direct-child` | One anchored program at the Source root; the terminal file remains exact |

`ANY_DIRECTORIES` is the one directional axis, and it points downward. It describes only the Inspector's inventory of directories below its anchor.
It does not mean that a vendor walks downward, walks upward, searches ancestors, recognizes
every nested repository, or applies the matched file in a particular runtime context. Those
claims require separate vendor behavior and strategy records.

There is deliberately no upward axis. The allowlist is anchored at the selected root and
reports that root's customizations (FR-003), so a vendor lookup that walks upward from a
runtime working directory contributes exactly one in-scope layer and needs no notation; a
rule whose vendor resolves it that way is written as a plainly anchored program. Writing it
with a leading `ANY_DIRECTORIES` instead would inventory nested copies belonging to working
directories this product does not select, over-approximating the root it was asked about.

The working directory a vendor lookup starts from is still the `runtime-cwd` condition
fact, deliberately distinct from the invocation directory that selected the Source. Equating
`$CWD` with `$REPO_ROOT` fixes the lookup's *endpoint*, not its runtime origin, so which
layer a running agent would actually start from stays conditional.

`ANY_NAME` is the always-matching `regex` step and matches exactly one entry
name. `**` is the prose name of the
`recursive-directories` token. A `regex` step never implies recursion, and a
literal-only program is exact. Repository rule tables must state Base, the authored
selector program, and the derived Expansion summary separately; the immutable registry
carries those one-to-one typed selector programs.

### Bounded companion census

Some customizations are directories rather than files. A skill is the clearest case: the
`SKILL.md` is admitted, and the scripts, references, and assets beside it are what make the
skill more than a paragraph, so the directory holding an admitted candidate of such a kind
is enumerated recursively to list the regular files accompanying it.

Whether a census applies follows from the recognized kind, not from a separate declaration
on a rule. Being a directory is part of what a kind *is*, so every rule that admits that kind
wants the census and a per-rule flag would state twice what one of them already decides.

The census result is the list of Source-relative Paths, sorted, not a count of them. Each
path is the exact raw entry names joined with `/`, like every published path: the
filesystem holds one entry per name, so every listed path is unambiguous, and two raw
spellings that would render alike are two real files listed apart. The
inventory row states how many files there are and the file detail view names each one;
deriving the number from the list keeps a single fact, where publishing both would be two
states that can disagree.

The census reads what it lists. A directory-shaped customization is its entry point plus the
files beside it, and a tool that showed the entry point while withholding the files it ships
would not be showing the customization — the accompanying files are as much of what a
product is given as the `SKILL.md` is. Each is read exactly once per scan attempt, through
the same read path and the same closed per-file classification as an admitted candidate, and
is published as an ordinary file of the generation. What a classification means differs with
what was expected of the file. Binary bytes are the ordinary fact of an asset — an image or
a compiled file is part of what a skill ships, so the row records `binary` with no
Diagnostic and the generation stays complete, where the same bytes in an admitted candidate
are a finding about a file a rule admitted as a text customization. A failed read is a
failure for both: the census listed the file, so the skill has it and the reader cannot see
it — that includes an entry whose link target is gone, which is listed and read like any
other so the read answers `file-unreadable` and the row says so, where dropping it would
show a skill missing a file its own directory has.

A census is still enumeration, never admission. A file it lists acquires no rule, no
recognition, no kind, and no inventory row of its own: it is part of the customization whose
directory holds it, and that customization already has a row. A census widens no walk: it descends only inside the
admitted candidate's own directory, so no path outside it is ever enumerated, and an entry
it does list is read the way every other file is — through the platform's transparent
symbolic-link resolution, because that is what an agent reading that directory would get.
Appearing in a census is not evidence that the vendor loads the file, and a relationship target is still never read through its edge —
a target becomes readable only by being independently admitted or by lying inside a census
that already bounds it.

A census is not part of the allowlist walk. The traversal executes the shipped selector
programs and answers which files may be read; a census answers what else sits in a
customization's own directory, which no selector expresses and only a kind that has one
wants. It therefore runs over the candidates the traversal already admitted, rooted only at
an admitted candidate's own directory: there is no arbitrary path. It runs where that
customization's per-kind details are built, from the recognized kind and the candidate's own
path — both of which recognition already holds — so no earlier phase has to know which kinds
want a census.

A census result is therefore a list on every recognition of a kind that has one, empty when
the admitted file sits alone. There is no "no census ran" state to tell apart from "nothing
accompanies it". It excludes the seed
itself and VCS internals, and it follows symbolic links under the same real-path cycle rules
as the ordinary traversal, so a link back into the subtree terminates rather than being
walked forever.

Descent is contained twice. A census enters a directory only when that directory's real path
is inside the census root, and the census root itself counts only when its own real path is
inside the Source root's. The second check is not redundant: a candidate's directory may
itself be a symbolic link out of the tree, and its real path would then make an outside
directory the census root. A candidate reached that way accompanies nothing — the Source is
the boundary of what was authorized for inspection, and what lies beyond it belongs to no
Source. Containment is what bounds this walk. The ordinary traversal is
bounded by its selector program, which stops descending once no selector can still match; a
census has no selector, so without containment a link to an ancestor would report an entire
repository as one skill's companions. Listing is not contained in the same way: a symbolic
link to a file is listed at the entry's own path, because the entry is what sits in the
directory and an agent reading it would resolve the link too.

An enumeration failure is not confined to one file and propagates, exactly as it does in the
ordinary walk. The empty list states that the admitted file sits alone, so returning it for a
permission or I/O error would publish a fact about the directory on the strength of not
having read it.

### Global selector requirements

A Global rule names one exact consented vendor boundary as Base and gives a selector
relative to that boundary. Environment/default-home resolution belongs to boundary
creation, not to the selector. A Global selector is authored against its consented vendor
boundary, never against the Repository root,
does not authorize another vendor boundary, and cannot expand the paths permitted by
FR-015 through FR-018.

### Traversal-plan compilation and Global least privilege

Build validation compiles every validated typed matcher into an immutable, versioned
`TraversalPlan`. The plan retains the closed selector programs and fixes the exact
filesystem edges and operation classes they can authorize. Runtime scanning loads that
plan as data; it does not reparse selector text or substitute a generic walker. A
Repository plan may perform only the broad traversal explicitly described by its selector
programs and exclusions. Entry, depth, time, and work capacity and completion behavior
come from Node.js, the filesystem, and the execution environment.

A Global plan is narrower and never starts by enumerating the vendor-home root. An exact
Global target rule reads only its named file below the admitted root and does not
enumerate the root. An explicitly fixed subtree rule, such as the contracted Copilot
`instructions/` subtree, enumerates only that subtree and the descendants permitted by its
segment program. Neither rule lists, opens, or reads a neighboring path that the plan does
not reach. Missing permitted paths do not broaden the plan or trigger sibling discovery.

The plan also carries a closed `selectionPolicy`. Every rule uses `all-matches` except
`codex.global.instructions`, whose exact ordered selectors are `AGENTS.override.md` then
`AGENTS.md` and whose policy is `codex-global-first-non-empty`. That branch reads the
override to establish whether its decoded string, after removal of an optional leading
UTF-8 BOM, has `String.prototype.trim().length > 0`. A non-empty override short-circuits before any operation on the fallback; an
absent or safely-read empty override advances to `AGENTS.md`. `absent` means the override
file does not exist. A whitespace-only file is
empty. Replacement-decoded `utf-8-replaced` text participates unchanged and any `U+FFFD` is
non-whitespace. An unreadable or binary override ends the branch with its file Diagnostic
(`file-unreadable` or `file-content-binary`) and no fallback. The
policy publishes the selected non-empty file and never publishes both selectors.

The no-I/O Global preview names each tool's resolved root and lexical state only; it
carries no per-pattern display, and what is read below an admitted root is fixed by the
shipped plan the retained `allowlistVersion`/`traversalPlanVersion` pair identifies, so
there is no separately maintained
preview allowlist. Those versions identify the closed selection policy and canonical
selector programs. An enable
operation executes the exact plan represented by the accepted preview rather than
recompiling it from display text.

### Ordinary traversal and per-file outcomes

Runtime scanning executes the compiled plan as an ordinary recursive walk built on
`node:fs/promises` (FR-019). Enumerated raw entry names are the filesystem operands, and
a public Source-relative Path is those names joined with `/` (FR-024); `/`-joined
`SourceRelativePath` values and display strings never reconstruct a filesystem
path — operations use the retained raw segments. Selector relevance is decided on the enumerated entry name with exact
literal comparisons and each `regex` pattern's standard regular-expression test —
the only pattern evaluation in the product, applied to one entry name at a
time. Symbolic links are followed transparently,
because the inspector shows what an agent reading the same path would see; a link whose
target is missing or unreadable yields that file's `file-unreadable` Diagnostic, and
recursive traversal tracks visited directories by real path so a link cycle cannot
prevent a scan from terminating. Hard links are ordinary files: there is no
physical-identity grouping, no read-once semantics, and no primary/alias path selection.
`.git/`, `.hg/`, and `.svn/` internals are excluded from traversal. The exclusion is
judged on the resolved real path of a directory relative to the walk's own container — the
Source root, or the fixed subtree a targeted walk was given — so an entry that reaches
those internals under another name is excluded too, while a Source root whose own path
contains such a segment is an ordinary root that is scanned normally.

A problem confined to one file stays confined (FR-028): an unreadable file yields
the file-scoped `file-unreadable` Diagnostic, an admitted candidate's NUL-containing
content yields `file-content-binary` — a census-listed companion's binary bytes are the
ordinary fact of an asset and yield none (§ Bounded companion census) — and a parser or
extractor failure yields `recognition-parse-failed` while the complete readable source
stays displayed and comparison-eligible. Each such Diagnostic-bearing outcome makes an
otherwise publishable generation `partial` with every unaffected file complete. Invalid non-NUL file-content UTF-8 is
instead decoded once with replacement semantics and processed unchanged as readable
`utf-8-replaced` text. A selected root that does not exist or cannot be read as a
directory fails the Source attempt with the source-scoped `root-unreadable` Diagnostic
and publishes no generation. Any other unexpected failure fails the attempt as an
ordinary error: a failed session-API request reports its real error and retains the
prior committed snapshot (FR-030), and a startup failure ends the launch with an
actionable message. The product adds no
repeated identity re-verification between operations, no race-detection taxonomy, and no
ticket, receipt, guard, or resource-registry machinery.

A root on a network filesystem may cause OS-mediated traffic when it is read. FR-022's
zero-outbound-request assertion concerns product-issued requests, uses local fixture
roots, and separately validates the two authorized internal loopback classes at the
issued `localhost` authority — static/SPA `GET`/`HEAD` for the packaged UI assets and
the local session API channel — while rejecting every other product
network/URL/MCP request.

## Rule classes

Every rule has a stable `ruleId` and exactly one discovery class:

| Class | Meaning | May authorize a read? |
|---|---|---|
| `static-candidate` | The rule's structured source-relative matcher alone can create a candidate. | Yes, after consent and safe-read checks |
| `bounded-derived-candidate` | An independently accepted seed declares a target through a closed vendor-specific derivation. | Yes, only for the derived path enumerated by that closed rule |
| `relationship-only` | The Inspector records that a product may follow or use a target without opening it. | No |
| `excluded` | The surface is documented but intentionally outside this release or source boundary. | No |

Inline declarations inside an accepted file are recognition metadata on that physical
file unless a bounded-derived rule explicitly creates another candidate. An unlisted
field, import, link, component path, command, directory, vendor locator, `behaviorId`, or
`strategyId` never grants read authority.

One physical file may be admitted by multiple rules within one Source, or independently by
multiple tool Sources. It is read once per Source scan attempt and retains every accepted
provenance, including its `ruleId`, matched selector, evidence,
record-by-record documentation/lifecycle assessments, order facts, and applicability.
`DocumentationStatus` is exactly `documented | partially-documented | unknown | conflict`;
the separate unique fixed-order lifecycle qualifier array is `preview`, `experimental`,
`deprecated`, and empty never implies stable. Admissions are not collapsed into
a recognition-level winner. Cross-Source, cross-attempt, and cross-generation reads are
independent.

## Read authorization and applicability

Only a `static-candidate` or `bounded-derived-candidate` in the shipped, contract-versioned
registry may create a candidate and request its read. The candidate must belong to an
enabled boundary and match an entry produced by the ordinary traversal above; the
inspection module accepts no arbitrary absolute path from an API request, relationship, or
source file. The one read this does not cover is a companion's, which no admission
authorizes and no path outside an admitted candidate's own directory can reach
(§ Bounded companion census).

A `bounded-derived-candidate` uses a typed edge from an independently admitted static seed
and is nonrecursive: a derived candidate cannot seed another derivation. Relationship-only
and excluded rules, vendor locators, runtime strategies, imports, component references,
remote sources, and MCP-server-provided instructions never authorize a read.

Read authority for a bounded-derived candidate exists only through a closed, versioned
`DerivationProgram` interpreted by the inspection module. Each program pins the exact
static seed rule, declaration field, and seed kind; chooses its base only from
`seed-matched-path-parent` or
`source-root`; names one closed extraction variant; uses only fixed literal segment tokens
and typed authored-segment tokens from a closed union, with each authored token producing
exactly one validated segment rather than injecting an unparsed path; declares a fixed
suffix; and enumerates every permitted output form. Extracted segments must resolve inside
the owning Source boundary exactly like a static candidate's segments.

Targeted derivation never falls back to a free-form path open. Each interpreted segment
resolves one directory or terminal-file step below the seed's documented base; neighbors
are names only and receive no open or read. The next parent is reachable
only through the preceding selected directory, so the interpreter cannot widen the plan.

Authored local paths use the exact pure tokenizer in the data-model contract. Prefix policy
handles only one literal `./`; U+002F is the sole separator. Empty input/segments, leading,
trailing, or repeated separators, `.`/`..`, backslash, colon, a first-segment home marker,
controls, and unpaired surrogates reject the whole derivation with zero
target I/O. There is no percent/URL/URI decoding, environment expansion, home resolution, or
platform path parsing. The interpreter produces typed regex tokens, never a path
string. Fixed suffix alternatives use literal `first-present-exact`: only a missing exact
classification advances in registry order; the first present path stops later
alternatives even if its later read or parse result is unsuccessful. An ancestor-
chain placement applies that rule independently at every fixed root-to-narrow placement.

A path admitted independently by a static traversal simply gains the derived provenance;
static selector scope is never widened to cover a derived target, and a derived result
never becomes the seed of another derivation.

The registry contains data only: it cannot supply a callback, function pointer, arbitrary
`path.join` recipe, free-form path expression, glob, or regular expression. The closed
schema is the one this section states, with its record field defined by the
[data-model contract](../data-model.md)'s `InspectionRule.derivation` row, and the initial
derived-rule mappings are enumerated by the vendor contracts' derived-rule tables
([GitHub Copilot](vendors/github-copilot.md), [Claude Code](vendors/claude-code.md),
[OpenAI Codex](vendors/openai-codex.md)); adding a variant or mapping is a
contract-versioned change, not an extension point at runtime.

A match proves only that an authored artifact is inside Inspector inventory scope. It does
not prove that a vendor installs, enables, trusts, selects, loads, merges, or follows it.
Surface, project/root context, runtime working directory, target path, trust, approval,
enablement, selection, agent context, tool availability, installation, managed policy,
instruction budget, and external state remain independent condition facts. Missing or
excluded inputs never default to satisfied, and the UI must not call a candidate
semantically effective.

The contracts use a fixed existence-versus-activation vocabulary. `present` means only
that an authored regular file exists at an allowlisted location inside an enabled
boundary. `recognized` means a present file matched an Inspector rule and owns a
`(tool, kind)` recognition. `supported` means a `(tool, kind)` customization type is in
this release's frozen contract catalog. These three terms describe authored existence
and Inspector classification only. `available` means a scope or runtime input actually
exists for the surface (`scope-availability`, `tool-availability`, `installation`).
`applicable` means the vendor's documented applicability conditions—surface, roots,
`target-match`, and related facts—are satisfied for a concrete runtime context.
`selected` means the vendor's documented resolution chose the artifact among
alternatives (`selection`). `enabled` means the relevant enablement gate is on at the
relevant scope (`enablement`). `effective` means every required condition fact of the
documented runtime edge is `satisfied`. These five activation terms are established only
by condition facts, never by file existence, and each unresolved fact keeps the
projection conditional or `unknown`.

## Symlink and read invariants

- Symbolic links are followed transparently, because the inspector shows what an agent
  reading the same path would see. A link whose target is missing or unreadable yields that
  file's `file-unreadable` Diagnostic, and recursive traversal tracks visited directories
  by real path so a link cycle cannot prevent a scan from terminating (FR-024).
- Reads use only read-only, non-create, non-truncate operations; no mutation-capable
  primitive is ever called against an inspected source (FR-023).
- A relationship target, canonical path string, or source text alone never authorizes a
  filesystem open. A path becomes readable in exactly two ways: a static or bounded-derived
  admission in the shipped registry, or a companion census bounded by such an admission's
  own directory.
- A failure confined to one file becomes that file's Diagnostic and makes an otherwise
  publishable generation `partial` with every unaffected file complete (FR-028). An
  unreadable root fails the Source attempt with `root-unreadable` and no generation
  (FR-002). Any other unexpected failure fails the attempt and reports its
  real error; neither path permits implicit matcher expansion, a fallback read, or a
  validity verdict.
- File, collection, derivation, relationship, parser, diagnostic, and timing capacity is
  inherited from Node.js, parser libraries, the operating system, the filesystem, and the
  execution environment as specified in the [data-model contract](../data-model.md).
- No relationship or excluded record may be promoted merely because its target happens
  to exist. A target is readable only through an independent static or bounded-derived
  admission.

## Common conformance requirements

Contract and fixture validation must prove all of the following:

1. Every `behaviorId`, `ruleId`, `strategyId`, and `sourceId` is defined once, resolves all
   references reciprocally, and has semantically equivalent English and Japanese rows.
2. Every Repository matcher program is relative to the Repository source root. Exact,
   direct-child, descendant-inventory, and fixed-subtree recursive forms have distinct
   positive and near-miss fixtures. Matcher fixtures accept `regex` steps (including
   `ANY_NAME`), reject a terminal or adjacent `recursive-directories` step, and reject
   every non-ASCII or forbidden literal code unit.
3. An anchored fixture for a vendor that resolves upward proves that no directory above
   the Source root is opened, that no repository-marker probe occurs, and that a nested
   well-formed copy of the same path one directory below the root is a near miss rather
   than a candidate. It carries separate unknown or conditional vendor-runtime facts where
   the upstream traversal is not established.
4. Typed matchers compile deterministically to immutable versioned plans. Global fixtures
   prove that an exact target is read without enumerating its root, a fixed subtree
   enumerates only that subtree and permitted descendants, and neighboring paths receive
   zero enumeration, open, or read calls. Preview fixtures prove that the preview names
   only the resolved roots and lexical states and that the retained preview record binds
   the allowlist and traversal-plan versions identifying the closed selection policy and
   canonical programs. Codex fixtures apply absent, empty,
   BOM-only, whitespace-only, non-empty, replacement-decoded, binary, and unreadable cases
   independently to both ordered targets; they prove that the fallback applies only for an
   absent or safely-read empty override, that an unreadable or binary override ends the
   branch with its file Diagnostic and no fallback, and that the two selectors are never
   both published.
   Global-consent fixtures reject selector-shaped input, evaluate all three frozen entries,
   partition missing or unreadable roots from admitted readable ones, publish all admitted
   one-root Sources in one batch
   generation, and prove that an unexpected failure aborts the whole provisional subset
   and reports its real error.
5. Every static and bounded-derived rule has positive, root/nested, boundary, symlinked
   (transparently read), unreadable, and applicable multi-tool fixtures. Derived fixtures additionally
   prove closed `DerivationProgram` interpretation without callbacks or free-form path
   construction, nonrecursive derivation, boundary containment, and no read for a rejected
   target.
6. Relationship-only and excluded fixtures prove zero read authority even when a target
   exists or matches a generic filename. User behavior recorded outside FR-015 through
   FR-018 never becomes a Global candidate.
7. One physical file admitted by multiple rules within one Source is read once per Source
   scan attempt and retains each independent provenance. Matcher, evidence,
   record-by-record documentation/lifecycle assessments,
   scope/order, and applicability are not
   collapsed. Two allowlisted paths that are hard links to the same underlying file are two
   ordinary independent files with no grouping, alias, or read-once behavior.
   Cross-Source/attempt/generation fixtures prove independent reads.
8. Root-selection fixtures cover the captured one-time `process.cwd()`, an absolute
   `--root` kept as given, a relative `--root` resolved against the capture, the fixed
   startup error for an explicit empty option, and Gunshi's typed missing-value rejection, with zero `chdir` calls and
   zero selection-time filesystem I/O. Traversal fixtures on every supported OS prove that
   a symlinked customization file is read transparently and displays its linked content, a
   link whose target is missing or unreadable yields `file-unreadable` in a `partial`
   generation, a directory-link cycle terminates through real-path visited-directory
   tracking, an unreadable file yields `file-unreadable` with every unaffected file
   complete, and an unreadable root yields `root-unreadable` with a failed Source attempt
   and no generation. A mapped drive
   and a POSIX network mount are tested/documented as OS-mediated
   post-consent filesystem I/O and are outside FR-022's zero-prohibited-direct-product-request
   assertion. That assertion must separately observe both exact authorized internal loopback
   classes and reject every request outside them, including customization-selected,
   remote-reference, or MCP requests.
9. Path-spelling fixtures include an NFD entry name read through and published as its
   exact raw segments, and separate replacement processing for
   invalid non-NUL file-content UTF-8 as readable `utf-8-replaced` text.
   `SourceRelativePath` values and display strings never reconstruct a filesystem path.
10. Official-source fixtures validate official HTTPS hosts, enumerated anchors, review dates,
   semantic fingerprints, affected-contract backlinks, and human-only updates. A drift
   result never changes a behavior, rule, or strategy automatically.
11. The registry fails closed on an unknown matcher, traversal, or derivation kind; an
   invalid token sequence or position; a program/contract-table correspondence
   mismatch; a malformed selector program; a duplicate identifier; an orphan reference;
   a mismatched contract version; or an English/Japanese semantic difference.
12. Production-call instrumentation proves one content read per published file per Source
    scan attempt and zero mutation-capable APIs or flags: no
    write/truncate/create/rename/delete/link,
    chmod/chown, utimes, xattr, ACL, or requested atime mutation. Only an external harness
    snapshots bytes and, where stable APIs exist, xattrs/ACLs before and after execution;
    those observations never become a second product read. OS-attributable atime changes
    are reported separately.

Changing a matcher base, selector/program, derived expansion summary, read-authorizing class, or Global scope is a
contract semantic change. Maintainers must review identifier compatibility, update every
affected evidence backlink and fixture, update both language contracts together, and bump
the consent-bound contract version when the accepted Global boundary changes.
The implementation freeze task verifies the already approved bilingual Presentation
Allowlist and digest only. It may not author or semantically edit membership, source-form
applicability, extractors, or relationship kinds; any such delta stops dependent work and
requires synchronized design plus regenerated plan/tasks.
