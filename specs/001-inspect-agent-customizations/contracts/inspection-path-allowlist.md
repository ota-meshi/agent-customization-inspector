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
`process.cwd()` when `--cwd` is omitted. On Windows, explicit UNC/server-share/device,
current-drive/root-relative, and `C:`/`C:foo` drive-relative forms are rejected before
`resolve`; only a plain relative option is resolved against the anchored capture, while an
absolute drive option is retained. POSIX retains an absolute option or resolves a relative
option against the capture. Every selected absolute result passes the same shared pure
`LexicalAbsoluteRootParts` parser used below. Selection performs zero filesystem/network I/O,
no `chdir`, and no per-drive working-directory resolution; invalid option shapes fail before
session/browser creation. Generation 0 contains the one
non-authorizing Repository Source before central admission. The Inspector does not walk
above the selected root to find a Git or product project root. Repository inventory proceeds
only within the later validated selected-root boundary record. A
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
empty. Replacement-decoded `utf-8-replaced` text participates unchanged and any `U+FFFD` is
non-whitespace. A deterministic unsafe or binary candidate ends without examining a later
selector. `absent` means only exact `ENOENT` from that contract-declared target `lstat`
after root verification; the same code after observation is `entry-disappeared`. Every
other throw/rejection, including `open`/`read`, propagates without a domain catch or fallback. The
policy publishes the selected non-empty file and never publishes both selectors.

The no-I/O Global preview renders `pathPatterns` from this same immutable plan; there is
no separately maintained preview allowlist. The consent digest binds the contract
version, traversal-plan schema/version, closed selection policy, and canonical selector
programs. An enable
operation executes the exact plan represented by the accepted preview rather than
recompiling it from display text.

### Closed structural-`lstat` checkpoints

Every compiled plan carries the exact ordered `StructuralLstatCheckpointTemplate` catalog
below, and each selector carries only the discovery checkpoint IDs it may instantiate.
Each template fixes `operation: lstat`, `readAuthority: false`, its phase, target role,
observation state, exact-`ENOENT` outcome, and multiplicity. `safe-fs.ts` must mint a
module-private single-call instance bound to the exact root operation, selector or ticket,
raw target identity, and occurrence before the call. Return or rejection consumes it. No
caller may synthesize, serialize, reuse, retarget, or transfer it to another operation.

Selector compilation is lossless and closed. `repository-program` has empty `fixedPrefix`,
the complete matcher program in `remainder`, and `discoveryCheckpointIds: []`.
`global-exact` has a non-empty all-literal `fixedPrefix` including the terminal target and
empty `remainder`; its IDs are row 20 then row 3 for a one-component target, otherwise row
20, row 2, then row 3. Row 20 rechecks the root before descendant I/O, row 2 covers every
component except the target, and row 3 covers the target.
`global-fixed-subtree` has the non-empty maximal leading literal chain including the subtree
root, a non-empty non-literal-first remainder, and rows 20 then 2; row 2 covers every prefix
component including the subtree leaf. Every row-2 component receives its own rows 4–7
directory sequence before the next operand is constructed, and the leaf sequence therefore
completes before that leaf is opened. Registry-authored fields,
an empty/non-maximal Global prefix, and every other field/ID tuple are rejected. Rows 4–7
are automatic for an observed candidate and never occur in the ID array; rows 8–19 are
automatic for its ticket, rows 21–24 are automatic before every `opendir`, and rows 25–28
are automatic after complete sibling collection and before its buffer is used.

