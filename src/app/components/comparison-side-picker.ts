// The side pickers every comparison page renders over one row's offered
// identities (FR-011, FR-030).
//
// A `<select>` carries one string and an identity is two values, so each
// offered side is keyed by its position and the page maps a pick back through
// the same list it rendered. One implementation, because six pages render the
// same picker: the option list, the pick resolution, and the current-value
// lookup must not drift into per-page variants.
import { sourceRootOf } from './source-name';
import type { ComparisonSide } from './detail-route';
import { sourceIdOf } from './detail-route';
import { GLOBAL_MEMBER_TEXT } from '../../shared/api-text';
import { inlinePresentationLabel } from '../../shared/entities';
import type { SourceDto } from '../../shared/api-types';

/**
 * One offered side as a picker renders it: its positional value, the side it
 * names, and what the option reads as ({@link comparisonSideOptions}).
 */
export interface ComparisonSideOption {
  /** The offered position — a select carries a string, an identity is two values. */
  readonly value: string;
  /** The side this option steps the pair to. */
  readonly side: ComparisonSide;
  /**
   * The option's text: the path, and the directory it was in where its
   * family holds more than one Source — two homes can hold one spelling, and
   * an option list naming it once would offer the same word twice
   * (`source-name.ts` § fileSourceRootOf).
   */
  readonly label: string;
}

/**
 * What one picker option reads as: the offered thing's own spelling and, where
 * its family holds more than one Source, the directory its Source was admitted
 * at — two homes can hold one spelling, and an option list naming it once
 * would offer the same word twice (`source-name.ts` § fileSourceRootOf). One
 * rule for every comparison picker, the skill route's copy switcher included,
 * so no two pickers spell the same situation differently.
 */
export function comparisonOptionLabel(spelled: string, root: string | null): string {
  return root === null ? spelled : `${spelled} — ${root}`;
}

/**
 * The Source qualifier one picker option carries beside its spelling: the
 * directory the Source was admitted at, led by the member that reads it —
 * null where the family holds one Source and the directory is already stated
 * beside it. The member is stated because two members can be pointed at one
 * directory — two environment settings naming one path give two Sources one
 * `displayRoot` — and the directory alone would then read as one option
 * twice. A directory is only ever shown for a Global family (the Repository
 * family holds one Source), so every qualified option has a member to name.
 */
export function comparisonSourceQualifierOf(
  sources: readonly SourceDto[],
  sourceId: string | null,
): string | null {
  if (sourceId === null) {
    return null;
  }
  for (const source of sources) {
    if (source.sourceId === sourceId) {
      const root = sourceRootOf(sources, source.kind, sourceId);
      if (root === null) {
        return null;
      }
      return source.member === null ? root : `${GLOBAL_MEMBER_TEXT[source.member]} — ${root}`;
    }
  }
  return null;
}

/**
 * The options one picker offers for a row's comparable sides, in the row's
 * own order.
 */
export function comparisonSideOptions(
  sources: readonly SourceDto[],
  sides: readonly ComparisonSide[],
): readonly ComparisonSideOption[] {
  return sides.map((side, index) => {
    const sourceId = sourceIdOf(sources, side.source);
    return {
      value: String(index),
      side,
      label: comparisonOptionLabel(
        inlinePresentationLabel(side.sourceRelativePath),
        comparisonSourceQualifierOf(sources, sourceId),
      ),
    };
  });
}

/** The offered side one picker value names, or null for a value none does. */
export function pickedSideOf(
  options: readonly ComparisonSideOption[],
  value: string,
): ComparisonSide | null {
  for (const option of options) {
    if (option.value === value) {
      return option.side;
    }
  }
  return null;
}

/** The picker value one side currently stands on, or the empty string for none. */
export function sideValueOf(
  options: readonly ComparisonSideOption[],
  side: ComparisonSide | null,
): string {
  if (side === null) {
    return '';
  }
  for (const option of options) {
    if (
      option.side.source === side.source &&
      option.side.sourceRelativePath === side.sourceRelativePath
    ) {
      return option.value;
    }
  }
  return '';
}
