# Feature Specification: Inspect Agent Customizations

[日本語](spec.ja.md)

**Feature Branch**: `dev`

**Created**: 2026-07-15

**Status**: Draft

**Input**: User description: "Define the initial Agent Customization Inspector product from the supplied local product description without retaining a link to that temporary source."

## Clarifications

### Session 2026-07-15

- Q: What establishes the Repository source root? → A: The process working directory (`cwd`) from which the user runs `npx`; the initial release has no separate repository picker or ancestor-root discovery.
- Q: Which term should describe the first product scope? → A: Use “initial release” throughout the specification.
- Q: What should the specification call a discovered agent-customization file? → A: Use “customization file” throughout the specification.
- Q: What should the specification call the bounded set of filesystem paths eligible for inspection? → A: Use “inspection path allowlist” throughout the specification.
- Q: How must vendor lookup tables and their evidence be organized? → A: Keep vendor lookup behavior separate from Inspector matchers and runtime composition; use separate product documents, separate Repository and User/Global tables, separate GitHub Copilot VS Code/CLI/Cloud tables, and stable official-source references for every maintained row.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Repository Customizations (Priority: P1)

A developer changes to the intended repository root, launches the inspector through `npx`, and receives a browser-based inventory of the customization files recognized for GitHub Copilot, Claude Code, and OpenAI Codex. The launch process's `cwd` is always represented as its own Repository source.

**Why this priority**: Finding the relevant files without running an agent is the smallest useful version of the product and the prerequisite for every later workflow.

**Independent Test**: Launch the inspector with a fixture repository containing supported, unsupported, nested, and multiply recognized files as its `cwd`. Confirm that the inventory contains every supported customization file at an allowlisted inspection path, excludes unrelated files, and identifies its repository source, customization file type, path, and recognizing tools.

**Acceptance Scenarios**:

1. **Given** the `npx` launch `cwd` contains supported customization files for all three tools, **When** the user starts an inspection, **Then** the browser shows that directory as one Repository source and an inventory that can be filtered by tool and customization file type.
2. **Given** one physical `AGENTS.md` recognized by both Copilot and Codex, **When** the inventory is displayed, **Then** it appears once as a customization file with two distinct tool recognitions.
3. **Given** files outside the repository inspection path allowlist, **When** the repository is scanned, **Then** those files are not interpreted or presented as customization files.
4. **Given** no supported customization files, **When** the scan completes, **Then** the user sees a successful empty state that explains the supported scope rather than an error.

---

### User Story 2 - Inspect Customization Files Without Activating Them (Priority: P1)

A developer opens a customization file to read its source text, relevant metadata, source boundary, tool recognitions, and documented scope or relationships. The inspector makes uncertainty explicit and never executes or evaluates the customization file.

**Why this priority**: The product is intended for untrusted customization files; safe, faithful inspection is a core value rather than a later enhancement.

**Independent Test**: Inspect fixtures containing executable hook commands, skills with scripts, MCP server definitions, imports, malformed data, literal credentials, and boundary-crossing links while monitoring filesystem writes, child processes, and network activity. Confirm that the content remains inert, sensitive values are masked, and diagnostics preserve access to unaffected customization files.

**Acceptance Scenarios**:

1. **Given** a customization file declaring a command, hook, plugin, skill, workflow, extension, or MCP server, **When** the user opens it, **Then** the inspector displays the declaration without starting it, connecting to it, or evaluating its instructions.
2. **Given** a supported configuration with a credential-like value, **When** it is displayed, **Then** the value is masked by default and can be revealed only through an explicit, local, session-scoped action.
3. **Given** a Claude import that points outside its source boundary, **When** the customization file is inspected, **Then** the relationship and a boundary diagnostic are shown without reading or expanding the target.
4. **Given** precedence or effective behavior that depends on an unknown runtime surface, version, trust decision, working directory, flag, or environment, **When** the customization file is inspected, **Then** the inspector labels the uncertainty and does not claim a definitive winner or effective configuration.
5. **Given** an unreadable, malformed, changed, or oversized file at an allowlisted inspection path, **When** it is encountered, **Then** the inspector reports an actionable diagnostic and continues showing other customization files.

---

### User Story 3 - Compare Customizations (Priority: P2)

A developer selects any two discovered customization files and compares their masked source text and recognition metadata side by side to understand overlap and differences without asking an agent to interpret them.