| Order / checkpoint ID | Phase and target role | Observation / exact-`ENOENT` outcome | Multiplicity |
|---|---|---|---|
| 1 `root-admission-component` | `root-admission`; `lexical-root-component` | `pre-observation`; `absent` | Parsed anchor once, then each component, root to leaf, with exact platform operands |
| 2 `selector-fixed-prefix-discovery` | `selector-discovery`; `selector-fixed-prefix` | `pre-observation`; `absent` | Every fixed-prefix component in every selector execution, including a component observed by an earlier selector |
| 3 `selector-exact-target-discovery` | `selector-discovery`; `selector-exact-target` | `pre-observation`; `absent` | Each attempted exact static target; the Codex primary/fallback checkpoint |
| 4 `enumerated-admission-root-recheck` | `enumerated-admission`; `admitted-root` | `post-observation`; `entry-disappeared` | Each observed candidate |
| 5 `enumerated-admission-ancestor-recheck` | `enumerated-admission`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each admitted ancestor/observed candidate, root to leaf |
| 6 `enumerated-admission-candidate-first` | `enumerated-admission`; `observed-candidate-first` | `post-observation`; `entry-disappeared` | Each observed candidate before `realpath` |
| 7 `enumerated-admission-candidate-repeat` | `enumerated-admission`; `observed-candidate-repeat` | `post-observation`; `entry-disappeared` | Each observed candidate after `realpath` |
| 8 `pre-open-root-recheck` | `pre-open`; `admitted-root` | `post-observation`; `entry-disappeared` | Each ticket |
| 9 `pre-open-ancestor-recheck` | `pre-open`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each admitted ancestor/ticket, root to leaf |
| 10 `pre-open-candidate-first` | `pre-open`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Each ticket before candidate `realpath` |
| 11 `pre-open-candidate-repeat` | `pre-open`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Each ticket after candidate `realpath` |
| 12 `pre-read-root-recheck` | `pre-read`; `admitted-root` | `post-observation`; `entry-disappeared` | Each ticket |
| 13 `pre-read-ancestor-recheck` | `pre-read`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each admitted ancestor/ticket, root to leaf |
| 14 `pre-read-candidate-first` | `pre-read`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Each ticket before candidate `realpath` |
| 15 `pre-read-candidate-repeat` | `pre-read`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Each ticket after candidate `realpath` |
| 16 `post-read-root-recheck` | `post-read`; `admitted-root` | `post-observation`; `entry-disappeared` | Each ticket |
| 17 `post-read-ancestor-recheck` | `post-read`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each admitted ancestor/ticket, root to leaf |
| 18 `post-read-candidate-first` | `post-read`; `ticketed-candidate-first` | `post-observation`; `entry-disappeared` | Each ticket before candidate `realpath` |
| 19 `post-read-candidate-repeat` | `post-read`; `ticketed-candidate-repeat` | `post-observation`; `entry-disappeared` | Each ticket after candidate `realpath` |
| 20 `selector-root-recheck` | `selector-discovery`; `admitted-root` | `post-observation`; `entry-disappeared` | Start of every Global selector execution, before row 2 or 3 |
| 21 `pre-directory-open-root-recheck` | `pre-directory-open`; `admitted-root` | `post-observation`; `entry-disappeared` | Before every `opendir`; sole pre-open row when opening the source root itself |
| 22 `pre-directory-open-ancestor-recheck` | `pre-directory-open`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each directory strictly between root and non-root directory to open, root to leaf |
| 23 `pre-directory-open-target-first` | `pre-directory-open`; `directory-to-open-first` | `post-observation`; `entry-disappeared` | Non-root directory to open, before exact-platform `realpath` |
| 24 `pre-directory-open-target-repeat` | `pre-directory-open`; `directory-to-open-repeat` | `post-observation`; `entry-disappeared` | Non-root directory to open, after exact-platform `realpath` and before `opendir` |
| 25 `post-directory-enumeration-root-recheck` | `post-directory-enumeration`; `admitted-root` | `post-observation`; `entry-disappeared` | After complete sibling collection and before use; sole post-enumeration row for the source root |
| 26 `post-directory-enumeration-ancestor-recheck` | `post-directory-enumeration`; `admitted-ancestor` | `post-observation`; `entry-disappeared` | Each directory strictly between root and enumerated non-root directory, root to leaf |
| 27 `post-directory-enumeration-target-first` | `post-directory-enumeration`; `enumerated-directory-first` | `post-observation`; `entry-disappeared` | Non-root enumerated directory, before exact-platform `realpath` |
| 28 `post-directory-enumeration-target-repeat` | `post-directory-enumeration`; `enumerated-directory-repeat` | `post-observation`; `entry-disappeared` | Non-root enumerated directory, after exact-platform `realpath` and before confirmed `fs.Dir` close |

