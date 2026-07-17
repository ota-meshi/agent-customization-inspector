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

### Session 2026-07-16

- Q: What runtime implementation constraint applies to the initial release? → A: Implement all executable application code as JavaScript/TypeScript. The CLI, local host, and inspected-source I/O run on Node.js public JavaScript APIs, while the browser receives generated JavaScript plus declarative HTML/CSS assets; strict JSON manifests, documentation, and license files remain valid package data. Do not use Rust, Node-API or other native addons, prebuilt native binaries, package-lifecycle compilation, or package-lifecycle/runtime artifact downloads.
- Q: What filesystem-race guarantee is possible under that Node.js-only constraint? → A: Centralize inspected-source I/O in one Node.js module, reject links and boundary failures exposed by public Node.js APIs, compare root, ancestor, candidate-path, open-handle, and post-read identity, canonical-location, and metadata snapshots, and discard all candidate bytes when a mismatch is detected. Use `O_NOFOLLOW` as final-component defense in depth when Node.js exposes it and the platform enforces it. The threat model excludes an adversarial local process that races an ancestor or, where effective `O_NOFOLLOW` is unavailable, final path component between these non-atomic checks; public Node.js APIs also cannot reveal every same-device mount or reparse behavior. These residual risks and their Node.js or operating-system resolution paths must remain documented.

### Session 2026-07-17

- Q: How are user-global roots represented as Sources? → A: Represent each supported tool's admitted Global root as its own Global Source—Codex at `CODEX_HOME`, Claude at `CLAUDE_CONFIG_DIR`, and Copilot at `COPILOT_HOME`—so a session has zero to three Global Sources. A Source has exactly one root; customization files of different types within that root remain separately visible.
- Q: How should literal credentials and environment-variable references in customization files be presented? → A: Display source text, displayed declared metadata values, and comparison content as authored without credential masking or a reveal workflow so literal differences remain visible. Treat environment-variable references in inspected content as literal text and never resolve or substitute their process values; the documented tool-home environment variables are used only to locate Global roots. Warn users that opening a file displays its full content, which may include sensitive values, while keeping operational diagnostics and logs free of duplicated source values.
- Q: What happens to the previous inventory when an explicit rescan fails fatally? → A: Keep the last successfully committed snapshot visible, label it as stale because the rescan failed, and show an actionable failure diagnostic. Discard every uncommitted result from the failed scan, including partial results, and replace the retained snapshot only after a later rescan commits successfully.
- Q: What path term applies consistently across Repository and Global sources? → A: Use “source-relative path” for the path from a customization file's owning Source root. For the Repository Source this is relative to the launch `cwd`; for each Global Source it is relative to that tool's admitted home root. Use “repository-relative path” only when discussing the Repository Source specifically.
- Q: What environment is used for SC-002 performance measurements? → A: Use the maintainer-designated current local development environment as the reference. Do not require Ubuntu or publish concrete machine, operating-system, hardware, or runtime details in repository documentation. Keep every sample in one measurement set on the same environment and describe the result as reference-environment-specific rather than a portable performance guarantee.
- Q: How many measured runs make up one SC-002 measurement set? → A: Use exactly 10 measured runs on the same maintainer-designated current local reference environment.
- Q: How many of the 10 measured SC-002 runs must pass? → A: At least 9 runs must each show visible progress or meaningful status within 1 second and a complete inventory within 10 seconds.
- Q: Does each measured SC-002 run reuse one Inspector process or start a new one? → A: End the Inspector after every measured run and start a new process for the next run so application-memory state and the previous scan snapshot are not reused.
- Q: What are the start and end points for SC-002 timing? → A: Start both timers when the browser submits the scan request. Stop the 1-second timer when the first progress or meaningful status is visibly rendered, and stop the 10-second timer when the complete inventory is rendered and its primary list controls are operable. Exclude `npx` download, installation, and process-start time.
- Q: How many participants are used to evaluate SC-001 and SC-006? → A: Use exactly 20 participants for each criterion; SC-001 requires at least 19 successes and SC-006 requires at least 18 successes.
- Q: Do SC-001 and SC-006 use the same participants or separate cohorts? → A: Use the same 20 participants in one evaluation session; they attempt SC-001 first and then SC-006.
- Q: What experience must SC-001 and SC-006 participants have? → A: Participants use Git and a command-line interface in their normal development work but have never used the Inspector or contributed to its development.
- Q: May moderators give operational hints during SC-001 and SC-006? → A: Moderators may only repeat the standardized task prompt verbatim; they must not provide command, navigation, or interface-operation hints.
- Q: How are equipment, environment, or product failures handled in the participant evaluation? → A: Count every such failure as an unsuccessful result, including a failure before the task timer starts; do not exclude or replace an enrolled participant.
- Q: What starting state is used for SC-006 after SC-001? → A: Regardless of the SC-001 result, place every participant in the same prepared Inspector state with the same designated customization file open; start the SC-006 timer when that state is ready and the standardized task prompt is presented.
- Q: What counts as a critical usability issue for SC-006? → A: A problem is critical if it prevents completion of a primary workflow without prohibited assistance or causes an unsafe behavior such as unintended execution, inspected-source mutation, MCP or network connection, or exposure of inspected content to another machine.
- Q: Is the operating system filesystem cache cleared between SC-002 runs? → A: Do not deliberately clear or reset the operating system filesystem cache; run all 10 measurements in its natural evolving state while still starting a new Inspector process for each run.
- Q: Where does the SC-001 two-minute timer start and stop? → A: Start when the standardized task prompt is presented, and stop when the source/details view for one discovered customization file is visibly open and operable. The timed interval includes changing to the intended repository root and launching the Inspector.
- Q: How is a successful SC-006 identification recorded and scored? → A: Provide a standardized response form with required fields for source, recognizing tools, file type, and certain or conditional effective behavior. A participant succeeds only by submitting all four fields within two minutes with every field matching the designated file's predefined ground truth; any missing or incorrect field is unsuccessful.
- Q: How is the SC-002 performance fixture managed across its 10 measured runs? → A: Prepare one deterministic fixture before measurement, keep it unchanged, and reuse it for all 10 runs. Fixture construction and setup are outside the timing intervals.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Discover Repository Customizations (Priority: P1)

