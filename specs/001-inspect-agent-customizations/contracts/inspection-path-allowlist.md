# Contract: Inspection Path Allowlist Grammar and Index

[日本語](inspection-path-allowlist.ja.md)

**Contract version**: 2026-07-15

**Official-source revalidation**: 2026-07-15

**Normative for**: Rule classes, matcher notation, source-boundary interpretation, read
authorization, and cross-vendor conformance

This document defines the common grammar and invariants of the inspection rule registry.
It is intentionally not the vendor matrix. Exact vendor behavior, Inspector rules,
runtime composition, and evidence are defined once in the linked contracts below.

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

An **Inspector matcher** describes which entry tickets the Inspector may classify inside
one already-enabled source boundary. It is always relative to the exact boundary named in
the rule and never inherits a vendor locator's implicit base or traversal.

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
Repository inventory proceeds only within the retained launch-root capability. A vendor
may use a different runtime root or walk direction; that fact belongs to the vendor and
runtime-composition contracts and never changes this boundary.

### Global

Global inspection is disabled in every new session and requires consent bound to the
current contract version and exact no-I/O preview. One logical Global source may contain
separate consented vendor-home boundaries, but those boundaries are not Repository
children and are never merged into the Repository source.

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
| **Relative selector** | A boundary-relative, `/`-normalized selector; it never contains an absolute path, environment expansion, home expansion, URI, or implicit ancestor search |
| **Expansion** | One closed mode: `exact`, `direct-child`, `descendant-inventory`, or `recursive-subtree` |

The structured fields are authoritative. A compact selector printed in a table is only a
lossless rendering of those fields.

### Repository selector requirements

Every Inspector Repository selector starts with the literal `./`, which means the exact
Repository source root. A bare `**/` prefix is invalid and must fail registry validation.

| Form | Required expansion | Meaning |
|---|---|---|
| `./path/file` | `exact` | One exact file relative to the Repository source root |
| `./path/*` | `direct-child` | Matching direct children of one root-relative directory; `*` never crosses `/` |
| `./**/name` | `descendant-inventory` | Explicit Inspector inventory at the root and below it; `**` is a complete segment representing zero or more directory segments |
| `./path/**/*.ext` | `recursive-subtree` | Explicit recursive Inspector inventory below one root-relative subtree, including its root level |

`./**/` describes only the Inspector's downward descendant inventory. It does not mean
that a vendor walks downward, walks upward, searches ancestors, recognizes every nested
repository, or applies the matched file in a particular runtime context. Those claims
require separate vendor behavior and strategy records.

`*` matches exactly one non-empty segment. `**` is valid only as a complete segment in a
form whose expansion explicitly permits recursion. Direct-child and exact selectors never
imply recursive subdirectories. Repository rule tables must state Base, Relative selector,
and Expansion separately rather than relying on the compact text alone.

### Global selector requirements

A Global rule names one exact consented vendor boundary as Base and gives a selector
relative to that boundary. Environment/default-home resolution belongs to boundary
creation, not to the selector. Global selectors do not reuse the Repository `./` prefix,
do not authorize another vendor boundary, and cannot expand the paths permitted by
FR-015 through FR-018.

### Matching and native entry identity

Paths are normalized to `/` for classification only. Canonical or normalized strings are
diagnostic data, never read authority. The native backend enumerates from a retained root
capability and supplies internal entry tickets; a classifier may select only an exact
previously enumerated ticket.

Before a derived selector reaches ticket lookup, each NFC-normalized segment rejects NUL,
control characters, Windows-special characters, trailing dot/space, device basenames,
alternate-data-stream spelling, and case-, normalization-, short-name-, or other aliases.
Every remaining segment must exactly match an enumerated entry. `.git/`, `.hg/`, and
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
an exact enumerated regular-file ticket, remain within all file/source/generation limits,
and pass the native pre-read and post-read identity checks.

Bounded derivation is exactly one typed edge from an independently admitted static seed.
A derived candidate cannot seed another derivation. Relationship-only and excluded rules,
vendor locators, runtime strategies, imports, component references, remote sources, and
MCP-server-provided instructions never authorize a read.

A match proves only that an authored artifact is inside Inspector inventory scope. It does
not prove that a vendor installs, enables, trusts, selects, loads, merges, or follows it.
Surface, project/root context, runtime working directory, target path, trust, approval,
enablement, selection, agent context, tool availability, installation, managed policy,
instruction budget, and external state remain independent condition facts. Missing or
excluded inputs never default to satisfied, and the UI must not call a candidate
semantically effective.

## Symlink, alias, and resource invariants

- Symbolic-link files and directories are never followed. Junctions, mount-point changes,
  reparse points, hard-to-canonicalize aliases, and boundary crossings fail closed.
- The retained root capability and exact entry ticket are the sole filesystem authority;
  a canonical path string, relationship target, or source text can never reopen a path.
- Identity or metadata change between enumeration, open, read, and verification discards
  all bytes and yields a bounded, secret-safe diagnostic.
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
4. Every static and bounded-derived rule has positive, root/nested, boundary, symlink,
   alias, resource-limit, and applicable multi-tool fixtures. Derived fixtures additionally
   prove one-edge depth, fan-out limits, containment, deterministic retention, and no read
   for the first rejected target.
5. Relationship-only and excluded fixtures prove zero read authority even when a target
   exists or matches a generic filename. User behavior recorded outside FR-015 through
   FR-018 never becomes a Global candidate.
6. A multiply admitted physical file is read once and retains each independent provenance;
   matcher, evidence, documentation, scope/order, and applicability are not collapsed.
7. Native boundary fixtures prove no symlink/reparse/mount traversal, no path-reopen or
   Node-filesystem fallback, exact ticket identity under races, and bounded safe failure on
   every advertised target.
8. Official-source fixtures validate official HTTPS hosts, bounded anchors, review dates,
   semantic fingerprints, affected-contract backlinks, and human-only updates. A drift
   result never changes a behavior, rule, or strategy automatically.
9. The registry fails closed on an unknown expansion mode, malformed selector, duplicate
   identifier, orphan reference, mismatched contract version, or English/Japanese
   semantic difference.

Changing a matcher base, selector, expansion, read-authorizing class, or Global scope is a
contract semantic change. Maintainers must review identifier compatibility, update every
affected evidence backlink and fixture, update both language contracts together, and bump
the consent-bound contract version when the accepted Global boundary changes.
