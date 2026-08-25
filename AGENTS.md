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
- Read the whole clause before saying what it requires. A requirement here is often one
  long sentence-chain, so its opening is not a summary of it: characterizing FR-007 from
  its first lines produced the claim that it does not fix the inventory row unit, which is
  the one thing that sentence-chain settles. Quote from the text you actually read to the
  end, or say you have not read it.
- Before asking the user to decide, search the artifacts for the decision. A question the
  specification already answers costs the user their attention and invites a second,
  conflicting answer to a settled question — and the settled answer is usually the better
  one, because it was made with the whole contract in view. Ask only what the artifacts
  leave open, and say which artifact you checked.

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
- Never attribute a decision to the user. "user decision", "by user decision", and their
  translations say nothing: the code and its artifacts belong to the user, so every
  decision recorded here is theirs already, and marking some of them re-raises the
  question of who made the rest. Record the decision and the reason it holds; a note whose
  only content was the attribution is deleted rather than reworded.

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
  facts once and a separate inventory per kind, because a skill row is one name as one
  tool resolves it while an MCP row is one declared server name listing every
  declaration — one per `(carrier, tool)` — that resolves it.
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
- The release gate's task, phase, and trace-row counts are the deliberate exception to the
  rule above: they are a freeze, not a derivation. Their point is that a count nobody
  intended to change cannot change unnoticed, which is the same reason the vendor contract
  tables carry recorded digests. A phase or task added without updating both languages'
  counts is an unfinished change, and the counts are part of the change that adds it.
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

## Platform baseline policy

The browser floor is Baseline Newly available, and the Node floor is what `engines.node`
declares. Both sit deliberately close to the front edge, because this product's browser
support is a certification matrix rather than a field statistic: `playwright.config.ts`
pins one Chromium, one Firefox, and one WebKit revision, so a feature all three ship is a
feature every certified browser has. Waiting for Baseline Widely available would keep
hand-written equivalents in the tree for years after the platform grew the thing they
imitate, and each of those equivalents is a mechanism this repository then has to keep
correct.

- Take the platform's own construct as soon as all three certified engines ship it. This
  is the Implementation simplicity policy's "reach for the platform's own vocabulary"
  with a date attached. The open control's list is a popover placed by anchor
  positioning, so light dismiss, Escape, the top layer, and choosing the side that has
  room are the platform's rather than this repository's; a loop building a `Map` of
  arrays is `Map.groupBy`; a promise a later event settles is `Promise.withResolvers`; a
  module's own directory is `import.meta.dirname`.
- Measure support against the pinned revisions rather than recalling it. A compatibility
  table describes the web and a model's training data describes the past, while what
  governs here is what those three revisions do — which `CSS.supports()` and a feature
  probe driven through `playwright` answer in seconds. Record what the measurement showed
  wherever it decided a design.
- A feature one certified engine lacks is usable only as progressive enhancement, where
  its absence changes nothing a reader depends on. Anything a surface's correctness rests
  on waits for all three.
- A comment recording a feature as unavailable is a dated claim rather than a standing
  one. Re-measure it when the code around it is touched, and when the measurement
  disagrees, delete the comment and the workaround it explains in the same change.

## Dependency version policy

- Every dependency in `package.json` is declared as a caret range — never as an exact
  pin — including prereleases (`^2.0.1-rc.22`). The committed lockfile owns the exact
  resolved versions and their integrity; an exact specifier in the manifest would manage
  the same pin in two places. When one resolution must coincide with another package's —
  `h3` with devframe's own — the lockfile is where that coincidence lives, and the
  documents that record the decision say so.

## Icon policy

- Icons come from Iconify collections and are compiled into the bundle at build time by
  `unplugin-icons`: `import ExternalLinkIcon from '~icons/lucide/external-link'` becomes a
  component carrying that icon's own SVG. No icon runtime and no icon fetch ships, which
  is what FR-022 requires of a product that issues no outbound request — and the reason
  Iconify's API-backed runtime is not used, even with its API disabled.
- Taking an icon from a collection the bundle does not already carry is three edits in one
  change: the `@iconify-json/*` devDependency, the collection's `~icons/<collection>/` row
  in `scripts/third-party-notices-plugin.mjs`, and — because these generated packages ship
  their icon data with no license file of their own — that collection's upstream license
  text at `licenses/<package name>.txt`. The notice build fails loudly on a bundled package
  with no text to publish, so a missing step is never silent.
