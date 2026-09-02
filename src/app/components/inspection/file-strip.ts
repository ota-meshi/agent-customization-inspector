// What the strip of other copies holds (T1167, FR-007).
//
// A detail leads with one customization, and a customization is often carried
// by more than one file: a skill name two directories declare, an
// applicability range nine files govern, an event three carriers declare. The
// heading names the one on screen; the strip is how the reader reaches the
// others without going back to the list.
//
// The derivation is here rather than in the component so it can be checked
// without a browser (T1165): what the strip must get right is which entries it
// holds, and that is a question about data. How they are drawn — one line
// whatever the count, scrolling sideways rather than wrapping — is the
// component's, and is checked in the browser.
import type { RouteLocationRaw } from 'vue-router';
import type { SupportedTool } from '../../../shared/entities';
import type { VendorSurface } from '../../../shared/registries/behavior-types';

/**
 * One file of the open customization, as the strip states it: the file's own
 * path and the products that recognize that file.
 */
export interface FileStripEntry {
  /** The file's identity, which is what tells the entries apart (FR-030). */
  readonly key: string;
  /**
   * The Source holding the file, which the strip states beside the path
   * wherever it is not the open page's own: a Global home publishes every
   * kind, and two Sources can hold one path, so the path alone names no file
   * (data-model.md § Inventory unit; FR-030). Two entries whose paths are
   * identical are otherwise two links to different pages drawn as one string.
   */
  readonly sourceId: string;
  /** The file's Source-relative Path, in the row's own presentation spelling. */
  readonly pathText: string;
  /**
   * Where the file's own detail opens, for a kind whose file has one detail:
   * the path is the link, and the marks beside it state only what recognized
   * the file. Absent for a kind whose detail is one product's own reading — a
   * plugin catalog three products read is one file with three readings, so
   * each mark opens one of them and the path opens nothing
   * (`RecognitionMarks.vue`).
   */
  readonly opens?: {
    /** What a screen reader announces the entry's link as. */
    readonly accessibleText: string;
    /**
     * That file's own detail route. A location rather than a path string,
     * because a kind whose rows are names carries the row a link was followed
     * from in the query (`detail-route.ts` § originRowNameQuery).
     */
    readonly route: RouteLocationRaw;
  };
  /** The products that recognize this file, in the row's published order. */
  readonly recognitions: readonly {
    readonly tool: SupportedTool;
    readonly surfaces: readonly VendorSurface[];
    /**
     * Where this product's own reading of the file opens, for a kind whose
     * detail differs by product. Set exactly where {@link FileStripEntry.opens}
     * is absent, and absent everywhere it is set (`RecognitionMarks.vue`).
     */
    readonly opens?: {
      /** That reading's own detail route. */
      readonly route: RouteLocationRaw;
      /** What the link announces: the product, the file, and the subject. */
      readonly accessibleText: string;
    };
  }[];
  /**
   * What kind of file carries the declaration, where the kind has one: a hook
   * file, a settings document that also holds hooks, a plugin catalog. Null
   * for a kind whose file is the customization itself.
   */
  readonly carrierText: string | null;
}

/**
 * The other copies of the open customization: every entry but the one the page
 * is showing, in the order the row published them.
 *
 * The open file is excluded rather than marked, because the heading above the
 * strip already spells it and a surface must not carry one fact in two
 * spellings (FR-007). Excluded by the file's whole identity — its Source and
 * its Source-relative Path — since two Sources can hold one path and marking
 * the wrong one would send a reader to the file they are already reading
 * (FR-030).
 */
export function otherCopiesOf(
  entries: readonly FileStripEntry[],
  openKey: string,
): readonly FileStripEntry[] {
  return entries.filter((entry) => entry.key !== openKey);
}