A developer changes to the intended repository root, launches the inspector through `npx`, and receives a browser-based inventory of the customization files recognized for GitHub Copilot, Claude Code, and OpenAI Codex. The launch process's `cwd` is always represented as its own Repository source.

**Why this priority**: Finding the relevant files without running an agent is the smallest useful version of the product and the prerequisite for every later workflow.

**Independent Test**: Launch the inspector with a fixture repository containing supported, unsupported, nested, and multiply recognized files as its `cwd`. Confirm that the inventory contains every supported customization file at an allowlisted inspection path, excludes unrelated files, and identifies its repository source, customization file type, source-relative path, and recognizing tools.

**Acceptance Scenarios**:

1. **Given** the `npx` launch `cwd` contains supported customization files for all three tools, **When** the user starts an inspection, **Then** the browser shows that directory as one Repository source and an inventory that can be filtered by tool and customization file type.
2. **Given** one physical `AGENTS.md` recognized by both Copilot and Codex, **When** the inventory is displayed, **Then** it appears once as a customization file with two distinct tool recognitions.
3. **Given** files outside the repository inspection path allowlist, **When** the repository is scanned, **Then** those files are not interpreted or presented as customization files.
4. **Given** no supported customization files, **When** the scan completes, **Then** the user sees a successful empty state that explains the supported scope rather than an error.

---

### User Story 2 - Inspect Customization Files Without Activating Them (Priority: P1)

A developer opens a customization file to read its source text, relevant metadata, source boundary, tool recognitions, and documented scope or relationships. The inspector makes uncertainty explicit and never executes or evaluates the customization file.

**Why this priority**: The product is intended for untrusted customization files; safe, faithful inspection is a core value rather than a later enhancement.

**Independent Test**: Inspect fixtures containing executable hook commands, skills with scripts, MCP server definitions, imports, malformed data, literal credentials, environment-variable references, and boundary-crossing links while monitoring filesystem writes, child processes, and network activity and supplying sentinel environment values. Confirm that the content remains inert, literal values and references are displayed as authored without environment substitution, no sentinel value is introduced into displayed content, and diagnostics preserve access to unaffected customization files.

**Acceptance Scenarios**:

