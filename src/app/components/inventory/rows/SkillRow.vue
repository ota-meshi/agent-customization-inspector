<script setup lang="ts">
// A skill row (T071/T1077). The row's unit is one declared name, not one file
// (data-model.md § Inventory unit): the name is what the products' own skill
// listings show, it need not match the directory holding the `SKILL.md`, and
// two files may declare it. Each `SKILL.md` declaring the name is listed as a
// definition beneath it.
//
// A row shows what was found and how it was classified — never what it says.
// The snapshot carries no `sourceText`, and complete authored content is served
// only by the detail route, one file at a time (FR-027), so there is nothing
// here to put a repository secret into a list. The one authored value present is
// the declared name, which is presentation identity rather than content
// (FR-007).
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
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import {
  SAME_NAME_SKILL_RESOLUTION_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  rendersNothingVisible,
} from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SkillDefinitionDto,
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
  /**
   * Every published file by its Source-relative Path, so a definition's census
   * entries — which are paths — can be resolved to the files they name.
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per definition by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The Source-relative Path of one definition's file as presentation text:
 * the published value with its control characters escaped (data-model.md
 * § SourceRelativePath), so a path spanning lines cannot read as two rows.
 * The empty fallback is unreachable rather than a case: a definition only
 * reaches a row after its file matched the filters, which requires the file
 * to be in this map. It exists because `Map.get` is typed for absence.
 */
function pathOf(fileId: string): string {
  return escapeControlCharacters(props.filesById.get(fileId)?.sourceRelativePath ?? '');
}

/**
 * The diagnostics of one definition's file, resolved from the file's own
 * published list: a definition repeats no diagnostic the file already
 * publishes (data-model.md § Inventory unit), so the row reads them where
 * they live. The empty fallback exists for the same `Map.get` typing reason
 * as {@link pathOf}.
 */
function diagnosticIdsOf(fileId: string): readonly string[] {
  return props.filesById.get(fileId)?.diagnosticIds ?? [];
}

/**
 * The census files of one definition that carry a diagnostic, each with the
 * presentation form of its path.
 *
 * A companion gets no inventory row of its own (FR-003), so a failed read
 * inside a skill's directory would otherwise be visible nowhere on this page —
 * the generation would say `partial` with nothing naming the cause (FR-028).
 * It is stated here, inside the row of the skill whose directory holds it,
 * named by its path so the reader knows which file to open.
 */
function affectedCompanions(
  definition: SkillDefinitionDto,
): readonly { path: string; diagnosticIds: readonly string[] }[] {
  return definition.companionFiles.flatMap((sourceRelativePath) => {
    const file = props.filesByPath.get(sourceRelativePath);
    return file === undefined || file.diagnosticIds.length === 0
      ? []
      : [{ path: escapeControlCharacters(sourceRelativePath), diagnosticIds: file.diagnosticIds }];
  });
}
</script>

<template>
  <li class="aci-item">
    <!-- The declared name is authored text: inert, never a locator, and never
         a path. A file that declares none is its own row rather than being
         folded into a name it does not have. -->
    <p v-if="entry.declaredName !== null" class="aci-skill-row__declared-name">
      <!-- An authored empty name is a different fact from no name, and an empty
           element would render as neither. A name that draws nothing renders as
           nothing too — whitespace, or code points such as U+200B that are not
           whitespace and survive a trim — so it gets its own label rather than a
           blank line: the name is kept exactly, and saying it is blank is not
           the same as showing nothing. -->
      <template v-if="entry.declaredName === ''">
        <span class="aci-muted">(empty name)</span>
      </template>
      <!-- Rendered as authored with the note beside it: two skills whose names
           differ only in whitespace are two rows, and one phrase for both would
           show them as the same row twice (FR-025). -->
      <template v-else-if="rendersNothingVisible(entry.declaredName)"
        ><span class="aci-authored-text aci-authored-atomic">{{ entry.declaredName }}</span>
        <span class="aci-muted">(name with no visible characters)</span></template
      >
      <template v-else
        ><span class="aci-authored-text">{{ entry.declaredName }}</span></template
      >
    </p>

    <ul class="aci-skill-row__definitions" role="list">
      <li v-for="definition in entry.definitions" :key="definition.fileId">
        <!-- The Source-relative Path is the locator into the skill detail
             route, which is the one surface that shows file contents. The link
             carries the opaque file ID rather than the path: a commit rekeys
             every ID, so a link from an earlier generation resolves to nothing
             instead of to whatever now sits at that path. -->
        <p class="aci-path">
          <NuxtLink class="aci-authored-text" :to="`/skills/${definition.fileId}`">{{
            pathOf(definition.fileId)
          }}</NuxtLink>
        </p>
        <ul class="aci-skill-row__badges" role="list">
          <!-- The kind is the tab the row is listed under, so repeating it on
               every definition says nothing. The tools stay: one file can be
               recognized by several products — `.agents/skills/` is both a
               Codex and a Copilot location — and which ones is not visible
               anywhere else. -->
          <li v-for="tool in definition.tools" :key="tool">{{ SUPPORTED_TOOL_TEXT[tool] }}</li>
        </ul>
        <!-- What ships beside the `SKILL.md`. It says the skill has supporting
             files, not that a product loads them; the detail view is where the
             directory itself can be opened. -->
        <p class="aci-note">
          {{ definition.companionFiles.length }} supporting file(s) in this skill
        </p>
        <RowDiagnostics
          :diagnostic-ids="diagnosticIdsOf(definition.fileId)"
          :diagnostics="diagnostics"
        />
        <!-- A supporting file this scan could not use. Named rather than
             counted: the reader has to know which file to open in the skill's
             tree, and the path is the only thing that says so. -->
        <ul
          v-if="affectedCompanions(definition).length > 0"
          class="aci-skill-row__companion-diagnostics"
          role="list"
        >
          <li v-for="companion in affectedCompanions(definition)" :key="companion.path">
            <span class="aci-path aci-authored-text">{{ companion.path }}</span>
            <RowDiagnostics :diagnostic-ids="companion.diagnosticIds" :diagnostics="diagnostics" />
          </li>
        </ul>
      </li>
    </ul>

    <!-- Present only when several definitions share the name; one definition
         resolves nothing. -->
    <ul v-if="entry.sameNameResolutions.length > 0" class="aci-skill-row__resolutions" role="list">
      <li v-for="statement in entry.sameNameResolutions" :key="statement.tool">
        {{ SUPPORTED_TOOL_TEXT[statement.tool] }}
        {{ SAME_NAME_SKILL_RESOLUTION_TEXT[statement.resolution] }}
      </li>
    </ul>
  </li>
</template>

<style scoped>
.aci-skill-row__definitions,
.aci-skill-row__resolutions {
  list-style: none;
  margin: 0;
  padding: 0;
}

.aci-skill-row__definitions > li + li {
  margin-block-start: 0.5rem;
}

/* The statements describe the row as a whole, so they sit apart from the
   definitions they are about rather than inside any one of them. */
.aci-skill-row__resolutions {
  margin-block-start: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.8;
}
/* The declared name sits above the path as a secondary label: the path stays
   the row's identity, because two skills may declare the same name. Authored
   names have no break opportunities of their own, so a long one wraps rather
   than scrolling the page sideways (WCAG 1.4.10). */
.aci-skill-row__declared-name {
  font-weight: 600;
  margin: 0;
  overflow-wrap: anywhere;
}
.aci-skill-row__badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  list-style: none;
  margin: 0.25rem 0;
  padding: 0;
}
</style>
