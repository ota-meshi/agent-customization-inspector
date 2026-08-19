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
// selection outranks, and the origin-file-less hosted remote-skill fact. The
// instruction phase ships each surface's instruction locations, the User
// scopes its layering composes, and the origin-file-less hosted organization
// fact.
//
// Copilot's VS Code, CLI, and Cloud lookups are separate statements, not one:
// the surfaces document different lookup bases and traversal, and two
// surfaces with different bases are two behavior IDs even when the relative
// filename matches (contracts/vendors/github-copilot.md § Surface boundary).
// That is what makes a Copilot recognition surface-qualified — one file, one
// tool, and the exact surfaces whose documented behavior its admitting rules
// rest on.
//
// No settings file is a statement here. `chat.instructionsFilesLocations`,
// `chat.useClaudeMdFile`, and the CLI's own configuration decide at runtime
// which of these locations participate, and that dependency stays a condition
// on the record rather than a second behavior with a settings locator — a
// settings statement would invite a settings rule, and this phase authorizes
// no settings read.
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
 * Copilot VS Code repository-wide instructions: the one exact
 * `.github/copilot-instructions.md` at the workspace root. Parent-repository
 * discovery exists but is a disabled-by-default opt-in setting, so the
 * documented default lookup is the workspace root's own file
 * (contracts/vendors/github-copilot.md § Surface boundary).
 */
export const COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.instructions.repository',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.github/copilot-instructions.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a .github/copilot-instructions.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code automatically detects the one repository-wide instruction file at the workspace root and applies it to all chat requests within that workspace.',
        },
        {
          sourceId: 'vscode.copilot.customization',
          url: 'https://code.visualstudio.com/docs/agent-customization/overview',
          officialHost: 'code.visualstudio.com',
          sections: ['Use customizations in a monorepo'],
          reviewedOn: '2026-08-19',
          establishes:
            'Parent-repository discovery is a disabled-by-default setting under which VS Code walks up from each workspace folder to the first .git directory and collects customizations from the folders between them, which is why the default lookup this record states stays the workspace root itself.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code path-specific instructions: the `.instructions.md` files
 * below each enabled instruction location, plus the Claude-compatible
 * `.claude/rules` files. Each declares its own `applyTo` (or, for a Claude
 * rule, `paths`) against the workspace root, so which files a given one
 * governs is a declaration inside the file rather than part of this lookup.
 *
 * The additional configured locations are documented behavior and are
 * deliberately not part of this release's read allowlist — they are the
 * `copilot.excluded.extra-directories` fact, not a base this record widens.
 */
export const COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.instructions.path',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.github/instructions/<name>.instructions.md; .claude/rules/<name>.md',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: [
            'Use .instructions.md files',
            'Instructions file locations',
            'Use a CLAUDE.md file',
          ],
          reviewedOn: '2026-08-19',
          establishes:
            'File-based .instructions.md files apply when the applyTo pattern in their header matches what the agent works on, the default workspace location .github/instructions and the Claude-format .claude/rules folder are searched recursively, and a .claude/rules file declares its patterns with a paths property that defaults to every file when omitted.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom instructions settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'Which instruction locations participate is setting-controlled, so an additional configured location is a runtime input rather than part of the documented default lookup.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code `AGENTS.md`: the workspace-root file is always on when the
 * feature is enabled, and subfolder files are inventoried only under a
 * disabled-by-default experimental setting, with the agent deciding which of
 * them apply to the files being edited.
 *
 * The traversal records the walk the source documents — the subfolder
 * inventory — while `[experimental]` is what says that half is not on by
 * default. That combination is why the Inspector's own `AGENTS.md` rule
 * inventories descendants: a nested file is authored inventory this surface
 * can genuinely read, not a context outside the selected root.
 */
export const COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.instructions.agents',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: 'AGENTS.md',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use an AGENTS.md file', 'Use multiple AGENTS.md files (experimental)'],
          reviewedOn: '2026-08-19',
          establishes:
            'VS Code automatically applies the workspace-root AGENTS.md to all chat requests when its setting is on, and nested files are an experimental, disabled-by-default setting under which VS Code searches every subfolder and leaves the choice of applicable instructions to the model.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Chat settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'The chat.useAgentsMdFile setting defaults to on and the experimental chat.useNestedAgentsMdFiles setting defaults to off, which is what makes the root file read by default and the nested tier a disabled-by-default opt-in.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Visual Studio Code'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via AGENTS.md among the instruction types the Visual Studio Code surface reads, separately from the repository-wide and path-specific types.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code Claude-compatibility instructions: `CLAUDE.md`, its
 * `.claude/CLAUDE.md` spelling, and the local `CLAUDE.local.md` variant at the
 * workspace root, always on while the compatibility setting is enabled.
 *
 * Only the root `CLAUDE.md` becomes a Copilot candidate in this release; the
 * other two spellings are the `copilot.excluded.additional-standard-locations`
 * fact, which is a scope decision about the Inspector and never a denial of
 * this documented behavior.
 */
