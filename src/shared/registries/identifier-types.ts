// The closed identifier catalogs of the contract-versioned registries
// (contracts/inspection-path-allowlist.md § Contract map and identifier
// ownership). One union per identifier kind, assembled from one sub-union per
// vendor or publisher.
//
// These unions are what make a cross-reference checkable. The relation edges in
// `relation-types.ts` and a citation's `sourceId` all carry these types, so a
// mistyped or retired identifier is a compile error at the line that authored
// it instead of a contract-test failure somewhere else — or, worse, a reference
// the gate happens not to cover.
//
// They also make each aggregate registry provably complete: an aggregate is
// annotated `Record<BehaviorId, …>`, so adding a vendor's IDs here without
// spreading that vendor's catalog into the aggregate fails to compile.
//
// Deliberately not a union: `policyRefs` names FR/QR clauses owned by spec.md
// rather than by these registries, so a mistyped clause is a documentation
// error rather than a broken cross-reference (see `evidence-types.ts` for the
// citation that does carry one).
//
// Ships zero runtime code — the `-types` name records that.

/**
 * Anthropic Claude Code behavior statements
 * (contracts/vendors/claude-code.md). Statements arrive with the inventory
 * phase that needs them.
 */
export type ClaudeBehaviorId =
  /** Claude subagent discovery: recursive Markdown under each layer's `.claude/agents/`; a non-authorizing MCP-selection input. */
  | 'claude.behavior.repo.agents'
  /** Claude subagent local memory at `<project-root>/.claude/agent-memory-local/<agent-name>/`; runtime state, never a candidate. */
  | 'claude.behavior.repo.agent-memory.local'
  /** Claude subagent project memory at `<project-root>/.claude/agent-memory/<agent-name>/`; runtime state, never a candidate. */
  | 'claude.behavior.repo.agent-memory.project'
  /** Claude project command discovery: Markdown found recursively under the project's `.claude/commands/`. */
  | 'claude.behavior.repo.commands'
  /** Claude instruction discovery in each directory above the runtime `cwd`, toward the filesystem root. */
  | 'claude.behavior.repo.instructions.ancestor'
  /** Claude instruction discovery in a subdirectory of the runtime `cwd`, on demand. */
  | 'claude.behavior.repo.instructions.descendant'
  /** Claude hooks contained in an accepted settings, skill, agent, plugin, or marketplace declaration. */
  | 'claude.behavior.repo.hooks-contained'
  /** Claude instruction discovery in the exact runtime `cwd`, at session start. */
  | 'claude.behavior.repo.instructions.launch'
  /** Claude project MCP declarations at `<project-root>/.mcp.json`. */
  | 'claude.behavior.repo.mcp'
  /** Claude marketplace catalogs, read from a registered `<marketplace-root>`'s `.claude-plugin/marketplace.json`. */
  | 'claude.behavior.repo.marketplace'
  /** Claude plugin content at an explicitly selected `<plugin-root>`; a non-authorizing MCP-selection input. */
  | 'claude.behavior.repo.plugin'
  /** Claude project rule discovery: Markdown found recursively under each layer's `.claude/rules/`. */
  | 'claude.behavior.repo.rules'
  /** Claude shared project settings at `<launch-cwd>/.claude/settings.json`, the permission policy among their keys. */
  | 'claude.behavior.repo.settings.shared'
  /** Claude personal project settings at `.claude/settings.local.json`, kept at the repository root with documented exceptions. */
  | 'claude.behavior.repo.settings.local'
  /** Claude Repository output styles: direct Markdown children of every `.claude/output-styles/` layer. */
  | 'claude.behavior.repo.output-style'
  /** Claude Repository skill discovery under `.claude/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.repo.skills'
  /** Claude plugins loaded by placement: a skills-directory folder carrying `.claude-plugin/plugin.json`. */
  | 'claude.behavior.repo.skills-directory-plugin'
  /** Claude User subagents under `<claude-config-dir>/agents/`; a non-authorizing fact. */
  | 'claude.behavior.user.agents'
  /** Claude User subagent memory at `<claude-config-dir>/agent-memory/<agent-name>/`; a non-authorizing fact. */
  | 'claude.behavior.user.agent-memory'
  /** Claude auto memory under `<claude-config-dir>/projects/<project-key>/memory/`; a non-authorizing fact. */
  | 'claude.behavior.user.auto-memory'
  /** Claude User commands under `<claude-config-dir>/commands/`; a non-authorizing fact. */
  | 'claude.behavior.user.commands'
  /** Claude User instructions at `<claude-config-dir>/CLAUDE.md`. */
  | 'claude.behavior.user.instructions'
  /** Claude User keyboard shortcuts at `<claude-config-dir>/keybindings.json`; a terminal-UI preference, never an agent input. */
  | 'claude.behavior.user.keybindings'
  /** Claude User output styles under `<claude-config-dir>/output-styles/`; a non-authorizing fact. */
  | 'claude.behavior.user.output-style'
  /** Claude User and per-project local MCP state at `<home>/.claude.json`; a non-authorizing fact. */
  | 'claude.behavior.user.mcp-state'
  /** Claude installed plugin data under `<claude-config-dir>/plugins/`; a non-authorizing fact. */
  | 'claude.behavior.user.plugins'
  /** Claude User rules under `<claude-config-dir>/rules/`; a non-authorizing fact. */
  | 'claude.behavior.user.rules'
  /** Claude User settings at `<claude-config-dir>/settings.json`; a non-authorizing fact. */
  | 'claude.behavior.user.settings'
  /** Claude User skill discovery under `<claude-config-dir>/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.user.skills'
  /** Claude User color themes under `<claude-config-dir>/themes/*.json`; a terminal-UI preference, never an agent input. */
  | 'claude.behavior.user.themes'
  /** Claude User dynamic workflow scripts under `<claude-config-dir>/workflows/*.js`; a non-authorizing fact. */
  | 'claude.behavior.user.workflows';

