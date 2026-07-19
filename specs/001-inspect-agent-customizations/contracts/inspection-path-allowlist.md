# Contract: Inspection Path Allowlist Grammar and Index

[日本語](inspection-path-allowlist.ja.md)

**Contract version**: 2026-07-17

**Inspection-path decision revalidation**: 2026-07-17

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
| [Official sources](official-sources.md) | `sourceId`, canonical official URL, bounded section anchors, review date, and reciprocal affected-contract references |

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

The Repository boundary is the exact process working directory from which the user
launches `npx`. The Inspector does not walk above it to find a Git or product project root.
Repository inventory proceeds only within the validated launch-root boundary record. A
vendor may use a different runtime root or walk direction; that fact belongs to the vendor
and runtime-composition contracts and never changes this boundary.

### Global

Global inspection is disabled in every new session and requires consent bound to the
current contract version and exact no-I/O preview. Every accepted vendor-home root becomes
its own tool-specific Global Source—at most one each for Copilot, Claude, and Codex—and
each Source is bound to exactly one root. These Sources are not Repository children, are
never merged with one another, and are never merged into the Repository Source.

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
| **Selector programs** | Exactly one closed segment program per selector, in the same order; a program can contain multiple bounded expansion steps |

Each selector program has 1..64 ordered segment tokens from this closed union:

- `literal(value)` matches one case-sensitive NFC segment exactly; `value` contains no
  separator, wildcard, empty/dot segment, or Windows-special spelling.
- `one-segment(suffix)` matches exactly one non-empty segment: `*` when `suffix` is empty,
  or `*<fixed-literal-suffix>` otherwise. It is a directory step when non-terminal and a
  regular-file step when terminal.
- `recursive-directories` is rendered only as the complete segment `**`, matches zero or
  more directories, is never terminal, appears at most twice, and is never adjacent to
  another recursive token.

The final token must be `literal` or `one-segment` and denotes a regular file. Every
traversal shares the session's ordinary visited-entry/path-depth limits; a program adds no
separate unbounded glob engine. The build compiler parses the compact selector into this
typed program, then requires exact canonical round-trip back to the selector. The runtime
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
Repository plan may perform the bounded broad traversal explicitly described by its
selector programs, subject to the shared entry, depth, exclusion, and deadline limits.

A Global plan is narrower and never starts by enumerating the vendor-home root. For an
exact Global target, the filesystem service snapshots the boundary and `lstat`s only the
fixed literal ancestor chain and target; it does not `opendir` the root. For an explicitly
fixed subtree, such as the contracted Copilot `instructions/` subtree, it `lstat`s only
the fixed chain to that subtree and may `opendir` only that subtree and the descendants
permitted by its segment program. It performs no `opendir`, `lstat`, `realpath`, open, or
read against a neighboring path that the plan does not reach. Missing permitted paths do
not broaden the plan or trigger sibling discovery. A successfully verified fixed target
creates a targeted enumeration record; "enumeration record" does not imply that its parent
directory was listed.

The plan also carries a closed `selectionPolicy`. Every rule uses `all-matches` except
`codex.global.instructions`, whose exact ordered selectors are `AGENTS.override.md` then
`AGENTS.md` and whose policy is `codex-global-first-non-empty`. That branch safely reads the
override only to establish whether its decoded string, after removal of an optional leading
UTF-8 BOM, has `String.prototype.trim().length > 0`. A non-empty override short-circuits before any operation on the fallback; an
absent or safely established empty override advances to `AGENTS.md`. A whitespace-only file is
empty. A present candidate that is unsafe, unreadable, oversized, or undecodable fails
closed without examining a later selector. `absent` means only an explicit not-found result
from that exact target's `lstat` after root verification; permission, type, metadata,
ancestor/root, canonicalization, and post-observation disappearance are failures. At most
one non-empty file is published.

The no-I/O Global preview renders `pathPatterns` from this same immutable plan; there is
no separately maintained preview allowlist. The consent digest binds the contract
version, traversal-plan schema/version, closed selection policy, and canonical selector
programs. An enable
operation executes the exact plan represented by the accepted preview rather than
recompiling it from display text.

