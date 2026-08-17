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
import type { FileDetailDto, FrontmatterKeyKind, ScanProgressPhase } from './api-types';
import { CUSTOMIZATION_KIND_TEXT } from './entities';

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
 * 'skill' shares the customization kind's own caption, so a skill reads the
 * same wherever it is named; 'file' states the honest fact that no
 * recognition owns the file, never a fabricated kind (FR-012).
 */
export const FILE_DETAIL_KIND_TEXT: Readonly<Record<FileDetailDto['kind'], string>> = {
  /** Caption for a detail a skill recognition owns. */
  skill: CUSTOMIZATION_KIND_TEXT.skill,
  /** Caption for a census-listed or otherwise unrecognized file's detail. */
  file: 'No recognized kind',
};

/**
 * What a declared key's parsed type reads as
 * (api-types.ts § FrontmatterKeyKind). Every surface that draws declared
 * keys captions a key whose parsed type is not the string default — the
 * shared rule that keeps a numeric `1` apart from the string `"1"` it
 * renders like (FR-025).
 */
export const FRONTMATTER_KEY_KIND_TEXT: Readonly<Record<FrontmatterKeyKind, string>> = {
  /** Caption for a string key. */
  string: 'string key',
  /** Caption for a number key. */
  number: 'number key',
  /** Caption for a boolean key. */
  boolean: 'boolean key',
  /** Caption for a null key. */
  null: 'null key',
};
