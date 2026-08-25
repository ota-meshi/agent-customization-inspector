// What a permission-policy rule is to the scan: the contract a compiled unit of
// this kind answers, for the two shapes a policy takes — a block inside a
// larger document, and a document that is the policy entirely.
//
// The kind's own contract rather than a member of every compiled rule: which
// key holds a policy, and whether there is a block to read at all, is the
// admitting vendor's own contract (AGENTS.md § Class and interface policy).
// Nothing is shared between the two: one reads a block out of strict JSON, the
// other reads nothing because the file it admitted is the whole policy, so each
// vendor's unit is its own module beside this one.
import type { DeclaredEntryDto } from '../../../../shared/api-types';
import type { CompiledInspectionRule } from '../registry';

/**
 * A compiled rule that admits a file declaring a permission policy inside a
 * larger document, and reads the block out of it. Which key holds the policy,
 * and which format the document is, is the admitting vendor's own contract —
 * Claude's strict-JSON `permissions` object — so a rule of another kind must
 * not be asked for it.
 *
 * Its own unit rather than an optional member on the permissions family: a
 * vendor whose whole file is the policy has no block to read, and a unit that
 * cannot answer must not carry the member that promises to. The
 * `permissionsReading` discriminant is what lets the recognizer prove which
 * admission can answer without a cast.
 */
export interface CompiledStaticPermissionsCarrierRule extends CompiledInspectionRule {
  /** The recognized kind; a carrier unit compiles permission-policy records alone. */
  readonly kind: 'permissions';
  /** Discriminant: this unit reads a block out of the document it admits. */
  readonly permissionsReading: 'declared-block';
  /**
   * The entries of the policy block one admitted carrier's complete decoded
   * text declares, in the parser's resolved order, or null when the document
   * declares no such block — which is not an empty policy but no policy at
   * all, and the recognizer publishes no recognition for it. Throws on text
   * the carrier's format cannot parse; the recognizer's extraction boundary
   * turns the throw into the recognition's `failed` state (FR-028).
   */
  declaredPolicyOf(sourceText: string): readonly DeclaredEntryDto[] | null;
}

/**
 * A compiled rule whose admitted file is itself the whole permission policy,
 * so nothing is read out of it: a Codex `.codex/rules/*.rules` file is the
 * policy its author wrote, and its detail serves that document.
 */
export interface CompiledStaticPermissionsDocumentRule extends CompiledInspectionRule {
  /** The recognized kind; a permissions unit compiles permission-policy records alone. */
  readonly kind: 'permissions';
  /** Discriminant: no reading — the admitted document is the policy. */
  readonly permissionsReading: 'whole-document';
}

/**
 * A compiled rule that admits a permission policy: the closed union of the
 * unit that reads a declared block and the unit whose file is the policy,
 * discriminated by `permissionsReading`.
 */
export type CompiledStaticPermissionsRule =
  CompiledStaticPermissionsCarrierRule | CompiledStaticPermissionsDocumentRule;