1. **Given** a customization file declaring a command, hook, plugin, skill, workflow, extension, or MCP server, **When** the user opens it, **Then** the inspector displays the declaration without starting it, connecting to it, or evaluating its instructions.
2. **Given** a supported configuration with a literal credential and an environment-variable reference, **When** it is displayed or compared, **Then** both are shown as authored without masking, the environment-variable reference is not resolved, and no reveal action is required.
3. **Given** a Claude import that points outside its source boundary, **When** the customization file is inspected, **Then** the relationship and a boundary diagnostic are shown without reading or expanding the target.
4. **Given** precedence or effective behavior that depends on an unknown runtime surface, version, trust decision, working directory, flag, or environment, **When** the customization file is inspected, **Then** the inspector labels the uncertainty and does not claim a definitive winner or effective configuration.
5. **Given** an unreadable, malformed, changed, or oversized file at an allowlisted inspection path, **When** it is encountered, **Then** the inspector reports an actionable diagnostic and continues showing other customization files.

---

### User Story 3 - Compare Customizations (Priority: P2)

A developer selects any two discovered customization files and compares their source text and recognition metadata side by side to understand overlap and differences without asking an agent to interpret them. Authored values remain visible so credential differences are not hidden.

**Why this priority**: Comparison turns a file inventory into a practical migration and troubleshooting aid while preserving the product's non-semantic scope.

**Independent Test**: Select two fixtures from different sources and tools, verify aligned source and metadata views, and confirm that the inspector reports literal differences and recognition differences without rating correctness or proposing changes.

**Acceptance Scenarios**:

1. **Given** two readable customization files, **When** the user compares them, **Then** both complete source views and their source-relative path, source, file type, and tool-recognition metadata are visible together without content-based masking.
2. **Given** the same customization file has multiple tool recognitions, **When** it is compared with another customization file, **Then** each recognition remains distinguishable from the physical file.
3. **Given** two files contain conflicting natural-language instructions, **When** they are compared, **Then** the literal difference is shown without declaring which instruction is semantically correct or effective.

---

### User Story 4 - Opt In to User-Global Inspection (Priority: P3)

A developer deliberately enables separate, tool-specific Global sources to inspect the small, documented set of user-global instruction paths for the three supported tools. Repository results remain identifiable and available independently.

**Why this priority**: Global instructions can explain behavior that repository files alone do not, but inspecting a user's home configuration increases privacy risk and therefore must remain optional and tightly bounded.

**Independent Test**: Start with supported global fixtures present and confirm that none are read before opt-in. Enable Global inspection, verify only files at the specified instruction paths appear under separately identified Codex, Claude, and Copilot Global sources, each with exactly one root, then disable it and confirm all Global results are removed from the session.

**Acceptance Scenarios**:

1. **Given** Global inspection has not been enabled, **When** the inspector starts, **Then** it does not read or display files at user-global inspection paths.
2. **Given** the user reviews the boundaries and explicitly opts in, **When** Global inspection completes, **Then** supported customization files at those paths appear under separately identified tool-specific Global sources, each bound to exactly one root, and repository results remain unchanged.
3. **Given** credentials, logs, runtime state, caches, or other out-of-scope files exist beside an allowlisted global instruction path, **When** Global inspection runs, **Then** those neighboring files are not read.
4. **Given** the user disables Global inspection, **When** the view refreshes, **Then** all Global sources and Global customization files are removed from the active session.

### Edge Cases