### Matching and Node.js entry verification

For every name obtained by directory enumeration, the service retains internal
`rawRelativeSegments` using the exact `Dirent.name` spellings. Those raw segments are used
only to reconstruct, verify, and read the filesystem path. It separately computes NFC
`classificationSegments`; only those segments, joined with `/`, are used for matcher
classification, deterministic sorting, and the serialized `SourceRelativePath`. A
normalized or canonical spelling is never substituted into a filesystem operation.

Every opened directory is collected into a bounded, complete sibling buffer before any
of its entries is descended into or opened. If the buffer cannot be completed within the
shared limits, that directory fails closed. When two or more distinct raw sibling names
normalize to the same NFC segment and therefore the same parent-relative classification
key, every entry in that collision group fails closed: none is descended into or read,
and the service emits bounded diagnostic
`safe-fs-path-normalization-collision`. A single non-colliding NFD spelling remains valid:
the service reads it through its raw segments while matching, sorting, and displaying its
NFC `SourceRelativePath`.

Canonical or normalized strings are diagnostic/classification data and never authorize a
read by themselves. The centralized Node.js filesystem service first establishes lexical
containment and snapshots the source root's identity and canonical `realpath`. It `lstat`s
every plan-authorized ancestor before considering a candidate. Every candidate
verification phase—enumeration, immediately before open, after
open but before reading, and after the bounded read—uses this exact ordered sequence: (1) `lstat` the
candidate path and reject a symbolic link, non-regular type, or unexpected identity; (2)
only after that succeeds, resolve the candidate `realpath` and verify containment with
`node:path.relative`, whose platform-separator-normalized result must be non-absolute and
neither `..` nor start with `../`; and (3) `lstat` the candidate path again and require its
identity, type, size, and relevant timestamps to equal the first `lstat`. Thus a stable
symlink is rejected before any candidate `realpath` call can follow it. The service supplies
internal source-relative enumeration records carrying the observed root, ancestor, path,
canonical-location, identity, type, size, and relevant timestamp metadata. A classifier may
select only an exact previously enumerated record.

Before a derived selector reaches enumeration-record lookup, each NFC classification segment
rejects NUL, control characters, Windows-special characters, trailing dot/space, device basenames,
alternate-data-stream spelling, and ambiguous case-, short-name-, or other aliases. Every
remaining segment must resolve to exactly one collision-free enumerated classification
record, whose raw segments remain the only path spelling used for a read. `.git/`, `.hg/`, and
`.svn/` internals are excluded from traversal.

## Rule classes

Every rule has a stable `ruleId` and exactly one discovery class:

| Class | Meaning | May authorize a read? |
|---|---|---|
| `static-candidate` | The rule's structured source-relative matcher alone can create a candidate. | Yes, after consent and safe-read checks |
| `bounded-derived-candidate` | An independently accepted seed declares one target through a closed vendor-specific derivation. | Yes, only for that one edge and within every derivation bound |
| `relationship-only` | The Inspector records that a product may follow or use a target without opening it. | No |
| `excluded` | The surface is documented but intentionally outside this release or source boundary. | No |

Inline declarations inside an accepted file are recognition metadata on that physical
file unless a bounded-derived rule explicitly creates another candidate. An unlisted
field, import, link, component path, command, directory, vendor locator, `behaviorId`, or
`strategyId` never grants read authority.

One physical file may be admitted by multiple rules and tools. It is read once and retains
each accepted provenance, including its `ruleId`, matched selector, evidence,
documentation status, order facts, and applicability. Admissions are not collapsed into
a recognition-level winner.

## Read authorization and applicability

Only a `static-candidate` or `bounded-derived-candidate` in the shipped, contract-versioned
registry may request a safe read. The candidate must belong to an enabled boundary, match
an exact enumerated regular-file record, remain within all file/source/generation limits,
and pass the centralized Node.js service's repeated lexical/`realpath` containment and
enumeration/open/post-read identity checks.

Bounded derivation is exactly one typed edge from an independently admitted static seed.
A derived candidate cannot seed another derivation. Relationship-only and excluded rules,
vendor locators, runtime strategies, imports, component references, remote sources, and
MCP-server-provided instructions never authorize a read.

