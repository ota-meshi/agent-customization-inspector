// The one build flag that keeps registry data the product never reads out of
// the packaged CLI.
//
// Three kinds of maintained data qualify, and they are dropped together
// because each exists for the bilingual contracts rather than for a running
// inspection:
//
//  - evidence citations (`EvidenceCitation`): a record's own
//    `documentationStatus` says how completely it is documented, never where,
//    so no URL, heading, review date, or paraphrase is reachable from a DTO.
//  - vendor locators (`VendorLocator`): the DTO surface has no field for a
//    lookup base, relative selector, traversal shape, or vendor scope.
//  - policy references (`InspectionRule.policyRefs`): they name FR/QR clauses
//    in spec.md for a reviewer tracing a rule back to what authorized it. No
//    DTO carries them and nothing in the product reads one.
//
// No record carries a condition-key list: nothing projects one, and a field no
// consumer reads is a field that drifts (FR-009).

declare global {
  /**
   * Whether this build keeps maintenance-only registry data.
   * `tsdown.config.ts` replaces it with `false` for the packaged CLI so every
   * guarded value becomes dead code the bundler removes; the test runner
   * leaves it undefined and the fallback keeps the data.
   *
   * It is a bare identifier rather than a `globalThis` member because only the
   * bare form folds: substituting `globalThis.__ACI_SHIP_MAINTENANCE_DATA__`
   * leaves the member expression in place, the ternary stays live, and the
   * data ships silently. That failure is invisible to type checking and to
   * every other suite, so the package suite asserts the built artifact carries
   * none.
   */
  const __ACI_SHIP_MAINTENANCE_DATA__: boolean;
}

/**
 * Whether the current build carries maintenance-only registry data. Every
 * guarded value is a ternary on it, so a packaged CLI holds the empty form —
 * `[]` for a citation or policy-reference list, `null` for a locator — and
 * never the maintained text.
 */
export const SHIPS_MAINTENANCE_DATA =
  typeof __ACI_SHIP_MAINTENANCE_DATA__ === 'undefined' ? true : __ACI_SHIP_MAINTENANCE_DATA__;
