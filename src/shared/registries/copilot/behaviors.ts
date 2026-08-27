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
          reviewedOn: '2026-08-20',
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
          reviewedOn: '2026-08-20',
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
          reviewedOn: '2026-08-20',
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
 * Copilot cloud agent hosted MCP configuration: the out-of-box servers, a
 * selected custom agent's `mcp-servers`, and the repository's own MCP
 * settings, processed in that order with later sources overriding. Recorded
 * for maintenance and for the selection strategy that composes it — these
 * are hosted inputs, not local `.mcp.json` files, so the record names no
 * filesystem locator, authorizes no rule, and reaches no session surface
 * (FR-009; spec.md § Clarifications: hosted inputs are not represented).
 */
export const COPILOT_CLOUD_MCP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.mcp',
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
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['MCP server configuration details', 'MCP server configurations'],
          reviewedOn: '2026-08-20',
          establishes:
            'A custom agent profile declares MCP servers through its mcp-servers property - the YAML representation of the repository MCP configuration format - and the cloud agent processes out-of-the-box configurations first, then the custom agent configuration, then repository settings, each level able to override the previous.',
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
          reviewedOn: '2026-08-20',
          establishes:
            'Organization- or enterprise-hosted skills are projected into a session via the AHP relay with content fetched on demand, from no repository or user filesystem location; the last-in-order placement and name-based priority it documents are the CLI surface’s, leaving Cloud collision behavior unestablished.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI workspace MCP declarations: `.mcp.json` and `.github/mcp.json`
 * loaded from the working directory upward to the Git root, provided the
 * folder is trusted. A project-level file declares its servers in either of
 * two documented schemas — the top-level `mcpServers` object, or the bare
 * top-level format where each key is a server name. Session additional
 * configuration and plugin-provided servers precede workspace servers, and
 * the User configuration follows — that order, and the workspace files' own
 * duplicate order, are `copilot.cli.mcp.selection`'s statements, not a walk
 * of this locator.
 */
export const COPILOT_CLI_MCP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.mcp',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.mcp.json; .github/mcp.json',
        traversal: 'ancestor-chain-to-repository-root',
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
          sections: ['MCP server configuration'],
          reviewedOn: '2026-08-20',
          establishes:
            'Workspace MCP servers are .mcp.json and .github/mcp.json files loaded from the working directory upward to the Git root, require the folder to be trusted, and sit below session-additional and plugin-provided servers and above the user configuration in the documented loading priority.',
        },
        {
          sourceId: 'github.copilot.cli.mcp',
          url: 'https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/add-mcp-servers',
          officialHost: 'docs.github.com',
          sections: ['Adding per-repository MCP servers'],
          reviewedOn: '2026-08-20',
          establishes:
            'A project-level file declares its servers in either of two schemas — the top-level mcpServers object, or the bare top-level format where each key is an MCP server name — which is why the CLI carrier reading accepts both forms.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User MCP configuration at `<COPILOT_HOME>/mcp-config.json` —
 * the lowest-priority source of the documented loading order. Recorded for
 * maintenance and for the selection strategy that composes it: it expands no
 * Global inspection, and the vendor contract's `copilot.excluded.user-runtime`
 * keeps the surface out of the read allowlist (FR-015, FR-018). That
 * exclusion ships with the Global phase that needs it, not with this
 * statement.
 */
export const COPILOT_CLI_USER_MCP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.mcp',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'mcp-config.json',
        traversal: 'exact',
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
          sections: ['MCP server configuration', 'Environment variables'],
          reviewedOn: '2026-08-20',
          establishes:
            'Persistent user servers are configured in ~/.copilot/mcp-config.json — the file the copilot mcp add subcommand writes — and that source is the lowest priority of the documented loading order; COPILOT_HOME overrides the configuration and state directory whose default is $HOME/.copilot, which is the relocation the <COPILOT_HOME> spelling names.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code custom-agent discovery in the workspace `.github/agents`
 * and `.claude/agents` directories. Recorded for maintenance and for the
 * VS Code agent-selection strategy that arrives with the Custom Agent
 * phases. It is deliberately not an input of the VS Code MCP selection: the
 * custom-agents reference documents the profile format's `mcp-servers`
 * field as not used in VS Code custom agents. It authorizes no rule: Custom
 * Agent files stay outside the read allowlist until their own inventory
 * phase admits them
 * (contracts/vendors/github-copilot.md § Repository vendor behavior).
 */
export const COPILOT_VSCODE_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.agents',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.github/agents/*.md; .claude/agents/*.md',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.custom-agents',
          url: 'https://code.visualstudio.com/docs/agent-customization/custom-agents',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agent file locations'],
          reviewedOn: '2026-07-15',
          establishes:
            'VS Code discovers custom agents as Markdown files in the workspace .github/agents and .claude/agents folders, and parent-folder discovery is an opt-in setting rather than part of the default lookup; cross-scope duplicate-name precedence is not established, which is the partially-documented remainder.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agents settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'Custom-agent discovery locations are setting-controlled, which keeps enablement and any additional configured location a runtime condition rather than part of the documented default lookup.',
        },
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['YAML frontmatter properties'],
          reviewedOn: '2026-08-20',
          establishes:
            'The shared profile format scopes a profile to vscode or github-copilot through its target property, and its mcp-servers field is documented as not used in VS Code and other IDE custom agents - which is why this behavior is no input of the local VS Code MCP selection.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code workspace MCP configuration: the `.vscode/mcp.json` file
 * the current guide documents with its top-level `servers` schema, and — for
 * VS Code 1.118+ — a workspace-root `.mcp.json` the release note adds
 * without defining its schema. The two official pages disagree on the
 * exhaustive location list, which is what the `conflict` status records: the
 * read-authorizing rules based on this statement admit both locations, but
 * the root file carries path/surface provenance only and no VS Code-owned
 * schema claim, while independently documented CLI extraction of the same
 * physical file stays the CLI behavior's own
 * (contracts/vendors/github-copilot.md § Repository vendor behavior).
 */