The compiler rejects missing, extra, reordered, widened, or unresolved catalog/reference
data. Runtime instantiates only occurrences demanded by the bound plan and ticket. Table
order is immutable schema order, not one chronological run: row 20 precedes row 2/3 for each
Global selector. Immediately before each `opendir`, row 21, row 22 in ancestor order, row
23, exact-platform `realpath`, then row 24 complete. The registered `fs.Dir` is driven with
explicit `Dir.read()` until null; rows 25, 26 in ancestor order, 27, exact-platform
`realpath`, then 28 complete while it remains open. Registry `close-confirmed` is required
before sibling classification, descent, or ticket issuance. Source-root enumeration uses
only rows 21 and 25.
Only `error.code === 'ENOENT'` from the instance's one `lstat`
returns the listed outcome. A phase/role/target mismatch, consumed or absent instance,
different error code, undeclared `lstat`, or rejection from `opendir`, `open`, `read`,
`realpath`, `FileHandle.stat`, or any other operation propagates unchanged. A successful
checkpoint never licenses a later call to reuse its catch. For the Codex policy, only row 3
on the primary selector may advance to the fallback as `absent`.
An observed candidate is a collision-free selected `Dirent` after complete sibling
classification, one immutable exact-file target successfully observed by row 3, or any
immutable Global fixed-prefix directory component successfully observed by row 2. Each
receives exactly one rows 4–7 sequence before ticket issuance, directory descent, or
targeted `opendir`; the expected file/directory type is bound by the observation. Rows
21–24 revalidate any directory immediately before it is opened, and rows 25–28 plus
confirmed close validate the completed enumeration before its sibling buffer is used. Derived
candidates mint no selector-discovery row 2 or 3. They reuse an existing collision-free
record/ticket when present; otherwise the central service performs only the typed targeted
enumeration authorized by the exact `DerivationProgram` segment sequence. It completes rows
21–24 for the current admitted parent, opens it, collects the complete sibling name set,
completes rows 25–28 and confirmed close, then classifies the set, selects one unique exact
segment, and gives that selected `Dirent` one rows 4–7 sequence before descent or ticket
issuance. Unselected siblings receive no entry I/O. Missing classification is a deterministic
miss after parent enumeration; a relevant unrepresentable name or collision is Source-fatal.

For post-observation `entry-disappeared`, root-role rows 4/8/12/16/20/21 map to pathless
source-fatal `safe-fs-root-stale`; root row 25 has the same mapping. Ancestor-role rows
5/9/13/17/22/26, directory-to-open rows 23/24, and enumerated-directory rows 27/28 map to
pathless source-fatal `safe-fs-ancestor-stale`. Candidate-file rows map
exactly as defined in the data-model contract. Successfully returned records use the same
first-match order in selector-discovery, enumerated-admission, pre-directory-open,
post-directory-enumeration, pre-open, pre-read, and post-read: unusable required data →
`safe-fs-boundary-unverifiable`; link →
`safe-fs-link-rejected`; wrong bound type → `safe-fs-type-rejected`; canonical mismatch →
`safe-fs-boundary-unverifiable`; `dev` change → `safe-fs-device-changed`; `ino`/handle
identity change → `safe-fs-race-detected`; other mode/size/time/terminal-`nlink` change →
`safe-fs-file-metadata-changed`. The first match stops evaluation. Every Global row-2
component immediately receives this classification with `expectedType: directory` and rows
4–7 before the next component operand is constructed. This is repeated independently for
every selector execution; a shared prefix observed by an earlier selector is never reused
without the later selector's own row-2 and rows 4–7 sequence.

### Root spelling admission and platform operands

Before row 1 or any other filesystem call, the central service applies the closed pure
`LexicalAbsoluteRootParts` parser defined by the [data-model contract](../data-model.md) to
the exact retained root. Every platform rejects NUL and unpaired UTF-16 surrogates with
zero I/O. POSIX additionally rejects U+FFFD in a root string, accepts only `/` or exact
non-empty non-dot components separated by one `/`, and creates private Buffer prefixes for
the anchor and every component. Windows accepts only an anchored drive form. It rejects
every explicit two-leading-separator UNC/server-share/device spelling, current-drive, drive-relative,
device-namespace, and malformed drive form before I/O; no server/share spelling can reach
`lstat`, `realpath`, DNS, or SMB access. It preserves exact UTF-16 code units and probes only
the drive anchor followed by each component. Row 1 uses only those exact operands.
`realpath` returns and is parsed as a Buffer on POSIX and as an exact plain or mapped drive-
namespace string on Windows; canonical values are comparison-only and never replace a raw
I/O operand. A syntactically plain drive may be OS-mapped network storage and a POSIX root
may be a network mount; the pure grammar cannot identify those cases, and post-consent/root-
selection exact-operand checks may perform network filesystem I/O and cause OS-mediated
traffic. FR-022 excludes that traffic from its direct product-issued outbound-request assertion
and requires local fixture roots for that assertion. The assertion separately classifies and
validates the two exact FR-022 authorized internal loopback classes at the issued `127.0.0.1`
authority—closed unauthenticated static/SPA `GET`/`HEAD` and capability-authenticated declared
API requests—and requires zero other product network/URL/MCP requests. Only explicit server/share spellings
receive the pre-I/O filesystem/DNS/SMB guarantee.

