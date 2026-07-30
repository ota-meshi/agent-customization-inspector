<!--
Sync Impact Report
- Version change: 4.4.0 → 5.0.0
- Modified principles: Quality and Safety Standards — two changes land together.
  Intentional display of complete authored content in the loopback-local inspection UI
  is direct: no acknowledgement step or standing sensitive-content notice may precede
  or accompany it, because those controls protect no additional boundary while adding
  interaction cost and visual noise; inert rendering, session-only lifetime, no
  persistence or remote egress, and the prohibition on incidental exposure remain
  mandatory. Code formatting is owned by Prettier and checked as a required gate
  (`format:check` locally and in CI); byte-level hygiene (`.gitattributes`,
  `.editorconfig`) remains declarative, and hand-fixing formatting was error-prone
  busywork a rewriting formatter solves at the root.
- Templates and guidance updated:
  - ✅ plan/spec/tasks templates — constitution checks and generated requirements
    require direct, notice-free presentation with the retained handling safeguards
  - ✅ active feature documents in both languages — spec Clarifications and QR-004,
    the accessibility acceptance matrix, affected tasks, plan § Formatting/Linting,
    research § 3, T003, quickstart gates, AGENTS.md/AGENTS.ja.md Formatting policy,
    and the CI `format` job
-->
# Agent Customization Inspector Constitution

[日本語](constitution.ja.md)

## Core Principles

### I. Quality Above Expediency (NON-NEGOTIABLE)

Every change MUST address the underlying requirement or root cause through a coherent,
maintainable design. Ad hoc patches, unexplained exceptions, duplicated workarounds,
silenced failures, and speculative abstractions are prohibited. The chosen solution MUST
be the simplest one that fully satisfies the known requirements without compromising
correctness, security, readability, or future maintenance. AI-generated contributions are
held to exactly the same standard as human contributions and MUST be reviewed in their
full repository context. Quality is the primary delivery constraint, not a negotiable
follow-up activity.

Simplicity is the binding tiebreaker: when a proposed mechanism does not change what the
known requirements deliver, the simpler implementation MUST be chosen. A defensive check
MUST have a failure mode that actually protects a user. Policy that another layer already
owns and enforces — the package manager, the runtime or platform, or a test or release
gate — MUST NOT be re-implemented at product runtime; duplicated policy drifts instead of
defending. Exact-value assertions about packaged artifacts belong in package tests and
release gates, and artifacts that ship together MUST NOT re-verify each other at user
runtime. Verbose equivalents of a simpler construct MUST be simplified. When a
specification mandates such redundancy, the specification MUST be corrected in both
languages rather than implemented as written.

### II. Readable, Maintainable, Intention-Revealing Code

Code MUST use clear names, cohesive modules, explicit control flow, and small units with
well-defined responsibilities. Non-obvious decisions, invariants, security assumptions,
trade-offs, and compatibility constraints MUST be documented close to the affected code,
with comments explaining why the design exists rather than restating syntax. Exported
declarations are documented where they are declared: every exported type, interface, and
constant MUST carry a JSDoc doc comment stating what it represents; every
closed-union member and exported interface field MUST carry one stating its meaning and,
where one exists, its governing contract; and every class member — fields and
methods, including the constructor and private members — MUST carry one stating what it
holds or does. Stale,
redundant, or misleading comments MUST be corrected or removed in the same change.
Complexity and new abstractions MUST be justified by a concrete current need. Reviewers
MUST be able to understand the change and its rationale without reverse-engineering the
author's intent.

### III. Verification Before Completion

Every behavioral change MUST include automated tests at the appropriate levels. Tests
MUST cover the primary behavior plus relevant error, boundary, regression, integration,
and security-sensitive cases. Bug fixes MUST reproduce the defect with a failing test
before the fix when technically feasible. Tests MUST be deterministic, readable, and
maintained to the same quality standard as production code. A passing suite and coverage
metrics are evidence, not proof: reviewers MUST still examine untested branches,
interactions, and failure modes. A change with failing required checks or unexplained test
gaps is incomplete and MUST NOT be merged or released.

### IV. Documentation Is Part of the Product

User behavior, contributor workflows, public interfaces, setup steps, architecture
decisions, security constraints, and operational procedures MUST be documented at the
level needed to use and maintain them safely. Documentation MUST change alongside the
code it describes, and commands and examples MUST be verified. Every human-authored
repository document MUST have semantically equivalent English and Japanese versions in
the canonical `*.md` and matching `*.ja.md` files, except generated or vendored material.
Missing, stale, or inconsistent documentation blocks completion.

### V. Welcoming Participation

The project MUST minimize unnecessary barriers for contributors and users. Setup,
development, testing, and contribution expectations MUST be discoverable, reproducible,
and written in clear, respectful, inclusive language. Errors and review feedback MUST be
actionable and identify a path to resolution. Interfaces and contributor workflows MUST
consider accessibility and different levels of project familiarity. Changes that make
participation materially harder MUST document the necessity and provide a practical
migration or support path.

## Quality and Safety Standards

