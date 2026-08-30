// OpenAI Codex behavior statements — the implementation counterpart of
// contracts/vendors/openai-codex.md § Documented Repository behavior and
// § Documented User behavior.
//
// A statement says where Codex documents looking for a customization. It is
// not a filesystem matcher and can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"); read authority lives only in the inspection-rule
// registry. Statements arrive with the inventory phase that needs them, so
// this catalog is closed but incomplete by design.
//
// Each statement is its own `export const` so a relation can name it directly.
// The keyed map at the end exists for the aggregate and for lookups by ID; it
// restates nothing.
// Each record is declared with `satisfies` rather than a type annotation, and
// the keyed map below uses `[RECORD.<id>]` as its key. An annotation would
// widen the ID to the whole closed union and the computed key would stop
// resolving to a property, which breaks the map's completeness check;
// `satisfies` keeps the literal, so the key cannot disagree with the record it
// points at.
import { SHIPS_MAINTENANCE_DATA } from '../maintenance-data';
import type { CodexBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Codex per-directory project instruction lookup: at each directory of the
 * chain between the project root and the runtime `cwd`, local clients select
 * the first non-empty file in the documented filename order —
 * `AGENTS.override.md`, then `AGENTS.md`, then the configured fallback
 * basenames — and stop concatenating at the upstream-configured byte budget.
 * The chain is built once at session start and stops at the `cwd`, so a
 * nested instruction file participates only in sessions whose `cwd` sits at
 * or below it; without a detectable project root only the current directory
 * is checked.
 *
 * The vendor documents the walk root-to-`cwd`, broad to narrow. The locator's
 * traversal names the same chain from its other end — the closed vocabulary
 * expresses an upward chain bounded at the repository root, and a walk's
 * direction changes which file wins, never which directories are on the
 * chain — so the selection order lives on `codex.instructions.layering`,
 * which is the record that owns ordering (FR-009).
 *
 * The configured fallback basenames come from `.codex/config.toml`: the
 * configuration-read stage takes them from that file — a configuration input
 * this product never publishes — and scans them as `instructions` candidates
 * under `codex.derived.fallback-basename` (T1089/T1090), while this
 * statement records only what Codex documents.
 */
export const CODEX_REPO_INSTRUCTIONS_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.instructions',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'AGENTS.override.md; AGENTS.md; configured fallback basenames',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.agents-md',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['How Codex discovers guidance', 'Customize fallback filenames'],
          reviewedOn: '2026-08-27',
          establishes:
            'Local Codex clients build the instruction chain once at session start, walking the project root down to the runtime cwd and stopping there — without a detectable project root only the current directory is checked — selecting at most one file per directory: AGENTS.override.md, then AGENTS.md, then the configured fallback basenames. Those basenames and the project-document byte budget are themselves configuration values, declared as project_doc_fallback_filenames and project_doc_max_bytes, so which names the walk accepts depends on configuration outside the instruction files themselves.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex project configuration layers: every trusted `.codex/config.toml` from
 * the project root down to the runtime `cwd`, closest value winning per key.
 *
 * The documented lookup behind the configuration file the fallback
 * derivation reads as its seed (T1089/T1090). A non-authorizing statement of
 * its own: what admits the file is `codex.repo.config`, whose MCP rows are
 * the servers it declares, and `codex.repo.settings`, whose row is the file
 * itself and whose detail serves the complete document (FR-007). All three
 * share one read of the one physical file.
 */
export const CODEX_REPO_CONFIG_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.config',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.codex/config.toml',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'Local clients load every trusted project .codex/config.toml layer from the project root down to the runtime cwd, and the closest applicable value wins for the same key; marking a project untrusted skips its project-scoped layers entirely.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex config-contained hooks: every active trusted project config layer can
 * carry a standalone `.codex/hooks.json` and an inline `[hooks]` table in its
 * `.codex/config.toml`, all matching hooks additive across layers.
 *
 * The statement three rules rest on: `codex.repo.config`, whose carrier can
 * contain the inline `[hooks]` table, `codex.repo.hooks.inline`, which
 * recognizes that table, and `codex.repo.hooks`, which admits the standalone
 * file. Recording the documented fact grants no execution authority of its
 * own — inspection runs no declared handler (FR-020), and whether a layer is
 * trusted or a hook reviewed is runtime this tool never observes
 * (contracts/vendors/openai-codex.md § Documented Repository behavior).
 */
export const CODEX_REPO_HOOKS_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.hooks',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        // The documented lookup reads each already-active config layer rather
        // than walking directories itself, so the base is the layer and the
        // statement carries no traversal of its own: which layers are active
        // is `codex.behavior.repo.config`'s chain.
        lookupBase: 'active-config-layer',
        relativeSelector: '.codex/hooks.json; inline [hooks] in .codex/config.toml',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.hooks',
          url: 'https://learn.chatgpt.com/docs/hooks.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex looks for hooks', 'Config shape'],
          reviewedOn: '2026-08-27',
          establishes:
            'Each active trusted project layer contributes hooks from its .codex/hooks.json and from an inline [hooks] table in its .codex/config.toml; all matching hooks are additive, and a file and inline table at one layer are both loaded with a warning.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'The active project config layers the hook lookup reads are the trusted .codex/config.toml files from the project root down to the runtime cwd.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User hooks: the user config layer's own `<CODEX_HOME>/hooks.json` and
 * the inline `[hooks]` table in `<CODEX_HOME>/config.toml`, which contribute
 * hooks additively beside every project and plugin source.
 *
 * Recorded for maintenance and for the additive strategy that composes it;
 * it expands no Global inspection, and `codex.excluded.user-runtime` keeps the
 * surface out of the read allowlist (contracts/vendors/openai-codex.md
 * § Documented User behavior). The page states this layer keeps contributing
 * in an untrusted project, where the project layer contributes nothing — a
 * documented runtime fact that authorizes no read here.
 */
