<script setup lang="ts">
// Plugin comparison of one plugin name across two of its carriers (T831;
// FR-011, FR-012, FR-009). The data decisions — which carrier stands on each
// side, and what each side's declaration serializes to — are the compare
// route's, which is where the row and the two adopted details are; this
// component draws the comparison it is given, as its two facts: what each
// carrier declares about the plugin, diffed as one JSON document per side,
// and which product reads each carrier, stated beside it.
//
// The two are kept apart because they are different kinds of fact. A
// declaration is the file's own content, compared once per pair; a
// recognition is one product's reading of that file, so it is stated per
// carrier and never folded into the document (research.md § 7).
//
// What this surface never states is runtime: whether either plugin is
// installed, registered with a client, enabled, or trusted is state outside
// this repository that this product does not read (FR-009), and a component
// a manifest points at — bundled skills, an `.mcp.json`, hook files, assets
// — is a declared value here and is never opened. Nothing ranks, orders, or
// prefers either side, and no control edits, merges, or reverts one
// (FR-012); values are the files' literals, with nothing masked or
// substituted (FR-025, FR-026).
import { computed } from 'vue';
import DeclarationDiff from './DeclarationDiff.vue';
import RecognitionTable from '../comparison/RecognitionTable.vue';
import type { PluginComparisonSide } from './recognition-comparison';
import { pathPresentationLabel } from '../../../shared/entities';

const props = defineProps<{
  /** The two compared sides, in the order the link named them. */
  readonly sides: readonly [PluginComparisonSide, PluginComparisonSide];
  /** What of each carrier the diff shows, for the sides' accessible names. */
  readonly contentLabel: string;
  /**
   * Whether either side's document is the carrier file itself rather than a
   * catalog entry serialized canonically, which changes what the note above
   * the diff can promise about key order.
   */
  readonly hasManifestSide: boolean;
}>();

/**
 * The diff's two halves. Computed rather than destructured: a pick replaces
 * the pair through the props, and a value taken once at setup would leave the
 * previous pair's documents mounted under the new pair's paths.
 */
const left = computed(() => props.sides[0]);
const right = computed(() => props.sides[1]);
</script>

<template>
  <div class="aci-plugin-recognition-comparison">
    <!-- Each side stated with its own identity — path, what it is to the
         plugin, and the file's own facts — so neither declaration loses its
         carrier to the diff. Which products read it is the recognition
         table's, below. The order is the link's: first named, first shown. -->
    <div class="aci-compare-sides">
      <section v-for="side in sides" :key="side.caption" class="aci-compare-side">
        <!-- Which side this is, as a label on the box rather than a heading
             over it: every other kind's comparison says it the same way, and a
             heading here put two `h3` steps in the outline before the blocks
             that are the page's actual sections
             (`main.css` § .aci-compare-side__caption). -->
        <span class="aci-compare-side__caption">{{ side.caption }}</span>
        <p class="aci-path aci-authored-text">{{ pathPresentationLabel(side.path) }}</p>
        <!-- The Source and the kind lead, as they do on every other kind's
             side card; what the file is to the plugin follows them. -->
        <p class="aci-note">{{ side.factsText }} · {{ side.carrierText }}</p>
        <!-- Whose reading this side is, where the file has more than one
             product recognizing it: the root and the manifest below are that
             product's answer. -->
        <p v-if="side.readingText !== ''" class="aci-note">{{ side.readingText }}</p>
        <!-- One name declared twice by one catalog: the diff holds the first
             offering, and this says where the others are. -->
        <p v-if="side.duplicateNote !== null" class="aci-note">{{ side.duplicateNote }}</p>
      </section>
    </div>

    <!-- Which product reads which side. On the table rather than on the cards
         above, because only a cell can say that a product reads neither
         carrier (`RecognitionTable.vue`). -->
    <RecognitionTable :sides="sides" />

    <section>
      <h3 class="aci-compare-block-title">Declared metadata</h3>
      <!-- What the diff holds, said before it. A catalog entry is serialized
           with its keys in one canonical order, so a reader comparing
           against their own file does not read that order as authored; a
           manifest is the file it is, and is shown as written. -->
      <p class="aci-note">
        <template v-if="hasManifestSide">
          A catalog entry is shown serialized as JSON with its keys in one canonical order; a
          plugin's own manifest is shown as the file it is.
        </template>
        <template v-else>
          Each side is this plugin's catalog entry serialized as JSON with its keys in one canonical
          order; the catalogs' own key order is not shown.
        </template>
      </p>
      <DeclarationDiff
        :original-text="left.declarationText"
        :original-path="left.path"
        :modified-text="right.declarationText"
        :modified-path="right.path"
        :content-label="contentLabel"
      />
    </section>

    <!-- The plugins' own declarations of themselves, which the page supplies:
         where each manifest is, and what an absent one means, are its model.
         It sits under the entries because a catalog entry is one file's
         statement about the plugin and the manifest is the plugin's own,
         which is the order the detail page puts them in. -->
    <slot name="manifest" />

    <!-- Stated where the declared values are, because that is where a reader
         would otherwise take them for a live state (FR-009). -->
    <p class="aci-note">
      Whether either plugin is installed, registered with a client, enabled, or trusted is state
      this product does not read. A component a manifest points at — bundled skills, an `.mcp.json`,
      hook files, assets — is shown here as the value the file wrote; nothing is opened through that
      value. The files panel lists what each plugin's directory holds, which is where a file like
      that is read.
    </p>
  </div>
</template>

<style scoped>
.aci-plugin-recognition-comparison {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* The side boxes are the shared ones every comparison draws
   (`main.css` § .aci-compare-sides); only the spacing between the facts inside
   one is this kind's, because it states more of them than the others do. */
.aci-compare-side p {
  margin: 0 0 0.25rem;
}
</style>
