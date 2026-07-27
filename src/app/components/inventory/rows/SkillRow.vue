<script setup lang="ts">
// A skill row (T071/T1077). The row's unit is one declared name, not one file
// (data-model.md § Inventory unit): the name is what the products' own
// selectors use, it need not match the directory holding the `SKILL.md`, and
// two files may declare it. Each `SKILL.md` declaring the name is listed as a
// definition beneath it.
//
// A row shows what was found and how it was classified — never what it says.
// The snapshot carries no `sourceText`, and complete authored content is served
// only through the acknowledgement-gated detail route (FR-027), so there is
// nothing here to leak a repository secret into a list the user has not opted
// into reading. The one authored value present is the declared name, which is
// presentation identity rather than content (FR-007).
//
// When several definitions share a name, the row states how each product
// resolves it and never orders them: the recorded statements differ per product
// and two of the three are incomplete, so an order would be a winner the
// Inspector has not recorded.
//
// A row also never asserts that a product would load the file: a listed skill
// matched an Inspector rule at an allowlisted location, which is not installed,
// enabled, selected, or effective (contracts/inspection-path-allowlist.md
// § existence-versus-activation vocabulary).
import RowDiagnostics from './RowDiagnostics.vue';
import { SAME_NAME_SKILL_RESOLUTION_TEXT, SUPPORTED_TOOL_TEXT } from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SkillInventoryEntryDto,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed skill entry to render: one declared name. */
  entry: SkillInventoryEntryDto;
  /**
   * Every published file by ID. A definition names its file by `fileId` and
   * repeats none of its facts, so the row resolves the path here.
   */
  filesById: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per definition by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The Source-relative Path of one definition's file, as the snapshot published
 * it. The empty fallback is unreachable rather than a case: a definition only
 * reaches a row after its file matched the filters, which requires the file to
 * be in this map. It exists because `Map.get` is typed for absence.
 */
function pathOf(fileId: string): string {
  return props.filesById.get(fileId)?.sourceRelativePath ?? '';
}
</script>

<template>
  <li class="aci-item">
    <!-- The declared name is authored text: inert, never a locator, and never
         a path. A file that declares none is its own row rather than being
         folded into a name it does not have. -->
    <p v-if="entry.declaredName !== null" class="aci-declared-name">
      <!-- An authored empty name is a different fact from no name, and an empty
           element would render as neither. A name of only whitespace renders as
           nothing too, so it gets its own label rather than a blank line: the
           name is kept exactly, and saying it is blank is not the same as
           showing nothing. -->
      <template v-if="entry.declaredName === ''">
        <span class="aci-muted">(empty name)</span>
      </template>
      <template v-else-if="entry.declaredName.trim() === ''">
        <span class="aci-muted">(whitespace-only name)</span>
      </template>
      <template v-else>{{ entry.declaredName }}</template>
    </p>

    <ul class="aci-definitions" role="list">
      <li v-for="definition in entry.definitions" :key="definition.fileId">
        <p class="aci-path">{{ pathOf(definition.fileId) }}</p>
        <ul class="aci-badges" role="list">
          <!-- The kind is the tab the row is listed under, so repeating it on
               every definition says nothing. The tools stay: one file can be
               recognized by several products — `.agents/skills/` is both a
               Codex and a Copilot location — and which ones is not visible
               anywhere else. -->
          <li v-for="tool in definition.tools" :key="tool">{{ SUPPORTED_TOOL_TEXT[tool] }}</li>
        </ul>
        <!-- What is beside the `SKILL.md`, listed and never read. It says the
             skill ships supporting files, not that a product loads them. -->
        <p class="aci-note">
          {{ definition.companionFiles.length }} supporting file(s) in this skill
        </p>
        <RowDiagnostics :diagnostic-ids="definition.diagnosticIds" :diagnostics="diagnostics" />
      </li>
    </ul>

    <!-- Present only when several definitions share the name; one definition
         resolves nothing. -->
    <ul v-if="entry.sameNameResolutions.length > 0" class="aci-resolutions" role="list">
      <li v-for="statement in entry.sameNameResolutions" :key="statement.tool">
        {{ SUPPORTED_TOOL_TEXT[statement.tool] }}
        {{ SAME_NAME_SKILL_RESOLUTION_TEXT[statement.resolution] }}
      </li>
    </ul>
  </li>
</template>

<style scoped>
.aci-definitions,
.aci-resolutions {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-definitions > li + li {
  margin-block-start: 0.5rem;
}

/* The statements describe the row as a whole, so they sit apart from the
   definitions they are about rather than inside any one of them. */
.aci-resolutions {
  margin-block-start: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}
</style>
