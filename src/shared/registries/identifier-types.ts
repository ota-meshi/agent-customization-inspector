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
  /** Claude instruction discovery in each directory above the runtime `cwd`, toward the filesystem root. */
  | 'claude.behavior.repo.instructions.ancestor'
  /** Claude instruction discovery in a subdirectory of the runtime `cwd`, on demand. */
  | 'claude.behavior.repo.instructions.descendant'
  /** Claude instruction discovery in the exact runtime `cwd`, at session start. */
  | 'claude.behavior.repo.instructions.launch'
  /** Claude project MCP declarations at `<project-root>/.mcp.json`. */
  | 'claude.behavior.repo.mcp'
  /** Claude plugin content at an explicitly selected `<plugin-root>`; a non-authorizing MCP-selection input. */
  | 'claude.behavior.repo.plugin'
  /** Claude Repository skill discovery under `.claude/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.repo.skills'
  /** Claude User instructions at `<claude-config-dir>/CLAUDE.md`. */
  | 'claude.behavior.user.instructions'
  /** Claude User and per-project local MCP state at `<home>/.claude.json`; a non-authorizing fact. */
  | 'claude.behavior.user.mcp-state'
  /** Claude installed plugin data under `<claude-config-dir>/plugins/`; a non-authorizing fact. */
  | 'claude.behavior.user.plugins'
  /** Claude User skill discovery under `<claude-config-dir>/skills/<skill-name>/SKILL.md`. */
  | 'claude.behavior.user.skills';

/**
 * OpenAI Codex behavior statements
 * (contracts/vendors/openai-codex.md). Statements arrive with the inventory
 * phase that needs them.
 */