/**
 * OpenAI Codex behavior statements
 * (contracts/vendors/openai-codex.md). Statements arrive with the inventory
 * phase that needs them.
 */
export type CodexBehaviorId =
  /** Codex plugin manifests at `.codex-plugin/plugin.json` in a plugin root a catalog or an installation selected. */
  | 'codex.behavior.plugin.manifest'
  /** Codex project custom agents: standalone `.codex/agents/*.toml` spawned-session configuration layers. */
  | 'codex.behavior.repo.agents'
  /** Codex project configuration layers at `.codex/config.toml`. */
  | 'codex.behavior.repo.config'
  /** Codex hooks in every active trusted config layer: `.codex/hooks.json` and inline `[hooks]`. */
  | 'codex.behavior.repo.hooks'
  /** Codex per-directory project instruction lookup: override, regular, then configured fallbacks. */
  | 'codex.behavior.repo.instructions'
  /** Codex MCP server declarations: `[mcp_servers.*]` inside active `.codex/config.toml` layers. */
  | 'codex.behavior.repo.mcp'
  /** Codex repository plugin catalogs at the exact `.agents/plugins/marketplace.json` and legacy `.claude-plugin/marketplace.json`. */
  | 'codex.behavior.repo.marketplace'
  /** Codex rule files in every active trusted project config layer: `.codex/rules/*.rules`. */
  | 'codex.behavior.repo.rules'
  /** Codex Repository skill discovery under `.agents/skills/<name>/SKILL.md`. */
  | 'codex.behavior.repo.skills'
  /** Codex User custom agents at `<CODEX_HOME>/agents/*.toml`; a non-authorizing fact. */
  | 'codex.behavior.user.agents'
  /** Codex User configuration at `<CODEX_HOME>/config.toml`; a non-authorizing carrier fact. */
  | 'codex.behavior.user.config'
  /** Codex User hooks at `<CODEX_HOME>/hooks.json` and inline `[hooks]` in `<CODEX_HOME>/config.toml`; a non-authorizing fact. */
  | 'codex.behavior.user.hooks'
  /** Codex User instruction fallback at `<CODEX_HOME>/AGENTS.override.md` then `AGENTS.md`. */
  | 'codex.behavior.user.instructions'
  /** Codex local memory files under `<CODEX_HOME>/memories/`; generated state and a non-authorizing fact. */
  | 'codex.behavior.user.memories'
  /** Codex personal marketplace at `$HOME/.agents/plugins/marketplace.json` and its installed/cache copies; a non-authorizing fact. */
  | 'codex.behavior.user.plugins'
  /** Codex deprecated custom prompts at `<CODEX_HOME>/prompts/*.md`; a non-authorizing fact. */
  | 'codex.behavior.user.prompts'
  /** Codex User rule files at `<CODEX_HOME>/rules/*.rules`; a non-authorizing fact. */
  | 'codex.behavior.user.rules'
  /** Codex User skill discovery under `$HOME/.agents/skills/<name>/SKILL.md`. */
  | 'codex.behavior.user.skills';

/**
 * GitHub Copilot behavior statements
 * (contracts/vendors/github-copilot.md). Statements arrive with the inventory
 * phase that needs them; the skill phase ships the three Repository surfaces,
 * the non-authorizing User scopes their selection strategies compose, the
 * legacy CLI command surface the CLI selection outranks, and the
 * origin-file-less hosted remote-skill fact. The instruction phase ships one
 * statement per surface and per instruction location, because VS Code, CLI,
 * and Cloud document different lookup bases for the same filenames and two
 * surfaces with different bases are two statements (§ Surface boundary).
 */
