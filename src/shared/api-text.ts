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
import type { ScanProgressPhase } from './api-types';

/**
 * What a running scan is doing, shown while it runs. Each names the work in the
 * reader's terms rather than in the pipeline's: `enumerating` and `deriving`
 * are stages of the traversal, and a reader watching a progress line wants to
 * know what is happening to their repository (FR-007).
 */
export const SCAN_PROGRESS_PHASE_TEXT: Readonly<Record<ScanProgressPhase, string>> = {
  /** Label for an admitted attempt that has not started. */
  waiting: 'Waiting to start',
  /** Label for an attempt winding down after its authority was revoked. */
  cancelling: 'Stopping',
  /** Label for the allowlisted traversal finding candidates. */
  enumerating: 'Looking for customization files',
  /** Label for candidate bytes being read. */
  reading: 'Reading file contents',
  /** Label for derived traversal rules being expanded. */
  deriving: 'Following what those files point to',
  /** Label for recognizers and parsers processing readable candidates. */
  recognizing: 'Recognizing what each file is',
  /** Label for the terminal progress state. */
  complete: 'Finished',
};