export const COPILOT_VSCODE_MCP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.mcp',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.vscode/mcp.json; .mcp.json',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.mcp',
          url: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure the mcp.json file', 'MCP server trust'],
          reviewedOn: '2026-08-20',
          establishes:
            'The guide names exactly two locations for the mcp.json file - the workspace .vscode/mcp.json and the user-profile configuration - documents the top-level servers map that declares each server by name, and gates starting a configured server behind an explicit trust decision.',
        },
        {
          sourceId: 'vscode.copilot.mcp.workspace-root-release',
          url: 'https://code.visualstudio.com/updates/v1_118',
          officialHost: 'code.visualstudio.com',
          sections: ['Workspace .mcp.json files and server deduplication'],
          reviewedOn: '2026-08-20',
          establishes:
            'VS Code 1.118 adds workspace-level .mcp.json files that declare MCP servers, aligning with tools such as the Copilot CLI, and deduplicates same-name servers by enabling only the most-specific one - without defining the root file schema or a total order across the other MCP inputs, which is the conflict this statement retains.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code prompt files: the `.prompt.md` files a workspace keeps in
 * `.github/prompts`, invoked manually with a `/` in chat rather than applied
 * on their own.
 *
 * A prompt file names itself: its optional frontmatter `name` is what a reader
 * types after the `/`, and the file name stands in when the file declares
 * none. That is the difference from the legacy command surface the same kind
 * covers, where the vendor derives the name from the path and reads no `name`
 * key at all.
 *
 * `partially-documented`: the page names `.github/prompts` as the workspace
 * default and says further locations come from `chat.promptFilesLocations`,
 * but does not state precisely what it does with a nested directory below the
 * default one (contracts/vendors/github-copilot.md § Documented VS Code
 * behavior).
 */
export const COPILOT_VSCODE_PROMPTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.prompts',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.github/prompts/<name>.prompt.md',
        // The page's own table gives one default folder for the workspace
        // scope; the configured extra locations are a runtime input this tool
        // never observes, and the parent-repository discovery it mentions is
        // gated on a setting rather than being the default walk.
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.prompts',
          url: 'https://code.visualstudio.com/docs/agent-customization/prompt-files',
          officialHost: 'code.visualstudio.com',
          sections: [
            'Prompt file locations',
            'Prompt file format',
            'Create a prompt file',
            'Use a prompt file in chat',
          ],
          reviewedOn: '2026-08-22',
          establishes:
            'A workspace keeps its prompt files in the .github/prompts folder, they are Markdown files with the .prompt.md extension, their optional frontmatter name is the name a reader types after / in chat with the file name used when none is specified, and they are invoked manually rather than applied automatically. Additional workspace locations come from a setting, and what the default folder does with a nested directory is not stated.',
        },
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Reusable prompt files settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'The chat.promptFilesLocations setting searches the locations it lists and defaults to { ".github/prompts": true }, which is both why the located default is what this statement records and why the configured extras are a runtime input it does not.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User prompt files: the profile's own `*.prompt.md` files.
 *
 * Recorded for maintenance only; `copilot.excluded.user-runtime` keeps the
 * surface out of the read allowlist (contracts/vendors/github-copilot.md
 * § Documented User behavior).
 */
export const COPILOT_VSCODE_USER_PROMPTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.prompts',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'profile-data',
        relativeSelector: '*.prompt.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.prompts',
          url: 'https://code.visualstudio.com/docs/agent-customization/prompt-files',
          officialHost: 'code.visualstudio.com',
          sections: ['Prompt file locations'],
          reviewedOn: '2026-08-22',
          establishes:
            'The user-profile scope keeps its prompt files in the profile data rather than in the workspace, which is a different Source boundary this release does not read.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User MCP configuration: the profile-owned `mcp.json` the
 * guide documents beside the workspace file. Recorded for maintenance and
 * for the selection strategy that composes it — it expands no Global
 * inspection, and the exclusion that names the User surface ships with the
 * Global phase that owns it (FR-015, FR-018). Same-name resolution across
 * the User and workspace scopes is not fully documented, which is the
 * partially-documented remainder.
 */