export type CopilotBehaviorId =
  /** Copilot CLI legacy commands at `.claude/commands/*.md`; a same-name skill outranks one. */
  | 'copilot.behavior.cli.commands'
  /** Copilot CLI `AGENTS.md` discovery across its documented standard locations. */
  | 'copilot.behavior.cli.instructions.agents'
  /** Copilot CLI `CLAUDE.md` and `.claude/CLAUDE.md` discovery across its standard locations. */
  | 'copilot.behavior.cli.instructions.claude'
  /** Copilot CLI `GEMINI.md` discovery across its documented standard locations. */
  | 'copilot.behavior.cli.instructions.gemini'
  /** Copilot CLI path-specific instructions below each admitted `.github/instructions` directory. */
  | 'copilot.behavior.cli.instructions.path'
  /** Copilot CLI repository-wide `.github/copilot-instructions.md` across its standard locations. */
  | 'copilot.behavior.cli.instructions.repository'
  /** Non-authorizing: the CLI's experimental `.github/extensions/<name>/extension.*` project extensions. */
  | 'copilot.behavior.cli.extensions'
  /** User scope: the CLI's experimental `~/.copilot/extensions/<name>/extension.*` personal extensions. */
  | 'copilot.behavior.cli.user.extensions'
  /** User scope: the plugins a CLI session has installed or enabled through personal settings. */
  | 'copilot.behavior.cli.user.plugins'
  /** Non-authorizing: the CLI's documented `.github/lsp.json` project LSP configuration. */
  | 'copilot.behavior.cli.lsp'
  /** Copilot CLI plugin and marketplace manifests, at an installed or registered root. */
  | 'copilot.behavior.cli.plugins'
  /** Copilot CLI workspace MCP declarations: `.mcp.json` and `.github/mcp.json` on each ancestor. */
  | 'copilot.behavior.cli.mcp'
  /** Copilot CLI custom-agent discovery: `.github/agents` and `.claude/agents` on each ancestor to the Git root. */
  | 'copilot.behavior.cli.agents'
  /** Copilot CLI Repository skill discovery in the three fixed skills directories. */
  | 'copilot.behavior.cli.skills'
  /** The CLI's Repository settings files and the cross-tool Claude-compatible subset it also reads. */
  | 'copilot.behavior.cli.settings'
  /** Copilot CLI Repository hook lookup: the root hook files and the inline `hooks` block of each supported settings document. */
  | 'copilot.behavior.cli.hooks'
  /** Copilot CLI User path instructions below `<COPILOT_HOME>/instructions`. */
  | 'copilot.behavior.cli.user.instructions.path'
  /** Copilot CLI User instructions at `<COPILOT_HOME>/copilot-instructions.md`. */
  | 'copilot.behavior.cli.user.instructions.root'
  /** Copilot CLI User MCP configuration at `<COPILOT_HOME>/mcp-config.json`; a non-authorizing fact. */
  | 'copilot.behavior.cli.user.mcp'
  /** Copilot CLI User custom agents under `~/.copilot/agents/`; a non-authorizing fact. */
  | 'copilot.behavior.cli.user.agents'
  /** Non-authorizing: the CLI's User `~/.copilot/lsp-config.json`. */
  | 'copilot.behavior.cli.user.lsp'
  /** Non-authorizing: the CLI's User settings layer under `COPILOT_HOME`. */
  | 'copilot.behavior.cli.user.settings'
  /** Copilot CLI User skill discovery under `~/.copilot/skills` and `~/.agents/skills`. */
  | 'copilot.behavior.cli.user.skills'
  /** Copilot CLI User hook lookup under the configuration home, files and inline block alike. */
  | 'copilot.behavior.cli.user.hooks'
  /** Copilot cloud agent custom-agent profiles at the repository root's `.github/agents`. */
  | 'copilot.behavior.cloud.agents'
  /** Copilot cloud agent `AGENTS.md` discovery over the repository tree. */
  | 'copilot.behavior.cloud.instructions.agents'
  /** Copilot cloud agent root-only `CLAUDE.md` and `GEMINI.md` agent-instruction alternatives. */
  | 'copilot.behavior.cloud.instructions.alternatives'
  /** Copilot cloud agent path-specific instructions below the root `.github/instructions`. */
  | 'copilot.behavior.cloud.instructions.path'
  /** Copilot cloud agent repository-wide `.github/copilot-instructions.md` at the repository root. */
  | 'copilot.behavior.cloud.instructions.repository'
  /** Copilot cloud agent hosted MCP configuration: out-of-box, custom-agent, then repository-settings sources; no filesystem locator. */
  | 'copilot.behavior.cloud.mcp'
  /** Copilot cloud agent's hosted organization and enterprise agent profiles; no filesystem locator. */
  | 'copilot.behavior.cloud.organization-agents'
  /** Copilot cloud agent's plugin state: the settings a repository enables plugins through, and the hosted copies. */
  | 'copilot.behavior.cloud.plugins'
  /** Copilot cloud agent's hosted organization instructions; no filesystem locator. */
  | 'copilot.behavior.cloud.organization-instructions'
  /** Copilot cloud agent's hosted remote-skill relay; no filesystem locator. */
  | 'copilot.behavior.cloud.remote-skills'
  /** Copilot cloud agent Repository skill discovery at the repository root. */
  | 'copilot.behavior.cloud.skills'
  /** Copilot cloud-agent hook lookup: the repository hook files present in the ephemeral clone. */
  | 'copilot.behavior.cloud.hooks'
  /** Copilot VS Code custom-agent discovery in the workspace `.github/agents` and `.claude/agents` directories. */
  | 'copilot.behavior.vscode.agents'
  /** Copilot VS Code `AGENTS.md` discovery; the nested tier is experimental. */
  | 'copilot.behavior.vscode.instructions.agents'
  /** Copilot VS Code `CLAUDE.md` compatibility locations at the workspace root. */
  | 'copilot.behavior.vscode.instructions.claude'
  /** Copilot VS Code path-specific instructions below its instruction locations. */
  | 'copilot.behavior.vscode.instructions.path'
  /** Copilot VS Code prompt files at the workspace `.github/prompts`; invoked manually. */
  | 'copilot.behavior.vscode.prompts'
  /** Copilot VS Code repository-wide `.github/copilot-instructions.md` at the workspace root. */
  | 'copilot.behavior.vscode.instructions.repository'
  /** Copilot VS Code workspace MCP configuration: `.vscode/mcp.json`, and root `.mcp.json` for 1.118+. */
  | 'copilot.behavior.vscode.mcp'
  /** Copilot VS Code plugin and marketplace manifests, at a registered or installed root. */
  | 'copilot.behavior.vscode.plugins'
  /** Non-authorizing: VS Code's general workspace `.vscode/settings.json` scope. */
  | 'copilot.behavior.vscode.settings'
  /** Copilot VS Code Repository skill discovery at the workspace root. */
  | 'copilot.behavior.vscode.skills'
  /** Copilot VS Code workspace hook lookup: the root hook files and the Claude-format settings documents. */
  | 'copilot.behavior.vscode.hooks'
  /** Copilot VS Code User `~/.claude/CLAUDE.md` personal instructions. */
  | 'copilot.behavior.vscode.user.claude'
  /** Copilot VS Code User custom agents in home and profile data; a non-authorizing fact. */
  | 'copilot.behavior.vscode.user.agents'
  /** Copilot VS Code User instruction locations in home and profile data. */
  | 'copilot.behavior.vscode.user.instructions'
  /** Copilot VS Code User MCP configuration in the profile's own `mcp.json`. */
  | 'copilot.behavior.vscode.user.mcp'
  /** Copilot VS Code User prompt files in the profile's own data; a non-authorizing fact. */
  | 'copilot.behavior.vscode.user.prompts'
  /** Non-authorizing: VS Code's User settings scope. */
  | 'copilot.behavior.vscode.user.settings'
  /** User scope: the plugins a VS Code profile has installed, registered, or been given by path. */
  | 'copilot.behavior.vscode.user.plugins'
  /** Copilot VS Code User skill discovery in home and profile locations. */
  | 'copilot.behavior.vscode.user.skills'
  /** Copilot VS Code User hook lookup in the home hooks directory and the User Claude settings document. */
  | 'copilot.behavior.vscode.user.hooks';

