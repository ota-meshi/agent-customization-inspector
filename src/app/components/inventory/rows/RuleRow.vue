<script setup lang="ts">
// One row of the rules inventory (T410): one recognized rule file, listing the
// products that recognized it. The unit is the file — a rule file declares no
// name a row could be keyed by and governs no range it could be grouped under,
// so its Source-relative Path is the whole identity, and two products
// recognizing one file are two recognitions on one row (data-model.md
// § Inventory unit).
//
// A row shows what was found and how it was classified, never what it says.
// The snapshot carries no `sourceText`, and complete authored content is
// served only by the detail route, one file at a time (FR-027): selecting a
// product here is how that file's complete inert detail opens.
//
// Nothing here is a claim that a file is in context. Which files a session
// works with turns on runtime this tool does not observe, so the row states no
// decision, no precedence, and no application (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary).
//
// Nothing here renders an exclusion either: a `.claude` location this release
// leaves out is a path no shipped selector reaches, so it is simply absent
// from the inventory rather than a row saying it was left out.
//
// And no diagnostics, because none can reach a row of this kind: nothing is
// read out of a rule file, so nothing can fail to be read, and a file whose
// bytes were never accepted gains no recognition and so has no row here at
// all. Such a file is listed under the inventory's files in no kind instead,
// which is where a `partial` generation says which file made it partial
// (FR-028).
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
import type { RuleInventoryEntryDto } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one recognized rule file. */
  entry: RuleInventoryEntryDto;
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The file's path through the shared label rule rather than plain escaping
 * ({@link pathPresentationLabel}): a name built only from whitespace or
 * default-ignorable code points draws nothing, and this line is all the row is
 * identified by.
 */
const pathText = computed(() => pathPresentationLabel(props.entry.sourceRelativePath));

/**
 * The file's own detail route — one route however many products recognize it,
 * because no per-tool fact distinguishes what the page would show (T417).
 */
const route = computed(() =>
  detailRoute(
    'rule',
    props.entry.sourceRelativePath,
    sessionSources.selectorOf(props.entry.sourceId),
  ),
);

/**
 * What a screen reader announces the path link as: a reader walking the page's
 * links hears each one out of its visual context, and the whitespace-safe
 * label keeps two paths differing only in spacing from announcing identically
 * (WCAG 2.4.4, FR-025).
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
    <!-- The file's path is the row's identity and the link to its own detail,
         rendered exactly as published and never as a locator anything outside
         this product can open (FR-024). The products that recognized it stand
         beside it, each with the surfaces of the documented behaviors its
         admitting rules rest on; naming a surface is never a claim that the
         surface loaded the file (FR-009). -->
    <p class="aci-rule-row__owner">
      <NuxtLink :to="route" class="aci-path aci-authored-text" :aria-label="pathAccessibleText">{{
        pathText
      }}</NuxtLink>
      <span
        v-for="recognition in recognitions"
        :key="recognition.tool"
        class="aci-rule-row__tool aci-muted"
        >{{ recognition.toolText }}
        <span class="aci-rule-row__surfaces">{{ recognition.surfacesText }}</span></span
      >
    </p>

    <SourceRootLine :source-id="entry.sourceId" />
  </li>
</template>

<style scoped>
/* The path and the products that recognize it on one line, the way an MCP or
   agent row lays out a carrier and its recognitions: the path is the subject
   and the products qualify it. */
.aci-rule-row__owner {
  margin: 0;
}

.aci-rule-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-rule-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-rule-row__surfaces {
  font-size: 0.85em;
}

.aci-rule-row__surfaces::before {
  content: '(';
}

.aci-rule-row__surfaces::after {
  content: ')';
}
</style>