export const COPILOT_VSCODE_USER_MCP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.mcp',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'profile-data',
        relativeSelector: 'mcp.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.mcp',
          url: 'https://code.visualstudio.com/docs/agent-customization/mcp-servers',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure the mcp.json file', 'Synchronize MCP configuration across devices'],
          reviewedOn: '2026-08-20',
          establishes:
            'The user-profile mcp.json is the second documented location, opened through the MCP: Open User Configuration command, available across workspaces, per-profile, and synchronizable across devices; how a User declaration resolves against a same-name workspace declaration is not established.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI custom-agent discovery: at every ancestor from the runtime
 * working directory to the Git root, the CLI loads that layer's
 * `.github/agents/` and `.claude/agents/` directories, so each package of a
 * monorepo can contribute its own agents.
 *
 * `conflict` per the canonical index: official pages disagree on
 * project-versus-User precedence, and the registry retains the incompatible
 * assertions rather than picking one
 * (contracts/vendors/github-copilot.md § Canonical evidence-assessment
 * index).
 */
export const COPILOT_CLI_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.agents',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'runtime-cwd',
        relativeSelector: '.github/agents/*.md; .claude/agents/*.md',
        traversal: 'ancestor-chain-to-repository-root',
      }
    : null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Custom agent locations'],
          reviewedOn: '2026-08-20',
          establishes:
            'Project-scoped agents are loaded by walking upward from the working directory to the Git root, taking each ancestor level’s .github/agents/ and .claude/agents/ directories; every such directory is loaded, the deepest takes highest priority, and .github/agents/ takes precedence over .claude/agents/ at the same level.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User custom agents. Recorded for maintenance only: it expands
 * no Global inspection, and `copilot.excluded.user-runtime` keeps the surface
 * out of the read allowlist. It is shipped here because
 * `copilot.cli.agents.selection` composes it, and a strategy naming a
 * statement no catalog holds is the dangling edge the contract gate rejects.
 *
 * `conflict`, carrying the same unresolved project-versus-User precedence its
 * project counterpart records.
 */
export const COPILOT_CLI_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.agents',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'agents/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'conflict',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.reference',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference',
          officialHost: 'docs.github.com',
          sections: ['Custom agent locations'],
          reviewedOn: '2026-08-20',
          establishes:
            'User agents live at ~/.copilot/agents/ and plugin agents rank lowest; this page states that user-level agents have lower priority than project-level ones, which is one side of the retained project-versus-User conflict.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User custom agents. Recorded for maintenance only, on the
 * same terms as the CLI User scope above, and shipped because
 * `copilot.vscode.agents.selection` composes it.
 */
export const COPILOT_VSCODE_USER_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.agents',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // The page names a home location and the VS Code profile alike, which
        // is profile data rather than the product's own home directory.
        lookupBase: 'profile-data',
        relativeSelector: '~/.copilot/agents/*.md; profile agent files',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'partially-documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.settings',
          url: 'https://code.visualstudio.com/docs/agents/reference/ai-settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Custom agents settings'],
          reviewedOn: '2026-08-19',
          establishes:
            'Custom-agent locations are setting-controlled, so the personal and profile locations a workspace session also loads are configuration rather than a fixed list; duplicate-name precedence against workspace, organization, and plugin agents is not established, which is the partially-documented remainder.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent custom-agent profiles: the repository-level agent
 * definitions the hosted agent reads from the repository root's
 * `.github/agents`, in either the `*.agent.md` or the plain `*.md` spelling.
 *
 * The identity that deduplicates a profile across levels is the file's own
 * name minus that extension rather than a declared key, which is why the
 * inventory row a Copilot agent heads is named from its path
 * (`rules/copilot.ts` § agentNameOf).
 */
export const COPILOT_CLOUD_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.agents',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/agents/*.agent.md; .github/agents/*.md',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['YAML frontmatter properties', 'Example agent profile configurations'],
          reviewedOn: '2026-08-20',
          establishes:
            'A repository agent profile is a Markdown file with YAML frontmatter whose description is the one required property and whose name is an optional display name; the configuration file’s own name, minus .md or .agent.md, is what deduplicates a profile between levels so the lowest level wins.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot's hosted organization and enterprise agent profiles. Recorded for
 * maintenance only and, like the hosted remote-skill relay, it has no local
 * filesystem locator at all: the profiles live on GitHub’s side, so no
 * matcher could reach them and none is written
 * (contracts/vendors/github-copilot.md § Documented User and hosted
 * behavior). It is shipped because `copilot.cloud.agents.selection` composes
 * it.
 */
export const COPILOT_CLOUD_ORGANIZATION_AGENTS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.organization-agents',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'hosted-managed',
        // No local path exists, so the base is the hosted state itself and the
        // relative selector is null rather than an invented location.
        lookupBase: 'hosted-state',
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.custom-agents',
          url: 'https://docs.github.com/en/copilot/reference/custom-agents-configuration',
          officialHost: 'docs.github.com',
          sections: ['Example agent profile configurations'],
          reviewedOn: '2026-08-20',
          establishes:
            'Agent profiles also exist at the organization and enterprise levels, and on a naming conflict the lowest level wins — a repository agent over an organization one, and an organization agent over an enterprise one.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Copilot CLI's Repository settings lookup: the shared
 * `.github/copilot/settings.json`, the personal
 * `.github/copilot/settings.local.json`, and the two cross-tool
 * `.claude/settings*.json` files the CLI reads for the documented shared
 * subset of repository settings.
 *
 * This is the lookup that locates the documents `copilot.repo.settings`
 * admits. What may be written *inside* them — an inline `hooks` block, a
 * plugin recommendation — is the Hook and Plugin families' own subject and
 * arrives with their phases; a settings row publishes the document, not a
 * reading taken out of it (FR-007).
 *
 * Recording the cascade authorizes nothing: which layer wins for a key is the
 * runtime outcome `copilot.cli.settings.precedence` describes and no surface
 * projects (FR-009).
 */