/**
 * Every documented vendor-behavior statement the product maintains. Each
 * vendor's sub-union joins here, and the behavior registry is keyed by it.
 */
export type BehaviorId = ClaudeBehaviorId | CodexBehaviorId | CopilotBehaviorId;

/**
 * Anthropic official documentation pages cited by the shipped records
 * (contracts/official-sources.md). Pages arrive with the records that cite
 * them.
 */
export type AnthropicSourceId =
  /** The Claude directory page: which files live where under `~/.claude` and beside it. */
  | 'anthropic.claude-code.directory.file-reference'
  /** The Claude Code environment-variables page: the variables the product reads, `CLAUDE_CONFIG_DIR` among them. */
  | 'anthropic.claude-code.env-vars'
  /** The Claude Code MCP page: installation scopes and plugin-provided servers. */
  | 'anthropic.claude-code.mcp.scopes-precedence'
  /** The subagents page: agent scopes, per-agent MCP scoping, and context inheritance. */
  | 'anthropic.claude-code.subagents.scope-context'
  /** The Claude Code skills page: where skills live and how they are named. */
  | 'anthropic.claude-code.skills.locations-discovery'
  /** The memory page: where CLAUDE.md files live, how they load, and that AGENTS.md is not read. */
  | 'anthropic.claude-code.memory.locations-load'
  /** The Agent SDK features page: the settingSources gate and the CLAUDE.md load-location table. */
  | 'anthropic.claude-code.sdk.setting-sources'
  /** The large-codebases page: the start directory and per-directory skills. */
  | 'anthropic.claude-code.large-codebases.start-directory'
  /** The IDE-integrations page: shared configuration and per-surface differences. */
  | 'anthropic.claude-code.ide.shared-differences'
  /** The settings page: which settings file reaches what, where each one lives, and their precedence. */
  | 'anthropic.claude-code.settings.scopes-precedence'
  /** The permissions page: the rule syntax a declared policy is written in, and how the rules are evaluated. */
  | 'anthropic.claude-code.permissions.rule-syntax'
  /** The hooks reference: where a hook may be declared, and what a declaration's scope is. */
  | 'anthropic.claude-code.hooks.locations-resolution'
  /** The plugins reference: component scopes and skills-directory plugins. */
  | 'anthropic.claude-code.plugins.components-scopes'
  /** The plugin-marketplaces page: where a catalog lives, what its entries declare, and the sources they name. */
  | 'anthropic.claude-code.marketplaces.catalog-sources'
  /** The output-styles page: where a custom style lives, what its frontmatter declares, and how a same-name style resolves. */
  | 'anthropic.claude-code.output-styles.locations'
  /**
   * The changelog releases that version-anchor legacy-command nesting: 1.0.45
   * restored the subdirectory-derived namespace in a command name, and 1.0.51
   * fixed the same nesting for the User scope (QR-005).
   */
  | 'anthropic.claude-code.changelog.legacy-command-nesting'
  /**
   * The changelog releases that version-anchor nested skill behavior: 2.1.6
   * introduced nested `.claude/skills` discovery, and 2.1.178 the
   * directory-qualified retention of a nested name clash (QR-005).
   */
  | 'anthropic.claude-code.changelog.nested-skill-discovery';

/**
 * OpenAI official documentation pages cited by the shipped records
 * (contracts/official-sources.md).
 */
export type OpenAiSourceId =
  /** The AGENTS.md page: how Codex discovers guidance and customizes fallback filenames. */
  | 'openai.codex.agents-md'
  /** The basic configuration page: the config file locations and their precedence. */
  | 'openai.codex.config-basic'
  /** The deprecated custom-prompts page: where a prompt file lives and how it is invoked. */
  | 'openai.codex.custom-prompts'
  /** The Codex hooks page: where hooks live, their config shape, and their review gate. */
  | 'openai.codex.hooks'
  /** The Codex MCP page: how MCP servers are declared and connected. */
  | 'openai.codex.mcp'
  /** The local-memories page: where generated memory files live and how the feature is turned on. */
  | 'openai.codex.memories'
  /** The Codex plugins page: local marketplace catalogs, their entry sources, and the plugin manifest and its bundled components. */
  | 'openai.codex.plugins'
  /** The Codex rules page: where rule files live and what a `prefix_rule()` declares. */
  | 'openai.codex.rules'
  /** The Codex skills page: where Codex loads local skills, and their metadata. */
  | 'openai.codex.skills'
  /** The Codex subagents page: custom-agent files, their schema, and how a spawned session inherits from its parent. */
  | 'openai.codex.subagents';

/**
 * GitHub official documentation pages cited by the shipped records
 * (contracts/official-sources.md § GitHub official sources).
 */
