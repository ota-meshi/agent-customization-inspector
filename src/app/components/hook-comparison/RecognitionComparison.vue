<script setup lang="ts">
// The hook recognition comparison surface (T911; research.md § 7, FR-011,
// FR-012, FR-027): one declared lifecycle event as two carriers wrote it.
// Each side states the carrier it is — its path, its file facts, and the
// products whose recognitions the row lists for it — and each side's
// declaration is serialized to one canonical JSON document
// (declared-entries-json.ts) compared read-only side by side
// (`SourceDiff.vue`).
//
// The serialized documents are this surface's own rendering, not the
// carriers' bytes: a hook carrier shows its source nowhere (FR-007), and one
// event can be declared in TOML by a Codex layer and in JSON by a settings
// document, so a shared canonical form is what makes the two sides align at
// all. Both sides are therefore coloured as JSON whatever the carriers'
// syntaxes are (`SourceDiff.vue` § contentLanguage).
//
// Nothing is masked, shortened, or substituted on the way in (FR-025,
// FR-026); there is no `v-html`, no link, and no control that runs, edits,
// merges, or reverts either side (FR-012, FR-020). No side carries a runtime
// fact — which source a client would prefer, whether a hook is trusted —
// because no row holds one (FR-009).
import { AuthoredName } from '../authored-name';
import { computed } from 'vue';
import { canonicalHookEventJsonText } from '../declared-entries-json';
import RecognitionTable from '../comparison/RecognitionTable.vue';
import SourceDiff from '../comparison/SourceDiff.vue';
import { useSessionViewState } from '../../composables/session-view-state';
import { escapeControlCharacters } from '../../../shared/entities';
import type { HookCarrierDetailDto, HookDeclarationDto } from '../../../shared/api-types';

const props = defineProps<{
  /**
   * The declared event whose row owns the comparison, in the carriers' own
   * spelling (FR-007). Both sides serialize this one event, so it is also
   * what each side's accessible name names.
   */
  readonly event: string;
  /** The first compared carrier's adopted detail (FR-030). */
  readonly leftDetail: HookCarrierDetailDto;
  /** The second compared carrier's adopted detail. */
  readonly rightDetail: HookCarrierDetailDto;
  /**
   * The products whose recognitions the row lists for the first carrier, each
   * with the surfaces its admission rests on — the inventory row's own
   * statements, repeated per side so neither declaration loses which product
   * reads it. Naming a surface never claims it ran the hook (FR-009).
   */
  readonly leftRecognitions: readonly HookDeclarationDto[];
  /** The second carrier's recognitions; see {@link leftRecognitions}. */
  readonly rightRecognitions: readonly HookDeclarationDto[];
  /**
   * The first carrier's facts line — its Source family, its carrier form, and
   * its read outcome — composed by the page, which holds the session's
   * Sources: the two sides can be two Sources, so the family is each side's
   * own fact (FR-002, FR-030).
   */
  readonly leftFactsText: string;
  /** The second carrier's facts line; see {@link leftFactsText}. */
  readonly rightFactsText: string;
}>();

/**
 * What of each carrier the diff shows, spliced into each side's accessible
 * name through the whitespace-safe spelling: an accessible name is flattened,
 * so an authored key differing only in whitespace must not announce
 * identically, and a key with nothing to draw is noted rather than announcing
 * as nothing (FR-025; {@link AuthoredName}).
 */
const contentLabel = computed(
  () => `declaration ${new AuthoredName(props.event).singleLineText} of`,
);

/**
 * One side's serialized declaration, or the empty object when this carrier's
 * reading declares the event nowhere. A ready pair always holds the event on
 * both sides — the compare route only opens carriers the event's row lists —
 * so the empty document is the torn frame between a snapshot replacement and
 * the re-request it triggers, rendered rather than thrown.
 */
function serialize(detail: HookCarrierDetailDto): string {
  const declared = (detail.events ?? []).find((candidate) => candidate.event === props.event);
  return declared === undefined ? '{}' : canonicalHookEventJsonText(declared);
}

/** The two sides as the template renders them, in the link's own order. */
const sides = computed(
  () =>
    [
      {
        caption: 'First file',
        path: props.leftDetail.file.sourceRelativePath,
        factsText: props.leftFactsText,
        recognitions: props.leftRecognitions,
        text: serialize(props.leftDetail),
      },
      {
        caption: 'Second file',
        path: props.rightDetail.file.sourceRelativePath,
        factsText: props.rightFactsText,
        recognitions: props.rightRecognitions,
        text: serialize(props.rightDetail),
      },
    ] as const,
);

// The pair's declared values — credentials included (FR-025) — are dropped
// through the hook comparison's own registry rather than the session's: it is
// the state that knows when the pair is no longer the reader's, on the
// central purge (FR-027) and before a greater generation is adopted
// (data-model.md § BrowserState; `SourceDiff.vue` § registerContentOwner).
const sessionViewState = useSessionViewState();
const registerContentOwner = (disposer: () => void): (() => void) =>
  sessionViewState.hookComparison.registerOpenContentOwner(disposer);
</script>

<template>
  <div class="aci-hook-recognition-comparison">
    <!-- Each side stated with its own identity — path, Source, kind, carrier
         form, and read outcome — so neither declaration loses its carrier to
         the diff (US3 scenario 2). Which products read it is the recognition
         table's, below. The order is the link's: first named, first shown. -->
    <div class="aci-compare-sides">
      <section v-for="side in sides" :key="side.caption" class="aci-compare-side">
        <span class="aci-compare-side__caption">{{ side.caption }}</span>
        <p class="aci-hook-recognition-comparison__path aci-path aci-authored-text">
          {{ escapeControlCharacters(side.path) }}
        </p>
        <p class="aci-note">{{ side.factsText }}</p>
      </section>
    </div>

    <!-- Which product reads which side. On the table rather than on the cards
         above, because only a cell can say that a product reads neither
         carrier (`RecognitionTable.vue`). -->
    <RecognitionTable :sides="sides" />

    <!-- Titled like the recognition block above it, so the page reads as the
         same three tiers every kind's comparison does: what is being compared,
         who reads it, and the difference itself. -->
    <h3 class="aci-compare-block-title">Declaration</h3>
    <!-- What the diff holds, said before it: both sides are this surface's
         canonical serialization of the declaration, not the carriers' own
         spellings — one event can be declared in a TOML layer and in a JSON
         settings document, and neither file's source is shown (FR-007). The
         canonical key order is stated too, because a reader comparing against
         their own file would otherwise read the order as authored. -->
    <p class="aci-note">
      Each side is this event's declaration serialized as JSON with nested keys in one canonical
      order; the files' own syntax and key order are not shown.
    </p>

    <SourceDiff
      :original-text="sides[0].text"
      :original-path="sides[0].path"
      :modified-text="sides[1].text"
      :modified-path="sides[1].path"
      content-language="json"
      :content-label="contentLabel"
      :register-content-owner="registerContentOwner"
    />
  </div>
</template>

<style scoped>
.aci-hook-recognition-comparison {
  display: flex;
  flex-direction: column;
}

.aci-hook-recognition-comparison h3 {
  font-size: 1rem;
  margin: 0.5rem 0 0.1rem;
}

/* An authored path has no break opportunities of its own; wrapping keeps the
   page from scrolling sideways at narrow widths (WCAG 1.4.10). */
.aci-hook-recognition-comparison__path {
  overflow-wrap: anywhere;
}
</style>