export const COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.instructions.claude',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: 'CLAUDE.md; .claude/CLAUDE.md; CLAUDE.local.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a CLAUDE.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'With the chat.useClaudeMdFile setting enabled, VS Code applies CLAUDE.md as always-on instructions from its documented locations: the workspace root, the .claude folder, the user home, and the local CLAUDE.local.md variant.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

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
          reviewedOn: '2026-08-19',
          establishes:
            'Skill discovery locations are setting-controlled, which keeps enablement and any additional configured location a runtime condition rather than part of the documented default lookup.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User instructions: the personal instruction locations in
 * home and profile data, the highest documented instruction layer. Recorded
 * for maintenance only — no Repository rule rests on it, and only the
 * consented `<COPILOT_HOME>/instructions` subset is ever admitted, by the
 * Global rule that ships with its own phase.
 */
export const COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.instructions',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // Home directories and the VS Code profile, not the `~/.copilot`
        // product home alone — `~/.claude` and the profile's own instruction
        // files sit outside it, so the base is profile data.
        lookupBase: 'profile-data',
        // Relative to the base, like the other User locators: the home anchor
        // is what `profile-data` already says.
        relativeSelector:
          '.copilot/instructions/<name>.instructions.md; .claude/rules/<name>.md; profile instruction files',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Instructions file locations', 'Instruction priority'],
          reviewedOn: '2026-08-19',
          establishes:
            'User-level instruction files live in the documented user locations such as ~/.copilot/instructions and ~/.claude/rules, apply across workspaces, and personal instructions take the highest priority in the documented order while every applicable set is still provided.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom instructions settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'The same location setting enables or disables each instruction location, so participation is a runtime input rather than a fixed part of the lookup.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code personal `~/.claude/CLAUDE.md`: always-on personal
 * instructions when Claude compatibility is enabled. Recorded for maintenance
 * only: the vendor contract's `copilot.excluded.user-runtime` keeps it out of
 * the read allowlist, and that exclusion rule ships with the Global phase.
 */
export const COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.claude',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // Claude's home directory, not Copilot's own product home.
        lookupBase: 'profile-data',
        relativeSelector: '.claude/CLAUDE.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.instructions',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-instructions',
          officialHost: 'code.visualstudio.com',
          sections: ['Use a CLAUDE.md file'],
          reviewedOn: '2026-08-19',
          establishes:
            'The CLAUDE.md location table names the user-home file as personal instructions across all projects.',
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
          reviewedOn: '2026-08-19',
          establishes:
            'User skill locations participate in the same setting-controlled discovery configuration as workspace locations.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI repository-wide instructions: `.github/copilot-instructions.md`
 * read relative to each of the CLI's documented standard locations — the
 * repository root, the runtime working directory, the directories between
 * them, and the directories on the path of a file the CLI is working on.
 *
 * `runtime-cwd` with a location chain rather than an upward walk: the
 * documentation names a fixed set of contexts, not a parent-by-parent search,
 * and which of them exists in a given session is runtime this tool never
 * observes. That is exactly why the Inspector's CLI-context rule inventories
 * descendants of the selected root instead of claiming the CLI walks downward
 * (contracts/vendors/github-copilot.md § Inspector Repository matcher rules).
 */
export const COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.instructions.repository',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.github/copilot-instructions.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: [
            'Types of custom instructions',
            'Creating repository-wide custom instructions',
          ],
          reviewedOn: '2026-08-19',
          establishes:
            'Copilot CLI discovers the repository-wide .github/copilot-instructions.md in its standard locations — the repository root, the current working directory, the directories between them, and directories on the path of a file it is working on — and the how-to creates the file at the repository root.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists repository-wide instructions among the types the Copilot CLI surface reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI path-specific instructions: `.instructions.md` files below the
 * `.github/instructions` directory of each documented standard location —
 * with the intermediate directories between the repository root and the
 * runtime working directory documented as excluded for this filename — each
 * file included only when its own `applyTo` matches what the session works
 * with, and disableable from the session.
 *
 * A fixed location list, not a recursive walk from one base: the vendor
 * documents a fixed list of contexts, each holding its own instructions
 * subtree, and a recursive-under-the-working-directory locator would claim a
 * walk over arbitrary descendants the vendor does not perform.
 * (The exact traversal member is maintenance data the packaged CLI folds
 * away, which is why this prose does not spell it.)
 */