export type GitHubSourceId =
  /** The Copilot CLI configuration-directory reference: what `~/.copilot/` holds, its personal agents and skills among it, and the settings files each scope reads. */
  | 'github.copilot.cli.configuration'
  /** The Copilot CLI custom-agents how-to: where a profile is created and how a reader invokes one. */
  | 'github.copilot.cli.custom-agents'
  /** The Copilot CLI custom-instructions how-to: the CLI instruction kinds and their locations. */
  | 'github.copilot.cli.instructions'
  /** The Copilot CLI extensions page: where an extension directory lives, its entry file, and its experimental state. */
  | 'github.copilot.cli.extensions'
  /** The Copilot CLI LSP-servers page: the `.github/lsp.json` project configuration and its priority. */
  | 'github.copilot.cli.lsp'
  /** The Copilot CLI MCP how-to: the per-repository carrier files and their two declaration schemas. */
  | 'github.copilot.cli.mcp'
  /** The Copilot CLI plugin reference: plugin and marketplace manifests, their component paths, and the loading order a duplicate name resolves under. */
  | 'github.copilot.cli.plugins'
  /** The Copilot CLI command reference: skill locations, legacy commands, and their order. */
  | 'github.copilot.cli.reference'
  /** The cloud-agent repository-instructions how-to: root, path-specific, and alternative files. */
  | 'github.copilot.cloud.instructions'
  /** The custom-instructions support matrix: which instruction file each surface reads. */
  | 'github.copilot.instructions.support'
  /** The Copilot plugins concept page: what a plugin holds, where one comes from, and the settings each client installs it through. */
  | 'github.copilot.plugins'
  /** The Copilot agent-skills page: cloud skill discovery, usage, and shared skills. */
  | 'github.copilot.skills'
  /** The custom-agents configuration reference: the shared agent profile format, its `mcp-servers` field included. */
  | 'github.copilot.custom-agents'
  /** The Copilot hooks reference: the per-surface hook locations, the configuration format, and the disable switch. */
  | 'github.copilot.hooks';

/**
 * Microsoft Visual Studio Code official documentation pages cited by the
 * shipped records (contracts/official-sources.md § Microsoft Visual Studio
 * Code official sources).
 */
export type VsCodeSourceId =
  /** The VS Code agent-customization overview: what each customization gives you, and monorepos. */
  | 'vscode.copilot.customization'
  /** The VS Code custom-instructions page: the instruction file kinds and their locations. */
  | 'vscode.copilot.instructions'
  /** The VS Code agent-plugins page: plugin formats, marketplace configuration, and local plugin registration. */
  | 'vscode.copilot.plugins'
  /** The VS Code prompt-files page: where prompt files live, their format, and how one is invoked. */
  | 'vscode.copilot.prompts'
  /** The VS Code AI-settings reference: the per-customization location settings. */
  | 'vscode.copilot.settings'
  /** The VS Code agent-skills page: workspace skill locations and progressive loading. */
  | 'vscode.copilot.skills'
  /** The VS Code custom-agents page: workspace agent file locations and structure. */
  | 'vscode.copilot.custom-agents'
  /** The VS Code MCP-servers page: the mcp.json locations, the `servers` schema, and server trust. */
  | 'vscode.copilot.mcp'
  /** The VS Code 1.118 release note adding workspace-root `.mcp.json` and same-name deduplication. */
  | 'vscode.copilot.mcp.workspace-root-release'
  /** The VS Code settings page: the setting scopes and the order they override each other in. */
  /** The VS Code agent-hooks page: the hook file locations, the configuration format, and agent-scoped hooks. */
  | 'vscode.copilot.hooks'
  | 'vscode.settings';

/**
 * Every official documentation page a shipped record cites. A citation names
 * its page by this ID as well as by URL, because the ID is what stays stable
 * when a vendor moves a page — which has already happened once — and it is what
 * the official-sources contract row is keyed by (QR-005).
 */
export type SourceId = AnthropicSourceId | OpenAiSourceId | GitHubSourceId | VsCodeSourceId;

/**
 * Anthropic Claude Code composition strategies
 * (contracts/runtime-composition.md).
 */
export type ClaudeStrategyId =
  /** Claude subagent context composition: a fresh context per custom agent, or the parent conversation for a fork. */
  | 'claude.agent-context.composition'
  /** Claude subagent selection across managed, session, project, User, and plugin scopes; a same-tree duplicate stays unresolved. */
  | 'claude.agents.selection'
  /** Claude command selection: commands share the skill command namespace, a same-name skill wins, and subdirectories namespace the command name. */
  | 'claude.commands.selection'
  /** Claude hook composition: every applicable hook of every active source runs, a closer settings level adding to the broader ones. */
  | 'claude.hooks.additive'
  /** Claude instruction layering: User, ancestor, launch, and lazy descendant files, broad to narrow. */
  | 'claude.instructions.layering'
  /** Claude MCP selection: whole same-name server entries in local, project, User, plugin, connector order. */
  | 'claude.mcp.selection'
  /** Claude output-style selection: the closest project layer's same-name style, then the style settings or session state selected. */
  | 'claude.output-style.selection'
  /** Claude plugin activation: a placement-loaded skills-directory plugin, or a catalog entry a session registers and enables. */
  | 'claude.plugins.activation'
  /** Claude rule layering: User then project rule layers, a `paths` rule activating on a matching read. */
  | 'claude.rules.layering'
  /** Claude settings precedence: managed, then command-line, then local, project, and User scopes, with permission rules of the two project-local files both in effect. */
  | 'claude.settings.precedence'
  /** Claude skill selection across enterprise, User, project, and bundled scopes. */
  | 'claude.skills.selection';

/**
 * OpenAI Codex composition strategies
 * (contracts/runtime-composition.md).
 */
