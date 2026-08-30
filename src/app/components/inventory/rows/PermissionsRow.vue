<script setup lang="ts">
// One row of the permissions inventory (T410): one declared permission policy,
// named by the path of the file that declares it. The unit is the policy
// rather than the file (data-model.md § Inventory unit) — which is why this is
// not the rules row under another name — and two products recognizing one
// policy are two recognitions on one row.
//
// A row shows that a policy was declared and what recognized it, never what it
// permits. The snapshot carries no declared value, and a policy is served only
// by its own detail, one at a time (FR-027): selecting the path here is how
// that policy's complete inert detail opens. The path is the link because a
// detail is addressed by the path alone, so a link per product would be the
// same URL repeated once per recognition.
//
// Nothing here is a claim that a policy is in force. A permission decision is
// combined with every other active layer's — the User layer and the managed
// locations this product never reads among them — under trust and approval
// state that turns on runtime this tool does not observe, so the row states no
// decision, no precedence, and no enforcement (FR-009;
// contracts/inspection-path-allowlist.md § existence-versus-activation
// vocabulary).
//
// Nothing here renders an exclusion either: a nested `.codex/rules/team/` file
// is a path no shipped selector reaches, so it is simply absent from the
// inventory rather than a row saying it was left out.
//
// A policy a carrier declares is read out of a document its parser can
// reject, so this row does state diagnostics: the extraction's own record,
// which is what tells a reader why a row they can see publishes nothing. A
// file whose bytes were never accepted gains no recognition and so has no row
// here at all — it is listed under the inventory's files in no kind instead,
// which is where a `partial` generation says which file made it partial
// (FR-028).
import { computed } from 'vue';
import { NuxtLink } from '#components';
import RowDiagnostics from './RowDiagnostics.vue';
import SourceRootLine from '../SourceRootLine.vue';
import { detailRoute } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import {
  SUPPORTED_TOOL_TEXT,
  accessiblePresentationLabel,
  pathPresentationLabel,
} from '../../../../shared/entities';
import { VENDOR_SURFACE_TEXT } from '../../../../shared/registries/behavior-text';
import type {
  PermissionsInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one declared permission policy. */
  entry: PermissionsInventoryEntryDto;
  /** The generation's diagnostics, resolved per row by {@link RowDiagnostics}. */
  diagnostics: readonly SerializedDiagnostic[];
}>();

/** The shared per-Source lookups (`session-sources.ts`). */
const sessionSources = useSessionSources();

/**
 * The declaring file's path through the shared label rule rather than plain
 * escaping ({@link pathPresentationLabel}): a name built only from whitespace
 * or default-ignorable code points draws nothing, and this line is all the row
 * is identified by.
 */
const pathText = computed(() => pathPresentationLabel(props.entry.sourceRelativePath));

/**
 * The policy's own detail route — one route however many products recognize
 * it, because no per-tool fact distinguishes what the page would show (T417).
 */
const route = computed(() =>
  detailRoute(
    'permissions',
    props.entry.sourceRelativePath,
    sessionSources.selectorOf(props.entry.sourceId),
  ),
);

/**
 * What a screen reader announces the path link as; see {@link SettingsRow} for
 * the rule every path-addressed row follows (WCAG 2.4.4, FR-025).
 */
const pathAccessibleText = computed(() =>
  // The Source qualifier keeps two same-path links of two consented homes
  // apart in a links list ({@link SessionSources.qualifiedLinkName}).
  sessionSources.qualifiedLinkName(
    accessiblePresentationLabel(props.entry.sourceRelativePath),
    props.entry.sourceId,
  ),
);

/**
 * Each product that recognized the policy, with the surfaces its admissions
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
    <!-- The declaring file's path is the row's identity and the link to the
         policy's own detail, rendered exactly as published and never as a
         locator anything outside this product can open (FR-024). A link per
         product would be the same URL repeated, because this detail is
         addressed by the path alone. -->
    <p class="aci-permissions-row__owner">
      <NuxtLink :to="route" class="aci-path aci-authored-text" :aria-label="pathAccessibleText">{{
        pathText
      }}</NuxtLink>
      <span
        v-for="recognition in recognitions"
        :key="recognition.tool"
        class="aci-permissions-row__tool aci-muted"
        >{{ recognition.toolText }}
        <span class="aci-permissions-row__surfaces">{{ recognition.surfacesText }}</span></span
      >
    </p>

    <SourceRootLine :source-id="entry.sourceId" />

    <!-- Why a row a reader can see publishes nothing: the extraction's own
         record, resolved from the generation's diagnostics (FR-028). -->
    <RowDiagnostics :diagnostic-ids="props.entry.diagnosticIds" :diagnostics="props.diagnostics" />
  </li>
</template>

<style scoped>
/* The path and the products that recognize it on one line, the way an MCP or
   agent row lays out a carrier and its recognitions: the path is the subject
   and the products qualify it. */
.aci-permissions-row__owner {
  margin: 0;
}

.aci-permissions-row__tool {
  margin-inline-start: 0.4rem;
}

.aci-permissions-row__tool::before {
  content: '·';
  margin-inline-end: 0.4rem;
}

.aci-permissions-row__surfaces {
  font-size: 0.85em;
}

.aci-permissions-row__surfaces::before {
  content: '(';
}

.aci-permissions-row__surfaces::after {
  content: ')';
}
</style>
