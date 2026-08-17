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
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import { skillRowFiles, type SkillRowFile } from './skill-row-files';
import { skillDetailRoute } from '../../skill-detail-route';
import { skillComparisonRouteFor } from '../../../composables/skill-comparison';
import {
  SAME_NAME_SKILL_RESOLUTION_TEXT,
  SUPPORTED_TOOL_TEXT,
  escapeControlCharacters,
  inlinePresentationLabel,
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
 * This row's definitions grouped by the file each recognizes, so a file's own
 * facts — its path and what ships beside it — are stated once and every
 * recognition of it keeps its own line.
 */
const rowFiles = computed(() => skillRowFiles(props.entry.definitions));

/**
 * The distinct readable entry-point paths of this row's definitions, in the
 * row's own order. A comparison is a pair within one skill name — the URL
 * itself names two of the name's copies (FR-011) — so this row is where the
 * entry's candidate files are already known: two
 * files may resolve to one name, and comparing them is what the comparison
 * surface exists for. A file without readable source text is not among
 * them — a deterministic diagnostic-only item stays visible for review but
 * cannot be a comparison input (US3 scenario 4, FR-025).
 */
const comparableEntryPaths = computed(() => {
  const paths: string[] = [];
  for (const definition of props.entry.definitions) {
    const path = definition.sourceRelativePath;
    const encoding = props.filesByPath.get(path)?.encoding;
    if ((encoding === 'utf-8' || encoding === 'utf-8-replaced') && !paths.includes(path)) {
      paths.push(path);
    }
  }
  return paths;
});

/**
 * The comparison this row links to — its first two readable entry files —
 * or null when the name has fewer than two, where a link would open a
 * comparison with nothing to pair. The compare route's own file switchers
 * take over from there: they hold every file of this name, entry points and
 * census companions alike, so the reader switches pairs on the comparison
 * itself instead of composing one here.
 */
const compareRoute = computed(() => {
  const [first, second] = comparableEntryPaths.value;
  return first !== undefined && second !== undefined
    ? skillComparisonRouteFor(first, second)
    : null;
});

/**
 * The census files of one file that carry a diagnostic, each with the
 * presentation form of its path.
 *
 * A companion gets no inventory row of its own (FR-003), so a failed read
 * inside a skill's directory would otherwise be visible nowhere on this page —
 * the generation would say `partial` with nothing naming the cause (FR-028).
 * It is stated here, inside the row of the skill whose directory holds it,
 * named by its path so the reader knows which file to open.
 */
function affectedCompanions(
  file: SkillRowFile,
): readonly { path: string; diagnosticIds: readonly string[] }[] {
  return file.companionFiles.flatMap((sourceRelativePath) => {
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

    <ul class="aci-skill-row__files" role="list">
      <!-- One item per file this name is declared by, and beneath it one item
           per definition — one recognition, the `(file, tool)` unit (FR-007).
           Grouping is what the reader sees, not what the row publishes: every
           definition is still listed and still links to its own route, because
           two products recognizing one file do not read it under one condition
           and the row may not present them as though they did (FR-009). -->
      <li v-for="file in rowFiles" :key="file.sourceRelativePath" class="aci-skill-row__file">
        <!-- The file's own facts, stated once for the definitions below it: the
             Source-relative Path (escaped for presentation, data-model.md
             § SourceRelativePath, so a path spanning lines cannot read as two
             files), and what ships beside the `SKILL.md`. The census says the
             skill has supporting files, not that a product loads them; the
             detail view is where the directory itself can be opened. It is
             stated even at zero, because how many a skill ships is a fact
             about it and "none" is part of that fact. -->
        <p class="aci-path aci-authored-text">{{ file.pathText }}</p>
        <p class="aci-note">{{ file.companionFiles.length }} supporting file(s)</p>

        <ul class="aci-skill-row__definitions" role="list">
          <!-- The recognizing product is the link, because the detail route is
               the definition's own identity — the tool, then the path — and a
               file two products recognize has two of them (FR-030). The kind
               is the tab the row is listed under, so repeating it here says
               nothing. -->
          <li v-for="definition in file.definitions" :key="definition.tool">
            <!-- The visible text is the tool alone — the path is the line
                 above — but the accessible name carries both: a reader walking
                 the page's links hears each link out of its visual context,
                 and every skill row offers a link reading "GitHub Copilot"
                 (WCAG 2.4.4). The visible text leads the label, so speaking
                 the words on the link still activates it (WCAG 2.5.3). -->
            <!-- The path half goes through the whitespace-safe label: the
                 accessible-name computation collapses whitespace, and two
                 paths differing only in it must not read as one link name
                 (FR-025). -->
            <NuxtLink
              :to="detailRouteOf(definition)"
              :aria-label="`${SUPPORTED_TOOL_TEXT[definition.tool]} — ${inlinePresentationLabel(
                file.sourceRelativePath,
              )}`"
              >{{ SUPPORTED_TOOL_TEXT[definition.tool] }}</NuxtLink
            >
            <!-- The definition's own extraction diagnostics — its recognition's
                 reference to the kind's one shared failure record, not the
                 file's aggregate, so a definition reports its own kind's
                 failure and never every problem its file carries (FR-028). -->
            <RowDiagnostics :diagnostic-ids="definition.diagnosticIds" :diagnostics="diagnostics" />
          </li>
        </ul>

        <!-- A supporting file this scan could not use. Named rather than
             counted: the reader has to know which file to open in the skill's
             tree, and the path is the only thing that says so. It belongs to
             the file whose directory holds it rather than to any one of that
             file's recognitions, which is why it sits here and not above. -->
        <ul
          v-if="affectedCompanions(file).length > 0"
          class="aci-skill-row__companion-diagnostics"
          role="list"
        >
          <li v-for="companion in affectedCompanions(file)" :key="companion.path">
            <span class="aci-path aci-authored-text">{{ companion.path }}</span>
            <RowDiagnostics :diagnostic-ids="companion.diagnosticIds" :diagnostics="diagnostics" />
          </li>
        </ul>
      </li>
    </ul>

    <!-- The comparison entry for this name (FR-011): the entry links compose
         pairs within one skill name, so the row whose files share it is where
         this entry opens — one link, no selection step. It leads with the
         name's first two readable files, and the comparison surface's own
         file switchers take over from there, entry points and census
         companions alike. Absent when the name has fewer than two readable
         files, where there is nothing to pair. -->
    <p v-if="compareRoute !== null" class="aci-skill-row__compare">
      <!-- The accessible name carries the row's name after the visible
           phrase: in a links list every comparable row would otherwise
           announce identically, the same reason the tool links above carry
           their path (WCAG 2.4.6; label-in-name keeps the visible phrase as
           the prefix). Through the whitespace-safe label, because the
           accessible-name computation normalizes whitespace: two names
           differing only invisibly must not read as one name (FR-025). -->
      <NuxtLink
        :to="compareRoute"
        :aria-label="`Compare this skill's files: ${inlinePresentationLabel(entry.name)}`"
        >Compare this skill's files</NuxtLink
      >
    </p>

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
.aci-skill-row__files,
.aci-skill-row__definitions,
.aci-skill-row__resolutions {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Two files declaring one name are two groups, so they are separated by more
   than the gap between the lines inside either of them. */
.aci-skill-row__files > li + li {
  margin-block-start: 0.6rem;
}

/* The recognitions of one file, set under the file's own lines by an indent and
   a rule. The rule is what says where the group ends: without it, a second
   file's path read as another line of the first file's list. */
.aci-skill-row__definitions {
  border-inline-start: 1px solid var(--aci-border);
  margin-block-start: 0.2rem;
  padding-inline-start: 0.6rem;
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
/* The row-level comparison link, set apart from the definitions it spans. */
.aci-skill-row__compare {
  margin: 0.25rem 0 0;
}
</style>
