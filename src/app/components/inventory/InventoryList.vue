<script setup lang="ts">
// The committed inventory list (T071/T1077). Rows arrive already ordered by the
// host (contracts/http-api.md § get-session) — so this component preserves that
// order rather than re-sorting: an opaque ID must never decide what a user
// sees first, and re-sorting client-side would make the list disagree with
// the snapshot it came from.
//
// A row's unit is decided by its kind (data-model.md § Inventory unit), so this
// component dispatches to the kind's own list and never imposes a shared row
// type: a skill row is one resolved name with its definitions, an MCP row is
// one declared server name with the declarations resolving it, and a
// custom-agent row is one agent name the admitting rule resolves, with the
// files defining it. What stays here is the pair
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

import SourceFamilySections from './SourceFamilySections.vue';
import InstructionRow from './rows/InstructionRow.vue';
import SkillRow from './rows/SkillRow.vue';
import McpRow from './rows/McpRow.vue';
import HookRow from './rows/HookRow.vue';
import AgentRow from './rows/AgentRow.vue';
import PromptRow from './rows/PromptRow.vue';
import RuleRow from './rows/RuleRow.vue';
import PermissionsRow from './rows/PermissionsRow.vue';
import PluginRow from './rows/PluginRow.vue';
import OutputStyleRow from './rows/OutputStyleRow.vue';
import SettingsRow from './rows/SettingsRow.vue';
import { inventoryPanelId, inventoryTabId } from './panel-ids';
import { CUSTOMIZATION_KIND_PLURAL_TEXT, fileIdentityKey } from '../../../shared/entities';
import type {
  AgentInventoryEntryDto,
  PromptInventoryEntryDto,
  CustomizationFileSummaryDto,
  HookInventoryEntryDto,
  McpInventoryEntryDto,
  PermissionsInventoryEntryDto,
  OutputStyleInventoryEntryDto,
  PluginInventoryEntryDto,
  RuleInventoryEntryDto,
  SerializedDiagnostic,
  SettingsInventoryEntryDto,
  SkillInventoryEntryDto,
} from '../../../shared/api-types';
import type { CustomizationKind } from '../../../shared/entities';
import type { InstructionRangeGroup, NarrowedInventoryRow } from '../../composables/filters';

const props = defineProps<{
  /** The kind in view; its inventory below is what this list renders. */
  kind: CustomizationKind | null;
  /** The instruction rows that passed the active filters, in snapshot order. */
  instructionRangeGroups: readonly InstructionRangeGroup[];
  /** The skill rows that passed the active filters, in snapshot order. */
  skillRows: readonly NarrowedInventoryRow<SkillInventoryEntryDto>[];
  /** The MCP name rows that passed the active filters, in snapshot order. */
  mcpRows: readonly NarrowedInventoryRow<McpInventoryEntryDto>[];
  /** The custom-agent name rows that passed the active filters, in snapshot order. */
  agentRows: readonly NarrowedInventoryRow<AgentInventoryEntryDto>[];
  /** The command rows that passed the active filters, in snapshot order. */
  promptRows: readonly NarrowedInventoryRow<PromptInventoryEntryDto>[];
  /** The rule rows that passed the active filters, in snapshot order. */
  ruleRows: readonly RuleInventoryEntryDto[];
  /** The permission-policy rows that passed the active filters, in snapshot order. */
  permissionsRows: readonly PermissionsInventoryEntryDto[];
  /** The hook event rows that passed the active filters, in snapshot order. */
  hookRows: readonly NarrowedInventoryRow<HookInventoryEntryDto>[];
  /** The plugin name rows that passed the active filters, in snapshot order. */
  pluginRows: readonly NarrowedInventoryRow<PluginInventoryEntryDto>[];
  /** The output-style name rows that passed the active filters, in snapshot order. */
  outputStyleRows: readonly OutputStyleInventoryEntryDto[];
  /** The settings-and-configuration rows that passed the active filters, in snapshot order. */
  settingsRows: readonly SettingsInventoryEntryDto[];
  /**
   * Every published file by its Source and then its path, so a row resolves
   * the files it names under its own Source: a same-path file in the other
   * Source is a different file (FR-030).
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** How many rows the committed generation published before filtering. */
  totalCount: number;
  /**
   * True while any filter narrows the inventory, which is what tells an empty
   * list apart from an empty kind: one has a way out and the other does not.
   */
  narrowed: boolean;
  /** The generation's diagnostics, resolved per row. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

const emit = defineEmits<{
  /** The user asked to clear every filter from inside the empty result. */
  clear: [];
}>();

/**
 * How many list items the kind in view has. It decides between the list and
 * the two empty states, and each kind answers from its own inventory.
 */
