# Repository Instructions

[日本語](AGENTS.ja.md)

Project development and review are governed by the
[Project Constitution](.specify/memory/constitution.md).

This file is where a working policy lives. When a decision settles how work is to be done —
not what a single change does — write it here in the same change, in both languages. A
policy agreed in conversation and left there is a policy the next session does not have.

## Documentation content policy

- Write the final state. A specification, contract, or comment describes what is true now,
  not how it came to be true. Drop "previously", "was renamed", "amended <date>" and the
  old name itself: a reader needs the rule, and the change is already in version control.
- Keep the reason, drop the chronology. When a decision is hard to judge from its outcome
  alone, state why the alternative was rejected — in the present tense, as a property of
  the design rather than as an account of an edit.
- Three artifacts are change logs by nature and keep their dated entries: `tasks.md`; the
  `## Clarifications` section of `spec.md`, whose dated sessions record the questions a
  specification was asked and the answers that settled them; and the `checklists/`, whose
  items record how each check came to be satisfied. Nowhere else — not a
  requirement, not a contract clause, not a plan paragraph, not a code comment. Even in
  those three, never write the superseded name: record what the task now requires, or what
  the answer now is, not what it used to say.
- Removing a historical note is an edit like any other: check that the parenthetical did
  not also carry a normative cross-reference such as an `FR-` identifier.

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
- Values that already live in `package.json` (name, version, homepage, description) are
  read from it with a standard JSON import —
  `import packageJson from '../../package.json' with { type: 'json' }` — never duplicated
  as string literals. The bundler tree-shakes the JSON module down to the referenced
  fields, so the packaged CLI does not read `package.json` at runtime. Example:
  `src/server/host/devframe-app.ts` sources its devframe metadata this way; only the
  contract-fixed product `id` stays a literal.
- A list's row unit belongs to the thing being listed, not to the container it was found
  in. When two members of a domain are counted differently — one row per file, one row per
  declaration inside a file, one row per name shared by several files — they do not share a
  row type. Widening one shape with optional fields until it fits all of them produces a
  type whose invariants hold for no member. Example: the inventory publishes a file's own
  facts once and a separate inventory per kind, because a skill row is one declared name
  while an MCP row is one declaration inside a carrier.
- Publish one fact, never a fact and something derived from it. Two states can disagree;
  one cannot. A derived value is computed where it is displayed, and a bound that a walk
  needs is expressed as a bound rather than trusted to hold. Example: a skill's companion
  census publishes the sorted file list and the row renders `length`; the number of files is
  never a field of its own.
- A gate that only detects two states disagreeing is a third place holding the same rule.
  When a check has to encode how one value follows from another, that mapping is the
  derivation: write it once as the derivation and delete the hand-maintained value, rather
  than keeping the value and spending the mapping on a test. Relocating a rule into a test
  is not simplification. Example: a product's same-name skill statement is derived from the
  `operations` of the strategies its skill rule names, so no per-product table exists to
  drift from them and no agreement gate is needed. Deriving is only honest when the
  derivation invents nothing: a shape that establishes no outcome yields no statement,
  which is a decision for evidence review rather than for arithmetic over an enum.
- Reach for the platform's own vocabulary before writing an equivalent by hand. When a
  platform construct looks applicable but does not fit, the comment says why, so the next
  reader does not re-propose it. Example: the client-data purge records why it is not a
  `DisposableStack` — that construct disposes once, in reverse order, with no unregister,
  while the purge runs repeatedly in registration order over owners that come and go.
- A `readonly` type is the whole immutability mechanism. Compiled or shipped data is not
  re-frozen at runtime: `Object.freeze` over data this codebase produces and consumes
  defends against nothing a user experiences, and a deep freeze walking that data is a
  traversal written to protect the program from itself. Example: `compileTraversalPlan`
  returns its plan as authored — `TraversalPlan` being immutable shipped data is a property
  of the type, not a runtime pass.
- Never materialize an iterable to reach behavior it already has. Array destructuring,
  `for...of`, and spreading into a call all consume the iterator protocol directly, so
  `[...set]` in front of one of them is a copy that buys nothing —
  `const [first, ...rest] = set` is what the language already does. Copy only to obtain
  something the source genuinely lacks: an array to keep while the source changes, or a
  mutable array for an algorithm that pushes.
- Use the non-mutating array methods when the mutating one is the reason for a copy.
  `array.toSorted(compare)` is the operation `[...array].sort(compare)` was spelling out;
  the same holds for `toReversed` and `with`.
- When a specification mandates redundant complexity, correct the specification — in both
  languages, in the same change — instead of implementing it as written.

## User-visible copy policy

- Copy a component alone renders is written where it renders. There is one UI
  language, so a message catalog keyed by identifier would be indirection
  between a key and its only string.
