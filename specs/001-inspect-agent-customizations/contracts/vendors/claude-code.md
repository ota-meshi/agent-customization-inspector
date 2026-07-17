# Claude Code Vendor Behavior and Inspection Contract

[日本語](claude-code.ja.md)

**Contract version**: 2026-07-17

**Official-source revalidation**: 2026-07-15

**Vendor**: Anthropic Claude Code

This document separates Claude Code's documented lookup behavior from the Inspector's
bounded inventory policy. It is the Claude-specific source-of-truth companion to the
[inspection allowlist](../inspection-path-allowlist.md). Runtime combination details are
defined by strategy ID in [runtime composition](../runtime-composition.md); this document
does not duplicate those algorithms.

## Terminology and interpretation

- A **behavior ID** (`behaviorId`) identifies one documented or explicitly uncertain
  Claude Code behavior. It does not authorize the Inspector to open a file.
- A **rule ID** (`ruleId`) identifies an Inspector rule. Only a rule whose class permits a
  read can authorize one, subject to the allowlist and safe-I/O contract.
- A **vendor locator** is expressed as a base, a relative locator, and traversal. It
  describes where Claude Code looks from a particular runtime context.
- An **Inspector matcher** is relative to the selected Repository or Global inventory
  root. Every Repository matcher in this document begins with `./`; a Global selector is
  relative to its separately named consented boundary and does not reuse that prefix. A
  matcher describes what the Inspector may inventory, not what Claude necessarily loads
  in the current run.
- For Repository matchers, `./**/` means zero or more descendant directory segments. The
  table states explicitly whether a matcher covers the inventory root, descendants, or
  both.
- `documented`, `partially-documented`, and `unknown` describe upstream evidence, not
  runtime effectiveness. Trust, approval, enablement, target files, runtime `cwd`, CLI
  flags, embedded-engine version, and installed-plugin state remain separate conditions.
- **Shared core** means the CLI, VS Code extension, and JetBrains integration use the same
  settings scopes and precedence. It does not mean every feature is available on every
  surface. The VS Code extension bundles its own Claude Code engine, which can differ in
  version from a separately installed CLI.

## Repository vendor behavior

