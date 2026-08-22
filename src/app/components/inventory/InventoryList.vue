<script setup lang="ts">
// The committed inventory list (T071/T1077). Rows arrive already ordered by the
// host (contracts/http-api.md § get-session) — so this component preserves that
// order rather than re-sorting: an opaque ID must never decide what a user
// sees first, and re-sorting client-side would make the list disagree with
// the snapshot it came from.
//
// A row's unit is decided by its kind (data-model.md § Inventory unit), so this
// component dispatches to the kind's own list and never imposes a shared row
// type: a skill row is one resolved name with its definitions, and an MCP row
// is one declared server name with the declarations resolving it. What stays here is the pair
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
import InstructionRow from './rows/InstructionRow.vue';
import McpRow from './rows/McpRow.vue';
import PermissionsRow from './rows/PermissionsRow.vue';
import RuleRow from './rows/RuleRow.vue';
import SkillRow from './rows/SkillRow.vue';
import { inventoryPanelId, inventoryTabId } from './panel-ids';
import { CUSTOMIZATION_KIND_PLURAL_TEXT } from '../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  InstructionInventoryEntryDto,
  McpInventoryEntryDto,
  PermissionsInventoryEntryDto,
  RuleInventoryEntryDto,
  SerializedDiagnostic,
  SkillInventoryEntryDto,
} from '../../../shared/api-types';
import type { CustomizationKind } from '../../../shared/entities';

const props = defineProps<{
  /** The kind in view; its inventory below is what this list renders. */
  kind: CustomizationKind | null;
  /** The instruction rows that passed the active filters, in snapshot order. */
  instructionRows: readonly InstructionInventoryEntryDto[];
  /** The rule rows that passed the active filters, in snapshot order. */
  ruleRows: readonly RuleInventoryEntryDto[];
  /** The permission-policy rows that passed the active filters, in snapshot order. */
  permissionsRows: readonly PermissionsInventoryEntryDto[];
  /** The skill rows that passed the active filters, in snapshot order. */
  skillRows: readonly SkillInventoryEntryDto[];
  /** The MCP name rows that passed the active filters, in snapshot order. */
  mcpRows: readonly McpInventoryEntryDto[];
  /** Every published file by path, so a row can resolve the files it names. */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /**
   * Every path with an MCP recognition, from the unfiltered committed
   * inventory ({@link InventoryFilterView.mcpCarrierPaths}): an instruction
   * row routes such a file to the carrier's own MCP view, because a
   * carrier's `FileDetail` is withheld by contract (FR-007).
   */
  mcpCarrierPaths: ReadonlySet<string>;
  /** How many rows the committed generation published before filtering. */
  totalCount: number;
  /** The generation's diagnostics, resolved per row. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * How many list items the kind in view has. It decides between the list and
 * the two empty states, and each kind answers from its own inventory.
 */
const rowCount = computed(() =>
  props.kind === 'instructions'
    ? props.instructionRows.length
    : props.kind === 'rule'
      ? props.ruleRows.length
      : props.kind === 'permissions'
        ? props.permissionsRows.length
        : props.kind === 'skill'
          ? props.skillRows.length
          : props.kind === 'MCP'
            ? props.mcpRows.length
            : 0,
);
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
      <template v-if="kind === 'instructions'">
        <!-- Keyed by the range with the no-range row spelled as an empty key:
             at most one row has a null range, and no glob key is empty — a
             range always ends in its pattern — so the spelling collides with
             nothing. -->
        <InstructionRow
          v-for="entry in instructionRows"
          :key="entry.applicabilityRange ?? ''"
          :entry="entry"
          :files-by-path="filesByPath"
          :mcp-carrier-paths="mcpCarrierPaths"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'rule'">
        <!-- Keyed by the row's own path: the unit is the file, and a path is
             unique within a Source (FR-030). -->
        <RuleRow v-for="entry in ruleRows" :key="entry.sourceRelativePath" :entry="entry" />
      </template>
      <template v-if="kind === 'permissions'">
        <!-- Its own row component rather than the rules one: a permissions row
             is a declared policy, keyed by the path of the file that declares
             it (data-model.md § Inventory unit). -->
        <PermissionsRow
          v-for="entry in permissionsRows"
          :key="entry.sourceRelativePath"
          :entry="entry"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'skill'">
        <SkillRow
          v-for="entry in skillRows"
          :key="entry.name"
          :entry="entry"
          :files-by-path="filesByPath"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'MCP'">
        <!-- Keyed by the row's own name — the row unit is the declared server
             name, unique in the list by construction — behind a `name:`
             prefix, so the no-name carriers row's own key can never collide
             with a declared name: strict JSON accepts `""` as a server name,
             so the empty spelling is a real row of its own
             (data-model.md § Inventory unit). -->
        <McpRow
          v-for="entry in mcpRows"
          :key="entry.name === null ? 'carriers' : `name:${entry.name}`"
          :entry="entry"
          :files-by-path="filesByPath"
          :diagnostics="diagnostics"
        />
      </template>
    </ul>
    <!-- Nothing was recognized as this kind at all — a different finding from
         "the filters excluded them", and one the user cannot undo by clearing
         a filter. Scoped to the kind in view: files this generation could not
         read are listed under their own heading below, so claiming the
         repository has nothing would contradict the same screen. -->
    <!-- Both sentences count the kind's rows, so they name the row unit in
         plural rather than the kind: `CUSTOMIZATION_KIND_TEXT` labels a tab,
         and no rule turns `Instructions` or `MCP` into a countable noun. -->
    <p v-else-if="totalCount === 0" class="aci-empty">
      No {{ kind === null ? 'customization files' : CUSTOMIZATION_KIND_PLURAL_TEXT[kind] }} were
      recognized in this repository.
    </p>
    <p v-else class="aci-empty">
      No {{ kind === null ? 'customization files' : CUSTOMIZATION_KIND_PLURAL_TEXT[kind] }} match
      the current filters.
    </p>
  </div>
</template>