- Text that a closed union fixes is the exception: the label table belongs
  beside that union, not in the component, so a new member cannot compile
  without its label. `entities.ts` holds `CUSTOMIZATION_KIND_TEXT`,
  `SUPPORTED_TOOL_TEXT`, `FILE_ENCODING_TEXT`, `SOURCE_BOUNDARY_ORIGIN_TEXT`,
  and `SOURCE_STATUS_TEXT`; diagnostic text lives in `DIAGNOSTIC_REGISTRY`.
- The test is exhaustiveness, not reuse. A `Readonly<Record<ClosedUnion, string>>`
  belongs beside its union even when exactly one component reads it today,
  because the compiler is what keeps the table complete.

## Naming policy

- Prefer the longer name that is always understandable to the shorter one that needs
  surrounding context. A reader meeting an identifier for the first time — in an import
  line, a file tree, or a stack trace — should be able to say what it is.
- Name what a thing is, not what it resembles. Architectural metaphors (`shell`, `manager`,
  `helper`, `util`) describe a shape rather than contents and go stale as the contents
  change. Example: the module holding the browser's reactive session state is
  `src/app/session/view-state.ts` — it names the state it holds, where a name like `shell`
  would have named a page frame that actually lives in the component.
- A directory supplies context, so a name inside it need not repeat it —
  `session/api-client.ts`, not `session/session-api-client.ts`. It must still be meaningful
  when read together with that directory: `session/state.ts` is weaker than
  `session/view-state.ts`, because only the latter says whose state and what it is for.
- Renaming to satisfy this policy is a documentation change too: update both language
  versions of every specification artifact that names the old identifier in the same change.

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
- An exported member that exists only so a test can reach it is still public API. Its doc
  comment states that it is test-only and why the behavior is not observable through the
  module's own surface. Prefer removing the need: assert what the module renders, returns,
  or requests rather than what it stores. Example: a client-data epoch counter needs no
  accessor, because the behavior it guards — a response captured before a purge never
  repopulates state — is observable from that discarded response.
- Test files begin with a comment naming the owning task ID and the behavior under test, so
  coverage can be traced back to `tasks.md`.
- Write code comments in English. Do not duplicate them in Japanese; the bilingual
  documentation policy above applies to documents, not to source code comments.
- A defensive branch — a guard, a catch, a fail-closed early return — names the caller that
  reaches it. Not why it would be bad if the case happened: which caller produces it. A
  branch whose comment cannot name one is deleted instead of written.
- Delete or correct a comment in the same change that makes it stale. A misleading comment
  is worse than none.

## Official-source verification policy

Registry records cite official vendor documentation through `EvidenceCitation`, whose
`sections` field holds exact rendered heading texts. Verifying those citations is
documentation work with its own failure modes:

- Read the page's raw bytes. Fetch it with `curl` and extract headings with a regex over
  `<h1>`–`<h4>`, or over `^#{1,4} ` when the cited URL is a `.md` variant. A summarizer's
  inventory of a page's headings is not evidence: one reports real content headings as
  absent often enough to turn a correct citation into a wrong "fix".
- Distinguish content headings from site navigation. These documentation sites render
  navigation with the same heading tags; a content heading carries an `id` slug matching
  its own text.
- A heading missing from the served HTML is not automatically drift. A client-rendered page
  ships only its table of contents, so the heading exists but no `<h*>` element does; the
  anchor slug in the table of contents is the evidence. `code.claude.com/docs/en/changelog`
  behaves this way for its per-version headings.
- Name a page by its full URL or its rendered title, never by a bare path segment. Writing
  "the memory page" for `https://code.claude.com/docs/en/memory` reads as a claim about the
  assistant's own memory rather than about a page that was actually fetched.
- Advance `reviewedOn` only after comparing the cited sections against the record. Record
  what the page establishes in the maintained paraphrase; a claim the page does not make is
  `partially-documented`, not `documented`.
- A moved page is a citation change, not a rewrite of the record. When the cited headings
  vanish, look for the content on another official URL before weakening the record; these
  vendors relocate pages across hosts and leave the text intact.

## Pull request writing style

- Write pull request titles and descriptions in concise, natural language for human reviewers.
- Write the entire pull request description in English. Do not include a Japanese translation or duplicate the description in multiple languages.
- Do not use `Summary` as a generic heading in a pull request description.
- For a short pull request, avoid stacking template-like sections such as `Scope`, `Key decisions`, and `Verification`. Prefer a few direct paragraphs, and use headings or lists only when the content genuinely needs them.
- Focus on what the pull request proposes and why it matters. Do not narrate implementation history, restoration steps, or the commit sequence unless that context is necessary for review.
- Remove boilerplate, redundant framing, and self-referential process notes before publishing or updating a pull request.
