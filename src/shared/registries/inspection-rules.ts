// The executable `InspectionRule` registry (T063, data-model.md
// § InspectionRule). This is the only registry that can authorize a read: a
// `static-candidate` or `bounded-derived-candidate` rule in this shipped,
// contract-versioned catalog is the sole way a path becomes readable
// (contracts/inspection-path-allowlist.md § "Read authorization and
// applicability"). Vendor behaviors, strategies, evidence, relationships, and
// authored file content never grant that authority.
//
// This module is the registry's ID-keyed surface: it is what the contract gate
// walks and what the conformance fixture materializes. The scan path does not
// come through here — `src/server/inspection/scan.ts` composes the compiled
// per-vendor rule lists directly, because a scan needs plans rather than a
// lookup table. The record shape lives in `rule-types.ts` and each product's
// rules in `<tool>/rules.ts`, so a new vendor is a new directory plus one entry
// below.
//
//
// The aggregate is an object literal rather than a merge helper so the
// compiler proves it complete: it is annotated `Record<RuleId, …>`, so adding a
// vendor's identifiers to `identifier-types.ts` without spreading that
// vendor's catalog in fails to compile with the exact missing key. A helper
// returning an asserted-total type could not make that promise.
//
// Each record is the implementation counterpart of one row in a bilingual
// vendor contract, and rules arrive with the inventory phase that needs them.
import { CLAUDE_INSPECTION_RULES } from './claude/rules';
import { CODEX_INSPECTION_RULES } from './codex/rules';
import type { RuleId } from './identifier-types';
import type { InspectionRule } from './rule-types';

export type { ClaudeRuleId, CodexRuleId, RuleId } from './identifier-types';
export type { InspectionRule, RuleDiscoveryClass } from './rule-types';

/**
 * The shipped rule registry, keyed by the closed {@link RuleId} catalog and
 * complete over it — so this union is the exhaustive list of rules that can
 * authorize a read. Vendor catalogs are spread in the closed tool order and
 * arrive with their inventory phase.
 */
export const INSPECTION_RULES: Readonly<Record<RuleId, InspectionRule>> = {
  ...CLAUDE_INSPECTION_RULES,
  ...CODEX_INSPECTION_RULES,
};
