// The `InspectionRule` record shape and its closed discovery classes
// (data-model.md § InspectionRule).
//
// Declared apart from the aggregate so each vendor catalog can author against
// the shape without importing the module that collects those catalogs, which
// would be a cycle. Ships zero runtime code — the `-types` name records that.
//
// A record carries no contract version of its own. The registries ship as one
// unit at one revision, so the revision is a property of the shipped set and
// of the consent bound to it (`GlobalConsent.allowlistVersion`), not a string
// copied into every record where it could only ever hold the same value.
//
// The matcher grammar itself is owned by the inspection module's registry
// compiler (`src/server/inspection/rules/registry.ts`), which is where the
// closed segment union and its `TraversalPlan` compilation live. The import
// direction is deliberate: the grammar has one owner, and that module is
// platform-neutral (no `node:` imports), so referencing it does not pull
// server-only code into a shared module.
import type { StructuredInspectorMatcher } from '../../server/inspection/rules/registry';
import type { ConditionFactKey, SourceKind } from '../api-types';
import type { RuleId } from './identifier-types';
import type { EvidenceCitation } from './evidence-types';
import type {
  CustomizationKind,
  DocumentationStatus,
  LifecycleQualifier,
  SupportedTool,
} from '../entities';

/**
 * How a rule participates in discovery
 * (contracts/inspection-path-allowlist.md § Rule classes). Only the first two
 * members may authorize a filesystem read.
 */
export type RuleDiscoveryClass =
  /** The rule's own structured matcher alone can create a candidate. */
  | 'static-candidate'
  /** A closed derivation from an independently admitted seed creates the candidate. */
  | 'bounded-derived-candidate'
  /** The Inspector records that a product may use a target without opening it. */
  | 'relationship-only'
  /** The surface is documented but intentionally outside this release or boundary. */
  | 'excluded';

/**
 * One Inspector policy rule (data-model.md § InspectionRule).
 *
 * Cross-registry references are not fields here: they live in
 * `relation-types.ts` and each vendor's `<tool>/relations.ts`, so a record
 * describes only what the thing is. `policyRefs` stays: it names FR/QR
 * clauses owned by spec.md rather than another registry.
 */
export interface InspectionRule {
  /** Stable ID from the closed catalog, unique within the registry. */
  readonly ruleId: RuleId;
  /** Owning product, or `shared` for a cross-vendor safety/derivation rule. */
  readonly tool: SupportedTool | 'shared';
  /** Discovery class; only the candidate classes may read. */
  readonly discoveryClass: RuleDiscoveryClass;
  /** The recognized kind, or null for a cross-kind relationship/exclusion. */
  readonly kind: CustomizationKind | null;
  /** Which Source families the rule applies to, as explicitly contracted. */
  readonly sourceKinds: readonly SourceKind[];
  /**
   * The structured matcher for a static rule, or null. Never a vendor
   * locator, ambient path, executable glob, or untyped selector string.
   */
  readonly matcher: StructuredInspectorMatcher | null;
  /**
   * The closed derived-target mapping of a `bounded-derived-candidate`.
   * Always null in this release: the first derived rule
   * (`codex.derived.skill-metadata`) ships with the Codex skill-metadata
   * phase, and its closed `DerivationProgram` type is authored there rather
   * than declared speculatively here — an unpopulated shape could not be
   * validated against a real mapping (AGENTS.md Implementation simplicity
   * policy).
   */
  readonly derivation: null;
  /**
   * Sorted FR/QR clauses that authorize or exclude the surface, non-empty in a
   * maintained build and empty in a packaged CLI. They are traceability into
   * spec.md for a reviewer: no DTO field carries them and nothing in the
   * product reads one, so they are dropped with the other maintenance-only
   * data (`SHIPS_MAINTENANCE_DATA`, src/shared/registries/maintenance-data.ts).
   */
  readonly policyRefs: readonly string[];
   /** Runtime facts needed before applicability can be assessed. */
  readonly conditionKeys: readonly ConditionFactKey[];
  /** Links rules with documented selection/order semantics; null when none. */
  readonly precedenceGroup: string | null;
  /** Upstream documentation completeness for this rule, not runtime state. */
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