The composition column references only strategy IDs from
[runtime composition](../runtime-composition.md#claude-code).

| Behavior ID | Surface | Base | Relative locator | Traversal / trigger | Composition strategy | Status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.behavior.repo.instructions.launch` | Shared core | `<launch-cwd>` | `./CLAUDE.md`; `./.claude/CLAUDE.md`; `./CLAUDE.local.md` | Exact launch directory; loaded at session start | `claude.instructions.layering` | documented | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.ancestor` | Shared core | Each `<ancestor-dir>` above `<launch-cwd>` | `./CLAUDE.md`; `./CLAUDE.local.md` | Walk parents toward the filesystem root; the ancestor walk does not document `./.claude/CLAUDE.md` | `claude.instructions.layering` | documented, with the noted negative boundary | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.instructions.descendant` | Shared core | A `<descendant-dir>` below `<launch-cwd>` | `./CLAUDE.md`; `./CLAUDE.local.md` | Lazy: loaded after Claude reads a file in that descendant subtree; descendant `./.claude/CLAUDE.md` is not documented | `claude.instructions.layering` | documented, with the noted negative boundary | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.behavior.repo.rules` | Shared core | Each documented rule layer from `<launch-cwd>` through its parents | `./.claude/rules/**/*.md` | Discover Markdown files recursively within each rule directory; a `paths` rule becomes applicable when a matching file is read | `claude.rules.layering` | partially documented: descendant rule-directory discovery and the base for ancestor-layer `paths` globs are not explicit | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.repo.skills` | CLI full; IDE subset | Each `<skill-layer>` from `<launch-cwd>` through the Git repository root | `./.claude/skills/<skill-name>/SKILL.md` | Discover ancestor layers at startup and nested descendant skill directories on demand as files are accessed | `claude.skills.selection` | documented | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.large-codebases.start-directory` |
| `claude.behavior.repo.skills-directory-plugin` | CLI; IDE availability conditional | `<launch-cwd>/.claude/skills/<plugin-name>` | `./.claude-plugin/plugin.json` | Exact launch-`cwd` skills directory only; unlike plain skills, do not walk ancestor skill directories for this plugin interpretation; workspace trust applies | `claude.plugins.activation` | documented | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.commands` | CLI full; IDE subset | The project command scope used by the session | `./.claude/commands/**/*.md` | Recursively discover command files inside the command directory; subdirectories form command namespaces | `claude.commands.selection` | partially documented: recursion is documented, but a complete skill-equivalent ancestor and lazy-descendant traversal is not stated independently | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.repo.agents` | Claude Code runtime where subagents are available | Each `<agent-layer>` from `<launch-cwd>` through the Git repository root | `./.claude/agents/**/*.md` | Recursively discover each layer; additional directories supplied with `--add-dir` can also contribute agents | `claude.agents.selection`; `claude.agent-context.composition` | documented; duplicate names inside one directory tree have no documented stable winner | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.project` | Subagent runtime | `<project-root>` | `./.claude/agent-memory/<agent-name>/` | Selected by `memory: project` in subagent frontmatter; this is runtime memory state, not general candidate discovery | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.agent-memory.local` | Subagent runtime | `<project-root>` | `./.claude/agent-memory-local/<agent-name>/` | Selected by `memory: local` in subagent frontmatter; this is runtime memory state, not general candidate discovery | `claude.agent-context.composition` | documented | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.repo.settings` | Shared core | `<launch-cwd>` | `./.claude/settings.json`; `./.claude/settings.local.json` | Exact launch directory only; do not inherit either file from a parent directory | `claude.settings.precedence` | documented | `anthropic.claude-code.large-codebases.start-directory`; `anthropic.claude-code.sdk.setting-sources`; `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.repo.hooks-contained` | Shared core where the event is supported | Accepted settings, skill, agent, or plugin declaration | Inline `hooks` fields; plugin `./hooks/hooks.json` only after plugin activation | Hooks are declarations contained in an accepted artifact; Claude does not define a standalone project `./.claude/hooks.json` | `claude.hooks.additive` | documented | `anthropic.claude-code.hooks.locations-resolution`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.mcp` | CLI full; VS Code partial; other IDE support conditional | `<project-root>` as determined by Claude Code | `./.mcp.json` | Exact project MCP file; relative `command` and `args` values resolve from launch `cwd`, not from the file's directory | `claude.mcp.selection` | documented, but the exact project-root selection algorithm is not fully specified | `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.ide.shared-differences` |
| `claude.behavior.repo.output-style` | CLI documented; IDE availability conditional | Each `<style-layer>` from `<launch-cwd>` through the repository root | `./.claude/output-styles/*.md` | Direct Markdown children at each ancestor layer; no documented recursive or lazy-descendant scan | `claude.output-style.selection` | documented | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.repo.plugin` | CLI management; IDEs consume shared configuration where supported | An explicitly selected `<plugin-root>` | `./.claude-plugin/plugin.json` plus default or manifest-declared component locations | A manifest is optional. A file at an arbitrary Repository path is not auto-discovered; the root must come from installation, a marketplace, `--plugin-dir` / `--plugin-url`, or the skills-directory plugin mechanism | `claude.plugins.activation` | explicit activation, not path discovery | `anthropic.claude-code.plugins.components-scopes` |
| `claude.behavior.repo.marketplace` | CLI management; IDEs use the same configured marketplaces | An explicitly registered `<marketplace-root>` | `./.claude-plugin/marketplace.json` | Read only after the marketplace is registered by configuration or command. A catalog at an arbitrary Repository path is not auto-discovered | `claude.plugins.activation` | explicit registration, not path discovery | `anthropic.claude-code.marketplaces.catalog-sources`; `anthropic.claude-code.ide.shared-differences` |

Current Claude Code supports nested subagent spawning up to its documented depth limit.
No rule or relationship in this contract carries the obsolete assumption that a subagent
cannot spawn another subagent.

## Repository Inspector matchers

These matchers are rooted at the exact Inspector launch `cwd`. Broad descendant inventory
allows the UI to show candidates that could matter under another product runtime `cwd` or
after lazy discovery. It never turns the matcher into a claim that Claude loaded the file.
Every row has policy references FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, and QR-005
unless a narrower exclusion or Global requirement is stated below.

| Rule ID | Base | Relative selector | Expansion | Class | Behavior refs | Runtime/documentation status | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.repo.instructions` | `./` | `./**/CLAUDE.md`; `./**/CLAUDE.local.md` | `descendant-inventory`: root and all descendants; `**` includes zero segments | `static-candidate` | `claude.behavior.repo.instructions.launch`; `claude.behavior.repo.instructions.ancestor`; `claude.behavior.repo.instructions.descendant` | Eligibility depends on launch `cwd`, ancestry, and the file subtree read. A nested `.claude/CLAUDE.md` is eligible only when it is the launch directory's exact `.claude` file; it is not a documented lazy-descendant form | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.sdk.setting-sources` |
| `claude.repo.rules` | `./` | `./**/.claude/rules/**/*.md` | `descendant-inventory` of possible rule-layer roots plus `recursive-subtree` inside each fixed rules directory | `static-candidate` | `claude.behavior.repo.rules` | Only a directory on a documented runtime layer is known eligible; nested inventory is conditional | `anthropic.claude-code.memory.locations-load` |
| `claude.repo.skill` | `./` | `./**/.claude/skills/*/SKILL.md` | `descendant-inventory`; skill name is exactly one direct child | `static-candidate` | `claude.behavior.repo.skills` | Plain-skill ancestor/lazy discovery differs from exact-launch-`cwd` skills-directory plugin discovery | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.repo.command` | `./` | `./**/.claude/commands/**/*.md` | `descendant-inventory` of possible command roots plus `recursive-subtree` within each fixed commands directory | `static-candidate` | `claude.behavior.repo.commands` | Recursive command namespaces are documented; runtime-layer traversal beyond the documented project/user locations remains conditional | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.repo.agent` | `./` | `./**/.claude/agents/**/*.md` | `descendant-inventory` of possible agent roots plus `recursive-subtree` within each fixed agents directory | `static-candidate` | `claude.behavior.repo.agents` | Eligible only when the directory participates in the cwd-to-Git-root layer chain or an allowed additional directory | `anthropic.claude-code.subagents.scope-context` |
| `claude.repo.settings` | `./` | `./.claude/settings.json`; `./.claude/settings.local.json` | `exact` for each selector | `static-candidate` | `claude.behavior.repo.settings` | Matches Claude's exact launch-`cwd` rule; no parent or descendant setting matcher | `anthropic.claude-code.large-codebases.start-directory`; `anthropic.claude-code.settings.scopes-precedence` |
| `claude.repo.mcp` | `./` | `./.mcp.json` | `exact` | `static-candidate` | `claude.behavior.repo.mcp` | Conditional on the source root being Claude's project root and on trust/approval | `anthropic.claude-code.mcp.scopes-precedence` |
| `claude.repo.output-style` | `./` | `./**/.claude/output-styles/*.md` | `descendant-inventory`; style file is a direct child of each fixed output-styles directory | `static-candidate` | `claude.behavior.repo.output-style` | Eligibility requires an ancestor layer of the active session and selection by settings/session state | `anthropic.claude-code.output-styles.locations` |
| `claude.repo.plugin-manifest` | `./` | `./.claude-plugin/plugin.json` | `exact`; the launch root is treated as the authored plugin root | `static-candidate` | `claude.behavior.repo.plugin` | Inspector authoring policy only. Claude does not auto-discover this path at an arbitrary Repository root, and presence does not establish activation. A nested local manifest is reachable only through `claude.derived.local-plugin-manifest` | `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.marketplaces.catalog-sources` |
| `claude.repo.marketplace` | `./` | `./.claude-plugin/marketplace.json` | `exact`; the launch root is treated as the authored marketplace root | `static-candidate` | `claude.behavior.repo.marketplace` | Inspector authoring policy only. Claude does not auto-register this catalog from an arbitrary Repository root; explicit registration remains a runtime condition | `anthropic.claude-code.marketplaces.catalog-sources` |

Hooks and inline MCP declarations contained in an accepted settings, skill, agent, plugin,
or marketplace file are metadata on that candidate. They do not create another filesystem
matcher.

## User behavior

`<claude-config-dir>` means `CLAUDE_CONFIG_DIR` when configured, otherwise the documented
default `~/.claude`. The separate `~/.claude.json` state file is not inside that directory.
The table records vendor behavior even when the initial Inspector release excludes it.

| Behavior ID | Surface | Base | Relative locator | Traversal / composition reference | Inspector status | Evidence |
|---|---|---|---|---|---|---|
| `claude.behavior.user.instructions` | Shared core | `<claude-config-dir>` | `./CLAUDE.md` | User instruction scope; `claude.instructions.layering` | Accepted only by `claude.global.instructions` below | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.rules` | Shared core | `<claude-config-dir>` | `./rules/**/*.md` | Recursive user rule directory; `claude.rules.layering` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.skills` | CLI full; IDE subset | `<claude-config-dir>` | `./skills/<skill-name>/SKILL.md` | User skill scope; `claude.skills.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.skills.locations-discovery` |
| `claude.behavior.user.commands` | CLI full; IDE subset | `<claude-config-dir>` | `./commands/**/*.md` | Recursive legacy command scope; `claude.commands.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting` |
| `claude.behavior.user.agents` | Claude Code runtime where subagents are available | `<claude-config-dir>` | `./agents/**/*.md` | Recursive user agent scope; `claude.agents.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.settings` | Shared core | `<claude-config-dir>` | `./settings.json` | User settings scope; `claude.settings.precedence` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.settings.scopes-precedence` |
| `claude.behavior.user.output-style` | CLI documented; IDE availability conditional | `<claude-config-dir>` | `./output-styles/*.md` | Direct style files; `claude.output-style.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.output-styles.locations` |
| `claude.behavior.user.mcp-state` | CLI full; VS Code partial | `<home>` | `./.claude.json` | User MCP and per-project local MCP state; `claude.mcp.selection` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.plugins` | CLI management; IDE shared configuration where supported | `<claude-config-dir>` | `./plugins/` and plugin enablement in `./settings.json` | Installed/cache/runtime-managed plugin data; `claude.plugins.activation` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.directory.file-reference` |
| `claude.behavior.user.agent-memory` | Subagent runtime | `<claude-config-dir>` | `./agent-memory/<agent-name>/` | One memory scope selected by agent frontmatter; `claude.agent-context.composition` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.subagents.scope-context` |
| `claude.behavior.user.auto-memory` | Shared runtime where auto memory is enabled | `<claude-config-dir>` | `./projects/<project-key>/memory/MEMORY.md` | Startup prefix plus topic files on demand; `claude.agent-context.composition` | `claude.excluded.user-runtime` under FR-016 and FR-018 | `anthropic.claude-code.memory.locations-load` |
| `claude.behavior.user.workflows` | Current Claude Code runtime | `<claude-config-dir>` | `./workflows/*.js` | Dynamic workflow files | `claude.excluded.user-runtime` under FR-016 and FR-018; no initial-release candidate rule | `anthropic.claude-code.directory.file-reference` |

## Global accepted matcher

FR-016 and FR-018 permit only the user instruction file below. Vendor support for any
other User file does not expand this consent boundary.

| Rule ID | Global base | Relative selector | Expansion | Class | Behavior refs | Policy refs | Status | Evidence |
|---|---|---|---|---|---|---|---|---|
| `claude.global.instructions` | Resolved `<claude-config-dir>` | `CLAUDE.md` | `exact`; Global selectors do not reuse the Repository `./` prefix | `static-candidate` | `claude.behavior.user.instructions` | FR-013, FR-014, FR-016, FR-018, QR-005 | Accepted by FR-016; all adjacent User configuration and state remain excluded by FR-018 | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.directory.file-reference` |

Environment validation, consent, canonicalization, and the rule for an absent versus an
invalid `CLAUDE_CONFIG_DIR` are Inspector policies defined by the parent allowlist, not
Claude Code vendor lookup claims.

## Derived and excluded rules, with relationship index

| Rule ID | Class | Bounded meaning | Behavior refs | Strategy refs | Status | Policy refs | Evidence |
|---|---|---|---|---|---|---|---|
| `claude.derived.local-plugin-manifest` | `bounded-derived-candidate` | From an independently accepted marketplace catalog, accept only a local plugin `source` beginning with `./`, resolve it from the marketplace root without escape, and test only `<resolved-plugin-root>/.claude-plugin/plugin.json`. Absence is valid because the manifest is optional | `claude.behavior.repo.marketplace`; `claude.behavior.repo.plugin` | `claude.plugins.activation` | Inspector derivation aligned with vendor-relative-source semantics; not a Claude auto-scan | FR-003, FR-004, FR-005, FR-024, QR-001, QR-004, QR-005 | `anthropic.claude-code.marketplaces.catalog-sources`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.excluded.user-runtime` | `excluded` | Exclude every User row above except `CLAUDE.md`, including settings/state, rules, skills, commands, agents, output styles, MCP state, plugins/cache, agent memory, auto memory, and workflows | `claude.behavior.user.rules`; `claude.behavior.user.skills`; `claude.behavior.user.commands`; `claude.behavior.user.agents`; `claude.behavior.user.settings`; `claude.behavior.user.output-style`; `claude.behavior.user.mcp-state`; `claude.behavior.user.plugins`; `claude.behavior.user.agent-memory`; `claude.behavior.user.auto-memory`; `claude.behavior.user.workflows` | — | Required by FR-016 and FR-018; exclusion does not deny vendor support | FR-013, FR-014, FR-016, FR-018, QR-001, QR-005 | `anthropic.claude-code.memory.locations-load`; `anthropic.claude-code.skills.locations-discovery`; `anthropic.claude-code.changelog.legacy-command-nesting`; `anthropic.claude-code.subagents.scope-context`; `anthropic.claude-code.settings.scopes-precedence`; `anthropic.claude-code.output-styles.locations`; `anthropic.claude-code.mcp.scopes-precedence`; `anthropic.claude-code.directory.file-reference`; `anthropic.claude-code.plugins.components-scopes` |
| `claude.excluded.plugin-files` | `excluded` | Exclude plugin component bodies such as skills, commands, agents, output styles, hooks, MCP/LSP declarations, monitors, themes, channels, settings, scripts, and assets; retain declarations as relationships | `claude.behavior.repo.plugin`; `claude.behavior.repo.marketplace` | `claude.plugins.activation` | Initial-release boundary; plugin manifest/catalog inventory is not component activation | FR-003, FR-004, FR-020, FR-021, FR-022, FR-024, QR-001, QR-005 | `anthropic.claude-code.plugins.components-scopes`; `anthropic.claude-code.directory.file-reference` |

The relationship-only rules referenced by this vendor—`claude.relationship.import`,
`claude.relationship.component`, `claude.relationship.agent-reference`,
`claude.relationship.agent-context`, and `claude.relationship.agent-mcp`—are defined
exactly once in the
[central relationship-only registry](../runtime-composition.md#normative-relationship-only-registry).
This index grants no read authority and does not duplicate those definitions.

## Known ambiguities and version-sensitive facts

1. The documented upward instruction walk names `CLAUDE.md` and `CLAUDE.local.md`; it does
   not establish ancestor `.claude/CLAUDE.md`. The lazy descendant description likewise
   does not establish descendant `.claude/CLAUDE.md`.
2. Rule directories on ancestor layers are documented, but the base against which a
   `paths` glob in an ancestor rule is evaluated is not explicit. Lazy discovery of a
   descendant `.claude/rules` directory is also not established.
3. Legacy command recursion and namespaces are documented. A complete statement that
   legacy commands inherit every plain-skill ancestor and lazy-descendant behavior is not.
4. For duplicate subagent names within one `.claude/agents` directory tree, the upstream
   docs do not define a stable filesystem-independent winner.
5. MCP documentation uses “project root” for `.mcp.json` but does not define a complete
   project-root selection algorithm. Relative process arguments are nevertheless clearly
   launch-`cwd` based.
6. The live memory page reviewed on 2026-07-15 states four import hops, while stale search
   excerpts have shown five. Source records should retain `reviewedOn` and an assertion
   fingerprint instead of trusting cached snippets.
7. A plugin manifest or marketplace catalog present in source is not evidence that Claude
   registered, installed, trusted, enabled, selected, or loaded it.
8. The same settings locations and precedence are shared across CLI and IDE integrations,
   but feature subsets and the embedded engine version can differ. Keep surface and engine
   version as applicability facts rather than creating fictitious alternate file paths.
9. Claude follows supported skill symlinks, while the Inspector intentionally does not
   follow any symlink. Report this as a parity limitation, never as a missing vendor file.
10. Current official docs include newer surfaces such as `.claude/workflows/*.js`,
    `.worktreeinclude`, keybindings, themes, plugin monitors, channels, and LSP settings.
    They require an explicit excluded or candidate rule before implementation; silence is
    not evidence that Claude ignores them.
11. Current Claude supports nested subagent spawning (documented maximum depth five). Any
    older “subagents cannot spawn subagents” statement is stale and must not return.
12. Upstream pages change without a versioned URL. Revalidation must compare the stored
    semantic assertion and section, not just URL reachability.

## Official evidence

All `anthropic.*` source IDs in this contract resolve through the single
[Official Source Registry](../official-sources.md), which owns their canonical URLs,
reviewed sections, review date, and reverse affected-record index. This vendor contract
does not duplicate or override that registry.