export const CODEX_USER_HOOKS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.hooks',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'hooks.json; inline [hooks] in config.toml',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.hooks',
          url: 'https://learn.chatgpt.com/docs/hooks.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex looks for hooks'],
          reviewedOn: '2026-08-27',
          establishes:
            'The user layer contributes hooks from ~/.codex/hooks.json and from an inline [hooks] table in ~/.codex/config.toml, and keeps contributing them in an untrusted project where the project layer does not.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex MCP server declarations: `[mcp_servers.*]` tables inside the active
 * `.codex/config.toml` layers, resolved through the ordinary config-layer
 * precedence; project layers require trust.
 *
 * The documented behavior the `codex.repo.config` rule's contained MCP
 * recognition rests on. It says where Codex documents declaring servers and
 * never that one is enabled, trusted, or connected: whether a declared server
 * is used depends on runtime inputs this tool never observes, and inspection
 * never connects (FR-009; contracts/runtime-composition.md
 * § codex.mcp.configuration).
 */
export const CODEX_REPO_MCP_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.mcp',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        // Declarations live inside the already-active config layers; the
        // layer chain itself is `codex.behavior.repo.config`'s statement, so
        // this one records no walk of its own.
        lookupBase: 'active-config-layer',
        relativeSelector: '[mcp_servers.*] inside .codex/config.toml',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.mcp',
          url: 'https://learn.chatgpt.com/docs/extend/mcp.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Connect Codex to an MCP server'],
          reviewedOn: '2026-08-27',
          establishes:
            'MCP servers are declared as named [mcp_servers.*] tables in the Codex configuration file, one table per server.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            'MCP declarations follow the same config-layer resolution as every other configuration value, and project-scoped layers apply only when the project is trusted.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex rule files: every active trusted project config layer contributes the
 * `.rules` files in its own `rules/` directory, scanned at startup.
 *
 * A rule declares a `prefix_rule()` deciding whether a matching command may
 * run outside the sandbox. Recording where Codex looks for one grants no
 * execution, approval, or sandbox authority: this product reads a rule file as
 * text and evaluates nothing it declares.
 *
 * `partially-documented`: the page names the layer's `rules/` directory but
 * establishes no nested-subdirectory recursion
 * (contracts/vendors/openai-codex.md § Known uncertainties, item 2). The
 * `[experimental]` qualifier rests on the page's own words: the statement is
 * in the preamble under the page title, which is why the citation names that
 * title beside the section the lookup rests on.
 *
 * The base is the already-active config layer rather than a directory walk of
 * its own, exactly as the hook and MCP statements record it: which layers are
 * active is `codex.behavior.repo.config`'s chain, and a project layer applies
 * only when the project is trusted.
 */