export const COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.instructions.path',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        // Documentation prose, so the parenthetical can carry the second
        // dimension the closed traversal member cannot: at each admitted
        // standard location the whole instructions subtree is read,
        // subdirectories included.
        relativeSelector:
          '.github/instructions/<name>.instructions.md (subdirectories of .github/instructions included)',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: [
            'Types of custom instructions',
            'Creating path-specific custom instructions',
            'How multiple instruction files interact',
          ],
          reviewedOn: '2026-08-19',
          establishes:
            'Modular instruction files live below .github/instructions — discovered in the standard locations but not the intermediate directories — are created with an applyTo frontmatter pattern, optionally organized into subdirectories, and are included only when that pattern matches a file the session is working with.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists path-specific instructions among the types the Copilot CLI surface reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI `AGENTS.md`: read from the same documented standard locations as
 * the repository-wide file, so which one a session reaches depends on the
 * runtime context rather than on a fixed path.
 */
export const COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.instructions.agents',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'AGENTS.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'AGENTS.md is an agent-instruction file Copilot CLI discovers in its standard locations.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via AGENTS.md among the types the Copilot CLI surface reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI `CLAUDE.md`: the Claude-compatible agent-instruction file and
 * its `.claude` directory spelling, read from the same documented standard
 * locations. Only the root `CLAUDE.md` becomes a Copilot candidate in this
 * release — the non-root and `.claude` spellings are the
 * `copilot.excluded.additional-standard-locations` fact.
 */
export const COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.instructions.claude',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'CLAUDE.md; .claude/CLAUDE.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'CLAUDE.md is an agent-instruction file Copilot CLI discovers in its standard locations, and the CLI also uses .claude/CLAUDE.md.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via CLAUDE.md among the types the Copilot CLI surface reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI `GEMINI.md`: the other Claude-and-Gemini-compatible
 * agent-instruction file, read from the same documented standard locations.
 * Only the root file becomes a Copilot candidate in this release.
 */
export const COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.instructions.gemini',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: 'GEMINI.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'GEMINI.md is an agent-instruction file Copilot CLI discovers in its standard locations.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via GEMINI.md among the types the Copilot CLI surface reads.',
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
 * Copilot CLI User instructions: the one `copilot-instructions.md` at the
 * product home, `COPILOT_HOME` or its `$HOME/.copilot` default. Recorded for
 * maintenance only here — admitting it is the separate consented Global rule's
 * job, and that rule ships with the Global phase.
 */
export const COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.instructions.root',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // The product's own home, unlike the User skill scopes: this file sits
        // inside `COPILOT_HOME` rather than beside other products' homes.
        lookupBase: 'tool-home',
        relativeSelector: 'copilot-instructions.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions', 'How multiple instruction files interact'],
          reviewedOn: '2026-08-19',
          establishes:
            'One copilot-instructions.md inside the Copilot home directory holds user-level instructions that apply across repositories, combined with the applicable repository files, with duplicate copies of identical files removed and no general precedence order defined.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix records personal instructions at ~/.copilot as a Copilot CLI instruction source separate from the repository ones.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User path instructions: the `.instructions.md` files below the
 * product home's own `instructions/` directory, applying the same `applyTo`
 * and composition conditions as the repository path instructions. Recorded for
 * maintenance only; admission is the consented Global rule's.
 */
export const COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.instructions.path',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'instructions/<name>.instructions.md',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-custom-instructions',
          officialHost: 'docs.github.com',
          sections: ['Types of custom instructions', 'How multiple instruction files interact'],
          reviewedOn: '2026-08-19',
          establishes:
            'Modular user-level instructions live below the Copilot home instructions directory and are included only when their applyTo pattern matches a file the session is working with.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['Copilot CLI'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix records personal path-specific instructions among the Copilot CLI instruction sources.',
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
 * Copilot cloud agent repository-wide instructions: the one exact
 * `.github/copilot-instructions.md` at the repository root the hosted agent
 * processes. The same relative filename as the VS Code surface reads, from a
 * different documented base — which is why the two are separate statements.
 */
export const COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.instructions.repository',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/copilot-instructions.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: [
            'Creating custom instructions',
            'Creating repository-wide custom instructions',
          ],
          reviewedOn: '2026-08-19',
          establishes:
            'Repository-wide instructions apply to all requests made in the context of a repository and are specified in the one copilot-instructions.md in its .github directory.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists repository-wide instructions among the types the Copilot cloud agent reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent path-specific instructions: the `.instructions.md` files
 * in the repository root's `.github/instructions` subtree, applied when their
 * own `applyTo` matches, and excludable from the cloud agent by their own
 * `excludeAgent` declaration.
 */
