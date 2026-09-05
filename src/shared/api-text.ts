// The words the closed unions of `api-types.ts` stand for on screen
// (AGENTS.md User-visible copy policy).
//
// A wire vocabulary is written for the contract that carries it: `recognizing`
// and `enumerating` are exact tokens a response is checked against, not
// sentences anyone would read. Every surface therefore renders the statement a
// member names, never the member.
//
// The table is a module of its own because `api-types.ts` ships zero runtime
// code by contract — the `-types` name records that — and a table is runtime
// data. `Readonly<Record<Union, string>>` still does the work the policy asks
// of it wherever the table lives: a new member cannot compile until someone has
// decided how it reads.
import type {
  GlobalDisableState,
  FileDetailDto,
  FileOpenTarget,
  GlobalMemberId,
  GlobalRootInputState,
  GlobalRootOrigin,
  GlobalToolFailureCode,
  GlobalToolState,
  HookCarrierForm,
  PluginCarrierKind,
  PluginSourceForm,
  ScanProgressPhase,
  SourceKind,
  SourceSelector,
} from './api-types';
import { CUSTOMIZATION_KIND_TEXT, SUPPORTED_TOOL_ORDER } from './entities';

/**
 * What each application a file can be opened in reads as, in the menu and in
 * the accessible name of the control that opens it
 * (contracts/http-api.md § open-file). `default-application` is a contract
 * token; a reader choosing it is choosing what their machine already does with
 * that kind of file, which is what the caption says.
 */
export const FILE_OPEN_TARGET_TEXT: Readonly<Record<FileOpenTarget, string>> = {
  /** Caption for the Visual Studio Code installation the host resolved. */
  'visual-studio-code': 'Open in VS Code',
  /** Caption for the Sublime Text installation the host resolved. */
  'sublime-text': 'Open in Sublime Text',
  /**
   * Caption for the reader's own `$EDITOR`. It names the kind of editor rather
   * than the editor, because which one it is belongs to that reader's
   * environment and this table is fixed text.
   */
  'terminal-editor': 'Open in your terminal editor',
  /** Caption for the reader's own registered handler for the file type. */
  'default-application': 'Open with the default application',
  /**
   * Caption for the directory the file is in, in the machine's file manager.
   * It says what the action does rather than borrowing a platform's word for
   * it — "Reveal in Finder", "Show in Explorer" — because those name one
   * machine's application and promise the file is selected inside the folder,
   * which is more than the host does: it opens the folder.
   */
  'containing-folder': 'Open the folder this file is in',
};

/**
 * What a running scan is doing, shown while it runs. Each names the work in the
 * reader's terms rather than in the pipeline's: `deriving` is the
 * configuration read that precedes the walk and `enumerating` the walk itself,
 * and a reader watching a progress line wants to know what is happening to
 * their repository (FR-007).
 */
export const SCAN_PROGRESS_PHASE_TEXT: Readonly<Record<ScanProgressPhase, string>> = {
  /** Label for an admitted attempt that has not started. */
  waiting: 'Waiting to start',
  /** Label for an attempt winding down after its authority was revoked. */
  cancelling: 'Stopping',
  /** Label for the configuration read that decides part of what is scanned. */
  deriving: 'Reading configuration that decides what to scan',
  /** Label for the allowlisted traversal finding candidates. */
  enumerating: 'Looking for customization files',
  /** Label for candidate bytes being read. */
  reading: 'Reading file contents',
  /** Label for recognizers and parsers processing readable candidates. */
  recognizing: 'Recognizing what each file is',
  /** Label for the terminal progress state. */
  complete: 'Finished',
};

/**
 * What each plugin carrier kind reads as (see {@link PluginCarrierKind}).
 * Beside the union rather than in the row component, so a member added to the
 * union cannot compile without its label.
 */
export const PLUGIN_CARRIER_TEXT: Readonly<Record<PluginCarrierKind, string>> = {
  /** Caption for the plugin's own manifest. */
  manifest: 'Manifest',
  /** Caption for a catalog listing the plugin. */
  catalog: 'Catalog entry',
};

/**
 * The label shown for each hook carrier form (see {@link HookCarrierForm}):
 * what kind of file a declaration was authored in, which a row states because
 * one config layer can hold both forms and the vendor loads both.
 */
export const HOOK_CARRIER_FORM_TEXT: Readonly<Record<HookCarrierForm, string>> = {
  /** A file whose whole purpose is hooks, such as a Codex `.codex/hooks.json`. */
  standalone: 'hook file',
  /** A hook table inside a file admitted for other content too, such as an inline Codex `[hooks]`. */
  contained: 'declared inside another file',
};

/**
 * What each kind of plugin source reads as inside the sentence a surface
 * writes about a plugin whose files this scan does not hold — "This offering
 * names <text>" (see {@link PluginSourceForm}).
 *
 * A noun phrase rather than a whole sentence, because the two surfaces that
 * state the absence — the plugin's own page and the comparison's manifest
 * section — write the same clause around it. The vendor's own token is never
 * one of these: `git-subdir` is a key a catalog author writes, not a thing to
 * read (AGENTS.md § User-visible copy policy).
 */
