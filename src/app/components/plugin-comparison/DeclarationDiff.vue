<script setup lang="ts">
// The plugin declaration comparison surface (T831, T1209; research.md § 7,
// FR-011, FR-027): one plugin name's two declarations, each the JSON document
// that carrier declares it with, compared read-only side by side
// (`SourceDiff.vue`). A catalog's side is its entry serialized to canonical
// JSON (declared-entries-json.ts) while a manifest's is the file it is, so
// both sides are coloured as JSON whatever the carriers' own extensions would
// resolve to, and each side is named as the declaration it shows rather than
// as the whole carrier (FR-025). Nothing is masked, shortened, or substituted
// on the way in (FR-025, FR-026); there is no `v-html`, no link, and no
// control that edits, merges, or reverts either side (FR-012).
import SourceDiff from '../comparison/SourceDiff.vue';
import { useSessionViewState } from '../../composables/session-view-state';

defineProps<{
  /** The first side's complete declaration document; see the module comment. */
  readonly originalText: string;
  /** The first side's carrier Source-relative Path: the side's label (FR-030). */
  readonly originalPath: string;
  /** The second side's declaration document; see {@link originalText}. */
  readonly modifiedText: string;
  /** The second side's carrier path; see {@link originalPath}. */
  readonly modifiedPath: string;
  /**
   * What of each carrier the sides show, spliced into each side's accessible
   * name — `declaration <name> of`, from the page that knows the compared
   * name — so one plugin's declaration is never announced as the whole
   * carrier (FR-025).
   */
  readonly contentLabel: string;
}>();

// The pair's declared values — credentials included (FR-025) — are dropped
// through the plugin comparison's own registry rather than the session's: it
// is the state that knows when the pair is no longer the reader's, on the
// central purge (FR-027) and before a greater generation is adopted
// (data-model.md § BrowserState; `SourceDiff.vue` § registerContentOwner).
const sessionViewState = useSessionViewState();
const registerContentOwner = (disposer: () => void): (() => void) =>
  sessionViewState.pluginComparison.registerOpenContentOwner(disposer);
</script>

<template>
  <SourceDiff
    :original-text="originalText"
    :original-path="originalPath"
    :modified-text="modifiedText"
    :modified-path="modifiedPath"
    content-language="json"
    :content-label="contentLabel"
    :register-content-owner="registerContentOwner"
  />
</template>
