// GitHub Copilot behavior statements — the implementation counterpart of
// contracts/vendors/github-copilot.md § VS Code Repository behavior, § VS Code
// User behavior, § Copilot CLI Repository behavior, § Copilot CLI User
// behavior, and § Cloud and hosted behavior.
//
// A statement says where Copilot documents looking for a customization. It is
// not a filesystem matcher and can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"); read authority lives only in the inspection-rule
// registry. Statements arrive with the inventory phase that needs them, so
// this catalog is closed but incomplete by design: the skill phase ships the
// three Repository skill surfaces, the non-authorizing User scopes their
// selection strategies compose, the legacy CLI command surface the CLI
// selection outranks, and the origin-file-less hosted remote-skill fact.
//
// Copilot's VS Code, CLI, and Cloud skill lookups are three statements, not
// one: the surfaces document different lookup bases and traversal, and two
// surfaces with different bases are two behavior IDs even when the relative
// filename matches (contracts/vendors/github-copilot.md § Surface boundary).
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
import type { CopilotBehaviorId } from '../identifier-types';
import type { VendorBehaviorStatement } from '../behavior-types';

/**
 * Copilot VS Code Repository skill discovery: the workspace root's three fixed
 * skills directories — `.github/skills`, `.agents/skills`, and
 * `.claude/skills`, each skill one named directory carrying its own
 * `SKILL.md` — with metadata discovered first and content loaded progressively
 * when relevant. Parent-repository discovery is a disabled-by-default opt-in
 * setting, so the locator records the default workspace-root lookup.
 * (The exact selector text is maintenance data the packaged CLI folds away,
 * which is why this prose does not spell it.)
 *
 * `partially-documented`: cross-location duplicate-name precedence is not
 * documented (contracts/vendors/github-copilot.md § Canonical
 * evidence-assessment index).
 */
export const COPILOT_VSCODE_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.skills',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector:
          '.github/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md; .claude/skills/<name>/SKILL.md',
        // Three fixed directories below one base — a fixed location list, not
        // one exact path and not a recursive walk.
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.skills',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-skills',
          officialHost: 'code.visualstudio.com',
          sections: ['Create a skill', 'How Copilot uses skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'The Create-a-skill location table documents project skills in .github/skills, .claude/skills, and .agents/skills in the repository, each read from its SKILL.md, and Copilot loads a relevant skill progressively after discovering its metadata.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Agent skills settings'],
          reviewedOn: '2026-07-15',
          establishes:
            'Skill discovery locations are setting-controlled, which keeps enablement and any additional configured location a runtime condition rather than part of the documented default lookup.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User skill discovery in home and profile locations.
 * Recorded for maintenance only: it expands no Global inspection, and the
 * vendor contract's `copilot.excluded.user-runtime` keeps the surface out of
 * the read allowlist — FR-015 through FR-018 authorize only the two Copilot
 * Global instruction rules. That exclusion rule ships with the Global phase
 * that needs it, not with this statement.
 */
export const COPILOT_VSCODE_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.skills',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // Home directories and the VS Code profile, not the `~/.copilot`
        // product home alone — `~/.agents` and `~/.claude` sit outside it, so
        // the base is profile data rather than `tool-home`.
        lookupBase: 'profile-data',
        // Relative to the base, like the Codex and Claude user locators: the
        // home anchor is what `profile-data` already says, so a `~/` prefix
        // would state the base twice.
        relativeSelector:
          '.copilot/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md; .claude/skills/<name>/SKILL.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.skills',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-skills',
          officialHost: 'code.visualstudio.com',
          sections: ['Create a skill'],
          reviewedOn: '2026-07-15',
          establishes:
            'The Create-a-skill location table documents personal skills in the user profile at ~/.copilot/skills, ~/.claude/skills, and ~/.agents/skills; duplicate-name precedence against workspace skills is not documented.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Agent skills settings'],
          reviewedOn: '2026-07-15',
          establishes:
            'User skill locations participate in the same setting-controlled discovery configuration as workspace locations.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI Repository skill discovery: the documented priority list of
 * project locations — the three fixed skills directories at the runtime
 * project, plus the inherited parent tier the reference documents for
 * `.github/skills` alone (its monorepo parent-directory support). The
 * inherited tier is deliberately not claimed for the other two spellings,
 * because the reference's location table documents no parent row for them.
 */
export const COPILOT_CLI_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.skills',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // Documentation prose, so the asymmetric fourth entry can say in the
        // record's own data that the inherited parent tier is documented for
        // `.github/skills` alone — a selector list cannot say that per
        // spelling any other way without splitting the contract's one row.
        relativeSelector:
          '.github/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md; .claude/skills/<name>/SKILL.md; parent-directory .github/skills/<name>/SKILL.md (inherited, monorepo support)',
        // The reference documents a fixed priority list of locations — the
        // project directories plus one inherited parent tier — not a general
        // upward walk, so the chain member is the honest shape.
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'Copilot CLI loads project skills from .github/skills, .agents/skills, and .claude/skills at the runtime project, inherits parent-directory .github/skills layers for monorepos, and resolves a duplicate name to the first found in its documented source order.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['Creating and adding a skill'],
          reviewedOn: '2026-07-15',
          establishes:
            'The create-a-skill how-to documents the authored shape — a named skill directory carrying its own SKILL.md — in the same three project directories, .github/skills, .claude/skills, and .agents/skills.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI legacy commands at `.claude/commands/*.md`, the alternative
 * skill format a same-name skill outranks. Shipped with the skill phase
 * because `copilot.cli.skills.selection` composes it — the documented
 * selection is "a same-name skill outranks a legacy command", which cannot be
 * stated without the command surface it outranks.
 *
 * `partially-documented`: the command reference implies a project location but
 * establishes neither a complete anchor nor ancestor/recursive traversal
 * (contracts/vendors/github-copilot.md § Known conflicts and uncertainties
 * item 3).
 */