export type CodexBehaviorId =
  /** Codex project configuration layers at `.codex/config.toml`. */
  | 'codex.behavior.repo.config'
  /** Codex hooks in every active trusted config layer: `.codex/hooks.json` and inline `[hooks]`. */
  | 'codex.behavior.repo.hooks'
  /** Codex per-directory project instruction lookup: override, regular, then configured fallbacks. */
  | 'codex.behavior.repo.instructions'
  /** Codex MCP server declarations: `[mcp_servers.*]` inside active `.codex/config.toml` layers. */
  | 'codex.behavior.repo.mcp'
  /** Codex Repository skill discovery under `.agents/skills/<name>/SKILL.md`. */
  | 'codex.behavior.repo.skills'
  /** Codex User configuration at `<CODEX_HOME>/config.toml`; a non-authorizing carrier fact. */
  | 'codex.behavior.user.config'
  /** Codex User instruction fallback at `<CODEX_HOME>/AGENTS.override.md` then `AGENTS.md`. */
  | 'codex.behavior.user.instructions'
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
  /** Copilot CLI workspace MCP declarations: `.mcp.json` and `.github/mcp.json` on each ancestor. */
  | 'copilot.behavior.cli.mcp'
  /** Copilot CLI Repository skill discovery in the three fixed skills directories. */
  | 'copilot.behavior.cli.skills'
  /** Copilot CLI User path instructions below `<COPILOT_HOME>/instructions`. */
  | 'copilot.behavior.cli.user.instructions.path'
  /** Copilot CLI User instructions at `<COPILOT_HOME>/copilot-instructions.md`. */
  | 'copilot.behavior.cli.user.instructions.root'
  /** Copilot CLI User MCP configuration at `<COPILOT_HOME>/mcp-config.json`; a non-authorizing fact. */
  | 'copilot.behavior.cli.user.mcp'
  /** Copilot CLI User skill discovery under `~/.copilot/skills` and `~/.agents/skills`. */
  | 'copilot.behavior.cli.user.skills'
  /** Copilot cloud agent `AGENTS.md` discovery over the repository tree. */
  | 'copilot.behavior.cloud.instructions.agents'
  /** Copilot cloud agent root-only `CLAUDE.md` and `GEMINI.md` agent-instruction alternatives. */
  | 'copilot.behavior.cloud.instructions.alternatives'
  /** Copilot cloud agent path-specific instructions below the root `.github/instructions`. */
  | 'copilot.behavior.cloud.instructions.path'
  /** Copilot cloud agent repository-wide `.github/copilot-instructions.md` at the repository root. */
  | 'copilot.behavior.cloud.instructions.repository'
  /** Copilot cloud agent's hosted organization instructions; no filesystem locator. */
  | 'copilot.behavior.cloud.organization-instructions'
  /** Copilot cloud agent's hosted remote-skill relay; no filesystem locator. */
  | 'copilot.behavior.cloud.remote-skills'
  /** Copilot cloud agent Repository skill discovery at the repository root. */
  | 'copilot.behavior.cloud.skills'
  /** Copilot VS Code custom-agent discovery in the workspace `.github/agents` and `.claude/agents` directories. */
  | 'copilot.behavior.vscode.agents'
  /** Copilot VS Code `AGENTS.md` discovery; the nested tier is experimental. */
  | 'copilot.behavior.vscode.instructions.agents'
  /** Copilot VS Code `CLAUDE.md` compatibility locations at the workspace root. */
  | 'copilot.behavior.vscode.instructions.claude'
  /** Copilot VS Code path-specific instructions below its instruction locations. */
  | 'copilot.behavior.vscode.instructions.path'
  /** Copilot VS Code repository-wide `.github/copilot-instructions.md` at the workspace root. */
  | 'copilot.behavior.vscode.instructions.repository'
  /** Copilot VS Code workspace MCP configuration: `.vscode/mcp.json`, and root `.mcp.json` for 1.118+. */
  | 'copilot.behavior.vscode.mcp'
  /** Copilot VS Code Repository skill discovery at the workspace root. */
  | 'copilot.behavior.vscode.skills'
  /** Copilot VS Code User `~/.claude/CLAUDE.md` personal instructions. */
  | 'copilot.behavior.vscode.user.claude'
  /** Copilot VS Code User instruction locations in home and profile data. */
  | 'copilot.behavior.vscode.user.instructions'
  /** Copilot VS Code User MCP configuration in the profile's own `mcp.json`. */
  | 'copilot.behavior.vscode.user.mcp'
  /** Copilot VS Code User skill discovery in home and profile locations. */
  | 'copilot.behavior.vscode.user.skills';

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
  /** The plugins reference: component scopes and skills-directory plugins. */
  | 'anthropic.claude-code.plugins.components-scopes'
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
  /** The Codex hooks page: where hooks live, their config shape, and their review gate. */
  | 'openai.codex.hooks'
  /** The Codex MCP page: how MCP servers are declared and connected. */
  | 'openai.codex.mcp'
  /** The Codex skills page: where Codex loads local skills, and their metadata. */
  | 'openai.codex.skills';

/**
 * GitHub official documentation pages cited by the shipped records
 * (contracts/official-sources.md § GitHub official sources).
 */
export type GitHubSourceId =
  /** The Copilot CLI custom-instructions how-to: the CLI instruction kinds and their locations. */
  | 'github.copilot.cli.instructions'
  /** The Copilot CLI MCP how-to: the per-repository carrier files and their two declaration schemas. */
  | 'github.copilot.cli.mcp'
  /** The Copilot CLI command reference: skill locations, legacy commands, and their order. */
  | 'github.copilot.cli.reference'
  /** The cloud-agent repository-instructions how-to: root, path-specific, and alternative files. */
  | 'github.copilot.cloud.instructions'
  /** The custom-instructions support matrix: which instruction file each surface reads. */
  | 'github.copilot.instructions.support'
  /** The Copilot agent-skills page: cloud skill discovery, usage, and shared skills. */
  | 'github.copilot.skills'
  /** The custom-agents configuration reference: the shared agent profile format, contained MCP included. */
  | 'github.copilot.custom-agents';

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
  /** The VS Code AI-settings reference: the per-customization location settings. */
  | 'vscode.copilot.settings'
  /** The VS Code agent-skills page: workspace skill locations and progressive loading. */
  | 'vscode.copilot.skills'
  /** The VS Code custom-agents page: workspace agent file locations and structure. */
  | 'vscode.copilot.custom-agents'
  /** The VS Code MCP-servers page: the mcp.json locations, the `servers` schema, and server trust. */
  | 'vscode.copilot.mcp'
  /** The VS Code 1.118 release note adding workspace-root `.mcp.json` and same-name deduplication. */
  | 'vscode.copilot.mcp.workspace-root-release';

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
  /** Claude instruction layering: User, ancestor, launch, and lazy descendant files, broad to narrow. */
  | 'claude.instructions.layering'
  /** Claude MCP selection: whole same-name server entries in local, project, User, plugin, connector order. */
  | 'claude.mcp.selection'
  /** Claude skill selection across enterprise, User, project, and bundled scopes. */
  | 'claude.skills.selection';

