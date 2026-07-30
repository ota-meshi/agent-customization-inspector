// The words each closed union of `api-types.ts` stands for on screen
// (AGENTS.md User-visible copy policy).
//
// A wire vocabulary is written for the contract that carries it: `conditional`,
// `runtime-cwd`, and `documentation-conflict` are exact tokens a response is
// checked against. None of them is a sentence anyone would read. Every surface
// therefore renders the statement a member names, never the member.
//
// The tables are a module of their own because `api-types.ts` ships zero
// runtime code by contract — the `-types` name records that — and a table is
// runtime data. `Readonly<Record<Union, string>>` still does the work the
// policy asks of it wherever the table lives: a new member cannot compile until
// someone has decided how it reads.
import type {
  ApplicabilitySummary,
  ConditionFactKey,
  ConditionFactStatus,
  ScanProgressPhase,
} from './api-types';

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

/**
 * The sentence shown for each applicability summary
 * (data-model.md § ApplicabilityAssessment). Each states what the retained
 * documentation proves rather than what the product does, so none of them can
 * be read as a claim that a file was loaded.
 */
export const APPLICABILITY_SUMMARY_TEXT: Readonly<Record<ApplicabilitySummary, string>> = {
  /** Label for a documented prohibition. */
  disabled: 'Documented as prohibited by a control this tool can read',
  /** Label for a proven precedence loss. */
  shadowed: 'Another candidate wins under a documented precedence rule',
  /** Label for a proven exclusion. */
  omitted: 'Excluded by a documented rule',
  /** Label for a proven inclusion. */
  selected: 'Selected by a documented rule',
  /** Label for absent or conflicting documentation. */
  unknown: 'Not determined — the documentation is absent or conflicting',
  /** Label for a documented path with unknown runtime inputs. */
  conditional: 'Depends on runtime conditions this tool does not evaluate',
  /** Label for satisfied availability with no selection claim. */
  available: 'Available; whether it is selected is not claimed',
  /** Label for a proven authored declaration and nothing more. */
  authored: 'Authored here; availability is not claimed',
};

/**
 * The phrase shown for each condition key
 * (data-model.md § ApplicabilityAssessment).
 *
 * Each names the input as something the reader could answer about their own
 * machine, because that is what an unobserved condition is: something knowable
 * that this product did not look at.
 */
export const CONDITION_FACT_KEY_TEXT: Readonly<Record<ConditionFactKey, string>> = {
  /** Phrase for the product-surface input. */
  surface: 'Which product surface is in use',
  /** Phrase for the engine-version input. */
  'engine-version': 'Which engine version is in use',
  /** Phrase for the runtime working-directory input. */
  'runtime-cwd': 'The directory the product is run from',
  /** Phrase for the workspace-root input. */
  'workspace-root': 'Which workspace root applies',
  /** Phrase for the repository-root input. */
  'repository-root': 'Which repository root applies',
  /** Phrase for the project-root input. */
  'project-root': 'Which project root applies',
  /** Phrase for the worked-path input. */
  'worked-path': 'Which path is being worked on',
  /** Phrase for the documented target matcher. */
  'target-match': 'Whether the documented target matcher applies',
  /** Phrase for scope availability. */
  'scope-availability': 'Whether the scope is available',
  /** Phrase for the feature-state input. */
  'feature-state': 'Whether the feature is turned on',
  /** Phrase for the workspace or runtime trust input. */
  trust: 'Whether the workspace is trusted',
  /** Phrase for the approval input. */
  approval: 'Whether the required approval was given',
  /** Phrase for the enablement input. */
  enablement: 'Whether this customization is enabled',
  /** Phrase for the selection input. */
  selection: 'Whether this customization is selected',
  /** Phrase for the relevant settings inputs. */
  'settings-inputs': 'Which settings apply',
  /** Phrase for the plugin-state input. */
  'plugin-state': 'Whether the owning plugin is installed and enabled',
  /** Phrase for the agent-context input. */
  'agent-context': 'Which agent context applies',
  /** Phrase for the event input. */
  event: 'Which event is being handled',
  /** Phrase for the documented behavior variant. */
  'documentation-variant': 'Which documented variant of the behavior applies',
  /** Phrase for tool availability. */
  'tool-availability': 'Whether the required tool is available',
  /** Phrase for the installation input. */
  installation: 'How the product is installed',
  /** Phrase for the managed-policy input. */
  'managed-policy': 'Which managed policy applies',
  /** Phrase for the instruction-byte-budget input. */
  'instruction-byte-budget': 'How much of the instruction byte budget is left',
  /** Phrase for the content-limit input. */
  'content-limits': 'Which content limits apply',
  /** Phrase for a required runtime input from outside every inspected Source. */
  'external-runtime': 'A runtime input from outside the inspected files',
};

/**
 * The predicate shown for each condition status, read after the key's phrase:
 * "The directory the product is run from — not observed by this tool".
 *
 * None of them says the condition holds here. A determination is what the
 * retained documentation establishes, and `unknown` says plainly that nothing
 * was looked at, so an absent input cannot read as a passing one.
 */
export const CONDITION_FACT_STATUS_TEXT: Readonly<Record<ConditionFactStatus, string>> = {
  /** Predicate for a documented determination that the condition holds. */
  satisfied: 'documented as holding',
  /** Predicate for a documented determination that the condition does not hold. */
  unsatisfied: 'documented as not holding',
  /** Predicate for a required input this product never reads. */
  unknown: 'not observed by this tool',
  /** Predicate for incompatible retained official assertions. */
  'documentation-conflict': 'the official documentation conflicts',
};