export const CODEX_REPO_RULES_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.rules',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'active-config-layer',
        relativeSelector: 'rules/*.rules',
        traversal: 'none',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.rules',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/rules.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Rules', 'Create a rules file'],
          reviewedOn: '2026-08-27',
          establishes:
            "The page's own preamble states the feature is experimental and may change. Codex scans rules/ under every active config layer at startup, a project layer's rules under <repo>/.codex/rules/ loading only when that .codex/ layer is trusted; the page names the layer's own rules/ directory and establishes no nested-subdirectory recursion.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User configuration: `<CODEX_HOME>/config.toml` and profile files,
 * shared by every local client and resolved through the same precedence as
 * the project layers.
 *
 * A non-authorizing carrier fact: what a consented home's copy of this file
 * is read as is `codex.global.config`'s and `codex.global.settings`'s to
 * say, and what is left out beside it is `codex.excluded.user-runtime`'s.
 * This statement records the documented cascade the precedence strategy
 * composes, and authorizes nothing itself
 * (contracts/vendors/openai-codex.md § Documented User behavior).
 */
export const CODEX_USER_CONFIG_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.config',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'config.toml',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-27',
          establishes:
            "User configuration lives at the Codex home directory's config.toml (~/.codex/config.toml by default), the CLI and IDE extension share those configuration layers, and its values resolve through the same precedence as the trusted project layers.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User instruction fallback: `<CODEX_HOME>/AGENTS.override.md`,
 * otherwise `<CODEX_HOME>/AGENTS.md`, with the first non-empty global
 * candidate preceding the project chain.
 *
 * Recorded for maintenance and for the layering strategy that composes it; it
 * expands no Global inspection, and the only rule that will ever read the
 * surface is the consent-gated `codex.global.instructions`
 * (contracts/vendors/openai-codex.md § Documented User behavior).
 */
export const CODEX_USER_INSTRUCTIONS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.instructions',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'AGENTS.override.md; AGENTS.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.agents-md',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/agents-md.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['How Codex discovers guidance'],
          reviewedOn: '2026-08-27',
          establishes:
            'Local Codex clients read a global instruction fallback at <CODEX_HOME>/AGENTS.override.md, otherwise <CODEX_HOME>/AGENTS.md, and the first non-empty global candidate precedes the project chain.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User rule files: the user config layer at `<CODEX_HOME>/rules/`, which
 * the same startup scan reads as an active layer.
 *
 * Recorded for maintenance and for the resolution strategy that composes it;
 * it expands no Global inspection, and `codex.excluded.user-runtime` keeps the
 * surface out of the read allowlist (contracts/vendors/openai-codex.md
 * § Documented User behavior).
 *
 * `partially-documented` for the same reason the project statement is: one
 * sentence describes the startup scan of `rules/` for the user layer and the
 * project layers alike, so it leaves nested-subdirectory recursion
 * unspecified for both, and this record's `rules/*.rules` claims the direct
 * children the sentence names. The `[experimental]` qualifier is the
 * page's own, stated in the preamble under the page title, which the citation
 * names beside the section the lookup rests on.
 */
