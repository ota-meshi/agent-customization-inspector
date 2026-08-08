# Repository Instructions

[日本語](AGENTS.ja.md)

Project development and review are governed by the
[Project Constitution](.specify/memory/constitution.md).

This file is where a working policy lives. When a decision settles how work is to be done —
not what a single change does — write it here in the same change, in both languages. A
policy agreed in conversation and left there is a policy the next session does not have.

## Evidence before conclusions

- No model generation, capability tier, or reasoning setting is evidence that a conclusion is
  reliable. Even a top-tier GPT-family model at its maximum reasoning setting can reach a
  plausible conclusion too early. Treat premature judgment as a standing risk and counter it
  through verification; never assume confidence in the model removes it.
- Before reporting a defect, trace the candidate finding through all of the following: the
  behavior reproduced from the current code; the governing specification and contracts; the
  completed, current, and future task that owns it; any explicit deferral or accepted limitation;
  and the production caller and user-visible surface that can actually exhibit it. “Not present
  now” is not the same as “required now and missing.”
- Try to disprove a candidate finding before accepting it. State the strongest repository-backed
  explanation under which the current code would be correct, search the codebase and artifacts
  for that explanation, and resolve conflicting evidence. If the evidence remains incomplete,
  report the uncertainty instead of presenting the inference as fact.
- A review does not stop at the changed line or at a passing test. Read the surrounding data flow,
  comments, tests, English/Japanese documents, task ownership, and later planned work. Conversely,
  do not demand a test or mechanism merely because it is absent: first establish that the current
  scope requires it and that another layer or future task does not own it.
- When a user corrects a factual mistake, audit the reasoning pattern that produced it and recheck
  the other findings that used the same shortcut before continuing. Correcting only the reported
  instance leaves the same failure ready to recur.

## Documentation content policy

- Write the final state. A specification, contract, or comment describes what is true now,
  not how it came to be true. Drop "previously", "was renamed", "amended <date>" and the
  old name itself: a reader needs the rule, and the change is already in version control.
- Keep the reason, drop the chronology. When a decision is hard to judge from its outcome
  alone, state why the alternative was rejected — in the present tense, as a property of
  the design rather than as an account of an edit.
- Four artifacts are change logs by nature and keep their dated entries: `tasks.md`; the
  `## Clarifications` section of `spec.md`, whose dated sessions record the questions a
  specification was asked and the answers that settled them; the `checklists/`, whose
  items record how each check came to be satisfied; and the constitution's Sync Impact
  Report comment, which the constitution workflow prescribes and which holds only the
  latest amendment's report, never a stack of previous ones. Nowhere else — not a
  requirement, not a contract clause, not a plan paragraph, not a code comment. Even in
  those four, never write the superseded name or requirement: the body records what the
  task now requires, or what the answer now is, and a dated amendment note records only
  that — and briefly why — it changed, not what it used to say.
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

## Vendored agent customizations

`.agents/skills/` and `.claude/skills/` hold third-party skills this repository did not
author. They are what the inspector inspects, so they are kept byte-identical to the upstream
they were taken from and are never edited here: a local correction would make the fixture
something no user of that skill has, and would drift from the copy it claims to be.

- Their defects are upstream's and stay in place. Example: `plugin-creator`'s
  `agents/openai.yaml` names `./assets/plugin-creator-small.svg` and
  `./assets/plugin-creator.png`, and the skill ships no `assets/` directory. A skill whose
  own manifest points at something it does not carry is a real thing this product exists to
  show, not a thing to fix here.
- Their whitespace is upstream's too, so `git diff --check` reports on them — currently two
  lines under `.claude/skills/skill-creator/scripts/`. No gate in this repository runs that
  check, and nothing fails because of it.
- Updating one means taking a newer upstream copy whole, never patching what is here.

## Implementation simplicity policy

Simple implementation takes priority. This applies Constitution Principle I (Quality
Above Expediency) to day-to-day coding decisions:

- Choose the simplest implementation that fully satisfies the known requirements.
  Simplicity outranks speculative robustness: add a mechanism only for a demonstrated
  requirement, never "just in case".
- A clause in this repository's own specification is a decision, not evidence of need.
  Before implementing one, name the surface that would be wrong without it; if that surface
  does not exist yet, the mechanism arrives with it. Example: exact authored slices,
  specified for a comparison surface no phase has built, needed a module that re-parsed
  what the frontmatter package had already parsed into the value the detail surface shows.
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
  traversal written to protect the program from itself. Example: the `TraversalPlan`
  constructor returns its plan as authored — its being immutable shipped data is a
  property of the type, not a runtime pass.
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

