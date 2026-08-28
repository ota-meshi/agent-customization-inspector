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
// The row states no diagnostic, for the reason the rule row states none:
// nothing is read out of the document, so nothing can fail to be read
// (FR-028). A file whose bytes were never accepted gains no recognition and so
// has no row here at all — it is listed under the inventory's files in no kind
// instead, which is where a `partial` generation says which file made it
// partial.
import { computed } from 'vue';
import { NuxtLink } from '#components';
import SourceRootLine from '../SourceRootLine.vue';
import { detailRoute } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import {
  SUPPORTED_TOOL_TEXT,
  inlinePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type { SettingsInventoryEntryDto } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one recognized settings or configuration file. */
  entry: SettingsInventoryEntryDto;
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
 * What a screen reader announces the path link as. A reader walking the page's
 * links hears each one out of its visual context, and the whitespace-safe
 * label is what keeps two paths differing only in spacing from announcing
 * identically (WCAG 2.4.4, FR-025).
 */
const pathAccessibleText = computed(() => inlinePresentationLabel(props.entry.sourceRelativePath));

/**
 * Each product that recognized the file, with the surfaces its admissions
 * rest on beside it — the product alone does not say where a file is read
 * from once two surfaces document different lookup bases (FR-009).
 *
 * Derived rather than computed once at setup, because the row's key is its
 * path: a tool filter that drops recognitions leaves the key alone, so the
 * component instance is reused and a value read once would keep rendering the
 * recognitions the filter removed.
 */
const recognitions = computed(() =>
  props.entry.recognitions.map((recognition) => ({
    tool: recognition.tool,
    toolText: SUPPORTED_TOOL_TEXT[recognition.tool],
    surfacesText: recognition.surfaces.map((surface) => VENDOR_SURFACE_TEXT[surface]).join(', '),
  })),
);
</script>

<template>
  <li class="aci-item">
    <!-- The file's path is the row's identity and the link to its detail,
         rendered exactly as published and never as a locator anything outside
         this product can open (FR-024). -->
    <p class="aci-settings-row__owner">
      <NuxtLink :to="route" class="aci-path aci-authored-text" :aria-label="pathAccessibleText">{{
        pathText
      }}</NuxtLink>
      <span
        v-for="recognition in recognitions"
        :key="recognition.tool"
        class="aci-settings-row__tool aci-muted"
        >{{ recognition.toolText }}
        <span class="aci-settings-row__surfaces">{{ recognition.surfacesText }}</span></span
      >
    </p>

    <SourceRootLine :source-id="entry.sourceId" />
  </li>
</template>

<style scoped>
/* The path and the products that recognize it on one line, the way an MCP or
   agent row lays out a carrier and its recognitions: the path is the subject
   and the products qualify it. */
.aci-settings-row__owner {
  margin: 0;
}

.aci-settings-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-settings-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-settings-row__surfaces {
  font-size: 0.85em;
}

.aci-settings-row__surfaces::before {
  content: '(';
}

.aci-settings-row__surfaces::after {
  content: ')';
}
</style>