export const CODEX_USER_RULES_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.rules',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'rules/*.rules',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.rules',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/rules.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Rules', 'Create a rules file'],
          reviewedOn: '2026-08-27',
          establishes:
            "The page's own preamble states the feature is experimental and may change. The user layer at ~/.codex/rules/ is one of the active config layers the startup scan reads, and the TUI allow-list flow writes to ~/.codex/rules/default.rules.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex Repository skill discovery: local clients scan each directory on the
 * upward chain from the runtime `cwd` to the repository root and do not merge
 * same-name skills.
 *
 * The walk stops at the nearest ancestor holding a project-root marker. The
 * marker list is `project_root_markers` in the user's `config.toml`, defaulting
 * to `.git`; an empty list disables root detection so the chain is the working
 * directory alone. That file lives outside every inspected Source, so the
 * override is an unresolved runtime input (`repository-root`) rather than
 * something the Inspector reads.
 */
export const CODEX_REPO_SKILLS_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.skills',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.agents/skills/<name>/SKILL.md',
        // The documented lookup walks the runtime `cwd` up to the repository root.
        // The Inspector's own rule is anchored at the selected root instead, because
        // that root *is* the repository root the walk terminates at (FR-001), so one
        // layer of the chain is in scope. The two still live in separate registries
        // because this field records what the vendor does, never what the Inspector
        // may read (FR-003).
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.skills',
          url: 'https://learn.chatgpt.com/docs/build-skills.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex loads local skills'],
          reviewedOn: '2026-08-27',
          establishes:
            'Local Codex clients discover repository skills at .agents/skills/<name>/SKILL.md, scanning each directory on the chain from the runtime working directory to the repository root, and do not merge same-name skills.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User skill discovery. Recorded for maintenance only: it expands no
 * Global inspection, and `codex.excluded.user-runtime` keeps the surface out
 * of the read allowlist (FR-015 through FR-018).
 */
export const CODEX_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.skills',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `$HOME/.agents/skills`, not the Codex home: no cited page documents an
        // override that relocates the separate `$HOME/.agents` directories
        // (contracts/vendors/openai-codex.md § Documented User behavior). That
        // makes the base the user's profile data rather than `tool-home`, the
        // selector relative to it, and the traversal exact — the page names one
        // fixed location, not a chain to search.
        lookupBase: 'profile-data',
        relativeSelector: '.agents/skills/<name>/SKILL.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.skills',
          url: 'https://learn.chatgpt.com/docs/build-skills.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Where Codex loads local skills'],
          reviewedOn: '2026-08-27',
          establishes:
            'Local Codex clients additionally discover user skills at $HOME/.agents/skills/<name>/SKILL.md, alongside repository, admin, and system scopes.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex project custom agents: local clients load standalone TOML files under
 * a project's `.codex/agents/` as configuration layers for spawned sessions,
 * so a custom agent can override the same settings a normal session config
 * can. Every file must define `name`, `description`, and
 * `developer_instructions`, and may carry other supported `config.toml` keys —
 * `model`, `model_reasoning_effort`, `sandbox_mode`, `mcp_servers`, and
 * `skills.config` among them. Codex identifies the agent by its `name` field;
 * matching the filename to it is convention, not the lookup.
 *
 * `partially-documented`: the page names `.codex/agents/` for project scope
 * and never states which directories of a project are searched, so the
 * complete project search stays unestablished
 * (contracts/vendors/openai-codex.md § Canonical evidence-assessment index).
 * That gap is exactly what the Inspector rule declines to guess at — it
 * admits the selected root's own `.codex/agents/` and nothing below it.
 *
 * Its `mcp_servers` keys are this statement's subject only as a spawned
 * session's inherited configuration. They are not a second MCP carrier: an
 * MCP declaration's home is an explicit carrier, and a file of another kind
 * spelling MCP-looking configuration is that kind's own content
 * (data-model.md § Inventory unit).
 */