export const COPILOT_CLI_SETTINGS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.settings',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector:
          '.github/copilot/settings.json; .github/copilot/settings.local.json; .claude/settings.json; .claude/settings.local.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Configuration file settings'],
          reviewedOn: '2026-08-23',
          establishes:
            'Settings apply in the order built-in defaults, MDM managed settings, user settings, repository .github/copilot/settings.json, local .github/copilot/settings.local.json, environment variables, then command-line flags; and the CLI also reads .claude/settings.json and .claude/settings.local.json for the shared cross-tool subset of repository settings such as companyAnnouncements, disableAllHooks, enabledPlugins, extraKnownMarketplaces, and hooks.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * VS Code's general workspace settings scope, recorded so
 * `copilot.excluded.vscode-settings` can name what it leaves out.
 *
 * Non-authorizing, and the settings documents this release admits do not rest
 * on it: `copilot.repo.settings` is based on the CLI settings behavior alone,
 * because what may be written inside such a document — a plugin
 * recommendation among it — belongs to the recognition whose subject that
 * declaration is, and those arrive with their own phases (FR-007).
 * `.vscode/settings.json` itself stays unadmitted: it is a general editor
 * settings document rather than a Copilot customization, and the initial read
 * allowlist admits only the dedicated `.vscode/mcp.json` carrier and the
 * supported Copilot/Claude settings files.
 */
export const COPILOT_VSCODE_SETTINGS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.settings',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector: '.vscode/settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.settings',
          url: 'https://code.visualstudio.com/docs/configure/settings',
          officialHost: 'code.visualstudio.com',
          sections: ['Workspace settings', 'Settings precedence'],
          reviewedOn: '2026-08-23',
          establishes:
            'Workspace settings are stored in the workspace .vscode/settings.json, and the scopes override each other in the documented order where a later scope wins, workspace settings sitting above user settings.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code plugins: a registered or installed plugin or marketplace root
 * carries one of the four documented manifest forms, and the editor detects the
 * format from which of them it finds.
 *
 * The root is established rather than discovered: a plugin reaches a session by
 * installation, by a marketplace the settings register, or by an absolute path
 * in `chat.pluginLocations` — never by a file appearing at an arbitrary
 * repository path. Registration, workspace listing, installation, and enabled state
 * are separate runtime facts this product never reads (FR-009).
 */
export const COPILOT_VSCODE_PLUGINS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.plugins',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'plugin',
        lookupBase: 'registered-catalog',
        relativeSelector:
          'plugin.json; .claude-plugin/plugin.json; .plugin/plugin.json; and the corresponding marketplace files',
        traversal: 'explicit-registration',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.plugins',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-plugins',
          officialHost: 'code.visualstudio.com',
          sections: ['Plugin formats', 'Configure plugin marketplaces', 'Use local plugins'],
          reviewedOn: '2026-08-25',
          establishes:
            'VS Code detects a plugin format from its root manifest — plugin.json for Agent Plugins 1.0 and Copilot, .claude-plugin/plugin.json for Claude, .plugin/plugin.json for legacy OpenPlugin — and a plugin reaches a session by installation, by a marketplace registered through chat.plugins.marketplaces, or by an absolute directory path registered in chat.pluginLocations, never by a file appearing at an arbitrary workspace path.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI plugins: an installed or registered plugin or marketplace root
 * carries its manifest at one of four documented locations, checked in order.
 *
 * The same establishment rule as the editor's, spelled with the CLI's own
 * install specifications: a marketplace plugin, a GitHub repository or
 * subdirectory, a Git URL, or a local path given to `copilot plugins install`.
 * Authored manifest, marketplace catalog, installed copy, enabled state, and
 * component selection stay separate facts (FR-009).
 */
export const COPILOT_CLI_PLUGINS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.plugins',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'plugin',
        lookupBase: 'registered-catalog',
        relativeSelector:
          '.plugin/plugin.json; plugin.json; .github/plugin/plugin.json; .claude-plugin/plugin.json, and the corresponding marketplace files, each checked in that order',
        traversal: 'explicit-registration',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations', 'marketplace.json', 'Plugin source types', 'CLI commands'],
          reviewedOn: '2026-08-25',
          establishes:
            'A plugin manifest is .plugin/plugin.json, plugin.json, .github/plugin/plugin.json, or .claude-plugin/plugin.json and a marketplace manifest is marketplace.json, .plugin/marketplace.json, .github/plugin/marketplace.json, or .claude-plugin/marketplace.json, each checked in that order; a plugin is installed by naming a marketplace plugin, a GitHub repository or subdirectory, a Git URL, or a local path, and installed copies live under ~/.copilot/installed-plugins. A catalog entry writes its own source as a relative path string — the page catalog example writes ./plugins/<name> — or as an object describing a GitHub repository or a Git URL through its source key, github or url, with optional ref, sha, and path; the owner/repo shorthand belongs to the marketplace add command rather than to an entry source.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Copilot CLI's experimental project extensions, recorded so
 * `copilot.excluded.cli-extensions` can name what it leaves out. They are
 * executable JavaScript the CLI loads on enablement rather than an authored
 * customization document, and no rule admits one.
 */