For `origin: process-cwd`, the only extra operand is `lstat('.')`, whose identity must equal
the selected absolute root. The original spelling of a relative `--cwd` is never probed:
all admission and descendant I/O use only its lexically selected absolute root. Root and
candidate containment is an exact platform component comparison—POSIX bytes or Windows
code units, with no case fold or Unicode normalization. Successfully returned malformed,
non-round-tripping, or non-contained canonical data fails closed. A redundant platform
`path.relative` check may only reject after lossless parsing; it never admits or constructs
a path. Differences that Node exposes, including case, normalization, and short-name
expansion, are rejected; aliases the platform does not expose remain the explicit
`platform-unobservable` limitation.

### Matching and Node.js entry verification

An enumerated POSIX name is a private defensive Buffer copy returned by
`opendir(parentBuffer, { encoding: 'buffer' })`; a Windows name is its exact returned UTF-16
code-unit sequence. A targeted fixed path whose plan forbids parent enumeration instead
uses immutable registry literal segments compiled into the same platform representation.
The closed ticket-path union is the only descendant operand: all-enumerated
`RawEntrySegment[]`, an all-registry exact `RegistryTargetSegment[]`, or the sole mixed form
of a non-empty fixed registry prefix followed by a non-empty enumerated raw remainder.
Element-wise unions are forbidden. NFC `classificationSegments`, their `/`-joined `SourceRelativePath`, canonical
values, and display strings never reconstruct a filesystem path.

Selector relevance is decided on exact bytes/code units before text decoding. Literal and
one-segment suffix comparisons are exact. At a recursive directory position, a known
directory or an unknown `Dirent` type is potentially relevant, while a known non-directory
may be ignored without `lstat`. A relevant POSIX name must pass `isUtf8` and exact decode/
re-encode equality; a relevant Windows name must contain no unpaired surrogate. A relevant
unrepresentable name receives pathless session Diagnostic
`safe-fs-entry-name-unrepresentable`, receives zero entry `lstat`/descent/`realpath`/open/
read calls, makes the source attempt fatal, and publishes no generation or partial item.
Its nonserialized lifecycle owner is exposed only through
`repositoryFailureDiagnosticId`, `GlobalControlView.toolFailures`, or
`StaleSourceFailure`. An irrelevant unrepresentable name is ignored. This filename rule is
separate from file content: representable files with invalid non-NUL UTF-8 bytes are decoded
once with replacement semantics and processed unchanged as `utf-8-replaced` text.

Rows 21–24 bind exact bigint directory/root/ancestor `dev`, `ino`, `mode`, `mtimeNs`, and
`ctimeNs` immediately before each open. Every opened directory is collected into a complete
raw sibling buffer before descent or open. Rows 25–28 then require the same identity/type/
mode and unchanged `mtimeNs`/`ctimeNs`, and the resource registry must confirm `fs.Dir`
closure before the buffer is classified or used. A detectable create/remove/rename during
enumeration is source-fatal and publishes no generation. A throw/rejection before
completion, during post-checks, or during close propagates to the trigger-owning outer boundary,
publishes no attempt result/generation, and never becomes contracted-partial. Distinct raw
relevant siblings with the same NFC classification key all fail closed with pathless session
Diagnostic `safe-fs-path-normalization-collision`; no member is descended into or read, the
source attempt is fatal, and no generation or partial item is published. A single
non-colliding NFD spelling remains valid and is read through its raw segments while the
public path is NFC.

Canonical containment and the rows 4–19 sequences use the platform representation above.
Each observation binds `expectedType: directory | regular-file`: roots, ancestors,
fixed-subtree leaves, derived intermediate segments, and nonterminal matcher steps require a
directory; only a terminal candidate requires a regular file. Each phase first `lstat`s and
rejects a link, a type different from that bound expected type, or changed identity, then
parses and exact-component-compares the candidate `realpath`, then repeats `lstat` and exact
metadata comparison. A stable symlink is therefore rejected before candidate `realpath`.
The service exposes only the resulting internal enumeration record, and a classifier may
select only that exact record.

