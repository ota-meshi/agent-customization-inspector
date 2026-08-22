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
import { detailRoute } from '../../detail-route';
import { SUPPORTED_TOOL_TEXT, pathPresentationLabel } from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type { RuleInventoryEntryDto } from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one recognized rule file. */
  entry: RuleInventoryEntryDto;
}>();

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
const route = computed(() => detailRoute('rule', props.entry.sourceRelativePath));

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
    <!-- The file's path is the row's identity, rendered exactly as published
         and never as a locator anything can open (FR-024). -->
    <p class="aci-path aci-authored-text">{{ pathText }}</p>

    <!-- Every product that recognized the file, in the closed tool order, each
         linking to the file's own detail route, with the surfaces of the
         documented behaviors its admitting rules rest on beside it. Naming a
         surface is never a claim that the surface loaded the file (FR-009). -->
    <ul class="aci-rule-row__tools" role="list">
      <li v-for="recognition in recognitions" :key="recognition.tool">
        <NuxtLink :to="route">{{ recognition.toolText }}</NuxtLink>
        <span class="aci-rule-row__surfaces aci-muted">{{ recognition.surfacesText }}</span>
      </li>
    </ul>
  </li>
</template>

<style scoped>
/* The recognitions of the file, set under the path by an indent and a
   rule, matching how a skill row groups its definitions. */
.aci-rule-row__tools {
  list-style: none;
  margin: 0.2rem 0 0;
  border-inline-start: 1px solid var(--aci-border);
  padding-inline-start: 0.6rem;
}

/* The surfaces trail the product on the same line, set apart by a separator
   rather than by punctuation inside the text: the product is what was
   recognized, and the surfaces qualify it. */
.aci-rule-row__surfaces {
  margin-inline-start: 0.4rem;
}

.aci-rule-row__surfaces::before {
  content: '·';
  margin-inline-end: 0.4rem;
}
</style>