- The `npx` launch `cwd` cannot be read, becomes unavailable after launch, or is not the root the user intended to inspect.
- A file at an allowlisted inspection path is a broken symbolic link, resolves outside its source boundary, forms a link cycle, or changes between discovery and reading.
- A supported filename contains invalid text encoding, malformed frontmatter or configuration, extremely long lines, binary content, or exceeds a documented resource limit.
- Two physical paths refer to the same file, or one customization file has multiple recognized file types or recognizing tools.
- A customization file references another file through an absolute path, `..` traversal, environment-variable text, or a chain of imports.
- A configured tool home is missing, empty, relative, inaccessible, or outside the user's ordinary home location.
- A Global override file exists but is empty; the documented fallback file may then apply.
- Files change while the browser is open, including sensitive content becoming newly present.
- An explicit rescan fails fatally after producing partial results; the partial results are discarded and the last successfully committed snapshot remains visible with a stale marker and failure diagnostic.
- A browser session is refreshed or opened from a host other than the initiating machine.
- A customization file contains a literal credential or an environment-variable reference whose variable is set in the Inspector process; the literal source is displayed without masking, and the reference is not resolved or substituted.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to launch the product through `npx` and open the resulting local inspection session in a browser. The process working directory (`cwd`) at launch MUST be the Repository source root; the initial release MUST NOT prompt for another repository path or search ancestor directories for a different root. If automatic browser opening is unavailable, the product MUST provide a usable local address.
- **FR-002**: Every inspection MUST include exactly one independently identified Repository source rooted at the `npx` launch `cwd`.
- **FR-003**: The inspector MUST discover repository customization files only at paths in a documented inspection path allowlist and MUST NOT indiscriminately interpret every file in the repository.
- **FR-004**: The initial release MUST recognize the repository customization file types listed in Supported Initial Release Customization Files for GitHub Copilot, Claude Code, and OpenAI Codex.
- **FR-005**: The product MUST represent a physical file separately from each tool-specific recognition so that one file can have multiple tools, kinds, scopes, or relationships without being duplicated as multiple physical files.
- **FR-006**: Users MUST be able to browse and filter the inventory by source, tool, customization file type, and source-relative path.
- **FR-007**: For each readable customization file, the inspector MUST show its source, source-relative path, file type, recognizing tools, source text, relevant declared metadata, and known relationships.
- **FR-008**: The inspector MUST describe deterministic discovery order and scope rules when they are documented, including per-directory overrides and fallbacks, while keeping the underlying physical files visible.
- **FR-009**: The inspector MUST label behavior as conditional or unknown when it depends on runtime version, product surface, working directory, trust, flags, environment, organization policy, or undocumented conflict resolution.
- **FR-010**: Claude import relationships MUST be displayed as references only; the inspector MUST NOT automatically expand imported content, and references outside the originating source boundary MUST produce a diagnostic.
- **FR-011**: Users MUST be able to compare any two readable customization files side by side, including complete source text and recognition metadata without content-based masking.
- **FR-012**: Comparison MUST remain literal and descriptive; it MUST NOT validate, lint, semantically rank, synchronize, convert, format, or propose automatic fixes for either customization file.
- **FR-013**: Global inspection MUST be disabled on every new session and MUST require an explicit user action after the scope of the Global inspection path allowlist is explained.
- **FR-014**: When enabled, Global inspection MUST create zero to three separately identified tool-specific Global sources—at most one each for Copilot, Claude, and Codex. Each Global source MUST be bound to exactly one admitted root for its tool, and Global customization files MUST NOT be merged into the Repository source or another tool's Global source.
- **FR-015**: The Copilot Global source MUST inspect only `copilot-instructions.md` and `instructions/**/*.instructions.md` below `COPILOT_HOME`, or below the documented default home when that setting is absent.
- **FR-016**: The Claude Global source MUST inspect only `CLAUDE.md` below `CLAUDE_CONFIG_DIR`, or below the documented default configuration directory when that setting is absent.
- **FR-017**: The Codex Global source MUST inspect only the documented instruction fallback at `CODEX_HOME`: a non-empty `AGENTS.override.md` when present, otherwise `AGENTS.md`; the documented default home applies when that setting is absent.
- **FR-018**: Global inspection MUST exclude additional Copilot instruction and skill directories, hosted or organization settings, Claude's separate user state file and other configuration files, Codex user skills and state, credentials, logs, caches, session data, managed policy, and any directory not named by FR-015 through FR-017.
- **FR-019**: The inspector MUST treat every customization file and every value derived from it as untrusted data.
- **FR-020**: The inspector MUST NOT execute skills, commands, hooks, plugins, workflows, extensions, scripts, handlers, prompts, agents, rules, or any other inspected content.
- **FR-021**: The inspector MUST NOT start, connect to, probe, or send requests to MCP servers described by inspected content.
- **FR-022**: Customization file discovery and viewing MUST NOT cause outbound network requests, child-process execution, or dynamic code evaluation. Inspected-source reads MUST be initiated only by the central Node.js source-boundary module from internally admitted entries; client-supplied paths and referenced files that fail the applicable lexical, canonical, link, regular-file, or source-boundary check MUST NOT be accepted as read authority.
- **FR-023**: The inspector MUST NOT create, modify, rename, or delete files within an inspected source.
- **FR-024**: Symbolic links, aliases, imports, and referenced paths exposed by public Node.js APIs MUST NOT be accepted or presented as customization content beyond their source boundary; cycles, boundary crossings, and unusable or ambiguous verification metadata MUST fail safely with an actionable diagnostic. The central Node.js source-boundary module MUST use `O_NOFOLLOW` as final-component defense in depth when Node.js exposes it and the platform enforces it. At enumeration, before `open`, after `open` but before reading, and after the bounded same-handle read, candidate verification MUST check path `lstat` first to reject a link or wrong identity/type, then evaluate candidate `realpath` and canonical containment, and then repeat path `lstat` to require the same identity across canonicalization; the applicable phases MUST also compare root identity, every available ancestor identity, and open-handle identity and metadata. Any detected change or unverifiable required check MUST discard the candidate bytes and MUST NOT publish or commit a result for that read.
- **FR-025**: The inspector MUST display readable customization-file source text without credential detection, content-based masking, redaction, or a reveal step. Displayed declared metadata values and comparison content MUST preserve authored literal values so differences, including differences between credentials, remain visible.
- **FR-026**: Environment-variable references in inspected content MUST remain literal text and MUST NOT cause the Inspector to read, resolve, or substitute the referenced process-environment value. This restriction does not prevent FR-015 through FR-017 from using their explicitly documented tool-home environment variables solely to locate Global source roots.
- **FR-027**: Before users open source or comparison content, the inspector MUST clearly explain that it displays the complete authored content and that the content may include sensitive values. The initial release MUST NOT provide credential masking or a reveal workflow.
- **FR-028**: A failure to read or parse one file at an allowlisted inspection path MUST NOT prevent other allowlisted files from being discovered or viewed, and the affected item MUST retain enough source-relative path and source context for the user to resolve the problem.
- **FR-029**: Resource limits for individual files, total scan work, nesting, and relationship depth MUST be documented and enforced; reaching a limit MUST produce a bounded partial result or diagnostic rather than a hang or crash.
- **FR-030**: Users MUST be able to rescan the active sources explicitly. Scan results MUST be committed atomically as one generation snapshot, including when FR-029 permits a bounded partial result. A successful commit MUST replace the previous snapshot; if the rescan fails fatally before commit, the inspector MUST discard all of that scan's uncommitted results, including partial results, retain the last successfully committed snapshot, mark it as stale because the rescan failed, and show an actionable failure diagnostic.
- **FR-031**: Inspection results MUST remain session-scoped by default and MUST NOT be persisted as a profile, cache, or repository file by the initial release.
- **FR-032**: The initial release MUST NOT act as a validator, linter, semantic analyzer, synchronizer, converter, formatter, or auto-fixer.
- **FR-033**: Customization file source text and declared metadata MUST be presented as inert text or inert data; embedded markup, images, links, URI handlers, control sequences, or other content MUST NOT execute, load, or navigate merely because the customization file is displayed.
- **FR-034**: The inspector MUST NOT attach a Claude Code recognition to `AGENTS.md` solely because of its filename, infer that an unreferenced script in `.claude/hooks` is a hook, or treat a standalone `.claude/prompts` directory as a supported Claude Code customization file type.
- **FR-035**: For Codex instructions, the inspector MUST represent the documented per-directory selection of at most one non-empty instruction file—an applicable override first, otherwise the regular file and configured fallback names—and the broad-to-narrow ordering from Global through the repository toward a runtime working directory. When the working directory or configuration is unavailable, the resulting chain MUST remain conditional.
- **FR-036**: For Claude instructions, the inspector MUST represent the documented broad-to-narrow ordering, the local instruction after the regular instruction at the same level, and instruction files below the working directory as conditional when the runtime working directory is unknown.
- **FR-037**: When Copilot instruction sources can apply together or their precedence varies by product surface, the inspector MUST preserve each recognition and MUST NOT invent a general semantic winner.
- **FR-038**: All executable application code in the initial-release implementation and package MUST be JavaScript/TypeScript. The CLI, local host, and inspected-source filesystem layer MUST run on Node.js public JavaScript APIs, and browser logic MUST be generated from JavaScript/TypeScript sources. Declarative generated HTML/CSS, strict JSON manifests, documentation, and license files MAY be packaged. The product MUST NOT contain Rust code, Node-API or other native addons, prebuilt native binaries, package-lifecycle compilation, or package-lifecycle/runtime artifact downloads.