## Formatting policy

- Code formatting is Prettier's, never fixed by hand: `pnpm run format` rewrites and
  `pnpm run format:check` gates. `prettier.config.js` sets only what the codebase had
  already settled (width 100, single quotes); everything else is Prettier's default so
  there is less to drift.
- ESLint keeps only non-formatting rules. `@stylistic/quotes` stays because it forbids
  no-substitution template literals — a decision about what a string is, which Prettier
  does not make — and `vue/html-self-closing` is configured to agree with Prettier's
  output rather than disabled.
- `.prettierignore` excludes what must not be reformatted: vendored skills stay
  byte-identical to upstream, spec-kit scaffolding is taken from upstream whole,
  Markdown is bilingual authored prose whose vendor-contract tables are frozen by
  recorded SHA-256 digests, and files other tools own and rewrite (lockfiles,
  `.claude/settings.local.json`) belong to those tools. Vendored skills are ignored
  each by name, never as a whole `.agents/` or `.claude/` directory: those directories
  also receive skills authored in this repository, which are formatted like any other
  source. Taking a new vendored skill includes adding its `.prettierignore` line in
  the same change.

## Class and interface policy

- A type whose values production code constructs in exactly one place is a class,
  not an interface satisfied by an object literal: the constructor is then the one
  place that says how the value's data came to be, so reading the class is reading
  the propagation. Example: `CompiledInspectionRule` compiles a shipped record —
  guards, plan, narrowed `kind` — in its constructor; `InventoryFilterView` derives
  every inventory view in its constructor; `InspectionSession`, `SessionViewState`,
  `SessionApiClient`, and `ClientDataPurge` replaced factory closures whose state
  had no declared home.
- A value that only transcribes another object's fields instead holds the source
  object and derives each value where it is read — a getter naming its origin, or a
  constructor assignment made where a guard has already narrowed the source's own
  field. Example: `CompanionSourceFile` holds the census entry and the candidate's
  directory and derives both of its published addresses from them.
- What every vendor shares lives in an abstract base; what is one vendor's — its
  `tool` literal, its relations catalog — lives in that vendor's subclass. Example:
  `CodexCompiledRule` extends `CompiledInspectionRule`.
- Constructor parameter properties are banned, and ESLint enforces it
  (`@typescript-eslint/parameter-properties`): a parameter property hides a
  declaration inside a signature, so the class body no longer lists what the class
  holds and there is no place for the field's own doc comment. Every field is
  declared in the body, with its JSDoc, and assigned in the constructor.
- A getter never casts with `as`. When a narrowed type needs proving, the
  constructor proves it — a guard that throws, then an assignment made where the
  control flow has narrowed the source — and the field holds the narrow type.
- Private state is `#`-private, not TypeScript `private`: `private` is erased at
  runtime, so its fields would still appear in `Object.keys` and widen the runtime
  surface past the declared API.
- Interfaces remain for genuine contracts with more than one producer: wire DTOs
  (strict JSON carries no prototypes, so a serialized shape must stay a plain
  object), authored registry records, options bags several callers assemble, and
  boundaries that tests satisfy with literal doubles (`CandidateRecognition`,
  `SessionRpcChannel`). Vue component props stay interfaces because the framework
  consumes them as shapes.

## Agent-run Playwright verification policy

- When Coding Agent runs Playwright tests for local verification, run only the `chromium` project
  (Chrome) unless the user explicitly requests additional browsers. Select it explicitly,
  for example with `--project=chromium`; do not invoke a command that runs every configured
  browser.
- This default governs CodingAgent-initiated local verification only. It does not change CI,
  release, or other project-owned suites whose configuration explicitly requires broader
  browser coverage.

## User-visible copy policy

- Copy a component alone renders is written where it renders. There is one UI
  language, so a message catalog keyed by identifier would be indirection
  between a key and its only string.
- Text that a closed union fixes is the exception: the label table belongs
  beside that union, not in the component, so a new member cannot compile
  without its label. `entities.ts` holds `CUSTOMIZATION_KIND_TEXT`,
  `SUPPORTED_TOOL_TEXT`, `FILE_ENCODING_TEXT`, `SOURCE_BOUNDARY_ORIGIN_TEXT`,
  `SOURCE_STATUS_TEXT`, and `SAME_NAME_SKILL_RESOLUTION_TEXT`; diagnostic text
  lives in `DIAGNOSTIC_REGISTRY`. A closed union no surface renders needs no table:
  `DocumentationStatus` and `LifecycleQualifier` are maintenance records on the
  registry, so nothing labels them.
