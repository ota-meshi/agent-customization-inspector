<script setup lang="ts">
// A skill row (T071/T1077). The row's unit is one name as one tool resolves
// it, not one file (data-model.md § Inventory unit): every tool resolves the
// authored `name`, a Claude Code recognition of a nested skill prefixes it
// root-relative (`apps/web:deploy`), and two files may resolve to one name.
// Each recognition resolving the name — one definition per `(file, tool)` —
// is listed beneath it.
//
// A row shows what was found and how it was classified — never what it says.
// The snapshot carries no `sourceText`, and complete authored content is served
// only by the detail route, one file at a time (FR-027), so there is nothing
// here to put a repository secret into a list. The one name value present is
// the row's resolved name — authored only when the file declared one, the
// skill directory otherwise — which is presentation identity rather than
// content (FR-007).
//
// When several definitions share a name, the row states how each product
// resolves it and never orders them: the three products' recorded statements
// differ and none is completely documented, so an order would be a winner the
// Inspector has not recorded.
//
// A row also never asserts that a product would load the file: a listed skill
// matched an Inspector rule at an allowlisted location, which is not installed,
// enabled, selected, or effective (contracts/inspection-path-allowlist.md
// § existence-versus-activation vocabulary).
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { skillDetailRoute } from '../../skill-detail-route';
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
  /** The committed skill entry to render: one resolved name. */
  entry: SkillInventoryEntryDto;
  /**
   * Every published file by its Source-relative Path — the file's identity
   * (FR-030). A definition names its file by path and repeats none of its
   * facts, and its census entries are paths too, so this one lookup resolves
   * both to the files they name.
   */
  filesByPath: ReadonlyMap<string, CustomizationFileSummaryDto>;
  /** The generation's diagnostics, resolved per definition by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/**
 * The detail route of one definition: the recognizing tool and the file's
 * own path — the definition's identity, which the path half of a bookmarked
 * link keeps across rescans and launches that select the same root, while
 * the origin is devframe's port selection (data-model.md § Skill
 * presentation). Built from the raw path, not the escaped display spelling.
 */
function detailRouteOf(definition: SkillDefinitionDto): string {
  return skillDetailRoute(definition.tool, definition.sourceRelativePath);
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
    <!-- The row's name is inert text, never a locator. A nested Claude row's
         prefix is path segments, so the name is rendered with the same
         control-character escaping as a path (data-model.md § Inventory
         unit): a lookup and selection identity must read as what it is. Every
         row has a name — a file that declares none, or declares it empty, is
         named by its skill directory (FR-007). -->
    <p class="aci-skill-row__name">
      <!-- A resolved name that draws nothing — whitespace, or code points such
           as U+200B that are not whitespace and survive a trim — gets its own
           label rather than a blank line: the name is kept exactly, and saying
           it is invisible is not the same as showing nothing. Rendered with
           the note beside it: two skills whose names differ only in whitespace
           are two rows, and one phrase for both would show them as the same
           row twice (FR-025). -->
      <template v-if="rendersNothingVisible(entry.name)"
        ><span class="aci-authored-text aci-authored-atomic">{{
          escapeControlCharacters(entry.name)
        }}</span>
        <span class="aci-muted">(name with no visible characters)</span></template
      >
      <template v-else
        ><span class="aci-authored-text">{{ escapeControlCharacters(entry.name) }}</span></template
      >
    </p>

    <ul class="aci-skill-row__definitions" role="list">
      <!-- One item per definition — one recognition, the `(file, tool)` unit —
           so a file two products resolve to this name is two items sharing a
           path, each under its own product and each linking to its own
           definition route, `/skills/<tool>/<source-relative path>` (FR-007). -->
      <li
        v-for="definition in entry.definitions"
        :key="`${definition.sourceRelativePath}:${definition.tool}`"
      >
        <!-- The Source-relative Path is the locator into the skill detail
             route, which is the one surface that shows file contents. The link
             addresses the definition by its own identity — the tool, then the
             path — so it keeps resolving across rescans and same-root server
             launches (FR-030).
             Escaped for presentation (data-model.md § SourceRelativePath), so
             a path spanning lines cannot read as two rows. -->
        <p class="aci-path">
          <NuxtLink class="aci-authored-text" :to="detailRouteOf(definition)">{{
            escapeControlCharacters(definition.sourceRelativePath)
          }}</NuxtLink>
        </p>
        <ul class="aci-skill-row__badges" role="list">
          <!-- The kind is the tab the row is listed under, so repeating it on
               every definition says nothing. The tool stays: which product a
               definition belongs to is not visible anywhere else. -->
          <li>{{ SUPPORTED_TOOL_TEXT[definition.tool] }}</li>
        </ul>
        <!-- What ships beside the `SKILL.md`. It says the skill has supporting
             files, not that a product loads them; the detail view is where the
             directory itself can be opened. -->
        <p class="aci-note">
          {{ definition.companionFiles.length }} supporting file(s) in this skill
        </p>
        <!-- The definition's own extraction diagnostics — its recognition's
             reference to the kind's one shared failure record, not the file's
             aggregate, so a definition reports its own kind's failure and
             never every problem its file carries (FR-028). -->
        <RowDiagnostics :diagnostic-ids="definition.diagnosticIds" :diagnostics="diagnostics" />
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
/* The resolved name heads the row — it is the row's identity — and the paths
   beneath identify its definitions, because two files may resolve to one name
   (data-model.md § Inventory unit). Names have no break opportunities of
   their own, so a long one wraps rather than scrolling the page sideways
   (WCAG 1.4.10). */
.aci-skill-row__name {
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