### Supported Initial Release Customization Files

The planning phase MUST revalidate these customization file types and inspection paths against the then-current official specifications and freeze the exact inspection path allowlist before implementation. Revalidation may narrow ambiguous filename patterns but MUST NOT add another product or expand a Global source beyond FR-015 through FR-018 without a specification change.

| Tool | Repository inspection paths and customization file types | Explicitly excluded or conditional behavior |
|---|---|---|
| GitHub Copilot | Repository and path-specific instructions; recognized `AGENTS.md`, root `CLAUDE.md`, and root `GEMINI.md`; custom agents; skills under `.github/skills`, `.agents/skills`, and `.claude/skills`; prompts and Copilot CLI-compatible commands; hook declarations; MCP declarations; supported settings and plugin metadata | Surface-dependent support and undocumented precedence are shown as conditional; hosted personal or organization configuration and extra directories named by `COPILOT_CUSTOM_INSTRUCTIONS_DIRS` or `COPILOT_SKILLS_DIRS` are outside the initial release |
| Claude Code | `CLAUDE.md`, `.claude/CLAUDE.md`, `CLAUDE.local.md`, and nested instruction files; `.claude/rules`; skills; legacy commands; subagents; project and local settings; declared hooks; root MCP configuration; output styles; plugin manifests | Imports are relationships only; `AGENTS.md` is not recognized by filename alone; unreferenced scripts are not inferred to be hooks; a standalone `.claude/prompts` directory, managed settings, managed instructions, and unrelated user state are outside the Repository source |
| OpenAI Codex | `AGENTS.md` and `AGENTS.override.md`; `.agents/skills`; custom agent definitions; project configuration; hook declarations; MCP declarations; rules; plugin and marketplace metadata | Effective configuration that depends on project trust or working directory is conditional; deprecated user custom prompts and user-level skills are outside the Repository source |