Read authority for a bounded-derived candidate exists only through a closed, versioned
`DerivationProgram` interpreted by the centralized service. Each program pins the exact
static seed rule, declaration field (including a closed matched-path sentinel where
applicable), and seed kind; chooses its base only from `seed-matched-path-parent` or
`source-root`; names one closed extraction variant; uses only fixed literal segment tokens
and bounded authored-segment tokens from a closed union, with each authored token producing
exactly one validated segment rather than injecting an unparsed path; declares a fixed
suffix; and carries an explicit fan-out bound. Extracted
segments must pass the same collision-free classification and containment admission as a
static candidate.

The registry contains data only: it cannot supply a callback, function pointer, arbitrary
`path.join` recipe, free-form path expression, glob, or regular expression. The exact
closed schema and the five initial derived-rule mappings are owned by the
[data-model contract](../data-model.md); adding a variant or mapping is a contract-versioned
change, not an extension point at runtime.

A match proves only that an authored artifact is inside Inspector inventory scope. It does
not prove that a vendor installs, enables, trusts, selects, loads, merges, or follows it.
Surface, project/root context, runtime working directory, target path, trust, approval,
enablement, selection, agent context, tool availability, installation, managed policy,
instruction budget, and external state remain independent condition facts. Missing or
excluded inputs never default to satisfied, and the UI must not call a candidate
semantically effective.

## Symlink, alias, and resource invariants

- Symbolic-link files and directories and non-regular candidates are rejected. Junctions,
  mount-point changes, reparse points, hard-to-canonicalize aliases, and boundary crossings
  fail closed whenever Node.js exposes enough information to detect them; inability to
  establish both lexical and `realpath` containment also fails closed. If Node.js reports
  required metadata or canonicalization as errored, ambiguous, or unusable, the service
  emits `safe-fs-boundary-unverifiable` and rejects the candidate, or the entire source when
  the unverifiable state belongs to its root or an ancestor shared by the traversal.
- A validated source-boundary record and exact enumeration record authorize only the
  centralized read operation. A canonical path string, relationship target, or source text
  alone never authorizes a direct filesystem open.
- Immediately before opening, the service repeats the root-identity and ancestor-`lstat`
  checks, then runs the ordered candidate verification sequence above.
  It opens the candidate with `O_NOFOLLOW` whenever `node:fs.constants.O_NOFOLLOW` exists
  and is effective on that Node.js/platform combination; this is mandatory defense in depth
  for the final component, not a substitute for the surrounding checks. After open but
  before reading any bytes, it runs the same ordered candidate verification sequence again,
  then compares the opened `FileHandle.stat()` identity, type, size, and relevant timestamps
  with both `lstat` results from that phase and the enumeration/pre-open snapshots.
- After the bounded read and before any parse, publish, or commit, the service repeats the
  root identity and every ancestor `lstat`, runs the same ordered candidate verification
  sequence, and calls `stat()` on the same still-open `FileHandle`.
  Any detected error, ambiguity, containment failure, or change to identity, type, size, or
  relevant timestamps discards the entire byte buffer and fails closed. An unverifiable
  boundary uses `safe-fs-boundary-unverifiable`; another detected race yields the applicable
  bounded, secret-safe diagnostic.
- Public Node.js APIs do not provide a portable directory-handle-relative open. An active
  adversarial process can therefore replace the source root or an ancestor between checks
  without a cross-platform kernel-enforced containment guarantee on any platform. Replacing
  the final component is likewise outside the initial-release threat model only where
  effective `O_NOFOLLOW` is absent. Ordinary concurrent edits and every detectable race remain
  in scope: they must fail closed and discard all bytes. Same-device bind mounts, unreported
  reparse behavior, and other OS semantics that Node.js does not expose remain explicit
  platform limitations and are never represented as an absolute containment guarantee.
- File bytes, visited entries, candidate counts, derivation fan-out, relationship counts,
  parser work, diagnostics, and deadlines use the exact limits in the
  [data-model contract](../data-model.md).
  Reaching a limit produces the contracted partial result or diagnostic, never implicit
  expansion, an unbounded retry, or a fallback read.