export const PLUGIN_SOURCE_FORM_TEXT: Readonly<Record<PluginSourceForm, string>> = {
  /**
   * Read only where the declared path leaves the Source: a directory the
   * Source holds is named by the path itself, which the surfaces draw. "Local"
   * rather than "repository", because the same form is the personal Codex
   * catalog's, whose base is the home directory rather than a repository
   * (contracts/vendors/openai-codex.md § Derived Repository rules).
   */
  'repository-directory': 'a local directory',
  /** A GitHub repository the client clones. */
  'github-repository': 'a GitHub repository',
  /** A Git repository named by its URL. */
  'git-repository': 'a Git repository',
  /** A subdirectory inside a Git repository. */
  'git-subdirectory': 'a subdirectory of a Git repository',
  /** A package installed from an npm registry. */
  'npm-package': 'an npm package',
  /** A zip archive downloaded over HTTPS. */
  'zip-archive': 'a zip archive',
  /** A directory produced by a command on the reader's own machine. */
  'command-output': 'a directory a local command produces',
  /** A source in no form the product that reads this catalog documents. */
  unrecognized: 'a source in no form this product recognizes',
};

/**
 * What a file detail's kind reads as (contracts/http-api.md § get-file-detail).
 * Every kind a recognition owns shares that customization kind's own caption,
 * so each reads the same wherever it is named, and they are listed in the
 * closed kind order (`entities.ts` § CUSTOMIZATION_KIND_ORDER); 'file' follows
 * because it is not a customization kind, and it states the honest fact that
 * no recognition owns the file, never a fabricated kind (FR-012).
 */
export const FILE_DETAIL_KIND_TEXT: Readonly<Record<FileDetailDto['kind'], string>> = {
  /** Caption for a detail an instructions recognition owns. */
  instructions: CUSTOMIZATION_KIND_TEXT.instructions,
  /** Caption for a detail a skill recognition owns. */
  skill: CUSTOMIZATION_KIND_TEXT.skill,
  /** Caption for a detail a custom-agent recognition owns. */
  agent: CUSTOMIZATION_KIND_TEXT.agent,
  /** Caption for a detail a command recognition owns. */
  'prompt/command': CUSTOMIZATION_KIND_TEXT['prompt/command'],
  /** Caption for a detail a rule recognition owns. */
  rule: CUSTOMIZATION_KIND_TEXT.rule,
  /** Caption for a detail an output-style recognition owns. */
  'output style': CUSTOMIZATION_KIND_TEXT['output style'],
  /** Caption for a detail a settings-or-configuration recognition owns. */
  'settings/config': CUSTOMIZATION_KIND_TEXT['settings/config'],
  /** Caption for a census-listed or otherwise unrecognized file's detail. */
  file: 'No recognized kind',
};

/**
 * What each Source family reads as wherever a family heads a group — the
 * inventory's family blocks and the "All sources" side of its Source filter.
 * The repository is named by the same word its own summary panel is headed
 * by, and the consented homes by the phrase the consent page and its panel
 * already use for them, so one thing has one name across the product. The
 * filter's own options are per Source — the repository through this table's
 * word, each consented home through its member's name
 * (`GLOBAL_MEMBER_TEXT`) — because which Source holds a file is the question
 * that filter answers (FR-006).
 */
export const SOURCE_KIND_TEXT: Readonly<Record<SourceKind, string>> = {
  /** The one Source selected from the invocation Repository boundary. */
  repository: 'Repository',
  /** Every consent-gated Global Source: the reader's own configuration directories. */
  global: 'Your personal setup',
};

/**
 * The one contracted member order every Global projection uses: the three
 * tools in their own fixed order, then the shared agent home
 * (spec.md § FR-013; contracts/http-api.md § create-global-consent-preview).
 * The capture reads the environment in this order and the confirmation fixes
 * `confirmedTools` to the same closed sequence.
 */
export const GLOBAL_MEMBER_ORDER: readonly GlobalMemberId[] = [...SUPPORTED_TOOL_ORDER, 'agents'];

/**
 * What each Global member reads as wherever a preview row, control, or Source
 * summary names one: a member is a *directory*, so each is named for the
 * directory it is rather than for a product.
 *
 * Not the tools' own captions, which is what a member label spread from
 * `SUPPORTED_TOOL_TEXT` used to be. A member says where a file came from and a
 * recognition says which product reads it, and those are different questions
 * with different answers: `~/.agents` is one directory that Codex and Copilot
 * both read (FR-045), so no product names it — and on a row that states both,
 * a product-named member said the same product twice while meaning something
 * else by it.
 */
export const GLOBAL_MEMBER_TEXT: Readonly<Record<GlobalMemberId, string>> = {
  /** `~/.config/github-copilot` and its siblings: Copilot's own directory. */
  copilot: 'Copilot home',
  /** `~/.claude`: Claude Code's own directory. */
  claude: 'Claude home',
  /** `~/.codex`: Codex's own directory. */
  codex: 'Codex home',
  /** `~/.agents`: the directory Codex and Copilot both read (FR-045). */
  agents: 'Shared agent home',
};