- Formatting, linting, type checking where applicable, automated tests, and
  documentation validation MUST run as required quality gates in local verification and
  CI. Code formatting is owned by the repository formatter (Prettier): `format` rewrites
  and `format:check` gates, so formatting is never fixed by hand. Byte-level hygiene
  remains owned declaratively by repository configuration (`.gitattributes`,
  `.editorconfig`).
- The product runs in a workspace the user already trusts: it exists to show what AI
  agents will read, and inspected customization files are not modeled as an adversary.
  Three obligations remain regardless of that trust: inspected content MUST NOT be
  executed (parsing suffices for display), the session host MUST bind to loopback only
  and MUST NOT be exposed beyond the initiating machine because served content may
  include the user's own secrets, and displayed content MUST be rendered inert in the
  browser. The session host runs unauthenticated behind that loopback binding;
  documentation MUST state the residual limitation that other local processes and, via
  DNS rebinding, a malicious web page can reach the session while the inspector runs.
  Failures are reported as ordinary errors: the product defines no log-content rules and
  no sanitized error envelope, because it has no telemetry and its output is read by the
  same user who owns the inspected files. Implementations MUST use
  least privilege and safe failure behavior. File size, file or item count, parser shape,
  request or response size, work-queue capacity, time, concurrency, and similar resource
  ceilings MUST NOT be defined as product-specific numeric validation limits. Capacity is
  determined by the Node.js runtime, parser, operating system, filesystem, browser, and
  deployment environment. A recoverable environment or resource failure MUST abort the
  affected publication attempt and MUST publish no item, Source, recognition or derived
  result, result record or response, or generation from that attempt; only previously
  committed state may remain available. A lifecycle or operational failure MAY be reported
  outside that result, but MUST NOT classify the inspected artifact as valid or invalid.
  This rule does not prohibit functional
  cardinalities inherent to a feature. Security and privacy implications MUST be reviewed whenever trust boundaries,
  permissions, persistence, networking, or sensitive data change.
- Complete authored content, including credentials and other secrets, MAY be intentionally
  returned by a session API or displayed only when a product specification explicitly
  requires inspection of that content. API access MUST be loopback-local and
  session-scoped. User-facing display MUST render the content inert. It MUST NOT be preceded by
  an acknowledgement step or accompanied by a notice about what the content may
  contain: over a loopback-local session showing a viewer their own files,
  neither guards anything. The content MUST NOT be persisted or
  sent to a remote service. This narrow
  allowance for intentional inspection does not permit incidental exposure
  through any other surface.
- Dependencies, public contracts, and data formats MUST be explicit and kept as small as
  practical. New dependencies and breaking changes require documented rationale and
  migration impact.
- Coverage targets MAY guide risk discovery but MUST NOT replace scenario-based test
  design or code review. Any justified verification limitation MUST be recorded with its
  residual risk and a concrete resolution path before approval.
- Source, tests, comments, and documentation MUST remain internally consistent. Dead
  code, stale compatibility paths, and unrelated cleanup MUST not be hidden inside a
  feature change.

## Development Workflow

1. Define user-visible behavior, acceptance scenarios, quality requirements, security
   boundaries, and documentation impact before implementation.
2. For non-trivial work, document the simplest coherent design, rejected alternatives,
   and any unavoidable complexity in the implementation plan.
3. Add or update tests before or alongside implementation. Confirm that new tests fail
   for the intended reason before relying on them when technically feasible.
4. Implement in small, reviewable units that preserve repository conventions and avoid
   unrelated changes.
5. Review the complete diff for correctness, simplicity, maintainability, readability,
   security, edge cases, comment accuracy, and English/Japanese documentation parity.
6. Run every applicable quality gate and record the commands and outcomes. No failed
   required check may be ignored, disabled, or reclassified without resolving its cause.
7. Obtain review that explicitly verifies this constitution. Complexity tracking explains
   necessary design cost; it is not a waiver from any principle.

AI agents MUST inspect the relevant existing code, tests, documentation, and repository
instructions before editing; challenge their assumptions; solve the root cause; and
validate the entire result in context. An AI agent MUST NOT declare completion based only
on generated output, a narrow happy-path test, or a checklist with unresolved risks.

## Governance

This constitution governs all project specifications, plans, tasks, implementation, and
review practices. When another repository document conflicts with it, this constitution
takes precedence and the conflicting document MUST be corrected.

Amendments MUST be proposed through a reviewed change that updates both language
versions, explains the rationale and impact, and propagates affected templates and
guidance. Versioning follows semantic versioning: MAJOR for incompatible governance or
principle changes, MINOR for new principles or materially expanded obligations, and PATCH
for non-semantic clarifications. The ratification date remains the original adoption date;
the last-amended date changes whenever normative text changes.

Every plan, pull request, and release review MUST include an explicit constitution check.
Known violations MUST be resolved before approval; urgency, generated code, and passing
automation do not waive compliance. Reviewers are responsible for examining the complete
change and recording any residual uncertainty that requires further investigation.

**Version**: 5.0.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-29
