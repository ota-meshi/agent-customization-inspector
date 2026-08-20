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
          reviewedOn: '2026-08-17',
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
 * derivation reads as its seed (T1089/T1090). A non-authorizing statement:
 * the file is a configuration input this product never publishes or
 * raw-displays, and its first candidacy (`codex.repo.config`) arrives with
 * the phase that owns the carrier.
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
          reviewedOn: '2026-08-17',
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
 * A non-authorizing statement the `codex.repo.config` rule is partly based on:
 * the carrier it admits can contain an inline `[hooks]` table, and recording
 * that documented fact grants no Hook candidate, recognition, or execution
 * authority — the Hook inventory and the standalone `hooks.json` candidacy
 * arrive with their own phase (contracts/vendors/openai-codex.md § Documented
 * Repository behavior).
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
          reviewedOn: '2026-07-25',
          establishes:
            'Each active trusted project layer contributes hooks from its .codex/hooks.json and from an inline [hooks] table in its .codex/config.toml; all matching hooks are additive, and a file and inline table at one layer are both loaded with a warning.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-17',
          establishes:
            'The active project config layers the hook lookup reads are the trusted .codex/config.toml files from the project root down to the runtime cwd.',
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
          reviewedOn: '2026-07-25',
          establishes:
            'MCP servers are declared as named [mcp_servers.*] tables in the Codex configuration file, one table per server.',
        },
        {
          sourceId: 'openai.codex.config-basic',
          url: 'https://learn.chatgpt.com/docs/config-file/config-basic.md',
          officialHost: 'learn.chatgpt.com',
          sections: ['Codex configuration file', 'Configuration precedence'],
          reviewedOn: '2026-08-17',
          establishes:
            'MCP declarations follow the same config-layer resolution as every other configuration value, and project-scoped layers apply only when the project is trusted.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Codex User configuration: `<CODEX_HOME>/config.toml` and profile files,
 * shared by every local client and resolved through the same precedence as
 * the project layers.
 *
 * A non-authorizing carrier fact recorded for maintenance and for the
 * precedence strategy that composes it: it expands no Global inspection, and
 * the User runtime exclusion that names it arrives with its own phase
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
          reviewedOn: '2026-08-17',
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
          reviewedOn: '2026-08-17',
          establishes:
            'Local Codex clients read a global instruction fallback at <CODEX_HOME>/AGENTS.override.md, otherwise <CODEX_HOME>/AGENTS.md, and the first non-empty global candidate precedes the project chain.',
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
          reviewedOn: '2026-07-25',
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
          reviewedOn: '2026-07-25',
          establishes:
            'Local Codex clients additionally discover user skills at $HOME/.agents/skills/<name>/SKILL.md, alongside repository, admin, and system scopes.',
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
    [CODEX_REPO_CONFIG_BEHAVIOR.behaviorId]: CODEX_REPO_CONFIG_BEHAVIOR,
    [CODEX_REPO_HOOKS_BEHAVIOR.behaviorId]: CODEX_REPO_HOOKS_BEHAVIOR,
    [CODEX_REPO_INSTRUCTIONS_BEHAVIOR.behaviorId]: CODEX_REPO_INSTRUCTIONS_BEHAVIOR,
    [CODEX_REPO_MCP_BEHAVIOR.behaviorId]: CODEX_REPO_MCP_BEHAVIOR,
    [CODEX_REPO_SKILLS_BEHAVIOR.behaviorId]: CODEX_REPO_SKILLS_BEHAVIOR,
    [CODEX_USER_CONFIG_BEHAVIOR.behaviorId]: CODEX_USER_CONFIG_BEHAVIOR,
    [CODEX_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: CODEX_USER_INSTRUCTIONS_BEHAVIOR,
    [CODEX_USER_SKILLS_BEHAVIOR.behaviorId]: CODEX_USER_SKILLS_BEHAVIOR,
  };
