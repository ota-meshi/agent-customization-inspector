// The executable `RuntimeCompositionStrategy` registry (T062, data-model.md
// § RuntimeCompositionStrategy). A strategy records documented layering,
// selection, fallback, deduplication, or precedence so the UI can explain a
// vendor's runtime edge. It is immutable contract data: it cannot enumerate a
// directory, open a relationship target, execute anything, or merge the
// Inspector's Repository and Global Sources
// (contracts/runtime-composition.md § "Runtime composition is not Inspector
// source merging").
//
// This module is the registry's public surface and the only one outside
// `registries/` should import: the record shape lives in
// `strategy-types.ts` and each product's strategies in `<tool>/strategies.ts`,
// so a new vendor is a new directory plus one entry below. The re-exports keep
// that split invisible to consumers.
//
//
// The aggregate is an object literal rather than a merge helper so the
// compiler proves it complete: it is annotated `Record<StrategyId, …>`, so adding a
// vendor's identifiers to `identifier-types.ts` without spreading that
// vendor's catalog in fails to compile with the exact missing key. A helper
// returning an asserted-total type could not make that promise.
//
// Every `strategyId` is defined normatively in the bilingual
// runtime-composition contract; these modules are its implementation
// counterpart.
import { CODEX_COMPOSITION_STRATEGIES } from './codex/strategies';
import type { StrategyId } from './identifier-types';
import type { RuntimeCompositionStrategy } from './strategy-types';

export type { CodexStrategyId, StrategyId } from './identifier-types';
export type {
  CompositionOperation,
  RuntimeCompositionStrategy,
} from './strategy-types';

/**
 * The shipped strategy registry, keyed by the closed {@link StrategyId}
 * catalog and complete over it. Vendor catalogs are spread in the closed tool
 * order.
 */
export const RUNTIME_COMPOSITION_STRATEGIES: Readonly<
  Record<StrategyId, RuntimeCompositionStrategy>
> = {
  ...CODEX_COMPOSITION_STRATEGIES,
};
