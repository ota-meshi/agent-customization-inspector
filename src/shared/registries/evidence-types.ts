// How a maintained registry record cites the official documentation it was
// reviewed against, and the build flag that keeps those citations out of the
// shipped CLI.
//
// A citation is written inside the record it backs, not in a separate
// registry. Giving sources their own identifiers and a citation layer keyed by
// subject would mean two hops from a behavior statement to what established
// it, and stating the basis where the claim is made is the point of
// maintaining it at all.
//
// The cost is denormalization: one reviewed page cited by several records
// repeats its URL and review date. That is accepted deliberately — the
// normative single row per page lives in contracts/official-sources.md, and
// these citations are its implementation counterpart rather than a second
// registry.
//
// Nothing in the product reads a citation. `EvidenceAssessment` records how
// completely a subject is documented, never where, so the shipped CLI has no
// use for URLs, review dates, or paraphrases, so a packaged build drops them
// (src/shared/registries/maintenance-data.ts).

import type { SourceId } from './identifier-types';

/**
 * One reviewed official page establishing the record that carries it
 * (data-model.md § EvidenceCitation, QR-005). A citation is the implementation
 * counterpart of one normative row in contracts/official-sources.md, resolved
 * against it by the contract gate, and it lives on the record it supports so a
 * claim and its basis cannot drift apart.
 *
 * Maintenance data only: a packaged build folds every citation array to empty
 * (src/shared/registries/maintenance-data.ts), because nothing in the product
 * reads one.
 */
export interface EvidenceCitation {
  /**
   * The official-sources contract row this citation is of (QR-005). It is the
   * page's stable identity: a vendor may move a page — one already has — and
   * the URL changes while the row, its reviewed sections, and every record
   * citing it stay the same.
   */
  readonly sourceId: SourceId;
  /** Exact authored HTTPS URL on {@link officialHost}; no credentials, query, or fragment. */
  readonly url: string;
  /** Exact host allowlist for this citation; no implied subdomain or sibling host. */
  readonly officialHost: string;
  /** Non-empty exact rendered heading texts; never a selector or URL fragment. */
  readonly sections: readonly string[];
  /**
   * ISO date those sections were last read and compared against the claim this
   * record makes. Confirming that a heading still exists is not that comparison
   * and does not advance the date.
   */
  readonly reviewedOn: string;
  /**
   * What the reviewed sections establish for the citing record, paraphrased.
   * Copied page text is forbidden: the maintained interpretation is the
   * artifact a drift review compares against, and a quotation would be neither
   * maintained nor licensed to redistribute.
   */
  readonly establishes: string;
}