- A `-types` module ships zero runtime code, and a table is runtime data, so
  the tables for the unions those modules declare live in a `*-text.ts`
  companion beside them: `api-text.ts` for `api-types.ts`. The compiler check
  the policy asks for works wherever the table lives.
- The test is exhaustiveness, not reuse. A `Readonly<Record<ClosedUnion, string>>`
  belongs beside its union even when exactly one component reads it today,
  because the compiler is what keeps the table complete.
- No surface renders a contract identifier. `codex.skill.name`, `codex.repo.skill`,
  `runtime-cwd`, and `partially-documented` are tokens a registry record is keyed
  by and a contract gate is checked against; to someone reading their own file
  they stand where an answer should be. Each is rendered through the table for
  its union, which is why an ID a DTO carries is typed as its closed union rather
  than as `string` — that is what keeps the table complete. Ordinary words that
  happen to be members stay as they are: `environment` is captioned "environment
  variable" and `MCP` is captioned "MCP".

## Stylesheet scope policy

Placement:

- A component's own styles are written in that component's `<style scoped>`, never in
  the global stylesheet. The rules and the markup they select then move, get read, and
  get deleted together, and a class name cannot outlive the only template that used it.
- `src/app/styles/main.css` holds only what is genuinely shared: design tokens, the
  element-level baseline, and utility classes several components apply. A rule that
  names a class exactly one component renders does not belong there, whatever the
  file's current contents suggest.
- A class name has exactly one owner. The global sheet and a component never declare
  the same class: with two owners a rule can be moved, renamed, or deleted on one side
  while the other keeps selecting it, and which rule an element gets is then a question
  of load order rather than of ownership.

Naming:

- A component's classes are BEM, and the block is the component's own name, so the name
  says where the rule lives: `aci-frontmatter-block`, `aci-frontmatter-block__key`, and
  `aci-frontmatter-block__nested--list-item` in `FrontmatterBlock.vue`;
  `aci-skill-file-tree-branch__file` in `SkillFileTreeBranch.vue`;
  `aci-scan-progress__actions` in
  `ScanProgress.vue`. Naming the block after the component is what makes a collision
  with the global sheet impossible rather than merely avoided, and it is what lets a
  class seen in a browser inspector be traced to the file that styles it.
- Global class names are plain, because they belong to no component: the utilities
  several components apply (`.aci-note`, `.aci-muted`, `.aci-authored-text`,
  `.aci-panel`, `.aci-definition-grid`) and the shared widget classes. A global rule
  never names a component's class, so when it needs to reach markup rather than a
  utility it selects the element: the section-heading baseline is `h2`, not a class
  written through the shell.

What a move has to check:

- Whether a rule can move at all is decided by its selector's subject — the rightmost
  compound, which is where `scoped` stamps the component's data attribute. A rule
  belongs in the global sheet exactly when components other than one render that
  subject, because scoping it would stop it matching, and the move then fails silently
  rather than loudly. The `h2` baseline is the case: three components render an `h2`,
  so inside any one of them the rule would become `h2[data-v-…]` and stop reaching the
  other two.
- `:deep()` makes such a selector match from inside a component again, and is not the
  answer for one: it would move a baseline every page depends on into one component
  behind an escape hatch, which is the arrangement this policy exists to prevent. Reach
  for it where a component genuinely styles markup it passes to a child.
- A grouped selector spanning two components' classes has to be decided rather than
  moved: splitting it duplicates the declarations, so either the shared look becomes a
  utility class both apply, or the rule stays until one is written.
- Scoping is not defeated by nesting or recursion: a selector like `.parent > .child`
  matches wherever both elements are rendered by the component that owns the style,
  including a component that renders itself. Reaching for the global sheet to escape
  scoping is a sign the markup, not the stylesheet, is in the wrong place.
- Moving a rule out of the global sheet is a refactor like any other: move the comment
  with it, and check no other template selects the class first.

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
- Open the artifact before naming it, and run the mechanism before crediting it. An
  unchecked rationale reads exactly like a checked one, so a comment citing a clause its
  artifact does not contain, or crediting a check that cannot fail, is what keeps the
  mistake in place through every later review.
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
  `<h1>`–`<h4>`, or over `^#{1,4} ` — the trailing space matters, since `#####` and
  `####text` are neither — when the cited URL is a `.md` variant. A summarizer's
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
