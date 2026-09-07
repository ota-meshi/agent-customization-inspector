// The Source facts every path-addressed detail page states for its open file
// (FR-007 "show its source"; FR-002): which family of place the file came
// from — the selected repository, or the reader's own configuration
// directories — which the crumbs lead with, and, where that family holds more
// than one Source, which consented directory it was in. One composable so the
// eleven detail pages cannot drift in when they name a Source: each answer
// follows the shared naming rules (`source-name.ts`), and the directory stays
// silent in the ordinary single-Source session where the summary panel already
// states the one root.
import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue';
import { sourceRootOf } from '../components/source-name';
import { SOURCE_KIND_TEXT } from '../../shared/api-text';
import type { SourceDto } from '../../shared/api-types';

/** The two Source facts of one open detail; see the module header. */
export class OpenSourceFacts {
  /**
   * The escaped presentation of the directory the open file's Source was
   * admitted at — never a path anything can open (FR-002) — or null where
   * its family holds one Source (`source-name.ts` § sourceRootOf). Rendered
   * as its own line under the recognition line.
   */
  public readonly sourceRootText: ComputedRef<string | null>;
  /**
   * The same family name, stated whether or not another Source is consented —
   * null only when the Source is not in the snapshot. What the crumbs use: a
   * crumb says where the page sits, and a trail that names the Source only
   * once a second one exists asks the reader to know that rule before they can
   * read it. The family is not restated beside the file's own facts: a detail
   * states what the file is, and where the page sits is the crumbs' answer.
   */
  public readonly sourceFamilyCrumbText: ComputedRef<string | null>;

  /**
   * Derives both from the Sources the adopted snapshot published and the open
   * Source's ID, each read lazily so the caller's own reactivity drives them.
   */
  public constructor(
    sources: MaybeRefOrGetter<readonly SourceDto[]>,
    openSourceId: MaybeRefOrGetter<string | null>,
  ) {
    const openSource = computed(
      () => toValue(sources).find((source) => source.sourceId === toValue(openSourceId)) ?? null,
    );
    this.sourceRootText = computed(() =>
      openSource.value === null
        ? null
        : sourceRootOf(toValue(sources), openSource.value.kind, openSource.value.sourceId),
    );
    this.sourceFamilyCrumbText = computed(() =>
      openSource.value === null ? null : SOURCE_KIND_TEXT[openSource.value.kind],
    );
  }
}

/**
 * Derives the open detail's Source facts from the adopted snapshot's Sources
 * and the open Source ID, both read lazily so the page's own reactivity
 * drives them.
 */
export function useOpenSourceFacts(
  sources: MaybeRefOrGetter<readonly SourceDto[]>,
  openSourceId: MaybeRefOrGetter<string | null>,
): OpenSourceFacts {
  return new OpenSourceFacts(sources, openSourceId);
}