A terminal-file identity is usable only when every path `lstat` and same-handle
`FileHandle.stat({ bigint: true })` exposes exact bigint fields, `ino !== 0n`, and
`nlink > 0n`. Within one Source scan attempt, hard-link grouping requires identical
`(dev, ino)`, stable equal `nlink` across every phase/member, and
`nlink >= BigInt(admittedPathCount)`. Missing, non-bigint, zero/negative, changing, or
group-inconsistent identity metadata returns `safe-fs-boundary-unverifiable` with zero
accepted bytes. Plausible non-unique values that Node cannot distinguish are an explicit
`platform-unobservable` limitation. Sources, attempts, and generations never share a
ticket, receipt, buffer, or read-once group and may each independently read the same
underlying object once.

Except for the content-dependent ordered Codex fallback below, one Source attempt completes
all static traversal, sibling classification, rows 4–7 admission, and physical-group
formation before consuming any static group. Groups are then consumed in deterministic
primary-path order; any later static admission is an internal invariant failure, not a
second read. When one physical file has multiple collision-free hard-link admissions
identified within that attempt before its group is consumed, the unsigned
UTF-8-bytewise lowest NFC path is primary and the other unique paths are ordered aliases.
Every raw provenance and ticket is retained. In deterministic primary/alias order, every
ticket runs rows 8–11 before the sole primary-path open, rows 12–15 before any read, and rows
16–19 after the one complete primary-handle read while that handle remains open. Each path's
identity and metadata must still equal its enumeration snapshot and the same handle identity
before bytes are accepted. Alias disappearance, replacement, or divergence discards all
bytes and prevents publication from an old observation. Filters/detail/selection match all
paths, while a file Diagnostic uses only the primary.

The `codex-global-first-non-empty` policy is the only static-discovery exception: a fallback
target is not touched until the override is absent or has been safely read as empty. If an
empty consumed override and the subsequently admitted fallback have the same usable
`(dev, ino)`, the fallback receives zero open/read and no alias/provenance merge. The
contracted-partial result contains a diagnostic-only fallback file with
`readState: boundary-rejected` and file-scoped
`safe-fs-ordered-fallback-alias-rejected`; the empty override probe remains unpublished.
Reusing its bytes, reopening the group, or silently omitting the fallback is forbidden.

Derivation occurs after its static seed read. An exact already-verified raw path gains the
derived provenance without another ticket/read. A different raw hard-link path may join a
not-yet-consumed physical group and undergo every ordinary check above. Once that group has
been opened/read, however, a late derived alias receives zero open/read, is not published as
an alias or provenance, and adds file-scoped `safe-fs-late-derived-alias-rejected` to the
existing file; the generation is contracted-partial and the existing bytes/read state stay
unchanged. Re-reading, reusing old bytes for the late path, or silently dropping the
Diagnostic is forbidden.

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
| `bounded-derived-candidate` | An independently accepted seed declares a target through a closed vendor-specific derivation. | Yes, only for the derived path enumerated by that closed rule |
| `relationship-only` | The Inspector records that a product may follow or use a target without opening it. | No |
| `excluded` | The surface is documented but intentionally outside this release or source boundary. | No |

Inline declarations inside an accepted file are recognition metadata on that physical
file unless a bounded-derived rule explicitly creates another candidate. An unlisted
field, import, link, component path, command, directory, vendor locator, `behaviorId`, or
`strategyId` never grants read authority.

One physical file may be admitted by multiple rules within one Source, or independently by
multiple tool Sources. It is read once per Source scan attempt and retains each provenance
accepted before that attempt's physical group is consumed, including its `ruleId`, matched selector, evidence,
record-by-record documentation/lifecycle assessments, order facts, and applicability.
`DocumentationStatus` is exactly `documented | partially-documented | unknown | conflict`;
the separate unique fixed-order lifecycle qualifier array is `preview`, `experimental`,
`deprecated`, and empty never implies stable. Admissions are not collapsed into
a recognition-level winner. Cross-Source, cross-attempt, and cross-generation reads are
independent. A late ordered fallback or derived hard-link path follows its explicit
rejection protocol above and is not an accepted alias admission.

## Read authorization and applicability

