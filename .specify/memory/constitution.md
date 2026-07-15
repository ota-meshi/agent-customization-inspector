<!--
Sync Impact Report
- Version change: unratified template → 1.0.0
- Added principles:
  - I. Quality Above Expediency (NON-NEGOTIABLE)
  - II. Readable, Maintainable, Intention-Revealing Code
  - III. Verification Before Completion
  - IV. Documentation Is Part of the Product
  - V. Welcoming Participation
- Added sections: Quality and Safety Standards; Development Workflow
- Added language companion: .specify/memory/constitution.ja.md
- Removed sections: none; template placeholders were replaced
- Templates and guidance updated:
  - ✅ .specify/templates/plan-template.md
  - ✅ .specify/templates/spec-template.md
  - ✅ .specify/templates/tasks-template.md
  - ✅ .agents/skills/speckit-tasks/SKILL.md
  - ✅ .claude/skills/speckit-tasks/SKILL.md
  - ✅ .github/agents/speckit.tasks.agent.md
  - ✅ AGENTS.md and AGENTS.ja.md
- Follow-up TODOs: none
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

### II. Readable, Maintainable, Intention-Revealing Code

Code MUST use clear names, cohesive modules, explicit control flow, and small units with
well-defined responsibilities. Non-obvious decisions, invariants, security assumptions,
trade-offs, and compatibility constraints MUST be documented close to the affected code,
with comments explaining why the design exists rather than restating syntax. Stale,
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

- Formatting, linting, type checking where applicable, automated tests, and documentation
  validation MUST run as required quality gates in local verification and CI.
- Inputs and inspected artifacts MUST be treated as untrusted. Implementations MUST use
  least privilege, bounded resource use, safe failure behavior, and secret-safe logging
  and display. Security and privacy implications MUST be reviewed whenever trust
  boundaries, permissions, persistence, networking, or sensitive data change.
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

**Version**: 1.0.0 | **Ratified**: 2026-07-15 | **Last Amended**: 2026-07-15