/**
 * What each Source route token reads as where a surface names the Source
 * itself — a detail or comparison document title (WCAG 2.4.2). The repository
 * by its family's word and a consented home by its member's name, spread from
 * the tables those surfaces already use so one thing keeps one name.
 */
export const SOURCE_SELECTOR_TEXT: Readonly<Record<SourceSelector, string>> = {
  repository: SOURCE_KIND_TEXT.repository,
  'global-copilot': GLOBAL_MEMBER_TEXT.copilot,
  'global-claude': GLOBAL_MEMBER_TEXT.claude,
  'global-codex': GLOBAL_MEMBER_TEXT.codex,
  'global-agents': GLOBAL_MEMBER_TEXT.agents,
};

/**
 * What each disable-barrier state reads as on the fenced recovery view
 * (contracts/http-api.md § disable-global; api-types.ts § GlobalDisableState).
 * The table sits beside the closed union's consumers so a new member cannot
 * ship without its sentence (AGENTS.md § User-visible copy policy).
 */
export const GLOBAL_DISABLE_STATE_TEXT: Readonly<Record<GlobalDisableState, string>> = {
  /** Accepted; the barrier is waiting out the work it revoked. */
  draining: 'Disabling is in progress: waiting for the running work to stop.',
  /** Drained; the one atomic removal is being committed. */
  committing: 'Disabling is in progress: removing the personal-setup results.',
  /** A cleanup failure was retained; the reader can retry or restart. */
  failed: 'Disabling failed before it finished. Nothing has been re-exposed.',
};

/**
 * What each Global lexical state reads as on the consent page. The states are
 * decided from the captured string alone, so each sentence says what about the
 * string decided it — never whether the directory exists, which no preview has
 * looked at (data-model.md § RootPresentationEncoding and Global lexical
 * state).
 */
export const GLOBAL_ROOT_INPUT_STATE_TEXT: Readonly<Record<GlobalRootInputState, string>> = {
  /**
   * Caption for an absolute, well-formed root that consent may admit. Stated as
   * a fact about the captured string rather than as a promise, because the
   * table is shown both before a confirmation and after one: a row that has
   * been read cannot say it is ready to be read once the reader confirms, and
   * what became of each tool is the consent page's own per-tool outcome.
   */
  eligible: 'An absolute path, so this tool can be inspected',
  /** Caption for an environment variable set to the empty string. */
  'present-empty': 'Set to an empty value, so nothing can be inspected for this tool',
  /** Caption for a root that is not absolute on this platform. */
  relative: 'Not an absolute path, so nothing can be inspected for this tool',
  /** Caption for a root holding U+0000 or ill-formed UTF-16. */
  invalid: 'Contains characters a path cannot hold, so nothing can be inspected for this tool',
};

/**
 * How each preview row's root was arrived at. The environment wording names
 * the variable's role rather than its value, because a row whose variable is
 * empty or relative still says `environment` — an override is used even when
 * it turns out to be unusable.
 */
export const GLOBAL_ROOT_ORIGIN_TEXT: Readonly<Record<GlobalRootOrigin, string>> = {
  /** Caption for a root derived from the home directory and the tool's suffix. */
  'default-home': 'Default location in your home directory',
  /** Caption for a root taken from the tool's own environment variable. */
  environment: 'From this tool’s environment variable',
};

/**
 * What each Global tool failure reads as. Every sentence says what about the
 * reader's own environment produced the outcome, because that is what they can
 * act on — and none of them names a path: the code carries no path or
 * environment value, and the frozen preview is where the exact root is shown
 * (data-model.md § GlobalToolControl `failureCode`).
 */
export const GLOBAL_TOOL_FAILURE_TEXT: Readonly<Record<GlobalToolFailureCode, string>> = {
  /** The environment variable exists but is empty. */
  'present-empty': 'This tool’s environment variable is set to an empty value.',
  /** The captured root is not absolute. */
  relative: 'This tool’s environment variable is not an absolute path.',
  /** The captured root cannot be a path. */
  invalid: 'This tool’s environment variable contains characters a path cannot hold.',
  /** The consented directory is missing or unreadable. */
  'root-unreadable': 'That directory does not exist or cannot be read.',
  /** The tool's own scan failed after its root was admitted. */
  'scan-failed': 'Reading this tool’s directory failed.',
};

/**
 * What each Global tool state reads as. `admitted` is phrased as the waiting
 * state it is: the root was accepted and nothing has been read from it yet,
 * which is what a reader sees between an `active-no-job` outcome and a retry.
 */
export const GLOBAL_TOOL_STATE_TEXT: Readonly<Record<GlobalToolState, string>> = {
  /** Label for a deterministically refused tool. */
  rejected: 'Not inspected',
  /** Label for an accepted root with nothing published from it yet. */
  admitted: 'Accepted, not yet read',
  /** Label for a tool with one published Source. */
  published: 'Inspected',
};
