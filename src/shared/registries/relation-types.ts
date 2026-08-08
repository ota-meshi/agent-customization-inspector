// The edges between the contract-versioned registries, declared apart from the
// records they connect.
//
// A record says what one thing *is*; a relation says how it *depends on*
// another registry. Keeping them apart means a vendor catalog reads as a
// description of that product, and the whole reference graph is reviewable in
// one file per vendor — including the fact that it is acyclic.
//
// The edge names say what the edge means, because `behaviorRefs` said only
// that a reference existed. There are exactly three kinds:
//
//   rule     --basedOnBehaviors-->      behavior     (why this policy exists)
//   rule     --explainedByStrategies--> strategy     (how order/selection reads)
//   strategy --consumesBehaviors-->     behavior     (what it composes)
//
// Every edge runs one way, so the graph is a DAG: behavior <- strategy <-
// rule. No edge grants read authority; only an `InspectionRule`'s own
// discovery class does (contracts/inspection-path-allowlist.md § Read
// authorization).
//
// Citations are not here either, but for the opposite reason: which
// documentation establishes a record is a fact about that record, so it lives
// in its own `evidence` array on the record itself, where a reader meets the
// claim and its basis together. It is maintenance evidence the shipped CLI must
// not carry and nothing in the product reads, so `tsdown.config.ts` compiles it
// out through the `__ACI_SHIP_MAINTENANCE_DATA__` define instead of separating
// it structurally.
//
// One reference kind deliberately stays on its record rather than moving here:
// `InspectionRule.policyRefs` names FR/QR clauses owned by spec.md, not another
// registry.
//
// An edge holds the referenced record itself, not its identifier, so reading
// a relation leads straight to the thing it names. The graph being acyclic is
// what makes that possible at all: `const` object references across a cycle
// would fail at module evaluation. Identity is a contract-gate obligation —
// an edge must hold the record the registry publishes, not an equal-looking
// copy — because the type alone cannot distinguish them.
//
// The conformance fixtures materialize every edge as an identifier: JSON has
// no references, and inlining a record would restate a normative definition
// that one contract alone owns.
//
// Ships zero runtime code — the `-types` name records that.
import type { VendorBehaviorStatement } from './behavior-types';
import type { RuntimeCompositionStrategy } from './strategy-types';

/** How one composition strategy depends on the other registries. */
export interface StrategyRelations {
  /**
   * The documented behaviors this strategy composes, sorted — every scope it
   * actually reads, User included: a behavior grants no read authority, so
   * naming one says what the product documents rather than what the Inspector
   * may open. What stays out is what the strategy does not compose at all:
   * excluded surfaces and hosted inputs, which remain explicit condition facts
   * (data-model.md § RuntimeCompositionStrategy).
   */
  readonly consumesBehaviors: readonly VendorBehaviorStatement[];
}

/** How one Inspector rule depends on the other registries. */
export interface RuleRelations {
  /**
   * The documented vendor behaviors this Inspector policy is based on,
   * sorted. The rule is not a restatement of them: a behavior says where the
   * vendor looks, this rule says what the Inspector may read, and the two
   * routinely differ — a vendor's upward ancestor walk terminates at the
   * repository root, which is the Inspector's selected root, so it becomes an
   * anchored matcher rather than a walk
   * (contracts/inspection-path-allowlist.md § "Vendor locators are not
   * Inspector matchers"). An exclusion may cite behavior it deliberately does
   * not authorize.
   */
  readonly basedOnBehaviors: readonly VendorBehaviorStatement[];
  /**
   * The composition strategies that explain this rule's documented order and
   * selection, sorted. Never used for path admission: a strategy cannot widen
   * what the matcher admits, and it states nothing about a concrete session —
   * what one documents for a name several files declare is the one statement
   * a surface reads from here (`skill-resolution.ts`).
   */
  readonly explainedByStrategies: readonly RuntimeCompositionStrategy[];
}