Only a `static-candidate` or `bounded-derived-candidate` in the shipped, contract-versioned
registry may request a safe read. The candidate must belong to an enabled boundary, match
an exact enumerated regular-file record, and pass the centralized Node.js service's
repeated lexical/`realpath` containment and
enumeration/open/post-read identity checks.

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
suffix; and enumerates every permitted output form. Extracted segments must pass the same
collision-free classification and containment admission as a static candidate.

Targeted derivation never falls back to a free-form path open. For each segment, the service
either reuses an already admitted enumeration record or enumerates exactly its admitted
parent and selects the unique collision-free raw-name record. Every newly selected directory
and terminal file is an observed candidate with the ordinary rows 4–7 checks; neighbors are
names only and receive no `lstat`, `realpath`, open, or read. The next parent is reachable
only through the preceding selected directory, so the interpreter cannot widen the plan.

Authored local paths use the exact pure tokenizer in the data-model contract. Prefix policy
handles only one literal `./`; U+002F is the sole separator. Empty input/segments, leading,
trailing, or repeated separators, `.`/`..`, backslash, colon, a first-segment home marker,
controls, unpaired surrogates, and non-NFC segments reject the whole derivation with zero
target I/O. There is no percent/URL/URI decoding, environment expansion, home resolution, or
platform path parsing. The interpreter produces typed one-segment tokens, never a path
string. Fixed suffix alternatives use literal `first-present-exact`: only a missing exact
classification advances in registry order; the first fully observed path stops later
alternatives even if its later safe/type/read/parse result is unsuccessful. An ancestor-
chain placement applies that rule independently at every fixed root-to-narrow placement.

A derived-only ticket is authorized by a module-private `DerivedTicketAuthority` binding the
exact program, current source/boundary/generation/scan, consumed static seed ticket and
provenance, source occurrence, placement/alternative indexes, and typed segment tokens to
one target. It cannot be serialized, retargeted, reused after revocation, or seed another
derivation. A ticket admitted independently by a static traversal keeps that traversal
authority and merely gains another provenance; seed traversal authority is never widened to
cover a derived target.

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

## Symlink, alias, and resource invariants

- Symbolic-link files and directories and non-regular candidates are rejected. Junctions,
  mount-point changes, reparse points, hard-to-canonicalize aliases, and boundary crossings
  fail closed whenever Node.js exposes enough information to detect them; inability to
  establish both lexical and `realpath` containment also fails closed. If successfully
  returned required metadata or canonicalization is ambiguous or unusable, the service
  emits `safe-fs-boundary-unverifiable` and rejects the candidate, or the entire source when
  the unverifiable state belongs to its root or an ancestor shared by the traversal.
- A validated source-boundary record and exact enumeration record authorize only the
  centralized read operation. A canonical path string, relationship target, or source text
  alone never authorizes a direct filesystem open.
- The sole caught filesystem rejection is exact `ENOENT` from a contract-declared
  structural `lstat`, mapped only to `absent` before observation or
  `entry-disappeared` afterward. The code is not inferred from message text and the rule
  never applies to `open`, `read`, or any other throw/rejection.
- Immediately before opening, the service repeats the root-identity and ancestor-`lstat`
  checks, then runs the ordered candidate verification sequence above.
  It opens the candidate with `O_NOFOLLOW` whenever `node:fs.constants.O_NOFOLLOW` exists
  and is effective on that Node.js/platform combination; this is mandatory defense in depth
  for the final component, not a substitute for the surrounding checks. After open but
  before reading any bytes, it runs the same ordered candidate verification sequence again,
  then compares the opened `FileHandle.stat()` identity, type, size, and relevant timestamps
  with both `lstat` results from that phase and the enumeration/pre-open snapshots.
- After the complete same-handle read and before any parse, publish, or commit, the service repeats the
  root identity and every ancestor `lstat`, runs the same ordered candidate verification
  sequence, and calls `stat()` on the same still-open `FileHandle`.
  Any detected ambiguity, containment failure, or change to identity, type, size, or
  relevant timestamps discards the entire byte buffer and fails closed. An unverifiable
  boundary uses `safe-fs-boundary-unverifiable`; another detected race yields the applicable
  actionable, secret-safe diagnostic.