const rowCount = computed(() =>
  props.kind === 'instructions'
    ? props.instructionRangeGroups.length
    : props.kind === 'skill'
      ? props.skillRows.length
      : props.kind === 'MCP'
        ? props.mcpRows.length
        : props.kind === 'agent'
          ? props.agentRows.length
          : props.kind === 'prompt/command'
            ? props.promptRows.length
            : props.kind === 'rule'
              ? props.ruleRows.length
              : props.kind === 'permissions'
                ? props.permissionsRows.length
                : props.kind === 'hook'
                  ? props.hookRows.length
                  : props.kind === 'plugin'
                    ? props.pluginRows.length
                    : props.kind === 'output style'
                      ? props.outputStyleRows.length
                      : props.kind === 'settings/config'
                        ? props.settingsRows.length
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
        <!-- Keyed by the range itself — the row unit is one applicability
             range, unique in the list by construction — with the no-range
             group spelled as an empty one: no glob key is empty, and there is
             at most one such group (data-model.md § Inventory unit). -->
        <InstructionRow
          v-for="group in instructionRangeGroups"
          :key="group.applicabilityRange ?? ''"
          :group="group"
          :files-by-source="filesBySource"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'skill'">
        <SkillRow
          v-for="entry in skillRows"
          :key="entry.name"
          :entry="entry"
          :files-by-source="filesBySource"
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
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'agent'">
        <!-- Keyed by the row's own name — the row unit is the declared agent
             name, unique in the list by construction — behind a `name:`
             prefix, so the no-name row's own key can never collide with a
             declared name: a TOML string can be empty, so the empty spelling
             is a real row of its own (data-model.md § Inventory unit). -->
        <AgentRow
          v-for="entry in agentRows"
          :key="entry.name === null ? 'unnamed' : `name:${entry.name}`"
          :entry="entry"
          :files-by-source="filesBySource"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'prompt/command'">
        <!-- Keyed by the row's own name — the row unit is the name a reader
             invokes, unique in the list by construction (data-model.md
             § Inventory unit). -->
        <PromptRow
          v-for="entry in promptRows"
          :key="entry.name"
          :entry="entry"
          :files-by-source="filesBySource"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'rule'">
        <!-- One section per Source family, because this kind's unit is one
             file of one Source (FR-030); rows are keyed by their own
             identity, the file (data-model.md § Inventory unit). -->
        <SourceFamilySections
          :members="ruleRows"
          :member-key="(entry) => fileIdentityKey(entry.sourceId, entry.sourceRelativePath)"
        >
          <template #member="{ member }">
            <RuleRow :entry="member" />
          </template>
        </SourceFamilySections>
      </template>
      <template v-if="kind === 'permissions'">
        <!-- One section per Source family, exactly as the rules list — and
             its own row component rather than the rules one: a permissions
             row is a declared policy, keyed by the identity of the file that
             declares it (data-model.md § Inventory unit). -->
        <SourceFamilySections
          :members="permissionsRows"
          :member-key="(entry) => fileIdentityKey(entry.sourceId, entry.sourceRelativePath)"
        >
          <template #member="{ member }">
            <PermissionsRow :entry="member" :diagnostics="diagnostics" />
          </template>
        </SourceFamilySections>
      </template>
      <template v-if="kind === 'hook'">
        <!-- Keyed by the row's own event — the row unit is the declared
             lifecycle event, unique in the list by construction — behind an
             `event:` prefix, so the no-event carriers row's own key can never
             collide with a declared one: both formats accept `""` as a key, so
             the empty spelling is a real row of its own (data-model.md
             § Inventory unit). -->
        <HookRow
          v-for="entry in hookRows"
          :key="entry.event === null ? 'carriers' : `event:${entry.event}`"
          :entry="entry"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'plugin'">
        <!-- Keyed by the row's own name — the row unit is one declared plugin
             name, unique in the list by construction, with the one null-named
             row behind a fixed key of its own (data-model.md § Inventory
             unit). -->
        <PluginRow
          v-for="entry in pluginRows"
          :key="entry.name === null ? 'unnamed' : `name:${entry.name}`"
          :entry="entry"
          :diagnostics="diagnostics"
          :files-by-source="filesBySource"
        />
      </template>
      <template v-if="kind === 'output style'">
        <!-- Keyed by the row's own name — the row unit is the style name a
             reader selects, unique in the list by construction (data-model.md
             § Inventory unit). -->
        <OutputStyleRow
          v-for="entry in outputStyleRows"
          :key="entry.name"
          :entry="entry"
          :diagnostics="diagnostics"
        />
      </template>
      <template v-if="kind === 'settings/config'">
        <!-- One section per Source family, exactly as the rules list — and
             its own row component again: this row is the file a product reads
             its settings from, keyed by that file's identity (data-model.md
             § Inventory unit). -->
        <SourceFamilySections
          :members="settingsRows"
          :member-key="(entry) => fileIdentityKey(entry.sourceId, entry.sourceRelativePath)"
        >
          <template #member="{ member }">
            <SettingsRow :entry="member" />
          </template>
        </SourceFamilySections>
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
    <!-- "in this scan" rather than "in this repository": the inventory spans
         every inspected Source once personal setup is enabled, and naming the
         repository would claim the consented homes were repository content
         (FR-002, FR-030). -->
    <!-- Both sentences are given a box of their own, because the answer to
         "where are the rows" is otherwise one line above several hundred
         pixels of nothing. The way out is inside it only where clearing a
         filter can bring rows back: what narrowed the list — the search term,
         the Source, the tool — is visible on the same screen, so the box adds
         no explanation of its own. -->
    <div v-else class="aci-empty-result">
      <p v-if="totalCount === 0" class="aci-empty-result__statement">
        No {{ kind === null ? 'customization files' : CUSTOMIZATION_KIND_PLURAL_TEXT[kind] }} were
        recognized in this scan.
      </p>
      <template v-else>
        <p class="aci-empty-result__statement">
          No {{ kind === null ? 'customization files' : CUSTOMIZATION_KIND_PLURAL_TEXT[kind] }}
          match the current filters.
        </p>
        <!-- The same command the filter row carries, where the reader is
             looking. The page clears and then settles focus in the one place
             both controls settle it, because this button goes away with the
             box it is in (WCAG 2.4.3). -->
        <p v-if="narrowed" class="aci-empty-result__exit">
          <button type="button" @click="emit('clear')">Clear filters</button>
        </p>
      </template>
    </div>
  </div>
</template>
