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
import type { FileDetailDto, FileOpenTarget, ScanProgressPhase } from './api-types';
import { CUSTOMIZATION_KIND_TEXT } from './entities';

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
 * What a file detail's kind reads as (contracts/http-api.md § get-file-detail).
 * Every kind a recognition owns shares that customization kind's own caption,
 * so each reads the same wherever it is named; 'file' states the honest fact
 * that no recognition owns the file, never a fabricated kind (FR-012).
 */
export const FILE_DETAIL_KIND_TEXT: Readonly<Record<FileDetailDto['kind'], string>> = {
  /** Caption for a detail a skill recognition owns. */
  skill: CUSTOMIZATION_KIND_TEXT.skill,
  /** Caption for a detail an instructions recognition owns. */
  instructions: CUSTOMIZATION_KIND_TEXT.instructions,
  /** Caption for a detail a command recognition owns. */
  'prompt/command': CUSTOMIZATION_KIND_TEXT['prompt/command'],
  /** Caption for a detail a rule recognition owns. */
  rule: CUSTOMIZATION_KIND_TEXT.rule,
  /** Caption for a census-listed or otherwise unrecognized file's detail. */
  file: 'No recognized kind',
};
