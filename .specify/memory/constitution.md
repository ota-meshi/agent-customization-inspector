<!--
Sync Impact Report
- Version change: 4.3.0 → 4.4.0
- Modified principles: Readable, Maintainable, Intention-Revealing Code — the class
  obligation is generalized to every class member: fields and methods, including the
  constructor and private members, carry JSDoc doc comments (a method states what the
  call does; a field states what it holds and which invariant it maintains).
- Previous report (4.2.0 → 4.3.0):
- Modified principles: Readable, Maintainable, Intention-Revealing Code — the
  documentation obligation now also covers public class members: every public method,
  including the constructor, carries a JSDoc doc comment stating what the call does and
  which contract behavior it implements.
- Previous report (4.1.0 → 4.2.0):
- Modified principles: Readable, Maintainable, Intention-Revealing Code — the
  type-documentation obligation now also covers the declarations themselves: every
  exported type, interface, and constant carries a JSDoc doc comment stating what it
  represents, in addition to the per-member documentation added in 4.1.0.
- Previous report (4.0.0 → 4.1.0):
- Modified principles: Readable, Maintainable, Intention-Revealing Code — expanded the
  documentation obligation to type members: every closed-union member and every exported
  interface field carries a JSDoc doc comment stating its meaning and, where one exists,
  its governing contract. Concrete form and examples live in AGENTS.md's Code commenting
  policy.
- Previous report (3.0.0 → 4.0.0):
- Version change: 3.0.0 → 4.0.0
- Modified principles: Quality and Safety Standards — the operational-log/telemetry
  content bullet is removed and the generic-error doctrine is dropped, following the
  owner's 2026-07-22 decision to remove FR-040/FR-041: the product has no telemetry
  (outbound traffic is forbidden), terminal and UI output are read by the same user who
  owns the inspected files, and the unauthenticated session API already serves complete
  file content, so hiding error causes protected nothing while making failures
  undebuggable. Errors are reported ordinarily; the closed OperationError entity is
  deleted. (3.0.0 had narrowed session protection to the loopback binding.)
- Templates and guidance updated (4.0.0):
  - ✅ spec.md/spec.ja.md — FR-040/FR-041 and the Operation Error entity removed;
    failure semantics remain owned by FR-028/FR-030 and the scan-publication table
  - ⚠ research/plan/data-model/contracts/tasks pairs — ordinary-error alignment in
    progress
- Previous report (2.0.0 → 3.0.0):
- Modified principles: Quality and Safety Standards — the session-protection obligation
  is narrowed from "the loopback session MUST be protected from other origins"
  (per-session token, Origin checks) to loopback binding only, following the owner's
  2026-07-22 decision to adopt the devframe local-tool framework with authentication
  disabled (config-inspector parity). Served content may include the user's own
  secrets, so the host binds 127.0.0.1 only and is never exposed beyond the initiating
  machine; the residual local-process and DNS-rebinding exposure of an unauthenticated
  loopback host is a documented limitation. "Capability-authenticated" API access and
  "authenticated" diagnostics language is removed accordingly. (2.0.0 had replaced the
  adversarial-file model with the trusted-workspace framing.)
- Added sections: none
- Removed sections: none
- Templates and guidance updated:
  - ✅ spec.md/spec.ja.md — FR-022/FR-027/QR-002/QR-003/SC-004/SC-007 transport and
    authentication language aligned to the loopback-only devframe host
  - ⚠ research/plan/data-model/contracts/tasks pairs — REST/token transport sections
    superseded; devframe alignment in progress
- Follow-up TODOs: complete the devframe transport alignment across the spec suite
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

- Linting, type checking where applicable, automated tests, and documentation
  validation MUST run as required quality gates in local verification and CI. Byte-level
  formatting is owned declaratively by repository configuration (`.gitattributes`,
  `.editorconfig`) rather than by a checking gate.
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
  session-scoped. User-facing display MUST be preceded by clear sensitive-content
  acknowledgement and MUST render the content inert. The content MUST NOT be persisted or
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

**Version**: 4.4.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-22
