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
`process.cwd()` when `--cwd` is omitted. `--cwd` is accepted at most once; an absolute
value is kept as given, and a relative value is resolved against the captured invocation
directory with the active platform's `node:path.resolve`. A missing or empty value or a
duplicate option fails with a fixed actionable startup error before session/browser
creation (FR-001). Selection performs zero filesystem/network I/O and no `chdir`.
Generation 0 contains the one Repository Source created with zero filesystem I/O; its
escaped root label carries no read authority, and the first scan reads the retained
selected root, failing with the source-scoped `root-unreadable` Diagnostic when the root
does not exist or cannot be read as a directory (FR-002). The Inspector does not walk
above the selected root to find a Git or product project root. Repository inventory is an
ordinary recursive traversal below the selected root. A
vendor may use a different runtime root or walk direction; that fact belongs to the vendor
and runtime-composition contracts and never changes this boundary.

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
| **Relative selectors** | A non-empty ordered list of boundary-relative, `/`-normalized selectors; none contains an absolute path, environment expansion, home expansion, URI, or implicit ancestor search |
| **Selector programs** | Exactly one closed segment program per selector, in the same order; a program can contain multiple typed expansion steps |

Each selector program has a non-empty ordered sequence of segment tokens from this closed union:

- `literal(value)` matches one case-sensitive exact ASCII segment. `value` is a non-empty
  string of U+0021–U+007E except `/`, `\\`, `:`, `*`, `?`, `\"`, `<`, `>`, and `|`;
  `.` and `..` are also forbidden.
- `one-segment(suffix)` matches exactly one non-empty segment: `*` when `suffix` is empty,
  or `*<fixed-literal-suffix>` otherwise. A non-empty suffix has the same closed ASCII
  type as `literal(value)`; the empty suffix is valid only here and preserves the bare `*`
  form. It is a directory step when non-terminal and a regular-file step when terminal.
- `recursive-directories` is rendered only as the complete segment `**`, matches zero or
  more directories, is never terminal, and is never adjacent to another recursive token.

Static fixed prefixes, exact targets, and fixed derived suffixes use that same closed ASCII
literal type. Registry validation rejects every non-ASCII path literal; consequently exact
raw-byte/code-unit relevance cannot disagree with later NFC classification. The final token
must be `literal` or `one-segment` and denotes a regular file. A program
uses only this closed typed grammar; parser, token, and depth capacity and completion
behavior come from Node.js, the parser, and the execution environment. The build compiler
parses the compact selector into this typed program, then requires exact canonical
round-trip back to the selector. The runtime
loads only the validated typed program and never passes the text to a general-purpose glob
or regular-expression evaluator.

The structured Base, selector list, and segment programs are authoritative. The vendor
tables' **Expansion** cells are human summaries derived from those programs. They use
`exact`, `direct-child`, `descendant-inventory`, and `recursive-subtree` labels in program
order and may list more than one label for a composite selector.

### Repository selector requirements

Every Inspector Repository selector starts with the literal `./`, which means the exact
Repository source root. A bare `**/` prefix is invalid and must fail registry validation.

| Form | Required program summary | Meaning |
|---|---|---|
| `./path/file` | `exact` | One exact file relative to the Repository source root |
| `./path/*` | `direct-child` | Matching direct children of one root-relative directory; `*` never crosses `/` |
| `./**/name` | `descendant-inventory` | Explicit Inspector inventory at the root and below it; `**` is a complete segment representing zero or more directory segments |
| `./path/**/*.ext` | `recursive-subtree` | Explicit recursive Inspector inventory below one root-relative subtree, including its root level |
| `./**/.claude/skills/*/SKILL.md` | `descendant-inventory`, then `direct-child` | Cross-product of possible context directories and exactly one direct skill-name directory; the terminal file remains exact |
| `./**/.claude/rules/**/*.md` | `descendant-inventory`, then `recursive-subtree` | Cross-product of possible rule-layer roots and the recursive subtree below each fixed `rules` directory |

`./**/` describes only the Inspector's downward descendant inventory. It does not mean
that a vendor walks downward, walks upward, searches ancestors, recognizes every nested
repository, or applies the matched file in a particular runtime context. Those claims
require separate vendor behavior and strategy records.

`*` matches exactly one non-empty segment. `**` is valid only as a complete
`recursive-directories` token. A `one-segment` token never implies recursion, and a
literal-only program is exact. Repository rule tables must state Base, Relative selector,
and the derived Expansion summary separately; the immutable registry must carry the
one-to-one typed selector programs.

### Global selector requirements

A Global rule names one exact consented vendor boundary as Base and gives a selector
relative to that boundary. Environment/default-home resolution belongs to boundary
creation, not to the selector. Global selectors do not reuse the Repository `./` prefix,
do not authorize another vendor boundary, and cannot expand the paths permitted by
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

The no-I/O Global preview renders `pathPatterns` from this same immutable plan; there is
no separately maintained preview allowlist. The consent digest binds the contract
version, traversal-plan schema/version, closed selection policy, and canonical selector
programs. An enable
operation executes the exact plan represented by the accepted preview rather than
recompiling it from display text.