- Prefer a single-colour mark that inherits `currentColor`, so an icon dims and brightens
  with the text around it. A fixed-colour brand logo stays bright inside a muted control,
  which is why the editors are named by their single-colour brand glyphs rather than their
  full-colour logos.

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
- A member's home is decided by what it is a fact about, never by what is
  convenient to reach. A capability only some members of a family have does not
  belong on the type that represents the whole family: a type that spans several
  kinds must not declare a member meaningful to one of them, because every other
  kind is then forced to answer a question it has no answer to — and an
  implementation written to satisfy the compiler rather than a caller is the
  proof that the member is in the wrong place. When a shipped implementation's
  own comment has to say that nothing calls it, that is the signal. Give the
  narrower family its own unit, and let callers hold the closed union those
  units form, discriminated by the field that already tells them apart. The
  compiler then narrows to the unit that can answer, and no call site asserts
  a capability: a type predicate over one wide class — `x is Narrow` returned
  from a field comparison — proves nothing about the members it claims, so it
  is a cast wearing a guard's clothes. Each unit proves its own half in its
  constructor and declares the narrow discriminant its class body promises. Example: an instruction file's applicability range is a fact about an
  `instructions` rule, so it lives on the instruction compiled unit rather than
  on the rule unit every kind shares — a skill rule answers nothing about it.
- The same test applies one level up: a field on a shipped record that is empty
  for every row but one is describing one vendor's fact through a shape every
  vendor carries. Put the fact where it belongs — in that vendor's own module,
  beside the record it describes — the way each vendor's configuration reader
  lives beside its rules and the scan composes it without knowing the vendor.

## Agent-run Playwright verification policy

- When Coding Agent runs Playwright tests for local verification, run only the `chromium` project
  (Chrome) unless the user explicitly requests additional browsers. Select it explicitly,
  for example with `--project=chromium`; do not invoke a command that runs every configured
  browser.
- This default governs CodingAgent-initiated local verification only. It does not change CI,
  release, or other project-owned suites whose configuration explicitly requires broader
  browser coverage.
- Run the spec files the change can actually affect, and nothing else. The whole suite takes
  minutes, so running it to learn what one edited page does spends that time on 300 answers
  nobody asked for. Name the specs: `npx playwright test --project=chromium tests/e2e/<spec>`,
  narrowed further with `-g` when one case is in question.
- Avoid running the whole suite at all, the final check included. Ending a task is not a
  reason to re-run 300 browser tests: name the specs the task's changes could reach — across
  every change it made, not just the last one — and run those. Reach for the whole suite only
  when the change is genuinely suite-wide, such as the shell, the router, or a shared
  component every page renders, and say so when reporting.
- A change that no browser test can observe — a registry comment, a specification document, a
  task checkbox, a unit or contract test — is not followed by an end-to-end run at all: run
  the gate that owns it instead.

## Agent-started process policy

- A process Coding Agent starts is Coding Agent's to stop. A dev server, a fixture launch
  (`pnpm run start:fixture`), a watcher, or anything else backgrounded for verification is
  terminated before the turn ends, so the user is never left with a port held or a tree
  served by a build they have moved on from.
- Stop it by the handle the launch gave: the recorded process ID, or `preview_stop` for a
  server started through the preview tooling. Verify the stop rather than assuming it — a
  launcher script exits while the server it spawned keeps running, which leaves an orphan
  whose parent is `init`, so `ps` after the kill is what says the port is free.
- Never kill a process this session did not start. A `ps` sweep by name reaches the user's
  own servers and editors too, so the target is a process whose start this turn's own
  transcript accounts for.
- The exception is a process the user asked to keep running. Say so explicitly when leaving
  one up, with the port or URL it is on, so ending the turn is not the same as losing track
  of it.
- Port 9999 is the machine owner's, and no process Coding Agent starts may bind it. It is
  devframe's default port, so every launch of this product's host reaches for it unasked —
  `pnpm start`, `pnpm run start:fixture`, and the suites through
  `tests/e2e/launch-host.ts` and `tests/package/npx-launch.test.ts`. Pass `--port 0`,
  which has devframe select a free port and
  print it in the launch line; the launch line is where the bound port is read from in
  either case, so nothing is lost by not knowing it in advance. Reserving the port only
  while an agent is idle would not be reserving it: devframe moves off an occupied port
  but takes a free one, so an agent that omits `--port 0` takes 9999 exactly whenever its
  owner is not already holding it.

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
  says where the rule lives: `aci-declaration-block`, `aci-declaration-block__key`, and
  `aci-declaration-block__nested--list-item` in `DeclarationBlock.vue`;
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