**Why this priority**: Comparison turns a file inventory into a practical migration and troubleshooting aid while preserving the product's non-semantic scope.

**Independent Test**: Select two fixtures from different sources and tools, verify aligned source and metadata views, and confirm that the inspector reports literal differences and recognition differences without rating correctness or proposing changes.

**Acceptance Scenarios**:

1. **Given** two readable customization files, **When** the user compares them, **Then** both masked source views and their path, source, file type, and tool-recognition metadata are visible together.
2. **Given** the same customization file has multiple tool recognitions, **When** it is compared with another customization file, **Then** each recognition remains distinguishable from the physical file.
3. **Given** two files contain conflicting natural-language instructions, **When** they are compared, **Then** the literal difference is shown without declaring which instruction is semantically correct or effective.

---

### User Story 4 - Opt In to User-Global Inspection (Priority: P3)

A developer deliberately enables a separate Global source to inspect the small, documented set of user-global instruction paths for the three supported tools. Repository results remain identifiable and available independently.

**Why this priority**: Global instructions can explain behavior that repository files alone do not, but inspecting a user's home configuration increases privacy risk and therefore must remain optional and tightly bounded.

**Independent Test**: Start with supported global fixtures present and confirm that none are read before opt-in. Enable Global inspection, verify only files at the specified instruction paths appear under a separate source, then disable it and confirm the Global results are removed from the session.

**Acceptance Scenarios**:

1. **Given** Global inspection has not been enabled, **When** the inspector starts, **Then** it does not read or display files at user-global inspection paths.
2. **Given** the user reviews the boundary and explicitly opts in, **When** Global inspection completes, **Then** supported customization files at those paths appear under a separate Global source and repository results remain unchanged.
3. **Given** credentials, logs, runtime state, caches, or other out-of-scope files exist beside an allowlisted global instruction path, **When** Global inspection runs, **Then** those neighboring files are not read.
4. **Given** the user disables Global inspection, **When** the view refreshes, **Then** Global customization files and any revealed Global values are removed from the active session.

### Edge Cases