export const CODEX_REPO_AGENTS_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.agents',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        // The page says "project-scoped" and names the directory relative to
        // the project, so the base is the repository root and the traversal is
        // the one directory it names. Recording a chain here would assert the
        // search the page does not describe — the same gap the
        // `partially-documented` status carries.
        lookupBase: 'repository-root',
        relativeSelector: '.codex/agents/*.toml',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.subagents',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Custom agents', 'Custom agent file schema'],
          reviewedOn: '2026-08-27',
          establishes:
            'Project-scoped custom agents are standalone TOML files under .codex/agents/, each defining one agent that Codex loads as a configuration layer for spawned sessions, with name, description, and developer_instructions required and other supported config.toml keys permitted; the page names the project directory without stating which directories of a project are searched.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User custom agents. Recorded for maintenance only: it expands no
 * Global inspection, and `codex.excluded.user-runtime` keeps the surface out
 * of the read allowlist (FR-015 through FR-018). It is shipped here because
 * `codex.agents.inheritance` composes both scopes, and a strategy naming a
 * statement no catalog holds is the dangling edge the contract gate rejects.
 */
export const CODEX_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.agents',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'agents/*.toml',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.subagents',
          url: 'https://learn.chatgpt.com/docs/agent-configuration/subagents.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Custom agents'],
          reviewedOn: '2026-08-27',
          establishes:
            'Personal custom agents are standalone TOML files under ~/.codex/agents/, and a custom agent whose name matches a built-in agent such as explorer takes precedence over it.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex repository plugin catalogs: local clients read a plugin catalog at the
 * exact `$REPO_ROOT/.agents/plugins/marketplace.json` and at the
 * legacy-compatible `$REPO_ROOT/.claude-plugin/marketplace.json`. This is
 * where Codex differs from Claude Code and Copilot: no settings entry
 * registers the catalog, so a committed file is already a source the vendor
 * considers.
 *
 * A catalog exposes plugins for installation. It is not proof that any of them
 * is installed or enabled: the installed copy lives under the User plugin
 * cache and the per-plugin on/off value lives in the User configuration, both
 * outside this Source (FR-009).
 */
