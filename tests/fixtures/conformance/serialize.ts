// T051: the canonical JSON materialization of the three contract-versioned
// registries and their reference graph. The checked-in `*.json` files in this directory are the output
// of these functions over the shipped registries, so a registry edit that is
// not reflected in the fixtures fails the contract gate instead of shipping.
//
// Serializing here rather than reusing the registry objects directly matters
// for one field: a selector's dynamic step holds a real JavaScript `RegExp`,
// which has no JSON form. It is written as its source literal (for example
// `/(?:)/u`) — the same spelling the vendor contract tables show — so the
// fixture stays a faithful, reviewable rendering of the authored program
// rather than a lossy summary of it.
import { INSPECTION_RULES } from '../../../src/shared/registries/inspection-rules';
import { RULE_RELATIONS, STRATEGY_RELATIONS } from '../../../src/shared/registries/relations';
import { RUNTIME_COMPOSITION_STRATEGIES } from '../../../src/shared/registries/runtime-composition';
import { VENDOR_BEHAVIOR_STATEMENTS } from '../../../src/shared/registries/vendor-behaviors';
import type { MatcherSegment } from '../../../src/server/inspection/rules/registry';

/** The JSON form of one authored selector segment. */
export type SerializedSegment =
  | { readonly kind: 'literal'; readonly value: string }
  | { readonly kind: 'regex'; readonly pattern: string }
  | { readonly kind: 'recursive-directories' };

function serializeSegment(segment: MatcherSegment): SerializedSegment {
  switch (segment.kind) {
    case 'literal':
      return { kind: 'literal', value: segment.value };
    case 'regex':
      // `String(pattern)` yields the authored literal including its flags.
      return { kind: 'regex', pattern: String(segment.pattern) };
    case 'recursive-directories':
      return { kind: 'recursive-directories' };
  }
}
/**
 * Serializes the reference graph as one document, sorted by subject within
 * each kind.
 *
 * Every reference is held in memory as the record itself but materializes as
 * that record's identifier: JSON has no references, and inlining the record
 * would restate a normative definition that one contract alone owns
 * (contracts/inspection-path-allowlist.md § Contract map). This is the one
 * boundary where the graph turns back into identifiers.
 */
export function serializeRelations(): unknown {
  const identify = (records: readonly { behaviorId?: string; strategyId?: string }[]): string[] =>
    records.map((record) => record.behaviorId ?? record.strategyId!);
  const sorted = <Edges>(
    subjects: Readonly<Record<string, Edges>>,
    project: (edges: Edges) => Record<string, string[]>,
  ): Record<string, Record<string, string[]>> =>
    Object.fromEntries(
      Object.entries(subjects)
        .sort(([left], [right]) => (left < right ? -1 : 1))
        .map(([id, edges]) => [id, project(edges)]),
    );
  return {
    strategies: sorted(STRATEGY_RELATIONS, (edges) => ({
      consumesBehaviors: identify(edges.consumesBehaviors),
    })),
    rules: sorted(RULE_RELATIONS, (edges) => ({
      basedOnBehaviors: identify(edges.basedOnBehaviors),
      explainedByStrategies: identify(edges.explainedByStrategies),
    })),
  };
}

/** Serializes the vendor-behavior registry, sorted by `behaviorId`. */
export function serializeVendorBehaviors(): unknown {
  return Object.values(VENDOR_BEHAVIOR_STATEMENTS).toSorted((left, right) =>
    left.behaviorId < right.behaviorId ? -1 : 1,
  );
}

/** Serializes the strategy registry, sorted by `strategyId`. */
export function serializeRuntimeComposition(): unknown {
  return Object.values(RUNTIME_COMPOSITION_STRATEGIES).toSorted((left, right) =>
    left.strategyId < right.strategyId ? -1 : 1,
  );
}

/** Serializes the inspection-rule registry, sorted by `ruleId`. */
export function serializeInspectionRules(): unknown {
  return Object.values(INSPECTION_RULES)
    .toSorted((left, right) => (left.ruleId < right.ruleId ? -1 : 1))
    .map((rule) => ({
      ...rule,
      matcher:
        rule.matcher === null
          ? null
          : {
              base: rule.matcher.base,
              selectors: rule.matcher.selectors.map((selector) => selector.map(serializeSegment)),
            },
    }));
}