- The `npx` launch `cwd` cannot be read, becomes unavailable after launch, or is not the root the user intended to inspect.
- A file at an allowlisted inspection path is a broken symbolic link, resolves outside its source boundary, forms a link cycle, or changes between discovery and reading.
- A supported filename contains invalid text encoding, malformed frontmatter or configuration, extremely long lines, binary content, or exceeds a documented resource limit.
- Two physical paths refer to the same file, or one customization file has multiple recognized file types or recognizing tools.
- A customization file references another file through an absolute path, `..` traversal, environment-variable text, or a chain of imports.
- A configured tool home is missing, empty, relative, inaccessible, or outside the user's ordinary home location.
- A Global override file exists but is empty; the documented fallback file may then apply.
- Files change while the browser is open, including sensitive content becoming newly present.
- A browser session is refreshed or opened from a host other than the initiating machine.
- Secret masking fails to recognize an unusual credential shape; the interface must not imply that masking is exhaustive.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to launch the product through `npx` and open the resulting local inspection session in a browser. The process working directory (`cwd`) at launch MUST be the Repository source root; the initial release MUST NOT prompt for another repository path or search ancestor directories for a different root. If automatic browser opening is unavailable, the product MUST provide a usable local address.
- **FR-002**: Every inspection MUST include exactly one independently identified Repository source rooted at the `npx` launch `cwd`.
- **FR-003**: The inspector MUST discover repository customization files only at paths in a documented inspection path allowlist and MUST NOT indiscriminately interpret every file in the repository.
- **FR-004**: The initial release MUST recognize the repository customization file types listed in Supported Initial Release Customization Files for GitHub Copilot, Claude Code, and OpenAI Codex.
- **FR-005**: The product MUST represent a physical file separately from each tool-specific recognition so that one file can have multiple tools, kinds, scopes, or relationships without being duplicated as multiple physical files.
- **FR-006**: Users MUST be able to browse and filter the inventory by source, tool, customization file type, and repository-relative path.
- **FR-007**: For each readable customization file, the inspector MUST show its source, relative path, file type, recognizing tools, source text, relevant declared metadata, and known relationships.
- **FR-008**: The inspector MUST describe deterministic discovery order and scope rules when they are documented, including per-directory overrides and fallbacks, while keeping the underlying physical files visible.
- **FR-009**: The inspector MUST label behavior as conditional or unknown when it depends on runtime version, product surface, working directory, trust, flags, environment, organization policy, or undocumented conflict resolution.
- **FR-010**: Claude import relationships MUST be displayed as references only; the inspector MUST NOT automatically expand imported content, and references outside the originating source boundary MUST produce a diagnostic.
- **FR-011**: Users MUST be able to compare any two readable customization files side by side, including masked source text and recognition metadata.
- **FR-012**: Comparison MUST remain literal and descriptive; it MUST NOT validate, lint, semantically rank, synchronize, convert, format, or propose automatic fixes for either customization file.
- **FR-013**: Global inspection MUST be disabled on every new session and MUST require an explicit user action after the scope of the Global inspection path allowlist is explained.
- **FR-014**: When enabled, Global inspection MUST create a separately identified Global source and MUST NOT merge Global customization files into the Repository source.
- **FR-015**: The Copilot Global source MUST inspect only `copilot-instructions.md` and `instructions/**/*.instructions.md` below `COPILOT_HOME`, or below the documented default home when that setting is absent.
- **FR-016**: The Claude Global source MUST inspect only `CLAUDE.md` below `CLAUDE_CONFIG_DIR`, or below the documented default configuration directory when that setting is absent.
- **FR-017**: The Codex Global source MUST inspect only the documented instruction fallback at `CODEX_HOME`: a non-empty `AGENTS.override.md` when present, otherwise `AGENTS.md`; the documented default home applies when that setting is absent.
- **FR-018**: Global inspection MUST exclude additional Copilot instruction and skill directories, hosted or organization settings, Claude's separate user state file and other configuration files, Codex user skills and state, credentials, logs, caches, session data, managed policy, and any directory not named by FR-015 through FR-017.
- **FR-019**: The inspector MUST treat every customization file and every value derived from it as untrusted data.
- **FR-020**: The inspector MUST NOT execute skills, commands, hooks, plugins, workflows, extensions, scripts, handlers, prompts, agents, rules, or any other inspected content.
- **FR-021**: The inspector MUST NOT start, connect to, probe, or send requests to MCP servers described by inspected content.
- **FR-022**: Customization file discovery and viewing MUST NOT cause outbound network requests, child-process execution, dynamic code evaluation, or reads of referenced files outside the explicit Repository or opted-in Global boundary.
- **FR-023**: The inspector MUST NOT create, modify, rename, or delete files within an inspected source.
- **FR-024**: Symbolic links, aliases, imports, and referenced paths MUST NOT be followed beyond their source boundary; cycles and boundary crossings MUST fail safely with an actionable diagnostic.
- **FR-025**: Credential-like values and documented secret-bearing fields MUST be masked by default in source, metadata, comparison, diagnostics, and logs.
- **FR-026**: Revealing a masked value MUST require an explicit action for that value, MUST remain local to the active session, and MUST NOT persist after the customization file, Global source, or session is closed.
- **FR-027**: The inspector MUST warn users that automatic masking reduces accidental exposure but cannot guarantee detection of every secret shape.
- **FR-028**: A failure to read or parse one file at an allowlisted inspection path MUST NOT prevent other allowlisted files from being discovered or viewed, and the affected item MUST retain enough path and source context for the user to resolve the problem.
- **FR-029**: Resource limits for individual files, total scan work, nesting, and relationship depth MUST be documented and enforced; reaching a limit MUST produce a bounded partial result or diagnostic rather than a hang or crash.
- **FR-030**: Users MUST be able to rescan the active sources explicitly, and stale results MUST be replaced without carrying forward previously revealed sensitive values.
- **FR-031**: Inspection results and reveal state MUST remain session-scoped by default and MUST NOT be persisted as a profile, cache, or repository file by the initial release.
- **FR-032**: The initial release MUST NOT act as a validator, linter, semantic analyzer, synchronizer, converter, formatter, or auto-fixer.
- **FR-033**: Customization file source text and declared metadata MUST be presented as inert text or inert data; embedded markup, images, links, URI handlers, control sequences, or other content MUST NOT execute, load, or navigate merely because the customization file is displayed.
- **FR-034**: The inspector MUST NOT attach a Claude Code recognition to `AGENTS.md` solely because of its filename, infer that an unreferenced script in `.claude/hooks` is a hook, or treat a standalone `.claude/prompts` directory as a supported Claude Code customization file type.
- **FR-035**: For Codex instructions, the inspector MUST represent the documented per-directory selection of at most one non-empty instruction file—an applicable override first, otherwise the regular file and configured fallback names—and the broad-to-narrow ordering from Global through the repository toward a runtime working directory. When the working directory or configuration is unavailable, the resulting chain MUST remain conditional.
- **FR-036**: For Claude instructions, the inspector MUST represent the documented broad-to-narrow ordering, the local instruction after the regular instruction at the same level, and instruction files below the working directory as conditional when the runtime working directory is unknown.
- **FR-037**: When Copilot instruction sources can apply together or their precedence varies by product surface, the inspector MUST preserve each recognition and MUST NOT invent a general semantic winner.

