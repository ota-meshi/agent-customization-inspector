// The Source facts every path-addressed detail page states for its open file
// (FR-007 "show its source"; FR-002): which family of place the file came
// from — the selected repository, or the reader's own configuration
// directories — which the crumbs lead with, and, where that family holds more
// than one Source, which consented directory it was in. One composable so the
// eleven detail pages cannot drift in when they name a Source: each answer
// follows the shared naming rules (`source-name.ts`), and the directory stays
// silent in the ordinary single-Source session where the summary panel already
// states the one root.
import { computed, type ComputedRef } from 'vue';
import { sourceRootOf } from '../components/source-name';
import { SOURCE_KIND_TEXT } from '../../shared/api-text';
import type { SourceDto } from '../../shared/api-types';

/** The two Source facts of one open detail; see the module header. */
export interface OpenSourceFacts {
  /**
   * The escaped presentation of the directory the open file's Source was
   * admitted at — never a path anything can open (FR-002) — or null where
   * its family holds one Source (`source-name.ts` § sourceRootOf). Rendered
   * as its own line under the recognition line.
   */
  readonly sourceRootText: ComputedRef<string | null>;
  /**
   * The same family name, stated whether or not another Source is consented —
   * null only when the Source is not in the snapshot. What the crumbs use: a
   * crumb says where the page sits, and a trail that names the Source only
   * once a second one exists asks the reader to know that rule before they can
   * read it. The family is not restated beside the file's own facts: a detail
   * states what the file is, and where the page sits is the crumbs' answer.
   */
  readonly sourceFamilyCrumbText: ComputedRef<string | null>;
}

/**
 * Derives the open detail's Source facts from the adopted snapshot's Sources
 * and the open Source ID, both read lazily so the page's own reactivity
 * drives them.
 */
export function useOpenSourceFacts(
  sources: () => readonly SourceDto[],
  openSourceId: () => string | null,
): OpenSourceFacts {
  const openSource = computed(
    () => sources().find((source) => source.sourceId === openSourceId()) ?? null,
  );
  const sourceRootText = computed(() =>
    openSource.value === null
      ? null
      : sourceRootOf(sources(), openSource.value.kind, openSource.value.sourceId),
  );
  const sourceFamilyCrumbText = computed(() =>
    openSource.value === null ? null : SOURCE_KIND_TEXT[openSource.value.kind],
  );
  return { sourceRootText, sourceFamilyCrumbText };
}