export type CodexStrategyId =
  /** Codex custom-agent inheritance: a spawned session overlays the selected agent file on the parent, live sandbox and approval overrides reapplied. */
  | 'codex.agents.inheritance'
  /** Codex config-layer resolution: closest applicable value wins across User and project layers. */
  | 'codex.config.precedence'
  /** Codex hook composition: every matching hook of every active source runs, file and inline together at one layer. */
  | 'codex.hooks.additive'
  /** Codex instruction layering: per-directory first-non-empty selection, broad-to-narrow. */
  | 'codex.instructions.layering'
  /** Codex MCP configuration: `[mcp_servers.*]` resolved through the config-layer precedence. */
  | 'codex.mcp.configuration'
  /** Codex plugin activation: a catalog exposes a plugin, an installation and an enablement value make it live. */
  | 'codex.plugins.activation'
  /** Codex rule resolution: direct `.rules` files of the active layers, combined restrictively. */
  | 'codex.rules.resolution'
  /** Codex skill selection across Repository, User, admin, and system scopes. */
  | 'codex.skills.discovery';

/**
 * GitHub Copilot composition strategies
 * (contracts/runtime-composition.md). One per skill surface, because the three
 * surfaces document incompatible selection and must not collapse into one
 * statement (FR-009).
 */
export type CopilotStrategyId =
  /** Copilot CLI custom-agent selection: deepest project layer first, `.github` over `.claude`, project-versus-User unresolved. */
  | 'copilot.cli.agents.selection'
  /** Copilot CLI instruction layering with deduplication and no general precedence. */
  | 'copilot.cli.instructions.layering'
  /** Copilot CLI MCP selection: session-additional, plugin, workspace, then User sources. */
  | 'copilot.cli.mcp.selection'
  /** Copilot CLI plugin activation: manifest and catalog recognition order at an established root, then registration and enablement. */
  | 'copilot.cli.plugins.activation'
  /** Copilot CLI settings precedence over the documented defaults/managed/User/Repository/local/environment/flag cascade. */
  | 'copilot.cli.settings.precedence'
  /** Copilot CLI first-found skill selection across its documented source order. */
  | 'copilot.cli.skills.selection'
  /** Copilot cloud custom-agent selection: Repository, then organization, then enterprise, deduplicated by filename. */
  | 'copilot.cloud.agents.selection'
  /** Copilot cloud instruction layering, Repository before organization. */
  | 'copilot.cloud.instructions.layering'
  /** Copilot cloud hosted MCP selection: out-of-box, custom-agent, then repository-settings, later sources overriding. */
  | 'copilot.cloud.mcp.selection'
  /** Copilot cloud plugin activation: authored catalog and settings kept apart from hosted installation and enablement. */
  | 'copilot.cloud.plugins.activation'
  /** Copilot cloud progressive skill loading with unresolved collision behavior. */
  | 'copilot.cloud.skills.selection'
  /** Copilot VS Code custom-agent selection over profiles targeting VS Code, cross-scope duplicates unresolved. */
  | 'copilot.vscode.agents.selection'
  /** Copilot VS Code plugin activation: manifest and catalog recognition order at an established root, then registration, recommendation, and enablement. */
  | 'copilot.vscode.plugins.activation'
  /** Copilot VS Code MCP selection with the 1.118/current-guide location conflict and unknown total order. */
  | 'copilot.vscode.mcp.selection'
  /** Copilot VS Code instruction layering, personal before Repository before organization. */
  | 'copilot.vscode.instructions.layering'
  /** Copilot VS Code settings precedence: workspace scopes above User, with the other documented scopes retained. */
  | 'copilot.vscode.settings.precedence'
  /** Copilot VS Code progressive skill loading with undocumented duplicate precedence. */
  | 'copilot.vscode.skills.selection'
  /** Copilot CLI hook composition: every applicable source's hooks for the event, in the documented append order. */
  | 'copilot.cli.hooks.composition'
  /** Copilot cloud-agent hook composition over the repository hook files the ephemeral clone holds. */
  | 'copilot.cloud.hooks.composition'
  /** Copilot VS Code hook composition: workspace over User for one event, with agent and plugin hooks in addition. */
  | 'copilot.vscode.hooks.composition';

/**
 * Every documented runtime composition or projection strategy. Each vendor's
 * sub-union joins here, and the strategy registry is keyed by it.
 */
export type StrategyId = ClaudeStrategyId | CodexStrategyId | CopilotStrategyId;

/**
 * Anthropic Claude Code inspection rules
 * (contracts/vendors/claude-code.md § Repository Inspector matchers). Rules
 * arrive with the inventory phase that needs them.
 */
