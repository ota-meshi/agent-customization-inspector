<script setup lang="ts">
// The committed inventory list (T071/T1077). Rows arrive already ordered by the
// host (contracts/http-api.md § get-session) — so this component preserves that
// order rather than re-sorting: an opaque ID must never decide what a user
// sees first, and re-sorting client-side would make the list disagree with
// the snapshot it came from.
//
// A row's unit is decided by its kind (data-model.md § Inventory unit), so this
// component dispatches to the kind's own list and never imposes a shared row
// type: a skill row is one declared name with its definitions, while an MCP row
// will be one server declaration inside a carrier. What stays here is the pair
// of empty states, which is a fact about the view rather than about any kind.
//
// The two empty states are deliberately different. "Nothing matched the
// filters" is a view the user can undo; "this repository has no recognized
// customization files" is a finding about the repository. Collapsing them
// would tell someone their repository is empty when they had simply filtered
// it away.
//
// Neither names a vendor or an inspected location. Copy that spells out what
// the shipped catalog covers is a second copy of the registry: it states where
// the inspector looked and which product it looked for, and both change as
// rules ship, so the sentence describes the catalog it was written against
// rather than the one running. The finding is that nothing was recognized;
// which products and locations the release covers is documentation.
import { computed } from 'vue';
import SkillRow from './rows/SkillRow.vue';
import { inventoryPanelId, inventoryTabId } from './panel-ids';
import { CUSTOMIZATION_KIND_TEXT } from '../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SkillInventoryEntryDto,
} from '../../../shared/api-types';
import type { CustomizationKind } from '../../../shared/entities';

const props = defineProps<{
  /** The kind in view; its inventory below is what this list renders. */
  kind: CustomizationKind | null;
  /** The skill rows that passed the active filters, in snapshot order. */
  skillRows: readonly SkillInventoryEntryDto[];
  /** Every published file by ID, so a row can resolve the files it names. */
  filesById: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** How many rows the committed generation published before filtering. */
  totalCount: number;
  /** The generation's diagnostics, resolved per row. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * How many rows the kind in view has. It decides between the list and the two
 * empty states, and each kind answers from its own inventory.
 */
const rowCount = computed(() => (props.kind === 'skill' ? props.skillRows.length : 0));
</script>

<template>
  <!-- The panel the selected kind tab controls, rendered whether or not it has
       rows: a tab's `aria-controls` must reach something, and an empty panel is
       what "this kind has nothing" looks like. It is labelled by that tab, so a
       screen reader reaching it knows which kind it is reading. -->
  <div
    :id="kind === null ? undefined : inventoryPanelId(kind)"
    :role="kind === null ? undefined : 'tabpanel'"
    :aria-labelledby="kind === null ? undefined : inventoryTabId(kind)"
  >
    <ul v-if="rowCount > 0" class="aci-list aci-inventory" role="list">
      <template v-if="kind === 'skill'">
        <SkillRow
          v-for="entry in skillRows"
          :key="entry.declaredName ?? entry.definitions[0]!.fileId"
          :entry="entry"
          :files-by-id="filesById"
          :diagnostics="diagnostics"
        />
      </template>
    </ul>
    <!-- Nothing was recognized as this kind at all — a different finding from
         "the filters excluded them", and one the user cannot undo by clearing
         a filter. Scoped to the kind in view: files this generation could not
         read are listed under their own heading below, so claiming the
         repository has nothing would contradict the same screen. -->
    <p v-else-if="totalCount === 0" class="aci-empty">
      No {{ kind === null ? 'customization file' : CUSTOMIZATION_KIND_TEXT[kind].toLowerCase() }}
      was recognized in this repository.
    </p>
    <p v-else class="aci-empty">
      No {{ kind === null ? 'row' : CUSTOMIZATION_KIND_TEXT[kind].toLowerCase() }} matches the
      current filters.
    </p>
  </div>
</template>