export const COPILOT_CLI_COMMANDS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.commands',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        // The reference implies a project location without anchoring it, so
        // the base is recorded as undocumented rather than as a specific
        // anchor the vendor never wrote; the Inspector's own conservative
        // root direct-child matcher is a separate policy decision that lives
        // with `copilot.repo.command`, not here.
        lookupBase: 'undocumented',
        relativeSelector: '.claude/commands/<command>.md',
        // The documented shape is the plain `.claude/commands/` location.
        // Ancestor and recursive discovery are not specified, and this field
        // records the walk the source documents, not the walks it rules out.
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Commands (alternative skill format)'],
          reviewedOn: '2026-07-15',
          establishes:
            'Copilot CLI documents .claude/commands/*.md as an alternative skill format that a same-name skill outranks, without establishing a complete project anchor or ancestor traversal.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User skill discovery under `~/.copilot/skills` and
 * `~/.agents/skills`. Recorded for maintenance only: it expands no Global
 * inspection — the vendor contract's `copilot.excluded.user-runtime` keeps
 * every User skill surface out of the read allowlist, and that exclusion rule
 * ships with the Global phase that needs it.
 */
export const COPILOT_CLI_USER_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.skills',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `~/.agents/skills` sits outside the `~/.copilot` product home, so
        // the base is the user's profile data rather than `tool-home`.
        lookupBase: 'profile-data',
        // Relative to the base for the same reason as the VS Code User record.
        relativeSelector: '.copilot/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'Copilot CLI additionally discovers personal skills in user-home locations, placed below project and inherited skills and above later sources in the documented first-found order.',
        },
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['Adding a skill that someone else has created'],
          reviewedOn: '2026-07-15',
          establishes:
            'A skill copied into a personal location is the same authored directory shape as a repository skill; only its scope differs.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent Repository skill discovery: the repository root's three
 * fixed skills directories, loaded progressively when relevant.
 *
 * `partially-documented`: how local personal skills project into the hosted
 * surface is not established (contracts/vendors/github-copilot.md § Canonical
 * evidence-assessment index).
 */
export const COPILOT_CLOUD_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.skills',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector:
          '.github/skills/<name>/SKILL.md; .agents/skills/<name>/SKILL.md; .claude/skills/<name>/SKILL.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.skills',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/customize-cloud-agent/add-skills',
          officialHost: 'docs.github.com',
          sections: ['Creating and adding a skill', 'How Copilot uses agent skills'],
          reviewedOn: '2026-07-15',
          establishes:
            'Copilot cloud agent discovers repository skills in the three fixed root directories and loads a relevant skill progressively; how local personal skills project into the hosted surface is not established.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot's hosted remote-skill relay: organization or enterprise skills
 * projected at runtime through Copilot services, with no Repository or User
 * filesystem locator — the origin-file-less fact of this catalog. Its locator
 * names the hosted state it lives in and no path, because there is none to
 * name; nothing about it can create a candidate or a scan root
 * (contracts/vendors/github-copilot.md § Cloud and hosted behavior).
 *
 * `partially-documented`: remote skills are documented at concept level while
 * exact Cloud collision behavior is incomplete, which is why the strategy that
 * composes this keeps collision outcomes unresolved.
 */
export const COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.remote-skills',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'hosted-managed',
        lookupBase: 'hosted-state',
        // No relative path exists for a hosted relay; null records that the
        // behavior names no file rather than a file this catalog omitted.
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  // One citation, deliberately: the cloud add-skills page's reviewed sections
  // say nothing about remote or organization skills, so the CLI reference's
  // location table is the section that actually documents the relay — as a
  // Copilot-services mechanism, which is why it can evidence a
  // `copilot-cloud`-scoped statement at concept level.
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Skill locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'Organization- or enterprise-hosted skills are projected into a session via the AHP relay with content fetched on demand, from no repository or user filesystem location; the last-in-order placement and name-based priority it documents are the CLI surface’s, leaving Cloud collision behavior unestablished.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot's contribution to the behavior registry, keyed by `behaviorId`. The
 * seven statements ship together because the three skill-selection strategies
 * compose all of them; shipping a subset would leave a dangling edge the
 * contract gate rejects.
 */
export const COPILOT_BEHAVIOR_STATEMENTS: Readonly<
  Record<CopilotBehaviorId, VendorBehaviorStatement>
> = {
  [COPILOT_CLI_COMMANDS_BEHAVIOR.behaviorId]: COPILOT_CLI_COMMANDS_BEHAVIOR,
  [COPILOT_CLI_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_SKILLS_BEHAVIOR,
  [COPILOT_CLI_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_SKILLS_BEHAVIOR,
  [COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
  [COPILOT_CLOUD_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_SKILLS_BEHAVIOR,
  [COPILOT_VSCODE_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_SKILLS_BEHAVIOR,
  [COPILOT_VSCODE_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_SKILLS_BEHAVIOR,
};