export const COPILOT_CLI_EXTENSIONS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.extensions',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/extensions/<name>/extension.mjs; extension.cjs; extension.js',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations', 'Loading order and precedence'],
          reviewedOn: '2026-08-25',
          establishes:
            "The plugin reference separates a plugin's own components — agents, skills, hooks, MCP and LSP configuration — from the CLI's project extensions, and its loading order composes plugin components with project and personal configurations rather than treating an extension file as a plugin.",
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User plugins: the plugins a profile has available, which is
 * installed and registered state rather than a file this repository carries.
 *
 * Recorded so `copilot.excluded.user-runtime` can name what it leaves out. A
 * plugin reaches an editor session by being installed, by a marketplace a
 * setting registers, or by an absolute directory path a setting names — all of
 * it outside the Source, and none of it a claim this product makes about a
 * repository's own catalog (FR-009).
 */
export const COPILOT_VSCODE_USER_PLUGINS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.plugins',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // The profile's own plugin state, plus the copies the CLI installed
        // under the user's home that the editor also offers.
        lookupBase: 'profile-data',
        relativeSelector:
          '.copilot/installed-plugins/<marketplace>/<plugin>, and the directories the editor plugin settings register',
        traversal: 'explicit-registration',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.plugins',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-plugins',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure plugin marketplaces', 'Use local plugins'],
          reviewedOn: '2026-08-25',
          establishes:
            'An editor session gets its plugins from marketplaces registered through the chat.plugins.marketplaces setting and from directories registered by absolute path in chat.pluginLocations, each carrying an enabled or disabled state of its own.',
        },
        {
          sourceId: 'github.copilot.plugins',
          url: 'https://docs.github.com/en/copilot/concepts/agents/about-plugins',
          officialHost: 'docs.github.com',
          sections: ['Where can I get plugins?'],
          reviewedOn: '2026-07-15',
          establishes:
            'A plugin is installed from a marketplace, a repository, or a local path, and which plugins a client turns on is settings and installed state rather than a property of an authored catalog.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User plugins: the installed copies under the user's home and the
 * personal settings that enable them.
 *
 * Recorded so `copilot.excluded.user-runtime` can name what it leaves out.
 * Installation and enablement are what a session runs; a repository's catalog
 * says what it offers (FR-009).
 */
export const COPILOT_CLI_USER_PLUGINS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.plugins',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // `~/.copilot` is this product's own home, but the settings file
        // beside the installed copies is read as personal data of the same
        // scope, so one statement covers both from the profile base.
        lookupBase: 'profile-data',
        relativeSelector:
          '.copilot/installed-plugins/<marketplace>/<plugin>; .copilot/settings.json enabledPlugins and extraKnownMarketplaces',
        traversal: 'explicit-registration',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.plugins',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-plugin-reference',
          officialHost: 'docs.github.com',
          sections: ['File locations'],
          reviewedOn: '2026-08-25',
          establishes:
            'Installed plugins live under ~/.copilot/installed-plugins, by marketplace and plugin name for a marketplace install and under a direct-source directory otherwise.',
        },
        {
          sourceId: 'github.copilot.plugins',
          url: 'https://docs.github.com/en/copilot/concepts/agents/about-plugins',
          officialHost: 'docs.github.com',
          sections: ['Where can I get plugins?'],
          reviewedOn: '2026-07-15',
          establishes:
            'The CLI installs a plugin through its install command or slash command, or by naming it in the enabledPlugins field of a user-level ~/.copilot/settings.json or a repository-level .github/copilot/settings.json.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Copilot CLI's experimental personal extensions, recorded so
 * `copilot.excluded.user-runtime` can name what it leaves out. The same
 * executable-JavaScript shape as the project extensions this product also
 * admits nothing from, in the user's own home instead of a repository.
 */
export const COPILOT_CLI_USER_EXTENSIONS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.extensions',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'profile-data',
        relativeSelector: '.copilot/extensions/<name>/extension.mjs; extension.cjs; extension.js',
        traversal: 'standard-location-chain',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['experimental'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.extensions',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/about-cli-extensions',
          officialHost: 'docs.github.com',
          sections: ['How extensions are discovered', 'Choosing where an extension lives'],
          reviewedOn: '2026-07-15',
          establishes:
            'The CLI looks for extensions in a repository .github/extensions directory and in ~/.copilot/extensions, each extension being a named subdirectory whose entry file is extension.mjs, extension.cjs, or extension.js that the CLI runs with Node.js.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud agent plugins: the hosted side of the same two repository
 * settings keys, plus the copies the hosted agent runs.
 *
 * A statement rather than a rule: the settings file it names is admitted by
 * the settings rules as the authored file it is, and whether a hosted session
 * has a plugin installed, available, or turned on is state this product never
 * reads (FR-009).
 */
export const COPILOT_CLOUD_PLUGINS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.plugins',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'hosted-managed',
        lookupBase: 'hosted-state',
        // The hosted copies have no path a reader could open; the repository
        // keys that name them are the settings rules' own file.
        relativeSelector: null,
        traversal: 'none',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.plugins',
          url: 'https://docs.github.com/en/copilot/concepts/agents/about-plugins',
          officialHost: 'docs.github.com',
          sections: ['Where can I get plugins?', 'How plugin marketplaces work'],
          reviewedOn: '2026-07-15',
          establishes:
            'The cloud agent turns plugins on declaratively through the enabledPlugins field of a repository .github/copilot/settings.json, with extraKnownMarketplaces naming a marketplace that is not registered by default, and a marketplace is a marketplace.json listing the plugins it makes available.',
        },
        {
          sourceId: 'vscode.copilot.plugins',
          url: 'https://code.visualstudio.com/docs/agent-customization/agent-plugins',
          officialHost: 'code.visualstudio.com',
          sections: ['Configure plugin marketplaces'],
          reviewedOn: '2026-08-25',
          establishes:
            'The same registered-marketplace and enabled-plugin keys are the cross-tool spelling a repository carries, so what a hosted session runs is that state rather than the authored catalog itself.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The Copilot CLI's documented `.github/lsp.json` project LSP configuration,
 * recorded so `copilot.excluded.cli-lsp` can name what it leaves out. It is
 * language-server configuration rather than an agent customization, so it is
 * not a Supported Initial Release Customization File and no rule admits it.
 */
export const COPILOT_CLI_LSP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.lsp',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/lsp.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.lsp',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers',
          officialHost: 'docs.github.com',
          sections: ['How to add an LSP server', 'How LSP servers are loaded'],
          reviewedOn: '2026-08-23',
          establishes:
            'The CLI loads LSP server configuration from the project .github/lsp.json first, then plugin-provided servers, then the user ~/.copilot/lsp-config.json, with a higher-priority source overriding a lower one of the same server name.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The CLI's User settings layer, a non-authorizing fact: it is one layer of
 * the same cascade `copilot.behavior.cli.settings` records, and it lies
 * outside the Repository Source this release reads.
 */
export const COPILOT_CLI_USER_SETTINGS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.settings',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Configuration file settings'],
          reviewedOn: '2026-08-23',
          establishes:
            'User settings live at ~/.copilot/settings.json — relocatable through COPILOT_HOME — and sit below the repository and local layers in the documented cascade.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * The CLI's User LSP configuration, a non-authorizing fact for the same
 * reason its Repository sibling is recorded: it is the lowest layer of the
 * LSP priority the excluded project file belongs to.
 */
export const COPILOT_CLI_USER_LSP_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.lsp',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'lsp-config.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.cli.lsp',
          url: 'https://docs.github.com/en/copilot/concepts/agents/copilot-cli/lsp-servers',
          officialHost: 'docs.github.com',
          sections: ['How LSP servers are loaded'],
          reviewedOn: '2026-08-23',
          establishes:
            'The user configuration ~/.copilot/lsp-config.json is the lowest of the three documented LSP priorities, below the project file and plugin-provided servers.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * VS Code's User settings scope, a non-authorizing fact: it is the scope the
 * workspace settings this product reads sit above, and it lies outside the
 * Repository Source.
 */
export const COPILOT_VSCODE_USER_SETTINGS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.settings',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'profile-data',
        relativeSelector: 'settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.settings',
          url: 'https://code.visualstudio.com/docs/configure/settings',
          officialHost: 'code.visualstudio.com',
          sections: ['User settings', 'Profile settings', 'Settings precedence'],
          reviewedOn: '2026-08-23',
          establishes:
            'User settings apply globally to every VS Code instance and are overridden by workspace settings, with profile, remote, and language-specific scopes participating in the same documented order.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code workspace hooks: the root `.github/hooks/*.json` files and
 * the two Claude-format settings documents the editor also reads, which
 * `copilot.repo.hooks`, `copilot.repo.hooks.settings.claude`, and their
 * declarations rest on.
 *
 * The editor's own settings document is not here, and the omission is the
 * page's: its hook-locations table names `.github/hooks/*.json` and the
 * `.claude/settings*.json` pair for the workspace scope, so the CLI's
 * `.github/copilot/settings.json` is a hook source this surface documents no
 * read of. `copilot.behavior.cli.hooks` is where that file's inline block
 * belongs.
 *
 * Which of the located hooks then runs, and whether the feature is on at all,
 * is `copilot.vscode.hooks.composition` and the runtime conditions it retains
 * (FR-009): this statement is the lookup alone.
 */
export const COPILOT_VSCODE_HOOKS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.hooks',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'workspace-root',
        relativeSelector:
          '.github/hooks/*.json; .claude/settings.json; .claude/settings.local.json',
        // The page's table gives fixed workspace locations: a directory whose
        // `*.json` files are loaded and two named files. The configurable
        // `chat.hookFilesLocations` entries and the opt-in parent-repository
        // discovery are runtime inputs this tool never observes.
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['preview'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.hooks',
          url: 'https://code.visualstudio.com/docs/agent-customization/hooks',
          officialHost: 'code.visualstudio.com',
          sections: ['Hook file locations', 'Hook configuration format', 'Agent-scoped hooks'],
          reviewedOn: '2026-08-26',
          establishes:
            'VS Code loads workspace hooks from .github/hooks/*.json and, in the Claude format, from .claude/settings.json and .claude/settings.local.json; workspace hooks take precedence over user hooks for the same event type. A hook configuration file is JSON with a hooks object holding an array of hook commands per event, the same format Claude Code and Copilot CLI use. A custom agent may add a hooks field to its frontmatter, whose hooks run in addition to the workspace and user hooks for the same event.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot VS Code User hooks: the home hooks directory and the User Claude
 * settings document. Recorded for maintenance only — the vendor contract's
 * `copilot.excluded.user-runtime` keeps the surface out of the read
 * allowlist, and it is what the composition strategy resolves the workspace
 * hooks against.
 */
export const COPILOT_VSCODE_USER_HOOKS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.vscode.user.hooks',
  tool: 'copilot',
  surfaces: ['copilot-vscode'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        // The CLI's product home and Claude's home directory, neither of them
        // the editor's own profile storage.
        lookupBase: 'profile-data',
        relativeSelector: '.copilot/hooks/*.json; .claude/settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: ['preview'],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'vscode.copilot.hooks',
          url: 'https://code.visualstudio.com/docs/agent-customization/hooks',
          officialHost: 'code.visualstudio.com',
          sections: ['Hook file locations'],
          reviewedOn: '2026-08-26',
          establishes:
            'The user scope of the hook-locations table names ~/.copilot/hooks and ~/.claude/settings.json, and the default chat.hookFilesLocations value includes the user Claude settings document.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI Repository hooks: the root `.github/hooks/*.json` files and the
 * inline `hooks` block of each supported repository settings document — the
 * CLI's own pair and the two cross-tool Claude files it also reads.
 *
 * One statement for both spellings because the page presents them as two
 * sources of one repository-scoped lookup, and both are located from the
 * repository root. The rules resting on it split by surface rather than by
 * spelling: what the editor documents no read of stays out of that rule's
 * behavior references.
 */
export const COPILOT_CLI_HOOKS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.hooks',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector:
          '.github/hooks/*.json; inline hooks in .github/copilot/settings.json, .github/copilot/settings.local.json, .claude/settings.json, .claude/settings.local.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations', 'Hook configuration format'],
          reviewedOn: '2026-08-26',
          establishes:
            'Copilot CLI loads repository-level hook files from .github/hooks/*.json in the repository root and an inline hooks block from the top level of .github/copilot/settings.json or .github/copilot/settings.local.json, and it also reads the cross-tool .claude/settings.json and .claude/settings.local.json files in the repository. Hook configuration files are JSON with version 1, where a structural error rejects the whole file while a malformed item inside a directory-loaded file drops only that item, and a malformed item in an inline settings block rejects the whole hooks field.',
        },
        {
          sourceId: 'github.copilot.cli.configuration',
          url: 'https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-config-dir-reference',
          officialHost: 'docs.github.com',
          sections: ['Repository settings (.github/copilot/settings.json)'],
          reviewedOn: '2026-08-23',
          establishes:
            'The repository configuration file supports a top-level hooks object holding the hook definitions scoped to that repository, merged with the user configuration so the repository entry overrides the user one for the same key.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot CLI User hooks: the hooks directory of the configuration home and
 * the inline block of its `settings.json`. Recorded for maintenance only —
 * `copilot.excluded.user-runtime` keeps the surface out of the read allowlist.
 *
 * The base is the product home rather than a fixed path, because the
 * documented location moves with `COPILOT_HOME` when it is set.
 */
export const COPILOT_CLI_USER_HOOKS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cli.user.hooks',
  tool: 'copilot',
  surfaces: ['copilot-cli'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'user',
        lookupBase: 'tool-home',
        relativeSelector: 'hooks/*.json; inline hooks in settings.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations'],
          reviewedOn: '2026-08-26',
          establishes:
            'User-level hook files are the *.json files of the user hooks directory — ~/.copilot/hooks/ by default, or $COPILOT_HOME/hooks/ when that variable is set — and a user-level inline hooks block sits at the top level of ~/.copilot/settings.json.',
        },
      ]
    : [],
} as const satisfies VendorBehaviorStatement;