### Key Entities

- **Inspection Session**: The transient user activity containing exactly one Repository source, zero to three tool-specific Global sources, current scan results, comparison selection, and diagnostics.
- **Source**: An explicit filesystem trust boundary with a kind (`Repository` or `Global`), exactly one root location, enabled state, and scan status. A Global source is additionally identified by exactly one supported tool; customization files of different types within that root remain separate inventory items.
- **Source-relative Path**: A customization file's display and filtering path relative to the one root of its owning Source. It is repository-relative to the launch `cwd` only for the Repository Source and tool-home-relative for a Global Source.
- **Customization File**: One discovered physical file within a source, identified by its source-relative path and safe file identity, with readable or diagnostic state and complete source text without content-based masking.
- **Tool Recognition**: A tool-specific interpretation attached to a customization file, including tool, file type, documented scope or order, declared metadata, and any uncertainty.
- **Relationship**: A non-executed reference from a customization file to another path or declared component, including boundary and resolution status without imported content expansion.
- **Diagnostic**: An actionable explanation of an empty result, read or parse failure, uncertainty, limit, stale file, cycle, or boundary violation that identifies the affected source and source-relative location without duplicating customization source values.

## Quality Requirements *(mandatory)*

### Maintainability and Code Clarity

- **QR-001**: Inspection path definitions, source boundaries, recognitions, and precedence rules MUST have cohesive ownership and explicit invariants so maintainers can update one tool without changing unrelated tools. Every non-obvious safety or compatibility decision MUST document its rationale, and abstractions MUST be limited to demonstrated shared behavior.

### Testing and Verification

- **QR-002**: Automated verification MUST cover allowlisted and non-allowlisted inspection paths for every tool, multi-tool recognition, source separation, deterministic order and fallbacks, all uncertainty states, comparisons, opt-in and disable flows, malformed and changing files, encodings, resource limits, symbolic links, cycles, traversal attempts, root and candidate replacement fixtures, identity and metadata changes, discarded results after detected races, fatal-rescan rollback to the last committed snapshot, exact presentation of literal credentials, non-resolution of environment-variable references, and regression tests proving zero execution, source mutation, MCP connection, and customization-file-triggered network access. Every error case MUST have an objective expected result, and end-to-end browser tests MUST cover all four user stories. The supported-OS matrix MUST distinguish required rejection of stable and detectable unsafe objects, rejection with `safe-fs-boundary-unverifiable` when Node.js reports required metadata or canonicalization as unusable or ambiguous, and an explicit `platform-unobservable` record for an OS feature that public Node.js APIs do not expose; the last category MUST NOT count as containment proof. These tests MUST verify the documented Node.js checks without being described as proof against an unobservable adversarial path-component replacement race.

### Security and Privacy