### Supported Initial Release Customization Files

The planning phase MUST revalidate these customization file types and inspection paths against the then-current official specifications and freeze the exact inspection path allowlist before implementation. Revalidation may narrow ambiguous filename patterns but MUST NOT add another product or expand a Global source beyond FR-015 through FR-018 without a specification change.

| Tool | Repository inspection paths and customization file types | Explicitly excluded or conditional behavior |
|---|---|---|
| GitHub Copilot | Repository and path-specific instructions; recognized `AGENTS.md`, root `CLAUDE.md`, and root `GEMINI.md`; custom agents; skills under `.github/skills`, `.agents/skills`, and `.claude/skills`; prompts and Copilot CLI-compatible commands; hook declarations; MCP declarations; supported settings and plugin metadata | Surface-dependent support and undocumented precedence are shown as conditional; hosted personal or organization configuration and extra directories named by `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` or `COPILOT_SKILLS_DIRS` are outside the initial release |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, and nested instruction files; `.claude/rules`; skills; legacy commands; subagents; project and local settings; declared hooks; root MCP configuration; output styles; plugin manifests | Imports are relationships only; `AGENTS.md` is not recognized by filename alone; unreferenced scripts are not inferred to be hooks; a standalone `.claude/prompts` directory, managed settings, managed instructions, and unrelated user state are outside the Repository source |
| OpenAI Codex | `AGENTS.md` and `AGENTS.override.md`; `.agents/skills`; custom agent definitions; project configuration; hook declarations; MCP declarations; rules; plugin and marketplace metadata | Effective configuration that depends on project trust or working directory is conditional; deprecated user custom prompts and user-level skills are outside the Repository source |

### Key Entities

- **Inspection Session**: The transient user activity containing one Repository source, an optional Global source, current scan results, comparison selection, diagnostics, and reveal state.
- **Source**: An explicit filesystem trust boundary with a kind (`Repository` or `Global`), root location, enabled state, and scan status.
- **Customization File**: One discovered physical file within a source, identified by its source-relative path and safe file identity, with readable or diagnostic state and masked source text.
- **Tool Recognition**: A tool-specific interpretation attached to a customization file, including tool, file type, documented scope or order, declared metadata, and any uncertainty.
- **Relationship**: A non-executed reference from a customization file to another path or declared component, including boundary and resolution status without imported content expansion.
- **Diagnostic**: An actionable, secret-safe explanation of an empty result, read or parse failure, uncertainty, limit, stale file, cycle, or boundary violation.

## Quality Requirements *(mandatory)*

### Maintainability and Code Clarity

- **QR-001**: Inspection path definitions, source boundaries, recognitions, and precedence rules MUST have cohesive ownership and explicit invariants so maintainers can update one tool without changing unrelated tools. Every non-obvious safety or compatibility decision MUST document its rationale, and abstractions MUST be limited to demonstrated shared behavior.

### Testing and Verification

- **QR-002**: Automated verification MUST cover allowlisted and non-allowlisted inspection paths for every tool, multi-tool recognition, source separation, deterministic order and fallbacks, all uncertainty states, comparisons, opt-in and disable flows, malformed and changing files, encodings, resource limits, symbolic links, cycles, traversal attempts, secret masking and reveal reset, and regression tests proving zero execution, source mutation, MCP connection, and customization-file-triggered network access. Every error case MUST have an objective expected result, and end-to-end browser tests MUST cover all four user stories.

### Security and Privacy

