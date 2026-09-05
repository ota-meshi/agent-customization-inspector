// The executable `VendorBehaviorStatement` registry (T062, data-model.md
// § VendorBehaviorStatement). Each record is the maintained interpretation of
// one atomic, surface-specific upstream documentation claim: it says where a
// product looks, and it is deliberately NOT a filesystem matcher — a behavior
// statement can never authorize a read
// (contracts/inspection-path-allowlist.md § "Vendor locators are not
// Inspector matchers"). Read authority lives only in `inspection-rules.ts`.
//
// This module is the registry's public surface and the only one outside
// `registries/` should import: the record shape lives in
// `behavior-types.ts` and each product's statements in `<tool>/behaviors.ts`,
// so a new vendor is a new directory plus one entry below rather than an edit
// inside a growing shared literal. The re-exports keep that split invisible to
// consumers.
//
//
// The aggregate is an object literal rather than a merge helper so the
// compiler proves it complete: it is annotated `Record<BehaviorId, …>`, so adding a
// vendor's identifiers to `identifier-types.ts` without spreading that
// vendor's catalog in fails to compile with the exact missing key. A helper
// returning an asserted-total type could not make that promise.
//
// Every identifier is defined normatively in exactly one bilingual vendor
// contract; these modules are that contract's implementation counterpart, not
// a second source of truth.
import { CLAUDE_BEHAVIOR_STATEMENTS } from './claude/behaviors';
import { CODEX_BEHAVIOR_STATEMENTS } from './codex/behaviors';
import { COPILOT_BEHAVIOR_STATEMENTS } from './copilot/behaviors';
import type { BehaviorId } from './identifier-types';
import type { VendorBehaviorStatement } from './behavior-types';

export type {
  BehaviorId,
  ClaudeBehaviorId,
  CodexBehaviorId,
  CopilotBehaviorId,
} from './identifier-types';
export type {
  LookupBase,
  VendorBehaviorStatement,
  VendorScope,
  VendorSurface,
  VendorTraversal,
} from './behavior-types';

/**
 * The shipped behavior registry, keyed by the closed {@link BehaviorId}
 * catalog and complete over it. Vendor catalogs are spread in the closed tool
 * order; each arrives with the inventory phase that needs it.
 */
export const VENDOR_BEHAVIOR_STATEMENTS: Readonly<Record<BehaviorId, VendorBehaviorStatement>> = {
  ...COPILOT_BEHAVIOR_STATEMENTS,
  ...CLAUDE_BEHAVIOR_STATEMENTS,
  ...CODEX_BEHAVIOR_STATEMENTS,
};