- **QR-003**: The viewing session MUST be reachable only from the initiating machine by default and MUST use least-privilege filesystem access, a single Node.js inspected-source I/O boundary, lexical and canonical containment checks, link and non-regular-file rejection, `O_NOFOLLOW` where exposed and enforced, enumeration-to-open identity checks, root/ancestor/candidate/open-handle post-read revalidation, bounded resource use, operational diagnostics and logs that do not duplicate customization source values, and result discard on every detected or reported-unverifiable file race. No inspected content or displayed value may be sent to another machine or retained after the session by default. Because public Node.js APIs do not provide a cross-platform directory-handle-relative open and do not reveal every same-device mount or reparse behavior, the product MUST document that it does not provide kernel-enforced containment against an adversarial local process concurrently replacing an ancestor or unsupported final path component, or against an OS indirection that Node.js cannot observe; future resolution requires an appropriate public Node.js API or an operating-system-enforced read-only boundary.

### Documentation and Participation

- **QR-004**: English and Japanese user and contributor documentation MUST remain semantically equivalent and explain launch and setup, the `cwd`-derived Repository root, the exact supported inspection path allowlist, source boundaries and Global consent, conditional interpretations, complete source presentation and its sensitive-value warning, non-resolution of environment-variable references, resource limits, diagnostics, and out-of-scope behavior. Primary discovery, inspection, comparison, and consent workflows MUST be keyboard operable, expose meaningful labels and focus state, and meet WCAG 2.2 AA criteria applicable to the local browser interface. Error messages MUST identify both the problem and a practical next step.
- **QR-005**: Every maintained vendor behavior, Inspector rule, and runtime-composition strategy MUST cite one or more stable source IDs that resolve to canonical first-party documentation URLs, exact reviewed sections, and a review date. Vendor lookup behavior, Inspector matchers, and runtime composition MUST have separate ownership; each product MUST have its own behavior document; Repository behavior and User/Global behavior MUST use separate tables; and GitHub Copilot VS Code, CLI, and Cloud behavior MUST use separate tables. Every Repository matcher MUST state Base, Relative selector, and Expansion independently, render the exact launch-root boundary with `./`, and reject a bare `**/` prefix. Automated documentation checks MUST validate bilingual parity, identifier uniqueness, reciprocal references, and bounded official-source drift without changing a behavior, rule, or strategy automatically.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: In an evaluation with exactly 20 first-time participants who use Git and a command-line interface in their normal development work but have never used the Inspector or contributed to its development, at least 19 can change to an intended repository root, launch the inspector there, and open one discovered customization file within 2 minutes using only the provided product guidance. The two-minute timer MUST start when the standardized task prompt is presented and MUST stop when the source/details view for one discovered customization file is visibly open and operable; the timed interval therefore includes changing to the intended repository root and launching the Inspector. The same participant cohort MUST be used for SC-006 in the same evaluation session, with SC-001 attempted first. Moderators MAY repeat the standardized task prompt verbatim but MUST NOT provide command, navigation, or interface-operation hints for either criterion. Once a participant is enrolled in the 20-person cohort, every equipment, environment, or product failure that prevents or interrupts a criterion MUST count as an unsuccessful result for that criterion, including a failure before its task timer starts; the participant MUST NOT be excluded or replaced.
- **SC-002**: For a repository containing 100,000 filesystem entries and 500 matching customization files within documented size limits, users receive a complete inventory within 10 seconds and visible progress or a meaningful status within 1 second on the maintainer-designated current local reference environment. One deterministic fixture matching that workload MUST be prepared before measurement, remain unchanged, and be reused for all 10 measured runs; fixture construction and setup MUST be outside the timing intervals. Both timers MUST start when the browser submits the scan request; the 1-second timer MUST stop when the first progress or meaningful status is visibly rendered, and the 10-second timer MUST stop when the complete inventory is rendered and its primary list controls are operable. `npx` download, installation, and process-start time MUST be outside these timers. Each measurement set MUST contain exactly 10 measured runs, all on that same environment, and at least 9 runs MUST individually meet both timing thresholds. Every measured run MUST start a new Inspector process after the prior process has ended and MUST NOT reuse application-memory state or the prior scan snapshot. The operating system filesystem cache MUST NOT be deliberately cleared or reset between runs; the 10 runs MUST use its natural evolving state. This result is environment-specific rather than a portable guarantee, and repository documentation MUST NOT publish concrete machine, operating-system, hardware, or runtime details for the reference environment.
- **SC-003**: The conformance fixture set achieves 100% recognition of customization files at supported inspection paths, zero interpretation of files outside the frozen inspection path allowlist, and correct multi-tool attribution for every shared physical file.
- **SC-004**: Across the maintained safety suite within the documented Node.js-only threat model, inspections cause zero customization-file-derived command or code executions, child processes, MCP connections, outbound requests, or inspected-source mutations; issue zero intentional read requests for selectors rejected as outside an enabled source boundary; and publish or commit zero bytes from every fixture whose link, identity, canonical location, or relevant metadata changes detectably during reading.
- **SC-005**: In 100% of maintained exact-display fixtures, literal credential values and environment-variable reference text appear unmasked and unchanged in source and comparison views, no referenced process-environment value is introduced into displayed content, and no masking or reveal control is presented.
- **SC-006**: After attempting SC-001, the same 20 first-time participants in that evaluation session attempt SC-006. Regardless of the SC-001 result, every participant MUST begin SC-006 in the same prepared Inspector state with the same designated customization file open; the 2-minute timer MUST start when that state is ready and the standardized task prompt is presented. Each participant MUST record their answer in a standardized response form with required fields for the file's source, recognizing tools, file type, and whether its effective behavior is certain or conditional. Success requires submitting all four fields within two minutes with every field matching the designated file's predefined ground truth; any missing or incorrect field MUST count as unsuccessful. At least 18 participants MUST succeed using only the provided product guidance and the moderator policy defined by SC-001. Across the primary workflows, there MUST be zero critical usability issues: a problem is critical if it prevents workflow completion without prohibited assistance or causes unintended execution, inspected-source mutation, an MCP or network connection, or exposure of inspected content to another machine.
- **SC-007**: In 100% of maintained unreadable, malformed, oversized, cyclic, stale, boundary-crossing, and fatal-rescan fixtures, unaffected customization files remain usable and the affected item provides an actionable diagnostic without duplicating customization source values; every fatal rescan publishes 0 partial results and leaves the last successfully committed snapshot visible and marked stale.
- **SC-008**: All primary workflows can be completed using only a keyboard and pass the applicable WCAG 2.2 AA automated and manual acceptance checks with no critical accessibility defect.