- **QR-003**: The viewing session MUST be reachable only from the initiating machine by default and MUST use least-privilege filesystem access, canonical boundary checks at the time of each read, bounded resource use, secret-safe diagnostics and logging, and safe failure under file races. No inspected content or sensitive value may be sent to another machine or retained after the session by default.

### Documentation and Participation

- **QR-004**: English and Japanese user and contributor documentation MUST remain semantically equivalent and explain launch and setup, the `cwd`-derived Repository root, the exact supported inspection path allowlist, source boundaries and Global consent, conditional interpretations, secret-masking limitations, resource limits, diagnostics, and out-of-scope behavior. Primary discovery, inspection, comparison, consent, and secret-reveal workflows MUST be keyboard operable, expose meaningful labels and focus state, and meet WCAG 2.2 AA criteria applicable to the local browser interface. Error messages MUST identify both the problem and a practical next step.
- **QR-005**: Every maintained vendor behavior, Inspector rule, and runtime-composition strategy MUST cite one or more stable source IDs that resolve to canonical first-party documentation URLs, exact reviewed sections, and a review date. Vendor lookup behavior, Inspector matchers, and runtime composition MUST have separate ownership; each product MUST have its own behavior document; Repository behavior and User/Global behavior MUST use separate tables; and GitHub Copilot VS Code, CLI, and Cloud behavior MUST use separate tables. Every Repository matcher MUST state Base, Relative selector, and Expansion independently, render the exact launch-root boundary with `./`, and reject a bare `**/` prefix. Automated documentation checks MUST validate bilingual parity, identifier uniqueness, reciprocal references, and bounded official-source drift without changing a behavior, rule, or strategy automatically.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 95% of first-time participants can change to an intended repository root, launch the inspector there, and open one discovered customization file within 2 minutes using only the provided product guidance.
- **SC-002**: For a repository containing 100,000 filesystem entries and 500 matching customization files within documented size limits, users receive a complete inventory within 10 seconds and visible progress or a meaningful status within 1 second on the reference evaluation environment.
- **SC-003**: The conformance fixture set achieves 100% recognition of customization files at supported inspection paths, zero interpretation of files outside the frozen inspection path allowlist, and correct multi-tool attribution for every shared physical file.
- **SC-004**: Across the adversarial safety suite, inspections cause zero customization-file-derived command or code executions, child processes, MCP connections, outbound requests, inspected-source mutations, and reads beyond enabled source boundaries.
- **SC-005**: All credential values in the maintained secret fixture set are masked in every default view, comparison, diagnostic, and log, and 100% of reveal state is cleared when its customization file, source, or session closes.
- **SC-006**: At least 90% of participants can identify a customization file's source, recognizing tools, file type, and whether its effective behavior is certain or conditional within 2 minutes, with no critical usability issue in the primary workflows.
- **SC-007**: In 100% of maintained unreadable, malformed, oversized, cyclic, stale, and boundary-crossing fixtures, unaffected customization files remain usable and the affected item provides an actionable, secret-safe diagnostic.
- **SC-008**: All primary workflows can be completed using only a keyboard and pass the applicable WCAG 2.2 AA automated and manual acceptance checks with no critical accessibility defect.

## Assumptions

- The initial release is a local, single-user inspection session; remote hosting, collaboration, accounts, and durable profiles are outside scope.
- The `npx` launch `cwd` is the inspection boundary, not proof of the effective working directory used by any coding agent. Launching from a subdirectory limits the Repository source to that subtree; users rerun the command from the intended root to inspect a broader scope.
- Official customization formats can change. Their exact inspection paths, filenames, and extensions will be revalidated and frozen during planning, then published and covered by conformance fixtures.
- Global inspection covers only the instruction paths in FR-015 through FR-017; additional user-global skills, agents, settings, MCP definitions, plugins, managed configuration, and remote configuration require separate consent and future specification work.
- Source text is useful for inspection, so a user may deliberately reveal an individual masked value; revealing all secrets at once and persisting reveal choices are outside scope.
- The inspector may parse enough structure to label declared metadata and references, but a parse diagnostic is not a validation result and does not make the inspector a validator.
- Comparisons are limited to two customization files at a time in the initial release and do not merge or edit content.
- Product documentation and the supported matrix will use official vendor documentation as the normative external dependency; undocumented behavior will remain explicitly uncertain.