- One unsafe, unreadable, malformed, changed, or oversized candidate does not prevent
  unaffected candidates from being reported.
- No relationship or excluded record may be promoted merely because its target happens
  to exist. A target is readable only through an independent static or bounded-derived
  admission.

## Common conformance requirements

Contract and fixture validation must prove all of the following:

1. Every `behaviorId`, `ruleId`, `strategyId`, and `sourceId` is defined once, resolves all
   references reciprocally, and has semantically equivalent English and Japanese rows.
2. Every Repository matcher begins with `./`; a bare `**/` is rejected. Exact,
   direct-child, `./**/` descendant, and fixed-subtree recursive forms have distinct
   positive and near-miss fixtures.
3. A `./**/` fixture proves only downward Inspector inventory and carries separate unknown
   or conditional vendor-runtime facts where the upstream traversal is not established.
4. Typed matchers compile deterministically to immutable versioned plans. Global call-trace
   fixtures prove that an exact target does not `opendir` its root, a fixed subtree opens
   only that subtree and permitted descendants, and neighboring paths receive zero
   `opendir`, `lstat`, `realpath`, open, or read calls. Preview fixtures prove that
   `pathPatterns` come from that same plan and that the consent digest binds its version,
   closed selection policy, and canonical programs. Codex traces apply absent, empty,
   BOM-only, whitespace-only, non-empty, unreadable, oversized, undecodable, and non-regular
   cases independently to both ordered targets; they distinguish exact-target not-found
   from every other error and prove short-circuit/fail-closed behavior plus at most one
   published file.
5. Every static and bounded-derived rule has positive, root/nested, boundary, symlink,
   alias, resource-limit, and applicable multi-tool fixtures. Derived fixtures additionally
   prove closed `DerivationProgram` interpretation without callbacks or free-form path
   construction, one-edge depth, fan-out limits, containment, deterministic retention,
   and no read for the first rejected target.
6. Relationship-only and excluded fixtures prove zero read authority even when a target
   exists or matches a generic filename. User behavior recorded outside FR-015 through
   FR-018 never becomes a Global candidate.
7. A multiply admitted physical file is read once and retains each independent provenance;
   matcher, evidence, documentation, scope/order, and applicability are not collapsed.
8. Centralized Node.js filesystem fixtures on every supported OS cover lexical and
   `realpath` escape, `path.relative` containment, symlink and non-regular rejection,
   the exact `lstat`/`realpath`/second-`lstat` order in every phase, effective `O_NOFOLLOW`
   use when available, every pre-read and post-read comparison above, and root/parent/final-
   entry replacement. A stable-symlink fixture proves rejection before a candidate
   `realpath` call. Every ordinary concurrent or otherwise detectable change publishes no
   bytes and fails with a bounded diagnostic. Reported
   error, ambiguity, or unusable metadata yields `safe-fs-boundary-unverifiable`; an OS
   behavior that Node.js cannot observe is recorded as a platform limitation and is not
   counted as proof against the excluded active-adversary race.
9. Path-spelling fixtures include a non-colliding NFD-only name that is read through its
   exact raw `Dirent.name` segments and displayed as an NFC `SourceRelativePath`, plus NFC
   and NFD sibling spellings with the same classification key. The latter fixture emits
   `safe-fs-path-normalization-collision` and proves that every colliding sibling receives
   zero descend/open/read operations.
10. Official-source fixtures validate official HTTPS hosts, bounded anchors, review dates,
   semantic fingerprints, affected-contract backlinks, and human-only updates. A drift
   result never changes a behavior, rule, or strategy automatically.
11. The registry fails closed on an unknown matcher, traversal, or derivation kind; an
   invalid token position or count;
   selector/program count or canonical-round-trip mismatch, malformed selector, duplicate
   identifier, orphan reference, mismatched contract version, or English/Japanese
   semantic difference.

Changing a matcher base, selector/program, derived expansion summary, read-authorizing class, or Global scope is a
contract semantic change. Maintainers must review identifier compatibility, update every
affected evidence backlink and fixture, update both language contracts together, and bump
the consent-bound contract version when the accepted Global boundary changes.