### Ordinary traversal and per-file outcomes

Runtime scanning executes the compiled plan as an ordinary recursive walk built on
`node:fs/promises` (FR-019). Enumerated raw entry names are the filesystem operands, and
public Source-relative Paths use their NFC display segments (FR-024); NFC segments,
`/`-joined `SourceRelativePath` values, and display strings never reconstruct a
filesystem path. Selector relevance is decided on the enumerated entry name with exact
literal and one-segment suffix comparisons. Symbolic links are followed transparently,
because the inspector shows what an agent reading the same path would see; a link whose
target is missing or unreadable yields that file's `file-unreadable` Diagnostic, and
recursive traversal tracks visited directories by real path so a link cycle cannot
prevent a scan from terminating. Hard links are ordinary files: there is no
physical-identity grouping, no read-once semantics, and no primary/alias path selection.
`.git/`, `.hg/`, and `.svn/` internals are excluded from traversal.

A problem confined to one file stays confined (FR-028): an unreadable file yields
the file-scoped `file-unreadable` Diagnostic, NUL-containing content yields
`file-content-binary`, and a parser or extractor failure yields
`recognition-parse-failed` while the complete readable source stays displayed and
comparison-eligible. Each such outcome makes an otherwise publishable generation
`partial` with every unaffected file complete. Invalid non-NUL file-content UTF-8 is
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
issued `127.0.0.1` authority — static/SPA `GET`/`HEAD` for the packaged UI assets and
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
registry may request a read. The candidate must belong to an enabled boundary and match
an entry produced by the ordinary traversal above; the centralized service accepts no
arbitrary absolute path from an API request, relationship, or source file.

A `bounded-derived-candidate` uses a typed edge from an independently admitted static seed
and is nonrecursive: a derived candidate cannot seed another derivation. Relationship-only
and excluded rules, vendor locators, runtime strategies, imports, component references,
remote sources, and MCP-server-provided instructions never authorize a read.

Read authority for a bounded-derived candidate exists only through a closed, versioned
`DerivationProgram` interpreted by the centralized service. Each program pins the exact
static seed rule, declaration field (including a closed matched-path sentinel where
applicable), and seed kind; chooses its base only from `seed-matched-path-parent` or
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
controls, unpaired surrogates, and non-NFC segments reject the whole derivation with zero
target I/O. There is no percent/URL/URI decoding, environment expansion, home resolution, or
platform path parsing. The interpreter produces typed one-segment tokens, never a path
string. Fixed suffix alternatives use literal `first-present-exact`: only a missing exact
classification advances in registry order; the first present path stops later
alternatives even if its later read or parse result is unsuccessful. An ancestor-
chain placement applies that rule independently at every fixed root-to-narrow placement.

A path admitted independently by a static traversal simply gains the derived provenance;
static selector scope is never widened to cover a derived target, and a derived result
never becomes the seed of another derivation.

The registry contains data only: it cannot supply a callback, function pointer, arbitrary
`path.join` recipe, free-form path expression, glob, or regular expression. The exact
closed schema and the initial derived-rule mappings are enumerated by the
[data-model contract](../data-model.md); adding a variant or mapping is a contract-versioned
change, not an extension point at runtime.

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
  filesystem open; only a static or bounded-derived admission in the shipped registry does.
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
2. Every Repository matcher begins with `./`; a bare `**/` is rejected. Exact,
   direct-child, `./**/` descendant, and fixed-subtree recursive forms have distinct
   positive and near-miss fixtures. Matcher fixtures accept canonical bare `*`, reject a
   misplaced/adjacent `**`, and reject every non-ASCII or forbidden literal/suffix code unit.
3. A `./**/` fixture proves only downward Inspector inventory and carries separate unknown
   or conditional vendor-runtime facts where the upstream traversal is not established.
4. Typed matchers compile deterministically to immutable versioned plans. Global fixtures
   prove that an exact target is read without enumerating its root, a fixed subtree
   enumerates only that subtree and permitted descendants, and neighboring paths receive
   zero enumeration, open, or read calls. Preview fixtures prove that
   `pathPatterns` come from that same plan and that the consent digest binds its version,
   closed selection policy, and canonical programs. Codex fixtures apply absent, empty,
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
   `--cwd` kept as given, a relative `--cwd` resolved against the capture, and the fixed
   startup error for a missing, empty, or duplicate option, with zero `chdir` calls and
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
9. Path-spelling fixtures include a non-NFC entry name read through its exact raw segments
   and displayed as NFC, and separate replacement processing for
   invalid non-NUL file-content UTF-8 as readable `utf-8-replaced` text. NFC segments,
   `SourceRelativePath` values, and display strings never reconstruct a filesystem path.
10. Official-source fixtures validate official HTTPS hosts, enumerated anchors, review dates,
   semantic fingerprints, affected-contract backlinks, and human-only updates. A drift
   result never changes a behavior, rule, or strategy automatically.
11. The registry fails closed on an unknown matcher, traversal, or derivation kind; an
   invalid token sequence or position; a selector/program correspondence or canonical-
   round-trip mismatch; a malformed selector; a duplicate identifier; an orphan reference;
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