export type ClaudeRuleId =
  /** Repository Claude subagents under the root's own `.claude/agents/` subtree; read-authorizing `static-candidate`. */
  | 'claude.repo.agent'
  /** Repository Claude command files under the root's own `.claude/commands/`; read-authorizing `static-candidate`. */
  | 'claude.repo.command'
  /** The `hooks` an accepted root settings file contains; read-authorizing `static-candidate`. */
  | 'claude.repo.hooks.settings'
  /** Repository Claude instructions at every depth; read-authorizing `static-candidate`. */
  | 'claude.repo.instructions'
  /** The repository's own plugin catalog at `.claude-plugin/marketplace.json`; read-authorizing `static-candidate`. */
  | 'claude.repo.marketplace'
  /** The exact root `.mcp.json` MCP declaration carrier; read-authorizing `static-candidate`. */
  | 'claude.repo.mcp'
  /** Repository Claude output styles under the root's own `.claude/output-styles/`; read-authorizing `static-candidate`. */
  | 'claude.repo.output-style'
  /** The permission policy the root Claude settings files declare; read-authorizing `static-candidate`. */
  | 'claude.repo.permissions'
  /** Repository Claude rule files under any `.claude/rules/` subtree; read-authorizing `static-candidate`. */
  | 'claude.repo.rules'
  /** The root Claude settings files read as the project settings documents; read-authorizing `static-candidate`. */
  | 'claude.repo.settings'
  /** Repository Claude skills; read-authorizing `static-candidate`. */
  | 'claude.repo.skill'
  /** The manifest that makes a skills-directory folder a plugin; read-authorizing `static-candidate`. */
  | 'claude.repo.skills-directory-plugin'
  /** The plugin component paths no rule admits; non-read `excluded`. */
  | 'claude.excluded.plugin-files'
  /** Every Claude User surface but the consented instruction file, on record as excluded and admitted by nothing. */
  | 'claude.excluded.user-runtime'
  /** Personal Claude subagents, recursive Markdown under the consented boundary's `agents/`; read-authorizing `static-candidate`. */
  | 'claude.global.agent'
  /** Personal Claude command files, recursive Markdown under the consented boundary's `commands/`; read-authorizing `static-candidate`. */
  | 'claude.global.command'
  /** The `hooks` the consented user settings document contains; read-authorizing `static-candidate`. */
  | 'claude.global.hooks.settings'
  /** The consented Claude Global `CLAUDE.md` under `<claude-config-dir>`; read-authorizing `static-candidate`. */
  | 'claude.global.instructions'
  /** Personal Claude output styles `output-styles/*.md` below the consented Claude boundary; read-authorizing `static-candidate`. */
  | 'claude.global.output-style'
  /** The permission policy the consented user settings document declares; read-authorizing `static-candidate`. */
  | 'claude.global.permissions'
  /** Personal Claude rule files `rules/*.md` below the consented Claude boundary; read-authorizing `static-candidate`. */
  | 'claude.global.rules'
  /** The consented user `settings.json` read as the settings document; read-authorizing `static-candidate`. */
  | 'claude.global.settings'
  /** Personal Claude skills `skills/<name>/SKILL.md` below the consented Claude boundary; read-authorizing `static-candidate`. */
  | 'claude.global.skill';

/**
 * OpenAI Codex inspection rules
 * (contracts/vendors/openai-codex.md § Inspector Repository rules). Rules
 * arrive with the inventory phase that needs them.
 */
export type CodexRuleId =
  /** Configured instruction fallback basenames, seeded by the pinned `.codex/config.toml` path. */
  | 'codex.derived.fallback-basename'
  /** The plugin content a manifest or a catalog points at, on record as excluded and admitted by nothing. */
  | 'codex.excluded.plugin-files'
  /** Every Codex User surface no Global rule admits, on record as excluded and admitted by nothing. */
  | 'codex.excluded.user-runtime'
  /** Personal Codex custom agents as direct-child TOML of the consented boundary's `agents/`; read-authorizing `static-candidate`. */
  | 'codex.global.agent'
  /** The personal plugin marketplace `plugins/marketplace.json` below the consented shared agent home (FR-045); read-authorizing `static-candidate`. */
  | 'codex.global.agents-home.marketplace'
  /** Personal skills `skills/<name>/SKILL.md` below the consented shared agent home (FR-045); read-authorizing `static-candidate`. */
  | 'codex.global.agents-home.skill'
  /** The consented-boundary-exact `config.toml` MCP carrier; read-authorizing `static-candidate`. */
  | 'codex.global.config'
  /** The consented-boundary-exact `hooks.json` standalone hook carrier; read-authorizing `static-candidate`. */
  | 'codex.global.hooks'
  /** The consented-boundary-exact `config.toml` read for the inline `[hooks]` table it contains; read-authorizing `static-candidate`. */
  | 'codex.global.hooks.inline'
  /** The consented Codex Global instruction fallback under `<CODEX_HOME>`; read-authorizing `static-candidate`. */
  | 'codex.global.instructions'
  /** Personal deprecated Codex prompts `prompts/*.md` below the consented boundary; read-authorizing `static-candidate`. */
  | 'codex.global.prompts'
  /** Personal Codex rule files `rules/*.rules` below the consented boundary, recognized as `permissions`; read-authorizing `static-candidate`. */
  | 'codex.global.rules'
  /** The consented-boundary-exact `config.toml` read as the user settings document; read-authorizing `static-candidate`. */
  | 'codex.global.settings'
  /** Repository Codex custom agents as direct-child TOML of the root's `.codex/agents/`; read-authorizing `static-candidate`. */
  | 'codex.repo.agent'
  /** The root-exact `.codex/config.toml` MCP carrier; read-authorizing `static-candidate`. */
  | 'codex.repo.config'
  /** The root-exact `.codex/hooks.json` standalone hook carrier; read-authorizing `static-candidate`. */
  | 'codex.repo.hooks'
  /** The root-exact `.codex/config.toml` read for the inline `[hooks]` table it contains; read-authorizing `static-candidate`. */
  | 'codex.repo.hooks.inline'
  /** Repository Codex instructions at the exact root override/regular pair; read-authorizing `static-candidate`. */
  | 'codex.repo.instructions'
  /** The exact Repository-root Codex plugin catalogs, whose entries name the plugins they resolve; read-authorizing `static-candidate`. */
  | 'codex.repo.marketplace'
  /** Repository Codex rule files as direct children of the root layer's `.codex/rules/`; read-authorizing `static-candidate`. */
  | 'codex.repo.rules'
  /** The root-exact `.codex/config.toml` read as the project settings document; read-authorizing `static-candidate`. */
  | 'codex.repo.settings'
  /** Repository Codex skills; read-authorizing `static-candidate`. */
  | 'codex.repo.skill';

/**
 * GitHub Copilot inspection rules
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 * Rules arrive with the inventory phase that needs them.
 */