export const COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.instructions.path',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/instructions/<name>.instructions.md',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions', 'Creating path-specific custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'Path-specific instructions are specified in NAME.instructions.md files within or below the repository .github/instructions directory, apply when their applyTo pattern matches the files being worked on, and can exclude the cloud agent with their own excludeAgent declaration.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists path-specific instructions among the types the Copilot cloud agent reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent `AGENTS.md`: read from the repository tree, with the
 * nearest file on the directory tree of the worked path taking precedence.
 * That is a Cloud statement alone — VS Code's nested handling is experimental
 * and model-decided, and the two must not be projected onto each other
 * (contracts/vendors/github-copilot.md § Known conflicts and uncertainties).
 */
export const COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.instructions.agents',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: 'AGENTS.md',
        traversal: 'recursive-under-base',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'AGENTS.md files may be stored anywhere within the repository, and when Copilot is working, the nearest AGENTS.md file in the directory tree takes precedence.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via AGENTS.md among the types the Copilot cloud agent reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent's root-only agent-instruction alternatives: `CLAUDE.md`
 * and `GEMINI.md` at the repository root. Root-only is the documented shape
 * here, unlike `AGENTS.md`, which is why the Inspector admits these two as
 * exact root candidates.
 */
export const COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.instructions.alternatives',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: 'CLAUDE.md; GEMINI.md',
        // Two fixed root files, so a location list rather than one exact path.
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Creating custom instructions'],
          reviewedOn: '2026-08-19',
          establishes:
            'A single CLAUDE.md or GEMINI.md file stored in the root of the repository is the documented alternative to AGENTS.md, without the anywhere-in-the-tree placement AGENTS.md is given.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix lists agent instructions via CLAUDE.md and GEMINI.md among the types the Copilot cloud agent reads.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot's hosted organization instructions: GitHub-side configuration that
 * applies together with a repository's own instructions, with repository
 * instructions preceding organization ones in the documented layer model. The
 * second origin-file-less statement of this catalog — there is no local path
 * to name, so nothing about it can create a candidate or a scan root.
 */
export const COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.organization-instructions',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'hosted-managed',
        lookupBase: 'hosted-state',
        // No relative path exists for hosted configuration; null records that
        // the behavior names no file rather than a file this catalog omitted.
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cloud.instructions',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-on-github/customize-copilot/add-custom-instructions/add-repository-instructions',
          officialHost: 'docs.github.com',
          sections: ['Custom instructions in use'],
          reviewedOn: '2026-08-19',
          establishes:
            'Organization instructions apply to requests together with repository instructions and are prioritized after them, with all relevant sets still provided to Copilot; they are held by GitHub rather than in the repository.',
        },
        {
          sourceId: 'github.copilot.instructions.support',
          url: 'https://docs.github.com/en/copilot/reference/custom-instructions-support',
          officialHost: 'docs.github.com',
          sections: ['GitHub.com'],
          reviewedOn: '2026-08-19',
          establishes:
            'The support matrix records organization instructions as a layer of the GitHub.com surface distinct from the repository files.',
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
 * Copilot's contribution to the behavior registry, keyed by `behaviorId`. Each
 * surface's statements ship together with the strategy that composes them —
 * an instruction layering consumes every scope of its own surface, User and
 * hosted included — because shipping a subset would leave a dangling edge the
 * contract gate rejects.
 */
export const COPILOT_BEHAVIOR_STATEMENTS: Readonly<
  Record<CopilotBehaviorId, VendorBehaviorStatement>
> = {
  [COPILOT_CLI_COMMANDS_BEHAVIOR.behaviorId]: COPILOT_CLI_COMMANDS_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR.behaviorId]:
    COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  [COPILOT_CLI_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_SKILLS_BEHAVIOR,
  [COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]:
    COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR.behaviorId]:
    COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR,
  [COPILOT_CLI_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_SKILLS_BEHAVIOR,
  [COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR.behaviorId]:
    COPILOT_CLOUD_INSTRUCTIONS_AGENTS_BEHAVIOR,
  [COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR.behaviorId]:
    COPILOT_CLOUD_INSTRUCTIONS_ALTERNATIVES_BEHAVIOR,
  [COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]: COPILOT_CLOUD_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR.behaviorId]:
    COPILOT_CLOUD_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  [COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR.behaviorId]:
    COPILOT_CLOUD_ORGANIZATION_INSTRUCTIONS_BEHAVIOR,
  [COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_REMOTE_SKILLS_BEHAVIOR,
  [COPILOT_CLOUD_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_SKILLS_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]: COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  [COPILOT_VSCODE_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_SKILLS_BEHAVIOR,
  [COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR,
  [COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR,
  [COPILOT_VSCODE_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_SKILLS_BEHAVIOR,
};