/**
 * Copilot cloud-agent hooks: the repository hook files present in the
 * ephemeral clone, which is the only hook source that environment documents.
 *
 * The settings spellings are absent for the same reason the editor's are: the
 * page names `.github/hooks/*.json` for this surface and nothing else, so a
 * cloud read of an inline settings block is undocumented rather than implied.
 */
export const COPILOT_CLOUD_HOOKS_BEHAVIOR = {
  behaviorId: 'copilot.behavior.cloud.hooks',
  tool: 'copilot',
  surfaces: ['copilot-cloud'],
  locator: SHIPS_MAINTENANCE_DATA
    ? {
        vendorScope: 'repository',
        lookupBase: 'repository-root',
        relativeSelector: '.github/hooks/*.json',
        traversal: 'exact',
      }
    : null,
  documentationStatus: 'documented',
  lifecycleQualifiers: [],
  evidence: SHIPS_MAINTENANCE_DATA
    ? [
        {
          sourceId: 'github.copilot.hooks',
          url: 'https://docs.github.com/en/copilot/reference/hooks-reference',
          officialHost: 'docs.github.com',
          sections: ['Hooks locations', 'Cloud agent execution environment'],
          reviewedOn: '2026-08-26',
          establishes:
            'Under the Copilot cloud agent, hook configuration is loaded from .github/hooks/*.json files in the cloned repository, hooks run in an ephemeral non-interactive Linux sandbox, a subset of events fires, and only bash or command entries are honored.',
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
  [COPILOT_VSCODE_USER_AGENTS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_AGENTS_BEHAVIOR,
  [COPILOT_CLOUD_ORGANIZATION_AGENTS_BEHAVIOR.behaviorId]:
    COPILOT_CLOUD_ORGANIZATION_AGENTS_BEHAVIOR,
  [COPILOT_CLOUD_AGENTS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_AGENTS_BEHAVIOR,
  [COPILOT_CLI_USER_AGENTS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_AGENTS_BEHAVIOR,
  [COPILOT_CLI_AGENTS_BEHAVIOR.behaviorId]: COPILOT_CLI_AGENTS_BEHAVIOR,
  [COPILOT_CLI_COMMANDS_BEHAVIOR.behaviorId]: COPILOT_CLI_COMMANDS_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_AGENTS_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_GEMINI_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]: COPILOT_CLI_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR.behaviorId]:
    COPILOT_CLI_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  [COPILOT_CLI_MCP_BEHAVIOR.behaviorId]: COPILOT_CLI_MCP_BEHAVIOR,
  [COPILOT_CLI_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_SKILLS_BEHAVIOR,
  [COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]:
    COPILOT_CLI_USER_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR.behaviorId]:
    COPILOT_CLI_USER_INSTRUCTIONS_ROOT_BEHAVIOR,
  [COPILOT_CLI_USER_MCP_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_MCP_BEHAVIOR,
  [COPILOT_CLI_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_SKILLS_BEHAVIOR,
  [COPILOT_CLOUD_MCP_BEHAVIOR.behaviorId]: COPILOT_CLOUD_MCP_BEHAVIOR,
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
  [COPILOT_VSCODE_AGENTS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_AGENTS_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_AGENTS_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_CLAUDE_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR.behaviorId]: COPILOT_VSCODE_INSTRUCTIONS_PATH_BEHAVIOR,
  [COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR.behaviorId]:
    COPILOT_VSCODE_INSTRUCTIONS_REPOSITORY_BEHAVIOR,
  [COPILOT_VSCODE_MCP_BEHAVIOR.behaviorId]: COPILOT_VSCODE_MCP_BEHAVIOR,
  [COPILOT_VSCODE_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_SKILLS_BEHAVIOR,
  [COPILOT_VSCODE_PROMPTS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_PROMPTS_BEHAVIOR,
  [COPILOT_VSCODE_USER_MCP_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_MCP_BEHAVIOR,
  [COPILOT_VSCODE_USER_PROMPTS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_PROMPTS_BEHAVIOR,
  [COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_CLAUDE_BEHAVIOR,
  [COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_INSTRUCTIONS_BEHAVIOR,
  [COPILOT_VSCODE_USER_SKILLS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_SKILLS_BEHAVIOR,
  [COPILOT_CLI_EXTENSIONS_BEHAVIOR.behaviorId]: COPILOT_CLI_EXTENSIONS_BEHAVIOR,
  [COPILOT_CLI_USER_EXTENSIONS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_EXTENSIONS_BEHAVIOR,
  [COPILOT_CLI_LSP_BEHAVIOR.behaviorId]: COPILOT_CLI_LSP_BEHAVIOR,
  [COPILOT_CLI_PLUGINS_BEHAVIOR.behaviorId]: COPILOT_CLI_PLUGINS_BEHAVIOR,
  [COPILOT_CLI_USER_PLUGINS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_PLUGINS_BEHAVIOR,
  [COPILOT_VSCODE_PLUGINS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_PLUGINS_BEHAVIOR,
  [COPILOT_VSCODE_USER_PLUGINS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_PLUGINS_BEHAVIOR,
  [COPILOT_CLOUD_PLUGINS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_PLUGINS_BEHAVIOR,
  [COPILOT_CLI_SETTINGS_BEHAVIOR.behaviorId]: COPILOT_CLI_SETTINGS_BEHAVIOR,
  [COPILOT_CLI_USER_LSP_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_LSP_BEHAVIOR,
  [COPILOT_CLI_USER_SETTINGS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_SETTINGS_BEHAVIOR,
  [COPILOT_VSCODE_SETTINGS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_SETTINGS_BEHAVIOR,
  [COPILOT_VSCODE_USER_SETTINGS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_SETTINGS_BEHAVIOR,
  [COPILOT_VSCODE_HOOKS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_HOOKS_BEHAVIOR,
  [COPILOT_VSCODE_USER_HOOKS_BEHAVIOR.behaviorId]: COPILOT_VSCODE_USER_HOOKS_BEHAVIOR,
  [COPILOT_CLI_HOOKS_BEHAVIOR.behaviorId]: COPILOT_CLI_HOOKS_BEHAVIOR,
  [COPILOT_CLI_USER_HOOKS_BEHAVIOR.behaviorId]: COPILOT_CLI_USER_HOOKS_BEHAVIOR,
  [COPILOT_CLOUD_HOOKS_BEHAVIOR.behaviorId]: COPILOT_CLOUD_HOOKS_BEHAVIOR,
};
