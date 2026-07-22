# Repository Instructions

[日本語](AGENTS.ja.md)

Project development and review are governed by the
[Project Constitution](.specify/memory/constitution.md).

## Documentation language policy

- Create and maintain both English and Japanese versions of every human-authored repository document.
- Add or update both language versions in the same change. A documentation task is not complete while either version is missing or outdated.
- Use the canonical `*.md` filename for English and the matching `*.ja.md` filename for Japanese. For names required by tools or community conventions, keep the required filename (for example, `AGENTS.md`) and add the Japanese companion beside it (for example, `AGENTS.ja.md`).
- A tool-specific filename that is only a symbolic link to a canonical English document does not require its own `*.ja.md` symbolic link when the canonical document already has a Japanese companion. The canonical English/Japanese pair remains the source of truth.
- Keep both versions semantically equivalent. They do not need to be word-for-word translations, but requirements, warnings, examples, links, and status information must agree.
- Preserve code, commands, paths, package names, API names, identifiers, and URLs unless localization is necessary for the example itself.
- When practical, link each language version to its counterpart near the top of the document.
- Before completing a documentation change, compare both versions for omissions, stale statements, and inconsistent technical details.
- This policy applies to new documents and to existing documents whenever they are modified. Generated files and vendored third-party documentation are excluded.

## Implementation simplicity policy

Simple implementation takes priority. This applies Constitution Principle I (Quality
Above Expediency) to day-to-day coding decisions:

- Choose the simplest implementation that fully satisfies the known requirements.
  Simplicity outranks speculative robustness: add a mechanism only for a demonstrated
  requirement, never "just in case".
- Do not re-implement policy that another layer already owns and enforces — the package
  manager, the runtime or platform, or a test or release gate. Duplicated policy drifts
  instead of defending. Example: Node.js compatibility is declared once through
  `engines.node` and enforced by the package manager; the CLI performs no runtime
  re-check.
- Every defensive check must have a failure mode that actually protects a user. Artifacts
  that ship together must not re-verify each other at user runtime; exact-value assertions
  about packaged artifacts belong in package tests and release gates. Example:
  `package.json.bin` points directly at the packaged `dist/cli.mjs` — a separate bootstrap
  wrapper that re-verified sibling files before importing the CLI was removed.
- Avoid unnecessary indirection and verbose equivalents of a simpler construct. Example:
  a fixed relative dynamic import is `import('./module.mjs')`, not
  `import(new URL('./module.mjs', import.meta.url).href)`.
- Simplification means reducing total complexity, not relocating it. Removing a
  declarative definition by encoding the same information into a longer command line or
  another file is not a simplification; keep declarative configuration in its owning
  config file. Example: the vitest `coverage` project stays defined in
  `vitest.config.ts` instead of becoming a chain of `--project` flags in the
  `test:coverage` script.
- When a specification mandates redundant complexity, correct the specification — in both
  languages, in the same change — instead of implementing it as written.

## Code commenting policy

- Follow Constitution Principle II: document non-obvious decisions, invariants, security
  assumptions, trade-offs, and compatibility constraints close to the affected code. A
  reviewer must be able to understand the change and its rationale without
  reverse-engineering the author's intent.
- Every production module starts with a header comment stating the module's role and the
  contract it implements. Security-sensitive modules also state their threat-model
  boundaries and residual limitations.
- Comments explain why the code exists, not what the syntax does. When a behavior is
  mandated by the specification, name the governing artifact in the comment (for example
  `FR-030`, `data-model.md § Diagnostic`, or `research.md § 5`) so reviewers can check the
  code against its contract.
- Every closed union, enum-like type, and fixed catalog documents each member in a JSDoc
  doc comment (`/** ... */`) on the declaration, so editors surface it on hover: what the
  value means, when it is produced, and the governing artifact when one exists (for
  example `spec.md § Closed Scan Publication Outcomes`). A bare list of string literals
  is not self-documenting.
- Every field of an exported interface carries a JSDoc doc comment stating what the field
  means, when it is set, and the governing artifact when one exists. One line is enough.
  A mirror DTO may state once that its fields match the source interface instead of
  duplicating every line.
- The declaration itself is documented too: every exported interface, type alias, and
  constant carries a JSDoc doc comment stating what the type or value represents and,
  when one exists, the governing artifact.
- Every class member — fields and methods, including the constructor and private
  members — carries a JSDoc doc comment: a method states what the call does and which
  contract behavior it implements; a field states what it holds and which invariant it
  maintains.
- Every exported function, class, and constant that implements a specified contract carries
  a doc comment naming that contract behavior. Rejection and fail-closed branches state
  what the rejection protects.
- Test files begin with a comment naming the owning task ID and the behavior under test, so
  coverage can be traced back to `tasks.md`.
- Write code comments in English. Do not duplicate them in Japanese; the bilingual
  documentation policy above applies to documents, not to source code comments.
- Delete or correct a comment in the same change that makes it stale. A misleading comment
  is worse than none.

## Pull request writing style

- Write pull request titles and descriptions in concise, natural language for human reviewers.
- Write the entire pull request description in English. Do not include a Japanese translation or duplicate the description in multiple languages.
- Do not use `Summary` as a generic heading in a pull request description.
- For a short pull request, avoid stacking template-like sections such as `Scope`, `Key decisions`, and `Verification`. Prefer a few direct paragraphs, and use headings or lists only when the content genuinely needs them.
- Focus on what the pull request proposes and why it matters. Do not narrate implementation history, restoration steps, or the commit sequence unless that context is necessary for review.
- Remove boilerplate, redundant framing, and self-referential process notes before publishing or updating a pull request.
