// The `RuntimeCompositionStrategy` record shape and its closed operation
// vocabulary (data-model.md § RuntimeCompositionStrategy).
//
// Declared apart from the aggregate so each vendor catalog can author against
// the shape without importing the module that collects those catalogs, which
// would be a cycle. Ships zero runtime code — the `-types` name records that.
import type { ConditionFactKey } from '../api-types';
import type { DocumentationStatus, LifecycleQualifier, SupportedTool } from '../entities';
import type { StrategyId } from './identifier-types';
import type { EvidenceCitation } from './evidence-types';
import type { VendorSurface } from './behavior-types';

/**
 * The closed composition operations of a strategy, in documented pipeline
 * order (data-model.md § RuntimeCompositionStrategy `operations`).
 */
export type CompositionOperation =
  /** Documented inputs are appended in order. */
  | 'append'
  /** Documented inputs are concatenated into one text. */
  | 'concatenate'
  /** The first matching documented input wins. */
  | 'select-first'
  /** The closest documented input to the runtime context wins. */
  | 'select-closest'
  /** A later documented input replaces an earlier one. */
  | 'replace'
  /** Map entries from several inputs are merged by key. */
  | 'merge-map'
  /** Duplicate documented inputs collapse to one. */
  | 'deduplicate'
  /** Documented inputs are filtered by a documented condition. */
  | 'filter'
  /**
   * Every documented input remains available and none is merged away. Stated
   * rather than inferred: this array records the steps a source documents, not
   * the steps it rules out, so the absence of a collapsing operation says
   * nothing about what survives (data-model.md § RuntimeCompositionStrategy).
   */
  | 'retain-all'
  /** The documentation does not establish an order for this step. */
  | 'unknown-order';

/**
 * One documented runtime composition or projection strategy
 * (data-model.md § RuntimeCompositionStrategy).
 *
 * Cross-registry references are not fields here: they live in
 * `relation-types.ts` and each vendor's `<tool>/relations.ts`, so a record
 * describes only what the thing is. The behaviors a strategy composes are
 * `StrategyRelations.consumesBehaviors`.
 */
export interface RuntimeCompositionStrategy {
  /** Stable ID from the closed catalog, defined once in the runtime-composition contract. */
  readonly strategyId: StrategyId;
  /** The product whose documented composition this records. */
  readonly tool: SupportedTool;
  /** Non-empty exact surface boundary the composition applies to. */
  readonly surfaces: readonly VendorSurface[];
  /** Non-empty operations in documented pipeline order. */
  readonly operations: readonly CompositionOperation[];
   /** Inputs required before a terminal applicability result is permitted. */
  readonly requiredConditionKeys: readonly ConditionFactKey[];
  /** How completely official sources establish the operations (QR-005). */
  readonly documentationStatus: DocumentationStatus;
  /** Upstream lifecycle claims in the fixed order; empty is not `stable`. */
  readonly lifecycleQualifiers: readonly LifecycleQualifier[];
  /**
   * The reviewed official sections this record was checked against, and what
   * each establishes. Empty in a packaged CLI: citations are maintenance
   * evidence the product never reads (see `evidence-types.ts`).
   */
  readonly evidence: readonly EvidenceCitation[];
}