## Assumptions

- The initial release is a local, single-user inspection session; remote hosting, collaboration, accounts, and durable profiles are outside scope.
- All executable application code in the initial release is JavaScript/TypeScript: the browser runs generated client logic and declarative assets, and all non-browser product code runs on Node.js. Strict manifests, documentation, and license files remain non-executable package data. Contributors and users need no Rust toolchain, native compiler, native addon, platform-specific prebuilt binary, or package-lifecycle/runtime artifact download.
- Inspected Repository and opted-in Global roots are ordinary local paths controlled by the initiating user. Normal concurrent edits are expected and must fail closed when the documented Node.js checks detect a change or report required verification data as unusable. An adversarial local process that races an ancestor or, on a platform without effective `O_NOFOLLOW`, final path component between checks is outside the initial-release threat model because public Node.js APIs do not expose a cross-platform atomic directory-handle-relative open. Same-device mounts and reparse behavior that the platform does not expose through Node.js are also residual limitations. These limitations do not relax link, containment, identity, metadata, result-discard, or diagnostic requirements for detectable or reported-unverifiable cases.
- The `npx` launch `cwd` is the inspection boundary, not proof of the effective working directory used by any coding agent. Launching from a subdirectory limits the Repository source to that subtree; users rerun the command from the intended root to inspect a broader scope.
- Official customization formats can change. Their exact inspection paths, filenames, and extensions will be revalidated and frozen during planning, then published and covered by conformance fixtures.
- Global inspection covers only the instruction paths in FR-015 through FR-017; additional user-global skills, agents, settings, MCP definitions, plugins, managed configuration, and remote configuration require separate consent and future specification work.
- Source text, displayed declared metadata values, and comparison content are presented without credential masking so authored differences remain visible. Environment-variable references in inspected content remain literal and are not resolved; the product has no reveal workflow. Because opening a file exposes its complete content, the interface and documentation state that sensitive values may be visible, while operational diagnostics and logs do not duplicate customization source values.
- The inspector may parse enough structure to label declared metadata and references, but a parse diagnostic is not a validation result and does not make the inspector a validator.
- Comparisons are limited to two customization files at a time in the initial release and do not merge or edit content.
- Product documentation and the supported matrix will use official vendor documentation as the normative external dependency; undocumented behavior will remain explicitly uncertain.
