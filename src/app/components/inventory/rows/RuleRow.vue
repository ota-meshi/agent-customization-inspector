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
// The row states the file's diagnostics. Nothing is read out of a rule file,
// so this reading cannot fail — but another kind's rules can admit the same
// file, and their readings can: a rules directory below `.claude/commands/`
// holds files that are commands too, and a command's frontmatter can fail to
// parse. Those records are the file's, and a file-confined outcome is about
// the file rather than about what recognized it (`RowDiagnostics.vue`,
// FR-028), so the row states them as the rule detail does. Whether a record
// can reach a rule file is not this kind's to settle: it turns on every other
// rule that admits the same path. A file whose bytes were never accepted gains
// no recognition and so has no row here at all — it is listed under the
// inventory's files in no kind instead, which is where a `partial` generation
// says which file made it partial.
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
  RuleInventoryEntryDto,
  SerializedDiagnostic,
} from '../../../../shared/api-types';

const props = defineProps<{
  /** The committed entry to render: one recognized rule file. */
  entry: RuleInventoryEntryDto;
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
 * The file's own diagnostic references, from its `files[]` entry: every
 * record a reading of the file left, whichever kind's reading it was
 * (FR-028).
 */
const diagnosticIds = computed(
  () =>
    props.filesBySource.get(props.entry.sourceId)?.get(props.entry.sourceRelativePath)
      ?.diagnosticIds ?? [],
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
        <RowDiagnostics :diagnostic-ids="diagnosticIds" :diagnostics="diagnostics" />
      </span>
      <RecognitionMarks :recognitions="entry.recognitions" />
      <span class="aci-row-file__end" />
    </div>
  </li>
</template>