export type CopilotRuleId =
  /** VS Code `.claude` instruction locations and non-root CLI alternatives left out of this release. */
  | 'copilot.excluded.additional-standard-locations'
  /** Root direct-child Copilot custom agents under `.github/agents/`, which all three surfaces read; read-authorizing `static-candidate`. */
  | 'copilot.repo.agent'
  /** The repository's own plugin catalog, at the four documented marketplace locations; read-authorizing `static-candidate`. */
  | 'copilot.repo.marketplace'
  /** Root direct-child Copilot custom agents under `.claude/agents/`, which the editor and CLI surfaces read and the Cloud agent does not; read-authorizing `static-candidate`. */
  | 'copilot.repo.agent.claude'
  /** The CLI's experimental `.github/extensions/` project extensions, which are never plugin candidates. */
  | 'copilot.excluded.cli-extensions'
  /** The CLI's documented `.github/lsp.json`, left out of this release's read allowlist. */
  | 'copilot.excluded.cli-lsp'
  /** Runtime-supplied instruction and skill roots that never become scan roots. */
  | 'copilot.excluded.extra-directories'
  /** VS Code's general workspace `.vscode/settings.json`, left out of this release's read allowlist. */
  | 'copilot.excluded.vscode-settings'
  /** The Copilot user surfaces no Global rule admits — profile files, another tool's home, installed state — on record as excluded. */
  | 'copilot.excluded.user-runtime'
  /** Personal custom agents `agents/*.agent.md` below the consented `COPILOT_HOME`; read-authorizing `static-candidate`. */
  | 'copilot.global.agent'
  /** Personal skills `skills/<name>/SKILL.md` below the consented shared agent home (FR-045); read-authorizing `static-candidate`. */
  | 'copilot.global.agents-home.skill'
  /** User-level hook files `hooks/*.json` below the consented `COPILOT_HOME`; read-authorizing `static-candidate`. */
  | 'copilot.global.hooks'
  /** The inline `hooks` field of the consented user `settings.json`; read-authorizing `static-candidate`. */
  | 'copilot.global.hooks.inline'
  /** The consented `<COPILOT_HOME>/copilot-instructions.md`; read-authorizing `static-candidate`. */
  | 'copilot.global.instructions.root'
  /** Files ending `.instructions.md` at any depth below the consented `COPILOT_HOME` `instructions/` directory; read-authorizing `static-candidate`. */
  | 'copilot.global.instructions.path'
  /** The user-level MCP carrier `mcp-config.json` below the consented `COPILOT_HOME`; read-authorizing `static-candidate`. */
  | 'copilot.global.mcp'
  /** The consented user `settings.json`, the user layer of the documented settings cascade; read-authorizing `static-candidate`. */
  | 'copilot.global.settings'
  /** Personal skills `skills/<name>/SKILL.md` below the consented `COPILOT_HOME`; read-authorizing `static-candidate`. */
  | 'copilot.global.skill'
  /** Root direct-child Copilot CLI command files under `.claude/commands/`; read-authorizing `static-candidate`. */
  | 'copilot.repo.command'
  /** Root direct-child Copilot VS Code prompt files under `.github/prompts/`; read-authorizing `static-candidate`. */
  | 'copilot.repo.prompt'
  /** Repository `AGENTS.md` at every depth; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.agents'
  /** The root `CLAUDE.md` agent-instruction alternative; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.claude-root'
  /** The root `GEMINI.md` agent-instruction alternative; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.gemini-root'
  /** Root-exact `.github/instructions` path instructions; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.path'
  /** CLI-context `.github/instructions` path instructions; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.path-cli-context'
  /** The root-exact `.github/copilot-instructions.md`; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.repository'
  /** CLI-context `.github/copilot-instructions.md`; read-authorizing `static-candidate`. */
  | 'copilot.repo.instructions.repository-cli-context'
  /** The two root-exact CLI workspace MCP carriers `.mcp.json` and `.github/mcp.json`; read-authorizing `static-candidate`. */
  | 'copilot.repo.mcp'
  /** The dedicated VS Code `.vscode/mcp.json` carrier; read-authorizing `static-candidate`. */
  | 'copilot.repo.mcp.vscode'
  /** The VS Code 1.118+ root `.mcp.json` path/surface provenance; read-authorizing `static-candidate`. */
  | 'copilot.repo.mcp.vscode-root'
  /** The supported Copilot and Claude-compatible root settings documents; read-authorizing `static-candidate`. */
  | 'copilot.repo.settings'
  /** Repository Copilot skills in the three fixed directories; read-authorizing `static-candidate`. */
  | 'copilot.repo.skill'
  /** Root direct-child Copilot hook files under `.github/hooks/`, which all three surfaces read; read-authorizing `static-candidate`. */
  | 'copilot.repo.hooks'
  /** The inline `hooks` block of the CLI's own root settings documents; read-authorizing `static-candidate`. */
  | 'copilot.repo.hooks.settings'
  /** The inline `hooks` block of the Claude-format root settings documents, which the CLI and the editor both read; read-authorizing `static-candidate`. */
  | 'copilot.repo.hooks.settings.claude';

/**
 * Cross-vendor inspection rules: policy no single vendor owns. Exactly one
 * exists — the shared non-read exclusion over managed, organization, hosted,
 * and remote state (contracts/runtime-composition.md § Shared non-read
 * exclusions).
 */
export type SharedRuleId =
  /** Managed, organization, hosted, remote, and state surfaces across vendors, on record as excluded and admitted by nothing. */
  'shared.excluded.managed-remote-state';

/**
 * Every Inspector policy rule. Each vendor's sub-union joins here, and the
 * rule registry is keyed by it. This union is therefore the complete list of
 * rules that can authorize a read.
 */
export type RuleId = ClaudeRuleId | CodexRuleId | CopilotRuleId | SharedRuleId;
