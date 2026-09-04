<script setup lang="ts">
// The admitted candidates that appear in no kind's inventory (T1077). They are
// listed apart from every kind tab rather than dropped: a candidate whose bytes
// were never accepted gains no recognition and so has no kind to be listed
// under, and a generation that says `partial` has to be able to say which file
// made it partial (FR-028).
//
// A file that is only a companion never reaches this list, whatever it carries:
// FR-003 gives an accompanying file no inventory row of its own, so its
// diagnostic is stated inside the row of the skill whose directory holds it.
//
// It carries an empty state, as every kind's list does: this entry is a tab a
// reader can select whatever its count, and a selected tab whose panel draws
// nothing leaves them with the note above and blank space. One sentence is
// enough — the note already says what this list is, and nothing here can be
// narrowed away, so there is no way out to offer (`InventoryList.vue` gives
// the filtered case its own).
import SourceFamilySections from './SourceFamilySections.vue';
import UnclassifiedRow from './rows/UnclassifiedRow.vue';
import { fileIdentityKey } from '../../../shared/entities';
import type { CustomizationFileSummaryDto, SerializedDiagnostic } from '../../../shared/api-types';

defineProps<{
  /** The unrecognized files that passed the active filters, in snapshot order. */
  files: readonly CustomizationFileSummaryDto[];
  /** The generation's diagnostics, resolved per row. */
  diagnostics: readonly SerializedDiagnostic[];
}>();
</script>

<template>
  <div v-if="files.length === 0" class="aci-empty-result">
    <p class="aci-empty-result__statement">No files.</p>
  </div>
  <ul v-else class="aci-list aci-inventory" role="list">
    <!-- One section per Source family, exactly as the file-unit kinds' lists
         (`SourceFamilySections.vue`). The row states which home a file came
         from by its short name, so the family heading is what says a file is
         not the repository's — without the sections, a consented home's
         unreadable file and the repository's would be the same line twice
         (FR-030). -->
    <!-- Keyed by the whole identity, because a row is one file and a file is
         its Source and its Source-relative Path (FR-030): the repository's
         unreadable `AGENTS.override.md` and a consented home's are two rows,
         and the path alone would key them the same. Vue's duplicate-key report
         is a development-build warning and the packaged app is a production
         build, so nothing observes this from the outside — it is the framework's
         own contract, which a list of items patched on every filter change has
         no reason to break. -->
    <SourceFamilySections
      :members="files"
      :member-key="(file) => fileIdentityKey(file.sourceId, file.sourceRelativePath)"
    >
      <template #member="{ member }">
        <UnclassifiedRow :file="member" :diagnostics="diagnostics" />
      </template>
    </SourceFamilySections>
  </ul>
</template>