- Public Node.js APIs do not provide a portable directory-handle-relative open. An active
  adversarial process can therefore replace the source root or an ancestor between checks
  without a cross-platform kernel-enforced containment guarantee on any platform. Replacing
  the final component is likewise outside the initial-release threat model only where
  effective `O_NOFOLLOW` is absent. Ordinary concurrent edits and every detectable race remain
  in scope: they must fail closed and discard all bytes. Same-device bind mounts, unreported
  reparse behavior, and other OS semantics that Node.js does not expose remain explicit
  platform limitations and are never represented as an absolute containment guarantee.
- File, collection, derivation, relationship, parser, diagnostic, and timing capacity is
  inherited from Node.js, parser libraries, the operating system, the filesystem, and the
  execution environment as specified in the [data-model contract](../data-model.md). A
  throw/rejection propagates without domain cause classification or recovery and, when
  REST-owned, is represented only by the generic Operation Error. A contracted partial is
  possible only after complete traversal for FR-028-eligible deterministic non-throwing
  outcomes. Neither path permits implicit expansion,
  retry without authority, fallback read, or a validity verdict.
- One deterministic unsafe, malformed, binary, or changed candidate does not prevent
  unaffected candidates from being reported when it satisfies the contracted-partial rule
  above. A throw/rejection publishes no current-attempt result and follows the owning-
  boundary rule.
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
4. Typed matchers compile deterministically to immutable versioned plans. Global call-trace
   fixtures prove that an exact target does not `opendir` its root, a fixed subtree opens
   only that subtree and permitted descendants, and neighboring paths receive zero
   `opendir`, `lstat`, `realpath`, open, or read calls. Preview fixtures prove that
   `pathPatterns` come from that same plan and that the consent digest binds its version,
   closed selection policy, and canonical programs. Codex traces apply absent, empty,
   BOM-only, whitespace-only, non-empty, replacement-decoded, binary, and non-regular cases
   independently to both ordered targets; they distinguish exact structural-`lstat`
   `ENOENT` from every other throw/rejection and prove short-circuit/propagation behavior, including that the
   two selectors are never both published.
   Shared-prefix Global traces prove that each selector independently executes row 20,
   every row-2 prefix observation, and its immediate rows 4–7 directory checks before the
   next descendant operand; no cross-selector admission cache suppresses those calls.
   Global-consent fixtures reject selector-shaped input, evaluate all three frozen entries,
   isolate deterministic rejected roots, publish all admitted one-root Sources in one batch
   generation, and prove that any other throw/rejection aborts the whole provisional subset.
5. Every static and bounded-derived rule has positive, root/nested, boundary, symlink,
   alias, thrown/rejected-operation, and applicable multi-tool fixtures. Derived fixtures additionally
   prove closed `DerivationProgram` interpretation without callbacks or free-form path
   construction, nonrecursive derivation, containment, deterministic retention on successful
   completion, owning-boundary propagation without a domain result, and no read for a rejected target.
6. Relationship-only and excluded fixtures prove zero read authority even when a target
   exists or matches a generic filename. User behavior recorded outside FR-015 through
   FR-018 never becomes a Global candidate.
7. Within one Source scan attempt, complete static discovery precedes group reads; each
   usable multiply admitted physical group is read once and retains each independent
   provenance. Matcher, evidence, record-by-record documentation/lifecycle assessments,
   scope/order, and applicability are not
   collapsed, and each admitted hard-link path retains its own ticket through every
   post-read check. Cross-Source/attempt/generation fixtures prove independent reads.
   Codex fixtures prove the explicit zero-read ordered-fallback hard-link rejection, and
   derived fixtures prove the distinct late-derived rejection. Identity fixtures cover
   `ino === 0n`, absent/non-bigint/zero `nlink`, changing `nlink`, identical unusable tuples,
   and `nlink < admittedPathCount`; all yield boundary-unverifiable with zero accepted bytes.
