<script setup lang="ts">
// One row of the settings-and-configuration inventory (T588): one recognized
// settings or configuration file, named by its path. The unit is the file
// (data-model.md § Inventory unit) — which is why this is not the rules or
// permissions row under another name; those name a document a product reads
// as guidance and a policy a file declares, and two units that coincide in
// shape are still two.
//
// A row shows that a file was recognized and what recognized it, never what
// it configures. The snapshot carries no declared value, and a file's content
// is served only by its own detail, one at a time (FR-027): selecting a
// product here is how that document opens.
//
// One physical file can hold this row and another kind's: Codex's
// `.codex/config.toml` has one MCP row per server it declares and this row for
// the document those declarations sit in. Which detail a link opens follows
// from the row it is on, so this one goes to the file's own page (FR-007).
//
// The path is the link, and the products ride beside it as text: this kind's
// detail is addressed by the path alone, so a link per product would be the
// same URL repeated once per recognition — the agent, skill, and MCP rows
// place their links the same way.
//
// Nothing here is a claim that a product applied the settings. A project layer
// applies only to a trusted project, the User and system layers this Source
// excludes resolve against the same keys, and which value wins is a runtime
// outcome this tool never observes (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary). No path the document names is read, resolved, or followed.
//
// The row states the file's diagnostics. Nothing is read out of the document
// for this row, so this reading cannot fail — but the same document is read by
// other kinds, and those readings can: a `.claude/settings.json` holding a
// comment fails the permission policy's and the hooks' strict readings, and a
// `.codex/config.toml` TOML cannot parse fails its MCP servers' and its hooks'.
// Those records are the file's, and a file-confined outcome is about the file
// rather than about what recognized it (`RowDiagnostics.vue`, FR-028), so the
// row states them as the settings detail does. A file whose bytes were never
// accepted gains no recognition and so has no row here at all — it is listed
// under the inventory's files in no kind instead, which is where a `partial`
// generation says which file made it partial.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RecognitionMarks from '../RecognitionMarks.vue';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { detailRoute } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { accessiblePresentationLabel, pathPresentationLabel } from '../../../../shared/entities';
import type {
  CustomizationFileSummaryDto,
  SerializedDiagnostic,
  SettingsInventoryEntryDto,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one recognized settings or configuration file. */
  entry: SettingsInventoryEntryDto;
  /**
   * Every published file by its Source and then its Source-relative Path —
   * both halves of the file's identity (FR-030). The entry repeats none of the
   * file's own facts, so this lookup resolves the diagnostics the file keeps.
   */
  filesBySource: ReadonlyMap<string, ReadonlyMap<string, CustomizationFileSummaryDto>>;
  /** The generation's diagnostics, resolved for the file by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The file's path through the shared label rule rather than plain escaping
 * ({@link pathPresentationLabel}): a name built only from whitespace or
 * default-ignorable code points draws nothing, and this line is all the row
 * is identified by.
 */
const pathText = computed(() => pathPresentationLabel(props.entry.sourceRelativePath));

/**
 * The file's own detail route — one route however many products recognize it,
 * because no per-tool fact distinguishes what the page would show.
 */
const route = computed(() =>
  detailRoute(
    'settings/config',
    props.entry.sourceRelativePath,
    sessionSources.selectorOf(props.entry.sourceId),
  ),
);

/**
 * The file's own diagnostic references, from its `files[]` entry: every
 * record a reading of the document left, whichever kind's reading it was
 * (FR-028).
 */
const diagnosticIds = computed(
  () =>
    props.filesBySource.get(props.entry.sourceId)?.get(props.entry.sourceRelativePath)
      ?.diagnosticIds ?? [],
);

/**
 * What a screen reader announces the path link as. A reader walking the page's
 * links hears each one out of its visual context, and the whitespace-safe
 * label is what keeps two paths differing only in spacing from announcing
 * identically (WCAG 2.4.4, FR-025).
 */
const pathAccessibleText = computed(() =>
  // The Source qualifier keeps two same-path links of two consented homes
  // apart in a links list ({@link SessionSources.qualifiedLinkName}).
  sessionSources.qualifiedLinkName(
    accessiblePresentationLabel(props.entry.sourceRelativePath),
    props.entry.sourceId,
  ),
);
</script>

<template>
  <li class="aci-item">
    <!-- A kind that carries no name: the row is its file, so the file line
         starts where a name would have been. The path is the row's identity
         and the link to its detail, rendered exactly as published and never as
         a locator anything outside this product can open (FR-024). -->
    <div class="aci-row-file aci-row-file--only">
      <span class="aci-row-file__path">
        <SourceHomeBadge :source-id="entry.sourceId" />
        <NuxtLink :to="route" class="aci-path aci-authored-text" :aria-label="pathAccessibleText">{{
          pathText
        }}</NuxtLink>
        <RowDiagnostics :diagnostic-ids="diagnosticIds" :diagnostics="diagnostics" />
      </span>
      <RecognitionMarks :recognitions="entry.recognitions" />
      <span class="aci-row-file__end" />
    </div>
  </li>
</template>