export const CODEX_REPO_MARKETPLACE_BEHAVIOR = {
  behaviorId: 'codex.behavior.repo.marketplace',
  tool: 'codex',
  surfaces: ['codex-plugin-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.agents/plugins/marketplace.json; .claude-plugin/marketplace.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: [
            'How local marketplaces work',
            'Marketplace metadata',
            'Build your own curated plugin list',
            'Add a marketplace from the CLI',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'The ChatGPT desktop app reads a repo marketplace at $REPO_ROOT/.agents/plugins/marketplace.json and a legacy-compatible one at $REPO_ROOT/.claude-plugin/marketplace.json, each a JSON catalog whose plugins[] entries name the plugins it exposes, each entry writing its source as a local object with a path kept relative to the marketplace root and started with ./, as that path string alone, or as a url, git-subdir, or npm object, and shows each catalog as a selectable source in the Plugins Directory; the Codex CLI adds, lists, refreshes, and removes marketplace sources and prints the ones Codex is considering, including local defaults, while directing installation and testing back to the desktop app. The personal ~/.agents/plugins/marketplace.json named beside them is a different Source boundary this statement does not reach, and installation and per-plugin enablement are separate state.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex plugin manifests: a plugin root a catalog entry or an installation
 * selected carries the required `.codex-plugin/plugin.json`, which identifies
 * the plugin and points at the components it bundles.
 *
 * The scope is the plugin's own packaged content rather than the repository:
 * which plugin root a client loads is decided by the catalog entry or by the
 * installed copy, so this statement anchors at that root and names the one
 * path below it. A file that merely matches that path is not thereby an
 * enabled plugin (FR-009).
 */
export const CODEX_PLUGIN_MANIFEST_BEHAVIOR = {
  behaviorId: 'codex.behavior.plugin.manifest',
  tool: 'codex',
  surfaces: ['codex-plugin-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'plugin',
        lookupBase: 'registered-catalog',
        relativeSelector: '.codex-plugin/plugin.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: ['Plugin structure', 'Manifest fields'],
          reviewedOn: '2026-08-27',
          establishes:
            'Every plugin has its required entry point at .codex-plugin/plugin.json, whose name, version, and description identify the plugin and whose skills, mcpServers, apps, and hooks fields point at bundled components relative to the plugin root; only plugin.json belongs in .codex-plugin/.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex personal plugins: a user keeps a marketplace of their own at
 * `$HOME/.agents/plugins/marketplace.json`, and the plugins installed from any
 * catalog live as cached copies under the Codex state directory.
 *
 * Non-authorizing. Both locations are User state outside this Source
 * (`codex.excluded.user-runtime`), and the statement exists so
 * `codex.plugins.activation` can describe Codex's runtime honestly: a catalog,
 * an installation, an enablement value, and a cached copy are four separate
 * states, and omitting the user's own scope would describe the composition as
 * if a repository catalog were the only one in play.
 */
export const CODEX_USER_PLUGINS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.plugins',
  tool: 'codex',
  surfaces: ['codex-plugin-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        // `$HOME/.agents/plugins`, not the Codex home, for the reason
        // `codex.behavior.user.skills` records: no cited page documents an
        // override relocating the separate `$HOME/.agents` directories. The
        // installed copies do live under the Codex state directory, and the
        // selector names both because one statement covers both halves of the
        // user's plugin state.
        vendorScope: 'user',
        lookupBase: 'profile-data',
        relativeSelector: '.agents/plugins/marketplace.json; installed copies under Codex state',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.plugins',
          url: 'https://developers.openai.com/plugins/build/plugins.md',
          officialHost: 'developers.openai.com',
          sections: ['How local marketplaces work', 'Marketplace metadata'],
          reviewedOn: '2026-08-27',
          establishes:
            "A personal marketplace lives at ~/.agents/plugins/marketplace.json, which the ChatGPT desktop app reads beside the repository ones; ChatGPT installs plugins into ~/.codex/plugins/cache/$MARKETPLACE_NAME/$PLUGIN_NAME/$VERSION/ and loads the installed copy from that cache rather than from the marketplace entry, and stores each plugin's on or off state in ~/.codex/config.toml.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex local memories: once the feature is enabled, Codex writes generated
 * memory files under the Codex home, whose `memories/` directory holds the
 * summaries, durable entries, recent inputs, and supporting evidence it
 * carries forward between chats.
 *
 * Non-authorizing. The page calls these files generated state and says
 * outright not to edit them as a control surface, which is the distinction
 * this statement records: a memory file is something Codex wrote about the
 * reader's past sessions, not a customization the reader authored, so it stays
 * local state outside this Source (`codex.excluded.user-runtime`). The
 * statement exists because the consent exclusions have to name every User
 * surface the Codex home carries, and a home whose largest directory went
 * unnamed would describe the excluded scope as smaller than it is.
 */
export const CODEX_USER_MEMORIES_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.memories',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'memories/',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.memories',
          url: 'https://learn.chatgpt.com/docs/customization/memories.md',
          officialHost: 'learn.chatgpt.com',
          sections: [
            'How local Codex memories work',
            'Local memory storage',
            'Configure local memories',
          ],
          reviewedOn: '2026-08-27',
          establishes:
            'Codex stores memories under the Codex home directory, which defaults to ~/.codex and is relocated by CODEX_HOME; the main memory files live under ~/.codex/memories/ and hold summaries, durable entries, recent inputs, and supporting evidence from prior chats. They are generated state rather than a hand-edited control surface. The feature is off by default and is turned on either in the ChatGPT desktop app or by a [features] memories flag in config.toml.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex custom prompts: Markdown files in the local Codex home's `prompts/`
 * directory become slash commands a reader invokes explicitly.
 *
 * Non-authorizing, and deprecated by the vendor in favor of skills — which is
 * why the record carries the `[deprecated]` qualifier the page's own notice
 * states. It stays User state outside this Source
 * (`codex.excluded.user-runtime`), and its surface is the shared local Codex
 * home the whole surface member is defined by; the page names the CLI and the
 * IDE extension as the clients that invoke a prompt, so the surface says where
 * the files live rather than claiming every client on it has the command menu.
 */
export const CODEX_USER_PROMPTS_BEHAVIOR = {
  behaviorId: 'codex.behavior.user.prompts',
  tool: 'codex',
  surfaces: ['codex-local-clients'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'prompts/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['deprecated'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'openai.codex.custom-prompts',
          url: 'https://learn.chatgpt.com/docs/custom-prompts.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Custom Prompts'],
          reviewedOn: '2026-08-27',
          establishes:
            'The page states in its own notice that custom prompts are deprecated in favor of skills. A prompt is a Markdown file in the local Codex home directory — the page creates ~/.codex/prompts and writes ~/.codex/prompts/draftpr.md — carrying description and argument-hint frontmatter, invoked as a slash command in the Codex CLI and the Codex IDE extension after a restart. It requires explicit invocation and is not shared through the repository.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex's contribution to the behavior registry, keyed by `behaviorId` in
 * identifier order. Each statement ships together with every other statement
 * its strategy composes — the two skill scopes for `codex.skills.discovery`
 * and the two instruction scopes for `codex.instructions.layering` — because
 * shipping one alone would leave the dangling edge the contract gate rejects.
 */
export const CODEX_BEHAVIOR_STATEMENTS: Readonly<Record<CodexBehaviorId, VendorBehaviorStatement>> =
  {
    [CODEX_PLUGIN_MANIFEST_BEHAVIOR.behaviorId]: CODEX_PLUGIN_MANIFEST_BEHAVIOR,
    [CODEX_REPO_AGENTS_BEHAVIOR.behaviorId]: CODEX_REPO_AGENTS_BEHAVIOR,
    [CODEX_REPO_CONFIG_BEHAVIOR.behaviorId]: CODEX_REPO_CONFIG_BEHAVIOR,
    [CODEX_REPO_HOOKS_BEHAVIOR.behaviorId]: CODEX_REPO_HOOKS_BEHAVIOR,
    [CODEX_REPO_INSTRUCTIONS_BEHAVIOR.behaviorId]: CODEX_REPO_INSTRUCTIONS_BEHAVIOR,
    [CODEX_REPO_MCP_BEHAVIOR.behaviorId]: CODEX_REPO_MCP_BEHAVIOR,
    [CODEX_REPO_MARKETPLACE_BEHAVIOR.behaviorId]: CODEX_REPO_MARKETPLACE_BEHAVIOR,
    [CODEX_REPO_RULES_BEHAVIOR.behaviorId]: CODEX_REPO_RULES_BEHAVIOR,
    [CODEX_REPO_SKILLS_BEHAVIOR.behaviorId]: CODEX_REPO_SKILLS_BEHAVIOR,
    [CODEX_USER_AGENTS_BEHAVIOR.behaviorId]: CODEX_USER_AGENTS_BEHAVIOR,
    [CODEX_USER_CONFIG_BEHAVIOR.behaviorId]: CODEX_USER_CONFIG_BEHAVIOR,
    [CODEX_USER_HOOKS_BEHAVIOR.behaviorId]: CODEX_USER_HOOKS_BEHAVIOR,
    [CODEX_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: CODEX_USER_INSTRUCTIONS_BEHAVIOR,
    [CODEX_USER_MEMORIES_BEHAVIOR.behaviorId]: CODEX_USER_MEMORIES_BEHAVIOR,
    [CODEX_USER_PLUGINS_BEHAVIOR.behaviorId]: CODEX_USER_PLUGINS_BEHAVIOR,
    [CODEX_USER_PROMPTS_BEHAVIOR.behaviorId]: CODEX_USER_PROMPTS_BEHAVIOR,
    [CODEX_USER_RULES_BEHAVIOR.behaviorId]: CODEX_USER_RULES_BEHAVIOR,
    [CODEX_USER_SKILLS_BEHAVIOR.behaviorId]: CODEX_USER_SKILLS_BEHAVIOR,
  };