/**
 * OpenAI Codex composition strategies
 * (contracts/runtime-composition.md).
 */
export type CodexStrategyId =
  /** Codex config-layer resolution: closest applicable value wins across User and project layers. */
  | 'codex.config.precedence'
  /** Codex instruction layering: per-directory first-non-empty selection, broad-to-narrow. */
  | 'codex.instructions.layering'
  /** Codex MCP configuration: `[mcp_servers.*]` resolved through the config-layer precedence. */
  | 'codex.mcp.configuration'
  /** Codex skill selection across Repository, User, admin, and system scopes. */
  | 'codex.skills.discovery';

/**
 * GitHub Copilot composition strategies
 * (contracts/runtime-composition.md). One per skill surface, because the three
 * surfaces document incompatible selection and must not collapse into one
 * statement (FR-009).
 */
export type CopilotStrategyId =
  /** Copilot CLI instruction layering with deduplication and no general precedence. */
  | 'copilot.cli.instructions.layering'
  /** Copilot CLI MCP selection: session-additional, plugin, workspace, then User sources. */
  | 'copilot.cli.mcp.selection'
  /** Copilot CLI first-found skill selection across its documented source order. */
  | 'copilot.cli.skills.selection'
  /** Copilot cloud instruction layering, Repository before organization. */
  | 'copilot.cloud.instructions.layering'
  /** Copilot cloud progressive skill loading with unresolved collision behavior. */
  | 'copilot.cloud.skills.selection'
  /** Copilot VS Code MCP selection with the 1.118/current-guide location conflict and unknown total order. */
  | 'copilot.vscode.mcp.selection'
  /** Copilot VS Code instruction layering, personal before Repository before organization. */
  | 'copilot.vscode.instructions.layering'
  /** Copilot VS Code progressive skill loading with undocumented duplicate precedence. */
  | 'copilot.vscode.skills.selection';

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
  /** Repository Claude instructions at every depth; read-authorizing `static-candidate`. */
  | 'claude.repo.instructions'
  /** The exact root `.mcp.json` MCP declaration carrier; read-authorizing `static-candidate`. */
  | 'claude.repo.mcp'
  /** Repository Claude skills; read-authorizing `static-candidate`. */
  | 'claude.repo.skill';

/**
 * OpenAI Codex inspection rules
 * (contracts/vendors/openai-codex.md § Inspector Repository rules). Rules
 * arrive with the inventory phase that needs them.
 */
export type CodexRuleId =
  /** Configured instruction fallback basenames, seeded by the pinned `.codex/config.toml` path. */
  | 'codex.derived.fallback-basename'
  /** The root-exact `.codex/config.toml` MCP carrier; read-authorizing `static-candidate`. */
  | 'codex.repo.config'
  /** Repository Codex instructions at the exact root override/regular pair; read-authorizing `static-candidate`. */
  | 'codex.repo.instructions'
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
  /** Runtime-supplied instruction and skill roots that never become scan roots. */
  | 'copilot.excluded.extra-directories'
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
  /** Repository Copilot skills in the three fixed directories; read-authorizing `static-candidate`. */
  | 'copilot.repo.skill';

/**
 * Every Inspector policy rule. Each vendor's sub-union joins here, and the
 * rule registry is keyed by it. This union is therefore the complete list of
 * rules that can authorize a read.
 */
export type RuleId = ClaudeRuleId | CodexRuleId | CopilotRuleId;