8. Centralized Node.js filesystem fixtures on every supported OS cover the exact pure root
   grammar, anchor/component row-1 operands, POSIX Buffer and Windows code-unit forms,
   malformed/device/current-drive/drive-relative rejection, every two-leading-separator
   UNC/server-share/device spelling including mixed separator forms, POSIX root U+FFFD rejection,
   `process-cwd` identity verification, and zero probes of an original relative `--cwd`
   spelling. They also cover exact-component canonical containment, lexical and `realpath`
   escape, redundant-only `path.relative` rejection, symlink and non-regular rejection,
   the exact row 20, per-selector row 2 plus rows 4–7, rows 21–24 pre-directory-open, rows
   25–28 post-directory-enumeration, and candidate-phase `lstat`/`realpath`/second-`lstat`
   order. Directory fixtures mutate an entry by create/remove/rename during explicit
   `Dir.read()` and prove metadata-stale failure, confirmed close, no descent/ticket/bytes,
   and no generation. They also cover effective `O_NOFOLLOW` use when available, every
   pre-read and post-read comparison above, and root/parent/final-entry replacement. A stable-symlink fixture proves rejection before a candidate
   `realpath` call. Every ordinary concurrent or otherwise detectable change publishes no
   bytes and fails with an actionable diagnostic. Successfully returned ambiguous or
   unusable metadata yields `safe-fs-boundary-unverifiable`; exact structural-`lstat`
   `ENOENT` alone becomes absent/disappeared; every other throw/rejection propagates. An OS
   behavior that Node.js cannot observe is recorded as a platform limitation and is not
   counted as proof against the excluded active-adversary race.
   Explicit UNC/server-share spelling proves zero filesystem/DNS/SMB calls; a mapped drive
   and a POSIX network mount are instead tested/documented as lexically indistinguishable
   post-consent filesystem I/O and are outside FR-022's zero-prohibited-direct-product-request
   assertion. That assertion must separately observe both exact authorized internal loopback
   classes and reject every request outside them, including customization-selected,
   remote-reference, or MCP requests.
9. Path-spelling fixtures include POSIX Buffer names with invalid UTF-8 in relevant and
   irrelevant positions, a literal U+FFFD name, Windows unpaired-surrogate and unknown-
   `Dirent` cases, immutable exact-target segments, and a non-colliding NFD-only name read
   through exact raw segments and displayed as NFC. They prove relevance before decoding,
   zero entry I/O plus source-fatal pathless lifecycle ownership for an unrepresentable
   relevant name, no generation/partial item, and separate replacement processing for
   invalid non-NUL file-content UTF-8. NFC/NFD sibling collision fixtures similarly emit
   `safe-fs-path-normalization-collision`, perform zero member descent/open/read, publish no
   generation, and expose exactly one lifecycle owner without an ambiguous path. Hard-link
   fixtures prove deterministic primary/alias ordering, retained raw provenances/tickets,
   all-path UI matching, primary-only file Diagnostic location, one primary-handle read, and
   rejection with all bytes discarded when any alias disappears or is replaced before
   open, before read, or after read.
10. Official-source fixtures validate official HTTPS hosts, enumerated anchors, review dates,
   semantic fingerprints, affected-contract backlinks, and human-only updates. A drift
   result never changes a behavior, rule, or strategy automatically.
11. The registry fails closed on an unknown matcher, traversal, or derivation kind; an
   invalid token sequence or position; a selector/program correspondence or canonical-
   round-trip mismatch; a malformed selector; a duplicate identifier; an orphan reference;
   a mismatched contract version; or an English/Japanese semantic difference.
12. Production-call instrumentation proves one content read from the sole accepted handle
    and zero mutation-capable APIs or flags: no write/truncate/create/rename/delete/link,
    chmod/chown, utimes, xattr, ACL, or requested atime mutation. Only an external harness
    snapshots bytes and, where stable APIs exist, xattrs/ACLs before and after execution;
    those observations never become a second product read. OS-attributable atime changes
    are reported separately.
13. Resource-lifecycle fixtures cover preallocated `opening` reservations, open/opendir
    rejection, synchronous attachment failure as process-fatal, explicit `Dir.read()`, one
    close call, synchronous close throw, concurrent closer joining, FileHandle event-before-
    fulfillment/event-before-rejection/rejection-before-late-event, `Dir.close()` rejection,
    poison clearing, restart-required directory unknown, disable-lineage transfer, and
    zero publication until every required close is confirmed.

Changing a matcher base, selector/program, derived expansion summary, read-authorizing class, or Global scope is a
contract semantic change. Maintainers must review identifier compatibility, update every
affected evidence backlink and fixture, update both language contracts together, and bump
the consent-bound contract version when the accepted Global boundary changes.
The implementation freeze task verifies the already approved bilingual Presentation
Allowlist and digest only. It may not author or semantically edit membership, source-form
applicability, extractors, or relationship kinds; any such delta stops dependent work and
requires synchronized design plus regenerated plan/tasks.
