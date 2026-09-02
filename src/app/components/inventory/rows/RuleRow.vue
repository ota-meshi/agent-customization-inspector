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
import RecognitionMarks from '../RecognitionMarks.vue';
import SourceHomeBadge from '../SourceHomeBadge.vue';
import { detailRoute } from '../../detail-route';
import { useSessionSources } from '../../../composables/session-sources';
import { accessiblePresentationLabel, pathPresentationLabel } from '../../../../shared/entities';
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
         and the link to its own detail, rendered exactly as published and
         never as a locator anything outside this product can open (FR-024).
         The products that recognized it are drawn beside it, each with the
         surfaces of the documented behaviors its admitting rules rest on;
         naming a surface is never a claim that the surface loaded the file
         (FR-009). -->
    <div class="aci-row-file aci-row-file--only">
      <span class="aci-row-file__path">
        <SourceHomeBadge :source-id="entry.sourceId" />
        <NuxtLink :to="route" class="aci-path aci-authored-text" :aria-label="pathAccessibleText">{{
          pathText
        }}</NuxtLink>
      </span>
      <RecognitionMarks :recognitions="entry.recognitions" />
      <span class="aci-row-file__end" />
    </div>
  </li>
</template>
