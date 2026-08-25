// The plugin comparison's rendering model (T831): what one compared side is
// on the page that draws it.
//
// A type module beside the component, for the reason the skill comparison
// keeps one: a `<script setup>` block exports nothing, so the shape its props
// are built from has to live where both the component and the route that
// builds it can import it.
//
// The side is already presentation: every string here is the compare route's
// own rendering of a published fact — the carrier's caption, the file's
// facts, the products that recognize it, and the document the diff mounts —
// so the component draws them and decides nothing.

/** One compared side: the carrier, and what the row says about it. */
export interface PluginComparisonSide {
  /** Which side this is, in the order the link named them. */
  readonly caption: string;
  /** The carrier's Source-relative Path — the side's identity (FR-030). */
  readonly path: string;
  /** What this file is to the plugin: its manifest, or a catalog listing it. */
  readonly carrierText: string;
  /** The file's own facts: Source, kind, and read outcome. */
  readonly factsText: string;
  /**
   * The products that recognize this carrier, with the surfaces each
   * admission rests on, on one line. Empty string when the row lists none,
   * which the component drops rather than drawing an empty line.
   */
  readonly recognitionText: string;
  /**
   * Which product's reading this side is, when the file has more than one
   * recognizing it, and the empty string when the question does not arise —
   * the component drops the line rather than drawing an empty one.
   */
  readonly readingText: string;
  /** The declaration document this side contributes to the diff. */
  readonly declarationText: string;
  /**
   * What this side says about declaring the compared name more than once, or
   * null for the ordinary one-declaration side.
   *
   * A catalog may list one name twice, which is one row and two offerings: the
   * comparison's unit is one name in two carriers, so the diff holds the first
   * of them and this states that the others are on the plugin's own page
   * rather than leaving them unmentioned.
   */
  readonly duplicateNote: string | null;
}
